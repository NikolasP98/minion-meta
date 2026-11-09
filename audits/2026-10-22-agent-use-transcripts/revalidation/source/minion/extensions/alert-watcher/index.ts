import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createGatewayDroneHost } from "../../src/drones/host.js";
import type { MinionPluginApi } from "../../src/plugins/types.js";
import { classifyMessage } from "./src/classifier.js";
import { fetchContext } from "./src/context.js";
import { createCooldown, type Cooldown } from "./src/cooldown.js";
import { createDedup, type Dedup } from "./src/dedup.js";
import { sendAlerts, type Destination } from "./src/destinations.js";
import {
  envelopeFromClassification,
  isActionable,
  parseEnvelope,
  serializeEnvelope,
} from "./src/envelope.js";
import { migratePluginState } from "./src/migrate.js";
import { appendSuggestionsBlock } from "./src/reply-flow/format.js";
import { handleOwnerReply } from "./src/reply-flow/handle-reply.js";
import { initReplySchema, insertPending } from "./src/reply-flow/store.js";
import { runSuggestionsDrone } from "./src/reply-flow/suggestions-drone.js";
import { DEFAULT_REPLY_FLOW_CONFIG, type ReplyFlowConfig } from "./src/reply-flow/types.js";
import {
  insertComplaint,
  markNotified,
  initSchema,
  getRetryablePendingNotifications,
  bumpNotifyAttempt,
  MAX_NOTIFY_ATTEMPTS,
} from "./src/store.js";
import { matchesAgentSub, matchesChannelSub, type Sub } from "./src/subscriptions.js";
import type { ComplaintResult } from "./src/types.js";

const PLUGIN_ID = "alert-watcher";
// Renamed 2026-05-15 from `complaint-listener`. Kept here only as the
// migration source — gateway loader looks at this when no entry exists
// under PLUGIN_ID, and state-dir migration moves the old dir on first boot.
const LEGACY_PLUGIN_ID = "complaint-listener";
// DB filename moved from complaints.db → alerts.db as part of the rename.
// migratePluginState handles the rename on first boot.
const DB_FILENAME = "alerts.db";
const LEGACY_DB_FILENAME = "complaints.db";

interface ResolvedConfig {
  subscriptions: Sub[];
  destinations: Destination[];
  classifier: {
    model: string;
    contextWindow: number;
    minSeverity: "low" | "med" | "high";
    systemPrompt?: string;
    severityRubric?: { low?: string; med?: string; high?: string };
    categories?: string[];
  };
  language: "es" | "en";
  cooldown: {
    enabled: boolean;
    maxMessages: number;
    windowMinutes: number;
    allowEscalation: boolean;
  };
  replyFlow: ReplyFlowConfig;
}

const SEVERITY_ORDER: Record<string, number> = { low: 0, med: 1, high: 2 };

// Short channel aliases accepted in the flow `destinationsOverride` field so a
// user who types the natural shorthand (`wa:`, `tg:`) still resolves to the real
// channel-registry key instead of an `unknown_channel` send failure (F6).
const CHANNEL_ALIASES: Record<string, string> = {
  wa: "whatsapp",
  whatsapp: "whatsapp",
  tg: "telegram",
  telegram: "telegram",
};
function normalizeChannelAlias(channel: string): string {
  return CHANNEL_ALIASES[channel.toLowerCase()] ?? channel;
}

// Bundle-dup guard. The extension build (and rolldown) can produce more than
// one copy of this module across chunks. With plain `register()` closure
// state, the service `start()` opens `db` in ONE copy while a `message_inbound`
// hook handler running in a DIFFERENT copy reads its own `db === null` and
// silently drops the message — so only the first message after each boot is
// ever classified. Pin the shared instance state on globalThis so every copy
// reads/writes the SAME db/dedup/cooldown/droneHost. Mirrors message-ledger.ts
// and hook-runner-global.ts. See reference_module_state_bundle_dup.md.
interface AlertWatcherState {
  db: DatabaseSync | null;
  dedup: Dedup;
  cooldown: Cooldown;
  droneHost: ReturnType<typeof createGatewayDroneHost>;
}
const STATE_SYMBOL = "__minion_alert_watcher_state__";
function getSharedState(api: MinionPluginApi): AlertWatcherState {
  const g = globalThis as unknown as Record<string, AlertWatcherState | undefined>;
  let s = g[STATE_SYMBOL];
  if (!s) {
    s = {
      db: null,
      dedup: createDedup(1000),
      cooldown: createCooldown(),
      // Dedicated drone host: created once for the lifetime of the process,
      // shared across all module copies. Avoids per-message host allocation
      // and ensures a host is always ready even during qmd-busy boot windows.
      droneHost: createGatewayDroneHost({ config: api.config }),
    };
    g[STATE_SYMBOL] = s;
  }
  return s;
}

