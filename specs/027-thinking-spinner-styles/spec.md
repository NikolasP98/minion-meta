# Feature Specification: Thinking spinner material in Appearance

**Repos & PR bases**: minion_hub → `master` (`feat/thinking-shader-styles`, hub #568) · minion-meta → `dev`
**Created**: 2026-10-17 | **Status**: Approved (owner) | **Tags**: ui, preferences | **Human gates**: hub master review-merge

**Input** (owner, screenshot of the shader demo https://claude.ai/artifact/HV5ryvd3dxZy3fbVGJo3ar): "make the ai spinner shaders configurable in the appearance menu. include all of these as options." Plus: more materials in the demo (felt, soft-touch plastic, fur, … and Dragon Ball-style translucent crystal orbs) for the owner to pick from later.

## AS-IS
`ThinkingShader` compiles one hard-coded fragment (Cel). No user choice.

## TO-BE
- Appearance card "Assistant thinking spinner": six live previews (Mercury, Cel, Neon rim, Chrome, Holo foil, Dither) in the current accent; selection = accent-tinted card.
- Per-user preference `thinkingStyle` `{ style }` (localStorage + server section, validated; unknown → 400), seeded/applied by preference-sync. Default `cel`.
- Every `ThinkingShader` follows the preference live (new canvas + program per style); previews pin a style.

## DELTA
| # | Change | Proof |
|---|---|---|
| D1 | `thinking-shader.ts` prelude + 6 bodies, `thinkingFragment`, `isThinkingStyle` | unit tests; glslangValidator on all 6 assembled sources |
| D2 | `thinking-style.svelte.ts` + preference-sync + `/api/me/preferences` allowlist/validation | `server.test.ts` (accept 6, reject unknown) |
| D3 | `ThinkingShader` style prop / preference, `{#key}` rebuild | svelte-check |
| D4 | `ThinkingStyleSettings` card on /settings/appearance, i18n en/es | lint:design/tokens, content-contract |

## Open ends
New demo materials (felt, soft-touch, fur, velvet, ceramic, gummy, clay, pearl, brushed, crystal orbs) are demo-only until the owner picks; adding one = a body in `BODIES` + id + 2 i18n keys.
