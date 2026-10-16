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


## Input targets and decoration

With the required shared utilities import, coarse-pointer Button/IconButton and
Toggle targets are at least 44px in both axes. Input/Select targets are at least 44px
high; Textarea retains its larger minimum. Checkbox/Radio associated labels are
at least 44px high without enlarging the glyph. Fine-pointer dimensions keep the
existing density scale. Toggle's `data-part="toggle"` is the interactive target;
`toggle-track` and `toggle-thumb` are visual children. Consumer theme decoration
must use these hooks and must not style every `button` or match class substrings.

## Maturity and compatible changes

The exported primitives are supported within the documented behavior and
qualification matrix. An export is not a claim of every browser or assistive
technology certification. Hub domain compositions remain Hub-owned; experimental
recipes must be marked experimental and identify their missing evidence before
promotion to supported status.

A public prop, snippet argument, event, or stable hook change inventories both
Hub and Site callers first. Additive optional capabilities preserve defaults.
Renames keep a compatibility adapter with a named replacement and migration
receipt until both consumers have migrated; removal requires a breaking release.
Deprecation records the replacement, consumer usage, tests and removal version.
No runtime warning or version label substitutes for the actual consumer inventory.

Each release qualifies generated CSS, packaged primitives, installed consumer
builds and deployed identities separately. Source-only or SSR checks cannot close
rendered contrast, pointer-target, focus or overflow acceptance criteria.
