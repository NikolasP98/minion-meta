# Analysis: 013 design-system baseline and conformance

Independent Spec Kit "analyze" pass, 2026-10-16. Read-only against spec.md, plan.md, tasks.md, research.md,
contracts/ui.md, checklists/requirements.md, constitution v1.0.0, the governance skill, spec 012 and hub
`48976586` (`src/app.css`, `themes/runtime.ts`, `api/me/preferences/[section]/+server.ts`, `DataView.svelte`,
`ui/PageHeader.svelte`, `scripts/design-lint.mjs`, `.design-lint-baseline.json`, plus the files those pointed at).
`node scripts/design-lint.mjs` was run once (report mode, no writes).

## 1. Requirement coverage

| Req | Task(s) | Proof named in plan.md | Gap |
|---|---|---|---|
| FR-001 baseline | T003, T006 | row 1: recipe matrix + 20 routes at 390 px coarse, 0 unmarked sub-44 | none; see §2.1–2.3 for mechanism defects |
| FR-002 density pref | T004, T005 | row 2: computed heights, round-trip, mounted control | none |
| FR-003 sizing | T007, T008, T010 | row 3: ≤30 / ≤50 with ceilings, 3 toolbar diffs | ceilings are not enforced by CI (§2.6) |
| FR-004 archetypes | T011 | row 4: 100 % manifest + seeded violation | duplicates an existing registry (§2.4) |
| FR-005 states | T015, T016 | row 5: matrix mounted, 3 pilots × 9 states | DataView is headless (§2.7) |
| FR-006 collapse | T013 | row 6: 390/320 overflow 0, sidebar → parent, filters → sheet | parents are dashboards (§2.8) |
| FR-007 placement | T012, T014 | row 7: one dominant action, scope table | "one" not enforceable by snippet (§2.9) |
| FR-008 token debt | T009, T010 | row 8: ceilings per rule | raw-shadow ≤ 6 unreachable (§2.6) |
| FR-009 content | T017 | row 9: 0 divergent verbs, 0 bypasses | test scope ≠ SC (§2.10) |
| FR-010 gates | T018 | "per PR run check, lint:design, lint:tokens, build" | gates run by coordinator, not before PR open (§3) |
| FR-011 release | T018–T020 | alias/SHA/EN-ES smoke/served-CSS | FR says one PR per item; plan ships 4 (§2.11) |
| SC-001 | T003/T006 | row 1 | — |
| SC-002 | T005 | row 2 ("second device/profile" = round-trip test only) | NOTE: no real second-profile proof |
| SC-003 | T011 | row 4 | §2.4 |
| SC-004 | T007–T009 | rows 3, 8 | raw vs governed undefined (§2.6) |
| SC-005 | T015/T016 | row 5 | §2.7 |
| SC-006 | T013 | row 6 | — |
| SC-007 | T017 | row 9 | unachievable as written (§2.10) |
| SC-008 | T018/T019 | delivery step 4 | — |

Every FR/SC has a task and a proof row. No orphan requirements; the defects are in the premises, below.

## 2. Contradictions and ambiguities (checked against source)

**2.1 Does a low-specificity baseline beat Tailwind `h-6`? Partly — REAL risk.** Neither spec nor contract names
`:where()`; contracts/ui.md:6 only says "has `min-height: var(--control-height-touch)`". Cascade facts from
`app.css`: Tailwind utilities live in `@layer utilities`; `app.css:530-538` already documents that "Un-layered rules
always win over ANY `@layer`" and that an equivalent rule inside `@layer components` "compiled but never" applied.
So: (a) `min-height:44px` beats `height:24px` from `h-6` by property semantics whatever the layer; (b) it loses to
`min-h-*` utilities (165 occurrences in `src/**/*.svelte`) if placed in `@layer base` next to the focus ring
(`app.css:130-170`); (c) a zero-specificity `:where()` rule loses to Svelte-scoped `min-height: 0` (49 non-`ui/`
files; e.g. `app.css:589-590 .chip-x { min-height: 0 }`, `:729-730 .dt-chip-clear`). Contract must say: un-layered,
normal specificity, `min-height`, under `@media (pointer: coarse)`, and list the `min-height:0` escapes as dense.

