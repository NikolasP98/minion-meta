# T023 — Verification receipts (local qualification)

Coordinator: Claude Fable 5.1 session resuming the 2026-10-16 handover (`audits/2026-10-16-design-system-durability-handover/`). All receipts below were produced on 2026-10-16 (America/Lima) against the live clones under `~/.cache/codex-implementation/design-durability-2026-10-16/` after the corrected token archive was installed. Earlier worker receipts remain in the handover `evidence/` directory and are not restated as newer.

## Package integration (corrected archive)

| Consumer | Token archive | Receipt sha256 pin | bun install | Artifact/token tests |
|---|---|---|---|---|
| hub | `0.1.1-durability.h3bfd6bda…` (sha `9cb3b707…`) | `f53996517d83223776fb9fbb0cccf57fa9ed5459ca7ea33a8a85b426e6c98477` | `--ignore-scripts`, lock references new archive ×2, old ×0 | `ui-button-artifact.test.ts` + `scripts/token-integrity.test.ts` 23/23 |
| site | same | same | same | `ui-button-artifact.test.ts` 17/17; `scripts/token-integrity.test.mjs` 4/4 |
| site-release | same | same | same | 17/17; 4/4 |

`deps/design-token-provenance.json` is derived from the canonical receipt by a generator that reproduced the previous file byte-for-byte from the first receipt before being applied to the corrected one. The superseded `h137aa7d7…` archive (never committed) was removed from each `deps/`; installed `node_modules/@minion-stack/design-tokens/utilities.css` contains `min-width: var(--control-height-touch)`.

## Hub (branch `feat/design-system-durability`, base `7d917ed0`)

| Gate | Result |
|---|---|
| `bun run check` with CI public env (`PUBLIC_POSTHOG_HOST/KEY`) | first run after the 18 diagnostics were fixed: 0 errors / 0 warnings / 11,928 files; rerun after review fixes: 0 / 0 |
| `bun run lint:design` | per-file debt: no changed file increased governed debt (base origin/master, fork point) |
| `bun run lint:tokens` | 0 violations |
| Prettier (CI gate, `--plugin=prettier-plugin-svelte`) over every changed file | clean after formatting 6 files |
| `i18n:compile` | paraglide cache under `project.inlang/cache` had hidden `design_use_saved_layout`; cache cleared, key present in both compiled locales |
| Focused suites after fixes | records save-status + autosave, config-durability (4), Availability durability mounted (4, incl. new queued-token regression), secrets-recovery mounted, Picker.dom (9/9, dirty test now green), stock/event-type PATCH server tests, dialog-dirty-guard, error-summary, foundation-components, SellableWizard edit-autosave, scheduling.service, booking-custom-fields, ui-button-artifact: **11 files / 75 tests** + **4 files / 37 tests** + 6 files / 45 tests (earlier pass) — all green |
| Native PostgreSQL CAS suite | 5/5 (worker receipt `design-outcomes-final-tests.log`; DB `minion_design_durability_test` retained) |
| Fixture build (`tests/fixtures/design-durability/build.mjs`) | exit 0 against the corrected package, served at 127.0.0.1:5296 |

Diagnostics resolved (all in source, no `ts-nocheck`/`any`): shared `$state` narrowing in `save-status.svelte.ts`; `aria-description` (unsupported by installed Svelte typings) replaced by an `sr-only` sort-rank span inside the `th`; mock signatures in two tests; unsupported `exact` option removed in four `getByRole` calls; fixture JS typed with JSDoc guards (`isThemeId`, mount-target guards, `Object.assign(window, …)`); Picker dirty test queried the portaled window from `document`.

Review-driven fixes (see `review-outcomes.md`): version tokens read at dispatch in four autosave hosts (HIGH), `loadSequence` for `configState.loading` (MEDIUM), stock detail `busy` reset (LOW).

## Site (branch `feat/design-system-durability`, base `82887a9`)

