# Specification Analysis Report: Hub assistant JEV turn router — follow-up defects

Cross-artifact analysis of `spec.md`, `plan.md`, `tasks.md` (+ `research.md`, `data-model.md`,
`contracts/assistant-route.md`, `quickstart.md`) for `specs/007-jev-router-followups/`.
Read-only — no files modified by this report. Verified two underspecified file paths directly
against the `minion_hub` checkout (`~/.cache/claude-tmp/hub-ro/`, `origin/master`, post #540)
rather than leaving them as guesses.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| U1 | Underspecification | LOW | tasks.md T019 | Hedges "or a new `global-tools.test.ts` if none exists yet" — verified no such file exists in `src/lib/assistant/` on `origin/master`. | State definitively: create `src/lib/assistant/global-tools.test.ts`. |
| U2 | Underspecification | LOW | tasks.md T022 | Hedges "e.g. `src/routes/api/assistant/route/server.test.ts`" — verified no test file exists for this route yet. | State definitively: create `src/routes/api/assistant/route/server.test.ts`. |
| U3 | Underspecification | MEDIUM | tasks.md T023; turn-router.ts:150; assistant-router.service.ts:28 | T023 needs to "import both `TIMEOUT_MS` constants" but both are verified module-private (`const`, not `export const`) in their respective files — the task as written cannot be implemented without a prerequisite export, which T021 does not include. | Add "export" to T021's edit of `assistant-router.service.ts`'s `TIMEOUT_MS` (and `turn-router.ts`'s, if not already exported — verified: also not exported), or rewrite T023 to assert the relationship behaviorally (e.g., a fake-timer test that the server call aborts before the client's) instead of by direct import. |
| E1 | Coverage gap | MEDIUM | spec.md FR-010; tasks.md (no task) | FR-010 ("the `assistant_route` PostHog event MUST continue to log... unchanged") has no dedicated task or test asserting the event's property set is unchanged — it is only implied by T020's description instructing the implementer not to touch it. | Add a task (or fold into T022) asserting `captureServerEvent`'s call shape/property keys are unchanged after T020's edit, e.g. a snapshot of the properties object in the route's test file. |
| E2 | Coverage gap | LOW | spec.md FR-011; tasks.md T024 | FR-011 lists five specific invariants (fail-open, ungated core, winning-mode-earns-manifest, text never logged, "only these N things change") but no task explicitly re-asserts each one by name — coverage is indirect, via T024 running the existing suite that already encodes them. | Acceptable as-is (SC-007 already covers this via "existing tests continue to pass unchanged in shape"), but note in T024's description which specific existing test files assert each of FR-011's five invariants, so a reviewer doesn't have to rediscover that mapping. |
| C1 | Constitution alignment | MEDIUM | plan.md Constitution Check (Principle V); tasks.md Phase 7 | plan.md recommends the US5 PR description name the Principle V "not security tagged" judgment call so a reviewer sees it, but no task in Phase 7 (T020–T023) operationalizes writing that PR-description flag — it exists only as prose in plan.md, which an implementer may not re-read. | Add a task note to T020 (or a new polish-phase task) requiring the US5 PR description to quote plan.md's Principle V flag verbatim. |
| F1 | Inconsistency (self-documented, not hidden) | LOW | tasks.md "Phase 2: Foundational" vs "Dependencies & Execution Order" | Phase 2 is declared to have no blocking tasks, but the Dependencies section then introduces a real cross-phase dependency (US1/US2's live-verification tasks on US3's Phase 5 harness) — a deviation from the task template's assumption that later-numbered phases don't block earlier ones. This is explicitly called out with rationale in both the phase header and the Dependencies section (not an unnoticed contradiction), but it is still a deviation from the strict "Foundational blocks everything, user stories are then independent" template shape. | No change required — the self-documentation is sufficient — but flagging so a reviewer who skims only the Dependencies table doesn't miss that Phase 2 being "empty" does not mean zero cross-story coupling exists. |

No CRITICAL findings. No duplication, no vague-adjective ambiguity, no unresolved
`[NEEDS CLARIFICATION]` markers (all three resolved in `/speckit-clarify`), no terminology
drift, and no conflicting requirements (e.g., no framework contradiction) detected.

## Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 (reword `brain`) | Yes | T003, T004 | |
| FR-002 (verify via probe set) | Yes | T005 | Depends on US3 (T015/T016) |
| FR-003 (carry prior mode) | Yes | T006–T009 | |
| FR-004 (first-turn unaffected) | Yes | T012 | |
| FR-005 (`hub.pages` weak-match flag) | Yes | T017–T019 | |
| FR-006 (rate limit, fail open) | Yes | T020, T022 | |
| FR-007 (server timeout < client timeout) | Yes | T021, T023 | T023 blocked by U3 as written |
| FR-008 (commit probe set as opt-in test) | Yes | T014–T016 | |
| FR-009 (per-manifest report) | Yes | T015 | |
| FR-010 (PostHog event unchanged) | **Partial** | T020 (implicit only) | See E1 |
| FR-011 (shipped invariants unchanged) | **Partial** | T024 (indirect, via existing suite) | See E2 |
| SC-001 (brain separation improves) | Yes | T005 | |
| SC-002 (follow-ups no longer core-only) | Yes | T013 | |
| SC-003 (`hub.pages` moduleMissing) | Yes | T019 | |
| SC-004 (rate limit fails open) | Yes | T022 | |
| SC-005 (server timeout < client) | Yes | T023 | See U3 |
| SC-006 (probe-set test runs on demand, readable) | Yes | T015, T016 | |
| SC-007 (existing suite passes unchanged) | Yes | T024 | |

## Constitution Alignment Issues

- See C1 above (MEDIUM, not CRITICAL — plan.md already names the Principle V judgment call;
  the gap is only that tasks.md doesn't carry it forward into an actionable PR-description
  requirement).
- No MUST-principle violation found. Principle III's cross-repo note (spec lives in
  `minion-meta`, code in `minion_hub`) is documented in plan.md's Project Structure, not
  silently assumed.

