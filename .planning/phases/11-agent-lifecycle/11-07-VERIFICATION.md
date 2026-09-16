---
phase: 11-agent-lifecycle
plan: "07"
reviewed: 2026-09-09
status: scoped_source_native_verified_runtime_adoption_partial
plan_sha256: 8055b67ae3dac4e739a8d1d57893a6683f44ca236ab1c9e56ab6021aa88aec73
initial_plan_sha256: 4b80154be48b94b75d3c1a8bc770b15b0e3c220810ea2733b022836b37b5c585
requirements_completed: []
---

# 11-07 independent implementation verification

The corrected SQLite foundation is independently verified for its admitted source/native scope:21 unchanged contract tests pass, and33 native cases pass on each available runtime. The cancellation-order defect J1 is fixed and reverified at the final hashes below. The cache-isolation defect J2 has a verified private-output correction; earlier active cache writes remain recorded. Exact minimum-runtime, release and sender/receiver integration remain open. The initial review below is preserved historical evidence; the final amendment disposition supersedes its pending J1 statements.

## Initial frozen review findings

| ID | Evidence and trigger | Impact and smallest correction |
| --- | --- | --- |
| J1 — required semantic correction | `packages/shells-bridge/src/run-journal.ts:159–163` chooses the single cancellation column and rejects any different observation with equal `at`. `cancel_requested` followed by `cancel_acknowledged` in the same millisecond therefore throws CONFLICT. The author independently raised this during review; source inspection confirms it. The current test at `run-journal.test.ts:67` enshrines equality conflict for changed uncertainty text but does not exercise same-tick cancellation progression. | A legitimate acknowledgment cannot replace the retained request observation, although timestamps are not declared unique observation identities. Select serialized same-time replacement, or explicit cancellation transition ordering, without adding unbounded history. Preserve strictly older observation handling and terminal immutability. Require actual native same-tick requested→acknowledged and repeated/older/terminal tests before accepting changed source. No new fixture was written or executed for this finding; it follows directly from the inspected branch. |
| J2 — corrected test-output isolation | Both `/tmp/minion-360-11-07-pnb34eem/{shared,shells-bridge}/node_modules/.vite` entries originally linked into corresponding active package cache directories. Independent existing-command runs wrote active `vitest/results.json` at local15:23:51/15:23:55. | Previous runs cannot be called fully isolated. Under root admission, only the two verified temporary symlink entries were unlinked and replaced with0700 private directories. Active targets were retained. Corrected native-runner cache overrides and before/after active-cache hashes/mtime establish isolated cache output for the final runs below. Do not reuse the broad dependency-entry linking loop. |

## Source and invariant review

