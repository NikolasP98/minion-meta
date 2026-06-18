// @minion-stack/ui — shared Svelte 5 primitives.
// Token-driven: consuming apps must import @minion-stack/design-tokens (or define
// the equivalent --color-*/--radius-*/--elevation-* tokens) and add this package
// to Tailwind's content scan (`@source`) so the utility classes are generated.

export { default as Button } from './Button.svelte';
export { default as Badge, resolveBadgeColor } from './Badge.svelte';
export { default as Card } from './Card.svelte';
export { default as Input } from './Input.svelte';

export type { ButtonVariant, ButtonSize } from './Button.svelte';
export type { BadgeVariant, BadgeSize, StatusValue, SemanticValue } from './Badge.svelte';
export type { CardElevation, CardPadding } from './Card.svelte';
export type { InputSize } from './Input.svelte';
