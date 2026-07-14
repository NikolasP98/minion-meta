<script lang="ts" module>
  export type TextareaSize = 'sm' | 'md' | 'lg';
  export interface TextareaProps {
    value?: string;
    label?: string;
    placeholder?: string;
    helper?: string;
    error?: string;
    size?: TextareaSize;
    rows?: number;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    resize?: 'none' | 'vertical' | 'both';
    class?: string;
    textareaClass?: string;
    oninput?: (event: Event) => void;
    [key: string]: unknown;
  }

  const SIZE: Record<TextareaSize, string> = {
    sm: 'min-h-16 px-2.5 py-2 text-[length:var(--font-size-label)]',
    md: 'min-h-24 px-3 py-2.5 text-[length:var(--font-size-body)]',
    lg: 'min-h-32 px-3.5 py-3 text-[length:var(--font-size-body)]',
  };
</script>

<script lang="ts">
  import FormField from './FormField.svelte';

  let {
    value = $bindable(''),
    label = '',
    placeholder,
    helper,
    error,
    size = 'md',
    rows,
    disabled = false,
    required = false,
    id,
    resize = 'vertical',
    class: cls = '',
    textareaClass = '',
    oninput,
    ...rest
  }: TextareaProps = $props();

  const resizeClass = $derived(
    resize === 'none' ? 'resize-none' : resize === 'both' ? 'resize' : 'resize-y',
  );
</script>

<FormField {id} {label} {helper} {error} {required} {disabled} class={cls}>
  {#snippet children(field)}
    <textarea
      {...rest}
      {placeholder}
      {rows}
      {oninput}
      id={field.id}
      disabled={field.disabled}
      required={field.required}
      bind:value
      aria-invalid={field.invalid ? 'true' : undefined}
      aria-describedby={field.describedBy}
      class={`w-full rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none
        transition-[border-color,box-shadow] duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:shadow-[var(--shadow-focus)]
        ${SIZE[size]} ${resizeClass} ${field.invalid ? 'border-[var(--color-danger-border)]' : 'border-[var(--color-border-default)] focus-visible:border-[var(--color-accent)]'} ${textareaClass}`}
      data-part="textarea"
      data-size={size}
    ></textarea>
  {/snippet}
</FormField>
