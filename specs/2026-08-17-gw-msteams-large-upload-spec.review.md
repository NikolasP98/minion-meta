---
spec: 2026-08-17-gw-msteams-large-upload-spec
pass: 12
verdict: changes_requested
reviewer: factory-review
created: 2026-08-17
updated: 2026-08-31
---

# Pass 12 disposition — STILL REVIEW (changes_requested), unchanged

The pass-12 revision closes the two still-current findings after pass 11 without manufacturing an
approval. First, it records the real app-only authorization boundary: the bot identity must have
administrator-consented `Sites.ReadWrite.All`, and both exact helper endpoints must pass a live
create-then-cancel upload-session preflight before S1 can be approved. A working simple PUT no longer
stands in as proof that session creation is deployable. If the grant is absent, the spec must absorb
the app-registration/onboarding/operator-consent work and security review before implementation.
Second, policy is now compiled at the production caller on every send from the current effective
`mediaMaxMb` ceiling and the helper's verified-simple maximum, before `loadWebMedia`. A configuration
reload that raises the ceiling must select `session-above` or reject before allocation; it cannot reuse
a stale `simple-only` record, and the upload helper rejects an above-bound buffer as defense in depth.
The controlled tenant experiment, permission preflights, and heap-policy gate remain outstanding, so
`status: draft` and `verdict: changes_requested` remain authoritative.

# Pass 11 disposition — STILL REVIEW (changes_requested), unchanged

The pass-11 revision closes the three still-current findings after pass 10 without changing scope or
approval state. S3 and the ship gate now branch caller proofs on `DriveUploadPolicy`, so only
`session-above` requires a boundary, SESSION failure, and terminal session id, while `simple-only`
requires SIMPLE success/failure behavior through its recorded accepted ceiling. Policy derivation now
includes the effective `mediaMaxMb` ceiling: a ceiling above the repeatably verified simple range,
including above Graph's documented 250,000,000-byte simple limit, cannot compile as `simple-only`.
Finally, step 0 repeats an ascending matrix and rejects pass-after-fail or non-reproducing observations
as inconclusive instead of converting them into a threshold. The controlled tenant experiment and
heap-policy gate remain outstanding, so `status: draft` and `verdict: changes_requested` remain
authoritative.

# Pass 10 disposition — STILL REVIEW (changes_requested), unchanged

The pass-10 revision closes the four still-current findings after pass 9. Threshold selection now has
one rule: controlled probes produce either `simple-only` or `session-above(largestPassingProbe)` for
each helper, including a mixed result. Graph `416` reconciles against validated server session status
instead of being treated as a terminal `4xx`. Boundary DoD uses formulas rather than fixed 4 MB
fixtures. Typed-error and final-chat assertions both reject the complete upload URL and its unique token
fixture. The controlled tenant experiment and heap-policy gate remain outstanding, so `status: draft`
and `verdict: changes_requested` remain authoritative.

# Pass 9 disposition — STILL REVIEW (changes_requested), unchanged

The pass-9 revision closes all three findings from the cross-provider review of pass 8 without changing
scope or approval state. First, S1 replaces the single scalar routing threshold with a helper-keyed
record, requires both callers to select their own measured value, and adds an intentionally unequal
OneDrive/SharePoint unit case. Second, the heap-policy gate is outcome-specific: only recorded operator
acceptance or proposal option 1 shipping with every production override reader bounded can clear it;
option 2 or a terminal disposition that leaves an override unbounded cannot. Third, G3 now requires a
separate routing-delta red test at `threshold + 1` and a bug-reproduction red test at the smallest
observed failing probe with its recorded simple-PUT response. Only the latter is evidence that the old
code failed as reported. The controlled tenant experiment remains outstanding, so `status: draft` and
`verdict: changes_requested` remain authoritative.

# Pass 8 disposition — STILL REVIEW (changes_requested), unchanged

The pass-8 revision closes the two findings from the review of pass 7 without changing scope or
approval state. First, the live matrix now follows the routing predicate exactly: the helper-specific
largest passing probe is the derived threshold and therefore uses the SIMPLE path, while precisely
`threshold + 1` exercises the SESSION path. Second, the artifact and this sidecar now record pass 8,
and the generated spec index projects that same review/revise cycle. The controlled tenant experiment
remains outstanding, so `status: draft` and `verdict: changes_requested` remain authoritative.

# Pass 6 disposition — STILL REVIEW (changes_requested), unchanged

