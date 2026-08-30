---
id: 2026-08-17-gw-msteams-large-upload-spec
title: "MS Teams attachments — route >4MB through a Graph resumable upload session (chunked PUT with resume, expiry and cancel)"
stage: spec
status: draft
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-gw-msteams-large-upload
verdict: changes_requested
repos: [minion]
tags: [logic, test]
type: fix
---

# MS Teams — resumable upload session for attachments over 4MB

**Owner surface:** `minion` (gateway) — `extensions/msteams/src/` only: `graph-upload.ts`, a new
upload-session module, their tests, and the extension's own docs. **Consumer surface (read, never
edited here):** `minion/src/channels/` — whatever calls the msteams outbound attachment path. Per
AGENTS.md "Cross-Project Impact Zones", a channel-extension change touches
`minion/extensions/<channel>/` + `minion/src/channels/`; this spec asserts the second half is
**read-only** and treats any need to edit it as a finding (§5).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
§4b — slices are tagged `logic` / `test`. The proposal's `edge-case` tag has no slot in the §4b enum
(`ui logic data infra docs test security perf deps`); it is carried here as `logic` + `test`, which is
what it routes to anyway. Red-state TDD (G3) is mandatory: the >4MB fixture is written and shown
failing against today's simple-PUT-only code before the fix lands. **No UI governance applies** — zero
`.svelte` files, zero design or token lint, in any slice.

**Prior art consulted.** `rg -li 'msteams|createUploadSession|graph-upload' specs/ proposals/` finds no
design ancestor — nothing to supersede. Two adjacent facts are worth carrying:
`specs/2026-07-08-package-updates-tracking.md:153` records that `extensions/msteams` builds on
`@microsoft/agents-hosting` (bumped 1.2.3 → 1.6.1 in P1) with local `sdk.ts` / `sdk-types.ts` wrappers
and a suite that was **148/148 green** at that bump — so there is a real test surface to extend, and a
vendored SDK seam that may already own an HTTP client this slice should reuse rather than duplicate.
`specs/2026-08-13-agentic-sdlc-test-quality-gates-spec.md:99` notes an msteams privacy-notice
content-snapshot test — evidence that content-shape assertions are house-acceptable in this extension.

---

## 0. Product

From the approved proposal `2026-08-17-gw-msteams-large-upload`, verbatim:

> ## Problem
>
> extensions/msteams/src/graph-upload.ts:27 TODO — only the simple PUT /content endpoint exists, hard-capped
> at 4MB by Graph; larger bot attachments error.
>
> ## Definition of done
>
> createUploadSession + chunked PUT path taken for >4MB (unit test with mock >4MB buffer asserts the
> resumable path).
>
> ## Out of scope
>
> Download side; non-OneDrive storage.

**What the user actually loses today.** The assistant can compose a report, a recording, an export —
and then cannot hand it over. A 4.1MB PDF and a 400MB video fail identically and, going by "larger bot
attachments error", they fail as an *error*, not as a graceful "too large" message. The user asked for
a file and got a stack trace's worth of nothing. The cap is not a Minion policy anyone chose; it is the
documented ceiling of the one Graph endpoint that happens to be implemented, and the TODO at
`graph-upload.ts:27` says so out loud.

**Why this is more than "add a second endpoint".** A resumable upload is a *stateful protocol* — a
session that expires, chunks that must tile the byte range exactly with no gap and no overlap, a server
that answers 202-with-`nextExpectedRanges` for every chunk but the last, transient failures that are
supposed to be resumed rather than restarted, and an orphaned session that should be cancelled rather
than left holding a partial file. Getting the happy path right is a few hours. Getting the boundaries
right is the rest of the spec, and it is where the proposal's `edge-case` tag is pointing.

## 1. Assumptions, and the one that could invalidate the whole approach

`minion/` is **not** checked out in this workspace (`ls -d minion` → "No such file or directory"; the
meta-repo `.gitignore` excludes subprojects). Every code claim below is **carried from the proposal**,
not read from disk — see ⚠️ A4. The proposal's evidence is specific (file, line, the TODO's content),
and S0 re-verifies all of it.

Four load-bearing unknowns, all settled by S0:

1. **Is this a Graph *drive* upload at all — or the Teams file-consent-card flow?** ⚠️ A1, and it is
   the one that can invalidate the proposal's stated DoD. A Teams bot has two different ways to hand a
   file to a user, and only one of them has `createUploadSession` in it:
   - **Channel / group posts** land in the team's SharePoint document library, reached through Graph
     drive endpoints. `createUploadSession` is exactly right here.
   - **Personal (1:1) chats** classically go through a *file consent card*
     (`application/vnd.microsoft.teams.card.file.consent`); the user accepts, and the invoke payload
     hands the bot an `uploadInfo.uploadUrl`. That URL takes chunked `PUT`s with `Content-Range` —
     protocol-compatible with what S1 builds — but there is **no `createUploadSession` call**, because
     the consent response *is* the session.
   The filename `graph-upload.ts` and the reported `PUT /content` both point at the first case, so I
   expect the proposal is right; I am not certain, and the cost of being wrong is building a session
   creator for a path that is handed its session. S1's design absorbs this: the chunked transfer takes
   an **upload URL**, and session *creation* is a separate, thin function. Under either answer the
   transfer code is the same code.
2. **What does `graph-upload.ts` take — a `Buffer`, a stream, a path?** This decides whether chunking
   is free (`buffer.subarray` returns a view, zero copy) or requires buffering a 200MB file in the
   gateway's heap. ⚠️ A2.
3. **Which HTTP client does the extension already use** — `fetch`, the `@microsoft/agents-hosting`
   client, or a local wrapper in `sdk.ts`? The chunk loop must reuse it (and its proxy/agent config),
   not introduce a second one; but see the hard constraint in S1 about the `Authorization` header, which
   may make the SDK client the *wrong* tool for the chunk PUTs specifically.
4. **Where does the drive/parent come from** (`driveId` + parent item, or a path) and is the caller
   already handling the "too large" case with a friendly message that this fix must not orphan?

### Slice 0 — recon (≤ 45 min; prepend to S1, not counted as a slice)

Run from a checkout of `minion` on branch `DEV` (per AGENTS.md Project Map). Read
`minion/.dmux-hooks/CLAUDE.md` first, as AGENTS.md requires for that subproject.

```bash
cd minion

# a. The reported site, verbatim — and the exported signature (A2)
sed -n '1,80p' extensions/msteams/src/graph-upload.ts
rg -n 'TODO|4 ?MB|4194304|4000000|maxSize|too large' extensions/msteams/src

# b. A1 — drive upload, consent card, or both?
rg -n 'consent|uploadInfo|fileConsent|vnd\.microsoft\.teams\.card\.file' extensions/msteams/src
rg -n 'drives?/|/content|driveItem|sharepoint|siteId|/me/drive' extensions/msteams/src

# c. Callers, and whether a friendly size error already exists (A4)
rg -n 'graph-upload|uploadFile|uploadAttachment' extensions/msteams/src src/channels src/ --glob '!**/*.test.ts'

# d. The HTTP client + auth token plumbing already in the extension
rg -n 'fetch\(|axios|undici|got|Authorization|Bearer|getToken|acquireToken' extensions/msteams/src
sed -n '1,60p' extensions/msteams/src/sdk.ts 2>/dev/null

# e. The test surface to extend (the 148-test suite from specs/2026-07-08-package-updates-tracking.md)
ls extensions/msteams/src/*.test.ts extensions/msteams/test 2>/dev/null
cat extensions/msteams/package.json          # exact package name for the --filter, and the test script

# f. House pattern for chunked/large transfer elsewhere in the fleet — mirror, do not invent
rg -ln 'Content-Range|createUploadSession|chunk' extensions/ src/ | head -20
```

**Four answers that must be written into the PR description**, each as one sentence: (1) drive upload,
consent card, or both — and therefore whether `createUploadSession` is in play; (2) the input type of
the upload function (Buffer / stream / path); (3) which client and token source the chunk PUTs use;
(4) whether a caller already renders a "file too large" message that must be removed or re-aimed. If
(1) comes back "consent card only", **stop and raise it** before writing S1 — the proposal's DoD
sentence names an API that would not exist on that path, and the reviewer should re-word the DoD rather
than have the implementer quietly redefine it.

## 2. Approach — three vertical slices

```
S0 (recon) ─▶ S1 (threshold routing + createUploadSession + happy-path chunk loop)   ← the proposal's DoD, literally
                 └─▶ S2 (the protocol's hard parts: resume, backoff, expiry, cancel, no-leak)
                        └─▶ S3 (wire it to the real send path, honest errors, docs, ledger)
```

**S1 alone is a partial implementation, not a shippable fix.** It makes >4MB uploads *work* on a
healthy network, but cancellation and recovery are S2 and caller-safe behavior is S3. S1–S3 ship
together; do not let "resumable upload" imply that resume, cleanup, and caller behavior are optional.

---

### S1 — Threshold routing, session creation, and the happy-path chunk loop

**Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** a buffer over the simple-upload cap is uploaded through a resumable session in ordered chunks
and the resulting drive item is returned. A unit test with a mock >4MB buffer asserts the resumable
path was taken. Under the cap, behavior is byte-identical to today.

**Do:**

- **New module `extensions/msteams/src/upload-session.ts`** — the transfer protocol, with **no
  knowledge of Teams, no token acquisition, and an injected HTTP client**. That injection is what makes
  the DoD test a unit test instead of a network test, and it is what lets ⚠️ A1 resolve either way
  without a rewrite: the chunk loop takes an *upload URL*, and creating the session is a separate
  function the caller may skip when the consent card already handed one over.

  ```ts
  /** Graph's simple PUT /content is documented as 4MB. Whether that is 4,000,000 or 4,194,304 is
   *  not worth guessing: take the smaller reading, so we never attempt a simple PUT that Graph
   *  would reject under either. Routing extra files through the session path is harmless. */
  export const SIMPLE_UPLOAD_MAX_BYTES = 4_000_000;

  /** Graph requires every chunk except the last to be a multiple of 320 KiB (327,680 B).
   *  5 MiB is exactly 16 x 320 KiB — one constant that satisfies both the alignment rule and
   *  the "5-10 MiB recommended" guidance. VERIFY both numbers against current Graph docs (§4). */
  export const CHUNK_ALIGNMENT_BYTES = 327_680;
  export const CHUNK_BYTES = 5_242_880;
  ```

- **Route on size, in one place, with the boundary written down.** `> SIMPLE_UPLOAD_MAX_BYTES` →
  session path; `<=` → the existing simple PUT, unchanged. Do not "simplify" this to always-resumable:
  a small attachment would grow from one request to at least two (create plus one or more chunk PUTs), and the
  simple path is the common case by a wide margin.
- **`createUploadSession`.** `POST` to the drive item's `:/createUploadSession` with a body carrying
  `item: { "@microsoft.graph.conflictBehavior": ... }`. **Do not hardcode `replace`** — pick the value
  the existing simple path already implies (S0 (a)) so the two paths don't disagree about what happens
  to a same-named file; if the simple path is silent on it, use `rename`, which is the option that
  cannot destroy a user's file. The response yields `uploadUrl` and `expirationDateTime`; keep both.
- **⚠️ Send **no** `Authorization` header on the chunk `PUT`s.** The `uploadUrl` is pre-authenticated
  and Microsoft documents that attaching the bearer token can cause the request to fail. This is the
  single most common way this feature is implemented wrong, and it is invisible in review because the
  header is usually added by a shared client wrapper three layers down. If S0 (d) finds the extension's
  client injects auth unconditionally, the chunk PUTs must use a bare `fetch` (still injected for
  testability) rather than that client — and an assertion in the test must lock it, because a later
  "let's unify the HTTP clients" refactor would silently reintroduce it.
- **Tile the range exactly.** `Content-Range: bytes {start}-{end}/{total}` where `end` is **inclusive**
  and `total` is the true byte length. Chunk *k* covers `[k*CHUNK_BYTES, min((k+1)*CHUNK_BYTES, total) - 1]`.
  The final chunk is short and is the only one exempt from the 320 KiB alignment rule. Off-by-one here
  produces a Graph error whose message does not mention the word "range", so write the boundary test
  first: a file of exactly `CHUNK_BYTES` (one chunk, `0-5242879/5242880`), one of `CHUNK_BYTES + 1`
  (two chunks, second is `5242880-5242880/5242881` — a single byte), and one of `CHUNK_BYTES - 1`.
- **Sequential, not parallel.** Graph's session accepts chunks in order; a concurrent fan-out buys
  nothing reliable and makes resume ambiguous. One chunk in flight.
- **Read the terminal response.** Intermediate chunks answer `202` with `nextExpectedRanges`; the final
  chunk answers `200`/`201` with the drive item. Return that item (at least `id`, `name`, `size`,
  `webUrl`) — the caller needs it to build the Teams attachment card. **Do not** treat "the loop
  finished" as success; assert on the terminal status and the presence of an item id, because a `202`
  on the last chunk means the server disagrees with your arithmetic.
- **Zero-copy chunking.** If the input is a `Buffer` (⚠️ A2), slice with `subarray`, which returns a
  view. Never `Buffer.concat`, never `slice().toString()`. If S0 finds the input is a stream, this slice
  still buffers — see §5 and the ledger note in S3.
- **Red-state first (G3).** Write the >4MB test, run it against today's simple-only code, and paste the
  failure into the PR. The existing 148-test suite cannot serve as red-state proof: it passes today by
  construction.

