# Phase 04 — fold-minion-shared: Verification Document

**Verified:** 2026-04-21
**Phase:** 04-fold-minion-shared
**Plans executed:** 04-01, 04-02, 04-03, 04-04

---

## Requirement Status

### SHARE-01: git subtree import — N/A

**Status:** N/A — `git subtree add` was not applicable.

**Rationale:** `minion-shared/` had no separate git history. It existed as a plain directory
gitignored from the meta-repo root — never a git submodule, never a standalone git repo with
its own `.git/`. There was no git history to import. Source migration was performed via direct
directory copy (`packages/shared/src/` mirrors `minion-shared/src/` verbatim, with one
strict-mode type-narrowing fix documented in 04-01-SUMMARY.md). Preserving git history via
`git subtree add` is only meaningful when a subdirectory has its own independent commit history;
this directory did not.

**Source preservation:** All source is intact in `packages/shared/src/` and live on npm at
`@minion-stack/shared@0.1.0`.

---

### SHARE-02: Publish @minion-stack/shared — Complete

**Status:** Complete — `@minion-stack/shared@0.1.0` published to npm.

**Verification:**
```
$ npm view @minion-stack/shared version
0.1.0
```

- Published under the `@minion-stack` npm org scope (public)
- Three export paths: `.` (root), `./gateway`, `./utils`
- Identical API surface to the original `minion-shared@0.1.0`
- Committed in plan 04-01 (commit `d1b93a1`); published at plan 04-02 human-action checkpoint

---

### SHARE-03: Deprecation shim — Complete

**Status:** Complete — `minion-shared@0.2.0` published as a deprecation shim with `npm deprecate` applied.

**Verification:**
```
$ npm view minion-shared version
0.2.0
```

- Shim re-exports from `@minion-stack/shared` on all three export paths
- Runtime `console.warn` fires on first `import 'minion-shared'`
- `npm deprecate` applied at the registry level — deprecation notice shown on any
  `npm install minion-shared` invocation regardless of version pin
- Committed in plan 04-02 (commit `848c3c4`)

---

### SHARE-04: Consumer migration — Complete (PR open)

**Status:** Complete — `minion_site` PR open; `minion_hub` and `paperclip-minion` confirmed non-consumers.

**PR:** https://github.com/NikolasP98/minion-site/pull/3
**Title:** feat: migrate from minion-shared to @minion-stack/shared
**Branch:** `feat/migrate-to-minion-stack-shared` → `master`

**Migration scope:**
- `minion_site/package.json` — Removed `"minion-shared": "^0.1.0"`, added `"@minion-stack/shared": "^0.1.0"`
- `minion_site/src/lib/components/members/ChatTab.svelte` — import updated
- `minion_site/src/lib/state/member.svelte.ts` — import updated
- `minion_site/src/lib/services/member-gateway.svelte.ts` — import updated

**Non-consumer confirmation:**
- `minion_hub`: Zero `minion-shared` imports in `minion_hub/src/` (confirmed by grep during 04-03 planning)
- `paperclip-minion`: Zero `minion-shared` imports in `paperclip-minion/` (confirmed by grep during 04-03 planning)

**Type-check:** `bun run check` on the migrated branch exits with 0 errors, 1 pre-existing a11y warning.

---

### SHARE-05: Archive GitHub repo — N/A

**Status:** N/A — `minion-shared` had no separate GitHub repository.

**Rationale:** The original `minion-shared` package was published to npm directly from the
`minion-shared/` directory inside this meta-repo. It was never a standalone GitHub repository
with its own remote. There is no GitHub repo to archive. Repository archiving only applies
when a package has a dedicated GitHub repo; in this case the source was always local and
gitignored. No archive action is possible or required.

---

## Phase Success Criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| SC1 | `packages/shared` contains full minion-shared source | Pass | Direct copy used (SHARE-01 subtree N/A) |
| SC2 | `@minion-stack/shared` published and importable | Pass | `npm view @minion-stack/shared version` → `0.1.0` |
| SC3 | Old `minion-shared` deprecated with notice | Pass | `npm view minion-shared version` → `0.2.0`, `npm deprecate` applied |
| SC4 | Consumers migrated | Pass | minion_site PR #3 open; hub + paperclip confirmed non-consumers |
| SC5 | Old minion-shared GitHub repo archived | N/A | No GitHub repo existed — npm-only package |

**Phase 04 overall: COMPLETE** (SC1–SC4 pass; SC5 N/A with documented rationale)

---

## Deferred Items

None.

---

## Final State

- `minion-shared/` directory: **deleted from filesystem** (2026-04-21)
- `.gitignore`: **`minion-shared/` entry removed** (commit `3f661b8`)
- `packages/shared/`: **live workspace package** (`@minion-stack/shared@0.1.0`)
- npm registry: **`@minion-stack/shared@0.1.0`** — canonical; **`minion-shared@0.2.0`** — deprecated shim
- minion_site PR: **#3 open**, 0 type errors, ready for merge
