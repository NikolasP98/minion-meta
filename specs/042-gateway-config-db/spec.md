---
id: 042-gateway-config-db
title: Gateway config lives in the DB — finish the channels cutover, add per-gateway settings, shrink gateway.json to bootstrap
status: draft
created: 2026-10-28
updated: 2026-10-28
repos: [minion, minion_hub, minion-meta]
tags: [security, data, gateway, infra]
---

# Feature Specification: Gateway config lives in the DB

**Feature Branch**: `docs/spec-042-gateway-config-db` (meta) · gateway slices → `DEV` · hub slices → `master` (see plan.md)
**Created**: 2026-10-28
**Status**: Draft. **Security + data tag**: this moves tenant-scoping inputs (`accountOrgs`, per-account allowlists) and the gateway's live reply gates to a DB-sourced path, so the owner approves this spec before any code and merges every slice. Production flips are env/flag changes the owner runs.
**Input**: Owner, 2026-10-28: "we need to migrate from the .json config file. I believe it should be stored in a db table and be cached to avoid constant db dings and hot-loaded when channel or other gw settings change. when implementing via egm/speckit/gsd, test locally before deployment."

## Why now

The trigger was a one-line question: "I added the FACES-registered whatsapp (PANIK) to 2 group chats. please confirm if they can be read." The answer was no, and the reason was not a bug in any code path. The rule that blocks group messages lives in a JSON file on the gateway host (`gateway.json`), while the hub's channel card already writes the DB and says, in its own comment, that a JSON patch "would be reverted on restart". The two halves of a migration designed in June 2026 are both shipped and neither is on: the gateway still reads the file, the hub already writes the table. Every channel toggle an org admin makes in the hub today is silently ignored by the gateway. This spec finishes that migration and uses the same mechanism for the rest of the gateway's non-secret settings.

## AS-IS (evidence)

Anchors: gateway `minion` `origin/main @ 50a3036ad7f`; hub `minion_hub` `origin/master @ 812a4b0a`; prod FACES gateway container `minion_gateway-faces.1.*` on netcup, state volume `/var/lib/docker/volumes/minion_faces_state/_data/`; hub DB via `mcp__supabase__execute_sql` on 2026-10-29 01:35Z.

### A. The DB read path for channels is built, dark, and switched off in prod
- Flags, read at call time: `channelConfigSource()` returns `db` only when `CHANNEL_CONFIG_SOURCE=db` (`src/gateway/channel-mirror.ts:30-32`); `orgScopeSource()` same for `ORG_SCOPE_SOURCE` (:41-43); `runtimeApplyEnabled()` for `CHANNEL_RUNTIME_APPLY` (:52-54).
- Prod values, FACES state volume `gateway.env`: `CHANNEL_CONFIG_SOURCE=json`, `ORG_SCOPE_SOURCE=json`, `CHANNEL_RUNTIME_APPLY=0`. The docker service env carries only `MINION_*` keys; the three flags reach the process through this file.
- The mirror: `Map<type:accountId → HydrationItem>` anchored on `globalThis` (`channel-mirror.ts:85-100`), seeded at boot (`server.impl.ts:959`), re-pulled every 5 min (`DEFAULT_TICK_MS = 5 * 60_000`, `channel-mirror.ts:21`, `:164-172`), refreshed on the hub's `cache.invalidate` HTTP push (`events-http.ts:71-75` → `channelMirrorCompareFromTags`). `seedMirror` keeps the last-good map when a hydrate returns empty (:151-162, "never-silently-disable").
- Dispatch consumers already read the mirror when the flag is `db`: `resolveWhatsAppAccount` overlays `allowFrom/groupAllowFrom/requireMention/replies/enabled` from `getMirrorEntry` (`src/channels/whatsapp/accounts.ts:169-193`), json fallback on miss (:182). The listen-only kill switch `replies:'none'` is checked first in `src/web/inbound/access-control.ts:70-85` and is "only set in CHANNEL_CONFIG_SOURCE=db mode".
- Hydration transport: gateway → hub `GET /api/internal/channels/resolved` with the metrics bearer (`src/gateway/channel-hydrate.ts:78-83`). Hub side resolves the gateway from `locals.serverId` and returns every `channels` row `where gateway_id = <that gateway>` (`minion_hub/src/routes/api/internal/channels/resolved/+server.ts:26-50`).
- Hub writes already target the DB: the channel card's enable toggle does `PUT /api/servers/{id}/channels/{channelId}` and the comment says "A json config.patch here would be reverted on restart" (`ChannelCard.svelte:163-170`). The PUT calls `publishChannel` (`channel-publish.service.ts`), which writes Valkey at `channel:<type>:<accountId>` with a 30 min TTL and fires `invalidateTags` → gateway `/events/cache-invalidate`.
- The design is `specs/2026-06-26-gateway-config-db-migration-plan.md` (frontmatter `status: shipped`). Phases P0–P3 and a "P6 cleanup" landed (`git log`: `b2cde707f2e` P2.5, `d5711b24f09` P3-T3, `3d43633673e` P3-T3c, `c6195126511` P6). **P4 (hub stops writing the file) and P5 (file shrink + operator commands) did not land**, and the flags were never flipped.

