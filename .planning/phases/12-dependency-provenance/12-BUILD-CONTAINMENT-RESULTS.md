# Contained build diagnostic: isolation qualification

Status: four admitted application traces executed and bounded at 60 seconds; all timed out without a final dependency closure. Isolation and unchanged-input checks passed. Recorded 2026-09-09. No full build or product repair ran. Historical preflight/amendment receipts below precede the final Task 3 receipt.

## Verified result

`node --test scripts/qc/trace-build-contained.test.mjs` passed **12/12**, zero failures/skips, exit 0, in 15.858 seconds after the exact public-default amendment. These tests run the actual installed non-setuid Bubblewrap, trusted Node runtime and copied installed nft dependency closure. They are not mocked namespace or tracing tests. All three source files also pass Prettier validation.

| Boundary | Actual fixture evidence |
|---|---|
| Same-launch gate | Worker checks namespace, mount, runtime, privilege, filesystem, descriptor and network state before nft loads. Parent reads the Bubblewrap-reported host child PID's namespace IDs and privilege status, then sends a nonce admission through stdin. Assertions require that gate before nft/entry markers. |
| Host filesystem | Synthetic host sentinel and host home/system paths are absent. Artifact and worker/runtime mounts are read-only. Unexpected mounts, private environment files at any depth, escaped symlinks, special artifact files and extra manifest binding fields reject. |
| Network | Child has a different network namespace and only loopback. It cannot connect to a live parent-owned loopback listener; the parent records zero connections. No external endpoint is contacted. |
| Descriptors | A parent-opened synthetic file descriptor is not inherited; child descriptors are checked before tracing. Standard pipes are explicit. No host socket is bound. |
| Imports/assets | Actual nft retains an imported module, ordinary asset, dynamic matches with parent reasons, and an absolute asset within the fixture. A top-level throwing handler is never executed. |
| Ordinary absence | `/__data.json` receives a real absent stat inside the namespace. No ignore callback, synthetic ENOENT or analysis suppression is installed. The setup-script path is checked absent during isolation. |
| Missing required input | An unresolved required relative import yields incomplete evidence with nft warnings. It does not pass as complete. |
| Identity | Package/lock/entry, runtime, worker and launcher identities are pinned. Complete artifact-file/symlink inventory is checked before and after execution. A host-side change after isolation invalidates the result. Stale outputs cannot be reused. |
| Isolation failure | An actual worker with a deliberately incorrect probe identity exits before nft/entry-analysis markers. |
| Startup refusal | Actual Bubblewrap rejects an unknown required-control option without executing its command. This tests startup refusal; it does not claim this machine's kernel denied user namespaces, which are available. No shared-network negative sandbox or weaker fallback was run. |
| Budget/cleanup | Evidence-budget exhaustion exits explicitly, before nft in the small-budget case. Timeout kills a SIGTERM-resistant worker and detached descendant; every sampled host descendant PID is gone afterward. Probe-only mode performs no nft load or entry analysis. |

The first development run found that later stdout parsing replaced the parent-verified proof object. The launcher now preserves the first proof and attaches the parent-observed identities. An intermediate test also had a missing helper import; it was corrected. The table reports the final passing source only.

## Implemented policy

The launcher admits only canonical owned temporary roots and a fresh separate run directory. It mounts the artifact read-only at its original temporary absolute path, exact trusted Node loader/library files, hash-pinned worker/control files, private proc/dev support and one writable evidence directory. The constructed root is read-only. It does not bind a broad host system directory, home, checkout, host temporary tree, network or database/browser/D-Bus socket.

Mandatory flags create private user/PID/network/IPC/UTS namespaces, disable further user namespaces, drop capabilities, clear environment, create a new session and bind child lifetime to the launcher. Parent checks also require a distinct mount namespace. Missing controls or unavailable runtime fail qualification. Only Bubblewrap's synthetic PWD may survive environment clearing. The worker's loaded runtime and mount properties are verified before it requests the parent's admission.

nft uses unchanged installed cached IO with filesystem-root base/processCwd, IO concurrency 1024 and default conditions/analysis. It does not execute application handlers. Read/resolve observations and complete file/reason lists are recorded; glob matches are established by emitted assets and reasons, not a custom glob override. Runtime-support or kernel-support assets are preserved in the recorded list and make deployment interpretation incomplete, rather than being filtered out.

Timing records separate manifest preparation, preflight validation/inventory, namespace setup, bounded child execution, postflight inventory/runtime verification and total run duration. Full-artifact hashing happens outside the child timeout and must be counted in operational cost. Timers stop when the child closes, so postflight hashing cannot retroactively turn a completed child into a timeout.

Resource budgets are enforced by the parent and by bounded worker evidence writes. Worker output is capped by the manifest, at most 32 MiB; stdout/control streams are bounded; inventory evidence is capped at 32 MiB and the combined parent record at 64 MiB. Timeout cleanup targets the owned process group and private PID namespace. File inventory and runtime hashes are checked again after the child exits. A read-only child mount does not itself stop other host processes from modifying an artifact; the mutation fixture proves the post-run invalidation behavior.

This remains a diagnostic for an explicitly selected credential-free artifact. It is not a sandbox product, a new application security dependency, an alternative production tracer or a general tool for executing hostile application code.

## 12-06 frozen source and test identity

