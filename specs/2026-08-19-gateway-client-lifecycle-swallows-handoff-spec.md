---
id: 2026-08-19-gateway-client-lifecycle-swallows-handoff-spec
title: "GatewayClient — close the reconnect-failure and socket-error swallows (S2 of the onEvent-errors spec)"
stage: done
status: shipped
pass: 2
created: 2026-08-19
updated: 2026-08-20
proposal: 2026-08-17-gateway-client-lifecycle-swallows-handoff
verdict: approved
repos: [minion-meta]
relationship: extends
related: [2026-08-17-pkg-gateway-client-onevent-errors-spec, 2026-08-17-site-member-gateway-swallowed-errors-spec, 2026-08-17-gateway-client-error-hook-consumer-adoption]
type: fix
tags: [logic, test, docs, infra]
evidence: https://github.com/NikolasP98/minion-meta/pull/89
shipped_reason: "Verified shipped: meta PR #89 merged to dev 2026-08-20 (lifecycle-swallows handoff fix)."
---

# `GatewayClient` — close the reconnect-failure and socket-error swallows

**Owner surface:** `minion-meta` — `packages/shared/src/gateway/client.ts` (the `scheduleReconnect()`
timer callback and the `wireEvents()` socket `error` listener), its existing unit test file
`packages/shared/src/gateway/client.test.ts`, and the already-open changeset
`.changeset/gateway-client-event-error-hook.md`, plus the existing consumer-handoff proposal
`proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md`. No consumer repo (`minion_hub`, `minion_site`,
`paperclip-minion`) is edited — none is checked out in this workspace (meta-repo `.gitignore`).

## Relationship to existing artifacts

Classified `extends` against
[`2026-08-17-pkg-gateway-client-onevent-errors-spec`](2026-08-17-pkg-gateway-client-onevent-errors-spec.md)
(`stage: spec`, `status: approved`, pass 2) — the parent spec's own §2 already designed this exact
work as its "S2 — The two sibling lifecycle swallows the site spec handed over" section (lines
306–377 of that file), with the reporter shape, hook names, generation-fence requirement, and
machine-checkable DoD this spec uses as its baseline. This pass corrects the baseline where current
code proves its backoff assertion and async callback declarations inconsistent. That S2 section was **not** implemented: the
merged PR (`a5e17f7`, visible in `git log -- packages/shared/src/gateway/client.ts`) shipped only
S1 (`onEventError`) plus part of S3 (the changeset and the `TODO(handoff):` markers). This spec
exists as a separate artifact — rather than simply resuming the parent spec — because the request
pipeline routes through the approved proposal `2026-08-17-gateway-client-lifecycle-swallows-handoff`,
which is itself scoped to exactly this remainder; the parent spec stays the design record, this one
is the executable continuation.

Related, with one-line reasons:

- **`2026-08-17-pkg-gateway-client-onevent-errors-spec`** — extended. Its §2 S2 is this spec's
  design source; its §4 cross-repo impact table and ⚠️ A2/A3/A4 sidebars apply unchanged to the two
  new hooks and are not re-litigated here.
- **`2026-08-17-site-member-gateway-swallowed-errors-spec`** — depends-on (reason, not direction of
  work). Its §4 ⚠️ A1 is the original handoff: it names `client.ts:263` and `client.ts:296`,
  declares both out of the site's reach, and instructs that the reconnect case be appended to the
  onEvent proposal "rather than letting it evaporate." This spec is that instruction's second hop
  (proposal → this spec) after the parent spec's own S2 section went unbuilt.
- **`2026-08-17-gateway-client-error-hook-consumer-adoption`** — the parent spec's S3 consumer
  handoff. It already owns the future hub/site/paperclip package bumps, but its current DELTA covers
  only `onEventError` and its "Out of scope" section explicitly excludes S2. Slice 2 therefore
  amends that proposal to require an explicit wire-or-accept decision for `onReconnectError` and
  `onSocketError` at the same future bump; no consumer implementation is added here.

