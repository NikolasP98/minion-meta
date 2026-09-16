# Requirements: Minion v1.1 — 360 quality and reliability

Defined: 2026-09-09. Scope and authority: [PROGRAM.md](operations/360/PROGRAM.md). Requirements remain unchecked until independent verification; source-only results do not imply release.

## v1.1 Requirements

### Security containment

- [ ] **SEC-01**: Arbitrary assistant SQL fails closed before database access with a stable non-retryable response.
- [ ] **SEC-02**: Gateway-selected actor and org require a persisted matching assignment and membership; unassigned brain delegation is denied.
- [ ] **SEC-03**: Server create/update diagnostics never emit gateway credentials or unsanitized request/DB errors.
- [ ] **SEC-04**: Flow read queries cannot mutate SQLite through read-only execution, including negative real-engine fixtures.
- [ ] **SEC-05**: Flow input reaches SQL only through validated bind parameters; legacy interpolation is rejected.

- [ ] **SEC-07**: Missing browser membership never receives inferred tenant authority; server mutations apply consistent authorization and URL policy while preserving enrollment.
- [ ] **SEC-08**: Flow filesystem access rejects escaping links and SQL file-management operations under an explicit filesystem-writer trust model; stronger hostile-writer isolation remains a separate deployment gate.

### Durable jobs and stock effects

- [ ] **JOB-01**: Only the current fenced lease owner can update a job; heartbeat covers valid long calls.
- [ ] **JOB-02**: Cancellation, retry and restart preserve one canonical terminal outcome and deterministic effect identity.
- [ ] **STK-01**: Concurrent invoice issue requests create at most one submitted stock issue.
- [ ] **STK-02**: Failure between stock issue creation and submission recovers safely without reposting ledger history.

### Agent and harness lifecycle

- [ ] **AGT-01**: Drone definitions snapshot nested caller-owned configuration before execution.
- [ ] **AGT-02**: Default unit tests exclude paid provider tests regardless of credential presence; host deadline responsibility is explicit and tested.
- [ ] **AGT-03**: Shells enforces per-session admission and keeps request/run correlation under concurrent invocation.
- [ ] **AGT-04**: Disconnect, timeout, cancel and restore retain distinguishable durable outcomes.
- [ ] **AGT-05**: One pinned real ACP harness passes initialization, session, permission, prompt and cancellation conformance.
- [ ] **AGT-06**: Policy, budget, model/tool/schema/image identities and effects are exercised through deterministic governance fixtures.

### Dependency and package provenance

- [ ] **DEP-01**: Current reachable security advisories are patched by family with compatibility fixtures and residual triage.
- [ ] **DEP-02**: Deprecated or unused dependencies are replaced/removed only after peer, runtime and clean-build proof.
- [ ] **DEP-03**: Internal package version, source revision, archive digest and shipped license content are verifiable and immutable.

### Mobile desktop and accessibility

- [ ] **UI-01**: Secret editor and image viewer honor dialog focus, Escape, allowed close and return-focus behavior.
- [ ] **UI-02**: Sentiment chart tooltips format correctly and render hostile labels as text.
- [ ] **UI-03**: Focused UI changes meet the existing token/design contract and regression checks.
- [ ] **UI-04**: Home controls and multi-staff Calendar remain visible, readable and operable at supported mobile widths.
- [ ] **UI-05**: Seeded critical desktop/mobile keyboard/coarse-pointer journeys run as browser release gates.
- [ ] **UI-06**: Charts/canvas honor reduced motion and expose usable nonvisual information.

### SDK and transport interoperability

- [ ] **SDK-01**: HTTP/WS/ACP and plugin postMessage boundaries validate explicit version/capability, actor/tenant, error and trace contracts; Workforce JSON transport bounds response bytes and caller lifetime.
- [ ] **SDK-02**: Supported Hub/Site/Paperclip/gateway/plugin and Workforce consumer combinations pass their applicable peer identity, reconnect, malformed-frame, cancellation, safe-error and idempotent retry contracts.
- [ ] **SDK-03**: Privileged CRM SDK exports remain server-only and consumer adoption of fixed immutable packages is proven.

### Authorized data and pipeline ownership

- [ ] **SEC-06**: Useful typed analytics datasets replace disabled raw SQL with tenant/module/owner/field policies and bounded rows/bytes.
- [ ] **DATA-01**: Parsing preserves source identity, rejection reasons and retry-safe cursors with bounded work.
- [ ] **DATA-02**: Each physical schema has one migration authority and source/applied hash drift checks.
- [ ] **DATA-03**: Every retained copy across database, vectors, blobs, memory and backups has an explicit retention/deletion owner.

### Observability and incident evidence

- [ ] **OBS-01**: Server and agent events carry sanitized environment/release/route/trace/run/effect identities.
- [ ] **OBS-02**: A fixture error resolves to the matching source map and reaches configured telemetry from the actual execution environment.
- [ ] **OBS-03**: Incident views and alert routing use attributable errors with valid denominators and no sensitive payloads.

### Container runtime and recovery

