---
id: 2026-10-14-hub-global-class-selector-lint
title: Lint rule — no bare `:global(.class)` selectors in hub components
status: draft
created: 2026-10-14
updated: 2026-10-14
repos: [minion_hub]
---

# Lint rule — no bare `:global(.class)` selectors in hub components

**Problem.** A component's `:global(.act)` is document-wide: once that component has been
mounted anywhere in the session, the rule outlives it and restyles any other component that
reuses the class name. Two shipped incidents on the POS shift banner alone: hub #523 (My Agent
`EventModal` / `EmailModal` / `MessageActions` sized the banner's button to 26×24 px after a
client-side navigation from Home) and the earlier mini-rail overlap.

**Proposal.** `scripts/design-lint.mjs` gains a `bare-global-class` ceiling: a `:global(.x)`
selector with no scoped ancestor (`.parent :global(.x)`) counts as debt; existing occurrences
are reason-coded, new ones fail the ratchet. Legitimate cases (portal content, third-party
markup) keep a `/* reason: … */` tag.

**Evidence.** `grep -rn ":global(\.[a-z-]*)\s*{" src --include=*.svelte` on hub `master`.
