---
id: 2026-08-07-projects-github-repos-and-factory-gates-spec
title: Projects ⇄ GitHub Repos + Software-Factory Gates
stage: done
status: retired
pass: 1
created: 2026-08-07
updated: 2026-08-28
repos: [minion_hub]
retired_reason: "The Hub portion shipped, while the pre-Factory gate design is obsolete and has no single successor spec."
---

# Projects ⇄ GitHub Repos + Software-Factory Gates

Status: SPEC — implementation starts at §8 phasing.
Module: `projects` (hub `/workforce/projects/[id]`), additive and **optional**.
Repos in scope for MINION org: `minion` (gw), `minion_hub`, `minion_site`, `drone`, `minion_plugins`, `paperclip-minion`, `pixel-agents`, `minion-meta`.

---

## 0. Product

**Problem.** A project in the hub knows its tasks, its agents and its money, but nothing
about the code those agents actually write. To see whether the work landed you leave the
hub, open GitHub, find the branch, read the PR. And the 4-gate discipline (Product →
Architecture → Program Design → Slices) currently lives nowhere — it is a habit in
`specs/*.md`, not a surface anyone can approve at.

**Success metric.** For a linked project, an owner can go from "what is my agent doing"
to "approved / changes requested" **without leaving the hub**, and the approval is visible
on GitHub as a real review (not a hub-only flag). Target: zero hub-local approval state —
100% of gate decisions readable from `gh pr view`.

**Announcement.** *Projects can now be linked to a GitHub repo. Open a project and you see
its branches, open PRs and recent commits, plus the software-factory gate each PR has
reached. Approve, request changes or comment straight from the project page — it posts a
real GitHub review, and the agent picks the decision up and keeps going. Nothing is
duplicated in the hub: GitHub stays the system of record for code, the hub stays the system
of record for work.*

**Screens.** One new tab on the existing project detail page (`…/[id]/repo`), plus a link
affordance on the project detail page when no repo is linked. No new top-level nav.

---

## 1. Findings (recon — read before planning)

| Fact | Evidence |
|---|---|
| Projects module is the system of record; execution is *derived* and linked by id in `metadata` | `pg-projects-schema.ts:14`; `projects.service.ts:339 workforceProjectIdOf()` reads `metadata.workforceProjectId` |
| Hub already talks to GitHub with a server PAT | `github-issues.service.ts:21` `env.GITHUB_TOKEN`, `fetchGitHub()` helper; `marketplace.service.ts:84` same token |
| Hub already has a HITL approve / request-changes primitive, but bound to workforce pipeline stages, not to code | `lib/workforce/pipeline-gate.ts` — `PipelineGateDecision = 'approve' \| 'request_changes'` |
| Hub already dispatches work to an agent | `projects.service.ts:177 dispatchToAgent()` → `workforceClientForOrg()` → paperclip issue |
| Hub runs on **Vercel** — no local filesystem, no git, no shell | `adapter-vercel`; `server/coding/aci-backend.ts` is an in-process file editor, not a remote exec bridge |
| The sandboxed clones live on **Netcup**, where the gateway runs — not where the hub runs | deploy topology (`ops/compose`), gateway swarm on Netcup |
| Project detail already carries a sibling tab pattern | `/workforce/projects/[id]/pipelines` — one route, one `screen()` manifest entry |
| No `worktree` support exists anywhere in hub or gateway | grep `worktree` → only `voice/visemeMap.ts`, `cli/update-cli/progress.ts` (unrelated) |

## 2. Goals and out of scope

**Goals**
- Link a `proj_project` to one GitHub repo. Zero DDL.
- Read surfaces: branches, open PRs, recent commits, PR checks — scoped to the linked repo.
- Write surfaces: **approve / request changes / comment** on a PR, via native GitHub review endpoints.
- Derive and display the 4 software-factory gates for a PR from repo state, not hub state.
- A gate decision optionally dispatches an agent to continue.
- Everything degrades to "not linked" / "not configured" without breaking the page.

**Non-goals**
- Not a git client. No merge, no push, no force-push, no branch delete from the hub.
- Not a PR review UI. Diffs stay on GitHub; we deep-link.
- No per-org GitHub App / OAuth install this round (see §7 ceiling).
- No webhooks this round — reads are on-demand and cached.

## 3. The worktree question (decision)

Worktrees are **local git state on the Netcup box**. GitHub's API has no worktree concept,
and the hub has no shell on that box. Two ways to surface them:

