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
approved_reason: "Pass-2 operator review 2026-08-29: plan re-verified against minion-base@19531059 — of the three authored work-package specs, two (UI-002/003, UI-005/006/007) are merged and recorded flag-activated by their own specs (not runtime-reverified this pass), the third (UI-004/011) has only Slice 1 of 4 merged with both flags off; UI-001 shipped directly, outside any authored work-package spec. Two non-negotiables are recorded OPEN rather than shipped: the mobile-default law ('attention queue default, one stage at a time') is not built or enabled, and UI-001's revision-binding law is honored by the shipped caller but not enforced at the server boundary (POST /api/meta/status still accepts a body with no expectedStatus/expectedRevision) — follow-up proposal 2026-08-29-base-meta-status-revision-binding-required. No blanket conformance claim is made for the shipped packages. Kept as plan of record (repos [] — never dev-queued); the stale delivery-order status line and the superseded UI-003 nav enumeration were corrected in this pass."
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
contents API, and from the merged-PR record. Code presence, merged PRs, and
`.env.example` defaults are verified this way; production flag *activation*
is not — the two rows below record what the linked work-package specs claim
about activation, not a runtime probe against a live deployment.

| WP | State | Evidence |
|---|---|---|
| UI-001 gate integrity | shipped, on main — with one open contract gap | `src/lib/server/meta-write.ts` — `applyTransition()` with the `transition_committed` / `already_applied` / `revision_conflict` / `invalid_transition` outcome union and `indexSynced` returned, never swallowed; the source→target `TRANSITIONS` table (`meta-write.ts:64-78`, enforced at `:121-124`) and the GitHub-side blob-sha CAS on the PUT (`:128-132`) both hold unconditionally, and the shipped caller `src/routes/kanban/[kind]/[...ref]/+page.server.ts` sends `expectedStatus` + `expectedRevision` on every gate (`:321`, `:523-524`, `:535-536`). **Open gap — the revision-binding law is honored by the caller, not enforced by the contract:** `src/routes/api/meta/status/+server.ts` types both guards optional (`:16-25`) and requires only `kind`/`id`/`status` (`:26-27`) before forwarding them (`:29-32`), and `meta-write.ts` takes `expected?` (`:90-95`) and runs the conflict check only when a guard is present (`:114-119`). A direct or stale client posting `{kind,id,status}` therefore commits against whatever blob the server itself just fetched, without proving which status or revision the operator reviewed. Recorded as an open non-negotiable, not as shipped → `proposals/2026-08-29-base-meta-status-revision-binding-required.md` |
| UI-002 + UI-003 | shipped; flag recorded on, not runtime-reverified | spec `2026-08-18-base-ui-primitives-and-shell-spec` (deploy/done); PR #25 `0513acb1`; `PUBLIC_MOBILE_SHELL_V2` recorded as activated in production 2026-08-20 by that spec — not runtime-reverified in this pass (no deployment id, live probe, or rendered-shell assertion captured); `Status/AsyncButton/Popover/Disclosure/IntegrityMark/CopyableHash/BottomNav/ContextHeader/AppShell` all present; DESIGN.md §Scene rewritten to the mobile decision cockpit |
| UI-005 + UI-006 + UI-007 | shipped; flag recorded on, not runtime-reverified | spec `2026-08-18-base-workdetail-summary-first-spec` (deploy/done); PR #28 `805886e0`; `PUBLIC_WORK_DETAIL_V2=1` recorded as activated in production 2026-08-20 by that spec — not runtime-reverified in this pass (no deployment id, live probe, or rendered-shell assertion captured); `src/lib/work-detail/{adapters,types,fixtures}.ts` + `src/lib/components/work-detail/{IdentityStrip,DecisionBrief,ReadinessBand,DecisionDock,WorkDetailShell}.svelte`; `src/routes/kanban/issue-route.test.ts` |
| UI-004 + UI-011 | Slice 1 of 4 merged, flag off | spec `2026-08-18-base-attention-queue-responsive-runs-spec` (pass 5, approved); PR #39 `19531059` "feat(board): add URL-restorable attention queue filters" introduced `src/lib/board/{attention,view-state,feature-flag,parse-feature-flag}.ts`; `PUBLIC_ATTENTION_QUEUE_V2` and `PUBLIC_RESPONSIVE_RUNS_V2` are both reserved and default off (`.env.example`) — the queue UI (Slice 2), focused stages + filter sheet (Slice 3) and run cards (Slice 4) are not built |
| UI-008 / UI-009 / UI-010 | still blocked — prerequisites partly built, the contracts they need still absent | Their named prerequisites (durable decision API, durable events, SDLC evidence manifest) map to the roadmap's M2 (durable state/evidence spine) and M6 (browser evidence + durable HITL) milestones. The corpus is not empty beyond M0 — `2026-08-18-agent-instruction-parity-and-repo-policy-spec` (M1, approved, merged fleet-wide) and `2026-08-18-factory-topic-capability-manifest-spec` (M3, stage done/status shipped, its own `reconcile_ignore_reason` saying only Slice 2 of 6 merged) both postdate it — and both gating milestones carry real, partly merged WIP. **M2 — `2026-08-18-factory-durable-state-outbox-spec`** (status `implementing`, verdict `changes_requested`): it defines Slice 0 (recon/collision gate, §3) plus implementation Slices 1–4 (§4), not six. minion-factory PR [#61](https://github.com/NikolasP98/minion-factory/pull/61) merged as `3e011de1` on 2026-08-22 stating "This implements Slices 1-3", and factory `main` carries that merge: the append-only `lifecycle_events` table, the CAS-guarded run-status writes and the `outbox_jobs` drain worker are shipped. Slice 4 is split — its explicit source→target `EDGES` table is still blocked on the spec's §8 *human* policy decision, while the rest of it is live unique WIP in OPEN PR [#160](https://github.com/NikolasP98/minion-factory/pull/160) (head `factory/179243f0-implementing-spec-durable-state-`, 5 commits, `verify` + `label` checks FAILING as of 2026-08-29T13:48Z). Treat #160 as neither merged nor abandoned: do not re-implement Slices 1–3, and do not overwrite #160's Slice-4 work. What UI-008 and UI-010 still lack is not the storage but the *exposed contract* — on factory `main` the `lifecycle_events` table is written and read only inside the runner process (`runner/src/events.ts` is its sole writer; `runner/src/db.ts` INSERTs and EXISTS-checks it), and `runner/src/index.ts` publishes no HTTP route that returns lifecycle events, so base has no durable-event feed to render a timeline from; the guarded-edge policy UI-008's workflows would enforce is likewise still an undecided human decision. **M6 — `2026-08-28-factory-browser-verification-stage-spec`** (stage `spec`, status `draft`, verdict `approved`): 8 slices, 0 merged — no minion-factory PR implements it — so the SDLC evidence manifest UI-009 needs does not exist yet. The blocker therefore holds on missing contracts and one undecided policy, not on milestone-spec nonexistence and not on the absence of all M2 work |

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

**DELTA (pass 1 → pass 2).** No law changed. Documentation transitions only:
(1) the delivery-order line no longer claims UI-001 is the only shipped
package — the verified table above replaces that status claim; (2) the UI-003
nav enumeration is marked superseded with the shipped enumeration and the
still-binding law named; (3) the lifecycle disposition is now explicit
(`verdict: approved`) instead of `approved` with no verdict, which is what
made the plan indistinguishable from a spec awaiting review; (4) after the
first review round, the approval reason stopped claiming that every
non-negotiable is shipped, production flag activation was relabelled
recorded-not-runtime-reverified, and the work-package roll-up was corrected to
UI-001-shipped-directly plus two-complete/one-partial authored specs;
(5) after the second review round, the M2 prerequisite ledger was replaced with
the exact merged/open PR evidence (factory PR #61 merged Slices 1–3; PR #160
carries the unmerged remainder of Slice 4) so no downstream planner can read
this document as "M2 has zero merged work", and UI-001's revision binding was
demoted from shipped to an open contract gap with a named follow-up proposal.
Every law in §Non-negotiables is unchanged by all five.

## Related

- `2026-08-18-base-ui-primitives-and-shell-spec` — UI-002/003, `extends` this
  plan; merged, flag recorded activated (not runtime-reverified).
- `2026-08-18-base-workdetail-summary-first-spec` — UI-005/006/007,
  `depends-on` this plan; merged, flag recorded activated (not
  runtime-reverified).
- `2026-08-18-base-attention-queue-responsive-runs-spec` — UI-004/011,
  `depends-on` this plan; approved, Slice 1 merged, Slices 2–4 open.
- `2026-08-18-sdlc-transformation-roadmap` — the factory-side programme whose
  M2 (`2026-08-18-factory-durable-state-outbox-spec`, implementing — Slices 1–3
  merged as factory PR #61 `3e011de1`; Slice 4 split between the open §8 policy
  decision and open PR #160) and M6
  (`2026-08-28-factory-browser-verification-stage-spec`, draft — 8 slices, none
  merged) milestones gate UI-008/009/010. Both specs exist and M2 is partly
  built; what is missing is the exposed durable-event/decision contract and the
  evidence manifest, not the milestone specs.
- `proposals/2026-08-29-base-meta-status-revision-binding-required` — the
  follow-up that closes UI-001's server-side revision-binding gap recorded in
  the status table above.

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
archaeology: UI-001 shipped directly, outside any authored work-package spec;
of the three authored work-package specs, two (UI-002/003, UI-005/006/007)
merged and are recorded flag-activated by their own specs (not
runtime-reverified this pass), and the third (UI-004/011) is mid-implementation
with both flags off. Later unrelated base work (the 2026-08-28 traceability
overhaul) was governed by these same non-negotiables.

Approval is of the *plan*, not a certificate that the code satisfies it. Two
non-negotiables are recorded open by the verification above, and neither may
be cited as shipped:

1. **Mobile default** (lines 48–50) — the attention queue / focused-stage law
   is unbuilt behind `PUBLIC_ATTENTION_QUEUE_V2`, which defaults off. Owned by
   `2026-08-18-base-attention-queue-responsive-runs-spec` Slices 2–4.
2. **Revision-bound mutations** (lines 44–46) — enforced by the shipped UI
   caller but optional at the server boundary, so a direct or stale client can
   still mutate without proving the reviewed revision. Owned by the follow-up
   `proposals/2026-08-29-base-meta-status-revision-binding-required.md`; UI-001
   stays "shipped with an open contract gap" until that endpoint rejects a
   missing/stale `expectedStatus` or `expectedRevision` before any PUT, with
   tests proving the omission, stale-status and stale-revision paths all write
   nothing. No product code was touched in this spec-stage pass.

Not `archived` — two work packages remain partially built (UI-004, UI-011 —
Slice 1 of 4 merged, flags off), three more are blocked-not-cancelled
(UI-008/009/010), and UI-001 has an open follow-up, so the document still has
consumers. Not `rejected` — its laws are implemented in part and open in part,
not refuted. Not `still-review` — the two open non-negotiables are recorded
with owners and evidence, which is a disposition, not an unanswered question.
