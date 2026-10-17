# Implementation Plan: WorkItem consumers before producer migration

**Branch**: `fix/workitem-consumer-first-plan` | **Date**: 2026-10-17
**Spec**: [spec.md](spec.md)

## Summary

Deliver the missing S5 trust/admission gate in one Factory PR before any S4
producer retrofit. Reuse current topic-policy and manifest risk behavior.
Apply one strict WorkItem boundary to automatic approval, proposal approval
commits, automatic approved-proposal spec starts, and explicit spec starts.
Keep the parent goal in review until independent review and owner security
approval are recorded. This PR changes planning records only.

## Technical Context

**Language/Version**: Factory TypeScript strict, Node 22; meta JavaScript ESM.
**Primary Dependencies**: Existing runner modules; no new dependency.
**Storage**: Existing SQLite runs/manifests/events; no schema migration or rewrite.
**Testing**: Node test runner through `tsx`, real temporary SQLite and HTTP app.
**Target Platform**: Existing Linux Factory runner and trusted promotion workflow.
**Project Type**: Proposal admission in the orchestration service.
**Performance Goals**: Bounded diagnostics; no model call for deterministic validation.
**Constraints**: Preserve active/queued authority; canonical topic policy only;
human security approval before code and human merge before deployment.
**Scale/Scope**: One new strict parser/validator and the existing admission edges.

## Constitution Check

- I/II: Spec, evidence, plan, tasks and acceptance mapping precede code.
- III: Factory implementation is one repo-scoped PR to its registered dev base;
  meta producer/schema work is a separate later slice.
- IV: No UI, route, endpoint, navigation, user string or database surface is
  added. Existing authenticated endpoints gain validation.
- V: This changes approval authority. Owner approval of this security-tagged
  revised spec and owner merge are required. Planning/research are allowed now;
  implementation is blocked until approval is recorded.
- Post-design recheck: no exception to these gates is requested.

## Project Structure

Planning is in `specs/104-workitem-consumer-first/`. The parent flat spec and
proposal remain the single board goal; no duplicate goal is created.

Implementation paths, relative to the independent Factory repository:

```text
runner/src/workitem.ts                 strict DB-free validator/parser (new)
runner/src/workitem.test.ts            contract behavior (new)
runner/src/manifest.ts                 reuse/export risk aggregation if needed
runner/src/lifecycle.ts                eligibility, approval commit, spec admission
runner/src/lifecycle.test.ts           real approval/sweep persistence behavior
runner/src/index.ts                    existing POST /pipeline/spec
runner/src/index.test.ts               actual HTTP rejection and accepted controls
```

`runner/src/automerge.ts`, scheduling, queue ranking and existing run manifests
are regression boundaries. Do not replace their authority with mutable proposal
fields. Meta S4, producer edits and typed monitor intake remain later work.

### Legacy parent dispatch

The parent declares multiple repos, so its S5 run requires explicit per-repo
dispatch to Factory. Current `/runs` collects plan/tasks automatically only from
`specs/<canonicalSpecId>/`; feature 104 has a different directory name. Therefore
the operator must fetch this feature's plan/tasks at the same reviewed meta
commit as the approved flat parent and include their complete contents in the
explicit `task` payload, with an S5-only scope. Before POST, establish and verify
the existing operator brake (`FACTORY_DISPATCH_PAUSED=1`) through the supported
deployment procedure, preserving active containers. This is process environment,
not a live pause endpoint; do not assume an API toggle. If a safe restart/adoption
cannot be proved, wait for active work to drain before changing it. Record the
prior operator state and coordinate the hold with its owner. While held, verify
the returned row remains never-started and queued, its full task matches the
submitted context, and `spec_commit_sha` equals the approved flat file's reviewed
commit (the last-touch commit, not merely the current branch tip). `/runs`
independently resolves that commit and immediately calls `enqueue()`, so checking
after an unheld POST is too late. On mismatch, cancel only this never-started row
under the hold, retain its history, and refresh/review the source before retrying.
Release only this operator-owned unchanged hold, restoring the recorded prior
state through the supported procedure; never clear a pre-existing/concurrent
pause. If ownership cannot be proved, leave it held and request owner direction.
A body link alone is insufficient. Do not add
duplicate board goals or assume a bridge not present in the current collector.
Parent/S5 topics include test and docs for its new tests and README changes.

