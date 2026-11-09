# Implementation Plan: Zero-quantity consumption is saved, asked for, and never booked

**Spec**: `specs/033-consumption-zero-qty-confirm/spec.md` | **Repo**: minion_hub (`fix/consumption-zero-qty-s1|s2|s3` → `master`, draft PRs; **owner merges — data tag**) | Anchors @ `c4ded7f7`

## Constitution check
- I Spec before code: this document precedes every hub commit. ✔
- II Evidence: every AS-IS line carries a file:line at `origin/master@c4ded7f7` or a prod query. ✔
- III Slices: three PRs from isolated worktrees (`~/.cache/claude-tmp/hub-033-sN`, real `bun install --frozen-lockfile` — symlinked node_modules hangs Vite and breaks `lint:tokens`). Gates in the foreground with `timeout`, exit codes captured, never piped into `tail`. ✔
- IV Required build steps: no new route, string, or export (FR-009); UI slices run `lint:design && lint:tokens`. ✔
- V Data tag: stock quantities change ⇒ owner approves this spec before S1 starts and merges each PR; no prod data script. ✔

## Technical context
- Hub: Bun, SvelteKit 2, Svelte 5 runes, Drizzle, zod, vitest with `createMockDb()` (`$server/test-utils/mock-db`, `resolveSequence([...])` per query) for services; mounted-component tests exist (`BookingBoard.mounted.test.ts`) but pages are proven in the QA stack.
- Shared dialog: `src/lib/components/scheduling/ConsumptionConfirmDialog.svelte` (props `bookingId`, `productId`, `members`, `apiBase`, `onclose`, `oncompleted`). Reused as-is by S3; only S2 edits it.
- Mover: `src/lib/components/scheduling/kit/booking-mover.ts` — **not** edited; pages wrap its two callbacks.

## Approach (smallest complete change)
1. **Allow 0 at the trust boundaries, refuse it at the writers.** Loosen four zod schemas and one service guard to `>= 0`; add a `> 0` filter at the three places that multiply `qty_per_unit` into quantities (accrual defaults, preview funnel, POS issue lines). Everything downstream already rejects 0 lines, so nothing else moves.
2. **Make "nothing used" expressible.** `completionLines` returns `[]` instead of `null` when rows were shown; `realizeAccruals` reads `[]` as release-and-no-entry (one branch, before the entry state machine). Routes and gateway unchanged — their zod already admits `[]`.
3. **Route every UI complete through the one dialog.** Two pages wrap `onstatus`/`onvisitstatus`; the scheduling calendar page copies the pos page's ~25 lines of dialog plumbing; `BookingsView` deletes its modal copy and mounts the shared dialog. Net lines: negative.
3b. Dialog rows become union(accruals, defaults) so a mixed mapping asks for the 0 item too — pure merge in `consumption-lines.ts`.

## Zero-lines contract (decided)
| `lines` | Meaning | Server |
|---|---|---|
| absent / `null` | no confirmation given | realize open accruals as-is (unchanged) |
| `[]` | rows were shown, user confirmed 0 for all | release open accruals, no entry, `stockWarning: null` (new; only when no entry exists yet — a prior draft keeps the retry path) |
| `[...]` | confirmed quantities | issue exactly these (unchanged) |

`completionLines(rows)` is the only producer: `rows.length === 0 → null`, else the `actual > 0` subset (possibly `[]`). A read failure yields no rows ⇒ `null` ⇒ never releases.

## Slices (no file overlap; three parallel Sonnet implementers)

### S1 — server: store 0, never book 0, `[]` releases
Files (owns): `src/server/services/stock.service.ts` (`setConsumption:1239`, `previewLinesForItemQtys:1490`), `src/server/services/stock-accruals.service.ts` (`accrueConsumption:111-114`, `realizeAccruals:363-372`), `src/server/services/pos.service.ts` (`resolveIssueLines:776-785` only — a private function; export nothing), `src/routes/api/stock/consumption/+server.ts`, `src/routes/api/stock/consumption/[id]/+server.ts`, `src/routes/api/pos/sellables/+server.ts`, `src/routes/api/pos/sellables/[id]/+server.ts`, tests `src/server/services/stock.service.test.ts`, `src/server/services/stock-accruals.service.test.ts`, `src/server/services/pos.sellables.test.ts` (or the existing pos preflight test that reaches `resolveIssueLines` through an exported caller — do not add exports; `pos-service-boundaries.test.ts` pins them).
Gates: `bunx vitest run src/server/services/stock.service.test.ts src/server/services/stock-accruals.service.test.ts src/server/services/pos.sellables.test.ts src/server/services/pos-service-boundaries.test.ts`; `timeout 900 bun run check`. No UI ⇒ no design lint.