| File | SHA-256 |
|---|---|
| `minion_hub/scripts/qc/trace-build-contained.mjs` | `ee4447bc8cd76d2f07e72b83418e2b596115c8da799a452c60b279109bfd0232` |
| `minion_hub/scripts/qc/trace-build-contained-worker.mjs` | `8e2f471ca1ac69e73135ade21861aa395db9df02364683bd2aa8c9912e08f0de` |
| `minion_hub/scripts/qc/trace-build-contained.test.mjs` | `602912a9d34e97af39d36459208c384f7730f00d311454c24034cbe9383fcf79` |
| `/tmp/minion-contained-12-06-amended-tests.log` | `b318d0e93aefc152390bd0bc116756505281cdfb8dd603d80f0dab5998038f34` |

The tests remove their owned synthetic artifact/run directories after assertions. The retained TAP log records the executed cases and final result; synthetic per-run namespace IDs are not durable application-trace evidence. Each real admitted run retains its process result, complete input/runtime identities, mount arguments, parent/worker proof and artifact inventory. See [12-BUILD-CONTAINMENT-RESEARCH.md](12-BUILD-CONTAINMENT-RESEARCH.md) for local runtime/tool identities and primary-source rationale.

## Historical preflight gate and open work

Root independently reviewed the final source/timer separation and passed all 11 namespace/asset tests in 13.802 seconds, with no skips (`/tmp/minion-12-06-root-tests.log`). Root then admitted the exact four Task 3 traces and released a resource window.

Task 3 stopped during its first full-inventory validation. Both original frozen copies contain `node_modules/bottleneck/.env` (37 bytes); the credential-file guard rejected `private_environment_file` before copy equivalence or trace manifests could be completed. Metadata-only enumeration also found the expected synthetic root `.env` (41 bytes). No dependency environment file contents were printed, deleted, reclassified or changed. No namespace/application trace started, and no higher-budget or fallback action ran.

Separate copies were prepared at `/tmp/minion-contained-real-aed2cd54-8bb3-436a-b4a9-9a8e128ad390/{candidate,baseline}`. The candidate copy took 6.602 seconds and the baseline copy 6.505 seconds. A new `.minion-contained.json` diagnostic marker was added to each copy; originals remain unchanged. Byte-for-byte equivalence was intended but remains unverified because the full inventory refused; do not treat successful copying alone as equivalence proof. Copy metadata is in `copy-record.json` under that directory.

All prep children exited and the heavy-resource window was released to root. Root must independently classify the dependency-shipped environment file and define an exact input policy before another inventory attempt. The worker will not omit a potential runtime asset, weaken the credential guard or bypass the refusal. This is an input-qualification blocker, not a Bubblewrap isolation failure or a reproduced packaging cause. The four admitted application traces remain unexecuted. No larger budget, IO variation, full build or product repair is selected.

An ordinary absent setup-script probe is not proof that a required external setup script is included in deployment, even if nft returns complete for this isolated artifact.

Still unresolved: the real Hub graph closure, packaging memory cause, possible required setup-script ownership, candidate-versus-baseline resource behavior and the deployment completeness/EN-ES gates. The original/candidate default builds still failed packaging, and the frozen 12-01 candidate remains unapplied. DEP-01/DEP-02 stay open. The launcher TODO(handoff) points to the root-owned QC proposal; root owns the corresponding proposal update and any further repair admission.

## Classification appendix: Bottleneck's fixed public defaults

Read-only classification completed 2026-09-09. The candidate and baseline both identify the installed package as `bottleneck` version `2.19.5`. Their `node_modules/bottleneck/.env` files are identical, 37 bytes, SHA-256 `9a71de52ef575866ca37dce0fe306c2571ed84f780ae2e8a263a6135fc42ac74`. Their package.json files also match: SHA-256 `9e73efe094fc7802ce2288f1e342e9f28c2fe75f017002a96a35a478eb1df4d9`.

