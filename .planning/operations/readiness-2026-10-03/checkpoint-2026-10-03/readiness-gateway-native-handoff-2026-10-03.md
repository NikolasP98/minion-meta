# GW022A native config publication/recovery pause handoff

Date: 2026-10-03  
Gateway checkout: `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/gateway`  
Branch: `fix/readiness-gateway`  
HEAD: `0cdd31d4cc3102a1ec3c24eedb1630e75d0663a0`  
Owned scope: `packages/linux-fs-atomic/**`

## Pause state

- Work stopped on request. No new verification was started after the pause instruction.
- No files are staged. No commit, push, production import, release flag, or deployment was made.
- Owned WIP consists of 22 tracked modifications and 20 untracked files, all under the owned package.
- No live `cargo`, `rustc`, `vitest`, `tsc`, package build, or config-recovery child process remained at the checkpoint.
- The checkout also contains unrelated WIP outside the owned package. Do not clean, restore, stage, or include it.
- Ignored package build outputs remain in place. They are not part of the source inventory below.

## Approved contracts

- Main CAS/distribution contract: `spec-gw022a-config-cas-distribution.md`, SHA-256 `8ee807b3dc8127b8050fd6d3c095c1593a750bf0cd200b8d0d61992b6457b46f`.
- Main parent review: `gw022a-config-cas-distribution-parent-review-v4.md`, SHA-256 `1369be6ccb50aff563e7bdf97ffed270d1f4bf9c356233aebc943c48c6ecf69e`.
- Main independent review: `gw022a-config-cas-distribution-independent-review-v4.md`, SHA-256 `f271da4e461c4c6760596db18bf52bee3ee4daa384d0a415af004cabf25f5291`.
- Recovery factory amendment: `spec-gw022a-config-recovery-factory-amendment.md`, SHA-256 `b91ed032cd8f68fbb11a14206eaa045a98ebfdfffa5cf1de616ae696a627b120`.
- Recovery parent review: `gw022a-config-recovery-parent-review-v3.md`, SHA-256 `aacb20aba19d8eb4b1aabcf166e27c376f98e1a80994a55eee99a122d5bdf399`.
- Recovery independent review: `gw022a-config-recovery-independent-review-v3.md`, SHA-256 `dea4b1e6b61a77e3105d4c8edd1fa1f9a06cab73b65a33e5add67f8c9ab75865`.
- The recovery amendment was signed and verified in the meta repository at commit `794dfca6`. Later wrapper-heading edits were administrative only; the frozen amendment behavior did not change.

No contract blocker is known. Source acceptance remains blocked on the unfinished qualification listed below.

## Implemented source behavior

- Private config publication session and recovery facade; no public package export.
- Native initial/replacement tuple classification, exact stage plans, stable tuple digest, retained descriptor authority, resume, uncertain finalization, and cleanup ownership.
- Root -> selected ledger -> config lock order, with atomic lease-pair validation/move and recovery-only retention.
- Same-lock tuple revalidation before effects, fail-closed ambiguous classification, stable acknowledgement validation, and single-use factory/session guards.
- Typed operation outcome decoding, including config recovery/session/uncertain codes and exact native `ENTRY_CONFLICT` mapping.
- Recovery cleanup on JS wrapper construction failure and native factory rejection.
- Child-process crash/restart fixtures, drift fixtures, ledger lost-ack handoff proof, environment teardown proof, root close/sibling continuity proof, and a strengthened private-surface ratchet.

## Verified evidence on the current core source

The following results were observed in the package directory. These focused runs wrote to the terminal only; there is no separate persisted log file for them. The latest two factory-fault files and the final surface-ratchet edit were added afterward and are explicitly unverified below.

1. `pnpm exec tsc --noEmit && pnpm run build && pnpm exec vitest run --config vitest.config.ts src/config-recovery-crash.test.ts`
   - PASS: 16/16 actual-addon child crash/restart cases across initial/seed/config/backup and four barriers.
