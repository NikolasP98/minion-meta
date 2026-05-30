# Unified Prompt Tab — UX Council Design Spec

**Date:** 2026-05-30
**Goal:** Merge the standalone `/prompt` page into the `/agents` → **Prompt** tab so there is ONE
prompt workbench that has real rendered prompt data + per-item cacheability + a unified assembled
view + section isolation (from `/prompt`) AND genuinely live ad-hoc prompt testing + a pipeline lens
(from the agents Prompt tab) — sorted by **category AND order**, fit into the constrained agents pane
without feeling crammed.

Produced by a 5-specialist UX panel (IA, Interaction, Visual/Layout, Patterns, Progressive
Disclosure) + PM synthesis.

---

## Code grounding (what exists today)

| | `/prompt` (Surface A) | `/agents` Prompt tab (Surface B) |
|---|---|---|
| Root | `src/routes/(app)/prompt/+page.svelte` → `PromptShell.svelte` | `AgentDetail.svelte` → `AgentPromptSimulator.svelte` |
| State | `src/lib/state/features/prompt-sections.svelte.ts` (`promptSections` runes) | local `$state` in `AgentPromptSimulator` + `ui.svelte.ts` |
| Children | `AssembledPromptPane`, `BreakdownTree`, `SelectionDetail`, `PromptTopbarChip`, `AgentSelector`, `SectionCheckbox`, `AgentAvatarStack`, `MarkdownView`, `ValidationErrors` | `_agent-prompt-simulator/`: `ContextWindowBar`, `PipelineSidebar`, `SectionDetail`, `ClassicDetail`, `types.ts` |
| RPCs | `prompt.sections.list/get/upsert/delete/preview/overrides.get/overrides.set/usage` | `prompt.preview {agentId}`, `sessions.usage {key, includeContextWeight}` |
| Preview shape | `{assembled, breakdown[{id,layer,order,bytes,tokens,cacheable,source,rendered}], totalBytes, totalTokens, tokenizer}` | `SystemPromptReport {sections[{id,layer,label,chars,order,content?,source?}], skills, tools, injectedWorkspaceFiles, systemPrompt...}` |
| Strength | real data, per-item ⚡ cacheable, assembled view, on/off overrides, inline custom-YAML edit | pipeline lens, session selector, char-budget bar, source badges, Raw toggle |
| Gap | no ad-hoc test | **test textarea is never sent to backend**; "live build" = client-side `sleep(220ms)` fake spinner; no order sort; generic (no per-input dynamic data) |

**Key insight:** `prompt.sections.preview` is the richer RPC — it already returns per-section
`bytes/tokens/cacheable/order/source/rendered` + the concatenated `assembled` string. The agents tab
should consume it. The test textarea is wired to nothing.

---

## Consensus (4–5 of 5 specialists)

1. **Section list is the primary navigation/control object**; assembled prompt is the verification surface. (5/5)
2. **One segmented lens control**, not separate views — reflow the same rows in place. (4/5)
3. **Kill the fake `sleep(220ms)` animation** — be honest (real stream, or hold-then-reveal). (5/5)
4. **Cacheability shown twice**: ⚡ on the row + one aggregate stat (`⚡ X% cached`) in the budget bar. (3/5)
5. **Two-column base; inspector is NOT a permanent third column.** (4/5)
6. **Tier the row** — most metadata moves to hover / inspector. (5/5)
7. **Auto-save toggles; explicit save (Cmd+S) for custom bodies.** (consensus)
8. **Layer = subtle single-hue left-border tint, not a rainbow.** (2/5 strong, no dissent)

---

## Resolved conflicts (PM decisions)

- **Hero:** Section list is the *control* hero (where you act); Assembled is the *output* hero (where
  you verify). Both visible ≥1280px; Assembled collapses behind a tab <1280px.
- **Inspector:** **320px slide-over peek** overlaying the assembled pane's right edge on row-click
  (VS Code peek / Linear detail). Not a persistent 3rd column (breaks width), not a right-tab (hides
  the assembled view).
