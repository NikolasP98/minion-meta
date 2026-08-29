---
spec: 2026-08-17-gw-msteams-large-upload-spec
pass: 4
verdict: changes_requested
reviewer: factory-review
created: 2026-08-17
updated: 2026-08-29
---

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
`loadWebMedia(mediaUrl, mediaMaxBytes)` (`send.ts:128`). The pass-2 requirement was an artifact of not
being able to read the repo. Adding a new `MAX_UPLOAD_BYTES` would have created a second, conflicting
ceiling on the same axis. S3 now reuses the existing one and S3's DoD asserts
`rg -n 'MAX_UPLOAD_BYTES' extensions/msteams` returns zero. **No human policy decision is outstanding.**

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