2. `pnpm exec vitest run --config vitest.config.ts src/config-recovery-invariants.test.ts`
   - PASS: 3/3 acknowledgement, tuple ambiguity/fresh-bypass, and JS wrapper-construction cleanup cases.
3. `pnpm exec vitest run --config vitest.config.ts src/config-recovery-drift.test.ts`
   - PASS: 7/7 same-size digest, inode/name, mode, group, link-count, marker, and root-path drift cases.
4. `pnpm exec vitest run --config vitest.config.ts src/env-teardown.test.ts`
   - PASS: 3/3, including real Worker N-API environment teardown with retained recovery leases and the existing stuck-syscall case.
5. `pnpm exec vitest run --config vitest.config.ts src/config-recovery-runtime.test.ts`
   - PASS: 8/8, including cached root/classifier close and sibling-root continuity.
6. `pnpm run build && pnpm exec vitest run --config vitest.config.ts src/config-recovery-ledger-handoff.test.ts`
   - PASS: 2/2 durable append plus cleanup uncertainty and lost append-ack reread without replay.
7. `pnpm exec vitest run --config vitest.config.ts src/config-recovery-wrapper.test.ts`
   - PASS: 1/1 injected cleanup uncertainty retains the known durable acknowledgement and poisons the FIFO.

Earlier accepted executor/substrate evidence remains under this base directory, including `gw022a-async-executor-qualification.log`, `gw022a-async-executor-corrections-test.log`, and `gw022a-corrective-parent-review-v2.json`. Those receipts predate and do not qualify the current recovery patch.

## Unverified current draft

- `scripts/config-recovery-factory-fault-child.mjs`
- `src/config-recovery-factory-fault.test.ts`

These files were just added and have not been formatted, typechecked, compiled, or executed. The test compiles an `LD_PRELOAD` shim intended to replace the backup inode during the second native `pread` of `config.scratch`, after classification and during retained-handle installation. It is intended to prove factory rejection releases both leases and descriptor capacity. Likely resume risks:

- Rust/glibc may call `pread64` rather than the intercepted `pread`; the shim may need both symbols.
- The intended occurrence may not coincide with the claimed two-descriptor boundary.
- The child intentionally uses an 8 MiB scratch file; confirm this is within the exact package limit.
- A returned handle or a differently typed rejection must fail the test; do not weaken the expected `ENTRY_CONFLICT` / `no-effect` result.

The final edit to `src/surface-ratchet.test.ts` also has not been rerun. It requires the public index/loader declarations not to expose recovery handle/session names and requires the package export map to remain exactly `"."`.

## Remaining qualification and blockers

1. Inspect and run the deterministic factory-fault test first. Fix only source-proven issues; retain a failing receipt if it reveals a real cleanup defect.
2. Run `src/surface-ratchet.test.ts`.
3. Format owned source, then rerun TypeScript typecheck and native build.
4. Run the focused aggregate over:
   - `config-publication-runtime.test.ts`
   - `config-recovery-runtime.test.ts`
   - `config-recovery-crash.test.ts`
   - `config-recovery-invariants.test.ts`
   - `config-recovery-drift.test.ts`
   - `config-recovery-ledger-handoff.test.ts`
   - `config-recovery-wrapper.test.ts`
   - `config-recovery-factory-fault.test.ts`
   - `env-teardown.test.ts`
   - `surface-ratchet.test.ts`
5. Run the package native suite and package lint/format checks once the focused aggregate is green.
6. Decide and document the remaining proof limits:
   - true mount-ID mutation and UID mutation were not exercised; group ownership was exercised;
   - each individual lease-transfer failure boundary is not separately injected, although rejection cleanup and lock reacquisition are covered;
   - no explicit mutation receipt yet proves removal of the former direct-intent mapping;
   - same-inode `multiple-match` is structurally constrained by the one-link regular-file invariant; the hardlink/name case currently proves unclassified fail-closed behavior.
