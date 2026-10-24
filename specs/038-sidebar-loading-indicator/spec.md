# Feature Specification: Sidebar loading indicator on the section icon or the header divider

**Feature Branch**: `spec/038-sidebar-loading-indicator` (meta → `dev`) · hub slice `feat/sidebar-loading-indicator` → `master`
**Created**: 2026-10-23 | **Status**: Draft | **Tags**: ui (one user preference; no new route, no data migration, no RBAC surface) | **Human gates**: none beyond the hub's normal review-merge on `master`
**Input**: Owner, 2026-10-23 (verbatim): "Also, move the loading ring from the bottom section to to section icon. When loading, show the ring, when idle, show the icon; this is option 1. Option 2 is to make the side-menu divider the loading bar, base color when idle, and accent color when loading (can be pulsating, or a loading line (both indefinite or 100% progress, depending if the request size is known or not). This should be configurable in the appearance settings page."

## Owner decisions (answer before the hub PR leaves draft)

**Owner answer (2026-10-23):** D3 = **2 px** ("I like 3b, make it 2px"), shipped in hub #595 `b2c9e957`: 2 px bar + `space-1 − 1px` margin = the idle 1 px hairline + `space-1`, so nothing shifts. D1/D2 left at the recommendations.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Default placement for users who never open Appearance | `icon-ring` (option 1) · `divider-bar` (option 2) | **`icon-ring`** — it is the imperative half of the ask ("move the ring to the section icon"); it also works in the collapsed rail, where the divider is only 40 px wide. |
| D2 | Keep today's footer ring as a third value (`footer`) for continuity? | yes · no | **No.** The ask says "move"; a third rendering path keeps the slot code and the governance text alive for nobody. Two values only; the footer slot is deleted. |
| D3 | Divider-bar thickness while loading | 1 px (= today's hairline, zero layout shift, subtle) · 2 px (more visible; the idle divider thickens too so nothing shifts) | **1 px.** Idle looks exactly like today; revisit after the proof screenshots (`T014`) if the sweep is too faint — the change is one `height` line in `ProgressBar`. |

Not a decision: determinate (0→100 %) progress is **not** available for the global indicator today (see AS-IS §3), so both placements are indeterminate. The hook for later is `ProgressBar`'s `value` prop; nothing else needs to change.

## AS-IS (evidence; hub `origin/master` @ `7d06cdd4`)

### 1. What the footer ring is and what drives it
- The ring is `SidebarUtilities.svelte:60-62`: a `<span class="busy-slot" class:busy aria-hidden="true"><Spinner size="xs" /></span>` sitting between the upload button and the bug button in the sidebar footer row; `:118-125` fades it in/out with `--duration-normal`. The slot is always reserved ("no layout shift", `:35`).
- Its state is **boolean**: `const busy = $derived(Boolean(actions?.indicatorVisible || conn.connecting))` (`:36-37`), where `actions = tryUseActions()` is the action runtime provided by the root layout (`src/routes/+layout.svelte:39`).
- `indicatorVisible` (`src/lib/services/actions/runtime.svelte.ts:73,93-108`) turns on `INDICATOR_DELAY = 150` ms (`:54`) after the first **foreground** action starts and off when `foregroundPending` returns to 0. Background actions never light it (`:94-96`).
- Navigation feeds it through `navigationAction` (`src/lib/services/actions/navigation.ts:5-10`, id `navigation.load`, policy `read`, visibility `foreground`): the root layout syncs SvelteKit's `navigating.complete` promise into the runtime (`+layout.svelte:130-137`). So the ring means "a page load or a registered foreground command (`runCommand`/`runTrackedCommand`/`createAutosave`) is in flight, or the gateway WS is reconnecting" — not only navigation.
- The accessible live region is **not** the ring: `GlobalActivity.svelte:32` renders `<div class="sr-only" role="status">{visible ? m.common_loading() : ''}</div>` on every width; only its visual top sweep is hidden at `min-width: 48rem` (`:93-98`, "Desktop shows the sidebar busy spinner instead"). The ring itself is `aria-hidden`.

### 2. The sidebar header
- `Sidebar.svelte:231-263` is the header: `ModuleSwitcher` (`:234`, `collapsed={collapsed || !isMd}`) beside the hover-revealed collapse button, then `OrgPicker` (`:260-262`, hidden when collapsed). The divider under the org line is `:264` `<div class="h-px bg-[var(--hairline)] mx-2 mb-1"></div>` — rendered in **both** nav modes and **both** rail widths. (The second hairline at `:299` belongs to the top-utility row and is not the target.)
- `ModuleSwitcher.svelte`: expanded = a `Dropdown` trigger `<span class="switcher">` with `<ActiveIcon size={iconSizes.md}>` + label + chevron (`:76-96`); the trigger element is the Dropdown's `<button>` (`:103-105`). Collapsed = a ghost `Button` whose `.mini-icons` grid stacks the module icon and a `PanelLeft` icon in the same cell and swaps them on `aside:hover` (`:60-74`, `:136-153`). Non-admins land in module mode by default (`nav-mode.svelte.ts:61-65`); full mode shows `LayoutList` as the icon (`ModuleSwitcher.svelte:35`).
- Mobile (<48rem): the `<aside>` is `hidden md:flex` (`Sidebar.svelte:225`); `Topbar.svelte` has its own module picker (`:68-85`) and no busy element; the mobile busy visual is GlobalActivity's top sweep.
- A determinate ring recipe already exists in `Sidebar.svelte:702-757` (`.icon-ring` conic border around the Finances icon in the collapsed rail, `--sync-pct`, `.indeterminate` sweep, reduced-motion guard) — it is the finance sync's, driven by `financeSync.percent` (`finance-sync.svelte.ts:160-162`).

### 3. Progress signals
- Action handles expose `progress(completed, total)` (`runtime.svelte.ts:260-278`) and `ActionRecord.progress` (`:37`); `GlobalActivity.svelte:62-66` renders it per **job** in the bottom-right summary popover.
- The only producer is `finance-sync.svelte.ts:84` (`ctx?.progress(s.processed, s.total)`), a background job that does not light `indicatorVisible` and already has its own determinate ring + `FinanceSyncBadge` (`Sidebar.svelte:408-424`).
- `navigation.load` wraps a `Promise<void>`; SvelteKit exposes no byte count. Nothing feeds a determinate value into the global indicator today.

### 4. Appearance settings and preferences
- Page: `src/routes/(app)/settings/appearance/+page.svelte` — stacked `Card`s: language, `DensitySettings` (`:49-51`), logo, theme, accent, pattern, sparkline, `ThinkingStyleSettings` (`:237-239`, hub comment "spec 027" = meta `specs/020-assistant-thinking-shader/`).
- Two preference patterns coexist. **Density (spec 013 A)** is the newer and smaller: `src/lib/state/ui/density.svelte.ts` reads `page.data.preferences.preferences.density` (SSR-loaded by `(app)/+layout.server.ts:139,269`), a pick wins in-session, `set()` PUTs immediately via `syncPreferenceToServerImmediately` (`:37-40`); `decodeDensity` accepts only the exact `{version:1, mode}` shape (`:19-22`). It is **not** registered in `preference-sync.svelte.ts`'s apply/seed lists (`:121-190`) and uses no localStorage. The UI is `DensitySettings.svelte` (`SegmentedControl` with two items, `onValueChange → density.set`). Tests: `density.test.ts`, `DensitySettings.mounted.test.ts` (fixture `src/lib/state/ui/__fixtures__/preference-owner.svelte.ts`), and `api/me/preferences/[section]/server.test.ts:88-112`.
- Server: `src/routes/api/me/preferences/[section]/+server.ts:10-26` `VALID_SECTIONS` allowlist + per-section validators (`isValidDensity:30-38`, applied `:156-158`); `upsertUserPreference` keyed by `profile_id` + section (`user-preferences.service.ts:27-38`); the bundle read is `getUserPreferences` (`:12-21`, returns every section).
- This is the hub's optimistic contract for preferences: the control shows the picked value at once and never binds `data.*` + `invalidate()`. The thinking-style pattern (`thinking-style.svelte.ts`) additionally mirrors to localStorage and the sync registry — more code, no benefit for a shell preference that is SSR-loaded anyway.

### 5. Motion tokens and reduced motion
- Tokens: `--duration-instant/fast/normal/slow` = 75/150/250/400 ms, `--ease-standard/enter/exit/spring` (`packages/design-tokens/contract.json:71-80`). Design lint `raw-motion` flags literal ms in `transition`/`animation-duration` declarations in `.svelte`/`.css` (`scripts/design-lint.mjs:61-65`); `raw-loading` flags `animate-spin|pulse` outside `src/lib/components/ui/` (`:96-100`). Governance (`ui-design-governance/SKILL.md:55,71-72`) forbids bespoke pulse keyframes and names the footer slot "THE global busy indicator".
- Global reduced motion: `app.css:449-456` forces every animation to one 75 ms iteration. `ProgressBar.svelte:141-145` additionally sets `animation: none` on its indeterminate range; the shared `Spinner` spins only under `motion-safe:` (`packages/ui/src/lib/Spinner.svelte:22`) and is `aria-hidden` unless given a `label` (`:23-25`).
- Existing primitives that already carry an indeterminate loop with their own literal durations: `ProgressBar.svelte:128-140` (sweep, 1.2 s) and the finance `.icon-ring` (0.9 s). Reusing them adds no new literal.

## TO-BE

One global busy indicator, placed by a per-user preference:

- **`icon-ring`** — the module/section icon in the sidebar header is replaced by the house `Spinner` (accent colour, same 16 px box) while busy and is the icon again when idle. The switcher stays a working button/dropdown throughout. In the collapsed rail the hover-to-expand swap still wins: hovering the rail shows `PanelLeft`, not the ring.
- **`divider-bar`** — the hairline under the org line is the indicator: idle = today's `--hairline` 1 px line; busy = an indeterminate accent sweep (`ProgressBar` indeterminate, 1 px track per D3) in the same box. Under `prefers-reduced-motion` the sweep is a static full-width accent line.
- The footer ring and its reserved slot are gone. The live region (`GlobalActivity` `role=status`), the mobile top sweep, and the 150 ms delay are unchanged.
- Appearance gains a "Loading indicator" card (same shape as Density: heading, one-line description, `SegmentedControl` with the two placements). The pick applies at once and is PUT immediately; it is SSR-loaded on the next visit on every device.

### Invariants
- **I1** `busy` has exactly one definition in the shell: `Boolean(actions?.indicatorVisible || conn.connecting)`, computed in `Sidebar.svelte` and passed down. No component re-derives it.
- **I2** Exactly one visual indicator renders on desktop at any time; the other placement renders nothing extra (the divider is a plain hairline under `icon-ring`; the icon is the icon under `divider-bar`).
- **I3** No layout shift when busy toggles, in either placement, in either rail width.
- **I4** The module switcher remains operable (focusable, labelled, opens the dropdown / expands the rail) while busy; the indicator element is `aria-hidden`.
- **I5** The stored value is exactly `{ version: 1, placement: 'icon-ring' | 'divider-bar' }`; any other shape decodes to the default (D1) on the client and is refused with 400 on the server.
- **I6** Semantic tokens only; no new `@keyframes`, no new literal durations; `lint:design` and `lint:tokens` debt does not increase.
- **I7** Nothing changes below 48 rem.

## User Scenarios & Testing

### US1 — Staff see where the app is working (P1)
1. **Given** placement `icon-ring` and the expanded sidebar, **When** a navigation takes longer than 150 ms, **Then** the module icon fades to an accent ring and back to the icon when the page has loaded; the label and chevron do not move.
2. **Given** the collapsed rail, **When** busy, **Then** the ring shows in the icon's cell; hovering the rail shows the expand icon instead; clicking still expands.
3. **Given** placement `divider-bar`, **When** busy, **Then** the hairline under the org line shows the accent sweep; idle returns it to the hairline. Same in the collapsed rail (40 px wide).
4. **Given** `prefers-reduced-motion: reduce`, **When** busy, **Then** `icon-ring` shows a still ring and `divider-bar` a still full-width accent line.
5. **Given** the gateway is reconnecting (`conn.connecting`), **Then** the indicator shows as it does for navigation.

### US2 — A user picks the placement in Appearance (P1)
1. **Given** Settings → Appearance, **When** the user clicks "Header divider", **Then** the segmented control shows it pressed at once, `PUT /api/me/preferences/loadingIndicator` carries `{ value: { version: 1, placement: 'divider-bar' } }`, and the sidebar switches placement without a reload.
2. **Given** a stored preference, **When** the user signs in on another device, **Then** the first paint already uses it (SSR bundle).
3. **Given** a malformed body (`{ placement: 'footer' }`, `{ version: 2, … }`, extra keys, a string), **Then** the server answers 400 and writes nothing.

### Edge cases
- No action runtime in context (mounted tests, storybook-like hosts): `tryUseActions()` is null → `busy` false → both placements idle.
- Save fails (network, 5xx): the pick stays in-session (density parity); `preference-sync` records the state; no toast (parity with Density — a toast is out of scope).
- Full nav mode: the switcher icon is `LayoutList`; the ring replaces it the same way.
- `OrgPicker` hidden (collapsed): the divider is still rendered at `:264`, so `divider-bar` keeps working.

## Requirements
- **FR-001** New preference section `loadingIndicator`, value `{ version: 1, placement }` with `placement ∈ {'icon-ring','divider-bar'}`; client decoder defaults to `icon-ring` (D1) for every other shape; server validator mirrors `isValidDensity` (exact keys, version 1).
- **FR-002** State module `src/lib/state/ui/loading-indicator.svelte.ts` on the density pattern (SSR read from `page.data`, in-session pick, `syncPreferenceToServerImmediately`), exported from `src/lib/state/ui/index.ts`.
- **FR-003** `Sidebar.svelte` owns `busy` (I1) and `placement`; passes `busy` to `ModuleSwitcher` only when `placement === 'icon-ring'`; swaps the `:264` divider for the indeterminate bar only when `placement === 'divider-bar'` and busy.
- **FR-004** `ModuleSwitcher` accepts `busy?: boolean`; both renderings stack `Spinner size="md"` (accent) in the icon's cell and crossfade with `--duration-normal`/`--ease-standard`; the collapsed rail's `aside:hover` swap outranks the ring.
- **FR-005** `ProgressBar` gains `size="xs"` (1 px track, no meta gap); the Sidebar consumer wraps it `aria-hidden="true"` (GlobalActivity precedent) and, under reduced motion, widens the indeterminate range to 100 % (scoped rule).
- **FR-006** `SidebarUtilities.svelte` loses the busy slot, its CSS, and the now-unused imports (`Spinner`, `tryUseActions`, `conn`).
- **FR-007** Appearance card `LoadingIndicatorSettings.svelte` (DensitySettings clone) mounted after the Density card; four new Paraglide keys in `en.json` and `es.json` (append-only), `i18n:compile` run.
- **FR-008** Governance text updated in **both** copies of `ui-design-governance/SKILL.md` (meta + hub `.claude/skills/…`): the global busy indicator is the sidebar header indicator (`Sidebar.svelte`, placement per Appearance), not the footer slot.
- **FR-009** No new route (route contract untouched), no RBAC change, no DB migration (`user_preferences` is a JSON-per-section table), no `pos.service` or UI-index export change.

## Success Criteria
- **SC-001** On FACES prod after deploy, navigating between two module pages shows the indicator in the configured placement and nowhere else (owner screenshot, both placements).
- **SC-002** `select count(*) from user_preferences where section='loadingIndicator' and not (value::jsonb ? 'placement')` = 0 forever (server validation holds).
- **SC-003** `bun run lint:design` reports no governed-debt increase on the four touched `.svelte` files; `raw-loading` count unchanged.

## Out of scope
- Determinate progress for the global indicator (no signal exists; AS-IS §3). Background-job progress stays in GlobalActivity's summary popover and the finance ring.
- A pulsing variant of the bar (would need new keyframes; the indeterminate sweep is the existing primitive).
- Mobile (<48 rem) placement; the Topbar keeps GlobalActivity's sweep.
- A save-state toast for preference writes (Density has none either).

## Assumptions
- `tryUseActions()` resolves inside `Sidebar.svelte` exactly as it does in `SidebarUtilities.svelte` today (same subtree under the root provider).
- `Spinner size="md"` (16 px) matches `iconSizes.md` (16) so the icon cell keeps its size (I3). Verified against `packages/ui/src/lib/Spinner.svelte:9-14` and `icon-sizes.ts:7`.
- Meta spec for the hub's "spec 027" comment is `specs/020-assistant-thinking-shader/` (number differs; hub PR #841 per memory — not re-verified here).
