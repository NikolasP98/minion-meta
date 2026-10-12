---
id: 2026-10-12-hub-micro-debloat
title: Hub on a Supabase Micro — debloat ledger (background load, statements per page, shared GET transaction)
status: draft
created: 2026-10-12
updated: 2026-10-12
repos: [minion_hub]
tags: [infra, data, logic, handoff-sweep]
value: 8
effort: M
---

# Hub on a Supabase Micro — debloat ledger

## Owner ask (verbatim, 2026-10-12)

> "After all the latest updates and implementations, I noticed that the app takes a very long time to load items and pages. Please take a look and test it out for yourself."
>
> "I will NOT be upgrading compute. You should be able to find a way to make this all work by debloating and optimizing existing processes"

## AS-IS (measured 2026-10-12 03:00–04:30Z)

- Supabase **Micro** (burstable CPU) still throttled from the 2026-10-11 corpus-job storm: with `pg_stat_activity` idle, `select count(*) from generate_series(1,2e6)` took 6–30 s (healthy ≈ 0.3 s); a trivial query planned in 2.7 s; postgres.js's connect-time `pg_type` lookup took 11 s; Auth `/token` 504 (login dead) at 03:15Z and 03:21–03:25Z.
- Logged in as the owner: home data 11 s, `/pos/sell` 112 s, `/pos/appointments` 53 s, `/pos/history` 21 s, `/pos/catalog` 83 s, `/pos/accounts` 36 s.
- Steady background load keeping the credits from recovering: Supabase's stats exporter scanning a full 5,000-entry `pg_stat_statements` every ~90 s (13–18 s per scan under throttle); Vercel crons (marketplace sync every minute, word-frequency refresh hourly, brains reconcile daily with no job consumer); per-tab polls (3 count endpoints / 60 s, admin fleet poll / 5 s); netcup hub cron lane (122 meta + 125 inbox-evaluator ticks/day, hourly finance no-op, hourly attachments).
- Per cold page view on the QA stack (Drizzle statements / `withOrgCore` transactions): layout+home 12/3, sell 52/22, appointments 61/25, catalog 84/38, accounts 50/20, history 30/12 — real round trips including BEGIN/set_config/COMMIT: sell 99, appointments 114, catalog 163, accounts 93, history 57.

## TO-BE

The instance idles below its CPU baseline so credits accrue; a page view costs one transaction and only the statements it renders; background work runs at the cadence the product needs, not per minute.

## DELTA shipped

| PR | Change | Measured |
|---|---|---|
| hub #492 `40d4be423` | marketplace cron 1/min → 1/30 min; word-frequency hourly → daily; brains reconcile cron removed; one `/api/shell/counts` poll at 120 s, none while hidden; fleet poll 5 s → 30 s capped; login 503 `auth_unavailable` vs 401 | 1,465 cron runs/day → 49; 3 req/min/tab → 0.5 |
| hub #495 `d1c2e2e7b` | `fetch_types: false` on the pool client; layout reuses hook-resolved org kind; appointments reads parallel; `HUB_SQL_TRACE=1` counter | removes the 11 s per-connection catalog query |
| hub #497 `6ed266932` | GET-only `memoRequest` for pos/fin settings, default warehouse, categories, tag links, component edges, open shifts | sell 52→47, appointments 61→58, catalog 84→72, accounts 50→47, history 30→26 |
| hub #498 | one ambient org transaction per GET on `/(app)/pos` + `/api/pos` | round trips sell 99→39, appointments 114→45, catalog 163→55, accounts 93→39, history 57→27; transactions 12–38 → 2 |

Owner-run (outside git): netcup crontab meta/jobs 10 → 30 min, finance hourly → daily, attachments hourly → 6 h (`~/.cache/claude-tmp/netcup-slow-hub-ticks.sh`, backup `crontab.bak-2026-10-12`); `select pg_stat_statements_reset();`.

## Open ends (ledger)

1. **Unused GIN indexes on `knowledge_chunks`** — `knowledge_chunks_chunk_text_trgm_gin` (154 MB) and `knowledge_chunks_search_gin` (60 MB), 0 scans / 507k writes. Drop migration (prod DDL) once confirmed nothing plans to use trigram/tsvector search on chunks.
2. **Catalog still runs 46 real statements** (`billingForProducts`, `costForProducts`, `getTagLinks`, `getProductIngredientTags`, `listAllComponentEdges` are each batched but distinct). Service-level consolidation (joins) is the next cut; needs a design, not a mechanical pass.
3. **Write inside a joined GET load** (#498) is rolled back if a later sibling statement fails; reads retry on a private tx, writes do not. No POS GET load writes today; a future one must open its own transaction. `TODO(handoff)` in `src/hooks.server.ts`.
4. **`cached()` lookups now run inside the shared transaction** (#498): with `CACHE_BACKEND=valkey` the tx idles for a cache round trip (ms vs the 20 s `idle_in_transaction_session_timeout`).
5. **RLS pool size 1** (`SUPABASE_DB_RLS_POOL_SIZE`, capped at 2): concurrent POS GETs in one process serialize per request instead of per statement. Raising the cap is a Supavisor client-slot decision (EMAXCONN history, hub #454).
6. **`HUB_SQL_TRACE` round-trip counter mis-attributes under concurrency** (postgres.js dispatches queued queries from whichever context frees the connection); reliable only one request at a time; never on in production.
7. **`listCustomProperties` deliberately not memoised** — `custom-property-bundle.service.ts` calls it twice on purpose to detect a definition changing mid-request. `TODO(handoff)` at the call site.
8. **`getOpenShift` memoisation has no dedicated unit test** (nested `shiftSummary` transaction); `listOpenShifts` is tested.
9. **Second residual transaction per POS GET** is `applyModuleAvailabilityGuard`'s `listModuleStates` in `appHandle`, which runs before the shared tx opens; folding it in needs the guard to move inside the ambient handle.
10. **Micro wall-clock gain not yet measured** — rerun the logged-in timing table (home, sell, appointments, history, catalog, accounts) once the instance is out of throttle; any page over 2 s is a ticket.
11. **Meta DM freshness** in the CRM is now 30 min (netcup meta tick); revert that crontab line if the clinic needs 10.
12. **Product cadence not revisited**: inbox evaluator every 30 min means overdue-appointment reminders can lag up to 30 min.

## Merged from postmerge-minion-hub-1d4b2c73ae7e and postmerge-minion-hub-d9632d903381

Both the factory handoff-ledger sweep and the post-merge discovery loop independently
flagged the same two `TODO(handoff)` markers this ledger already tracks as open ends
#3 and #5, against the same merged PR (#498, commit `f6b33d1`):

- `src/hooks.server.ts:649` — two known limits of sharing one transaction across a load
  (open end #3 above). https://github.com/NikolasP98/minion_hub/blob/master/src/hooks.server.ts#L649
- `src/server/db/ambient-org-tx.ts:26` — that single connection also means two
  concurrent POS GETs (open end #5 above).
  https://github.com/NikolasP98/minion_hub/blob/master/src/server/db/ambient-org-tx.ts#L26