A cross-provider review of pass 5 agreed with keeping `changes_requested` and with pass 5's step-0
control design, but found three defects in **how pass 5 stated its own AS-IS facts and its own gates**
— contradictions a future reader or implementer could cite to treat unproved or explicitly-reopened
claims as settled. All three are verified against this branch and fixed in the spec/proposal text; the
disposition, the scope, and the ship gates are otherwise untouched.

1. **Active AS-IS prose still stated the disproved/unproved ">4MB fails" premise as fact (medium).**
   §1.1a (pass 4) and the top-of-file banner correctly say the exact simple `PUT .../content` path is
   currently documented up to 250 MB and that no tenant request has reproduced a 4 MB failure. But the
   "0. Product" section still said "the break is real", §1.1 still said SharePoint has "the identical
   4MB cap", and §1.2 still said the proposal's drive-path DoD "stands", that `createUploadSession` is
   "genuinely" required and absent, and that the consent route is "the only working >4MB path". S1's
   `SIMPLE_UPLOAD_MAX_BYTES` code comment likewise stated "Graph's simple PUT /content is documented as
   4MB" as fact, over a hard-coded `4_000_000` threshold — none of that sat inside marked-superseded
   history; all of it was active, present-tense guidance a later pass or implementer could point to in
   order to preserve S1 after the live matrix in §7 step 0 disproves it.
   **Fixed:** all four passages now state the premise as conditional on §7 step 0's outcome — "if step 0
   confirms a failure, then X; if it confirms the 250 MB ceiling, X does not apply" — rather than as
   settled fact. The `SIMPLE_UPLOAD_MAX_BYTES` comment and its surrounding prose are marked UNVERIFIED
   and instruct removing the constant/routing split entirely if step 0 confirms no failure.
2. **The local-media follow-up proposal's DoD permitted a fix that breaks existing behavior and remains
   racy (medium).** `proposals/2026-08-29-gw-local-media-read-before-cap-check.md` accepted a bare
   `fs.stat` size check ahead of the existing `fs.readFile` as a valid DoD option. At the pinned
   implementation, local bytes are read, MIME-sniffed and images optimized *before* the final cap is
   enforced (`src/web/media.ts:209-267`, `:309-324`), and the existing test suite locks in that a raw
   local JPEG above the cap is accepted once optimization brings it under the cap
   (`src/web/media.test.ts:144-153`) — a stat-against-final-cap precheck would reject that file today. A
   bare `stat` immediately followed by an unbounded `readFile` is also a check-then-act race, and the
   codebase's `readFileOverride` seam for virtual/sandbox paths (`media.ts:185-196`, tests `:357-382`)
   has no matching `stat` override.
   **Fixed:** the DoD now explicitly rules out the bare stat-then-read shape, requires a bounded
   read/file-handle protocol with a raw-vs-final ceiling split mirroring the remote path's
   `maxBytes`/`fetchCap` shape, requires the fix to go through the existing override seam, and adds the
   three missing regression tests (compressible-image-above-cap, override-backed virtual path, and a
   grow/replace-during-check race).
3. **The active heap-policy disposition was internally inconsistent (low).** §1.5 and the ship gate
   correctly say the byte-*value* question is settled but the heap-*policy* question (is that value a
   pre-allocation bound) remains open. But S3's "Reuse the existing ceiling" bullet still called the
   ceiling "the gateway's per-upload heap policy" and "already a deliberate human choice", and §3's
   routing-table note said "the pass-2 review's 'flagged for human' item is satisfied by it" — both
   active implementation instructions that could let a later pass close the gate without the required
   measurement.
   **Fixed:** both passages now say only the byte-value half of the pass-2 item is settled; the
   heap-envelope half stays open and points at §7's heap-policy gate and the ledger proposal.

No other change: the ">4 MB fails" premise remains unproved, the drive-path scope remains gated behind
step 0, and `status: draft` / `verdict: changes_requested` stand.

# Pass 5 disposition — STILL REVIEW (changes_requested), unchanged

Pass 5 is a repair pass, not a re-disposition. The pass-4 cross-provider review agreed with pass 4's
`changes_requested` verdict and with keeping the drive-path scope gated rather than deleted, but found
three defects in **how pass 4 stated its own blockers**. All three are verified against this branch and
fixed in the spec; the disposition, the scope, and the ship gates are otherwise untouched.

