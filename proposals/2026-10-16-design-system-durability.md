---
id: 2026-10-16-design-system-durability
title: Minion design-system durability and composition contracts
status: approved
created: 2026-10-16
updated: 2026-10-16
repos: [minion-meta, minion_hub, minion_site]
tags: [ui, test]
effort: L
source: design-system-audit-2026-10-16
---

# Minion design-system durability and composition contracts

## Request and scope

Audit the shared system against mature external systems and foundational UX guidance, including layout patterns, dynamic layouts, tokens, API and wrapper design, durability, reuse and customization. The owner authorized implementation and full deployment on 2026-10-16.

Report: `.lavish/design-system-audit-2026-10-16/report.html`. Evidence directory: `.lavish/design-system-audit-2026-10-16/evidence/`. Full source excerpts, computed measurements, public-source citations, specialist reviews, historical dispositions and fixture receipts are preserved there.

## AS-IS

Source findings use recorded local working trees and newer cached origin objects. Cached refs were not freshly fetched and production package identity was not established. Current component renders use the local working tree with synthetic fixtures. Public site screenshots are read-only deployed observations without commit attribution.

The system already has semantic tokens, 18 contract themes, reusable primitives, nine page archetypes, layout containers, a headless DataView selector, domain kits, mutation feedback and explicit personalization rules. The audit found 30 overlapping source observations, not 30 unique deployed defects. Expanded token computation finds 19 of 270 selected text/surface combinations below 4.5. Actual pure layout helpers reproduce wrong-shape failure and duplicate saved keys. The source ledger identifies inconsistent typography ownership, incomplete scope/version contracts, accessibility and operation-outcome gaps.

## TO-BE

Retain the semantic token system and Svelte primitives. Strengthen the contracts between components, layouts, state, persistence, and consumer packages; publish visual recipes that demonstrate those contracts.

Invariants: preserve Svelte 5 and current business semantics; one state owner; personal visibility never grants permissions; saved preference schemas evolve safely; keyboard alternatives match pointer operations; density never silently changes semantic type; every save outcome has truthful recovery; source, installed package and rendered evidence remain distinct.

## DELTA and exit evidence

### I01 — Establish one qualification identity

Phase 0; owner: Design-system maintainer + consumer maintainers; effort Small.

Record commit, installed archive hash, contract version and consumer matrix; generate inventories and distinguish skipped checks from passes.

Evidence gate: Reproducible manifest and exact artifact bytes for every fixture; no stale report status treated as current.

Audit links: DS-10, DS-11, DS-12, PH-14.

### I02 — Qualify semantic tokens in rendered contexts

Phase 1; owner: Tokens + shared primitives; effort Medium.

Allowed text/surface pair matrix, one typography owner, bounded decorative hooks and intrinsic target policy.

Evidence gate: All allowed pairs and composed computed styles pass; every supported theme/density/input method has evidence.

Audit links: DS-01, DS-02, DS-08, DS-09.

### I03 — Harden layout and preference data

Phase 1; owner: Preference SDK + dashboard/view kits; effort Medium.

Versioned decode/normalize/migrate; scoped identity; deterministic catalog merge; saved/local-only/error outcomes.

Evidence gate: Wrong JSON shapes, duplicates, retired/new/renamed fields, network errors and two-user/two-org switches preserve valid intent without crashes.

Audit links: DS-03, DS-04, PH-01, PH-02, PH-03, PH-04.

### I04 — Make customization keyboard-complete

Phase 1; owner: Layout and table components; effort Medium.

Discrete move/resize actions, stable visual/DOM order, localized names and explicit table versus editing-grid behavior.

Evidence gate: Complete edit/reorder/resize/reset without pointer; announced results; no focus loss at compact transformation.

Audit links: DS-05, DS-06, PH-08, PH-09.

### I05 — Preserve truthful mutation outcomes

Phase 1; owner: Action/record adapters + endpoint owners; effort Large.

Preserve conflict, unknown and committed-refreshing states into local feedback; immutable scope/version; explicit dirty-state participation.

Evidence gate: Lost response never blindly replays a write; read failure retries only read; stale edit protects draft; account rotation retires work.

Audit links: PH-05, PH-06, PH-07.

### I06 — Define DataViewShell and capability APIs

Phase 2; owner: DataView + DataTable + page kit maintainers; effort Medium.

Keep the headless selector; first pilot existing shells in collection and calendar, extracting a shell only if repeated missing responsibility is demonstrated; typed nonempty view catalog, named regions and stable hooks; explicit activation, selection and operation capabilities.

Evidence gate: One table/calendar/board/gallery sample each uses same composition grammar without DOM querying or duplicate toolbars; invalid option combinations fail type/runtime admission.

Audit links: DS-13, PH-12, PH-15, PH-16.

### I07 — Publish task-oriented executable recipes

