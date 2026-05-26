# Phase 1b — Hub Dual-Mode Auth (Supabase default, Better Auth self-hosted) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `minion_hub` authenticate via Supabase (the new default) while keeping Better Auth as the self-hosted fallback, by bridging the Supabase user to its `legacy_user_id` so the entire existing Turso-based multi-tenant load flow keeps working unchanged.

**Architecture:** A flag-gated (`AUTH_PROVIDER`) branch in `hooks.server.ts`. When `supabase`, the hub resolves the session via `supabase.auth.getUser()`, looks up `public.profiles` by the Supabase uuid, and sets `locals.user.id = profiles.legacy_user_id` (falling back to the uuid). Every downstream load (`requireAuth`, org auto-activation, permissions/workspaces/hosts/preferences) is keyed off `locals.user.id` and the `member` table, so it resolves the user's existing Turso data with no change. Better Auth path stays the default-off fallback.

**Tech Stack:** SvelteKit 2, Svelte 5, `@supabase/ssr`, `@supabase/supabase-js`, `@minion-stack/db@^0.3.0` (`./pg`), Drizzle + libsql/Turso, Vitest, Bun.

**Out of scope (later plans):** gateway JWKS / gateway-token minting for Supabase-authed users (hub currently mints via `oidcProvider`); Phase 2 (38-table data → Postgres); native Supabase signups that have no `legacy_user_id` (they hit the existing "no org membership" 403 — acceptable for now).

---

## Pre-flight (manual, one-time)

- [ ] **P0a — Hub dev origin in Supabase redirect URLs.** Determine the hub's dev origin (SvelteKit/Vite — confirm the port; hub and site can't both be 5173, so the hub likely runs on `5174` or a configured port: check `minion_hub/vite.config.*` / `package.json` dev script). In Supabase → Auth → URL Configuration, add `<hub-dev-origin>/auth/callback` to Redirect URLs (e.g. `http://localhost:5174/auth/callback`). The Google Cloud redirect (`https://gxvsaskbohavnurfvshr.supabase.co/auth/v1/callback`) is already set and needs no change.
- [ ] **P0b — Hub `.env.local`.** Add `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret), and leave `AUTH_PROVIDER`/`PUBLIC_AUTH_PROVIDER` unset for now (default stays Better Auth until E2E verified, then flip — see Task 9).

---

## File Structure

**Created:**
- `minion_hub/src/lib/supabase/client.ts` — browser client (mirror of site)
- `minion_hub/src/server/supabase.ts` — request-scoped server client + service-role admin client
- `minion_hub/src/server/auth/supabase-bridge.ts` — `mapProfileToUser()` (pure) + `resolveSupabaseUser(event)` (runtime)
- `minion_hub/src/server/auth/supabase-bridge.test.ts`
- `minion_hub/src/routes/auth/callback/+server.ts` — OAuth code exchange + identity sync
- `minion_hub/vitest.config.ts` — if hub lacks one (check first; hub already has vitest per CLAUDE.md `bun run test`)

**Modified:**
- `minion_hub/package.json` — bump `@minion-stack/db` → `^0.3.0`; add `@supabase/ssr`, `@supabase/supabase-js`
- `minion_hub/src/hooks.server.ts` — flag-gated Supabase branch in `appHandle`
- `minion_hub/src/app.d.ts` — add `supabaseId?: string` to `locals.user`
- `minion_hub/src/routes/(app)/login/+page.svelte` (or hub's login route) — flag-gated Supabase Google button
- `minion_hub/.env.example` — new Supabase + `AUTH_PROVIDER` vars

---

## Task 1: Hub deps + db bump

**Files:** Modify `minion_hub/package.json`

- [ ] **Step 1: Bump db + add supabase deps**

Run: `cd minion_hub && bun add @minion-stack/db@^0.3.0 @supabase/ssr @supabase/supabase-js`
Expected: `@minion-stack/db@0.3.0` resolved (publishes the `./pg` export), supabase packages installed.

- [ ] **Step 2: Verify `./pg` resolves (ESM)**

Run: `node --input-type=module -e "import('@minion-stack/db/pg').then(m=>console.log(Object.keys(m).join(',')))"`
Expected: prints `mapGoogleIdentity,openSecret,profiles,sealSecret,userIdentities`.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(deps): hub @minion-stack/db ^0.3.0 + supabase ssr/js"
```

