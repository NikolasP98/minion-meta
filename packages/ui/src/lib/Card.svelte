<script lang="ts" module>
  export type CardElevation = 1 | 2 | 3 | 4;
  export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

  const PAD: Record<CardPadding, string> = {
    none: '',
    sm: 'p-[var(--space-card-compact)]',
    md: 'p-[var(--space-card)]',
    lg: 'p-[var(--space-6)]',
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Compound elevation surface (bg + hairline border + shadow). */
    elevation?: CardElevation;
    padding?: CardPadding;
    /**
     * Adds a hover-lift affordance. Card stays presentational — for a clickable
     * card, wrap the content in an <a>/<Button> or place an overlay link inside.
     */
    interactive?: boolean;
    class?: string;
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;
  }

  let {
    elevation = 2,
    padding = 'md',
    interactive = false,
    class: cls = '',
    header,
    children,
    footer,
  }: Props = $props();

  const surface = $derived(`surface-${elevation}`);
  const interactiveCls = $derived(
    interactive
      ? 'transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ' +
          'hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-elevation-3)] ' +
          'has-[a:hover,button:hover]:border-[var(--color-border-strong)]'
      : ''
  );
</script>

<div class={`${surface} rounded-[var(--radius-lg)] ${interactiveCls} ${cls}`} data-part="card" data-elevation={elevation}>
  {#if header}
    <div class={`${padding === 'none' ? '' : 'px-[var(--space-card)] py-[var(--space-card-compact)]'} border-b border-[var(--color-border-subtle)]`} data-part="card-header">
      {@render header()}
    </div>
  {/if}
  <div class={PAD[padding]} data-part="card-body">
    {#if children}{@render children()}{/if}
  </div>
  {#if footer}
    <div class={`${padding === 'none' ? '' : 'px-[var(--space-card)] py-[var(--space-card-compact)]'} border-t border-[var(--color-border-subtle)]`} data-part="card-footer">
      {@render footer()}
    </div>
  {/if}
</div>
