<script lang="ts" module>
  export interface RadioProps {
    group?: string;
    value: string;
    label: string;
    helper?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    id?: string;
    class?: string;
    onchange?: (event: Event) => void;
    [key: string]: unknown;
  }
</script>

<script lang="ts">
  const generatedId = $props.id();
  let {
    group = $bindable(''),
    value,
    label,
    helper,
    disabled = false,
    required = false,
    name,
    id,
    class: cls = '',
    onchange,
    ...rest
  }: RadioProps = $props();

  const controlId = $derived(id ?? `radio-${generatedId}`);
</script>

<div class={`flex items-start gap-[var(--space-control-gap)] ${cls}`} data-part="radio-field">
  <input
    {...rest}
    type="radio"
    id={controlId}
    {name}
    {value}
    {disabled}
    {required}
    bind:group
    {onchange}
    aria-describedby={helper ? `${controlId}-helper` : undefined}
    class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)] outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50"
    data-part="radio"
  />
  <div class="min-w-0">
    <label for={controlId} class="block text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-primary)]">
      {label}{#if required}<span class="text-[var(--color-danger-fg)]" aria-hidden="true"> *</span>{/if}
    </label>
    {#if helper}
      <span id={`${controlId}-helper`} class="block text-[length:var(--font-size-caption)] text-[var(--color-text-tertiary)]">{helper}</span>
    {/if}
  </div>
</div>
