---
id: 2026-08-03-crm-customers-server-pagination-spec
title: CRM Customers List — Server-Side Pagination & Search
stage: spec
status: draft
pass: 1
created: 2026-08-03
updated: 2026-08-03
repos: [minion_hub]
---

# CRM Customers List — Server-Side Pagination & Search

**Date:** 2026-08-03
**Status:** Proposed (ready for execution)
**Owner surface:** `minion_hub` — `/crm/customers`, `crm-contacts.service.ts`, `/api/crm/contacts`
**Prereq reading:** memory notes `hub-endpoint-optimization-round2`, `hub-nav-latency-2026-08-02`

---

## 1. Problem & evidence (measured 2026-08-02/03, FACES org, 15,580 contacts)

`/crm/customers` ships the **entire ranked roster inline**: 12.4 MB of devalue JSON.
Measured breakdown with all server caches warm:

| Stage | Cost |
|---|---|
| `computeRoster()` (roster cache hit + finance map) | **≤ 2.6 s** (roster itself 0–2 ms from cache) |
| Devalue-serialize + stream 12.4 MB (dev vite pipeline) | **12–35 s** |
| Client parse + hydrate 15.5 k rows into DataTable | seconds more |

Per-field byte attribution (3,000-row sample): identities 24 %, contact_id 13 %,
first/last_contact_at 16 %, display_name 5 %, channels 5 % — **weight is structural**
(15.5 k rows × ~30 fields); no single field is trimmable without losing features
(identities feed the merge resolver, r/f/m feed tooltips).

Interim mitigation already shipped (`1e1804c1`): the roster is streamed, so the shell
paints instantly — but the table still waits for the full payload. This spec removes
the full payload.

**Existing assets (do NOT rebuild):**
- `rankContacts(ctx, filters)` already supports: `stage`, `channel`, `minScore`,
  `maxScore`, `tagId`, `ruleJson` (auto-tag rules → SQL), `search` (ILIKE on
  display_name), `sort` (`score|recent|frequency|name`), `limit`/`offset`,
  `ownerId`, `maskSensitive`. The SQL was rewritten 2026-08-02 (pre-aggregated
  messages join, `831da4b0`) and runs ~5 s cold / fast warm under RLS.
- `GET /api/crm/contacts` already parses all of those from query params and calls
  `rankContacts`. It only lacks a total count.
- `listContactsCached` (Valkey/memory, ttl 2 m, swr 1 h, tag-busted) caches the
  full uncapped roster — keep it for the dashboard aggregates and cleanup scans.

## 2. Goals / non-goals

**Goals**
1. `/crm/customers` first-usable-table in **< 2 s warm** (dev, FACES scale) and
   payload per navigation **< 300 KB** (one page of rows, not the org).
2. Preserve every existing list feature: search, stage/funnel/tag/channel filters,
   score range, awaiting/reserved toggles, per-column sort, column chooser with
   custom_fields (meta) columns, row selection + bulk actions (merge, tags),
   CSV export, URL-persisted filter state, `invalidate('crm:contacts')` freshness.
3. Scale headroom to ≥ 200 k contacts without design change.

**Non-goals**
- No new search infrastructure (Meilisearch/Typesense/ES) at this scale — see §6.
- No change to the CRM dashboard (`/crm`) — it aggregates server-side already.
- No change to `/crm/cleanup` hygiene scans (they run server-side off
  `listContactsCached`).

## 3. Design

### 3.1 Server: one paged query with total count

**`rankContacts` additions** (`src/server/services/crm-contacts.service.ts`):

1. Add `count(*) over()::int as total_rows` to the outer `select * from scored`
   projection, so one round-trip returns the page AND the filtered total.
   Strip `total_rows` from the returned rows; return shape becomes:
   ```ts
   export interface RankedPage { rows: RankedContact[]; total: number }
   export async function rankContactsPage(ctx, f): Promise<RankedPage>
   ```
   Keep `rankContacts` as a thin wrapper returning `.rows` (existing callers:
   detail page score, cleanup, dashboard via listContactsCached — untouched).
2. **New filters** (all optional, additive to `RankFilters`):
   - `awaitingReply?: boolean` → outer `awaiting_reply = true` (column already
     computed in `base`).
   - `funnelStage?: string` → outer predicate on the effective funnel stage.
     The funnel today is derived client-side from `custom_fields` + finance floor
     (`crm-funnel.ts`). Port the derivation into the `scored` CTE as
     `funnel_stage` (CASE over `custom_fields->>'_funnel'`, `inbound_msgs`, and
     the fin CTE's booked/purchased flags — mirror `effectiveFunnelStage` +
     `financeFloorStage`; add a unit test asserting SQL⇄TS parity the same way
     the lifecycle `stage` CASE mirrors `deriveLifecycleStage`).
   - `buyerOnly?: boolean` ("reserved" toggle) → `is_buyer = true` (exists in base).
   - `metaKey?/metaValue?` not needed — meta columns are display-only.
