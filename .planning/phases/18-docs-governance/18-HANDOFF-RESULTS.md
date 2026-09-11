# Handoff ledger results

Generated 2026-09-10T05:44:01.105Z by `node scripts/qc/handoff-ledger.mjs`. Read-only: scans supported source for `TODO(handoff):` markers and cross-checks each against `proposals/`. Never edits source, never invents a marker.

109 marker(s) found; 20 hard issue(s); 3 advisory-only declared-site gap(s).

## Gate

FAIL — see issues below. This closure gate requires evidence, not a completed marker alone.

## Issues (gate-relevant)

- **orphan-missing-proposal-link** — meta:packages/workforce-client/src/client.ts:287
- **orphan-missing-proposal-link** — minion:minion/extensions/nostr/src/inbound-dispatch.test.ts:27
- **orphan-missing-proposal-link** — minion:minion/extensions/nostr/src/inbound-dispatch.ts:7
- **orphan-missing-proposal-link** — minion:minion/extensions/nostr/src/inbound-dispatch.ts:42
- **orphan-missing-proposal-link** — minion:minion/src/agents/minion-tools.ts:355
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/lib/plugins/bridge-protocol.ts:168
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/lib/plugins/compat.ts:71
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/lib/server/workforce-fetch.ts:220
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/server/services/crm-contacts.service.ts:215
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/server/services/crm-journey.service.ts:44
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/server/services/crm-similarity.service.ts:55
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/server/services/pos.service.ts:1393
- **orphan-missing-proposal-link** — minion_hub:minion_hub/src/server/services/pos.service.ts:1407
- **missing-target** — minion_factory:minion_factory/broker/src/policy.ts:69 (target proposals/2026-08-23-factory-runner-owned-role-executor.md)
- **orphan-missing-proposal-link** — minion_factory:minion_factory/runner/src/deployment-recovery-runtime.ts:69
- **orphan-missing-proposal-link** — minion_factory:minion_factory/runner/src/lifecycle.ts:30
- **orphan-missing-proposal-link** — minion_factory:minion_factory/runner/src/memory/read.ts:22
- **missing-target** — minion_factory:minion_factory/runner/src/queue.ts:1894 (target proposals/2026-08-23-factory-containment-effect-ledger-integration.md)
- **missing-target** — minion_factory:minion_factory/runner/src/queue.ts:4761 (target proposals/2026-08-17-factory-chat-session-resume-after-failed-turn.md)
- **orphan-missing-proposal-link** — minion_factory:minion_factory/runner/src/queue.ts:4857

## Advisory: proposal-declared sites with no matching TODO(handoff)

- proposals/2026-09-08-platform-qc-remediation.md names `drone/src/define.ts` but no TODO(handoff) references that exact file (may be legitimate; not fabricated, not gated).
- proposals/2026-09-08-platform-qc-remediation.md names `drone/src/run.ts` but no TODO(handoff) references that exact file (may be legitimate; not fabricated, not gated).
- proposals/2026-09-08-platform-qc-remediation.md names `drone/vitest.config.ts` but no TODO(handoff) references that exact file (may be legitimate; not fabricated, not gated).

## Every marker

