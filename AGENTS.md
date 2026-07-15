# AGENTS.md — Minion Meta-Repo Orchestrator Hub

This is the **Minion meta-repo** — a self-hosted personal AI assistant platform with orchestration tooling, shared packages (`@minion-stack/*`), and specs at the root, wrapped around 7 independent subprojects. The agent operating from this directory is the **orchestrator**: it has full knowledge of every subdirectory, connects concepts cross-project, and dispatches subagents with the right context.

## Project Map

| Directory | What | Stack | Git Branch | Own Instructions |
|---|---|---|---|---|
| `minion/` | Core gateway + CLI (pnpm monorepo) | pnpm 10.x, Node 22+, TS, tsdown | `DEV` | `.dmux-hooks/CLAUDE.md` |
| `minion_hub/` | Web dashboard for gateway management | Bun, SvelteKit 2, Svelte 5, Tailwind 4 | `dev` | `CLAUDE.md` |
| `minion_site/` | Marketing site + members dashboard | Bun, SvelteKit 2, Svelte 5, Tailwind 4 | `master` | `CLAUDE.md` |
| `minion_plugins/` | Claude Code plugin marketplace | — | `main` | — |
| `docs/` | Agent registry, profiles, docs, sprints | YAML + Markdown | `main` | `CLAUDE.md` |
| `paperclip-minion/` | Control plane for AI-agent companies | pnpm, Express, React + Vite, Drizzle + PGlite | `minion-integration` | `AGENTS.md` |
| `pixel-agents/` | VS Code extension — pixel art office for Claude agents | npm, esbuild, React webview | `main` | `CLAUDE.md` |
| `ai-studio/` | Research/product studio (AI course workspace) | Docs only | — | `CLAUDE.md` |

**Always read the sub-project's CLAUDE.md or AGENTS.md before working in it.**

## Meta-repo Workflow

The `minion` CLI (`@minion-stack/cli` npm package, binary `minion`) orchestrates every subproject with resolved env vars. Install once: `npm install -g @minion-stack/cli` (or `pnpm add -g @minion-stack/cli`).

## Codex Memory Parity

This repo carries Codex parity artifacts under `codex/` so Codex can use the same durable-memory patterns as Claude without changing Claude's workflow:

- `codex/plugins/claude-mem/` wraps the existing `claude-mem` runtime for cross-session memory search through MCP and Codex root-level `hooks.json` lifecycle hooks.
- `codex/skills/mempalace-memory/` documents the installed `mempalace` CLI workflow and this repo's `mempalace.yaml` room map.
- `codex/skills/lessons-learned/` ports the post-task observation workflow.

Use these when the user asks about prior-session context, durable memory, project wake-up context, or lessons learned. Do not save secrets, raw credentials, or unrelated transcript bulk into memory.

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
| `@minion-stack/shared` | Gateway protocol types (frames, agents, sessions, chat events) + WS client + utils — consumed by hub, site, paperclip |
| `@minion-stack/db` | Canonical Drizzle schema (38 tables) + migration runner — consumed by hub + site |
| `@minion-stack/auth` | Better Auth `createAuth()` factory — consumed by hub + site with shared session continuity |

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
  └──→ paperclip-minion/ ← minion_gateway adapter consumes the shared WS client

minion/ (gateway)
  ├── WebSocket server  ←──→  minion_hub/ (dashboard connects via WS)
  ├── WebSocket server  ←──→  minion_site/ (members area connects via WS)
  ├── Channel extensions (telegram, discord, slack, etc.)
  └── REST API + CLI

minion_hub/ ←──shared DB──→ minion_site/
  (@minion-stack/db schema + @minion-stack/auth factory — identical config both sides)
