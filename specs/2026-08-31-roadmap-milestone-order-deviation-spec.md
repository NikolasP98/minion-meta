---
id: 2026-08-31-roadmap-milestone-order-deviation-spec
title: Reconcile shipped M7 promotion controls against M4 predicates P5-P7
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
repos: [minion-factory, minion-meta]
proposal: 2026-08-29-roadmap-milestone-order-deviation
verdict: pending
relationship: depends-on
related: [2026-08-18-sdlc-transformation-roadmap, 2026-08-18-factory-m0-safety-foundation-spec, 2026-08-18-factory-topic-capability-manifest-spec, 2026-08-18-factory-worker-containment-spec, 2026-08-22-factory-dev-staging-daily-production-promotion-spec]
---

# Reconcile shipped M7 promotion controls against M4 predicates P5-P7

## 0. Product

The approved proposal states the problem this spec resolves:

> The ordering existed for a reason: M4 supplies the identity, containment and
> final-diff reclassification that M7's release path is supposed to rely on, and
> predicates P5, P6 and P7 of the acceptance suite are M4-shaped. A release path that
> promotes artifacts without them is trusting evidence that no enforced control
> produced.
>
> This is an ordering claim, not an exploit claim — no attempt was made to find a
> live bypass in the shipped promotion path, which is why the definition of done
> below starts with an audit rather than a fix.

The outcome is a committed, reproducible audit of the active production-promotion
path and fail-closed enforcement for every P5, P6, or P7 gap the audit demonstrates.
It supplies evidence only for condition 1 of the roadmap's §5 durable closure gate;
it does not dispose of the separate M5 or M6 prerequisites.

## 1. Relationship recommendation

**Recommended relationship: `depends-on`.** Index searches found no artifact with
the same three-predicate audit and closure DoD. This work depends on existing owners
of the roadmap predicates and shipped promotion seams; it must test or connect those
controls, not reimplement competing identity, check-trust, or classification policy.
This recommendation does not merge, retire, supersede, or edit a related artifact.

- `2026-08-18-sdlc-transformation-roadmap` — defines normative M4→M5→M7 ordering,
  predicates P5-P7, and the three-condition durable closure gate this spec may only
  partially satisfy.
- `2026-08-18-factory-m0-safety-foundation-spec` — owns trusted check identity as
  `{name, appId}` and therefore supplies P6's policy seam.
- `2026-08-18-factory-topic-capability-manifest-spec` — owns paginated, monotonic
  final-diff reclassification and merge eligibility, which this audit must verify for P7.
- `2026-08-18-factory-worker-containment-spec` — owns the M4 containment and PR
  identity boundary; this spec consumes its controls without enabling
  `FACTORY_CONTAINMENT_V2`.
- `2026-08-22-factory-dev-staging-daily-production-promotion-spec` — describes the
  shipped `scripts/promotion/*` production path being audited and its exact-candidate
  release contract.

## 2. AS-IS → TO-BE → DELTA

### 2.1 AS-IS — verified current behavior and known unknowns

- `specs/2026-08-18-sdlc-transformation-roadmap.md` §5 records that M7 promotion
  shipped while M4 remains incomplete and defines P5 (PR identity mismatch blocks
  readiness), P6 (check `{name, appId}` mismatch blocks merge), and P7 (final-diff
  risk additions force reclassification).
- `specs/2026-08-18-factory-m0-safety-foundation-spec.md` anchors P6 in
  `runner/src/repos.ts` (`RepoDef.requiredChecks`) and `runner/src/automerge.ts`:
  a matching check name is insufficient when the configured GitHub App id differs.
- `specs/2026-08-18-factory-topic-capability-manifest-spec.md` anchors P7 in
  `runner/src/manifest.ts`, `runner/src/queue.ts:postFinish()`, and
  `runner/src/automerge.ts:sweep()`: `reclassifyRunFromPr()` must consume the complete
  paginated PR file list and merge eligibility must read the reclassified manifest.
- `specs/2026-08-18-factory-worker-containment-spec.md` records M4 as incomplete and
  `.env.example` keeps `FACTORY_CONTAINMENT_V2=0`; this spec may not equate dormant
  code with enforcement.
- The active marker-managed production path is
  `scripts/promotion/deploy-exact.sh`, not bootstrap-only
  `scripts/self-update.sh`. This is a hard operational constraint from
  `/memory/MINION/factory/2026-08-28-6041c22c.md`.
- Shipped release surfaces include `.github/workflows/promote-dev-daily.yml`,
  `scripts/promotion/build-release-manifest.mjs`,
  `scripts/promotion/authenticated-boundary-probe.sh`,
  `scripts/promotion/deploy-exact.sh`, and
  `scripts/activation/run-scoped-github-canary.sh`. The exact call graph and whether
  it consumes the same P5-P7 evidence remain **unproved** until Slice 1 traces the
  current `minion-factory` development-branch baseline.
- `FACTORY_AUTOMERGE=0` is a hard constraint recorded in
  `/memory/MINION/MEMORY.md` under “minion-factory agent pipeline”; this spec must
  preserve that default and must not use
  disabled automerge as proof that promotion is safe.

