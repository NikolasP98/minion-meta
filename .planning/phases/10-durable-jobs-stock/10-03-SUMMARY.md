---
phase: 10-durable-jobs-stock
plan: "03"
status: implemented_pending_independent_verification
requirements_completed: []
source_scope: "Runtime envelope, groupchat effect ownership, and disposable native PostgreSQL qualification."
---

# 10-03 implementation and qualification

The runtime supplies handlers with tenant/job identity, the current lease generation,
an abort signal, a stable effect-key function and a short ownership transaction.
That transaction locks the actual job row and checks authority after acquiring the
lock and again before commit. Provider calls remain outside database transactions.

Groupchat uses a run/logical-turn key as its message primary key. An admitted
checkpoint records configuration/payload fingerprints and owner provenance in
the existing run settings and job cursor. Owner generation is excluded from the
effect identity. Message, round, committed checkpoint and terminal state updates
share the current owner's transaction. Duplicate jobs cannot start the same
admitted turn. A reclaimed original job with an admitted/uncommitted effect fails
explicitly and requires reconciliation; it does not silently repeat the RPC.

This is local source evidence. No production migration, provider call, dependency
installation, release, branch change or commit was performed.

## Ownership and amendments

This executor owns four Hub files and this plan/summary:

- `src/server/services/bg-runtime.ts`
- `src/server/services/groupchat.service.ts`
- `src/server/services/groupchat.effect-ownership.test.ts`
- `src/server/services/job-stock-concurrency.sql.integration.test.ts`

Root owns `scripts/qc/disposable-postgres.ts`, the dedicated PostgreSQL cluster,
the `app_ledger` fixture role and the marked/unmarked fixture databases. Root
approved checkpoint provenance, duplicate-job handling, terminal cancellation
ordering, an isolated child crash probe and the helper's validated startup schema.
Existing source changes from 10-01/10-02 were preserved. Entry branch was
`feat/level-2026-07-30`; initial source hashes were
`03dbb0dca5cb1f57186499924a3a63ecfad3cca19e4b5b13c772908c1d4bb664`
for bg-runtime and
`2dcf8f00c662f97d4fe0f3b3de75f03974bddcafbbd8c52c5f5a2f8f5753875c`
for groupchat.

## Real database boundary

The test requires `MINION_QC_DISPOSABLE=1` and an explicit fixture URL. It does
not load application environment files or fall back to SUPABASE_DB_URL. The
observed database was `minion_qc_jobs_stock`, owner `minion_qc`, PostgreSQL 17.10,
loopback port 55439, marker `minion-360-disposable:v1`. Each run creates its own
random marked schema and removes only that schema. Root's unmarked database is
used solely for the negative identity check. Normal public tables remained empty.

The fixture runs actual Drizzle, `getCoreDb`, `getOrgTransactionDb`, `withOrgCore`,
job/stock service code and both owning migrations. Only the pool selection,
provider, audit boundary, naming formatter and notification registration are
replaced. Independent client pools use distinct PostgreSQL backend PIDs. Stock
transactions enter the non-bypass `app_ledger` role and fixture organization
policies; these synthetic declarations are not a reproduction of every Hub
table, foreign key, applied policy or deployment grant.

Actual lock witnesses cover competing invoice creation, submission versus draft
edit/delete, stale completion/error/progress after takeover, cancellation versus
progress and ownership expiry while waiting on a row lock. Groupchat cases cover
duplicate jobs, original-owner reclaim, late output, committed-message replay,
configuration drift and atomic run/job terminal commits. Invalid opt-in, URL,
schema and missing-marker cases fail explicitly; missing database setup cannot
produce a green skipped suite. A six-second idle/reconnect case confirms both a
new backend PID and preservation of the fixture schema.

## Red-green evidence and intermediate corrections

- Initial groupchat tests reproduced late message persistence after cancellation
  and a second provider call following an indeterminate result: two failures.
