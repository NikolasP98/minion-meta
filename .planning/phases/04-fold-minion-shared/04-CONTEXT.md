# Phase 4: Fold minion-shared - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Move the `minion-shared/` source into `packages/shared/` within the meta-repo workspace, publish it as `@minion-stack/shared` on npm, update the single consumer (`minion_site`) to import from the new package name, and publish a deprecation shim under the old `minion-shared` name. The old `minion-shared/` directory is removed from the gitignore and deleted once the workspace package is in place.

**Key discovery:** `minion-shared/` has NO separate git history — it's a plain directory gitignored from the meta-repo. The ROADMAP's `git subtree add` requirement does NOT apply. Source migration is a straightforward directory copy + package rename.

**Scope substitution applies:** All requirements referencing `@minion/shared` use `@minion-stack/shared` (locked in Phase 02, plan 02-02).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Key facts to drive decisions:

- `minion-shared/` package: name=`minion-shared`, version=`0.1.0`, exports `.`, `./gateway`, `./utils`, built with `tsc`
- Already published: `minion-shared@0.1.0` is on npm (Proprietary license)
- Only consumer: `minion_site` imports `"minion-shared": "^0.1.0"` from npm
- `minion_hub`: does NOT import minion-shared
- `paperclip-minion`: does NOT import minion-shared
- Target package name: `@minion-stack/shared` (per scope substitution decision)
- Target location: `packages/shared/` inside meta-repo workspace
- Build tool: keep `tsc` (same as current); add to `pnpm-workspace.yaml` packages list
- Changesets: add a changeset for `@minion-stack/shared@0.1.0`
- Deprecation shim: publish `minion-shared@0.2.0` that re-exports from `@minion-stack/shared` with deprecation notice
- SHARE-01 (git subtree): N/A — no separate git repo exists; note this in VERIFICATION
- SHARE-05 (archive old GitHub repo): N/A — no separate GitHub repo; note in VERIFICATION

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/` directory already exists with `cli/`, `env/`, `tsconfig/`, `lint-config/` — `packages/shared/` slots in the same pattern
- `pnpm-workspace.yaml` already declares `packages/*` — `packages/shared` is auto-included
- `@minion-stack/tsconfig` already used for other packages — `packages/shared/tsconfig.json` can extend `@minion-stack/tsconfig/library`

### Established Patterns
- Package structure: `src/`, `dist/`, `package.json` with `exports`, `files: ["dist"]`, `scripts: { build: "tsc", prepublishOnly: "tsc" }`
- Changesets: `.changeset/` directory exists; add `.md` file per package release
- npm publish: `npm publish --access public` (requires 2FA — user action checkpoint)

### Integration Points
- `minion_site/package.json`: change `"minion-shared": "^0.1.0"` → `"@minion-stack/shared": "^0.1.0"`
- `minion_site/src/`: update any import paths from `"minion-shared"` / `"minion-shared/gateway"` / `"minion-shared/utils"` to `"@minion-stack/shared"` etc.
- Meta-repo `.gitignore`: remove `minion-shared/` entry after migration complete
- `packages/shared/package.json`: bump to `0.1.0` to match existing minion-shared version

</code_context>

<specifics>
## Specific Ideas

- Deprecation shim: `minion-shared@0.2.0` re-exports everything from `@minion-stack/shared` with a `console.warn` deprecation notice — keeps any future consumers unblocked while nudging migration
- Keep `minion-shared/` directory in place until `@minion-stack/shared` is published and `minion_site` PR is open — then delete and remove gitignore entry in the same commit

</specifics>

<deferred>
## Deferred Ideas

- `minion_hub` WS client extraction to `@minion-stack/shared` — that's Phase 7 scope (WS Consolidation), not Phase 4
- `@minion-stack/shared` v2 with additional gateway types — Phase 7 will expand the shared package; Phase 4 is a 1:1 migration

</deferred>