| Boundary | Inspected implementation and concrete evidence | Qualification |
| --- | --- | --- |
| Additive contract | `shared/src/gateway/shells.ts:17–73` separates admitted identity, observed terminal, receipt and cancellation/uncertainty. Legacy final remains `final | aborted | error` at line609; legacy opaque usage is not silently copied into the durable record. Optional capability and invocation key preserve absence. | Existing type fixtures and runtime normalizers pass; complete admitted input envelope validation and caller authority remain receiver14-12 ownership. |
| Input normalization/digest | `shells.ts:89–181` rejects unknown/symbol/accessor fields, nonplain objects, malformed UTF-16, invalid numeric values and UTF-8 byte overflow. The fixed ordered digest array includes shell/run/session/invocation/input/event/state/duration/optional terminal text; the journal recomputes SHA-256 at `run-journal.ts:171`. Negative zero is normalized; Unicode normalization is not performed. | Changed content with an old digest is rejected before SQL mutation. No Node builtin entered the browser-safe canonical normalizer. Length bounds do not certify secret redaction. |
| Complete schema/foreign refusal | `run-journal.ts:17–32,76–111` compares the complete sqlite_schema object list and SQL definitions, including expected autoindexes, constraints and unwanted triggers/views/indexes. Nonempty preflight opens read-only. A new transaction rechecks headers/schema/persisted policy before writes. | Seven actual altered-schema/header fixtures preserve main-file bytes, and an already-open handle rejects an added trigger before insertion. Corrupt and foreign stores are not relabeled. This is dedicated-schema refusal, not a migration engine or arbitrary same-UID tamper guarantee. |
| Transaction/result boundary | `run-journal.ts:114–122` starts BEGIN IMMEDIATE, revalidates, runs the action, COMMITs, then returns. Outcome update and outbox insert share that transaction at lines182–184. | The actual duplicate-event constraint failure occurs after the outcome update; another real handle sees no terminal or released slot after rollback. A corrected event can then commit. No failed-COMMIT/driver/process/power-loss claim follows from statement rollback. |
| Capacity and replay | `run-journal.ts:140–148` checks exact run/invocation replay before maxRuns, counts retained terminal rows, enforces one unresolved slot and stores reserved_bytes on admission. Persisted metadata includes shell, limits and capacity policy. | Exact admission/terminal/ACK replay works at full capacity; a distinct run is refused. Oversized terminal retains its obligation, while an exactly bounded terminal commits. Limits remain test-selected logical bounds, not disk quota or operational capacity tuning. |
| Immutable terminal and ACK | `run-journal.ts:175–184,194–205` compares bound invocation/session/input, refuses changed normalized terminal, binds ACK by shell/event/run/digest and preserves exact receipt replay. No ACK exists for an uncommitted admission. | Reopen preserves pending terminal, ACK and tombstone. ACK mismatch/conflicting receipt does not remove pending state. Remote authentication, receiver COMMIT and current socket ownership remain intentionally absent. |
| Finite observations | `run-journal.ts:23,153–165` keeps only uncertainty and cancellation columns; a terminal blocks later observation mutation. |100 repeated updates retain one row and bounded fields; cancellation ACK/uncertainty do not release the slot. J1 still blocks correct same-tick cancellation progression. |
| Path boundary | `run-journal.ts:212–237` requires canonical absolute paths, existing private owned parent, no linked ancestor, private owned single-link regular main/sidecars, and no orphan WAL/SHM before main creation. | Actual symlink/orphan/permissive-parent fixtures pass. File creation uses exclusive mode0600. Trusted same-UID process/directory assumption is explicit; pathname checks are not race-free capabilities against that principal. |
| Engine/package boundary | Native builtin only; SQL busy_timeout avoids later constructor timeout API. Runtime WAL/FULL/foreign-key values are checked on the adapter's connection at lines95–96. Package before-image comparison shows only node engine narrowing changed. | Actual22.23.2 and local22.23.1 native execution pass. Exact22.13.0, unsupported runtime, released archive and image remain unverified. Journal is a private emitted module; active CLI entrypoint is not imported. |

The existing native suite uses real temporary SQLite databases, parameterized APIs, native second connections and graceful close/reopen. No SQL implementation is mocked. The raw emitted smoke computes the expected digest from a fixed literal projection and performs admission, terminal, reopen, ACK and another reopen against `dist/run-journal.js`. No source import alias substitutes for the emitted shared dependency. `bridge.ts` and `index.ts` do not import RunJournal or advertise the new capability; this review does not certify durable sender behavior.

## Independent execution and cache correction

Initial independent existing CLI runs:21 contract tests passed in0.327s,29 native tests passed on22.23.2 in1.49s, and29 passed on22.23.1 in1.46s. Source assertions remain observed, but these runs used the inherited active-cache links. The reviewer launched the existing commands before the parallel cache inspection returned; the resulting cache mutation is explicitly acknowledged.

Before correction, link targets were exactly:

- `/home/nikolas/Documents/CODE/MINION/packages/shared/node_modules/.vite`
- `/home/nikolas/Documents/CODE/MINION/packages/shells-bridge/node_modules/.vite`

Root admitted unlinking only those two symlink entries inside the temporary copy. They became actual0700 directories. No active target was deleted, cleaned or restored. Neither temporary node_modules contained `.vite-temp`; shared's copied Vitest config declared no cacheDir and bridge had no config. The corrected native runner explicitly supplies its absolute private cacheDir, envDir:false, loopback host and disabled optimizer; cache checks remain enabled.

Final corrected execution used installed `vitest/node` startVitest with each exact fixture and `{watch:false,maxWorkers:1,minWorkers:1,passWithNoTests:false}`. The Vite override was:

```js
{
  envDir: false,
  cacheDir: resolve('node_modules/.vite'),
  server: { host: '127.0.0.1' },
  plugins: [{
    name: 'verify-private-cache',
    configResolved(config) {
      if (config.cacheDir !== cacheDir) throw Error('cache escaped');
      console.log(JSON.stringify({ effectiveViteCache: config.cacheDir }));
    }
  }],
  test: { deps: { optimizer: { ssr: { enabled: false }, web: { enabled: false } } } }
}
```

