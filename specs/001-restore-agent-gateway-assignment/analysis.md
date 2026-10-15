# Specification Analysis Report — Restore Agent Gateway Assignment

**Run**: `/speckit-analyze`, 2026-10-15. Read-only; nothing was modified.
**Artifacts**: `spec.md`, `plan.md`, `tasks.md` (+ `research.md`, `data-model.md`, `contracts/assignment-tool.md`, `quickstart.md`, `checklists/requirements.md`).
**Authority**: `.specify/memory/constitution.md` v1.0.0 is non-negotiable in this scope.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| **F1** | Inconsistency | **HIGH** | spec.md FR-002 vs FR-002b vs INV-5; tasks.md T003 | **An organization with a development gateway only has no consistent outcome.** FR-002 forbids choosing a development gateway as a substitute => unassigned. FR-002b's platform-default fallback does not apply (the organization *has* a gateway). But the resolution chain this feature reuses **prefers** the production channel without **filtering** it (`channelFirst(preferred)` is an ORDER BY clause, not a WHERE clause — `gateway.pg.service.ts:95`), so the creation call would land on the development gateway while the row is left unassigned. That breaks INV-5 and produces exactly the invisible 403 this feature exists to remove. | Decide explicitly and write it into FR-002: treat development-only as **"no eligible gateway"** => FR-005a path (agent exists, not marked ready, reason recorded). T003's helper must then **filter** to the production channel, not merely order by it — a deliberate divergence from the two existing picks that needs the one-line comment saying so. Add a case to T005 and T007. |
| **F2** | Inconsistency | MEDIUM | plan.md Constitution Check ("task T016 creates the board stub") vs tasks.md T016 / T031 | Task-id drift between artifacts: plan.md says the board stub is T016; in tasks.md T016 is the S0a gate run and the stub is **T031**. A reader following plan.md lands on the wrong task. | Change the plan's reference to T031, or drop the id and name the task. Ids in prose across artifacts are a standing drift hazard. |
| **F3** | Ambiguity / Terminology | MEDIUM | spec.md FR-002/FR-002b/INV-1/INV-3; data-model.md; tasks.md T003/T019 | **Four terms, three concepts, no glossary**: "production channel gateway", "eligible gateway", "platform default gateway", "system gateway". "Eligible" carries the whole weight of INV-1 and T019's update predicate and is never defined in one place; "platform default" (spec) and "system gateway" (research R2, which is the code's own `getSystemGatewayCredentials`) are the same thing under two names. | Define "eligible gateway" once in data-model.md (belongs to the organization, production channel, has a token) and use it everywhere; pick one of platform-default/system and note the other as the code's name. |
| **F4** | Underspecification | MEDIUM | spec.md FR-004; tasks.md T011 | "Refuse with a **named** error" never names the error. Two implementers will invent two names, and T007's test asserts against whichever exists. | Name it in FR-004 (the hub's convention is a thrown `Error` with a stable message prefix, as `provisionPersonalAgent` already does for a missing profile). One word in the spec saves rewriting the test. |
| **F5** | Coverage gap | MEDIUM | spec.md SC-002; tasks.md (none) | SC-002 is measured "of the hub tool calls made in the **first week** after applying". No task owns that measurement and Phase 5 ends at T030 on apply day. The criterion is checkable (the audit's transcript scan + PostHog `assistant_route` produced the before-figure) but nobody is asked to look. | Add an owner task: one week after T028, re-run the audit's two queries and record the refusal count. Or downgrade SC-002 to the single-turn proof T029 already gives, and stop claiming the week. |
| **F6** | Coverage gap | MEDIUM | spec.md SC-003; tasks.md T006/T007 | SC-003 ("a brand-new user's first turn can use hub tools, with no manual step") is covered only by unit tests against a mocked database — and F1 is precisely the case where those pass while the real path fails. | Add to Phase 5: the owner creates or invites one test member and confirms their first assistant turn reaches hub data. One real user beats six mocked ones here. |
| **F7** | Constitution alignment | LOW *(not a violation)* | constitution Principle IV; plan.md Constitution Check | Principle IV's RBAC-wiring clause is marked "not applicable" because no surface is added. Correct, but stated as absence rather than as a checked claim — a future reader cannot tell whether the RBAC question was asked or skipped. | Keep the PASS; add the six words that make it auditable: "no `actions/*`, no `/api/**` route, no nav entry — nothing `rbac.service` would gate." |
| **F8** | Duplication | LOW | spec.md FR-008/FR-012/FR-013 vs data-model.md INV-1/INV-2 vs contracts G2/G3/G4 | The same three guarantees (NULL->value only, never touch an assigned row, never cross an organization) are stated in three artifacts in three wordings. Intentional restatement for three audiences, but three places to update and two will be missed. | Keep the FRs normative; have data-model.md and the contract **reference** them (`see FR-012`) rather than restate. |
| **F9** | Inconsistency | LOW *(documented)* | spec.md priorities vs tasks.md Phase 3/4 order | US1 is P1 but ships second. | Already flagged in tasks.md's header with its reason (the production write must happen once, after the leak is closed). No action; recorded so the next reader does not "fix" the order. |
| **F10** | Ambiguity | LOW | spec.md SC-006 | "fails the test suite" is the only technology-flavoured success criterion, and "the test suite" is unqualified — the full hub suite is explicitly forbidden here (plan, Risks 2). | Say "the scoped suite the slice's gate runs". |

Overflow: none. 10 findings, well under the 50 limit.

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | yes | T011, T012 | |
| FR-002 | weak | T003, T004, T005 | **F1** — the development-only case is underdetermined |
| FR-002a | yes | T006, T010, T012 | the INV-5 pair |
| FR-002b | yes | T007, T012 | |
| FR-003 | yes | T003, T004, T005 | |
| FR-004 | weak | T007, T011 | **F4** — the error is not named |
| FR-005 | yes | T008, T012 | |
| FR-005a | yes | T008, T012 | |
| FR-005b | yes | T008, T015 | |
| FR-006 | yes | T007, T012 | |
| FR-006a | yes | T014 | |
| FR-007 | yes | T019 | |
| FR-008 | yes | T018, T019 | |
| FR-009 | yes | T020 | |
| FR-010 | yes | T020 | |
| FR-011 | yes | T018, T020 | invariant-not-count explicitly tested |
| FR-012 | yes | T019 | |
| FR-013 | yes | T018, T019 | |
| FR-013a | yes | T020 | |
| FR-014 | yes *(test-only, by design)* | T009 | the only requirement with **no implementation task**, deliberately: it requires that a file is *not* edited. tasks.md Notes says so. Kept visible because "no task" normally means "forgotten". |
| FR-015 | yes | T009 | |
| FR-016 | yes *(owner)* | T025 | the open `[NEEDS CLARIFICATION]`; gates merge, not planning |
| FR-017 | yes *(owner)* | T024 | |
| FR-018 | yes *(owner)* | T028 | |
| SC-001 | yes | T027, T028 | |
| SC-002 | weak | T029 (partly) | **F5** — the week-long measurement is unowned |
| SC-003 | weak | T006, T007 | **F6** — mocked only |
| SC-004 | yes | T028 | run twice, per the constitution |
| SC-005 | yes | T009 | three named negatives |
| SC-006 | yes | T006-T009, T018 | wording per **F10** |
| SC-007 | yes | T006 | |
| SC-008 | yes | T020, T027 | |

## Constitution Alignment Issues

**None rising to a violation.** Principle by principle: **I** PASS (spec precedes code; nothing implemented). **II** PASS (AS-IS A1-A16 all anchored; DELTA pairs every transition with a test; A15/A16 were established by reading code during this session and are marked as such). **III** PASS (two slices, hub `prBase: master` from repo-policy, own worktrees, foreground gates, no direct commit to a release branch). **IV** PASS-as-not-applicable, see **F7** for making that auditable. **V** PASS with the gates open — T024 (spec approval) and T026 (owner merge) are unmet and block everything, which is the intended state of a security-tagged spec before approval.

Two notes that are not findings against the artifacts:

- `/speckit-implement` was **not** run (this session stops at analyze). Principle I's cycle is incomplete *as a session*, not as a spec.
- The open-items ledger is satisfied prospectively (T015 writes the `TODO(handoff)`s; T017/T032 write the proposal entries). It cannot be verified until the PRs exist.

## Unmapped Tasks

| Task | Why it maps to no FR/SC | Verdict |
|---|---|---|
| T001, T002 | worktree hygiene and an AS-IS staleness check | keep — T002 is the stop condition that prevents implementing against a moved codebase |
| T016, T021 | the gate runs | keep — Principle III requires them |
| T017, T023 | PR mechanics | keep |
| T031, T032, T033 | board stub, proposal/frontmatter state, AS-IS refresh | keep — the constitution's Artifact-layout clause mandates T031 |
| T015 | ledger comments | maps to the constitution, not to an FR |

No task is unjustified; 10 of 33 serve process requirements rather than functional ones, which is what a security-and-data-tagged feature costs in this workspace.

## Metrics

- Functional requirements: **24**
- Success criteria: **8**
- Tasks: **33** (7 test, 12 implementation, 3 gate/PR, 7 owner-only, 3 registration, 1 setup)
- Requirement coverage (>=1 task): **24/24 = 100%** — 2 flagged weak (F1, F4)
- Success-criteria coverage: **8/8** — 2 flagged weak (F5, F6)
- `[NEEDS CLARIFICATION]` remaining: **1** (FR-016 -> Q1, deliberate)
- Ambiguity findings: **3** (F3, F4, F10)
- Duplication findings: **1** (F8)
- **CRITICAL: 0. HIGH: 1 (F1). MEDIUM: 5. LOW: 4.**

## Next Actions

1. **Resolve F1 before implementation.** It is one sentence in FR-002 plus one clause in T003, and it is the difference between a fix and a reprise of the defect.
2. Fix F2 and F4 while editing the spec for F1 (both one-line edits), and add the two owner tasks for F5/F6 to Phase 5.
3. **Then the two real blockers, neither of which analysis can clear**: owner approval of the spec (T024) and the Q1 answer (T025). Principle V.
4. Do **not** run `/speckit-implement` yet. No CRITICAL issue blocks it, but an unapproved security-and-data spec does.

## Remediation

Concrete edits for F1-F4 and F10 are available on request; per this command's read-only constraint, nothing has been applied. Suggested order: F1 (spec FR-002 + tasks T003/T005/T007), then F2/F4/F10 as single-line edits, then F5/F6 as two new owner tasks.
