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
