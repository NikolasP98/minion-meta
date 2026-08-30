---
id: 2026-08-29-factory-quality-tool-routing-spec
title: Factory quality-tool routing — conditional GSD planning and no-mistakes release gates
stage: spec
status: approved
pass: 1
created: 2026-08-29
updated: 2026-08-29
verdict: approved
repos: []
tags: [logic, infra, test]
type: decision
relationship: extends
related: [2026-08-29-factory-failure-cost-hardening-spec]
---

# Factory quality-tool routing

## 0. Product

Use GSD and no-mistakes only where each adds independent evidence without creating a second
controller for the same work. This decision extends the failure-cost hardening program with a
measured routing policy: GSD is an upstream program-planning aid, and no-mistakes is an external
release-operator gate for exceptional control-plane changes. Neither tool becomes a stage that
every Factory run executes.

No proposal precedes this decision. The user requested the evaluation directly while the measured
failure-cost program was being implemented, so a second proposal would only repeat the accepted
problem statement.

## 1. AS-IS: two useful tools, two overlapping lifecycles

### 1.1 GSD

The GSD autonomous workflow discovers a roadmap and then performs discuss, plan, execute, audit,
milestone completion, and cleanup. It writes `.planning/STATE.md`, `.planning/ROADMAP.md`, and phase
artifacts. Factory already has one canonical lifecycle backed by proposals, specs, GitHub pull
requests, immutable run records, and the Base board. Running GSD inside an admitted Factory card
would therefore create a second roadmap, a second executor, and a second completion record for the
same work.

The Factory agent image does not contain the GSD skill bundle. Adding it would increase image and
prompt surface while giving an ephemeral worker authority to invent phases after the reviewed spec
has already fixed scope.

### 1.2 no-mistakes

no-mistakes owns an end-to-end branch pipeline: intent, rebase, review, test, documentation, lint,
push, pull request, and hosted CI. Factory owns substantially the same candidate lifecycle. Nesting
the complete no-mistakes pipeline inside a Factory run would create competing branch, PR, review,
test, and CI authorities.

The local no-mistakes history observed on 2026-08-29 reports 40 changes across 21 repositories,
27 rescued changes, 376 findings, and 210 review-stage fixes. That is strong evidence that its
independent review can add value. The three measured hardening runs used 64 agent invocations,
approximately 141 agent-minutes, approximately 4.98 million non-cache-read input tokens, and
432,261 output tokens. The Factory hardening review alone required repeated fix rounds. This is
also strong evidence that it is too expensive and too stateful to run on every card.

## 2. TO-BE: one controller per lifecycle

1. The Base board, meta-repo proposals/specs, and Factory database remain the only production SDLC
   source of truth. GSD and no-mistakes may produce evidence for that lifecycle; they do not create
   parallel production state.
2. An admitted Factory run never launches GSD or a complete no-mistakes run.
3. GSD runs only before admission, in the meta-repo orchestrator workspace, when the request needs a
   program roadmap rather than one bounded spec.
4. no-mistakes runs only outside the production runner, from a release-operator workspace, over a
   committed exact head whose branch custody it owns.
5. A conditional tool invocation records its trigger, submitted head, result head, findings fixed,
   elapsed time, and final disposition in the pull request or release evidence.
6. A tool result never substitutes for repository tests, hosted CI, exact-head review attestation,
   or the normal human gates for security, data, auth, permissions, migrations, billing, and infra.

## 3. Routing decision

| Context | GSD | no-mistakes | Reason |
|---|---|---|---|
| One bounded spec or bug fix | Never | Normally never | Factory already plans, reviews, tests, and ships it. |
| Multi-phase program spanning at least two milestones or repositories | Conditional, before card creation | Normally never | GSD can decompose the program before canonical specs are admitted. |
| Ambiguous product work needing user decisions | Conditional and interactive | Never during discovery | Planning value exists; a release gate has no stable intent yet. |
| Routine docs, dependency, or low-risk test-only change | Never | Never | Deterministic checks and normal review are cheaper. |
| Factory runner, retry, queue, credential, deployment, or release-controller change | Never inside the run | Required external gate | A failure can disable or corrupt the pipeline that would otherwise review itself. |
| Other high-risk control-plane change after normal review finds a blocker | Never inside the run | Conditional external gate | Independent review is justified by demonstrated risk, not merely a tag. |
| Repeated deterministic test, CI, provider, budget, or authority failure | Never | Never as a retry remedy | These are state or infrastructure failures; another model pipeline adds cost without changing evidence. |

### 3.1 GSD admission trigger

GSD may run only when all are true:

- the work is not yet an approved Factory spec;
- it spans at least two repositories, two release milestones, or three independently deployable
  phases; and
- a single 4–8 hour Factory slice cannot produce an end-to-end verified outcome.

