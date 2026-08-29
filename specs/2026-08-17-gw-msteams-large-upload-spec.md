---
id: 2026-08-17-gw-msteams-large-upload-spec
title: "MS Teams attachments — route >4MB through a Graph resumable upload session (chunked PUT with resume, expiry and cancel)"
stage: spec
status: approved
pass: 3
created: 2026-08-17
updated: 2026-08-29
proposal: 2026-08-17-gw-msteams-large-upload
verdict: approved
repos: [minion]
tags: [logic, test]
type: fix
---

# MS Teams — resumable upload session for attachments over 4MB

**Owner surface:** `minion` (gateway) — `extensions/msteams/src/` only: `graph-upload.ts`,
`file-consent.ts`, a new upload-session module, their tests, and the extension's own docs.
**Consumer surface (read, never edited here):** the `minion/plugin-sdk` package export the extension
imports (`loadWebMedia`, `resolveChannelMediaMaxBytes` — `send.ts:2`), whose implementation lives in
`minion/src/`. Per AGENTS.md "Cross-Project Impact Zones" a channel-extension change touches
`minion/extensions/<channel>/` + `minion/src/channels/`; **recon found that second half is empty for
this change** (§1.6) — nothing under `src/channels/` references the msteams upload functions. This
spec asserts `src/` is read-only and treats any need to edit it as a finding (§5).

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
— so there is a real test surface to extend.
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
and then cannot hand it over in a group chat or a channel. Recon (§1) confirms the failure and
narrows it: the break is real, but it is **not** where the proposal pointed. The proposal names the
OneDrive *fallback*; the path most tenants actually take — SharePoint, used whenever a site is
configured — has the identical 4MB cap and **no TODO marking it**. A 4.1MB PDF and a 400MB video fail
identically, as a thrown `Error`, not as a graceful "too large" message.

**Why this is more than "add a second endpoint".** A resumable upload is a *stateful protocol* — a
session that expires, chunks that must tile the byte range exactly with no gap and no overlap, a server
that answers 202-with-`nextExpectedRanges` for every chunk but the last, transient failures that are
supposed to be resumed rather than restarted, and an orphaned session that should be cancelled rather
than left holding a partial file. Getting the happy path right is a few hours. Getting the boundaries
right is the rest of the spec, and it is where the proposal's `edge-case` tag is pointing.

## 1. Recon findings — S0 was executed, all four assumptions are resolved

Pass 1 and pass 2 of this spec were written **without** a checkout of `minion` (the meta-repo
`.gitignore` excludes subprojects), so every code claim was carried from the proposal and four
load-bearing unknowns (⚠️ A1–A4) were deferred to a Slice 0. **Slice 0 has now been run** against
`NikolasP98/minion` branch `DEV` at commit **`bd55137`** (`feat(MCP): stateless horizontal scaling via
Redis write-through cache`). Everything below is read from disk at that commit, not inferred. Slice 0
is therefore **deleted from the plan**, not carried; the implementer starts at S1.

Re-verify the pin before starting: `DEV` moves. If a fact below has changed, that is a reconciliation
finding for the G0 sweep (`2026-08-17-sdlc-phase-gates-scoring-spec` §3) — report it and stop.

### 1.1 The reported site is real, and it is one of two identical sites

`graph-upload.ts:26-27` carries exactly the TODO the proposal quoted:

```
 * For larger files, this uses the simple upload endpoint (up to 4MB).
 * TODO: For files >4MB, implement resumable upload session.
```

It sits on **`uploadToOneDrive`** (`graph-upload.ts:29`), which `PUT`s to
`/me/drive/root:{path}:/content`. But **`uploadToSharePoint`** (`graph-upload.ts:171`) does the same
simple `PUT` to `/sites/{siteId}/drive/root:{path}:/content` with the same 4MB ceiling and **carries no
TODO at all**. Both wrap into `uploadAndShareOneDrive` (`:125`) and `uploadAndShareSharePoint` (`:390`).

**This is the single most important correction in this pass.** Reading the call sites
(`send.ts:204-273`, `messenger.ts:322-352`), SharePoint is the *preferred* path and OneDrive is the
fallback taken only when no `sharePointSiteId` is configured — and `uploadToOneDrive`'s own header
comment calls `/me/drive` "personal scope - now deprecated for bot use". A fix scoped to the TODO
alone would leave the primary path broken while closing the proposal. **Both functions are in scope.**

### 1.2 ⚠️ A1 resolved — *both* delivery mechanisms exist, and the consent path is already built

The consent-card path is not a hypothetical: `file-consent.ts` (added `0f7f7bb9`, 2026-01-22 — seven
months before this spec was drafted) implements it end to end.

- `file-consent-helpers.ts:63` `requiresFileConsent()` routes **personal (1:1) chats** to the consent
  card when the file is `>= thresholdBytes` **or** is not an image.
- `pending-uploads.ts` holds the buffer in memory between card and consent.
- `monitor-handler.ts:72`, on `fileConsent/invoke` accept, calls
  `uploadToConsentUrl()` (`file-consent.ts:107`).
- `uploadToConsentUrl` sends **one** `PUT` of the whole buffer with
  `Content-Range: bytes 0-{len-1}/{len}` and — correctly — **no `Authorization` header**.

So the answer to A1 is "both", and the consequence is better than the pass-2 worst case:

