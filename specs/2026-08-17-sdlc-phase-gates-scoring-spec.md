---
id: 2026-08-17-sdlc-phase-gates-scoring-spec
title: SDLC phase gates & preemptive scoring — anti-slop checks at every boundary + backward reconciliation
stage: spec
status: approved
pass: 1
created: 2026-08-17
updated: 2026-08-20
repos: [minion-meta, minion-factory, minion-base]
verdict: approved
tags: [ui, logic, infra, docs, test]
slice_tags: [1:logic, 2:ui+logic, 3:ui+logic, 4:logic, 5:logic, 6:infra, 7:ui+logic, 8:logic+infra+docs+test, 9:logic, 10:logic]
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

## 4b. Work-type tags & routing (the classification layer the gates run on)

User intent (verbatim, 2026-08-17): "changes to the UI should be compared against the ui governance, but logic/bugs shouldnt. This should be caught and routed … What happens if a detected merge only addresses documentation? … If a ui+logic slice was addressed, would we route to 2 agents or a single agent with access to more tools/skills? … loop engineering dependent on what was triaged at the start. Where does triage take place?"

### Taxonomy — small, composable, enum-validated

`tags: [ui, logic, data, infra, docs, test, security, perf, deps]` — multi-select frontmatter on proposals and **per-slice** on specs (the slice is the routable unit, not the spec); on PRs they are **GitHub labels**. The validator (maintenance-lane slice 1) enforces the enum.

### Derivation — deterministic first, model second

1. **Path rules are the authority** for anything with a diff: a committed `routing.yml` per repo maps globs → tags (`**/*.svelte`, `app.css`, `tokens` → ui · `src/server/**`, `src/lib/**/*.ts` → logic · `supabase/migrations/**` → data · `.github/**`, `deploy/**` → infra · `**/*.md`, `docs/**` → docs · `**/*.test.ts` → test · `package.json` deps → deps). GitHub's native **labeler action already exists in the gateway repo** (just resurrected in PR #214) — this is its config, not new machinery.
2. **Classifier fallback** only where there is no diff yet (proposal intake) or paths are ambiguous; its output is a tag *proposal* the G1/G2 gate confirms.
3. **Declared vs derived mismatch is itself a finding**: a spec slice tagged `docs` whose PR diff touches `src/` blocks at G4 with "tag mismatch" — this is the cheap catch for scope creep and for agents mislabeling to get the lighter lane.

### Routing consequences — tags compose the loop, they don't pick between agents

**One agent per slice, capabilities injected by tag — never two agents on one slice.** Splitting a coherent ui+logic slice across agents recreates the context-loss handoff (same reasoning that kept test-writing out of a separate phase). Instead:
- **Split at planning time, not execution time**: G2 scores slices higher when they fall on tag boundaries; the planner is instructed to prefer a `ui` slice + a `logic` slice where the seam is natural, and a single multi-tag slice where it isn't.
- **Review fans out, dev doesn't**: G4 review is read-only and parallelizes safely — a multi-tag slice gets one reviewer *per facet* (ui-governance lens, logic lens, security lens), diverse lenses catching what one generalist misses.

Per-tag loop composition (selfTest fragments + injected skills + rubric axes):

| Tag | Dev loop gains | Gate additions |
|---|---|---|
| `ui` | ui-design-governance skill; `lint:design && lint:tokens` in selfTest | G4 empirical check (screenshot/curl preview); governance rubric axis; debt ratchet may only decrease |
| `logic` | red-state TDD (G3) mandatory | integrity-lint axis; no governance checks (the user's exact point — don't waste the loop on them) |
| `data` | migration + consuming code in same PR rule | schema-drift check (the `pos_tickets.surcharges` failure class); reversibility note required |
| `docs` | **light lane**: skip red-state and build gates | **verify, don't ignore**: a docs-verifier agent checks changed claims against the code they describe (file paths exist, commands run, flag names real) + link check. Cheap, catches the worst docs failure — confidently wrong instructions |
| `infra` | workflow lint (actionlint) in selfTest | the `secrets`-in-`if` class; runner-label sanity |
| `security` | fail-closed rubric | score can *warn* but never auto-pass — human gate mandatory regardless of score |
| `test` | — | mutation spot-check: invert the subject logic, the new test must fail |
| `perf` | — | before/after measurement required in PR body |
| `deps` | lockfile-consistency gate (exists in gw `test/ci/`) | changelog/breaking-change scan |

### Where triage happens — at every artifact birth, re-checked at every boundary

| Trigger | What runs |
|---|---|
| Proposal created (chat, monitor S-C, handoff sweep S-A, CI-watch S-D) | classifier proposes tags → G1 confirms |
| Spec pass-1 written | planner assigns per-slice tags → G2 validates tags against slice bodies |
| PR opened / synchronized | path rules derive labels (authoritative); mismatch vs declared → G4 finding |
| Merge to integration branch | merge-scan (S-B) uses derived tags to pick its rubrics |
| G0 sweep | retro-tags legacy/untagged items so the whole board becomes routable |

Triage is therefore not a phase — it's a **property computed at birth and re-derived from evidence at each gate**, which is what keeps it from drifting the way statuses did.

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
| 8 | Tag taxonomy: frontmatter enum + `routing.yml` path rules per repo + labeler configs | minion-meta, fleet | §4b |
| 9 | Tag-composed loops: selfTest fragments + skill injection + per-facet G4 reviewers | minion-factory | §4b |
| 10 | Docs-verifier light lane | minion-factory | §4b — verify, don't ignore |

**Out of scope:** replacing human gates (all three stay); scoring historical/done specs; LLM-judge scoring of merged code (thermonuclear already covers post-PR); any DB schema for scores; a separate test-writing board column (decided against, §3-G3).

## 6. E2E verification

(1) Run the G0 sweep against the pre-triage board state of 2026-08-17 in dry-run: it must propose flipping ≥ 19 of the 21 hand-verified shipped specs and the missing `supersedes` link. (2) Submit a deliberately vague proposal → G1 blocks with named missing axes. (3) Approve a spec with an oversized slice → G2 warns, board requires override reason. (4) A factory feature run shows a red-state line in its log before implementation. (5) Merge a fleet PR that ships a spec → within a day its card leaves the board without human touch.
