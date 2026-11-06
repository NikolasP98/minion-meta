# Retro Scorecard — Sellable card view (hub #537 + #538)

Written against the SDD artifacts in this directory (spec.md, plan.md, research.md,
data-model.md, tasks.md, analysis.md), built from the owner's ask only, then checked
against what #537/#538 actually shipped.

## 1. Functional requirement → delivering PR → proving test

| Req | Delivered by | Proving test (file from diff) |
|---|---|---|
| FR-001 top-pinned content | #537 (introduced the bug), fixed by #538 | none automated — manual/screenshot QA only (both PR bodies) |
| FR-002 cross-card row alignment | #537 (subgrid), fixed by #538 | none automated |
| FR-003 price/stock/type parity across surfaces (incl. bundles) | #537 (price/kind), **broken until #538** (stock) | none — `gh pr diff 538` touches zero test files; parity was unverified by any test, before or after |
| FR-004 visible type indicator | #537 `SellableCard.svelte` kind badge | none specific |
| FR-005 "—" placeholder for empty fields | #537 `SellableCard.svelte` `EMPTY` map | none |
| FR-006 per-viewer, per-surface configurable fields | #537 `CardFieldsMenu.svelte` + `createCardFields` | `card-fields.test.ts` (indirectly, via the pure merge logic it's built on) |
| FR-007 persists per viewer only | #537 `card-fields.svelte.ts` (localStorage) | none — the `.svelte.ts` reactive wrapper itself is untested; only its pure `card-fields.ts` base is |
| FR-008 scoped per surface (two namespaces) | #537 (`pos-sell-gallery` / `pos-catalog-board` keys) | none specific |
| FR-009 new/retired field merge rule | #537 `card-fields.ts` `mergeFieldLayout` | `card-fields.test.ts` — "keeps the viewer order, drops retired keys, slots a new field at its catalog position" (direct hit) |
| FR-010 one shared card-row recipe for both surfaces | #537 `SellableCard.svelte` used by both routes | none direct — enforced only by code structure (one component, two call sites), no snapshot test |

**Pattern**: the only two requirements with a named automated test are the two pure,
synchronous functions (`mergeFieldLayout`, `moveField`) in `card-fields.test.ts`. Every
visual requirement (FR-001/002/004/005/010) and the cross-surface data requirement
(FR-003) shipped with zero automated proof — including the one that broke (FR-003/stock).

## 2. Scoring #537's PR body (the only pre-work artifact) — 0–5 each

