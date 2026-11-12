---
spec: 2026-11-12-agent-current-attempt-output-spec
pass: 2
verdict: approved
reviewer: independent-gateway-review-and-root
created: 2026-11-12
---

# Current-attempt output contract review

Reviewed exact spec SHA256: `cccf3f844a8c60faa37e1c40e03cbe624b72aed32ff94cb7491dff5039cac462`. The retained independent report is `.local/agent-chat-fixes-2026-11-10/stale-attempt-probe/spec-pass1-review.md`, SHA256 `9c13cd37e2768aeb948d32ef032c2f8ce792cf1acbddf88cbb392cb08de82742`. This records approval of the bounded implementation contract, not source/CI/merge/deployment qualification.

## Pass 1 — independent review

**Standards: PASS. Spec: PASS.** The independent reviewer authenticated actual same-repository [PR373](https://github.com/NikolasP98/minion-ai/pull/373), branch `fix/current-attempt-output-qualification`, exact canonical DEV base `cc90bffde6033d8b6540464006b914905784500e` and normal signed docs-only reservation `4d2b7c3ce29ac33104d18792a35c8c428bcccef8`. All22 old-input table cells were verified against actual CC90/EB objects, including absent paths. Payload/outer-run source parity was checked separately.

The native local reproduction is one clean RED cancellation regression plus seven passing current-text/tool/compaction controls. It uses real SDK AgentSession, actual attempt, outer run and channel payload composition without fabricated attempt output or unhandled harness error. The separately skipped outer-timeout variant is not claimed as established behavior. This is local reachability evidence, not a production-user incident or passing repair acceptance.

The producer records the latest current COMPLETED handler-routed terminal message, including completed errors/aborts. Handler-routed means nonduplicate/subscribed identity, not successful stopReason. Partial updates cannot supply that receipt; a later completed error must not resurrect older success. Preserve completed current metadata across later partial starts and clear on actual `willRetry` generation reset. Existing payload terminal/protocol/error predicates remain responsible for delivery.

The runtime upper fence has six named runtime/regression paths; the technical upper fence has the original five proof paths. Exact touched subset and new blobs freeze after native implementation and before external qualification. The new SDK race test has a mandatory unit-discovered `.test.ts` name. Current usage/log/hook provenance and existing no-retry compaction behavior remain covered. Offline SDK/fake-provider controls are allowed; LIVE/REMOTE calls remain outside scope.

## Pass 2 — root review

**Standards: PASS. Spec: PASS.** Root independently read the exact final spec hash above and verified fixed PR/branch/base, all eleven old-input rows and six-runtime parity. Root confirmed the same producer semantics, fixed EB/history/classification boundaries and source custody.

After normal contract signature, the native No Mistakes process may author only within the six-file runtime fence. On that native/production candidate, old CI proof remains unchanged until the external combined source is qualified. External DEV373 may implement its bounded five proof files after signed scope and exact native runtime-byte availability, before qualifying itself; there is no circular already-qualified-code prerequisite. Existing owner S1 fix scope and normal automatic-publication authorization apply. No additional permission question, generic flag, baseline weakening, workflow change or future source self-SHA is introduced.

Original9ce/ed4/A0c, landed372/CC90 history, fixed main50/EB/workflow0d5, prior approved contract50bf and unrelated pending release artifacts remain unchanged. Exact new-content review, actual DEV/main CI, normal merge authority, publication/deployment and bounded runtime receipts remain separate requirements. Native source authoring begins only after the normal contract signature is verified; this review performs no source or pipeline action.
