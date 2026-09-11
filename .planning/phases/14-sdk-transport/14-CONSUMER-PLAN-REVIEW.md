---
phase: 14-sdk-transport
reviewed: 2026-09-09
scope: "Draft 14-09 Hub and 14-10 Site consumer adoption plans only"
status: amendments_required
reviewer: gsd_drone_verifier
execution_authorized: false
---

# Consumer plan review

The two drafts have the right separation: shared-client authenticated notification, consumer publication, and later component enforcement are distinct contracts. Amend the boundaries below before admitting product edits. This is a source and plan review, not runtime verification or phase closure. No application code, package installation, tests, network, or telemetry was executed.

## Reviewed identities

| Artifact | SHA-256 |
|---|---|
| `14-09-PLAN.md` | `7319213644eec2e973df06a6eb12fff84be90cdd61762329a2b337e00efa03f9` |
| `14-10-PLAN.md` | `bf518f2e7c5d264388a9e4946677037cdd9ec08aa69f007040c7ec0e2f588a59` |
| `minion_hub/src/lib/services/gateway.svelte.ts` | `91e8c69ca2c717744f73bc8fb34cb48cc684c63cc369b6298b8b870de0adbaed` |
| `minion_site/src/lib/services/member-gateway.svelte.ts` | `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1` |

Read root instructions, both application instructions, the engineering and technical-writing skills, both drafts, `14-08-PLAN.md`, `14-02-PLAN.md`, the actual services/state/configs, and the reporting seams below. The shared client is under separate active ownership; this review depends on its eventual frozen 14-08 receipt, not an intermediate source snapshot.

## Required behavioral amendments

### R1 — Hub cutover must retain the source authenticated identity

**Priority: high; 14-09 Tasks 2 and 3.** `gateway.svelte.ts:630` captures the client and `ConnectionLifecycleFence` generation. Its commit condition at line 650 checks that generation, client identity, and `conn.connected`. Ordinary shared-client reconnect does not increment that service lifecycle fence. With the proposed new reconnect publication, source generation A can close and source generation B can authenticate on the same object while a backup waits. The existing predicate becomes true again, allowing a cutover admitted under A to overwrite B.

Capture the source accepted `(client, socket generation)` tuple, or its monotonic published revision, before the first cutover await. Require it to remain current after token retrieval and immediately before commit. A source close followed by successful internal reconnect must invalidate that pending cutover even if the source object is unchanged and connected again. Retain the draft's separate live-backup-generation check. This is a service-only amendment; the lifecycle helper need not change.

Add a deterministic case: source A authenticated → backup pending → source closes → same object authenticates B → backup succeeds. Expected: cutover false, backup closed, source B hello/revision preserved. The existing “source close while backup waits” case is insufficient unless it includes this reconnected state.

### R2 — Site ownership includes chat settlement and activity timers

**Priority: high; 14-10 Tasks 2 and 3.** The draft names hydration and polling but leaves two direct service callbacks unspecified:

- `member-gateway.svelte.ts:279`: a prior `chat.send` rejection clears captured chat fields and calls the global `loadChatHistory()` at line 288. After replacement, that follow-up can query the successor; during same-object reconnect the captured chat may still be the current object. A delayed settlement must not clear a newer run's state or initiate successor work.
- `member-gateway.svelte.ts:151`: the five-second activity callback writes `memberState.activity.working` through global state. `resetMemberState()` replaces activity without cancelling the old timeout. That timeout can clear a replacement session's newer activity indication.

Capture session ownership and the specific run/operation identity for chat settlement. Bind any permitted follow-up to that identity and captured client; preserve the original idempotency key and never replay `chat.send`. Clear or invalidate the prior activity timer during current-session invalidation and check its ownership on firing. Both repairs fit the existing service/test allowlist.

Specify invalidation cleanup as well as stale-result rejection. Simply ignoring an old `finally` or rejection can leave the same retained chat object's `loading` or `sending` flag stuck. Invalidation may settle flags owned by the invalidated operation; it must not clear flags owned by a successor. Preserve optimistic messages and current chat selection. Do not invent success for an unacknowledged send.

Required cases: stale send fulfillment/rejection after replacement and same-object reconnect; no successor history request from the stale rejection; newer run fields preserved; old activity timeout cannot clear new working state; invalidation does not strand loading/sending. Same-session concurrent history requests also need an operation identity if the plan promises that an older `finally` cannot clear a newer loading operation.

### R3 — Hub direct asynchronous work needs an explicit acceptance list

**Priority: medium; 14-09 Tasks 2 and 3.** The existing broad “direct service-owned asynchronous initialization” instruction is correct but should name these seams so tests cannot satisfy it with agents-list and flow registration alone:

