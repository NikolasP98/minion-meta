---
id: 2026-10-11-hub-corpus-pipeline-scaling
title: Brain-corpus pipeline — where it runs, when, how, and on what database (post-incident 2026-10-11)
status: draft
created: 2026-10-11
updated: 2026-10-11
repos: [minion_hub]
tags: [data, infra, migrations, logic]
value: 9
effort: L
---

# Brain-corpus pipeline scaling (incident 2026-10-11)

## Owner ask (verbatim)

> "note that this is for a SINGLE org, now imagine scaling up to tens of orgs. How do we
> manage to handle these ops? Please look into these heavy operations and find a way to
> optimize performance. Where should this run? When? How? Are we using the correct
> database solution for what we're implementing?"

## AS-IS — what happened and what the numbers say

**Timeline.** 03:25Z the daily `/api/brains/reconcile/tick` enqueued the conversation and
business reconcile jobs for every org (as it does every day). 04:05Z hub #479 registered
`/api/jobs/tick` as a 5-minute Vercel cron; that route also runs `runTick()` (bg_jobs),
which nothing had scheduled since July. Seven `brain_corpus_*` jobs started advancing 50 s
every 5 min. From ~18:50Z Postgres logged statement timeouts every minute; Supavisor
checkouts failed ("authentication did not complete within 15000ms"); Supabase Auth
`/token` returned 504 on every password grant; by 23:00Z every pooled hub request was
`ECHECKOUTTIMEOUT`. Hotfix #485 made bg_jobs opt-in (`?jobs=1`); #486 removed the cron.

**Instance.** Supabase Micro: `max_connections 60`, `shared_buffers 224MB`,
`effective_cache_size 384MB`, `work_mem 2184kB`, `statement_timeout 2min`.

**Working set.** `messages` 1.57 GB (457 MB heap, 1.1 GB indexes, ~720k rows);
`knowledge_chunks` 1.12 GB (vectors); `knowledge_documents` 306 MB (~135k rows);
`parties` 5 MB. Roughly 3 GB hot data against 384 MB of cache.

**Lifetime stats (since 2026-07-26).** Buffer cache hit 58 %. Temp spill 2.9 TB.
`knowledge_documents`: 115,544 sequential scans reading 12.7 billion tuples.
`messages`: 9,056 sequential scans reading 3.6 billion tuples.

**Top statements by total DB time (pg_stat_statements):**

| Statement | Calls | Total | Mean | Rows |
|---|---|---|---|---|
| tombstone sweep `update knowledge_documents … from knowledge_sources … not exists (messages …)` | 90,525 | 34 h | 1.4 s | 0 |
| `select lower(trim(m.channel)) … from messages` (thread scan) | 2,870 | 15 h | 18.6 s | 74k |
| `count(distinct (chat_id, to_char(month)))` discovery aggregate | 5,208 | 13.5 h | 9.3 s | 30k |
| `select normalized_channel … from messages` (segment load) | 5,198 | 8 h | 5.7 s | 4.3M |
| `update knowledge_sources set status = case when expectedDocuments > (select count(*) …)` | 92,823 | 7 h | 0.3 s | 92k |
| `update bg_jobs set lease_until …` (heartbeat — a victim) | 8,391 | 6 h | 2.8 s | 8k |

The top statement touches zero rows and has run ninety thousand times. The pipeline map
(agent audit, 2026-10-11) shows why: the tombstone sweep and the discovery aggregate run on
every reconcile step and every dirty step; the snapshot guard re-reads the page's
messages three times per effect page (bind, embed, commit); the business guard reads the
*whole* source table per page because `tableQuery` is called without a cursor; documents
and chunks are upserted one statement at a time on the conversations path; and
`knowledge_documents.metadata->>'chatId' / 'segmentMonth'` and `knowledge_sources.config`
/ `watermark` have no index at all. `messages_conversation_corpus_scan_idx` exists only via
`scripts/ensure-conversation-corpus-index.ts`, not a migration.

**Scaling arithmetic.** One org with 720k messages cost ~34 h of DB time on the sweep
alone over the stats window. Each tenant adds its own full ledger scan per reconcile
step; with the 14-domain business reconcile that is ≥ 52 unbounded tombstone sweeps per
org per day. Ten orgs of FACES' size on this design is not a tuning problem; it does not
run.

## TO-BE — decisions

### Where
- **OLTP stays on Postgres (Supabase).** The app's transactional surface (POS, scheduling,
  CRM, RLS per org) is a good fit and is not the bottleneck.
- **Corpus building leaves the request path and the OLTP instance's hot hours.** It runs
  as a worker on the netcup box (the gateway host already runs crontab ticks), one org at
  a time, through a single long-lived connection *outside* Supavisor transaction mode, with
  `statement_timeout` and `work_mem` set per session. Vercel functions (300 s cap, pooled
  checkouts) are the wrong execution venue for hour-long batch work.
