---
phase: 12-dependency-provenance
plan: "07"
status: bounded_profile_finished_stage_attribution_incomplete
requirements_completed: []
key-files:
  modified:
    - minion_hub/scripts/qc/trace-build-contained.mjs
    - minion_hub/scripts/qc/trace-build-contained-worker.mjs
    - minion_hub/scripts/qc/trace-build-contained.test.mjs
    - .planning/phases/12-dependency-provenance/12-BUILD-CONTAINMENT-RESULTS.md
---

# Plan 12-07: retained partial CPU evidence

Tasks 1/2 add fixed V8 statistical profiling to the existing contained launcher, with capped raw stdout and separate byte-bounded control stderr. The existing nonce/isolation/immutability gate remains mandatory. A closed offline mode exposes one pinned regular profile input read-only and invokes the installed Node built-in decoder after the same isolation proof. No package, application, parser, resolver, analysis-depth, IO or runtime-asset suppression change was made.

Final actual suite: **20/20 passed**, zero skips, exit 0, **70.644 seconds**. Syntax and Prettier checks pass. The synchronous five-second timeout retained code/ticks that Node decoded to the known synthetic hot function. Tests also cover normal profile/ordinary nft file/reason/asset/warning parity, missing required imports, truncated tails, raw/control/decoder limits, invalid inputs, isolation refusal and resistant-descendant cleanup. The CLI now returns success for useful decoding; malformed/all-unaccounted output remains unusable even if Node exits zero. The non-ASCII overflow regression failed at 83,348 bytes before the byte-based fix and passed afterward.

Two early 1.8-second attempts and one five-second development attempt stopped before proof/workload admission. Later passes do not establish their cause or guarantee startup timing. Root admitted five seconds total within the existing synthetic envelope; real limits remain 60s/2048MiB. Historical logs and raw-receipt availability limits are explicit in RESULTS. Native-symbol and statistical-sampling limits remain; the known reaper RSS field is not used as worker-memory evidence.

The final run retained 2,688,414 raw bytes and decoded 4,397 ticks with 111 unaccounted; the named synthetic hot function appears in the actual built-in report. These are harness qualification figures, not an application benchmark. Exact source/TAP/raw/proof/decoder hashes and `/tmp/minion-profile-qualification-11w6Ir` receipts are in [RESULTS](12-BUILD-CONTAINMENT-RESULTS.md).

Source was then independently accepted by root after a 20/20 rerun in 69.049 seconds. The following Task 3 receipt records the separately admitted experiment.


## Task 3 receipt

Exactly one unchanged candidate messages profile ran at 60s/2048MiB, followed by one isolated built-in decode at the same maximum bounds. Both passed same-launch proof and unchanged full artifact/runtime checks; the decoder input was unchanged, every observed child PID was gone afterward and the heavy window was released. No source changes, retries, other entries, larger budgets or full builds ran.

The profile timed out after 60.025 seconds. It retained 4,201,827 raw bytes but received its last bytes at 3.570 seconds, leaving the remaining 56.455 seconds without captured profiler output. The journal recorded the messages read without a final nft closure. The decoder completed in 1.070 seconds; its separate complete-line input omitted only the raw final 65-byte fragment. It reports 2,801 ticks, 171 unaccounted and an overflow-frame diagnostic.

The report is dominated by shared-library and initialization/loading frames, with no resolved native C++ detail and no identified messages parse/scope/walk stage. A successful decoder exit does not establish target-stage coverage. The synthetic qualification remains valid for its fixtures; this application result does not determine the full timeout or packaging OOM cause. No missing interval was extrapolated and the reaper RSS field was not used.

RESULTS contains exact raw/derived/process/proof hashes, separate preparation/preflight/child/postflight costs and the remaining coverage decision. Root received source-site TODO/proposal wording. Product repair, dependency acceptance, setup-script asset ownership, EN/ES deployment behavior and DEP-01/DEP-02 remain open. Source and candidate artifacts stayed frozen; no further experiment is authorized here.
