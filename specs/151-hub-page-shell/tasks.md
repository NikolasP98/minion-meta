# Tasks: page shell (a11y S2)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

- [x] T001 Branch `feat/151-page-shell` off fresh `origin/master`
- [x] T002 [US1] `(app)/+layout.svelte`: skip link first, `<main id="main-content" tabindex="-1">`, `MAIN_LANDMARK` context, scoped styles (tokens only)
- [x] T003 [US3] `PageShell.svelte`: `div` inside the shell's main; six workforce pages `<main>` → `<div>`
- [x] T004 [US2] `+layout.svelte` (root): fallback title; `PageHeader.svelte`: `documentTitle`, title in `<svelte:head>`, not in a peek
- [x] T005 [US2] `documentTitle={false}` on every header in a file that sets its own title (67) and in `BookingsView.svelte`
- [x] T006 [US3] `aria-label` on the sidebar and mobile-menu `<nav>`
- [x] T007 `a11y_skip_to_content` in `messages/en.json` and `messages/es.json`
- [x] T008 Tests: `page-title.mounted.test.ts` (header title, own hub name, own title kept, opt-out guard, standalone vs in-shell landmark, layout starts with the skip link and has one main, navs named)
- [ ] T009 Foreground gates: `bun run check`, unit suite, `lint:design && lint:tokens`, `bun run a11y`, `bun run build`
- [ ] T010 Hub PR; ratchet the page baseline from the PR's CI artifact (`document-title` 63 → 0); every check green; never merge
- [ ] T011 Open ends in the program ledger