| | Approach | Cost | Verdict |
|---|---|---|---|
| A | Hub opens an SSH/exec bridge to Netcup | new credential path from a public Vercel function to a prod box, new attack surface, key management | **rejected** |
| B | Worktrees are *asked for*, not *executed*: the hub dispatches a workforce issue and the agent — which already has a shell on Netcup — reports back | reuses `dispatchToAgent()` verbatim | **chosen** |

Consequence: the Repo tab shows the **branch↔worktree intent** (which branches have an agent
run attached), and "create a worktree for this branch" is a dispatch, not an exec. Live
`git worktree list` output is out of scope until the gateway exposes a git tool.
This is stated in the UI, not silently omitted.

## 3b. Preview dev servers (WP-B)

Same constraint as §3 — the hub cannot exec on Netcup — but a start/stop button needs a
URL back synchronously, so the agent-dispatch answer does not work here. The box already
has everything needed: Docker (`minion/src/agents/sandbox/docker.ts`), a sandbox exec
runtime, and Caddy in front (`ops/caddy/Caddyfile`, `PUBLIC_HOST`).

**Design: a preview runner service on the box, and a thin hub proxy.**

The hub keeps the `workforceAvailable` pattern verbatim: if `PREVIEW_RUNNER_URL` is unset
or unreachable, the panel renders "preview runner not configured" and nothing else changes.
The runner is a **separate work package in the `minion/` repo** — the hub side ships first
against this contract.

### Runner contract (`PREVIEW_RUNNER_URL`, shared-secret auth header)

| Call | Body / result |
|---|---|
| `GET /previews` | `{ previews: Preview[] }` — everything currently running |
| `POST /previews` | `{ repo, branch, exposure: 'tailnet' \| 'public', command? }` → `Preview` |
| `DELETE /previews/{id}` | 204 |
| `GET /previews/{id}/logs?tail=200` | `{ lines: string[] }` |

```ts
type Preview = {
  id: string;
  repo: string;            // "NikolasP98/minion_hub"
  branch: string;
  status: 'starting' | 'running' | 'stopped' | 'failed';
  exposure: 'tailnet' | 'public';
  url: string | null;      // null until status === 'running'
  port: number | null;
  startedAt: string | null;
  lastError: string | null;
};
```

### Exposure (configurable per preview, default tailnet)

- **tailnet** — bind the container port on the Tailscale interface only. URL is
  `http://<netcup-tailnet-host>:<port>`. No public DNS, no cert, reachable from any device
  on the tailnet. **This is the default** — a dev server is unhardened by definition.
- **public** — Caddy routes `<slug>.preview.<PUBLIC_HOST>` to the container. Needs a
  wildcard cert for `*.preview.<PUBLIC_HOST>` and a dynamic upstream. Gated behind an
  explicit per-preview choice AND an org capability, never a default.

### Security (non-negotiable — this runs arbitrary repo code and opens a port)

1. The runner accepts only repos on an **allowlist** it holds (the MINION repos), never a
   repo name forwarded from the browser.
2. `command` defaults to the repo's declared dev command; a caller-supplied command is
   rejected unless the runner is explicitly configured to allow it. The hub never sends one.
3. One preview per (repo, branch); starting again returns the existing one.
4. Idle timeout (default 2h) and a hard cap on concurrent previews — a forgotten dev server
   is the failure mode here, not a malicious one.
5. Preview containers get **no production secrets**. They resolve their own env; the hub
   passes none.
6. `public` exposure requires `projects:manage` and is recorded in the audit log.

### Hub side (ships now)

- `src/server/services/preview-runner.service.ts` — typed client, `{ok,reason}` failure
  contract identical to §4.2, `previewRunnerAvailable()` capability probe.
- `POST /api/projects/[id]/preview` (start), `DELETE …/preview/[previewId]` (stop).
- Preview panel on the Repo tab: status dot, branch selector, exposure selector, the URL
  as a copyable deep link, Start/Stop, and last error when `failed`.

**Explicitly deferred to the runner WP:** the container lifecycle, Caddy wildcard config,
Tailscale binding, and log streaming. Marked in the UI, not silently missing.

## 4. Design

### 4.1 Link — zero DDL

Mirror `workforceProjectId` exactly:

```ts
// projects.service.ts
export type GithubRepoLink = { owner: string; repo: string; defaultBranch?: string | null };
export function githubRepoOf(p: Pick<ProjProject, 'metadata'>): GithubRepoLink | null;
export function setGithubRepo(ctx, projectId, link: GithubRepoLink | null, actor): Promise<void>;
```