The [public v2.19.5 source tree](https://github.com/SGrondin/bottleneck/tree/v2.19.5) lists `.env`. The GitHub tag API resolves that tag directly to commit `8a8bde9cde151c278397703c48f2bba4ded2bae7`. Bytes fetched from both the tagged file and the [immutable commit's .env](https://github.com/SGrondin/bottleneck/blob/8a8bde9cde151c278397703c48f2bba4ded2bae7/.env) match the two installed files exactly, including the 37-byte length and SHA-256 above. Source bytes were compared in memory; no file values were printed.

A strict assignment-only classification found exactly two keys, `REDIS_HOST` and `REDIS_PORT`, with no duplicate keys, additional fields or credential material. The host is a loopback/local-host default and the port is the standard Redis default. This fixed byte sequence is public nonsecret development/default configuration. The conclusion is specific to these bytes; a Redis environment filename or these key names alone would not establish safety.

The exact npm registry tarball comparison remains **unverified**. The web tool could not retrieve the registry metadata/tarball and the npm package page returned HTTP 403. This was a retrieval limitation, distinct from the earlier automatic safety-review rejection of driver fault testing. Root accepted the exact public tagged-source comparison as sufficient to classify this fixed content; no alternate registry retrieval, installation or stronger provenance claim was made. Local package identity plus public-source byte equality does not establish the complete registry archive's integrity.

Classification recommendation at that checkpoint (subsequently admitted below):

- Permit only artifact-relative `node_modules/bottleneck/.env` with exactly SHA-256 `9a71de52ef575866ca37dce0fe306c2571ed84f780ae2e8a263a6135fc42ac74`; optionally require the accompanying package identity to remain `bottleneck@2.19.5` as an additional constraint.
- Keep the file present, read-only and included in the complete artifact inventory. This is credential classification, not an nft ignore rule or runtime-asset deletion.
- Reject altered bytes, other paths, other dependency `.env` files and arbitrary extra keys. Preserve the separate existing allowance for empty synthetic root PostHog bindings.
- Add positive exact-public-file and negative changed-content/alternate-path fixtures before real inventory or trace execution. Preserve all namespace, environment, network and resource controls.

No launcher, worker, tests, application artifacts or environment values were changed during classification, and no application trace ran. The original preflight refusal remains the recorded outcome until the exact amendment and independent checks are complete. Public defaults do not settle external setup-script ownership, packaging completeness or the broader dependency requirements.


## Admitted classification amendment: implementation receipt

Root admitted PLAN SHA-256 `9e0f917170bb308dc6b3149c941600cd126c015155546d0d7104275d7b464631`. The launcher now recognizes only regular artifact-relative `node_modules/bottleneck/.env`, exactly 37 bytes with the classified SHA-256, accompanied by a regular nonsymlink package.json with the exact recorded SHA-256. The file remains in the ordinary full inventory and read-only artifact mount. Changed bytes, another path, changed package metadata and symlinked file/package identity cannot use this allowance; the generic private-environment guard remains in place.

The focused regression first failed on the old guard with `private_environment_file`, then passed after the scoped allowance. Its negatives include a same-length byte change, an appended newline, replacing content with otherwise permitted empty PostHog configuration, an alternate dependency location, mismatched package metadata and symlinked identities. The positive assertion verifies the exact .env and package.json entries remain hashed in the inventory. No file values are emitted.

Final focused run: one passed, exit 0, 0.268 seconds. Final full namespace/asset suite: 12 passed, zero failures/skips, exit 0, 15.858 seconds. Prettier validation passes. Worker, namespace/mount arguments, nft hooks, budgets and application artifacts are unchanged. The source table above records the amended launcher/test identities and retained worker identity.

This is the implementation receipt, not root's independent recheck. No real artifact inventory was retried and no application trace resumed. The four Task 3 traces remain pending independent delta acceptance and a released resource window. The historical preflight refusal and registry-tarball provenance limitation remain documented.


## Task 3: four contained application traces

Root independently inspected the exact public-default delta and passed 12/12 harness tests in 16.587 seconds, with zero skips, before releasing the four-run resource window. The launcher, worker and tests stayed at the source hashes recorded above throughout all four runs. No extra trace, changed IO/analysis, asset exclusion, higher heap budget or full build was attempted.

Both originals were preserved: `/tmp/minion-360-12-01/clean` and `/tmp/minion-360-12-01/baseline-clean`. Complete original/copy inventories verified equivalence except the explicitly added `.minion-contained.json` marker. Every original entry was retained, including the classified Bottleneck file and synthetic empty root PostHog bindings. The separate copies are under `/tmp/minion-contained-real-aed2cd54-8bb3-436a-b4a9-9a8e128ad390`.

| Copy | Original / contained entries | Regular-file bytes before marker | Copy duration | Original/copy inventory duration | Original inventory SHA-256 | Contained inventory SHA-256 |
|---|---:|---:|---:|---:|---|---|
| Candidate | 79,824 / 79,825 | 922,216,934 | 6.602s | 11.066s | `52d2352989eabf0dbbc5805fbc21d5e0d2569c15e64736a8d1d47bf0a57c097f` | `874bf5e4c26952e8798a33e1cb56cae2e898d5a1fed0cd531e5582e2754feebb` |
| Baseline | 79,714 / 79,715 | 926,908,378 | 6.505s | 10.493s | `df8d78556ef5cf4769ff845010dd35d524b896513691a7a1cbda0ccb243f5572` | `f33d968d9655c7efe35767acd1c63049a7eeff73b283a7796a3d30e6a0d7c847` |

The selected runtime was Node v22.23.2, Bubblewrap 0.12.0 and installed nft 1.10.2. Each child had a 60,000ms deadline and 2048MiB V8 old-space limit. This heap setting is not an OS RSS ceiling. Each invocation independently passed the worker/parent namespace and privilege checks, nonce gate, read-only root/artifact, absent-host probes and isolated network proof. All recorded listener connection counts are zero. Full artifact and exact runtime inventories were unchanged afterward. Every observed owned child PID was absent after cleanup; all launchers, wrappers and listeners closed before the heavy window was released.

| Sequential trace | Result | Manifest preparation | Preflight | Namespace setup | Bounded child | Postflight | Recorded total |
|---|---|---:|---:|---:|---:|---:|---:|
| candidate-messages | timeout | 2.475s | 2.462s | 0.007s | 60.029s | 3.204s | 65.703s |
| candidate-manifest | timeout | 2.431s | 2.523s | 0.008s | 60.049s | 2.990s | 65.571s |
| candidate-entry | timeout | 2.466s | 2.742s | 0.007s | 60.038s | 2.663s | 65.451s |
| baseline-entry | timeout | 2.613s | 2.536s | 0.007s | 60.036s | 2.483s | 65.063s |

The recorded total excludes separately recorded manifest preparation; copy/equivalence preparation is also separate. Full-artifact hashing and runtime checks occur outside the child deadline. The small timeout overrun reflects cleanup/scheduling, not extra authorized analysis time. All four children closed with SIGTERM after timeout and empty stderr. None emitted `trace.json`, a final file/reason closure or an OOM diagnostic. These are bounded incomplete results, not packaging successes or reproduced memory failures.

| Trace | Journal events | Logical read calls | Logical bytes read | Distinct read paths | Last journal event after worker start | Ordinary absent paths |
|---|---:|---:|---:|---:|---:|---|
| candidate-messages | 1 | 1 | 5,806,942 | 1 | 0.297s | None observed |
| candidate-manifest | 7,710 | 3,771 | 82,936,258 | 981 | 3.090s | `/minion/setup/setup.sh` |
| candidate-entry | 7,945 | 3,882 | 84,002,396 | 1,025 | 3.222s | `/__data.json`, `/minion/setup/setup.sh` |
| baseline-entry | 7,945 | 3,882 | 83,762,426 | 1,025 | 3.383s | `/__data.json`, `/minion/setup/setup.sh` |

These are cached-hook logical observations, not physical disk IO measurements or the complete traced closure. In all four runs the final journal entry reads the same 5,806,942-byte generated messages module (SHA-256 `a9d9bcff5797ad43acc3273a6f21534eb0e8e94cea57e2b6403ff35342c79334`). No later hook event was recorded before timeout. This supports a narrower follow-up investigation around synchronous analysis after that read; it does not establish a CPU stack, the OOM cause, or that the module alone explains full-build behavior. The earlier 12-05 messages-only completion at 53.878 seconds used different instrumentation/environment and does not make this timeout a verified regression.

Ordinary absent setup-script and data-route probes now work inside the isolated root without host-tree access. Their absence does not establish deployment ownership or inclusion of a required external setup script. Required asset completeness and EN/ES deployment checks remain open.

### Retained RSS measurement defects and auxiliary evidence

The frozen launcher's `scripts/qc/trace-build-contained.mjs:469` selects `hostPid` (Bubblewrap's namespace reaper) for RSS; line 470 updates `peakRssKiB`. The source reads VmHWM, so this field measures the reaper high-water mark only in these runs and cannot support worker-memory conclusions. No sampling/arithmetic repair was made during the four runs. The first messages trace has no auxiliary worker RSS evidence.

