/**
 * AI auto-labeling for the Gmail pull watcher.
 *
 * As Pub/Sub notifications deliver new messages, each one is classified by a
 * schema-output drone (same primitive as the personal-agent email summaries —
 * works on OpenRouter-only deployments) into ONE of the configured labels,
 * and that Gmail label is applied via `gws gmail users messages modify`.
 *
 * Labels are resolved name → id via `users labels list` and created on first
 * use (`users labels create`), cached per credentials file. Applying a label
 * is idempotent (addLabelIds), so a redelivered notification re-labels
 * harmlessly.
 *
 * Everything here is best-effort: a classify or gws failure logs and skips
 * the message — it never blocks the watcher's history baseline from
 * advancing. Requires the watched account's token to hold gmail.modify scope
 * (a 403 here means the account must be re-linked with the current scopes).
 */

import { defineDrone, runDrone } from "@minion-stack/drone";
import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { createGatewayDroneHost } from "../drones/host.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { recordEmailLedger } from "./email-ledger-sink.js";
import { type GmailHookMessage, runGwsGmail } from "./gmail-gws.js";
import type { GmailAutoLabelRule } from "./gmail.js";

const log = createSubsystemLogger("gmail-auto-label");

// ── Classifier drone ──────────────────────────────────────────────────────────

const ClassifySchema = Type.Object({
  label: Type.String({
    description:
      'Exactly one of the allowed label names (verbatim), or "none" when no label clearly applies.',
  }),
  summary: Type.String({
    description:
      "A neutral one-sentence summary of what the email is about (max ~140 chars). Factual, " +
      "no greetings or fluff. This is stored in a ledger — keep it minimal and non-sensitive.",
  }),
});

const classifyDrone = defineDrone<Static<typeof ClassifySchema>>({
  id: "gmail-auto-label",
  description: "Classifies an incoming email into one configured Gmail label and summarises it.",
  systemPrompt:
    "You triage incoming email for a small-business inbox. Given the allowed labels with " +
    "their meanings and one email, return (1) exactly one label name — the best fit — " +
    'or "none" when no label clearly applies (never invent labels not in the list), and ' +
    "(2) a neutral one-sentence summary of the email.",
  model: { provider: "anthropic", model: "claude-haiku-4-5" },
  output: ClassifySchema,
  timeoutMs: 15_000,
});

/** One classification result: the chosen label answer and a one-line summary. */
export type Classification = Static<typeof ClassifySchema>;

/** Cap what we feed the classifier — triage metadata + a body slice is plenty. */
const BODY_CHARS_FOR_CLASSIFY = 2000;

/** Build the classify prompt for one message. Exported for tests. */
export function buildClassifyPrompt(
  msg: Pick<GmailHookMessage, "from" | "subject" | "snippet" | "body">,
  labels: GmailAutoLabelRule[],
): string {
  const lines = [
    "Allowed labels:",
    ...labels.map((l) => `- ${l.name}${l.description ? `: ${l.description}` : ""}`),
    "",
    `From: ${msg.from}`,
    `Subject: ${msg.subject}`,
  ];
  const preview = (msg.body || msg.snippet || "").slice(0, BODY_CHARS_FOR_CLASSIFY).trim();
  if (preview) {
    lines.push("", preview);
  }
  return lines.join("\n");
}

/**
 * Match the drone's answer against the configured rules. Case-insensitive;
 * returns the canonical configured name, or null for "none"/unknown answers.
 * Exported for tests.
 */
export function matchLabel(raw: string, labels: GmailAutoLabelRule[]): string | null {
  const answer = raw.trim().toLowerCase();
  if (!answer || answer === "none") {
    return null;
  }
  return labels.find((l) => l.name.trim().toLowerCase() === answer)?.name ?? null;
}

// ── Gmail label id resolution (per credentials file, cached) ─────────────────

type LabelIdCache = Map<string, string>; // lower-cased label name → label id
const labelCaches = new Map<string, LabelIdCache>(); // credentialsFile → cache

type LabelsListResponse = { labels?: Array<{ id?: string; name?: string }> };

