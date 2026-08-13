---
id: 2026-07-11-universal-projects-module
title: Universal Projects Module — Portfolio → Project → Pipeline
stage: spec
status: shipped
pass: 1
created: 2026-07-11
updated: 2026-08-13
repos: [minion-meta]
---

# Universal Projects Module — Portfolio → Project → Pipeline

**Date:** 2026-07-11 · **Status:** SPEC + PLAN (approved for implementation by sonnet5 agents)
**Repos touched:** `paperclip-minion/` (branch `minion-integration`, remote = fork `NikolasP98/paperclip`), `minion_hub/` (branch `dev`), meta-repo `packages/workforce-client/`.

---

## 0. One-paragraph summary

Generalize the bug-triage pipeline (shipped 2026-07-11, see §1.3) into a **universal, replicable workflow model**: a **Portfolio** (charter: objective, guardrails, vision) groups **Projects** (sectioned "black boxes" of a codebase or domain, each with its own workspace), each project owns one or more **Pipelines** (ordered steps rendered as kanban columns, each step owned by a specific agent or user, with **eval/scoring gates** so agents can't push underworked output), and the whole thing is scriptable through a **Projects SDK** (REST + typed client + MCP agent tools). The execution engine is **not rebuilt**: pipelines are *authoring sugar that compiles down to paperclip's existing primitives* — `assigneeAgentId` + `executionPolicy.stages[]` + wakeups + the decision ledger.

## 1. Ground truth (verified in code — do not re-derive)

### 1.1 Paperclip primitives that already exist (assemble, don't build)

| Primitive | Where | What it gives us |
|---|---|---|
| Issue stage machine | `server/src/services/issue-execution-policy.ts` (`applyIssueExecutionPolicyTransition` ~:1050, stage core `applyIssueExecutionStageTransition` :612) | Linear cursor through `executionPolicy.stages[]`; stage types `review`/`approval` (`shared/constants.ts:357`); participants agent OR user (user stage = HITL gate); assignee's `done` request pushes into first pending stage; participant's `done`+comment = `approved` decision → next stage; any other status+comment = `changes_requested` → bounce to `returnAssignee`. Comment and status MUST be in the same PATCH. |
| Decision ledger | `issue_execution_decisions` table | Append-only per-stage record: stageType, outcome `approved/changes_requested`, actor, body. |
| Auto-wake | `routes/issues.ts` PATCH handler :5604-5671 (`buildExecutionStageWakeup` :899) | Stage advance wakes next participant (`wakeRole` reviewer/approver); reassignment wakes new assignee; comment wakes assignee. |
| Issue statuses | `ISSUE_STATUSES` `shared/constants.ts:177` — `backlog,todo,in_progress,in_review,done,blocked,cancelled` | **Global + fixed** (partial unique indexes hardcode literals — do NOT attempt per-project custom statuses). Kanban columns derive from status × stage cursor. |
| Projects | `packages/db/src/schema/projects.ts` | `goalId`, `leadAgentId`, `env`, `executionWorkspacePolicy`, status `backlog/planned/in_progress/completed/cancelled`. |
| Project workspaces / worktrees | `project_workspaces`, `execution_workspaces`, `server/src/services/workspace-runtime.ts` | Per-issue `git_worktree` off a repo clone; `workspaceStrategy.repoRoot` honored (commit `b8549e235`). Issues inherit the project's primary workspace. |
| Goals | `packages/db/src/schema/goals.ts` | Hierarchical objectives (`level` company/team/agent/task, `parentId`, `ownerAgentId`); `projects.goalId` + `project_goals` m2m. |
| Routines | `packages/db/src/schema/routines.ts` | Cron/webhook triggers (`routine_triggers`), `routine_runs.linkedIssueId`, scoped to `projectId`/`goalId`/`assigneeAgentId` → the **heartbeat/monitor** primitive. |
| Per-agent runtimes | `agents` table: `adapter_type`, `adapter_config`, `runtime_config`, `default_environment_id`, `active_adapter_index` | 10 adapters (claude-local, codex, cursor, pi, grok-local, openclaw-gateway…). Execution targets `local | ssh | sandbox` (`packages/adapter-utils/src/execution-target.ts` — transports at :40,:49). **exe.dev = SSH target or sandbox provider behind `default_environment_id`** (environment driver + leases; paperclip-bridge injects `PAPERCLIP_API_URL/KEY` into remote env). Per-issue override exists: `issues.assigneeAdapterOverrides {adapterConfig, useProjectWorkspace}`. |
| Origin/idempotency | `issues.originKind/originId/originFingerprint` | Webhook dedupe (`github_issue` = `owner/repo#N`). |
| Labels | `issue_labels` | Trigger-matching vocabulary (bug / feature / remediation). |
| MCP agent tools | `packages/mcp-server/src/tools.ts` (`paperclipListIssues` :266, `paperclipListProjects` :345, `paperclipListGoals` :409, approvals :421+, etc.) | The agent-facing SDK surface to extend. |
| Bug ingestion | `server/src/routes/github-bugs.ts` | HMAC webhook → issue in project + `buildBugExecutionPolicy` (env-configured reviewer/approver). **This function is superseded by pipelines — see WP2.** |

### 1.2 Hub primitives that already exist

- ERPNext party-spine module at `/workforce/projects` (`proj_projects/proj_tasks/proj_timesheets/proj_templates` in Supabase PG; `src/server/services/projects.service.ts`): native project ↔ paperclip project link via `metadata.workforceProjectId`; task→agent dispatch (`dispatchTaskToAgent` :211 → `performAgentDispatch` :135); import flow on the list page.
- **Shipped 2026-07-11 (prod `ac6c0fbf`)**: execution kanban on project detail (cards show step-owner chips; HITL column amber), pipeline stepper + Traceability panel + **Approve/Request-changes HITL buttons** on `/workforce/issues/[id]`, catch-all proxy `/api/workforce/[...path]` with correct board-key auth (`authHeaders()` split in `src/lib/server/workforce-fetch.ts`).
- RBAC: `/api/workforce` writes already gated under module `projects` (`rbac.service.ts` `API_WRITE_PREFIXES`). Every new page/nav/API MUST follow the RBAC checklist in `minion_hub/CLAUDE.md`.
- `@minion-stack/workforce-client` source: meta-repo `packages/workforce-client/src/` (`api/`, `types/`). Hub consumes the published package — bump + workspace-link during dev.

### 1.3 Proven E2E reference (MIN-1353, 2026-07-11)

webhook → issue in Bug Triage project (`22d39869…`) → **Fix** (bug-fixer `af7d1775…`, worktree, root-cause commit pushed) → done request auto-advanced → **Review** (bug-reviewer `cae26285…`, "✅ Approved") → **Approval** (user `G9PcFx…`, HITL, approved from hub UI) → done. Fully autonomous between gates. This 3-step pipeline is the template the pipeline builder must be able to express *as data*.

### 1.4 Auth & actor facts

- Hub → paperclip: board key (`pcli_…`) as `Authorization: Bearer`; ALL board keys belong to user `G9PcFx…` → board requests act as that user and pass `principalsEqual` for user-participant stages (`server/src/middleware/auth.ts:124-140`).
- Agents in-run call home via bridge-injected `PAPERCLIP_API_URL/KEY` (agent API keys).

---

## 2. Design

### 2.1 Concept model

```
Portfolio  (charter: objective + guardrails + vision/mission; KPIs; monitor routine)
  └── Project (a sectioned black box: repo module / domain; own workspaces; own pipelines)
        ├── Pipeline "bugs"        : Fix → Eval(score≥7) → Review → HITL Approval
        ├── Pipeline "features"    : Spec → Build → Test → Review → HITL
        ├── Pipeline "remediation" : Audit → Patch → Eval → HITL
        └── Issues (tasks) + sub-issues (subtasks, via existing parentId)
```

- **Portfolio** = new first-class row in paperclip (NOT goals — goals lack charter/guardrail semantics and monitor scoping; keep `projects.goalId` orthogonal).
- **Task+Subtask** = existing `issues` + `parentId` tree. No new task entity.
- **Pipeline** = ordered steps. Step 0 is always a `work` step (the assignee). Later steps are gates that compile to `executionPolicy.stages`.
- A pipeline's **kanban columns** = its steps, PLUS the implicit `Backlog/Todo` intake and terminal `Done/Cancelled`. Column of an issue is derived: status `todo|backlog` → intake; `in_progress` → the work step (or the step whose `changes_requested` bounced it); `in_review` → the stage step matching `executionState.currentStageId`; `done/cancelled` → terminal. (The hub already renders exactly this derivation for the 3-step case.)

### 2.2 Pipeline steps — the standardized workflow model

```jsonc
// pipelines.steps (jsonb, ordered array)
[
  { "key": "fix",     "kind": "work",     "label": "Fix",
    "participant": { "type": "agent", "agentId": "…" },
    "adapterOverrides": null },                       // optional per-step runtime override
  { "key": "eval",    "kind": "eval",     "label": "Eval",
    "participant": { "type": "agent", "agentId": "…" },
    "rubric": "…markdown rubric…", "minScore": 7, "maxScore": 10 },
  { "key": "review",  "kind": "review",   "label": "Review",
    "participant": { "type": "agent", "agentId": "…" } },
  { "key": "approve", "kind": "approval", "label": "Approval",
    "participant": { "type": "user", "userId": "…" } }
]
```

Step kinds and their compilation:

| kind | compiles to | semantics |
|---|---|---|
| `work` (first step only) | `assigneeAgentId` (+ optional `issues.assigneeAdapterOverrides` from `adapterOverrides`) | The doer. Exactly one per pipeline, position 0. |
| `review` | stage `{type:"review", participants:[participant]}` | Agent or user gate; approve/changes via existing machine. |
| `approval` | stage `{type:"approval", participants:[participant]}` | Same machine, approver wake-role; user participant = HITL. |
| `eval` | stage `{type:"review", participants:[evaluator]}` **+ score gate** | Evaluator agent receives the rubric in its wake context; must submit a numeric score with its decision; engine enforces `minScore` (see §2.4). |

`trigger` (jsonb, all fields optional, AND-matched): `{ "originKinds": ["github_issue"], "labels": ["bug"], "priorities": ["critical","high"] }`. Resolution order for an incoming issue: project pipelines (most specific trigger match wins; ties → first by `sortOrder`) → company default pipeline (projectId null) → no pipeline (issue behaves exactly as today). **Pipelines are opt-in; zero behavior change for issues that don't match.**

### 2.3 Data model (paperclip, additive migrations only)

```sql
-- 0105_portfolios.sql
CREATE TABLE portfolios (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text,            -- shared objective (md)
  guardrails text,           -- constraints agents must respect (md)
  charter text,              -- vision / mission / anything else (md)
  status text NOT NULL DEFAULT 'active',   -- active | archived
  lead_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE SET NULL;

-- 0106_pipelines.sql
CREATE TABLE pipelines (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,  -- NULL = company default
  name text NOT NULL,
  description text,
  trigger jsonb,             -- {originKinds?, labels?, priorities?}
  steps jsonb NOT NULL,      -- ordered step array (§2.2), zod-validated at write
  sort_order int NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 0107_decision_scores.sql
ALTER TABLE issue_execution_decisions ADD COLUMN score numeric;
ALTER TABLE issue_execution_decisions ADD COLUMN max_score numeric;
-- pipeline provenance on issues (which pipeline/step vocabulary to render):
ALTER TABLE issues ADD COLUMN pipeline_id uuid REFERENCES pipelines(id) ON DELETE SET NULL;
```

⚠️ **Migration journal rules (this fork's journal was repaired 2026-07-11, commit `9cb31b502`):** append entries to `packages/db/src/migrations/meta/_journal.json` with the next sequential `idx` and a `when` strictly greater than the previous entry (convention in repair: `1700000000000 + idx*60000`). Never duplicate tags. Check the highest existing idx before numbering (0103 was the tip at repair time; other sessions may have added more — **verify, don't assume 0105 is free**).

### 2.4 Engine touch points (the ONLY two, keep them surgical)

1. **Stage cursor already generic** — compiled stages work with zero changes (proven by MIN-1353).
2. **Score gate (new, contained):** in `routes/issues.ts` PATCH path where the transition decision is persisted (~:5034), and in `applyIssueExecutionStageTransition`:
   - `updateIssueSchema` (packages/shared/src/validators/issue.ts) gains optional `evalScore: number`.
   - When the current stage is an eval step (lookup `issues.pipeline_id` → step by `currentStageId`; store `stageKey → {minScore,maxScore}` map in the *compiled policy* instead to avoid a join: add optional `meta?: {kind, minScore?, maxScore?, rubric?}` to `IssueExecutionStage` — normalizer passes it through), then:
     - a `done` request MUST carry `evalScore`; missing → 422 "Eval stage requires a score".
     - `evalScore < minScore` → force the changes_requested path (bounce to returnAssignee) regardless of requested status, decision outcome `changes_requested`, score persisted.
     - `evalScore >= minScore` → normal approve path, score persisted on the decision row.
   - `IssueExecutionStage.meta` is additive; existing policies (no meta) behave exactly as before. Update the zod stage schema + `normalizeIssueExecutionPolicy` passthrough + shared TS types + workforce-client types.
3. **Wake context for gates:** stage wakes already deliver the issue. Evaluator/reviewer rubric delivery = the step's `rubric` is written into the wake `reason`/heartbeat context (extend `buildExecutionStageWakeup` payload with `stageMeta`) so the evaluator run sees the rubric without instruction-file changes. If that proves >20 LOC, fallback: rubric lives in the evaluator agent's AGENTS.md and `meta.rubric` is display-only (acceptable v1 — bug-reviewer works this way today).

### 2.5 Pipeline services (new, `server/src/services/pipelines.ts`)

```ts
compilePipeline(pipeline): { assigneeAgentId: string|null; assigneeAdapterOverrides?: …;
                             executionPolicy?: IssueExecutionPolicy }   // pure, unit-tested
resolvePipeline(db, {companyId, projectId?, originKind?, labels?, priority?}): Pipeline|null
applyPipelineToCreateInput(pipeline, input): IssueCreateInput           // stamps assignee+policy+pipelineId
```

Wire into issue-creation paths, all opt-in:
- `routes/github-bugs.ts`: replace `buildBugExecutionPolicy` + env `GITHUB_BUGS_REVIEWER_AGENT_ID/APPROVER_USER_ID/AGENT_ID` with `resolvePipeline` (project `GITHUB_BUGS_PROJECT_ID` scope, trigger `originKinds:["github_issue"]`). **Startup seed:** if those env vars are present and no matching pipeline row exists, create one from them (one-time, idempotent by name `github-bugs-default`) — zero-downtime cutover, env vars become legacy seeds.
- `routes/issues.ts` create (:4382 area): if body has `pipelineKey`/`pipelineId` OR (no explicit executionPolicy AND a pipeline matches project+labels), apply. Explicit `executionPolicy` in the request always wins.
- Routines (`routine_runs.linkedIssueId` spawn path) and MCP `paperclipCreateIssue`: same `applyPipelineToCreateInput` call.

### 2.6 Portfolio monitoring (heartbeats over the portfolio)

- `GET /portfolios/:id/metrics` → per-project + rollup: open/done counts by status, created/completed last 7/30d, avg cycle time (createdAt→completedAt), `changes_requested` rate, avg eval score, stuck issues (in_review with `updated_at` older than N hours), active worktrees.
  Implementation: plain SQL aggregates over `issues` + `issue_execution_decisions`; no caching v1.
- **Monitor = an agent + a routine** (existing primitives): a `portfolio-monitor` agent whose instructions say "pull `paperclipPortfolioMetrics`, compare against the portfolio objective/guardrails, open issues (with the right pipeline) for new fronts / regressions / stuck work"; a cron `routine_triggers` row scoped to it. No new scheduler code — only the metrics endpoint + MCP tool + agent config.

### 2.7 SDK + agent tools

**REST (paperclip `server/src/routes/`):**
- `portfolios.ts`: CRUD `/portfolios`, `GET /portfolios/:id/metrics`, `GET /portfolios/:id/projects`.
- `pipelines.ts`: CRUD `/companies/:companyId`-scoped `/pipelines` (+ `?projectId=`), zod-validate steps (exactly one `work` at index 0; eval steps require rubric+minScore; participants must exist + agent assignable).
- Register in `app.ts` `api` router (inside auth, standard company scoping like `routes/issues.ts`).

**Typed client (`packages/workforce-client/src/`):** `api/portfolios.ts`, `api/pipelines.ts`, types in `types/portfolio.ts`, `types/pipeline.ts`; extend `types/issue.ts` with `pipelineId`, `IssueExecutionStage.meta`, decision `score/maxScore`. Version bump + changeset (meta-repo release flow).

**MCP tools (`packages/mcp-server/src/tools.ts`), follow existing `paperclip*` conventions:**
`paperclipListPortfolios`, `paperclipGetPortfolio` (charter+guardrails in response — this is how agents inherit the portfolio's vision), `paperclipCreatePortfolio`, `paperclipPortfolioMetrics`, `paperclipListPipelines`, `paperclipCreatePipeline`, `paperclipCreateProject` (with `portfolioId`), and extend `paperclipCreateIssue` with `pipelineKey`. Read tools available to all agents; create/manage tools follow the existing permission gating pattern in tools.ts.

### 2.8 Hub UI (SvelteKit, Svelte 5 runes; reuse shipped components)

1. **Portfolios** — `/workforce/portfolios` (list: name, objective excerpt, project count, KPI chips) and `/workforce/portfolios/[id]` (charter panel; projects grid, each with mini status distribution; metrics row — reuse KPI tile pattern from reliability; monitor status: routine + last run). Nav under Workforce section; RBAC `projects` module view (add `MODULE_SUBRESOURCES` entry).
2. **Pipeline builder** — `/workforce/projects/[id]/pipelines`: list of the project's pipelines + editor. Editor = vertical ordered step list; each row: label, kind select (`work|review|eval|approval`), participant picker (agents from `agents.list` + "You"), rubric textarea + minScore input (eval kind only), adapter-override JSON textarea (collapsed, advanced). Live preview renders the SAME stepper component as the issue page. Trigger editor: label multiselect + originKind multiselect + priority multiselect. Save → hub `/api/workforce/...` catch-all proxy (already auth-fixed) → paperclip. **No drag-drop library — up/down buttons (ponytail).** Extract the issue-page stepper into `src/lib/components/workforce/PipelineStepper.svelte` for reuse.
3. **Kanban generalization** — project detail execution board: when the project has pipelines, columns = pipeline steps (+ intake + Done) with the derivation in §2.1; issues list still comes from `issues.list` (NOTE: list redacts `executionPolicy/executionState` — `server/src/services/issues.ts:1908` `issueListSelect`; the step derivation needs status+assignee only, EXCEPT distinguishing multiple gate steps → **add `pipeline_id` + a cheap `execution_state->>'currentStageId'` scalar to `issueListSelect`** (WP4) so columns resolve without N+1 `issues.get`).
4. **Issue detail** — stepper already live; add per-gate score chips (from decisions; new `GET /issues/:id/execution-decisions` or embed scores in `issues.get` response) and rubric display for eval steps.
5. All strings through Paraglide (`m.*()` + `bun run i18n:compile`); every new route in the RBAC checklist; hub gate = `bun run check` 0/0 + focused vitest.

### 2.9 Minion Code portfolio — the concrete instantiation (dogfood)

Seed (via the new SDK, not SQL): Portfolio **"Minion Code"** — objective "improve the Minion codebase", guardrails (never push default branches; draft PRs only; focused tests only — full gw suite FORBIDDEN, crashes the machine; respect repo CLAUDE.md conventions). Projects = repo modules, each with a workspace pointing at the existing sandbox clones (`/paperclip/repos/sandbox/...`): `hub-app` (minion_hub), `gateway-core` (minion src/gateway), `gateway-auth` (minion src/auth+security), `paperclip-control-plane`, `site`, `plugins`. Bug Triage project (`22d39869…`) keeps working via the seeded github-bugs pipeline.
**Bug routing:** v1 = bug-fixer's existing role becomes *triage*: its instructions gain "identify the culprit module and move the issue to that project (`paperclipUpdateIssue projectId`), then continue or hand off per that project's pipeline". v2 (deferred): a dedicated router step kind. Per-project pipelines: `bugs` (Fix→Eval→Review→HITL), `features` (Spec→Build→Review→HITL), `remediation` (Audit→Patch→Eval→HITL) — same evaluator agent (`code-evaluator`, new, cloned from bug-reviewer recipe with rubric-scoring instructions) reused across projects. Monitor: `portfolio-monitor` agent + 6h cron routine.

### 2.10 Explicitly out of scope (v1)

Custom per-project statuses (engine indexes forbid it); parallel/branching pipelines (linear only — matches the stage cursor); drag-drop kanban mutation of paperclip issues from the hub; auto-merge of agent PRs (draft PRs + HITL stays terminal); exe.dev auto-provisioning UI (agents get `default_environment_id` set manually/via SDK; environments API already exists); hub proj_tasks ↔ pipeline sync (dispatch bridge unchanged).

---

## 3. Implementation plan — work packages for sonnet5 agents

**Global rules for every WP (put verbatim in each agent brief):**
- Read the sub-repo's CLAUDE.md/AGENTS.md first. Svelte 5 runes only in hub. TS strict, no `any`, no `@ts-nocheck`.
- Gates — paperclip: `pnpm --filter @paperclipai/server run typecheck` + `cd server && pnpm vitest run <touched test files>` (embedded-Postgres tests may fail to START on this machine — a startup failure is environmental, not a regression; mounted-route-style tests with mocks are the reliable pattern, see `server/src/__tests__/github-bugs-mounted-route.test.ts`). Hub: `bun run check` (must stay 0 errors/0 warnings) + `bun run vitest run <touched>` + `bun run i18n:compile` after adding messages. **NEVER run the full test suite in `minion/`** (crashes the machine) — not that repo anyway; do not touch `minion/`.
- Commit style: repo-conventional prefixes; scope commits to your own files (concurrent sessions are active — NEVER `git add -A`, never reset/stash).
- Migration numbering: check `packages/db/src/migrations/meta/_journal.json` tip idx at execution time; keep `when` monotonic (§2.3 warning).

| WP | Repo | Deliverable | Depends on |
|---|---|---|---|
| **WP1** | paperclip | Migrations + drizzle schema: `portfolios`, `pipelines`, `projects.portfolio_id`, `issues.pipeline_id`, decision `score/max_score`. Schema files under `packages/db/src/schema/` (`portfolios.ts`, `pipelines.ts`; extend `projects.ts`, `issues.ts`, decision schema). Unit: schema exports compile; journal valid (idx/when monotonic test if one exists, else add tiny json sanity test). | — |
| **WP2** | paperclip | `server/src/services/pipelines.ts` (compile/resolve/apply, §2.5) + zod `pipelineSchema` in `packages/shared/src/validators/` + shared types. Wire creation paths: github-bugs (replace env policy w/ resolve + idempotent seed), issues.create, routines spawn, MCP create. Pure-function unit tests for compile/resolve (no DB) + mounted-route test proving a webhook issue gets pipeline stamped. | WP1 |
| **WP3** | paperclip | Score gate (§2.4): `IssueExecutionStage.meta` passthrough in normalizer + zod; `updateIssueSchema.evalScore`; enforce minScore in stage transition; persist score/maxScore on decision insert (`routes/issues.ts` ~:5034); extend `buildExecutionStageWakeup` payload with `stageMeta`. Unit tests against `applyIssueExecutionPolicyTransition` directly (pure — no DB needed): missing-score 422, below-min bounce, at-min approve, legacy policy w/o meta unchanged. **Highest-risk WP: touch nothing else in the engine.** | WP1 |
| **WP4** | paperclip | REST: `routes/portfolios.ts`, `routes/pipelines.ts` (+register in app.ts), metrics endpoint (§2.6); add `pipelineId` + `currentStageId` scalar to `issueListSelect` (`services/issues.ts:1908`); scores embedded in `issues.get` (or `GET /issues/:id/execution-decisions`). Mounted-route tests for authz + happy path. | WP1, WP2 |
| **WP5** | meta-repo | `@minion-stack/workforce-client`: portfolio/pipeline APIs + types, Issue type extensions (§2.7). Changeset + version bump; hub package.json bump (workspace link for dev). Vitest for new client methods (mock fetch, follow `client.test.ts` patterns). | WP4 (API shapes frozen by WP2/3 types — can start from spec types in parallel) |
| **WP6** | paperclip | MCP tools (§2.7) in `packages/mcp-server/src/tools.ts` following existing conventions + `tools.test.ts` additions. | WP4 |
| **WP7** | hub | Portfolios UI (§2.8.1): routes, nav entry, RBAC wiring (`MODULE_SUBRESOURCES`), i18n. Loads via `workforceServerClient`. | WP5 |
| **WP8** | hub | Pipeline builder (§2.8.2) + `PipelineStepper.svelte` extraction (refactor issue page to consume it). Mutations via `/api/workforce/...` proxy. | WP5 |
| **WP9** | hub | Kanban generalization + issue score chips (§2.8.3/4). Careful: list-redaction note. | WP4, WP5 |
| **WP10** | ops/E2E | Deploy paperclip (VPS image rebuild from fork tip — flow: niko checkout `git fetch fork && reset --hard fork/minion-integration`, `docker build -t ghcr.io/nikolasp98/minion-workforce:<sha> -t …:latest .`, `docker compose -f docker-compose.deploy.yml up -d server`; keep the `openclaw-execute.transpiled.ts` mount). Seed Minion Code portfolio + projects + pipelines + `code-evaluator` + `portfolio-monitor` agents (§2.9) **via the SDK**. E2E: fire a signed test webhook → issue traverses Fix→Eval(score)→Review→HITL on the hub board; monitor routine produces a metrics-driven issue. Hub deploy: push `dev`, FF `master` (check `git log origin/master..dev` first — concurrent sessions). | all |

**Suggested execution order:** WP1 → (WP2 ∥ WP3) → WP4 → (WP5 ∥ WP6) → (WP7 ∥ WP8 ∥ WP9) → WP10. One reviewer pass (opus/fable) after WP3 (engine touch) and before WP10 (deploy).

**Per-WP brief template:** goal, exact file list, the relevant §refs of this spec pasted in, ground-truth file:line pointers (§1), gates, "do not touch" list (engine files outside the named ones; other sessions' worktrees), and the constraint block above.

---

## 4. Risks / open questions

1. **`currentStageId` in list select** exposes minimal execution state to list consumers — acceptable (id only, no participants). Confirm no trust-boundary issue with low-trust issue listings (check `sourceTrust` handling near `issueListSelect`).
2. **Score transport**: `evalScore` rides the generic PATCH — an agent could submit a score on a non-eval stage; engine must ignore it there (only persist/enforce when stage meta says eval).
3. **Pipeline edits mid-flight**: compiled policy is stamped per-issue at creation → editing a pipeline does NOT retro-change in-flight issues (feature, not bug — document in UI copy).
4. **Journal collisions** with concurrent paperclip sessions — WP1 agent must re-check tip idx at execution time.
5. **exe.dev**: v1 only documents attaching `default_environment_id`; if the live environments API differs from recon (it was added recently), WP10 falls back to local execution for the dogfood seed.
