---
id: 2026-08-17-gw-nextcloud-talk-dm-misclassified-spec
title: Nextcloud Talk — derive isGroupChat from the conversation type (stop classifying every DM as a group)
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-18
proposal: 2026-08-17-gw-nextcloud-talk-dm-misclassified
verdict: approved
repos: [minion]
tags: [logic, test]
type: fix
link_review: "pass 2 but has neither \"revises\" nor \"supersedes\" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec"
---

# Nextcloud Talk — derive `isGroupChat` from the conversation type

**Production owner surface:** `minion` (gateway) — `extensions/nextcloud-talk/src/` only: the inbound
mapping function `payloadToInboundMessage`, a new pure room-kind classifier module, its tests, and
the extension's own docs. A downstream `*.test.ts` may also change for the behavioral proof in S3.
**Consumer surface (read, production code never edited here):** `minion/src/channels/` and
`minion/src/dispatch/` — the mention-gate and group auto-reply policy that read `isGroupChat`. Per
AGENTS.md "Cross-Project Impact Zones", a channel-extension change touches
`minion/extensions/<channel>/` + `minion/src/channels/`; this spec asserts the second half is
**read-only** and treats any need to edit it as a finding (§4).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `logic` / `test`. Red-state TDD (G3) is mandatory: the one-to-one fixture is
written and shown failing against the current hardcoded `true` before the fix lands. **No UI
governance applies** — zero `.svelte` files, zero design or token lint, in any slice.

**Prior art consulted:** no existing spec or proposal in this repo mentions Nextcloud Talk or
`isGroupChat` (`rg -li 'nextcloud|isGroupChat' specs/ proposals/` → only the source proposal), so
there is no design ancestor to inherit from and nothing to supersede. The relevant house convention
lives in the *sibling channel extensions* (telegram, discord, slack all have a private-vs-group
discriminator on their inbound payloads) — S0 finds it, and S1 mirrors it rather than inventing a
shape.

---

## 0. Product

From the approved proposal `2026-08-17-gw-nextcloud-talk-dm-misclassified`, verbatim:

> ## Problem
>
> extensions/nextcloud-talk/src/monitor.ts:57 hardcodes isGroupChat = true with a comment 'let inbound
> handler refine' — nothing downstream refines it (grep: only read, never reassigned). 1:1 DMs get
> group semantics: mention-gating and group auto-reply policy misapply.
>
> ## Definition of done
>
> payloadToInboundMessage decides from payload.target.type (or a room-info lookup); unit test feeds a
> one-to-one fixture and asserts isGroupChat === false.
>
> ## Out of scope
>
> Any other Talk feature work.

**What the user actually loses today.** A 1:1 Nextcloud Talk conversation with the assistant behaves
like a busy group room: the mention-gate demands `@bot` on every single message, and the group
auto-reply policy applies to a room that has exactly one human in it. The bot reads as broken —
silent unless addressed by name — in the one context where addressing it by name is absurd. The
comment `let inbound handler refine` is not a TODO that someone forgot to finish; it is a claim about
downstream behavior that is false, which is worse, because it makes the site look intentional to the
next reader.

**Why this is a two-part fix and not a one-line flip.** The bug is that the code does not *know*
whether the room is a DM. Flipping the literal from `true` to `false` would trade a quiet bug for a
loud one: a real group room reclassified as a DM makes the bot auto-reply to every message from
every participant, with bot-to-bot loop potential. So the fix must **acquire the fact** (§2 S1/S2)
and must **fail toward quiet** when it cannot (§3). That asymmetry is the single most important design
constraint in this spec.

## 1. Assumptions, and the one that could invalidate the proposal's first option

`minion/` is **not** checked out in this workspace (`ls -d minion` → "No such file or directory"; the
meta-repo `.gitignore` excludes subprojects). Every code claim below is **carried from the proposal**,
not read from disk — see ⚠️ A3. The proposal's own grep evidence ("only read, never reassigned") is
specific enough to be trustworthy as a starting point, and S0 re-runs it.

Three load-bearing unknowns, all settled by S0:

