---
phase: 10-durable-jobs-stock
plan: '10'
status: independently_verified_foundation
requirements_closed: []
---

# 10-10 page and transport foundation — execution evidence

The seven-file source candidate is frozen. Final qualification passed48/48 native PostgreSQL cases,43/43 unit cases and focused TypeScript with zero errors. Independent acceptance and the parent-owned whole-app check remain pending. No corpus handler, worker, provider, Qdrant, production database, package, lockfile or active runtime was changed by this child. JOB-01/JOB-02 and phase10 remain open.

## Scope and implementation

The exact seven admitted files add page/batch/unit tables and905, the shared head reference index, an owned transaction helper and head-ID function, the page service, and focused unit/native fixtures. Existing single-head function signatures remain intact. Root owns admission, temporary runner/configuration, global ledgers and later aggregate checks. Active Hub branch was verified as feat/level-2026-07-30; concurrent WIP is preserved.

The page service captures complete canonical source manifests, uses semantic units independent of page/job, packs up to64 inputs across documents, and permits at most4 concurrent actual prepared embedding requests. Durable reservation, dispatch admission, complete historical response and page publication remain separate states. Original dispatch ownership fences response retention; current semantic heads fence publication. A page publication never declares whole-job completion: jobEffectPageAdvanceResult always returns done:false with recorded page/current cursor.

The helper prevalidates all owner references and exact escaped manifest bytes before entering ownership. It locks foreign tenant-scoped owner rows with NOWAIT before entering domain scope. Missing owner is recovery-required, live/locked owner is busy, and capacity is a separate error. Three transaction-local labels are captured, installed and restored, with canonical progress after actor/role restoration. Original SQL failures survive failed cleanup. The labels and prelocked-owner manifest belong to the trusted server SQL boundary; they do not authenticate arbitrary SQL or prove hostile callers already held a row lock. Recursive owned transactions remain unsupported.

Authored905 installs immediate actor/transition guards and deferred dense membership checks. Deferred checks do not consult restored actor context. Tables use FORCE RLS, tenant composite references and no DELETE grant. Actor helpers have no direct PUBLIC/browser/app_ledger execution grant and no new bg_jobs grant. Received batches and abandoned membership snapshots are immutable. The migration is additive and intentionally fails on conflicting preexisting catalog objects. These properties have been exercised on the marked private PostgreSQL fixture catalog described below. No production migration or role state is implied.

## Private test lane and results

Root selected `/tmp/minion-10-10-backend-3ilrc5vv/minion_hub`, copied2305 source/migration/QC files and linked954 dependency directories individually. Mutable caches are private. Only the seven owned source files are synchronized into this separate backend snapshot. Each recorded run has a hash manifest. Root's cache assertion checks the actual Vitest4.1.10 SHA1(empty project name) subdirectory before collection. Unit-lane native socket attempts are counted and rejected; the separately admitted native lane permits only the marked loopback endpoint. No ordinary app environment/default config is loaded.

Commands, with that snapshot as cwd:

```sh
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-10-10-backend-3ilrc5vv LANG=C.UTF-8 node qc-run-units.mjs
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-10-10-backend-3ilrc5vv LANG=C.UTF-8 node node_modules/typescript/bin/tsc -p qc-backend-types.json --noEmit
```

| Evidence | Actual result |
| --- | --- |
| qc-10-10-first-red.log | Runner stopped before collection because its initial cache expectation omitted Vitest's nested suffix. Root corrected only the assertion; root-cache-correction.json records setup provenance. |
| qc-10-10-module-red.log | New module absent:1 failed suite;21 existing tests passed. Structural baseline only, not behavioral failure proof. |
| qc-10-10-validation.log |26 passed:5 new validation and21 existing foundation/embedding tests. |
| qc-10-10-owner-unit.log |31 passed/1 failed. The test misclassified literal app_ledger SQL as role restoration; production role behavior was not the failure. |
| qc-10-10-actor-unit.log |36 passed in2.16s:15 new tests and21 existing. Exact131072/131073 escaped manifest bytes,257 references before ownership, prior actor restoration and original cleanup-error preservation included. |
| qc-10-10-types-first.log |6 errors, all in the owned page service: narrowing and generic replay result. No out-of-scope diagnostics. |
| qc-10-10-types-guards.log |2 errors from applying a replay-union generic to the general currentPage helper; corrected within owned service. |
| qc-10-10-types-native-draft.log |Native TypeScript exit0, including the owned native fixture and all visible transitive dependencies. This is not the final whole-app Svelte check. |
| qc-10-10-capacity-unit.log |43 passed in3.49s:22 new tests and21 existing. Exact256 canonical/64 heads, one over, full ASCII/Unicode/lone-surrogate UTF16 bounds and escaped descriptor rejection included. |

