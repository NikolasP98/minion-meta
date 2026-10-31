# Implementation Plan: Gateway config lives in the DB

**Branch**: `docs/spec-042-gateway-config-db` (meta) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/042-gateway-config-db/spec.md`

## Summary

Finish the June 2026 gateway-config migration and reuse its loop for the rest of the gateway's non-secret settings. The DB read path for channel rules is built and dark in prod (`CHANNEL_CONFIG_SOURCE=json`, `ORG_SCOPE_SOURCE=json`, `CHANNEL_RUNTIME_APPLY=0` in each tenant's `gateway.env`); the hub already writes the DB. Two defects block the flip: hydration carries no gateway identity (every gateway loads the first gateway's rows) and the hub's change signal never reaches a gateway (single-URL broadcaster, token lookup fails in prod). The plan fixes both (S1), the owner flips one gateway then the other (S2), the hub stops writing channel rules into `gateway.json` (S3), the file loses its rule blocks and operator chat commands stop writing it (S4), a `gateway_settings` table plus editor write path lands (S5), and the gateway merges those sections as an overlay inside its single `loadConfig()` seam, hot-applying through the existing reload prefix map with a local last-good snapshot for hub-less boot (S6). Every slice ships with a local-stack proof before any prod env change.

## Technical Context

**Language/Version**: TypeScript (gateway: Node 22, pnpm, tsdown; hub: Bun, SvelteKit 2 / Svelte 5)
**Primary Dependencies**: gateway `channel-mirror.ts`, `channel-hydrate.ts`, `events-http.ts`, `config-reload.ts`, `config/io.ts`; hub `channel-publish.service.ts`, `@minion-stack/cache` `HttpBroadcaster`, `@minion-stack/db/pg` `channels`/`gateway`, Drizzle; hub migration ledger `scripts/db-migrate.ts`
**Storage**: hub Supabase Postgres (`channels` existing, `gateway_settings` new); gateway in-memory mirror + overlay; local snapshot file `~/.minion/settings-overlay.json`; `gateway.json` shrinks to bootstrap + secrets
**Testing**: gateway `pnpm vitest run test/ci/` (never the full suite) + unit tests beside the touched modules; hub `bun run check`, `vitest` with `HUB_TEST_DB_URL`, `*.sql.integration.test.ts` on the QA DB; local proof runner `scripts/qa/proof-042.ts`
**Target Platform**: netcup docker swarm (two gateway services: `minion_gateway-faces`, default tenant), hub on Vercel
**Project Type**: two services + shared packages (gateway daemon, hub web app, `@minion-stack/*`)
**Performance Goals**: config change visible on the owning gateway ≤10 s p95; zero per-message DB/network reads (unchanged sync in-memory path)
**Constraints**: flag-flip rollback for the whole bake; never auto-restart a shared gateway; secrets never in DB/Valkey; hub/gateway Valkey not shared (no cross-host warm cache); `accountOrgs` fails open when absent (org bleed) → hub stops writing it only after both gateways report `orgScopeSource=db`
**Scale/Scope**: 2 physical gateways (5 `gateway` rows), 3 whatsapp accounts + telegram/discord on FACES, 23 top-level config sections of which 4–5 migrate first

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec before code**: spec.md exists (meta PR #900), plan/tasks follow before any code. ✅
- **II. AS-IS → TO-BE → DELTA with evidence**: spec §AS-IS anchors every claim; research.md R2 adds a measured prod finding (runtime logs). ✅
- **III. Slice-scoped delivery**: six slices, each one PR from an isolated worktree (gateway → `DEV`, hub → `master`, meta docs → `dev`), gates in the foreground. ✅
- **IV. Required build steps**: hub new API routes get `requireOrgCapability` + `API_WRITE_PREFIXES` entry; new hub UI strings via Paraglide + `i18n:compile`; hub host-card edits run `lint:design && lint:tokens`; no new hub page route (no route-contract count change) — the editor and host card already exist. ✅
- **V. Security/data gates**: tagged security+data. Owner approves spec before code; owner merges every slice; owner runs every prod env flip; the shrink script is dry-run by default with a backup and refuses outside `db` mode. ✅
- **Open-items ledger**: any skipped surface (e.g. discord compare still deferred) gets `TODO(handoff)` + a `proposals/` entry. ✅

Post-design re-check: no new project, no new transport, no abstraction beyond one overlay module and one per-gateway broadcaster helper. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/042-gateway-config-db/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/hub-gateway-config.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (per repository)

```text
minion/ (gateway, branch DEV)
├── src/gateway/channel-hydrate.ts          # S1: x-minion-server-id header
├── src/gateway/channel-mirror.ts           # S1: jsonFallbacks/lastSignalAt counters; S6: unchanged
├── src/gateway/events-http.ts              # S6: gateway-settings tag → settings re-pull
├── src/gateway/config-reload.ts            # S6: overlay-aware nextConfig, pendingRestart instead of onRestart for overlay changes
├── src/config/io.ts                        # S6: withSettingsOverlay() inside loadConfig()
├── src/config/settings-overlay.ts          # S6: NEW globalThis overlay + snapshot read/write
├── src/gateway/settings-hydrate.ts         # S6: NEW pull /api/internal/gateways/settings
├── src/cli/commands/health/health.ts       # S1/S6: observable fields
├── src/auto-reply/reply/commands-{allowlist,config,owners}.ts  # S4: managed-path guard
├── src/cli/config-cli.ts                   # S4: `config shrink`
├── docker/compose.local-hub.yml            # S1: NEW local-hub override
└── test/ci/ + *.test.ts beside each module

minion_hub/ (branch master)
├── src/routes/api/internal/channels/resolved/+server.ts   # S1: require header-derived serverId
├── src/server/services/channel-publish.service.ts         # S1: per-gateway signal target
├── src/server/services/gateway-signal.service.ts          # S1: NEW url+token → HttpBroadcaster per gateway
├── src/lib/components/channels/{ChannelCard,ChannelGroup,ChannelSetupWizard,HistorySyncControl}.svelte, users/ChannelLinking.svelte  # S3
├── src/routes/api/org-config/tick/+server.ts              # S3: gated stop of accountOrgs patch
├── supabase/migrations/<ts>_gateway_settings.sql          # S5
├── src/server/services/gateway-settings.service.ts        # S5: NEW CRUD + schema check + signal
├── src/routes/api/gateways/[id]/settings/[section]/+server.ts, .../settings/+server.ts  # S5
├── src/routes/api/internal/gateways/settings/+server.ts   # S5: hydration endpoint
├── src/lib/state/config/config.svelte.ts + /config editor # S5: DB path for managed sections, read-only bootstrap
├── src/routes/(app)/settings/hosts (host card)            # S1/S6: observable display
└── scripts/qa/seed/* (gateway rows), scripts/qa/proof-042.ts

minion-meta/
└── proposals/ ledger entries for open ends
```

**Structure Decision**: no new packages. Gateway work stays in `src/gateway` + `src/config`; hub work stays in `src/server/services` + existing routes/components. The only new modules are `settings-overlay.ts`, `settings-hydrate.ts` (gateway) and `gateway-signal.service.ts`, `gateway-settings.service.ts` (hub).

## Slices (one PR each, in order; each carries its quickstart proof)

| Slice | Repo → base | Content | Proof (quickstart) | Prod step |
|---|---|---|---|---|
| **S1** hydrate identity + signal targeting + observable | gateway → DEV; hub → master (two PRs, hub first) | header on hydrate; hub 401 without it; per-gateway broadcaster from `gateway` row; `health.channelConfig` fields; compose local-hub override; QA seed gateway rows; proof runner skeleton | S1 steps | deploy only (dark: flags still json) |
| **S2** flip | none (owner) | `gateway.env` → db/db/1 on MINION, bake 24 h, then FACES; PANIK group rule set in hub | S2 | owner |
| **S3** hub writer cutover | hub → master | surfaces in research R7 write rows + publish; org-config tick stops patching `accountOrgs`/`orgDisabled` behind the observable gate | S3 | deploy after both gateways report `orgScopeSource=db` for 24 h |
| **S4** operator commands + shrink | gateway → DEV | managed-path guard in 3 command handlers; `config shrink` CLI | S4 | owner runs `shrink --apply` per tenant after S3 is live |
| **S5** settings table + editor write path | hub → master | migration; service; API; editor writes managed sections to DB, bootstrap read-only; hydration endpoint | S5 | deploy (gateway ignores until S6) |
| **S6** gateway settings overlay | gateway → DEV | overlay module, snapshot, hydrate, signal handling, reload integration (hot apply / pendingRestart), observable `settingsConfig` | S6 | deploy; first sections `plugins`, `agents`, `hooks`, `cron`; owner moves remaining sections later |

Dependencies: S1 hub PR before S1 gateway PR (header required ⇒ deploy hub tolerant first: accept header when present, require it only after the gateway deploy — two-step toggle inside S1). S3 waits for S2 bake. S6 waits for S5 deploy.

## Risks carried from research

- `accountOrgs` fails open: S3's tick change is gated on the observable, not on deploy order (R7, spec SC-003).
- Per-gateway targeting replaces a signal that never worked in prod; the first time the push fires for real is S1 in prod — the compare log is observe-only until S2, so a bad signal cannot change behaviour.
- Overlay inside `loadConfig()` touches every consumer's read; mitigated by applying only to sections present in the overlay and by the gateway re-validating the merged config (R5/R6) with the previous overlay kept on failure.
