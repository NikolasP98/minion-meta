# Unified User Identities + Credential Storage

**Date:** 2026-05-24
**Status:** Draft (design approved in brainstorm; pending spec review)
**Related:** `specs/2026-05-21-gws-cli-replaces-gog.md` (gws CLI replaces gog; this spec subsumes its Phase B/G credential-storage concerns)
**Subprojects touched:** `packages/db` (schema), `minion_hub` (services + UI + auth), `minion` (gateway credential fetch + turn-time loader + WhatsApp resolver)

## Problem

A user can talk to an agent over WhatsApp (and Telegram/Discord/Signal), and separately log into the hub with Google. But there is **no wired path for an agent to act on a specific user's Google account in response to that user's channel message**. The pieces exist independently and live in two disconnected databases:

- **Hub DB** (`@minion-stack/db`, Turso/libsql) holds the identity graph: Better Auth `user`, `account` (Google `accessToken`/`refreshToken`, plaintext), and `channel_identities` (`(channel, channelUserId) → userId`).
- **Gateway DB** (local encrypted SQLite `~/.minion/secrets.sqlite`, libsodium) holds `gws_credentials:<userId>:<email>` ADC blobs that the agent runtime actually consumes.

The gateway is read-only on hub identity, synced over the admin WebSocket (`hub.channel-identity.updated/removed` + 5-min refresh). The `hub.gws-credentials.updated` sync was specced but never built. Result: the chain `whatsapp sender → userId → google creds` resolves only passively (observation/workspace-ensure) and never feeds a live agent turn. The live turn still loads creds via the legacy gog path keyed by agent+session+email, not by channel-resolved userId. WhatsApp also lacks the inline `resolveChannelSenderIdentity` call that Discord/Telegram/Signal already have.

"Store keys in the DB instead of a file" is already true — they're in an encrypted DB. The real work is **connecting the two stores under one canonical identity model** and protecting the secret material properly.

## Goals

1. One canonical `user_identities` table (hub DB) covering **both** OAuth providers (google) and channel identities (whatsapp/telegram/discord/signal/slack), per user.
2. Secret material (Google refresh tokens) protected at rest with **app-level envelope encryption** — DB access alone never yields a usable token.
3. Agent turns obtain usable Google credentials **on demand over the authenticated WS**, with the hub as the sole key holder and **no persistent secrets on the gateway**.
4. WhatsApp reaches identity-resolution parity with the other channels.
5. A user-facing **profile/account page** that lists their linked identities and lets them add new ones (channels via the existing OTP flow; Google via OAuth link).
6. A layered, real-life testing mechanism ending in a live netcup E2E.

## Non-Goals

- Encrypting Better Auth's own `account` table (it stays plaintext for login internals; agent-access is the path we harden).
- Multi-user-per-WhatsApp-device isolation.
- Removing the gws CLI's requirement for an on-disk ADC file (unavoidable; mitigated, not eliminated).
- Non-Google OAuth providers beyond what Better Auth already supports.

## Design

### 1. Data model — `user_identities` (hub DB, `@minion-stack/db`)

One canonical table, replacing `channel_identities` and serving as the agent-side source of truth for identities + credentials. Better Auth `user` (the user list) and `account` (login plumbing) remain; agent-credential code stops reading `account`. A Better Auth sign-in/link hook mirrors the Google grant into `user_identities` (encrypted).

```
user_identities
  id               text PK
  userId           text  FK → user.id (cascade delete)
  provider         text  -- 'google' | 'whatsapp' | 'telegram' | 'discord' | 'signal' | 'slack' | ...
  kind             text  -- 'oauth' | 'channel'
  externalId       text  -- oauth: google email/sub; channel: E.164 / JID / channel user id
  displayName      text  null
  scope            text  null  -- oauth scopes granted
  secretCiphertext blob  null  -- AES-256-GCM(JSON ADC blob); null for channel identities w/o secret
  expiresAt        integer null
  verifiedAt       integer null
  createdAt        integer
  updatedAt        integer
  UNIQUE (provider, externalId)
  INDEX (userId)
  INDEX (provider, externalId)
```

**Migration** backfills from `channel_identities` (→ `kind='channel'` rows, preserving `verifiedAt`) and from `account where providerId='google'` (→ `kind='oauth'` rows; assemble `{client_id, client_secret, refresh_token, type:'authorized_user'}` from the OAuth app config env + the account row, then encrypt into `secretCiphertext`). `channel_identities` readers get a compat view/shim during transition, then are removed.

### 2. Secret handling — app-level envelope encryption

The ADC blob is sealed with **AES-256-GCM** before insert, reusing the hub's existing token-encryption scheme (the one already protecting `servers.token`: scrypt-derived key from `ENCRYPTION_KEY`). Factor a small `encryptIdentitySecret(plaintext)` / `decryptIdentitySecret(ciphertext)` helper (hub server-side). The hub is the sole key holder; the key is never logged and never sent to the gateway.

### 3. Gateway access — on-demand fetch over WS

- **Identity resolution** (`channel:channelUserId → userId`) keeps using the synced in-memory map (not secret).
- **Credential fetch** is on-demand: a new authenticated RPC on the existing admin/hub-events WS channel — gateway sends `{ userId, provider:'google' }`, hub looks up `user_identities`, decrypts, and returns the ADC blob. Gateway keeps a short-lived in-memory TTL cache (~5 min); **never writes to the vault**.
- The gateway's `gws_credentials:*` vault writes are retired. The only on-disk credential is the **transient per-session ADC file** gws requires — written under `stateDir`, mode `0600`, deleted after the turn.

