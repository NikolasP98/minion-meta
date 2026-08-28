---
id: 2026-08-17-site-member-gateway-swallowed-errors-spec
title: "member-gateway — every gateway rejection is reported; no empty catches"
stage: spec
status: implementing
pass: 2
created: 2026-08-17
updated: 2026-08-20
proposal: 2026-08-17-site-member-gateway-swallowed-errors
verdict: approved
repos: [minion_site]
tags: [logic, test, ui]
type: fix
---

# `member-gateway` — every gateway rejection is reported

**Owner surface:** `minion_site` (`NikolasP98/minion-site`) —
`src/lib/services/member-gateway.svelte.ts`, one new plain-TS sibling module and its test, and (S3
only) the members-area component that renders the resulting state.
**Design ancestors:** [`ws-duplication-audit`](ws-duplication-audit.md) §"Consumer 2: minion_site"
(the pre-Phase-7 anatomy of this exact file: hand-rolled lifecycle, own `pending` map, `sessions.list`
polled every 30 s), `.planning/phases/07-ws-consolidation/07-03-SUMMARY.md:107-119` (Phase 7 replaced
that 373-LOC lifecycle with `GatewayClient` from `@minion-stack/shared`, and recorded that the site
had **no vitest suite** at the time — see ⚠️ A4),
[`2026-08-13-ci-minion-site-ci-spec`](2026-08-13-ci-minion-site-ci-spec.md) §1 and §S3 (site tooling
reality: `bun run check` is `svelte-check`; `vitest` is a devDependency with a `vitest.config.ts`
scoped to `src/**/*.test.ts`; CI did **not** run it as of 2026-08-13),
[`2026-08-17-site-device-identity-role-escalation-spec`](2026-08-17-site-device-identity-role-escalation-spec.md)
§S2 — **edits the same file in the same wave** (⚠️ A3).
**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — tags are per-slice and are the routing unit. S1 and S2 are `logic`/`test`: red-state TDD is
mandatory, **no** UI governance. S3 is the only `ui` slice: it invokes the ui-design-governance skill
and its design/token lint, and it exists on its own so the seam falls on a tag boundary (§4b:
"prefer a `ui` slice + a `logic` slice where the seam is natural").

---

## 0. Product

From the approved proposal `2026-08-17-site-member-gateway-swallowed-errors`, verbatim:

> # Member dashboard gateway failures silently swallowed (3 empty catches)
>
> ## Problem
>
> src/lib/services/member-gateway.svelte.ts:236,254,322 .catch(() => {}) on session/chat/poll —
> outages look like empty data.
>
> ## Definition of done
>
> console.error minimum (ideally surfaced state); killing WS mid-poll produces observable errors.
>
> ## Out of scope
>
> Retry/backoff design.

**What exactly is being discarded.** The site drives the gateway through `GatewayClient` from
`@minion-stack/shared`, which **is** checked out here — so the set of rejections those three
`.catch(() => {})` calls absorb is not a guess. Every one of them is a plain `Error` created in
`packages/shared/src/gateway/{client,protocol}.ts`:

| Rejection | Source (verified in this checkout) | What it means to a member |
|---|---|---|
| `not connected` | `client.ts:134` — `request()` called while `readyState !== OPEN` | the socket is down *right now* |
| `request '<method>' timed out after 15000ms` | `client.ts:140` | gateway alive, not answering |
| `closed (<code>): <reason>` | `client.ts:226` — `flushPending` on socket close | **the proposal's probe: kill the WS mid-poll and every in-flight request rejects with this** |
| `disconnected` | `client.ts:165` — `flushPending` inside `close()` | teardown, usually benign |
| *server-supplied message* | `protocol.ts:57` — `res` frame with `ok: false` | a real gateway-side error (auth, bad params, agent crash) |

The last row is the one that makes this more than hygiene. A `{ ok: false }` response frame is the
gateway *successfully telling the site that something is wrong* — a fully-formed, human-readable
diagnostic that travels the wire and is then dropped on the floor by `() => {}`. The member sees an
empty session list and concludes there is nothing there; the console is clean, so nobody can tell an
outage from an empty account. That is the whole bug: **the failure and the empty-success case are
rendered identically and logged identically (not at all).**

