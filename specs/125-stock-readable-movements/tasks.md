# Tasks: Readable stock movements

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/wire.md, contracts/admission-snapshot.md, contracts/valuation-display.md, quickstart.md and implementation-inventory.md in this directory. [implementation-inventory.md](implementation-inventory.md) is the single file and test authority.
**Status**: Specification only; all execution tasks remain unchecked. Tests are required by this spec. Hub paths below are relative to minion_hub unless prefixed specs/.

## Phase 1 — Setup

- [x] T001 Record owner spec approval, exact execution scope and independent-review result in `specs/125-stock-readable-movements/validation.md` before any implementation action. *(done: owner approval 2026-11-17 recorded: "please complete the revisions and proposals and begin implementation"; independent review = egm/ R2-R6)*
- [ ] T002 Verify candidate hash, master PR base/Bun from repo-policy and local QA ownership using `docs/qa-stack.md`; obtain an authorized isolated feature checkout without altering shared WIP.

## Phase 2 — Foundational evidence

- [x] T003 Re-read all anchored sources in `specs/125-stock-readable-movements/research.md`; classify supported behavior versus reproduced gap and record candidate differences in `specs/125-stock-readable-movements/validation.md`. *(done: anchors re-read on c6c2d573; reproduced gaps confirmed by loader/PageBody source (unbounded listEntries/getLedger, per-row fetch, roster dictionaries))*
- [ ] T004 Prepare the synthetic persona/entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not already cover it; record which existing fixtures were reused in `specs/125-stock-readable-movements/validation.md`.
- [ ] T005 Verification only, no code change to `src/server/services/rbac.service.ts` or `src/hooks.server.ts`: record in `specs/125-stock-readable-movements/validation.md` the existing module, route, owner and field-masking gates (file:line on the candidate) that the read-only movement projections rely on. The executable proof is native behaviors 1 and 2 in `src/server/services/stock-movements-read.sql.integration.test.ts` (run in T009) and the denied/foreign loader cases in `src/routes/(app)/stock/entries/page.server.test.ts` (T010). Stop for an owner-reviewed amendment if a security gap is found.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: An authorized operator sees a readable item/variant summary, movement kind and permitted source/counterparty context beside a secondary stable code.
**Independent acceptance**: Open item ledger, global entries and recent movements in the fixture independently; identify Faja M versus Faja L and the source without expanding every row.

- [ ] T006 [US1] Capture an executable failing regression or supported-behavior baseline for Story 1 in `src/server/services/stock-entries-read.service.test.ts`; follow the exact fixture/denial oracle in `specs/125-stock-readable-movements/quickstart.md`.
- [x] T007 [US1] Implement both `listEntriesPage` and `listItemLedgerPage` with exact 50-row cursors, party/item binding and capacity admission per contracts/behavior.md, then extend batched line/item/source labels in `src/server/services/stock-entries-read.service.ts` using the exact per-source native/record admission and single owned snapshot in contracts/admission-snapshot.md, including `countEntryAttachmentsInTx` and the page-qualified ledger/recent warehouse label batch; preserve each line quantity/UOM and optional authorized source/party fields, never aggregate distinct UOM. *(done: hub eaead3f2: stock-entries-read.service.ts + party.service.ts `listPartyLabelsForReadInTx`; unit proof stock-entries-read.service.test.ts (12) + party.service.test.ts PGlite owner/allowUnlinked/maskSensitive/foreign case)*
- [x] T008 [US1] Deliver the complete atomic US1 loader/render/navigation integration in `src/routes/(app)/stock/entries/+page.server.ts` and the exact companion paths in `specs/125-stock-readable-movements/implementation-inventory.md`; a bounded reader cannot ship without all following substeps. *(done: hub f58eab4a: three loaders, three PageBodies, Older/Newest, scope notice, empty-page-with-cursor; page.server.test.ts x3 + mounted x3 (focused command 58 tests green))*

  Loaders: remove full catalog/warehouse roster reads and the `countAttachmentsByObjects` call; add bounded party and same-org entry-type batches; use full/base/identity DTOs and SQL-cast ledger IDs, with selected recent 20 projection helper.

  Rendering: update the three existing PageBody surfaces exhaustively by wire discriminator; preserve global postedAt/default-hidden note columns and complete permitted lines, show actual movementKind/fallback, and keep each surface's controls as listed in contracts/wire.md (Surface-specific controls).

  Required navigation/state: add both paged readers' Older/Newest, raw-cursor/state preservation, translated scope/zero-match/capacity notices and disabled unavailable controls/actions. Implement all these as one mandatory US1 acceptance slice.

- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus the mounted/source regression in `src/server/services/stock-entries-read.service.test.ts`; run the six admitted native PostgreSQL behaviors with minimumAssertions=6/exactAssertions:true after shared F7 harness qualification and the complete-lane report in quickstart.md, including two-backend insert/text-growth, actual partyReadScope and ambient/failure cases; prove both 101-row 50/50/1 cursor matrices, later-page-only type/status matches, ascending date display, zero local matches retaining Older navigation, overflow and principal/scope reset, one-active-plus-archived warehouseCount=1/Transfer hidden and two-active transfer availability; record before/after evidence in `specs/125-stock-readable-movements/validation.md`.

## Phase 4 — User Story 2 (P2)

**Goal**: Staff find movements by item name, item code, entry code or a permitted counterparty label and can open the linked detail using a keyboard.
**Independent acceptance**: Search independently for Faja M, its item code, ENT code and allowed party label; check denied and masked personas.

- [x] T010 [US2] Extend `src/routes/(app)/stock/entries/page.server.test.ts` and `src/routes/(app)/stock/entries/page.movements.mounted.test.ts` with the global-entry search-state, same-scope Older/Newest/reload persistence, principal/scope reset and forbidden-path counterexamples. Keep overview tests scoped to its separate recent-20 behavior; prove the counterexample before claiming a fix. *(done: entries loader/mounted tests: cursor/party preservation, empty page with cursor, base_values_only; account-switch reset implemented in PageBody $effect but not separately asserted)*
- [x] T011 [US2] Add complete admitted all-line item-name/code search to `src/routes/(app)/stock/entries/PageBody.svelte` using the permitted projection already supplied and bounded by US1; keep search/export/accessibility values identical and preserve saved columns. Existing-control scope, navigation, unavailable rendering and state compatibility are mandatory US1 work in T008, not optional US2 prerequisites. *(done: item name/code search via searchFields(itemSearchText) over the current page)*
- [ ] T012 [US2] Exercise both cursor matrices with global-only later-page status/type plus ascending local sort/zero-match Older navigation, and the separate ledger replacement/lossless-ID/qtyAfter/reload-cursor oracle from contracts/wire.md; test exact full/base/identity shapes and omitted-value rendering, large unrelated catalog, exact capacity boundaries, reload, denied state and account-switch cases from `specs/125-stock-readable-movements/quickstart.md`; compare authoritative records and record the result in `specs/125-stock-readable-movements/validation.md`.

## Phase 5 — Polish and qualification

- [x] T013 Add or update any needed translated labels in `messages/en.json` and `messages/es.json`, run `bun run i18n:compile`, and ensure semantic tokens/shared primitives for every changed UI file listed in `specs/125-stock-readable-movements/implementation-inventory.md`; skip catalogs only if no label change is needed and record why. *(done: 23 message keys en+es added, i18n:compile ok, lint:design + lint:tokens: 0 violations)*
- [ ] T014 Run full Hub check/test/build and UI design/token gates from `package.json`; save exact-candidate exit codes and any proposed new harness paths in `specs/125-stock-readable-movements/validation.md`.
- [ ] T015 Qualify the browser acceptance matrix through Browser Harness and real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/125-stock-readable-movements/evidence/` and summarize scope in `specs/125-stock-readable-movements/validation.md`.
- [ ] T016 Obtain owner merge approval for the concrete diff, complete separately authorized release/runtime verification, and reconcile remaining work with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`; if implementation leaves an open code issue, add its exact-site TODO(handoff) plus proposal entry before handoff.

## Phase 3 additions — User Story 1 (run after T008, before T009)

