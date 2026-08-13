# minion-factory — Containerized Agent Development Pipeline on Netcup

**Date:** 2026-08-12 · **Repo:** `NikolasP98/minion-factory` (new, private) · **Runs on:** Netcup box (Docker) · **Status:** implementing

## 0. Product

The autonomy slice the base.minion-ai.org roadmap promised: features developed by Claude Code (Codex later) running **in containers on the Netcup box**, one isolated workspace per run, every run opening a **draft PR immediately**, humans holding exactly the **two gates** the industry converged on (task approval before work starts, PR merge before anything ships). Built directly on the /research findings: draft-PR observability, budget caps instead of babysitting, curated playbooks instead of vector memory, Codex-style secret hygiene.

## 1. Architecture

```
workstation (factory CLI, tailnet) ──HTTP──▶ runner service (container on Netcup)
                                                 │  SQLite queue, concurrency cap
                                                 ▼ docker.sock (sibling containers)
                                            agent container (per run, throwaway)
                                              clone → branch → DRAFT PR → claude -p
                                              → self-test → push → ready-for-review
                                                 │
                                                 ▼
                                            GitHub PR  ◀── human merge gate
```

### Runner service (`runner/`)

Node 22 + TS + Express, SQLite (`better-sqlite3`). Deployed as one container with `/var/run/docker.sock` mounted (single-owner box; the socket is the accepted trade for docker-out-of-docker).

API (bearer `FACTORY_SECRET`, fail-closed — no secret configured means 503):

| Route | Purpose |
|---|---|
| `POST /runs` | `{repoId, task, title?, maxTurns?}` → queue a run (gate 1: only humans/authorized tools call this) |
| `GET /runs` | list, newest first |
| `GET /runs/:id` | status + metadata (branch, PR url, exit) |
| `GET /runs/:id/log` | log tail (`?n=200`) |
| `POST /runs/:id/cancel` | kill container |
| `GET /health` | unauthenticated liveness |

Queue: FIFO, `FACTORY_CONCURRENCY` (default 2) simultaneous containers. Budget caps per run: `--max-turns` (default 40) + wall clock (`FACTORY_RUN_TIMEOUT`, default 30 min) + docker `--memory 4g --cpus 2`. A dead/stuck agent leaves a log and a draft PR, not a hung box.

### Agent container (`agent/`)

Image: `node:22-bookworm-slim` + git + gh + ripgrep + bun + `@anthropic-ai/claude-code`. Runs as non-root `agent` user. Per-run env is least-privilege only: `GH_TOKEN` (repo-scoped PAT), `ANTHROPIC_API_KEY`, task metadata. **No production secrets, no DB URLs, no docker socket.** Container is destroyed after the run; logs persist on the host volume.

`run.sh` lifecycle:

1. `gh repo clone` (depth 50) → branch `factory/<runId>-<slug>`
2. Empty commit + push + **open draft PR immediately** (observability surface: humans can watch/interrupt from GitHub at any point)
3. Write task brief + repo playbook to `FACTORY_TASK.md`; run `claude -p` headless (`--dangerously-skip-permissions` is sound *inside* the throwaway container, which is the sandbox) with the turn budget
4. Run the repo's registered self-test command (research: "self-test before handoff"); on pass → push + mark PR ready-for-review; on fail → push anyway, leave draft, comment the failure tail on the PR
5. Always: comment run summary (turns used, test result, log pointer)

### Registry & playbooks (`runner/src/repos.ts`, `playbooks/`)

Per-repo config: `slug`, `base`, `setup`, `selfTest`, `playbook`. Launch allowlist is deliberately small: **minion-base** (low stakes, has lint:design + svelte-check gates) and **minion_site** (`dev` base). Gateway/hub join after the pipeline earns trust. Playbooks are curated markdown injected into the prompt (per-repo rules the agent must honor: design governance, scoped commits, gates).

### Gates (unchanged from factory-gates spec 2026-08-07)

Gate state is **derived from the PR, never stored**. The runner never merges, never pushes to protected branches, and starts nothing on its own. Telemetry-to-task and scheduled chore agents are a later slice and will still enter through `POST /runs`.

## 2. Deploy

`docker-compose.yml` on the box at `/opt/factory`: runner container + prebuilt agent image. Secrets live in `/opt/factory/.env` (mode 600, written over SSH, never committed). Runner listens on tailnet interface only (`100.80.222.29:3210`) — no public exposure; the workstation CLI and future base.minion-ai.org integration reach it over Tailscale (Vercel-side integration deferred; it needs funnel/Caddy exposure and its own auth story).

## 3. Non-goals (this pass)

- Codex runners (image hooks exist; Claude first)
- Auto-triggered runs from telemetry/issues (gate 1 stays human)
- base.minion-ai.org /factory page (needs public API exposure decision)
- Multi-box scheduling, rootless podman migration

## 4. Acceptance

One real run end-to-end: `factory run minion-base "add /api/health endpoint"` → draft PR appears within a minute, agent commits land on the branch, self-test (lint:design + svelte-check + build) passes, PR flips to ready, human merges (or closes). Box load stays bounded by concurrency cap.
