# Channel Scoping Fix — sequenced plan

**Date:** 2026-07-19
**Status:** Plan, not yet executed
**Trigger:** PINONITE (personal org) showed FACES SCULPTORS' channels. Gmail half fixed + verified (`c8f98ced` / `a6e24fee6`); this plan covers the remaining Discord / Telegram / WhatsApp leak.
**Related:** memory `channel-identity-org-scoping-failopen`, gateway `cd1a8a4a7` (shells-only fix)

---

## 1. The constraint that drives the design

A channel account is **not** simply "owned by an org". There are two legitimate classes, and the current model can only express one:

| Class | Example | Correct visibility | Why |
|---|---|---|---|
| **User-scoped identity** | Nikolas's own WhatsApp, Telegram, Discord, Google | Visible to **that user, in every org they belong to** | The person is the same person in every org. Duplicating the account per-org would create N copies of one real inbox — the thing we're explicitly avoiding. |
| **Org-scoped account** | FACES OFICIAL WhatsApp, `admin@facesculptors.net` | Visible **only inside its org** | It's a business asset; membership of the org is the grant. |

Today's model has only `accountOrgs[channelId][accountId] = string[]`. Absence means "global" — which is exactly the fail-open. **There is no way to say "this belongs to a person, not an org."** That's the missing primitive, and it's why the leak can't be fixed by simply failing closed: doing that today would also hide every user's own personal account.

This mirrors the model already proven on the Gmail side: own identity always resolves (user-scoped), shared inbox only in its org (org-scoped).

## 2. Why it leaks today (three independent fail-opens)

`minion/src/gateway/org-scope.ts:11-23`:

```ts
export function orgScopeVisible(resourceOrgIds, clientOrgId) {
  if (!clientOrgId) return true;                              // (a)
  if (!resourceOrgIds || resourceOrgIds.length === 0) return true; // (b)
  return resourceOrgIds.includes(clientOrgId);
}
```

- **(a) fires on every hub session today.** The browser attaches a JWT only when `PUBLIC_GATEWAY_JWT_AUTH === 'true'` (`gateway.svelte.ts:199`) — set in no env file. The token path hardcodes `orgId: undefined` (`ws-jwt-auth.ts:137`). `channels.status` is called with `{}` params (`gateway.svelte.ts:1509,1554`).
- **(b) fires for every account.** Live `~/.minion/gateway.json` has `channels.accountOrgs === null`.
- **(c) siblings carry the same pattern**: `plugins/org-enforcement.ts:51-82` (`resolveAccountOrgIds` returns `[]` on miss, consumers treat `[]` as ungated) and the hub-side mirror filter in `crm-channels.service.ts:38-42,60`.

`cd1a8a4a7` fixed this shape in `shells.ts` **only** (`requireOrgScope`, 2 files). Nothing in the channels path calls it.

**Critical consequence:** flipping `orgScopeVisible` to fail closed *right now* hides **every channel from every org**, because nothing is classified and no socket carries an org. Enforcement must come last.

## 3. Sequenced plan

Each phase is independently shippable and reversible. Enforcement is the final phase, never the first.

### P0 — Classification primitive + backfill (no behavior change)

Add the missing "user-scoped" expression, then classify every existing account. Enforcement stays off.

- Extend the account-scope config from `orgIds: string[]` to a scope record that can express either class, e.g.
  `channels.accountScope[channelId][accountId] = { kind: 'org', orgIds: string[] } | { kind: 'user', ownerProfileId: string }`.
  Keep the existing `accountOrgs` readable for one release (translate `orgIds` → `{kind:'org'}`) so nothing breaks mid-migration.