1. **Does `payload.target.type` actually discriminate a DM from a group?** ⚠️ A1. I am *not*
   confident that it does. Nextcloud Talk's bot webhook payload is Activity Streams 2.0, and my
   understanding — which the implementer must verify against the deployed Talk version rather than
   trust here — is that the conversation appears as
   `target: { type: "Collection", id: "<token>", name: "<conversation name>" }`, with `type` being the
   constant string `"Collection"` for **every** conversation regardless of kind. If that is what S0
   finds, then implementing the proposal's first option literally
   (`isGroupChat = payload.target.type === 'Collection'`) reproduces today's bug wearing a new
   costume — a constant expression that merely *looks* derived. The proposal anticipated this with its
   parenthetical "(or a room-info lookup)"; S0 decides which branch is real, and the answer goes in
   the PR description as a sentence, not an assumption.
2. **Is this a webhook receiver or a poller — and does it hold OCS credentials?** The file is named
   `monitor.ts` while the proposal says "webhook message". These imply different auth: a Talk *bot*
   authenticates with a shared secret (HMAC signature over the request) and has **no** user
   credentials with which to call the conversations API, whereas a poller must already authenticate
   as a user to read chat, and its room-list response most likely already carries the room `type` per
   room — making the fix nearly free. This is the difference between S2 branch B1 (~3–4 h) and B2
   (~5–7 h), and in the worst case B3 (no credential path at all — ⚠️ A4).
3. **Does anything besides the mention-gate read `isGroupChat`?** Specifically session-key or
   thread-ownership derivation. If a session id embeds group-ness, then flipping DMs to
   `isGroupChat: false` forks every existing Talk DM onto a new session and the user loses conversation
   continuity at deploy. ⚠️ A2. This is the one way this small fix could produce a user-visible
   regression, and it is cheap to check and expensive to discover in production.

### Slice 0 — recon (≤ 45 min; prepend to S1, not counted as a slice)

Run from a checkout of `minion` on branch `DEV` (per AGENTS.md Project Map). Read
`minion/.dmux-hooks/CLAUDE.md` first, as AGENTS.md requires for that subproject.

```bash
cd minion

# a. The reported site, verbatim, and the proposal's "never reassigned" claim
rg -n 'isGroupChat' extensions/nextcloud-talk/src            # → the hardcoded true at monitor.ts:57
rg -n 'isGroupChat' src/ extensions/ --glob '!**/*.test.ts'  # → every reader, fleet-wide
rg -n 'payloadToInboundMessage' extensions/nextcloud-talk/src

# b. A1 — is target.type a discriminator or a constant?
rg -n 'target' extensions/nextcloud-talk/src                 # what the mapper reads today
rg -n 'Collection|Person|Note|actor|object' extensions/nextcloud-talk/src
ls extensions/nextcloud-talk/test extensions/nextcloud-talk/src/**/*.test.ts 2>/dev/null
rg -n 'roomType|"type"|conversationType' extensions/nextcloud-talk/src   # any existing room metadata?

# c. A4 — auth mode and whether an authenticated room-info call is even possible
rg -n 'signature|X-Nextcloud-Talk|hmac|appPassword|basic|Authorization' extensions/nextcloud-talk/src
rg -n 'ocs/v2.php|spreed|api/v4' extensions/nextcloud-talk/src
cat extensions/nextcloud-talk/package.json                   # the exact package name for the test filter

# d. A2 — does session/thread identity read isGroupChat?
rg -n 'isGroupChat' src/sessions src/dispatch src/routing extensions/thread-ownership 2>/dev/null

# e. The house pattern to mirror (do not invent a new shape)
rg -n 'isGroupChat' extensions/telegram/src extensions/discord/src extensions/slack/src
```

**Three answers that must be written into the PR description**, each as one sentence: (1) does
`target.type` vary by conversation kind — yes/no/unknown; (2) which S2 branch applies — B1 (room type
already in hand), B2 (authenticated lookup available), or B3 (no credential path); (3) does any
session-key derivation read `isGroupChat` — yes/no. If (3) is yes, **stop and raise it** before
writing S3: it changes the spec's blast radius from "mention-gating" to "conversation continuity" and
deserves a reviewer's attention, not a shrug.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (pure classifier + injected provider; the proposal's DoD, literally)
                 └─▶ S2 (the real room-kind source: B1 thread-through | B2 lookup+cache | B3 stop)
                        └─▶ S3 (downstream behavioral proof, comment/doc truth, ledger)
