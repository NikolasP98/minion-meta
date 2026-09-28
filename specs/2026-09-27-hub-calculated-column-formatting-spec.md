---
id: 2026-09-27-hub-calculated-column-formatting-spec
title: Calculated column presentation infrastructure
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-09-27
updated: 2026-09-27
repos: [minion_hub]
proposal: 2026-09-27-hub-calculated-column-formatting
tags: [ui, data, security]
---

# Calculated column presentation

## 0. Product

Let authorized users configure how numeric calculated values are displayed, including a compact secondary calculated value, without changing their data.

## AS-IS

Hub 31f023cd stores formula rules and compiled metadata in app_table_properties.rules. CustomPropertyDefinition, POST/PATCH APIs and CustomPropertyManager have no presentation settings. CustomPropertyCell emits a read-only scalar and partial/error warnings. DataTable already loads a complete authorized property bundle for each page. Native POS margin renders formatMoney(margin), success/danger foreground and marginPct as t-caption.

## TO-BE

1. Separate optional nullable presentation metadata from calculation rules. Use reusable browser-safe types and strict Zod schemas in src/lib/tables/column-presentation.ts. Persist a nullable JSONB presentation on app_table_properties. Existing rows default to null and preserve current display. Formula computation, values, primary numeric sorting/filtering/export semantics stay intact.
2. Contract: ColumnNumberFormat {style:'auto'|'decimal'|'currency'|'percent', decimals:number|null, currencyDisplay:'symbol'|'code', percentScale:'ratio'|'whole'}. ColumnPresentation {version:1, number:ColumnNumberFormat, tone:'none'|'sign', secondary:null|{propertyId:UUID,format:ColumnNumberFormat}}. Decimals null means automatic, explicit integers range 0..6. Currency uses canonical resolved money currency, never a user-selected conversion. Currency style only admits money results; money results admit only auto/currency so every monetary amount retains its currency. Decimal and percent styles admit unitless/percent, not money. Auto honors inferred dimensions. Ratio percent means0.2=>20%; whole means20=>20%. Sign styling maps nonnegative success and negative danger. No raw CSS/HTML/color injection or arbitrary predicates.
3. This slice accepts presentation only on numeric formula definitions; nonnumeric and nonformula metadata updates with presentation must reject. Numeric-to-nonnumeric formula edits require presentation=null in the same request; omitted settings are preserved. Create/update validate resulting rules and presentation under existing org/table graph lock and optimistic version. Presentation-only changes do not reparse stored expression or mutate compiled dependencies. Existing catalog revision behavior may advance with definition version; no promise of revision stability.
4. Secondary references one active numeric formula in the same org/table, distinct from primary; no inline second expression. Resolve from already-loaded authorized bundles, never per-cell requests. Render only target scalar with its chosen format, as subdued caption beside primary; do not recursively apply target presentation. Selecting the secondary never changes primary sorting/export/aggregates. Targets may be hidden as standalone columns and still render in the caption. Target archive/type changes produce graceful unavailability, not a blocked calculation graph. Settings editor communicates unavailable target. Restricted target identities/labels/values are redacted before serialization; no permission lending from primary. A restricted secondary must not hide an otherwise permitted primary. Partial/error target quality remains explicit and cannot be styled as a complete valid number.
5. Manager exposes a reusable Formatting section for numeric formulas with sample preview, number style, decimal count, currency symbol/code, percent ratio/whole, sign colors and optional secondary selector with its own format. Use EN/ES localization, design tokens and existing primitives. Invalid settings cannot save; server independently checks. Formula editor preview and cells must use consistent primary presentation; secondary preview may use loaded page values and clearly identify its source. Existing blank/error/partial behavior remains visible.
6. Canonical formatMoney gains compatible options for currency display; all old callers keep their behavior. Formula presentation helpers are separate from evaluator. Stored numbers remain numeric, decimal configuration only affects displayed rounding. DataTable renders the new shared value presentation without POS-specific branches.
7. QA demonstrates native margin beside main margin formula and optional percentage formula. Main: currency symbol,2 decimals,sign tone. Secondary: margin/NULLIF(price,price*0), percent ratio,1 decimal. Existing native margin is not changed, missing price/cost remain blank, incomplete cost is flagged, zero denominator stays blank. Production example formatting applies only to the already-created FACES SCULPTORS formula after release, preserving user edits with CAS and a reviewed idempotent helper. Do not automatically create/change definitions in other orgs.

