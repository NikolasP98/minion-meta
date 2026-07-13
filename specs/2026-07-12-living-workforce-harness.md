# Living Workforce Harness — Governed Stage-Task Delivery

**Date:** 2026-07-12  
**Status:** Normative implementation contract. The governed pipeline and user-scoped HITL path were production-verified by disposable GitHub issue #56; the registry-only evaluator Drone bridge was deployed immediately afterward with focused integration coverage. Deterministic merge execution remains intentionally absent.
**Repos:** `paperclip-minion/`, `minion/`, `minion_hub/`, meta `packages/workforce-client/`

## 1. Purpose and supersession

This addendum records the implemented Workforce/Projects architecture for the **MINION Code** portfolio. It supersedes the single `bug-fixer` flow in `2026-07-10-bug-triage-workforce-agents.md` and the inline `executionPolicy` pipeline compilation in §§2.1–2.9 of `2026-07-11-universal-projects-module.md` for new portfolio delivery runs. Legacy inline issues remain supported and keep their existing PATCH contract.

The design has four non-negotiable properties:

1. The GitHub issue is the external source record; its root Paperclip issue is the durable orchestration parent task.
2. Every pipeline stage and retry attempt is a distinct Paperclip child issue with its own assignee, status, heartbeat runs, evidence, and immutable trace events.
3. Models propose classifications, plans, code, scores, and readiness; deterministic services own routing, task creation, retry edges, state transitions, and any eventual merge.
4. Harness learning can propose guidance changes from attributed evidence, but only a human may approve, promote, reject, or roll back a revision.

## 2. Portfolio and task model

The idempotent seed creates the **MINION Code** portfolio, repository groups, concern-level projects, one shared delivery pipeline, and its role-specific agents. Project grouping is explicit metadata, not name or URL inference:

- `metadata.repositoryKey` identifies the repository presentation group.
- `metadata.groupKey` identifies the owning module or concern.
- Missing metadata is rendered under a stable `Ungrouped` group.
- Native Hub projects and tasks remain readable when Paperclip is unavailable. Only Paperclip-backed agents, traces, and mutations are disabled or visually muted.

The seed includes Portfolio Intake plus concern projects for Minion Hub, gateway, site, Paperclip, plugins, Pixel Agents, and the meta repository. Intake is the deterministic fallback for unsupported, ambiguous, or low-confidence classifications.

## 3. End-to-end state machine

```text
signed GitHub issues webhook
  -> root Paperclip orchestration issue in Portfolio Intake
  -> classifier pipeline child + attributed Minion Drone heartbeat
  -> deterministic label/scope validation and project routing
  -> frozen MINION Code Delivery run
       Plan (agent work task)
       -> Plan approval (specific-user or role-targeted human task; fail retries Plan)
       -> exact-revision accepted-plan decomposition into durable subtasks
       -> Implement (agent work task; receives the exact accepted revision identity, objective, and decomposition)
       -> Evaluate (typed Minion Drone score task; score < frozenMinimum retries Implement; seed minimum = 7/10)
       -> Release approval (specific-user or role-targeted human task; freezes typed PR evidence; fail retries Implement)
       -> Merge readiness (read-only agent task; records `mergeExecuted=false`)
  -> deterministic merge executor [not implemented in this slice]
```

Each stage materializes exactly once per `(run, step, attempt)` using `originKind=pipeline_step`, the pipeline run ID as `originId`, and a stable step/attempt fingerprint. A `stage-terminal:<childIssueId>` event is claimed under the run lock before the graph advances. The run snapshot freezes the pipeline steps, participants, score contract, retry edges, routing evidence, and classifier input; edits to authoring rows never rewrite an in-flight run. Planner output is stored as a versioned plan document. A Plan gate approves that exact document revision, after which deterministic decomposition creates the planned child tasks exactly once. The accepted revision ID, objective, and ordered materialized subtask summaries are then handed to the Implement stage as durable execution context; the full accepted revision remains the evaluator's immutable specification input. The implementer does not reconstruct or silently replace the approved plan from comments. A later plan revision therefore requires a new approval and cannot inherit acceptance of an older artifact.

