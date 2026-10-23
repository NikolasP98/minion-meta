# A/F disposable Hub adapter protocol v1

## Ownership and purpose

A owns `tests/fixtures/critical-journeys/eval-adapter.mjs`, `eval-protocol.ts`, `EvalFixture.svelte` and the required changes to the existing fixture builder/transport. F owns `scripts/agent-evals/lib/hub-adapter.mjs`, which launches that explicit pinned Hub checkout's adapter. No Hub implementation is copied into meta; no dynamically discovered checkout, production URL, credentials or arbitrary command is accepted. C/F complaint inputs use a separate offline record contract.

The adapter is a test artifact, absent from production bundles/routes. It drives mounted actual Home and Floating, actual `buildAssistantContext` callsites, `turn-router`, `chat-rpc`, gateway final handling, `runner` and `model-context`. It reuses the existing critical-journeys build/serve ownership, fresh outputs, source manifests and external network denial. Test code may substitute transport/identity/provider responses; it must not copy the production routing or callback algorithms.

## Process contract

Launch the explicit `node <hub>/tests/fixtures/critical-journeys/eval-adapter.mjs --stdio` from that Hub cwd with a minimal allowlisted environment and no provider/business credentials. `--hub-root` in F must be absolute, real, nonsymlinked and match the manifest's source/lock/adapter hashes. Adapter readiness returns protocol `minion-agent-eval-fixture/v1`, source/lock/build/adapter hashes, disposable marker and supported features. F refuses mismatches before running an episode. Missing/dead/unqualified actual adapters fail the run; there is no fallback that fabricates acceptance, tool receipts or source provenance from a synthetic runner. F unit stubs are marked unit evidence only.

Use one JSON object per UTF-8 stdin/stdout line with `{version:1,id,type,payload}`. IDs correlate request/result; stderr is diagnostics without secrets. Types are fixed: `hello`, `reset`, `turn`, `provider_request`, `provider_result`, `transition`, `cancel`, `collect`, `close`, `result`, `error`. Validate each kind; reject unknown fields, invalid sequence, oversized payload or duplicate command IDs with conflicting bytes. Bounds derive from manifest episode max effort/payload bytes and adapter's fixed supported operation set. This is not an arbitrary JavaScript evaluator or shell interface.

- `reset`: episode ID, arm (`full|jev|core_discovery`), seed, persona/permission fixture ID, initial state fixture ID/hash, locale, revision descriptors. It creates a fresh browser context/runtime state, including lineage/tool registry/history/buffer; no prior arm storage. Return independently computed initial state hash. Same episode arms must match this hash.
- `turn`: one authorized fixture user turn/callback; source message identity is optional exact live evidence, never guessed. Actual mounted send code emits the production envelope through captured `chat.send`. The adapter exposes that request as a `provider_request`, then injects the shaped response through its normal WS final path. Tool operations mutate only disposable fixture state and emit independent domain receipts.
- `provider_request`: attempt request kind `main|classifier`, actual messages/state/questions and pinned request model/bound descriptor. F owns provider admission/transport. Browser fixture never receives a provider key. Classifier response traverses the actual `assistant-router.service.ts` parser with its injected fetcher (a test-side build/import bridge handles aliases); it is not predecoded into a fabricated RouteDecision by F.
- `provider_result`: bounded provider-shaped result/error plus requested/resolved/usage receipt fields; adapter sends matching WS events or route response. Test delays/missing ack/duplicate final are controlled fixtures. Invalid provider result reaches production validation and remains invalid.
- `transition`: only declared fixture actions (actor/org/session/page/tool revision, explicit user choice/artifact, compaction/history reload, scheduled held-tool release). No arbitrary URL, selector or script from untrusted model output.
- `cancel`: terminates further inference admission, invokes the same user Stop path and drains bounded already-received evidence. Accepted external inference may remain unknown; cancellation does not refund an unknown bill.
- `collect`: typed production observations, actual HTTP/WS/tool/domain receipt list, final disposable state hash, network boundary receipt and missing/unknown indicators.
- `close`: dispose only this run's server/browser/temp resources, preserve evidence root. Timeout/process death is an incomplete run, not success.

## Arm semantics

All arms use the same pinned main model, tool registry, persona, source fixture and episode turns. `full` uses existing `off` mode/full context; `jev` uses existing `enforce` plus actual classifier/parser. `core_discovery` is a fixture-only deterministic routing outcome that leaves the production core and existing discovery tools available, with no classifier inference. It must use `gateManifests`/the actual context builder rather than reimplementing their result. Record the selected manifests and actual context byte length for each arm. No production configuration mode or threshold is introduced. Explicit UI choice/artifact callbacks retain full-context bypass in every arm.

A's tests prove each arm reaches those production seams; F only selects the arm and checks the returned revision/state receipts. Tiny deterministic provider responses are software fixtures, not evidence that a model can solve these tasks. Live mode changes F's provider transport only; the entire adapter/tool environment remains identical and disposable.

## Boundary and receipts

The browser allows only the adapter's run-bound loopback asset origin. Synthetic HTTP routes and WS URL remain an explicit allowlist. Deny unexpected fetch/WebSocket/service-worker/external navigation calls and record attempted violations. Tool selection is restricted to each episode's allowed tools and actual fixture capability checks; forbidden tool invocation is a critical observed failure even if blocked. A tool return string alone is not a durable action receipt: mutation fixtures emit a receipt from the disposable store with action ID, owner/scope, before/after state hash, disposition and idempotency key.

Events include version/event ID/episode/arm/submission/root/parent/attempt links, kind, frozen revisions and observed timestamps. Domain receipts bind exact episode/run/scope/action; authoritative fixture acceptance differs from client-submitted intent. Raw fixture prompt/tool content is confined to the private run artifact under manifest retention, never normal analytics. F persists records before reporting completion. Missing adapter/network/domain receipts make that arm incomplete.

## Qualification

A: protocol tests plus mounted actual Home/Floating cancellation, duplicate final, awaited tool, context transition, callback and three-arm envelope evidence. Build provenance includes changed adapter and actual source modules; a source mutation that disables the real ownership fence must fail the safety scenario. F: real subprocess adapter round-trip, reset/hash validation, dead child/invalid record handling and missing evidence refusal. Integration needs the exact A source SHA, Bun lock and adapter manifest; F unit stubs alone cannot qualify the cross-repository adapter.
