# Independent GSD plan review — initial 360 slices

Reviewed: 2026-09-09. Reviewer: `gsd_360_checker`. Scope: `09-01`, `09-02`, `11-01`, `13-01`. This is a **retrospective plan review**, not a pre-execution approval, implementation verification, production qualification or release authorization.

## Verdict

**ISSUES FOUND.** All four files pass the installed GSD structure parser. Their initial slice boundaries are generally sound, but the current files do not constitute executable coverage for all of phases 11 and 13. Native consumer verification is still an acceptance gate, and the Hub authorization task needs a real-query regression fixture before its persisted-assignment guarantee can be independently certified. The next wave must pass its own independent review before implementation starts.

There are five blocking gates and five warnings below. Two blockers concern phase-wide coverage, one concerns verification completeness, one concerns missing native behavior evidence and one concerns the retrospective process gap. They are **not five newly demonstrated source vulnerabilities**. Missing later plans do not invalidate useful completed work in the bounded first slices; they prevent phase-wide execution/completion approval.

The parent reported the first slices were implemented before this review. `09-02-SUMMARY.md:80` also explicitly records normalization to the GSD template after implementation. Do not retroactively label that sequence a passing pre-execution review.

## Method and evidence boundary

Read root `AGENTS.md`; all three project-local skill entrypoints; Minion engineering testing/review and change-safety references; Hub instructions; gateway dmux instructions; UI governance and the phase UI contract; `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `PROGRAM.md`, all four plans, the three CONTEXT files and available execution summaries.

Executed these read-only planning commands using the verified installation:

```bash
node /home/nikolas/.claude/get-shit-done/bin/gsd-tools.cjs init phase-op 9
node /home/nikolas/.claude/get-shit-done/bin/gsd-tools.cjs init phase-op 11
node /home/nikolas/.claude/get-shit-done/bin/gsd-tools.cjs init phase-op 13
node /home/nikolas/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure <PLAN.md>
node /home/nikolas/.claude/get-shit-done/bin/gsd-tools.cjs frontmatter get <PLAN.md> --field must_haves
```

The last two commands were run for each of the four plans. All `verify plan-structure` results were `valid: true`, no parser errors/warnings. Also parsed YAML with Python `yaml.safe_load` to check nested artifacts, key links, requirements and file counts. The installed GSD frontmatter getter reduced nested artifact/link objects to their first field in its output; the full YAML was therefore inspected separately. A parser pass alone is not evidence that links, authorization or runtime behavior work.

No application, provider call, exploit, production request or test suite was run by this reviewer. Execution counts in the summaries remain implementer evidence awaiting the appropriate independent verifier. This review changes only this document. No source, plan, requirement, branch, worktree, commit or deployment state was changed.

## Coverage and dependencies

| Phase requirement | Executable plan/task | Assessment |
|---|---|---|
| SEC-01 | 09-01 task 1 | Explicit service and route denial; stable error and no DB/body access checks |
| SEC-02 | 09-01 task 2 | Explicit current assignment, org and membership checks; real-query verification gap B3 |
| SEC-03 | 09-01 task 3 | Actual POST handler sentinel coverage plus PUT/DELETE and nearby token/storage checks |
| SEC-04 | 09-02 task 1 | Real SQLite negative writes/attachment/missing-file and positive consume/read fixtures |
| SEC-05 | 09-02 task 2, integration task 3 | Fixed SQL, validated bindings, rejection before gateway effects; rollout migration retained |
| AGT-01 | 11-01 task 1 | Snapshot mutation tests and callback/TypeBox compatibility are explicit |
| AGT-02 | 11-01 tasks 2–3 | Bounded caller wait and paid-test opt-in are explicit; not process termination |
| AGT-03–06 | None | B1: future slice names in PROGRAM are not executable plans |
| UI-01 | 13-01 task 1 | Native focus/close/save contract is specified; B4 remains pending |
| UI-02 | 13-01 task 2 | Localized HTML text and hostile-label tests are explicit |
| UI-03 | 13-01 task 3 | Token/design checks specified; exact commands and final review need W2 |
| UI-04–06 | None | B2: Home/Calendar, journey CI and chart/canvas work remain future charters |

All four plans declare `depends_on: []`, wave 1. There are no plan-level cycles, dangling references or overlapping source-file ownership in these four plans. Shared planning evidence still needs parent serialization. Phase 11 and phase 13 each depend on phase 9 in `ROADMAP.md:52,77`, yet their first slices ran while phase 9 was still implementing. These source slices are independently scoped, so do not invent a code dependency; explicitly distinguish permission to work on an independent slice from admission of the dependent phase as a whole (B5).

`PROJECT.md` points current v1.1 requirements to `REQUIREMENTS.md` and labels historical v1.0 evidence. No additional current requirement implied by these specific slices was found outside the mapped list. Old validated April facts are not authority for current database/auth implementation.

| Plan | Tasks | Listed files | Wave | Structural result | Goal-level result |
|---|---:|---:|---:|---|---|
| 09-01 | 4 | 11 | 1 | Pass | Revise verification, retain bounded containment scope |
| 09-02 | 3 | 6 | 1 | Pass | Sound slice design; durable replay warning W3 |
| 11-01 | 3 | 8 | 1 | Pass | Sound initial slice, not phase-wide coverage |
| 13-01 | 3 | 7 | 1 | Pass | Native verification and runnable fixture pending |

## Blocking gates

### B1 — Phase 11 is not fully planned

**Path:** `.planning/phases/11-agent-lifecycle/11-01-PLAN.md:17`; `.planning/ROADMAP.md:53`.

**Trigger:** dispatching `/gsd-execute-phase 11`, declaring the agent layer qualified, or advancing phase 14 because this single plan passes.

**Reason:** the only executable plan covers AGT-01/02. AGT-03/04/05/06 have no `requirements` coverage, files, tasks, dependency graph or runnable acceptance. PROGRAM's 11-02/03/04 descriptions retain the intended scope, so this is incomplete elaboration rather than silent deletion.

**Repair:** finalize 11-02/03/04 before phase-wide admission. Separate durable ownership/terminal reconciliation from ACP/restore and effect governance. Assign shared Shells files sequentially, pin the real harness/version, define how a permission response reaches the harness, and identify the independent no-paid-provider conformance fixture. Keep all four requirements unchecked until code and behavior verification pass.

### B2 — Phase 13 is not fully planned

**Path:** `.planning/phases/13-ui-qualification/13-01-PLAN.md:16`; `.planning/ROADMAP.md:78`.

**Trigger:** claiming mobile/desktop compatibility or passing phase 13 after the overlay/tooltip slice.

**Reason:** UI-04/05/06 have no executable plans. Component repairs cannot establish Home/Calendar operability, cross-browser release gates or accessible chart/canvas output.

**Repair:** finalize 13-02/03/04 with scheduling-file ownership, supported viewports/input modes/browser engines, credential-free seeded routes, CI jobs and motion/nonvisual behavior. Each criterion needs a behavior assertion, not just screenshot capture. Independent slices can proceed after their own reviews without claiming whole-phase completion.

### B3 — Persisted actor authorization needs a real-query fixture

**Path:** `.planning/phases/09-security-containment/09-01-PLAN.md:85–87,110`.

**Trigger:** accepting SEC-02 solely from mocked resolver branches and catalog inspection.

**Reason:** the plan's security guarantee depends on actual SQL predicates and the same persisted org/gateway/agent/member relationships being used. Branch mocks can return the expected rows even if a predicate is dropped, joins drift, or case/wildcard behavior differs. Catalog inspection establishes columns/indexes, not query authorization. The plan correctly says mocks do not certify live RLS, but does not require a substitute real-query regression fixture before completion.

**Repair:** add an ephemeral PostgreSQL-compatible fixture executing the actual authorization query path over synthetic gateway, personal-agent and membership rows. Required sequence: allow valid assignment; change/remove assignment and membership between requests; next request denies despite prior success. Include canonical/legacy ID ambiguity, literal wildcard characters in agent IDs, org mismatch and backend failure. Never use production rows or grant extra authority merely to make the fixture pass. Run the real application query builder; if PGlite is used, explicitly retain any PostgreSQL-only behavior as a separate gate. Existing unit branch tests remain valuable.

This is a **verification blocker**, not a claim that the implemented query is wrong or that immediate fail-closed containment should be reverted.

### B4 — Native overlay acceptance has no reproducible successful consumer fixture yet

**Path:** `.planning/phases/13-ui-qualification/13-01-PLAN.md:61,77`; `.planning/phases/13-ui-qualification/13-01-SUMMARY.md:33`.

**Trigger:** checking UI-01 or UI-03 complete from source-contract tests or Svelte compilation.

**Reason:** the verify fields name a native loopback fixture without its owned path/start/test command; the available summary says the attempted fixture failed to mount. Source assertions cannot prove native focus containment, return focus or callback behavior. Root is actively repairing a production-compiled fixture; its results can close this gate without changing the intended UI scope.

**Repair:** record the fixture's exact source/import identity, deterministic build/start/test commands and results. Mount the actual consumers and Dialog, not equivalent handmade markup. Exercise Escape from input, forward/reverse Tab, outside focus, every allowed close path, return to opener, pending-save dismissal/duplicate guards, rejected-save retry and successful-save callback semantics. Explicitly assert the UI-SPEC's no automatic dismissal after save and exactly one callback per close/save. Add the fixture or deterministic generator to a durable owned location so another run can reproduce it without a disappearing `/tmp` file.

### B5 — Establish the gate that was skipped before the next wave

**Path:** `.planning/operations/360/PROGRAM.md:28`; each initial `*-CONTEXT.md` decision to check plans before execution; `.planning/phases/09-security-containment/09-02-SUMMARY.md:80`.

**Trigger:** starting another implementation wave based on the retrospective parser pass, or presenting initial execution as pre-reviewed GSD work.

**Reason:** the initial sequencing contradicted the documented gate. The current review cannot undo that history. Phase dependencies also need explicit independent-slice exceptions rather than relying on empty within-phase `depends_on` lists.

**Repair:** record the initial emergency/retrospective exception once in PROGRAM/DECISIONS with actual chronology. Before every subsequent dispatch, require a plan hash, reviewer disposition, bounded file owner, resolved blockers, dependency admission and executable verification. A revised plan invalidates prior approval for changed scope. Keep `commit_docs:true` from the global GSD config overridden by the operation's no-commit instruction; no automatic commit/release follows this review. This needs no new user confirmation.

## Warnings and smallest repairs

### W1 — Security plan has a high context load

**Path:** `.planning/phases/09-security-containment/09-01-PLAN.md:9` and tasks 1–4.

Four tasks and eleven listed files exceed the target of 2–3 tasks/5–8 files, but stay below the blocking threshold. Each security behavior has a sensible seam. For future iterations, split actor-query verification from denial/logging, or explicitly reset context between those seams with pinned evidence. Do not rewrite already completed work merely to beautify the plan count.

### W2 — Verification commands and owned artifacts need tighter specification

**Paths:** `09-01-PLAN.md:104`; `09-02-PLAN.md:93–95`; `13-01-PLAN.md:61,69,77`.

Several fields say “record commands”, “native fixture” or “focused tests” instead of a runnable command and expected status. `files_modified` also omits some summary/evidence files explicitly owned by tasks. Add deterministic invocations, tool/version/cwd, output location and success condition; include all owned artifacts in frontmatter. Hub `check`, build and changed-file design ratchet remain acceptance evidence, not facts established by token lint or component compile. Respect shared-WIP boundaries when a broad check exposes unrelated failures; do not silently waive or fix them outside ownership.

### W3 — Cross-project SQL replay is only session evidence

**Paths:** `.planning/phases/09-security-containment/09-02-PLAN.md:93`; `.planning/phases/09-security-containment/09-02-SUMMARY.md:62`.

The plan requires a compiler-to-real-SQLite fixture, and the summary reports one. Its only identified artifact is `/tmp/minion-qc-2026-09-08/flow-sql-integration.mts`. Retain a deterministic fixture or generator and exact command in the durable program before treating this as repeatable regression protection. Keep the existing separate engine/compiler suites; do not substitute mocked SQLite. Saved-flow/editor migration remains an explicit deployment prerequisite, not a reason to reintroduce interpolation.

### W4 — Completed-requirement metadata outruns independent acceptance

**Path:** `.planning/phases/09-security-containment/09-02-SUMMARY.md:33–34`; `.planning/REQUIREMENTS.md:3`.

The summary lists `requirements-completed: [SEC-04, SEC-05]` before independent verification, while the requirement file and PROGRAM reserve completion for that gate. Use a source-verified/review-pending field until the verifier accepts the source and behavior. Continue recording deployment separately. A machine reading frontmatter must not disagree with the candid prose.

### W5 — Drone key links omit the actual admission path

**Path:** `.planning/phases/11-agent-lifecycle/11-01-PLAN.md:30–33`.

The only `key_links` entry is `run.ts -> types.ts`, a documentation/type connection. Tasks describe the real behavior clearly, but `must_haves` should also connect definition admission to execution and Vitest default/live configuration to discovery. Add those links plus named no-new-admission, late rejection and callback-preservation fixtures. This helps future edits preserve the essential distinction: bounded caller wait does not stop an uncooperative host's existing effect, and freezing copied metadata does not freeze callback closure state.

## Dimension results

| Dimension | Result | Rationale |
|---|---|---|
| 1. Requirement coverage | Fail for whole phases 11/13 | Seven phase requirements have no executable plan; phase 9 covers all five |
| 2. Task completeness | Parser pass; semantic gaps | All required XML fields exist; B3/B4/W2 constrain whether verification proves the truth |
| 3. Dependency correctness | Within-plan pass; admission gap | No cycles/missing refs; parent phase ordering and independent slices require B5 |
| 4. Key links planned | Mostly pass | Actual SQL/RPC and Dialog/formatter wiring specified; Drone links need W5 |
| 5. Scope sanity | Warning | 09-01 has 4 tasks/11 listed files; others bounded |
| 6. Verification derivation | Conditional | Observable truths generally strong; no-library-installation proxy; B3/B4 must be resolved |
| 7. Context compliance | Fail for chronology | No hidden framework or release expansion; independent pre-review decision was skipped |
| 7b. Scope reduction | No silent reduction found | Deferred restorations and later slices are explicit in PROGRAM; do not call those phases complete |
| 8. Nyquist compliance | SKIPPED | Enabled config, but no phase RESEARCH.md for 9, 11 or 13; therefore not applicable under checker rule |
| 9. Cross-plan data contracts | Pass within reviewed slices | Fixed SQL/positional params are preserved; no destructive transformation conflicts found |
| 10. AGENTS/standards | Conditional | Managers, Svelte5/native primitives, no commit/deploy and handoffs respected in intent; broad gates need W2 |
| 11. Research resolution | SKIPPED | No phase RESEARCH.md; central research exists but is not a substitute for a false Nyquist/research pass |

Do not report Nyquist as passing. The three `init phase-op` outputs each return `has_research:false` and `has_verification:false`. Before later phases use research-backed validation, provide their research/validation architecture and the required `*-VALIDATION.md`, including automated task commands and any Wave 0 fixtures.

## Acceptance guidance for the source verifier

This checker does not certify implementations. The verifier should use the following distinction when accepting the current work:

- **Hub containment:** actual handler/service denial can be checked without a production DB. Sentinels must cover response, console and analytics sinks while preserving auth/SSRF behavior. Persisted actor truth needs B3's synthetic real-query sequence; current-catalog facts alone are insufficient.
- **Flow SQL:** summary reports genuine SQLite mutations denied and compiler-to-handler binding behavior. Independently inspect/run the focused real-engine tests on the candidate. Distinguish read SQL from the explicitly retained consume write; do not claim the entire method is side-effect-free or newly tenant-authorized. Preserve migration and capability rollout gates.
- **Drone:** summary reports mutation, async-host and default-discovery tests. Verify callback/schema identity at actual admission and execution seams; external abort/timeout results must not admit later tools or leak unhandled late rejection. Paid tests must remain excluded with a credential present. Do not infer process isolation, killed effects, durable terminal delivery or full AGT03–06 from these tests.
- **UI:** formatter DOM assertions are useful. Native focus and callback semantics require B4's actual mounted consumers. The in-progress root fixture can provide this evidence; no browser rerun was started by this checker.

**Standards axis:** conditional, chiefly verification specificity and skipped sequencing. **Spec axis:** bounded initial designs substantially match their named requirements, but authorization/native verification remains incomplete and later phase coverage is absent. Neither axis authorizes release.

## Structured issues

```yaml
issues:
  - id: B1
    plan: null
    dimension: requirement_coverage
    severity: blocker
    description: "Phase 11 has no executable coverage for AGT-03, AGT-04, AGT-05, AGT-06."
    fix_hint: "Finalize and check 11-02/03/04 before whole-phase admission."
  - id: B2
    plan: null
    dimension: requirement_coverage
    severity: blocker
    description: "Phase 13 has no executable coverage for UI-04, UI-05, UI-06."
    fix_hint: "Finalize and check 13-02/03/04 before whole-phase admission."
  - id: B3
    plan: "09-01"
    task: 2
    dimension: verification_derivation
    severity: blocker
    description: "Persisted actor guarantee lacks a required real-query synthetic fixture."
    fix_hint: "Exercise actual authorization predicates, revocation between requests, literal identity and org/membership mismatch in an ephemeral DB."
  - id: B4
    plan: "13-01"
    task: 1
    dimension: task_completeness
    severity: blocker
    description: "Native focus/save/callback acceptance lacks a reproducible successful mounted-consumer fixture."
    fix_hint: "Record durable fixture command, candidate identity and actual native behavior before UI-01/03 acceptance."
  - id: B5
    plan: null
    dimension: context_compliance
    severity: blocker
    description: "Initial source work preceded the documented independent plan gate."
    fix_hint: "Record retrospective exception and enforce hash-bound reviewer/dependency/ownership admission before the next wave."
  - id: W1
    plan: "09-01"
    dimension: scope_sanity
    severity: warning
    description: "Four tasks and eleven listed files increase context load."
    fix_hint: "Separate later actor verification or record context handoff between independent security seams."
  - id: W2
    plan: "09-01,09-02,13-01"
    dimension: task_completeness
    severity: warning
    description: "Some verification fields are descriptions rather than commands; owned summary/evidence paths are omitted from frontmatter."
    fix_hint: "Specify exact cwd/tool/command/output/status and include all owned artifacts."
  - id: W3
    plan: "09-02"
    task: 3
    dimension: key_links_planned
    severity: warning
    description: "Compiler-to-real-SQLite replay is retained only as a temporary session script."
    fix_hint: "Retain a deterministic fixture or generator and exact invocation in durable scope."
  - id: W4
    plan: "09-02"
    dimension: context_compliance
    severity: warning
    description: "Summary completion metadata precedes independent acceptance."
    fix_hint: "Use source-verified/review-pending metadata until the verifier accepts the requirement."
  - id: W5
    plan: "11-01"
    dimension: key_links_planned
    severity: warning
    description: "must_haves links only runtime to types, omitting definition admission and test discovery links."
    fix_hint: "Add admission-to-execution and default/live-config-to-discovery key links."
```

Return these findings to the parent/planner. Review revisions against the changed plan hashes before granting the next implementation wave. Continue independent research and already authorized verification while the plan fixes are made.
