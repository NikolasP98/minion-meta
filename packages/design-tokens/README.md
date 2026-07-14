# @minion-stack/design-tokens

Generated semantic foundations shared by Minion Hub and Minion Site. The package
keeps product expression themeable while making component roles, spacing,
typography, layers, and motion predictable.

## Source of truth

`contract.json` is the machine-readable authority. It contains:

- the complete semantic color vocabulary for all 16 current Hub theme modes;
- mode-aware success, warning, danger, and information triples;
- ten selectable accent/on-accent pairs that pass contrast as inseparable pairs;
- typography, spacing, radius, control, shadow, motion, layer, and layout scales;
- responsive page gutters and the compact/medium/wide boundaries;
- compatibility aliases used during the Hub and Site migration.

`tokens.css` is generated from the contract. Do not edit it manually.

```bash
pnpm --filter @minion-stack/design-tokens generate
pnpm --filter @minion-stack/design-tokens build
```

The build fails when generated CSS is stale, a theme is incomplete, an alias
points to an unknown token, or an essential text/action/status pair falls below
WCAG AA contrast.

## Install and import

```bash
bun add @minion-stack/design-tokens
```

```css
@import 'tailwindcss';
@import '@minion-stack/design-tokens/tokens.css';
@import '@minion-stack/design-tokens/utilities.css';
```

The default variable mode is `new-york`. A consumer can select another contract
mode without rewriting component CSS:

```ts
document.documentElement.dataset.minionTheme = 'github-light';
```

`data-theme-preset` is also supported for migration adapters. Decorative CRT and
Voxelized behavior remains consumer-owned and should target stable
`data-part`/`data-variant` hooks rather than broad element selectors.

## Which tokens to use

| Need | Use | Avoid |
|---|---|---|
| Page background | `--color-canvas` | literal gray/black values |
| Cards and panels | `--color-surface-1..3` | elevation guessed from opacity |
| Modals/menus | `--color-overlay` and `--shadow-overlay` | bespoke shadow stacks |
| Copy hierarchy | `--color-text-primary/secondary/tertiary` | opacity-suffixed text |
| Main action | `--color-accent` + `--color-on-accent` | brand or chart palettes |
| Status | the relevant `-fg/-surface/-border` triple | a single status hue |
| Layout gaps | spacing and semantic spacing tokens | arbitrary pixel gaps |
| Control height | `--control-height-*` | route-local button/input heights |
| Overlay order | `--layer-*` | numeric feature z-index values |
| UI transitions | duration/easing tokens | route-local timing curves |

Categorical `purple`, `pink`, `cyan`, `emerald`, and `neutral` colors are allowed
for charts and data categories. They do not replace action or status semantics.

## Typography roles

Use `.t-display`, `.t-heading`, `.t-title`, `.t-body`, `.t-label`, `.t-caption`,
and `.t-mono`. `.t-telemetry` is the only sanctioned 10px role and is limited to
non-essential, high-density telemetry—not prose, form help, or actions.

## Compatibility policy

Legacy `--color-bg`, `--color-card`, `--font-sans`, `--shadow-md`, elevation, and
motion names remain aliases during the additive migration. Undeclared names such
as `--accent`, `--color-bg1`, `--color-background`, `--color-primary`, and
`--color-error` are intentionally not promoted. Alias removal requires a later
breaking release after Hub and Site both report zero usage.

## Exports

| Export | Purpose |
|---|---|
| `./contract.json` | Canonical values and theme metadata for code/Figma tooling |
| `./contract.schema.json` | JSON Schema for contract-aware tools |
| `./tokens.css` | Generated Tailwind 4 `@theme` variables and theme-mode selectors |
| `./utilities.css` | Semantic surface, typography, divider, hover, and coarse-pointer utilities |
