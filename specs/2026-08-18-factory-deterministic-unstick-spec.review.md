---
spec: 2026-08-18-factory-deterministic-unstick-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Set `pass: 2`, `status: approved`, and `verdict: approved` so lifecycle metadata agrees with this completed review.
- Corrected sibling-collision notes for release rollback, orchestration tests, workitem handoff, and compose-tailnet because those specs share `README.md`, `index.ts`, `agent/unstick.sh`, `deploy.sh`, or `setup.sh`.
- Added the dry-run fixture files to the owner surface because Slice 2 requires new tracked inputs that pass 1 omitted.
- Replaced the inaccurate “read-only credential” label with “run-read/monitor-report” because `POST /hooks/monitor` creates or updates a board artifact.
- Narrowed the restart-residue class description to the no-container/no-result case so it does not contradict the hard `adoptOrphans()` memory constraint in `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Corrected the memory record to state that SQLite FTS was run and cited the two returned factory observations instead of claiming the database was unavailable.
- Cited `/memory/MINION/piping-gates-masks-exit-code.md` and rewrote piped smoke commands so a successful `tee` or `tail` cannot mask a failed gate.
- Required `FACTORY_UNSTICK_SECRET` to be independent, mode 600, and absent from the facilitator container’s admin-secret env surface so the stated security property is testable.
- Added safe preservation and heredoc wiring for the existing `FACTORY_HOOK_SECRET` because the required deploy would otherwise erase that live shared credential.
- Added auth-matrix checks for `GET /runs/:id` and `GET /runs/:id/log` so the claimed scoped route set is fully exercised.
- Added a missing-secret rollout guard that files `unstick-credential-missing` and skips the facilitator instead of silently passing the admin secret or producing no advisory output.
- Distinguished the requeue endpoint’s two 409 meanings so only `already requeued as <id>` is a success-no-op and a wrong-status 409 remains a failure.
- Required Class A cancel/requeue outcomes and every successful deterministic remedy to emit the documented monitor evidence, including partial Class A outcomes.
- Required `source`, `title`, `fingerprint`, and bounded `detail` on every monitor request because the live endpoint rejects a missing title with 400.
- Split Class A/C and Class B into two fixture snapshots because Class B requires zero running rows and cannot coexist with a Class A row in one `/runs` response.
- Corrected the fixture count to seven scenarios and the unmatched assertion to exactly two rows; pass 1’s “one unmatched” comment contradicted its own checkout-failure and unrelated-log cases.
- Resolved the facilitator event contradiction by making `unstick-injection-<id>` replace, rather than accompany, `unstick-unknown-<id>` for an injection case.
- Replaced the static admin-secret grep with a container-env-specific assertion because the trusted host classifier must still use `FACTORY_SECRET`.
- Replaced the placeholder box user and non-asserting/piped operator smoke commands with exit-code-preserving, executable checks.
- Expanded README requirements to cover both scoped credentials and the first-deploy hook-secret migration so operators can verify the rollout contract.

## Human flags

None requiring a decision for approval. The spec retains two explicit follow-ups: integrate `/budget` before token-budget governance ships, and separately decide whether to add a lineage-level requeue cap.
