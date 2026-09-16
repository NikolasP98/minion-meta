---
phase: 12-dependency-provenance
plan: "06"
status: bounded_traces_finished_packaging_unresolved
requirements_completed: []
key-files:
  created:
    - minion_hub/scripts/qc/trace-build-contained.mjs
    - minion_hub/scripts/qc/trace-build-contained-worker.mjs
    - minion_hub/scripts/qc/trace-build-contained.test.mjs
    - .planning/phases/12-dependency-provenance/12-BUILD-CONTAINMENT-RESULTS.md
---

# Plan 12-06: contained trace qualification

Tasks 1/2 implement a Bubblewrap-backed diagnostic launcher and same-launch worker gate. The child exposes only the explicit immutable artifact, exact runtime files, diagnostic controls, private proc/dev support and bounded output. Parent-observed namespace and privilege evidence plus a nonce admission precede nft loading. Installed nft preserves normal asset analysis inside that namespace.

Initial synthetic tests passed 11/11, exit 0, 15.834 seconds. They cover imported/ordinary/dynamic/absolute assets, missing required input, filesystem/network/descriptor isolation, early worker identity refusal, startup refusal, artifact mutation detection, stale outputs, evidence limits and timeout/descendant cleanup. Formatting passes. The kernel's unavailable-namespace case was not reproduced: the real startup-refusal test uses an unknown mandatory option, and the report states that limit. No network-enabled negative sandbox was created.

Root independently passed all 11 tests in 13.802 seconds and admitted Task 3. Its first full artifact inventory refused the dependency-shipped `node_modules/bottleneck/.env` in both frozen copies before trace manifests or copy-equivalence proof could complete. No file was omitted or reclassified and no guard was bypassed. Separate copies/markers were prepared, then all prep processes exited and the heavy window was released. Root owns the required input classification/policy review. At that preflight checkpoint, zero application traces, full builds, dependency/configuration/source repairs, deployments, database fault injections or production changes had occurred. The pgvector build's heavy-resource ownership was respected; only lightweight synthetic tests ran.

See [12-BUILD-CONTAINMENT-RESULTS.md](12-BUILD-CONTAINMENT-RESULTS.md) for exact source/TAP hashes and the evidence boundaries. Root owns proposal updates, final qualification, application-trace scheduling and any next diagnostic/repair decision. The source TODO(handoff) identifies the unresolved packaging/asset gate. DEP-01/DEP-02 and the frozen 12-01 build gate remain open. No commits or worktree/branch/stash actions occurred.


## Public-default amendment receipt

Root's exact PLAN amendment `9e0f917170bb308dc6b3149c941600cd126c015155546d0d7104275d7b464631` now permits only the classified regular 37-byte Bottleneck .env at its exact path/content hash, with the exact regular package.json hash. The file is retained in the complete inventory and read-only mount. No generic environment exception, symlink identity, nft asset exclusion or artifact mutation was added.

The regression failed against the prior guard, then passed. Final focused case passes in 0.268 seconds; all 12 harness cases pass in 15.858 seconds, with zero skips. Same-length/other content changes, alternate path, package mismatch and symlink identities fail. Formatting passes. Amended source/log hashes are in RESULTS. Root independent recheck and resource release remain required before Task 3; no actual inventory retry or application trace ran during this amendment.


## Final Task 3 receipt

Root independently passed the amended 12/12 tests in 16.587 seconds and released the exact four-run window. Complete original/copy inventories then verified every entry except the added diagnostic marker; no runtime asset was omitted. Four sequential traces ran at the unchanged 60s/2048MiB limits: candidate messages, candidate manifest, candidate full entry and baseline full entry. All timed out after 60.029, 60.049, 60.038 and 60.036 seconds. Each passed same-launch isolation/nonce proof, zero listener connections, unchanged complete artifact/runtime inventories and final owned-child cleanup. No final dependency closure or OOM report was produced. The heavy window was released after all children/wrappers/listeners closed.

All four journals ended at a read of the same generated messages module, with no subsequent hook event before timeout. This is a follow-up lead, not a demonstrated packaging cause. Both full-entry runs observed 1,025 distinct read paths before timeout. Missing setup-script probes now have ordinary namespace-local absence; required deployment asset ownership and EN/ES behavior remain unqualified.

The frozen launcher's peakRssKiB field measures Bubblewrap's reaper. Auxiliary 100ms samples also matched Bubblewrap command-line arguments and require the corrected per-PID interpretation documented in RESULTS. Messages has no worker sample; manifest has only a late window. Remaining-child sampled maxima were 454,488 KiB (manifest), 368,808 KiB (candidate entry) and 413,040 KiB (baseline entry), with retrospective lineage limitations. They do not establish a memory cause or a regression. Root received the exact measurement TODO/proposal wording; no measurement behavior was repaired and no extra trace was run.

RESULTS preserves exact source, copy-equivalence, per-run input/proof/process/journal and auxiliary evidence hashes, as well as separate preparation/preflight/child/postflight costs. The four-run experiment is finished; packaging qualification, deployment completeness and DEP-01/DEP-02 remain open. Original/candidate artifacts and actual product manifests/locks remain unchanged; the candidate is still unapplied.


After recording all four frozen-source receipts, root admitted the explanatory RSS-site TODO only. Current launcher SHA-256 is `3fde6304d5426df80db9b47bb7cefa5d9f8907d7fde3392959ae333e33e009e8`; the experimental launcher hash remains `ee4447bc8cd76d2f07e72b83418e2b596115c8da799a452c60b279109bfd0232`. No measurement behavior changed. The source-grounded next recommendation is bounded attribution of nft's parse, scope-attachment and AST-walk stages after the messages read, with a separately identified diagnostic copy and fidelity gate. Root owns any 12-07 plan; no additional experiment or candidate upgrade is admitted here.
