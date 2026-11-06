# T024 — Independent review record (consolidated)

Three independent read-only reviews ran on 2026-10-16 against the live clones after the corrected token archive was installed and the handover diagnostics were fixed. Each reviewer worked from the governing documents (governance skill, spec 012, worker handovers) and reported with file:line evidence. Dispositions below were applied by the coordinator and re-gated (see `verification.md`).

| Scope | Report | Verdict | Findings → disposition |
|---|---|---|---|
| I05 outcomes, autosave hosts, CAS endpoints, FormField/ErrorSummary/dirty dialogs | `review-outcomes.md` | PASS WITH FINDINGS | HIGH: hosts froze `expectedUpdatedAt` at edit time → **fixed** in four hosts (token read at dispatch) + mounted regression. MEDIUM: `configState.loading` stuck after owner retirement → **fixed** (`loadSequence`) + test. LOW: stock detail `busy` → **fixed**. LOW: indicator after Review → accepted by spec. |
| I03/I04 layouts, I06 DataTable/Picker/DataView, I02 app.css, T018 root confirms, design-lint | `review-components-root.md` | PASS WITH FINDINGS | M1 module-level `$state` shared by every PartyPicker → **fixed** (instance state). M2 local layout shadowed the same-org profile section → **fixed** (`serverLayoutToAdopt`: adopt when the server value changes for the same org and no write is pending; unit-tested). M3 decorative rules targeted hooks nothing emits → **fixed** (Dialog real part, `navigation` on both navs, `status-dot`/`data-status` on StatusDot, dead `panel` term removed). L3 FieldsList focus landed on the visibility toggle → **fixed**. L1/L2/L4/L5 + INFO (one-time preference key re-scoping) → ledgered in the proposal follow-ups; governance rule revised. |
| Meta packages/packer/governance/spec, Site + Site-release + Meta-release hygiene | `review-packaging-release.md` | PASS (site-release), PASS WITH FINDINGS (others) | M1 changeset `patch`→`minor` → **fixed** (both meta clones). S1 design-lint compared to base tip → **fixed** with `git merge-base` fork point (site, site-release, hub). M2 FormField describedby order → T028 (packed archive). M3 label `display` specificity → T029. M-R1/M-R3 informational. |

## Browser qualification review (T023, `browser/matrix.md`)

106 cells: 80 pass, 20 fail, 6 not measurable on the first run. Failure dispositions:

| Failure | Disposition |
|---|---|
| Board recipe document overflow at 390/320 (sr-only live region escaped `.board`) | **fixed**: `.board { position: relative }` |
| Coarse targets < 44 px: `SegmentedControl .seg-btn` 38×22, DataTable search input 24 px high, BoardView move trigger 28 px wide | **fixed** with `(pointer: coarse)` floors in the three components |
| DataTable search input had no focus ring under `:focus-visible` | **fixed**: `box-shadow: var(--shadow-focus)` |
| `h1` recipe title ellipsizes at 390 | by design (PageHeader title ellipsis, actions wrap); fixture README corrected |
| DataTable name cells ellipsize at 200 % | by design (fixed-layout cells) |
| `[data-theme=crt] *` changes `font-family` on the undecorated native control | theme typography, not decoration; geometry/background/border/shadow/filter unchanged (measured); ledgered |
| `recipe=calendar` renders only the shell | the calendar pilot is the mobile-composition `calendar.html` fixture (actual component); ledgered |

Re-measurement of the fixed cells after the fixture rebuild is recorded in `browser/matrix.md` (appendix) and `verification.md`.

## Residual limitations (not certified)

Screen-reader, cross-browser and full-route certification; authenticated production writes. See the proposal's follow-ups table for every open end.
