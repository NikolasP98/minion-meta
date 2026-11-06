# Implementation Plan: WhatsApp member agents and channel linking

**Spec**: [spec.md](spec.md) · **Created**: 2026-10-22 · **Gate**: security-tagged. Owner approves the spec before S1 starts and merges each slice.

## Architecture (P1)

```
WhatsApp DM from +N to account X (gateway G, org O)
  │
  ├─ group chat?               → unchanged path
  ├─ replies:none?             → dropped (kill switch, unchanged)
  ├─ X.settings.memberAgents?  ── no → unchanged customer path (allowlist / bindings / receive-only)
  │        yes
  ▼
gateway: resolveWhatsAppMember(X, +N)   [cache: yes ≤5 min, no ≤1 min, hub error = "no"]
  │   POST {hub}/api/gateway/whatsapp/member  (server token + x-minion-server-id, as every hub tool call)
  ▼
hub:  token → G → O (unique)  ·  channel row (G, account_id=X) ∈ O  ·  user_identities(whatsapp, digits(+N), verified)
      ·  organization_members(O, profile)  ·  personal_agents(profile) active ON G
      (unbound and O has exactly one gateway → activatePersonalAgent binds + creates it on G)
      → { member: true, profileId, agentId: "personal-<profileId>" }  |  { member: false, reason }
  │
  ▼
gateway: member → skip customer allowlist + bindings, route to agentId, ResolvedHubUserId = profileId,
         session agent:<agentId>:whatsapp:direct:<+N>, no org ledger / CRM / backfill writes
         non-member → unchanged customer path
  │
  ▼
the agent runs exactly as on web → hub tool calls carry ?agentId=personal-<uuid> → resolveAssistantPrincipal
(same org/gateway/membership/capability checks) → reply delivered on WhatsApp by the existing web reply path
```

**Why this gives "same agent, same RBAC" with no new permission code:** on the web, the hub already identifies the user from `personal-<uuid>` on every tool call, plus the gateway token. The only thing missing on WhatsApp is choosing that agent id for a verified member. The hub decides membership; the gateway just asks.

## Ponytail pass (smallest complete change)

**What gets reused:**

