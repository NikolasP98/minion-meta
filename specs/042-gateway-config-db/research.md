# Research: 042 gateway config lives in the DB

Date: 2026-10-28. Anchors as in spec.md §AS-IS (gateway `origin/main @ 50a3036ad7f`, hub `origin/master @ 812a4b0a`).

## R1 — How does a gateway identify itself to the hub? (blocks the flip)

- **Decision**: `hydrateChannels` sends `x-minion-server-id: cfg.gateway.hubMetrics.serverId` on every pull, the same way `src/infra/message-ledger-flusher.ts:77` already does. The hub's `/api/internal/channels/resolved` rejects a request whose resolved `serverId` came from the bearer fallback rather than the header (401 `missing server id`).
- **Rationale**: the hub already honours the header (`resolve-identity.ts:311`); prod `gateway.json` already carries `serverId` (`a64274a8…` on FACES). One header line fixes the 2026-10-23 "both gateways load the MINION rows" defect.
- **Measured 2026-10-29 (prod flip of FACES to `db`)**: without the header, `resolveServerTokenAuth` (`resolve-identity.ts:142-160`) scans every `gateway` row in no defined order and returns the first whose decrypted token matches; both netcup records (`870bd8f1`, `a64274a8`) hold the same token, so the result changes per boot. FACES boot 10-26 17:25Z hydrated `a64274a8`'s 2 rows; boot 10-29 02:14Z hydrated `870bd8f1`'s 10 rows (4 discord, 3 telegram, 3 whatsapp incl. the clinic's OFICIAL and Faces Sculptors — i.e. the clinic's real whatsapp rows sit on the record named `netcup-prd`, not on `netcup-faces-prd`). S1 must therefore also include a one-off data fix: move the FACES whatsapp rows (`+51906090526`, `+51992376833`, `+51902829738`) to `gateway_id = a64274a8` and leave discord/telegram on `870bd8f1`, and `ORG_SCOPE_SOURCE` stays `json` until that lands.
- **Alternatives**: per-gateway bearer tokens (bigger: token rotation on both hosts, hub `gateway` row per token); deriving the gateway from the caller IP (Tailscale, brittle).

**Measured 2026-10-29 (post-flip, FACES on `db`)**: FACES `gateway.json` `hubMetrics.serverId = a64274a8…` (its own row); the default tenant's `serverId = 1cf319d2…`, which is `gateway.legacy_server_id` of `870bd8f1…` and `matchesServerIdHint` accepts legacy ids ⇒ both hints resolve once the header is sent, no row surgery needed for S1 itself. With the header, FACES receives only `a64274a8`'s 2 rows (PANIK, +51922286663); `+51906090526` (OFICIAL) never starts on the FACES process (no `starting provider` line in any container since 10-28, pre- or post-flip; its `authDir` points at `/vol/orgs/…`) and `+51992376833` is logged out, so losing their `870bd8f1` rows from the mirror changes no behaviour (mirror miss ⇒ json fallback). T013 is therefore data hygiene, not a prerequisite. The two PANIK rows differed only in `allow_from` (`[+51922286663]` vs `[]`); aligned 10-29 so the per-boot resolution flip is behaviour-neutral until S1 ships (the overlay REPLACES `allowFrom`/`groupAllowFrom`, it does not merge).

## R2 — Does the hub's change signal reach the gateways? (No, and the fix is per-gateway targeting)