- Additional cases reproduced cancellation becoming done, a late cancellation
  replacing a completed run, transcript drift admitting a mismatched message and
  an indeterminate original owner leaving its run visibly running.
- A configuration/transcript conflict also left the run running after failing
  the job. The current owner's conflict path now finalizes both records. A
  duplicate job fails only itself while preserving the original owner; unreadable
  owner metadata cannot authorize finalizing somebody else's run.
- A deferred native PostgreSQL constraint trigger reproduced split run/job
  terminal commits. The correction writes both terminals under the same locks.
- Independent review then identified a terminal-transaction failure leaving the
  run running while the runtime failed the job. A tagged, sanitized finalization
  error now triggers a fresh ownership transaction: only our verifiable committed
  checkpoint permits failing both records. An explicit retry may then finish
  that committed effect, without another model call. The native test checks
  both failed records, unchanged messages, and both done records after retry.
- The first direct backend-termination run had 19 passing assertions but an
  unhandled driver exception. That run was red, not a successful qualification.
- The child fixture exposed loss of SET search_path after a five-second pool
  idle disconnect. Root added a validated startup search_path option. Refreshing
  backend PID witnesses per case and releasing failed-case latches/tasks fixed
  subsequent fixture timeout cascades. Two exact leaked test schemas were
  removed only after matching database/schema marker checks; a later audit
  showed zero remaining test schemas and zero public tables.
- Initial full svelte-check found one fixture-only conditional Promise-union
  error. The test helper invocation now supplies its explicit result type.

## Current validation record

Command from Hub:

```sh
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run src/server/services/job-stock-concurrency.sql.integration.test.ts src/server/services/groupchat.effect-ownership.test.ts src/server/services/bg-runtime.test.ts src/server/services/finance-statements.service.test.ts src/server/services/brain-corpus-jobs.service.test.ts src/server/services/brain-business-corpus-jobs.service.test.ts
```

The full compatibility batch passed **74/74 tests, six files, 22.14 seconds,
exit 0** before the final tagged-finalization correction, with no
skipped cases or parent-runner unhandled errors. This comprises 22 native cases,
eight groupchat cases, 14 runtime cases and 30 existing handler compatibility cases.
Log: `/tmp/minion-10-03-final-tests.log`.

After the finalization correction, the affected three suites passed **44/44
tests, 20.03 seconds, exit 0**, with no skipped cases or parent-runner unhandled
errors. Command: the same installed runner and explicit disposable variables,
with `job-stock-concurrency.sql.integration.test.ts`,
`groupchat.effect-ownership.test.ts` and `bg-runtime.test.ts`. Log:
`/tmp/minion-10-03-finalization-tests.log`. The extra 30 compatibility cases remain
evidence for the unchanged runtime envelope; no new compatibility claim is
inferred for the other handlers' unimplemented ownership paths. These counts are
not additive totals.

Final installed `node node_modules/svelte-check/bin/svelte-check --tsconfig
./tsconfig.json --output machine` completed across **10,630 files with zero
errors and zero warnings**, exit 0. Log: `/tmp/minion-10-03-final-check.log`.
Scoped formatting and `git diff --check` passed. Source is frozen for independent
review; no phase or requirement is declared complete here.

The final source/settings tests also preserve unrelated settings and reject a
different-tenant job attempting to use the run. A direct fixture-catalog read
confirmed `minion_qc_unmarked` exists with a null database marker, so the negative
identity result is not being attributed to a missing database. Post-run cleanup
again reported zero test schemas and zero public tables.

## Source candidate identity

