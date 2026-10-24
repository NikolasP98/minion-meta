# Implementation Plan: Sidebar loading indicator on the section icon or the header divider

**Spec**: `specs/038-sidebar-loading-indicator/spec.md` | **Repo**: minion_hub (`feat/sidebar-loading-indicator` → `master`, draft PR, normal review-merge) + minion-meta (`dev`, governance text) | Anchors @ hub `origin/master 7d06cdd4`

## Constitution check
- I Spec before code: this plan precedes every hub commit; D1–D3 are answered in the spec table before the PR leaves draft. ✔
- II Evidence: every AS-IS line carries a file:line at `7d06cdd4` or a token value from `contract.json`; the one unverified pointer (hub "spec 027" ↔ meta 020, PR #841) is marked as such. ✔
- III Slice: **one** hub PR from an isolated worktree (`~/.cache/claude-tmp/hub-038`, real `bun install --frozen-lockfile`); gates in the foreground with `timeout`, exit codes captured, never piped into `tail`. ✔
- IV Required build steps: UI ⇒ `lint:design && lint:tokens` (debt may only decrease); four new strings ⇒ Paraglide + `i18n:compile`; no new route/page/API ⇒ no route-contract or RBAC change (the `[section]` endpoint already exists and is `requireAuth`-gated per user). ✔
- V Security/data: none — a per-user cosmetic preference under the existing validated endpoint. ✔

Spec Kit phase-1 artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) are folded into `spec.md` §AS-IS and §FR-001 (one entity: the preference shape; one existing contract: `PUT /api/me/preferences/[section]`). Same compression as features 020–033; nothing is skipped silently.

## Technical context
- Hub: Bun, SvelteKit 2, Svelte 5 runes, Paraglide, vitest (happy-dom mounted tests with `@testing-library/svelte`; the `preference-owner.svelte.ts` fixture mocks `$app/state`).
- Shell pieces touched: `Sidebar.svelte` (header + divider), `ModuleSwitcher.svelte` (icon cell), `SidebarUtilities.svelte` (footer slot removal), `ui/ProgressBar.svelte` (one size).
- Preference pattern: **density** (`density.svelte.ts`, `DensitySettings.svelte`, `[section]/+server.ts` validator + tests). Not the thinking-style pattern (localStorage + sync registry = extra code with no benefit for an SSR-loaded shell preference).

## Approach (smallest complete change)
1. **One busy signal, one owner.** Move the two-line derivation from `SidebarUtilities.svelte:36-37` into `Sidebar.svelte`; delete the footer slot. Both placements read the same boolean (I1, I2).
2. **Option 1 = stack a Spinner in the icon cell.** `ModuleSwitcher` already stacks two icons in one grid cell for the collapsed hover swap (`:136-153`); add the house `Spinner` as a third stacked child and reuse the same opacity crossfade in both renderings. No new keyframes, no size change (Spinner `md` = 16 px = `iconSizes.md`).
3. **Option 2 = swap the hairline for the existing indeterminate bar.** `ProgressBar value={null}` is the house indeterminate sweep (`GlobalActivity` uses it the same way, `aria-hidden`). Add a 1 px `xs` size so the busy element has the divider's exact height (I3, D3). Reduced motion: one scoped rule widens the range to 100 % (static accent line).
4. **Preference = density clone.** New state module, server allowlist entry + validator, settings card, four strings. Tests are clones of the density tests with the names changed.

## Rendering contract
| State | `icon-ring` | `divider-bar` |
|---|---|---|
| idle | module icon (or `LayoutList` in full mode) | `<div class="h-px bg-[var(--hairline)] mx-2 mb-1">` (unchanged) |
| busy, expanded | `Spinner size="md"` in accent replaces the icon; label + chevron static; Dropdown still opens | `ProgressBar value={null} size="xs"` inside a 1 px box with the same margins |
| busy, collapsed | same in `.mini-icons`; `aside:hover` shows `PanelLeft` instead (existing swap wins) | same bar, 40 px wide |
| busy, reduced motion | still ring (`motion-safe:animate-spin` off) | still full-width accent line (scoped `width:100%`) |
| <48 rem | nothing (aside hidden); GlobalActivity sweep as today | same |

