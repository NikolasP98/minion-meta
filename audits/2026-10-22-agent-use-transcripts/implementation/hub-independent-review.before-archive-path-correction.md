# Hub Slices 1–2 independent review

Verdict: PASS for A01/A02 source scope after recovery corrections. No remaining definite blocker found. This is an independent read-only review; reviewer made no Hub product/test edits and launched no heavy Hub process. Required broad check/build/test qualification remains the implementing agent's responsibility and is not inferred from source review.

Reviewed isolated candidate `/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion_hub`, branch `feature/agent-harness-wave1`, base `b677a5d91a2b653211a1655465b2b5fd398efc2a`. Exact changed/new file hashes are frozen in `hub-independent-source-manifest.json`. Nearest CLAUDE includes AGENTS; both were read along with UI design governance and approved spec §4.1/A01/A02.

## Standards

PASS for reviewed paths. Existing Svelte 5 and semantic-primitive conventions are retained. There is one small preparation owner module, no long-lived global copy of composer content, and no new permission field or paid/acting mode. File signing forwards cancellation without deleting durable uploads. Legacy `sendAssistantTurn` callers retain internally generated IDs; older unsupported SDKs reject before transcript changes. Optional exact-run abort remains compatible with old session-wide callers. The repository-relative SDK dependency follows the existing checked-in artifact pattern. `git diff --check` passes. Existing design/token logs report decrease-only changed-file debt and zero token violations; these are read evidence, not a reviewer rerun or authenticated visual proof.

## Spec A01

PASS. Pending records capture UUID, actor/org/agent/session, monotonic scope epoch, composer revision and page-context revision before asynchronous preparation. Page-context registration uses an opaque token: equal-text old disposal cannot clear the newer owner. Set/dispose/location and tool-registry changes advance revision. Scope invalidation preserves A→B→A history rather than relying on final string equality. AbortSignal is supplementary to current-generation checks. Commit performs its ownership check and dispatch synchronously, only accepts an explicit submitted result, and cannot commit twice. Stale finish checks object identity before clearing newer work. Teardown invalidates its generation.

## Spec A02

PASS after the findings below were corrected. Home and Floating recheck ownership after routing/signing awaits and retain the captured ID through `chat.send.idempotencyKey`. `sendAssistantTurn` uses the installed real SDK's synchronous `beginRequest` seam: definite rejection retains draft/transcript; acknowledgement loss retains submitted identity without automatic replay. Composers clear only matching revisions; actor/org changes clear old-owner text rather than restoring it into a different owner. Optional async/boolean ChatInput submission handling retains void-callback compatibility and preserves edits made during preparation.

Stop captures the displayed agent/session/run synchronously. Preparation Stop cancels first and does not abort an unrelated replacement run. A displayed accepted run uses exact-run abort; explicit Stop after switching to displayed B targets B, not a stale A identity. Choice/artifact callbacks retain full-context classifier bypass and use the same preparation ownership checks.

Final recovery predicates combine captured chat-object identity, captured SDK-client identity, run ID, selected session and the supplied surface scope epoch. The same predicate is checked before acknowledgement/timeout recovery and passed into `loadChatHistory` for its awaited result/finally. It remains meaningful after preparation finish and is invalidated by owner/context/teardown epochs.

## Findings and correction closure

1. **High — old recovery history could erase a newer same-session transcript.** Initial `chat-rpc.ts` checked run/session only before calling history, then omitted history's existing third `current` predicate. A lost A acknowledgement or 120-second guard could start a history request; B could submit before its response; A history could splice away B's optimistic message. Corrected by passing the captured predicate through both recovery paths. New deferred-history tests cover acknowledgement and timer variants.
2. **High — owner/reset recovery could mutate another generation of chat state.** Run/session string checks alone could survive actor/org A→B→A. A callback could also retain a detached old chat object after gateway reset deleted its dictionary entry, then `loadChatHistory` could recreate state for the current generation. Corrected with surface scope-epoch callbacks plus nonmutating `agentChat[agentId] === capturedChat` and `getClient() === capturedClient` checks. New tests cover owner return after finish, deletion before recovery, replacement during pending history and retained chat with a replaced client.

Both findings are closed in the hashed reviewed source. Reviewer supplied findings and correction suggestions only; implementer owns all source changes and test execution.

## Evidence inspected

