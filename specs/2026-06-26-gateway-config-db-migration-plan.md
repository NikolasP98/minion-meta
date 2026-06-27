# Gateway Config: `gateway.json` → DB Migration Plan

**Date:** 2026-06-26
**Status:** Design / proposed — Phase 0 shipped (commit `33cd624`, applied to gxv)
**Scope:** gateway (`minion/`), `@minion-stack/db`, `minion_hub/`, Valkey
**Precursor:** [`2026-06-19-linked-channels-config-restructure.md`](./2026-06-19-linked-channels-config-restructure.md) — this plan executes its follow-ups **#1 (migration)** and **#2 (gateway runtime-apply)**. Follow-up **#3 (noAgent reply-path)** already shipped; **#4 (hub UI writes DB)** is partially shipped (channel rows + bindings + `account_id` persistence) and finishes here.

## Where we actually are (verified 2026-06-26)

Not a greenfield. The DB half is ~90% built; the **gateway runtime half is 0% built**. Concretely:

- **DB (`@minion-stack/db/pg`, `channels` + `channel_bindings`):** the spec's *Intent* and *Observed* columns already exist as typed columns — `enabled`, `replies`, `allow_from`, `group_allow_from`, `require_mention`, `reconnect_count`, `last_seen_at`, `last_error`, plus `account_id`, `label`, `status`, `credentials(_iv/_meta)`. Bindings exist (`match_kind`/`match_peer`/`agent_id`, `agent_id = null` = noAgent). The spec's proposed *new* `linked_channels` table was instead **folded onto the existing `channels` table** — fine, same shape.
- **Hub → gateway today:** the hub writes channel rules to the DB **and** mirror-pushes a subset into `gateway.json` over the `config.patch` RPC (`reconcileOrgConfig` for `accountOrgs`/`orgDisabled`; the wizard's `commit()` and the new `ensureGatewayWhatsappAccount` for `accounts[phone]`).
- **Gateway reads `gateway.json` for 100% of runtime channel config.** Zero DB reads on the channel path. `accountOrgs`/`orgDisabled` are DB-authoritative but consumed by the gateway **only** via their `gateway.json` mirror (read synchronously from in-memory config for org enforcement). Secrets (`botToken`, discord `token`, whatsapp `authDir`) live **only** in `gateway.json` / on disk.

> **This is why nothing can be deleted from `gateway.json` yet.** The keys the DB "manages" are not duplicates — `gateway.json` is their *runtime carrier*. The migration is therefore not a cleanup; it is **building the gateway's DB read path** so the carrier can be retired. Deletion is the *last* phase, not the first.

The gateway already **watches `gateway.json` via chokidar** and hot-reloads `channels.<id>` prefixes in-process (verified: removing dead `channels.whatsapp-cloud` hot-reloaded with zero downtime). So the in-process start/stop machinery the spec wants for Valkey events **already exists** — it's currently keyed off file changes instead of pub/sub.

## North star (target operating model)

`gateway.json` shrinks to a **bare-minimum bootstrap file** — only what a fresh process needs to come up and reach its data plane. Everything else (channels now; agents/models/tools later, same pattern) lives in the **DB** and reaches the gateway over a **live data connection**, hot-applied with no restart. Concretely:

- **Bootstrap-minimum `gateway.json`** (the only thing you copy/template for a new instance): gateway `id`/identity, listen `port` + bind, the gateway's own `auth` mode/secret for incoming WS, the **data-plane endpoint + token** (Valkey URL/creds + hub base URL/token), and genuinely hardcoded process flags. Nothing per-account, no business rules.
- **Easy to replicate a new gateway instance:** drop the bootstrap file (or env), boot → authenticate to the data plane → **hydrate the in-memory mirror from the DB** → subscribe for deltas. No per-account config to hand-copy, **no Supabase creds on the node** (the hub owns the DB; the gateway never connects to Postgres directly).
- **Live data plane, minimize interruptions (transport settled by consensus review — see below):** the hub runs **serverless (Vercel)** and never holds the socket; the **long-lived gateway holds the receiver**. The live path reuses the **already-in-prod `HttpBroadcaster`** (`packages/cache/src/broadcaster.ts` → gateway `/events/cache-invalidate`, `events-http.ts`): hub fires an HTTP-push *change signal* on every mutation; the gateway re-pulls. **Valkey is warm cache only** (the gateway's redis client has `get`/`set`, **not** pub/sub — so "standing Valkey subscription" was never viable). Cold-start/cold-cache **hydration is a hub WS RPC** the gateway calls (keeps "no Supabase creds on the node"). Valkey pub/sub fan-out is the **multi-gateway upgrade path only** (YAGNI: one gateway today; swapping HTTP-push→PUBLISH later is a one-function change in the hub, untouched on the gateway). The gateway's existing WS server stays up serving hub RPC + frontend events.
- **RPC scoped to the bootstrap json + hardcoded config.** `config.get/patch/set/apply` operate **only** on the bare json (host/process). Channel (and future DB-backed) config is **never** mutated via `config.patch` — it's a DB write + publish. This is the clean split the request asks for: RPC bound to the json; live data bound to the DB.

Channels are the **first vertical** of this model — the proving ground. Agents/models/tools/hooks can follow the same DB-backed + live-broker pattern as separate efforts; this spec does **not** boil that ocean, it builds the template.

## Goal & non-goals

**Goal:** the gateway sources **per-account channel rules** from the DB, held in a **synchronous in-memory mirror** kept warm by live change events over the data plane, so a channel enable/disable/edit is a DB write that hot-applies in-process — no `gateway.json` edit, no `oidcIssuers`-drift restart.

> **★ Architecture constraint (from the 2026-06-26 runtime audit — the single most important design input).** The gateway reads channel config **synchronously from the in-memory config on every inbound message** — `cfg.bindings` (`routing/resolve-route.ts:239`), `accountOrgs` (`plugins/org-enforcement.ts:50`), `resolveAllowFrom` (`command-auth.ts:57`), and per-account `dmPolicy`/`allowFrom`/`streamMode`/`debounceMs` (`channels/whatsapp/accounts.ts:119-151`, `commands-allowlist.ts:370`). Therefore the gateway **must NOT do an async DB/Valkey read per message** — that's a latency regression on the hottest path. The migration **replaces "load `gateway.json` into memory" with "load DB → memory, refresh on event"**: the dispatch path stays a sync in-memory read; only the *source* of that memory changes, and only the *refresh trigger* moves from chokidar-file-watch to a change event. Valkey is the cache/warm-start; the **event is the signal**, not a per-read fetch.

**Non-goals:**
- Moving **secrets** into the DB. `auth_ref` points at creds; creds stay on the gateway (disk for whatsapp authDir; `gateway.json` or a gateway-local store for bot tokens). Same boundary the precursor spec drew.
- Moving **non-channel config** (`models`, `memory`, `skills`, `browser`, `voiceProcessing`, `hooks`, `tools`, `agents`, `session`, `commands`, `approvals`, …) to the DB *in this spec*. They're future verticals of the same north-star pattern; **this spec migrates channels only**. The truly bootstrap-critical subset (`gateway` host, `auth`, identity, data-plane endpoint) stays in json permanently.
- A second source of truth. DB is authoritative; Valkey is a cache + event bus, rebuildable from DB at any time.

## Suitability matrix — every `gateway.json` channel field

Classify, don't sweep. Each field is one of: **(A)** already a DB column (gateway just needs to read it); **(B)** migrate — needs a new DB column; **(C)** stays in `gateway.json`/disk; **(D)** drop (derived or dead).

| `gateway.json` field (per account unless noted) | Class | Disposition |
|---|---|---|
| `enabled` | **A** | DB `channels.enabled`. Runtime-applied on pub/sub. |
| reply behavior (today: `dmPolicy` semantics) | **A** | DB `channels.replies` (`none`/`bound`) + bindings. |
| `allowFrom` | **A** | DB `channels.allow_from`. |
| group allow (today implied by `groupPolicy`) | **A** | DB `channels.group_allow_from`. |
| `groups["*"].requireMention` | **A** | DB `channels.require_mention` (the global default). |
| agent routing (today: `bindings[]` top-level array) | **A** | DB `channel_bindings`. |
| `name` | **A** | DB `channels.label`. |
| `authDir` (whatsapp) / creds location | **B** | New DB `channels.auth_ref` (explicit pointer, e.g. `whatsapp/51906090526`). Never the creds. |
| `debounceMs`, `streamMode`, `sendReadReceipts`, `selfChatMode`, `mediaMaxMb` | **B** | `settings jsonb`. Per-account transport knobs. |
| `messagePrefix`, `textChunkLimit`, `chunkMode`, `blockStreaming`, `ackReaction` (whatsapp); `block`, `allowed`, `blockEmojiReactions` (telegram) | **B** | `settings jsonb`. **Surfaced by the runtime audit** — `resolveWhatsAppAccount`/`resolveTelegramAccount` read these per-message; the bag is a superset of the obvious five. Validate the full set at the write path. |
| per-group overrides (`groups["<jid>"].requireMention`) | **B** | New `channel_group_rules` table (`channel_id`, `group_peer`, `require_mention`) — only if any account actually sets a non-default override. Today only `*` + one jid; **defer until a second real override exists.** |
| `botToken` (telegram), `token` (discord), `accessToken` | **C** | Secret. Stays in `gateway.json`/local store, resolved via `auth_ref`. DB stores only the pointer. |
| whatsapp authDir creds on disk | **C** | Stay on disk; `auth_ref` points at them. |
| `dmPolicy` (`open`/`allowlist`/`closed`) | **D→refactor** | **Drop as stored config, but NOT a free drop.** The runtime audit found the dispatch path *branches on `dmPolicy` directly* (`commands-allowlist.ts:370/396/402` filters allowed message types; `resolveWhatsAppAccount.dmPolicy`; `command-auth`). Dropping it means **rewriting every dispatch consumer to derive behavior from `allow_from` + `replies`** — the precursor spec's "one concern per column" refactor, not yet done in the runtime. Gets its own sub-phase (2.5). |
| `groupPolicy` | **D→refactor** | Same — derive from `group_allow_from`, but audit-confirmed there are direct runtime consumers; refactor in Phase 2.5. |
| `capabilities`, `markdown` (channel-type top) | **C/D** | Channel-**type** presentation defaults, not per-account business rules. Keep as gateway-level `gateway.json` defaults (don't per-account them). Revisit only if a per-account override case appears. |
| `channels.accountOrgs` (org-scope map) | **A**\* | Already DB-authoritative (`reconcileOrgConfig`). Under this plan the gateway reads it from the **DB-sourced** path, not the `gateway.json` mirror — then the mirror is removed. |
| `plugins.orgDisabled` | **A**\* | Same as `accountOrgs`. |

> **Observation — prefer one `settings jsonb` over five sparse columns.** `debounceMs`, `streamMode`, `sendReadReceipts`, `selfChatMode`, `mediaMaxMb` are low-traffic transport knobs, not things we filter/join on. A single `settings jsonb` column (validated by a zod schema in `@minion-stack/db`) avoids five migrations and keeps the typed columns for the things that matter (the reply/access surface that caused the incident). Promote a key to a real column only when a query needs it.

> **Observation — `dmPolicy`/`groupPolicy` are the only true *drops*.** Everything else either already has a home or gets one. The drop is safe because the gateway's access check can read `allow_from` directly; the policy label is a UI affordance computed on render.

## Schema delta (Phase 0)

```
ALTER TABLE channels ADD COLUMN auth_ref  text;            -- explicit creds pointer
ALTER TABLE channels ADD COLUMN settings  jsonb NOT NULL DEFAULT '{}'::jsonb;
-- runtime_status: reuse existing `status` OR widen its enum to
--   online | connecting | offline | logged_out | error
-- (precursor spec's Observed model). Keep `status` if the active/inactive/pairing
-- values are still needed by the hub; otherwise migrate the enum.
```

No new `linked_channels` table — extend `channels`. `channel_group_rules` deferred (YAGNI until a real per-group override exists beyond the global default).

**Phase 0 is shipped** (`auth_ref` + `settings` live on gxv, commit `33cd624`). `runtime_status` was deferred to Phase 3 (it's Observed/gateway-written; not on the read path) — `status` (active/inactive/pairing) stays as the hub badge, not widened.

## Impact register — runtime consumers (2026-06-26 audit)

Three parallel audits (gateway runtime, hub, other processes) mapped every dependent. Grouped by surface, with the phase that touches it and risk.

| Surface | Representative sites | Op | Phase | Risk |
|---|---|---|---|---|
| **A. Gateway dispatch (sync, per-message)** | `resolve-route.ts:239` (bindings), `org-enforcement.ts:50` (accountOrgs), `command-auth.ts:57` (allowFrom), **`web/inbound/access-control.ts:36/87/96/133` (WhatsApp dmPolicy/groupPolicy gate — the real per-msg site; `commands-allowlist.ts:370` was a mis-cite = operator display cmd)**, `telegram/bot-handlers.ts` + `group-access.ts`, `discord/monitor/allow-list.ts` + `message-handler.preflight.ts`, `whatsapp/accounts.ts:118-151` (~15 fields), `dock.ts:168/209/264` | read mem | **P2.5+P3** (DB→sync mem mirror) | **CRITICAL** |
| **B. Gateway lifecycle/startup** | `server-channels.ts:190-221` (listAccountIds/resolveAccount/isEnabled/isConfigured), `config-reload.ts:107-136` (`channels.<id>`→restart-channel) | read mem | P3 | High |
| **C. Gateway config RPC** | `server-methods/config.ts` get/set/patch/apply→`writeConfigFile`; `channels.ts:90` status payload + accountOrgs filter | r/w json | P4–5 | High |
| **D. Gateway operator chat-commands** | `commands-config.ts`, `commands-allowlist.ts`, `commands-owners.ts` → `writeConfigFile` (operators editing channels.* via chat) | write json | **P5 redirect/retire** | Med — *was missing from plan* |
| **E. Hub → gateway.json (`config.patch`)** | wizard `commit()`, `ChannelCard` toggle/remove, `ChannelGroup` transport, `reconcileOrgConfig` (cron+inline), `ensureGatewayWhatsappAccount` | write json | **P4–5 removed** | High |
| **F. Hub DB channels (target)** | `channel.service` CRUD, `channel-sync.import`, assignments, `/api/servers/[id]/channels/**` | r/w DB | P1–4 keep+extend | — |
| **G. Hub reads gateway state (display)** | `crm-channels.getChannelCatalog` (`channels.status` RPC), `config.svelte.ts`, `gateway.svelte.ts` status events | read RPC | keep — RPC shape must stay stable | Med |
| **H. Other processes** | flows `trigger-manager.ts:35` (per-flow filter, not org); paperclip adapter (consumes `channels.status` frames); message-ledger (accountId metadata only); `channel-health-monitor.ts` (runtime snapshot, not config) | — | none | **Low/None** ✓ |
| **I. Existing infra to reuse** | hub `cache.ts` ioredis Valkey + **`HttpBroadcaster`** (hub→gateway cache invalidation); gateway `ttl-cache.ts` redis | — | P2–3 reuse | — |

**Blast radius is contained to A–E.** Surface H (flows, paperclip, ledger, health-monitor) has **zero** config-shape dependency — they ride the live frame protocol or runtime snapshots, so nothing downstream silently breaks.

## Phases (each independently shippable, each reversible)

### Phase 0 — Schema completion ✅ SHIPPED (`33cd624`, applied to gxv)
Added `auth_ref` + `settings jsonb` to `channels`. `runtime_status` deferred to P3; `status` kept as-is. Additive, no behavior change, no reader.

### Phase 1 — Backfill / import (one-time, idempotent)
Extend `channel-sync.service.importGatewayChannels` to import **every** whatsapp/telegram/discord account from `gateway.json` into `channels` (+ `channel_bindings` from the loose `bindings[]`), populating `auth_ref` (whatsapp: `whatsapp/<accountId>`; telegram/discord: `null` — secret is inline) and `settings`.
- **★ Resolve, don't read raw (consensus C1).** `gatewayConfigToChannelRows` currently reads raw `acc.allowFrom ?? []`, but the runtime applies **root-level channel defaults** via `resolveWhatsAppAccount`/`mergeTelegramAccountConfig` (e.g. `channels.whatsapp.allowFrom` falls through to an account with none). The backfill **must store the *resolved* value** (call the real resolvers), or accounts relying on root defaults land as `[]` → derive `closed` → silently stop accepting DMs. In particular: an account whose resolved `dmPolicy` is `open` must backfill `allow_from = ['*']`, not `[]`.
- **★ `settings` extraction = strict field allowlist, never a spread (consensus M2/security).** The `config.get` account object contains `botToken`/`token` inline; spreading it leaks secrets into the DB. Pick keys explicitly: the **B** set incl. the audit-surfaced `messagePrefix`/`textChunkLimit`/`chunkMode`/`blockStreaming`/`ackReaction`/telegram `block`/`allowed`/`blockEmojiReactions`. Add a CI test asserting no `channels` row / Valkey value contains a credential-shaped string.
- **★ All-orgs backfill (consensus M4).** Implement `backfillAllGatewayChannels` via `getCoreDb()` (cross-org, RLS-bypass, gateway-filtered) — the existing import is acting-org-scoped and would skip unscoped/global accounts, giving the parity gate a false green.
- **Gate = parity on RESOLVED dispatch behavior, not raw columns (consensus C1/H2).** Round-trip unit test over the resolver+translation with **every** real prod account shape + a one-time live diff comparing the gateway's *resolved* per-account config to the DB-derived resolved config; **zero diffs** before Phase 2. Verify *live* (not just assert): `groupPolicy:allowlist` (no per-acct list) → `group_allow_from:[]`, and `dmPolicy:open` (root default, no per-acct `allowFrom`) → `['*']`. Read-only against the gateway.

### Phase 2 — Hub publishes channel config + change signal (additive, shadow)
On every channel mutation, after the DB write, the hub writes the account's **resolved** config to a Valkey cache key (`channel:<gatewayId>:<type>:<accountId>`) and emits a **change signal over the existing `HttpBroadcaster`** (`cache.ts` already pushes hub→gateway cache-invalidation; reuse it — do **not** stand up a separate Valkey pub/sub subsystem). Gateway doesn't read yet. Verify Valkey contents match `gateway.json` for every account. Valkey is the warm-start cache; the broadcaster is the change signal.

### Phase 2.5 — Derive `dmPolicy`/`groupPolicy` at the dispatch consumers (gateway, no DB yet)
**New sub-phase the runtime audit forced; corrected by consensus review.** Before the gateway can drop `dmPolicy`/`groupPolicy` as stored config, the dispatch sites that branch on them must compute the same behavior from `allow_from`/`group_allow_from`/`replies`.
- **★ Scope = WA/TG/Discord only** (the channels this spec migrates). Signal/Line/iMessage/Slack/Linq also branch on `dmPolicy` but are **out of scope** (not DB-migrating) — leave them on `gateway.json`. *The original site list was wrong:* `commands-allowlist.ts:370/396/402` is the operator `/allowlist list` **display** command, not a per-message gate. The real per-message gates to refactor: **`web/inbound/access-control.ts`** (WhatsApp, calls `loadConfig()` sync), **`telegram/bot-handlers.ts` + `telegram/group-access.ts`**, **`discord/monitor/allow-list.ts` + `message-handler.preflight.ts`**.
- **★ Derivation must check `replies` FIRST (consensus):** `replies = none` → **closed regardless of `allow_from`** (the master kill-switch); else `open ⟺ allow_from contains '*'`, `allowlist ⟺ non-empty without '*'`, `closed ⟺ []`.
- **★ `dmPolicy:'disabled'` is NOT eliminable in P2.5.** `gateway.json` has no `replies` column, so the `disabled → replies:none` mapping can only land in **P3** when the DB-sourced config carries `replies`. Narrow P2.5 to: *replace the open/allowlist/closed label derivation only; retain `dmPolicy==='disabled'` reads until P3.*
- **★ Runtime kill-switch:** gate the new derivation behind a flag that falls back to the original `dmPolicy` branch — rollback by config, not git revert (this is the live customer-reply path that caused the original incident).
- Land as a pure refactor against the current in-memory config; **unit-test against EVERY prod account shape**, not representative fixtures. Ship + bake before P3.

### Phase 3 — Gateway sources the in-memory mirror from DB (compare → flip)
The dispatch path stays a **synchronous in-memory read** (see the architecture constraint); only the source and refresh trigger change.
1. **Compare mode:** on boot the gateway hydrates an in-memory channel mirror from **both** the DB (via Valkey warm-cache) and `gateway.json`, **acts on `gateway.json`**, and logs any diff. On an `HttpBroadcaster` change signal, refresh the mirror and log what *would* change. Bake until diffs are clean. Add `runtime_status` write-back here (gateway → DB).
2. **Flip (behind a runtime flag `CHANNEL_CONFIG_SOURCE=json|db` in bootstrap config — flag flip, not deploy, for rollback):** the in-memory mirror is hydrated from the DB; Valkey is the warm cache; `gateway.json` channel rules are fallback only (missing → read json → warn). A change signal (`HttpBroadcaster`) refreshes the affected account in-memory and drives the **existing per-channel start/stop** (`config-reload.ts`'s `restart-channel`, triggered by the event instead of a chokidar file write — surface B already does this). Secrets resolved locally via `auth_ref`. **Boot/cold-cache hydration = a hub WS RPC** (`channels.list` for this gateway — *new endpoint, P3 dependency*), NOT a direct Postgres read (the node has no DB creds). Order at boot: authoritative hub-RPC pull → seed mirror + Valkey → then serve traffic. **Staleness recovery:** `HttpBroadcaster` is best-effort (no retry), so add a periodic re-hydration tick (re-pull via the RPC every N min) bounding max staleness; never silently disable a live channel — alert + fall back to json until P5.

### Phase 4 — Cutover
DB is authoritative (Valkey-cached, in-memory-mirrored) for per-account rules + `accountOrgs`/`orgDisabled`. The hub stops mirror-pushing channel rules into `gateway.json` via `config.patch` (surface E). `gateway.json` channel rules now vestigial (present, unread).
- **★ Technical gate, not just deploy-ordering (consensus C2).** `resolveAccountOrgIds` **fails open** — returns `[]` (= unscoped = visible to all) when `accountOrgs` is absent. So if the hub stops pushing before the gateway reads `accountOrgs` from its DB-mirror, the map drains from `gateway.json` and **every account silently becomes cross-tenant-visible** (org bleed, no error). Therefore: the gateway must expose an **observable** (status-frame field / health endpoint) confirming `accountOrgs` is sourced from the DB-mirror, and the hub's P4 deploy must be **gated on that observable being true**. "Verified live" is defined: **zero `accountOrgs` diffs in compare mode for ≥ 24h under prod traffic** before P4 ships.

### Phase 5 — Decommission (the `gateway.json` shrink)
Only now is deletion safe:
- Remove `channels.whatsapp/telegram/discord` **per-account rule** blocks from `gateway.json` (keep secrets + `auth_ref`-referenced creds + channel-type defaults `capabilities`/`markdown`).
- Remove `channels.accountOrgs` + `plugins.orgDisabled` mirrors.
- Remove dead hub write paths (surface E): `ensureGatewayWhatsappAccount`, wizard `commit()` `config.patch`, `ChannelCard`/`ChannelGroup` enable/remove `config.patch`, and the `accountOrgs`/`orgDisabled` patch in `reconcileOrgConfig`. Redirect each to a DB write + Phase-2 publish.
- **Redirect or retire the gateway operator chat-commands** (surface D): `/config set|unset`, allowlist, owners commands that `writeConfigFile` on channel keys — either route them through the DB write path or drop the channel-key cases. *(Missing from the original plan; the audit found these as a live write path.)*
- Remove the gateway's `gateway.json` channel-read code paths; delete stored `dmPolicy`/`groupPolicy` (now derived per P2.5).

## What stays in `gateway.json` after THIS spec (channels vertical)

After P5: host/process config (`gateway`, `auth`, `authProviders`, `models`, `agents`, `tools`, `messages`, `commands`, `approvals`, `session`, `hooks`, `memory`, `skills`, `browser`, `voiceProcessing`, `logging`, `update`, `meta`, `wizard`) + channel **secrets** + channel-**type** defaults (`capabilities`, `markdown`). Channel per-account rules are gone.

The **north-star bare-minimum** (bootstrap only) is reached when later verticals move the rest; the permanent floor is: identity/`id`, `gateway` host + `port`/bind, `auth`, and the data-plane endpoint + token. Everything above that floor is a candidate for a future vertical, not this one.

## Risks & mitigations

- **★ Sync dispatch path (audit).** Per-message reads are synchronous from memory; an async DB/Valkey read per message is a latency regression. Mitigate: never read DB at dispatch — keep a sync in-memory mirror, refresh on event (P3). This is a design constraint, not just a risk.
- **★ `dmPolicy` is not a free drop (audit).** Runtime consumers branch on it directly; Phase 2.5 refactors them to derive from `allow_from`/`replies` *before* P3, verified in isolation against the current config. Skipping 2.5 = behavior change smuggled into the cutover.
- **★ Operator chat-commands write `gateway.json` (audit).** Surface D bypasses the hub; if not redirected/retired in P5 they reintroduce json channel rules after the shrink. 
- **★ accountOrgs sequencing.** Org isolation (multi-tenant boundary) must read from the DB-mirror and be verified live *before* the hub stops pushing it (P4). Never a no-authority window.
- **Cold Valkey = no channels.** DB is authoritative and rebuildable; gateway rebuilds the mirror from Postgres on empty cache, `gateway.json` fallback survives until P5. Alert + fall back; never silently disable.
- **Secret leakage into DB/Valkey.** The `auth_ref`/secret split is load-bearing — P1 import copies the *pointer*, never the token. Test: no `channels` row / Valkey value contains a credential-shaped string.
- **Dual-write drift (DB vs Valkey).** DB authoritative; Valkey derived; republish-on-read-miss heals drift; never a second source of truth.
- **The `oidcIssuers` restart trap** (the original motivation) only bites `gateway.json` writes — the DB/mirror path sidesteps it entirely.

## Net

DB schema is ready (P0 shipped). The real work is **P2.5 + P3** — the `dmPolicy` derivation refactor and swapping the gateway's in-memory channel mirror from `gateway.json`-sourced to DB-sourced (kept warm by the existing `HttpBroadcaster`, not a new pub/sub). The audit's headline: the dispatch path is sync-from-memory, so this is a *source swap behind a sync read*, not an async rearchitecture — and the blast radius is contained to surfaces A–E (flows/paperclip/ledger/health-monitor are untouched). The `gateway.json` shrink lands in **P5**, after the gateway no longer reads what we delete. Doing it sooner is a prod outage wearing a cleanup's clothes.

## Consensus review (2026-06-26) — four-agent evaluation

Panel: architecture (`code-architect`), codebase fact-check (`code-explorer`), prod risk (`code-reviewer`), implementation/transport (`Plan`). Initial verdicts: 2× APPROVE_WITH_CHANGES, 2× BLOCK — **convergent** (the BLOCKs and CHANGES named the same defects; split was severity, not direction). All revisions above are folded in; **post-revision converged verdict: APPROVE_WITH_CHANGES** (the BLOCK conditions — wrong P2.5 citation/scope, raw-not-resolved backfill, false "Valkey subscription", hydration contradiction — are resolved in-doc).

**Settled decisions:**
- **Transport = reuse the in-prod `HttpBroadcaster`** HTTP-push as the change signal; Valkey = warm cache; hub WS RPC = hydration. *Not* Valkey pub/sub (gateway redis = `get`/`set` only; YAGNI w/ one gateway), *not* a dedicated gateway→hub socket tier (defeats the serverless model). The internal spec contradiction (north-star said pub/sub) is removed.
- **Smallest safe first behavioral step after P0:** prove the full loop on **one `replies = none` account** (the already-disabled official `+51906090526` or a test number) in P2 + P3-compare scoped to it — DB write → `HttpBroadcaster` POST → mirror refresh → correct intended action logged → zero diff vs `gateway.json`. `replies = none` = connects + ingests but **cannot emit outbound**, so the worst failure is a missed ingest, never an unwanted customer reply. Graduate to the live `+51992376833` only after it bakes.
- **Keep P3-compare and P3-flip as separate merges** (not one PR); name a minimum bake window before P4.

**Remaining (folded as MED/LOW, not blockers):**
- **Valkey TTL** on `channel:*` keys (~30 min) so a DB-write-then-Valkey-write gap self-heals; cold-start covers empty.
- **Surface D as a real P4.5 step** (don't leave to P5): operator chat-commands (`/allowlist add|remove`, owners) that `writeConfigFile` on channel keys must redirect to a DB write or return a user-visible "use the hub" error — else they silently no-op (and re-add stale json blocks) post-P5.
- **`isDangerousEmptyWipe` (org-config-sync) → trigger when EITHER map is empty-from-DB** while the gateway is populated (today requires both; an all-channels-deleted + plugin-disabled state slips through).
- Confirm the gateway's P3 redis read path connection policy (`ttl-cache.ts` uses `enableOfflineQueue:false`/`maxRetriesPerRequest:1` — fail-fast; fine if the boot hub-RPC pull is authoritative, but document it).
