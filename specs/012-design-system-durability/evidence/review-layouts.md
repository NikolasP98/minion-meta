# Independent source review: foundations and recipe integration

Reviewer: layout implementation worker; reviewed work is owned by the root/foundations workers. Date: 2026-10-16. Scope: T004–T007, T019 and T020 in the clean feature clones. This review does not independently approve the reviewer's own T008–T011/T015–T016 implementation.

Verdict: source review passes after two recipe corrections. Installed browser, final repository gates and release receipts remain required; this is not deployment proof.

## Findings and resolution

1. The collection recipe supplied `onRowActivate` with `interactionMode="table"`. Native reading mode intentionally has no spreadsheet keyboard scope, so double-click activation had no row keyboard equivalent. Root changed the actionable example to `interactionMode="grid"`. Verified final source at Hub `tests/fixtures/design-durability/Recipes.svelte`.
2. The recipe root declared a viewport height but was not a flex container; the child PageShell's flex sizing therefore did not establish the promised bounded region. Root added a column flex root. Verified final source; measured overflow/scroll ownership still belongs to the browser receipt.

No remaining blocking source finding was identified in the bounded review.

## Reviewed invariants

- Shared typography: Hub imports the installed utilities stylesheet after tokens, and the seven duplicated `.t-*` role definitions are removed. Shared role values remain token-driven. Decorative CRT/voxelized selectors formerly targeting arbitrary button/input/header elements, radius utilities and card/panel class substrings now target stable `data-part` hooks. The controls recipe contains an unrelated native control as a negative isolation specimen.
- Contrast: the contract/schema freeze three normal-text foregrounds against five base surfaces in all eighteen themes (270 combinations), at 4.5:1. The test retains accent/status checks, asserts foreground hierarchy and includes the original gruvbox raised-surface failure as a negative control. Generated inventory includes hashes and is checked against actual source.
- Coarse targets: stable primitive hooks supply 44px target bounds without a consumer opt-in class. Toggle separates its target from the visual track; check/radio targets remain native associated labels. Fields preserve available width. The source tests explicitly acknowledge that SSR output cannot prove pointer bounds or activation.
- API compatibility: no existing primitive prop is removed. Typography/decorations and coarse targets are integrated through established selectors/imports. Recipe documentation states placement, scroll/state ownership, nonempty DataView selection, explicit preset precedence, local customization constraints and qualified-versus-candidate maturity.
- Actual component recipes: collection, board, gallery, detail, form, dashboard, workspace and controls import production/installed components; Calendar uses the actual route with fixture adapters. Synthetic records and visual-only status injection are clearly disclosed. The new catalog fixture mounts the actual POS catalog route. None claims authenticated or production write coverage.
- Hub debt ratchet: default base is the registered `origin/master`; unavailable refs fail with nonzero exit even without `--ci`; changed/untracked CSS and Svelte files are included. Per-file comparison prevents transferring an equal amount of debt into a new file. Negative tests cover absent refs, unchanged source, decreasing debt, untracked transfer and newly introduced CSS debt.

## Evidence boundaries

Source and test definitions were inspected directly. Foundations execution receipts were read from `foundations-implementation.md` (15 token tests, 29 UI tests, type/build gates), not rerun here. Root owns final fresh gates and immutable installed archive identities. Browser acceptance must still prove actual coarse/fine control bounds and native activation, typography across theme/density, decoration isolation, narrow and 200% text layouts, keyboard use and bounded scroll regions. A visual status selector is placement evidence; delayed write/read behavior must remain backed by actual mounted runtime tests.