### 2.2 TO-BE — target behavior and invariants

For the exact immutable candidate promoted by `deploy-exact.sh`, one committed audit
matrix classifies each predicate as `enforced`, `assumption`, or `not-addressed`, with
the controlling code symbol, call path, negative test, and resulting gate. Any
`assumption` or `not-addressed` verdict becomes an explicit fail-closed promotion
gate before this spec can close.

Invariants:

1. P5 binds readiness evidence to the expected repository, PR, head/candidate SHA,
   and base; any identity mismatch exits before a production effect.
2. P6 accepts every required check only when both configured name and App id match
   the check run bound to the candidate SHA; missing or ambiguous identity blocks.
3. P7 classifies the complete paginated final PR diff under its pinned policy;
   added risk can only increase requirements, stale pre-diff evidence cannot pass,
   and incomplete pagination or policy evidence blocks.
4. The three decisions are controller-derived and bound into the release manifest
   or an equally immutable promotion receipt consumed by `deploy-exact.sh`.
5. Audit and gate reruns are deterministic and side-effect-free until all three
   predicates pass; a failed preflight cannot advance `main`, write the deploy
   marker, build/deploy production, or claim readiness.
6. `FACTORY_AUTOMERGE` remains `0`; `FACTORY_CONTAINMENT_V2` is not enabled by this
   work; the roadmap ordering and M5/M6 open conditions remain unchanged.

### 2.3 DELTA — numbered transitions and proof

1. **D1 (Slice 1):** unknown promotion-path coverage becomes a committed P5-P7
   matrix derived from the current call graph. Proof: the audit checker resolves
   every matrix anchor and rejects a missing predicate, verdict, negative-test id,
   or active-path edge.
2. **D2 (Slice 2):** every demonstrated P5/P6/P7 assumption or omission becomes a
   candidate-SHA-bound, fail-closed preflight in the active promotion path. Proof:
   table-driven negative tests independently mutate PR identity, check App identity,
   and the final diff; each mutation exits non-zero before a mocked production
   effect, while a fully matching fixture reaches the effect boundary once.
3. **D3 (Slice 3):** local controls become end-to-end release evidence and the
   roadmap deviation is re-passed without overstating closure. Proof: a dry-run
   candidate traverses workflow → manifest/receipt → preflight → deploy boundary;
   the verification script asserts all P5-P7 evidence binds the same SHA,
   `FACTORY_AUTOMERGE=0`, no production mutation, and roadmap text explicitly keeps
   conditions 2 (M5) and 3 (M6) open.

## 3. Approach — vertical implementation slices

Before each slice, read `minion-factory/AGENTS.md` in the implementation checkout
and re-resolve symbols on its current development branch. Line numbers below are
deliberately avoided; filenames and symbols are the stable anchors.

### Slice 1 — trace and machine-check the active P5-P7 path (4-6 focused hours)

**Topics:** `infra`, `security`, `test`

**Files to touch:**

- `minion-factory/docs/audits/roadmap-m4-m7-p5-p7.md` (new)
- `minion-factory/scripts/promotion/check-m4-predicate-audit.mjs` (new)
- `minion-factory/test/promotion/m4-predicate-audit.test.mjs` (new)

Trace `.github/workflows/promote-dev-daily.yml` into the exact scripts it invokes,
through immutable candidate selection, release-manifest/receipt construction,
authenticated boundary probe, and `deploy-exact.sh`. For P5, P6, and P7 record:
predicate; `enforced|assumption|not-addressed`; entry point; controlling symbol;
evidence input and SHA binding; consumer; negative test; and pre-effect failure
boundary. The checker parses the audit's fixed table and confirms every referenced
repository-relative file and symbol exists. It must fail unless there is exactly one
row for each predicate and no non-`enforced` row lacks a named Slice 2 gate.

**Machine-checkable DoD:** `npm test -- --test-name-pattern='M4 predicate audit'`
passes; deleting any P5/P6/P7 row or breaking an anchor makes it fail; the audit
states what is unproved and identifies the exact active production entry point.

### Slice 2 — close only the gaps proved by the audit (6-8 focused hours)

**Topics:** `infra`, `security`, `test`, `logic`

**Files to touch (conditional on D1 findings; do not edit a seam already enforced):**

- `minion-factory/scripts/promotion/lib.sh`
- `minion-factory/scripts/promotion/build-release-manifest.mjs`
- `minion-factory/scripts/promotion/authenticated-boundary-probe.sh`
- `minion-factory/scripts/promotion/deploy-exact.sh`
- `minion-factory/runner/src/repos.ts`
- `minion-factory/runner/src/automerge.ts`
- `minion-factory/runner/src/manifest.ts`
- `minion-factory/runner/src/queue.ts`
- `minion-factory/test/promotion/m4-predicate-gates.test.mjs` (new)
- `minion-factory/docs/audits/roadmap-m4-m7-p5-p7.md`

