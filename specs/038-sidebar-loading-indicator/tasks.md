# Tasks: Sidebar loading indicator on the section icon or the header divider

**Input**: `spec.md`, `plan.md` in this directory. Hub anchors @ `origin/master 7d06cdd4` — re-read a line before editing it if master has moved. One worktree, one draft PR to hub `master`. Gates in the foreground with `timeout`, exit codes echoed, never piped into `tail`. **Never run `bun run test`**; `unset SUPABASE_DB_URL` before any vitest run.

Format: `[ID] [P?] [Story] description with exact paths`. `[P]` = different files, can run in parallel.

## Phase 1 — Setup
- [ ] T001 Owner answers D1–D3 in `spec.md` (defaults: `icon-ring`, no `footer`, 1 px). If D3 becomes 2 px, T010's `height` and the idle divider's `h-px` both become `var(--space-0-5)`; nothing else changes.
- [ ] T002 `git -C /home/nikolas/Documents/CODE/MINION/minion_hub fetch origin master && git -C /home/nikolas/Documents/CODE/MINION/minion_hub worktree add ~/.cache/claude-tmp/hub-038 -b feat/sidebar-loading-indicator origin/master && cd ~/.cache/claude-tmp/hub-038 && bun install --frozen-lockfile` (a real install — symlinked `node_modules` hangs Vite and breaks `lint:tokens`). Read `AGENTS.md` and `.claude/skills/ui-design-governance/SKILL.md` there.

## Phase 2 — US2 preference (state + server + Appearance). Tasks T003–T008 are `[P]` with Phase 3.
- [ ] T003 [P] [US2] NEW `src/lib/state/ui/loading-indicator.svelte.ts`:
  ```ts
  /**
   * Where the ONE global busy indicator renders (spec 038). `icon-ring` swaps the
   * sidebar's module icon for the house Spinner while busy; `divider-bar` turns
   * the hairline under the org line into an indeterminate accent sweep. Density
   * pattern: SSR-loaded with the `/api/me/preferences` bundle, a pick wins
   * in-session and is PUT immediately.
   */
  import { page } from '$app/state';
  import { syncPreferenceToServerImmediately } from './preference-sync.svelte';

  export type LoadingIndicatorPlacement = 'icon-ring' | 'divider-bar';
  export const LOADING_INDICATOR_PLACEMENTS: readonly LoadingIndicatorPlacement[] = [
    'icon-ring',
    'divider-bar',
  ];
  export const DEFAULT_LOADING_INDICATOR: LoadingIndicatorPlacement = 'icon-ring';

  /** Anything but the exact server shape `{ version: 1, placement }` is the default. */
  export function decodeLoadingIndicator(value: unknown): LoadingIndicatorPlacement {
    const v = value as { version?: unknown; placement?: unknown } | null | undefined;
    return v?.version === 1 && v.placement === 'divider-bar' ? 'divider-bar' : DEFAULT_LOADING_INDICATOR;
  }

  let picked = $state<LoadingIndicatorPlacement | null>(null);

  export const loadingIndicator = {
    get placement(): LoadingIndicatorPlacement {
      if (picked) return picked;
      const data = page.data as { preferences?: { preferences?: Record<string, unknown> } };
      return decodeLoadingIndicator(data?.preferences?.preferences?.loadingIndicator);
    },
    set(placement: LoadingIndicatorPlacement) {
      picked = placement;
      syncPreferenceToServerImmediately('loadingIndicator', { version: 1, placement });
    },
  };
  ```
  Then append `export * from './loading-indicator.svelte';` to `src/lib/state/ui/index.ts`.