```

**S1 is behaviorally inert in production on its own.** It makes the decision *derived* and *tested*, but with no
real source of room kind wired in it resolves "unknown" for every message and therefore still yields
`isGroupChat: true`. That is intentional — it keeps the pure logic reviewable in isolation — but it
means **S1 must not be merged as "the fix" and must not close the proposal.** S1 + S2 together are
the fix. Under branch B1, S1 and S2 are small enough to ship as one PR; say so in the PR rather than
splitting for the sake of the spec.

---

### S1 — A pure room-kind classifier, wired into `payloadToInboundMessage` behind a provider

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** `isGroupChat` is computed by one small pure function from the Nextcloud Talk conversation
type, with an explicit fail-closed default, and `payloadToInboundMessage` obtains that type through an
injected provider it does not own. A one-to-one fixture yields `isGroupChat === false`. No network
code in this slice.

**Do:**

- **New module `extensions/nextcloud-talk/src/room-kind.ts`.** Pure, no I/O, no imports beyond types.
  Intended shape — adjust naming to the extension's local style, keep the semantics:

  ```ts
  /** Nextcloud Talk conversation types that are 1:1-shaped (DM semantics), by numeric constant.
   *  VERIFY these against the deployed Talk version before shipping (see the note below):
   *    1 = one-to-one · 4 = changelog · 5 = former one-to-one · 6 = note-to-self
   *  Group-shaped types (2 = group, 3 = public) are deliberately absent — see resolveIsGroupChat. */
  // Populate only with constants verified during S0 against the supported/deployed Talk version.
  const DM_ROOM_TYPES = new Set([1]);

  export type RoomKindInput = unknown;

  /** True unless the conversation is *known* to be 1:1-shaped. Unknown ⇒ group (fail-closed). */
  export function resolveIsGroupChat(rawType: RoomKindInput): boolean {
    if (typeof rawType !== 'number' && typeof rawType !== 'string') return true;
    if (typeof rawType === 'string' && !/^\d+$/.test(rawType)) return true;
    const n = Number(rawType);                       // OCS may serialize ints as strings
    if (!Number.isInteger(n)) return true;
    return !DM_ROOM_TYPES.has(n);
  }
  ```

- **Allow-list only verified DM types; never allow-list the group types.** The direction matters more
  than the numbers. S0 must verify the numeric constants against the supported/deployed Talk version
  and record the authoritative documentation or source reference in the PR. Constants `4`/`5`/`6`
  are candidates, not requirements; omit any constant that cannot be verified.
  The allow-list direction is what makes that uncertainty *safe*: if `6` turns out to be something
  else, a note-to-self room is merely treated as a group and the bot stays quiet until mentioned —
  harmless. Get the direction backwards (deny-list `2` and `3`, DM by default) and the same
  uncertainty spams a room full of humans. Add a test asserting `2` and `3` → `true` so nobody
  "simplifies" the polarity later.
- **Coerce unsigned decimal strings, and only those strings.** OCS endpoints may serialize
  integers as strings; treating `'1'` as unknown would leave the reported bug in place for a
  deployment whose API does exactly that. Reject booleans, arrays, objects, whitespace, signs,
  decimals, `NaN`, and `Infinity` before coercion. Do **not** reach for `parseInt` — it accepts
  `'1abc'`.
- **Introduce a provider seam, do not call the network here.**

  ```ts
  /** Resolves a conversation token to its Talk room type. Returns null when unknown —
   *  never throws; S2 bounds any I/O wait. */
  export type RoomTypeProvider = (token: string) => Promise<RoomKindInput>;
  ```

  `payloadToInboundMessage` takes the provider (or the already-resolved type — S0 (b)/(e) decides
  which reads better against the existing signature) rather than constructing a client. That is what
  makes the proposal's DoD test a *unit* test with a stub instead of an HTTP mock, and it is what lets
  S2 change the source without touching the mapper again.
- **Replace the hardcoded literal and delete the false comment.** `monitor.ts:57`'s
  `isGroupChat: true, // let inbound handler refine` becomes the resolved value. The comment must go
  in the same edit — a stale comment asserting behavior that does not exist is the defect that let
  this survive; leaving it while fixing the line around it would be an open-items-ledger entry in its
  own right.
