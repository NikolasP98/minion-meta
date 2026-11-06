---
id: 2026-10-03-readiness-hub-fresh-authority-spec
title: Fresh Hub request authority
stage: dev
pass: 2
updated: 2026-10-03
repos: [minion_hub]
tags: [security, test]
type: fix
status: implementing
verdict: approved
created: 2026-10-03
owner: root-orchestrator
proposal: 2026-10-02-hub-gateway-production-readiness-recon
---

# Fresh Hub request authority

## 0. Product

Hub request authorization must use current membership and profile records so revocation takes effect on the next request. This slice covers HS-003.

## Out of scope

Changing identity providers, membership product policy, browser authentication UX and production deployment are outside this slice.

## AS-IS

HS-003: `resolveViaSupabase` returns a cached complete identity for 60 seconds.
Membership deletion, platform-role downgrade and token expiry can therefore be
ignored on a cache hit. `resolveSupabaseTenant` silently chooses a different
organization when an explicit cookie no longer names a membership. Removing the
cache alone would expose that fallback to mutations intended for the removed org.
The apparent Turso membership fallback in `resolve-identity.ts` is already a no-op
in `tenant.ts`; its comments are stale, and it must not be described as a current
legacy authorization bypass.

## TO-BE

Every browser request verifies its access token and reads current canonical role
and memberships. Supabase's signature/JWKS implementation retains its own key
cache; resolved authorization is not cached. An explicit unavailable organization
resolves no tenant, so API writes cannot switch organizations implicitly. App page
loads may recover to a current membership and clear the stale selection; this
navigation unmounts the old page. The active-org endpoint can still select an
allowed organization. Database failures preserve valid authentication cookies
and propagate as failures. AUTH_DISABLED and gateway machine-token paths retain
their existing contracts in this slice.

## DELTA

1. Remove the process identity cache and redundant dev-login cache invalidation.
2. Resolve canonical user and tenant for every request; remove the obsolete
   Turso no-op branch and misleading comments.
3. Make preferred organization resolution strict. Keep alphabetical default only
   when there is no explicit selection. Let the request hook recover only on GET/HEAD app-page
   navigation before module guards run, preventing a join/home redirect loop for a remaining member.
4. Test the actual request resolver through canonical SQL on disposable PGlite
   and signed claims: revoke membership, downgrade role, expire token after an
   initial success, reject forged tokens, unavailable directory, multi-org
   selection, no memberships and recovery. Keep login/active-org regressions.
5. Run focused tests, full typecheck, and independent blast-radius review. No
   production directory rows or credentials are changed.

## Review passes

Pass 1: authentication, current profile authority, strict tenant selection and
machine-token path isolation. Pass 2: multi-org mutation routing, page recovery,
DB outage cookie preservation, dev impersonation and removal of orphan cache
code. Independent implementation review remains required.


## Verification

Run the behavior and failure-path checks in DELTA against actual handlers or runtime boundaries. Record focused test receipts and independent review in the readiness ledger. Full typecheck, native runtime acceptance, hosted CI, merge and deployment remain separate qualification gates.
