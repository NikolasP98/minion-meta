# Tasks: Gateway config lives in the DB

**Input**: Design documents from `specs/042-gateway-config-db/` (plan.md, spec.md, research.md, data-model.md, contracts/hub-gateway-config.md, quickstart.md)

**Organization**: by slice (plan.md §Slices). Each slice is one PR from an isolated worktree, ends with its quickstart proof and the PR. Owner-run tasks are marked **[OWNER]**. Story labels: US1 = rule change live on the right gateway; US2 = hub only writer, file shrinks; US3 = other settings; US4 = local proof (cross-cutting).

Gates — gateway (`minion/`, PRs → `DEV`): `pnpm vitest run test/ci/` + `pnpm vitest run <touched>.test.ts`, `pnpm check`. Hub (`minion_hub/`, PRs → `master`): `bun run check`, `bun run vitest run <touched>`, `bun run lint:design && bun run lint:tokens` when a `.svelte` is touched, `bun run i18n:compile` when strings are added, `*.sql.integration.test.ts` on the QA DB when SQL is touched.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (worktrees + local stack)

- [ ] T001 Create gateway worktree `~/.cache/claude-tmp/gw-042-s1` from `origin/DEV` (`git -C minion worktree add … -b feat/042-s1-hydrate-identity origin/DEV`) and run `pnpm install && pnpm build`
- [ ] T002 [P] Create hub worktree `~/.cache/claude-tmp/hub-042-s1` from `origin/master` (`-b feat/042-s1-gateway-signal`) and run `bun install && bunx svelte-kit sync && bun run i18n:compile`
- [ ] T003 [P] [US4] Add gateway compose override `minion/docker/compose.local-hub.yml` (extra_hosts `host.docker.internal:host-gateway`, env `CHANNEL_CONFIG_SOURCE`, `ORG_SCOPE_SOURCE`, `CHANNEL_RUNTIME_APPLY` passthrough, `MINION_CONFIG_DIR` default `~/.minion-qa`) per research R10
- [ ] T004 [P] [US4] Add QA seed fixtures in `minion_hub/scripts/qa/seed/` for two `gateway` rows (`qa-gw-a` url `http://127.0.0.1:18789`, `qa-gw-b` url `http://127.0.0.1:28789`, known tokens) and one whatsapp `channels` row per gateway; register them in `scripts/qa/seed/matrix.ts`
- [ ] T005 [US4] Create proof runner `minion_hub/scripts/qa/proof-042.ts` with `--slice <n>` dispatch, helpers `gatewayHealth()`, `hubPut()`, `waitFor(pred, 10_000)`, `fileHash(path)`; slice 1 steps from quickstart.md

## Phase 2: Foundational (S1 — hydrate identity, signal targeting, observable)

- [ ] T006 [US1] Hub: in `src/routes/api/internal/channels/resolved/+server.ts` require that `locals.serverId` was header-derived — add `headerServerId` to `IdentityResolution.locals` in `src/server/auth/resolve-identity.ts` (`resolveViaMetricsBearer`) and return 401 `{error:'missing server id'}` when absent **behind env `GATEWAY_HYDRATE_REQUIRE_SERVER_ID` (default off until the gateway deploy)**; unit test in `resolve-identity.test.ts`
- [ ] T007 [P] [US1] Hub: new `src/server/services/gateway-signal.service.ts` — `signalGateway(gatewayId, tags)`: load `gateway` row (`url`, decrypted token via the same helper `getSystemGatewayCredentialsPg` uses), map `wss://→https://`, `ws://→http://`, POST `/events/cache-invalidate` `{type:'cache.invalidate', payload:{tags}}` with one cached `HttpBroadcaster` per url; log one line on failure, never throw; unit test with a fake fetch
- [ ] T008 [US1] Hub: `channel-publish.service.ts` `publishChannel`/`signalChannelChange` call `signalGateway(row.gatewayId, [channelKey(type, accountId)])` after the Valkey write; keep `invalidateTags` for hub cache; update `channel-publish.service.test.ts`
- [ ] T009 [P] [US1] Gateway: `src/gateway/channel-hydrate.ts` adds header `x-minion-server-id: hubMetrics.serverId` (same source as `src/infra/message-ledger-flusher.ts:77`) and skips the pull with a warn when `serverId` is missing; test in `channel-hydrate.test.ts` asserts the header
- [ ] T010 [P] [US1] Gateway: `src/gateway/channel-mirror.ts` adds counters `jsonFallbacks` (incremented where `accounts.ts:182` falls back), `lastSignalAt` (set in `events-http.ts` on a `channel:` tag), `runtimeApply` exposure; `mirrorMeta()` returns them; tests
- [ ] T011 [US1] Gateway: `src/cli/commands/health/health.ts` `channelConfig` block adds `runtimeApply`, `jsonFallbacks`, `lastSignalAt` (contracts §5); snapshot test update
- [ ] T012 [P] [US1] Hub: host card in `src/routes/(app)/settings/hosts/**` (or the `HostOverlay`/host detail component that already renders `health`) shows `source`, `mirrorSize`, `mirrorLastHydratedAt`, `jsonFallbacks` with Paraglide strings; `i18n:compile`; `lint:design && lint:tokens`
- [ ] T013 [US1] **Data fix (owner approves the row list first)**: SQL in `minion_hub/scripts/ops/042-move-faces-channel-rows.sql` moving whatsapp rows `+51906090526`, `+51992376833`, `+51902829738` from `gateway_id 870bd8f1…` to `a64274a8…` (dry-run SELECT first, then UPDATE in one txn, assert count = 3), leaving discord/telegram on `870bd8f1…`; delete the duplicate PANIK row only if the owner says so
- [ ] T014 [US4] Run quickstart S1 proof on the local stack (`bun scripts/qa/proof-042.ts --slice 1`): own rows only, 401 without header, rule change visible ≤10 s via signal; attach output to both PRs
- [ ] T015 [US1] Open hub PR `feat(gateway): per-gateway change signal + header-pinned channel hydration` → `master` and gateway PR `feat(gateway): send server id on channel hydrate + mirror observables` → `DEV`; PR bodies name spec 042 S1 and the deploy order (hub first with the require-flag off, gateway, then flip the require-flag on)