**2.2 `data-density` collision — REAL, and worse than the brief suspects.** The attribute already exists:
`ui/foundations/AppViewport.svelte:3` `AppDensity = 'comfortable' | 'compact'`, `:28 data-density={density}`,
`:49-54` map it to `--active-control-min-height` (comfortable → 44, compact → 32) and `:55-59` force 44 under
`(pointer: coarse), (max-width: 767.98px)`. `(app)/+layout.svelte:83` mounts `<AppViewport density="compact">`.
So **today's sizing is `data-density="compact"`**, while spec FR-002 / plan risk 4 / T004 say "comfortable equals
today's sizing". contracts/ui.md:7 puts the mode on `<html>`, so a page would carry `html[data-density=comfortable]`
over `div[data-density=compact]` and the token resolves from the nearer div — the user's choice would be silently
shadowed. Adding `dense` as a third value of the same attribute (spec TO-BE 1, contract :6) compounds it. The only
consumer of `--active-control-min-height` is a comment (`home/+page.svelte:1801`), so the coarse floor the AS-IS
says is missing (spec :14) is half-built and unused: the baseline should be role selectors consuming that token.

**2.3 "Comfortable equals today" — NOT provable as written.** DataTable rows do not use `--control-height-md`;
`DataTable.svelte:9` `Density = 'compact' | 'normal' | 'comfortable'`, `:373 density = 'normal'`, `:671 ROW_H =
{compact: 36, normal: 44, comfortable: 52}` published as `--dt-row-h`. A third vocabulary: DataTable "comfortable"
is 52 px, bigger than today's 44. The mode→table mapping (comfortable→`normal`, compact→`compact`) is nowhere.

**2.4 Archetype manifest already exists — REAL contradiction.** T011/contract :13 add `src/lib/routes/archetypes.ts`
with `collection|detail|create-edit|dashboard|settings|workspace|none`. But `src/lib/routes/route-design-manifest.ts:4`
defines `RouteArchetype` (`dashboard|collection|record-detail|form-settings|master-detail|workspace-editor|
canvas-kanban|terminal-remote-desktop|public-auth`), every screen carries `archetype` (`:86`), `scroll:
SCROLL_OWNER[archetype]` (`:238-248`), `compact: RESPONSIVE[archetype]` (`:190`) and `states: STATE_TEMPLATES[archetype]`;
`route-design-contracts.test.ts:33-44` already proves 100 % filesystem coverage with frozen
`ROUTE_CONTRACT_EXPECTATIONS`; `wave-*-composition.test.ts` already assert page-source composition; `PageShell.svelte:2`
has its own (third) `RouteArchetype` (`form`, `workspace`) rendered as `data-archetype` (`app.css:448`). A new file
with a fourth enum is a second source of truth. FR-004's real delta is a generic per-archetype composition test over
the existing manifest, and reconciling PageShell's enum with the manifest's.

**2.5 Layout-owned shells.** 16 of 21 `(app)/**/+layout.svelte` contain `PageShell`/`SectionShell`
(`stock/+layout.svelte:22-30`, `crm/+layout.svelte:22`, `scheduling/+layout.svelte:17`). A test that "reads each page
source" (contract :13) fails for every child page unless it walks the layout chain. REAL.