These are historical checkpoints; their results do not establish later hashes. Input identities are retained in qc-10-10-*-inputs.json beside the logs. The final frozen identity is recorded below.

## Native fixture and remaining verification

The authored fixture uses the existing marked disposable PostgreSQL validator, a random isolated schema, distinct asserted backend PIDs and actual runtime/owned-scope/embedding preparation. It applies authored901/903/904/905 through the existing public-schema-to-private-schema isolation transform and compares representative903/904 rows across905. Only synthetic fetch responses are used; no live provider/driver/backend fault injection is requested.

Its initial cases cover cross-document packing, A/B and B/C response reuse, complete unchanged source changes, atomic callback rollback, disabled/qdrant modes, cancellation before reservation, ambiguous overlap, response retention after partial semantic supersession, four active calls, tenant separation, exact unsent recovery, live/locked/missing owners, full companion abandonment, deferred incomplete-release rollback, undeclared-owner denial, absent-context denial, ACLs and restoration. They were initially authored before native admission; subsequent real runs are recorded below.

The later native progression covers actor and concurrency permutations, immutable/shape/privilege negatives, closure/result-return boundaries and actual admission COMMIT rollback. Final focused qualification and independent review remain outstanding at this checkpoint. No mock result closes native concurrency or RLS requirements.

## Capacity interpretation and retained limitations

The full source cap is2097152 UTF16 code units. Node UTF8 encoding uses at most3 bytes per code unit, so a6MiB source-byte overflow cannot precede the UTF16 cap; the exact three-byte source boundary is tested. With the existing8000-code-unit truncation and64 inputs, maximal JSON escaping contributes3072000 bytes plus bounded framing/model, below3MiB per batch. Fresh packing of256 units needs four batches, but an exact historical reservation layout may contain up to256 smaller batches. Across either layout, normalized escaped input contributes at most12288000 bytes; bounded model/framing overhead for all256 possible batches still remains below12MiB. The proof counts every historical batch rather than assuming fresh packing. Those redundant defensive limits are retained; unreachable limit+1 paths are not fabricated as application behavior.

The128KiB foreign actor manifest is independently binding because Unicode/control job IDs can expand despite the256-reference bound. Exact and one-over tests account the serialized known records before ownership/locks. It is not a throughput promise or automatic retry condition.

The16MiB selected vector+metadata gate concerns SQL return and application serialization. It does not bound PostgreSQL internal work, already-loaded source data, the existing provider res.json() allocation, or total process memory. Source-site TODOs point to the root proposal for pre-materialization/provider-read bounds. Historical receipt/tombstone retention, missing-owner recovery and commit-to-call/admitted uncertainty remain explicit policy gaps. Corpus/worker adoption remains separate10-06/15-05 work; foundation source does not establish deployed behavior.

## Initial native-review checkpoint

At the initial native-review checkpoint, the corrected fixture had20 authored cases. Its afterAll releases gates, rolls back the original marked setup owner, drops only its generated schema and guarantees harness.close in finally. This corrects a reviewer-found path where905 setup failure could leave a transaction aborted and DROP could skip all connection cleanup. No failure was induced against a database.

The focused TypeScript receipt at that checkpoint was qc-10-10-types-review.log, exit0. The snapshot input receipt is qc-10-10-initial-native-review-inputs.json. These hashes identify the review checkpoint, not final acceptance:

| Owned file | SHA-256 |
| --- | --- |
| src/server/db/pg-schema/job-effects.ts |20a7c7217841fb9525540761fb80458838f9877175890a5a83b053631889d5b2 |
| src/server/db/pg-schema/job-effect-pages.ts |201b5e2187a8b4ea1fd4fd2a993e6bce773ecf8e54a577a02b0b8c0f304eadda |
| src/server/services/job-effects.service.ts |67c25816ffdaa2f76cfa627a8a4494fa9639b19a617130ba84daac66f931d1c2 |
| src/server/services/job-effect-pages.service.ts |0d0010cad268ffe067d665923d035445f45277e3c43fe7daeb7039cb004208e7 |
| src/server/services/job-effect-pages.service.test.ts |4e65d38870614107d8856f900a4c3a45fb64166432225233bc6346284c2cf172 |
| src/server/services/job-effect-pages.sql.integration.test.ts |4b05481f4224614a13fb399956dec8a76827eaf4f2617cfd034be42b1cb74251 |
| supabase/migrations/20260909090500_job_effect_page_batches.sql |bad75afb3ed7c7d413d1bd82c64c4c09d40d48a751d9ba74085b264c8999e7ef |

Comparison against `/tmp/minion-10-10-source-before/` confirms the existing schema gained only the composite reference index. The existing service gained only the sql import and admitted new helper/error/head-ID block; old single-head implementation bytes are unchanged. Root was sent the exact source TODO sites and paired proposal wording. That checkpoint preceded the native progression below; the consumer/adoption gates remain open.

## Native diagnostic progression

Root subsequently admitted the initial native diagnostic and extension of its existing acceptance cases in the same lane. Exact cwd remains the private backend snapshot. The command is:

```sh
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-10-10-backend-3ilrc5vv LANG=C.UTF-8 MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node qc-run-native.mjs
```

The root-owned native guard admits only literal127.0.0.1:55439 sockets and denies unmocked HTTP. Database/user/marker checks precede fixture writes; cache assertions precede collection. Each run uses a new random private schema and closes every harness connection. No production endpoint, provider call, driver/backend/process fault injection or external service was used.

| Log | Actual result |
| --- | --- |
| qc-10-10-native-first.log |19/20 passed in15.77s. A fixture assertion looked for the SQL exception on Drizzle's outer error rather than its cause. Corrected to exact cause code23514/message; no application fix was needed. |
| qc-10-10-native-actors.log |26/26 passed in14.16s, including malformed/range actor labels, original dispatch generation loss, received placement/result/descriptor immutability and actual catalog evidence. |
| qc-10-10-native-projection.log |28/28 passed in19.86s. The actual service return query returned exactly16777216 bytes and returned a NULL payload with scalar size/count at16777217. Both tests use finite high-scale PostgreSQL numeric JSONB to qualify the wire bound independently of binary JSONB storage size. Historical receipts remain after rejection; page/domain/cursor remain unchanged. |
| qc-10-10-native-frontier.log |38/38 passed in55.25s. Added simultaneous empty-frontier overlap, actual deferred-FK admission COMMIT failure with zero fetch, provider changes before/after preparation, malformed vectors, escaped request-body identity, actual scoped reads, and complete1024/1025 foreign companion/head limits. |

The1024 companion test completes in17.17s including16 prior reservation fixtures; the1025 rejection test takes15.04s including17 prior reservations. These are total local fixture times, not production recovery latency or scalability measurements. Both stay inside their20s test bounds and existing15s individual SQL timeout. The exact target query/driver/runtime path is exercised; a passthrough execution observer records results without fabricating ownership, query output or generation.

Actual catalog observations establish app_ledger as nonsuperuser/nobypass, the actor function owned by the marked fixture owner, search_path=pg_catalog,pg_temp, and no app_ledger CREATE permission on the private schema. Restricted-role job-table SELECT/UPDATE and direct actor-function EXECUTE are denied. Generated-schema absence is asserted before guaranteed connection closure. This qualifies the fixture catalog; production role/default-ACL/migration state is not inferred.

Before the first run, read-only self-review corrected representative legacy receipt seeding:904 permits nonnull manifest_hash only on a head, so the representative effect retains null while its head remains bound. No903/904 bytes changed. Source-defined legacy-row preservation then passed every native setup.

## Selected descriptor representation correction

Root selects the actual persisted PostgreSQL jsonb::text representation for the256KiB database descriptor ceiling; the earlier compact-JavaScript bound remains an allocation precheck. A scalar PostgreSQL byte query before page INSERT must raise typed capacity and roll back preceding head changes. This means zero **committed** side effects on rejection; head SQL may already have been attempted in the enclosing transaction. No custom serializer, SQL constraint relaxation or old migration change is selected. The exact262144/262145-byte native regression first failed with an untyped Drizzle-wrapped23514 error. The corrected service asks PostgreSQL for the persisted descriptor byte size before INSERT and returns typed capacity, preserving old heads, cursor and page state on rollback. The focused red run had1 pass/1 failure/37 skipped; green had2 passed/37 skipped in6.87s. Logs: qc-10-10-descriptor-red.log and qc-10-10-descriptor-green.log.


