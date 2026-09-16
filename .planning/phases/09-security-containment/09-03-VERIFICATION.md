---
phase: 09-security-containment
plan: "03"
verified: 2026-09-09T05:46:00Z
status: gaps_found
slice_status: passed
slice_score: 6/6 plan truths verified
requirements_verified_in_scope: [SEC-07, SEC-02, SEC-03]
requirements_completed: []
gaps:
  - truth: "The complete Phase 09 security goal is fulfilled on the supported runtime."
    status: partial
    reason: "This review verifies tenant inference removal and URL policy parity only. Existing flow confinement/CRUD and cross-project release gates remain outside this slice."
    artifacts:
      - path: .planning/phases/09-security-containment/09-04-PLAN.md
        issue: "SEC-08 requires its own source and independent verification."
      - path: .planning/phases/09-security-containment/09-SOURCE-VERIFICATION.md
        issue: "The whole-phase findings and production boundary are not superseded by this slice pass."
    missing:
      - "Consolidated phase acceptance including all admitted security slices and exact-runtime qualification."
---

# Phase 09, slice 03: Independent verification

**Phase goal:** Assistant and flow requests cannot gain unauthorized data or write authority, and server diagnostics do not expose credentials.

**Result:** All six 09-03 truths pass at the inspected local candidate. This is not a full-phase or deployment certificate. The existing phase-wide and source-verification reports remain authoritative for remaining findings.

## Observable truths

| Plan truth | Result | Evidence |
|---|---|---|
| Verified users without a tenant cannot mutate a globally selected organization's server | Verified | Actual exported hook sequence and actual POST use real `requireAuth` and tenant helper. Both member/admin no-tenant cases throw403 before upsert; anonymous POST throws401; localized route is covered. PUT/DELETE invoke the real helper in their denial controls. |
| Shared helper never discovers an organization or trusts orgId alone | Verified | `tenant-ctx.ts` imports no DB/admin client; returns only `locals.tenantCtx` or null. Tests reject empty locals, orgId alone and admin user alone without lookup or attribution. |
| Explicit resolved authority survives | Verified | Actual hook→POST preserves the same context for member/admin; missing write capability still denies a resolved-tenant business mutation. Linked nonadmin and admin URL-update positives remain. |
| Public and independently authenticated dispatch gets no fabricated tenant | Verified | Hook preserves exact/prefix exceptions plus internal/cron/password-auth routes. Fixture resolver sees absent tenant. Unexempted APIs return401 anonymous /403 authenticated without tenant. |
| No-org enrollment remains reachable and onboarding provisions nothing | Verified | GET/POST invite routes and join-request dispatch remain reachable. Actual onboarding load redirects303 to `/join` before any core DB, agent, gateway, host or identity operation; valid-context and active-agent positives pass. |
| Supplied URL updates use creation policy before persistence | Verified | PUT requires auth, tenant and link/admin before body/DNS; supplied URL must be a string and pass real `assertSafeUrl`. Six invalid/private inputs plus private DNS deny422 without update. Four public protocols and explicit private-network opt-ins pass; omitted URL preserves token-only updates. |

## Source and wiring

The identity provider remains the authority boundary. `resolveViaSupabase` verifies the user before resolving tenant context. `resolveSupabaseTenant` queries `organization_members` for that profile; preferred organization is selected only from that membership set. The surviving `resolveUserTenant` fallback is a no-op without an explicitly known active organization, so the inspected provider cannot recover a first-global organization through that path. Identity cache and explicit development/bearer bypass behavior were not changed or requalified.

`appHandle` applies the provider result then calls `finishApp` unless the provider explicitly bypasses that gate. `finishApp` no longer queries organizations or constructs DB context. Anonymous protected browser navigation retains its existing login redirect. Handler-owned API exceptions resolve unchanged locals; they are dispatch exceptions, not authority grants.

