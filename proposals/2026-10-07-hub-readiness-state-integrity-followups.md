---
id: 2026-10-07-hub-readiness-state-integrity-followups
title: Open-items ledger for the readiness state-integrity batch (HC-040, HC-037) + NOTIF-019
status: draft
created: 2026-10-07
updated: 2026-10-07
repos: [minion_hub]
tags: [todo, handoff-sweep, ui, logic, data, test]
value: 6
effort: M
source: readiness-state-integrity-batch-2026-10-07
---

# Readiness state-integrity batch — open-items ledger

## Problem

The 2026-10-07 state-integrity lane (hub branch `fix/readiness-hub-state-integrity`, base
`master` `802a62d0`, worktree `~/.cache/claude-tmp/hub-ui2-wt`; commits pending signing, no PR
yet) closes two findings from `2026-10-02-hub-gateway-production-readiness-recon` and leaves one
`TODO(handoff)` marker plus five stated scope boundaries behind. A third item, NOTIF-019, is a
new finding from the hosted CI lane that has no spec yet and is tracked here so it is written
down. Per AGENTS.md's open-items ledger rule every one of them lives here or it never gets
fixed. This proposal authorizes no change by itself.

Specs this ledger closes the loop for:

| Spec | Finding | Commit | PR |
|---|---|---|---|
| `2026-10-07-readiness-flow-export-ownership-spec` | HC-040 | staged in `hub-ui2-wt`, message `~/.cache/claude-tmp/hc040-msg.txt` | pending |
| `2026-10-07-readiness-workshop-workspace-lifecycle-spec` | HC-037 | unstaged in `hub-ui2-wt`, message `~/.cache/claude-tmp/hc037-msg.txt` | pending |

Originating approved proposals: `2026-10-03-readiness-flow-export-ownership`,
`2026-10-03-readiness-workshop-owned-persistence`.

## AS-IS

Collected mechanically on 2026-10-07 from the implementation checkout (staged + unstaged):

```
git -C ~/.cache/claude-tmp/hub-ui2-wt grep -n "TODO(handoff)" -- src tests | grep -E "HC-040|HC-037"
```

Counts: HC-040 = 1, HC-037 = 0 (the four pre-existing `HC-037` markers at
`workshop.svelte.ts:410,439,460` and `agents/workshop/+page.svelte:45` are removed by the
change). Total 1. Line numbers are as of the uncommitted tree.

### HC-040 — flow export ownership (1)

| # | Site | TODO text (verbatim) | Needs | Priority |
|---|---|---|---|---|
| 1 | `src/lib/components/flow-editor/FlowExports.svelte:30` | `TODO(handoff): HC-040 — give agents/autonomous/[id]/+page.server.ts a depends() key so a targeted invalidate() can replace this memory (list page has one).` | `depends('agents:autonomous:flow')` (or similar) in `agents/autonomous/[id]/+page.server.ts`; `FlowExports` calls `invalidate(key)` on an accepted write and drops the `accepted` `SvelteMap`; a mounted case asserting the reloaded prop replaces the memory. | P3 — the memory is correct except at the ceiling in U1 |

### HC-037 — workshop workspace lifecycle (0 markers)

No `TODO(handoff)` was left; the stated scope boundaries are in the next section.

### Unmarked open ends (no in-code `TODO(handoff)`)

