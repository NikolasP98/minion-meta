---
status: draft
verdict: pending
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S0
---

# Feature Specification: Accessibility gates first — CI fails on any new accessibility regression

**Feature Branch**: Planned `137-hub-a11y-gates` (hub branch `feat/137-a11y-gates`); hub PR base `master` (repo-policy row `minion_hub`).

**Created**: 2026-11-20

**Status**: Draft. Program approved by the owner on 2026-11-20 ("Approve, start S0 spec"); this slice still needs spec review before `/speckit-plan`.

**Input**: User description: "Hub accessibility program slice S0 — gates first. Add automated accessibility gates that fail CI on regressions before any fix lands: page-level automated accessibility checks on every route in the CI page sweep and on every component story, against a decrease-only baseline; our own pattern-assertion helper for WAI-ARIA APG contracts (listbox, menu, tabs, dialog/alertdialog, combobox, grid) usable in unit and browser tests; run the two orphaned accessibility specs in CI; ratchet the count of suppressed compiler accessibility warnings. No visual or behavior change; bounded CI time; fixing violations is out of scope (S1–S6)."

Owner directive (2026-11-20, verbatim): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner decision on the helper: "Write our own".

## AS-IS (hub master `3677e35a`, read 2026-11-20)

| Fact | Anchor |
|---|---|
| The CI page sweep runs one bounded matrix (owner-admin × compact-390 coarse / wide-1440 fine) and compares against a per-page ledger that may only improve; its rules are `overflow, targets, dominant-action, archetype, health, title` — **no accessibility-engine rule**. | `tests/e2e/ui-audit/conformance.ts:20-27`; `scripts/ui-audit-sweep.ts:4-20`; `scripts/ui-audit-conformance.mjs:3-21`; CI step `.github/workflows/ci.yml:827-833` (15-minute budget, spec 014 FR-009) |
| The component library already loads an automated accessibility checker for every story, but in **report-only** mode, and story tests are **not run in CI** (opt-in script only). 194 story files. | `.storybook/main.ts:11-12` (addon-vitest, addon-a11y); `.storybook/preview.ts:91-95` (`a11y.test: 'todo'`); `package.json:232` (`test:storybook`); no workflow references it |
| Pattern-level checks exist only as one ad-hoc helper test; nothing asserts one-tab-stop, arrow/Home/End behavior or focus loss generically. | `src/lib/a11y/button-keys.ts`, `src/lib/a11y/role-button-keys.mounted.test.ts` (3 tests) |
| Two accessibility browser specs exist, build their own credential-free fixtures, and are **never run in CI** (the critical config matches only critical-journey specs; the workshop config needs `MINION_WORKSHOP_URL` and no workflow sets it). | `tests/e2e/ui-audit/canvas-accessibility.spec.ts:1-30`; `tests/e2e/ui-audit/workshop-accessibility.spec.ts`; `playwright.critical.config.ts:11-14`; `playwright.workshop.config.ts:2-7` |
| 80 compiler accessibility warnings are suppressed with `svelte-ignore a11y_*` (51 × `no_static_element_interactions`) and nothing stops the count from growing. The design-lint per-file debt ratchet exists but has no rule for them. | `grep -rho "svelte-ignore a11y_[a-z_]*" src \| wc -l` = 80; `scripts/design-lint.mjs:3-30` (baseline `scripts/.design-lint-baseline.json`, decreases only) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A page regression fails CI (Priority: P1)

A contributor changes a hub page so that it gains an accessibility violation (for example an unlabeled button or a missing landmark). CI fails on the pull request and names the page, the rule and how many elements break it. Pages that already had violations before this slice keep passing as long as their counts do not grow.

**Why this priority**: Pages are what users meet; without this gate every fix in later slices can silently regress.

**Independent Test**: On a branch, remove the accessible name from one icon button on a swept page; the PR's sweep step fails naming that page and rule. Revert; it passes.

**Acceptance Scenarios**:

1. **Given** a swept page with a recorded violation count of N for a rule, **When** a change raises it to N+1, **Then** the sweep step fails and prints page, viewport, rule and the new count.
2. **Given** the same page, **When** a change lowers the count, **Then** CI passes and prints that the ledger can be ratcheted down.
3. **Given** a page newly added to the sweep, **When** it has any violation, **Then** CI fails (new pages start at zero).

