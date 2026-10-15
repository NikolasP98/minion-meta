## Specification Analysis Report

**Feature**: Sellable card view — aligned, populated, configurable (`specs/102-retro-sellable-card-view/`)
**Artifacts loaded**: spec.md, plan.md, research.md, data-model.md, tasks.md, `.specify/memory/constitution.md`

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|---|---|---|---|---|---|
| A1 | Coverage Gap | HIGH | spec.md FR-003 / plan.md AS-IS | No evidence anchor exists for the AS-IS bundle-stock-mismatch claim — the spec asserts a defect pattern ("some combinations... show blank on one screen while showing a number on another") from the owner's framing only, with no file:line or screenshot taken before planning. Constitution Principle II treats this as not-ready-for-plan. | Take the anchor (plan.md T002) before implementation starts, not after. This is the single gap that, if closed, converts "the bug might exist" into "the bug is confirmed and located" — see retro-scorecard.md §3. |
| A2 | Underspecification | MEDIUM | spec.md Clarify Q3 / Edge Cases | Whether a surface renders an empty field as "—" or skips the row is explicitly left as [NEEDS CLARIFICATION] and not resolved by plan.md either (plan defers it to tasks.md T007/T022 as a per-surface implementation choice). | Acceptable to carry forward as a logged decision point (done, T022) rather than guessing — but tasks.md must not let T007 silently decide it without the PR body stating which surface got which behavior and why, as T022 requires. |
| A3 | Ambiguity | MEDIUM | spec.md FR-002 ("same vertical position") | "Same vertical position" is defined only at the band level, not across bands (a gallery/board can have multiple row-bands by group-by axis). The spec does not say whether rows must align across bands too. | Low risk — the owner's complaint and the CSS mechanism (subgrid) both operate per-band already, so this is very unlikely to bite, but worth one line in a future spec revision. |
| A4 | Constitution Alignment | HIGH | plan.md Constitution Check row II | Flagged PARTIAL rather than silently passed — correctly surfaces that this plan's AS-IS evidence is weaker than Principle II requires, and ties it to an open-items ledger entry instead of waiving it. This is the artifact working as intended, not a defect; listed here for traceability. | None — already handled correctly (compare to the real #537 PR body, which has zero AS-IS anchor and no acknowledgment of the gap). |
| A5 | Coverage Gap | MEDIUM | tasks.md T016 | The "cross-surface parity" verification task admits it may have "no such harness" and allows falling back to a manual QA script documented in the PR body, i.e. the test proving FR-003/SC-002 may not be automated. | If no automated route-level test exists for this pair of pages, this is a real residual risk — flag in the PR's "Not yet" section, matching the ledger rule, rather than letting SC-002 go unverified silently. |
| A6 | Duplication Detection | LOW | tasks.md US1 vs US2 dependency note | T009–T016 both modify the same two route files; the tasks doc already calls this out as "not safely parallel" — not a defect, a correctly-caught sequencing risk. | None — no action needed. |
| A7 | Inconsistency | LOW | spec.md SC-004 | SC-004 ("staff report they no longer need to open the catalog table") is a qualitative, unmeasured outcome with no defined collection method (survey? support-ticket count?). Borderline violates the "measurable" success-criteria guideline. | Either drop SC-004 or convert to a proxy metric (e.g., "catalog-table opens from the till drop by N%") — not blocking for this slice given the other three SC items are concrete. |

## Coverage Summary

- Functional requirements: 10 (FR-001..FR-010) — all traced to at least one task in tasks.md.
- Success criteria: 4 (SC-001..SC-004) — SC-004 is a business KPI, excluded from task-traceability scope per the analyze skill's own exclusion rule for outcome metrics.
- [NEEDS CLARIFICATION] markers remaining: 1 (Q3, intentionally kept open).
- Findings by severity: HIGH 2 (A1, A4 — A4 is a pass, not a real defect), MEDIUM 3 (A2, A3, A5), LOW 2 (A6, A7).

## Next Actions

1. Before implementation: close A1 (take the AS-IS anchor) — this is the one finding with
   teeth; everything else is low-risk or already correctly handled by the artifacts.
2. Decide A2's two-surface asymmetry deliberately (even if the decision is "yes, asymmetric,
   because the board is denser") and write it into the PR body per T022.
3. If no automated parity test exists for A5, say so in the PR rather than imply SC-002 is
   machine-verified.

## Remediation

Not auto-applied — `/speckit-analyze` is read-only. The three next actions above are
recommendations for whoever executes tasks.md.

## Retrospective note (this analysis is written AFTER the real PRs merged)

The real #537 PR body has zero AS-IS anchor, zero acknowledgment of the bundle-stock
risk (A1), and ships US1+US2+US3 in one PR with no mention of the Button-centering risk this
analysis's T010 call-out exists to catch. #538, filed about 25 minutes after #537 merged,
fixes exactly: (a) the Button-centering leak T010 names explicitly, and (b) the till/catalog
stock mismatch that A1 and T014 both call out as the single highest-value thing to verify
before merging Slice A. See retro-scorecard.md §3 for the direct causal claim.
