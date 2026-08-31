---
id: 2026-08-29-base-meta-status-revision-binding-required
title: "Base gate endpoint accepts unbound mutations — make expectedStatus + expectedRevision mandatory"
status: approved
created: 2026-08-29
updated: 2026-08-31
repos: [minion-base]
tags: [security, logic]
approved_reason: "Ranked-queue supervisor approval: board-goal-v2 score 81/100, recommendation execute, readiness specification 10/10 and implementation 9/10; live admission threshold 80/100 and readiness threshold 6/10."
---

# `POST /api/meta/status` must require the revision guard it advertises

## Origin

Review finding on minion-meta PR #275 (spec-stage re-verification of
`2026-08-18-minion-base-mobile-hitl-ux-plan`). That plan makes revision binding a
non-negotiable for every base UI change; the shipped gate endpoint honors it only
when the caller volunteers the guard. Recorded there as an open contract gap in the
UI-001 row and in the disposition; this proposal is the implementable follow-up.

## AS-IS (evidenced)

Read from `minion-base@main` `19531059cf42e352e35425dd3b3b71afa9eb540f` via the
GitHub contents API:

- `src/routes/api/meta/status/+server.ts:16-25` — `expectedStatus` and
  `expectedRevision` are typed optional on the request body.
- `:26-27` — the only hard requirements are `kind` (`proposal|spec`), `id` and
  `status`. A body with neither guard passes validation.
- `:29-32` — both optional values are forwarded verbatim to `applyTransition()`.
- `src/lib/server/meta-write.ts:90-95` — `expected?: { status?, revision? }`.
- `:114-119` — the `revision_conflict` branch is evaluated only for whichever
  guard is present; with neither present it cannot fire.
- `:126-132` — the write then proceeds against `md.sha`, the blob the server itself
  fetched milliseconds earlier.

Two protections do hold unconditionally and must not be regressed: the source→target
`TRANSITIONS` table (`:64-78`, enforced `:121-124`) and GitHub's own sha CAS on the
PUT (`:128-132`). Neither expresses the invariant at issue — they prove the write is
legal and non-racing, not that the operator saw the state they approved.

The shipped caller is not the problem: `src/routes/kanban/[kind]/[...ref]/+page.server.ts`
sends both guards on every gate (`:321`, `:523-524`, `:535-536`). The exposure is the
unguarded direct path — a stale tab replayed after a deploy, a curl, a script, or any
future client — which can commit a status flip that a human never reviewed at that
revision. The board's gates are the fleet's human-in-the-loop boundary, so this is a
trust-boundary gap, not a client bug.

## TO-BE

`POST /api/meta/status` refuses to mutate unless the caller states what it reviewed.

Invariants that must NOT change: the `TransitionOutcome` union and its status-code
mapping (409/422/500/202) stay as-is; `already_applied` stays a no-write success;
the `approved_queue_pending` partial-success path and its `retryState` stay intact;
the Playwright fixture short-circuit (`meta-write.ts:96-101`) keeps working.

## DELTA

1. Reject with 400 when `expectedStatus` or `expectedRevision` is absent or not a
   string, before any GitHub read or write.
2. Tighten `applyTransition()`'s signature so `expected` is required and both fields
   are non-optional — the type system, not a runtime `if`, carries the invariant.
3. Evaluate the guard before the `already_applied` early return, so a replay against
   a stale revision conflicts instead of reporting success.
4. Update the E2E fixture ids/tests if step 3 changes their observable outcome.

## Out of scope

- Persisting decision receipts / making `approved_queue_pending` durable — same
  non-negotiable sentence, different missing mechanism (base has no datastore); a
  separate proposal.
- The factory-side durable decision API and event log (M2), and anything under
  UI-008/009/010.
- Any change to the UI's own call sites, which already comply.

## Definition of done

- `POST /api/meta/status` with a body omitting either guard returns 400 and performs
  zero GitHub reads or writes (asserted, not assumed).
- A stale `expectedRevision` and a stale `expectedStatus` each return 409 with the
  current `{status, revision}` — including when the target status already equals the
  current status.
- A correct guarded request still returns `transition_committed` with `indexSynced`,
  and the approve path still yields `approved_and_queued` or the 202
  `approved_queue_pending`.
- Existing base tests (`src/routes/kanban/issue-route.test.ts`, the E2E matrix) stay
  green.

## Decision requested

Approve for a slice-scoped dev run on `minion-base` (base branch `main`). Tagged
`security`, so human gates stay at approval AND merge.