**2.6 Ceilings are not a gate; SC-004 mixes raw and governed.** `package.json:158` `lint:design:ci = design-lint.mjs
--ci` — no `--strict-global`, so `.design-lint-baseline.json` totals are only reported (`design-lint.mjs:355-361`).
Live report: raw-color 197 (+27 over), raw-shadow 33 (+27), raw-layer 25 (+7), raw-motion 7 (+4), raw-type-size 8
(+1), raw-radius 15 (+4), raw-spacing 28 (+1) — master is already over seven ceilings with no consequence. The
baseline has no `raw-control-height` key, and `--update-baseline` "refus[es] to raise baseline" (`:258-264`) while any
rule is over, so T007's "set the ceiling" cannot run until B first clears all seven. SC-004 "raw-shadow ≤ 6": 26 of the
33 are `box-shadow:` in `app.css` (voxelized/CRT bloom, lines 783-982) — theme decoration, not debt; raw totals cannot
reach 6 without deleting themes, only governed totals can (exceptions file accepts `src/app.css`). Spec AS-IS :15
"1,051" icon literals is right; the baseline's 1227 is stale, not a contradiction.

**2.7 DataView is headless by design.** `DataView.svelte:8-15`: "renders no data itself — the page renders the active
view inside `children`"; spec 012 TO-BE: "Existing shells are preferred over a new abstraction … No new wrapper is
required unless both pilots prove the same missing responsibility." FR-005 / contract :19 make DataView render nine
states — a reversal of 012 with no disposition, and only 5 pages use DataView vs 21 DataTable (spec :16), so "every
collection surface" (TO-BE 4) cannot be reached through it. Where the state renders relative to the `switcher`
snippet is unspecified. Two `EmptyState` components exist (`ui/EmptyState.svelte`, `prompt/EmptyState.svelte`).

**2.8 Collapse with existing parents — possible, but the parents are not indexes.** No new route is needed: `/stock`,
`/crm`, `/scheduling` all have `+layout.svelte` with `SectionShell mode="responsive"`, which already stacks the nav
to full width below 1279.98 px (`SectionShell.svelte:66-71`). But `/stock/+page.server.ts` and `/crm/+page.server.ts`
are data-loading overview dashboards; "sidebar becomes a parent route" either replaces those dashboards at 390 px or
adds a second index — unspecified. `Sheet.svelte` (`open`, `title`) exists for the filter case.

**2.9 "One dominant action" is not expressible by the current API.** `PageHeader.svelte:13-19` exposes
`actions`, `primaryActions`, `secondaryActions`, `overflowActions` snippets; a snippet may hold N buttons. The
contract (:16 "renders exactly one `primary` action") needs either a typed `primaryAction` prop or a mounted test
counting `[data-part='primary-actions'] > *`. `a[href].btn-like` (contract :6) matches nothing in `src/`.

**2.10 Content contract test cannot meet SC-007.** 147 non-test files call `toLocaleString`/`toFixed`/`Intl.*`/
`toLocaleDateString` outside `utils/format` (113 / 135 / 44 / 47 hits); "zero money/date renders outside the shared
formatters" (SC-007) versus T017 "pilot pages consume it" is a 100× scope gap. Verb test (contract :22 item 1) covers
only `verb_*` keys, but the live divergence is in existing keys: EN "Delete" → ES "Eliminar" ×12 and "Borrar" ×1.

**2.11 FR-011 vs plan.** FR-011: "Each item ships as its own reviewed PR"; plan Summary: nine items in four PRs.
Stream C bundles a navigation change (item 6) with a test-only manifest (item 4).

**2.12 Minor path/mechanism errors in plan.md.** "page shells in `src/lib/components/layout/`" → they are in
`ui/foundations/` and `ui/PageHeader.svelte`. "theme = `data-theme` on `<html>` set by runtime.ts" → `runtime.ts:42-49`
sets `data-minion-theme` always and `data-theme` only for voxelized/obsidian/crt; `applyTheme` is driven from
`state/ui/theme.svelte.ts`. Preferences are SSR-loaded in `(app)/+layout.server.ts:139`, so density belongs on
`AppViewport`'s prop (no flash), not a client write to `<html>`.

## 3. Constitution check

