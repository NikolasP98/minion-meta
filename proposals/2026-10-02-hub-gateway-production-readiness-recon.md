---
id: 2026-10-02-hub-gateway-production-readiness-recon
title: Hub and gateway production readiness recon and selected remediation
status: in-spec
created: 2026-10-02
updated: 2026-10-03
repos: [minion_hub, minion, minion-meta]
tags: [security, data, logic, test, docs]
effort: L
source: user-requested-read-only-recon-2026-10-02
---

# Hub and gateway production readiness recon

## Implementation authorization

After receiving the report, the user selected **every one of the 97 findings** and authorized autonomous implementation with subagents and root review. The current scope is recorded in [.planning/operations/readiness-2026-10-03/PROGRAM.md](../.planning/operations/readiness-2026-10-03/PROGRAM.md). This supplies the human security/data scope approval. It does not claim a merge, release, production migration or live runtime acceptance.

The report-first audit below is preserved as historical scope. Every finding now has an implementation owner, batch and independent completion evidence in the program register.

## Original request and audit boundary

Audit Hub and gateway source, commit history, proposals, planning state, test quality,
reactivity, interface standards, performance and maintainability. Produce a prioritized
Lavish report first. The user will select implementation work afterward.

This proposal is the umbrella handoff ledger for that audit. It authorizes no application
change, production write, merge or deployment. The user's report-first instruction is the
reason application-site `TODO(handoff)` comments were not inserted during reconnaissance.
Instead, every finding records its exact source sites and required proof in the register.
Selected implementation slices must maintain the normal source-marker/proposal contract.

## AS-IS

Audited immutable remote sources:

- Hub `7ac3bfdffdd885d80fbaf2056eb22e387626a3ee` (`master`). The production deployment
  API reports a successful deployment at this SHA; authenticated live acceptance was not run.
- Gateway `b841c36750e4bf10dd3f81a4896b19c699fe3132` (`DEV`). The `main` source tree at
  `7a1501e969014ec2fcfb69021bda843d0f90d23b` is identical; deployed runtime identity is unverified.
- Meta `b82d7b2f5999018ec8f9433b7db70ca4785f5b8e` (`dev`). Document lifecycle labels
  are retained as historical claims and do not independently establish delivery.

The detailed register is `audits/2026-10-02-hub-gateway-recon/findings.json` with a readable
`REPORT.md`, specialist appendices, synthetic reproducers and check receipts beside it.
The private interactive review is `.lavish/hub-gateway-recon-2026-10-02/report.html`.
These local artifacts contain operational detail and must not be published automatically.

Confirmed examples include a synthetic cross-organization chat broadcast (GW-001),
HTTP-rejected tag updates presented as successful (HC-001), missing monetary/stock
idempotency and concurrency boundaries, mixed-currency aggregation and loss-masking
metrics, stale asynchronous UI responses, unwired operations and misleading test coverage.
The register distinguishes reproduced behavior, source-confirmed risks and hypotheses.

The audit inventories 645 relevant proposal/spec records, 210 handoff sites, current open
PRs/issues, route families and large files. It does not claim every possible path was
dynamically exercised. PostHog requires reauthentication; Sentry live access was unavailable.

## TO-BE

- Tenant/user/session authority governs every data-bearing gateway event and RPC operation.
- Financial, inventory and booking changes preserve currency, replay and concurrency invariants.
- UI actions report the true write outcome, preserve rejected intent and refresh affected reads
  without stale-response races or a required hard refresh.
- Shared controls have consistent keyboard, focus, loading, error and pointer behavior.
- Domain transaction services, pure models and lifecycle owners replace mixed responsibilities
  in large files without weakening existing behavior.
- Tests fail when these contracts are broken; telemetry, CI, release identity and operational
  acceptance have separate auditable receipts.
- Every selected finding is either repaired with proof or explicitly retained with an owner,
  blocker, exact-site marker and bounded successor proposal.

## DELTA and sequence

1. User selects finding IDs from the report. Revalidate those IDs against then-current source.
2. Group compatible findings into bounded specs, retaining existing proposal/PR dependencies.
   Security/data changes keep human approval and merge gates.
3. Add an actual failing regression for the selected behavior. Repair authority and money/data
   invariants first, then mutation/reconnect behavior, shared UI contracts and measured speed.
4. Extract modules at the register's proposed seams under behavioral tests. Do not use file size
   alone to justify churn. Replace misleading tests only when a meaningful replacement exists.
5. Independently review, qualify the exact artifact, and record deployed identity/runtime proof
   separately from local tests and hosted CI.
6. Reconcile the register and existing backlog, preserving original historical evidence.

## Existing work and exclusions

Open Hub PRs #340 (POS hardening), #358 (JEV shadow) and #279 (artifact bridge/QC) are
recovery sources or qualification work, not assumed shipped fixes. Preserve retained WIP
from issue #205 and the unrelated dirty original checkouts. Gateway's existing S2 handoffs
and the September platform-QC proposal remain linked predecessors, not blanket approvals.

No sweeping rewrite, dependency-wide upgrade, migration, test deletion, live telemetry
mutation, source TODO insertion, production exploitation or external publication is part
of this audit deliverable. Implementation and any operational access work follow selection.

## Definition of done for this recon

- Each consolidated finding has priority, trigger, consequence, source evidence, repair
  boundary, regression proof and effort/dependency context.
- All specialist findings are represented or explicitly reconciled, with no silent deletion.
- Known historical fixes and unavailable verification are visible rather than counted as defects.
- The report is usable at desktop and mobile widths and exports the register for review.
- Application code, production records and unrelated WIP remain unchanged.

Completion of the recon does not close this remediation proposal. The user selected all findings; subsequent batch specs own implementation and release qualification.
