---
phase: 11-agent-lifecycle
plan: "07"
date: 2026-09-09
status: scoped_runtime_floor_qualified_adoption_open
plan_sha256: 8055b67ae3dac4e739a8d1d57893a6683f44ca236ab1c9e56ab6021aa88aec73
requirements_completed: []
key-files:
  modified:
    - packages/shared/src/gateway/shells.ts
    - packages/shells-bridge/package.json
  created:
    - packages/shared/src/gateway/shells-outcome.test.ts
    - packages/shells-bridge/src/run-journal.ts
    - packages/shells-bridge/src/run-journal.test.ts
---

# 11-07 Shells journal foundation

The additive contract and unwired SQLite adapter are implemented and frozen for independent review. Contract tests pass, and actual native transactions plus the emitted private module pass on local Node22.23.2 and Node22.23.1. The observation-order correction has five reproduced red cases and passing expanded tests. Exact Node22.13.0 qualification remains unavailable. Task3 is partial; AGT-04, sender/receiver integration and the phase remain open.

## Implemented boundary

The canonical shared module adds optional invocation keys and durable capability version, a separate gateway-internal admitted envelope, normalized admission/terminal/receipt/observation records, and query/result contracts. Runtime helpers reject unsupported versions, unknown authority fields, malformed Unicode, invalid identifiers/digests/numbers and encoded byte overflow. Terminal normalization preserves `final | aborted | error`, excludes opaque usage/results, fixes the ordered digest projection and keeps cancellation observations separate. Existing invoke/final/registration types remain compatible. The pure normalizer validates digest syntax; Node owners recompute its content hash.

The admitted envelope is a TypeScript transport contract. Its complete input parsing, authenticated caller-key scoping and semantic input digest are receiver14-12 responsibilities, with a source TODO. The journal stores admission metadata, not the input body. Bounded `errorMessage` is caller-supplied public-safe text; length validation does not redact secrets or classify ACP errors.

`RunJournal` exposes admission, inspection, finite observations, immutable terminal/outbox commit, pending delivery, exact receipt acknowledgment and close. It uses native `DatabaseSync`, parameterized statements and `BEGIN IMMEDIATE`/COMMIT/ROLLBACK. A terminal commit releases the active slot and inserts its delivery obligation in one transaction. A duplicate event constraint failure rolls back the preceding terminal update. Exact invocation/terminal/ACK replay works at full capacity; changed identity/content fails. A cancellation ACK or uncertainty observation does not release the slot. Repeated observations occupy two bounded fields, not an append-only history. An observed cancellation ACK remains recorded despite earlier timestamps or later requests/unconfirmed observations; it still does not prove termination. Same-time metadata uses serialized replacement; older metadata is suppressed unless doing so would lose the first ACK fact.

The dedicated store has application ID `0x4D534A31`, schema version1, exact table/index/constraint definitions and one shell identity. It checks the complete `sqlite_schema`, including unexpected triggers/views/indexes and deliberate autoindexes, before writable setup and inside later transactions. Metadata persists version1 capacity policy, normalized guard limits and shell identity. Reopening with another policy fails. Each admission reserves its terminal byte bound; tombstones count toward capacity and are never pruned. Oversized terminal input leaves its unresolved obligation intact.

Existing private parent directories and regular private files are required. Linked parents/main/sidecars and orphan sidecars are rejected before main-file creation. Foreign/corrupt stores are refused without relabeling. This assumes a trusted directory and process; pathname inspection does not defeat arbitrary same-UID replacement races. Logical row/payload bounds are not filesystem quotas.

The adapter selects WAL/FULL and verifies its effective settings. Its local contention wait is100ms; production admission/outage tuning remains part of unwired sender configuration. Native loading uses `createRequire(import.meta.url)('node:sqlite')` with the builtin declaration type because installed Vite5's builtin table cannot resolve the static import. There is no dependency, fallback store or hidden experimental flag.

The only manifest change from the captured dirty before-image is `engines.node: >=22.0.0 → >=22.13.0`; structural comparison confirmed every other field identical. Bridge, ACP, config, entrypoint, receiver, installed package source/declarations and active dist outputs were not edited. Test cache output was not fully isolated in the initial setup; see the exception below.

## Evidence and corrections