- **Vectors move off the OLTP heap.** `knowledge_chunks` (1.1 GB of embeddings, HNSW
  dropped for storage, exact cosine scans) is the single largest object on a 1 GB instance.
  The Qdrant storage mode already exists (`docs/runbooks/brain-vector-qdrant.md`,
  `brain_vector_outbox`); make it the default and keep only chunk text + hashes in Postgres.
  Alternative if Qdrant is not wanted: a second Supabase project for the corpus with its
  own compute, written to via the outbox — same isolation, less new infra.

### When
- **Incremental on ingest, not nightly full reconcile.** The dirty-conversation path
  already exists (`enqueueConversationBrainChanges`); it should be the only steady-state
  producer. The daily reconcile becomes a weekly consistency check per org, staggered
  (org N at hour N mod 24), outside each org's business hours (the inbox design already
  has per-org availability windows).
- **Never during a tenant's open hours**, and never more than one corpus job per instance
  at a time (a global advisory lock, `pg_try_advisory_lock(hashtext('corpus'))`).

### How (the statements)
1. Tombstone sweep: replace the per-document `not exists (messages …)` anti-join with a
   set-based diff against the already-computed discovery result for the page, keyed on an
   indexed `(org_id, source_id, segment_month)` column promoted out of `metadata`.
2. Discovery aggregate: run once per reconcile *run*, persist the result in the job
   cursor, never per step. Add the partial predicate so it hits
   `messages_conversation_corpus_scan_idx` (ship that index in a migration).
3. Snapshot guard: a ledger fingerprint (`max(id)`, `count(*)` per chat key) instead of
   re-reading page rows three times; business guard must pass the cursor.
4. Batch document/chunk upserts on the conversations path (the business path already
   batches 100/8).
5. `knowledge_sources.status` recomputation: maintain `document_count` incrementally
   instead of a correlated `count(*)` per update.
6. `bg_jobs`: composite index `(status, lease_until, updated_at)`; `runTick` claims with
   `FOR UPDATE SKIP LOCKED`.
7. Every rule in the inbox evaluator gets an EXPLAIN gate in CI against the QA baseline
   (the `crm.dni_pending` query took 11–15 s on the saturated instance — it is a seq scan
   over `parties` with jsonb predicates).

### Database sizing (regardless of the above)
Micro is undersized for this working set today, single org: 58 % cache hit and 2.9 TB
of temp spill are structural, not incidental. Minimum **Small (2 GB)** for the OLTP
instance; **Medium (4 GB)** if `knowledge_chunks` stays in it. Upgrading restarts the
instance (minutes) and is the owner's call (billing). This is the one action that helps
immediately and does not depend on code.

### Answer to "are we using the correct database solution?"
Postgres is right for the product (RLS tenancy, transactional POS/scheduling, one
schema). It is wrong *as currently used* for two things: embeddings storage/search on a
1 GB instance, and hour-long batch scans sharing the OLTP pool with logins. The fix is
separation (worker host, vector store, scheduled windows, sized instance), not a
different database for the app.

## DELTA — slices
- S0 (done): #485 bg_jobs opt-in; #486 cron removed; jobs cancelled.
- S1: instance upgrade (owner) + `messages_conversation_corpus_scan_idx` in a migration +
  `bg_jobs` composite index. Proof: cache hit > 95 % over a day; no statement timeouts.
- S2: statement fixes 1–5 with EXPLAIN assertions in `*.sql.integration.test.ts`.
  Proof: tombstone sweep ≤ 50 ms per page on the QA baseline; zero seq scans on
  `knowledge_documents` during a reconcile.
- S3: worker on netcup (`health-gated-tick jobs ?jobs=1`, advisory lock, per-org windows,
  weekly reconcile); Vercel cron for `/api/jobs/tick` returns for the inbox evaluator only
  once S2's EXPLAIN gate exists.
- S4: Qdrant (or corpus project) as default vector storage; `knowledge_chunks.embedding`
  dropped from the OLTP instance.

## Open ends
1. The netcup crontab `health-gated-tick jobs` line is outside the repo and unverified;
   with `?jobs=1` required it currently advances nothing.
2. `brain_corpus` jobs were cancelled by hand (status `cancelled`); the daily 03:25Z
   reconcile will enqueue new ones tomorrow — they will sit `queued` until S3.
3. The Supabase dashboard's query-performance page polls `pg_stat_statements` at 12–18 s
   per call every 1–2 min while open; close it during incidents.
4. Inbox reminders are paused (no cron) until S2's EXPLAIN gate lands.