---

### User Story 2 — A component regression fails CI (Priority: P1)

A contributor edits a shared component or adds a story. Every story is checked for accessibility violations in CI; a new violation in any story fails the PR, while existing per-story debt is recorded and may only shrink.

**Why this priority**: Components (atoms) are reused across pages; catching a problem at the component catches it everywhere at once — the owner asked for "atom to full pages".

**Independent Test**: Add a story rendering a primitive with a deliberately broken label; the CI story job fails naming the story and rule.

**Acceptance Scenarios**:

1. **Given** a story with zero recorded violations, **When** a change introduces one, **Then** the story check fails naming story, rule and element.
2. **Given** a story with recorded debt, **When** its count for a rule grows, **Then** it fails; **When** it shrinks, **Then** it passes and reports the ratchet.
3. **Given** a new story, **When** it has any violation, **Then** it fails.

---

### User Story 3 — One call proves a widget follows its keyboard and ARIA pattern (Priority: P2)

A contributor building or fixing a listbox, menu, tabs, dialog, alertdialog, combobox or grid writes one assertion in a unit (mounted) or browser test. It checks the widget against its WAI-ARIA Authoring Practices pattern and fails with a message naming each broken expectation.

**Why this priority**: The automated page/story checker cannot see keyboard behavior; this is the tool every later slice (S1–S6) uses to prove its fixes.

