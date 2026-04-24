---
"@minion-stack/shared": minor
---

Add `prompt.sections.*` protocol types (Phase 20). Extracted from
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
