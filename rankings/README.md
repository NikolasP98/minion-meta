# Board goal ranking

`index.json` is the auditable, advisory ranking ledger consumed by Minion Base. A dedicated
Factory `rank` run updates it; dashboards never call a model and never synthesize a score.

## Rubric (`board-goal-v2`)

Each axis is an integer from 0 to 10:

- **Criticality (45%)** — consequence and time sensitivity if the goal is deferred: security,
  data loss, production outage, blocked release, or external deadline.
- **Importance (30%)** — strategic and architectural centrality: dependency unblocking,
  contractual obligations, core platform reliability, and roadmap alignment.
- **Impact (25%)** — breadth and magnitude of the expected outcome: affected users/repos,
  recurring cost or throughput, and reduction of repeated failure.

Trusted code computes `round((criticality × .45 + importance × .30 + impact × .25) × 10)`.
The agent also records confidence (0–10), a bounded rationale, and source-backed evidence.
Confidence is shown but does not silently rewrite priority.

Two separate readiness scores (0–10) keep priority from bypassing delivery quality:

- **Specification** — the problem, scope, dependencies, and verifiable outcome are clear enough
  for the current lifecycle transition.
- **Implementation** — the work has bounded execution evidence, prerequisite coverage, and no
  unresolved blocker that makes a paid implementation premature.

The evaluator also records one recommendation: `execute`, `reevaluate`, `group`, `prune`, or
`reframe`, plus up to three related keys. Recommendations are advisory evidence for the queue
policy; lifecycle writers remain trusted code.

Bands: `critical 85–100`, `high 70–84`, `medium 50–69`, `low 0–49`.

## Lifecycle timing

Ranking runs after intake/reconciliation and whenever a material source fingerprint or rubric
changes.
The periodic changed-input sweep is the recovery path. It batches missing or source-stale
entries immediately and revisits non-executable or sub-80 entries no more than once every
seven days. That bounded re-evaluation is where the evaluator can recommend grouping,
pruning, or reframing without paying for the same unchanged card every sweep.

Dispatch observes historical 80th/20th-percentile score means, with hard guardrails at 80
for admission and 20 for prune review. A winner must also meet the readiness floor and carry
an `execute` recommendation. Admitted winners sort by lifecycle phase descending, then score,
then age. Rank is advisory: trusted code owns thresholds and lifecycle mutations; status,
policy gates, and independent review keep their existing authority.

Canonical keys cover every board lane: `proposal:<id>`, `issue:<repo>#<n>`, `spec:<id>`,
`pr:<repo>#<n>`, `run:<repo>#<id>`, and `deploy:<repo>`. A deployment candidate exists only when
`rankings/repos.json` names the exact deployment workflow path for that repository.
