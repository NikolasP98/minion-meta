# Linked-Channel Configuration Restructure

**Date:** 2026-06-19
**Status:** Design / proposed
**Scope:** gateway (`minion/`), `@minion-stack/db`, `minion_hub/` (channel UI)

## Motivation (the incident that forced this)

The FACES OFICIAL WhatsApp number (`+51906090526`) was reconnected and began auto-replying
to real customers with a blank personal-agent greeting ("¡Hey! Recién me despierto…"). While
stopping it we hit a wall: **no per-channel config could express "receive messages into the
ledger but never reply."**

Root causes, all the same shape — **one config column meaning two things**:

- `dmPolicy: "disabled"` meant *both* "don't reply" *and* "don't ingest" → silencing the bot
  also killed the ledger feed. (Verified: a test DM under `disabled` produced zero ledger rows
  and zero receive logs.)
- `dmPolicy: "pairing"` meant *both* "gate unknown senders" *and* "auto-greet / auto-provision
  a personal agent" → the greet that paged us.
- `allowFrom: []` gated *replies* but not *ingestion*, and did **not** stop an unbound DM from
  auto-provisioning a personal agent (the WhatsApp/web path does not honor the no-agent route;
  Telegram's does — `src/channels/impl/telegram/bot-handlers.ts` `if (isNoAgentRoute) return`).

Plus operational pain: every channel rule lived in `gateway.json`, and editing it tripped a
pre-existing `gateway.multiTenant.oidcIssuers` drift that forces a **full gateway restart**
(SIGUSR1 → supervisor restart) on every change — interrupting all channels.

The fix is structural: **one concern per column, rules in the DB, runtime-applied.**

## Principles

1. **Enable/disable is runtime.** `enabled` lives in the DB; the gateway subscribes to Valkey
   pub/sub on channel changes and starts/stops that single provider in-process — no
   `gateway.json` edit, no process restart.
2. **Linked channels + their rules live in the DB**, as typed columns (not nested JSON blobs).
3. **The gateway stops owning these settings.** It reads channel config from **DB, cached in
   Valkey** (Valkey = hot read path + pub/sub change events). `gateway.json` retains only
   host/process config, not per-channel rules.
4. **New channels start noAgent.** `replies` defaults to `none` *and* zero binding rows are
   created on link — two independent safe defaults.

## `linked_channels` — one row per linked account

### Identity

| column | type | meaning |
|---|---|---|
| `id` | uuid | PK |
| `org_id` | text | tenant |
| `channel` | text | `whatsapp` \| `telegram` \| `discord` \| … |
| `account_id` | text | phone / handle |
| `display_name` | text | UI label |
| `auth_ref` | text | **explicit pointer** to the credentials location (e.g. `whatsapp/51906090526`); never the creds themselves |

> **Observation — `auth_ref` is not derived by convention on purpose.** Today's 401 logout loop
> was a credential mismatch: the live session ran in the `default` slot (authDir
> `.../whatsapp/default`, stale device `:80`) while the freshly-paired session lived in
> `.../whatsapp/51906090526` (device `:82`). An explicit pointer removes that ambiguity.

### Intent — user-configured (each column = exactly one concern)

| column | type / enum | what each value does | default |
|---|---|---|---|
| `enabled` | bool | Should the gateway hold a live session for this account. Runtime-applied. | `true` |
| `replies` | `none` \| `bound` | Master reply switch. `none` = never reply (noAgent, even owner/self). `bound` = reply only where a binding matches. | **`none`** |
| `allow_from` | text[] | DM sender access (consulted only when `replies = bound`). `[]` = nobody, `["*"]` = anyone, entries = those senders. | `[]` |
| `group_allow_from` | text[] | Same, for group senders. | `[]` |
| `require_mention` | bool | Groups reply only when @-mentioned. | `true` |

> **Observations (YAGNI cuts from the first draft):**
> - **No `ingest` column.** Ingestion is the reason to connect; "connected but ingest nothing"
>   has no current use case. Decoupling ingest from reply is already achieved by `replies` being
>   its own column. Add `ingest:off` only if a compliance/privacy case appears.
> - **No `dm_policy` / `group_policy` enums.** `open`/`allowlist`/`closed` are derivable from the
>   `*_allow_from` lists; storing both is two sources of truth that drift. Derive the label.
> - **No `onboarding` / `pairing`.** That auto-greet handshake is the outage wearing a nicer name;
>   no business channel needs it now.
> - **`replies` has no `auto` value.** Auto-provisioning a personal agent for unbound DMs is the
>   outage itself; "replies on" must always mean explicit bindings.
> - **`enabled` is a bool, not an enum** — only two real states until a `paused` use case appears.
> - **`replies` is deliberately kept** even though `bound` + zero bindings ≈ `none`: it is the
>   master kill-switch on a customer-facing outbound path that already caused an incident. One
>   explicit guard there is cheap insurance, not gold-plating.

### Observed — gateway-reported, read-only (never mixed with intent)

| column | type / enum | meaning |
|---|---|---|
| `runtime_status` | `online` \| `connecting` \| `offline` \| `logged_out` \| `error` | What the session is actually doing |
| `reconnect_count` | int | reconnects since last clean connect (the "1 reconnect" signal) |
| `last_seen_at` | timestamptz | last successful activity |
| `last_error` | text | e.g. `401 logged_out` |

> **Observation — no `degraded` status.** It is `runtime_status = online` AND
> `reconnect_count > 0`, computed for the badge, not stored.

## `channel_bindings` — agent routing (separate table)

| column | type | meaning |
|---|---|---|
| `id` | uuid | PK |
| `channel_id` | uuid fk | → `linked_channels.id` |
| `match_kind` | `catchall` \| `dm_peer` \| `group` | scope; specificity orders matches (`dm_peer` > `group` > `catchall`) |
| `match_peer` | text null | peer/group id when not `catchall` |
| `agent_id` | text null | **null = explicit noAgent** |

> **Observation — no `priority` column.** Implicit specificity ordering covers it. A new channel
> has no rows → noAgent regardless of `replies`.

## Computed, not stored

| derived value | from |
|---|---|
| dm policy label (`open`/`allowlist`/`closed`) | `allow_from` contents |
| group policy label | `group_allow_from` contents |
| `degraded` badge | `runtime_status = online` AND `reconnect_count > 0` |
| friendly mode label (`Receive-only` / `Bot` / `Off`) | `enabled` + `replies` |

## New-channel defaults (safe by construction)

```
enabled = true · replies = none · allow_from = [] · group_allow_from = []
require_mention = true · 0 binding rows
```

→ connects, feeds the ledger, **cannot** reply to anyone.

## Recipes

- **Receive-only:** `enabled = true · replies = none` → ingest on (implied by connected), zero outbound.
- **Bot for specific contacts:** `replies = bound` + bindings with `agent_id` set + those numbers in `allow_from`.
- **Off entirely:** `enabled = false`.

## Why the incident becomes structurally impossible

Ingestion is implied by `enabled` and is never coupled to a reply setting, so there is no value
(the old `dmPolicy:disabled`) that silences the bot by also killing the ledger. "No reply" is
expressible exactly one way (`replies = none`), and a fresh channel defaults there with no
bindings — a blank bot cannot answer a customer unless someone explicitly sets `replies = bound`
*and* adds a binding.

Net: **8 configured fields** (down from 13 in the first draft), every "no-reply" path expressible
exactly once, all cuts reversible with a named add-back trigger.

## Follow-up work (not in this spec)

1. **Migration** of existing `gateway.json` whatsapp/telegram/discord accounts + the loose
   `bindings[]` array into `linked_channels` + `channel_bindings`.
2. **Gateway runtime-apply:** read channel config from DB→Valkey; subscribe to pub/sub; start/stop
   a single provider in-process on change (removes the `gateway.json` → `oidcIssuers`-drift → full
   restart path).
3. **Gateway reply-path fix** (needed regardless, and small): honor `route.noAgent` in the
   WhatsApp/web monitor — fire the `message_received` ledger hook
   (`src/infra/message-ledger-hooks.ts`, currently invoked inside `getReplyFromConfig` /
   `src/auto-reply/reply/dispatch-from-config.ts`) but skip reply dispatch when the resolved agent
   is the no-agent sentinel. This is what makes `replies = none` actually behave.
4. **Hub UI:** channel card edits write to DB (not gateway RPC), show derived mode + `runtime_status`.

## Current production state (as of this writing)

- Official `+51906090526` WhatsApp channel: **disabled** (stop-gap until the reply-path fix ships).
- Faces Sculptors `+51992376833`: reverted to its original `dmPolicy:open` / `allowFrom:["*"]`.
- Live channel rules still in `/home/bot-prd/.minion/gateway.json` on netcup (`bot-prd`).