### 4. WhatsApp parity + turn-time wiring

- Add inline `resolveChannelSenderIdentity("whatsapp", senderE164 ?? senderJid)` in the WhatsApp inbound path (`minion/src/web/auto-reply/monitor/on-message.ts` / the channel adapter) to match Discord/Telegram/Signal.
- Rewrite the turn-time loader (`minion/src/hooks/gws-credentials.ts` `loadSessionCredentialsForUser`): resolve `userId` → on-demand WS fetch → materialize transient ADC file → gws runs → cleanup. Replaces the legacy `minion/src/hooks/gog-credentials.ts` path.

### 5. Profile-page identities UI (hub)

- **Route** `src/routes/(app)/settings/account/+page.svelte` — "My Account" for the current user (`page.data.user`, canonical load). `+page.server.ts` declares `depends('app:identities')` and loads the current user's `user_identities`.
- **Component** `src/lib/components/users/ConnectedIdentities.svelte` (generalizes `IdentityList.svelte`) — groups **OAuth (Google)** vs **Channels**; each row: provider icon, externalId/displayName, verified badge, unlink button.
- **Add channel identity** reuses the existing OTP flow verbatim: `IdentityLinkPopover` → `POST /api/users/[id]/identities/verify-request` (gateway sends code over the channel) → `POST /api/users/[id]/identities/verify-confirm`. Same logic as settings/comms.
- **Add Google (new):** add Better Auth's social/link client plugin to `src/lib/auth/auth-client.ts`; call `authClient.linkSocial({ provider:'google', callbackURL:'/settings/account' })`. The `after` hook in `src/lib/auth/auth.ts` mirrors the grant into `user_identities` (encrypted). Unlink → Better Auth unlink + delete the oauth row.
- Mutations `invalidate('app:identities')`. `identity.service.ts` and `channel-identity.service.ts` become thin wrappers over the unified `user_identities` table.

### Components and boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `user_identities` schema + migration | Canonical identity + encrypted secret rows | `@minion-stack/db` |
| `encryptIdentitySecret` / `decryptIdentitySecret` | App-level AES-GCM envelope | hub `ENCRYPTION_KEY` |
| `identity.service.ts` (rewritten) | CRUD over `user_identities`; assemble/encrypt ADC on google link | schema, crypto helper |
| Better Auth link hook | Mirror google grant → `user_identities` | `auth.ts`, identity.service |
| Hub credential RPC handler | Decrypt + return ADC for `{userId, provider}` over admin WS | identity.service, crypto |
| Gateway credential client + TTL cache | On-demand fetch, in-memory only | admin WS, hub RPC |
| Gateway turn-time loader (rewritten) | Resolve userId → fetch → transient ADC file → cleanup | resolver, cred client |
| WhatsApp inline resolver call | Channel parity | `resolveChannelSenderIdentity` |
| `ConnectedIdentities.svelte` + account route | User-facing list + add/unlink | identity API, auth-client |

## Real-life testing mechanism

1. **CI (unit/integration):** AES-GCM ADC encrypt→decrypt round-trip; migration backfill correctness (channel_identities + google accounts → `user_identities`, no data loss, verifiedAt preserved); `identity.service` CRUD; hub credential RPC handler with mocked hub; `resolveChannelSenderIdentity("whatsapp", …)` returns the correct userId.
2. **Local E2E:** hub (`bun dev`) + gateway locally → link Google via the new UI → assert the stored `user_identities` row is **ciphertext, not plaintext** → gateway on-demand fetch returns a decryptable ADC → a turn materializes the transient ADC file and then deletes it.
3. **Live on netcup (browser-harness Chrome + SSH):**
   - Drive the profile page to link real Google (OAuth consent) and link WhatsApp via a real OTP code sent over WhatsApp.
   - Message the agent over WhatsApp ("¿qué tengo en el calendario hoy?"); confirm it resolves WhatsApp sender → userId → that user's Google creds → real calendar data.
   - Verify via gateway logs (SSH) that the on-demand WS fetch fired and the transient ADC file was created then removed.
   - **Negative test:** an unlinked sender (stranger) gets no Google access.
4. **Security verification:** dump the hub DB and confirm refresh tokens are ciphertext; confirm gateway `secrets.sqlite` has **no** new `gws_credentials` rows; confirm the transient ADC file is `0600` and absent after the turn.

## Phasing

- **P1** — `user_identities` schema + migration (backfill channel_identities + google accounts) + `encryptIdentitySecret`/`decryptIdentitySecret` helper; rewrite `identity.service.ts` over the new table with a compat shim for `channel_identities` readers.
- **P2** — hub credential RPC handler + gateway credential client + in-memory TTL cache.
- **P3** — gateway turn-time loader rewrite to use on-demand fetch; deprecate the gog path.
- **P4** — WhatsApp inline identity resolution (parity).
- **P5** — profile-page UI: account route, `ConnectedIdentities.svelte`, Google `linkSocial` wiring, unlink.
- **P6** — cleanup: remove gateway `gws_credentials` vault writes, dead gog code, stale config schema; remove the `channel_identities` compat shim.

## Risks / Residual

- Better Auth `account` still stores the Google refresh token in plaintext for login — accepted (Better Auth needs it; the agent-access path is the one we harden). A later follow-up could encrypt/rotate it.
- On-demand model adds a hub-availability dependency to any turn that needs Google; the short TTL cache softens transient blips but a hub-down window means no fresh Google access.
- The transient ADC file is an unavoidable disclosure surface while shelling to gws; mitigated by per-session scope, `0600`, and post-turn deletion.
