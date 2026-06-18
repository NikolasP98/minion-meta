# @minion-stack/design-tokens

Canonical design tokens for the Minion platform — one source of truth for color,
radius, shadow, elevation, motion and type tokens shared by `minion_hub` and
`minion_site`. Tokens are plain CSS custom properties declared via Tailwind 4's
`@theme` directive, so they generate utilities (`bg-bg`, `text-foreground`,
`rounded-lg`, `shadow-md`, …) **and** are available at runtime as `var(--…)`.

## Install

Hub and site use Bun and are not part of the pnpm workspace, so consume via the
published package once released:

```jsonc
// package.json
"dependencies": { "@minion-stack/design-tokens": "^0.1.0" }
```

…or, for local development before publishing, a workspace file dependency:

```bash
bun add @minion-stack/design-tokens@file:../packages/design-tokens
```

## Usage

In the app's entry stylesheet (`src/app.css`), import Tailwind, then the tokens,
then optionally the shared utilities:

```css
@import 'tailwindcss';
@import '@minion-stack/design-tokens/tokens.css';
@import '@minion-stack/design-tokens/utilities.css'; /* .surface-*, .t-* type scale */
```

Tailwind 4 cannot split a single `@theme` across files at the language level, but
it **merges** multiple `@theme` blocks — so the shared tokens load first and the
app overrides only what differs.

## Per-app overrides (the brand-accent pattern)

The shared accent is blue (`--color-accent: #3b82f6`, hub default). The marketing
site re-declares the semantic accent to pink **after** the import:

```css
@import 'tailwindcss';
@import '@minion-stack/design-tokens/tokens.css';

/* site-only semantic overrides */
@theme {
  --color-accent: #e8547a; /* --color-brand-pink */
  --color-accent-foreground: #ffffff;
  --color-accent-light: #f472b6;
  --color-accent-glow: rgba(232, 84, 122, 0.15);
}
```

Components reference only semantic tokens (`bg-accent`, `text-foreground`), so the
same component renders blue in the hub and pink on the site with zero forking.

## Runtime theming

The hub recolors tokens at runtime (8 theme presets) by setting the same custom
properties on `:root` via `applyTheme()`. Inline `:root` declarations win over
`@theme` defaults by the normal cascade, so runtime theming composes cleanly on
top of these tokens.

## Files

| Export | Contents |
|---|---|
| `./tokens.css` | The `@theme` block: fonts, colors, radius, shadows, elevation, motion. |
| `./utilities.css` | `@layer components` — `.surface-1..4`, `.divide-hairline`, `.hover-lift`, `.t-display..t-mono` type scale. |