function resolveConfig(raw: Record<string, unknown>): ResolvedConfig {
  const c = (raw.classifier as Record<string, unknown> | undefined) ?? {};
  const cd = (raw.cooldown as Record<string, unknown> | undefined) ?? {};
  const lang = raw.language === "en" ? "en" : "es";
  return {
    subscriptions: (raw.subscriptions as Sub[]) ?? [],
    destinations: (raw.destinations as Destination[]) ?? [],
    classifier: {
      model: (c.model as string) ?? "claude-haiku-4-5",
      contextWindow: (c.contextWindow as number) ?? 5,
      minSeverity: (c.minSeverity as "low" | "med" | "high") ?? "low",
      systemPrompt:
        typeof c.systemPrompt === "string" && c.systemPrompt.trim().length > 0
          ? (c.systemPrompt as string)
          : undefined,
      severityRubric:
        typeof c.severityRubric === "object" && c.severityRubric !== null
          ? (c.severityRubric as { low?: string; med?: string; high?: string })
          : undefined,
      categories:
        Array.isArray(c.categories) && c.categories.length > 0
          ? (c.categories as string[]).filter((s) => typeof s === "string" && s.length > 0)
          : undefined,
    },
    language: lang,
    cooldown: {
      enabled: typeof cd.enabled === "boolean" ? cd.enabled : false,
      maxMessages: typeof cd.maxMessages === "number" ? cd.maxMessages : 12,
      windowMinutes: typeof cd.windowMinutes === "number" ? cd.windowMinutes : 30,
      allowEscalation: typeof cd.allowEscalation === "boolean" ? cd.allowEscalation : true,
    },
    replyFlow: (() => {
      const rf = (raw.replyFlow as Record<string, unknown> | undefined) ?? {};
      const rfSugg = (rf.suggestions as Record<string, unknown> | undefined) ?? {};
      return {
        enabled: typeof rf.enabled === "boolean" ? rf.enabled : DEFAULT_REPLY_FLOW_CONFIG.enabled,
        windowMs:
          typeof rf.windowMs === "number" ? rf.windowMs : DEFAULT_REPLY_FLOW_CONFIG.windowMs,
        notifyLoser:
          typeof rf.notifyLoser === "boolean"
            ? rf.notifyLoser
            : DEFAULT_REPLY_FLOW_CONFIG.notifyLoser,
        suggestions: {
          enabled:
            typeof rfSugg.enabled === "boolean"
              ? rfSugg.enabled
              : DEFAULT_REPLY_FLOW_CONFIG.suggestions.enabled,
          count:
            typeof rfSugg.count === "number"
              ? rfSugg.count
              : DEFAULT_REPLY_FLOW_CONFIG.suggestions.count,
          maxChars:
            typeof rfSugg.maxChars === "number"
              ? rfSugg.maxChars
              : DEFAULT_REPLY_FLOW_CONFIG.suggestions.maxChars,
        },
      } satisfies ReplyFlowConfig;
    })(),
  };
}

function formatAlert(
  event: {
    channel: string;
    accountId: string;
    senderId?: string;
    senderUsername?: string;
    content: string;
  },
  result: ComplaintResult,
  history: Array<{ role: string; content: string }>,
  language: "es" | "en",
): string {
  const emoji = result.severity === "high" ? "🔴" : result.severity === "med" ? "🟠" : "🟡";
  if (language === "es") {
    const sevES = ({ low: "BAJA", med: "MEDIA", high: "ALTA" } as const)[result.severity];
    const lines = [
      `${emoji} *Queja detectada* (${sevES})`,
      `De: ${event.senderUsername ?? event.senderId ?? "desconocido"} (${event.channel})`,
      `Categoría: ${result.category}`,
      `Mensaje: "${event.content}"`,
    ];
    if (history.length > 1) {
      lines.push("", `Contexto (últimos ${history.length}):`);
      for (const h of history) lines.push(`  • [${h.role}] ${h.content}`);
    }
    if (result.summary) lines.push("", `Resumen: ${result.summary}`);
    return lines.join("\n");
  }
  const lines = [
    `${emoji} *Complaint detected* (${result.severity.toUpperCase()})`,
    `From: ${event.senderUsername ?? event.senderId ?? "unknown"} (${event.channel})`,
    `Category: ${result.category}`,
    `Latest: "${event.content}"`,
  ];
  if (history.length > 1) {
    lines.push("", `Context (last ${history.length}):`);
    for (const h of history) lines.push(`  • [${h.role}] ${h.content}`);
  }
  if (result.summary) lines.push("", `Summary: ${result.summary}`);
  return lines.join("\n");
}