Its output is advisory. The orchestrator converts accepted results into normal meta-repo specs and
proposals, checks overlap against existing cards, then archives or excludes `.planning/` artifacts
from target implementation branches. Factory consumes only the canonical accepted spec.

### 3.2 no-mistakes admission trigger and cap

The external release gate is required for changes to Factory's queue/admission logic, retry ledger,
execution authority, credentials, deployment controller, or production recovery path. It is
conditional for other high-risk control-plane work only after the normal independent review found a
blocking defect or the change repairs an incident with production impact.

The operator submits one committed exact head with the full user intent. One initial review and one
fix/re-review cycle are allowed. Test, lint, documentation, push, PR, and CI stages run only when
no-mistakes is the chosen outer release owner; otherwise they are skipped so Factory or the
repository pipeline remains the sole owner. A second unresolved blocking review ends the gate and
returns the findings to the normal spec lifecycle. It does not recursively rerun or raise the model
tier.

### 3.3 no-mistakes runtime preflight

Before an eligible release gate starts, the operator must prove all of the following:

- the installed no-mistakes version is the current reviewed stable release, or a specifically pinned
  stable version whose custody-recovery behavior is accepted;
- the chosen provider can start a bounded probe and is not already known to be quota-exhausted;
- every configured fallback passed the same probe, otherwise it is removed for that run rather than
  consuming one guaranteed failed invocation per phase;
- the repository and Git signing process have a writable temporary directory with enough user quota;
  global filesystem free space alone is not evidence; and
- no other gate owns the submitted branch or candidate head.

The operator sets a task-local `TMPDIR` outside a quota-limited mount when needed. A gate failure after
fixer edits must recover or anchor the exact staged Git tree before cleanup. If custody recovery cannot
prove that preservation, the release stops and the operator salvages the object graph before any retry.
The gate is never restarted merely to repeat a completed review.

## 4. DELTA: how the decision is applied

### Slice 1 — record the routing decision

**Topics:** `logic`, `infra`, `test`

- Publish this decision alongside the failure-cost hardening spec.
- Link it from the hardening release evidence and from future Factory control-plane release PRs.
- Keep GSD and no-mistakes out of the Factory agent image and production runner.

**Gate:** `scripts/spec-index.mjs --check` accepts this spec and projects it once into
`specs/index.json`.

### Slice 2 — apply the conditional release gate

**Topics:** `infra`, `test`

- Use no-mistakes as the outer release owner for the current Factory failure-cost hardening branch
  because it changes retry, queue, monitor, and deployment-controller behavior.
- Record every accepted fix and verify the final exact head with Factory tests and hosted CI.
- Stop after the bounded review contract; any further architectural finding becomes a normal
  follow-up rather than an unbounded fix loop.
- Before later gates, apply the runtime preflight in section 3.3. The current evaluation exposed two
  concrete waste/failure modes: a known-exhausted Claude fallback ran before Codex in every phase, and
  a per-user `/tmp` quota blocked Git signing even though the host filesystem had free space.
- Upgrade the local release operator from no-mistakes v1.48.0 to stable v1.57.0 before another gate;
  that release includes custody-recovery fixes relevant to the observed stranded-branch failure.

**Gate:** the Factory release evidence names the submitted and final heads, the fixed findings, the
authoritative test/CI results, and any deliberately deferred item.

### Slice 3 — observe before automating further

**Topics:** `logic`, `infra`, `test`

- For the next ten eligible control-plane changes, record whether the conditional gate found a
  blocking defect, its wall time, agent invocations, and incremental token usage.
- Compare against ordinary Factory review using medians, not additive cost-savings claims.
- Propose a machine-enforced routing hook only if the gate has positive incremental rescue value and
  stays within its one-fix-cycle cap.

**Gate:** a later decision cites the ten-change ledger. Absence of that evidence leaves routing
operator-controlled and conditional.

## 5. Verification

1. A routine low-risk spec enters Factory without either tool.
2. A cross-repository multi-milestone request may use GSD before specs exist, but the queued runs
   contain only canonical spec snapshots and no `.planning` state.
3. A Factory retry-controller release records an external no-mistakes result on one exact head.
4. A provider outage, budget stop, stale-head conflict, or deterministic CI failure does not trigger
   either tool.
5. No candidate is simultaneously controlled by Factory and no-mistakes.
6. The Base board contains no extra card solely because a conditional tool produced internal steps.
7. A known provider quota failure is excluded before the gate, and a quota-limited temporary mount
   cannot destroy or hide fixer-authored work.

## 6. Out of scope

- Installing GSD or no-mistakes in the Factory agent image or production host.
- Running either tool for every board item.
- Replacing Factory review, hosted CI, human high-risk gates, or the meta-repo lifecycle.
- Claiming savings before the ten-change observation ledger exists.
- Building a generic plugin interface for third-party quality tools.
