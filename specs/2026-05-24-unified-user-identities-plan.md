# Unified User Identities — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one canonical `user_identities` table (hub DB) covering OAuth + channel identities with app-level encrypted secrets, then connect it to the gateway via on-demand WS credential fetch, WhatsApp resolver parity, and a profile-page UI.

**Architecture:** Phase 1 (this document, fully specified) lays the foundation entirely inside the hub / `@minion-stack/db`: schema in both schema locations, a migration with channel backfill, a small identity-secret crypto helper reusing the existing AES-256-GCM `encrypt`/`decrypt`, and a rewritten `identity.service.ts` over the new table with a backward-compatible API. Phases 2–6 (roadmap at the end) build on P1's concrete table + service and each get their own detailed plan when reached.

**Tech Stack:** Drizzle ORM (libsql/sqlite), Better Auth, SvelteKit (Bun), Vitest, Node `crypto`.

**Spec:** `specs/2026-05-24-unified-user-identities-design.md`

**Key grounding facts (verified):**
- Schema is duplicated: canonical in `packages/db/src/schema/`, mirrored in `minion_hub/src/server/db/schema/`. New tables go in BOTH; both index files re-export.
- Crypto already exists: `minion_hub/src/server/auth/crypto.ts` → `encrypt(plaintext): {ciphertext, iv}` and `decrypt(ciphertext, iv): string` (AES-256-GCM, scrypt key from `ENCRYPTION_KEY`). Encrypted columns are stored as **hex text** (see `servers.token` + `servers.token_iv`).
- Migrations are hand-authored numbered SQL in `minion_hub/drizzle/` (latest `0013_roles.sql`). The `meta/_journal.json` is not consistently updated past 0007; treat the `.sql` file as the source of truth and apply it the same way 0008–0013 were applied for the target environment.
- Service test harness: `createMockDb()` from `$server/test-utils/mock-db` with `resolveSequence([...rows])`, and `vi.mock('$server/db/utils', ...)` to stub `newId`/`nowMs`. Vitest, `bun run test`.
- `identity.service.ts` currently exports `listIdentities`, `attachIdentity({channel, channelUserId, displayName, verified})`, `markVerified`, `removeIdentity`, `findByChannelKey`, all over `channelIdentities`.

---

## Phase 1 File Structure

| File | Responsibility | Action |
|---|---|---|
| `packages/db/src/schema/user-identities.ts` | Canonical `userIdentities` table | Create |
| `packages/db/src/schema/index.ts` | Re-export `userIdentities` | Modify |
| `minion_hub/src/server/db/schema/user-identities.ts` | Hub-local mirror of the table | Create |
| `minion_hub/src/server/db/schema/index.ts` (if present) / import sites | Mirror export | Modify |
| `minion_hub/drizzle/0014_user_identities.sql` | Create table + indexes + channel backfill | Create |
| `minion_hub/src/server/services/identity-secrets.ts` | Encode/encrypt/decrypt Google ADC blob | Create |
| `minion_hub/src/server/services/identity-secrets.test.ts` | Crypto round-trip tests | Create |
| `minion_hub/src/server/services/identity.service.ts` | CRUD over `userIdentities`, compat API | Rewrite |
| `minion_hub/src/server/services/identity.service.test.ts` | Service tests via mock-db | Create |
| `minion_hub/scripts/backfill-google-identities.ts` | One-time encrypt+insert of google `account` rows | Create |

---

### Task 1: Canonical `userIdentities` schema in `@minion-stack/db`

**Files:**
- Create: `packages/db/src/schema/user-identities.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create the table definition**

```ts
// packages/db/src/schema/user-identities.ts
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth/index.js';

/**
 * Canonical per-user identity row. Covers OAuth providers (kind='oauth',
 * e.g. google) and channel identities (kind='channel', e.g. whatsapp/telegram).
 * Secret material (OAuth ADC blob) is stored app-level-encrypted as hex text
 * in secretCiphertext/secretIv (same scheme as servers.token); null for
 * channel identities that carry no secret.
 */
