<script lang="ts" module>
  export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
  export interface SpinnerProps {
    size?: SpinnerSize;
    label?: string;
    class?: string;
  }

  const SIZE: Record<SpinnerSize, string> = {
    xs: 'h-3 w-3 border',
    sm: 'h-3.5 w-3.5 border-2',
    md: 'h-4 w-4 border-2',
    lg: 'h-6 w-6 border-2',
  };
</script>

<script lang="ts">
  let { size = 'md', label, class: cls = '' }: SpinnerProps = $props();
</script>

<span
  class={`inline-block shrink-0 rounded-full border-current border-r-transparent motion-safe:animate-spin ${SIZE[size]} ${cls}`}
  role={label ? 'status' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  data-part="spinner"
></span>
