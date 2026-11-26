# Spec 153 review — two passes, 2026-11-26

Reviewer: the implementing agent, against hub master `be8ee875` → `d7412f4a`.

## Pass 1 — is the AS-IS true, and does the mechanism hold?

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| 1 | The first draft measured 22 themes. Four of them (concourse, concourse-day, clinic, clinic-night) exist only in the token package; the hub offers 18. | `src/lib/themes/presets.ts` `THEME_ORDER` | All figures restated for 18 themes × 11 accents = 198 combinations. |
| 2 | The first draft said the global outline is the focus ring. It is for elements without `outline-none`; the shared controls (Button, Input, Select, Textarea, Checkbox, Radio, Toggle) switch it off and draw `--shadow-focus`, a glow at 30–35 % opacity. | `node_modules/@minion-stack/ui/dist/Button.svelte:83`; in a browser: focused button `outline: none`, shadow colour over the page = 1.41:1 on the default theme | The shared shadow is the main defect: below 3:1 in 180 of 180 combinations. D4 rewritten around it. |
| 3 | Mixing the accent toward the theme's text colour (as `readableMutedFor` does) washes the hue out: ayu-light's orange became grey-brown. | computed values | The accent is darkened on light themes and lightened on dark ones; the hue stays. |
| 4 | No single adjustment fits all themes (it would take 60 % text colour for the ring). | measurement | Computed per theme and accent at run time, where `--color-on-accent` is already computed. |
| 5 | Changing the token package would need a repack and a pin bump of the vendored tarball in the hub. | hub `package.json` `file:deps/minion-stack-design-tokens-…` | Hub only: the runtime overrides `--shadow-focus` and adds two variables; `@theme` declares them so utilities exist. |
| 6 | Of the 22 bare `outline-none`, 15 are text fields. Their focus indicator is the text cursor; restoring a ring there would change their look. | per-file read | Left as they are; lint baseline 15. Non-text controls get the ring; containers get the named opt-out. |
| 7 | A filled accent button with a ring of the same colour directly around it shows no indicator. | — | The ring has a 2 px gap in the page colour, like the global outline's offset. |
| 8 | The accent is used as text in about 590 places, not only in links. | `git grep` | Split into PR 2; held for the owner. |

## Pass 2 — complete, consistent, testable?

| # | Finding | Outcome |
|---|---|---|
| 9 | The unit test proves the helper on the presets' own colours; the proof that the browser paints it is separate. | Real-browser reading on a Storybook build (Storybook applies themes with the hub's own `applyTheme`). |
| 10 | Buttons must not show the ring on a mouse click. | The shared controls already use `focus-visible`; observed: a clicked button shows none, a clicked text field shows it, as the glow does today. Stated in the PR. |
| 11 | Forced colours drops shadows and author colours. | The forced-colours rule sets the outline with `!important` (the controls' utility class would otherwise win). |
| 12 | Constitution IV: no new string, route, API or permission; semantic tokens only; no new dependency. | Confirmed (`lint:design`, `lint:tokens`). |
