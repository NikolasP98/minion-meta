# Independent review — I05 outcomes, autosave hosts, CAS endpoints (T024)

Reviewer: independent code-review agent (read-only; source as of 2026-10-16 ~15:55 America/Lima, after the handover fixes for the config busy flag and the home-settings Review fence). Scope files: the outcomes worker list in `audits/2026-10-16-design-system-durability-handover/evidence/design-handover-outcomes.md`. The reviewer had no shell, so no diff stats or test runs are part of this review; the coordinator ran the affected tests after each disposition below.

## Verdict

PASS WITH FINDINGS → all findings dispositioned (see below). One HIGH defect was confirmed by the coordinator against source and fixed with a mounted regression test.

## Findings and dispositions

| # | Severity | Where | Scenario | Disposition |
|---|---|---|---|---|
| 1 | HIGH | `AvailabilityEditor.svelte`, `BookingDetailDrawer.svelte`, `PeopleView.svelte`, `pos/settings/+page.svelte` | `createAutosave.set()` runs `prepare` at edit time and the closure froze `expectedUpdatedAt`. An edit queued behind an in-flight save dispatched with the superseded token once the first save moved it, so the user's own sequential edits 409'd and the second edit was marked attempted and never sent. No test covered a second edit after a successful first write. | **Fixed.** All four hosts now read the token inside the dispatched closure (comment at each site). Regression: `AvailabilityEditor.durability.mounted.test.ts` "sends a queued edit with the token the in-flight save produced" — two toggles while the first PUT is pending; invalidate re-renders with the new token; second body carries the new token and both rules. |
| 2 | MEDIUM | `config.svelte.ts` `loadConfig` | `loading` stayed `true` when the read owner retired before the response (early `return` + `finally` guarded by `current()`). Same class as the fixed `saving` flag. | **Fixed.** `loadSequence` operation token; `finally` clears only its own flag. Regression: `config-durability.svelte.test.ts` "clears the loading flag when a read owner retires before its response". |
| 3 | LOW–MED | `stock/items/[id]/+page.svelte` | `busy` was not reset when the page was reused for another item after a retired save. | **Fixed.** `startEdit()` resets `busy`. |
| 4 | LOW | `onReview` handlers that only invalidate | The indicator keeps unknown/conflict after a read repair; local drafts remain visibly unsaved. Display-only; the next edit uses the refreshed token. | **Accepted as designed** per spec I05: a successful read cannot mark an uncertain write successful; the indicator must keep the state until the user re-edits. |
| 5 | NOTE | `pos.service.ts:2768`, `event-types/+server.ts:82` | Internal no-CAS writers lack a comment naming the bypass. | **Documented** in `evidence/autosave-callers.md` (authoritative internal callers retain non-CAS behavior); no source comment added to avoid touching unrelated POS code. |

## Claims verified against source by the reviewer

- Only `outcome === 'error'` (confirmed 4xx rejection) re-runs a write; `committed-refreshing` recovery calls only the read `repair`; unknown/conflict/5xx have no write recovery.
- Queued successors are retired after an uncertain predecessor; a failed autosave marks the pending draft attempted so blur/unmount cannot replay it.
- Late completions after an owner change cannot paint `saved` (needs `current()` and matching revision).
- CAS endpoints: `expectedUpdatedAt` required as ISO datetime (zod), stale → 409 with current row, missing/foreign → 404, event-type token from `UPDATE … RETURNING`, stale write throws inside the transaction so resource links are untouched; archive/catalog-sync writers advance the same token via `nextWriteTimestamp`.
- Dirty guard: `JoinLinkForm` rebaselines after a successful create; `Dialog` forgets `touched` when `dirty` goes true→false.
- No `as any`/`@ts-ignore`/`ts-nocheck` in the opened files; all nine sampled new i18n keys exist in both `en.json` and `es.json`; `ErrorSummary` uses only existing tokens.
- Handover concerns #3 (config busy flag) and #4 (Review fence) confirmed fixed.

## Not verified by the reviewer

- Diffs against base (no shell): no statement about removed/weakened assertions beyond the files read.
- `reminders`, `SellableWizard`, dirty-inventory files, the SQL integration test, server tests, meta `FormField` beyond a token grep, `runCompoundMutation` 409 classification in `EventTypeEditor`.
- `nextWriteTimestamp`/`staleGuard` assumes the existing UTC database session timezone.

## Coordinator follow-up receipts

- Focused tests after fixes: `AvailabilityEditor.durability.mounted.test.ts`, `config-durability.svelte.test.ts`, `ui-button-artifact.test.ts`, `booking-custom-fields.mounted.test.ts` → 37/37; `config-durability` rerun 4/4.
- The broader outcomes suite rerun is recorded in `verification.md`.