**Files:** `extensions/msteams/src/upload-session.ts` (new),
`extensions/msteams/src/upload-session.test.ts` (new),
`extensions/msteams/src/graph-upload.ts` (the `:27` TODO site — the size branch, the delegation, the
deleted TODO), `extensions/msteams/src/graph-upload.test.ts` (new or appended). No file outside
`extensions/msteams/`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm --filter <msteams-pkg-from-S0> test
#   red-state first (G3): the >4MB case shown failing against the old simple-only code.
#   graph-upload.test.ts:
#   - upload(<Buffer.alloc(5_000_000)>) → createUploadSession called exactly once
#         AND >=1 PUT to the returned uploadUrl AND zero PUTs to /content
#         ← the proposal's DoD sentence, literally
#   - upload(<Buffer.alloc(1_000_000)>) → one PUT to /content, zero createUploadSession calls
#   - upload(<Buffer.alloc(4_000_001)>) → session path       ← the boundary, from above
#   - upload(<Buffer.alloc(4_000_000)>) → simple path        ← the boundary, from below
#   upload-session.test.ts:
#   - 5_242_880 B  → 1 chunk;  Content-Range 'bytes 0-5242879/5242880'
#   - 5_242_881 B  → 2 chunks; last is 'bytes 5242880-5242880/5242881'   ← 1-byte tail
#   - 5_242_879 B  → 1 chunk
#   - 12_000_000 B → 3 chunks, ranges contiguous, no gap, no overlap, last end == total-1
#   - every non-final chunk body length % 327_680 === 0
#   - chunks are issued in ascending order, one in flight at a time
#   - NO chunk PUT carries an Authorization header                       ← the pre-authenticated URL
#   - a 202 on the FINAL chunk → rejects (does not report success)
#   - the returned value carries the drive item id from the 201 body
pnpm tsgo && pnpm check                 # typecheck (no `any`, no @ts-nocheck) + oxlint/oxfmt
rg -n 'TODO' extensions/msteams/src/graph-upload.ts          # → the :27 TODO is GONE
rg -n 'Buffer\.concat|\.slice\(' extensions/msteams/src/upload-session.ts   # → ZERO (use subarray)
rg -n 'Authorization|Bearer' extensions/msteams/src/upload-session.ts       # → ZERO in the chunk path
```

---

### S2 — The protocol's hard parts: resume, backoff, expiry, cancel

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** a transient failure mid-transfer costs one chunk, not the whole file; a permanent failure
leaves no orphaned session and no half-written item; nothing throws an un-typed error at the caller and
nothing logs a credential.

**Do:**

- **Resume from the server's truth, not from local bookkeeping.** On a retryable chunk failure, `GET`
  the `uploadUrl`: the response carries `nextExpectedRanges` (e.g. `["5242880-"]`). Restart from that
  offset. Do **not** assume the failed chunk is the next expected one — a request can fail after the
  server accepted the bytes, and re-sending them from a locally-tracked offset is how you get an
  overlap error on top of a network blip.
- **Retry policy: bounded, with the server's opinion respected.** Retry on `429`, `500`, `502`, `503`,
  `504`, and network-level rejects. Honour `Retry-After` when present; otherwise exponential backoff
  with jitter. Cap at a named constant (default **5 attempts per chunk**) and a **total wall-clock
  budget** (default **10 min**) so a wedged transfer cannot pin the gateway forever. Do **not** retry
  `4xx` other than `429` — those are contract errors and retrying them just burns the budget.
- **`404` on the upload URL means the session is gone** (expired or cancelled). Treat it as terminal for
  that session. Re-creating the session and restarting from byte zero is permitted **at most once**, and
  only if the file is still in hand; guard it with its own constant so it cannot silently become a loop.
  Also reject an already-expired session before the first chunk. Do not introduce an undefined
  "implausibly short" warning threshold; runtime expiry is handled by the same `404` recovery rule.
- **Cancel on give-up.** `DELETE uploadUrl` on permanent failure or caller abort, best-effort: wrap it
  so a failing cancel never masks the original error. Leaving sessions dangling accumulates partial
  files in the user's drive, which is a mess someone else has to find.
- **Accept an optional `AbortSignal` in the transfer module** and stop/cancel when it fires. Thread a
  caller-owned signal into it only if the existing send path already has one; this keeps the module's
  abort behavior testable without inventing a new caller/config surface.
- **Type the failure.** The caller must be able to distinguish "too large for the destination",
  "permission denied", "network gave up", and "session expired" — S3 turns these into user-facing text.
  A single `Error('upload failed')` forces S3 to string-match, which is how error handling rots.
- **Never log a token, an `Authorization` value, or the full `uploadUrl`.** The upload URL embeds a
  pre-authenticated token: anyone with the string can write to that item until it expires. Log the item
  name, the byte total, the chunk index, and the URL's *origin* at most. Add a test that asserts the
  logger never receives a string containing the token fixture — this is the kind of leak that passes
  review because the log line looks harmless.
- **Progress logging at `debug`, one line per chunk maximum, and a single `info` on completion.** A
  200MB file is 40 chunks; that is a fine debug trace and an unacceptable info-level one.

**Files:** `extensions/msteams/src/upload-session.ts` (retry/resume/cancel + the error type),
`extensions/msteams/src/upload-session.test.ts` (the matrix below), and the S1 session-creation module
and test wherever the one allowed session re-creation is coordinated. No file outside the extension.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm --filter <msteams-pkg> test
#   - chunk 2 of 3 returns 503, then 202 on retry → upload succeeds; exactly 1 extra PUT
#   - chunk 2 fails; the GET of uploadUrl reports nextExpectedRanges ['10485760-']
#         → the next PUT starts at 10485760, NOT at the locally-tracked offset
#   - 429 with Retry-After: 2 → the wait is >= 2s (fake timers; assert the scheduled delay, not a sleep)
#   - 5 consecutive 503s on one chunk → rejects with a typed 'network' failure after exactly 5 attempts
#   - 403 → rejects immediately, ZERO retries
#   - 404 on a chunk PUT → at most ONE session re-creation, then terminal; never a loop
#   - permanent failure → exactly one DELETE to the uploadUrl (cancel)
#   - a DELETE that itself throws → the ORIGINAL error still surfaces, not the cancel error
#   - success → ZERO DELETE calls
#   - abort mid-transfer → no further PUTs are issued, session cancelled
#   - the injected logger receives no string containing the uploadUrl token fixture   ← no-leak
#   - a 40-chunk upload emits <= 40 debug lines and exactly 1 info line
pnpm tsgo && pnpm check
rg -n 'uploadUrl' extensions/msteams/src/upload-session.ts | rg -n 'log|console'   # → ZERO
```