1. The proposal's DoD stands **for the drive path** (§1.1) — `createUploadSession` genuinely is the
   right API for SharePoint/OneDrive, and genuinely is absent.
2. The consent path needs **no session creation** (Teams hands it the URL) but does need the **same
   chunk loop**, because a single full-file `PUT` has no resume, no retry, no `Retry-After`, and is
   subject to Graph's per-request fragment ceiling (§4). Today it is the only >4MB path that works at
   all, and it works only on a healthy network in one shot.
3. `uploadToConsentUrl` is the **house pattern** for the no-`Authorization` rule that S1 must preserve —
   the constraint is already honoured in this codebase, and S1's test locks it against regression.

The pass-2 design already anticipated this: the transfer module takes an *upload URL* and session
creation is a separate function. That split is now load-bearing rather than defensive, and it is why
this discovery costs a wiring change and not a rewrite.

### 1.3 ⚠️ A2 resolved — the input is a `Buffer`, already fully materialized upstream

Every upload function takes `buffer: Buffer` and passes `new Uint8Array(params.buffer)` as the body (a
view, not a copy). Chunking with `subarray` is therefore free. The buffer is materialized before any
upload by `loadWebMedia(mediaUrl, mediaMaxBytes)` (`send.ts:128`, `messenger.ts:290`), so the heap cost
is paid at load time regardless of transfer strategy. Streaming stays out of scope (§6) and stays a
ledger item — but note it would have to change `loadWebMedia`, i.e. the plugin-sdk, not this extension.

### 1.4 ⚠️ A3 resolved — the current failure mechanism, precisely

- **Drive paths:** `graph-upload.ts` throws
  `Error("SharePoint upload failed: {status} {statusText} - {body}")` (`:199`) or
  `"OneDrive upload failed: ..."` (`:53`). `send.ts` catches and re-throws; there is **no** friendly
  "file too large" message anywhere on these paths. Nothing to retire — S3 has nothing stranded.
- **Consent path:** `monitor-handler.ts` catches and posts
  `` `File upload failed: ${String(err)}` `` **into the chat**. This is user-visible today. It does not
  leak the upload URL, because `uploadToConsentUrl` throws with only status and statusText —
  **S2/S3 must keep it that way**; widening that error to include the URL would publish a
  pre-authenticated write token into a Teams conversation.

### 1.5 ⚠️ A4 resolved, and the pass-2 human gate dissolved with it

A4 was "the target repo is not in this workspace". It now is (read-only recon at the pin above).

The one item the pass-2 review flagged for a human — *"choose and record an explicit byte value for
`MAX_UPLOAD_BYTES`"* — was an artifact of that blindness. **The ceiling already exists, is already a
deliberate product policy, and is already configurable:**

- `MSTEAMS_MAX_MEDIA_BYTES = 100 * 1024 * 1024` — `send.ts:47`, `messenger.ts:29`
- overridable per channel by `cfg.channels.msteams.mediaMaxMb`, falling back to
  `cfg.agents.defaults.mediaMaxMb`, resolved by `resolveChannelMediaMaxBytes`
  (`src/channels/plugins/media-limits.ts`, re-exported through `minion/plugin-sdk`)
- **enforced before the bytes are ever in hand**, by `loadWebMedia(mediaUrl, mediaMaxBytes)`

Introducing a new `MAX_UPLOAD_BYTES` constant would create a *second, conflicting* ceiling on the same
axis — the classic way two limits drift and a user gets a rejection naming the wrong number. S3 is
rewritten accordingly: **reuse the existing ceiling, add none.** There is no human policy decision
outstanding, which is what clears G2.

### 1.6 The rest of Slice 0's questions

| S0 question | Answer at `bd55137` |
|---|---|
| Which HTTP client? | Plain `fetch`, **already injected** — every upload function takes `fetchFn?: typeof fetch` and defaults to `fetch`. No SDK client, no wrapper that could add `Authorization` behind your back. The DoD tests need no new seam. |
| Token source? | `params.tokenProvider.getAccessToken("https://graph.microsoft.com")` (`MSTeamsAccessTokenProvider`), used for `createUploadSession` and the drive REST calls — **never** for chunk PUTs. |
| Existing "too large" guard? | Only the upstream `loadWebMedia` ceiling (§1.5). No 4MB-specific user message exists on any path. |
| Callers in `minion/src/channels/`? | **None.** `rg 'uploadToOneDrive|uploadToSharePoint|uploadAndShare|uploadToConsentUrl'` over `src/` returns zero hits. The extension's only `src/` coupling is the `minion/plugin-sdk` import at `send.ts:2`. |
| Test surface | 14 `*.test.ts` files under `extensions/msteams/src/`, ~143 `it()`/`test()` cases at the pin (the "148" in `2026-07-08-package-updates-tracking.md` is a stale count from a different commit — **assert no regression, do not hardcode a number**). `file-consent-helpers.test.ts` already covers the 4MB threshold from both sides, including exactly-4MB and 4MB-1. |
| Fleet-wide chunked-upload prior art | None. `rg 'Content-Range'` finds exactly one hit outside this spec's target: `file-consent.ts:118`. Nothing to mirror, and per §6 nothing to generalize. |

## 2. Approach — three vertical slices

