# 12-03 package archive identity and consumer matrix

Evidence for DEP-03 Tasks 1–2. All commands run from a private worktree
(`~/.cache/claude-tmp/meta-12-03`, detached from `origin/dev`); nothing here
touched the live checkout. Every registry lookup below is a read (`npm
view`/`npm pack` of an already-published version) — no publish, no
install beyond the frozen `pnpm-lock.yaml`, no peer fetched from a registry
(peers are copied from this checkout's own already-resolved
`node_modules`, and `--legacy-peer-deps` stops npm's own automatic peer
fetch during the consumer-matrix installs).

## Task 1 — archive manifest (`scripts/qc/package-provenance.mjs`)

Real manifest for the three owned packages, packed with each package's own
tooling (`pnpm pack`, which runs whatever `prepack`/`build` script that
package declares):

| Package | Version | SHA-256 (local build) | Members | Shipped LICENSE/NOTICE file | Source revision |
|---|---|---|---|---:|---|
| `@minion-stack/shared` | 0.9.0 | `b312012e6e2d2863f119f2dd819958e29343c54ba20e8981d258cf1294cb5700` | 44 | **no** | `900a988f` |
| `@minion-stack/crm-sdk` | 0.1.0 | `982f82c2ae3219b01b715822e379d0199efe29bba4398abf3a98cd37246d858d` | 13 | **no** | `ce9b2a43` |
| `@minion-stack/design-tokens` | 0.1.0 | `7a6ea296fa432f40fdc6095386b92df538dcf891dc40b712b50fa02f65a02c9b` | 6 | **no** | `fd1878d8` |

None of the three ships a `LICENSE`/`NOTICE` archive member. All three
declare `"license": "MIT"` in `package.json` metadata only — see
`12-LICENSE-DECISION.md`.

### Real "same version, different bytes" conflicts found (not synthetic)

`npm view` reads against the live registry (read-only; recorded here, no
publish):

- **`@minion-stack/shared@0.9.0`** is published on npm with shasum
  `1cc1f259180b39c2eff2273721b8b3ff9e2439ae`, **93 files**, 158060 bytes
  unpacked. The current checkout at the *same declared version* `0.9.0`
  packs to shasum `128b14e7221722d579e433007a15616e371ffb54`, **44 files**,
  115868 bytes unpacked — the clean production-only emission from the
  already-merged 12-08 work (`scripts/build.mjs`, no maps, no
  `*.test.js`). Registry versions up to `0.11.0` already exist; the local
  `package.json` still reads `0.9.0`. **Real conflict**: two structurally
  different archives currently share the version string `0.9.0`.
- **`@minion-stack/design-tokens@0.1.0`** is published with shasum
  `8e5060dcba42abba1c60bbe6c2473a8029009249`, only **4 files** — it is
  missing `contract.json` and `contract.schema.json` entirely, and its
  `tokens.css` is 116 lines vs. the current source's 1017 lines. The
  current checkout's `package.json` `files` array already includes
  `contract.json`/`contract.schema.json`; the published `0.1.0` predates
  that. **Real conflict**: `0.1.0` on the registry and `0.1.0` in source
  are materially different archives (registry also has an unrelated
  `0.2.0` already published).
- **`@minion-stack/crm-sdk@0.1.0`** returns npm `404` — it was **never
  published**. Only `0.1.1` exists on the registry. No same-version
  conflict; this package is simply unpublished at its current local
  version (a real gap, not a byte mismatch).

`assertNoVersionDigestConflict()` in `package-provenance.mjs` is the
mechanical rejection for this class of problem; `package-provenance.test.mjs`
proves it throws on a mismatched digest and accepts a matching one. It was
not wired to auto-fetch the registry digest in the CLI (that would be a
network call on every run) — the registry comparisons above were done by
hand with `npm view <pkg>@<version> dist.shasum` for this evidence pass,
exactly as the plan's "no paid provider calls by default" / "record every
fetch" boundary requires.