export const userIdentities = sqliteTable(
  'user_identities',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google' | 'whatsapp' | 'telegram' | 'discord' | 'signal' | 'slack'
    kind: text('kind').notNull(), // 'oauth' | 'channel'
    externalId: text('external_id').notNull(),
    displayName: text('display_name'),
    scope: text('scope'),
    secretCiphertext: text('secret_ciphertext'),
    secretIv: text('secret_iv'),
    expiresAt: integer('expires_at'),
    verifiedAt: integer('verified_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_user_identity_unique').on(t.provider, t.externalId),
    index('idx_user_identity_user').on(t.userId),
  ],
);
```

- [ ] **Step 2: Re-export from the schema barrel**

In `packages/db/src/schema/index.ts`, add after the `channelIdentities` export (line 46):

```ts
export { userIdentities } from './user-identities.js';
```

- [ ] **Step 3: Typecheck the package**

Run: `cd packages/db && bun run typecheck`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/user-identities.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add canonical user_identities schema"
```

---

### Task 2: Mirror the table in the hub-local schema

**Files:**
- Create: `minion_hub/src/server/db/schema/user-identities.ts`

- [ ] **Step 1: Create the hub-local mirror** (note the local `./auth` import path, matching `channel-identities.ts`)

```ts
// minion_hub/src/server/db/schema/user-identities.ts
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

export const userIdentities = sqliteTable(
  'user_identities',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    kind: text('kind').notNull(),
    externalId: text('external_id').notNull(),
    displayName: text('display_name'),
    scope: text('scope'),
    secretCiphertext: text('secret_ciphertext'),
    secretIv: text('secret_iv'),
    expiresAt: integer('expires_at'),
    verifiedAt: integer('verified_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_user_identity_unique').on(t.provider, t.externalId),
    index('idx_user_identity_user').on(t.userId),
  ],
);
```

- [ ] **Step 2: Commit**

```bash
git add minion_hub/src/server/db/schema/user-identities.ts
git commit -m "feat(hub): mirror user_identities schema in hub-local schema"
```

---

### Task 3: Migration — create table + channel backfill

**Files:**
- Create: `minion_hub/drizzle/0014_user_identities.sql`

- [ ] **Step 1: Author the migration** (follows the hand-written style of `0012_user_alias_role.sql`)

```sql
-- Unified user identities: OAuth providers + channel identities with encrypted secrets.
CREATE TABLE user_identities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  kind TEXT NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT,
  scope TEXT,
  secret_ciphertext TEXT,
  secret_iv TEXT,
  expires_at INTEGER,
  verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_user_identity_unique ON user_identities (provider, external_id);
CREATE INDEX idx_user_identity_user ON user_identities (user_id);

-- Backfill existing channel identities (no secrets to encrypt → pure SQL).
INSERT INTO user_identities
  (id, user_id, provider, kind, external_id, display_name, verified_at, created_at, updated_at)
SELECT
  id, user_id, channel, 'channel', channel_user_id, display_name, verified_at, created_at, created_at
FROM channel_identities;
```

> Google `account` rows are backfilled separately (Task 6) because the refresh token must be encrypted in application code and `client_id`/`client_secret` come from env — not expressible in pure SQL.

- [ ] **Step 2: Apply to local dev DB and verify**

Run (local sqlite dev file):
```bash
cd minion_hub && sqlite3 ./data/minion_hub.db < drizzle/0014_user_identities.sql
sqlite3 ./data/minion_hub.db "SELECT count(*) AS migrated FROM user_identities WHERE kind='channel';"
```
Expected: table created; `migrated` equals the row count of `channel_identities` (`sqlite3 ./data/minion_hub.db "SELECT count(*) FROM channel_identities;"`).

> Production/Turso apply: ship this `.sql` through the same path used for `0013_roles.sql` (the meta journal is not authoritative past 0007). Confirm that path before deploying.

- [ ] **Step 3: Commit**

```bash
git add minion_hub/drizzle/0014_user_identities.sql
git commit -m "feat(hub): migration 0014 user_identities + channel backfill"
```

---

### Task 4: Identity-secret crypto helper (TDD)