```
S1 (threshold routing + createUploadSession + happy-path chunk loop)   ← the proposal's DoD, literally
   └─▶ S2 (the protocol's hard parts: resume, backoff, expiry, cancel, no-leak)
          └─▶ S3 (wire all three call sites, honest errors, docs, ledger)
```

Slice 0 is gone — it was executed and its findings are §1. **S1 alone is a partial implementation, not
a shippable fix.** It makes >4MB uploads *work* on a healthy network, but cancellation and recovery are
S2 and caller-safe behavior is S3. S1–S3 ship together; do not let "resumable upload" imply that
resume, cleanup, and caller behavior are optional.

---

### S1 — Threshold routing, session creation, and the happy-path chunk loop

**Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** a buffer over the simple-upload cap is uploaded through a resumable session in ordered chunks
and the resulting drive item is returned, on **both** drive call sites (§1.1). A unit test with a mock
>4MB buffer asserts the resumable path was taken. Under the cap, behavior is byte-identical to today.

**Do:**

- **New module `extensions/msteams/src/upload-session.ts`** — the transfer protocol, with **no
  knowledge of Teams, no token acquisition, and an injected HTTP client**. That injection is what makes
  the DoD test a unit test instead of a network test, and — per §1.2 — it is what lets the *same* chunk
  loop serve the consent path in S3, which is handed its session rather than creating one. The chunk
  loop takes an *upload URL*; session creation is a separate exported function.

  The extension already injects `fetchFn?: typeof fetch` on every network function (§1.6) — **match
  that signature exactly** rather than inventing a client abstraction.

  ```ts
  /** Graph's simple PUT /content is documented as 4MB. Whether that is 4,000,000 or 4,194,304 is
   *  not worth guessing: take the smaller reading, so we never attempt a simple PUT that Graph
   *  would reject under either. Routing extra files through the session path is harmless.
   *
   *  DELIBERATELY NOT the same number as FILE_CONSENT_THRESHOLD_BYTES (4 * 1024 * 1024, send.ts:41 /
   *  messenger.ts:35). That constant answers "does Teams require a consent card in a 1:1 chat"; this
   *  one answers "will Graph reject a simple PUT". Same magnitude, different questions, different
   *  owners. Do not unify them. */
  export const SIMPLE_UPLOAD_MAX_BYTES = 4_000_000;

  /** Graph requires every chunk except the last to be a multiple of 320 KiB (327,680 B).
   *  5 MiB is exactly 16 x 320 KiB — one constant that satisfies both the alignment rule and
   *  the "5-10 MiB recommended" guidance. VERIFY both numbers against current Graph docs (§4). */
  export const CHUNK_ALIGNMENT_BYTES = 327_680;
  export const CHUNK_BYTES = 5_242_880;
  ```

- **Route on size, in one place, at both drive sites.** `> SIMPLE_UPLOAD_MAX_BYTES` → session path;
  `<=` → the existing simple PUT, unchanged. The routing decision belongs in one helper called by both
  `uploadToOneDrive` (`graph-upload.ts:29`) and `uploadToSharePoint` (`:171`) — they differ only in the
  base URL (`/me/drive/root:` vs `/sites/{siteId}/drive/root:`), so duplicating the branch is how the
  two drift. Do not "simplify" this to always-resumable: a small attachment would grow from one request
  to at least two (create plus one or more chunk PUTs), and the simple path is the common case by a
  wide margin.
- **`createUploadSession`.** `POST` to the drive item's `:/createUploadSession` — same path prefix the
  simple PUT already builds, `/content` swapped for `:/createUploadSession` — with a body carrying
  `item: { "@microsoft.graph.conflictBehavior": ... }`. The existing simple path is **silent** on
  conflict behavior (verified §1.1: neither function sets it), so use **`rename`** — the option that
  cannot destroy a user's file. Note this leaves the two paths nominally different (Graph's default for
  a simple PUT is `replace`); that is a deliberate, documented safety choice, not an oversight. The
  response yields `uploadUrl` and `expirationDateTime`; keep both.
- **⚠️ Send **no** `Authorization` header on the chunk `PUT`s.** The `uploadUrl` is pre-authenticated
  and Microsoft documents that attaching the bearer token can cause the request to fail. This is the
  single most common way this feature is implemented wrong, and it is invisible in review because the
  header is usually added by a shared client wrapper three layers down. Recon confirms there is **no
  such wrapper here** (§1.6) and that `uploadToConsentUrl` (`file-consent.ts:107`) already gets this
  right — so the rule is cheap to honour and the existing function is the reference. Lock it with an
  assertion anyway: a later "let's unify the HTTP clients" refactor would silently reintroduce it.
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
  `webUrl`) — `uploadAndShareSharePoint` (`:390`) and `uploadAndShareOneDrive` (`:125`) immediately
  read `id`/`webUrl`/`name` off it, and `getDriveItemProperties` (`:244`) is called with that `id` to
  build the native file card. **Do not** treat "the loop finished" as success; assert on the terminal
  status and the presence of an item id, because a `202` on the last chunk means the server disagrees
  with your arithmetic.
- **Zero-copy chunking.** The input is a `Buffer` (§1.3): slice with `subarray`, which returns a view.
  Never `Buffer.concat`, never `slice().toString()`. Match the existing body idiom
  (`new Uint8Array(chunkView)`), which is also a view.
- **Red-state first (G3).** Write the >4MB test, run it against today's simple-only code, and paste the
  failure into the PR. The existing ~143-test suite cannot serve as red-state proof: it passes today by
  construction.