The auxiliary sampler also has a retained labeling defect: matching `/qc/worker.mjs` in command-line arguments includes the outer Bubblewrap launcher and reaper, because their arguments name the worker. Raw `workers` and `scope` labels in those JSON files are therefore overbroad. The report corrects that interpretation without rewriting the evidence. Per-PID values below separate the recorded reaper and its remaining observed child; this retrospective lineage attribution lacks saved executable/start-time identities, so it is weaker than a tested worker-specific sampler. Parent-host launcher RSS was not included.

| Trace | Sample window / interval | Outer bwrap / reaper / remaining child PIDs | Sampled remaining-child RSS maximum | Aggregate of all matched processes maximum |
|---|---|---|---:|---:|
| Candidate messages | Unavailable | Unavailable | Unavailable | Unavailable |
| Candidate manifest | Late window only: 66 polls over 6.543s, actual matched processes present for 3.430s; 100ms target interval | 4037169 / 4037170 / 4037171 | 454,488 KiB | 458,080 KiB |
| Candidate entry | 651 polls from launch through 65.663s; child present 2.911–62.752s; 100ms target interval | 4040414 / 4040415 / 4040416 | 368,808 KiB | 372,400 KiB |
| Baseline entry | 647 polls from launch through 65.122s; child present 2.610–62.502s; 100ms target interval, 75s sampler cap | 4044033 / 4044034 / 4044035 | 413,040 KiB | 416,632 KiB |

The candidate-entry sampler stopped with the bounded launcher; it did not have an independent wall-time cap. Observed wrapper durations were 65.766s and 65.224s for candidate/baseline entry. Sampling may miss spikes; RSS and kernel high-water observations are distinct. The late manifest window is not a full-run peak measurement. These one-run, incompletely attributed samples do not establish a candidate/baseline regression or rule out later heap growth. Root received the exact measurement-site TODO/proposal request; a lineage-aware repair and its tests require separate admission.

### Retained real-run identities

Paths below are relative to the temporary evidence base above. Every process record includes full mount arguments, input/package/lock/runtime identities, before/after inventory and same-launch proof. No application handler was executed.

