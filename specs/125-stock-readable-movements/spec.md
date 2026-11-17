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