The actual create handler calls real authentication and required-tenant helpers before persistence. PUT/DELETE likewise require a tenant before entering mutation logic. URL validation runs after server-link authorization and before `updateServer`. Onboarding uses the nullable helper and redirects before building a PostgreSQL context.

GSD artifact verification passes4/4. All three key links were manually traced: hook→actual POST through `resolve(event)`; PUT→real `assertSafeUrl`; onboarding→real tenant helper→join redirect. The named tests exist, exercise public entrypoints and assert persistence was not called; they are not orphaned fixtures.

Level-4 visual data tracing is not applicable. The relevant request trace is verified identity output→locals→tenant helper→authorization→URL guard→intercepted persistence. Valid-path fixture writes are synthetic; no production writes occurred.

## Independent spot-checks

| Command from Hub | Result |
|---|---|
| `timeout 9s node node_modules/vitest/vitest.mjs run src/server/auth/tenant-ctx.test.ts 'src/routes/api/servers/[id]/server.test.ts' src/routes/onboarding/page.server.test.ts` | 29 tests /3 files passed in2.57s. |
| `timeout 9s node node_modules/vitest/vitest.mjs run src/hooks.tenant.test.ts src/server/auth/resolve-identity.test.ts` | 22 tests /2 files passed in2.64s. |
| Scoped `git diff --check` | Passed. |

Raw worker log `/tmp/minion-360-2026-09-09/09-03-nearby-green.log` independently inspected:109 tests /11 files passed. Raw root log `hub-after-09-03-check.log`: svelte-check0 errors,0 warnings. Whole-project check was not duplicated.

## Fixture limits and anti-pattern review

The hook test injects the identity-provider result; it does not perform Supabase login or validate a real JWT. It retains the actual SvelteKit request store/sequence, actual POST, actual authorization helper and actual tenant helper. It stubs unrelated service/telemetry boundaries and catches attempted persistence. The URL fixture uses the real guard with DNS stubbed. Enrollment dispatch does not claim actual invitation consumption; unchanged join service suites supply nearby coverage.

No new scoped blocker or placeholder implementation found. Fixed diagnostic messages avoid dumping request, token or caught DB error details. The shared SSRF guard policy itself is unchanged: validation before persistence does not pin future DNS or prove an outgoing-transport SSRF exploit is impossible. Existing server update record/link authority and legacy ID-only persistence are not redesigned by09-03; this pass specifically proves no-tenant denial and supplied-URL parity.

## Requirements and review axes

SEC-07 is directly addressed at the source/fixture boundary. SEC-02 and SEC-03 are related preserved authorization/diagnostic coverage; this review does not recertify the assistant-assignment path or all credential surfaces. All roadmap security criteria remain in scope of the phase, including assistant SQL, assignments and both flow SQL controls; none is considered complete merely because09-03 passes. SEC-08 remains a separately owned plan. No orphan requirement was introduced by this slice.

**Standards:** Pass within owned scope; no dependency, branch, worktree, source, live-data or release action by the verifier.

**Spec:**6/6 slice truths pass. No human action is required to accept these deterministic source behaviors. Authenticated real-browser enrollment, production assignment/cache selection and exact deployed patch identity remain operational acceptance gates, not fulfilled by mocked provider output.

## Candidate identity

Hub HEAD: `a25528b603dfe25f7ea9c0900d271060e5394f35`, with existing dirty work preserved.

| Source | SHA-256 |
|---|---|
| `src/hooks.server.ts` | `c7b76e8476f57a671cc0dcd5fd63b4bd61593eb2b5d34ed580fb35f8a16a8470` |
| `src/server/auth/tenant-ctx.ts` | `997c0108912b268c4feac2ad9d637841b99c4533af9c9a3d3a215a131a4b8488` |
| `src/routes/api/servers/[id]/+server.ts` | `db291dcdaa64182012a251b25cabb9be6362de41b421f6d7231df545b5b0b91c` |

Independent GSD verifier. Only this verification artifact was authored for09-03; no commit.
