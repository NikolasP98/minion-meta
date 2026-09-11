---
phase: 11-agent-lifecycle
plan: "06"
verified: 2026-09-09T05:38:48Z
status: gaps_found
slice_status: passed
score: 2/6 roadmap truths verified in this review
slice_score: 2/2 plan truths verified
requirements_verified_in_scope: [AGT-01, AGT-02]
requirements_completed: []
gaps:
  - truth: "Agent ownership, correlation and outcomes survive harness lifecycle changes."
    status: partial
    reason: "11-06 closes streaming admission and cancellation only; AGT-03/04/05/06 require their other phase-11 plans."
    artifacts:
      - path: .planning/phases/11-agent-lifecycle/11-02-PLAN.md
        issue: "Session admission is outside this source verification."
      - path: .planning/phases/11-agent-lifecycle/11-03-PLAN.md
        issue: "Durable lifecycle outcomes are outside this source verification."
      - path: .planning/phases/11-agent-lifecycle/11-04-PLAN.md
        issue: "Pinned real ACP conformance is not established by fake Drone hosts."
      - path: .planning/phases/11-agent-lifecycle/11-05-PLAN.md
        issue: "Governance/effect manifest qualification remains separately required."
    missing:
      - "Independent evidence for AGT-03 through AGT-06 before phase closure."
---

# Phase 11, slice 06: Independent verification

**Phase goal:** An admitted agent run retains its approved definition, one owner and a recoverable outcome across harness lifecycle changes.

**Result:** The two streaming implementation truths pass. The full phase remains open. This report does not authorize release or mark global requirements complete.

The existing phase-wide `11-VERIFICATION.md` explicitly retains lifecycle and conformance gaps. This is an initial independent review of 11-06, not a replacement for that phase-wide report. Source and tests were inspected directly; the implementation summary was used only to locate candidate identities and claimed boundaries.

## Observable truths

| Truth | Result | Direct evidence |
|---|---|---|
| Admitted nested definitions cannot be changed through the caller's original object | Verified in slice | `defineStreamingDrone` uses TypeBox `Clone`, recursively freezes records/arrays, retains callback identity and schema symbols; tests mutate model, fallback, output and callbacks and execute the admitted definition. The 11-01 nonstream implementation remains present. |
| Default unit runs exclude paid providers; host deadlines are explicit and tested | Verified in slice | Default config excludes `**/*.live.test.ts`; the separate live config requires `DRONE_LIVE_TESTS=1`. Both streaming APIs guard asynchronous admission and waits, and README explains cooperative effect termination. |
| Shells session ownership and correlation | Not verified here | Owned by 11-02; no full-phase pass inferred. |
| Durable disconnect/cancel/restore outcomes | Not verified here | Owned by 11-03; an in-memory terminal event is not a durable outcome. |
| Pinned real ACP initialization and cancellation | Not verified here | Owned by 11-04; no real harness/provider invocation occurred. |
| Governance/effect identity fixtures | Not verified here | Owned by 11-05; source deadline tests do not fulfill it. |

Both added plan truths also pass: streaming-schema snapshot/wait behavior, and regular streaming cancellation/cleanup parity. No scoped failed truth was found.

## Artifacts and wiring

| Artifact | Exists / substantive / wired | Evidence |
|---|---|---|
| `drone/src/async-boundary.ts` | Verified | `awaitWithAbort` checks before invocation, attaches settlement handlers, removes abort listeners, handles late rejection; `cancellableStream.return()` aborts before awaiting generator return; iterator cleanup is nonblocking. |
| `drone/src/streaming-schema.ts` | Verified | Public definition and execution functions use the helper at credential, iterator and final-response seams; admitted model/schema feed registry and final validation. |
| `drone/src/stream.ts` | Verified | Credentials, provider resolution, reads, final result and tool callbacks cross the helper. Abort checks after yields prevent a new tool/effect. Fallback stops after cancellation, emitted text/thinking, or candidate lock. |
| `drone/src/index.ts` | Verified | Exports both execution APIs and streaming definition/types. No dead alternate implementation was substituted. |
| Tests and README | Verified | Tests use synthetic host/provider promises, exercise stalled cleanup and late settlement, and count terminal events and timers. Documentation distinguishes caller completion from stopping remote effects. |

