---
spec: 2026-08-18-factory-orchestration-round7-spec
pass: 3
verdict: revision-required
reviewer: factory-review
created: 2026-08-18
---

# Pass 3 disposition review (2026-08-29, corrected after independent review)

**Verdict: revision-required.** The pass-2 `approved` verdict below is superseded — a 2026-08-28
board audit had already found zero graph/profile/resolver deliverables and flipped `status` back to
`draft` for redesign (`reconcile_ignore_reason`), but the review sidecar and `verdict` field were
left at pass-2 `approved`, so the artifact contradicted itself (`status: draft`, `verdict: approved`)
with no coherent disposition recorded. This pass records one: `status: review`,
`verdict: revision-required`.

## Evidence (verified 2026-08-29 against `NikolasP98/minion-factory` `main`/`dev` @
`5db7d3919896042043e63da996d6441ec63db205`)

- The spec's own storage design (Slice 3: new `executions`/`execution_nodes`/`execution_edges`
  tables) assumes the DB "has no execution model" (§3.1). That premise is false: `runner/src/db.ts`
  already defines `pipeline_instances` (line 780), `pipeline_instance_relations` (line 1155), and
  `phase_requests` (line 1317), with real call sites. Their contract is **partly immutable, not
  wholly immutable** — an earlier draft of this review said "immutable `pipeline_instances`" and
  "immutable `phase_requests`", which is wrong and would push the redesign toward append-only
  replacement rows instead of the guarded transition APIs it must reuse. Precisely:
  - `pipeline_instances`: identity/binding columns frozen by `pipeline_instances_immutable_identity`
    (line 819) and rows undeletable via `pipeline_instances_no_delete` (line 833); there is **no**
    blanket no-update trigger, and `status`/`current_phase`/`runtime_state`/lease/`candidate_sha`
    transition under guarded predicates (`runner/src/phase-requests.ts:343`).
  - `phase_requests`: request intent/bindings frozen by `phase_requests_immutable_request`
    (line 1346) and rows undeletable via `phase_requests_no_delete` (line 1360), while
    `state`/`claim_generation`/`claim_lease_owner`/`started_at`/`finished_at` transition through the
    claim/cancel/complete APIs (`runner/src/phase-requests.ts:479`, `:490`, `:544`, `:566`).
  - Append-only in the strict sense: `pipeline_instance_relations` (line 1163) and `pipeline_events`
    (line 1231).

  Implementing S3–S5 unchanged would still build a second, competing execution authority rather
  than extend the live one.
- `runner/src/queue.ts` (~line 3500) already refuses multi-repo spec auto-dispatch
  (`already_satisfied` / "multi-repo spec requires explicit per-repo queueing") instead of silently
  picking `repos[0]` — one of this spec's own motivating problems is already partially mitigated
  upstream and the AS-IS section should be read against that, not the 2026-08-18 baseline alone.
