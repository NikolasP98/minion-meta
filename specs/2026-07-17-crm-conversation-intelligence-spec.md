# CRM Conversation Intelligence — Spec & Parallel Execution Plan

**Date:** 2026-07-17
**Owner:** orchestrator → Sonnet subagents (parallel)
**Goal:** Vectorize *all* CRM chat conversations across every channel, expose the vector store to an agent the user chats with on `/crm/insights`, and have that agent answer aggregate/analytical questions ("biggest pain-points", "are we over-explaining vs what customers ask for"). Plus: restore the missing agent hover pill.

---

## 0. Grounding (from codebase recon — do NOT re-derive)

### Data reality
- **Universal message ledger** = `messages` table in **Supabase Postgres** (via `@minion-stack/db/pg`, accessed through `src/server/db/pg-ledger-client.ts` `withOrg()` → `SET LOCAL ROLE app_ledger` + `app.current_org_id` GUC). Columns that matter: `org_id`, `channel`, `chat_id`, `sender_id`, `sender_name`, `direction`, `is_bot`, `is_group`, `content` (**the body**), `occurred_at`, `created_at`, `metadata`, `message_id`.
- **Bodies present** for `whatsapp`, `instagram`, `telegram` (any gateway channel that sends `content`). IG DMs already imported into this ledger.
- **Email is metadata-only** (`email_ledger`, `pg-schema/email-ledger.ts`) — NO body ever. **Email is out of scope for content vectorization.** At most subject+summary; do not attempt.
- **Contact spine**: `crm_contact_identities (org_id, channel, external_id, handle, contact_id)` with unique `(org_id, channel, external_id)`. `external_id` is populated from `messages.sender_id` at harvest. `crm_contacts.party_id` → `parties` (DNI spine).
- **⚠️ Load-bearing join risk**: consumers join `messages` back to identities on `m.chat_id = ci.external_id` (see `crm-similarity.service.ts:59`, `crm-journey.service.ts:166`) but identities are keyed on `sender_id`. Works only where `sender_id == chat_id` (1:1 DMs). **WP-0 must verify this holds for imported IG data** before we trust conversation→contact coverage.
- Harvest is a self-reconciling **anti-join** (`syncContactsFromLedger`, `crm-contacts.service.ts:47`). "Complete" = complete relative to ingested channels. Scope-gated accounts (`crm_settings.disabled_channels`, `getHarvestScope`) emit ledger rows without contacts.

### Reusable infra (do NOT rebuild)
- **Embeddings**: `src/server/services/embeddings.ts` — `embedText`, `embedTexts` (batch, truncates 8000 chars), `toVectorLiteral`, `embeddingsEnabled()`. Model `text-embedding-3-small`, **dim 1536**, OpenRouter primary (`OPENROUTER_API_KEY`) → OpenAI fallback. No new provider wiring.
- **pgvector table template**: `supabase/migrations/20260618120000_crm_win_embeddings.sql` (extension, `vector(1536)`, ivfflat cosine, PK, `app_ledger` grant + org-GUC RLS) mirrored in drizzle at `pg-crm-schema.ts:217-231`. **Copy this pattern exactly** for new vector tables.
- **Vector search pattern**: `order by embedding <=> $vec limit k`, similarity `1 - (embedding <=> $vec)` (see `crm-similarity.service.ts:261 similarWins`).
- **Conversation text builder**: `crm-similarity.service.ts:100-102` already assembles role-tagged conversation text from `messages`. Reuse the shape.
- **Gateway hub-tool pattern** (nearest analog = `brain_search`, wired end-to-end):
  - Hub endpoint template: `src/routes/api/gateway/brain-search/+server.ts` — `resolveAssistantPrincipal(locals, url)` (`src/server/auth/assistant-principal.ts`) → `agentId`→profile→org, `capabilities.can(module, action)` RBAC gate, `CoreCtx { db: getCoreDb(), tenantId: orgId, profileId }`, `json()`.
  - Gateway tool template: `minion/src/agents/tools/hub/brain-search-tool.ts` (+ `.meta.ts`) — TypeBox schema, `hubToolsAvailable(agentId)` gate, `hubPost("<path>", agentId, {...}, orgId)` (`hub-common.ts`).
  - Register: drop `.ts`+`.meta.ts` in `minion/src/agents/tools/hub/`, run `pnpm generate:tools` (regens `_registry.generated.ts`+`_groups.generated.ts`), add factory case in `minion/src/agents/minion-tools.ts`.
  - Advertise the tool by name in `buildAssistantContext()` (`src/lib/state/features/assistant-context.ts:79-84`).
