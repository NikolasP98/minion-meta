---
status: draft
verdict: pending
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
tags: [ui, data]
source_proposal: 2026-11-16-faces-stock-cash-crm-meeting-followups
source_item: F4
---

# Feature Specification: Readable stock movements

**Feature Branch**: Planned `125-stock-readable-movements`; no branch created or switched. Hub PR base: master, verified from repo-policy on November 16.

**Created**: 2026-11-16

**Status**: Draft; source-evidenced planning only. Owner approval before implementation and owner merge remain pending. Independent review results are recorded under `egm/`.

**Input**: FACES meeting follow-up F4: Help staff identify the item, variant and authorized source or counterparty of a stock movement without opening each opaque code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Recognize a movement (Priority: P1)

An authorized operator sees a readable item/variant summary, movement kind and permitted source/counterparty context beside a secondary stable code.

**Why this priority**: Staff need to distinguish the item and source before deciding whether a stock movement is relevant.

**Independent Test**: Open item ledger, global entries and recent movements in the fixture independently; identify Faja M versus Faja L and the source without expanding every row.

**Acceptance Scenarios**:

1. Given an admitted full-projection single-item issue, when its movement is listed, then its exact item name, quantity/UOM, source kind and permitted party label are readable and the entry code still opens the correct detail.
2. Given an admitted full-projection multi-item entry, when its outer row is shown, then a bounded item summary and an additional-item count are shown; expanding exposes every item without implying the first item is the whole entry.

### User Story 2 — Find and open permitted movements (Priority: P2)

In global entries, staff find movements by item name, item code, entry code or a permitted counterparty label and can open the linked detail using a keyboard.

**Why this priority**: Item and code search helps staff locate an earlier movement after its row is understandable.

**Independent Test**: In global entries, search independently for Faja M, its item code, ENT code and allowed party label; check denied and masked personas.

**Acceptance Scenarios**:

1. Given a denied, sensitive-field-restricted or foreign source, when a row is displayed, searched or exported, then hidden labels are absent from the response and cannot be recovered by search.
2. Given an archived or deleted reference, when its entry is listed, then a localized fallback preserves the stable movement identity without inventing a customer or a broken source link.

### Edge Cases

Multiple lines and variants with the same display name; archived item; cancelled entry and reversal; transfer with two warehouses; missing metadata; source deleted; CRM denied; masked party; foreign-tenant UUID; long Spanish label; filtered source link; table export and persisted column settings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each scoped stock surface MUST preserve stable entry identity and quantity/UOM while showing the available item/variant name; an item-specific ledger may use its persistent item heading as the context rather than repeat the name in every cell.
- **FR-002**: Each row MUST show a human-readable movement kind and authorized source/counterparty context when recorded; missing, inaccessible and unlinked sources MUST have honest localized fallbacks.
- **FR-003**: Movement rows and paging:
  - The global entry row MUST summarize its items before expansion, with an explicit count for undisplayed items. Its expanded detail MUST retain all lines for an admitted page.
  - The global entries page and the item ledger MUST each load at most 50 rows per page, with Older/Newest navigation. Neither surface may silently load or enrich complete history.
  - The global entries page retains its search, sorting, filters and export, each explicitly limited to the current page.
  - The item ledger retains its existing plain table without sorting and gains no new toolbar.
  - The overview keeps its existing 20-row recent card and its existing header sorting within those 20 rows.
- **FR-004**: Global-entry search MUST find the permitted names and stable item/entry codes across the current admitted page, including every item in a multi-item entry; search, exports and accessible text MUST share the same permitted labels.
- **FR-005**: Added source links and party labels MUST obey the source dataset, record-owner and sensitive-field policies; a stock-view permission alone MUST NOT expose CRM, scheduling, POS or finance data.
- **FR-006**: The change MUST be read-only: no inventory, valuation, payment, receipt, booking or party record is modified by viewing or searching.

### Key Entities

See [data-model.md](data-model.md). Existing records and their authorized display projections remain separate; no historical customer or stock fact is inferred from a label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **Readability and search**: All three scoped surfaces pass their distinct readability/availability/paging matrix. Global-entry searches by every recorded item name/code return its parent entry within the admitted page. Plain ledger/recent gain no new search/export chrome; recent retains its existing 20-row header sorting.
- **Authorization**: Denied/foreign labels and restricted PII appear in zero rendered strings, network payload fields and exported cells. Authorized basic party names remain visible under the existing masking policy; stable entry links resolve for an allowed persona.
- **Capacity**: Batched label enrichment stays within the 50-entry, 10000-line and 2 MiB output limits in contracts/behavior.md, with constant statement count. A large unrelated catalog does not expand label dictionaries.
- **Pagination**: Separate 101-entry and 101-ledger-row fixtures navigate 50/50/1 without omissions or duplication.
- **Overflow**: Overloaded pages show an explicit unavailable state and never silently incomplete item search.

## AS-IS

The meeting reports opaque movement codes. The item detail already names its item and links ledger entries as ENT codes; its loader reads complete item history and resolves entry human IDs only. The global entry reader and its serialized catalog roster are also unbounded at the pinned source. The global entries table already has counterparty and source-document columns, and expandable item lines; its outer search includes entry/type/status/party but omits item names and codes. The overview recent-movements table already names items. These are different surfaces, so a blanket claim that stock has no names is false. Runtime visibility and the exact reported screen remain unverified.

