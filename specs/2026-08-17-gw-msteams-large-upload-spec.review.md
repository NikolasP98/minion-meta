---
spec: 2026-08-17-gw-msteams-large-upload-spec
pass: 3
verdict: approved
reviewer: factory-review
created: 2026-08-17
updated: 2026-08-29
---

# Pass 3 disposition — APPROVED

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
