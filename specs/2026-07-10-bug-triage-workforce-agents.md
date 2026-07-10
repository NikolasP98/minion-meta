# Bug-Triage Workforce Agents — Design Spec

**Date**: 2026-07-10
**Status**: Approved design, pre-implementation
**Repos touched**: `minion/` (gateway, branch `DEV`), `paperclip-minion/` (branch `minion-integration`), netcup VPS config
**Repos NOT touched in v1**: `minion_hub/` (Report-a-Bug + /workforce UI already do everything needed)

## 1. Goal

When a bug report is submitted from the hub's "Report a Bug" UI (which already publishes a GitHub issue), an autonomous agent picks it up, investigates in a sandboxed worktree cut from an always-fresh clone of the relevant MINION repo, attempts a fix, opens a **draft PR**, and comments its diagnosis on the GitHub issue. All of its work is visible live in the hub's `/workforce` page.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Runtime host | Netcup VPS (`bot-prd@152.53.91.108`) — paperclip already runs there at `127.0.0.1:3200` |
| Agent autonomy | Investigate + push branch + **draft PR** + issue comment. Never merges, never pushes default branches. |
| Event ingress | GitHub webhooks → gateway `/hooks` (existing HMAC verify) → new `forward` action → paperclip loopback |
| Repo set | 6 code repos: `minion`, `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins` (skip `docs/`, `ai-studio/`) |
| Architecture | **Paperclip-native**: all new logic in paperclip; gateway change is forwarding only |

Alternatives rejected: gateway-native agent runs (invisible to /workforce, which renders paperclip state); standalone watcher daemon (extra deployable; paperclip already has webhook ingress with dedupe, worktree workspaces, and run orchestration in-process).

## 3. What already exists (recon ground truth)

- **Hub → GitHub**: `minion_hub/src/routes/api/bugs/report/+server.ts` → `src/server/services/github-issues.service.ts`. Creates issue in `GITHUB_BUG_REPO` (default `NikolasP98/minion_hub`) via raw fetch + `GITHUB_TOKEN` PAT, labels `['bug', <severity>, 'agent']`, screenshots committed to `.bug-reports/<bugId>.png` via Contents API, console logs as collapsed markdown table, state snapshot (page URL, hub + gateway versions) in body. Also writes hub `bugs` DB row with `metadata.githubIssueUrl`.
- **Gateway webhook receiver**: `/hooks` endpoint (`minion/src/gateway/hooks.ts:17`), GitHub HMAC verification (`verifyGitHubSignature`, `hooks.ts:239`), event mappings in `src/gateway/hooks-mapping.ts:80-112` for `github/push`, `github/issues`, `github/pull_request`. Today the only mapping action is `"agent"` (wake a gateway agent turn).
- **Paperclip run machinery**: issues/agents/heartbeat-runs schema (`packages/db/src/schema/`); `claude-local` adapter spawns the `claude` CLI headless (`--print - --output-format stream-json`, `packages/adapters/claude-local/execute.ts`); `workspaceStrategy: { type: "git_worktree", baseRef, branchTemplate, worktreeParentDir }` with worktree add/attach/recreate in `server/src/services/workspace-runtime.ts`; lazy `git clone` in the run path (`server/src/services/heartbeat.ts:928`); generic plugin webhook ingress with GitHub delivery-GUID dedupe (`plugin_webhook_deliveries`, endpoint shape `/api/plugins/:pluginKey/webhooks/:webhookKey`); run start via `POST /agents/:id/heartbeat/invoke`, wakeups via `POST /agents/:id/wakeup`, issue checkout via `POST /issues/:id/checkout`.
- **/workforce UI**: hub renders paperclip issues, heartbeat runs, activity feed, approvals, org chart via `@minion-stack/workforce-client` (`minion_hub/src/lib/server/workforce-fetch.ts`); cross-machine path is the gateway proxy `minion/src/gateway/workforce-proxy.ts` (`/api/workforce-backend/*` → `127.0.0.1:3200`).

## 4. Architecture

