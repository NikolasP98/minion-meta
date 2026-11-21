# Spec 137 follow-up: the public wordmark chip meets AA in every theme

**Date**: 2026-11-21 | **Hub PR**: NikolasP98/minion_hub#704 | **Owner decision** (2026-11-21): "Fix the colour now, with a demo".

This is the one VISIBLE change made under spec 137. It exists because the page gate that
spec 137 shipped failed master on `/oauth/authorize` (`color-contrast`, `.wordmark-minion`).

## FigCraft demo

- File: [`wordmark-contrast.figcraft`](wordmark-contrast.figcraft) (page "Spec 137 · wordmark contrast", frames "137 / Marca Minion · as-is" and "· to-be").
- Exported frames: [as-is](demo/wordmark-as-is.png), [to-be](demo/wordmark-to-be.png).
- Interactive preview (toggle): https://claude.ai/artifact/FUxZ1KrpjAAu5vUcYUzrKy (private to the owner).
- **Approved by the owner on 2026-11-21**, verbatim: "I saw the figcraft file. I approve the proposed to-be." This approves the design, not the merge of hub #704.

## AS-IS (hub master `3d39cbb6`)

| Fact | Anchor |
|---|---|
| Public pages (login, join, link, OAuth authorize, onboarding, booking, doors, error; 13 callers) render the wordmark through ONE component. The "Minion" chip is `color: var(--color-canvas)` on `background: var(--color-brand-pink)`. | `src/lib/components/ui/foundations/PublicTaskShell.svelte:50,172-177` |
| Canvas on brand is below 4.5:1 in 9 of the 22 contract themes: Catppuccin Latte 2.34, Concourse Day 2.14, Nord Light 2.46, Rosé Pine Dawn 2.60, Ayu Light 3.38, Gruvbox Light 3.73, One Light 3.79, CRT 3.92, Solarized Light 4.21. The default theme (New York) passes at 5.67. | computed from `@minion-stack/design-tokens/contract.json` (`themes.*.colors.brand`, `.canvas`), WCAG relative luminance |
| The page gate flags the chip only in some runs (`/join` 0 ↔ 1, `/link/[code]` 1 ↔ 0, `/oauth/authorize` 0 → 1) although the default theme passes: the panel fades in (`task-arrive`, opacity 0 → 1) and axe measured it mid-fade. | `PublicTaskShell.svelte:135,325-334`; CI runs 44838082938, 44841863124, 44937900638 |
| No token names a text colour for the brand colour; `--color-on-accent` belongs to the (user-selectable) accent. | `tokens.css` (`--color-on-accent`, `--color-brand`) |

## TO-BE

The chip text is black or white, whichever reads on that theme's brand colour. The brand colour does not change in any theme. Every theme meets 4.5:1. The gate measures a page only after its entry animations finish.

| Theme group | Text today | Text after | Contrast today → after |
|---|---|---|---|
| New York (default) | `#09090B` | `#000000` | 5.67 → 5.98 |
| CRT, GitHub Light, Clinic, Clinic Light | the theme's canvas | `#FFFFFF` | 3.92 → 5.19, 5.05 → 5.05, 5.46 → 5.95, 4.82 → 5.38 |
| the other 17 themes | the theme's canvas | `#000000` | lowest after: Solarized Light 4.62, Void 4.63 |

Invariants: no per-theme selector in the component; no new token; engines without CSS relative colour keep today's colour.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | `.wordmark-minion` gains `color: oklch(from var(--color-brand-pink) clamp(0, (0.575 - l) * 1000, 1) 0 0)` after the existing `color: var(--color-canvas)` fallback: lightness under 0.575 takes white, the rest black. | `PublicTaskShell.contrast.test.ts`: reads the threshold from the component and asserts ≥ 4.5:1 for every theme in the contract (23 tests) |
| D2 | The page axe pass waits for finite animations to finish (2 s cap) before measuring. | page gate rows for `/join`, `/link/[code]`, `/oauth/authorize` stay at 0 across CI runs |

## Not verified / out of scope

- Safari: the rule was checked in Chromium and Firefox; WebKit could not be launched locally. Where relative colour is unsupported the chip keeps today's colour.
- The in-app sidebar wordmark (`Sidebar.svelte` `.brand-minion`) is brand-coloured TEXT on the sidebar surface. In the same 9 themes that pair is under 4.5:1, and no text-colour swap can fix it: it needs either a darker/lighter brand colour per theme or a different treatment. That is a brand decision and is not changed here.