Evidence is pinned to Hub `c6c2d5739572356239c4048c0f564f40b0768adc` and enumerated with exact source anchors in [research.md](research.md). Source is not runtime or deployment proof. Meeting reports and tentative names come from the parent [proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md). Separately sanitized live facts are in the [read-only evidence summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed 2026-11-16T19:20:30.051Z; names and personal account IDs are not copied here.

## TO-BE

Help staff identify the item, variant and authorized source or counterparty of a stock movement without opening each opaque code. Preserve tenant boundaries, existing business records and effective permission scopes. New user-visible language must work in Spanish and English, and keyboard access must cover the same operations as pointer access.

## DELTA

Keep the existing source and counterparty columns. Add authorized batch enrichment to item-ledger and overview projections where missing; add a compact item summary and complete item-name/code search to the existing entries page after adding the specified page bounds. Existing full-history listEntries/getLedger and the entries catalog roster are unbounded at pinned source; add dedicated global-entry and item-ledger keyset readers, and page-ID-qualified label dictionaries, without changing other callers. Expanded entry lines come from the same bounded page read instead of one request per row. Explicit overflow handling preserves entry links while disabling incomplete search. Do not create a new global ledger route or replace existing movement screens.

Required test files and the focused test command are listed in [implementation-inventory.md](implementation-inventory.md); browser and native oracles are in [quickstart.md](quickstart.md); [tasks.md](tasks.md) orders the work. These are future acceptance gates, not completed tests.

## Dependencies, Assumptions and Non-goals

No production IDs are guessed or committed. Synthetic fixtures stand in for customer records. The explicit changed behavior is defined in this feature’s contract; other existing semantics remain authoritative. WhatsApp linking, messages, remote model calls, password changes and unrelated redesigns are excluded. No product code or production data has changed in this documentation stage.

## Approval and evidence boundary

This is data-tagged work. Owner approval of the concrete spec is required before implementation, and owner merge is required. Planning is authorized; those later gates are pending. Pending runtime observations have explicit verification-first/no-op-or-stop outcomes and are not treated as proven defects. Independent review evidence is recorded under `egm/`; no implementation reproduction, release or live completion is claimed.


## Alternatives Considered

- Enrich complete movement history: rejected because the pinned global/item readers are unbounded; page-scoped readers provide a finite label/query/payload budget.
- Silently truncate multi-item labels: rejected because omitted items would make search/export misleading; use complete admitted page enrichment or explicit unavailable state.
- Add a global ledger/search surface or dataset-wide sorting/filtering: rejected for this slice because it expands routes, cursor semantics and permissions. Keep existing screens, fixed server traversal and clearly labeled current-page controls.
- Fetch source/party details once per row: rejected because it creates query waterfalls and inconsistent source-policy projections; use bounded authorized batches.

The selected tradeoff is finite current-page enrichment instead of implicit whole-history table operations. Which controls each surface keeps is defined once in [wire.md, Surface-specific controls](contracts/wire.md#surface-specific-controls-and-url-rules). Empty local matches are labeled page-only; paging uses the raw server cursor independently. [Research and full behavior tradeoffs](research.md) and [the control contract](contracts/behavior.md) retain the technical detail.


## Selected design and limits

Fallback projection is explicit: full, base-values-only or identity-only. Every serialized numeric value remains the exact stored fact, while omitted values show unavailable instead of zero. Stable identity/detail navigation remains available in each capacity fallback. Lossless ledger sequence strings identify rows even when several share an entry ID. Refreshing a URL preserves its valid cursor; only explicit Newest clears it. [Exact wire/render contracts](contracts/wire.md) and separate global/ledger acceptance cases define these boundaries.


Existing global posting-date and default-hidden note columns remain meaningful and retain their saved column keys; unavailable-capacity variants label omissions. Full ledger/recent rows show the entry's actual movement kind from an authorized header batch. No public API or whole-history sort/search behavior is invented.


[Exact source admission and snapshot contract](contracts/admission-snapshot.md) selects native per-source gates, actual same-org record reads, the existing CRM owner/allowUnlinked scope and recorded stock party only. All admission counts and label materialization share one owned REPEATABLE READ READ ONLY snapshot; concurrent growth appears next request. Native two-backend and permission fixtures are mandatory.


Stock rate/value display does not claim a verified currency: movement cells and current-page export retain admitted raw scalars with a localized unverified-denomination label. Ticket/display currency never supplies historical stock provenance. Existing unrelated valuation cards/charts remain an explicit separate follow-up.

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: plan.md

# Implementation Plan: Readable stock movements

**Branch**: Planned `125-stock-readable-movements` (not created) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: `125-stock-readable-movements/spec.md`, item F4.

## Summary

Keep the existing source and counterparty columns. Add authorized batch enrichment to item-ledger and overview projections where missing; add a compact item summary and complete item-name/code search to outer entries rows. Do not create a new global ledger route or replace existing movement screens.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2; Bun per current Hub registry and pinned package manifests.
**Primary Dependencies**: Existing global movement DataTable and plain ledger/recent table renderers, route load/navigation and view-memory helpers, Drizzle/CoreTx/withOrgCoreTransaction, dataset/party/native-route admission and entry-document labels. No new framework.
**Storage**: Existing org-scoped PostgreSQL records; viewer layout localStorage where already used. No schema migration is planned.
**Testing**: Existing Vitest and mounted Svelte harnesses; real local QA Postgres/auth for tenant and policy qualification; Browser Harness for UI acceptance.
**Target Platform / Project Type**: Authenticated Hub web application, desktop and 390px mobile; installed-app use is an optional separately recorded account check, not proof from web tests.
**Performance Goals**: Introduce the selected bounded global-entry and item-ledger readers because listEntries/getLedger are unbounded; remove the entries full-catalog label roster and the per-row line fetch; retain the overview recent-card limit of 20. Record before/after payload and query counts; reject added statement counts proportional to rows. No invented latency SLA.
**Constraints**: No broader permissions, unrelated WIP, production data writes, guessed identities or unrelated redesign. Owner approval before code, owner merge.
**Scale/Scope**: One proposal item, existing surfaces only; synthetic fixtures cover allowed, denied and foreign personas.

## Constitution Check

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I Spec before code | Pass: specify stage precedes plan; no implementation | Pass: tasks follow plan; all implementation tasks unchecked |
| II AS-IS / TO-BE / DELTA | Pass: pinned source plus reported/unproven distinction | Pass: exact oracles and explicit execution stops |
| III Slice-scoped delivery | Pass: documentation only, no branch mutation | Pass: future Hub isolated feature checkout and PR to registry master; owner merge |
| IV Required gates | Pass: tokens, i18n, route/RBAC and browser requirements included | Pass: local QA + strict Hub checks required; not reported run |
| V Data/security human gates | Pass for planning only | Pending owner approval before implementation; gate is not waived |

Gate evaluation: review artifacts may be authored now; implementing tasks is blocked until owner approval and runtime preconditions are met. Independent review results are recorded under `egm/`; owner approval remains pending. No constitution exception is claimed.

## Project Structure

Documentation, all under `specs/125-stock-readable-movements/`: spec.md; checklists/requirements.md; research.md; plan.md; data-model.md; contracts/behavior.md; contracts/wire.md; contracts/admission-snapshot.md; contracts/valuation-display.md; quickstart.md; tasks.md; implementation-inventory.md. design-review.md is generated from these files.

[implementation-inventory.md](implementation-inventory.md) is the single authority for Hub source and test files: every Create/Modify/No-change decision, every test file and the complete focused test command ([Focused test command](implementation-inventory.md#focused-test-command)). The native PostgreSQL lane command is in [quickstart.md](quickstart.md#native-snapshot-and-label-admission-qualification-mandatory-us1). No index, root shared feature state, dependency or product file is changed by this documentation workflow.

## Phase 0 — Evidence and reproduction

Read the explicit source list in research.md on the implementation candidate; record changes from pinned baseline. Run the synthetic scenario in quickstart before editing code. Classify each requested behavior as supported, reproducible gap or unavailable evidence. Supported behavior requires verification, not reimplementation. Any unexpected data/security defect becomes a separately reviewed amendment with owner approval.

## Phase 1 — Data model and contracts

Follow [data-model.md](data-model.md) and the four contracts. Decisions, rationale and rejected alternatives are in [research.md](research.md#decisions-rationale-and-alternatives).

Do not broaden authoritative storage to solve display gaps. Propagate authorization through the actual source handle and sanitize outputs before sending them to the browser. A field not permitted for the viewer must be absent from search/export and write responses as well as markup.

## Delivery slices and test oracles

1. Inventory/reproduction and source contract tests, including forbidden/foreign controls, with no production writes.
2. User Story 1 as the smallest complete acceptance slice: both bounded readers MUST ship with Older/Newest navigation, all existing-control page scope and preserved state, zero-match notices, overflow rendering and multi-page acceptance. The pinned screens have no cursor navigation, so a bounded-reader change cannot qualify without these controls.
3. User Story 2 adds new all-line item-name/code search and its independent search/persistence tests; navigation and compatibility are mandatory US1, not optional US2.
4. Full candidate qualification and owner-reviewed release. Record local tests, CI, merge, deployment and post-merge runtime proof separately.

## Required gates and evidence

In the isolated Hub candidate run `bun run check` (zero errors/warnings), `bun run test`, `bun run build`, plus `bun run lint:design && bun run lint:tokens` after UI changes and `bun run i18n:compile` for changed user-facing strings. Check registered route contracts even though no new route is planned. Use Browser Harness skill and an isolated session if concurrent; inspect real route-data outcomes independently of a 200 document shell. Test Spanish/English, light/dark, 390px/desktop, keyboard focus and reload persistence. Record screenshots and network/redaction assertions with synthetic data only.

## Complexity and risks

No new framework, schema or generic architecture. Main risk is treating a supported feature or denied facet as a missing business fact. Preserve explicit availability and source provenance. Tests that mock storage do not prove RLS or real policy enforcement; require local QA real-database checks. Independent review results and dispositions are recorded under `egm/`; this plan does not grant owner approval.

## Exact implementation sequence

1. In `stock-entries-read.service.ts`, implement the two page readers and shared admission/result contract in [contracts/behavior.md](contracts/behavior.md). Global entry ordering is created_at/id; item-ledger ordering is posted_at/bigint id. Preserve party/item cursor binding and the existing overview limit of 20.
2. In the entries loader, replace unbounded listEntries and remove the full-catalog listItems/itemsById path. Derive item and warehouse dictionaries only from admitted page lines; use a warehouse count scalar for transfer admission. Read `attachmentCount` with the in-snapshot attachment count in [admission-snapshot.md](contracts/admission-snapshot.md#attachment-count-inside-the-snapshot). Do not scan full line arrays before the count/byte admission. Add one bounded `listPartyLabelsForReadInTx` in party.service.ts instead of a per-party fetch waterfall, preserving the existing PartyReadScope predicate and field projection.
3. In the item loader, replace getLedger with listItemLedgerPage and resolve only returned entry and warehouse IDs. Preserve item context, bins, authoritative per-row balances and non-movement editor behavior. Do not claim unrelated item-editor rosters are bounded by this movement projection.
4. In the overview loader, enrich only its existing 20 recent rows. Every foreign label reader receives its own permitted dataset handle and source-record owner/field restrictions; remove denied labels and hrefs before serialization. Keep recorded quantity/UOM per line and never aggregate different UOMs.
5. Update the three existing PageBody files with page-scope labels, Older/Newest keyboard navigation and explicit unavailable state. In the entries PageBody, remove the per-row `entryLines()` fetch to `/api/stock/entries/<id>`: expansion reads only the admitted lines in `stock.movements`. The entries first-item/additional-count summary, full admitted-line expansion and the `lineDetails` CSV column ([schema](contracts/valuation-display.md#global-entries-csv-export-schema)) use the same permitted dictionaries as search and accessibility. The item ledger retains its item heading and stored qtyAfter rather than deriving a page subtotal.
6. Add or extend the test files listed in implementation-inventory.md, run every capacity/cursor/large-catalog oracle in the behavior contract, then focused, Hub, i18n and design-token gates.

## Fixed server traversal versus page-local controls

Per-surface controls are defined once in [wire.md, Surface-specific controls](contracts/wire.md#surface-specific-controls-and-url-rules); the page-local scope of the global entries controls is in [behavior.md](contracts/behavior.md#exact-local-control-scope-and-cursor-ownership). Add translated scope and page-empty-match guidance. Bind the existing supported DataTable search/sort/filters/advanced props from PageBody, keep its instance mounted across Older/Newest cursor changes, preserve same-scope active controls, and reset row selections/expansion on replacement. Account/org/party/item changes reset transient controls; existing column/view-memory preferences keep their current ownership. Cursor links use raw server nextCursor and scope, never local display order or matches. No server sort/filter parser, new table framework or whole-history claim. Verify later-page-only status/type matches and ascending date on the complete 50/50/1 fixture, including zero visible rows with an enabled Older link.

## Wire availability

Implement the full/base_values_only/identity_only discriminators, row fields, render and export rules in [contracts/wire.md](contracts/wire.md). Cast ledger sequence to text before driver mapping on item/recent projections; multiple rows sharing an entryId never collapse. Add the selected overview listRecentMovementRows helper with original 20-row semantics/lossless identity, leaving old APIs unchanged. Global base fallback omits entry lines; ledger base keeps stored numeric facts; identity-only omits values and bypasses numeric formatters/actions. Do not promise numerical availability when output admission fails. Explicit URL reload/back retains cursor; only Newest clears it.

Preserve global postedAt/note columns and note byte-admission; add full ledger/recent actual entry-type batch/availability.

The [source admission and snapshot contract](contracts/admission-snapshot.md) owns dataset/record gates and the single consistent read-only transaction. Implement its source/party seams and native matrix before release.

Implement [contracts/valuation-display.md](contracts/valuation-display.md) in the existing three movement PageBodies and message catalogs: raw unverified stock scalars, exact available strings, localized caption/export header, no money formatter or Number roundtrip for recorded cost display. Retain the existing finite calculated-entry-amount semantics with unavailable instead of 0. No new recent money column or unrelated KPI/bin/chart sweep. Existing mounted/native/browser scenarios include contrary billing/display currencies and every omission branch.

### Review artifact: research.md

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

### Review artifact: data-model.md

# Data model: Readable stock movements

Derived MovementLabel: entryId, entryCode, movementKind, itemLabels[{itemId,name,code}], exact stored stock quantities plus separately identified current item unit context for ledger rows; entry lines retain their recorded quantity/UOM, optional source{kind,label,href}, optional counterpartyLabel. Multiple line quantities are never summed across different UOM. Source and counterparty are optional authorized projections, never new canonical columns. Existing stk_entries, stk_entry_lines and stk_ledger remain unchanged. Item summary presents one item plus N additional items; searchable labels include all permitted items. No schema migration or historical rewrite.

## Validation and lifecycle

All existing validation, enum and permission rules remain binding. No source record is manufactured from display text. Apply read-only projection tests and explicit no-op/stop outcomes before any write. Refer to contracts/behavior.md for forbidden states and quickstart.md for real-database proof. A proposed shape is not a claim of existing persisted schema.

Derived movement responses are the exact surface/projection-discriminated union in contracts/wire.md: full, base_values_only, identity_only. Numeric fields are exact strings only where present; identity-only omits them and never substitutes zero. Every ledger variant carries ledgerId as a PostgreSQL bigint decimal string and keys rows by it, not shared entryId. Cursor/key/byte-cap rules remain surface-specific.


The fixed raw server page/cursor and the global entries local PageBody view state are distinct. Local state uses the existing DataTable search/sort/filters/advanced bindings; every local operation is current-page only. Preserve same-scope controls across explicit Older/Newest navigation, reset selection/expansion per raw page and transient controls on org/account/party/item change. Cursors come exclusively from the raw result, never local filtered/sorted rows. Current-page emptiness is not whole-history absence. No new persisted preference schema or server sort/filter field is introduced.


Per-surface controls are defined in [wire.md, Surface-specific controls](contracts/wire.md#surface-specific-controls-and-url-rules). Reload/back retains the URL cursor, while explicit Newest clears it. All row/field/dictionary shapes and disabled-control/export behavior per capacity variant are exhaustive in wire.md; no untyped optional-field spread is admitted.


GlobalBase includes both createdAt and nullable postedAt; full EntryLabels includes the existing nullable permitted note under selected-string/output budgets. Full LedgerLabels includes actual same-org movementKind and availability, not a sign inference. `attachmentCount` is read inside the movement snapshot ([admission-snapshot.md](contracts/admission-snapshot.md#attachment-count-inside-the-snapshot)). Full ledger/recent `warehouseName` comes from a page-qualified warehouse batch that includes archived referenced warehouses ([wire.md](contracts/wire.md#exact-variants)). Wire fallbacks explicitly mark omitted note/kind/value fields unavailable and preserve applicable existing column keys.


All source facts and complete label sets come from the snapshot defined in [admission-snapshot.md](contracts/admission-snapshot.md). A projected label adds neither authority nor historical unit evidence.

Exact placement: entries stock.movements has required full-only itemsById/warehousesById dictionaries; item stock.movements and overview stock.recentMovements have inline full-row labels and LedgerStockUnit. The complete union/field keys, fallback omission and label provenance are contracts/wire.md. Ledger has no frozen unit: current item unit is explicitly current, historical unit is not_recorded, and entry-line UOM never relabels historical ledger stock quantities.

warehouseCount is an independently scoped active-only scalar: org_id=ctx.tenantId AND archived_at IS NULL. It preserves the existing transfer gate and is separate from historical page-qualified warehouse label dictionaries, which may include referenced archived warehouses. Neither projection is the authority for the other.

Raw stock valuationRate/valueDelta and entry rate have unverified denomination in this read-only slice. Follow contracts/valuation-display.md for explicit localized display/export semantics; no currency key/provenance schema, conversion or finance-policy expansion is added.

### Review artifact: contracts/admission-snapshot.md

# Source admission and consistent movement snapshot

This contract supplements wire.md. Dataset permission alone does not prove source-record access, and counts taken in one READ COMMITTED transaction do not bound a fetch in another. All three movement projections use it. Existing unrelated loader datasets retain their existing behavior.

## Request admission before acquiring the movement transaction

Add `resolveMovementAdmission(locals)` in stock-entries-read.service.ts. Resolve stock and each needed foreign dataset through datasetCtx, existing module availability, loadPermissionsForUser and resolveCapabilities before transaction acquisition. Reuse the native built-in route decision: exact static SCREEN_DESIGN_MANIFEST match uses caps.explicitView(page:<pattern>) for non-admin; false denies, true replaces registry decision; otherwise call decideRouteAccess with native permissions/orgCapabilities. Apply existing module availability even when a page grant allows the route. For a dynamic detail path, do not invent a parent static override: use the native hook's exact matching behavior. Never use the current stock request's locals.pageRule as the decision for a foreign target. No alias grant is inferred for a native link. Dataset permission is an independent floor even where a native page grant replaces its route decision.

Resolve `partyReadScope(locals)` only after CRM dataset admission; its CRM-denied return `{}` must not be treated as unrestricted access. Keep its actual `ownerId`, `allowUnlinked` and `maskSensitive` values. `allowUnlinked` is derived from apiReadCapability('/api/crm/parties').anyOf exactly as the helper does, rather than a guessed boolean. An owner scope admits a party linked to an owned live same-org CRM contact, plus a party with no live CRM facet only when `allowUnlinked=true`. Another owner's linked party is denied. `projectPartyFields` masks `phone9`, `email` and `docNumber`, not `name`: an admitted party's basic name remains visible even to a maskSensitive persona. Select only id/name for movement labels, never those sensitive columns, emails, phones, document numbers or contact metadata.

The server-internal `MovementAdmission` contains stockCtx plus per-kind allowed/denied gates and optional admitted CoreCtx handles; none of these handles, capabilities or owner IDs enters JSON. All datasetCtx handles come from the same authenticated locals/getCoreCtx trust boundary and must match tenantId/profileId with stockCtx. Do not compare db object identity: getCoreDb creates cheap wrappers. No caller-supplied remote/different database context is accepted; actual reads use only stockCtx.db. Internal tests inject one qualified database through that context and admission resolution, with no global pool fallback. Unsupported context binding fails before reads, not by opening a second client. Existing request permission-cache lifetime is preserved; no instantaneous policy-revocation claim is made.

## Exact source table and label policy

`entryDocument` supplies only kind, UUID candidate and the existing href shape. Validate UUID before any query or href; construct/validate href server-side from kind plus that UUID. Ignore labelFallback entirely: it can contain metadata.providerRef and is not authorized source evidence. A source is available only after both dataset/native-route gates and actual same-org row admission below. Foreign and deleted IDs share unavailable; never perform an unscoped existence probe.

| Kind | Independent dataset and native target | Actual record predicate / owner rule | Minimal selected label and link |
|---|---|---|---|
| ticket | pos:view, enabled `pos` module, /pos/tickets/<uuid> route decision | pos_tickets.org_id=org AND id IN admitted UUIDs. Existing getTicket/listTicketRefs impose no additional owner rule; do not invent one. | humanId -> #humanId; if null use localized Ticket #short(uuid) after row exists. Existing detail href. |
| invoice | finance:view, enabled `finances` module, /finances/invoices/<uuid> route decision | fin_invoices.org_id=org AND id IN admitted UUIDs. Existing getInvoice/getInvoiceLabelsByIds are org-only for this facet, no owner filter. | documentId ?? number ?? localized Invoice #short(uuid), after row exists. No amount, client or provider payload. Existing detail href. |
| purchase | finance:view, enabled `finances` module, /finances/purchases/<uuid> route decision including the registered finance.purchases rule | fin_purchases.org_id=org AND id IN admitted UUIDs, matching listPurchaseRefs/getPurchase org-only behavior. | Existing serie/numero formatting, then providerRef, then localized Purchase #short(uuid), after row exists. No supplierName/RUC or tax payload. Existing detail href. |
| booking | scheduling:view, enabled `scheduling` module, /scheduling/bookings native static-page/registry decision | sched_bookings.org_id=org AND id IN admitted UUIDs, matching getBooking. That getter has no professional/resource/owner predicate; no new invented one. | Localized Booking #short(uuid) after actual same-org row exists; href /scheduling/bookings?booking=<uuid>. No attendee name/phone/email/notes/date fields are selected. |

pos.tickets, finance.invoices and scheduling.bookings are not registered subresource keys at the pinned source: do not test imaginary permissions. Reuse the actual route policy. Each table read is one bounded batch, at most 50 UUIDs per kind, no per-row query. Add transaction-accepting `listMovementSourceLabelsInTx(tx, admission, refs)` in stock-entries-read.service.ts, returning only permitted id/kind/label/href states. It directly selects the existing canonical tables with the exact predicates above. Existing listTicketRefs/getInvoiceLabelsByIds/listPurchaseRefs/getBooking wrappers open their own withOrgCore transactions; do not call them from the movement snapshot. They remain unchanged. Source label count/octet aggregate uses those same predicates and exact selected label expressions, before materialization.

Counterparty selection is explicitly the stock entry's recorded partyId only. No source contact/client/attendee/supplier inference, name matching or CRM contact fallback is selected in this slice. If partyId is null, show missing/unlinked even when a source ticket/invoice has another client; do not imply the source lacks a client. This preserves recorded stock provenance and bounds the batch to 50 distinct party IDs. Add `listPartyLabelsForReadInTx(tx, ctx, ids, scope)` inside party.service.ts, with ids<=50, exact org equality and existing partyReadPredicate. Its admission/octet aggregate and id/name fetch use the same predicate. Name is the permitted basic field; absence of PII columns preserves projectPartyFields semantics without pretending name is masked. No getParty, broad search or nested withOrgCore wrapper is used. CRM denied means no party query and no party label/href/search/export field. Source denied does not erase an independently authorized recorded stock party, and source allowed does not grant CRM.

States on every surface: missing = no recorded reference; denied = dataset/native-route/CRM gate failed; unavailable = invalid UUID, absent same-org permitted row, owner filtered row or null/empty allowed label that cannot be represented; available = admitted real row and its selected permitted label. Only available source has href. Do not reveal whether unavailable means foreign, deleted or owner-filtered. A numeric short-ID source fallback is allowed only after record admission; metadata text never bypasses it. wire.md's page-wide capacity fallback may remove labels and marks them unavailable, never available with a fabricated string.

## One owned REPEATABLE READ READ ONLY transaction

Add `withMovementSnapshot(stockCtx, fn)` in stock-entries-read.service.ts. Before acquiring, inspect currentAmbientOrgTx(); if present and !closed, return typed movement_snapshot_unavailable / HTTP 503 before opening a second transaction. Do not release/join/re-scope someone else's ambient transaction. The pinned three stock routes are outside the POS-only ambient route group. Preserve that invariant with route tests; an expanded ambient scope requires a reviewed amendment rather than silently accepting READ COMMITTED.

Use getOrgTransactionDb(stockCtx.db).transaction(callback, {isolationLevel:'repeatable read',accessMode:'read only'}). Inside call withOrgCoreTransaction(stockCtx, tx, ...), establishing real app_ledger and exact org/profile GUCs (including existing simulation scope). Verify current_setting('transaction_isolation')='repeatable read' and transaction_read_only='on'. Set LOCAL statement_timeout=2000 ms and lock_timeout=1000 ms; retain the existing 20s idle-in-transaction timeout. Allow at most 40 executed SQL statements including scope setup/restore; instrument the adapter and reject an attempt beyond this bound, never silently issue a per-row waterfall. Scope setup uses the existing bounded connection acquisition/timeout. No unbounded total/latency SLA is claimed. Do not use FOR SHARE/FOR UPDATE/advisory writer locks in a READ ONLY snapshot.

All movement base rows, raw cursor facts, entry headers, line counts, attachment counts, octet aggregates, item/warehouse/source/party labels, exact final serialization and fallback selection use the same CoreTx and snapshot. Every internal read helper takes tx explicitly; none opens withOrgCore, cache/SDK/network calls or another database connection. Resolve auth/module gates outside this transaction as above so the one-connection RLS pool cannot deadlock on nested authority reads. Existing non-movement sibling loader reads may retain their own transactions; they do not provide facts used by the movement admission budget. The snapshot owns its transaction but not the injected application pool: await commit/rollback through Drizzle and restore scope through withOrgCoreTransaction in finally; never end the shared pool. Failure rolls back and releases; no asynchronous work survives the callback.

Count before fetching potentially large arrays/strings, under this fixed snapshot. Base rows are 51/20 narrow rows. Entry metadata is projected to only the bounded source kind/UUID expressions needed, never full JSON. Count lines and UTF-8 octets for exact selected note/item/code/warehouse/source/party expressions; no arbitrary metadata or PII is fetched to calculate the budget. A selected nullable note and source labels count their actual encoded content, not a constant estimate. Narrow scans keep `LIMIT 10001`. Exceeding a line/octet budget selects the exact page-wide wire fallback without fetching those arrays/strings. Final encoded DTO-byte admission occurs inside this snapshot and may select the declared smaller variant; no truncated partial label dictionary is sent.

A writer committing new lines or enlarging text between count and materialization is invisible to this snapshot and visible on a later request. Do not falsely claim it was prevented or ignored forever. A count/materialized mismatch within the same snapshot indicates an implementation predicate/projection bug: throw typed movement_projection_inconsistent/HTTP 503, rollback, and expose no partial JSON/false zero/capacity success. Timeouts/SQL/count failures also fail the read explicitly rather than impersonating an overflow or empty result. A real limit overflow is the only path selecting capacity fallback. Query/payload receipts include snapshot isolation/read-only/role/scope, selected variant, byte totals, distinct-ID and statement counts, without private values.

## Attachment count inside the snapshot

`GlobalBase.attachmentCount` is read inside this snapshot by `countEntryAttachmentsInTx(tx, ctx, entryIds)` in stock-entries-read.service.ts. It is one grouped statement with the predicate of the existing `countAttachmentsByObjects` (`attachments.service.ts:450–471`): `attachment_links.org_id = ctx.tenantId AND object_type = 'stk_entry' AND object_id IN (<at most 50 page entry IDs>)`, `count(*)::int` grouped by `object_id`. An entry without a row has count 0. As today, no attachment visibility rule applies: the column is a count badge and selects no file name, link metadata or content. The statement counts toward the 40-statement budget. `countAttachmentsByObjects` opens its own `withOrgCore` transaction, so the entries loader stops calling it; attachments.service.ts and its other callers are unchanged. identity_only rows omit `attachmentCount`, as wire.md specifies.

## Native acceptance matrix

Add stock-movements-read.sql.integration.test.ts to the existing qa-native manifest exactly once, minimumAssertions=6, exactAssertions:true, describe `stock movement projection against PostgreSQL`, with these full requiredBehaviors:

- `stock movement projection against PostgreSQL applies each source dataset native route and same org row gate`
- `stock movement projection against PostgreSQL preserves basic party names and actual owner allowUnlinked scope without PII`
- `stock movement projection against PostgreSQL counts and materializes one repeatable read read only snapshot during concurrent inserts`
- `stock movement projection against PostgreSQL bounds concurrent source item and note text growth without truncation`
- `stock movement projection against PostgreSQL rejects ambient snapshot mismatches failures and mutation attempts without partial results`
- `stock movement projection against PostgreSQL preserves exact variants cursors bigint identities and fixed query budgets`

Qualify the F7-owned [shared exact-count harness](../128-faces-receivables-audit/contracts/native-exact-count.md) first: its optional exactAssertions flag and production report checks enforce this six-name row without changing legacy additive rows. F4 owns its admission/tests only; this is a test-harness prerequisite, not an F7 runtime or authority-migration requirement. Reject an extra seventh passing behavior in F4-specific report tests.

The first includes every source row, gate-denied, static-page-deny, missing, foreign and org-only-with-different-owner cases, plus forged metadata.providerRef and booking lookup denial. The second includes owner=true/unlinked allowed and denied, another-owner live facet, CRM-denied returning {}, source-only authority and maskSensitive name visibility with phone/email/doc absent. Counterparty null stays missing despite a linked source client. The third/fourth use two independent actual PostgreSQL backends and acknowledged test barriers after the count query (no timing sleeps): commit an inserted line and separately grow item/source/note text past the threshold; the first request remains its original admitted snapshot, next request chooses the proper capacity fallback. Both preserve complete permitted arrays or explicit unavailable, no over-budget materialization. Test exact thresholds and output fallback. The fifth tests actual READ ONLY write refusal, wrong isolation, unexpected active ambient failure-before-acquire, SQL/count timeout and deliberately mismatched projection predicate; cleanup proves no leaked transaction and pool remains usable. The sixth covers all three surfaces, 50/50/1 cursor matrices, 20 recent rows, unsafe bigint IDs, exact DTO omission/rendering, 1-versus-50 fixed-source-kind statement counts and <=40 statements including setup/restore, plus the large unrelated catalog. Include one active warehouse plus referenced archived warehouses: warehouseCount is 1 and Transfer remains hidden; two active warehouses make the existing transfer action available under its other original gates. Compare the scalar to org_id=ctx.tenantId AND archived_at IS NULL in the same snapshot, independently of historical label dictionaries. Ordinary mocked tests alone do not satisfy any native claim.


## Concrete native factory and authority binding

quickstart.md selects owned child database minion_qc_faces_movements_<32hex>, not a search-path-only schema, because real policy/nav helpers use public-qualified SQL. Its test-local partial getCoreDb factory override returns only the qualified child Drizzle and preserves actual getOrgTransactionDb behavior; global pool/Supabase fallback sentinels have asserted zero attempt counters, including swallowed loadNav failures. Actual fresh capability composition from seeded child rows is bound through actual runWithRequestCapabilities ALS before invoking real datasetCtx/partyReadScope/native route gates. No admission verdict is mocked. Locking fresh composition runs as the admitted initial fixture controller in its own short READ WRITE fixture-admission transaction, before role app_ledger and movement REPEATABLE READ acquisition, so no READ ONLY FOR SHARE violation or future F7 runtime prerequisite is introduced. Exact setup/assertions/teardown are mandatory in quickstart; both actual connection identities and real RLS/permission decisions are qualification evidence.


Native authority derivation role is explicit: controller rights only for the short fixture permission-composition setup, then real app_ledger for movement SQL. Preserve baseline organizations/profiles/member ACL/RLS; no fake app_ledger org SELECT/profile or membership UPDATE grant and no replacement permissive profile policy. Baseline negative probes and separate role/query receipts are mandatory; controller authority derivation is not an app_ledger privilege claim.


The complete child auth schema/users/uid owner+ACL/JWT/profile-FK prerequisite and full-lane controller are F7 contracts/native-auth-prerequisites.md, applied before public policy/FK fixtures. This is test setup only; native proofs preserve actual denied baseline rights and source role placement. It grants no business or browser authority.

### Review artifact: contracts/behavior.md

# Behavior contract: Readable stock movements

## Authority and read-only behavior

This feature changes the movement projections on the existing global entries page, item ledger and overview recent-movements card. It creates no route, table, stock mutation or synchronization job. Resolve the authenticated organization and each dataset handle before reading. Apply the actual source-record owner rule and sensitive-field projection before labels enter JSON, search, accessible text or export. A stock permission does not grant CRM/POS/finance/scheduling authority. Foreign IDs never reveal another organization's existence.

Reuse `entryDocument` for provenance and the existing entry link for allowed stock records. Emit a foreign source link only when both the route and record are available to that principal. Missing, denied and unavailable labels have distinct honest localized fallbacks; do not serialize a forbidden underlying label. Viewing, paging, searching and exporting change zero business records. A later mutation need would require a separately reviewed scope change.

## Shared page limits and result

The new movement readers return the exact discriminated full/base_values_only/identity_only wire variants in [wire.md](contracts/wire.md), with a surface discriminator, lossless ledgerId strings and projection-aware rendering. Read 51 base rows for paged surfaces to determine nextCursor and return first 50; recent keeps 20. Older replaces, never accumulates. Per-surface controls are defined in [wire.md, Surface-specific controls](contracts/wire.md#surface-specific-controls-and-url-rules).

Before fetching selected label arrays, count their rows and sum the UTF-8 octets of the selected item name/code, warehouse name, source and permitted counterparty strings. Each movement projection admits at most 10000 entry lines, at most 1048576 selected-string octets, and at most 2097152 serialized UTF-8 bytes including its label dictionaries. These are chosen safety limits, not measured latency claims. Label reads use only the current page's distinct entry IDs (at most 50), admitted item IDs (at most 10000), line warehouse IDs (at most 20000) and source/party IDs (at most 50 per source kind). Narrow line scans have a 10001-row safety limit. No query adds one statement per row.

If an admission limit is exceeded, use wire.md's exact page-wide fallback, never truncated labels or misleading itemSearchText. base_values_only preserves ledger numeric evidence and bounded global headers, while identity_only omits all values and renders unavailable. Numeric preservation is conditional on availability and byte-exact for serialized facts, not a claim that omitted values were shown. All variants retain distinct lossless ledger row identity and safe entry links. The limits cover only these movement projections, not unrelated existing item-editor/custom-property/overview-summary datasets.

## Global entries page

Pinned `listEntries` (`stock.service.ts:604–617`) is unbounded. Add `listEntriesPage(ctx,{cursor?,partyId?,limit:50})` in `stock-entries-read.service.ts`; only `/stock/entries/+page.server.ts` adopts it. Keep other `listEntries` callers unchanged.

Query order is `created_at DESC,id DESC`, with strict tuple predicate `< (createdAt,id)`, exact organization equality and the existing optional `?party=` filter. Validate `partyId` as UUID; a foreign party yields no matching scoped rows, not a foreign-party lookup. Cursor is base64url UTF-8 JSON `{createdAt:ISO8601,id:UUID,partyId:UUID|null}`, at most 256 bytes with exactly these keys. Read the cursor timestamp from PostgreSQL as canonical UTC text with six fractional digits, not a JavaScript Date; the predicate binds that exact text as timestamptz, preserving database microseconds. Validate its calendar/time components and canonical form before the query. Invalid input, invalid timestamp/UUID or a cursor-party mismatch returns HTTP 400 without an unbounded fallback. Older/newest links preserve `?party=`. New rows appear after refresh/newest navigation; traversal is not a frozen export snapshot.

Remove this loader's `listItems(ctx,{includeArchived:true})` call and the loop that serializes the entire catalog into `itemsById`. For admitted current-page entry lines only, collect distinct item IDs and select same-org `{id,code,name}` without an active-only filter, so archived referenced items remain readable. `itemsById` contains only those admitted IDs; absent/deleted item references use the existing missing-item fallback. Do not replace this with a broad `listItems` call elsewhere in the label helper. A huge unrelated catalog must not increase this dictionary or its query parameters.

Likewise, replace the entries loader's full warehouse roster with page-line-ID-qualified warehouse labels and a separate active-only `count(*) WHERE org_id=ctx.tenantId AND archived_at IS NULL` scalar for `warehouseCount`, preserving the current listWarehouses(ctx) default predicate; transfer-action admission still uses that count. Historical page-qualified warehouse dictionaries may include referenced archived warehouses, but they do not contribute to this action count. `warehousesById` contains only warehouses referenced by admitted page lines. The existing two-query line-summary helper must not perform its full line scan before admission; reuse its count query, perform the limit checks, then query admitted lines/labels. Keep each line's recorded quantity and UOM and never aggregate unlike UOMs.

Use one bounded `listPartyLabelsForReadInTx` batch for recorded entry.partyId only, under the exact partyReadScope and owner/allowUnlinked policy in [admission-snapshot.md](contracts/admission-snapshot.md). That contract specifies every source dataset/native route/record predicate and the single owned REPEATABLE READ READ ONLY transaction shared by counts, materialization and fallback. Existing source wrapper services remain unchanged; their transaction-opening helpers are not called inside this snapshot. No source client/contact/attendee inference or sensitive PII projection is selected.

Every admitted row shows the first item by `(lineNo,id)` order plus the number of additional distinct referenced item IDs. Keep the existing lineCount separately; repeated lines for one item do not invent additional items. Expansion retains every admitted line and its order, read from `stock.movements` (see [wire.md](contracts/wire.md#exact-envelopes-and-loader-placement)); the existing per-row `entryLines()` fetch to `/api/stock/entries/<id>` is removed. Search and export explicitly cover only the current page's allowed fields and all of its admitted item names/codes, including nonfirst lines. Nested line values are exported through the `lineDetails` column in [valuation-display.md](contracts/valuation-display.md#global-entries-csv-export-schema). Preserve saved DataTable columns. No full-history search/export is claimed.

## Item ledger page

Pinned `getLedger` (`stock.service.ts:1035–1052`) also reads complete item history. Add `listItemLedgerPage(ctx,{itemId,cursor?,limit:50})` in `stock-entries-read.service.ts`; replace only the item detail loader's `getLedger(ctx,params.id)` call. The source item must pass the existing same-org/owner admission first. Keep other `getLedger` callers and `/api/stock/ledger` unchanged; their legacy reads are not described as bounded or enriched by this feature.

Use the existing visible order `posted_at DESC,id DESC`, exact org/item equality and tuple `< (postedAt,seq)`. Cursor is base64url UTF-8 JSON `{postedAt:ISO8601,seq:decimalString,itemId:UUID}`, at most 256 bytes and exact keys. `postedAt` is PostgreSQL-derived canonical UTC text with six fractional digits, bound exactly as timestamptz rather than rounded through a JavaScript Date. `seq` is a canonical positive bigint decimal string in the PostgreSQL bigint range 1–9223372036854775807; do not narrow it through Number. Reject malformed/out-of-range timestamps, noncanonical sequences and mismatched item IDs with HTTP 400. The item page uses `?ledgerCursor=`; older/newest links preserve unrelated item-page query parameters and change only that key.

Return at most 50 ledger rows and resolve only their at most 50 distinct entry IDs through the same bounded, authorized label helper. Keep the existing persistent item heading and, when the wire variant includes values, each row's authoritative `qtyDelta`, `qtyAfter`, `valuationRate`, warehouse identity and entry link. The table keeps its existing columns (entry, posted date, warehouse, delta, qtyAfter, valuation rate); `valueDelta` stays in the row payload only and no value column is added. The warehouse name comes from the page-qualified warehouse batch in [wire.md](contracts/wire.md#exact-variants), which includes archived referenced warehouses. `qtyAfter` is the stored post-movement balance, never a sum of the visible page. Paging does not change bins, valuation, item-editor choices or previous/next-item navigation. Do not use the item loader's existing whole catalog as a new label dictionary. Existing non-movement rosters remain outside the movement-projection size claim.

The ledger keeps the controls listed in [wire.md](contracts/wire.md#surface-specific-controls-and-url-rules); the Newest/Older controls let users reach older history without silently dropping it. On capacity failure, wire.md selects base_values_only with ledger numeric evidence if that base fits, otherwise identity_only with values explicitly unavailable. Ledger has no search/export controls to disable; entry links and raw-cursor paging remain usable. Reopening or refreshing retains a valid URL ledgerCursor; only an explicit Newest action removes it, and no cursor means newest. An inserted/backdated row can affect later navigation, so no frozen-history export is promised.

## Overview and compatibility

`getRecentLedger(ctx,20)` already bounds the overview card to 20 rows (`stock.service.ts:1069–1078`). Keep that limit and enrich only those entry IDs under the shared string/output checks, using wire.md's new lossless-ID projection helper for the selected loader. Do not expand overview history or claim its unrelated aggregate queries are bounded by this card's limit.

Preserve entry identity, item-context heading, current routes, legacy API bodies and effective permission scopes. New user-visible scope/navigation/unavailable labels use Paraglide, keyboard access and semantic tokens. No schema migration or historical rewrite is selected.

## Required capacity and compatibility tests

- Global entries: 101 records including tied `created_at` values and timestamps that differ only in PostgreSQL microseconds traverse 50/50/1 with every ID once; a validated party filter survives both navigation controls and a cross-party cursor is rejected.
- Item ledger: 101 rows including tied `posted_at`, microsecond-distinct timestamps, bigint IDs beyond Number's safe range, and rows from two warehouses traverse 50/50/1. Wrong-item cursors fail, numeric snapshots remain unchanged, and later pages do not recompute `qtyAfter` from visible rows.
- Both: malformed cursors, insertion between pages, raw-page navigation/URL retention and independent denied/owner/foreign controls. Global entries alone also tests its existing page-local search/export and every nonfirst item.
- Admission boundaries: 10000 versus 10001 lines, 1048576 versus 1048577 selected-string octets and 2097152 versus 2097153 serialized bytes. Overflow has no truncated-search claim or forbidden label leak.
- A synthetic catalog with 100000 unrelated items does not enlarge `itemsById`, warehouse dictionaries or movement projection. Assert the entries loader never calls full-catalog `listItems`, full-roster `listWarehouses` or unbounded `listEntries`; item-ledger loading never calls unbounded `getLedger` for this projection.
- Added query statement counts are equal for 1 and 50 rows with the same source kinds. Party labels use one scoped batch. Capture movement-projection bytes and lookup-ID counts; a constant query count alone is not a capacity pass.


## Exact local control scope and cursor ownership

Choose fixed server traversal plus local page operations. The global reader always orders created_at DESC/id DESC and the item reader always uses its declared posted_at/sequence order. On the global entries page, search, sortable headers (including ascending date), type/status and other column filters, advanced filter tree, any existing grouping, aggregates, local table pagination and export operate on only the current admitted page of at most 50 rows. The other surfaces' controls are in [wire.md](contracts/wire.md#surface-specific-controls-and-url-rules). Page-local controls never claim oldest/filtered/all-history results across other server pages. A filter that matches only an older page may therefore show zero current-page matches; distinguish this from empty stock history with a localized message directing the user to Older or Clear filters. No dataset-wide sort/filter parser or new server-mode sorting is added.

Add a persistent translated scope notice beside the table/navigation that explicitly says search, sorting, filters and export apply to this page; retain it when the visible filtered result is empty and in keyboard/accessibility instructions. Do not show an unlabeled whole-history total/aggregate. The permitted base-page count and next-page availability are independent of local filters. Capacity-unavailable pages keep the explicit enrichment warning and disable label-dependent controls/export as already required; never make a hidden label searchable through filters or group keys.

The global entries PageBody owns the local view state and binds DataTable's current supported `search`, `sort`, `filters` and `advanced` props (and existing groupValue if that surface already uses it). Keep the same table instance mounted during Older/Newest route cursor changes; no cursor-keyed remount. Preserve those active controls during an explicit Older/Newest navigation on the same org/party/item surface, and recompute their local result over the replacement raw page. Reset selectedIds and expanded rows on raw-page replacement so off-page identities cannot be exported or acted on as though still displayed. Keep saved column/density preferences under the existing owner-scoped storage key. A full reload/browser-back uses the existing owner-scoped view-memory behavior; this feature does not invent cross-device view persistence. An org/account/party/item scope change resets transient controls and never carries one principal's search/filter into another scope.

Older/Newest links derive only from the server's raw base result/cursor, never the filtered/sorted/expanded/selected display rows. Navigating with a zero-match local filter must still allow Older when raw nextCursor exists. Newest drops only the cursor while preserving the current party/item scope and active page-view controls; local ascending date does not reverse server traversal. Browser history preserves its actual cursor identity, not a fabricated global sort position. Source already provides bindable props (`DataTable.svelte:342`, `:390–400`, and selectedIds at `:345`); use these rather than inventing a generic table API.

Acceptance: 101 raw records over 50/50/1, newest page lacks a selected status/type that exists exclusively on page 2, and ascending date is selected. Page 1 shows explicit current-page zero matches and an enabled Older control. Page 2 preserves selected controls, reveals its matches sorted ascending within that page and exports only those permitted matches. Cursor traversal remains the canonical descending server sequence with no omissions/repeats irrespective of local sorting. Newest preserves controls and returns the newest raw 50. Reset or clear controls explicitly restores current-page rows, never fetches full history. Run that local-control oracle on global entries only; run wire.md's distinct plain-ledger page-replacement/lossless-sequence oracle on item ledger, plus browser-back, URL reload/account switch and every capacity fallback on both.

Numeric cells follow the availability discriminator in wire.md; identity_only never implies a zero or hidden successful value.


Preserve the existing global postedAt column and permitted default-hidden note column under the exact full/base wire definitions; do not silently blank or retire a saved column. Populate full ledger/recent movementKind from the bounded same-org entry-type batch and localized missing/denied fallback, not quantity sign. The exact per-file Create/Modify/No-change inventory in implementation-inventory.md is mandatory.


The source-admission and transaction details in [admission-snapshot.md](contracts/admission-snapshot.md) are normative on all three surfaces. Counts from one READ COMMITTED transaction followed by fetches from another do not qualify. Basic authorized party names remain visible under maskSensitive; hidden/foreign labels and sensitive PII do not.

The selected movement cell/export change in valuation-display.md removes inferred currency labels while preserving admitted raw stock values. It does not add money columns to the recent card or alter unrelated valuation cards/charts; exact existing follow-up callsites remain in the parent proposal.

### Review artifact: contracts/valuation-display.md

# Stock scalars without verified denomination

This movement slice has no admitted historical stock-currency provenance reader. Stored stock rate/value scalars do not carry a currency column. Their exact DTO keys and raw strings stay as selected in wire.md; this contract adds no currency/qualification key, FX conversion, table or writer. The semantic denomination of movement stock scalars is a constant **unverified**, not an optional implementer assumption.

## Source-backed observable change

At the pinned source, `entries/PageBody.svelte:7` imports formatMoney, `:83` formats line rates and `:330` formats computed amounts. Item detail's ledger rate cell calls fmtMoney at `items/[id]/PageBody.svelte:1088`; that local helper at `:315` defaults through formatMoney to PEN. `src/lib/utils/format.ts:75` onward explicitly defaults that formatter to PEN. None of those calls proves a historical stock denomination. A POS USD ticket or a current display-currency preference does not fix the omission.

For the entries expansion rate/amount cells and the item-ledger valuation-rate cell, render the admitted original rate/value string as escaped Svelte text, without a currency symbol or currency code, under a visible localized caption `Valuation currency unverified` / `Moneda de valorización no verificada`. The caption is adjacent to the movement section, remains available to assistive technology, and is present whenever any stock rate/value is displayed. Keep quantity and current/historical UOM captions separate. Do not prefix a stock scalar with ticket, invoice, finance-settings or default PEN currency.

The item ledger keeps its existing columns; `valueDelta` stays payload-only and gets no new column. Preserve the exact raw scalar in displayed cell/accessor/accessible text and in the global entries page-local export defined below. Do not round it through Number, formatMoney, Intl currency, truncation or a hidden formatter in an accessor. A scalar used only as a local sorting key never replaces its display/export bytes or financial evidence. Omitted/unavailable values stay unavailable, never zero or a currency-formatted dash.

The existing entry-line calculated amount may remain as the explicitly labeled **calculated stock scalar**, using only its existing `Number(qty) * Number(rate)` arithmetic from `entries/PageBody.svelte:60`, not a new valuation formula. Missing rate, nonfinite operands or nonfinite result yields unavailable; remove the existing amount accessor's `??0` fallback. A finite result is `String(result)` as calculated display/export evidence, distinct from a recorded ledger value and never a denominated invoice/COGS amount. Preserve original qty/rate strings in the line DTO. No calculated amount is injected into ledger/source fingerprints or replaces a stored value.

The overview recent card retains its actual existing columns (item/warehouse/quantity/entry context), sorting and limit of 20; do not add rate/value/currency columns to satisfy a shared fixture. If the selected projection carries a raw stock scalar without a visible column, no new money display is implied. Apply the same unverified rule to any selected movement scalar actually rendered, including accessible/export paths; do not invoke a money formatter for it.

These are display semantics only. Existing numeric admission and record/source authority in wire.md/admission-snapshot.md remain mandatory. No new finance field tier is invented for stock, and no previously denied or omitted data becomes available. Source ticket/invoice billing money is a distinct field admitted by its own policy, not rendered as a stock-denomination proof by this slice.

## Global entries CSV export schema

The global entries export keeps the existing DataTable exporter unchanged (`DataTable.svelte:3159–3185`): one CSV row per parent movement in the current page's filtered and sorted view, with the columns ticked in the existing export dialog, comma separators, CRLF row ends, the quoting of `toCsv` (`src/lib/export/table-export.ts:18–24`) and a UTF-8 BOM (`table-export.ts:150`). XLSX export uses the same rows. Existing columns keep their keys, order and export values; for example `posted` and `created` keep their `YYYY-MM-DD` UTC export values and `lines` keeps the line count. No row per line, second file, nested-table export or DataTable/table-export change is selected.

Nested line facts are exported through one new parent column in the entries PageBody:

| Property | Value |
|---|---|
| Key | `lineDetails` (the key `lines` already holds lineCount) |
| Header | `Lines (valuation currency unverified)` / `Líneas (moneda de valorización no verificada)`, from the message catalogs |
| Position | Immediately after the existing `lines` column |
| Visibility | `defaultHidden: true` and `exportDefault: true`: not shown in the table, ticked by default in the export dialog |
| Cell value | `exportValue` returns `JSON.stringify(array)`, with one object per admitted line in `(lineNo, id)` order |
| Object keys, in this order | `lineNo` (number), `itemCode` (string or null), `itemName` (string or null), `qty` (string), `uom` (string or null), `rate` (string or null), `calculatedAmount` (string or null), `fromWarehouse` (string or null), `toWarehouse` (string or null) |

Value rules:

- `qty` and `rate` are the original `LineWire` strings, byte for byte. No locale grouping, rounding, currency symbol or code is applied.
- `calculatedAmount` is the calculated stock scalar defined above: `String(Number(qty) * Number(rate))` when the result is finite, otherwise `null`.
- `itemCode` and `itemName` come from `itemsById[itemId]`; a missing key gives `null` for both. `fromWarehouse` and `toWarehouse` come from `warehousesById`; a null or missing ID gives `null`.
- An entry whose admitted line array is empty exports `[]`.
- The column exists only in the full projection. base_values_only and identity_only follow the export rule in [wire.md](contracts/wire.md#exact-variants) and never emit it.
- Only permitted labels from the same dictionaries as search and accessible text appear; no source, party or metadata field is added to the array.

Required test, in `src/routes/(app)/stock/entries/page.movements.mounted.test.ts`: mock `$lib/export/table-export` and capture the rows passed to `downloadCsv`. Fixture: entry A with two lines (item Faja M, UOM `caja`, rate `12.3456789`, qty `2`; item Faja L, UOM `und`, rate null, qty `1.500`, transfer warehouses), entry B with zero lines, and a third entry excluded by an active local type filter. Assert the header row has the localized `lineDetails` header right after the `lines` header; A's cell equals the exact JSON string with keys in the order above, `calculatedAmount` `"24.6913578"` and `null`; B's cell is `[]`; the filtered entry is absent; no cell contains `S/`, `PEN`, `USD` or `$`. Also assert that `toCsv` quotes the JSON cell and doubles its inner quotes.

## Scope and known existing limitation

This change is limited to the three movement projections and their existing controls. Item-bin valuation cards (`items/[id]/PageBody.svelte:1032` and the valuation-total section), overview total-valuation KPI and valuation chart (overview `PageBody.svelte:26`, `:69` and `:72`), and other ordinary stock surfaces still use their legacy formatters; this slice does not claim to qualify or repair those values. The parent proposal must retain a separate follow-up for their missing denomination provenance. That existing limitation is not an unreviewed task silently delegated to this implementation. No shared formatMoney helper or unrelated chart/card behavior is changed here.

When implementation is authorized, retain `TODO(handoff): qualify historical stock denomination before currency formatting; see parent FACES follow-up proposal` at any remaining affected source callsite owned by that follow-up. Record the exact existing callsites and the proposed comment in the parent proposal before final handoff.

## Required counterexamples in existing qualification

Extend the already selected loader/mounted/native/browser behaviors rather than register a seventh native test. Use synthetic raw values with many decimal places, positive/negative values, zero and very small finite strings. Set a linked ticket's actual billing currency to USD, change current display currency between requests and include another org's currency: stock cell/accessor/CSV/accessible output remains the same raw scalar with the unverified caption and no S/, $, EUR/PEN/USD label. A billing-only display does not appear through a stock source label. Verify no scoped movement path calls a money formatter, while unchanged unrelated chart/card mocks are outside that assertion's scope.

Test null line rate, nonfinite calculated amount and every full/base_values_only/identity_only omission branch: no fabricated 0 or inferred denomination; hidden values are absent from CSV/search/accessible text. Preserve the recent card's actual columns and no-export behavior. Browser qualification checks the visible localized caption and cell text; native tests prove raw database strings and policies are unchanged, not a browser screenshot. Numeric/recovery writer tests belong to their owning features, not this read-only slice.

### Review artifact: contracts/wire.md

# Discriminated movement wire projections

These are derived loader contracts for this feature, not new database columns or a change to legacy public APIs. Every row is org-authorized before projection, and every numeric fact is the original finite database decimal string; no recomputation/rounding/fallback zero. Query ledger IDs as id::text before driver mapping, never String(anAlreadyRoundedNumber).

## Exact variants

Every response has the six common keys `{surface,projection,rows,nextCursor,enrichmentAvailability,reason}`. Full entries also has the two required dictionary keys defined below; no other variant has those keys. surface is entries|item_ledger|recent; projection is full|base_values_only|identity_only. nextCursor is the specified opaque cursor or null; recent always null and limit 20. enrichmentAvailability is available only for full, otherwise unavailable; reason is null only for full, otherwise capacity_limit. The DTO never includes raw metadata or source-document content. Full entries may include their existing permitted note field under the declared byte budgets; fallback variants omit it explicitly. Date strings use the contract's canonical database UTC form. Existing permitted datasets determine labels before serialization.

Identity primitives:

- EntryIdentity = `{entryId:UUID,entryHref:string}` where entryHref is server-generated `/stock/entries/<entryId>`.
- LedgerIdentity = EntryIdentity plus `{ledgerId:decimalString,itemId:UUID,warehouseId:UUID}`. ledgerId is canonical positive PostgreSQL bigint string, lossless in every variant. It is the row/getRowId key, including recent. Two rows from the same entry remain two rows; never key/deduplicate ledger rows by entryId.
- GlobalBase = EntryIdentity plus `{type:receipt|issue|transfer|adjustment,status:draft|submitted|cancelled,createdAt:string,postedAt:string|null,lineCount:number,attachmentCount:number,firstFromWarehouseId:UUID|null,firstToWarehouseId:UUID|null}`. Counts are complete nonnegative safe integers. `attachmentCount` comes from the in-snapshot count in [admission-snapshot.md](contracts/admission-snapshot.md#attachment-count-inside-the-snapshot). No humanId/party/source/name text appears in base_values_only.
- LedgerBase = LedgerIdentity plus `{postedAt:string,qtyDelta:decimalString,qtyAfter:decimalString,valuationRate:decimalString,valueDelta:decimalString}`. Those values remain authoritative stored facts, with no implicit finance field tier invented for stock: pinned FIELD_LEVEL_MODULES contains crm/finance/scheduling, not stock. Preserve existing stock numeric admission; added foreign labels still use their own dataset/field checks.
- ItemLabel = `{itemId:UUID,name:string|null,code:string|null}` with explicit existing missing-item fallback.
- SourceLabel = `{kind:ticket|invoice|purchase|booking,label:string,href:string}` Only if its route AND record are permitted.
- LineWire = `{lineId:UUID,lineNo:number,itemId:UUID,qty:decimalString,uom:string|null,rate:decimalString|null,fromWarehouseId:UUID|null,toWarehouseId:UUID|null}`. Quantities and unlike UOMs are never aggregated. Full entries retain every admitted line in original order.
- EntryLabels = `{humanId:string|null,note:string|null,itemSummary:{first:ItemLabel|null,additionalItemCount:number},itemSearchText:string,lines:LineWire[],partyName:string|null,partyState:available|missing|denied|unavailable,document:SourceLabel|null,sourceState:available|missing|denied|unavailable}`. Full entries carries the exact top-level itemsById/warehousesById dictionaries specified below; they are not additional row fields. This is a projection of approved fields, not a spread of an entry row.
- LedgerLabels = `{entryHumanId:string|null,movementKind:receipt|issue|transfer|adjustment|null,movementKindState:available|missing|denied|unavailable,item:ItemLabel|null,warehouseName:string|null,document:SourceLabel|null,sourceState:available|missing|denied|unavailable,counterpartyLabel:string|null,counterpartyState:available|missing|denied|unavailable,stockUnit:LedgerStockUnit}`. The item heading can supply stable item context; a denied label is not treated as absent source data. `warehouseName` comes from one same-org batch over the distinct `warehouseId` values of the returned rows (at most 50 for the item ledger, 20 for recent), inside the movement snapshot. The batch includes archived warehouses, so an archived referenced warehouse keeps its name; its name octets count in the selected-string budget. No row gives `null`, and the renderer keeps the existing raw-ID fallback. The loaders' active-only `listWarehouses(ctx)` roster is not a label source for these rows.

| Discriminator | entries rows | item_ledger / recent rows | UI, controls and export |
|---|---|---|---|
| full | GlobalBase + EntryLabels | LedgerBase + LedgerLabels | Render allowed complete labels/numerics. Controls as in [Surface-specific controls](#surface-specific-controls-and-url-rules). |
| base_values_only | GlobalBase only; no lines/labels/dictionaries | LedgerBase only | Explicit enrichment unavailable. Entries may use type/status/date/count controls, but all label-dependent controls/export/expansion are disabled; no quantities are claimed for omitted entry lines. Ledger/recent retain exact stored numeric columns and UUID/detail identity. Sort fallback as in [Surface-specific controls](#surface-specific-controls-and-url-rules). |
| identity_only | EntryIdentity only | LedgerIdentity only | Explicit values and labels unavailable. Render entry link and ledger sequence/warehouse identity as applicable; quantity/rate/date/count/note/kind cells show unavailable, never zero or a fabricated empty note. Disable sort/filter/search/export/expand and row actions needing omitted status/type. Keep raw nextCursor paging where the surface has it. |

No extra fields are serialized in a variant. Use an exhaustive projection switch in loaders/renderers so an identity_only row cannot reach a numeric formatter or action predicate. Normal full entries may retain existing permission-governed actions; this feature adds no mutation. Each fallback is page-wide, not a mixture of silently missing individual row fields.

## Exact envelopes and loader placement

EntriesMovementResponse is the exhaustive union of:

- full: `{surface:'entries',projection:'full',rows:(GlobalBase & EntryLabels)[],nextCursor:string|null,enrichmentAvailability:'available',reason:null,itemsById:Record<UUID,{name:string|null,code:string|null}>,warehousesById:Record<UUID,string>}`.
- base_values_only: `{surface:'entries',projection:'base_values_only',rows:GlobalBase[],nextCursor:string|null,enrichmentAvailability:'unavailable',reason:'capacity_limit'}`.
- identity_only: `{surface:'entries',projection:'identity_only',rows:EntryIdentity[],nextCursor:string|null,enrichmentAvailability:'unavailable',reason:'capacity_limit'}`.

The full dictionaries are required even when empty, never optional siblings outside the union. Item keys are exactly same-org existing referenced line item IDs from the admitted page; values contain only name/code. Warehouse keys are exactly same-org existing IDs referenced by admitted line from/to warehouses; values are the admitted name string. Deduplicate keys but retain all referenced line IDs when collecting them, including a second/nonfirst line and both transfer legs. Deleted/missing/foreign rows have no dictionary key and use the existing missing-ID fallback at lookup; a missing label is not a blank available label. No unrelated item/warehouse is serialized. Full expansion reads movement.itemsById[line.itemId] and movement.warehousesById[line.fromWarehouseId/toWarehouseId] for every line. ItemSummary and itemSearchText do not replace these maps. No full-catalog or existing sibling roster is an alternate label source.

ItemLedgerMovementResponse and RecentMovementResponse each have exactly the six common keys. Their full rows are LedgerBase & LedgerLabels; base_values_only rows are LedgerBase; identity_only rows are LedgerIdentity. Their surface is respectively 'item_ledger' and 'recent'; recent nextCursor is always null. They carry no dictionaries: labels and stockUnit are inline full-row fields. Every discriminator has exact keys, and schema/loader tests reject extra fields as well as missing required fields.

The entries page loader returns stock.movements:EntriesMovementResponse plus its existing scoped partyFilter, warehouseCount scalar and customProperties. Replace the legacy stock.entries/itemsById/warehousesById siblings with this one movements union; PageBody reads only stock.movements for movement rows/dictionaries. The entries PageBody's per-row `entryLines()` fetch to `/api/stock/entries/<id>` (`PageBody.svelte:41–52`) is removed: expansion renders the admitted `lines` of the full row and issues no request, and non-full variants disable expansion. `GET /api/stock/entries/[id]` itself is unchanged for its other callers. The independent warehouseCount is the same-org active-only count (org_id=ctx.tenantId AND archived_at IS NULL) and gates the existing transfer action. It cannot supply labels and is not part of the capped movement envelope; referenced archived warehouses remain eligible for authorized historical labels, not this count. Keep its existing authorization and unrelated custom-property contract. The item-detail loader returns stock.movements:ItemLedgerMovementResponse in place of stock.ledger and preserves the unrelated editor/item/bin/supply/tag rosters; the movement renderer cannot use those siblings to bypass a fallback. The overview returns stock.recentMovements:RecentMovementResponse in place of stock.recent and preserves its series/summary/lowStock fields. All three scoped PageBody types and proposed loader/mounted tests adopt these exact placements. This is a selected loader contract change, not a public stock API change.

The 2 MiB cap applies to the entire movement envelope, including common keys, rows, dictionary keys, names/codes, JSON escaping and cursors; unrelated preserved loader datasets have their preexisting separate scope and no new whole-loader cap is claimed. Count selected dictionary text once per distinct admitted key under the existing 1 MiB string bound; include UUID key/JSON overhead in final encoded admission. Full dictionary and ledger-unit materialization occurs inside the same owned REPEATABLE READ snapshot. If full fails admission, omit both dictionaries and every label/unit field according to the exact smaller union; never serialize them as empty maps, null, stale previous-page maps or uncapped siblings. Renderer/export tests must prove no hidden expansion or formatter accesses an omitted map/unit.

## Ledger stock-unit provenance

LedgerStockUnit = `{currentItemUom:string|null,currentState:'available'|'missing',historicalUom:null,historicalState:'not_recorded'}`. This field exists only in full ledger/recent rows. Resolve currentItemUom by a bounded distinct same-org stk_items lookup including archived referenced items, selecting the actual stk_items.uom inside the movement snapshot. Missing/deleted/foreign item yields currentItemUom:null/currentState:missing, without an unscoped existence probe or invented 'unit' default. Stock dataset admission is the existing field floor; no new finance field tier is invented. Count uom octets with every other selected item text before materialization and include each inline stockUnit object in final payload admission. This may select the declared page-wide fallback. In nonfull variants stockUnit is omitted and UI says unit context unavailable, even when exact numeric strings remain present.

Source basis: pg-schema/stock.ts stk_items.uom is the current stock unit; stk_ledger has quantities but no frozen UOM column. stock.logic.ts consumptionToStockQty and stock.service.ts realization convert consumption units into stock quantity before posting. Therefore qtyDelta/qtyAfter are stored stock quantities, not the entry line's arbitrary entered UOM. Rate is per stock quantity; no new conversion/recomputation is selected. Entry LineWire.uom is its recorded nullable entry-line unit and remains independent. Never join a line merely to relabel ledger quantities with its entered UOM, and never apply the current conversion factor to historical ledger rows.

Because item units can be edited, currentItemUom does not prove the unit at posting. In full ledger/recent show the exact stock quantity plus separate translated context “Current stock unit: {uom}” / “Unidad de stock actual: {uom}” and “Unit at posting not recorded” / “Unidad al registrar no guardada”. Do not concatenate a historical quantity with the current unit as if frozen; historicalUom stays null, including when current and entered units happen to match. Missing current unit uses a translated missing label, not an inferred conversion. Entries expansion displays each recorded LineWire.qty/uom together with a distinct missing-unit state for null; no cross-line totals are added.

Require ordinary reader/loader/exact-key/mounted assertions and cases within the sixth existing native behavior (no seventh behavior/name). A full entry has at least two different items/warehouses; expand its nonfirst line, find the admitted name/code and both transfer warehouses through the required maps, and verify absent/foreign keys use only missing fallback. Assert full map keys are exactly admitted references and every fallback omits maps and inline label/unit fields, including after Older navigation from a full prior page. Verify byte thresholds include large second-item names, warehouse labels, escaped text, UUID keys and long UOM strings, with no over-budget fetch or sibling leakage.

Mixed-unit fixtures: an item currently uses caja with consumption ml and a conversion factor; an entry line records a different entered unit while ledger qtyDelta/qtyAfter remain exact stored stock quantities. Current-unit lookup renders only current context; historical state remains not_recorded. Change the current item unit between requests, assert stored ledger strings are unchanged and only current context changes; under the concurrent-growth snapshot test the first request keeps its original UOM context and the next sees the new value/fallback. Include archived, missing and foreign item lookups, null entered UOM, two items with distinct current units, and no aggregation/conversion of unlike units. No schema migration or historical-unit backfill is selected.

## Capacity and numerical meaning

Choose full only after line/string/output admission. Count before materializing arrays, including humanId/note/UOM and all selected text/decimal byte contributions; full JSON/dictionaries must fit 2097152 UTF-8 bytes and existing 10000-line/1048576-string limits. If full exceeds a bound, build the exact base_values_only variant; it contains no entry line array, notes, metadata or label dictionaries. Pre-count base numeric byte sizes too. If base exceeds the output cap, emit identity_only; its at-most 50 UUID/ledger sequence identities/cursors have a fixed small bound. Never fetch oversized decimal/text bodies just to truncate them in JS. A failed count/read is a real error, not fabricated capacity_limit.

Numeric preservation means: every numeric field that is serialized is byte-preserved from the database; base_values_only ledger rows retain every LedgerBase numeric fact. It does not mean every fact is always available. identity_only deliberately omits all numeric facts beyond identity/count-free sequence, and global base_values_only omits line quantities entirely. Show the omission state and detail links; do not claim those values were displayed, zero or unchanged by projection. The underlying ledger/bin/payment records remain untouched. Tests compare exact available strings and assert absent omitted fields/formatter non-use, not equality against a nonexistent value.

For recent rows, preserve the existing 20-row query semantics but add listRecentMovementRows(ctx,{limit:20}) in stock-entries-read.service.ts with explicit ledger id::text projection, used only by the overview loader. Do not recover identity from a lossy StkLedgerRow.id Number. Existing getRecentLedger/getLedger/listEntries and public API callers outside these selected loaders remain unchanged; their legacy behavior is not described as fixed. The new ledger page similarly casts sequence before the driver. Existing UI getRowId string handling accepts the derived lossless field.

## Surface-specific controls and URL rules

This section is the single statement of which controls each surface has; other documents link here.

| Surface | Sorting | Search, filters, export | Paging |
|---|---|---|---|
| Global entries | Existing sortable headers, including ascending date, over the current page only | Existing search, type/status/advanced filters and export, current page only ([behavior.md](contracts/behavior.md#exact-local-control-scope-and-cursor-ownership)) | Older/Newest over the raw server cursor; display sorting and filtering never move the cursor |
| Item ledger | None: every column keeps its existing `sortable:false` | None; no toolbar is added | Older/Newest |
| Overview recent | Existing item, warehouse and qtyDelta header sorting over the 20 admitted rows (its `recentColumns` omit `sortable:false`, and DataTable sorts by default) | None; no toolbar is added | None; fixed 20 rows, no pager |

Under a fallback variant, recent clears or disables a sort whose column becomes unavailable instead of sorting unavailable text; qtyDelta sorting stays only where numeric values exist, and identity_only disables every sort. The item ledger stays nonsortable in every variant. The global entries variants disable controls as the variant table above states. Every surface shows the existing current-window notice: recent sorting covers only its 20 rows, never full stock history. Add only the controls in this table; do not add fields or controls to make a shared test matrix pass.

Reload/reopen an explicit URL retains its cursor (`?cursor=` or `?ledgerCursor=`) and the corresponding raw page. Only an explicit Newest action removes that surface's cursor; a URL with no cursor loads newest. Browser-back restores the actual prior URL/cursor. Insertion/backdating can change results, so this is not a frozen export snapshot. A redirect must not silently clear a valid cursor.

Global oracle: 101 records over 50/50/1, selected type/status match only page 2, ascending date orders those page 2 matches locally, export contains only allowed current-page matches, Older remains available when visible matches=0. Ledger oracle: 101 rows including repeated entryId, tied/microsecond timestamps, two warehouses and ledgerId beyond 2^53; traverse 50/50/1 with every ledgerId exactly once, replace the page in canonical postedAt/sequence order, preserve stored qtyAfter and reload/back cursor, and assert no new sort/filter/search/export chrome. Recent oracle: 20 rows keyed by exact ledgerId with unchanged limit and existing item/warehouse/quantity header sorting restricted to those 20, including ascending/descending and unavailable-sort fallback. All three test full/base_values_only/identity_only at exact byte boundaries, actual omitted fields, duplicate-entry distinct ledger rows, safe detail links and zero underlying writes.


## Preserved dates, notes and source kind

GlobalBase.postedAt is the stored nullable posting timestamp, distinct from createdAt/cursor order; preserve the existing posted column, sorting/export and null fallback. Full EntryLabels.note is the original permitted nullable note, including the existing default-hidden/saved `note` column key. Count its UTF-8 bytes before materializing labels; a too-large note uses the declared fallback with explicit note-unavailable, never a silently retired column or an empty-string assertion. Existing saved columns remain valid. No new note search or PII policy is inferred from this stock-owned preexisting field.

For item-ledger/recent full labels, add one same-org stock-dataset batch over their at-most 50 distinct entry IDs (20 recent) selecting id,type and admitted humanId. movementKind is the header's entry type, never guessed from positive/negative qtyDelta; transfers and cancelled-entry reversing rows retain their actual type. Missing/inaccessible header yields null plus explicit missing/denied state and localized unknown-kind fallback, not an invented type. Nonfull variants show kind-unavailable as their projection specifies. Add allowed/missing/foreign/transfer/reversal fixtures; hidden foreign headers never supply a label/type. This is stock header context, not a foreign dataset permission shortcut.

The exact keysets above remain unchanged. contracts/valuation-display.md is normative: stock scalar denomination is unverified; selected movement cells/accessors/accessible text/export preserve raw strings without default-PEN or billing-currency formatting. Missing values remain unavailable, and current display settings are not historical stock evidence.

### Review artifact: quickstart.md

# Quickstart validation: Readable stock movements

## Preconditions

Owner approval is pending. These are instructions for a future isolated Hub candidate. Read Hub AGENTS.md and docs/qa-stack.md; verify candidate HEAD and registry master/Bun. Use synthetic data and guarded loopback QA only, never a production-backed `bun run dev`. Inspect `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack.

## Focused executable checks

The test file list and the complete focused command live only in [implementation-inventory.md, Focused test command](implementation-inventory.md#focused-test-command). Run that command from the Hub checkout once the proposed files exist. A passing baseline test is not a reproduced fix: first capture a failing assertion or counterexample for the actual missing behavior, then run it on the candidate. The native PostgreSQL lane has its own command [below](#native-snapshot-and-label-admission-qualification-mandatory-us1).

## Scenario and oracle

Seed local synthetic M and L items, single/multi-item receipt and issue, transfer, cancelled entry, booking/POS/invoice/purchase sources, archived and missing references, and a foreign-tenant decoy. Compare allowed, CRM-denied, owner-scoped, masked and no-stock personas. At 390px and desktop, search each item name/code and stable entry code on the global entries page only, and expand its admitted multi-line rows without any `/api/stock/entries/<id>` request; inspect the item ledger and recent card with the controls listed in [wire.md](contracts/wire.md#surface-specific-controls-and-url-rules); open via keyboard; inspect network JSON and exported cells for denied labels. Compare added statement counts for 1 versus 50 movement rows, with identical source kinds.

For each allowed journey also execute direct API and navigation attempts for denied/owner/foreign controls. Capture status, actual loader outcome and redacted payload assertions. A 200 document shell alone does not prove route authorization or a successful data load. For this read-only feature, compare authoritative stock, payment and source-record hashes before and after paging/search/export; they must remain unchanged.

## Browser acceptance

Read and use browser-harness. Use a unique named isolated browser when work is concurrent; never share tabs/processes with another agent. Test desktop and 390px, Spanish/English, light/dark, keyboard-only operation, and fresh reload. Observe accessible labels and focus, empty/error/denied states, row/link behavior and persisted preference scope. Login/MFA/account ambiguity stops actions until the resolved account is confirmed; preserve private session access details outside committed docs.

## Full qualification and result recording

Run required Hub `bun run check`, `bun run test`, `bun run build`. For UI edits run `bun run lint:design && bun run lint:tokens`; for message edits run `bun run i18n:compile`. Required route/RBAC manifest checks are part of the candidate's current scripts; read package.json rather than invent a command. Record commands, exit codes, candidate hash, fixture matrix, screenshots and unresolved gates in a validation receipt beside this feature. Do not mark implementation done until its scoped outcomes pass. Production release and affected-account checks are separate owner-gated evidence.

## Capacity acceptance

Execute both 101-row equal-timestamp 50/50/1 cursor matrices in contracts/behavior.md, including unsafe-range bigint ledger IDs, party/item cursor binding, two warehouses and insertion between pages. Execute every line/string/serialized-byte boundary and the 100000-unrelated-item fixture. Inspect SQL and movement payloads: no unbounded listEntries/getLedger call, no whole-catalog itemsById, no missing/duplicate IDs, authoritative qtyAfter unchanged, page-local search/export labels on global entries only, complete nonfirst-item search on admitted entry pages and explicit unavailable state on overflow. A constant query count alone is not a capacity pass.


## Multi-page local control semantics

Create 101 canonical records over 50/50/1 so a selected status and type appear only on page 2. On page 1 choose ascending date and those filters (plus an authorized item-name query), observe the explicit page-only empty-match/scope notice and an enabled Older action derived from raw nextCursor. Navigate Older: controls remain, matching permitted rows appear sorted ascending within that raw page, and export includes only its admitted matching rows. Navigate Newest: same controls, newest raw page, no false whole-history no-record claim. Clear controls and traverse all raw pages to assert every ID once in canonical descending server order, unaffected by prior ascending display sort. Repeat the global control cases on each global capacity variant; use the distinct wire.md ledger traversal oracle, keyboard access, local table-pagination/group/aggregate controls where already present, browser-back and owner/account/party/item changes. Selection/expansion must clear when raw page changes; saved columns keep their existing owner scope. A full reload uses current view-memory semantics and is not claimed cross-device persistence.

Capture translated scope notice in both languages and its accessible equivalent. Do not assert only search/export scope while leaving sort/type/status filters labeled as complete-history operations. Verify displayed count/aggregate descriptions and zero-match guidance remain visible even when DataTable has no local matches.

US1/MVP qualification includes both cursor matrices, scope/empty-match notices, overflow rendering and every existing-control compatibility case before restricted readers reach users. A US1-only release excludes only the optional new all-line item-name/code search, never paging/navigation or honest scope.


## Wire availability and ledger-specific acceptance

Follow contracts/wire.md: validate exact discriminated keys for full/base_values_only/identity_only, not one optional-field row type. Test numeric and label byte admission independently; available numeric strings are identical to stored values, while absent line/value fields are actually absent and rendered unavailable without calling numeric formatters or producing 0. Every ledger variant, including recent, carries exact string ledgerId; repeated entry IDs and sequences beyond 2^53 stay distinct. Test the new selected recent projection helper rather than String of a lossy driver Number.

Global entries alone gets the current-page type/status/ascending-sort/filter/export oracle. Item ledger: 101 rows over 50/50/1, tied/microsecond times, two warehouses and repeated entry IDs, stored qtyAfter unchanged and exact ledger IDs once. Reload a valid cursor URL and browser-back: retain that raw page; only explicit Newest clears the cursor. Recent stays 20 rows. Exhaustively inspect network/render/export behavior for every variant and assert source records remain unchanged.


## Existing-column compatibility and exact change inventory

Add source/render fixtures for global postedAt distinct from createdAt, nullable postedAt, and an already saved visible note column with a permitted note versus an over-budget note. Full wire/render/export preserves those columns; fallback states say unavailable instead of empty note. Verify actual movementKind for receipt/issue/transfer/adjustment and a cancelled-entry reversal via same-org batched headers; missing/foreign header never supplies a fabricated kind. Check each surface's sorting, including fallback sort clearing, against [wire.md, Surface-specific controls](contracts/wire.md#surface-specific-controls-and-url-rules).

Create/modify only the explicit files and conditionally needed QA fixtures in [implementation-inventory.md](implementation-inventory.md). Record exact local QA seed status when existing fixtures suffice; no global seed reset or generic DataTable change is authorized just to make tests pass.


## Native snapshot and label-admission qualification (mandatory US1)

Implement contracts/admission-snapshot.md's six exact requiredBehaviors and manifest minimumAssertions=6/exactAssertions:true after qualifying the F7-owned [shared exact-count harness](../128-faces-receivables-audit/contracts/native-exact-count.md); update both existing manifest/report tests, including extra seventh behavior rejection, and retain all legacy rows/lanes. This is a test-harness dependency only. Ordinary Vitest excludes *.sql.integration.test.ts, so its focused green result is not SQL/snapshot proof.

Use the concrete owned child database and actual admission harness below, selected because real authority/navigation helpers contain public-qualified SQL. A search-path-only schema is not the selected fixture. Both owned controller and separate full-schema QA targets remain required by the whole lane.

1. Qualify the explicit loopback minion_qc controller with openDisposablePostgres, actual minion-360-disposable:v1 marker, expected owner and opt-in before DDL. Follow F7 quickstart.md's exact controller/CREATEDB/existing non-bypass app_ledger/SET ROLE checks; missing privilege fails before DDL, never changes global role attributes or skips. Create only minion_qc_faces_movements_<32hex>, validated against ^minion_qc_faces_movements_[a-f0-9]{32}$; set its marker, derive URL by changing only validated controller database path, and requalify actual child identity/marker. Never use another application target.
2. Seed canonical public organizations/profiles/members/roles/rules/modules/nav settings plus stock/source/party/contact tables using real schema/RLS conventions. Controller owns setup and the short fresh-capability fixture-admission transaction. Preserve baseline organizations/profiles ACL and RLS: do not grant app_ledger organization SELECT or profile/member UPDATE, and do not add permissive app.current_* policies to replace auth.uid()-based profile policy. Business movement reports alone use actual app_ledger/org/profile GUCs through withOrgCoreTransaction. Real public-qualified authority/navigation SQL stays unchanged. The new child must support actual fresh capability composition, getCoreCtx/datasetCtx/partyReadScope, native route projection and movement source queries, not a copied admission model.
3. Install only the bounded test-local pg-client factory override in stock-movements-read.sql.integration.test.ts: partially import the actual module and override getCoreDb to return the current qualified child Drizzle handle (throw if no fixture binding); retain actual getOrgTransactionDb/withOrgCore/withOrgCoreTransaction and all authorization functions. The injected Drizzle is unmarked, so actual getOrgTransactionDb preserves it rather than choosing managed global RLS pool. Never mark a fixture handle with MANAGED_CORE_DB or replace getOrgTransactionDb with a permissive fake. Install throwing/asserted sentinels for pg-pool getPgClient/getRlsPgClient/getCriticalPgClient and supabaseAdmin/global remote client fallbacks. Record fallback-attempt counters separately: loadNav catches failures, so throwing alone cannot prove a fallback was not attempted. Require every counter to remain 0. No stubbed datasetCtx/partyReadScope/resolveCapabilities/loadPermissionsForUser/decideRouteAccess result.
4. Build real capabilities from the seeded child rows using actual resolveFreshCapabilitiesInTransaction and actual composer inside a short owned child transaction; current locking default is permitted in this READ WRITE fixture-admission transaction and is not used inside the movement READ ONLY snapshot. Commit it before movement acquisition. Use actual runWithRequestCapabilities({orgId,profileId,capabilities:fresh.capabilities,platformAdmin:false},async()=>...) to bind those real closures, with authenticated locals.tenantCtx and user.supabaseId/role='user'. Then actual datasetCtx/getCoreCtx/partyReadScope and native permission projection execute against the same factory-bound child. No hand-built allow-all caps, prior cache or owner shortcut is accepted. Different-persona/policy cases seed separate org IDs or recompute exact fresh composition and new ALS request after changes. Test allowUnlinked through actual apiReadCapability alternatives, owner scope and finance-tier behavior. This fixture uses the existing locking fresh function and creates no product runtime dependency on a future F7 module.
5. Assert actual current_database/backend identity on every owned admission/movement connection. Distinguish controller-role fixture-admission receipts from actual app_ledger business REPEATABLE READ/read-only/org/profile receipts; require same child target, never falsely label controller reads app_ledger. Add baseline negative probes: app_ledger cannot SELECT organizations or UPDATE membership/profile rows, and without JWT-sub context profile self-select reveals no row. capture sanitized query trace proving all statements reached the child. Scope the factory binding/ALS to the current sequential test/request and restore mocks in finally; no concurrent persona shares mutable fixture binding. Independent writer connection uses the same owned child, acknowledged barriers after count, and commits insertion/text growth before materialization. First snapshot stays unchanged, next request chooses proper fallback. Test no PII, exact complete labels/variants, actual write refusal, both connection cleanup and 0 fallback attempts.
6. Finally release barriers, rollback/close all owned child handles, drop only the recorded validated owned child database through admitted controller, assert absence, close controller. Never drop/reset controller/shared QA or its public tables. Native fixture/role/marker failure fails qualification, never optional skip. The complete lane additionally uses its separately owned full-schema QA target for other existing suites.

After resolving private F4_DISPOSABLE_DATABASE_URL and F4_FULL_SCHEMA_QA_URL from those admitted fixtures, run the complete lane without a single-file filter:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F4_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F4_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/stock-movements-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/stock-movements-qa-native.json
```

All admitted lane suites/behaviors must pass with zero skipped/todo/missing results; a filtered development run is labelled focused and cannot count as complete-lane qualification. Capture exact candidate, fixture identity/ownership, query counts including setup/restore, byte totals, isolation/read-only/scope and failure cleanup. Basic authorized party names remain visible to maskSensitive; never assert all such names are forbidden. Source client/contact/supplier fields are not inferred when entry.partyId is null.


Before public baseline profiles/member/org policy or FK DDL, apply F7 [complete test-only native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md): exact full-lane `pgvector/pgvector:0.8.6-pg18` / `minion_qc_vectors` controller, owned child auth schema/users/uid STABLE SECURITY INVOKER with canonical owner/ACL/JWT semantics, seed auth user before profile/email/FK. No app_ledger extra grants/policies/JWT subject. The shared test helper/SQL fixture is owned by F7; reuse that qualified recipe, with no F7 runtime/stock-bridge dependency introduced for movement/navigation. Bare child PostgreSQL plus public policy text alone is not a runnable fixture.

Run the [wire contract](contracts/wire.md) matrices on all three surfaces. Ordinary/mounted and sixth-native-behavior checks include each selected nonfirst-line, unit, dictionary and byte-boundary counterexample.

Qualification additionally follows contracts/valuation-display.md: synthetic USD billing plus changed display-currency settings must not cause a currency symbol/code in movement stock cell/accessor/CSV/accessible output. Confirm exact raw strings/localized unverified caption and unavailable null/nonfinite/omitted cases. In the browser, export a page holding a two-line entry and compare its `lineDetails` cell with the [CSV export schema](contracts/valuation-display.md#global-entries-csv-export-schema). Unrelated valuation cards/charts are outside this movement claim.

### Review artifact: tasks.md

# Tasks: Readable stock movements

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/wire.md, contracts/admission-snapshot.md, contracts/valuation-display.md, quickstart.md and implementation-inventory.md in this directory. [implementation-inventory.md](implementation-inventory.md) is the single file and test authority.
**Status**: Specification only; all execution tasks remain unchecked. Tests are required by this spec. Hub paths below are relative to minion_hub unless prefixed specs/.

## Phase 1 — Setup

- [ ] T001 Record owner spec approval, exact execution scope and independent-review result in `specs/125-stock-readable-movements/validation.md` before any implementation action.
- [ ] T002 Verify candidate hash, master PR base/Bun from repo-policy and local QA ownership using `docs/qa-stack.md`; obtain an authorized isolated feature checkout without altering shared WIP.

## Phase 2 — Foundational evidence

- [ ] T003 Re-read all anchored sources in `specs/125-stock-readable-movements/research.md`; classify supported behavior versus reproduced gap and record candidate differences in `specs/125-stock-readable-movements/validation.md`.
- [ ] T004 Prepare the synthetic persona/entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not already cover it; record which existing fixtures were reused in `specs/125-stock-readable-movements/validation.md`.
- [ ] T005 Verification only, no code change to `src/server/services/rbac.service.ts` or `src/hooks.server.ts`: record in `specs/125-stock-readable-movements/validation.md` the existing module, route, owner and field-masking gates (file:line on the candidate) that the read-only movement projections rely on. The executable proof is native behaviors 1 and 2 in `src/server/services/stock-movements-read.sql.integration.test.ts` (run in T009) and the denied/foreign loader cases in `src/routes/(app)/stock/entries/page.server.test.ts` (T010). Stop for an owner-reviewed amendment if a security gap is found.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: An authorized operator sees a readable item/variant summary, movement kind and permitted source/counterparty context beside a secondary stable code.
**Independent acceptance**: Open item ledger, global entries and recent movements in the fixture independently; identify Faja M versus Faja L and the source without expanding every row.

- [ ] T006 [US1] Capture an executable failing regression or supported-behavior baseline for Story 1 in `src/server/services/stock-entries-read.service.test.ts`; follow the exact fixture/denial oracle in `specs/125-stock-readable-movements/quickstart.md`.
- [ ] T007 [US1] Implement both `listEntriesPage` and `listItemLedgerPage` with exact 50-row cursors, party/item binding and capacity admission per contracts/behavior.md, then extend batched line/item/source labels in `src/server/services/stock-entries-read.service.ts` using the exact per-source native/record admission and single owned snapshot in contracts/admission-snapshot.md, including `countEntryAttachmentsInTx` and the page-qualified ledger/recent warehouse label batch; preserve each line quantity/UOM and optional authorized source/party fields, never aggregate distinct UOM.
- [ ] T008 [US1] Deliver the complete atomic US1 loader/render/navigation integration in `src/routes/(app)/stock/entries/+page.server.ts` and the exact companion paths in `specs/125-stock-readable-movements/implementation-inventory.md`; a bounded reader cannot ship without all following substeps.

  Loaders: remove full catalog/warehouse roster reads and the `countAttachmentsByObjects` call; add bounded party and same-org entry-type batches; use full/base/identity DTOs and SQL-cast ledger IDs, with selected recent 20 projection helper.

  Rendering: update the three existing PageBody surfaces exhaustively by wire discriminator; preserve global postedAt/default-hidden note columns and complete permitted lines, show actual movementKind/fallback, and keep each surface's controls as listed in contracts/wire.md (Surface-specific controls).

  Required navigation/state: add both paged readers' Older/Newest, raw-cursor/state preservation, translated scope/zero-match/capacity notices and disabled unavailable controls/actions. Implement all these as one mandatory US1 acceptance slice.

- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus the mounted/source regression in `src/server/services/stock-entries-read.service.test.ts`; run the six admitted native PostgreSQL behaviors with minimumAssertions=6/exactAssertions:true after shared F7 harness qualification and the complete-lane report in quickstart.md, including two-backend insert/text-growth, actual partyReadScope and ambient/failure cases; prove both 101-row 50/50/1 cursor matrices, later-page-only type/status matches, ascending date display, zero local matches retaining Older navigation, overflow and principal/scope reset, one-active-plus-archived warehouseCount=1/Transfer hidden and two-active transfer availability; record before/after evidence in `specs/125-stock-readable-movements/validation.md`.

## Phase 4 — User Story 2 (P2)

**Goal**: Staff find movements by item name, item code, entry code or a permitted counterparty label and can open the linked detail using a keyboard.
**Independent acceptance**: Search independently for Faja M, its item code, ENT code and allowed party label; check denied and masked personas.

- [ ] T010 [US2] Extend `src/routes/(app)/stock/entries/page.server.test.ts` and `src/routes/(app)/stock/entries/page.movements.mounted.test.ts` with the global-entry search-state, same-scope Older/Newest/reload persistence, principal/scope reset and forbidden-path counterexamples. Keep overview tests scoped to its separate recent-20 behavior; prove the counterexample before claiming a fix.
- [ ] T011 [US2] Add complete admitted all-line item-name/code search to `src/routes/(app)/stock/entries/PageBody.svelte` using the permitted projection already supplied and bounded by US1; keep search/export/accessibility values identical and preserve saved columns. Existing-control scope, navigation, unavailable rendering and state compatibility are mandatory US1 work in T008, not optional US2 prerequisites.
- [ ] T012 [US2] Exercise both cursor matrices with global-only later-page status/type plus ascending local sort/zero-match Older navigation, and the separate ledger replacement/lossless-ID/qtyAfter/reload-cursor oracle from contracts/wire.md; test exact full/base/identity shapes and omitted-value rendering, large unrelated catalog, exact capacity boundaries, reload, denied state and account-switch cases from `specs/125-stock-readable-movements/quickstart.md`; compare authoritative records and record the result in `specs/125-stock-readable-movements/validation.md`.

## Phase 5 — Polish and qualification

- [ ] T013 Add or update any needed translated labels in `messages/en.json` and `messages/es.json`, run `bun run i18n:compile`, and ensure semantic tokens/shared primitives for every changed UI file listed in `specs/125-stock-readable-movements/implementation-inventory.md`; skip catalogs only if no label change is needed and record why.
- [ ] T014 Run full Hub check/test/build and UI design/token gates from `package.json`; save exact-candidate exit codes and any proposed new harness paths in `specs/125-stock-readable-movements/validation.md`.
- [ ] T015 Qualify the browser acceptance matrix through Browser Harness and real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/125-stock-readable-movements/evidence/` and summarize scope in `specs/125-stock-readable-movements/validation.md`.
- [ ] T016 Obtain owner merge approval for the concrete diff, complete separately authorized release/runtime verification, and reconcile remaining work with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`; if implementation leaves an open code issue, add its exact-site TODO(handoff) plus proposal entry before handoff.

## Phase 3 additions — User Story 1 (run after T008, before T009)

- [ ] T017 [US1] In `src/routes/(app)/stock/entries/PageBody.svelte`, remove `linePromises`/`entryLines()` and its per-row `fetch('/api/stock/entries/<id>')`; expansion renders the admitted lines from `stock.movements` and is disabled in non-full variants, per contracts/wire.md (Exact envelopes and loader placement). In `src/routes/(app)/stock/entries/page.movements.mounted.test.ts`, stub `fetch` and assert that expanding a full row with two lines, including after Older navigation, makes zero `/api/stock/entries/:id` requests. `src/routes/api/stock/entries/[id]/+server.ts` is unchanged.
- [ ] T018 [US1] Add the `lineDetails` export column to `src/routes/(app)/stock/entries/PageBody.svelte` and its header messages to `messages/en.json` and `messages/es.json`, exactly as the CSV export schema in contracts/valuation-display.md specifies; add that contract's export test to `src/routes/(app)/stock/entries/page.movements.mounted.test.ts`. DataTable.svelte and table-export.ts are unchanged.

## Dependencies and parallel opportunities

T001–T005 block implementation. T006 → T007 → T008 → T017 → T018 → T009 qualifies US1 only with the complete paging/navigation/scope/overflow/control-state unit and its multi-page acceptance checks. T010 → T011 → T012 qualifies US2 after the common foundation; begin it after US1 if shared source files would conflict. T013–T016 qualify the approved slice being released: US1-only MVP still requires every applicable translation, full-check, browser and owner-release gate, while US2 is not an implementation prerequisite for that complete US1 slice. A combined release qualifies both stories. No task is marked [P] because the candidate's shared files and test fixtures have not been assigned independent owners. After ownership is proven, independent review of source contracts and fixture planning can run concurrently without editing those same files; no unsafe parallel saves or shared browser are implied.

## Implementation strategy and completeness

Story 1 includes the complete restricted-reader navigation and existing-control unit; it may never ship as an unreachable newest-50-only view. Story 2 adds optional new item-name/code search. MVP is Story 1 only, subject to all approval/permission gates; verify existing behavior before coding. Story 2 ships only with its independent acceptance evidence. Each requirement maps to the Story 1/2 source contract and quickstart matrix, with T005/T009/T012 covering authority and T013–T015 covering i18n, tokens, browser and persistence. Eighteen unchecked tasks: setup 2, foundation 3, US1 6, US2 3, polish 4. All task rows contain a sequential ID and exact path. Review evidence lives under `egm/`.

All tasks that preserve numeric facts follow the explicit availability discriminator, never an assertion that identity-only includes values. Controls follow contracts/wire.md (Surface-specific controls). Reload respects cursor; Newest alone clears it.

T006–T009 also deliver and qualify the entire exact admission/snapshot contract, its transaction-accepting source/party/attachment seams, native suite and manifest/report tests enumerated in implementation-inventory.md. These are mandatory US1 work before any limited-reader release.

T007–T012, T017 and T018 follow the [wire contract](contracts/wire.md) for exact field placement, unit provenance and fallback omissions; its scenario matrices remain required acceptance conditions.

The existing movement rendering/export/i18n/qualification tasks also implement contracts/valuation-display.md: raw stock values with unverified-denomination caption, safe calculated scalar with no 0 fallback, no inferred currency, exact CSV/accessible outputs, unchanged recent columns and denied/omitted branches. Extend the existing six native behaviors.

### Review artifact: checklists/requirements.md

# Specification Quality Checklist: Readable stock movements

**Purpose**: Author validation of requirements, not implementation qualification.
**Created**: 2026-11-16
**Feature**: [spec.md](spec.md)

## Content Quality

- [x] No implementation algorithms, APIs or framework choices in functional requirements.
- [x] Focused on user value and business needs.
- [x] Requirements and user scenarios are written for non-technical stakeholders.
- [x] All mandatory sections completed; source evidence and workflow metadata are separate from requirements.

## Requirement Completeness

- [x] No unresolved design clarification markers remain; runtime identity checks have explicit stop/no-op rules.
- [x] Requirements are testable and unambiguous.
- [x] Success criteria are measurable.
- [x] User-visible success criteria are technology-independent; query-count qualification is an explicit technical constraint in the plan.
- [x] Acceptance scenarios are defined for both user stories.
- [x] Edge cases are identified.
- [x] Scope is bounded to the parent proposal item.
- [x] Dependencies and assumptions are identified.

## Feature Readiness

- [x] Every functional requirement is covered by scenario, contract or quickstart oracle.
- [x] User scenarios cover primary flows and denied states.
- [x] Requirements define measurable outcomes; running-application proof is a separate pending execution gate.
- [x] Implementation choices are confined to technical companion artifacts and evidence references.
- [ ] Owner approval before implementation: pending.
- [x] Independent review results and dispositions are recorded under `egm/`; completion/verdict is separate from owner approval.

## Notes

Author validation iteration 1: requirements checked against source and parent proposal; source support, reported behavior and unproven runtime observations are distinguished. Unchecked execution/review gates are deliberate and block implementation claims, not preparation of review material. This author checklist does not replace the independent findings and dispositions under `egm/`.

### Review artifact: implementation-inventory.md

# Exact F4 implementation inventory

This file is the single authority for the feature's source and test files and the focused test command; plan.md, quickstart.md and tasks.md link here. Paths are Hub-relative unless explicitly prefixed specs/. This is the selected future diff, not files changed during authoring. Create means absent at the pinned source; if the exact file exists on the implementation candidate, extend it rather than create a duplicate. Source drift and equivalent harness reuse are recorded before code, not silently substituted. No Delete action is selected.

| Action | Exact file | Responsibility / explicit no-change condition |
|---|---|---|
| Modify | src/server/services/stock-entries-read.service.ts | Both fixed-order paged readers, new selected recent 20 lossless projection, exact per-surface DTO/dictionary placement and current-stock-unit provenance types/serializers, byte/line admission and same-org header type batch; page-qualified ledger/recent warehouse label batch including archived warehouses; `countEntryAttachmentsInTx`; resolveMovementAdmission, per-source Tx batches and withMovementSnapshot owned REPEATABLE READ read-only adapter per contracts/admission-snapshot.md. Always needed for the selected bounded readers. |
| Modify | src/server/services/party.service.ts | Bounded listPartyLabelsForReadInTx and same-predicate byte aggregate under actual owner/allowUnlinked policy; basic names remain admitted under maskSensitive; if a semantically identical bounded batch already exists on candidate, reuse and record no change. |
| Modify | src/routes/(app)/stock/entries/+page.server.ts | Adopt stock.movements exhaustive union with full-only page-qualified dictionaries; remove this loader's full catalog/warehouse roster calls only. |
| Modify | src/routes/(app)/stock/items/[id]/+page.server.ts | Adopt stock.movements bounded lossless ledger/current-unit projection; keep unrelated item editor rosters/queries unchanged. |
| Modify | src/routes/(app)/stock/+page.server.ts | Use stock.recentMovements selected lossless recent 20/current-unit projection, preserve aggregate/summary datasets and 20-row limit. |
| Modify | src/routes/(app)/stock/entries/PageBody.svelte | Wire-discriminated rows, existing postedAt/note keys, summary/source, global page-local controls, cursor navigation and unavailable states; raw unverified-denomination rate/calculated scalar display/accessors without money formatter or zero fallback; `lineDetails` export column per the CSV export schema in contracts/valuation-display.md; remove `linePromises`/`entryLines()` and its per-row `/api/stock/entries/<id>` fetch. |
| Modify | src/routes/(app)/stock/items/[id]/PageBody.svelte | Plain nonsortable ledger, exact ledgerId keys, source-kind/unavailable cells and Older/Newest only; no new toolbar; raw valuation-rate display with localized unverified denomination, preserving original strings. No valueDelta column is added. |
| Modify | src/routes/(app)/stock/PageBody.svelte | Preserve existing recent header sorting on 20 rows, add authorized kind/context/detail identity and projection fallbacks; no new pager/search/filter/export. |
| Modify | src/server/services/stock-entries-read.service.test.ts | Actual reader/query/cursor/budget/shape/type/lossless-ID oracle tests; no false full-history/global-sort assertions. |
| Modify | src/server/services/party.service.test.ts | New batch's allowed/denied/owner/foreign/limit cases; no change only if exact existing equivalent batch/tests are reused and documented. |
| Modify if source helper needs change | src/lib/components/stock/entry-document.ts | Reuse existing resolver; keep unchanged if its exact allowed source projection already satisfies the contract. Do not duplicate it. |
| Modify / reuse | src/lib/components/stock/entry-document.test.ts | Preserve existing source-kind and unavailable-link regression; add only demonstrated missing fixture. |
| Create | src/routes/(app)/stock/entries/page.server.test.ts | Loader no-full-catalog, party/cursor and exact payload variants/full-only dictionaries/nonfirst-line labels; extend same-path candidate file if it exists. |
| Create | src/routes/(app)/stock/items/[id]/page.server.test.ts | Lossless fixed-order ledger/current-unit page and no full getLedger/dictionary source; extend same-path candidate file if present. |
| Create | src/routes/(app)/stock/page.server.test.ts | Recent 20 exact-ID/type/current-unit/budget and unchanged overview aggregates; extend same-path candidate file if present. |
| Create | src/routes/(app)/stock/entries/page.movements.mounted.test.ts | Global page-local controls/zero matches/raw cursor/postedAt/note/unavailable renderer and keyboard interactions; zero `/api/stock/entries/:id` requests on expand; `lineDetails` CSV schema test from contracts/valuation-display.md. |
| Create | src/routes/(app)/stock/items/[id]/page.movements.mounted.test.ts | Plain nonsortable ledger page replacement, duplicate-entry exact IDs, no invented toolbar and unavailable fields. |
| Create | src/routes/(app)/stock/page.movements.mounted.test.ts | Recent retained 20-row header sorting, source-kind and variant-aware disabled sorts; no new toolbar. |
| Modify | messages/en.json | Translated page-scope/Older/Newest/zero-match/label-value-kind unavailable text; retain existing date/note/type labels. No change only if every needed existing message is reused and recorded. |
| Modify | messages/es.json | Same keys/semantics as English. Existing labels reused where exact; no change only when every needed message already exists and usage is recorded. |
| Generated by i18n:compile | src/lib/paraglide/ | Regenerate using existing command after catalog changes; never hand-edit generated modules. No generated diff if catalogs unchanged and compile proves current output. |
| Modify only if fixtures absent | scripts/qa/seed/stock.ts | Synthetic cursor/byte-boundary/multi-entry/variant/type fixtures; existing fixtures reused if exact cases already covered. No live rows imported. |
| Modify only if fixture identifiers/personas needed | scripts/qa/seed/ids.ts | Existing pure deterministic IDs, no second generator; otherwise unchanged. |
| Modify only if fixture matrix entry needed | scripts/qa/seed/matrix.ts | Register owned synthetic fixture/persona cases; otherwise unchanged. Do not reset shared QA. |
| Create | src/server/services/stock-movements-read.sql.integration.test.ts | All six exact native behaviors in contracts/admission-snapshot.md: actual owned-child public fixtures, partial getCoreDb-only factory binding with actual getOrgTransactionDb, zero global/Supabase fallback attempt counters and fresh actual capability composition/request ALS, real RLS/native gates, two-backend count/fetch insert and text growth, failure/ambient cleanup and bounded payload/cursors. |
| Modify | scripts/qc/native-postgres-manifest.ts | Register this suite with minimumAssertions=6 and exactAssertions:true after F7 shared-harness qualification; retain all other rows and lanes. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | Exact requiredBehavior admission, missing/duplicate rejection. |
| Modify | scripts/qc/native-postgres-report.test.ts | Reject skipped/missing/failed native movement behaviors and an extra seventh passing behavior. |
| Create/update | specs/125-stock-readable-movements/validation.md | Exact candidate commands/results/fixture IDs/byte counts/browser route-data and remaining gates. This execution document is meta-repo-relative, not a Hub product file. |
| Create local evidence only | specs/125-stock-readable-movements/evidence/ | Synthetic screenshots/query/payload receipts named by candidate and scenario in validation; exclude private live records. Meta-repo paths. |

Explicitly unchanged: stock.service.ts legacy listEntries/getLedger/getRecentLedger callers, /api/stock/ledger body, `src/routes/api/stock/entries/[id]/+server.ts`, `src/server/services/attachments.service.ts`, `src/server/services/rbac.service.ts`, `src/hooks.server.ts`, shared generic DataTable.svelte (its existing bindable controls and exporter suffice), `src/lib/export/table-export.ts`, unrelated item rosters/custom properties, DB schemas/migrations, role/permission writes, package dependencies and design tokens. If any of these needs behavioral change, stop and record a reviewed scoped amendment before coding it. Source-code comments for actual remaining implementation gaps and the parent proposal ledger remain required at handoff.

## Focused test command

After the proposed files exist, this one command runs every focused test file of this feature:

```bash
bunx vitest run 'src/server/services/stock-entries-read.service.test.ts' 'src/server/services/party.service.test.ts' 'src/lib/components/stock/entry-document.test.ts' 'src/routes/(app)/stock/entries/page.server.test.ts' 'src/routes/(app)/stock/items/[id]/page.server.test.ts' 'src/routes/(app)/stock/page.server.test.ts' 'src/routes/(app)/stock/entries/page.movements.mounted.test.ts' 'src/routes/(app)/stock/items/[id]/page.movements.mounted.test.ts' 'src/routes/(app)/stock/page.movements.mounted.test.ts'
```

The three new mounted files use `// @vitest-environment happy-dom`, @testing-library/svelte and the existing flat unit Vitest configuration, as the pinned stock-entry mounted fixtures do. The focused command above runs them directly; do not substitute Storybook mode or claim a browser viewport from happy-dom. Keep test-local mocks within these files unless a candidate equivalent shared fixture is explicitly reused and recorded. No excluded or skipped suite counts as proof. Real guarded local QA plus Browser Harness remains required for actual SQL/route-data/policy behavior; mocked Vitest calls alone are insufficient. Full check/test/build, i18n and UI token/design gates remain mandatory.

## Native lane and shared dependencies

The admission resolver and source batches remain inside stock-entries-read.service.ts; existing pos/finance/purchases/scheduling services and hooks/route-policy files are unchanged. Reuse their exact policy primitives and table predicates as specified, not their transaction-opening wrappers. party.service.ts supplies the only new cross-service Tx seam. Native execution is the complete qa-native command/report in [quickstart.md](quickstart.md#native-snapshot-and-label-admission-qualification-mandatory-us1), separate from the ordinary focused command above.


Native test-only dependency: F7 src/server/test-utils/operator-native-auth-fixture.ts and fixtures/operator-native-auth.sql install/assert the exact canonical child auth prerequisite before public FK/policy setup. Reuse actual qualified helper/recipe, not a copied permissive policy. No extra app_ledger rights and no new runtime dependency for F4/F6. Whole-lane controller stays the exact CI `pgvector/pgvector:0.8.6-pg18` / `minion_qc_vectors` controller; each test owns only its validated public child database.

Shared harness ownership: F7 implements/qualifies the optional exactAssertions type and production report behavior in [native-exact-count.md](../128-faces-receivables-audit/contracts/native-exact-count.md). F4 consumes that prerequisite and owns only its new row and admission/report vectors; it adds no duplicate report implementation or F7 runtime/authority-migration dependency. The active-only warehouse action count and historical warehouse labels remain distinct source projections, with one-active-plus-archived and two-active loader/mounted/native counterexamples.


Denomination display: contracts/valuation-display.md is mandatory in the existing entries/item-ledger/recent PageBodies and respective mounted/loader/native tests, messages/en.json and messages/es.json plus normal generated i18n output. Recent retains its actual existing columns, no new money column. Shared formatMoney, unrelated item-bin valuation and overview aggregate/chart/KPI code remain unchanged; their exact existing missing-provenance callsites are a separate parent-proposal follow-up with a deferred source TODO(handoff) while product code is gated.
