# Hub — TanStack Virtual adoption (list/table/grid virtualization)

**Date:** 2026-07-05
**Repo:** `minion_hub/` (SvelteKit 2, Svelte 5 runes, Bun, branch `dev`)
**Library:** TanStack Virtual v3 — https://tanstack.com/virtual/latest
**Executor:** sonnet subagents, one task per agent, sequential (T1 blocks everything; T2–T4 parallelizable after T1).

---

## 0. Critical library decision (read before writing any code)

**DO NOT install `@tanstack/svelte-virtual`.** The official Svelte adapter (v3.13.31) is a Svelte-4-era store shim (`writable`/`derived`) with open, unresolved Svelte 5 bugs:

- [TanStack/virtual#866](https://github.com/TanStack/virtual/issues/866) (open since Nov 2024): `getScrollElement: () => el` closing over `$state` inside a nested function is never re-tracked → returns `null` forever.
- #932: list jumps to scroll position 0 when the backing array/count changes reactively.
- #969: `setOptions({ count })` doesn't re-render without a manual `virtualizer.measure()`.

**Install `@tanstack/virtual-core` only** (6.7 KB gzip, zero deps) and wrap it in a runes module. This is the community-converged pattern from #866, modeled on the solid adapter. Pin the pattern below; do not improvise.

```bash
cd minion_hub && bun add @tanstack/virtual-core
```

### T1 deliverable: `src/lib/virtual/virtualizer.svelte.ts`

```ts
import {
	Virtualizer,
	elementScroll,
	observeElementOffset,
	observeElementRect,
	observeWindowOffset,
	observeWindowRect,
	windowScroll,
} from '@tanstack/virtual-core';
import type { PartialKeys, VirtualizerOptions } from '@tanstack/virtual-core';

type Opts<S extends Element | Window, I extends Element> = PartialKeys<
	VirtualizerOptions<S, I>,
	'observeElementRect' | 'observeElementOffset' | 'scrollToFn'
>;

export function createVirtualizer<S extends Element, I extends Element>(options: Opts<S, I>) {
	return wrap(
		new Virtualizer<S, I>({
			observeElementRect,
			observeElementOffset,
			scrollToFn: elementScroll,
			...options,
		}),
		options,
	);
}

export function createWindowVirtualizer<I extends Element>(options: Opts<Window, I>) {
	return wrap(
		new Virtualizer<Window, Element>({
			getScrollElement: () => (typeof window !== 'undefined' ? window : null),
			observeElementRect: observeWindowRect,
			observeElementOffset: observeWindowOffset,
			scrollToFn: windowScroll,
			initialOffset: () => (typeof window !== 'undefined' ? window.scrollY : 0),
			...options,
		} as VirtualizerOptions<Window, Element>),
		options,
	) as unknown as ReturnType<typeof createVirtualizer<Element, I>>;
}

function wrap<S extends Element | Window, I extends Element>(
	instance: Virtualizer<S, I>,
	options: Opts<S, I>,
) {
	let virtualItems = $state.raw(instance.getVirtualItems());
	let totalSize = $state(instance.getTotalSize());

	instance.setOptions({
		...instance.options,
		onChange: (inst, sync) => {
			virtualItems = inst.getVirtualItems();
			totalSize = inst.getTotalSize();
			options.onChange?.(inst, sync);
		},
	});

	$effect(() => {
		const cleanup = instance._didMount();
		instance._willUpdate();
		return cleanup;
	});

	return new Proxy(instance, {
		get(target, prop) {
			if (prop === 'getVirtualItems') return () => virtualItems;
			if (prop === 'getTotalSize') return () => totalSize;
			return Reflect.get(target, prop);
		},
	}) as Virtualizer<S, I>;
}
```

**Usage rules (each consumer task MUST follow):**

1. Re-create the virtualizer via `$derived` when inputs change, and read bound elements at the `$derived` level, NOT inside the closure:
   ```svelte
   let el = $state<HTMLDivElement | null>(null);
   const v = $derived(
   	createVirtualizer({
   		count: items.length,
   		getScrollElement: el ? () => el : () => null, // read `el` HERE
   		estimateSize: () => 50,
   		getItemKey: (i) => items[i].id, // stable keys, never index for mutable lists
   		overscan: 6,
   	}),
   );
   ```
   Exception: high-frequency-update surfaces (streaming chat) hoist the instance and call `instance.setOptions({...instance.options, count})` inside an `$effect` instead of re-creating per change.
2. Canonical DOM: scroll container (bounded height + `overflow:auto`, **no padding on this element** — use `paddingStart`/`paddingEnd` options) → relative sizer div at `height:{v.getTotalSize()}px` → absolutely positioned items with `transform: translateY({item.start}px)`.
3. Dynamic heights: set `data-index={item.index}` on each item and call `v.measureElement(node)` — use a Svelte attachment:
   ```ts
   const measure = (node: HTMLElement) => {
   	v.measureElement(node);
   };
   // <div data-index={row.index} {@attach measure}>
   ```
4. SSR: guard with `{#if browser}` (`$app/environment`) or accept the empty first paint — virtual-core is client-measurement-driven; do not fight it.
5. Component must not break when `count === 0` (empty states render outside the sizer).

**T1 acceptance:** wrapper file compiles under `bun run check`; add a minimal self-check route is NOT needed — T2 (SessionViewer) is the proving ground. Commit T1 together with T2.

---

## Recon summary (what we're fixing)

| # | Surface | File | Scale today | Current mitigation | Priority |
|---|---|---|---|---|---|
| T2 | Session transcript viewer | `src/lib/components/sessions/SessionViewer.svelte:228` | up to 1000 (RPC) / 2000 (service default) markdown messages | **none** — plain `{#each}` | HIGH |
| T3 | Shared DataTable (11 consumer pages) | `src/lib/components/data-table/DataTable.svelte` | CRM ~1.6k rows, invoices 10k ceiling | grow-only 60-row window, never unmounts | HIGH |
| T4 | Agent Registry catalog grid | `src/lib/components/builder/AgentRegistry.svelte:163` | ~1,350+ agent cards | IntersectionObserver `visibleCount += 48`, grow-only | HIGH |
| T5 | Sessions list | `src/lib/components/sessions/SessionsList.svelte:113,134` + `src/server/services/session.service.ts:113-132` | **unbounded DB query** (no `.limit()`) | client filter only | HIGH |
| T6 | Console log caps (not virtualization) | flow-editor `ConsolePanel.svelte:81`, tools `ConsolePane.svelte:40` | unbounded append during runs | none | MEDIUM (lazy fix) |
| P2 | Live chat surfaces (home `/home`, ChatPanel, FloatingAssistant) | `src/routes/(app)/home/+page.svelte:670`, `src/lib/components/chat/ChatPanel.svelte:71`, `src/lib/components/layout/FloatingAssistant.svelte:561` | capped at 500 by `chat.svelte.ts` trim | 500-msg trim cap | DEFERRED — phase 2 |
| P2 | AgentMemoryPanel table | `src/lib/components/agents/AgentMemoryPanel.svelte:293` | ≤500 rows, unwindowed | none | DEFERRED — phase 2 |

Explicit SKIPs (do not touch): reliability `ActivityLogTable` (real TanStack pagination, ≤50 mounted), marketplace agents grid (API-capped 50–100), CRM ContactChat/JourneyTimeline (≤200 plain text), socials comments (~25, Graph API), DocTimeline, workshop chat/groupchat/inbox, all small org-scoped tables (TeamTab, BackupsTab, BrainDocumentsTable, etc.), Zag Combobox primitive (all current callers pass small arrays — harden only when a big dataset gets bound), workforce activity feed (backend cap unverifiable from this repo).

---

## T2 — SessionViewer virtualization (chat transcript, the proving ground)

**File:** `src/lib/components/sessions/SessionViewer.svelte`
**Used by:** `src/routes/(app)/sessions/+page.svelte:87` and `src/lib/components/agents/AgentDetail.svelte` (non-"main" sessions). One fix covers both.

Current state: `{#each messages.filter((m) => m.content.trim()) as msg (msg.id)}` at line 228 — full unbounded render of markdown messages (`MarkdownMessage` at line 238); one-shot history load (`limit: 1000` WS RPC at line 87, hub DB cache route falls back to `listChatMessagesBySessionKey` default `limit = 2000` in `src/server/services/chat.service.ts:76-81`); scroll-to-bottom via `setTimeout` after load (lines 137-141). Static transcript — **no streaming, no prepend** — this is the easiest chat surface, which is why it goes first.

Steps:
1. Hoist the filter: `const visible = $derived(messages.filter((m) => m.content.trim()));` — the inline `.filter()` in `{#each}` re-runs on every render.
2. Virtualize `visible` with the T1 wrapper: `count: visible.length`, `getItemKey: (i) => visible[i].id`, `estimateSize: () => 96`, `overscan: 8`, dynamic measurement per rule 3 (markdown heights vary wildly).
3. The existing scroll container becomes the virtualizer's scroll element (verify it has bounded height + `overflow:auto`; if the messages div currently grows with content, give it the height constraint — inspect the parent layout in both consumers).
4. Replace the `scrollToBottom()` calls with `v.scrollToIndex(visible.length - 1, { align: 'end' })` after load (keep the `tick()`/settle timing; dynamic-measured lists may need one repeat call after first measurement pass — acceptable to call it in a `requestAnimationFrame` after the first).
5. Keep the empty state ("no messages") outside the sizer div.

**QA (browser-harness, per memory: hub-ui-browser-testing):** open a long session (FACES sessions have 1000+ message histories) on `/sessions`, verify: transcript renders, scrolled to bottom on open, smooth scroll to top and back, DOM node count in the messages container stays ~O(viewport) (`js('document.querySelectorAll("[data-index]").length')` ≤ ~30), no blank gaps while flinging. Also open the same session from the Agents detail drawer. `bun run check` + `bun run build` must pass (strict prod build catches what dev doesn't).

**Commit:** `perf(sessions): virtualize session transcript viewer with tanstack virtual-core` (include T1 wrapper file).

---

## T3 — DataTable real row virtualization + row-count fix

**File:** `src/lib/components/data-table/DataTable.svelte` (1034 lines, hand-rolled — no TanStack Table inside; do NOT introduce TanStack Table, this task is rows-only).
**Blast radius:** 11 pages. The two that matter: `crm/customers` (~1.6k rows, origin of the 8MB-DOM incident, commit `e51fcf45`) and `finances/invoices` (explicit 10k ceiling, `finance.service.ts:253-255`).

Current mechanism (replace entirely):
- `pageSize = 60` prop (line 134), `renderLimit = $state(pageSize)` (509), `windowed = $derived(view.slice(0, renderLimit))` (510), reset-`$effect` (511-514), `infiniteScroll` action growing `renderLimit` on scroll-near-bottom (515-523) attached to the `overflow-auto` wrapper (746). Grow-only: mounted rows are never unmounted.
- **Row-count display bug** (503-505, 656-660): shows `view.length`/`data.length`, never what's actually mounted, and the unfiltered branch shows plain `data.length` implying everything is rendered.

What stays untouched (already decoupled from the window — verify, don't rework): selection over full `view` (562-567), export over `view` (617-629), inline edit (fires from rendered rows only), sort/filter/search pipeline (434-498), column reorder/resize/persistence.

Steps:
1. Build the flat render list from the FULL `view` (not a slice): reuse/adapt the existing `flatRows` walk (539-548) so it maps `view` → array of typed items: `{ kind: 'row', row, depth }`, `{ kind: 'subrow', ... }`, `{ kind: 'expanded', row }` (the `dt-block-row` colspan content, line 886). Each expanded block is its own virtual item.
2. Virtualize with the T1 wrapper over that flat list. `getItemKey` from `getRowId` (+ suffix for expanded blocks, e.g. `${id}::expanded`), `estimateSize: () => 44` for rows, dynamic `measureElement` on every row (expanded blocks and wrapped cells vary in height).
3. **Table DOM technique — spacer rows, not absolute positioning** (absolutely-positioned `<tr>` breaks table layout). Keep the semantic `<table>`, `<colgroup>`, `table-layout: fixed` (line 952), and the sticky `<thead>` (line 762 — sticky works because rows stay in normal flow):
   ```svelte
   <tbody>
   	{#if items.length}
   		<tr style="height:{firstItem?.start ?? 0}px" aria-hidden="true"></tr>
   		{#each v.getVirtualItems() as vi (vi.key)}
   			<tr data-index={vi.index} {@attach measure} ...>...</tr>
   		{/each}
   		<tr style="height:{v.getTotalSize() - (lastItem?.end ?? 0)}px" aria-hidden="true"></tr>
   	{/if}
   </tbody>
   ```
   where `firstItem`/`lastItem` are the first/last of `getVirtualItems()`. The scroll element stays the existing `overflow-auto` wrapper div (746); delete `infiniteScroll`, `renderLimit`, `pageSize` windowing (keep the `pageSize` prop accepted-but-ignored OR remove it and update the 11 consumers — grep `pageSize` usage first; remove if no consumer passes it).
4. Empty-state row (line 828, `colspan={colSpan + 1}`) renders outside the virtual machinery (plain `<tbody>` branch when `view.length === 0`).
5. **Fix the count display** (656-660): with real virtualization the honest string is back to two cases — filtered: `showing {view.length} of {data.length}`; unfiltered: `{data.length} rows`. That's now TRUE (all view rows are scrollable/reachable), so the existing i18n strings become correct as-is. Verify wording still makes sense; no new paraglide keys needed unless you change copy (if you do: `bun run i18n:compile`, per memory hub-i18n-paraglide-workflow).
6. Known soft regression to accept and note in code: `autoFitColumn` (358-369) samples only mounted cells — already true with the old window, unchanged behavior. Leave a one-line comment.
7. Reset scroll to top when `view` identity changes (filter/sort) — `v.scrollToOffset(0)` in the effect that previously reset `renderLimit`.

**QA:** `/crm/customers` (1.6k rows: fling-scroll whole list, sort a column, filter, select-all → bulk bar shows full-view count, export CSV = full filtered set, expand a row if applicable), `/finances/invoices` (sort by total, open an invoice detail link), `/stock/entries` (row expansion — nested `lines-tbl` renders inside expanded block, expansion survives scrolling away and back), `/socials/posts` (thumbnail column renders while flinging — images lazy-load per row). DOM check: mounted `<tr>` count stays bounded. `bun run check` + `bun run build`.

**Commit:** `perf(data-table): replace grow-only window with tanstack virtual rows + honest row count`.

---

## T4 — Agent Registry card grid (row-chunking)

**File:** `src/lib/components/builder/AgentRegistry.svelte` + `src/lib/state/builder/registry.svelte.ts` (check exact path with grep; recon cites `registry.svelte.ts:19-142`).

Current: `{#each registryDerived.visibleAgents as agent (agent.id)}` (line 163) over a ~1,350-agent catalog (IndexedDB-cached blob from `/api/registry/catalog`), 3-col responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, line 162), grow-only `visibleCount` 48→+48 via IntersectionObserver (`registry.svelte.ts:26,181,207-209`; sentinel wiring `AgentRegistry.svelte:29-41`).

Approach — **row-chunking, NOT `lanes`** (cards are uniform height; lanes is masonry machinery we don't need):
1. Compute `columns` from a container-width `$state` (bind `clientWidth` or a ResizeObserver on the grid container; match the Tailwind breakpoints: 1 / 2 (≥640px) / 3 (≥1024px)).
2. Virtualize `Math.ceil(filteredAgents.length / columns)` rows; each virtual row is a flex/grid row rendering `filteredAgents.slice(rowIndex * columns, rowIndex * columns + columns)`.
3. `estimateSize` = measured card height + gap (inspect actual card; ~160px start), dynamic `measureElement` per virtual row (description wrap varies).
4. Delete the `visibleCount`/IntersectionObserver/loadMore machinery from both files. The full filtered set becomes scrollable immediately.
5. `count` changes when filters/search change → the `$derived`-recreate pattern from T1 rules handles it; also `v.scrollToOffset(0)` on filter change.
6. Scroll element: find the actual scrolling ancestor (may be the page/panel container — if it's the window or a layout-level scroller, use `createWindowVirtualizer` or pass that ancestor; verify with devtools, don't guess).

**QA:** open builder → agent registry, no category filter: fling through the full catalog, verify card count in DOM stays bounded, search narrows instantly, category switch resets to top. `bun run check` + `bun run build`.

**Commit:** `perf(builder): virtualize agent registry grid (row-chunked tanstack virtual)`.

---

## T5 — Sessions list: server cap + virtualization

**Files:** `src/server/services/session.service.ts:113-132` (`listSessions` — **no `.limit()`**), `src/lib/components/sessions/SessionsList.svelte:113,134`, merge logic `src/routes/(app)/sessions/+page.svelte:37-61`.

Two independent fixes, one commit:
1. **Server:** add `.limit(1000)` to `listSessions` (matches the gateway-live side's `MAX_SESSIONS = 1000` in `src/lib/state/gateway/gateway-data.svelte.ts:79,93`; ordered `desc(updatedAt)` already, so cap keeps the newest).
2. **Client:** flatten grouped rendering into one virtual list. Currently two branches: grouped by agent with sticky group headers (line 112-113) and ungrouped (`filtered`, line 134). Build `items: Array<{ kind: 'header', agent } | { kind: 'session', s }>` and virtualize with `getItemKey` (`header:${agentId}` / session key), fixed-ish `estimateSize` (~48 rows, ~36 headers — measureElement anyway). Sticky headers inside a virtualizer: simplest acceptable behavior is non-sticky headers scrolling with content (drop stickiness); if stickiness must stay, use `rangeExtractor` to pin the active header index (TanStack sticky example) — **only if trivial; otherwise drop sticky and note it**.
3. Rows are ~44px fixed — this is the easy one; still bound the scroll container.

**QA:** `/sessions` with the FACES server selected (has the deepest session history), search filter, agent filter, click-through to a session opens SessionViewer (T2 integration). `bun run check` + `bun run build`.

**Commit:** `perf(sessions): cap listSessions at 1000 + virtualize sessions list`.

---

## T6 — Console ring-buffer caps (deliberately NOT virtualization)

Ponytail rung: a cap is one line; virtualization is a component rewrite. Logs older than N are worthless in a debug console.

1. `src/lib/state/features/flow-editor.svelte.ts:634-639` — in `appendLog()`, after push: `if (logs.length > 600) logs.splice(0, logs.length - 500);` (adjust to actual state shape; keep last 500).
2. `src/routes/(app)/tools/[id]/+page.svelte:38-150` — same cap where `consoleLines = [...consoleLines, ...]` is appended.
3. Add `// ponytail: ring buffer, virtualize if anyone needs full-run logs` at both sites.

**QA:** run a flow test with verbose logs; console stays responsive. **Commit:** `perf(hub): cap console log buffers at 500 lines`.

---

## Phase 2 (separate spec/session — do NOT do now)

- **Live chat surfaces** (`/home` ChatTurn thread, ChatPanel, FloatingAssistant): all share `agentChat` state (`src/lib/state/chat/chat.svelte.ts`, 500-msg trim cap) and have streaming + stick-to-bottom + collapsible `<details>` tool/reasoning cards. Virtual-core's chat options (`anchorTo: 'end'`, `followOnAppend`, `scrollEndThreshold`, `scrollToEnd()`, `isAtEnd()`) are the right API, but streaming re-measures every tick and the instance must be hoisted (T1 rule 1 exception). Gate on observed jank — the 500 cap already bounds the DOM. If done: build ONE shared virtual message list and mount it in all three.
- **AgentMemoryPanel** (`src/lib/components/agents/AgentMemoryPanel.svelte:293`): ≤500-row hand-rolled table, spacer-row technique from T3 applies directly; keep the scatter chart reading the FULL `unifiedRows`, only the table body virtualizes.
- **Combobox primitive hardening** (`src/lib/components/ui/Combobox.svelte:150`): virtualize the Zag listbox only when a caller binds a large dataset.

---

## Execution rules (all tasks)

- Branch: work on `dev` in `minion_hub/`. One commit per task, surgical — there may be concurrent WIP in the worktree; stage only your files (memory: surgical commits, oxfmt/pre-push hazards).
- Verify per task: `bun run check` AND `bun run build` (prod build is stricter — memory: only `bun run build` catches some errors). Restart the dev server after deep server-side changes (memory: hub-dev-server-hmr-gotcha).
- Browser QA per task with browser-harness (`new_tab(...)`, not goto; memory: hub-ui-browser-testing — tab IDs churn on HMR, WebGL panes need `js()`).
- Svelte 5 only: runes, `{@attach}` for element hooks, no stores in new code. Run svelte-autofixer/MCP validation on touched components.
- Do not add `@tanstack/svelte-virtual`. Do not add TanStack Table to DataTable. Do not touch RBAC, queries beyond the T5 limit, or unrelated WIP.
- If a task's surface turns out to differ from the recon claims (line numbers drift, structure changed), trust the code, keep the intent.
