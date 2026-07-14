<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type SelectSize = 'sm' | 'md' | 'lg' | 'touch';
  export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
  }
  export interface SelectProps {
    value?: string;
    label?: string;
    helper?: string;
    error?: string;
    placeholder?: string;
    options?: readonly SelectOption[];
    size?: SelectSize;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    class?: string;
    selectClass?: string;
    children?: Snippet;
    onchange?: (event: Event) => void;
    [key: string]: unknown;
  }

  const SIZE: Record<SelectSize, string> = {
    sm: 'h-[var(--control-height-sm)] px-2.5 text-[length:var(--font-size-label)]',
    md: 'h-[var(--control-height-md)] px-3 text-[length:var(--font-size-body)]',
    lg: 'h-[var(--control-height-lg)] px-3.5 text-[length:var(--font-size-body)]',
    touch: 'h-[var(--control-height-touch)] px-3.5 text-[length:var(--font-size-body)]',
  };
</script>

<script lang="ts">
  import FormField from './FormField.svelte';
  import type { FormFieldControl } from './FormField.svelte';

  let {
    value = $bindable(''),
    label = '',
    helper,
    error,
    placeholder,
    options = [],
    size = 'md',
    disabled = false,
    required = false,
    id,
    class: cls = '',
    selectClass = '',
    children,
    onchange,
    ...rest
  }: SelectProps = $props();
</script>

{#snippet fieldControl(field: FormFieldControl)}
    <select
      {...rest}
      id={field.id}
      disabled={field.disabled}
      required={field.required}
      bind:value
      {onchange}
      aria-invalid={field.invalid ? 'true' : undefined}
      aria-describedby={field.describedBy}
      class={`w-full appearance-none rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border text-[var(--color-text-primary)] outline-none
        transition-[border-color,box-shadow] duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:shadow-[var(--shadow-focus)]
        ${SIZE[size]} ${field.invalid ? 'border-[var(--color-danger-border)]' : 'border-[var(--color-border-default)] focus-visible:border-[var(--color-accent)]'} ${selectClass}`}
      data-part="select"
      data-size={size}
    >
      {#if placeholder}<option value="" disabled>{placeholder}</option>{/if}
      {#each options as option (option.value)}
        <option value={option.value} disabled={option.disabled}>{option.label}</option>
      {/each}
      {#if children}{@render children()}{/if}
    </select>
{/snippet}

<FormField {id} {label} {helper} {error} {required} {disabled} class={cls} children={fieldControl} />
