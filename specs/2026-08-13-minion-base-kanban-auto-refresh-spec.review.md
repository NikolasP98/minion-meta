---
spec: 2026-08-13-minion-base-kanban-auto-refresh-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-13
---

# Pass 2 review — minion-base /kanban auto-refresh

Read the spec end to end against its two ancestor specs
(`2026-08-12-minion-base-v2-sdlc-kanban-spec.md`, `2026-08-12-minion-base-lifecycle-dashboard.md`),
`proposals/2026-08-13-minion-base-kanban-auto-refresh.md`, and the root `AGENTS.md`. All carried-over
facts (Project Map row count, the ~22-call fan-out figure, the `s-maxage=300` claim, the proposal
quote in §0) check out verbatim against their sources. Found one substantive algorithm bug and two
mechanical script bugs; fixed all three in place. No product-judgment call was required, so verdict
is `approved`.

## Changes made

1. **Added D6 — floored the retry delay to close a fetch-storm bug (new §2 subsection, S2 required
   behaviour, S2 test list).** D1/D2 explicitly design for a `refresh()` that resolves without
   `lastFetchedAt()` advancing (a coalesced hit on the 60 s shared cache). But S2's original
   schedule formula, `max(0, intervalMs - (now() - lastFetchedAt()))`, computes ~0 for the *next*
   delay in exactly that case — the elapsed time already exceeded `intervalMs` when the timer that
   just fired did so. The controller would then retry almost immediately, and if that retry also
   lands on the still-warm cache, retry again, busy-looping until the CDN entry naturally expires.
   That is precisely the fetch-storm A1 was written to prevent, and it would be self-inflicted by
   the scheduler on a scenario the design explicitly names as an expected outcome — not an edge
   case. None of S2's nine original test bullets exercised "refresh resolves but the timestamp
   doesn't move," so the gap had no test coverage either. Fixed by exporting `MIN_RETRY_MS =
   60_000` (matching D2's `s-maxage=60`) and flooring the retry at
   `max(MIN_RETRY_MS, intervalMs - (now() - lastFetchedAt()))` when `lastFetchedAt()` didn't
   advance, folded into S2's required-behaviour list and its `controller.test.ts` DoD bullet list.
   This is a correctness fix to the algorithm as specified, not a product decision — made directly.

2. **Fixed inverted exit-code logic in the PR scope guard (§5).** The original
   `git diff ... | rg -v '...' && echo FAIL && exit 1` relies on `&&` short-circuiting, but `rg`
   exits 1 (not 0) when it finds *no* matching lines — which is the "everything is in scope,
   nothing to report" case. So the script exited nonzero (silently, no message) exactly when the
   diff was clean, and only printed "FAIL" in the already-correctly-detected bad case. As written
   it could never report success. Rewrote as capture-then-test:
   `out="$(... | rg -v ...)"; [ -z "$out" ] || { echo FAIL...; echo "$out"; exit 1; }`, which exits
   0 on a clean diff and 1 with the offending file list otherwise.

3. **Fixed literal ellipsis placeholders in the §7 cache-staleness probe.** Two `curl` invocations
   (`A=$(curl -s -u … "$BASE/kanban/__data.json" ...)` and its `B=` counterpart) used a literal `…`
   character where the `-u "minion:$DASH_PASSWORD"` credential flag belongs — not valid shell if
   copy-pasted, and inconsistent with the correct form already used earlier in the same section
   (§7 block 2: `curl -sI -u "minion:$DASH_PASSWORD" ...`). Replaced both with the same
   `-u "minion:$DASH_PASSWORD"` used elsewhere in the file.

## Checked and found consistent (no change)

- Proposal quote in §0 matches `proposals/2026-08-13-minion-base-kanban-auto-refresh.md` verbatim.
- `s-maxage=300` claim (§1, D2's contradiction note, N2) matches
  `2026-08-12-minion-base-v2-sdlc-kanban-spec.md` §1 line-for-line.
- "~22 GitHub API calls" (A1) matches `2026-08-12-minion-base-lifecycle-dashboard.md` Architecture
  section; the 264+ calls/hour and ~5%/board arithmetic in A1 both check out.
- "8 directories" / minion-base absent from the Project Map (N1) matches the current root
  `AGENTS.md` Project Map table (8 rows, no minion-base entry).
- `relative-time.ts` boundary table (S1) is airtight — every listed test boundary
  (-1, 0, 4999, 5000, 59999, 60000, 3599999, 3600000) lands on exactly one table row with no gap
  or overlap.
- D5's hydration-stability approach (`$state` seeded to `data.fetchedAt`, no `browser` guard) is
  consistent with `$effect` not running during SSR — no mismatch-warning risk.
- The `$effect` wiring in S2 only captures `data.fetchedAt` inside deferred closures (never reads
  it synchronously in the effect body), so it will not re-run and tear down the controller on every
  refresh — this looked like a risk on first read but Svelte 5's dependency tracking (synchronous
  reads only) rules it out.
- §7's 7-row browser probe table is internally consistent with S2/S3's individual DoD probes and
  with D3 (hidden→visible-when-already-due fires immediately).

## Flagged for the human

Nothing — both defects found were mechanical/algorithmic and are now fixed in the spec text itself.
The two deliberate deferrals the spec already calls out (N1: fix `AGENTS.md`'s Project Map in a
follow-up; N2: reconcile `2026-08-12-minion-base-v2-sdlc-kanban-spec` §1's `s-maxage=300` line after
this spec is approved) are pre-existing, intentional scope boundaries stated by the spec itself, not
new findings from this pass — left as is.
