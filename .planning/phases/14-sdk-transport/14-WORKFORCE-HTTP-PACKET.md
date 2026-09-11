# Workforce HTTP policy and candidate packet

Task 1 discovery only, 2026-09-09. Root selection is pending; no source, package, service or database change was made. Admitted plan SHA-256 `29d0e7642297df6728136f5282edf8826b0bc741d65638fb39489562c52c9062`.

## Exact reference patch

Root HEAD `69739a7c7b1a92e442b5a574d88f167a0fe40db3` on `feat/curated-engineering-skills`; clean scoped `packages/workforce-client/src/client.ts`, `client.test.ts`, README. Reference HEAD `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`; those reference files are also clean. Hub HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35` on `feat/level-2026-07-30`; helper and helper test have no scoped diff. Preserve unrelated WIP.

Recommend reconcile the immutable reference three-file patch first. Bounded history names the initial typed-error slice `be91f21c31c805f38c6aa8c48ac100ff394ff6a3` and follow-up `f0d848b4a571e692caf8eb446007e8314dd3b0d5`; select the complete current reference bodies at the pinned HEAD, not an assumed equivalent older commit.

| File | Working SHA-256 | Reference SHA-256 |
|---|---|---|
| `packages/workforce-client/src/client.ts` | `21109422235a9b18438475562bd74bf9de9687c47fc3361a57fa0768b89c81a7` | `303b8eb1af55cf08010d33f62e858cf5959992a5482129f2b634ddd057bef68b` |
| `packages/workforce-client/src/client.test.ts` | `e26f47c549168a605414c80946d45e3c25b88b656eac448acff6a72d45cd13e8` | `e8da37d89ee518f34463f07082fa812bbab3dbeb14f3a2eacd2d6060e5608b9d` |
| `packages/workforce-client/README.md` | `0eaef9d22f71063ea0c3605f352f6270581ceae792db9204d6db6b3262af42a1` | `f3f0157f38184de74bffc84c5d189a4054272fe4b8772f690b966dafa7c079a2` |

Canonical proposed patch: concatenate Python `difflib.unified_diff` output in the table order, `splitlines(keepends=True)`, `fromfile="a/"+path`, `tofile="b/"+path`, defaults including three context lines, UTF-8 bytes. SHA-256 `c00995ca8127a6906acd6f9368160c61ed3b69171a3480d70c5f0b4bfc2182ce`, **12,501 bytes**. This identifies a selection, not an applied diff. Any base drift requires re-selection.

The reference adds `WorkforceApiError.bodyKind` (`json/text/empty`), bounded `body.raw` at 2048 JS code units and actual-response status. It retains parse-based classification despite content-type, empty success→null, and unwrapped fetch/read errors. Its 14 tests include HTML502, HTML200, exact2048/truncated raw, empty/error bodies and fetch rejection identity. Keep these regressions; revise only explicitly selected semantics with migration explanation.

Two required deviations from the reference README are recommended: never log raw error pages merely because they are bounded; give malformed successful JSON an explicit protocol classification while preserving its actual upstream status as provenance. Its current instruction to log `err.body` and TODO saying “log server-side” are unsafe as a default because an upstream may echo credentials. Raw JSON error bodies can also contain secrets; `bodyKind === text` alone is not a safe projection rule. The historical anti-leak test verifies no client-added request fields, not no upstream-echoed fields.

## Installed versus candidate bytes

Hub manifest line26 and bun.lock lines29/421 select `@minion-stack/workforce-client` ^0.3.0 / installed0.3.0. Actual local path is `minion_hub/node_modules/@minion-stack/workforce-client`, not a root workspace link. Installed manifest SHA `0240863fa2086c8fc6fd4d5b453aa3defcc914cd8ad2eda5949c964a0869969f`; export entry `dist/index.js` SHA `6ac682b28c3103ea7ce5ee33abb55f38d356ea888b20f52f1b4e802cf18376dd`; `dist/client.js` SHA `3afcd220bf828040e8ea366178a3d54b80c14a16c59ae8e87782804f3cae3d38`. Installed implementation still reads unbounded `res.text()` then JSON.parse without typed text fallback. A root source change cannot update these bytes automatically.

Recommend root admit an **isolated candidate verification configuration** after build: resolve the client import to the exact newly built root package export entry and record its transitive emitted files/digest; explicitly label this candidate mode. Run a separate existing-installed mode without that resolution. Never edit Hub active locks/node_modules or silently substitute aliases in normal validation. If a temporary test config outside the current files is needed, root must admit that exact file and cleanup ownership first. Identity JWT subpath must keep its actual existing resolved bytes; do not accidentally alias it through the main entry. No candidate exists yet, so no candidate compatibility pass can be claimed. Package publication/version/lock adoption stays 12-03/14-02 work.

## Actual caller categories and policies

Inventory below covers all direct client/helper calls found in root packages and Hub source; tests are separated. It is not a claim about uninspected remote consumers.

| Category | Current requirements evidenced by callers | Recommended policy |
|---|---|---|
| Typed request client (`workforceServerClient`) | Page loaders call company-scoped JSON resources and lists; dashboard/health have explicit JSON return types, no runtime schema | Finite30,000ms total per HTTP call and4MiB response cap, carry event.request.signal; preserve accepted2xx/empty semantics |
| Ad-hoc request JSON (`workforceRawFetch`) | Costs/trends/runs/harnesses/inbox/pipeline/factory intake/company GET, POST, DELETE; all current callers consume JSON/null, none reads binary/stream | Same finite policy, preserve exact body bytes, query, headers, status and server identity; accept empty2xx→null explicitly |
| Background (`workforceClientForOrg`) | Projects sync/dispatch and organization provisioning; no request owner; board key or minted organization-scoped actor | Same finite per-call policy, no invented request signal; no retry. Workflows can still exceed one-call budget across sequential calls |
| Direct workspace name client | `workspaces.service.ts:48-73` companies.list races a2,000ms timer and returns fallback; losing request is not aborted | Preserve existing2s user-visible behavior. Separate child replaces the abandoned request/timer with actual cancellation;30s general default is not a replacement for its2s requirement |
| Streaming/binary proxy | `routes/api/workforce/[...path]/+server.ts:35-42` buffers incoming mutations via arrayBuffer and streams upstream.body, preserving status/headers | Exclude from JSON cap/client migration. Separate upload/download/stream budget and disconnect propagation plan; never consume it with JSON.parse |
| Advertised asset methods | `packages/workforce-client/src/api/assets.ts:18-36` ignores File and POSTs `{}` for uploadImage/uploadCompanyLogo | Existing incomplete SDK API, no successful upload claim. Separate exact assets/form-data child; do not treat these stubs as evidence that all SDK routes are JSON |

**30s and4MiB are proposed engineering ceilings, not measured production SLOs or proven maximum payloads.** Source gives no finite maximum for issue comments/documents, runs, lists or harness revision payloads. These ceilings bound failures while allowing typical metadata responses; root should admit local fixtures first and require later sanitized response-size/latency evidence plus pagination decisions before a broad installed rollout. No telemetry/customer calls were made. A larger per-call override requires an explicit finite value and consumer evidence; never silently disable bounds. Aggregate fanout/concurrency remains a separate scalability gate (e.g. reliability loads every agent's runs).

## Additive contract decisions requested

1. Add optional `signal`, `timeoutMs`, `maxResponseBytes` to client options and base RequestArgs. Validate positive finite integer bounds. Request-specific numeric limits override client defaults; client and request signals are combined with OR cancellation, so a request cannot override away its parent cancellation. No domain API signature changes. Timer covers fetch, headers and body; clear timers/listeners on all outcomes. Pre-aborted input must never call fetch.
2. Keep actual `WorkforceApiError` for completed HTTP failures with safe fixed message `paperclip <status>`, `bodyKind` and internal untrusted body. Add stable classification `http_error` / `invalid_json` without inventing status. Prefer preserve the reference HTML200 shape as an actual-response error with `code=invalid_json` and status200, **but require a safe Hub projection before adoption**; loaders currently assume `.status` is valid for SvelteKit error(). Alternative is a separate protocol error retaining `upstreamStatus`; root must pick one and update the regression deliberately.
3. Add dedicated policy errors `request_aborted`, `deadline_exceeded`, `response_too_large`, with no guessed HTTP status and no raw URL, signal.reason, response text or cause in safe metadata. Preserve unrelated fetch/body read rejections as-is to retain historical provenance; classify them as transport failures only at an allowlisted diagnostic boundary. Do not mutate upstream errors with new fake statuses.
4. Count bytes from ReadableStream chunks before accumulation/parse, not code units, and do not trust Content-Length. Support incremental UTF-8 decoding across chunk boundaries. Abort underlying fetch and cancel/release reader on policy termination; race deterministic cancellation even if an injected fetch ignores its signal. Absorb late rejection/resolution. No automatic retry, especially after mutations whose upstream completion is uncertain.
5. Safe diagnostic projection should contain only code, real valid HTTP status if any, and internal operation label selected by the caller. Never body/raw/fullError/cause/token/URL/query/headers. Browser messages are generic. Status mapping recommendation: valid existing4xx retained where current consumer expects it; HTTP5xx→generic502 (or existing deliberate status policy), invalid JSON/oversize/transport→502, deadline→504; aborted requests should propagate cancellation rather than become successful empty data. The exact browser status contract needs the owning route tests, not only helper tests.
6. Response schema validation remains deferred except transport JSON/empty parsing. `health.get()` and `dashboard.summary()` generic annotations are not validators. Add actual endpoint schemas only through an exact child; no new broad validation library for25 domains here.

## Existing boundary evidence and child requests

| Outside current owned scope | Current evidence | Exact follow-up requirement |
|---|---|---|
| `src/routes/api/workforce/factory-intake/+server.ts:71`, `[id]/+server.ts:22`, `[id]/routing-decision/+server.ts:67` | Browser envelopes are generic; catch logs pass full cause to console.warn. Reference/candidate bodies or native fetch cause can reach logs | Admit these3 route files plus existing route tests and a shared safe diagnostic helper if chosen. Test actual route with synthetic canaries in HTML, JSON body, headers and Error.cause; inspect log arguments and response |
| `src/routes/(app)/workforce/+layout.server.ts:37-50`, `inbox/+page.server.ts:39-49` | Full errors/rejected reasons logged. Layout treats status200 as provisioning failure branch | Safe logging and status classification child; preserve current degradation/redirect behavior for actual4xx/5xx |
| `src/routes/(app)/workforce/{activity,approvals,costs,goals,issues,org,reliability,settings,settings/agents,agents/[id]}/+page.server.ts` and `portfolios/[id]`, `projects/[id]/pipelines` | Many catches forward `e.status ??502` to SvelteKit error(). Upstream200 from reference malformed JSON is not a valid error status | Admit a bounded status-projection child; derive exact set from inventory before edits, test200HTML and legitimate404 separately. Do not add fake status to the package to conceal this consumer assumption |
| `src/server/services/workspaces.service.ts:48-73` | Independent baseURL uses only PAPERCLIP_INTERNAL_URL and http://paperclip:3200;2s race abandons request/timer | Exact service/test child for canonical base resolver and cancellation, retaining auth split/cache semantics; do not change authority or database ownership |
| `src/lib/server/workforce-company.ts:24-60` | Only404 triggers provision; creates company at orgId and deletes mismatched returned ID best-effort | Regression fixture must preserve404 recognition and single-ID contract. No live provisioning or compensating delete in tests |
| `src/routes/api/workforce/[...path]/+server.ts` | Forwards upstream response bodies/status/headers directly, no typed safe error transformation or event signal; inbound body buffered | Separate proxy test/implementation child with actual multipart/binary/stream fixtures, upstream error-page policy and resource limits. JSON fixes cannot close this path |
| `packages/workforce-client/src/api/assets.ts` | Public upload APIs ignore supplied file | Separate multipart support or explicit unsupported-error API decision and consumer compatibility tests; no invisible behavior change here |

`src/server/integration/workforce-proxy.test.ts:4-14` explicitly copies middleware logic into a local fixture; it does not invoke the actual proxy or actual backend middleware. It is not sufficient security/consumer evidence. Helper tests currently cover canonical mutation headers; add real helper+selected route fixtures with only external service functions stubbed, never the helper/client under test.

Root should select a safe Hub projection in the owned helper before returning candidate typed errors to existing consumers, or admit the route children first. Do not report the entire log/browser boundary repaired merely because one generic route response excludes HTML.

## Auth and raw helper migration constraints

`workforce-fetch.ts:12-14` canonical backend URL falls back from WORKFORCE_INTERNAL_URL to PAPERCLIP_INTERNAL_URL; lines30-34 choose Bearer for pcli_ board keys and x-hub-identity for JWTs. Request helpers require hooks-populated identity. `workforceClientForOrg` uses board key fallback or minted org-scoped actor. Preserve company/actor authority; transport limits do not enforce authorization. `trustedWorkforceMutationHeaders` derives canonical public origin, not incoming request Host.

`workforceRawFetch` currently accepts RequestInit, already-serialized body strings and custom headers. Replacing it with `.request({body: init.body})` would double-encode POST JSON. Limit migration to discovered JSON calls with explicit method/body conversion or an internal bounded response-reading seam. Preserve current authorization merge behavior for this transport slice; if caller override policy is changed, request a separate security decision. Current merge casts Headers/tuple forms to a record, so generalized RequestInit support is not proven. Event signal and init.signal must both cancel, not replace each other. This API compatibility decision belongs in the root receipt before Task3.

## Root decision and implementation gate

Recommended next admission: pinned three-file reference semantics plus finite JSON transport in owned package files, with explicit deviations above; keep native transport failures honest. Admit candidate configuration by exact path and digest after the build. Then admit helper cancellation/JSON-preserving integration and actual selected route tests. Raw logging, status projection, workspace2s cancellation, proxy streams, upload stubs, aggregate pagination and release/installed adoption remain named child gates. Root owns decisions and proposal/TODO handoff coordination. This discovery packet does not itself authorize Tasks2–3 or close SDK-01/02.

## Complete direct-call inventory in inspected source

The following generated list records every production file with direct createWorkforceClient/workforceRawFetch/workforceServerClient/workforceClientForOrg calls or imports under Hub source, excluding tests and the owning helper. It is an inventory, not proof that every call was executed. File hashes make later drift visible.

| Path | Matching lines | SHA-256 |
|---|---|---|
| `minion_hub/src/lib/server/system-agents/workforce-agents.ts` | 2, 18 | `be4cadfb5b00b3a67a0e74720630c2a2a2628b462381a486621201b142db4733` |
| `minion_hub/src/lib/server/workforce-company.ts` | 3, 24, 41, 55 | `703521cfa82c5060615819d90b7324e39206e55f61580a36908bc7121eda65f5` |
| `minion_hub/src/routes/(app)/work/+page.server.ts` | 11, 25 | `6503a2d13d695cb2b15b3aa0534fc31dd86538316c81f9901c509a31b9faeb52` |
| `minion_hub/src/routes/(app)/workforce/+page.server.ts` | 2, 16, 22 | `7fd6ea5d65cf6fbada0e523d24632666bce6030519f2af00ade09f620c1e75b5` |
| `minion_hub/src/routes/(app)/workforce/activity/+page.server.ts` | 2, 12 | `23b29f0a2710787a5cfc185e8a3fb0bbb3345cf1f9873ba9c56dc2ba98643353` |
| `minion_hub/src/routes/(app)/workforce/agents/[id]/+page.server.ts` | 2, 28, 33, 34, 36, 37, 38, 39 | `5791d4964bff52f6ecb03d72db499716eadb97ab8bd50cd4358a1932968a6351` |
| `minion_hub/src/routes/(app)/workforce/approvals/+page.server.ts` | 2, 11 | `eb909f224e7a897fed331d8eba666074960b124c0d5bc2d3d716f11927abc7b7` |
| `minion_hub/src/routes/(app)/workforce/costs/+page.server.ts` | 2, 42, 43, 44, 45 | `4542884fd97656da3b5212c25572b0a02b68cc59f78f779f8b0b9fc32b9e2086` |
| `minion_hub/src/routes/(app)/workforce/goals/+page.server.ts` | 2, 12 | `8ae0ae1877aeb63319fc7c05ecd4947e77e719f42f9b086ce4a9d04339f7e654` |
| `minion_hub/src/routes/(app)/workforce/inbox/+page.server.ts` | 2, 33, 35 | `33a2791dc276b0db61b5cdf5a608e615a21506e5f39b5fb8fe5ecbd379bd9d34` |
| `minion_hub/src/routes/(app)/workforce/issues/+page.server.ts` | 2, 13 | `1161fb81acdc9c654889feb2b9fc5fcf1555fc21512bd93bc11e0f5561f9f9e4` |
| `minion_hub/src/routes/(app)/workforce/issues/[id]/+page.server.ts` | 2, 21, 47, 53, 67 | `51e8a9c299a15154eac614bf1df5ad0fc34c92f8a1c66961017c1aebd3905325` |
| `minion_hub/src/routes/(app)/workforce/org/+page.server.ts` | 2, 12 | `677cd56b731166f3456e734b4ac9e753702e8e3c66bb6ba4076a9b76c059f2bd` |
| `minion_hub/src/routes/(app)/workforce/portfolios/+page.server.ts` | 2, 13 | `92a1565792d5dd0673917d9f5adf8cad848545ce83b32861e4c10240854056bb` |
| `minion_hub/src/routes/(app)/workforce/portfolios/[id]/+page.server.ts` | 2, 13 | `12788bf4380190b642e2c628df2d5924ef71016e21a04a4cf76cf7908f2e2ecb` |
| `minion_hub/src/routes/(app)/workforce/projects/+page.server.ts` | 11, 54 | `73dbdf64c1fe8aa40dcd46afcfe1c9b9d90577ad75a9c49e3d9715e8a1c2725d` |
| `minion_hub/src/routes/(app)/workforce/projects/[id]/+page.server.ts` | 16, 71, 86 | `f3e5a471b18ad6c2c1cfdf3f0699035dfb29eaf1ba7e521b5c46be662cc3dbd5` |
| `minion_hub/src/routes/(app)/workforce/projects/[id]/pipelines/+page.server.ts` | 5, 27 | `32509ba685e05f23cf08d36458bbcfa825e43c2704035e57008c86fa96299d6a` |
| `minion_hub/src/routes/(app)/workforce/reliability/+page.server.ts` | 2, 19, 23, 27 | `82b1e4a4ac2ab10a2f344832df3f48bcc23d6d93d4bee1f5f5736cad9c139912` |
| `minion_hub/src/routes/(app)/workforce/settings/+page.server.ts` | 2, 11 | `d4e9d99fbbdc52488640989167f5ac89087ba8f1ff7833bd9b4e960da508447f` |
| `minion_hub/src/routes/(app)/workforce/settings/agents/+page.server.ts` | 2, 11 | `f60256e8efb83dc49bb52af9abb9ee6723d9946da760f7b92af72d1c7ea7d02f` |
| `minion_hub/src/routes/api/workforce/[...path]/+server.ts` | 22 | `ded811626f0ffd4bec21099ad72c4e486d5277b8b88f460b81935e46414afc6d` |
| `minion_hub/src/routes/api/workforce/factory-intake/+server.ts` | 2, 50 | `80c6c49ccf25114f92f51bd3645808f879453da5f3ad48c97c14ad04057671ed` |
| `minion_hub/src/routes/api/workforce/factory-intake/[id]/+server.ts` | 2, 17 | `4f29884d37c563a6671d8716c921fe7595bf37f5982bd4590f8aa7ffb7405f3d` |
| `minion_hub/src/routes/api/workforce/factory-intake/[id]/routing-decision/+server.ts` | 2, 57 | `d9493b01f90e90d586b77dd3e249eb8e75aef3f1bd38cde2cbc47c166eeed52a` |
| `minion_hub/src/server/services/organization-provision.service.ts` | 4, 162 | `242cc4dffba112fd7b92670c44de7cf8b25b0b73a9f73e090a20313f604eb8a3` |
| `minion_hub/src/server/services/projects.service.ts` | 3, 121, 229 | `e83cbf538595dec93f94b7eb6712f00136bcd8f1e08f00c485c1b0059a2d1577` |
| `minion_hub/src/server/services/workspaces.service.ts` | 3, 48 | `af011b685a8dedf16dd90c10a6fb4aba3cb1e4bd0b9e3753784bb1a0ebb29462` |

Before helper SHA-256 `cfb14a0c33a4af0b951ddbc51f16e945abf11e304ffa5a578aece9391f9c71f2`; before helper test SHA-256 `6c966e154762d77841c5eee915960f3c6ef3cc07d575ee442b4b94b9964fdfca`.

## Task 3 preflight appendix: minimum helper integration

Read-only source review after Task 2 freeze, 2026-09-09. This appendix is a proposal for root admission, not source implementation or executed consumer acceptance. The preceding packet bytes are preserved; their SHA256 is `72af4ce8fb83ca9754cd2d7433d522e3e85d6bc3f192752d71eb27e495b04ddb`. Task 2's independent package receipt is `14-05-VERIFICATION.md`. No product module, test, network endpoint or database was executed during this preflight.

### Actual seams and minimum changes

The current helper has three transport entry points: `workforceServerClient` at line51, `workforceRawFetch` at line67 and `workforceClientForOrg` at line100. The first and third construct package clients; raw fetch directly calls fetch and `r.json()`. None currently carries the request signal through typed calls. The raw helper forwards `RequestInit` but its record-spread header handling does not implement all declared `HeadersInit` forms. Keep auth/base URL/minting semantics intact while replacing the transport boundary.

**Typed domains can share one error boundary.** The package constructs `base`, passes that exact object to all namespace factories and returns `Object.assign(base, namespaces)`. Domain methods read `client.request` when invoked; they do not capture a destructured request function. For example, `src/api/health.ts:7` and `src/api/issues.ts:46` call that property dynamically. The inspected production API modules contain no assignment that replaces or captures request separately. Retain/bind the original request function and replace `client.request` on that same returned object once with a generic async wrapper that projects failures. Direct request calls and namespace methods then pass through one helper-owned boundary. Returning a copied object with a replaced property, or a Proxy that only intercepts the returned object's request access, would miss the factories' captured base object. Avoid per-method wrappers across25 domains.

`workforceServerClient` supplies `event.request.signal` as the client signal. Base per-request signals continue to combine through the candidate's existing OR policy. Background clients keep the finite defaults without fabricating a request owner. Wrap construction and background minting failures as well as async request failures if the helper promises every outgoing error is safe: URL/header/mint errors can occur before transport. Keep the real acting user, board-key fallback precedence and org-scoped minting arguments unchanged.

**Raw JSON calls can reuse the bounded reader without re-encoding their bodies.** Use one client per raw call with a private injected-fetch adapter. Snapshot the original `RequestInit`, final headers, body and actual method before starting the candidate request. Call the candidate base request without `RequestArgs.body`; its adapter passes the captured raw body to the real fetch unchanged and replaces only the outgoing signal with the candidate's combined transport signal. Preserve the caller's other RequestInit fields such as redirect, credentials, cache and body stream options. Do not expose this adapter or accept a second arbitrary destination. Candidate URL construction uses the same configured base and supplied path/query.

The adapter must be private to this single call, with no mutable shared `currentInit` state across concurrent requests. Prepare getters/header normalization before invoking the candidate, so an abort during preparation is visible to its pre-abort check; avoid extra user callbacks or expensive preparation between the candidate's final deadline check and the real fetch. The eventual network call must receive the candidate signal, never `init.signal` in its place. Pass `event.request.signal` as client signal and `init.signal ?? undefined` as request signal, preserving both cancellation authorities.

The package's RequestArgs method union excludes HEAD/OPTIONS, while raw RequestInit is wider. Do not cast an arbitrary string into that union or silently narrow the existing raw signature. A private adapter may use a documented base-request method placeholder with no body while forwarding the separately captured actual method; the generic JSON response reader has no method-dependent behavior. Tests must assert actual GET/POST/DELETE and explicitly chosen HEAD/OPTIONS behavior. If root considers that indirection too opaque, the alternative is an additive package bounded-response seam, which requires reopening the frozen package plan/source; copying its reader into Hub or parsing/reserializing the raw body is not the recommended fallback.

Existing observed raw callers use no body or already serialized JSON strings: factory-intake POSTs at `routes/api/workforce/factory-intake/+server.ts:56` and `[id]/routing-decision/+server.ts:63`, company creation at `lib/server/workforce-company.ts:43`, and company cleanup DELETE at line55. Preserving the exact string matters: parse/stringify can alter whitespace, large integer lexemes or duplicate-key input. Test those byte distinctions, empty strings and null/undefined body separately. Reusing this adapter does not fix the package's asset upload stubs or certify arbitrary multipart/stream consumers. The catch-all streaming proxy remains outside it.

Header policy needs an explicit small decision. Recommended normalization uses `new Headers(defaults)` then applies caller HeadersInit entries, preserving the current server-caller override precedence while supporting record, Headers and tuple forms case-insensitively. Current same-spelling record overrides work; duplicate casing can currently concatenate values when fetch normalizes them. Do not claim that correcting this accidental ambiguity is byte-identical behavior. Preserve token selection and canonical mutation header values. The helper's callers are trusted server code; this change must not start copying incoming browser headers or broaden actor/company authority. If root chooses strict preservation of the old record-only behavior instead, document unsupported HeadersInit forms rather than silently claiming full RequestInit support.

### Safe projection before current callers log or inspect status

Introduce a fresh helper-owned error with fixed name/message, allowlisted code, valid local HTTP error status and optional actual upstreamStatus. Copy no original body, raw text, message, cause, URL, header, signal.reason, stack or arbitrary properties. A fresh local stack is separate from copying the upstream stack. Preserve package-native provenance inside the package; Hub is the deliberate projection boundary. Classify actual exported candidate error types, not an arbitrary object's forged status/code. Do not use `instanceof` against a different installed/candidate copy.

| Source failure | Proposed safe helper result |
|---|---|
| Completed WorkforceApiError with actual status400–599 and code http_error | Preserve that status, especially404 required by company provisioning; fixed local message/code, no body |
| Successful response with invalid_json | Local status502; optionally retain upstreamStatus200 as explicit provenance, never as error status |
| response_too_large | Local status502 and fixed code; no payload |
| deadline_exceeded | Local status504 and fixed code |
| Native transport/read, URL/header/serialization or mint error | Local status502 and fixed transport/setup code; no original cause or message |
| request_aborted | Fixed safe code and reason-free error; **root must select local status/disposition before implementation** |

This protects helper-origin transport errors passed to existing full-error console calls in factory-intake routes, inbox and layout, and prevents invalid_json200 from reaching `error(200, ...)`. It can be verified by invoking those actual routes/loaders with only their external dependencies mocked. No route source edits are necessary merely to prove those specific upstream canaries no longer reach log arguments or browser envelopes.

Cancellation disposition is a genuine remaining consumer issue. A local499 is within SvelteKit's error-status range, but the current layout treats every status below500 as a provisioning problem and redirects. Leaving status absent or mapping it to502 avoids that branch but still permits fallback success. Neither is full cancellation propagation. Root must explicitly accept a bounded helper rejection contract with downstream cancellation work deferred, or admit the precise route guards before claiming cancellation reaches every caller. Do not silently pick a status and report the consumer behavior solved.

### Boundaries the helper cannot repair

| Existing source behavior | Why an exact child is still needed |
|---|---|
| `routes/(app)/workforce/agents/[id]/+page.server.ts:33–39`, reliability line27 and other `.catch(() => [])`/null fallbacks | They swallow all rejection types. A correctly aborted helper can still lead the loader to return successful empty data. Only the owning consumer can distinguish cancellation from deliberate degraded data. |
| `routes/(app)/workforce/inbox/+page.server.ts:34–52` and layout lines37–50 | allSettled and degradation/redirect logic handle cancellation as ordinary unavailability. Safe helper errors protect their transport log inputs but do not change control flow. |
| `routes/api/workforce/[...path]/+server.ts:35–42` | It imports only baseUrl/authHeaders, calls fetch itself and streams the upstream body. No client.request wrapper or raw-helper adapter intercepts it. Incoming buffering, downstream disconnect and direct upstream error-body forwarding remain separate. |
| Successful malformed domain shape, e.g. inbox iterating a non-array agents response | The selected package validates JSON syntax only. Later TypeErrors/data interpretation occur outside the helper and cannot be retroactively sanitized there. Endpoint validation is a separate owner decision. |
| `workforce-company.ts:32` database call and other route-local dependencies | Their failures originate outside this helper. The helper can sanitize Workforce transport errors, not promise every error a broad route catch will ever log is safe. Company ID mismatch409 is already locally fixed text, not an upstream-body leak. |
| Direct `workspaces.service.ts` client with abandoned2s timer; background callers swallowing errors | The new wrapper only affects clients returned by this helper. Existing direct construction and consumer recovery rules retain their own child boundary. |

No evidence requires a broad route rewrite solely for helper-origin upstream error projection. Required Task3 tests should distinguish this narrower repaired boundary from cancellation swallowing, schema errors and unrelated dependency logging; do not mock all routes' causes into already-safe errors.

### Candidate and installed identity

Source and emitted candidate are separate from installed0.3.0. These bytes were read, not executed in this preflight:

| File | Candidate root dist SHA256 | Hub installed dist SHA256 |
|---|---|---|
| index.js | `6ac682b28c3103ea7ce5ee33abb55f38d356ea888b20f52f1b4e802cf18376dd` | `6ac682b28c3103ea7ce5ee33abb55f38d356ea888b20f52f1b4e802cf18376dd` |
| client.js | `bed79c0069e5840c5646996eadd08f32990010001e3487cd9dfd0c76cf6ee267` | `3afcd220bf828040e8ea366178a3d54b80c14a16c59ae8e87782804f3cae3d38` |
| identity-jwt.js | `c21b9d89e924ff28f5dba04a8a35d884f699f7f26ad4eba56d965efcba4fdabf` | `db706a1be4f86f5da9bbf88d1911c434086d72af00906d80112fdd4bb623606f` |

An index-only hash would falsely identify these different packages as equivalent. Root must record a deterministic manifest of the exact candidate transitive emitted files before consumer execution: sorted relative paths plus SHA256/size, including client, API modules, declarations and main-entry reexports. Preserve the installed package and hash it separately. Main index reexports candidate identity-jwt internally, but Hub's `workforce-identity.ts` imports the explicit identity-jwt **subpath**. Its resolution must remain installed unless a separate identity adoption is admitted.

Proposed temporary configuration ownership, pending root admission:

1. `/tmp/minion-360-14-05/vitest.hub-candidate.config.ts`: import the existing Hub vitest config by absolute path. Preserve its plugins, setup files, environment stubs and exclusions. Set root to the actual Hub, replace include with only `src/lib/server/workforce-fetch.test.ts` and `src/lib/server/workforce-http-boundary.contract.test.ts`, maxWorkers/minWorkers1 and passWithNoTestsfalse. Add a test alias whose **find is the exact regex** `/^@minion-stack\/workforce-client$/` and replacement is `/home/nikolas/Documents/CODE/MINION/packages/workforce-client/dist/index.js`. Convert the base alias map to entries and retain them. Do not use a prefix string alias that also rewrites `/identity-jwt`.
2. `/tmp/minion-360-14-05/vitest.hub-installed.config.ts`: same narrowly reviewed infrastructure, no main-package alias. Explicit installed mode runs baseline/package identity cases from the contract file and compatible existing helper tests only; it does not pretend an edited helper depending on new exports works against the old package. Keep candidate-only helper imports dynamic within candidate cases if the installed package lacks required named exports. Never shim the baseline to make those imports succeed.
3. Both configs use an explicit candidate/installed mode marker selected by config, an isolated temporary cache, empty envDir and an environment allowlist for execution. No normal app env loading. Config construction validates exact path/digests and rejects drift before test module loading. Test external fetch defaults to a throwing synthetic stub; each fixture supplies native Responses/streams. Actual auth/DB dependencies are mocked before importing route modules; neither mock the client under test nor the error-projection helper.
4. The contract records/asserts the main-entry resolution and its transitive client bytes for each mode, plus the **unmodified** explicit identity-jwt subpath. Candidate mode must invoke real helper→real candidate→synthetic fetch→actual route/log sinks. Installed mode deliberately shows the old unbounded reader/native SyntaxError/no caller-signal behavior with controlled deferred streams, releasing every pending operation; it must not wait30 seconds or leave hung tests. Missing bounded exports are an expected adoption gap, not a repaired baseline.

Suggested future commands from Hub, after config admission and fixture review: `node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-14-05/vitest.hub-candidate.config.ts` and the equivalent installed config. These commands were **not run**. Normal test configuration, package manifests, locks and node_modules remain untouched.

Vitest aliases do not establish TypeScript compatibility. Root's environment-free current-source check copy must resolve the main package declarations to this exact candidate using a temporary exact `compilerOptions.paths` entry while leaving the identity-jwt subpath installed. Record that as candidate checking. An unchanged installed-resolution check that fails because new options/error exports do not exist is an honest adoption blocker, not permission to add casts or aliases to normal product configuration.

### Requested admission and acceptance

Root should select: safe status mapping including cancellation, normalized HeadersInit override policy, whether the private raw adapter's method bridge is acceptable, and exact temporary configs/declaration resolution. Then admit only the existing Task3 helper/two-test-file boundary. Keep package source frozen. Any needed package reader API, route cancellation guard or schema validator requires a separate exact amendment.

Tests must cover actual domain dynamic dispatch; direct request; JWT and board-key headers; canonical mutation headers; byte-identical raw strings; supported RequestInit fields and HeadersInit forms; event/init OR cancellation; independent concurrent raw calls; 204→null selected behavior; HTTP404 provisioning compatibility; HTML200→safe502; structured error/native-cause canaries excluded from real log arguments and response bodies; deadline/oversize; and honest installed negative controls. The existing company recovery test must use synthetic DB/fetch and preserve create-with-ID/cleanup semantics without any real provisioning.

Open ends from this appendix require the existing exact-site TODO plus root proposal ledger treatment when implementation begins. This planning-only append adds no product comments and does not claim Task3, SDK-01/02, package release or production adoption complete.

## Task 3 implementation receipt — candidate and installed controls

Root admitted Task3 under PLAN SHA256 `5437da333b5563e5cdddcd691fab8fb4b6477589ac1f656f6d45804664d771a5`. The preflight text above remains historical; its decisions were resolved by the appended root policy in that plan. Its complete preceding packet prefix remains SHA256 `873502f2bf87a9c8adbba4d8d7ad6480cd29e41557d102c691215f5adbe5e9b5`.

Implemented only the Hub helper and its two admitted test files. The helper replaces request on the original client base, so direct and namespace calls share safe failure projection. A per-call raw adapter snapshots RequestInit, uses native Headers with caller precedence, forwards original body/method/options, and receives the candidate's combined transport signal. If the installed old client provides no transport signal, raw calls retain their original init.signal; this preserves an existing raw capability without pretending the installed client gained event composition or deadlines.

Projection uses the actual selected WorkforceApiError constructor and optional selected policy constructor via reflection; forged native name/code/status fields do not qualify. Structural option objects remain assignable to the old installed API without adding fake casts or exports. Completed400–599 statuses remain actual; invalid_json/oversize/native failures map locally to502, deadline to504, and cancellation has a fixed code with **no status property**. Neither original cause/body/message/stack nor arbitrary upstream properties are copied. Existing loaders can still swallow that cancellation; the real inbox test records the limitation.

| Frozen source | SHA256 |
|---|---|
| `minion_hub/src/lib/server/workforce-fetch.ts` | `a4a2b7539475ab0c882d1e4d4ebc1c3f965f941fec4433962b001577cfd35727` |
| `minion_hub/src/lib/server/workforce-fetch.test.ts` | `fcbd9c84dc4a7465a812dcf58ba440da2bc65086b5797098d60c9d373c937a55` |
| `minion_hub/src/lib/server/workforce-http-boundary.contract.test.ts` | `fc25a568749619237a95756bfb7f90cc32ef7ce451f21501bc3d78a742be675d` |

The two admitted temporary configs each contain complete frozen manifests for all236 files in candidate dist and all236 files in installed dist. They independently enumerate actual files, reject symlinks/count/hash drift before test loading, preserve base test exclusions/stubs, disable envDir loading, select only the two fixtures, use one worker and reject an empty test selection. Config hashes: candidate `0af0dc627bac816ad7cfc519c4fe4730abe24de4d0433c8d76a50801e4c54799`; installed `ed79233050ec1477cfec66f6fef1c351ecf8d7962a12d4643111cab7c251c58c`. Exact absolute paths remain those admitted in the preceding appendix. No normal config or installation was changed.

Candidate config aliases only the exact main entry; actual test imports compare its createWorkforceClient identity with the selected built file. Both modes compare explicit identity-jwt mintIdentity with the unchanged installed subpath and verify its byte hash. Main entry identity alone is insufficient because the entry bytes match while transitive client/JWT bytes differ.

Red evidence before helper implementation:15/29 helper cases failed, covering headers, safe statuses/causes, cancellation/deadline and response caps;4/10 real-boundary cases failed, reproducing native-cause log leakage, SvelteKit error(200), unsafe inbox/layout logs and pre-aborted dispatch. These were actual helper/client/route calls with synthetic fetch and mocked external identity/database dependencies only.

Final executor checks from Hub:

| Command | Observed result |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-14-05/vitest.hub-candidate.config.ts` |39/39 tests:29 helper and10 boundary;1.72s; exit0 |
| Same using `vitest.hub-installed.config.ts` |36/36 tests:26 helper and10 boundary;937ms; exit0 |
| Scoped source `git diff --check` | No diagnostics |

Different mode counts are explicit positive/negative controls, not skipped failures. Installed tests prove absent policy constructor, ignored typed parent signal, uncapped response, and direct-package native SyntaxError on HTML, while verifying helper sanitization and retained raw init.signal. Candidate tests prove native body deadline/cancellation, byte cap, independent signals, error projection and real route handling. Both execute actual company404/create-with-ID and mismatch cleanup logic with synthetic responses; no real company/database operation occurred.

Current-source Hub typecheck and independent Task3 acceptance belong to root after this freeze; these executor passes do not replace them. Package source hashes still match Task2. Root package build and distribution gates remain separate; no registry publication, active lock adoption, production runtime or browser qualification occurred.

Exact-site handoffs: helper line74 documents installed transport-policy absence; helper line220 documents cancellation-swallowing loaders, unrelated route-local DB/schema errors, proxy and upload boundaries; boundary fixture line218 preserves the observed inbox limitation. Proposal text was sent to root for its canonical Workforce ledger. Those remaining contracts are not claimed repaired here.
