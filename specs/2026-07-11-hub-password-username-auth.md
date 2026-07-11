# Hub: Password auth + username login + account Security page

**Date:** 2026-07-11 · **Repo:** `minion_hub/` (branch `dev`) · **Status:** APPROVED — execution in progress

## Goal

1. Every user (including OAuth-only users) can add/change a **password** and a unique **username** from the `/account` page.
2. **Login accepts username OR email** + password.
3. **Password reset** flow (forgot password) with the email sent **via Resend** (not Supabase SMTP).
4. `/account` gets the shared **SideNav** secondary sidemenu with a **"Sign-in & security"** section.

Acceptance (end-to-end): the OAuth-only Google account `nikolas.pinon98@gmail.com` sets a username + password in `/account/security`, signs out, and signs back in with `username + password` and with `email + password`. Forgot-password email arrives via Resend and completes a reset.

## Ground truth (verified 2026-07-11)

- Auth = **Supabase GoTrue only** (`PUBLIC_AUTH_PROVIDER=supabase`, project `gxvsaskbohavnurfvshr`). Better Auth is retired.
- `/login/+page.svelte` already does client `signInWithPassword({ email, password })` + `signUp` + Google OAuth. **Email-only** today.
- Server clients: `src/server/supabase.ts` → `supabaseServer(event)` (SSR cookie client, anon key) and `supabaseAdmin()` (service role). Admin API already used in `src/server/services/user.service.ts` (`createUser`, `deleteUser`, `updateUserById`).
- `profiles` columns today: `id, email, display_name, role, avatar_url, alias, role_id, account_type, created_at, updated_at`. **No `username`.** (`alias` = chat @mention handle, admin-managed — do NOT reuse it for login.)
- PG migrations: add SQL file to `supabase/migrations/`, applied by `scripts/db-migrate.ts` (`FORCE_DB_MIGRATE=1 bun run db:migrate` locally; `vercel-build` runs it in prod). Ledger = `public.hub_migrations`.
- Identity resolution: `hooks.server.ts` → `resolve-identity.ts` → `supabase-bridge.runtime.ts` (`getClaims` + `profiles` select **with a `42703` fallback** that survives missing columns). `locals.user = { id, email, displayName, avatarUrl, role, supabaseId, createdAt }`, `id === supabaseId`.
- Self-serve profile updates: `PATCH /api/me` → `updateSupabaseProfile()` in `src/server/services/supabase-credential.ts:230`. ProfileCard saves displayName this way then `invalidate('app:user')`.
- Resend already wired: `src/server/services/email.service.ts` (`getResend()`, `RESEND_API_KEY`, `RESEND_FROM`, dark-theme inline-HTML templates, graceful no-op when key unset).
- No reset/recovery/forgot code exists anywhere. No `admin.generateLink` usage yet.
- Section nav pattern: shared `src/lib/components/ui/SideNav.svelte`; per-module wrapper (see `FinanceNav.svelte`, 30 lines) + module `+layout.svelte` (see `finances/+layout.svelte`, 9 lines: `<FinanceNav /> <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">{@render children()}</div>`).
- `/account` is NOT in `ROUTE_VIEW_PERMS` — ungated by design (self-serve). No RBAC wiring needed for its subpages.
- Unauth-reachable prefixes (`hooks.server.ts:109`): `/login`, `/api/`, `/auth/`, … — new login/reset routes need no allowlist changes.
- i18n: Paraglide, `messages/en.json` + `es.json`, `bun run i18n:compile` after adding keys. Account page currently hardcodes strings — new strings MUST use `m.*()`.

## Design decisions

- **Username** = new `profiles.username` column, stored **lowercase**, format `^[a-z0-9](?:[a-z0-9._-]{1,30})[a-z0-9]$` (3–32 chars, alnum edges), uniqueness via unique index on the column (values are already normalized to lowercase before write). Must not contain `@` (disambiguates from email at login). Reject usernames that equal another user's email local-part? No — YAGNI; `@` rule is enough.
- **Login** goes through ONE new server endpoint for password sign-in (`POST /api/auth/password-login`) handling both email and username. Server-side because username→email resolution must never leak the email to the client (enumeration/mapping leak). The SSR client (`supabaseServer(event)`) sets the session cookies on the response; the browser client picks them up (cookie storage via `@supabase/ssr`).
- **Set vs change password**: one endpoint `POST /api/me/password`. `hasPassword` = admin `getUserById(supabaseId)` → `identities` contains provider `email`. If hasPassword → `currentPassword` required and verified (server-side `signInWithPassword` against a throwaway non-persisting anon client). Then `admin.updateUserById(supabaseId, { password })` in both cases.
  - ✅ E2E-VERIFIED (2026-07-11, project gxv): after `updateUserById({password})` on an OAuth-only user, `signInWithPassword` succeeds — but GoTrue does NOT create an `email` identity. Therefore `hasPassword` must NOT be derived from the identities list (it would stay false forever); the shipped check reads `auth.users.encrypted_password` directly via the runtime PG client (`getCoreDb()`), failing closed on error.
