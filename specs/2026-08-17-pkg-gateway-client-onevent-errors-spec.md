---
id: 2026-08-17-pkg-gateway-client-onevent-errors-spec
title: @minion-stack/shared GatewayClient — consumer onEvent failures are reported, never discarded
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-18
proposal: 2026-08-17-pkg-gateway-client-onevent-errors
verdict: approved
repos: [minion-meta]
tags: [logic, test, docs, infra]
type: fix
link_review: "pass 2 but has neither \"revises\" nor \"supersedes\" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec"
---

# `GatewayClient` — consumer `onEvent` failures are reported, never discarded

**Owner surface:** `minion-meta` — `packages/shared/src/gateway/client.ts` (the `handleMessage` event
dispatch, the `GatewayClientOptions` contract, and the reconnect/socket-error lifecycle paths), its
existing unit test file `packages/shared/src/gateway/client.test.ts`, and a changeset.
**Consumer surface (not edited here):** `minion_hub` (`src/lib/services/gateway.svelte.ts`),
`minion_site` (`src/lib/services/member-gateway.svelte.ts`), and `paperclip-minion`'s `minion_gateway`
adapter (via the package's `./node` subpath). None of those three repos is checked out in this
workspace — see ⚠️ A1.

**Design ancestors:**
[`2026-08-17-site-member-gateway-swallowed-errors-spec`](2026-08-17-site-member-gateway-swallowed-errors-spec.md)
§4 ⚠️ A1 — the sibling spec that names `client.ts:263` and `client.ts:296` as *"two swallows upstream
that this spec cannot close"*, hands `:263` to this proposal by id, and instructs: *"if the onEvent
proposal has not been specced by the time this merges, append the reconnect case to it rather than
letting it evaporate"* — which is the written mandate for §2 S2 below.
[`ws-duplication-audit`](ws-duplication-audit.md) and
`.planning/phases/07-ws-consolidation/07-03-SUMMARY.md` — the Phase-7 consolidation that made this one
client the single WS lifecycle for hub, site and the paperclip adapter, and therefore made one empty
`catch` a three-consumer defect.
[`2026-08-17-pkg-workforce-client-json-error-spec`](2026-08-17-pkg-workforce-client-json-error-spec.md)
§S2 — the house release convention for a behavior change in a published `@minion-stack/*` package
(changeset prose + no consumer bump in the same spec); its §5 also flags `client.ts:263` as a known
open item in exactly this file.

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged and the tag is the routing unit. S1 and S2 are `logic`/`test`: **red-state TDD
is mandatory** (the failing test is written and its failure output pasted into the PR before the fix).
S3 is `docs`/`infra`. **No UI governance applies to any slice**: zero `.svelte` files, zero tokens,
zero `lint:design` / `lint:tokens` — §6 asserts that mechanically.

---

## 0. Product

From the approved proposal `2026-08-17-pkg-gateway-client-onevent-errors`, verbatim:

> # GatewayClient discards exceptions thrown in consumer onEvent handlers
>
> ## Problem
>
> packages/shared/src/gateway/client.ts:263 bare empty catch turns UI-handler bugs invisible.
>
> ## Definition of done
>
> onEventError hook or console.error fallback; unit test observes a thrown handler error.
>
> ## Out of scope
>
> Event replay.

**What the code actually says today** (read from this checkout, `packages/shared/src/gateway/client.ts:254-265`):

```ts
if (frame['type'] === 'event') {
  if (frame['event'] === 'connect.challenge') { /* … handshake … */ return; }
  void Promise.resolve(this.opts.onEvent?.(frame as unknown as EventFrame)).catch(() => {});   // ← 263
  return;
}
```

The proposal's line reference is exact. Reading that one line closely turns a one-line hygiene fix
into a two-failure-mode fix, and the second mode is worse than the reported one:

1. **An async handler's rejection is swallowed.** `onEvent` is typed `void | Promise<void>`. When a
   consumer's handler is `async`, any rejection lands in `.catch(() => {})` and disappears. The two
   browser consumers are described as driving Svelte state and awaited work; the absent paperclip
   adapter's exact handler shape remains a Slice 0 question. This is the reported bug: a UI whose
   event handler throws on every `chat.message` frame looks like a UI that is merely not updating.
2. **A synchronous throw does not even reach that `catch` — it escapes.** JavaScript evaluates the
   argument `this.opts.onEvent?.(frame)` *before* `Promise.resolve` is called, so a synchronous throw
   propagates out of `handleMessage`, out of the `on('message', …)` listener installed in
   `wireEvents`, and into whatever invoked it. In a browser that is a `window.onerror`-level error
   fired from inside the WS event dispatch; under Node's `ws` (the `./node` subpath, used by the
   paperclip adapter) a throw inside an `EventEmitter` listener propagates to the emitting frame and
   is an uncaught exception candidate. I have not run that Node case to observe the exact end state —
   the *escape* is certain from the language semantics, the *process outcome* is my reading of `ws`'s
   emitter and should be treated as a claim to verify, not a fact. Either way the current code does
   not do what its shape suggests: it protects against exactly one of the two ways a handler can fail.

**Two sibling swallows in the same lifecycle** (S2's subject, handed over by the site spec's ⚠️ A1):