---

## Task 2: Supabase clients (mirror site)

**Files:** Create `minion_hub/src/lib/supabase/client.ts`, `minion_hub/src/server/supabase.ts`; modify `.env.example`

- [ ] **Step 1: Write `src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabaseBrowser = () =>
  createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
```

- [ ] **Step 2: Write `src/server/supabase.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

/** Request-scoped client that reads/writes auth cookies on the response. */
export function supabaseServer(event: RequestEvent) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) {
          event.cookies.set(name, value, { ...options, path: '/' });
        }
      },
    },
  });
}

/** Service-role client — bypasses RLS. Server-only. NEVER expose to the gateway. */
export function supabaseAdmin() {
  return createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 3: Append to `.env.example`**

```bash
# Supabase (Phase 1b dual-mode auth; supabase is the default once verified)
AUTH_PROVIDER=better-auth            # 'supabase' | 'better-auth'
PUBLIC_AUTH_PROVIDER=better-auth
PUBLIC_SUPABASE_URL=https://gxvsaskbohavnurfvshr.supabase.co
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4: Typecheck**

Run: `cd minion_hub && bun run check`
Expected: no new errors from these files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/client.ts src/server/supabase.ts .env.example
git commit -m "feat(auth): hub supabase ssr browser + server/admin clients"
```

---

## Task 3: Supabase→legacy bridge (pure mapper, TDD)

The bridge maps a `profiles` row to the hub's `locals.user`, using `legacy_user_id` as the id so Turso-keyed loads match.

**Files:** Create `minion_hub/src/server/auth/supabase-bridge.ts` + `.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { mapProfileToUser, type ProfileRow } from './supabase-bridge.js';

const base: ProfileRow = {
  id: 'supa-uuid-1',
  email: 'nik@example.com',
  display_name: 'Nik P',
  role: 'admin',
  legacy_user_id: 'better-auth-id-1',
};

