# Hub pending-submission implementation evidence

Source candidate: `/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion_hub`, branch `feature/agent-harness-wave1`, based on `b677a5d91a2b653211a1655465b2b5fd398efc2a`. No commit, push, merge, deployment, production write, paid inference, or activation is part of this evidence.

Scope: approved spec `2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, Slices 1–2 and §4.1 preparation/transport boundary. Slice 3 accepted-run lineage and automatic UI-action authority are explicitly unfinished. A bounded AiOrb lifecycle repair was also authorized after the declared browser gate reproduced a teardown error in production component code.

## Result

Home and Floating capture actor, organization, agent, session, composer revision, page-context revision, and a UUID before preparation. Each awaited stage checks the current generation. A synchronous commit uses that UUID as `chat.send.idempotencyKey` and marks submitted only after the transport starts dispatch. Stop cancels preparation first. During preparation it does not abort an unrelated replacement run. For a displayed accepted run it captures the displayed agent/session/run synchronously and sends exact-run `chat.abort`.

Drafts and attachment references remain in their existing composers. Cancellation, invalidation and definite pre-send rejection retain the matching draft. An owner change clears the old owner's draft. Successful local submission clears only the matching composer revision. A lost acknowledgement retains the dispatched identity and does not trigger a new-ID resend. Acknowledgement errors and timeout recovery check the captured actor/scope epoch, selected run/session, live chat object and live client both before history recovery and when its awaited response arrives. A late history response cannot overwrite a newer same-session turn or recreate state after a gateway reset.

Page-context registrations now have opaque owner tokens, a monotonic revision and subscriptions. Equal-text old disposal cannot clear a newer owner. Current-owner disposal, route/focus changes and tool-registry changes increment the revision. File signing forwards an optional AbortSignal and never deletes the durable upload.

Home choice/artifact callbacks and Floating callbacks retain the full-envelope classifier bypass while using the same preparation ownership check. Automatic callbacks from accepted final events still require Slice 3.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Original declared dependencies, `bun install --frozen-lockfile` | PASS, parent-owned install | `../hub-install.txt` |
| Slice 1 focused tests | PASS, 8 tests in 3 files | `slice1-green.log` |
| Final focused tests, including actual Home/Floating mounted surfaces | PASS, 70 tests in 9 files | `focused-reviewed.log` |
| Actual mounted ownership/Stop matrix | PASS, 20 tests | `mounted.log` |
| Behavioral mutation red/restore green | Bypassing commit ownership and reverting to equal-text disposal caused 3 expected failures; restoring exact sources passed 9 tests | `mutation-red.log`, `mutation-receipt.json`, `restored-green.log` |
| `bun run lint:design` | PASS, no changed file increased governed debt | `lint-design-reviewed.log` |
| `bun run lint:tokens` | PASS, zero violations | `lint-tokens-reviewed.log` |
| Final `bun run check` | PASS, 0 errors and 0 warnings | `check-reviewed.log` |
| `bun run build` | PASS, exit 0; client boundary 0 violations and both real canary mutations rejected | `build-reviewed.log` |
| AiOrb mounted lifecycle red/green | Three expected failures before repair; 3/3 pass after captured-node and disposal fences | `orb-lifecycle-red.log`, `orb-lifecycle-green.log` |
| Adopted archive provenance and existing error recovery | PASS, 15 tests in 3 files | `dependency-provenance-final.log` |
| Full tests/architecture/final critical journeys | Running/pending | Recorded after execution |

The build retained nonfatal Paraglide vendor-telemetry timeout, Rolldown plugin timing and Vercel optional-dependency tracing diagnostics. No Svelte compiler warning was reported. This is a successful build with those diagnostics, not a claim that its output was warning-free.

The mounted matrix exercises Stop before dispatch; thread, actor, organization, agent and page A→B→A; busy rejection; replacement-run protection during preparation; and explicit Stop after switching to a different displayed thread or owner. It mounts the actual Home/Floating components and their actual composers, uses the real chat RPC helper, mocks the classifier and the transport leaf, and stubs unrelated Sentry/voice facilities. This is mounted component proof, not authenticated backend or production proof.

Transport tests also exercise a real closed GatewayClient with a stale connected UI flag, unsupported SDK rejection, caller-supplied run IDs, acknowledgement loss, exact-run abort, deferred acknowledgement/timeout history followed by a new same-session run, owner A→B→A after preparation finishes, detached chat state, and a replaced gateway client. Attachment tests verify in-flight cancellation without deleting uploaded content.

Fresh-clone setup failures are retained separately: the first focused invocation required `svelte-kit sync`; the first full check began before generated Paraglide messages existed and reported 647 errors. Neither result is counted as a behavioral failure or final candidate qualification. The two public PostHog static exports also required empty, non-secret placeholders in the isolated gitignored `.env`; no production credentials were added. The initial mounted collection required a standard Sentry mock for unavailable SvelteKit virtual modules.

## Shared SDK qualification boundary

The original declared `@minion-stack/shared` package has only asynchronous `request()`, which cannot expose definite pre-send rejection synchronously. The Hub now requires an additive `beginRequest()` capability; unsupported packages reject safely instead of claiming submission. The existing checked-in artifact convention is preserved. `package.json` and `bun.lock` now select the compatible repository-relative archive; normal Bun installation and a frozen install qualify the exact candidate:

- Archive: `deps/minion-stack-shared-0.9.0-agent-harness.e6e69bb92fd1.tgz` (same bytes as the parent-built source artifact; package version remains `0.9.0`)
- SHA-256: `e6e69bb92fd1200a5fb67816e5d800398d3d7c0784a4d11cd98df7c62eb7a8bd`
- Installed `dist/gateway/client.js` SHA-256: `5a422c062105db8f59572685ecfd804dd80127ae1c303936a5b28b3b45bfa8f8`
- Exact dependency/install evidence and original manifests: `dependency-contract/`.
- Checked-in `deps/shared-agent-harness-provenance.json` links source commit `71d2f8ebdf1b2668e80f55bc246a5d5ba6cee616` to every one of the 48 archive file hashes. Its tests require the complete archive file set and byte-identical installed files, preserve the prior signed receipt/baseline chain, check the exact 28 removed source-map paths separately from 24 historically excluded compiled test files, retain one-byte mutation detection, and retain public request/error recovery behavior.

This is a local package qualification and reproducible checked-in dependency adoption. It does not publish an npm package or authorize deployment. The original archive remains preserved; only the declared dependency changes. See `dependency-contract/relative-install.log` and `dependency-contract/relative-qualified.sha256`. The compatibility guard rejects older SDKs safely, but this candidate declares the SDK that implements the seam. Compared with the prior readiness archive, this artifact also carries already-committed protocol/envelope, hello and max-payload hardening. That installed-artifact blast radius requires the real-client WebSocket handshake/dispatch critical fixture qualification; unit tests alone are not its runtime proof.

## Separate reviews

Standards: strict TypeScript, Svelte 5 runes, existing semantic UI primitives, no new UI strings or permissions, no new global content store, no uploaded-file deletion, bounded preparation state, and no source changes in the original dirty Hub checkout. Design/token gates passed. Final broad qualification remains as listed above.

Spec: the Slice 1–2 ownership, revision, cancellation, explicit transport result, idempotency identity, draft preservation and exact-run abort contracts have executable coverage. Correlation telemetry, accepted-run lineage and the remaining reviewed slices are outside this implementation. No new automatic model calls or acting mode is enabled.

## Open ledger

Exact-site `TODO(handoff)` comments point to `proposals/2026-10-22-agent-decision-and-proactivity-experiments.md`: automatic accepted-final/UI-tool dispatch in `src/lib/services/gateway.svelte.ts` remains Slice 3; the default `current()=>true` in `loadChatHistory` remains a separate legacy manual/initial-load owner/request-generation follow-up. Assistant submitted-turn recovery now supplies a complete explicit guard, but this candidate does not claim all legacy history loads are fenced. The legacy-load comment was metadata-only after the independent submission-recovery reread. The bounded AiOrb, Stop fixture and archive provenance additions received separate independent source review. The parent owns the corresponding proposal ledger entries. Shared SDK adoption is completed through the qualified repository-relative archive.

## Bounded browser validation repair

The first host critical run built successfully, passed 17 browser cases and failed 13: 12 WebKit launches lacked host runtime libraries; one Chromium fine-pointer CJ1 exposed `AiOrb` reading `getBoundingClientRect` from its cleared Svelte canvas binding after teardown. The initial artifact and failures remain in `critical-run/` and `critical-host.log`. AiOrb now captures its mounted node and ignores queued resize, intersection, animation and motion callbacks after disposal or context loss. Cleanup still disconnects observers, cancels animation and releases the GL context. The three mounted lifecycle regressions first failed against the old implementation, including the exact null dereference, then passed after repair. No visual styling changed.

CJ2 now retains its original handshake/send/final checks, then sends a second explicit turn, stops its exact session/run once, checks terminal acknowledgement and no replay, and sends a fresh turn with a new idempotency key to prove composer recovery. The synthetic WebSocket fixture rejects mismatched abort bindings. This keeps six cases per browser project and uses the installed real GatewayClient against a synthetic socket; it is not a live gateway or deployed authentication proof. Parent-owned official Playwright container qualification is recorded separately from host-library launch failures.
