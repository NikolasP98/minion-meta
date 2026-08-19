---
spec: 2026-08-18-factory-release-rollback-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set the spec to pass 2 with approved status/verdict because every correctness issue was resolvable from the approved proposal and repository evidence.
- Relabeled the embedded current script as an executable-flow excerpt because its header and inline comments are intentionally omitted.
- Made `.github/workflows/ci.yml` from the orchestration-tests proposal a hard activation prerequisite because the source DoD says only green commits may deploy.
- Required S1–S3 to merge and activate together because the CI gate depends on the workflow and rollback depends on the complete S2 artifacts plus S3 helper.
- Changed missing runs and GitHub/API/auth failures from fail-open to fail-closed because deploying without a green result contradicted the source proposal.
- Scoped the CI query to the exact remote SHA and required workflow because a branch-wide 30-run window can omit the commit being deployed or include unrelated workflows.
- Selected the highest workflow attempt because an older failed attempt must not override a newer successful rerun.
- Required `gh --jq` rather than a bare `jq` process because standalone `jq` is not proven on the host and the original design silently depended on it.
- Moved the monitor helper definition before the CI gate because Bash cannot call a function whose definition has not executed.
- Split the existing token assignment/export because `export VAR=$(...)` masks the credential-read status and violates the blocking ShellCheck gate.
- Required full-SHA monitor fingerprints because eight-character prefixes are not a safe dedupe key.
- Added bounded monitor and health-request timeouts because plain `curl -sf` made the claimed 60-second budgets unverifiable.
- Added a direct `gh issue create` fallback with fingerprint dedupe because `/hooks/monitor` lives in the runner and cannot report a rollback that leaves that runner down.
- Moved the monitor authorization header from `curl` arguments to process-substituted config because the script's existing credential rule keeps secrets out of the host process list.
- Wrapped every monitor call against `set -e` because reporting failure must not bypass the intended rollback or terminal log.
- Required both current images before deployment and both previous images during rollback because restoring only the runner leaves the agent image half-deployed.
- Added source-DB existence plus backup size and `PRAGMA quick_check` verification because SQLite can otherwise create or accept an unusable snapshot.
- Extended rollback to agent-build, runner-build, and Compose-up failures because bare commands under `set -e` previously exited after mutating tags/tree without recovery.
- Added a distinct rollback-health test URL because one shared override could only prove repeated failure, not successful recovery.
- Replaced system-binary renaming and production tag deletion with invocation seams and disposable-host tests because the prior DoD could damage the box it was validating.
- Corrected the one-time SQLite install command's `&&`/`||` grouping because the prior expression could run installation even when SQLite was already present.
- Moved retention fixtures to a temporary directory because the prior proof could prune real production backups.
- Corrected backup verification to select one concrete file because passing a wildcard expansion to `sqlite3` is ambiguous when multiple snapshots exist.
- Corrected image-ID expectations because a docs-only or cache-identical rebuild may legitimately leave `:latest` and `:previous` on the same digest.
- Replaced the intentionally broken production-main rollback drill with a forced health failure on a harmless green commit because CI should reject the former before deployment.
- Captured the rollback-drill exit code before printing its output because the `/memory/MINION/MEMORY.md` piped-gates hard constraint records that a pipeline can report the consumer's status instead of the command under test.
- Required every full-script negative test to prove `LOCAL != REMOTE` because otherwise the existing early exit makes the test a false positive.
- Added `actionlint` for the prerequisite workflow because the related SDLC gate spec requires workflow lint for infra work once that workflow exists.
- Replaced the fixed `python -m http.server` monitor stub because it conflicts with the real runner port and returns 501 to POST rather than a successful intake response.
- Corrected the cross-impact table to include direct `minion-meta` issue creation and the fact that queued work may start on the new agent image during health verification.
- Recorded the agent-canary/queue-pause limitation explicitly because runner `/health` does not validate or roll back already-started sibling agent containers.
- Preserved restart safety based on `/memory/MINION/sdlc-board-triage-and-phase-gates.md`, whose hard constraint says the runner adopts surviving containers after restart.
- Enforced real workflow evidence based on `/memory/MINION/test-suite-recon-2026-08-10.md`, which records that an existing workflow file is not proof that CI has ever completed.
- Preserved script-local invocation overrides rather than `.env` additions based on `/memory/MINION/minion-factory-agent-pipeline.md`, which records that `deploy.sh` rewrites the box `.env` wholesale.

## Human flags

None. The remaining agent-container canary limitation is explicitly outside the approved proposal's runner-health scope, and the CI workflow dependency is already stated by the proposal rather than introduced by this review.
