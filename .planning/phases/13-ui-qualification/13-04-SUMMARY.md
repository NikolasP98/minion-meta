---
phase: 13-ui-qualification
plan: "04"
type: execute
requirements: ["UI-06", "UI-03"]
requirements-completed: []
status: partial
---

# Phase 13 plan 04 — shared chart reduced-motion + nonvisual access slice

## Source candidate

`minion_hub` `origin/master` @ `1df0a9216ad3f7f85d989eb59cfccb779d9f7285` (includes PR #245 / 13-01
— native Dialog consumers + escaped sentiment tooltip). Snapshot worktree
`/home/nikolas/.cache/claude-tmp/hub-13-04`, branch `feat/ui-chart-accessibility`. No branch/stash
mutation, no production/live-checkout touch — everything below ran only in this worktree.

## What was built (Task 1 — files: `Chart.svelte`, `chart-accessibility.test.ts`,
`CrmSentimentTrend.svelte`)

`src/lib/components/charts/Chart.svelte` (the shared ECharts wrapper, 11 consumer files / 23 chart
instances repo-wide) now, for every caller regardless of whether it opts in further:

- **Reduced motion**: reads `window.matchMedia('(prefers-reduced-motion: reduce)')` at mount and
  subscribes to `change` (same pattern already used by `DraggableWindow.svelte`'s breakpoint
  watcher — reused, not invented). `applyDefaults()` forces `animation:false` into the ECharts
  option whenever that's set, **overriding** whatever the caller's own option asked for — this is
  an accessibility floor, not a per-chart preference. Cleaned up on unmount.
- **Accessible name/description**: the chart container carries `role="img"` and `aria-label`,
  sourced from a new optional `ariaLabel` prop, falling back to a generic translated
  `a11y0_chartRegion` ("Chart") when the caller doesn't supply one.
- **Real text/table alternative**: a new `accessibleTable` derivation reads the actual
  `options.xAxis` (only when `type:'category'` with an array `data`) and `options.series[].data`
  on every render and renders a native `<details><summary><table>` — real DOM, not a visually-only
  summary. Category values run through the *same* `xAxis.axisLabel.formatter` the visible axis
  draws with (`formatCategory()`), so the table can never show a different value than what's
  drawn. Series get a caller-supplied `name` as their column header, else a translated
  `a11y0_chartSeriesN` ("Series {index}") fallback. Charts whose option doesn't fit that shape
  (pie/sankey/scatter/graph) get the name/description only — no table is fabricated for them; this
  is recorded as a gap in `13-CANVAS-COVERAGE.md`, not silently claimed as solved.
