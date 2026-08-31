# Board goal ranking

`index.json` is the auditable, advisory ranking ledger consumed by Minion Base. A dedicated
Factory `rank` run updates it; dashboards never call a model and never synthesize a score.

## Rubric (`board-goal-v1`)

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

Bands: `critical 85–100`, `high 70–84`, `medium 50–69`, `low 0–49`.

## Lifecycle timing

Ranking runs after intake/reconciliation and whenever a material source fingerprint changes.
The periodic changed-input sweep is the recovery path. It batches only missing/stale entries,
so unchanged cards incur no model cost. Rank is advisory: it orders attention inside a phase;
status, policy gates, and independent review keep their existing authority.

Canonical keys cover every board lane: `proposal:<id>`, `issue:<repo>#<n>`, `spec:<id>`,
`pr:<repo>#<n>`, `run:<repo>#<id>`, and `deploy:<repo>`.
