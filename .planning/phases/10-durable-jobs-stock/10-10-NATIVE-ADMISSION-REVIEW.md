# 10-10 pre-native admission review

Disposition: **source suitable for an initial isolated diagnostic run after root freezes the corrected fixture and admits its exact native runner/environment/socket guard**. This is not full foundation acceptance. No tests, database connection, network call or source edit was performed by this reviewer. Only this report was written. Hub branch was read as `feat/level-2026-07-30`; root and Hub instructions and the actor amendment were applied.

## Blocking findings before the first run

### N1 — Migration-failure cleanup could skip all connection closure: corrected

The first inspected fixture, SHA `44fce62c3d22d19869ac4b01b9250cae78f67efc5b3ff380fe37978f30d80e99`, executed DROP SCHEMA before calling harness.close in afterAll without finally.905 contains an explicit BEGIN. An ordinary migration error could leave the setup connection aborted; cleanup DROP would then fail and skip close. The initial setup owner is also different from the later local `owner` variable, so rolling back only that replacement would not repair setup failure.

Reported to root and the executor before execution. The executor changed only its owned fixture. Re-read correction at `job-effect-pages.sql.integration.test.ts:178–188`: release pending barriers, explicitly ROLLBACK `harness.owner`, drop only the generated schema on that original marked connection, and always call harness.close in finally. Corrected fixture SHA `4b05481f4224614a13fb399956dec8a76827eaf4f2617cfd034be42b1cb74251`. This resolves the identified source blocker. Runtime success/failure cleanup remains to be observed; no driver/process fault injection is needed or authorized.

### N2 — Native lane identity/configuration is not yet an executable reviewed receipt

At review time the private backend snapshot contains the admitted unit runner/config and `qc-unit-network.mjs`, whose native Socket.connect guard denies every connection. It is not a native PostgreSQL runner. A fixture using openDisposablePostgres alone permits any explicit loopback port matching its URL policy; it does not hardcode the selected55439 endpoint. Do not relax the unit guard globally or use the app's ordinary Vitest/environment bootstrap.

Before first execution root must freeze the exact single-file native configuration and command: private cache verified before collection, env files disabled, explicit opt-in/URL selecting the existing marked `127.0.0.1:55439/minion_qc_jobs_stock` database as minion_qc, and a native connection guard permitting only that endpoint while counting/rejecting everything else. Guard unexpected fetch before fixture setup as well as native socket fallback; within tests fetch must be wholly synthetic. No SUPABASE_DB_URL fallback, provider credentials, browser/server startup, database creation or role mutation belongs in this lane. Use explicit bounded hook/test timeouts compatible with the helper's15-second statement and five-second connection-close limits. Freeze the fixture and all four actual migration hashes before copying/executing.

This is a root setup/admission gate, not a request for a new application source file. No further intrinsic execution-safety blocker was identified in the reviewed SQL/helper/service bodies.

## Schema-isolation and engine boundary

`job-effect-pages.sql.integration.test.ts:117–153` opens the shared disposable helper before creating anything, generates a `qc_job_stock_` schema from a UUID, creates only the base job/domain fixture tables, then reads actual901,903,904 and905 migration files. It replaces literal `public.` references with the quoted random schema and executes those bytes. This includes qualified actor row types, function calls and dynamic ACL strings in905; no production table is deliberately named by the transformed statements. The unmodified `pg_catalog,public` path in the non-definer descriptor validator does not select fixture tables: its body uses catalog JSON/string functions. The security-definer functions use `pg_catalog,pg_temp` and fully qualified relation references, which the transform maps to the fixture schema.

The migration creates/revokes/grants privileges only for its generated schema objects. It does not create or alter roles, databases or applied migration histories.901 adds the actual lease-generation column to the fixture base job table. A legacy head and received effect are inserted after904 and compared byte-for-byte as JSON across905 (`fixture:126–141`), providing a useful additive-compatibility test once executed. This does not qualify an arbitrary partially applied production catalog.

`disposable-postgres.ts:7–36` requires explicit opt-in, loopback URL, explicit port, named minion_qc user/database and no query/hash. Lines79–113 verify actual database, user, marker and server address before returning an owner handle. Connections have max1, prepared statements disabled, connect/idle/statement timeouts and a validated schema search path. The fixture asserts distinct a/b/c backend PIDs and matching database markers. Those connections test actual cross-session behavior; the marker still needs to be present on the selected live lane, which this reviewer did not contact.

At runtime record actual app_ledger `rolsuper=false` and `rolbypassrls=false`, selected function ownership and grants, and real role transition. Existing source comments/previous fixtures are not a substitute for the selected catalog. RLS claims depend on that role being non-bypass; service-level tenant filters alone cannot prove it. Do not modify roles to make a failing preflight pass without a separate root decision.

## Actor, tenant and privilege review

The helper at `job-effects.service.ts:283–308` validates at most256 input references, deduplicates and orders job/generation pairs, excludes the separately locked actor, counts exact escaped UTF-8 manifest bytes before aggregate construction, and rejects above128 KiB. Lines309–328 take tenant-filtered foreign NOWAIT locks before scoped work and distinguish missing, locked and live owners. Lines332–355 capture/set/restore actor, generation and manifest alongside the existing role/org scope; cleanup preserves original SQL errors and outer rollback. Progress follows restoration at356–361. Source explicitly excludes recursively opening another owned transaction while retaining nested context restoration.

The immediate905 actor helper at75–139 checks org context against row tenant, bounds the actor/generation/manifest, validates each manifest member, and denies an undeclared foreign reference before any foreign-row lock. It re-locks the exact tenant/current actor with NOWAIT, requires current generation, running state and a live lease, and checks expected OLD/NEW ownership. Foreign recovery requires the declared old job and a row proving generation/status/lease invalidation; a missing row rejects. Same-job current ownership is treated separately from foreign ownership.