The in-memory override did not create a source/config file. The runner printed effective test-cache directories as each private cacheDir plus `/vitest`. startVitest performs its normal close after the run. An initial receipt-printing attempt accessed nonexistent `ctx.vite` after21 passing tests and exited1; that was a runner-receipt failure, not successful qualification. The corrected configResolved assertion and `ctx.config.cache` output replaced it.

| Final corrected lane | CWD beneath temporary root | Result |
| --- | --- | --- |
| `/usr/bin/node`, contract fixture `src/gateway/shells-outcome.test.ts` | `shared` |21/21 pass,0 skipped, exit0,0.336s |
| `/usr/bin/node`, native fixture `src/run-journal.test.ts` | `shells-bridge` |29/29 pass,0 skipped, exit0,1.49s |
| `/home/nikolas/.local/share/mise/installs/node/22.23.1/bin/node`, same native fixture | `shells-bridge` |29/29 pass,0 skipped, exit0,1.44s |

Each subprocess received only PATH=/usr/bin:/bin, HOME=/tmp/minion-360-11-07-pnb34eem and LANG=C.UTF-8, with a60-second watchdog. Raw emitted subprocess receives LANG only and uses its parent executable without experimental flags. Experimental SQLite warnings were visible. No browser, app server, download, provider or production database was used; no driver/process fault injection was executed. This review did not run network tracing and does not assert zero operating-system network syscalls.

The active cache results retained these hashes and mtimes throughout the corrected runs:

| Active cache results | SHA-256 | mtime_ns |
| --- | --- | --- |
| shared | `923c6fc2ce25a4a6da23404d8c07555160d9bff616ac61547fe1c5a8fce06730` |1788985431782574128 |
| shells-bridge | `d79addb225fe008b0d43e66a32620ab31fc3699bc7c30b7e65bde1390f848254` |1788985435440646929 |

## Frozen identity

Five source/manifest files matched both the author's freeze and the copied candidate before execution, and retained these hashes afterward:

| Root-relative file | SHA-256 |
| --- | --- |
| `packages/shared/src/gateway/shells.ts` | `bc1c4ea5cb4c63bec21c1f1c13058e0e474e0485a1a3331139a25965ed601f80` |
| `packages/shared/src/gateway/shells-outcome.test.ts` | `e7eab3917d9277b2fc94932a01a93e6ceeeb7790d79c11c5e482281e65a9fc62` |
| `packages/shells-bridge/src/run-journal.ts` | `58391e419fc4888276e585a70879514b21cccd0fa6f53fa6931ad4ada1ced278` |
| `packages/shells-bridge/src/run-journal.test.ts` | `0eeb96426739fae5ed9df8724f32ec5b6b1ff0eaeb1443eebee6fdba48cdd679` |
| `packages/shells-bridge/package.json` | `44147587821a3c7054c8663919385e77aa6d3e1fd36cda27d1945509b01f710e` |

`artifact-manifest.json` SHA `89ac55ece7bdfe085442946ea7157b5d4a112ab14a24a35e5c0dbed638e2f593` independently matches all155 listed shared and40 bridge copied/emitted files. This is an emitted-file manifest, not a publish archive or a declaration that the earlier14-11 package contains this new contract.

| Artifact/runtime | SHA-256 |
| --- | --- |
| Isolated shared `dist/gateway/shells.js` | `3f5c5a7861c5d3298eaf9166acf7830c04082ca8597621b55d499a815b2122db` |
| Isolated shared `dist/gateway/shells.d.ts` | `82140419eee5f8e6fc3626ee07e3be32dcc0eccde258f773ec04895efa49d81a` |
| Isolated bridge `dist/run-journal.js` | `e89605a6578a15e06c7f19044dee17d463007781475e776fc57d1425bef5c486` |
| Isolated bridge `dist/run-journal.d.ts` | `04fb300c3909ed9c5ca617838415ea54bb14dd2eae9624e6bee72dbf421676a7` |
| `/usr/bin/node`,22.23.2 | `45b7e2ad792e6968e3f69c85864d19d29f010b39c55b33e0b0c27e2f22d8ddda` |
| mise Node22.23.1 | `93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068` |

## Disposition

