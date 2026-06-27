# Gateway Config: `gateway.json` → DB Migration Plan

**Date:** 2026-06-26
**Status:** Design / proposed
**Scope:** gateway (`minion/`), `@minion-stack/db`, `minion_hub/`, Valkey
**Precursor:** [`2026-06-19-linked-channels-config-restructure.md`](./2026-06-19-linked-channels-config-restructure.md) — this plan executes its follow-ups **#1 (migration)** and **#2 (gateway runtime-apply)**. Follow-up **#3 (noAgent reply-path)** already shipped; **#4 (hub UI writes DB)** is partially shipped (channel rows + bindings + `account_id` persistence) and finishes here.

## Where we actually are (verified 2026-06-26)

Not a greenfield. The DB half is ~90% built; the **gateway runtime half is 0% built**. Concretely:

- **DB (`@minion-stack/db/pg`, `channels` + `channel_bindings`):** the spec's *Intent* and *Observed* columns already exist as typed columns — `enabled`, `replies`, `allow_from`, `group_allow_from`, `require_mention`, `reconnect_count`, `last_seen_at`, `last_error`, plus `account_id`, `label`, `status`, `credentials(_iv/_meta)`. Bindings exist (`match_kind`/`match_peer`/`agent_id`, `agent_id = null` = noAgent). The spec's proposed *new* `linked_channels` table was instead **folded onto the existing `channels` table** — fine, same shape.
- **Hub → gateway today:** the hub writes channel rules to the DB **and** mirror-pushes a subset into `gateway.json` over the `config.patch` RPC (`reconcileOrgConfig` for `accountOrgs`/`orgDisabled`; the wizard's `commit()` and the new `ensureGatewayWhatsappAccount` for `accounts[phone]`).
- **Gateway reads `gateway.json` for 100% of runtime channel config.** Zero DB reads on the channel path. `accountOrgs`/`orgDisabled` are DB-authoritative but consumed by the gateway **only** via their `gateway.json` mirror (read synchronously from in-memory config for org enforcement). Secrets (`botToken`, discord `token`, whatsapp `authDir`) live **only** in `gateway.json` / on disk.

> **This is why nothing can be deleted from `gateway.json` yet.** The keys the DB "manages" are not duplicates — `gateway.json` is their *runtime carrier*. The migration is therefore not a cleanup; it is **building the gateway's DB read path** so the carrier can be retired. Deletion is the *last* phase, not the first.

The gateway already **watches `gateway.json` via chokidar** and hot-reloads `channels.<id>` prefixes in-process (verified: removing dead `channels.whatsapp-cloud` hot-reloaded with zero downtime). So the in-process start/stop machinery the spec wants for Valkey events **already exists** — it's currently keyed off file changes instead of pub/sub.

## Goal & non-goals

**Goal:** the gateway sources **per-account channel rules** from the DB (hot-read via Valkey, change via pub/sub), so a channel enable/disable/edit is a DB write that hot-applies in-process — no `gateway.json` edit, no `oidcIssuers`-drift restart. `gateway.json` shrinks to host/process config + a secrets/pointer boundary.

**Non-goals:**
- Moving **secrets** into the DB. `auth_ref` points at creds; creds stay on the gateway (disk for whatsapp authDir; `gateway.json` or a gateway-local store for bot tokens). Same boundary the precursor spec drew.
- Moving **host/process config** (`gateway`, `auth`, `models`, `memory`, `skills`, `browser`, `voiceProcessing`, `hooks`, `tools`, `agents`, `session`, `commands`, `approvals`, `logging`, `update`, `meta`, `wizard`). None of it is per-channel; it stays in `gateway.json`.
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
| `debounceMs` | **B** | New column **or** `settings jsonb`. Per-account, user-meaningful. |
| `streamMode` (telegram `partial`/…) | **B** | `settings jsonb`. Transport behavior, per-account. |
| `sendReadReceipts` (whatsapp) | **B** | `settings jsonb`. |
| `selfChatMode` (whatsapp) | **B** | `settings jsonb`. |
| `mediaMaxMb` | **B** | `settings jsonb` (or channel-type default in `gateway.json` if never per-account — see Observation). |
| per-group overrides (`groups["<jid>"].requireMention`) | **B** | New `channel_group_rules` table (`channel_id`, `group_peer`, `require_mention`) — only if any account actually sets a non-default override. Today only `*` + one jid; **defer until a second real override exists.** |
| `botToken` (telegram), `token` (discord), `accessToken` | **C** | Secret. Stays in `gateway.json`/local store, resolved via `auth_ref`. DB stores only the pointer. |
| whatsapp authDir creds on disk | **C** | Stay on disk; `auth_ref` points at them. |
| `dmPolicy` (`open`/`allowlist`/`closed`) | **D** | **Drop.** Derive the label from `allow_from` (precursor spec: storing both drifts). |
| `groupPolicy` | **D** | **Drop.** Derive from `group_allow_from`. |
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

## Phases (each independently shippable, each reversible)

### Phase 0 — Schema completion
Add `auth_ref` + `settings` (+ status enum decision). Changeset + migration via the standard `@minion-stack/db` flow. No behavior change.

### Phase 1 — Backfill / import (one-time, idempotent)
Extend `channel-sync.service.importGatewayChannels` to import **every** whatsapp/telegram/discord account from `gateway.json` into `channels` (+ `channel_bindings` from the loose `bindings[]`), populating `auth_ref` (whatsapp: `whatsapp/<accountId>`; telegram/discord: the account key) and `settings` (the **B** fields). **Verify parity:** for every account, the DB-resolved config must equal the live `gateway.json` config (a diff script; zero diffs is the gate to Phase 2). Read-only against the gateway — no cutover yet.

### Phase 2 — Hub publishes to Valkey (additive, shadow)
On every channel mutation, after the DB write, the hub publishes the account's **resolved** config to Valkey key `channel:<gatewayId>:<type>:<accountId>` and emits a `channel.changed` pub/sub event. Gateway doesn't read yet. Verify Valkey contents match `gateway.json` for every account. (Hub and gateway already share Valkey — see `valkey-caching-layer`.)

### Phase 3 — Gateway reads Valkey (dual-read → compare → flip)
1. **Compare mode:** on boot the gateway loads channel config from **both** Valkey and `gateway.json`, **acts on `gateway.json`**, and logs any diff. Subscribe to `channel.changed`; on event, log what *would* change. Bake until diffs are clean.
2. **Flip:** gateway acts on the **Valkey/DB** config; `gateway.json` channel rules become the fallback only (missing Valkey key → read `gateway.json` → warn). Pub/sub events hot-apply via the **existing** chokidar-equivalent start/stop path (reuse `config-reload.ts`'s per-channel reload, triggered by the event instead of a file write). Secrets still resolved locally via `auth_ref`. Cold-Valkey safety: on empty cache, the gateway asks the hub to republish (or the hub republishes on its own healthcheck) before falling back to `gateway.json`.

### Phase 4 — Cutover
DB/Valkey is authoritative for per-account channel rules + `accountOrgs`/`orgDisabled`. The hub stops mirror-pushing channel rules into `gateway.json` over `config.patch`. `gateway.json` channel rules are now vestigial (still present, no longer read).

### Phase 5 — Decommission (the actual `gateway.json` shrink)
Only now is deletion safe:
- Remove `channels.whatsapp/telegram/discord` **per-account rule** blocks from `gateway.json` (keep secrets + `auth_ref`-referenced creds + channel-type transport defaults).
- Remove `channels.accountOrgs` + `plugins.orgDisabled` mirrors (gateway reads DB-sourced).
- Remove the now-dead hub code: `ensureGatewayWhatsappAccount` + the wizard `commit()` `config.patch` (replaced by DB write + Valkey publish), and the `accountOrgs`/`orgDisabled` `config.patch` in `reconcileOrgConfig`.
- Remove the gateway's `gateway.json` channel-read code paths.
- `dmPolicy`/`groupPolicy` deleted (derived).

## What explicitly stays in `gateway.json`

Host/process config (`gateway`, `auth`, `authProviders`, `models`, `agents`, `tools`, `bindings`→note, `messages`, `commands`, `approvals`, `session`, `hooks`, `memory`, `skills`, `browser`, `voiceProcessing`, `logging`, `update`, `meta`, `wizard`) + channel **secrets** + channel-**type** transport defaults (`capabilities`, `markdown`). The file stops being the channel-rules database and goes back to being process config.

## Risks & mitigations

- **Cold Valkey = no channels.** Mitigate: DB is authoritative and rebuildable; gateway warms from hub-republish on empty cache, and `gateway.json` fallback survives until Phase 5. Never let an empty cache silently disable live channels — alert + fall back.
- **Secret leakage into DB/Valkey.** The `auth_ref`/secret split is load-bearing — Phase-1 import must copy the *pointer*, never the token. Add a test asserting no `channels` row / Valkey value contains a credential-shaped string.
- **Dual-write drift (DB vs Valkey).** DB authoritative; Valkey is derived. A reconcile/republish job (or republish-on-read-miss) heals drift; never treat Valkey as a second source of truth.
- **The `oidcIssuers` restart trap** (the original motivation) only bites `gateway.json` writes — the DB/Valkey path sidesteps it entirely, which is the whole point.

## Net

The DB schema is essentially ready; the work is **Phase 2–3 (Valkey publish + gateway read)** — the gateway's missing DB read path. The `gateway.json` shrink the request asked for is real but lands in **Phase 5**, after the gateway no longer reads what we'd delete. Doing it sooner is a prod outage wearing a cleanup's clothes.
