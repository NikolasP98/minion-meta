---
id: 2026-09-16-hub-minion-run-dev-switcher-spec
title: "`minion run hub [--prd]`: host dev server on the containerized seeded backend, DEV-only user switcher in the avatar menu, explicit PRD mode"
stage: dev
status: implementing
pass: 1
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub, minion-meta]
tags: [infra, auth, ui, test]
type: infra
---

# `minion run hub [--prd]` — DEV backend by default, PRD on request, switch users without re-login

**Owner brief (verbatim, 2026-09-16):**

> I want the local "minion run" command to start a dev server with the containerized dev backend/db. A flag like "--prd" should run the local frontend connected to the production backend. A peculiarity of running the test backend should be that the database is pre-seeded (like it does now) and allows the user via a custom "local dev" ui to switch between existing users, to test what the UI looks like for each of the seeded users. Remember, this only applies to the local dev backend. The UI should adjust and detect the mode (DEV v PRD) and the user can be switched from the top-right profile/avatar menu.

> all features work as normal, like creating new users, managing stock etc; its just this custom user switcher feature that works on the DEV backend. Let me know if my request is ambiguous at any point of the proposal to clear up any of these doubts

**Owner decisions (2026-09-16, asked and answered before this spec):**

1. `--prd` = the local SvelteKit app (server code included) reading and writing the **production** Supabase database and gateway, i.e. today's `bun run dev` with `.env.local`, plus a loud PRD banner. Not a proxy to `hub.minion-ai.org`.
2. The switcher offers **every user in the DEV database** (seeded personas and users created during the session), grouped by org and role.
3. Switching is **instant and password-less**: a DEV-only server endpoint issues a session for the chosen user. It answers 404 unless the app is running against the local QA database.
4. The command lives in `@minion-stack/cli` as `minion run hub [--prd]`, reusing the hub's `qa:*` scripts.

## 0. Product

