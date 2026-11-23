# Independent review: bounded prefix ownership and logo suffix preservation

Standards: PASS. Spec: PASS. No concrete defect found in the reviewed four-file diff.

Reviewed read-only in `/tmp/minion-white-label-145-final-ci`, based on pushed head `45aead23be155c9e7a551932893e5434d069837f` plus the current uncommitted four-file correction. No source, inventory, baseline or test was edited or executed by this reviewer. These hashes identify the reviewed working files, not a new final pipeline head.

## Standards

- `HubWordmark.svelte` adds a typed optional `prefixColor?: string` and applies it only through the actual prefix span's `style:color`. Its only production caller is MinionLogo, which passes the existing trusted preset secondary color or existing `brandPink`; organization names never enter a CSS property.
- MinionLogo removes palette color from its wrapper. The wrapper keeps the existing `font-black`900 and size class; the actual prefix alone owns its preset color. This restores the prefeature5347ff01 color boundary instead of making the suffix inherit the prefix palette when test-host tokens are absent.
- `logoSuffixStyles` defaults false and is enabled only by MinionLogo. Its more-specific suffix rule uses canonical `--color-text-primary` in the original90-percent mix and `--font-weight-bold`700. Default shell wordmarks retain primary foreground/semibold600 and their existing prefix behavior. Fixed suffix text, accessible identity, wrapping and SVG/icon defaults remain unchanged.
- `vitest.config.ts` contains only a three-line handoff comment. The experimental Tailwind import/plugin are fully absent; ordinary unit/native configuration and the existing Storybook producer are unchanged at runtime. No dependency or baseline change is part of this correction.
- The producer limitation is documented at its exact plugin site and in committed matching meta proposal `proposals/2026-11-23-storybook-vitest-css-producer-parity.md`, commit `2bd94aa78e780b9bdbb6f03e6749bf63741cce88`. This satisfies the two-location handoff requirement while keeping the broad producer/baseline audit separate.

## Spec and test quality

The original MinionLogo put its personal palette on the prefix span and styled the sibling suffix as bold foreground90. The bounded correction restores those roles while retaining request-owned text and capitalization. It does not recolor personal presets, change logo graphics, alter organization identity state, or expand a global theme/test producer migration into the naming feature.

The existing mounted test executes actual MinionLogo and HubWordmark, attaches actual compiler-emitted component CSS and Tailwind-emitted font-black, and reads rendered/computed results. Its updated wrapper expectation verifies inherited primary foreground rather than the preset color, while the actual prefix must still match each of all five preset colors at900. The suffix must match the independent original-foreground90 probe at700. Reactive preset/organization replacement, ordinary shell600/primary behavior and icon-only defaults remain tested. This is stronger ownership evidence, not an assertion weakened to accept leaked color.

## Supplied evidence inspected

- `/tmp/white145-pr709-prefix-scope-after-test.json`:15 focused tests passed,0failed. Reviewer did not rerun them.
- `/tmp/white145-pr709-story-prefix-scope-vitest.json` and `/tmp/white145-pr709-prefix-scope-story-gate.json`: five existing-lane stories measured, no unmeasured stories; with-text1, compact1 and sizes3 contrast nodes, equal to the allowed total5. The exact gate reports0regressions and0improvements. This is preservation of the current test-host baseline, not zero accessibility debt.
- `/tmp/white145-pr709-prefix-scope-full-host-with-text.json`, `...-compact.json` and `...-sizes.json`: actual normally styled Storybook on New York, dark canvas, resolved primary foreground; all three cases report zero axe violations and zero incomplete checks. Prefix weight900 and suffix700 are recorded, including14/16/20px size variants. The retained contrast receipts show5.66:1 for the default pink prefix and15.35:1 for the suffix on that dark canvas. These are bounded real-rendering cases, not all-theme certification.
- The corrected-producer full experiment reporting260regression rows is a separately documented audit under the proposal above. It is not a passing gate and is not being silently admitted by raising a baseline. The earlier143/no-report attempt is incomplete evidence, not a product verdict.

## Reviewed source hashes

| File | SHA-256 |
|---|---|
| `vitest.config.ts` | `e357cc674459a13fbe460ddc43bb745d80fcd4645a016f7078027b9a0ff8ac6a` |
| `src/lib/components/layout/HubWordmark.svelte` | `5c9743b659ac2687130648b712306f9c0d7e447ab9b81a4e2e91e3727c8a3687` |
| `src/lib/components/layout/MinionLogo.svelte` | `6078617da0da189d9468d148194e9571db42362072051044dccb237f6622f03d` |
| `src/lib/components/layout/MinionLogo.branding.mounted.test.ts` | `5fe6daa67690b85ebb2690061fabacd34a60b0580eff547a6e25fc99613346a0` |

No further code correction is requested by this review. Canonical full check, commit, AXI follow-up, required CI and deployment remain parent/consumer responsibilities. No final-source inventory or release status was updated here.