| Check | Actual result |
| --- | --- |
| Canonical shared contract fixture | 21/21 pass; final logged run327ms total. |
| Native journal plus emitted-module fixture, Node22.23.2 | 33/33 pass with corrected private-cache runner; final run1.49s total,917ms tests. |
| Same fixture, pinned-source local Node22.23.1 | 33/33 pass with corrected private-cache runner; final run1.41s total,883ms tests. |
| Isolated full shared and bridge TypeScript emit/check | Exit0 using owning `tsc` builds; bridge consumes freshly emitted shared declarations. |
| Scoped shared/bridge oxlint | Exit0. |
| Scoped diff whitespace check | Exit0. |
| Exact Node22.13.0, unsupported distribution, package archive/image, actual sender/receiver | Not executed; no corresponding acceptance claim. |

The33 journal tests comprise32 native adapter cases and one raw-Node emitted-module subprocess. Each runtime lane imports the emitted private `dist/run-journal.js`, creates a test-only database, admits/commits, closes/reopens, ACKs, closes/reopens again and checks the retained terminal/tombstone. It never imports the active CLI entrypoint. No SQL mocking, provider/model calls, application config, normal environment file, external database, product server, process termination or fault injection was used.

Observed failures were preserved as evidence rather than counted as successful qualification:

1. Initial contract run:5 failures because the new helpers did not exist;14 rejection cases also passed for that structural reason. This is structural red evidence only. Implemented helpers subsequently passed all19 original cases, then the expanded21.
2. First native collection failed before tests because Vite5 resolved `node:sqlite` as nonexistent `sqlite`. Native `createRequire` corrected the tooling boundary without replacing SQLite.
3. First actual native run:20 pass/1 fail. Rejecting a linked WAL path had already created an empty main file. Creation now follows inspection of every path, and orphan sidecars are rejected. Expanded path fixtures pass.
4. A targeted one-byte identifier fixture failed with `INVALID_SHELL_OUTCOME`: constructor validation used longer sample identifiers. One-byte samples now respect every positive identifier limit, and the full suite passes.
5. One attempted copy used the isolated cwd as if it were the source root, then selected zero matching tests (28 skipped). Corrected the source path and obtained the actual targeted failure in item4. The skipped invocation is not acceptance evidence.
6. Independent reviewer `/root/docs_history_review` found both temporary `node_modules/.vite` entries were symlinks into active package caches. The setup linked installed directory entries too broadly. The review observed active `results.json` writes at15:23:51/15:23:55; earlier author runs used the same links. Thus those executions do not prove output isolation, although source/declaration resolution and native assertions remain observed. Under root admission, the reviewer replaced only the two verified temporary symlinks with private0700 directories, preserving active target files. `.vite-temp` was absent. Corrected runs explicitly selected private Vite/test caches, `envDir:false`, loopback host and disabled dependency optimization:21 contract tests passed in0.336s,29 native/current in1.49s and29 native/pinned-local in1.44s. The reviewer reports unchanged active cache result hashes/mtimes through those corrected runs. An initial receipt-only API failure after21 passing tests (`ctx.vite` unavailable after runner closure) was corrected by asserting effective configuration through `configResolved`; it was not hidden as a clean initial qualification. Exact corrected reproduction is supplied in the independent verification receipt.
7. Post-freeze self-review found that `observe()` incorrectly treated a same-millisecond change from `cancel_requested` to `cancel_acknowledged` as conflicting identity. Timestamp is not an observation ID. Root admitted the correction in PLAN8055b67a:33 native cases reproduced five failures/28 passes for timestamp equality, earlier ACK and later request/unconfirmed downgrade. The corrected adapter retains an observed ACK, uses serialized replacement for same-time metadata and preserves terminal/slot invariants. All33 pass under both runtimes with the corrected private-cache runner. No schema or API expansion was needed.

The constraint fixture asserts the exact `UNIQUE constraint failed: deliveries.event_id` error after the earlier terminal write. A second actual connection sees neither a terminal nor released capacity after rollback, and a corrected event can subsequently commit. Another native connection holds `BEGIN IMMEDIATE`, proving admission refuses contention until rollback. These prove transaction/statement-failure behavior; they do not simulate a failed COMMIT, process loss, power loss or RPO.

## Reproduction and isolated mapping

Temporary root: `/tmp/minion-360-11-07-pnb34eem`.

Copied shared/bridge source excludes `.env*`, `.git`, `node_modules`, `dist`, `build`, `data` and build-info files. Installed tool/runtime dependencies are linked into package-local `node_modules`; the bridge's shared link targets the copied shared package. The initial dependency-link loop improperly also linked `.vite`; do not reuse that loop. The reviewer corrected those two entries to private0700 directories before the final observation runs. Actual `import.meta.resolve('@minion-stack/shared')` returns `file:///tmp/minion-360-11-07-pnb34eem/shared/dist/index.js`. All five owned source/manifest files were byte-compared to their copied counterparts after the final build.

