# Gateway validation guide

## Prerequisites

Use only isolated Gateway clone, frozen pnpm 10.29.3 lock and Node 22.23.3, disposable alerts.db/state directories and loopback provider stubs. Parent setup receipt records exit0/unchanged lock. Keep production credentials/network disabled. Do not symlink another installation as SDK proof. Planned filenames below must be created; listing a command is not passing evidence.

## Focused commands

```bash
pnpm exec vitest run src/auto-reply/reply/dispatch-provenance.test.ts src/channels/impl/telegram/inbound-provenance.test.ts
pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/authority.test.ts extensions/alert-watcher/src/provenance.test.ts extensions/alert-watcher/src/classification-work.test.ts extensions/alert-watcher/classification-recovery.test.ts
pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/delivery-bridge.test.ts extensions/alert-watcher/src/delivery-recovery.test.ts
pnpm exec vitest run src/infra/outbound/delivery-queue-retention.test.ts
pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/reply-flow/store.test.ts extensions/alert-watcher/src/reply-flow/handle-reply.test.ts extensions/alert-watcher/config.test.ts
pnpm exec vitest run src/plugins/loader.forks.test.ts
pnpm exec vitest run src/drones/host.test.ts
pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/usage-finalization.test.ts extensions/alert-watcher/src/jev-shadow-eligibility.test.ts
pnpm exec vitest run src/gateway/server-core/server-cron.binding.test.ts src/platform/cron/normalize.test.ts
pnpm exec vitest run --config vitest.e2e.config.ts src/gateway/server.cron.e2e.test.ts
pnpm check
pnpm tsgo
pnpm test
```

Run existing alert-watcher index/classifier/suggestion/store/gate/envelope/destination suites and outbound queue operator/recovery/cron suites under their declared Vitest configs. Keep test worker count <=16. Record exact source SHA/SDK/lock version alongside red→green evidence and full command exits. No browser work is required for this backend-only group.

## Actual process and storage proof

A12/A13 require two independent processes opening the same file-backed SQLite DB, synchronized claim barriers and child death. A mocked repository or two calls against one in-memory map cannot substitute. Kill after queued commit, admission commit, provider response before local receipt, received commit, and final materialization. Count stub calls and assert admitted uncertainty/no recall, received replay-local-only, invalid SDK result usage preserved, negative terminal state, lease-loss fencing, bounded retries/dueAt and caps.

A14/A15 require real queue files and leases. Kill after SQLite recipient admission, queue enqueue, durable in-flight checkpoint, provider acceptance before accepted checkpoint, accepted checkpoint before SQLite first-sent/reply transaction, and that transaction before acknowledgement. Existing recovered in-flight state becomes uncertain and cannot call the provider again. Include missing/mismatched queue entry, stale queue generation, filesystem write/fsync failure, one sent/one failed recipient, current recipient revoke, expired payload, redacted queue recovery and duplicate original source after cleanup. Assert exact provider call counts and no re-enqueue from admitted uncertainty. For two recipients and repeated recovery assert one keyed pending reply, original acceptedAt-based expiry, unchanged suggestions/claim state, actual owner-selection/forward compatibility and queue ack only after the whole local settlement. Suggestion kills after admission, terminal result and recipient materialization yield no second suggestion call and explicit empty fallback when unknown.

Migrate a pre-change database twice; preserve old visible complaints while old pending rows are legacy-unreconciled and boot fan-out disabled. Restart after rollback admission-off; no old worker replays admitted records. Retire namespace before deleting tombstones; replay from retired namespace remains rejected. Assert payload copies disappear from DB (including complaints and receipt-bound pending_replies), queue/mirror/error files and optional usage copies without deleting minimum replay identity. Start generic queue recovery first on an unredacted expired watcher file with plugin absent/disabled; no provider call may occur. Test expiry after backoff, after async preparation and between chunks, tombstone fsync/cleanup failure, retained accepted evidence, unexpired watcher and unrelated legacy entries. Physical cleanup during downtime is not claimed.

A11/A13 authority cases include stale JSON on DB mirror miss, owner reassignment, expired last-good snapshot, malformed/absent mapping/account and positively configured explicit local-unscoped JSON account, at admission and received settlement. A16 uses the installed SDK with transport stubs for schema failure/fallback and overlapping runs; admitted invocation IDs do not imply hidden fallback-request counts. A crash after receipt commit before best-effort analytics must retain the exported bill without reemission or inference. A20 uses actual raw RPC normalization plus real cron service/store and stubbed provider/tools: blank/whitespace add/update rejects before normalization, add-null preserves omission/default semantics, update-null clears the optional field, and omission/aliases preserve stated compatibility, rejected candidate leaves memory/disk unchanged and session scope persists on reload. A30 drives actual strict plugin manifest validation→registration→resolved config for off/census/shadow and rejects active/malformed/extra fields; network stays denied. It uses frozen default/custom/idless/model-drift fixture records and asserts off/census zero extra calls; shadow baseline always runs, gate timeout stays unavailable and duplicate hooks cannot change denominator.

## Review and release boundary

Independent review reports Standards and Spec separately. Map A11–A16/A20gateway/A30gateway to concrete receipts. Full A20 additionally needs D tests and deployment qualification; full A30 additionally needs F report schema/denominator tests. Merge, deployment, production migration, live corpus/census and paid experiments remain explicitly gated. Any implementation open end needs exact code `TODO(handoff)` plus matching meta proposal before stopping.
