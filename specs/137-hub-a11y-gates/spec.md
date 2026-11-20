---
status: review
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

**Status**: Reviewed in two passes on 2026-11-20 (findings and fixes: [`review.md`](review.md)). Program approved by the owner on 2026-11-20 ("Approve, start S0 spec"); the owner's verdict on this slice is given on the hub PR, which needs the owner's merge approval.

**Input**: User description: "Hub accessibility program slice S0 — gates first. Add automated accessibility gates that fail CI on regressions before any fix lands: page-level automated accessibility checks on every route in the CI page sweep and on every component story, against a decrease-only baseline; our own pattern-assertion helper for WAI-ARIA APG contracts (listbox, menu, tabs, dialog/alertdialog, combobox, grid) usable in unit and browser tests; run the two orphaned accessibility specs in CI; ratchet the count of suppressed compiler accessibility warnings. No visual or behavior change; bounded CI time; fixing violations is out of scope (S1–S6)." Extended on 2026-11-20 by the owner's handoff: "The enforcement and create an agent-usable environment" — one command with machine-readable output, documented where agents look.

Owner directive (2026-11-20, verbatim): "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc)." Owner decision on the helper: "Write our own".

## AS-IS (hub master `3677e35a`, read 2026-11-20)

| Fact | Anchor |
|---|---|
| The CI page sweep runs ONE matrix entry (owner-admin × compact-390 coarse; the wide-1440 pass is local only) and records six rules per page: `overflow, targets, dominant-action, archetype, health, title` — **no accessibility-engine rule**. It took 7 min 10 s on master run 44699381361 against a 15-minute step budget. | `tests/e2e/ui-audit/conformance.ts:20-27`; `scripts/ui-audit-sweep.ts:52-56,81` (`CI_MATRIX_ENTRY`); CI step `.github/workflows/ci.yml:827-833` |
| **The sweep's ledger was never committed**, so its compare step gates nothing today: `tests/ui-audit/conformance-ledger.json` is not tracked (`git ls-files tests/ui-audit` lists only `conformance-allowlist.json` and `current-baseline.json`) and the CI log prints `ui-audit-conformance: blocked: no ledger yet` and exits 0. | `scripts/ui-audit-conformance.mjs:412-416`; master run 44699381361, job `qa-stack`, step "Page conformance sweep" |
| The component library already loads an automated accessibility checker (axe-core 4.14.0) for every story, but in **report-only** mode, and story tests are **not run in CI** (opt-in script only). 194 story files hold 1,205 stories; one full run takes about 5 min 20 s on a 22-core workstation. | `.storybook/main.ts:11-12` (addon-vitest, addon-a11y); `.storybook/preview.ts:91-95` (`a11y.test: 'todo'`); `package.json:232` (`test:storybook`); no workflow references it; `bun.lock` (`axe-core@4.14.0`) |
| A story run on a cold dependency cache is not repeatable: the bundler re-optimizes mid-run and reloads the page ("optimized dependencies changed. reloading"), 7 story files then fail to import and 10 stories fail their interaction test; the same tree on a warm cache runs all 1,205 stories with 0 failures. Between two full warm runs 2 stories of 1,205 changed a count (`components-chat-attachmenttile--with-actions-and-children`, `button-name` 0 ↔ 1, an image-load race; `components-navigation-sidebar--expanded-admin-business-org`, `color-contrast` 0 ↔ 2, cause not found). | Three local full runs at `3677e35a`, 2026-11-20 (run 1 cold, runs 2 and 3 warm) |
| Measured story debt at `3677e35a` (warm runs, WCAG A/AA rules only): 804 and 805 violating elements in 277 of 1,205 stories; `color-contrast` (359) and `aria-required-parent` (188) first. | Runs 2 and 3; rule list in the hub PR description |
| Pattern-level checks exist only as one ad-hoc helper test; nothing asserts one-tab-stop, arrow/Home/End behavior or focus loss generically. | `src/lib/a11y/button-keys.ts`, `src/lib/a11y/role-button-keys.mounted.test.ts` |
| Two accessibility browser specs exist, build their own credential-free fixtures, pass locally in Chromium (7 and 6 tests) and are **never run in CI** (the critical config matches only critical-journey specs; the workshop config needs `MINION_WORKSHOP_URL` and no workflow sets it; that config also lists Firefox and WebKit). | `tests/e2e/ui-audit/canvas-accessibility.spec.ts:1-30`; `tests/e2e/ui-audit/workshop-accessibility.spec.ts`; `playwright.critical.config.ts:11-14`; `playwright.workshop.config.ts:2-7,19-31` |
| 80 `svelte-ignore a11y_*` comments suppress **84 compiler accessibility warnings** (4 comments name two rules; 54 × `no_static_element_interactions`) and nothing stops the count from growing. The design lint holds a global per-rule ceiling and compares each changed file with the PR base, but has no rule for them. | `grep -rho "svelte-ignore a11y_[a-z_]*" src \| wc -l` = 80; `scripts/design-lint.mjs:3-30,320-349,380` (ceiling `scripts/.design-lint-baseline.json`, decreases only) |
| There is no single accessibility command and no machine-readable result: an agent has to know four scripts and read their logs. | `package.json` scripts (no `a11y`); hub `AGENTS.md` (no accessibility section) |

