# Tasks: Checked assistant outcomes

Owner approval: F1–F4 and F6, with retesting. No task below authorizes backup changes, protected-branch writes or production mutation.

## Phase 1: Setup

- [x] T001 Record the exact owner decision in `specs/111-agent-transcript-guardrails/spec.md`.
- [x] T002 Resolve the correction design and interfaces in `specs/111-agent-transcript-guardrails/plan.md` and `contracts/outcomes.md`.

## Phase 2: Foundation

- [ ] T003 Preserve gate custody, signing and canonical source scope in Gateway `.no-mistakes.yaml` and the release proposal.
- [ ] T004 Recover Hub committed and failed-phase changes without dropping fixes in `src/server/services/scheduling-bookings.assistant.test.ts` and `src/server/services/finance-summary.correctness.test.ts`.

## Phase 3: US1 — Trust output and admission

Independent criterion: real connection, extraction, normalization, speech and native persistence boundaries reject each approved failure and preserve their legitimate controls.

- [ ] T005 [US1] Add executable regression cases for device-free JWT node rejection and legitimate operator/paired-node admission around `src/gateway/server/ws-connection/message-handler.ts`.
- [ ] T006 [US1] Apply F1 admission restriction in `src/gateway/server/ws-connection/message-handler.ts`.
- [ ] T007 [US1] Reproduce and fix F2 at the real `extractAssistantText` boundary and its streaming/final consumers.
- [ ] T008 [US1] Reproduce and fix F3 channel metadata preservation in `src/tts/tts.ts` and existing reply normalization.
- [ ] T009 [US1] Reproduce and fix F6 whole-response speech validity in `src/tts/tts.ts`, including clean overrides and off/tagged/always modes.
- [ ] T010 [US1] Reproduce and fix F4 redaction/cap ordering in `src/agents/sessions/session-tool-result-guard.ts` with native persisted output.
- [ ] T011 [US1] Run focused and nearby Gateway tests, typecheck/build/check and independent review; record exact source in release evidence.

## Phase 4: US2 — Validate business requests

Independent criterion: synthetic request-to-SQL receipts demonstrate preview/confirmation rejection, no partial effects, open-day success and correct local finance buckets/cache behavior.

- [ ] T012 [US2] Retain Hub HR closure precedence and finance timezone fixes in `src/server/services/scheduling-bookings.service.ts` and the existing finance service.
- [ ] T013 [US2] Retain request-to-SQL regressions in `src/server/services/scheduling-bookings.assistant.test.ts` and `src/server/services/finance-summary.correctness.test.ts`; verify negative controls detect the old bugs.
- [ ] T014 [US2] Complete final Hub check/build/test/architecture and required remote CI; record any native-role limitations in the release proposal.

## Phase 5: US3 — Preserve bounded continuity

Independent criterion: prior memory/onboarding cases remain green at the final Gateway source and generation-limit boundaries remain disclosed.

- [ ] T015 [US3] Requalify settled-window, concurrent budget, lifecycle cleanup and optional-setup regressions under `src/memory/` and `src/agents/sections/`.
- [ ] T016 [US3] Retain exact-site sink/timeout/rotation handoffs and bounded-generation claims in the matching proposal.

## Final Phase: Release proof

- [ ] T017 Confirm canonical scoped PR diffs and preserve all prior signed fixes; update meta evidence and independent review dispositions.
- [ ] T018 Obtain required human security/data review and merge for the exact candidate; do not infer approval from a prototype count or draft PR.
- [ ] T019 Execute `audits/2026-11-06-agent-transcript-review/egm/production-verification-plan.md` and record exact deployed identities and safe runtime results.
- [ ] T020 Provide the verified production URL and bounded test steps only after the live/testable completion condition passes.

## Dependencies and parallel work

Setup precedes implementation. US1 and US2 are separate repositories and may proceed independently through their existing gates. US3 qualification follows the final US1 source. Within US1, T008/T009 share TTS state and must remain one coherent correction; T005/T006 and T010 use separate modules but still require integrated verification. Release tasks wait for every required source/review/CI gate. No new parallel worker is spawned by this task list.

## Implementation strategy

First close the explicitly approved Gateway failures without broadening backup scope. Preserve the already reviewed Hub fixes and exact test evidence. Then qualify final sources and present concrete PRs for human merge. Deployment/runtime verification is the final phase, not an assumed consequence of local success.
