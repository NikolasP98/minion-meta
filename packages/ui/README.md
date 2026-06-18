# @minion-stack/ui

Shared Svelte 5 UI primitives for the Minion platform — token-driven `Button`,
`Badge`, `Card`, and `Input`. Consumed by `minion_hub` and `minion_site`.

## Install

```bash
bun add @minion-stack/ui @minion-stack/design-tokens
```

`svelte` and `lucide-svelte` are peer dependencies (provided by the app).

## Setup (consuming SvelteKit app)

1. Import the design tokens in `src/app.css` and tell Tailwind to scan this
   package so its utility classes are generated:

   ```css
   @import 'tailwindcss';
   @import '@minion-stack/design-tokens/tokens.css';
   @import '@minion-stack/design-tokens/utilities.css';

   /* generate the utilities used inside @minion-stack/ui components */
   @source '../node_modules/@minion-stack/ui/dist';
   ```

2. The library ships uncompiled `.svelte` files, so Vite must compile them at
   SSR time — add to `vite.config.ts`:

   ```ts
   ssr: { noExternal: ['@minion-stack/ui'] }
   ```

## Usage

```svelte
<script>
  import { Button, Badge, Card, Input } from '@minion-stack/ui';
</script>

<Card elevation={2}>
  <Button variant="primary">Save</Button>
  <Badge variant="semantic" value="success" />
</Card>
```

## Build

```bash
pnpm --filter @minion-stack/ui build   # svelte-package → dist/
```