| # | Finding | Open end | Needs | Priority |
|---|---|---|---|---|
| U1 | HC-040 | Accepted-value memory ceiling: reloaded `toggles` equal to the dispatch `base` after an accepted write is indistinguishable from the stale prop, so the accepted value keeps showing until the next differing reload or a remount. | Same work item as #1 (targeted `invalidate`), or the PATCH `/api/flows/[flowId]/exports` reply echoing the stored value so the client needs no memory at all. | P3 |
| U2 | HC-037 | Server-side versioned PUT / conflict detection: `/api/workshop/saves/[id]` stays last-writer-wins; two tabs or two users on one save overwrite each other silently. | `version`/`updated_at` precondition on the PUT (`409` on mismatch); `saveSync.status` gains `conflict`; the toolbar offers reload-or-overwrite. Data-tagged ⇒ human gates at approval and merge. | P2 — silent data loss across sessions |
| U3 | HC-037 | Canvas consumers' handling of a mid-frame workspace swap: `openSave` can publish a new workspace while the PixiJS/Rapier canvas is mid-frame on the previous one; sprite/joint teardown vs the new state was not audited. | Audit `src/lib/workshop/` + `components/workshop/` consumers of the workshop state for swap safety (generation check or a `key` on the canvas mount); one mounted case that swaps during a frame. | P3 |
| U4 | HC-037 | Legacy single-key autosave migration: the pre-per-host localStorage key shape is still read/written as before; not migrated or cleared. | Decide: migrate on first read then delete the legacy key, or drop legacy reads after a release. | P3 |
| U5 | HC-037 | List delete stays pessimistic (row removed only after the DELETE is acknowledged; rejection toasts). An optimistic delete with rollback was explicitly not built. | Only if product wants it: `createOptimistic` removal + restore on rejection. | P4 — behaviour is correct, just not instant |

### NOTIF-019 — hosted jobs lane: audience revalidation intermittently unavailable (new finding)

| # | Finding | Open end | Acceptance | Priority |
|---|---|---|---|---|
| N1 | NOTIF-019 | On the hosted CI lane `jobs-stock-finance-postgres` (`.github/workflows/ci.yml:292`), notification audience revalidation intermittently reports `revalidation_unavailable`, and `src/server/services/notifications/projection/revalidate.ts:365` (`revalidateNotificationCandidate` catch-all: `throw new NotificationProjectionUnavailable('revalidation_unavailable')`) discards the underlying error — no `cause`, so the lane log cannot say whether it was the `3s` `statement_timeout` (`revalidate.ts:105`), the `250ms` `lock_timeout` (`revalidate.ts:106`), the `RevalidationBudget` (`revalidate.ts:58`), or a connection failure. The same lane is green locally. | (1) `NotificationProjectionUnavailable` carries `{ cause: error }` at `revalidate.ts:365` (and the other `revalidation_unavailable` throw sites at L68, L110, L250, L320, L331 where an underlying error exists) and the lane log prints it; (2) the 3 s statement budget and the 250 ms lock budget are measured on the hosted runner (p50/p95 from the lane log) and either hold or are retuned with the measurement attached; (3) **three consecutive green hosted runs** of `jobs-stock-finance-postgres` after the fix. | P2 — the hosted lane is the merge gate for the notifications work (hub #435); an undiagnosed intermittent red blocks it |

## TO-BE

Every row above is either closed by a commit that removes its marker / lands the item (and the
row is struck through with the commit sha) or explicitly rejected with a reason. `git grep
"TODO(handoff)" | grep -E "HC-040|HC-037"` on hub `master` returns only rows still open here.
NOTIF-019 gets its own spec once the cause is attached; until then this row is its only record.

## DELTA

Suggested grouping into slices (each a junior-dev half day):

1. **CI gate first:** N1 (NOTIF-019) — attach the cause, re-run the hosted lane, read the real
   error before touching budgets.
2. **Data integrity:** U2 — versioned PUT, its own spec (data-tagged, human gates).
3. **Cheap closure:** #1 + U1 together — one `depends()` key and one `invalidate`, delete the
   memory.
4. **When touching the workshop canvas:** U3, U4, U5 — batch with the next workshop change.

## Out of scope

Re-doing HC-040 or HC-037; the hub S5 notifications lane itself (`2026-10-05` specs); any
budget change for NOTIF-019 before its cause is measured.

## Definition of done

- Every numbered row has a closing commit sha or a rejection reason.
- The `git grep` command in AS-IS returns no rows that are absent from this file.
- NOTIF-019 has a cause attached in the hosted lane log and three consecutive green runs.
- `proposals/index.json` regenerated (`node scripts/proposal-index.mjs`) on every edit.
