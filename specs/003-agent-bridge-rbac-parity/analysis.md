# Specification Analysis Report — Agent bridge RBAC parity

`/speckit-analyze` output. Artifacts analysed: `spec.md` (29 FR, 12 SC, 6 user stories), `plan.md`,
`tasks.md` (58 tasks), `research.md`, `data-model.md`,
`contracts/{shared-guard,actions-human-path-map}.md`, `quickstart.md`, against
`.specify/memory/constitution.md` v1.0.0.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| U1 | Underspecification | **CRITICAL** | `contracts/actions-human-path-map.md:16-36`; T006, T031 | The map's human pathnames come from the audit reports and from `apiWriteCapability`'s prefix table — **not re-read from the handlers in this session**. The feature's headline deliverable (the parity test) is only as correct as this table, and Principle II says a spec with unverified claims is not ready for planning. Mitigated, not cured: T006 is a blocking Foundational task that re-reads all 17 pairs, and the one row whose outcome depends on `CREATE_COLLECTION_ENDPOINTS` (`/api/pos/tickets`) was confirmed at `rbac.service.ts:1188-1192`. | Do T006 before any US4 code; treat a corrected row as a spec amendment, not a silent edit. Never generate the typed constant from the markdown without the re-read. |
| G1 | Coverage gap | **HIGH** | `spec.md` Success Criteria; proposal slice S0 | **Nothing in this feature is observable in production until the bridge is restored.** The proposal's AS-IS states every gateway→hub tool call is a 403 today because 11/11 `personal_agents.gateway_id` rows are NULL (slice S0, out of scope here). SC-002, SC-006 and SC-012 are production-observable criteria that cannot be measured until S0 lands. The spec never says so. | Add a dependency line to `spec.md` Assumptions: production verification of SC-002/SC-006/SC-012 waits on slice S0; unit and integration evidence stands on its own meanwhile. |
| I1 | Inconsistency | **HIGH** (fixed in this pass) | `spec.md:180,253,261,269,282,291`; `contracts/actions-human-path-map.md:38` | The spec said "four writes" become stricter in six places; the audit and the map list **five** (`booking-create`, `stock-entry-create`, `stock-issue-from-invoice`, `task-create`, `ticket-create`), six if `stock-issue-from-service` counts. A wrong count inside the release-note requirement (SC-010) is exactly what the owner would check. **Corrected to five in place during analysis** and recorded here rather than left silent. | Re-verify the final count against T006; decide explicitly whether `stock-issue-from-service` (no human counterpart) counts as a narrowing. |
| C1 | Constitution alignment | **HIGH** | `plan.md` Constitution Check III; `repo-policy.yaml` hub/`minion` `commands.test` | Principle III requires "the repository's own gates run in the foreground". In both repos the registry's declared `test` command **must not be run** — hub `bun run test` has reached production through `*.sql.integration.test.ts` (2026-09-03, ~10 minutes of hub-wide 500s) and gateway `pnpm test` crashes the box. The plan substitutes targeted commands and declares the deviation, which is the only safe reading, but the registry itself is wrong. | Fix `commands.test` for `minion_hub` and `minion` in a separate meta PR, or the next agent will follow the registry. Out of scope here; worth a proposal line. |
| A1 | Ambiguity | MEDIUM | `spec.md` FR-019; `research.md` R4; T045 | "A path bound to that single run" is a property, not a mechanism. R4 picks gateway-mediated access over a minted token and gives the reason, but the handle's shape (loopback endpoint? per-run nonce? injected fetch wrapper?) is left to implementation. | Acceptable for a spec; have T045 record the chosen mechanism back into R4 so the next reader sees a decision, not an option. |
| G2 | Coverage gap | MEDIUM | `spec.md` SC-002/003/004/010/012; T057 | T057 re-measures SC-001, 005, 007, 008, 009, 011. SC-002 (UI/agent refusal pairs), SC-003 (staleness window and the never-configured org), SC-004 (0 out-of-scope records, 0 unmasked PII), SC-010 (no widening) and SC-012 (refusals retrievable) have tests behind them but no task that *measures* them at the end. | Extend T057 to all twelve, or state which are proven by tests alone and need no closing measurement. |
| M1 | Inconsistency | MEDIUM | brief vs reality; `spec.md` Out of scope; T005 | The brief called hub #541 an "already-shipped hotfix". It is **OPEN** (`gh pr view 541` → `state: OPEN`, `mergedAt: null`) and the three handlers are unchanged at `7d917ed0`. The spec records the correction and T005 handles the rebase, but a slice branched from a base without it will look like it re-opened two CRITICAL findings. | Confirm #541's state at branch time; do not restate "shipped" anywhere downstream. |
| M2 | Inconsistency | MEDIUM | `C-tool-feeding.md` M3, `00-synthesis.md` §3, the proposal, the brief vs `spec.md` A17 | Four inputs say `actions/notify-user` "checks nothing"; the handler enforces `comms:create` with a fresh membership re-check (`authority.ts:29-43`). E-rbac-parity's own parity table disagreed with its sibling report and was right. | Already corrected in A17 and in the map; T004 propagates it to the proposal. Note that the synthesis inherited one report's error. |
| D1 | Duplication | LOW | `spec.md` FR-004 vs FR-027 | "Absent toggle = enabled" and "indeterminate state = refuse" sit adjacent and read as contradictory on a fast pass. | Deliberate and cross-referenced in both FRs and in `data-model.md`; keep. |
| D2 | Duplication | LOW | `spec.md` FR-001/FR-003 vs `contracts/shared-guard.md` | The guard's obligations are stated in both places. | Intentional (the contract is the implementer-facing copy); no action. |
| C2 | Constitution alignment | LOW | `plan.md` Constitution Check IV | Principle IV's "every user-facing string → Paraglide" was judged N/A because bridge refusals are API error strings. They do reach the end user, relayed by the agent, in whatever language the handler hard-codes (today English: "Your role does not permit 'edit' on crm."). | Defensible as written; Spanish refusals through the agent would be a separate spec. Named, not widened. |
| U2 | Underspecification | LOW | `tasks.md` T014 | "For every endpoint that calls `resolveAssistantPrincipal` directly" is resolved by a grep the task names but does not run, so the task's size is unknown until it starts (known floor: 5 endpoints). | Run the grep at the start of US1 and split T014 if it exceeds a handful. |

