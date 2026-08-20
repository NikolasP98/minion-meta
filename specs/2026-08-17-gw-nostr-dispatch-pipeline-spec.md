---
id: 2026-08-17-gw-nostr-dispatch-pipeline-spec
title: "Nostr — route replies through the shared buffered block dispatcher (delete the optional-call bypass)"
stage: spec
status: implementing
pass: 2
created: 2026-08-17
updated: 2026-08-20
proposal: 2026-08-17-gw-nostr-dispatch-pipeline
verdict: approved
repos: [minion]
tags: [logic, test]
type: fix
---

# Nostr — route replies through the shared buffered block dispatcher

**Owner surface:** `minion` (gateway, branch `DEV`) — `extensions/nostr/src/` only: the dispatch call
site at `channel.ts:217`, the typed seam that replaces the optional call, a fake-relay test harness,
and the extension's own docs.
**Conditional core surface (branch B2 only, additive):** `minion/src/plugin-sdk/` — a re-export so an
extension can reach the shared dispatcher, following the precedent set for discord and telegram
(`2026-05-20-discord-telegram-plugin-extraction` D-2-lite / T-2-lite added
"channel runtime surface" re-export blocks to `src/plugin-sdk/index.ts`). This is a **new public SDK
surface available to 45+ extensions** — §4 treats it as an alert, not a footnote.
**Consumer surface (read, production code never edited here):** `minion/src/web/auto-reply/monitor/`
(`process-message.ts` — the caller that gives `dispatchReplyWithBufferedBlockDispatcher` its meaning,
per `2026-05-24-unified-user-identities-p3-wiring-plan` §Step 1) and `minion/src/channels/`. Per
AGENTS.md "Cross-Project Impact Zones", a channel-extension change touches
`minion/extensions/<channel>/` + `minion/src/channels/`; this spec asserts the second half is
**read-only** and treats any need to edit it as a finding (§4).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `logic` / `test`. Red-state TDD (G3) is mandatory: the round-trip test is
written and shown failing against the current `?.()` call site before the fix lands. **No UI
governance applies** — zero `.svelte` files, zero design or token lint, in any slice.

**Prior art consulted.** `rg -li 'nostr' specs/ proposals/` → only this proposal and a dependency-bump
row in `2026-07-08-package-updates-tracking`. `rg -n 'dispatchReply' specs/` → one hit,
`2026-05-24-unified-user-identities-p3-wiring-plan.md:56`, which locates the pipeline at
`src/web/auto-reply/monitor/process-message.ts` (`ctxPayload` → `dispatchReplyWithBufferedBlockDispatcher`
→ the agent runner). So there is no design ancestor for nostr and nothing to supersede. The
convention to mirror lives in the **sibling extension channels** — signal, matrix, irc, tlon, line,
zalo — which are nostr's true peers; telegram and discord are *not*, because they own typed
`runtime.channel.<name>` bridge slots that nostr almost certainly does not have
(`2026-06-13-plugin-sdk-recon-and-improvement-report` §119: channel-ness is decided imperatively by
runtime `api.registerChannel()` calls, and the manifest carries no channel typing). S0 finds the peer
pattern; S2 mirrors it rather than inventing a shape.

---

## 0. Product

From the approved proposal `2026-08-17-gw-nostr-dispatch-pipeline`, verbatim:

> ## Problem
>
> extensions/nostr/src/channel.ts:217 calls a loosely-typed handleInboundMessage?.() instead of
> dispatchReplyWithBufferedBlockDispatcher — silently no-ops if the method is renamed and skips the
> buffering/block-dispatch every other channel gets.
>
> ## Definition of done
>
> Nostr uses the standard dispatcher; integration test round-trips a nostr DM through the shared
> pipeline.
>
> ## Out of scope
>
> Other nostr features.

**Two defects wearing one line.** `handleInboundMessage?.()` is both a *fragility* and a *divergence*,
and they fail differently:

1. **The `?.` is a silent-failure switch.** If the member is renamed, moved, or arrives undefined
   because of a bootstrap-order change, the expression evaluates to `undefined` and the channel
   returns normally. A user DMs the bot on nostr and gets nothing — no error, no log, no diagnostic
   event, no failed health check. Every other outcome in a gateway is *loud*; this one is mute. That
   is worse than a crash, because a crash gets fixed the day it ships.
2. **Bypassing the pipeline means nostr silently opts out of everything the pipeline does.** The
   dispatcher is not a convenience wrapper — it is where reply buffering and block dispatch happen for
   every other channel. A channel that skips it does not merely look different; it gets a different
   product. §3 enumerates the hypothesis and S0 confirms each row.

