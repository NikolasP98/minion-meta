# P4 — AI-Brains (isolated org knowledge bases)

**Repos:** minion_hub (`dev`) + minion gateway (`DEV`, tools only). Runs AFTER P1 (reuses the `/api/gateway/actions` + tools pattern).
**Goal:** users create org-scoped knowledge bases ("brains"); documents get chunked + embedded; agents and users query them; access is per-brain (role/agent/user). Differentiator: `module_ref` documents that mirror live ERP data.

## Verified foundations (reuse, don't rebuild)
- **Durable ingestion:** `src/server/services/bg-runtime.ts` — `registerJobHandler({type, advance})`, `enqueueJob`, 60s lease, advanced by `/api/jobs/tick`. Ingestion = ONE new handler type `brain_ingest`. No new queue.
- **Embeddings:** `src/server/services/embeddings.ts` — 1536-dim `text-embedding-3-small` via OpenRouter (fallback OpenAI), `toVectorLiteral`, `embeddingsEnabled()`. NEVER use the gateway's local qmd embedder (VPS CPU-storm incident).
- **Vector search idiom:** `agent-memories.service.ts:183–230` — cosine `<=>` with `toVectorLiteral`, composite scoring. Copy the query shape; plain cosine ranking is enough for v1 (skip recency/importance weights).
- **Schema conventions:** newest tables live in `src/server/db/pg-schema/` (see `bg-jobs.ts`, `workshop-experiments.ts`). CHECK how those tables reach the drizzle client (pg-client.ts imports schema from `@minion-stack/db/pg`) — follow whatever bg_jobs did exactly; if registering requires a `@minion-stack/db` package change, STOP and report to orchestrator (changeset flow) instead of improvising.
- **RBAC:** add `'brains'` to `MODULES` + `BUSINESS_MODULES` (rbac.service.ts:38/85), map `/api/brains` in `apiWriteCapability`'s prefix table, add layout view-gate path mapping + nav `requires` entry. RBAC is a REQUIRED build step — ungated = bug.

## Migration (orchestrator applies via Supabase MCP after review — agents only WRITE the file)

`supabase/migrations/<ts>_brains.sql` — additive only:
```sql
create table if not exists brains (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null,
  description text,
  icon text,
  visibility text not null default 'org',        -- org | private
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists brain_documents (
  id uuid primary key default gen_random_uuid(),
  brain_id uuid not null references brains(id) on delete cascade,
  org_id text not null,
  title text not null,
  source_type text not null,                     -- note | url | upload | module_ref
  source_ref text,                               -- url, file id, or module key (e.g. 'fin_products')
  content_md text,
  status text not null default 'pending',        -- pending | ingesting | ready | failed
  error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists brain_chunks (
  id uuid primary key default gen_random_uuid(),
  brain_id uuid not null references brains(id) on delete cascade,
  document_id uuid not null references brain_documents(id) on delete cascade,
  org_id text not null,
  seq int not null,
  chunk_text text not null,
  embedding vector(1536),
  meta jsonb
);
create table if not exists brain_access (
  brain_id uuid not null references brains(id) on delete cascade,
  org_id text not null,
  principal_type text not null,                  -- role | user | agent
  principal_id text not null,
  level text not null default 'read',            -- read | write
  primary key (brain_id, principal_type, principal_id)
);
```
Plus: org_guc RLS policies on all four (copy the exact policy shape from an existing migration / the 26-table org_guc set), `create index ... on brain_chunks using hnsw (embedding vector_cosine_ops)` (match whatever index type `agent_memories` uses if different), and btree indexes on (org_id, brain_id).

## W1 — hub server (schema, service, ingestion, API)