| Evidence | SHA-256 |
|---|---|
| `equivalence.json` | `ae9a0256839652ede9fe2e22acb659c3ffc438a0ded6427b76a51786cca7ec23` |
| `copy-record.json` | `93b09a1c9dc517c8286efef8431e40b0ada86b2323aa72653ee22cee1edc89aa` |
| `schedule.json` | `a0e3482a0bbf052e4b336fe844c710882af093e843fd464d8f3fa1bfd037ed8d` |
| `run-candidate-messages/input.json` | `ed5fb81833bc7aef5707616b637f28fc98b7f3fb37c450365d87c59473d56f66` |
| `run-candidate-messages/process.json` | `3702c4d47b06cfbe0c21ca7276713bb28da507ac01d47b84243c1abf23ec4f3b` |
| `run-candidate-messages/evidence/isolation.json` | `36089135873c65e22f442c58cb7926813e7b8b861c36db22d7b138f3b92c04bd` |
| `run-candidate-messages/evidence/events.jsonl` | `7f2f69e06508fa6731748a92355305028bf3ecc6ca7103d9797cb39a8de86648` |
| `run-candidate-manifest/input.json` | `5c5e755d859faf8f9d6ea5d70c481b709608fb9b38b94fad5cd2452031f3a7a4` |
| `run-candidate-manifest/process.json` | `0fbf01529ec154ce0bf53cf013452df3b2329cef2cf0ba0caa3379effa1ae273` |
| `run-candidate-manifest/evidence/isolation.json` | `53e08b3daabc6aac977599cca147b0e0b6bddc1eb57c4b56ee8883935076fe5e` |
| `run-candidate-manifest/evidence/events.jsonl` | `3c99a1c4e8792a7ea808d2a60a1b51ecb191b6fbed5014b13a2362a967a5356c` |
| `run-candidate-manifest/external-worker-rss.json` | `fbcb7169f986afe4378b98c8be5ac9a41e36905ea5ef74cbdbda383836c3d7c9` |
| `run-candidate-entry/input.json` | `8e561f79171b6cf8e8ef04e70d412155fda7a8fc84eb56def4a883e401c242c1` |
| `run-candidate-entry/process.json` | `65e188241e984a2ff082f2d81f665f6a3c49de9f2c03c550119ae58061af0010` |
| `run-candidate-entry/evidence/isolation.json` | `5ef8d88b1f8695fb3848becc2690d670e949ad587dd453f24940ed7cba70d8b4` |
| `run-candidate-entry/evidence/events.jsonl` | `e975c53824b14da3705ddb34048af55563188d772b75e5a862189f374902a354` |
| `run-candidate-entry/external-worker-rss.json` | `82c3b6f71ed4ba170a818848f41b7959396a8ccef13f364d03de361495c083fc` |
| `run-baseline-entry/input.json` | `a7780c269c19921005d6efec7a4987cf6404bde6afa3a32dbd5a2077c828490b` |
| `run-baseline-entry/process.json` | `d10408a54baa8081652fbb162663d8797a2dda9f5787d419b3ac248761a17779` |
| `run-baseline-entry/evidence/isolation.json` | `ca0caaad4d12c9da745d08de779571a744636122bf09617d5d528a7731a92c3c` |
| `run-baseline-entry/evidence/events.jsonl` | `81ecda9343f7df068d9aad041f0a6062192dddb5f24d0093e8b0f55c7ab265ae` |
| `run-baseline-entry/external-worker-rss.json` | `9b16b7493513bf1a8f60aeaf76d97a76ebf742dc16e48d7d682b755e4ea01093` |

Task 3's admitted four-run experiment is finished. The packaging cause, complete application closure, runtime-asset ownership and default-build qualification remain unresolved. DEP-01/DEP-02 and the frozen 12-01 candidate build gate remain open. Root owns the next bounded diagnostic decision and proposal ledger. No source/config/dependency repair, full build, production mutation or additional trace is implied by this receipt.


## Post-run comment and next diagnostic recommendation

After all four run identities were recorded, root admitted a comment-only TODO at the RSS selection site. The retained experiment launcher hash is `ee4447bc8cd76d2f07e72b83418e2b596115c8da799a452c60b279109bfd0232`; the source with only that explanatory comment has SHA-256 `3fde6304d5426df80db9b47bb7cefa5d9f8907d7fde3392959ae333e33e009e8`. Worker/test identities are unchanged. The TODO links the root-owned QC remediation proposal and covers both reaper attribution and auxiliary command-line matching. No runtime measurement behavior changed.

The installed nft source gives a specific next question. `node_modules/@vercel/nft/out/node-file-trace.js:345` awaits the source read and line 351 invokes `analyze`; its analysis result is cached only after completion. `out/analyze.js:320` attempts Acorn script parsing, line 335 can retry module parsing, line 520 attaches scopes, and line 555 starts asynchronous AST walking. The last-read observations cannot distinguish these stages or concurrent analysis elsewhere in the graph. Repeated logical reads also do not establish repeated physical IO because the worker delegates to CachedFileSystem.

Recommend a separately admitted messages-only diagnostic that records entry/exit timings for these actual upstream analysis stages (or a validated CPU-profile mechanism), preserving normal parser/analyzer behavior and the same namespace, artifact, IO and initial 60s/2048MiB bounds. Any diagnostic-only instrumented copy must have a separate identity and baseline fidelity check; it must not patch product dependencies, omit messages, suppress assets or claim a final closure from partial timings. First identify the stalled stage, then compare supported upstream fixes/configuration against that evidence. Fix worker-PID attribution with meaningful lineage tests before using memory as a decision gate. Root owns the next PLAN and admission; no such experiment ran under 12-06.


## 12-07: synthetic qualification before Task 3

At this checkpoint Tasks 1/2 were implemented and frozen for root's independent review; Task 3 had not run. Root admitted the five-second total synthetic-deadline clarification in PLAN SHA-256 `5e3402b065c3e0374ae0979031a35b3dd0102f060b7cdd43ce0f271cbee67a3b`. The real experiment remains limited to one messages-only profile and at most one useful decode, each at 60s/2048MiB, after separate root acceptance and a resource window.

The existing launcher now has a fixed V8 statistical-profile mode. It streams `--prof --prof-sampling-interval=1000 --logfile=- --no-logfile-per-isolate` output to a parent-retained file, capped at 16MiB. Worker proof/progress stays on a separately bounded stderr control channel. All existing namespace, nonce, read-only input, runtime identity, no-network and cleanup controls remain. Ordinary trace mode keeps its prior control-stream behavior. nft parser/resolver/analysis/IO options and installed source are unchanged; warning text is now recorded alongside its count to verify negative-case parity.

