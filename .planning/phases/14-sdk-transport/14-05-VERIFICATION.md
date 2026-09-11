---
phase: 14-sdk-transport
plan: "05"
verified: 2026-09-09T19:25:02Z
status: gaps_found
slice_status: passed
scope: "14-05 Task 2 package source only"
score: "6/6 Task 2 truths verified; whole phase not evaluated as complete"
requirements: ["SDK-01", "SDK-02"]
gaps:
  - truth: "Actual Workforce consumers safely project errors and carry caller lifetime using the selected candidate bytes."
    status: partial
    reason: "Task 3 is unadmitted; package source tests do not establish Hub helper/route logging, status projection or installed adoption."
    artifacts:
      - path: "minion_hub/src/lib/server/workforce-fetch.ts"
        issue: "Consumer adoption and candidate resolution are outside this package-only verification."
    missing:
      - "Admit and execute exact candidate-resolution, helper and real consumer error/cancellation contracts."
  - truth: "All supported transport combinations satisfy phase14 authority, compatibility, retry and immutable-package adoption criteria."
    status: partial
    reason: "The selected JSON client slice does not implement or qualify the remaining HTTP/WS/ACP/plugin, streaming, endpoint schema or release boundaries."
    artifacts:
      - path: ".planning/phases/14-sdk-transport/14-WORKFORCE-HTTP-PACKET.md"
        issue: "Named consumer, proxy, upload, pagination and release gates remain open."
    missing:
      - "Complete the existing scoped children and supported-consumer acceptance; do not treat this receipt as phase closure."
---

# Workforce JSON transport: independent Task 2 verification

The frozen three-file package candidate passes the admitted Task 2 contract. No blocking defect remains in the inspected scope. All105 tests across27 files passed independently, including47 client cases, followed by a successful package typecheck. Global status remains gaps_found because Task3 and the broader phase contracts remain open, not because this source candidate failed.

Phase goal: supported applications and agents exchange authorized, version-compatible requests and recoverable events without exposing server credentials. This review covers the selected JSON transport implementation; it does not certify every application or actual deployment.

## Exact identities

The amended plan hash matched root's admission before review. The source/test/README hashes below matched both before and after independent execution. Reference source was read under its own checkout instructions; its three hashes still match the selected immutable packet. No SUMMARY claim substituted for source inspection.

| Artifact | SHA256 |
|---|---|
| `14-05-PLAN.md` | `10b76ee73a40e5be655baed88ad66de134523e9ab784ae980006e31c3322fca7` |
| `packages/workforce-client/src/client.ts` | `09571c18dcf8782231f90736e6742e3d0b2da9c4ed0de16957bc513ffc819fae` |
| `packages/workforce-client/src/client.test.ts` | `eec8aa1b89e7eaa5ff8fd1fba8bebd54ba8e76d27a5f5d5bc40ffd8cb0f09102` |
| `packages/workforce-client/README.md` | `b763ce2a909400fcc31f18ba599d282b0da47a8b20794d826752cb75db50a567` |
| Reference client | `303b8eb1af55cf08010d33f62e858cf5959992a5482129f2b634ddd057bef68b` |
| Reference client tests | `e8da37d89ee518f34463f07082fa812bbab3dbeb14f3a2eacd2d6060e5608b9d` |
| Reference README | `f3f0157f38184de74bffc84c5d189a4054272fe4b8772f690b966dafa7c079a2` |

The candidate preserves the14 historical reference cases and extends them with33 client cases. The package manifest remains0.3.0; that label does not identify newly built, installed or published bytes. Root's package build is separate evidence and was not repeated here. Hub installed-package identity remains the packet's separately recorded baseline; it was not substituted into this source test run or updated by this reviewer.

## Goal-backward checks