| Source seam | Required ownership check |
|---|---|
| `gateway.svelte.ts:782` `resolveServerId()` | Capture session and host before `/api/servers`; after each await, reject stale results before changing `ui.selectedServerId` or starting flush/group/activity work. Do not select a successor through `getActiveHost()` after the response. |
| `gateway.svelte.ts:806` `fetchActivityBinsFromDb()` | Reject obsolete bins before merging them into current activity state. |
| `gateway.svelte.ts:1554` delayed `startPolling` | Cancel or fence the pending startup on invalidation; an obsolete timeout cannot stop/restart the current polling owner. |
| `gateway.svelte.ts:1592` and `:1605` polling `finally` | Make in-flight ownership session-specific. `stopPolling()` clears the global booleans at lines 1622–1623; an old completion must not clear a newer poll's guard and admit overlapping requests. |
| `gateway.svelte.ts:1457` onwards initialization | Capture client/session for agents, sessions, health, presence, channels, cron, and each flow registration, including after every awaited registration. Guard delayed dynamic-import callbacks before initiating downstream work. |

Add held-response tests for server resolution/activity bins and the poll-finally sequence: old poll held → restart → new poll held → old finally → next tick. Expected: the new poll remains the only owner. Existing imported history/config/group helpers remain outside this slice; checking before calling them does not prove their later writes are fenced. Keep the draft's explicit downstream limitation and root TODO/proposal handoff.

## Fixture discovery and prerequisites

### R4 — New isolated tests are also selected by normal test discovery

**Priority: high; both plans' Task 1 and boundaries.** Both normal configs include `src/**/*.test.ts`. The proposed `gateway.contract.test.ts` and `member-gateway.contract.test.ts` therefore enter the normal lane immediately. Site's `vitest.config.ts` contains neither a Svelte compiler plugin nor `$lib` aliases. The dedicated config does not affect a normal invocation. Even where compilation succeeds, a candidate-only callback assertion against an old installed package must not silently become a default-suite failure or be hidden by skips.

Root selected the narrower solution during review: rename to `minion_hub/src/lib/services/gateway.contract.fixture.ts` and `minion_site/src/lib/services/member-gateway.contract.fixture.ts`, each selected explicitly by its dedicated config. Update both plans and 14-02 accordingly. No concrete constraint in the inspected configs prevents an explicit include for that suffix; actual runner discovery must still prove it. No normal-config ownership expansion or exclusions are needed. Add a discovery assertion that the ordinary lane omits these fixtures and that each dedicated lane finds its exact file; retain `passWithNoTests: false`.

`14-02-PLAN.md` also owns both original contract test paths and currently invokes them without the dedicated configs. Root must update that later handoff, renamed paths, and command, and serialize ownership. 14-02 must extend the frozen fixtures after these children release them, not replace or run them concurrently. Its separate Paperclip test path is unchanged by this naming decision.

Installed Site manifests inspected: Svelte `5.55.9`, `@sveltejs/vite-plugin-svelte` `5.1.1`, Vitest `2.1.9`. Their presence supports trying the isolated compiler fixture; it does not prove compiler/runner compatibility. No dependency installation is needed merely to discover that compatibility. Preserve a meaningful failing behavior as the red result; a missing alias/compiler error is fixture failure.

### R5 — Permit candidate development through an explicit isolated workflow

The current drafts deliberately block product edits until installation, unless amended. Root's decision to defer application package mutation is compatible with continued development if the following alternative is explicitly admitted in readiness, Task 1 done, Task 3 verification, and boundaries:

1. Require the independently verified, frozen 14-08 source and its real emitted JavaScript/declarations. Record the complete candidate package artifact identity, exports, dependency selection, and baseline installed identity. Do not proceed from a callback sketch or handwritten ambient declaration.
2. Reserve root-owned isolated source snapshots, for example `/tmp/minion-360-14-09-candidate/` and `/tmp/minion-360-14-10-candidate/`. These are temporary copies, not new git worktrees. Copy only named current source/config/generated-type inputs; exclude application `.env*` and caches. Record a manifest tying copied service/state bytes back to the reviewed checkout. Keep dependency writes and caches confined to explicitly admitted temporary paths; never mutate a shared/symlinked application `node_modules`.
3. Use the actual Svelte service/state and the real candidate client in the dedicated fixture. Select only its exact test file, `envDir: false`, synthetic env, one worker, no-tests failure, and a socket implementation that cannot open a native connection. Intercept HTTP before importing side-effectful surroundings. Mock external modules, not publication, session identity, timers, or state algorithms being tested.
4. Candidate runtime and type resolution must select the same real candidate artifact. A scoped temporary main-entry alias may select its emitted JavaScript; temporary type resolution must point to its actual emitted declarations and transitives. Do not add an `onAuthenticated` declaration to the app, widen types, use `any`/casts to fake compatibility, or alias unrelated package subpaths. Record resolved files and digests. A full check of this snapshot is candidate evidence only.
5. Retain a separately named old-installed control using untouched installed runtime/declarations. It should identify the missing contract honestly; it is not an expected-green acceptance lane for new callback behavior. Distinguish behavioral absence from a declaration failure. No normal config silently aliases to the candidate.
6. After root's exact archive transaction, repeat the same required fixtures and application check through normal installed resolution with matching archive/runtime/declaration receipts. This remains necessary for installed-consumer acceptance and release. Source development and isolated candidate validation may complete earlier; the plan summary must label the pending installed gate.

