# @minion-stack/auth

## 0.4.0

### Minor Changes

- c530689: `createAuth` accepts an optional `provider: 'sqlite' | 'pg' | 'mysql'` param (default `'sqlite'`) passed through to the Better Auth drizzle adapter. Enables the Postgres Better Auth store for the Turso→Supabase cutover (Track B) — pass `provider: 'pg'` with a Postgres `db` + the `@minion-stack/db/pg` Better Auth schema. Backward compatible: existing callers omit it and keep sqlite.

## 0.3.0

### Minor Changes

- 1b961fb: Add `./client` subpath export with `createMinionAuthClient({ baseURL })` factory. Consolidates the identical Better Auth client setup previously duplicated in minion_hub and minion_site (Svelte adapter + `jwtClient` + `organizationClient` plugins).

  Usage:

  ```ts
  import { createMinionAuthClient } from "@minion-stack/auth/client";

  export const authClient = createMinionAuthClient({
    baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
  });
  ```

  No breaking changes — the existing server-side `createAuth` factory (default export) is unaffected.

## 0.2.0

### Minor Changes

- Initial release: `createAuth()` factory for Better Auth, shared between `minion_hub` and `minion_site`.
  Always composes the `jwt` plugin (EdDSA, audience=`minion-gateway`, issuer=baseURL) with identical
  defaults between consumers; callers supply app-specific `plugins` (organization + optional oidcProvider)
  and `hooks` (hub's onSignUp personal-agent provisioning). Factory does NOT call `organization()`
  internally — avoids duplicate plugin registration. peerDeps: `better-auth@1.4.19` (exact pin).