## Coverage summary

| Requirement | Has task? | Task IDs |
|---|---|---|
| FR-001 one shared guard | yes | T008, T009, T014 |
| FR-002 disabled module refused | yes | T009, T012, T013 |
| FR-003 guard returns owner/mask | yes | T023 |
| FR-004 absent toggle = enabled | yes | T010, T012 |
| FR-005 CRM reads owner-scoped | yes | T024, T025, T026, T029 |
| FR-006 CRM writes owner pre-check | yes | T027, T029 |
| FR-007 conversation text masked | yes | T028, T029 |
| FR-008 custom-tool catalogue gated | yes | T016, T021 |
| FR-009 gateway-only endpoints refuse a browser | yes | T017, T018, T019, T021 |
| FR-010 agent memory bound to its owner | yes | T018, T021 |
| FR-011 joined read needs both caps + mask | yes | T020, T021 |
| FR-012 capability equals the human's | yes | T032–T038 |
| FR-013 committed map; a missing row fails | yes | T006, T031 |
| FR-014 POS capability = the till's | yes | T032, T039 |
| FR-015 no self-assigned tool permission | yes | T037 |
| FR-016 every fetch failure denies | yes | T041, T042, T043 |
| FR-017 skipping gating needs a positive signal | yes | T002, T041 |
| FR-018 no credential in the script env | yes | T044, T046 |
| FR-019 run-bound hub access | yes | T045, T046 |
| FR-020 attributable actor | yes | T049, T051 |
| FR-021 approval workflow honoured | yes | T050, T051 |
| FR-022 module-action allowlist all gated | yes | T053 |
| FR-023 "L1 is a boundary" corrected | yes | T054 |
| FR-024 negative controls per module | yes | T013 |
| FR-025 no widening; narrowing named | yes | T039, T057 |
| FR-026 leave #541's endpoints alone | yes | T005 |
| FR-027 indeterminate state refuses | yes | T010, T012 |
| FR-028 refusals observable | yes | T011 |
| FR-029 mask before leaving the hub | yes | T028 |

**29 of 29 functional requirements have at least one task (100%).** Of the twelve success criteria,
six are re-measured by T057, five more rest on tests with no closing measurement (G2), and
SC-002/SC-006/SC-012 additionally need slice S0 for production evidence (G1).

**Unmapped tasks**: none map to no requirement. T003, T004, T056 and T058 map to constitution
obligations (board registration, open-items ledger, artifact layout) rather than to an FR — correct,
not a gap.

## Constitution alignment issues

- **Principle II** — U1 (unverified human pathnames in the contract map) is the one genuine breach,
  mitigated by a blocking task. Otherwise satisfied unusually well: 18 anchors re-opened, four counts
  re-run, one input claim disproved (M2).
- **Principle III** — C1: the registry's declared gate command is unsafe in both repos; the plan
  deviates deliberately and says so in every PR body.
- **Principle IV** — satisfied; C2 is a judgement call worth naming, not a breach.
- **Principle V** — satisfied by construction (T001 approval gate, owner merge on all six PRs).
- **Open-items ledger** — T056 does both halves (in-code `TODO(handoff)` and a `proposals/` append).
- **Artifact layout** — T003 adds the top-level board stub that the Spec Kit directory layout
  otherwise hides from `scripts/spec-index.mjs`.

## Metrics

- Total requirements: 29 FR + 12 SC
- Total tasks: 58 (30 parallelisable)
- Requirement coverage: 100% of FRs with ≥1 task
- Ambiguity count: 1 · Duplication count: 2 (both deliberate) · Critical issues: 1 (U1)

## Next actions

1. **Before any code**: T001 (owner approval, Principle V) and T006 (re-read the 17 handler pairs —
   resolves U1). U1 is CRITICAL and T006 is cheap; do not start US4 without it.
2. Add the slice-S0 dependency line to `spec.md` Assumptions (G1) and extend T057's measurement list
   (G2) — two edits, both inside this directory.
3. File the `repo-policy.yaml` gate-command correction (C1) as its own proposal line; it is a
   workspace-wide trap, not this feature's problem.
4. Then US1 as the MVP. Do **not** run `/speckit-implement` until T001 is recorded.

Remediation beyond the I1 count fix (a factual error, not a judgement) is not applied here: the rest
needs the owner's approval first.
