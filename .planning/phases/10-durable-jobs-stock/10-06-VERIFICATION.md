---
phase: 10-durable-jobs-stock
plan: "06"
verdict: complete-private-candidate
verifier: Claude executor (self-check; independent root review pending)
snapshot: /home/nikolas/.cache/claude-tmp/10-06-k4v9tq/minion_hub @ b055798e (origin/feat/durable-jobs-stock-chain-10-01-10)
---

# 10-06 goal-backward verification

Evidence pointers are relative to the snapshot `minion_hub/` unless prefixed `checks/` (= `/home/nikolas/.cache/claude-tmp/10-06-k4v9tq/checks/`). Native case names refer to `src/server/services/brain-corpus.effect-ownership.sql.integration.test.ts` and `checks/native-task3.log` (13/13, exit 0).

## Truths

| Must-have | Status | Evidence |
|---|---|---|
| Conversation, legacy WhatsApp and business jobs fence setup, embedding, publication, deletion, health/failure state and progress with current job and entity revision | Met (source + native) | `brain-corpus.service.ts` `corpusScope` → `withOwnedJobScope`; `publishCorpusPages` → `bindJobEffectPage` / `runJobPageEmbeddings` / `commitJobEffectPage` with `nextProgress`; `backfillConversations` / `syncConversation` job branches; `brain-business-corpus.service.ts` `publishOwnedBusinessPage`; both job files pass `JobExecution`. Native: "publishes a dirty conversation … in one owned commit" (receipts `units {total:2,published:2}`, source `ready`, cursor `next:1` after one commit); "a taken-over job cannot publish, change source health or advance" (0 documents, source still `processing`, cursor/error unchanged); "reconcile tombstones … commits the final cursor"; "two business jobs … reconcile deletions" (watermark `expectedDocuments` 2 → 1). |
| Duplicate/overlapping jobs cannot repeat an indeterminate paid request or publish an obsolete source revision over a newer corpus result | Met (native) | "legacy WhatsApp and current job types share one semantic admission" (1 fetch, 1 head, duplicate `indeterminate` then replays without paying); "dirty and reconcile scheduling … converge" (1 fetch, 1 unit); "cancellation between batches" (2 fetches, replacement `indeterminate`); "a lost provider response leaves an admitted receipt; retries never pay again"; "an older prepared snapshot never publishes over a newer source" (`conversationSnapshotGuard` throws `superseded`, chunk text contains only the newer version, 1 head); "a stale business page cannot publish or advance over a record that changed" (`businessSnapshotGuard`). |
| Existing dirty-cursor merging, page limits, failure accounting, tenant RLS and Qdrant generation selection remain compatible | Met (unit + native) | Unit: `checks/unit-task1.log` 36 passed incl. unchanged `brain-corpus.service.test.ts` / `brain-corpus-empty-source.service.test.ts`; `checks/unit-task2.log` 24 passed incl. unchanged `brain-business-corpus.service.test.ts`. `RECONCILE_BATCH` 25 / 50 unchanged; `.slice(-20)` failure notes unchanged; `failedDomains` only on ordinary current-owned failures. Native: "tenant scoping holds under forced RLS and the restricted role never touches bg_jobs" (`has_table_privilege('app_ledger','bg_jobs','update') = false`, cross-org chunk text isolated); "Qdrant-owned mode … rejects a mismatched active generation" (0 fetches; real `brain_vector_app_generation_mode()` function; mismatch error text asserted). |

## Artifacts

