# MinionLogo suffix contract and Storybook CSS producer review

Source-only verdict: the declared Vitest Storybook lane does not install the app's Tailwind CSS processor. The shared token package contains the required canonical variables, but its default palette/aliases/weights live inside Tailwind `@theme static`. That processing gap is the leading source-backed explanation for a suffix inheriting the personal pink prefix color and adding one failure per wordmark. The consumer worker owns runtime confirmation; no browser, server or test was run for this review.

Reviewed clean `/tmp/minion-white-label-145-final-ci` head `45aead23be155c9e7a551932893e5434d069837f`. No Hub source, baselines or inventory files were edited.

## Same CSS import, different processing path

- `src/routes/+layout.svelte:3` and `.storybook/preview.ts:3` both import `src/app.css`.
- `src/app.css:1-3` imports Tailwind plus the shared token and utility CSS.
- App `vite.config.ts:2,69-77` explicitly imports and installs `@tailwindcss/vite`.
- `vitest.config.ts:1-7,63-71,102-110` installs Svelte and the Storybook Vitest plugin, with no Tailwind plugin in either the root or Storybook project.
- `.storybook/main.ts` adds environment aliases but no Tailwind processor. `.storybook/preview.css` only overrides scrolling. There is no PostCSS configuration providing an equivalent processor.
- The installed `@storybook/addon-vitest/dist/vitest-plugin/index.js:2572-2585` starts with `commonConfig = { root }` and applies the Storybook `viteFinal` presets. It does not load the application's Vite configuration on that path. The full Storybook builder is different: `@storybook/builder-vite/dist/index.js:1605-1628` explicitly calls `loadConfigFromFile` and merges the app configuration.

Thus the full Storybook dev/build server can inherit Tailwind while the Vitest Storybook project does not. Sharing `app.css` and `applyTheme` alone is insufficient to establish CSS parity.

## Tokens are present in the package

`package.json:24` and `bun.lock:27,464` pin the same durability token tarball. I read that tarball without extracting it into the final checkout and byte-compared its `tokens.css`, `contract.json` and `utilities.css` with the QA clone's installed package: all three match.

The package declares:

- `--color-text-primary`, default New York `#fafafa`.
- `--color-foreground: var(--color-text-primary)`.
- `--font-weight-semibold: 600`; `--font-weight-bold: 700`.
- Default New York canvas `#09090b`.

These defaults and aliases occur inside `tokens.css:7-177`, an `@theme static` block. Without Tailwind processing that block does not produce ordinary runtime custom properties or the expected utilities. The subsequent default `:root` block sets only `color-scheme: dark`; there is no separate New York selector restating the palette. Alternate theme selectors start at line183 and do restate colors outside `@theme`, so this problem can differ by theme.

Storybook's decorator `.storybook/preview.ts:10-29` chooses `PRESETS[0]` (New York), invokes the same `applyTheme`, and sets body background to `var(--color-canvas)`. `applyTheme` in `src/lib/themes/runtime.ts` deliberately removes legacy inline palette overrides, relying on the canonical CSS graph. It cannot replace an unprocessed default `@theme` block. This is a CSS producer issue, not an intentional second palette.

## Actual styling contract change

| Property | Original MinionLogo at base5347ff01 | Current shared composition |
|---|---|---|
| Prefix color | Inline personal preset color on prefix span only | Same personal color on outer MinionLogo text div, inherited by `.hub-prefix.inherit-styles` |
| Prefix weight | `font-black` on prefix only | `font-black` on outer text div, inherited by prefix |
| Suffix color | Separate sibling `text-foreground/90` | `.hub-suffix { color: var(--color-text-primary) }` |
| Suffix weight | `font-bold` (700) | `var(--font-weight-semibold)` (600 when produced) |
| Suffix caller override | Its own utility classes | `inheritStyles` affects prefix only, not suffix |

Source anchors: old `MinionLogo.svelte` final showText block from `git show 5347ff0148:...`; current `MinionLogo.svelte:289-295`; `HubWordmark.svelte:3-13,19-21,33-49`.

If the canonical primary token is unavailable at runtime, the suffix's `color:var(...)` becomes invalid and inherits its parent's current color. That parent is now the personal preset pink. In the old DOM only the prefix span carried pink, so an unstyled suffix could inherit the surrounding body text color instead. This predicts one newly failing suffix per wordmark: compact2 vs1, sizes6 vs3 and with-text2 vs1, without any duplicated logo instance. Computed-variable and rendered-backdrop evidence must confirm this inference.

There is also an independent, real suffix typography drift: 700 to600 and 90-percent foreground to opaque primary. A20px suffix formerly counted as bold can cross an accessibility large-text classification boundary when changed to600. That is distinct from the suspected missing-token inheritance and cannot by itself explain all small/medium rows. Making an already resolved foreground opaque generally increases its contrast; reverting opacity is not a standalone contrast remedy.

## Recommendation

1. Ask the consumer runtime probe to report `--color-text-primary`, `--color-foreground`, both weight tokens, computed suffix/prefix colors and weights, and the actual backdrop. Also distinguish the Vitest Storybook project from the full Storybook server.
2. If the probe confirms missing default tokens/utilities, restore the app-equivalent Tailwind processing in the Storybook Vitest lane. Put it in that browser project rather than broadening unrelated Node unit/native test configuration. Requalify the affected stories on the real token graph before considering baseline changes. Do not compensate with hardcoded colors, fake root variables, a raised baseline or a dark wrapper that hides the producer mismatch.
3. Preserve the existing personal logo prefix palette. For strict original suffix parity, give the MinionLogo wordmark variant a deliberate semantic bold700 suffix and the prior foreground-alpha treatment, rather than letting a prefix-only inheritance option silently redefine the suffix. Treat that as a separate styling contract decision and verify its actual contrast after CSS parity; do not assume a lower-alpha change fixes this report.
4. Do not ratchet MinionLogo counts down from the earlier old-candidate report's zero counts until the producer is qualified. The earlier zero observation alone does not establish an app contrast improvement.

This report establishes the source/configuration mismatch and original/current suffix contracts. It does not claim final computed styles, root-cause runtime confirmation, CI readiness or deployment success. The final inventory already committed by the parent remains unchanged.