- **Chat plumbing** (hub page → agent): `sendAssistantTurn(id, text, buildAssistantContext())` (`src/lib/services/gateway/chat-rpc.ts:209`), state in `src/lib/state/chat/chat.svelte.ts` (`ensureAgentChat`, streaming smoother), gated on `conn.connected`. **`chat.send` carries message TEXT only** — page context is prepended and stripped for display (`stripAssistantContext`/`cleanInboundForDisplay`).
- **`/crm/insights` page** = static analytics (win analysis + sentiment trend + word cloud). `+page.svelte` + `+page.server.ts`. **No chat UI today.** `crm-insights.service.ts` (word freq, sentiment/day) + `crm-similarity.service.ts` (win index).
- **Existing but insufficient**: `crm_search` gateway tool searches `agent_memories` (source=crm, agent_id=crm) — a *curated* memory subset, not all conversations, and dumping full corpus there risks polluting general agent-memory recall. → We build a **dedicated** conversation store instead.
- **Cheap analysis model**: `CRM_SENTIMENT_MODEL` / `CRM_FUNNEL_MODEL` default `google/gemini-2.5-flash` (OpenRouter). Per-message LLM precedent already exists (`crm_message_sentiment`).

### Guardrails (hard rules — every WP)
- **UI work** → invoke `ui-design-governance` skill; semantic tokens only; after UI edits run `bun run lint:design && bun run lint:tokens` (debt may only decrease). Svelte 5 runes only.
- **RBAC**: every `/api/gateway/*` read resolves `resolveAssistantPrincipal` + `capabilities.can('crm','view')`. Ungated = bug.
- **New cron tick** → must be in `hooks.server.ts` unauth allowlist.
- **DB**: NEVER `drizzle-kit push`. Migrations = raw SQL in `supabase/migrations/`, applied by the `vercel-build` pipeline. New vector tables need the `app_ledger` grant + org-GUC RLS or the agent can't read them.
- **Package managers**: `minion_hub/` = **bun**; `minion/` = **pnpm**. Don't mix.
- **🚫 PROD GATE**: subagents implement + validate **locally only**. Do NOT apply migrations to prod, do NOT run the embedding backfill against prod (spends OpenRouter tokens on thousands of rows), do NOT deploy. Stop and hand back for user confirmation on all three.

---

## 1. Architecture

```
messages (PG, all channels, content)
        │  group by (channel, chat_id), role-tag, chunk ~1500 tok
        ▼
[WP-A] crm_conversation_chunks (pgvector 1536, ivfflat cosine, org RLS)   ← semantic retrieval corpus
        │
        ├── [WP-B] POST /api/gateway/search-crm-conversations  ← top-k chunk retrieval (targeted Qs)
        │         └─ gateway tool  search_crm_conversations
        │
[WP-A] crm_conversation_analysis (per chat_id: intent, pain_points[], asked_for, over_answered)  ← structured rollup
        │
        └── [WP-B] POST /api/gateway/crm-conversation-themes   ← aggregate GROUP BY (pain-points census, over-explaining rate)
                  └─ gateway tool  crm_conversation_themes

[WP-C] /crm/insights: CrmInsightsChat panel  →  sendAssistantTurn + insights context envelope advertising both tools
[WP-D] restore agent hover pill (StatusDot / verify live)
```

**Why two stores, not one:** semantic retrieval (`chunks`) answers *targeted* questions ("what did people say about pricing?") but cannot answer *census* questions ("what fraction of conversations are us over-explaining?") — that needs a per-conversation structured judgment (`analysis`). The user's two example questions map one-to-each. `analysis` is the package that actually answers "are we giving too much info."

---