## 0. Product

From the approved proposal `2026-08-17-gateway-client-lifecycle-swallows-handoff`, verbatim:

> ## Problem
>
> `2026-08-17-pkg-gateway-client-onevent-errors-spec` (approved, pass 2) scoped its work into three
> slices. This run implemented Slice 0 (recon) and Slice 1 (`onEventError` — the `:263` consumer
> `onEvent` swallow) only... Slice 2 — the two sibling lifecycle swallows the spec's own §4 ⚠️ A1
> ... was **not** implemented in this run:
>
> - `packages/shared/src/gateway/client.ts` (reconnect swallow...) — every failed reconnect
>   attempt is discarded silently.
> - `packages/shared/src/gateway/client.ts` (socket `error` swallow...) — the runtime-supplied
>   socket error value ... is discarded instead of reported.
>
> ## Definition of done
>
> Implement Slice 2 exactly as specified in `2026-08-17-pkg-gateway-client-onevent-errors-spec.md`
> §2 "S2"... reusing Slice 1's `reportEventError`-style never-throw reporter shape rather than
> inventing a second one... add `onReconnectError?: (err, { delayMs }) => void` and
> `onSocketError?: (err: unknown) => void`, both defaulting to `console.error`; add the missing
> `generation` fence to the `on('error')` listener; leave the backoff curve, `closed` guard, and
> `onReconnectScheduled` untouched. Remove both `TODO(handoff):` comments as part of the fix.
>
> Then continue with the spec's Slice 3 (changeset + JSDoc + the hub/site/paperclip consumer-adoption
> proposal) — S1 must not ship to a published release without S3...

**What the parent spec's S3 actually still owes, verified in this checkout:** S3's artifacts exist,
but both describe only S1. The changeset (`.changeset/gateway-client-event-error-hook.md:5-14`)
names only `onEventError`; the consumer-adoption proposal is approved but explicitly excludes S2.
Once the two S2 hooks ship in the same pending minor, both artifacts would under-describe the release
and the future bump. Slice 2 amends both in place. It does not change the JSDoc contract already
established for `onEventError`, create a second proposal, or implement any consumer-side change.

## 1. AS-IS → TO-BE → DELTA

### AS-IS (verified in this checkout, `packages/shared/src/gateway/client.ts`)

- **`:251-255` — the socket `error` listener discards its argument:**
  ```ts
  on('error', () => {
    // close handler fires next — no action needed here.
    // TODO(handoff): this discards the runtime-supplied socket error value; carried forward
    // as S2 in proposals/2026-08-17-gateway-client-lifecycle-swallows-handoff.md.
  });
  ```
  No `generation` fence — every sibling listener (`open`, `message`, `close`, all in the same
  `wireEvents()`) opens with `if (this.generation !== gen) return;`; `error` is the one omission.
- **`:330-335` — the reconnect timer discards a failed `connect()`:**
  ```ts
  this.reconnectTimer = setTimeout(() => {
    this.reconnectTimer = null;
    // TODO(handoff): this discards every failed reconnect attempt; carried forward as S2 in
    // proposals/2026-08-17-gateway-client-lifecycle-swallows-handoff.md.
    void this.connect().catch(() => {});
  }, delay);
  ```
  `delay` (the closure variable holding the scheduled backoff, already captured for
  `this.opts.onReconnectScheduled?.(delay)` two lines above) is available but unused past that
  call.
- **`GatewayClientOptions` (`:10-61`) has no `onReconnectError` or `onSocketError` field.** The
  private `reportEventError` reporter (`:289-304`) is the only never-throw wrapper in the file and
  is coupled to `EventFrame`; it cannot be called directly by either new site without adapting its
  signature.
- **`.changeset/gateway-client-event-error-hook.md`** documents only `onEventError`. No mention of
  a reconnect or socket-error hook.