| Principle | Result | Reason |
|---|---|---|
| I spec-first | pass | spec/plan/tasks/research/contracts exist; checklist signed |
| II AS-IS with evidence | pass with FIX | counts reproduce (`design-lint` live = spec :15,:20); but AS-IS :14 omits the existing `AppViewport` density/coarse mechanism and :16 omits the existing archetype manifest, so TO-BE builds duplicates |
| III slice-scoped PRs, gates in foreground before PR | **fail as written** | plan step 2: "No stream runs the full `check`/`build` … the coordinator runs them per PR before merge" — constitution III requires the repository's gates before the PR is opened; FR-011 one-PR-per-item is also contradicted (§2.11) |
| IV required build steps | pass | `lint:design`/`lint:tokens`/`i18n:compile` named; EN+ES in one commit (contract :22); no new route/endpoint — `density` is a new key in `VALID_SECTIONS` (`+server.ts:9-23`) with a validator like the others; `/settings/appearance` exists |
| V security/data | pass | one enum per user keyed by `profile_id`; no RBAC/tenancy/migration; no production data mutation |
| SDLC frontmatter | NOTE | `**Status**: Draft` is body text, not frontmatter; `specs/index.json` ignores `NNN-*/` dirs (known from 012) |

## 4. Risks

**BLOCK**
- B1 (§2.2/2.3) Density semantics inverted against shipped code (`AppViewport density="compact"` is today) and three
  density vocabularies; writing CSS on the spec's premise either changes every user's sizing or is shadowed by the
  viewport div. Rewrite TO-BE 1/FR-002/contract §Baseline+Density around `AppViewport`/`--active-control-min-height`,
  name the mode→DataTable mapping, and give the opt-out its own attribute (e.g. `data-dense`).
- B2 (§2.4/2.5) `archetypes.ts` would be a second registry with a fourth enum beside `ROUTE_DESIGN_MANIFEST`,
  `PageShell.RouteArchetype` and `data-archetype`. Rewrite FR-004/T011 to extend the existing manifest and make the
  composition test layout-aware; drop `detail|create-edit|settings|none` in favour of the manifest's names.
- B3 (§2.6) Ceilings are not enforced (`--ci` only) and `--update-baseline` is locked until master is under all
  seven stored ceilings. FR-003/FR-008/SC-004 must say: raw or governed, which flag CI adds, and the order (clear
  overages → ratchet → add `--strict-global`). As written SC-004 raw-shadow ≤ 6 is unreachable.

**FIX (in-stream, before the affected PR)**
- F1 (§2.1) Contract: un-layered + normal specificity + `min-height` + enumerate `min-height:0` / `min-h-*` escapes.
- F2 (§2.7) Decide where states live (DataView vs DataTable/`AsyncBoundary`) and record the 012 reversal; pick one
  `EmptyState`.
- F3 (§2.8) Say what `/stock` and `/crm` render at 390 px (overview + index, or index only).
- F4 (§2.9) Typed `primaryAction` prop or a DOM-count test; delete `a[href].btn-like`.
- F5 (§2.10) Rescope SC-007 to pilots + a per-file ratchet; extend the verb test to all keys with identical EN text.
- F6 (§2.11/§3) Either amend FR-011 to "each stream" or split C; run `check`/`build` serially before each PR opens.
- F7 (§2.12) Fix plan paths/mechanisms; apply density via `AppViewport` prop from SSR preferences.

**NOTE (accepted)**
- N1 SC-002 "second device" is proven only by a round-trip unit test. N2 Merge-order conflicts between B (values)
  and A/C/D (structure) are not "style-only by construction" in files both touch (e.g. `DataTable.svelte` has 24
  icon literals and is also a density surface). N3 Spec status not in frontmatter; board stub needed.

## 5. Verdict

**blocked** — B1, B2, B3 are premise errors that would send four parallel subagents into duplicate or shadowed work.
Fix the three artifacts (spec TO-BE/FR-002/FR-003/FR-004/FR-008/SC-004, contracts §Baseline/Density/Archetype, T003–
T004/T007/T011), then re-run analyze; the rest can be fixed in-stream.
