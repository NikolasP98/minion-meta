# Feature Specification: Assistant "Thinking…" indicator — cel-shaded 3D drops in the theme accent

**Feature Branch**: `docs/spec-020-assistant-thinking-shader` | **Repos & PR bases**: minion_hub → `master` (`feat/assistant-shader-spinner`) · minion-meta → `dev` (this spec)

**Created**: 2026-10-17 | **Status**: Draft | **Tags**: ui (render-only; no data, no routes, no new i18n) | **Human gates**: none (non-security; hub master still needs the owner's review-merge)

**Input**: Owner, 2026-10-17 (verbatim): "I need you to improve the ai chat spinner. Turn it into a mini lightweight glsl shader that morphs." → "build a small demo page of all options before pushing" → after four demo rounds (artifact `HV5ryvd3dxZy3fbVGJo3ar`): "lets go with the cell shading version. lmk when its live. It should be the same hue as the primary color selected config in the theme settings."

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub master `21c00d15`).
- While a turn is in flight and no text is visible, the floating assistant shows three 4 px `bg-accent animate-pulse` dots beside "Thinking…" (`FloatingAssistant.svelte`, the `{:else if sending || stream !== null}` row).
- The theme's selected accent is `theme.accent.value` (a `#rrggbb` from `designTokens.accentOptions`, `themes/presets.ts:72-76`), applied to `--color-accent` by `themes/runtime.ts:56`.

**TO-BE.**
- The dots become a 20 px WebGL canvas: three raymarched spheres blended with a smooth minimum, orbiting on a tilted path (they pass in front of and behind each other), cel-shaded in three hard bands with a dark rim outline and a round glint, tinted with the selected accent. It follows Settings → Accent live.
- `prefers-reduced-motion`: one still frame, no animation loop. No WebGL (or a link failure): the house `Spinner` (`sm`, accent) instead. The canvas is `aria-hidden`; "Thinking…" stays the accessible text.
- The canvas exists only while the row is shown; unmount cancels the frame loop and calls `WEBGL_lose_context` (Chromium caps live contexts per page, spec 018).
- Cost: one draw of a full-screen triangle on a 40×40 buffer (DPR ≤ 2), ≤ 48 march steps per pixel.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 shader + helper | `components/assistant/thinking-shader.ts` (GLSL source, `hexToRgb`) | `thinking-shader.test.ts`: parses hex, rejects non-hex, and EVERY `ACCENT_OPTIONS` value parses (so no accent falls back to grey) |
| S2 component | `components/assistant/ThinkingShader.svelte` (accent from `theme.accent.value`, reduced motion, Spinner fallback, context release) | svelte-check, design lint (no new `raw-loading` debt), token lint, Prettier; the exact exported GLSL compiled, linked and rendered in headless Chromium with three accents on light and dark rows |
| S3 wiring | `FloatingAssistant.svelte`: dots → `<ThinkingShader />` | same gates |

## Requirements
- FR-001 The indicator's hue is the theme's selected accent and updates when the accent changes.
- FR-002 Reduced motion shows a still frame; no WebGL shows the house Spinner.
- FR-003 The WebGL context is released on unmount.

## Out of scope / open ends
- Other "Thinking…" surfaces (`ChatBlocks` reasoning, `ChatPanel`) keep their current look. A separate, unpushed spec 019 "hub AI chat kit" plans a shimmer on the reasoning summary; it does not touch this row.
- The demo variants (Mercury, Neon rim, Chrome, Holo foil, Dither) are not shipped.
