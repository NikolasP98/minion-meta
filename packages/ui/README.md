# @minion-stack/ui

Portable Svelte 5 primitives for Minion products. Each primitive owns its token
usage, interactive states, accessible naming/association, density, and reduced
motion behavior. Hub domain composites stay in the Hub repository.

## Install

```bash
bun add @minion-stack/ui @minion-stack/design-tokens
```

Import the shared CSS and include the packaged components in Tailwind's scan:

```css
@import 'tailwindcss';
@import '@minion-stack/design-tokens/tokens.css';
@import '@minion-stack/design-tokens/utilities.css';
@source '../node_modules/@minion-stack/ui/dist';
```

For SvelteKit SSR, compile the package in the consuming Vite process:

```ts
export default defineConfig({
  ssr: { noExternal: ['@minion-stack/ui'] },
});
```

## Primitive inventory

| Primitive | Contract |
|---|---|
| `Button` | primary/secondary/ghost/outline/danger; xs–touch sizes; safe disabled links; width-preserving loading |
| `IconButton` | mandatory localized `label`; icon shape at any control height |
| `Badge` | semantic/status triples, optional dot and pulse |
| `Card` | four token-driven elevation levels and named padding |
| `FormField` | generated/explicit ID, label, required, helper, error, and control association |
| `Input`, `Textarea`, `Select` | shared field geometry and status behavior; bindable values |
| `Checkbox`, `Radio`, `Toggle` | mandatory labels, keyboard-native behavior, bindable state |
| `Spinner`, `Skeleton` | reduced-motion-safe loading feedback |

## Usage

```svelte
<script lang="ts">
  import { Button, Card, Input, Select, Toggle } from '@minion-stack/ui';

  let name = $state('');
  let model = $state('');
  let enabled = $state(true);
</script>

<Card elevation={2}>
  <Input bind:value={name} label="Agent name" required />
  <Select
    bind:value={model}
    label="Model"
    options={[{ value: 'default', label: 'Gateway default' }]}
  />
  <Toggle bind:pressed={enabled} label="Enable agent" />
  <Button variant="primary">Save draft</Button>
</Card>
```

### Disabled links

`Button` renders an anchor when `href` is provided. If it becomes disabled or
loading, it removes `href`, removes the tab stop, blocks the handler, and exposes
`aria-disabled`. Feature code should not wrap a disabled Button in another link.

### Accessible names

Use a visible label for fields. If a compatibility call site omits `Input`,
`Textarea`, or `Select`'s visible `label`, it must pass a localized `aria-label`
or `aria-labelledby`. `IconButton` and `Toggle` make their accessible labels
mandatory in TypeScript.

### Hub-owned composites

Dialogs, sheets, menus, popovers, tabs, async boundaries, app/page shells,
tables, and draggable windows depend on Hub behavior and do not belong in this
package.

## Validation

```bash
pnpm --filter @minion-stack/ui typecheck
pnpm --filter @minion-stack/ui test
pnpm --filter @minion-stack/ui build
```

The package uses Svelte 5 runes/snippets only. Stable `data-part`, `data-variant`,
`data-size`, and `data-state` hooks support consumer decoration without global
element overrides.