**Independent Test**: Run the assertion against a known-good fixture of each pattern (passes) and against a fixture with one deliberate defect per rule (fails with that rule's message).

**Acceptance Scenarios**:

1. **Given** a composite widget with two elements in the Tab order, **When** asserted, **Then** it fails with "exactly one tab stop" naming both elements.
2. **Given** a vertical listbox, **When** ArrowDown/ArrowUp/Home/End are pressed, **Then** the assertion checks the active option moves accordingly (by roving tabindex or by active-descendant) and fails naming the key that misbehaved.
3. **Given** any widget, **When** a key press leaves focus on the document body or inside inert/hidden content, **Then** the assertion fails naming the key.
4. **Given** a dialog, **When** asserted, **Then** it checks role, accessible name, modal state, that focus starts inside, and that Escape closes it and returns focus to the opener.
5. **Given** a grid, **When** asserted, **Then** it checks one tab stop, arrow movement between cells, Home/End within a row and Ctrl+Home/Ctrl+End across the grid.

---

### User Story 4 — The two existing accessibility specs protect us (Priority: P2)

The canvas and workshop accessibility browser specs that already exist run on every PR, so what they already prove can no longer regress unnoticed.

**Independent Test**: Break one assertion target in the canvas fixture; CI fails.

**Acceptance Scenarios**:

1. **Given** a PR, **When** CI runs, **Then** both specs run and their failures fail the PR.

---

### User Story 5 — Suppressed warnings can only go down (Priority: P3)

A contributor cannot add a new `svelte-ignore a11y_*` suppression without the design lint failing; removing one passes and lets the baseline drop.

**Independent Test**: Add one suppression in any file; the design lint fails naming the file. Remove an existing one; it passes and reports the ratchet.

**Acceptance Scenarios**:

1. **Given** a file with K suppressions, **When** a change makes it K+1, **Then** the lint fails for that file.
2. **Given** a new file, **When** it contains a suppression, **Then** the lint fails.

### Edge Cases

- **Flaky results:** the checker runs only after the page or story has settled (no pending network requests, fonts loaded, motion reduced); a violation that appears only intermittently is reported, never retried away.
- **Selector churn:** baselines count violations per page × viewport × rule (and per story × rule), not per element selector, so renamed classes or generated IDs do not cause false failures.
- **Theme-dependent contrast:** stories are checked in the default theme only in this slice; per-theme contrast stays with the existing theme contrast tests.
- **Rules that conflict with intentional design:** a rule may be disabled for a page or story only through a reason-coded entry in the same allow-list mechanism the sweep already uses, never silently.
- **Story that cannot render in the test runner:** it fails as an error (visible), not skipped.
- **Pattern assertion on a disabled widget:** disabled items must be skipped by arrow navigation only when the pattern says so; the helper follows the APG rule per pattern.
- **Right-to-left:** out of scope for this slice (the hub ships LTR locales only); the helper accepts an orientation but not a direction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CI page sweep MUST run an automated accessibility check covering WCAG 2.0, 2.1 and 2.2 levels A and AA on every page and viewport in its default matrix.
- **FR-002**: Each page × viewport MUST record its current violation count per rule in the sweep's existing decrease-only ledger; CI MUST fail when any count rises or a new page/rule appears with a non-zero count, and MUST pass (reporting the ratchet) when counts fall.
- **FR-003**: Every component story MUST be checked by the same rule set in CI, with a per-story, per-rule decrease-only baseline and the same pass/fail semantics as FR-002.
- **FR-004**: Failure output MUST name the page or story, the viewport (pages), the rule, the old and new count, and at least one offending element.
- **FR-005**: The project MUST provide a pattern-assertion helper, with no new third-party dependency, covering listbox, menu, tabs, dialog, alertdialog, combobox and grid, asserting: required roles and accessible names; required states; exactly one tab stop per composite (roving tabindex or active-descendant); key behaviors per pattern and orientation (arrows, Home/End, typeahead where the pattern requires it, Escape for popups/dialogs, Ctrl+Home/End for grid); that focus never lands on the document body or inside inert/hidden content after any key; focus return on close for dialogs and popups.
- **FR-006**: The helper MUST collect every problem in one run and report them together, each naming the element and the APG expectation it broke.
- **FR-007**: The helper MUST work in mounted unit tests and in browser tests, and MUST ship with a self-test: one passing fixture per pattern and one failing fixture per asserted rule.
- **FR-008**: The canvas and workshop accessibility specs MUST run on every pull request and fail it on failure.
- **FR-009**: The design lint MUST count `svelte-ignore a11y_*` suppressions per file in its decrease-only baseline and fail when any file's count rises or a new file adds one.
- **FR-010**: This slice MUST NOT change any rendered UI or component behavior; it only adds checks, baselines and a test helper.
- **FR-011**: Baselines MUST be generated from the current master in this slice and committed, so the first run is green and every later change is measured against it.

### Key Entities

- **Page accessibility ledger row**: page × viewport × rule → violation count (plus the reason-coded allow-list entries the sweep already supports).
- **Story accessibility baseline row**: story id × rule → violation count.
- **Pattern contract**: a named APG pattern with its required roles, states, names, key behaviors and focus rules.
- **Suppression baseline**: file → number of `svelte-ignore a11y_*` comments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A seeded violation on any swept page, in any story, or a new suppression comment fails the pull request in 100% of trials (one trial per gate, recorded in the PR).
- **SC-002**: On the slice's own PR, all four gates pass against the committed baselines (first run green).
- **SC-003**: The pattern helper's self-test passes for all 7 patterns, and each of its failure fixtures fails with the intended message.
- **SC-004**: The page sweep stays within its existing 15-minute budget, and the added story and spec jobs add no more than 6 minutes of wall-clock time to the PR checks (measured on the slice PR against the previous master run).
- **SC-005**: The baselines give the program a measured starting point: the total recorded violations for pages, stories and suppressions are published in the PR description, and later slices report against them.

## Assumptions

- Rule set = the checker's WCAG 2.0/2.1/2.2 A + AA tags; best-practice-only rules are excluded to keep the gate about conformance.
- The component-library checker already installed for stories is the same engine used for pages, so results are comparable; no new dependency is needed for FR-001–FR-003 beyond what the browser test stack already pulls in (verified in `/speckit-plan`).
- The default sweep matrix (owner-admin persona, two viewports) is sufficient for S0; the `--full` matrix stays manual.
- Theme: default theme only; the existing per-theme contrast unit tests remain the contrast authority.
- No user-facing strings are added (helper messages are developer-facing), so no Paraglide work; no routes, APIs or nav links are added, so no RBAC or route-contract changes (constitution Principle IV checked).
- Not tagged security or data: no auth, tenant, credential or production-data change (constitution Principle V not triggered).

## Out of Scope

- Fixing any recorded violation (S1–S6 of the program).
- Screen-reader output testing (program S6).
- Right-to-left layouts; per-theme story checks; the `--full` sweep matrix in CI.
- `minion_site`.