| Dimension | Score | Why |
|---|---|---|
| Evidence anchors | 2/5 | Names a local QA stack run and "screenshots in the session scratchpad," but nothing is linked/attached to the PR itself, and there is no AS-IS anchor (no before screenshot, no file:line of the bug) — only a TO-BE description. |
| Testable requirements | 1/5 | Written as feature prose ("make sure the properties populate correctly") not as discrete, falsifiable statements; no scenario names a specific item/kind to check. |
| Measurable success criteria | 0/5 | None exist. "Gates" lists lint/test/type-check pass — a process gate, not a feature outcome metric. |
| Task→commit traceability | 0/5 | No task breakdown preceded the PR; the PR diff is the only unit of work, so there is nothing to trace a task to — it IS the task. |
| Open-items ledger | 2/5 | The "Not yet" section is a real, if informal, open-items note (QA pending on real tenancy data) — partial credit for the *habit*, none for the *format* (no `TODO(handoff)`, no `proposals/` entry, and the item it should have logged — "stock parity with bundles is unverified" — isn't the item it actually logged). |

**Total: 5/25.** The PR body is honest about what it did and admits what it hasn't fully
checked, but it carries almost no evidence, no falsifiable requirement, no metric, and no
structural link from "what was planned" to "what was built" — because nothing was planned
as a separate artifact.

## 3. Would the SDD spec/plan/tasks have caught the two #538 defects before #537 merged?

**Stock parity (the till showed null for a package's stock while the catalog showed 4) —
yes, with high confidence.** `research.md`'s "Decision: shared stock derivation" states
verbatim: *"Both surfaces must run sellables through the same bundle/package stock
aggregation before computing the card's stock field... call the one existing function from
both load paths."* `tasks.md` T014 names the exact missing wire-up as "the exact gap #538
later fixed" and `plan.md`'s DELTA item 3 + `spec.md` SC-002 ("zero discrepancies across a
full catalog pass") together give both the fix and the test for it. A reviewer who read
T013/T014 against the till's `+page.server.ts` diff would see immediately that
`listSellables(ctx)` was passed straight through with no `aggregateBundles` call — the same
one-line diff #538 later added. This is the clearest case in the whole exercise of a spec
catching a defect the PR body never named as a risk.

**Button-centering misalignment (grid inherited the Button's flex-centering, so a single
auto column floated mid-card) — plausibly, not guaranteed.** `spec.md` Acceptance Scenario
US1-1 requires checking "a one-line-name item next to a two-line-name item" for matching
top-start alignment — exactly the condition the real bug exposed. `tasks.md` T010 names the
risk explicitly: *"explicitly verify the Button primitive's own `justify-content`/
`align-items` centering does not leak into the new grid axes."* If that task's verification
step were actually executed as written — rendering that specific mixed-length scenario and
looking at it — it would have shown the floating content before merge. The honest caveat:
this requires a human or agent to *run* the named acceptance scenario, not merely to have
written it; the real #537 PR body's own QA note ("gallery cards span 4 subgrid rows,
toggling Código... persists") checked field-count/persistence but never mentions checking
mixed-length visual alignment specifically — i.e., the real process skipped exactly the
check the spec would have required by name. So: the artifact raises the odds of catching it
from "not considered" to "named and specifically testable," but does not make the catch
certain, because nothing in Spec Kit forces the scenario to actually be executed before
merge (no CI gate ties an acceptance scenario to a required check).

**Bottom line**: one of the two defects (stock parity) is close to a direct hit — the spec
and task literally describe the fix #538 had to ship. The other (alignment) is a near-miss
made survivable only by someone actually running the acceptance scenario as a step, which
Spec Kit documents but does not enforce.

## 4. Overhead estimate

Phase times for this retro's artifact authoring (wall-clock, this agent, document writing
only — no code, no gates run):

| Phase | Start | End | Duration |
|---|---|---|---|
| specify + clarify (spec.md incl. Clarifications) | 18:24:54 | 18:26:12 | ~1m18s |
| plan (plan.md + research.md + data-model.md) | 18:26:12 | 18:28:35 | ~2m23s |
| tasks (tasks.md) | 18:28:35 | 18:29:35 | ~1m00s |
| analyze (analysis.md) | 18:29:35 | 18:30:32 | ~0m57s |
| **Total (specify→analyze)** | | | **~5m38s** |

Apparent real-world cycle time, from `gh pr view`:

- #537 open → merged: 18:20:04Z → 18:46:49Z = **26m45s** (full implementation + gates + review + merge)
- #538 open → merged: 19:11:11Z → 19:18:59Z = **7m48s** (the follow-up fix cycle)

The ~5.5 minutes of SDD document-writing is roughly 20% on top of #537's actual cycle time,
or about 70% of #538's entire cycle time, with the caveat that this is pure documentation
time against a real cycle that includes code + CI + review — not an apples-to-apples
addition, since in a real adoption the spec/plan/tasks would be written once, before any
code, not after. The more relevant comparison: if the stock-parity catch in §3 holds, the
~5.5 minutes spent upfront would have been fully offset by not needing #538's ~8-minute
follow-up cycle at all — closer to a wash than a tax, assuming the catch is real and not
hindsight-assisted (see §3's honest caveat that this agent had the shipped code as a guide
when writing these artifacts, even though it wrote them as pre-#537 outputs).
