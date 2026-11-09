# T018 — Verification receipts (feature 013)

All four streams ran focused vitest, `lint:design` (strict after B), `lint:tokens`, `i18n:compile`, Prettier and per-file Svelte compile in the foreground before opening draft PRs; hosted CI ran `check-and-build`, `test`, `qa-stack`, browser journeys and the Postgres lanes on every push (13/13 per PR, re-run after each rebase). Local `bun run check` on B: 0 errors (RAM was shared with another session, so the other streams relied on CI's identical gates).

| Stream | Tests (stream) | Gates | Evidence |
|---|---|---|---|
| B normalisation | codemod test, `ui`/`tables` sanity, design-lint test (strict negative) | raw-icon-size 1051→92, raw-control-height 302→190 (new ceiling), raw-shadow 33/27→33/1 governed, raw-layer 25/7→25/0, raw-motion 7/4→3/0, raw-type-size 8/1→8/1, raw-color 197/0; `lint:design:ci --strict-global` is now a CI gate; visual diff 1440 px github-light/void near-identical | `browser/normalise/visual-diff.json` + PNGs; PR #548 body (non-equivalent table, exceptions) |
| A baseline + density | 5 files / 25 → post-rebase 3 files / 13 | 0 unmarked sub-44 targets at 390 px coarse across 8 recipes (was 1); compact byte-identical at 1440 fine; comfortable only DataTable rows 44→52 + shell token 32→44 | `browser/baseline.json`, PR #547 |
| D states + content | 9 files / 128 → post-rebase 2 files / 17 | `CollectionState` 9-state matrix (11 cases); content-contract: 0 divergent verbs, 174 divergent EN texts baselined, 2 ES value fixes, formatter ratchet 141 files / 326 sites decrease-only, 2 USD bypasses fixed | PR #546 |
| C archetypes, placement, collapse | 13 files / 261 → post-rebase 253 | 137 screens checked, 91 conforming / 46 allow-listed with reasons, 8 drift pins; one-primary DEV warn + test; `/scheduling/calendar` filters → Sheet < 768 px; `SectionNav collapse` on stock/crm/scheduling | PR #549 |

Rebase receipts: D conflicted with B on two pilot pages (resolved: D structure + B codemod + B height tokens, caught by strict lint); D and C conflicted with A on the append-only catalogs (union merge, D's two ES value fixes kept); C conflicted with D on the catalogs (union).

Limitations: no pixel measurement of C's collapse at 390/320 (happy-dom), no authenticated production walk-through, comfortable density on desktop changes table rows only (owner call pending), raw-control-height 190 and raw-icon-size 92 remain above the spec targets (gaps listed in PR #548 as design decisions: 20/22/40 px growth, `ui/**` literals).
