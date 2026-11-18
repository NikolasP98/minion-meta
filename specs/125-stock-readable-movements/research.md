# Research: Readable stock movements

## Evidence baseline and explicit reading list

Read the root AGENTS.md; pinned Hub AGENTS.md and its CLAUDE.md include; `.claude/skills/ui-design-governance/SKILL.md`; `.claude/skills/speckit-specify/SKILL.md`, `speckit-plan/SKILL.md`, `speckit-tasks/SKILL.md`; `.specify/memory/constitution.md`; active spec, plan and tasks templates; and parent proposal item F4.

Hub source is the private pinned checkout `.local/faces-followups-2026-11-16/hub-source`, HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`, verified by git rev-parse. Source paths below are relative to Hub; links pin that commit. Meta registry reports Hub master and Bun.

| Evidence | Source anchor | Finding / reading purpose |
| --- | --- | --- |
| R1 | [`src/routes/(app)/stock/items/[id]/+page.server.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/items/%5Bid%5D/+page.server.ts#L1) | Item ledger loader currently adds warehouseName and entryHumanId, not source or counterparty labels. |
| R2 | [`src/routes/(app)/stock/items/[id]/PageBody.svelte:335`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/items/%5Bid%5D/PageBody.svelte#L335) | Item-specific ledger columns; entry cell at 1072 links ENT identity. |
| R3 | [`src/routes/(app)/stock/entries/+page.server.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/entries/+page.server.ts#L1) | Existing cross-dataset handles, source/party labels and line summaries; also unbounded full-catalog listItems/itemsById and full warehouse-roster serialization. |
| R4 | [`src/routes/(app)/stock/entries/PageBody.svelte:125`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/entries/PageBody.svelte#L125) | Existing party/document columns; outer searchFields at line 282 omits item name/code. Expansion lazily fetches each entry's lines with `entryLines()` (lines 41–52, `fetch('/api/stock/entries/<id>')`), outside any page bound. Only the parent table is exportable (lines 270–290); rate and amount live in the nested line table. |
| R5 | [`src/routes/(app)/stock/+page.server.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/+page.server.ts#L1) | Overview already maps item names for recent ledger rows. |
| R6 | [`src/routes/(app)/stock/PageBody.svelte:120`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/stock/PageBody.svelte#L120) | Overview recent movement columns already include item name. |
| R7 | [`src/server/services/stock-entries-read.service.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock-entries-read.service.ts#L1) | Batch line summaries currently count lines and resolve warehouses only. |
| R8 | [`src/server/services/stock.service.ts:604`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock.service.ts#L604) | listEntries and getLedger 1035 read complete scoped history without a limit; listEntryRefs 1055 batches the supplied IDs; getRecentLedger 1069 alone has a 20-row default limit. |
| R9 | [`src/lib/components/stock/entry-document.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/stock/entry-document.ts#L1) | Existing pure provenance derivation for ticket/invoice/booking/purchase and honest unknown fallback. |
| R10 | [`src/routes/api/stock/ledger/+server.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/stock/ledger/+server.ts#L1) | Existing API is item-scoped; no new global-ledger endpoint is justified. |
| R11 | [`src/server/services/attachments.service.ts:450`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/attachments.service.ts#L450) | `countAttachmentsByObjects` is the entries loader's `attachmentCount` source: one grouped `attachment_links` count by `org_id`, `object_type` and `object_id`, with no per-row access check. It opens its own `withOrgCore` transaction. |
| R12 | [`src/lib/components/data-table/DataTable.svelte:3159`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/data-table/DataTable.svelte#L3159) | The exporter writes one row per parent row of the current view, from columns marked exportable, using `exportValue` when present; `src/lib/export/table-export.ts:18` quotes cells and `:150` prefixes a UTF-8 BOM. |

## Current behavior and uncertainty

See the spec's [AS-IS](spec.md#as-is). The item and overview loaders resolve warehouse names from `listWarehouses(ctx)`, which excludes archived warehouses (`src/routes/(app)/stock/items/[id]/+page.server.ts:41,52,90–94`), so an archived warehouse renders as its raw ID today.

## Decisions, rationale and alternatives

Decision: extend the existing entry read helper and page projections, retaining entryDocument as the provenance parser. Rationale: the three screens have different present behavior, and entries already implement much of the request. Alternatives: repeating item names everywhere adds noise; a new global ledger is unnecessary; per-row source fetches create a query waterfall.

Decision: source labels are optional foreign dataset facets, not authority derived from a stock entry. Acquire the existing datasetCtx for each foreign module, apply owner and masking policies to batched label reads, and omit inaccessible names and hrefs before serialization. Existing datasetCtx calls do not by themselves prove every returned party label is masked; add explicit regression coverage rather than assume the baseline is safe.

Decision: add compact first item + additional count display and a separate full searchable item-name/code list in the permitted browser projection. Reuse DataTable sorting/filtering/export mechanisms. Test counts against 1 and 50 entries with the same source kinds: added query statement count must be equal. No performance latency claim is made without a measured fixture run.

## Cross-cutting design decisions

Use existing Svelte 5 components and semantic design tokens; no generated token CSS editing. User-visible labels go through Paraglide message catalogs and `bun run i18n:compile`. Existing routes retain route-design-manifest and RBAC coverage; new route or module creation is excluded. Dataset denial, owner scoping and field masking must be tested both before serialization and in rendered UI; hiding controls alone is insufficient. Keep source-code and production evidence distinct.

## Review limits and execution preconditions

The source list demonstrates inspectable code behavior, not deployment identity or an exhaustive security audit. The authorized [local sanitized summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) records the source of the meeting follow-ups at 2026-11-16T19:20:30.051Z; it is not claimed committed or published. No customer identities or private raw records are reproduced. Review results and dispositions are recorded under `egm/`; owner data approval, implementation qualification and runtime proof remain pending.

## Capacity decision

Pinned listEntries and getLedger are unbounded. The entries loader also serializes the entire item catalog, so limiting entry headers alone is insufficient. Select the exact two-page/read-admission contract in [contracts/behavior.md](contracts/behavior.md): 50-row keyset pages, page-ID-qualified item/warehouse dictionaries, the existing overview limit of 20, and explicit line/string/output limits. Reject enriching full history, silently truncating item arrays and creating a new global search framework. An unavailable label projection is explicit; it does not misrepresent complete history or stock balances. Unrelated existing editor/aggregate datasets are outside this movement-projection size claim.


## Table control semantics and selected tradeoff

Pinned global entries `PageBody.svelte:270–294` supplies sortable columns/type/status filters and initialSort to DataTable. `DataTable.svelte:941–980` filters and sorts supplied data locally, and lines 342 and 390–400 expose bindable search/sort/filters/advanced; selectedIds is bindable at line 345. DataTable also has a server mode (`DataTable.svelte:941–946`): the caller applies search, filters, sort and paging, the advanced filter tree is ignored, and `server.onExport` replaces the local exporter. This slice does not select server mode, because it needs a server-side search/filter/sort parser and cursor semantics across pages, which the alternatives below exclude. Its owner-scoped view-memory identity includes the full URL query (`src/lib/shell/view-memory.ts:58`), so the feature must preserve explicit same-scope navigation controls through PageBody bindings/kept table identity rather than assume a new cursor restores arbitrary global sort semantics. Fixed 50-row readers intentionally change whole-history operation scope; current-page labeling, raw-cursor ownership and later-page-only matching tests make that change explicit. Dataset-wide sort/filter parsing is an evaluated alternative, excluded from this slice.


Decision: the [source admission and snapshot contract](contracts/admission-snapshot.md) selects scoped source gates and one owned consistent snapshot. The source evidence above supports that design; implementation/native qualification remains pending.

Pinned denomination evidence: stock entries `PageBody.svelte:83` (rate) and `:330` (amount) and item ledger `PageBody.svelte:1088` use default-PEN formatMoney; utils/format.ts explicitly defaults PEN without a stored stock currency. Movement-scoped raw-unverified display is selected in contracts/valuation-display.md. Unrelated bin valuation and overview charts/KPI remain known existing follow-ups, not completed fixes.