**Scope of the fix, in one sentence:** every promise the module starts without returning or awaiting
must end in a sink that logs, and the state that sink records must be readable by the UI — after
which "the dashboard is empty" and "the dashboard is broken" are different observable facts.

## 1. Assumptions — Slice 0 is mandatory

**`minion_site/` is not checked out in this workspace** (the meta-repo `.gitignore` excludes every
subproject; verified — `ls minion_site` fails here). Everything about the *shared client* above was
read from disk and is fact. Everything about the *site file* — the three line numbers, which call
each one guards, the module's reactive shape — is carried from the proposal (filed today, so strong)
and from `specs/ws-duplication-audit.md` §Consumer 2 plus
`.planning/phases/07-ws-consolidation/07-03-SUMMARY.md`. Treat those as leads. Five carried claims
are load-bearing:

1. **The three sites are `.catch(() => {})` at 236 / 254 / 322, guarding session, chat and poll.**
   If a partial fix has landed since this morning, cut this spec to whatever remains and say so in
   the PR — do not add a second sink beside an existing one.
2. **The poll is a `setInterval` re-issuing `sessions.list` every 30 s** (ws-duplication-audit
   §Consumer 2, line 137). Phase 7 rewrote the lifecycle around `GatewayClient`; whether it kept the
   30 s interval verbatim is a Slice 0 question, and the cadence sets the *worst-case latency of the
   proposal's own DoD probe* (§6 step 3 waits one full period).
3. **The module holds Svelte 5 rune state** (`$state`) — it is a `.svelte.ts` file in a runes-only
   codebase. This decides testability, not style: a `.svelte.ts` module containing runes is **not**
   plain TypeScript to vitest; it must be compiled by the Svelte plugin. ⚠️ A4 and S1's design (pure
   sink in a plain `.ts` sibling) exist entirely because of this.
4. **Site tooling:** `bun run check` = `svelte-check`; `vitest` + `vitest.config.ts` (glob
   `src/**/*.test.ts`) exist; a `test` package script may not. DoD lines below therefore call
   `bun x vitest run <file>` directly. If `2026-08-13-ci-minion-site-ci-spec` §S3 has landed,
   `bun run test` works too — prefer it.
5. **Base branch.** AGENTS.md's project map and `2026-08-13-ci-minion-site-ci-spec` say `master`;
   `2026-08-12-minion-factory-agent-pipeline-spec.md:65` says the factory launches site work against
   `dev`. Confirm before branching — this is a one-command question that costs a rebase if skipped.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion_site                     # if absent: git clone git@github.com:NikolasP98/minion-site.git
git branch -r                      # settle assumption 5 (master vs dev)

# the three sites — the whole point
rg -n -B12 -A4 'catch\(\(\) *=> *\{\}\)' src/lib/services/member-gateway.svelte.ts
#   record for EACH: the awaited expression, whether the caller is fire-and-forget or inside an
#   async function that could propagate, and the surrounding reactive assignment

# every OTHER silent path in the same file (an empty catch is not the only way to lose an error)
rg -n 'catch|\.then\(|void |Promise\.(all|race|allSettled)' src/lib/services/member-gateway.svelte.ts
rg -n 'setInterval|setTimeout' src/lib/services/member-gateway.svelte.ts     # poll cadence (assumption 2)
rg -n 'onEvent|onClose|onOpen|onReconnectScheduled|autoReconnect' src/lib/services/member-gateway.svelte.ts

# reactive shape + what the UI already reads (assumption 3, and S3's reuse question)
rg -n '\$state|\$derived|export (const|let|function|class)' src/lib/services/member-gateway.svelte.ts
rg -n 'member-gateway' src --glob '*.svelte' --glob '*.ts'
rg -ni 'offline|reconnect|disconnected|toast|banner|status' src/lib/components/members src/routes/'(app)' | head -40

# tooling (assumption 4) + can vitest even import a runes module? (⚠️ A4)
rg -n '"(check|test|lint|lint:design|lint:tokens|format)"' package.json
rg -n 'include|plugins|svelte' vitest.config.ts
ls src/**/*.test.ts
```

**Three answers must be written into the PR description before S1 starts:** (a) what each of the
three catches actually guards; (b) the poll cadence; (c) whether `bun x vitest run` can import a
module containing runes in this repo today — because if it cannot, S1's tests live *only* in the new
plain-TS sibling, and that is a design constraint, not a shortcut. Slice 0 changes no files.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (nothing is swallowed: one sink, console.error) ─▶ S2 (classify + reactive state) ─▶ S3 (surface it in the members area)
```