|Source root|File:line|Proposal ref(s)|Status|
|---|---|---|---|
|meta|langgraph-server/src/flow/compile-flow.ts:731|proposals/2026-09-09-flow-sql-bindings-migration.md|open|
|meta|langgraph-server/src/flow/compile-flow.ts:746|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/cli/src/index.ts:25|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/client.ts:36|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/client.ts:60|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/client.ts:194|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/client.ts:307|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/shells.ts:36|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/shells.ts:59|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/shells.ts:233|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shared/src/gateway/shells.ts:599|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/acp-client.ts:88|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/bridge.ts:145|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/bridge.ts:306|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/bridge.ts:376|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/bridge.ts:394|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/config.ts:63|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/run-journal.test.ts:120|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/run-journal.test.ts:215|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/run-journal.ts:58|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/shells-bridge/src/run-journal.ts:198|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/workforce-client/src/client.ts:276|proposals/2026-09-08-platform-qc-remediation.md|open|
|meta|packages/workforce-client/src/client.ts:287|(none)|open|
|meta|scripts/qc/proposal-requirement-map.mjs:132|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/extensions/flows/src/data-nodes.ts:176|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/extensions/flows/src/data-nodes.ts:395|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/extensions/flows/src/data-paths.ts:213|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/extensions/nostr/src/inbound-dispatch.test.ts:27|(none)|resolved-claim|
|minion|minion/extensions/nostr/src/inbound-dispatch.ts:7|(none)|open|
|minion|minion/extensions/nostr/src/inbound-dispatch.ts:42|(none)|open|
|minion|minion/packages/plugin-ui-bridge/src/index.ts:219|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/packages/plugin-ui-bridge/src/index.ts:348|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/database-migration.ts:29|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/outbox.ts:184|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/outbox.ts:203|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/worker.ts:148|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/worker.ts:238|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/worker.ts:250|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/worker.ts:347|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/services/brain-vector/src/worker.ts:473|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/src/agents/minion-tools.ts:355|(none)|resolved-claim|
|minion|minion/src/infra/message-ledger-profile.ts:49|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/src/infra/message-ledger.ts:134|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/src/memory/sqlite-pragmas.ts:25|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/src/shells/manager.ts:616|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/src/shells/manager.ts:653|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion|minion/src/shells/manager.ts:949|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/scripts/faces-invoice-consumption-backfill-2026-08.ts:44|proposals/2026-08-28-hub-faces-insumos-reconciliation-followups.md|open|
|minion_hub|minion_hub/scripts/qc/trace-build-contained.mjs:1|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/scripts/qc/trace-build-contained.mjs:577|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/scripts/qc/trace-build-contained.mjs:620|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/scripts/qc/trace-build-graph.mjs:1|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/hooks.client.ts:23|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/hooks.server.ts:486|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/artifacts/artifact-bridge.ts:25|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/artifacts/artifact-bridge.ts:84|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/components/charts/Chart.svelte:105|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/plugins/bridge-protocol.ts:168|(none)|open|
|minion_hub|minion_hub/src/lib/plugins/bridge-protocol.ts:186|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/plugins/compat.ts:71|(none)|open|
|minion_hub|minion_hub/src/lib/server/artifacts/builder-prompt.ts:12|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/server/workforce-fetch.ts:74|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/lib/server/workforce-fetch.ts:220|(none)|open|
|minion_hub|minion_hub/src/lib/server/workforce-http-boundary.contract.test.ts:218|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/routes/(app)/home/+page.svelte:1173|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/auth/assistant-principal.ts:105|proposals/2026-09-09-assistant-query-delegation-restoration.md|open|
|minion_hub|minion_hub/src/server/services/assistant-query.service.ts:36|proposals/2026-09-09-assistant-query-delegation-restoration.md|open|
|minion_hub|minion_hub/src/server/services/bg-runtime.ts:54|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/brain-business-corpus-jobs.service.ts:134|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/brain-business-persistence.service.test.ts:20|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/brain-corpus-jobs.service.ts:339|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/brains.effect-ownership.sql.integration.test.ts:123|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/brains.service.ts:1032|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/brains.service.ts:1055|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/crm-contacts.service.ts:215|(none)|open|
|minion_hub|minion_hub/src/server/services/crm-funnel.concurrent.integration.test.ts:21|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/crm-funnel.concurrent.integration.test.ts:32|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/crm-journey.service.ts:44|(none)|open|
|minion_hub|minion_hub/src/server/services/crm-similarity.service.ts:55|(none)|open|
|minion_hub|minion_hub/src/server/services/finance-statements.service.ts:160|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/finance-statements.service.ts:440|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/groupchat.service.ts:389|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/groupchat.service.ts:538|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effect-pages.service.ts:92|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effect-pages.service.ts:235|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effect-pages.service.ts:274|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effect-pages.service.ts:535|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effect-pages.service.ts:538|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effect-pages.service.ts:602|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effects.service.ts:437|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-effects.service.ts:711|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/job-stock-concurrency.sql.integration.test.ts:513|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/src/server/services/pos.service.ts:1393|(none)|open|
|minion_hub|minion_hub/src/server/services/pos.service.ts:1407|(none)|open|
|minion_hub|minion_hub/src/server/services/stock.service.ts:1712|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/supabase/migrations/20260909090300_job_effect_receipts.sql:3|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/supabase/migrations/20260909090400_job_request_manifest.sql:11|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/supabase/migrations/20260909090500_job_effect_page_batches.sql:3|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/tests/dependencies/security-compatibility.test.ts:1|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/tests/e2e/ui-audit/certification.ts:174|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/tests/e2e/ui-audit/route-audit.spec.ts:189|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_hub|minion_hub/vitest.disposable.config.ts:10|proposals/2026-09-08-platform-qc-remediation.md|open|
|minion_factory|minion_factory/broker/src/policy.ts:69|proposals/2026-08-23-factory-runner-owned-role-executor.md|open|
|minion_factory|minion_factory/runner/src/deployment-recovery-runtime.ts:69|(none)|open|
|minion_factory|minion_factory/runner/src/lifecycle.ts:30|(none)|open|
|minion_factory|minion_factory/runner/src/memory/read.ts:22|(none)|open|
|minion_factory|minion_factory/runner/src/queue.ts:1894|proposals/2026-08-23-factory-containment-effect-ledger-integration.md|open|
|minion_factory|minion_factory/runner/src/queue.ts:4761|proposals/2026-08-17-factory-chat-session-resume-after-failed-turn.md|open|
|minion_factory|minion_factory/runner/src/queue.ts:4857|(none)|open|