- [ ] **OPS-01**: Exact live source/image/flags and container privilege/resource posture are recorded.
- [ ] **OPS-02**: One supported disposable deployment profile starts with correct ports, readiness and shutdown behavior.
- [ ] **OPS-03**: Factory containment activation and automatic promotion follow passing external restart/effect drills on the exact runtime identity.
- [ ] **OPS-04**: Image dependency/SBOM provenance, fixture restore and rollback are reproducible.

### Documentation and proposal convergence

- [ ] **DOC-01**: Active instructions describe current supported repositories, branches, storage, auth and executable commands.
- [ ] **DOC-02**: Existing proposals/specs map to requirements and dispositions without reviving retired architecture.
- [ ] **DOC-03**: Each unresolved implementation has a source handoff and proposal; completed changes close both using evidence.

### Capacity fairness and recovery qualification

- [ ] **CAP-01**: A synthetic workload records data seed, source/image/hardware, concurrency, SLO and saturation evidence.
- [ ] **CAP-02**: Pool/worker/lineage processing stays bounded and fair during bursts, retries and downstream failure.
- [ ] **CAP-03**: Restore and cross-store deletion are verified against decided retention/recovery policy.

### Integration release and repeat 360 review

- [ ] **QC-01**: Every requirement has independent source/behavior verification and exact candidate identity.
- [ ] **QC-02**: Authorized release candidates pass cross-project checks and deployment identity/smoke verification.
- [ ] **QC-03**: A repeat full 360 audit answers the initial questions with before/after evidence and tracks residual/new findings.

## Deferred / excluded

Unbounded architecture replacement, arbitrary assistant SQL restoration, paid live evaluations without an explicit test budget, uncontrolled production load, unrelated WIP cleanup, and automatic release are excluded. Concrete release packets and missing business-policy decisions remain explicit gates in PROGRAM.md.

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| SEC-01 | Phase 9 | Pending |
| SEC-02 | Phase 9 | Pending |
| SEC-03 | Phase 9 | Pending |
| SEC-04 | Phase 9 | Pending |
| SEC-05 | Phase 9 | Pending |
| SEC-07 | Phase 9 | Pending |
| SEC-08 | Phase 9 | Pending |
| JOB-01 | Phase 10 | Pending |
| JOB-02 | Phase 10 | Pending |
| STK-01 | Phase 10 | Pending |
| STK-02 | Phase 10 | Pending |
| AGT-01 | Phase 11 | Pending |
| AGT-02 | Phase 11 | Pending |
| AGT-03 | Phase 11 | Pending |
| AGT-04 | Phase 11 | Pending |
| AGT-05 | Phase 11 | Pending |
| AGT-06 | Phase 11 | Pending |
| DEP-01 | Phase 12 | Pending |
| DEP-02 | Phase 12 | Pending |
| DEP-03 | Phase 12 | Pending |
| UI-01 | Phase 13 | Pending |
| UI-02 | Phase 13 | Pending |
| UI-03 | Phase 13 | Pending |
| UI-04 | Phase 13 | Pending |
| UI-05 | Phase 13 | Pending |
| UI-06 | Phase 13 | Pending |
| SDK-01 | Phase 14 | Pending |
| SDK-02 | Phase 14 | Pending |
| SDK-03 | Phase 14 | Pending |
| SEC-06 | Phase 15 | Pending |
| DATA-01 | Phase 15 | Pending |
| DATA-02 | Phase 15 | Pending |
| DATA-03 | Phase 15 | Pending |
| OBS-01 | Phase 16 | Pending |
| OBS-02 | Phase 16 | Pending |
| OBS-03 | Phase 16 | Pending |
| OPS-01 | Phase 17 | Pending |
| OPS-02 | Phase 17 | Pending |
| OPS-03 | Phase 17 | Pending |
| OPS-04 | Phase 17 | Pending |
| DOC-01 | Phase 18 | Pending |
| DOC-02 | Phase 18 | Pending |
| DOC-03 | Phase 18 | Pending |
| CAP-01 | Phase 19 | Pending |
| CAP-02 | Phase 19 | Pending |
| CAP-03 | Phase 19 | Pending |
| QC-01 | Phase 20 | Pending |
| QC-02 | Phase 20 | Pending |
| QC-03 | Phase 20 | Pending |

Coverage: 49 requirements; 49 mapped; 0 unmapped. SEC-07/08 were added by independent first-wave verification; source and release acceptance remain pending.

### September11 UI re-audit requirements

- [ ] **UI-07**: Hub navigation and Site member views retain reachable controls, native focus behavior and correct data identity across mobile/desktop and asynchronous state changes. Navigation, graph/files and chat each require their own behavioral evidence.
- [ ] **SEC-09**: Site logout targets the active auth provider and current session, preserves cookie handling and exposes failure; durable revocation claims require disposable real-session failure evidence.

| Requirement | Implementation | Status |
| --- | --- | --- |
| UI-07 | 13-07,13-08,13-09,13-10,13-11,13-12 | Open |
| SEC-09 | 13-09; auth-library revocation failure gate | Open |