**What the user loses today.** Unknown, and that is itself the finding — see ⚠️ A3. If the optional
call currently resolves, nostr replies without the shared buffering/block-dispatch behavior named by
the proposal. Any additional ledger, hook, reliability, or session effects remain hypotheses until S0
checks §3; they must not be claimed as current losses without evidence. If the call currently resolves
to `undefined`, the inbound message is silently dropped. S0's first job is to establish which behavior
is current, in the PR, before any code changes.

**Why nostr makes this harder than it looks — and why S2 is not "swap the call".** A published nostr
event is **signed, immutable, and unretractable**: there is no edit and no reliable delete. Channels
whose dispatcher mode streams-then-edits (the pattern telegram-style channels use) cannot be copied
here. Every additional block the dispatcher emits becomes an additional permanent, signed,
relay-broadcast event; a retry becomes a **visible duplicate the user cannot be spared**. So the fix
must select an explicit dispatcher mode for an append-only, no-edit transport (§2 S2)
rather than accepting whatever default the sibling channel happened to use.

## 1. Assumptions, and the four questions that decide the shape of S2

`minion/` is **not** checked out in this workspace (`ls -d minion` → "No such file or directory"; the
meta-repo `.gitignore` excludes subprojects). Every code claim below is **carried from the proposal
and from prior specs in this repo**, not read from disk — see ⚠️ A5. The proposal's evidence is
specific enough (`channel.ts:217`, the exact expression, the named replacement) to act on, and S0
re-verifies all of it.

Four load-bearing unknowns, all settled by S0:

1. **What is `handleInboundMessage` actually bound to?** ⚠️ A1. I do not know, and the fix differs by
   answer: (a) an optional field on a deps/options object the nostr channel is constructed with — the
   fix makes it required and typed, and the *provider* becomes the thing to check; (b) a property on
   the plugin `api`/runtime — the fix binds to the SDK's typed surface; (c) a locally declared
   loose-typed shim inside the extension — the fix deletes it. The proposal's phrase "loosely-typed"
   suggests (a) or (c), but suggests is not knows.
2. **Is `dispatchReplyWithBufferedBlockDispatcher` reachable from `extensions/` at all?** ⚠️ A2. It
   lives on the core side (`src/web/auto-reply/monitor/`). Extensions consume core through
   `src/plugin-sdk/`. If the symbol (or an equivalent extension-facing entrypoint) is already
   exported and a sibling extension channel already calls it, S2 is branch **B1** and is small. If it
   is not, S2 is branch **B2** and includes an additive SDK re-export — a fleet-wide surface, §4.
3. **Is nostr replying in production today, or silently no-op?** ⚠️ A3. This does not change the fix;
   it changes what the PR claims and whether the round-trip test is a regression guard or the first
   proof the channel ever worked. One sentence in the PR.
4. **Can the dispatcher's contract be satisfied with what nostr has?** ⚠️ A4. The dispatcher is fed a
   `ctxPayload` in `process-message.ts`; if it requires fields nostr has no source for (resolved hub
   user identity, a session key derived from channel metadata, a chat/thread id shaped like a
   platform room), S0 must say so. Needing to *edit* the dispatcher or `src/web/auto-reply/monitor/`
   to make nostr fit is a **stop condition**, not a slice (§4).

### Slice 0 — recon (≤ 60 min; prepend to S1, not counted as a slice)

Run from a checkout of `minion` on branch `DEV` (per AGENTS.md Project Map). Read
`minion/.dmux-hooks/CLAUDE.md` first, as AGENTS.md requires for that subproject.

```bash
cd minion

# a. The reported site, verbatim (A1)
rg -n 'handleInboundMessage' extensions/ src/            # the binding, its declaration, its type
sed -n '180,240p' extensions/nostr/src/channel.ts        # read the call site in context
rg -n '\?\.\(' extensions/nostr/src                      # every optional-call in the extension
rg -n 'interface|type .*Deps|Options' extensions/nostr/src/channel.ts

# b. The dispatcher and its reachability (A2)
rg -n 'dispatchReplyWithBufferedBlockDispatcher' src/ extensions/    # definition + every caller
rg -n 'dispatchReply|BlockDispatcher' src/plugin-sdk/               # is it exported to extensions?
rg -n 'dispatchReply|handleInboundMessage' extensions/signal/src extensions/matrix/src \
      extensions/irc/src extensions/tlon/src extensions/line/src    # the PEER pattern to mirror

# c. The dispatcher's contract (A4)
rg -n 'ctxPayload' src/web/auto-reply/monitor/process-message.ts | head -40
rg -n 'export (async )?function dispatchReplyWithBufferedBlockDispatcher' -A 30 src/

# d. Does nostr reply today? (A3)
rg -n 'registerChannel|registerChannelImpl' extensions/nostr/
ls extensions/nostr/src extensions/nostr/*.md 2>/dev/null
cat extensions/nostr/package.json                # exact package name for the test filter
rg -n 'relay|nip|NIP|kind|publish|sign' extensions/nostr/src | head -40   # transport + DM scheme
rg -ln 'nostr' test/ src/ --glob '*.test.ts'     # any existing coverage at all

# e. Blast radius of turning the pipeline ON (§4)
rg -n 'message-ledger|messageLedger|triggerInternalHook' src/web/auto-reply/monitor/ | head -20

# f. Is this bug class unique to nostr? (sweep → proposal, never a fix here)
rg -n 'handleInboundMessage\?\.|onMessage\?\.|dispatch\w*\?\.' extensions/
```

