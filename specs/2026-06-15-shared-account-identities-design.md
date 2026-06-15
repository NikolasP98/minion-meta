# Shared Accounts & User→Identities — Design Spec

**Date:** 2026-06-15
**Status:** Draft for review — **no PROD migration or gateway code applied yet**
**Scope decisions (locked with user):** design spec first · model = *both* (service-account flag on profile **and** per-identity shareable flag) · grant = *per-user opt-in subscription*
**Repos touched:** `minion_hub` (schema + services + UI + overview graph), `minion` gateway (feed pullers), PROD Supabase `gxvsaskbohavnurfvshr`.

---

## 1. Problem

The `/overview` org graph renders `admin@facesculptors.net` (profile `9aa4e771-f922-44e0-8351-9a1486ac2566`, display name "Faces Sculptors") as an ordinary person in the outer **user** ring, identical to Renzo and Nikolas. It is not a person — it is the **shared business account** (the FACES Gmail/Calendar mailbox). Two things are missing:

1. **No way to classify** that account as *shared / non-personal* vs. a real user.
2. **No way for another member** (e.g. Renzo, signed in with his personal `renzo.gt03@gmail.com`) to pull the shared `admin@facesculptors.net` emails/events into **his own** feed. The feed today resolves strictly by `user_id = authenticated principal`.

The user's mental model — **`USER 1→* IDENTITIES`**, with the admin account classified as *shared* — already exists physically (`profiles` 1→* `user_identities`). What's missing is the *shared* classification and a *cross-user subscription* path.

## 2. Current model (verified against PROD, 2026-06-15)

### `profiles` (RLS on)
`id uuid PK · email text · display_name text · role text default 'user' · personal_agent_id text · avatar_url text · alias text · role_id text · created_at · updated_at`
Post-GoTrue: `profiles.id == auth.users.id`. One row per real person/account.

### `user_identities` (RLS on) — the identity vault
`id uuid PK · user_id uuid (→profiles.id, OWNER) · provider text (google|telegram|whatsapp…) · kind text (oauth|channel) · external_id text · display_name · scope · secret_ciphertext · secret_iv · expires_at bigint · verified_at bigint · created_at · updated_at`
Unique `(provider, external_id)`. Encrypted OAuth/channel secrets. **Owned by exactly one profile.**

### `organization_members` (RLS on)
`organization_id uuid · profile_id uuid · role text default 'member' · created_at`. Unique `(profile_id, organization_id)`.

### Feed resolution (today)
Gateway owns `email-puller.ts` / `calendar-puller.ts`. For the authenticated principal it queries `user_identities WHERE user_id = me AND provider='google'`, decrypts each secret, pulls unread mail / upcoming events, returns items tagged with `sourceEmail` (already in `my-agent-rpc.ts` `EmailItem`/`CalendarItem`). The hub badges by domain (`provider.ts`).

### FACES data today
| Profile | Email | Member role | Identities |
|---|---|---|---|
| Faces Sculptors `9aa4e771…` | admin@facesculptors.net | member | google (oauth) |
| Nikolas Sarria `3ab72ffb…` | nikolas.pinon98@gmail.com | owner | google · telegram · whatsapp |
| Renzo GT `9f5accbf…` | renzo.gt03@gmail.com | member | google |

## 3. Target model

### 3.1 `profiles.account_type` (service-account flag — the "Both" part #1)
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'person';
ALTER TABLE profiles
  ADD CONSTRAINT profiles_account_type_chk CHECK (account_type IN ('person','service'));
```
- `'person'` (default) = a real human user.
- `'service'` = a shared/business account (e.g. the FACES mailbox). Not a person.
- Effects: rendered distinctly in the overview graph (§3.5); excluded from "people" counts in rosters where appropriate; its identities are *eligible* to be shareable.

### 3.2 `user_identities.shareable` (per-identity flag — the "Both" part #2)
```sql
ALTER TABLE user_identities
  ADD COLUMN IF NOT EXISTS shareable boolean NOT NULL DEFAULT false;