Stored at `proj_projects.metadata.github`. Unlink = delete the key. Audited via the existing
`recordAudit` path (`op: 'link' | 'unlink'`, refType `proj_project`).

### 4.2 Server — one service, one token

`src/server/services/github-repos.service.ts`. All calls go through a shared
`githubFetch()` extracted to `src/server/services/github-api.ts` — `github-issues.service.ts`
switches to the shared helper in the same change (it is the same 25 lines).

| Function | GitHub endpoint | Notes |
|---|---|---|
| `listBranches` | `GET /repos/{o}/{r}/branches?per_page=50` | |
| `listPulls` | `GET /repos/{o}/{r}/pulls?state=open&per_page=30` | |
| `listCommits` | `GET /repos/{o}/{r}/commits?sha={branch}&per_page=30` | |
| `getPullDetail` | `GET …/pulls/{n}` + `…/pulls/{n}/reviews` + `…/commits/{sha}/check-runs` | one detail fetch |
| `submitReview` | `POST /repos/{o}/{r}/pulls/{n}/reviews` | `event: APPROVE \| REQUEST_CHANGES \| COMMENT` |
| `repoExists` | `GET /repos/{o}/{r}` | validates the link at set time |

Every read is wrapped in the existing `cached()` layer, **60s TTL**, key `d:gh:{org}:{o}/{r}:{kind}`
(custom keys go in `d:` — see `keys.hub`). Writes bust the PR keys for that repo.

**Failure contract:** the service never throws into a page load. Each read returns
`{ ok: true, data } | { ok: false, reason: 'not_configured' | 'not_found' | 'rate_limited' | 'error' }`.
The layout-load 500 hazard (unguarded `await` in a `load`) is why this is a hard rule.

### 4.3 Gates — derived, never stored

A gate is **not** new state. For a PR, the ladder is derived from repo facts:

```ts
// src/lib/workforce/factory-gates.ts  — pure, unit-tested, no I/O
export type GateId = 'product' | 'architecture' | 'program-design' | 'slices';
export type GateState = 'pending' | 'in_progress' | 'approved' | 'changes_requested';
export function deriveGates(input: {
  files: string[];                 // PR file paths
  labels: string[];                // PR labels
  reviews: { state: string; submittedAt: string; login: string }[];
}): Record<GateId, GateState>;
```

Rules, in order:
1. `gate:<id>:approved` label ⇒ `approved`. (Explicit beats inferred.)
2. Otherwise the PR's *current* gate is the highest gate whose doc exists in the PR's
   changed files (`docs/plans/**/01-product.md` → product, `02-architecture.md` →
   architecture, `03-program-design.md` → program-design, `04-slices.md` → slices).
3. The current gate takes the latest review state: `APPROVED` ⇒ `approved`,
   `CHANGES_REQUESTED` ⇒ `changes_requested`, else `in_progress`.
4. Gates below the current one are `approved`; gates above are `pending`.

So the gate ladder is a *view* of GitHub. There is nothing to migrate, nothing to
reconcile, and `gh pr view` remains the truth. A repo that does not use `docs/plans/`
shows a single "slices" gate and the tab still works.

### 4.4 Decision → agent

`POST /api/projects/[id]/repo/review`:

1. Validate the project is linked and the caller may write (existing RBAC).
2. `submitReview()` — the GitHub review is posted **first**. If it fails, nothing else happens.
3. On `approve`, if the project has an agent lead, `dispatchToAgent()` a task
   *"Gate `<id>` approved on PR #n — proceed to `<next>`"*. Best-effort, exactly like the
   existing dispatch (a failed dispatch never rolls back the review).
4. Bust the PR cache keys; return the new derived ladder.

`request_changes` and `comment` follow the same path with the review body as the agent's
instruction. **The GitHub review is the only durable record of the decision.**

### 4.5 UI

One route: `/workforce/projects/[id]/repo`, archetype `record-detail`, family `workforce`.
Reached from a tab next to the existing Pipelines link on the project detail page.

- **Unlinked:** an owner-only panel — org/repo input, validated against `repoExists`, with a
  suggestion list of the known MINION repos. Non-owners see "no repo linked".
