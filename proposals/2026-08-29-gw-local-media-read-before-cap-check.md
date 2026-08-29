---
id: 2026-08-29-gw-local-media-read-before-cap-check
title: "loadWebMedia reads local files in full before checking the media cap — the byte ceiling is not a heap bound on that path"
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion]
tags: [logic, edge-case]
value: 5
effort: M
source: spec-2026-08-17-gw-msteams-large-upload-spec-pass-5
---

# `loadWebMedia` reads local files in full before checking the media cap

Filed as the open-items ledger entry required by AGENTS.md for a gap that
[`specs/2026-08-17-gw-msteams-large-upload-spec.md`](../specs/2026-08-17-gw-msteams-large-upload-spec.md)
§1.3a / §1.5 identified but cannot fix: that spec's surface is
`minion/extensions/msteams/`, and this defect is in `minion/src/web/media.ts`.

## Problem

`resolveChannelMediaMaxBytes` / `mediaMaxMb` (default `MSTEAMS_MAX_MEDIA_BYTES`
= 100 MiB, `extensions/msteams/src/send.ts:47`, `messenger.ts:29`) is described
across the gateway as the per-upload heap bound. It is one only for **remote**
media.

At `NikolasP98/minion@bd55137`:

- Remote URLs go through `fetchRemoteMedia({ url, maxBytes: fetchCap, ... })`
  (`src/web/media.ts`), which enforces the cap **while streaming** the response.
  The bound holds.
- Local paths take `const data = readFileOverride ? await readFileOverride(mediaUrl) : await fs.readFile(mediaUrl)`
  (`src/web/media.ts:309`) — the **entire file** is allocated unconditionally —
  and are only rejected afterwards by `clampAndFinalize` (call site `:319-324`,
  non-image length check `:265-267`).

So an oversized local file is fully resident in heap before it is refused, and N
concurrent local sends can exceed the configured ceiling by a factor of N with
no back-pressure. Nothing rejects before allocation on that path. A pass-3
revision of the msteams spec used the opposite (false) claim as the evidence
that cleared a human heap-policy gate; that gate is now reopened, and it cannot
close until this is either measured-and-accepted or fixed.

The user-visible failure mode is a gateway OOM triggered by local media a
configured cap says should have been refused for free.

## Definition of done

- **No bare `fs.stat`-then-`readFile` gate.** A raw `stat.size > cap` rejection
  is not behavior-preserving: at the pinned implementation, local bytes are
  read, MIME-sniffed, and images are optimized **before** the final cap is
  enforced (`src/web/media.ts:209-267`, `:309-324`), and the existing test
  suite locks in that a local JPEG whose **raw** size exceeds the cap is
  accepted once optimization brings it under the cap
  (`src/web/media.test.ts:144-153`). A stat-based precheck against the final
  cap would reject that file today, regressing a currently-working send.
  `stat` immediately followed by an unbounded `readFile` is also a
  check-then-act race — the file can grow or be replaced in the window
  between the two calls, defeating the bound the check exists to enforce.
- **A bounded read/file-handle protocol instead**, not a stat precheck: read
  local files through a mechanism that cannot allocate past a defined
  raw-input ceiling regardless of on-disk size — e.g. a file handle read or
  bounded stream that stops (and rejects) at that ceiling without
  materializing the remainder. Define the ceiling consistently with the
  remote path's existing two-tier shape (a raw pre-optimization ceiling
  distinct from the final post-optimization `cap`, mirroring
  `fetchRemoteMedia`'s `maxBytes`/`fetchCap` split), so a compressible local
  image above the final cap but within the raw ceiling is still accepted,
  matching today's behavior.
- **Preserve the `readFileOverride` seam.** The current implementation
  supports virtual/sandbox paths through a `readFile` override with no `stat`
  override (`media.ts:185-196`, tests `:357-382`). Any bounded-read mechanism
  must go through that same seam (or add a matching override), not call
  `fs.stat` directly — a bare `fs.stat(mediaUrl)` rejects override-backed
  paths that have no corresponding host file, which currently work.
- A regression test: a compressible local image whose **raw** size is above
  the final cap but optimizes below it is still accepted (mirrors
  `media.test.ts:144-153`) — proves the fix does not regress the existing
  optimize-then-clamp path.
- A regression test: an override-backed (`readFileOverride`) local path with
  no corresponding host file still works — proves the fix does not call
  `fs.stat` on a path that only exists virtually.
- A regression test: a local file that grows or is replaced in the window
  between the size check and the read completing does not result in an
  allocation beyond the raw-input ceiling — proves the fix is bounded, not a
  check-then-act race.
- Symmetry test: remote and local paths reject the same oversized payload with
  the same error text and the same effective cap.
- The in-code half of the ledger clause is added at the exact site the first
  time `src/web/media.ts:309` is touched — `TODO(handoff): local read is
  unbounded; cap is checked at :319-324, after allocation. See minion-meta
  proposals/2026-08-29-gw-local-media-read-before-cap-check.md` — and removed
  with the fix. It is **not** present today: this proposal was filed from the
  meta-repo on a spec-only branch that may not edit `minion` product code
  (the msteams spec's own S3 `git diff` gate forbids it), so the marker is
  owed by the first `minion` change that lands here.
- Whichever way it lands, the measured worst-case concurrent-local-upload heap
  envelope is recorded, so the msteams spec's heap-policy gate can be closed on
  evidence rather than on assertion.

## Out of scope

- Full streaming uploads (buffer → stream) through `loadWebMedia` and every
  channel that calls it. That is a much larger change with fleet-wide callers;
  this proposal only asks that the existing cap be enforced before allocation.
- The MS Teams resumable-upload work itself
  (`2026-08-17-gw-msteams-large-upload`) — independent, and blocked on its own
  live-check evidence.
- Any change to the cap's value, its config surface, or its resolution order.