- [ ] T004 [P] [US2] `src/routes/api/me/preferences/[section]/+server.ts`: add `'loadingIndicator',` after `'density',` in `VALID_SECTIONS` (`:25`); after `isValidDensity` (`:38`) add
  ```ts
  /** `{ version: 1, placement: 'icon-ring' | 'divider-bar' }` — sidebar busy indicator (spec 038). */
  function isValidLoadingIndicator(v: unknown): boolean {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const { version, placement, ...rest } = v as { version?: unknown; placement?: unknown };
    return (
      version === 1 &&
      (placement === 'icon-ring' || placement === 'divider-bar') &&
      Object.keys(rest).length === 0
    );
  }
  ```
  and after the `density` branch (`:156-158`) add `if (section === 'loadingIndicator' && !isValidLoadingIndicator(body.value)) { throw error(400, 'Invalid loadingIndicator preference'); }`.
- [ ] T005 [P] [US2] Test: append to `src/routes/api/me/preferences/[section]/server.test.ts` a `describe('PUT /api/me/preferences/loadingIndicator', …)` cloned from the density block (`:88-112`): (a) both placements in `{ version: 1, placement }` → 200 and `upsertUserPreference` last called with `'u1', 'loadingIndicator', { version: 1, placement }`; (b) each of `{ version: 1, placement: 'footer' }`, `{ version: 2, placement: 'icon-ring' }`, `{ placement: 'icon-ring' }`, `{ version: 1, placement: 'icon-ring', extra: 1 }`, `'icon-ring'`, `null` rejects with `{ status: 400 }`.
- [ ] T006 [P] [US2] Test: NEW `src/lib/state/ui/loading-indicator.test.ts` cloned from `density.test.ts` (same `// @vitest-environment happy-dom` header, same `$app/state` mock to `./__fixtures__/preference-owner.svelte`): (a) default is `icon-ring`; (b) `{ version: 1, placement: 'divider-bar' }` in `data.preferences.preferences.loadingIndicator` reads back `divider-bar`, and `decodeLoadingIndicator` returns `icon-ring` for `undefined`, `null`, `'divider-bar'`, `{ placement: 'divider-bar' }`, `{ version: 2, placement: 'divider-bar' }`, `{ version: 1, placement: 'footer' }`; (c) `loadingIndicator.set('divider-bar')` wins in-session and one `fetch` PUT goes to `/api/me/preferences/loadingIndicator` with body `{ value: { version: 1, placement: 'divider-bar' } }`.
- [ ] T007 [P] [US2] i18n — append (never reorder) to `messages/en.json`:
  ```
  "settings_loadingIndicator": "Loading indicator",
  "settings_loadingIndicatorDescription": "Where the app shows that it is working: the section icon turns into a ring, or the divider under your organization becomes an accent line.",
  "settings_loadingIndicatorIconRing": "Section icon",
  "settings_loadingIndicatorDividerBar": "Header divider"
  ```
  and to `messages/es.json`:
  ```
  "settings_loadingIndicator": "Indicador de carga",
  "settings_loadingIndicatorDescription": "Dónde se muestra que la app está trabajando: el icono de la sección se convierte en un anillo, o la línea bajo tu organización se vuelve de color acento.",
  "settings_loadingIndicatorIconRing": "Icono de sección",
  "settings_loadingIndicatorDividerBar": "Divisor del menú"
  ```
  Run `timeout 300 bun run i18n:compile; echo "i18n=$?"`; if `m.settings_loadingIndicator` is missing from `src/lib/paraglide/messages`, `rm -rf project.inlang/cache` and rerun.