Prefer wiring the existing M0/M4 manifest and classifier results into the immutable
promotion receipt. Add promotion-local validation only when the audit proves the
existing controller seam cannot be consumed. Unknown/missing GitHub fields,
pagination failure, mismatched candidate SHA, or stale policy evidence must return
a stable non-zero reason code. All gate evaluation completes before any deploy,
branch movement, marker/state write, backup/restore, or production container effect.

**Machine-checkable DoD:** table-driven fixtures prove all three negative cases
block before the effect spy; missing fields and page-two risk additions also block;
the matching control fixture reaches the effect boundary exactly once; existing
promotion, runner, and containment tests pass. Every non-`enforced` Slice 1 verdict
is updated to `enforced` with its test id and code anchor.

### Slice 3 — integrate the dry-run release proof and re-pass the roadmap (4-6 focused hours)

**Topics:** `infra`, `security`, `test`

**Files to touch:**

- `minion-factory/scripts/promotion/verify-m4-release-gates.sh` (new)
- `minion-factory/test/promotion/m4-release-gates.integration.test.mjs` (new)
- `minion-factory/docs/audits/roadmap-m4-m7-p5-p7.md`
- `minion-meta/specs/2026-08-18-sdlc-transformation-roadmap.md`

Run the real promotion composition in a no-network/no-production fixture with a
synthetic candidate, two pages of PR files, trusted and untrusted check identities,
and a disposable effect directory. Verify that workflow inputs, audit decisions,
release manifest/receipt, and deploy preflight all name the same candidate SHA.
Update only the roadmap's §5 deviation/closure evidence: state that P5-P7 are
enforced (or keep the exact remaining predicate gap open), that this work supplies
condition 1 evidence only, and that M5/M6 dispositions remain open.

**Machine-checkable DoD:** the integration test fails under each single-field
identity/App-id/SHA/pagination mutation and passes the valid fixture; the verification
script asserts no production effect and exact `FACTORY_AUTOMERGE=0`; meta heading and
index checks pass without editing either `index.json` by hand.

## 4. Cross-repo impact assessment

| Impact zone | Assessment | Mitigation or alert |
|---|---|---|
| Gateway protocol / shared packages | None: no frame, package, or downstream consumer contract changes. | Do not add `@minion-stack/shared` surfaces. |
| Database / migrations | None expected: audit evidence belongs in the immutable release manifest/receipt and committed audit. | Any newly discovered need for persistent schema is an unavoidable scope expansion and requires a new proposal/spec, not an ad hoc migration here. |
| Auth / security | Direct: GitHub PR/check identity and promotion authority are security boundaries. | Parse external GitHub/manifest data as unknown; fail closed; preserve human approval and merge gates because this work is security-tagged in its source proposal. |
| Deployment | Direct: `deploy-exact.sh` is the active marker-managed path. | All new checks precede effects; verification is dry-run only; preserve rollback and immutable-candidate behavior. |
| M4 worker containment | Consumed but not activated. | Reuse controller-owned results where enforced; do not enable `FACTORY_CONTAINMENT_V2`. |
| M5/M6 and M8 | Unavoidable program-level alert: this work cannot satisfy their roadmap dispositions. | Roadmap re-pass must explicitly retain conditions 2 and 3 as open and must not unblock M9/autonomy graduation. |
| Generated artifacts | `specs/index.json` and `proposals/index.json` will eventually need normal generator refresh after lifecycle edits. | They are explicitly excluded from this planning pass; implementation uses the normal generator and never hand-edits them. |

## 5. Explicit out-of-scope

- Enabling `FACTORY_CONTAINMENT_V2` or completing the remaining worker-containment slices.
- Implementing or waiving M5, giving M6 a disposition, completing M8 memory
  governance, or lifting the roadmap's M9 autonomy-graduation block.
- Changing the roadmap's critical-path ordering to match historical execution.
- Enabling automerge or changing `FACTORY_AUTOMERGE` from `0`.
- Live bypass/exploit testing against production, a live deployment, branch
  movement, or production marker/state mutation during verification.
- Replacing the existing M0 trusted-check or topic-manifest policy with a second
  classifier, identity registry, or parallel source of truth.
- Resolving the separate un-homed program-detail proposal.

## 6. End-to-end verification

From isolated checkouts on the implementation branches:

```bash
cd minion-factory
npm test -- --test-name-pattern='M4 predicate audit|M4 predicate gates|M4 release gates'
npm test
FACTORY_AUTOMERGE=0 scripts/promotion/verify-m4-release-gates.sh --fixture test/fixtures/promotion/m4-valid

cd ../minion-meta
node scripts/spec-index.mjs --check
node scripts/check-agent-instructions.mjs
```

Then inspect the generated dry-run receipt and audit together. They must show one
`enforced` verdict each for P5, P6, and P7, bind all evidence to the same candidate
SHA, record zero production effects, and leave roadmap §5 conditions 2 and 3 open.
If any predicate is not enforced, verification fails and the deviation remains open;
the implementer must not soften the checker or claim partial closure.
