# Implementation Plan: Bounded Factory Jev admission and deadlines

**Branch**: `feature/agent-harness-b-factory` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Separate token authority from run accounting in the existing proxy, pass one remaining-duration contract from guard to provider, and preserve v2 receipts through shell accounting. Keep changes in one Factory group PR targeting registered `dev`.

## Technical Context

TypeScript ESM runner on Node 22+, Express 5, Bash/curl/jq guard; npm lockfile in `runner/`. Tests use Node's test runner with tsx plus Bash tests and a loopback HTTP provider. No new service or distributed store. The run ledger remains process-local, separate from durable Factory run records. Runner `package.json` declares typecheck and test, not a build script. Actual installed versions and harness proof are qualification tasks; source pins alone do not satisfy them.

## Constitution Check

I: spec/plan/tasks precede runtime edits. II: source AS-IS and all acceptance IDs are mapped. III: one PR for slices 8–9 is the owner's explicit batching exception; feature branch and scoped staging remain. IV: no UI/API authorization expansion; existing Jev capability/site restrictions remain. V: the approved parent and owner continuation authorize development; merge/live/deploy remain human gates. Pre-design and post-design checks pass with this packaging exception. Two independent Astra technical passes must approve the artifact hashes before Sol development.

## Project Structure

- Existing: `runner/src/{jev-proxy.ts,jev.ts,index.ts,queue.ts,queue-retirement.ts,stats.ts}`; `agent/lib/{jev.sh,cost.sh}`; `agent/hooks/{jev-guard.sh,claude-settings.json}`.
- Planned focused tests: `runner/src/jev-deadline.test.ts`, `agent/hooks/jev-guard.deadline.test.sh`; extend existing proxy, Jev, cost and report tests.
- Contracts/data model/validation: [admission-deadline.md](contracts/admission-deadline.md).

## Design and caller wiring

1. Keep `byToken` and run→token lookup as authority. Store ledger separately by run ID. Reserve/check in one synchronous section before `jevDecide`; freeze attempt ID there and permit the existing v2 result generator to accept that internal ID without allowing a caller to forge it.
2. Snapshot caps when the ledger is created; subsequent configuration reductions may tighten but never reset cumulative usage. Malformed requests debit only available allowance; busy requests do not debit. Count admitted attempts even when proven pre-dispatch failure releases the spend reservation.
3. Wire mint/revoke/sweep/retirement to retain ledger ownership and unresolved tombstone until run namespace retirement. Expiry/revocation never means run retirement. Retain cumulative settled counters and unresolved fences until the authoritative runs row is terminal and an explicit no-remint tombstone prevents that run ID from ever minting another capability. `mintJevCapability` must reject retired run IDs. A known-settled live run remains accounted after expiry/sweep; cleanup cannot reset its allowance. Unresolved entries remain fenced for the runner lifetime. Bound ledger growth by refusing new auxiliary admission when the configured live-ledger ceiling is reached, never evict unresolved entries. Default ceiling derives from current bounded active-run capacity; record it beside the existing limit, not an undocumented constant.
4. Propagate additive `{ signal?, remainingMs? }` internally and optional validated `remainingMs` in proxy request. Use monotonic elapsed time at each local hop. Compose timeout and abort signals through response JSON consumption; classify possibly dispatched errors conservatively.
5. At Express, abort on `req.aborted` and premature `res.close` while `!res.writableEnded`; normal `req.close` after body read must not cancel. Remove listeners/timers in finally. Include route body-parse elapsed in remaining duration; a shorter caller budget always wins.
6. Guard starts semantic duration before state/question serialization and clamps to `min(4000, remaining outer time)`. Both shell transports derive curl's decimal-second timeout from the same remaining duration. An independent outer subprocess deadline protects against a stalled proxy or pre-request helper; preserve immediate local-floor path and clean temporary artifacts.
7. Add the bounded durable v2 accounting journal defined in the contract, independent of best-effort shadow logging and guard temporary files. Preserve `sum_cost_usd` as numeric known subtotal compatibility. Wire `agent/run.sh:emit`, `agent/spec.sh:emit`, `agent/reconcile.sh:emit` to a shared coverage helper returning `{knownCostUsd,unknownAttemptCount,costCoverage,receiptRevision}`; emit those additive fields alongside legacy `costUsd` subtotal. Update `runner/src/queue.ts:FinishResult`, `parseFinishResult`, `finish`, restart/cancellation reads and `finishRunInner` to retain/reconcile coverage against runner-authoritative journal before settlement. Update `budget-reservations.ts:settleRunReservations` with an optional coverage input: incomplete coverage keeps unresolved reservations/unknown fence, never settles all reservations as provider-reported using a subtotal. Preserve existing unrelated legacy semantics when the additive envelope is absent, but label that run unqualified for complete Jev-spend evidence. No generic billing engine.
8. `runner/src/stats.ts` permanent terminal cache is permitted only for finalized complete accounting at a matching receipt revision. Recompute incomplete/in-flight runs and invalidate the short aggregate cache on authoritative settlement; late post-revocation known receipt updates subtotal and coverage once without duplicate cost. Include admitted unknowns in the coverage snapshot before the worker exits, so absent temporary receipt cannot mean complete.

## Migration and rollback

No new database table is required for the process-local limiter. Durable bounded accounting journals and terminal no-remint tombstones use existing run/data storage. Read legacy result files as unjoined/incomplete, never invent attempt IDs or known zero bills. Additional coverage fields are optional for older consumers. Keep merged slice 6–7 log and report formats compatible. A restart revokes capabilities as today; ledger reset is not permission to recreate a prior live run. Roll back advisory admission by disabling new Jev calls, preserving deterministic floor and receipt evidence. Do not restore token-reset overshoot or clear unknown exposure to resume work.

## Verification and release

Follow [contract validation](contracts/admission-deadline.md#validation). Record `runner/package-lock.json` SHA-256, installed Express/tsx/TypeScript versions, Node version, harness binary version and image manifest when available. Run the declared `npm run typecheck` and `npm test` from `runner`, Bash syntax/shellcheck and focused shell/report regressions. Run required CI lanes without publishing proof images or deployment absent owner authorization. Separate local stub runtime proof from installed harness execution, CI, promotion and production health.

## Complexity Tracking

Only approved exception: multi-slice group PR. The implementation adds a run ledger and narrow duration/cost fields; it does not introduce a queue, generic orchestration API, provider retry engine or new SDK.