3. **Search hardening:** `search` today is `display_name ILIKE %q%` — a seq scan
   at 15 k rows is fine (<50 ms), but add the supporting index in the same
   migration for headroom (§3.4): `gin (lower(display_name) gin_trgm_ops)`.
   Extend search to also match `custom_fields->>'telefono'` and `->>'dni'`
   (exact-prefix, the two lookups agents actually do — mirrors crm_search tool).
4. **Sort:** map DataTable column sorts onto existing `sort` enum + add
   `'revenue'` (needs the fin CTE join — already present when finance on).

**`GET /api/crm/contacts` additions** (`src/routes/api/crm/contacts/+server.ts`):
- Parse the new filters; return `{ contacts, total }` from `rankContactsPage`.
- Default `limit` 100, max 500 (unchanged caps).
- **Finance decoration on the page rows** (revenue/invoices/lastPurchase columns):
  reuse `contactFinanceMap(ctx)` (cached) and decorate only the returned page —
  100 rows, negligible.
- Auto-tag ids per row: evaluate `matchingAutoTagIds` over the page rows only.

**Page load** (`src/routes/(app)/crm/customers/+page.server.ts`):
- Replace the streamed full roster with the FIRST page server-rendered:
  `{ page: rankContactsPage(ctx, firstPageFilters), tags, total, financeEnabled }`
  — no `streamed` needed anymore; a 100-row page serializes in milliseconds.
  Read initial filters from URL params (they're already URL-persisted).

### 3.2 Client: DataTable server mode

`DataTable.svelte` is client-only today (search/sort/filter/paginate over the full
array). Add an opt-in **server mode** rather than forking the component:

```ts
// new props (all optional — absent = current client behavior, zero regression risk)
server?: {
  total: number;                       // filtered total for the pager
  loading?: boolean;
  onQuery: (q: {                       // fired debounced (300ms) on any change
    search: string;
    sort: { key: string; dir: 'asc'|'desc' } | null;
    filters: Record<string, string>;   // enum-filter selections
    page: number; pageSize: number;
  }) => void;
}
```
In server mode the table renders `rows` as-is (no client filter/sort/slice),
the pager uses `server.total`, and every interaction calls `onQuery`.

`+page.svelte` wires `onQuery` → `fetch('/api/crm/contacts?…')` via a small
`$state` request manager with: 300 ms debounce on search, promise-identity guard
(pattern already in the file from `1e1804c1`), and URL param sync (existing code).
`invalidate('crm:contacts')` after mutations → refetch current page.

**Feature relocations:**
- **Export CSV**: client export only sees the current page. Add
  `GET /api/crm/contacts/export.csv` → streams CSV from `rankContacts` with the
  SAME filters, `maxLimit: ROSTER_CAP`, RBAC-gated `canAct('crm','export')`,
  PII-masked per `shouldMaskSensitive`. DataTable's export button calls it with
  current filters when in server mode.
- **Bulk select-all**: "select all on this page" (exact) + "select all N matching"
  (ids fetched from a lean `GET …?fields=id` variant) — merge resolver then
  fetches full rows for the selected ids only.
- **Meta (custom-field) columns**: `collectMetaKeys` currently scans the whole
  roster to discover column keys. Replace with a tiny
  `select distinct jsonb_object_keys(custom_fields)` (cached '10m') exposed on the
  page load — the keys are near-static.

### 3.3 What stays client-side
Within-page interactions (column show/hide, row expand, selection) — unchanged.
The instant-filter feel is preserved by the 300 ms debounce + ~100-row responses
(measured `rankContacts` page cost warm: <500 ms end-to-end in dev).

### 3.4 Migration (one, additive)
```sql
create extension if not exists pg_trgm;           -- already present (chunks use it)
create index concurrently if not exists crm_contacts_display_name_trgm
  on crm_contacts using gin (lower(display_name) gin_trgm_ops);
create index concurrently if not exists crm_contacts_org_deleted_idx
  on crm_contacts (org_id) where deleted_at is null;
```
Via the hub migration pipeline (never `drizzle-kit push` — memory
`hub-db-schema-management`).

### 3.5 Phasing (each lands green independently)
1. **P1 server**: `rankContactsPage` + total + new filters + funnel CASE + parity
   test + API changes + export endpoint + migration. (No UI change; old page keeps
   working off the streamed roster.)
2. **P2 client**: DataTable server mode + customers page rewire + meta-keys query.
   Delete the streamed-roster path from the page.
3. **P3 cleanup**: drop `matchingAutoTagIds` full-roster path from the page;
   confirm `listContactsCached` consumers are only dashboard + cleanup + detail.

## 4. Acceptance criteria
- Navigation to `/crm/customers` (warm dev): table interactive **< 2 s**; response
  payload for the default view **< 300 KB**.
- Typing in search updates rows in < 1 s (debounced), URL reflects state, reload
  restores it.
- Every filter/toggle/sort produces identical row sets to the current client-side
  behavior on a fixture org (snapshot test: same filters → same contact_id sets).
- Export CSV with active filters yields the full filtered set (not one page),
  masked for a low-field-level principal.
- `bun run check`, unit tests, `lint:design`/`lint:tokens` green; route-contract
  counts updated if any +server.ts is added (export endpoint counts).
- Funnel SQL⇄TS parity test green.

## 5. Test plan
- Unit: `rankContactsPage` total correctness under each filter; funnel CASE parity
  vs `effectiveFunnelStage`+`financeFloorStage` across a truth table; export
  endpoint RBAC (403 without `crm:export`, masked output).
- Integration (dev DB, FACES): page 1 default sort equals first 100 of today's
  client-sorted roster; `awaiting`/`reserved` counts match dashboard stats.
- Perf gate: scripted browser probe (recipe in memory `hub-ui-browser-testing`)
  asserting <2 s to 20 rendered rows warm.

## 6. Third-party / service options evaluated

| Option | Verdict | Why |
|---|---|---|
| **TanStack Virtual** (row virtualization) | ✅ ADOPT in P2 if DataTable jank shows at 100–500 rows/page | Already an approved adoption (memory `tanstack-consolidated-execution`); cheap, no server impact. |
| **TanStack Query** (client cache for page fetches) | ⚠️ Narrow use only | Matches the standing "Query NARROW" decision; the single-page request manager above is ~30 lines — adopt Query only if more pages move to server mode. |
| Meilisearch / Typesense | ❌ Reject for now | 15–200 k rows with pg_trgm + existing GIN patterns is well inside Postgres territory; a search service adds an ingest pipeline, another host, and consistency lag for zero user-visible gain at this scale. Revisit ≥ 500 k contacts or multi-field fuzzy ranking needs. |
| ElectricSQL / PowerSync (local-first sync) | ❌ Reject | Solves offline/multi-device sync, not payload size; heavy operational footprint. |
| Supabase read replica (sa-east-1) | ❌ Reject (re-confirmed) | Already evaluated 2026-06-16 for the prod latency floor and declined; pagination removes the payload problem without new infra spend. |
| Valkey (already owned) | ✅ Keep as-is | Roster + finance map caches stay; note the standing flag: prod fns (iad1) → Valkey (EU) ≈ 100 ms/GET — if prod traces show cache-hit latency, move Valkey to us-east. |

## 7. Further load-performance levers (beyond this spec, ranked)

1. **`knowledge_chunks` stats** (biggest remaining single item): the /brains
   per-source doc/chunk counts scan a ~1 GB heap (40–125 s cold; currently hidden
   by swr '1h'). Fix = counts maintained in a small `knowledge_source_stats` table
   updated by the ingest/reconcile paths (or a partial index set:
   `(org_id, source_id) where status <> 'deleted'` on documents +
   `(org_id, source_id) where embedding is null` on chunks). Needs a migration →
   own small spec.
2. **Dev DB locality**: the single biggest dev-experience lever left is the
   ~150–200 ms/query WAN RTT (Peru → us-east-2). Running the local Supabase stack
   (`PUBLIC_SUPABASE_URL=127.0.0.1:54321`, previously used per memory) with a
   periodic seed from dev would make every page sub-500 ms. Optional, per-dev.
3. **`/finances` aggregates**: 3–6 s streamed body — same treatment as socials
   (trace, index or cache the four aggregate queries). Not yet root-caused.
4. **Gateway-assignment mutations → `bustHostsCache`**: wire the remaining
   mutation paths so the 45 s hosts-cache TTL never shows a stale gateway list
   after an admin reassignment.
5. **`/api/pulse/count` polling** → replace with the realtime broadcast channel
   (PR #89 infrastructure) pushing badge counts, killing the poll entirely.
6. **NATS JetStream**: infra exists, zero app wiring (verdict 2026-08-02). If the
   hub ever needs background jobs (roster precompute, brains stats refresh), the
   `MINION_JOBS`/`HUB_BG_V1` stream+consumer are ready — a worker would subsume
   levers 1 and 3's "precompute" halves.

## 8. Execution notes (for the implementing agent)
- Branch off `feat/level-2026-07-30` (LIVE shared branch — scope commits to your
  files; co-agents commit concurrently; never `git add -A`).
- Read `minion_hub/CLAUDE.md` + `.claude/skills/ui-design-governance/SKILL.md`
  before touching the page; run `lint:design`/`lint:tokens` after UI edits.
- `rankContacts` SQL changes: verify with the psql RLS harness used in
  `831da4b0`'s review (begin; one-statement set_config batch; explain analyze) and
  an `except`-diff equivalence check against the current output for the
  no-new-filters case.
- Do not run `bun run check` while measuring perf against the dev server
  (svelte-kit sync reload loops wipe the in-process cache — measured 47 s
  "warm" artifacts).