## TO-BE

One command, `bun run a11y`, runs every accessibility gate and prints one JSON document; CI runs the same command. Five gates:

| Gate | Fails when | Baseline (decrease-only) |
|---|---|---|
| pages | on a swept page × viewport, the number of elements breaking a WCAG A/AA rule rises, or a page that was measured can no longer be measured | accessibility ledger, section `pages` |
| stories | the same per story, or a story that ran stops running | accessibility ledger, section `stories` |
| patterns | any test that uses the pattern-assertion helper fails | none: must pass |
| specs | the chart-canvas or workshop accessibility spec fails | none: must pass |
| suppressions | a changed file gains a suppressed compiler accessibility warning, or the total rises | design-lint ceiling |

Invariants: a baseline number never rises; a page or story absent from the ledger has a baseline of zero; nothing is skipped silently (what cannot be measured is recorded as `unmeasured` and may not spread); no rendered UI or component behavior changes.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | The page sweep records an axe pass per settled page; a new accessibility ledger holds the counts (the sweep's own ledger stays uncommitted: activating the six existing rules is spec 014's decision, recorded as an open end). | SC-001 page trial; unit test of the compare |
| D2 | Story tests run in CI; their existing axe reports are compared with the ledger. | SC-001 story trial; unit test of the compare |
| D3 | A pattern-assertion helper is added with its self-test. | SC-003 |
| D4 | The two existing specs run on every PR (Chromium). | SC-001 spec trial |
| D5 | The design lint counts suppressed warnings. | SC-001 suppression trial |
| D6 | One command and its documentation exist. | SC-006, SC-007 |

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

---

### User Story 6 — An agent runs one command and reads the result (Priority: P1)

An agent (or a person) changes UI, runs one command, and gets a machine-readable answer: which gates passed, and for every page or story which rule now has how many violations against which baseline. The same command runs in CI. The rule "after any UI change run it; baselines only decrease" is written where agents already look.

**Why this priority**: The owner asked for "an agent-usable environment"; a gate an agent cannot find or parse is not enforced in practice.

**Independent Test**: In a clean checkout, an agent that has read only the hub contributor instructions runs the command and reads `ok`, the gate statuses and the changed rows from its output without opening a log.

**Acceptance Scenarios**:

1. **Given** a clean tree, **When** the command runs, **Then** it exits 0 and prints one JSON document whose gates all report `pass` (or `skipped` for gates not selected).
2. **Given** a seeded violation, **When** it runs, **Then** it exits non-zero and the document names the page or story, the rule, the count, the baseline and an offending element.
3. **Given** a fix that lowers a count, **When** it runs locally, **Then** it asks for the baseline to be ratcheted; with the ratchet option it rewrites the baseline; in CI the lower count passes.

### Edge Cases

