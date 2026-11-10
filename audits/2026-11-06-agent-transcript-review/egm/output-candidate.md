# Output/onboarding candidate — scratch EGM experiment

Pinned input: Gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`. Scratch root: `/tmp/minion-agent-egm-20261106-971jwsz3`. Candidate only; no source-branch edits, commits, deployment, provider calls or production data. Synthetic fixtures only. No memory or raw chat read.

## C02: one personal-agent onboarding policy

`gateway/src/agents/bootstrap/bootstrap-files.ts` derives personal identity from explicit agentId or the canonical session-key resolver. This fallback matters: actual `run/attempt-env.ts` passes sessionKey but does not pass agentId. After hook/overlay resolution, personal runs omit the BOOTSTRAP setup ritual from returned bootstrap/context files and inject an explicit optional-setup policy. The policy supersedes workspace onboarding/personality rituals, permits authorized tasks immediately, keeps unknown facts unknown, and forbids inventing defaults/deleting BOOTSTRAP/marking completion merely because a task starts. Source workspace files are untouched. Other profiles retain the strict gate, completion state and explicit environment skip behavior. Existing permission/confirmation sections remain intact.

`gateway/src/agents/sections/identity.ts` makes the first authorized task take priority over personality/naming questions. Optional setup questions occur only on user request or when there is no task. Account-name guidance cannot independently reintroduce a naming interview.

Alternatives rejected: remove every profile's onboarding gate (too broad); add a nonblocking paragraph while retaining the loaded mandatory BOOTSTRAP ritual (conflicting instructions); mark onboarding complete or invent profile defaults (false facts/state).

## C06: bounded rejection of DSML final text

`gateway/src/channels/outbound-sanitizer.ts` recognizes the exact `<｜DSML｜tool_calls>`, invoke and parameter family. Any recognized DSML envelope invalidates the entire response, including mixed prose or code fences. This prevents an unsupported success claim outside a narrated invocation from surviving. Incomplete DSML is also invalid. The bounded failure explains that no tool action was executed from that text; no retry/model call occurs. Existing ordinary-tag sanitizer stripping retains its empty-result contract, while the terminal final dispatcher now supplies an explicit failure when actual invocation syntax was the entire reply. Intentional control-only silence and media/channel-data replies remain distinct. Normal prose, HTML and ordinary code remain readable; literal DSML tool envelopes in educational examples are still classified as protocol contamination.

Alternatives rejected: execute narrated protocol (authority violation); silently drop a complete answer; model retry in this local boundary candidate (unnecessary provider dependency). The initial DSML-only failure policy was superseded by ZI-3 terminal-boundary fallback, without changing the low-level ordinary-tag sanitizer empty-string contract.

## C07: mandatory final persistence and egress redaction

New `gateway/src/security/explicit-secret-redaction.ts` is pure and configuration-independent. It moves the sanitizer's existing high-confidence credential shapes into one shared vocabulary, adds fine-grained `github_pat_`, explicit TOKEN/PAT/API_KEY/SECRETS_KEY/PASSWORD and related key families, Bearer tokens/private-key blocks, and credential URLs. Text assignment handling supports unquoted/quoted/JSON forms, prose prefixes and URL query assignments. Structured details recurse through arrays/plain objects, redacting explicit credential strings and text while retaining schema objects, normal identifiers, receipt values and non-plain values. There is no entropy or long-hex heuristic.

`gateway/src/agents/sessions/session-tool-result-guard.ts` redacts text blocks and details immediately before the underlying append, after both optional transforms and the final before-write plugin hook. The same invariant covers synthetic missing results and plugin-produced toolResult messages. Text/image blocks keep their protocol shape; image bytes and call IDs are untouched. Input messages are not mutated. Existing block hooks can still prevent a write. Egress uses the identical pure text helper.

Existing `logging/redact.ts` was inspected but not reused: its configurable off/custom modes and partially retained token prefixes/suffixes do not provide a mandatory full-redaction invariant. `security/mask-key.ts` and its `leak-detector.ts` pattern source were also inspected. `maskKey` is intentionally partial display masking, unsuitable here. `redactCredentials` does use full replacement, but its current vocabulary omits fine-grained github_pat_, named PAT/SECRETS_KEY and short explicit credentials; its generic patterns consume field syntax, its PEM pattern matches only the header, and it reconstructs expressions with `g`, discarding original case-insensitive flags. It also exposes no redaction count or structured-details traversal. Therefore simply calling either existing API does not meet this candidate's contract. A future consolidation can extract a pure common vocabulary and preserve the independent logging/display/HTTP contracts; this scratch candidate deliberately does not alter those unrelated consumers. This is an explicit reuse tradeoff, not a claim that no existing redaction utilities exist.

## Executable evidence

Commands ran from the scratch root using its reused node_modules:

- `./node_modules/.bin/vitest run --config vitest.config.mjs tests/output-candidate.test.ts --reporter=json --outputFile=output-red.json`: baseline 24 tests, 19 expected failures / 5 positive controls passed.
- Extra boundary tests exposed 7 further failures (fenced DSML, assignments hidden behind prose/URL prefixes, Bearer, default persistence of those forms); `output-edge-red.json` records 24 passing / 7 failing cases before refinement.
- `./node_modules/.bin/vitest run --config vitest.config.mjs tests/output-candidate.test.ts tests/output-existing.test.ts --reporter=json --outputFile=output-regression.json`: final **47/47 passed**, comprising 32 candidate cases and 15 existing sanitizer cases.
- `./node_modules/.bin/tsgo --noEmit --module nodenext --moduleResolution nodenext --target es2023 --skipLibCheck gateway/src/security/explicit-secret-redaction.ts gateway/src/channels/outbound-sanitizer.ts`: passed. This is an isolated two-module type check, not a gateway build.
- `./node_modules/.bin/oxlint` over all 7 owned source/test files: 0 warnings, 0 errors.
- `./node_modules/.bin/oxfmt --write` over those files: completed using formatter defaults (scratch has no formatter config).

Native SessionManager regression imports were attempted and blocked before their assertions ran. Exact error: `"./providers/all" is not exported under the conditions ["node", "development", "import"] from package /tmp/minion-agent-egm-20261106-971jwsz3/gateway/node_modules/@earendil-works/pi-ai (see exports field in /tmp/minion-agent-egm-20261106-971jwsz3/gateway/node_modules/@earendil-works/pi-ai/package.json)`. Shared dependencies were not changed. The final existing-suite wrapper contains only the runnable sanitizer suite. The candidate guard checks execute the actual installSessionToolResultGuard with a synthetic underlying append sink; they do not qualify the real SDK's disk serializer.

## Two-axis self-review and limits

Standards: owned scratch files only; no any/@ts-nocheck added; pure explicit boundary helper; immutable messages; package tooling reused without changes; no config/permissions/confirmation relaxation.

Spec: C02/C06/C07 candidate behaviors covered, including explicit/session-key personal identification, non-personal strict policy, complete/mixed/incomplete/fenced DSML, explicit keys/JSON/URLs, normal identifiers/schemas/images/receipts, mandatory default persistence, transformed/plugin outputs, synthetic results and hook blocking.

Material limits: this is a design experiment, not a production fix, approved spec, full build, installed-package qualification or deployed runtime proof. Prompt assembly is deterministic proof of policy consistency, not proof of a live model's tool choice. DSML handling is at egress only; provider-adapter validation is outside owned scope. Redaction covers the explicit vocabulary listed above, not every possible credential or arbitrary encoding. It does not scan image bytes, revoke historical credentials, restrict process-environment tool access, rewrite existing transcripts, or qualify other export/persistence paths that bypass this guard. Root owns the proposal/design decisions and any production follow-up ledger.


## EGM follow-up: ZI-2, ZI-3 and mixed-success-receipt criticism

Read the complete initial zoom report at `audits/2026-11-06-agent-transcript-review/egm/zoom_out_report.md`. The reviewer established that generated audio precedes final visible-text sanitization. The initial candidate therefore did not protect this existing text-derived egress path. The design critic also established that preserving mixed prose could leave an unsupported “Booked successfully” claim after removing its unexecuted DSML invocation. Both were substantive changes to the initial candidate, not merely documentation changes.

Additional ownership: `gateway/src/tts/tts.ts`, `gateway/src/auto-reply/reply/reply-dispatcher.ts`, `tests/output-egm-boundaries.test.ts`, and existing sanitizer source/tests.

- The sanitizer now rejects the entire DSML-contaminated response. A specific exported `sanitizeTerminalFinalText` helper adds `invalidToolProtocol` metadata while keeping `sanitizeOutboundText`'s existing ordinary-tag empty-string contract. It distinguishes actual invocation syntax (tool tags/fenced machinery/JSON actions/tool IDs) from mere `[[control]]`, TTS and vote metadata.
- The real dispatcher classifies the original terminal-final body before presentation prefixes can disguise an empty protocol answer. It retains its final post-normalization sanitizer. Fallback applies to text-only terminal finals. Intentional NO_REPLY/heartbeat/control-only silence, nonterminal ordinary tool stripping, media-only and channel-data-only deliveries remain usable.
- `maybeApplyTtsToPayload` parses legitimate TTS directives first, retains provider overrides, sanitizes visible caption text and separately parsed `ttsText` before any summarizer/speech provider, and rejects original mixed DSML output rather than retaining an unsupported caption claim. A model-generated summary is sanitized again; the final speech text is checked again after Markdown formatting. Ordinary protocol-only summaries produce no speech. Existing media suppression and disabled/tagged behaviors remain intact.
- The tests execute the actual TTS payload pipeline, actual TTS directive parser, actual speech-provider routing function, actual dispatcher, normalization and registry. Summary and speech exports are synthetic stubs. Model selection/drone host, heavy channel registry and unrelated user-facing error formatter are isolated mocks. Global fetch throws. The speech stub observes the exact text sent by the real TTS routing path; real temporary audio directories are removed. These tests prove the local path with stubs, not an audio provider or channel deployment.

Additional red/green evidence:

- `output-egm-red.json`: initial boundary candidate **8 failing / 10 passing** (18 cases), proving immediate speech leaks, separate spoken override leak, unfiltered summary, ordinary protocol-only final disappearance, channel-data suppression, and mixed DSML success receipt.
- `output-egm-edge-red.json`: **1 failing / 19 passing** (20 cases); configured response-prefix text concealed the protocol-only condition until classification was moved to the original final body.
- `./node_modules/.bin/vitest run --config vitest.config.mjs tests/output-egm-boundaries.test.ts tests/output-candidate.test.ts tests/output-existing.test.ts --reporter=json --outputFile=output-egm-green.json`: **67/67 passed** = 20 new EGM boundary cases + 32 candidate cases + 15 native sanitizer regressions.
- Isolated helper/sanitizer `tsgo --noEmit --module nodenext --moduleResolution nodenext --target es2023 --skipLibCheck` passed after helper changes. This does not type-check/build the entire TTS dependency graph.
- `oxlint` over all 10 owned TS source/test files: **0 warnings / 0 errors**; formatting completed using scratch defaults.

Revised review: Standards retain scratch isolation, pure full redaction and existing permission/confirmation behavior. Spec now covers the requested TTS/dispatcher seams and fail-closed mixed DSML policy. Root remains responsible for fresh independent review and the meta-repo proposal ledger.

Explicit limits/TODO handoff: the qualified audio entry is `maybeApplyTtsToPayload`; direct `textToSpeech`, `textToSpeechTelephony`, custom channel/audio delivery and other paths bypassing this entry/dispatcher are not covered. Exact-site `TODO(handoff)` comments now identify the direct speech/telephony entries and dispatcher coverage limit, pointing to `proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md`. Root owns updating that proposal. This does not prove all egress/export paths safe, scan arbitrary media, validate a live model/provider, or qualify actual audio output. The earlier SDK dependency-export limitation remains unchanged.

## Stage 9 correction superseding the initial 67-case result

IR-1 (Major) and CD-1 (Blocker) independently found a gap between disabled TTS and terminal dispatch. The off branch erased ordinary tool-only text before the dispatcher could classify it. The classifier selection now precedes both enabled and disabled TTS branches. Four new chained tests compose the actual TTS result with actual dispatcher for off/always/tagged modes and disabled controls/media/channel data. `stage9-composition-red.json` records1 fail/23pass before correction. The focused corrected output boundary run passes24 cases. This supersedes the prior20-boundary-case count, not the preserved original red evidence. Root also corrected an initially misplaced local edit caught by tests; it was not a passing candidate. Final aggregate results are authoritative.
