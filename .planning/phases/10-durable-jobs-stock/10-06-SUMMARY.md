---
phase: 10-durable-jobs-stock
plan: "06"
status: complete-private-candidate
requirements-completed: []
plan_sha256: 104eac725ef93f7b6f6e4dfab381638af9586e9853ccd95f0880f0c026cd485a
snapshot: /home/nikolas/.cache/claude-tmp/10-06-k4v9tq/minion_hub
snapshot_base: origin/feat/durable-jobs-stock-chain-10-01-10 @ b055798ed3daa57a745a9e26ce2fc9409e9266ca (hub PR #248 chain, not master)
executor: Claude (continuation of the rate-limited first attempt in the same snapshot)
owned_files:
  - path: src/server/services/brain-corpus-jobs.service.ts
    before: ec8778cc07f595735096887474360262c7ddf3da71cb42960f78fdfe9fea755b
    after: ff668ee13f60b2e0bcdf645b8c2e36cbbdfeccf46872a56e209e0d5b5e445ab3
  - path: src/server/services/brain-corpus-jobs.service.test.ts
    before: c6d6c7305250b5301e04f3fa729f4e58b7051c36201a1ae5dd5e2217f1061bf8
    after: 7923cd749c62e19cad10f87bc7e483954ac149e60aa3c7af5c239c987de8b9db
  - path: src/server/services/brain-corpus.service.ts
    before: a1174a105872527a1ec47a5a1d3da331ff5b55654ae72d7f2c1eb5f96297a05d
    after: aef8869913ac0269f4c7baf0dc09444d09acf081f97554e40606ad605d859558
  - path: src/server/services/brain-corpus.service.test.ts
    before: a1910db691579d735ccf9d830f967223bf3c008fccbc014907dfb6afae3ff714
    after: a1910db691579d735ccf9d830f967223bf3c008fccbc014907dfb6afae3ff714  # unchanged, compatibility evidence
  - path: src/server/services/brain-corpus-empty-source.service.test.ts
    before: 62fb25f204fae26599d1215150362ad4dd334bd2c36f64a2528f9b2502b755cb
    after: 62fb25f204fae26599d1215150362ad4dd334bd2c36f64a2528f9b2502b755cb  # unchanged, compatibility evidence
  - path: src/server/services/brain-business-corpus-jobs.service.ts
    before: deadc1b73084857b83667b51af4a1a24e63022bc0affd96e6de974d1dc2f5794
    after: f8a323103f3412e8f01455bcbb62f5432749d38a06415659e16011e66a122558
  - path: src/server/services/brain-business-corpus-jobs.service.test.ts
    before: 36706246f9cb727877a5f842ebc91f637c746d08b53ae23eae03d2787fe17a3c
    after: 98a3876326a8c9dbb0095ec4b84a41d490ddb22dbb1f435f8b4353ba34356492
  - path: src/server/services/brain-business-corpus.service.ts
    before: a5bfb5ce162bd2b891a4955a945cbc53462093d1fdf71757f589201bd9f44198
    after: 2d6aab7479c2d2958e19f746b3861a2774883a97a6c4da9d797b692191e3cf72
  - path: src/server/services/brain-business-corpus.service.test.ts
    before: ffe377e368c33b389ac8edee6403e59759cc9d184406c9972bd96586b42193ec
    after: ffe377e368c33b389ac8edee6403e59759cc9d184406c9972bd96586b42193ec  # unchanged, compatibility evidence
  - path: src/server/services/brain-corpus.effect-ownership.sql.integration.test.ts
    before: absent
    after: 6c3f97715e12df0d413a267eec3249df589167c37737c4867edf140c1645375f
---

# 10-06 corpus job ownership and effect receipts

Conversation (`brain_corpus_conversations`), legacy WhatsApp (`brain_corpus_whatsapp`) and business (`brain_corpus_business`) jobs now run every downstream write through the shared 10-07/10-09/10-10 foundation: `withOwnedJobScope` for setup/failure/health transactions, `bindJobEffectPage` / `runJobPageEmbeddings` / `commitJobEffectPage` for prepared pages, and the job's exact next cursor committed inside the last page transaction. Provider calls run outside every database transaction. Non-job callers keep their existing `withOrgCore` paths and no job fencing is claimed for them.

## Snapshot and continuation

- The first attempt (terminated by a rate limit) had already applied the source edits, a passing unit run and a 12/13 native run in `/home/nikolas/.cache/claude-tmp/10-06-k4v9tq`. Its worktree was detached at `577f9f27` with a local `vitest.config.ts` edit byte-identical to the branch head's. I inspected the edits and logs, judged them sound, and continued in place: `git reset -q b055798e` moved the detached HEAD to the PR #248 head (the `vitest.config.ts` diff vanished; no other file changed), then I fixed the remaining failures below. No commit, stash, branch, push or lockfile change was made; `/home/nikolas/.cache/claude-tmp/hub-10x` was not touched.
- Continuation fixes: (1) `job()` fixture helper typed explicitly (33 svelte-check errors in the new test), (2) the business deletion assertion compared a status multiset instead of relying on random-uuid `external_id` order (the one native failure), (3) native `describe` blocks carry `timeout: 30_000` because their cases legitimately wait on real backends (`advanceJob` budget 20 s, `until()` 8 s) and the 5 s default failed 3 cases under machine load from other agents, (4) Prettier formatting of the edited regions (baselines were Prettier-clean, so the diff stays scoped), (5) one `TODO(handoff)` at the page-capacity ceiling (below).

## Task 1 — conversation and legacy job paths

`brain-corpus.service.ts` gained the shared corpus job layer used by both handlers: `CorpusJobContext` (execution + current cursor + progress projection), `corpusScope` (owned RLS transaction when a job context is present, `withOrgCore` otherwise), `classifyCorpusJobError` (`busy` / `fenced` / `superseded` / `ordinary`), `corpusEmbeddingPolicy` (active vector mode is part of receipt identity: `embedded` with the pinned provider descriptor, `disabled`, or `qdrant`), `packCorpusPages` (greedy split into foundation-sized pages: 64 heads / 256 chunks / 2 MiB) and `publishCorpusPages` (bind → embed → commit per page; `finalize` and the exact next cursor ride in the last page's commit; an intermediate page re-commits the unchanged cursor). Receipt family `brain.corpus.conversation`, entity `${sourceId}:${externalId}`, source hash = document content hash, pipeline `conversation-corpus-v1/text-embedding-3-small` — independent of job type, job id, lease and dirty/reconcile scheduling.

`ensureMasterBrain`, `discoverConversationSources`, `ensureConversationSource`, `ensureConversationsFocusedBrain`, `markConversationSourceFailure` (with optional `nextProgress`) take an optional job scope. `persistConversations`, `reconcileDeletedConversationDocuments` and `markVerifiedEmptyConversationSourcesReady` were split into `*Tx` bodies so the owned page commit can run them inside its own transaction; the public non-job wrappers are unchanged. `syncConversation` / `backfillConversations` accept the optional job context: with it, they prepare under an owned scope, then `publishOwnedConversations` binds the page with `conversationSnapshotGuard` (re-normalizes the page's ledger rows under head/domain locks and throws `superseded` when any expected content hash differs), publishes through `persistConversationsTx` (existing Qdrant active-generation check and outbox trigger behavior preserved), and finalizes tombstones / verified-empty health in the same commit as the cursor. Page limits (25 reconcile units), dirty cursor fields, channel default for legacy WhatsApp, bounded failure notes (20), monthly hints and queued merge semantics are untouched.

`brain-corpus-jobs.service.ts`: both registrations pass `JobExecution`; `nonOrdinary()` classifies before per-conversation failure handling — `fenced` (ownership_lost / indeterminate / owner_missing) rethrows with a self-classifying message and touches nothing; `busy` yields the unchanged cursor; `superseded` re-prepares up to `SUPERSEDED_RETRIES = 2` (tracked in the cursor's `attempts`) before counting as an ordinary failure. Ordinary failures commit `markConversationSourceFailure` together with the exact advanced cursor under ownership. A fenced failure of the failure write itself is rethrown, never logged past.

## Task 2 — business domain pages

`brain-business-corpus.service.ts`: family `brain.corpus.business`, entity `${sourceId}:${externalId}`, pipeline `business-corpus-v1/…`. `ensureBusinessKnowledgeSources` / `ensureBusinessKnowledgeSource` / `recordBusinessKnowledgeDomainError` accept the optional job scope (non-job pre-enqueue setup stays separately authorized). `persistBusinessDocuments` and `reconcileBusinessDeletions` were split into `*Tx` bodies. `backfillBusinessKnowledgeDomain` with a job context prepares under an owned scope, then `publishOwnedBusinessPage` binds with `businessSnapshotGuard` (re-reads the page's records from the domain table SQL and compares normalized content hashes), publishes through `persistBusinessDocumentsTx`, and runs `reconcileBusinessDeletionsTx` in the final page's commit with the domain cursor. Job-owned pages leave error recording to the wrapper (no double record). Deletion identity SQL, domain list and 50-record pages are unchanged.

`brain-business-corpus-jobs.service.ts`: `fenced` rethrows; `busy` / bounded `superseded` yield the cursor; only current-owned ordinary failures increment `failedDomains`, and that increment, the source error and the exact next cursor commit in one owned transaction.

## Task 3 — native qualification

`brain-corpus.effect-ownership.sql.integration.test.ts` (13 cases) runs the real handlers, corpus services, foundation and `bg-runtime` against the marked disposable PostgreSQL 17.10 (`minion_qc_corpus` on 127.0.0.1:55441, marker `minion-360-disposable:v1`, owner `minion_qc`, restricted `app_ledger` with `rolsuper=false, rolbypassrls=false`, no `bg_jobs` UPDATE privilege). Only `fetch` (embedding provider) and the pool selector are replaced; the fixture applies the authored migrations `20260909090100`, `20260909090300`, `20260909090400`, `20260909090500`, `20260702120000_brains`, `20260721210000_unified_brain_corpus`, `20260723010000_brain_vector_outbox`, `20260725030000`, `20260725183500`, `20260725193500`, `20260725195000` into a random `qc_job_stock_<32hex>` schema with mechanical `public.` substitution, plus synthetic `messages` / CRM / `sales_orders` tables under forced RLS. Cases: dirty publication with receipts+health+cursor in one commit (1 fetch); legacy/current duplicate share one admission (1 fetch, 1 head); dirty/reconcile overlap converge (1 fetch, 1 unit); takeover cannot publish/health/advance and the next owner sees `indeterminate` (1 fetch); cancellation between two 64+1 transport batches (2 fetches, replacement job `indeterminate`); lost response leaves an admitted receipt and never pays again; older snapshot never publishes over a newer source and re-prepares (2 fetches, 1 head); rollback between publication and progress keeps received vectors, retry publishes without paying; reconcile tombstones + verified-empty health + empty final page cursor (2 fetches total); Qdrant-owned mode publishes canonical text with 0 fetches and rejects a mismatched active generation through the real `brain_vector_app_generation_mode()` function; tenant scoping under forced RLS with the restricted role; two business jobs share one admission and reconcile deletions; stale business page re-prepares after a record changed (2 fetches, 1 head).

## Gate results (final content, snapshot `checks/`)

| Gate | Command (from snapshot `minion_hub`) | Result | Log |
|---|---|---|---|
| Task 1 unit | `node node_modules/vitest/vitest.mjs run brain-corpus-jobs.service.test.ts brain-corpus.service.test.ts brain-corpus-empty-source.service.test.ts` | 3 files, 36 passed, exit 0 | `checks/unit-task1.log` |
| Task 2 unit | `… run brain-business-corpus-jobs.service.test.ts brain-business-corpus.service.test.ts` | 2 files, 24 passed, exit 0 | `checks/unit-task2.log` |
| Task 3 native | `env -i PATH HOME TMPDIR LANG=C.UTF-8 MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55441/minion_qc_corpus REQUIRE_CORPUS_POSTGRES=1 node node_modules/vitest/vitest.mjs run brain-corpus.effect-ownership.sql.integration.test.ts --maxWorkers=1` | 1 file, 13 passed, 0 skipped, exit 0 (29.2 s under load) | `checks/native-task3.log` |
| Prettier (7 edited files) | `prettier --check …` | exit 0 | `checks/prettier-scoped.log` |
| `git diff --check` | | exit 0 | `checks/git-diff-check.log` |
| Focused tsc (4 source files + ambient) | `tsc -p ../types.tsconfig.json` | exit 0, no output | `checks/tsc-focused.log` |
| Full svelte-check (env-free) | `svelte-check --tsconfig ./tsconfig.json --output machine` | 10786 files, 2 errors, 0 warnings, exit 1 — both errors are `src/hooks.client.ts` `PUBLIC_POSTHOG_*` `$env/static/public` members, absent because the snapshot has no `.env`; 0 errors in owned files | `checks/svelte-check.log` |
| svelte-check env probe | same, after `svelte-kit sync` with `PUBLIC_POSTHOG_KEY= PUBLIC_POSTHOG_HOST=` set empty | 10786 files, 0 errors, 0 warnings, exit 0 (content before the last comment/timeout edits; `hooks.client.ts` does not depend on owned files) | `checks/svelte-check-envprobe.log` |

Runtime: Node v22.23.2, Bun 1.3.4, Vitest 4.1.10, svelte-check 4.7.6, TypeScript 5.9.3, embedded PostgreSQL 17.10 from `/home/nikolas/.cache/claude-tmp/15-05-6/embedded-postgres/native` (`checks/freeze.json`, `pg-start.sh`, `pg-stop.sh`). The cluster was stopped after the final run (`checks/pg-stop.log`). Earlier runs from the first attempt (`native-1..3`, `native-corpus-final`, `unit-1/2`) are retained as red/green history, not acceptance.

## Deviations

- Continued the prior snapshot rather than starting fresh (see above); rebased its detached HEAD from `577f9f27` to `b055798e`.
- `brain-corpus.service.test.ts`, `brain-corpus-empty-source.service.test.ts` and `brain-business-corpus.service.test.ts` are owned but unchanged: they pass against the new source and serve as the required non-job compatibility evidence.
- The native `describe` timeout (30 s) is a fixture setting, not a source behavior change.

## Gaps / pending evidence (not green)

1. **pgvector is not installed on the embedded substrate.** The fixture asserts `pg_extension` has no `vector`, maps `vector(1536)` to a text domain and drops the HNSW index DDL. Vector storage/ANN semantics remain pending an actual pgvector substrate (same gate 10-07 recorded).
2. **Backend-kill qualification** remains gated on 12-04; no fault injection was performed.
3. **Serving-index outbox trigger** for Qdrant-owned chunks lives in the gateway repo; the Hub base trigger ignores text-only inserts, so the test asserts 0 outbox rows and `queued` source state, not the worker's behavior. No Qdrant service was used.
4. **Page capacity ceiling** — `TODO(handoff)` in `packCorpusPages` (`brain-corpus.service.ts`): a single month segment or business record above 256 chunks / 2 MiB cannot be embedded through the job path and surfaces as an ordinary bounded failure; the pre-adoption path had no ceiling. Proposal text for root's ledger: *"Corpus sources larger than one job-effect page (256 chunks or 2 MiB of chunk text) fail the job path with `capacity`; decide a multi-page-per-source manifest (raise `job-effect-pages.service` LIMIT or split one entity across pages under one revision) before such sources can publish again; pointer `minion_hub/src/server/services/brain-corpus.service.ts` packCorpusPages."*
5. **Registration TODO outside ownership** — `src/server/services/bg-runtime.ts:54` still names `brain_corpus_conversations/whatsapp` and `brain_corpus_business` in its `TODO(handoff)`. That file is not in this plan's `files_modified`; root should trim those entries once this candidate is accepted.
6. Full Hub build, aggregate regression, migration/drain ordering and deployment remain root-owned release gates; nothing here is a release certificate, and JOB-01/JOB-02 are not globally closed.