| Line | Code | What is lost |
|---|---|---|
| `client.ts:296` | `void this.connect().catch(() => {});` inside `scheduleReconnect()` | every failed reconnect attempt. On a reconnect, `sendConnect`'s own catch (`:280-285`) rejects the `connect()` promise, and *this* is the only place that promise is handled. Failures that also close an established socket can schedule the next attempt and repeat silently; a constructor failure has no socket close to schedule another attempt, but its terminal rejection is still discarded here |
| `client.ts:240-242` | `on('error', () => { /* close handler fires next */ });` | the runtime-supplied socket error value. The comment is right that `close` fires next and no *control-flow* action is needed, but its code/reason need not preserve the diagnostic value supplied by `error`; the exact value differs between Node `ws` and browsers |

**The failure this fix converts.** Today: a consumer handler bug (or a reconnect attempt that fails)
can produce a clean console and a UI that looks idle. After: every in-scope handler, reconnect-attempt,
and socket error is reported exactly once through a hook the consumer can own, with a `console.error`
fallback when it does not — so "nothing is happening" and "something is broken" stop being the same
observation.

## 1. Assumptions and what Slice 0 must settle

**Everything asserted about `packages/shared` above was read from disk in this checkout and is fact**:
the four line numbers, the option shape, the test harness, the package manifest. That is the whole
owner surface, so no slice below depends on an unverified claim. What is *not* verifiable from here:

1. **The three consumer repos are absent.** `minion_hub/`, `minion_site/`, `paperclip-minion/` are
   excluded by the meta-repo `.gitignore` (`ls -d minion_hub minion_site paperclip-minion` → three
   "No such file or directory"). §4's consumer rows are carried claims from AGENTS.md's cross-project
   map, `ws-duplication-audit.md`, and the site spec. ⚠️ A1.
2. **Whether any consumer's `onEvent` handler actually throws today is unknown.** That is the point —
   the current code makes it unknowable. Do not present the fix as "fixes N known handler bugs";
   present it as "makes them observable".
3. **Which published version each consumer pins is unknown from here.** Nothing changes for a consumer
   until it bumps `@minion-stack/shared`, and this spec does not bump any consumer (§5).

Two facts found in this checkout that change the work and would otherwise be discovered the hard way:

- **In-repo dependents do not use this client.** `packages/cache` and `packages/shells-bridge` both
  declare `"@minion-stack/shared": "workspace:*"`, but neither imports `GatewayClient` or passes
  `onEvent` (`rg -n 'GatewayClient|onEvent|createNodeGatewayClient' packages/cache/src packages/shells-bridge/src`
  → zero hits). So `pnpm run test-all` cannot catch a consumer-side regression from this change; the
  blast radius is entirely outside this repo, which is why S3's changeset prose is load-bearing rather
  than ceremonial.