### B. One bug blocks the flip: every gateway hydrates the wrong rows
- `hydrateChannels` sends only `authorization: Bearer <apiKey>` (`channel-hydrate.ts:81`). The hub derives the gateway from the `x-minion-server-id` header hint (`minion_hub/src/server/auth/resolve-identity.ts:311`); without it, the shared metrics token resolves to the first gateway record. The message-ledger flusher already sends the header (`src/infra/message-ledger-flusher.ts:77`), hydrate does not.
- Consequence recorded 2026-10-23 (memory `whatsapp-member-mode-golive-2026-10-23`): both netcup gateways load the MINION gateway's rows (`870bd8f1…`); the FACES card toggle on row `rtvk049q2n9s3fauxsx6hzn9` (gateway `a64274a8…`) is ignored; the workaround was a direct DB edit on the other org's row.
- The two physical gateways and their rows today: MINION gateway `870bd8f1-23b2-4542-b788-30ece0221532` (org `c9e8dc46…`), FACES gateway `a64274a8-5803-418c-b92e-527e23f4a005` (org `21e0601b…`). PANIK `+51902829738` has a `channels` row on both.

### C. gateway.json is still the runtime carrier, and three writers keep it so
- Prod FACES `gateway.json` (33,734 B, 23 top-level sections). `channels` (1,218 B) holds `accountOrgs` plus whatsapp/telegram/discord account blocks with `dmPolicy`/`groupPolicy`/`debounceMs`/`name`/`authDir`. The PANIK block: `groupPolicy:"allowlist"`, no `groupAllowFrom` anywhere ⇒ `access-control.ts:126-134` blocks every group message (verbose-only log). Hub `channels.group_allow_from` is `[]` on both PANIK rows, so a flip alone would not open groups; the rule must then be set in the hub.
- Hub writers that still patch the file over the `config.patch` RPC: `ChannelSetupWizard.svelte:205`, `ChannelGroup.svelte:65`, `ChannelCard.svelte:282,352` (whatsapp `markOnline`: "source of truth is gateway.json, NOT the DB mirror" :256), `HistorySyncControl.svelte`, `ChannelLinking.svelte`, `/api/org-config/tick` (`reconcileOrgConfig` → `accountOrgs`/`orgDisabled`), `/api/plugins/[id]/toggle`, `/api/personal-agent/*`, `/home/settings`, `/onboarding`.
- Gateway operator chat commands write the file directly: `commands-allowlist.ts:671`, `commands-config.ts:147`, `commands-owners.ts:176` (all `writeConfigFile`).
- The gateway's own hot-reload is file-driven: chokidar watches the file and classifies each changed prefix as `hot | restart | none` (`src/gateway/config-reload.ts:50-90`; e.g. `hooks` hot, `cron` hot, `browser` hot, `plugins` restart, `gateway` restart, `models`/`agents`/`tools` none = read live on next access). Channel plugins add `restart-channel:<id>` rules (:105-135).

