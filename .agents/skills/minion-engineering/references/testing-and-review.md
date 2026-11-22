# Hybrid TDD and two-axis review

## Hybrid TDD

Use red-green when the behavior has a useful, cheap, stable seam:

1. Write the smallest behavior-level test.
2. Run it before production changes and confirm the intended failure.
3. Implement only enough to satisfy the behavior.
4. Run the test green, then nearby checks.

Do not force TDD through brittle mocks, private internals, slow unrelated infrastructure, or speculative seams. When no practical test exists, record why and use the closest executable check: a script, CLI invocation, browser scenario, replay, snapshot comparison, or focused integration run. Prefer no new test over a misleading test.

Tests must observe public behavior and derive expected values independently from the implementation. Work in vertical slices, not all tests followed by all code. In unattended Factory work, an approved spec that names or clearly determines the seam is confirmation; do not pause to ask again.

## Two-axis review

Keep findings separate:

- **Standards:** Does the change follow the nearest repository instructions, documented conventions, and relevant engineering invariants? Local rules win. Do not invent framework conventions or restate formatter output.
- **Spec:** Does the change implement every approved requirement, omit unrequested scope, and preserve the specified behavior?

Read surrounding code, not only the diff. Give each finding a concrete path and line, trigger, impact, and smallest correction. Report both axes even if one passes. Do not merge or rerank the axes into one score; passing one cannot hide failure in the other.

## Accessibility gate (minion_hub UI changes)

After any UI change in `minion_hub`, run `bun run a11y` from that checkout. Baselines only decrease.

- stdout is one JSON document: `ok`, each gate's `status`, and `rows` of page or story × rule with `count`, `baseline` and `status`. Logs go to stderr; every row is in `test-results/a11y/report.json`.
- A `regression` row means fix the markup. Never raise `tests/ui-audit/a11y-ledger.json` or the `a11y-ignore` ceiling by hand, and never add a `svelte-ignore a11y_*` comment.
- After a fix lowers a count, run `bun run a11y --update-baseline` and commit the ledger.
- For a listbox, menu, tabs, dialog, alertdialog, combobox or grid, prove the keyboard and ARIA contract with `await assertPattern(container, '<pattern>')` from `$lib/a11y/assert-pattern` in a `*.mounted.test.ts`.

`minion_hub/docs/a11y.md` is the reference (flags, gates, one `assertPattern` example per pattern). If the command is missing, the checkout predates spec 137; say so instead of skipping the check.
