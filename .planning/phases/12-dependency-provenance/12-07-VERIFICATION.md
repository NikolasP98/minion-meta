---
phase: 12-dependency-provenance
plan: "07"
status: gaps_found
requirements_completed: []
---

# Independent profiler qualification

Root reviewed fixed flags, profile/control separation, incremental persisted-byte caps, profile input identity/mounts, complete-line derivation, built-in decoding, late cleanup and ordinary nft behavior. Review found two corrections before freeze: an unreachable short-probe branch and a UTF-16 character truncation that did not bound UTF-8 diagnostic bytes. The latter reproduced 83,348 retained bytes before repair. The actual non-ASCII overflow negative now passes with byte-based retention.

Root independently ran `node --test scripts/qc/trace-build-contained.test.mjs`: **20/20 passed**, zero skips, exit 0, **69.049 seconds**. Log: `/tmp/minion-12-07-root-tests.log`. This includes forced synchronous timeout with useful named-function decoding, ordinary/profile nft file/reason/asset/warning parity, malformed/partial/empty input, stream and decoder ceilings, actual CLI status and isolated descendant cleanup. Earlier startup-only development failures remain recorded; passing qualification does not guarantee every startup completes within five seconds. Native symbol coverage and statistical timing remain limited.

## Frozen source

- `minion_hub/scripts/qc/trace-build-contained.mjs`: `4d7ca005de347c7ca991f203ad0fd080269f2538e1d87f19175d259487dfad58`
- `minion_hub/scripts/qc/trace-build-contained-worker.mjs`: `72431ca21cce745f2fd36c7b3d39970d5e97533faf20c3b1e87d92a52c4b3371`
- `minion_hub/scripts/qc/trace-build-contained.test.mjs`: `9006a83ae19c3d91fdc337378d00aebc5a6e8960a02a986ed229d6934f4208e6`

## Task 3 admission

Root releases one sequential candidate messages-only profile at 60 seconds/2048 MiB and, if usable evidence exists, at most one isolated decode at the same bounds. No full build, other entry, baseline comparison, retry, higher budget, changed artifact, runtime mount or diagnostic source modification is admitted. Revalidate complete artifact/runtime inventories and messages hash before launch. Report timeout/output-cap outcomes honestly and verify cleanup before decode. The heavy-resource window belongs to this experiment; coordinate before any full Hub check.

No application profile has yet run at this admission. This is a diagnostic harness acceptance, not a packaging cause, dependency upgrade, release, complete runtime asset or EN/ES certificate. DEP-01/DEP-02 remain open; the dependency candidate stays unapplied. Root will reconcile the Task 3 receipts separately.


## Task 3 result and interpretation

The single profile reached its 60.025-second limit and the single decoder completed in 1.070 seconds. Reported same-launch proof, complete artifact/runtime identity checks, unchanged decode input and observed-process cleanup passed. Raw evidence retained 4,201,827 bytes, 3,248 code records and 2,801 tick records; last stdout receipt was 3.570 seconds. Derived decoding trims only the final incomplete 65 bytes. Decoded ticks include 171 unaccounted, 2,503 libc and 24 JavaScript ticks, no native-C++ section and an overflow-frame diagnostic.

This sample window mostly covers initialization and cannot establish what ran during the remaining roughly 56 seconds. No supported parse/scope/walk attribution or OOM cause follows. Task 3's bounded experiment is finished; diagnostic coverage and packaging remain open. Exact receipts are in RESULTS. Root subsequently added only the coverage TODO beside lastReceiptMs; the experimental launcher remains `4d7ca005de347c7ca991f203ad0fd080269f2538e1d87f19175d259487dfad58`. No further profile/decode, budget or behavior change was admitted.