Transitions use `opacity var(--duration-normal) var(--ease-standard)` only. Colour: `var(--color-accent)` for both placements (owner: "accent color when loading"; the footer ring's tertiary grey would read as a disabled icon in the header).

## Files (hub, one worktree)
| File | Change |
|---|---|
| `src/lib/state/ui/loading-indicator.svelte.ts` | NEW — density clone: `LOADING_INDICATOR_PLACEMENTS`, `decodeLoadingIndicator`, `loadingIndicator.placement / set()` |
| `src/lib/state/ui/index.ts` | `export * from './loading-indicator.svelte';` |
| `src/routes/api/me/preferences/[section]/+server.ts` | `'loadingIndicator'` in `VALID_SECTIONS`; `isValidLoadingIndicator`; the `400` branch |
| `src/lib/components/layout/Sidebar.svelte` | imports; `busy` + `placement`; `ModuleSwitcher busy={…}`; divider swap at `:264`; scoped `.divider-bar` CSS |
| `src/lib/components/layout/ModuleSwitcher.svelte` | `busy` prop; stacked Spinner in both renderings; CSS |
| `src/lib/components/layout/SidebarUtilities.svelte` | delete slot (`:32-37`, `:60-62`, `:118-125`) + unused imports |
| `src/lib/components/ui/ProgressBar.svelte` | `ProgressBarSize` += `'xs'`; `.prg-xs { gap: 0 }`; `.prg-xs .prg-track { height: 1px }` |
| `src/lib/components/settings/LoadingIndicatorSettings.svelte` | NEW — DensitySettings clone |
| `src/routes/(app)/settings/appearance/+page.svelte` | import + one `<Card>` after Density |
| `messages/en.json`, `messages/es.json` | 4 keys each, appended |
| `.claude/skills/ui-design-governance/SKILL.md` (hub copy) | lines 55 and 71: busy indicator = sidebar header, placement per Appearance |
| tests | `src/lib/state/ui/loading-indicator.test.ts` (NEW), `src/lib/components/settings/LoadingIndicatorSettings.mounted.test.ts` (NEW), `src/routes/api/me/preferences/[section]/server.test.ts` (+1 describe) |

Meta (this PR + one follow-up line): `.claude/skills/ui-design-governance/SKILL.md` same two edits as the hub copy (memory rule: edit BOTH copies).

## Gates (foreground, exit codes captured)
```
unset SUPABASE_DB_URL
timeout 600 bun x vitest run src/lib/state/ui/loading-indicator.test.ts src/lib/state/ui/density.test.ts \
  src/lib/components/settings/LoadingIndicatorSettings.mounted.test.ts src/lib/components/settings/DensitySettings.mounted.test.ts \
  'src/routes/api/me/preferences/[section]/server.test.ts' src/lib/state/ui/nav-mode.test.ts \
  src/lib/components/layout/topbar-parity.test.ts; echo "vitest=$?"
timeout 300 bun run i18n:compile; echo "i18n=$?"
timeout 900 bun run check; echo "check=$?"
timeout 300 bun run lint:design; echo "design=$?"; timeout 300 bun run lint:tokens; echo "tokens=$?"
```
Never `bun run test` (full suite hits prod with a `.env` present). Browser proof on `bun run dev:local` (private chromium, never the shared `:9223`).

## Risks
- `aside:hover` precedence in the collapsed rail: the existing rules use `:global(aside:hover) .mini-icons > :global(.expand-icon|.mod-icon)`; the new `.busy-ring` rule must be written at the same specificity so hover hides the ring too. Proof: collapsed screenshot while hovering during a slow load.
- Zag `progress` machine mounts per busy flip (`{#if}`): identical to `GlobalActivity.svelte:33-35`, which has done this since spec 2026-09-21; no new cost class.
- `SegmentedControl` `value` is `$bindable` with a default of the first item — pass `value={loadingIndicator.placement}` exactly as DensitySettings does so the SSR value wins.
- Paraglide cache: if `i18n:compile` does not emit the new `m.settings_loadingIndicator*` functions, delete `project.inlang/cache` and rerun (known gotcha).
- Design lint: `Sidebar.svelte`/`SidebarUtilities.svelte` carry pre-existing governed debt (e.g. `duration-[150ms]` in `iconBtn`); the gate is "no increase on changed files" — do not add any literal; deleting the slot can only decrease.

## Verification after merge
1. Prod: owner toggles both placements in Appearance, navigates Marketing → CRM twice; screenshots match the rendering contract. Reduced-motion check in the OS setting.
2. `select section, count(*) from user_preferences where section='loadingIndicator' group by 1` shows rows only with `placement` ∈ the two values (SC-002).

## Bypassed
Nothing. Two-pass review = the draft PR's independent review + the hub's review-merge.