- Backfill sources: org-scoped from `channels.tenant_id` (`channel-publish.service.ts:85-91`); user-scoped from `user_identities` (the channel-claim flow already binds a channel identity to a profile — see the `/account` claim feature).
- **Emit an unclassified report** — any account that resolves to neither class. This list is the gate for P3: it must be empty (or explicitly accepted) before enforcement.
- Push path already exists: `org-config-sync.service.ts` + hourly `api/org-config/tick`. ⚠️ Its own comment warns a failed sync **NULLs out `accountOrgs`** — harden that to skip-on-error rather than write null, or P3 becomes a self-inflicted outage.

**Verify:** dump the resolved classification for all accounts; every one of `+51902829738`, `+51992376833`, `+51906090526`, `telegram:default`, discord accounts lands in exactly one class. No UI change.

### P1 — Carry org identity on the socket (still fail-open)

- Set `PUBLIC_GATEWAY_JWT_AUTH=true` (hub) and configure `gateway.multiTenant.oidcIssuers`. The mint path already exists and already includes the org: `gateway-jwt.service.ts:178` → `{ userId, role, agentIds, orgId: ctx.tenantId }` from the `active_org` cookie; the gateway validates it at `auth-jwt.ts:90-116`.
- `OrgPicker.svelte:58-68` already re-handshakes the socket on org switch — confirm the new socket carries the new `orgId`.
- **Also propagate `userId`**, not just `orgId` — P2 needs the caller's identity to match user-scoped accounts.

**Verify:** log `client.orgId` + `client.userId` on `channels.status`; both non-empty for a browser session, for each of the three orgs. Behavior unchanged (filter still fails open).
**Rollback:** unset the env var; sockets fall back to token auth.

### P2 — Teach the filter both classes (still permissive for unclassified)

Replace `orgScopeVisible(resourceOrgIds, clientOrgId)` with a resolver that takes both sides:

```
visible(account, client) =
  account.kind === 'user' ? account.ownerProfileId === client.userId
: account.kind === 'org'  ? account.orgIds.includes(client.orgId)
: UNCLASSIFIED_VISIBLE            // still true in P2, flipped in P3
```

Apply at the single choke point (`channels.ts:127-132`) so `channels.status` and every other caller are covered at once. Keep `UNCLASSIFIED_VISIBLE` behind a config flag.

**Verify:** with the flag on, output is identical to today (no regression). With it off in a scratch config, PINONITE sees only Nikolas's own accounts; FACES sees its own + shared. Unit-test the resolver directly — all four branches, including "client has no orgId".
**Rollback:** flag.

### P3 — Close the fail-open (the actual fix)

Only once P0's unclassified list is empty and P1 shows every socket carrying `orgId` + `userId`:

- `UNCLASSIFIED_VISIBLE` → `false`.
- Missing `client.orgId` → deny (mirror `requireOrgScope`'s post-`cd1a8a4a7` shape: return FORBIDDEN rather than "see everything").
- Roll out per channel if you want a smaller blast radius; keep a kill switch for one release.

**Verify:** the original report reproduces clean — PINONITE `/channels` shows only user-scoped accounts, FACES shows its own. Cross-check `channels.status` payloads per org directly, not just the UI.
**Rollback:** flip the flag back; classification data stays valid.

### P4 — Sweep the siblings

Same three-class resolver applied to `plugins/org-enforcement.ts` (`resolveAccountOrgIds` → `[]` currently means ungated), `channel-mirror.ts`, and the hub-side duplicate filter in `crm-channels.service.ts` (which today re-implements the fail-open on the *hub* side of the trust boundary — it should trust a correctly-scoped gateway response instead of re-filtering).

## 4. Ordering rationale (why not just fail closed now)

P3 before P0/P1 = every channel disappears for everyone. P3 before P0 alone = every user's personal account disappears (only org-tagged accounts survive). The classification primitive is what makes "fail closed" safe, so it goes first. This is the same sequencing note `cd1a8a4a7` carries.

## 5. Out of scope

- Gmail/Google shared inboxes — already fixed and verified.
- Turning `channels.tenant_id` into a multi-org relation (an account belonging to 2+ orgs). The config shape supports `orgIds: string[]`, so it's expressible later without another migration.