---

### S3 — Wire it to the real send path, tell the user the truth, write it down

**Tags:** `logic`, `test`, `docs` · **Estimate:** 4–6 h

**Goal:** the reported symptom — "larger bot attachments error" — is gone at the boundary where it hurt.
A file that is *genuinely* too big fails with a sentence a human can act on. The extension's docs stop
promising a 4MB world, and every remaining open end is in the ledger.

**Do:**

- **Test the caller, not just the module.** S1/S2 prove the transfer; this slice proves the consequence.
  Drive the msteams outbound attachment path (whatever S0 (c) found) with: a 1MB file → simple path,
  attachment delivered · a 12MB file → session path, attachment delivered · a 12MB file whose transfer
  permanently fails → the send reports a typed error and does **not** post a card pointing at a
  nonexistent file. That last case is the one an implementer skips, and it is the one that produces a
  broken link in a real chat.
- **Do not edit `minion/src/channels/` to make these pass.** If the caller needs changing for this to
  work, that is a **finding, not a chore** (§5) — say so in the PR. Test-only edits under `src/` are
  fine; production edits there are the line.
- **Retire, don't orphan, any existing "too large" message** (S0 (c)). If the caller currently
  short-circuits at 4MB with a friendly note, that ceiling must move to the destination's *real* limit
  or be deleted. A dead guard that still says "files over 4MB are not supported" is worse after this
  slice than before it, because now it is a lie the code contradicts.
- **Keep an upper bound, deliberately.** Resumable upload does not mean unbounded: the gateway buffers
  the file (⚠️ A2) and Teams/SharePoint impose their own per-file and per-tenant caps. Introduce
  `MAX_UPLOAD_BYTES` as a named constant with a stated rationale, reject above it *before* creating a
  session, and make the rejection message name the configured limit. Its value must be no greater than
  the current documented destination limit. Because this is also a gateway heap/concurrency policy,
  the spec cannot derive a safe value from the absent checkout: a human must select and record the
  byte value before implementation (flagged below). Do not source it from a new env var or config
  surface (§5) — a constant with a comment is the scoped mechanism.
- **Docs.** Update the extension's README (or, if there is none, the `upload-session.ts` file header —
  do not create a docs surface this spec did not scope) with one short section: the two paths and the
  size that routes between them, the chunk size and why it is a multiple of 320 KiB, the fact that the
  upload URL is pre-authenticated and must never carry a bearer token, the retry/expiry behavior, and
  the current hard ceiling.
