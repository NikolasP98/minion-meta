# Workshop Experiments — Model Comparison, Group Chat & Leaderboard

**Date:** 2026-06-29
**Status:** DRAFT — awaiting sign-off before build
**Scope:** `minion_hub` (new subtabs) + `minion` gateway (new/extended RPCs) + `@minion-stack/shared` (additive types)

---

## 1. Goal

Turn `/agents/workshop` into a tabbed **experimentation hub** for testing agents and LLMs. New subtabs:

1. **Compare** — one prompt → outputs from N selected models, side by side. Blind-mode ranking. DB-backed ranking history by user-defined prompt category.
2. **Group Chat** — a multi-subagent workflow to solve a problem. Ephemeral subagents created on the fly from one prompt, stepped wizard, configurable rounds/style, background-survivable, optional orchestrator/decision-maker.
3. **Leaderboard** — performance metrics across models (latency, tokens, cost, win-rate) combining existing reliability data + new ranking data.

Plus a **gateway model-exposure restructure**: owner/admin sees *all* models from *all* connected providers; lesser roles see only *enabled* models.

---

## 2. Architecture decisions (the forks I resolved)

| Decision | Choice | Why |
|---|---|---|
| Where model calls run | **Gateway** owns the provider clients + keys + RBAC model list. New thin RPC `playground.complete`. | Don't duplicate LLM clients/keys in the hub. One place to gate models by role. |
| Comparison run lifecycle | **Synchronous** — hub fires N parallel `playground.complete` calls, one per model, shows per-column loading, persists outputs. | Short-lived; no job machinery needed. |
| Group-chat lifecycle | **Hub background job** (reuse `finance-sync-jobs` pattern: DB run table + netcup cron `tick` + budgeted `advanceRun`). Each subagent turn = one `playground.complete` call. | Survives navigation for free (state in DB, cron drives it). No new gateway orchestration subsystem. |
| Ephemeral subagents | **Personas = rows** (name + system prompt + model), *not* installed gateway agents. | Lazy: "suggest subagents" is one LLM call returning personas; group chat is a round-robin loop over personas. No agent install/teardown. |
| Streaming in Compare | **Non-streaming v1** (await full completion per column). Streaming = follow-up. | Side-by-side with per-column spinners is enough to ship + rank. |

---

## 3. Gateway changes (`minion`)

### 3.1 `playground.complete` (new RPC)
`src/gateway/server-methods/playground.ts`
```ts
// req:  { modelId, messages: {role,content}[], system?, params?: {temperature?, maxTokens?, ...} }
// res:  { text, usage: { inputTokens, outputTokens }, costUsd?, latencyMs, modelId }
```
Resolves the model's provider from `cfg.models.providers`, calls the existing provider client, returns the completion. Enforces the same enabled-model gate as `models.list` (a non-admin asking for a disabled model → 403). Stateless: no session, no history, no ledger.

### 3.2 `models.list` — role-aware (extend existing `server-methods/models.ts`)
- Add `enabled: boolean` + `provider: string` to each returned model.
- If caller `userRole === 'admin' | 'org_admin'` (or scope `operator.admin`): return **all** models, each tagged `enabled`.
- Else: return **only enabled** models.
- Response gains `role` echo so the UI knows whether to show the "manage models" affordance.

### 3.3 `models.setEnabled` (new, admin-only)
`{ enabledModelIds: string[] }` → persists to gateway config (`cfg.models.enabled`). Guard on `userRole`/`operator.admin`. This is the source of truth the two RPCs above read.

> Caller role/scopes already live on `GatewayClient.userRole` / `connect.scopes` (set in `auth/auth-jwt.ts` + `mapRoleToScopes`). Handlers just read them.

