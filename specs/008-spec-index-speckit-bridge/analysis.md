# Specification Analysis Report: Spec Index / Spec Kit Directory Bridge

Cross-artifact consistency/quality check of `spec.md`, `plan.md`, `tasks.md` (+
`research.md`, `data-model.md`) per `.claude/skills/speckit-analyze/SKILL.md`'s six
detection passes. No artifact was modified to produce this report (read-only analysis, per
that skill's "Analysis-only" default — no remediation applied automatically).

## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|---|---|---|---|---|---|
| A1 | Ambiguity / Underspecification | **HIGH** | `data-model.md` "Heading-lint contract" table; `spec.md` FR-008; `tasks.md` T008 | The new `REQUIRED_SPEC_KIT_HEADINGS` patterns are described only as "a `## Requirements` ... heading," with no regex given. Spec Kit's own `spec-template.md` (and this feature's own `spec.md`) actually emits `## Requirements *(mandatory)*` — trailing annotation text, not a bare heading. If T008 mirrors the existing flat-file style's full-line-anchored regex (e.g. `^##[ \t]+0\.[ \t]+Product[ \t]*$`), the new check would reject every real Spec-Kit-produced heading, including this feature's **own** `spec.md`, which is a self-referential failure (this artifact would fail the gate it is simultaneously specifying). | Anchor the three new patterns the way the existing **verification**/**out-of-scope** patterns already do — substring match within the heading line (`^#{2,4}[ \t]+.*\bRequirements\b` style, not a full-line `$`-anchored match) — and add an explicit test fixture asserting a heading *with* trailing `*(mandatory)*`-style text still passes. Resolve before `/speckit-implement`. |
| A2 | Constitution Alignment | MEDIUM | `plan.md` Constitution Check, Principle III row | The registered PR base for `minion-meta` itself could not be confirmed (`node scripts/repo-policy.mjs show minion-meta` fails in this read-only worktree with `ERR_MODULE_NOT_FOUND: ajv` — the symlinked `node_modules` doesn't resolve every transitive dependency `repo-policy.mjs` needs). Principle III requires targeting "the repository's registered PR base," and this plan currently substitutes an inference from `ci.yml` + `git status` instead of the canonical source. Not a constitution *violation* (no MUST was broken — the plan names the gap and tags it ASSUMPTION rather than asserting it as fact), but it is a real open fact-finding gap that blocks confident Phase 3 execution. | Before Slice 1 is opened as a PR, run `node scripts/repo-policy.mjs show minion-meta` in an environment with full `node_modules` (not this worktree's partial symlink) and confirm the PR base; update plan.md's Constitution Check row from ASSUMPTION to confirmed fact. Not a blocker for continuing to `/speckit-tasks` (already done) but should resolve before implementation opens a PR. |
| A3 | Coverage Gap | LOW | `tasks.md` T011 | T011 is conditionally scoped ("confirm during implementation whether this is needed at all") rather than a fixed, testable task — acceptable for a genuinely small investigative step, but it is the one task in the list without a crisp "done when" condition tied to a test or grep. | Either resolve the question now (read `.claude/skills/speckit-specify/SKILL.md`'s exact wording once more — already partially done during this feature's own research — and decide definitively) or keep it as a timeboxed spike with an explicit "done when: outcome recorded in this task's checkbox comment" condition. Non-blocking. |
| A4 | Underspecification (pre-existing, informational) | LOW | `specs/topics.json`'s `infra` topic (`requiredEvidence: ["self-test"]`); `scripts/topics.mjs` | `requiredEvidence`/`requiredStages` on a topic are schema-*validated* (their own values must be from an allowed list — see `scripts/topics.test.mjs`) but are not currently *enforced* against any spec that carries the `infra` tag — nothing in `scripts/spec-index.mjs` checks that an `infra`-tagged spec's frontmatter or test suite actually references a self-test. This spec's claim of satisfying that requirement (via FR-012's fixtures) is good practice but not CI-verifiable today, and this feature does not propose fixing that pre-existing gap (it is out of this feature's scope — the gap predates this feature and affects every `infra`-tagged spec in the corpus, not just this one). | No action required for this feature. Flagging only so the gap isn't mistaken for something this analysis missed. A follow-up proposal (not filed by this run, per the audit brief's documents-only scope) could make `requiredEvidence` machine-enforced in a future `spec-index.mjs` change. |
| A5 | Inconsistency check — none found | — | — | Cross-checked: every FR in `spec.md` maps to exactly one DELTA row in `plan.md` (explicit table, manually verified during plan authoring) and at least one task in `tasks.md`; every DELTA row has a task; no orphaned requirement or orphaned task found. Terminology ("Spec Kit," `id`, `path`, `directory spec`) is used consistently across all five artifacts. | No action. |
| A6 | Duplication check — none found | — | — | The FR-008/D5/T008 repetition across `spec.md`/`plan.md`/`tasks.md` is traceability (spec states the requirement, plan designs the mechanism, tasks implement it), not duplicated/conflicting requirements — each layer adds information the previous one didn't have. | No action. |

## Severity Summary

- **CRITICAL**: 0
- **HIGH**: 1 (A1)
- **MEDIUM**: 1 (A2)
- **LOW**: 2 (A3, A4 — A4 is informational/pre-existing, not actionable within this feature)

## Constitution Check cross-reference

No CRITICAL finding traces to a constitution MUST violation. A2 touches Principle III
("Slice-scoped delivery... the repository's registered PR base") but the plan already
surfaces it as an open, tagged assumption rather than silently proceeding — per this skill's
"Constitution conflicts are automatically CRITICAL" rule, a *violation* would be CRITICAL;
an *honestly-flagged gap in confirming a fact the principle requires* is downgraded to
MEDIUM here because `plan.md` already does the right procedural thing (names it, tags it,
does not proceed as if it were settled). If `/speckit-implement` were run without resolving
A2 first, that would upgrade to a real Principle III violation.

## Next Actions

- **A1 (HIGH)** should be resolved — by updating `data-model.md`'s pattern description (and,
  when implemented, the actual regex) — before `/speckit-implement`. This is squarely a
  design-level fix, not a research dead-end: the existing file already has a working pattern
  style to copy (the verification/out-of-scope regexes), so the fix is cheap once named.
- **A2 (MEDIUM)** should be resolved before a Slice 1 PR is opened, not before continuing the
  SDD pipeline — it does not block `/speckit-tasks` (already run) or this analysis.
- A3/A4 are non-blocking; no remediation offered automatically (analysis-only report, per
  the skill's default behavior absent an explicit "apply fixes" instruction, which this run
  did not receive — the common audit brief scopes this whole exercise to documents, not
  code).