| Gate | Result |
|---|---|
| `bun run check` (CI public Supabase env) | exit 0 |
| `bun run test` (node scripts + vitest) | 17/17 node; 11 files / 72 tests |
| `bun run lint:design`, `lint:tokens` | 0 violations; per-file base origin/dev |
| `scripts/design-lint.test.mjs` after merge-base fork-point change | 5/5 |

## Site-release (branch `release/design-system-durability`, base `0ed4e1b`)

| Gate | Result |
|---|---|
| `bun run check` | 0 errors / 0 warnings (worker receipt) |
| `bun run test` | node 12/12 + vitest 104/104 on first archive (worker); artifact 17/17 + token 4/4 rerun on corrected archive |
| `bun run build` with CI public Supabase env | exit 0 (previously failed only for missing public env) |
| `scripts/design-lint.test.mjs` | 5/5; `lint:design` base origin/master |
| Changed paths | 12, none under member/product source (`review-packaging-release.md`) |

## Meta (branch `feat/design-system-durability`, base `17bce12f`)

| Gate | Result |
|---|---|
| build-all, typecheck-all, lint-all | passed (worker receipts, `design-meta-build.log`, gate ledger) |
| test-all | one unchanged shells-bridge fixed-delay timing assertion failed in the aggregate run; isolated full shells-bridge suite 157/157; all other packages green (retained as two facts) |
| test:scripts | 163/163; packer suite 6/6 |
| repo-policy validate/test, spec-index --check (287), proposal-index --check (804), changeset:status | pass |
| Changeset | bumped to `minor` for both packages (new public exports `./audit`, `./inventory.json`; Toggle `data-part` contract) |

## Meta-release (branch `release/design-system-durability`, base `85539aee`)

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 (was the cause of the 16/17 packer failure) |
| packer + package-provenance tests | 17/17 |
| design-tokens tests / generate --check | 15/15; css + inventory current |
| `@minion-stack/ui` tests | 30/30 |
| spec-index --check | 202 specs; proposal index regenerated (156) — byte-identical to the worker's regeneration |

## Browser qualification

- Contrast: 270/270 normal-text pairs ≥ 4.5 (min 4.51) — `design-browser-contrast.json` (handover evidence, first archive; tokens.css unchanged between archives).
- Control targets on the corrected archive: `evidence/browser/controls-targets.json` — coarse pointer: checkbox label 66.66×44, radio label 44×44 (was 37.17×44), toggle hit target 44×44 over a 44×24 track; fine pointer unchanged (radio label 37.17×20).
- Recipe matrix (8 recipes + controls × 1440/390/320 × EN/ES, 200% text, keyboard, coarse pointer, 18 themes, helper/error association, decoration negative isolation, region scrolling): see `evidence/browser/matrix.md` / `matrix.json` (appended when the matrix run completes).

## Limitations preserved

No full 148-route runtime certification, no manual screen-reader certification, no cross-browser certification, no authenticated production-write proof. Fixtures use synthetic data and omit the authenticated shell.

## Final pass (after independent reviews and browser matrix)

- Review-driven Hub fixes (`review.md`): PartyPicker per-instance dirty state; daily layout `serverLayoutToAdopt` (unit-tested, 10/10 in `daily-cards.test.ts`); decorative hooks (`dialog > [data-part='content']`, `navigation`, `status-dot`/`data-status`), board live-region anchor, coarse floors on SegmentedControl / DataTable search / BoardView trigger, search focus ring, FieldsList focus retention.
- Affected directories after those edits: 28 files / 162 tests green (data-view, crm, scheduling/FieldsList, state/ui, StatusDot, SegmentedControl, dashboard); `lint:design` and `lint:tokens` clean; Prettier applied to every touched file.
- `bun run build` (production, CI env): exit 0 including the client-build-boundary tests and canary.
- Browser re-measurement after the fixture rebuild: `browser/remeasure-after-fixes.json` — all previously failing layout/target/focus cells pass; calendar pilot covered via `calendar.html`.
- Final `bun run check` receipt: see the Hub PR description (CI) and `hub-check-4.log` summary below.
