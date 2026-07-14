<script lang="ts" module>
  export type SkeletonShape = 'text' | 'rect' | 'circle';
  export interface SkeletonProps {
    shape?: SkeletonShape;
    lines?: number;
    label?: string;
    class?: string;
  }
</script>

<script lang="ts">
  let { shape = 'rect', lines = 1, label, class: cls = '' }: SkeletonProps = $props();
  const normalizedLines = $derived(Math.max(1, Math.floor(lines)));
</script>

<span
  class={`block ${cls}`}
  role={label ? 'status' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  data-part="skeleton"
>
  {#each Array(normalizedLines) as _, index}
    <span
      class={`block bg-[var(--color-surface-3)] motion-safe:animate-pulse
        ${shape === 'circle' ? 'aspect-square rounded-[var(--radius-full)]' : ''}
        ${shape === 'text' ? 'h-[var(--line-height-compact)] rounded-[var(--radius-sm)]' : ''}
        ${shape === 'rect' ? 'min-h-[var(--control-height-md)] rounded-[var(--radius-md)]' : ''}
        ${index > 0 ? 'mt-[var(--space-2)]' : ''}
        ${shape === 'text' && index === normalizedLines - 1 && normalizedLines > 1 ? 'w-3/4' : ''}`}
      data-part="skeleton-line"
    ></span>
  {/each}
</span>
