# Feature Specification: Design-system baseline and conformance

**Feature Branch**: `feat/design-baseline-conformance` (minion-meta, minion_hub, minion_site)
**Created**: 2026-10-16
**Status**: Draft
**Input**: "Design-system baseline and conformance: runtime touch/density baseline layer, control-height and icon-size normalization, route archetype conformance, data-view state coverage, narrow-width collapse, action placement, elevation/layer/colour debt, bilingual content contract — follow-on to feature 012." Owner instruction (2026-10-16): "begin implementing all of these and use subagents for faster development."

## 0. Product

Feature 012 hardened the design-system *rules* (token contract 1.1.0, intrinsic targets in the shared controls, component API precedence, executable recipes, fail-closed gates) and proved them on pilots. The owner's follow-up question was whether an element that is "off" gets corrected automatically and whether similar pages follow the same rules by construction. Today the answer is "only inside the shared controls, and only where a page opted in". This feature makes conformance the default: a runtime baseline that corrects non-conforming controls by role, mechanical normalisation of sizing debt, declared page archetypes with a conformance test, shared data-view states, purpose-driven narrow-width collapse, declared action placement, tokenised elevation/layers/colour, and a bilingual content contract.

## AS-IS (measured on minion_hub master `48976586`, 2026-10-16)

- Runtime baseline: `app.css` has one global `:focus-visible` ring. `AppViewport` already publishes `data-density` (`compact` is what `(app)/+layout.svelte` mounts today) and `--active-control-min-height` (44 under coarse pointer / ≤ 767.98 px, else 32 in compact, 44 in comfortable) — but nothing consumes that token, so a hub-local button, tab or menu item at 22 px stays 22 px on a phone. DataTable carries a third density vocabulary (`compact|normal|comfortable` = 36/44/52, `normal` today).
- Sizing debt: `lint:design` counts **302** raw 20–48 px heights outside `ui/` (`raw-control-height`, reporting only, no ceiling); style blocks alone show 7× `40px`, 7× `22px`, 5× `20px`, with the largest clusters in `components/my-agent` (10), `marketplace` (8), `builder` (4), `socials` (3). Icon literals: **1,051** `size={N}`; 315 of them are off the 12/14/16/20 scale (13: 124, 11: 95, 15: 63, 10: 33).
- Page composition: 145 app pages; PageShell on 92, PageHeader on 113, SectionShell on 2, DataView on 5, DataTable on 21, native `<table>` on 4, FormField on 2, ConfirmDialog on 6. A route manifest (`route-design-manifest.ts`, 100 % coverage test, nine archetypes) and per-wave composition tests exist, 16 of 21 layouts own the shells, and PageShell carries a second archetype enum — but no generic layout-aware test asserts that every page composes like its archetype.
- States: only pages routed through DataView share empty/no-results/denied/failed/refreshing presentation; the other collection pages hand-roll them or omit them.
- Narrow widths: index sidebars and filter bars are component-local decisions; several collection pages keep a sidebar beside a 390 px list.
- Action placement: per-view preferences still appear in some page headers; some headers carry more than one primary action.
- Colour/elevation/layer debt: raw-color 197, raw-shadow 33, raw-layer 25 (numeric z-index values 2, 3, 5, 15, 20, 22), raw-motion 7, raw-type-size 8 — all over their ceilings and reason-coded.
- Content: button verbs, currency and date formats are per-page choices; EN/ES terms differ for the same action across pages (audit PAT-14).

Anchors: `audits/2026-10-16-design-system-durability-handover/`, `.lavish/design-system-audit-2026-10-16/evidence/public-systems.json` rules PAT-01…PAT-14, `specs/012-design-system-durability/evidence/verification.md`.

## TO-BE and invariants