`minion run hub` starts the Hub the way a developer wants it during the day: the backend (local Supabase Postgres + GoTrue, production schema, fully seeded, migrations applied by production's own runner) runs in containers, the SvelteKit dev server runs on the host with hot reload, and the profile menu in the top-right corner shows a **DEV** badge and a **Switch user** entry. Picking a user there swaps the session instantly, no password, and the whole app re-renders as that person: nav, module gates, RBAC, POS, stock. Everything else behaves exactly as in production, because it is the same code on the same schema; users you create in the session appear in the switcher too. `minion run hub --prd` runs the same local app against the production backend, shows a **PRD** badge, and has no switcher: the endpoints that power it do not exist unless the database is on loopback.

## 1. Why it is built this way (recon facts that shaped the design)

- **The hub authenticates with Supabase Auth (GoTrue), not Better Auth.** Better Auth was removed in `6227f3b1`; `src/lib/auth/*` is gone and the repo's `CLAUDE.md` is stale on this. Sessions are GoTrue cookies (`sb-*-auth-token`, chunked) written by `@supabase/ssr`'s `createServerClient` in `src/server/supabase.ts`. There is no app-level `createSession`. A switch therefore has to produce a real GoTrue session for the target user.
- **GoTrue can mint a session for any user without their password.** `supabaseAdmin().auth.admin.generateLink({ type: 'magiclink', email })` returns a `hashed_token`; `supabaseServer(event).auth.verifyOtp({ token_hash, type: 'magiclink' })` exchanges it for a session and writes the cookies through the same `setAll` path the password login uses. The old session's cookies are replaced, which is the desired effect.
- **Identity is a pure function of two cookies.** `resolveIdentity(event)` derives `locals.user` from the GoTrue session and `locals.tenantCtx` from the `active_org` cookie (`resolveSupabaseTenant` falls back to the user's first org when the preferred org is not theirs). RBAC (`resolveCapabilities`), module availability and route guards all hang off those two locals, so a switched session cascades through the entire permission surface with no extra state. Two in-process caches are keyed by access token + org (identity, 60 s) and org + profile (RBAC, 2 min); a new token and a different profile naturally miss both. The `active_org` cookie must be cleared on switch so the target lands on their own first org rather than the previous user's org.
- **`listUsers()` is org-scoped.** `user.service.ts` lists members of the caller's active org only. The switcher needs every user, so it reads `auth.admin.listUsers()` joined with `profiles` and `organization_members` (with `organizations.name` and `member_roles.role_key`), the same way the QA seed enumerates users.
- **The QA stack already produces the backend.** `scripts/qa/up.ts` does `supabase start` → `db-bootstrap` (fails closed on pending migrations) → seed → `.env.qa` → `docker compose up` (app in a container on :5199) → TTL. The new command reuses the first four steps unchanged and replaces the fifth with a host dev server. `.env.qa` already carries `PUBLIC_SUPABASE_URL=http://127.0.0.1:54421` and `SUPABASE_DB_URL=…127.0.0.1:54422…`.
- **The only reliable "which backend am I on" signal is the database URL.** Nothing in the shell reads `$app/environment` or `PUBLIC_*` today. `PUBLIC_VERCEL_ENV` is absent locally in both modes. Deriving the mode from whether `SUPABASE_DB_URL` and `PUBLIC_SUPABASE_URL` point at loopback cannot be spoofed by a flag and is false in every deployed environment.
- **The CLI already has `run`.** `minion run <id> <cmd...>` is a passthrough (`packages/cli/src/commands/run.ts`) with no options; `minion <id> <cmd...>` is an alias that bypasses Commander's option parsing. Subprojects are resolved from `minion.json` (key `hub`, `path: minion_hub`), not from `repo-policy.yaml`. `<cmd...>` must become optional so `minion run hub` means "run the registered default".

## 2. Architecture

```
minion run hub            minion run hub --prd
      │                          │
      ▼                          ▼
minion.json hub.commands.run   hub.commands["run:prd"]
= "bun run dev:local"          = "bun run dev"
      │                          │
      ▼                          ▼
scripts/qa/dev.ts              vite dev (.env.local → PROD Supabase)
  supabase start (if needed)          │
  db-bootstrap (0 pending gate)       │
  seed (idempotent)                   │
  env.ts → .env.qa                    │
  stop app container if it holds :5199│
  vite dev --env-file .env.qa :5199   │
  arm TTL for the supabase stack      │
      │                              │
      ▼                              ▼
   hooks.server.ts: locals.backend = isDevBackend() ? 'dev' : 'prd'
   (app)/+layout.server.ts: page.data.env = { backend, local: dev }
      │                              │
      ▼                              ▼
Topbar badge DEV (accent)       Topbar badge PRD (danger, only when local)
ProfileMenu "Switch user…"      (no entry; /api/dev/* → 404)
  GET  /api/dev/users
  POST /api/dev/switch-user
```

### 2.1 Backend mode (`src/server/dev-backend.ts`)

```ts
export function isDevBackend(env = process.env): boolean
// true iff BOTH PUBLIC_SUPABASE_URL and SUPABASE_DB_URL are set and their hosts are
// loopback (127.0.0.1, ::1, localhost). Anything else — missing, hosted, LAN — is 'prd'.
```

Evaluated once per process (`const DEV_BACKEND = isDevBackend()`), exposed as `locals.backend: 'dev' | 'prd'` by `hooks.server.ts` and as `page.data.env = { backend, local: import.meta.env.DEV }` by `(app)/+layout.server.ts` and the login page load, so the shell can render before login too. The client never decides the mode.

### 2.2 DEV-only endpoints (`src/routes/api/dev/`)

Both handlers begin with `if (locals.backend !== 'dev') throw error(404)` and require an authenticated session (`locals.user`), any role. They are not in `apiWriteCapability`'s table (no org capability applies: this is a developer tool, not a tenant action) and are excluded from the route-access registry the same way `/api/me` is. JSON POST bypasses SvelteKit's form CSRF check, so the switch handler also verifies `Origin`/`Sec-Fetch-Site` is same-origin.

- `GET /api/dev/users` → `{ users: [{ id, email, displayName, username, platformRole, orgs: [{ orgId, orgName, orgKind, roleKey }] }] }`, sorted by org name then role rank then name, capped at 500. Source: `supabaseAdmin().auth.admin.listUsers({ perPage: 500 })` + `profiles` + `organization_members` + `member_roles` + `organizations`. Users with zero orgs are included (the `no-org` persona must be reachable: it exercises `/join`).
- `POST /api/dev/switch-user { userId }` → `generateLink({ type: 'magiclink', email })` with the service-role client, `verifyOtp({ token_hash, type: 'magiclink' })` with the request-scoped client so the cookies are written, delete the `active_org` cookie, `invalidateCachedIdentity` for the old token, respond `{ ok: true, user: { id, email } }`. 404 if the user id is unknown. Rate-limited like `password-login` (per ip) to keep the pattern, even though it only exists locally.

### 2.3 Shell UI

- `Topbar.svelte`: an environment badge next to the profile menu. `DEV` uses the accent semantic token; `PRD` uses the danger token and renders only when `page.data.env.local && backend === 'prd'` (never on Vercel, where `local` is false). Tooltip names the Supabase host.
- `ProfileMenu.svelte`: when `backend === 'dev'`, a **Switch user…** item above "Sign out" opens a `DevUserSwitcher` component (Zag dialog or the existing `Sheet`), which fetches `/api/dev/users` on open, groups by org (a "No organization" group last), shows name, email, role badge, marks the current user, filters with a text box (Fuse.js is already a dependency; plain `includes` is enough). Selecting a user POSTs the switch and then `location.assign('/')` so every load function re-runs against the new cookies (`invalidateAll()` is not enough: the layout's identity is also cached per token server-side and the org cookie changed).
- `/login` in DEV mode shows a one-line hint with the seed password source (`.env.qa.local`) and no switcher: a session is needed before switching, and the first login is a real login on purpose.
- i18n: new keys in `messages/en.json` and `messages/es.json` (`env_badge_dev`, `env_badge_prd`, `env_badge_prd_hint`, `profile_switch_user`, `dev_switcher_title`, `dev_switcher_search`, `dev_switcher_no_org`, `dev_switcher_current`, `login_dev_hint`). Paraglide compile is part of `bun run dev`/`build`; CI's svelte-check catches a missing key.
- Design governance: semantic tokens only, `bun run lint:design && bun run lint:tokens` must not increase debt; the `ui-design-governance` skill applies.

### 2.4 Host dev server (`scripts/qa/dev.ts`, `bun run dev:local`)

Reuses `up.ts`'s helpers (`assertLoopbackIfSet`, supabase start/status, bootstrap, seed, env) and then: if the compose app container holds :5199, `docker compose -f docker-compose.qa.yml stop hub`; run `bun --env-file=.env.qa run dev -- --port 5199 --strictPort` in the foreground with the Vite env isolated from the developer's `.env.local` (Vite loads `.env.local` automatically; the script passes `--mode qa` and the hub's `vite.config.ts` gains an `envDir`/`envPrefix`-safe guard so a `.env.local` with production values cannot leak into DEV mode. If that proves intrusive, the script exports the `.env.qa` values into the child's environment, which wins over any file). Prints the URL, the personas file, the TTL deadline. Arms the TTL exactly as `qa:up` does (`--ttl`), so the Supabase stack still tears itself down; Ctrl-C stops only the dev server. `--no-seed`, `--fresh`, `--ttl` are passed through.

`bun run dev` (used by `--prd`) is unchanged. `docs/qa-stack.md` and `CLAUDE.md` gain a "Day-to-day: `minion run hub`" section and the correction that auth is Supabase GoTrue.

### 2.5 CLI (`@minion-stack/cli`)

- `minion.json` schema: `commands.run` and `commands["run:prd"]` become recognized optional keys. Hub row: `run: "bun run dev:local"`, `"run:prd": "bun run dev"`.
- `run <id> [cmd...]` with `.option('--prd', 'run the registered production-backend command instead of the default')`: no `cmd` → run `commands.run` (or `commands["run:prd"]` with `--prd`); missing key → clear error naming the key. `cmd` given with `--prd` → error ("--prd only applies to the registered default"). The `minion <id> <cmd...>` alias keeps its passthrough behavior; `minion hub` alone (no cmd) resolves the registered default too, and `minion hub --prd` is recognized there by a one-line argv check before forwarding.
- Env: the CLI's 6-layer merge still applies to the child process. In DEV mode `dev.ts` overrides the Supabase keys from `.env.qa` after that merge, so a developer's `.env.local` production values never reach a DEV run. In PRD mode nothing changes.
- Changeset (`minor`) for `@minion-stack/cli`; README command table updated.

## 3. Development process contract

- The switcher and the badge are driven by `locals.backend`. Any new dev-only affordance must gate on the same field, never on `import.meta.env.DEV` alone (a local run against production is `local && prd`).
- `/api/dev/*` handlers must start with the 404 guard; a unit test enumerates the directory and asserts every `+server.ts` imports `requireDevBackend`.
- The seed's persona list is the switcher's minimum content; `seed.contract.test.ts` gains a case asserting every `tenancy.user.*` appears in `/api/dev/users` (run inside the CI `qa-stack` job, which has the live local stack).

## 4. Slices

| Slice | Repo / branch | Content | Gate |
|---|---|---|---|
| S1 server | hub `feat/dev-backend-switcher-server` | `dev-backend.ts`, `locals.backend`, `page.data.env`, `/api/dev/users`, `/api/dev/switch-user`, identity-cache invalidation, unit tests (guard, listing shape, switch happy path with mocked GoTrue), CI `qa-stack` smoke (login as owner → switch to viewer → `/api/me` returns viewer → `/pos/sell` 403) | `bun run check`, targeted vitest, prettier on changed files |
| S2 UI | hub `feat/dev-backend-switcher-ui` (after S1 merges or rebased on it) | Topbar badge, ProfileMenu item, `DevUserSwitcher.svelte`, login hint, i18n en/es, design lint | `bun run check`, `lint:design`, `lint:tokens`, svelte-autofixer |
| S3 host dev script | hub `feat/qa-host-dev-server` | `scripts/qa/dev.ts`, `dev:local` script, env isolation from `.env.local`, docs | `qa:up`-style e2e on the machine: `bun run dev:local` reaches `/en/login` 200 with DEV badge |
| S4 CLI | meta `feat/cli-run-default-prd` | schema keys, `run` default + `--prd`, alias handling, changeset, README | `pnpm --filter @minion-stack/cli test`, `pnpm run ci` subset |
| S5 verification | QA agent | `minion run hub`: switch through owner/manager/staff/viewer/custom-role/two-orgs/no-org, screenshots of nav + `/pos/sell` + `/stock` per user; create a user in-session and switch to it; `minion run hub --prd` shows PRD badge and `/api/dev/users` → 404 (checked against the local server only, no prod writes) | report in `qa-report/dev-switcher/` |

## 5. Out of scope

- Switching users on a deployed environment of any kind, including previews. The endpoints do not exist there.
- Impersonation audit trails, "return to my user" stacks, or admin impersonation in production.
- A switcher on the login page (first login stays a real login with the seed password).
- Proxying the local UI to the deployed production server.
- Windows/macOS support for the host dev script beyond what `qa:up` already has (the compose file is `network_mode: host`, Linux only).

## 6. Verification

- Unit: `isDevBackend` truth table (loopback both / one hosted / missing); guard test that every `/api/dev/*` handler is gated; listing groups and sorts; switch clears `active_org` and calls `verifyOtp` with the generated token.
- CI (`qa-stack` job, live local Supabase): password login as owner → `POST /api/dev/switch-user` viewer → `GET /api/me` is viewer → `GET /en/pos/sell` 403/302 → switch back to owner → 200. Against a non-loopback env (`PUBLIC_SUPABASE_URL=https://example.invalid` in the unit env) both endpoints 404.
- Manual on this machine (S5): the seven-persona walkthrough above with screenshots; `--prd` run shows the PRD badge and no switcher entry; `bun run dev:local` with a `.env.local` that contains production values still connects to 127.0.0.1 (assert in the script's startup log).
- Production after merge: `/api/dev/users` and `/api/dev/switch-user` return 404 on `hub.minion-ai.org` (smoke in the post-merge check).

**Verification:** the CI smoke plus the S5 walkthrough are the acceptance evidence; the spec moves to `status: done` when both are recorded in the linked proposal's follow-up section.