## Final capacity and actor qualification

The metadata-only discovery fixture uses704 actual units and11 historical owners to reach exactly1048576 and1048577 serialized metadata bytes. It independently measures actual Drizzle rows, then calls the real service. The exact boundary completes discovery; one byte over reports typed capacity before recovery and leaves all12 reserved batches (including the initial probe), cursor and provider-call count unchanged. The read observer pauses only after the real discovery transaction commits; it supplies no fabricated rows, owners or generations. `qc-10-10-native-metadata.log`:2 passed/39 skipped in25.62s.

The maximum-owner fixture uses256 actual runtime-finished jobs with256 distinct historical single-unit batches. The real helper prelocks256 foreign owner rows and installs256 references; no generation is synthesized. A separate fixture rejects1025 heads with only1024 companion units, proving the head bound independently using an unchanged current page member. `qc-10-10-native-owner-max.log`:2 passed/44 skipped in25.30s. Selected test durations are8.55s and15.16s. A257th selected historical batch or distinct owner cannot be reached before exceeding256 required units; no artificial service bypass is used to claim that redundant case. The public owned helper independently rejects257 input references before deduplication or ownership.

The final fixture adds actual legacy single-head receipt preservation/recovery, empty-page publication without transport, an expired same-generation actor and a writable foreign-owner manifest that does not invalidate a live owner. Final source contains48 native cases. All filtered runs explicitly record skipped counts; they are not full-suite receipts.

## Frozen input identity and final checks

`qc-10-10-final-inputs.json` records the synchronized active/private hashes:

| Owned file | SHA-256 |
| --- | --- |
| src/server/db/pg-schema/job-effects.ts |20a7c7217841fb9525540761fb80458838f9877175890a5a83b053631889d5b2 |
| src/server/db/pg-schema/job-effect-pages.ts |201b5e2187a8b4ea1fd4fd2a993e6bce773ecf8e54a577a02b0b8c0f304eadda |
| src/server/services/job-effects.service.ts |67c25816ffdaa2f76cfa627a8a4494fa9639b19a617130ba84daac66f931d1c2 |
| src/server/services/job-effect-pages.service.ts |55570d1850743275ecff946eacc1a5dc21bd9eb8bd5d2952cf7f60899f268ad5 |
| src/server/services/job-effect-pages.service.test.ts |4e65d38870614107d8856f900a4c3a45fb64166432225233bc6346284c2cf172 |
| src/server/services/job-effect-pages.sql.integration.test.ts |ea17c11a63618498425c329b14bc62737ce914236b747f4f6ad365d398dd037c |
| supabase/migrations/20260909090500_job_effect_page_batches.sql |bad75afb3ed7c7d413d1bd82c64c4c09d40d48a751d9ba74085b264c8999e7ef |

Final units:43/43 passed across the exact three files in3.10s (`qc-10-10-unit-final.log`). Final focused native TypeScript:exit0 (`qc-10-10-types-final.log`), with all transitive diagnostics visible and no suppressions. Final unfiltered native qualification passed48/48 in107.95s, with zero skipped tests and exit0 (`qc-10-10-native-final.log`). `QC_NATIVE_SELECTION` records filter:null,passed:48,total:48. Fixture cleanup asserted generated-schema absence and completed guaranteed connection closure; the runner then exited normally. The network guard recorded only the admitted loopback connections and zero denied attempts. No source edits follow this freeze without root coordination. Parent-owned independent acceptance and whole-app qualification remain separate.

The final active/private hash comparison matched all seven files against the frozen input receipt. No source bytes changed during these runs. The native lane is released for the parent's serialized independent repeat; the temporary server remains parent-owned. No broad/default test command or whole-app check was run by this executor.


## Root independent repeat

All48 native cases,43 unit cases and focused TypeScript independently pass at the exact final seven-file freeze. See10-10-VERIFICATION.md. Combined Hub qualification, corpus/worker adoption and production migration remain open.


Root combined Hub check including this foundation and the V2 browser fixture passes0errors/0warnings. This closes the selected aggregate compile gate, not corpus/worker integration or release.