| Path | Provides | Check |
|---|---|---|
| `brain-corpus-jobs.service.ts` | Conversation and legacy job receipt/progress integration | `advanceBrainCorpusJob(job, execution)`; `nonOrdinary()` classification before failure accounting; both `registerJobHandler` calls at lines 400–401. sha256 `ff668ee1…5ab3`. |
| `brain-business-corpus-jobs.service.ts` | Business job receipt/progress integration | `advanceBusinessCorpusJob(job, execution)`; fenced/busy/superseded before `failedDomains`; error + cursor in one owned commit. sha256 `f8a32310…2558`. |
| `brain-corpus.service.ts` | Owned preparation/publication/deletion/health path | `CorpusJobContext`, `corpusScope`, `packCorpusPages`, `publishCorpusPages`, `publishOwnedConversations`, `*Tx` splits. sha256 `aef88699…9558`. |
| `brain-business-corpus.service.ts` | Owned business path | `publishOwnedBusinessPage`, `businessSnapshotGuard`, `persistBusinessDocumentsTx`, `reconcileBusinessDeletionsTx`. sha256 `2d6aab74…3f72`. |
| `brain-corpus.effect-ownership.sql.integration.test.ts` | Actual-engine concurrency and active-generation cases | 13 cases, two independent backends (distinct `pg_backend_pid`), marked database identity asserted before DDL. sha256 `6c3f9771…375f`. |

## Key links

| From → To | Via | Verified by |
|---|---|---|
| corpus-jobs → brain-corpus.service | `JobExecution`-backed `CorpusJobContext` through `syncConversation` / `backfillConversations` and nested writes | `grep -n 'job' brain-corpus.service.ts` shows every reachable write (`ensureMasterBrain`, `discoverConversationSources`, `ensureConversationSource`, `ensureConversationsFocusedBrain`, `markConversationSourceFailure`, prepare scope, `persistConversationsTx`, `reconcileDeletedConversationDocumentsTx`, `markVerifiedEmptyConversationSourcesReadyTx`) routed through `corpusScope` or the page commit when `job` is present. |
| business-jobs → brain-business-corpus.service | same contract through `backfillBusinessKnowledgeDomain` | `ensureBusinessKnowledgeSource(ctx, key, job)`, prepare scope, `publishOwnedBusinessPage`, `recordBusinessKnowledgeDomainError(…, {execution, nextProgress})`. |
| brain-corpus.service → job-effects / job-effect-pages | shared head arbitration and pinned page receipts | imports `withOwnedJobScope`, `jobEffectHeadId`, `bindJobEffectPage`, `runJobPageEmbeddings`, `commitJobEffectPage`; no second embedding implementation or receipt schema added (`git diff --stat`: only the 6 owned source/test files + the new test). |
| brain-business-corpus.service → same receipt family plumbing | `publishCorpusPages` reused with family `brain.corpus.business` | native business cases share `job_effect_units` / `job_effect_batches` tables with conversation cases. |
| native test → corpus-jobs | real handlers, native schema, controlled provider | only `$server/db/pg-pool`, `$server/ai-usage`, `$env/dynamic/private` and global `fetch` are replaced. |

## Threat-model controls

- Job owner / domain state: every job write runs under `withOwnedJobScope` (lease generation rechecked; see "a taken-over job cannot publish…").
- Tenant-scoped SQL vs privileged bookkeeping: `app_ledger` has no `bg_jobs` UPDATE; progress writes happen after role restoration in the foundation (native RLS case; `qc_reject_progress` trigger case proves progress and publication share one transaction).
- Local admission vs remote outcome: pinned page manifests (`pageKey` = prefix + sha256 of entity/sourceHash/requiredChunkKeys); indeterminate never replays (three native cases assert `fetchCalls()` unchanged).
- Fixture vs infrastructure: marker check in `openDisposablePostgres`, random schema, synthetic tenants, `env -i` runtime, no `.env`, no production URL.

## Not verified here (pending evidence)

- pgvector storage/ANN semantics (text-domain substitute), backend-kill (12-04), gateway-side outbox trigger, full Hub build/regression, migration ordering and deployment. The env-free full svelte-check shows only the two `hooks.client.ts` `PUBLIC_POSTHOG_*` errors; the env probe (`checks/svelte-check-envprobe.log`) shows 0 errors with those two public variables defined.