The profile control channel retains at most 65,536 bytes, including multibyte diagnostics. The parent captures a bounded byte prefix before decoding UTF-8, handles an incomplete final character without exceeding the byte limit, and treats overflow as a failure. Worker evidence retains its separate 8MiB ceiling; profile-mode persisted output is bounded by 16MiB raw plus 8MiB worker evidence. Raw bytes are kept separately from the parent JSON record.

Offline decoding admits only one exact regular, nonsymlink, hash/length-pinned data file at `/qc/profile.log`, read-only, after the same isolation proof. The trusted installed Node built-in `--prof-process` runs as a descendant in that namespace; no nft or application handler loads. No native-symbol executable or broad system directory was added. Original captured bytes remain intact. Only a newline-complete prefix is derived, with original/prefix hashes and discarded-tail length recorded. The decoder has a 4MiB stdout ceiling and 64KiB diagnostic ceiling. Its separate output accounting also covers the at-most-16MiB derived prefix and existing bounded worker metadata; this is not an unbounded native log file.

A zero decoder exit code alone is insufficient. Actual malformed input made Node exit zero with one unaccounted tick and an unsafe-integer diagnostic. The wrapper now records the built-in summary and classifies malformed/all-unaccounted or missing-summary output as `profile_unusable`; it does not invent call-stack attribution. Useful decoding is also recognized by the public CLI success status.

### Actual final checks

`node --test scripts/qc/trace-build-contained.test.mjs` passed **20/20**, zero skips/failures, exit 0, in **70.644 seconds**. All three files pass Node syntax checks and Prettier validation. This suite uses actual Bubblewrap, Node and installed nft; it contains no application profiling or full build.

| Boundary | Executed evidence |
|---|---|
| Forced synchronous timeout | A named hot JavaScript function runs without yielding until the parent stops the child. Raw code/tick records arrive before close and survive timeout; built-in decoding identifies that function. |
| Normal completion and fidelity | Ordinary/profiled actual-nft results match files, reasons, asset hashes and warning identities for imports, dynamic assets, absolute in-artifact assets and a missing required relative import. The latter remains incomplete in both modes. The throwing application fixture is never executed. |
| Raw/control limits | A 1,024-byte synthetic raw ceiling retains exactly that prefix and stops the child. The multibyte control fixture retains 65,535 bytes in the final run, reports overflow and loads no nft entry. |
| Decode limits and incomplete data | A 1,024-byte decoder stdout ceiling stops decoding explicitly. Truncated-tail data preserves the original bytes while its complete prefix remains decodable. Empty/no-tick, malformed, stale, wrong-path, symlink and oversized inputs cannot become useful evidence. |
| Isolation/refusal | Actual wrong worker identity exits before nft/entry markers in profile mode. Existing namespace, descriptor, parent-listener, artifact mutation, private-file and startup refusal cases still pass. |
| Cleanup | Profiled SIGTERM-resistant worker/descendant cleanup passes. Retained process records show unchanged artifact/runtime identities, zero parent listener connections and no remaining observed child PIDs at the final read-only audit. |
| CLI | Actual CLI decode returns success for useful built-in output; its regression previously returned exit 2 despite `decode_complete`, and is fixed. |

Final synthetic hot run: `minion-contained-run-u8ohpW` below timed out after 5.015 seconds; it retained 2,688,414 bytes, first received at 30ms and last at 5.008s. The decoder read 4,397 ticks, 111 unaccounted and zero excluded. Its JavaScript table attributes 2,622 ticks to `minionProfileSyntheticHotLoop`. These numbers describe the synthetic qualification only, including startup/probe overhead. Native C++ detail was absent from that decode; shared-library names and unaccounted samples remain in the full report. Sampling is statistical, not an exact phase timer or a product performance measurement.

### Historical failures retained

Two initial 1.8-second total-deadline attempts timed out before any isolation proof or synthetic workload marker. The second retained 2,078,850 raw bytes according to its process result shown during execution. Those early fixture directories were removed by the initial teardown, so their raw logs are unavailable; do not infer useful workload evidence from their byte counts. Root then clarified the already bounded 1–5 second synthetic envelope to use five seconds total for this fixture, preserving the real 60-second limit.

The first full development suite passed 16/17 in 54.070 seconds but one profiled asset fixture timed out at five seconds before proof (empty stderr). Its failure summary is retained in `/tmp/minion-12-07-development-tests.log`; that run also preceded retained raw-fixture receipts. No cause for this startup timing variation was established, and no higher limit, weaker proof or mechanism change was used to erase it. Later focused and full runs passed, including the final 20-case suite. Independent acceptance can establish usability under the selected bounds; it cannot guarantee startup timing on every run. A future early timeout must remain an explicit failure.

Meaningful regressions were also retained: malformed input was initially mislabeled useful because Node exited zero; CLI useful decoding initially exited 2; and non-ASCII control output initially retained 83,348 bytes under a 64KiB policy. Their negatives failed before their respective fixes and passed afterward. The dead, unsupported short-probe branch was removed during root review. None of these corrections changed nft analysis or product source.

### 12-07 frozen identities and receipts

Source hashes below supersede the earlier harness source only for future 12-07 execution. All original 12-06 experiment hashes/artifacts remain unchanged. Final synthetic receipts are under `/tmp/minion-profile-qualification-11w6Ir`; the original synthetic application directories are removed after tests, while these bounded run/input/proof/raw/decoder records remain for review.