- **Ledger sweep before closing.** Per AGENTS.md, every remaining open end gets both a
  `TODO(handoff): <what, why, pointer>` at the site and a `proposals/` entry. Expect at least these
  candidates: streaming instead of buffering (⚠️ A2) if the input is a Buffer and large files are
  realistic; the download side (excluded by the proposal); the consent-card path if S0 (b) found the
  extension serves both and only one was wired. If there are none, write "no open items" in the PR
  explicitly rather than leaving it to inference.

**Files:** `extensions/msteams/src/graph-upload.ts` (the size ceiling + typed error mapping), the
msteams outbound send module S0 (c) names (within `extensions/msteams/`), their `*.test.ts`,
`extensions/msteams/README.md` or the `upload-session.ts` header, plus any `TODO(handoff):` lines and
`proposals/*.md` the sweep produces (**never** `proposals/index.json` — the generator owns it).

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm test                        # full unit suite — the 148-test msteams baseline must not regress
pnpm tsgo && pnpm check
#   the three caller cases above, plus:
#   - a file above MAX_UPLOAD_BYTES → rejected BEFORE any createUploadSession call,
#         and the message contains the actual limit
git diff --name-only <base>...HEAD | rg -v '^extensions/msteams/'  # → EMPTY in the minion repo
git diff --name-only <base>...HEAD | rg '\.svelte$'   && echo "FAIL: UI out of scope"                    && exit 1
git diff --name-only <base>...HEAD | rg 'index\.json' && echo "FAIL: generators own index.json"          && exit 1
git diff --name-only <base>...HEAD | rg '^src/' | rg -v '\.test\.ts$' && echo "FAIL: caller edited — a finding" && exit 1
rg -n '4 ?MB' extensions/msteams --glob '!*.test.ts'  # → only in docs describing the ROUTING threshold,
                                                      #   never as a ceiling on what can be sent
```

---

## 3. The routing table (one place, so reviewers can check it at a glance)

| Payload size | Path | Why |
|---|---|---|
| `0` bytes | Simple PUT (unchanged) | Empty-file semantics are Graph's problem, not this spec's; do not add a special case. |
| `1 B … 4,000,000 B` | Simple `PUT /content` | Today's behavior, byte-identical. One request. |
| `4,000,001 B … MAX_UPLOAD_BYTES` | `createUploadSession` + chunked PUT | **The fix.** Chunks of 5 MiB (16 × 320 KiB), sequential, last chunk short. |
| `> MAX_UPLOAD_BYTES` | Rejected before any network call | Typed error naming the real limit (S3). The gateway buffers the file; unbounded is not a feature. |

**Human decision required before dev:** set `MAX_UPLOAD_BYTES` to an explicit byte value after checking
the destination's current limit and choosing an acceptable per-upload heap bound for the gateway.
Until that value is recorded in this spec (and the routing table can be evaluated numerically), G2
remains `changes_requested`.

The `4,000,000` boundary is the **conservative** reading of Graph's documented "4 MB" simple-upload cap
(the other reading is `4,194,304`). Erring low routes a handful of files through the session path
unnecessarily; erring high resends the reported bug for files between the two numbers. Test both sides
of the boundary (S1 DoD) so nobody "rounds it to 4 MiB" later without reading this row.

## 4. Numbers that must be verified before shipping

I am stating these from knowledge of the Microsoft Graph upload-session API, **not** from a document
read during this spec, and Graph's limits have moved before. The implementer must check each against
the current Graph documentation for the tenant's cloud and record the check in the PR — one line is
enough. The *design* does not change under any plausible revision; only the constants do.

| Constant | Value used here | Confidence | Note |
|---|---|---|---|
| Simple `PUT /content` cap | 4 MB | High that it is "4 MB"; **low** on which 4 MB | §3 resolves the ambiguity conservatively — this is why the constant is 4,000,000. |
| Chunk alignment | multiple of 320 KiB (327,680 B) | High | Applies to every chunk **except** the last. |
| Default chunk size | 5 MiB (5,242,880 B) | High that this is within guidance | Exactly 16 × 320 KiB, so it satisfies alignment by construction. |
| Max bytes per single chunk request | ~60 MiB | Medium | Only matters if someone raises `CHUNK_BYTES`; keep it as a documented ceiling comment, not a live constant. |
| Intermediate chunk response | `202` + `nextExpectedRanges` | High | Final chunk answers `200`/`201` with the drive item. |
| Chunk PUTs are pre-authenticated | no `Authorization` header | High | Microsoft documents this explicitly; S1 locks it with a test. |
| Session lifetime | ~hours, per `expirationDateTime` | Medium | Read the field rather than hardcoding a duration. |

If any check comes back different, change the constant and its comment — and say so in the PR. Do not
change a constant without changing the comment that justifies it; that pairing is the only thing
keeping the next reader from re-deriving all of this.

## 5. Cross-repo impact

Checked against the AGENTS.md "Cross-Project Impact Zones" table. The relevant row is **"Channel
extension (new/modify) → `minion/extensions/<channel>/` + `minion/src/channels/`"**.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/extensions/msteams/` | **The fix.** All production code changes live here | S1–S3 |
| `minion/src/channels/` (the outbound caller) | **Behavior changes without the files changing** — a send that used to error now succeeds. That is the point | S3 asserts the three caller outcomes. **Editing these files (outside a `*.test.ts`) is a finding**, enforced by S3's `git diff` check |
| `@microsoft/agents-hosting` (vendored SDK, 1.6.1 per `specs/2026-07-08-package-updates-tracking.md:153`) | **None intended.** No version bump, no new dependency. If its client injects `Authorization` unconditionally, the chunk PUTs bypass it deliberately | S1's no-auth-header constraint + its test. If a bump *seems* required, that is a finding — package updates have their own tracking spec |
| `@minion-stack/shared` (frames, events, WS protocol) | **None.** No frame type, event, or protocol field is added or changed | §6 excludes it; nothing here crosses the gateway boundary |
| `minion_hub`, `minion_site`, `paperclip-minion` | **None.** No protocol change ⇒ no consumer change | AGENTS.md's "Gateway protocol" row does not apply |
| Other channel extensions (slack, discord, telegram, whatsapp, …) | **None from this diff.** Each has its own upload ceiling and its own API; a shared abstraction is not justified by one instance | §6 excludes the sweep; if S0 (f) finds an identical TODO elsewhere, **file a proposal, fix nothing** |
| Gateway process memory | ⚠️ **A2 — real and unavoidable in this spec.** A 200MB attachment is 200MB of heap while it transfers, and concurrent sends multiply it. Today that memory is never allocated because the upload simply fails | `MAX_UPLOAD_BYTES` (S3) bounds it deliberately rather than by accident; streaming is a ledger item, not a silent omission |
| Microsoft Graph / SharePoint (external) | **More requests per large file**: 1 create + ⌈size/5 MiB⌉ PUTs + status/retry/cancel requests when needed, versus 1 failed request today. Files land in the destination drive and consume tenant storage | Sequential chunks (no fan-out), bounded retries with `Retry-After` honoured, `429` respected — S2. This is the intended cost of the feature |
| `Minion Docs/`, `minion_plugins`, `pixel-agents` | **None** | No dependency on this extension |

