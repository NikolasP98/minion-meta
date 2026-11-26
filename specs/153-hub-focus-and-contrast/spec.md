---
status: implementing
verdict: approved
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S4
---

# Feature Specification: Focus and contrast — the focus ring and links are visible in every theme

**Feature Branch**: `153-hub-focus-and-contrast`; hub branches `feat/153-*`, PR base `master`.

**Created**: 2026-11-26

**Status**: Approved in advance. Owner (2026-11-26, verbatim): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live." Where a choice is open, the option closest to today's look that passes WCAG 2.2 AA is taken and stated. The brand (accent) colour itself is not changed.

**Input**: Slice S4 "Focus & contrast" of the hub accessibility program: bare `outline-none`, focus ring that survives forced colours, non-text contrast ≥ 3:1 for the focus ring, link colour (HC-043).

## AS-IS (hub master `be8ee875`, measured 2026-11-26)

| Fact | Anchor / evidence |
|---|---|
| The focus ring is one global rule: a 2 px outline in the accent colour. It is an outline (not a shadow), so it already survives forced colours. | `src/app.css:175-179` |
| The accent is the user's choice (theme default or one of 10 accents), so the ring's contrast against the surface it sits on is not guaranteed. Measured over 22 themes × 11 accents × 4 opaque surfaces = 968 pairs: **255 below 3:1** (WCAG 1.4.11). Worst 1.25:1 (gruvbox-light, amber, surface-3). With each theme's own default accent: 11 of 88 below 3:1 (ayu-light and concourse-day on every surface). | scratch measurement with `scripts/qa/hc043/resolve.ts` + `css-color.ts`; method recorded in review.md |
| Links use the accent as text colour and have no underline. Same 968 pairs: **609 below 4.5:1** (WCAG 1.4.3); with theme defaults 41 of 88. A known open item (HC-043). | `src/app.css:156-161` (`TODO(handoff)`) |
| 22 elements switch the outline off with `outline-none` and name no replacement on the same line (inputs inside styled wrappers, menu panels, two headings, one KPI tile). | `git grep outline-none` minus lines with `focus-visible` / `focus:`; list in plan.md |
| 21 places draw focus only as a box-shadow (`--shadow-focus`, the accent at 30–35 % opacity): invisible in forced colours and far below 3:1. | `git grep shadow-focus -- src` |
| There is no `forced-colors` rule anywhere in the hub. | `git grep forced-colors -- src` → 0 |
| The hub already adjusts one colour for readability at run time: `readableMutedFor(preset)` moves the muted text colour toward the foreground in 5 % steps until it reaches 4.5:1; `applyTheme` already sets `--color-accent` and a contrast-chosen `--color-on-accent`. | `src/lib/themes/contrast.ts:55-71`; `src/lib/themes/runtime.ts:36-57` |

## TO-BE

1. **Focus ring.** A new variable `--color-focus-ring` is the accent moved toward the theme's text colour by the smallest step that reaches **3:1 on every surface of the theme** (canvas, the three surfaces, cards). Where the accent already passes, it is the accent, unchanged. The global rule uses it.
2. **Links.** A new variable `--color-link`, computed the same way to **4.5:1**, and links in running text are underlined, so they are not told apart by colour alone (WCAG 1.4.1).
3. **No bare `outline-none`.** Each of the 22 either gets the global ring back or names its replacement (`focus-within` ring on its wrapper); a lint rule keeps the count from rising.
4. **Shadow-only focus** gains the outline as well (the shadow stays as decoration).
5. **Forced colours.** One `@media (forced-colors: active)` block: the ring uses the system `Highlight` colour and is never removed.

Invariants: the accent colour, buttons, badges and every non-focus use of the accent are untouched; themes whose accent already passes look exactly as today; no token-package change and no new dependency (the variables are set where `--color-on-accent` is set today).

### What users see

| # | Today | After |
|---|---|---|
| 1 | Focus ring in the accent colour, hard to see on light themes with a pale accent | Same ring; on the combinations that fail, a darker (light themes) or lighter (dark themes) shade of the same hue |
| 2 | Links in the accent colour, no underline | Links in a readable shade of the accent, underlined in running text |
| 3 | Some fields show no focus indicator at all | Every focusable element shows one |

**Demo**: FigCraft as-is / to-be for rows 1 and 2 on the worst and the default theme, before the hub PR; recorded here as approved in advance (quote above).

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | `readableAccentFor(preset, accent, minimum)` beside `readableMutedFor` (same stepping, checked against every surface colour of the preset); `applyTheme` sets `--color-focus-ring` (3:1) and `--color-link` (4.5:1). | unit test over all 22 themes × 11 accents: every pair ≥ its threshold; unchanged where the accent already passes |
| D2 | `:focus-visible` uses `--color-focus-ring`; `a` uses `--color-link`; links inside prose are underlined. | the same measurement script, now reading the new variables: 0 pairs below threshold |
| D3 | The 22 bare `outline-none` sites fixed; design-lint rule `bare-outline-none`, baseline 0. | lint; real-key Tab through the changed fields on a Storybook build |
| D4 | The 21 shadow-only focus styles also keep the outline. | forced-colours screenshot |
| D5 | `@media (forced-colors: active)` block. | forced-colours emulation in a real browser: the ring is visible on a button, a field and a menu item |

## Requirements

- **FR-001**: The focus indicator MUST reach 3:1 against every surface of the active theme, for every selectable accent.
- **FR-002**: Link text MUST reach 4.5:1 and MUST NOT rely on colour alone in running text.
- **FR-003**: No focusable element may remove its focus indicator without naming a replacement.
- **FR-004**: The focus indicator MUST be visible in forced-colours mode.
- **FR-005**: The accent colour itself MUST NOT change; no new dependency; semantic tokens only.
- **FR-006**: `bun run a11y` MUST pass with no baseline rising.

## Success Criteria

- **SC-001**: 0 of 968 pairs below 3:1 for the ring and 0 below 4.5:1 for links (today 255 and 609).
- **SC-002**: 0 bare `outline-none` (today 22), enforced by lint.
- **SC-003**: Every check on each hub PR is green; real-key proof on the final commit.

## Out of Scope

- Contrast of status colours, badges and charts (S5); the 30+ private live regions and label hygiene (S6); changing any theme's palette or the accent options.