| File | SHA-256 |
|---|---|
| `minion_hub/scripts/qc/trace-build-contained.mjs` | `4d7ca005de347c7ca991f203ad0fd080269f2538e1d87f19175d259487dfad58` |
| `minion_hub/scripts/qc/trace-build-contained-worker.mjs` | `72431ca21cce745f2fd36c7b3d39970d5e97533faf20c3b1e87d92a52c4b3371` |
| `minion_hub/scripts/qc/trace-build-contained.test.mjs` | `9006a83ae19c3d91fdc337378d00aebc5a6e8960a02a986ed229d6934f4208e6` |
| `/tmp/minion-12-07-admission-tests.log` | `eed90bb35e2bd233c9ce81a67429d11db147debc77a7faf5d2ca1a863271ecf0` |
| `/tmp/minion-12-07-development-tests.log` | `ce31431ed7c1760030405f87b1229d1a80426e0d16a2197e1cac4596c87f40ae` |
| `/tmp/minion-12-07-malformed-test.log` | `34d635adfae4663470f35d3d47dd7da0ea3bec2efea7eca9e165a1d0de2b131e` |
| `/tmp/minion-12-07-malformed-fixed.log` | `56965d3704d76447075ccc20f1d864b76f847e6c16afbdc61c934d7b9d83284c` |
| `/tmp/minion-12-07-cli-regression.log` | `bcd2fd1211fa75073778b6e703739ff214358ec8fc3b1950754bdd361a62b64b` |
| `/tmp/minion-12-07-control-red.log` | `a91fe79f0b7a12f1dcdc25baa3f5e835d62c746e5fb88b4c3debe534d7660edc` |
| `/tmp/minion-12-07-control-green.log` | `656f3fd8abedaa5a9264868ab678ac17e12c527e746bdcc2aea42cf13d592c9a` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-u8ohpW/process.json` | `dd9fa46142a8deebe4ad6e6764ce5b2a0585b76ef3c6bba4621d3e20868c9afb` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-u8ohpW/evidence/profile.v8.log` | `e95f2af43d614256bd3d2304b97ecfb41375ed04f6ad61d023fb8c9c0d39b3d5` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-u8ohpW/evidence/isolation.json` | `195dbcb7b68083c2a07677b22f9b1aabbf196dcced725255758cdda097972f42` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-Fb9alC/process.json` | `3f40e55dfb2a5ba7d196c695a0706d5397c48fb56af2ac9799368cf89984a413` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-Fb9alC/evidence/profile-decoded.txt` | `dbfe4668489bba253bdec886a30a3b499364a66ed4a466e94ce42e838742b3d0` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-Fb9alC/evidence/profile-decoder-stderr.txt` | `9027f1b28020c2f484def167a0b875a758724ef58fbf18b620b7fd28f8d3fce2` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-6bBf4R/process.json` | `b955e28a5ff17c9ef0f863598fafbc6e3f512b201a1965e50199640017752136` |
| `/tmp/minion-profile-qualification-11w6Ir/minion-contained-run-HVqfWI/process.json` | `a8f5402aa4aa0602a3daf57382fd492fb4b7e9b7f7329339d55d738937a84001` |

The existing source TODO and root-owned QC proposal retain the real packaging/asset/independent-admission gates. Reaper RSS attribution and the earlier auxiliary command-line matcher remain unfixed and are excluded from this CPU evidence. No application hotspot, build cause, dependency acceptance, deployment completeness or EN/ES behavior is established by these synthetic tests. DEP-01/DEP-02 stay open. Root owns independent review and any actual Task 3 resource release.


## 12-07 Task 3: one messages profile and one isolated decode

The admitted experiment is finished. Root independently passed 20/20 tests in 69.049 seconds, verified the three frozen source hashes and released the resource window. The experiment used exactly those hashes recorded above. No source, profiler flag, IO/analysis option, artifact, package/lockfile or resource limit changed. No retry, additional entry, full build or product repair ran.

The candidate retained the complete inventory SHA-256 `874bf5e4c26952e8798a33e1cb56cae2e898d5a1fed0cd531e5582e2754feebb`, matching the 12-06 original/copy equivalence receipt. Its selected messages module remained 5,806,942 bytes, SHA-256 `a9d9bcff5797ad43acc3273a6f21534eb0e8e94cea57e2b6403ff35342c79334`. Runtime identities matched the qualified synthetic fixture. Both launches independently passed the namespace/privilege/nonce gate, read-only-root/artifact checks and zero-connection network proof. Complete artifact/runtime inventories were unchanged after each launch; the decoder's pinned raw input was also unchanged. All recorded owned PIDs were absent after cleanup, and launchers/listeners closed before the heavy window was released.

| Launch | Outcome | Preparation | Preflight | Namespace setup | Child duration | Postflight | Recorded total | Outer wrapper |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Candidate messages profile | Timeout, no final closure | 4.915s | 2.511s | 0.007s | 60.025s | 2.645s | 65.189s | 70.168s |
| Isolated built-in decode | Decoder completed | 5.230s | 4.084s | 0.007s | 1.070s | 3.752s | 8.914s | 14.233s |

Each launch had the unchanged 60,000ms/2048MiB limit. Preparation is separate from the recorded total; inventory/hash work remains outside the child deadline. The profile closed with SIGTERM after timeout, without output-cap or write-error flags. The decoder exited zero with bounded output. No OOM was reported. The profile's `peakRssKiB` remains reaper-only and is not interpreted as Node-worker memory.

### Coverage and observed stacks

The profile retained **4,201,827 bytes**, first received at 26ms and last at **3.570 seconds**. No later profiler bytes arrived during the remaining **56.455 seconds** before child close. Its journal contains one logical read of the messages module, at worker elapsed 1.986 seconds, and no subsequent hook event. There is no final nft file/reason closure.

The raw profile is preserved byte-for-byte. Its last 65 bytes were an incomplete record; only the derived decoder input drops that tail, leaving 4,201,762 bytes with a separate hash. The built-in decoder read 3,248 code records and 2,801 tick records. Its summary reports 171 unaccounted ticks and zero excluded ticks. Decoder stdout is 33,111 bytes; stderr is 207 bytes and preserves both Node's VM-module warning and `Dropping unknown tick frame: overflow`. That dropped frame is an additional attribution limitation, not evidence that the record was repaired or that a complete stack is available.

| Decoder summary | Recorded ticks | Meaning and limit |
|---|---:|---|
| Shared libraries | 2,606 | Includes 2,503 ticks attributed only to libc and 97 to libcrypto; native function detail is unresolved. |
| JavaScript | 24 | Primarily initialization/loading or engine builtins in the captured window. |
| C++ | 0 | Native C++ function attribution was absent from this report; this does not mean no C++ work occurred. |
| Unaccounted | 171 | Preserved as unknown. |

The built-in bottom-up report includes module compilation/loading, worker isolation hashing, nft module initialization and Acorn's `wordsRegexp`/`buildUnicodeData` initialization. It does not identify the messages parse, scope attachment or AST-walk stage. The libc total does not identify its native functions or justify attributing the full timeout to a system library. The synthetic hot-function qualification was useful, but this real captured window is insufficient for the intended application-stage decision.

`decode_complete` means the bounded log was decoded with some attributed samples. It does **not** establish coverage of the target analysis interval. No samples or timing are invented for the unobserved remainder, and no packaging OOM cause or dependency regression is established. The relevant next decision is how to establish target-stage coverage (or separately admit faithful upstream-stage timing), preserving bounded execution and asset semantics. It is not yet a product repair choice. Root received the exact coverage TODO/proposal wording for the launcher receipt site; source remained frozen throughout this experiment.

### Real-run evidence identities

Profile directory: `/tmp/minion-profile-real-12-07-2nOX8i`. Decode directory: `/tmp/minion-profile-decode-real-12-07-G5yyUt`. Full process records contain the artifact inventory, runtime file identities, input/control/mount arguments and parent/worker proof. Both raw original and derived profile inputs remain available locally.

| Evidence | SHA-256 |
|---|---|
| `/tmp/minion-12-07-root-tests.log` | `c45d7d538f7c590bff240a0b07f7776c034463e81cbfb103612bf38ece1a2ca5` |
| `/tmp/minion-profile-real-12-07-2nOX8i/input.json` | `39d8c84244254f22cb78c303799f4a999788d043a36557432260183c25e462a2` |
| `/tmp/minion-profile-real-12-07-2nOX8i/process.json` | `af0a17454286da793d6410b582a9fabc05c611024ea385719867595c0d341a29` |
| `/tmp/minion-profile-real-12-07-2nOX8i/evidence/isolation.json` | `36063b3bee92d2db5b9376b0037d345a67eb7bb6648ab31d943d2c4552e605e1` |
| `/tmp/minion-profile-real-12-07-2nOX8i/evidence/events.jsonl` | `db0f95d0c4a3e146f2d671b8514688c65faf4b51ecf6b2ea39e6d2b9dcfbeaf4` |
| `/tmp/minion-profile-real-12-07-2nOX8i/evidence/profile.v8.log` | `b7addee631825989b17b48e6394eb3f4403bee926644a872dfdd6267a68bc2a8` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/input.json` | `bb42a4dc0142f0dc849ee33112b07c25890315d7cf5f2caed25edc8d8aab9292` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/process.json` | `76721ecc2db65ddf88f29a3664c89ba5acae889dcdec640f19940eee0530e8c7` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/evidence/isolation.json` | `4c962d3dab7be4f07ac9b30c4f2361fe04a33841571bbf552b90d8a06ff7d01b` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/profile-input.log` | `b7addee631825989b17b48e6394eb3f4403bee926644a872dfdd6267a68bc2a8` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/evidence/profile-input.json` | `a430dc908cb906cb64292e4fcd35fdd9401335735cb998265f18be537924c841` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/evidence/profile-complete.log` | `f23ebf7a8ed26cc8c9425e51b04fc8bfa4a7faf45e1ab7af699f54beafbd416f` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/evidence/profile-decoded.txt` | `25df895bdb5902b09e33d38c2c80f967acd1b311becd371e47163d77f2b1f549` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/evidence/profile-decoder-stderr.txt` | `e2a6112207b567fc1c1832122f911ad56f940e30def602bac7b1bd68a860cb78` |
| `/tmp/minion-profile-decode-real-12-07-G5yyUt/evidence/trace.json` | `d800c47bfa577dfff4aaa4785e92597c0b9b86973c1029af0107503af575a8e8` |

The real-profile acquisition gap, missing final closure, external setup-script ownership, full packaging/EN-ES qualification and reaper RSS defect remain open. DEP-01/DEP-02 remain open and the candidate dependency patch remains unapplied/unaccepted. Root owns the next admission and the dual source/proposal handoff. The heavy-resource window has been released; no further experiment is authorized by this receipt.
