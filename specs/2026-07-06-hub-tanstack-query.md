# Hub — TanStack Query adoption (mutations + out-of-load client reads)

**Date:** 2026-07-06
**Repo:** `minion_hub/` (SvelteKit 2, Svelte 5 runes, Bun, branch `dev`)
**Library:** TanStack Query — https://tanstack.com/query/latest
**Executor:** sonnet subagents, one task per agent. T1 blocks all; T2–T4 parallelizable after T1. T5 independent (no Query dep).

---

## 0. Library decision (read before writing any code)

**Install `@tanstack/svelte-query` v6 — use the adapter as published.** Unlike Virtual (broken shim) and Pacer (no adapter), svelte-query got a real runes rewrite: v6.0.0 shipped 2025-09-30 (PR TanStack/query#9694), current stable 6.1.x, peer `svelte ^5.25.0`, devtools in lockstep. Do NOT wrap query-core by hand — that playbook was for abandoned adapters; this one is maintained.

```bash
cd minion_hub && bun add @tanstack/svelte-query
bun add -d @tanstack/svelte-query-devtools
```

API facts that gate usage:
- **Options are thunks**: `createQuery(() => ({ queryKey, queryFn, ... }))` — reactive deps must be read inside the thunk. Results are read directly (`q.data`, `q.isLoading`) — no `$` prefix, and **never destructure** (getter-based reactive object).
- **SSR**: set `defaultOptions: { queries: { enabled: browser } }` on the QueryClient or queries keep running server-side after HTML streams.
- Note (versioning): svelte-query v6 depends on query-core v5 — correct and intentional, not a mismatch.
- Known open issues to design around: don't `bind:` to query data (#9824 — copy into local `$state` first); build emits cosmetic unused-import warnings from query-core re-exports (#9740 — ignore); mutation status can stick at `pending` if a `goto()` interrupts it (#8772 — settle mutations before navigating in save-then-redirect flows).
- **State-module usage**: `createQuery`/`createMutation` resolve the client from component context. For `.svelte.ts` state modules, export the `QueryClient` singleton from T1 and pass it explicitly (the adapter accepts an optional client argument — verify against installed `.d.ts`; if not supported, keep those call sites component-side).

### Scope boundary (the recon's central finding — do not cross it)

The hub has **91 `+page.server.ts` loads that all enforce RBAC/org-scoping server-side** (`getCoreCtx` → `isModuleEnabled`/`ownerFilter`/`shouldMaskSensitive`), plus a WS gateway pushing live entity state into `$state` modules. Query is adopted ONLY for:

1. **Mutations** (client-side POSTs that today hand-roll optimistic updates with inconsistent rollback),
2. **Client GETs that live outside the load system** (gateway-runtime data, panels, modals — the exact carve-out documented in `src/lib/state/async.svelte.ts:12-17`).

**Never:** retrofit Query under load-gated business pages (crm/finances/socials/stock/scheduling/sales/support — `invalidate()` re-running the RBAC'd load is the feature); never route WS-native domains (agents/sessions/channels/chat/reliability) through the Query cache (they're push-driven, staleness is not their problem); never touch Valkey (server-side, cross-instance) or the registry IndexedDB cache (versioned artifact cache, different shape).

---

## T1 — QueryClient foundation

1. `src/lib/query/client.ts`: export a singleton factory —
   ```ts
   import { QueryClient } from '@tanstack/svelte-query';
   import { browser } from '$app/environment';

   export const queryClient = new QueryClient({
   	defaultOptions: {
   		queries: { enabled: browser, staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
   	},
   });
   ```
2. Mount `<QueryClientProvider client={queryClient}>` in `src/routes/+layout.svelte` (root — check whether `(app)/+layout.svelte` is the better host given the marketing/auth split; wrap the outermost layout that all Query consumers share).
3. Dev-only `<SvelteQueryDevtools />` inside the provider, gated on `import.meta.env.DEV`.
4. **WS invalidation bridge**: the gateway already emits a `cache.invalidate` WS event handled at `src/lib/services/gateway.svelte.ts:582-583` (`dispatchCacheInvalidate` → `cache-invalidate-listener.svelte.ts` tag registry). Add one line there: also call `queryClient.invalidateQueries({ queryKey: [tag] })` for each tag — this gives every future query server-pushed invalidation for free, mirroring what the hand-built cached-store already wired.

**Acceptance:** `bun run check` + `bun run build` pass; devtools panel appears in dev; no SSR query execution (verify no query logs server-side). Commit: `feat(hub): tanstack svelte-query v6 foundation + WS invalidation bridge`.

---

## T2 — Client-GET dedup + boilerplate deletion (the measurable wins)

Migrate these hand-rolled fetch sites to `createQuery`. Each currently re-fetches on every mount with no cache/dedup and hand-rolls `{loading, error, data}` (30 files hand-roll `loading = $state(...)` today; the shared `createAsyncResource` helper has **zero** production callers — delete it at the end of this task if nothing else adopted it):

1. **Workshop leaderboard double-fetch**: `src/lib/components/workshop/experiments/LeaderboardStrip.svelte:16` and `LeaderboardTab.svelte:23` independently fetch `/api/workshop/leaderboard` — same `queryKey: ['workshop','leaderboard']` dedupes them to one request.
2. **`/api/modules` double-owner**: `src/lib/state/plugin-nav.svelte.ts:51` (nav) and `src/routes/(app)/settings/modules/+page.svelte:38` (settings toggle) — one `['modules']` query; the settings mutation invalidates it, nav updates automatically (today they can disagree).
3. **Marketplace**: `src/lib/state/features/marketplace.svelte.ts:56,69` — agents list + detail queries (list one coordinates with the Pacer spec's T2.2 AsyncDebouncer — if Pacer landed first, keep its debouncer calling `queryClient.fetchQuery`; the search term goes in the queryKey, which gives stale-response-safety a second way).
4. **AgentMemoryPanel**: `src/lib/components/agents/AgentMemoryPanel.svelte:82-83` — two parallel GETs on every panel open → two queries with `staleTime: 60_000`, re-open becomes instant.
5. **Personal agent + provision status**: `src/lib/state/features/personal-agent.svelte.ts:53,72`.
6. **Retire `cached-store.svelte.ts`** (215 lines, hand-built Query clone: TTL/SWR/sessionStorage/dedup/tag-invalidation — one production caller): migrate `src/lib/state/features/agent-groups.svelte.ts:145-160` to `createQuery` (keyed `['agent-groups', serverId]`) + its mutations to T3 patterns; the WS tag invalidation is covered by T1.4. Delete `cached-store.svelte.ts`, `cache-invalidate-listener.svelte.ts` (fold its registry into the T1.4 bridge), and their tests.

**QA per surface:** browser-harness — leaderboard strip+tab mount = ONE network request (assert via `read_network_requests`/`js()` on performance entries); modules toggle in settings updates the nav without reload; memory panel re-open renders instantly then refreshes. **Commit:** `refactor(hub): migrate out-of-load client reads to tanstack query + retire cached-store`.

---

## T3 — Mutation lifecycle unification (fixes 3 real rollback bugs)

The recon found 7+ bespoke optimistic-update implementations with inconsistent rollback. Migrate the broken/inconsistent ones to `createMutation({ onMutate, onError, onSettled })`; leave the correct ones alone.

**Fix (broken today):**
1. `src/lib/components/sessions/SessionKanban.svelte:47-67` — drag task to column mutates `task.status` locally, PATCH failure only toasts; **task stays in the wrong column**. `onMutate` snapshot → `onError` revert.
2. `src/lib/state/agents/agent-skills.svelte.ts:42-52` (`toggleGlobalSkill`) and `src/lib/state/agents/agent-tools.svelte.ts:79-88` (`toggleTool`) — optimistic boolean flip, **no revert on RPC failure**. These are module-scope RPC calls, not fetch — if `createMutation` doesn't fit cleanly (context/client issue per T0), the honest fix is 3 lines each: snapshot + revert in `catch`. Do the 3-line fix rather than force Query in.
3. `src/lib/state/features/agent-notes.svelte.ts:177-256` — save/delete failures silently drift from server ("next edit retries" comment at :213). Add error surfacing + revert-or-retry; migrate to `createMutation` only if the create-queue machinery (`creating`/`dirtyDuringCreate`/`deleteAfterCreate`) maps cleanly — otherwise leave the queue, fix the drift.

**Migrate (working but bespoke — unify while touching):**
4. `src/lib/state/features/agent-groups.svelte.ts:198-295` — rides along with T2.6; upgrade `moveAgentToGroup`'s rollback from full-refetch to snapshot-revert via `onError`.

**Leave alone (correct as-is, cite in PR):** `ContactChat.svelte` clientId reconciliation (has failed-state + manual retry, its own UX), `AgentPromptSimulator.svelte:377-388` (textbook prev/next rollback), `prompt-sections.svelte.ts` (WS-reconciled), `config.svelte.ts` hash-based optimistic concurrency.

**QA:** browser-harness with a forced failure path (block the API route via CDP request interception or temporarily point at a 500ing route in dev): kanban drag reverts on failure, skill toggle reverts, note save failure surfaces an error. **Commit:** `fix(hub): mutation rollback gaps + unify optimistic updates on createMutation`.

---

## T4 — Workforce polling: add focus-refetch WITHOUT Query (deliberate non-adoption)

The 9 workforce pages poll via `startPolling(depKey, ms)` → `invalidate()` → server load re-runs **with RBAC intact**. Moving them to `createQuery` would mean client-fetching around the load layer — forbidden by the scope boundary. The only real gap is focus-refetch, and it's 6 lines in one file:

`src/lib/utils/live-polling.ts` — add a `visibilitychange`/`focus` listener inside `startPolling` that fires `invalidate(depKey)` immediately when the tab regains focus (and optionally skips interval ticks while hidden, halving idle traffic). All 9 callers get it for free.

**Commit:** `perf(hub): focus-refetch + hidden-tab pause for workforce polling`.

---

## Phase 2 (do NOT do now)

- Broader `createQuery` sweep over the remaining ~30 hand-rolled loading/error sites (do after T2 proves the pattern; many are one-shot dialogs where the boilerplate is 5 lines and Query buys little).
- `createInfiniteQuery` for any future paginated client list (none urgent today).
- Persister/offline plugins — broken under v6 (#9729), and no offline requirement exists.

## Execution rules (all tasks)

- Branch `dev` in `minion_hub/`; one commit per task; surgical staging (concurrent WIP exists).
- Per task: `bun run check` AND `bun run build` (expect the cosmetic #9740 unused-import warnings — do not "fix" them); restart dev server after deep changes; browser QA via browser-harness.
- Thunk options + no destructuring of query results — enforce in review.
- Coordinate with the Pacer spec (`specs/2026-07-06-hub-tanstack-pacer.md`): its T2 touches marketplace search (this spec's T2.3) — whichever lands second rebases.
- Trust installed `.d.ts` over this spec for exact signatures.
