# Hub — TanStack consolidated execution plan (Virtual + Query + Pacer + AI-cleanup)

**Date:** 2026-07-06 · **Repo:** `minion_hub/` (SvelteKit 2, Svelte 5 runes, Bun, branch `dev`)
**This document is the single execution order.** Detail specs hold full code/rationale and are referenced per task:
- V = `specs/2026-07-05-hub-tanstack-virtual.md`
- P = `specs/2026-07-06-hub-tanstack-pacer.md`
- Q = `specs/2026-07-06-hub-tanstack-query.md`
- A = `specs/2026-07-06-hub-tanstack-ai-assessment.md` (§3 W1–W3)
- Skipped libraries (DB/Store): `specs/2026-07-06-hub-tanstack-db-store-assessment.md` — no tasks.

## Execution model

**Strictly sequential agents** (T1→T9). One worktree, one dev toolchain: concurrent `bun run build`/git commits in the same checkout clobber each other, so no parallel execution. Each agent: edit → `bun run check` → `bun run build` → commit → report. Browser QA is consolidated into T10 at the end (except where a task says otherwise); per-task verification is check+build.

**Worktree hazards (verified 2026-07-06):** branch `dev`, HEAD `27496634`. UNCOMMITTED third-party WIP exists — **never edit, stage, or commit these files**:
`src/lib/components/users/RbacRolesSection.svelte`, `src/routes/(app)/settings/team/+page.server.ts`, `src/routes/api/users/[id]/member-role/+server.ts`, `src/server/services/rbac.service.ts`, `src/server/services/rbac.service.test.ts`, `src/routes/api/roles/**`, `supabase/migrations/20260702140000_org_roles.sql`.
Always stage by explicit path (`git add <file>...`), never `git add -A`/`-u`/`.`.

