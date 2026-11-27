# Data model: 042 gateway config lives in the DB

## Existing (unchanged shape)

### `channels` (hub Postgres, `@minion-stack/db/pg`)
`id text PK, tenant_id uuid, gateway_id text → gateway.id, type text (whatsapp|telegram|discord|…), account_id text, label, status, enabled bool, replies text (none|bound), allow_from text[], group_allow_from text[], require_mention bool, settings jsonb, auth_ref text, credentials*, owner_profile_id, reconnect_count, last_seen_at, last_error, created_at, updated_at`.
- Read by the gateway through the resolved projection only (`enabled, allowFrom, groupAllowFrom, requireMention, replies, settings, authRef, orgId`). Credentials never leave the hub.
- Invariant (FR-001): a projection row reaches a gateway only when `gateway_id` equals that gateway's id, and the id came from the request header.

### `channel_bindings`
`id, tenant_id, channel_id, match_kind, match_peer, agent_id` — untouched.

### `gateway`
`id uuid PK, legacy_server_id, name, url (wss://…), token_ciphertext, token_iv, auth_mode, org_id, channel (prd|dev), last_connected_at, created_at, updated_at`.
- Used in R2 as the per-gateway signal target: `url` → `https://host[:port]/events/cache-invalidate`, decrypted token as bearer.

## New

### `gateway_settings` (hub Postgres, migration `supabase/migrations/2026MMDDHHMMSS_gateway_settings.sql`, hub ledger)
| column | type | notes |
|---|---|---|
| gateway_id | uuid, FK `gateway.id` on delete cascade | the physical gateway row the setting applies to |
| section | text | top-level `gateway.json` section name (`plugins`, `agents`, `hooks`, `cron`, …); never a bootstrap or secret section (`gateway`, `auth`, `authProviders`, `identity`, `meta`, `wizard`, `logging`) |
| value | jsonb not null | the whole section document, validated against the gateway config schema for that section |
| version | integer not null default 1 | bumped on every write; carried in the signal so the gateway can drop stale pulls |
| updated_by | uuid null | hub user id |
| updated_at | timestamptz not null default now() | |
| PK | (gateway_id, section) | |

- RLS: hub-side writes gated by `requireOrgCapability(locals, 'gateways', 'edit')` on the gateway's `org_id`; reads for hydration through `getCoreDb()` filtered by `gateway_id` (same pattern as `/api/internal/channels/resolved`).
- Secret-shape guard: a CI test asserts no `value` contains a credential-shaped string (same test family as the channels guard).

## Gateway-side in-memory state (not persisted in the DB)

### Channel mirror (existing, `channel-mirror.ts`)
`Map<"type:accountId", {accountId, type, orgId, projection}>` on `globalThis`; `lastHydratedAt`; new counters `jsonFallbacks`, `lastSignalAt`.

### Settings overlay (new, `src/config/settings-overlay.ts`)
`Map<section, {value, version}>` on `globalThis`; `lastHydratedAt`; `pendingRestart: Set<section>`; `invalid: Map<section, reason>`.
- Local snapshot file `~/.minion/settings-overlay.json` = `{gatewayId, savedAt, sections: {section: {value, version}}}`, written after each successful hydrate, read before the first hub pull. Mode 0600. Contains no secrets by construction (sections are the allowlisted non-secret set).

## Bootstrap file (what remains in `gateway.json` after S4/S6)
`gateway` (port, bind, auth, hubMetrics incl. serverId + apiKey, tailscale…), `auth`, `authProviders`, `identity`, `meta`, `wizard`, `logging`, channel-type presentation defaults (`channels.<type>.capabilities`, `.markdown`), channel secrets (`botToken`, `token`, whatsapp `authDir`), and any section not yet migrated.

## State transitions

### Channel rule change (S1+S2 live)
hub `PUT /api/servers/{id}/channels/{channelId}` → row updated → `publishChannel` → POST `/events/cache-invalidate` to the row's gateway (tag `channel:<type>:<accountId>`) → gateway re-pulls `/resolved` with its server id → mirror replaced (last-good kept on empty) → if `CHANNEL_RUNTIME_APPLY` and the entry's `enabled`/transport changed → `restart-channel:<type>` for that type only → status broadcast → hub card updates.

### Setting change (S5+S6 live)
hub `PUT /api/gateways/{id}/settings/{section}` → schema check → row upsert (version+1) → POST signal (tag `gateway-settings:<gatewayId>:<section>:<version>`) → gateway pulls `/api/internal/gateways/settings` → overlay updated → snapshot written → `runReload` with overlay-merged next config → prefix class: `hot` → apply; `none` → nothing (consumers read live); `restart` → `pendingRestart.add(section)` → observable shows it → owner restarts.

### Boot (S6 live)
read file → load snapshot overlay (if any) → serve → pull hub (seed mirror + overlay) → replace if non-empty → write snapshot.
