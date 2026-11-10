# Stage 9 — Implementation review, round 1

Native fresh-context reviewers, fork_turns=none, strict read-only. Target approaches.md108–149 plus explicit candidate patches/reports/source. All requested reviewers completed. Original severities retained. Verdict: changes required for the tested-candidate deliverable. These findings were discovered after the first227-test run; they demonstrate why isolated passing tests are insufficient.

## Readiness reviewer /root/egm_readiness

### IR-1 — Major — Disabled TTS erases terminal failure before dispatch

Affected: approaches.md128; tts.ts903–913; dispatch-from-config.ts595–625; boundary tests177–188,203–214. autoMode=off calls ordinary sanitizer; tool-only final becomes text:undefined. Real caller sends transformed payload to dispatcher, which can no longer classify original syntax and drops it. Existing tests covered disabled ordinary prose and direct dispatcher protocol input separately. Apply terminal classification in disabled branch before loss; preserve control/intermediate/media/channel exceptions. Sequential actual TTS-to-dispatch test must emit one failure without speech call, plus silence/media controls.

No Blocker from this reviewer. Exact patches/notes otherwise meet zero-decision rule; C04 and production boundaries now consistent. Source inspection only.

## Codebase reviewer /root/egm_codebase_details

### CD-1 — Blocker — Disabled TTS loses evidence required for terminal fallback

Same underlying mechanism as IR-1. Affected: approaches.md128; tts.ts903–913; dispatch-from-config.ts595–625; reply-dispatcher.ts131–159. Actual default-disabled route lacks promised visible outcome. Fix terminal policy in disabled branch and compose real pipeline in test. Severity remains Blocker even though IR-1 independently rated the same issue Major.

### CD-2 — Blocker — Gateway finance adapter silently substitutes defaults for explicit invalid dates

Affected: approaches.md140; finance-query-tool.ts49–64; tools/common.ts58–71; hub-common.ts108–112. Schema permits empty strings; readStringParam turns supplied blank/whitespace into undefined; hubGet omits undefined. Explicit empty dates become rolling default, and all-time plus empty date loses conflict. Distinguish property absence from explicit invalid input; reject before forwarding. Add adapter/route composition tests, including blank dates, all/date conflicts and true absence. Precision: hubGet itself preserves supplied empty strings; loss is in readStringParam.

### CD-3 — Major — Native preview negative acceptance cases missing

Affected: approaches.md136; native tests204–237; scheduling-bookings.service.ts288–332,590–600. Missing/foreign references and commit-after-preview conflict are covered, but preview rejection for inactive event/resource, same-tenant unassigned resource, soft-deleted contact and a slot occupied before preview are not. Add these five through actual preview with no-write/no-effect checks. Nearby shared tests do not establish assistant preview behavior.

Otherwise SQL evidence/limits are properly bounded: local predicates/native behavior are not deployed RLS or concurrent exclusion. No tests/builds/writes by reviewer.

## Style reviewer /root/egm_detail_style

IS-1 — Nit — SliceB126 omits identity.ts although candidate patch/manifest changes it. Name file and intended onboarding-policy change.

IS-2 — Nit — SliceC138 'limit is integer1..500 (default500)' is compressed. Use 'limit is an integer from1 through500, defaulting to500.' No Blocker/Major style findings.
