---
status: qualified_local_substrate_runtime_retained
date: 2026-09-09
scope: temporary local PostgreSQL and pgvector substrate only
product_dependencies_changed: false
---

# Private pgvector fixture

Owner: `/root/stream_ui_independent_verify`. All downloaded, compiled and runtime files belong to `/tmp/minion-360-pgvector-build`. No system install, service, Docker, product dependency, existing PostgreSQL cluster or canonical fixture helper is changed. This is an ordinary synthetic database substrate; it performs no backend termination or fault injection.

## Source provenance

Primary sources were inspected through the dedicated headless browser using `BU_NAME=minion-pgvector-fixture` on 2026-09-09. Browser ownership was returned after research.

| Source | Identity | Verification |
|---|---|---|
| [PostgreSQL 17.10 archive](https://ftp.postgresql.org/pub/source/v17.10/postgresql-17.10.tar.bz2) | SHA-256 `078a03516dcdbdb705fecaf415ea3d13a956c589e46f09fed68a06fb00598c90` | Matches the [published checksum](https://ftp.postgresql.org/pub/source/v17.10/postgresql-17.10.tar.bz2.sha256), both browser inspection and `sha256sum --check` |
| [pgvector v0.8.6 tag](https://api.github.com/repos/pgvector/pgvector/git/ref/tags/v0.8.6) | Commit `8ee86c96f0fd72390f890aa8a336fda6d3ab4c6c` | Official repository tag resolves directly to this commit; extracted `vector.control` declares 0.8.6 |
| [Pinned pgvector source archive](https://codeload.github.com/pgvector/pgvector/tar.gz/8ee86c96f0fd72390f890aa8a336fda6d3ab4c6c) | SHA-256 `d076a3098010905fd60256649327809651f6288327db6413f0938305f62ea299` | Locally calculated archive identity; this is not an independently published checksum or a signature verification |

The system `pg_config` reports PostgreSQL 18.6 but its server headers are absent. Existing stripped PostgreSQL 17.10 lacks the development files needed to compile extensions. Available build tools were GCC 16.2.1 (20260810), GNU Make 4.4.1, Bison 3.8.2 and Flex 2.6.4. Development metadata included OpenSSL 3.6.4, zlib 1.3.2, ICU 78.3, zstd 1.5.7 and lz4 1.10.0; availability does not imply every optional library was enabled. No packages were installed.

## Reproduction

These commands reproduce the build in a new empty directory at the same absolute path. Do not run them over the existing fixture while another agent owns it.

```sh
mkdir /tmp/minion-360-pgvector-build
cd /tmp/minion-360-pgvector-build
curl --fail --location --proto '=https' --tlsv1.2 https://ftp.postgresql.org/pub/source/v17.10/postgresql-17.10.tar.bz2 --output postgresql-17.10.tar.bz2
curl --fail --location --proto '=https' --tlsv1.2 https://ftp.postgresql.org/pub/source/v17.10/postgresql-17.10.tar.bz2.sha256 --output postgresql-17.10.tar.bz2.sha256
sha256sum --check postgresql-17.10.tar.bz2.sha256
curl --fail --location --proto '=https' --tlsv1.2 https://codeload.github.com/pgvector/pgvector/tar.gz/8ee86c96f0fd72390f890aa8a336fda6d3ab4c6c --output pgvector-8ee86c9.tar.gz
sha256sum pgvector-8ee86c9.tar.gz
tar -xjf postgresql-17.10.tar.bz2
tar -xzf pgvector-8ee86c9.tar.gz
./postgresql-17.10/configure --prefix=/tmp/minion-360-pgvector-build/prefix --without-readline --without-icu > configure.log 2>&1
make -j2 > postgres-build.log 2>&1
make -j2 install > postgres-install.log 2>&1
cd pgvector-8ee86c96f0fd72390f890aa8a336fda6d3ab4c6c
make -j2 PG_CONFIG=/tmp/minion-360-pgvector-build/prefix/bin/pg_config OPTFLAGS=
make -j2 install PG_CONFIG=/tmp/minion-360-pgvector-build/prefix/bin/pg_config OPTFLAGS=
```

Actual execution uses `build.py` under the owned directory to run these four make stages, enforce a 20-minute total deadline on its own build processes and sample process-session RSS every two seconds. `build-resource.jsonl` stores sampled memory; its peak is not a continuous kernel high-water mark. No more than two make workers are used. `OPTFLAGS=` removes pgvector's machine-native CPU tuning. This minimal fixture omits Readline and ICU and does not qualify production packaging, TLS, locale or deployment behavior.

## Namespace contract

The new database is `minion_qc_vectors`, owner `minion_qc`, comment `minion-360-disposable:v1`, on verified loopback port 55440. The existing cluster on 55439 is outside this task and was not changed.

Install vector in `extensions`; grant `app_ledger` schema USAGE, with NOLOGIN, NOSUPERUSER and NOBYPASSRLS. Keep public CREATE revoked. Qualify the actual type as `extensions.vector(1536)` and HNSW operator class as `extensions.vector_cosine_ops`. Inside each fixture transaction use an explicitly reviewed search path of its owned schema, `extensions`, then `pg_catalog` if application SQL uses unqualified vector functions/operators. Grant the runtime role only the schema/table privileges its fixture requires.

The existing `openDisposablePostgres.createConnection(schema)` deliberately starts with `schema,pg_catalog`, excluding both public and extensions. Its behavior is unchanged. Merely installing the extension does not make unqualified vector types and operators available to those connections. A borrower must review its own transaction namespace seam and use qualified DDL or `SET LOCAL`; transaction-local changes reset afterward. Serialize borrowers of this fixture and use separate owned schemas.

## Runtime and qualification

All four build/install stages exited zero. PostgreSQL compilation completed at 194.6 seconds, its installation at 196.6 seconds, pgvector compilation at 202.7 seconds and its installation at 204.8 seconds. Sampled aggregate RSS across each build process session peaked at 400,540 KiB (about 391 MiB). The two-worker and 20-minute bounds were respected; no build timeout occurred.

The new PostgreSQL runtime is retained in attached exec session **81214**, postmaster PID **3274205**. `ss` verified its only TCP listener is **127.0.0.1:55440**. Data, socket, logs and binaries are under the owned temporary directory. Ask the root orchestrator before stopping this runtime so borrowers can finish; no stop operation was performed. Re-check the PID/data-directory identity before any later lifecycle action.

Fixture environment, only after the explicit disposable opt-in:

```sh
MINION_QC_DISPOSABLE=1
MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55440/minion_qc_vectors
```

Startup and ordinary proof commands used, from the temporary directory:

```sh
mkdir socket
./prefix/bin/initdb -D /tmp/minion-360-pgvector-build/data --username=minion_qc --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C > initdb.log 2>&1
# Keep this process attached in its own execution session.
exec ./prefix/bin/postgres -D /tmp/minion-360-pgvector-build/data -h 127.0.0.1 -p 55440 -k /tmp/minion-360-pgvector-build/socket -c shared_buffers=32MB -c max_connections=20 -c unix_socket_permissions=0700 > /tmp/minion-360-pgvector-build/postgres-runtime.log 2>&1
# Run the following in a separate execution session once PostgreSQL is ready.
env -u PGOPTIONS -u PGSERVICE -u PGSERVICEFILE ./prefix/bin/psql -X -h 127.0.0.1 -p 55440 -U minion_qc -d postgres -f bootstrap.sql > bootstrap.log 2>&1
env -u PGOPTIONS -u PGSERVICE -u PGSERVICEFILE ./prefix/bin/psql -X -h 127.0.0.1 -p 55440 -U minion_qc -d minion_qc_vectors -f probe.sql > probe.log 2>&1
env -u PGOPTIONS -u PGSERVICE -u PGSERVICEFILE ./prefix/bin/psql -X -A -t -h 127.0.0.1 -p 55440 -U minion_qc -d minion_qc_vectors -f identity.sql > runtime-identity.json
```

The cluster uses trust authentication for this synthetic loopback fixture; it is accessible to other local processes and is not a production authentication model. No application environment files or production database variables were loaded.

`bootstrap.sql` creates only the named disposable database, canonical comment, `app_ledger` role, `extensions` schema and extension. `probe.sql` uses `ON_ERROR_STOP`, a transaction and schema `qc_job_stock_bbaa0086000000000000000000000001`. It rolls back all probe DDL/data after the assertions. The catalog snapshot was taken before borrower handoff and establishes PostgreSQL **17.10**, vector **0.8.6**, correct marker/owner, zero public tables and zero remaining probe schemas. It also verifies `app_ledger` cannot log in, is neither superuser nor BYPASSRLS, has extension schema USAGE and lacks CREATE.

| Ordinary check | Evidence | Result |
|---|---|---|
| Native extension loaded | `CREATE EXTENSION vector ... VERSION '0.8.6'`, catalog version/schema | Pass |
| Actual `extensions.vector(1536)` column | Two 1536-element arrays inserted, cast back to `real[]`, cardinality asserted | Pass |
| Actual cosine operator | Identical-vector cosine distance asserted within 0.000001; output 0 | Pass |
| Actual HNSW operator class | Index created with `extensions.vector_cosine_ops` on the native vector column | Pass |
| Tenant read isolation | FORCE RLS under `SET LOCAL ROLE app_ledger`; each `app.current_org_id` sees only its own row | Pass |
| Cross-tenant write denial | Insert for other tenant raises `insufficient_privilege`; unexpected acceptance fails the probe | Pass |
| Dimension enforcement | Three-element input to vector(1536) raises `data_exception`; unexpected acceptance fails | Pass |
| Transaction cleanup | After rollback: role is `minion_qc`, tenant setting empty and probe schema absent | Pass |

These are SQL substrate checks, not execution of the Hub ingestion handlers or an ANN performance/recall benchmark. No text stand-in, provider call, connection termination, crash or fault injection was used. Phase 10-05/06 application integration and their independent verification remain separate work. The root orchestrator received the runtime handoff after successful probes.

## Evidence identities

Paths below are relative to `/tmp/minion-360-pgvector-build`.

| Artifact | SHA-256 |
|---|---|
| `prefix/bin/postgres` | `d14d9680fd9951843c5b83f2de78be081933aec00bb775e1cbac6e38cbb79288` |
| `prefix/bin/pg_config` | `1c98e7899979f5c5681225380c0354b388fa80ecdc097f3b2fa266418d392633` |
| `prefix/lib/postgresql/vector.so` | `5dc194864a4743d2081ebc154b98fd129c2105e292406112a62b5036564b9784` |
| `build.py` | `740147e85e1df9eaf7874e1a8e5c5b69d26d99dc864b5d53224a96afc8d52340` |
| `build-resource.jsonl` | `9f436c04a65bee415e16d6e02f82f498c9f6ee5260de3118d69cab34d8143c61` |
| `bootstrap.sql` | `1b309c0000b0535dfcc4099fe25368ff669132b2392a6f2fc8e010cde87f0475` |
| `probe.sql` | `8f802ad09aad2d8cdf1702c606bc9e274a13051fe33c4f88e4445dc352c1fe20` |
| `bootstrap.log` | `db888624f9cf28924f67629113f0d1faaef8e3eefdd7d729b308d3d44fdc07bf` |
| `probe.log` | `2ee146836a6b92529c60717524fb69b8d37460c512e79714beb5482e519fb009` |

Hashes establish the exact local evidence and installed artifacts, not byte-reproducible builds across toolchains. The temporary runtime and source directory are intentionally retained for borrowers; the durable repository change is this research record only.

## Independent root recheck

Root inspected the ordinary SQL probe, verified the actual database/owner/marker/loopback/data-directory/extension identity and reran the probe with exit0. Logs: /tmp/minion-360-pgvector-root-identity.json and /tmp/minion-360-pgvector-root-probe.log. The synthetic probe transaction rolled back. Brain10-05 now owns serialized ordinary application-fixture use of55440; finance uses the separate55439 runtime.
