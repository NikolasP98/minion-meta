---
phase: 09-security-containment
plan: 03
subsystem: auth
status: verification_pending
tags: [tenant-authority, server-url, onboarding]
requires: [09-01]
provides:
  - No global-organization fallback at hook and reusable tenant helper boundaries
  - No-tenant onboarding enrollment redirect
  - Server update URL policy parity before persistence
  - Actual hook-to-handler and real URL guard regression fixtures
affects: [server-management, onboarding, tenant-scoped-api]
tech-stack:
  added: []
  patterns: [explicit tenant authority, handler-owned authentication]
key-files:
  created:
    - minion_hub/src/hooks.tenant.test.ts
    - minion_hub/src/server/auth/tenant-ctx.test.ts
    - minion_hub/src/routes/onboarding/page.server.test.ts
  modified:
    - minion_hub/src/hooks.server.ts
    - minion_hub/src/server/auth/tenant-ctx.ts
    - minion_hub/src/routes/api/servers/[id]/+server.ts
    - minion_hub/src/routes/api/servers/[id]/server.test.ts
    - minion_hub/src/routes/onboarding/+page.server.ts
key-decisions:
  - A user, admin role or orgId alone cannot construct tenant authority.
  - Existing public and separately authenticated handlers receive no fabricated tenant.
  - No-tenant onboarding redirects to existing enrollment before provisioning.
  - Supplied server URLs use the creation guard; omitted URLs preserve token-only updates.
requirements-completed: []
requirements-addressed: [SEC-07, SEC-02, SEC-03]
completed: 2026-09-09
---

# 09-03 — Tenant fallback and server URL containment

The two global-organization fallbacks are removed. Actual hook-to-server POST tests now deny verified users without a tenant before persistence. Onboarding redirects those users to `/join`, and server PUT validates supplied URLs using the existing creation policy. The admitted source work and scoped tests are complete; parent typecheck and independent verification remain pending. No root state or requirement status was changed.

## Admission and source identity