### ⚠️ A1 — the proposal's named API may not exist on the path that matters

If S0 (b) finds the extension delivers files to personal chats via the **file consent card**, then that
path is handed an `uploadUrl` and never calls `createUploadSession`. The proposal's DoD sentence would
then name an API that does not apply, and the honest response is to say so in the PR and have the DoD
re-worded to "the chunked `Content-Range` PUT path is taken for >4MB" — **not** to bolt a session
creator onto a flow that does not need one. S1's split (transfer takes a URL; creation is separate) is
designed so that this discovery costs a wiring change, not a rewrite.

### ⚠️ A2 — buffering is a design constraint this spec accepts, not one it solves

Chunking a `Buffer` with `subarray` adds no memory, but the whole file was already in memory before the
first chunk. That is fine at 12MB and questionable at 250MB. This spec bounds it with a constant and
files the streaming work; it does not pretend the constant is a solution. If S0 (a) finds the input is
already a stream or a path, say so — the chunk loop gets slightly harder and the memory story gets much
better, and that is a good trade the implementer should take.

### ⚠️ A3 — "larger bot attachments error" is not a specification of the current failure

The proposal describes the symptom, not the mechanism: today's >4MB send might throw a Graph `413`, a
generic client error, or be caught somewhere and rendered as a message. S0 (c) settles it. It matters
because S3 must *replace* whatever exists rather than leave it stranded above the new ceiling.

### ⚠️ A4 — the target repo is not in this workspace

