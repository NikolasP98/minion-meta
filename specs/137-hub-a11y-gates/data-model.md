# Data model: spec 137

## Accessibility ledger — `tests/ui-audit/a11y-ledger.json` (committed)

```jsonc
{
  "schemaVersion": 1,
  "tags": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"],
  "pageScenarios": ["compact-390:coarse"],           // viewports the ledger gates
  "pages": {
    "/crm @ compact-390:coarse": { "color-contrast": 3, "label": 1 },
    "/agents/workshop @ compact-390:coarse": "unmeasured"
  },
  "stories": {
    "atoms-actions-button--icon-only": { "button-name": 1 }
  },
  "unstable": {                                       // id → why its count flips between runs
    "components-chat-attachmenttile--with-actions-and-children": "thumbnail button has no name until the image loads"
  }
}
```

Rules:

- **Sparse.** A page or story with no row has a baseline of zero for every rule.
- **Row value** is `{ rule: count }` (count = elements breaking the rule) or the string `"unmeasured"`.
- **First baseline**: while a section (`stories`, or a page viewport) is not in the ledger yet, its rows are reported as `ungated` and `--update-baseline` creates it.
- **Regression** (gate fails): a count above its baseline; a measured row becoming `unmeasured`.
- **Improvement**: a count below its baseline; an `unmeasured` row becoming measured. Passes with `--ci`; locally fails until `--update-baseline` rewrites the ledger.
- **Partial runs** (`--stories`, `--routes`, one viewport) compare and update only the ids they measured.
- **Ungated**: a page row whose viewport is not in `pageScenarios` is reported, never failed; `--update-baseline` adds the viewport.
- **Unstable** rows are compared with ≤ and never lowered by `--update-baseline`; remove the id from `unstable` once its race is fixed.
- Only ratchet persona `owner-admin` in the default populated state enters `pages`, the same filter as the sweep's conformance ledger.

## Run artifact addition — `test-results/ui-audit/run-sweep--*.json`

Each result gains `a11y?: { [rule]: { count, impact, offenders: string[] } }`, present when the page settled and axe ran. Absent = unmeasured.

## Suppression ceiling — `scripts/.design-lint-baseline.json`

`totals["a11y-ignore"]`: number of `a11y_*` tokens on `svelte-ignore` lines in `src/**/*.svelte`.

## Pattern contract — `PATTERN_RULES` in `src/lib/a11y/assert-pattern.ts`

Pattern → rule ids. A problem is `{ rule, expected, element }`.

## Accessibility report

See [contracts/a11y-report.md](contracts/a11y-report.md).