- **Linked:** header (repo, default branch, deep link) + four sections:
  - **Pull requests** — the primary surface. Per PR: title, number, author, branch, checks
    rollup, and the **gate ladder** (4 chips). Selecting a PR opens the decision panel.
  - **Branches** — name, ahead/behind, last commit, whether an agent run is attached.
  - **Commits** — recent commits on the selected branch, deep-linked.
  - **Worktrees** — branches with a dispatched agent run, and a "request worktree" dispatch
    (§3). Labelled as intent, not live git state.
- **Decision panel** — approve / request changes / comment, required body for the latter
  two, mirroring `buildPipelineGateMutation`'s validation shape (non-empty, ≤ 4000 chars).

Design-token contract applies; `ui-design-governance` runs before any markup. All strings
via paraglide. `DataTable` for branches/commits (one `cell` snippet).

## 5. Acceptance criteria

1. A project with no `metadata.github` renders the Repo tab with a link form and never 500s.
2. Linking a repo that does not exist (or with no `GITHUB_TOKEN`) shows an inline error and
   does not persist.
3. With a repo linked, PRs / branches / commits render; second load within 60s hits cache.
4. Approving a PR from the hub produces a review visible via `gh pr view <n> --json reviews`.
5. Approve on a project with an agent lead creates a workforce issue; approve on one
   without does not error.
6. A GitHub outage (500 / rate limit) degrades each section to an inline notice; the page
   still renders the project header.
7. `deriveGates` is pure and covered: label-wins, doc-inference, review-state, no-docs repo.
8. `bun run lint:design && bun run lint:tokens` — debt does not increase.
9. Route contract: new `screen()` entry + any count assertions updated.

## 6. Verification

| Test | Asserts |
|---|---|
| `factory-gates.test.ts` | all four rules in §4.3, incl. `gate:*:approved` label overriding doc inference, and a PR with no `docs/plans/` files |
| `github-repos.service.test.ts` | `{ok:false}` on missing token / 404 / 403-rate-limit; never throws |
| `projects.service` link test | `githubRepoOf` round-trips; unlink deletes the key and leaves `workforceProjectId` intact |
| `repo/+page.server.ts` load test | unlinked project returns a page (no throw); GitHub failure returns `ok:false` sections |
| review endpoint test | review posted before dispatch; dispatch failure still returns 200 |

## 7. Known ceilings (stated, not solved)

- **Single global PAT.** `env.GITHUB_TOKEN` is one machine identity for all orgs. Fine for
  MINION org today; a second tenant linking a private repo would need a GitHub App
  installation per org. Upgrade path: swap `githubFetch`'s token resolution for a per-org
  lookup — the call sites do not change.
- **Reviews are attributed to the PAT's user, not the hub user.** The hub user is recorded
  in the review body (`Approved by <name> via Minion`) and in the audit log.
- **No webhooks.** State is pull-based with a 60s TTL; a PR approved on GitHub shows in the
  hub within a minute.
- **Worktrees are intent, not live state** (§3).

## 8. Phasing (each lands green independently)

- **Slice 1 — tracer bullet.** `githubRepoOf`/`setGithubRepo`, the route + link form, and a
  single read (open PRs) rendering. Proves the whole path end to end.
- **Slice 2 — reads.** Branches, commits, checks, caching, the `{ok,reason}` failure contract.
- **Slice 3 — gates.** `factory-gates.ts` + ladder UI. Read-only.
- **Slice 4 — decisions.** Review endpoint, decision panel, agent dispatch, cache busting.
- **Slice 5 — worktrees.** Branch↔run attachment + request-worktree dispatch.
- **Slice 6 — preview (hub side).** Runner client + capability probe + panel, degrading to
  "not configured". No runner yet — the panel tells the truth about that.
- **Slice 7 — preview runner (`minion/` repo, separate WP).** Container lifecycle, tailnet
  binding, Caddy wildcard for public exposure, idle reaper, logs.

## 9. Execution notes

- Do **not** add a module id to `MODULE_MANIFEST` — `/workforce/*` already covers this path.
  The tab is gated by the existing workforce availability, which is what "optional" means here.
- `uuidParamOr404(params.id)` on the new load, as the sibling routes do.
- Add the `screen()` entry to `route-design-manifest.ts` in the same commit as the route, or
  the contract test fails.
- Never log or return the token. Never echo a repo URL supplied by a user into a fetch
  without the `owner/repo` shape check (`/^[\w.-]+$/` on each half) — SSRF guard precedent
  is `server/services/ssrf-guard.ts`.