### Packaging-integrity gap found and fixed (owned file: `packages/crm-sdk/package.json`)

`packages/shared` has a `prepack` script (`node scripts/build.mjs`, from the
already-merged 12-08 work) that validates and clears stale build state.
`packages/crm-sdk` had **no `prepack` script at all** — only `build` and
`prepublishOnly` (both plain `tsc`, which `pnpm pack` never runs). Reproduced
directly:

1. `rm -rf dist && pnpm pack` → tarball contains **only `package.json`** (no
   `dist/`, since nothing ran to build it).
2. Adding `"prepack": "tsc"` and repeating with a **stale
   `tsconfig.tsbuildinfo` left on disk** still produced an empty archive —
   `tsc` trusted the buildinfo's record of a previous successful build and
   skipped emitting, even though `dist/` had just been deleted.
3. Fix applied: `"prepack": "rm -rf dist tsconfig.tsbuildinfo && tsc"`.
   Reproduced clean (all 12 dist members present) with the stale-buildinfo
   scenario repeated after the fix.

This is the exact "remaining packages get exact gap tasks if their archive
fails" case the plan anticipates for Task 1 — fixed at the owned file, not
worked around in the provenance script.

## Task 2 — consumer matrix (`scripts/qc/package-consumer-matrix.mjs`)

Read-first evidence (grep against the live checkouts, not assumed):
`minion_hub/package.json` and `minion_site/package.json` both declare
`@minion-stack/shared` (semver `^0.9.0`), `@minion-stack/crm-sdk` (pinned
local tarball) and `@minion-stack/design-tokens` (pinned local tarball) as
real dependencies, and both import from `crm-sdk` in `src/`
(`minion_hub/src/server/services/party.service.ts`,
`minion_hub/src/routes/api/crm/dni-lookup/+server.ts`;
`minion_site/src/routes/api/leads/+server.ts`). `paperclip-minion/package.json`
declares none of the three — it is not part of this matrix.

| Package → consumer | Mode | Result |
|---|---|---|
| shared → hub | real (packed, npm-installed, tsc + node import) | PASS |
| shared → site | real | PASS |
| crm-sdk → hub (+ postgres peer copied from disk) | real | PASS |
| crm-sdk → site (+ postgres peer copied from disk) | real | PASS |
| design-tokens → hub (JSON contract import) | real | PASS |
| crm-sdk → hub, **postgres peer withheld** | real | **correctly blocked**: `Cannot find package 'postgres' imported from .../@minion-stack/crm-sdk/dist/client.js` |

Same six combinations pass again in `--fixture-only` mode (checked-in
synthetic consumer manifests under `scripts/qc/fixtures/consumer-matrix/`,
zero packing/installing/network) — this is what the plan's verify command
runs and what CI should run.

### A real finding, not an assumption: crm-sdk's shipped `.d.ts` doesn't leak its peer

`tsc --noEmit` type-checking a consumer that imports `createCrmClient`
**succeeds even without the `postgres` peer installed** — the compiled
`dist/client.d.ts` types `CrmClientOptions.databaseUrl` as `string`, never
referencing a `postgres`-derived type. The peer requirement only surfaces at
module-**evaluation** time (`client.js`'s top-level `import postgres from
'postgres'`). The matrix therefore runs a real `node --input-type=module -e
"import '<specifier>'"` step after the type-check for every combination —
type-checking alone would have silently reported the missing-peer case as
"resolved."

### npm's automatic peer install would have masked the negative case

The first working version of the missing-peer check silently passed:
`npm install <tarball>` (npm 12.0.2 here) auto-installs a package's peer
dependencies from the registry by default (`added 2 packages` for a package
declaring exactly one peer). `--legacy-peer-deps` was required on the
`npm install` calls to stop that — both to keep the negative case honest and
to avoid an unwanted network fetch on every real-mode matrix run. Peers the
*supported* combinations need are instead copied from this checkout's own
already-resolved `node_modules` (`packages/crm-sdk/node_modules/postgres`),
never fetched fresh.