`minion/` is not checked out here, so every line number, file name, and function name in this spec is
carried from the proposal rather than read from disk. The proposal's evidence is specific
(`graph-upload.ts:27`, the TODO's content, the endpoint) and S0 re-verifies all of it in under an hour.
If S0 finds the site has moved or already been fixed, that is a reconciliation finding for the G0 sweep
(`2026-08-17-sdlc-phase-gates-scoring-spec` §3) — report it and stop; do not go looking for a different
bug to fill the slice with.

## 6. Out of scope (explicit)

- **The download side** — the proposal's own exclusion. No resumable *fetch*, no range requests on read.
- **Non-OneDrive / non-drive storage** — the proposal's own exclusion. No blob store, no CDN, no
  gateway-hosted file serving.
- **Streaming instead of buffering** (⚠️ A2). Bounded by a constant here; filed as a ledger item in S3.
  Converting the extension's upload signature to a stream is its own proposal with its own callers.
- **A new config or env surface** for chunk size, retry counts, or the size ceiling. Named constants
  with comments. If someone genuinely needs to tune these in production, that demand is evidence for a
  follow-up, not a reason to add six env vars now.
- **A shared/fleet-wide chunked-upload utility.** One instance is not a pattern; a second channel with
  the same need is the trigger to extract one.
- **Fixing the same missing-resumable-path TODO in other channel extensions.** File a proposal; do not
  absorb a fleet sweep into this diff.
- **Bumping `@microsoft/agents-hosting`** or any dependency. Package updates are tracked in
  `specs/2026-07-08-package-updates-tracking.md`; needing a bump here is a finding.
- **Changing the Teams attachment card / consent-card UX**, message formatting, or how the file is
  announced in chat. This spec moves bytes; it does not redesign the hand-off.
- **Any change to `@minion-stack/shared`, the WS frame protocol, or `minion/src/channels/` production
  code.** No consumer coordination. If the fix seems to need one, that is a spec bug — raise it (§5).
- **Persisting upload sessions across gateway restarts.** Resume within a process is S2; resume across
  processes needs durable state and is a different feature entirely.
- **Any UI.** Zero `.svelte` files ⇒ the `ui` tag, the ui-design-governance skill, `lint:design`, and
  `lint:tokens` do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Editing `specs/index.json` or `proposals/index.json`.** Generators own them.

## 7. End-to-end verification

Run with S1–S3 merged on `minion`'s `DEV` branch, against a real Microsoft 365 tenant with the Teams
bot installed (or a dev tenant — the point is a live Graph endpoint, since S1/S2's unit tests already
cover the protocol arithmetic).

```bash
cd minion

# 1. Gates (logic/test/docs-tagged: no design or token lint — §6)
pnpm install && pnpm build
pnpm test && pnpm tsgo && pnpm check       # msteams's prior 148-test baseline plus new cases, all green
git diff --name-only <base>...HEAD          # → extensions/msteams/** only in the minion repo

# 2. Live: the reported symptom, gone
#    Configure the msteams channel, start the gateway (pnpm gateway:watch), then:
#    a) Ask the assistant to send a ~1MB file
#         → delivered. Debug log shows the SIMPLE path, exactly one PUT.   ← no regression
#    b) Ask it to send a ~12MB file
#         → delivered, opens correctly, byte size matches the source exactly.
#         → debug log shows createUploadSession + 3 chunk PUTs; the LAST is short.  ← the bug, fixed
#         → the file appears intact in the destination drive (open it, don't just trust the card)
#    c) Send a ~4.1MB file
#         → delivered via the SESSION path.                                 ← the boundary, live
#    d) Mid-transfer of a large file, drop the network for a few seconds, restore it
#         → the transfer resumes and completes; the log shows a nextExpectedRanges GET
#           and a restart at that offset, not at byte zero.                 ← S2, proven live
#    e) Revoke or corrupt the upload URL mid-transfer (or wait past expirationDateTime)
#         → the send fails with a typed, human-readable error; NO broken attachment card is posted;
#           the log shows one best-effort DELETE attempt. If the URL is already invalid, cleanup is
#           service-owned; no completed or user-visible partial item remains in the drive.
#    f) Attempt a file above MAX_UPLOAD_BYTES
#         → rejected before any network call, with a message naming the real limit.
#    g) grep the run's logs for the upload URL's token and for 'Bearer'
#         → ZERO hits.                                                      ← no-leak, proven live

# 3. Tenant hygiene
#    After the runs above, list the destination drive: exactly the files sent in (a)-(c),
#    no zero-byte or partial items left by (d)/(e).
```

**Ship gate:** §7 steps 1–3 green; the proposal's DoD checked clause by clause (`createUploadSession`
+ chunked PUT path taken for >4MB — S1's `graph-upload.test.ts` mock-buffer case, and step 2b live);
the S1 red-state failure pasted into the PR, proving the old code failed the way the proposal reported;
S0's four answers recorded (A1 drive-vs-consent, A2 input type, the client/token source, the existing
size guard); §4's constant verifications recorded, each as one line, including any that came back
different; and the human-selected `MAX_UPLOAD_BYTES` recorded before dev. S1–S3 must ship together;
the proposal does **not** get closed on a happy path.
