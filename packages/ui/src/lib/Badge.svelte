<script lang="ts" module>
  export type BadgeVariant = 'status' | 'semantic' | 'neutral';
  export type StatusValue = 'running' | 'thinking' | 'idle' | 'aborted';
  export type SemanticValue = 'success' | 'error' | 'warning' | 'info' | 'accent' | 'brand';
  export type BadgeSize = 'sm' | 'md';

  export interface BadgeTokens {
    foreground: string;
    surface: string;
    border: string;
  }

  const STATUS_TOKENS: Record<StatusValue, BadgeTokens> = {
    running: {
      foreground: 'var(--color-success-fg)',
      surface: 'var(--color-success-surface)',
      border: 'var(--color-success-border)',
    },
    thinking: {
      foreground: 'var(--color-purple)',
      surface: 'color-mix(in srgb, var(--color-purple) 14%, var(--color-surface-1))',
      border: 'color-mix(in srgb, var(--color-purple) 35%, var(--color-border-default))',
    },
    idle: {
      foreground: 'var(--color-text-secondary)',
      surface: 'var(--color-surface-1)',
      border: 'var(--color-border-default)',
    },
    aborted: {
      foreground: 'var(--color-warning-fg)',
      surface: 'var(--color-warning-surface)',
      border: 'var(--color-warning-border)',
    },
  };

  const SEMANTIC_TOKENS: Record<SemanticValue, BadgeTokens> = {
    success: {
      foreground: 'var(--color-success-fg)',
      surface: 'var(--color-success-surface)',
      border: 'var(--color-success-border)',
    },
    error: {
      foreground: 'var(--color-danger-fg)',
      surface: 'var(--color-danger-surface)',
      border: 'var(--color-danger-border)',
    },
    warning: {
      foreground: 'var(--color-warning-fg)',
      surface: 'var(--color-warning-surface)',
      border: 'var(--color-warning-border)',
    },
    info: {
      foreground: 'var(--color-info-fg)',
      surface: 'var(--color-info-surface)',
      border: 'var(--color-info-border)',
    },
    accent: {
      foreground: 'var(--color-accent)',
      surface: 'var(--color-surface-1)',
      border: 'var(--color-accent)',
    },
    brand: {
      foreground: 'var(--color-brand)',
      surface: 'var(--color-surface-1)',
      border: 'var(--color-brand)',
    },
  };

  export function resolveBadgeTokens(
    variant: BadgeVariant,
    value: StatusValue | SemanticValue | undefined,
  ): BadgeTokens | null {
    if (variant === 'status' && value && value in STATUS_TOKENS) {
      return STATUS_TOKENS[value as StatusValue];
    }
    if (variant === 'semantic' && value && value in SEMANTIC_TOKENS) {
      return SEMANTIC_TOKENS[value as SemanticValue];
    }
    return null;
  }

  /** Compatibility helper retained from 0.1.x. */
  export function resolveBadgeColor(
    variant: BadgeVariant,
    value: StatusValue | SemanticValue | undefined,
  ): string | null {
    return resolveBadgeTokens(variant, value)?.foreground ?? null;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: BadgeVariant;
    value?: StatusValue | SemanticValue;
    size?: BadgeSize;
    dot?: boolean;
    pulse?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'neutral',
    value,
    size = 'md',
    dot = false,
    pulse = false,
    class: cls = '',
    children,
  }: Props = $props();

  const tokens = $derived(resolveBadgeTokens(variant, value));
  const sizeClass = $derived(
    size === 'sm'
      ? 'text-[length:var(--font-size-telemetry)] px-1.5 py-0.5 gap-1'
      : 'text-[length:var(--font-size-label)] px-2 py-1 gap-1.5',
  );
  const style = $derived(
    tokens
      ? `background-color: ${tokens.surface}; color: ${tokens.foreground}; border-color: ${tokens.border};`
      : '',
  );
</script>

<span
  class={`inline-flex items-center rounded-[var(--radius-sm)] border font-[var(--font-weight-medium)] leading-none whitespace-nowrap
    ${sizeClass} ${tokens ? '' : 'bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]'} ${cls}`}
  {style}
  data-part="badge"
  data-variant={variant}
  data-value={value}
>
  {#if dot}
    <span
      class={`inline-block rounded-[var(--radius-full)] ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${pulse ? 'motion-safe:animate-pulse' : ''}`}
      style={tokens ? `background-color: ${tokens.foreground};` : 'background-color: var(--color-text-tertiary);'}
      aria-hidden="true"
    ></span>
  {/if}
  {#if children}{@render children()}{:else if value}{value}{/if}
</span>