**Checkpoint**: both S1 PRs merged and deployed; hub `GATEWAY_HYDRATE_REQUIRE_SERVER_ID=true`; FACES `health` shows `source: db`, 3 whatsapp accounts, `jsonFallbacks: 0`.

## Phase 3: User Story 1 — S2 prod flip (Priority: P1) **[OWNER]**

**Goal**: both gateways read channel rules from the DB with hot apply. **Independent test**: quickstart S2.

- [ ] T016 [OWNER] [US1] FACES already on `CHANNEL_CONFIG_SOURCE=db`, `CHANNEL_RUNTIME_APPLY=1` since 2026-10-29 02:14Z; after T013+T015 deploy, set `ORG_SCOPE_SOURCE=db`: `echo db | sudo /opt/minion-swarm/deploy/set-runtime-env.sh faces ORG_SCOPE_SOURCE`
- [ ] T017 [OWNER] [US1] Default tenant: `sed` `CHANNEL_CONFIG_SOURCE=db` in `/opt/minion-swarm/secrets/default.runtime_env`, then `echo 1 | sudo … set-runtime-env.sh default CHANNEL_RUNTIME_APPLY`; after 24 h clean, `ORG_SCOPE_SOURCE=db`
- [ ] T018 [US1] Record the bake: hub host cards show `source: db`, `orgScopeSource: db`, `jsonFallbacks: 0`, zero `accountOrgs` diffs in both containers' logs for 24 h; paste evidence into `specs/042-gateway-config-db/evidence/s2-bake.md`

## Phase 4: User Story 2 — S3 hub writer cutover (Priority: P2)

**Goal**: no hub surface writes channel rules into `gateway.json`. **Independent test**: quickstart S3 (file hash unchanged under every hub action).