**S1 satisfies the proposal's DoD literally** ("console.error minimum", "killing WS mid-poll produces
observable errors") and is independently shippable. S2 turns a console line into state a human can
see without devtools; S3 is the proposal's parenthetical ("ideally surfaced state") and is the only
slice that touches a `.svelte` file. If the wave must cut scope, cut after S1 or after S2 — and then
AGENTS.md's **open-items ledger** applies: a `TODO(handoff):` at the exact site *plus* an append to
the source proposal naming what is still invisible.

The ordering is not arbitrary. S1 gives S2 a single choke point to classify at, and S2 gives S3
something to render. Doing S3 first would mean inventing state in a component.

---

### S1 — One sink; no promise in this module ends in silence

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** after this slice, `rg 'catch\(\(\) *=> *\{\}\)'` over the file returns nothing, and every
rejection at an in-scope fire-and-forget call site reaches `console.error` exactly once with the
operation name attached. A promise returned to an upstream caller may continue to reject to that
caller; it must not also be logged here unless this module deliberately consumes it.

**Do:**

- **Create `src/lib/services/gateway-errors.ts` — plain TypeScript, no runes, no imports from
  `.svelte.ts`.** This is the deliberate testability seam (assumption 3 / ⚠️ A4): the logic under
  test must be importable by vitest whether or not the Svelte plugin is wired into it.

  ```ts
  /** Normalize anything a rejected promise can carry into an Error. */
  export function toError(value: unknown): Error;

  /** Reported once per failure. `op` is a stable, greppable operation id. */
  export interface GatewayFailure { op: string; message: string; error: Error; at: number }

  /**
   * The sink. MUST NOT THROW: it runs inside .catch() on fire-and-forget promises,
   * so a throw here becomes an unhandled rejection — the exact invisibility being fixed.
   */
  export function reportGatewayError(
    op: string,
    value: unknown,
    onFailure?: (f: GatewayFailure) => void,
  ): GatewayFailure;
  ```
  `reportGatewayError` logs `console.error('[member-gateway] <op> failed:', error)` — the **Error
  object**, not `String(err)`, so devtools keeps the stack — then calls `onFailure` inside its own
  `try`/`catch` so a broken observer cannot turn the sink into a rejection. The observer exception
  is not logged as a second gateway failure. `toError` covers the non-`Error`
  rejection values a `catch` can legally receive (string, `undefined`, a `Response`, a plain object)
  — thrown non-Errors are exactly where naive `err.message` handling produces `undefined` and
  re-hides the failure.
- **Replace the three empty catches** with `.catch((e) => reportGatewayError('<op>', e, onFailure))`.
  Use stable op ids — `'session'`, `'chat'`, `'poll'` unless Slice 0 shows a more accurate name; they
  become the grep handle and, in S2, the state key. **Do not rethrow**: these are unawaited call
  sites, and rethrowing converts a silent failure into an unhandled rejection, which is a different
  bug, not a fix.
- **Sweep the rest of the module, don't stop at three.** Slice 0's second grep exists for this: a
  bare `catch {}`, or a fire-and-forget `.then(ok)` / `void somePromise()` with no rejection arm,
  loses errors just as completely as `.catch(() => {})`. Route each consumed or fire-and-forget
  rejection through the same sink. Do not add a catch to a promise the module returns for its
  caller to handle. If one is a genuine deliberate ignore, it gets a one-line comment saying why —
  an unexplained silence is what this spec exists to remove.
- **Wrap the module's own `onEvent` body in `try`/`catch` → sink.** Verified reason, not
  speculation: `packages/shared/src/gateway/client.ts:263` is
  `void Promise.resolve(this.opts.onEvent?.(frame)).catch(() => {})` — the shared client swallows
  anything the site's event handler throws. The site cannot fix that from here (⚠️ A1), but it can
  refuse to hand the shared client an error to lose.
- **Red-state first (G3):** write the "killing the socket mid-request produces a console.error" test,
  run it against current `HEAD`, paste the failing output into the PR. A suite that passes before the
  fix is not a red state.

