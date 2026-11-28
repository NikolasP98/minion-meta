---
id: 2026-11-23-storybook-vitest-css-producer-parity
title: Process real theme CSS in Storybook tests and requalify the baseline
status: approved
created: 2026-11-23
updated: 2026-11-27
repos: [minion_hub]
tags: [ui]
---

# Process real theme CSS in Storybook tests and requalify the baseline

## AS-IS

During approved Hub spec145 delivery, PR709 at45aead23 failed three MinionLogo contrast rows. The app and full Storybook host use Tailwind processing, while the Vitest Storybook project in `minion_hub/vitest.config.ts` does not. The exact Vitest lane shows empty canonical color/weight variables from unprocessed `@theme`, transparent root/body, and pink400text at16px on a white backdrop. Proper app/Storybook rendering shows the expected theme colors and typography. A source and runtime comparison is retained in [the correction evidence](../specs/145-hub-white-label/implementation/storybook-ci-correction/).

A scoped experiment adds the already installed Tailwind plugin only to the Storybook Vitest project. All five MinionLogo stories then have zero axe violations, but a complete measurement reports1,211stories,0unmeasured,1,119violations against the799-count ledger:260regression rows (251color-contrast,9scrollable-region-focusable) and81improvements. These are measurement results under a changed CSS producer, not proof that spec145 introduced260application regressions. The first incomplete143/no-report attempt is excluded from passing or failing product evidence; the completed warm run is authoritative for the experiment.

The global producer/baseline migration is outside the organization-naming change. Spec145 restores original logo color ownership and suffix presentation without changing this lane's producer or increasing its ledger. Its explicit test-host limitation remains documented.

## TO-BE

The Storybook test browser processes the same installed theme CSS and utilities as the application. Baseline counts are qualified against that real rendering contract, with every current story measured. CI fails when tokens or utility processing disappear. Existing application failures, fixture defects and measurement changes are distinguished before any baseline policy decision.

## DELTA

1. Add Tailwind processing to the Storybook Vitest project; keep ordinary unit/native projects unchanged.
2. Reproduce the experiment against a pinned current-master source as well as the feature candidate, preserving full axe node details and computed tokens, typography and backdrop values.
3. Audit the260rows by source/fixture/measurement cause. Repair actual issues or obtain explicit approval for a documented baseline migration; do not silently raise the existing ledger or suppress whole stories.
4. Add an executable browser-host guard for real canonical variables and representative utility styles. Removing the producer must fail that guard; a source-string assertion is insufficient.
5. Run the full story gate with0unmeasured, reconcile the approved ledger, and retain source hashes, before/after runtime evidence and CI receipts.

Source handoff: the Storybook project plugins in `minion_hub/vitest.config.ts`. This proposal belongs with the existing accessibility program's test-infrastructure work. It does not authorize resuming the separate paused Hub/Gateway readiness audit.

## Outcome (2026-11-27)

Implemented in hub #759 after the owner's answer "Yes, fix the gate first": Tailwind in the Storybook Vitest project, a browser-host guard story, and the story baseline re-measured once (749 → 1091; details in the accessibility program's ledger, item 26). DELTA 3's row-by-row audit was not done as a separate step: the largest group, the raw accent as text on dark themes (`#2563eb`, 3.2–3.84:1), is fixed by spec 153's second PR, and the rest stays in the baseline as debt that may only fall.
