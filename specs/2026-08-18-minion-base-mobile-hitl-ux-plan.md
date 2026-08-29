---
id: 2026-08-18-minion-base-mobile-hitl-ux-plan
title: Minion Base mobile-first HITL UX plan (UI0–UI7 program)
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-29
repos: []
type: decision
tags: [ui, board]
verdict: approved
related: [2026-08-18-base-ui-primitives-and-shell-spec, 2026-08-18-base-workdetail-summary-first-spec, 2026-08-18-base-attention-queue-responsive-runs-spec]
approved_reason: "Pass-2 operator review 2026-08-29: plan re-verified against minion-base@19531059 — 3 of 4 authored work-package specs merged and flag-activated, the 4th is mid-implementation, every non-negotiable is honored by shipped code. Kept as plan of record (repos [] — never dev-queued); the stale delivery-order status line and the superseded UI-003 nav enumeration were corrected in this pass."
---

# Minion Base mobile-first HITL UX plan

Plan of record, user-authored 2026-08-18, re-verified 2026-08-29 (repos [] —
reference document; work-package specs cite it and carry the implementation).
Target: a decision cockpit, not a responsive dashboard — "understand one exact
work revision, evaluate its proof, and make a safe decision in one focused
mobile session."

## 0. Product

The board at base.minion-ai.org is where a human answers the agent fleet. The
user's ask, in their words: the UI changes needed so that reviewing an agent's
work on a phone at night is a *decision* activity, not a dashboard-reading
activity. This document freezes the laws that every base UI change obeys and
the order the work packages land in. It is deliberately not implementable on
its own — `repos: []` keeps it out of the dev queue, and each UI-0xx work
package gets its own proposal → spec → PR.

## Non-negotiables

These are law for every base UI change, including changes made outside the
UI-0xx packages.

- Visual hierarchy on EVERY screen: Decision → Risk → Proof → Detail → History.
- No consequence lives only in a tooltip; approval copy states current state,
  resulting state, spawned automation, target repo, next human gate, exact
  revision.
- Consequential mutations are revision-bound (expected status + revision,
  409 on staleness); partial success (approved_queue_pending) is a persistent
  state distinct from success; receipts are durable.
- No board-level one-click approval; compact cards route to detail.
- Mobile: attention queue default, one stage at a time, no page-level
  horizontal scrolling, bottom nav + decision dock with safe-area insets,
  44×44 touch targets.
- State never color-only: shape + label + color + accessible name (symbol
  grammar: ◇ decision, ▶ running, × failed, ✓ approved, △ caution, etc.).
- Evidence is typed with integrity marks (verified/claimed/stale/missing/
  quarantined/invalidated) and provenance stamps (A/H/CI/BR/RV/RL); the UI
  never invents missing evidence (Availability<T> per field).
- Preserve the graphite/ember/ivory scene; hairline rules, no gradients/
  glass/decorative status color.

## Delivery order (work packages)

UI-001 gate integrity → UI-002 primitives (Status/AsyncButton/Popover/
Disclosure/IntegrityMark/CopyableHash) → UI-003 mobile shell (bottom nav,
sticky context header, safe-area tokens, DESIGN.md scene update) → UI-004
attention queue + focused stage selector + URL filters → UI-005 internal issue
detail route → UI-006 WorkDetail adapter (Availability-typed) → UI-007
summary-first detail (IdentityStrip/DecisionBrief/ReadinessBand/DecisionDock)
→ UI-008 guarded decision workflows (blocked on durable decision API) → UI-009
evidence/artifact system (blocked on SDLC evidence manifest) → UI-010 live
timeline (blocked on durable events) → UI-011 responsive runs cards.

