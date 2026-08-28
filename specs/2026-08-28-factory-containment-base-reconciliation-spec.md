---
id: 2026-08-28-factory-containment-base-reconciliation-spec
title: Containment base reconciliation — admit behind-base resumes, bound the conflict phase, and gate activation on drills
stage: spec
status: draft
pass: 1
created: 2026-08-28
updated: 2026-08-28
proposal: 2026-08-28-factory-containment-base-reconciliation
verdict: pending
repos: [minion-factory]
type: infra
relationship: extends
related: [2026-08-18-factory-worker-containment-spec, 2026-08-23-factory-containment-effect-ledger-integration, 2026-08-22-factory-lineage-orchestrator-instance-spec, 2026-08-18-factory-durable-state-outbox-spec]
tags: [infra, logic, test, security]
---

# Containment base reconciliation — admit behind-base resumes, bound the conflict phase, and gate activation on drills

## 0. Product

From approved proposal `2026-08-28-factory-containment-base-reconciliation`, verbatim:

> Containment-v2's publisher is already correct — candidate ancestry validation plus exact
> `--force-with-lease` (`runner/src/containment-effects.ts:357-371`) — but its preparation step requires the
> freshly fetched base to already be an ancestor of a resumed branch (`agent/factory-prepare-workspace.sh:70-86`).
> An ordinary behind-base PR therefore fails before the factory ever gets a chance to integrate the base. On the
> legacy path the same gap surfaces as agents rebasing published branches (15 of 18 audited non-fast-forward
> failures).

and its proposed implementation, verbatim:

> - A reusable controller checkpoint that, when the branch head is unchanged and only the base advanced,
>   performs a **clean `git merge` of the live base into the candidate deterministically — no model call**.
>   Merging preserves both the published head and the base as ancestors, so the existing exact-lease publish
>   still applies.
> - A merge conflict routes to **one bounded conflict-resolution phase** (a dedicated worker phase with the
>   conflict as its only task), never a restart of the whole run.
> - Rebase of a published factory branch stays forbidden (invariant I6); test/review evidence binds the exact
>   `{testedBase, candidate}` pair (I3).
> - Activation stays behind the existing drill gate: temporary bare-repo drills proving base advance, remote
>   fast-forward, divergent rewrite, ambiguous accepted push, conflict, crash/restart, idempotent replay — then
>   a one-repo canary before widening `FACTORY_CONTAINMENT_V2=1`.

