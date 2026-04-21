# AUTH-04 Staging Verification Results

**Status:** PRE-FLIGHT BLOCKED — CI failures must be resolved before merging PRs and running full staging tests.
**Decision:** NOT-YET — blocked on pre-merge CI fixes (two fixable issues, details below)

---

## Deploy SHAs (at time of pre-flight scan — 2026-04-21)

| App | Branch | HEAD SHA | Target Branch |
|-----|--------|----------|---------------|
| minion_hub | feature/auth-consume-factory | `6e1eb4b` | dev |
| minion_site | feature/auth-consume-factory | `7391dd9` | master |

PRs are open but NOT merged (gated on Task 1 acceptance criteria).

---

## Vercel Preview URLs (already deployed — both apps running on feature branches)

| App | Preview URL | Status |
|-----|-------------|--------|
| minion-hub | `https://minion-hub-git-feature-auth-consume-54454c-nikolasp98s-projects.vercel.app` | Deployed (READY) |
| minion_site | `https://minionsite-git-feature-auth-consume-252a57-nikolasp98s-projects.vercel.app` | Deployed (READY) |

Both previews are live: `/api/auth/session` returns HTTP 401 (app running, not 404 or 500).

---

## Pre-Flight Check Results

### Check 1: CI status (required to merge PRs)

| PR | CI Status | Failure | Fix Required |
|----|-----------|---------|--------------|
| Hub PR #19 | FAIL | `src/lib/auth/auth.ts:20:4` — `Type 'string | undefined' is not assignable to type 'string'` on `secret: env.BETTER_AUTH_SECRET` | Add `?? ''` fallback: `secret: env.BETTER_AUTH_SECRET ?? ''` (same fix applied in site PR #5 during plan 06-03) |
| Site PR #5 | FAIL | Prettier check fails on `src/lib/auth/auth.ts` — indentation/formatting mismatch | Run `prettier --write src/lib/auth/auth.ts` in minion_site and push |

**Hub paraglide errors** (`Cannot find module '$lib/paraglide/runtime'`) are PRE-EXISTING in the base `dev` branch — confirmed to be unrelated to the auth change (present in all recent CI runs). Per RESEARCH.md memory ref: `reference_sveltekit_paraglide_ci_gotcha` — SvelteKit + paraglide CI must run codegen before svelte-check. This is a pre-existing CI infra issue, not caused by our PR.

### Check 2: Vercel preview health

| Endpoint | Hub | Site |
|----------|-----|------|
| `/api/auth/session` (HTTP status) | 401 (PASS) | 401 (PASS) |

Both apps boot and serve auth routes correctly despite CI check failures (Vercel deploys on push regardless of CI status).

**Note on JWKS endpoint access:** `/api/auth/jwks` returns a Vercel SSO redirect for unauthenticated curl requests due to Vercel Preview deployment protection. Cannot test JWKS parity from outside without a bypass token. This is a Vercel SSO configuration concern, not an app issue.

### Check 3: Secret parity (CANNOT VERIFY without user action)

`BETTER_AUTH_SECRET` parity between hub and site staging deployments **cannot be confirmed** by the executor agent — requires:
- Infisical CLI: `infisical secrets list --projectId <minion-core-id> --env staging | grep BETTER_AUTH_SECRET`
- OR Vercel dashboard: compare masked digest of `BETTER_AUTH_SECRET` in both projects' environment variable screens

Per RESEARCH.md: both apps are expected to pull `BETTER_AUTH_SECRET` from Infisical `minion-hub` project (Assumption A1). Verification is a required blocking pre-flight gate per Task 1.

---

## Task 2 Smoke Test Results

NOT EXECUTED — Task 1 acceptance criteria not met (CI failures block merge).

Once CI is fixed and PRs are merged, the following tests should be run. Refer to the plan for exact commands.

### Prerequisites for Task 2

The Vercel preview URLs are on separate domains (`*.vercel.app`) — NOT a shared apex domain. Per RESEARCH.md Q4 (Pitfall 4 / Assumption A2):

> "If hub and site are on different Vercel preview URLs (e.g., hub-xxx.vercel.app + site-xxx.vercel.app): These are different domains entirely — cross-subdomain cookie sharing CANNOT work."

**Expected Task 2 outcome for Step 3 (cross-app session):** The curl-based cookie jar test (`-b hub-cookies.txt $SITE/api/auth/session`) WILL work via API (curl does not enforce browser domain scoping), so the test will validate that the shared DB + shared secret causes session rows to be mutually recognized. The shared-session architecture works by construction per RESEARCH.md Q5.

**Browser-based cross-domain session sharing:** Will NOT work on Vercel preview URLs — requires `crossSubDomainCookies` config + shared apex domain. This is expected and documented as a `GO-WITH-CONFIG-CHANGE` scenario per the plan.

---

## Go/No-Go Decision

**BLOCKED** (not yet ready for go/no-go)

Preconditions not met:
1. Hub PR #19 CI must pass — fix: `env.BETTER_AUTH_SECRET ?? ''` in `minion_hub/src/lib/auth/auth.ts:20`
2. Site PR #5 CI must pass — fix: `prettier --write src/lib/auth/auth.ts` in `minion_site/`
3. Both PRs must be merged to their integration branches
4. Secret parity must be confirmed via Infisical CLI or Vercel dashboard
5. Task 2 smoke tests must be run against merged staging branches

**Anticipated decision after fixes:** `GO-WITH-CONFIG-CHANGE` — session sharing works by construction via shared DB + shared secret; cross-subdomain browser cookie sharing is not available on Vercel preview URLs but is a known configuration item for Plan 06-05 production deploy (add `crossSubDomainCookies: { enabled: true, domain: 'minion.pe' }` to both apps' auth factories OR pass as env-driven factory param).

---

## Required Fixes Before Merging (exact changes)

### Fix 1: Hub auth.ts — TypeScript strict-mode type error (introduced by plan 06-02)

File: `minion_hub/src/lib/auth/auth.ts`, line 20

```diff
- 			secret: env.BETTER_AUTH_SECRET,
+ 			secret: env.BETTER_AUTH_SECRET ?? '',
```

Rationale: Hub's CI environment does not have `BETTER_AUTH_SECRET` available at type-check time. The ambient.d.ts in CI does not declare it as `string` (only as `string | undefined`). The `?? ''` empty-string fallback is correct: Better Auth will reject an empty secret with a clear error message at runtime if the env var is truly missing, which is the correct behavior. This is identical to the fix applied in plan 06-03 for the site.

### Fix 2: Site auth.ts — Prettier formatting

File: `minion_site/src/lib/auth/auth.ts`

Run in `minion_site/`:
```bash
bun run prettier --write src/lib/auth/auth.ts
```

Then push to the `feature/auth-consume-factory` branch on `NikolasP98/minion-site`.

---

## AUTH-04 Requirement

This document is the AUTH-04 staging evidence log. AUTH-04 staging half will be marked complete when:
- [x] Pre-flight CI failures identified with exact fixes
- [ ] CI fixes pushed and PRs re-run CI successfully
- [ ] Both PRs merged to integration branches
- [ ] BETTER_AUTH_SECRET parity confirmed
- [ ] Task 2 smoke tests run (Steps 1-7) with outputs recorded
- [ ] Go/no-go decision finalized (anticipated: GO-WITH-CONFIG-CHANGE)