```
- `true` = this specific identity may be subscribed to by other org members.
- Profile-level `account_type='service'` marks *the account*; `shareable` marks *which of its identities are actually exposed*. (A service account could later expose its Gmail but not, say, a WhatsApp channel.)
- Guard: only identities whose owner is `account_type='service'` should be flippable to `shareable=true` (enforced in the hub service + optionally a trigger; see §6).

### 3.3 NEW `identity_subscriptions` (per-user opt-in — the grant model)
```sql
CREATE TABLE IF NOT EXISTS identity_subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id           uuid NOT NULL REFERENCES user_identities(id) ON DELETE CASCADE,
  subscriber_profile_id uuid NOT NULL REFERENCES profiles(id)        ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_id, subscriber_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_idsub_subscriber ON identity_subscriptions(subscriber_profile_id);
CREATE INDEX IF NOT EXISTS idx_idsub_identity   ON identity_subscriptions(identity_id);
```
- One row = "profile X has opted the shared identity Y into their feed, in org context Z".
- `organization_id` records the shared org context (used for scoping/RLS/cleanup). `ON DELETE CASCADE` on all three FKs auto-cleans when an identity, a user, or an org goes away.

### 3.4 Availability rule (what a user may subscribe to)
A user `p` may subscribe to identity `ui` iff **all** hold:
1. `ui.shareable = true`
2. `ui.user_id <> p` (can't subscribe to your own identity)
3. owner `ui.user_id` and subscriber `p` share at least one organization (`organization_members` join) — sharing is **org-scoped**, never cross-org.

```sql
-- available shared identities for subscriber :p
SELECT ui.id, ui.provider, ui.external_id, ui.display_name,
       owner.display_name AS owner_name, om_owner.organization_id
FROM user_identities ui
JOIN organization_members om_owner ON om_owner.profile_id = ui.user_id
JOIN organization_members om_me    ON om_me.profile_id = :p
                                   AND om_me.organization_id = om_owner.organization_id
JOIN profiles owner ON owner.id = ui.user_id
WHERE ui.shareable = true AND ui.user_id <> :p;
```

### 3.5 Overview graph rendering (resolves the "Faces Admin extra node")
`OverviewGraph.svelte` + `listUsers`:
- `listUsers` returns `account_type` per profile.
- **Service accounts are removed from the outer user ring** and rendered as a distinct node kind `shared` — neutral disc + a building/briefcase lucide icon (reuse `areaIconDataUri`), label "Faces Sculptors (shared)". Placed in its own band (or attached near the org center) so it visibly reads as "the business inbox", not a teammate.
- **Subscription edges**: for each `identity_subscriptions` row, draw a distinct (dashed / lower-opacity) edge from the subscriber's user node → the shared account node, so "who pulls the shared inbox" is legible. (Overview load must also fetch subscriptions; small addition to `+page.server.ts`.)
- This is pure presentation — shippable independently of the feed change.

## 4. Feed resolution change (gateway)

`email-puller.ts` / `calendar-puller.ts` identity query becomes:
```
identities(me) = { ui : ui.user_id = me }                       -- own (unchanged)
              ∪ { ui : ui.id ∈ (SELECT identity_id FROM identity_subscriptions
                                  WHERE subscriber_profile_id = me)
                       AND ui.shareable = true }                 -- subscribed shared