### 3.4 `@minion-stack/shared`
Additive only: `PlaygroundCompleteReq/Res` types, extend `ModelItem` with `enabled`/`provider`, add `models.setEnabled` types. **Backward-compatible** — `minion_site` / `paperclip` unaffected (they don't call these). No protocol version bump needed.

---

## 4. Hub changes (`minion_hub`)

### 4.1 Routing & tabs
Restructure `/agents/workshop` into a URL-param tab hub (`?tab=`, the `settings/+page.svelte` pattern, reusing `$lib/components/ui/Tabs.svelte`):

| Tab | Content |
|---|---|
| `canvases` (default) | Existing saves grid. Canvas editor stays at `/agents/workshop/[id]`. **No change to existing behaviour.** |
| `compare` | Model output comparison (§4.3) |
| `groupchat` | Group-chat wizard + run viewer (§4.4) |
| `leaderboard` | Metrics (§4.5) |

New components under `src/lib/components/workshop/experiments/`. New state module `src/lib/state/workshop/experiments.svelte.ts`.

### 4.2 DB schema (Supabase Postgres, `src/server/db/pg-schema/`, Drizzle, multi-tenant `tenant_id`)
**Turso is telemetry/operational only — feature data lives in Supabase PG** (`getCoreDb()`), same home + conventions as `notes.ts`/`flows.ts` (text ids, epoch-ms `bigint mode:'number'`, `boolean` flags, plain-text tenant/user scope cross-DB ref, app-level tenant gating). New files `pg-schema/workshop-experiments.ts` + `pg-schema/bg-jobs.ts`:

- **`workshop_prompt_categories`** — `id, tenantId, name, source('suggested'|'user'), createdAt`. The suggest+select tag flow.
- **`workshop_comparison_runs`** — `id, tenantId, serverId, userId, prompt, system, params(json), modelIds(json), blind(bool), categoryIds(json), createdAt, finishedAt`.
- **`workshop_comparison_outputs`** — `id, runId→runs, modelId, output, latencyMs, inputTokens, outputTokens, costUsd, error, createdAt`.
- **`workshop_rankings`** — `id, runId, modelId, rank(int), picked(bool), userId, createdAt`. (Category comes from the parent run → win-rate-by-category is a join.)
- **`workshop_groupchat_runs`** — `id, tenantId, serverId, userId, prompt, status('draft'|'running'|'paused'|'done'|'cancelled'), rounds(int|null=infinite), style, includeOrchestrator(bool), background(bool), settings(json), currentRound, createdAt, finishedAt`.
- **`workshop_groupchat_agents`** — `id, runId, name, systemPrompt, modelId, orderIndex`. (Ephemeral personas.)
- **`workshop_groupchat_messages`** — `id, runId, agentId(nullable=orchestrator), round, role, content, modelId, latencyMs, tokens, costUsd, createdAt`.

Migration: surgical `CREATE TABLE IF NOT EXISTS` (PG dialect) against `SUPABASE_DB_URL` — never `drizzle-kit push`. (Generic `bg_jobs` queue for the global bg-runtime also lives in Supabase PG.)

### 4.3 Compare tab
- Model picker driven by `models.list` (role-filtered). Admins get an "manage enabled models" toggle → `models.setEnabled`.
- One prompt + optional system + params. Pick models → **Run**.
- POST `/api/workshop/compare` creates a run, fans out N `playground.complete` calls (parallel), persists outputs, returns them. Per-column loading state.
- **Blind mode toggle:** outputs shown as "Model A/B/C…" with identities hidden until the user submits a ranking; then identities reveal.
- **Ranking:** drag-to-rank or pick-best → writes `workshop_rankings`. Tag the run with categories: AI-**suggested** tags (one cheap `playground.complete` classifying the prompt) the user can accept + free-text user tags; both land in `workshop_prompt_categories` and link to the run.
- History: past runs for this category with aggregate win-rates.

### 4.4 Group Chat tab — stepped wizard
Steps (each persisted so a run is resumable):
1. **Prompt** — the problem to solve.
2. **Suggest subagents** — one `playground.complete` proposes a set of personas (name, role/system prompt, suggested model) from the prompt; user picks any + can add/edit their own. Saved as `workshop_groupchat_agents`.
3. **Configure** — rounds (`N` = each subagent sends N total messages; `infinite` = run until user stops), style (e.g. debate / brainstorm / critique — a system-prompt preset), **run in background** toggle (on = survives navigation via cron tick; off = client-driven, stops on navigate), **include orchestrator/decision-maker** toggle (final summarize+decide turn), other behaviour settings (json).
4. **Group chat** — round-robin: each round, every selected agent takes a turn = `playground.complete` with the shared transcript + its persona. Live transcript view.
5. **Final result** — if orchestrator enabled, a final turn summarizes + picks the best approach.

**Execution:**
- `background=true`: `/api/workshop/groupchat/tick` (netcup cron, **must be added to `hooks.server.ts` unauth allowlist** or 401s) calls `advanceRun(runId, {budgetMs})` — does one or a few turns per tick, updates `currentRound`, appends messages, finishes when rounds exhausted (+ orchestrator) or `status=cancelled`.
- `background=false`: the open page calls `/api/workshop/groupchat/[id]/advance` in a loop; navigating away just stops it.
- `infinite`: advances until the user hits **Stop** (`status=done`/`cancelled`).
- Live updates: poll the run + messages (or push over the existing gateway WS event channel — poll v1, WS push follow-up).

### 4.5 Leaderboard tab
A model leaderboard joining:
- Existing **`reliability.usage`** (cost/tokens per model/provider) + **`reliability.perf`** (p50/p95/p99 latency) RPCs — already available.
- New **ranking win-rate** by category from `workshop_rankings` (overall + per-category).
- Group-chat participation/cost from `workshop_groupchat_messages`.
Sortable table + a couple of charts (reuse ECharts already in hub).

### 4.6 RBAC
Every new route/API/tab gates via `rbac.service` (`requireOrgCapability` / `resolveCapabilities`) per [RBAC = required build step]. New capability module e.g. `'workshop'` with `view`/`run`/`manage_models` (admin-only) actions.

---

## 5. Suggested *additional* experimentation subtabs (not in this build — for your pick)

| Subtab | What | Reuses |
|---|---|---|
| **Playground** | Single model + param sliders, save prompt versions. Foundation the others share. | `playground.complete` |
| **A/B Prompt** | Same model, two prompt variants side by side (prompt-eng vs model comparison). | Compare infra |
| **Eval / Batch** | Run a prompt over a small input set, score outputs. Ties to the promptfoo eval-gate idea in the per-agent-harness spec. | groupchat job pattern |
| **Tool-use sandbox** | Test an agent with specific tools/MCPs, inspect tool calls. | gateway agent runtime |
| **Regression diff** | Re-run a saved prompt against newer model versions, diff over time. | Compare + history |

---

## 6. Build order (incremental, each shippable)

1. **Gateway**: `playground.complete` + role-aware `models.list` + `models.setEnabled` + shared types. *(unblocks everything)*
2. **Hub plumbing**: tab restructure of `/agents/workshop`, DB schema + migration, experiments state module.
3. **Compare** tab end-to-end (picker → run → blind → rank → category history).
4. **Group Chat** tab (wizard → bg job + tick → transcript → orchestrator).
5. **Leaderboard** tab.

---

## 7. Cross-project impact

- Gateway protocol (additive) → `@minion-stack/shared` types. `minion_site`/`paperclip` **unaffected** (additive, they don't consume these RPCs).
- Hub feature tables live in **Supabase PG** (hub-local pg-schema, not the shared `@minion-stack/db` package) — not shared with `minion_site`, so no site coordination. Turso stays telemetry/operational only.
- Netcup: new cron tick for group-chat bg runs (crontab curl + hooks allowlist).

---

## 8. Open questions for sign-off

1. **Group-chat style presets** — what styles do you want seeded? (debate / brainstorm / critique-and-refine / red-team / freeform). I'll seed a sensible set; tell me if you have specific ones.
2. **Model enablement source of truth** — I'm putting the enabled-set in **gateway config** (`models.setEnabled`). Alternative was hub `settings` table. Gateway config keeps it next to the providers. OK?
3. **Cost numbers** — do per-model price tables already live in the gateway config (for `costUsd`)? If not, leaderboard shows tokens+latency only until prices are configured.
