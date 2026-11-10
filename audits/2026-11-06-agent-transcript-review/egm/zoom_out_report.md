# Stage 5 — Initial Zoom Out

Reviewer: /root/egm_zoom_initial. Native fresh-context spawn, fork_turns=none. Reviewed approaches-initial.md (same bytes as approaches.md at invocation). Status: completed. Verdict: changes required. Context sufficient. The eight slices mostly address stated causes without unnecessary infrastructure.

## ZI-1 — Major — Reset invalidation has no production lifecycle owner

Affected: approaches.md:36,40,118–122, C01/C08. The design promises session reset invalidates old extraction work, but only changes the attempt caller and extraction modules. clearSessionCursor has no production caller; references outside its definition are tests. Session reset changes sessionId after embedded-run cleanup (gateway/src/gateway/server-methods/sessions.ts:115–139,298–329). A new ID separates accounting but does not invalidate the old runner state. Detached extraction can complete a callback writing to the agent corpus. A synthetic clearSessionCursor call proves the primitive, not actual reset integration.

Correction: name the reset/delete lifecycle owner, reuse generation clearing there, and test deferred completion through that boundary. Alternatively narrow the promise to explicit runner clearing and retain reset integration as unfinished work. Current acceptance cannot stand unchanged.

## ZI-2 — Major — Text filtering occurs after audio egress

Affected: approaches.md:26–27,82–100,124–130, C06/C07. TTS audio is generated before reply-dispatcher sanitizes text. Anchors: gateway/src/auto-reply/reply/reply-dispatcher.ts:137–155; dispatch-from-config.ts:492,535,595,646; gateway/src/tts/tts.ts:915,951,991–1013. Supported secrets or DSML can already reach the speech provider and generated audio while the caption is clean. This existing text-derived egress path is not speculative media scanning; excluding image bytes does not address it.

Correction: apply the same policy before TTS summarization/synthesis, including separate ttsText. Keep final dispatcher filtering after later transformations. Add a synthetic speech-provider seam assertion. If audio is excluded, narrow the outbound invariant and record the remaining path.

## ZI-3 — Major — Ordinary tool syntax still silently disappears

Affected: approaches.md:26,84–88,128 and output-candidate.md C06. Desired behavior forbids filtering away the only reply. Candidate preserves ordinary-tool empty-result behavior and only provides failure for DSML. Dispatcher drops empty text-only payloads (outbound-sanitizer.ts:141–159,193–195; reply-dispatcher.ts:148–153). A protocol-only ordinary tool_calls answer still disappears.

Correction: preserve sanitizer empty-string contract if callers need it, but supply a shared invalid-output outcome at the terminal boundary. Recognized sole tool syntax should get a visible failure while intentional control suppression and legitimate media-only messages remain intact. Test both ordinary and DSML-only final replies through dispatch.

## Reviewer reading and reuse checks

Read persona/Zoom-Out Standard, full approaches.md, scratch.json, complete code-review README, output-candidate.md and relevant memory, bootstrap, booking, finance, redaction, reply-dispatch, reset and TTS source. Memory/hub candidate reports were absent when searched. Existing identity resolution, finance timezone helpers, booking preparation, logging/display redaction and extraction clearing were found. The output report sufficiently explains its redaction reuse tradeoff; duplicate utilities alone were not a finding. No tests/compilation, writes, or deployed-fix assumptions.
