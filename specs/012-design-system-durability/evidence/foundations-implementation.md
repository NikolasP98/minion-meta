# Foundations implementation receipt

Scope: T004/T005/T007/T021 source changes; no commits, package promotion, browser or deployment claimed by this receipt.

## Changes

- Contract1.1.0 declares the full270 normal-text combinations. Twelve foreground values across nine light themes were darkened only enough to meet4.5:1 while retaining primary→secondary→tertiary luminance ordering. Minimum resulting pair is rose-pine-dawn tertiary/surface3=4.509999060367829. Accent/status assertions retained. Original gruvbox-light tertiary fixture demonstrates a failing raised-surface pair remains detectable.
- Shared utility stable hooks make coarse-pointer targets intrinsic: Button/IconButton/Toggle minimum44×44; Input/Select minimum44height; Checkbox/Radio native associated labels minimum44×44. Textarea already has minimum64height and is unchanged. Fine-pointer rules are unchanged. Toggle separates interactive target from unchanged visual track/thumbnail sizing.
- Generated inventory.json records contract/utility digests, actual themes, token/alias/accent counts and typography roles. Generate/check:generated keeps it current. Token manifest exposes ./inventory.json and packs it; version untouched for root release owner.
- Token/UI documentation and canonical governance now describe generated inventory, actual theme selectors, implemented utilities, shared typography ownership, stable decorations, target behavior, maturity and compatible API deprecation.
- Site lint retains global9/7/0 caps and adds per-file git baseline enforcement, including untracked CSS/Svelte. Missing baseline fails closed. CI passes actual PR/push baseline with first-push fallback. Selftest assertions now throw.

## Files owned by this worker

Meta: packages/design-tokens/{contract.json,contract.schema.json,package.json,tokens.css,utilities.css,inventory.json,README.md}; packages/design-tokens/scripts/{contract.mjs,generate-inventory.mjs}; packages/design-tokens/tests/{contract.test.mjs,inventory.test.mjs}; packages/ui/src/lib/{Checkbox.svelte,Radio.svelte,Toggle.svelte,control-targets.test.ts}; packages/ui/README.md; .claude/skills/ui-design-governance/SKILL.md.

Site: scripts/design-lint.mjs, scripts/design-lint.test.mjs, .github/workflows/ci.yml.

Shared FormField changes present in the tree belong to outcome worker. Hub styles/lint, archive scripts, consumer manifests/locks and release receipts belong to root.

## Executed checks

- pnpm --filter @minion-stack/design-tokens generate: PASS.
- pnpm --filter @minion-stack/design-tokens build: PASS,15 tests including full matrix, hierarchy, original failing pair, generated inventory/CSS.
- pnpm --filter @minion-stack/ui test: PASS,29tests at execution (includes3new native label/switch structural assertions). Source SSR evidence only.
- pnpm --filter @minion-stack/ui typecheck: PASS,0errors/0warnings.
- pnpm --filter @minion-stack/ui build: PASS.
- Site node --test scripts/design-lint.test.mjs scripts/token-integrity.test.mjs: PASS9tests including debt transfer, untracked CSS, missing base, actual installed token declaration-removal mutations.
- Site bun run lint:design: PASS9hex/7arbitrary/0z, per-file origin/dev present.
- Site bun run lint:tokens: PASS0violations against existing readiness.2 archive; rerun after new package integration.
- Site prettier check for changed scripts/workflow: PASS.
- git diff --check in both repositories: PASS.
- Meta pnpm exec prettier unavailable (not installed); no dependency added. Meta has no prettier gate. Product type/build/tests above passed.

## Integration checks owned by root

New packer includes inventory.json; historical readiness packer currently has a fixed old member allowlist and must not produce new bytes under old version. Hub previously omitted utilities.css import; root adds it. Site already imports it.

Installed fixture needs pointer coarse/fine and actual measured targets for enabled/disabled/busy variants; validate Toggle track remains20/24/28high while target grows44, native label clicks toggle once, Toggle click and Space toggle once, disabled controls inert. Verify typography and normal-text colors through actual consumer theme adapter. Confirm narrow layouts remain reachable after intrinsic targets. No standalone source test substitutes for these browser checks.

Standards review: uses existing semantic variables and stable hooks; no new dependency; no speculative wrapper; API behavior preserved. Spec review: source portions covered, rendered/installed/deployed acceptance remains assigned integration work, not claimed complete here.

## Coarse-target follow-up

Coordinator browser measurement found a short Radio label was37.17×44. Added minimum44width to both associated native-label hooks and regenerated inventory. Token build rerun passed15tests. A fresh content-derived archive qualification follows this correction; the previous archive is superseded for integration. Coordinator owns repeated actual browser measurements.
