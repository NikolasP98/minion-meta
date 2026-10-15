# SDD friction notes — r2 / specs/102-retro-sellable-card-view

## 1. Phase times (wall-clock, this agent, retrospective artifact authoring)

| Phase | Duration |
|---|---|
| specify + clarify (combined — no real user to pause for between them) | ~1m18s |
| plan (plan.md + research.md + data-model.md; no contracts/ — no API surface) | ~2m23s |
| tasks | ~1m00s |
| analyze | ~0m57s |
| **Total** | **~5m38s** |

Not counted above: ~6 minutes of evidence-gathering before specify started (worktree setup,
`gh pr view/diff` on #537/#538, reading the shipped diffs) — this is research the real
author would already have had in their head (they wrote the PRs), so it is not fairly
counted as SDD overhead, but it is real time this retro spent.

## 2. Counts

- Functional requirements: 10 (FR-001..FR-010)
- Success criteria: 4 (SC-001..SC-004)
- `[NEEDS CLARIFICATION]` markers left: 1 (Q3 — empty-field placeholder vs. skip, genuinely undecidable from the owner's ask alone)
- Clarify Q/As recorded: 5 (Q1–Q5; 4 resolved as ASSUMPTION, 1 kept as NEEDS CLARIFICATION)
- Tasks: 23 (T001–T023) across Setup, Foundational, 3 user stories, Polish
- Analysis findings: 7 total — 2 HIGH (one of which, A4, is a pass not a defect), 3 MEDIUM, 2 LOW

## 3. Tooling friction

- No script errors — this retro never ran `.specify/scripts/bash/*.sh`; the skills were
  followed by hand-authoring the artifacts they describe, since there is no real interactive
  user to drive the hook-based branch creation (`before_specify` hook) or feature-numbering
  script. `.specify/feature.json` was not written because `SPECIFY_FEATURE_DIRECTORY` was
  given explicitly in the task, which the skill treats as the top of its resolution order —
  no numbering logic ran, so nothing to report there.
- `.claude/skills/speckit-plan/SKILL.md`'s template has no AS-IS/TO-BE/DELTA section at all
  — the Minion constitution's Principle II requires exactly that triad with evidence, and
  the template's "Technical Context" + "Constitution Check" blocks don't have a slot for it.
  Resolved by inserting a standalone `## AS-IS → TO-BE → DELTA` section into plan.md ahead
  of Technical Context, per `AGENTS.md`'s stated precedence over the Spec Kit template.
- The plan template's `contracts/` output is explicitly "where the template calls for them"
  per the brief — this feature has no API/contract surface (UI-only, no new route or
  endpoint), so `contracts/` was skipped entirely rather than populated with an empty
  placeholder. Judgment call, not a script failure.
- `specs/` layout: Spec Kit wants `specs/<NNN>-<slug>/{spec,plan,tasks}.md`, which is what
  was produced. The constitution's own "Artifact layout and registration" section says the
  meta-repo board only reads top-level `specs/*.md` and a Spec Kit feature needing board
  visibility also needs a top-level stub file. This retro did NOT create that stub —
  nothing here is meant to appear on the live planning board (this is a closed retrospective
  on already-shipped work, not an open proposal), so the stub step was deliberately skipped
  and is named here rather than silently omitted.
- `update-agent-context` (mentioned in the common brief as a known friction point) was never
  invoked — none of the five skills read for this feature call it, and no CLAUDE.md/AGENTS.md
  edit was made or implied.

## 4. Fit with the Minion SDLC

- **Overlap**: Spec Kit's "Independent Test" per user story and Minion's "DELTA... with the
  test that proves each" are the same idea from two directions — Spec Kit frames it as
  story-level QA, Minion frames it as requirement-level proof. Mapping Spec Kit's three
  stories 1:1 onto this feature's two real PRs (#537 = US1+US2+US3 combined, #538 = a US1/US2
  regression fix) was natural; no structural conflict.
- **Conflict**: Minion Principle II ("A spec with unverified claims is not ready for
  `/speckit-plan`") is stricter than anything Spec Kit's own templates check — nothing in
  `speckit-specify` or `speckit-clarify`'s validation checklist asks for an AS-IS evidence
  anchor; the checklist only asks that requirements be "testable," which this spec's
  FR-003 is, without ever being *anchored*. This gap is exactly what analysis.md's A1
  finding calls out, and it is the same gap that let the real #537 ship with an unverified
  (and, it turned out, wrong) assumption about bundle stock.
- **Conflict**: Minion's slice-scoped-delivery (Principle III) assumes a plan can cleanly
  decompose into independently-shippable PRs; this feature's own `tasks.md` had to admit
  US1 and US2 are "not safely parallel" and share two files, so "slice" here means
  "ship US1+US2 together, US3 separately" rather than the clean one-story-per-PR picture
  Spec Kit's own "Implementation Strategy" section implies. The template doesn't force this
  admission — it had to be written in by hand (tasks.md's Dependencies section).
- **Hole**: no section in any Spec Kit template captures "required build steps" the way
  Minion Principle IV does (design-token lint, RBAC wiring, i18n compile, route-contract
  manifest). This had to be folded into plan.md's Constitution Check row IV and tasks.md's
  Polish phase by hand; a generic Spec Kit user with no Minion-specific constitution would
  have no prompt to do this at all.

## 5. Would SDD have changed the outcome?

Writing FR-003 ("the till gallery and catalog board MUST present... the same values and the
same derivation rules... including bundles") forced an explicit statement of something the
owner's one-sentence ask ("make sure the properties populate correctly") left completely
implicit — which items, which derivation, same-across-which-surfaces. The owner's ask alone
is consistent with a dozen different "properties populate correctly" bugs; the spec forces
a pick, and research.md's resulting design decision ("reuse the one aggregation function
from both load paths") is literally the fix #538 had to ship a cycle later. That is the
real catch, and it is not subtle — it comes directly from writing "same values... including
bundles" instead of leaving it as "populate correctly." What the spec could not catch on its
own: whether the acceptance scenario actually gets *run* before merge. Spec Kit documents
the check; it has no CI hook that fails a PR for skipping a named acceptance scenario, so
the alignment defect (Button centering) is named and testable in this retro's tasks.md but
would only have been caught if someone actually rendered the mixed-name-length case — which
is a process discipline question, not something the artifact format can force by itself.

## 6. Template/constitution changes recommended

- Add an explicit "AS-IS evidence anchor" checklist item to `speckit-specify`'s validation
  pass when the Minion constitution is present — today nothing in the template's own
  checklist would have flagged A1.
- Add a "cross-surface parity" requirement pattern/example to the spec template's Success
  Criteria guidance — "same value on every surface that shows X" is a recurring Minion shape
  (this feature, and likely others wherever one entity renders through two components) that
  the generic template examples don't model.
- Give `plan.md`'s template a native AS-IS/TO-BE/DELTA slot (even just three headers under
  Summary) rather than requiring every Minion-constitution plan to hand-roll it — this retro
  had to invent the section from scratch each time.
- Tie at least P1 acceptance scenarios to a literal pre-merge checklist item in
  `speckit-tasks`'s Polish phase template ("re-run each P1 Acceptance Scenario by hand and
  check it off") — right now a written scenario is advisory, not gated.