describe('mapProfileToUser', () => {
  it('uses legacy_user_id as the hub user id (so Turso loads match)', () => {
    const u = mapProfileToUser(base, 'supa-uuid-1');
    expect(u).toEqual({
      id: 'better-auth-id-1',
      email: 'nik@example.com',
      displayName: 'Nik P',
      role: 'admin',
      supabaseId: 'supa-uuid-1',
    });
  });

  it('falls back to the supabase id when no legacy id (native signup)', () => {
    const u = mapProfileToUser({ ...base, legacy_user_id: null }, 'supa-uuid-1');
    expect(u.id).toBe('supa-uuid-1');
    expect(u.supabaseId).toBe('supa-uuid-1');
  });

  it('defaults role to user when null', () => {
    const u = mapProfileToUser({ ...base, role: null }, 'supa-uuid-1');
    expect(u.role).toBe('user');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd minion_hub && bun run vitest run src/server/auth/supabase-bridge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `supabase-bridge.ts` (pure part)**

```typescript
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseServer, supabaseAdmin } from '$server/supabase';

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'user' | 'admin' | null;
  legacy_user_id: string | null;
}

export interface BridgedUser {
  id: string; // legacy_user_id when present (matches Turso), else supabase uuid
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
  supabaseId: string;
}

/** Pure: profiles row + supabase uuid → hub locals.user shape. */
export function mapProfileToUser(profile: ProfileRow, supabaseId: string): BridgedUser {
  return {
    id: profile.legacy_user_id ?? supabaseId,
    email: profile.email ?? '',
    displayName: profile.display_name ?? null,
    role: profile.role === 'admin' ? 'admin' : 'user',
    supabaseId,
  };
}

/**
 * Runtime: resolve the current Supabase user (if any) into the hub user shape.
 * Returns null when unauthenticated. Reads role/legacy id from public.profiles
 * via the service-role client (RLS-independent, server-side).
 */
export async function resolveSupabaseUser(event: RequestEvent): Promise<BridgedUser | null> {
  const supabase = supabaseServer(event);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('id, email, display_name, role, legacy_user_id')
    .eq('id', user.id)
    .single();

  // If the profile row is missing, fall back to the auth user's own fields.
  return mapProfileToUser(
    profile ?? {
      id: user.id,
      email: user.email ?? null,
      display_name: (user.user_metadata?.full_name as string) ?? null,
      role: null,
      legacy_user_id: null,
    },
    user.id,
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd minion_hub && bun run vitest run src/server/auth/supabase-bridge.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/supabase-bridge.ts src/server/auth/supabase-bridge.test.ts
git commit -m "feat(auth): hub supabase->legacy_user_id bridge"
```

---

## Task 4: app.d.ts — add supabaseId

**Files:** Modify `minion_hub/src/app.d.ts`

- [ ] **Step 1: Add `supabaseId` to the `user` locals shape**

Add `supabaseId?: string;` to the `interface Locals { user?: {...} }` block (keep all existing fields: `id`, `email`, `displayName`, `role`, plus `session`, `orgId`, `tenantCtx`, etc. — do not remove any).

- [ ] **Step 2: Typecheck**

Run: `cd minion_hub && bun run check`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app.d.ts
git commit -m "feat(auth): hub locals.user.supabaseId"
```

---

## Task 5: hooks.server.ts — flag-gated Supabase branch

Insert a Supabase auth branch into `appHandle` that runs when `AUTH_PROVIDER=supabase`, setting `locals.user` via the bridge BEFORE the Better Auth `getSession` block. The rest of `appHandle` (tenant fallback, redirects) is unchanged.

**Files:** Modify `minion_hub/src/hooks.server.ts`

- [ ] **Step 1: Add imports near the top**

```typescript
import { env as privateEnv } from '$env/dynamic/private';
import { resolveSupabaseUser } from '$server/auth/supabase-bridge';
```

- [ ] **Step 2: Add the Supabase branch at the start of `appHandle`, immediately after the `AUTH_DISABLED` block and before the Bearer/Better-Auth blocks**

```typescript
  // Supabase auth (default). Resolves locals.user via the supabase->legacy
  // bridge so all downstream Turso-keyed loads + org auto-activation work.
  // Leaves locals.session unset (no Better Auth session row); the (app) layout
  // load resolves org from `member` by user.id and guards the session update.
  if (privateEnv.AUTH_PROVIDER === 'supabase' && env.AUTH_DISABLED !== 'true') {
    if (!path.startsWith('/api/metrics/')) {
      const bridged = await resolveSupabaseUser(event);
      if (bridged) {
        const db = getDb();
        event.locals.user = {
          id: bridged.id,
          email: bridged.email,
          displayName: bridged.displayName,
          role: bridged.role,
          supabaseId: bridged.supabaseId,
        };
        // Seed tenantCtx from first org membership (keyed by legacy id).
        const [m] = await db
          .select({ orgId: member.organizationId })
          .from(member)
          .where(eq(member.userId, bridged.id))
          .limit(1);
        if (m?.orgId) {
          event.locals.orgId = m.orgId;
          event.locals.tenantCtx = { db, tenantId: m.orgId };
        }
      }
      // fall through to the shared redirect/fallback logic below
      if (event.locals.user || path.startsWith('/api/')) {
        // skip the Better Auth getSession block entirely
        return resolveSupabaseAuthed({ event, resolve });
      }
    }
  }
```

> Implementation note: rather than the inline `resolveSupabaseAuthed` shim above, the cleaner structure is to wrap the **shared tail** of `appHandle` (the `API_UNAUTH_FALLBACK_PATHS` handling + the `/login` redirects + `return resolve(event)`) into a local function and call it from both the Supabase branch and the Better Auth branch. Refactor `appHandle` so its tail (everything from `// For API routes: unauthenticated fallback` onward) is a function `finishApp({ event, resolve })`, then both branches call `return finishApp({ event, resolve })`. This avoids duplicating the redirect logic. Add `member` to the existing `@minion-stack/db/schema` import.

- [ ] **Step 3: Refactor the shared tail into `finishApp`**

Extract the block starting at `// For API routes: unauthenticated fallback ...` through the final `return resolve(event);` of `appHandle` into:

```typescript
const finishApp: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  // ... (moved verbatim: API_UNAUTH_FALLBACK_PATHS handling, unauth 401,
  //      /login redirect-in for unauth, redirect-away-from-/login for authed)
  return resolve(event);
};
```

Then the Better Auth branch ends with `return finishApp({ event, resolve });` and the Supabase branch likewise.

- [ ] **Step 4: Typecheck**

Run: `cd minion_hub && bun run check`
Expected: no new errors.

- [ ] **Step 5: Run hub unit tests (no regressions)**

Run: `cd minion_hub && bun run test`
Expected: existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks.server.ts
git commit -m "feat(auth): hub flag-gated supabase session branch (legacy-id bridge)"
```

---

## Task 6: Login button + OAuth callback

**Files:** Create `minion_hub/src/routes/auth/callback/+server.ts`; modify hub login page

- [ ] **Step 1: Locate the hub login page**

Run: `find minion_hub/src/routes -path '*login*' -name '+page.svelte'`
Expected: the hub login route path (e.g. `src/routes/(app)/login/+page.svelte` or `src/routes/login/+page.svelte`). Use that exact path in Step 3.

- [ ] **Step 2: Write `src/routes/auth/callback/+server.ts`**

```typescript
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { supabaseServer, supabaseAdmin } from '$server/supabase';
import { syncGoogleLogin } from '$server/auth/identity-sync';
import { sealSecret } from '@minion-stack/db/pg';

export const GET: RequestHandler = async (event) => {
  const code = event.url.searchParams.get('code');
  const next = event.url.searchParams.get('next') ?? '/';
  if (!code) throw redirect(303, '/login?error=missing_code');

  const supabase = supabaseServer(event);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) throw redirect(303, '/login?error=exchange_failed');

  const session = data.session;
  await syncGoogleLogin(supabaseAdmin(), sealSecret, {
    user: data.user as never,
    providerRefreshToken: session.provider_refresh_token ?? null,
    providerScope: (session as { provider_scope?: string }).provider_scope ?? null,
  });

  throw redirect(303, next);
};
```

- [ ] **Step 3: Port `identity-sync.ts` to the hub**

The hub needs the same post-login sync as the site. Copy `minion_site/src/lib/server/identity-sync.ts` → `minion_hub/src/server/auth/identity-sync.ts` (adjust the import to `@minion-stack/db/pg` which the hub now has). Copy its test too: `minion_hub/src/server/auth/identity-sync.test.ts`. Run:

`cd minion_hub && bun run vitest run src/server/auth/identity-sync.test.ts` → Expected: PASS (2 tests).

> Note: this duplicates the site's `identity-sync`. Acceptable for now; a future refactor can hoist it into `@minion-stack/auth`. (DRY deferred — not worth a package release mid-cutover.)

- [ ] **Step 4: Add the flag-gated Google button to the hub login page**

In the hub login `+page.svelte` (path from Step 1), add (Svelte 5 runes):

```svelte
<script lang="ts">
  import { env as publicEnv } from '$env/dynamic/public';
  import { supabaseBrowser } from '$lib/supabase/client';
  const SUPABASE_AUTH_ENABLED = publicEnv.PUBLIC_AUTH_PROVIDER === 'supabase';

  async function signInWithGoogleSupabase() {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
        scopes: 'email profile',
      },
    });
  }
