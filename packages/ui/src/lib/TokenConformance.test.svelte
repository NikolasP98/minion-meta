<script lang="ts">
  import {
    Badge, Button, Card, Checkbox, FormField, IconButton, Input, Radio,
    Select, Skeleton, Spinner, Textarea, Toggle,
  } from './index.js';

  const variants = ['primary', 'secondary', 'ghost', 'danger', 'outline'] as const;
  const buttonSizes = ['xs', 'sm', 'md', 'lg', 'touch', 'icon'] as const;
  const badgeSizes = ['sm', 'md'] as const;
  const statuses = ['running', 'thinking', 'idle', 'aborted'] as const;
  const semantics = ['success', 'error', 'warning', 'info', 'accent', 'brand'] as const;
  const elevations = [1, 2, 3, 4] as const;
  const paddings = ['none', 'sm', 'md', 'lg'] as const;
  const controlSizes = ['sm', 'md', 'lg', 'touch'] as const;
  const textareaSizes = ['sm', 'md', 'lg'] as const;
  const toggleSizes = ['sm', 'md', 'touch'] as const;
  const shapes = ['text', 'rect', 'circle'] as const;
  const spinnerSizes = ['xs', 'sm', 'md', 'lg'] as const;
</script>

{#snippet icon()}<span aria-hidden="true">+</span>{/snippet}

{#each variants as variant}
  {#each buttonSizes as size}
    <Button {variant} {size} loading>Save</Button>
  {/each}
  <IconButton {variant} label="Add item" {icon} />
{/each}

{#each badgeSizes as size}
  <Badge {size} dot>Neutral</Badge>
  {#each statuses as value}
    <Badge variant="status" {value} {size} dot pulse />
  {/each}
  {#each semantics as value}
    <Badge variant="semantic" {value} {size} dot />
  {/each}
{/each}

{#each elevations as elevation}
  {#each paddings as padding}
    <Card {elevation} {padding} interactive>
      {#snippet header()}Header{/snippet}
      Content
      {#snippet footer()}Footer{/snippet}
    </Card>
  {/each}
{/each}

<FormField label="Name" required helper="Public name" error="Required">
  {#snippet children(control)}<input id={control.id} />{/snippet}
</FormField>

{#each [false, true] as invalid}
  {@const error = invalid ? 'Invalid value' : undefined}
  {#each controlSizes as size}
    <Input {size} {error} label="Email" required helper="Contact email" leading={icon} trailing={icon} />
    <Select {size} {error} label="Clinic" required helper="Choose a clinic" options={[{ value: 'main', label: 'Main' }]} />
  {/each}
  {#each textareaSizes as size}
    <Textarea {size} {error} label="Notes" required helper="Visit notes" />
  {/each}
  <Checkbox label="Alerts" {error} required helper="Email notifications" />
{/each}

<Radio value="main" label="Main clinic" required helper="Primary location" />
{#each toggleSizes as size}
  <Toggle label="Enable alerts" {size} pressed />
  <Toggle label="Disable alerts" {size} />
{/each}
{#each shapes as shape}
  <Skeleton {shape} lines={2} />
{/each}
{#each spinnerSizes as size}
  <Spinner {size} label="Loading" />
{/each}