```
Hub "Report a Bug"
   └─→ GitHub issue in GITHUB_BUG_REPO            (EXISTS — labels: bug, <severity>, agent)

GitHub repo webhooks (events: issues, push; one per repo, shared secret)
   └─→ gateway /hooks  (HMAC verify — EXISTS)
         └─→ NEW mapping action "forward": POST raw verified payload
              → http://127.0.0.1:3200/api/github-bugs/webhook

paperclip github-bugs handler (NEW):
   ├─ issues.opened|reopened  AND label "bug"  AND repo == GITHUB_BUG_REPO
   │     → upsert paperclip issue (idempotent key: gh repo + issue number)
   │     → assign to "bug-fixer" agent → wake (existing wakeup/checkout path)
   ├─ push (any registered repo)
   │     → repo-sandbox refresh: git fetch --prune on that repo's mirror clone
   └─ everything else → 200 + ignore (delivery logged/deduped by GUID)

bug-fixer agent run (EXISTING heartbeat machinery):
   worktree cut from mirror clone (pre-run fetch first)
   claude-local adapter → investigate → fix → check/test → push branch
   → gh pr create --draft → gh issue comment (diagnosis + PR link)

/workforce page: renders the paperclip issue, live run, activity — no changes needed.
```

## 5. Components

### 5.1 Gateway: `forward` hook action (`minion/`)

Extend the hooks mapping config (`src/config/types.hooks.ts`) and dispatcher (`src/gateway/server/hooks.ts`) with a new action:

```jsonc
// gateway hooks config (conceptual)
{ "event": "github/issues", "action": "forward", "url": "http://127.0.0.1:3200/api/github-bugs/webhook" }
{ "event": "github/push",   "action": "forward", "url": "http://127.0.0.1:3200/api/github-bugs/webhook" }
```

Behavior: after HMAC verification, POST the raw payload + `x-github-event` + `x-github-delivery` headers to the configured URL. Loopback-only expectation but not enforced beyond config (operator-controlled). Fire-and-forget with a short timeout; failures logged, webhook still returns 200 to GitHub (GitHub redelivery + paperclip dedupe make this safe). No response body forwarding.

### 5.2 Paperclip: repo-sandbox service (`paperclip-minion/server/src/services/repo-sandbox.ts`)

- **Registry** (config, env or JSON): `[{ name, gitUrl, defaultBranch }]` for the 6 repos. Sandbox root: `REPO_SANDBOX_DIR` (netcup: `/home/bot-prd/repos/sandbox/`).
- **Bootstrap**: on service start, `git clone --mirror <gitUrl> <root>/<name>.git` for any missing repo. Mirror clones = full ref mirror, no working tree ("minus the bloat"), and `git worktree add` works directly off them.
- **Refresh**: `refresh(name)` runs `git -C <root>/<name>.git fetch --prune` (serialized per repo; concurrent calls coalesce). Called from: (a) push webhook, (b) **always immediately before creating a run worktree** — a missed webhook can never yield a stale base. Push-webhook refresh is a warm-cache optimization; pre-run fetch is the correctness guarantee.
- **Worktrees**: per-run workspaces via the existing `workspaceStrategy: git_worktree` with `baseRef: <defaultBranch>` (mirror refs track origin heads), `branchTemplate: bug/{issueNumber}-{slug}`, `worktreeParentDir: <root>/worktrees/<name>/`. Cleanup uses the existing `git_worktree_remove` path.

### 5.3 Paperclip: github-bugs webhook handler

Implemented as a plain Express route `POST /api/github-bugs/webhook` mounted ABOVE `hubIdentityMiddleware` (the plugin webhook ingress was rejected during implementation: it requires a DB-registered plugin + manifest + worker process, and its delivery-GUID dedupe is unimplemented). Idempotency rests on the `issues.origin*` columns. NOTE: the GitHub webhook MUST be configured with content type application/json — rawBody (needed for HMAC) is only captured for JSON bodies.

- `X-GitHub-Event: issues`, action `opened` or `reopened`, label set contains `bug`, repo is `GITHUB_BUG_REPO`:
  1. Upsert paperclip issue in the MINION company. Idempotency key: `github:<owner>/<repo>#<number>` (stored in issue metadata; re-delivery and reopen update rather than duplicate).
  2. Issue title = GitHub title; body = GitHub body verbatim (already contains description, severity, console-log table, screenshot links, state snapshot) + a header line linking the GitHub issue URL. Severity mapped to issue priority.
  3. Assign to the `bug-fixer` agent and wake it (existing wakeup path). The heartbeat context carries the GitHub repo, issue number, and issue URL.
- `X-GitHub-Event: push` for any registered repo: `repoSandbox.refresh(name)`. Ignore pushes to `refs/tags/*`.
- Anything else: 200, ignore.

### 5.4 Bug-fixer agent (paperclip agent definition — data/config, not code)