- `hub/focused-final.log`: prior nine-file focused matrix, 64 passing tests; final expanded focused matrix is being rerun after recovery correction.
- `hub/mounted.log`: 20 mounted cases against actual Home/Floating components and composers, including Stop-before-send, actor/org/agent/thread/page A→B→A, busy rejection, preparation replacement-run protection and displayed exact-run Stop. Transport/classifier and unrelated facilities are mocked; this is mounted proof, not authenticated gateway/backend proof.
- `hub/history-recovery.log`: final correction-specific run passed 18 tests in two files, including owner/late-history, deleted/replaced chat and replaced-client cases. Implementer confirmed no source edits after final reread; final focused/check/build logs are `focused-reviewed.log`, `check-reviewed.log` and `build-reviewed.log`.
- Attachment tests exercise in-flight signing cancellation and durable upload preservation. Existing mutation-red/restored-green receipts establish sensitivity to ownership bypass and equal-text disposal regression.
- Real closed GatewayClient test proves stale connected UI state cannot invent submission. Shared independent review separately ran 392 tests against the matching SDK source.

## Declared SDK/artifact qualification

`package.json` and both Bun lock references select `file:deps/minion-stack-shared-0.9.0-agent-harness.e6e69bb92fd1.tgz`. SHA-256 `e6e69bb92fd1200a5fb67816e5d800398d3d7c0784a4d11cd98df7c62eb7a8bd`. The archived and installed `dist/gateway/client.js` match byte-for-byte at SHA-256 `5a422c062105db8f59572685ecfd804dd80127ae1c303936a5b28b3b45bfa8f8`. Frozen installation evidence is `hub/dependency-contract/relative-install.log`; exact dependency hashes and preserved original manifests are under that directory. This candidate adopts the artifact directly; no external npm release is needed for this checkout's declared dependency.

Compared with the previous readiness archive, adoption also brings existing source-level envelope/hello/protocol/maxPayload hardening alongside beginRequest. No executable archive path was removed; removed paths are source maps. Full shared tests support the source, but the mounted Hub tests do not certify a real authenticated gateway handshake or deployed identity. No publish/deploy claim follows from the local archive.

## Deliberate scope limits

Slice 3 automatic accepted-final/UI-tool callbacks and bounded accepted-run lineage are explicitly deferred, with an exact-site TODO in gateway.svelte.ts and the matching proposal ledger; they are not treated as an A01/A02 blocker. This review does not certify accepted-run replay/expiry/automatic-action authority. Parent must report full Hub tests/check/build/critical-journey outcomes separately and qualify any source changes after the frozen review manifest.

## Bounded appendix: AiOrb teardown and real-client fixture Stop

Standards: PASS for the four added review paths. Parent explicitly authorized this validation-enabling repair after a real Chromium critical journey hit a null canvas callback. This is a bounded component lifecycle correction plus test-fixture coverage; no visual/token, authority or production behavior expansion was introduced. Implementer confirmed these sources were formatted/final before review. Four exact hashes are under `boundedAiOrbAndStopReview` in `hub-independent-source-manifest.json`; earlier reviewed source hashes were preserved unchanged.

Spec/repair outcome: PASS by source and inspected narrow logs. `AiOrb.svelte` captures the mounted canvas, gates asynchronous callbacks by disposed/failed/current-node identity, and sets disposed before canceling animation/disconnecting observers. Cleanup releases the captured GL program/context. Queued resize, animation, intersection, motion and color-sync callbacks cannot dereference a removed bound canvas or restart GPU work after cleanup/context loss. The three mounted lifecycle cases reproduce the original null-canvas failures with the old implementation (`hub/orb-lifecycle-red.log`:3 failed), then pass with the repair (`orb-lifecycle-green.log`:3 passed). Reviewer launched no tests.

The critical-journey transport fixture now retains a bound active run/session, accepts exact `chat.abort`, clears its held final and emits an aborted reply only on an exact match. CJ2 inspects the actual sent session/idempotency ID, asserts the abort uses exactly that pair, observes the stopped reply, then submits a fresh explicit request and checks three unique request IDs with one abort and no implicit resend. It exercises the real SDK/client path over the fixture WebSocket, not a real provider or live gateway. The extended browser journey had not yet run at this review; its browser/build/full-gate result remains separate implementing-agent evidence. No remaining definite blocker found in these four paths.