- **Forbidden heuristics — write them down so a later reader does not "improve" the code into them.**
  (a) `target.name` — for a 1:1 room Talk exposes a name derived from the other participant, but it
  is a display string, localizable and user-settable, and matching on it is a locale bug waiting to
  happen. (b) Participant count `=== 2` — a group room with two members is still a group, and the
  count is a different API call besides. (c) Token shape/length — tokens are opaque. (d) Absence of a
  field as positive evidence of a DM. Only the conversation type decides.
- **Do not change `InboundMessage`'s type or add a field.** `isGroupChat` already exists; this slice
  sets it correctly. If the work appears to need a new inbound field, stop — that would cross into
  `@minion-stack/shared` and the gateway protocol, which §5 excludes.
- **Red-state first (G3).** Before changing the mapper signature or adding the provider, write a
  one-to-one fixture against the current callable mapper and assert `isGroupChat === false`; run it
  against the hardcoded `true` and paste that observed failure into the PR. Then adapt the same test
  to the selected provider/resolved-value seam. Do not prescribe the runner's exact error text. The
  existing suite cannot serve as red-state proof because it passes today by construction.

**Files:** `extensions/nextcloud-talk/src/room-kind.ts` (new),
`extensions/nextcloud-talk/src/room-kind.test.ts` (new),
`extensions/nextcloud-talk/src/monitor.ts` (the `:57` site + the provider parameter + the deleted
comment), `extensions/nextcloud-talk/src/monitor.test.ts` (new or appended — the mapper test with a
stub provider). No file outside `extensions/nextcloud-talk/`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm --filter <ext-pkg-from-S0> test    # or the repo's extension-test invocation; resolve in S0 (c)
#   red-state first (G3): the one-to-one case shown failing against the old hardcoded true.
#   room-kind.test.ts:
#   - resolveIsGroupChat(1) === false                 ← one-to-one, the reported bug
#   - resolveIsGroupChat(2) === true                  ← group
#   - resolveIsGroupChat(3) === true                  ← public (a 2-member public room is still a group)
#   - every additional S0-verified DM constant → false; every unverified constant → true
#   - resolveIsGroupChat('1') === false               ← OCS string-int, must not fall through to unknown
#   - resolveIsGroupChat('2') === true
#   - each of: undefined, null, '', ' ', 'abc', true, false, NaN, 0, 99, 1.5, Infinity, [], {} → true
#   monitor.test.ts:
#   - payloadToInboundMessage(<one-to-one webhook fixture>, stubProvider→1).isGroupChat === false
#         ← the proposal's DoD sentence, literally
#   - payloadToInboundMessage(<group fixture>, stubProvider→2).isGroupChat === true
#   - payloadToInboundMessage(<fixture>, stubProvider→null).isGroupChat === true
#   - the mapper performs no network I/O: no fetch/http import is reachable from room-kind.ts
pnpm tsgo && pnpm check                 # typecheck (no `any`, no @ts-nocheck) + oxlint/oxfmt
rg -n 'let inbound handler refine' extensions/nextcloud-talk/src   # → ZERO hits
rg -n 'isGroupChat:\s*true' extensions/nextcloud-talk/src --glob '!*.test.ts'  # → ZERO hits
rg -n 'target\.name|participants?\.length|participantCount' extensions/nextcloud-talk/src/room-kind.ts  # → ZERO (forbidden heuristics)
```

---

### S2 — The real room-kind source: thread it through, or look it up and cache it

**Tags:** `logic`, `test` · **Estimate:** B1 3–4 h · B2 5–7 h

**Goal:** the provider from S1 returns the true conversation type in production, cheaply, without
dropping a message. B1 adds no wait; B2 may delay mapping only up to its explicit lookup timeout.
Which branch you are in is S0 (b)'s answer; **record it in the PR**.

**Branch B1 — the type is already in hand (best case).** The monitor already lists or fetches rooms
and the response carries `type` per room. Thread that value to the mapper; the "provider" collapses to
a lookup in data the monitor already holds. No HTTP, no cache, no new failure mode. Ensure the value
is read per-message (a room's entry can be refreshed) and that a room missing from the local map
resolves to `null` → group, not to a crash.

**Branch B2 — authenticated room-info lookup.** Add a small resolver over the existing HTTP client and
existing credentials:

- **Endpoint:** the Talk conversation API for a single room —
  `GET /ocs/v2.php/apps/spreed/api/v4/room/{token}` with `OCS-APIRequest: true`, reading
  `ocs.data.type`. Verify the exact path against the deployed Talk version in S0; the *shape* of this
  slice does not depend on the version, only the URL does.
- **Cache, keyed by conversation token.** Successes may be cached for a long TTL (default **15 min**,
  a named constant): the DM-vs-group classification of a token is effectively stable — Talk does not
  support converting a one-to-one into a group, and group↔public conversions stay on the group side of
  the line. Cache **failures and unknowns for a short TTL (default 30 s)** so a transient 500 does not
  pin a room to "group" for a quarter of an hour. Long-cache-success / short-cache-failure is the whole
  point of having two constants.
- **Single-flight.** A burst of messages in one room must produce **one** in-flight request; keep a
  `Map<token, Promise>` and delete the entry on settle. Without this, a busy room fans out one OCS call
  per message.
- **Bounded.** Cap the cache (default **500** entries, evict oldest-inserted) so a monitor watching
  many rooms cannot grow it without limit for the lifetime of the process.
- **Bound the lookup.** Use the existing client's timeout facility, or an abort signal, with a named
  timeout constant. A request that never settles must resolve to `null` after that bound and clear
  its single-flight entry; do not introduce a second retry policy.
- **Never throw, never drop delivery, never spam the log.** Any failure — non-2xx, network reject,
  malformed body, missing `type` — resolves to `null`, which S1 turns into `isGroupChat: true`, and the
  message is delivered normally. Log at `warn` **at most once per token per failure-TTL**; a channel
  that logs per message during an outage is its own incident.

**Branch B3 — no credential path exists (bot shared-secret only).** ⚠️ A4. This is a **stop
condition**, not an implementation branch: S1 alone does not satisfy the proposal's definition of
done and must not be merged or represented as the fix. Report the evidence and return the spec for a
human decision on a separately scoped credential/config capability. Do not create that capability,
a placeholder provider, a TODO, or a follow-up proposal as part of this spec.

**Files:** `extensions/nextcloud-talk/src/room-kind.ts` (B1: no change, or the local-map read · B2:
the resolver + cache, or a sibling `room-info.ts` if that reads better),
`extensions/nextcloud-talk/src/monitor.ts` (construct/inject the real provider),
`extensions/nextcloud-talk/src/*.test.ts` (the selected branch's test matrix).

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm --filter <ext-pkg> test
#   B1: - a one-to-one room in the local room map → isGroupChat false; a group room → true
#       - a token absent from the map → true, no throw
#       - zero fetch calls made by the mapper (assert on the injected client)
#   B2: - provider(token) with a stubbed 200 {ocs:{data:{type:1}}} → false;  type:2 → true
#       - two sequential messages, same room → exactly 1 fetch call            (cache hit)
#       - two concurrent messages, same room → exactly 1 fetch call            (single-flight)
#       - 403 / 404 / 500 / network reject / '<html>' body / {} with no type
#             → isGroupChat true AND the message is still delivered AND nothing throws
#       - a failure then a retry inside the failure TTL → 0 extra fetches; after it expires → 1
#       - a success then a message after the success TTL → 1 extra fetch        (TTL respected)
#       - a never-settling request → null within the configured timeout; message continues;
#         the next call can retry (single-flight entry was cleared)
#       - CAP+50 distinct tokens → cache size <= CAP                           (bounded)
#       - 10 failures for one token inside the failure TTL → exactly 1 warn log (no log storm)
#       - the resolver logs/attaches no credential or Authorization header value anywhere
pnpm tsgo && pnpm check
```

---

### S3 — Prove the downstream behavior actually changed, and make the docs true

**Tags:** `test`, `logic` · **Estimate:** 4–5 h

**Goal:** the *reported* symptom — "mention-gating and group auto-reply policy misapply" — is shown
fixed at the boundary where it hurt, not merely at the mapper. Group behavior is shown unchanged. The
extension's docs stop describing the old lie.

**Do:**

- **Test the gate, not just the flag.** S1/S2 prove `isGroupChat === false`; this slice proves the
  consequence. Drive the mention-gate / auto-reply decision (whatever S0 (a) found reads the flag) with
  four inbound messages and assert on whether the agent is invoked:
  DM without mention → **invoked** (this is the bug, gone) · group without mention → **not invoked**
  (the regression guard that matters most) · group with mention → invoked · DM with mention → invoked,
  and any bot-name prefix still stripped from the text exactly as it is in a group. That last case is
  the one an implementer skips: a user *may* still type `@bot` in a DM out of habit, and it must not
  leak into the prompt.
- **Do not edit the gate to make the test pass.** If the gate needs changing for these to hold, that is
  a **finding, not a chore** — the fix is supposed to be upstream of it. Stop and report it (§4).
- **⚠️ A2 resolution, written down.** State in the PR whether any session-key or thread-ownership
  derivation reads `isGroupChat` (S0 (d)). If it does and existing Talk DM sessions would fork on
  deploy, stop and return the spec for a human scope decision before implementation. This spec does
  not authorize accepting a continuity break or adding migration work.
- **Docs.** Update the extension's README / docs (whatever exists — S0 lists it) with one short
  paragraph: how the conversation kind is determined, that unknown resolves to group deliberately, and
  under B2 the two cache TTLs and the operational consequence (a room's kind may be up to 15 min
  stale, which is fine because the classification is stable). If the extension has no README, add the
  paragraph as a file-header comment in `room-kind.ts` instead of creating a docs surface this spec did
  not scope.
- **Ledger sweep before closing.** Per AGENTS.md, any remaining in-scope implementation open end gets
  both a `TODO(handoff): <what, why, pointer>` at the site and a proposal entry. B3 and A2 are stop
  conditions handled before implementation, not acceptable open ends in a completed fix. An
  unverified optional room type stays fail-closed and is omitted from the allow-list; that is defined
  behavior, not an open implementation. If there are no open ends, say "no open items" in the PR.
- **If S0 found the same hardcoded-`isGroupChat` pattern in another extension**, file a proposal for it
  and do **not** fix it here (§5). This bug class rarely appears exactly once, and a sweep bundled into
  this PR would make the diff unreviewable.

**Files:** the mention-gate/dispatch test file (test-only edit; if it lives under `src/`, that is the
one file outside `extensions/nextcloud-talk/` this spec touches, and it must be a `*.test.ts`),
`extensions/nextcloud-talk/README.md` or the `room-kind.ts` header, plus any ledger `TODO(handoff):`
and `proposals/*.md` the sweep produces.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm test                        # full unit suite, including the four gate cases above
pnpm tsgo && pnpm check
git diff --name-only <base>...HEAD | rg -v '^(extensions/nextcloud-talk/|src/.+\.test\.ts$|proposals/.+\.md$)' # → EMPTY
git diff --name-only <base>...HEAD | rg '\.svelte$'  && echo "FAIL: UI out of scope"      && exit 1
git diff --name-only <base>...HEAD | rg '^src/' | rg -v '\.test\.ts$' && echo "FAIL: gate edited — that is a finding" && exit 1
rg -n 'isGroupChat' extensions/nextcloud-talk/src --glob '!*.test.ts'   # → derived only; no literal
```

---

## 3. The decision table (one place, so reviewers can check it at a glance)

| Talk conversation type | `isGroupChat` | Why |
|---|---|---|
| `1` one-to-one | `false` | The reported bug. DM semantics: no mention required. |
| `2` group | `true` | Unchanged. |
| `3` public | `true` | Unchanged — a public room with two members is still a group. |
| `4` changelog | `false` only if verified; otherwise `true` | Candidate 1:1-shaped type; fail closed if unsupported or unverified. |
| `5` former one-to-one | `false` only if verified; otherwise `true` | Candidate 1:1-shaped type; fail closed if unsupported or unverified. |
| `6` note-to-self | `false` only if verified; otherwise `true` | Candidate 1:1-shaped type; fail closed if unsupported or unverified. |
| anything else, missing, unparseable, lookup failed | **`true`** | **Fail-closed.** Unknown must never mean "auto-reply to everyone". |

Numeric constants for `4`/`5`/`6` are candidates and must be verified against the supported/deployed
Talk version (§2 S1) before inclusion. An unverified constant is omitted and therefore resolves to
group semantics. The allow-list direction makes uncertainty safe: an unknown DM-shaped room stays
quiet until mentioned rather than causing replies in a group.

## 4. Cross-repo impact

Checked against the AGENTS.md "Cross-Project Impact Zones" table. The relevant row is **"Channel
extension (new/modify) → `minion/extensions/<channel>/` + `minion/src/channels/`"**.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/extensions/nextcloud-talk/` | **The fix.** All production code changes live here | S1–S3 |
| `minion/src/channels/`, `minion/src/dispatch/` (mention-gate, auto-reply policy) | **Behavior changes without these files changing** — that is the point. A DM now takes the ungated path it should always have taken | S3 asserts the four gate outcomes, including the group-unchanged guard. **Editing these files (outside a `*.test.ts`) is a finding**, enforced by S3's `git diff` check |
| `minion` sessions / `extensions/thread-ownership` | **⚠️ A2 — possible, unverified.** If session identity derives from `isGroupChat`, existing Talk DMs fork onto new sessions at deploy and users lose continuity | S0 (d) greps for it in ≤ 5 min; S3 requires the answer in the PR. If yes and continuity changes → stop for a human scope decision |
| `@minion-stack/shared` (frames, events, WS protocol) | **None.** No frame type, event, or protocol field is added or changed; `isGroupChat` is an existing inbound field being set correctly | §5 excludes it; S1 explicitly forbids new inbound fields |
| `minion_hub`, `minion_site`, `paperclip-minion` | **None.** No protocol change ⇒ no consumer change. Hub may *display* session metadata influenced by the flag, but read-only and with no contract change | AGENTS.md's "Gateway protocol" row does not apply |
| Other channel extensions (telegram, discord, slack, matrix, …) | **None from this diff.** But the same hardcoded-flag pattern may exist elsewhere | S0 (e) reads them for the house pattern; S3 files a proposal if it spots the same bug, and fixes nothing outside Talk (§5) |
| Nextcloud Talk server (external) | Under B2 only: **one extra authenticated OCS request per room per 15 min** | Long success TTL + single-flight + bounded cache (S2). Under B1: zero extra requests; B3 does not ship |
| `Minion Docs/`, `minion_plugins`, `pixel-agents` | **None** | No dependency on this extension |

### ⚠️ A1 — the proposal's first option may be a dead end

`payload.target.type` is very likely the constant `"Collection"` for every Talk conversation, in which
case deriving `isGroupChat` from it would produce a constant — the current bug, relabeled as a fix and
harder to spot next time. I am not certain, which is exactly why S0 (b) checks it empirically before a
line is written, and why the classifier in S1 takes a *conversation type* rather than the payload:
that signature is correct under either branch. If S0 shows `target.type` **does** vary, S2 branch B1
applies and the lookup is unnecessary — say so and delete the possibility from the PR rather than
building a cache nobody needs.

### ⚠️ A2 — the flag may reach further than the mention-gate

The proposal's grep establishes that nothing *writes* `isGroupChat` downstream; it does not establish
the full set of *readers*. A session-key derivation that includes it would turn this fix into a
conversation-continuity event for every existing Talk DM. Cheap to check (S0 (d)), expensive to learn
from a user report. If it is real, it does not block the fix — it needs a sentence in the PR and
possibly its own proposal.

### ⚠️ A3 — the target repo is not in this workspace

`minion/` is not checked out here, so every line number, file name, and function name in this spec is
carried from the proposal rather than read from disk. The proposal's evidence is specific
(`monitor.ts:57`, the comment text, the grep result) and S0 re-verifies all of it in under an hour. If
S0 finds the site has moved or already been fixed, that is a reconciliation finding for the G0 sweep
(`2026-08-17-sdlc-phase-gates-scoring-spec` §3) — report it and stop; do not go looking for a different
bug to fill the slice with.

### ⚠️ A4 — a bot-secret-only extension may be structurally unable to know

If S0 (b) lands on B3, stop: this spec has no implementable path that satisfies its definition of
done. Report the evidence for a human to decide whether to authorize a separately scoped credential
surface. A tested seam with an always-unknown provider is not a completed fix and must not ship under
this spec.

## 5. Out of scope (explicit)

- **Any other Talk feature work** — the proposal's own exclusion. No read receipts, typing indicators,
  reactions, attachments, room joining/leaving, message editing.
- **Changing the mention-gate or the group auto-reply policy themselves.** This fix corrects the
  *input* to those policies. Altering the policies is a different proposal with a different blast
  radius; needing to touch them here is a finding (§4).
- **Adding a Nextcloud credential or config surface** (app password, API user, OAuth) if none exists —
  ⚠️ A4. Use credentials the extension already has; otherwise B3 stops this spec for a human scope
  decision.
- **Any change to `InboundMessage`, `@minion-stack/shared`, or the gateway WS frame protocol.** No new
  field, no new event, no consumer coordination. If the fix seems to need one, that is a spec bug —
  raise it.
- **Fixing the same hardcoded-flag pattern in other channel extensions.** File a proposal; do not
  absorb a fleet sweep into this diff.
- **A shared/persistent room-metadata cache** (Redis, the gateway's cache package, the DB). A bounded
  in-process map is the right size for a per-token boolean; anything more is infrastructure this bug
  does not justify.
- **Retries or backoff on the room-info lookup.** One attempt, fail-closed, short negative TTL. Retry
  policy is a separate concern and is *easier* to add later against the seam S1 builds.
- **Backfilling or reclassifying historical Talk messages/sessions.** The fix is forward-only.
- **Any UI.** Zero `.svelte` files ⇒ the `ui` tag, the ui-design-governance skill, `lint:design`, and
  `lint:tokens` do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Editing `specs/index.json` or `proposals/index.json`.** Generators own them.

## 6. End-to-end verification

Run with S1–S3 merged on `minion`'s `DEV` branch, against a real Nextcloud instance with Talk (or a
dev instance — the point is a live server, since S1/S2's unit tests already cover the pure logic).

```bash
cd minion

# 1. Gates (logic/test-tagged: no design or token lint — §5)
pnpm install && pnpm build
pnpm test && pnpm tsgo && pnpm check
git diff --name-only <base>...HEAD    # → extensions/nextcloud-talk/** , *.test.ts, docs only (§2 S3 DoD)

# 2. Live: the reported symptom, gone
#    Configure the Talk channel, start the gateway (pnpm gateway:watch), then:
#    a) In a 1:1 conversation with the bot, send "hello" with NO mention
#         → the bot replies.                                    ← the bug, fixed
#    b) In a group conversation, send "hello" with NO mention
#         → the bot stays silent.                               ← the regression guard
#    c) In the same group, send "@bot hello"
#         → the bot replies, mention stripped from the prompt.
#    d) In the 1:1, send "@bot hello"
#         → the bot replies once, mention stripped — no double-handling.
#    e) Branch B2 only: send 5 messages in quick succession in the 1:1
#         → exactly ONE room-info request in the Nextcloud access log (single-flight + cache)
#    f) Branch B2 only: break the room-info path (wrong URL / revoked credential) and send a DM
#         → the message is still delivered and answered as a group (mention required),
#           ONE warn is logged, and nothing throws or drops.     ← fail-closed, proven live

# 3. Conversation continuity (⚠️ A2)
#    Before deploying, note the session id for an existing Talk DM; after deploying, send a message
#    in that same DM and confirm the session id is unchanged. If it changes, do not ship; return for
#    the A2 human scope decision.
```

**Ship gate:** §6 steps 1–3 green; the proposal's DoD checked clause by clause
(`payloadToInboundMessage` decides from the conversation type rather than a literal — S1's
`rg 'isGroupChat:\s*true'` returns nothing; a one-to-one fixture asserts `isGroupChat === false` —
S1's `monitor.test.ts` case); the S1 red-state failure pasted into the PR, proving the old code failed
the way the proposal reported; S0's three answers recorded (A1 discriminator, S2 branch, A2 readers)
including any "unverified". B3 is a stop condition and cannot pass this ship gate.
