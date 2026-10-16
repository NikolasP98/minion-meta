# Feature 013 — release and deployment receipts

Merge order B → A → C/D (each rebased on the previous master). All PRs opened as drafts by their streams; the coordinator ran the strict lint, token lint and stream tests after each rebase and relied on hosted CI for `check`/`build` while local RAM was shared with another session (local `check` on B: 0 errors).

| Stream | PR | Merge commit | CI | Production |
|---|---|---|---|---|
| B normalisation (items 3, 8) | [#548](https://github.com/NikolasP98/minion_hub/pull/548) | `8f2322033d940ec925b5535c9be8b2e6423a6bf2` 2026-10-16 ~23:28Z | 13/13 incl. the new `--strict-global` gate | GitHub Production deployment `8f232203` 23:31:59Z success; Vercel `dpl_71EsAchbfZurf3ZWTswdpQGBznei` Ready 18:29 Lima; `/es/login` 200 |
| A baseline + density (1, 2) | [#547](https://github.com/NikolasP98/minion_hub/pull/547) | `c091f1f6fd3206f0788ec1ff6b71956f27988059` 2026-10-16 ~23:40Z | 13/13 after rebase | GitHub Production `c091f1f6` 23:42:27Z success; Vercel `dpl_DNBwnyLz9aa25oh6H1NGT2paU4pJ` Ready 18:39 Lima; `/en/login` + `/es/login` 200; served `runtime.*.css` contains `--active-control-min-height` consumer, `data-dense` and the coarse-pointer media rule |
| D states + content (5, 9) | [#546](https://github.com/NikolasP98/minion_hub/pull/546) | pending | 13/13 before rebase | — |
| C archetypes, placement, collapse (4, 6, 7) | [#549](https://github.com/NikolasP98/minion_hub/pull/549) | pending | running | — |

Rebase notes: D's two pilot pages conflicted with B's codemod; resolved by keeping D's structure, re-running `scripts/codemods/icon-sizes.mjs` and restoring B's `--control-height-xs` replacements (strict lint caught the +2 over ceiling before push).
