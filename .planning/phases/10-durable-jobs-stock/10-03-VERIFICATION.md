---
phase: 10-durable-jobs-stock
plan: "03"
status: gaps_found
scoped_source_verification: passed
requirements_completed: []
verified: 2026-09-09
---

# Independent job effect and native PostgreSQL verification

Root independently read the frozen runtime/groupchat implementation and reran the three affected suites through the actual marked native PostgreSQL fixture. Result: **44 passed, 3 files, 17.64 seconds, exit0**, with no skips or unhandled parent errors. Log: `/tmp/minion-10-03-root-independent.log`. The executor separately recorded a passing full Hub check across10,630 files, zero errors/warnings. The earlier74-case batch includes30 compatibility cases on the pre-finalization candidate; it is not represented as74 independently rerun final tests.

## Standards

Five exact source/helper files are identified below. Existing10-01/02 work was preserved; package/lock, production state and customer data were not changed. The root-owned helper refuses absent opt-in, non-loopback URLs, malformed schema names and an unmarked database. It establishes database/user/marker identity and preserves search_path after actual connection recycling. Tests exercise actual Drizzle, the owning migrations and service paths. Provider/naming/audit boundaries are synthetic and explicit. Fixture schemas are randomly named and marker-owned; child termination targets a proven blocked fixture backend.

## Behavior and requirement assessment

- Ownership transactions lock the actual tenant/job row, recheck generation/status/live lease after acquiring the lock and again before commit. Separate connections witness takeover, stale completion/progress/error and cancellation; waiting on a row lock does not extend authority.
- Groupchat persists admission before RPC, binds a stable run/logical-turn identity to payload/configuration hashes, and commits output/cursor/run changes under current ownership. A duplicate job cannot repeat an admitted call. Same-job reclaim exposes indeterminate outcome; it does not silently replay.
- Cancellation preserves recorded terminal state. Configuration/transcript conflicts fail the owned job/run without allowing a duplicate job to finalize another owner's run. Independent review found the committed-output terminal-failure split; the executor repaired it before this final rerun. A tagged finalization failure now marks both records failed, and an explicit retry finalizes the same committed message without another RPC.
- Native stock cases demonstrate invoice-lock convergence, cross-tenant denial, draft recovery, response-loss retry, submit/edit/delete serialization and rollback/retry after child backend termination. The actual stock role is non-bypass app_ledger in the synthetic fixture.
- The child crash case deliberately confirms the current postgres3.4.9 null-socket failure while proving database recovery. It is **not** a healthy-driver pass.12-04 owns a separately qualified fix and must preserve these assertions while requiring actual caller settlement.

## Open gates

JOB-02 remains open: five non-groupchat handler types need the D360-11 foundation/adoption plans. Unreadable ownership metadata cannot authorize run mutation; unavailable database writes cannot promise a terminal record. Both require explicit reconciliation and retain exact-site TODO plus proposal. Remote RPC has no cancellation/idempotency receipt; admission is the local authority point, not proof that an admitted remote effect was killed. Synthetic grants/RLS are not deployed workshop checkpoint authority. Native17.10 matches the production major only. Production migration preflight, deployed policies, old-worker drain, exact code/image release and operational recovery remain required. No whole requirement or phase is closed by this scoped pass.

## Candidate identity

| File | SHA-256 |
|---|---|
| `minion_hub/src/server/services/bg-runtime.ts` | `29eeb1cabdde2bc56bf2dc86284a01712812e3d47295b5d2f417e3290469e87f` |
| `minion_hub/src/server/services/groupchat.service.ts` | `28f122f76f4616d29c1b4a049fadbdd9db49ba43e8d129933780ddee2bd02944` |
| `minion_hub/src/server/services/groupchat.effect-ownership.test.ts` | `32515abf3bbf7d472897c63e8ba51ea6c75d7fc9181d408260b7c44bfd2a4156` |
| `minion_hub/src/server/services/job-stock-concurrency.sql.integration.test.ts` | `add47b19dad21f860c4c870d41d1b35bd0e8313c20ac3d74782496239fef96e1` |
| `minion_hub/scripts/qc/disposable-postgres.ts` | `424ceec1cf91d2e3d8659d0bb751cec85bf9c4b827fbf600d500992dad7e4bec` |