- **Lens control:** **Two axes — `Group by` (LAYER · NONE · PIPELINE) + `Sort by` (CACHED · ORDER ·
  ALPHA · SIZE)** in the rail header. This maps directly to the request ("sort by category AND by
  order"): Group-by = category/pipeline, Sort-by = the 100/300/500/1xxx order. Pipeline grouping
  injects sticky stage headers. Order sort uses banded dividers (0–499 / 500–999 / 1000+). Active
  state reads back in the budget bar ("35 sections · grouped by layer · sorted by order").
- **Snapshot vs test:** **Explicit `Inspect` / `Simulate` topbar toggle** with a dot-when-dirty.
  Inspect → SESSION selector + real rendered data. Simulate → docked test composer + Baseline/Test
  diff. Removes the "am I seeing real or hypothetical?" ambiguity.
- **Row tier-1:** **name + right-aligned bytes (tabular) + toggle (on hover / when off).** Order, ⚡,
  source badge, avatars → hover or inspector.
- **Test input location:** **docked at the bottom of the 280px sections column**, revealed in
  Simulate mode (80px rest → 160px on focus, ⌘↵ to run). Not full-width, not topbar.

---

## Unified design

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Inspect ▾session] [Simulate ○]   ⚡61% cached  ████▓▓░░ 73k/800k·9%   │ 36px topbar
├───────────────────────────┬──────────────────────────────────────────┤
│ Group:[Layer▾] Sort:[Order▾] │  ASSEMBLED PROMPT          7,092 tokens │
│ 35 sections·layer·order   │                                           │
│ ▾ PLATFORM         12.4k  │  # System Prompt                          │
│ │ identity      4.2k  ⚡   │  You are…                                 │
│ │ safety        3.1k  ⚡   │  ─ ─ ─ cacheable boundary ─ ─ ─           │
│ ▾ AGENT TYPE        6.1k  │  [rendered, scroll-synced to selection]   │
│ │ skills        1.8k      │                                           │
│ ▾ SESSION           0.8k  │                                           │
│ │ runtime       0.3k      │            [row click → 320px             │
│ ┄┄┄ Recomputes per turn ↓ │             inspector slides in ◀]        │
│ [Simulate: test input…]   │                                           │
│ [▶ Run ⌘↵]                │                                           │
└───────────────────────────┴──────────────────────────────────────────┘
   280px fixed                  flex-1 (hero output)
```

- **Live build (Simulate + Run):** each row is a state machine `cached | pending | streaming | done |
  error`. Cacheable/static sections flip to `done` instantly (⚡ pulse); dynamic
  (session/user/memory) sections shimmer → single-pass reveal as the stream lands; bytes tick up;
  budget segments grow; assembled view appends section-by-section. List **freezes** (no reorder);
  slim progress bar under each group header; checkmarks persist 3s. The `Recomputes per turn ↓`
  divider teaches the cache boundary. **If no stream available, hold all `pending` and reveal
  together — never fake it.**
- **Override clarity (DevTools authored-vs-computed):** overridden rows get a 2px warning left-stripe
  + an "overridden" pill that one-click-resets (surfaces the buried reset).
- **Source-type gating (LangSmith spans):** generated/builtin → read-only `<pre>` + lock icon; file →
  "Open file"; custom → editable + Cmd+S.
- **Anxiety reduction:** "missing" → neutral `—` + muted yellow dot (red only for render errors);
  "0/35" → "35 sections" (fraction only when filtered); budget % primary, raw counts in tooltip, bar
  → amber at 80%.
- **Keyboard:** ↑/↓ navigate, Space toggle on/off, Enter open inspector, E edit (if custom), ⌘↵ run;
  list is `role=listbox` + `aria-activedescendant` for streaming announcements.
- **Responsive:** <1280px assembled collapses behind a tab; <1024px sections list → toggle-drawer.

---

## Implementation phases

### Phase 1 — Quick wins (frontend only, existing RPCs)
- Delete the `sleep(220ms)` fake animation in `AgentPromptSimulator`.
- Switch the agents Prompt tab to consume `prompt.sections.preview` (richer: bytes/tokens/cacheable/
  order/rendered) instead of / alongside `prompt.preview`.
- Add `Group by` (LAYER · NONE · PIPELINE) + `Sort by` (CACHED · ORDER · ALPHA · SIZE) controls in
  the rail header + Order banded dividers.
- Add `⚡ X% cached` stat to `ContextWindowBar`; tier-down the row (name + bytes; hover-reveal
  order/⚡/source/toggle).
- Fix "missing"/count/budget anxiety states.

### Phase 2 — Structural (frontend)
- Collapse to 2-column + 320px inspector **slide-over**.
- `Inspect` / `Simulate` topbar toggle; move test input to a Simulate-only docked composer;
  Baseline/Test diff (amber).
- Override stripe + one-click reset pill; source-type interaction gating.
- Full keyboard model + listbox a11y.

### Phase 3 — Real streaming + polish (needs backend)
- New streaming RPC accepting `{agentId, testInput}` that emits per-section render events.
  **Reuse the existing gateway per-node lifecycle event infra from flow Test Runs** (commit
  `f1fd487` "per-node lifecycle events for live Test Run") — same start/delta/done event shape, node
  → section. Wire the row state machines + live assembled append to it.
- Only Phase 3 needs backend work; Phases 1–2 ship on existing RPCs.

---

## Rejected ideas
- **Persistent 3-column layout** — breaks the constrained-width budget; assembled drops below
  readable min. → slide-over.
- **Pipeline as a hidden overlay** — adds invisible state. → first-class third segment.
- **Re-render-in-place snapshot/test blur** — ambiguous real-vs-hypothetical. → explicit
  Inspect/Simulate.
- **Name+toggle-only row** — too sparse for weight-debugging. → + bytes.
- **Topbar test input** — too cramped for multiline. → docked composer (keep the Inspect/Simulate
  chip in the topbar).
- **Page-level reset-all / separate environments modal / nested tree depth** — keep a flat list +
  per-row inline reset.
- **Character-by-character typewriter reveal** — theatrical/slow. → single-pass per-section reveal.
