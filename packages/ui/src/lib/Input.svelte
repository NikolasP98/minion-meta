<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type InputSize = 'sm' | 'md' | 'lg' | 'touch';
  export interface InputProps {
    value?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel';
    label?: string;
    placeholder?: string;
    helper?: string;
    error?: string;
    size?: InputSize;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    class?: string;
    inputClass?: string;
    leading?: Snippet;
    trailing?: Snippet;
    oninput?: (event: Event) => void;
    [key: string]: unknown;
  }

  const SIZE: Record<InputSize, string> = {
    sm: 'h-[var(--control-height-sm)] px-2.5 text-[length:var(--font-size-label)]',
    md: 'h-[var(--control-height-md)] px-3 text-[length:var(--font-size-body)]',
    lg: 'h-[var(--control-height-lg)] px-3.5 text-[length:var(--font-size-body)]',
    touch: 'h-[var(--control-height-touch)] px-3.5 text-[length:var(--font-size-body)]',
  };
</script>

<script lang="ts">
  import FormField from './FormField.svelte';

  let {
    value = $bindable(''),
    type = 'text',
    label = '',
    placeholder,
    helper,
    error,
    size = 'md',
    disabled = false,
    required = false,
    id,
    class: cls = '',
    inputClass = '',
    leading,
    trailing,
    oninput,
    ...rest
  }: InputProps = $props();
</script>

<FormField {id} {label} {helper} {error} {required} {disabled} class={cls}>
  {#snippet children(field)}
    <div class="relative flex items-center" data-part="input-wrap">
      {#if leading}
        <span class="pointer-events-none absolute left-2.5 flex items-center text-[var(--color-text-tertiary)]" aria-hidden="true">
          {@render leading()}
        </span>
      {/if}
      <input
        {...rest}
        {type}
        {placeholder}
        {oninput}
        id={field.id}
        disabled={field.disabled}
        required={field.required}
        bind:value
        aria-invalid={field.invalid ? 'true' : undefined}
        aria-describedby={field.describedBy}
        class={`w-full rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none
          transition-[border-color,box-shadow] duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:shadow-[var(--shadow-focus)]
          ${SIZE[size]} ${leading ? 'pl-8' : ''} ${trailing ? 'pr-8' : ''}
          ${field.invalid ? 'border-[var(--color-danger-border)]' : 'border-[var(--color-border-default)] focus-visible:border-[var(--color-accent)]'} ${inputClass}`}
        data-part="input"
        data-size={size}
      />
      {#if trailing}
        <span class="pointer-events-none absolute right-2.5 flex items-center text-[var(--color-text-tertiary)]" aria-hidden="true">
          {@render trailing()}
        </span>
      {/if}
    </div>
  {/snippet}
</FormField>