Do not claim these temporary paths/configs are already created or tested. Root must reserve their exact filenames and ownership before execution. This amendment does not authorize an archive transaction, installation, package changes, production aliases, browser, or gateway calls.

## Three-hook reporting decision

Recommend the same bounded policy in both applications: explicit synchronous callbacks to the existing console sink, with one constant string per hook and no supplied values. Root must select this policy before implementation; it is not silently selected by this review.

| Hook | Hub message | Site message | Control flow |
|---|---|---|---|
| `onEventError` | `[hub] gateway event handler failed` | `[member] gateway event handler failed` | `console.error` with only that string; no frame, event name, error, serialization, or reconnect. |
| `onReconnectError` | `[hub] gateway reconnect attempt failed` | `[member] gateway reconnect attempt failed` | `console.warn` with only that string; no attempt metadata, credentials, URL, exception, or retry action. |
| `onSocketError` | `[hub] gateway socket error` | `[member] gateway socket error` | `console.warn` with only that string; no native event/error object or state transition. |

Evidence and limits:

- Shared `client.ts` reporters default to raw exception objects; event reporting also includes the frame's event name. “Accept the default” would not meet this task's no-raw-payload selection. Existing containment catches custom reporter failures, so callbacks should remain simple and synchronous.
- Hub `src/hooks.client.ts:17` initializes PostHog lazily, skips initialization in desktop mode, and depends on a public key. Its `handleError` at line 40 logs and captures the actual exception. It is not an established sanitized gateway-hook adapter. Do not call that handler with a fabricated SvelteKit event, dynamically initialize telemetry from a hook, or forward native exceptions to PostHog in these plans.
- Hub `src/lib/state/reliability/reliability.svelte.ts:254` appends gateway-authored events and increments server-derived aggregate buckets. Reusing `pushReliabilityEvent` for browser transport diagnostics would mix authorities and requires a separate reporting contract; it is not the smallest safe sink here.
- Site has existing console diagnostics in this service. No PostHog/Sentry/Vercel analytics imports were found by the bounded search of `minion_site/src`; package declarations for Vercel analytics/speed insights alone establish no usable error sink. Do not add telemetry dependencies for this repair.
- This policy sanitizes these three new callbacks only. Existing challenge, connect, cutover, agents-list, and UI error paths still have raw reporting at their current sites. Neither plan should claim platform-wide log redaction. Correlation, rate limiting, durable delivery, source maps, and telemetry governance remain separate work.

Add canaries for secret-bearing errors, frame payload/event names, native socket objects, and throwing console methods. Assert that only the fixed message reaches the sink and reporters do not reconnect or alter connected/hello state. Keep stale-client callbacks from changing active state; specify whether obsolete diagnostics are ignored rather than relying on accidental current-client behavior.

## Review axes and disposition

**Standards:** Conditional pass on the proposed ownership and real-runtime fixture design, subject to R4's default-discovery amendment and R5's exact resolution evidence. No new dependency, general state framework, protocol field, UI token change, or auth policy change is necessary. Preserve dirty work and separate source, candidate, installed, and release receipts.

**Spec:** Amendments required for R1 and R2; R3 makes an already stated direct-service promise testable. Select all three hook policies explicitly. Keep unknown hello validation, gateway authorization, PluginIframe enforcement, imported hydration completion, browser behavior, and deployed interoperability outside this slice's closure. A passing consumer fixture does not fulfill SDK-01/02 globally.

**Admission recommendation:** Return the two drafts to root for these bounded amendments, then re-admit their exact hashes. Root accepted the concrete findings during review. No application source expansion is required for R1–R3 or the proposed hook policy. R4 uses root's selected `.contract.fixture.ts` names and requires updated allowlists/commands; default configs stay outside ownership. R5 needs named temporary artifact/config ownership and split candidate-versus-installed completion criteria. This review authorizes none of those mutations itself.

Open findings are recorded here for root's proposal/admission ledger; source TODO insertion remains with the eventual source owners. This reviewer changed only this review document.
