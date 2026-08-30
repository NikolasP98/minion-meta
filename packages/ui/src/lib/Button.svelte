<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'touch' | 'icon';
  export type ButtonShape = 'default' | 'icon';

  export interface ButtonProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    shape?: ButtonShape;
    loading?: boolean;
    disabled?: boolean;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    icon?: Snippet;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    [key: string]: unknown;
  }

  const VARIANT: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--color-accent)] text-[var(--color-on-accent)] border border-transparent hover:brightness-105 active:brightness-95 shadow-[var(--shadow-elevation-1)]',
    secondary:
      'bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-3)] hover:border-[var(--color-border-strong)]',
    ghost:
      'bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-1)]',
    danger:
      'bg-[var(--color-danger-surface)] text-[var(--color-danger-fg)] border border-[var(--color-danger-border)] hover:brightness-105',
    outline:
      'bg-transparent text-[var(--color-accent)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-1)] hover:border-[var(--color-accent)]',
  };

  const SIZE: Record<Exclude<ButtonSize, 'icon'>, string> = {
    xs: 'h-[var(--control-height-xs)] px-2 text-[length:var(--font-size-label)] gap-1 rounded-[var(--radius-sm)]',
    sm: 'h-[var(--control-height-sm)] px-3 text-[length:var(--font-size-label)] gap-1.5 rounded-[var(--radius-md)]',
    md: 'h-[var(--control-height-md)] px-4 text-[length:var(--font-size-body)] gap-2 rounded-[var(--radius-md)]',
    lg: 'h-[var(--control-height-lg)] px-5 text-[length:var(--font-size-body)] gap-2 rounded-[var(--radius-lg)]',
    touch:
      'h-[var(--control-height-touch)] px-5 text-[length:var(--font-size-body)] gap-2 rounded-[var(--radius-lg)]',
  };
</script>

<script lang="ts">
  import Spinner from './Spinner.svelte';

  let {
    variant = 'secondary',
    size = 'md',
    shape = 'default',
    loading = false,
    disabled = false,
    href,
    type = 'button',
    class: cls = '',
    icon,
    children,
    onclick,
    ...rest
  }: ButtonProps = $props();

  const isDisabled = $derived(disabled || loading);
  const resolvedSize = $derived(size === 'icon' ? 'md' : size);
  const isIcon = $derived(shape === 'icon' || size === 'icon');
  const element = $derived(href ? 'a' : 'button');
  const enabledHref = $derived(href && !isDisabled ? href : undefined);
  const sizeClass = $derived(
    isIcon
      ? `${SIZE[resolvedSize]} aspect-square px-0 justify-center`
      : SIZE[resolvedSize],
  );

  const base =
    'relative inline-flex items-center justify-center font-[var(--font-weight-medium)] whitespace-nowrap select-none outline-none ' +
    'transition-[transform,background-color,border-color,color,filter,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ' +
    'focus-visible:shadow-[var(--shadow-focus)] active:scale-[0.97] active:duration-[var(--duration-instant)] ' +
    'disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 aria-disabled:opacity-45 aria-disabled:pointer-events-none';

  const classes = $derived(`${base} ${VARIANT[variant]} ${sizeClass} ${cls}`);

  function handleClick(event: MouseEvent) {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onclick?.(event);
  }
</script>

<svelte:element
  this={element}
  {...rest}
  href={enabledHref}
  type={href ? undefined : type}
  class={classes}
  disabled={href ? undefined : isDisabled}
  aria-disabled={href && isDisabled ? 'true' : undefined}
  role={href && isDisabled ? 'link' : undefined}
  aria-busy={loading ? 'true' : undefined}
  tabindex={href && isDisabled ? -1 : undefined}
  onclick={handleClick}
  data-part="button"
  data-variant={variant}
  data-size={resolvedSize}
  data-shape={isIcon ? 'icon' : 'default'}
>
  {#if loading}
    <span class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <Spinner size={resolvedSize === 'lg' || resolvedSize === 'touch' ? 'md' : 'sm'} />
    </span>
  {/if}
  <span class={`inline-flex items-center justify-center gap-[var(--space-control-gap)] ${loading ? 'opacity-0' : ''}`}>
    {#if icon}{@render icon()}{/if}
    {#if children && (!isIcon || !icon)}{@render children()}{/if}
  </span>
</svelte:element>
