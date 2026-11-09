---
id: 2026-10-09-notification-performance-qualification-spec
title: Preserve notification authority while reducing projection query cost
stage: done
status: shipped
pass: 3
verdict: approved
created: 2026-10-09
updated: 2026-10-09
repos: [minion_hub]
tags: [logic, security, data, test]
type: fix
proposal: 2026-10-09-performance-release-qualification
findings: [NOTIF-019]
---

# Notification performance qualification

This bounded amendment retains the approved Slice5 v11 audience-projection and
integrity-quarantine contracts. It does not enable producers, change catalog
integration flags, send notifications, or add browser inbox access. The owner's
9 October request authorizes qualified implementation and deployment; independent
review and safety gates remain mandatory.

## 0. Product

Notification audience projection must remain tenant-isolated and lease-fenced while avoiding repeated authority work for every recipient row. This amendment qualifies the query optimization as a staged compatibility release followed by a policy-only migration, with phase one retained as the rollback floor.

## AS-IS at qualification start

The staged NOTIF019 candidate rewrites six projection SELECT policies, pins JIT off
inside projection/revalidation transactions, scopes manager selection by organization,
and retains diagnostic driver error codes. The existing row-dependent VOLATILE
source-fence calls repeat work. Historical local query receipts show about 2,224 ms
before and 110 ms after; these do not establish production p99 or whole-request latency.
The predecessor source is Hub `14b3ec90`; qualification must use current master plus
the candidate, not that earlier tree.

## TO-BE and invariants

1. Authority source reads remain bounded to the exact organization and operation.
   Changing a per-row fence to an uncorrelated subquery must preserve authorization,
   including malformed/absent GUCs, wrong tenants, expired/replaced leases, and
   cancelled or changed recipients. Prove timing behavior; matching organization
   arguments alone is insufficient evidence for a VOLATILE-function rewrite.
2. Final publication retains fresh READ COMMITTED checks and canonical runtime,
   organization, and event row locks through commit. Revalidation retains its
   independent current-authority and expiry guarantees. Never remove these fences
   to satisfy a timing budget.
3. JIT changes are transaction-local and cannot leak to subsequent pooled borrowers
   after success, rollback, or error. Existing statement and lock timeouts remain.
4. Only the six reviewed SELECT policy expressions change. Relation/function owners,
   ACLs, unrelated policies, browser/service/app access, and membership graphs remain
   equivalent. Unsupported catalog kinds stay unsupported.
5. The migration is atomic, bounded by lock timeout, verifies its exact predecessor,
   and fails closed on unexpected catalog state. Qualify PostgreSQL 17 and 18 using
   their supported actors. No production experiment or production test fixture is required.
6. Diagnostic driver codes are bounded operational metadata. Error causes do not
   become user-facing SQL, credentials, or recipient data.
7. Compatibility admits either the complete reviewed predecessor catalog or the
   complete reviewed optimized catalog. Mixed, partially migrated, or otherwise
   altered catalogs remain rejected. Do not wildcard policy expressions or ignore
   fingerprint fields to permit a rolling deployment.

## DELTA and qualification

- Copy the staged diff into an isolated feature clone of current master; preserve
  the original clone/index. Track source SHAs and exact changed files.
- Run native migration pre/post catalog parity, authority negative cases, finalizer
  races, rollback, and limit tests on supported PostgreSQL versions. Existing
  security/concurrency assertions must not be weakened to obtain green tests.
- Explicit migration pairing must detect the new SQL file. A seed-unaffected
  exception is appropriate only if documented: policy/planner changes introduce no
  new fixture schema, and the existing native authority matrix exercises them.
- Measure the same representative fixture before/after where feasible and preserve
  plans plus timing boundaries. Do not claim production percentiles from local runs.
- Use a native barrier after initial scope admission to replace/expire a lease
  while authority reading is in progress; assert no durable candidate publication.
  A plan-string assertion or replacement before projection is not sufficient.
- Run repository typecheck, unit tests, build, and exact-head hosted gates. Independent
  standards and spec review must cover indirect callers and pooled transactions.

## Release and rollback

Use two independent releases, each qualified at its exact source:

1. Ship application-only JIT and organization-query corrections plus strict admission
   of both complete known catalogs. Do not include the SQL migration in this release.
   Verify production now runs this compatibility version against the predecessor
   catalog before advancing. Rollback to the original app remains safe at this stage.