Phase 2; owner: Design-system documentation + QA; effort Large.

Collection, detail/inspector, form, dashboard and workspace recipes; behavior, placement, states, responsive and customization documentation beside examples.

Evidence gate: Recipes render actual archive components with long EN/ES content, 320px/narrow-pane/text-zoom checks, keyboard, failure and recovery fixtures.

Audit links: DS-13, DS-14, PH-10, PH-11, PH-13.

### I08 — Converge enforcement and migrate by archetype

Phase 3; owner: Hub/Site CI + route owners; effort Large.

Shared lint and installed-token resolution; per-file debt ratchets; component maturity and deprecation; route migrations with ledger receipts.

Evidence gate: Both products reject unknown tokens/new debt and certify consumed packages; historical findings close only with recorded evidence.

Audit links: DS-07, DS-14, PH-10, PH-14.

## Open finding ledger

Existing source findings are recorded here and at exact anchors in the attached evidence. This audit introduces no application implementation or unfinished code; existing source TODOs remain untouched. Site-specific TODO(handoff) comments belong with each authorized implementation slice, preserving unrelated working-tree edits now.

| ID | Observation | Evidence |
|---|---|---|
| DS-01 | Contrast qualification misses raised surfaces | system-audit.report.md; system-audit.source-excerpts.json |
| DS-02 | Hub redefines shared typography classes with smaller values | system-audit.report.md; system-audit.source-excerpts.json |
| DS-03 | Editable layouts parse and trust unversioned persisted objects | system-audit.report.md; system-audit.source-excerpts.json |
| DS-04 | Personal dashboard storage is scoped to dashboard ID only | system-audit.report.md; system-audit.source-excerpts.json |
| DS-05 | Layout reordering and resizing expose pointer-only operations | system-audit.report.md; system-audit.source-excerpts.json |
| DS-06 | Dense grid packing can reorder visual reading order | system-audit.report.md; system-audit.source-excerpts.json |
| DS-07 | Site's gate remains materially weaker than Hub's | system-audit.report.md; system-audit.source-excerpts.json |
| DS-08 | Decorative themes override broad element/class selectors | system-audit.report.md; system-audit.source-excerpts.json |
| DS-09 | Shared touch sizing is opt-in rather than intrinsic | system-audit.report.md; system-audit.source-excerpts.json |
| DS-10 | Package identity and source drift obscure qualification | system-audit.report.md; system-audit.source-excerpts.json |
| DS-11 | Governance prose contains stale contradictory instructions | system-audit.report.md; system-audit.source-excerpts.json |
| DS-12 | Local lint success can conceal skipped changed-file enforcement | system-audit.report.md; system-audit.source-excerpts.json |
| DS-13 | Pattern and customization APIs need a composed contract | system-audit.report.md; system-audit.source-excerpts.json |
| DS-14 | Primitive test coverage is mainly SSR structure at the package boundary | system-audit.report.md; system-audit.source-excerpts.json |
| PH-01 | Persisted layout decoding is not a reusable validated contract | patterns-history.json; patterns-history.sources.md |
| PH-02 | Saved layouts do not have a clear persistence or failure promise | patterns-history.json; patterns-history.sources.md |
| PH-03 | Personalization scope is implicit and varies by surface | patterns-history.json; patterns-history.sources.md |
| PH-04 | Dynamic layout catalog, insertion behavior and live configuration are not one contract | patterns-history.json; patterns-history.sources.md |
| PH-05 | Autosave presentation cannot express the richer mutation outcomes | patterns-history.json; patterns-history.sources.md |
| PH-06 | Versioned write adoption remains incomplete after the S4 follow-up | patterns-history.json; patterns-history.sources.md |
| PH-07 | Dialog dirty protection still relies on consumer discipline | patterns-history.json; patterns-history.sources.md |
| PH-08 | DataTable keyboard interaction exceeds its exposed accessibility semantics | patterns-history.json; patterns-history.sources.md |
| PH-09 | Accessible names and residual errors remain outside the locale contract | patterns-history.json; patterns-history.sources.md |
| PH-10 | The capture contract lacks critical durable-edit states | patterns-history.json; patterns-history.sources.md |
| PH-11 | Form primitives lack a form-wide validation and guidance pattern | patterns-history.json; patterns-history.sources.md |
| PH-12 | Shared record activation still relies on DOM coupling | patterns-history.json; patterns-history.sources.md |
| PH-13 | Destructive confirmation has not converged on one interaction contract | patterns-history.json; patterns-history.sources.md |
| PH-14 | Legacy audit status is disconnected from merged implementation | patterns-history.json; patterns-history.sources.md |
| PH-15 | DataView is a headless selector, not yet a layout wrapper contract | patterns-history.json; patterns-history.sources.md |
| PH-16 | DataTable preset and capability precedence need an executable API matrix | patterns-history.json; patterns-history.sources.md |

