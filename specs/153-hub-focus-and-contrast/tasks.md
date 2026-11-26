# Tasks: focus and contrast (a11y S4)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

## PR 1 — focus indicators (`feat/153-focus-contrast`)

- [x] T001 `src/lib/themes/contrast.ts`: `readableAccentFor`; test over 18 themes × 11 accents
- [x] T002 `src/lib/themes/runtime.ts`: `--color-focus-ring`, `--color-link`, solid `--shadow-focus`; runtime contract test
- [x] T003 `src/app.css`: `@theme` colours, global ring, forced-colours rule
- [x] T004 62 focus utilities and 36 component focus rules → ring colour; shadow-only rules keep the outline
- [x] T005 Bare `outline-none`: ring back on non-text controls, `focus-ring-none` on containers; lint rule `bare-outline-none` (baseline 15)
- [x] T006 Demo (FigCraft + preview)
- [ ] T007 Gates, real-browser proof on the final commit, signed commit, hub PR, every check green

## PR 2 — accent as text (`feat/153-accent-text`) — held for the owner

- [ ] T008 `text-accent`, `color: var(--color-accent)` and `a` → `--color-link`
- [ ] T009 Demo leading with the default theme and the Clinic themes; old vs new colour and ratio
- [ ] T010 Gates, proof, PR; reported as ready, not for merge