1. **§7 step 0 could not distinguish a size failure from an environment failure (medium).** The
   mandatory live matrix sent only 4.1 MiB / 12 MiB / ~99 MiB payloads with no sub-threshold control, so
   a 401/403 from the app-only identity, a missing `MinionShared` parent, or a wrong site id would fail
   all three probes and could then be read as proof of a byte ceiling — the exact inference that would
   authorize S1. Compounding it, the step told the operator to configure a SharePoint site id *and* to
   exercise "both `uploadToOneDrive` and `uploadToSharePoint`", which one configuration cannot do:
   verified at the pin, `send.ts:204-222` takes SharePoint whenever `sharePointSiteId` is set and
   reaches OneDrive only when it is absent (`:267-278`), and `:197-202` sends images inline in that
   second case so an image probe never reaches OneDrive at all.
   **Fixed:** §7 step 0 is rewritten as a controlled experiment — 0a (two runs, or direct invocation of
   the two exported helpers; non-image files; not a 1:1 chat, which is the consent path), 0b (a
   known-good ~1 MiB non-image control that must pass before its probes, same tenant/identity/
   destination/config, full method+URL+status+body+size recorded per request), 0c (an explicit reading
   table: failing control ⇒ environment finding that may not approve S1 or derive a threshold; green
   control + all probes green ⇒ premise disproved; green control + a size-specific probe failure ⇒
   derive the threshold from the measurements, not from the 4,000,000 already written in §3; the two
   helpers may disagree and are read per-helper). The top-of-file banner, §1.1a, the ship gate and the
   approval gate all now state the control requirement rather than the uncontrolled matrix.

2. **The pass-4 heap correction was contradicted by three active passages (medium).** §1.3a correctly
   recorded that local files are fully read by `fs.readFile` (`src/web/media.ts:309`) before
   `clampAndFinalize` checks the cap (`:319-324`, `:265-267`) — re-verified this pass against
   `NikolasP98/minion@bd55137`. But §1.5 still said the ceiling is "enforced before the bytes are ever
   in hand", §3's routing table said over-ceiling input is refused "before the buffer exists", and §6
   called buffering "bounded by the existing ceiling". None of those sat inside the marked superseded
   pass-3 history; all three were present-tense guidance, and the first was the sentence used to declare
   the pass-2 heap-policy gate closed.
   **Fixed:** all three now state the same qualified contract — remote reads are bounded *during* fetch,
   local files are read in full and rejected *after*, both reject before any Graph request, only the
   remote path is a heap bound. §1.5 no longer claims to clear G2: the heap-policy gate is explicitly
   reopened, a new **Heap-policy gate** paragraph in §7 makes approval depend on either recorded
   operator acceptance of the measured concurrent-local envelope or a fix, and the required ledger entry
   is filed as
   [`proposals/2026-08-29-gw-local-media-read-before-cap-check.md`](../proposals/2026-08-29-gw-local-media-read-before-cap-check.md)
   (its in-code `TODO(handoff):` half is owed by the first `minion` change to land there — this branch
   may not edit product code).

3. **The `createUploadSession` URL instruction was malformed as written (low).** The simple URLs end in
   `:${uploadPath}:/content` (verified: `graph-upload.ts:42` and `:186`, path built at `:40` / `:183`).
   The spec said to swap `/content` for `:/createUploadSession`, which literally yields
   `...root:${uploadPath}::/createUploadSession`, and the S1 DoD only asserted the OneDrive-vs-SharePoint
   *base* — so a mock would accept the malformed suffix and the defect would surface only against a real
   tenant.
   **Fixed:** §2 S1 now says to replace the trailing `/content` and nothing else, gives both exact
   templates verbatim, and warns against the extra colon; the DoD asserts the **complete** requested URL
   string for each helper and states that a base-only assertion is insufficient.

No other change: the ">4 MB fails" premise remains unproved, the drive-path scope remains gated behind
step 0, and `status: draft` / `verdict: changes_requested` stand. No product code exists for this spec
(re-checked this pass: no matching `NikolasP98/minion` PR or branch), so there is still no WIP to
preserve, reject, or archive.

# Pass 4 disposition — STILL REVIEW (changes_requested), not approved

Pass 3's `approved` disposition is superseded. A cross-provider review of pass 3 found three defects in
the evidence pass 3 used to justify approval; all three are fixed in the spec text as of this pass, and
this sidecar records the disposition change and the evidence for it. **No product code exists for this
spec** — `gh pr list --repo NikolasP98/minion --state all --search "msteams upload"` is empty and no
branch matches `msteam|upload|resumable|86546` (re-checked this pass), so there is nothing to preserve,
reject, or archive at the code level. The disposition is on the *spec*, not on any WIP.

## Why pass 3 was wrong to approve, and what changed