**Files:**
- Create: `minion_hub/src/server/services/identity-secrets.ts`
- Test: `minion_hub/src/server/services/identity-secrets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// minion_hub/src/server/services/identity-secrets.test.ts
import { describe, it, expect } from 'vitest';
import { encryptAdc, decryptAdc, type GoogleAdc } from './identity-secrets';

const adc: GoogleAdc = {
  client_id: 'cid.apps.googleusercontent.com',
  client_secret: 'secret-xyz',
  refresh_token: '1//refresh-token-value',
  type: 'authorized_user',
};

describe('identity-secrets', () => {
  it('round-trips an ADC blob through encrypt/decrypt', () => {
    const enc = encryptAdc(adc);
    expect(typeof enc.ciphertext).toBe('string');
    expect(typeof enc.iv).toBe('string');
    expect(enc.ciphertext).not.toContain('refresh-token-value'); // not plaintext
    const back = decryptAdc(enc.ciphertext, enc.iv);
    expect(back).toEqual(adc);
  });

  it('produces a distinct iv each call (random nonce)', () => {
    const a = encryptAdc(adc);
    const b = encryptAdc(adc);
    expect(a.iv).not.toBe(b.iv);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd minion_hub && bun run vitest run src/server/services/identity-secrets.test.ts`
Expected: FAIL — cannot resolve `./identity-secrets`.

- [ ] **Step 3: Implement the helper** (thin wrapper over the existing AES-256-GCM crypto)

```ts
// minion_hub/src/server/services/identity-secrets.ts
import { encrypt, decrypt } from '$server/auth/crypto';

/** Google Application Default Credentials (authorized_user) blob. */
export type GoogleAdc = {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  type: 'authorized_user';
};

export function encryptAdc(adc: GoogleAdc): { ciphertext: string; iv: string } {
  return encrypt(JSON.stringify(adc));
}

export function decryptAdc(ciphertext: string, iv: string): GoogleAdc {
  return JSON.parse(decrypt(ciphertext, iv)) as GoogleAdc;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd minion_hub && bun run vitest run src/server/services/identity-secrets.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add minion_hub/src/server/services/identity-secrets.ts minion_hub/src/server/services/identity-secrets.test.ts
git commit -m "feat(hub): identity-secret ADC encrypt/decrypt helper"
```

---

### Task 5: Rewrite `identity.service.ts` over `userIdentities` (TDD)

The new service keeps the existing public API shape so current callers (the `/api/users/[id]/identities*` routes) keep compiling: `listIdentities`, `attachIdentity`, `markVerified`, `removeIdentity`, `findByChannelKey`. It adds OAuth-aware functions: `attachGoogleIdentity`, `getGoogleCredential`. Channel identities are stored with `provider=<channel>`, `kind='channel'`; the compat `attachIdentity({channel,...})` maps onto that.

**Files:**
- Rewrite: `minion_hub/src/server/services/identity.service.ts`
- Test: `minion_hub/src/server/services/identity.service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// minion_hub/src/server/services/identity.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb } from '$server/test-utils/mock-db';
import {
  listIdentities,
  attachIdentity,
  findByChannelKey,
  getGoogleCredential,
} from './identity.service';

vi.mock('$server/db/utils', () => ({
  newId: () => 'mock-id-00000001',
  nowMs: () => 1_700_000_000_000,
}));

beforeEach(() => vi.clearAllMocks());

describe('identity.service', () => {
  it('listIdentities reads rows for the user', async () => {
    const { db, resolveSequence } = createMockDb();
    resolveSequence([
      [{ id: 'i1', userId: 'u1', provider: 'whatsapp', kind: 'channel', externalId: '+51999' }],
    ]);
    const rows = await listIdentities({ db, tenantId: 't1' } as never, 'u1');
    expect(rows).toHaveLength(1);
    expect(rows[0].provider).toBe('whatsapp');
  });

  it('attachIdentity stores a channel identity as provider+kind=channel', async () => {
    const { db, captures } = createMockDb();
    const id = await attachIdentity({ db, tenantId: 't1' } as never, 'u1', {
      channel: 'whatsapp',
      channelUserId: '+51999',
      displayName: 'Nik',
      verified: true,
    });
    expect(id).toBe('mock-id-00000001');
    const inserted = captures.insertValues[0];
    expect(inserted).toMatchObject({
      userId: 'u1',
      provider: 'whatsapp',
      kind: 'channel',
      externalId: '+51999',
      verifiedAt: 1_700_000_000_000,
    });
  });

  it('findByChannelKey maps channel+id onto provider+externalId lookup', async () => {
    const { db, resolveSequence } = createMockDb();
    resolveSequence([[{ id: 'i1', userId: 'u1', provider: 'telegram', kind: 'channel', externalId: '123' }]]);
    const row = await findByChannelKey({ db, tenantId: 't1' } as never, 'telegram', '123');
    expect(row?.userId).toBe('u1');
  });

  it('getGoogleCredential decrypts the stored ADC for a user', async () => {
    const { encryptAdc } = await import('./identity-secrets');
    const enc = encryptAdc({
      client_id: 'cid', client_secret: 'sec', refresh_token: 'rt', type: 'authorized_user',
    });
    const { db, resolveSequence } = createMockDb();
    resolveSequence([
      [{
        id: 'g1', userId: 'u1', provider: 'google', kind: 'oauth',
        externalId: 'nik@example.com', secretCiphertext: enc.ciphertext, secretIv: enc.iv,
      }],
    ]);
    const cred = await getGoogleCredential({ db, tenantId: 't1' } as never, 'u1');
    expect(cred).toEqual({
      email: 'nik@example.com',
      adc: { client_id: 'cid', client_secret: 'sec', refresh_token: 'rt', type: 'authorized_user' },
    });
  });
});
```