- [ ] T008 [US2] NEW `src/lib/components/settings/LoadingIndicatorSettings.svelte` (DensitySettings clone):
  ```svelte
  <script lang="ts">
    import { SegmentedControl } from '$lib/components/ui';
    import {
      loadingIndicator,
      type LoadingIndicatorPlacement,
    } from '$lib/state/ui/loading-indicator.svelte';
    import * as m from '$lib/paraglide/messages';
  </script>

  <section class="flex items-center justify-between gap-4 flex-wrap">
    <div class="space-y-1">
      <h2 class="text-xs font-semibold text-foreground uppercase tracking-wider">
        {m.settings_loadingIndicator()}
      </h2>
      <p class="text-xs text-muted-foreground">{m.settings_loadingIndicatorDescription()}</p>
    </div>
    <SegmentedControl
      size="md"
      aria-label={m.settings_loadingIndicator()}
      value={loadingIndicator.placement}
      items={[
        { value: 'icon-ring', label: m.settings_loadingIndicatorIconRing() },
        { value: 'divider-bar', label: m.settings_loadingIndicatorDividerBar() },
      ]}
      onValueChange={(v) => loadingIndicator.set(v as LoadingIndicatorPlacement)}
    />
  </section>
  ```
  In `src/routes/(app)/settings/appearance/+page.svelte` add `import LoadingIndicatorSettings from '$lib/components/settings/LoadingIndicatorSettings.svelte';` after the `DensitySettings` import (`:10`) and, after the Density card (`:49-51`), `<!-- Loading indicator (spec 038) --><Card padding="md"><LoadingIndicatorSettings /></Card>`.
- [ ] T009 [US2] Test: NEW `src/lib/components/settings/LoadingIndicatorSettings.mounted.test.ts` cloned from `DensitySettings.mounted.test.ts`: group name `'Loading indicator'`, buttons `'Section icon'` (pressed by default) and `'Header divider'`; click the latter → `loadingIndicator.placement === 'divider-bar'`, `aria-pressed` flips, one fetch to `/api/me/preferences/loadingIndicator` with `{ value: { version: 1, placement: 'divider-bar' } }`. (Paraglide resolves `en` under vitest, as the density test relies on.)

## Phase 3 — US1 indicator placement (shell). `[P]` with Phase 2; T011 depends on T010 only for the `xs` size.
- [ ] T010 [P] [US1] `src/lib/components/ui/ProgressBar.svelte`: `export type ProgressBarSize = 'xs' | 'sm' | 'md';` (`:4`); doc on `size` (`:18`) becomes ``/** `xs` = 1px hairline track / no gap (sidebar divider bar), `sm` = 4px track / tight gap, `md` = 6px track. */``; after `.prg-md { gap … }` (`:93-95`) add `.prg-xs { gap: 0; }` and after `.prg-md .prg-track` (`:115-117`) add `.prg-xs .prg-track { height: 1px; }`.
- [ ] T011 [US1] `src/lib/components/layout/Sidebar.svelte`:
  1. Imports (after `:25`): `import ProgressBar from '$lib/components/ui/ProgressBar.svelte';`, `import { tryUseActions } from '$lib/services/actions/context';`, `import { conn } from '$lib/state/gateway/connection.svelte';`, `import { loadingIndicator } from '$lib/state/ui/loading-indicator.svelte';`.
  2. After `const serverVersion …` (`:28`):
     ```ts
     // THE global busy signal (owner 2026-10-10: one subtle indicator; owner
     // 2026-10-23: on the section icon or the header divider, per Appearance —
     // spec 038). Fed by the action runtime (navigation + registered foreground
     // actions) and the gateway reconnect. GlobalActivity owns the live region,
     // so every visual here stays aria-hidden.
     const actions = tryUseActions();
     const busy = $derived(Boolean(actions?.indicatorVisible || conn.connecting));
     const placement = $derived(loadingIndicator.placement);
     ```
  3. `:234` → `<ModuleSwitcher collapsed={collapsed || !isMd} onExpand={toggle} busy={busy && placement === 'icon-ring'} />`.
  4. Replace `:264` with
     ```svelte
     {#if busy && placement === 'divider-bar'}
       <div class="divider-bar mx-2 mb-1" aria-hidden="true">
         <ProgressBar value={null} size="xs" />
       </div>
     {:else}
       <div class="h-px bg-[var(--hairline)] mx-2 mb-1"></div>
     {/if}
     ```
  5. In `<style>`, after `.brand-row:hover { … }` (`:694-697`):
     ```css
     /* Divider-bar placement: the hairline's exact 1px box carries the house
        indeterminate sweep; under reduced motion the range becomes a still
        full-width accent line instead of a parked 40% segment. */
     .divider-bar {
       height: 1px;
     }
     @media (prefers-reduced-motion: reduce) {
       .divider-bar :global(.prg-range.indeterminate) {
         width: 100%;
       }
     }
     ```
