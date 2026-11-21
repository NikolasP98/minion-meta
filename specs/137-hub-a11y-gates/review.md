# Spec 137 review — two passes, 2026-11-20

Reviewer: the implementing agent (Kip's worker), against hub master `3677e35a`. Every finding
was checked in code or by running the tool; the fix is in `spec.md` on this branch.

## Pass 1 — is the AS-IS true?

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | The spec builds FR-002 on "the sweep's existing decrease-only ledger". That ledger was never committed, so the sweep's compare gates nothing today. | `git ls-files tests/ui-audit` (no `conformance-ledger.json`); master run 44699381361 log: `blocked: no ledger yet`, exit 0 | AS-IS row added. FR-002 now asks for a committed ledger built from the sweep's run artifacts. Committing the sweep's own six-rule ledger is out of scope and recorded as an open end. |
| 2 | "owner-admin × compact-390 coarse / wide-1440 fine" is the local matrix. CI sweeps one entry. | `scripts/ui-audit-sweep.ts:81` | AS-IS, FR-001 and the assumption corrected; ungated-viewport edge case added. |
| 3 | 80 is the number of comments, not of suppressed warnings: 4 comments name two rules. | token count on `3677e35a` = 84 (54 `no_static_element_interactions`) | AS-IS and FR-009 count rule tokens. |
| 4 | FR-009 said the design lint keeps a per-file baseline. It keeps a global ceiling and compares changed files with the PR base. | `scripts/design-lint.mjs:320-349,380` | FR-009 and the entity reworded to that mechanism. |
| 5 | Story tests were assumed to be repeatable. A cold dependency cache voids a run (7 files fail to import, 10 interaction tests fail); two stories flip between warm runs. | three local runs, see AS-IS | AS-IS rows, two edge cases, an "unstable row" entity. |
| 6 | "No new dependency (verified in `/speckit-plan`)" was an unverified claim. | `bun.lock`: `axe-core@4.14.0` is already resolved through addon-a11y | Assumption restated as verified. |
| 7 | The two orphaned specs were not known to pass. | both run locally in Chromium: 7 and 6 tests pass | AS-IS says so; FR-008 names Chromium; Firefox/WebKit out of scope. |
| 7b | Found during implementation: the sweep's strict gate fails 135 of 149 pages in CI (master too), so a check placed after it measures one page. | run artifacts of master run 44699381361 and of the slice PR's first run | AS-IS row and edge case added; the axe pass runs before the strict gate. |

## Pass 2 — is it complete, consistent and testable?

| # | Finding | Fix |
|---|---|---|
| 8 | Constitution II requires AS-IS, TO-BE and DELTA; the spec had only AS-IS. | TO-BE (five gates, invariants) and DELTA (D1–D6 with proofs) added. |
| 9 | The owner's handoff asks for one command with machine-readable output and documentation where agents look; the spec had neither. | User Story 6, FR-012–FR-014, SC-006, SC-007. |
| 10 | "Count" was undefined (rules or elements?). | Edge case: a count is the number of elements breaking a rule. |
| 11 | "Story that cannot render fails as an error" contradicts "first run green" (FR-011) if any story fails at baseline. | Unmeasured rows: recorded, and a measured row may not become unmeasured. |
| 12 | The waiver edge case required reusing the sweep's allow-list, whose rule type is closed over the six conformance rules. | No waiver ships in S0; debt is carried by the baseline. |
| 13 | SC-004's "+6 minutes" could not be measured as written (the new job runs in parallel). | SC-004 compares the new job with the longest existing job and keeps the 15-minute step budget. |
| 14 | SC-001 and SC-002 said four gates; there are five. | Corrected. |

No finding changes the scope the owner approved (gates only, no visible UI change).