2. Ship the reviewed policy migration and the narrowly scoped ordered identity-check
   correction only after the compatibility deployment is confirmed.
   Inspect the predecessor catalog read-only and record the application deployment.
   The normal Hub deployment runner applies the migration transactionally; do not
   use an ad hoc production SQL session. After deployment, verify source SHA,
   migration receipt, catalog admission and read-only health without generating sends.

If migration fails, confirm its transaction rolled back and preserve the prior
application deployment. After a successful migration the rollback target is the
qualified compatibility release from step 1, never the older original app.
Removing predecessor compatibility is deferred until a separately reviewed retirement
of that rollback boundary. A failed migration must retain the complete predecessor
catalog; the compatibility release accepts it without widening authority.

Independent pass 1 blocked release ordering and insufficient fence timing proof.
Pass 2 approved the corrected staged design. Exact implementation then passed
independent source review, native PostgreSQL 17/18 qualification, hosted gates,
and the bounded production verification recorded below.

## PostgreSQL 17 identity-check amendment

Read-only production receipts establish that the normal `postgres` actor is not
a superuser, has ordinary USAGE on auth and can evaluate `auth.uid()`, but has
neither schema USAGE WITH GRANT OPTION nor auth-owner membership. The worker has
EXECUTE on auth.uid but no auth-schema USAGE. A fixture that grants the worker
schema access or makes postgres a superuser would conceal the real boundary.
No auth schema grant, role elevation, new definer function or SQL-body substitute
for `auth.uid()` is part of the correction.

Every projection, revalidation and reconciliation transaction must execute these
ordered statements before authority reads:

1. Clear both request.jwt.claim.sub and request.jwt.claims under the authorized
   connection actor.
2. In a separate statement, evaluate real auth.uid() and require null.
3. Install the restricted worker role and exact scoped transaction settings.
4. In a separate statement, prove the expected current_user/current_role and
   exact cleared JWT/scope settings. Fail closed on any mismatch.

Do not rely on SELECT target-list evaluation order for either identity or role
proof. Native tests must include stale pooled JWT state, commit and rollback
reuse, wrong actor, reordered/missing clearing and non-null identity. Preserve
exact role membership, function metadata/ACL and auth relation privilege surfaces
before/after; no new table access follows from this application correction.
PG17 fixtures must use a non-superuser LOGIN postgres actor with production's
ordinary auth USAGE and no grant option/owner membership, with a separate
bootstrap/fixture owner where necessary. PG18 must retain its exact admitted
actor graph. Superuser fixture convenience is not production qualification.

Phase 1 is now deployed as 9e812b6f (deployment 6973768974). Read-only singleton
metadata proves the persistent notification worker has never started. After the
policy migration, phase 1 remains a compatible web-application rollback; it is
not a qualified worker-activation artifact. A later worker deployment must use
the ordered-identity fix and its own immutable minimum-artifact contract.
Worker activation remains NOTIF-003 and is not silently performed by this release.

At pass 3 design review, implementation/harness review and native/runtime receipts
remained pending. They subsequently passed independent source review, PostgreSQL
17/18 qualification and hosted gates. This amendment preserves the original
no-widening invariants.

## Production verification

Hub PR455 merged as `304a63a5b0d667696925cbbd26905ef5f1f37fd4` and its normal production deployment completed successfully on 10 October 2026. A bounded read-only PostgreSQL 17.6 check verified migration `20261007120000` and exact text equality for all six optimized policies. It also confirmed worker generation and admission remain zero and the worker has no access to the `auth` schema or its tables. This verifies the bounded application and SQL release only; the notification worker is not activated, and no live latency or production p99 claim is made.

## Out of scope

- Enabling the production notification worker or any notification producer.
- Changing recipients, provider sends, inbox access, or catalog integration flags.
- Claiming production latency or p99 from disposable database measurements.
- Broadening worker authentication, schema, relation, or role privileges.

## Verification

Run repository check/build gates and the complete disposable PostgreSQL 17 and 18 native lanes on the exact source. Prove both complete predecessor and optimized catalogs are admitted while mixed catalogs fail, lease replacement or expiry inside the authority statement yields zero durable candidates or receipts, and the staged migration pairs with its application release. Production verification is read-only catalog and admission metadata; it must not create sends or fixtures.