- Existing `onItemClick`/`onLegendToggle` callback wiring, the theme-re-init `MutationObserver`
  path, and the caller's own `options` object are all unchanged — `applyDefaults()` still returns
  a new object (never mutates the caller's option in place), matching the existing `tooltip` merge
  pattern it already used.

**Deliberately not done**: ECharts' own built-in `aria` option (`option.aria.enabled`) was
evaluated against "reuse ECharts' built-in aria option if it fits the existing setup" in the
dispatch brief. It doesn't fit cleanly here — it decorates the *inner* canvas/SVG node with its
own generated `role`/`aria-label`, which would double up with the *outer* container's
`role="img"`/`aria-label` this slice adds, risking redundant or conflicting announcements. The
declarative name + real table added here is the single source of truth instead; this is a
deliberate choice, not an oversight.

`src/lib/components/crm/CrmSentimentTrend.svelte` is wired as the first full consumer:
`ariaLabel={m.crm_insights_sentiment_trend()}`, `tableCategoryLabel={m.misc_date()}`, and a
`name: m.crm_insights_sentiment_title()` added to its own line series (CrmSentimentTrend owns its
own option object, so adding a `name` to its own series is not "mutating caller-owned options" —
that phrase in the plan is about `Chart.svelte` not mutating what it's *handed*). All three reuse
**existing** i18n strings — zero new strings needed for this consumer.

New i18n keys (both `messages/en.json` and `messages/es.json`, compiled via
`bun run i18n:compile`): `a11y0_chartRegion`, `a11y0_chartTableCategory`, `a11y0_chartSeriesN`,
`a11y0_chartDataTable` — the four generic fallbacks `Chart.svelte` itself needs when a caller
doesn't supply a specific label.

## What was built (Task 2 — files: `canvas-accessibility.spec.ts`, `13-CANVAS-COVERAGE.md`)

`.planning/phases/13-ui-qualification/13-CANVAS-COVERAGE.md` (meta repo) inventories every
`Chart.svelte` consumer (which have an `ariaLabel` wired vs. not, and whether their option shape
fits the table contract) and the workshop canvas stack
(`WorkshopCanvas.svelte`/`game-loop.ts`/`habbo-renderer.ts`) — confirmed by direct source read:
`WorkshopCanvas.svelte` has a pre-existing `role="application"` + `aria-label`, but **zero**
`matchMedia`/`prefers-reduced-motion` handling anywhere in that stack, and `habbo-renderer.ts` has
**zero** ARIA/keyboard affordances at all. Per 13-04-PLAN.md's own readiness note, whole-canvas
closure is out of scope for this slice; the document records task-equivalents for a future
evidence-driven gap plan rather than attempting them here.

`minion_hub/tests/e2e/ui-audit/canvas-accessibility.spec.ts` (Playwright) — see "Evidence" below.
It also carries 3 canary assertions (`not.toMatch(/prefers-reduced-motion|matchMedia/)` etc.) on
the actual workshop source files, deliberately written to fail the day someone adds that handling,
so the coverage doc can't quietly go stale.

## Evidence

### Blocked gate — `bunx vitest run` (environment, not this change)

`bunx vitest run src/lib/components/charts/chart-accessibility.test.ts` and the route-contract
command `vitest run src/lib/routes/ src/server/ui-audit/` are **blocked** in this snapshot's
toolchain. Reproduction (all run inside the snapshot worktree):

```
$ node node_modules/vitest/vitest.mjs run src/lib/components/charts/chart-accessibility.test.ts
⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error: Error during dependency optimization:
Build failed with 1 error:
[RESOLVE_ERROR] Could not resolve 'node:module' in \0rolldown/runtime.js
  1 │ import { createRequire } from 'node:module';
    │                                 ──────┬──────
    │                                       ╰──────── Tsconfig not found
    at ... rolldown-build-...mjs:3276:34
    at Object.build (.../vite/dist/node/chunks/node.js:31212:11)
```

This is **not specific to my new test file** — it reproduces identically on:
- a completely empty smoke test with zero imports (`describe('smoke', ...)`);
- the untouched, already-shipped `src/lib/components/crm/sentiment-tooltip.test.ts` (13-01's own
  test, unmodified);

and identically regardless of invoking with `node`, `bun run`, `bunx vitest`, or the system
`/usr/bin/node` (ruling out the mise-shim/Bun-detection theory the existing `vitest.config.ts`
comment names). `vite optimize` and `vite build` (production) both succeed cleanly against the
exact same `vitest.config.ts` resolve settings — the failure is isolated to Vite 8.1.3's
Rolldown-based **dependency-optimizer** pass specifically (the one `vitest`'s SSR/happy-dom
transform pipeline depends on), not the rolldown bundler itself (`node -e "require('rolldown')"`
loads fine) and not the plugin config (tried `prebundleSvelteLibraries:false`,
`optimizeDeps.disabled`, `noDiscovery`, a private `cacheDir`, and `build.rolldownOptions.tsconfig:
false` in an untracked diagnostic-only config — all reproduced the same error). A concurrent,
unrelated in-flight plan in this meta-repo already hit the same bug class and hand-tuned a private
vitest config around it (`.planning/phases/14-sdk-transport/14-PLUGIN-MOUNT-RECEIPT.md` line
140: `disabled optimizer discovery/client/SSR optimizers and rolldownOptions.tsconfig:false`) —
this is evidence the bug is real, pre-existing, and already known elsewhere in this program, not
something introduced by this slice.

`chart-accessibility.test.ts` is still delivered as written (7 SSR-string cases via `svelte/server`
`render()`, mirroring 13-01's `overlay-contract.test.ts` pattern exactly, plus 3 client-mount cases
mocking `echarts`/`matchMedia` via `vi.mock`/`vi.stubGlobal`, mirroring `DataTable.test.ts`'s
existing mocking pattern) — it is correct, plan-mandated coverage that should run the moment this
environment bug is fixed. Per the plan's own boundary ("Missing executables, fixtures, environment
or skipped cases are pending/blocked evidence, not pass"), this gate is recorded as **blocked**,
not passing, and not silently skipped.

### Substitute evidence actually exercised — Playwright, real browser, real components

Since `vite build` (production) does **not** go through the broken optimizer path, this slice
follows 13-01's own fallback instruction exactly ("if authenticated pages... cannot be reached
non-interactively, make the spec target a fixture page under tests/fixtures/ like 13-01 did"):

- `tests/fixtures/chart-accessibility/` (new, committed, following `tests/fixtures/overlay-native/`
  precedent byte-for-byte in structure) — `build.mjs` runs a real, credential-free `vite build()`
  API call (`configFile:false`, same as the existing fixture) mounting the **real**
  `CrmSentimentTrend.svelte` + `Chart.svelte` with synthetic sentiment data and a stub
  `$lib/paraglide/messages` alias (no app auth, no org data, no dev server).
- `tests/e2e/ui-audit/canvas-accessibility.spec.ts` builds that fixture, serves it from a
  hand-rolled `node:http` static server (stdlib only — no new dependency), and drives it with
  Playwright/chromium:

```
$ E2E_BASE_URL=http://127.0.0.1:5296 node node_modules/@playwright/test/cli.js test tests/e2e/ui-audit/canvas-accessibility.spec.ts --reporter=list
✓ gives the chart an accessible name describing its content (1.5s)
✓ exposes the actual series values as a real, escaped table alternative (1.6s)
✓ the data-table disclosure opens with a plain Enter key — no pointer, no bespoke script (1.2s)
✓ animation:false paints once and stays byte-identical over time (2.4s)
✓ without reduced motion, the entrance animation actually redraws the canvas over time (2.4s)
✓ pixel game loop has no reduced-motion or nonvisual handling yet (tracked in 13-CANVAS-COVERAGE.md) (3ms)
✓ habbo-renderer has no aria or keyboard affordances yet (tracked in 13-CANVAS-COVERAGE.md) (2ms)
✓ WorkshopCanvas has a named application region but still no reduced-motion handling (tracked) (6ms)
8 passed (22.0s)
```

Ran 3 times across this session (before/after a prettier reformat, and after an unrelated
`messages.js` type fix) — 8/8 every time. The two "Reduced motion" cases are the real behavioral
proof the plan asked for ("Observe actual animation engine state ... not `document.getAnimations`
alone" — ECharts draws to `<canvas>`, which the Web Animations API cannot see at all): two real
`page.screenshot()` buffers of the chart region, ~1.2s apart, compared with `Buffer.equals()`.
Under `page.emulateMedia({reducedMotion:'reduce'})` they are byte-identical (nothing redrew after
the initial synchronous paint); under default motion they are byte-different (ECharts' ~1000ms
entrance animation is still visibly redrawing at that gap). This is genuine red/green-capable
evidence, not a structural-only check — the "without reduced motion" case would fail today if
`animation:false` were accidentally applied unconditionally.

### Passing gates (this environment)

```
$ bun run check                                                  → 0 ERRORS, 0 WARNINGS (10,775 files)
$ DESIGN_LINT_BASE_REF=origin/master bun run lint:design          → "no changed file increased governed debt"
$ bun run lint:tokens                                             → 0 violations
$ bunx prettier --plugin=prettier-plugin-svelte --check <changed> → "All matched files use Prettier code style!"
```

`bun run check` was rerun 3 times across this session (after the initial write, after the
prettier reformat, and after fixing an implicit-`any` in the new fixture's `messages.js`) — final
result 0/0/0 on all three tries after that last fix; the middle attempt caught the fixture's
implicit-`any` and was itself the reason it was fixed. `git diff --check` is clean (no whitespace
errors).

`prettier --check` on `Chart.svelte` failed **before any of my edits** (verified via `git stash`
against the untouched `origin/master` file — it was already non-conformant, tabs vs. prettier's
expected style). Since this slice already had to touch the whole file, `--write` was run once to
clear that pre-existing debt as a byproduct — this is why `Chart.svelte`'s diff (495 changed lines)
looks much larger than the actual functional change; the functional additions are the ~110 new
lines described above, the rest is a mechanical tabs→spaces/quote-style reformat with no semantic
change (confirmed by rerunning `bun run check` and the Playwright spec immediately after and
getting identical results).

## Files owned / touched

- `minion_hub/src/lib/components/charts/Chart.svelte` (modified)
- `minion_hub/src/lib/components/charts/chart-accessibility.test.ts` (new)
- `minion_hub/src/lib/components/crm/CrmSentimentTrend.svelte` (modified)
- `minion_hub/tests/e2e/ui-audit/canvas-accessibility.spec.ts` (new)
- `minion_hub/tests/fixtures/chart-accessibility/` (new — `Fixture.svelte`, `main.js`, `messages.js`,
  `fixture.css`, `build.mjs`; necessary companion to the spec above, same as `overlay-native/` was
  a necessary companion to 13-01, not separately called out in the dispatch's file list)
- `minion_hub/messages/en.json`, `minion_hub/messages/es.json` (4 new `a11y0_*` keys each)
- `.planning/phases/13-ui-qualification/13-CANVAS-COVERAGE.md` (new, this repo)
- `.planning/phases/13-ui-qualification/13-04-SUMMARY.md` (this file, this repo)

No route files changed (route-contract baseline re-pin not applicable). No `.env`/secrets/DB
touched. No branch/stash/worktree mutation outside the dedicated snapshot. Dev server was never
started (not needed — the fixture path covers what it would have); no server was left running
(the static fixture server is started/stopped per Playwright run inside `test.beforeAll`/`afterAll`,
and the one manual diagnostic `python -m http.server` used during investigation was killed).

## Deviations from the dispatch

1. **Unit-test gate blocked** — see "Blocked gate" above. Not a deviation in code; a deviation in
   which command could actually be run to prove it, fully disclosed rather than papered over.
2. **`tests/fixtures/chart-accessibility/` added**, not in the dispatch's explicit file list —
   necessary to get any real browser evidence at all, directly modeled on the one 13-01 already
   added for the identical reason (not called out in *its* dispatch either, going by the same
   precedent).
3. **`Chart.svelte` diff is larger than the functional change** — pre-existing prettier debt fixed
   as a byproduct of the required edit; disclosed above with the `git stash` proof it predates this
   slice.
4. **ECharts' built-in `aria` option was not enabled** — evaluated and deliberately skipped, with
   rationale, rather than blindly turned on to satisfy the letter of "reuse if it fits."

## Open items (ledger)

- `TODO(handoff)` was **not** added inline in `Chart.svelte`/`CrmSentimentTrend.svelte` — the 9
  other Chart consumers without an `ariaLabel`, the sankey/scatter shapes without a table strategy,
  and the whole workshop canvas stack are process-level gaps (missing callers, not a bug at a
  specific broken line), so they are recorded structurally in
  `13-CANVAS-COVERAGE.md` instead, with an explicit task-equivalent per row, per the plan's own
  instruction ("Generate bounded follow-up plans for failed consumers before declaring UI-06
  complete").
- **Proposal filed**: the blocked vitest environment bug affects more than this slice (it blocks
  *any* vitest run in this snapshot, including previously-shipped, unmodified tests) and already
  has a documented workaround attempt in an unrelated in-flight plan
  (`14-PLUGIN-MOUNT-RECEIPT.md`) — this is a platform-level tooling defect, not owned by this
  slice's file list. Root/orchestrator should track it explicitly (e.g. folding it into the
  existing `2026-09-08-platform-qc-remediation.md` proposal) rather than each slice separately
  rediscovering and separately working around it.

## What blocks UI-06 closure

Per 13-04-PLAN.md's own success criteria, this plan is an admission gate, not a closer:

1. The blocked unit-test gate needs the environment bug fixed and a real run, even though the
   Playwright substitute evidence above independently proves the same behavior in a real browser.
2. 9 of 10 other `Chart.svelte` consumers still have no caller-specific `ariaLabel`/table wiring —
   each needs its own bounded plan per `13-CANVAS-COVERAGE.md`'s per-row task-equivalent.
3. Whole-canvas closure (Workshop/Pixi/physics, pixel-office renderer) is explicitly out of scope
   here and needs its own evidence-driven gap plan(s), per the readiness note.
4. Independent verifier review of this plan (per the plan's own `<success_criteria>`) has not yet
   run.

## PR

**Not opened.** All 11 files are staged (`git add`) in the snapshot worktree on branch
`feat/ui-chart-accessibility` (based on `origin/master` @ `1df0a921`), commit message and trailers
prepared, author identity set to Nikolas Pinon / `nikolas.pinon98@gmail.com` for this commit only —
but `git commit` fails at the signing step:

```
$ git -c user.name="Nikolas Pinon" -c user.email="nikolas.pinon98@gmail.com" commit -F ...
error: 1Password: agent returned an error
fatal: failed to write commit object
```

`commit.gpgsign=true` and `gpg.program` route through the 1Password SSH/git-signing agent
(`~/.1password/agent.sock`). The 1Password app process is already running (confirmed via its own
launch log: "1Password is already running, closing") — the vault itself is locked and needs the
user to unlock it through the 1Password GUI (biometric/master password); that is a human-only
action this session cannot and should not perform, and per this repo's own gotcha ledger
(`git-commit-signing-1password` memory entry) the fix is never `--no-gpg-sign`. No commit, push,
or PR was made. `git log` on the worktree still shows `1df0a921` as HEAD; nothing was written
unsigned or force-committed.

**To finish delivery**: unlock 1Password, then in
`/home/nikolas/.cache/claude-tmp/hub-13-04` run
`git -c user.name="Nikolas Pinon" -c user.email="nikolas.pinon98@gmail.com" commit -F <message>`
(message text is reproduced in the "Commit message" section below — the 11 files are already
staged) and `git push -u origin feat/ui-chart-accessibility`, then
`gh pr create -R NikolasP98/minion_hub` with the PR body below. All gate evidence above was
captured before this step and does not depend on it.

### Commit message (prepared, unused pending unlock)

```
feat(charts): reduced-motion and nonvisual access for the shared Chart (UI-06 slice)

Shared Chart.svelte (ECharts wrapper) now, for every caller:
- honors prefers-reduced-motion at mount and on live change, forcing
  animation:false into the option regardless of what the caller passed
  (matches the existing DraggableWindow matchMedia pattern);
- carries role="img" + aria-label (caller-supplied, else a generic
  translated fallback);
- derives a real <details><summary><table> text/table alternative from the
  actual xAxis category + series values (reusing the same axisLabel
  formatter the visible axis draws with, so the table can't drift from the
  chart), for the category-axis + series-array option shape used by all
  current callers. Charts that don't fit that shape (pie/sankey/scatter)
  keep the name/description only — no table is fabricated for them.

CrmSentimentTrend is wired as the first full consumer: ariaLabel + a named
series ("Customer sentiment") + tableCategoryLabel ("Date"), all reusing
existing i18n strings. Existing onItemClick/onLegendToggle callbacks and
Chart's public option contract are unchanged.

Gates:
- bun run check: 0 errors, 0 warnings (10775 files)
- lint:design (DESIGN_LINT_BASE_REF=origin/master): no changed file
  increased governed debt
- lint:tokens: 0 violations
- prettier --check on all changed files: clean (Chart.svelte's pre-existing
  tabs-vs-prettier debt fixed as a byproduct of touching the file)
- tests/e2e/ui-audit/canvas-accessibility.spec.ts (Playwright, against a
  production-built credential-free fixture mounting the real
  CrmSentimentTrend + Chart with synthetic data): 8/8 passed, including a
  real screenshot-diff proof that reduced motion actually stops the ECharts
  entrance animation and that normal motion actually animates
- bunx vitest run src/lib/components/charts/chart-accessibility.test.ts and
  the route-contract vitest command are BLOCKED in this environment by a
  pre-existing Vite 8/Rolldown dependency-optimizer bug unrelated to this
  change (reproduces on a completely empty smoke test and on the untouched,
  already-shipped sentiment-tooltip.test.ts) — see 13-04-SUMMARY.md for full
  reproduction evidence and the Playwright-based substitute evidence used
  instead.

Excludes whole-canvas closure (Workshop/Pixi/physics, pixel-office
renderer) — out of scope per 13-04-PLAN.md's own readiness note. Inventoried
in .planning/phases/13-ui-qualification/13-CANVAS-COVERAGE.md, including 3
canary Playwright assertions that will fail the day someone adds
reduced-motion/ARIA handling there, so the inventory can't silently go
stale.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E5LZFDeJe6Poed3wxpNyRU
```

Full PR body (summary/UI-06 mapping/gates/exclusions) is saved at
`/tmp/claude-1000/-home-nikolas-Documents-CODE-MINION/7203e41b-af05-4ed5-84c2-07e65dcf2874/scratchpad/pr-body.txt`
for reuse — copy it before that scratchpad is cleared, or regenerate from the "Gates"/"Exclusions"
sections above.


## September 11 independent repair and current qualification

The earlier implementation/testing narrative above is historical. Current Chart source is `4e13f7949c5a25566b02b04d800a24a3ef26fef1604981510cec79f06ef8db19`; native regression source is `8dcd6886bfe208ae7fc2f55e7b3aa00ef14a2d7301bba19a16228f323cd3b506`. `/tmp/minion-chart-independent-dlkxwbtl/final.json` records the independent review. Root's final eleven-file manifest is `/home/nikolas/.cache/minion-qc/ui-integration-u8r6xtfh/chart-manifest-final.json`.

Current behavior handles supported vertical/horizontal category charts and formatted scalar/object values without inventing columns for unsupported shapes. Reduced-motion preference reversal restores native animation settings while preserving engine state. Updated callbacks observe current props; unmount cancels pending work. Wide data alternatives receive a named keyboard-scrollable region only when they overflow.

Native mounted/ECharts SSR-model tests:23 passing, with only canvas text measurement shimmed. Root native browser run:18 existing cases passed across three engines; the three new wide-table cases initially failed because the test expected the wrong accessible name. After correcting the assertion, all three wide-table cases passed. This represents21 passing cases across two runs, not a single wholly green21-case run. Logs: `chart-browser-v1.log` and `chart-wide-v2.log` under the root combined candidate parent. Actual keyboard ArrowRight scrolling was observed without page overflow at360px. Chromium149, Firefox151 and Linux WebKit26.5 were used; WebKit requires the recorded private runtime wrapper.

Full combined Hub Svelte check returned zero errors/warnings; scoped design/token checks pass. Final fixture/spec formatting was applied with the native Svelte Prettier plugin. Unqualified dataset/encode/mixed/non-Cartesian alternatives, consumer keyboard actions, custom effects and workshop/Pixi behavior retain source TODOs and matching proposal entries. UI-06 remains open.