Parent admitted plan hash `c85a737f...dc6215d` and granted the eight exact source/test files in 09-03 plus this summary before source edits. Native plan structure had passed four tasks. Hub stayed on `feat/level-2026-07-30`, HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`. Existing hooks instrumentation and unrelated dirty/staged work were preserved. No branch, worktree, stash, commit, dependency, provider, production database or deployment action occurred.

Final source SHA-256 at worker handoff:

| Path under Hub | SHA-256 |
|---|---|
| `src/hooks.server.ts` | `c7b76e8476f57a671cc0dcd5fd63b4bd61593eb2b5d34ed580fb35f8a16a8470` |
| `src/server/auth/tenant-ctx.ts` | `997c0108912b268c4feac2ad9d637841b99c4533af9c9a3d3a215a131a4b8488` |
| `src/routes/api/servers/[id]/+server.ts` | `db291dcdaa64182012a251b25cabb9be6362de41b421f6d7231df545b5b0b91c` |
| `src/routes/onboarding/+page.server.ts` | `b7bb99b03e7c9fe4775831f367b7dba229831c9749a67f5228f7f83ab2fcc02a` |

Hashes identify the shared local source, not a released tree.

## Behavior and blast radius

`getTenantCtx` returns the existing identity-resolved context or null. It no longer imports a DB client or Supabase admin client and never chooses an organization. AI usage attribution occurs only with a resolved context. `getOrCreateTenantCtx` retains its 403 denial. Direct fixtures confirm that empty locals, an orgId alone and an admin user alone do not construct authority.

The hook retains the existing exact/prefix exceptions for public and separately authenticated APIs, plus existing internal/cron/password-auth dispatch. Those handlers receive an absent tenant unchanged; they own their authentication. Unexempted APIs return 401 without a user or 403 for an authenticated user without a tenant. Resolved-tenant requests retain central capability checks. This closes the reported actual POST path while avoiding a new public-route authentication design.

The helper also feeds `getCoreCtx`, `requireCoreCtx` and server-scoped context consumers. They now return their existing null/authorization errors when identity has no tenant rather than accessing a globally selected organization. Existing resolved browser/server-token contexts are unchanged. Identity provider verification, preferred membership selection, cache behavior and AUTH_DISABLED are outside this change.

`/onboarding` now sends a verified no-tenant user to `/join` before agent lookup/provisioning, gateway linking, host loading or channel identity reads. The hook permits both GET and POST invite enrollment and the join-request endpoint without injecting authority. Join request selection still creates only the existing pending application; invitation consumption remains under its existing service checks. No membership grant or default enrollment target changed.

PUT retains authentication, resolved tenant and server-link/admin checks before reading the update. A supplied URL must be a string and pass `assertSafeUrl`; violations return the same fixed 422 response as POST. An omitted URL preserves token-only updates. Public HTTP/HTTPS/WS/WSS, operator-authorized `.ts.net` and explicit Tailscale CGNAT opt-in controls pass. A supplied unchanged URL is validated again. Existing fixed 500 credential diagnostics remain intact. No shared URL policy or DNS behavior changed, and no outgoing SSRF exploit is claimed.

## Red-green evidence

- Tenant hook/helper: after correcting the fixture to open SvelteKit's required request store, **11 failed / 10 passed** against original source. The actual exported hook sequence plus actual POST, actual requireAuth and actual tenant helper accepted verified no-tenant users and returned 200 before the fix. Public/join paths also received invented context, and the direct helper returned the synthetic unrelated org. The initial 20-failure run lacked framework request-store setup and is not treated as defect evidence.
- Onboarding: **1 failed / 2 passed** before changing the redirect, then green. The failed expectation specifically distinguished `/join` from the old `/login` redirect.
- URL policy: **11 failed / 10 passed** before PUT validation. Seven negative cases reached persistence/200; four public URL positive cases demonstrated the guard/DNS check was not called. The first post-change run passed **21/21**; a later linked-nonadmin positive was added.
- Initial tenant/onboarding green: **3 files / 24 tests**. Expanded GET/POST invite controls were added afterward.
- Final combined focused and nearby suite: **11 files / 109 tests passed**. Scoped Prettier check passed all eight files; scoped `git diff --check` passed.

The hook fixture uses the actual SvelteKit sequence and request store, with no-op tracing/telemetry and an injected identity-provider output. It does not mock the tenant helper or requireAuth and does not perform a login. Persistence is intercepted before any database write. The URL tests execute the real guard with DNS stubbed and isolated environment settings; no outgoing request occurs. The direct PUT/DELETE no-tenant controls import the actual helper. Enrollment dispatch fixtures do not claim to run a real invite acceptance; the existing join service suites provide nearby authorization coverage.

## Commands and retained logs

From `minion_hub`:

```sh
bun run vitest run src/hooks.tenant.test.ts src/server/auth/tenant-ctx.test.ts src/server/auth/resolve-identity.test.ts src/routes/api/servers/server.test.ts 'src/routes/api/servers/[id]/server.test.ts' src/routes/onboarding/page.server.test.ts src/server/services/join/requests.service.test.ts src/server/services/join/links.service.test.ts src/server/services/join/membership.test.ts src/server/services/ssrf-guard.test.ts src/server/services/server.service.test.ts
```

Result: 11 files / 109 passed, 2.52 seconds Vitest duration. Final session `17387` completed and was collected. Logs under `/tmp/minion-360-2026-09-09/`:

- `09-03-tenant-red.log`, `09-03-tenant-green.log`
- `09-03-onboarding-red.log`
- `09-03-url-red.log`, `09-03-url-green.log`
- `09-03-nearby-green.log`

All worker runner sessions have been collected; none remain active. Parent was sent the new files for its final Hub typecheck, which this worker did not duplicate.

## Standards review

Changes stay within admitted ownership, preserve the real authorization boundary and use existing URL policy rather than a second validator. No new package, `any`, ts-nocheck, raw credential diagnostics or tenant lookup fallback was added. The runtime fixture models only framework/external seams and records its limits. Formatting and focused checks pass. Root owns final full-project checks and the existing proposal ledger.

## Spec review and remaining limits

SV-01 and SV-03 are contained at the admitted source boundaries and covered by meaningful negative/positive controls. SEC-07 is addressed; SEC-02/03 protections remain covered nearby. These results do not establish production identity correctness, fresh membership revocation under deployed caches, native PostgREST/RLS behavior, every route's own authentication, historical credential cleanup or released behavior.

Legacy server persistence and migration authority remain separate root-led review work: `updateServer` deliberately relies on its caller's link/admin authorization during the tenant-ID migration. A preliminary upsert-ID concern was corrected after reading its conflict target; no upsert IDOR is claimed. This slice does not redesign that authority/migration model. No new unresolved source implementation was left within the admitted boundaries; broader catalog/documentation/runtime limits remain in the parent-owned proposal and phase verification gates.