| Task2 truth | Status | Actual evidence |
|---|---|---|
| Reference HTTP/error behavior survives the bounded reader | Verified | Existing14 cases retain fixed `paperclip <status>`, parsed JSON despite misleading content-type, HTML502/200, empty success/null, typed empty error and2048-code-unit preview. New explicit `http_error` versus `invalid_json` classification retains actual upstream status. |
| Response reading is bounded by bytes before materialization | Verified | `client.ts:248` onward increments actual chunk byteLength and rejects before decode/append. Native split UTF-8 fixtures exercise a4-byte body with3/4/5-byte limits; misleading small/large Content-Length is ignored. Default4MiB cap and invalid limits have direct tests. |
| Caller lifetime and request budgets remain independent | Verified | Client/request signals combine by OR; duplicate signal registration is deduplicated. Pre-abort prevents fetch; fake-clock stalled fetch/body deadlines settle; concurrent requests retain distinct numeric limits and exactly one fetch each. |
| No new dispatch occurs after serialization crosses cancellation/deadline | Verified | Prepared URL/headers/body are followed by `checkDeadline()` immediately before fetch at `client.ts:234`. Both previously reported `toJSON()` abort and elapsed-clock regressions pass with zero fetch calls. |
| Policy termination releases native stream resources without waiting forever | Verified | Pending native reads cancel/unlock; an unresolved underlying cancel promise does not block caller settlement; late Response bodies are cancelled; late fetch rejection is observed; success/parse-failure timers and listeners are cleared. Source `cancelBody` plus finally covers all outcomes. |
| Error provenance and public diagnostics match the selected policy | Verified | Native fetch/read and serialization errors retain identity. Policy errors carry fixed code/message with no fake status or caller reason. README rejects logging upstream bodies/native causes and explicitly requires safe consumer projection. No retry is added. |

The earlier serialization finding is resolved in actual source and by two durable tests. Root's known late-response cleanup issue is resolved by retaining `responseBody` as soon as fetch resolves and using the same idempotent cancellation helper before reader acquisition and in finally. No extra source fix was made by this reviewer.

## Artifacts and wiring

| Artifact/link | Result |
|---|---|
| `client.ts` → injected fetch | Implemented: request preparation, bounded policy and signal reach the actual injected fetch. Native Response fixtures execute this implementation. |
| fetch response → native reader → incremental decoder → JSON/error classification | Implemented: actual bytes are counted before decoding and parsing; no `res.text()` bypass remains. |
| caller signals/deadline → AbortController + stream cancellation + caller rejection | Implemented: all three effects are connected; late completion cannot publish success after policy failure. |
| request finally → listener/timer removal + reader release | Implemented and exercised on success, parsing failure, read failure and policy termination. |
| namespace APIs → base request | Package suite passes, including real client entry points and retained domain tests. Mocked domain-method tests do not establish runtime endpoint schemas. |
| package source → Hub installed consumer/browser error projection | Not accepted by this slice. Task3 requires exact candidate resolution and actual consumer tests. |

No rendered UI artifact is in scope, so a dynamic UI data-flow trace is inapplicable. The transport data-flow trace above uses actual native response bytes, not hardcoded output from a mocked client facade.

## Independently executed checks

Commands ran from the meta root using installed local tools. No HTTP endpoint, provider, browser or database was contacted. No skipped tests or unhandled rejection warning was reported.

| Command | Observed result |
|---|---|
| `pnpm --filter @minion-stack/workforce-client test -- --maxWorkers=1 --minWorkers=1` |105/105 tests,27/27 files,47 client cases; Vitest2.1.9 duration14.52s; exit0. The script printed `vitest run -- --maxWorkers=1 --minWorkers=1`; this receipt does not infer worker configuration beyond the observed invocation. |
| `pnpm --filter @minion-stack/workforce-client typecheck` | `tsc --noEmit`, exit0 |
| Scoped `git diff --check` for the three files | No whitespace diagnostics |
| SHA256 of all three files after execution | Still equal to frozen identities |

