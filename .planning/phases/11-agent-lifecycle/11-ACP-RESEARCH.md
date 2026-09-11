---
phase: 11-agent-lifecycle
plan: 11-04
status: research_complete_runtime_and_adapter_unqualified
scope: Task_1_research_document_only
requirements: [AGT-05]
execution_ready: false
researched: 2026-09-09
---

# ACP adapter and harness research

Replace the bridge's custom JSON-RPC dispatch with the official TypeScript SDK, subject to an exact dependency and fixture admission. Keep process ownership, deadlines, session mapping, permission policy and durable outcomes in the bridge. The current adapter is not sufficient for the official ACP lifecycle. No harness was executed, dependency installed, transcript/test authored, database opened, or product source changed during this research. AGT-05 remains open.

This fulfills only the newly admitted research-document boundary of 11-04 Task 1, whose observed PLAN SHA-256 is `070f715035c2d25ae9e4642634707db6c25610c6a44549a4621ee16dc3fc0ec6`. It does not fulfill Task 1's later executable transcript gate or Task 2's real-harness acceptance. Root instructions and the local engineering/writing skills apply; no nearer `AGENTS.md` or `CLAUDE.md` exists under `packages/shells-bridge`. The installed Hermes checkout's `AGENTS.md` was read before inspecting its source. All application/user environment files were left unread.

## Official contract versus current bridge

| Boundary | Official contract | Current source and consequence |
| --- | --- | --- |
| Initialization | Negotiate ACP protocol version and capabilities before session setup. | `acp-client.ts:65` only spawns; `bridge.ts:86` marks harness running before confirmed spawn/initialization and opens the gateway connection. Registration advertises a hardcoded method list at `bridge.ts:257`. Neither spawn nor gateway registration establishes ACP readiness. |
| Session identity | `session/new` returns the agent-owned session ID; supported load/resume operations require capability checks. | `bridge.ts:323–331` maps and sends the upstream caller's session ID directly. No `initialize`, `session/new`, `session/load` or `session/resume` exists in this adapter. |
| Prompt | `session/prompt` receives `prompt: ContentBlock[]`, respecting negotiated content capabilities. | `bridge.ts:331` sends `{ sessionId, input: params.input }`. Input translation requires a defined application contract; serializing arbitrary input into text would silently change semantics. |
| Agent requests | Permission is an agent-to-client JSON-RPC request and needs a response using its original ID. | `acp-client.ts:47–48` classifies every numeric-ID object as a response. A permission request with an ID colliding with a pending prompt can resolve that prompt with `undefined`; another numeric ID is silently dropped. A string-ID request is emitted as a notification, then ignored by the bridge. No permission responder exists. |
| Cancellation | Send a `session/cancel` notification; turn cancellation is confirmed by the original prompt response's `stopReason: "cancelled"`. | `bridge.ts:352` sends cancellation through `call`, adding an ID and waiting for a response that the notification contract does not provide. Its Boolean result conflates transmission/response with confirmed cancellation. |
| Timeout | A caller deadline is a local observation, not proof of remote termination. | `acp-client.ts:96–99` deletes the pending request after 60 seconds; `bridge.ts:335–337` emits an error and releases the run. The child may still be running, making the next admission unsafe. |
| Terminal semantics | A prompt response reports a stop reason; cancellation and normal completion are different outcomes. | `bridge.ts:333` passes the result to `emitFinal`, but `emitFinal` does not include it in the payload. Every resolved prompt currently becomes `final`, including a potential cancelled response. |
| Process cleanup | Process exit, closed stdio and protocol completion are distinct observations. | `acp-client.ts:115–128` resolves stop after five seconds even without exit. `index.ts:41–42` then exits the bridge. Async spawn errors emit EventEmitter `error` without a bridge listener; pending calls are not settled in that handler. |
| Input and output bounds | Validation and finite transport limits must be deliberate. | `acp-client.ts:136–150` trusts parsed values. JSON `null` reaches a property read outside the parse catch. Readline buffering, pending-call count and raw stderr/parse-error payloads have no declared size bounds. |

