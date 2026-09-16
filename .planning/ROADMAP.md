# Roadmap: Minion

## Milestones

- v1.0 Foundation — historical phases1–8, see [archive](milestones/v1.0-ROADMAP.md).
- **v1.1 360 quality and reliability — active**, phases9–20. User authorization: 2026-09-09.

Full boundaries, rationale, slices, gates and repeated review: [implementation program](operations/360/PROGRAM.md). Parallel research feeds decisions; phase order is a dependency graph, not permission to edit shared files concurrently.

## Phases
- [ ] **Phase 9: Security containment** — Arbitrary assistant SQL fails closed before database access with a stable non-retryable response.
- [ ] **Phase 10: Durable jobs and stock effects** — Only the current fenced lease owner can update a job; heartbeat covers valid long calls.
- [ ] **Phase 11: Agent and harness lifecycle** — Drone definitions snapshot nested caller-owned configuration before execution.
- [ ] **Phase 12: Dependency and package provenance** — Current reachable security advisories are patched by family with compatibility fixtures and residual triage.
- [ ] **Phase 13: Mobile desktop and accessibility** — Secret editor and image viewer honor dialog focus, Escape, allowed close and return-focus behavior.
- [ ] **Phase 14: SDK and transport interoperability** — HTTP/WS/ACP/plugin boundaries validate authority and compatibility; Workforce JSON transport preserves bounded caller lifetime and safe errors.
- [ ] **Phase 15: Authorized data and pipeline ownership** — Useful typed analytics datasets replace disabled raw SQL with tenant/module/owner/field policies and bounded rows/bytes.
- [ ] **Phase 16: Observability and incident evidence** — Server and agent events carry sanitized environment/release/route/trace/run/effect identities.
- [ ] **Phase 17: Container runtime and recovery** — Exact live source/image/flags and container privilege/resource posture are recorded.
- [ ] **Phase 18: Documentation and proposal convergence** — Active instructions describe current supported repositories, branches, storage, auth and executable commands.
- [ ] **Phase 19: Capacity fairness and recovery qualification** — A synthetic workload records data seed, source/image/hardware, concurrency, SLO and saturation evidence.
- [ ] **Phase 20: Integration release and repeat 360 review** — Every requirement has independent source/behavior verification and exact candidate identity.

## Phase Details

Dependencies below constrain phase integration/closure. Root may admit disjoint source/evidence slices early under D360-06 after independent plan review. Security release packets may proceed before the full milestone only with their own compatibility and exact-identity gates.

### Phase 9: Security containment

**Goal:** Assistant and flow requests cannot gain unauthorized data or write authority, and server diagnostics do not expose credentials.
**Depends on:** Nothing (first phase of milestone)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SEC-08
**Success Criteria:**
1. Arbitrary assistant SQL fails closed before database access with a stable non-retryable response.
2. Gateway-selected actor and org require a persisted matching assignment and membership; unassigned brain delegation is denied.
3. Server create/update diagnostics never emit gateway credentials or unsanitized request/DB errors.
4. Flow read queries cannot mutate SQLite through read-only execution, including negative real-engine fixtures.
5. Flow input reaches SQL only through validated bind parameters; legacy interpolation is rejected.
**Plans:** See `.planning/phases/09-security-containment/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 10: Durable jobs and stock effects

**Goal:** Retried, concurrent and interrupted jobs preserve one authorized business effect and recover without reposting stock history.
**Depends on:** Phase 9
**Requirements**: JOB-01, JOB-02, STK-01, STK-02
**Success Criteria:**
1. Only the current fenced lease owner can update a job; heartbeat covers valid long calls.
2. Cancellation, retry and restart preserve one canonical terminal outcome and deterministic effect identity.
3. Concurrent invoice issue requests create at most one submitted stock issue.
4. Failure between stock issue creation and submission recovers safely without reposting ledger history.
**Plans:** See `.planning/phases/10-durable-jobs-stock/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 11: Agent and harness lifecycle