**Five answers that must be written into the PR description**, each as one sentence: (1) what
`handleInboundMessage` is bound to and who supplies it; (2) B1 or B2; (3) does nostr reply today —
yes / no / unproven; (4) can the dispatcher contract be satisfied from nostr's inbound event without
editing core — yes/no; (5) how many other extensions carry the same optional-call bypass. If (4) is
**no**, stop before implementing S1–S3 and return the spec: the blast radius has changed from "one extension"
to "the shared inbound contract", which is a human scope decision, not an implementation detail.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (kill the optional call: a required, typed, fail-loud seam)
                 └─▶ S2 (route through the real dispatcher: B1 mirror | B2 mirror + additive SDK export)
                        └─▶ S3 (fake-relay DM round-trip integration test, docs, ledger, sweep)
```

**S1 alone is not the fix and must not close the proposal.** S1 makes the failure *loud* and the
binding *checkable by the compiler*; it does not yet give nostr the buffering and block dispatch the
proposal is about. S1 + S2 together are the fix, and S3 is the proposal's stated definition of done.
If S0 lands on B1, S1 and S2 are small enough to ship as one PR — say so in the PR rather than
splitting for the sake of the spec.

---

### S1 — Delete the optional call: a required, typed, fail-loud seam

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** `extensions/nostr/src/channel.ts:217` no longer contains an optional call. The dispatch
dependency is a required, explicitly typed parameter that the TypeScript compiler checks, so a rename
becomes a build error instead of silence; and if it is ever absent at runtime, the channel says so
once, loudly, on a path that reaches the gateway's error surfaces.

**Do:**

- **Replace the optional member call with a required, typed dependency.** Intended shape — adjust
  naming to the extension's local style, keep the semantics:

  ```ts
  /** The gateway's shared reply-dispatch entrypoint. Required: a nostr channel that cannot
   *  dispatch is misconfigured, not degraded. Typed against the real signature so a rename
   *  upstream fails `pnpm tsgo` instead of silently no-op'ing at :217. */
  export type InboundDispatch = (payload: InboundDispatchPayload) => Promise<void>;
  ```

  The exact payload type must be **imported from the source of truth**, not restated locally: a
  hand-copied structural type reintroduces the same silent-drift failure one layer down. If S0 (b)
  shows the type is not exported to extensions, that is part of B2's additive export in S2, and S1
  may use a narrow local alias **marked with a `TODO(handoff):`** that S2 removes in the same PR.
- **No `any`, no `@ts-nocheck`, no structural `as` cast at the seam.** House rule (AGENTS.md), and
  here it is load-bearing: casting away the type restores exactly the looseness this slice exists to
  remove.
- **Fail loudly, once, if the dependency is missing at runtime.** Validate at construction/registration
  time — where the channel is wired — not at message time. A missing dispatcher must (a) throw or
  refuse registration so the misconfiguration is visible at boot, or (b) if the extension's local
  convention forbids throwing during plugin registration, log at `error` **once** and refuse to accept
  inbound events, so the failure is attributable. Choose whichever matches the peer extensions S0 (b)
  read; record which and why in the PR. What is forbidden is the current third option: continue
  normally and drop the message.
- **Never swallow a dispatch rejection.** If the dispatcher throws or rejects, the failure must reach
  the gateway's error path (log at `error` + whatever diagnostic emit the peers use). Today's `?.()`
  form makes "no dispatcher" and "dispatch failed" indistinguishable from success; both must now be
  distinguishable from each other and from success.
- **Do not change what is dispatched in this slice.** Same payload construction, same call moment,
  same channel semantics. This slice is about the *binding*; S2 changes the *callee*. Keeping them
  separate is what makes the S2 diff reviewable.
- **Red-state first (G3).** Before editing, write a test that constructs the channel with the
  dispatch dependency absent/renamed and asserts the failure is observable (throw, or a single
  `error` log plus no silent success). Run it against the current `?.()` code and paste the observed
  failure into the PR — that is the proposal's "silently no-ops" claim, demonstrated rather than
  asserted.

**Files:** `extensions/nostr/src/channel.ts` (the `:217` site + the dependency type + the
construction-time validation), `extensions/nostr/src/channel.test.ts` (new or appended), and the
extension's local types file if it has one. No file outside `extensions/nostr/`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/nostr            # or the repo's extension-test invocation; resolve in S0 (d)
#   red-state first (G3): the missing-dependency case shown passing-by-silence against the old `?.()`.
#   channel.test.ts:
#   - constructing/registering the channel without the dispatch dependency → observable failure
#         (throws, or exactly one `error` log AND inbound events are refused) — never a silent return
#   - a dispatch dependency that REJECTS → the rejection is logged at error, not swallowed
#   - the happy path still dispatches exactly once per inbound DM (no behavior change yet)
pnpm tsgo && pnpm check                     # typecheck (no `any`, no @ts-nocheck) + oxlint/oxfmt
rg -n 'handleInboundMessage\?\.' extensions/nostr/src                       # → ZERO hits
rg -n '\?\.\(' extensions/nostr/src --glob '!*.test.ts'                     # → ZERO on the dispatch path
rg -n ': *any|as unknown as|@ts-nocheck' extensions/nostr/src/channel.ts    # → ZERO hits
```