## DELTA

- Migration/schema + seed matrix: nullable presentation storage and representative configured numeric formulas.
- Shared type/validation + service/routes: strict allowlist, applicability, authorized secondary references, CAS and permission-aware projection.
- Formatter/manager/cell/DataTable: reusable config editor and presentation; no per-cell fetches or stringified numeric operations.
- Focused contracts, rendering tests, real PostgreSQL roundtrip/access tests and QA browser create/edit/reload verification. Include no-format fallback, S/ vs PEN, decimals, signs including zero, ratio vs whole, null/partial/error secondary, archive/type/restricted sources, and stale version rejection.
- Run clean check/build, design/token ratchets, exact-head independent Sol review and CI before authorized merge; verify deployment and record outcomes. Leave dev server available for user testing.

## Out of scope

Native/other-custom formatting admission, arbitrary threshold-expression colors, custom CSS, multiple secondary values and inline secondary expressions are later extensions; this slice supplies reusable infrastructure without offering unwired options.

## Frozen review contracts

- Create omission stores null. PATCH omission preserves stored presentation; explicit null clears it. Presentation is not part of formula dependency/cycle/archive protection. A↔B display references are permitted because rendering reads only each target's scalar once. Hidden standalone means table visibility preferences, never RBAC-hidden sources.
- One projection sanitizes every serialized definition surface: list/catalog/bundle/create/update/restore/archive responses. If a stored secondary is inaccessible, keep primary number/tone but replace secondary with null and set optional definition flag `presentationRestricted:true`; no target ID/label/value is serialized. For a deleted/archived/non-numeric target that is otherwise visible, retain the reference so the manager can label it unavailable and let an authorized user replace/clear it. Canonical rows remain internal to graph-locked validation.
- A caller unable to view an existing stored secondary cannot explicitly clear or replace presentation (422 presentation_restricted). Label/expression-only writes omit presentation and preserve it. The manager disables the formatting section for presentationRestricted and omits presentation on unrelated saves; server checks independently. A privileged manager may clear. New/changed secondary references must be active numeric formulas in the same org/table and permitted to the caller. Recheck graph rows under the lock.
- Null/absent presentation uses the exact legacy formatter. Configured auto follows the inferred dimension: money uses canonical money formatting, percent values are whole percentages (20=>20%), other numbers remain decimal. percentScale is used only with explicit style:percent: ratio0.2=>20%, whole20=>20%. Explicit decimals fixes min/max fraction digits (0..6); automatic preserves canonical currency defaults, decimal max12 and percent max4 with trailing zeros trimmed. Use Intl rounding for presentation only; no persisted value change. Missing resolved money currency displays unavailable, never a guessed conversion/currency.
- Draft and saved display share a presentation helper. Formula preview HTTP remains scalar; manager decorates results locally, using already-authorized loaded sibling values for a secondary and identifies that source. All sort/filter/export/aggregate operations use raw primary numeric values only. Primary sign tone applies to valid numeric results; blank/error/restricted/partial do not receive success/danger tone. Partial/error secondary renders explicit quality state instead of an unqualified numeric caption.
- The separate optional production example helper defaults to dry-run, requires exact org UUID/slug and owner actor, targets immutable builtin margin template identity, checks expected definition version and original expression/presentation expectations, and compares structural configuration for idempotence. It never replaces user edits; write and readback are audited. Migration itself changes no organization definitions. Secondary margin-ratio creation is targeted and idempotent with durable identity; no all-org seed.

- The ratio template uses a currency-typed zero (`NULLIF("Sale price", "Sale price" * 0)`) because the existing type checker intentionally rejects comparing money with a unitless zero. No formula language widening is needed for presentation.

## Verification

Prove strict request validation and persisted roundtrips, permission-aware projection and non-destructive restricted-manager writes, formatter compatibility and raw numeric behavior, and manager/cell browser save-reload behavior on seeded local QA. Run typecheck/build, design/token checks, independent Sol implementation review and hosted CI before release. Record exact deployed commit, production migration and optional targeted example outcomes separately.

- Every explicit presentation create/update carries catalogRevision, which the server revalidates under the graph lock even when rules are omitted. This rejects a secondary whose type/sensitivity changes between catalog load and write. Unrelated omission-preserving updates do not acquire a new client revision requirement. The manager omits unchanged formula rules on presentation-only saves.
