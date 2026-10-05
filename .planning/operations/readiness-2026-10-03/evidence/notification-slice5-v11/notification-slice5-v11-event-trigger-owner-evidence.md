# Slice5 v11 existing trigger-owner evidence

This receipt covers one implementation seam only: Slice5 must replace the body of the existing
`public.notification_event_enqueue()` function, which Slice3 owns with the inaccessible
`notification_event_trigger` role. It does not qualify the complete Slice5 migration.

## AS-IS failure

The unchanged QA bootstrap and production migration runner were executed against a new loopback-only
container using pinned image
`public.ecr.aws/supabase/postgres@sha256:21ab971149317ea9cd12a8126fe4ebb34def08c8972956b0958cba0924409dab`.
PostgreSQL reported `170006`; `postgres` was `NOSUPERUSER CREATEROLE`. Migrations through
`20261003160000` committed. Slice5 rolled back before its ledger insertion with:

```text
must be owner of function notification_event_enqueue
```

The function remained owned by `notification_event_trigger`. The complete persistent owner graph
contained only the platform row `(target=notification_event_trigger, member=postgres,
grantor=supabase_admin, ADMIN=true, INHERIT=false, SET=false)`. PostgreSQL reported both `SET=false`
and `USAGE=false` for `postgres`.

## Proven mechanism

The fixed bridge `notification_projection_owner_bridge` is created once with both memberships in the
same statement:

```sql
CREATE ROLE notification_projection_owner_bridge
  NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION
  IN ROLE notification_event_trigger
  ROLE <exact migration actor>;
```

The migration snapshots the complete preexisting owner graph and function owner, ACL,
`SECURITY DEFINER` flag, fixed empty search path, definition, and `public` schema ACL. It grants the
existing owner schema `CREATE`, follows the bridge with `SET LOCAL ROLE notification_event_trigger`,
replaces the exact function body, resets the role, immediately revokes schema `CREATE`, and drops the
bridge. It never directly grants the inaccessible owner to the actor.

The exact focused temporary graph was four rows on Supabase PostgreSQL 17 and two rows on plain
PostgreSQL 18. The v11 contract combines this with the separately reviewed finalizer bridge, yielding
the required six-row PostgreSQL 17 and three-row PostgreSQL 18 migration graph.

## Results

- **PostgreSQL 17.6:** committed replacement passed; function owner, ACL, security flag, search path,
  schema ACL and persistent owner graph were preserved. The bridge was absent after commit and the
  actor retained neither SET nor USAGE. An exception injected after replacement restored the exact
  prior function, schema ACL and graph.
- **PostgreSQL 18.6:** the same committed replacement and injected rollback passed. The superuser
  actor was not used as a denial oracle; the ordinary `anon` role proved SET and USAGE denial. The
  disposable child database and global fixture role were removed.
- **Cleanup:** the PG17 container was removed with its anonymous data volume and loopback port 55472
  was unbound. No production, shared, or application data was used.

The machine-readable receipt is `notification-slice5-v11-event-trigger-owner-evidence.json`, SHA-256
`a62cacec663d57ebad3ca8c506aa2b441a14360e23c3b3c043c10e60dd5a48e2`. The v11 author spec is
`spec-notification-slice5-audience-projection.md`, SHA-256
`425eb193f6cf86f3f27b721a474362653f8133602f108e8ee374bc07b1268fe6`.

## Remaining implementation gate

The real `20261003170000` migration must implement one combined bridge, admit the exact combined
temporary and persistent graphs, preserve the actual enqueue function metadata, transfer the three
new finalizer functions, and pass the production runner plus mutation-native matrix on both supported
PostgreSQL majors. These focused proofs do not claim that gate is complete.
