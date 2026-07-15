# Hub — TanStack Pacer adoption (debounce/throttle/rate-limit standardization)

**Date:** 2026-07-06
**Repo:** `minion_hub/` (SvelteKit 2, Svelte 5 runes, Bun, branch `dev`)
**Library:** TanStack Pacer — https://tanstack.com/pacer/latest
**Executor:** sonnet subagents, one task per agent. T1 blocks all; T2–T4 parallelizable after T1. T5–T6 optional phase 2.

---

## 0. Library decision (read before writing any code)

**Install `@tanstack/pacer` core only.** There is NO Svelte adapter (`@tanstack/svelte-pacer` does not exist — verified 404 on npm, no package in the repo, no open issue asking for one). Unlike TanStack Virtual, this is fine: the core is plain framework-agnostic classes; the official React/Solid adapters are just `new Debouncer(fn, opts)` + a store subscription, so a runes wrapper is the intended usage pattern, not a workaround.

```bash
cd minion_hub && bun add @tanstack/pacer
```

Facts that gate how we use it:

- **Pre-1.0** (`0.21.1`, ~monthly minors with churn). Import via subpath exports (`@tanstack/pacer/debouncer`, `/async-debouncer`, …) — `sideEffects: false`, each primitive tree-shakes independently.
- **Known open bugs** (check if fixed at install time, adapt if so):
  - `AsyncQueuer` leaks memory in long-lived **Node** processes (issue #198 — devtools event client queues events forever when no `window`). Browser use is unaffected. **Rule: do not use `AsyncQueuer` in hub server code or anything that could run on the flows-runner/gateway.**
  - `AsyncQueuer` silently drops falsy items (#200) — wrap primitives in objects if ever queued.
  - Sync `Debouncer.getAbortSignal()` is broken (#—) — use `AsyncDebouncer` when you need abort.
- **Rate limiters are in-process only** — no persistence, no distributed window. Never present a Pacer `RateLimiter` as protection for a shared external quota across serverless invocations; it only shapes calls within one process/tab.
- **Retry lives in Pacer** (`AsyncRetryer` underlies all Async* variants): `backoff: 'exponential'`, `baseWait`, `jitter`, `maxAttempts`, abort signal. Async single-flight semantics: a new `execute()` **aborts the previous in-flight execution** — this is the feature we're adopting it for.

### The scope decision (deliberate, don't expand)

The recon found **17 hand-rolled debounce sites + 3 real race bugs + an existing correct-but-under-adopted local util** (`createAutoSave` in `src/lib/state/async.svelte.ts:121-145`, used by only 2 of ~19 sites). The plan:

- **One pacing module** for the whole hub: `src/lib/pacer/` (new). `createAutoSave` gets migrated into it and deleted — no two-primitive split.
- **`AsyncDebouncer` is the killer app**: it makes stale-response-safe async debouncing the *default* instead of an opt-in convention (the codebase already knows the right pattern — `recordSearchSeq` in `src/lib/state/ui/command-palette.svelte.ts:78-103` — it's just not applied at 3 other sites, which are live bugs).
- **Do NOT migrate**: the chat typewriter smoother (`chat.svelte.ts:186-322` — bespoke animation loop, deliberately `setTimeout` not rAF for background tabs, no Pacer primitive matches), DB bind-limit chunking loops (not call-pacing), the workshop agent-queue (domain data structure), DB-persisted backoff schedules (`personal-agent-provisioner.ts` — cross-request state, out of Pacer's scope), server-side identity cooldowns (DB-persisted, distributed).

---

## T1 — `src/lib/pacer/` runes wrapper module

Create `src/lib/pacer/index.svelte.ts` exposing three helpers. Pattern mirrors what react-pacer does internally (instantiate core class, subscribe to its `@tanstack/store`):

```ts
import { Debouncer, type DebouncerOptions } from '@tanstack/pacer/debouncer';
import { AsyncDebouncer, type AsyncDebouncerOptions } from '@tanstack/pacer/async-debouncer';
import type { AnyFunction } from '@tanstack/pacer/types';

function reactive<T extends { store: { state: unknown; subscribe(cb: () => void): () => void } }>(
	instance: T,
) {
	let state = $state(instance.store.state);
	$effect(() => instance.store.subscribe(() => (state = instance.store.state)));
	return {
		instance,
		get state() {
			return state;
		},
	};
}

export function createDebouncer<TFn extends AnyFunction>(fn: TFn, options: DebouncerOptions<TFn>) {
	const d = new Debouncer(fn, options);
	const r = reactive(d);
	return {
		run: (...args: Parameters<TFn>) => d.maybeExecute(...args),
		cancel: () => d.cancel(),
		flush: () => d.flush(),
		get isPending() {
			return (r.state as { isPending: boolean }).isPending;
		},
	};
}

export function createAsyncDebouncer<TFn extends AnyFunction>(
	fn: TFn,
	options: AsyncDebouncerOptions<TFn>,
) {
	const d = new AsyncDebouncer(fn, options);
	const r = reactive(d);
	return {
		run: (...args: Parameters<TFn>) => d.maybeExecute(...args),
		cancel: () => d.cancel(),
		flush: () => d.flush(),
		get isPending() {
			return (r.state as { isPending: boolean }).isPending;
		},
		get isExecuting() {
			return (r.state as { isExecuting: boolean }).isExecuting;
		},
	};
}

// keyed variant: one debouncer per key (sections, note ids, session keys)
export function createKeyedDebouncer<TFn extends AnyFunction>(
	fn: (key: string) => TFn,
	options: DebouncerOptions<TFn>,
) {
	const map = new Map<string, Debouncer<TFn>>();
	return {
		run(key: string, ...args: Parameters<TFn>) {
			let d = map.get(key);
			if (!d) {
				d = new Debouncer(fn(key), options);
				map.set(key, d);
			}
			d.maybeExecute(...args);
		},
		flushAll() {
			for (const d of map.values()) d.flush();
		},
		cancelAll() {
			for (const d of map.values()) d.cancel();
			map.clear();
		},
	};
}
```

Adjust exact option/state field names to the installed version's types — the shape above is from 0.21.1 (`isPending`, `isExecuting`, `maybeExecute`, `cancel`, `flush`); trust the package's `.d.ts` over this spec.

**Rules for consumers:**
1. Instantiate ONCE per component/module scope (top of `<script>` or module state) — never inside `$effect`/handlers.
2. Components that hold a debouncer with pending work MUST `flush()` or `cancel()` in `onDestroy` (choose per semantics: autosave → flush, search → cancel).
3. `reactive()` uses `$effect` so `createDebouncer` in a `.svelte.ts` module without component context needs `$effect.root` — if a module-scope consumer hits this, add a `lazy: true` escape hatch that skips reactivity (most module-scope users don't need `isPending`).
4. Non-component modules that only need schedule/cancel/flush can use the raw `Debouncer` class directly — the wrapper is for components that want reactive pending state.

Then: migrate the 2 `createAutoSave` callers (`src/routes/(app)/agents/builder/[id]/+page.svelte:30`, `src/routes/(app)/tools/[id]/+page.svelte:35`) to `createDebouncer(save, { wait: 2000 })` + flush-on-destroy, and **delete `createAutoSave`** from `src/lib/state/async.svelte.ts:121-145`.

**Acceptance:** `bun run check` + `bun run build` pass; both autosave pages still save (browser QA: edit, wait 2s, reload, change persisted). Commit: `feat(hub): tanstack pacer runes wrapper + retire createAutoSave`.

---

## T2 — Fix the 3 stale-response race bugs with `createAsyncDebouncer` (HIGH — real bugs)

Each site debounces the *scheduling* of a fetch but commits the response unconditionally — a slow early response can overwrite a fast later one. `AsyncDebouncer`'s single-flight (new execution aborts the previous) fixes this natively; also pass its abort signal into `fetch` so stale requests actually cancel.

1. **`src/lib/components/crm/PartyPicker.svelte:25-38`** — party search-as-you-type (200ms). Replace timer with `createAsyncDebouncer(async (term) => { results = await search(term, signal) }, { wait: 200 })`. Wire `AbortSignal` from the retryer into the fetch (check `getAbortSignal()` availability on `AsyncDebouncer` in the installed version; if awkward, the single-flight result-discard alone fixes the visible bug).
2. **`src/lib/state/features/marketplace.svelte.ts:49-65` + `src/routes/(app)/marketplace/agents/+page.svelte:17,43-54`** — search → `loadAgents()` commits `marketplaceState.agents` with no token check. Move the debounce out of the component into the state module as an `AsyncDebouncer`; component just calls `marketplace.search(q)`.
3. **`src/lib/components/users/UserEditor.svelte:37,51-68`** — alias-availability check sets `availability` from a stale response, and it **gates the Save button** (`aliasValid`, lines 46-49) — user-visible correctness bug. Same treatment; additionally guard commit on `normalized === current input` (belt and suspenders, one line).

Reference implementation of the correct pattern already in-repo (leave it alone, cite it in the PR description): `runRecordSearch` seq-token in `src/lib/state/ui/command-palette.svelte.ts:78-103`.

**QA:** browser-harness with devtools network throttling (`cdp('Network.emulateNetworkConditions', ...)`): type fast in PartyPicker / marketplace search / alias field, verify final results match final input; alias Save button never enables off a stale verdict. **Commit:** `fix(hub): stale-response races in party/marketplace/alias search via pacer AsyncDebouncer`.

---

## T3 — Consolidate the copy-paste debounce sites (MEDIUM)

Migrate the mechanical duplicates onto `src/lib/pacer/`. Same behavior, less code — each is currently the identical `clearTimeout`/`setTimeout` idiom:

1. **The triplicated workshop overlays** (literal 5-line copy-paste ×3, each with a manual `flush()`): `src/lib/components/workshop/RulebookOverlay.svelte:15-24`, `PortalOverlay.svelte:15-32`, `MessageBoardOverlay.svelte:19-37` → `createDebouncer(save, { wait: 500 })`, `flush()` on close/Escape/destroy.
2. **Autosave timers:** `src/lib/state/builder/skill-editor.core.svelte.ts:215-219` (2s) and `:386-400` (ghost suggestions), `src/lib/state/workshop/workshop.svelte.ts:118-148` (300ms canvas) and `:406-425` (DB snapshot), `src/lib/state/workshop/pixel-office.svelte.ts:44-56`, `src/lib/state/features/flow-editor.svelte.ts:515-522` (2s). These are module-scope — use the raw `Debouncer` class per T1 rule 4.
3. **Keyed debounce maps** → `createKeyedDebouncer`: `src/lib/state/ui/preference-sync.svelte.ts:9-44` (per-section PUT, 1s), `src/lib/state/features/agent-notes.svelte.ts:182-193` (per-note PUT, 600ms). Do NOT touch `gateway.svelte.ts` session-status/evict timers in this task (they're entangled with WS lifecycle — phase 2 at most).
4. **Leave as-is (works, no win):** `PiAgentTab.svelte:29-37`, `AgentRegistry.svelte:15,43-51` (⚠️ this component is also being rewritten by the Virtual spec T4 — coordinate; if Virtual T4 already landed, migrate its debounce then), `NoteEditor.svelte` voice buffer, `PromptShell.svelte` (optional: its `previewToken` guard collapses into `createAsyncDebouncer` — do it only if trivial).

**QA:** each migrated surface: edit → wait → verify persisted (workshop overlays, skill editor, flow editor autosave, preference toggle, agent note edit). **Commit:** `refactor(hub): consolidate 12 hand-rolled debounces onto pacer module`.

---

## T4 — Spark-bin unload flush (bundled bug fix, not Pacer)

`src/lib/state/chat/chat.svelte.ts:51-70,101-115`: spark-bin flushes localStorage every 3s and SQLite every 30s with **no `beforeunload`/`visibilitychange` flush** — tab close silently drops up to 30s of activity data. Fix independent of primitive choice: add one `visibilitychange` (hidden) + `pagehide` listener that calls both flush paths. Keep the existing timers (or migrate to `Debouncer` while there — optional).

**Commit:** `fix(hub): flush spark-bin buffers on pagehide/visibilitychange`.

---

## Phase 2 (optional — do NOT do now, revisit after phase 1 ships)

- **Gateway polling loops** (`src/lib/services/gateway.svelte.ts:1107-1159`): hand-rolled `agentsPollInFlight`/`presencePollInFlight` booleans are structurally what `Queuer(concurrency:1)` provides, but they *work* and touch the WS lifecycle — marginal win, real regression risk. Also the workforce `startPolling` util (`src/lib/utils/live-polling.ts:13-18`, 9 callers) has no in-flight guard; SvelteKit `invalidate()` largely dedupes, so LOW.
- **SUSII connector pacing** (`src/server/finance/connectors/susii-client.ts:10,93`): `PAGE_DELAY_MS=300` inter-page sleep is a clean `AsyncRateLimiter` fit; its retry/backoff array stays (works fine). Server-side, short-lived function — in-process limiting is valid within one sync run.
- **Meta Graph API pacing gap** (`meta-sync.service.ts` — currently zero client-side rate limiting, failures tolerated not retried): a real *opportunity* (nothing to replace), but remember Pacer is in-process only — it cannot protect the Meta quota across concurrent Vercel invocations. If Meta 429s ever bite, the fix is Valkey-backed, not Pacer.
- **Naming collision cleanup:** two unrelated `startPolling` functions exist (`live-polling.ts` and module-private in `gateway.svelte.ts`) — rename one when next touched.

---

## Execution rules (all tasks)

- Branch `dev` in `minion_hub/`. One commit per task, surgical staging (concurrent WIP exists in this worktree).
- Per task: `bun run check` AND `bun run build`; restart dev server after deep server-side changes; browser QA via browser-harness.
- Svelte 5 runes only; run svelte-autofixer on touched components.
- Trust the installed `@tanstack/pacer` version's types over this spec's field names (pre-1.0 churn).
- Do not use `AsyncQueuer` anywhere server-side (Node memory leak #198) until verified fixed.