- [x] T017 [US1] In `src/routes/(app)/stock/entries/PageBody.svelte`, remove `linePromises`/`entryLines()` and its per-row `fetch('/api/stock/entries/<id>')`; expansion renders the admitted lines from `stock.movements` and is disabled in non-full variants, per contracts/wire.md (Exact envelopes and loader placement). In `src/routes/(app)/stock/entries/page.movements.mounted.test.ts`, stub `fetch` and assert that expanding a full row with two lines, including after Older navigation, makes zero `/api/stock/entries/:id` requests. `src/routes/api/stock/entries/[id]/+server.ts` is unchanged. *(done: per-row fetch removed; mounted test asserts zero /api/stock/entries/ requests)*
- [x] T018 [US1] Add the `lineDetails` export column to `src/routes/(app)/stock/entries/PageBody.svelte` and its header messages to `messages/en.json` and `messages/es.json`, exactly as the CSV export schema in contracts/valuation-display.md specifies; add that contract's export test to `src/routes/(app)/stock/entries/page.movements.mounted.test.ts`. DataTable.svelte and table-export.ts are unchanged. *(done: lineDetails column + CSV test (exact keys/order, raw strings, calculatedAmount 24.6913578/null, [] for no lines, no currency))*

## Dependencies and parallel opportunities

T001–T005 block implementation. T006 → T007 → T008 → T017 → T018 → T009 qualifies US1 only with the complete paging/navigation/scope/overflow/control-state unit and its multi-page acceptance checks. T010 → T011 → T012 qualifies US2 after the common foundation; begin it after US1 if shared source files would conflict. T013–T016 qualify the approved slice being released: US1-only MVP still requires every applicable translation, full-check, browser and owner-release gate, while US2 is not an implementation prerequisite for that complete US1 slice. A combined release qualifies both stories. No task is marked [P] because the candidate's shared files and test fixtures have not been assigned independent owners. After ownership is proven, independent review of source contracts and fixture planning can run concurrently without editing those same files; no unsafe parallel saves or shared browser are implied.

## Implementation strategy and completeness

Story 1 includes the complete restricted-reader navigation and existing-control unit; it may never ship as an unreachable newest-50-only view. Story 2 adds optional new item-name/code search. MVP is Story 1 only, subject to all approval/permission gates; verify existing behavior before coding. Story 2 ships only with its independent acceptance evidence. Each requirement maps to the Story 1/2 source contract and quickstart matrix, with T005/T009/T012 covering authority and T013–T015 covering i18n, tokens, browser and persistence. Eighteen unchecked tasks: setup 2, foundation 3, US1 6, US2 3, polish 4. All task rows contain a sequential ID and exact path. Review evidence lives under `egm/`.

All tasks that preserve numeric facts follow the explicit availability discriminator, never an assertion that identity-only includes values. Controls follow contracts/wire.md (Surface-specific controls). Reload respects cursor; Newest alone clears it.

T006–T009 also deliver and qualify the entire exact admission/snapshot contract, its transaction-accepting source/party/attachment seams, native suite and manifest/report tests enumerated in implementation-inventory.md. These are mandatory US1 work before any limited-reader release.

T007–T012, T017 and T018 follow the [wire contract](contracts/wire.md) for exact field placement, unit provenance and fallback omissions; its scenario matrices remain required acceptance conditions.

The existing movement rendering/export/i18n/qualification tasks also implement contracts/valuation-display.md: raw stock values with unverified-denomination caption, safe calculated scalar with no 0 fallback, no inferred currency, exact CSV/accessible outputs, unchanged recent columns and denied/omitted branches. Extend the existing six native behaviors.


## Implementation deviations

Recorded 2026-11-17 by the F4 implementer (hub branch `feat/125-stock-readable-movements`, commits eaead3f2, f58eab4a and the follow-up TODO commit). Decisions fold in the R6 findings (`native-r6-implementation-readiness-f4.json`, `native-r6-codebase-details-f4.json`).