Statuses use Paperclip’s standard vocabulary: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, and `cancelled`. A failed gate is still a terminal child task (`done` plus typed `pipelineOutcome=failed`) whose retry edge immediately creates and wakes a new work attempt. The seeded Plan and Implement retry paths allow three total work attempts; exhaustion blocks both the delivery run and its root Paperclip issue with an immutable reason. Blocked and cancelled children cannot be submitted as stale approvals. Release approval accepts exactly one primary GitHub `pull_request` work product with explicit head/base refs and SHAs plus non-empty typed checks, and freezes that evidence in the terminal gate event. Missing or ambiguous evidence blocks readiness instead of falling back to URLs or comments. Successful Merge readiness completes the orchestration run and marks the root Paperclip issue `done`; it explicitly records `mergeExecuted=false`, leaves the PR unchanged, and performs no GitHub or git merge/push side effect.

## 4. Runtime and model routing

Runtime selection follows the shape and authority of the job, not a single preferred vendor.

| Role | Runtime | Current model policy | Why |
|---|---|---|---|
| Issue classifier | Minion Drone `portfolio-issue-classifier-v1` | `anthropic/claude-haiku-4-5`, fallback `openrouter/google/gemini-2.5-flash`; 1,500 output tokens, 30s | Cheap, fast, typed taxonomy output with no tools or side effects. The caller cannot replace its prompt, model, tools, or schema. |
| Spec planner | Minion Drone `portfolio-spec-planner-v1` | `anthropic/claude-opus-4-7`, fallback `openai/gpt-5.4`; 6,000 output tokens, 120s | Planning needs high reasoning quality but no repository writes. The Drone emits a bounded plan that deterministic code materializes. |
| Implementer | OpenCode local | `github-copilot/claude-sonnet-5` | Default repository-writing runtime: isolated worktree, shell/tests, draft PR workflow, and a strong cost/quality balance. |
| Evaluator | Minion Drone `portfolio-implementation-evaluator-v1` | `openai/gpt-5.4`, fallback `anthropic/claude-opus-4-7`; provider/model is attributed on every heartbeat | Independent, read-only typed inspection and rubric scoring. Deterministic traversal, not the Drone, compares the score with the frozen minimum and selects the retry edge. Keeping a different execution contract from the implementer reduces correlated blind spots. |
| Merge-readiness reviewer | Minion Drone `portfolio-merge-readiness-v1` | `anthropic/claude-haiku-4-5`, fallback `openrouter/google/gemini-2.5-flash`; 1,500 output tokens, 30s | Cheap typed validation over immutable SHA, approval, and check evidence. It cannot push or merge. |
| Portfolio monitor | OpenCode local fallback | `github-copilot/gpt-5.4-mini` | Bounded read-only monitoring until an allowlisted monitor Drone exists. It may propose deduplicated remediation work, not execute it. |
| Learning reviewer | Hermes local | Operator-probed model only; otherwise paused | Hermes curates evidence-backed role-guidance proposals and reusable memory/skills. It never self-promotes a harness revision. |

Use **Minion Drone** when the task has a small typed input/output contract, no tool-mediated filesystem or external-service side effects, and benefits from a fixed cheap/high-end model policy. Model inference may still use its configured provider transport. The evaluator follows this rule: it emits a bounded rubric breakdown, overall score, findings, required changes, summary, and recommendation, but it cannot advance the run itself. Deterministic traversal validates that result against the frozen rubric and derives the maximum/outcome. Use **OpenCode** for the default autonomous coding stage because it needs repository tools and provider portability. Use **Codex** for exceptional independent high-reasoning review or for coding only when Codex-specific tooling is materially useful; do not make it both implementer and evaluator on the same run. Use **Claude Code** instead of OpenCode for exceptional repository work that specifically needs its plugin/hook/subagent ecosystem or extended interactive investigation; it is not the default stage runtime. Use **Hermes** only for longitudinal learning curation after a model probe, never for normal task execution or approval authority.

Runtime readiness is verified by live probe. Model aliases that are not present in the installed transport catalog are not silently substituted.

## 5. Classifier attribution and recovery