- **Forgot password**: `POST /api/auth/forgot-password { identifier }` (email or username). Always 200 (no enumeration). If the user exists: `admin.generateLink({ type: 'recovery', email })` → take `properties.hashed_token` → email a link to **our own page** `{origin}/auth/reset?token_hash=<hashed_token>` via Resend (do NOT email GoTrue's `action_link`; token_hash + `verifyOtp` is the documented SSR pattern and avoids redirect-allowlist coupling). Origin for the emailed link = `hubBaseUrl()` from `src/server/config/urls.ts` (`event.url.origin` only in `dev`) — deriving it from the request Host header would enable password-reset poisoning.
- **Reset page** `/auth/reset` (REVISED post-security-review): the `load` must NOT call `verifyOtp` — the recovery token is single-use and email link-scanners GET the URL before the user clicks, which would consume the token (and hand the scanner a session). Instead: `load` only checks the `token_hash` param is present; the new-password form submits to `POST /api/auth/reset-password { tokenHash, newPassword }`, which does `verifyOtp` + `updateUser` + `signOut({ scope: 'others' })` in one server call. Success → signed-in redirect to `/`. Invalid/expired token → error state with link back to `/login/forgot`.
- **Security-review hardening (all shipped)**: `hasPasswordIdentity` fails closed and reads `encrypted_password` (not identities); password change and reset revoke all other sessions (`signOut({ scope: 'others' })`); rate-limit keys are `ip:identifier` (identifier-only = victim-lockout DoS); reset-link origin from `hubBaseUrl()` (Host-header poisoning).
- **Password policy**: min 8 chars, max 72 (bcrypt). Client + server enforced. No complexity rules (YAGNI).
- **Rate limiting** on `password-login` + `forgot-password`: tiny in-memory limiter (per identifier, 5 attempts / minute, plain `Map` with timestamps). `// ponytail: in-memory, per-lambda; move to Valkey if abuse ever matters.`
- **Account IA** (3 nav items, all under existing ungated `/account`):
  - **Profile** `/account` — ProfileCard (existing).
  - **Connections** `/account/connections` — ConnectedIdentities + SharedInboxes + ChannelLinking (moved; the identities/sharedIdentities load moves with them).
  - **Sign-in & security** `/account/security` — username card + password card.
- posthog: `password-login` success on the login page fires the existing `user_signed_in` capture with `method: 'password'`.

## Work packages

### WP1 — Migration + username plumbing (server)

1. `supabase/migrations/20260711T<hhmmss>_profiles_username.sql`:
   ```sql
   alter table public.profiles add column if not exists username text;
   create unique index if not exists profiles_username_key on public.profiles (username);
   ```
   Apply locally with `FORCE_DB_MIGRATE=1 bun run db:migrate` (hits the shared gxv DB; prod `vercel-build` will then find it already applied via the `hub_migrations` ledger — that is the normal flow).
2. `src/server/services/supabase-credential.ts` `updateSupabaseProfile`: accept `username` in the patch (already-validated, lowercase). On PG unique violation (`23505` on `profiles_username_key`) throw a typed error the API maps to 409.
3. `PATCH /api/me` (`src/routes/api/me/+server.ts`): accept optional `username`; validate with the regex above (after `trim().toLowerCase()`); `''`/`null` clears it. 409 → `{ error: 'username_taken' }`. GET `/api/me` returns `username`.
4. `supabase-bridge.runtime.ts` profile select: add `username` to the full select (the `42703` fallback keeps pre-migration environments alive); `mapProfileToUser` in `supabase-bridge.ts` + `BridgedUser` type gain `username: string | null`; thread into `locals.user` shape (`resolve-identity.ts`) so `/api/me` GET and page loads can read it.
5. Server-side username validation helper lives in ONE place (e.g. `src/server/auth/username.ts`, ~10 lines: `normalizeUsername(raw): string | null`) — used by `/api/me` PATCH and `password-login` lookup.

### WP2 — Auth endpoints + reset email (server)

1. `POST /api/auth/password-login` (`src/routes/api/auth/password-login/+server.ts`):
   - Body `{ identifier: string, password: string }`. No auth required.
   - Rate limit per normalized identifier (see decisions).
   - `identifier.includes('@')` → email = identifier. Else normalize as username, `supabaseAdmin().from('profiles').select('email').eq('username', u).single()` → email; not found → **same generic 401** `{ error: 'invalid_credentials' }` as a bad password.
   - `supabaseServer(event).auth.signInWithPassword({ email, password })` → cookies set on response. Success → `{ ok: true }`. Failure → 401 `{ error: 'invalid_credentials' }`.
2. `POST /api/me/password` (`src/routes/api/me/password/+server.ts`):
   - `requireAuth(locals)`; needs `locals.user.supabaseId`.
   - Body `{ currentPassword?: string, newPassword: string }`. Validate newPassword length 8–72.
   - `admin.auth.admin.getUserById(supabaseId)` → `hasPassword = identities?.some(i => i.provider === 'email')`.
   - If `hasPassword`: `currentPassword` required; verify via a fresh `createClient(PUBLIC_SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: currentPassword })` → wrong → 400 `{ error: 'wrong_password' }`.
   - `admin.auth.admin.updateUserById(supabaseId, { password: newPassword })` → `{ ok: true, hadPassword: hasPassword }`.
3. `POST /api/auth/forgot-password` (`src/routes/api/auth/forgot-password/+server.ts`):
   - Body `{ identifier }`. Rate-limited. Resolve to email (same logic as login; usernames via admin lookup). Whether or not a user exists → 200 `{ ok: true }`.
   - If exists: `admin.auth.admin.generateLink({ type: 'recovery', email })` → `data.properties.hashed_token` → `sendPasswordResetEmail(email, `${event.url.origin}/auth/reset?token_hash=${hashed_token}`)`.
4. `sendPasswordResetEmail(to, link)` in `email.service.ts` — clone the existing template style (dark, brand pink, single CTA button, "expires in 1 hour, ignore if you didn't request this").
5. `GET /account/security` server data: `+page.server.ts` returns `{ username, email, hasPassword }` (`hasPassword` via the same `getUserById` identities check).

### WP3 — Login page + reset pages (UI)

1. `/login/+page.svelte`:
   - Sign-in mode: email field becomes **"Email or username"** (`type="text"`, `autocomplete="username"`). Sign-up mode keeps `type="email"`.
   - Sign-in submit → `fetch('/api/auth/password-login', { identifier, password })`; on ok → existing `enterApp('password')`. 401 → existing invalid-credentials error. Sign-up flow unchanged (client `signUp`).
   - Add **"Forgot password?"** link (right-aligned under the password field) → `/login/forgot`.
2. `/login/forgot/+page.svelte` (reuses the login card styling): one "Email or username" input → POST `/api/auth/forgot-password` → always show "If an account exists, a reset link is on its way to its email."
3. `/auth/reset/+page.server.ts` + `+page.svelte`: load verifies `token_hash` via `verifyOtp` (see decisions); success → new-password + confirm form → browser `supabase.auth.updateUser({ password })` → success notice → `goto('/')`. Failure/expired → error + link to `/login/forgot`. Route is under `/auth/` so it is already unauth-reachable.
4. All new strings via Paraglide (`login_forgot*`, `reset_*` keys in `messages/en.json` + `es.json`), then `bun run i18n:compile`.

### WP4 — /account restructure + Security page (UI)

1. `src/lib/components/users/AccountNav.svelte` — copy FinanceNav shape: items Profile (`/account`, exact match), Connections (`/account/connections`), Sign-in & security (`/account/security`); icons `UserRound`, `Link2`, `ShieldCheck` (lucide-svelte); no `canViewPath` filtering needed (ungated). Header `m.account_nav_header()`.
2. `src/routes/(app)/account/+layout.svelte` — clone `finances/+layout.svelte` with AccountNav.
3. Split routes:
   - `/account/+page.svelte` → ProfileCard only (its `+page.server.ts` shrinks to `userId` + auth check).
   - `/account/connections/+page.{svelte,server.ts}` → ConnectedIdentities + SharedInboxes + ChannelLinking + the identities/sharedIdentities load (moved verbatim from the old `+page.server.ts`, keep `depends('app:identities')` etc.).
   - `/account/security/+page.{svelte,server.ts}` → data `{ username, email, hasPassword }` (WP2.5).
4. Security page UI (match existing card style used by ProfileCard):
   - **Username card**: current username or "not set"; text input + Save → `PATCH /api/me { username }`; inline validation error (format / 409 taken); helper line "You can sign in with your username or email." On success `invalidate('app:user')`.
   - **Password card**: if `hasPassword` → Current password / New password / Confirm; else → "Add a password to sign in without Google" + New/Confirm. Submit → `POST /api/me/password`; map `wrong_password`; on success show toast/notice and (if it was a set) flip to change-mode via `invalidate`.
5. i18n keys `account_nav_*`, `account_security_*`; `bun run i18n:compile`.

## Testing & verification gate

- `bun run check` → 0 errors/warnings (hard gate; repo is fully green).
- Focused vitest for: username normalization helper; password-login endpoint logic (username→email resolve + generic 401); `/api/me` PATCH username validation. Follow existing service-test patterns; mock `supabaseAdmin`. **Do NOT run the full gateway test suite; hub `bun run test` is fine.**
- E2E (browser, local dev server against shared Supabase): set username+password on the real Google-only account, sign out, sign in with username+password AND email+password, run a forgot-password roundtrip.

## Out of scope

- Site (`minion_site/`) login — separate Better Auth stack, untouched.
- Username display anywhere outside /account (mentions keep using `alias`).
- Email change, 2FA, session management UI (future Security-page tenants).
- Durable rate limiting (Valkey) — in-memory only, noted in code.
