---
spec: 2026-08-20-handoff-minion-hub-1323254565-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-20
---

# Pass 2 review — CRM similarity deposit-rule handoff

## Changes made

1. Set the spec to pass 2 with `status: approved`, `updated: 2026-08-20`, and
   `verdict: approved` because every correctness issue was resolvable from the approved canonical
   contract and verified source.
2. Replaced the stale claim that the Journey sibling had no spec with its existing draft/pass-1
   spec link and status, while keeping that unapproved draft non-authoritative for this slice.
3. Replaced the broken `dev-process-specs-is-the-live-system.md` citation and vague branch warning
   with `/memory/MINION/MEMORY.md`'s hard constraint that Hub `dev` was deleted, plus review-time
   evidence that `master` is the remote default and `dev` is absent.
4. Made Slice 0 query the remote default branch explicitly because Hub's remote `CLAUDE.md` still
   describes the superseded `dev` integration flow and `git branch -r` alone does not identify the
   default.
5. Clarified that immediate rule freshness is guaranteed by canonical S2's resolver contract,
   while this slice proves only that `buildWinIndex` adds no cache and retains no module default.
6. Preserved the disabled early return explicitly and required enabled calls to invoke
   `resolveDepositRule` exactly once with the caller's `ctx`, making “per call” measurable without
   adding a settings read to the disabled path.
7. Corrected the default-rule unit proof to mock `DEFAULT_DEPOSIT_RULE` rather than claiming a
   mock-only consumer test proves the absence of a real `crm_settings.value.deposit` key; canonical
   resolver tests own that boundary.
8. Strengthened the custom and disabled unit cases with exact resolver call-count/context
   assertions so configured SQL cannot pass while resolving the wrong tenant or resolving twice.
9. Replaced the unconditional two-file PR requirement with a conditional scope rule: exactly two
   files when the resolver pre-exists, or explicitly traced canonical/sibling files when the
   prerequisite is co-delivered as the spec itself permits.
10. Updated DELTA #3, the impact table, file ownership, and the ship gate to use that same
    conditional rule, removing the prior contradiction between prerequisite co-delivery and scope
    verification.
11. Replaced the ineffective end-to-end marker command, which searched the wrong
    `crm_similarity.service.ts` text and used `|| true`, with a fail-on-match guard for the exact
    source marker; applied the same unambiguous guard in the slice DoD.
12. Corrected the internal staleness cross-reference from §2 to §3 so the cited scope boundary
    resolves to the actual TO-BE invariant.
13. Kept `bunx svelte-kit sync` before Vitest because
    `/memory/MINION/factory/2026-08-20-2c5eccbc.md` records that a fresh Hub worktree otherwise
    fails dependency optimization before tests run.
14. Kept sweep-owned proposal closure and prohibited manual proposal/index edits, consistent with
    `/memory/MINION/factory/2026-08-20-933c20e9.md` and the repo's paired marker/proposal ledger.

## Memory and evidence notes

- `/memory/MINION/MEMORY.md` shaped the live-base correction: Hub `dev` was deleted and work must
  reconcile against the current remote default rather than the stale subproject instruction.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` confirms pass-2 sidecars are the review
  record and handoff markers participate in the proposal lifecycle.
- `/memory/MINION/factory/2026-08-20-2c5eccbc.md` shaped the fresh-worktree test order;
  `/memory/MINION/factory/2026-08-20-933c20e9.md` shaped the exact marker/sweep closure check.
- The requested SQLite observation database was unavailable at
  `/home/agent/.claude-mem/claude-mem.db`, and no semantic memory-search MCP tool was exposed in
  this session; neither limitation blocks the source-anchored corrections.
- The Hub checkout is absent from this workspace. Its `CLAUDE.md`, service, unit test, rule helper,
  SQL integration test, and route were read at commit
  `5e77bbe7a15aec126651f6cdac76672020153abd` through the GitHub contents API without modifying Git.

## Flagged for the human

None. The canonical resolver contract, current Hub source, and sibling artifact state determine
the corrections without a new product, data, or security decision.