async function loadLabelCache(credentialsFile: string): Promise<LabelIdCache | null> {
  const res = await runGwsGmail(
    ["gmail", "users", "labels", "list", "--params", JSON.stringify({ userId: "me" })],
    { credentialsFile, timeoutMs: 30_000 },
  );
  if (!res.ok) {
    log.warn(`labels.list failed: ${res.error}`);
    return null;
  }
  const cache: LabelIdCache = new Map();
  for (const label of (res.data as LabelsListResponse).labels ?? []) {
    if (label.id && label.name) {
      cache.set(label.name.trim().toLowerCase(), label.id);
    }
  }
  return cache;
}

async function createLabel(credentialsFile: string, name: string): Promise<string | null> {
  // gws convention: path params via --params, request body via --json
  // (matches registerWatch in gmail-gws.ts; nesting a requestBody in
  // --params returns 400 invalidArgument).
  const res = await runGwsGmail(
    [
      "gmail",
      "users",
      "labels",
      "create",
      "--params",
      JSON.stringify({ userId: "me" }),
      "--json",
      JSON.stringify({
        name,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    ],
    { credentialsFile, timeoutMs: 30_000 },
  );
  if (!res.ok) {
    log.warn(`labels.create "${name}" failed: ${res.error}`);
    return null;
  }
  const id = (res.data as { id?: string }).id;
  return id ?? null;
}

/** Resolve a label name to its Gmail id, creating the label on first use. */
async function ensureLabelId(credentialsFile: string, name: string): Promise<string | null> {
  let cache = labelCaches.get(credentialsFile);
  if (!cache) {
    const loaded = await loadLabelCache(credentialsFile);
    if (!loaded) {
      return null;
    }
    cache = loaded;
    labelCaches.set(credentialsFile, cache);
  }
  const key = name.trim().toLowerCase();
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const created = await createLabel(credentialsFile, name);
  if (created) {
    cache.set(key, created);
  }
  return created;
}

async function applyLabel(
  credentialsFile: string,
  messageId: string,
  labelId: string,
): Promise<boolean> {
  const res = await runGwsGmail(
    [
      "gmail",
      "users",
      "messages",
      "modify",
      "--params",
      JSON.stringify({ userId: "me", id: messageId }),
      "--json",
      JSON.stringify({ addLabelIds: [labelId] }),
    ],
    { credentialsFile, timeoutMs: 30_000 },
  );
  if (!res.ok) {
    log.warn(`messages.modify ${messageId} failed: ${res.error}`);
    return false;
  }
  return true;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export type ClassifyFn = (prompt: string) => Promise<Classification | null>;

async function classifyWithDrone(prompt: string): Promise<Classification | null> {
  const result = await runDrone(classifyDrone, { prompt }, createGatewayDroneHost());
  if (!result.ok) {
    log.debug(`classify drone failed: ${result.error.code} ${result.error.message}`);
    return null;
  }
  return result.data;
}

/**
 * Classify + label a batch of freshly delivered messages, then record each to
 * the hub email ledger (summary + tags + metadata, never the body). Never
 * throws; per-message failures are logged and skipped. `classify` is
 * injectable for tests and defaults to the Haiku drone.
 */
export async function autoLabelMessages(opts: {
  /** Watched mailbox address — attributes the ledger row to its owner. */
  account: string;
  credentialsFile: string;
  labels: GmailAutoLabelRule[];
  messages: GmailHookMessage[];
  classify?: ClassifyFn;
}): Promise<void> {
  const classify = opts.classify ?? classifyWithDrone;
  for (const msg of opts.messages) {
    try {
      const result = await classify(buildClassifyPrompt(msg, opts.labels));
      if (result === null) {
        continue;
      }
      const name = matchLabel(result.label, opts.labels);
      if (name) {
        const labelId = await ensureLabelId(opts.credentialsFile, name);
        if (labelId && (await applyLabel(opts.credentialsFile, msg.id, labelId))) {
          log.info(`labeled ${msg.id} as "${name}"`);
        }
      } else {
        log.debug(`no label for ${msg.id} (classifier said "${result.label}")`);
      }
      // Ledger the processed email regardless of whether a label matched.
      await recordEmailLedger({
        account: opts.account,
        message: msg,
        labels: name ? [name] : [],
        summary: result.summary,
      });
    } catch (err) {
      log.warn(`auto-label failed for ${msg.id}: ${String(err)}`);
    }
  }
}

/** Test-only: wipe the per-credentials label-id caches. */
export function _clearLabelCaches(): void {
  labelCaches.clear();
}