- Prerequisite reality forbids approval as-is: durable-state (`2026-08-18-factory-durable-state-outbox-spec`)
  is `status: implementing` / `verdict: changes_requested` with its factory PR
  ([minion-factory#160](https://github.com/NikolasP98/minion-factory/pull/160)) draft and failing
  `verify`/`label` checks. The WorkItem-handoff factory PR
  ([minion-factory#159](https://github.com/NikolasP98/minion-factory/pull/159)) is open, not draft,
  and also failing checks.
- **Prior-run inventory — corrected.** An earlier draft of this review asserted that #41 was the
  only PR ever linked to this spec and that it was unrelated. Both claims are false. Three
  minion-factory PRs were linked to this spec id and all three ended with an empty net diff:
  [#23](https://github.com/NikolasP98/minion-factory/pull/23) (run `936ccaed`, "S1", closed
  2026-08-18, run-start commit only) and
  [#57](https://github.com/NikolasP98/minion-factory/pull/57) (run `a02e324c`, "S1", closed
  2026-08-20, run-start commit only) were empty no-change attempts;
  [#41](https://github.com/NikolasP98/minion-factory/pull/41) (run `3aa40139`) was a *related*
  Slice-2 attempt merged 2026-08-20 whose net diff is empty only because the work was reverted
  in-PR (`2cf9811e` profile table + deterministic resolution, `f9f65fc1` handoff docs, `48ff85e0`
  revert for the absent `runner/src/manifest.ts` prerequisite). Its review's three policy findings
  — integration nodes inheriting a work-node develop/review/pr-open floor their executor may not
  produce, the `graph: ['any']` fallback over-declaring unattended-merge eligibility beyond
  `risk.ts`'s docs/test/deps allowlist, and the missing-manifest "reduced local substitute"
  violation — are preserved verbatim in the §2 gate note so the redesign cannot rediscover them.
  The conclusion is unchanged: **no run produced a landed graph, profile, or relationship-resolver
  deliverable.**
- `node scripts/spec-index.mjs --check` passes against the edited source (index regenerated).

## Disposition and what changed this pass

- Set `status: review` (was `draft`) and `verdict: revision-required` (was stale `approved`) so the
  artifact is internally consistent and no longer blesses an architecture that conflicts with the
  live orchestration substrate. `pass` bumped to 3, `updated` to 2026-08-29.
- Added a dated "pass-3 revision-required gate" note in §2 with the current prerequisite PR/SHA
  evidence above, and inline superseded-markers on the specific AS-IS bullet (§3.1) and Slice 3
  heading that assumed no execution model exists. The affected sections (AS-IS, TO-BE point 2, DELTA
  D2, Slice 3) are left otherwise intact — they are valuable prior work and the acceptance criteria
  they encode (repo-slice fan-out, slice continuation, scenario profiles, relationship resolution)
  remain worth keeping — but are explicitly marked not-approved-for-implementation until rebased onto
  `pipeline_instances`/`phase_requests`/`pipeline_instance_relations` instead of duplicating them.
- Did not attempt the full storage/DELTA rebase itself: doing so correctly requires implementer-level
  familiarity with the live `phase_requests` claim/lock/`node_key`/`executor_role`/
  `permissions_json` contract that this review pass, scoped to disposition and correctness, should
  not guess at. Whoever picks this spec up next must rewrite §3.1/§3.2 point 2/§3.3 D2/Slice 3 (and
  re-check Slices 4–8 for knock-on assumptions) against those tables, then request a fresh
  independent pass-4 review before this can return to `approved`.
- **The approval gate is the whole spec, not a per-slice line.** No slice may start or ship until a
  fresh pass approves this spec in full. Slices 1–2 (minion-meta authoring contract; versioned
  scenario profiles) happen not to depend on the execution-table redesign, but that does **not**
  make them separately shippable while the artifact reads `review`/`revision-required`: they are
  retained as draft source material and candidate slice boundaries for the revision only. A
  whole-spec stop banner now sits above Slice 1 in the spec so no operator reads a partial
  authorization into it. (An earlier draft of this review said the spec "must not proceed past
  Slice 2" and called Slices 1–2 "candidate ship units" — that wording weakened the SDLC approval
  gate and is withdrawn.)

## Corrections applied within pass 3 (2026-08-29, after independent review)

An independent review of the first pass-3 commit returned VERDICT: FAIL on three points; all three
were verified against the current branch and the cited factory SHA before being corrected above.
The disposition itself (`status: review`, `verdict: revision-required`) is unchanged — only the
evidence and the gate wording were wrong.

1. **Gate weakened (medium).** "Must not proceed past Slice 2" plus "Slices 1–2 remain candidate
   ship units" invited pre-approval implementation. Replaced with a whole-spec stop, restated in
   §2, in a banner above Slice 1, and in this sidecar.
2. **Prior-run inventory false (medium).** #41 was a Round 7 Slice-2 run (`3aa40139`), not an
   unrelated PR, and #23/#57 were linked Round 7 attempts that went unmentioned. All three are now
   inventoried with their states, and #41's reverted commits and three review lessons are preserved
   in the §2 gate note as required WIP.
3. **Mutability evidence wrong (low).** `pipeline_instances` and `phase_requests` were described as
   wholly immutable, and a `pipeline_instances` no-update trigger was implied that does not exist.
   Corrected to the actual contract: immutable identity/request bindings plus no-delete guards,
   with lifecycle/lease/claim/result fields transitioned through guarded APIs; only
   `pipeline_instance_relations` and `pipeline_events` are strictly append-only.

## Pass 2 correctness review (2026-08-18, superseded by the above — kept for history)

## Changes made

- Set `status: approved`, `pass: 2`, and `verdict: approved` because every correctness defect was mechanically resolvable without a product-policy decision.
- Added the M1 repository-policy, M4 capability/containment, and browser-verification relationships because the implementation consumes those contracts and the roadmap orders them before or conditionally within M5.
- Split prerequisite gates by consuming slice and made `changes_requested` explicitly unsatisfied so work cannot start against unresolved or partial contracts.
- Reconciled graph authoring with mounted repositories by limiting minion-meta to repo/profile syntax validation and making the effective factory registry/profile table authoritative; this follows `/memory/MINION/factory/2026-08-18-ac227e10.md`.
- Made node `profile` an optional stricter override rather than a required resolved value because the manifest—not the author—must select the effective profile.
- Bound each graph node to exactly one prose slice and its validated topic annotation so profile selection has a deterministic per-slice input.
- Replaced mixed acceptance strings with ordered discriminated command/evidence objects and repository-relative `cwd` validation so acceptance is machine-interpretable and path-safe.
- Defined canonicalization boundaries so object/node/set ordering is hash-insensitive while acceptance command ordering remains semantically significant.
- Strengthened the multi-repo join invariant from “roots span repos” to every multi-repo graph having an integration node whose transitive closure covers work from every participating repo.
- Split completion by node kind: work nodes require merged-attested PR proof, while integration nodes run controller-owned command-only verification and never manufacture a no-op implementation PR.
- Added explicit node states and guarded retry/completion transitions so failed or canceled attempts cannot ambiguously unlock dependents.
- Added graph, manifest, topic-policy, repository-policy, and profile-policy bindings to executions/runs/retries so mutable policy cannot reinterpret active work.
- Expanded execution idempotency from `(spec_sha, graph_hash)` to include every policy hash because the same spec under changed policy is not the same execution.
- Moved profile definition/selection ahead of durable graph persistence and dispatch because the original S2/S3 ordering required profiles that were not implemented until S5.
- Defined deterministic profile precedence, ambiguity handling, explicit compatible overrides, immutable table hashing, and budget/gate property tests so profile selection is verifiable.
- Preserved manifest-derived `data` human gates and made unavailable `ui-flow` browser evidence block dispatch as well as merge, preventing unusable runs.
- Added a validated integration run kind plus a contained command-only entrypoint, image impact, credential constraints, and tests because the prior “same dispatcher” language omitted the executor needed for joins.
- Added a stale/removed graph-hash guard to `completed_slices` projection so an old execution cannot write node ids into a materially revised spec.
- Defined versioned acceptance-criterion extraction as a multiset and a generate-then-validate flow because the original resolver tried to prove preservation before a candidate existed.
- Added final source-revision/run/PR rechecks and race tests before candidate publication so a concurrently activated source fails closed.
- Removed the contradiction that allowed a later resolver action to retire sources; only a later human lifecycle decision may do so.
- Split graph shadow from dispatch and relationship shadow from consolidation with four exact-opt-in flags because the original two booleans could not express the specified shadow rollout.
- Defined disable semantics to stop new admission while draining already-committed outbox work so rollback does not strand active executions.
- Expanded D1–D8, slice DoDs, impact zones, and the E2E/operator sequence to prove policy-hash changes, mounted repos, integration head binding, stale projection refusal, resolver races, and all flag combinations.
- Corrected the overlapping-file rule and landing order so listed sequential edits to `queue.ts`, `db.ts`, and manifest code no longer contradict the claim that slices cannot share files.
- Cited `/memory/MINION/factory/2026-08-18-60a08042.md` and `/memory/MINION/factory/2026-08-18-39c3a54c.md` for first-attempt repo guards, `/memory/MINION/sdlc-board-triage-and-phase-gates.md` for controller-owned slice completion, and `/memory/MINION/minion-factory-agent-pipeline.md` for deploy-env preservation.

## Flagged for the human/operator

- No unresolved design choice requires human adjudication; verdict is approved.
- Implementation remains blocked until the §2 M1–M4 prerequisites are implemented and tested; the durable-state spec currently has `verdict: changes_requested` and therefore does not satisfy the gate.
- `ui-flow@1` nodes remain non-dispatchable until browser verification is implemented; containment alone is insufficient.
- Live Docker/image/deployment evidence remains an operator step because factory dev containers lack Docker and SSH, as recorded in `/memory/MINION/factory/2026-08-17-c5f12e0e.md`.
- No relevant semantic-memory MCP was available; the required read-only SQLite FTS query returned no factory-specific observation that superseded the cited file-backed constraints.
