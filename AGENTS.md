# AGENTS.md — Minion Meta-Repo Orchestrator Hub

This is the **Minion meta-repo** — a self-hosted personal AI assistant platform with orchestration tooling, shared packages (`@minion-stack/*`), and specs at the root, wrapped around 7 independent subprojects. The agent operating from this directory is the **orchestrator**: it has full knowledge of every subdirectory, connects concepts cross-project, and dispatches subagents with the right context.

## Project Map

| Directory | What | Stack | Git Branch | Own Instructions |
|---|---|---|---|---|
| `minion/` | Core gateway + CLI (pnpm monorepo) | pnpm 10.x, Node 22+, TS, tsdown | `DEV` | `AGENTS.md` |
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
| `@minion-stack/shared` | See the README package inventory; gateway surfaces are consumed by hub, site, and paperclip |
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


### Minion Docs/ — Agent Registry + Project Docs

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

## SDLC Contract (normative)

Every product-building agent follows ONE lifecycle — the factory automates it,
humans and ad-hoc agents follow the same states by hand:

```
proposal (proposals/*.md) → spec (specs/*.md, 2-pass review) → dev (slice-scoped
branch + draft PR + self-test + independent review) → merge (human for anything
non-trivial) → deploy (branch-triggered) → post-merge verification
```

- State lives in frontmatter (`status`, `verdict`) committed to minion-meta —
  never only in chat, memory, or a dashboard.
- Skipping a stage requires saying so in the artifact you DID produce (e.g. a
  hotfix PR body must name the spec it bypassed and why).
- Every spec and proposal states AS-IS (current observable behavior, with
  anchors/evidence), TO-BE (desired observable behavior + invariants), and the
  DELTA (exact transitions, tests proving each) — see the templates.
- Security/data-tagged work always keeps human gates at approval AND merge.

### Work-type tags & routing

`routing.yml` (root, JSON-compatible YAML) is machine truth for the work-type
taxonomy: `ui logic data infra docs test security perf deps`. Tags are a
multi-select on `proposals/*.md` and `specs/*.md` frontmatter — and per-slice in
a spec's `slice_tags`, because the slice is the routable unit.

- **Path rules are the authority for anything with a diff.** `routing.yml` maps
  globs → tags per fleet repo; `node scripts/routing.mjs tags <repo-id> <path…>`
  derives the tag set for changed files (union across files, canonical order).
- `security` and `perf` are **declared, never derived** — intent is not a location.
- **A spec declares `slice_tags: [1:logic+test, 2:ui]`** — one entry per slice, in
  slice order, canonical tags only, and the spec's own `tags` must be their union.
  `scripts/spec-index.mjs` and `pnpm run routing:validate` both reject an unknown,
  malformed, out-of-order or (for specs created from `sliceTagsRequiredFrom` on)
  missing slice tag list.
- `generated/labeler/<repo-id>.yml` + `.workflow.yml` are the generated
  `actions/labeler@v5` config and workflow for each fleet repo. minion-meta runs its
  own pair from `.github/` (installed and drift-gated, not an inert copy). Every other
  repo needs the work-type blocks pasted into its `.github/labeler.yml` — repos that
  already label by topic (the gateway labels every channel) keep their own entries —
  plus a workflow that runs `actions/labeler` on pull requests with
  `pull-requests: write`. `pnpm run routing:verify-remote` reports, per repo, which
  half is missing. Never edit the generated files — edit `routing.yml` and run
  `pnpm run routing:generate`.
- Tags compose the loop, they don't pick between agents: **one agent per slice**,
  capabilities injected by tag (ui → `ui-design-governance` + `lint:design`/`lint:tokens`;
  logic → red-state TDD; docs → light lane but a docs-verifier still checks the
  claims; security → human gate regardless of score). Review fans out per facet.
- A declared-vs-derived mismatch (a slice tagged `docs` whose diff touches `src/`)
  is itself a finding — it is the cheap catch for scope creep.
- After editing `routing.yml`: `pnpm run routing:generate && pnpm run routing:validate`
  and commit the regenerated artifacts. `legacyTags` is a shrinking debt ledger —
  the validator fails if an entry is no longer used by any card.

Design spec: [`specs/2026-08-17-sdlc-phase-gates-scoring-spec.md`](specs/2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b.

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
| Agent definition format | `Minion Docs/agents/` → `minion_hub/` (marketplace) → `minion/` (runtime) |
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