---

### S2 — Route through `dispatchReplyWithBufferedBlockDispatcher`

**Tags:** `logic`, `test` · **Estimate:** B1 4–5 h · B2 6–8 h

**Goal:** nostr's inbound DM takes the same reply-dispatch path as every other channel — buffering and
block dispatch included — with an explicitly chosen dispatcher mode appropriate to an append-only,
no-edit transport. Which branch you are in is S0 (b)'s answer; **record it in the PR**.

**Branch B1 — the dispatcher is already reachable from extensions (best case).** A peer extension
channel already calls it. Mirror that call: same import path, same payload construction shape, same
error handling. Deviations from the peer are the reviewable content of this slice — each one needs a
sentence saying why nostr differs.

**Branch B2 — the dispatcher is core-only and must be exported.** Add the minimal additive re-export
to `src/plugin-sdk/`, following the precedent in `2026-05-20-discord-telegram-plugin-extraction`
(D-2-lite / T-2-lite added named "channel runtime surface" re-export blocks). Constraints:

- **Additive only.** Re-export the existing symbol and its payload type. Do not move, rename, wrap,
  re-implement, or change the signature of the dispatcher. A behavior change inside a symbol now
  visible to 45+ extensions is out of scope and is a finding (§4, §5).
- **Export the payload type too**, so S1's seam can drop its local alias and its `TODO(handoff):`.
- **One block, named, documented**, matching the existing SDK file's structure, so the next extension
  finds it instead of copying nostr's bypass.

**In both branches:**

- **Choose the dispatcher mode explicitly and write down why.** Nostr events are signed, immutable,
  and unretractable — no edit, no reliable delete. Any streaming/edit-in-place mode is wrong here. If
  the dispatcher offers a "send complete blocks only / no edit" configuration, select it explicitly at
  the call site with a comment naming the transport constraint; if it does not offer one, the buffering
  boundary nostr gets is whatever block dispatch emits, and that must be stated in the PR (and in the
  docs, S3) rather than discovered by a user.
- **One local publish attempt per dispatcher emission.** Every emitted block becomes a signed event,
  so the adapter must not invoke its existing publish path twice for one emission. Preserve the
  extension's current relay retry/reconnect semantics; cross-attempt or relay-level exactly-once
  delivery and a new deduplication store are out of scope. Test the local one-emission/one-call
  invariant below.
- **Adapt on the nostr side, never on the dispatcher side.** If nostr's transport cannot satisfy the
  dispatcher's send contract (chunk size limits, encryption per event, relay ack semantics), write the
  adapter inside `extensions/nostr/`. Editing `src/web/auto-reply/monitor/` or the dispatcher itself is
  a **stop condition** — report it (§4) rather than making a fleet-wide change under a nostr fix.
- **Do not add a relay retry/backoff policy.** Out of scope (§5). Preserve whatever send/publish
  semantics the extension has today.
- **Preserve DM privacy.** Whatever encryption scheme the extension uses for DMs today (S0 (d) names
  it) must apply to **every** block the buffered dispatcher emits — including the first and the last.
  A chunking change that leaks one plaintext block to public relays would be a privacy incident caused
  by a refactor. Add an explicit test asserting every published event on the DM path is encrypted.

