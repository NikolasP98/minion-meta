import { defineDrone, runDrone } from "@minion-stack/drone";
import type { DroneHost } from "@minion-stack/drone";
import type { TSchema } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import type { ComplaintHistoryEntry, ComplaintResult } from "./types.js";

const DEFAULT_CATEGORIES = ["product_defect", "billing", "delivery", "service", "other"] as const;

function buildSchema(categories: readonly string[]): TSchema {
  return Type.Object({
    is_complaint: Type.Boolean(),
    severity: Type.Union([Type.Literal("low"), Type.Literal("med"), Type.Literal("high")]),
    category: Type.Union(categories.map((c) => Type.Literal(c))),
    summary: Type.String(),
  });
}

export const DEFAULT_SYSTEM_PROMPT = `You are a customer-complaint classifier.

You will receive a single MESSAGE from a customer. Decide:
- is_complaint: does this single message express a customer complaint or grievance?
- severity: low / med / high (only meaningful when is_complaint=true)
- category: one of the configured categories
- summary: if and only if is_complaint=true, a one-sentence summary of the complaint. Otherwise an empty string.

Hard rules:
- Greetings, questions about hours/prices, requests for information, agreement words, single characters, typos, generic chitchat → is_complaint=false.
- The summary describes only what THIS message says. Do not invent prior history.
- Call the result tool exactly once.`;

const LANGUAGE_HINT: Record<"es" | "en", string> = {
  es: 'Write the "summary" field in Spanish (one short sentence summarizing the complaint).',
  en: 'Write the "summary" field in English (one short sentence summarizing the complaint).',
};

export interface ClassifierOverrides {
  systemPrompt?: string;
  severityRubric?: { low?: string; med?: string; high?: string };
  categories?: string[];
}

function composeSystemPrompt(
  language: "es" | "en",
  overrides: ClassifierOverrides | undefined,
): string {
  const base =
    overrides?.systemPrompt && overrides.systemPrompt.trim().length > 0
      ? overrides.systemPrompt.trim()
      : DEFAULT_SYSTEM_PROMPT;
  const r = overrides?.severityRubric;
  const rubricLines: string[] = [];
  if (r?.low && r.low.trim()) rubricLines.push(`- low: ${r.low.trim()}`);
  if (r?.med && r.med.trim()) rubricLines.push(`- med: ${r.med.trim()}`);
  if (r?.high && r.high.trim()) rubricLines.push(`- high: ${r.high.trim()}`);
  const rubricBlock =
    rubricLines.length > 0 ? `\n\nSeverity rubric (user-defined):\n${rubricLines.join("\n")}` : "";
  return `${base}${rubricBlock}\n${LANGUAGE_HINT[language]}`;
}

function renderPrompt(trigger: ComplaintHistoryEntry): string {
  // Context-bleed fix 2026-05-22: previous renderPrompt included prior context
  // messages "for background", but the LLM consistently let them influence
  // classification despite explicit instructions. Now we pass ONLY the trigger
  // to the classifier. Summaries describe the trigger alone — no enrichment
  // from history. If context-aware summaries are desired later, that should
  // be a separate post-classify enrichment call.
  return `Message to classify:\n"${trigger.content}"`;
}

/**
 * Build a classifier drone for a given model + override set. Drone is rebuilt
 * per-call because system prompt, schema (category enum), and rubric are all
 * user-configurable at runtime — model selection alone is not enough to key it.
 */
function buildClassifierDrone(
  model: string,
  language: "es" | "en",
  overrides: ClassifierOverrides | undefined,
) {
  const categories =
    overrides?.categories && overrides.categories.length > 0
      ? overrides.categories
      : (DEFAULT_CATEGORIES as readonly string[]);
  const schema = buildSchema(categories);
  return defineDrone({
    id: "alert-classifier",
    description:
      "Classifies whether the latest message in a conversation is an alert-worthy event.",
    systemPrompt: composeSystemPrompt(language, overrides),
    model: { provider: "anthropic", model },
    output: schema,
    timeoutMs: 15_000,
  });
}

export async function classifyMessage(
  history: ComplaintHistoryEntry[],
  host: DroneHost,
  model: string,
  signal?: AbortSignal,
  language: "es" | "en" = "es",
  overrides?: ClassifierOverrides,
): Promise<ComplaintResult> {
  if (history.length === 0) {
    throw new Error("alert classifier: history is empty — trigger message required");
  }
  const trigger = history[history.length - 1];
  const drone = buildClassifierDrone(model, language, overrides);
  const result = await runDrone(
    drone,
    {
      prompt: renderPrompt(trigger),
      abortSignal: signal,
      maxTokens: 256,
    },
    host,
  );
  if (!result.ok) {
    throw new Error(`alert classifier failed: ${result.error.code} ${result.error.message}`);
  }
  const data = result.data as unknown as Record<string, unknown>;
  return {
    is_complaint: Boolean(data.is_complaint),
    severity: data.severity as ComplaintResult["severity"],
    category: data.category as ComplaintResult["category"],
    summary: String(data.summary),
  };
}
