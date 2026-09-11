# AGENTS.md — Minion Meta-Repo Orchestrator Hub

This is the **Minion meta-repo** — a self-hosted personal AI assistant platform with orchestration tooling, shared packages (`@minion-stack/*`), and specs at the root, with independent subprojects registered in `minion.json` and additional runtime/documentation checkouts. The six CLI registry entries are not the complete platform inventory. The agent operating from this directory is the **orchestrator**: it has full knowledge of every subdirectory, connects concepts cross-project, and dispatches subagents with the right context.

## Project Map

The branch column records registry/conventional targets, not the current local branch or deployed revision. Check `minion.json`, each repository and its release workflow before dispatch. Factory (`minion_factory/`), Base (`minion_base/`), Drone (`drone/`), LangGraph (`langgraph-server/`) and the Shells bridge (`packages/shells-bridge/`) also participate in runtime work; inspect their own instructions and package manifests. `node scripts/qc/repo-truth.mjs` records a local source inventory without reading secrets or certifying deployment.

| Directory | What | Stack | Git Branch | Own Instructions |
|---|---|---|---|---|
| `minion/` | Core gateway + CLI (pnpm monorepo) | pnpm 10.x, Node 22+, TS, tsdown | `DEV` | `.dmux-hooks/CLAUDE.md` |
| `minion_hub/` | Web dashboard for gateway management | Bun, SvelteKit 2, Svelte 5, Tailwind 4 | `dev` | `CLAUDE.md` |
| `minion_site/` | Marketing site + members dashboard | Bun, SvelteKit 2, Svelte 5, Tailwind 4 | `master` | `CLAUDE.md` |
| `minion_plugins/` | Claude Code plugin marketplace | — | `main` | — |
| `Minion Docs/` | Agent registry, profiles, docs, sprints (was `docs/`; renamed by Synology Drive sync 2026-08-05) | YAML + Markdown | `main` | `CLAUDE.md` |
| `paperclip-minion/` | Control plane for AI-agent companies | pnpm, Express, React + Vite, Drizzle + PGlite | `minion-integration` | `AGENTS.md` |
| `pixel-agents/` | VS Code extension — pixel art office for Claude agents | npm, esbuild, React webview | `main` | `CLAUDE.md` |
| `ai-studio/` | Research/product studio (AI course workspace) | Docs only | — | `CLAUDE.md` |

**Always read the sub-project's CLAUDE.md or AGENTS.md before working in it.**

## Meta-repo Workflow

The `minion` CLI (`@minion-stack/cli` npm package, binary `minion`) orchestrates every subproject with resolved env vars. Install once: `npm install -g @minion-stack/cli` (or `pnpm add -g @minion-stack/cli`).

### Verify the CLI identity

Both the gateway and the meta orchestrator use the binary name `minion`. Before using the registry commands, check `minion --help`: the orchestrator describes itself as "Minion meta-repo CLI" and exposes `list`, `doctor` and `sync-env`. If PATH resolves the gateway CLI, use `node packages/cli/dist/index.js <command>` from the built meta checkout. `node packages/cli/dist/index.js --help` and `list --json` are read-only identity checks. Rebuild the package with its declared build command if the dist output is absent or stale; do not overwrite another CLI installation as an implicit repair.

## Codex Memory Parity

This repo carries Codex parity artifacts under `codex/` so Codex can use the same durable-memory patterns as Claude without changing Claude's workflow:

- `codex/plugins/claude-mem/` wraps the existing `claude-mem` runtime for cross-session memory search through MCP and Codex root-level `hooks.json` lifecycle hooks.
- `codex/skills/mempalace-memory/` documents the installed `mempalace` CLI workflow and this repo's `mempalace.yaml` room map.
- `codex/skills/lessons-learned/` ports the post-task observation workflow.

Use these when the user asks about prior-session context, durable memory, project wake-up context, or lessons learned. Do not save secrets, raw credentials, or unrelated transcript bulk into memory.

## Curated Engineering Skills

