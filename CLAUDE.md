# CLAUDE.md — Minion Meta-Repo Orchestrator Hub

This is the **Minion meta-repo** (formerly the loose "OpenClaw" root) — a self-hosted personal AI assistant platform with orchestration tooling, shared packages (`@minion-stack/*`), and specs at the root, wrapped around 7 independent subprojects. The agent operating from this directory is the **orchestrator**: it has full knowledge of every subdirectory, connects concepts cross-project, and dispatches subagents with the right context.

## Project Map

| Directory | What | Stack | Git Branch | Own CLAUDE.md |
|---|---|---|---|---|
| `minion/` | Core gateway + CLI (pnpm monorepo) | pnpm 10.x, Node 22+, TS, tsdown | `DEV` | `.dmux-hooks/CLAUDE.md` |
| `minion_hub/` | Web dashboard for gateway management | Bun, SvelteKit 2, Svelte 5, Tailwind 4 | `dev` | `CLAUDE.md` |
| `minion_site/` | Marketing site + members dashboard | Bun, SvelteKit 2, Svelte 5, Tailwind 4 | `master` | `CLAUDE.md` |
| `minion-shared/` | Shared gateway protocol types + utils | npm, TypeScript | — | — |
| `minion_plugins/` | Claude Code plugin marketplace | — | `main` | — |
| `docs/` | Agent registry, profiles, docs, sprints | YAML + Markdown | `main` | `CLAUDE.md` |
| `paperclip-minion/` | Control plane for AI-agent companies | pnpm, Express, React + Vite, Drizzle + PGlite | `minion-integration` | `AGENTS.md` |
| `pixel-agents/` | VS Code extension — pixel art office for Claude agents | npm, esbuild, React webview | `main` | `CLAUDE.md` |
| `ai-studio/` | Research/product studio (AI course workspace) | Docs only | — | `CLAUDE.md` |

**Always read the sub-project's CLAUDE.md (or AGENTS.md) before working in it.**

## Meta-repo Workflow

The `minion` CLI (`@minion-stack/cli` npm package, binary `minion`) orchestrates every subproject with resolved env vars. Install once: `npm install -g @minion-stack/cli` (or `pnpm add -g @minion-stack/cli`).

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

1. `AI/.env.defaults` — meta-repo shared non-secret defaults
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

Future phases (M3+) add `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth`.

### Subprojects stay independent

Each subproject remains its own git repo with its own remote, branch, package manager, and deploy pipeline. The meta-repo's `.gitignore` excludes all subproject directories — meta-repo only tracks orchestration/specs/packages.

Design spec: [`specs/2026-04-19-minion-meta-repo-design.md`](specs/2026-04-19-minion-meta-repo-design.md).

## Architecture Overview

### Cross-Project Data Flow

```
minion-shared/          ← Protocol types (frames, agents, sessions, chat events)
  ├──→ minion_hub/      ← Imports types + WS utils for dashboard
  └──→ minion_site/     ← Imports types + WS utils for members area

minion/ (gateway)
  ├── WebSocket server  ←──→  minion_hub/ (dashboard connects via WS)
  ├── WebSocket server  ←──→  minion_site/ (members area connects via WS)
  ├── Channel extensions (telegram, discord, slack, etc.)
  └── REST API + CLI

minion_hub/ ←──shared DB──→ minion_site/
  (Drizzle ORM + LibSQL/Turso, Better Auth 1.4.19)
```

### Gateway Protocol

All frontends connect to the gateway via WebSocket using a custom JSON frame protocol with three frame types: `req`, `res`, and `event`. Types live in `minion-shared/`.

Connection flow: WS connect → `connect.challenge` event → `connect` request with token → authenticated session.

### Multi-Tenant Database

`minion_hub` and `minion_site` share a database (Drizzle ORM + LibSQL/Turso). Local dev: SQLite file (`file:./data/minion_hub.db`). Production: Turso. Auth: Better Auth 1.4.19.

Hub DB has 35+ schema tables covering: agents, sessions, chat-messages, servers, channels, skills, reliability-events, missions, tasks, marketplace, workshop-saves, users, settings, and more. Schema files: `minion_hub/src/server/db/schema/`.

## Subproject Details

### minion/ — Gateway + CLI

`@nikolasp98/minion` — Multi-channel AI gateway published to npm. Version `2026.4.2-dev`.

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

**State** (`src/lib/state/`): 11 domain modules — agents, builder, channels, chat, config, features, gateway, reliability, ui, workshop + barrel index.

**Key tech**: PixiJS 8 + Rapier2D physics (workshop canvas), Zag.js headless UI components, TanStack Svelte Table, ECharts, Yjs (CRDT), Carta-md, Fuse.js search, PostHog analytics, Resend email.

