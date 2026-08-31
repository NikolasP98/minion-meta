---
id: 2026-08-17-gw-msteams-large-upload-spec
title: "MS Teams attachments — route >4MB through a Graph resumable upload session (chunked PUT with resume, expiry and cancel)"
stage: spec
status: draft
pass: 12
created: 2026-08-17
updated: 2026-08-31
proposal: 2026-08-17-gw-msteams-large-upload
verdict: changes_requested
repos: [minion]
tags: [logic, test, security]
type: fix
---

> **Pass 12 disposition: STILL REVIEW, not approved.** Pass 12 changes no disposition. It adds the
> missing app-only permission gate for `createUploadSession`: administrator-consented
> `Sites.ReadWrite.All` must be verified on the real bot registration and both exact helper endpoints
> must pass a create-then-cancel live preflight before S1 can be approved. It also makes the runtime
> configuration seam executable: each send compiles its helper policy from the current effective
> `mediaMaxMb` ceiling and the recorded verified-simple maximum *before* `loadWebMedia`; a later ceiling
> increase therefore selects `session-above` or is rejected before allocation, never leaks past a
> stale `simple-only` record. **Pass 11 disposition: STILL REVIEW, not approved.** Pass 11 changes no
> disposition. It makes every
> caller/ship-gate assertion conditional on the selected per-helper policy, makes `simple-only` legal
> only when the effective runtime ceiling is within the repeatably verified simple range, adds an
> above-250 MB configuration case, and forbids deriving a threshold from non-monotonic or
> non-reproducible probes. **Pass 10 disposition: STILL REVIEW, not approved.** Pass 10 changes no
> disposition. It removes the
> last contradictory 4 MB threshold rule, represents mixed per-helper results explicitly, treats
> Graph `416` as a status-reconciliation response, and makes both typed-error and chat-message tests
> assert absence of the complete upload credential and its unique token. **Pass 9 disposition: STILL
> REVIEW, not approved.** Pass 9 changes no disposition. It closes three
> contract defects found in cross-provider review: S1 now represents OneDrive and SharePoint
> thresholds independently and tests deliberately unequal values; the heap gate requires option 1 to
> ship with every production override reader bounded; and red-state evidence separates routing delta
> from size-specific failure reproduction. **Pass 8 disposition: STILL REVIEW, not approved.** Pass 8
> changes no disposition. It corrects the
> final boundary contradiction found after the pass-7 revision: the derived threshold is the largest
> passing probe, so a payload exactly equal to it must remain on the SIMPLE path under the specified
> `size > threshold` predicate, while `threshold + 1` is the first SESSION-path fixture. The pass
> counter and generated index now identify this eighth review/revise cycle. Pass 7 closed the two
> defects the pass-6 review found surviving in *how* the artifacts state their own contracts.
> (1) §3's explanation under the routing table was still the last active passage calling `4,000,000`
> "Graph's documented 4 MB simple-upload cap" and warning that erring high "resends the reported bug",
> which contradicted §1.1a, §4 and §7 step 0c in the same file and would let a later pass keep the
> hard-coded route by citing it. That paragraph now says what is true: `4,000,000` comes only from the
> stale in-repo TODO, is a placeholder, and is either **deleted** (step 0 shows no size failure) or
> **replaced by the measured per-helper threshold** (step 0 shows one). The routing-table boundary rows,
> the §2 red-state convention, S1's goal/red-state bullet and S1's DoD byte sizes carry the same
> conditional, and S1 opens with a slice-level banner saying so once.
> (2) The follow-up local-media proposal
> ([`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md))
> required a bounded read *through the existing `readFile` seam*, but that seam returns an
> already-materialized `Buffer` (`src/web/media.ts:25-34`, awaited at `:309`) and its production callers
> are real sandboxed/outbound paths whose bridge `cat`s the whole file over `docker exec`
> (`src/agents/sandbox/fs-bridge.ts:28-53`, `:77-88`) — so an implementation could satisfy every listed
> test and leave the OOM path fully open. Its DoD now forces an explicit choice — widen the injected-reader
> contract and migrate the callers, or formally exclude override-supplied inputs and keep this spec's
> heap-policy gate open for them — plus a test on an *oversized* override-backed source that proves the
> producer stopped. Pass 6's substance is otherwise unchanged: it had qualified the ">4MB fails" premise
> in the "0. Product" narrative, §1.1, §1.2 and S1's code comment, removed the `fs.stat`-then-`readFile`
> DoD from the local-media proposal, and reconciled the two S3/§3 passages that called the reused byte
> ceiling an accepted "per-upload heap policy" while §1.5 and the ship gate called that gate open (only
> the byte-*value* half is settled). Pass 5's substance is likewise unchanged: Pass 3's approval rested
> on the premise that
> Graph's simple `PUT .../content` endpoint caps uploads at 4MB. Microsoft's current v1.0 documentation
> for the exact endpoint shapes this spec targets — [Upload or replace the contents of a
> driveItem](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0),
> fetched 2026-08-29, page `updated_at: 2026-08-11` — states: *"This method only supports files up to
> 250 MB in size."* No live `PUT` was ever run against a tenant to reproduce the claimed >4MB failure:
> PR #253's green `verify` check validates only the meta-repo spec index, `claude-review` was skipped,
> and `thermonuclear-review` was skipped. At a 250 MB simple-upload ceiling and the gateway's own
> **100 MiB** default accepted payload (`send.ts:47`, `messenger.ts:29`), **the drive-path routing
> change in S1 may not be needed at all** — every default-accepted file could already go through the
> simple `PUT`. §1.1a records this correction in full; two independently-evidenced problems survive it
> and are preserved (§1.3a corrects false heap/copy claims used to clear the pass-2 blocker; §4's
> consent-URL fragment-ceiling concern is untouched). **Before this spec can move to `approved`**, run a
> **controlled** live simple `PUT` matrix (§7 step 0) on a real tenant. Controlled means: for **each**
> of `uploadToOneDrive` and `uploadToSharePoint`, a known-good **~1 MiB non-image control** succeeds
> first, and only then an ascending, repeated matrix including 4.1 MiB, 12 MiB, ~99 MiB, the effective
> runtime ceiling, and (when accepted) Graph's documented 250,000,000-byte limit runs through the
> *same* tenant, identity, destination folder and channel configuration — status and body recorded for
> every attempt. Results must be monotonic and reproducible; pass-after-fail or non-reproducing failure
> is inconclusive and cannot approve S1. The control is the discriminator, not a formality: without it,
> a 401/403 from the app-only
> identity, a missing `MinionShared` parent, a wrong site id or any other path/configuration fault makes
> all three large probes fail while proving nothing whatsoever about a byte ceiling. **A failing control
> is an auth/path/configuration finding, is not evidence about size, and may not be used to approve S1
> or to derive any threshold.** The two helpers also cannot both be reached from one send configuration
> — `send.ts:204-222` takes SharePoint whenever `sharePointSiteId` is set and reaches OneDrive only when
> it is absent (`:267-278`) — so the matrix runs twice, or the helpers are invoked directly (§7 step 0).
> If every control passes and the effective accepted ceiling itself is within the verified simple
> range, the original ">4 MB fails" premise is disproved — reject/archive it and, if the surviving
> findings are valuable, spin them into a
> narrower proposal (resumability above Microsoft's own >10 MiB recommendation, and chunking the Teams
> consent-URL upload below its <60 MiB per-request fragment limit — §4). If runtime contradicts the
> docs — controls green on both helpers, larger payloads rejected with a size-specific response — record
> the tenant/cloud/identity-specific failure and derive the threshold from that evidence instead
> of from documentation alone. **No product code has been implemented against this spec; do not start
> S1 until a corrected pass records an explicit `approved` disposition.**

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
§4b — slices are tagged `logic` / `test` / `security`. The `security` tag is required because the
session path needs an app-only Graph permission that the simple path does not (§2 S1). The proposal's
`edge-case` tag has no slot in the §4b enum (`ui logic data infra docs test security perf deps`); it is
carried here as `logic` + `test`, while recon adds `security`. Red-state TDD (G3) is mandatory for each helper whose measured policy is
`session-above`: the routing-delta fixture at `threshold + 1` and the failure-reproduction fixture at
the smallest observed failing probe are written and shown failing against today's simple-PUT-only code
before the fix lands — only after step 0 records both values (§1.1a). A `simple-only` helper instead
gets an all-probes-simple regression. **No UI governance applies** — zero
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

**What the user actually loses today, if the drive-path failure is real.** The assistant can compose a
report, a recording, an export — and then cannot hand it over in a group chat or a channel. Recon (§1)
narrows the *code-level* claim but does not prove it: the TODO quoted in the proposal sits only on
`uploadToOneDrive`, not on `uploadToSharePoint`, even though both call the identical simple-`PUT` shape
(§1.1). **Whether either function actually fails below Microsoft's currently-documented 250 MB ceiling
is unproven** (§1.1a) — no live `PUT` has ever been run against a tenant to test it, and current primary
documentation says it should not fail there at all. Do not read "has the identical 4MB cap" or "4.1MB
and 400MB fail identically" as this spec's settled premise: they are the disproved-by-documentation,
not-yet-tested claim, held open pending the controlled check in §7 step 0. What recon does establish
without qualification: *if* a failure occurs on either drive path today, it surfaces as a thrown
`Error`, not as a graceful "too large" message (§1.4) — and the proposal names the wrong function as
primary, since SharePoint, not OneDrive, is the path most tenants actually take (§1.1) and carries no
TODO at all.

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
simple `PUT` to `/sites/{siteId}/drive/root:{path}:/content` — the identical call shape, and, per
§1.1a, an **unproven** ceiling — and **carries no TODO at all**. Both wrap into `uploadAndShareOneDrive`
(`:125`) and `uploadAndShareSharePoint` (`:390`).

**This is the single most important correction in this pass.** Reading the call sites
(`send.ts:204-273`, `messenger.ts:322-352`), SharePoint is the *preferred* path and OneDrive is the
fallback taken only when no `sharePointSiteId` is configured — and `uploadToOneDrive`'s own header
comment calls `/me/drive` "personal scope - now deprecated for bot use". A fix scoped to the TODO
alone would leave the primary path broken while closing the proposal. **Both functions are in scope.**

### 1.1a Pass-4 correction — the ">4MB fails" premise is disproved by current primary documentation, and was never proved by runtime

The code-comment TODO quoted above (§1.1, `graph-upload.ts:26-27`) is a stale in-repo claim, not
independent evidence. Both `uploadToOneDrive` and `uploadToSharePoint` call the exact path forms
Microsoft documents in [Upload or replace the contents of a
driveItem](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0)
(v1.0, fetched 2026-08-29, `updated_at: 2026-08-11`): `PUT .../drive/root:{path}:/content` for
`/me/drive` and `/sites/{siteId}/drive`. That page states plainly: *"This method only supports files up
to 250 MB in size."* No 4 MB ceiling is documented anywhere on that page for this call shape.

No live reproduction exists. This spec's own DoD (§7) requires a live 12 MB send to prove the fix, but
no pass has run the *inverse* check — a live send of a 4.1 MB (or larger) file through **today's**
unmodified simple `PUT`, to see whether it actually fails. §7 step 0 specifies that check as a
*controlled* one: a known-good ~1 MiB non-image control per helper, under the same tenant, identity,
destination and configuration as its probes, so that an identity/permission/path fault cannot be read
as a byte ceiling. An uncontrolled matrix cannot resolve this finding. PR #253 (this spec's own tracking PR) is not
that evidence: its `verify` check validates the meta-repo spec/proposal index only, `claude-review` was
skipped due to workflow validation, and `thermonuclear-review` was skipped outright.

**Consequence for scope.** At a 250 MB simple-upload ceiling and the gateway's own 100 MiB default
accepted payload (`send.ts:47`, `messenger.ts:29`, §1.5), every file the gateway will hand to this
extension by default already fits under the simple `PUT`'s documented limit. If that holds under a live
check, **the S1 routing split (simple vs. session) has no defect to fix on the drive paths** — the
routing table in §3 and the boundary tests in S1's DoD would need to be dropped or re-scoped, not just
have a constant changed, contradicting the §4 closing claim that "the design does not change... only
the constants do." This is exactly why the disposition is `changes_requested`, not `approved`: the
scope of S1 itself is unresolved pending a live check, and this spec must not authorize implementation
while that is true.

**What is not in question.** §1.2's consent-path finding is independent of this correction: Teams hands
the bot a pre-authenticated one-shot URL and the current code sends the whole buffer in a single `PUT`
with no resume — that has nothing to do with the 4 MB/250 MB drive-endpoint dispute, and §4's ~60 MiB
Graph per-request fragment ceiling (if verified) would still make that a real, narrower bug worth its
own scoped fix.

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

So the answer to A1 is "both" — but per §1.1a, whether item 1 below actually applies is **conditional
on the live check in §7 step 0**, not decided by this recon pass:

1. **If** step 0 confirms a real size-dependent failure on the drive paths, the proposal's DoD would
   apply **for the drive path** (§1.1) — `createUploadSession` would be the right API for
   SharePoint/OneDrive, and it is absent from both today. **If** step 0 instead confirms Microsoft's
   documented 250 MB ceiling with no drive-path failure, this item does not apply — see §1.1a's
   consequence-for-scope, which is this spec's current disposition.
2. The consent path's need is independent of that outcome: it needs **no session creation** (Teams
   hands it the URL) but does need the **same chunk loop**, because a single full-file `PUT` has no
   resume, no retry, no `Retry-After`, and is subject to Graph's per-request fragment ceiling (§4). It
   is the only >4MB path this spec has evidence is exercised today, on a healthy network, in one shot —
   that is a claim about what code exists and runs, not proof that the drive paths fail below 250 MB.
3. `uploadToConsentUrl` is the **house pattern** for the no-`Authorization` rule that S1 must preserve —
   the constraint is already honoured in this codebase, and S1's test locks it against regression.

The pass-2 design already anticipated this: the transfer module takes an *upload URL* and session
creation is a separate function. That split is now load-bearing rather than defensive, and it is why
this discovery costs a wiring change and not a rewrite.

### 1.3 ⚠️ A2 resolved — the input is a `Buffer`, already fully materialized upstream

Every upload function takes `buffer: Buffer`. §6 correctly keeps streaming out of scope regardless of
which of the two claims below holds, because either way the buffer already exists in memory before this
extension sees it. But two specific pass-2/pass-3 claims about the mechanics were wrong and are
corrected here, because they were used as evidence to clear the pass-2 heap-policy blocker.

#### 1.3a Pass-4 correction — two false claims

1. **"`loadWebMedia` enforces the ceiling before allocation" is false for local files.** In
   `src/web/media.ts`, remote URLs *are* bounded during the read — `fetchRemoteMedia` is called with a
   `maxBytes`/`fetchCap` and enforces it while streaming the response. Local paths are not: the local
   branch calls `data = await fs.readFile(mediaUrl)` (`media.ts:309`), reading the **entire file into
   memory unconditionally**, and only afterward does `clampAndFinalize` reject it for being over `cap`
   (the non-image length check is `media.ts:265-267`, the call site `:319-324`). An oversized local file
   is therefore allocated in full before it is rejected, and concurrent local sends can exceed the
   claimed heap bound in a way the claimed pre-allocation check would have prevented. This is the
   opposite of what the pass-3 spec and its review sidecar (`...review.md:29-36`) asserted to close the
   pass-2 human gate on the acceptable per-upload heap bound.
2. **"`new Uint8Array(params.buffer)` is a view, not a copy" is false.** `params.buffer` is a `Buffer`
   (a `Uint8Array` subclass). `new Uint8Array(typedArray)` invokes the TypedArray-from-TypedArray
   constructor, which **allocates a new backing `ArrayBuffer` and copies the elements** — it does not
   share storage with the source. (`Buffer.subarray()`/`Uint8Array.prototype.subarray()` *does* share
   storage; that is a different call and was not what was being described.) A focused Node check
   confirms distinct backing stores and no mutation propagation between the two. Today's
   `new Uint8Array(params.buffer)` at `graph-upload.ts:47` and `:191` therefore already allocates one
   extra full-size copy per drive upload; the S1 chunk-body idiom this spec specified — see the
   correction below — would have repeated that mistake per chunk instead of fixing it.

**Corrected guidance for any future S1:** pass the `Buffer` (or a `Buffer.subarray()`/
`Uint8Array.prototype.subarray()` view of it) directly as the `fetch` body instead of wrapping it in
`new Uint8Array(...)`. That is genuinely zero-copy. Add a focused aliasing/allocation regression test
(mutate the source after slicing; assert the "view" did or did not change) rather than asserting
zero-copy behavior from a comment. The local-file pre-allocation gap is a distinct, real finding: it is
**not fixed by this spec** (S1–S3 touch `extensions/msteams/`, not `src/web/media.ts`) and stays in
review until the operator either accepts the measured worst-case concurrent-local-upload heap envelope
or a follow-up scopes an early local-size check / streaming read in the plugin-sdk. Per AGENTS.md's
open-items ledger clause, that follow-up is filed rather than left implicit:
[`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md).
Until one of those two things happens, the pass-2 heap-policy gate is **open** (§1.5, §7 heap-policy
gate) — this spec does not claim to have cleared it.

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

### 1.5 ⚠️ A4 resolved — the pass-2 *constant* question is answered; the pass-2 *heap-policy* question is not

A4 was "the target repo is not in this workspace". It now is (read-only recon at the pin above).

The pass-2 review flagged one item for a human: *"choose and record an explicit byte value for
`MAX_UPLOAD_BYTES`, no greater than the verified destination limit and acceptable as a per-upload
gateway heap bound."* That is two questions, and recon answers only the first. **The ceiling already
exists, is already a deliberate product policy, and is already configurable:**

- `MSTEAMS_MAX_MEDIA_BYTES = 100 * 1024 * 1024` — `send.ts:47`, `messenger.ts:29`
- overridable per channel by `cfg.channels.msteams.mediaMaxMb`, falling back to
  `cfg.agents.defaults.mediaMaxMb`, resolved by `resolveChannelMediaMaxBytes`
  (`src/channels/plugins/media-limits.ts`, re-exported through `minion/plugin-sdk`)
- **enforced by `loadWebMedia(mediaUrl, mediaMaxBytes)` before the upload network call — but not
  uniformly before allocation.** Per §1.3a, and stated the same way everywhere in this spec: a **remote**
  URL is bounded *during* the fetch, so the ceiling really is a pre-allocation bound there; a **local**
  path is read in full by `fs.readFile` (`media.ts:309`) and only then rejected by `clampAndFinalize`
  (`:319-324`, non-image length check `:265-267`), so on that path the ceiling is a post-allocation
  check. Both paths reject before any Graph request; only the remote path bounds heap.

Introducing a new `MAX_UPLOAD_BYTES` constant would create a *second, conflicting* ceiling on the same
axis — the classic way two limits drift and a user gets a rejection naming the wrong number. S3 is
rewritten accordingly: **reuse the existing ceiling, add none.** That settles the *constant* the pass-2
review asked a human to choose — there is no new byte value to pick.

**It does not settle the heap policy, and this spec no longer claims it clears G2.** The pass-2 gate
asked whether the byte ceiling is an acceptable per-upload gateway heap bound; on the local path it is
not a bound at all (an oversized local file, and any number of concurrent local sends, are allocated
before rejection). That gap lives in `src/web/media.ts`, outside this spec's `extensions/msteams/`
surface, so this spec cannot close it. It is filed as a ledger item —
[`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md)
— and G2 stays open until the operator either accepts the measured worst-case concurrent-local-upload
heap envelope or that proposal ships an early local-size check / streaming read.

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
a shippable fix.** It makes over-threshold uploads *work* on a healthy network, but cancellation and recovery are
S2 and caller-safe behavior is S3. S1–S3 ship together; do not let "resumable upload" imply that
resume, cleanup, and caller behavior are optional.

---

### S1 — Threshold routing, session creation, and the happy-path chunk loop

**Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** a buffer over the simple-upload cap is uploaded through a resumable session in ordered chunks
and the resulting drive item is returned, on **both** drive call sites (§1.1). A unit test with a mock
over-threshold buffer asserts the resumable path was taken. Under the cap, behavior is byte-identical
to today.

> **⚠️ This whole slice is provisional on §7 step 0 (§1.1a).** Every instruction below — the threshold
> constant, the routing branch, the red-state fixture and the boundary cases in the DoD — is
> conditional on step 0 returning a **controlled, recorded, size-dependent** drive-path failure. If
> step 0's controls pass and its probes also pass, S1 is **deleted, not re-numbered**. If step 0
> measures a failure, every "over-threshold" size named below is the **measured per-helper** value
> from §7 step 0c, not `4,000,000` and not a documented number. Do not write these tests against
> `4,000,000` before that result is in the PR.

**Do:**

- **New module `extensions/msteams/src/upload-session.ts`** — the transfer protocol, with **no
  knowledge of Teams, no token acquisition, and an injected HTTP client**. That injection is what makes
  the DoD test a unit test instead of a network test, and — per §1.2 — it is what lets the *same* chunk
  loop serve the consent path in S3, which is handed its session rather than creating one. The chunk
  loop takes an *upload URL*; session creation is a separate exported function.

  The extension already injects `fetchFn?: typeof fetch` on every network function (§1.6) — **match
  that signature exactly** rather than inventing a client abstraction.

  **This threshold, its routing branch, and the comment below are provisional on §7 step 0 (§1.1a) and
  must not be implemented before that check returns a confirmed drive-path size failure.** The comment
  states the in-repo TODO's claim that Graph caps the simple `PUT` at 4MB — that claim is exactly what
  pass 4/5 found contradicted by current primary Microsoft documentation (250 MB for this call shape,
  §1.1a), and no live request has confirmed either number. The constant below is the value to route on
  **only if** step 0 confirms a real failure near this range; if step 0 instead confirms the 250 MB
  ceiling, drop this constant and the routing split entirely rather than keeping it as an inert
  safety margin.

  ```ts
  /** UNVERIFIED pending §7 step 0 (§1.1a): the in-repo TODO this spec started from claims Graph's
   *  simple PUT /content is capped at 4MB; current primary Microsoft documentation instead states a
   *  250 MB ceiling for this exact call shape, and no live PUT has confirmed either number. Do not
   *  read this comment as a verified fact. Step 0 selects each helper's policy from controlled
   *  evidence plus the effective runtime ceiling: simple-only requires every accepted size to be
   *  within the repeatably verified simple range; otherwise session-above uses a safe numeric
   *  boundary. No documented, decimal, or binary 4 MB value is a fallback.
   *
   *  DELIBERATELY NOT the same number as FILE_CONSENT_THRESHOLD_BYTES (4 * 1024 * 1024, send.ts:41 /
   *  messenger.ts:35). That constant answers "does Teams require a consent card in a 1:1 chat"; this
   *  one answers "will Graph reject a simple PUT". Same magnitude, different questions, different
   *  owners. Do not unify them. */
  export type DriveUploadHelper = "oneDrive" | "sharePoint";

  export type DriveUploadPolicy =
    | { readonly kind: "simple-only"; readonly maxAcceptedBytes: number }
    | { readonly kind: "session-above"; readonly maxSimpleBytes: number };

  export type DriveUploadPolicies = Readonly<Record<DriveUploadHelper, DriveUploadPolicy>>;

  /** Graph requires every chunk except the last to be a multiple of 320 KiB (327,680 B).
   *  5 MiB is exactly 16 x 320 KiB — one constant that satisfies both the alignment rule and
   *  the "5-10 MiB recommended" guidance. VERIFY both numbers against current Graph docs (§4). */
  export const CHUNK_ALIGNMENT_BYTES = 327_680;
  export const CHUNK_BYTES = 5_242_880;
  ```

- **Route in one place with a helper-specific discriminated policy, compiled for every send.** Step 0
  records each helper's highest repeatably verified simple size; it does **not** freeze one deployment's
  `mediaMaxMb` as a forever-valid runtime policy. `send.ts` and `messenger.ts` already resolve the
  effective ceiling from live configuration for every send (§1.5). At that same call site, before
  `loadWebMedia` can allocate the payload, compile the selected helper's `DriveUploadPolicy` from
  `(helper, effectiveMediaMaxBytes, verifiedSimpleMaximum)`, and pass the result into the drive upload
  call. `simple-only` is legal only when `effectiveMediaMaxBytes <= verifiedSimpleMaximum`;
  `maxAcceptedBytes` equals that send's effective ceiling and preserves the existing simple PUT only
  through that value. If a configuration reload raises the ceiling above the verified simple maximum,
  the compiler must select `session-above` at that maximum when the session permission/preflight gate
  below is satisfied, or reject the unsupported ceiling **before** calling `loadWebMedia`. It may never
  reuse a previously compiled `simple-only` policy, and the upload helper must reject rather than simple-
  PUT any buffer beyond the policy's recorded bound as defense in depth.
  `session-above` takes the session path only when
  `size > policies[helper].maxSimpleBytes`, and otherwise preserves the simple PUT. Do not commit a
  numeric placeholder: the implementation record must contain the exact measured disposition for each
  helper.
  Both `uploadToOneDrive` (`graph-upload.ts:29`) and `uploadToSharePoint` (`:171`) call that helper but
  select their own keyed measurement. They differ in both base URL (`/me/drive/root:` vs
  `/sites/{siteId}/drive/root:`) and potentially the measured boundary; sharing the branch must not
  collapse those inputs into one scalar. Do not "simplify" this to always-resumable: a small attachment
  would grow from one request to at least two, and the simple path is the common case by a wide margin.
- **`createUploadSession`.** `POST` to the drive item's `createUploadSession` action. Build the URL by
  replacing the trailing **`/content`** — and nothing else — in the URL the simple `PUT` already builds
  (`graph-upload.ts:42`, `:186`). The path-escaping colons stay exactly as they are; do **not** prepend a
  second colon, which is what "swap `/content` for `:/createUploadSession`" would literally produce
  (`...root:${uploadPath}::/createUploadSession` — malformed, and a mock will happily accept it). With
  `GRAPH_ROOT = "https://graph.microsoft.com/v1.0"` and
  `uploadPath` = `/MinionShared/` + `encodeURIComponent(filename)` (`graph-upload.ts:40`, `:183`),
  the two exact templates are:

  ```
  OneDrive:   ${GRAPH_ROOT}/me/drive/root:${uploadPath}:/createUploadSession
  SharePoint: ${GRAPH_ROOT}/sites/${siteId}/drive/root:${uploadPath}:/createUploadSession
  ```

  Assert the **complete** requested URL in S1, not just the base — a base-only assertion passes on a
  malformed suffix. The body carries
  `item: { "@microsoft.graph.conflictBehavior": ... }`. **Pass-4 correction:** use **`replace`**, not
  `rename`. The existing simple path is silent on conflict behavior (verified §1.1: neither function
  sets it) and Graph's documented default for a silent simple `PUT` is `replace` — two uploads of
  `/MinionShared/report.pdf` today both replace the prior item regardless of size. `rename` would make
  that behavior size-dependent: a small file replaces `report.pdf`, a large one creates a renamed
  duplicate, with no same-name parity test to catch the split (§3's routing table has none). "Cannot
  destroy a user's file" is a new product-policy decision this spec was not asked to make. If rename (or
  any other collision policy) is wanted, it needs its own explicit operator approval and must apply
  uniformly to both the simple and session paths, not just the one this spec happens to touch. The
  response yields `uploadUrl` and `expirationDateTime`; keep both.
- **App-only permission and deployment prerequisite.** Recon shows the real callers obtain a Graph
  token from `sdk.MsalTokenProvider` using the bot app id/password/tenant (`send-context.ts:126-130`),
  so this is an **application-permission** flow. Microsoft's current v1.0 contracts differ:
  simple `PUT .../content` permits application `Files.ReadWrite.All`, while
  `createUploadSession` requires application `Sites.ReadWrite.All`. A green simple-PUT step 0 therefore
  does not prove the session path is authorized. Before approval, inspect the real bot app registration
  and record that administrator consent for `Sites.ReadWrite.All` is present, then use that same app
  identity to POST each exact OneDrive and SharePoint session URL above with a disposable filename;
  require `200` plus an `uploadUrl`, and immediately DELETE that URL, requiring `204` or recording the
  cleanup failure. Do not upload bytes in this preflight. If the grant is absent, stop: add the required
  app-registration/onboarding/operator-consent change to the approved scope, including its security
  review and tenant-admin instructions, before S1. Never silently broaden permissions in code or treat
  a `403` as evidence of a byte threshold.
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
  Never `Buffer.concat`, never `slice().toString()`. **Do not** wrap the result in `new Uint8Array(...)`
  before passing it as the fetch body — per §1.3a that constructor form copies, it does not view; pass
  the `subarray()` result directly. (Today's `graph-upload.ts:47`/`:191` already makes this mistake once
  per whole-file upload; do not repeat it once per chunk.) Add a regression test that mutates the source
  buffer after slicing and asserts the chunk body did or did not change, rather than asserting
  "zero-copy" from a comment.
- **Red-state first (G3), with two distinct proofs per `session-above` helper.** First write the **routing-delta** test
  at that helper's `threshold + 1`; against today's code it is red because old code chooses SIMPLE
  where the new policy requires SESSION. That proves routing only. Separately write the
  **bug-reproduction** test at that helper's smallest observed failing step-0 probe, with the mocked
  simple `PUT` returning the recorded size-specific status/body; against today's code it must fail as
  step 0 recorded. Paste both failures into the PR with labels. Only the second proves that old code
  failed as reported. Do not use `4,000,000`, and do neither until step 0 establishes a threshold and
  failing probe for that helper. For a `simple-only` helper, add an all-accepted-sizes-simple green
  regression through `maxAcceptedBytes` and require no fabricated routing-delta or failure
  reproduction. The existing ~143-test
  suite cannot serve as red-state proof.

**Files:** `extensions/msteams/src/upload-session.ts` (new),
`extensions/msteams/src/upload-session.test.ts` (new),
`extensions/msteams/src/graph-upload.ts` (**both** simple-PUT sites — the shared size branch, the
delegation, and the deleted `:27` TODO), `extensions/msteams/src/graph-upload.test.ts` (new). No file
outside `extensions/msteams/`.

**Definition of done (machine-checkable):**

```bash
cd minion
pnpm vitest run extensions/msteams          # or: pnpm --filter <msteams-pkg-from-package.json> test
#   red-state first (G3), separately for each session-above helper:
#   - routing delta at that helper's threshold + 1: old code chooses SIMPLE, expected SESSION
#   - bug reproduction at that helper's smallest observed failing probe: mocked simple PUT returns
#         the recorded size-specific status/body and old code fails as step 0 observed
#     Only this second test may be labelled "old code failed as reported".
#   Express boundary cases as measuredThreshold and measuredThreshold + 1; do not substitute fixed
#   placeholder literals. For a simple-only helper, assert every accepted controlled size through
#   maxAcceptedBytes stays SIMPLE.
#   graph-upload.test.ts — parameterize by each helper's measured policy:
#   - upload(<Buffer.alloc(measuredThreshold + 1)>) → createUploadSession called exactly once
#         AND >=1 PUT to the returned uploadUrl AND zero PUTs to /content
#         ← the proposal's DoD sentence, literally
#   - upload(<Buffer.alloc(measuredThreshold)>) → simple path ← exact largest passing probe
#   - upload(<Buffer.alloc(measuredThreshold + 1)>) → session path ← routing boundary
#   - unequal-boundary case: set OneDrive and SharePoint thresholds to intentionally different
#         measured fixtures; at a size between them, one helper takes SESSION and the other SIMPLE
#         ← proves the shared router preserves helper-specific thresholds instead of one scalar
#   - mixed-policy case (test-only fixture): one helper simple-only, one session-above; every controlled
#         accepted size through maxAcceptedBytes stays SIMPLE for the former while measuredThreshold
#         + 1 takes SESSION for the latter
#   - configured-ceiling case: set mediaMaxMb above Graph's documented 250,000,000-byte simple-PUT
#         limit, and a configuration-reload case that first sends under a simple-only ceiling and then
#         raises mediaMaxMb above maxAcceptedBytes; per-send policy compilation produces session-above
#         (or rejects before loadWebMedia/payload allocation with a clear effective-limit error), never
#         reuses stale simple-only, and no above-bound buffer reaches PUT /content
#   - the COMPLETE createUploadSession URL is asserted for each helper, string-equal to:
#         https://graph.microsoft.com/v1.0/me/drive/root:/MinionShared/<enc>:/createUploadSession
#         https://graph.microsoft.com/v1.0/sites/<siteId>/drive/root:/MinionShared/<enc>:/createUploadSession
#         ← §1.1 (bases must not collapse) AND the exact suffix: no '::', no missing colon.
#           A base-only assertion is NOT sufficient — it accepts a malformed suffix a mock will serve.
#   - createUploadSession body carries "@microsoft.graph.conflictBehavior": "replace"     ← NOT rename
#   - same-name parity: uploading the same filename twice via the SIMPLE path replaces the
#         prior item, and twice via the SESSION path also replaces it — one consistent policy,
#         not one that flips with size                                            ← pass-4 fix
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
if rg -n 'TODO' extensions/msteams/src/graph-upload.ts; then echo "FAIL: :27 TODO still present"; exit 1; fi
if rg -n 'Buffer\.concat|\.slice\(' extensions/msteams/src/upload-session.ts; then echo "FAIL: use subarray, not concat/slice"; exit 1; fi
if rg -n 'Authorization|Bearer' extensions/msteams/src/upload-session.ts; then echo "FAIL: chunk PUTs must carry no Authorization header"; exit 1; fi
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
  other `4xx` except **`416`** — those are contract errors and retrying them just burns the budget.
  A `416 Requested Range Not Satisfiable` can mean the service already accepted the fragment: do not
  blindly resend or terminate. `GET` the pre-authenticated upload URL, validate a non-empty,
  well-formed `nextExpectedRanges`, and resume at the server-reported offset under the same attempt and
  wall-clock budgets. A missing/malformed range is a typed terminal protocol failure.
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
#   - chunk PUT returns 416; status GET reports nextExpectedRanges ['10485760-']
#         → next PUT starts at 10485760, without blindly resending the rejected range
#   - 404 on a chunk PUT, recreate callback PRESENT → at most ONE recreation, then terminal; never a loop
#   - 404 on a chunk PUT, recreate callback ABSENT (consent path) → typed 'session-expired', no crash
#   - permanent failure → exactly one DELETE to the uploadUrl (cancel)
#   - a DELETE that itself throws → the ORIGINAL error still surfaces, not the cancel error
#   - success → ZERO DELETE calls
#   - abort mid-transfer → no further PUTs are issued, session cancelled
#   - the injected logger receives no string containing the uploadUrl token fixture   ← no-leak
#   - String(<every typed error>) and monitor-handler's final chat message contain neither the complete
#         uploadUrl nor its unique token fixture; the no-'http' assertion is supplemental ← chat-safe
#   - a 20-chunk upload emits <= 20 debug lines and exactly 1 info line
pnpm tsgo && pnpm check
if rg -n 'uploadUrl' extensions/msteams/src/upload-session.ts | rg -n 'log|console'; then echo "FAIL: uploadUrl passed near a logger/console call"; exit 1; fi
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
  consequence. Branch each drive-path caller's fixtures on its own `DriveUploadPolicy`; a mixed result
  must exercise both kinds in the same parameterized suite:
  - `session-above`: use that helper's §3 **at-boundary** and **above-boundary (`threshold + 1`)**
    fixtures, derived from §7 step 0c (§3's bracket rule), never a fixed 1 MB / 12 MB pair. At the
    boundary → SIMPLE and delivered; at `threshold + 1` → SESSION and delivered. On permanent session
    failure, the send reports a typed error and does **not** post a card pointing at a nonexistent
    file. For SharePoint, assert `getDriveItemProperties` receives the id from the session's terminal
    response (§1.1).
  - `simple-only`: it has no threshold and never creates a session. Exercise every accepted controlled
    size through `maxAcceptedBytes`, assert SIMPLE delivery and zero `createUploadSession` calls, then
    make the simple PUT permanently fail and assert the typed caller error plus no broken card/link.
    Do not invent a terminal-session-id assertion for this policy.
  The helpers may bracket at different sizes or select different kinds; caller coverage is complete
  only when it follows the selected kind rather than forcing both through SESSION.
  Add a configuration-reload caller test: resolve a ceiling within the verified simple range and send
  once, raise `mediaMaxMb` above that range without restarting, then send again. Assert the second call
  recompiles the policy and either takes SESSION or rejects before `loadWebMedia`; it must not reuse the
  first call's `simple-only` policy or issue simple `PUT /content` above `maxAcceptedBytes`.
  **The consent-path caller (§1.2) is separate and keeps its literal 12MB case** (§7 step 2e): it is
  handed a Teams-supplied `uploadUrl` and always chunks regardless of size, so it never evaluates the
  drive simple/session threshold and has nothing to derive from step 0.
- **Do not edit anything under `minion/src/`.** Recon found zero coupling to change (§1.6). If the fix
  seems to need a `src/` edit, that is a **finding, not a chore** (§5) — say so in the PR. Test-only
  edits under `src/` are fine; production edits there are the line.
- **Reuse the existing ceiling; add none.** Recon (§1.5) found `MSTEAMS_MAX_MEDIA_BYTES = 100 * 1024 *
  1024` (`send.ts:47`, `messenger.ts:29`), already overridable via `channels.msteams.mediaMaxMb` /
  `agents.defaults.mediaMaxMb` and already enforced ahead of the transfer by `loadWebMedia`. **Only the
  byte-value question is settled** — this is a deliberate, already-recorded human choice for *what
  number* to enforce (§1.5). It is **not** yet an accepted per-upload heap bound: per §1.3a/§1.5, the
  ceiling is a pre-allocation bound only for remote media, and the local-read gap keeps the heap-policy
  gate (§7) open until
  [`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md)
  ships option 1 with every production override caller bounded, or the operator accepts the measured
  worst-case envelope. Option 2 does not close this gate. Do **not** introduce a
  `MAX_UPLOAD_BYTES` constant — a second ceiling on the same axis is how a user gets a rejection naming
  the wrong number. Two obligations instead:
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
#   policy-branched caller cases above for both drive call sites: boundary/threshold+1/session failure
#   only for session-above; all accepted sizes/simple failure only for simple-only; plus:
#   - a file above the effective mediaMax ceiling → rejected by loadWebMedia BEFORE any
#         createUploadSession call, and the message names the effective limit
#   - consent path, 12MB → chunked PUTs to the Teams-supplied uploadUrl, zero createUploadSession calls
if git diff --name-only <base>...HEAD | rg -v '^extensions/msteams/'; then echo "FAIL: diff touches files outside extensions/msteams/"; exit 1; fi
git diff --name-only <base>...HEAD | rg '\.svelte$'   && echo "FAIL: UI out of scope"           && exit 1
git diff --name-only <base>...HEAD | rg 'index\.json' && echo "FAIL: generators own index.json" && exit 1
if rg -n 'MAX_UPLOAD_BYTES' extensions/msteams; then echo "FAIL: new ceiling constant added; reuse mediaMaxMb"; exit 1; fi
rg -n '4 ?MB' extensions/msteams --glob '!*.test.ts'  # → only the consent-card threshold and the
                                                      #   simple-PUT routing threshold, never a
                                                      #   ceiling on what can be sent
```

---

## 3. The routing table (one place, so reviewers can check it at a glance)

Read this as the **drive paths** (SharePoint and OneDrive). The consent path enters at the same chunk
loop but is handed its URL, so its first two rows collapse into "one chunk, one PUT" — identical wire
behavior to today.

**Pass-4 caveat: this table is unverified against runtime and may be wrong.** §1.1a found that current
Microsoft documentation puts the simple `PUT`'s limit at 250 MB, not 4 MB, for these exact endpoints,
and that no live request has ever confirmed the row below fails today. Do not implement against this
table until the live check in §1.1a / the top-of-file disposition banner has been run and recorded.

| Payload size | Path | Why |
|---|---|---|
| `0` bytes | Simple PUT (unchanged) | Empty-file semantics are Graph's problem, not this spec's; do not add a special case. |
| `1 B … 4,000,000 B` *(placeholder — §7 step 0)* | Simple `PUT /content` | Today's behavior, byte-identical. One request. |
| `4,000,001 B … ceiling` *(placeholder — §7 step 0)* | `createUploadSession` + chunked PUT | **The fix, if step 0 proves one is needed.** Chunks of 5 MiB (16 × 320 KiB), sequential, last chunk short. |
| `> ceiling` | Rejected before any Graph request | Already the behavior: `loadWebMedia(url, mediaMaxBytes)` refuses the payload. Remote media is refused *before* the buffer exists (bounded during fetch); local media is read in full and refused *after* (§1.3a, §1.5). No new constant either way. |

**"Ceiling" = the existing `resolveChannelMediaMaxBytes` result**, i.e.
`cfg.channels.msteams.mediaMaxMb` → `cfg.agents.defaults.mediaMaxMb` → `MSTEAMS_MAX_MEDIA_BYTES`
(100 MiB, `send.ts:47` / `messenger.ts:29`). This is a pre-existing, deliberate, configurable product
policy; **only the byte-value half of the pass-2 review's "flagged for human" item is satisfied by it**
— no new byte value needs choosing (§1.5). The other half, whether that value is an acceptable
per-upload gateway **heap bound**, is **not** satisfied and stays open: it is a pre-allocation bound
only for remote media, not for local files (§1.3a, §1.5), and closing it needs the heap-policy gate in
§7 resolved, not just a byte value picked. The only obligation this row settles is §4's check that
100 MiB is at or under the destination's documented per-file limit.

**Where `4,000,000` came from, and why it is a placeholder.** It is **not** a Microsoft-documented
number and this spec does not claim it is one. Its only source is the stale in-repo TODO at
`graph-upload.ts:26-27` (§1.1) — current primary documentation for this exact call shape says 250 MB,
not 4 MB (§1.1a), and no live request has shown a simple `PUT` failing anywhere near either number.
The row above has two possible fates, and §7 step 0 decides between them, not this paragraph:

- **Step 0 disproves a size-dependent failure** (controls pass, all probes pass, both helpers): the
  boundary and the routing split it drives are **deleted, not re-numbered** — S1 has no drive-path
  defect to fix (§1.1a).
- **Step 0 measures a real per-helper failure**: the boundary becomes the *measured* smallest-failing /
  largest-passing pair for that helper (§7 step 0c). That measurement may land nowhere near 4 MB and
  may differ between OneDrive and SharePoint. `4,000,000` is not a floor, a default, or a safety
  margin to fall back on when the measurement is inconvenient.

The two readings of "4 MB" (`4,000,000` and `4,194,304`) never select the implementation boundary.
Only controlled probes do. Do **not** write boundary tests before step 0's result is recorded in the
PR: a test asserting an unmeasured threshold is what makes a placeholder permanent.

**The general bracket rule, beyond the two 4 MB readings.** Step 0 begins with four fixed sizes (§7 step
0b: ~1 MiB, 4.1 MiB, 12 MiB, ~99 MiB) and extends through the effective accepted ceiling, so its result
usually *brackets* the true boundary rather than
pinning it exactly — the largest probe that passes and the smallest probe that fails are not adjacent
bytes. In that case the routing threshold to implement, and the boundary fixtures S3 and §7 steps 2b–2d
test against, is the **largest passing probe size for that helper** — not the midpoint of the bracket
and not the smallest failing probe. Everything in the untested gap between the largest passing probe and
the smallest failing probe is unknown, and the conservative reading (same reasoning as the 4 MB case
above: routing extra bytes through the session path when they might have fit in a simple `PUT` is
harmless; the reverse is not) treats that whole gap as "route through session." This derived value, not
`4,000,000`, is what every remaining "over-threshold" fixture in this spec must use, and it may differ
between OneDrive and SharePoint (§7 step 0c). A bracket is valid only when repeated results are
monotonic: every tested size at or below `maxSimpleBytes` passes on every required repetition, and
every size-specific failure above it reproduces. A pass after any lower-size failure, or a failure that
does not reproduce, is inconclusive noise; re-run or refine the matrix and do not compile a policy or
approve S1 from it.

Independently of all of the above, `FILE_CONSENT_THRESHOLD_BYTES` *is* `4 * 1024 * 1024`,
deliberately, and answers a different question (S1) — do not unify the two whatever step 0 returns.

## 4. Numbers that must be verified before shipping

Rows marked **verified (code)** were read from `NikolasP98/minion@bd55137` during §1 and need no
further check. The rest are stated from knowledge of the Microsoft Graph upload-session API — **and, per
§1.1a, one of them (the first row) is now contradicted by a document that *was* read during pass 4**:
[Upload or replace the contents of a driveItem](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0)
states a 250 MB cap, not 4 MB, for the exact call shapes this spec targets. The claim two sentences below
— "the design does not change under any plausible revision; only the constants do" — is false for this
specific row: at 250 MB, §1.1a's consequence-for-scope analysis applies and the S1/S3 routing split may
need to be dropped, not just re-numbered. Every other unverified row must still be checked by the
implementer against current Graph documentation for the tenant's cloud, with the check recorded in the
PR — one line is enough.

| Constant | Value used here | Confidence | Note |
|---|---|---|---|
| Simple `PUT /content` cap | 4 MB | **Disputed — see §1.1a.** Current Microsoft docs for these exact endpoints say 250 MB; no live tenant request has confirmed a 4 MB failure. | Do not treat this row as settled. Live-verify before relying on the routing split in §3. |
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
| Gateway process memory | ⚠️ **Real, and pre-existing, and worse for local files than pass 3 claimed.** A 100MB attachment is 100MB of heap. For **remote** media, `loadWebMedia` bounds the read to the cap while fetching. For **local** media it does not: `fs.readFile` reads the whole file before the cap is checked (§1.3a) — so an oversized local file is briefly fully allocated before rejection, which is a heap-bound gap this spec does not close. Chunking itself adds no *new* allocation as long as chunks are sliced with `subarray()` and never wrapped in `new Uint8Array(...)` (§1.3a) | The ceiling that bounds the accepted size is configurable (§1.5), but the pre-check local-read gap is unresolved — see §1.3a's disposition and the heap-policy gate in §7. Filed as `proposals/2026-08-29-gw-local-media-read-before-cap-check.md`; a ledger item, not a silent omission |
| Microsoft Graph / SharePoint (external) | **More requests per large file**: 1 create + ⌈size/5 MiB⌉ PUTs + status/retry/cancel requests when needed, versus 1 failed request today. Files land in the destination drive and consume tenant storage | Sequential chunks (no fan-out), bounded retries with `Retry-After` honoured, `429` respected — S2. This is the intended cost of the feature |
| Microsoft Entra bot app registration | **Security/deployment prerequisite.** The app-only session API requires administrator-consented `Sites.ReadWrite.All`; today's simple upload may work with only `Files.ReadWrite.All` | Verify the real grant and run create-then-cancel preflights against both exact helper endpoints before approval (§7 step 0a). If absent, rescope onboarding/operator consent and security review; do not silently add privilege |
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
- **Streaming instead of buffering** (§1.3). Accepted payloads are bounded by the existing ceiling, but
  only the *remote* read is bounded before allocation — the local read is not (§1.3a, §1.5). Fixing that
  would have to change `loadWebMedia` in the plugin-sdk and every channel that calls it, so it is out of
  scope here and filed as its own ledger item,
  [`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md).
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

# 0. PREREQUISITE, pre-implementation (§1.1a) — do this BEFORE S1, against TODAY's unmodified code.
#    This is a CONTROLLED experiment, not a smoke test: its only job is to decide whether the drive
#    endpoints have a SIZE-dependent failure below the gateway's accepted ceiling and to compile a
#    policy safe for that exact ceiling. Every other kind of
#    failure (identity, permission, path, destination, configuration) must be excluded first, or a
#    401/403/404 that happens to hit all three large payloads reads as "proof" of a byte ceiling.
#
#    0a. Two runs, because ONE configuration cannot exercise both helpers.
#        send.ts:204-222 takes the SharePoint path whenever cfg.channels.msteams.sharePointSiteId is
#        set, and only reaches uploadToOneDrive when it is absent (:267-278). So either:
#          RUN A: sharePointSiteId SET   -> exercises uploadToSharePoint  (group chat / channel)
#          RUN B: sharePointSiteId UNSET -> exercises uploadToOneDrive    (group chat / channel)
#        ...or invoke the two exported helpers directly from a scratch script with a real
#        MSTeamsAccessTokenProvider (uploadToOneDrive / uploadToSharePoint, graph-upload.ts:29 / :171),
#        which is the cheaper and more precise option and is equally acceptable evidence.
#        Use a NON-IMAGE file in every case: send.ts:197-202 sends images inline when no site id is
#        configured, so an image in RUN B never reaches OneDrive at all.
#        Do NOT use a 1:1 chat for this step — personal chats route to the consent card (§1.2), a
#        different code path with a different (Teams-supplied) URL.
#        Before reading any size result, verify the real bot app registration has administrator-
#        consented Sites.ReadWrite.All. With that same app identity, POST createUploadSession for a
#        disposable filename to BOTH exact helper URLs, require 200 + uploadUrl, then DELETE each
#        uploadUrl and require 204 (or record cleanup failure). A 403 blocks approval as an auth/
#        deployment finding; it is not size evidence. If the grant is absent, scope and security-review
#        the app-registration/onboarding/admin-consent change before continuing.
#
#    0b. First resolve and record the effective runtime ceiling for this run from mediaMaxMb. Per run,
#        through the SAME tenant, identity, /MinionShared destination and configuration, test the
#        ascending matrix below. Run every included size at least twice under those same conditions;
#        record method, full URL, HTTP status, response body and byte size for every attempt:
#          1. CONTROL   ~1 MiB non-image  -> MUST succeed (2xx, item id returned)
#          2. PROBE     4.1 MiB           -> include when accepted by the effective ceiling
#          3. PROBE     12 MiB            -> include when accepted by the effective ceiling
#          4. PROBE     ~99 MiB           -> include when accepted by the effective ceiling
#          5. PROBE     effective runtime ceiling exactly
#          6. PROBE     250,000,000 B exactly when accepted (Graph's documented simple-PUT maximum)
#        De-duplicate equal sizes and execute in strictly ascending byte order. If the effective
#        ceiling exceeds 250,000,000 B, do not issue a knowingly out-of-contract simple PUT above that
#        limit merely to rediscover the documented rejection: this fact itself forbids simple-only and
#        requires session-above with maxSimpleBytes no greater than the largest repeatably passing
#        in-contract probe (or a clear configuration rejection before payload allocation). Changing
#        tenant, identity, folder or config between attempts voids the run.
#
#    0c. Reading the result — per run, and both runs must be read before any disposition:
#        - CONTROL FAILS -> this run proves NOTHING about size. Record it as an auth / permission /
#          path / configuration finding, fix the environment, and re-run. It may NOT be used to
#          approve S1, to justify the routing split, or to derive any byte threshold. If the control
#          cannot be made to pass, say so and stop — "we could not upload at all" is the finding.
#        - CONTROL PASSES, every accepted size through the effective ceiling passes repeatedly, and the
#          ceiling is <= the highest verified passing simple size -> the ">4MB fails" premise is
#          disproved for that helper; record simple-only with maxAcceptedBytes equal to that ceiling.
#          If both runs read this way: do not proceed to S1
#          as scoped; reject/archive the
#          proposal's drive-path claim, and file a narrower proposal for whatever of §1.2/§4's
#          independently-evidenced findings (consent-URL fragment ceiling, resumability) remain.
#        - CONTROL PASSES, but the effective ceiling is above the verified simple range (including any
#          ceiling above 250,000,000 B) -> simple-only is forbidden even if every in-contract probe
#          passed. Record session-above with maxSimpleBytes no greater than the largest repeatably
#          passing in-contract size, or reject that configuration before reading the payload. The S1
#          test matrix must include mediaMaxMb above the documented simple limit.
#        - CONTROL PASSES, some probe fails reproducibly -> a size-dependent failure exists. Record the exact
#          status/body/tenant/cloud/identity and the smallest failing and largest passing size; the
#          threshold in §3 must be DERIVED from those measurements, not from the 4,000,000 already
#          written there and not from documentation. Note that a failure whose body names an auth,
#          scope or path problem rather than size is NOT size evidence even with a green control —
#          re-run that single payload before treating it as such.
#        - MONOTONICITY IS REQUIRED -> after repetitions, all passing sizes must precede all
#          size-specific failing sizes. A pass after a lower-size failure, or a failure that does not
#          reproduce, is noisy/inconclusive. Re-run or refine the matrix under unchanged conditions;
#          do not select the largest pass, compile either policy, or approve S1 from that run.
#        - The two runs may disagree (OneDrive is labelled "deprecated for bot use" in the source's
#          own header comment, graph-upload.ts:4-7). A per-helper result is a per-helper finding;
#          do not average them into one threshold. If exactly one helper has a size-specific failure,
#          implement only that helper as session-above and keep the other simple-only. Routing-delta
#          and bug-reproduction gates apply only to session-above; the simple-only helper must prove
#          all controlled probes remain SIMPLE.
#
#    This step is the pass-4 blocker, restated as a controlled experiment in pass 5 (top-of-file
#    disposition banner). Do not run steps 1-3 until it
#    has been run with passing controls and its full result table recorded in the PR.

# 1. Gates (logic/test/docs-tagged: no design or token lint — §6)
pnpm install && pnpm build
pnpm vitest run extensions/msteams && pnpm tsgo && pnpm check   # msteams baseline + new cases, green
git diff --name-only <base>...HEAD          # → extensions/msteams/** only in the minion repo

# 2. Live — the reported symptom, gone, on the path that actually matters
#    Configure the msteams channel WITH a SharePoint site id, start the gateway (pnpm gateway:watch):
#    a) Channel/group, SharePoint policy:
#       - session-above: send the exact largest-passing probe, then threshold + 1. The former uses one
#         SIMPLE PUT; the latter produces an intact native card via createUploadSession + N chunk PUTs.
#       - simple-only: repeat every accepted controlled size through maxAcceptedBytes; each remains one
#         SIMPLE PUT and delivers intact.
#         → the file appears intact in the SharePoint drive (open it, don't just trust the card)
#    b) Unconfigure sharePointSiteId; repeat (a) using OneDrive's OWN measured policy and fixtures —
#       do not reuse SharePoint's disposition or sizes; the helpers may differ (§7 step 0c)
#         → delivered via the OneDrive fallback + markdown link.            ← the proposal's :27 site
#    c) 1:1 chat: send a ~12MB file, accept the consent card
#         → delivered; debug log shows chunked PUTs to the TEAMS-supplied url,
#           and ZERO createUploadSession calls.                             ← §1.2, live
#    d) Mid-transfer of a large file, drop the network for a few seconds, restore it
#         → the transfer resumes and completes; the log shows a nextExpectedRanges GET
#           and a restart at that offset, not at byte zero.                 ← S2, proven live
#    e) Revoke or corrupt the upload URL mid-transfer (or wait past expirationDateTime)
#         → the send fails with a typed, human-readable error; NO broken attachment card is posted;
#           the log shows one best-effort DELETE attempt. If the URL is already invalid, cleanup is
#           service-owned; no completed or user-visible partial item remains in the drive.
#         → on the 1:1 path, the message posted into the chat contains NO url.     ← §1.4
#    f) Attempt a file above the effective mediaMax ceiling
#         → rejected before any network call, with a message naming the effective limit.
#    f2) Raise mediaMaxMb above the previously verified simple-only ceiling without restarting, then
#         attempt a newly accepted payload above maxAcceptedBytes
#         → policy is recompiled for this send and uses SESSION, or configuration is rejected before
#           loadWebMedia; ZERO out-of-policy simple PUT /content calls.
#    g) grep the run's logs for the upload URL's token and for 'Bearer'
#         → ZERO hits.                                                      ← no-leak, proven live

# 3. Tenant hygiene
#    After the runs above, list the destination drive: exactly the files sent in (a)-(c),
#    no zero-byte or partial items left by (e)/(f).
```

**Ship gate:** the real bot app registration has recorded administrator consent for
`Sites.ReadWrite.All`, and create-then-cancel session preflights pass on both exact helper endpoints;
step 0 then runs with **passing controls on both helpers**, repeatable monotonic observations,
the effective runtime ceiling, and its full result table recorded, confirming at least one helper still
has a fix to make (§1.1a). A step 0 whose controls pass and whose probes cover every accepted size with
repeatable success disproves the premise, which is a valid outcome and means this spec, as scoped, does not ship;
a step 0 whose controls fail is not a result at all and blocks the gate either way; §7 steps
1–3 green on **both** a SharePoint-configured conversation and a 1:1 chat; the proposal's DoD checked
clause by clause against *both* drive functions using each helper's own derived policy: for
`session-above`, `createUploadSession` + chunked PUT above that helper's step-0-derived boundary (§3
bracket rule, never fixed `4MB`), at-boundary SIMPLE behavior, permanent-failure behavior and the
session-terminal-id assertion where applicable; for `simple-only`, every accepted controlled size
through `maxAcceptedBytes` remains SIMPLE, success and permanent-failure caller behavior are covered,
and there is no SESSION or terminal-id requirement. The test suite includes an effective `mediaMaxMb`
above 250,000,000 bytes and proves it cannot compile as `simple-only`. Both S1 red-state
failures pasted into the PR for each `session-above` helper: the `threshold + 1` routing-delta failure, and the smallest
observed failing-probe reproduction whose mocked simple-PUT status/body matches step 0. Only the latter
proves the old code failed the way the proposal reported. Each `simple-only` helper instead has an
all-accepted-sizes-simple regression through `maxAcceptedBytes` and no fabricated failure fixture;
§4's unverified constants each
checked and recorded as one line, including any that came back different — in particular the
per-request fragment ceiling, since it determines whether the consent path had a second silent failure
band (§4); the same-name parity case (§2 S1) passing on both the simple and session paths with
`conflictBehavior: replace`. S1–S3 must ship together; the proposal does **not** get closed on a happy
path, and it does **not** get closed with `uploadToSharePoint` still on the simple PUT.

**Approval gate (spec, not code):** this spec itself may not move to `approved` until step 0 above has
been run **with a passing ~1 MiB control for each of `uploadToOneDrive` and `uploadToSharePoint`** and
its repeated per-request result table, effective runtime ceiling, and monotonicity determination
recorded (§1.1a, top-of-file disposition banner). An uncontrolled matrix, one whose controls failed,
or a noisy/non-monotonic matrix is an environment finding and may not be converted into a size
threshold or into an approval. A configured ceiling above the verified simple range must select
`session-above` or be rejected before allocation; it cannot be approved as `simple-only`. Production
callers must compile that policy from the current effective ceiling on every send before `loadWebMedia`,
with a configuration-reload caller test proving that a later ceiling increase cannot reuse stale
`simple-only` or reach simple PUT above `maxAcceptedBytes`. Approval also requires recorded
administrator consent for `Sites.ReadWrite.All` on the real bot registration and successful
create-then-cancel preflights for both helper endpoints; a green simple-PUT matrix alone is insufficient.
That is a
pass-4/pass-5 finding, not a pre-existing part of this section — do not
treat its absence as an earlier oversight to silently backfill.

**Heap-policy gate (spec, not code):** independently of step 0, the pass-2 question "is the byte ceiling
an acceptable per-upload gateway heap bound?" is **still open**, because the ceiling is a pre-allocation
bound only for remote media (§1.3a, §1.5). Approval also requires either recorded operator acceptance of
the measured worst-case concurrent-local-upload envelope, or **option 1** from
[`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md)
shipping with **all production override callers bounded at the producer**. A terminal proposal status
by itself does not clear this gate. If option 2 ships, keep a separate nonterminal ledger proposal for
the override-supplied path; option 2, rejection, archival, or any other disposition that leaves a
production override reader unbounded cannot satisfy this gate. Nothing in this spec closes it.