GSD `verify artifacts` passes 2/2 declared artifacts. Its key-link heuristic reports 0/4 because source uses relative `.js` imports rather than repository `.ts` paths. Manual inspection confirms both imports from `./async-boundary.js` and their actual calls. The plan's links to `define.ts` and `run.ts` are read-first comparison contracts, not claimed runtime imports; streaming code deliberately does not import either. This is a plan metadata/heuristic limitation, not an unwired runtime helper.

Level-4 dynamic UI data tracing is not applicable to this library slice. Its equivalent runtime trace is definition → credential/model → iterator → tool/final validation → yielded event and host telemetry; no static data replaces those sources.

## Behavioral spot-checks

| Check | Result |
|---|---|
| `cd drone && timeout 9s node node_modules/vitest/vitest.mjs run src/stream.test.ts src/streaming-schema.test.ts` | 32 tests, 2 files passed; reported duration 817ms. |
| Independent in-memory transpilation of `async-boundary.ts`, invoked with Node assertions | Four checks passed: pre-abort invokes no operation; abort removes listener; late rejected host promise is handled; consumer return interrupts a stalled read and executes cleanup once. No fixture/source file was written. |
| Scoped `git diff --check` | Passed for the streaming source paths. |

Reviewed suite cases cover model/schema mutation, TypeBox transform/symbol preservation, pre-aborted calls, stalled credential/model/next/final/tool seams, late success/rejection, first abort cause, return while pending or after a partial, no next tool and no duplicate terminal telemetry. A normal consuming caller receives one terminal event; a closed consumer receives no subsequent item and the host records `ABORTED`. The tests do not assert remote termination.

## Requirements and review axes

AGT-01 and AGT-02 have direct evidence for the streaming portion. Whole-requirement acceptance must combine this with 11-01 and its existing independent verification. AGT-03 through AGT-06 remain assigned to other plans in this same phase; they are not deferred to a later phase or silently omitted. All six phase requirements appear in the plan inventory; none is orphaned.

**Standards:** No new scoped blocker. Strict TypeScript boundaries and existing package versions are retained; no paid calls, dependencies, source edits, commits or production operations were performed by this verifier.

**Spec:** 2/2 scoped truths pass. Full phase cannot pass on these results.

**Anti-pattern review:** No placeholder, empty runtime replacement or unhandled cleanup promise found in the three source files. The intentional `catch(() => {})` in cleanup absorbs a rejected best-effort return; it does not discard the main result. `freezeMetadata` is duplicated with the nonstream definition helper, a small maintenance consideration rather than a correctness gap. Non-JSON internal slots, callback closure state and synchronous blocking work remain explicitly outside the freeze/deadline guarantee.

## Human and operational verification boundaries

No additional human test is necessary to accept this pure-library slice's tested contract. A real pinned ACP harness and actual transport/process cancellation remain mandatory in their assigned lifecycle/integration plans. Packaged and deployed consumers were not qualified; this report makes no release claim.

## Candidate identity

Drone HEAD at inspection: `0cdf5e6c127cc21c006ad33abf65ba8b9a112171`; dirty checkout means HEAD alone is insufficient.

| File | SHA-256 |
|---|---|
| `src/async-boundary.ts` | `2028076e3a6b8f7c22a1058306f81fd6664f0cf3dbd905f5e7c13dc6171f873a` |
| `src/stream.ts` | `6e6312334e15f1aab3d733fab7fa3d202be2765969fcb802cea9d7662768ecd3` |
| `src/streaming-schema.ts` | `be2afcb7b3a1ed8ce0644a5ff9c0466761922fe3fcc713664d9c60881ffde572` |

Verified by independent GSD verifier; no source changes or commits.