Webhook ingestion never calls a classifier adapter synchronously. It creates a synthetic one-step classifier run/task, assigns the seeded classifier agent, and queues a normal Paperclip heartbeat carrying fixed `paperclipDrone.input`. The terminal heartbeat is part of the immutable trace and records the actual harness revision, provider/model, input, output, and routing decision.

The finalizer accepts only the seeded company agent configured for the fixed classifier Drone ID. It strictly validates the output taxonomy, applies only local Paperclip labels/scopes, and routes only among the frozen candidates. A valid classification that is ambiguous, unsupported, or below the confidence floor deterministically routes to Portfolio Intake. Malformed output, an unknown project key, the wrong Drone ID, or a failed terminal heartbeat blocks the classifier run instead of being treated as an Intake decision. Periodic/startup reconciliation repairs these durable handoff seams:

- classifier task committed without an active heartbeat;
- successful classifier heartbeat committed before finalization;
- delivery run committed without its Plan wake;
- webhook replay after any of the above.

Reconciliation is idempotent and must not churn `updatedAt` when no repair is needed.

## 6. Living harness governance

Every agent execution is pinned to an immutable harness revision. A revision contains bounded role guidance, observed runtime configuration, model/tool/skill policy, learning thresholds, and a performance snapshot. Claude, Codex, and OpenCode adapters receive the selected revision ID and that revision’s role-specific guidance section. An already-running heartbeat remains attributed to the revision it started with. On the next execution, a task session whose pinned revision differs from the agent’s current revision is discarded and recreated, preventing promoted guidance from inheriting stale conversational state.

Evaluator scores and human gate input are attributed to the worker that produced the artifact under review:

- Plan approval feeds the latest Plan worker.
- Evaluation feeds the latest Implement worker, never the evaluator.
- Release approval feeds the latest Implement worker.
- Evaluations persist score and the frozen maximum; human gates accept an optional 0–10 quality score plus a required summary.

Evaluator input is pinned to the accepted plan revision, the current Implement attempt, and the primary PR work product with its frozen head/base SHAs and typed checks. The Minion Drone evaluator returns a schema-validated rubric breakdown, overall score, findings, required changes, summary, and retry recommendation. Deterministic traversal validates the rubric coverage and aggregate score, derives the pass/fail outcome from the frozen minimum, owns any retry to Implement, and enforces the attempt limit; the evaluator cannot select an arbitrary task, edit the accepted plan, or advance the run directly. Release evidence may classify a failing repository check as `known_base_only` only when equivalent evidence shows it also fails on the frozen base revision and the human Release gate explicitly accepts that classification. The failure stays visible and is not rewritten as a passing check; a head-only regression, missing comparison evidence, malformed evaluator result, or score below the frozen minimum blocks progression.

The signal key is deterministic, bounded, and replay-safe. The signal points to the worker, child issue, heartbeat run, and harness revision when that evidence exists. Low scores, failures, or requested changes create only a `review_needed` placeholder. They do not invent new instructions.

A board user or the separate learning-reviewer/Hermes agent may turn an attributed signal into a strict `replace_role_guidance` proposal against a base revision. They may also propose an `active_capabilities` selection that narrows the active tools and skills to canonical subsets of that revision's immutable, operator-approved catalog. Workers cannot propose changes to themselves. Only a board user can approve, reject, promote, or roll back. Promotion uses row locks and a compare-and-swap current-revision pointer; stale-base proposals become superseded. Rollback creates another immutable revision rather than rewriting history. Reconciliation preserves a valid active selection and safely narrows it if the approved catalog shrinks. The selected capabilities are included in compact execution context and adapter prompts, but adapter tool policy remains the enforcement boundary: this mechanism cannot add a tool or skill outside the catalog, grant permissions, expose credentials, or change the runtime/model. Workers and reviewers are explicitly told that active selection is policy context, not authority.

## 7. Human gates, Inbox, and Hub degradation

Human stages freeze exactly one actor target in the run snapshot: either a specific Hub user or a non-empty set of Hub role keys. An authenticated board member with Hub `projects` edit permission may operate a specific-user gate only when the signed actor ID matches the frozen `participantUserId` and child assignment. They may operate a role gate only when at least one role in their bounded, signed Hub identity claim intersects the frozen participant roles. Paperclip enforces this authorization before accepting a terminal update; client-side filtering is defense in depth, not the authority. Agents, service identities, arbitrary request headers, and role values supplied in a body or query cannot exercise human authority.