- One agent for all repos. Rationale: the bug repo is always `GITHUB_BUG_REPO`, but the culprit is often the gateway or another service; the state snapshot in the issue body names both hub and gateway versions, and the agent has every clone available to hop across.
- Adapter: `claude-local`, workspace strategy `git_worktree` per §5.2.
- System prompt playbook:
  1. Read the bug issue (description, severity, console logs, state snapshot).
  2. Identify the culprit repo (default: the bug repo; hop clones if evidence points elsewhere).
  3. Reproduce / root-cause. Root cause, not symptom.
  4. Minimal fix + run that repo's check command (`pnpm check` / `bun run check` / `pnpm tsgo` per repo table in the prompt).
  5. `git push` the `bug/<n>-<slug>` branch → `gh pr create --draft` (title references the issue, body = diagnosis + fix summary + test evidence).
  6. `gh issue comment` on the GitHub issue: root cause, fix link, anything needing human judgment.
  7. If it cannot fix (can't reproduce, needs product decision, out of scope): comment the diagnosis and stop — a triage comment is a successful outcome.
- Credentials: `gh` CLI + `GITHUB_TOKEN` (existing PAT, repo scope) in the run env on the VPS. Guardrails: draft PRs only; never merge; never push to default branches (also enforce with branch protection on the repos).

### 5.5 Visualization (/workforce)

No code changes. Each bug becomes a paperclip issue (issues board), each agent invocation a heartbeat run (live logs, status, cost), plus activity-feed entries. The paperclip issue body links the GitHub issue; the agent's closing comment links the draft PR.

## 6. Error handling

| Failure | Behavior |
|---|---|
| Duplicate webhook delivery | Deduped by GitHub delivery GUID (existing `plugin_webhook_deliveries`) |
| Issue event re-delivered / reopened | Idempotent upsert on `github:<owner>/<repo>#<number>` |
| Push-refresh fetch fails | Log only — pre-run fetch is the correctness guarantee |
| Pre-run fetch fails | Run fails fast with a clear error (visible as failed heartbeat run) |
| Agent run fails / crashes | Failed heartbeat run in /workforce + `gh issue comment` "automated triage failed: <reason>" — never silent |
| Gateway → paperclip forward fails | Logged; GitHub redelivery + dedupe recover; forward returns 200 to GitHub regardless |
| Paperclip backend down | Webhooks lost until GitHub redelivery; hub bug report itself is unaffected (issue still created) |

## 7. Security

- Webhook authenticity: HMAC (`X-Hub-Signature-256`) verified at the gateway before forwarding; the forward target is loopback on the same host.
- Token: existing `GITHUB_TOKEN` PAT, repo scope. Agent can push branches and open PRs; branch protection on default branches prevents direct pushes there.
- Agent runs with the existing claude-local permission profile inside per-run worktrees on the VPS (same trust model as existing paperclip agents).
- Bug issue content is attacker-influenceable (anyone with hub access can file). The agent prompt must treat issue content as untrusted data: instructions embedded in bug text must not override the playbook (explicit line in system prompt), and its only write powers are branch push + draft PR + comment.

## 8. Testing

- **Gateway**: unit test for the `forward` action (mapping parse + dispatch POSTs verified payload with headers; failure doesn't break the 200 to GitHub).
- **Paperclip**: unit tests for the webhook handler (issue upsert idempotency, label/repo filtering, push → refresh call); repo-sandbox tests against a local fixture repo (bootstrap clone, refresh, worktree base freshness after a push to the fixture).
- **E2E (manual, on VPS)**: file a real bug from the hub UI → confirm GitHub issue → paperclip issue appears in /workforce → agent run starts → draft PR + issue comment land.

## 9. Delivery order

1. Paperclip: repo-sandbox service + github-bugs webhook handler + bug-fixer agent config (testable locally by POSTing fixture webhook payloads).
2. Gateway: `forward` hook action + config entries.
3. VPS: sandbox dir bootstrap, env (`REPO_SANDBOX_DIR`, registry), GitHub webhooks on the 6 repos (events: issues, push; secret = gateway hooks secret), branch protection check.
4. E2E validation via a real hub bug report.

## 10. Out of scope (v1)

Auto-merge; severity-gated autonomy; GitHub App auth (PAT is fine); handling issues filed against repos other than `GITHUB_BUG_REPO`; `pull_request` webhook handling; hub UI additions (e.g. deep-linking hub `bugs` rows to /workforce issues); multiple/per-repo agents.
