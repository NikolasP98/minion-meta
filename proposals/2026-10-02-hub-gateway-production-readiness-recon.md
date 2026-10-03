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

## Parent review additions — October 3

The implementation ledger now tracks 114 findings. The sixth parent finding is
GW-022: `agent.install` writes a marketplace bundle but no gateway runtime reader
consumes that directory or registers the agent. The normal `agents.create` path
separately updates configuration and prepares the runtime workspace. HC-034 and
GW-022 therefore share a bounded install-intent specification: exact authorized
target, immutable verified bytes, durable receipt/reconciliation, actual runtime
registration, and deferred idempotent Hub registration/counting. The same slice
must remove the malformed-tags-after-write and catalog-invalidation-consumption
races found during independent review. No install completion is claimed yet.

Marketplace catalog A/B/C implementation passed independent source review with
that explicit installation dependency remaining open. Rolling deployment readiness
requires a new publisher's digest of exact nullable document contents; historical
`files_loaded_at` alone is not proof. The local native and browser validation
receipts live under `.planning/operations/readiness-2026-10-03/`; none establishes
production release or a production write.


## Gateway delivery checkpoint and remaining GW-015 work

Gateway commit `860b9746d` closes the local GW-008 regression and implements
GW-015 per-payload checkpoints. It does not close GW-015. The exact-site handoffs
in `src/infra/outbound/delivery-queue.ts` and `src/config/sessions/types.ts` require
a content-redacted local operator inspect/resolve path, explicit provider
idempotency support inventory and exact heartbeat attempt/queue reconciliation.
An active owner token cannot be cleared, and an uncertain effect cannot be
automatically retried. Split queue persistence, ownership, recovery and operator
policy into focused modules under the accepted behavioral tests. The current
slice has no production write, merge or deployed qualification.

### Parent review: GW-023 parallel stream disclosure

The production agent-event handler connected to the production broadcaster sends org A assistant text and run metadata to org B through `agent` and `pi-agent.run-start`, even though `chat` is scoped. A synthetic failing regression is captured in `gw023-agent-event-baseline.log`; no real data was used. The bounded correction and required cross-stream/targeted-recipient matrix live in `specs/2026-10-03-readiness-agent-event-audience-spec.md`. This P0 remains open pending implementation and independent qualification.

### Parent review: GW-024 shared administrator credential disclosure

A linked non-admin user can fetch the gateway shared secret from Hub, and the gateway treats that secret without JWT as platform administrator authority. Hub also intentionally reconnects without JWT after validation errors. Source proof is recorded under GW-024; independent synthetic reproduction and a JWT-as-credential contract are assigned before implementation. Prior tenant-event fixes do not contain a user holding the underlying administrator credential. Release must address already-disclosed credentials with an explicit rotation plan. No real credential was extracted or exercised.


## Additional consumer and reliability findings, October 3

The full register now includes 141 findings. Blast-radius qualification of the shared Gateway client exposed Site release-build and navigation defects: SITE-001 doubles localized anchor prefixes and blocks prerender; SITE-002 passes an unvalidated OAuth continuation to a 303 redirect (source-confirmed P1, no credential theft demonstrated); SITE-003 duplicates alternate metadata across two layouts. Their exact baseline anchors and separate proof targets are in the readiness register. SITE-001 passed two review rounds, including query/hash preservation and all eleven actual anchors.

GW-026 records the Gateway reliability handlers returning successful empty/zero projections after storage or aggregate exceptions. This is separate from HC-024/025 client ownership. A valid zero result and an unavailable source need different response outcomes; actual handler fault injection is required. The orchestration audience/authority contract for GW-005/GW-025 is approved, with GW022A native packaging and GW024 credential-class integration explicitly pending. No production mutation was performed for these findings.


HC-024 remains partially implemented after the eight-resource correction: parent blast-radius review found unfenced plugin/insights resources and architecture polling, plus live plugin arithmetic without a snapshot watermark. Their source anchors and a required second slice are part of the same finding. The fixed resource packet does not close these adjacent consumers. A frozen source packet and browser evidence are available for the implemented portion.


## Token and refund review additions, October 3

The current register contains142 findings. SITE-004 records ten undefined `--page-max` consumers and missing Site token-integrity CI. Its additive shared-token and reusable scanner contract is under review. SITE-001 locale anchors are locally qualified through actual Paraglide components and the full eight-page production build.

Wallet server review remains blocked on legacy contact-only refund lock ownership: refund and spend must hold the same serialized canonical wallet key. The existing25 native cases did not exercise that race; dedicated cases are being added. HC-024 also includes truthful unavailable display in AgentDashboard, and direct coordinator-owned Retry on the Performance tab. No production writes were made.


The next reliability panel inventory identified HS-032: skill duration means use all executions as weights although SQL AVG ignores null durations. The143-finding ledger records a measured-sample-count correction and unknown legacy state. All four generic async-resource consumers (plugin, insights, skill and credential health) are in the HC-024 follow-on, together with architecture polling and recent-feed ownership.


### HC036 agent settings ownership

Parent source recon found AgentDashboard file-count and global tools/skills read/write completions crossing selected-agent boundaries. ChatInput, AgentSettingsPanel and AgentCapabilitiesPanel consume the same singleton. AgentSkillsPanel also sends null when disabling the final skill, which the real Gateway interprets as removing the filter (all inherited), rather than the supported empty allowlist. A bounded follow-on must fence canonical owners, coordinate writes without replay, migrate every consumer and preserve empty-list semantics. Source anchors and acceptance are in findings.json; no implementation is claimed.


## Current qualification, October 3

The readiness register contains145 findings. Signed code, local tests, hosted qualification and production acceptance remain separate states. Site integration `fa2638b4` incorporates current dev while preserving reviewed scope/auth/locale fences; its hosted run is pending. Gateway method advertisement `2f46c5023` and inherited-handler correction `72fa69dcb` passed the parent107-case exact-source suite. Native executor checkpoint `7e040965` remains a prerequisite; config CAS, target distribution and managed-writer cleanup are not closed. Hub CI contract repairs `fae8ff43`, migration/plan fixes `742c202a`/`f02189dd`, and current draft-ownership UI evidence are recorded separately. The full per-finding state remains in `.planning/operations/readiness-2026-10-03/findings.json`.
