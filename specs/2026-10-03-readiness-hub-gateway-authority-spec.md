---
id: 2026-10-03-readiness-hub-gateway-authority-spec
title: Hub credentials and workshop admission authority
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion]
tags: [security, data, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Hub credentials and workshop admission authority

## 0. Product

Implement the Hub dependencies of GW-002, GW-003 and GW-006 without breaking shared gateways or historical text workshop IDs. All findings were explicitly authorized by the user. Human merge and release gates remain.

## 1. AS-IS

At Hub 7ac3bfd, gateway JWT assignments are selected only by user ID, and tokens have no JTI. The JWT response lacks no-store. Gateway workshop rooms trust a guessed save ID. Hub workshop saves are organization-shared records; profile_id is audit metadata. Gateway channel hydration explicitly supports accounts from several organizations on one physical gateway. Existing sessions metadata is user-writable and therefore cannot prove ownership of gateway transcripts.

## 2. TO-BE

Every issued JWT has a distinct random JTI and contains only the user's active-organization agent assignments. Issuer, audience, EdDSA signature and one-hour expiry stay stable. JWT HTTP responses are no-store.

A new read-only GET /api/internal/workshop/saves/[id]/authority requires the machine bearer, x-minion-server-id, and x-minion-user-jwt. The Hub validates JWT signature, issuer, audience, expiry, JTI and matching subject/user ID. It re-reads canonical gateway credentials and current membership; neither cached metrics authentication nor legacy database fallback provides admission authority.

The authenticated machine must belong to the signed organization, have a channel assignment to it, or have a same-URL assignment alias whose credential also matches the bearer. A user_gateway link alone grants nothing. Membership, gateway relation and exact save owner are checked in one SQL snapshot. An administrator collaborating in an organization uses the same ownership check. Legacy unscoped saves require explicit ownership qualification.

Historical save IDs remain text, including slash, percent and Unicode. The gateway URL-encodes one segment; the installed SvelteKit router must decode to the exact original once. The gateway's existing 128-character room limit bounds the 119-character save suffix.

Every response is no-store. Missing/invalid credentials return 401, missing membership/relation 403, wrong-org/missing save 404, and unavailable canonical dependencies 503. No database failure becomes an empty result or success. The new forwarded JWT header is removed from Sentry error and transaction request headers.

## 3. DELTA

### Slice 1: JWT issuance and dual-credential authority

**Topics:** `security`, `data`, `test`

1. Tenant-constrain assignment selection through the server join; mint random JTI; no-store JWT response.
2. Add small credential/relation repository and authorization service. Restrict candidate credential rows to the hinted machine URL before decryption, preserving aliases and avoiding unrelated corrupted keys.
3. Add the exact internal authority route and exact identity-middleware bypass; the route independently proves both credentials. Cookie sessions never substitute.
4. Add Sentry header scrubbing for the new secret, with immutable case-insensitive behavior tests.
5. Exercise actual EdDSA signatures, real PostgreSQL query fixtures, current credential/member revocation, shared gateway and alias semantics, wrong-org/admin denial, dependency failure and real installed-router text-ID compatibility.

## 4. Out-of-scope

Gateway room binding and durable session ownership are the gateway security workstream. User-writable Hub session rows must not be elevated to an authorization source. No production records, migrations, signing keys or configuration are changed by local tests.

## 5. Verification

Focused Vitest suite with PGlite actual SQL, real JWT verification and installed SvelteKit router. Full Hub check and independent final code/blast-radius review follow. Gateway contract integration must accept the same HTTP statuses and identifiers, deny before Yjs reads, and preserve client room encoding.

Release order: Hub issuance/authority first; allow the previous one-hour no-JTI tokens to expire or prove a forced refresh; only then enable strict gateway JTI validation. Local test success is not deployment proof.
