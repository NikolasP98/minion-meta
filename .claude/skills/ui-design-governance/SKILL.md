---
name: ui-design-governance
description: Use when creating, editing, reviewing, or styling any UI in minion_hub or minion_site — .svelte files with markup or styles, components, routes, themes, CSS, icons, charts — or when adding colors, spacing, radii, shadows, z-index, animation, typography, a new component, a token, a utility class, or a design-lint exception.
---

# UI Design Governance — Minion Hub + Site

One design system, machine-enforced. Semantic tokens and shared primitives only; raw values and hand-rolled copies are regressions that fail gates.

**Violating the letter of these rules is violating the spirit of these rules.**

## Authority chain (highest first)

1. `packages/design-tokens/contract.json` (meta-repo) — machine truth. 16 themes × 43 resolved tokens, 10 accent pairs, 34 compat aliases. `tokens.css` is **generated** (`pnpm --filter @minion-stack/design-tokens generate`); `utilities.css` is hand-authored in the same package. Build fails on stale CSS, incomplete theme, unknown alias, or <AA contrast.
2. `specs/2026-07-13-hub-ui-coherence-implementation-spec.md` §D2 (meta-repo) — sole normative naming policy. §D3 theme, §D4 typography, §D5 primitives, §D6 layout/archetypes, §D9 a11y.
3. `minion_hub/scripts/DESIGN-LINT.md` — enforcement mechanics.

## Iron rules

- **Semantic tokens only.** Never a literal hex/rgb, Tailwind palette utility (`bg-slate-500`), arbitrary size (`text-[16px]`, `p-[13px]`), raw shadow, raw duration/easing, or numeric z-index in `.svelte` files. Raw colors are legal only in `app.css` and `themes/*.ts`.
- **⛔ Forbidden names (hard-fail):** `--accent`, `--accent-bg`, `--accent-rgb`, `--color-background`, `--color-bg1`, `--color-error`, `--color-primary`, `--color-primary-foreground`. Migrate consumers to the semantic role; never re-declare these.
- **Never hand-edit `tokens.css`.** Extend `contract.json` and regenerate.
- **Theme = `data-theme` on `<html>` only.** No Tailwind `dark:` variants (dead code here — no class/media wiring), no `prefers-color-scheme`, no per-theme selectors in components. Components read semantic tokens; themes swap the values.
- **Accent is a pair.** `--color-accent` always with `--color-on-accent`. Categorical `--color-purple/pink/cyan/emerald/neutral` are for charts/data-viz ONLY, never action or status semantics.
- **Compat aliases** (`--color-bg`, `--color-foreground`, `--color-muted`, `--shadow-sm`, `--hairline`, …) are legal but write new code with the canonical names.

## Which token

| Need | Use | Never |
|---|---|---|
| Page background | `--color-canvas` | literal grays |
| Cards/panels | `--color-surface-1..3` or `.surface-1..4` compound class | opacity-guessed elevation |
| Modals/menus | `--color-overlay` + `--shadow-overlay` | bespoke shadows |
| Text hierarchy | `--color-text-primary/secondary/tertiary/disabled` | opacity-suffixed text |
| Primary action | `--color-accent` + `--color-on-accent` | brand/chart colors |
| Status | full triple `--color-{success,warning,danger,info}-{fg,surface,border}` | a single hue |
| Type | `.t-display/.t-heading/.t-title/.t-body/.t-label/.t-caption/.t-mono` (`.t-telemetry` = only sanctioned 10px, high-density telemetry only) | `text-[Npx]`, `font-size:` |
| Gaps/padding | `--space-0/0-5/1/2/3/4/6/8/12` + semantic `--space-control-gap/field-gap/card-compact/card/section/page-gutter/page-section` — the scale is non-contiguous: `--space-5/7/9/10/11/16` DO NOT EXIST | arbitrary `p-[…]` |
| Radius | `--radius-xs/sm/md/lg/xl/full` | `rounded-[…]` |
| Control height | `--control-height-xs/sm/md/lg/touch` (24/28/32/36/44) | route-local heights |
| Stacking | `--layer-base/sticky/navigation/dropdown/popover/modal/toast/command/debug` | numeric z-index |
| Motion | `--duration-instant/fast/normal/slow` + `--ease-standard/enter/exit/spring` | literal ms/beziers |
| Focus | global `:focus-visible` (app.css) + `--shadow-focus`; opt out via `.focus-ring-none` | per-component outlines |

## Which primitive (reuse before writing)