**Goal:** An admitted agent run retains its approved definition, one owner and a recoverable outcome across harness lifecycle changes.
**Depends on:** Phase 9
**Requirements**: AGT-01, AGT-02, AGT-03, AGT-04, AGT-05, AGT-06
**Success Criteria:**
1. Drone definitions snapshot nested caller-owned configuration before execution.
2. Default unit tests exclude paid provider tests regardless of credential presence; host deadline responsibility is explicit and tested.
3. Shells enforces per-session admission and keeps request/run correlation under concurrent invocation.
4. Disconnect, timeout, cancel and restore retain distinguishable durable outcomes.
5. One pinned real ACP harness passes initialization, session, permission, prompt and cancellation conformance.
6. Policy, budget, model/tool/schema/image identities and effects are exercised through deterministic governance fixtures.
**Plans:** See `.planning/phases/11-agent-lifecycle/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 12: Dependency and package provenance

**Goal:** Supported consumers run patched, compatible dependencies with verifiable immutable package contents.
**Depends on:** Phase 9
**Requirements**: DEP-01, DEP-02, DEP-03
**Success Criteria:**
1. Current reachable security advisories are patched by family with compatibility fixtures and residual triage.
2. Deprecated or unused dependencies are replaced/removed only after peer, runtime and clean-build proof.
3. Internal package version, source revision, archive digest and shipped license content are verifiable and immutable.
**Plans:** See `.planning/phases/12-dependency-provenance/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 13: Mobile desktop and accessibility

**UI hint**: yes

**Goal:** Critical user journeys remain readable and operable across supported viewports, input methods and accessibility settings.
**Depends on:** Phase 9
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07; SEC-09 provider-aware logout intersects phase9
**Success Criteria:**
1. Secret editor and image viewer honor dialog focus, Escape, allowed close and return-focus behavior.
2. Sentiment chart tooltips format correctly and render hostile labels as text.
3. Focused UI changes meet the existing token/design contract and regression checks.
4. Home controls and multi-staff Calendar remain visible, readable and operable at supported mobile widths.
5. Seeded critical desktop/mobile keyboard/coarse-pointer journeys run as browser release gates.
6. Charts/canvas honor reduced motion and expose usable nonvisual information.
7. Navigation and Site member views preserve reachable controls, native focus and correct asynchronous data identity; provider-aware logout includes visible failure/retry and separate durable-revocation proof.
**Plans:** See `.planning/phases/13-ui-qualification/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 14: SDK and transport interoperability

**Goal:** Supported applications and agents exchange authorized, version-compatible requests and recoverable events without exposing server credentials.
**Depends on:** Phase 9, Phase 11, Phase 12
**Requirements**: SDK-01, SDK-02, SDK-03
**Success Criteria:**
1. HTTP/WS/ACP/plugin boundaries validate authority and compatibility; Workforce JSON transport preserves bounded caller lifetime and safe errors.
2. Supported Hub/Site/Paperclip/gateway consumer combinations pass reconnect, malformed-frame and idempotent retry contracts.
3. Privileged CRM SDK exports remain server-only and consumer adoption of fixed immutable packages is proven.
**Plans:** See `.planning/phases/14-sdk-transport/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 15: Authorized data and pipeline ownership

**Goal:** Authorized questions and repeated imports produce bounded, provenance-preserving results under explicit schema and retention ownership.
**Depends on:** Phase 9, Phase 10, Phase 14
**Requirements**: SEC-06, DATA-01, DATA-02, DATA-03
**Success Criteria:**
1. Useful typed analytics datasets replace disabled raw SQL with tenant/module/owner/field policies and bounded rows/bytes.
2. Parsing preserves source identity, rejection reasons and retry-safe cursors with bounded work.
3. Each physical schema has one migration authority and source/applied hash drift checks.
4. Every retained copy across database, vectors, blobs, memory and backups has an explicit retention/deletion owner.
**Plans:** See `.planning/phases/15-data-pipelines/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 16: Observability and incident evidence

**Goal:** An operator can trace a sanitized failure or agent effect to its actual environment, release and original source.
**Depends on:** Phase 9
**Requirements**: OBS-01, OBS-02, OBS-03
**Success Criteria:**
1. Server and agent events carry sanitized environment/release/route/trace/run/effect identities.
2. A fixture error resolves to the matching source map and reaches configured telemetry from the actual execution environment.
3. Incident views and alert routing use attributable errors with valid denominators and no sensitive payloads.
**Plans:** See `.planning/phases/16-observability/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 17: Container runtime and recovery

