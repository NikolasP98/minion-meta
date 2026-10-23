import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  resolveAgentConfig,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "../agents/agent-scope.js";
import { resolveEffectiveMessagesConfig } from "../agents/identity/identity.js";
import { DEFAULT_HEARTBEAT_FILENAME } from "../agents/identity/workspace.js";
import { appendCronStyleCurrentTimeLine } from "../agents/runtime-utils/current-time.js";
import { resolveHeartbeatReplyPayload } from "../auto-reply/heartbeat-reply-payload.js";
import {
  DEFAULT_HEARTBEAT_ACK_MAX_CHARS,
  DEFAULT_HEARTBEAT_EVERY,
  isHeartbeatContentEffectivelyEmpty,
  resolveHeartbeatPrompt as resolveHeartbeatPromptText,
  stripHeartbeatToken,
} from "../auto-reply/heartbeat.js";
import { getReplyFromConfig } from "../auto-reply/reply.js";
import { HEARTBEAT_TOKEN } from "../auto-reply/tokens.js";
import type { ReplyPayload } from "../auto-reply/types.js";
import { getChannelPlugin } from "../channels/plugins/index.js";
import type { ChannelHeartbeatDeps } from "../channels/plugins/types.js";
import { parseDurationMs } from "../cli/parse-duration.js";
import type { MinionConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import {
  canonicalizeMainSessionAlias,
  loadSessionStore,
  resolveAgentIdFromSessionKey,
  resolveAgentMainSessionKey,
  resolveSessionFilePath,
  resolveStorePath,
  updateSessionStore,
  updateSessionStoreStrict,
} from "../config/sessions.js";
import type { AgentDefaultsConfig } from "../config/types.agent-defaults.js";
import { traceGatewayEvent } from "../logging/chat-trace.js";
import { writeHeartbeatLogEntry } from "../logging/heartbeat-log.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { getQueueSize } from "../platform/process/command-queue.js";
import { CommandLane } from "../platform/process/lanes.js";
import { normalizeAgentId, toAgentStoreSessionKey } from "../routing/session-key.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { escapeRegExp } from "../utils.js";
import { formatErrorMessage } from "./errors.js";
import { isWithinActiveHours } from "./heartbeat-active-hours.js";
import {
  buildCronEventPrompt,
  isCronSystemEvent,
  isExecCompletionEvent,
} from "./heartbeat-events-filter.js";
import { emitHeartbeatEvent, resolveIndicatorType } from "./heartbeat-events.js";
import { resolveHeartbeatReasonKind } from "./heartbeat-reason.js";
import { resolveHeartbeatVisibility } from "./heartbeat-visibility.js";
import {
  type HeartbeatRunResult,
  type HeartbeatWakeHandler,
  requestHeartbeatNow,
  setHeartbeatWakeHandler,
} from "./heartbeat-wake.js";
import type { OutboundSendDeps } from "./outbound/deliver.js";
import {
  deliverOutboundPayloadsWithOutcome,
  formatOutboundDeliveryOutcome,
  isOutboundDeliveryNoEffectError,
  isOutboundDeliveryComplete,
  isOutboundRetryWithheld,
  type OutboundDeliveryOutcome,
} from "./outbound/deliver.js";
import { acknowledgeCallerManagedDelivery } from "./outbound/delivery-queue.js";
import {
  resolveHeartbeatDeliveryTarget,
  resolveHeartbeatSenderContext,
} from "./outbound/targets.js";
import {
  appendSessionLogEntry,
  injectSessionContext,
  isSessionLogEnabled,
  readSessionLogEntries,
} from "./session-log.js";
import { peekSystemEventEntries } from "./system-events.js";

export type HeartbeatDeps = OutboundSendDeps &
  ChannelHeartbeatDeps & {
    runtime?: RuntimeEnv;
    getQueueSize?: (lane?: string) => number;
    nowMs?: () => number;
    deliverOutbound?: typeof deliverOutboundPayloadsWithOutcome;
    updateSessionStoreStrict?: typeof updateSessionStoreStrict;
    acknowledgeCallerManagedDelivery?: typeof acknowledgeCallerManagedDelivery;
  };

const log = createSubsystemLogger("gateway/heartbeat");
const MAX_UNRESOLVED_HEARTBEAT_DELIVERY_ATTEMPTS = 32;
let heartbeatsEnabled = true;

/** Tracks agents with an in-progress heartbeat run to prevent concurrent executions. */
const agentsInProgress = new Set<string>();

function heartbeatDeliveryFingerprint(params: {
  channel: string;
  to: string;
  accountId?: string;
  threadId?: string | number;
  payloads: ReplyPayload[];
}): string {
  const hash = createHash("sha256");
  const add = (label: string, value: string | number | undefined) => {
    const normalized = value === undefined ? "" : String(value);
    hash.update(`${label}:${Buffer.byteLength(normalized, "utf8")}:`);
    hash.update(normalized);
    hash.update("\n");
  };
  add("channel", params.channel);
  add("to", params.to);
  add("accountId", params.accountId);
  add("threadId", params.threadId);
  params.payloads.forEach((payload, index) => {
    add(`payload.${index}.text`, payload.text);
    add(`payload.${index}.mediaUrl`, payload.mediaUrl);
    for (const [mediaIndex, mediaUrl] of (payload.mediaUrls ?? []).entries()) {
      add(`payload.${index}.mediaUrls.${mediaIndex}`, mediaUrl);
    }
  });
  return hash.digest("hex");
}

export function setHeartbeatsEnabled(enabled: boolean) {
  heartbeatsEnabled = enabled;
}

export function areHeartbeatsEnabled(): boolean {
  return heartbeatsEnabled;
}

type HeartbeatConfig = AgentDefaultsConfig["heartbeat"];
type HeartbeatAgent = {
  agentId: string;
  heartbeat?: HeartbeatConfig;
};

export type HeartbeatSummary = {
  enabled: boolean;
  every: string;
  everyMs: number | null;
  prompt: string;
  target: string;
  model?: string;
  ackMaxChars: number;
};

const DEFAULT_HEARTBEAT_TARGET = "last";

// Prompt used when an async exec has completed and the result should be relayed to the user.
// This overrides the standard heartbeat prompt to ensure the model responds with the exec result
// instead of just "HEARTBEAT_OK".
const EXEC_EVENT_PROMPT =
  "An async command you ran earlier has completed. The result is shown in the system messages above. " +
  "Please relay the command output to the user in a helpful way. If the command succeeded, share the relevant output. " +
  "If it failed, explain what went wrong.";
export { isCronSystemEvent };

type HeartbeatAgentState = {
  agentId: string;
  heartbeat?: HeartbeatConfig;
  intervalMs: number;
  lastRunMs?: number;
  nextDueMs: number;
};

export type HeartbeatRunner = {
  stop: () => void;
  updateConfig: (cfg: MinionConfig) => void;
};

export function isHeartbeatEnabledForAgent(cfg: MinionConfig, agentId?: string): boolean {
  const resolvedAgentId = normalizeAgentId(agentId ?? resolveDefaultAgentId(cfg));
  const list = cfg.agents?.list ?? [];
  // If no agents are listed, heartbeat is enabled for the default agent only.
  if (list.length === 0) {
    return resolvedAgentId === normalizeAgentId(resolveDefaultAgentId(cfg));
  }
  // All listed agents are heartbeat candidates; opt-out via every: "0".
  return list.some((entry) => normalizeAgentId(entry?.id) === resolvedAgentId);
}

function resolveHeartbeatConfig(cfg: MinionConfig, agentId?: string): HeartbeatConfig | undefined {
  const defaults = cfg.agents?.defaults?.heartbeat;
  if (!agentId) {
    return defaults;
  }
  const overrides = resolveAgentConfig(cfg, agentId)?.heartbeat;
  if (!defaults && !overrides) {
    return overrides;
  }
  return { ...defaults, ...overrides };
}

export function resolveHeartbeatSummaryForAgent(
  cfg: MinionConfig,
  agentId?: string,
): HeartbeatSummary {
  const defaults = cfg.agents?.defaults?.heartbeat;
  const overrides = agentId ? resolveAgentConfig(cfg, agentId)?.heartbeat : undefined;
  const enabled = isHeartbeatEnabledForAgent(cfg, agentId);

  if (!enabled) {
    return {
      enabled: false,
      every: "disabled",
      everyMs: null,
      prompt: resolveHeartbeatPromptText(defaults?.prompt),
      target: defaults?.target ?? DEFAULT_HEARTBEAT_TARGET,
      model: defaults?.model,
      ackMaxChars: Math.max(0, defaults?.ackMaxChars ?? DEFAULT_HEARTBEAT_ACK_MAX_CHARS),
    };
  }

  const merged = defaults || overrides ? { ...defaults, ...overrides } : undefined;
  const every = merged?.every ?? defaults?.every ?? overrides?.every ?? DEFAULT_HEARTBEAT_EVERY;
  const everyMs = resolveHeartbeatIntervalMs(cfg, undefined, merged);
  const prompt = resolveHeartbeatPromptText(
    merged?.prompt ?? defaults?.prompt ?? overrides?.prompt,
  );
  const target =
    merged?.target ?? defaults?.target ?? overrides?.target ?? DEFAULT_HEARTBEAT_TARGET;
  const model = merged?.model ?? defaults?.model ?? overrides?.model;
  const ackMaxChars = Math.max(
    0,
    merged?.ackMaxChars ??
      defaults?.ackMaxChars ??
      overrides?.ackMaxChars ??
      DEFAULT_HEARTBEAT_ACK_MAX_CHARS,
  );

  return {
    enabled: true,
    every,
    everyMs,
    prompt,
    target,
    model,
    ackMaxChars,
  };
}

function resolveHeartbeatAgents(cfg: MinionConfig): HeartbeatAgent[] {
  const list = cfg.agents?.list ?? [];
  if (list.length === 0) {
    const fallbackId = resolveDefaultAgentId(cfg);
    return [{ agentId: fallbackId, heartbeat: resolveHeartbeatConfig(cfg, fallbackId) }];
  }
  return list
    .filter((entry) => entry?.id)
    .map((entry) => {
      const id = normalizeAgentId(entry.id);
      return { agentId: id, heartbeat: resolveHeartbeatConfig(cfg, id) };
    });
}

export function resolveHeartbeatIntervalMs(
  cfg: MinionConfig,
  overrideEvery?: string,
  heartbeat?: HeartbeatConfig,
) {
  const raw =
    overrideEvery ??
    heartbeat?.every ??
    cfg.agents?.defaults?.heartbeat?.every ??
    DEFAULT_HEARTBEAT_EVERY;
  if (!raw) {
    return null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  let ms: number;
  try {
    ms = parseDurationMs(trimmed, { defaultUnit: "m" });
  } catch {
    return null;
  }
  if (ms <= 0) {
    return null;
  }
  return ms;
}

export function resolveHeartbeatPrompt(cfg: MinionConfig, heartbeat?: HeartbeatConfig) {
  return resolveHeartbeatPromptText(heartbeat?.prompt ?? cfg.agents?.defaults?.heartbeat?.prompt);
}

function resolveHeartbeatLogLevel(cfg: MinionConfig, heartbeat?: HeartbeatConfig): string {
  return heartbeat?.logLevel ?? cfg.agents?.defaults?.heartbeat?.logLevel ?? "warn";
}

function resolveHeartbeatAckMaxChars(cfg: MinionConfig, heartbeat?: HeartbeatConfig) {
  return Math.max(
    0,
    heartbeat?.ackMaxChars ??
      cfg.agents?.defaults?.heartbeat?.ackMaxChars ??
      DEFAULT_HEARTBEAT_ACK_MAX_CHARS,
  );
}

function resolveHeartbeatSession(
  cfg: MinionConfig,
  agentId?: string,
  heartbeat?: HeartbeatConfig,
  forcedSessionKey?: string,
) {
  const sessionCfg = cfg.session;
  const scope = sessionCfg?.scope ?? "per-sender";
  const resolvedAgentId = normalizeAgentId(agentId ?? resolveDefaultAgentId(cfg));
  const mainSessionKey =
    scope === "global" ? "global" : resolveAgentMainSessionKey({ cfg, agentId: resolvedAgentId });
  const storeAgentId = scope === "global" ? resolveDefaultAgentId(cfg) : resolvedAgentId;
  const storePath = resolveStorePath(sessionCfg?.store, {
    agentId: storeAgentId,
  });
  const store = loadSessionStore(storePath);
  const mainEntry = store[mainSessionKey];

  if (scope === "global") {
    return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
  }

  const forced = forcedSessionKey?.trim();
  if (forced) {
    const forcedCandidate = toAgentStoreSessionKey({
      agentId: resolvedAgentId,
      requestKey: forced,
      mainKey: cfg.session?.mainKey,
    });
    const forcedCanonical = canonicalizeMainSessionAlias({
      cfg,
      agentId: resolvedAgentId,
      sessionKey: forcedCandidate,
    });
    if (forcedCanonical !== "global") {
      const sessionAgentId = resolveAgentIdFromSessionKey(forcedCanonical);
      if (sessionAgentId === normalizeAgentId(resolvedAgentId)) {
        return {
          sessionKey: forcedCanonical,
          storePath,
          store,
          entry: store[forcedCanonical],
        };
      }
    }
  }

  const trimmed = heartbeat?.session?.trim() ?? "";
  if (!trimmed) {
    return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
  }

  const normalized = trimmed.toLowerCase();
  if (normalized === "main" || normalized === "global") {
    return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
  }

  const candidate = toAgentStoreSessionKey({
    agentId: resolvedAgentId,
    requestKey: trimmed,
    mainKey: cfg.session?.mainKey,
  });
  const canonical = canonicalizeMainSessionAlias({
    cfg,
    agentId: resolvedAgentId,
    sessionKey: candidate,
  });
  if (canonical !== "global") {
    const sessionAgentId = resolveAgentIdFromSessionKey(canonical);
    if (sessionAgentId === normalizeAgentId(resolvedAgentId)) {
      return {
        sessionKey: canonical,
        storePath,
        store,
        entry: store[canonical],
      };
    }
  }

  return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
}

function resolveHeartbeatReasoningPayloads(
  replyResult: ReplyPayload | ReplyPayload[] | undefined,
): ReplyPayload[] {
  const payloads = Array.isArray(replyResult) ? replyResult : replyResult ? [replyResult] : [];
  return payloads.filter((payload) => {
    const text = typeof payload.text === "string" ? payload.text : "";
    return text.trimStart().startsWith("Reasoning:");
  });
}

async function restoreHeartbeatUpdatedAt(params: {
  storePath: string;
  sessionKey: string;
  updatedAt?: number;
}) {
  const { storePath, sessionKey, updatedAt } = params;
  if (typeof updatedAt !== "number") {
    return;
  }
  const store = loadSessionStore(storePath);
  const entry = store[sessionKey];
  if (!entry) {
    return;
  }
  const nextUpdatedAt = Math.max(entry.updatedAt ?? 0, updatedAt);
  if (entry.updatedAt === nextUpdatedAt) {
    return;
  }
  await updateSessionStore(storePath, (nextStore) => {
    const nextEntry = nextStore[sessionKey] ?? entry;
    if (!nextEntry) {
      return;
    }
    const resolvedUpdatedAt = Math.max(nextEntry.updatedAt ?? 0, updatedAt);
    if (nextEntry.updatedAt === resolvedUpdatedAt) {
      return;
    }
    nextStore[sessionKey] = { ...nextEntry, updatedAt: resolvedUpdatedAt };
  });
}

/**
 * Restore session delivery context after a cron-event heartbeat run.
 * The LLM call (getReplyFromConfig) may overwrite lastTo / deliveryContext
 * with the bot's own number, breaking subsequent deliveries to the user.
 */
async function restoreCronDeliveryContext(params: {
  storePath: string;
  sessionKey: string;
  lastTo?: string;
  deliveryContext?: {
    channel?: string;
    to?: string;
    accountId?: string;
    threadId?: string | number;
  };
}) {
  const { storePath, sessionKey, lastTo, deliveryContext } = params;
  if (!lastTo && !deliveryContext) {
    return;
  }
  await updateSessionStore(storePath, (store) => {
    const entry = store[sessionKey];
    if (!entry) {
      return;
    }
    store[sessionKey] = {
      ...entry,
      ...(lastTo !== undefined ? { lastTo } : {}),
      ...(deliveryContext !== undefined ? { deliveryContext } : {}),
    };
  });
}

/**
 * Prune heartbeat transcript entries by truncating the file back to a previous size.
 * This removes the user+assistant turns that were written during a HEARTBEAT_OK run,
 * preventing context pollution from zero-information exchanges.
 */
async function pruneHeartbeatTranscript(params: {
  transcriptPath?: string;
  preHeartbeatSize?: number;
}) {
  const { transcriptPath, preHeartbeatSize } = params;
  if (!transcriptPath || typeof preHeartbeatSize !== "number" || preHeartbeatSize < 0) {
    return;
  }
  try {
    const stat = await fs.stat(transcriptPath);
    // Only truncate if the file has grown during the heartbeat run
    if (stat.size > preHeartbeatSize) {
      await fs.truncate(transcriptPath, preHeartbeatSize);
    }
  } catch {
    // File may not exist or may have been removed - ignore errors
  }
}

/**
 * Get the transcript file path and its current size before a heartbeat run.
 * Returns undefined values if the session or transcript doesn't exist yet.
 */
async function captureTranscriptState(params: {
  storePath: string;
  sessionKey: string;
  agentId?: string;
}): Promise<{ transcriptPath?: string; preHeartbeatSize?: number }> {
  const { storePath, sessionKey, agentId } = params;
  try {
    const store = loadSessionStore(storePath);
    const entry = store[sessionKey];
    if (!entry?.sessionId) {
      return {};
    }
    const transcriptPath = resolveSessionFilePath(entry.sessionId, entry, {
      agentId,
      sessionsDir: path.dirname(storePath),
    });
    const stat = await fs.stat(transcriptPath);
    return { transcriptPath, preHeartbeatSize: stat.size };
  } catch {
    // Session or transcript doesn't exist yet - nothing to prune
    return {};
  }
}

function stripLeadingHeartbeatResponsePrefix(
  text: string,
  responsePrefix: string | undefined,
): string {
  const normalizedPrefix = responsePrefix?.trim();
  if (!normalizedPrefix) {
    return text;
  }

  // Require a boundary after the configured prefix so short prefixes like "Hi"
  // do not strip the beginning of normal words like "History".
  const prefixPattern = new RegExp(
    `^${escapeRegExp(normalizedPrefix)}(?=$|\\s|[\\p{P}\\p{S}])\\s*`,
    "iu",
  );
  return text.replace(prefixPattern, "");
}

function normalizeHeartbeatReply(
  payload: ReplyPayload,
  responsePrefix: string | undefined,
  ackMaxChars: number,
) {
  const rawText = typeof payload.text === "string" ? payload.text : "";
  const textForStrip = stripLeadingHeartbeatResponsePrefix(rawText, responsePrefix);
  const stripped = stripHeartbeatToken(textForStrip, {
    mode: "heartbeat",
    maxAckChars: ackMaxChars,
  });
  const hasMedia = Boolean(payload.mediaUrl || (payload.mediaUrls?.length ?? 0) > 0);
  if (stripped.shouldSkip && !hasMedia) {
    return {
      shouldSkip: true,
      text: "",
      hasMedia,
    };
  }
  let finalText = stripped.text;
  if (responsePrefix && finalText && !finalText.startsWith(responsePrefix)) {
    finalText = `${responsePrefix} ${finalText}`;
  }
  return { shouldSkip: false, text: finalText, hasMedia };
}

type HeartbeatReasonFlags = {
  isExecEventReason: boolean;
  isCronEventReason: boolean;
  isWakeReason: boolean;
};

type HeartbeatSkipReason = "empty-heartbeat-file" | "no-heartbeat-file";

type HeartbeatPreflight = HeartbeatReasonFlags & {
  session: ReturnType<typeof resolveHeartbeatSession>;
  pendingEventEntries: ReturnType<typeof peekSystemEventEntries>;
  hasTaggedCronEvents: boolean;
  shouldInspectPendingEvents: boolean;
  skipReason?: HeartbeatSkipReason;
};

function resolveHeartbeatReasonFlags(reason?: string): HeartbeatReasonFlags {
  const reasonKind = resolveHeartbeatReasonKind(reason);
  return {
    isExecEventReason: reasonKind === "exec-event",
    isCronEventReason: reasonKind === "cron",
    isWakeReason: reasonKind === "wake" || reasonKind === "hook",
  };
}

async function resolveHeartbeatPreflight(params: {
  cfg: MinionConfig;
  agentId: string;
  heartbeat?: HeartbeatConfig;
  forcedSessionKey?: string;
  reason?: string;
}): Promise<HeartbeatPreflight> {
  const reasonFlags = resolveHeartbeatReasonFlags(params.reason);
  const session = resolveHeartbeatSession(
    params.cfg,
    params.agentId,
    params.heartbeat,
    params.forcedSessionKey,
  );
  const pendingEventEntries = peekSystemEventEntries(session.sessionKey);
  const hasTaggedCronEvents = pendingEventEntries.some((event) =>
    event.contextKey?.startsWith("cron:"),
  );
  const shouldInspectPendingEvents =
    reasonFlags.isExecEventReason || reasonFlags.isCronEventReason || hasTaggedCronEvents;
  const shouldBypassFileGates =
    reasonFlags.isExecEventReason ||
    reasonFlags.isCronEventReason ||
    reasonFlags.isWakeReason ||
    hasTaggedCronEvents;

  const workspaceDir = resolveAgentWorkspaceDir(params.cfg, params.agentId);
  const heartbeatFilePath = path.join(workspaceDir, DEFAULT_HEARTBEAT_FILENAME);
  try {
    const heartbeatFileContent = await fs.readFile(heartbeatFilePath, "utf-8");
    if (isHeartbeatContentEffectivelyEmpty(heartbeatFileContent) && !shouldBypassFileGates) {
      return {
        ...reasonFlags,
        session,
        pendingEventEntries,
        hasTaggedCronEvents,
        shouldInspectPendingEvents,
        skipReason: "empty-heartbeat-file",
      };
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT" && !shouldBypassFileGates) {
      return {
        ...reasonFlags,
        session,
        pendingEventEntries,
        hasTaggedCronEvents,
        shouldInspectPendingEvents,
        skipReason: "no-heartbeat-file",
      };
    }
    // For other read errors, proceed with heartbeat as before.
  }

  return {
    ...reasonFlags,
    session,
    pendingEventEntries,
    hasTaggedCronEvents,
    shouldInspectPendingEvents,
  };
}

export async function runHeartbeatOnce(opts: {
  cfg?: MinionConfig;
  agentId?: string;
  sessionKey?: string;
  heartbeat?: HeartbeatConfig;
  reason?: string;
  deps?: HeartbeatDeps;
}): Promise<HeartbeatRunResult> {
  const cfg = opts.cfg ?? loadConfig();
  const agentId = normalizeAgentId(opts.agentId ?? resolveDefaultAgentId(cfg));
  const heartbeat = opts.heartbeat ?? resolveHeartbeatConfig(cfg, agentId);
  const _hbLogLevel = resolveHeartbeatLogLevel(cfg, heartbeat);
  const emitAndLog = (params: Parameters<typeof emitHeartbeatEvent>[0]) => {
    emitHeartbeatEvent(params);
    writeHeartbeatLogEntry({
      agentId,
      status: String(params.status),
      reason: typeof params.reason === "string" ? params.reason : undefined,
      durationMs: typeof params.durationMs === "number" ? params.durationMs : undefined,
      configuredLogLevel: _hbLogLevel,
    });
  };
  if (!heartbeatsEnabled) {
    return { status: "skipped", reason: "disabled" };
  }
  if (!isHeartbeatEnabledForAgent(cfg, agentId)) {
    return { status: "skipped", reason: "disabled" };
  }
  if (!resolveHeartbeatIntervalMs(cfg, undefined, heartbeat)) {
    return { status: "skipped", reason: "disabled" };
  }

  const startedAt = opts.deps?.nowMs?.() ?? Date.now();
  if (!isWithinActiveHours(cfg, heartbeat, startedAt)) {
    return { status: "skipped", reason: "quiet-hours" };
  }

  const queueSize = (opts.deps?.getQueueSize ?? getQueueSize)(CommandLane.Main);
  if (queueSize > 0) {
    return { status: "skipped", reason: "requests-in-flight" };
  }

  // Per-agent concurrency guard: prevent overlapping heartbeat runs for the same agent.
  // Safe because the Set check is synchronous (no await) before we add — no TOCTOU race in Node.js.
  if (agentsInProgress.has(agentId)) {
    return { status: "skipped", reason: "in-progress" };
  }
  agentsInProgress.add(agentId);
  try {
    return await _runHeartbeatOnceInner(opts, cfg, agentId, heartbeat, _hbLogLevel, emitAndLog);
  } finally {
    agentsInProgress.delete(agentId);
  }
}

async function _runHeartbeatOnceInner(
  opts: Parameters<typeof runHeartbeatOnce>[0],
  cfg: MinionConfig,
  agentId: string,
  heartbeat: HeartbeatConfig,
  _hbLogLevel: string,
  emitAndLog: (params: Parameters<typeof emitHeartbeatEvent>[0]) => void,
): Promise<HeartbeatRunResult> {
  const startedAt = opts.deps?.nowMs?.() ?? Date.now();

  // Preflight centralizes trigger classification, event inspection, and HEARTBEAT.md gating.
  const preflight = await resolveHeartbeatPreflight({
    cfg,
    agentId,
    heartbeat,
    forcedSessionKey: opts.sessionKey,
    reason: opts.reason,
  });
  if (preflight.skipReason) {
    emitAndLog({
      status: "skipped",
      reason: preflight.skipReason,
      durationMs: Date.now() - startedAt,
    });
    return { status: "skipped", reason: preflight.skipReason };
  }
  const { entry, sessionKey, storePath } = preflight.session;
  const { isCronEventReason, pendingEventEntries } = preflight;
  const previousUpdatedAt = entry?.updatedAt;
  const delivery = resolveHeartbeatDeliveryTarget({
    cfg,
    entry,
    heartbeat,
    mode: isCronEventReason ? "explicit" : "heartbeat",
  });
  const heartbeatAccountId = heartbeat?.accountId?.trim();
  if (delivery.reason === "unknown-account") {
    log.warn("heartbeat: unknown accountId", {
      accountId: delivery.accountId ?? heartbeatAccountId ?? null,
      target: heartbeat?.target ?? "last",
    });
  } else if (heartbeatAccountId) {
    log.info("heartbeat: using explicit accountId", {
      accountId: delivery.accountId ?? heartbeatAccountId,
      target: heartbeat?.target ?? "last",
      channel: delivery.channel,
    });
  }
  const visibility =
    delivery.channel !== "none"
      ? resolveHeartbeatVisibility({
          cfg,
          channel: delivery.channel,
          accountId: delivery.accountId,
        })
      : { showOk: false, showAlerts: true, useIndicator: true };
  const { sender } = resolveHeartbeatSenderContext({ cfg, entry, delivery });
  const responsePrefix = resolveEffectiveMessagesConfig(cfg, agentId, {
    channel: delivery.channel !== "none" ? delivery.channel : undefined,
    accountId: delivery.accountId,
  }).responsePrefix;

  // Check if this is an exec event or cron event with pending system events.
  // If so, use a specialized prompt that instructs the model to relay the result
  // instead of the standard heartbeat prompt with "reply HEARTBEAT_OK".
  const shouldInspectPendingEvents = preflight.shouldInspectPendingEvents;
  const pendingEvents = shouldInspectPendingEvents
    ? pendingEventEntries.map((event) => event.text)
    : [];
  const cronEvents = pendingEventEntries
    .filter(
      (event) =>
        (isCronEventReason || event.contextKey?.startsWith("cron:")) &&
        isCronSystemEvent(event.text),
    )
    .map((event) => event.text);
  const hasExecCompletion = pendingEvents.some(isExecCompletionEvent);
  const hasCronEvents = cronEvents.length > 0;
  const prompt = hasExecCompletion
    ? EXEC_EVENT_PROMPT
    : hasCronEvents
      ? buildCronEventPrompt(cronEvents)
      : resolveHeartbeatPrompt(cfg, heartbeat);
  // Session log: load prior heartbeat context and inject into prompt (gated by feature flag).
  const sessionLogEnabled = isSessionLogEnabled();
  const agentWorkspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  const priorSessionEntries = sessionLogEnabled
    ? await readSessionLogEntries(agentWorkspaceDir, sessionKey)
    : [];
  const promptBody = appendCronStyleCurrentTimeLine(prompt, cfg, startedAt);
  const promptWithContext = injectSessionContext(promptBody, priorSessionEntries);

  const ctx = {
    Body: promptWithContext,
    From: sender,
    To: sender,
    Provider: hasExecCompletion ? "exec-event" : hasCronEvents ? "cron-event" : "heartbeat",
    SessionKey: sessionKey,
  };
  if (!visibility.showAlerts && !visibility.showOk && !visibility.useIndicator) {
    emitAndLog({
      status: "skipped",
      reason: "alerts-disabled",
      durationMs: Date.now() - startedAt,
      channel: delivery.channel !== "none" ? delivery.channel : undefined,
      accountId: delivery.accountId,
    });
    return { status: "skipped", reason: "alerts-disabled" };
  }

  const admitHeartbeatAttempt = async (fingerprint: string, queueId: string) => {
    const attemptId = randomUUID();
    const ownerToken = randomUUID();
    const updateStrict = opts.deps?.updateSessionStoreStrict ?? updateSessionStoreStrict;
    return await updateStrict(storePath, (store) => {
      const current = store[sessionKey];
      if (!current) {
        throw new Error("heartbeat session entry disappeared before delivery");
      }
      const attempts = { ...current.heartbeatDeliveryAttempts };
      if (Object.hasOwn(attempts, fingerprint)) {
        return { status: "duplicate" as const };
      }
      if (Object.keys(attempts).length >= MAX_UNRESOLVED_HEARTBEAT_DELIVERY_ATTEMPTS) {
        return { status: "capacity" as const };
      }
      attempts[fingerprint] = {
        attemptId,
        ownerToken,
        ownerPid: process.pid,
        startedAt,
        disposition: "in-flight",
        queueId,
        queueCorrelationVersion: 1,
      };
      store[sessionKey] = { ...current, heartbeatDeliveryAttempts: attempts };
      return { status: "admitted" as const, attemptId, ownerToken };
    });
  };

  const settleHeartbeatAttempt = async (params: {
    fingerprint: string;
    ownerToken: string;
    action: "clear" | "withhold" | "mark-complete" | "complete";
    outcome?: OutboundDeliveryOutcome;
    deliveredText?: string;
  }): Promise<boolean> =>
    await (opts.deps?.updateSessionStoreStrict ?? updateSessionStoreStrict)(storePath, (store) => {
      const current = store[sessionKey];
      if (!current) {
        throw new Error("heartbeat session entry disappeared before delivery settlement");
      }
      const attempts = { ...current.heartbeatDeliveryAttempts };
      const attempt = attempts[params.fingerprint];
      if (!attempt || attempt.ownerToken !== params.ownerToken) {
        return false;
      }
      if (params.action === "withhold") {
        const outcome = params.outcome;
        if (!outcome) {
          throw new Error("heartbeat withheld settlement requires an outcome");
        }
        const queueId = outcome.durability.queueId?.slice(0, 128);
        attempts[params.fingerprint] = {
          ...attempt,
          disposition: "withheld",
          deliveryStatus: outcome.delivery.status,
          durabilityStatus: outcome.durability.status,
          ...(queueId ? { queueId } : {}),
        };
      } else if (params.action === "mark-complete") {
        if (!attempt.queueId || attempt.queueCorrelationVersion !== 1) {
          throw new Error("heartbeat completion is missing its durable queue correlation");
        }
        attempts[params.fingerprint] = {
          ...attempt,
          disposition: "withheld",
          deliveryStatus: "succeeded",
          durabilityStatus: "checkpointed",
        };
      } else {
        delete attempts[params.fingerprint];
      }
      const next = { ...current };
      if (Object.keys(attempts).length > 0) {
        next.heartbeatDeliveryAttempts = attempts;
      } else {
        delete next.heartbeatDeliveryAttempts;
      }
      if (
        (params.action === "mark-complete" || params.action === "complete") &&
        params.deliveredText?.trim()
      ) {
        next.lastHeartbeatText = params.deliveredText;
        next.lastHeartbeatSentAt = startedAt;
      }
      store[sessionKey] = next;
      return true;
    });

  const deliverHeartbeatPayloads = async (
    payloads: ReplyPayload[],
  ): Promise<
    | { status: "suppressed"; fingerprint: string; reason: "duplicate" | "capacity" }
    | {
        status: "outcome";
        fingerprint: string;
        ownerToken: string;
        attemptId: string;
        outcome: OutboundDeliveryOutcome;
      }
  > => {
    if (delivery.channel === "none" || !delivery.to) {
      throw new Error("heartbeat delivery target is unavailable");
    }
    const fingerprint = heartbeatDeliveryFingerprint({
      channel: delivery.channel,
      to: delivery.to,
      accountId: delivery.accountId,
      threadId: delivery.threadId,
      payloads,
    });
    const queueId = randomUUID();
    const admission = await admitHeartbeatAttempt(fingerprint, queueId);
    if (admission.status !== "admitted") {
      return { status: "suppressed", fingerprint, reason: admission.status };
    }

    let outcome: OutboundDeliveryOutcome;
    try {
      outcome = await (opts.deps?.deliverOutbound ?? deliverOutboundPayloadsWithOutcome)({
        cfg,
        channel: delivery.channel,
        to: delivery.to,
        accountId: delivery.accountId,
        agentId,
        threadId: delivery.threadId,
        payloads,
        deps: opts.deps,
        durability: "required",
        queueId,
        completionPolicy: "caller",
      });
    } catch (err) {
      // Only a typed no-effect failure may clear the intent. An injected or
      // unexpected throw remains in-flight so a possible provider effect is
      // never replayed automatically.
      if (isOutboundDeliveryNoEffectError(err)) {
        await settleHeartbeatAttempt({
          fingerprint,
          ownerToken: admission.ownerToken,
          action: "clear",
        });
      }
      throw err;
    }

    if (outcome.durability.queueId !== queueId) {
      throw new Error("heartbeat delivery returned a mismatched durable queue correlation");
    }

    if (
      !isOutboundDeliveryComplete(outcome) &&
      outcome.durability.requiresCallerAcknowledgement !== true
    ) {
      const settled = await settleHeartbeatAttempt({
        fingerprint,
        ownerToken: admission.ownerToken,
        action: isOutboundRetryWithheld(outcome) ? "withhold" : "clear",
        outcome,
      });
      if (!settled) {
        throw new Error("heartbeat delivery settlement lost its owner token");
      }
    }
    return {
      status: "outcome",
      fingerprint,
      ownerToken: admission.ownerToken,
      attemptId: admission.attemptId,
      outcome,
    };
  };

  const completeHeartbeatDelivery = async (params: {
    execution: Extract<Awaited<ReturnType<typeof deliverHeartbeatPayloads>>, { status: "outcome" }>;
    deliveredText?: string;
  }): Promise<boolean> => {
    const { execution } = params;
    if (execution.outcome.durability.requiresCallerAcknowledgement === true) {
      const queueId = execution.outcome.durability.queueId;
      if (!queueId) {
        throw new Error("caller-managed heartbeat delivery has no queue ID");
      }
      const marked = await settleHeartbeatAttempt({
        fingerprint: execution.fingerprint,
        ownerToken: execution.ownerToken,
        action: "mark-complete",
        deliveredText: params.deliveredText,
      });
      if (!marked) {
        throw new Error("heartbeat delivery completion lost its owner token");
      }
      await (opts.deps?.acknowledgeCallerManagedDelivery ?? acknowledgeCallerManagedDelivery)(
        queueId,
      );
      const cleared = await settleHeartbeatAttempt({
        fingerprint: execution.fingerprint,
        ownerToken: execution.ownerToken,
        action: "clear",
      });
      if (!cleared) {
        throw new Error("heartbeat delivery cleanup lost its owner token");
      }
      return true;
    }
    if (!isOutboundDeliveryComplete(execution.outcome)) {
      return false;
    }
    const settled = await settleHeartbeatAttempt({
      fingerprint: execution.fingerprint,
      ownerToken: execution.ownerToken,
      action: "complete",
      deliveredText: params.deliveredText,
    });
    if (!settled) {
      throw new Error("heartbeat delivery completion lost its owner token");
    }
    return true;
  };

  const heartbeatOkText = responsePrefix ? `${responsePrefix} ${HEARTBEAT_TOKEN}` : HEARTBEAT_TOKEN;
  const canAttemptHeartbeatOk = Boolean(
    visibility.showOk && delivery.channel !== "none" && delivery.to,
  );
  const maybeSendHeartbeatOk = async () => {
    if (!canAttemptHeartbeatOk || delivery.channel === "none" || !delivery.to) {
      return { sent: false };
    }
    const heartbeatPlugin = getChannelPlugin(delivery.channel);
    if (heartbeatPlugin?.heartbeat?.checkReady) {
      const readiness = await heartbeatPlugin.heartbeat.checkReady({
        cfg,
        accountId: delivery.accountId,
        deps: opts.deps,
      });
      if (!readiness.ok) {
        return { sent: false };
      }
    }
    const execution = await deliverHeartbeatPayloads([{ text: heartbeatOkText }]);
    if (execution.status === "suppressed") {
      const suppressionReason =
        execution.reason === "capacity"
          ? "unresolved-delivery-capacity"
          : "automatic-retry-withheld";
      log.warn(`heartbeat acknowledgement suppressed: ${suppressionReason}`);
      return { sent: false, suppressionReason };
    }
    const { outcome } = execution;
    if (!(await completeHeartbeatDelivery({ execution }))) {
      const detail = formatOutboundDeliveryOutcome(outcome);
      if (isOutboundRetryWithheld(outcome)) {
        log.warn(`heartbeat acknowledgement retry withheld: ${detail}`);
        return { sent: false, suppressionReason: "automatic-retry-withheld" };
      }
      throw new Error(`heartbeat acknowledgement incomplete: ${detail}`);
    }
    return { sent: true };
  };

  try {
    // Capture transcript state before the heartbeat run so we can prune if HEARTBEAT_OK
    const transcriptState = await captureTranscriptState({
      storePath,
      sessionKey,
      agentId,
    });

    const heartbeatModelOverride = heartbeat?.model?.trim() || undefined;
    const suppressToolErrorWarnings = heartbeat?.suppressToolErrorWarnings === true;
    const replyOpts = heartbeatModelOverride
      ? { isHeartbeat: true, heartbeatModelOverride, suppressToolErrorWarnings }
      : { isHeartbeat: true, suppressToolErrorWarnings };
    const replyResult = await getReplyFromConfig(ctx, replyOpts, cfg);

    // Cron events: restore delivery context that the LLM call may have overwritten.
    if (isCronEventReason) {
      await restoreCronDeliveryContext({
        storePath,
        sessionKey,
        lastTo: entry?.lastTo,
        deliveryContext: entry?.deliveryContext,
      });
    }

    // Session log: append this run's summary so the next heartbeat can resume context.
    if (sessionLogEnabled) {
      const replyPayloadForLog = resolveHeartbeatReplyPayload(replyResult);
      void appendSessionLogEntry(agentWorkspaceDir, sessionKey, {
        ts: startedAt,
        prompt: promptBody,
        reply: replyPayloadForLog?.text?.trim() ?? "",
        durationMs: Date.now() - startedAt,
      });
    }

    const replyPayload = resolveHeartbeatReplyPayload(replyResult);
    const includeReasoning = heartbeat?.includeReasoning === true;
    const reasoningPayloads = includeReasoning
      ? resolveHeartbeatReasoningPayloads(replyResult).filter((payload) => payload !== replyPayload)
      : [];

    if (
      !replyPayload ||
      (!replyPayload.text && !replyPayload.mediaUrl && !replyPayload.mediaUrls?.length)
    ) {
      await restoreHeartbeatUpdatedAt({
        storePath,
        sessionKey,
        updatedAt: previousUpdatedAt,
      });
      // Prune the transcript to remove HEARTBEAT_OK turns
      await pruneHeartbeatTranscript(transcriptState);
      const okResult = await maybeSendHeartbeatOk();
      emitAndLog({
        status: "ok-empty",
        reason: okResult.suppressionReason ?? opts.reason,
        durationMs: Date.now() - startedAt,
        channel: delivery.channel !== "none" ? delivery.channel : undefined,
        accountId: delivery.accountId,
        silent: !okResult.sent,
        indicatorType: visibility.useIndicator ? resolveIndicatorType("ok-empty") : undefined,
      });
      return { status: "ran", durationMs: Date.now() - startedAt };
    }

    const ackMaxChars = resolveHeartbeatAckMaxChars(cfg, heartbeat);
    const normalized = normalizeHeartbeatReply(replyPayload, responsePrefix, ackMaxChars);
    // For exec completion events, don't skip even if the response looks like HEARTBEAT_OK.
    // The model should be responding with exec results, not ack tokens.
    // Also, if normalized.text is empty due to token stripping but we have exec completion,
    // fall back to the original reply text.
    const execFallbackText =
      hasExecCompletion && !normalized.text.trim() && replyPayload.text?.trim()
        ? replyPayload.text.trim()
        : null;
    if (execFallbackText) {
      normalized.text = execFallbackText;
      normalized.shouldSkip = false;
    }
    const shouldSkipMain = normalized.shouldSkip && !normalized.hasMedia && !hasExecCompletion;
    if (shouldSkipMain && reasoningPayloads.length === 0) {
      await restoreHeartbeatUpdatedAt({
        storePath,
        sessionKey,
        updatedAt: previousUpdatedAt,
      });
      // Prune the transcript to remove HEARTBEAT_OK turns
      await pruneHeartbeatTranscript(transcriptState);
      const okResult = await maybeSendHeartbeatOk();
      emitAndLog({
        status: "ok-token",
        reason: okResult.suppressionReason ?? opts.reason,
        durationMs: Date.now() - startedAt,
        channel: delivery.channel !== "none" ? delivery.channel : undefined,
        accountId: delivery.accountId,
        silent: !okResult.sent,
        indicatorType: visibility.useIndicator ? resolveIndicatorType("ok-token") : undefined,
      });
      return { status: "ran", durationMs: Date.now() - startedAt };
    }

    const mediaUrls =
      replyPayload.mediaUrls ?? (replyPayload.mediaUrl ? [replyPayload.mediaUrl] : []);

    // Suppress duplicate heartbeats (same payload) within a short window.
    // This prevents "nagging" when nothing changed but the model repeats the same items.
    const prevHeartbeatText =
      typeof entry?.lastHeartbeatText === "string" ? entry.lastHeartbeatText : "";
    const prevHeartbeatAt =
      typeof entry?.lastHeartbeatSentAt === "number" ? entry.lastHeartbeatSentAt : undefined;
    const isDuplicateMain =
      !shouldSkipMain &&
      !mediaUrls.length &&
      Boolean(prevHeartbeatText.trim()) &&
      normalized.text.trim() === prevHeartbeatText.trim() &&
      typeof prevHeartbeatAt === "number" &&
      startedAt - prevHeartbeatAt < 24 * 60 * 60 * 1000;

    if (isDuplicateMain) {
      await restoreHeartbeatUpdatedAt({
        storePath,
        sessionKey,
        updatedAt: previousUpdatedAt,
      });
      // Prune the transcript to remove duplicate heartbeat turns
      await pruneHeartbeatTranscript(transcriptState);
      emitAndLog({
        status: "skipped",
        reason: "duplicate",
        preview: normalized.text.slice(0, 200),
        durationMs: Date.now() - startedAt,
        hasMedia: false,
        channel: delivery.channel !== "none" ? delivery.channel : undefined,
        accountId: delivery.accountId,
      });
      return { status: "ran", durationMs: Date.now() - startedAt };
    }

    // Reasoning payloads are text-only; any attachments stay on the main reply.
    const previewText = shouldSkipMain
      ? reasoningPayloads
          .map((payload) => payload.text)
          .filter((text): text is string => Boolean(text?.trim()))
          .join("\n")
      : normalized.text;

    if (delivery.channel === "none" || !delivery.to) {
      emitAndLog({
        status: "skipped",
        reason: delivery.reason ?? "no-target",
        preview: previewText?.slice(0, 200),
        durationMs: Date.now() - startedAt,
        hasMedia: mediaUrls.length > 0,
        accountId: delivery.accountId,
      });
      return { status: "ran", durationMs: Date.now() - startedAt };
    }

    if (!visibility.showAlerts) {
      await restoreHeartbeatUpdatedAt({
        storePath,
        sessionKey,
        updatedAt: previousUpdatedAt,
      });
      emitAndLog({
        status: "skipped",
        reason: "alerts-disabled",
        preview: previewText?.slice(0, 200),
        durationMs: Date.now() - startedAt,
        channel: delivery.channel,
        hasMedia: mediaUrls.length > 0,
        accountId: delivery.accountId,
        indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : undefined,
      });
      return { status: "ran", durationMs: Date.now() - startedAt };
    }

    const deliveryAccountId = delivery.accountId;
    const heartbeatPlugin = getChannelPlugin(delivery.channel);
    if (heartbeatPlugin?.heartbeat?.checkReady) {
      const readiness = await heartbeatPlugin.heartbeat.checkReady({
        cfg,
        accountId: deliveryAccountId,
        deps: opts.deps,
      });
      if (!readiness.ok) {
        emitAndLog({
          status: "skipped",
          reason: readiness.reason,
          preview: previewText?.slice(0, 200),
          durationMs: Date.now() - startedAt,
          hasMedia: mediaUrls.length > 0,
          channel: delivery.channel,
          accountId: delivery.accountId,
        });
        log.info("heartbeat: channel not ready", {
          channel: delivery.channel,
          reason: readiness.reason,
        });
        return { status: "skipped", reason: readiness.reason };
      }
    }

    const deliveryPayloads = [
      ...reasoningPayloads,
      ...(shouldSkipMain
        ? []
        : [
            {
              text: normalized.text,
              mediaUrls,
            },
          ]),
    ];
    const execution = await deliverHeartbeatPayloads(deliveryPayloads);
    if (execution.status === "suppressed") {
      await restoreHeartbeatUpdatedAt({
        storePath,
        sessionKey,
        updatedAt: previousUpdatedAt,
      });
      await pruneHeartbeatTranscript(transcriptState);
      emitAndLog({
        status: "skipped",
        reason:
          execution.reason === "capacity"
            ? "unresolved-delivery-capacity"
            : "automatic-retry-withheld",
        preview: previewText?.slice(0, 200),
        durationMs: Date.now() - startedAt,
        hasMedia: mediaUrls.length > 0,
        channel: delivery.channel,
        accountId: delivery.accountId,
      });
      return { status: "ran", durationMs: Date.now() - startedAt };
    }
    const { outcome } = execution;
    if (
      !(await completeHeartbeatDelivery({
        execution,
        deliveredText: shouldSkipMain ? undefined : normalized.text,
      }))
    ) {
      const prefix = isOutboundRetryWithheld(outcome)
        ? "heartbeat automatic retry withheld"
        : "heartbeat delivery incomplete";
      throw new Error(`${prefix}: ${formatOutboundDeliveryOutcome(outcome)}`);
    }

    emitAndLog({
      status: "sent",
      to: delivery.to,
      preview: previewText?.slice(0, 200),
      durationMs: Date.now() - startedAt,
      hasMedia: mediaUrls.length > 0,
      channel: delivery.channel,
      accountId: delivery.accountId,
      indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : undefined,
    });
    return { status: "ran", durationMs: Date.now() - startedAt };
  } catch (err) {
    const reason = formatErrorMessage(err);
    emitAndLog({
      status: "failed",
      reason,
      durationMs: Date.now() - startedAt,
      channel: delivery.channel !== "none" ? delivery.channel : undefined,
      accountId: delivery.accountId,
      indicatorType: visibility.useIndicator ? resolveIndicatorType("failed") : undefined,
    });
    traceGatewayEvent({
      traceId: "hb_error",
      level: "ERROR",
      stage: "HEARTBEAT_FAILED",
      data: { reason: reason.slice(0, 200) },
    });
    log.error(`heartbeat failed: ${reason}`, { error: reason });
    return { status: "failed", reason };
  }
}

export function startHeartbeatRunner(opts: {
  cfg?: MinionConfig;
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
  runOnce?: typeof runHeartbeatOnce;
}): HeartbeatRunner {
  const runtime = opts.runtime ?? defaultRuntime;
  const runOnce = opts.runOnce ?? runHeartbeatOnce;
  const state = {
    cfg: opts.cfg ?? loadConfig(),
    runtime,
    agents: new Map<string, HeartbeatAgentState>(),
    timer: null as NodeJS.Timeout | null,
    stopped: false,
  };
  let initialized = false;

  const resolveNextDue = (now: number, intervalMs: number, prevState?: HeartbeatAgentState) => {
    if (typeof prevState?.lastRunMs === "number") {
      return prevState.lastRunMs + intervalMs;
    }
    if (prevState && prevState.intervalMs === intervalMs && prevState.nextDueMs > now) {
      return prevState.nextDueMs;
    }
    return now + intervalMs;
  };

  const advanceAgentSchedule = (agent: HeartbeatAgentState, now: number) => {
    agent.lastRunMs = now;
    agent.nextDueMs = now + agent.intervalMs;
  };

  const scheduleNext = () => {
    if (state.stopped) {
      return;
    }
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.agents.size === 0) {
      return;
    }
    const now = Date.now();
    let nextDue = Number.POSITIVE_INFINITY;
    for (const agent of state.agents.values()) {
      if (agent.nextDueMs < nextDue) {
        nextDue = agent.nextDueMs;
      }
    }
    if (!Number.isFinite(nextDue)) {
      return;
    }
    const delay = Math.max(0, nextDue - now);
    state.timer = setTimeout(() => {
      state.timer = null;
      requestHeartbeatNow({ reason: "interval", coalesceMs: 0 });
    }, delay);
    state.timer.unref?.();
  };

  const updateConfig = (cfg: MinionConfig) => {
    if (state.stopped) {
      return;
    }
    const now = Date.now();
    const prevAgents = state.agents;
    const prevEnabled = prevAgents.size > 0;
    const nextAgents = new Map<string, HeartbeatAgentState>();
    const intervals: number[] = [];
    for (const agent of resolveHeartbeatAgents(cfg)) {
      const intervalMs = resolveHeartbeatIntervalMs(cfg, undefined, agent.heartbeat);
      if (!intervalMs) {
        continue;
      }
      intervals.push(intervalMs);
      const prevState = prevAgents.get(agent.agentId);
      const nextDueMs = resolveNextDue(now, intervalMs, prevState);
      nextAgents.set(agent.agentId, {
        agentId: agent.agentId,
        heartbeat: agent.heartbeat,
        intervalMs,
        lastRunMs: prevState?.lastRunMs,
        nextDueMs,
      });
    }

    state.cfg = cfg;
    state.agents = nextAgents;
    const nextEnabled = nextAgents.size > 0;
    if (!initialized) {
      if (!nextEnabled) {
        log.info("heartbeat: disabled", { enabled: false });
      } else {
        log.info("heartbeat: started", { intervalMs: Math.min(...intervals) });
      }
      initialized = true;
    } else if (prevEnabled !== nextEnabled) {
      if (!nextEnabled) {
        log.info("heartbeat: disabled", { enabled: false });
      } else {
        log.info("heartbeat: started", { intervalMs: Math.min(...intervals) });
      }
    }

    scheduleNext();
  };

  const run: HeartbeatWakeHandler = async (params) => {
    if (state.stopped) {
      return {
        status: "skipped",
        reason: "disabled",
      } satisfies HeartbeatRunResult;
    }
    if (!heartbeatsEnabled) {
      return {
        status: "skipped",
        reason: "disabled",
      } satisfies HeartbeatRunResult;
    }
    if (state.agents.size === 0) {
      return {
        status: "skipped",
        reason: "disabled",
      } satisfies HeartbeatRunResult;
    }

    const reason = params?.reason;
    const requestedAgentId = params?.agentId ? normalizeAgentId(params.agentId) : undefined;
    const requestedSessionKey = params?.sessionKey?.trim() || undefined;
    const isInterval = reason === "interval";
    const startedAt = Date.now();
    const now = startedAt;
    let ran = false;

    if (requestedSessionKey || requestedAgentId) {
      const targetAgentId = requestedAgentId ?? resolveAgentIdFromSessionKey(requestedSessionKey);
      const targetAgent = state.agents.get(targetAgentId);
      if (!targetAgent) {
        scheduleNext();
        return { status: "skipped", reason: "disabled" };
      }
      try {
        const res = await runOnce({
          cfg: state.cfg,
          agentId: targetAgent.agentId,
          heartbeat: targetAgent.heartbeat,
          reason,
          sessionKey: requestedSessionKey,
          deps: { runtime: state.runtime },
        });
        if ((res.status !== "skipped" || res.reason !== "disabled") && isInterval) {
          advanceAgentSchedule(targetAgent, now);
        }
        scheduleNext();
        return res.status === "ran" ? { status: "ran", durationMs: Date.now() - startedAt } : res;
      } catch (err) {
        const errMsg = formatErrorMessage(err);
        log.error(`heartbeat runner: targeted runOnce threw unexpectedly: ${errMsg}`, {
          error: errMsg,
        });
        if (isInterval) {
          advanceAgentSchedule(targetAgent, now);
        }
        scheduleNext();
        return { status: "failed", reason: errMsg };
      }
    }

    for (const agent of state.agents.values()) {
      if (isInterval && now < agent.nextDueMs) {
        continue;
      }

      let res: HeartbeatRunResult;
      try {
        res = await runOnce({
          cfg: state.cfg,
          agentId: agent.agentId,
          heartbeat: agent.heartbeat,
          reason,
          deps: { runtime: state.runtime },
        });
      } catch (err) {
        // If runOnce throws (e.g. during session compaction), we must still
        // advance the timer and call scheduleNext so heartbeats keep firing.
        const errMsg = formatErrorMessage(err);
        log.error(`heartbeat runner: runOnce threw unexpectedly: ${errMsg}`, { error: errMsg });
        if (isInterval) {
          advanceAgentSchedule(agent, now);
        }
        continue;
      }
      if (res.status === "skipped" && res.reason === "requests-in-flight") {
        if (isInterval) {
          advanceAgentSchedule(agent, now);
        }
        scheduleNext();
        return res;
      }
      if ((res.status !== "skipped" || res.reason !== "disabled") && isInterval) {
        advanceAgentSchedule(agent, now);
      }
      if (res.status === "ran") {
        ran = true;
      }
    }

    scheduleNext();
    if (ran) {
      return { status: "ran", durationMs: Date.now() - startedAt };
    }
    return { status: "skipped", reason: isInterval ? "not-due" : "disabled" };
  };

  const wakeHandler: HeartbeatWakeHandler = async (params) =>
    run({
      reason: params.reason,
      agentId: params.agentId,
      sessionKey: params.sessionKey,
    });
  const disposeWakeHandler = setHeartbeatWakeHandler(wakeHandler);
  updateConfig(state.cfg);

  const cleanup = () => {
    if (state.stopped) {
      return;
    }
    state.stopped = true;
    disposeWakeHandler();
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.timer = null;
  };

  opts.abortSignal?.addEventListener("abort", cleanup, { once: true });

  return { stop: cleanup, updateConfig };
}