## AS-IS evidence and decisions

See [research.md](research.md) for the deployed revision and source seams.
The existing source-presence check can approve human intake; approved-index
admission and explicit intake can also bypass a predicate-only fix. Recognized
unclassified topics need an exact derived-low check. Current risk aggregation
already handles high/unclassified/low precedence and must remain canonical.

## TO-BE and DELTA

1. Add a validator accepting `unknown`, plus identity-bound canonical proposal
   parsing that rejects duplicate control fields. Derive risk from validated
   topic policy and compare declared risk; never infer trust from source text.
2. Before automatic approval commits, refetch canonical bytes, require expected
   draft status, validate them and re-evaluate automatic eligibility on those
   exact prospective bytes. Use a controller-selected approval mode, not the
   untrusted actor label, to distinguish automatic from explicit approval.
3. Validate explicit proposal approval before PUT. A human approval operation
   does not make malformed WorkItem fields valid; valid human/external records
   may be approved through the existing authenticated owner authority.
4. Treat index rows as discovery hints. For a NEW automatic spec admission,
   validate canonical proposal bytes and complete metadata at a resolved commit
   before insertion; reject an observed source revision change. Continue past
   item-local invalid records and enqueue successful unrelated admissions once.
5. Apply the same canonical parser/validator to `/pipeline/spec` before insertion.
   Both automatic and explicit starts use the strict file-commit resolver,
   commit-pinned content fetch and a pre-insertion file-revision comparison;
   none may validate a moving-branch body and insert after observed drift.
   Invalid metadata returns 422; unavailable authority/policy returns a retryable
   service failure with no insertion. Existing authentication, status, manifest,
   duplicate and scheduler requirements remain additional gates.
6. A NEW automatic retry is a new admission and requires current valid metadata
   and available policy. Compare canonical normalized topics, derived risk and
   current policy hash with the inherited manifest/snapshot before insertion.
   Hold incompatible topics, risk or policy authority with a bounded renewed-
   review/fresh-lineage requirement. For a compatible retry, preserve the parent
   manifest exactly. This intentionally replaces the prior policy-unavailable
   retry exception; already admitted queued/running retries continue unchanged.
7. Validate repeated sweeps/restart against existing rows/manifests. Leave
   rejection, closure and retirement operations available for legacy records
   so operators can reconcile them without first trusting them.
8. Deploy only after owner merge through the trusted promoter. Record runtime
   refusal and accepted-control evidence, then release S4 for its own review.

## Boundaries and remaining parent work

- This validates authority at approval/admission. `agent/spec.sh` currently
  reads proposal content from its checkout; an immutable proposal-byte handoff
  is not introduced or claimed by this slice. Record this boundary in its PR
  and the parent ledger; existing commit pinning of *spec* handoffs is distinct.
- WorkItem fields remain reviewed repository metadata. Enum/schema checks do
  not authenticate a malicious writer able to commit trusted-automation.
- After S5 runtime proof, release controlled Factory producer changes as a
  separate PR before S4's strict meta schema. Then S4 updates index projection
  and schema and applies a reviewed current-corpus manifest excluding sidecars
  atomically. Index hints discover candidates; full authority comes from the
  canonical document even during the projection transition.
- S6 typed monitor intake and S3's typed dispatch alert operator DoD remain open.
- Score/readiness filtering and stage-descending/oldest-first ordering stay
  separate from the WorkItem priority field.

## Verification and acceptance mapping

| Requirement | Executable evidence |
| --- | --- |
| FR-001/004 | Transition and actual HTTP intake tests: malformed, duplicate and wrong-id source produces zero PUTs/inserts |
| FR-002/003 | Full trust/risk/status matrix and a canonical source changed after an index hint |
| FR-005 | Topic alias/precedence, immutable manifest/automerge and queue-order regression tests |
| FR-006 | Real DB before/after repeated sweeps and restart; exact existing rows/manifests retained |
| FR-007 | Deployed consumer refusal and accepted controls precede reviewed S4 release |
| FR-008 | Parent proposal/spec and PR name the unimplemented S4/S6 boundaries |

Focused tests must fail on the missing gates before implementation and pass
afterwards. Run Factory typecheck and the full runner suite once after the
focused checks; then independent code review, hosted CI, owner merge, trusted
promotion and runtime proof. See [quickstart.md](quickstart.md).
