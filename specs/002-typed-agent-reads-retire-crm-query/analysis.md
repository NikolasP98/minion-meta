# Specification Analysis Report: Typed Agent Reads, Retire crm_query

Non-destructive cross-artifact analysis of `spec.md`, `plan.md`, `tasks.md` (+ `research.md`,
`data-model.md`, `contracts/typed-dataset-query.md`, `quickstart.md`) against
`.specify/memory/constitution.md`. No files modified by this pass.

## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| F1 | Inconsistency / factual error | HIGH | spec.md:118,246,295,309; plan.md:34,113; research.md:37; tasks.md:206 | Every artifact says "13 existing typed `query/*` endpoints," but `find .../api/gateway/query -name '+server.ts'` returns 13 **files**, one of which is `query/+server.ts` itself — the retired `ASSISTANT_SQL_DISABLED` stub FR-011 requires to stay disabled, not a typed endpoint. The actual typed-endpoint count is **12** (`pos`, `stock`, `finance`, `bookings`, `tickets`, `orders`, `projects`, `notes`, `email-ledger`, `sdk-catalog`, `custom-tools`, `tool-permissions`) — the exact 12 every artifact also names. This number is load-bearing for FR-013, SC-005, and task T020's "confirm all 13 pre-existing endpoints are unchanged/green." | Change "13" → "12" everywhere it describes typed endpoints; leave "13 files under `query/`" only if explicitly distinguishing the retired stub from the 12 typed ones. |
| F2 | Coverage gap | HIGH | tasks.md T012; `minion/src/agents/tools/_gen/_registry.generated.ts:444-451`, `_groups.generated.ts:25` | T012 deletes `crm-query-tool.ts`/`.meta.ts` and edits `minion-tools.ts`, but the gateway's tool registry is **codegen'd and git-tracked** (`pnpm generate:tools` → `scripts/generate-tool-registry.ts` → `_registry.generated.ts`/`_groups.generated.ts`, confirmed committed via `git log`). `_registry.generated.ts:451` currently reads `load: () => import("../knowledge/crm-query-tool.js")`. No task regenerates these files after the delete, so FR-001 ("no entry in the tool registry") is not actually satisfied by T012 alone — the generated file still imports a path that no longer exists. | Add a task after T012: run `pnpm generate:tools` (or the project's generator script) and commit the regenerated `_registry.generated.ts`/`_groups.generated.ts`; T010's registry test should run after this, not before. |
| F3 | Coverage gap | MEDIUM | spec.md FR-015; tasks.md (no match) | FR-015 requires the replacement tool to be "discoverable through the same ranking/discovery mechanism existing typed tools use today" (i.e. `search_tools`). No task in tasks.md exercises `search_tools` against the new tool, and the audit evidence this feature depends on (C-D3: JIT ranks on the 4.3 KB envelope, not the user's text) means a "the tool exists in the registry" test is not the same as "the tool is actually surfaced for a relevant query." | Add a task that calls `search_tools` (or its test harness) with a representative question for the new dataset and asserts the replacement tool is returned; note that this does not fix C-D3/S6 (JIT ranking), only confirms today's ranking mechanism surfaces the tool at all. |
| F4 | Coverage gap | MEDIUM | spec.md FR-010; tasks.md (no dedicated task) | FR-010 ("no caller-supplied SQL fragment, statement prefix, or session-local GUC may participate in isolation") is implemented in T006's description but has no adversarial test task — T016's cross-org case exercises the *tenant* half but nothing attempts a SQL-metacharacter payload in a dataset-specific filter param to prove it is bound as a parameter, not interpolated. | Add a task: for each dataset-specific filter param, assert a string containing SQL metacharacters is treated as a literal value, not interpolated or skipped as "obviously fine because parameterized." |
| F5 | Coverage gap | LOW | spec.md FR-011; tasks.md (no match) | FR-011 ("`POST /api/gateway/query` stays retired... not reused") has no task verifying it — satisfied only by omission (no task touches `query/+server.ts` or `assistant-query.service.ts`). Low severity because the existing code is already a static 503 the feature doesn't touch. | Optional: add one line to Phase 6 polish confirming `query/+server.ts` and `assistant-query.service.ts` are byte-identical to their pre-feature state. |
| F6 | Underspecification (resolved on inspection) | LOW | tasks.md T008 | T008 hedges the gateway tool file path ("find its actual path via `grep`... if the name differs") instead of citing a confirmed path. Verified during this analysis: the path is correct as `minion/src/agents/tools/hub/finance-query-tool.ts`. Not blocking — the hedge just wasn't necessary. | Replace the hedge with the confirmed path; keep the grep as a "verify, don't trust blindly" footnote if desired. |
| F7 | Terminology drift | LOW | spec.md ("typed dataset"), data-model.md ("TypedDataset", "mode"), tasks.md ("mode", "dataset") | "Dataset," "typed dataset," and "mode" are used near-interchangeably once research.md R2 commits to the `mode=`-per-domain shape. data-model.md's `TypedDataset.id` is explicitly "domain + mode" but later text sometimes says "dataset" to mean the whole domain endpoint and sometimes one mode within it. | Not blocking — data-model.md's definition is the disambiguating source of truth. Note for an implementer skimming only tasks.md: read data-model.md's `TypedDataset` table once before starting T006. |

**Overflow**: none — all findings fit in the table above (7 total, under the 50-row limit).

## Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 (retire tool registration) | Yes | T010, T012 | Incomplete without F2's fix — T012 alone leaves the generated registry stale. |
| FR-002 (retire envelope prose) | Yes | T011, T013 | |
| FR-003 (≥1 typed dataset) | Yes (implicit) | T006, T007 | No task cites FR-003 directly; satisfied as a byproduct of implementing the dataset. |
| FR-004 (field masking) | Yes | T006, T017 | Uses the corrected mechanism (`capabilities.fieldLevel`) per research.md R1. |
| FR-005 (tenant/module/capability/owner resolution) | Yes | T007, T016, T018, T019 | T019 is contingent ("if T016-T018 reveal a gap"). |
| FR-006 (query-level row/byte cap) | Yes | T004, T006, T007 | |
| FR-007 (`truncated` signal) | Yes | T004 | |
| FR-008 (structured refusal) | Yes | T016 | |
| FR-009 (versioning/deprecation) | Yes | T005 | |
| FR-010 (no caller-mutable isolation) | Partial | T006 (impl only) | See F4 — no adversarial test task. |
| FR-011 (no raw-SQL endpoint revival) | No | — | See F5 — satisfied by omission, not asserted. |
| FR-012 (ship retirement + replacement together) | Yes | T012 (dependency), T023 | |
| FR-013 (pre-existing endpoints unchanged) | Yes | T020 | Count should read 12 per F1. |
| FR-014 (persona negative-control suite) | Yes | T015, T016, T017, T018 | |
| FR-015 (discoverability via search_tools) | No | — | See F3. |
| SC-001 (0 failing smoke-test turns) | Yes | T009, T022 | |
| SC-002 (zero `crm_query` occurrences) | Yes | T010, T011, T021 | |
| SC-003 (100% negative controls refused) | Yes | T016, T017, T018 | |
| SC-004 (truncation always distinguishable) | Yes | T004 | |
| SC-005 (pre-existing endpoints unchanged) | Yes | T020 | Count should read 12 per F1. |

## Constitution Alignment Issues

None blocking. Plan.md's own Constitution Check, independently re-verified here:

- **Principle I–IV**: PASS — no code exists yet (I); every AS-IS claim in spec/plan carries a
  file:line or audit-finding citation (II, modulo F1's count error); the feature is scoped as
  slice S4 of the parent proposal and splits into exactly two PRs, one per repo's registered PR
  base (III); RBAC wiring is explicitly required by FR-004/FR-005 rather than deferred, and the
  UI-only obligations (Paraglide i18n, route-contract manifest) are correctly scoped out —
  independently verified here by grep: neither `route-access-registry.ts` nor
  `route-design-manifest.ts` references `api/gateway/query`, confirming the existing 12 agent-only
  endpoints were never part of that manifest (IV).
- **Principle V**: Flagged, not violated — this feature is security-tagged, so Principle V's
  human-gate requirement applies. plan.md already surfaces this ("owner must approve this spec
  before any code is written, and must merge both PRs") and tasks.md T023 repeats it at the PR
  step. This is the one gate that blocks `/speckit-implement`, not a defect in the artifacts.

## Unmapped Tasks

None. T001–T024 all trace to at least one FR/SC, a research.md decision, or a Constitution
principle (T001 worktree setup, T002 foundational placement decision, T023/T024 process/ledger
obligations).

## Metrics

- Total Requirements (FR + buildable SC): 20 (15 FR + 5 SC)
- Total Tasks: 24 (T001–T024)
- Coverage %: 90% (18/20 — FR-011 and FR-015 have zero dedicated task)
- Ambiguity Count: 1 (F7, terminology drift — LOW, not blocking)
- Duplication Count: 0
- Critical Issues Count: 0 (highest severity found: HIGH ×2 — F1, F2)

## Next Actions

No CRITICAL issues. Two HIGH findings (F1 count error, F2 missing codegen step) should be fixed
before `/speckit-implement` — both are small, mechanical edits:

- F1: find-and-replace "13" → "12" for the typed-endpoint count in spec.md (3 locations),
  plan.md (2), research.md (1), tasks.md (1).
- F2: insert a new task between T012 and T010 in tasks.md: regenerate and commit
  `_registry.generated.ts`/`_groups.generated.ts` via the gateway's tool-registry generator.

MEDIUM findings (F3, F4) are worth adding before implementation starts, not strictly blocking —
recommend folding them into Phase 5 (US3) since both are negative-control-shaped additions to the
same test suite that phase already builds.

Suggested commands: manually edit `spec.md`/`plan.md`/`research.md`/`tasks.md` for F1; manually
edit `tasks.md` to insert F2's task and the F3/F4 test tasks. Re-run `/speckit-analyze` after to
confirm the coverage table reaches 20/20 and the count references are consistent, before
`/speckit-implement` (which Constitution Principle V still gates on owner approval regardless).

## Offer Remediation

(Per this audit's brief: no implementation, commit, or edit is being made from this report in this
run. In a normal `/speckit-analyze` invocation this is the point where the agent would ask:
"Would you like me to suggest concrete remediation edits for F1 and F2?" — recorded here for
completeness of the workflow, not executed.)
