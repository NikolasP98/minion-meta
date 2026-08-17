---
id: 2026-08-17-sdlc-phase-gates-scoring-spec
title: SDLC phase gates & preemptive scoring — anti-slop checks at every boundary + backward reconciliation
stage: spec
status: draft
pass: 1
created: 2026-08-17
updated: 2026-08-17
repos: [minion-meta, minion-factory, minion-base]
verdict: pending
type: infra
---

# SDLC phase gates & preemptive scoring

**Extends:** `2026-08-13-request-to-deploy-sdlc-pipeline-spec.md` (the pipeline) and `2026-08-13-agentic-sdlc-test-quality-gates-spec.md` (test execution/integrity). This spec is the *artifact-quality* layer: score and gate each stage's output **before** the next stage consumes it, and reconcile board state backward from reality.

## 0. Product

User intent (verbatim, 2026-08-17): "evaluate the open items … are they stale? were they superseded? … Add a scoring system wherever relevant … kind of what the thermonuclear review does after a PR is submitted, but preemptively. Evaluate having a GATE on certain phases that checks/scores the output before sending it to the next phase to avoid approving slop before it happens. Also, evaluate adding more steps to the pipeline (writing tests should be its own phase? or part of planning/implementation?)"

## 1. Evidence — what the 2026-08-17 board audit proved

Every active card was verified against target-repo reality (3 agents, commit-level evidence):

| Finding | Count | Meaning |
|---|---|---|
| Specs shown active whose work was already **merged and deployed** | **21 / 32** | The pipeline writes forward only. Nothing flips frontmatter when a PR merges — the board rots at a rate of ~2/3 of its cards |
| Pass-1/pass-2 spec pair with **no `supersedes` link** either direction | 1 | The template mandates bidirectional links; nothing enforces it |
| Approved, high-value (9/10), well-specified item **idle 4 days** | 1 (CRM pagination p2) | "approved" alerts nobody; there is no pull toward dev |
| Real security item correctly still open | 1 (channel-scoping, fail-open confirmed live in `org-scope.ts`) | Triage works when a human does it — the gate's job is doing it continuously |
| CI-watch proposal correctly filed for a real red (hub master Prettier) | 1 | The *forward* sensors work; the backward ones don't exist |
| Bot noise card (67k-commit upstream issue) | 1 | Sources without thresholds become board spam |

The failure mode is **not** slop entering the pipeline — it's (a) stale state nobody reconciles and (b) no quality signal at the human gates, so approving means "I skimmed it."

## 2. Design principles

