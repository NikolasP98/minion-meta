---
phase: 11-agent-lifecycle
plan: "01"
status: source_verified_review_pending
requirements: [AGT-01, AGT-02]
---

# Drone definition and asynchronous deadline slice

Implemented configuration snapshots using installed TypeBox cloning, preserving schema symbols and callback identity; record/array metadata is frozen without freezing caller objects. Callback closures and non-JSON schema internal slots remain explicitly outside this configuration guarantee.

Credential resolution, provider resolution/completion and tool execution now have abort-aware caller waits. Late completion does not admit another tool. TIMEOUT/ABORTED remains distinct from a receipt that effects were terminated. Native AbortSignal.any replaces accumulating manual listeners. Synchronous blocking code still requires host process isolation.

Default Vitest discovery excludes live tests. Dedicated live configuration requires DRONE_LIVE_TESTS=1 independent of credentials. README documents the paid invocation and execution boundary.

## Verification

- Definition mutation fixture red on old implementation (caller model changed admitted definition), green after snapshot:10 tests.
- Four new execution fixtures reproduced unbounded credential/provider/tool waits or pre-abort credential admission. Green after abort-aware waiting.
- Test harness correction: beforeEach returned the mock function, which Vitest interpreted as cleanup; an uncooperative mock then stalled the cleanup hook. Changed reset callbacks to return void.
- Full existing binary unit run `node node_modules/vitest/vitest.mjs run`:20 files,175 tests passed. No live providers or dependency installation.
- `node node_modules/typescript/bin/tsc --noEmit`:passed after source changes; final repeat passed. Default discovery with dummy credential returned20 unit files and zero live files; dedicated live config without opt-in rejected as expected.
- GSD `verify plan-structure`:valid,3 tasks,0 errors/warnings.

## Boundaries

No release/commit/worktree/branch changes. Pre-existing Drone WIP preserved. This closes the specific definition/default-test/async-wait defects in local source, not full AGT03–06 or deployed agent qualification. Independent spec/standards review remains pending; do not check off requirements until that review. Original proposal retains the broader manifest/governance/host responsibility work.
