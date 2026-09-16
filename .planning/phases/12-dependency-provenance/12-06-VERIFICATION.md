---
phase: 12-dependency-provenance
plan: "06"
status: gaps_found
---

# Contained build diagnostics verification

Tasks 1 and 2 pass their bounded independent review. Root inspected the launcher, worker, actual-nft tests and final timer separation, then reran all 11 tests: exit 0, no skips, 13.802 seconds. Evidence: `/tmp/minion-12-06-root-tests.log`. These tests establish the selected installed namespace/runtime behavior and asset-preserving fixture traces. They do not establish an operating-system sandbox against arbitrary hostile native code.

| File | SHA-256 at independent acceptance |
|---|---|
| minion_hub/scripts/qc/trace-build-contained.mjs | `056e9d1391785b82f22d563f014b070353246cc2be4db109f4c8e0d899854ee5` |
| minion_hub/scripts/qc/trace-build-contained-worker.mjs | `8e2f471ca1ac69e73135ade21861aa395db9df02364683bd2aa8c9912e08f0de` |
| minion_hub/scripts/qc/trace-build-contained.test.mjs | `9b618a430056bf370050372c655064e7236e12f53c05354ccd33257feadcce8e` |

Mandatory namespace controls, individual trusted runtime mounts, cleared environment, parent-observed namespace and privilege proof, immutable artifact inventory, network/descriptor checks, bounded evidence and child cleanup were examined. Application tracing follows the same-launch admission gate. The actual missing-namespace-capability condition was not reproduced on this host; the negative startup evidence covers an unsupported mandatory option and is labeled accordingly.

Task 3 remains incomplete. Root admitted four sequential traces at 60 seconds and a 2048 MiB heap each, but preflight rejected the dependency-shipped `node_modules/bottleneck/.env` before any namespace/application trace. Exact public-file classification is pending. No file was removed or guard bypassed; no build cause, complete deployment artifact or dependency upgrade is accepted. Any exception requires exact path/content provenance, a reviewed plan amendment and negative tests preserving the general credential-file rejection.

No production changes or requirement closure. The original and candidate packaging failures remain open. New source hashes after a reviewed amendment must be recorded separately rather than replacing this historical evidence.

## Public vendor defaults admission

Root reviewed the immutable-source classification and admitted the exact path, 37-byte hash and package.json hash exception with changed-content/path/package negatives. Current PLAN SHA-256: `9e0f917170bb308dc6b3149c941600cd126c015155546d0d7104275d7b464631`. Source implementation and independent recheck remain pending. This classifies fixed public bytes and does not waive package archive provenance or change tracing semantics.

## Amended launcher independent check

Root read the exact allowance and all new negative cases, then ran `node --test scripts/qc/trace-build-contained.test.mjs` independently: 12 passed, zero failures/skips, exit 0, 16.587 seconds (attached execution25612). Launcher SHA-256 `ee4447bc8cd76d2f07e72b83418e2b596115c8da799a452c60b279109bfd0232`; tests `602912a9d34e97af39d36459208c384f7730f00d311454c24034cbe9383fcf79`; worker unchanged. Regular package identity and exact public bytes are required; changed bytes, changed location, changed metadata and symlink identities are rejected. The file remains visible to inventory and tracing. Root releases the original four sequential Task 3 traces at their unchanged 60-second/2048 MiB bounds. No application result is claimed yet.


## Four-run evidence reconciliation

The admitted Task 3 experiment finished: candidate messages, candidate manifest, candidate full entry and baseline full entry all timed out at 60.029, 60.049, 60.038 and 60.036 seconds under the unchanged 2048 MiB heap bound. RESULTS records complete copy equivalence, same-launch isolation proof, zero listener connections, unchanged artifact/runtime inventories and owned-child cleanup for each. No final dependency closure or OOM was produced. This is completed bounded diagnosis, not packaging acceptance.

All journals last read the same 5,806,942-byte messages module (`a9d9bcff5797ad43acc3273a6f21534eb0e8e94cea57e2b6403ff35342c79334`). A successful file read does not attribute the later timeout. The launcher's `peakRssKiB` measures the namespace reaper. Auxiliary samples initially also matched wrapper argv; corrected per-PID evidence has no messages-worker sample, only a late manifest window and retrospective lineage limits. No memory regression or root cause is concluded from these samples.

Frozen experimental launcher: `ee4447bc8cd76d2f07e72b83418e2b596115c8da799a452c60b279109bfd0232`. The subsequent explanatory TODO alone produced `3fde6304d5426df80db9b47bb7cefa5d9f8907d7fde3392959ae333e33e009e8`; `node --check` passed. Later 12-07 edits are separate candidates and do not retroactively alter these receipts. All runtime assets and actual product manifests/locks were preserved; no upgrade, deployment or requirement closure followed. 12-07 owns the next bounded profiler qualification.
