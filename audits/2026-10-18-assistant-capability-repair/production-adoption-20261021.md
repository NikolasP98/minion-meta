# Assistant capability production adoption

Owner approved the conditional production release and exact FACES correction, then confirmed all three repair PRs merged. This is an in-progress execution record, not a full-live claim.

## Source and Hub

- Gateway PR #338 merged DEV `3db71f43e221c7621187571aca579b3d7ba85ea4`.
- Hub PR #574 merged `2dff855dbf9bb6217a2193ad84bea70fcf619cb6`.
- Meta PR #847 merged `1e69de76e92fae1dc18db5b1c6bd3ce68cfc46b9`.
- Hub Vercel deployment `dpl_V2SWNfkYzRjNqNqfMiY5wmHjrFKQ` is production READY and independently resolves from `hub.minion-ai.org`; metadata matches the exact Hub merge SHA. Merged CI 39543822305 check/build passed with 0 errors / 0 warnings; 896 test files passed / 5 skipped, 7,843 tests passed / 263 skipped, architecture 3/3. QA-stack also passed; overall merge CI succeeded with 9 passed jobs and 1 skipped migration-pairing job.

## Gateway release history

Main `12e03f7` and repair parent DEV `5096950` have identical complete trees, despite squash-divergent ancestry. Production promotion PR #339 is DEV to main, as enforced by CI. The actual source delta is exactly 31 approved repair files.

Normal-merge rehearsal found 11 squash-history conflicts. Reconciliation PR #340 merges main ancestry into DEV, retaining the exact DEV file contents. Commit `61f03fe` has both pinned parents and unchanged tree `6db45431112ffd120ff4653a4fd5eecd632e9d2a`. Independent standards/scope review approved it. It must integrate with a true merge commit; squash/rebase discards the needed ancestry. The isolated direct merge commit is a documented exception to the file-scoped committer, because no file diff exists.

Full merged-commit qualification, source promotion, deployed digest and runtime acceptance remain pending. No production Gateway write has been performed.

## FACES preflight and acceptance

Read-only preflight at 04:26 UTC verified owner membership, expected persisted runtime identity, active NULL assignment, canonical FACES gateway and current production lease. Container 98139d0bb172 retains the expected old callback hint, enabled Hub URL and existing personal agent. A live read-only WebSocket handshake using existing runtime credentials and operator.read returned exactly one matching agents.list entry on both container loopback and the canonical TLS endpoint. Requests made with the actual callback credentials and configured hint returned 403 ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED for both catalog and permissions. No credentials were printed.

The approved single-field callback patch was tested on local fixtures for dry-run, private backup, ownership, idempotency and unexpected-old-value refusal. It has not run against production.

Browser Use refused an isolated session with 402 Payment Required. The owner chose to perform the final authenticated check in Hub when notified. After source/config verification, refresh FACES and ask the original question; verify the hosted binding afterward. Never create a fabricated user session or bypass the hosted verifier.

GitHub branch-protection API is unavailable for this private repository plan (403). Auto-merge is not used as a substitute for manually checking the required workflows. PR #340 runs ordinary code checks despite zero final source difference; those must finish before its merge.

## Separate maintenance finding

DEV deployment succeeded, but its Compose rollback alias was rejected because the repository owner retained uppercase characters. Draft Gateway PR #341 adds exact-site handoff comments only; `proposals/2026-10-21-dev-compose-rollback-alias.md` records the separate repair. The approved production candidate is unchanged. This evidence does not establish an impact on the separate production Swarm controller.

## Operations review

Independent read-only review of the prepared callback helper found no blocking deviation from the release procedure. The original-byte check and atomic rename are optimistic concurrency protection, not an interprocess lock; execution must avoid overlapping configuration writers. Any error after rename is an unknown commit outcome: reread current configuration before retrying or restoring. Container identity, lease, runtime roster and credentials remain external preconditions.

Original merged DEV CI `39543796036` completed both full Linux shards with 13,414 passing tests and 17 skips, and its macOS TypeScript suite passed. Native Swift build succeeded, but the existing step named Swift test only printed `--show-codecov-path`; this record does not count it as executed Swift tests. Full Windows qualification remains pending.

## Final release candidate

PR #340 passed all applicable checks and merged with a true merge commit at `8dcbf5ce10fbbbae534de411627ff85f9e955200`. Root fetched both branches and verified main `12e03f7` is now an ancestor of DEV, the final tree remains `6db45431112ffd120ff4653a4fd5eecd632e9d2a`, and the production delta remains the 31 approved files. Final DEV CI is [39546077771](https://github.com/NikolasP98/minion-ai/actions/runs/39546077771); qualification is pending. No workflow was manually cancelled.