## Historical reconciliation

Do not reopen all October 10 follow-ups. The evidence ledger reconciles 18 entries to resolved-in-source, partial, superseded, open or unverified. S1–S5 implementation appears in newer cached source; deployment is not inferred. The paused October 3 Hub/gateway readiness program remains paused.

## Qualification and limitations

Nine local renders cover actual Home, Calendar and Calls components at 1440, 390 and 320 CSS-pixel widths with synthetic data. They omit authenticated navigation and backend behavior. Overlay validation includes an original timing-sensitive failure and a documented transition-aware rerun. Public landing screenshots are read-only observations, without deployment SHA attribution. No screen-reader, complete route/persona matrix or production mutation certification is claimed. The next spec must enumerate missing runtime cells as acceptance gates.

## Lifecycle

The owner authorized implementing and fully deploying the recommendations on 2026-10-16. Spec Kit feature 012 records implementation, two-pass review, verification and deployment receipts. The audit itself changed no application code. No lifecycle stages are bypassed.

## Follow-ups (open-items ledger, 2026-10-16 review)

Documented open ends after independent review (T024). Each is a bounded, non-blocking item; none weakens a gate.

| Item | Where | Why left open | Pointer |
|---|---|---|---|
| FormField `aria-describedby` lists helper before error while the DOM renders error first | `packages/ui/src/lib/FormField.svelte`, `minion_hub/src/lib/components/ui/foundations/FormField.svelte` | The shared copy is inside the qualified immutable UI archive; changing it mints a new package version and re-opens consumer qualification. Align both copies in the next design-system pack. | `TODO(handoff)` at the Hub FormField; `012-design-system-durability/evidence/review-packaging-release.md` M2 |
| Coarse-pointer label `display:flex` ties with Tailwind `.block` on specificity | `packages/design-tokens/utilities.css` | Target size holds (measured 44×44 under coarse pointer); only the display value can be overridden by a consumer utility. Resolve by a `data-part`-scoped rule in the next pack. | review-packaging-release.md M3; `evidence/browser/controls-targets.json` |
| After "Review latest", the SaveIndicator keeps unknown/conflict and local drafts stay visibly unsaved | autosave hosts' `onReview` handlers | Spec I05: a successful read cannot mark an uncertain write successful; display-only, next edit uses the refreshed token. | review-outcomes.md finding 4 |
| Re-packing from `main` after promotion mints a different `h<digest>` | `scripts/pack-design-system.mjs` (baseVersion constants vs release package.json 0.2.0) | Installed vendored identities reproduce from the dev source at the recorded base commit only. Acceptable for the vendored lane; a future release-line pack must record its own receipt. | review-packaging-release.md risk note |
| `onRowActivate` on DataTable also disables cell selection/editing and Space-select | `minion_hub/src/lib/components/data-table/DataTable.svelte` | Undocumented coupling; document on the prop or decouple in a follow-up | review-components-root.md L1 |
| DataTable `persist()` toasts on every column action when storage/owner is unavailable | same | Noisy but honest; dedupe per session in a follow-up | review-components-root.md L2 |
| Secrets/Channels mark a never-sent clear/delete as uncertain (no retry) on scope change | `settings/SecretsSection.svelte`, `ChannelsTab.svelte` | Conservative by design; a pre-dispatch scope change could be classified as cancelled instead | review-components-root.md L4 |
| Live announcements read the command label, not the outcome | EditableGrid/FieldsList | Outcome text would need per-action result wiring | review-components-root.md L5 |
| One-time reset of per-viewer local preferences (new scoped key strings, legacy values not imported) | `minion_hub/src/lib/state/ui/scoped-preference.svelte.ts` | Deliberate per spec I03 (unscoped values cannot be attributed to an identity); governance rule revised; disclosed in the Hub PR | review-components-root.md INFO |
| Theme-wide `font-family` from `[data-theme=crt] *` also reaches undecorated native controls | `minion_hub/src/app.css` | Typography is a theme property, not decoration; geometry/background/border/shadow/filter are unaffected (measured) | evidence/browser/matrix.md |
| `recipe=calendar` renders only the shell in the recipes fixture | `minion_hub/tests/fixtures/design-durability/Recipes.svelte` | The calendar pilot is exercised by the mobile-composition `calendar.html` fixture (actual calendar component) | evidence/browser/matrix.md |
| Daily layout server preference stores only the last-saved organization's section | `minion_hub/src/routes/api/me/preferences/[section]` | Approved limitation: local scoped storage keeps other organizations on the device; no schema expansion in this change. | `evidence/layouts-implementation.md` |

## Out of scope

Replacing the UI framework, free-form canvas everywhere, changing paused readiness work, financial/security mutation implementation and migrating every route before a qualified pilot.
