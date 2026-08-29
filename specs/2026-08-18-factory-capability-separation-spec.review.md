---
spec: 2026-08-18-factory-capability-separation-spec
pass: 3
verdict: changes_requested
reviewer: factory-review-fix
created: 2026-08-18
updated: 2026-08-29
---

# Pass 3 review (respec — operator-directed)

## Trigger

Cross-provider review of the prior branch found it a no-op: `pass: 2`/`status: draft`/`verdict: approved` was left
unchanged even though its own trailing "Board audit 2026-08-28" note already said the spec had been returned to
draft because the proposed GitHub-App/publisher architecture was superseded by a scoped-PAT + effect-ledger
implementation that had since landed. The task required an evidence-backed operator disposition
(approved/rejected/archived/still-review), not a byte-identical branch.

## Verification performed this pass

- Read local checkouts of `NikolasP98/minion-factory@5db7d3919896042043e63da996d6441ec63db205` (main, PR #153
  merged) and `NikolasP98/minion-base@19531059cf42e352e35425dd3b3b71afa9eb540f` (main).
- Confirmed the scoped-credential foundation is real, not aspirational: `runner/src/containers.ts` (purpose set +
  deny-by-default credential boundary), `runner/src/containment-effects.ts` (trusted effect adapter),
  `runner/src/scoped-github-canary.ts` (activation canary), `runner/src/db.ts:757-813` (`pipeline_instances` +
  `phase_effects`) — all gated to `dev`-kind runs with `FACTORY_CONTAINMENT_V2=1` (default `0`).
- Confirmed the remaining gaps named in the source proposal are still live: `runner/src/github.ts:6-16` (shared
  `FACTORY_GH_TOKEN` backing every `gh()` call, including meta commits via `lifecycle.ts:8`),
  `runner/src/queue.ts:2101-2113` (`legacyCredentialTransport` injects the same PAT into every spec/reconcile/non-v2
  dev run), `agent/run.sh:79-83` (direct memory PUT to canonical `minion-agent-memory` with the same PAT),
  `runner/src/index.ts:683,701-719` (caller-supplied `by` still accepted for admin callers on both the `status` and
  `disposition` lifecycle branches), `minion-base@.../src/lib/server/meta-write.ts:13-45,126-145` (direct
  Contents-API `PUT` with `env.GITHUB_TOKEN`, no factory-authenticated actor).
- Read closed/unmerged `minion-factory` PR #29: confirms a prior pass-1/pass-2-design implementation attempt was
  correctly self-postponed for lack of a persisted authority record, and that the specific record it needed
  (`pipeline_instances`) has since landed — but under a different mechanism than the App-based design it was
  written against.
- Cross-checked `related` spec statuses (`specs/index.json`): topic-capability-manifest now `shipped`;
  durable-state-outbox still `implementing`/`changes_requested`; worker-containment `approved`; memory-governance
  `approved`; m0-safety-foundation `implementing`/`approved`; base-kanban-possibly-shipped-surface `done`/
  `changes_requested`.
- Consulted `/memory/MINION/MEMORY.md`, `/memory/MINION/factory-moving-origin-strategy-implementation.md` (2026-08-28
  board-audit entry independently reached the same "approved→draft for respec" disposition with the same live-delta
  list), `/memory/MINION/sdlc-board-triage-and-phase-gates.md`, and
  `/memory/MINION/projects-github-repo-link-and-factory-gates.md`.

## Changes made this pass

- Rewrote AS-IS with the current evidence above; removed the GitHub-App/installation-token AS-IS framing.
- Rewrote TO-BE to extend the landed purpose-scoped-credential + trusted-adapter pattern to all run kinds and all
  non-worker PAT consumers, instead of proposing GitHub Apps or a new `CapabilityGrantEnvelope` table.
- Rewrote DELTA and the vertical-slice Approach section from 6 slices to 4, dropping the two slices whose target
  (target-purpose scoping + trusted adapter/canary) is already shipped, and adding the previously-missing `meta`
  purpose and legacy-path scoping to Slice 1.
- Updated the Relationship recommendation, Cross-repo impact table, Out-of-scope list, End-to-end verification, and
  Rollout/rollback sections to match.
- Set `pass: 3`, `updated: 2026-08-29`, `status: review`, `verdict: changes_requested`. Retitled to drop
  "GitHub Apps" from the title since that mechanism is no longer proposed.
- Added a "Board respec 2026-08-29" section recording the disposition and its evidence; kept the prior "Board audit
  2026-08-28" note for history, marked superseded.

## Disposition and why not `approved`

`status: review` / `verdict: changes_requested` — the conservative option named by the prior review round. The
security gap the source proposal names (§1 points 4-6: shared PAT across meta/legacy-target/memory, caller-spoofable
`by`, minion-base's raw-PAT write path) is real, current, and independently corroborated by operator memory. This
pass's rewrite is evidence-based and internally consistent, but a fresh correctness pass should re-verify exact file/
line anchors and the named `T-*` test IDs against the runner test suite at implementation time before slices start —
this pass did not run the runner test suite or attempt to write any product code, per the task's explicit
instruction not to implement while the spec is not validly approved.

## Human flags

None blocking. Flagging for the next reviewer: `2026-08-18-factory-durable-state-outbox-spec` remains
`changes_requested` — this spec's Slice 1 evidence work depends only on already-landed `pipeline_instances`/
`phase_effects`, not on that spec's own unresolved design, so it is not a hard blocker, but a reviewer should
confirm that reasoning still holds at implementation time.
