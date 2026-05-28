# Hub UI/UX Consistency Recon — 2026-05-28

Multi-specialist UX audit of `minion_hub/` (SvelteKit 2 + Svelte 5 + Tailwind 4, dark, 55+ routes). Two parallel Explore agents mapped the design system and interaction patterns; five UX specialists analyzed in parallel; a PM aggregator synthesized.

## TL;DR

The hub has good *tokens* (`@theme` in `app.css` defines ~30 CSS vars, 8 theme presets) but no *primitives layer*. 170+ hand-rolled buttons, 170+ hand-rolled inputs, 72+ inline `Loader2` spinners, 8+ bespoke modals, 330 raw `rgb()/rgba()` calls in 80 files, 32 `role="button"` elements without `cursor-pointer`, mostly absent focus rings, 3 competing save models, and partial Toast adoption. The fix is a focused primitives pass + global CSS rules — not a rewrite.

## Consensus (4/5 or 5/5 specialists agreed)

1. **Primitives co-location** — extend `src/lib/components/ui/` in-place (shadcn pattern). No workspace package, no Storybook yet.
2. **Orthogonal token axes** — color / radius / density / motion as independent levers, not bundled into 8 monolithic presets.
3. **Spinner + Button primitives are top priority** — eliminates 72+ inline `Loader2` and the 3 bespoke spinner-in-button impls (ConfigSaveBar, BuilderToolbar, ProvisionConfigForm).
4. **Single global `:focus-visible` rule + global `cursor: pointer` selector** — fixes all 42 visible drift instances in one commit.
5. **Hybrid save model by data volatility** — auto-save when content is user-owned & reversible; explicit when changes have side-effects (deploy, secrets, fan-out).
6. **`mutate(fn, {successToast, errorToast})` helper** — makes acked feedback the default path; silent mutations become the exception.
7. **Elevation tokens (`--elevation-0..3` as compound bg+border+shadow)** — replaces the confusingly-overlapping `--color-bg/bg2/bg3/card` and fixes the ConfigSaveBar-vs-Topbar layering conflict.
8. **Settings IA = Linear-style left rail with groups (Gateway / Hub / Personal)** — absorbs orphan `/account`, removes the dual tab-bar+route confusion.

## Concrete Drift Examples (from Phase 2 recon)

| File | Issue |
|---|---|
| `src/lib/components/reliability/ConnectionEventsPanel.svelte:61-88` | Hardcoded hex `CATEGORY_COLORS`/`SEVERITY_COLORS` dicts (12 entries) duplicate theme values |
| `config/+page.svelte:107` | Inline `bg-accent border-none rounded-[5px]` — non-token radius |
| `marketplace/agents/+page.svelte:323-324` | `.btn-primary/.btn-secondary` uses brand-pink as primary |
| `BuilderToolbar.svelte:125-167` | Scoped `.toolbar-btn` with its own variant system |
| `users/+page.svelte:23-26` | `border-b-2` tab pattern unique to this route |
| `flow-editor/.../DeleteChapterModal.svelte:10` | Modal backdrop onclick without `cursor-pointer` |
| `flow-editor/.../ConditionModal.svelte:12` | Same |
| `agents/builder/[id]/+page.svelte:305` | Picker backdrop without `cursor-pointer` |
| `settings/SecretEditModal.svelte:57-68` | Same backdrop pattern, bespoke |
| `CommandPalette.svelte:175` | Orphan `role="option"` children — parent missing `role="listbox"` (WCAG violation) |
| `ShellRow.svelte` | Raw `rgb(34,197,94)` — matches `--color-success` but not referenced |
| `BugReporter.svelte` | Inline `rgba` for flash effect |
| `BuilderToolbar.svelte:37` save-indicator | No `aria-live` — save state invisible to screen readers |

## Unified Design

### Token layer