**Files:** `src/lib/services/gateway-errors.ts` (new), `src/lib/services/gateway-errors.test.ts`
(new; place per whatever `vitest.config.ts`'s `include` glob accepts — Slice 0),
`src/lib/services/member-gateway.svelte.ts`.

**Definition of done (machine-checkable):**

```bash
cd minion_site
bun x vitest run src/lib/services/gateway-errors.test.ts
#   red-state first (G3), then green. Cases:
#   - reportGatewayError('poll', new Error('closed (1006): ')) → console.error called EXACTLY once,
#       first arg contains '[member-gateway]' and 'poll', second arg IS the Error instance
#   - the four other §0 rejections (not connected / timed out / disconnected / server message)
#       each produce exactly one console.error carrying the original message text
#   - toError('boom') / toError(undefined) / toError({code:1}) → an Error with a non-empty message
#       (never the literal 'undefined')
#   - an onFailure observer that throws → reportGatewayError still RETURNS and still logged
#   - reportGatewayError never throws for any input above (assert via expect(...).not.toThrow)
rg -n 'catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)' src/lib/services/member-gateway.svelte.ts   # → ZERO hits
rg -n 'catch\s*\{\s*\}' src/lib/services/member-gateway.svelte.ts                          # → ZERO hits
rg -c 'reportGatewayError' src/lib/services/member-gateway.svelte.ts                       # → >= 3
bun run check     # 0 errors; warning count must NOT increase (see §6 note — the site carries one
                  # known pre-existing a11y warning in src/lib/components/ui/LeadFormDialog.svelte)
```

---

### S2 — Classify the failure and record it as state

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** the module exposes what is wrong, not only that something was. A consumer can ask "is the
member's dashboard currently degraded, and since when?" without parsing console output — and a
30-minute outage does not print 60 identical lines.

**Do:**

- **Add a classifier to `gateway-errors.ts`** (pure, still no runes):
  ```ts
  export type GatewayFailureKind = 'transport' | 'timeout' | 'unknown';
  export function classifyGatewayError(err: Error, connected: boolean): GatewayFailureKind;
  ```
  `transport` = the socket is the problem (`not connected`, `closed (…)`, `disconnected`, or
  `connected === false`); `timeout` = the `request '<m>' timed out after` shape; `unknown` = every
  other error while connected. In particular, do **not** label an unmatched message `server`:
  `GatewayClient` rejects both server responses and unrelated consumer/runtime failures as bare
  `Error` instances, so provenance is not recoverable from this value.
  **State the limitation in a comment, in the code:** this classifies by matching message strings the
  shared client happens to produce today, which is why `connected` — state the site actually owns —
  is a parameter and takes precedence over any string match. This is a documented boundary, not an
  unwired promise of typed errors; adding typed error classes upstream is outside this fix.
- **Expose reactive state from `member-gateway.svelte.ts`** — rune `$state`, shaped so a component
  can render it without further logic. Track active failures by stable `op`; each entry has at least
  `{ kind, message, since, count }`, and expose a read-only aggregate with
  `{ degraded, kind, op, message, since, count }` for presentation. Set/update only the failing
  operation's entry and clear only that entry on the next success of the same `op`. The aggregate
  remains degraded while any other operation still has an active failure; choose the most recently
  failed active operation for its scalar presentation fields. A poll success is proof that the poll
  recovered, not that a still-failing chat/session operation recovered. Do not clear on reconnect
  alone, which proves only that a socket opened. Export a getter or `$derived` snapshot, not the
  mutable per-operation store.
- **Collapse per-operation duplicates in the log, never the first one.** The invariant, which is also
  the proposal's DoD: **the first failure after a healthy→failing transition is always logged**, and
  the first active failure for another `op` is always logged. Repeats of an identical
  `(op, kind, message)` bump that operation's `count` and stay quiet until that operation recovers;
  a changed `kind` or `message` for the same active operation is logged and becomes its current
  failure. Each operation's recovery logs one `console.info` "recovered after N failures". This is
  a logging policy, not a retry policy — see §5.
- **Do not add retry, backoff, or reconnect behavior of any kind.** `GatewayClient` already owns
  reconnection (`autoReconnect`, `client.ts:288-298`); the proposal excludes retry/backoff design.
  If Slice 0 shows the poll stacks overlapping requests during an outage, the *only* permitted change
  is skipping a poll tick while a previous one is still in flight (a re-entrancy guard, not a
  schedule), and even then the first failure of the transition must still be reported.

**Files:** `src/lib/services/gateway-errors.ts`, `src/lib/services/gateway-errors.test.ts`,
`src/lib/services/member-gateway.svelte.ts`.

**Definition of done (machine-checkable):**

```bash
cd minion_site
bun x vitest run src/lib/services/gateway-errors.test.ts
#   - classify(new Error('closed (1006): '), true)                    → 'transport'
#   - classify(new Error('not connected'), false)                     → 'transport'
#   - classify(new Error("request 'sessions.list' timed out after 15000ms"), true) → 'timeout'
#   - classify(new Error('agent is not running'), true)               → 'unknown'
#   - classify(new Error('agent is not running'), false)              → 'transport'
#         ← connected=false OUTRANKS the string match; the anti-regression anchor
#   - dedupe: 5 identical (op,kind,message) failures → 1 console.error, count === 5
#   - the 2nd of two failures differing only in `op` IS logged (transition always logged)
#   - success for one failed op clears only that op; another active op keeps degraded === true
#   - final active op success → state cleared, exactly one recovery info line for that op
rg -n 'setTimeout|setInterval|backoff|retry' src/lib/services/gateway-errors.ts   # → ZERO hits
#     (proof the sink stayed a sink and did not grow a retry policy — §5)
bun run check
```

---

### S3 — Surface it in the members area

**Tags:** `ui`, `test` · **Estimate:** 4–6 h · **Gates: ui-design-governance applies to this slice only**

**Goal:** a member with a broken gateway sees that the dashboard is broken, in their own language,
without opening devtools. "Empty" and "failed" stop looking the same.

**Do:**

- **Invoke the `ui-design-governance` skill before opening any `.svelte` file** (AGENTS.md, non-optional).
- **Reuse before you build.** Slice 0's last grep answers whether the members area already has a
  connection/offline indicator or a toast host. If one exists, feed it `degraded`/`kind` and stop.
  A second, parallel status widget is a regression in a design-governed codebase, not a feature.
- If nothing exists: one small, non-modal status strip at the top of the members shell (the layout
  that already mounts the gateway service — Slice 0 identifies it; `ChatTab.svelte` and
  `src/lib/state/member.svelte.ts` are the known neighbours per
  `.planning/phases/04-fold-minion-shared/04-03-SUMMARY.md:31-33`). Rendered only when
  `degraded === true`.
- **Tokens, not values.** Status colors come from the full triple —
  `--color-warning-{fg,surface,border}` for `transport`/`timeout` (transient connection failures)
  and `--color-danger-{fg,surface,border}` for `unknown`. Type via `.t-body` /
  `.t-caption`; spacing from the `--space-*` scale (remember `--space-5/7/9/10/11/16` do not exist).
  No hex, no Tailwind palette utility, no arbitrary size, no numeric z-index.
- **Copy goes through Paraglide.** The site ships EN/ES (AGENTS.md → `minion_site` "Paraglide i18n").
  Hardcoded English in a `.svelte` file is a defect here. Two messages, both plain-language and
  free of `kind` jargon: one transient ("Your assistant connection is temporarily unavailable."),
  one hard ("We can't reach your assistant right now."). The raw `message` belongs in the console,
  **not** on screen — a
  gateway error string can carry internal method names.
- **Do not block the UI.** No modal, no full-page error state, no route guard. The rest of the
  dashboard keeps working with whatever data it already has.

**Files:** the members shell/layout component and/or the existing indicator identified in Slice 0
(exact path is a Slice 0 output — record it in the PR), the Paraglide message files (EN + ES), and
optionally a small `.svelte`-free test for the derived presentation state.

**Definition of done (machine-checkable):**

```bash
cd minion_site
bun run check                                   # 0 errors; warnings must not increase
bun run lint:design && bun run lint:tokens      # IF these scripts exist (Slice 0). Debt may only
                                                # DECREASE. If they do NOT exist in site, say so in
                                                # the PR and run the manual audit below instead —
                                                # do not invent a lint pipeline in this slice.
rg -n '#[0-9a-fA-F]{3,8}\b|rgb\(|bg-(slate|zinc|gray|red|amber|green|blue)-|text-\[|p-\[|z-\[|z-[0-9]' <the changed .svelte files>
#   → ZERO hits (iron rules: semantic tokens only)
rg -n '--color-(warning|danger)-(fg|surface|border)' <the changed .svelte files>   # → the full triples
rg -n '>[A-Za-z][^<{]{6,}<' <the changed .svelte files>    # → no bare English literals; all copy via Paraglide
bun x vitest run src/lib/services            # S1+S2 suites still green
```

---

## 3. Files touched (consolidated)

All paths relative to the root of `NikolasP98/minion-site`.

| File | Slices | Nature |
|---|---|---|
| `src/lib/services/gateway-errors.ts` | S1, S2 | **new** — plain TS (no runes): `toError`, `reportGatewayError` (never throws), `classifyGatewayError`, dedupe helpers/policy |
| `src/lib/services/gateway-errors.test.ts` | S1, S2 | **new** — the sink matrix, the classification table, the dedupe/transition invariants |
| `src/lib/services/member-gateway.svelte.ts` | S1, S2 | the three empty catches → the sink; every other silent path swept; `onEvent` body wrapped; reactive `degraded/kind/op/since/count` state |
| members shell / existing status indicator (`.svelte`, path from Slice 0) | S3 | renders `degraded` with status-token triples; non-blocking |
| Paraglide message files (EN + ES) | S3 | two user-facing strings |

**Zero DDL, zero migrations, zero `package.json` dependency changes, zero changes under
`src/routes/api/`.** No `.svelte` file is edited by S1 or S2 — that is the property that keeps UI
governance off the `logic` slices (§4b), and §6 asserts it mechanically.

## 4. Cross-repo impact

Checked against AGENTS.md "Cross-Project Impact Zones". The gateway-protocol row is the only zone
this work is near, and it is near it as a **consumer**: no frame type, event name, or wire byte
changes. Two alerts are unavoidable and one is a scheduling hazard inside this same wave.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `@minion-stack/shared` (`GatewayClient`, protocol helpers) | **None.** Consumer-side only: the site catches rejections the client already throws. No new export, no signature change, **no changeset** | Verified against `packages/shared/src/gateway/client.ts` + `protocol.ts` in this checkout; §0's table cites exact lines |
| `@minion-stack/shared` internal swallows (`client.ts:263`, `client.ts:296`) | **Out of reach from the site — ⚠️ A1** | S1 wraps the site's own `onEvent` body so nothing of the site's is lost there; the upstream fix is proposal `2026-08-17-pkg-gateway-client-onevent-errors` |
| `minion_hub/src/lib/services/gateway.svelte.ts` | **No code change here — ⚠️ A2.** Hub runs a 920-LOC sibling of this client with the same handshake | Grep at the G2 gate and record the result; do not widen this spec |
| `minion_site` — device-identity spec, same file, same wave | **Real collision — ⚠️ A3** | Sequencing rule below |
| `@minion-stack/db`, `@minion-stack/auth`, shared hub↔site DB | **None** — no query, no schema, no session handling touched | zero files under `src/server/`, `src/lib/server/` |
| `paperclip-minion`, `minion/` gateway, `pixel-agents`, `minion_plugins` | **None** — different processes, different clients; none imports site code | — |
| `packages/design-tokens` | **Consumed, not changed** by S3 — existing semantic tokens only, no new token, no contract edit | S3 DoD greps; a new token would require a `contract.json` change and is out of scope |

### ⚠️ A1 — two swallows upstream that this spec cannot close

`client.ts:263` drops anything the consumer's `onEvent` handler throws, and `client.ts:296`
(`void this.connect().catch(() => {})`) drops every failed reconnect attempt. Both are in
`@minion-stack/shared`, i.e. this repo, not the site — and the first is already owned by proposal
`2026-08-17-pkg-gateway-client-onevent-errors` (`repos: [minion-meta]`). Fixing them here would mean
a cross-repo PR that cannot be gated atomically. What this spec does instead is defensive and
sufficient for the site: wrap its own handler (S1). **The reconnect swallow stays open**, which means
"the socket is failing to come back" is still invisible in the console even after this ships — the
member-visible symptom is covered by S2/S3's `degraded` state, but the diagnostic is not. That
limitation belongs in the PR description, and if the onEvent proposal has not been specced by the
time this merges, append the reconnect case to it rather than letting it evaporate.

### ⚠️ A2 — the hub almost certainly has the same empty catches

`specs/ws-duplication-audit.md` and `.planning/phases/07-ws-consolidation/07-RESEARCH.md:46-47` record
hub's `src/lib/services/gateway.svelte.ts` as the same client at 920 LOC, with the same
`connect.challenge` handshake and the same shared protocol helpers. If it swallows the same
rejections, hub operators are debugging blind for the same reason. Required at the G2 gate:

```bash
rg -n 'catch\(\(\) *=> *\{\}\)|catch\s*\{\s*\}' minion_hub/src/lib/services/gateway.svelte.ts
```

If it matches, record the finding and proposed owner in the PR; creating a separate hub proposal is
follow-up work outside this site's ship gate. If it does not, say so in the PR with the output — a
recorded negative stops the next reader repeating the check.

### ⚠️ A3 — `2026-08-17-site-device-identity-role-escalation-spec` edits this same file this same day

That spec's **S2** rewrites the `onChallenge` path of `member-gateway.svelte.ts` and explicitly adds
"a single `console.error` (no silent `.catch(() => {})`)" for the sign-endpoint 403, while its §5
declares lines 236/254/322 **out of its scope and owned by this spec**. So the two are compatible in
intent and collide in text. Rules, in order:

1. **Do not both edit the file at once.** Whichever lands first, the second rebases onto it — the
   security spec has a human gate and therefore the weaker claim on timing; if it is in flight, this
   spec waits or takes a narrow branch off it.
2. **If this spec lands first**, the security spec's 403 handler routes through `reportGatewayError('sign', e)`
   rather than adding a second `console.error` call shape.
3. **If the security spec lands first**, S1 absorbs its sign-path handler into the sink and the line
   numbers in §0 shift — re-run Slice 0's grep instead of trusting 236/254/322.
4. Either way, scope commits narrowly (AGENTS.md multi-agent safety) and name the other spec id in
   the PR body.

### ⚠️ A4 — vitest may not be able to import a runes module

If `vitest.config.ts` has no Svelte plugin, importing `member-gateway.svelte.ts` from a test fails at
compile time on `$state`. This spec is designed so that is survivable rather than fatal: all tested
logic lives in `gateway-errors.ts`, plain TypeScript, and `member-gateway.svelte.ts` only wires it.
If Slice 0 finds the plugin *is* present, add a thin integration test that drives the real module —
better, but not required by any DoD above, and not a reason to slip the slice.

## 5. Out of scope (explicit)

- **Retry/backoff design** — the proposal's own exclusion. No request retries, no change to
  `GatewayClient`'s `autoReconnect` policy or its 800 ms→15 s curve, no poll rescheduling. S2's
  duplicate-collapsing is a *logging* policy and its DoD greps for `setTimeout|setInterval|retry`
  returning zero to prove the line was not crossed. The single permitted exception — an
  in-flight re-entrancy guard on the poll — is named in S2 and is not a schedule change.
- **Typed error classes in `@minion-stack/shared`.** They would allow finer provenance than S2's
  deliberately coarse `unknown` classification, but are not required to stop swallowed errors.
- **The two upstream swallows** (`client.ts:263`, `:296`) — ⚠️ A1.
- **The hub's copy of this client** — ⚠️ A2: record the audit result; remediation is separate.
- **The device-identity sign path** — ⚠️ A3, owned by
  `2026-08-17-site-device-identity-role-escalation-spec`.
- **Remote telemetry.** No Sentry, no PostHog event, no server-side error log for these failures.
  `console.error` plus visible state is the proposal's bar; shipping browser errors somewhere durable
  is a separate proposal with a privacy question attached.
- **A toast/notification system.** S3 renders existing state in an existing shell; it does not
  introduce a notification framework, and if one already exists S3 uses it.
- **New design tokens or a `contract.json` change.** S3 consumes the existing status triples only.
- **Wiring `bun run test` into site CI** — owned by `2026-08-13-ci-minion-site-ci-spec` §S3. Until
  that lands, this spec's tests are run by hand at the gate (§6); note it in the PR.
- **Fixing the site's pre-existing `svelte-check` a11y warning** in
  `src/lib/components/ui/LeadFormDialog.svelte` (evidenced at
  `.planning/phases/04-fold-minion-shared/04-03-SUMMARY.md:97-99`). Unrelated file; the gate is
  "warnings do not increase", not "zero warnings".
- **Empty catches elsewhere in `minion_site`.** This bug class rarely appears once, and a sweep is
  probably worth filing — but it is not this fix. If Slice 0 surfaces others outside this module,
  file a proposal; do not absorb them.

## 6. End-to-end verification

Run with S1–S3 merged, on the base branch confirmed in Slice 0, against a **dev gateway** — never
production. The whole point of the exercise is deliberately breaking the socket.

```bash
cd minion_site

# 1. Gates
bun run check                     # 0 errors; warning count == the pre-change baseline (record both)
bun x vitest run                  # whole suite green; no new skips
bun run build                     # the site still builds (Vercel adapter)
# tag hygiene (§4b): the logic slices must not have touched UI
git diff --name-only <base>...HEAD -- src/lib/services | grep -E '\.svelte$' \
  && echo "FAIL: a .svelte file under services" && exit 1
git diff --name-only <base>...HEAD | grep -E '^(supabase/migrations|src/routes/api)/' \
  && echo "FAIL: DDL or API routes are out of scope" && exit 1

# 2. Nothing is swallowed anymore in the owner module (the proposal's headline, statically)
rg -n 'catch\(\(\) *=> *\{\}\)|catch\s*\{\s*\}' src/lib/services/member-gateway.svelte.ts
# → ZERO hits. Empty catches elsewhere in services are explicitly outside this spec (§5).

# 3. THE PROPOSAL'S PROBE — kill the WS mid-poll, observe errors. Two members' worth of nothing
#    beforehand is the control.
#    a. Against a dev/mock gateway, delay a sessions.list response so a poll request is observably
#       in flight; log in as a member, open the dashboard and devtools, and first confirm normal
#       sessions/chat load with a clean console.
#    b. During the delayed poll, stop that gateway process/container. Do not run this on production.
#    c. As soon as the socket closes (without waiting for another poll period):
#         → console shows '[member-gateway] poll failed:' with a 'closed (…)' Error
#           Error and an expandable stack                                  ← S1 / proposal DoD
#         → the degraded strip appears with the transient (warning) styling ← S3
#         → the SECOND and THIRD failing polls do NOT add new console lines ← S2 dedupe
#    d. Send a chat message while the gateway is down
#         → exactly one new '[member-gateway] chat failed:' line (different op ⇒ always logged)
#    e. Restart the gateway; wait for GatewayClient's reconnect and the next successful poll
#         → one poll recovery info line; the strip disappears only if no other op remains failed;
#           sessions repopulate
#    f. Screenshot (c) and (e) for the PR — via the browser-harness skill, verification only.
#
# 4. Server-side failure, not just transport: use a dev/mock gateway that answers sessions.list
#    with { ok:false, error:{ message:'agent is not running' } }. Expect kind 'unknown', DANGER
#    styling, and that message in the console. The client exposes no typed provenance, so this spec
#    deliberately does not claim it can distinguish this response from another connected failure.
#
# 5. Pre/post proof for the PR: repeat step 3(b–c) on the pre-fix commit. Expected: zero console
#    output, no visible change, empty-looking dashboard. That side-by-side IS the evidence.
```

**Ship gate:**

1. §6 steps 1–4 green, with the step 3 and step 5 captures in the PR.
2. The proposal's DoD checked clause by clause: `console.error` present (step 2 + 3c), surfaced state
   present (3c/3e), killing the WS mid-poll produces observable errors (step 3).
3. S1's red-state failure output pasted in the PR (G3).
4. ⚠️ A2 checked: the hub grep output and any finding are recorded in the PR; a hub proposal is not
   a gate on this site fix.
5. ⚠️ A3 resolved: the device-identity spec's status named, and the rebase order stated.
6. ⚠️ A1's remaining gap (the upstream reconnect swallow) stated as a known limitation and linked
   to the existing upstream proposal for owner triage; it does not block this consumer-side fix.
7. Slice 0's actuals reconciled against §3. Because the site and the meta-repo are independent repos,
   corrections to this spec are a separate scoped meta-repo change linked from the site PR.