**Standards:** reviewed source scope and existing dirty manifest preserved; initial cache-output isolation failed, and the narrowly admitted correction has passing private-cache evidence. No source, global plan, production data or dependency package bytes were edited by this reviewer. Authored only this report, plus root-authorized replacement of the two temporary cache links and normal test-created files.

**Spec:** conditional foundation progress; J1 needs a narrow source/test amendment before clean acceptance. Existing tests do not detect that missing cancellation transition. Exact minimum-runtime and unsupported-runtime evidence, actual COMMIT failure, process/power loss, operational capacity policy, authenticated receiver/current sender, semantic invocation authority, package/archive/image adoption and AGT-04 remain open. Sender and receiver admission belongs to root; this report does not admit either integration.


## Final cancellation correction and independent re-verification

Root selected PLAN SHA `8055b67ae3dac4e739a8d1d57893a6683f44ca236ab1c9e56ab6021aa88aec73`. The author reopened only `run-journal.ts` and its existing native fixture, then refroze both. This reviewer changed neither source file. Shared contracts, schema/API and the package manifest remained at their original reviewed hashes.

J1 is resolved by the concrete ordering in `run-journal.ts:163–168`: an observed cancellation ACK prevents later requested/unconfirmed observations from overwriting it; a first ACK bypasses timestamp suppression even when its timestamp is earlier; older metadata is otherwise suppressed; identical observations return idempotently; equal-time different metadata uses the transaction's serialized update order. The outcome guard at line158 still stops all post-terminal observation mutation. Uncertainty uses its separate column, so cancellation precedence does not block independent uncertainty updates. Neither acknowledgment nor metadata replacement changes outcome or releases the unresolved slot.

The author preserved meaningful native RED evidence at `observation-red.log`, SHA `4f5ce69ccfb624d61d58a9e6a31638fb24c5de78813467a368fe65cb0e14ce45`:5 failed/28 passed against the previous implementation. I read the actual failures, including same-time conflict, earlier ACK suppression and later requested/unconfirmed erasure. This is author-executed RED inspected independently; I did not recreate older source or rerun that failed version.

Independent final native runs used the exact corrected startVitest private-cache recipe above and all33 existing cases. Node22.23.2 passed33/33 in1.43s; local22.23.1 passed33/33 in1.44s; both exit0 with zero skips. The unchanged shared fixture was not redundantly rerun. New tests exercise same-time and earlier-time requested→ACK transitions, later requested/unconfirmed rejection, equal-time ACK metadata replacement and older ACK metadata suppression, while retaining finite representation, busy reservation and immutable terminal assertions. Both native suites also execute the actual emitted private module smoke.

All active-cache results hashes and mtimes remain exactly the earlier corrected-lane values. Effective Vite/test cache paths were again asserted/printed private. Source/candidate byte equality and all195 listed copied/emitted files in `artifact-manifest-after-observations.json` were independently checked; zero mismatches. The original artifact manifest remains historical and was not relabeled.

| Final changed artifact | SHA-256 |
| --- | --- |
| `packages/shells-bridge/src/run-journal.ts` | `f8b7a8f02fe0e96d27bdaa693b4eb23e90b610ea5637afcf542f31455ae4f6c8` |
| `packages/shells-bridge/src/run-journal.test.ts` | `6c12d4fa7c9074cc0d5af9f2a3b5ac97b22cd7eef559c92220e97aa53e71bf70` |
| Isolated `shells-bridge/dist/run-journal.js` | `c9b35d3f6b2e7463f85acf06cb2c475f8e29d90812ddfb638bd106604befe32e` |
| Isolated `shells-bridge/dist/run-journal.d.ts` (unchanged) | `04fb300c3909ed9c5ca617838415ea54bb14dd2eae9624e6bee72dbf421676a7` |
| `artifact-manifest-after-observations.json` | `b13a0214ec78b212de6df3b1151b3b9e2d4538c66df0e9063440276bdb2cb8ca` |

Final **Standards** disposition: scoped source ownership and native SQLite reuse pass; prior cache-output isolation exception is retained, with an independently verified correction. Final **Spec** disposition: Tasks1/2 source and current/pinned-local native foundation pass at the final frozen identities; no remaining blocking defect was found in that bounded review. Task3 remains partial. No actual failed-COMMIT, process/power loss, exact22.13.0/unsupported distribution, archive/image, authenticated receiver/current sender, semantic input admission, production capacity policy or AGT-04 completion is claimed. Root owns subsequent integration/adoption admission.