| Need | Use | Location |
|---|---|---|
| Button (any) | `Button` — never bare `<button>` outside `lib/components/ui/` (lint rule `bare-button`) | `@minion-stack/ui` |
| Badge, Card, Input | `Badge` / `Card` / `Input` | `@minion-stack/ui` |
| Select | themed Select — never native `<select>` (lint rule `native-select`) | `$lib/components/ui` |
| Empty/error/loading states | `EmptyState`, `Spinner`, `Skeleton` — do NOT hand-roll "no X yet" markup, `animate-spin` divs, or bespoke pulse keyframes | `$lib/components/ui` |
| Tooltip | `Tooltip` (Zag) — not native `title=""` on interactive elements | `$lib/components/ui` |
| Form fields | `FormField` / `FormFieldset` / `FieldGroup` — not hand-rolled label+input+error stacks | `$lib/components/ui/foundations` |
| Dropdown/Popover/Combobox/Dialog | existing Zag wrappers (`Dropdown`, `Popover`, `Combobox`, `Modal`) | `$lib/components/ui` |
| Status indicator | `StatusDot` from `$lib/components/ui` (the `decorations/` copy is deprecated) | `$lib/components/ui` |
| Tables | `DataTable` (custom cells via its single `cell` snippet) | `$lib/components/data-table` |
| Page scaffold | `PageHeader` + section shells per route archetype (spec §D6) | `$lib/components/layout` |

Known gaps with NO primitive yet (proposals in `specs/2026-07-15-ui-design-governance-hardening.md`): icon-size scale (use `size={16}` md / `{14}` sm / `{12}` xs until tokenized — do not invent new values), Chip/Tag, Avatar, `.clamp-2/3`, `.transition-fast`. Hand-roll minimally and note it; do not create a new local system.

## Layout contracts (root-caused 2026-07-15 — violating these caused 7 shipped bugs)

- **One scroll owner per screen** (spec §D6). The module content pane owns scroll (`overflow-y-auto` on the page body); the section nav NEVER scrolls with content. If scrolling drags the section nav away, scroll ownership has silently fallen through to `route-viewport` — the shell chain lost its height bound somewhere above.
- **The `(app)/+layout.svelte` fade-wrapper must stay `flex flex-col`.** Every `SectionShell`/`PageShell` below it relies on `flex: 1` for viewport-height lock; a plain block wrapper makes all of them size to content (symptoms: section nav ends mid-panel, `overflow-y-auto` panes never activate, page bottoms clip).
- **Page roots inside a `SectionShell` must fill the row**: use `PageShell` (has `flex: 1`), or put `flex-1 min-w-0` on a bare root div. `class="flex flex-col h-full min-h-0"` alone shrinks to intrinsic width in the shell's flex-row — and a narrow container trips `EditableGrid`'s container query into single-column stacking. If a dashboard collapses to one column, check the container width before blaming the grid.
- **`Button` slot trap**: `@minion-stack/ui` Button renders slotted children inside an inner fixed-height `inline-flex` row `<span>`. Consumer classes (`flex-col`, `truncate`, `!h-auto`) on the Button do NOT reach it. For card-shaped buttons, override via a scoped ancestor: `.wrapper :global(.myclass > span) { flex-direction: column; width: 100%; align-items: stretch; }` and `height: auto` on the button itself (see POS sell `.card`, appearance `.theme-card`).
- **Svelte scoping needs a real ancestor anchor for component children.** `.a :global(.b)` matches only if `.b` is a DESCENDANT of a scoped `.a` element. A rule targeting a component's forwarded class placed next to (not inside) the anchor silently never applies — wrap the component in a scoped element and anchor on that (see ShiftBanner `.mini-rail`).

## Gates — run after EVERY UI change

```bash
cd minion_hub   # or minion_site
bun run lint:design    # debt ratchet: changed-file governed debt may only DECREASE (CI-enforced)
bun run lint:tokens    # every var(--x) must exist in contract/theme/registry
```

- Need an exception (illustration, theme-preview, syntax, data-visualization, third-party-render-surface)? Add to `scripts/design-lint-exceptions.json` with exact file+rule+**numeric cap**+category+reason. Caps, never blankets.
- Dynamic/runtime custom properties: register in `COMPONENT_INPUTS` or `THIRD_PARTY_RUNTIME_INPUTS` in `scripts/token-integrity.mjs` with a reason (fallback required).
- `--update-baseline` is decrease-only and will refuse increases.

## Extending the system

New semantic need → add token to `contract.json` with every theme mode enumerated → regenerate → release → consume. The `aliases` map is frozen by a deep-equal test (`tests/contract.test.mjs`) — adding one requires editing the test deliberately; `domainAliases` is the extensible bucket for temporary domain names. Name by role, not appearance; freeze the value table; alias only for migration.

## Red flags — STOP, you are about to create debt

| Thought | Reality |
|---|---|
| "It's just one hex value" | 855 raw colors started as one. Use the semantic token. |
| "z-index: 9999 to be safe" | That's the nav-killer pattern. Use `--layer-*`. |
| "I'll style this button quickly" | `bare-button` count is 511 and ratcheted. Use `Button`. |
| "dark: variant like other Tailwind apps" | Dead code here — theming is `data-theme` presets. Tokens only. |
| "I'll add the exception file entry later" | Later = CI failure. Do it in the same change, capped. |
| "This component is special" | Special = an exception category + cap + reason, not a bypass. |
| "Skip the lint, the diff is tiny" | The ratchet compares files, not diffs. Run both gates. |