> If `createMockDb` does not expose `captures.insertValues`, inspect `src/server/test-utils/mock-db.ts` and adapt the assertion to its actual capture API (e.g. spy on `db.insert`). Mirror an existing insert-asserting test such as `server.service.test.ts`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd minion_hub && bun run vitest run src/server/services/identity.service.test.ts`
Expected: FAIL — `getGoogleCredential` not exported / signature mismatch.

- [ ] **Step 3: Rewrite the service**

```ts
// minion_hub/src/server/services/identity.service.ts
import { and, eq } from 'drizzle-orm';
import { userIdentities } from '../db/schema/user-identities';
import { nowMs } from '../db/utils';
import type { TenantContext } from './base';
import { randomUUID } from 'node:crypto';
import { encryptAdc, decryptAdc, type GoogleAdc } from './identity-secrets';

export type AttachIdentityInput = {
  channel: string;
  channelUserId: string;
  displayName?: string;
  verified: boolean;
};

export async function listIdentities(ctx: TenantContext, userId: string) {
  return ctx.db.select().from(userIdentities).where(eq(userIdentities.userId, userId));
}

/** Backward-compatible: attach a CHANNEL identity (provider=<channel>, kind='channel'). */
export async function attachIdentity(
  ctx: TenantContext,
  userId: string,
  input: AttachIdentityInput,
): Promise<string> {
  const id = randomUUID();
  const now = nowMs();
  await ctx.db.insert(userIdentities).values({
    id,
    userId,
    provider: input.channel,
    kind: 'channel',
    externalId: input.channelUserId,
    displayName: input.displayName ?? null,
    scope: null,
    secretCiphertext: null,
    secretIv: null,
    expiresAt: null,
    verifiedAt: input.verified ? now : null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** Attach/replace a Google OAuth identity with an encrypted ADC blob. */
export async function attachGoogleIdentity(
  ctx: TenantContext,
  userId: string,
  input: { email: string; adc: GoogleAdc; scope?: string; expiresAt?: number },
): Promise<string> {
  const id = randomUUID();
  const now = nowMs();
  const enc = encryptAdc(input.adc);
  await ctx.db
    .insert(userIdentities)
    .values({
      id,
      userId,
      provider: 'google',
      kind: 'oauth',
      externalId: input.email,
      displayName: input.email,
      scope: input.scope ?? null,
      secretCiphertext: enc.ciphertext,
      secretIv: enc.iv,
      expiresAt: input.expiresAt ?? null,
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userIdentities.provider, userIdentities.externalId],
      set: {
        userId,
        scope: input.scope ?? null,
        secretCiphertext: enc.ciphertext,
        secretIv: enc.iv,
        expiresAt: input.expiresAt ?? null,
        updatedAt: now,
      },
    });
  return id;
}

/** Decrypt the stored Google ADC for a user (first google identity). */
export async function getGoogleCredential(
  ctx: TenantContext,
  userId: string,
): Promise<{ email: string; adc: GoogleAdc } | null> {
  const rows = await ctx.db
    .select()
    .from(userIdentities)
    .where(and(eq(userIdentities.userId, userId), eq(userIdentities.provider, 'google')));
  const row = rows[0];
  if (!row || !row.secretCiphertext || !row.secretIv) return null;
  return { email: row.externalId, adc: decryptAdc(row.secretCiphertext, row.secretIv) };
}

export async function markVerified(ctx: TenantContext, identityId: string) {
  await ctx.db
    .update(userIdentities)
    .set({ verifiedAt: nowMs(), updatedAt: nowMs() })
    .where(eq(userIdentities.id, identityId));
}

export async function removeIdentity(ctx: TenantContext, identityId: string) {
  await ctx.db.delete(userIdentities).where(eq(userIdentities.id, identityId));
}

/** Backward-compatible channel lookup → provider+externalId. */
export async function findByChannelKey(ctx: TenantContext, channel: string, channelUserId: string) {
  const rows = await ctx.db
    .select()
    .from(userIdentities)
    .where(and(eq(userIdentities.provider, channel), eq(userIdentities.externalId, channelUserId)));
  return rows[0] ?? null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd minion_hub && bun run vitest run src/server/services/identity.service.test.ts`
Expected: PASS (4 tests). If the mock-db capture API differs, adapt per the note in Step 1 and re-run.

- [ ] **Step 5: Commit**

```bash
git add minion_hub/src/server/services/identity.service.ts minion_hub/src/server/services/identity.service.test.ts
git commit -m "feat(hub): rewrite identity.service over user_identities (+google ADC)"
```

---

### Task 6: One-time Google account backfill script

**Files:**
- Create: `minion_hub/scripts/backfill-google-identities.ts`

- [ ] **Step 1: Write the script** (idempotent via `attachGoogleIdentity` upsert)

```ts
// minion_hub/scripts/backfill-google-identities.ts
// Run once after migration 0014. Reads Better Auth google accounts and writes
// encrypted ADC rows into user_identities. Idempotent (upsert on provider+externalId).
import { eq } from 'drizzle-orm';
import { getDb } from '../src/server/db/client';
import { account, user } from '@minion-stack/db/schema';
import { attachGoogleIdentity } from '../src/server/services/identity.service';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_ID/SECRET required');

const db = getDb();
const rows = await db.select().from(account).where(eq(account.providerId, 'google'));
let migrated = 0;
for (const a of rows) {
  if (!a.refreshToken) continue; // no usable long-lived grant
  const u = (await db.select().from(user).where(eq(user.id, a.userId)))[0];
  const email = u?.email ?? a.accountId;
  await attachGoogleIdentity({ db, tenantId: 'default' } as never, a.userId, {
    email,
    adc: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: a.refreshToken,
      type: 'authorized_user',
    },
    scope: a.scope ?? undefined,
    expiresAt: a.refreshTokenExpiresAt ? Number(a.refreshTokenExpiresAt) : undefined,
  });
  migrated++;
}
console.log(`[backfill] google identities migrated: ${migrated}/${rows.length}`);
```

- [ ] **Step 2: Dry-run locally and verify**

Run: `cd minion_hub && bun run scripts/backfill-google-identities.ts`
Expected: prints `[backfill] google identities migrated: N/M`; then
`sqlite3 ./data/minion_hub.db "SELECT count(*) FROM user_identities WHERE provider='google';"` equals N, and `secret_ciphertext` is non-null hex (not containing any raw refresh token substring).

- [ ] **Step 3: Commit**

```bash
git add minion_hub/scripts/backfill-google-identities.ts
git commit -m "feat(hub): one-time google identity backfill script"
```

---

### Task 7: Verify the whole phase is green

- [ ] **Step 1: Typecheck + tests + check**

Run:
```bash
cd packages/db && bun run typecheck
cd ../../minion_hub && bun run test && bun run check
```
Expected: all PASS. Existing identity-route callers (`/api/users/[id]/identities*`) still compile because `attachIdentity`/`listIdentities`/`findByChannelKey`/`markVerified`/`removeIdentity` keep their signatures.

- [ ] **Step 2: Confirm no plaintext secret at rest**

Run: `cd minion_hub && sqlite3 ./data/minion_hub.db "SELECT provider, kind, substr(secret_ciphertext,1,12) FROM user_identities WHERE kind='oauth' LIMIT 3;"`
Expected: ciphertext is hex; no readable token.

- [ ] **Step 3: Final phase commit (if anything uncommitted)**

```bash
git add -A && git commit -m "chore(hub): phase-1 unified identities green (typecheck/test/check)"
```

---

## Phases 2–6 Roadmap (detailed plans authored when reached)

Each phase below produces working, testable software and gets its own full TDD plan written against P1's concrete table + service.

**P2 — Hub credential RPC + gateway client.**
- Hub: add a gateway-facing method (on the existing admin/hub-events WS) `identity.credentials.fetch({userId, provider:'google'})` → calls `getGoogleCredential` → returns `{email, adc}` over the authenticated socket. Authorize via the existing server-token/tenant check.
- Gateway: a credential client that calls that RPC + a short-lived (~5 min) in-memory `Map` TTL cache; never persists to the vault. Files: gateway `src/users/` or a new `src/personal-agent/credential-client.ts`; wire into `src/gateway/server-methods/hub-events.ts` request path.
- Tests: hub handler returns decrypted ADC for a linked user / null for a stranger; gateway client caches + expires.

**P3 — Gateway turn-time loader rewrite.**
- Rewrite `minion/src/hooks/gws-credentials.ts:loadSessionCredentialsForUser` to: resolve `userId` → P2 fetch → write transient ADC file under `stateDir` (`0600`) → return path → delete after turn.
- Deprecate `minion/src/hooks/gog-credentials.ts`. Tests: file written `0600`, removed post-turn; missing-credential path yields a clean "not linked" result.

**P4 — WhatsApp resolver parity.**
- Add inline `resolveChannelSenderIdentity("whatsapp", senderE164 ?? senderJid)` in `minion/src/web/auto-reply/monitor/on-message.ts` (or the WhatsApp channel adapter), matching Discord/Telegram/Signal. Thread the resolved `userId` into the turn so P3's loader can use it. Tests: known sender → userId; stranger → null (no creds).

**P5 — Profile-page identities UI (hub).**
- Route `src/routes/(app)/settings/account/+page.svelte` + `+page.server.ts` (`depends('app:identities')`, loads current user's `user_identities`).
- Component `src/lib/components/users/ConnectedIdentities.svelte` (generalize `IdentityList.svelte`): group OAuth vs Channels; per-row unlink.
- Channel add: reuse the existing OTP flow (`IdentityLinkPopover` → `verify-request` → `verify-confirm`).
- Google add: add Better Auth social/link client plugin to `src/lib/auth/auth-client.ts`; `authClient.linkSocial({provider:'google', callbackURL:'/settings/account'})`; the `after` hook in `auth.ts` calls `attachGoogleIdentity`. Unlink → Better Auth unlink + `removeIdentity`.
- Mutations `invalidate('app:identities')`.

**P6 — Cleanup.**
- Remove gateway `gws_credentials:*` vault writes; delete dead gog code + stale config schema; drop `channel_identities` table + its compat shim once all readers use `user_identities`. Migration `0015_drop_channel_identities.sql`.

---

## Self-Review

- **Spec coverage:** unified table (T1/T2), app-level encryption (T4 + servers.token scheme), channel backfill (T3), google backfill (T6), API-compat so UI/routes keep working (T5). On-demand WS fetch → P2; gateway loader → P3; WhatsApp parity → P4; profile UI → P5; cleanup/residual → P6. Real-life testing: P1 covers CI unit/integration + the at-rest no-plaintext check (T7 Step 2); local + live netcup E2E land with P3–P5 (scoped in the spec, executed when those phases build).
- **Placeholder scan:** no TBD/TODO; every code step has full code; the one conditional ("if `createMockDb` differs") names the concrete file to inspect and an existing test to mirror.
- **Type consistency:** `userIdentities` columns (`secretCiphertext`/`secretIv`/`externalId`/`provider`/`kind`) identical across T1, T2, T3 SQL, and T5 usage. `GoogleAdc` defined in T4 and reused in T5/T6. `attachGoogleIdentity`/`getGoogleCredential`/`attachIdentity` signatures consistent between T5 implementation, T5 tests, and T6 caller.
