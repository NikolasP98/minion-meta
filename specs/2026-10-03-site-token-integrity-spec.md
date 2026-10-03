---
id: 2026-10-03-site-token-integrity-spec
title: Restore Site page measure and enforce installed design-token integrity
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion-meta, minion_site, minion_hub]
tags: [ui, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [SITE-004]
verdict: approved
---

# Site page measure and token gate

## 0. Product

Site at7f4c3b consumes `--page-max` in ten layout/section components, including Navbar.svelte:122 and Footer.svelte, while DESIGN.md:102 documents80rem. The installed design-token CSS/contract has no producer.

## AS-IS

The actual shared scanner reports ten undefined consumers (`site-token-integrity-locale.log`). Site package scripts and CI have no token-integrity gate. CI currently triggers only PR/push to master/main even though the canonical Site PR base is dev, so a new lint step alone would not guard normal development. Shared contract foundations.layout has no max-width token. No locale candidate adds these consumers.

## TO-BE

The canonical shared contract owns `--page-max:80rem` as an additive layout foundation. Generated CSS declares it in the common root, preserving all current theme variables. Site's ten existing consumers then receive the documented measure in Concourse night and day themes without adding local literals or changing semantic names. Hub inherits the additive token but no new use or altered layout.

The installed package supplies a reusable token-audit engine. Extract the existing Hub scanner's generic filesystem/consumer/declaration audit into a focused `@minion-stack/design-tokens/audit` export; keep Hub-specific legacy names, third-party/runtime exceptions and its existing CLI behavior in Hub's thin wrapper. Site's thin wrapper has no Hub component exceptions, resolves contract and generated CSS from its installed package, and runs against src/static. Production CI must not accept a sibling checkout or environment override as its contract source. CLI exits nonzero for unresolved consumers and invalid/missing installed artifacts. The generic shared declaration set comes strictly from the same installed package root's contract plus generated CSS. Do not seed presumed declarations such as the current Hub THEME_COLOR_TOKENS list. Wrapper exceptions must name a real component/runtime producer and a reason; they cannot stand in for a missing shared artifact token.

Publish-ready package contents include the engine and generated CSS/contract. Local qualification uses an exact new vendored tarball with recorded SHA256 in both independent repos; no npm publication is needed or authorized by this spec. Preserve every existing token, theme, alias, utility and package export. Before installation compare current Hub and Site packaged contracts with canonical meta source; reconcile any existing package-only definitions into canonical source rather than dropping them. The metadata version and Changeset describe the additive token/audit export.

## DELTA and verification

1. Add the single layout foundation and regenerate. Extract generic scanner into shared package with injectable exception policy, preserving Hub behavior and public test imports via reexports. Thin wrappers select an explicit repository root and the installed package artifacts.
2. Add Site lint:tokens and CI invocation after install; add dev to both pull_request and push branch triggers while preserving master/main release triggers. Assert from the actual workflow configuration that a dev-target PR runs lint:tokens and lint:design; run existing design-lint as well without treating baseline debt as newly introduced. Keep report and gate outputs deterministic and bounded.
3. Qualify shared generation/contract tests; existing Hub scanner behavior tests must remain effective. Add only meaningful scanner cases for installed-artifact resolution and missing producer; removing the token from both installed contract and CSS must make the actual Site CLI fail on the ten real consumers, then restoration must pass. Repeat the missing-producer mutation for one formerly synthetic theme token in an actual Site consumer; removing it from both installed contract and CSS must also fail, proving no implicit THEME_COLOR_TOKENS allowlist rescues it.
4. Browser Harness renders actual Site Navbar/sections at supported desktop width and390px in both themes. Assert computed page max-width1280px, document overflow absent, and capture screenshots with viewport/theme/source provenance. The before screenshot uses frozen existing artifact with missing producer, never a fabricated draft.
5. Run Site check, installed package/import smoke, focused locale tests/build and Hub design/token gates; rerun Hub check only if extraction typing changes require it. Parent independent review checks cross-package exports, exception scope, artifact pins and CI actually invokes the new gate.

## Out of scope

No release, production edit, auth behavior or unrelated redesign is part of this correction.