### D. Secrets and bootstrap already have a stable boundary
- Secrets stay on the gateway host: whatsapp creds under `credentials/whatsapp/<account>` referenced by `channels.auth_ref`; telegram/discord tokens inline in the file; hub token in `gateway.hubMetrics.apiKey`. The hydration projection is a strict allowlist and never carries credentials (`channel-publish.service.ts` `projectChannelRow`).
- `gateway.hubMetrics` in prod: `{enabled, hubUrl, apiKey, serverId: a64274a8…, tursoUrl, pushIntervalMs, eventStore}` — the gateway already knows its own server id.

### E. There is no DB home for non-channel gateway settings
- Hub DB `gateway` table: `id, legacy_server_id, name, url, token_ciphertext, token_iv, auth_mode, last_connected_at, created_at, updated_at` (`packages/db/src/pg/schema/gateway.ts:9-23`). No settings column, no `gateway_settings` table (information_schema query, 2026-10-29).
- The hub's config editor (`src/lib/state/config/config.svelte.ts`, `/config` route) reads and writes the whole file through `config.get`/`config.patch`.

### F. Local test tooling
- Hub: `bun run dev:local` (`scripts/qa/dev.ts`) boots a seeded QA Postgres on 54422 and a dev server on 5199. The `--gateway` variant (hub draft PR #543, spec 011) was **closed, not merged**; there is no one-command local gateway today.
- Gateway: `docker-compose.yml` runs `minion-gateway` + `valkey` locally with `~/.minion` mounted as config; `pnpm gateway:dev` runs it in-process with channels skipped.
- Gate rule (memory `gw-no-full-test-suite`): never run the full gateway suite; the gate is `pnpm vitest run test/ci/`. Hub full suite needs `HUB_TEST_DB_URL` and an unset `SUPABASE_DB_URL`.

**Out of scope:** moving secrets (bot tokens, whatsapp creds, hub token) into the DB; multi-gateway pub/sub fan-out (two gateways today, HTTP push per gateway is enough); a new settings UI beyond re-pointing the existing hub config editor; Signal/Line/iMessage/Slack channel rules (not DB-migrated by the precursor spec, they stay in the file); changing any reply semantics (`replies`, `allow_from` derivations stay exactly as P2.5/P3 defined them).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A channel rule set in the hub takes effect on the right gateway, live (Priority: P1)

An org admin opens a channel card in the hub, changes who may talk to the account (allow list, group allow list, mention requirement, enabled, listen-only) and saves. Within seconds the gateway that runs that account behaves accordingly. No file edit, no restart, no effect on any other gateway or org. The live proof is the PANIK account: set "groups: anyone, mention required" on the FACES row and the two groups the owner added become readable.

**Why this priority**: it is the owner's open problem today, it is the piece the hub already pretends to do, and it is the smallest step that retires the file for the most dangerous section (reply gates and tenant scoping).

**Independent Test**: on the local QA stack with two fake gateway records, change a rule on gateway A's row; gateway A applies it within 10 s and gateway B's mirror is unchanged. Then in prod, after the owner flips the flags on one gateway, repeat with PANIK.

**Acceptance Scenarios**:

1. **Given** a gateway hydrating with its own server id, **When** the hub returns channel rows, **Then** the mirror contains only rows whose `gateway_id` equals that gateway and the count is logged.
2. **Given** `CHANNEL_CONFIG_SOURCE=db` and `CHANNEL_RUNTIME_APPLY=1`, **When** an admin saves a group allow list of `*` on an account, **Then** the gateway accepts a group message from that account within 10 s, with mention gating unchanged, and no restart is logged for other channel types.
3. **Given** the same flags, **When** an admin disables an account, **Then** the gateway stops that account's provider within 10 s and the hub card shows it offline.
4. **Given** the hub is unreachable for 30 minutes, **When** messages keep arriving, **Then** every account keeps its last-good rules and nothing is disabled; a warning is logged once per failed re-pull.
5. **Given** a rollback need, **When** the owner sets `CHANNEL_CONFIG_SOURCE=json` and restarts the service, **Then** the gateway behaves exactly as before the flip.

---

### User Story 2 - The hub is the only writer of channel rules; the file stops carrying them (Priority: P2)

After the flip bakes, every hub surface that still patches channel rules into the file writes the DB instead, the per-account rule blocks and `accountOrgs` leave `gateway.json`, and an operator who types a channel allowlist command in chat is told to use the hub.

**Why this priority**: as long as a second writer exists the file silently re-grows and the two sources drift; the June plan called this "a prod outage wearing a cleanup's clothes" if done before P1 bakes.

**Independent Test**: grep the running gateway's file for `channels.<type>.accounts.*.(allowFrom|groupAllowFrom|dmPolicy|groupPolicy|enabled)` and `channels.accountOrgs` → zero keys; toggle every channel surface in the hub and confirm the file's hash does not change.

**Acceptance Scenarios**:

1. **Given** the flip has been live with zero `accountOrgs` diffs for 24 h, **When** the hub's org-config tick runs, **Then** it writes `channels`/plugin org rows only and sends no `config.patch`.
2. **Given** the wizard links a new WhatsApp number, **When** it commits, **Then** a `channels` row exists with the correct `gateway_id` and the file gains at most the creds pointer.
3. **Given** an operator sends `/allowlist add +51…` in chat, **When** the gateway handles it, **Then** it replies with a short "manage this in the hub" message and writes nothing.
4. **Given** the shrink is applied, **When** the gateway restarts, **Then** every account comes up with the DB rules and the boot log shows `N accounts hydrated, 0 json fallbacks`.

---

### User Story 3 - Other gateway settings follow the same path (Priority: P3)

An admin edits a non-secret gateway setting in the hub's config editor (for example a hook mapping, cron entry, plugin enable, agent default). The hub stores it per gateway, signals the gateway, and the gateway applies it the way it applies a file edit today: hot where the setting is hot, "restart required" shown in the hub where the setting needs a restart. The gateway never asks the hub for a setting while handling a message.

**Why this priority**: it is the owner's stated goal ("channel or other gw settings") and the channels work builds the exact mechanism; but it only becomes safe once channels prove the loop in prod.

**Independent Test**: on the local stack, change a hot section (hooks) and a restart section (plugins) from the hub; the gateway applies the first within 10 s and marks the second pending; a gateway restart boots with both from the DB and a file that contains no such sections.

**Acceptance Scenarios**:

1. **Given** a setting section marked hot, **When** it changes in the hub, **Then** the gateway applies it within 10 s without a process restart and logs the applied prefix.
2. **Given** a section marked restart, **When** it changes, **Then** the gateway does not restart on its own; the hub shows "restart required" for that gateway until the owner restarts it.
3. **Given** a hub outage at boot, **When** the gateway starts, **Then** it uses the warm cache if present, else the last snapshot it persisted locally, and serves traffic; it never boots with empty settings while a snapshot exists.
4. **Given** the hub config editor, **When** an admin views a gateway, **Then** DB-backed sections are editable and bootstrap/secret sections are shown read-only with the reason.

---

### User Story 4 - Everything is proven on the local stack before prod (Priority: P1, cross-cutting)

Each slice ships with a local run: hub `dev:local` plus a local gateway container pointed at it, exercising write → signal → apply → restart-from-DB, before any prod env change. The prod change is a flag or env edit the owner runs, with rollback being the same edit reversed.

**Why this priority**: owner instruction, and the live reply path is the one that produced the 2026-06-28 incident.

**Independent Test**: a scripted local proof per slice, checked into the gateway repo under `test/ci/` or a `scripts/qa/` runner, that fails if any step of the loop is missing.

### Edge Cases

- Hub returns zero rows for a gateway that has accounts: keep the last-good mirror, warn; never treat empty as "disable all".
- A row exists in the DB but the account has no credentials on this host: show "needs pairing" in the hub; do not start the provider.
- Two gateways share a bearer: every hydrate must carry the server id; a request without it is rejected, not defaulted.
- A setting value fails validation: the hub refuses the save with the schema error; the gateway never applies an invalid document.
- Valkey is cold or down: the gateway falls back to a hub pull, then to its local snapshot; latency of message handling is unaffected because reads stay in memory.
- The owner edits `gateway.json` by hand for a migrated section: the gateway logs a one-line warning that the section is DB-managed and ignores the file for it.
- A `restart` class setting changes during an incident: nothing restarts automatically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each gateway MUST hydrate only the channel rows that belong to it, identified by its own server id on every request; a hydrate without an id MUST be rejected by the hub.
- **FR-002**: With the DB source enabled, a channel rule saved in the hub MUST be in effect on the gateway within 10 s, with the per-channel start/stop driven by the signal, and no other channel type restarted.
- **FR-003**: The gateway MUST read channel rules and settings synchronously from memory while handling a message; no DB, cache, or hub call MAY occur on the per-message path.
- **FR-004**: The gateway MUST keep the last-good rules when a refresh fails or returns empty, warn once per failure, and resume on the next successful pull.
- **FR-005**: The DB source MUST be switchable per gateway by an env flag the owner edits, with restart-only rollback to the file source for the whole bake period.
- **FR-006**: After the bake, no hub surface MAY write channel rules or `accountOrgs`/`orgDisabled` into `gateway.json`; each surface writes the DB and publishes.
- **FR-007**: Gateway operator chat commands that edit channel rules MUST stop writing the file and reply with a pointer to the hub.
- **FR-008**: The per-account rule blocks and `accountOrgs` MUST be removed from `gateway.json` on both gateways once FR-006 is live, with the gateway booting entirely from the DB for those sections.
- **FR-009**: The hub MUST store non-secret gateway settings per gateway as versioned section documents, validated against the gateway's own config schema before save.
- **FR-010**: The gateway MUST hydrate settings at boot (warm cache → hub → local snapshot), persist a local snapshot after each successful hydrate, and apply changes through the existing hot/restart/none classification.
- **FR-011**: A restart-class change MUST NOT restart the gateway automatically; the hub MUST show "restart required" for that gateway until it restarts.
- **FR-012**: Secrets and bootstrap fields (gateway id, port/bind, auth, hub URL + token, channel credentials and tokens) MUST remain outside the DB and remain readable only on the gateway host.
- **FR-013**: The hub config editor MUST edit DB-backed sections through the DB path and present bootstrap/secret sections read-only.
- **FR-014**: Every slice MUST include a local-stack proof (hub `dev:local` + local gateway) that exercises write → signal → apply → restart-from-DB, and MUST pass before any prod env change.
- **FR-015**: The gateway MUST expose an observable (health or status frame) stating the config source per section, the mirror size, the last successful hydrate time, and pending-restart sections, so the owner can verify a flip without reading logs.

### Key Entities

- **Channel rule**: the per-account reply and access surface already in `channels` (`enabled`, `replies`, `allow_from`, `group_allow_from`, `require_mention`, `settings`, `auth_ref`, `gateway_id`, `tenant_id`). Unchanged shape; this spec changes who reads it.
- **Gateway setting**: a non-secret top-level config section for one gateway (section name, JSON document, version, updated by, updated at). Sections classified bootstrap or secret never appear here.
- **Change signal**: the existing hub → gateway HTTP push carrying tags for what changed; the gateway re-pulls on it.
- **Mirror / warm cache / snapshot**: the gateway's in-memory copy (read on every message), the short-TTL shared cache (warm start), and a local last-good file (boot without hub).
- **Bootstrap file**: what remains of `gateway.json`: identity, listen, auth, hub endpoint and token, secrets, channel-type presentation defaults.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A channel rule saved in the hub is in effect on its gateway within 10 s in 95% of changes, with no gateway restart, on both prod gateways.
- **SC-002**: The PANIK account reads its two group chats within one minute of the admin setting the group rule in the hub, with zero edits to `gateway.json`.
- **SC-003**: 24 h after the flip, the compare log shows zero `accountOrgs` diffs and zero json fallbacks on each gateway.
- **SC-004**: After the shrink, `gateway.json` on each gateway contains no per-account rule keys and no `accountOrgs`; a restart brings every account up from the DB with 0 json fallbacks.
- **SC-005**: Message handling latency is unchanged: no per-message DB or network read is introduced (asserted by test, confirmed by the gateway's own health observable).
- **SC-006**: A 30 min hub outage during business hours causes zero channel disconnects attributable to config.
- **SC-007**: A hot setting edited in the hub applies within 10 s; a restart-class edit shows "restart required" in the hub within 10 s and never restarts on its own.
- **SC-008**: Every slice's local proof exists and passes in CI before its prod flag change; the owner can name the run for each.

## DELTA (transitions and the test that proves each)

| # | From | To | Proof |
|---|---|---|---|
| D1 | hydrate sends bearer only; every gateway gets the first gateway's rows | hydrate sends `x-minion-server-id`; hub rejects missing id | unit: request carries header; integration on local stack with 2 gateway rows: each sees only its own |
| D2 | prod flags `json/json/0` | one gateway `db/db/1`, bake, then the other | prod observable (FR-015) + compare log; PANIK group message lands |
| D3 | hub patches channel rules into the file (surface E) | hub writes DB + publishes only | hub tests: no `config.patch` with a `channels.` prefix from those surfaces; file hash unchanged under hub actions |
| D4 | operator commands write channel keys | commands reply "use the hub" | gateway unit tests on the three command handlers |
| D5 | file carries rule blocks + `accountOrgs` | file carries creds pointers + type defaults only | boot log `0 json fallbacks`; file key assertion |
| D6 | no DB home for settings; editor patches the file | `gateway_settings` per gateway; editor writes DB; gateway applies via prefix map | local stack: hooks change hot in <10 s, plugins change marks pending; restart boots from DB |
| D7 | hub outage at boot = empty config for DB sections | warm cache → hub → local snapshot | local stack with hub stopped: gateway boots with snapshot |

## Assumptions

- The June 2026 design (`specs/2026-06-26-gateway-config-db-migration-plan.md`) stands; this spec executes its P4/P5 and adds the settings vertical as its "next vertical". Reply semantics from P2.5/P3 are not revisited.
- Flip order: the MINION gateway (fewer live customer accounts) first, 24 h bake, then FACES. The owner may reverse this to get PANIK groups sooner; the risk is the same code on a busier account set.
- Settings scope for the first settings slice: the sections the hub already edits through `config.patch` today (`plugins`, `agents`, `hooks`, the channel-type transport knobs such as whatsapp `markOnline`/`historySync`) plus `cron`. `models`, `tools`, `memory`, `skills`, `session`, `messages`, `browser` follow in a later slice only if the owner asks; they stay in the file meanwhile and keep today's reload behaviour. (Informed default; the owner can widen or narrow it at `/speckit-plan`.)
- Restart-class sections never auto-restart a shared gateway. The owner restarts via the existing swarm tooling.
- "Cached" means: in-memory mirror read per message, short-TTL Valkey entry for warm start, local last-good snapshot for hub-less boot. There is no per-request cache lookup.
- Two gateways exist and will for the foreseeable future; HTTP push per gateway is the transport, pub/sub fan-out is not built.
- The local proof uses the hub's existing `dev:local` QA stack and the gateway's `docker-compose.yml`; wiring them together is a plan task, not a new product.
- Secrets never enter the DB or Valkey; a CI test asserting no credential-shaped string in `channels` rows and settings documents continues to hold.
