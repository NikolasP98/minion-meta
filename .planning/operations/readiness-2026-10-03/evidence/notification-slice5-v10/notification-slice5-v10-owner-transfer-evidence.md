# Slice 5 v10 finalizer owner-transfer evidence

Date: 2026-10-03
Scope: disposable, loopback-only PostgreSQL role/function experiments; no application or production data.

## Environments

- Supabase PostgreSQL 17.6: `public.ecr.aws/supabase/postgres:17.6.1.106`, image ID
  `sha256:9ff6402f578a9b0d4f2aa31f660bd398b8e378761d61d31efda6ff9ad92408e5`, repository digest
  `public.ecr.aws/supabase/postgres@sha256:21ab971149317ea9cd12a8126fe4ebb34def08c8972956b0958cba0924409dab`.
  The uniquely named container `minion-s5-role-pg17-v10-20261003` published only
  `127.0.0.1:55472`, mounted no host path, and was removed after the proof.
- Plain PostgreSQL 18.6: the marked disposable local qualification database on loopback port 55461.
- PostgreSQL 17 migration actor: `postgres`, `NOSUPERUSER CREATEROLE`.
- PostgreSQL 18 migration actor: disposable qualification superuser `minion_qc`.

## Committed bridge result

The proof first creates the bridge and finalizer with initial memberships in one transaction. It
captures the complete temporary membership graph touching either role, then freezes the persistent
platform subset by excluding every edge whose member or target is the exact bridge. It transfers a
test function, revokes the finalizer's temporary schema `CREATE`, drops the bridge, and compares the
complete finalizer graph byte for byte with that frozen subset before commit.

After the committed transaction, both versions prove:

- the bridge is absent;
- the function owner is exactly the inaccessible finalizer;
- the finalizer has no schema `CREATE` privilege;
- a separately created restricted runtime role has neither `SET` nor `USAGE` on the finalizer;
- the complete finalizer graph still equals the frozen persistent subset.

PostgreSQL 17 retains exactly the platform-created edge
`target=notification_projection_final_receipt_v10, member=postgres, grantor=supabase_admin,
ADMIN=true, INHERIT=false, SET=false`. PostgreSQL 18 retains zero finalizer membership edges. The
proof commits that state, prints it, then removes the function and roles in a second committed
cleanup transaction. Both environments report zero remaining probe roles/functions.

The PostgreSQL 17 temporary graph is exactly four rows: actor-to-bridge granted by `postgres` with
`ADMIN=false, INHERIT=true, SET=true`; platform actor-to-bridge granted by `supabase_admin` with
`ADMIN=true, INHERIT=false, SET=false`; bridge-to-finalizer granted by `postgres` with
`ADMIN=false, INHERIT=false, SET=true`; and the matching platform actor-to-finalizer edge. The
PostgreSQL 18 graph is exactly the actor-to-bridge and bridge-to-finalizer rows, both granted by the
disposable actor, with no platform rows. The proof asserts those exact row counts and option tuples,
so an extra edge or a changed option fails before ownership transfer.

## Injected partial failure

A separate transaction creates both roles, creates the function, grants and then revokes schema
`CREATE`, and transfers ownership. It then raises the intentional
`notification_projection_injected_failure` before dropping the bridge. The explicit rollback leaves
the runtime role, bridge, finalizer, and function absent on PostgreSQL 17 and PostgreSQL 18. This is
the required partial-transfer rollback proof; it does not infer safety from the earlier backend
crash.

## Supersession

This v10 receipt supersedes the v9 bridge receipt for migration acceptance. The v9 artifacts remain
immutable evidence of the unsafe direct-grant crash and the initial bridge direction. V10 adds the
missing committed success, complete persistent-graph comparison, post-drop owner/schema/runtime
authority assertions, and injected partial-failure rollback.

Primary syntax references:

- PostgreSQL 17 CREATE ROLE: https://www.postgresql.org/docs/17/sql-createrole.html
- PostgreSQL 17 GRANT: https://www.postgresql.org/docs/17/sql-grant.html
- PostgreSQL 17 REVOKE: https://www.postgresql.org/docs/17/sql-revoke.html
- PostgreSQL 17 role attributes: https://www.postgresql.org/docs/17/role-attributes.html
