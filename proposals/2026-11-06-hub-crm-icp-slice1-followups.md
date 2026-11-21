---
id: 2026-11-06-hub-crm-icp-slice1-followups
title: CRM ICP score — Slice 1 council follow-ups (lease keys, reserved meta keys, result id uniqueness)
status: proposed
created: 2026-11-06
updated: 2026-11-06
repos: [minion_hub]
tags: [logic, data, privacy, test]
value: 6
effort: M
source: node-loop MIN-34 council (rounds 1–2)
---

# CRM ICP score: Slice 1 council follow-ups

The Node Loop for spec `2026-08-03-crm-icp-score-spec` Slice 1 (minion_hub branch `node-loop/MIN-34`) shipped with these verified non-blockers. Each one predates the branch or only matters once a later slice writes `_icp`/`_icpClaim`.

## Items

1. **Brain business corpus indexes lease keys** (Slice 4). `brain-business-corpus.service.ts` (around `:1402-1416`) indexes `custom_fields` verbatim. `SENSITIVE_KEY` doesn't match `_icpClaim`/`_relationshipClaim`. Done when both keys (ideally every `_`-reserved key) are excluded and a test proves it.
2. **Contact merge backfills the loser's reserved keys** (Slice 4). `crm-cleanup.service.ts` step 5 (around `:478-491`) uses `jsonb_each` with no key filter, so the survivor inherits the loser's `_icp`/`_icpClaim`. Done when lease keys are never inherited, `_icp` is dropped or re-scored on merge, and a test proves it.
3. **`normalizeIcpDefinition` warns on every read** (Slice 4). Done when a malformed stored definition warns once per org/version and not on every tick read.
4. **No native multi-connection test for `saveIcpDefinition`**. PGlite covers the single-statement logic, and a `TODO(handoff)` sits in the code. Done when a native-Postgres test runs two concurrent saves and ends with distinct, monotonically increasing versions.
5. **`getMetaKeys` lists `_`-reserved keys as roster columns** (before Slice 3/5). `crm-contacts.service.ts:1342-1359` filters only the lease keys. `_icp`, `_funnel` and `_relationship` still become `meta:` columns in `/crm/customers` (`PageBody.svelte:552`), contradicting the `crm-meta.ts:96-100` invariant. Done when every `isReservedMetaKey` key is dropped and `crm-contacts.service.test.ts` expects `['dni']`.
6. **`icpResultSchema.criteria` allows duplicate ids** (Slice 3). `crm-icp.ts:92-111` doesn't check uniqueness, though the definition schema does. Done when it has the same `.refine` as the definition and a test covers it.

## Notes

- `saveIcpDefinition` raises if `crm_settings.value` is a non-object (scalar/array). That affects only already-corrupt rows; consider guarding with `jsonb_typeof`.
- `src/lib/pii.ts` now imports `crm-icp.ts` (zod), so zod lands in every client chunk that imports `maskPii`. This is bundle size only.

## Out of scope

The ICP tick, scorer and UI (Slices 2–6).