**Files:** `extensions/nostr/src/channel.ts` (call the dispatcher), possibly a sibling
`extensions/nostr/src/dispatch.ts` or send-adapter module if the payload construction is big enough to
deserve its own file, `extensions/nostr/src/*.test.ts`, and — **B2 only** — `src/plugin-sdk/index.ts`
(additive re-export block; the single file outside `extensions/nostr/` this spec authorizes, and only
under B2).

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/nostr
#   - an inbound DM reaches dispatchReplyWithBufferedBlockDispatcher exactly once, with a payload
#     the dispatcher accepts (assert on the injected/stubbed dispatcher)
#   - a multi-block reply produces >1 published nostr event whose decrypted contents equal the
#         ordered blocks emitted by the real dispatcher
#   - a single-block reply produces exactly 1 published event  (no gratuitous fragmentation)
#   - each dispatcher emission invokes the existing nostr publish path exactly once
#   - every event published on the DM path is encrypted per the extension's DM scheme — ZERO plaintext
#   - a relay publish failure mid-reply → logged at error, no throw escaping the channel,
#     no partial-state corruption on the next inbound message
pnpm tsgo && pnpm check
rg -n 'dispatchReplyWithBufferedBlockDispatcher' extensions/nostr/src         # → the call site exists
git diff --name-only <base>...HEAD | rg -v '^(extensions/nostr/|src/plugin-sdk/index\.ts$)'  # → EMPTY
# B2 only — the export is additive; nothing else in core moved:
git diff --stat <base>...HEAD -- src/plugin-sdk/     # → additions only, one file
git diff <base>...HEAD -- src/web/auto-reply/        # → EMPTY (editing the dispatcher is a finding)
```

---

### S3 — The DM round-trip integration test, the docs, and the ledger

**Tags:** `test`, `logic`, `docs` · **Estimate:** 5–7 h

**Goal:** the proposal's definition of done, literally: *"integration test round-trips a nostr DM
through the shared pipeline"* — with a fake relay, not a live one. Plus the docs stop describing a
channel that behaves differently from every other channel, and the sweep from S0 (f) is filed rather
than absorbed.

**Do:**

- **A fake relay, in-process. No network, no public relay, no live keys.** The test must be
  deterministic and runnable in CI without external network access. Stand up an in-memory transport that accepts signed events
  and can inject an inbound encrypted DM, with a fixed test keypair. Assert the full arc: inbound DM
  event → decrypt → channel → **the real dispatcher** → the agent runner (stubbed at its boundary, so
  the test proves the *pipeline wiring*, not model output) → buffered blocks → published outbound
  events → decryptable by the test key. A test that stubs the dispatcher does not satisfy this slice —
  S2 already did that; this one exercises the seam S1 and S2 built.
- **Do not test against a public relay, ever.** Public relays are third-party infrastructure and nostr
  events are permanent and public. A CI job publishing test events to strangers' relays is an
  outward-facing side effect this spec does not authorize.
- **Assert the difference, not just success.** The test must fail if someone reverts to the bypass:
  assert the dispatcher was actually traversed (a spy on the real path, or an artifact only the
  buffered dispatcher produces — e.g. the block boundaries from S2's multi-block case).
- **⚠️ A3 answered in the PR.** State whether nostr replied before this change. If it did not, say so
  plainly: this PR restores a dead channel, and the release note should say that instead of "improves
  dispatch".
- **⚠️ Ledger/reliability visibility, stated.** If S0 (e) shows the shared pipeline records to the
  message ledger and internal hooks, then after this fix **nostr traffic starts appearing** on
  surfaces where it was previously invisible (hub `/reliability`, session lists, message ledger).
  That is the desired outcome, but it is a visible change in another product — one sentence in the PR
  and in §4's table, and confirm no session-key or thread-ownership derivation forks existing nostr
  conversations at deploy. If it does fork them, stop and return the spec for a human scope decision;
  this spec does not authorize a continuity break or migration work.
- **Docs.** Update the extension's README (whatever exists — S0 (d) lists it) with one short paragraph:
  nostr replies go through the shared buffered block dispatcher; the selected dispatcher mode and why
  (immutable, unretractable events — no edit-in-place); what a multi-block reply looks like to a user
  (N separate signed events); and that the dispatch dependency is required, so a misconfigured channel
  fails at boot rather than silently. If the extension has no README, add the paragraph as a
  file-header comment in `channel.ts` rather than creating a docs surface this spec did not scope.
- **File the sweep, fix nothing.** If S0 (f) found the same optional-call bypass in other extensions,
  write **one** proposal naming them with file:line evidence and stop there (§5). This bug class rarely
  appears exactly once, and a fleet sweep bundled into this PR would make the diff unreviewable.
- **Ledger sweep before closing.** Per AGENTS.md, any remaining in-scope open end gets both a
  `TODO(handoff): <what, why, pointer>` at the site and a `proposals/` entry. S1's local type alias
  must be gone under B2 — verify its `TODO(handoff):` was removed with it. If there are no open ends,
  say "no open items" in the PR.

**Files:** `extensions/nostr/src/*.integration.test.ts` (or the repo's integration-test convention —
S0 (d)), a fake-relay helper under `extensions/nostr/` (test-only), `extensions/nostr/README.md` or
the `channel.ts` header, plus any ledger `TODO(handoff):` and the sweep `proposals/*.md`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/nostr             # includes the round-trip integration test
#   - inbound encrypted DM → outbound encrypted reply, decrypted by the test key, content asserted
#   - the REAL dispatchReplyWithBufferedBlockDispatcher is traversed (spied, not stubbed out)
#   - a long reply arrives as multiple complete blocks; a short one as exactly one
#   - the test performs ZERO external network I/O (no real relay or DNS; an in-process/loopback fake is allowed)
pnpm test && pnpm tsgo && pnpm check          # full unit suite + typecheck + lint/format
rg -n 'wss://|relay\.(damus|nostr)' extensions/nostr/src --glob '*.test.ts'   # → ZERO (no public relay in tests)
rg -n 'TODO\(handoff\)' extensions/nostr/src                                  # → ZERO, or each has a proposals/ entry
git diff --name-only <base>...HEAD \
  | rg -v '^(extensions/nostr/|src/plugin-sdk/index\.ts$|proposals/.+\.md$)'  # → EMPTY
git diff --name-only <base>...HEAD | rg '\.svelte$' && echo "FAIL: UI out of scope" && exit 1
```

---

## 3. What the shared pipeline gives every other channel — the hypothesis S0 confirms

The proposal names "buffering/block-dispatch". The list below is what I *expect* also rides on that
path, based on this repo's prior specs. **Each row is a hypothesis, not a finding.** S0 confirms or
strikes each one, and the confirmed list goes in the PR — it is the honest statement of what this fix
actually restores.

| Capability | Why I expect it on the shared path | Confidence |
|---|---|---|
| Reply buffering + block dispatch | Named in the proposal; the dispatcher's own name | **High** — stated by the proposal |
| Message-ledger recording (inbound + outbound) | `2026-06-13-plugin-sdk-recon` §89 confirms inbound + outbound hooks record at `message-ledger-hooks.ts:50,99` | Medium — that those hooks fire *on this path* is unverified |
| Internal lifecycle hooks (`message:*`, `session:*`) | `2026-06-13-gateway-monitoring-events-hooks-recon` §121 | Medium |
| Diagnostic / reliability events (`message.processing_error` and friends) | Same recon, §67: "the universal `message.processing_error` already covers per-channel message failures" | Medium |
| Session/turn bookkeeping via `ctxPayload` | `2026-05-24-unified-user-identities-p3-wiring-plan` §54–56 puts `ctxPayload` on this exact path | Medium |
| Per-turn identity resolution (`ResolvedHubUserId`) | Same — though that plan notes the propagation path "does not exist yet" as of 2026-05-24 | **Low** — may not exist even now |

If S0 strikes most of this table, the fix is still correct (the `?.()` and the missing buffering are
independently sufficient) — but the PR must then describe a smaller win. Do not carry an unverified
row into the PR as if it were established.

## 4. Cross-repo impact

Checked against the AGENTS.md "Cross-Project Impact Zones" table. The relevant row is **"Channel
extension (new/modify) → `minion/extensions/<channel>/` + `minion/src/channels/`"**.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/extensions/nostr/` | **The fix.** All behavior changes live here | S1–S3 |
| `minion/src/plugin-sdk/index.ts` | **⚠️ ALERT, branch B2 only — unavoidable if the dispatcher is core-only.** A new symbol on the surface available to **45+ extensions**. Additive re-export of an existing symbol: no existing export moves, renames, or changes signature, so existing extension imports remain compatible | S2 B2 constraints; S2 DoD asserts additions-only, one file; precedent: `2026-05-20-discord-telegram-plugin-extraction` D-2-lite/T-2-lite added channel bridge re-exports, though it did not export this dispatcher |
| `minion/src/web/auto-reply/monitor/` (the dispatcher, `process-message.ts`) | **None — read-only.** Nostr adapts to the contract; the contract does not adapt to nostr. Editing it is a **finding and a stop condition** | S2 DoD: `git diff -- src/web/auto-reply/` → EMPTY |
| `minion/src/channels/` | **None.** Nostr is an extension-registered channel (`api.registerChannel()`), not a core `channels/impl/` channel | S0 (d) confirms; S3 DoD's changed-file check enforces |
| `minion` message ledger / reliability events / sessions | **Behavior changes without these files changing — and that is a *visible* change elsewhere.** If §3's rows confirm, nostr traffic begins appearing on surfaces where it was invisible. Desired, but somebody will notice | S3 requires the sentence in the PR **and** a check that no session-key/thread-ownership derivation forks existing nostr conversations at deploy; a fork is a stop condition |
| `minion_hub` `/reliability`, sessions, chat views | **Read-only, data-level.** New nostr rows/points may appear. No schema change, no query change, no deploy coupling | Additive data on existing surfaces; `2026-06-13-gateway-monitoring-events-hooks-recon` describes hub as a consumer of gateway events |
| `@minion-stack/shared` (frames, events, WS protocol) | **None.** No frame type, event type, or protocol field added or changed | §5 excludes it; if the fix appears to need one, that is a spec bug — raise it |
| `minion_site`, `paperclip-minion`, `minion_plugins`, `pixel-agents`, `Minion Docs/` | **None.** No protocol change ⇒ no consumer change | AGENTS.md's "Gateway protocol" row does not apply |
| Other channel extensions (signal, matrix, irc, tlon, …) | **None from this diff.** But the same optional-call bypass may exist elsewhere | S0 (f) greps; S3 files **one** proposal and fixes nothing outside nostr (§5) |
| Nostr relays (external, third-party, potentially public) | **A multi-block reply may publish more signed events than today**; relay retention and deletion behavior are outside this fix | S2's explicit no-edit mode + one local publish call per emission + single-block-stays-single; S3 forbids any test touching a public relay |

### ⚠️ A1 — the binding is unidentified

`handleInboundMessage` may be a constructor dependency, a plugin-API member, or a local shim. All
three are fixable by S1's "required and typed" rule, which is why S1 is written against the *property*
(required, compiler-checked, fail-loud) rather than a specific shape. But the PR must name what it
actually was — "loosely-typed" is the proposal's word, and a spec that repeats it without resolving it
has not done its job.

### ⚠️ A2 — B2 puts a new symbol on the SDK surface available to 45+ extensions

If the dispatcher is core-only, this one-extension bug fix necessarily widens the plugin SDK. That is
the correct call (the alternative — nostr reaching into core internals past the SDK — is worse and is
arguably how this bypass was born), but it deserves a reviewer's explicit attention, so it is an alert
here rather than a line in a slice. Additive-only is what keeps it safe.

### ⚠️ A3 — nostr's current behavior is unknown

The proposal says the optional call "silently no-ops **if** the method is renamed" — conditional. It
does not establish that it is no-op'ing today. This spec is correct either way, but the PR's claim is
not: "restores a dead channel" and "adds buffering to a working channel" are different release notes,
and only one of them is true.

### ⚠️ A4 — the dispatcher's contract may not be satisfiable from a nostr event

If the dispatcher requires context nostr has no source for, the fix crosses from "one extension" into
"the shared inbound contract" and stops for a human scope decision. Do not invent placeholder identity
values to satisfy a type — a fabricated `ctxPayload` field would put wrong data into the ledger and
the sessions of every downstream consumer, which is a worse defect than the one being fixed.

### ⚠️ A5 — the target repo is not in this workspace

`minion/` is not checked out here, so every line number, file name, and symbol in this spec is carried
from the proposal and from prior specs in this repo rather than read from disk. The proposal's
evidence is specific (`channel.ts:217`, the exact expression, the named replacement) and S0 re-verifies
all of it in under an hour. If S0 finds the site has moved or already been fixed, that is a
reconciliation finding for the G0 sweep
(`2026-08-17-sdlc-phase-gates-scoring-spec` §3) — report it and stop; do not go looking for a different
bug to fill the slice with.

## 5. Out of scope (explicit)

- **Other nostr features** — the proposal's own exclusion. No new NIP support, no relay management or
  discovery UI, no key management, no profile/metadata publishing, no zaps, no public-note (non-DM)
  posting, no group/channel kinds.
- **Changing `dispatchReplyWithBufferedBlockDispatcher` or anything under `src/web/auto-reply/`.** This
  fix makes nostr *use* the pipeline. Altering the pipeline is a different proposal with a fleet-wide
  blast radius; needing to touch it is a finding and a stop condition (§4).
- **Anything non-additive in `src/plugin-sdk/`.** No refactor, no rename, no signature change, no
  wrapper abstraction "while we're in there". B2 adds a re-export block and nothing else.
- **Fixing the same optional-call bypass in other extensions.** File one proposal with evidence; do
  not absorb a fleet sweep into this diff.
- **Relay retry, backoff, reconnection, or delivery-confirmation policy.** Preserve today's publish
  semantics exactly. Retry against an unretractable, duplicate-visible transport is its own design
  problem and is *easier* to add later against the seam S1/S2 build.
- **Cross-attempt or relay-level exactly-once delivery and new deduplication state.** This fix enforces
  only one call to the existing publish path per dispatcher emission; it does not redefine relay
  delivery guarantees.
- **Any change to `@minion-stack/shared`, the gateway WS frame protocol, or `InboundMessage`'s shape.**
  No new field, no new event, no consumer coordination.
- **Backfilling historical nostr messages into the ledger, or reclassifying past sessions.** The fix is
  forward-only.
- **Live-relay or end-to-end network tests in CI.** Deterministic in-process fake relay only (S3).
- **Any UI.** Zero `.svelte` files ⇒ the `ui` tag, the ui-design-governance skill, `lint:design`, and
  `lint:tokens` do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Editing `specs/index.json` or `proposals/index.json`.** Generators own them.

## 6. End-to-end verification

Run with S1–S3 merged on `minion`'s `DEV` branch. Steps 1–2 are offline and belong in CI; step 3 needs
a **local, private** relay (whatever the extension's dev docs or existing tooling already use — S0 (d)
names it; if none exists, run a relay container locally). **Never verify against a public relay:**
nostr events are permanent, public, and unretractable.

```bash
cd minion

# 1. Gates (logic/test-tagged: no design or token lint — §5)
pnpm install && pnpm build
pnpm test && pnpm tsgo && pnpm check
git diff --name-only <base>...HEAD    # → extensions/nostr/**, src/plugin-sdk/index.ts (B2 only),
                                      #   proposals/*.md (the S0 (f) sweep) — nothing else (§2 S3 DoD)

# 2. The round-trip, offline (the proposal's DoD)
pnpm vitest run extensions/nostr      # fake relay: inbound DM → real dispatcher → buffered blocks
                                      #   → encrypted outbound events → decrypted and asserted

# 3. Live, against a LOCAL relay only, with a throwaway test keypair
#    Point the nostr channel at the local relay, start the gateway (pnpm gateway:watch), then:
#    a) DM the bot from a test client: "hello"
#         → a reply arrives, decryptable, within the channel's normal latency.
#            ← if A3 said the channel was dead, this is the first time it has ever worked
#    b) DM a prompt whose answer is long enough to exceed one block
#         → the reply arrives as MULTIPLE complete blocks; no code fence is split across events;
#           nothing is duplicated; ordering is correct at the client.
#    c) DM a prompt with a short answer
#         → exactly ONE published event (no gratuitous fragmentation).
#    d) Inspect the relay's stored events for this exchange
#         → every event on the DM path is encrypted. ZERO plaintext replies.   ← privacy guard
#    e) Stop the relay mid-reply, then send another DM after restarting it
#         → the failure is logged at error, the gateway does not crash, and the next DM is
#           answered normally.                                                  ← no swallowed failure
#    f) Remove the dispatch dependency (misconfigure the channel deliberately) and boot
#         → the gateway fails loudly at boot/registration, or logs exactly one error and refuses
#           inbound — it does NOT start up and silently drop DMs.               ← the S1 bug, proven gone
#    g) If §3's ledger row confirmed: check the hub's reliability/session surfaces
#         → the nostr exchange from (a) is now visible where it previously was not.

# 4. Continuity (⚠️ ledger/session note, §4)
#    Before deploying, note the session id for an existing nostr conversation; after deploying, send a
#    message in that same conversation and confirm the session id is unchanged. If it changes, do not
#    ship; return for a human scope decision.
```

**Ship gate:** §6 steps 1–4 green; the proposal's DoD checked clause by clause ("nostr uses the
standard dispatcher" — `rg 'dispatchReplyWithBufferedBlockDispatcher' extensions/nostr/src` hits and
`rg 'handleInboundMessage\?\.' extensions/nostr/src` is empty; "integration test round-trips a nostr
DM through the shared pipeline" — S3's fake-relay test, traversing the real dispatcher); the S1
red-state failure pasted into the PR, proving the old code no-op'd silently; S0's five answers
recorded, including any "unproven"; §3's confirmed-vs-struck table in the PR; and the S0 (f) sweep
either filed as one proposal or explicitly reported as "no other occurrences". A dispatcher edit, an
unsatisfiable contract (⚠️ A4), or a session-continuity fork are stop conditions and cannot pass this
ship gate.