**Goal:** The supported deployment has an identifiable policy boundary and can start, stop and recover through reproducible procedures.
**Depends on:** Phase 11, Phase 12, Phase 16
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04
**Success Criteria:**
1. Exact live source/image/flags and container privilege/resource posture are recorded.
2. One supported disposable deployment profile starts with correct ports, readiness and shutdown behavior.
3. Factory containment activation and automatic promotion follow passing external restart/effect drills on the exact runtime identity.
4. Image dependency/SBOM provenance, fixture restore and rollback are reproducible.
**Plans:** See `.planning/phases/17-container-runtime/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 18: Documentation and proposal convergence

**Goal:** Active instructions and proposal dispositions lead the operator to the supported behavior and remaining work.
**Depends on:** Phase 9
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria:**
1. Active instructions describe current supported repositories, branches, storage, auth and executable commands.
2. Existing proposals/specs map to requirements and dispositions without reviving retired architecture.
3. Each unresolved implementation has a source handoff and proposal; completed changes close both using evidence.
**Plans:** See `.planning/phases/18-docs-governance/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 19: Capacity fairness and recovery qualification

**Goal:** Measured workloads stay correct and fair through saturation and recover within the explicitly chosen policy.
**Depends on:** Phase 10, Phase 15, Phase 16, Phase 17
**Requirements**: CAP-01, CAP-02, CAP-03
**Success Criteria:**
1. A synthetic workload records data seed, source/image/hardware, concurrency, SLO and saturation evidence.
2. Pool/worker/lineage processing stays bounded and fair during bursts, retries and downstream failure.
3. Restore and cross-store deletion are verified against decided retention/recovery policy.
**Plans:** See `.planning/phases/19-capacity-recovery/`; implementation scopes and admission gates in PROGRAM.md.

### Phase 20: Integration release and repeat 360 review

**Goal:** The authorized integrated release is verified on its actual identity and reassessed against every original audit question.
**Depends on:** Phase 9, Phase 10, Phase 11, Phase 12, Phase 13, Phase 14, Phase 15, Phase 16, Phase 17, Phase 18, Phase 19
**Requirements**: QC-01, QC-02, QC-03
**Success Criteria:**
1. Every requirement has independent source/behavior verification and exact candidate identity.
2. Authorized release candidates pass cross-project checks and deployment identity/smoke verification.
3. A repeat full 360 audit answers the initial questions with before/after evidence and tracks residual/new findings.
**Plans:** See `.planning/phases/20-integration-reaudit/`; implementation scopes and admission gates in PROGRAM.md.

## Progress

| Phase | Plans complete | Status | Evidence |
|---|---|---|---|
| 9. Security containment | 0 | Implementing bounded initial slices | Phase directory |
| 10. Durable jobs and stock effects | 0 | Planned; acceptance pending | Phase directory |
| 11. Agent and harness lifecycle | 0 | Planned; acceptance pending | Phase directory |
| 12. Dependency and package provenance | 0 | Planned; acceptance pending | Phase directory |
| 13. Mobile desktop and accessibility | 0 | Implementing bounded initial slices | Phase directory |
| 14. SDK and transport interoperability | 0 | Planned; acceptance pending | Phase directory |
| 15. Authorized data and pipeline ownership | 0 | Planned; acceptance pending | Phase directory |
| 16. Observability and incident evidence | 0 | Planned; acceptance pending | Phase directory |
| 17. Container runtime and recovery | 0 | Planned; acceptance pending | Phase directory |
| 18. Documentation and proposal convergence | 0 | Planned; acceptance pending | Phase directory |
| 19. Capacity fairness and recovery qualification | 0 | Planned; acceptance pending | Phase directory |
| 20. Integration release and repeat 360 review | 0 | Planned; acceptance pending | Phase directory |