export default {
  id: PLUGIN_ID,
  name: "Alert Watcher",
  description:
    "Watches subscribed channels/agents and fans out classifier-detected alerts to configured destinations.",
  configSchema: { type: "object", additionalProperties: false, properties: {} },

  register(api: MinionPluginApi) {
    // Shared across all (possibly bundle-duplicated) copies of this module.
    const state = getSharedState(api);
    // Hard ceiling on classifier latency. The drone library's `timeoutMs:15000`
    // only times the LLM call itself, NOT queue-wait or other blocking. This
    // outer race guarantees the handler never orphans even if the inner await
    // hangs. Set to 30s — well above expected p99 LLM completion (~3s observed).
    const CLASSIFIER_HARD_TIMEOUT_MS = 30_000;

    api.registerService({
      id: PLUGIN_ID,
      async start(ctx) {
        // One-shot state migration from the legacy plugin id. Idempotent.
        const newDir = path.join(ctx.stateDir, "plugins", PLUGIN_ID);
        const legacyDir = path.join(ctx.stateDir, "plugins", LEGACY_PLUGIN_ID);
        const migration = migratePluginState({
          legacyDir,
          newDir,
          fileRenames: [{ from: LEGACY_DB_FILENAME, to: DB_FILENAME }],
        });
        for (const step of migration.steps) api.logger.info(`${PLUGIN_ID}: migrate — ${step}`);
        for (const err of migration.errors) api.logger.warn(`${PLUGIN_ID}: migrate — ${err}`);

        const dbPath = path.join(newDir, DB_FILENAME);
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        const opened = new DatabaseSync(dbPath);
        initSchema(opened);
        initReplySchema(opened);
        state.db = opened;

        const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
        api.logger.info(
          `${PLUGIN_ID}: subscriptions=${cfg.subscriptions.length} destinations=${cfg.destinations.length}`,
        );
        // Migration hint: if this plugin booted with no subs/destinations, the
        // user may still have config under the previous id. Tell them once on
        // startup what to do — we don't auto-alias because plugin loader has
        // no id-aliasing primitive (yet).
        if (cfg.subscriptions.length === 0 && cfg.destinations.length === 0) {
          api.logger.warn(
            `${PLUGIN_ID}: no config found. If you previously ran "${LEGACY_PLUGIN_ID}", rename the gateway.json key plugins.entries.${LEGACY_PLUGIN_ID} → plugins.entries.${PLUGIN_ID}.`,
          );
        }

        const ledger = api.runtime.messageLedger?.getDb?.();
        if (!ledger) {
          api.logger.warn(
            `${PLUGIN_ID}: messageLedger disabled — classifier will use single-message synthetic context (no conversational history)`,
          );
        }

        // Boot catch-up — drain pending rows. C2 fix: cap retry attempts via
        // notify_attempts column so a permanently-broken destination doesn't
        // get retried forever on every restart. F9 fix: run AFTER start()
        // returns (fire-and-forget) so a slow/dead destination never delays
        // gateway boot — the awaited fan-out used to block service start.
        if (cfg.destinations.length > 0) {
          void (async () => {
            try {
              const pending = getRetryablePendingNotifications(opened, MAX_NOTIFY_ATTEMPTS);
              api.logger.info(
                `${PLUGIN_ID}: boot catch-up — ${pending.length} pending (attempts<${MAX_NOTIFY_ATTEMPTS})`,
              );
              for (const row of pending) {
                const attempts = bumpNotifyAttempt(opened, row.id);
                const text = formatAlert(
                  {
                    channel: row.channel_id,
                    accountId: "default",
                    senderId: row.from_sender,
                    content: row.content,
                  },
                  {
                    is_complaint: true,
                    severity: row.severity,
                    category: row.category,
                    summary: row.summary,
                  },
                  [],
                  cfg.language,
                );
                const r = await sendAlerts(api, cfg.destinations, text);
                // M6: only mark notified if ALL destinations got it.
                if (r.successCount === r.total && r.total > 0) {
                  markNotified(opened, row.id);
                } else {
                  api.logger.warn(
                    `${PLUGIN_ID}: boot retry id=${row.id} partial/failed (${r.successCount}/${r.total}, attempt ${attempts}/${MAX_NOTIFY_ATTEMPTS})`,
                  );
                }
              }
            } catch (err) {
              api.logger.warn(`${PLUGIN_ID}: boot catch-up error: ${String(err)}`);
            }
          })();
        }
      },
      stop() {
        state.db = null;
        api.logger.info(`${PLUGIN_ID}: stopped`);
      },
    });

    // ── Flow nodes ───────────────────────────────────────────────────────────
    // The same classify → alert pipeline this plugin runs internally, exposed as
    // two flow-editor action nodes so it can be laid out as a visible automation
    // flow (see the shipped "Alert Watcher pipeline" template in the manifest).
    // A channel trigger node (e.g. WhatsApp message) feeds `alertWatcher.classify`,
    // whose JSON output feeds `alertWatcher.sendAlert`.

    // Classify an inbound message. Returns a JSON string carrying the original
    // text alongside the classification so the next node has full context (flow
    // state only forwards the previous node's text output).
    api.registerGatewayMethod("alertWatcher.classify", async ({ params, respond }) => {
      const input = typeof params?.input === "string" ? params.input : "";
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      // Per-node config from the flow-editor form (declared in the manifest).
      const nodeConfig = (params?.config ?? {}) as Record<string, unknown>;
      const model =
        typeof nodeConfig.model === "string" && nodeConfig.model
          ? nodeConfig.model
          : cfg.classifier.model;
      const minSeverity = (
        nodeConfig.minSeverity === "low" ||
        nodeConfig.minSeverity === "med" ||
        nodeConfig.minSeverity === "high"
          ? nodeConfig.minSeverity
          : cfg.classifier.minSeverity
      ) as "low" | "med" | "high";
      // Per-node overrides so the severity rubric + language can live IN the flow
      // node (portable, not global plugin config). Each rubric tier falls back
      // individually to the plugin config; blanks don't clobber. The flow-editor
      // form has no nested-object field type, so the three rubric tiers are
      // declared as flat textarea keys (severityRubricLow/Med/High); a legacy
      // nested `severityRubric` object is still read for back-compat.
      const pick = (a?: string, b?: string) => (typeof a === "string" && a.trim() ? a : b);
      const legacyRubric =
        typeof nodeConfig.severityRubric === "object" && nodeConfig.severityRubric !== null
          ? (nodeConfig.severityRubric as { low?: string; med?: string; high?: string })
          : {};
      const flat = (k: string) =>
        typeof nodeConfig[k] === "string" ? (nodeConfig[k] as string) : undefined;
      const severityRubric = {
        low: pick(
          flat("severityRubricLow") ?? legacyRubric.low,
          cfg.classifier.severityRubric?.low,
        ),
        med: pick(
          flat("severityRubricMed") ?? legacyRubric.med,
          cfg.classifier.severityRubric?.med,
        ),
        high: pick(
          flat("severityRubricHigh") ?? legacyRubric.high,
          cfg.classifier.severityRubric?.high,
        ),
      };
      // System prompt can be overridden per-node (blank falls back to plugin config).
      const systemPrompt = pick(flat("systemPrompt"), cfg.classifier.systemPrompt);
      const language: "es" | "en" =
        nodeConfig.language === "en" || nodeConfig.language === "es"
          ? nodeConfig.language
          : cfg.language;
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 30_000);
      try {
        const classified = await classifyMessage(
          [{ role: "user", content: input, ts: Date.now() }],
          state.droneHost,
          model,
          ac.signal,
          language,
          {
            systemPrompt,
            severityRubric,
            categories: cfg.classifier.categories,
          },
        );
        // Gate by the node's min-severity: below threshold → not a complaint.
        const result =
          classified.is_complaint &&
          SEVERITY_ORDER[classified.severity] < SEVERITY_ORDER[minSeverity]
            ? { ...classified, is_complaint: false }
            : classified;
        // Emit the v1 envelope (the stable contract the gate/suggest/send-alert
        // nodes consume). The rule router branches on its `"severity":"<tier>"`.
        respond(true, { reply: serializeEnvelope(envelopeFromClassification(input, result)) });
      } catch (err) {
        api.logger.error(`${PLUGIN_ID}: flow classify error: ${String(err)}`);
        respond(true, {
          reply: serializeEnvelope(
            envelopeFromClassification(input, {
              is_complaint: false,
              severity: "low",
              category: "error" as ComplaintResult["category"],
              summary: String(err),
            }),
          ),
        });
      } finally {
        clearTimeout(timeout);
      }
    });

    // Gate (kernel core action): the hardened middle of the pipeline. Reads an
    // envelope, applies authoritative dedup → cooldown → triage-log insert, and
    // sets `alertId`/`suppressed`. Idempotent per messageId/content within the
    // dedup window: running the flow twice on one message yields ≤1 row and ≤1
    // downstream pass. A non-match / already-suppressed envelope is a no-op.
    //
    // NOTE (pre-Platform-Ask-A): pluginAction params carry no sender/chat/message
    // identity, so dedup keys on the message CONTENT (10s bucket) and cooldown
    // keys per chat when `meta` is present, else per content. Once eventPayload is
    // threaded into pluginAction params, gate upgrades to messageId dedup +
    // sender-keyed cooldown with zero flow changes (the envelope `meta` fills in).
    api.registerGatewayMethod("alertWatcher.gate", async ({ params, respond }) => {
      const input = typeof params?.input === "string" ? params.input : "";
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      const nodeConfig = (params?.config ?? {}) as Record<string, unknown>;
      const env = parseEnvelope(input);
      // No-match / already-suppressed → cheap pass-through (invariant #4).
      if (!isActionable(env)) {
        respond(true, { reply: serializeEnvelope(env) });
        return;
      }
      const meta = env.meta ?? {};
      // Dedup: a literal re-run of the same message is suppressed and NOT
      // re-inserted (idempotency). Prefer messageId when present; else content.
      const isDup =
        (meta.messageId ? state.dedup.markSeen(meta.messageId) : false) ||
        state.dedup.markSeenFallback({
          channel: meta.channel ?? "flow",
          accountId: meta.accountId ?? "default",
          chatId: meta.chatId ?? "flow",
          sender: meta.senderId ?? "flow",
          content: env.original,
        });
      // Cooldown config: per-node overrides fall back to plugin config.
      const cdEnabled =
        typeof nodeConfig.cooldownEnabled === "boolean"
          ? nodeConfig.cooldownEnabled
          : cfg.cooldown.enabled;
      const cooldownCfg = {
        enabled: cdEnabled,
        maxMessages:
          typeof nodeConfig.maxMessages === "number"
            ? nodeConfig.maxMessages
            : cfg.cooldown.maxMessages,
        windowMinutes:
          typeof nodeConfig.windowMinutes === "number"
            ? nodeConfig.windowMinutes
            : cfg.cooldown.windowMinutes,
        allowEscalation:
          typeof nodeConfig.allowEscalation === "boolean"
            ? nodeConfig.allowEscalation
            : cfg.cooldown.allowEscalation,
      };
      const chatKey = meta.chatId
        ? `${meta.channel ?? "flow"}:${meta.chatId}`
        : `content:${env.original}`;
      let suppressed = isDup;
      if (!suppressed && cdEnabled) {
        state.cooldown.recordMessage(chatKey);
        if (state.cooldown.shouldSuppress(chatKey, cooldownCfg, env.severity)) {
          suppressed = true;
        }
      }
      // Triage-log insert. A literal duplicate is NOT inserted (idempotency); a
      // distinct-but-cooldown-suppressed message IS logged (every-message
      // guarantee, §7.3). Mark the cooldown window only when we'll actually alert.
      let alertId = env.alertId;
      if (!isDup && state.db) {
        try {
          alertId = insertComplaint(state.db, {
            channelId: meta.channel ?? "flow",
            chatId: meta.chatId ?? "flow",
            fromSender: meta.senderId ?? "flow",
            content: env.original,
            result: {
              is_complaint: true,
              severity: env.severity,
              category: env.category as ComplaintResult["category"],
              summary: env.summary,
            },
          });
        } catch (e) {
          api.logger.warn(`${PLUGIN_ID}: gate triage-log insert failed: ${String(e)}`);
        }
      }
      if (!suppressed && cdEnabled) state.cooldown.markAlerted(chatKey, env.severity);
      const out = { ...env, suppressed };
      if (alertId !== undefined) out.alertId = alertId;
      respond(true, { reply: serializeEnvelope(out) });
    });

    // Suggest (kernel core action, optional): generate owner reply suggestions
    // and append them to the envelope (consumed by a downstream handoff/relay).
    // A non-match / suppressed envelope is a no-op.
    api.registerGatewayMethod("alertWatcher.suggest", async ({ params, respond }) => {
      const input = typeof params?.input === "string" ? params.input : "";
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      const nodeConfig = (params?.config ?? {}) as Record<string, unknown>;
      const env = parseEnvelope(input);
      if (!isActionable(env)) {
        respond(true, { reply: serializeEnvelope(env) });
        return;
      }
      const model =
        typeof nodeConfig.model === "string" && nodeConfig.model
          ? nodeConfig.model
          : cfg.classifier.model;
      const count = typeof nodeConfig.count === "number" ? nodeConfig.count : 3;
      const maxChars = typeof nodeConfig.maxChars === "number" ? nodeConfig.maxChars : 140;
      try {
        const suggestions = await runSuggestionsDrone(state.droneHost, model, {
          language: cfg.language,
          severity: env.severity,
          category: env.category,
          summary: env.summary,
          senderMessage: env.original,
          systemPrompt: cfg.classifier.systemPrompt ?? "",
          count,
          maxChars,
        });
        const out = suggestions.length > 0 ? { ...env, suggestions } : env;
        respond(true, { reply: serializeEnvelope(out) });
      } catch (err) {
        api.logger.warn(`${PLUGIN_ID}: suggest failed: ${String(err)}`);
        // Best-effort: pass the envelope through unchanged so the flow continues.
        respond(true, { reply: serializeEnvelope(env) });
      }
    });

    // Format + fan out an alert to the configured destinations. `input` is the
    // envelope produced by `alertWatcher.classify` (optionally via gate/suggest).
    // Non-actionable envelopes (no-match / suppressed) are a no-op.
    api.registerGatewayMethod("alertWatcher.sendAlert", async ({ params, respond }) => {
      const input = typeof params?.input === "string" ? params.input : "";
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      // Per-node config from the flow-editor form.
      const nodeConfig = (params?.config ?? {}) as Record<string, unknown>;
      const language: "es" | "en" =
        nodeConfig.language === "en" || nodeConfig.language === "es"
          ? nodeConfig.language
          : cfg.language;
      // Optional "chan:to, chan:to" override; blank → plugin's configured destinations.
      const destinations: Destination[] =
        typeof nodeConfig.destinationsOverride === "string" &&
        nodeConfig.destinationsOverride.trim()
          ? nodeConfig.destinationsOverride
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean)
              .map((entry) => {
                const idx = entry.indexOf(":");
                const rawChannel = idx > 0 ? entry.slice(0, idx).trim() : "whatsapp";
                const to = idx > 0 ? entry.slice(idx + 1).trim() : entry;
                return { channel: normalizeChannelAlias(rawChannel), to };
              })
          : cfg.destinations;
      // Parse the v1 envelope (or legacy classify JSON, or raw text). A
      // non-match or gate-suppressed envelope is a cheap no-op (kernel invariant
      // #4) — so a suppressed/none-class message routed here never fans out.
      const env = parseEnvelope(input);
      if (!isActionable(env)) {
        respond(true, {
          reply: "alert-watcher: not actionable (no-match/suppressed) — no alert sent",
        });
        return;
      }
      const result: ComplaintResult = {
        is_complaint: true,
        severity: env.severity,
        // category is display-only in formatAlert; the classifier (or a config
        // category override) may emit any string, so widen via cast.
        category: env.category as ComplaintResult["category"],
        summary: env.summary,
      };
      const text = formatAlert(
        {
          channel: env.meta?.channel ?? "flow",
          accountId: env.meta?.accountId ?? "default",
          senderId: env.meta?.senderId,
          content: env.original,
        },
        result,
        [],
        language,
      );
      if (destinations.length === 0) {
        respond(true, { reply: `alert-watcher: no destinations configured\n\n${text}` });
        return;
      }
      const delivery = await sendAlerts(api, destinations, text);
      respond(true, {
        reply: `alert-watcher: alert sent to ${delivery.successCount}/${delivery.total} destinations`,
      });
    });

    async function handle(
      event: {
        channel: string;
        accountId: string;
        chatId: string;
        senderId?: string;
        senderUsername?: string;
        content: string;
        messageId?: string;
      },
      agentId: string | undefined,
    ): Promise<void> {
      const db = state.db;
      if (!db) return;
      const { dedup, cooldown, droneHost } = state;
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      // Dedup: primary path uses messageId. C3 fix: when messageId is missing
      // (some channel/event shapes drop it), fall back to a content-hash key
      // so the dual-listener registration on message_inbound + message_received
      // can't triple-process the same event.
      if (event.messageId !== undefined) {
        if (dedup.markSeen(event.messageId)) return;
      } else {
        if (
          dedup.markSeenFallback({
            channel: event.channel,
            accountId: event.accountId,
            chatId: event.chatId,
            sender: event.senderId ?? "",
            content: event.content,
          })
        ) {
          return;
        }
      }

      // H3 fix: include sender in cooldown key so one customer's complaint in
      // a group chat doesn't suppress alerts from other customers in the same
      // group. DM chats degenerate to chat+sender = chat (sender unique anyway).
      const senderKey = event.senderId ?? "unknown";
      const chatKey = `${event.channel}:${event.accountId}:${event.chatId}:${senderKey}`;
      cooldown.recordMessage(chatKey);

      // Triviality filter — skip empty, whitespace-only, or very short noise
      // messages BEFORE the LLM sees them. Prevents the classifier from
      // re-classifying stale history when a customer pings "s" or "k".
      const trimmed = event.content.trim();
      const alnumChars = trimmed.replace(/[^a-zA-Z0-9À-ɏḀ-ỿ]/g, "");
      if (alnumChars.length < 3) {
        return;
      }

      const ledger = api.runtime.messageLedger?.getDb?.();
      const priorContext = ledger
        ? fetchContext(
            ledger,
            event.channel,
            event.accountId,
            event.chatId,
            cfg.classifier.contextWindow,
          )
        : [];
      // The classifier classifies the LAST history entry as the trigger. The
      // message ledger can lag or stop recording, so its last row is NOT
      // guaranteed to be THIS message — trusting it caused false positives where
      // a benign message (e.g. a thank-you) was classified using a stale prior
      // complaint still sitting at the tail of the ledger. Always make the
      // trigger the ACTUAL incoming message; prior rows remain as display context
      // only. Avoid duplicating when the ledger already recorded this message.
      const triggerEntry = { role: "user" as const, content: event.content, ts: Date.now() };
      const history =
        priorContext.length > 0 && priorContext[priorContext.length - 1]?.content === event.content
          ? priorContext
          : [...priorContext, triggerEntry];

      // Use the plugin-owned drone host (created once at register-time).
      // Wrap the classify call in a hard timeout so it can never orphan.
      const ac = new AbortController();
      const timeoutHandle = setTimeout(() => ac.abort(), CLASSIFIER_HARD_TIMEOUT_MS);
      let result: ComplaintResult;
      try {
        result = await Promise.race<ComplaintResult>([
          classifyMessage(history, droneHost, cfg.classifier.model, ac.signal, cfg.language, {
            systemPrompt: cfg.classifier.systemPrompt,
            severityRubric: cfg.classifier.severityRubric,
            categories: cfg.classifier.categories,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`classifier hard-timeout ${CLASSIFIER_HARD_TIMEOUT_MS}ms`)),
              CLASSIFIER_HARD_TIMEOUT_MS,
            ),
          ),
        ]);
      } catch (err) {
        api.logger.error(`${PLUGIN_ID}: classifier error: ${String(err)}`);
        return;
      } finally {
        clearTimeout(timeoutHandle);
      }
      api.logger.info(
        `${PLUGIN_ID}: classified is_complaint=${result.is_complaint} severity=${result.severity} category=${result.category}`,
      );
      if (!result.is_complaint) return;
      if (SEVERITY_ORDER[result.severity] < SEVERITY_ORDER[cfg.classifier.minSeverity]) {
        api.logger.info(
          `${PLUGIN_ID}: skipped — severity ${result.severity} below minSeverity ${cfg.classifier.minSeverity}`,
        );
        return;
      }

      // Cooldown check moved AFTER classify so we know the severity. Higher
      // severity than last alert bypasses cooldown (escalation).
      if (cooldown.shouldSuppress(chatKey, cfg.cooldown, result.severity)) {
        api.logger.info(
          `${PLUGIN_ID}: cooldown active for ${chatKey} (severity=${result.severity}) — suppressed`,
        );
        return;
      }

      let rowId = -1;
      try {
        rowId = insertComplaint(db, {
          agentId: agentId ?? null,
          channelId: event.channel,
          chatId: event.chatId,
          fromSender: event.senderId ?? "unknown",
          content: event.content,
          result,
        });
      } catch (err) {
        api.logger.error(`${PLUGIN_ID}: store error: ${String(err)}`);
      }
      // M9 fix: if insertComplaint failed, bail BEFORE sending alerts so we
      // don't push a complaint into destinations that's invisible in the DB
      // (reply flow can't fire either — pending requires rowId > 0).
      if (rowId <= 0) {
        api.logger.warn(`${PLUGIN_ID}: skipping alert delivery — no DB row`);
        return;
      }

      let suggestions: string[] = [];
      if (cfg.replyFlow.enabled && cfg.replyFlow.suggestions.enabled) {
        suggestions = await runSuggestionsDrone(droneHost, cfg.classifier.model, {
          language: cfg.language,
          severity: result.severity,
          category: result.category,
          summary: result.summary,
          senderMessage: event.content,
          systemPrompt: cfg.classifier.systemPrompt ?? "",
          count: cfg.replyFlow.suggestions.count,
          maxChars: cfg.replyFlow.suggestions.maxChars,
        });
      }

      const baseText = formatAlert(event, result, history, cfg.language);
      const text = cfg.replyFlow.enabled
        ? appendSuggestionsBlock(baseText, suggestions, cfg.language)
        : baseText;

      const delivery = await sendAlerts(api, cfg.destinations, text);

      // H2 fix: previously hardcoded to whatsapp destinations only. Now we
      // include every destination's address so a Telegram/Discord-only deploy
      // can also claim via the reply flow. Destination string is just `to`;
      // matching the responder happens by exact-string match on incoming
      // sender in handleOwnerReply, which is channel-agnostic.
      if (cfg.replyFlow.enabled && delivery.successCount > 0) {
        const dests = cfg.destinations.map((d) => d.to).filter((s) => s.length > 0);
        if (dests.length > 0) {
          insertPending(db, {
            alertId: rowId,
            originChannel: event.channel,
            originAccountId: event.accountId,
            originChatId: event.chatId,
            destinations: dests,
            suggestions,
            language: cfg.language,
            expiresAt: Date.now() + cfg.replyFlow.windowMs,
          });
        }
      }

      // M6 fix: only mark notified when ALL destinations succeeded. Partial
      // success used to lock the complaint as "done", leaving 1+ destinations
      // permanently un-delivered. Now boot catch-up will retry partial
      // failures — paired with C2 attempt cap below to bound the retry loop.
      const fullSuccess = delivery.successCount === delivery.total && delivery.total > 0;
      if (fullSuccess) {
        cooldown.markAlerted(chatKey, result.severity);
        markNotified(db, rowId);
      } else if (delivery.successCount > 0) {
        // Partial — mark cooldown so we don't spam alerts on every subsequent
        // message, but leave notified_at NULL so boot catch-up retries the
        // alert (capped attempts handled at boot).
        cooldown.markAlerted(chatKey, result.severity);
      }

      api.logger.info(
        `${PLUGIN_ID}: complaint logged (id=${rowId}, severity=${result.severity}, alerts_delivered=${delivery.successCount}/${delivery.total})`,
      );
    }

    api.on("message_inbound", async (event) => {
      // Diagnostic 2026-05-22: log every inbound to detect routing issues
      // between the gateway's channel layer and the plugin event bus.
      api.logger.info(
        `${PLUGIN_ID}: inbound ${event.channel}:${event.accountId} from ${event.senderId ?? "?"} content="${(event.content ?? "").slice(0, 60).replace(/\s+/g, " ")}"`,
      );
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      if (!matchesChannelSub(cfg.subscriptions, event)) {
        api.logger.info(`${PLUGIN_ID}: skipped — no matching subscription`);
        return;
      }
      await handle(event, undefined);
    });

    // Owner "claim" replies arrive on the WhatsApp (destination) channel. We use
    // message_intercept (not message_inbound) so that when we actually consume a
    // claim, we can return { handled: true } and the gateway suppresses the
    // conversational agent's auto-reply to the owner. A normal owner message
    // (no open pending) returns "ignored" → not handled → the agent replies as
    // usual. The findOpenPendingForSender lookup inside handleOwnerReply is a
    // fast indexed query, so this stays cheap on the inbound hot path.
    api.on("message_intercept", async (event) => {
      if (event.channel !== "whatsapp") return;
      const db = state.db;
      if (!db) return;
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      if (!cfg.replyFlow.enabled) return;
      const result = await handleOwnerReply(db, api, cfg.replyFlow, {
        sender: event.senderId ?? "",
        message: event.content,
      });
      if (result.status === "forwarded" || result.status === "forward_failed") {
        return { handled: true };
      }
      return;
    });

    api.on("message_received", async (event, ctx) => {
      const cfg = resolveConfig(api.pluginConfig as Record<string, unknown>);
      if (!matchesAgentSub(cfg.subscriptions, ctx.agentId)) return;
      await handle(
        {
          channel: ctx.channelId,
          accountId: (ctx as { accountId?: string }).accountId ?? "default",
          chatId: (ctx as { chatId?: string }).chatId ?? "unknown",
          senderId: event.from,
          content: event.content,
          messageId: (event as { messageId?: string }).messageId,
        },
        ctx.agentId,
      );
    });
  },
};