## Unmapped Tasks

None. Every task (T001–T026) maps to a Setup/Foundational/Polish role or an explicit `[US#]`
story label tracing to a spec.md requirement.

## Metrics

- Total Functional Requirements: 11 (FR-001–FR-011)
- Total Success Criteria (buildable): 7 (SC-001–SC-007)
- Total Tasks: 26 (T001–T026)
- Requirement coverage: 11/11 have ≥1 task; 9/11 fully covered, 2/11 partial (FR-010, FR-011 —
  see E1, E2)
- Success Criteria coverage: 7/7
- Ambiguity count: 0 (all three spec-phase `[NEEDS CLARIFICATION]` markers resolved pre-plan)
- Duplication count: 0
- Underspecification count: 3 (U1, U2, U3 — U3 is the only one that blocks a task as literally
  written)
- Constitution alignment issues: 1 (C1, MEDIUM)
- Critical issues count: **0**

## Next Actions

No CRITICAL issues — this feature is not blocked from `/speckit-implement` on constitution or
coverage grounds. Recommended before implementation starts, in order of value:

1. Fix U3 (MEDIUM) — either export both `TIMEOUT_MS` constants in T021, or rewrite T023 to test
   the relationship behaviorally. This one actually blocks T023 as written; the others don't
   block execution.
2. Fold E1 into T022 (assert the PostHog event's property keys are unchanged) — cheap, closes a
   named FR with zero current test coverage.
3. Add C1's PR-description requirement to T020 or a new polish task, so plan.md's Principle V
   flag survives into the actual PR review rather than living only in a planning document.
4. U1/U2 (LOW) — cosmetic, can be fixed inline by whoever picks up T019/T022.

Suggested command: none required to unblock — these are tasks.md wording/coverage fixes, not a
spec or plan defect, so manual edits to `tasks.md` (not `/speckit-specify` or `/speckit-plan`
re-runs) are the right-sized fix.

## Remediation Offer

Per this command's operating constraint, no edits were applied. If the owner wants them,
concrete remediation edits for U3, E1, and C1 (the three MEDIUM findings) can be drafted as a
follow-up — none require re-running `/speckit-plan` or `/speckit-tasks` from scratch.
