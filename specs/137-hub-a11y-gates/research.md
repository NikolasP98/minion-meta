# Research: spec 137 decisions

Each decision was tested against hub master `3677e35a` on 2026-11-20.

## R1 — Where the page counts live

**Decision**: A new committed file, `tests/ui-audit/a11y-ledger.json`, built from the same sweep run artifacts by `scripts/a11y.mjs`.
**Rationale**: The sweep's own ledger (`conformance-ledger.json`) was never committed, so its compare exits 0 ("no ledger yet"). Adding a seventh rule there would either gate nothing or force this slice to commit the six existing rules too, turning on a dormant gate (one of them, `health`, fails on any console error) for every hub PR. That is spec 014's decision, not this slice's.
**Alternative rejected**: seventh rule in the conformance ledger (above); a per-element baseline (selector churn would cause false failures).

## R2 — Running axe on a page

**Decision**: Read `axe-core/axe.min.js` from `node_modules` and evaluate it in the page over the DevTools protocol, then `axe.run(document, { runOnly: tags })`.
**Rationale**: No new package (`@axe-core/playwright` is not installed); evaluation over the protocol is not blocked by the app's content security policy, a `<script>` tag would be.
**Alternative rejected**: adding `@axe-core/playwright` (new dependency for 20 lines).

## R3 — Reading story results

**Decision**: Run the existing `storybook` Vitest project with the JSON reporter and read each test's `meta.reports` (type `a11y`), which `@storybook/addon-vitest` already attaches (`dist/vitest-plugin/test-utils.js:120`). Filter violations by the WCAG tag list in the script, not in Storybook.
**Rationale**: Zero change to the Storybook configuration, so the component workbench shows what it showed before; `a11y.test` stays `'todo'` because the gate is the ledger compare, not a blanket failure on about 805 existing violations.
**Alternative rejected**: `a11y.test: 'error'` (fails every story with existing debt; no ratchet).

## R4 — Making story counts repeatable

**Decision**: (a) the story browser context emulates reduced motion, which zeroes every transition (`src/app.css:459`); (b) when Vite logs "optimized dependencies changed" the run is void and the stories run once more on the warm cache; CI also caches `node_modules/.cache/storybook`; (c) a row that still flips is listed under `unstable` in the ledger with its reason and held at its highest count.
**Rationale**: Measured: cold run = 7 files fail to import, 10 interaction tests fail; warm run = 1,205 stories, 0 failures. Two stories still flip between full warm runs: `components-chat-attachmenttile--with-actions-and-children` (`button-name` 0 ↔ 1, image loading, also with motion reduced) and `components-navigation-sidebar--expanded-admin-business-org` (`color-contrast` 0 ↔ 2, cause not found).
**Alternative rejected**: retrying failed stories individually (hides real interaction-test failures); taking the minimum of two runs (retries a violation away, which the spec forbids).

## R5 — The pattern helper

**Decision**: Plain DOM code in `src/lib/a11y/assert-pattern.ts`, no test-framework import: synthetic `keydown`/`keyup` on the focused element, a frame of settling after each key, and an optional `press` driver for real key input.
**Rationale**: The same file runs in happy-dom mounted tests and in story `play` functions (real Chromium). Synthetic keys cannot trigger native defaults (Tab, native `<dialog>` Escape); the `press` option covers those.
**Stricter than APG on purpose**: Home and End are checked for listbox, menu and tabs although APG marks them optional (the spec's User Story 3 requires them); `skip` waives a rule visibly. Disabled items: APG allows them to stay focusable, so "next" accepts the next item or the next enabled one.
**Not checked**: Tab trapping in dialogs (needs real Tab), right-to-left, screen-reader output.

## R6 — Suppression count

**Decision**: One design-lint rule, `a11y-ignore`, counting each `a11y_*` token on a `svelte-ignore` line (84 today).
**Rationale**: The design lint already has the ceiling, the per-file compare against the PR base and the CI step.

## R7 — The two existing specs

**Decision**: The `specs` gate of the command runs both in Chromium: the canvas spec through the default Playwright config with a placeholder `E2E_BASE_URL` (it serves its own fixture), the workshop spec through `playwright.workshop.config.ts` after building its fixture and serving it on `127.0.0.1:18907`.
**Rationale**: Both pass today (7 and 6 tests). Firefox and WebKit would add two browser installs to the job; left as an open end.

## R8 — CI placement and time

**Decision**: A new job `a11y` runs `bun run a11y --ci` (suppressions, patterns, specs, stories). In `qa-stack`, the existing sweep step runs `bun run a11y --only pages --ci`, which runs the sweep once and judges both its exit code and the accessibility counts.
**Rationale**: The page gate needs the seeded stack that only `qa-stack` has; running the sweep twice would cost 7 minutes.

## R9 — Output size

**Decision**: stdout carries only rows whose status changed; the full matrix goes to `test-results/a11y/report.json`.
**Rationale**: The full matrix is hundreds of rows; an agent reading stdout needs the verdict and what changed.