1. Drizzle tables in `src/server/db/pg-schema/brains.ts` following `bg-jobs.ts` conventions.
2. `src/server/services/brains.service.ts`:
   - CRUD (list/create/update/delete brain; add/remove document; list documents).
   - **Access resolution:** `canAccessBrain(ctx, brainId, 'read'|'write')` — creator + org owner/admin always write; `visibility:'org'` → org members read; else consult `brain_access` (role rows match the user's member_roles; user rows by profileId; agent rows by agentId for gateway calls). Enforce in every service fn (fail closed).
   - `searchBrain(ctx, brainId, query, limit)` — embed query, cosine top-k over `brain_chunks` (brain-scoped), return chunks + document titles/ids.
   - `addNote(ctx, brainId, title, contentMd)` → document row + enqueue `brain_ingest`.
   - Audit: `recordAudit` on brain create/delete, document add/remove (`refType:'brain'`/`'brain_document'`).
3. **Ingestion handler** (`brain_ingest`, registered like the group-chat handler is — find where existing handlers register at startup and match):
   - One advance() step = process ONE document: load content (`note` = content_md as-is; `url` = fetch + strip to text, 100KB cap, 15s timeout; `upload` = DEFER to v2 — return failed with 'uploads not yet supported'), chunk (plain function: ~3000-char windows, 300 overlap, break on paragraph boundaries), embed in batches of 64 (reuse the batch pattern embeddings.ts callers use), delete old chunks for the doc + insert new (idempotent re-ingest), set status ready/failed.
   - `module_ref` v1: ONLY `fin_products` — render the org's product catalog to markdown rows, then same chunk/embed path. Leave `// P2 hub_events hook: re-enqueue module_ref docs on finance.invoices_upserted` comment at the handler.
4. API routes (all through `parseBody` + RBAC; `withOrgCore` everywhere):
   - `GET/POST /api/brains`, `PATCH/DELETE /api/brains/[id]`
   - `GET/POST /api/brains/[id]/documents`, `DELETE .../documents/[docId]`, `POST .../documents/[docId]/reingest`
   - `POST /api/brains/[id]/search` `{query, limit?}`
   - `GET/PUT /api/brains/[id]/access` (write-level required)
5. Gateway-facing (P1 pattern, resolveAssistantPrincipal): `GET /api/gateway/actions/query/brains` (list accessible brains), `POST /api/gateway/actions/brain-search`, `POST /api/gateway/actions/brain-remember` (adds a `note` document; confirm-contract applies).
6. Tests: access resolution (role/user/agent, fail-closed), chunker (boundaries, overlap), search scoping (brain A query never returns brain B chunks — the isolation guarantee).

## W2 — hub UI `/brains`

- List page: card grid (steal the layout from `/agents/autonomous` card grid), create dialog (name, description, icon emoji, visibility). Brain archetype avatar style = disco (DiceBear, existing avatar util).
- Detail page `/brains/[id]`: documents table (title, source_type badge, status, updated) with add-note dialog (Carta-md editor is already a dep — reuse), add-URL dialog, reingest + delete actions; **search test box** (query → ranked chunks with doc links); access panel (visibility toggle + principal rows: role/user/agent selects); activity tab via existing `listEntityTimeline` (`refType:'brain'`).
- Nav: sidebar entry under the AI/agents section, gated `brains:view`.
- i18n en+es + `bun run i18n:compile`. Svelte 5 runes. RBAC-aware buttons per P3 conventions (`canAct('brains','edit')` etc.).

## W3 — gateway tools (minion repo, after W1 endpoints exist)

`src/agents/tools/hub/brain-search-tool.ts` + `brain-remember-tool.ts` following the P1 hub/ tool pattern (typebox, getHubRest, personal-agent gate, mcpExport). Descriptions: brain_search "search the org's knowledge bases; call query/brains first if unsure which brain"; brain_remember has the confirm contract. Register in TOOL_ORDER.

## Deferred (v2)
File uploads (B2 storage), graph visualization, user-defined object types, cross-brain search, brain-to-brain links, per-chunk citations UI.

## Sequencing
Migration file first (W1 agent writes it, orchestrator applies before W1 finishes service work — coordinate: agent writes migration + schema + service with tests mocked, orchestrator applies migration, agent's API tests can then hit real shapes if integration-style). W1 → then W2 + W3 in parallel.
