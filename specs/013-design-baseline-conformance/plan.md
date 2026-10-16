# Implementation Plan: Design-system baseline and conformance

**Spec**: [spec.md](spec.md) · **Constitution**: `.specify/memory/constitution.md` v1.0.0 · **Predecessor**: feature 012 (shipped 2026-10-16)

## Summary

Nine owner-requested items grouped into four parallel work streams, each in its own minion_hub worktree off `origin/master` (`48976586`), each shipping as its own PR to `master`. Meta carries the spec/plan/tasks/evidence and a governance update; minion_site receives only the ratchet-ceiling parity when hub's ceilings land (own small PR). Subagents implement; the coordinator integrates, re-gates, reviews and deploys exactly as in 012.

## Technical Context

Hub: SvelteKit 2, Svelte 5 runes, Tailwind 4, Paraglide (EN/ES, append-only catalogs), bun; design tokens from the installed `@minion-stack/design-tokens` (contract 1.1.0: `--control-height-xs/sm/md/lg/touch` = 24/28/32/36/44, `--space-*`, `--layer-*`, `--shadow-*`, `--duration-*`, `--font-size-*`, `iconSizes` 12/14/16/20); viewport density = `AppViewport` (`data-density`, `--active-control-min-height`, mounted `compact` today) driven from SSR preferences; `runtime.ts` sets `data-minion-theme` and, for voxelized/obsidian/crt, `data-theme`; user preferences via `/api/me/preferences/[section]` (`VALID_SECTIONS` allow-list); gates `lint:design` (baseline `scripts/.design-lint-baseline.json`, exceptions `scripts/design-lint-exceptions.json`), `lint:tokens`, `i18n:compile`, `check`, `build`, vitest. Shared data-view wrapper: `src/lib/components/data-view/DataView.svelte` + `data-view.ts`; page shells in `src/lib/components/ui/foundations/` + `ui/PageHeader.svelte`; route manifest `src/lib/routes/route-design-manifest.ts`; formatters in `$lib/utils/format.ts` (`formatMoney`, `formatMoneyShort`, `formatDate`, `appLocale`).

## Constitution Check

I spec-first ✔ (this document set). II AS-IS measured on master with counts ✔. III slice-scoped PRs from isolated worktrees, hub gates in the foreground before each PR ✔. IV design/token lint, Paraglide, no new routes/endpoints; the density preference reuses the existing preferences endpoint (new section key in the allow-list) ✔. V no security/data tags: no auth, RBAC, tenancy, migrations or production-data mutation; the preference section stores one enum per user.

## Project Structure and ownership

| Stream | Worktree / branch | Items | Owns |
|---|---|---|---|
| A — Baseline + density | `hub-A` / `feat/db-baseline-density` | 1, 2 | `src/app.css` un-layered role baseline consuming `--active-control-min-height`; `AppViewport` density from SSR preference; `src/lib/state/ui/density.svelte.ts` (scoped pref + server section, default compact); `/settings/appearance` control; `VALID_SECTIONS` + `density`; `data-dense` opt-outs; mounted tests; recipe fixture state |
| B — Normalisation sweeps | `hub-B` / `feat/db-normalise` | 3, 8 | bring every rule under its ceiling (exact equivalents + reason-coded exceptions incl. app.css theme bloom), lower the baseline, add `raw-control-height`, make `lint:design:ci` strict (`--strict-global`) with a negative test; icon codemod |
| C — Archetypes, placement, collapse | `hub-C` / `feat/db-archetypes` | 4, 6, 7 | generic layout-aware `archetype-composition.test.ts` over the existing `route-design-manifest.ts` (+ PageShell enum reconciliation, `KNOWN_NONCONFORMING`); PageHeader one-primary DOM-count test + pilot placement; collapse-by-purpose on pilots that really own a sidebar/filter bar/context panel (filters → `Sheet`, list → parent at ≤ 767.98 px), each pilot's 390 px render stated |
| D — States + content | `hub-D` / `feat/db-states-content` | 5, 9 | `CollectionState.svelte` beside the headless DataView (nine states) + three pilots; `verb_*` glossary; `scripts/qc/content-contract.test.ts` (all-keys divergence + per-file formatter-bypass ratchet with committed baseline) |

Meta (this feature dir): research.md (owned by coordinator from 012 evidence), contracts/ui.md addendum, evidence/, governance skill additions. Site: ceiling parity PR after B merges.

## Delivery sequence

1. Coordinator: worktrees + `bun install` per worktree (real install, never symlinked `node_modules`), branches from `origin/master`.
2. Streams A–D in parallel. Each stream: implement → focused vitest for touched areas → `lint:design` + `lint:tokens` + `i18n:compile` → Prettier on changed files → per-file Svelte compile sanity → commit (author = repository identity) → push → DRAFT PR to `master` with a body that states tests, out of scope, and the one-time user-visible effects. The coordinator runs `check` and `build` serially per PR before marking it ready (constitution III honoured by the coordinator on the same worktree); CI repeats them.
3. Merge order: B first (largest diff, mechanical), then A, then C, then D, rebasing each on the new master; conflicts are style-only by construction (B touches values, A/C/D touch structure).
4. After each merge: production alias verification as in 012 (`vercel inspect`, GitHub deployment SHA, EN/ES login smoke, served-CSS marker).
5. Meta docs PR with evidence; site parity PR for ceilings.

## Verification matrix

| Item | Proof |
|---|---|
| 1 Baseline | recipe matrix + 20 sampled routes at 390 px coarse: 0 unmarked sub-44 targets; dense surfaces listed with reasons |
| 2 Density | computed heights of row/toolbar/menu under both modes; preference round-trip test; appearance control mounted test |
| 3 Sizing | `lint:design` `raw-control-height` ≤ 30, `raw-icon-size` ≤ 50, ceilings committed; visual diff on 3 toolbars |
| 4 Archetypes | manifest covers 100 % of app pages; conformance test fails on a seeded violation |
| 5 States | wrapper state matrix mounted; three pilots render all nine states |
| 6 Collapse | pilots at 390/320: overflow 0, every control reachable, sidebar → parent route, filters → sheet |
| 7 Placement | pilot pages render one dominant action; scope declarations match the placement table |
| 8 Debt | `lint:design` raw-shadow ≤ 6, raw-layer ≤ 5, raw-color ≤ 120, raw-motion ≤ 3, raw-type-size ≤ 4 with ceilings |
| 9 Content | glossary test: 0 divergent verbs; formatter test: 0 bypasses |

## Risks and mitigations

- A global coarse floor can grow intentionally dense surfaces → the baseline only applies outside `[data-density="dense"]` and tables/icon-button clusters are marked by their primitives; measured before/after on the recipes.
- Mechanical sweeps can change visuals → B maps only exact equivalents (e.g. 13→14 px icons, 40 px → `--control-height-lg` 36 or `touch` 44 by context) and lists every non-equivalent replacement in its PR for review.
- Parallel streams conflict → disjoint ownership above; B merges first.
- Existing users' density → default comfortable equals today's sizing.
- Collapse changes navigation on pilots → pilots only; others follow once the archetype test proves the pattern.