Every currently actionable human child appears on `/workforce/inbox` for its eligible actor. The Inbox returns only the exact current child of an active run, with stage kind `eval` or `approval` and status `todo`, `in_progress`, or `in_review`. It excludes stale attempts, terminal children, agent work stages, and gates addressed to another user or disjoint role set. A specific-user item is visible only to that user; a role item is visible to every currently eligible role member until the first authorized terminal decision wins under the orchestration lock. Once decided, superseded, blocked, or cancelled, it disappears from Inbox but remains on the project board and trace timeline. The assigned actor sees explicit **Approve** and **Request changes** controls. Both require a decision summary. Evaluation gates require a score within the frozen rubric and enforce the minimum. Approval gates may include an optional 0–10 quality score.

Legacy inline issues retain their shipped mutation contract: approval sends `status=done` plus a required `comment`; requesting changes sends `status=in_progress` plus a required `comment`; either may include `feedbackScore` from 0–10. Stage-task gates instead send terminal `status=done`, typed `pipelineOutcome`, required `pipelineSummary`, and the appropriate score field.

When the Workforce backend is unavailable:

- Hub-native projects and tasks still render and remain navigable.
- Agent roster, live traces, and Paperclip mutations are disabled and visually muted.
- The UI shows backend availability at the action boundary instead of replacing the entire Projects module with a 502 page.

On the local development workstation, the Workforce SSH-tunnel/backend unit is ordered after, requires, and is `PartOf=minion-gateway.service`, with automatic restart. Starting it starts/requires the gateway; stopping or restarting the gateway intentionally propagates to Workforce. Production VPS lifecycle remains Docker-managed. This removes manual local revival while preserving graceful Hub degradation during an actual outage.

## 8. Security and authority boundaries

- GitHub webhook signatures and repository identity remain authoritative; issue content is untrusted data.
- Drone execution is registry-only, schema-validated, tool-free, side-effect-free, bounded by tokens/time, and probed before use.
- Agents do not choose project IDs, retry targets, task fingerprints, or final state transitions.
- Implementers may write only inside isolated workspaces and may open draft PRs; they do not merge or push default branches.
- Evaluators and readiness reviewers are read-only.
- Merge readiness is an advisory typed result. Any future merge executor must independently recheck the approved head SHA, approvals, checks, and target branch immediately before mutation.
- Harness proposals reject secret-like guidance and cannot change authority-bearing configuration. Capability proposals can only reduce an operator-approved tool/skill catalog and cannot expand adapter permissions.
- Role-targeted Inbox reads and gate decisions use short-lived Hub-signed identity tokens containing canonical bounded role keys. Role changes alter the token cache key; missing or malformed role claims fail closed. A role datastore error or missing membership signs no role authority; a valid legacy membership may still map its stored legacy role. Legacy tokens without roles authorize no role-scoped gates.
- Every repository-routed project must have a primary workspace and an isolated `git_worktree` execution policy rooted in a container-visible clone before an implementation stage can wake.

## 9. Verification and deployment gate

The disposable production trace in §10 executed this gate. Repeat it for future promotions that change the pipeline, adapters, authority boundary, or merge-readiness evidence contract:

1. Run focused Paperclip tests for stage traversal, classifier attribution/reconciliation, governance routes/services, session revision pinning, adapters, seed, MCP decomposition, and authz.
2. Run Paperclip package/server typechecks and migration validation for `0110_project_metadata.sql` and `0111_harness_guidance_governance.sql`.
3. Run Hub Inbox/gate/grouping/trace/proxy tests, including exact-user and intersecting/non-intersecting role cases, Svelte check with required public env, and a production build.
4. Probe the classifier, planner, and merge-readiness Drone definitions on the target gateway. Each must report `ready=true` with one resolved model; a healthy fallback satisfies readiness when the primary is unavailable. Paused Hermes does not block delivery deployment.
5. Apply the idempotent MINION Code seed, reconcile a primary isolated worktree workspace for every repository project, and configure `GITHUB_BUGS_STAGE_TASKS_PIPELINE_ID`, `GITHUB_BUGS_INTAKE_PROJECT_ID`, `GITHUB_BUGS_AGENT_ID`, `GITHUB_BUGS_CLASSIFIER_AGENT_ID`, and the generated route JSON.
6. Create one real disposable GitHub bug and trace every parent/child task, heartbeat, score, retry/gate event, and draft PR through Merge readiness. Do not run a merge executor.
7. Close the disposable PR/issue as appropriate, delete its remote branch, and archive or mark its Paperclip records retired without deleting task, run, signal, or trace evidence.
8. Only after that trace passes: record the source and target SHAs, fetch each repository, run checks that cover every commit being promoted, and fast-forward the production branch only when it is an ancestor of the checked development tip. Stop for reconciliation if a fast-forward is impossible. Then verify service/Vercel health.

