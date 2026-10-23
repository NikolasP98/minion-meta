# Implementation Plan: Gateway watcher receipts and binding

**Branch**: `feature/agent-harness-c-gateway` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Use the existing watcher SQLite database, lifecycle and outbound queue. Add two narrow receipt tables, a bounded dispatcher and opt-in usage finalization. Tighten cron binding with existing fields. Keep complaint census/shadow disabled and expose fixture-tested export for group F. One group C PR targets registered `DEV`.

## Technical Context

Node 22.23.3; TypeScript ESM; pnpm 10.29.3 frozen lock; `node:sqlite` DatabaseSync; Vitest core/extensions configs; installed `@minion-stack/drone` 0.6.0. No new SDK release, queue server, generic workflow DSL or global job framework. Concrete schema/state/recovery interfaces: [receipts](contracts/receipts.md). SDK/result/export seam: [usage-shadow](contracts/usage-shadow.md). A20 seam: [cron-binding](contracts/cron-binding.md).

## Constitution Check

I: spec/plan/tasks before code. II: current source anchors and testable DELTA. III: owner explicitly groups these slices into one PR; branch safety and per-repo gates remain. IV: no Hub UI or public protocol expansion; existing watcher v1 envelope fields are append-only, and current auth/org scoping remains. V: development is authorized by the approved parent and owner continuation; merge/live/deploy still require human authorization. Pre/post-design checks pass with packaging exception. No unresolved design alternative; independent two-pass review must approve artifact hashes before implementation.

## Project Structure and real caller wiring

- Watcher `index.ts`: actual `message_inbound` and `message_received` adapters → source/policy admission → dispatcher. Service start migrates/open DB then starts dispatcher; stop fences generation, aborts active work, cancels timers and closes DB only after local settlement safety.
- New narrow `extensions/alert-watcher/src/{provenance,classification-work,delivery-bridge,jev-shadow-eligibility}.ts`; extend `store.ts`, `migrate.ts`, `dedup.ts`, `envelope.ts`, `destinations.ts`, `cooldown.ts` only as required.
- `classifier.ts` and `reply-flow/suggestions-drone.ts`: expose an optional bounded terminal-result observer or small internal result adapter before watcher-local validation. Both actual hook and flow callers select the opt-in host wrapper. Preserve old call forms.
- `src/drones/host.ts`: optional finalization mode; a new small `src/drones/run-with-usage.ts` may pair one fresh host with one run and final result. Unopted callers from TTS, session title, gmail, flow relay, llm-task, CLI and drones RPC keep behavior.
- `src/infra/outbound/{deliver,delivery-queue-store,delivery-queue-files,delivery-queue-recovery,delivery-queue-types}.ts`: existing durable sender plus narrow caller-managed redaction/tombstone helper, generation/lease protected; no change to unrelated callers' completion policy.
- `src/gateway/server-core/server-cron.ts`, `src/gateway/server-methods/cron.ts`, `src/platform/cron/service/{state,ops,jobs,timer}.ts`, `src/platform/cron/isolated-agent/run.ts`: share explicit-binding validation at effective add/update and execution boundaries. Actual final file set follows the narrowest existing dependency injection seam.

## Implementation sequence

1. Freeze source/lock/SDK pins and run merged slice 10 producer tests; read actual installed signature, not a mock that invents fields.
2. Implement A11 canonical admission and A12 real SQLite schema/transaction interfaces. Channel and agent subscriptions of the same configured watcher share a stable policy ID; config/model revisions are frozen payload bindings, not admission-key parts.
3. Implement A16 result capture before A13 paid-boundary integration, though their acceptance IDs retain parent numbering. A received SDK error persists supplied usage first and then fails; a terminal SDK schema failure cannot be relabeled a negative.
4. Wire A13 dispatcher and real plugin hooks. Add A14 queue bridge. Publish positive result plus final suggestion disposition and recipients atomically in A15; disable old boot retry for migrated legacy rows.
5. Add A20 validator and qualification proof independently from watcher. Add A30 eligibility/export only after receipt/usage proofs exist; shadow cannot alter baseline outputs.
6. Run crash/retention/migration tests, affected regressions and full repository gates; obtain independent code review. Group D/F consume versioned contracts, not direct cross-repo code edits.

## Migration, cutover and rollback

Use additive idempotent schema initialization with a schema/version marker in the existing migration mechanism; do not invent a third work table. Transactionally create classification and delivery tables/indexes/checks, plus legacy notification disposition metadata. Run upgrade twice on a disposable pre-change DB. Preserve complaint IDs/history and mark old pending notifications `legacy_unreconciled`; they never acquire invented recipients or provider success. Pause old notification work before cutover and never run old/new dispatchers concurrently.

First admission copies bounded immutable input/config/recipients and their hashes. Redelivery resolves its existing identity before current policy hash comparison. Configuration edits do not replay old work. Owner/policy disable and retirement cancel queued work and increment lease generations; admitted calls remain indeterminate or settle from positive evidence. Payload cleanup keeps replay hashes/state and mirrors queue cleanup under entry lease. Rollback disables new admission and old boot retry, keeps receipt readers and tombstones, and preserves admitted/uncertain work. No schema drop or pending reset is a rollback shortcut.

## Verification and release

Commands and exact proof cases are in [validation](contracts/validation.md). Minimum evidence: real file-backed SQLite with independent processes, real filesystem queue, provider stubs counting requests, installed SDK boundary, actual plugin hook wiring, cron add/update/execution wiring, `pnpm check`, `pnpm tsgo`, affected tests and repository-required full tests before push. No paid calls. Retain missing runtime evidence as a gate, not as an inferred pass from unit tests.

## Complexity Tracking

One-pr-group is the sole delivery exception. Two tables and one dispatcher are the parent-approved minimum. Optional helper files isolate boundaries; they are not a new framework. Legacy runtime access remains weaker and cannot masquerade as certified evidence.