| Need | Reused as-is | Not built |
|---|---|---|
| user identity and RBAC on tool calls | `personal-<uuid>` agent id plus `resolveAssistantPrincipal` | per-turn signed admissions, user JWTs (drafts #330/#544) |
| per-account switch | `channels.settings` jsonb through the existing channel mirror | new column, migration, gateway.json field |
| membership check | one hub endpoint over existing tables (`user_identities`, `organization_members`, `personal_agents`, `channels`) | identity sync / push feed, new identity tables |
| agent on the right gateway | `activatePersonalAgent` (binding, `agents.create`, roster check), fixed rather than rewritten | new provisioner |
| pairing on the card's gateway | existing `web.login.start` / `web.login.wait` RPCs called server-side to the card's gateway | new pairing protocol |
| logout alerts | existing in-app notifications | new alerting service |

**Deliberately skipped, each named:**
- **Leases, the turn/reply outbox, effect receipts, canonical cross-channel memory:** these are the bulk of the drafts and are out of scope (spec Assumptions). Revisit in P3 only if live use shows lost or duplicate replies.
- **Gateway-side identity cache sync:** the per-message hub call with a short TTL is simpler and always fresh.
- **Member mode for groups.**

**Shortcuts and their limits:**
- `shortcut: a cached "yes" can outlive a membership removal by ≤5 min for chat-only replies; tool calls are re-checked live. Upgrade: hub push on membership/identity change.`
- `shortcut: multi-gateway orgs don't auto-bind; members get "assistant not ready". Upgrade: when an org runs >1 gateway.`

## Slices (one PR each, foreground gates, worktree per slice)

### S1 — hub: personal agent binding fix + member endpoint + member-mode toggle (minion_hub → master)

1. **`activatePersonalAgent`** (`src/server/services/personal-agent-provisioner.ts:100`): when the row says `active` but there is no committed gateway (`gateway_id` NULL) and the agent is missing from the target roster, run `agents.create` before the roster check. This is the cause of 9/10 FACES agents failing, and it also repairs the web assistant for those members.
   - **Test:** an active row with NULL gateway and an agent missing on the gateway → it gets created, verified and bound. An active bound row → no create.
2. **New `POST /api/gateway/whatsapp/member`**, `{ accountId, phone }`:
   - add it to the server-token allowlist (`resolve-identity.ts isServerTokenPath`);
   - resolve the gateway and its org from the token;
   - require a channel row (that gateway, `type=whatsapp`, `account_id`) in that org;
   - normalise the phone to digits;
   - look up the verified identity, then org membership, then the personal agent;
   - if the agent is unbound and the org has exactly one gateway, call `activatePersonalAgent` with a server-side ctx for that profile;
   - return `{member, profileId?, agentId?, reason?}`;
   - rate-limit per (gateway, phone).
   - **Tests:** verified member → member; unverified, non-member, foreign-org account, or account row on another gateway → `member:false` with a reason; multi-gateway org with an unbound agent → `reason: "agent_not_ready"`.
   - The constitution's RBAC wiring applies to it: it is server-token-only and has no browser surface.
3. **ChannelCard (WhatsApp only):** a "Miembros hablan con su propio asistente" toggle writing `settings.memberAgents`. It sits in the existing behaviour block, with a hint line explaining that receive-only still blocks it.
   - Paraglide `m.*()` plus `i18n:compile`; `lint:design && lint:tokens`; same write gate as the other card settings.
4. **Gates:** `bun run check`, the focused vitest files, `lint:design`, `lint:tokens`. The route contract is unchanged unless the endpoint counts as a route there; follow the manifest if it does.

### S2 — gateway: member-mode routing (minion-ai → DEV)

1. **`src/web/inbound/whatsapp-member.ts`** (new, about 60 lines): `resolveWhatsAppMember(accountId, e164)` using the existing hub REST registry (`hub-rest-registry.ts`) and headers. TTL map: yes 5 min, no 1 min; errors return "no".
2. **`src/web/inbound/monitor.ts` / `access-control.ts`:** for direct chats on an account whose mirrored settings have `memberAgents`, after the `replies:none` check and before the allowlist, call it and mark the message as a member DM.
3. **`src/web/auto-reply/monitor/on-message.ts:73`:**
   - for member DMs, route straight to `agentId` (no bindings) if it is in `agents.list`; otherwise send one "assistant not ready" reply;
   - pass `ResolvedHubUserId`;
   - skip the org ledger, CRM import and history backfill for that message (find the write sites in this slice's research step; this requirement can't be dropped).
4. **Logs:** account, number fingerprint (sha256[:8]), decision, agent id.
5. **Tests:**
   - member DM → personal route with `ResolvedHubUserId` and no ledger write;
   - non-member → unchanged allowlist and bindings path;
   - `replies:none` → dropped;
   - group → unchanged;
   - hub error → non-member;
   - cache TTLs.
6. **Gates:** `pnpm vitest run` on the touched test files plus `test/ci/`, `pnpm check`. The full suite is forbidden on this box.

**Order:** S1 must deploy before S2 does anything; S2 is inert until the toggle is on. **Rollout:** turn it on for one FACES account and run SC-001/002/003 with 3 members, the owner present.

### S3 — hub: link session flow + pairing on the card's gateway (minion_hub → master)

- **`src/lib/components/channels/link-session.svelte.ts`:** one state machine with states `idle → starting → qr → scanned → linked | mismatch | expired | error`, plus typed callbacks `{onQr, onScanned, onLinked({phone, accountId}), onMismatch({expected, actual}), onExpired, onError}`.
  - `WhatsAppQrPairing`, `ChannelSetupWizard` and the ChannelCard re-link all use it.
  - Remove `void serverId`.
- **`POST /api/servers/[id]/channels/[cid]/pair` and `GET …/pair`** (start/poll): run `web.login.start` / `web.login.wait` server-side to the card's gateway (`gatewayCallToInstance`), with the RBAC write gate.
- After a link, compare the linked self number with the card's expected number; a mismatch fires `onMismatch` (the gateway side rolls back, see S4).
- A foreign-org guard runs before starting: refuse if the number is linked on any other org's channel row.
- The dashboard stops showing "vinculado" from credential presence alone.

### S4 — gateway: pairing guards (minion-ai → DEV)

- `web.login.start` refuses an account id that isn't in this gateway's config for the requesting org.
- A login that finishes with a self number different from the expected one discards the new credentials, keeps the old ones, and returns `mismatch`. No config write and no history backfill happen before this check.

### S5 — logout notification (hub + gateway)

- When WhatsApp logs an account out, the gateway reports it to the hub (an existing channel status/event path), and the hub notifies the org's channel admins once per occurrence. The card shows "Needs re-link".

### P3 — follow-up specs (not planned here)

Each item below becomes its own spec when picked up:
- **One account panel** (who can speak / reply mode / reply-as).
- **Bindings to the hub mirror:** read `channel_bindings` and retire `gateway.json` bindings.
- **Resume the channel-scoping fail-open plan:** `specs/2026-07-19-channel-scoping-fix-plan.md`, P1–P4.
- **Draft-durability evaluation:** outbox and leases from #330/#544, with those drafts closed or rebased afterwards.

## Risks

- **Staff chats leaking into the org CRM inbox:** blocked by FR-007, with a test in S2.
- **Unbound agents:** `activatePersonalAgent` creates them on the org gateway. That is a config write per member, the same write the web flow already does on login. On single-gateway orgs only.
- **The PANIK-in-FACES test state stays.** S3/S4 guards apply to new pairings only; nothing is cleaned up.