## 2. Work packages

### WP-0 — Completeness & join audit  *(GATE — runs first, solo, ~fast)*
Runs against the **hub's own DB** (not the Supabase MCP — that points elsewhere). Write a throwaway script under `minion_hub/scripts/audit-conversation-corpus.ts` using the existing pg-ledger client with resolved env (`minion sync-env hub` then `bun run`), or query directly. Produce a findings block (paste back, don't commit).
Answer:
1. Does `sender_id == chat_id` for `channel='instagram'`? `SELECT count(*) FILTER (WHERE sender_id = chat_id), count(*) FROM messages WHERE channel='instagram' AND direction='inbound'`. Same for whatsapp/telegram. **This decides the WP-A join key** (if IG diverges, chunk by `chat_id` and resolve contact via a fallback that tries both).
2. Corpus size: messages with `content` non-empty, `is_bot is not true`, grouped by channel; distinct `(channel, chat_id)` conversation count. (Sizing the backfill + cost estimate.)
3. Any connected channel account NOT in harvest scope (`disabled_channels`) → note it (rows exist, contacts don't).
4. Rough token/cost estimate for embedding the corpus (chars/4 ≈ tokens × $0.00002/1k for 3-small).
**Output** consumed by WP-A. Blocks WP-A/WP-B. Does not block WP-C/WP-D.

### WP-A — Hub data layer (migrations + services + jobs)  *(after WP-0)*
Owns ALL hub server-side data code. No route/tool files (WP-B owns those) → no conflicts.
1. **Migration** `supabase/migrations/<ts>_crm_conversation_chunks.sql` + drizzle mirror in `pg-crm-schema.ts` (raw-SQL managed like `crm_win_embeddings`):
   `crm_conversation_chunks (id uuid pk, org_id text, channel text, chat_id text, contact_id uuid null, party_id text null, chunk_index int, content text, embedding vector(1536), msg_count int, first_at timestamptz, last_at timestamptz, created_at timestamptz default now(), metadata jsonb default '{}')`; unique `(org_id, channel, chat_id, chunk_index)`; ivfflat cosine index on `embedding`; btree `(org_id, channel, chat_id)`; **`app_ledger` grant + org-GUC RLS** (copy the win-embeddings migration verbatim, rename).
2. **Migration** `<ts>_crm_conversation_analysis.sql` + drizzle mirror:
   `crm_conversation_analysis (org_id text, channel text, chat_id text, contact_id uuid null, primary_intent text, pain_points jsonb default '[]', asked_for text, answered_summary text, over_answered boolean, over_answered_reason text, msg_count int, first_at timestamptz, last_at timestamptz, analyzed_at timestamptz default now(), model text, metadata jsonb default '{}')`; PK `(org_id, channel, chat_id)`; btree `(org_id, over_answered)`; **`app_ledger` grant + org-GUC RLS**.
3. **Service** `src/server/services/crm-conversation-vectors.service.ts`:
   - `buildConversationChunks(orgId)` — group `messages` (content non-empty, `is_bot is not true`) by `(channel, chat_id)` ordered by `occurred_at`, role-tag (`Customer:`/`Agent:` via `direction`), chunk to ~1500 tokens (reuse the `conversationText` shape from `crm-similarity.service.ts:100`). Resolve `contact_id`/`party_id` via `crm_contact_identities` using the join key WP-0 confirmed.
   - `embedAndUpsertChunks(orgId, { limit })` — `embedTexts` the chunk texts, `toVectorLiteral`, upsert on the unique key. Watermark: skip conversations whose `last_at` ≤ stored `last_at` (re-embed only changed convos). Gate on `embeddingsEnabled()`.
   - `similarConversations(ctx, queryVec, k)` — `order by embedding <=> $vec limit k`, return `{chat_id, channel, contact_id, content, similarity, last_at}`. (WP-B endpoint calls this.)
4. **Service** `src/server/services/crm-conversation-analysis.service.ts`:
   - `analyzeConversations(orgId, { limit })` — for each un-analyzed / changed conversation, take the initial inbound window + agent replies, one cheap LLM call (`CRM_SENTIMENT_MODEL`, JSON-mode) extracting `{primary_intent, pain_points[], asked_for, answered_summary, over_answered, over_answered_reason}`. Cap `limit` per run (default 120, like crm-ai-tags). Upsert `crm_conversation_analysis`.
   - `conversationThemes(ctx, { channel?, since? })` — aggregate: top pain_points (unnest+count), intent distribution, `over_answered` rate. (WP-B endpoint calls this.)
5. **Backfill scripts** `scripts/backfill-conversation-vectors.ts` + `scripts/backfill-conversation-analysis.ts` — loop `embedAndUpsertChunks`/`analyzeConversations` in batches of 100 until drained (mirror `scripts/attribution-backfill-*.ts`). **Do not auto-run against prod.**
6. **Incremental ticks** `src/routes/api/crm/conversations/vectorize/tick/+server.ts` + `.../analyze/tick/+server.ts` — small batch per call; add both paths to `hooks.server.ts` unauth allowlist. (Cron scheduling is a follow-up; ticks exist so a cron can call them.)
7. Run `bun run check` / `bun run tsgo` locally; leave one runnable assert-based self-check for the chunker (`scripts/` or a `*.test.ts`) proving chunk boundaries + role tagging.
**Self-check:** assert `buildConversationChunks` role-tags by direction and never emits empty/whitespace chunks.

### WP-B — Hub API + gateway tools + agent wiring  *(after WP-A)*
Owns ALL endpoint + gateway-tool + wiring files (single owner → no conflict on `minion-tools.ts` / generated registry / `assistant-context.ts`).
1. **Hub endpoints** (mirror `brain-search/+server.ts`):
   - `src/routes/api/gateway/search-crm-conversations/+server.ts` → `resolveAssistantPrincipal` + `capabilities.can('crm','view')` → `embedText(query)` → `similarConversations(ctx, vec, k)` → `json()`.
   - `src/routes/api/gateway/crm-conversation-themes/+server.ts` → same gate → `conversationThemes(ctx, {channel, since})` → `json()`.
2. **Gateway tools** in `minion/src/agents/tools/hub/` (mirror `brain-search-tool`):
   - `search-crm-conversations-tool.ts` + `.meta.ts` (`hubPost("search-crm-conversations", …)`, `permission:{module:"crm",action:"view"}`, `mcpExport:true`, `groups:["group:minion"]`).
   - `crm-conversation-themes-tool.ts` + `.meta.ts` (`hubPost("crm-conversation-themes", …)`).
3. `cd minion && pnpm generate:tools`; add both factory cases in `minion/src/agents/minion-tools.ts` (pattern at the `brain_search` case).
4. Advertise both tool names in `buildAssistantContext()` (`assistant-context.ts:79-84`) — e.g. "for conversation questions use `search_crm_conversations`; for pain-point/over-explaining census use `crm_conversation_themes`."
5. `pnpm tsgo` (gateway) + `bun run check` (hub) locally.
**Self-check:** hit both endpoints locally with a seeded org; assert 200 + shape, and 401/403 when principal/caps missing.

### WP-C — `/crm/insights` chat panel  *(parallel from start; UI)*
Invoke `ui-design-governance` first. Reuses existing chat plumbing — new mounting surface, not a new chat system.
1. New `src/lib/components/crm/CrmInsightsChat.svelte` — renders an `agentChat` for a dedicated session key (e.g. `crm-insights-analyst`), input → `sendAssistantTurn(id, text, buildInsightsContext())`, streaming via the existing smoother, gated on `conn.connected`. Match hub design tokens; no raw colors.
2. Insights context envelope: extend `assistant-context.ts` (or a small local builder) so on `/crm/insights` the agent is framed as a **CRM conversation analyst** with the two tools, instructed to cite counts and emit `[label](/crm/...)` nav links.
3. Mount the panel on `src/routes/(app)/crm/insights/+page.svelte` (a card alongside the existing analytics, or a right rail). Add **suggested-question chips** seeded with the user's questions: "What are customers' biggest pain-points?", "Where can we improve most on initial interactions?", "Are we giving too much info vs what customers ask for?"
4. `bun run lint:design && bun run lint:tokens && bun run check` locally.
**Note:** panel works immediately as generic chat; full value lands once WP-B tools deploy. That's fine — no hard code dep on WP-B.
**Self-check:** panel mounts, sends a turn, renders a streamed reply on a local gateway (or degrades gracefully when `!conn.connected`).

### WP-D — Restore the agent hover pill  *(parallel from start; independent)*
Recon found the likeliest target = the autonomous-agent status pill (`StatusDot.svelte:54-58` revealed by ancestor `group/card` from `AutonomousAgentCard.svelte:50`), but `group/card` is still present in HEAD — so the actual dark pill needs **live confirmation**.
1. Run the hub locally (`bun run dev`) and use **browser-harness** (per `hub-ui-browser-testing` memory — not claude-in-chrome) to find which agent-related hover pill the user can't see (candidates: StatusDot pill on `AutonomousAgentCard`, `AgentRow` rail tooltip, `AgentAvatarStack` chip tooltip, or the `FloatingAssistant` ⌘J launcher label). Confirm which is genuinely invisible on hover.
2. Root-cause the confirmed one (removed `group/card`, `opacity-0` never toggled, `pointer-events-none`, z-index, token-as-surface). Fix at root.
3. Apply the **defensive** StatusDot hardening regardless (cheap, prevents silent recurrence): reveal on the pill's own `hover:` in addition to `group-hover/card:` at `StatusDot.svelte:57`.
4. `bun run lint:design && bun run lint:tokens` locally. Capture a before/after screenshot.
**Self-check:** screenshot proving the pill is visible on hover.

---

## 3. Orchestration & dependencies

```
WP-0 (gate) ──▶ WP-A ──▶ WP-B
WP-C  ───────────────────────▶ (independent, parallel)
WP-D  ───────────────────────▶ (independent, parallel)
```
- Dispatch now (parallel): **WP-0, WP-C, WP-D**.
- On WP-0 done → dispatch **WP-A** (with WP-0's join finding baked in).
- On WP-A done → dispatch **WP-B**.
- All agents: hub branch `dev`, gateway branch `DEV`. Scope commits to your own files. Don't touch stash/worktrees/branches.

## 4. Prod gate (user-confirmed, NOT autonomous)
After all WPs validate locally, hand back for explicit go on: (1) apply the two migrations to prod, (2) run the two backfills against prod (token spend — include WP-0's cost estimate), (3) deploy hub + gateway. Cron scheduling of the ticks is a follow-up.

## 6. Incremental & idempotent vectorization strategy (cron)

**Goal:** new messages get vectorized on a schedule, and re-running is idempotent + correct under every way the `messages` ledger changes: new rows, **late-arriving / bulk-imported rows with old `occurred_at`** (the IG-import case), `null→content` fills (`ON CONFLICT` fill-if-null), edits, and deletions.

### Why a plain watermark is wrong
A global watermark on `occurred_at` MISSES imported/backfilled messages (their event-time is in the past). A watermark on `created_at` catches new *inserts* (import rows still get a fresh `created_at`) but MISSES `ON CONFLICT DO UPDATE` content-fills (they keep the old `created_at`). So: use `created_at` as the cheap *candidate* filter and a **per-conversation signature** as the *authority*.

### Signature store — `crm_conversation_index` (WP-A adds this)
One row per `(org_id, channel, chat_id)` recording what we last embedded/analyzed:
```
crm_conversation_index (
  org_id text, channel text, chat_id text,          -- PK
  contact_id uuid null, party_id text null,
  eligible_count int,        -- COUNT of embeddable rows (is_group=false, is_bot≠true, content non-empty)
  last_occurred_at timestamptz,   -- MAX(occurred_at) of eligible rows
  last_ingested_at timestamptz,   -- MAX(created_at) of eligible rows
  content_sig text,          -- md5 of concatenated eligible message ids+content (catches edits)
  chunk_count int,
  vectorized_at timestamptz null,
  analyzed_at timestamptz null,
  updated_at timestamptz default now()
) + app_ledger grant + org-GUC RLS
```
`content_sig` = the only thing that catches a content *edit* that doesn't move count or occurred_at. Computing it over the whole ledger every run is cheap enough at this scale (~10k convos); if it ever isn't, drop it from the fast path and rely on the weekly reconcile.

### The tick (`POST /api/crm/conversations/vectorize/tick`)
Called by the netcup external cron (Bearer `CRON_SECRET`, path in `hooks.server.ts` unauth allowlist, same pattern as `/api/finances/sync/daily` per the netcup-cron memory). One batch per call, resumable:
1. **Concurrency guard**: `pg_try_advisory_lock(hashtext('crm-vectorize:'||org_id))`. If not acquired, return `{skipped:'locked'}` — no double-work across overlapping fires (mirrors the gws-exec-lock / `retryOnPoolDrop` resilience patterns).
2. **Candidate scan** (fast): eligible conversations whose ledger `MAX(created_at) > index.last_ingested_at` OR missing from the index. Covers new rows AND late/imported inserts (fresh `created_at` regardless of old `occurred_at`).
3. **Dirty confirm**: for each candidate recompute `(eligible_count, last_occurred_at, content_sig)` and re-embed only if it differs from the stored signature. (No-op when unchanged → idempotent.)
4. **Re-embed a dirty conversation wholesale**: rebuild its chunks, deterministic `chunk_index` 0..n; upsert on `(org_id,channel,chat_id,chunk_index)`, then `DELETE ... WHERE chunk_index >= <new n>` to drop stale trailing chunks (handles a conversation that shrank). Update the index row (`vectorized_at`, new sig, `chunk_count`).
5. **Deletions**: conversations in the index but absent from the ledger candidate/all-scan → delete their chunks + index row (rare; handled in the weekly reconcile, step below, not the hot path).
6. Batch size `CRM_VECTORIZE_BATCH` (default 200 conversations/tick). Return `{processed, dirty, remaining}` so the cron (or a self-chain) drains a backlog.

### Cadence
- **Hot tick**: every 15–30 min (near-real-time; new messages touch few conversations per interval, so most ticks re-embed 0–a handful).
- **Weekly full reconcile**: same tick with `?full=1` ignores the `created_at` filter — recomputes signatures for ALL conversations (catches content edits that kept count+occurred_at, and prunes deleted conversations). Cheap because unchanged sigs skip the embed call.
- **Analysis tick** (`/api/crm/conversations/analyze/tick`): identical machinery keyed on `analyzed_at` + the same signature; re-analyze a conversation only when its signature changed. Cap 120/run (LLM cost). Runs less often (e.g. hourly or daily) since analysis is pricier than embedding.

### Idempotency guarantees (the contract)
- Re-run with no ledger change → every signature matches → **zero embed/LLM calls, zero writes**.
- Bulk import of old-dated messages → picked up via `created_at` candidate filter next tick.
- `null→content` fill → changes `eligible_count` → dirty → re-embedded.
- Content edit (same count/time) → changes `content_sig` → caught on the run that recomputes sig (hot tick recomputes sig for candidates; full reconcile for the rest).
- Two cron fires overlap → advisory lock serializes them.
- A conversation re-embedded twice → same deterministic chunk keys → upsert overwrites, no dupes.

**Cron wiring is a follow-up to enable** (the tick endpoints ship in WP-A; scheduling them in netcup + `CRON_SECRET` is part of the prod-gate handoff). Until then, the backfill scripts + a manual tick call cover ingestion.

## 5. Ponytail cuts (what we deliberately skipped)
- **No per-message embeddings** — conversation chunks only (single messages are noise). Add per-message if targeted moment-lookup is ever needed.
- **No k-means theme clustering** — `crm_conversation_analysis` structured extraction + GROUP BY covers the census questions exactly and cheaply. Add clustering only if freeform theme discovery is later required.
- **No new embedding provider / table framework** — reuse `embeddings.ts` + the `crm_win_embeddings` migration pattern.
- **Email content** stays out (no body stored) — the one genuinely missing source, and it's structural, not our gap.
- **WP-A analysis package is cuttable**: skip it and you still get semantic search (WP-B `search_crm_conversations`) — but you lose exact answers to "are we over-explaining."