- **Evidence**: hub `cache.ts:142-175` builds ONE `HttpBroadcaster` from `MINION_GATEWAY_BROADCAST_URL` + the token of the `gateway` row matching `MINION_GATEWAY_PRIMARY_URL`. Vercel prod runtime logs (3 d window, 2026-10-26→29) print `[cache] no gateway token available — invalidations not broadcast` on every function that touches the cache, including `GET /api/internal/channels/resolved`. The `gateway` table has 5 rows for 3 physical hosts; the two netcup rows share `wss://netcup.donkey-agama.ts.net` (ports 443 and 10000). `HttpBroadcaster` holds a single `url` (`packages/cache/src/broadcaster.ts:30`).
- **Decision**: `publishChannel` resolves its target from the row: `channels.gateway_id → gateway.url + token`, converts `wss://host[:port]` to `https://host[:port]/events/cache-invalidate`, and POSTs through a per-gateway `HttpBroadcaster` instance (cached per url). The generic `invalidateTags` stays for hub cache semantics; the channel/settings signal no longer depends on the single primary broadcaster. Settings use the same helper with `gateway_settings.gateway_id`.
- **Rationale**: two gateways need two targets; the row already holds url + token; no new transport, no env to set per deploy. The 5-min tick remains as the staleness bound (SC-001's 10 s needs the push).
- **Alternatives**: fix the primary-URL env (keeps one target — wrong with two gateways); Valkey pub/sub (gateway redis is get/set only; instances not shared).
- **Open**: why the primary token lookup fails in prod (env value vs row url mismatch) — not needed once targeting is per row; recorded as a TODO(handoff) if S3 does not remove the primary broadcaster.

## R3 — Where do the flags live and how is a flip done?

- **Evidence**: FACES state volume `gateway.env` = `MINION_GATEWAY_PORT=18790`, `CHANNEL_CONFIG_SOURCE=json`, `ORG_SCOPE_SOURCE=json`, `CHANNEL_RUNTIME_APPLY=0`. The docker service env lists only `MINION_*`; `/proc/1/environ` was not readable; `/opt/minion-swarm` is root-only. The three flags are read from `process.env` at call time (`channel-mirror.ts:30-54`), so they are process env, injected by the swarm stack from that file.
- **Decision (corrected 2026-10-29)**: the process sources the Swarm secret `/run/secrets/runtime_env`, not the volume's `gateway.env`. A flip = `sudo /opt/minion-swarm/deploy/set-runtime-env.sh <default|faces> <VAR>` with the value on stdin (rewrites `/opt/minion-swarm/secrets/<tenant>.runtime_env` with a `.bak-<ts>` copy, creates a content-hash-named secret, rolls only that tenant). Done for FACES 02:14Z: `CHANNEL_CONFIG_SOURCE=db`, `CHANNEL_RUNTIME_APPLY=1`, `ORG_SCOPE_SOURCE=json` kept. Rollback is the reverse edit + restart. The plan does not add a hub toggle for the flags.
- **Rationale**: flag-not-deploy rollback was the June design; the file already exists per tenant.

## R4 — What observable proves a flip? (FR-015)

- **Evidence**: `health.ts:570-577` already reports `channelConfig: {source, orgScopeSource, mirrorSize, mirrorLastHydratedAt, accountOrgsFromMirror, accountScope}`.
- **Decision**: extend that block with `runtimeApply`, `jsonFallbacks` (count of mirror misses since boot), `lastSignalAt`, and later `settings: {source, sections[], pendingRestart[], lastHydratedAt, snapshotAt}`. The hub host card (`/settings/hosts`) renders source + mirror size + last hydrate + pending-restart; it already calls `health`.
- **Alternatives**: a new RPC (unneeded), log scraping (owner cannot see it).

## R5 — Where do non-channel settings live, who validates?

- **Evidence**: no settings home exists (`gateway` table columns listed in spec §E). The hub config editor already fetches `config.schema` (`config.svelte.ts:194`) and patches the file. The gateway validates whole configs with `validateConfigObject` (`src/config/validation.ts:136`). Hub migrations go through `supabase/migrations/*.sql` + the `hub_migrations` ledger applied by `vercel-build` (memory `hub-db-migration-pipeline`; never Supabase CLI).
- **Decision**: new table `gateway_settings(gateway_id uuid → gateway.id, section text, value jsonb, version int, updated_by uuid null, updated_at timestamptz, PK(gateway_id, section))`, one row per top-level section. The hub editor validates the section against the JSON schema it already loads, then `PUT /api/gateways/{id}/settings/{section}`; the gateway re-validates the merged config on apply and refuses (keeps previous, reports `invalid` in the observable) if the gateway's schema disagrees. Gateway is the validator of record.
- **Alternatives**: one jsonb blob for the whole config (loses per-section versioning and classification); a `hub → gateway config.validate` RPC round-trip on save (adds a live dependency to a save).

## R6 — How does the gateway apply DB settings without touching every consumer?

- **Evidence**: `loadConfig()` (`src/config/io.ts:1260-1282`) is the single read seam; it calls `io.loadConfig()` behind a 200 ms cache. The reloader (`config-reload.ts:319-400`) computes `diffConfigPaths(current, next)` and `buildGatewayReloadPlan` from the file snapshot, then `onHotReload`/`onRestart`. Prefix classes are in `:50-90` and plugins contribute `restart-channel:<id>`.
- **Decision**: a `globalThis`-anchored settings overlay (`src/config/settings-overlay.ts`: `Map<section, document>`). One function `withSettingsOverlay(cfg)` replaces each DB-managed section in the file config; it is applied inside `loadConfig()` and inside the reloader's `nextConfig`. A settings signal triggers the existing reload path (overlay updated → `runReload`), so hot sections apply exactly as a file edit would. Restart-class changes from the overlay set `pendingRestart.add(section)` instead of calling `onRestart` (never auto-restart a shared gateway). A hand edit of the file for a DB-managed section is logged once and ignored by the overlay.
- **Cache**: the hub/gateway Valkey instances are not shared (June tracer finding; the hub writes raw keys the gateway never reads across hosts), so a Valkey warm cache cannot serve a gateway boot. "Cached" = the in-memory overlay plus a local last-good snapshot `~/.minion/settings-overlay.json` written after each successful hydrate and loaded before the first hub pull. This meets "no constant DB dings": the gateway reads the DB only at boot, on signal, and on the 5-min tick. The spec's "Valkey warm cache" wording is superseded by this finding.
- **Alternatives**: rewriting consumers to read a settings service (hundreds of `loadConfig()` call sites); making the DB the only source and dropping the file for those sections immediately (no rollback).

## R7 — Which hub surfaces still write channel rules into the file, and what replaces each?

| Surface (hub) | Today | After S3 |
|---|---|---|
| `ChannelSetupWizard.svelte:205` commit | `config.patch` account block | create `channels` row (`POST /api/servers/{id}/channels`) + publish; file gets only `authDir`/`auth_ref` via the existing pairing path |
| `ChannelGroup.svelte:65` transport | `config.patch` | `PUT` row `settings` |
| `ChannelCard.svelte:282,352` markOnline / behaviour | `config.patch` | `PUT` row `settings.markOnline` etc.; gateway `resolveWhatsAppAccount` reads mirror `settings` (already projected) |
| `HistorySyncControl.svelte`, `ChannelLinking.svelte` | `config.patch` | `PUT` row `settings` / `channel_bindings` |
| `/api/org-config/tick` `reconcileOrgConfig` | patches `accountOrgs`/`orgDisabled` | writes rows only once both gateways report `orgScopeSource=db` (gate on R4 observable, 24 h zero diffs) |
| `/api/plugins/[id]/toggle`, `/api/personal-agent/*`, `/home/settings`, `/onboarding` | `config.patch` non-channel sections | move to `gateway_settings` in S5/S6 (sections `plugins`, `agents`) |

- **Decision**: S3 covers the channel rows above; the last row's non-channel patches move in S5/S6 with the settings vertical.

## R8 — Operator chat commands

- **Evidence**: `commands-allowlist.ts:671`, `commands-config.ts:147`, `commands-owners.ts:176` call `writeConfigFile`.
- **Decision**: when the touched path prefix is DB-managed (`channels.<type>.accounts.*` rules, `channels.accountOrgs`, later any overlay section), reply with one line ("Managed in the hub: <hub url>/settings") and write nothing. Non-managed paths keep working until their section migrates.

## R9 — Shrinking `gateway.json`

- **Decision**: a gateway CLI subcommand `minion config shrink --dry-run|--apply` that removes per-account rule keys (`allowFrom`, `groupAllowFrom`, `dmPolicy`, `groupPolicy`, `enabled`, `name`, `requireMention`, `groups.*`) and `channels.accountOrgs`, keeps `authDir`/tokens/type defaults, writes `gateway.json.bak-042-<ts>` first, and prints the diff. Owner runs `--apply` per tenant after the flip has baked; the boot log must then show `0 json fallbacks`.
- **Rationale**: a script with a backup is reversible and reviewable; hand edits are not.

## R10 — Local stack for every slice's proof

- **Evidence**: hub `bun run dev:local` = QA Postgres 54422 + dev server 5199 (`scripts/qa/dev.ts`). Hub draft PR #543 (`dev:local --gateway`) was closed unmerged. Gateway `docker-compose.yml` runs `minion-gateway` + `valkey`, publishes 18789/18790, mounts `~/.minion`, has no `extra_hosts`.
- **Decision**: a gateway compose override `docker/compose.local-hub.yml` adds `extra_hosts: host.docker.internal:host-gateway` and env `CHANNEL_CONFIG_SOURCE/ORG_SCOPE_SOURCE/CHANNEL_RUNTIME_APPLY`; a throwaway `~/.minion-qa/gateway.json` points `hubMetrics.hubUrl` at `http://host.docker.internal:5199` with the QA seed's gateway token. The hub QA seed gains one `gateway` row (`url=http://127.0.0.1:18789`, known token) and two `channels` rows on two gateway ids. A proof runner `scripts/qa/proof-042.ts` (hub) drives: write rule → expect gateway `health` to show the new mirror entry within 10 s → stop hub → restart gateway → expect snapshot boot. Each slice adds its step to the runner.
- **Rationale**: owner instruction; the pieces exist, only the wiring is missing.

## R11 — Flip order and bake

- **Decision**: MINION gateway (`870bd8f1`, netcup-prd, no live clinic accounts) first; 24 h with zero `accountOrgs` diffs and zero json fallbacks in the observable; then FACES (`a64274a8`). The owner may reverse to unblock PANIK groups; the risk is the same code against the busier account set.

## Summary of deviations from spec.md

- Valkey warm cache for settings dropped (instances not shared); replaced by the local last-good snapshot. SC-005/FR-003/FR-010 still hold.
- The change signal needs per-gateway targeting (R2); the spec assumed the existing broadcaster already reached the gateways. This is additive work in S1/S3, not a transport change.