- **The test harness already exists and is sufficient.** `client.test.ts` ships a `MockWebSocket`
  (Node-`ws`-style `.on()`), a `makeClient()` factory, and a `performConnect()` handshake helper, under
  `vi.useFakeTimers()` with `vi.restoreAllMocks()` in `afterEach`. S1 needs **no new fixture** — it
  appends cases. Two traps in that harness: (a) `connect.challenge` never reaches `onEvent`
  (`client.ts:255-262` returns first), so every test must use a different event name; (b) the `.catch`
  arm runs on a microtask, so an assertion needs `await Promise.resolve()` (twice, matching the
  existing helpers' idiom) — fake timers do not stall microtasks, but they also do not flush them.

### Slice 0 — recon (≤ 30 min, prepend to S1, not counted as a slice)

```bash
cd /home/agent/work
# in-repo — should reproduce the facts above exactly
rg -n 'catch\(\(\) *=> *\{\}\)|catch\s*\{\s*\}' packages/shared/src/gateway/client.ts   # → :263, :296
rg -n "on\('error'" -A2 packages/shared/src/gateway/client.ts                            # → :240-242
rg -n 'GatewayClient|onEvent|createNodeGatewayClient' packages/cache/src packages/shells-bridge/src  # → zero
rg -n 'version' packages/shared/package.json | head -3                                   # → 0.9.0

# consumers — run wherever the repos ARE checked out (⚠️ A1); record OUTPUT, not impressions
rg -n 'onEvent' minion_hub/src/lib/services/gateway.svelte.ts
rg -n 'onEvent' minion_site/src/lib/services/member-gateway.svelte.ts
rg -n 'onEvent|createNodeGatewayClient' paperclip-minion/packages/adapters -g '*minion_gateway*'
rg -n '"@minion-stack/shared"' minion_hub/package.json minion_site/package.json paperclip-minion/package.json
```

**Two answers must be written into the PR description before S1 ships:** (a) for each reachable
consumer, is its `onEvent` handler `async`, and does it already contain its own `try`/`catch`? — that
decides whether the fallback will be loud or silent in practice (⚠️ A2); (b) which version each
consumer pins, so the changeset prose in S3 names a real upgrade path. If a repo cannot be inspected,
write **"unverified — repo absent"**. An unchecked consumer is an unknown, not a zero.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (the proposal's DoD: onEventError + sync-throw containment) ─▶ S2 (the two sibling lifecycle swallows) ─▶ S3 (release contract + docs + handoff)
```

**S1 satisfies the proposal's DoD literally and is independently shippable in behavior.** S2 closes the
two swallows the site spec formally handed over — it is a *deliberate, bounded* extension of the
proposal, flagged as such in §4 ⚠️ A4 so a reviewer can cut it; if cut, AGENTS.md's open-items ledger
applies (a `TODO(handoff):` at each site plus a new proposal). S3 is what makes the change *arrive*:
without a changeset, `pnpm run ci` fails at `changeset:status --since=origin/main` regardless of how
good the code is (memory `minion-meta-changeset-release-flow`: that script exits 1 when any changed
package lacks a changeset), and without release prose, three consumers get new console output with no
note explaining it. **Do not merge S1 without S3.**

The ordering is not arbitrary: S1 establishes the one internal reporter that S2 reuses, so S2 adds
call sites rather than a second error-reporting shape.

---

### S1 — `onEventError`: no consumer handler failure leaves this client unreported

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** after this slice, a consumer `onEvent` handler that fails — synchronously or asynchronously —
produces exactly one report, and never escapes into the WebSocket event dispatch. When the consumer
supplies `onEventError`, that hook receives it; when it does not, `console.error` does. No other
behavior of `handleMessage` changes: handlers are still invoked fire-and-forget in frame-arrival order,
with no awaiting and no buffering. Because async handlers remain concurrent, their completion and
error-report order is not guaranteed.

**Do:**

- **Add the option, additively.** In `GatewayClientOptions`, beside `onEvent`:

  ```ts
  /**
   * Called when the `onEvent` handler above throws or rejects.
   * Default when omitted: `console.error` with the event NAME (never the payload — see below).
   * Pass `() => {}` to opt into silence explicitly; the client never discards these errors by default.
   * MUST NOT throw: it is invoked from a catch on a fire-and-forget promise.
   */
  onEventError?: (err: unknown, frame: EventFrame) => void;
  ```
  Optional ⇒ every existing construction of `GatewayClient` keeps compiling and keeps its meaning.
  This is the proposal's `onEventError` and its `console.error` fallback in one shape rather than an
  either/or: the hook is the contract, the fallback is what makes the *absence* of the hook safe.

- **Contain the synchronous throw — the half the current line does not cover.** Invoke the handler
  inside a `try`, then attach the rejection arm to whatever it returned:

  ```ts
  // The handler may throw synchronously OR return a rejecting promise; both are reported once.
  try {
    void Promise.resolve(this.opts.onEvent?.(frame as unknown as EventFrame))
      .catch((err) => this.reportEventError(err, frame as unknown as EventFrame));
  } catch (err) {
    this.reportEventError(err, frame as unknown as EventFrame);
  }
  ```
  A sync throw takes the outer `catch`; a rejection takes the inner one; **neither path can reach the
  other**, so "exactly once" is structural, not a convention a future edit can quietly break. The
  outer `try` is also what stops a throw from escaping into the `ws` emitter (§0 point 2).

- **One private reporter, and it cannot throw.**

  ```ts
  private reportEventError(err: unknown, frame: EventFrame): void {
    const hook = this.opts.onEventError;
    if (!hook) {
      console.error(`[GatewayClient] onEvent handler failed for event '${frame?.event ?? 'unknown'}':`, err);
      return;
    }
    try { hook(err, frame); } catch { /* a broken reporter must not become an unhandled rejection */ }
  }
  ```
  The swallow in the reporter's own `catch` is the one deliberate silence in this spec, and it is the
  correct one: it runs inside a `catch` on an unawaited promise, so rethrowing would convert a reported
  failure into an unhandled rejection — a different bug, not a fix. It gets a comment saying so. Do
  **not** also `console.error` when a supplied hook throws: the consumer chose to own reporting, and a
  surprise second channel is how "quiet library" trust is lost.

- **Log the event name, never the payload.** Gateway event frames carry chat message bodies, session
  metadata, and connect material. `console.error` output lands in browser devtools, Vercel/Netcup
  server logs, and (for the Node adapter) container logs. The frame *object* is still handed to
  `onEventError` — a consumer that wants the payload can take it, deliberately and in its own context —
  but the default path must not turn a handler bug into a content leak. This is a fallback-only rule;
  it is not a claim that the hook is safe to log wholesale, and S3's docs say so.

- **Do not await, buffer, retry, or reorder.** `void` stays. Handler invocation remains
  fire-and-forget and in frame-arrival order; async completion and error-report order remain
  unconstrained. Anything else is the proposal's excluded "event replay" wearing a different hat.

- **Do not change `onEvent`'s signature, `EventFrame`, or any frame type.** This is not a protocol
  change (§4), and keeping it out of `types.ts` is what makes that true.

- **Red-state first (G3).** Write the async-rejection case *and* the sync-throw case, run both against
  current `HEAD`, and paste the output into the PR. Expect two different reds: the rejection case fails
  as "console.error not called"; the sync-throw case fails by the throw escaping `__simulateMessage`
  and failing the test from the *call site*, not the assertion. That asymmetry is the evidence for §0
  point 2 and belongs in the PR body verbatim. The existing suite is not a valid red state — all six
  cases pass today by construction.

**Files:** `packages/shared/src/gateway/client.ts` (the option, the two-arm containment, the private
reporter), `packages/shared/src/gateway/client.test.ts` (new cases appended; **the six existing cases
are regression anchors and must not be edited to accommodate the fix** — if one needs editing, that is
a finding to report, not a chore to absorb). No new file, no new dependency, no export-map change.

**Definition of done (machine-checkable):**

```bash
cd packages/shared && pnpm run test
#   red-state first (G3): both cases below shown failing against the old code.
#   Cases (all use an event name that is NOT 'connect.challenge' — §1 trap (a);
#   all flush microtasks with `await Promise.resolve()` twice before asserting — §1 trap (b)):
#   - async onEvent that rejects, NO onEventError supplied
#       → console.error called EXACTLY once; first arg contains '[GatewayClient]' and the event name;
#         second arg IS the thrown Error instance (not String(err) — devtools keeps the stack)
#   - sync-throwing onEvent, NO onEventError
#       → mockWs.__simulateMessage(...) DOES NOT THROW      ← the escape, closed
#       → console.error called exactly once
#   - async rejection WITH onEventError supplied
#       → hook called once with (err, frame); frame.event is the event name; console.error NOT called
#   - sync throw WITH onEventError supplied → same as above
#   - onEventError that itself throws → __simulateMessage does not throw; no unhandled rejection;
#         console.error NOT called (the consumer owns reporting)
#   - fallback console.error output does NOT contain a distinctive string planted in frame.payload
#         ← the no-payload-in-logs rule, asserted rather than asserted-to-have-been-intended
#   - a NON-throwing onEvent → console.error NOT called, handler received the frame (happy path intact)
#   - onEvent omitted entirely → no report, no throw (optional handler still optional)
#   - connect.challenge frame with a throwing onEvent → onEvent NOT invoked at all (handshake path
#         unchanged; the anti-regression anchor for §1 trap (a))
#   - two SYNCHRONOUSLY failing events in a row → exactly two reports, one per event, in arrival order
#         (async handler completion/report order is deliberately unconstrained)
pnpm run typecheck && pnpm run build && pnpm run lint
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
rg -n 'catch\(\(\) *=> *\{\}\)' packages/shared/src/gateway/client.ts   # → the :263 hit is GONE (:296 remains until S2)
rg -n 'onEventError' packages/shared/src/gateway/client.ts             # → the option + the reporter
```

---

### S2 — The two sibling lifecycle swallows the site spec handed over

**Tags:** `logic`, `test` · **Estimate:** 4–6 h · **Scope note:** deliberate extension beyond the
proposal's literal text — see §4 ⚠️ A4 before starting.

**Goal:** a reconnect attempt that fails, and a socket `error` event, both become observable. After
this slice the two bare empty promise catches at the original `:263` and `:296` sites are gone. The
only remaining silent catches are the threat-modelled malformed-frame discard and the documented
never-throw wrapper around consumer-owned reporting hooks (§5).

**Do:**

- **`client.ts:296` — the reconnect swallow.** Replace `void this.connect().catch(() => {})` with a
  report through a new optional hook, same shape and same rules as S1's:
  ```ts
  /** Called when an auto-reconnect attempt fails. Default when omitted: console.error. MUST NOT throw. */
  onReconnectError?: (err: unknown, attempt: { delayMs: number }) => void;
  ```
  Capture `delay` in the timer closure and pass that exact scheduled delay as `attempt.delayMs`.
  Route the rejection through the same private reporter shape as S1 (share the never-throw wrapper;
  do not duplicate subtly different hook-containment idioms in one file). **Do not change reconnect
  control flow**: the backoff curve (800 ms × 1.7, capped 15 s), the `closed` guard, and the
  `onReconnectScheduled` callback all stay exactly as they are — §5.
- **`client.ts:240-242` — the socket `error` event.** Deliver the value supplied by the runtime's
  socket `error` callback instead of discarding it (an `Error` under Node `ws`; typically an `Event`
  in browsers). Reuse the existing `onClose`-adjacent contract rather than inventing a third hook
  shape: add
  `onSocketError?: (err: unknown) => void`, defaulting to `console.error`. **Keep the existing
  comment's substance** — `close` still fires next and still drives all control flow; this handler
  gains *reporting* only, and must not close, reconnect, reject `helloReject`, or flush `pending`.
  Doing any of those would double-drive the lifecycle and is the reason the no-op existed.
- **Respect the generation fence.** `on('error')` currently has no `if (this.generation !== gen) return;`
  guard while `open`/`message`/`close` all do. A stale socket from a previous `connect()` erroring
  after a reconnect would otherwise report against the live client. Add the fence, matching its
  siblings — this is a correctness detail of the *new* reporting path, not an unrelated refactor.
- **Decide the reconnect noise question explicitly, and write the decision in the code.** A gateway
  whose reconnect attempts fail immediately can yield a failure roughly every 15 s at the cap
  (about 240 lines/hour); connect timeouts or other delayed failures reduce that rate. This
  spec ships **no dedupe** (see ⚠️ A2 for why: dedupe hides the healthy→failing transition, adds
  cross-call state to a library that currently has none, and the consumer that most needs quiet — the
  site — is already building its own collapsing sink in
  `2026-08-17-site-member-gateway-swallowed-errors-spec` §S2). Record that reasoning as a comment at
  the hook so the next reader does not "fix" it by accident.
- **Red-state first (G3):** the reconnect-failure test against current `HEAD` fails with "console.error
  not called". Paste it.

**Files:** `packages/shared/src/gateway/client.ts`, `packages/shared/src/gateway/client.test.ts`.

**Definition of done (machine-checkable):**

```bash
cd packages/shared && pnpm run test
#   - autoReconnect:true, socket closes, the NEXT connect() fails (WebSocketImpl throws)
#       → exactly one console.error naming the reconnect; message survives; NO throw escapes the timer
#       → with onReconnectError supplied: hook called once with (err, { delayMs }); console.error NOT called
#   - the existing 'schedules reconnect with exponential backoff' case still passes UNEDITED,
#       and reconnectDelays is still [800, ~1360]                       ← backoff untouched (§5)
#   - ws emits 'error' → onSocketError called once with the exact emitted value
#       → when absent, console.error called once with a message naming the socket error and that value
#   - ws emits 'error' on a STALE socket (generation already advanced) → NOT reported (fence holds)
#   - ws 'error' does NOT close the socket, does NOT flush pending, does NOT schedule a reconnect
#       (assert via a pending request still unsettled and no new socket constructed)
#   - onReconnectError / onSocketError that throw → nothing escapes; no unhandled rejection
rg -n 'catch\(\(\) *=> *\{\}\)' packages/shared/src/gateway/client.ts
#   → ZERO hits (the original promise swallows at :263 and :296 are gone)
rg -n 'catch\s*\{' packages/shared/src/gateway/client.ts
#   → exactly TWO intentional sites: malformed-frame discard and the commented never-throw hook wrapper
rg -n 'backoffMs\s*=\s*Math.min\(this.backoffMs \* 1.7, 15000\)' packages/shared/src/gateway/client.ts  # → still there
rg -n 'setTimeout|setInterval' packages/shared/src/gateway/client.ts | wc -l   # → unchanged vs pre-S2 (no new timers)
pnpm run typecheck && pnpm run build && pnpm run lint
```

---

### S3 — Release contract, in-code docs, and the consumer handoff

**Tags:** `docs`, `infra` · **Estimate:** 4–5 h

**Goal:** three consumers in three separate repos learn — from the release note, before they bump —
that this client now talks when it used to be quiet, and what the hook is for. CI goes green.

**Do:**

- **Changeset** — `.changeset/<name>.md`, `"@minion-stack/shared": minor`. The package is `0.9.0`;
  a consumer-visible behavior change on a 0.x package is `minor` by this repo's convention (see
  `.changeset/gateway-protocol-version.md` for the house prose style: two to six lines,
  consumer-facing, no changelog boilerplate). The body must state, in the consumer's terms:
  *`onEvent` handler failures (sync throws and rejections) are now reported instead of discarded*;
  *new optional `onEventError` — omit it and the client uses `console.error`, pass `() => {}` for
  explicit silence*; *S2's `onReconnectError` / `onSocketError` if S2 shipped*; *the fallback logs the
  event name only, never the payload*; and *no protocol, frame-type, or reconnect-timing change*.
  Without this file `pnpm run ci` fails at `changeset:status --since=origin/main`.
- **JSDoc is the documentation surface — deliberately, not by omission.** `packages/shared` has **no
  `README.md`** (verified: the file does not exist, though `package.json` `files` lists one — an
  observation for §5, not this slice's job). So the contract lives on the options themselves: each new
  hook documents (a) the default behavior when omitted, (b) that it must not throw, and (c) what
  context the fallback logs. `onEventError` additionally documents that its fallback logs the event
  name only and that a consumer logging the whole frame is choosing to log payload content. Consumers
  read these through their editor; that is the realistic delivery channel.
- **Consumer handoff — the deliverable that is not a file in this package.** Per AGENTS.md's
  open-items ledger, file **one proposal** in `proposals/` covering the three consumers: each should
  (i) bump `@minion-stack/shared` and (ii) decide whether to pass `onEventError` into its own error
  sink or accept the `console.error` default. Include S0's per-consumer answers (including any
  "unverified — repo absent"), and name `minion_site`'s existing sink from
  `2026-08-17-site-member-gateway-swallowed-errors-spec` §S1 (`reportGatewayError`) as the obvious
  wiring target there. Do **not** edit `proposals/index.json` — the generator owns it.
- **Do not bump any consumer.** This spec publishes; it does not upgrade a consumer. Say so in the PR
  description so nobody helpfully runs an update in hub or site before the handoff lands. Note also
  that publishing takes **two merges to main** (feature PR with the changeset → the automated
  "Version Packages" PR → npm), so a consumer bump must wait until the version-package merge has
  actually published the release.

**Files:** `.changeset/<generated-name>.md` (new),
`packages/shared/src/gateway/client.ts` (JSDoc on the new options + one `TODO(handoff):` line pointing
at the proposal), `proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` (new — adjust
the slug to whatever the proposal naming convention resolves to).

**Definition of done (machine-checkable):**

```bash
cd /home/agent/work
test -f .changeset/<name>.md
rg -n '^"@minion-stack/shared": minor$' .changeset/<name>.md          # → minor, not patch
rg -n 'onEventError' .changeset/<name>.md                             # → the hook is named in the release note
rg -n 'TODO\(handoff\)' packages/shared/src/gateway/client.ts         # → exactly one, pointing at the proposal
ls proposals/ | rg 'gateway-client-error|error-hook'                  # → the consumer-adoption proposal exists
git diff --name-only <base>...HEAD | rg 'proposals/index.json|specs/index.json'   # → ZERO (generators own these)
pnpm run ci      # build-all → typecheck-all → lint-all → test-all → changeset:status
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `packages/shared/src/gateway/client.ts` | S1, S2, S3 | `onEventError` option + sync/async two-arm containment at `:263` + private never-throw reporter; `onReconnectError` at `:296`; `onSocketError` + generation fence at `:240`; JSDoc; one `TODO(handoff):` |
| `packages/shared/src/gateway/client.test.ts` | S1, S2 | append the failure matrix; the six existing cases stay untouched as regression anchors |
| `.changeset/<name>.md` | S3 | **new** — `minor`, the consumer-facing behavior change in prose |
| `proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` | S3 | **new** — the hub / site / paperclip adoption handoff |

**Zero `.svelte` files. Zero changes to `types.ts`, `protocol.ts`, `index.ts`, or the export map. Zero
schema, DDL, or migration files. Zero new dependencies** (`ws` stays an optional peer). No
`package.json` `version` edit — Changesets owns the bump. No edits under `packages/cache/` or
`packages/shells-bridge/` (§1: neither uses this client).

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". The **"Gateway protocol (frame types, events)"**
row is the zone this work sits next to — and the single most important thing to say is that it does
**not** enter it: no frame type, event name, `PROTOCOL_VERSION`, or wire byte changes. What does change
is the *client's local error-reporting behavior*, which reaches three repos through npm.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `packages/shared` public API | **Additive only.** Three optional options; no signature, no removal, no rename. Every existing construction compiles unchanged | S1/S2 DoD: `pnpm run typecheck-all` + the six untouched regression cases |
| `minion_hub` (`src/lib/services/gateway.svelte.ts`) | **Real, intended, and delayed.** After hub bumps the dependency, a handler bug that was invisible starts printing to the browser console; a *synchronous* throw that previously escaped into the WS dispatch is now contained instead. ⚠️ A2, ⚠️ A3 | Nothing changes until hub bumps (this spec does not bump it); S3's proposal makes the bump an owned decision; `onEventError` is hub's opt-out or redirect |
| `minion_site` (`src/lib/services/member-gateway.svelte.ts`) | **Same, plus a positive interaction.** That repo's own spec S1 wraps its `onEvent` body in `try`/`catch` → a site handler that catches internally never throws, so the fallback never fires and there is **no double logging**. If the site bumps and passes `onEventError: (e) => reportGatewayError('event', e)`, its sink gets the failures its own wrapper cannot see | `2026-08-17-site-member-gateway-swallowed-errors-spec` §4 ⚠️ A1 explicitly awaits this fix; S3's proposal names `reportGatewayError` as the wiring target |
| `paperclip-minion` `minion_gateway` adapter (via `./node`) | **The behavior change with the largest delta.** A synchronous handler throw currently escapes into `ws`'s emitter (uncaught-exception candidate in a long-lived Node process); after S1 it is caught and logged. ⚠️ A3 | S1's containment is strictly safer; call it out in the changeset so an operator who has been living with restarts understands why they stop |
| `minion/` gateway (server) | **None** — it is the *peer*, not a consumer of this class. It sends the frames; nothing about their handling on the wire changes | no file in `minion/` is touched; §6 asserts it |
| `packages/cache`, `packages/shells-bridge` | **None** — both depend on `@minion-stack/shared` but neither imports `GatewayClient` or `onEvent` (verified in this checkout) | re-run the §1 grep at PR time |
| `@minion-stack/db`, `@minion-stack/auth`, shared hub↔site DB | **None** — no query, no schema, no session handling | zero files outside `packages/shared/src/gateway/` |
| `packages/design-tokens`, any UI | **None** — zero `.svelte` files ⇒ ui-design-governance, `lint:design`, `lint:tokens` do not apply (§4b) | §6 step 1 asserts it mechanically |
| Public npm | The package is `access: public`. A published client starts writing to `console.error` where it was silent | `minor` bump + changeset prose. No known third-party consumers, but "public" is a fact, not an assumption — state it in the note |

### ⚠️ A1 — the consumer repos are not in this workspace

`minion_hub/`, `minion_site/`, and `paperclip-minion/` are absent (meta-repo `.gitignore`). Every row
above that names them is reasoned from AGENTS.md's cross-project map, `ws-duplication-audit.md`, and
the site spec — not from their source. This blocks **nothing**: every file S1–S3 edits is in this repo,
and `pnpm run ci` is fully runnable here. It does mean S0's consumer greps may be unrunnable in the
same session; if so, record "unverified — consumer repos absent" in the PR and still file S3's
proposal, which is exactly where an unanswered consumer question belongs.

### ⚠️ A2 — the fix's whole purpose is to make noise, and noise has a failure mode

A handler that throws on every frame of a chatty stream (`chat.message`, agent status) will now print
per frame; a gateway down for an hour will print a reconnect line roughly every 15 s once S2 lands.
That is the *correct* default — a silent client is the reported bug, and collapsing duplicates would
hide the healthy→failing transition, which is the single most diagnostic line in the whole sequence.
It is also, honestly, the thing most likely to make someone regret this change at 2 a.m. Three
mitigations, all shipped: the fallback is one line per failure (not a stack dump of the frame),
`onEventError` lets a consumer redirect or explicitly silence it, and the consumer that most needs
throttling is already building a collapsing sink of its own. **If a reviewer wants dedupe in the
library, that is a real disagreement, not an oversight** — it should be raised at G2 and, if accepted,
specced as its own slice with a stated policy for the transition line, not bolted onto S1.

### ⚠️ A3 — a Node consumer's process behavior may change

If a synchronous `onEvent` throw currently crashes or destabilizes the paperclip adapter's process,
S1 stops that. Strictly an improvement — but it changes an observable operational signature (a
crash-loop becomes a log line), and anything downstream that keys off restarts (a supervisor alert, a
health probe) will see a difference. I have not verified the current end state of a throwing listener
under `ws` (§0 point 2), so this is flagged as a change to expect and confirm, not a fixed outcome.
The confirmation belongs in S3's consumer proposal.

### ⚠️ A4 — S2 goes beyond the proposal's literal text, on a written handover

The proposal names `client.ts:263` and excludes only "Event replay". S2 additionally touches `:296`
and `:240`. The justification is not "while we're in here": it is
`2026-08-17-site-member-gateway-swallowed-errors-spec` §4 ⚠️ A1, an approved spec that names both
lines, declares them out of *its* reach, and instructs that the reconnect case be appended to **this**
proposal rather than allowed to evaporate. Doing it now costs one shared reporter and ~4–6 h; doing it
later costs a second pass over the same file and a second release. **S2 is nonetheless separable** — if
G2 disagrees, cut it, and then the ledger rule applies: `TODO(handoff):` at `:296` and `:240` plus a
new proposal carrying the site spec's handover text forward. What must not happen is the third
silent evaporation of the same two lines.

## 5. Out of scope (explicit)

- **Event replay** — the proposal's own exclusion. No buffering, no redelivery, no
  at-least-once semantics, and no ordering guarantee beyond frame-arrival invocation order.
- **Awaiting `onEvent` / backpressure.** The dispatch stays fire-and-forget and `void`. Making the
  client await handlers would change delivery semantics for three consumers and is a separate design.
- **Retry, backoff, or reconnect-policy changes.** The 800 ms × 1.7 → 15 s curve, the `closed` guard,
  and `onReconnectScheduled` are untouched; S2 reports failures, it does not react to them. S2's DoD
  greps the backoff line and the timer count to prove the line was not crossed.
- **The malformed-JSON discard at `client.ts:249-251`.** It is a *deliberate, threat-modelled* silent
  drop (the comment cites mitigation `T-07-02`). Changing a hardening decision — even to "just log it",
  which is a log-flood vector on a hostile socket — needs its own proposal with the threat model in
  hand. Recorded here so the next reader knows it was considered, not missed.
- **Typed error classes / structured provenance in `@minion-stack/shared`.** The site spec's §5 wants
  them; they would let a consumer distinguish a server `{ok:false}` from a transport failure without
  string matching. Real, adjacent, and a bigger change than this fix — file it separately.
- **Changing `onEvent`'s signature, `EventFrame`, `PROTOCOL_VERSION`, `protocol.ts`, or the export
  map.** Keeping out of these files is what keeps this off AGENTS.md's gateway-protocol impact row.
- **Editing `minion_hub`, `minion_site`, `paperclip-minion`, or `minion/`.** S3 files a proposal; it
  does not open a consumer PR or bump a consumer dependency. ⚠️ A1.
- **Creating `packages/shared/README.md`.** The package has none while `package.json` `files` lists
  one — a real (cosmetic) inconsistency found in passing. Writing the package's first README is a
  docs task of its own, not a rider on an error-handling fix; JSDoc carries this contract (S3).
- **Remote telemetry.** No Sentry, no PostHog, no server-side error sink. `console.error` plus a hook
  is the proposal's bar; shipping client errors somewhere durable is a separate proposal with a
  privacy question attached.
- **Dedupe/throttling in the library** — ⚠️ A2. A decision, not an omission.
- **Auditing this bug class across the fleet.** Empty catches rarely appear once and a sweep is
  probably worth filing — but a sweep is not this fix. If S0 surfaces others, file them; do not absorb.
- **Any UI.** Zero `.svelte` files ⇒ ui-design-governance, `lint:design`, and `lint:tokens` do not
  apply to any slice, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.

## 6. End-to-end verification

Run with S1–S3 merged in `minion-meta`, from the repo root.

```bash
cd /home/agent/work

# 1. Gates + tag hygiene (logic/test/docs/infra — no design or token lint, §5)
pnpm run ci                                    # build-all, typecheck-all, lint-all, test-all, changeset:status
git diff --name-only <base>...HEAD | grep -E '\.svelte$'                  && echo "FAIL: UI out of scope"       && exit 1
git diff --name-only <base>...HEAD | grep -E 'gateway/(types|protocol|index)\.ts' && echo "FAIL: protocol surface" && exit 1
git diff --name-only <base>...HEAD | grep -E '^(minion|minion_hub|minion_site|paperclip-minion)/' && echo "FAIL: consumer repos" && exit 1

# 2. Static proof the swallows are gone
rg -n 'catch\(\(\) *=> *\{\}\)' packages/shared/src/gateway/client.ts    # → ZERO hits
rg -n 'onEventError|onReconnectError|onSocketError' packages/shared/src/gateway/client.ts  # → declared + used

# 3. THE PROPOSAL'S DoD, against the BUILT artifact (not the source) — a throwing handler is observed
cd packages/shared && pnpm run build
node --input-type=module -e "
import { GatewayClient } from './dist/gateway/index.js';
// Minimal Node-ws-shaped mock: .on(ev, fn) + send/close, driven by hand.
class Mock {
  readyState = 1; sent = []; l = {};
  on(e, f) { (this.l[e] ??= []).push(f); return this; }
  send(d) { this.sent.push(d); }
  close() { this.readyState = 3; (this.l.close ?? []).forEach(f => f(1000, '')); }
  msg(s) { (this.l.message ?? []).forEach(f => f(s)); }
}
const ws = new Mock();
// --- a) async rejection, no hook → console.error fallback
let logged = [];
const realErr = console.error; console.error = (...a) => { logged.push(a); };
const c1 = new GatewayClient({
  url: 'ws://x', WebSocketImpl: function MockImpl() { return ws; }, onChallenge: async () => ({}),
  onEvent: async () => { throw new Error('handler exploded'); },
});
c1.connect().catch(() => {});
ws.msg(JSON.stringify({ type: 'event', event: 'agent.status', payload: { secret: 'PAYLOAD-CANARY' } }));
await Promise.resolve(); await Promise.resolve();
console.error = realErr;
console.log('fallback fired:',  logged.length === 1);                                    // → true
console.log('names event:',     String(logged[0]?.[0]).includes('agent.status'));        // → true
console.log('carries Error:',   logged[0]?.[1] instanceof Error);                        // → true
console.log('no payload leak:', !JSON.stringify(logged).includes('PAYLOAD-CANARY'));     // → true
// --- b) SYNCHRONOUS throw does not escape the WS dispatch (the half :263 never covered)
const ws2 = new Mock(); const seen = [];
const c2 = new GatewayClient({
  url: 'ws://x', WebSocketImpl: function MockImpl() { return ws2; }, onChallenge: async () => ({}),
  onEvent: () => { throw new Error('sync boom'); },
  onEventError: (e, f) => seen.push([f.event, e.message]),
});
c2.connect().catch(() => {});
let escaped = false;
try { ws2.msg(JSON.stringify({ type: 'event', event: 'chat.message' })); } catch { escaped = true; }
console.log('sync contained:', !escaped);                                                 // → true
console.log('hook got it:',    JSON.stringify(seen) === '[[\"chat.message\",\"sync boom\"]]'); // → true
"

# 4. Pre/post proof for the PR — repeat step 3(a) on the pre-fix commit.
#    Expected on old code: 'fallback fired: false' (nothing logged), and step 3(b) escapes.
#    That side-by-side IS the evidence the reported bug existed and is gone.

# 5. S2, against a real-ish failure: run the client with autoReconnect:true; let the second socket
#    close before hello so that connect() rejects and the close lifecycle schedules another attempt.
#    Confirm exactly one reconnect report (console.error, or onReconnectError when supplied) and that
#    the third attempt fires at ~1360 ms — reporting added, timing untouched. Separately cover a
#    WebSocketImpl constructor rejection and require one report without inventing a subsequent retry.

# 6. Realistic integration (optional, where the repos exist — ⚠️ A1): in a hub or site dev session,
#    pack this build (`pnpm pack`), install it into the consumer, deliberately throw from the
#    consumer's onEvent handler, and confirm ONE console.error naming the event, no payload in the
#    log line, and an otherwise unchanged dashboard. For paperclip (Node), confirm the process
#    logs and SURVIVES a synchronous handler throw (⚠️ A3).
```

**Ship gate:**

1. §6 steps 1–3 green, with step 4's pre/post capture in the PR.
2. The proposal's DoD checked clause by clause: `onEventError` hook exists **and** the `console.error`
   fallback works (step 3a/3b); a unit test observes a thrown handler error (S1's matrix, both the
   sync and the async arm).
3. S1's (and S2's, if it shipped) red-state failure output pasted into the PR (G3) — including the
   sync-throw case's *escaping* red, which is the evidence for §0 point 2.
4. S0's per-consumer answers recorded, including any "unverified — repo absent".
5. The changeset present and `changeset:status` green; the PR description states that no consumer is
   bumped and that publishing needs the second (Version Packages) merge.
6. ⚠️ A4 resolved on the record: S2 either shipped, or cut **with** the `TODO(handoff):` lines and the
   carry-forward proposal filed — not cut silently.
7. S3's consumer-adoption proposal linked from the PR description.