Build from the meta root, in this order:

```bash
env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 node packages/shared/node_modules/typescript/bin/tsc -p /tmp/minion-360-11-07-pnb34eem/shared/tsconfig.json
env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 node packages/shells-bridge/node_modules/typescript/bin/tsc -p /tmp/minion-360-11-07-pnb34eem/shells-bridge/tsconfig.json
```

From the isolated bridge package, use the reviewed in-memory configuration below. For the contract fixture run from isolated shared and change the final argument to `src/gateway/shells-outcome.test.ts`. For the pinned-local lane replace `/usr/bin/node` with `/home/nikolas/.local/share/mise/installs/node/22.23.1/bin/node`.

```bash
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-360-11-07-pnb34eem LANG=C.UTF-8 /usr/bin/node --input-type=module -e "
import { startVitest } from 'vitest/node';
import { resolve } from 'node:path';
const cacheDir = resolve('node_modules/.vite');
const ctx = await startVitest('test', [process.argv[1]], {
  watch: false, maxWorkers: 1, minWorkers: 1, passWithNoTests: false
}, {
  envDir: false, cacheDir, server: { host: '127.0.0.1' },
  plugins: [{ name: 'verify-private-cache', configResolved(c) {
    if (c.cacheDir !== cacheDir) throw Error('cache escaped');
    console.log(JSON.stringify({ effectiveViteCache: c.cacheDir }));
  }}],
  test: { deps: { optimizer: { ssr: { enabled: false }, web: { enabled: false } } } }
});
if (!ctx) throw Error('no runner');
console.log(JSON.stringify({ effectiveTestCache: ctx.config.cache }));
" src/run-journal.test.ts
```

The emitted subprocess receives only `LANG=C.UTF-8` and uses its parent runtime's actual executable, no NODE_OPTIONS or experimental flags. Earlier logs remain at `contracts-final.log`, `native-current-final.log`, `native-pinned-local-final.log`; their output-isolation limitation is retained above. The corrected final observation runs print/assert private effective cache locations. Active cache SHA/mtime stayed equal to the reviewer's baseline after the author red/green runs: shared `923c6fc2ce25a4a6da23404d8c07555160d9bff616ac61547fe1c5a8fce06730` /1788985431782574128ns; bridge `d79addb225fe008b0d43e66a32620ab31fc3699bc7c30b7e65bde1390f848254` /1788985435440646929ns.

| Final receipt under the temporary root | SHA-256 |
| --- | --- |
| `observation-red.log` (five failures) | `4f5ce69ccfb624d61d58a9e6a31638fb24c5de78813467a368fe65cb0e14ce45` |
| `observation-green-current.log` (33 pass) | `3b0c0d494f667975963ede6699972f84fd5d3c4040f184e3305c28739a518b20` |
| `observation-green-pinned-local.log` (33 pass) | `e9bbc4f3333fed32832a80fb8aa8f225e091839d13933c23260a68d6ec9d861d` |
| `artifact-manifest-after-observations.json` | `b13a0214ec78b212de6df3b1151b3b9e2d4538c66df0e9063440276bdb2cb8ca` |

The earlier `artifact-manifest.json` remains unchanged at SHA-256 `89ac55ece7bdfe085442946ea7157b5d4a112ab14a24a35e5c0dbed638e2f593`; it describes the pre-observation-correction candidate. No publish archive or image was created.

## Frozen identities

| Source | SHA-256 |
| --- | --- |
| `packages/shared/src/gateway/shells.ts` | `bc1c4ea5cb4c63bec21c1f1c13058e0e474e0485a1a3331139a25965ed601f80` |
| `packages/shared/src/gateway/shells-outcome.test.ts` | `e7eab3917d9277b2fc94932a01a93e6ceeeb7790d79c11c5e482281e65a9fc62` |
| `packages/shells-bridge/src/run-journal.ts` | `f8b7a8f02fe0e96d27bdaa693b4eb23e90b610ea5637afcf542f31455ae4f6c8` |
| `packages/shells-bridge/src/run-journal.test.ts` | `6c12d4fa7c9074cc0d5af9f2a3b5ac97b22cd7eef559c92220e97aa53e71bf70` |
| `packages/shells-bridge/package.json` | `44147587821a3c7054c8663919385e77aa6d3e1fd36cda27d1945509b01f710e` |

