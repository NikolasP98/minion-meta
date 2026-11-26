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
| The accent is the user's choice (the theme's own or one of 10 accents), so the ring's contrast against the surface it sits on is not guaranteed. The hub offers 18 themes × 11 accents = 198 combinations; in **48** of them the accent is below 3:1 (WCAG 1.4.11) on at least one of the theme's surfaces. Worst: gruvbox-light with amber, 1.57:1. | `src/lib/themes/presets.ts` (`PRESETS`, `ACCENT_OPTIONS`), `contrastRatio`; the count is the unit test added in D1 |
| The accent is also used as TEXT colour: links (`a`), 333 `text-accent` utilities and 258 `color: var(--color-accent)` declarations. In **133** of the 198 combinations it is below 4.5:1 (WCAG 1.4.3). A known open item (HC-043). Links in running text (chat messages, markdown, e-mail bodies) are already underlined. | `src/app.css:156-161` (`TODO(handoff)`); `git grep text-accent`, `git grep "color: var(--color-accent)"`; `MarkdownMessage.svelte:352`, `MarkdownView.svelte:80`, `EmailModal.svelte:534` |
| What people use today (production, read-only aggregate 2026-11-26; themes are per user): 16 profiles, 14 with a saved theme: default theme with blue ×10 (also everyone without a saved theme), catppuccin-latte with rose ×2, void with rose ×1, rose-pine-dawn with rose ×1. On all four the **ring already passes** (no change); the accent as **text** fails on all four (3.43–4.34:1). | `user_preferences`, section `theme` |
| 22 elements switch the outline off with `outline-none` and name no replacement on the same line: 15 text fields (their focus indicator is the text cursor), 6 menu / popover containers (their indicator is the highlighted item) and 1 focusable KPI tile with no indicator. Two more non-text controls remove it in component CSS (the assistant's mode buttons). 62 focus utilities and 36 component focus rules paint the accent directly. | `git grep outline-none` minus lines with `focus-visible` / `focus:` |
| 21 places draw focus only as a box-shadow (`--shadow-focus`, the accent at 30–35 % opacity): invisible in forced colours and far below 3:1. | `git grep shadow-focus -- src` |
| There is no `forced-colors` rule anywhere in the hub. | `git grep forced-colors -- src` → 0 |
| The hub already adjusts one colour for readability at run time: `readableMutedFor(preset)` moves the muted text colour toward the foreground in 5 % steps until it reaches 4.5:1; `applyTheme` already sets `--color-accent` and a contrast-chosen `--color-on-accent`. | `src/lib/themes/contrast.ts:55-71`; `src/lib/themes/runtime.ts:36-57` |

## TO-BE

1. **Focus ring.** A new variable `--color-focus-ring` is the accent darkened (light themes) or lightened (dark themes) by the smallest step that reaches **3:1 on every surface of the theme**; the hue stays the accent's. Where the accent already passes, it is the accent, unchanged. The global rule, the focus utilities and the component focus rules use it.
2. **Accent as text.** A new variable `--color-link`, computed the same way to **4.5:1**, used wherever the accent is a text colour.
3. **No new bare `outline-none`.** Non-text controls get the ring back; containers name the opt-out (`focus-ring-none`); the 15 text fields stay as they are; a lint rule (baseline 15) keeps the count from rising.
4. **Shadow-only focus** gains the outline as well (the shadow stays as decoration).
5. **Forced colours.** One `@media (forced-colors: active)` block: the ring uses the system `Highlight` colour and is never removed.

Invariants: the accent colour itself, filled buttons, badges and backgrounds in the accent are untouched; themes whose accent already passes look exactly as today; no token-package change and no new dependency (the variables are set where `--color-on-accent` is set today).

### What users see

| # | Today | After |
|---|---|---|
| 1 | Focus ring in the accent colour, hard to see on light themes with a pale accent | Same ring; on the combinations that fail, a darker (light themes) or lighter (dark themes) shade of the same hue |
| 2 | Links in the accent colour, no underline | Links in a readable shade of the accent, underlined in running text |
| 3 | Some fields show no focus indicator at all | Every focusable element shows one |

**Demo**: FigCraft as-is / to-be for rows 1 and 2 on the worst and the default theme, before the hub PR; recorded here as approved in advance (quote above).

## Delivery: two hub PRs

| PR | What | Who sees a change |
|---|---|---|
| 1 | Focus indicators (TO-BE 1, 3, 4, 5) | Nobody on the four combinations in use today: their ring already passes. Users of the 48 failing combinations get a darker / lighter ring of the same hue. Keyboard users regain the ring on the KPI tile and the assistant's mode buttons. |
| 2 | Accent as text (TO-BE 2) | Everyone: accent-coloured text changes shade on 133 of 198 combinations, including all four in use (default theme with blue: `#2563eb` 3.43:1 → `#5182ef` 4.88:1). **Held for the owner's decision before merge** (coordinator, 2026-11-26). |

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