7. Generate a fresh owned-file manifest and source-review packet after all source is frozen.
8. Production adapter wiring, server CAS adoption, four-target artifact qualification, release advertisement, and deployment remain out of scope and unstarted.

## Exact owned source snapshot

All paths are relative to the Gateway checkout. Rehash before resuming; any mismatch means this checkpoint is stale.

```text
21fee74a0c3b0ea3670d30370afaeedd8c54f868757eb666711d29570ba0f157  packages/linux-fs-atomic/scripts/build-native.mjs
4505b53d8d3993b915cb26747d11b145743f6380c4b5b12b5d0a123003dff0df  packages/linux-fs-atomic/scripts/config-recovery-crash-child.mjs
8c688b5f5abd0412b767f8d45d9a74e844a080040e576db0e33408a22beaa015  packages/linux-fs-atomic/scripts/config-recovery-factory-fault-child.mjs
da2b41916ad0b456e231d0433439eb77c2e5e37b0ebcf5f7e7219a3d2a1af324  packages/linux-fs-atomic/scripts/config-recovery-verify-child.mjs
fcd5239b354318a5a63e1bf0bdec56a6e84f472546266c956167c84b8166131a  packages/linux-fs-atomic/src/async-api.test.ts
89cff38f1fe2b264776a2e683814b02129172fe93fb199ea853a7c0c977939d5  packages/linux-fs-atomic/src/async-api.ts
1ed3f1eb1920698d1e704e829e113e16d6c21d8de25ea734854515ca3307816c  packages/linux-fs-atomic/src/config-publication-private.ts
4c8d43c77a3293ce5b9ecde03b82ea6e888496c1c48b25bdbdd7a0ac7f005cd5  packages/linux-fs-atomic/src/config-publication-runtime.test.ts
9cbe571276fab95da1be80234ce35613159aefe17a4db286a9d18a2737d32fb5  packages/linux-fs-atomic/src/config-recovery-crash.test.ts
623b03b37c5a12f66f144f729bf44996d3c7d65b87e4ee0ae758aa09b052de80  packages/linux-fs-atomic/src/config-recovery-drift.test.ts
52fd787d71fde5b00fbdaf0426c2f1a0f580ef0e8e782b3fb054f7d1ece0bb1f  packages/linux-fs-atomic/src/config-recovery-factory-fault.test.ts
a9980634c1134ccbcb3bdde08355515ac76dfe732cb1e3b3c02a37d73c1526b6  packages/linux-fs-atomic/src/config-recovery-invariants.test.ts
9954572a6d15337cee535ba48e68cf9a612f9935a2329075cbc4af1b56899961  packages/linux-fs-atomic/src/config-recovery-ledger-handoff.test.ts
784900cde0aff54c537be634a9ca8cbe934ffe5d6ade1c90628b078a48ef3c86  packages/linux-fs-atomic/src/config-recovery-runtime.test.ts
87adf8e82dd490291ff9fd7078c86de55debf822386398830a50db0a32679256  packages/linux-fs-atomic/src/config-recovery-wrapper.test.ts
0686acb9b82fb4955572a53ce918a66bd18ebda95376bee3abd7e4da09cebfc5  packages/linux-fs-atomic/src/config_publication/admission.rs
7974b57f1cbbd9f3ef136d32c5d61d74272e9ad997c7bdbda1da42898270be76  packages/linux-fs-atomic/src/config_publication/mod.rs
ffb29d353d16a1e2b424aa4ca47737db13d5dbff4c4c42cd73f36230e11a9065  packages/linux-fs-atomic/src/config_publication/recovery.rs
8df5e4c7bc8f663187b904babdd22298ea31be7660394eb3b45bfdb322b32797  packages/linux-fs-atomic/src/config_publication/recovery/model.rs
b5e10f4a225a3e9eab60ad6c151f5b9dcc362fb3e1c91d7d2e64368f0b01a48b  packages/linux-fs-atomic/src/config_publication/scratch.rs
f0f0b0eadbdca66a637fd8c8694c351e414f5df98e7b51ab93aef1a2de79dc19  packages/linux-fs-atomic/src/config_publication/session.rs
36dd697fe1d6a39d6c7b0cd28507ef83670cc49f190ad49c5313c08ddedd225d  packages/linux-fs-atomic/src/config_publication/tests.rs
8b2c85ed89e649eb74ee1d5ad2ac1a19733e1edaac103ffca2a6712e54800fbb  packages/linux-fs-atomic/src/config_publication/tuples.rs
f82fb90032893028be19bee349cace29ac9a953d0299bc4be4d0a40fefe7a7f2  packages/linux-fs-atomic/src/env-teardown.test.ts
53ba1ae96bd9fa0fd1018c9e5d37aa036bbfdb11eea5ef5ea8f652b0a4ce5569  packages/linux-fs-atomic/src/executor.rs
f7a855f1c4e6ca2f4579143245fbc0436e5cd048ec6e6af4f8287b0b9b6ebf89  packages/linux-fs-atomic/src/executor/operation.rs
c9c4cc3eb1cf50a222f324d609fdc32314446947999268010cd0d6730f078b35  packages/linux-fs-atomic/src/executor/ownership.rs
57dbf8d1c9b81afe329826d6b280807742bfde2ce2eed8b276461557d77cee5c  packages/linux-fs-atomic/src/executor/stages.rs
6d6cc89f2c1474a0681e662ec3c0d2e28551f3ca3182c8a91f4060c5481e7846  packages/linux-fs-atomic/src/executor/tests.rs
d234f0a050b4403b4867fafd098e5ced993b654c131e294754fbb1d60aaf8faa  packages/linux-fs-atomic/src/handles.rs
95214f5e283db55e2c939f910e13bc23f06dee63b5765d74c2a1738ab62b69d6  packages/linux-fs-atomic/src/handles/authority.rs
e418c5d72928e41ae72726a979a4cec025cd1a1d24d17a195f2e4fabb343281d  packages/linux-fs-atomic/src/handles/entry.rs
f4b3eee9cda02403d106f04a7d4bff7210f0fbe2a473e597b640d482bd3c660a  packages/linux-fs-atomic/src/handles/lease.rs
46cd4141f67b4917e873fbd910edb6237fe0ce6742872dcbb280f04f15901daa  packages/linux-fs-atomic/src/handles/publication.rs
4e7600b7a9ea3730c6f2cbb1b8fa2c285833097b1a7d2170ac6d9710ac97cb45  packages/linux-fs-atomic/src/handles/root.rs
f36c3426734d7f3c2ff95e7fa492e3fd9ea6878fdc8d512a80351755dc26f2e0  packages/linux-fs-atomic/src/lib.rs
556b9d618e2e18aa87abfb0a22cdb1783e02ba28b21610f41d5cf5c9841e6290  packages/linux-fs-atomic/src/loader.ts
967b87759faabc70dc6605a2df87da53a120e57d0679ca2821dbee87bcb8269f  packages/linux-fs-atomic/src/native-types.ts
324d46962e6642d74e514779f021413283de916fc5bebe9c7e01246b933752a7  packages/linux-fs-atomic/src/operation-outcome.ts
898390041aa3b7a7e997974be463a56e8246afc0b8949455248be156a5b41939  packages/linux-fs-atomic/src/runtime.test.ts
bfcfc8f35e6be41c9561dac7393557c652587c1371b6873f6e1aa2af2d9e2118  packages/linux-fs-atomic/src/surface-ratchet.test.ts
b87e67d777b0f9b7e772076df80d1077313664855497281b75df3bf20a8315c9  packages/linux-fs-atomic/src/sys.rs
```

## Resume order

1. Verify this 42-file SHA-256 inventory and confirm `git diff --cached --name-only -- packages/linux-fs-atomic` is empty.
2. Inspect the two unverified factory-fault files before running anything.
3. Run only their focused typecheck/build/test first.
4. Continue through the remaining qualification list above.
5. Freeze, hash, and request source review before any production import or release claim.
