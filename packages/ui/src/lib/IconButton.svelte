<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import type { ButtonSize, ButtonVariant } from './Button.svelte';

  export interface IconButtonProps {
    label: string;
    icon: Snippet;
    variant?: ButtonVariant;
    size?: Exclude<ButtonSize, 'icon'>;
    loading?: boolean;
    disabled?: boolean;
    href?: string;
    class?: string;
    onclick?: (event: MouseEvent) => void;
    [key: string]: unknown;
  }
</script>

<script lang="ts">
  import Button from './Button.svelte';

  let {
    label,
    icon,
    variant = 'ghost',
    size = 'md',
    loading = false,
    disabled = false,
    href,
    class: cls = '',
    onclick,
    ...rest
  }: IconButtonProps = $props();
</script>

<Button
  {...rest}
  {variant}
  {size}
  shape="icon"
  {loading}
  {disabled}
  {href}
  class={cls}
  {icon}
  aria-label={label}
  {onclick}
/>
