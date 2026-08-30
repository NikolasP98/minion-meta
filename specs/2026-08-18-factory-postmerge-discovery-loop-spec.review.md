---
spec: 2026-08-18-factory-postmerge-discovery-loop-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Set `pass: 2`, `verdict: approved`, added the missing tags, and narrowed `repos` to the sole code-owning repo so automatic dev dispatch does not fail as a false multi-repo spec.
- Expanded the owner surface to include `runner/src/github.ts`, `agent/Dockerfile`, `setup.sh`, and the shell test because the described runtime, fresh-install, image, and verification paths require them.
- Replaced push-event intake with merged `pull_request/closed` intake because direct pushes are not the approved proposal's merge events.
- Replaced before/after push columns with PR number, merge SHA, PR URL, and changed-file count so durable lineage matches the actual webhook contract.
- Required `merge_event_id` in migration DDL, fresh DDL, and the `Run` type, and added `discovery` to `Run.kind` so schema and runtime cannot drift.
- Made raw-body parsing route-local and ordered before global JSON/auth middleware so HMAC verification uses the exact signed bytes without an `any` escape.
- Added an explicit slug/branch allowlist instead of overloading `RepoDef.base`, including the live site `dev|master` behavior.
- Made webhook provisioning converge existing hooks as well as create missing hooks, then ping them, because URL-only existence checks cannot detect stale events or secrets.
- Added stable webhook-secret generation and propagation in both `deploy.sh` and `setup.sh` so deployments neither fail under `set -u` nor rotate GitHub out of sync.
- Corrected intake tests and operator commands to use merged-PR fixtures, `node --import tsx`, and the host SQLite path.
- Replaced the single compare-response claim with paginated PR-files retrieval and explicit completeness checks because GitHub can cap results and omit patches.
- Added `scanned_with_gaps` and `scan-gap` findings so pagination and patch omissions cannot produce a false complete scan; this applies the no-silent-caps constraint from `/memory/MINION/minion-factory-agent-pipeline.md` ★★★.
- Replaced the contradictory blast-radius isolation predicate with one deterministic zone-level changed-path alert and explicitly listed the complete initial zone seed from root `AGENTS.md`.
- Added uncapped finding `identity` separate from bounded display `detail` so stable fingerprints and later marker verification use the full normalized evidence.
- Made recording deduplicate within one merge, update latest lineage on recurrence, and return all actionable observed fingerprints so proposal refresh and failed-run retry remain possible.
- Required scan bookkeeping and discovery-run insertion in one SQLite transaction, boot pumping of queued rows, and level-triggered failed-run retry; this follows the durable, evidence-bound recovery pattern in `/memory/MINION/minion-factory-agent-pipeline.md` and atomic reservation lesson in `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Added temp-DB crash-window and retry/dedupe tests so the outbox-like guarantee is machine-verifiable rather than asserted from WAL alone.
- Moved discovery input from an environment variable to `/out/findings.json` to avoid unbounded argv/environment payloads and added the missing agent-image copy step.
- Put the diagnosis before the final replaceable occurrence section so refreshing a proposal cannot delete the synthesis it promises to preserve.
- Required complete WorkItem fields when the sibling schema is live, including priority and owner, and required the shared risk classifier to avoid a second taxonomy.
- Required safe YAML serialization and indented evidence blocks so untrusted marker text cannot inject frontmatter or terminate Markdown fences.
- Added an explicit `scan-gap` proposal class and corrected blast-radius DoD language so proposals do not claim an undefined missing consumer.
- Removed the unsafe bypass-sandbox Codex fallback for untrusted finding text and made LLM failure retry durably before any commit.
- Moved proposal-link bookkeeping into validated `result.json` handling inside synchronous `finish()` rather than the known fire-and-forget `postFinish()` gap.
- Replaced the unverifiable dry-run prose with a deterministic shell harness covering create, refresh, immutable status, injection, LLM failure, Dockerfile wiring, and effective registry parity.
- Replaced boolean rescan evidence with `present|absent|unknown`, required discriminated GitHub helpers, and made ambiguous API/auth/large-file/rename cases fail closed.
- Limited automatic code-state verification to TODO markers; blast-radius and scan-gap are historical review conditions that cannot be proven absent without the expressly out-of-scope dependency graph.
- Added `last_verified_at` throttling and exact watched-head resolution so the delayed sweep is level-triggered without repeatedly scanning unchanged conclusive state.
- Changed automatic proposal closure from impossible `done` to the live lifecycle's allowed `closed` transition and separated `resolve-only` from `close-proposal` for already-final or proposal-less findings.
- Expanded the rescan matrix and mocked failure cases so unknown evidence and transition races cannot be counted as closure.
- Added runner/agent deployment, effective registry, retained payload, and missed-delivery impacts to the cross-repo assessment.
- Corrected end-to-end acceptance to build both images, deploy the stable secret, merge real PRs, query the host DB, cite merged PR/merge-SHA lineage, and expect proposal status `closed`.

## Flagged for the human/operator

- Webhook provisioning still requires repository-hook administration permission on all three private repositories; the script must fail loudly when the token lacks it.
- The production `/opt/factory/data/repos.json`, when present, must be updated alongside the built-in self-test before the implementation is considered deployed.
- Missed webhook deliveries have no history backfill in this vertical slice; that limitation remains explicitly out of scope and operationally visible.
- The stable webhook secret must be installed through `deploy.sh` or `setup.sh`, and both runner and agent images must be rebuilt; a runner-only targeted deploy is insufficient.
- No past-session observation returned by the required read-only FTS query materially changed the decision; the cited ★★★ memory topic files did.

No unresolved design choice requires human adjudication; verdict is approved.
