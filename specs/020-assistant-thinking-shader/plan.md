# Plan — 020 assistant thinking shader

- One module holds the GLSL and the hex parser so the test and the component share the exact source.
- Component pattern follows `decorations/LoginShader.svelte` (raw WebGL, no library) but reads the accent from `theme.accent.value` instead of parsing computed CSS.
- No new dependency, no i18n, no route. Gates: `bun run check`, `lint:design` (base `origin/master`), `lint:tokens`, Prettier, the two vitest files.
