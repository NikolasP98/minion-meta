# Disposable native PostgreSQL qualification substrate

Date: 2026-09-09. Docker socket access is unavailable and sudo requires interactive authorization. A temporary rootless PostgreSQL binary avoids that dependency for synthetic local tests. No system package, application dependency, production connection or data change occurred.

- Primary distribution: https://github.com/leinelissen/embedded-postgres ; platform package `@embedded-postgres/linux-x64@17.10.0-beta.17`.
- Runtime reports PostgreSQL17.10, major17 matches the observed production family but does not reproduce the exact17.6 patch or Supabase extensions/configuration.
- Registry integrity was verified before safe tar extraction; SHA-256 `5bad48012c3a7415c06310f632ce9a0f9da20dadb70e774e4985c2f416a4445b`. Receipt: `/tmp/minion-360-2026-09-09/native-postgres/receipt.json`.
- Fourteen package-relative symlinks were independently confined and hydrated; package postinstall was inspected, not executed.
- Private temporary data/socket directories; listener127.0.0.1:55439,20max connections,32MB shared buffers. Synthetic local trust auth is for this disposable runtime only. Root owns the attached postgres process and must stop it at session end.
- Native initdb succeeded. Two postgres.js connections returned distinct backend PIDs3086331 and3086332. This establishes a usable substrate, **not** job/stock race safety.

10-03 must still execute takeover, late completion, cancellation, invoice-create and crash/retry cases through real source and distinct connections. Do not substitute these startup checks for domain acceptance or operational recovery evidence.

## Driver failure discovered by10-03

The deliberate backend termination scenario reproduced an uncaught `postgres@3.4.9` TypeError in `src/connection.js:255`: scheduled nextWrite dereferenced a null socket during rollback. Initial19assertions passed but the run remained red due the unhandled exception. The crash scenario is being isolated in an owned child process so the parent can prove durable DB recovery without hiding the process failure. This is a separate driver/runtime defect.

Registry metadata checked2026-09-09 still lists3.4.9 as latest. Primary upstream issue https://github.com/porsager/postgres/issues/1066 and proposed fix https://github.com/porsager/postgres/pull/1168 describe the same nextWrite/null-socket boundary. Matching source and our actual reproduction support the connection; upstream reports alone do not qualify a fix. A narrow dependency patch or supported-driver decision needs its own exact plan and reconnect/rollback tests. No node_modules patch or product driver replacement has occurred.

## Reproduction contract

Use a fresh private temporary directory and the verified platform archive above, or an independently identified native PostgreSQL17 installation. Do not initialize over an existing cluster. The platform archive is a test substrate, not a product dependency or supported deployment image. Preserve the archive integrity receipt; inspect and confine symlink targets before extraction/hydration. The current unpacked binary root is `/tmp/minion-360-2026-09-09/native-postgres/package/native`.

The initialized cluster uses locale C, UTF8, owner minion_qc and synthetic local trust authentication. Equivalent fresh-cluster initialization and the actual runtime options are:

```sh
# QC_PG_BIN and QC_PG_ROOT refer only to a fresh, owned test directory.
"$QC_PG_BIN/initdb" -D "$QC_PG_ROOT/data" -U minion_qc --auth=trust --encoding=UTF8 --locale=C
mkdir -m 700 "$QC_PG_ROOT/socket"
"$QC_PG_BIN/postgres" -D "$QC_PG_ROOT/data" -h 127.0.0.1 -p 55439 -k "$QC_PG_ROOT/socket" -c max_connections=20 -c shared_buffers=32MB -c unix_socket_permissions=0700
```

Keep postgres attached to an owned completion-aware process session. After confirming that process and port belong to the fresh fixture, use its default postgres database to execute these statements individually outside a transaction:

```sql
CREATE DATABASE minion_qc_jobs_stock OWNER minion_qc;
COMMENT ON DATABASE minion_qc_jobs_stock IS 'minion-360-disposable:v1';
CREATE DATABASE minion_qc_unmarked OWNER minion_qc;
CREATE ROLE app_ledger NOLOGIN;
```

A normal PostgreSQL client or the installed Hub postgres.js module can issue this bootstrap; never use the application environment or its database URLs. The unmarked database must remain unmarked so the negative identity case is meaningful. The test itself owns random marked schemas and grants, and applies the two job/stock migrations inside those schemas. It does not require seeded customer data.

Run from minion_hub:

```sh
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run src/server/services/job-stock-concurrency.sql.integration.test.ts src/server/services/groupchat.effect-ownership.test.ts src/server/services/bg-runtime.test.ts
```

Missing opt-in, URL, identity marker or native runtime fails qualification. The child backend-termination case is expected to expose the current driver defect explicitly until12-04 supplies a qualified repair. On completion, audit remaining fixture schemas and stop only the owned cluster (`pg_ctl -D "$QC_PG_ROOT/data" -m fast stop`, after matching process identity); do not stop a system PostgreSQL service.