```

### Gateway Protocol

All frontends connect to the gateway via WebSocket using a custom JSON frame protocol with three frame types: `req`, `res`, and `event`. Types and the WS client live in `@minion-stack/shared` (consumed by hub, site, and paperclip's `minion_gateway` adapter).

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

Research workspace for an AI course. Docs-only — no production code. Uses the Minion project as a live testbed for agentic techniques (tool use, multi-agent coordination, memory, planning).

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
| paperclip-minion/ | `pnpm dev` | `pnpm build` | `pnpm test:run` | `pnpm typecheck` |

## Orchestration Guide

### Dispatching Subagents

When sending work to a subproject, always include:
1. The subproject path and its CLAUDE.md or AGENTS.md location
2. The current git branch (see Project Map above)
3. Relevant cross-project context (e.g., "this touches the WS protocol — changes must be reflected in @minion-stack/shared, hub, site, and paperclip's minion_gateway adapter")

### Cross-Project Impact Zones

| Change Type | Projects Affected |
|---|---|
| Gateway protocol (frame types, events) | `packages/shared/` → `minion_hub/` + `minion_site/` + `paperclip-minion/` (minion_gateway adapter) |
| Channel extension (new/modify) | `minion/extensions/<channel>/` + `minion/src/channels/` |
| DB schema change | `minion_hub/src/server/db/schema/` → `minion_site/src/server/db/` (shared DB) |
| Agent definition format | `docs/agents/` → `minion_hub/` (marketplace) → `minion/` (runtime) |
| Auth changes | `minion_hub/src/lib/auth/` ↔ `minion_site/src/lib/auth/` (shared Better Auth) |
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

# [MINION] recent context, 2026-07-14 8:22pm GMT-5

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 25 obs (8,604t read) | 114,619t work | 92% savings

### Jul 11, 2026
S6178 Live browser test and demonstration of bug triage kanban process with multi-stage execution policy and HITL approval gates (Jul 11, 1:16 AM)
S6179 Enable comprehensive password authentication for Minion Hub: password-based login for OAuth-only users (username OR email), password reset via Resend, username/password management in /account page. End goal: set username+password on nikolas.pinon98@gmail.com (Google OAuth-only) and re-login with both variants. (Jul 11, 1:37 AM)
S6180 Enable comprehensive password authentication for Minion Hub: password-based login for OAuth-only users (username OR email), password reset via Resend email, username/password management in /account page. End goal: set username+password on nikolas.pinon98@gmail.com (Google OAuth-only) and re-login with both username and email variants. (Jul 11, 4:13 PM)
S6183 Login UI Refinement: Username Field Email Validation and Password Dot Aesthetics (Jul 11, 4:18 PM)
S6184 Login UI Polish: Email Validation for Username Input and Improved Password Dot Aesthetics (Jul 11, 4:45 PM)
S6181 Password Authentication Feature Security Hardening and E2E Verification (Jul 11, 4:45 PM)
S6182 Password Authentication Feature Security Hardening and E2E Verification (Jul 11, 4:46 PM)
S6186 Deploy password dots styling and username login to production (Jul 11, 4:47 PM)
S6185 Login UI Polish: Email Validation and Password Dot Aesthetics (Jul 11, 5:13 PM)
S6189 Deploy password/username authentication updates to production hub.minion-ai.org (Jul 11, 9:02 PM)
### Jul 14, 2026
29472 8:13p 🟣 Transparent HTML injection proxy for Figma capture script
29474 " 🔵 Figma capture script successfully loaded but page content still empty
29475 " 🔵 Page successfully rendering with authentication working through proxy
29479 " 🔵 Agent pool recovery after sustained exhaustion
29473 8:14p 🔵 Agent pool exhaustion pattern after message dispatch
29477 8:15p 🟣 Successful Figma design capture from authenticated localhost SvelteKit app
29480 8:16p 🔵 SvelteKit preview server terminated with Vercel Insights missing
29482 " ✅ Switched minion_hub from preview to dev mode
29478 " ✅ Figma capture frame annotated with Minion route and viewport metadata
29481 8:17p ✅ Figma screenshot export validated for captured home route
29485 " ✅ Visual verification of Minion Hub home route capture in base64 format
29489 " 🔵 Error 500 page captured showing Internal Error with Retry action
29483 " 🔵 MINION agent pool capacity and recovery characteristics
29484 8:18p 🔵 Multiple concurrent Vite server instances causing port conflicts
29486 " ✅ Vite dev server started on port 5175 after cleanup of preview servers
29487 " ✅ Reclaimed port 5173 for dev server after process cleanup
29488 " 🔵 Figma capture recorded error state instead of home route content
29491 8:19p ✅ Switched from dev mode to preview mode after startup failures
29493 " 🔵 Preview server startup reveals cache and gateway configuration gaps
29490 " 🔵 Upstream SvelteKit server crash caused proxy connection failures and 500 error
29492 " 🔵 SvelteKit development server on port 5173 completely stopped
29495 " 🔵 Server lifecycle leak with port 5173 double-bound across IPv4 and IPv6
29494 " ✅ Vite preview server started on port 5173 as replacement for crashed dev server
29496 8:21p 🔵 Dev server successfully started on port 5175 after auto-increment from conflicts
29497 " 🔵 MINION development environment startup and coordination patterns

Access 115k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
