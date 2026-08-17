---
id: 2026-08-17-cloud-agent-memory-sync-spec
title: "Cloud agent memory — git-backed durable memory + B2 bulk sync, shared by claude/codex/factory"
stage: spec
status: approved
pass: 1
created: 2026-08-17
updated: 2026-08-17
repos: [minion-meta, minion-factory]
verdict: approved
tags: [infra]
type: infra
---

# Cloud agent memory — where and how

**User mandate (verbatim, 2026-08-17):** "evaluate how/where to store memories in the cloud. (via backblaze?); I want all my local agents to connect to the remote cloud and basically save a local copy (currently being done) as well as a cloud copy of all memories. Find the best workflow for the spec agent to use it. Claude-mem uses hooks and tools/skills to read/write memories, and I want both claude and codex to be configured with this memory system so that they can leverage past experiences with their current tasks."

## 0. What exists (measured 2026-08-17)

| Store | Size | Content | Consumers today |
|---|---|---|---|
| `~/.claude/projects/<proj>/memory/` | 4.2 MB | Curated markdown topic files + MEMORY.md index | Claude Code sessions (auto-loaded index) |
| `~/.claude-mem/` | 2.4 GB | sqlite observations DB + chroma vector index + corpora | claude-mem MCP search (claude), codex via `codex/plugins/claude-mem` wrapper |
| rclone remotes | — | synology, gdrive, gshared, netcup-minion (NO B2 yet) | — |
| B2 account | — | hub file storage (`B2_*` env) — no memory bucket, no scoped key | hub uploads |

## 1. Storage evaluation

| Criterion | Private **git repo** | **Backblaze B2** (S3 API) | Box (netcup rclone) | Supabase storage |
|---|---|---|---|---|
| Curated markdown (4 MB, high-churn text) | **Best**: versioned, mergeable, diffable, blame = provenance | blob overwrite, no merge | ok, no history | blob, no merge |
| claude-mem DB (2.4 GB binary, single-writer) | wrong tool (git bloat) | **Best**: cheap ($0.006/GB/mo ≈ $0.015/mo), incremental rclone | good, but a VPS is not durable offsite storage | works, pricier |
| Auth already held by every agent | **Yes — GH token everywhere** (local claude, codex, factory containers) | needs a new scoped app key (user creates once) | ssh key (local only; NOT in factory containers) | service key |
| Factory/spec-agent read path | trivial — same `contents` API the runner already uses for specs | needs creds in containers (widens blast radius) | no | needs creds |
| Conflict story (multi-agent writes) | pull --rebase + file-level merge; text merges cleanly | last-writer-wins silently loses | LWW | LWW |

**Decision: hybrid.**
- **Curated markdown memory → private git repo `minion-agent-memory`.** This is the memory agents actually *leverage* cross-machine and cross-harness; git is strictly better than object storage for it, and every consumer already authenticates to GitHub. Backblaze adds a credential surface for zero gain on this tier.
- **claude-mem bulk store (sqlite + chroma) → B2** `b2://minion-agent-memory-bulk/claude-mem/`, incremental `rclone sync`, nightly. It is single-writer (this machine), so LWW is correct, and 2.4 GB is what object storage is for. **Blocked on one user action:** create a B2 bucket + app key scoped to it (never reuse the hub file-storage key). Until then, the same rclone job targets `netcup-minion:` as the interim offsite copy — works today with zero new credentials.

## 2. Repo layout + sync workflow

```
minion-agent-memory/            (private)
  MINION/                       ← ~/.claude/projects/-home-nikolas-Documents-CODE-MINION/memory/
    MEMORY.md                   ← index (small, always read first)
    *.md                        ← topic files
  <other-project-slug>/...      ← same pattern per project dir that opts in
  README.md                     ← consumer contract (read order, write rules)
```

- `scripts/memory-sync.sh` (lives in the memory repo, installed at `~/.local/bin/memory-sync`): `commit-all → pull --rebase → push`, per-file merge; on rebase conflict prefer BOTH-hunks union for `.md` (append-biased — memory loss is worse than duplication; dedupe is the index's job).
- **Claude Code**: SessionStart hook pulls (fast-forward only, 2s timeout, offline-safe no-op); the existing Stop/PreCompact auto-save flow gains a final `memory-sync push` step.
- **Codex**: same script wired into `~/.codex/hooks.json` lifecycle hooks (the claude-mem parity wrapper already establishes this pattern).
- Secrets rule: sync NEVER adds new files outside the memory dirs; `.gitignore` in the repo blocks `*.env`, key-shaped patterns; the existing "no secrets in memory" rule stands.

## 3. Spec-agent (and dev-agent) leverage workflow

The factory's spec/dev containers hold `FACTORY_GH_TOKEN` already — memory becomes one more `contents` fetch, exactly like `FACTORY_SPEC.md`:

1. `spec.sh`/`run.sh` fetch `MINION/MEMORY.md` from `minion-agent-memory` and write it to the workdir as `AGENT_MEMORY_INDEX.md`.
2. The stage prompt gains: *"AGENT_MEMORY_INDEX.md is the operator's durable memory index. Before designing, fetch (via the GitHub contents API) the 1–3 topic files whose index lines mention this repo, this subsystem, or the failure class you're working on. Treat ★★★ items as hard constraints. Cite the memory file when a constraint shapes a decision."*
3. Write-back is **not** given to factory agents (single-writer discipline: only interactive sessions write memory; factory runs leave open ends as proposals — the handoff-ledger already covers that lane).

## 4. Slices

| # | Slice | Where |
|---|---|---|
| 1 | Create private repo, initial push of the MINION memory dir, README contract, `memory-sync.sh` | manual/interactive (done by orchestrator) |
| 2 | Claude + codex hook wiring on this machine | manual/interactive |
| 3 | Factory: memory-index injection into spec + dev prompts (`spec.sh`, `run.sh`) | minion-factory |
| 4 | claude-mem bulk rclone job (netcup now, B2 when key exists) + nightly cron | manual/interactive |
| 5 | B2 bucket + scoped app key (USER ACTION) → flip rclone target | user |

**Out of scope:** multi-writer vector DB sync (chroma stays single-machine); embedding the 2.4 GB store into containers; any memory UI.

## 5. E2E verification
(1) Edit a memory file locally → within one session cycle it appears in the repo; clone on a second machine reproduces the index. (2) A factory spec run's log shows it fetched a topic file relevant to its repo and the spec cites it. (3) Kill the network: hooks no-op within their timeout, session works normally. (4) rclone job restores `claude-mem.db` byte-identical on a scratch path.