### S2 — client payloads: wizard keeps 0, dialog unions, `completionLines` explicit zero
Files (owns): `src/lib/components/pos/SellableWizard.svelte` (`consumptionPayload:423-431`), `src/lib/components/scheduling/consumption-lines.ts` (+ new pure `mergeConsumptionRows(accruals, defaults)` or equivalent), `src/lib/components/scheduling/ConsumptionConfirmDialog.svelte` (`loadRows:96-138`: read both, merge; delete the TODO(handoff) block `:25-30` — S3 closes it), tests `src/lib/components/scheduling/consumption-lines.test.ts` (flip `:38-50`), `src/lib/components/pos/SellableWizard.create-submit.test.ts` or `.edit-autosave.test.ts` (0 row kept, blank dropped).
Gates: `bunx vitest run src/lib/components/scheduling/consumption-lines.test.ts src/lib/components/pos`; `timeout 900 bun run check`; `bun run lint:design && bun run lint:tokens` (debt may only decrease).
Depends on S1 for end-to-end behaviour, not for merge: a `[]` body against the old server realizes as-is (today's behaviour) — no regression window. Merge order S1 → S2 preferred.

### S3 — pages: status chip → dialog; BookingsView swap
Files (owns): `src/routes/(app)/pos/appointments/+page.svelte` (`:1123-1124`, `:1137-1138`, `completeMembers:594-602` filter), `src/routes/(app)/scheduling/calendar/+page.svelte` (`:431-432`, `:445-446` + dialog plumbing copied from the pos page `:583-613`, `:1379-1386`, import `CompleteResult` type), `src/lib/components/scheduling/BookingsView.svelte` (delete `:121-175` modal logic and `:405-449` `<Modal>`, mount the dialog, keep `stockWarnings`), meta `proposals/2026-09-25-hub-pos-calendar-color-followups.md` (close the third-copy line — separate meta PR or note in the hub PR body for the orchestrator).
Gates: `bunx vitest run src/lib/components/scheduling src/routes/\(app\)/scheduling/bookings`; `timeout 900 bun run check`; `bun run lint:design && bun run lint:tokens`; **browser proof** in the QA stack (`dev:local`, private chromium `:9224`, never the shared `:9223`): table status cell → dialog, board drag → dialog, cancel leaves status, confirm completes (screenshots in the PR body).
Does not touch `BookingTable.svelte`, `BookingBoard.svelte`, `booking-mover.ts`, `BookingDetailDrawer.svelte`.

## Risks
- Table/board optimistic state: `saveRow`/the board's drop handler `await` the callback and return `true`; with the dialog path the callback resolves immediately. Verify in the browser that the cell/card shows the committed status until the dialog's `oncompleted → refresh()`; if a draft lingers, call `refresh()` in `onclose` (one line) rather than changing the kit components.
- `createMockDb` sequences: adding one query to `loadRows` is client-side (fetch), not DB — no mock-db sequence changes outside S1.
- Frozen inventories: no `pos.service` export changes (S1 edits a private function); no route added or removed (manifest counts unchanged); S3 touches a characterised route page — `bookings-routes.characterization.test.ts` must stay green.
- Design governance: S2/S3 add no new CSS; the BookingsView deletion removes utility-class markup (debt decreases).

## Verification after merge (owner + orchestrator)
1. Prod SQL: zero `stk_accruals` / `stk_entry_lines` rows with `qty::numeric <= 0` created after the deploy commit time.
2. Map Control Botox → Dysport at 0; book + complete from the status cell on a QA visit; confirm 15 → one entry, accrual realized; repeat with 0 → accrual released, no entry.
3. Ops: post the manual 15 UN exit for the 21-Oct visit (spec §ops note).

## Bypassed
None. Two-pass review is the three draft PRs' independent review plus owner merge.
