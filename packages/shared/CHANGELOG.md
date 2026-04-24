# @minion-stack/shared

## 0.5.0

### Minor Changes

- 33f548a: Add `prompt.sections.*` protocol types (Phase 20). Extracted from
  `minion/src/agents/sections/custom/types.ts` and the gateway server handlers
  so the minion gateway, `minion_hub`, and `minion_site` all import from a
  single source of truth.

  New exports:
  - `SectionLayer`, `PromptMode`, `SectionSource`
  - `SectionInput`, `SectionMeta`, `SectionFull`, `SectionBreakdown`
  - `SectionViolation`, `SectionValidationErrorPayload`
  - `PreviewResponse`, `PreviewParams`
  - `ListParams`, `GetParams`, `UpsertParams`, `DeleteParams`
  - `OverridesGetParams`, `OverridesGetResponse`
  - `OverridesSetParams`, `OverridesSetResponse`

  Schema changes:
  - `SectionInput.enabled?: boolean` (defaults to `true` server-side) so
    operators can toggle custom sections per-agent.
  - `SectionMeta.enabled: boolean` always present on list/get responses.
  - `PreviewParams.draftOverride?: { id: string; body: string }` lets the hub
    drive live preview from unsaved editor state. Server substitutes the
    given body in-memory during assembly; on-disk YAML is never modified.

  Pure protocol types — no Zod / runtime validation here; those stay in
  `minion/` alongside the gateway handlers (Phase 19 separation preserved).

## 0.4.0

### Minor Changes

- 1b961fb: Upgrade `extractText` in `@minion-stack/shared/utils` to handle `tool_use`, `tool_result`, and `image` content blocks — backported from minion_hub's local copy.

  Previously `extractText` only extracted plain text parts. Now:
  - `tool_use` blocks render as `[Tool: <name>]`
  - `tool_result` blocks unwrap their `content` (string or nested text-block array)
  - `image` / `image_url` blocks render as `[Image]`
  - Mixed content (text + tool_use) preserves order and joins with newlines

  This lets minion_site and other consumers get richer chat display without duplicating the logic locally. Existing simple-text callers see no behavior change.

  Tests ported from minion_hub (22 cases covering tool blocks, images, metadata stripping, and role-specific cleaning).

- 2dfb9f2: Add runtime-agnostic GatewayClient class, Node subpath export @minion-stack/shared/node, and PROTOCOL_VERSION = 3 constant. Phase 7 WS-02.

## 0.2.0

### Minor Changes

- b7aa4fd: Initial release of `@minion-stack/shared` — gateway protocol types and utilities migrated from `minion-shared`.

  Exports:
  - Root (`.`): all gateway types + utils re-exported
  - `./gateway`: `RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame`, `PendingRequest`, `sendRequest`, `handleResponseFrame`, `flushPending`, connection utilities
  - `./utils`: `uuid`, `parseAgentSessionKey`, `extractText`, `cleanText`, `parseGatewayMetadata`, `extractMessageTimestamp`