1. **Score at the boundary, store in the sidecar.** Every gate writes `specs/<id>.review.md` (or the proposal's sidecar) with frontmatter: `score`, `axes`, `verdict`, `reviewer`, `reviewed_commit`. The board reads sidecars. Gate state is *derived* from artifacts — never a DB column (house rule: gates derived from PR/file state).
2. **Fresh context, rubric in the prompt, applier re-verifies.** The scorer never sees the author's transcript (Anthropic rule, already factory policy); rubrics are deterministic checklists, not vibes; anything the scorer proposes to change is re-verified by the applier (factory v4 lesson — thermonuclear's fix on gw#211 was contract-wrong).
3. **Gates block buttons, not people.** A below-threshold score disables the board's promote button and shows why; the human can override with a recorded reason. Nobody in the researched industry lets AI own the roadmap — same here: gates inform the human decision, they don't replace it.
4. **Backward reconciliation is a gate too.** A stage transition that already happened in reality (PR merged, deploy shipped) must flow *back* into the artifact within a day, mechanically.

## 3. The gates

```
Proposal ──[G1 score]──▶ Spec p1 ──[G2 = pass-2 review + score]──▶ approved
  ──[G3 red-state]──▶ Dev loop ──[G4 review score]──▶ PR ──[G5 CI+train]──▶ Deploy
        ▲                                                            │
        ╰──────────────[G0 reconciler — backward gate]◀──────────────╯
```

### G0 — Staleness reconciler (build FIRST; the audit proves it's the biggest hole)
Extend the existing factory proposal-reconciler (already live, committing `reconcile: proposal sweep`) with a **spec sweep**: for every spec with `stage ∈ {spec, dev}` and `status ∈ {approved, implementing, draft, review}`:
- search target repos for evidence of shipment: merged PRs whose title/body references the spec id or its distinctive nouns; files the spec names; `git log --grep` on slice keywords;
- high confidence → flip frontmatter (`stage: done, status: shipped`, `updated`) and commit `reconcile: spec sweep`;
- medium confidence → add `possibly_shipped: <evidence-url>` to frontmatter; board renders an amber "verify" chip; human confirms with one click;
- also enforce link hygiene: a `pass > 1` spec without `revises`/`supersedes`, or a superseded spec whose successor doesn't link back, gets auto-fixed or flagged.
Cadence: after every fleet PR merge event + daily sweep. **DoD:** re-running today's audit finds 0 shipped-but-active specs; the 21 flips this audit made by hand would all have been made by the sweep.

### G1 — Proposal gate (before "spec it")
Single fresh-context agent scores the proposal 0–10 on: problem stated in user terms · motivation/value · explicit out-of-scope · testable definition of done · dedupe check ran (candidates listed). Threshold 6 to enable "spec it"; below, the button shows the missing axes. Score chip on the card. (Ambiguity is the #1 agent failure category — this is the cheapest place to kill it.)

### G2 — Spec gate (before "approve for dev")
The pass-2 spec-review agent **already exists and already writes the sidecar** — upgrade it to also emit the score block. Axes: slice size ≤ "junior dev 4–8h" · machine-checkable DoD per slice · explicit out-of-scope · repo/impact-zone correctness (AGENTS.md table) · **collision scan** (overlaps/supersedes existing specs — today's audit found a missed link within 10 days) · testability (each slice names its verification command). Verdict `pass ≥ 7 / warn 5–6 / block < 5`. "approve for dev" disabled on block; warn requires the override reason.

### G3 — Red-state gate (inside dev, entry condition)
Per quality-gates spec S7: for feature slices, the dev stage's first act is writing the DoD's failing tests; the runner verifies non-zero exit **before** implementation counts. Enforced in `run.sh` (orchestrator, not prompt). This answers the "should test-writing be its own phase?" question — **no new board column**: a separate test-writing phase recreates the context-loss handoff between agents, and every system researched (Devin, Copilot agent, Cursor, Factory.ai) keeps test-writing inside the dev loop with the *verification* tier separate. Tests-as-verification is already the Testing column (CI). Test-*authoring* is a structural sub-stage of dev with a mechanical red-state check.

### G4 — Review gate (before "ready for review")
Already exists (adversarial review stage + external review polling + APPLY/DISMISS triage). Formalize its output into the same sidecar score format so the board shows one consistent chip per stage. Add the empirical-check bias (UI slices: screenshot/curl the preview, not just the diff).

### G5 — Merge/deploy gate
= quality-gates spec S1/S4 (CI resurrection — done via gw PR #214; train gate on DEV CI + nightly green). No change here; listed for completeness.

### Source hygiene (small, do with G0)
Noise thresholds on automated card sources: upstream-monitor files one "diverged" issue above 500 commits instead of enumerating; CI-watch proposals auto-close when the watched workflow goes green again (reconciler checks).

## 4. Scoring — one format everywhere

```yaml
# sidecar frontmatter (specs/<id>.review.md, proposals/<id>.review.md, run result.json)
score: 7.5            # weighted 0-10
verdict: pass         # pass | warn | block
axes: {slice_size: 8, dod: 9, out_of_scope: 7, impact: 8, collisions: 5, testability: 8}
reviewer: spec-gate-agent
reviewed_commit: abc1234
```
Board renders the chip (green ≥7, amber 5–6.9, red <5) on every card in every column. History = git history of the sidecar. No numbers in the DB.

## 5. Slices

| # | Slice | Repos | Notes |
|---|---|---|---|
| 1 | **G0 spec-sweep reconciler** (+ link hygiene + CI-watch proposal auto-close) | minion-factory | Highest ROI — would have prevented all 21 ghosts |
| 2 | G2 score block in the pass-2 reviewer + sidecar schema + board chips | minion-factory, minion-base | Reviewer and sidecar already exist; this adds the rubric + rendering |
| 3 | G1 proposal scorer + button gating | minion-factory, minion-base | |
| 4 | G3 red-state check in `run.sh` | minion-factory | ~20 lines; loop already runs selfTest per attempt |
| 5 | G4 output formalized into sidecar format | minion-factory | |
| 6 | Upstream-monitor threshold + noise rules | minion | One workflow edit |
| 7 | Board: override-with-reason flow + amber `possibly_shipped` verify chip | minion-base | |

**Out of scope:** replacing human gates (all three stay); scoring historical/done specs; LLM-judge scoring of merged code (thermonuclear already covers post-PR); any DB schema for scores; a separate test-writing board column (decided against, §3-G3).

## 6. E2E verification

(1) Run the G0 sweep against the pre-triage board state of 2026-08-17 in dry-run: it must propose flipping ≥ 19 of the 21 hand-verified shipped specs and the missing `supersedes` link. (2) Submit a deliberately vague proposal → G1 blocks with named missing axes. (3) Approve a spec with an oversized slice → G2 warns, board requires override reason. (4) A factory feature run shows a red-state line in its log before implementation. (5) Merge a fleet PR that ships a spec → within a day its card leaves the board without human touch.