**Workshop canvas**: PixiJS 8 + Rapier2D physics. Agents rendered as sprites with spring joints. Mounted via Svelte action (`use:pixiCanvas`).

```bash
bun run dev          # Dev server
bun run build        # Production build
bun run db:push      # Push schema to DB
bun run db:seed      # Seed initial data
bun run db:studio    # Drizzle Studio
```

### minion_site/ — Marketing + Members

Marketing landing + authenticated members dashboard. Deployed on Vercel.

**Routes**: `(marketing)/` — prerendered landing, privacy, terms. `(app)/` — login, register, members (auth-protected).

**Tech**: Paraglide i18n (EN/ES), Better Auth, ECharts knowledge graph, Paper Design shaders, Vercel Analytics + Speed Insights.

```bash
bun dev              # Dev server
bun run build        # Production build
bun run check        # Type-check
```

### minion-shared/ — Protocol Types

Lightweight TypeScript package exporting gateway protocol types and utilities. Three export paths: `.` (root), `./gateway`, `./utils`. Source: `src/index.ts`, `src/gateway/`, `src/utils/`. Build: `tsc → dist/`.

### docs/ — Agent Registry + Project Docs

Contains 1,350+ agent definitions across 5 scopes (voltagent, gsd, custom, superpowers, community), deployment profiles, architecture docs, competitive research, and sprint plans.

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
**Docs**: Mintlify-powered docs (`docs/`).
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

Research workspace for an AI course. Docs-only — no production code. Uses the OpenClaw project as a live testbed for agentic techniques (tool use, multi-agent coordination, memory, planning).

**Structure**: `context/` (briefs), `vault/` (knowledge), `reports/` (analysis), `product-thinking/` (PRDs), `class content/` (course materials + presentations).

## Root-Level Files

| File/Dir | Purpose |
|---|---|
| `00_START_HERE.md` | Entry point for A3 retention research (March 2026) |
| `A3_*.md`, `RETENTION_*.md`, `KPI_*.md` | One-time retention benchmark research artifacts |
| `DOCS/` | Symlink to `~/Documents/VAULT/MINION` |
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
| minion-shared/ | — | `npm run build` | — | — |
| paperclip-minion/ | `pnpm dev` | `pnpm build` | `pnpm test:run` | `pnpm typecheck` |

## Orchestration Guide

### Dispatching Subagents

When sending work to a subproject, always include:
1. The subproject path and its CLAUDE.md location
2. The current git branch (see Project Map above)
3. Relevant cross-project context (e.g., "this touches the WS protocol — changes must be reflected in minion-shared, hub, and site")

### Cross-Project Impact Zones

| Change Type | Projects Affected |
|---|---|
| Gateway protocol (frame types, events) | `minion-shared/` → `minion_hub/` → `minion_site/` |
| Channel extension (new/modify) | `minion/extensions/<channel>/` + `minion/src/channels/` |
| DB schema change | `minion_hub/src/server/db/schema/` → `minion_site/src/server/db/` (shared DB) |
| Agent definition format | `docs/agents/` → `minion_hub/` (marketplace) → `minion/` (runtime) |
| Auth changes | `minion_hub/src/lib/auth/` ↔ `minion_site/src/lib/auth/` (shared Better Auth) |
| Workshop/canvas | `minion_hub/src/lib/workshop/` + `minion_hub/src/lib/components/workshop/` |
| Pixel office | `pixel-agents/src/` (extension) + `pixel-agents/webview-ui/src/` (React) |
| Paperclip adapters | `paperclip-minion/packages/adapters/` + `paperclip-minion/server/` |

### Key Conventions

- **TypeScript** strict mode everywhere. Avoid `any`. Never add `@ts-nocheck`.
- **Svelte 5 only** (hub + site): runes, snippets (`Snippet` type for children), `onclick={}` syntax. No legacy Svelte 4 patterns.
- **Formatting**: minion/ uses oxlint + oxfmt. SvelteKit projects use svelte-check.
- **Package managers**: pnpm for minion/ and paperclip-minion/. Bun for SvelteKit projects. npm for pixel-agents and minion-shared. Don't mix.
- **Naming**: "OpenClaw" or "Minion" for product/docs headings; `minion`/`openclaw` for CLI/package/paths.
- **Git workflow**: Feature branches → dev/DEV → main/master. Use worktrees for isolation. Never commit directly to main.
- **Multi-agent safety**: Don't touch git stash, worktrees, or switch branches unless explicitly asked. Scope commits to your changes only.

## Environment

Key variables (see `.env.example` in each project):

- `ANTHROPIC_API_KEY` — Claude API
- `OPENCLAW_GATEWAY_TOKEN` — Gateway auth
- `TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN` — Database (production)
- `BETTER_AUTH_SECRET` — Auth secret
- `B2_*` — Backblaze B2 file storage (hub)
- Channel-specific tokens (TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN, etc.)