- [ ] T012 [P] [US1] `src/lib/components/layout/ModuleSwitcher.svelte`:
  1. Import `Spinner` from `'$lib/components/ui'` (extend `:16`). Props (`:22-28`): add `/** The global busy signal renders in the icon's cell (spec 038, placement icon-ring). */ busy?: boolean;` and destructure `busy = false`.
  2. Collapsed rendering (`:70-73`): `<span class="mini-icons" class:is-busy={busy}>` and add `<Spinner size="md" class="busy-ring shrink-0" />` after the `PanelLeft` line.
  3. Expanded rendering (`:80`): replace `<ActiveIcon size={iconSizes.md} class="shrink-0" />` with
     ```svelte
     <span class="icon-cell" class:is-busy={busy}>
       <ActiveIcon size={iconSizes.md} class="mod-icon shrink-0" />
       <Spinner size="md" class="busy-ring shrink-0" />
     </span>
     ```
  4. CSS: after `.switcher-label { … }` (`:121-128`) add
     ```css
     /* Busy: the house Spinner takes the icon's cell (same 16px box — no shift)
        and crossfades with the icon. Accent, like the divider bar. */
     .icon-cell {
       display: grid;
       place-items: center;
     }
     .icon-cell > :global(*) {
       grid-area: 1 / 1;
     }
     .icon-cell > :global(.busy-ring),
     .mini-icons > :global(.busy-ring) {
       color: var(--color-accent);
       opacity: 0;
       transition: opacity var(--duration-normal) var(--ease-standard);
     }
     .icon-cell.is-busy > :global(.busy-ring),
     .mini-icons.is-busy > :global(.busy-ring) {
       opacity: 1;
     }
     .icon-cell.is-busy > :global(.mod-icon),
     .mini-icons.is-busy > :global(.mod-icon) {
       opacity: 0;
     }
     ```
     and, after the existing `:global(aside:hover) .mini-icons > :global(.mod-icon) { opacity: 0; }` (`:151-153`), `/* Rail hover still means "expand": the ring yields to the panel icon. */ :global(aside:hover) .mini-icons > :global(.busy-ring) { opacity: 0; }`. The `.mod-icon` transition already exists through the icon's own `opacity` rule at `:148-153`; add `transition: opacity var(--duration-fast) var(--ease-standard);` to `.mini-icons > :global(.mod-icon)` only if the hover swap visibly snaps in the proof.