**Files:** `extensions/msteams/src/upload-session.ts` (new),
`extensions/msteams/src/upload-session.test.ts` (new),
`extensions/msteams/src/graph-upload.ts` (**both** simple-PUT sites — the shared size branch, the
delegation, and the deleted `:27` TODO), `extensions/msteams/src/graph-upload.test.ts` (new). No file
outside `extensions/msteams/`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/msteams          # or: pnpm --filter <msteams-pkg-from-package.json> test
#   red-state first (G3): the >4MB case shown failing against the old simple-only code.
#   graph-upload.test.ts — run EVERY case against BOTH uploadToOneDrive AND uploadToSharePoint:
#   - upload(<Buffer.alloc(5_000_000)>) → createUploadSession called exactly once
#         AND >=1 PUT to the returned uploadUrl AND zero PUTs to /content
#         ← the proposal's DoD sentence, literally
#   - upload(<Buffer.alloc(1_000_000)>) → one PUT to /content, zero createUploadSession calls
#   - upload(<Buffer.alloc(4_000_001)>) → session path       ← the boundary, from above
#   - upload(<Buffer.alloc(4_000_000)>) → simple path        ← the boundary, from below
#   - the SharePoint session URL is built from /sites/{siteId}/drive/..., the OneDrive one
#         from /me/drive/... — the two must not collapse into one hardcoded base  ← §1.1
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
  only where a session *can* be created — i.e. the drive path. **The consent path cannot re-create**
  (Teams owns that URL, §1.2), so the recreation hook is a caller-supplied optional callback, absent on
  the consent path, and its absence must degrade to a clean terminal error rather than a crash. Guard
  the recreation with its own constant so it cannot silently become a loop. Also reject an
  already-expired session before the first chunk.
- **Cancel on give-up.** `DELETE uploadUrl` on permanent failure or caller abort, best-effort: wrap it
  so a failing cancel never masks the original error. Leaving sessions dangling accumulates partial
  files in the user's drive, which is a mess someone else has to find.
- **Accept an optional `AbortSignal` in the transfer module** and stop/cancel when it fires. Recon found
  no caller-owned signal on either send path (`send.ts`, `messenger.ts`), so **do not invent one** — the
  parameter exists so the module's abort behavior is testable and so a future caller can wire it. Say
  so in the PR rather than leaving a reviewer to wonder why nothing passes it.
- **Type the failure.** The caller must be able to distinguish "too large for the destination",
  "permission denied", "network gave up", and "session expired" — S3 turns these into user-facing text.
  A single `Error('upload failed')` forces S3 to string-match, which is how error handling rots.
- **Never log a token, an `Authorization` value, or the full `uploadUrl`.** The upload URL embeds a
  pre-authenticated token: anyone with the string can write to that item until it expires. Log the item
  name, the byte total, the chunk index, and the URL's *origin* at most. Add a test that asserts the
  logger never receives a string containing the token fixture — this is the kind of leak that passes
  review because the log line looks harmless. **This is not hypothetical on the consent path**:
  `monitor-handler.ts` posts `` `File upload failed: ${String(err)}` `` straight into the Teams chat
  (§1.4). Today that string is safe because the thrown error carries only status and statusText. The
  typed error S2 introduces flows into that same `String(err)` — so its `message` must stay
  URL-free, and a test must assert it.
- **Progress logging at `debug`, one line per chunk maximum, and a single `info` on completion.** A
  100MB file is 20 chunks; that is a fine debug trace and an unacceptable info-level one.