**Global rules (every task):**
- Svelte 5 runes only; `{@attach}` for element hooks; no stores in new code. Validate touched components with the svelte MCP autofixer.
- Trust installed package `.d.ts` over spec snippets (pre-1.0 deps churn).
- New i18n strings require `bun run i18n:compile`; avoid new strings where existing keys suffice.
- Recon line numbers may have drifted (HEAD moved since recon) — trust the code, keep the intent.
- Build emits cosmetic unused-import warnings from query-core after T6 (TanStack/query#9740) — do not "fix".
- Commit messages end with the standard Claude Code trailer.

**Collision resolutions (already applied to the task breakdown — do not re-decide):**
1. `SessionViewer.svelte`: T1 (virtualize) lands first; T9 (shared renderer) then swaps only the per-item markup inside the virtual items.
2. `AgentRegistry.svelte`: T3 owns it (virtualization). Its local 200ms search debounce (purely local filter, no race) stays as-is — Pacer explicitly does not migrate it.
3. Marketplace search: assigned to T6 (Query) — `createQuery` keyed by the debounced term (term debounced with the T4 Pacer `createDebouncer`; the term-in-queryKey makes responses race-safe, so no AsyncDebouncer needed here). Pacer T2 keeps only PartyPicker + UserEditor.
4. `flow-editor.svelte.ts`: T5 owns BOTH its autosave migration and its console-log ring buffer (originally split across P-T3 and V-T6) — one agent, one file.
5. `agent-notes.svelte.ts`: T7 owns it entirely (silent-drift fix); its keyed save-timer stays hand-rolled for now (deferred, noted in code comment).
6. `cache.invalidate` WS bridge: T6 adds `queryClient.invalidateQueries` alongside the existing `dispatchCacheInvalidate` at `src/lib/services/gateway.svelte.ts:582-583`, then retires `cached-store.svelte.ts` + `cache-invalidate-listener.svelte.ts` once agent-groups is migrated.

---

## T1 — Virtual foundation + SessionViewer (spec V §T1+T2)

**Install:** `bun add @tanstack/virtual-core`
**Create:** `src/lib/virtual/virtualizer.svelte.ts` — the runes wrapper, full code in V §T1 (createVirtualizer/createWindowVirtualizer, Proxy over `Virtualizer`, `$state.raw` items, `$effect` `_didMount`). Follow V's 5 usage rules (read bound elements at `$derived` level; canonical sizer DOM; `data-index` + `measureElement` attach; `{#if browser}` SSR guard; empty-state outside sizer).
**Modify:** `src/lib/components/sessions/SessionViewer.svelte` — hoist the inline filter to `const visible = $derived(...)`; virtualize `visible` (`getItemKey: id`, `estimateSize: () => 96`, `overscan: 8`, dynamic `measureElement`); scroll element = existing container (ensure bounded height + `overflow:auto` in BOTH hosts: `src/routes/(app)/sessions/+page.svelte` and `src/lib/components/agents/AgentDetail.svelte`); replace `scrollToBottom()` with `scrollToIndex(visible.length-1, {align:'end'})` + one rAF-deferred repeat after first measurement.
**Verify:** check+build. **Commit:** `perf(sessions): virtualize session transcript viewer (tanstack virtual-core + runes wrapper)`

## T2 — DataTable row virtualization + honest count (spec V §T3)

**Modify:** `src/lib/components/data-table/DataTable.svelte` only (1034 lines; hand-rolled — do NOT add TanStack Table).
Replace the grow-only window (`pageSize`/`renderLimit`/`windowed`/`infiniteScroll`, ~lines 134, 509-523) with virtualization over the FULL flattened `view` (adapt `flatRows` walk ~539-548 into typed items: row / subrow / expanded-block, keys from `getRowId` + `::expanded` suffix). **Spacer-`<tr>` technique** (two aria-hidden height rows around the virtual items) — never absolute-position `<tr>`s; keep `<colgroup>`, `table-layout:fixed`, sticky `<thead>`. Empty-state `<tbody>` branch stays outside. Selection/export already operate on full `view` — verify untouched, don't rework. Fix the count display (~656-660) — with real virtualization the existing filtered/unfiltered strings become true; ⚠️ a recent commit "DataTable count filter-gated" already touched this area — read the current code first, keep whichever behavior is now correct. `v.scrollToOffset(0)` where `renderLimit` used to reset. Check `pageSize` prop usage across the 11 consumers (`rg -l 'pageSize' src/routes`); remove if unused.
**Verify:** check+build. **Commit:** `perf(data-table): replace grow-only window with tanstack virtual rows + honest row count`

## T3 — AgentRegistry grid + SessionsList + tools console cap (spec V §T4+T5+T6.2)

**Modify:**
1. `src/lib/components/builder/AgentRegistry.svelte` + `src/lib/state/builder/registry.svelte.ts` — row-chunked grid virtualization (NOT lanes): responsive `columns` from container width (match Tailwind grid breakpoints 1/2/3), virtualize `ceil(filtered/columns)` rows, each rendering a slice; delete `visibleCount`/IntersectionObserver/loadMore machinery; `scrollToOffset(0)` on filter change; find the real scrolling ancestor before wiring. Leave its local search debounce alone.
2. `src/server/services/session.service.ts` (`listSessions`) — add `.limit(1000)` (newest-first already).
3. `src/lib/components/sessions/SessionsList.svelte` — flatten grouped+ungrouped branches into one virtual list of `{kind:'header'|'session'}` items, stable keys; sticky group headers may become non-sticky (acceptable; note in commit) unless `rangeExtractor` pinning is trivial.
4. `src/routes/(app)/tools/[id]/+page.svelte` — cap `consoleLines` at last 500 (`// ponytail: ring buffer, virtualize if anyone needs full-run logs`).
**Verify:** check+build. **Commit:** `perf(hub): virtualize agent registry grid + sessions list, cap listSessions at 1000, tools console ring buffer`

## T4 — Pacer foundation + race fixes + spark-bin flush (spec P §T1+T2+T4)

**Install:** `bun add @tanstack/pacer`
**Create:** `src/lib/pacer/index.svelte.ts` — `createDebouncer` / `createAsyncDebouncer` / `createKeyedDebouncer`, full code in P §T1 (subscribe to each instance's `@tanstack/store`; raw-class escape hatch for module scope; consumers flush-or-cancel on destroy). NEVER `AsyncQueuer` server-side (Node leak #198).
**Modify:**
1. Migrate the 2 `createAutoSave` callers — `src/routes/(app)/agents/builder/[id]/+page.svelte` and `src/routes/(app)/tools/[id]/+page.svelte` (T3 already touched this page's console; coordinate — this task edits only the autosave lines) — to `createDebouncer(save, {wait:2000})` + flush-on-destroy; delete `createAutoSave` from `src/lib/state/async.svelte.ts` (leave `createAsyncResource`/`createConnectedFetch` for T6 to judge).
2. **Race fix** `src/lib/components/crm/PartyPicker.svelte` (~25-38): `createAsyncDebouncer` around the search fetch (wait 200), stale in-flight superseded natively; wire abort signal into fetch if the installed API exposes it cleanly.
3. **Race fix** `src/lib/components/users/UserEditor.svelte` (~37-68): same for alias-availability; ALSO guard commit on `normalized === current input` (one line) since it gates the Save button.
4. **Bug fix** `src/lib/state/chat/chat.svelte.ts` (~51-115): add `visibilitychange`(hidden) + `pagehide` listeners flushing both spark-bin buffers (localStorage + SQLite paths).
**Verify:** check+build. **Commit:** `feat(hub): tanstack pacer wrapper, fix stale-response races in party/alias search, flush spark-bin on pagehide`

## T5 — Debounce consolidation (spec P §T3, minus deferred sites)

**Modify** (each: replace the hand-rolled `clearTimeout`/`setTimeout` idiom with `src/lib/pacer/` helpers; module-scope files use the raw `Debouncer` class):
1. Workshop overlays ×3 (identical copy-paste, each keeps `flush()` on close/Escape/destroy): `src/lib/components/workshop/RulebookOverlay.svelte`, `PortalOverlay.svelte`, `MessageBoardOverlay.svelte`.
2. `src/lib/state/builder/skill-editor.core.svelte.ts` — autosave (~215-219) + ghost-suggestion debounce (~386-400).
3. `src/lib/state/workshop/workshop.svelte.ts` — canvas localStorage autosave (~118-148) + DB snapshot save (~406-425).
4. `src/lib/state/workshop/pixel-office.svelte.ts` (~44-56).
5. `src/lib/state/features/flow-editor.svelte.ts` — autosave (~515-522) AND console-log ring buffer: in `appendLog()` (~634-639) cap at last 500 with a splice + ponytail comment (collision rule 4 — this task owns the whole file).
6. `src/lib/state/ui/preference-sync.svelte.ts` (~9-44) — `createKeyedDebouncer` per section.
**Do NOT touch:** `agent-notes.svelte.ts` (T7's file), `PiAgentTab`, `AgentRegistry`, `NoteEditor`, `PromptShell`, gateway session timers.
**Verify:** check+build. **Commit:** `refactor(hub): consolidate hand-rolled debounces onto pacer module + flow console ring buffer`

## T6 — Query foundation + client GETs + cached-store retirement (spec Q §T1+T2)

**Install:** `bun add @tanstack/svelte-query && bun add -d @tanstack/svelte-query-devtools`
**Create:** `src/lib/query/client.ts` — exported `queryClient` singleton (`enabled: browser`, `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: true`).
**Modify:**
1. `src/routes/(app)/+layout.svelte` — `<QueryClientProvider client={queryClient}>` wrapping content + DEV-gated `<SvelteQueryDevtools/>` (host in the `(app)` layout; marketing tree doesn't need it — verify no Query consumer lives outside `(app)`).
2. `src/lib/services/gateway.svelte.ts` (`case 'cache.invalidate'`, ~582-583) — also call `queryClient.invalidateQueries({queryKey:[tag]})` per tag.
3. Migrate to `createQuery` (thunk options; never destructure results; state modules import the singleton and pass it explicitly if the adapter supports a client argument — else keep component-side):
   - `src/lib/components/workshop/experiments/LeaderboardStrip.svelte` + `LeaderboardTab.svelte` → one `['workshop','leaderboard']` query (dedup).
   - `src/lib/state/plugin-nav.svelte.ts` + `src/routes/(app)/settings/modules/+page.svelte` → one `['modules']` query; the settings toggle mutation invalidates it.
   - `src/lib/components/agents/AgentMemoryPanel.svelte` (~82-83) → two queries, `staleTime: 60_000`.
   - `src/lib/state/features/personal-agent.svelte.ts` (~53, 72).
   - `src/lib/state/features/marketplace.svelte.ts` (~49-69) + `src/routes/(app)/marketplace/agents/+page.svelte` → `createQuery` keyed `['marketplace','agents', term]`, term debounced with T4's `createDebouncer` (collision rule 3); detail query `['marketplace','agent', id]`.
4. **Retire the hand-built clone:** migrate `src/lib/state/features/agent-groups.svelte.ts` off `CachedStore` → `createQuery(['agent-groups', serverId])`; upgrade `moveAgentToGroup` rollback from full-refetch to snapshot-revert; then delete `src/lib/state/cached-store.svelte.ts`, its test, and `cache-invalidate-listener.svelte.ts` (fold any remaining registry consumers into the step-2 bridge — grep first).
5. Delete `createAsyncResource` from `src/lib/state/async.svelte.ts` if it still has zero callers.
**Verify:** check+build (expect #9740 cosmetic warnings). **Commit:** `feat(hub): tanstack svelte-query v6 — foundation, WS invalidation bridge, out-of-load GET migration, retire cached-store`

## T7 — Mutation rollback fixes + focus refetch (spec Q §T3+T4)

**Modify:**
1. `src/lib/components/sessions/SessionKanban.svelte` (~47-67) — `createMutation` with `onMutate` snapshot → `onError` revert (drag-to-column currently persists wrong state on failure).
2. `src/lib/state/agents/agent-skills.svelte.ts` (~42-52) + `src/lib/state/agents/agent-tools.svelte.ts` (~79-88) — revert the optimistic flag in `catch` (3-line local fixes; only use `createMutation` if module-scope client passing is clean).
3. `src/lib/state/features/agent-notes.svelte.ts` (~177-256) — surface save/delete failures + revert-or-retry instead of silent drift; keep the create-queue machinery; add deferred-keyed-debouncer comment (collision rule 5).
4. `src/lib/utils/live-polling.ts` — `visibilitychange`/`focus` listener firing `invalidate(depKey)` on tab focus + skip interval ticks while hidden (all 9 workforce pages inherit; NO Query here, deliberate).
**Leave alone:** ContactChat, AgentPromptSimulator, prompt-sections, config hash-concurrency (correct as-is — cite in commit).
**Verify:** check+build. **Commit:** `fix(hub): mutation rollback gaps (kanban, skill/tool toggles, notes drift) + workforce focus-refetch`

## T8 — Server LLM consolidation (spec A §W2+W3, merged — same files)

**Create:** `src/server/llm.ts` — `getOpenRouterModel(modelId: string)` wrapping the `createOpenAI({apiKey: OPENROUTER_API_KEY, baseURL:'https://openrouter.ai/api/v1'})` + `openrouter(modelId)` pattern.
**Modify:**
1. Swap the ~12 copy-pasted `createOpenAI` blocks onto the factory (`rg -l "openrouter.ai/api/v1" src` for the authoritative list; includes flows copilot, structured-stream, notes refine/autocomplete/polish, CRM tags/cleanup/funnel, crm-insights/journey/similarity services, reminder-compose).
2. Migrate raw-fetch endpoints to the `ai` SDK via the factory: `src/routes/api/builder/ai/{dry-run,analyze-run,suggest-prompts,suggest-skill,suggest-chapter}/+server.ts` (hoist the duplicated pricing tables to one shared const) and `src/routes/api/marketplace/generate-agent/+server.ts` (raw Anthropic Messages API + unvalidated `JSON.parse` → `generateObject` + zod; route through OpenRouter unless direct-Anthropic is required — check env usage).
3. Regex-JSON → `generateObject`+zod in the 6 CRM batch jobs: `crm/tags/[id]/evaluate`, `crm/cleanup/review`, `crm/contacts/[id]/funnel/analyze` (+server.ts each), `crm-insights.service.ts`, `crm-journey.service.ts`, `crm-similarity.service.ts`. Preserve existing best-effort fallback semantics — failures stay quiet, deterministic fallbacks stay (reminder-compose pattern is the model).
**Do NOT touch:** `src/server/services/embeddings.ts` (deliberately raw — documented rationale).
**Verify:** check+build. **Commit:** `refactor(server): shared getOpenRouterModel factory, migrate raw-fetch LLM endpoints to ai SDK, generateObject in CRM batch jobs`

## T9 — Shared chat-block renderer (spec A §W1) — LAST client task, rebases on T1

**Create:** `src/lib/chat/blocks.ts` (pure: normalize Anthropic-style `tool_use`/`tool_result`/`thinking` AND gateway-native `toolCall`/`role:'toolResult'` shapes into typed `ChatBlock[]`; `isToolResultOnly`, `toolResultsById`, `stringifyToolResult`) + `src/lib/chat/ChatBlocks.svelte` (text/markdown, collapsible thinking, tool cards with pending/success/error, image chips; `compact` prop for small surfaces). **Hoist `ChatTurn.svelte`'s implementation — it is the reference; do not rewrite it.**
**Modify (route all five through it):** `src/lib/components/my-agent/ChatTurn.svelte`, `src/routes/(app)/home/+page.svelte` (~272-406 aggregation moves into blocks.ts), `src/lib/components/layout/FloatingAssistant.svelte` (~167-183 copy deleted; gains tool/thinking rendering — intended change), `src/lib/components/chat/ChatMessage.svelte` (gains tool/thinking), `src/lib/components/sessions/SessionViewer.svelte` (inside the T1 virtual items; heights change → `measureElement` already handles it).
**Verify:** check+build. **Commit:** `refactor(chat): shared ChatBlocks renderer across all five chat surfaces`

## T10 — Consolidated browser QA sweep (no commits except fixes)

Dev server up (restart bun after the server-side changes — HMR gotcha), then browser-harness pass:
1. `/sessions` long session: virtual transcript, scrolled to bottom, fling up/down no gaps, `[data-index]` count bounded; open same session from Agents drawer; tool-call bearing session shows tool cards (T9).
2. `/crm/customers` (~1.6k rows): fling, sort, filter, select-all count, CSV export = full filtered set. `/finances/invoices` sort + detail link. `/stock/entries` row expansion survives scroll-away. `/socials/posts` thumbnails while flinging.
3. Builder registry: full-catalog fling, bounded DOM, search + category reset-to-top.
4. PartyPicker + marketplace search + alias field under CDP network throttling: final results match final input; Save button never enables off stale verdict.
5. Kanban drag with API blocked → reverts. Skill toggle with gateway RPC failing → reverts.
6. Leaderboard strip+tab mount = 1 network request; settings module toggle updates nav without reload; memory panel re-open instant.
7. Workshop overlays autosave (edit → close → reopen persisted); flow test-run console stays capped; `/home` chat + ⌘J assistant render identically per message.
8. One CRM tag evaluate run + one builder suggest endpoint hit (T8 smoke).
Fix-forward anything broken (surgical commits). Report pass/fail per item.

## After T10

Stop. Do NOT push or deploy — prod push is currently blocked by the unapplied stock-accruals migration (`stk_warehouses.is_default`), and deploy needs explicit user go. Deliver a summary + updated memory instead.