| Hub-relative file | SHA-256 |
|---|---|
| `src/server/services/bg-runtime.ts` | `29eeb1cabdde2bc56bf2dc86284a01712812e3d47295b5d2f417e3290469e87f` |
| `src/server/services/groupchat.service.ts` | `28f122f76f4616d29c1b4a049fadbdd9db49ba43e8d129933780ddee2bd02944` |
| `src/server/services/groupchat.effect-ownership.test.ts` | `32515abf3bbf7d472897c63e8ba51ea6c75d7fc9181d408260b7c44bfd2a4156` |
| `src/server/services/job-stock-concurrency.sql.integration.test.ts` | `add47b19dad21f860c4c870d41d1b35bd0e8313c20ac3d74782496239fef96e1` |
| `scripts/qc/disposable-postgres.ts` (root-owned) | `424ceec1cf91d2e3d8659d0bb751cec85bf9c4b827fbf600d500992dad7e4bec` |

The fixture DDL hash is
`f03ff566a7400bffb8c697b59f6247d3f273d787efac96ec7aba2052de77b913`.
The test executes the actual 10-01 and 10-02 migrations with only their `public.`
schema qualification replaced by the owned random fixture schema. Their source
identities remain in the independently accepted prerequisite reports. Whitespace
diff checks passed for all four executor-owned files.

## Backend-loss defect retained

Installed `postgres` is 3.4.9. Abruptly terminating the fixture backend while
submission waits on a bin lock produces this failure:

```text
TypeError: Cannot read properties of null (reading 'write')
  at Immediate.nextWrite (node_modules/postgres/src/connection.js:255:22)
  at processImmediate (node:internal/timers:484:21)
  at process.callbackTrampoline (node:internal/async_hooks:130:17)
```

The crash test runs the actual stock service in a child test process. The parent
proves that child backend is blocked after draft commit, kills only the recorded
fixture PID, requires child exit 1 and the exact nextWrite/null-socket failure,
then proves zero partial ledger effects and retry convergence on the original
draft through another backend. No global unhandled-exception suppression is
installed. Recovery evidence does not certify the driver's runtime health. A
source TODO links the defect to HDS-05; root owns its dependency follow-up.

## Remaining handler contracts and release gates

| Handler types | Source owner | Remaining work |
|---|---|---|
| `statement_ingest` | `finance-statements.service.ts` | Adopt current effect ownership at the import transaction; existing dedupe is not cancellation admission. |
| `brain_ingest` | `brains.service.ts` | Fence status/chunk persistence and bound external content/embedding admission. |
| `brain_corpus_conversations`, `brain_corpus_whatsapp` | `brain-corpus-jobs.service.ts` | Carry ownership through conversation sync/backfill and external effects. |
| `brain_corpus_business` | `brain-business-corpus-jobs.service.ts` | Carry ownership through domain processing and failure/status writes. |

Old single-argument handlers remain source-compatible with the new second
execution argument. Compatibility tests do not establish that those handlers use
it. Root owns the exact child plans and registration TODOs. JOB-01/JOB-02 are not
closed by this slice.

Current public groupchat creation accepts explicit fields without settings; the
only public update is cancellation after tenant-scoped lookup. This is a source
authority review, not certification of deployed PostgREST grants or physical
settings protection. Inspect those grants before release. Admission is the local
linearization point; the gateway RPC has neither a cancellation parameter nor a
verified provider idempotency receipt. Already admitted calls cannot be revoked,
and admitted/uncommitted outcomes require an explicit reconciliation procedure.
Unreadable ownership metadata cannot grant authority to finalize the run; only
the current job is failed in that case. A database outage also prevents any
guarantee that either terminal write persisted. Generic storage-outage recovery
and a durable reconciliation/outbox path remain explicit gaps, not proof supplied
by the successful tagged-finalization fixture. The source TODO points to HDS-05.

Stock schema deployment still requires exact-target preflight, collision review,
migration before code and draining old binaries. Synthetic native concurrency
does not authorize production changes or a historical stock rewrite.

**Standards:** Shared ownership preserved; installed native tools and bounded
synthetic fixtures used. **Spec:** Local effect and recovery evidence exists;
final independent review, remaining handler adoption, driver repair and release
qualification remain open.