Initialization and session rules are documented by the [official initialization contract](https://agentclientprotocol.com/protocol/v1/initialization) and [session setup contract](https://agentclientprotocol.com/protocol/v1/session-setup). The [prompt-turn contract](https://agentclientprotocol.com/protocol/v1/prompt-turn) defines prompt content, completion and cancellation. The [tool-call contract](https://agentclientprotocol.com/protocol/v1/tool-calls) specifies permission request/response shapes.

Cancellation requires further separation. A permission response `{ outcome: { outcome: "cancelled" } }` resolves that permission request; it is not cancellation acknowledgment for the whole turn. A selected rejection uses the provided rejection option's `optionId`, not an invented Boolean. Pending permission requests must be answered when a turn is cancelled. Updates can arrive after cancellation was sent and before the original prompt settles. If completion wins a cancellation race with `end_turn`, record completion without claiming a cancellation acknowledgment. These protocol facts do not prove a provider or detached subprocess has stopped.

## SDK candidate and exact provenance

The official package is `@agentclientprotocol/sdk`, not MCP's SDK. Its stable entry point is ACP v1; experimental v2 and experimental HTTP transports are outside this repair. On 2026-09-09, the npm registry's `latest` metadata and the pinned source manifest both identify **1.4.0**. This is a candidate, not an installed or tested dependency. The older `ClientSideConnection` examples found in search results are not the current app-style API. See the [official SDK repository](https://github.com/agentclientprotocol/typescript-sdk) and [API migration note](https://github.com/agentclientprotocol/typescript-sdk/blob/main/MIGRATION_0.26_0.27.md).

| Identity | Observed value |
| --- | --- |
| Candidate exact version | `@agentclientprotocol/sdk@1.4.0` |
| npm `gitHead` | `e6463f444093ed7c5f1cc937c3f32afb5853e906` |
| Tarball named by registry, not downloaded | `https://registry.npmjs.org/@agentclientprotocol/sdk/-/sdk-1.4.0.tgz` |
| Registry integrity, not locally verified | `sha512-/eufudw+aFY1LKLolT6yFE6UMmYRl7fMJ/DEONSIyR6wI3slHWITBsANRGqXEY8FRzqUxwh7QEaGiZHcJPVThg==` |
| Registry SHA-1 | `01dd53874b97f50b325f9172a8f0714971e0d3ab` |
| License in source manifest | Apache-2.0 |
| Required peer | `zod: ^3.25.0 || ^4.0.0`; not dependency-free |
| Node engine declaration | Absent; the bridge's supported Node matrix still needs runtime checks |
| Registry provenance metadata | Attestation URL present; attestation content/signature not verified here |
| Moving upstream main observed separately | `c88bb0da97fe1059d4e3032df2724bf39c96f3d2`, commit date 2026-09-07 |

Metadata came from the [exact npm metadata endpoint](https://registry.npmjs.org/%40agentclientprotocol%2Fsdk/1.4.0) and the [pinned source manifest](https://github.com/agentclientprotocol/typescript-sdk/blob/e6463f444093ed7c5f1cc937c3f32afb5853e906/package.json). The bridge currently declares only shared and `ws` runtime dependencies. Its package links resolve through the existing root `.bun` layout despite the repository's pnpm convention. No ACP TypeScript package was found in the inspected bridge dependency directory, root dependency names or root lock text. This is a scoped local inventory, not proof of absence from every checkout or global store; no package-manager repair is authorized by this research.

Use the SDK's typed `client(...).onRequest(...).onNotification(...).connect(stream)` surface and `ndJsonStream` for stdio, with explicit application calls for initialization and session setup. It provides separate request/notification dispatch, schema mapping, connection closure and pending-response handling. Retain a small adapter interface around the process and the application mapping. No second general-purpose JSON-RPC parser is needed. [Pinned SDK source](https://github.com/agentclientprotocol/typescript-sdk/blob/e6463f444093ed7c5f1cc937c3f32afb5853e906/src/acp.ts)

Two source limitations prevent treating the SDK as the whole lifecycle solution:

- Its `SendRequestOptions.cancellationSignal` sends `$/cancel_request` cooperatively; the promise still awaits a peer response. It is not ACP turn cancellation, a deadline, or child termination. The source sends the request before checking an already-aborted signal, so the bridge must check its own admission/deadline signal immediately before dispatch. `close()` rejects pending responses but does not terminate a child. [Pinned JSON-RPC implementation](https://github.com/agentclientprotocol/typescript-sdk/blob/e6463f444093ed7c5f1cc937c3f32afb5853e906/src/jsonrpc.ts)
- The stream's `LineBuffer` retains incomplete chunks until a newline, with no byte ceiling in that class. An admitted finite byte guard must sit before SDK buffering, with output/pending-request bounds and safe fixed error reporting. Do not claim schema validation supplies resource limits. [Pinned line buffer](https://github.com/agentclientprotocol/typescript-sdk/blob/e6463f444093ed7c5f1cc937c3f32afb5853e906/src/line-buffer.ts)

## Harness availability and acceptance levels

No installed credential-free harness was established as able to complete the full initialize/session/permission/prompt/cancel gate. Presence on PATH is only executable discovery. No discovered binary, including `--help`, `--version`, Hermes `--check`, or a prompt, was executed.

| Candidate | Local/primary evidence | Qualification consequence |
| --- | --- | --- |
| Official TypeScript example agent, pinned SDK 1.4.0 source | `src/examples/agent.ts` at the npm gitHead simulates model/tool activity, has no provider credentials and uses real SDK stdio. It is not installed locally. Source SHA-256 `f33af92aa6ecc35c6fb7be9c14e1e62247974013158517a1c9521fa65a580f8f`. | Best bounded offline interoperability candidate after root admits isolated artifact acquisition/build. Expected compiled entry is `dist/examples/agent.js` from the pinned source tsconfig; artifact existence/hash must be verified before execution. It proves SDK interoperability with a simulated agent, not a deployed model harness. |
| Hermes | PATH resolves `/home/nikolas/.hermes/hermes-agent/venv/bin/hermes`. Editable install metadata: Hermes 0.15.1; Python ACP package 0.9.0 under Python 3.11 site-packages. Checkout HEAD `eb3cf9750eb8395c158be5cb929604041d1b03b5`. | A real installed ACP implementation, but not an immediately isolated credential-free gate. `entry.py:99–104,231–257` loads Hermes environment, discovers MCP tools and enables unstable protocol support. Sessions lazily use `state.db`; prompt builds the actual model agent. Any later run needs a clean private home/config, no external MCP servers, exact dependencies and a separately bounded model/transport fixture or explicit provider authority. |
| Codex | PATH resolves `/home/nikolas/.local/share/mise/installs/codex/0.153.4/bin/codex`; local package manifest identifies 0.153.4, x86_64-unknown-linux-musl. | This native CLI identity does not prove `codex --acp` support. The primary ACP integration is a separate [Codex ACP adapter](https://github.com/zed-industries/codex-acp/tree/v0.16.0); its latest release metadata observed v0.16.0. `codex-acp` was not found on PATH. Adapter/Core Codex compatibility and auth are unqualified. |
| Claude | PATH resolves `/home/nikolas/.local/share/mise/installs/claude/2.1.266/claude`; path-derived version, not executed version output. | The image's `claude code --acp` command is not established by that binary's presence. The primary [Claude Agent ACP adapter](https://github.com/agentclientprotocol/claude-agent-acp) is separate; it was not found on PATH. No exact adapter version or model authentication was qualified. |

The pinned official example is not a flawless acceptance oracle. At `agent.ts:198–199`, a cancelled permission returns normally from `simulateTurn`; at `:80–84`, `prompt` then reports `end_turn`. Cancellation while awaiting permission therefore has a source-visible path that fails the required cancelled stop reason. This is a static finding, not a reproduced runtime result. Its pending permission wait also needs the client's cancelled response to finish. Preserve this as a negative case: do not silently patch the upstream artifact and continue calling it unmodified upstream conformance. [Pinned example agent](https://github.com/agentclientprotocol/typescript-sdk/blob/e6463f444093ed7c5f1cc937c3f32afb5853e906/src/examples/agent.ts)

A concrete future offline command can be `/usr/bin/node <isolated-pinned-sdk-root>/dist/examples/agent.js`, with a private cwd/home and an allowlisted environment, after verifying the compiled artifact and its peer mapping. That path is a proposed artifact location, not a currently executable local receipt. A controlled project transcript server must additionally cover numeric and string request IDs, malformed messages, exact cancellation races and process closure. It remains a synthetic fixture. A full production-harness prompt gate is separate: first identify whether the selected provider can be exercised through an admitted offline transport; only an actual provider run introduces authentication and consumption-budget prerequisites. Missing credentials are not a reason to stop the offline work, and this research invents no paid permission request.

## Durable sender and startup contract

The following is the smallest integration contract recommended for the later sender; these are application requirements derived from the source gaps, not features supplied by ACP:

1. Construct a fresh adapter per child lifetime. Allocate an opaque process-generation identity before launch; bind the child handle, initialized SDK connection and all callbacks to that identity. PID alone is insufficient. Confirm spawn, negotiated initialization and the required authentication/session state before accepting work. Failed startup settles pending initialization and leaves admission closed.
2. Keep the upstream logical session ID separate from the agent-returned ACP session ID. Store their association with the process generation and exact active prompt identity. Gateway reconnect within the same live child must not manufacture a new prompt. Across child replacement, use only a supported, successfully completed load/resume operation; never replay an unresolved prompt automatically. Session history restoration is not proof of the old turn's outcome.
3. Journal admission before sending the prompt. Distinguish a locally rejected pre-send call from a call that may have crossed stdin. A write, deadline, stream failure or process loss without definitive terminal evidence leaves an unresolved obligation and retains the execution slot. Old-generation callbacks cannot settle or acknowledge the current generation's work.
4. Record cancel requested when the notification is sent; acknowledge only the corresponding original prompt's valid cancelled stop reason. A permission cancellation, local AbortSignal, five-second stop return, journal delivery ACK or WebSocket response cannot substitute for that evidence. The 11-07 journal stores bounded observations; it does not decide whether an ACP observation is authoritative.
5. Continue accepting in-turn updates until the prompt terminal boundary. ACP session updates do not carry the bridge run ID. After a timeout, do not reuse the same ACP session for a new run while old work is unresolved. A late arbitrary update from a nonconforming agent cannot be reliably assigned between turns merely by replacing map entries.
6. For shutdown/restore, observe actual child exit and closed/drained stdio, settle requests, and remove listeners. A stop deadline returns an unconfirmed state, not readiness for workDir replacement. Process-group/cgroup descendant cleanup requires its own admitted policy/evidence; direct child exit cannot certify remote effects were reversed or stopped.
7. On bridge startup, open the journal and inspect unresolved records before gateway readiness. Keep prior-generation obligations unresolved unless reconciliation supplies evidence. A new random generation is not proof that a prior process is dead. Define readiness separately from process alive, protocol initialized, session available and gateway registered.

The current ownership map in the older PLAN interface comment is stale: `activeRuns` is keyed by run ID, while `acpSessionToRun` is keyed by session ID. Preserve that distinction when drafting tests and avoid another incompatible identity store.

## Image/configuration gaps and exact next scope

The Dockerfiles are source templates, not installed-image receipts. Codex and Claude default to `latest`; the Hermes template falls back from a failed exact install to an unpinned install. The base tag is mutable, Node is installed from a moving setup endpoint, and its bridge-install command ends with `|| true`, which can mask earlier failure in the chain. These are reproducibility gaps. The Hermes header's `python -m hermes_agent.acp_adapter` differs from the installed package entry points (`hermes acp`, `hermes-acp`, or `python -m acp_adapter.entry`). None was executed here.

The base Dockerfile/comments claim `/etc/shells-bridge.env` is read by systemd, but the actual unit has `PassEnvironment` directives and no `EnvironmentFile`. Whether a deployed provisioner supplies manager environment is unknown; source alone does not establish startup failure in a live VM. `SHELLS_HARNESS_VERSION` is caller-supplied metadata, not a binary hash. `config.ts:65` splits commands on whitespace, and helper functions read `process.env` even when `loadConfig(env)` receives an injected object. Later fixture isolation must not rely on that injection to prevent ambient environment access.

Before source execution, root should admit these exact boundaries separately:

- **Protocol/adapter fixture:** `acp-client.ts`, a named ACP conformance/lifecycle test, the already planned transcript fixture, exact SDK plus Zod peer and exclusive package/root-lock ownership. Qualify stable v1 only, byte limits, pre-abort admission, permission IDs, connection close and stop-reason validation. Do not auto-allow permissions because the user authorized this QC project; runtime tool policy needs its own defined authority.
- **Bridge/sender integration:** `bridge.ts`, `bridge.test.ts`, and the sender-owned `config.ts`/config test/`index.ts` seams needed for async readiness, journal startup, logical-to-ACP session mapping and shutdown. These are required to fix actual call sites; changing `acp-client.ts` alone cannot repair `{input}`, upstream session identity or result projection without hiding application policy inside a generic transport.
- **Image/runtime qualification:** exact image Dockerfiles/service unit/provisioner configuration and pinned harness/adapter artifacts, through the owning container/release slice. No image edit, rebuild or rollout is implied by an offline transcript pass.

Required fixtures include initialization mismatch; optional capability refusal; new/load/resume identity and replay ordering; text content arrays; numeric/string permission IDs colliding with outbound IDs; unknown, duplicate and late responses; allow/reject/cancel permission outcomes; cancellation before dispatch/during permission/after completion; updates before terminal; null/primitive/array and oversize frames; stdin write failure; failed spawn; EOF/exit/close order; stop deadline without exit; fresh-generation callbacks; pending-listener cleanup; restart with unresolved journal state. Every real artifact run must record versions, source/emitted hashes, private paths, exact command/environment allowlist and observed output. No fixture or real-run evidence exists from this task.

## Source identity and handoff

| Source inspected | SHA-256 |
| --- | --- |
| `packages/shells-bridge/src/acp-client.ts` | `93787e790834054cdac87d48a95c347a5d37a1d9c157a1093b5934e5d1a303b0` |
| `packages/shells-bridge/src/bridge.ts` | `70f7ba8c08d16db505ecc74d9afa2bc25955db6b81bca0bfbc6ea5318c14fe3c` |
| `packages/shells-bridge/src/config.ts` | `259fd6c263bc7c78c80b41227439f7a4dd204d863fda7ad8d66ac33af38e569a` |
| `packages/shells-bridge/package.json` | `44147587821a3c7054c8663919385e77aa6d3e1fd36cda27d1945509b01f710e` |
| `docker/Dockerfile.codex` under bridge | `5fa800f0a3be4a89fde6f9eb38ea85645a2edf7acf7d5e221bd10def93c23bd4` |
| `docker/Dockerfile.base` under bridge | `f6fd39f93a7566ccbdffd49f766fa19f3bea920a26d87f149613e150727ee850` |
| `docker/shells-bridge.service` under bridge | `4e543bba577f709a65f42aedf70a92255ca67483bc3c7689684be2761126a4bf` |
| Pinned SDK `src/jsonrpc.ts` | `6880f5e7bb78c53d28e60f344968d021bad1878487ea887465b8a4742eadfd2f` |
| Pinned SDK `src/stream.ts` | `e7facc99f38e170b9d35abcf73165d25fa0f53138c900f2999dc8f28dca46e4f` |
| Pinned SDK `src/line-buffer.ts` | `1afe156c8e8b6346666de97ab6a15c139c1dab5c494f955c59aa532775a45f30` |
| Installed Hermes `acp_adapter/entry.py` | `7cb4be5532a03450136368a9d9ee0eb1ef578fbf920ec219a0427b8cda3c505e` |
| Installed Hermes `acp_adapter/server.py` | `034eb24877d4450922d7ac2f7b50ffc2a3866b8b4ea35c1752238fdc4d412748` |
| Installed Codex binary | `56ef98ab4032d317ab26e9b5e5a175650717351edb16ed9cde0cb6d1734d62da` |
| Installed Claude binary | `19842705e989393fce936804df6d2ab034860e24b8f8880357981d87ffd83fac` |

The existing `TODO(handoff)` at `acp-client.ts:88` and bridge invoke/update/restore sites points to `proposals/2026-09-08-platform-qc-remediation.md`. Root owns that proposal and source comments. Add the concrete numeric-ID collision, malformed-null boundary, false startup readiness, input/session mismatch, cancelled-result loss and unsafe stop assumptions to the same tracked lifecycle item before implementation. No new source TODO was inserted by this document-only task. Primary pages were read through web search and direct read-only HTTPS metadata/source retrieval; no browser session or shared root browser was used.