**Files:** `extensions/msteams/src/upload-session.ts` (retry/resume/cancel + the error type),
`extensions/msteams/src/upload-session.test.ts` (the matrix below), and the S1 session-creation module
and test wherever the one allowed session re-creation is coordinated. No file outside the extension.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/msteams
#   - chunk 2 of 3 returns 503, then 202 on retry → upload succeeds; exactly 1 extra PUT
#   - chunk 2 fails; the GET of uploadUrl reports nextExpectedRanges ['10485760-']
#         → the next PUT starts at 10485760, NOT at the locally-tracked offset
#   - 429 with Retry-After: 2 → the wait is >= 2s (fake timers; assert the scheduled delay, not a sleep)
#   - 5 consecutive 503s on one chunk → rejects with a typed 'network' failure after exactly 5 attempts
#   - 403 → rejects immediately, ZERO retries
#   - 404 on a chunk PUT, recreate callback PRESENT → at most ONE recreation, then terminal; never a loop
#   - 404 on a chunk PUT, recreate callback ABSENT (consent path) → typed 'session-expired', no crash
#   - permanent failure → exactly one DELETE to the uploadUrl (cancel)
#   - a DELETE that itself throws → the ORIGINAL error still surfaces, not the cancel error
#   - success → ZERO DELETE calls
#   - abort mid-transfer → no further PUTs are issued, session cancelled
#   - the injected logger receives no string containing the uploadUrl token fixture   ← no-leak
#   - String(<every typed error>) contains no 'http' substring from the uploadUrl     ← chat-safe (§1.4)
#   - a 20-chunk upload emits <= 20 debug lines and exactly 1 info line
pnpm tsgo && pnpm check
rg -n 'uploadUrl' extensions/msteams/src/upload-session.ts | rg -n 'log|console'   # → ZERO
```

---

### S3 — Wire all three call sites, tell the user the truth, write it down

**Tags:** `logic`, `test`, `docs` · **Estimate:** 4–6 h

**Goal:** the reported symptom — "larger bot attachments error" — is gone at every boundary where it
hurt. A file that is *genuinely* too big fails with a sentence a human can act on. The extension's docs
stop promising a 4MB world, and every remaining open end is in the ledger.

**Do:**

- **Wire the three call sites recon found (§1.1, §1.2), and no others:**
  1. `send.ts:214` / `messenger.ts:326` → `uploadAndShareSharePoint` — **the primary path.**
  2. `send.ts:273` / `messenger.ts:352` → `uploadAndShareOneDrive` — the no-site fallback.
  3. `monitor-handler.ts:72` → `uploadToConsentUrl` (`file-consent.ts:107`) — replace the single
     full-file PUT with the S1/S2 chunk loop, **passing the Teams-supplied `uploadUrl` and no
     recreation callback**. This is a strict upgrade: same wire protocol for a one-chunk file, plus
     retry and resume above one chunk.
- **Test the callers, not just the module.** S1/S2 prove the transfer; this slice proves the
  consequence. Drive each path with: a 1MB file → simple path, attachment delivered · a 12MB file →
  session path, attachment delivered · a 12MB file whose transfer permanently fails → the send reports
  a typed error and does **not** post a card pointing at a nonexistent file. That last case is the one
  an implementer skips, and it is the one that produces a broken link in a real chat. For the
  SharePoint path specifically, assert that `getDriveItemProperties` is called with the id returned by
  the *session* terminal response (§1.1) — a native file card built from a stale or missing id is a
  broken card.
- **Do not edit anything under `minion/src/`.** Recon found zero coupling to change (§1.6). If the fix
  seems to need a `src/` edit, that is a **finding, not a chore** (§5) — say so in the PR. Test-only
  edits under `src/` are fine; production edits there are the line.
- **Reuse the existing ceiling; add none.** Recon (§1.5) found `MSTEAMS_MAX_MEDIA_BYTES = 100 * 1024 *
  1024` (`send.ts:47`, `messenger.ts:29`), already overridable via `channels.msteams.mediaMaxMb` /
  `agents.defaults.mediaMaxMb` and already enforced ahead of the transfer by `loadWebMedia`. That is
  the gateway's per-upload heap policy and it is **already a deliberate human choice recorded in
  code**. Do **not** introduce a `MAX_UPLOAD_BYTES` constant — a second ceiling on the same axis is how
  a user gets a rejection naming the wrong number. Two obligations instead:
  - Confirm the existing ceiling is **≤** the destination's documented per-file limit (§4). If it is
    not, that is a finding: report it, do not silently lower a configured value.
  - The rejection `loadWebMedia` already produces must name the effective limit. If it does not, fixing
    that message is in scope **only** if the fix is inside `extensions/msteams/`; if the message lives
    in the plugin-sdk, it is a finding plus a ledger entry, not a `src/` edit.
- **Retire, don't orphan, any "4MB" claim.** Recon found no user-facing 4MB guard to retire (§1.4), but
  `file-consent.ts:2` and `:28` and `file-consent-helpers.ts:5` carry comments describing a 4MB world.
  Those comments describe the **consent-card threshold**, which this spec does not change — leave them,
  but verify each still reads true after the change rather than assuming it. A dead comment that still
  says "files over 4MB are not supported" is worse after this slice than before it.
- **Docs.** Update the extension's README (or, if there is none, the `upload-session.ts` file header —
  do not create a docs surface this spec did not scope) with one short section: the three call sites and
  the size that routes between simple and session, the chunk size and why it is a multiple of 320 KiB,
  the fact that the upload URL is pre-authenticated and must never carry a bearer token, the
  retry/expiry behavior, and where the effective upload ceiling actually comes from (§1.5) — that last
  one is the fact a future reader will most need and least expect.
- **Ledger sweep before closing.** Per AGENTS.md, every remaining open end gets both a
  `TODO(handoff): <what, why, pointer>` at the site and a `proposals/` entry. Recon already names three
  likely candidates: streaming instead of buffering (§1.3 — note it would change `loadWebMedia` in the
  plugin-sdk, not this extension); the download side (excluded by the proposal); and
  `pending-uploads.ts` holding whole buffers in an in-memory map across the consent round-trip, which
  is the same heap concern one layer up. If there are none, write "no open items" in the PR explicitly
  rather than leaving it to inference.

**Files:** `extensions/msteams/src/graph-upload.ts` (typed error mapping),
`extensions/msteams/src/file-consent.ts` (`uploadToConsentUrl` delegates to the chunk loop),
`extensions/msteams/src/monitor-handler.ts` (only if the typed error changes what it posts),
`extensions/msteams/src/send.ts` and `messenger.ts` (typed error handling only — **not** a new
ceiling), their `*.test.ts`, `extensions/msteams/README.md` or the `upload-session.ts` header, plus any
`TODO(handoff):` lines and `proposals/*.md` the sweep produces in **minion-meta** (**never**
`proposals/index.json` — the generator owns it).

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/msteams   # the ~143-case msteams baseline must not regress (count is not the gate)
pnpm tsgo && pnpm check
#   the three caller cases above on EACH of the three call sites, plus:
#   - a file above the effective mediaMax ceiling → rejected by loadWebMedia BEFORE any
#         createUploadSession call, and the message names the effective limit
#   - consent path, 12MB → chunked PUTs to the Teams-supplied uploadUrl, zero createUploadSession calls
git diff --name-only <base>...HEAD | rg -v '^extensions/msteams/'  # → EMPTY in the minion repo
git diff --name-only <base>...HEAD | rg '\.svelte$'   && echo "FAIL: UI out of scope"           && exit 1
git diff --name-only <base>...HEAD | rg 'index\.json' && echo "FAIL: generators own index.json" && exit 1
rg -n 'MAX_UPLOAD_BYTES' extensions/msteams  # → ZERO: the ceiling is mediaMaxMb, not a new constant
rg -n '4 ?MB' extensions/msteams --glob '!*.test.ts'  # → only the consent-card threshold and the
                                                      #   simple-PUT routing threshold, never a
                                                      #   ceiling on what can be sent
```

---

## 3. The routing table (one place, so reviewers can check it at a glance)

Read this as the **drive paths** (SharePoint and OneDrive). The consent path enters at the same chunk
loop but is handed its URL, so its first two rows collapse into "one chunk, one PUT" — identical wire
behavior to today.

| Payload size | Path | Why |
|---|---|---|
| `0` bytes | Simple PUT (unchanged) | Empty-file semantics are Graph's problem, not this spec's; do not add a special case. |
| `1 B … 4,000,000 B` | Simple `PUT /content` | Today's behavior, byte-identical. One request. |
| `4,000,001 B … ceiling` | `createUploadSession` + chunked PUT | **The fix.** Chunks of 5 MiB (16 × 320 KiB), sequential, last chunk short. |
| `> ceiling` | Rejected before any network call | Already the behavior: `loadWebMedia(url, mediaMaxBytes)` refuses before the buffer exists (§1.5). No new constant. |

**"Ceiling" = the existing `resolveChannelMediaMaxBytes` result**, i.e.
`cfg.channels.msteams.mediaMaxMb` → `cfg.agents.defaults.mediaMaxMb` → `MSTEAMS_MAX_MEDIA_BYTES`
(100 MiB, `send.ts:47` / `messenger.ts:29`). This is a pre-existing, deliberate, configurable product
policy; **the pass-2 review's "flagged for human" item is satisfied by it** and no new byte value needs
choosing (§1.5). The only obligation is §4's check that 100 MiB is at or under the destination's
documented per-file limit.

The `4,000,000` boundary is the **conservative** reading of Graph's documented "4 MB" simple-upload cap
(the other reading is `4,194,304`). Erring low routes a handful of files through the session path
unnecessarily; erring high resends the reported bug for files between the two numbers. Test both sides
of the boundary (S1 DoD) so nobody "rounds it to 4 MiB" later without reading this row — and note that
`FILE_CONSENT_THRESHOLD_BYTES` *is* `4 * 1024 * 1024`, deliberately, for a different question (S1).

## 4. Numbers that must be verified before shipping

Rows marked **verified (code)** were read from `NikolasP98/minion@bd55137` during §1 and need no
further check. The rest are stated from knowledge of the Microsoft Graph upload-session API, **not**
from a document read during this spec, and Graph's limits have moved before. The implementer must check
each unverified row against the current Graph documentation for the tenant's cloud and record the check
in the PR — one line is enough. The *design* does not change under any plausible revision; only the
constants do.

| Constant | Value used here | Confidence | Note |
|---|---|---|---|
| Simple `PUT /content` cap | 4 MB | High that it is "4 MB"; **low** on which 4 MB | §3 resolves the ambiguity conservatively — this is why the constant is 4,000,000. |
| Chunk alignment | multiple of 320 KiB (327,680 B) | High | Applies to every chunk **except** the last. |
| Default chunk size | 5 MiB (5,242,880 B) | High that this is within guidance | Exactly 16 × 320 KiB, so it satisfies alignment by construction. |
| Max bytes per single chunk request | ~60 MiB | Medium | **Now load-bearing:** today's consent path sends the whole file in one PUT (§1.2), so if this ceiling is real, files between it and the 100 MiB gateway ceiling fail *today* on the consent path. Verify it, and record whether that silent band existed — it is a second bug this fix closes. |
| Effective upload ceiling | 100 MiB, configurable | **verified (code)** | `MSTEAMS_MAX_MEDIA_BYTES`, `send.ts:47` / `messenger.ts:29`; override via `mediaMaxMb`. Confirm it is ≤ the destination per-file limit; do not lower a configured value silently. |
| Intermediate chunk response | `202` + `nextExpectedRanges` | High | Final chunk answers `200`/`201` with the drive item. |
| Chunk PUTs are pre-authenticated | no `Authorization` header | **verified (code)** + High | Microsoft documents it; `uploadToConsentUrl` (`file-consent.ts:107-121`) already omits the header. S1 locks it with a test. |
| Session lifetime | ~hours, per `expirationDateTime` | Medium | Read the field rather than hardcoding a duration. |
| Input type is `Buffer` | yes | **verified (code)** | Every upload fn takes `buffer: Buffer` (§1.3); `subarray` chunking is zero-copy. |

If any check comes back different, change the constant and its comment — and say so in the PR. Do not
change a constant without changing the comment that justifies it; that pairing is the only thing
keeping the next reader from re-deriving all of this.

## 5. Cross-repo impact

Checked against the AGENTS.md "Cross-Project Impact Zones" table. The relevant row is **"Channel
extension (new/modify) → `minion/extensions/<channel>/` + `minion/src/channels/`"** — and recon
(§1.6) found the second half **empty for this change**, which is the strongest form of the containment
claim pass 2 could only assert.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/extensions/msteams/` | **The fix.** All production code changes live here | S1–S3 |
| `minion/src/channels/` | **None — verified.** Zero references to the msteams upload functions anywhere under `src/` | §1.6 grep. **Editing any `src/` production file is a finding**, enforced by S3's `git diff` check |
| `minion/plugin-sdk` (`loadWebMedia`, `resolveChannelMediaMaxBytes`) | **Consumed, not changed.** The upload ceiling and the buffer both originate here | §1.5. Needing to change either is a finding (S3), and streaming (§1.3) would land here, not in the extension |
| msteams consent flow (`file-consent.ts`, `monitor-handler.ts`, `pending-uploads.ts`) | **In scope, S3.** Gains chunking/retry it never had; wire behavior for a sub-chunk file is unchanged | §1.2. Its error string is posted into a user's chat — S2's no-leak test covers it (§1.4) |
| `@microsoft/agents-hosting` (vendored SDK, 1.6.1 per `specs/2026-07-08-package-updates-tracking.md:153`) | **None.** No version bump, no new dependency. The upload code never touches it — every network call is plain injected `fetch` (§1.6) | S1's no-auth-header constraint + its test. If a bump *seems* required, that is a finding |
| `@minion-stack/shared` (frames, events, WS protocol) | **None.** No frame type, event, or protocol field is added or changed | §6 excludes it; nothing here crosses the gateway boundary |
| `minion_hub`, `minion_site`, `paperclip-minion` | **None.** No protocol change ⇒ no consumer change | AGENTS.md's "Gateway protocol" row does not apply |
| Other channel extensions (slack, discord, telegram, whatsapp, …) | **None from this diff.** Each has its own upload ceiling and its own API; a shared abstraction is not justified by one instance | §1.6 found no other `Content-Range` user in the fleet. §6 excludes the sweep |
| Gateway process memory | ⚠️ **Real, and pre-existing.** A 100MB attachment is 100MB of heap — but `loadWebMedia` already allocates it before any upload is attempted, so **this fix adds no new allocation**; `subarray` chunking is a view (§1.3) | The ceiling that bounds it already exists and is configurable (§1.5). Streaming is a ledger item, not a silent omission |
| Microsoft Graph / SharePoint (external) | **More requests per large file**: 1 create + ⌈size/5 MiB⌉ PUTs + status/retry/cancel requests when needed, versus 1 failed request today. Files land in the destination drive and consume tenant storage | Sequential chunks (no fan-out), bounded retries with `Retry-After` honoured, `429` respected — S2. This is the intended cost of the feature |
| `Minion Docs/`, `minion_plugins`, `pixel-agents` | **None** | No dependency on this extension |

### Assumptions A1–A4 — all resolved by recon

Pass 2 carried four ⚠️ risks because the target repo was not readable. §1 resolves all four; they are
kept here as a decision record rather than as open risk.

| Was | Now |
|---|---|
| **A1** — the proposal's `createUploadSession` may not exist on the path that matters (consent card vs drive) | **Resolved: both paths exist.** The consent path is already implemented and needs the chunk loop but not session creation; the drive path needs both. The pass-2 module split (transfer takes a URL; creation is separate) made this a wiring change rather than a rewrite — §1.2 |
| **A2** — is the input a Buffer, a stream, or a path? | **Resolved: `Buffer`, materialized upstream by `loadWebMedia`.** Chunking is zero-copy; the heap cost is pre-existing and not introduced here — §1.3 |
| **A3** — "larger bot attachments error" is not a specification of the failure | **Resolved:** a thrown `Error("… upload failed: {status} …")` on the drive paths with no friendly message to retire, and a chat-visible `File upload failed: …` on the consent path that must stay URL-free — §1.4 |
| **A4** — the target repo is not in this workspace | **Resolved:** read at `NikolasP98/minion@bd55137`. Re-verify the pin before S1; a moved fact is a G0 reconciliation finding, not a licence to re-scope — §1 |

The one genuinely *new* risk recon surfaced, replacing them: **the proposal pointed at the wrong
function.** `uploadToSharePoint` is the primary path, has the same defect, and has no TODO. A fix
scoped to the literal `:27` TODO would close the proposal with the main bug still live (§1.1). S1's DoD
requires every case to run against both functions for exactly this reason.

## 6. Out of scope (explicit)

- **The download side** — the proposal's own exclusion. No resumable *fetch*, no range requests on read.
- **Non-OneDrive / non-drive storage** — the proposal's own exclusion. No blob store, no CDN, no
  gateway-hosted file serving.
- **Streaming instead of buffering** (§1.3). Bounded by the existing ceiling here; filed as a ledger
  item in S3. It would have to change `loadWebMedia` in the plugin-sdk and every channel that calls it —
  its own proposal, its own callers.
- **A new config or env surface** for chunk size, retry counts, or the size ceiling. Named constants
  with comments; the ceiling is the *existing* `mediaMaxMb` (§1.5). If someone genuinely needs to tune
  chunk size in production, that demand is evidence for a follow-up, not a reason to add six env vars.
- **Changing the consent-card threshold** (`FILE_CONSENT_THRESHOLD_BYTES`, 4 MiB) or when a consent card
  is shown. S3 upgrades how the accepted file is *transferred*, not when the card appears.
- **A shared/fleet-wide chunked-upload utility.** One extension is not a pattern; a second channel with
  the same need is the trigger to extract one.
- **Fixing the same missing-resumable-path gap in other channel extensions.** File a proposal; do not
  absorb a fleet sweep into this diff.
- **Bumping `@microsoft/agents-hosting`** or any dependency. Package updates are tracked in
  `specs/2026-07-08-package-updates-tracking.md`; needing a bump here is a finding.
- **Changing the Teams attachment card / consent-card UX**, message formatting, or how the file is
  announced in chat. This spec moves bytes; it does not redesign the hand-off.
- **Any change to `@minion-stack/shared`, the WS frame protocol, or any `minion/src/` production
  code.** No consumer coordination. If the fix seems to need one, that is a spec bug — raise it (§5).
- **Persisting upload sessions across gateway restarts.** Resume within a process is S2; resume across
  processes needs durable state and is a different feature entirely. (`pending-uploads.ts` is likewise
  in-memory today — noted as a ledger candidate in S3, not fixed here.)
- **Any UI.** Zero `.svelte` files ⇒ the `ui` tag, the ui-design-governance skill, `lint:design`, and
  `lint:tokens` do **not** apply, per `2026-08-17-sdlc-phase-gates-scoring-spec` §4b.
- **Editing `specs/index.json` or `proposals/index.json`.** Generators own them.

## 7. End-to-end verification

Run with S1–S3 merged on `minion`'s `DEV` branch, against a real Microsoft 365 tenant with the Teams
bot installed (or a dev tenant — the point is a live Graph endpoint, since S1/S2's unit tests already
cover the protocol arithmetic). **Both a group chat/channel with `sharePointSiteId` configured and a
1:1 chat are required** — they exercise different code (§1.1, §1.2), and testing only one is how the
primary path ships broken.

```bash
cd minion

# 1. Gates (logic/test/docs-tagged: no design or token lint — §6)
pnpm install && pnpm build
pnpm vitest run extensions/msteams && pnpm tsgo && pnpm check   # msteams baseline + new cases, green
git diff --name-only <base>...HEAD          # → extensions/msteams/** only in the minion repo

# 2. Live — the reported symptom, gone, on the path that actually matters
#    Configure the msteams channel WITH a SharePoint site id, start the gateway (pnpm gateway:watch):
#    a) Channel/group: send a ~1MB non-image file
#         → delivered. Debug log shows the SIMPLE path, exactly one PUT.   ← no regression
#    b) Channel/group: send a ~12MB file
#         → delivered as a native file card, opens correctly, byte size matches the source exactly.
#         → debug log shows createUploadSession + 3 chunk PUTs; the LAST is short.  ← the bug, fixed
#         → the file appears intact in the SharePoint drive (open it, don't just trust the card)
#    c) Channel/group: send a ~4.1MB file
#         → delivered via the SESSION path.                                 ← the boundary, live
#    d) Unconfigure sharePointSiteId; repeat (b)
#         → delivered via the OneDrive fallback + markdown link.            ← the proposal's :27 site
#    e) 1:1 chat: send a ~12MB file, accept the consent card
#         → delivered; debug log shows chunked PUTs to the TEAMS-supplied url,
#           and ZERO createUploadSession calls.                             ← §1.2, live
#    f) Mid-transfer of a large file, drop the network for a few seconds, restore it
#         → the transfer resumes and completes; the log shows a nextExpectedRanges GET
#           and a restart at that offset, not at byte zero.                 ← S2, proven live
#    g) Revoke or corrupt the upload URL mid-transfer (or wait past expirationDateTime)
#         → the send fails with a typed, human-readable error; NO broken attachment card is posted;
#           the log shows one best-effort DELETE attempt. If the URL is already invalid, cleanup is
#           service-owned; no completed or user-visible partial item remains in the drive.
#         → on the 1:1 path, the message posted into the chat contains NO url.     ← §1.4
#    h) Attempt a file above the effective mediaMax ceiling
#         → rejected before any network call, with a message naming the effective limit.
#    i) grep the run's logs for the upload URL's token and for 'Bearer'
#         → ZERO hits.                                                      ← no-leak, proven live

# 3. Tenant hygiene
#    After the runs above, list the destination drive: exactly the files sent in (a)-(e),
#    no zero-byte or partial items left by (f)/(g).
```

**Ship gate:** §7 steps 1–3 green on **both** a SharePoint-configured conversation and a 1:1 chat; the
proposal's DoD checked clause by clause (`createUploadSession` + chunked PUT path taken for >4MB —
S1's `graph-upload.test.ts` mock-buffer case against *both* drive functions, and step 2b/2d live); the
S1 red-state failure pasted into the PR, proving the old code failed the way the proposal reported;
§4's unverified constants each checked and recorded as one line, including any that came back
different — in particular the per-request fragment ceiling, since it determines whether the consent
path had a second silent failure band (§4). S1–S3 must ship together; the proposal does **not** get
closed on a happy path, and it does **not** get closed with `uploadToSharePoint` still on the simple
PUT.
