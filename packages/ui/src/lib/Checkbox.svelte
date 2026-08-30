<script lang="ts" module>
  export interface CheckboxProps {
    checked?: boolean;
    indeterminate?: boolean;
    label: string;
    helper?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    class?: string;
    onchange?: (event: Event) => void;
    [key: string]: unknown;
  }
</script>

<script lang="ts">
  const generatedId = $props.id();
  let {
    checked = $bindable(false),
    indeterminate = false,
    label,
    helper,
    error,
    disabled = false,
    required = false,
    id,
    class: cls = '',
    onchange,
    ...rest
  }: CheckboxProps = $props();

  const controlId = $derived(id ?? `checkbox-${generatedId}`);
  const describedBy = $derived(
    error ? `${controlId}-error` : helper ? `${controlId}-helper` : undefined,
  );
</script>

<div class={`flex items-start gap-[var(--space-control-gap)] ${cls}`} data-part="checkbox-field">
  <input
    {...rest}
    type="checkbox"
    id={controlId}
    {disabled}
    {required}
    bind:checked
    {indeterminate}
    {onchange}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={describedBy}
    class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)] outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50"
    data-part="checkbox"
  />
  <div class="min-w-0">
    <label for={controlId} class="block text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-primary)]">
      {label}{#if required}<span class="text-[var(--color-danger-fg)]" aria-hidden="true"> *</span>{/if}
    </label>
    {#if error}
      <span id={`${controlId}-error`} class="block text-[length:var(--font-size-caption)] text-[var(--color-danger-fg)]" role="alert">{error}</span>
    {:else if helper}
      <span id={`${controlId}-helper`} class="block text-[length:var(--font-size-caption)] text-[var(--color-text-tertiary)]">{helper}</span>
    {/if}
  </div>
</div>