Feature flags PUBLIC_*_V2, fixtures library (20 cases), Playwright + axe +
visual regression matrix (320→1920), microcopy law ("decision/evidence/
revision/verified/claimed", never "looks good/done/green"). Full screen-by-
screen detail lives in the user's 2026-08-18 UX program message.

**Correction (pass 2):** UI-003's bottom nav was authored as
Overview/Work/Request/Runs/More. That enumeration is superseded — the
2026-08-28 traceability overhaul (PR #38 `1d2151b`, PR #40 `eda405ce`) folded
Runs and Lab into `/kanban?view=factory|lab` subtabs so one primary
destination covers all three, and the fifth slot became Stats. The shipped
nav is Overview/Work/Request/Stats/More
(`src/lib/components/app-shell.ts:activeDestination`). The *law* the
enumeration served — five reachable primary destinations, icon + text label,
44px, prefix-aware active, no two current items — is unchanged and still
binding.

## Programme status — verified 2026-08-29

**AS-IS (verified).** Every claim below was read from `minion-base@main`
`19531059cf42e352e35425dd3b3b71afa9eb540f` (2026-08-28) through the GitHub
contents API, and from the merged-PR record.

| WP | State | Evidence |
|---|---|---|
| UI-001 gate integrity | shipped, on main | `src/lib/server/meta-write.ts` — `applyTransition()` with the `transition_committed` / `already_applied` / `revision_conflict` / `invalid_transition` outcome union and `indexSynced` returned, never swallowed |
| UI-002 + UI-003 | shipped + flag on | spec `2026-08-18-base-ui-primitives-and-shell-spec` (deploy/done); PR #25 `0513acb1`; `PUBLIC_MOBILE_SHELL_V2` activated in production 2026-08-20; `Status/AsyncButton/Popover/Disclosure/IntegrityMark/CopyableHash/BottomNav/ContextHeader/AppShell` all present; DESIGN.md §Scene rewritten to the mobile decision cockpit |
| UI-005 + UI-006 + UI-007 | shipped + flag on | spec `2026-08-18-base-workdetail-summary-first-spec` (deploy/done); PR #28 `805886e0`; `PUBLIC_WORK_DETAIL_V2=1` activated in production 2026-08-20; `src/lib/work-detail/{adapters,types,fixtures}.ts` + `src/lib/components/work-detail/{IdentityStrip,DecisionBrief,ReadinessBand,DecisionDock,WorkDetailShell}.svelte`; `src/routes/kanban/issue-route.test.ts` |
| UI-004 + UI-011 | Slice 1 of 4 merged, flag off | spec `2026-08-18-base-attention-queue-responsive-runs-spec` (pass 5, approved); PR #39 `19531059` "feat(board): add URL-restorable attention queue filters" introduced `src/lib/board/{attention,view-state,feature-flag,parse-feature-flag}.ts`; `PUBLIC_ATTENTION_QUEUE_V2` and `PUBLIC_RESPONSIVE_RUNS_V2` are both reserved and default off (`.env.example`) — the queue UI (Slice 2), focused stages + filter sheet (Slice 3) and run cards (Slice 4) are not built |
| UI-008 / UI-009 / UI-010 | still blocked | their named prerequisites (durable decision API, SDLC evidence manifest, durable events) map to M2/M6 of `2026-08-18-sdlc-transformation-roadmap`; no milestone spec beyond `2026-08-18-factory-m0-safety-foundation-spec` (implementing) exists in `specs/index.json`, so no prerequisite has landed |

Cross-cutting law also verified as honored on main: `@axe-core/playwright` +
Playwright are wired (`package.json`), the visual-regression matrix covers
320/390/768/1280/1920 (`tests/e2e/*-snapshots/`), the fixture library holds
exactly 20 cases (`src/lib/work-detail/fixtures.ts`), and consequential
actions render only on the detail route
(`src/routes/kanban/[kind]/[...ref]/+page.svelte` — no board-level gate).

**TO-BE.** Unchanged from pass 1: the eleven work packages complete, each
behind its `PUBLIC_*_V2` flag until activated, with the non-negotiables above
holding on every screen. The plan itself never changes state beyond
`stage: spec` / `repos: []` — it is cited, not implemented.

**DELTA (pass 1 → pass 2).** No law changed. Three documentation transitions:
(1) the delivery-order line no longer claims UI-001 is the only shipped
package — the verified table above replaces that status claim; (2) the UI-003
nav enumeration is marked superseded with the shipped enumeration and the
still-binding law named; (3) the lifecycle disposition is now explicit
(`verdict: approved`) instead of `approved` with no verdict, which is what
made the plan indistinguishable from a spec awaiting review.

## Related

- `2026-08-18-base-ui-primitives-and-shell-spec` — UI-002/003, `extends` this
  plan; merged and flag-activated.
- `2026-08-18-base-workdetail-summary-first-spec` — UI-005/006/007,
  `depends-on` this plan; merged and flag-activated.
- `2026-08-18-base-attention-queue-responsive-runs-spec` — UI-004/011,
  `depends-on` this plan; approved, Slice 1 merged, Slices 2–4 open.
- `2026-08-18-sdlc-transformation-roadmap` — the factory-side programme whose
  M2/M6 milestones gate UI-008/009/010.

## Out of scope

This document specifies no code and no slices. It does not schedule the work
packages (each package's own spec owns its slices, tests and flags), does not
own factory-side milestones, and does not authorise a dev run — `repos: []` is
the mechanism that keeps it out of the queue, and adding repo ids to it would
be a category error rather than a promotion.

## Verification

The plan is verified by re-reading the corpus, never by a build:

1. `node scripts/spec-index.mjs` — frontmatter valid, `specs/index.json`
   regenerated, `verdict: approved` published.
2. For each work-package id in the status table, the linked spec's frontmatter
   agrees with the table (stage/status/merge evidence), and the named
   file or symbol still exists on `minion-base@main`.
3. Every non-negotiable is spot-checked against a shipped anchor — the table's
   last paragraph lists the anchors used for the cross-cutting ones.

A future pass re-runs step 2 and 3; a divergence is a defect in whichever
artifact is stale, and this plan's laws are the tiebreaker.

## Disposition — approved (2026-08-29, pass 2)

**Approved and kept as the plan of record.** The plan is live law, not
archaeology: four of its work-package groups produced specs, three of those
merged and are flag-activated in production, the fourth is mid-implementation,
and later unrelated base work (the 2026-08-28 traceability overhaul) was
governed by these same non-negotiables. Nothing in it was contradicted by the
code review above.

Not `archived` — three work packages remain unbuilt and three more are
blocked-not-cancelled, so the document still has consumers. Not `rejected` —
its laws are implemented, not merely proposed. Not `still-review` — the only
thing that was open was a missing `verdict`, and the evidence to close it is
above.