1. **The defining ">4MB fails" claim is unverified and contradicted by current primary documentation.**
   Pass 3 treated a stale in-repo TODO comment (`graph-upload.ts:26-27`) as proof of a live failure. It
   never was: no pass ever ran a live `PUT` against a tenant to reproduce it, and PR #253's green checks
   only validate the meta-repo spec/proposal index (`claude-review` skipped, `thermonuclear-review`
   skipped). Fetched this pass: Microsoft's v1.0 docs for the exact endpoint shapes this spec targets
   (`.../drive/root:{path}:/content`) state a **250 MB** limit, on a page updated 2026-08-11 — before
   pass 3 was written. At the gateway's own 100 MiB default ceiling, every default-accepted file may
   already fit under the simple `PUT`, which would mean the S1 routing split has nothing to fix. Fixed
   by adding a pass-4 disposition banner, §1.1a, and a mandatory pre-implementation live-check (§7 step
   0) that must run and be recorded before this spec can move to `approved`.
2. **Two false technical claims cleared the pass-2 heap-policy blocker.** Pass 3 (and this sidecar's own
   prior text) asserted `loadWebMedia` enforces the byte ceiling before allocation and that
   `new Uint8Array(chunkView)` is zero-copy. Verified against `NikolasP98/minion@bd55137`: local files
   are fully read by `fs.readFile` (`media.ts:309`) before the length check (`:319-324`, `:265-267`) —
   only remote fetches are bounded during read; and `new Uint8Array(typedArray)` copies (confirmed via
   Node's TypedArray-from-TypedArray semantics), unlike `Buffer`/`Uint8Array.prototype.subarray()`,
   which does share storage. Fixed by §1.3a, a corrected S1 chunking instruction (pass the `subarray()`
   view directly, never wrap it), and a corrected §5 memory-impact row. The local-file pre-allocation gap
   itself is **not** fixed by this spec (out of `extensions/msteams/`'s surface) and stays flagged in
   review rather than silently accepted.
3. **`conflictBehavior: rename` was an unapproved product-policy change.** Pass 3 changed session
   uploads to `rename` while leaving the simple `PUT` on Graph's default `replace`, with no same-name
   test to catch the split — two uploads of the same filename would behave differently purely based on
   size. Fixed: S1 now specifies `replace` (matching current behavior on both paths) and the DoD gained a
   same-name parity case. `rename` remains available as a future, explicitly-approved product decision,
   not something this fix bundles in silently.
4. (Low, also fixed) **Several DoD `rg` probes were miswritten** — a bare `rg` expecting zero matches
   exits 1 on the success case, which fails a correct implementation under `bash -e`. Rewritten as
   explicit `if rg ...; then echo FAIL; exit 1; fi` assertions everywhere this pattern occurred.

## Disposition

**`changes_requested` / still-review**, evidence-based:
- The proposal's underlying problem statement (§0) is not retracted — the consent-path chunking gap
  (§1.2) and the unverified ~60 MiB Graph fragment ceiling (§4) are real, independently-evidenced
  findings that do not depend on the disputed 4 MB claim and remain in scope.
- The drive-path routing fix (S1's core mechanism) is **not** confirmed necessary. It stays in the spec,
  gated behind a mandatory live pre-check (§7 step 0), rather than being deleted outright — deleting it
  now would be guessing in the other direction with no more evidence than pass 3 had.
- Do not re-approve this spec on documentation review alone. The next pass must either (a) attach the
  step-0 live-check results and re-scope accordingly, or (b) explicitly accept the residual risk of
  approving without that check, which is a human call this reviewer is not making unilaterally.

## Superseded — Pass 3 disposition — APPROVED (kept below for history, no longer authoritative)

**Disposition: `approved`** (status `approved`, verdict `approved`, pass 3). The pass-2 blocker was a
single "flagged for human" policy question; it was resolved with code evidence rather than with a
guess, and three substantive scope defects were found and fixed in the same pass.

## Evidence base

Pass 1 and pass 2 were written blind — `minion/` is not checked out in the meta-repo, so every code
claim was carried from the proposal and four assumptions (A1–A4) were deferred to a "Slice 0". **Slice
0 was executed for this pass** against `NikolasP98/minion` branch `DEV` at commit **`bd55137`**
(read-only sparse checkout of `extensions/msteams` + `src/channels`). All findings are in spec §1 with
file:line anchors.

## Why the human gate is cleared

The pass-2 review flagged: *"Choose and record an explicit byte value for `MAX_UPLOAD_BYTES`, no
greater than the verified destination limit and acceptable as a per-upload gateway heap bound."*

That value already exists, is already a deliberate product policy, and is already configurable:
`MSTEAMS_MAX_MEDIA_BYTES = 100 * 1024 * 1024` (`send.ts:47`, `messenger.ts:29`), overridable by
`cfg.channels.msteams.mediaMaxMb` → `cfg.agents.defaults.mediaMaxMb` via `resolveChannelMediaMaxBytes`
(`src/channels/plugins/media-limits.ts`), and **enforced before the buffer is ever allocated** by
`loadWebMedia(mediaUrl, mediaMaxBytes)` (`send.ts:128`). *[Pass-4/5 correction: the emphasised clause is
false for local paths — see §1.3a and the pass-5 section above. Retained verbatim as the historical
record of why pass 3 wrongly considered the heap-policy gate closed.]* The pass-2 requirement was an artifact of not
being able to read the repo. Adding a new `MAX_UPLOAD_BYTES` would have created a second, conflicting
ceiling on the same axis. S3 now reuses the existing one and S3's DoD asserts
`rg -n 'MAX_UPLOAD_BYTES' extensions/msteams` returns zero. **No human policy decision is outstanding.**
*[Pass-5 correction: that last sentence is wrong. Reusing the existing constant settles which byte
*value* to use, but not whether it is an acceptable per-upload heap bound — which it is not on the local
path. The heap-policy gate is open; see the pass-5 section above.]*

## Defects found by recon and fixed in this pass

- **The proposal pointed at the wrong function — the primary path was out of scope.** The `:27` TODO
  sits on `uploadToOneDrive`, which is the *fallback*, taken only when no `sharePointSiteId` is
  configured. `uploadToSharePoint` (`graph-upload.ts:171`) is the preferred path
  (`send.ts:214`, `messenger.ts:326`), has the identical 4MB simple-PUT cap, and **carries no TODO**.
  A fix scoped to the literal TODO would have closed the proposal with the main bug live. S1's DoD now
  requires every case to run against both functions.
- **A1 resolved as "both", and the consent path is already built.** `file-consent.ts` (landed
  `0f7f7bb9`, 2026-01-22 — seven months before this spec was drafted) implements the personal-chat
  consent flow end to end, including `uploadToConsentUrl` (`:107`), a single full-file PUT with
  `Content-Range` and correctly no `Authorization` header. It needs the chunk loop but not session
  creation. Added as S3's third call site; S2 gains a typed `session-expired` path for when no
  recreation callback is supplied.
- **The consumer surface was misidentified.** The spec asserted `minion/src/channels/` as the read-only
  consumer. Recon found **zero** references to any msteams upload function under `src/`; the only
  coupling is the `minion/plugin-sdk` import at `send.ts:2`. §5 and S3's diff guard were retargeted.
- **A new no-leak surface.** `monitor-handler.ts` posts `` `File upload failed: ${String(err)}` ``
  **into the user's Teams chat**. Safe today (the thrown error carries only status/statusText), but S2's
  new typed error flows into that same string — so its `message` must stay URL-free, with a test.
- **Test baseline corrected** from "148" (a stale figure quoted from
  `2026-07-08-package-updates-tracking.md:153`) to 14 test files / ~143 cases at the pin, with an
  explicit instruction to assert no regression rather than hardcode a count.
- **A second latent bug surfaced.** Today's consent path sends the whole file in one PUT, so if Graph's
  per-request fragment ceiling (~60 MiB, medium confidence) is real, files between it and the 100 MiB
  gateway ceiling fail silently today. §4 now makes verifying that number a ship-gate line item.
- Slice 0 deleted from the plan (executed, not carried); §7 now requires live verification on **both**
  a SharePoint-configured conversation and a 1:1 chat.

## WIP check

No work in progress to preserve. `gh pr list --repo NikolasP98/minion --state all --search "msteams
upload"` → empty; no branch on `NikolasP98/minion` matches `msteam|upload|resumable|86546`. Nothing in
minion-meta references this spec beyond the proposal, the two index files, and `specs/topics.json`.

## Residual risk accepted at approval

- Every §4 row not marked **verified (code)** is still stated from model knowledge of the Graph API,
  not from a document read during this pass. They are ship-gate line items, not approval blockers — the
  design is invariant under any plausible revision of the constants.
- `DEV` moves. The pin is `bd55137`; the implementer re-verifies §1 before S1 and treats a moved fact as
  a G0 reconciliation finding rather than a licence to re-scope.