Node reported v22.23.2. The complete package run exceeds the verifier's usual ten-second spot-check guideline because root explicitly authorized the existing package suite; no additional server was started and no source mutation was performed. This reviewer did not run build, change node_modules, edit Hub files or claim package distribution validation.

## Standards and scope review

The candidate adds optional base request/client fields without changing domain method signatures or installed dependencies. Native failure identity is preserved rather than attaching invented HTTP statuses. `invalid_json` on upstream200 is deliberately provenance, not a valid SvelteKit error status. The README explains that distinction and removes the selected reference's unsafe recommendation to log raw bodies.

Byte/deadline guards are actual implementation, not placeholder returns. Returning null for empty successful responses is preserved reference behavior. The `catch {}` around reader release is cleanup isolation, not a swallowed request failure: the primary request outcome remains intact. Fixed policy error metadata is not a claim that full Error objects, upstream JSON or raw native causes are safe to log.

Synchronous serialization/parsing cannot be preempted. The post-serialization guard prevents subsequent dispatch when its budget expired; it does not cap arbitrary request serialization memory/time. The4MiB response cap bounds parsing input and actual decoded response-body bytes, not aggregate consumer fanout or production payload suitability. Those limits are explicit engineering ceilings awaiting deployment-specific qualification.

## Requirements and remaining gates

| Contract | Disposition |
|---|---|
| SDK-01 Workforce bounded caller/response slice | Task2 source verified; explicit actor/tenant/version contracts and the remaining transport families are not established here. |
| SDK-02 supported consumer combinations | Partial only: this package test suite does not execute Hub route logging/status projection, installed package adoption or external peers. |
| Roadmap criterion1: all HTTP/WS/ACP/plugin authority/compatibility plus Workforce lifetime/errors | Workforce package portion verified; broader criterion remains open. |
| Roadmap criterion2: consumer reconnect/malformed-frame/idempotent retry | Outside this slice. No automatic retry was added; remote mutation outcome after timeout remains unknown. |
| Roadmap criterion3 / SDK-03: server-only CRM exports and immutable adoption | Not claimed by this plan; separate owning plans must establish it. It is not orphaned by this Task2 receipt. |

The existing exact-site TODOs at `client.ts:276` and `client.ts:288` point to root's Workforce proposal for safe Hub error projection, endpoint schemas, streaming proxy and upload-stub boundaries. The policy packet additionally names workspace two-second cancellation, pagination/fanout, request-init normalization and release/installed adoption. These are explicit open gates; package success must not erase them.

There is no required human-only check for the bounded synthetic package contract. Actual browser/proxy/runtime consumer and deployed size/latency qualification remain unperformed downstream work, not an inferred approval requirement or a claim of whole-phase completion.

Only this verification document was written by the reviewer. No product source, global planning status, proposal, package manifest, lockfile or installation was edited.

## Root Task 3 independent acceptance

Root reviewed helper and actual consumer fixtures and repeated candidate 39/39 across two files (1.47s) and installed baseline 36/36 (1.13s), no skips or source changes. Logs `/tmp/minion-360-14-05/root-hub-{candidate,installed}.log`. Full current Hub snapshot check passes with zero errors and warnings; `/tmp/minion-360-check-14-05/snapshot.json` SHA-256 `2855ccdaa918108336995b32b26ced90ffbd4b0af56cdf0fdf26c77f9ac56d71`, 2,418 Hub files plus six plugin sibling files; log `/tmp/minion-360-check-14-05.log`. Application environment was cleared. Source hashes match Task 3 SUMMARY.

Standards: existing SDK reused, real constructor identity, no fake bounded casts or dependency edits; native Headers and per-call adapter preserve caller authority and serialized bytes. Spec: actual route/log and company recovery fixtures preserve real HTTP status and sanitize upstream diagnostics; candidate cancellation and byte/deadline limits are distinguished from installed baseline. No new blocking defect found within admitted helper scope. Installed adoption, downstream cancellation policy, streaming and domain schemas remain open; no full SDK requirement closure.