- **Flaky results:** the checker runs only after the page or story has settled (motion reduced for stories); a violation that appears only intermittently is never retried away: the row is listed in the ledger as unstable, with a reason, and held at its highest count until its race is fixed.
- **Cold dependency cache:** a story run during which the bundler re-optimizes and reloads is void (AS-IS); the command runs the stories once more on the now-warm cache. This reruns an infrastructure failure, never a violation.
- **Counts:** a count is the number of elements breaking a rule on that page or story.
- **Selector churn:** baselines count violations per page × viewport × rule (and per story × rule), not per element selector, so renamed classes or generated IDs do not cause false failures.
- **Theme-dependent contrast:** stories are checked in the default theme only in this slice; per-theme contrast stays with the existing theme contrast tests.
- **Rules that conflict with intentional design:** this slice ships no way to waive a rule; existing debt is carried by the baseline. A later slice that needs a waiver adds reason-coded entries, never a silent disable.
- **Story that cannot render in the test runner:** it is reported as `unmeasured` with its error; a story that ran at baseline and stops running fails the gate.
- **Viewports without a baseline:** only the viewport CI sweeps is gated; a local sweep of another viewport is reported as ungated, not failed.
- **Pattern assertion on a disabled widget:** disabled items must be skipped by arrow navigation only when the pattern says so; the helper follows the APG rule per pattern.
- **Right-to-left:** out of scope for this slice (the hub ships LTR locales only); the helper accepts an orientation but not a direction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CI page sweep MUST run an automated accessibility check covering WCAG 2.0, 2.1 and 2.2 levels A and AA on every page it captures, in the viewport CI sweeps, after the page settled.
- **FR-002**: Each page × viewport MUST record its current violation count per rule in a committed decrease-only ledger built from the sweep's run artifacts; CI MUST fail when any count rises, when a new page or rule appears with a non-zero count, or when a measured page becomes unmeasured, and MUST pass (reporting the ratchet) when counts fall.
- **FR-003**: Every component story MUST be checked by the same rule set in CI, with a per-story, per-rule decrease-only baseline and the same pass/fail semantics as FR-002.
- **FR-004**: Failure output MUST name the page or story, the viewport (pages), the rule, the old and new count, and at least one offending element.
- **FR-005**: The project MUST provide a pattern-assertion helper, with no new third-party dependency, covering listbox, menu, tabs, dialog, alertdialog, combobox and grid, asserting: required roles and accessible names; required states; exactly one tab stop per composite (roving tabindex or active-descendant); key behaviors per pattern and orientation (arrows, Home/End, typeahead where the pattern requires it, Escape for popups/dialogs, Ctrl+Home/End for grid); that focus never lands on the document body or inside inert/hidden content after any key; focus return on close for dialogs and popups.
- **FR-006**: The helper MUST collect every problem in one run and report them together, each naming the element and the APG expectation it broke.
- **FR-007**: The helper MUST work in mounted unit tests and in real-browser story tests (it accepts a key driver for widgets that depend on native key handling), and MUST ship with a self-test: one passing fixture per pattern and one failing fixture per asserted rule.
- **FR-008**: The canvas and workshop accessibility specs MUST run on every pull request, in Chromium, and fail it on failure.
- **FR-009**: The design lint MUST count suppressed compiler accessibility warnings (one per `a11y_*` rule named in a `svelte-ignore` comment) and fail when a changed file's count rises against the PR base, when a new file adds one, or when the total exceeds its decrease-only ceiling.
- **FR-010**: This slice MUST NOT change any rendered UI or component behavior; it only adds checks, baselines and a test helper.
- **FR-011**: Baselines MUST be generated from the current master in this slice and committed, so the first run is green and every later change is measured against it.
- **FR-012**: One command MUST run all gates and print exactly one machine-readable document: overall result, each gate's status, and one row per page or story × rule with its count, baseline and status, plus the pattern-assertion failures. Its exit code MUST be non-zero when any gate fails.
- **FR-013**: CI MUST run that same command; the only difference allowed in CI is that a count that fell does not fail.
- **FR-014**: The command, the pattern helper (one example per pattern) and the rule "after any UI change run the command; baselines only decrease" MUST be documented in the hub contributor instructions, the `ui-design-governance` skill and the curated engineering skill bundle.

### Key Entities

- **Page accessibility ledger row**: page × viewport × rule → violation count, or `unmeasured`.
- **Story accessibility baseline row**: story id × rule → violation count, or `unmeasured`.
- **Unstable row**: a page or story id with the reason its count flips between runs.
- **Pattern contract**: a named APG pattern with its required roles, states, names, key behaviors and focus rules.
- **Suppression ceiling**: total number of suppressed compiler accessibility warnings (per-file change is judged against the PR base).
- **Accessibility report**: the command's output document.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A seeded violation on a swept page, in a story, in a pattern test, in one of the two specs, or a new suppression fails the gate in 100% of trials (one trial per gate, recorded in the PR).
- **SC-002**: On the slice's own PR, all five gates pass against the committed baselines (first run green).
- **SC-003**: The pattern helper's self-test passes for all 7 patterns, and each of its failure fixtures fails with the intended message.
- **SC-004**: The page sweep stays within its existing 15-minute step budget, and the new job does not lengthen the PR checks: it finishes before the longest existing job (`critical-journeys-browser`, 26 minutes on master run 44699381361). Both are measured on the slice PR.
- **SC-005**: The baselines give the program a measured starting point: the total recorded violations for pages, stories and suppressions are published in the PR description, and later slices report against them.
- **SC-006**: The command's output from a real run parses as one JSON document and is shown in the PR description.
- **SC-007**: The three documentation places (FR-014) each name the command and the decrease-only rule; the hub one carries one helper example per pattern.

## Assumptions

- Rule set = the checker's WCAG 2.0/2.1/2.2 A + AA tags; best-practice-only rules are excluded to keep the gate about conformance.
- The component-library checker already installed for stories (axe-core 4.14.0) is the same engine used for pages, so results are comparable. No new package enters the lockfile; the engine becomes an explicit development dependency because the page sweep now imports it directly.
- The CI sweep matrix (owner-admin persona, compact-390 coarse) is sufficient for S0; the wide viewport and the `--full` matrix stay local and ungated.
- Theme: default theme only; the existing per-theme contrast unit tests remain the contrast authority.
- No user-facing strings are added (helper messages are developer-facing), so no Paraglide work; no routes, APIs or nav links are added, so no RBAC or route-contract changes (constitution Principle IV checked).
- Not tagged security or data: no auth, tenant, credential or production-data change (constitution Principle V not triggered).

## Out of Scope

- Fixing any recorded violation (S1–S6 of the program).
- Screen-reader output testing (program S6).
- Right-to-left layouts; per-theme story checks; the wide viewport and the `--full` sweep matrix in CI.
- Committing the page sweep's own six-rule ledger (spec 014); Firefox and WebKit runs of the workshop spec; a rule waiver mechanism.
- `minion_site`.
