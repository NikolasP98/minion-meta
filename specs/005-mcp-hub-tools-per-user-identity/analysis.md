# Specification Analysis Report — 005-mcp-hub-tools-per-user-identity

Date 2026-10-15. Read-only pass over `spec.md`, `plan.md`, `tasks.md`, with `research.md`,
`data-model.md`, `contracts/` and `quickstart.md` as supporting context, against
`.specify/memory/constitution.md` v1.0.0.

**No file was modified.** Two findings (C1, U1) are defects in the artifacts that this pass is not
permitted to fix; their exact corrections are given and listed under Next Actions.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Inconsistency (arithmetic) | **CRITICAL** | spec.md SC-004; tasks.md T028 | **The exported-write count is wrong.** AS-IS A4 measures 17 writes among the 30 flagged tools. Clarifications Q3 withholds three tools: `module_action` (write), `notes_create` (**write**), `notes_query` (read). Exported writes are therefore **15**, not the 16 stated in SC-004 and T028. The exported set decomposes as 12 reads + 15 writes = 27. A wrong number in the one exhaustive negative test that proves the feature's hard invariant means the test can pass while a write tool is unswept. | Change SC-004 and T028 to **15**, and state the decomposition (12 read + 15 write = 27) in SC-002 so the three numbers cannot drift apart again. |
| D1 | Constitution alignment | **CRITICAL** | plan.md "Constitution Check" row *Artifact layout and registration*; tasks.md T003 | The constitution requires a feature that must appear on the meta board to also carry a top-level `specs/<date>-<slug>-spec.md` stub with `TEMPLATE.md` frontmatter. **No stub exists.** The plan discloses this and marks the row PARTIAL, and T003 creates it — but as the artifact set stands, a constitution requirement is unmet. Per this command's Constitution Authority rule, an unmet MUST is CRITICAL regardless of disclosure. | Keep T003 as the first executable task after owner approval. Alternatively amend the constitution so the stub is required at adoption rather than at spec creation — a separate constitution change, not a reinterpretation here. |
| D2 | Constitution alignment | **CRITICAL** (blocker on execution, not an artifact defect) | plan.md Constitution Check row V; tasks.md T001 | The feature is security- and data-tagged, so Principle V requires **owner approval of the spec before any code and owner merge of every slice**. The plan says "gates asserted, not yet obtained". No task may begin until T001 completes. | No artifact change. Treat T001 as a hard gate; do not let a later session read "PASS" in the Constitution Check as "approved". |
| U1 | Underspecification / self-contradiction | **HIGH** | spec.md SC-009; spec.md INV-6; plan.md Summary; research.md R4–R5 | SC-009 states "the count of places that decide 'may this agent do this' does not increase", and INV-6 says no new authorization code is written. The design **does** add a gateway-side decision point: the capability filter applied at `tools/list` (T041) and re-applied at `tools/call` (T051). Both are places that decide whether an agent may do something. As written, SC-009 is falsified by the plan it is supposed to measure. | Reword SC-009 to distinguish *authoritative* from *advisory*: the hub remains the only enforcer, and the gateway filter must never be the sole thing between a caller and an action. Then add the test that makes it true — a call refused by the gateway filter is **also** refused by the hub if the filter is bypassed. |
| G1 | Coverage gap | **HIGH** | quickstart.md P4; research.md R1; tasks.md (none) | A hub-minted JWT only authenticates if the gateway trusts the hub as an issuer (`gateway.multiTenant.oidcIssuers`; `gw src/gateway/server.impl.ts:1694-1695` skips the JWT branch entirely when the list is empty). The quickstart lists this as prerequisite P4, but **no task configures or verifies it**. A production gateway with an empty issuer list silently falls through to the admin paths — exactly the failure INV-1 then has to catch. | Add a Phase 2 task that verifies the issuer configuration on every target gateway, plus a test that an unconfigured gateway rejects the credential rather than degrading to admin. |
| A1 | Ambiguity / workflow | **HIGH** | spec.md "Deferred — genuine unknowns"; plan.md; `.claude/skills/speckit-plan/SKILL.md` Key rules | Three `[NEEDS CLARIFICATION]` markers remain and `/speckit-plan` was executed anyway. The plan skill's own Key rules say "ERROR on gate failures or **unresolved clarifications**". OG1 (which organization a multi-organization user may mint for) materially determines FR-001 and the immutability of `orgId` in `data-model.md` §1, so planning past it is not cost-free. | Either obtain the three answers (T002) before treating `plan.md` as final, or record in `plan.md` that it was produced under unresolved clarifications and name which decisions are provisional. The current plan does neither. |
| I1 | Inconsistency (terminology drift vs. upstream) | **MEDIUM** | spec.md, plan.md, contracts/mcp-surface.md vs. the feature brief and `audits/.../D-mcp-exposure.md` "Smallest design" | The upstream artifacts name three concrete identifiers — `tools.invoke`, `fixedParams`, `seedAgentToolsFromRegistry()`. The spec correctly avoids them, but `plan.md` and `data-model.md` then invent **different** names (`pinnedParams`, "the invoke gateway method", `agent-tools-seed.ts`). An owner comparing the proposal to the plan will not see the same feature. | Pin the upstream names in `plan.md`'s source tree and `data-model.md` §3, keeping `spec.md` name-free. One mapping sentence in the plan would also do. |
| F1 | Inconsistency (task ordering) | **MEDIUM** | tasks.md T053 vs. T032, T034, T043 | T053 ("add the three permissionless tools' declared permissions **or** leave them withheld — whichever T002's owner answer chose") can invalidate tests written in T032/T034 and ledger entries in T043, 20 tasks earlier. A task whose outcome rewrites earlier tasks' assertions is a planning defect, not a dependency. | Move the decision to Phase 1 (already T002's job) and delete T053, so Phase 5 is written once against a known set. |
| V1 | Underspecification (evidence) | **MEDIUM** | spec.md AS-IS preamble; `audits/.../00-synthesis.md` "Not verified" | Every AS-IS anchor is a code reading; the spec says so. But the audit also records that **`/mcp` was never probed live**. The whole acceptance matrix therefore rests on an endpoint no one has called, including the claim that the existing ~19 infra tools work (the regression surface in `contracts/mcp-surface.md`). Constitution II wants anchors that include queries and transcripts, not only file:line. | Add a Phase 2 task that probes `/mcp` with a shared token and records the actual `tools/list` output as the baseline this feature must not regress. One request converts the regression surface from assumed to measured. |
| V2 | Coverage gap (process) | **MEDIUM** | tasks.md T007; research.md HD1; constitution Principle V | HD1 is a **production data write** (the personal-agent gateway backfill) owned by another slice. Principle V's rules for production scripts — dry-run default, undo in `finally`, run twice, assert an invariant — apply to it, but T007 only checks the *outcome* ("a read tool returns data"). Nothing here records that the dependency was executed safely, so a careless S0 run is invisible from this feature. | T007 should additionally require the S0 PR link and its before/after invariant counts, so this feature's PR body carries the evidence rather than assuming it. |
| B1 | Ambiguity | **MEDIUM** | spec.md FR-023; data-model.md §5; tasks.md T056 | The call budget's window and limit are "operator-configurable" with no default and no order of magnitude stated anywhere; SC-007 only says "not more than its configured number". With OG2 unresolved (is `/mcp` public?), an unset default is an open door. | State a default in FR-023 — deliberately conservative is fine — and make SC-007 measure against that default rather than against "whatever is configured". |
| U2 | Underspecification | **MEDIUM** | spec.md FR-022; tasks.md T052 | FR-022 (results in the protocol's normal shape, execution failures as tool errors) has one implementation task and no test of its own; T037 tests the infra-tool regression, not the result shape. A client that treats a tool error as a protocol error drops the session — a user-visible failure. | Add a test asserting the four refusal classes and one success all return as results with the correct `isError` value, and that only unknown-tool and malformed-request use a JSON-RPC error. |
| I2 | Inconsistency | **LOW** | spec.md Story 5 scenario 3; FR-024 | Story 5 is about availability ("a runaway client cannot take the business down") but its third scenario is security observability (surfacing refused cross-organization attempts). The scenario is right and in the wrong story, which is why FR-024 reads as an afterthought. | Move it to Story 4 (the invariant story) or give observability its own short story. |
| L1 | Duplication | **LOW** | spec.md FR-013 and FR-027 | FR-027's substantive clause is "the embedded OAuth path MUST never yield hub business capability", which the requirement itself labels "an instance of FR-013". The non-duplicate part is "remain opt-in and off by default". | Keep FR-027 to the opt-in/off-by-default clause and drop the restatement; keep the cross-reference. |
| L2 | Duplication | **LOW** | spec.md FR-003/005/006 vs. contracts/hub-credential-api.md C1, C3 | The re-check-at-exchange-time preconditions are stated three times in slightly different words. Not harmful, but three statements drift. | State them once in the contract and have the FRs reference it. |
| L3 | Style | **LOW** | plan.md Technical Context "Performance Goals" | "No added latency to in-app assistant turns" is a non-goal phrased as a goal, with no measurement. The real content is "this feature must not touch that path", which is already INV-6. | Replace with "N/A — this feature adds no work to the in-app assistant path (INV-6)". |

## Coverage Summary

### Functional requirements

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 credential scoped to one org | Yes | T012, T018, T019 | Provisional on OG1 (A1) |
| FR-002 secret shown once | Yes | T012, T018, T019, T024 | |
| FR-003 expiry enforced | Yes | T012, T013, T017 | |
| FR-004 list + revoke | Yes | T019, T024 | Owner-only; OG3 unresolved |
| FR-005 revocation on next request | Yes | T014, T021, T025 | Closes newly-found gap A11 |
| FR-006 refuse without membership | Yes | T012, T013, T018 | |
| FR-007 resolves to user + org + agent | Yes | T015, T016, T025, T026 | |
| FR-008 refuse without a usable agent | Yes | T012, T018 | |
| FR-009 security events | Yes | T022 | Implementation only, no test |
| FR-010 export with the tool's own schema | Yes | T032, T039 | |
| FR-011 list filtered by capabilities | Yes | T033, T041 | |
| FR-012 permissionless ⇒ excluded + refused | Yes | T032, T034, T039, T043 | |
| FR-013 shared credential ⇒ no business tools | Yes | T027, T028, T031 | **T028's count is wrong (C1)** |
| FR-014 no user/org ⇒ refused | Yes | T029, T031 | |
| FR-015 call applies the list's test | Yes | T035, T051 | |
| FR-016 disabled module ⇒ excluded | Yes | T009, T036, T041 | Depends on HD3 |
| FR-017 pinned params not overridable | Yes | T038, T044, T050 | |
| FR-018 MCP-only withhold | Yes | T042, T059 | |
| FR-019 execute through the existing bridge | Yes | T047, T049 | See U1 |
| FR-020 org from the credential | Yes | T045, T050 | |
| FR-021 refusal names the limitation | Yes | T046, T052 | |
| FR-022 protocol result shape | **Weak** | T052 | No dedicated test (U2) |
| FR-023 per-credential rate limit | Yes | T054, T056 | No default stated (B1) |
| FR-024 security signal | Yes | T057 | No test |
| FR-025 OAuth survives restart | Yes | T062 | No test listed |
| FR-026 refresh expiry + revocation | Yes | T063 | No test listed |
| FR-027 OAuth opt-in, no capability | Yes | T027, T064 | Partly duplicates FR-013 (L1) |
| FR-028 capability view from the real list | Yes | T058, T060, T061 | |
| FR-029 connection docs | Yes | T024, T065 | |
| FR-030 ledger for withheld tools | Yes | T004, T043 | |

**30 of 30 requirements have at least one task. 1 is weakly covered (FR-022). 4 have an
implementation task but no test task (FR-009, FR-024, FR-025, FR-026).**

### Success criteria requiring buildable work

| Criterion | Has task? | Task IDs | Notes |
|---|---|---|---|
| SC-001 under 5 minutes end to end | Yes | T024, T065, T066 | |
| SC-002 27 listable | Yes | T032, T033 | Should also state 12 read + 15 write (C1) |
| SC-003 persona parity, no asymmetry | Yes | T033, T035 | |
| SC-004 zero writes, exhaustive | Yes | T028 | **Wrong count (C1)** |
| SC-005 revoked fails first request | Yes | T014 | |
| SC-006 every write attributable | Yes | T047 | |
| SC-007 budget respected | Yes | T054, T056 | No default to measure against (B1) |
| SC-008 panel and client lists agree | Yes | T058 | |
| SC-009 no new decision point | **Contradicted** | T047 | See U1 — falsified by the design |
| SC-010 per-tool kill switch | Yes | T042, T059 | |

## Constitution Alignment Issues

| Principle | Status | Issue |
|---|---|---|
| I. Spec before code | OK | The cycle ran in order; no code exists. |
| II. AS-IS → TO-BE → DELTA with evidence | OK with a caveat | 19 anchored observations, 11 delta rows with proofs, 3 audit counts corrected, 2 new findings. Caveat V1: all anchors are code readings; `/mcp` has never been probed. |
| III. Slice-scoped delivery | OK | 5 slices, each one PR against its repository's registered PR base; cross-repo order stated and justified. |
| IV. Required build steps | OK | Route-contract manifest and six counts (T023), design tokens and lint (T024, T060), Paraglide plus `i18n:compile` (T024, T060), RBAC wiring (T019, T023). |
| V. Security and data human gates | **CRITICAL — not satisfied yet** | D2: approval and merge gates asserted, not obtained. Also V2: the production-write dependency's safety rules are not evidenced from this feature's task list. |
| Open-items ledger | OK | T004, T043, T068 write every open end twice (proposal entry plus in-code `TODO(handoff)`). |
| Artifact layout and registration | **CRITICAL — not satisfied** | D1: the top-level board stub does not exist. |

## Unmapped Tasks

Tasks with no functional requirement behind them. All are legitimate, and all are process or
verification rather than product — but they are 15 of 68 tasks (22%) and none appear in any success
criterion.

| Task | Why it exists |
|---|---|
| T001, T002 | Constitution V gates and the owner-gated decisions |
| T003 | Constitution artifact registration (D1) |
| T004, T068 | Open-items ledger |
| T005, T006 | Isolated worktrees per Principle III |
| T007, T008, T009 | Hard dependencies HD1–HD3 owned by other slices |
| T010 | Persona fixtures |
| T030, T037 | Regression guards (admin-user misclassification; the existing infra tools) |
| T055 | Scoping guard on the call budget |
| T066, T067 | Quickstart execution and the operational reachability answer (OG2) |

## Metrics

| Metric | Value |
|---|---|
| Functional requirements | 30 |
| Success criteria | 10 (all requiring buildable work) |
| User stories | 6 (4 at P1, 1 at P2, 1 at P3) |
| Acceptance scenarios | 24 |
| Invariants | 6 |
| Edge cases | 9 |
| AS-IS anchored observations | 19 |
| DELTA transitions | 11 |
| Tasks | 68 (24 test tasks, 35%) |
| Requirement coverage | 30/30 = **100%** (1 weak, 4 without a test) |
| Success-criteria coverage | 10/10, of which **1 is contradicted by the design** (SC-009) |
| `[NEEDS CLARIFICATION]` remaining | 3 |
| Owner-gated decisions | 5 (OG1–OG5) |
| Hard external dependencies | 3 (HD1–HD3) |
| Findings | 16 — **3 CRITICAL**, 3 HIGH, 6 MEDIUM, 4 LOW |
| Ambiguity findings | 2 (A1, B1) |
| Duplication findings | 2 (L1, L2) |
| Constitution conflicts | 2 unmet (D1 layout; D2/V2 human gates) |

## Next Actions

**Before `/speckit-implement` or any code:**

1. **Fix C1** — the exported-write count is 15, not 16, in SC-004 and T028, and state the 12 + 15 = 27 decomposition in SC-002. This pass is read-only and did not apply it; a wrong count in the one exhaustive invariant test is the highest-value correction in this report.
2. **Fix U1** — SC-009 as written is falsified by the design. Reword it to authoritative-versus-advisory and add the test that the hub still refuses what the gateway filter refuses.
3. **Resolve A1** — answer OG1–OG5 (T002), or mark `plan.md` provisional and name which decisions depend on which answer.
4. **Close G1** — add a task that verifies the gateway trusts the hub as a JWT issuer; without it the credential silently does nothing and the admin fallback answers instead.
5. **Satisfy D1 and D2** — create the board stub (T003) and obtain owner approval (T001). Principle V's gates are not a formality for a feature whose whole subject is a new authentication path.
6. **Then the MEDIUMs**: F1 (delete T053, decide in Phase 1), V1 (probe `/mcp` once and record the baseline), V2 (carry the S0 evidence into this feature's PR body), B1 (state a rate-limit default), U2 (test the result shape), I1 (pin the upstream names).

**Remediation was not applied.** This command is read-only by its own operating constraints, so the
spec and tasks still contain C1's wrong number and U1's contradicted criterion. If that is not what
you want from an analysis step, the constraint — not the finding — is what to change.