```
--color-*       (theme presets only switch this axis)
--radius-xs 2px / sm 5px / md 8px / lg 12px / xl 16px   (close the rounded-[5px] gap)
--elevation-0/1/2/3   (compound bg + border + shadow; replaces bg/bg2/bg3/card semantics)
--density: comfortable | compact   (auto-compact on /builder + /flow-editor)
--duration-fast/normal/slow  100/200/350ms
--ease-standard/decelerate/accelerate
prefers-reduced-motion globally honored
```

Typography: functional `.text-display / .text-title / .text-heading / .text-body / .text-caption` utility classes — not `h1-h6` (decouples visual weight from DOM hierarchy for dashboard density).

**Primary action color = accent blue only.** Pink reserved for brand moments (landing CTAs, "Featured" badges). The current 3-way primary (accent / brand-pink / success-green) is decision fatigue, not branding.

### Primitives to add in `src/lib/components/ui/`

| Primitive | Replaces |
|---|---|
| `Spinner.svelte` (size sm/md/lg) | 72+ inline `<Loader2 class="animate-spin" />` |
| `Button.svelte` (variant, loading, size) | 170 hand-rolled `<button>` blocks |
| `Input.svelte` + `Field.svelte` (label + helper + error) | 170 hand-rolled inputs |
| `Modal.svelte` (backdrop + escape + focus trap) | 8+ bespoke modals |
| `Card.svelte` (elevation-aware) | Inline `bg-card border border-border rounded-lg` pattern |
| `Badge.svelte` (variant status/semantic/neutral, dot, size) | `CATEGORY_COLORS`/`SEVERITY_COLORS` hex dicts |
| `ProgressBar.svelte` | Missing entirely |
| `Breadcrumb.svelte` | Missing in all detail routes |
| `ui/index.ts` barrel + `ui/README.md` table | Discovery |

### Interaction contract

```css
/* in app.css — fixes 42+ drift instances */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
[role="button"], [role="tab"], [role="option"], [role="menuitem"],
button:not(:disabled), label[for], summary {
  cursor: pointer;
}
[disabled], [aria-disabled="true"] { cursor: not-allowed; }
```

```ts
// src/lib/utils/mutate.ts — every mutation acks by default
await mutate(() => api.publishAgent(id), {
  loadingToast: 'Publishing…',
  successToast: 'Agent published',
  errorToast: (e) => `Publish failed: ${msg(e)}`,
});
```

### Save model rule

| Surface | Policy |
|---|---|
| Agent builder fields | Auto-save 2s debounce (current — keep) |
| Flow-editor node content | Auto-save |
| Gateway config | Explicit save + NavigationGuardModal (current — keep) |
| Secrets, OAuth tokens | Explicit per-modal |
| Publish / Deploy | Explicit + pessimistic |
| Rename / toggle / reorder | Optimistic with revert-on-error |
| Delete / destructive | Pessimistic + confirm modal |

Auto-save failures surface inline (red-dot variant of dirty indicator); explicit-save failures use error toast.

### Theme architecture fix

`ThemeStyle.radius` in `presets.ts` currently writes a single raw px string and bypasses `--radius-*` tokens. Fix `applyTheme()` in `src/lib/state/ui/theme.svelte.ts` to either (a) write `style.radius` to all `--radius-*` vars proportionally, or (b) make all `--radius-*` derive from `--radius-base` multiplier (Linear pattern). Otherwise CRT/VOXELIZED themes get inconsistent corners.

### IA restructure

- `/settings`: persistent left-rail with groups — **Gateway** (AI, Agents, Comms, Security, System), **Hub** (Appearance, Backups, Gateways, Plugins, Provision, Roles, Team), **Personal** (Account — absorbed from avatar menu). Each item a route, not a tab.
- Detail-page toolbar = breadcrumb with text label + prev/next chevrons for sibling navigation (agent builder, flow-editor/[id], workforce/projects/[id]).
- Marketplace: drop the disabled "coming soon" entries from the sidebar; unified search across all listings with `@category:` filter (VS Code pattern).
- Reliability/Sessions: sticky filter bar, free-text search, server-side pagination (replace `limit: 10_000` flat fetch).
- Command Palette: `Cmd K` `<kbd>` badge in topbar (discovery); page-context actions registered per route (`registerPageCommands` API); `?` overlay for full shortcut list.

