<script lang="ts" module>
  export type ToggleSize = 'sm' | 'md' | 'touch';
  export interface ToggleProps {
    pressed?: boolean;
    label: string;
    size?: ToggleSize;
    disabled?: boolean;
    class?: string;
    onchange?: (pressed: boolean) => void;
    [key: string]: unknown;
  }

  const SIZE: Record<ToggleSize, { track: string; thumb: string; translate: string }> = {
    sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5' },
    touch: { track: 'h-7 w-12', thumb: 'h-6 w-6', translate: 'translate-x-5' },
  };
</script>

<script lang="ts">
  let {
    pressed = $bindable(false),
    label,
    size = 'md',
    disabled = false,
    class: cls = '',
    onchange,
    ...rest
  }: ToggleProps = $props();

  function toggle() {
    if (disabled) return;
    pressed = !pressed;
    onchange?.(pressed);
  }
</script>

<button
  {...rest}
  type="button"
  role="switch"
  aria-checked={pressed}
  aria-label={label}
  {disabled}
  onclick={toggle}
  class={`inline-flex shrink-0 items-center rounded-[var(--radius-full)] border p-0.5 outline-none transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)]
    focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50
    ${pressed ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'bg-[var(--color-surface-3)] border-[var(--color-border-strong)]'} ${SIZE[size].track} ${cls}`}
  data-part="toggle"
  data-state={pressed ? 'on' : 'off'}
  data-size={size}
>
  <span
    class={`block rounded-[var(--radius-full)] shadow-[var(--shadow-elevation-1)] transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]
      ${pressed ? 'bg-[var(--color-on-accent)]' : 'bg-[var(--color-text-secondary)]'}
      ${SIZE[size].thumb} ${pressed ? SIZE[size].translate : 'translate-x-0'}`}
    aria-hidden="true"
    data-part="toggle-thumb"
  ></span>
</button>
