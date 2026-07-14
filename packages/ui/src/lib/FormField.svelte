<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export interface FormFieldControl {
    id: string;
    describedBy?: string;
    invalid: boolean;
    required: boolean;
    disabled: boolean;
  }

  export interface FormFieldProps {
    id?: string;
    label: string;
    helper?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    class?: string;
    children: Snippet<[FormFieldControl]>;
  }
</script>

<script lang="ts">
  const generatedId = $props.id();
  let {
    id,
    label,
    helper,
    error,
    required = false,
    disabled = false,
    class: cls = '',
    children,
  }: FormFieldProps = $props();

  const controlId = $derived(id ?? `field-${generatedId}`);
  const describedBy = $derived(
    error ? `${controlId}-error` : helper ? `${controlId}-helper` : undefined,
  );
  const control = $derived<FormFieldControl>({
    id: controlId,
    describedBy,
    invalid: Boolean(error),
    required,
    disabled,
  });
</script>

<div class={`flex flex-col gap-[var(--space-field-gap)] ${cls}`} data-part="field">
  {#if label}
    <label
      for={controlId}
      class="text-[length:var(--font-size-label)] leading-[var(--line-height-compact)] font-[var(--font-weight-medium)] text-[var(--color-text-secondary)]"
      data-part="field-label"
    >
      {label}
      {#if required}
        <span class="text-[var(--color-danger-fg)]" aria-hidden="true">*</span>
        <span class="sr-only"> required</span>
      {/if}
    </label>
  {/if}

  {@render children(control)}

  {#if error}
    <span
      id={`${controlId}-error`}
      class="text-[length:var(--font-size-caption)] leading-[var(--line-height-compact)] text-[var(--color-danger-fg)]"
      role="alert"
      data-part="field-error"
    >{error}</span>
  {:else if helper}
    <span
      id={`${controlId}-helper`}
      class="text-[length:var(--font-size-caption)] leading-[var(--line-height-compact)] text-[var(--color-text-tertiary)]"
      data-part="field-helper"
    >{helper}</span>
  {/if}
</div>