```
- **Authorization is at pull time, not by possession.** The gateway may decrypt + use a shared identity's secret **only** when an active `identity_subscriptions` row exists for `(identity, principal)` **and** `shareable` is still `true`. A revoked share (flag off) or deleted subscription must immediately stop the pull. This is the security crux: a shared OAuth credential is being exercised on behalf of a *different* user.
- Feed items from a shared identity get an extra marker (e.g. `shared: true`, `ownerName`) alongside the existing `sourceEmail`, so the hub can badge "Faces Sculptors (shared)" and group separately.
- No change to compose/reply (read-only; see §8).

## 5. Hub surfaces

**Admin (mark shared):** org settings / account panel where an org admin can (a) set a profile's `account_type` to `service`, (b) toggle `shareable` per identity on a service account. Reuse existing identity-management patterns (`identity.service.ts`, channel-claim UI).

**User (opt-in):** feed/account settings list of *available* shared identities in the user's org (query §3.4) with a "Show in my feed" toggle → insert/delete `identity_subscriptions`. Feed then shows the subscribed shared items, badged.

## 6. Security / RLS

- Hub reads/writes via `supabaseAdmin()` (service role → bypasses RLS); RLS is the defense-in-depth layer for any direct client access.
- `identity_subscriptions` RLS: subscriber may `SELECT`/`INSERT`/`DELETE` **only rows where `subscriber_profile_id = auth.uid()`**, and only for identities that satisfy the §3.4 availability rule (enforce via `WITH CHECK`). Service role bypasses for gateway/hub.
- `shareable` flip-on guard: hub service must verify the owner profile is `account_type='service'` before setting `shareable=true`. Optional BEFORE UPDATE trigger as belt-and-suspenders.
- **Revocation:** flipping `shareable` back to `false` must stop pulls (gateway checks `shareable` at pull time) and SHOULD delete dependent `identity_subscriptions` (app-level on flag-off, or a trigger). Document in the migration.
- Follow existing convention from CRM work: any *views* added need `security_invoker=true` (n/a here — this spec adds tables/columns only).

## 7. Migration & rollout (safe, additive, each step independently shippable)

1. **Migration** (additive only): `account_type` column, `shareable` column, `identity_subscriptions` table + indexes + RLS. Idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). No behavior change (`shareable` defaults false; zero subscriptions). File: `supabase/migrations/<ts>_shared_account_identities.sql` at meta root.
2. **Hub display**: `listUsers` exposes `account_type`; overview renders service accounts as `shared` nodes + subscription edges. Pure display — safe.
3. **Hub admin UI**: mark service + shareable. Then **backfill** (gated, §9).
4. **Hub user UI**: subscribe/unsubscribe toggle.
5. **Gateway**: feed union + badge + pull-time authorization. Deploy to netcup. Feed only changes once this ships **and** a subscription exists.

## 8. Non-goals (this spec)

- Sending / replying **as** the shared account (read/feed only). Compose-as-shared is future work (needs send-scope authorization + audit).
- Splitting one Google identity into separate Gmail vs Calendar shares — `admin@facesculptors.net` is a single `google` identity covering both today; per-identity `shareable` already supports finer grain if/when identities are split.
- Admin-curated explicit grants (the rejected option) — layerable later on the same `identity_subscriptions` table (admin-created rows) without schema change.

## 9. Proposed backfill (NOT applied — needs go-ahead)

```sql
-- classify the FACES business account as a service account
UPDATE profiles SET account_type='service'
WHERE id = '9aa4e771-f922-44e0-8351-9a1486ac2566';
-- expose its Google identity for subscription
UPDATE user_identities SET shareable=true
WHERE user_id = '9aa4e771-f922-44e0-8351-9a1486ac2566' AND provider='google';
```
After this, Renzo (and Nikolas) would see `admin@facesculptors.net` listed as an available shared inbox to opt into.

## 10. Open questions

- Should a service account still be assignable as an **org-area owner** in `/overview`, or excluded from area assignment entirely?
- Should subscriptions be **auto-suggested** to new org members (prompt "add the shared FACES inbox to your feed?") or fully manual?
- Feed grouping UX: separate "Shared" section vs. inline items badged with the owner name?
- Consent/audit trail for using a shared mailbox's mail on another user's screen (FACES is a clinic — same consent considerations as the CRM work).