- [ ] T013 [P] [US1] `src/lib/components/layout/SidebarUtilities.svelte`: delete `:32-37` (comment, `actions`, `busy`), `:60-62` (the `busy-slot` span), `:118-125` (its CSS); change `:14` to `import { Button, iconSizes } from '$lib/components/ui';`; delete `:15` (`tryUseActions`) and `:16` (`conn`). Update the header comment (`:6`) to "status dot · upload · bug · notifications · ⌘K · env · profile". Nothing else in the file changes.
- [ ] T014 [US1] Browser proof on `bun run dev:local` (private chromium, never the shared `:9223`); throttle the network or open a heavy page (e.g. `/finances`) so the 150 ms delay is exceeded. Screenshots in the PR body, each named: (1) `icon-ring` expanded busy + idle; (2) `icon-ring` collapsed busy, and collapsed busy while hovering the rail (expand icon shows, ring hidden); (3) `divider-bar` expanded busy + idle; (4) `divider-bar` collapsed busy; (5) both placements with the OS `prefers-reduced-motion` on (still ring / still full accent line); (6) Appearance card before/after a pick, plus the network row of the PUT; (7) a non-admin persona (module mode by default) in `icon-ring`. Verify: the switcher dropdown opens while busy; no vertical shift of the nav list when busy toggles (compare the first nav row's `getBoundingClientRect().top` idle vs busy via `js(...)`).

## Phase 4 — Governance text + gates + PR
- [ ] T015 [P] Hub copy `.claude/skills/ui-design-governance/SKILL.md`: line 55 "the global busy spinner is the sidebar slot (see Async feedback)" → "the global busy indicator is the sidebar header (see Async feedback)"; line 71 "The sidebar `SidebarUtilities` busy slot (desktop) / `GlobalActivity` top sweep (mobile) is the only app-level spinner" → "The sidebar header indicator (desktop: the module icon ring or the header divider bar, per Appearance → Loading indicator, `Sidebar.svelte` + `ModuleSwitcher.svelte`, spec 038) / `GlobalActivity` top sweep (mobile) is the only app-level spinner". Same two edits to the meta copy `/home/nikolas/Documents/CODE/MINION/.claude/skills/ui-design-governance/SKILL.md` in a one-line meta PR to `dev` (or fold into this spec's PR if still open).
- [ ] T016 Gates (hub worktree, foreground):
  ```
  unset SUPABASE_DB_URL
  timeout 600 bun x vitest run src/lib/state/ui/loading-indicator.test.ts src/lib/state/ui/density.test.ts src/lib/components/settings/LoadingIndicatorSettings.mounted.test.ts src/lib/components/settings/DensitySettings.mounted.test.ts 'src/routes/api/me/preferences/[section]/server.test.ts' src/lib/state/ui/nav-mode.test.ts src/lib/components/layout/topbar-parity.test.ts; echo "vitest=$?"
  timeout 300 bun run i18n:compile; echo "i18n=$?"
  timeout 900 bun run check; echo "check=$?"
  timeout 300 bun run lint:design; echo "design=$?"
  timeout 300 bun run lint:tokens; echo "tokens=$?"
  bunx prettier --check $(git diff --name-only origin/master | grep -E '\.(svelte|ts|json|md)$'); echo "prettier=$?"
  ```
  Every echo must print `=0`. Design lint must report no governed-debt increase on `Sidebar.svelte`, `ModuleSwitcher.svelte`, `SidebarUtilities.svelte`, `ProgressBar.svelte`, `LoadingIndicatorSettings.svelte`, `appearance/+page.svelte`.
- [ ] T017 Commit (signed; on "failed to write commit object" check the 1Password app, retry once) and open the draft PR: `gh pr create --draft --base master --title 'feat(shell): loading indicator moves to the section icon or the header divider, chosen in Appearance'`. Body: the rendering contract table from `plan.md`, the T014 screenshots, the gate echoes, "no new route (route contract untouched), no RBAC change, no migration", the spec link `minion-meta specs/038-sidebar-loading-indicator/`, and the D1–D3 answers. No `TODO(handoff)` is expected; if one is left, add the proposal line per the ledger rule.

## Phase 5 — Post-merge
- [ ] T018 Owner verifies on prod per `plan.md` §Verification (both placements, reduced motion) and runs the SC-002 query once.
- [ ] T019 Meta: flip the board stub `specs/2026-10-23-hub-sidebar-loading-indicator-spec.md` to `stage: deploy` / `status: shipped` with `merged_pr`, run `node scripts/spec-index.mjs`.

## Dependencies & parallelism
- Phase 2 (T003–T009) and Phase 3 (T010–T013) touch disjoint files; two implementers can split them on the same branch. T011 needs T003 (import) and T010 (`xs` size) to type-check; T008 needs T003 + T007.
- T014 needs all of Phase 2 + 3 built into one dev server.
- Nothing touches `GlobalActivity.svelte`, `Topbar.svelte`, `runtime.svelte.ts`, `navigation.ts`, `preference-sync.svelte.ts`, the route manifest, or any `+page.server.ts`.

## MVP
Phase 3 with `placement` hard-wired to `icon-ring` would already satisfy the owner's imperative; ship Phase 2 with it — the setting is the second half of the ask and is ~60 lines of clones.
