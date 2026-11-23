# Independent review: Storybook CSS parity and logo suffix contract

Reviewed read-only in `/tmp/minion-white-label-145-final-ci` against parent HEAD `45aead23be155c9e7a551932893e5434d069837f`. Scope is the four uncommitted files listed below. The consumer worker owns edits and execution. No Hub source, inventory, baseline, server or test was changed or run by this reviewer.

Standards: PASS. Spec: PASS. The single canonical-token naming finding is resolved by the bounded source recheck below; no open review finding remains.

## Findings

**S1 — resolved.** The new logo-only90-percent mix now uses canonical `var(--color-text-primary)` at `src/lib/components/layout/HubWordmark.svelte:49`. Its90-percent alpha and `--font-weight-bold`700 are unchanged. The mounted test still expects the original `--color-foreground`90-percent mix through an independent computed-color probe; the frozen alias maps foreground to text-primary, and the fixture supplies equal values to both roles. This preserves the original suffix contract while keeping new production CSS canonical. The test expectation was not weakened. The bounded follow-up inspected this one production-line correction and the unchanged relevant test expectations; no execution was performed.

No behavioral or authorization finding was substantiated.

## Standards review

- `tailwindcss()` is installed only inside `storybookProject()` in `vitest.config.ts:64-75`. That function is called only when `STORYBOOK_TESTS` selects the Storybook project. The ordinary unit test block, root Svelte plugin list, native exclusions, aliases, setup, timeouts and ordinary conditional return remain unchanged. There is a static import of the already-installed app dependency, but no Tailwind plugin execution is added to ordinary unit/native Vite configuration.
- The fix supplies the missing CSS producer instead of faking theme variables, forcing a dark wrapper or raising a ledger. The app already uses the same Tailwind plugin. No dependency/lock change is introduced.
- `logoSuffixStyles` defaults false. Its class is added to the existing suffix span and consumed by a more-specific `.hub-suffix.logo-styles` rule, so the lower-specificity normal suffix rule does not override it even though it appears later.
- Only MinionLogo opts into `logoSuffixStyles`. Ordinary shell wordmarks retain the exact normal suffix rule: canonical primary foreground and semibold600. No other wordmark consumer is switched to the logo variant.
- The mounted tests execute actual MinionLogo/HubWordmark components. They apply actual Svelte compiler-emitted component CSS and actual Tailwind-emitted `font-black`, with narrowly documented happy-dom parser adaptations. They observe rendered descendants, computed color/weight, casing, reactive preset/org changes and icon-only behavior. They do not substitute a copied component or assert implementation-source substrings.
- The expected90-percent color expresses the preexisting public styling contract through an independent computed-color probe. A changed opacity, missing opt-in, wrong suffix weight or prefix-palette leak would differ from that probe or the explicit700/900 assertions. The ordinary-shell test separately keeps its600/primary assertions.

## Spec review

- The prefix still follows `getBranding()` and preserves custom capitalization. Personal logo preset secondary colors remain caller-owned, and their prefix weight remains900. The color/weight inheritance option is not repurposed to alter the default shell suffix.
- The new explicit logo suffix option restores the old MinionLogo contract: foreground at90percent and bold700. The casing/string remains fixed `hub`; accessible full identity is unchanged.
- Mark-only defaults and SVG preset markup are unchanged. There is no server, persistence, tenant-authority, message-signature or creation behavior change.

## Supplied runtime evidence inspected

The two exact Vitest result artifacts are `/tmp/white145-pr709-story-before-computed-vitest.json` and `/tmp/white145-pr709-story-after-computed-vitest.json`. Their `brandingComputed` metadata is distinct from the full Storybook-server browser captures and directly qualifies the previously failing Vitest path.

Before: primary/foreground/weight custom properties were empty; root/body backgrounds were transparent over the white page; both prefix and suffix were pink `rgb(232,84,122)`, weight400. Axe reports3.51:1 against white for the16px normal-weight text. With-text/compact/sizes had2/2/6 violating nodes respectively.

After: primary and foreground resolve `#fafafa`; semibold600, bold700 and black900 are present; root/body are `rgb(9,9,11)`. The prefix is personal pink at900; the suffix is the90-percent foreground mix at700. All five MinionLogo stories report zero axe violation nodes. The five Vitest tests themselves pass in both artifacts because the story configuration records axe findings for the separate ratchet to judge; zero axe nodes after the fix is the relevant accessibility evidence.

The first full story gate ended incompletely with exit143 and no report; it is not a product verdict, and this review does not attribute a cause or termination action. The consumer worker owns one warm-cache full-gate retry and the focused canonical-line recheck. The five clean targeted-story artifacts precede the final canonical alias substitution; the source recheck establishes its identical role/alpha semantics, not a new exact-source runtime result. Targeted stories do not prove the whole story ledger, page gate, full tests/build, hosted CI or deployment. No fresh runtime checks were run for this review.

## Reviewed working-file hashes

- `vitest.config.ts`: `0190177606c151d6b62b2659bdd5b3e637faaf125aed5769bbc15f3edfe3d6f5`
- `src/lib/components/layout/HubWordmark.svelte`: `9ec44cbc405f1ae58e83f85e6a23a46ddf11855300a489777cd0598731712132`
- `src/lib/components/layout/MinionLogo.svelte`: `57078131ad181259ba27acd3f5a508580755feca90c0add03d6f0d0481f32f9c`
- `src/lib/components/layout/MinionLogo.branding.mounted.test.ts`: `9882b80729c84806c123c35305ec3d594f79ea7c2f40fc00a4ced22c4e89067a`

Independent scoped `git diff --check` returned clean. Hashes describe the reviewed working files, not a final committed/pushed candidate. The HubWordmark hash above includes the canonical-token correction; the test hash is unchanged from the first review. No later pipeline head, CI result or deployment is implied.