</script>

{#if SUPABASE_AUTH_ENABLED}
  <button type="button" onclick={signInWithGoogleSupabase}>Continue with Google (Supabase)</button>
{/if}
```

(Match the hub's existing button styling classes.)

- [ ] **Step 5: Typecheck**

Run: `cd minion_hub && bun run check`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/auth/callback/+server.ts src/server/auth/identity-sync.ts src/server/auth/identity-sync.test.ts "<hub login page path>"
git commit -m "feat(auth): hub supabase google login + callback + identity sync"
```

---

## Task 7: Layout-load robustness for Supabase users

Confirm `(app)/+layout.server.ts` works when `locals.session` is undefined (Supabase users have no Better Auth session row).

**Files:** Modify `minion_hub/src/routes/(app)/+layout.server.ts` (only if needed)

- [ ] **Step 1: Verify the session-update guard**

Read the org-activation block. The session-table update is already guarded by `if (locals.session?.id)`, so Supabase users (no `locals.session`) skip it — good. Confirm no other code dereferences `locals.session` unconditionally. If any does, guard it with `locals.session?.`.

- [ ] **Step 2: Confirm tenant seeding**

For Supabase users, `hooks` already seeded `locals.tenantCtx` from `member` (Task 5). The layout's fallback (`if (!locals.session?.activeOrganizationId || !locals.tenantCtx)`) still runs the membership lookup; ensure it does not throw for a user WITH a membership but no session. It uses `user.id` (= legacy id) → matches `member` rows. No change expected.

- [ ] **Step 3: Typecheck + commit (if changed)**

Run: `cd minion_hub && bun run check` → Expected: clean. Commit only if a guard was added:
```bash
git add "src/routes/(app)/+layout.server.ts"
git commit -m "fix(auth): guard layout load for supabase sessions (no better-auth session row)"
```

---

## Task 8: E2E verification (flag on, dev)

No new code — verify the cutover against real Supabase.

- [ ] **Step 1: Start hub with the flag on**

```bash
cd minion_hub && AUTH_PROVIDER=supabase PUBLIC_AUTH_PROVIDER=supabase bun run dev
```
(Ensure `.env.local` has the Supabase keys + `TURSO_DB_URL`/`TURSO_DB_AUTH_TOKEN` so the data loads work.)

- [ ] **Step 2: Log in via Google (Supabase) as a migrated user**

Open the hub dev URL → login → "Continue with Google (Supabase)" with `nikolas.pinon98@gmail.com` (admin, has a migrated profile + legacy_user_id + org membership) → expect to land on the dashboard with agents/hosts/permissions loaded (proving the legacy-id bridge resolved Turso data).

- [ ] **Step 3: Confirm bridge correctness**

In the dashboard, confirm admin-only UI is present (role=admin came from `profiles`, bridged). If you get a 403 "No organization membership", the legacy_user_id→member link is missing — check `select * from member where user_id = '<legacy id>'` in Turso.

- [ ] **Step 4: Confirm rollback**

Restart without the flag (`bun run dev`) → Better Auth login still works.

---

## Task 9: Flip the default to Supabase

Once Task 8 passes, make Supabase the default per the directive.

**Files:** Modify `minion_hub/.env.example`, hub deploy env (Vercel), and `minion_site` `.env.example` + deploy env.

- [ ] **Step 1: Flip hub defaults**

In `minion_hub/.env.example` set `AUTH_PROVIDER=supabase` and `PUBLIC_AUTH_PROVIDER=supabase`. Set the same in the hub's Vercel project env. (Better Auth remains available by setting the flag back to `better-auth` on a self-hosted deploy.)

- [ ] **Step 2: Flip site defaults**

Same in `minion_site/.env.example` + site Vercel env. NOTE: the site `/members` data layer still reads Turso via the better-auth `user` table keyed by id — confirm the site's load also bridges via `legacy_user_id` (the site's hooks set `locals.user.id` to the **supabase uuid**, not the legacy id). If the site has Turso-keyed member-area loads, port the same bridge (Task 3/5) to the site BEFORE flipping its default. If the site members area only uses Supabase data, no bridge needed.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(auth): default AUTH_PROVIDER=supabase (better-auth = self-hosted fallback)"
```

---

## Self-Review

- **Spec coverage:** hub authenticates via Supabase (Tasks 2,3,5,6 ✓); Better Auth stays as fallback (flag-gated, default-off until Task 9 ✓); existing Turso multi-tenant load flow reused via `legacy_user_id` bridge (Tasks 3,5,7 ✓); login UI + callback + identity sync (Task 6 ✓); Supabase default per directive (Task 9 ✓); gateway-token path explicitly out of scope (next plan). 
- **Placeholder scan:** none — all code steps are complete. The one structural instruction (Task 5 `finishApp` refactor) is concrete: extract the named tail block and call it from both branches. Task 6 Step 1/3 require locating the hub login path + copying identity-sync — exact commands given.
- **Type consistency:** `ProfileRow`/`BridgedUser`/`mapProfileToUser`/`resolveSupabaseUser` defined Task 3, consumed Task 5; `supabaseId` added to locals Task 4, set Task 5; `syncGoogleLogin`/`sealSecret` reused from the site/`@minion-stack/db/pg` Task 6.
- **Risk flagged:** Task 9 Step 2 — the **site** currently bridges to the Supabase uuid, not the legacy id; before flipping the site default, confirm whether the site members area needs the same legacy-id bridge (it will, if it reads Turso `user`-keyed data). The hub plan handles the hub; the site may need a parallel bridge task.
- **Dependency note:** This plan does NOT depend on Phase 2 — the legacy-id bridge lets the hub run on Supabase while still reading Turso. Phase 2 (data → Postgres) and the gateway JWKS/token path remain separate follow-on plans.