1. A non-conforming interactive element is corrected at runtime by its role, not by someone finding it: under a coarse pointer (or ≤ 767.98 px) every actionable element meets the 44 px target through the existing `--active-control-min-height`; under a fine pointer density is one coordinated mode — `compact` (today's sizing, default) | `comfortable` — driven by `AppViewport` and mapped onto DataTable's own density (`normal` | `comfortable`). Opt-out is explicit and visible in the DOM (`data-dense` on a surface), never implicit.
2. Control heights and icon sizes come only from the scale. The ratchets have ceilings and the counts can only go down.
3. Every app page declares its archetype (collection, detail, create/edit, dashboard, settings, workspace) and a test proves it composes like the archetype's recipe (shell, header, toolbar, scroll owner).
4. Every collection surface presents the same initial-load, refreshing, stale, empty, no-results, denied, partial and failed states through one wrapper.
5. At narrow widths an index sidebar becomes a parent route, a filter bar becomes a sheet, and a context panel becomes a step — by purpose, not by component accident.
6. Every action declares its scope (global shell, page/entity, collection, selection, row, field) and renders in that scope's region; a page header has one dominant action.
7. Shadows, layers, colours, motion and type sizes are tokens; the remaining raw values are capped exceptions with reasons.
8. Shared bilingual terms, active-verb labels and currency/date conventions are one contract consumed by every page.

Invariants: no visual change under fine pointer at comfortable density except where an element was off-scale; no table, icon button or dense telemetry surface grows unless it lacks the dense opt-out; no new public routes; RBAC, auth, tenancy untouched; debt counters never increase; EN and ES ship together.

## User Scenarios & Testing

### User Story 1 - A phone user can hit every control (Priority: P1)
Given any hub page on a touch device, when the user looks for an actionable element, then its hit target is at least 44 × 44 px without a per-page fix, except on surfaces explicitly marked dense (tables, icon-button clusters, telemetry) where the surface still offers a reachable alternative. **Independent test**: the 012 recipe matrix plus a sample of 20 real routes rendered at 390 px with coarse pointer; zero unmarked sub-44 targets.

### User Story 2 - A desktop user chooses density once (Priority: P1)
Given the appearance settings, when the user switches comfortable ↔ compact, then rows, headers, toolbars, menus and form controls change together and the choice follows them across devices; errors, helper text and focus rings remain readable at compact. **Independent test**: computed heights of a table row, a toolbar control and a menu item under both modes; preference round-trip through the user preferences section.

### User Story 3 - Similar pages behave the same (Priority: P1)
Given two pages of the same archetype, when a user lands on either, then the header geometry, dominant action position, toolbar composition and scroll owner are identical, and a changed page cannot merge if it stops matching its archetype. **Independent test**: the archetype manifest covers every app page and the conformance test fails on a seeded violation.

### User Story 4 - Every list tells the truth about its state (Priority: P2)
Given any collection page, when loading, refreshing, empty, filtered to nothing, denied, partially failed or failed, then the user sees the same presentation and the same recovery actions as on every other collection page. **Independent test**: the data-view wrapper's state matrix mounted against three real collection pages with injected failures.

### User Story 5 - Narrow screens collapse by purpose (Priority: P2)
Given a collection page with an index sidebar and a filter bar, when viewed at 390 px, then the sidebar is a parent route, filters open in a sheet and no content is clipped or horizontally scrolled outside intentional regions. **Independent test**: three representative routes at 390/320 px with document overflow 0 and every control reachable.

### User Story 6 - Actions are where their scope says (Priority: P3)
Given a page, when a user looks for an action, then global actions are in the shell, the entity's dominant action is in the header, collection actions in the toolbar, selection actions in the selection bar, row actions on the row and field actions beside the field. **Independent test**: the action-scope declarations of pilot pages rendered and compared with the placement table.

### User Story 7 - Words and numbers read the same everywhere (Priority: P3)
Given any two pages in the same language, when the same action or value appears, then it uses the same verb, the same currency format and the same date format. **Independent test**: a glossary test over the message catalogs and a formatter test over every money/date render path.

### Edge Cases
Nested interactive elements (a button inside a clickable row); dense tables under coarse pointer; icon-only buttons that must stay 24 px on desktop; 200 % text at compact density; keyboard focus inside sheets; pages with two legitimate primary actions (create + import); archetype manifest drift when a page is added; a page that is a redirect or has no body; EN/ES label length differences in collapsed toolbars; existing user densities when the preference is introduced; raw values inside third-party render surfaces (charts, editors).

## Requirements

### Functional Requirements

- **FR-001 (baseline)**: Provide a role-based runtime baseline so that under coarse pointer every `button`, link-as-button, switch, checkbox, radio, tab, menu item, option and form field meets a 44 px target, and under fine pointer a coordinated density mode sizes rows, headers, toolbars, menus and controls together. Surfaces may opt out only through an explicit dense attribute that also keeps a reachable alternative.
- **FR-002 (density preference)**: Expose compact/comfortable as a user preference that follows the user across devices, defaulting to `compact` (today's sizing) so existing users see no change until they choose; applied server-side on first paint through the existing viewport density.
- **FR-003 (sizing normalisation)**: Replace raw control heights and icon sizes outside the shared UI package with scale tokens; set ratchet ceilings for `raw-control-height` and `raw-icon-size` so they can only decrease.
- **FR-004 (archetype conformance)**: The existing route manifest remains the single archetype registry (PageShell's enum reconciled to it); a generic, layout-aware test asserts shell, header, toolbar and scroll-owner composition per archetype for every page and fails on an undeclared page or a seeded violation; non-conforming pages are allow-listed with reasons, never silently.
- **FR-005 (state coverage)**: Collection pages present initial-load, refreshing, stale, empty, no-results, denied, partial and failed states through one shared collection-state presentation composed next to the headless DataView or inside DataTable's state slots (012's "no wrapper" decision stands), with read-only retry and no second global spinner.
- **FR-006 (narrow collapse)**: Index sidebars become parent routes, filter bars become sheets and context panels become steps at narrow widths on the collection archetype; no document overflow at 390 or 320 px.
- **FR-007 (action placement)**: Actions declare their scope; the page header renders one dominant action; per-view settings live in the toolbar kebab; object settings in the object menu.
- **FR-008 (token debt)**: Raw shadows, numeric layers, raw colours, raw motion and raw type sizes outside third-party surfaces are replaced by tokens; remaining exceptions are capped with reasons and the global ceilings are lowered to the new counts.
- **FR-009 (content contract)**: Publish shared bilingual action verbs and value conventions (money, dates, counts) as one catalog section consumed by the pilots; a test flags divergent translations for any keys with identical source text, and a per-file ratchet stops new money/date renders that bypass the shared formatters while the existing bypass count can only fall.
- **FR-010 (gates)**: Every change passes design/token lint, Paraglide compile, typecheck, affected tests and production build; EN and ES ship together; no new routes or endpoints; RBAC and tenancy untouched.
- **FR-011 (release)**: Each work stream ships as its own reviewed PR against the registry base (items grouped by disjoint ownership); the repository's `check` and `build` gates run serially per PR before it leaves draft; production is verified on the real aliases as in feature 012.

### Key Entities
DensityMode (comfortable | compact; user preference section); DenseSurface (explicit opt-out attribute with reason); Archetype (collection | detail | create-edit | dashboard | settings | workspace) with a recipe composition contract; ActionScope (shell | page | collection | selection | row | field); CollectionState (initial-load | refreshing | stale | empty | no-results | denied | partial | failed | recovered); ContentContract (verbs, money, date, count conventions).

## Success Criteria

### Measurable Outcomes
- SC-001: 0 unmarked interactive targets under 44 px under coarse pointer across the recipe matrix and 20 sampled real routes.
- SC-002: Density switch changes table row, toolbar control and menu item heights together; preference persists across a second device/profile.
- SC-003: 100 % of app pages declare an archetype; the conformance test fails on a seeded violation and passes on master.
- SC-004: ceilings become a CI gate (strict global totals); governed totals (raw minus reason-coded exceptions) `raw-control-height` ≤ 30, `raw-icon-size` ≤ 50, raw-shadow ≤ 6, raw-layer ≤ 5, raw-color ≤ 120, raw-motion ≤ 3, raw-type-size ≤ 4; raw totals reported beside them.
- SC-005: Three representative collection pages render all nine states identically through the wrapper.
- SC-006: Document overflow 0 at 390 and 320 px on the collection archetype pilots with every control reachable.
- SC-007: Zero divergent translations for keys with identical source text across EN/ES; the three pilots render money/dates only through the shared formatters; the bypass-file ratchet is committed and decrease-only.
- SC-008: Each PR merged after CI and independent review; both production aliases verified.

## Assumptions and out of scope
Keep framework, auth, RBAC, tenancy and business flows. Third-party render surfaces (charts, editors, canvas) remain bounded exceptions. The density mode ships defaulting to today's sizing; compact is opt-in. Pages that are redirects or layouts without a body are declared `none` in the manifest. Full certification of every route under every state is not claimed; the conformance test and the sampled renders are the evidence.

**Out of scope:** replacing the UI framework, free-form canvas, agent configuration writers, migrating business logic, npm publication of the shared packages (Version Packages PR is the owner's), screen-reader/cross-browser certification.
