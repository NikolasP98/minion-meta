/**
 * Prompt Sections protocol types.
 *
 * Source of truth for `prompt.sections.*` WS gateway RPC request/response shapes.
 * Consumed by the minion gateway server handlers and by `minion_hub` / `minion_site`
 * UI that drives the prompt engineering surface.
 *
 * Pure protocol types only — runtime validation (Zod) stays in `minion/` where the
 * gateway handlers live. Keep this file import-free so both Node and browser bundles
 * can consume it without pulling in server-only dependencies.
 *
 * Extracted from `minion/src/agents/sections/custom/types.ts` +
 * `minion/src/gateway/server-methods/prompt-sections.ts` in Phase 20-01.
 */

/** Assembly layer a section belongs to. Determines ordering + caching strategy. */
export type SectionLayer =
  | "platform"
  | "agent-type"
  | "identity"
  | "user"
  | "session";

/** Prompt assembly mode. Sections declare which modes include them. */
export type PromptMode = "full" | "minimal" | "none";

/** Whether a section is code-defined (`builtin`) or operator-authored YAML (`custom`). */
export type SectionSource = "builtin" | "custom";

/**
 * Input shape for `prompt.sections.upsert` and the custom-section YAML schema.
 * `enabled` is optional on input (defaults to `true` server-side) so pre-0.5.0
 * YAML files that omit the field continue to load unchanged.
 */
export interface SectionInput {
  id: string;
  layer: SectionLayer;
  order: number;
  modes: PromptMode[];
  cacheable: boolean;
  /** Introduced in @minion-stack/shared 0.5.0. Defaults to `true` when omitted. */
  enabled?: boolean;
  /** YAML body / rendered template string. */
  render: string;
}

/**
 * Metadata for `prompt.sections.list` rows. Lacks the rendered body — callers
 * fetch that separately with `prompt.sections.get` to keep list responses small.
 */
export interface SectionMeta {
  id: string;
  layer: SectionLayer;
  order: number;
  modes: PromptMode[];
  cacheable: boolean;
  /** Introduced in @minion-stack/shared 0.5.0. Always present on responses. */
  enabled: boolean;
  source: SectionSource;
  agentId?: string;
}

/** Full section shape for `prompt.sections.get`. Adds the rendered body. */
export interface SectionFull extends SectionMeta {
  render: string;
}

/** Per-section entry in the preview breakdown. */
export interface SectionBreakdown {
  id: string;
  layer: SectionLayer;
  order: number;
  bytes: number;
  tokens: number;
  cacheable: boolean;
  source: SectionSource;
  rendered: string;
}

/** A single violation raised by the content safety scanner during upsert/preview. */
export interface SectionViolation {
  rule: string;
  match?: string;
  severity: "block" | "warn";
}

/** Structured payload attached to `SECTION_VALIDATION_FAILED` errors. */
export interface SectionValidationErrorPayload {
  code: "SECTION_VALIDATION_FAILED";
  message: string;
  violations: SectionViolation[];
}

/** Response shape for `prompt.sections.preview`. */
export interface PreviewResponse {
  assembled: string;
  breakdown: SectionBreakdown[];
  totalBytes: number;
  totalTokens: number;
  tokenizer: string;
}

/** Request params for `prompt.sections.list`. */
export interface ListParams {
  agentId: string;
}

/** Request params for `prompt.sections.get`. */
export interface GetParams {
  agentId: string;
  sectionId: string;
}

/** Request params for `prompt.sections.upsert`. */
export interface UpsertParams {
  agentId: string;
  section: SectionInput;
}

/** Request params for `prompt.sections.delete`. */
export interface DeleteParams {
  agentId: string;
  sectionId: string;
}

/**
 * Request params for `prompt.sections.preview`.
 *
 * Extended in @minion-stack/shared 0.5.0 with `draftOverride`. When present,
 * the server substitutes the given body for the section whose id matches
 * during in-memory assembly (on-disk YAML is NEVER modified). Use this to
 * drive live preview of unsaved editor state in the hub.
 *
 * If `draftOverride.id` doesn't match any visible section (e.g. the operator
 * just toggled it off), the server ignores it silently.
 */
export interface PreviewParams {
  agentId: string;
  mode: PromptMode;
  draftOverride?: {
    id: string;
    body: string;
  };
}

/** Request params for `prompt.sections.overrides.get`. New in 0.5.0. */
export interface OverridesGetParams {
  agentId: string;
}

/** Response shape for `prompt.sections.overrides.get`. New in 0.5.0. */
export interface OverridesGetResponse {
  disabled: string[];
}

/**
 * Request params for `prompt.sections.overrides.set`. New in 0.5.0.
 * `disabled` is the complete replacement list (not a delta). Admin-only.
 * Server caps list length at 256 entries (T-20-04).
 */
export interface OverridesSetParams {
  agentId: string;
  disabled: string[];
}

/** Response shape for `prompt.sections.overrides.set`. New in 0.5.0. */
export interface OverridesSetResponse {
  disabled: string[];
}