Before-images: shared shells source `40cad5e97be00713f590092aabfc46c46e522dee747b20e890fd749983c872b1`; bridge manifest `63cf520c4051fe62881fc2cd1b36089b2b53691d2918850b0dc40a3d2b9b0ad9` (also captured at `before/bridge-package.json`). Three new test/adapter files were absent. Existing immutable14-11 artifacts remain earlier snapshots.

| Emitted file/runtime | SHA-256 |
| --- | --- |
| Isolated shared `dist/gateway/shells.js` | `3f5c5a7861c5d3298eaf9166acf7830c04082ca8597621b55d499a815b2122db` |
| Isolated shared `dist/gateway/shells.d.ts` | `82140419eee5f8e6fc3626ee07e3be32dcc0eccde258f773ec04895efa49d81a` |
| Isolated bridge `dist/run-journal.js` | `c9b35d3f6b2e7463f85acf06cb2c475f8e29d90812ddfb638bd106604befe32e` |
| Isolated bridge `dist/run-journal.d.ts` | `04fb300c3909ed9c5ca617838415ea54bb14dd2eae9624e6bee72dbf421676a7` |
| `/usr/bin/node`, actual v22.23.2 | `45b7e2ad792e6968e3f69c85864d19d29f010b39c55b33e0b0c27e2f22d8ddda` |
| Local mise Node22.23.1 binary | `93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068` |

## Handoff and remaining gates

Independent reviewer `/root/docs_history_review` rechecked the corrected observation policy and all195 source/emitted manifest entries, then ran33/33 native cases on Node22.23.2 (1.43s) and Node22.23.1 (1.44s) with unchanged active cache hashes/mtimes. Its frozen `11-07-VERIFICATION.md` SHA-256 is `7753207c14807fee5611409c4f01b090c107dbc6941f45b71f143e07927e3099`. The cancellation finding is resolved; minimum-runtime and integration/release boundaries below remain open.

Exact source TODOs point to `proposals/2026-09-08-platform-qc-remediation.md`:

- Shared `shells.ts:35`: complete input envelope validation, authenticated invocation scoping and semantic input digest, receiver14-12. The canonical contract does not update the gateway's separate shim.
- Journal `run-journal.ts:58`: private configured path, lifetime process ownership/generation, startup uncertainty and sender wiring. Current bridge timeout rejection still maps to a legacy error and releases its in-memory slot; this adapter does not fix that path.
- Journal `run-journal.ts:198`: authenticated committed ACK on the actual current sender socket. Local identity comparison proves no remote authority, delivery or UI receipt.
- Test `run-journal.test.ts:120`: failed-COMMIT and process/power-loss qualification remains unverified. No fault-injection claim is made from statement rollback.
- Test `run-journal.test.ts:215`: exact minimum/unsupported runtime qualification, package/image and release acceptance remain pending.

Send these entries to root for its paired proposal ledger. No global proposal, roadmap, requirement, state or other plan was edited. Independent verification is separate from this implementer's evidence. **Standards:** source ownership and native engine reuse were preserved, with no new dependency or active dist mutation; initial test cache isolation failed and requires the documented correction. **Spec:** Tasks1/2 candidate behavior is tested; Task3 has current/pinned-local evidence only. No sender/receiver or phase closure.


## 2026-09-12 resumed qualification

Task3 is now qualified at the exact supported floor. Meta PR400 merged to dev6103e982508ec3cdc18488eb4f855474ef52c907 after hosted run34714453995 executed216 shared/bridge cases without skips on official Node22.13.0 / SQLite3.47.2. The emitted journal was imported, committed, reopened and ACKed without experimental flags. The same emitted smoke passed on Node22.23.1 / SQLite3.51.3. Official Node20.18.0 separately rejected node:sqlite with ERR_UNKNOWN_BUILTIN_MODULE and created no journal or fallback files. A deliberate skipped-test trial was rejected by the qualification guard.

Hosted source81067d5a1a8a11d6d0b46d6d5e7ea273b20851a8 differs from final dev only in unrelated rankings/index.json; qualification sources and lockfile match. Official image digest: sha256:87608ec5109795be954baa2f5b0b6da1911423d8b44b58fecda31f81d28bfc0f.

The source floor task is complete. This does not publish the current sender generation, qualify the workstation image, prove power-loss durability, or activate the gateway durable mode. Earlier TODOs about minimum runtime are satisfied by this evidence; their package/image and deployment limits remain open.
