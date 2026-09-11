---
phase: 12-dependency-provenance
plan: "03"
status: complete
requirements_completed: []
---

# 12-03 archive identity and shipped licenses — SUMMARY

Executed in a private worktree (`git worktree add --detach
~/.cache/claude-tmp/meta-12-03 origin/dev`, branch
`feat/dep-provenance-12-03`), base `8be40586`. No branch/worktree/stash
outside this dedicated one was touched; nothing in the live checkout was
edited.

`requirements_completed: []` per the plan's own closure policy: this plan
delivers the admission-gate evidence and tooling DEP-03 calls for, but
final closure additionally needs the owner's license decision (Option A/B/C
in `12-LICENSE-DECISION.md`) and any downstream adoption gate — root's call,
not this plan's.

## Both tasks: full evidence, both verify commands pass as specified

**Task 1** — `node --test scripts/qc/package-provenance.test.mjs`: 15/15
pass (11 in this file, plus the 4 `package-consumer-matrix.test.mjs` files
imported transitively when run together — see combined run below; run
alone it's 11/11).

**Task 2** — `node --test scripts/qc/package-consumer-matrix.test.mjs &&
node scripts/qc/package-consumer-matrix.mjs --fixture-only`: 4/4 tests pass,
then all 6 fixture combinations pass (5 supported + 1 unsupported correctly
blocked), combined exit 0.

## Real findings (not synthetic fixtures)

1. **`@minion-stack/shared@0.9.0`**: the version currently in
   `packages/shared/package.json` is already published on npm — but the
   published archive (93 members, shasum `1cc1f259...`) and what this
   source tree now packs at the same version (44 members, shasum
   `b312012e...`, the already-merged 12-08 clean emission) are completely
   different archives sharing one version string. Registry already has
   `0.11.0`; local `package.json` was never bumped past `0.9.0`.
2. **`@minion-stack/design-tokens@0.1.0`**: published archive has only 4
   members (missing `contract.json`/`contract.schema.json` entirely, 116-line
   `tokens.css`); current source at the same `0.1.0` packs 6 members with a
   1017-line `tokens.css`. Same version, materially different content.
3. **`@minion-stack/crm-sdk@0.1.0`**: never published (npm 404); only
   `0.1.1` exists on the registry. No conflict, just unpublished — recorded,
   not treated as a defect.
4. **Packaging-integrity bug, fixed** (owned file
   `packages/crm-sdk/package.json`): the package had no `prepack` script at
   all, so `pnpm pack` shipped an archive containing only `package.json` —
   no `dist/`. Compounding bug found during the fix: even after adding
   `"prepack": "tsc"`, a **stale `tsconfig.tsbuildinfo`** left on disk from
   an earlier build made `tsc` believe `dist/` (just deleted) was already
   up to date, so it still emitted nothing. Fixed as `"prepack": "rm -rf
   dist tsconfig.tsbuildinfo && tsc"`; reproduced clean with the stale-state
   scenario repeated after the fix.
5. **crm-sdk's shipped `.d.ts` does not leak its `postgres` peer's types**:
   `tsc --noEmit` on a consumer importing `createCrmClient` passes even with
   `postgres` absent — `CrmClientOptions.databaseUrl` is typed `string`, not
   a `postgres`-derived type. The peer only bites at module-evaluation time
   (`client.js`'s top-level `import postgres from 'postgres'`). The matrix
   therefore runs a real `node --input-type=module -e "import '<spec>'"`
   step after typecheck for every combination, not typecheck alone.
6. **npm auto-installs peers over the network by default** (npm 12.0.2):
   the first working version of the "missing peer" negative case silently
   passed because `npm install <tarball>` fetched `postgres` from the
   registry on its own (`added 2 packages` for one declared peer).
   `--legacy-peer-deps` on the install calls fixed this — needed both to
   keep the negative case honest and to avoid an unwanted network install on
   every real-mode run. Peers the *supported* combinations need are copied
   from this checkout's own already-resolved `node_modules` instead of
   fetched.

Full detail, tables, and exact commands: `12-PACKAGE-MATRIX.md`.

## License

No `LICENSE`/`NOTICE` file exists anywhere in the repo (root or any
package); all three owned packages declare `"license": "MIT"` in metadata
only, and `hasShippedLicenseFile: false` for all three in the real packed
archive. Two of the three (`shared`, `design-tokens`) are **already
published publicly** under that unbacked MIT metadata claim. Options laid
out for the owner in `12-LICENSE-DECISION.md` — **no LICENSE file was
created by this work**, per the plan's explicit instruction that legal
attribution is the owner's call.

## Owned files (this plan)

| File | Status |
|---|---|
| `scripts/qc/package-provenance.mjs` | new |
| `scripts/qc/package-provenance.test.mjs` | new |
| `scripts/qc/package-consumer-matrix.mjs` | new |
| `scripts/qc/package-consumer-matrix.test.mjs` | new |
| `scripts/qc/fixtures/consumer-matrix/*/package.json` (6 files) | new — not in the plan's listed `files_modified`, but required for the plan's own `--fixture-only` verify command to have something to resolve against; see Deviations. |
| `packages/crm-sdk/package.json` | modified — `prepack` script added (see finding 4) |
| `packages/shared/package.json` | untouched — no change needed once the version/digest conflict is fixed by a version bump, which is the owner's call, not this plan's |
| `packages/design-tokens/package.json` | untouched — same |
| `.planning/phases/12-dependency-provenance/12-PACKAGE-MATRIX.md` | new |

Also delivered, outside the plan's `files_modified` list but required by
AGENTS.md's open-items ledger convention for the 12-02 Task 2 blocker (see
that plan's own summary):

| File | Status |
|---|---|
| `proposals/2026-09-10-hub-paraglide-adapter-migration-followup.md` | new |
| `proposals/index.json` | regenerated via `node scripts/proposal-index.mjs` after adding the proposal above |

## Before/after hashes (owned/modified files only; new files have no "before")

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `packages/crm-sdk/package.json` | `0bf4688890461327492288081605f73f542e95a90239e42ad83b7459dec2fc5c` | `4bd5ef63f2e824c28d19c1b433e30e11a7f2daf11b95080423f40c3e93ffd724` |
| `proposals/index.json` | `8ecdfcd6e0b34ab26884e9a56103bbbea4d0e5c48952dfc9704e6494f90c7bf3` | `2161dec59bf778a95b71237e376d44105731c49b92d624f0d859b270c0a9e59c` |

Base commit: `8be40586a58f2b94dd0fbd954273de150d4cda3c` (`origin/dev`).

## Commands run (exact, real)

```
pnpm install --frozen-lockfile                     # meta workspace, unchanged lockfile
cd packages/shared && pnpm pack --pack-destination <tmp> --json
cd packages/crm-sdk && pnpm pack ...                # repeated pre/post the prepack fix
cd packages/design-tokens && pnpm pack ...
npm view @minion-stack/shared versions --json
npm view @minion-stack/shared license
npm view @minion-stack/shared@0.9.0 dist.shasum dist.integrity dist.unpackedSize
npm view @minion-stack/crm-sdk versions --json / license / @0.1.0 dist.shasum  (404)
npm view @minion-stack/design-tokens versions --json / license / @0.1.0 dist.shasum
npm pack @minion-stack/shared@0.9.0 / @minion-stack/design-tokens@0.1.0       # registry archives, for diff only
node --test scripts/qc/package-provenance.test.mjs
node --test scripts/qc/package-consumer-matrix.test.mjs
node scripts/qc/package-consumer-matrix.mjs --fixture-only
node scripts/qc/package-consumer-matrix.mjs           # real mode, extra confidence beyond the plan's required gate
node scripts/qc/package-provenance.mjs                # manifest dump used for the tables above
node scripts/proposal-index.mjs                       # regenerate proposals/index.json
```

Every registry read above is recorded here per the boundary requirement to
record every fetch; none of them is a publish or an install of anything not
already pinned by the frozen lockfile or this checkout's own resolved
`node_modules`.

## Deviations from the plan

1. **Added `scripts/qc/fixtures/consumer-matrix/*/package.json`** (6 tiny
   synthetic manifests), not in the plan's `files_modified` list. The
   plan's own Task 2 verify command is `node scripts/qc/package-consumer-matrix.mjs
   --fixture-only`; a fixture-only mode needs fixtures to run against, and
   without them the command cannot do anything (it would either be a no-op
   or would have to fabricate combinations inline, which is worse for
   review than small checked-in manifests). Low-risk, no functional/runtime
   code, same pattern as 12-01's "independently admitted Vitest include
   glob" precedent.
2. **`packages/crm-sdk/package.json`'s `prepack` script** — in the plan's
   owned-files list already (`packages/crm-sdk/package.json`), but the
   specific fix (adding `prepack` at all, then hardening it against stale
   `tsconfig.tsbuildinfo`) was discovered during Task 1's "pack each owned
   package" step, not pre-planned. This is exactly the plan's own language:
   "Remaining packages get exact gap tasks if their archive fails, not
   blanket metadata edits" — a targeted, minimal, reproduced-before-and-after
   fix to an owned file, not a blanket edit.
3. **`proposals/2026-09-10-hub-paraglide-adapter-migration-followup.md` +
   `proposals/index.json`** — not owned by this plan's `files_modified` at
   all (that's a 12-02 Task 2 open item). Delivered here because the
   proposal lives in this meta worktree (12-02's own worktree is
   `minion_hub`, a separate git repo with no `proposals/` directory) and
   AGENTS.md's open-items ledger convention requires the proposal to exist
   before either plan's work is considered finished, not deferred to a
   third session.
4. **Real (non-fixture) mode was also run and made to pass** for Task 2,
   beyond what the plan's verify command strictly requires
   (`--fixture-only` is the specified gate). Kept because it is what
   surfaced findings 5 and 6 above — the fixture-only logic alone would not
   have caught either the type-vs-runtime peer gap or npm's auto-peer-install
   network behavior.

## Open items (not closed by this plan; root/proposal-owned)

1. **License decision** — Option A/B/C in `12-LICENSE-DECISION.md`; no file
   created here.
2. **Version bump for `@minion-stack/shared`** — currently `0.9.0` locally
   while a structurally different `0.9.0` is already public; needs a real
   version bump + changeset before any future publish, not a code change
   this plan can make unilaterally (semver/release policy is root's call).
3. **Version bump for `@minion-stack/design-tokens`** — same shape; local
   `0.1.0` already diverges from published `0.1.0`.
4. **`@minion-stack/crm-sdk`** — never published; whether/when to publish
   is a release-policy decision, not evidenced here.
5. **`scripts/qc/package-provenance.mjs`'s CLI does not auto-fetch the
   registry digest for comparison** — the registry-vs-local comparisons in
   this SUMMARY and `12-PACKAGE-MATRIX.md` were done by hand
   (`npm view ... dist.shasum`) for this evidence pass, deliberately, to
   avoid a silent network call on every CI run of the provenance script.
   `assertNoVersionDigestConflict()` is exported and unit-tested so a future
   CI job that *does* want to make that comparison (with an explicit,
   reviewed opt-in network step) can call it directly. `TODO(handoff)`
   left inline in `scripts/qc/package-provenance.mjs`'s module header
   pointing at this note.