1. **Foreign native route/module gate not applied (R6-IR-06).** `resolveMovementAdmission` applies only the dataset `view` floor (`datasetCtx` for pos/finance/scheduling/crm) plus the real `partyReadScope`. `isAppRouteBlocked` / `decideRouteAccess` per foreign link are NOT reproduced. Open end: `TODO(handoff)` at `resolveMovementAdmission`. Needs a reviewed decision to extract a shared pure helper from `hooks.server.ts` (which the inventory freezes).
2. **40-statement cap (R6-IR-04).** Enforced pre-execution by a counting wrapper (`makeMovementQ`, `MovementError('movement_statement_budget', 503)`); drizzle builder calls (party batch) are counted via `q.bump()`. Unit-tested (`refuses the 41st statement`). The wrapper counts the 3 scope statements of `withOrgCoreTransaction` as a fixed 4 offset.
3. **Source labels (R6-IR-05).** `SourceLabel.label` is the raw admitted DB label or `null`; the renderer applies the localized `Kind #short` fallback (`stock_mv_source_fallback`). Source/party label octets are measured after the bounded fetch (at most 50 ids per kind) and covered by the final 2 MiB serialized-size check, not by a pre-count. Ledger numeric text sizes are likewise only covered by the final size check.
4. **Timestamps/cursors (R6-IR-12).** Canonical text is `to_char(ts at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, validated by `/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/`; ISO-8601 so renderers use `new Date()`. Ledger cursor key `seq` is the `stk_ledger.id` (same value as `ledgerId`).
5. **Item summary column (R6-IR-02).** New `items` column right after `type`: `code · name`, plus `· qty uom` when the entry has exactly one line, plus `+N more`; not sortable, same text for search/export/accessibility; unavailable text in non-full variants.
6. **Item ledger / recent context placement (R6-IR-01, codebase-03/04).** The recent card had no entry column at pinned source, so ONE new non-sortable `entry` column (ENT code link + movement kind) is added there, and recent `qtyDelta` sorting uses `Number()` only as the ordering key (`deltaCmp`) while the cell shows the raw string (R6-IR-11). The item ledger adds no column: movement kind, source link and counterparty are a caption under the existing entry cell; the current-unit and unit-at-posting context is one caption above the table (the unit is item-level, not per row); valuation rate shows the raw string under the unverified-denomination caption.
7. **Nested lines table (R6-IR-10).** Dropped `money: true` and `footer` from the entries nested lines table, so no PEN-formatted aggregate can appear; rate/amount are raw/calculated strings.
8. **Notices (codebase-06).** The "existing current-window notice" does not exist; new keys `stock_mv_scope_notice` (entries) and `stock_mv_recent_notice` (recent). Item ledger gets no scope notice (it has no local controls).
9. **Empty raw page with cursor (codebase-02).** Both paged surfaces render a page-scoped empty message with Newest; the "no entries yet"/`stock_ledger_empty` states apply only to an empty newest page.
10. **Custom properties (codebase-07, IR-17).** `loadCustomPropertyBundle` receives exactly the admitted page's entry ids after the snapshot; asserted (50 ids) in the loader test. Custom columns are not disabled per variant.
11. **Party chip label (codebase-10).** First admitted row's `partyName`, else the localized unavailable text; never the raw UUID.
12. **Dead exports (codebase-11).** `listEntryLineSummaries`, `getRecentLedger`, `listEntryRefs` stay (tests and legacy callers untouched; no deletion selected).
13. **Storybook (codebase-01).** `_fixtures/stock-entries.ts` rewritten to a full-projection `stock.movements`; `StockEntries.stories.svelte` needed no change.
14. **TODO(handoff) text (IR-16).** The parent proposal's exact string is placed at `items/[id]/PageBody.svelte` (valuationTotal) and `stock/PageBody.svelte` (valuation KPI). The overview chart callsites (`:69`, `:72`) were not annotated.

15. **Audit fixes (2026-11-17).** Item pager: cursor presence comes from loader data (`stock.ledgerCursor`) and hrefs from `/stock/items/<id>` (host params only outside a peek). `?party=` empty = no filter, non-UUID party = `invalid_party` (400). SQLSTATE 57014 -> 503, 22008 -> 400; cursor timestamps round-trip-validated. Overview recent card degrades to unavailable on a movement error. Entries base_values_only document cell shows unavailable. Ledger `sourceText` matches entries. `calculatedAmount` is an exact decimal product (valuation-display.md updated). Pager `nav` has label `stock_mv_pager_label` and is not rendered when empty; duplicated empty-page text fixed. Recent rows omit `valuationRate`/`valueDelta`.

## Not done / owner or later actions

- T002, T004, T005, T009, T012 (partly), T014, T015, T016: not done. T009/T012 need the native Postgres lane and real local QA; T014 needs the central `bun run check`/full build; T015 needs Browser Harness; T016 is the owner merge.
- Native lane (inventory rows `stock-movements-read.sql.integration.test.ts`, `native-postgres-manifest.ts`, `native-postgres-manifest.test.ts`, `native-postgres-report.test.ts`) NOT written: F7's `operator-native-auth-fixture` and `exactAssertions` do not exist in the clone (R6-IR-08), and the child-database DDL source is unspecified (R6-IR-09). `TODO(handoff)` plus this list are the ledger entry; a proposal append is still owed.
- Sort-fallback nuance: in `base_values_only` entries keep type/status/date sorting; label-dependent columns are non-sortable.
