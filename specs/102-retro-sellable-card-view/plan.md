# Implementation Plan: Sellable card view — aligned, populated, configurable

**Branch**: `feat/sellable-card-view` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/102-retro-sellable-card-view/spec.md`

## Summary

Give the till gallery card and the catalog board card one shared body component that (a)
aligns its rows top-left across a band via CSS subgrid, (b) always reads price/stock/type
through the same derivation as the catalog table (so a bundle's computed stock is identical
on both surfaces), and (c) lets each viewer choose, per surface, which of a fixed field set
renders and in what order, persisted locally. No new route, no new table, no backend change.

## AS-IS → TO-BE → DELTA (Minion constitution Principle II)

*Spec Kit's template has no AS-IS/DELTA section; recorded here per `AGENTS.md` precedence.*

**AS-IS** (owner's framing, no file anchors available pre-implementation — this is the gap
Principle II calls out, see Constitution Check below):
- Till gallery card (`src/routes/(app)/pos/sell/+page.svelte`) renders name, price, and a
  stock badge inline; centered via the shared `Button` primitive's flex layout.
- Catalog board card (`src/routes/(app)/pos/catalog/+page.svelte`) renders name, code,
  price, and kind/active badges, with its own private `.bname/.bmeta/.bbadges` CSS — a
  different recipe from the gallery card.
- Neither surface shows stock for bundle/package items in a way confirmed to match the
  catalog table's bundle-aggregation logic — this is a suspected defect, not a confirmed
  one, since no anchor was taken before the owner's ask (see analysis.md finding).
- No field is configurable; the set of visible properties is hardcoded per surface.

**TO-BE**: One `SellableCard` body renders both surfaces' rows from a shared field catalog;
a surface-level subgrid pins every card's Nth row to the same height as its neighbors; both
surfaces fold bundle stock through the catalog's existing aggregation before rendering; a
per-surface, per-viewer field-visibility/order control persists in browser storage.

**DELTA** (transitions this plan must prove, each with its test — ids match tasks.md):
1. Gallery + board cards render through one component → visual parity test / snapshot.
2. Grid alignment via subgrid, content pinned top-left → acceptance scenario US1-1/2/3.
3. Till sellables pass through the same bundle-aggregation fold the catalog uses → US2-2.
4. Field visibility/order is configurable and persists per viewer per surface → US3-1/2/3.

## Technical Context

**Language/Version**: TypeScript 5 / Svelte 5 (runes)

**Primary Dependencies**: SvelteKit 2, Tailwind 4 (design tokens), lucide-svelte (icon),
existing `FieldsList` drag/toggle component (scheduling module, reused idiom), Paraglide i18n

**Storage**: Browser `localStorage`, keyed `cards:<surface-namespace>` — per-viewer only, no
server persistence, no new DB table

**Testing**: Vitest (unit) for the field-layout merge/move logic; manual + screenshot
verification for visual alignment (no visual-regression tool in this repo)

**Target Platform**: Web — `minion_hub` dashboard (SvelteKit, Vercel)

**Project Type**: Single SvelteKit app (subproject of the Minion meta-repo), UI-only slice

**Performance Goals**: No explicit target; card render stays O(number of configured fields)
per card, same order of work as today's hardcoded markup

**Constraints**: `lint:design` + `lint:tokens` debt may only decrease (Principle IV); every
new user-facing string goes through Paraglide `m.*()` + `i18n:compile`; must not regress the
existing gallery/board filtering, grouping, or view-switch behavior

**Scale/Scope**: Two surfaces (`pos/sell` gallery, `pos/catalog` board); a fixed field
catalog of ~9 keys; typical org catalog size is tens to a few hundred sellables per band

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|---|---|---|
| I. Spec before code | **PASS** | This plan follows a written spec; no code precedes it. |
| II. AS-IS→TO-BE→DELTA with evidence | **PARTIAL — FLAGGED** | TO-BE/DELTA are concrete and testable. AS-IS has **no file:line/screenshot anchor** — the owner's ask names a complaint, not a reproduction. Per Principle II ("A spec with unverified claims is not ready for `/speckit-plan`") this is a **blocking gap in a strict reading**: the plan proceeds here only because this is a UI-polish slice behind no security/data gate, but the gap is logged in the open-items ledger below rather than silently waived. |
| III. Slice-scoped delivery | **PASS (post-design)** | Two slices identified: Slice A (shared card body + alignment + field parity) and Slice B (per-viewer configurability). Each ships as its own PR against `minion_hub`'s registered PR base (`master`, confirm via `node scripts/repo-policy.mjs show hub`), from an isolated worktree, with `bun run check` + `bun run test` + `lint:design`/`lint:tokens` run in the foreground before each PR opens. |
| IV. Required build steps | **PASS (planned)** | New strings (`card_fields_configure`, a stock/active/empty-state label set) go through Paraglide + `i18n:compile`. No new route/API/nav link, so the route-contract manifest and RBAC wiring are N/A. `lint:design`/`lint:tokens` run before each slice's PR. |
| V. Security/data human gates | **N/A** | No auth, RBAC, credential, tenant-scoping, or production-data-mutation surface touched. |

**Open-items ledger entry (Principle II gap)**: AS-IS has no evidence anchor. TODO(handoff):
before Slice A's implementation task starts, take one file:line + screenshot anchor per
surface (gallery card markup, board card markup) so the DELTA's "before" state is provable,
not asserted. If skipped, the PR body must say so explicitly (per Principle I's hotfix
carve-out) and point to this plan.

## Project Structure

### Documentation (this feature)

```text
specs/102-retro-sellable-card-view/
├── spec.md
├── plan.md              # this file
├── tasks.md
├── analysis.md
└── checklists/
    └── requirements.md
```

### Source code (inside the `minion_hub` subproject checkout, not this meta-repo)

```text
src/lib/pos/
└── sellable-card-fields.ts        # field catalog, labels, shared stock-tone rule

src/lib/components/data-view/
├── card-fields.ts                 # pure merge/move/visible logic (new)
└── card-fields.svelte.ts          # per-viewer reactive store over card-fields.ts (new)

src/lib/components/pos/
├── SellableCard.svelte            # shared card body (new)
└── CardFieldsMenu.svelte          # ⋯ popover wrapping FieldsList (new)

src/routes/(app)/pos/sell/
├── +page.svelte                   # gallery: adopt SellableCard + subgrid CSS + CardFieldsMenu
└── +page.server.ts                # fold sellables through aggregateBundles before sending to the page

src/routes/(app)/pos/catalog/
└── +page.svelte                   # board: adopt SellableCard + CardFieldsMenu
```

**Structure Decision**: Single-project (SvelteKit) structure, no backend/frontend split and
no new project type — this is additive UI within `minion_hub`'s existing `src/lib` + `src/routes` layout.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

No violations beyond the logged Principle II gap above (not a complexity violation — an
evidence gap, carried in the open-items ledger rather than justified away).
