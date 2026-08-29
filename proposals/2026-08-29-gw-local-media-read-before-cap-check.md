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

- A local-path size check that runs **before** the file contents are read —
  `fs.stat` (or the `readFileOverride` equivalent) compared against the same
  effective cap, throwing the same `formatCapLimit("Media", cap, size)` error —
  or a streaming/bounded local read that stops at the cap.
- A regression test that a local file above the cap is rejected **without**
  reading it: assert via a `readFileOverride` / spy that no full read occurred
  (a size-only assertion cannot distinguish the two behaviors and is not
  sufficient).
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