The canonical interactive bundle lives in `minion_plugins/plugins/minion-engineering/`. Run `scripts/sync-minion-engineering-skills.sh` after updating it to install the project-local skills for Claude, Cursor, and Codex and to copy the advisory prose auditor into `minion_factory/agent/skills/`. Local project instructions always win; the prose auditor is advisory and has no rewrite, verdict, or merge authority.

### Core commands

| Command | Use |
|---|---|
| `minion list` | Print subproject registry (6 ids: minion, hub, site, paperclip, pixel-agents, plugins) |
| `minion dev <id>` | Launch subproject's dev command with the 6-layer env merge applied |
| `minion dev --all` | Parallel fanout (concurrently) across subprojects that declare a dev command |
| `minion build <id>`, `minion test <id>`, `minion check <id>` | Same pattern for build/test/check |
| `minion status` | Tabular git status across all subprojects |
| `minion doctor` | Env validation + Infisical auth + bin availability health report |
| `minion sync-env <id>` | Write merged env to `<sub>/.env.local` (useful when running subproject's native command) |
| `minion branch <id>` | Short current branch (for shell prompts) |

Full command reference: `minion --help` or the `@minion-stack/cli` README.

### Env hierarchy (6 layers, lowest → highest precedence)

1. `<meta-root>/.env.defaults` — meta-repo shared non-secret defaults
2. Infisical project `minion-core` — shared secrets (Anthropic, OpenRouter, GitHub PAT, etc.)
3. `<subproject>/.env.defaults` — per-subproject non-secret defaults
4. Infisical project `minion-<name>` — per-subproject secrets
5. `<subproject>/.env.local` — gitignored dev escape hatch
6. Shell `process.env` — wins

Configure Infisical auth once via Universal Auth machine identity. Export `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` + `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` in your shell (or put in `~/.config/minion/infisical-auth.json`, mode 0600). The `minion doctor` command reports status.

### Shared packages (`@minion-stack/*`)

Published to npm under the `@minion-stack` scope. Independent semver via Changesets.

| Package | Purpose |
|---|---|
| `@minion-stack/cli` | The `minion` bin (this workflow's entrypoint) |
| `@minion-stack/env` | 6-layer env resolver (wraps Infisical CLI) |
| `@minion-stack/tsconfig` | Base / node / svelte / library TS configs |
| `@minion-stack/lint-config` | oxlint + flat-ESLint + Prettier presets |
| `@minion-stack/shared` | See the README package inventory; gateway surfaces are consumed by hub, site, and paperclip |
| `@minion-stack/db` | Shared Drizzle exports: legacy `/schema`, PostgreSQL `/pg`; inspect the owning migration tree before changing a physical schema |
| `@minion-stack/auth` | Better Auth `createAuth()` factory for surviving legacy paths; current Hub browser identity is Supabase, and Site selects its provider in server hooks |

Releases are automated: merges to `main` with `.changeset/*.md` trigger a "Version Packages" PR via `changesets/action`; merging that PR publishes to npm.

### CI & Release Automation

The meta-repo ships two GitHub Actions workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | PR to main, push to main | Runs `pnpm run build-all`, `typecheck-all`, `lint-all`, `test-all`, and `changeset:status` on every PR |
| `.github/workflows/release.yml` | Push to main | Uses `changesets/action@v1.7.0` to open a "Version Packages" PR when changesets are present; publishes `@minion-stack/*` to npm when that PR is merged |

Root scripts that fan out across workspace packages:

| Script | What |
|---|---|
| `pnpm run build-all` | `pnpm -r run build` (sequential — dependency-order) |
| `pnpm run typecheck-all` | `pnpm -r --parallel --if-present run typecheck` |
| `pnpm run lint-all` | `pnpm -r --parallel --if-present run lint` |
| `pnpm run test-all` | `pnpm -r --parallel --if-present run test` |
| `pnpm run ci` | build-all → typecheck-all → lint-all → test-all → changeset:status |
| `pnpm run changeset` | Interactive changeset authoring |

Release tokens and secrets: `NPM_TOKEN` (automation type) must be set as a GitHub repo secret — see `.planning/phases/08-polish-automation/NPM_TOKEN-SETUP.md` for one-time setup.

### Subprojects stay independent

Each subproject remains its own git repo with its own remote, branch, package manager, and deploy pipeline. The meta-repo's `.gitignore` excludes all subproject directories — meta-repo only tracks orchestration/specs/packages.

Design spec: [`specs/2026-04-19-minion-meta-repo-design.md`](specs/2026-04-19-minion-meta-repo-design.md).

## Architecture Overview

### Cross-Project Data Flow

```
@minion-stack/shared     ← Protocol types (frames, agents, sessions, chat events) + WS client
  ├──→ minion_hub/       ← Imports types + WS utils for dashboard
  ├──→ minion_site/      ← Imports types + WS utils for members area
  └──→ paperclip-minion/ ← openclaw_gateway adapter consumes the shared WS client

minion/ (gateway)
  ├── WebSocket server  ←──→  minion_hub/ (dashboard connects via WS)
  ├── WebSocket server  ←──→  minion_site/ (members area connects via WS)
  ├── Channel extensions (telegram, discord, slack, etc.)
  └── REST API + CLI

minion_hub/ ←──shared schema packages──→ minion_site/
  (PostgreSQL + legacy LibSQL consumers; provider and session configuration vary)
```

### Gateway Protocol

All frontends connect to the gateway via WebSocket using a custom JSON frame protocol with three frame types: `req`, `res`, and `event`. Types and the WS client live in `@minion-stack/shared` (consumed by hub, site, and paperclip's `openclaw_gateway` adapter).

Connection flow: WS connect → `connect.challenge` event → `connect` request with token → authenticated session.

### Multi-Tenant Database

Hub uses PostgreSQL/Supabase for current domain and identity paths, alongside surviving LibSQL/Turso access. `minion_hub/src/server/db/pg-client.ts` and `pg-pool.ts` own the PostgreSQL client (`SUPABASE_DB_URL`); `db/client.ts` owns legacy `TURSO_DB_URL` access with a local SQLite default. A local SQLite file alone does not initialize the full Hub. Site also retains legacy LibSQL and conditionally selects Supabase with `AUTH_PROVIDER=supabase`; otherwise its hooks use Better Auth. Verify the actual deployment selection rather than inferring it from installed packages.

Shared legacy tables are exported by `packages/db/src/schema/`; shared PostgreSQL tables by `packages/db/src/pg/schema/`. Hub also has domain declarations under `src/server/db/pg-schema/` and `pg-*-schema.ts`. Source declarations are not a physical table count or migration-ownership certificate. Verify the applied catalog and owning migration ledger before changes.

## Subproject Details

### minion/ — Gateway + CLI

`@nikolasp98/minion` — Multi-channel AI gateway. Read `minion/package.json` and the exact registry/image receipt for source and released versions.

**Structure**: pnpm monorepo with workspaces: root `.`, `ui`, `packages/*`, `extensions/*`.

**Source** (`src/`): `agents/`, `auth/`, `channels/`, `cli/`, `config/`, `db/`, `dispatch/`, `events/`, `gateway/`, `health/`, `hooks/`, `routing/`, `security/`, `sessions/`, `tools/`, `tts/`, `voice/`, `web/`, `wizard/`, plus entry points `index.ts` and `entry.ts`.

**Apps**: `android/`, `ios/`, `macos/`, `shared/` (native wrappers).

**Extensions** (45+): agent-switcher, bluebubbles, copilot-proxy, device-pair, diagnostics-otel, discord, feishu, google-antigravity-auth, googlechat, google-gemini-cli-auth, imessage, irc, line, linq, llm-task, matrix, mattermost, memory-core, memory-lancedb, minimax-portal-auth, msteams, nextcloud-talk, nitter, nostr, notion-auth, openai-codex-auth, openclaw-zh-cn-ui, open-prose, phone-control, qwen-portal-auth, shared, signal, slack, squid, talk-voice, telegram, thread-ownership, tlon, twitch, voice-call, wati, whatsapp, zalo, zalouser.

**Build**: `tsdown` + custom scripts. Has Docker support (Dockerfile, docker-compose.yml, sandbox variants).

**CI/CD**: dmux hooks system for AI-powered dev workflows (worktrees, pane lifecycle, merge hooks).

```bash
pnpm install && pnpm build     # Install + build
pnpm dev                       # Watch mode
pnpm gateway:watch             # Gateway dev with auto-reload
pnpm test                      # Unit tests (vitest)
pnpm check                     # Lint + format (oxlint + oxfmt)
pnpm tsgo                      # TypeScript type-check
```

### minion_hub/ — Dashboard

SvelteKit 2 web dashboard for managing AI agent gateways. Connects via WebSocket, provides UI for agents, sessions, chat, reliability metrics, config editing, marketplace, flow editor, and workshop canvas.

**Routes** (`src/routes/(app)/`): builder, config, flow-editor, marketplace, my-agent, reliability, sessions, settings, users, workshop/[id].

**State** (`src/lib/state/`): Svelte domain modules with per-domain barrels. Inspect the current directory for names and ownership; avoid caching the module count in instructions.

**Key tech**: PixiJS 8 + Rapier2D physics (workshop canvas), Zag.js headless UI components, TanStack Svelte Table, ECharts, Yjs (CRDT), Carta-md, Fuse.js search, PostHog analytics, Resend email.

**Workshop canvas**: PixiJS 8 + Rapier2D physics. Agents rendered as sprites with spring joints. Mounted via Svelte action (`use:pixiCanvas`).

```bash
bun run dev          # Dev server
bun run build        # Production build
bun run check        # Type-check
bun run db:status    # Inspect migration status against the configured DB
```

### minion_site/ — Marketing + Members

Marketing landing + authenticated members dashboard. Deployed on Vercel.

**Routes**: `(marketing)/` — prerendered landing, privacy, terms. `(app)/` — login, register, members (auth-protected).

**Tech**: Paraglide i18n (EN/ES), provider-selected Supabase/legacy Better Auth, shared protocol packages and ECharts. Package declarations alone do not prove that optional visual or telemetry libraries are wired.

```bash
bun dev              # Dev server
bun run build        # Production build
bun run check        # Type-check
```


### Minion Docs/ — Agent Registry + Project Docs

Contains agent definitions, deployment profiles, architecture docs, competitive research and sprint plans. Inspect `Minion Docs/agents/` for current scopes/counts; definitions in a registry do not establish deployed agents.

**Agent format**: YAML frontmatter + markdown body at `agents/<scope>/<category>/<agent-id>/agent.md`.

**Profiles** (`profiles/`): appointment-scheduler, content-creator, customer-support, data-analyst, main-orchestrator, personal-assistant.

**Docs**: `architecture/` (system design), `research/` (fork ecosystem), `sprints/` (Parts 1-12), `automation/` (deployment), `product/` (user guide, changelog).

**Navigation**: Every directory has `context.md` as navigable index.

### paperclip-minion/ — Control Plane

Paperclip is a control plane for AI-agent companies. Currently on `minion-integration` branch.

**Packages** (`packages/`): `adapters/` (Claude, Codex, Cursor adapter implementations), `adapter-utils/`, `db/` (Drizzle schema + PGlite for dev), `shared/` (types, validators, API paths), `plugins/`.

**Server**: Express REST API + orchestration services (`server/`).
**UI**: React + Vite board UI (`ui/`).
**CLI**: `cli/` — Paperclip CLI tool.
**Docs**: Mintlify-powered docs — tracked in the docs project (`Minion Docs/paperclip/`), not in this repo.
**Tests**: Vitest + Playwright E2E + Promptfoo evals.

```bash
pnpm install && pnpm dev    # Auto-starts API + UI at localhost:3100
pnpm test:run               # Vitest
pnpm test:e2e               # Playwright E2E
```

### pixel-agents/ — VS Code Extension

VS Code extension: pixel art office where Claude Code agents are animated characters. Extension backend (Node.js) manages terminals, JSONL parsing, agent lifecycle. Webview (React + Vite) renders isometric office with character FSMs, pathfinding, and canvas editor.

**Extension** (`src/`): extension.ts, PixelAgentsViewProvider.ts, agentManager.ts, assetLoader.ts, fileWatcher.ts, transcriptParser.ts, timerManager.ts, layoutPersistence.ts.

**Webview** (`webview-ui/src/`): React app with office engine (gameLoop, renderer, characters FSM), layout editor, sprite system, wall auto-tiling.

**Scripts**: 7-stage asset extraction pipeline for tileset processing.

### ai-studio/ — Research Studio

Research workspace for an AI course. Docs-only — no production code. Uses the Minion project as a live testbed for agentic techniques (tool use, multi-agent coordination, memory, planning).

**Structure**: `context/` (briefs), `vault/` (knowledge), `reports/` (analysis), `product-thinking/` (PRDs), `class content/` (course materials + presentations).

## Root-Level Files

| File/Dir | Purpose |
|---|---|
| `00_START_HERE.md` | Entry point for A3 retention research (March 2026) |
| `A3_*.md`, `RETENTION_*.md`, `KPI_*.md` | One-time retention benchmark research artifacts |
| `Minion Docs/` | The docs project (own git repo) — formerly the `DOCS` symlink → `~/Documents/VAULT/MINION`; moved here by Synology Drive sync 2026-08-05. Per-project doc trees live at `Minion Docs/minion_site/` and `Minion Docs/paperclip/` |
| `agents/` | Empty dir with `.claude/settings.local.json` |
| `.env` | API keys (Anthropic, OpenRouter, GitHub PAT, gateway token) |
| `mascot.png` | Project mascot image |

## Deployment

| Project | Hosting | Config |
|---|---|---|
| minion_hub | Vercel | SvelteKit adapter-vercel |
| minion_site | Vercel | SvelteKit adapter-vercel |
| minion (gateway) | Docker / Fly.io / self-hosted (Netcup VPS) | Dockerfile, docker-compose.yml, fly.private.toml |
| paperclip-minion | Docker / self-hosted | Dockerfile, docker/ configs |

## Commands Quick Reference

| Project | Dev | Build | Test | Check |
|---|---|---|---|---|
| minion/ | `pnpm dev` | `pnpm build` | `pnpm test` | `pnpm check` |
| minion_hub/ | `bun run dev` | `bun run build` | `bun run test` | `bun run check` |
| minion_site/ | `bun dev` | `bun run build` | — | `bun run check` |
| paperclip-minion/ | `pnpm dev` | `pnpm build` | `pnpm test:run` | `pnpm typecheck` |

## Orchestration Guide

### Dispatching Subagents

When sending work to a subproject, always include:
1. The subproject path and its CLAUDE.md or AGENTS.md location
2. The current git branch (see Project Map above)
3. Relevant cross-project context (e.g., "this touches the WS protocol — changes must be reflected in @minion-stack/shared, hub, site, and paperclip's openclaw_gateway adapter")

### Cross-Project Impact Zones

| Change Type | Projects Affected |
|---|---|
| Gateway protocol (frame types, events) | `packages/shared/` → `minion_hub/` + `minion_site/` + `paperclip-minion/` (openclaw_gateway adapter) |
| Channel extension (new/modify) | `minion/extensions/<channel>/` + `minion/src/channels/` |
| DB schema change | `packages/db/src/schema/` + `packages/db/src/pg/schema/` + Hub domain schema consumers; verify the physical migration owner before applying changes |
| Agent definition format | `Minion Docs/agents/` → `minion_hub/` (marketplace) → `minion/` (runtime) |
| Auth changes | `minion_hub/src/server/auth/` + `minion_site/src/hooks.server.ts` + surviving `src/lib/auth/` paths (provider-specific authority) |
| Workshop/canvas | `minion_hub/src/lib/workshop/` + `minion_hub/src/lib/components/workshop/` |
| Pixel office | `pixel-agents/src/` (extension) + `pixel-agents/webview-ui/src/` (React) |
| Paperclip adapters | `paperclip-minion/packages/adapters/` + `paperclip-minion/server/` |

### Key Conventions

- **UI design governance (hub + site)**: ALL UI work follows the design-token contract — `packages/design-tokens/contract.json` is machine truth, `specs/2026-07-13-hub-ui-coherence-implementation-spec.md` §D2 is naming law. Before touching any UI, invoke the `ui-design-governance` skill (`.claude/skills/ui-design-governance/SKILL.md`). Semantic tokens only; after UI edits run `bun run lint:design && bun run lint:tokens` (debt may only decrease).
- **TypeScript** strict mode everywhere. Avoid `any`. Never add `@ts-nocheck`.
- **Svelte 5 only** (hub + site): runes, snippets (`Snippet` type for children), `onclick={}` syntax. No legacy Svelte 4 patterns.
- **Formatting**: minion/ uses oxlint + oxfmt. SvelteKit projects use svelte-check.
- **Package managers**: pnpm for the meta-repo root, `minion/`, and `paperclip-minion/`. Bun for SvelteKit projects (`minion_hub/`, `minion_site/`). npm for `pixel-agents/`. Don't mix within a subproject.
- **Naming**: "Minion" for product/docs headings; `minion` for CLI/package/paths.
- **Git workflow**: Feature branches → dev/DEV → main/master. Use worktrees for isolation. Never commit directly to main.
- **Multi-agent safety**: Don't touch git stash, worktrees, or switch branches unless explicitly asked. Scope commits to your changes only.
- **Open-items ledger (agent handoff)**: finishing a task while leaving ANY open end — unwired implementation, known bug, hardcoded value, missing edge-case handling, skipped/weak test — requires documenting it TWICE before you stop: (1) an in-code `TODO(handoff): <what, why, pointer>` comment at the exact site, and (2) a proposal in the meta-repo `proposals/` (new file or append to the matching open one). Undocumented open ends are defects, not shortcuts — the maintenance pipeline (base.minion-ai.org) consumes this ledger; what is not written down never gets fixed.

## Browser automation

- Use the `browser-harness` skill for every web interaction. Never launch visible Chromium or use `hyprctl dispatch workspace`, `focuswindow`, `grim`, `wtype`, or `ydotool` for browser inspection unless the user explicitly requests foreground control.
- The invisible single-agent default is the dedicated headless Chromium at `BU_CDP_URL=http://127.0.0.1:9223`. Run `browser-harness-session background` if it is unavailable; do not fall back to the user's interactive browser.
- The default local daemon is single-owner. When browser work is concurrent, when the user may need to watch or intervene, or when login is likely, start one isolated Browser Use cloud browser per agent with `browser-harness-session watch minion-<short-unique-task>`. Give the user the printed `LIVE_URL`; never open it automatically.
- Use the same unique `BU_NAME` prefix on every Browser Harness call for that task. Never share a `BU_NAME`, tab, browser process, or default daemon between concurrent agents. Isolation is per browser, not merely per tab or tab group.
- At a login, MFA, consent, or ambiguous account gate, pause browser actions, keep the named browser alive, and ask the user to intervene through its `LIVE_URL`. Continue in the same session after the user confirms.
- Ask before stopping a cloud browser because its live intervention session will end; stop an approved session with `browser-harness-session stop <name>`. Treat live URLs as private ephemeral access links and never commit them.
- Lightpanda is an explicit opt-in accelerator for DOM-first, screenshot-independent flows only. It is not the default or a drop-in replacement for Chromium: verify the target workflow first, and fall back to isolated Chromium for visual checks, unsupported Web APIs, complex authentication, or user intervention.
- To redirect an already-running agent, run `browser-harness-session redirect <unique-name>` and send the resulting instruction to that agent. Existing sessions do not automatically reload changed instructions.

## Environment

Key variables (see `.env.example` in each project):

- `ANTHROPIC_API_KEY` — Claude API
- `MINION_GATEWAY_TOKEN` — Gateway auth
- `TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN` — Database (production)
- `BETTER_AUTH_SECRET` — Auth secret
- `B2_*` — Backblaze B2 file storage (hub)
- Channel-specific tokens (TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, etc.)


## Honesty & Accuracy Rules

You are committed to honesty and accuracy above all else. Follow these rules in every response:

1. **UNCERTAINTY** — If you are not fully certain about a fact, say so clearly. Use phrases like "I'm not certain, but...", "You should verify this...", or "I may be wrong here, but...". Never state uncertain things as facts.
2. **SOURCES** — Do not invent paper titles, URLs, or book references. If you cannot name a real, verifiable source, say so. It is better to admit you don't know the source than to fabricate one.
3. **STATISTICS & NUMBERS** — Flag any statistic you are not 100% confident in. Say "I believe this is approximately..." and recommend the user verify it from an official or primary source.
4. **RECENT EVENTS** — Remind the user when a topic may have changed since your knowledge cutoff. Do not guess at current events or present outdated info as current.
5. **PEOPLE & QUOTES** — Never attribute a quote to a real person unless you are certain they said it. If unsure, say "I cannot confirm this quote is accurate."


<claude-mem-context>
# Memory Context

# [MINION] recent context, 2026-09-02 12:37am GMT-5

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 25 obs (15,827t read) | 371,098t work | 96% savings

### Aug 28, 2026
36113 2:42a 🟣 S2 retry queued with recalibrated turn budget and orientation shortcuts
36114 " 🔵 S2 retry succeeded at develop but exhausted fix-round budget; supervisor auto-spawned replacement
36115 3:06a 🔵 S2 auto-fix review converged to single High-severity finding on resolver scope guard
36116 3:30a 🔵 S2 escalated review uncovered three architectural security vulnerabilities in resolver scope enforcement
36117 7:35a ⚖️ Factory S2 runner-owned enforcement architecture directive
S7184 Shell availability check - subagent probe for slice supervision capability (Aug 28, 11:20 AM)
S7181 S2 architecture checkpoint - documented findings and directive in strategy file (Aug 28, 11:20 AM)
S7182 Shell availability check - subagent probe for slice supervision capability (Aug 28, 11:20 AM)
S7183 Shell availability check - subagent probe for slice supervision capability (Aug 28, 11:20 AM)
S7187 Status check - comprehensive session progress report (Aug 28, 11:21 AM)
36176 12:42p ⚖️ Supervised disposition denies PR #130 merge, requires fresh bounded slice
36177 " ✅ S2 runner-owned enforcement requirements codified into spec as gate note
36178 " ✅ S2b run queued with runner-owned enforcement requirements
36179 12:44p ✅ S2b restart and release train self-healing documented in strategy file
S7190 Analyze FACES clinic supply consumption data files from analyst for importing into minion_hub stock/catalog modules (Aug 28, 1:19 PM)
36218 2:02p 🔵 FACES clinic data integration methodology identified
36219 2:03p 🔵 FACES clinic Excel data structure and minion_hub schema exploration initiated
36220 " 🔵 minion_hub stock and catalog schema mapped for FACES import
36221 2:04p 🔵 FACES SCULPTORS production org ID identified in Supabase
36222 " 🔵 FACES stock module already seeded in production with 1,607 ledger entries and 27 items
36223 " 🔵 Existing FACES consumption mappings use generic placeholder dosages requiring update from real data
S7191 Analyze FACES clinic supply consumption Excel files from analyst to map import routes into minion_hub stock/catalog/CRM modules (Aug 28, 2:07 PM)
S7192 Update memory index to reflect completed FACES insumos import analysis awaiting execution decisions (Aug 28, 2:07 PM)
S7193 Deliver comprehensive impact report for FACES insumos reconciliation with less destructive approach replacing full reseed proposal (Aug 28, 2:11 PM)
36224 2:18p ⚖️ FACES insumos import strategy: impact report before incremental approach
36225 " ✅ FACES production database snapshots exported for impact analysis
36226 " 🔴 Impact analysis script CSV column name mismatch
36227 " 🔵 FACES production vs kardex discrepancy analysis reveals major data quality gaps
36228 " 🔵 True-up delta analysis reveals 17 items needing stock adjustment between Jul 1 and Aug 13
36229 2:21p 🔵 Inventory valuation impact reveals S/32,516 decrease after data corrections
36230 2:23p 🟣 Comprehensive HTML impact report delivered for FACES insumos reconciliation
36231 3:18p ⚖️ User approved three-phase additive-only reconciliation plan for FACES insumos import
36232 3:19p 🔵 Studied repair-stock-valuation.ts as precedent for building FACES insumos reconciliation script
S7194 FACES insumos reconciliation execution - Phases 1–2 applied to production database following user approval (Aug 28, 3:19 PM)
36233 3:21p 🔵 Production database query confirms all reported discrepancies for FACES insumos reconciliation

Access 371k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
