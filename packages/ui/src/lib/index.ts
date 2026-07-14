// @minion-stack/ui — shared Svelte 5 primitives.
// Token-driven: consuming apps must import @minion-stack/design-tokens (or define
// the equivalent --color-*/--radius-*/--elevation-* tokens) and add this package
// to Tailwind's content scan (`@source`) so the utility classes are generated.

export { default as Button } from './Button.svelte';
export { default as IconButton } from './IconButton.svelte';
export { default as Badge, resolveBadgeColor, resolveBadgeTokens } from './Badge.svelte';
export { default as Card } from './Card.svelte';
export { default as FormField } from './FormField.svelte';
export { default as Input } from './Input.svelte';
export { default as Textarea } from './Textarea.svelte';
export { default as Select } from './Select.svelte';
export { default as Checkbox } from './Checkbox.svelte';
export { default as Radio } from './Radio.svelte';
export { default as Toggle } from './Toggle.svelte';
export { default as Spinner } from './Spinner.svelte';
export { default as Skeleton } from './Skeleton.svelte';

export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonShape,
} from './Button.svelte';
export type { IconButtonProps } from './IconButton.svelte';
export type {
  BadgeTokens,
  BadgeVariant,
  BadgeSize,
  StatusValue,
  SemanticValue,
} from './Badge.svelte';
export type { CardElevation, CardPadding } from './Card.svelte';
export type { FormFieldProps, FormFieldControl } from './FormField.svelte';
export type { InputProps, InputSize } from './Input.svelte';
export type { TextareaProps, TextareaSize } from './Textarea.svelte';
export type { SelectProps, SelectOption, SelectSize } from './Select.svelte';
export type { CheckboxProps } from './Checkbox.svelte';
export type { RadioProps } from './Radio.svelte';
export type { ToggleProps, ToggleSize } from './Toggle.svelte';
export type { SpinnerProps, SpinnerSize } from './Spinner.svelte';
export type { SkeletonProps, SkeletonShape } from './Skeleton.svelte';