The SQL check uses clock_timestamp while application/runtime checks use Date.now. This is a conservative additional database-clock gate, not proof that clocks are identical. The initial local lane must record ordinary expiry behavior; it does not authorize changing the production clock policy.

All actor checks are immediate BEFORE triggers. Deferred membership functions at264–295 inspect final batch/unit structure and do not read ephemeral actor GUCs. Thus restoring actor settings before commit does not invalidate a legitimate deferred completeness check. The incomplete companion-release test specifically aims to exercise this distinction at outer commit.

905:297–326 enables and forces RLS on all three tables, adds tenant GUC policies, revokes PUBLIC/browser table and function access, explicitly denies direct actor/guard function execution to app_ledger, and grants only SELECT/INSERT/UPDATE plus the non-definer descriptor predicate required for checks. It adds no bg_jobs grant and no DELETE grant. Definers explicitly qualify tenant/job relations instead of assuming RLS applies to their elevated owner. No current_user comparison incorrectly treats the definer owner as the job actor.

As selected by root, GUCs and their manifest remain forgeable trusted-service labels. The strict prelocked-before-heads guarantee applies to the real helper. Native direct-SQL tests must prove stale/absent/foreign-context and structural denial, not claim authentication of hostile code holding the privileged SQL session.

## Mutation and service checks relevant to first execution

- Batch guards preserve immutable member/descriptor identity and enforce reserved→admitted→received or reserved→abandoned transitions. Admission binds dispatch identity to the current reservation; response retention binds the original dispatch job/generation and deliberately does not require fresh semantic heads.
- Unit guards preserve semantic identity and one-way first publication; only abandoned unsent placements may move. Deferred checks require every active batch to have complete, dense, exactly ordered membership and every abandoned batch to have none. They do not retain labels beyond the transaction.
- Page guards require bound creation, immutable descriptor and a one-way publication transition; current source heads and complete received units are checked. Trusted domain/cursor publication still belongs to the actual service callback and transaction, not to the presence of a live actor alone.
- `job-effect-pages.service.ts:411–457` takes the discovered head/page/batch/unit locks, re-discovers the complete frontier and rolls back on change before reclaiming or adding reservations. Transfers and abandonments use exact previous owner/generation/state predicates. Trigger NOWAIT reads are re-locks on this helper path.
- Service admission resolves its owned transaction before `executeEmbeddingRequest`; response storage uses a new owned transaction. Lines568–576 bound active attempts to four and observe all started worker promises. There is no intentional SQL lock spanning fetch. Historical response retention at534–544 checks immutable dispatch identity without reacquiring current semantic heads.
- Projection at605–636 selects only required indices, computes SQL text size, returns scalar rejection instead of an oversized payload, and checks UTF-8 size before parsing and publication. Existing903 result validation still bounds stored vectors; this review does not certify PostgreSQL working-memory usage or the provider's response-body reader.

These are source observations. SQL syntax, real definer permissions, deferred-trigger behavior, races and projection limits remain actual-engine questions. A failing initial diagnostic test is expected to guide implementation; it is not itself evidence that the lane was unsafe.

## Fixture scope and remaining acceptance evidence

The fixture redirects only pool acquisition, usage recording and private synthetic provider configuration. It invokes real enqueue/advance/ownership, RLS scope, preparation/execution and new service functions. AsyncLocalStorage selects actual distinct fixture connections. Fetch responses are synthetic; actual outbound request payloads/counts are inspected. Deferred barriers release in cleanup and outstanding on-client operations are observed before global fetch restoration. No backend termination, driver replacement, production corpus access or worker/Qdrant adoption occurs in the reviewed source.

The author is still adding acceptance cases. Missing final matrix cases are not silently waived by permission for a first diagnostic run. Root must later qualify reciprocal owners/frontier growth, current/stale/expired actor denial, role and GUC restoration on SQL failure, direct SQL tenant/immutability constraints, dense membership, provider ambiguity/supersession, exact capacity edges and complete projection limits. Existing published replay and legacy receipt checks do not substitute for that coverage.

## Inspected identities

| Input | SHA-256 |
|---|---|
|10-10 PLAN including actor amendment|`aafd3824633cdcc3cad547d26d0903f88309060536938a0d0f79490d326587e4`|
|905 SQL|`bad75afb3ed7c7d413d1bd82c64c4c09d40d48a751d9ba74085b264c8999e7ef`|
|job-effect-pages.service.ts|`0d0010cad268ffe067d665923d035445f45277e3c43fe7daeb7039cb004208e7`|
|job-effects.service.ts|`67c25816ffdaa2f76cfa627a8a4494fa9639b19a617130ba84daac66f931d1c2`|
|Fixture before cleanup correction|`44fce62c3d22d19869ac4b01b9250cae78f67efc5b3ff380fe37978f30d80e99`|
|Fixture after reviewed cleanup correction|`4b05481f4224614a13fb399956dec8a76827eaf4f2617cfd034be42b1cb74251`|
|Shared disposable helper|`424ceec1cf91d2e3d8659d0bb751cec85bf9c4b827fbf600d500992dad7e4bec`|

Concurrent authoring means these identities are reviewed snapshots, not permission to execute later drifted bytes. Root owns final input/config freeze and native admission. Standards: bounded source/fixture design is acceptable with N2. Spec: sufficient for an initial diagnostic lane after the correction; full foundation verification remains open. Root/executor retain proposal and exact-site handoff ownership; this report changes no implementation or global status.