- [ ] T019 [US2] Hub worktree `hub-042-s3` from `origin/master`
- [ ] T020 [P] [US2] `ChannelCard.svelte:282,352` markOnline + behaviour → `PUT /api/servers/{id}/channels/{channelId}` with `settings.markOnline` / `replies`+`allowFrom`; remove `config.patch`; gateway `resolveWhatsAppAccount` already reads mirror `settings` — verify `markOnline` key name matches `src/channels/whatsapp/accounts.ts`
- [ ] T021 [P] [US2] `ChannelGroup.svelte:65` transport knobs → `PUT … settings`
- [ ] T022 [P] [US2] `HistorySyncControl.svelte` + `users/ChannelLinking.svelte` → `PUT … settings` / `channel_bindings` API; delete their `config.patch` calls
- [ ] T023 [US2] `ChannelSetupWizard.svelte:205` commit → `POST /api/servers/{id}/channels` (row with correct `gateway_id` from the card's host) + existing pairing path for creds; no rule keys patched
- [ ] T024 [US2] `src/routes/api/org-config/tick/+server.ts` `reconcileOrgConfig`: stop patching `channels.accountOrgs` and `plugins.orgDisabled` when every gateway of the org reports `orgScopeSource: 'db'` in its last `health` (read via the existing gateway RPC helper); otherwise keep patching and log `accountOrgs patch kept: gateway <id> still json`
- [ ] T025 [US2] Tests: component tests assert no `sendRequest('config.patch', …)` with a `channels.` path from the four components; tick test for both gate branches
- [ ] T026 [US4] Run quickstart S3 proof (`--slice 3`); gates; `lint:design && lint:tokens`; `i18n:compile` if strings changed
- [ ] T027 [US2] Open hub PR `feat(channels): hub writes channel rules to the DB only; gateway.json patches retired` → `master`

## Phase 5: User Story 2 — S4 operator commands + shrink (Priority: P2)

- [ ] T028 [US2] Gateway worktree `gw-042-s4` from `origin/DEV`
- [ ] T029 [US2] New `src/config/managed-paths.ts`: `isDbManagedPath(path)` true for `channels.<type>.accounts.*.(allowFrom|groupAllowFrom|dmPolicy|groupPolicy|enabled|name|requireMention|groups.*)`, `channels.<type>.(allowFrom|groupAllowFrom|dmPolicy|groupPolicy|groups.*)`, `channels.accountOrgs`, `plugins.orgDisabled`; unit test with the prod FACES key list
- [ ] T030 [P] [US2] `src/auto-reply/reply/commands-allowlist.ts:671`, `commands-config.ts:147`, `commands-owners.ts:176`: before `writeConfigFile`, if any touched path `isDbManagedPath` → reply `Managed in the hub: ${hubUrl}/settings/channels` and return without writing; tests per handler
- [ ] T031 [US2] `src/cli/config-cli.ts` subcommand `config shrink [--apply]`: list removable paths via `isDbManagedPath` over the loaded file; `--apply` writes `gateway.json.bak-042-<ISO>` then the shrunk file; refuse when `channelConfigSource() !== 'db'` or `mirrorMeta().size === 0`; test on a fixture shaped like prod FACES
- [ ] T032 [US4] Run quickstart S4 proof (`--slice 4`): command reply + unchanged hash; shrink dry-run/apply on the QA container; restart shows `0 json fallbacks`
- [ ] T033 [US2] Open gateway PR `feat(config): operator commands defer DB-managed channel keys to the hub; config shrink` → `DEV`
- [ ] T034 [OWNER] [US2] After deploy: `minion config shrink` dry-run then `--apply` inside each tenant container; confirm boot log `N accounts hydrated, 0 json fallbacks`

## Phase 6: User Story 3 — S5 settings table + editor write path (Priority: P3)

**Independent test**: quickstart S5.

- [ ] T035 [US3] Hub worktree `hub-042-s5` from `origin/master`
- [ ] T036 [US3] Migration `supabase/migrations/<YYYYMMDDHHMMSS>_gateway_settings.sql`: table per data-model.md (`gateway_id uuid not null references gateway(id) on delete cascade`, `section text not null`, `value jsonb not null`, `version integer not null default 1`, `updated_by uuid null`, `updated_at timestamptz not null default now()`, `primary key (gateway_id, section)`); idempotent `create table if not exists`; add Drizzle table in `src/server/db/pg-gateway-settings-schema.ts`
- [ ] T037 [P] [US3] QA seed: `scripts/qa/seed/` adds one `gateway_settings` row (`hooks`) for `qa-gw-a`; `matrix.ts` entry (migration-seed pairing CI)
- [ ] T038 [US3] `src/server/services/gateway-settings.service.ts`: `listSettings(gatewayId)`, `putSetting(ctx, gatewayId, section, value, expectedVersion?)` (reject sections in `BOOTSTRAP_SECTIONS = ['gateway','auth','authProviders','identity','meta','wizard','logging']`, validate `value` against the section's JSON schema fetched once from the gateway `config.schema` RPC and cached 10 min, bump version, then `signalGateway(gatewayId, ['gateway-settings:<gatewayId>:<section>:<version>'])`); unit tests incl. secret-shape guard
- [ ] T039 [US3] Routes `src/routes/api/gateways/[id]/settings/+server.ts` (GET) and `.../settings/[section]/+server.ts` (PUT) with `requireOrgCapability(locals,'gateways','edit')`; add `/api/gateways` to `API_WRITE_PREFIXES` in `rbac.service.ts` if absent; route tests
- [ ] T040 [US3] Hydration endpoint `src/routes/api/internal/gateways/settings/+server.ts` (GET, same auth + header rule as channels) returning contracts §3 shape via `getCoreDb()` filtered by the resolved gateway id
- [ ] T041 [US3] Editor: `src/lib/state/config/config.svelte.ts` + `/config` components — DB-managed sections (`plugins`, `agents`, `hooks`, `cron`) save through PUT with `expectedVersion`, show version + "pending restart" badge from `health.settingsConfig`; bootstrap sections render read-only with reason; Paraglide strings; `i18n:compile`; `lint:design && lint:tokens`
- [ ] T042 [US4] Run quickstart S5 proof (`--slice 5`); `*.sql.integration.test.ts` for the migration on the QA DB
- [ ] T043 [US3] Open hub PR `feat(gateways): per-gateway settings table, API and editor write path` → `master`

## Phase 7: User Story 3 — S6 gateway settings overlay (Priority: P3)

**Independent test**: quickstart S6.

- [ ] T044 [US3] Gateway worktree `gw-042-s6` from `origin/DEV`
- [ ] T045 [US3] `src/config/settings-overlay.ts`: `globalThis` state `{sections: Map<section,{value,version}>, lastHydratedAt, snapshotAt, pendingRestart: Set, invalid: Map}`; `withSettingsOverlay(cfg)` replaces each present section; `readSnapshot()`/`writeSnapshot()` for `~/.minion/settings-overlay.json` (mode 0600); `settingsSource()` reads `GATEWAY_SETTINGS_SOURCE=json|db` (default json); tests
- [ ] T046 [US3] `src/config/io.ts` `loadConfig()`: apply `withSettingsOverlay` to the loaded config when `settingsSource()==='db'`; keep the 200 ms cache semantics; test proves file sections untouched when the overlay is empty
- [ ] T047 [P] [US3] `src/gateway/settings-hydrate.ts`: pull `/api/internal/gateways/settings` with bearer + `x-minion-server-id`; validate merged config with `validateConfigObject`; on invalid section keep previous and set `invalid[section]=reason`; on success replace overlay + `writeSnapshot()`; tests with fake fetch
- [ ] T048 [US3] `src/gateway/config-reload.ts`: export `applyExternalConfigChange()` that runs the existing diff/plan path with `nextConfig = withSettingsOverlay(fileSnapshot.config)`; for changes whose paths are overlay sections, `restart`-class → `pendingRestart.add(section)` + log, never `onRestart`; `hot` → existing `onHotReload`; a file edit touching an overlay section logs once `section <s> is DB-managed; file value ignored`; tests
- [ ] T049 [US3] `src/gateway/events-http.ts`: on tag `gateway-settings:<gatewayId>:<section>:<version>` → `settingsHydrate()` then `applyExternalConfigChange()` (detached); `server.impl.ts`: boot order = `readSnapshot()` → serve → `settingsHydrate()`; add a 5-min tick like the mirror's
- [ ] T050 [US3] `health.ts`: `settingsConfig` block per contracts §5; snapshot test
- [ ] T051 [US4] Run quickstart S6 proof (`--slice 6`): hooks hot ≤10 s, plugins pending, hub stopped → snapshot boot
- [ ] T052 [US3] Open gateway PR `feat(config): DB-sourced settings overlay with hot apply, pending-restart and local snapshot` → `DEV`
- [ ] T053 [OWNER] [US3] Set `GATEWAY_SETTINGS_SOURCE=db` per tenant via `set-runtime-env.sh`; first sections `plugins`, `agents`, `hooks`, `cron`; then `minion config shrink` picks them up (extend `isDbManagedPath` in the same PR)

## Phase 8: Polish & cross-cutting

- [ ] T054 Remove the primary single-URL broadcaster path in hub `src/lib/server/cache.ts` once `signalGateway` carries every gateway-bound signal, or document it with `TODO(handoff)` + `proposals/` entry (research R2 open item)
- [ ] T055 `proposals/2026-10-28-gateway-config-db-followups.md` in meta: discord compare still deferred; remaining sections not yet migrated; prod primary-token lookup failure; duplicate PANIK row disposition
- [ ] T056 Update `specs/042-gateway-config-db/spec.md` frontmatter `status` per slice landing and add the top-level board stub `specs/2026-10-28-gateway-config-db-spec.md` pointing at the directory (constitution §Artifact layout)
- [ ] T057 Memory: fold the flip recipe and S1 root cause into `whatsapp-member-mode-golive-2026-10-23.md` (done 2026-10-29) and the spec outcome into a new topic note when S6 ships

## Dependencies

- Phase 1 → Phase 2 (S1) → T016/T017 (S2 flip) → Phase 4 (S3, needs 24 h bake) → Phase 5 (S4, needs S3 live) ; Phase 6 (S5) can start after S1 merges and runs parallel to S3/S4 ; Phase 7 (S6) needs S5 deployed.
- Inside S1: T006 (hub, flag off) deploys before T009 (gateway); the require-flag flips on after both are live. T013 data fix before T016.

## Parallel examples

- S1: T007 ∥ T009 ∥ T010 ∥ T012 (different repos/files); T003 ∥ T004.
- S3: T020 ∥ T021 ∥ T022 (separate components).
- S5/S6 overlap S3/S4 on different repos.

## Implementation strategy

MVP = Phase 1 + Phase 2 + T016 (S1 on FACES): rule changes from the hub land on the right gateway, observable in the host card. Everything after is incremental and independently revertible (flags, backups, versioned rows).