## 10. Production evidence — disposable GitHub issue #56

The replacement E2E used real `NikolasP98/minion_hub` GitHub issue #56 as a disposable bug report and completed the governed delivery run without executing a merge:

1. The webhook created the root Paperclip task, classified and routed it into the MINION Code portfolio, and materialized the frozen shared delivery pipeline.
2. Plan approval appeared in `/workforce/inbox` only for the configured specific Hub user. Approval froze the exact planner document revision, materialized its decomposition, and handed that accepted plan to the Implement stage.
3. The implementation path exercised retry handling before OpenCode completed the accepted scope with its Sonnet 5 policy in an isolated `minion_hub` worktree. It pushed only the issue branch, opened implementation PR `NikolasP98/minion_hub#61`, and recorded the PR as the primary typed work product rather than treating a URL or comment as evidence.
4. Because the registry-only evaluator bridge was not yet present in the deployed Workforce image, this disposable run used the explicitly configured OpenCode/OpenRouter GPT-5.4 evaluator fallback. It inspected the frozen implementation evidence and returned a typed **9/10** result, above the frozen **7/10** threshold. The release evidence retained the retry history and classified failures reproduced only on the frozen base revision as known base-only evidence; it did not misreport those checks as green or as head regressions.
5. Release approval appeared only for the same configured user and froze the reviewed PR revision and checks. The final registry-only Minion Drone readiness task returned a typed successful readiness result with `mergeExecuted:false`.
6. Deterministic traversal completed the Paperclip run and root orchestration task. No merge executor ran, PR #61 was never merged, and no default branch was pushed by the pipeline.
7. End-of-test cleanup closed GitHub issue #56 and all disposable PRs, including #61, without merging them; deleted their disposable remote branches; and closed or hid the internal test issues/tasks from normal board views. Durable run events, decisions, scores, attempts, and work-product evidence remain available for audit rather than being deleted.

This trace validates user-scoped Plan and Release HITL, accepted-plan handoff, OpenCode implementation, typed evaluator scoring and retry semantics, immutable release evidence, Minion Drone advisory merge readiness, and cleanup behavior. It does **not** claim that issue #56 itself exercised the subsequently deployed evaluator Drone bridge, and it does **not** validate or authorize automatic merge execution.

After the disposable trace completed, Workforce commits `dbe9eb391`, `a53580ada`, and `4d8111af5` were fast-forwarded through `dev` to `main` and deployed as `ghcr.io/nikolasp98/minion-workforce:sha-4d8111a` (manifest digest `sha256:742bff4772eda65c7057211fc843ee7534cc30132cf747074609e128a154d380`). The evaluator was restored from its temporary fallback to `minion_drone:portfolio-implementation-evaluator-v1`. Focused embedded-Postgres coverage proves the post-trace bridge validates the frozen rubric and weighted score, requires threshold-consistent recommendations, emits one attributed `pipeline_evaluation` learning signal, and replay-reconciles one marked feedback block plus one idempotent downstream wake. This closes the living-harness/crash-window gaps found during the trace without retroactively changing its evidence.

## 11. Known residuals

The GitHub root-issue create path still lacks a partial unique index for its existing race window; classifier reconciliation currently scans frozen snapshots and may need an indexed discriminator at larger scale; wake deduplication relies on Paperclip’s execution lock/coalescing rather than a database-unique idempotency key; deterministic merge execution is intentionally absent.