## Implementation Phases

### Phase 1 — Anchor & visibility (< 1 day, biggest visible win)

1. Global `:focus-visible` + `cursor: pointer` rules in `app.css` (5 min — fixes all 42 drift instances)
2. Extract `Spinner.svelte` + replace inline `Loader2` (mechanical sweep)
3. Extract `Badge.svelte` + replace `CATEGORY_COLORS`/`SEVERITY_COLORS` in `ConnectionEventsPanel`
4. Add `--radius-xs: 2px`, shift `--radius-sm` to `5px` to close the `rounded-[5px]` escape-hatch
5. Add `src/lib/utils/mutate.ts` helper; wire 4 highest-frequency mutations (publish, config save, marketplace install, channel link)
6. BuilderToolbar: relative-time "Saved 12s ago" + `role="status" aria-live="polite"` (a11y win)
7. CommandPalette: add `role="listbox"` to options container (WCAG fix), convert option `div`s → `button`s

### Phase 2 — Structural primitives (1–2 sprints)

1. `Button.svelte` with `loading`+variant API; sweep replace 170 hand-rolled buttons (PR-by-PR per route)
2. `Modal.svelte` + `Card.svelte` + `Input/Field` primitives
3. Elevation token compound (`--elevation-0..3`); migrate `bg/bg2/bg3/card` references (preserve aliases)
4. Decouple theme axes (color / radius / density / motion); rewire `applyTheme()`
5. Settings IA restructure: persistent rail, group routing, absorb `/account`
6. `oxlint no-restricted-syntax` rule banning raw `rgba?(` in `.svelte` outside `app.css`/`presets.ts`

### Phase 3 — Polish & advanced (later)

1. Breadcrumbs in all detail routes via shared `Breadcrumb.svelte`
2. Prev/next sibling navigation in agent builder + flow editor
3. Command Palette: `?` shortcut overlay + persistent kbd badge + page-context commands
4. Optimistic UI for rename/toggle/reorder (table-level)
5. Recently-visited cross-route surface (CommandPalette "Recent" group, localStorage-backed)
6. Skeleton loaders for sessions list, agents sidebar, marketplace listings
7. Marketplace unified search + `@category:` filter
8. Reliability sticky filter + server-side pagination

## Rejected

- **Storybook** — Cost > value for an internal dark dashboard; README table + co-location is sufficient.
- **`@minion-stack/ui` workspace package now** — Premature; defer until `minion_site` duplicates a primitive.
- **Monolithic theme presets** — Bundling color+radius+letter-spacing creates combinatorial lock-in.
- **One save model for everything** — Auto-only loses safety on configs; explicit-only loses speed on builders.
- **Per-component focus ring + cursor-pointer** — Already proven to be forgotten; global CSS rules win.
- **Tour overlay onboarding** — Obstructs UI before users understand it; dismissible banner is gentler.

## Files Touched (Phase 1 estimate)

- `src/app.css` — focus, cursor, radius scale, elevation tokens
- `src/lib/components/ui/Spinner.svelte` (new)
- `src/lib/components/ui/Badge.svelte` (new)
- `src/lib/utils/mutate.ts` (new)
- `src/lib/components/reliability/ConnectionEventsPanel.svelte` — drop hex dicts
- `src/routes/(app)/agents/builder/[id]/_components/BuilderToolbar.svelte` — aria-live + timestamp
- `src/lib/components/layout/CommandPalette.svelte` — listbox role + button conversion
- Mechanical sweep: replace 72+ `<Loader2 class="animate-spin" />` with `<Spinner />`

## Audit Process

- Phase 2 (~2 min): 2 Explore agents → design-token recon + interaction-pattern recon
- Phase 3 (~2 min): 5 UX specialists in parallel — IA, Interaction, Visual, Patterns, Disclosure
- Phase 4 (~30s): PM aggregator → consensus + conflict resolution
- 90% specialist agreement; conflicts resolved via product-signal precedent
