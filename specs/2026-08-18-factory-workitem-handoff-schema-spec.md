---
id: 2026-08-18-factory-workitem-handoff-schema-spec
title: Typed WorkItem fields + commit-pinned, structured handoffs across the factory pipeline
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory, minion-meta]
proposal: 2026-08-17-factory-workitem-handoff-schema
verdict: approved
tags: [logic, infra]
type: infra
link_review: "pass 2 but has neither \"revises\" nor \"supersedes\" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec"
---

# Typed WorkItem fields + commit-pinned, structured handoffs

## 0. Problem and governing contracts

The approved proposal (`proposals/2026-08-17-factory-workitem-handoff-schema.md`) identifies four integrity gaps:

1. dev runs fetch approved specs by mutable id + branch;
2. dev review is parsed from free-form markdown;
3. multi-repo specs silently select the first fleet-mappable repository; and
4. proposal and monitor intake use incompatible records.

Its definition of done requires one typed WorkItem record containing source trust, risk class, priority, owner, and lifecycle state; commit-pinned spec handoff; a structured review artifact bound to the reviewed head; and multi-repo dispatch that either routes correctly or fails loudly. Priority-based queue scheduling remains out of scope.

This correction also follows these existing contracts:

- `/memory/MINION/minion-factory-agent-pipeline.md`: evidence-bound automation must bind decisions to immutable state; meta pushes use rebase/retry.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md`: dev runs are slice-scoped; approval remains the promotion event.
- `/memory/MINION/factory/2026-08-18-60a08042.md`: a multi-repo spec's Slice 1 cannot be assumed to apply to `repos[0]`; slices need explicit repo routing or the runner must refuse automatic dispatch.
- `/memory/MINION/factory/2026-08-17-3e525e00.md`: one factory dev branch edits one repository; cross-repo schema and consumer changes must be separate ship units.
- `/memory/MINION/factory/2026-08-17-c5f12e0e.md`: the dev container has no Docker or SSH, so production-box checks are operator verification, never a silently skipped PR gate.
- `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` §2/§3-G4/§4: review evidence is artifact-derived, and G4 uses the common score/verdict/reviewer/reviewed-commit shape.

## 1. Confirmed defects and impact zones

1. `runner/src/github.ts:fetchMetaFile()` and a duplicate in `runner/src/index.ts` always read `META_BRANCH`. The mutable fetch is used by manual spec runs, spec→dev auto-queue, and `automerge.ts`; therefore pinning only the container content would still leave merge policy reading mutable tags.
2. `agent/run.sh` parses the first `VERDICT: PASS|FAIL` occurrence from `REVIEW.md`. There is no schema validation, structured finding list, or script-stamped reviewed commit.
3. `runner/src/queue.ts:postFinish()` maps `repos` through `REPO_ALIASES` and calls `.find(Boolean)`. The recorded `60a08042` failure proves that naively fanning “Slice 1” to every repo is also wrong: slice numbers are not repository routing metadata.
4. Proposal frontmatter and `proposals/index.json` are the existing lifecycle record; monitor intake instead creates a GitHub Issue. The proposal schema does not currently type source trust, priority, owner, or risk.
5. `runner/src/lifecycle.ts` treats any non-empty `source` as machine-authored. Requiring `source: human` without changing that condition would auto-approve eligible human proposals and violate human gate 1.
6. `lifecycle.ts` and `automerge.ts` have different high-stakes tag sets. Untagged work is also semantically distinct from low risk and must remain `unclassified`, not be coerced to `low`.
7. Both the automatic fix path in `queue.ts` and `POST /runs/:id/requeue` in `index.ts` copy `spec_id`/`spec.md` but would drop a newly added `spec_sha` unless every insert is updated.
8. `POST /hooks/monitor` currently deduplicates repeat events in SQLite without a GitHub write. Updating a proposal on every repeat would undo the flood-control contract and create commit spam.

## 2. Canonical contracts

### 2.1 WorkItem

Each object emitted in `proposals/index.json.proposals` is the canonical WorkItem record. Existing keys remain compatible; these fields become required and runtime-validated:

| Field | Type / values | Meaning |
|---|---|---|
| `source` | non-empty slug | provenance (`human`, `ci-watch`, `monitor`, `audit-*`, etc.) |
| `source_trust` | `human` \| `trusted-automation` \| `untrusted-external` | whether automation may act without human gate 1 |
| `risk_class` | `high` \| `low` \| `unclassified` | intake risk; untagged work is `unclassified` |
| `priority` | `critical` \| `high` \| `medium` \| `low` | triage metadata only; it does not change FIFO scheduling |
| `owner` | non-empty string, max 120 characters | accountable person/role (`human` or `factory` by default) |
| `status` | existing `P_STATUSES` enum | lifecycle state; no duplicate lifecycle field is added |

The priority enum reuses the existing severity/priority vocabulary documented in `specs/2026-07-10-bug-triage-workforce-agents-plan.md`; this spec does not map it to dequeue order. `value` remains an independent, backward-compatible proposal field and is not a priority alias.

`risk_class` is explicit on proposal frontmatter so the WorkItem is self-contained. Factory consumers use one `classifyRisk()` helper for spec tags and validate any declared WorkItem risk. `HIGH_STAKES_TAGS` is the conservative union already used by `automerge.ts`: `security`, `data`, `infra`, `auth`, `perms`, `permissions`, `migration`, `migrations`, `billing`. Tag-derived risk is `unclassified` for no tags, `high` if any high-stakes tag is present, otherwise `low`. Proposal validation rejects a declared `risk_class` that disagrees with this derivation; intake writers therefore cannot label `[infra]` as low risk.

Only `source_trust: trusted-automation` plus `risk_class: low` may satisfy the source/risk portion of `promoteSweep()` auto-approval. `human` and `untrusted-external` always keep human gate 1 regardless of tags.

### 2.2 Review artifact

The final `/out/review.json` contract is:

```json
{
  "schemaVersion": 1,
  "verdict": "fail",
  "score": 4.0,
  "axes": { "correctness": 3, "scope": 6, "tests": 3 },
  "findings": [
    { "severity": "critical", "claim": "...", "file": "path", "line": 123, "fix": "..." }
  ],
  "memoryConsulted": ["memory file or observation title"],
  "reviewer": "factory-review",
  "reviewedCommit": "<script-stamped git SHA>",
  "runId": "<script-stamped run id>"
}
```

The harness may emit only `pass` or `fail`; the script may synthesize `error` with one `high` finding when output is absent or invalid. `score` and every axis are finite numbers from 0 through 10. Findings use `critical|high|medium|low`; `pass` requires `findings: []`, while `fail` requires at least one finding. `reviewedCommit` and `runId` are forbidden in harness output and added only by `run.sh` after any reviewer-applied changes are committed. `REVIEW.md` remains the human-readable PR comment. This supplies the score/axes/reviewer/reviewed-commit fields required by the G4 rollout; that separate rollout owns any mapping from this stage's binary pass/fail outcome to its board-level `pass|warn|block` presentation.

## 3. Implementation slices

Each numbered slice is a separate factory dev run and edits one repository. Local gates are required before its PR can pass. Checks explicitly labeled **operator E2E** run after deployment because the factory dev container has neither Docker nor SSH.

### Slice 1 — Commit-pinned spec handoff (minion-factory, 6–8h)

**Files:** `runner/src/github.ts`, `runner/src/index.ts`, `runner/src/queue.ts`, `runner/src/db.ts`, `runner/src/automerge.ts`, `agent/spec.sh`, `agent/run.sh`, focused tests.

- Add nullable `runs.spec_sha TEXT` to both the additive migration block, fresh-table DDL, and `Run` type.
- Change `fetchMetaFile(path, ref = META_BRANCH)` to URL-encode both path/ref, delete the duplicate in `index.ts`, and add `resolveFileHeadSha(path, ref)` using the commits API (`path`, `sha`, `per_page=1`). A missing file commit returns `null`.
- After pass-2 `push_meta()` succeeds, `agent/spec.sh` records `git rev-parse HEAD` as `specSha` in `result.json`. `finish()` COALESCEs it into `runs.spec_sha`.
- Spec→dev auto-queue fetches the approved spec at `run.spec_sha`, writes that exact content to the child run, and inserts the same SHA. Missing `spec_sha` on a newly completed spec run is fail-loud via `/hooks/monitor`, not a branch fallback.
- Manual `POST /runs {specId}` resolves the most recent commit touching the spec on `META_BRANCH`, fetches at that SHA, verifies the requested `repoId` is one of the spec's fleet-mapped repos, and stores the SHA. Unknown/mismatched repos return 400 before inserting a run.
- Both requeue insert paths (`queue.ts` automatic fix and `POST /runs/:id/requeue`) copy `spec_sha`; `queue.ts` passes it as `FACTORY_SPEC_SHA`. `run.sh` writes an audit comment above the provided `FACTORY_SPEC.md` content.
- `automerge.ts` fetches tags at `run.spec_sha`; a spec-backed run without a SHA is ineligible. It must never fall back to mutable `META_BRANCH` for merge policy.

**Local definition of done:** TypeScript passes; focused tests prove explicit-ref fetch construction, manual repo mismatch rejection, SHA propagation through initial insert + both requeue paths, and automerge's fail-closed missing/mismatched SHA behavior. A temporary DB initialized through `db.ts` contains `spec_sha`.

**Operator E2E:** approve a scratch spec, move `dev` with an unrelated commit, start a manual dev run, and verify `GET /runs/:id.spec_sha` is the spec's last-touching commit and the run's `FACTORY_SPEC.md` body after its audit comment matches that commit.

### Slice 2 — Structured, commit-bound review artifact (minion-factory, 6–8h)

**Files:** `agent/run.sh`, a reusable jq schema/helper under `agent/`, shell fixture tests, `runner/src/repos.ts` if needed to include them in self-test.

- Extend the review prompt to require `REVIEW.md` and schema-versioned `review.json`, but do not ask the model for `reviewedCommit` or `runId`.
- Validate the full JSON contract, not merely JSON syntax or `.verdict`. Invalid/missing output is replaced with a valid `verdict: error` artifact and remains fail-closed.
- Remove both review artifacts before every review/fix iteration so stale JSON cannot satisfy a later attempt.
- Preserve the existing order in which reviewer-applied changes are committed, pushed, and self-tested. Stamp `reviewedCommit=$(git rev-parse HEAD)` only after that commit exists and before any exit from that review iteration. The stamp must therefore identify the exact committed tree to which the final verdict applies.
- Parse control flow from validated JSON. `pass` continues; `fail` enters the existing bounded fix loop; `error` stops for a human. Continue posting `REVIEW.md` to the PR.
- Do not add a derived severity column to `runs`: `review.json` is the source of truth, consistent with the approved phase-gates spec. Board score rendering remains owned by that spec's G4 rollout.

**Local definition of done:** `bash -n agent/run.sh` passes; fixture tests cover valid pass, valid fail, malformed JSON, invalid enum/range, pass-with-findings, fail-without-findings, forbidden harness-supplied stamp fields, and replacement with a valid error artifact. An integration fixture where review modifies a file proves `reviewedCommit` equals the post-review commit, not the pre-review head.

**Operator E2E:** with `FACTORY_REVIEW_FIX_LOOP=0`, one clean and one deliberately broken scratch PR leave valid final artifacts; the clean artifact is `pass` with no findings, the broken artifact is `fail` or `error`, and `reviewedCommit` equals the PR head immediately after the review iteration.

### Slice 3 — Multi-repo specs fail loudly until slice routing is explicit (minion-factory, 4–6h)

**Files:** `runner/src/queue.ts`, focused resolver/queue tests.

- Extract pure alias normalization returning distinct mapped repos and unmapped declarations.
- Auto-queue only when the normalized declaration contains exactly one mapped repo and no unmapped repo.
- For zero mapped repos, any unmapped repo, or more than one distinct mapped repo, queue no dev run and POST one idempotent `/hooks/monitor` alert with `source: spec-dispatch`, `tags: [logic, infra]`, the spec id/SHA, declared repos, and a reason that manual repo-and-slice dispatch is required.
- Keep the existing once-per-spec duplicate guard for the single-repo happy path. Alias duplicates that normalize to one repo (for example `minion_hub` plus `minion-hub`) still create exactly one run.
- Do not manufacture “Slice 1 for repo X” tasks. Future automatic fan-out requires explicit per-slice repository metadata in the spec schema and is a separate decision.

This deliberately selects the proposal's allowed **fail loudly** outcome. It is required by `/memory/MINION/factory/2026-08-18-60a08042.md`, which records a real wrong-repository dispatch caused by assuming slice order follows `repos` order.

**Local definition of done:** resolver/queue tests cover one mapped repo, alias duplicates, two distinct mapped repos, mapped + unmapped, and zero mapped. Every non-routable case asserts zero inserts plus exactly one stable-fingerprint alert; TypeScript passes.

**Operator E2E:** approving a spec with `repos: [minion_hub, minion_site]` creates zero automatic dev runs and one visible typed proposal explaining the manual dispatch requirement. Repeating `postFinish()` does not create another alert card.

### Slice 4 — Typed WorkItem schema and retrofit (minion-meta, 6–8h)

**Files:** `proposals/TEMPLATE.md`, `scripts/proposal-index.mjs`, a pure WorkItem validation/classification module + tests, one-time retrofit script, `proposals/*.md`.

- Document and enforce the §2.1 fields. `proposal-index.mjs` must reject missing/invalid values and project every field into each index entry.
- Centralize tag-derived risk in the pure module and reject declared risk/tag disagreement. The validator, retrofit, and tests use the same function.
- Retrofit every historical proposal deterministically from the current corpus: the seven source-less `ci-*.md` files become `source: ci-watch`, `source_trust: trusted-automation`, `owner: factory`; the other four source-less files become `source: human`, `source_trust: human`, `owner: human`; existing `audit-*`, `debt-sweep-*`, and `factory-review-*` sources become `trusted-automation`, `owner: factory`. Any source outside those explicit rules makes the script fail and name the file instead of guessing. Derive `risk_class` from tags and set `priority: medium` without changing `value`.
- Add tests for all enums, untagged=`unclassified`, every high-stakes alias, mismatch rejection, and a complete valid record. Run the retrofit and validator in the same commit so no intermediate revision breaks factory meta pushes.

**Definition of done:** pure tests pass; `node scripts/proposal-index.mjs` exits 0 over the full retrofitted directory; a temporary fixture missing each required field or containing a risk/tag mismatch exits non-zero with its filename and field. The generated index contains the complete WorkItem fields for every proposal. No `index.json` is hand-edited.

### Slice 5 — WorkItem-aware factory consumers (minion-factory, 4–6h)

**Files:** `runner/src/lifecycle.ts`, `runner/src/automerge.ts`, shared risk helper + tests, `agent/reconcile.sh`, `playbooks/request-agent.md`.

- Model the §2.1 index entry as a TypeScript `WorkItem`; validate untrusted index JSON before using it.
- Replace both local high-stakes sets with one `classifyRisk()` helper. Untagged input returns `unclassified`.
- Change `promoteSweep()` to require `source_trust === 'trusted-automation' && risk_class === 'low'` in addition to its existing status/duplicate/reopen guards. It must not infer trust from non-empty `source`.
- Keep `automerge.ts`'s existing low-stakes/double-pass behavior, but use the shared risk helper for the high-stakes decision.
- New CI-watch proposals include `source: ci-watch`, `source_trust: trusted-automation`, derived `risk_class`, `priority: medium`, and `owner: factory`. The request-agent playbook writes human trust/ownership unless the user explicitly supplies another owner.

**Definition of done:** tests prove a low-risk trusted automation may auto-approve, while otherwise-identical `human` and `untrusted-external` items may not; unclassified and high-risk work remain gated. Lifecycle and automerge have zero local high-stakes set declarations. Existing lifecycle transition tests remain green.

### Slice 6 — Monitor intake writes a typed proposal (minion-factory, 6–8h)

**Files:** `runner/src/index.ts`, `runner/src/github.ts` or a small shared meta-write helper, `runner/src/db.ts` only if its TypeScript row naming is clarified, focused tests.

- Replace issue creation with a GitHub Contents API upsert of `proposals/monitor-<source>-<12-char fingerprint hash>.md`. Hashing the effective fingerprint makes the id stable, bounded, and collision-resistant without embedding alert text.
- Emit a complete WorkItem: `source` is the sanitized request source, `source_trust: untrusted-external`, `owner: factory`, validated `priority` (default `medium`), allowlisted tags from the approved taxonomy (`ui, logic, data, infra, docs, test, security, perf, deps`), derived `risk_class`, and `status: draft`. External callers cannot declare trust or risk.
- Serialize YAML scalars with a shared safe helper (JSON string encoding is valid YAML); whitespace-collapse the title for both frontmatter and H1. Preserve URL allowlisting, length caps, and the explicit untrusted-detail fence.
- Preserve dedupe semantics: a repeat inside 24 hours only increments SQLite count/last-seen and performs no GitHub write. A stale recurrence updates the same proposal once with a “Recent recurrence” entry.
- Update `proposals/index.json` immediately after the proposal write using conditional SHAs and the complete WorkItem projection. GitHub's Contents API necessarily creates a second commit; do not claim the two PUTs are one commit. Return 201 only after both writes succeed. If the proposal write succeeds but the index write races/fails, return 502 without recording dedupe state so a retry repairs the index idempotently.
- Continue storing the proposal blob URL in the legacy `monitor_events.issue_url` column for compatibility; readers treat it as an opaque artifact URL.

**Local definition of done:** mocked GitHub tests cover create, in-TTL dedupe (zero GitHub writes), stale refresh, proposal-write failure, index-write race/retry, title/YAML injection, tag filtering, and deterministic ids. TypeScript passes.

**Operator E2E:** two identical posts inside the TTL create one proposal and two SQLite occurrences without changing the proposal blob SHA on the second call; `proposals/index.json` exposes the complete WorkItem; no GitHub Issue is created. A stale-fixture recurrence updates the same proposal rather than creating another.

## 4. Cross-repo ordering and impact

1. Slice 1 lands before any spec-backed run relies on `spec_sha`.
2. Slice 4 (meta schema + complete retrofit) lands atomically before Slice 5 enables factory consumers that require the new fields.
3. Slice 5 lands before Slice 6, so monitor-created records are interpreted with the new trust gate from their first release.
4. Slice 6 should precede Slice 3 in deployment if fail-loud dispatch alerts must be typed proposals immediately; reversing those two temporarily produces a legacy issue but never silently dispatches work.

No minion-base code is required: it already reads `proposals/index.json`. Adding fields is backward-compatible. Board rendering of trust/risk/priority and `review.json` scores remains outside this spec; data availability is covered here, UI presentation by the phase-gates spec.

## 5. Out of scope

- priority-based scheduling or changing FIFO dequeue order;
- automatic multi-repo fan-out before specs carry explicit per-slice repo metadata;
- G4 board score chips and historical score reconciliation;
- using review severity/score to change automerge policy;
- normalizing the separate `value` field;
- retrofitting pre-Slice-6 GitHub Issues into proposals.

## 6. End-to-end acceptance

After all six slices are deployed:

1. Every proposal index entry passes the WorkItem validator and contains source, source trust, risk class, priority, owner, and lifecycle status.
2. A human-authored low-risk proposal remains at human gate 1; a trusted-automation low-risk fixture may follow the existing auto-approval path; an untrusted monitor item cannot.
3. An approved single-repo spec produces one dev run whose stored SHA, injected content, requeues, review, and automerge policy all remain bound to the same spec commit.
4. A multi-repo spec produces no automatic dev run and one idempotent, board-visible dispatch proposal. A human can then submit one explicit `POST /runs` per repo/slice; mismatched repo ids are rejected.
5. The final review leaves both human-readable markdown and schema-valid JSON. The JSON's script-stamped `reviewedCommit` equals the reviewed PR head and cannot be supplied by the harness.
6. Monitor repeats preserve the existing SQLite dedupe/flood behavior and create no issue or per-repeat commit.