- **`client.test.ts`** has zero cases exercising a failed reconnect attempt or a socket `error`
  event; the existing `'schedules reconnect with exponential backoff'` case (`:222-281`) only
  covers the success path through two reconnects.
- **`rg -n 'TODO\(handoff\)' packages/shared/src/gateway/client.ts`** → 3 hits today: the S1-owed
  one at `:36-37` (out of scope here — belongs to the consumer-adoption proposal, already approved)
  and the two S2-owed ones at `:253-254` and `:332-333` (this spec's exit criterion).

### TO-BE (target behavior + invariants)

- A failed reconnect attempt (any rejection from `this.connect()` inside the timer callback)
  produces exactly one report: through `onReconnectError(err, { delayMs })` if supplied, else
  `console.error`. `delayMs` is the exact scheduled delay for that attempt (the same value already
  passed to `onReconnectScheduled`).
- A socket `error` event produces exactly one report: through `onSocketError(err)` if supplied
  (`err` is whatever the runtime handed the listener — an `Error` under Node `ws`, typically an
  `Event` in browsers), else `console.error` naming the socket error and carrying that value. The
  listener gains a `generation` fence matching its `open`/`message`/`close` siblings: a stale
  socket's `error` after a newer `connect()` reports nothing.
- Both new hooks share S1's never-throw reporter discipline: a hook that throws or rejects is
  contained, never becomes an unhandled rejection, and does not fall through to `console.error` (the
  consumer that supplied a hook owns reporting, per S1's precedent).
- **Invariant — control flow is unchanged.** The socket `error` handler still does not close, does
  not reconnect, does not reject `helloReject`, and does not flush `pending`; `close` still drives
  all of that, unchanged. The backoff curve (800 ms × 1.7, capped 15000 ms), the `closed` guard, and
  `onReconnectScheduled`'s existing call are byte-for-byte unchanged.
- **Invariant — additive only.** Every existing `GatewayClientOptions` construction keeps compiling;
  no rename, no removal, and no signature change to `onEvent` or `EventFrame`. No runtime source
  outside `packages/shared/src/gateway/` changes.
- Both `TODO(handoff):` markers at `:253-254` and `:332-333` are gone; the `:36-37` marker (S1's,
  owed to the separate approved consumer-adoption proposal) is untouched.
- The changeset names both new hooks in the same prose voice as the existing `onEventError`
  paragraph, so a consumer reading the release note before bumping sees the whole lifecycle-error
  surface in one place, not split across two releases.

### DELTA (numbered transitions, each mapped to a slice and its proving test)

1. `on('error', ...)` gains a `generation !== gen` fence, matching `open`/`message`/`close`.
   → Slice 1; proven by the "stale socket, generation already advanced → not reported" case.
2. `on('error', ...)` delivers the runtime-supplied error value to `onSocketError` when supplied,
   else `console.error`, via a shared never-throw reporter — and takes no other action.
   → Slice 1; proven by the "ws emits 'error' → reported once" and "does not close / flush /
   reconnect" cases.
3. The reconnect timer's `connect().catch(...)` reports the rejection to `onReconnectError` when
   supplied (with the scheduled `delayMs`), else `console.error`, instead of discarding it.
   → Slice 1; proven by the "autoReconnect: true, next connect() fails → reported once" case.
4. The backoff curve, successful-handshake reset, `closed` guard, and `onReconnectScheduled` call
   are unchanged. A successful reconnect resets the next delay to 800 ms; only consecutive failed
   reconnects advance it to about 1360 ms.
   → Slice 1; proven by correcting the existing success-path test to `[800, 800]`, adding a
   close-before-hello failure path that observes `[800, ~1360]`, and the backoff/timer assertions.
5. Both `TODO(handoff):` markers at the reconnect and socket-error sites are removed.
   → Slice 1; proven by the `rg -n 'TODO\(handoff\)'` count dropping from 3 to 1.
6. The changeset names `onReconnectError` and `onSocketError` alongside `onEventError`, still as a
   single `minor` bump.
   → Slice 2; proven by `rg` asserting both new hook names appear in the changeset body.
7. The existing consumer-adoption proposal requires each consumer, at its already-owned future
   package bump, to wire or explicitly accept all three hooks rather than only `onEventError`.
   → Slice 2; proven by both new hook names appearing in that proposal's DELTA and DoD.
8. `pnpm run ci` (build-all → typecheck-all → lint-all → test-all → changeset:status) is green with
   S2 merged, from the repo root — the same gate the parent spec's own §6 runs.
   → Slice 2; proven by running that command directly.

## 2. Approach — two vertical slices

```
Slice 1 (the proposal's DoD: onReconnectError + onSocketError + generation fence + TODO removal, red-state TDD)
   ─▶ Slice 2 (changeset + existing consumer-handoff amendment + full-repo CI gate)
```

Slice 1 is behavior-complete — the two swallows close, both markers are removed, and the DoD the
proposal states literally is met — but it is not mergeable/releasable without Slice 2. Slice 2 is
what makes the change *arrive* in the
same release that already carries `onEventError`: the parent spec's own S3 section is explicit that
"S1 must not ship to a published release without S3," and by the same reasoning S2's two hooks must
not ship silently absent from the release note that already exists and is still unpublished
(`packages/shared/package.json` is still `0.9.0`; the changeset has not yet been consumed by a
Version Packages merge — verified via `git log` showing no version bump commit after `a5e17f7`).

---

### Slice 1 — `onReconnectError` + `onSocketError`: no lifecycle failure leaves this client unreported

**Tags:** `logic`, `test` · **Estimate:** 4–6 h (matches the parent spec's own S2 estimate)

**Goal:** after this slice, a failed reconnect attempt and a socket `error` event are both
reported exactly once, through the same never-throw hook discipline S1 established for
`onEventError`, with zero change to reconnect timing or close-driven control flow.

**Do:**

- **Add both options to `GatewayClientOptions`, additively**, beside `onEventError`:
  ```ts
  /** Called when an auto-reconnect attempt fails. Default when omitted: console.error. */
  onReconnectError?: (err: unknown, attempt: { delayMs: number }) => void | Promise<void>;
  /** Called on a socket 'error' event (Error under Node ws; typically an Event in browsers).
   *  Default when omitted: console.error. Reporting only — `close` still drives all lifecycle
   *  control flow (see the comment at the listener). */
  onSocketError?: (err: unknown) => void | Promise<void>;
  ```
  Their JSDoc must also state that a reporter which throws or rejects is contained and never escapes.
- **Reuse S1's never-throw reporter shape rather than inventing a second one.** Either (a) extract
  `reportEventError`'s try/catch-and-swallow body into a small shared private helper parameterized
  by the hook and its args, or (b) write two private reporters (`reportReconnectError`,
  `reportSocketError`) with the exact same two-layer containment (`try { hook(...) } catch {}` plus
  a `.catch(() => {})` for an async hook) as `reportEventError` at `:289-304`. Either is acceptable;
  what is not acceptable is a third, subtly different containment idiom in this file. Public
  callback types must retain the `void | Promise<void>` form promised above.
- **`scheduleReconnect()` — route the timer's rejection through the new reporter,** passing the
  already-captured `delay` as `{ delayMs: delay }`:
  ```ts
  this.reconnectTimer = setTimeout(() => {
    this.reconnectTimer = null;
    void this.connect().catch((err) => this.reportReconnectError(err, { delayMs: delay }));
  }, delay);
  ```
  Do not touch `this.backoffMs = Math.min(this.backoffMs * 1.7, 15000)`, the `if (this.closed)
  return;` guard, or the `this.opts.onReconnectScheduled?.(delay)` call two lines above.
- **`wireEvents()` — the `on('error', ...)` listener gains the generation fence and the reporter
  call, and nothing else:**
  ```ts
  on('error', (err: unknown) => {
    if (this.generation !== gen) return;
    // close handler fires next — no control-flow action needed here; reporting only.
    this.reportSocketError(err);
  });
  ```
  Keep the existing comment's substance (adapt its wording to note reporting now happens). Do
  **not** call `close()`, `scheduleReconnect()`, `helloReject`, or `flushPending` from this
  listener — that would double-drive the lifecycle `close` already owns.
- **Remove both `TODO(handoff):` blocks** at the reconnect and socket-error sites (leave the S1
  `onEventError` one at `:36-37` untouched — it belongs to the separate, already-approved
  consumer-adoption proposal).
- **Red-state first (G3).** Write the reconnect-failure case and the socket-error case, run both
  against current `HEAD`, paste the failing output into the PR — same convention S1 used.

**Files:** `packages/shared/src/gateway/client.ts` (the two options, the two reporter call sites,
the generation fence, the two `TODO(handoff):` removals), `packages/shared/src/gateway/client.test.ts`
(new cases appended; prior `onEvent`-failure cases stay untouched. Correct the existing reconnect
success-path assertion from `[800, ~1360]` to `[800, 800]` because `sendConnect()` resets
`backoffMs` after the successful second handshake; use a new close-before-hello case to prove
consecutive failures advance to `[800, ~1360]`).

**Definition of done (machine-checkable):**

```bash
cd packages/shared && pnpm run test
#   red-state first (G3): both new cases below shown failing against pre-slice code.
#   - autoReconnect: true, socket closes, the NEXT connect() fails (WebSocketImpl throws)
#       → exactly one console.error naming the reconnect; the exact Error is retained as an argument;
#         NO throw escapes the timer and no further retry is invented by this reporting-only change
#       → with onReconnectError supplied: hook called once with (err, { delayMs }); delayMs matches
#         the value passed to onReconnectScheduled for that attempt; console.error NOT called
#   - the existing successful-reconnect case expects reconnectDelays [800, 800], matching the
#       current successful-handshake reset in sendConnect()
#   - a reconnect socket that closes BEFORE hello rejects that attempt and schedules the next one
#       → exactly one report for the failed attempt and reconnectDelays [800, ~1360]
#   - ws emits 'error' → onSocketError called once with the exact emitted value
#       → when absent, console.error called once with a message naming the socket error and that value
#   - ws emits 'error' on a STALE socket (generation already advanced by a newer connect()) → NOT reported
#   - ws 'error' does NOT close the socket, does NOT flush pending, does NOT schedule a reconnect
#       (assert via a pending request still unsettled and no new socket constructed)
#   - onReconnectError / onSocketError that throw or reject → nothing escapes; no unhandled rejection;
#       console.error NOT called (mirrors the existing onEventError-throws / onEventError-rejects cases)
pnpm run typecheck && pnpm run build && pnpm run lint
cd ../.. && pnpm run typecheck-all && pnpm run lint-all
rg -n 'this\.connect\(\)\.catch\(\(\) *=> *\{\}\)' packages/shared/src/gateway/client.ts  # → ZERO hits
rg -n 'onReconnectError|onSocketError' packages/shared/src/gateway/client.ts   # → declared + used
rg -n 'TODO\(handoff\)' packages/shared/src/gateway/client.ts                  # → exactly ONE (the S1/onEventError one at :36-37)
rg -n 'backoffMs\s*=\s*Math.min\(this.backoffMs \* 1.7, 15000\)' packages/shared/src/gateway/client.ts  # → still there
test "$(rg -n 'setTimeout|setInterval' packages/shared/src/gateway/client.ts | wc -l | tr -d ' ')" -eq 3
```

---

### Slice 2 — Release-note and consumer-handoff update + full-repo CI gate

**Tags:** `docs`, `infra` · **Estimate:** 1–2 h

**Goal:** the still-unpublished `@minion-stack/shared` release note and the already-approved future
consumer handoff both describe the whole lifecycle-error surface — `onEventError`,
`onReconnectError`, and `onSocketError` — and `pnpm run ci` is green with Slice 1 merged.

**Do:**

- **Amend `.changeset/gateway-client-event-error-hook.md` in place** (do not add a second changeset
  file — this is one logical release of one file, and two changesets for one package would compute
  the same `minor` bump twice for no benefit). Append two short paragraphs, in the same
  consumer-facing, no-changelog-boilerplate voice as the existing `onEventError` prose: what
  `onReconnectError` and `onSocketError` are for, their default (`console.error`), and that they
  support sync or async reporters whose own failures are contained. State plainly that this is
  still no protocol, frame-type, or reconnect-timing change — reuse the existing closing line.
- **JSDoc** on the two new options in `client.ts` already carries the per-option contract from
  Slice 1 (default behavior, never-throw); no separate doc file exists for `packages/shared`
  (confirmed absent in the parent spec's own S3 section) so nothing further is owed here.
- **Amend `proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` in place.** Preserve
  its approved status and existing ownership of the future three-repo bump, update its S2 exclusion,
  and extend its TO-BE, DELTA, and DoD so each consumer must wire or explicitly accept
  `onReconnectError` and `onSocketError` as well as `onEventError`. This is handoff correctness, not
  consumer implementation; do not create a second proposal or edit any consumer repo.
- **Do not** edit `proposals/index.json` or `specs/index.json` — the generators own both.

**Files:** `.changeset/gateway-client-event-error-hook.md` and
`proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` (both amended, not replaced).

**Definition of done (machine-checkable):**

```bash
cd /home/agent/work
rg -n '^"@minion-stack/shared": minor$' .changeset/gateway-client-event-error-hook.md   # → still minor
rg -n 'onReconnectError' .changeset/gateway-client-event-error-hook.md                  # → named
rg -n 'onSocketError' .changeset/gateway-client-event-error-hook.md                     # → named
test "$(rg -c 'onReconnectError' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md)" -ge 3
test "$(rg -c 'onSocketError' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md)" -ge 3
git diff --name-only <base>...HEAD | rg 'proposals/index.json|specs/index.json'         # → ZERO
pnpm run ci      # build-all → typecheck-all → lint-all → test-all → changeset:status
```

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `packages/shared/src/gateway/client.ts` | 1 | `onReconnectError` + `onSocketError` options; reconnect-timer and socket-`error` reporter call sites; `generation` fence on `error`; removal of the two S2-owed `TODO(handoff):` markers |
| `packages/shared/src/gateway/client.test.ts` | 1 | append the reconnect-failure and socket-error matrix; correct the success-path delay assertion to match the existing reset-on-success behavior; prior `onEvent` cases stay untouched |
| `.changeset/gateway-client-event-error-hook.md` | 2 | amended — both new hooks named, bump stays `minor` |
| `proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md` | 2 | amended — future bump requires a wire-or-accept decision for all three hooks |

**Zero `.svelte` files. Zero changes to `types.ts`, `protocol.ts`, `index.ts`, or the export map.
Zero schema, DDL, or migration files. Zero new dependencies. No `package.json` version edit
(Changesets owns the bump). No edits under `packages/cache/` or `packages/shells-bridge/`** (neither
imports `GatewayClient`, per the parent spec's §1 recon, re-checkable with the same grep at PR time).
**No edits to `minion_hub/`, `minion_site/`, `paperclip-minion/`, or `minion/`** — none is checked
out in this workspace. Their future package bump and hook decisions remain owned by the amended,
already-approved `2026-08-17-gateway-client-error-hook-consumer-adoption` proposal.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones." This sits in the same row as the parent
spec — **"Gateway protocol (frame types, events)"** — and, like that spec, does not enter it: no
frame type, event name, `PROTOCOL_VERSION`, or wire byte changes anywhere in this diff.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `packages/shared` public API | **Additive only.** Two more optional options; no signature, removal, or rename. Every existing construction keeps compiling | Slice 1 DoD: `pnpm run typecheck-all` + the reconnect/event regression cases |
| `minion_hub` (`src/lib/services/gateway.svelte.ts`) | **None until a future bump; then reconnect and socket failures log by default unless redirected or explicitly silenced.** This spec does not bump the consumer | The amended consumer-adoption proposal requires an explicit wire-or-accept decision for both hooks |
| `minion_site` (`src/lib/services/member-gateway.svelte.ts`) | **None now; real once bumped.** The site's own spec (§4 ⚠️ A1, cited above) awaits this fix so reconnect/socket failures stop being invisible | The amended adoption proposal names its existing `reportGatewayError` sink and requires the two new decisions |
| `paperclip-minion` `minion_gateway` adapter (via `./node`) | **None until its future bump; then Node socket errors and reconnect failures log by default unless redirected or explicitly silenced.** | The amended adoption proposal owns the decision; no adapter file changes here |
| `minion/` gateway (server) | **None** — it is the peer that sends frames, not a consumer of this client class | no file in `minion/` is touched |
| `packages/cache`, `packages/shells-bridge` | **None** — neither imports `GatewayClient` (parent spec §1, re-verify with the same grep at PR time) | `rg -n 'GatewayClient|onEvent|createNodeGatewayClient' packages/cache/src packages/shells-bridge/src` → zero hits expected |
| `@minion-stack/db`, `@minion-stack/auth`, shared hub↔site DB | **None** — no query, schema, or session handling | zero runtime or schema files outside `packages/shared/src/gateway/` |
| `packages/design-tokens`, any UI | **None** — zero `.svelte` files; ui-design-governance, `lint:design`, `lint:tokens` do not apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b (the same tag-routing convention the parent spec cites) | §6 step 1 below asserts it mechanically |
| Public npm | Same fact as the parent spec: `@minion-stack/shared` is `access: public`; the pending release now additionally starts writing `console.error` for reconnect and socket-error failures where it was silent | Same `minor` bump, one amended changeset, no new file |

### Alert — the noise question the parent spec already decided, restated so it is not silently re-litigated

The parent spec's ⚠️ A2 (§4) already decided, on the record, that this client ships **no dedupe** for
reconnect-failure reporting: a gateway down for an hour can print a reconnect line roughly every 15 s
once this slice lands (about 240 lines/hour at the backoff cap). That reasoning — dedupe hides the
healthy→failing transition, adds cross-call state to a library that has none, and the site is already
building its own collapsing sink — is not reopened here. If a reviewer disagrees, it is a real
disagreement to raise at review, not a gap in this spec.

## 5. Out of scope (explicit)

Everything the parent spec's §5 excludes, unchanged: event replay; awaiting `onEvent` / backpressure;
retry, backoff, or reconnect-policy changes (the 800 ms × 1.7 → 15 s curve, the `closed` guard, and
`onReconnectScheduled` are untouched — Slice 1's DoD greps prove it); the malformed-JSON discard at
`client.ts:249-251` (a deliberate, threat-modelled drop citing mitigation `T-07-02`); typed error
classes / structured provenance; changes to `onEvent`'s signature, `EventFrame`, `PROTOCOL_VERSION`,
`protocol.ts`, or the export map; creating `packages/shared/README.md`; remote telemetry; and
dedupe/throttling in the library (restated above, not reopened).

Specific to this spec:

- **Editing `minion_hub`, `minion_site`, `paperclip-minion`, or `minion/`.** No consumer repo is
  checked out here; consumer implementation remains owned by the already-approved adoption
  proposal. Slice 2 only corrects that proposal's hook coverage.
- **Filling the consumer proposal's recon table without evidence.** Its "unverified — repo absent"
  rows remain unchanged until work runs where those repos are present.
- **Filing a new proposal.** Unlike the parent spec's S3 (which had to file the consumer-adoption
  proposal from scratch), that proposal already exists and is approved; Slice 2 amends it in place.
- **A second changeset file.** One amended file, one `minor` bump, covering the whole lifecycle
  error-reporting surface added across S1 and this spec.
- **Any UI.** Zero `.svelte` files ⇒ ui-design-governance, `lint:design`, and `lint:tokens` do not
  apply to either slice.

## 6. End-to-end verification

Run with Slice 1–2 merged in `minion-meta`, from the repo root.

Memory constraint: `/memory/MINION/MEMORY.md` links the hard rule in
`/memory/MINION/gw-no-full-test-suite.md` not to run the full `minion/` gateway suite on this box.
The root workspace is `packages/*`, so the commands below exercise `minion-meta` packages only;
do not substitute `cd minion && pnpm test`.

```bash
cd /home/agent/work

# 1. Focused behavioral gate, then the complete minion-meta package gate
cd packages/shared && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run lint
cd ../..
pnpm run ci                                    # build-all, typecheck-all, lint-all, test-all, changeset:status

# 2. Scope and tag hygiene (logic/test/docs/infra — no design or token lint)
if git diff --name-only <base>...HEAD | grep -Eq '\.svelte$'; then echo "FAIL: UI out of scope"; exit 1; fi
if git diff --name-only <base>...HEAD | grep -Eq 'gateway/(types|protocol|index)\.ts'; then echo "FAIL: protocol surface"; exit 1; fi
if git diff --name-only <base>...HEAD | grep -Eq '^(minion|minion_hub|minion_site|paperclip-minion)/'; then echo "FAIL: consumer repos"; exit 1; fi

# 3. Static proof both swallows are gone, the fence is in place, and control-flow anchors remain
test -z "$(rg -n 'this\.connect\(\)\.catch\(\(\) *=> *\{\}\)' packages/shared/src/gateway/client.ts)"
rg -n 'onEventError|onReconnectError|onSocketError' packages/shared/src/gateway/client.ts  # → all three declared + used
rg -n "on\('error'" -A3 packages/shared/src/gateway/client.ts            # → generation fence is the first line in the body
test "$(rg -n 'TODO\(handoff\)' packages/shared/src/gateway/client.ts | wc -l | tr -d ' ')" -eq 1
rg -n 'backoffMs\s*=\s*Math.min\(this.backoffMs \* 1.7, 15000\)' packages/shared/src/gateway/client.ts
test "$(rg -n 'setTimeout|setInterval' packages/shared/src/gateway/client.ts | wc -l | tr -d ' ')" -eq 3

# 4. Release and handoff proof
rg -n '^"@minion-stack/shared": minor$' .changeset/gateway-client-event-error-hook.md
rg -n 'onEventError' .changeset/gateway-client-event-error-hook.md
rg -n 'onReconnectError' .changeset/gateway-client-event-error-hook.md
rg -n 'onSocketError' .changeset/gateway-client-event-error-hook.md
test "$(rg -c 'onReconnectError' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md)" -ge 3
test "$(rg -c 'onSocketError' proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md)" -ge 3

# 5. G3 evidence: before implementation, the new reconnect-failure and socket-error tests must
#    exit non-zero against the pre-slice code; paste that output in the PR before recording green.
```

**Ship gate:**

1. §6 steps 1–4 green, with step 5's red-state capture in the PR.
2. The proposal's DoD checked clause by clause: `onReconnectError` and `onSocketError` exist and
   default to `console.error`; the `generation` fence is present; the backoff curve, `closed`
   guard, and `onReconnectScheduled` are untouched (Slice 1 DoD greps); both `TODO(handoff):`
   markers are gone.
3. Slice 1's red-state failure output (both new cases) pasted into the PR (G3).
4. The amended changeset names both new hooks and stays `minor`; `changeset:status` is green.
5. The consumer-adoption proposal remains `status: approved`, its evidence rows remain honestly
   unverified where repos are absent, and its TO-BE/DELTA/DoD now cover all three hooks.
