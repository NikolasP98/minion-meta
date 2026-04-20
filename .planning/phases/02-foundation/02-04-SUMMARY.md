---
plan: 02-04
phase: 02-foundation
status: complete
requirements: [FOUND-05]
completed_at: 2026-04-20
published: "@minion-stack/lint-config@0.1.0"
---

# Plan 02-04 Summary: @minion-stack/lint-config@0.1.0

## Published

- Name: `@minion-stack/lint-config`
- Version: `0.1.0`
- Tarball: `minion-stack-lint-config-0.1.0.tgz` (5 files)
- Registry: `HEAD /@minion-stack/lint-config/-/lint-config-0.1.0.tgz` → 200 ✓

## Files shipped

- `oxlint-preset.json` — oxlint preset (plugins: import, typescript, unicorn; correctness: error, typescript/no-explicit-any: error, eqeqeq: error)
- `eslint.config.js` — flat ESM ESLint config (js.configs.recommended + typescript-eslint.configs.recommended + overrides)
- `prettier.config.js` — CJS Prettier (100-col, 2-space, single-quote, trailing comma all, LF line endings)
- `README.md` — consumer patterns for all 3 entrypoints + peer-dep matrix
- `package.json` — 0.1.0, public, MIT, type: module, `exports` mapping for all 3 configs

## Peer deps strategy

All 5 peer deps marked **optional**:
- `eslint >= 9`, `@eslint/js`, `typescript-eslint >= 8` — for flat ESLint consumers (hub, site, plugins)
- `oxlint >= 0.15` — for oxlint consumers (minion, paperclip-minion)
- `prettier >= 3` — universal

Rationale: a consumer only uses one linter at a time. Non-optional peers would force every consumer to install both `oxlint` AND `eslint`. Optional peers let each subproject pick.

## Release commit

`10da2ae` — `feat(02-04): release @minion-stack/lint-config@0.1.0`

## Lessons captured

- `pnpm exec changeset version` DIDN'T auto-generate `CHANGELOG.md` this run (unlike 02-03). Wrote it manually to match the format changesets would have produced. Root cause unknown — possibly related to the earlier 02-03 `private: true` → `false` transition leaving some state; or changesets bug. Either way, manual CHANGELOG write is a safe fallback.
- Version bump this time: 0.0.0 → 0.1.0 (clean single bump). Applying lesson from 02-03 (don't pre-bump manually) worked.

## Self-Check
PASSED — FOUND-05 satisfied. Package published with all three entrypoints + optional peer deps; release commit pushed.