This is slice 3 of the moving-origin reliability strategy (PR 1 = minion-factory#110, PR 2 = #111, both merged).
The user-visible outcome: a factory run that resumes a published branch whose base moved integrates the base and
finishes, instead of dying in its first phase with `candidate is not descended from the bound base` after the
lineage has already been admitted.

### Scope correction the implementer must read first

**The proposal's first bullet is largely already shipped.** minion-factory PR #101 (`feat(factory): add
reconcile-base checkpoint for a moving integration base`, merged 2026-08-27T22:30Z) and PR #102 landed
`agent/factory-reconcile-base.sh`, the `reconcile-base` phase in the dev phase sequence, the append-only merge,
the controller-owned exact push keyed on `phase:baseSha:candidateSha`, prepare-review freezing to the tested
checkpoint, and `runner/src/base-reconciliation.test.ts`. That work landed as a direct PR with no spec id, which
is why the proposal (written 2026-08-28) still describes it as unbuilt.

This spec therefore does **not** re-implement the checkpoint. It closes the four gaps that survive at
`NikolasP98/minion-factory@main` `b868b73558a9c5e8b29f0c2dfc7bea198521a46a` (verified 2026-08-28 via the GitHub
contents API) and that are exactly what the proposal's remaining three bullets ask for. Every AS-IS anchor below
was read at that commit; the proposal's own anchors are stale (`pushExact` is at
`runner/src/containment-effects.ts:415-434`, not `357-371`).

### Relationship recommendation (recommend-only)

- `2026-08-18-factory-worker-containment-spec` — **extends**: that approved spec owns containment v2's phase
  graph, `prepare-workspace`, and the runner-owned candidate authority. This spec changes the resume admission
  rule and adds one phase inside that graph; it must not loosen that spec's credential, mount, or read-only
  review boundaries.
- `2026-08-23-factory-containment-effect-ledger-integration` — **depends-on**: its `phase_effects`
  reserve/confirm ledger is the mechanism this spec's new phase publishes through, and its two unchecked DoD
  items (crash-window integration tests through the production `advanceContainmentRun` path; a credentialed
  disposable-repository drill) are subsumed by slice 5's drill harness. Recommend the resolver fold those two
  items into slice 5 rather than tracking them twice.
- `2026-08-22-factory-lineage-orchestrator-instance-spec` — **depends-on**: it consumes
  `LineageWorkerPhase` and `executeLineageContainmentWorkerPhase` (`runner/src/lineage-phase-transports.ts:23`,
  `runner/src/queue.ts:1839-1869`). Adding a phase changes a surface that spec plans against; slice 2 must keep
  the new phase controller-scheduled and outside the lineage request vocabulary.
- `2026-08-18-factory-durable-state-outbox-spec` — **depends-on**: `phase_attempts` evidence and the
  transactional close path (`runner/src/db.ts:1652-1680`, `runner/src/queue.ts:1240-1256`) are where slice 3's
  tested-base binding is persisted.

Hard constraints from operator memory that this spec must not contradict:

- `/memory/MINION/minion-factory-agent-pipeline.md` — ★★★ reviewers propose, the applier re-verifies; a reviewer
  never becomes an applier. The conflict-resolution phase in slice 2 is a *worker* phase with no push
  authority; the controller still owns the push.
- `/memory/MINION/minion-factory-agent-pipeline.md` — ★★★ `deploy.sh` rewrites the box `.env` **wholesale**.
  Every new runtime variable this spec introduces must be emitted by `deploy.sh`, never hand-added on the host.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` — prompts are not security boundaries; the controller
  owns truth; automerge stays disabled. Nothing here re-enables automerge.
- `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md` — ⛔ never empty `requiredChecks` (v2 hosted-CI
  await consumes them); ★ box deploy = `scripts/self-update.sh` gated on the newest `ci.yml` run for the EXACT
  sha.
- `/memory/MINION/MEMORY.md` → `[[piping-gates-masks-exit-code]]` — ★★★ `cmd | tail` returns tail's exit code.
  Every gate in this spec captures `$?` directly; no slice may gate on a pipe.

## 1. AS-IS

Verified at `NikolasP98/minion-factory@main` `b868b73558a9c5e8b29f0c2dfc7bea198521a46a`, 2026-08-28. Line numbers
are anchors, not immutable coordinates — re-read HEAD before implementing.

1. **A behind-base resume dies in phase 1.** `agent/factory-prepare-workspace.sh:58-83` fetches
   `FACTORY_RESUME_BRANCH`, verifies the fetched head equals the controller-pinned `FACTORY_RESUME_HEAD_SHA`
   (PR 2's authority pin), and checks out `FETCH_HEAD`. Line 84 resolves `CANDIDATE_SHA` from that head; line 85
   then runs, unconditionally for both the fresh and the resumed path:

   ```
   git merge-base --is-ancestor "$BASE_SHA" "$CANDIDATE_SHA" || fail "candidate is not descended from the bound base"
   ```

   `BASE_SHA` (line 46) is the *freshly fetched* `refs/remotes/origin/$FACTORY_BASE`. A published branch is behind
   its base by construction the moment anything merges to the base after the branch was pushed. The phase emits
   `status: failed`, and `nextPhase` (`runner/src/containers.ts:1160`) returns
   `{kind:'done', outcome:'failed', reason:'prepare-workspace failed'}` — no fix round, because
   `prepare-workspace` is not a gate phase. The run is dead before `setup`, `develop`, or `reconcile-base` ever
   launch.
2. **The checkpoint exists but is unreachable from that failure.** `agent/factory-reconcile-base.sh` performs
   exactly the deterministic merge the proposal asks for: it fetches the live base into
   `refs/remotes/factory/base-checkpoint`, returns `passed` unchanged when the base is already an ancestor
   (line 100-103), otherwise runs `git merge --no-ff --no-edit "$BASE_SHA"` (line 105) and asserts both
   `priorCandidate ⊆ merged` and `base ⊆ merged` (lines 118-121). It is scheduled only at
   `develop → reconcile-base → self-test` (`runner/src/containers.ts:1141-1146`,
   `DEV_PHASE_SEQUENCE` at `1105-1113`), i.e. strictly after `prepare-workspace` and `setup` have passed. There
   is no path from a behind-base resume to this checkpoint.
3. **A base conflict costs a full model develop round and can commit conflict markers.** On conflict the
   checkpoint emits `failed` with `BASE_CONFLICT: …` and leaves the merge in progress
   (`agent/factory-reconcile-base.sh:106-112`). `nextPhase` (`runner/src/containers.ts:1154-1161`) treats
   `reconcile-base` as a gate phase and re-enters **`develop`** — the full credentialed model phase, carrying
   `FACTORY_TASK`, `FACTORY_PLAYBOOK`, `FACTORY_MAX_TURNS`, and the model secret
   (`runner/src/queue.ts:1004-1027`), with `merge.log` injected as `FACTORY_FEEDBACK`
   (`runner/src/queue.ts:790-802`). Two consequences:
   - a merge conflict consumes one of `maxFixRounds` (default 5) develop rounds at full develop spend, and the
     model is free to edit anything in the tree, not only the conflicted paths;
   - `agent/factory-develop.sh:76-80` runs `git add -A` then `git commit` unconditionally. With an unresolved
     merge in the index, `git add -A` collapses conflicted entries to stage 0 with whatever is in the worktree,
     so a develop round that ignores the conflict **commits `<<<<<<<` markers as a passing candidate**. Nothing
     between there and publish rejects conflict markers: `pushExact` only checks ancestry
     (`runner/src/containment-effects.ts:415-434`). The suite has no test for this case — the closest,
     `runner/src/base-reconciliation.test.ts:124`, asserts only that the conflict "remains local and explicit for
     one bounded develop resolution phase".
4. **`testedBase` is re-derived, not bound.** `preparedBaseSha()` (`runner/src/queue.ts:1012-1021`) returns the
   `baseSha` of the *latest* passed `prepare-workspace` **or** `reconcile-base` attempt, and is read fresh when
   the `prepare-review` and `review` phase environments are built (`runner/src/queue.ts:1052`, `1062`).
   `phase_attempts` persists `output_candidate_sha` for candidate-producing phases
   (`runner/src/db.ts:1655-1662`) but has no column or evidence field recording *which base the self-test
   actually ran against*. The pair `{testedBase, candidate}` that invariant I3 requires is reconstructed by
   position in the attempt log rather than stamped once and asserted at publish. Any future scheduling change
   that lets a second `reconcile-base` land between `self-test` and `review` silently re-points `testedBase`
   with no gate failing.
5. **The legacy path has no base reconciliation at all, and PR 2 left a dangling seam.**
   `runner/src/queue.ts:1971` injects `-e FACTORY_BASE_SHA=${run.base_sha_at_dispatch}` into the legacy worker
   container. `agent/run.sh` (764 lines) never reads `FACTORY_BASE_SHA`; `grep -n 'FACTORY_BASE_SHA\|rebase\|git
   merge' agent/run.sh` returns nothing. `agent/lib/resume.sh` fetches the resume branch, verifies the pinned
   head, and `git checkout -B "${BRANCH}" FETCH_HEAD` — then hands a stale tree to the model with no base merge.
   `factory_push()` (PR 1) classifies a non-fast-forward rejection as a state conflict *after* the spend, but
   nothing forbids the model from rebasing the published branch inside develop, which is the audited failure
   class (15 of 18 non-fast-forward failures per the proposal). Invariant I6 is documented, not enforced, on
   this path.
6. **Activation gating covers credentials and one canary, not the seven drills.**
   `docs/runbooks/factory-autonomy-activation.md` requires the scoped-GitHub canary
   (`scripts/activation/run-scoped-github-canary.sh`, pinned to `NikolasP98/minion-factory-canary`) and a
   disposable deployment-recovery drill before `FACTORY_ACTIVATE_CONTAINMENT_V2=1`.
   `runner/src/base-reconciliation.test.ts` covers 4 of the proposal's 7 named scenarios — conflict (`:124`),
   crash/restart after the merge (`:174`) and while recording the conflict (`:190`), plus origin (`:142`) and
   planted-config (`:165`) tampering. **Base advance on a resumed branch, remote fast-forward, divergent
   rewrite, and idempotent replay have no drill.** `FACTORY_CONTAINMENT_V2` remains `0` in production; the
   launch gate fails closed (`runner/src/containers.ts:1195-1211`).

### Known unknowns

- Whether any repo in the active registry has a `setup` step that is sensitive to running *before* rather than
  *after* the base merge on a resume. Slice 1 orders reconciliation before `setup`, which is the safer order for
  spend but changes what `setup` sees on resumed runs. Slice 1's DoD includes a registry sweep recording the
  answer per repo.
- The real distribution of base-conflict complexity. The bounded turn cap in slice 2 (`FACTORY_CONFLICT_MAX_TURNS`)
  is a starting value, not a measured one; slice 5's drill records actual turn usage so the cap can be revised
  with evidence rather than guessed twice.

## 2. TO-BE

A factory dev run whose published branch is behind a moved base integrates the base under controller authority
and finishes. Nothing in the model's reach decides Git topology.

### Target behavior

1. `prepare-workspace` on the **resume** path admits a candidate that does not yet contain the live base. It
   still fails closed on everything else: the fetched head must equal the pinned `FACTORY_RESUME_HEAD_SHA`, the
   candidate must contain the resumed head, and the fresh path keeps today's strict `base ⊆ candidate` assertion
   verbatim. The artifact records the observed base and whether the candidate already contains it.
2. When `prepare-workspace` passes with the candidate behind the base, the controller schedules the existing
   `reconcile-base` checkpoint **immediately, before `setup`**, then continues to `setup`. When the candidate is
   already base-current, the graph is unchanged. `reconcile-base` remains reachable at its existing
   `develop → self-test` position; its next phase is `setup` if `setup` has no passed attempt, otherwise
   `self-test`.
3. A `BASE_CONFLICT` routes to exactly one attempt of a new `resolve-conflict` worker phase whose only task is
   the conflicted paths. It receives no `FACTORY_TASK`, no playbook, no GitHub credential, and no push
   authority; it may only complete the in-progress merge. It does not consume a develop fix round. If it fails,
   or if it leaves any unresolved path or any conflict marker in a merged path, the run fails with an explicit
   state-conflict note and the branch is left exactly as published. The whole run is never restarted for a
   conflict.
4. `self-test` stamps the base it ran against into its own attempt evidence. `prepare-review`, `review`, and the
   publish effect all read that stamped value, and the publish asserts `testedBase ⊆ candidate` against it. A
   candidate whose tested base no longer matches cannot be published or marked ready.
5. On the legacy path, a resumed branch is merged with `FACTORY_BASE_SHA` by trusted, model-free code before the
   model runs, and `factory_push()` refuses any push whose remote head is not an ancestor of the local head. A
   rebase of a published factory branch is rejected by the pusher, not by convention.
6. `FACTORY_CONTAINMENT_V2=1` cannot be widened until a bare-repo drill harness proves all seven named scenarios
   and the one-repo canary passes. The drill runs in CI with no GitHub credential and no network.

### Invariants (must hold after every slice)

- **I6 — published branches are append-only.** Every publish path asserts `publishedHead ⊆ candidate` before the
  push and uses `--force-with-lease` pinned to the exact expected head. No factory code path rebases, resets, or
  force-pushes over a published factory branch. (Containment: `runner/src/containment-effects.ts:415-434`, kept
  as-is. Legacy: added in slice 4.)
- **I3 — evidence binds `{testedBase, candidate}`.** The base recorded on the passed `self-test` attempt is the
  base every downstream phase and the publish effect use. It is written once and never re-derived.
- **No model call decides topology.** Fetch, merge, ancestry assertion, lease, and push stay in trusted
  image-pinned scripts and the runner. The `resolve-conflict` phase resolves *file content* only; the merge
  parents are already fixed by the trusted checkpoint.
- **Fail closed.** Any ambiguity — unreadable evidence, a moved head, a missing pinned base, an unresolved path,
  a conflict marker in a merged path — fails the run rather than publishing.
- **Containment boundaries are unchanged.** No phase gains a credential, mount, network mode, or writable path
  it does not have today. `resolve-conflict` gets strictly less than `develop`.
- **Legacy and containment never both run.** `dispatchPreparedRun` (`runner/src/queue.ts:1876-1890`) stays the
  single routing seam.

### Compatibility requirements

- `FACTORY_CONTAINMENT_V2` stays `0` in production for the whole of this spec. Every containment change is
  proven by tests and drills, not by production traffic.
- Existing runs mid-flight must survive a runner restart across the deploy: `nextPhase` is a pure function over
  the persisted attempt log, so the new routing must be derivable from rows that already exist plus rows written
  after the deploy. A run whose `prepare-workspace` evidence predates the new field is treated as base-current
  (today's behavior) — never as behind-base.
- `runner/src/base-reconciliation.test.ts`, `containers.test.ts`, `queue.test.ts`, and `containment-effects.test.ts`
  keep passing unchanged except where a slice's DoD names the assertion it changes.
- The full runner suite (890 tests as of PR #111) may only grow.

## 3. DELTA

Numbered transitions. Each maps to exactly one slice and names the test that proves it. A slice not tracing to a
DELTA entry is scope creep; a DELTA entry without a proving test is an open end.

| # | Transition | Slice | Proving test |
|---|---|---|---|
| D1 | `agent/factory-prepare-workspace.sh:85` becomes path-dependent: strict `base ⊆ candidate` on the fresh path; on the resume path assert `resumeHead ⊆ candidate` and emit the observed base plus a `baseAhead` marker instead of failing | 1 | `agent/factory-prepare-workspace.test.sh` — behind-base resume exits 0 with `status:passed`, `baseAhead=true`, remote untouched; fresh path with an unrelated candidate still fails |
| D2 | `nextPhase` routes a passed `prepare-workspace` carrying `baseAhead` to `reconcile-base`, and a passed `reconcile-base` to `setup` when `setup` has no passed attempt (else `self-test`) | 1 | `runner/src/containers.test.ts` — table-driven `nextPhase` cases for both orders; absent-field rows route to `setup` |
| D3 | `runner/src/queue.ts` builds the `reconcile-base` environment from the `prepare-workspace` candidate when `develop` has not run, instead of throwing on a null `run.candidate_sha` | 1 | `runner/src/base-reconciliation.test.ts` — pre-`setup` checkpoint produces an append-only merge candidate and the CAS at `queue.ts:1249-1254` succeeds |
| D4 | New `resolve-conflict` worker phase: `agent/factory-resolve-conflict.sh` entrypoint, launcher in `runner/src/containers.ts`, env in `runner/src/queue.ts`; task is the conflicted path list only | 2 | `runner/src/containers.test.ts` — the launch plan for `resolve-conflict` carries no `FACTORY_TASK`/`FACTORY_PLAYBOOK`, no GitHub secret, and no writable mount `develop` lacks |
| D5 | `nextPhase` routes a failed `reconcile-base` to one `resolve-conflict` attempt instead of a `develop` fix round; a second `BASE_CONFLICT` ends the run | 2 | `runner/src/containers.test.ts` — conflict → `resolve-conflict`; conflict again → `{kind:'done', outcome:'failed'}`; `countOf('develop')` unchanged across both |
| D6 | `agent/factory-resolve-conflict.sh` refuses to seal a candidate with any unresolved path or any conflict marker in a path the merge touched | 2 | `runner/src/base-reconciliation.test.ts` — a resolution leaving `<<<<<<<` in a merged path emits `status:failed`, and the marker never reaches a candidate |
| D7 | `self-test` stamps `tested_base_sha` into its passed attempt evidence; `preparedBaseSha()` is replaced by a reader of that stamp for `prepare-review`, `review`, and the publish binding | 3 | `runner/src/queue.test.ts` — a second `reconcile-base` after `self-test` does not move the base seen by `review`; publish asserts `testedBase ⊆ candidate` |
| D8 | Publish refuses a candidate whose stamped `testedBase` is not an ancestor, with a distinct error string | 3 | `runner/src/containment-effects.test.ts` — a forged binding with a non-ancestor tested base rejects before any remote call |
| D9 | `agent/lib/base-merge.sh`: trusted model-free merge of `FACTORY_BASE_SHA` into a resumed legacy branch, invoked from `agent/run.sh` after `factory_resume_branch`; conflict ends the run with a state-conflict note | 4 | `agent/lib/base-merge.test.sh` — behind-base resume merges append-only against a local bare repo; conflict exits with the state-conflict note and pushes nothing |
| D10 | `factory_push()` in `agent/run.sh` refuses a push whose remote head is not an ancestor of the local head (I6 enforced on the legacy path) | 4 | `agent/lib/base-merge.test.sh` — a locally rebased published branch is refused with a distinct note before `git push` runs |
| D11 | `scripts/drills/base-reconciliation-drill.sh` + CI job: seven bare-repo drills (base advance, remote fast-forward, divergent rewrite, ambiguous accepted push, conflict, crash/restart, idempotent replay), no network, no GitHub credential | 5 | The drill script itself, green in CI; a deliberately reverted D1 makes the base-advance drill red |
| D12 | `docs/runbooks/factory-autonomy-activation.md` names the drill run and the one-repo canary as required predecessors of `FACTORY_ACTIVATE_CONTAINMENT_V2=1`; `deploy.sh` emits every variable this spec adds | 5 | `runner/src/containers.test.ts` activation-gate case + `grep` assertion that each new `FACTORY_*` name appears in `deploy.sh` |

## 4. Implementation slices

### Slice 1 — Admit behind-base resumes and reach the checkpoint before setup (minion-factory, 6–8h)

**Topics:** `infra`, `logic`, `test`

Covers D1, D2, D3.

`agent/factory-prepare-workspace.sh` keeps one strict ancestry assertion on the fresh path and, on the resume
path, asserts the candidate contains the pinned resume head, records the freshly fetched base, and reports
whether the candidate already contains it. `emit_result` gains one boolean field in the phase-result JSON
(schema stays version 1 — the field is additive and optional, and a reader that does not find it treats the
candidate as base-current). `runner/src/queue.ts`'s artifact parser accepts and persists it;
`runner/src/containers.ts`'s `nextPhase` gains the two transitions; `runner/src/queue.ts`'s `reconcile-base`
case sources its candidate from the last passed candidate-producing attempt rather than requiring
`run.candidate_sha` to have been set by `develop`.

Files to touch: `agent/factory-prepare-workspace.sh`, `agent/factory-prepare-workspace.test.sh` (new),
`runner/src/containers.ts`, `runner/src/containers.test.ts`, `runner/src/queue.ts`,
`runner/src/base-reconciliation.test.ts`, `runner/src/db.ts` (phase-result field), `runner/src/db.test.ts`.

Definition of done (machine-checkable):
- `bash agent/factory-prepare-workspace.test.sh; echo $?` → `0`, covering: behind-base resume passes with the
  marker set and leaves the remote ref byte-identical; fresh path with a candidate not descended from the base
  still fails with the existing message; resume whose fetched head ≠ `FACTORY_RESUME_HEAD_SHA` still fails with
  `factory-resume-authority: bound branch head moved`.
- `npm test; echo $?` → `0` with the runner suite count strictly greater than its pre-slice value.
- A `nextPhase` unit table asserts: `prepare-workspace passed + baseAhead → reconcile-base`;
  `prepare-workspace passed + no marker → setup`; `reconcile-base passed + no passed setup → setup`;
  `reconcile-base passed + passed setup → self-test`; a `prepare-workspace` row with the field absent → `setup`.
- `grep -rn 'FACTORY_CONTAINMENT_V2' deploy.sh` still shows the flag defaulting to `0`.
- A one-line registry sweep is committed in the PR body: for each repo in the active registry, whether its
  `setup` is order-sensitive to the base merge (the slice-1 known unknown).

### Slice 2 — Bounded conflict-resolution phase (minion-factory, 6–8h)

**Topics:** `infra`, `logic`, `security`, `test`

Covers D4, D5, D6.

A new `resolve-conflict` phase joins `WorkerPhase`, `DEV_PHASE_SEQUENCE`'s launcher table, and
`CONTAINMENT_IMPLEMENTED_PHASES` (so the fail-closed activation gate keeps working). Its entrypoint,
`agent/factory-resolve-conflict.sh`, runs in the same workspace with the merge already in progress. It computes
the conflicted path list itself with `git diff --name-only --diff-filter=U`, hands the model only that list plus
`merge.log`, and after the model returns it re-derives the unresolved set, scans every path the merge touched
for conflict markers, and only then stages, commits the merge, and asserts both parents are ancestors. It never
pushes. `nextPhase` routes a failed `reconcile-base` here (one attempt), and a `resolve-conflict` failure or a
second `BASE_CONFLICT` to `{kind:'done', outcome:'failed'}` with a state-conflict reason — never to `develop`,
never to a run restart. The develop fix-round counter is untouched.

Files to touch: `agent/factory-resolve-conflict.sh` (new), `agent/Dockerfile` (install the entrypoint),
`runner/src/containers.ts`, `runner/src/containers.test.ts`, `runner/src/queue.ts`, `runner/src/queue.test.ts`,
`runner/src/base-reconciliation.test.ts`, `runner/src/lineage-phase-transports.ts` (keep the new phase out of the
lineage worker-request vocabulary), `runner/src/lineage-phase-transports.test.ts`, `deploy.sh`.

Definition of done (machine-checkable):
- `npm test; echo $?` → `0`.
- A launch-plan test asserts the `resolve-conflict` plan has: no `FACTORY_TASK`, no `FACTORY_PLAYBOOK`, no
  `github-*` secret, no persistent-auth mount, and a `FACTORY_CONFLICT_PATHS` env whose value is the diff-derived
  list — compared field-by-field against the `develop` plan for the same run.
- A `nextPhase` table asserts `reconcile-base failed → resolve-conflict (attempt 1)`;
  `resolve-conflict failed → done/failed`; `reconcile-base failed twice → done/failed`; and that
  `countOf('develop')` is identical in all three.
- A behavior test asserts a resolution that leaves `<<<<<<<` in a merged path emits `status:failed` and that
  `git rev-parse HEAD` in the workspace is unchanged from the pre-resolution head.
- `containmentReadiness().ready` is `true` only with the new entrypoint present, and `false` in a test that
  removes it.
- `grep -c 'FACTORY_CONFLICT_MAX_TURNS' deploy.sh` → `1`.

### Slice 3 — Bind `{testedBase, candidate}` through review and publish (minion-factory, 4–6h)

**Topics:** `logic`, `security`, `test`

Covers D7, D8.

`self-test`'s attempt evidence gains `testedBaseSha`, written in the same transaction that closes the attempt
(`runner/src/queue.ts:1240-1256`, `runner/src/db.ts:1652-1680`), sourced from the base the checkpoint sealed.
`preparedBaseSha()` is replaced by `testedBaseSha(runId)`, which reads the passed `self-test` attempt and throws
if absent or malformed. `prepare-review`, `review`, and the `ContainmentEffectBinding` all consume it.
`pushExact` gains an explicit assertion that the bound tested base is an ancestor of the candidate, with a
distinct error string.

Files to touch: `runner/src/queue.ts`, `runner/src/queue.test.ts`, `runner/src/db.ts`, `runner/src/db.test.ts`,
`runner/src/containment-effects.ts`, `runner/src/containment-effects.test.ts`,
`runner/src/base-reconciliation.test.ts`.

Definition of done (machine-checkable):
- `npm test; echo $?` → `0`.
- A test drives `self-test passed` → a second `reconcile-base passed` with a *different* base → `review`, and
  asserts the base in the review env equals the first one.
- A test asserts a run whose `self-test` evidence lacks `testedBaseSha` fails to build the `review` env with a
  named error rather than silently falling back.
- `grep -n 'preparedBaseSha' runner/src/*.ts` → no matches.
- A `containment-effects` test asserts a binding whose tested base is not an ancestor rejects **before**
  `execFile` is called (the fake remote records zero invocations).

### Slice 4 — Legacy path: model-free base merge and an append-only push guard (minion-factory, 6–8h)

**Topics:** `infra`, `logic`, `test`

Covers D9, D10.

`agent/lib/base-merge.sh` merges `FACTORY_BASE_SHA` into a resumed legacy branch with the same hardening the
containment checkpoint uses (`core.hooksPath=/dev/null`, no credential helper beyond `gh`, ancestry assertions
both ways, `--no-ff --no-edit`). `agent/run.sh` calls it immediately after `factory_resume_branch` and before the
model runs; a conflict ends the run with a state-conflict note and no push, matching PR 1's
`^push rejected` unstick classification so the existing `unstick-stateconflict-<id>` monitor event fires.
`factory_push()` gains the I6 guard: fetch the remote head, and refuse when it is not an ancestor of the local
head. This closes PR 2's dangling `FACTORY_BASE_SHA` seam (`runner/src/queue.ts:1971`).

Files to touch: `agent/lib/base-merge.sh` (new), `agent/lib/base-merge.test.sh` (new), `agent/run.sh`,
`agent/Dockerfile`, `runner/src/unstick-classifier.test.ts`, `runner/src/queue.test.ts`.

Definition of done (machine-checkable):
- `bash agent/lib/base-merge.test.sh; echo $?` → `0` against a temporary local bare repo, covering: clean
  behind-base merge is append-only (both `git merge-base --is-ancestor` checks pass and the remote ref is
  unchanged); conflict exits non-zero with the state-conflict note and `git ls-remote` shows the branch
  unmoved; a locally rebased published branch is refused by `factory_push` before `git push` runs.
- `bash agent/spec-integrity.test.sh; echo $?` → `0` (existing agent-script gate).
- `npm test; echo $?` → `0`, including an `unstick-classifier` case asserting the new note classifies as a state
  conflict and is never requeued.
- `grep -n 'FACTORY_BASE_SHA' agent/run.sh agent/lib/base-merge.sh` → at least one match in each.

### Slice 5 — Bare-repo drill harness and the activation gate (minion-factory, 6–8h)

**Topics:** `test`, `infra`, `security`

Covers D11, D12.

`scripts/drills/base-reconciliation-drill.sh` builds a temporary bare repo and drives the real trusted scripts
(`factory-prepare-workspace.sh`, `factory-reconcile-base.sh`, `factory-resolve-conflict.sh`,
`agent/lib/base-merge.sh`) plus the real runner effect path through seven scenarios: base advance on a resumed
branch; remote fast-forward between checkpoint and push; divergent rewrite of the remote branch; ambiguous
accepted push (crash after GitHub accepted); conflict; crash/restart at each remote boundary; idempotent replay
of the whole sequence. It uses `FACTORY_ALLOW_LOCAL_REMOTE=1` (already supported at
`agent/factory-reconcile-base.sh:58-64`), takes no GitHub credential, and asserts exact remote ref counts and a
single confirmed effect per key. It runs as a CI job and is named in the activation runbook alongside the
existing one-repo canary. Every `FACTORY_*` variable slices 1–4 introduce is added to `deploy.sh`'s wholesale
`.env` emission.

Files to touch: `scripts/drills/base-reconciliation-drill.sh` (new), `.github/workflows/ci.yml`,
`docs/runbooks/factory-autonomy-activation.md`, `deploy.sh`, `runner/src/containers.test.ts`.

Definition of done (machine-checkable):
- `bash scripts/drills/base-reconciliation-drill.sh; echo $?` → `0`, printing one `PASS <scenario>` line per
  scenario; `grep -c '^PASS ' <output>` → `7`.
- The drill is a required CI job: `grep -n 'base-reconciliation-drill' .github/workflows/ci.yml` → at least one
  match, and the job runs with no repository secret in its `env`.
- Negative control: reverting slice 1's `agent/factory-prepare-workspace.sh` change makes the base-advance drill
  exit non-zero. Record the transcript in the PR body.
- `for v in $(grep -rhoE 'FACTORY_[A-Z_]+' agent/factory-resolve-conflict.sh agent/lib/base-merge.sh | sort -u); do grep -q "$v" deploy.sh || echo "MISSING $v"; done` prints nothing.
- The runbook's activation checklist lists the drill run *and* the one-repo canary as predecessors of
  `FACTORY_ACTIVATE_CONTAINMENT_V2=1`, and `FACTORY_CONTAINMENT_V2` still defaults to `0` after this slice.

## 5. Cross-repo impact assessment

Target repo: `minion-factory` only. No other repo's source is edited.

| Surface | Impact | Mitigation |
|---|---|---|
| `LineageWorkerPhase` / `executeLineageContainmentWorkerPhase` (`runner/src/lineage-phase-transports.ts:23`, `runner/src/queue.ts:1839-1869`) — consumed by `2026-08-22-factory-lineage-orchestrator-instance-spec` | Slice 2 adds a `WorkerPhase` value. If it leaked into the lineage request vocabulary, an orchestrator could request a conflict phase directly | Slice 2's DoD keeps `resolve-conflict` out of `WORKER_PHASES` and asserts it in `lineage-phase-transports.test.ts`. The phase stays controller-scheduled only |
| `phase_effects` ledger — `2026-08-23-factory-containment-effect-ledger-integration` | Slice 5's drill exercises the crash windows that proposal's two unchecked DoD items describe | Recommend (do not apply) folding those two items into slice 5. The proposal's frontmatter is not edited by this spec |
| `phase_attempts` evidence — `2026-08-18-factory-durable-state-outbox-spec` | Slice 3 adds an evidence field on `self-test` attempts | Additive JSON field inside the existing `evidence` blob; no migration, no column. Rows written before the deploy read as absent and fail the review-env build loudly rather than falling back |
| minion-base board (`base.minion-ai.org`) | Reads `specs/index.json` from minion-meta only | None needed. This spec adds no board-visible field |
| Production factory box | `deploy.sh` rewrites the box `.env` **wholesale** (★★★ `/memory/MINION/minion-factory-agent-pipeline.md`) — a variable absent from `deploy.sh` disappears on the next deploy | Slice 5's DoD greps every new `FACTORY_*` name against `deploy.sh` and fails the slice if one is missing |
| Live production runs at deploy time | Slice 1 changes `nextPhase`, a pure function over persisted rows; a mid-flight run resumes under new routing | Compatibility requirement §2: an attempt row lacking the new field routes exactly as today. Asserted by a `nextPhase` unit case |

### Unavoidable impacts — explicit alerts

- **`agent/Dockerfile` changes in slices 2 and 4 force an agent-image rebuild.** The box self-update rebuilds
  both images; runs in flight at that moment are adopted, not killed (★★★ runner adopts surviving containers on
  restart), but the deploy must still land during a quiet queue. Deploy per
  `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md`: `scripts/self-update.sh`, gated on the newest
  `ci.yml` run for the **exact** sha.
- **`prepare-workspace` is no longer a pure hard gate on ancestry for resumed runs.** This is the point of the
  spec, but it means a genuinely unrelated resumed candidate now reaches `reconcile-base` instead of failing in
  phase 1. The compensating assertion is `resumeHead ⊆ candidate` in slice 1 plus the checkpoint's own
  `base ⊆ merged` assertion; the drill's divergent-rewrite scenario is the proof.

## 6. Out of scope

- Re-implementing `agent/factory-reconcile-base.sh`, the append-only merge, or the exact-lease publish. Shipped
  in minion-factory PR #101 / #102; this spec consumes them.
- Enabling `FACTORY_CONTAINMENT_V2=1` in production, or widening it past the one-repo canary. Slice 5 builds the
  gate; flipping it is a separate, human-gated action.
- Re-enabling automerge (`FACTORY_AUTOMERGE` stays `0`) or changing `humanMergeOnly` / `requiredChecks`.
- The Docker-socket trust boundary, GitHub App capability separation, and the review credential model — owned by
  `2026-08-18-factory-worker-containment-spec` and `2026-08-18-factory-capability-separation-spec`.
- Rebase support of any kind. I6 forbids it; nothing here adds an escape hatch.
- Retiring the legacy path. Slice 4 hardens it; the cutover belongs to the containment rollout.
- Reviewer-instruction isolation and the other cheat vectors filed as separate proposals on 2026-08-28.
- Changing `maxFixRounds`, `FACTORY_LINEAGE_CAP`, or the admission caps from PR 1 / PR 2.

## 7. End-to-end verification

Run in order. Capture `$?` directly after each command — never gate on a pipe
(★★★ `/memory/MINION/MEMORY.md` → `[[piping-gates-masks-exit-code]]`).

1. **Unit + integration.** From the repo root: `npm test; echo "rc=$?"` → `rc=0`, with a test count strictly
   greater than the pre-spec baseline (890 at PR #111). Then `bash agent/spec-integrity.test.sh; echo "rc=$?"`
   → `rc=0`.
2. **Trusted-script drills.** `bash agent/factory-prepare-workspace.test.sh; echo "rc=$?"` and
   `bash agent/lib/base-merge.test.sh; echo "rc=$?"` → `rc=0` each.
3. **Full bare-repo drill.** `bash scripts/drills/base-reconciliation-drill.sh > /tmp/drill.log 2>&1; echo "rc=$?"`
   → `rc=0`, then `grep -c '^PASS ' /tmp/drill.log` → `7`. The drill must run with no GitHub token exported;
   confirm with `env | grep -c '^FACTORY_GH_'` → `0` in the same shell.
4. **Negative control.** Revert slice 1's `agent/factory-prepare-workspace.sh` hunk, re-run the drill, and
   confirm the base-advance scenario fails; restore. Paste both transcripts in the PR body.
5. **The scenario the spec exists for, end to end.** In a temporary bare repo: create base `main` and a factory
   branch published from it; advance `main` with a non-conflicting commit; dispatch a resumed containment run
   with `FACTORY_RESUME_HEAD_SHA` pinned to the published head. Assert (a) the run reaches `review`, (b)
   `git log --graph` on the candidate shows the published head and the advanced base as both parents of a merge
   commit, (c) `git ls-remote` shows the branch moved exactly once, to a descendant of the published head, and
   (d) the `self-test` attempt's `testedBaseSha` equals the base the checkpoint sealed and is an ancestor of the
   published candidate.
6. **Conflict path.** Repeat step 5 with a conflicting base commit. Assert exactly one `resolve-conflict`
   attempt, `countOf('develop')` unchanged from the clean run, and — on a deliberately unresolved resolution —
   `status: failed` with the state-conflict note and `git ls-remote` showing the branch unmoved.
7. **Activation gate still closed.** `grep -n 'FACTORY_CONTAINMENT_V2' deploy.sh` shows the default `0`, and a
   test asserting `containmentGate()` refuses when an entrypoint is removed passes.
8. **Post-merge, on the box.** Deploy via `sudo bash /opt/factory/scripts/self-update.sh` gated on the newest
   `ci.yml` run for the exact sha, then verify the deploy marker equals that sha, `docker ps` shows the runner
   healthy, and the queue is dispatching. Read the box SQLite directly for the check — the factory API `/runs`
   caps at 50 and ignores `offset` (★ `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md`).
