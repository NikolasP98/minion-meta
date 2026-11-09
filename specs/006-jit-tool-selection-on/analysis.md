# Specification Analysis Report: Safe default-on JIT tool selection for hub personal agents

Artifacts analyzed: `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`,
`contracts/*.md`, `quickstart.md`, `.specify/memory/constitution.md`. Read-only — no files
modified by this pass, per `speckit-analyze`'s operating constraint.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Inconsistency / Underspecification | **CRITICAL** | spec.md Edge Cases ("envelope appears mid-message"); research.md Decision 1; tasks.md T002, T005 | The regex both research.md and tasks.md T005 specify is `^\s*\[In-app assistant context[\s\S]*?Don't restate this context\.\]\s*` — anchored with `^`. A `^`-anchored pattern, even with a global (`g`) flag and no multiline flag, matches **only at index 0 of the whole string**, never mid-string. T002's test ("strips the block when it appears mid-string, not only as a prefix") and T005's own instruction ("applied globally… so a mid-message occurrence is also removed") cannot both be true of the literal pattern given — this is a self-contradiction between the task's stated goal and its stated implementation, and if implemented exactly as written, T002's mid-message case fails, i.e. the spec's own Edge Case is unmet. | Drop the `^` anchor (and the trailing `\s*` trim can stay) for the ranking-strip use: `/\[In-app assistant context[\s\S]*?Don't restate this context\.\]/g`, trimming the result afterward. Update research.md Decision 1 and tasks.md T005 together; re-verify T002 against the corrected pattern before implementation starts. |
| H1 | Underspecification | HIGH | tasks.md T012, T014, T016, T017 | All four tasks describe their target call site in prose ("the call site that constructs `createSearchToolsTool()`… wherever the tool array is assembled", "Update call sites in… `search-tools-tool.ts`… and `load-tools-tool.ts`") instead of a concrete file path, violating the tasks template's own hard rule ("WRONG: … missing file path"). The actual mechanism exists and was not found during planning: `src/agents/minion-tools.ts`'s `buildToolOptions(id, ctx)` function (a per-tool-id `switch`) is what builds each factory's options — e.g. `case "load_tools": return { sessionKey: opts?.agentSessionKey };` and `case "search_tools": return undefined; // no options needed` (confirmed by reading the file; `search-tools-tool.meta.ts`/`load-tools-tool.meta.ts` declare `factory` names but no `contextKeys` for `agentId`/`mode` today). Threading `agentId` (User Story 2) into both and `mode` (User Story 4) into `search_tools` means editing these two `switch` cases in `minion-tools.ts`, not "wherever the tool array is assembled." | Rewrite T012 and T017 (and reference it from T014/T016) to name `src/agents/minion-tools.ts`, function `buildToolOptions`, cases `"search_tools"` and `"load_tools"`, plus the corresponding `contextKeys` entries the meta files (`search-tools-tool.meta.ts`, `load-tools-tool.meta.ts`) may need to add so `ctx.agentId` and the resolved `mode` are available to `buildToolOptions` for those ids. |
| H2 | Coverage Gap | HIGH | spec.md FR-007, FR-008; tasks.md (no matching task) | FR-007 ("alwaysOn set and session-loaded tools MUST remain active in every mode, unchanged") and FR-008 ("L1 permission gating… MUST NOT change behavior") have zero dedicated task or test. They are implicitly protected only by *not touching* the relevant code paths — true today, but nothing pins it, so a future edit to `apply-selection.ts` (e.g. during Slice 5's rebase) could silently regress either without a failing test. | Add a task in Phase 3 or Phase 7 asserting `alwaysOn` ids (`message`, `search_tools`, `load_tools`) and a seeded session-loaded id are present in `applyJitToolGate`'s output across all three modes (`off`/`shadow`/`on`), and that a permission-carrying tool the caps snapshot disallows is absent in all three modes — regression pins for FR-007/FR-008, not new behavior. |
| M1 | Terminology Drift | MEDIUM | plan.md "Slice table" (Slice 1-5) vs tasks.md "Phase" numbers (Phase 3-7) | The two numbering schemes don't correspond 1:1: plan.md's Slice 3 = FR-006/US4 (tasks.md Phase 6), plan.md's Slice 4 = FR-005/US3 (tasks.md Phase 5) — plan.md orders by file-dependency clustering, tasks.md orders by spec.md's P1/P2/P2/P3/P1 priority. tasks.md already carries one inline disambiguation note (Phase 5's checkpoint: "numbered 4 in plan.md's slice table"), but Phase 6 has no equivalent note. | Either rename plan.md's slices to match tasks.md's Phase/US numbers (recommended — tasks.md is the execution artifact), or add the same disambiguating note to Phase 6's checkpoint that Phase 5 already has. |
| M2 | Coverage Gap | MEDIUM | spec.md SC-001; tasks.md T004 | SC-001 requires measurement "across a fixture set covering the hub's tool catalog, with no systematic gap by category" (bookings, tickets, stock, etc.). T004 only names one representative case ("a concrete hub-ask wrapped in the real envelope format") — there is no task that builds or asserts over a category-spanning fixture set, so SC-001 as measurably stated is not actually covered by any task. | Either add an explicit fixture-set task (one row per hub tool category) under Phase 3, or narrow SC-001's wording to match what T004 actually tests — pick one; right now the two disagree. |
| L1 | Constitution Alignment (self-flagged, formalizing) | LOW | plan.md Constitution Check, Principle II row | plan.md already discloses that spec.md's evidence lives in prose/Assumptions/Clarifications rather than under literal `AS-IS`/`TO-BE`/`DELTA` headings the Minion constitution's Principle II names, and argues content-equivalence. Legitimate, disclosed gap, not hidden — recorded here only to appear in the formal analysis table. | No action required beyond what plan.md already recommends (a template change, tracked in `sdd-notes.md` Section 6) — not a blocker for `/speckit-implement`. |

No duplication, ambiguous-adjective, or unresolved-placeholder findings beyond the above — the
spec's success criteria are already numeric/observable, and no `TODO`/`TKTK`/`???` placeholders
remain in any artifact.

## Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Yes (with defect) | T002, T005, T007 | See C1 — implementation as specified does not satisfy its own mid-message test |
| FR-002 | Yes | T003, T006, T008 | |
| FR-003 | Yes | T009, T010, T011 | |
| FR-004 | Yes | T009, T011, T012 | T012's file path is underspecified — see H1 |
| FR-005 | Yes | T013, T014 | T014's file path for the agentId-keyed lookup depends on H1's fix |
| FR-006 | Yes | T015, T016, T017 | T017's file path is underspecified — see H1 |
| FR-007 | No | (none) | Gap — see H2 |
| FR-008 | No | (none) | Gap — see H2 |
| FR-009 | Yes | T018, T019, T020, T021, T022 | |
| SC-001 | Partial | T004 | Fixture-set breadth not covered — see M2 |
| SC-002 | Yes | T004, T008 | |
| SC-003 | Yes | T013 | |
| SC-004 | Yes | T009 | |
| SC-005 | Yes | T015 | |
| SC-006 | Yes | T022 | Manual, not automated — matches spec Clarification Q2's assumption |

## Constitution Alignment Issues

Principle II (AS-IS to TO-BE to DELTA with evidence): disclosed format gap, not a violation of
content — see L1. No MUST-principle violation found elsewhere; Principle V's human-gate
requirement (owner approval + owner merge for Slice 2 and Slice 5) is already named explicitly
in plan.md's Constitution Check and inherited by tasks.md Phase 7's gate note — consistent
across both artifacts.

## Unmapped Tasks

None. Every task (T001-T024) traces to a Setup/Polish concern or to a specific FR/SC above.

## Metrics

- Total Functional Requirements: 9 (FR-001-FR-009)
- Total Success Criteria (buildable, included in coverage): 6 (SC-001-SC-006)
- Total Tasks: 24 (T001-T024)
- Requirement coverage: 7/9 FR fully covered, 2/9 gapped (FR-007, FR-008) = 78%
- Success-criteria coverage: 5/6 fully, 1/6 partial (SC-001) = 83% full / 100% at-least-partial
- Ambiguity count: 0
- Duplication count: 0
- Critical issues count: 1 (C1)
- High issues count: 2 (H1, H2)
- Medium issues count: 2 (M1, M2)
- Low issues count: 1 (L1)

## Next Actions

CRITICAL (C1) must be resolved before `/speckit-implement`: fix the strip-regex design in
research.md Decision 1 and tasks.md T005 (drop the `^` anchor for the ranking-strip use) so
T002's own mid-message test is actually satisfiable. This is a one-line fix to two documents.

HIGH issues (H1, H2) should be resolved before implementation starts on the affected phases:
H1 blocks Phases 4 and 6 (User Stories 2 and 4) from having an accurate task description; H2 is
a missing regression-test task for Phase 3/7 that should exist before Slice 5's default flip is
trusted.

MEDIUM/LOW (M1, M2, L1) do not block implementation; address opportunistically.

Suggested next commands: manually edit `research.md` + `tasks.md` for C1; manually edit
`tasks.md` T012/T014/T016/T017 for H1 (citing `minion-tools.ts`'s `buildToolOptions`); manually
edit `tasks.md` to add an FR-007/FR-008 regression task for H2. `/speckit-analyze` itself made no
edits, per its own read-only contract, and there is no live user in this session to approve
applying them, so they are left as findings for the next session or the owner to apply.

## Remediation Offer

Per `speckit-analyze`'s protocol: "Would you like me to suggest concrete remediation edits for the
top N issues?" — no live user to ask in this audit run; the concrete edits are already specified
in each finding's Recommendation column above, ready to apply on request.
