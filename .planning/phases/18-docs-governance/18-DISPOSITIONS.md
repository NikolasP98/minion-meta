# Spec/proposal disposition inventory

Generated from exact local source snapshots. Topic links are review candidates, never approval or implementation evidence. Every Markdown item, including templates/reviews, is accounted for. No status or index is changed by this command.

679 documents; 49 requirements; 56 divergent cross-snapshot IDs; 0 inventory issues.

## Snapshot identity

- .: feat/curated-engineering-skills @ 69739a7c7b1a92e442b5a574d88f167a0fe40db3
- minion-meta: main @ 59c4b56c192a730dbd63bb8e51dd8305eb2ad424

The workspace and nested reference checkout have distinct histories. Newer timestamps alone do not authorize overwriting either one. Release integration must reconcile exact reviewed patches with the selected upstream commit.

## Requirement candidates

REQUIREMENTS.md SHA-256: fec0ab044d635cd354e24967366a1263b5ee5ac8929b95ce449ae09af6c5047a

Candidates match the full document body by topic family. First six are displayed; the exported buildDispositionMap result retains every path. Manual body/source acceptance remains required; these counts are not coverage scores.

|Requirement|Candidate paths|First candidate pointers|
|---|---|---|
|SEC-01: Arbitrary assistant SQL fails closed before database access with a stable non-retryable response.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-02: Gateway-selected actor and org require a persisted matching assignment and membership; unassigned brain delegation is denied.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-03: Server create/update diagnostics never emit gateway credentials or unsanitized request/DB errors.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-04: Flow read queries cannot mutate SQLite through read-only execution, including negative real-engine fixtures.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-05: Flow input reaches SQL only through validated bind parameters; legacy interpolation is rejected.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-07: Missing browser membership never receives inferred tenant authority; server mutations apply consistent authorization and URL policy while preserving enrollment.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-08: Flow filesystem access rejects escaping links and SQL file-management operations under an explicit filesystem-writer trust model; stronger hostile-writer isolation remains a separate deployment gate.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|JOB-01: Only the current fenced lease owner can update a job; heartbeat covers valid long calls.|314|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-my-agent-homepage.md`; `specs/2026-05-21-gws-cli-replaces-gog.md`; `specs/2026-05-22-gateway-turn-recovery.md`; `specs/2026-05-23-meeting-agent-google-meet.md`|
|JOB-02: Cancellation, retry and restart preserve one canonical terminal outcome and deterministic effect identity.|314|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-my-agent-homepage.md`; `specs/2026-05-21-gws-cli-replaces-gog.md`; `specs/2026-05-22-gateway-turn-recovery.md`; `specs/2026-05-23-meeting-agent-google-meet.md`|
|STK-01: Concurrent invoice issue requests create at most one submitted stock issue.|275|`specs/2026-05-20-my-agent-homepage.md`; `specs/2026-06-11-google-oauth-verification-packet.md`; `specs/2026-06-13-crm-plugin-recon-and-plan.md`; `specs/2026-06-13-gateway-monitoring-events-hooks-recon.md`; `specs/2026-06-13-plugin-sdk-recon-and-improvement-report.md`; `specs/2026-06-19-linked-channels-config-restructure.md`|
|STK-02: Failure between stock issue creation and submission recovers safely without reposting ledger history.|275|`specs/2026-05-20-my-agent-homepage.md`; `specs/2026-06-11-google-oauth-verification-packet.md`; `specs/2026-06-13-crm-plugin-recon-and-plan.md`; `specs/2026-06-13-gateway-monitoring-events-hooks-recon.md`; `specs/2026-06-13-plugin-sdk-recon-and-improvement-report.md`; `specs/2026-06-19-linked-channels-config-restructure.md`|
|AGT-01: Drone definitions snapshot nested caller-owned configuration before execution.|429|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|AGT-02: Default unit tests exclude paid provider tests regardless of credential presence; host deadline responsibility is explicit and tested.|429|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|AGT-03: Shells enforces per-session admission and keeps request/run correlation under concurrent invocation.|429|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|AGT-04: Disconnect, timeout, cancel and restore retain distinguishable durable outcomes.|429|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|AGT-05: One pinned real ACP harness passes initialization, session, permission, prompt and cancellation conformance.|429|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|AGT-06: Policy, budget, model/tool/schema/image identities and effects are exercised through deterministic governance fixtures.|429|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|DEP-01: Current reachable security advisories are patched by family with compatibility fixtures and residual triage.|323|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|DEP-02: Deprecated or unused dependencies are replaced/removed only after peer, runtime and clean-build proof.|323|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|DEP-03: Internal package version, source revision, archive digest and shipped license content are verifiable and immutable.|323|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|UI-01: Secret editor and image viewer honor dialog focus, Escape, allowed close and return-focus behavior.|470|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|UI-02: Sentiment chart tooltips format correctly and render hostile labels as text.|470|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|UI-03: Focused UI changes meet the existing token/design contract and regression checks.|470|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|UI-04: Home controls and multi-staff Calendar remain visible, readable and operable at supported mobile widths.|470|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|UI-05: Seeded critical desktop/mobile keyboard/coarse-pointer journeys run as browser release gates.|470|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|UI-06: Charts/canvas honor reduced motion and expose usable nonvisual information.|470|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SDK-01: HTTP/WS/ACP and plugin postMessage boundaries validate explicit version/capability, actor/tenant, error and trace contracts; Workforce JSON transport bounds response bytes and caller lifetime.|373|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SDK-02: Supported Hub/Site/Paperclip/gateway/plugin and Workforce consumer combinations pass their applicable peer identity, reconnect, malformed-frame, cancellation, safe-error and idempotent retry contracts.|373|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SDK-03: Privileged CRM SDK exports remain server-only and consumer adoption of fixed immutable packages is proven.|373|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|SEC-06: Useful typed analytics datasets replace disabled raw SQL with tenant/module/owner/field policies and bounded rows/bytes.|422|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|DATA-01: Parsing preserves source identity, rejection reasons and retry-safe cursors with bounded work.|352|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`; `specs/2026-05-20-my-agent-homepage.md`|
|DATA-02: Each physical schema has one migration authority and source/applied hash drift checks.|352|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`; `specs/2026-05-20-my-agent-homepage.md`|
|DATA-03: Every retained copy across database, vectors, blobs, memory and backups has an explicit retention/deletion owner.|352|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`; `specs/2026-05-20-my-agent-homepage.md`|
|OBS-01: Server and agent events carry sanitized environment/release/route/trace/run/effect identities.|177|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-22-document-ingestion.md`; `specs/2026-05-23-meeting-agent-google-meet.md`|
|OBS-02: A fixture error resolves to the matching source map and reaches configured telemetry from the actual execution environment.|177|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-22-document-ingestion.md`; `specs/2026-05-23-meeting-agent-google-meet.md`|
|OBS-03: Incident views and alert routing use attributable errors with valid denominators and no sensitive payloads.|177|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-22-document-ingestion.md`; `specs/2026-05-23-meeting-agent-google-meet.md`|
|OPS-01: Exact live source/image/flags and container privilege/resource posture are recorded.|370|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-my-agent-homepage.md`|
|OPS-02: One supported disposable deployment profile starts with correct ports, readiness and shutdown behavior.|370|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-my-agent-homepage.md`|
|OPS-03: Factory containment activation and automatic promotion follow passing external restart/effect drills on the exact runtime identity.|370|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-my-agent-homepage.md`|
|OPS-04: Image dependency/SBOM provenance, fixture restore and rollback are reproducible.|370|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-my-agent-homepage.md`|
|DOC-01: Active instructions describe current supported repositories, branches, storage, auth and executable commands.|514|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|DOC-02: Existing proposals/specs map to requirements and dispositions without reviving retired architecture.|514|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|DOC-03: Each unresolved implementation has a source handoff and proposal; completed changes close both using evidence.|514|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|CAP-01: A synthetic workload records data seed, source/image/hardware, concurrency, SLO and saturation evidence.|362|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`; `specs/2026-05-20-shells-golden-agents.md`|
|CAP-02: Pool/worker/lineage processing stays bounded and fair during bursts, retries and downstream failure.|362|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`; `specs/2026-05-20-shells-golden-agents.md`|
|CAP-03: Restore and cross-store deletion are verified against decided retention/recovery policy.|362|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`; `specs/2026-05-20-shells-golden-agents.md`|
|QC-01: Every requirement has independent source/behavior verification and exact candidate identity.|530|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|QC-02: Authorized release candidates pass cross-project checks and deployment identity/smoke verification.|530|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|
|QC-03: A repeat full 360 audit answers the initial questions with before/after evidence and tracks residual/new findings.|530|`specs/2026-04-19-minion-meta-repo-design.md`; `specs/2026-04-21-triage-executor-adapter-design.md`; `specs/2026-05-19-plugin-control-centers-design.md`; `specs/2026-05-20-centralized-secrets-vault.md`; `specs/2026-05-20-discord-telegram-plugin-extraction.md`; `specs/2026-05-20-meeting-recorder-plugin.md`|

## Conflicting snapshot bodies

- specs:2026-05-22-document-ingestion: `specs/2026-05-22-document-ingestion.md` (review) versus `minion-meta/specs/2026-05-22-document-ingestion.md` (retired)
- specs:2026-07-12-agent-memory-and-chat-response-tree: `specs/2026-07-12-agent-memory-and-chat-response-tree.md` (draft) versus `minion-meta/specs/2026-07-12-agent-memory-and-chat-response-tree.md` (retired)
- specs:2026-07-17-dashboard-kpi-popover-2step-spec: `specs/2026-07-17-dashboard-kpi-popover-2step-spec.md` (draft) versus `minion-meta/specs/2026-07-17-dashboard-kpi-popover-2step-spec.md` (retired)
- specs:2026-07-19-channel-scoping-fix-plan: `specs/2026-07-19-channel-scoping-fix-plan.md` (draft) versus `minion-meta/specs/2026-07-19-channel-scoping-fix-plan.md` (parked)
- specs:2026-07-25-nats-jetstream-event-plane-implementation-spec: `specs/2026-07-25-nats-jetstream-event-plane-implementation-spec.md` (approved) versus `minion-meta/specs/2026-07-25-nats-jetstream-event-plane-implementation-spec.md` (retired)
- specs:2026-08-03-crm-icp-score-spec: `specs/2026-08-03-crm-icp-score-spec.md` (draft) versus `minion-meta/specs/2026-08-03-crm-icp-score-spec.md` (approved)
- specs:2026-08-07-projects-github-repos-and-factory-gates-spec: `specs/2026-08-07-projects-github-repos-and-factory-gates-spec.md` (unknown) versus `minion-meta/specs/2026-08-07-projects-github-repos-and-factory-gates-spec.md` (retired)
- specs:2026-08-13-agentic-sdlc-test-quality-gates-spec: `specs/2026-08-13-agentic-sdlc-test-quality-gates-spec.md` (draft) versus `minion-meta/specs/2026-08-13-agentic-sdlc-test-quality-gates-spec.md` (shipped)
- specs:2026-08-13-ci-minion-site-ci-spec: `specs/2026-08-13-ci-minion-site-ci-spec.md` (draft) versus `minion-meta/specs/2026-08-13-ci-minion-site-ci-spec.md` (done)
- specs:2026-08-13-crm-customers-server-pagination-spec: `specs/2026-08-13-crm-customers-server-pagination-spec.md` (approved) versus `minion-meta/specs/2026-08-13-crm-customers-server-pagination-spec.md` (implementing)
- specs:2026-08-17-base-deploy-status-branch-filter-spec: `specs/2026-08-17-base-deploy-status-branch-filter-spec.md` (approved) versus `minion-meta/specs/2026-08-17-base-deploy-status-branch-filter-spec.md` (shipped)
- specs:2026-08-17-cloud-agent-memory-sync-spec: `specs/2026-08-17-cloud-agent-memory-sync-spec.md` (approved) versus `minion-meta/specs/2026-08-17-cloud-agent-memory-sync-spec.md` (done)
- specs:2026-08-17-factory-agent-cli-unpinned-spec: `specs/2026-08-17-factory-agent-cli-unpinned-spec.md` (approved) versus `minion-meta/specs/2026-08-17-factory-agent-cli-unpinned-spec.md` (shipped)
- specs:2026-08-17-factory-chat-restart-drops-pending-spec: `specs/2026-08-17-factory-chat-restart-drops-pending-spec.md` (approved) versus `minion-meta/specs/2026-08-17-factory-chat-restart-drops-pending-spec.md` (shipped)
- specs:2026-08-17-factory-compose-tailnet-hardcode-spec: `specs/2026-08-17-factory-compose-tailnet-hardcode-spec.md` (approved) versus `minion-meta/specs/2026-08-17-factory-compose-tailnet-hardcode-spec.md` (shipped)
- specs:2026-08-17-factory-providers-put-harness-check-spec: `specs/2026-08-17-factory-providers-put-harness-check-spec.md` (approved) versus `minion-meta/specs/2026-08-17-factory-providers-put-harness-check-spec.md` (done)
- specs:2026-08-17-factory-token-budget-governance-spec: `specs/2026-08-17-factory-token-budget-governance-spec.md` (approved) versus `minion-meta/specs/2026-08-17-factory-token-budget-governance-spec.md` (implementing)
- specs:2026-08-17-gw-defaces-crm-tools-spec: `specs/2026-08-17-gw-defaces-crm-tools-spec.md` (draft) versus `minion-meta/specs/2026-08-17-gw-defaces-crm-tools-spec.md` (implementing)
- specs:2026-08-17-gw-nextcloud-talk-dm-misclassified-spec: `specs/2026-08-17-gw-nextcloud-talk-dm-misclassified-spec.md` (approved) versus `minion-meta/specs/2026-08-17-gw-nextcloud-talk-dm-misclassified-spec.md` (done)
- specs:2026-08-17-gw-nostr-dispatch-pipeline-spec: `specs/2026-08-17-gw-nostr-dispatch-pipeline-spec.md` (draft) versus `minion-meta/specs/2026-08-17-gw-nostr-dispatch-pipeline-spec.md` (implementing)
- specs:2026-08-17-gw-shells-lifecycle-stubs-spec: `specs/2026-08-17-gw-shells-lifecycle-stubs-spec.md` (approved) versus `minion-meta/specs/2026-08-17-gw-shells-lifecycle-stubs-spec.md` (approved)
- specs:2026-08-17-gw-whatsapp-cloud-template-fallback-spec: `specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.md` (approved) versus `minion-meta/specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.md` (implementing)
- specs:2026-08-17-hub-brain-org-all-scope-spec: `specs/2026-08-17-hub-brain-org-all-scope-spec.md` (draft) versus `minion-meta/specs/2026-08-17-hub-brain-org-all-scope-spec.md` (implementing)
- specs:2026-08-17-hub-dead-mirrors-cleanup-spec: `specs/2026-08-17-hub-dead-mirrors-cleanup-spec.md` (draft) versus `minion-meta/specs/2026-08-17-hub-dead-mirrors-cleanup-spec.md` (implementing)
- specs:2026-08-17-hub-igv-rate-from-org-config-spec: `specs/2026-08-17-hub-igv-rate-from-org-config-spec.md` (approved) versus `minion-meta/specs/2026-08-17-hub-igv-rate-from-org-config-spec.md` (implementing)
- specs:2026-08-17-hub-personal-agent-entrypoint-test-spec: `specs/2026-08-17-hub-personal-agent-entrypoint-test-spec.md` (draft) versus `minion-meta/specs/2026-08-17-hub-personal-agent-entrypoint-test-spec.md` (done)
- specs:2026-08-17-hub-pos-appointments-fork-spec: `specs/2026-08-17-hub-pos-appointments-fork-spec.md` (approved) versus `minion-meta/specs/2026-08-17-hub-pos-appointments-fork-spec.md` (implementing)
- specs:2026-08-17-hub-reserva-keyword-config-spec: `specs/2026-08-17-hub-reserva-keyword-config-spec.md` (approved) versus `minion-meta/specs/2026-08-17-hub-reserva-keyword-config-spec.md` (implementing)
- specs:2026-08-17-hub-updatesellable-silent-drop-spec: `specs/2026-08-17-hub-updatesellable-silent-drop-spec.md` (approved) versus `minion-meta/specs/2026-08-17-hub-updatesellable-silent-drop-spec.md` (done)
- specs:2026-08-17-maintenance-lane-monitors-spec: `specs/2026-08-17-maintenance-lane-monitors-spec.md` (approved) versus `minion-meta/specs/2026-08-17-maintenance-lane-monitors-spec.md` (implementing)
- specs:2026-08-17-pkg-dev-crypto-failopen-spec: `specs/2026-08-17-pkg-dev-crypto-failopen-spec.md` (approved) versus `minion-meta/specs/2026-08-17-pkg-dev-crypto-failopen-spec.md` (approved)
- specs:2026-08-17-pkg-gateway-client-onevent-errors-spec: `specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.md` (approved) versus `minion-meta/specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.md` (merged)
- specs:2026-08-17-pkg-infisical-cache-plaintext-spec: `specs/2026-08-17-pkg-infisical-cache-plaintext-spec.md` (draft) versus `minion-meta/specs/2026-08-17-pkg-infisical-cache-plaintext-spec.md` (implementing)
- specs:2026-08-17-pkg-workforce-client-json-error-spec: `specs/2026-08-17-pkg-workforce-client-json-error-spec.md` (approved) versus `minion-meta/specs/2026-08-17-pkg-workforce-client-json-error-spec.md` (done)
- specs:2026-08-17-sdlc-phase-gates-scoring-spec: `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` (approved) versus `minion-meta/specs/2026-08-17-sdlc-phase-gates-scoring-spec.md` (approved)
- specs:2026-08-17-site-device-identity-role-escalation-spec: `specs/2026-08-17-site-device-identity-role-escalation-spec.md` (draft) versus `minion-meta/specs/2026-08-17-site-device-identity-role-escalation-spec.md` (review)
- specs:2026-08-17-site-member-gateway-swallowed-errors-spec: `specs/2026-08-17-site-member-gateway-swallowed-errors-spec.md` (approved) versus `minion-meta/specs/2026-08-17-site-member-gateway-swallowed-errors-spec.md` (done)
- proposals:2026-08-13-crm-customers-fast-list: `proposals/2026-08-13-crm-customers-fast-list.md` (rejected) versus `minion-meta/proposals/2026-08-13-crm-customers-fast-list.md` (merged)
- proposals:2026-08-17-base-deploy-status-branch-filter: `proposals/2026-08-17-base-deploy-status-branch-filter.md` (in-spec) versus `minion-meta/proposals/2026-08-17-base-deploy-status-branch-filter.md` (done)
- proposals:2026-08-17-base-kanban-possibly-shipped-surface: `proposals/2026-08-17-base-kanban-possibly-shipped-surface.md` (draft) versus `minion-meta/proposals/2026-08-17-base-kanban-possibly-shipped-surface.md` (in-spec)
- proposals:2026-08-17-factory-agent-cli-unpinned: `proposals/2026-08-17-factory-agent-cli-unpinned.md` (in-spec) versus `minion-meta/proposals/2026-08-17-factory-agent-cli-unpinned.md` (done)
- proposals:2026-08-17-factory-chat-restart-drops-pending: `proposals/2026-08-17-factory-chat-restart-drops-pending.md` (in-spec) versus `minion-meta/proposals/2026-08-17-factory-chat-restart-drops-pending.md` (done)
- proposals:2026-08-17-factory-compose-tailnet-hardcode: `proposals/2026-08-17-factory-compose-tailnet-hardcode.md` (in-spec) versus `minion-meta/proposals/2026-08-17-factory-compose-tailnet-hardcode.md` (done)
- proposals:2026-08-17-factory-providers-put-harness-check: `proposals/2026-08-17-factory-providers-put-harness-check.md` (in-spec) versus `minion-meta/proposals/2026-08-17-factory-providers-put-harness-check.md` (done)
- proposals:2026-08-17-gw-defaces-crm-tools: `proposals/2026-08-17-gw-defaces-crm-tools.md` (in-spec) versus `minion-meta/proposals/2026-08-17-gw-defaces-crm-tools.md` (in-spec)
- proposals:2026-08-17-hub-brain-org-all-scope: `proposals/2026-08-17-hub-brain-org-all-scope.md` (in-spec) versus `minion-meta/proposals/2026-08-17-hub-brain-org-all-scope.md` (in-spec)
- proposals:2026-08-17-hub-dead-mirrors-cleanup: `proposals/2026-08-17-hub-dead-mirrors-cleanup.md` (in-spec) versus `minion-meta/proposals/2026-08-17-hub-dead-mirrors-cleanup.md` (in-spec)
- proposals:2026-08-17-hub-funnel-atomic-write: `proposals/2026-08-17-hub-funnel-atomic-write.md` (draft) versus `minion-meta/proposals/2026-08-17-hub-funnel-atomic-write.md` (in-spec)
- proposals:2026-08-17-hub-igv-rate-from-org-config: `proposals/2026-08-17-hub-igv-rate-from-org-config.md` (in-spec) versus `minion-meta/proposals/2026-08-17-hub-igv-rate-from-org-config.md` (in-spec)
- proposals:2026-08-17-hub-updateserver-tenant-scope: `proposals/2026-08-17-hub-updateserver-tenant-scope.md` (draft) versus `minion-meta/proposals/2026-08-17-hub-updateserver-tenant-scope.md` (in-spec)
- proposals:2026-08-17-meta-spec-index-project-possibly-shipped: `proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md` (review) versus `minion-meta/proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md` (review)
- proposals:2026-08-17-pkg-dev-crypto-failopen: `proposals/2026-08-17-pkg-dev-crypto-failopen.md` (in-spec) versus `minion-meta/proposals/2026-08-17-pkg-dev-crypto-failopen.md` (in-spec)
- proposals:2026-08-17-pkg-infisical-cache-plaintext: `proposals/2026-08-17-pkg-infisical-cache-plaintext.md` (in-spec) versus `minion-meta/proposals/2026-08-17-pkg-infisical-cache-plaintext.md` (in-spec)
- proposals:2026-08-17-site-vendored-tgz-untracked: `proposals/2026-08-17-site-vendored-tgz-untracked.md` (draft) versus `minion-meta/proposals/2026-08-17-site-vendored-tgz-untracked.md` (in-spec)
- proposals:2026-08-20-hub-datatable-server-mode-test-gap: `proposals/2026-08-20-hub-datatable-server-mode-test-gap.md` (draft) versus `minion-meta/proposals/2026-08-20-hub-datatable-server-mode-test-gap.md` (in-spec)
- proposals:2026-08-28-factory-containment-base-reconciliation: `proposals/2026-08-28-factory-containment-base-reconciliation.md` (draft) versus `minion-meta/proposals/2026-08-28-factory-containment-base-reconciliation.md` (in-spec)

## Inventory issues

No index/body presence, title or status mismatch within inspected snapshots.

## Every document

|Source path|Declared status|Disposition / next review|SHA-256|
|---|---|---|---|
|specs/2026-04-19-minion-meta-repo-design.md|shipped|declared-complete-not-reverified|4ba4aa6d7f1cf89b8d5216aad7a86ac52b303f3f2dad4bba455b817485d75fa8|
|specs/2026-04-21-triage-executor-adapter-design.md|superseded|supersession-target-review-needed|a625f1cbabcdda3ebb80d459d3a7327f3fe71969b80178b5f4c88d6d171e5af0|
|specs/2026-05-19-plugin-control-centers-design.md|shipped|declared-complete-not-reverified|f14971f16ad38175edc7ad1f9dd3417715124eadf6c9a68533854dcfc6da531d|
|specs/2026-05-20-centralized-secrets-vault.md|unknown|review-needed|d2da5cdf404293d1f86bbf2ec934358d3620f97fb9e29ef68e94796e000fbabb|
|specs/2026-05-20-discord-telegram-plugin-extraction.md|parked|review-needed|be5cddf8e4c91f08e3d2e5a8ee744bbb0e9b29743097bcf8e3a5079351cd33b5|
|specs/2026-05-20-meeting-recorder-plugin.md|rejected|review-needed|4cb9c15d69d78cfa1f3f32242222ad7a4597b979fab18d4e4eaca9a67f7f69a6|
|specs/2026-05-20-my-agent-homepage.md|shipped|declared-complete-not-reverified|0511dd1f888a731d071aa10176d63fe9e3d5158cba4998df826a1632285a2ae0|
|specs/2026-05-20-shells-golden-agents.md|superseded|supersession-target-review-needed|4672595c06e4e849d1f2bf16e8f509c5e1f6fde5eb34fa98c769e877d3a9ad0c|
|specs/2026-05-21-gws-cli-replaces-gog.md|shipped|declared-complete-not-reverified|aefc96a7d770cef8b5706f4d27e428c83e18b02ee986c87285e08a74bebbe480|
|specs/2026-05-22-document-ingestion.md|review|review-needed|65592be29cc06f6c7226038fda9dcf78f796a164c5bfb0f0c7c3e75ddcbba25c|
|specs/2026-05-22-gateway-turn-recovery.md|shipped|declared-complete-not-reverified|bc2c4595bb7372c9da4bf41c015e925fe404a1ab7befcf016ad0e0bec68ec5c4|
|specs/2026-05-23-meeting-agent-google-meet.md|rejected|review-needed|245ae00982fdc65a279dba18b4224c2fda2372adf21ceaca957eb93d76d025d1|
|specs/2026-05-24-T6-netcup-hub-rest-runbook.md|unknown|review-needed|47f95fd2ea42084d7a50b9b411a8c8d24785d1d2270cc54bee11c01390328cf9|
|specs/2026-05-24-unified-user-identities-design.md|shipped|declared-complete-not-reverified|d6e5c24322f8c1ab3271b91d522cce5e5724daa2b07c960feea26b2e2848a701|
|specs/2026-05-24-unified-user-identities-p3-wiring-plan.md|unknown|review-needed|c4d7c29a279a4450ce4e0942ec051499b75ed85fc8526361b20fc62d59a45834|
|specs/2026-05-24-unified-user-identities-plan.md|unknown|review-needed|8b558e1cb19f7a67a168c686cde72d2b5333a1a31ae709006c344dd2f8dffaa8|
|specs/2026-05-25-auth-supabase-pg-migration-design.md|shipped|declared-complete-not-reverified|4b84f6c12e2bbf990d9b9a2e606a98374c3df4090258f9408ead37eb362ca67d|
|specs/2026-05-25-auth-supabase-phase1-oauth-users-plan.md|unknown|review-needed|909c9937e565cd274a38bebd2376bfddafa99339cacf0597124504149af43a5b|
|specs/2026-05-25-auth-supabase-phase1b-hub-cutover-plan.md|unknown|review-needed|4041eb354df85be3433f66d9ae50175640f46b9c6a1e4fe1d2c84ce4271a64d1|
|specs/2026-05-26-auth-token-simplification.md|unknown|review-needed|dcd3de9a0aa0c354680833ec333dbc93e77b654ea63233acaff62d2251c963b6|
|specs/2026-05-27-gateway-dx-simplification.md|unknown|review-needed|4caeaf87880c841fd1f661c1ede9bf0059663b796f381afe8aca3e765c82b4eb|
|specs/2026-05-27-whatsapp-qr-pairing.md|shipped|declared-complete-not-reverified|b6dcd822dab2ed1907f27d4fb39976819d73ea94487a63250123a28241c02524|
|specs/2026-05-28-hub-ui-ux-consistency-recon.md|unknown|review-needed|379c39640340c63960c92f4c28a83cabebc0ac990bc1d14bbcee29fe6dd04f8b|
|specs/2026-05-29-flow-testrun-prod.md|unknown|review-needed|5e144e72449797f7f4e334631157855017e06820113e34edc0e36f7eba4ce27e|
|specs/2026-05-30-unified-prompt-tab.md|unknown|review-needed|7a35761267cb2f4122418c70f8919e4637131faa0b4b892fa149ebc0365ff056|
|specs/2026-06-11-gog-nuke-execution-plan.md|shipped|declared-complete-not-reverified|338af18b653bcf4da2f6cd22abd0444f274887d7771f245bca2e459dea5e7e8a|
|specs/2026-06-11-google-oauth-verification-packet.md|shipped|declared-complete-not-reverified|51bf527238515be0c6de2492ba5cdc2b2f74d4e2154ae91c1f18dbccbee05ec7|
|specs/2026-06-13-crm-plugin-recon-and-plan.md|shipped|declared-complete-not-reverified|657d483619f93687100b2f19303a8b64147b5f0120f6252bab1ce885ddfa3d36|
|specs/2026-06-13-gateway-monitoring-events-hooks-recon.md|unknown|review-needed|6a5bf131da8cf04f4b5977fb5e7929f1e042ceb32c925be2ef674adef689bea8|
|specs/2026-06-13-plugin-sdk-recon-and-improvement-report.md|unknown|review-needed|c0ce8a53dee0f9b9ab38671c33f93df78e0d136956b90e3988c09c6d38f338cf|
|specs/2026-06-14-plugin-ui-cdn-caching-design.md|shipped|declared-complete-not-reverified|77733ded6327e18ba83b293bb657a8c549bee836441744b7a7cf77e011ec95e6|
|specs/2026-06-14-workforce-org-company-bridge-design.md|shipped|declared-complete-not-reverified|40bf9159fb85c1f54c016dab5ab49470057a62658b6878b4c5e531a220038f78|
|specs/2026-06-15-plugin-distribution-cicd-design.md|superseded|supersession-target-review-needed|27d21388d33050b69aa5196917d0f0cfc4dd328770d517db70f84d6dc66662f0|
|specs/2026-06-15-shared-account-identities-design.md|shipped|declared-complete-not-reverified|e2825844f02865d34c5cebd7317047af77eed8fd3d09dc9d14fe2ef6f94b944c|
|specs/2026-06-19-linked-channels-config-restructure.md|rejected|review-needed|a34629bb0b373bc1b2865b257034a0c992b143df6d4505c61c2265e7e011689b|
|specs/2026-06-20-constructed-pipelines-voltagent-gaps.md|superseded|supersession-target-review-needed|246635417ea6dc7cf74ac5bc2d7d7a330e92253c5b2c6ae621175b248492d654|
|specs/2026-06-26-gateway-config-db-migration-plan.md|shipped|declared-complete-not-reverified|070aa7d3c30e0b880fe62007adb9244537c6d493ac504c7c951419bd9f363afb|
|specs/2026-06-29-workshop-experiments-subtabs.md|shipped|declared-complete-not-reverified|302d38276cb05d89ad4777c15dbcfd830e33f03d03ad763a83eefabcb202982d|
|specs/2026-06-30-turso-telemetry-audit.md|unknown|review-needed|ae2da0f3881ae8b1eb8a899ec02ff36eb6823695a6e8e6e0e83d5b7bbb89d848|
|specs/2026-07-02-hub-erp-agent-native-audit.md|unknown|review-needed|bc2457dc9d9c097a34c40d7be0300da08a0a26aa030db6c55226d6fbe29845b7|
|specs/2026-07-04-meta-business-integration.md|unknown|review-needed|9312b3ad7c65ed6861ec5af3cb059b306417b30a2dfe3eb037c57cfc9cb800ea|
|specs/2026-07-05-hub-hotkeys-expansion.md|shipped|declared-complete-not-reverified|7da4c4ab736dbd30d72e3fe99382f8a039d1bbc0470909e36057c8b6707c65df|
|specs/2026-07-05-hub-tanstack-virtual.md|unknown|review-needed|e2380be70a9af0ed63b1fd757bc1ab865cdc145f2bda53c1e5781ff5b997ebf0|
|specs/2026-07-05-instagram-login-integration.md|unknown|review-needed|4e89ce315c24fbed4521155c021ccac70715b00dc6bf2814ff9c53b9264b7ee8|
|specs/2026-07-05-meta-post-thumbnail-mirroring.md|shipped|declared-complete-not-reverified|80cbd156cfb33fa9e4ade0b6979b15806c713cfcee5aa2bb7904a1b6e4d2ce76|
|specs/2026-07-05-socials-rename-detail-pages.md|shipped|declared-complete-not-reverified|97336401bc509bb7dbc4d93afb30fb9cec3fcf2cf6616cd4e943b044f0cfcb3d|
|specs/2026-07-06-hub-tanstack-ai-assessment.md|unknown|review-needed|f77b0cc3d8171b438219ea53f6ecad455478b0477ec5d5960fd3c74cccd7482d|
|specs/2026-07-06-hub-tanstack-consolidated-execution.md|unknown|review-needed|0bc8b69c4057823c9e03cd1ab7f033d9440577b859fd24ed12d7189bfa3429a4|
|specs/2026-07-06-hub-tanstack-db-store-assessment.md|unknown|review-needed|a912e3bb2facf1a251146083b7a2b74ab2ba59deb1beaec8959eab90294d2b24|
|specs/2026-07-06-hub-tanstack-pacer.md|unknown|review-needed|1c75cab6f3df65c261ff558a941d37ab047033efebb68d921525fb3fbcbc1a7d|
|specs/2026-07-06-hub-tanstack-query.md|unknown|review-needed|8a2f5e797093d27c87a20c84edd58a4751ea30f289f8e4ab45a250b96a3a9614|
|specs/2026-07-07-hub-db-migration-pipeline.md|shipped|declared-complete-not-reverified|824f10316af5b79b1a1b1d421716810b254a30300676ad57aa69080e738d9c96|
|specs/2026-07-08-package-updates-tracking.md|unknown|review-needed|f4455ec742d42fc50e403bc5f47dc7c2c13c5c14553fac7c50d2bb2d482c7d41|
|specs/2026-07-09-agent-tool-scaling-architecture.md|unknown|review-needed|b61ca8b91b521a94b04f331f27739d1c23f839f12425d255aeda3ee7076528ff|
|specs/2026-07-10-bug-triage-workforce-agents-plan.md|unknown|review-needed|ae5c78466c299f1f734eef72eafe440fbcc086f41bcb30b37dddf7f0a73657c6|
|specs/2026-07-10-bug-triage-workforce-agents.md|shipped|declared-complete-not-reverified|72c0d9f790752095b4577702abd085a186da5bf747cb228e3c042ebaf6758e9d|
|specs/2026-07-10-gateway-update-rollout-runbook.md|unknown|review-needed|514ff6c603f0ab288e8da316e93a590aa8376e835c80e90faffe72b5ba7ff885|
|specs/2026-07-10-gateway-update-system-plan.md|unknown|review-needed|c97fdbe8aa625747633d0b49025df836b9599771a444c5f163a48c4d4589bc76|
|specs/2026-07-10-gateway-update-system.md|superseded|supersession-target-review-needed|db8d6ee223a666810501669c42d69af334e671f4ff4bf239acbc5f6cb51b77d7|
|specs/2026-07-10-per-org-volume-tenancy.md|shipped|declared-complete-not-reverified|ee7cdfc10d5ea42988ef2e1cc1b49c61e7ebb020ad034ee1a2488d9bf499bb9e|
|specs/2026-07-11-fleet-update-orchestration.md|shipped|declared-complete-not-reverified|027eb56c8708e6118bae549db1403391612076eae672bb6d79375c659e928a7c|
|specs/2026-07-11-hub-password-username-auth.md|shipped|declared-complete-not-reverified|1a340fec8ee5853278693b6f7a712819e5e757ac24e5d3dc24d0ce6ed536fd56|
|specs/2026-07-11-universal-projects-module.md|shipped|declared-complete-not-reverified|63c328efa9751c1ffbe69d9e688878ee782b23b4f76c6fa9b439e3e8c7cdb413|
|specs/2026-07-11-ws-failover-eager-reconnect.md|shipped|declared-complete-not-reverified|abda087d7489062c19af25c97880b725afd6d75cf8803f999cbe6d1e11c91ed4|
|specs/2026-07-12-agent-memory-and-chat-response-tree.md|draft|review-needed|0afe3b37e8f6a8d4d4ca426d361d0065ad7c4fadc7c0ab68ca58f4e76cfa166f|
|specs/2026-07-12-living-workforce-harness.md|shipped|declared-complete-not-reverified|251de57992486ee30f9b8092b77aad6c97dd671cdf503c11aee1f237a5ebbf91|
|specs/2026-07-13-cloud-workstations.md|unknown|review-needed|1e07316c03b3e6b4955d08ca724e72f904550296d021136a48d56248b27ec457|
|specs/2026-07-13-hub-design-manifesto.md|unknown|review-needed|af1c1af9e24471084f71601923ee921112bb239f8004374dce77b35c23187b15|
|specs/2026-07-13-hub-figma-screen-coverage-ledger.md|unknown|review-needed|33c556301577b8455436d0e92a1d04dc2739832040b55d96dd2005a9362ca258|
|specs/2026-07-13-hub-ui-coherence-audit.md|unknown|review-needed|b25e8ff0279397c32fe7efbb044d373497a5c67634882d55e1150a72808fedf3|
|specs/2026-07-13-hub-ui-coherence-execution-log.md|shipped|declared-complete-not-reverified|6d53724977851118c5710b4416e8b05d3fe69039c1ff930a58cfbe55295f8190|
|specs/2026-07-13-hub-ui-coherence-implementation-spec.md|shipped|declared-complete-not-reverified|fb2da55d453b660c743ff77c4e0cb4246a7ff85acc750a0cbff523050028a85a|
|specs/2026-07-13-minion-gateway-swarm-cutover.md|unknown|review-needed|ebbd035b9ea162d7908a95c404ecfc12e597ae3d4e481b1f8e1718bd3c135b5a|
|specs/2026-07-13-org-agnostic-ha-service-fabric.md|unknown|review-needed|435dbe7cff44ab6aba1d1d88f9d13e7c3676e3da5bfa4d0114c895f8afbb4438|
|specs/2026-07-13-runtime-aware-fleet-image-updates.md|shipped|declared-complete-not-reverified|a6990931327a46928df8d59b3abd8fe9624b036be6fb7dfc2ec2cc40a9bf6030|
|specs/2026-07-14-hub-figma-mcp-transfer-plan.md|unknown|review-needed|5c073ba3419f21231035a4161c19d08481df4a4627764ced69d71a75795b462f|
|specs/2026-07-15-ui-design-governance-hardening.md|unknown|review-needed|8a6ebe27f958127035272d980b6a9e0e6d9add92485c57e1f4e5c1ceee303535|
|specs/2026-07-17-crm-conversation-intelligence-spec.md|unknown|review-needed|17704eb5883bafcc640cb5b0c828e602b047a9f3aac7d1c84b82f8322fde7137|
|specs/2026-07-17-dashboard-kpi-popover-2step-spec.md|draft|review-needed|dd511282e0f0f3272748668c04b2aca56d7c8695dbb999c3a57f92355df5b106|
|specs/2026-07-17-hub-performance-optimization-plan.md|unknown|review-needed|b7c745cb2d5f725fe8a48cebcf277328e43f66627c652565015544dceeba7eb8|
|specs/2026-07-17-ig-ad-attribution-spec.md|unknown|review-needed|7d4fdc99ae9f22d46114b11012b817e4a6e6c3da1e5e9d7718edb2fc73e60085|
|specs/2026-07-17-pinonite-pulse-proactivity-design.md|shipped|declared-complete-not-reverified|83d9a8707356de3726553f61b195b24cc73ef6389f327963b2e9997d275d5453|
|specs/2026-07-17-pulse-slice1-plan.md|unknown|review-needed|5677a1aadeb276ecd6d81a469f463ddda40c12f02932f6b336c662a16f660560|
|specs/2026-07-17-telemetry-cleanup-and-insights.md|unknown|review-needed|7f27fe2a57da5b060997ebe7e3504ef63a64b3ea363cae444e4bf3fea61307e8|
|specs/2026-07-19-build-channel-dev-prd-pipeline.md|unknown|review-needed|944a2b6f68eca26ef4494562a298676f8b94913d700926731e293830d9c6c170|
|specs/2026-07-19-channel-scoping-fix-plan.md|draft|review-needed|46510dead20db7896ed5bcfcc59394e171fe67a4bfdf5dd21ae241109a3fb804|
|specs/2026-07-19-channel-wizard-intent-modes.md|shipped|declared-complete-not-reverified|6400fc26b8618b7c3294b5197e2375f94978051f5feab0733895b42fe9573451|
|specs/2026-07-19-item-spine-composition-slice1-spec.md|shipped|declared-complete-not-reverified|73b7bff9f05da8cd8634e6c4212bfa38d1e594e027176e43df9f279befdf7d0e|
|specs/2026-07-19-org-kind-segregation-spec.md|shipped|declared-complete-not-reverified|ce826f0f6fb51a915ef485eaeada6bae7ebcebdead3529b113af9e9ef31ec796|
|specs/2026-07-19-pos-stock-split-implementation-spec.md|shipped|declared-complete-not-reverified|35c120ab7f204a7319ce73783a9cc36edd0201ae809895042fc95994499b398c|
|specs/2026-07-20-whatsapp-sync-status-spec.md|shipped|declared-complete-not-reverified|3442028f9fb2102d0e936f45f2a36da7cfd87f2d68bb9fbc9505b6cfb1da26df|
|specs/2026-07-21-unified-brains-knowledge-architecture.md|unknown|review-needed|f8b54ed772d17810a8b8d4f665884405c7921394b4c5e71dbd21599a69720124|
|specs/2026-07-22-hub-routing-simplification-spec.md|unknown|review-needed|3a1bbdd9a583266048e3509c68f422979489bf04505867434ed7e2876b6b170c|
|specs/2026-07-22-personal-org-differentiation-spec.md|unknown|review-needed|943b66e05983b6e9d8303c8890c1f0723969406775669c7d36a553dd1efa74c2|
|specs/2026-07-22-self-hosted-qdrant-brains-architecture.md|shipped|declared-complete-not-reverified|b6bbfca356a999cb28ec1d357abdafe28c178663c192b28b0533eef14f23d103|
|specs/2026-07-23-crm-relationship-graph-v2-spec.md|unknown|review-needed|09888b2c5e35d57139ec2ab90089fc9c87b76d7eaa6c34c850c9c2898c3997e4|
|specs/2026-07-25-faces-catalog-cleanup-report.md|shipped|declared-complete-not-reverified|14cdfa047ec64bfd10f2a094a18c82ffc30c0507d4595d3279ba68bc3115e2c6|
|specs/2026-07-25-nats-jetstream-event-plane-implementation-spec.md|approved|review-needed|62c6a0b0f47ae1ef00dd75b2ac0ee518a0f56362b21f70c57c7c54fcc144efcc|
|specs/2026-08-03-crm-customers-server-pagination-spec.md|superseded|supersession-target-review-needed|685bc9b66eb55478e91ae1c5174a0b040f16a42186527c554ec4d5346101f5cc|
|specs/2026-08-03-crm-icp-score-spec.md|draft|review-needed|f40febe6c03b7e6e571a6506211294b2675c07c4bbbc6c629fc1aa28369a3981|
|specs/2026-08-03-crm-relationship-graph-v2-port-spec.md|shipped|declared-complete-not-reverified|2fe484e2da54b8af823fd0b5f5b4491e341cbc90776bdc26335bc70c4ab09116|
|specs/2026-08-07-projects-github-repos-and-factory-gates-spec.md|unknown|review-needed|e1d1aa5b8a12560854559d1bba4ade329576c152138ed9a308cbc85b1221088b|
|specs/2026-08-12-minion-base-lifecycle-dashboard.md|unknown|review-needed|ce9182e9199c3d73558c0515e1a8541cdc2ad898a1dd96eb7541d9d55250c8c0|
|specs/2026-08-12-minion-base-v2-sdlc-kanban-spec.md|shipped|declared-complete-not-reverified|31a6df4328ba2379774cbd3247ae720b5b102543d40305375db4fa4d8658b21a|
|specs/2026-08-12-minion-factory-agent-pipeline-spec.md|shipped|declared-complete-not-reverified|9b81f4b47d8aede53b3d219ff9294a920bb91b8d3a025899127b8dbf0f3c3120|
|specs/2026-08-13-agentic-sdlc-test-quality-gates-spec.md|draft|review-needed|e87e01ce31c63ff27cb1d49c008899b0b401aa9cd8199a8f3994f87a2127b8c4|
|specs/2026-08-13-ci-minion-site-ci-spec.md|draft|review-needed|810a5ad453d2aa1cdf548d292ce84b9e6bf1f76b7cc4712fc72f0b146e1b2f86|
|specs/2026-08-13-ci-minion-site-ci-spec.review.md|unspecified|supporting-artifact-review-needed|6c16fcf903837d4654bb06a56957783e248d5aa3e073fbbdcaa0f2f350bb5ad4|
|specs/2026-08-13-crm-customers-server-pagination-spec.md|approved|review-needed|5c3adbe18fb48b657457dd492a20a75eb34b238007f6dcbb28da0f02df988791|
|specs/2026-08-13-crm-customers-server-pagination-spec.review.md|unspecified|supporting-artifact-review-needed|65489700ca3be713609659ad9bfb4be5416a030920209743dae3cd23e3a096ae|
|specs/2026-08-13-minion-base-kanban-auto-refresh-spec.md|shipped|declared-complete-not-reverified|e9083a476861252f8f2556753392bac00e969855f7d3f55766c21593f4f5308f|
|specs/2026-08-13-minion-base-kanban-auto-refresh-spec.review.md|unspecified|supporting-artifact-review-needed|2d999a9bd2ad2516e331f4ab1edab4bd2a7bde5d3cc0ab074ad0a7c3b004c7b4|
|specs/2026-08-13-minion-factory-staged-harness-spec.md|shipped|declared-complete-not-reverified|e2f13b377efda6fb3ff06053fd492a8e82490aff49156aa31842a7032131ae53|
|specs/2026-08-13-request-to-deploy-sdlc-pipeline-spec.md|shipped|declared-complete-not-reverified|5c7843b9fc84cd8fec963d59a6e8cc8125645b7047058cc93340021fedabf836|
|specs/2026-08-14-pos-payment-methods-config-spec.md|shipped|declared-complete-not-reverified|d149452e0b7d409aefded47478c41621d1203b6b865ef38fab7b71c93839508b|
|specs/2026-08-14-pos-shadow-emission-spec.md|shipped|declared-complete-not-reverified|e36d6d8f2bfe9c45825826345936ec9085cee0eb8873905d5cdc0f6a70905b70|
|specs/2026-08-14-purchases-rce-module-spec.md|shipped|declared-complete-not-reverified|c199ed796f082edb36a540b40202359224bc00d4011cd2b2938c94094fa7e88f|
|specs/2026-08-14-sunat-emission-beta-spec.md|shipped|declared-complete-not-reverified|45cc038bcb17efede3ee6dc413443742c882a7e50881067cc95b8e62c66290bc|
|specs/2026-08-14-sunat-resumen-baja-spec.md|shipped|declared-complete-not-reverified|31f0ea3b3b37c16150973303c29b603e165997a801efc6ef94f6db9c272849cc|
|specs/2026-08-14-sunat-source-ui-spec.md|shipped|declared-complete-not-reverified|ef47c637c3e2672e427b68a346019226e3478a2254fd42289c010f911c99861c|
|specs/2026-08-17-base-deploy-status-branch-filter-spec.md|approved|review-needed|48fed20d2b52f9d9b41d7bd570bb6478c7d0efbfcac6ab05db43dc20b4d598e7|
|specs/2026-08-17-base-deploy-status-branch-filter-spec.review.md|unspecified|supporting-artifact-review-needed|0da783df1ff3fe9357abfc0c6361fb4c03c5c48512d65aa26d98d945c8ca8820|
|specs/2026-08-17-cloud-agent-memory-sync-spec.md|approved|review-needed|a722fa2f4747a7065b2203e02ce4f20671aa53a1744041cb59e29dfe7a865977|
|specs/2026-08-17-factory-agent-cli-unpinned-spec.md|approved|review-needed|f6d267ee25edde1d0ba0b39aa0e2a831cfdf3849f03d7b64651e3479e72874b1|
|specs/2026-08-17-factory-agent-cli-unpinned-spec.review.md|unspecified|supporting-artifact-review-needed|4acc5d137d38f1bba47e11d029630083e69433034c5a1bcb33cac2f361faa3fb|
|specs/2026-08-17-factory-chat-restart-drops-pending-spec.md|approved|review-needed|1015a465df86a2401392fb0f7cd1973695b3955382b65a80c50ff87aa7bdb016|
|specs/2026-08-17-factory-chat-restart-drops-pending-spec.review.md|unspecified|supporting-artifact-review-needed|76ab6fb0a61a63f5a09d5aee45a02e48a014aedbc7e0b42106ee4c06430827f3|
|specs/2026-08-17-factory-compose-tailnet-hardcode-spec.md|approved|review-needed|9b1b5d1ce5f107c7bb5f07802b3ba751a10860b1a7fc0133c81a7631489b3870|
|specs/2026-08-17-factory-compose-tailnet-hardcode-spec.review.md|unspecified|supporting-artifact-review-needed|3a61ed7f0f9180a7ccf3eb92d0aa3978003d0b1f5b36631c86c6ad9925679852|
|specs/2026-08-17-factory-providers-put-harness-check-spec.md|approved|review-needed|72d0473cb6004b98aabf0c95852c06832dc57dbdbdba59e7c976a95e8e2ed2fe|
|specs/2026-08-17-factory-providers-put-harness-check-spec.review.md|unspecified|supporting-artifact-review-needed|f176d226ed86fe5439d9f5b97128f5d62242e72a0132ff2b34779eb032b1f0b6|
|specs/2026-08-17-factory-token-budget-governance-spec.md|approved|review-needed|31106a94568efa5313498a91e76a1ca4c16bb6db72e3a4dfa3c01c6d072fd332|
|specs/2026-08-17-gw-defaces-crm-tools-spec.md|draft|review-needed|81d9162900c6bd1f4a7cf3cf337783d839979df175f4071e3bb8cf418cbd01e4|
|specs/2026-08-17-gw-defaces-crm-tools-spec.review.md|unspecified|supporting-artifact-review-needed|88c8e8aad1dc0e7db4f0e409664bee5ad71289b3eb123d39f76c37edf20a215b|
|specs/2026-08-17-gw-msteams-large-upload-spec.md|draft|review-needed|8aa61f5a05bdae1aaf392a690a55c838b8f35de4d3146c516e19777bd13d0166|
|specs/2026-08-17-gw-msteams-large-upload-spec.review.md|unspecified|supporting-artifact-review-needed|28fdfe83163f99b40b8913e27d598d2e7cba636073c18cc78d53741413cd141d|
|specs/2026-08-17-gw-nextcloud-talk-dm-misclassified-spec.md|approved|review-needed|f87f998167a702ea2b280e70730ab975adffb90a8a721cfc91b9de0c17b1b5dc|
|specs/2026-08-17-gw-nextcloud-talk-dm-misclassified-spec.review.md|unspecified|supporting-artifact-review-needed|7843b6dd306af895dbd4391abdaa4fa60fa0d93c3bd5e07c59687a27b21cd4a6|
|specs/2026-08-17-gw-nostr-dispatch-pipeline-spec.md|draft|review-needed|aa9e3369f40dd3764c719ac29f525f440580070efbfabd4854efd272cb1d1d62|
|specs/2026-08-17-gw-nostr-dispatch-pipeline-spec.review.md|unspecified|supporting-artifact-review-needed|f5c478ec85065399405cf201e528326524ac61ef47896940d80e460ab947268b|
|specs/2026-08-17-gw-shells-lifecycle-stubs-spec.md|approved|review-needed|7e4dd4b400bd990ff92d703183232acbe61cb6ec3df104c0f75dac77f9cb3e71|
|specs/2026-08-17-gw-shells-lifecycle-stubs-spec.review.md|unspecified|supporting-artifact-review-needed|97f17502e2e51a05e5e30962807fda5c199149ed24df594e035e963e7439bba2|
|specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.md|approved|review-needed|0c984a688811d66aea4bbf83741511dcd3c35dac3e27502cda24ff920147cc94|
|specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.review.md|unspecified|supporting-artifact-review-needed|5970d0c75e70882293f00b88f61ed373a6546e8002ad670d0256d924338201b0|
|specs/2026-08-17-hub-brain-org-all-scope-spec.md|draft|review-needed|c9cbb6d00ee2f8075099749f44c5fd6af019d507a1506d8344727084a2cd6afd|
|specs/2026-08-17-hub-brain-org-all-scope-spec.review.md|unspecified|supporting-artifact-review-needed|2af5cc11dce753525b4916602d2e5c77a75e3b144e8d33bff0bee23e119d617b|
|specs/2026-08-17-hub-dead-mirrors-cleanup-spec.md|draft|review-needed|92025f20d91bceeb9e059ee6265ee68a9d813060b8ac056caec9c97f0725a153|
|specs/2026-08-17-hub-dead-mirrors-cleanup-spec.review.md|unspecified|supporting-artifact-review-needed|b10440bfc19585d00bef7a5c1b91ea6db3aa45ae3e9b400aca08f1ce668023ad|
|specs/2026-08-17-hub-distinct-visit-dates-spec.md|draft|review-needed|5d463ad1736b43a0b5708aced9cff6976c899b3892a4c28bae8934d6c432ab06|
|specs/2026-08-17-hub-distinct-visit-dates-spec.review.md|unspecified|supporting-artifact-review-needed|144c13da2daee9db5499922df5f82a82694e9037cb69f5333f92ddc4e4519d7c|
|specs/2026-08-17-hub-igv-rate-from-org-config-spec.md|approved|review-needed|99dc1f3d6a355043cca340abba699f3c30595f3a05a3a88b0e382f045b7081af|
|specs/2026-08-17-hub-igv-rate-from-org-config-spec.review.md|unspecified|supporting-artifact-review-needed|0624b042fe857357dba59aa60f9fc36ee656be485f9dffb4d4f82752b3f25a24|
|specs/2026-08-17-hub-personal-agent-entrypoint-test-spec.md|draft|review-needed|e5e13c2d787af32b1fb572d72fb41f97dd78405d393aaa0ce7018be710aef976|
|specs/2026-08-17-hub-personal-agent-entrypoint-test-spec.review.md|unspecified|supporting-artifact-review-needed|1c26d9d8afca42c17af7cd66a8645851c4e472f7b068c0946294357fd67d1d3f|
|specs/2026-08-17-hub-pos-appointments-fork-spec.md|approved|review-needed|4241b82656562c9a12d79885d7715c109fff45d266165e4afcb6b5f4059029dc|
|specs/2026-08-17-hub-pos-appointments-fork-spec.review.md|unspecified|supporting-artifact-review-needed|a45b84954a3c10da7f672814d35f7e5e8f747791601ed168d1c938d7c9eaa725|
|specs/2026-08-17-hub-reserva-keyword-config-spec.md|approved|review-needed|3cc2057d82297cf09c9fe899c0a5d9f878a5cdfb2eb77c13967e6c2826ec19ae|
|specs/2026-08-17-hub-reserva-keyword-config-spec.review.md|unspecified|supporting-artifact-review-needed|ec975d0699c80fbd5e0ae7ca01ee07d399100b5ae8c320d9884b8f6258e864b3|
|specs/2026-08-17-hub-updatesellable-silent-drop-spec.md|approved|review-needed|0d0e630efacf4de911f1b4ae4065077d5763dc4ba987ef892ae07732baf3169d|
|specs/2026-08-17-hub-updatesellable-silent-drop-spec.review.md|unspecified|supporting-artifact-review-needed|8ffe86eef164d3659b5f193cb5da4b408a836156604733ce489524904865b68d|
|specs/2026-08-17-maintenance-lane-monitors-spec.md|approved|review-needed|c5ffe84d67dbcdbf85baeeaba71307291050261138f84f4c8c443cff41dd586a|
|specs/2026-08-17-pkg-dev-crypto-failopen-spec.md|approved|review-needed|795b59cd1c861bd4f884e2feeee4a4b49b69eade23ec8185ebad4b76d41753eb|
|specs/2026-08-17-pkg-dev-crypto-failopen-spec.review.md|unspecified|supporting-artifact-review-needed|6e58a83631ae5cc743be13cadefc4f1e2d38d2c2cfc8741686085206ad3761f4|
|specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.md|approved|review-needed|905aa60a6d0efac3fb81bbf9df0cd2ff4f79acc9b36ec1aef739e1dbc83c487c|
|specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.review.md|unspecified|supporting-artifact-review-needed|5fbcb38b06567fab937591bff4bd8421659ece04c803b25bff5f0b94b521ff92|
|specs/2026-08-17-pkg-infisical-cache-plaintext-spec.md|draft|review-needed|fa889ea915105bc6f62d2c5038c8b0d28699d95e1cc2d0e46aa896535f39efd9|
|specs/2026-08-17-pkg-infisical-cache-plaintext-spec.review.md|unspecified|supporting-artifact-review-needed|16b5b0d637458fd68daabda43ee502369accea57d4b45823345a37d8ddc13795|
|specs/2026-08-17-pkg-workforce-client-json-error-spec.md|approved|review-needed|083d9899710fe33f83db17b374e9f70acc22506646acb7196e02b306e9769e87|
|specs/2026-08-17-pkg-workforce-client-json-error-spec.review.md|unspecified|supporting-artifact-review-needed|ba0d07066b4f144103dc7bbe70697e51b455cf395c072c2efdfd9102aeba087e|
|specs/2026-08-17-sdlc-phase-gates-scoring-spec.md|approved|review-needed|dd8ccafdff0ef51061755476b3c2d17fcc9810d6a096ca28bf7fc1ae1de54492|
|specs/2026-08-17-site-device-identity-role-escalation-spec.md|draft|review-needed|98ec302857807ca15da368a625ea39de57be14b6694b3092b1187181c2fac298|
|specs/2026-08-17-site-device-identity-role-escalation-spec.review.md|unspecified|supporting-artifact-review-needed|fba4804651ab962fe729e0fb7e10c965fc7a9ab459dbed1a885121ecbda09172|
|specs/2026-08-17-site-member-gateway-swallowed-errors-spec.md|approved|review-needed|a8411fe30484df8edfa2a1655e81781f5a26ac24870021ded074b44d6bbae252|
|specs/2026-08-17-site-member-gateway-swallowed-errors-spec.review.md|unspecified|supporting-artifact-review-needed|af70c8c73d3dbe72f8bb83c331851c051384ad72a82c9c472c7c778036d5c6ad|
|specs/2026-09-02-hub-team-hr-module-spec.md|implementing|review-needed|502eca0983ee952e8ce7e40d0fdb36befa93270165aa95f85160ac414aaec9de|
|specs/2026-09-08-hub-scheduling-calendar-views-tags-spec.md|shipped|declared-complete-not-reverified|1ac1a71c0ca0d87b92fa12029e9414b56644927c13dfe417a0a8ed5020b634b7|
|specs/clean-slate-inventory.md|shipped|declared-complete-not-reverified|3ee88a7e8f782de36138c321ab086deaf1cb59601a60368724cf0138e7be4a28|
|specs/hub-erp-roadmap/P0-write-hardening.md|unspecified|nested-document-review-needed|70d7315ddc2c68db3278314ea2b5431ba731c39775159d36e58a2dd74d9f955f|
|specs/hub-erp-roadmap/P1-mcp-tool-packs.md|unspecified|nested-document-review-needed|2c80976336d6013186dc63968171b75da6f1e8faf330def68a354dfe7a5420bc|
|specs/hub-erp-roadmap/P2-event-bus.md|unspecified|nested-document-review-needed|c8cf7cfa51e95a93f148366347b581c6a14b23fda46b65924fd6bdb4a686ad8b|
|specs/hub-erp-roadmap/P3-role-aware-ui.md|unspecified|nested-document-review-needed|8bcf7f9171de59b74d3bee90ddcba0caa55394061b9340b023bfa7149554eb01|
|specs/hub-erp-roadmap/P4-ai-brains.md|unspecified|nested-document-review-needed|47915fec948f04040246ce17c62aa0d083299ac568e3e52da2a18c680711f34f|
|specs/hub-erp-roadmap/P4.1-brains-consolidation.md|unspecified|nested-document-review-needed|94d46701923d53f48da3f39607f9297b697787cef050acff0c498fb533bdb766|
|specs/hub-erp-roadmap/P5-stock-module.md|unspecified|nested-document-review-needed|729113b054426e7a1d9323e452df190ceb8cdb87ed9c72693d049847b94a3abc|
|specs/hub-erp-roadmap/P5.1-stock-interconnect-seed.md|unspecified|nested-document-review-needed|f1df4211190b1909d7c1bc853528b5f40da42cd92378d6877626e01fc2236aad|
|specs/research/2026-09-02-nexterp-hr-brief.md|unspecified|nested-document-review-needed|8fcea71f8ef74ff188d032dcedcd0def15b1bd54b41b2543e4a19f7fcd0d1e5e|
|specs/TEMPLATE.md|parked|supporting-artifact-review-needed|06075650d345ab37c9a569a7de8e7356d9d6630d6b19f9ba38e193924171d362|
|specs/ws-duplication-audit.md|shipped|declared-complete-not-reverified|d5ae0a4bc851250dd8d560e99823d662242a33fd4659c86b74bd61ac8a07096b|
|proposals/2026-08-13-crm-customers-fast-list.md|rejected|review-needed|25800a27248e9673ed76c0f7019518b46a8b631e8e20e257c7f88f9aa8695ad7|
|proposals/2026-08-13-crm-customers-server-pagination.md|in-spec|review-needed|8125c93b0558da08781f05536dc7aa20bdd57ddf5ab37c6e78ae5827cc1dab3e|
|proposals/2026-08-13-minion-base-kanban-auto-refresh.md|done|declared-complete-not-reverified|34c0374d24131f24fe565d8b85a64e60e5c29a64a8fd4d9a09c9bd0b729f9360|
|proposals/2026-08-17-base-deploy-status-branch-filter.md|in-spec|review-needed|c82861c9d80a30bd66d195fe8781eb594ba3f32d4ca17c427a1e283417c8a81e|
|proposals/2026-08-17-base-kanban-possibly-shipped-surface.md|draft|review-needed|4ca6220d781e49e20b9a1ff70d4747d97779066a73b285adb34d629cf21109f9|
|proposals/2026-08-17-factory-agent-cli-unpinned.md|in-spec|review-needed|5449b15dde95a9994f0e822c2402e16b1f4c2567e722ecf6726216eac112623c|
|proposals/2026-08-17-factory-chat-restart-drops-pending.md|in-spec|review-needed|7f73c050c80e719f1acd860ae7f0f51154c344a1e2012c3a75ec10969d8155c7|
|proposals/2026-08-17-factory-compose-tailnet-hardcode.md|in-spec|review-needed|2b32941cb0edd55902886c699acbc67c3d8b4560745dd4dcfea799f0171b8a6e|
|proposals/2026-08-17-factory-providers-put-harness-check.md|in-spec|review-needed|47f9b21792083168895c421028efb7e0113ec33ac40256393b61b8bee1ab692f|
|proposals/2026-08-17-gw-defaces-crm-tools.md|in-spec|review-needed|7057f7d120d18dc957824fd7e8e2ccaa42721cd1c1465c3e800a01bdfa51dbe9|
|proposals/2026-08-17-gw-msteams-large-upload.md|in-spec|review-needed|056084a24efa866280d49f10ee0970897f265afa59f503af46bd55d355c77f75|
|proposals/2026-08-17-gw-nextcloud-talk-dm-misclassified.md|in-spec|review-needed|bbffc4525bc681d67218a9f0499767c12037fe2f15cf78a0878dd00f103c87e6|
|proposals/2026-08-17-gw-nostr-dispatch-pipeline.md|in-spec|review-needed|5733d2e4d4714a310e59bdcd65777a167f17bfdebb9ae9fcb43c752e31bfaa79|
|proposals/2026-08-17-gw-shells-lifecycle-stubs.md|in-spec|review-needed|cf532bb18a74b768a3f8edd26236cf905fc41500ff5fe21e2b9d87b2536dc4e0|
|proposals/2026-08-17-gw-whatsapp-cloud-template-fallback.md|in-spec|review-needed|f6d2e908098afb27f6ea88f84b156bd55356ee34c6c5c2ef5b88541ce626bb2f|
|proposals/2026-08-17-hub-brain-org-all-scope.md|in-spec|review-needed|b9b2e941ddff6b6b265e1b69d261489992e5887ba0078d6b50943a56912b2d29|
|proposals/2026-08-17-hub-dead-mirrors-cleanup.md|in-spec|review-needed|61916ff601e8e560a8212fa1f1d0f0ef883d8202665de8313d52929dc4bcb19c|
|proposals/2026-08-17-hub-distinct-visit-dates.md|in-spec|review-needed|3cbc93549a23fe9f250d3538164f74b19bf67d737e69dfccf658838149ecd080|
|proposals/2026-08-17-hub-funnel-atomic-write.md|draft|review-needed|cbc748b25c0ddbb6ea77772b500bb0a5aab80e71eaf6686e3aa87eadd999a740|
|proposals/2026-08-17-hub-igv-rate-from-org-config.md|in-spec|review-needed|e144d9aad38f5ae9e800484b4d987cd85633b7c21d3398e3bbfda14ac310ff1e|
|proposals/2026-08-17-hub-personal-agent-entrypoint-test.md|in-spec|review-needed|1471aca726f514be0307869eb39e5162b294009c698c6e7e38670e11204f2ce1|
|proposals/2026-08-17-hub-pos-appointments-fork.md|in-spec|review-needed|67ff4275ac88017cf0393460002cf667ce3b3ee641a0e6c625e00024bc031b2a|
|proposals/2026-08-17-hub-reserva-keyword-config.md|in-spec|review-needed|f3cf78f105ffeae944fc3042f39341ba936c3e64fddcab326d5afeec9b3c87c5|
|proposals/2026-08-17-hub-updatesellable-silent-drop.md|in-spec|review-needed|e5aa094788486362e30f99f1764b44ed78c2f117129e1d1310b7a27756fae376|
|proposals/2026-08-17-hub-updateserver-tenant-scope.md|draft|review-needed|8d611fae4d9c33f932ba92166e3045645f452091f79285a24640c6d57347ceb4|
|proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md|review|review-needed|a0112b9716758e35ade851b78ed6333bfc0d060bd84470bea7121a5d05e03885|
|proposals/2026-08-17-pkg-dev-crypto-failopen.md|in-spec|review-needed|f5e50c270e022dcf4633aa9024ef29d0e517e6142d6256bc73eaa547e1564223|
|proposals/2026-08-17-pkg-gateway-client-onevent-errors.md|in-spec|review-needed|c6dbdac621937941c6ba7f4f075119c825e5f40662ebf0a4847a221b87abdd91|
|proposals/2026-08-17-pkg-infisical-cache-plaintext.md|in-spec|review-needed|a4d1fb1f610054504e651e483a102b9c053be75c8d0dfb0f7523a1d3c908d0f5|
|proposals/2026-08-17-pkg-workforce-client-json-error.md|in-spec|review-needed|5f4fa5862a92ab96df5bea26dc4397614ed1b57038febe0a3de171fb18482575|
|proposals/2026-08-17-site-device-identity-role-escalation.md|in-spec|review-needed|bbe20443ca36628dbe8f0cf9ad4014e58e3b4531a5e3862f982b0378c0961924|
|proposals/2026-08-17-site-member-gateway-swallowed-errors.md|in-spec|review-needed|d662da09da401897cf63d4e2825224e294ba986fcf236eb017dcb1ad9f295813|
|proposals/2026-08-17-site-vendored-tgz-untracked.md|draft|review-needed|a02c7e8579d2822b4dbd4b95d17f9473e905d3888d279f2b877b2033978a1641|
|proposals/2026-08-20-hub-datatable-server-mode-test-gap.md|draft|review-needed|7ca13e0dbf4f7b888304037b9d1a728fa86be9b8de787e985c9ae122a152bd35|
|proposals/2026-08-20-hub-finance-provider-source-refs.md|draft|review-needed|4d023cd694b3242fa25d671edc9f88c1521255ccd8a329660522d3bee07956a0|
|proposals/2026-08-22-factory-runner-native-binding-test-gap.md|closed|declared-complete-not-reverified|5cc9ad58421832ba783a9cb9d10a3554c8a6974d603cd6a529c5147f8efabf9a|
|proposals/2026-08-24-minion-ai-npm-trusted-publishing.md|review|review-needed|e9c0d85fa3a0d3612804cc45cfbdad385cc33947cb58c02d83e6fa1aae7f0711|
|proposals/2026-08-24-minion-ai-secret-baseline-refresh.md|draft|review-needed|cfc21b053603b466525a58500500eab91fd149687462cf1de6442898d6dfad1b|
|proposals/2026-08-28-factory-containment-base-reconciliation.md|draft|review-needed|ebbf0fa4db6debbac452b08eee291b5e980f08477ed6aaa6f9a01b68dd8af732|
|proposals/2026-08-28-factory-gate-weakening-detector.md|draft|review-needed|4f467f7af51a21291ff7a0136869aa34c28c73f89dffb2b80d68dcbdadbf9990|
|proposals/2026-08-28-factory-infra-product-failure-taxonomy.md|draft|review-needed|1fc54afdb91164881debf60e86c8dc579a27973aeab691e508e29d7b7c10889f|
|proposals/2026-08-28-factory-legacy-develop-token-scope.md|draft|review-needed|03eb65a0a0917fde1822463b1153e16392e87515454fb11760f46d9653ee3b79|
|proposals/2026-08-28-factory-reviewer-instruction-isolation.md|draft|review-needed|9d286615e9f260ee9724bd455dbba88747db28bf2270cf99c95f98ab9799d4f8|
|proposals/2026-08-28-hub-faces-insumos-reconciliation-followups.md|draft|review-needed|a265dc0ba1ab2d301d89d127f93322c39cdecb81e22293616e500e4495458b6f|
|proposals/2026-09-02-gateway-client-tools-webmcp-bridge.md|draft|review-needed|f4985f1b78a71d6e9807685d817a7605a036fa0b489ca9501bf3038850dcee40|
|proposals/2026-09-02-hub-pos-appointments-modal-to-route.md|draft|review-needed|abdb8a9bba872efde9b7cf9568875cece59e2657bb980f6ca180c3641c50d424|
|proposals/2026-09-03-hub-team-hr-tabs-followups.md|draft|review-needed|504159bec5462444a412601efb82a18e46629dc144210c90997ca03ff84c5f7e|
|proposals/2026-09-08-hub-scheduling-calendar-followups.md|draft|review-needed|212fdf312b309c19ccc934de55fe58b85b9dd59237a371f2beb217adf0d2b91a|
|proposals/2026-09-08-platform-qc-remediation.md|draft|review-needed|29fa2b3300001486694b66c8a1b8ab3599706664482e29a25307d470b13d06ee|
|proposals/2026-09-09-assistant-query-delegation-restoration.md|draft|review-needed|358058ad5a9ce343c75b5def3b381bb0e4a61d2309ccdd7b99b92cdfbee0dbd5|
|proposals/2026-09-09-flow-sql-bindings-migration.md|draft|review-needed|9ce9ed2af0f78cd76006a7477fc918e6e91f2b9d04be8753ba5b0501fd4cb4c6|
|proposals/2026-09-10-hub-finance-parser-version-binding.md|draft|review-needed|63b1cdee259a89c63cfbe1ea62fe39397f5ca04d6d4656b753a09e39a9fb296d|
|proposals/ci-minion_hub-ci.md|closed|declared-complete-not-reverified|9f9711bb9103a8d34bf0cbee49fb7622ff4700189fe1b2b1f332768dfab6e599|
|proposals/ci-minion-ai-upstream-monitor.md|closed|declared-complete-not-reverified|c7d45df7b5b6620f1ad90ddd5c324742e361be7b5e22fd353e86fb8dac18c491|
|proposals/ci-minion-site-ci.md|closed|declared-complete-not-reverified|2abc22bea3e3391386ac793ef9e08646096d60f0e24a6c8071d30935f60fb672|
|proposals/TEMPLATE.md|closed|supporting-artifact-review-needed|1d864190541b86c097f75a19acff3df3a3bc09b0a0e37b156fba815b4b4fb01b|
|minion-meta/specs/2026-04-19-minion-meta-repo-design.md|shipped|declared-complete-not-reverified|4ba4aa6d7f1cf89b8d5216aad7a86ac52b303f3f2dad4bba455b817485d75fa8|
|minion-meta/specs/2026-04-21-triage-executor-adapter-design.md|superseded|supersession-target-review-needed|a625f1cbabcdda3ebb80d459d3a7327f3fe71969b80178b5f4c88d6d171e5af0|
|minion-meta/specs/2026-05-19-plugin-control-centers-design.md|shipped|declared-complete-not-reverified|f14971f16ad38175edc7ad1f9dd3417715124eadf6c9a68533854dcfc6da531d|
|minion-meta/specs/2026-05-20-centralized-secrets-vault.md|unknown|review-needed|d2da5cdf404293d1f86bbf2ec934358d3620f97fb9e29ef68e94796e000fbabb|
|minion-meta/specs/2026-05-20-discord-telegram-plugin-extraction.md|parked|review-needed|be5cddf8e4c91f08e3d2e5a8ee744bbb0e9b29743097bcf8e3a5079351cd33b5|
|minion-meta/specs/2026-05-20-meeting-recorder-plugin.md|rejected|review-needed|4cb9c15d69d78cfa1f3f32242222ad7a4597b979fab18d4e4eaca9a67f7f69a6|
|minion-meta/specs/2026-05-20-my-agent-homepage.md|shipped|declared-complete-not-reverified|0511dd1f888a731d071aa10176d63fe9e3d5158cba4998df826a1632285a2ae0|
|minion-meta/specs/2026-05-20-shells-golden-agents.md|superseded|supersession-target-review-needed|4672595c06e4e849d1f2bf16e8f509c5e1f6fde5eb34fa98c769e877d3a9ad0c|
|minion-meta/specs/2026-05-21-gws-cli-replaces-gog.md|shipped|declared-complete-not-reverified|aefc96a7d770cef8b5706f4d27e428c83e18b02ee986c87285e08a74bebbe480|
|minion-meta/specs/2026-05-22-document-ingestion.md|retired|retired-no-new-authority|5784d9e7d6a7258f50f378eeff0e2b7a1ece07499d7108f8b022dbfaf061c70c|
|minion-meta/specs/2026-05-22-gateway-turn-recovery.md|shipped|declared-complete-not-reverified|bc2c4595bb7372c9da4bf41c015e925fe404a1ab7befcf016ad0e0bec68ec5c4|
|minion-meta/specs/2026-05-23-meeting-agent-google-meet.md|rejected|review-needed|245ae00982fdc65a279dba18b4224c2fda2372adf21ceaca957eb93d76d025d1|
|minion-meta/specs/2026-05-24-T6-netcup-hub-rest-runbook.md|unknown|review-needed|47f95fd2ea42084d7a50b9b411a8c8d24785d1d2270cc54bee11c01390328cf9|
|minion-meta/specs/2026-05-24-unified-user-identities-design.md|shipped|declared-complete-not-reverified|d6e5c24322f8c1ab3271b91d522cce5e5724daa2b07c960feea26b2e2848a701|
|minion-meta/specs/2026-05-24-unified-user-identities-p3-wiring-plan.md|unknown|review-needed|c4d7c29a279a4450ce4e0942ec051499b75ed85fc8526361b20fc62d59a45834|
|minion-meta/specs/2026-05-24-unified-user-identities-plan.md|unknown|review-needed|8b558e1cb19f7a67a168c686cde72d2b5333a1a31ae709006c344dd2f8dffaa8|
|minion-meta/specs/2026-05-25-auth-supabase-pg-migration-design.md|shipped|declared-complete-not-reverified|4b84f6c12e2bbf990d9b9a2e606a98374c3df4090258f9408ead37eb362ca67d|
|minion-meta/specs/2026-05-25-auth-supabase-phase1-oauth-users-plan.md|unknown|review-needed|909c9937e565cd274a38bebd2376bfddafa99339cacf0597124504149af43a5b|
|minion-meta/specs/2026-05-25-auth-supabase-phase1b-hub-cutover-plan.md|unknown|review-needed|4041eb354df85be3433f66d9ae50175640f46b9c6a1e4fe1d2c84ce4271a64d1|
|minion-meta/specs/2026-05-26-auth-token-simplification.md|unknown|review-needed|dcd3de9a0aa0c354680833ec333dbc93e77b654ea63233acaff62d2251c963b6|
|minion-meta/specs/2026-05-27-gateway-dx-simplification.md|unknown|review-needed|4caeaf87880c841fd1f661c1ede9bf0059663b796f381afe8aca3e765c82b4eb|
|minion-meta/specs/2026-05-27-whatsapp-qr-pairing.md|shipped|declared-complete-not-reverified|b6dcd822dab2ed1907f27d4fb39976819d73ea94487a63250123a28241c02524|
|minion-meta/specs/2026-05-28-hub-ui-ux-consistency-recon.md|unknown|review-needed|379c39640340c63960c92f4c28a83cabebc0ac990bc1d14bbcee29fe6dd04f8b|
|minion-meta/specs/2026-05-29-flow-testrun-prod.md|unknown|review-needed|5e144e72449797f7f4e334631157855017e06820113e34edc0e36f7eba4ce27e|
|minion-meta/specs/2026-05-30-unified-prompt-tab.md|unknown|review-needed|7a35761267cb2f4122418c70f8919e4637131faa0b4b892fa149ebc0365ff056|
|minion-meta/specs/2026-06-11-gog-nuke-execution-plan.md|shipped|declared-complete-not-reverified|338af18b653bcf4da2f6cd22abd0444f274887d7771f245bca2e459dea5e7e8a|
|minion-meta/specs/2026-06-11-google-oauth-verification-packet.md|shipped|declared-complete-not-reverified|51bf527238515be0c6de2492ba5cdc2b2f74d4e2154ae91c1f18dbccbee05ec7|
|minion-meta/specs/2026-06-13-crm-plugin-recon-and-plan.md|shipped|declared-complete-not-reverified|657d483619f93687100b2f19303a8b64147b5f0120f6252bab1ce885ddfa3d36|
|minion-meta/specs/2026-06-13-gateway-monitoring-events-hooks-recon.md|unknown|review-needed|6a5bf131da8cf04f4b5977fb5e7929f1e042ceb32c925be2ef674adef689bea8|
|minion-meta/specs/2026-06-13-plugin-sdk-recon-and-improvement-report.md|unknown|review-needed|c0ce8a53dee0f9b9ab38671c33f93df78e0d136956b90e3988c09c6d38f338cf|
|minion-meta/specs/2026-06-14-plugin-ui-cdn-caching-design.md|shipped|declared-complete-not-reverified|77733ded6327e18ba83b293bb657a8c549bee836441744b7a7cf77e011ec95e6|
|minion-meta/specs/2026-06-14-workforce-org-company-bridge-design.md|shipped|declared-complete-not-reverified|40bf9159fb85c1f54c016dab5ab49470057a62658b6878b4c5e531a220038f78|
|minion-meta/specs/2026-06-15-plugin-distribution-cicd-design.md|superseded|supersession-target-review-needed|27d21388d33050b69aa5196917d0f0cfc4dd328770d517db70f84d6dc66662f0|
|minion-meta/specs/2026-06-15-shared-account-identities-design.md|shipped|declared-complete-not-reverified|e2825844f02865d34c5cebd7317047af77eed8fd3d09dc9d14fe2ef6f94b944c|
|minion-meta/specs/2026-06-19-linked-channels-config-restructure.md|rejected|review-needed|a34629bb0b373bc1b2865b257034a0c992b143df6d4505c61c2265e7e011689b|
|minion-meta/specs/2026-06-20-constructed-pipelines-voltagent-gaps.md|superseded|supersession-target-review-needed|246635417ea6dc7cf74ac5bc2d7d7a330e92253c5b2c6ae621175b248492d654|
|minion-meta/specs/2026-06-26-gateway-config-db-migration-plan.md|shipped|declared-complete-not-reverified|070aa7d3c30e0b880fe62007adb9244537c6d493ac504c7c951419bd9f363afb|
|minion-meta/specs/2026-06-29-workshop-experiments-subtabs.md|shipped|declared-complete-not-reverified|302d38276cb05d89ad4777c15dbcfd830e33f03d03ad763a83eefabcb202982d|
|minion-meta/specs/2026-06-30-turso-telemetry-audit.md|unknown|review-needed|ae2da0f3881ae8b1eb8a899ec02ff36eb6823695a6e8e6e0e83d5b7bbb89d848|
|minion-meta/specs/2026-07-02-hub-erp-agent-native-audit.md|unknown|review-needed|bc2457dc9d9c097a34c40d7be0300da08a0a26aa030db6c55226d6fbe29845b7|
|minion-meta/specs/2026-07-04-meta-business-integration.md|unknown|review-needed|9312b3ad7c65ed6861ec5af3cb059b306417b30a2dfe3eb037c57cfc9cb800ea|
|minion-meta/specs/2026-07-05-hub-hotkeys-expansion.md|shipped|declared-complete-not-reverified|7da4c4ab736dbd30d72e3fe99382f8a039d1bbc0470909e36057c8b6707c65df|
|minion-meta/specs/2026-07-05-hub-tanstack-virtual.md|unknown|review-needed|e2380be70a9af0ed63b1fd757bc1ab865cdc145f2bda53c1e5781ff5b997ebf0|
|minion-meta/specs/2026-07-05-instagram-login-integration.md|unknown|review-needed|4e89ce315c24fbed4521155c021ccac70715b00dc6bf2814ff9c53b9264b7ee8|
|minion-meta/specs/2026-07-05-meta-post-thumbnail-mirroring.md|shipped|declared-complete-not-reverified|80cbd156cfb33fa9e4ade0b6979b15806c713cfcee5aa2bb7904a1b6e4d2ce76|
|minion-meta/specs/2026-07-05-socials-rename-detail-pages.md|shipped|declared-complete-not-reverified|97336401bc509bb7dbc4d93afb30fb9cec3fcf2cf6616cd4e943b044f0cfcb3d|
|minion-meta/specs/2026-07-06-hub-tanstack-ai-assessment.md|unknown|review-needed|f77b0cc3d8171b438219ea53f6ecad455478b0477ec5d5960fd3c74cccd7482d|
|minion-meta/specs/2026-07-06-hub-tanstack-consolidated-execution.md|unknown|review-needed|0bc8b69c4057823c9e03cd1ab7f033d9440577b859fd24ed12d7189bfa3429a4|
|minion-meta/specs/2026-07-06-hub-tanstack-db-store-assessment.md|unknown|review-needed|a912e3bb2facf1a251146083b7a2b74ab2ba59deb1beaec8959eab90294d2b24|
|minion-meta/specs/2026-07-06-hub-tanstack-pacer.md|unknown|review-needed|1c75cab6f3df65c261ff558a941d37ab047033efebb68d921525fb3fbcbc1a7d|
|minion-meta/specs/2026-07-06-hub-tanstack-query.md|unknown|review-needed|8a2f5e797093d27c87a20c84edd58a4751ea30f289f8e4ab45a250b96a3a9614|
|minion-meta/specs/2026-07-07-hub-db-migration-pipeline.md|shipped|declared-complete-not-reverified|824f10316af5b79b1a1b1d421716810b254a30300676ad57aa69080e738d9c96|
|minion-meta/specs/2026-07-08-package-updates-tracking.md|unknown|review-needed|f4455ec742d42fc50e403bc5f47dc7c2c13c5c14553fac7c50d2bb2d482c7d41|
|minion-meta/specs/2026-07-09-agent-tool-scaling-architecture.md|unknown|review-needed|b61ca8b91b521a94b04f331f27739d1c23f839f12425d255aeda3ee7076528ff|
|minion-meta/specs/2026-07-10-bug-triage-workforce-agents-plan.md|unknown|review-needed|ae5c78466c299f1f734eef72eafe440fbcc086f41bcb30b37dddf7f0a73657c6|
|minion-meta/specs/2026-07-10-bug-triage-workforce-agents.md|shipped|declared-complete-not-reverified|72c0d9f790752095b4577702abd085a186da5bf747cb228e3c042ebaf6758e9d|
|minion-meta/specs/2026-07-10-gateway-update-rollout-runbook.md|unknown|review-needed|514ff6c603f0ab288e8da316e93a590aa8376e835c80e90faffe72b5ba7ff885|
|minion-meta/specs/2026-07-10-gateway-update-system-plan.md|unknown|review-needed|c97fdbe8aa625747633d0b49025df836b9599771a444c5f163a48c4d4589bc76|
|minion-meta/specs/2026-07-10-gateway-update-system.md|superseded|supersession-target-review-needed|db8d6ee223a666810501669c42d69af334e671f4ff4bf239acbc5f6cb51b77d7|
|minion-meta/specs/2026-07-10-per-org-volume-tenancy.md|shipped|declared-complete-not-reverified|ee7cdfc10d5ea42988ef2e1cc1b49c61e7ebb020ad034ee1a2488d9bf499bb9e|
|minion-meta/specs/2026-07-11-fleet-update-orchestration.md|shipped|declared-complete-not-reverified|027eb56c8708e6118bae549db1403391612076eae672bb6d79375c659e928a7c|
|minion-meta/specs/2026-07-11-hub-password-username-auth.md|shipped|declared-complete-not-reverified|1a340fec8ee5853278693b6f7a712819e5e757ac24e5d3dc24d0ce6ed536fd56|
|minion-meta/specs/2026-07-11-universal-projects-module.md|shipped|declared-complete-not-reverified|63c328efa9751c1ffbe69d9e688878ee782b23b4f76c6fa9b439e3e8c7cdb413|
|minion-meta/specs/2026-07-11-ws-failover-eager-reconnect.md|shipped|declared-complete-not-reverified|abda087d7489062c19af25c97880b725afd6d75cf8803f999cbe6d1e11c91ed4|
|minion-meta/specs/2026-07-12-agent-memory-and-chat-response-tree.md|retired|retired-no-new-authority|7e5ff70a72a21810c92bc270c6b732c7f610ec1826cf33576c121b39f25410ea|
|minion-meta/specs/2026-07-12-living-workforce-harness.md|shipped|declared-complete-not-reverified|251de57992486ee30f9b8092b77aad6c97dd671cdf503c11aee1f237a5ebbf91|
|minion-meta/specs/2026-07-13-cloud-workstations.md|unknown|review-needed|1e07316c03b3e6b4955d08ca724e72f904550296d021136a48d56248b27ec457|
|minion-meta/specs/2026-07-13-hub-design-manifesto.md|unknown|review-needed|af1c1af9e24471084f71601923ee921112bb239f8004374dce77b35c23187b15|
|minion-meta/specs/2026-07-13-hub-figma-screen-coverage-ledger.md|unknown|review-needed|33c556301577b8455436d0e92a1d04dc2739832040b55d96dd2005a9362ca258|
|minion-meta/specs/2026-07-13-hub-ui-coherence-audit.md|unknown|review-needed|b25e8ff0279397c32fe7efbb044d373497a5c67634882d55e1150a72808fedf3|
|minion-meta/specs/2026-07-13-hub-ui-coherence-execution-log.md|shipped|declared-complete-not-reverified|6d53724977851118c5710b4416e8b05d3fe69039c1ff930a58cfbe55295f8190|
|minion-meta/specs/2026-07-13-hub-ui-coherence-implementation-spec.md|shipped|declared-complete-not-reverified|fb2da55d453b660c743ff77c4e0cb4246a7ff85acc750a0cbff523050028a85a|
|minion-meta/specs/2026-07-13-minion-gateway-swarm-cutover.md|unknown|review-needed|ebbd035b9ea162d7908a95c404ecfc12e597ae3d4e481b1f8e1718bd3c135b5a|
|minion-meta/specs/2026-07-13-org-agnostic-ha-service-fabric.md|unknown|review-needed|435dbe7cff44ab6aba1d1d88f9d13e7c3676e3da5bfa4d0114c895f8afbb4438|
|minion-meta/specs/2026-07-13-runtime-aware-fleet-image-updates.md|shipped|declared-complete-not-reverified|a6990931327a46928df8d59b3abd8fe9624b036be6fb7dfc2ec2cc40a9bf6030|
|minion-meta/specs/2026-07-14-hub-figma-mcp-transfer-plan.md|unknown|review-needed|5c073ba3419f21231035a4161c19d08481df4a4627764ced69d71a75795b462f|
|minion-meta/specs/2026-07-15-ui-design-governance-hardening.md|unknown|review-needed|8a6ebe27f958127035272d980b6a9e0e6d9add92485c57e1f4e5c1ceee303535|
|minion-meta/specs/2026-07-17-crm-conversation-intelligence-spec.md|unknown|review-needed|17704eb5883bafcc640cb5b0c828e602b047a9f3aac7d1c84b82f8322fde7137|
|minion-meta/specs/2026-07-17-dashboard-kpi-popover-2step-spec.md|retired|retired-no-new-authority|3ae466db5cf5536e65c043df763c73fc6a24eb64f952e1b61d95594b8a4477c2|
|minion-meta/specs/2026-07-17-hub-performance-optimization-plan.md|unknown|review-needed|b7c745cb2d5f725fe8a48cebcf277328e43f66627c652565015544dceeba7eb8|
|minion-meta/specs/2026-07-17-ig-ad-attribution-spec.md|unknown|review-needed|7d4fdc99ae9f22d46114b11012b817e4a6e6c3da1e5e9d7718edb2fc73e60085|
|minion-meta/specs/2026-07-17-pinonite-pulse-proactivity-design.md|shipped|declared-complete-not-reverified|83d9a8707356de3726553f61b195b24cc73ef6389f327963b2e9997d275d5453|
|minion-meta/specs/2026-07-17-pulse-slice1-plan.md|unknown|review-needed|5677a1aadeb276ecd6d81a469f463ddda40c12f02932f6b336c662a16f660560|
|minion-meta/specs/2026-07-17-telemetry-cleanup-and-insights.md|unknown|review-needed|7f27fe2a57da5b060997ebe7e3504ef63a64b3ea363cae444e4bf3fea61307e8|
|minion-meta/specs/2026-07-19-build-channel-dev-prd-pipeline.md|unknown|review-needed|944a2b6f68eca26ef4494562a298676f8b94913d700926731e293830d9c6c170|
|minion-meta/specs/2026-07-19-channel-scoping-fix-plan.md|parked|review-needed|8cbeeb9b0231ca8c0b84b68b96184c872ca84bc5abd90716cd48d29231234b8e|
|minion-meta/specs/2026-07-19-channel-wizard-intent-modes.md|shipped|declared-complete-not-reverified|6400fc26b8618b7c3294b5197e2375f94978051f5feab0733895b42fe9573451|
|minion-meta/specs/2026-07-19-item-spine-composition-slice1-spec.md|shipped|declared-complete-not-reverified|73b7bff9f05da8cd8634e6c4212bfa38d1e594e027176e43df9f279befdf7d0e|
|minion-meta/specs/2026-07-19-org-kind-segregation-spec.md|shipped|declared-complete-not-reverified|ce826f0f6fb51a915ef485eaeada6bae7ebcebdead3529b113af9e9ef31ec796|
|minion-meta/specs/2026-07-19-pos-stock-split-implementation-spec.md|shipped|declared-complete-not-reverified|35c120ab7f204a7319ce73783a9cc36edd0201ae809895042fc95994499b398c|
|minion-meta/specs/2026-07-20-whatsapp-sync-status-spec.md|shipped|declared-complete-not-reverified|3442028f9fb2102d0e936f45f2a36da7cfd87f2d68bb9fbc9505b6cfb1da26df|
|minion-meta/specs/2026-07-21-unified-brains-knowledge-architecture.md|unknown|review-needed|f8b54ed772d17810a8b8d4f665884405c7921394b4c5e71dbd21599a69720124|
|minion-meta/specs/2026-07-22-hub-routing-simplification-spec.md|unknown|review-needed|3a1bbdd9a583266048e3509c68f422979489bf04505867434ed7e2876b6b170c|
|minion-meta/specs/2026-07-22-personal-org-differentiation-spec.md|unknown|review-needed|943b66e05983b6e9d8303c8890c1f0723969406775669c7d36a553dd1efa74c2|
|minion-meta/specs/2026-07-22-self-hosted-qdrant-brains-architecture.md|shipped|declared-complete-not-reverified|b6bbfca356a999cb28ec1d357abdafe28c178663c192b28b0533eef14f23d103|
|minion-meta/specs/2026-07-23-crm-relationship-graph-v2-spec.md|unknown|review-needed|09888b2c5e35d57139ec2ab90089fc9c87b76d7eaa6c34c850c9c2898c3997e4|
|minion-meta/specs/2026-07-25-faces-catalog-cleanup-report.md|shipped|declared-complete-not-reverified|14cdfa047ec64bfd10f2a094a18c82ffc30c0507d4595d3279ba68bc3115e2c6|
|minion-meta/specs/2026-07-25-nats-jetstream-event-plane-implementation-spec.md|retired|retired-with-stale-approval-body|248a4d6d394c9e9bc99909241fb5f2c6bc0b056a7e5bc8d1a4144b7695c88976|
|minion-meta/specs/2026-08-03-crm-customers-server-pagination-spec.md|superseded|supersession-target-review-needed|685bc9b66eb55478e91ae1c5174a0b040f16a42186527c554ec4d5346101f5cc|
|minion-meta/specs/2026-08-03-crm-icp-score-spec.md|approved|review-needed|ca2dd0b84899842dddad432f55da5dd19612389b01f92aa534d4a873cc36f4cc|
|minion-meta/specs/2026-08-03-crm-icp-score-spec.review.md|unspecified|supporting-artifact-review-needed|5915b2516e3f750fa4300f17eaff55f76d46c0ba8c254997d1486a80bdbc1012|
|minion-meta/specs/2026-08-03-crm-relationship-graph-v2-port-spec.md|shipped|declared-complete-not-reverified|2fe484e2da54b8af823fd0b5f5b4491e341cbc90776bdc26335bc70c4ab09116|
|minion-meta/specs/2026-08-07-projects-github-repos-and-factory-gates-spec.md|retired|retired-no-new-authority|ecb7a919eb42fb7eca9e7474931ca18167c2344ab850abb8f151b09a85965bbb|
|minion-meta/specs/2026-08-12-minion-base-lifecycle-dashboard.md|unknown|review-needed|ce9182e9199c3d73558c0515e1a8541cdc2ad898a1dd96eb7541d9d55250c8c0|
|minion-meta/specs/2026-08-12-minion-base-v2-sdlc-kanban-spec.md|shipped|declared-complete-not-reverified|31a6df4328ba2379774cbd3247ae720b5b102543d40305375db4fa4d8658b21a|
|minion-meta/specs/2026-08-12-minion-factory-agent-pipeline-spec.md|shipped|declared-complete-not-reverified|9b81f4b47d8aede53b3d219ff9294a920bb91b8d3a025899127b8dbf0f3c3120|
|minion-meta/specs/2026-08-13-agentic-sdlc-test-quality-gates-spec.md|shipped|declared-complete-not-reverified|8219ed2bc912c44dc3927e63858d7e4f79dcefcc0903a345e5cd24d7307bf6b2|
|minion-meta/specs/2026-08-13-ci-minion-site-ci-spec.md|done|declared-complete-not-reverified|c16e86b88c45e74a1c24c354bc57a79a9ff50b4edd3e4391ef3320778f1abb5b|
|minion-meta/specs/2026-08-13-ci-minion-site-ci-spec.review.md|unspecified|supporting-artifact-review-needed|6c16fcf903837d4654bb06a56957783e248d5aa3e073fbbdcaa0f2f350bb5ad4|
|minion-meta/specs/2026-08-13-crm-customers-server-pagination-spec.md|implementing|review-needed|48748b49d14fdbd8f88b888fa78d3786d40559effd7f0b3cf2ea59aa044c96ea|
|minion-meta/specs/2026-08-13-crm-customers-server-pagination-spec.review.md|unspecified|supporting-artifact-review-needed|65489700ca3be713609659ad9bfb4be5416a030920209743dae3cd23e3a096ae|
|minion-meta/specs/2026-08-13-minion-base-kanban-auto-refresh-spec.md|shipped|declared-complete-not-reverified|e9083a476861252f8f2556753392bac00e969855f7d3f55766c21593f4f5308f|
|minion-meta/specs/2026-08-13-minion-base-kanban-auto-refresh-spec.review.md|unspecified|supporting-artifact-review-needed|2d999a9bd2ad2516e331f4ab1edab4bd2a7bde5d3cc0ab074ad0a7c3b004c7b4|
|minion-meta/specs/2026-08-13-minion-factory-staged-harness-spec.md|shipped|declared-complete-not-reverified|e2f13b377efda6fb3ff06053fd492a8e82490aff49156aa31842a7032131ae53|
|minion-meta/specs/2026-08-13-request-to-deploy-sdlc-pipeline-spec.md|shipped|declared-complete-not-reverified|5c7843b9fc84cd8fec963d59a6e8cc8125645b7047058cc93340021fedabf836|
|minion-meta/specs/2026-08-14-pos-payment-methods-config-spec.md|shipped|declared-complete-not-reverified|d149452e0b7d409aefded47478c41621d1203b6b865ef38fab7b71c93839508b|
|minion-meta/specs/2026-08-14-pos-shadow-emission-spec.md|shipped|declared-complete-not-reverified|e36d6d8f2bfe9c45825826345936ec9085cee0eb8873905d5cdc0f6a70905b70|
|minion-meta/specs/2026-08-14-purchases-rce-module-spec.md|shipped|declared-complete-not-reverified|c199ed796f082edb36a540b40202359224bc00d4011cd2b2938c94094fa7e88f|
|minion-meta/specs/2026-08-14-sunat-emission-beta-spec.md|shipped|declared-complete-not-reverified|45cc038bcb17efede3ee6dc413443742c882a7e50881067cc95b8e62c66290bc|
|minion-meta/specs/2026-08-14-sunat-resumen-baja-spec.md|shipped|declared-complete-not-reverified|31f0ea3b3b37c16150973303c29b603e165997a801efc6ef94f6db9c272849cc|
|minion-meta/specs/2026-08-14-sunat-source-ui-spec.md|shipped|declared-complete-not-reverified|ef47c637c3e2672e427b68a346019226e3478a2254fd42289c010f911c99861c|
|minion-meta/specs/2026-08-17-base-deploy-status-branch-filter-spec.md|shipped|declared-complete-not-reverified|2a20d54235943a7599e2b8b94853c230337397053e89bbc87d2e56ee8ba58b84|
|minion-meta/specs/2026-08-17-base-deploy-status-branch-filter-spec.review.md|unspecified|supporting-artifact-review-needed|0da783df1ff3fe9357abfc0c6361fb4c03c5c48512d65aa26d98d945c8ca8820|
|minion-meta/specs/2026-08-17-cloud-agent-memory-sync-spec.md|done|declared-complete-not-reverified|fe97e298ca465aee0d0489c9198afda91c2cf3b32a13f67a35a3773e327dd471|
|minion-meta/specs/2026-08-17-factory-agent-cli-unpinned-spec.md|shipped|declared-complete-not-reverified|293f6f721af49f97afe6baa3fd5b5e61377afc25322a2fe1c31f4c10e251a400|
|minion-meta/specs/2026-08-17-factory-agent-cli-unpinned-spec.review.md|unspecified|supporting-artifact-review-needed|4acc5d137d38f1bba47e11d029630083e69433034c5a1bcb33cac2f361faa3fb|
|minion-meta/specs/2026-08-17-factory-chat-restart-drops-pending-spec.md|shipped|declared-complete-not-reverified|1663ab5a638408a765060afc555f3b84f2580de7bc807c3549d65a2a5655e41a|
|minion-meta/specs/2026-08-17-factory-chat-restart-drops-pending-spec.review.md|unspecified|supporting-artifact-review-needed|76ab6fb0a61a63f5a09d5aee45a02e48a014aedbc7e0b42106ee4c06430827f3|
|minion-meta/specs/2026-08-17-factory-compose-tailnet-hardcode-spec.md|shipped|declared-complete-not-reverified|b49cdfda620783b65c75f7b10c7119c78dfec9005f74051ad0aa6737b21cdd7c|
|minion-meta/specs/2026-08-17-factory-compose-tailnet-hardcode-spec.review.md|unspecified|supporting-artifact-review-needed|3a61ed7f0f9180a7ccf3eb92d0aa3978003d0b1f5b36631c86c6ad9925679852|
|minion-meta/specs/2026-08-17-factory-providers-put-harness-check-spec.md|done|declared-complete-not-reverified|f7e6b15a3e089e4389e95c0c81622acc8a95ead9ce3eebf7c026bd7a19c7e496|
|minion-meta/specs/2026-08-17-factory-providers-put-harness-check-spec.review.md|unspecified|supporting-artifact-review-needed|f176d226ed86fe5439d9f5b97128f5d62242e72a0132ff2b34779eb032b1f0b6|
|minion-meta/specs/2026-08-17-factory-token-budget-governance-spec.md|implementing|review-needed|03778397807f254ac7edfb60fdabef607492eeed68bc367327c7faa473649fde|
|minion-meta/specs/2026-08-17-gw-defaces-crm-tools-spec.md|implementing|review-needed|4431f6f3048dd6f9b16e5ddf8939c6adc9d4ae2f2b929b2807223f39820937d7|
|minion-meta/specs/2026-08-17-gw-defaces-crm-tools-spec.review.md|unspecified|supporting-artifact-review-needed|88c8e8aad1dc0e7db4f0e409664bee5ad71289b3eb123d39f76c37edf20a215b|
|minion-meta/specs/2026-08-17-gw-msteams-large-upload-spec.md|draft|review-needed|8aa61f5a05bdae1aaf392a690a55c838b8f35de4d3146c516e19777bd13d0166|
|minion-meta/specs/2026-08-17-gw-msteams-large-upload-spec.review.md|unspecified|supporting-artifact-review-needed|28fdfe83163f99b40b8913e27d598d2e7cba636073c18cc78d53741413cd141d|
|minion-meta/specs/2026-08-17-gw-nextcloud-talk-dm-misclassified-spec.md|done|declared-complete-not-reverified|8f9451b0920375e21fe0a738877e8b869db5744e50c7d971528ccba1cfcd452f|
|minion-meta/specs/2026-08-17-gw-nextcloud-talk-dm-misclassified-spec.review.md|unspecified|supporting-artifact-review-needed|7843b6dd306af895dbd4391abdaa4fa60fa0d93c3bd5e07c59687a27b21cd4a6|
|minion-meta/specs/2026-08-17-gw-nostr-dispatch-pipeline-spec.md|implementing|review-needed|9061ff23a908a0d724bd0c231afc6c1af74c7ec5a712de84595d7f836595aa11|
|minion-meta/specs/2026-08-17-gw-nostr-dispatch-pipeline-spec.review.md|unspecified|supporting-artifact-review-needed|f5c478ec85065399405cf201e528326524ac61ef47896940d80e460ab947268b|
|minion-meta/specs/2026-08-17-gw-shells-lifecycle-stubs-spec.md|approved|review-needed|18ca54d566b0221cea74bb5302b9728a483d46895fd41e11f09f367d4e340d25|
|minion-meta/specs/2026-08-17-gw-shells-lifecycle-stubs-spec.review.md|unspecified|supporting-artifact-review-needed|97f17502e2e51a05e5e30962807fda5c199149ed24df594e035e963e7439bba2|
|minion-meta/specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.md|implementing|review-needed|a214d37060ec3329ef2244bdd625ceb3ec6d8391d93b0c530a091c3aebb83ee6|
|minion-meta/specs/2026-08-17-gw-whatsapp-cloud-template-fallback-spec.review.md|unspecified|supporting-artifact-review-needed|5970d0c75e70882293f00b88f61ed373a6546e8002ad670d0256d924338201b0|
|minion-meta/specs/2026-08-17-hub-brain-org-all-scope-spec.md|implementing|review-needed|cd8a2fb7af7afb8b4e50436af689aedc802dc4cc6c44b937ba53751ba5153c7f|
|minion-meta/specs/2026-08-17-hub-brain-org-all-scope-spec.review.md|unspecified|supporting-artifact-review-needed|2af5cc11dce753525b4916602d2e5c77a75e3b144e8d33bff0bee23e119d617b|
|minion-meta/specs/2026-08-17-hub-dead-mirrors-cleanup-spec.md|implementing|review-needed|f7b2536664e8afd3fcf478d5017c8136f6a512a8ad98437574a1282f0d1f2903|
|minion-meta/specs/2026-08-17-hub-dead-mirrors-cleanup-spec.review.md|unspecified|supporting-artifact-review-needed|b10440bfc19585d00bef7a5c1b91ea6db3aa45ae3e9b400aca08f1ce668023ad|
|minion-meta/specs/2026-08-17-hub-distinct-visit-dates-spec.md|draft|review-needed|5d463ad1736b43a0b5708aced9cff6976c899b3892a4c28bae8934d6c432ab06|
|minion-meta/specs/2026-08-17-hub-distinct-visit-dates-spec.review.md|unspecified|supporting-artifact-review-needed|144c13da2daee9db5499922df5f82a82694e9037cb69f5333f92ddc4e4519d7c|
|minion-meta/specs/2026-08-17-hub-igv-rate-from-org-config-spec.md|implementing|review-needed|59877ecbe05ffa9fcc68450109e7110042eb599dab59fc88033b2733ca15ae02|
|minion-meta/specs/2026-08-17-hub-igv-rate-from-org-config-spec.review.md|unspecified|supporting-artifact-review-needed|0624b042fe857357dba59aa60f9fc36ee656be485f9dffb4d4f82752b3f25a24|
|minion-meta/specs/2026-08-17-hub-personal-agent-entrypoint-test-spec.md|done|declared-complete-not-reverified|fd0579da3cebf049c3d61a66faea1d9e47d521a3ab6ba0e664534d1c9d7d833e|
|minion-meta/specs/2026-08-17-hub-personal-agent-entrypoint-test-spec.review.md|unspecified|supporting-artifact-review-needed|1c26d9d8afca42c17af7cd66a8645851c4e472f7b068c0946294357fd67d1d3f|
|minion-meta/specs/2026-08-17-hub-pos-appointments-fork-spec.md|implementing|review-needed|1ee0da4e4772f85c812b89e4f4db334e001dfef3152d27b370dc430723009ef4|
|minion-meta/specs/2026-08-17-hub-pos-appointments-fork-spec.review.md|unspecified|supporting-artifact-review-needed|a45b84954a3c10da7f672814d35f7e5e8f747791601ed168d1c938d7c9eaa725|
|minion-meta/specs/2026-08-17-hub-reserva-keyword-config-spec.md|implementing|review-needed|5245c21040d8b251752cc0f7588bf4df13d8c827ca132415881071b6d8261d73|
|minion-meta/specs/2026-08-17-hub-reserva-keyword-config-spec.review.md|unspecified|supporting-artifact-review-needed|ec975d0699c80fbd5e0ae7ca01ee07d399100b5ae8c320d9884b8f6258e864b3|
|minion-meta/specs/2026-08-17-hub-updatesellable-silent-drop-spec.md|done|declared-complete-not-reverified|a92d5778751016d672e0c1dd325ed33eb558739ee5cf635f2278b0accd53b8cd|
|minion-meta/specs/2026-08-17-hub-updatesellable-silent-drop-spec.review.md|unspecified|supporting-artifact-review-needed|8ffe86eef164d3659b5f193cb5da4b408a836156604733ce489524904865b68d|
|minion-meta/specs/2026-08-17-maintenance-lane-monitors-spec.md|implementing|review-needed|02f404004af66883211ce99b0985a218f9e60e301bb0fbde46fe4a055ba97d38|
|minion-meta/specs/2026-08-17-pkg-dev-crypto-failopen-spec.md|approved|review-needed|471b5737f0bbb21cba3a794b23bf16ba28d45758f132b980c9ceaf4652a4001d|
|minion-meta/specs/2026-08-17-pkg-dev-crypto-failopen-spec.review.md|unspecified|supporting-artifact-review-needed|6e58a83631ae5cc743be13cadefc4f1e2d38d2c2cfc8741686085206ad3761f4|
|minion-meta/specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.md|merged|review-needed|c1e01dce273d88f58dc663a2c35e85464e3272c4bc942700f3f237ff1c83b900|
|minion-meta/specs/2026-08-17-pkg-gateway-client-onevent-errors-spec.review.md|unspecified|supporting-artifact-review-needed|5fbcb38b06567fab937591bff4bd8421659ece04c803b25bff5f0b94b521ff92|
|minion-meta/specs/2026-08-17-pkg-infisical-cache-plaintext-spec.md|implementing|review-needed|30df1a3f53a2ddbd3a66d57dca7083ae4c787ab8aa75639c9ea786c6b5d7c581|
|minion-meta/specs/2026-08-17-pkg-infisical-cache-plaintext-spec.review.md|unspecified|supporting-artifact-review-needed|16b5b0d637458fd68daabda43ee502369accea57d4b45823345a37d8ddc13795|
|minion-meta/specs/2026-08-17-pkg-workforce-client-json-error-spec.md|done|declared-complete-not-reverified|ab294d1852971e82625d58b45f7c4aff9faf86031f3cd37527dccf250a497683|
|minion-meta/specs/2026-08-17-pkg-workforce-client-json-error-spec.review.md|unspecified|supporting-artifact-review-needed|ba0d07066b4f144103dc7bbe70697e51b455cf395c072c2efdfd9102aeba087e|
|minion-meta/specs/2026-08-17-sdlc-phase-gates-scoring-spec.md|approved|review-needed|7464ce0bbe97d4a6a44142c5d986606d14be8661bd9fc4f97072a48e46fa28f8|
|minion-meta/specs/2026-08-17-site-device-identity-role-escalation-spec.md|review|review-needed|1cd37ef8e131572ea52d7a90f744f4bc1da78bb0f0f97a07ce23234f411830d3|
|minion-meta/specs/2026-08-17-site-device-identity-role-escalation-spec.review.md|unspecified|supporting-artifact-review-needed|fba4804651ab962fe729e0fb7e10c965fc7a9ab459dbed1a885121ecbda09172|
|minion-meta/specs/2026-08-17-site-member-gateway-swallowed-errors-spec.md|done|declared-complete-not-reverified|856678b4553400c129f514216562bf7f8e343417d061724318f6f9e9f509915d|
|minion-meta/specs/2026-08-17-site-member-gateway-swallowed-errors-spec.review.md|unspecified|supporting-artifact-review-needed|af70c8c73d3dbe72f8bb83c331851c051384ad72a82c9c472c7c778036d5c6ad|
|minion-meta/specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.md|approved|review-needed|5a2381fcdf69209abb167fdb904b6917b146bb7c150692717645e9f891710c24|
|minion-meta/specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.review.md|unspecified|supporting-artifact-review-needed|4c4093127bd06e6697bcae8506b65f0370884a5a5bd762258f463d5f55c68c50|
|minion-meta/specs/2026-08-18-base-attention-queue-responsive-runs-spec.md|approved|review-needed|a8dccb4daceacef56415e34ee7f2058436b1fecfe22b61826f6c52205ebba0ba|
|minion-meta/specs/2026-08-18-base-attention-queue-responsive-runs-spec.review.md|unspecified|supporting-artifact-review-needed|1f27ee26d444f70cc8c4358600cfd4cd140afffc2babb91796a9ff92ed6fe17b|
|minion-meta/specs/2026-08-18-base-kanban-possibly-shipped-surface-spec.md|done|declared-complete-not-reverified|7d388a0d9d7c2d0747ac4f959e8d3d947d1e78a54d6829909583c92ab9fc802b|
|minion-meta/specs/2026-08-18-base-kanban-possibly-shipped-surface-spec.review.md|unspecified|supporting-artifact-review-needed|21eef6ec3dfc4ad8ec3ee02abbf6e5cdfce36d40fcd9b09e8da48d4c6478593a|
|minion-meta/specs/2026-08-18-base-phase-aware-sorting-provenance.md|shipped|declared-complete-not-reverified|d5a276cc881e1edec6fb1abf45c216021e0a37c5270508912c8727d4a84c7845|
|minion-meta/specs/2026-08-18-base-ui-primitives-and-shell-spec.md|done|declared-complete-not-reverified|a292ba9c8a9c4e00fd66d3a04af5f1fae88828c0cc20c58f1e05f5c2355280a0|
|minion-meta/specs/2026-08-18-base-ui-primitives-and-shell-spec.review.md|unspecified|supporting-artifact-review-needed|29e8d28e6aeed66a7138298b2b85542d18f48e9d49847b6516a632aba1439228|
|minion-meta/specs/2026-08-18-base-workdetail-summary-first-spec.md|done|declared-complete-not-reverified|2cb12712d3977cf59bb5320d57f28041deaa7c3c512a61ddf5f388d0845b03dc|
|minion-meta/specs/2026-08-18-base-workdetail-summary-first-spec.review.md|unspecified|supporting-artifact-review-needed|2f1a860fbfb4dc1921512168db5157e3f722d750663e63d47ad0b01641e66663|
|minion-meta/specs/2026-08-18-ci-minion-ai-ci-spec.md|done|declared-complete-not-reverified|d29a8277bc211822be9ebc1f03f2bec791e259c337392bd2955037a4869a272f|
|minion-meta/specs/2026-08-18-ci-minion-ai-ci-spec.review.md|unspecified|supporting-artifact-review-needed|e648c21bd5330e1ea83c007c2bd49f834e6dfad85caf1cab5fcf8895e4d92e59|
|minion-meta/specs/2026-08-18-ci-minion-ai-deploy-gateway-devprd-channels-spec.md|done|declared-complete-not-reverified|4c79c4690ff4a23a1393808305c9e405b199172087a86bac008982a991ab30de|
|minion-meta/specs/2026-08-18-ci-minion-ai-deploy-gateway-devprd-channels-spec.review.md|unspecified|supporting-artifact-review-needed|2d5ab479cca7cdb26b6642d868570e44fdebc13c8d4ffbd0572e95b0ea2034c5|
|minion-meta/specs/2026-08-18-factory-capability-separation-spec.md|draft|review-needed|32a93621bd22c89167d08b4b3b1fdad5def21f1cb7c0567dd48e18ed998fe66e|
|minion-meta/specs/2026-08-18-factory-capability-separation-spec.review.md|unspecified|supporting-artifact-review-needed|50b2d7b35c40d0f5d6af6bb2156eb673a855f8aa56eaca4a15c890767ac6567a|
|minion-meta/specs/2026-08-18-factory-controller-completion-invariants.md|shipped|declared-complete-not-reverified|c9b140665ad3baaed516ea72c23bf20f92cd1860d825b918510aa378d64aca1b|
|minion-meta/specs/2026-08-18-factory-deterministic-unstick-spec.md|done|declared-complete-not-reverified|3222eb37261992875fd5de04d20b4e26d52a9478232f0e3337027982e3e54536|
|minion-meta/specs/2026-08-18-factory-deterministic-unstick-spec.review.md|unspecified|supporting-artifact-review-needed|a58cab1cbb2b779b924cde8c6c78aa6bc9b077b54bbc601163f4fca711783b92|
|minion-meta/specs/2026-08-18-factory-durable-state-outbox-spec.md|implementing|review-needed|9c6077f2e7558e7f7e036bb936dab4c0946866bf5394f269e4aac85e2ff3c2cc|
|minion-meta/specs/2026-08-18-factory-durable-state-outbox-spec.review.md|unspecified|supporting-artifact-review-needed|f12ec7949d436ab1d36d76872a1ea813f665e2ca24e6a935345a72025eae116d|
|minion-meta/specs/2026-08-18-factory-m0-safety-foundation-spec.md|implementing|review-needed|6adbf4b442e615274c11103b6abd924eccf16ea72d37dc96c5ec7e636374f422|
|minion-meta/specs/2026-08-18-factory-memory-governance-spec.md|approved|review-needed|b47e7ff63b0062d54543b406340d005f1c9bd31608af52646a0c1c2e882d0931|
|minion-meta/specs/2026-08-18-factory-memory-governance-spec.review.md|unspecified|supporting-artifact-review-needed|63795887c4dcadbab69b1e8873e44ebaa6c597112f96d1c15fac6ffc1abc127c|
|minion-meta/specs/2026-08-18-factory-orchestration-round7-spec.md|draft|review-needed|d92e9bc346b142314b6ee5e7cc70d6b22f57edd129a85c93d0c0b66ef58b4d2a|
|minion-meta/specs/2026-08-18-factory-orchestration-round7-spec.review.md|unspecified|supporting-artifact-review-needed|9c708f315388e56c53a92f1ce185110c3a2c55d3839ca547fcdabb59e43f9852|
|minion-meta/specs/2026-08-18-factory-orchestration-tests-spec.md|shipped|declared-complete-not-reverified|1067ae1151e7d36bf51ef8494abe005d4e2f91686c44bda665f085bcaad4a35d|
|minion-meta/specs/2026-08-18-factory-orchestration-tests-spec.review.md|unspecified|supporting-artifact-review-needed|eff167ece2accfc7b3a4901e102730578bb851764407af8aa77877b74295bd3f|
|minion-meta/specs/2026-08-18-factory-postmerge-discovery-loop-spec.md|done|declared-complete-not-reverified|e21a178f28cffe5678639d5810369923123884b4c9eea8f79271983746b6d495|
|minion-meta/specs/2026-08-18-factory-postmerge-discovery-loop-spec.review.md|unspecified|supporting-artifact-review-needed|9e3de078713016ae15c0f4aebeedee72306e77ee05c8c2d03d3348cf806fca00|
|minion-meta/specs/2026-08-18-factory-release-rollback-spec.md|shipped|declared-complete-not-reverified|707cbc6c034f86df6844b246b2c57e16b0e485d8cc7b4b392603247c7170e8aa|
|minion-meta/specs/2026-08-18-factory-release-rollback-spec.review.md|unspecified|supporting-artifact-review-needed|303d49d7849bcebbcb6dfd96341f0eef66048484a7535c358fe519c294f4f616|
|minion-meta/specs/2026-08-18-factory-topic-capability-manifest-spec.md|shipped|declared-complete-not-reverified|71c22d7c602823c9faaaecfc5d205653e7d30a030e877498c5574f5ed13948b5|
|minion-meta/specs/2026-08-18-factory-topic-capability-manifest-spec.review.md|unspecified|supporting-artifact-review-needed|b206892eb9e231bf3f1f9f3e8295df2238f416e8bedd77415c14100b35e756a5|
|minion-meta/specs/2026-08-18-factory-worker-containment-spec.md|approved|review-needed|9fd88a43cabe9312e7a275bd479a61bc79ec90a332a834c7c4d848c81fc90eb9|
|minion-meta/specs/2026-08-18-factory-worker-containment-spec.review.md|unspecified|supporting-artifact-review-needed|75edbe45b1c8af8066f8ef31cf6a5a4b61c695605eaec41dab8071677c212787|
|minion-meta/specs/2026-08-18-factory-workitem-handoff-schema-spec.md|approved|review-needed|798fc0311c49dc8970d6c667d52e4b69eafa3e88bfe729e567b001bb0d309887|
|minion-meta/specs/2026-08-18-factory-workitem-handoff-schema-spec.review.md|unspecified|supporting-artifact-review-needed|d1584445460cefa0b60825172fdaa54deb45a6b74c974b77bc36af99ad29ff31|
|minion-meta/specs/2026-08-18-hub-funnel-atomic-write-spec.md|shipped|declared-complete-not-reverified|75d220a11bcc0a608acff32953c9700b9b9fedb7a0d3eb42e30fd4928eb29d23|
|minion-meta/specs/2026-08-18-hub-funnel-atomic-write-spec.review.md|unspecified|supporting-artifact-review-needed|008bf5a9e705132f4be88410fa0c1ba5fec03a504a5ff714d4fddc34832accb3|
|minion-meta/specs/2026-08-18-hub-updateserver-tenant-scope-spec.md|approved|review-needed|1d66e20cad4653ed1eb65502561954f61adfb0b068fa4d8c7bf610fbe0cae332|
|minion-meta/specs/2026-08-18-hub-updateserver-tenant-scope-spec.review.md|unspecified|supporting-artifact-review-needed|ef86f15a4488d00e582e2216c9f143ff26051c588a5a62223ee0c7e5107faf70|
|minion-meta/specs/2026-08-18-meta-spec-index-project-possibly-shipped-spec.md|shipped|declared-complete-not-reverified|7ae1802888556efd1e05fc06a958858a6b9826c33752e05e28d743cffec28cda|
|minion-meta/specs/2026-08-18-meta-spec-index-project-possibly-shipped-spec.review.md|unspecified|supporting-artifact-review-needed|7061896fe267cfe4cbb453b2a26dd8c2193b8048de616d26be57405f8a45bd6b|
|minion-meta/specs/2026-08-18-minion-base-mobile-hitl-ux-plan.md|approved|review-needed|fa41d6ee4c7edeac26a5a8c377f28abf2267b5472d1e122a5ad3292afe70b0ce|
|minion-meta/specs/2026-08-18-pipeline-stats-provenance.md|shipped|declared-complete-not-reverified|c5872c83e7abc8dd9aebf2da50c10b66c10caa008555bbe03b4890e08ea6d836|
|minion-meta/specs/2026-08-18-sdlc-transformation-roadmap.md|approved|review-needed|066aae11a9cdf404ee7b8d177ab56357eb7941e1dd5be8565a9f1992fc56aec1|
|minion-meta/specs/2026-08-18-site-vendored-tgz-untracked-spec.md|done|declared-complete-not-reverified|117f89dd5a52a86cfeb01ca32ed315040021dfe667d76d540ec4e8ae986de227|
|minion-meta/specs/2026-08-18-site-vendored-tgz-untracked-spec.review.md|unspecified|supporting-artifact-review-needed|3561b0f8d322bb3cf0cd81b604a6999b70ff109add07d2b4b790463da37dc495|
|minion-meta/specs/2026-08-19-gateway-client-error-hook-consumer-adoption-spec.md|approved|review-needed|ff333773804b74a83bceff3f328dad553adc6d07b3e876bd9df1b0311c582d6e|
|minion-meta/specs/2026-08-19-gateway-client-error-hook-consumer-adoption-spec.review.md|unspecified|supporting-artifact-review-needed|faac24a9425973bb55645ede8a124cee8b2585bd32c5636c9d08abc1fe8766cc|
|minion-meta/specs/2026-08-19-gateway-client-lifecycle-swallows-handoff-spec.md|shipped|declared-complete-not-reverified|6caeb998f1eb186aa4254fe442953cd08cc1f81b8cbe436da5521b631e6d7900|
|minion-meta/specs/2026-08-19-gateway-client-lifecycle-swallows-handoff-spec.review.md|unspecified|supporting-artifact-review-needed|ebbf9feb945a138bff908a34627b5a56a7406a8b2fd2f228e79a12ba9ab84393|
|minion-meta/specs/2026-08-20-handoff-minion-factory-1487584490-spec.md|shipped|declared-complete-not-reverified|bac3e84a83fc87592bdc2761da1a96b7e84bdcf2cee89abc62eef5a506efb793|
|minion-meta/specs/2026-08-20-handoff-minion-factory-1487584490-spec.review.md|unspecified|supporting-artifact-review-needed|fdbdb4e813cf076ef5c7da561b6800e2d4fd7841059a67fd23e18b43b0818ebe|
|minion-meta/specs/2026-08-20-handoff-minion-hub-1323254565-spec.md|done|declared-complete-not-reverified|f9a8fde9bb6fdcac01500e232df1c9101e81594480bfebeeee51088e708c046e|
|minion-meta/specs/2026-08-20-handoff-minion-hub-1323254565-spec.review.md|unspecified|supporting-artifact-review-needed|846603960d584f8b7416f752c0d6bdd6484b18a6af7e08c1d7f4064ef9473d27|
|minion-meta/specs/2026-08-20-handoff-minion-hub-2131866440-spec.md|shipped|declared-complete-not-reverified|4e3ab209513a647ea1e48ff28eb4e58d39d20b4a848a26693be8ac7f970e22c2|
|minion-meta/specs/2026-08-20-handoff-minion-hub-2131866440-spec.review.md|unspecified|supporting-artifact-review-needed|907a7553f32bb10c06852772aa2704ace23ad87a6fc8ead7bfb679e113338a77|
|minion-meta/specs/2026-08-20-handoff-minion-hub-2785164896-spec.md|shipped|declared-complete-not-reverified|a826fe3370af6d47d2ea767e8fb0600b53b85f94f59ea9d59934839bf439b01a|
|minion-meta/specs/2026-08-20-handoff-minion-hub-2785164896-spec.review.md|unspecified|supporting-artifact-review-needed|589c622a44d929aba10c2c7374f0253befe436b98d24cb2d78404ce07ba8f10b|
|minion-meta/specs/2026-08-20-handoff-minion-hub-3530856808-spec.md|approved|review-needed|1bf0e6568edac7fb56a6a8f80b43d472984e1e37d5106cbdb5376f5d1f67a787|
|minion-meta/specs/2026-08-20-handoff-minion-hub-3530856808-spec.review.md|unspecified|supporting-artifact-review-needed|372504f47c4ca99aed68a62ebe01b81cacb203d195bc7081e1b75f6912b343e0|
|minion-meta/specs/2026-08-20-handoff-minion-hub-3998033254-spec.md|shipped|declared-complete-not-reverified|16b2dd809e938270c4ff95041fccfaecc3bed11d8f0aefb97577e2caec722623|
|minion-meta/specs/2026-08-20-handoff-minion-hub-3998033254-spec.review.md|unspecified|supporting-artifact-review-needed|836b0e46f9f6257acf6924a9e638c1b9f8cda4d3e1dd63ce6bae0c8789be172a|
|minion-meta/specs/2026-08-20-handoff-minion-hub-902723699-spec.md|implementing|review-needed|590abf2a5e88e9734d3d838677e7aceb2badc4d8164b33b928ff90a603fef3d3|
|minion-meta/specs/2026-08-20-handoff-minion-hub-902723699-spec.review.md|unspecified|supporting-artifact-review-needed|632324c0083e31446b8540612e6922d65e50de600119d9d91dd61c6a64e85ca6|
|minion-meta/specs/2026-08-20-handoff-minion-meta-3518589653-spec.md|done|declared-complete-not-reverified|9d05614b1ec03a6ea4a5706ad37f79f35d417ea0c3d816cb3ed49ac172e5a392|
|minion-meta/specs/2026-08-20-handoff-minion-meta-3518589653-spec.review.md|unspecified|supporting-artifact-review-needed|11de2337ef8f39ad9d6fb819847554fe65f791ce6e1c564d50c1ae8af0a46ff5|
|minion-meta/specs/2026-08-21-handoff-minion-ai-4278431509-spec.md|shipped|declared-complete-not-reverified|6037e6c8366f6f1a023951132ef035b2e160b25074e7c878a5db37b10105ccf2|
|minion-meta/specs/2026-08-21-handoff-minion-ai-4278431509-spec.review.md|unspecified|supporting-artifact-review-needed|5573ac2630972afedfddc98c539ace159a6170d5e41e70cce9f933f6413bc212|
|minion-meta/specs/2026-08-21-hub-datatable-server-mode-test-gap-spec.md|approved|review-needed|9d937fbe228a76db08181a04fe0528c6860aef94c83b525b094b78c2f29426e8|
|minion-meta/specs/2026-08-21-hub-datatable-server-mode-test-gap-spec.review.md|unspecified|supporting-artifact-review-needed|d8532b811a761d9392ded2a1cc54a910f00335d96b879c25939536ae047810cb|
|minion-meta/specs/2026-08-22-factory-dev-staging-daily-production-promotion-spec.md|review|review-needed|4dd662d8feb874d2bfcb971a46d09ad1495f7a6e3d61d4c5a87054b03907e8bc|
|minion-meta/specs/2026-08-22-factory-lineage-orchestrator-instance-spec.md|implementing|review-needed|cd91c6281f62bad06120828b39badaba1deec8dc9dbe0c08608c654e278b441a|
|minion-meta/specs/2026-08-22-hub-load-nav-performance-spec.md|draft|review-needed|5d830efd05f9a6b7dfc7c57f9a819aaa8dbac3622f825521552bcc75cf4bad8d|
|minion-meta/specs/2026-08-23-hub-stock-crm-ux-consolidation-spec.md|done|declared-complete-not-reverified|7505e7c70de8000f05a1042036273f773a28fef5f39ade88546f6577a66e86b4|
|minion-meta/specs/2026-08-26-spec-heading-lint-baseline-backfill-spec.md|draft|review-needed|fe3326c3cdc9323150d60cbfc9afcd0038e331268757839f2bbe46a52d4c8aa4|
|minion-meta/specs/2026-08-26-spec-heading-lint-baseline-backfill-spec.review.md|unspecified|supporting-artifact-review-needed|b3e59556ffc89454af7c1f140f4ec2879f67be9db142f1fa608269f53d614969|
|minion-meta/specs/2026-08-28-factory-board-audit.review.md|unspecified|supporting-artifact-review-needed|dbef099a93386c289f36cfcfe4d5b88c56c23c202a87aeae8e99a22567a38e2b|
|minion-meta/specs/2026-08-28-factory-browser-verification-stage-spec.md|draft|review-needed|cf5dafec2fd0ec23932c232340b5def48d7bfdbe4bf41744bb10ff0caeafffcb|
|minion-meta/specs/2026-08-28-factory-browser-verification-stage-spec.review.md|unspecified|supporting-artifact-review-needed|019f036bc01943908533820bec18838d754e398b37e8acfa0e2a216075232b77|
|minion-meta/specs/2026-08-28-factory-containment-base-reconciliation-spec.md|approved|review-needed|aa675534193cf157b9ed86ea62b943ae0f7b720efc482092759a56aee052658a|
|minion-meta/specs/2026-08-28-factory-containment-base-reconciliation-spec.review.md|unspecified|supporting-artifact-review-needed|ecfe15ebf00e4acc814181a025b6f9da772b3dea88c12a3464d1470222281e3e|
|minion-meta/specs/2026-08-28-factory-g0-ci-watch-auto-close-spec.md|shipped|declared-complete-not-reverified|69e8557baf91782ca84fe27253a36ac3742f47626f938e467c80e3db4b3fde21|
|minion-meta/specs/2026-08-28-factory-g0-ci-watch-auto-close-spec.review.md|unspecified|supporting-artifact-review-needed|d4f776ac4852cf7119176ca45a43c90b655579a404aff51e6492fe63313bb2ed|
|minion-meta/specs/2026-08-28-postmerge-minion-hub-6c679768db21-spec.md|shipped|declared-complete-not-reverified|722e01c056165b33de6cc9a90b943ffd1275370399885ad8d26261c173392c17|
|minion-meta/specs/2026-08-28-postmerge-minion-hub-6c679768db21-spec.review.md|unspecified|supporting-artifact-review-needed|e76d89de7fae17999c7530623e19275f8bd06a0dd96f7cc5330c3b49bee3b1b5|
|minion-meta/specs/2026-08-28-shared-db-encryption-key-convergence-spec.md|draft|review-needed|fc98aa3b0c0bcfab78f547c2c103199111b50961305c609808da4f9c0babf2cd|
|minion-meta/specs/2026-08-28-shared-db-encryption-key-convergence-spec.review.md|unspecified|supporting-artifact-review-needed|4777fdf6292ad4596e18009e3ddf4f0dee8eeed51927ad897336f93b7e19704b|
|minion-meta/specs/2026-08-29-factory-failure-cost-hardening-spec.md|implementing|review-needed|37e8063dbccf908ebce3d95f70add259c3bd21708e84e22b005d60e07b962de4|
|minion-meta/specs/2026-08-29-factory-quality-tool-routing-spec.md|approved|review-needed|86d110fdd96abcef3c66275eb57f2044a051ce69e296044d1b2d33acf7763136|
|minion-meta/specs/clean-slate-inventory.md|shipped|declared-complete-not-reverified|3ee88a7e8f782de36138c321ab086deaf1cb59601a60368724cf0138e7be4a28|
|minion-meta/specs/evidence/2026-08-18-repo-policy-baseline.md|unspecified|nested-document-review-needed|3461267737c204bdd3a01db90be898a32a49c50ad98c7c339620aa8d34ee1280|
|minion-meta/specs/hub-erp-roadmap/P0-write-hardening.md|unspecified|nested-document-review-needed|70d7315ddc2c68db3278314ea2b5431ba731c39775159d36e58a2dd74d9f955f|
|minion-meta/specs/hub-erp-roadmap/P1-mcp-tool-packs.md|unspecified|nested-document-review-needed|2c80976336d6013186dc63968171b75da6f1e8faf330def68a354dfe7a5420bc|
|minion-meta/specs/hub-erp-roadmap/P2-event-bus.md|unspecified|nested-document-review-needed|c8cf7cfa51e95a93f148366347b581c6a14b23fda46b65924fd6bdb4a686ad8b|
|minion-meta/specs/hub-erp-roadmap/P3-role-aware-ui.md|unspecified|nested-document-review-needed|8bcf7f9171de59b74d3bee90ddcba0caa55394061b9340b023bfa7149554eb01|
|minion-meta/specs/hub-erp-roadmap/P4-ai-brains.md|unspecified|nested-document-review-needed|47915fec948f04040246ce17c62aa0d083299ac568e3e52da2a18c680711f34f|
|minion-meta/specs/hub-erp-roadmap/P4.1-brains-consolidation.md|unspecified|nested-document-review-needed|94d46701923d53f48da3f39607f9297b697787cef050acff0c498fb533bdb766|
|minion-meta/specs/hub-erp-roadmap/P5-stock-module.md|unspecified|nested-document-review-needed|729113b054426e7a1d9323e452df190ceb8cdb87ed9c72693d049847b94a3abc|
|minion-meta/specs/hub-erp-roadmap/P5.1-stock-interconnect-seed.md|unspecified|nested-document-review-needed|f1df4211190b1909d7c1bc853528b5f40da42cd92378d6877626e01fc2236aad|
|minion-meta/specs/TEMPLATE.md|parked|supporting-artifact-review-needed|869b53ca11ac926229646da140ce35d8e8ed16be5b4455207530ce255f789f5d|
|minion-meta/specs/ws-duplication-audit.md|shipped|declared-complete-not-reverified|d5ae0a4bc851250dd8d560e99823d662242a33fd4659c86b74bd61ac8a07096b|
|minion-meta/proposals/2026-08-13-crm-customers-fast-list.md|merged|review-needed|01186b047899f709e71eeb36c01dae06025bfb717c0a376ff5c04413b3f18dfc|
|minion-meta/proposals/2026-08-13-crm-customers-server-pagination.md|in-spec|review-needed|8125c93b0558da08781f05536dc7aa20bdd57ddf5ab37c6e78ae5827cc1dab3e|
|minion-meta/proposals/2026-08-13-minion-base-kanban-auto-refresh.md|done|declared-complete-not-reverified|34c0374d24131f24fe565d8b85a64e60e5c29a64a8fd4d9a09c9bd0b729f9360|
|minion-meta/proposals/2026-08-17-base-deploy-status-branch-filter.md|done|declared-complete-not-reverified|daacc0feb7b723daf45e8514b011608db9be66ff4117416d8c7e3dd3b840bdea|
|minion-meta/proposals/2026-08-17-base-kanban-possibly-shipped-surface.md|in-spec|review-needed|84fcd063e0936dc8317cbe31f71d5718c8a06f50288d66176976e974ff8a8fb0|
|minion-meta/proposals/2026-08-17-factory-agent-cli-unpinned.md|done|declared-complete-not-reverified|6bc05b730ca9e4c7cce650142178ce40c63ab6515bcb143caf649a8fbc2e0659|
|minion-meta/proposals/2026-08-17-factory-capability-separation.md|in-spec|review-needed|7aa73b60926e52bf362ca5a1a02b63bba8adffa35f20d438eec283685961599c|
|minion-meta/proposals/2026-08-17-factory-chat-restart-drops-pending.md|done|declared-complete-not-reverified|8f719e02fbd8c927148a3af4a134c7f7d5b2a338ab07038edecfc92576fb855c|
|minion-meta/proposals/2026-08-17-factory-compose-tailnet-hardcode.md|done|declared-complete-not-reverified|58d2365d0212cf004088044aff3e2f98fa25391bb8ac7c9e6f656ea4baa39631|
|minion-meta/proposals/2026-08-17-factory-deterministic-unstick.md|done|declared-complete-not-reverified|d524290e56318adc4c2273ebcd1b7febcba55b9f9bb174d02273a301d29ff8a1|
|minion-meta/proposals/2026-08-17-factory-durable-state-outbox.md|in-spec|review-needed|87009ff784b8d2f24b9ffa53b13c172de33b5ee48610de0011379c24c544ce30|
|minion-meta/proposals/2026-08-17-factory-memory-governance.md|in-spec|review-needed|49d6f3edd7f9b7a8e2e6dcbce5bbfdadb32870edf2bdf826d7d1a776dd272e35|
|minion-meta/proposals/2026-08-17-factory-orchestration-tests.md|done|declared-complete-not-reverified|628402679be5939109734bbb9ada122f005cebfdefe75c8a7144fe4dd9c2a141|
|minion-meta/proposals/2026-08-17-factory-postmerge-discovery-loop.md|in-spec|review-needed|b250dc51d787d1d012f7f4bfb6d2f865070b5b5519e715a7c577d5ac99c61e7c|
|minion-meta/proposals/2026-08-17-factory-providers-put-harness-check.md|done|declared-complete-not-reverified|5ef576cbfd07d3bdf5f5a7ad74bed93991d1f154939ea510cb8be5e278fd4b8e|
|minion-meta/proposals/2026-08-17-factory-release-rollback.md|done|declared-complete-not-reverified|3ae4a4d4cae5f52dc72fcd34885fd20ae2479896da0f59ab596520d7223a7024|
|minion-meta/proposals/2026-08-17-factory-worker-containment.md|in-spec|review-needed|b39cac916bd205a4958ce0117c5e121ba9ae25a7c41c9cecfce8dd52f4ea3e96|
|minion-meta/proposals/2026-08-17-factory-workitem-handoff-schema.md|in-spec|review-needed|e1378a1f7efd598adc7465d00afda9f50e484af906a9b9505e6c4e59b003ada8|
|minion-meta/proposals/2026-08-17-gateway-client-error-hook-consumer-adoption.md|in-spec|review-needed|73e18aaa5ae2da00ed465e84aac6f9899bf53c6c024b919c24fd578d461cfc0a|
|minion-meta/proposals/2026-08-17-gateway-client-lifecycle-swallows-handoff.md|in-spec|review-needed|f0eca499117e2fab392147f32a6729961d5615ab64940503512b78a96ea6da45|
|minion-meta/proposals/2026-08-17-gw-defaces-crm-tools.md|in-spec|review-needed|14b26413e33941e58a199e3eebd7d6fc41d219df53ecbb7b9a9ca24540b6a827|
|minion-meta/proposals/2026-08-17-gw-msteams-large-upload.md|in-spec|review-needed|056084a24efa866280d49f10ee0970897f265afa59f503af46bd55d355c77f75|
|minion-meta/proposals/2026-08-17-gw-nextcloud-talk-dm-misclassified.md|in-spec|review-needed|bbffc4525bc681d67218a9f0499767c12037fe2f15cf78a0878dd00f103c87e6|
|minion-meta/proposals/2026-08-17-gw-nostr-dispatch-pipeline.md|in-spec|review-needed|5733d2e4d4714a310e59bdcd65777a167f17bfdebb9ae9fcb43c752e31bfaa79|
|minion-meta/proposals/2026-08-17-gw-shells-lifecycle-stubs.md|in-spec|review-needed|cf532bb18a74b768a3f8edd26236cf905fc41500ff5fe21e2b9d87b2536dc4e0|
|minion-meta/proposals/2026-08-17-gw-whatsapp-cloud-template-fallback.md|in-spec|review-needed|f6d2e908098afb27f6ea88f84b156bd55356ee34c6c5c2ef5b88541ce626bb2f|
|minion-meta/proposals/2026-08-17-hub-brain-org-all-scope.md|in-spec|review-needed|c4753c3f39058af23ac77a424f694b1d8a456ce6d90a4dd5b630deda5e0ff614|
|minion-meta/proposals/2026-08-17-hub-dead-mirrors-cleanup.md|in-spec|review-needed|742805d22fa69e30a6d1ed6b1fcb0f137be6cb2451a6c29a13a1a7163eb6c9b3|
|minion-meta/proposals/2026-08-17-hub-distinct-visit-dates.md|in-spec|review-needed|3cbc93549a23fe9f250d3538164f74b19bf67d737e69dfccf658838149ecd080|
|minion-meta/proposals/2026-08-17-hub-funnel-atomic-write.md|in-spec|review-needed|f2ee4a1b82cbe2be251275b621b86dfc93c6fd0a1ed535ae8db1d7f1c5b4ac5a|
|minion-meta/proposals/2026-08-17-hub-igv-rate-from-org-config.md|in-spec|review-needed|988d95c87ac9f97080247bbf02a3fa8906c61dafd3ea4adc09bdde9eeb27827e|
|minion-meta/proposals/2026-08-17-hub-personal-agent-entrypoint-test.md|in-spec|review-needed|1471aca726f514be0307869eb39e5162b294009c698c6e7e38670e11204f2ce1|
|minion-meta/proposals/2026-08-17-hub-pos-appointments-fork.md|in-spec|review-needed|67ff4275ac88017cf0393460002cf667ce3b3ee641a0e6c625e00024bc031b2a|
|minion-meta/proposals/2026-08-17-hub-reserva-keyword-config.md|in-spec|review-needed|f3cf78f105ffeae944fc3042f39341ba936c3e64fddcab326d5afeec9b3c87c5|
|minion-meta/proposals/2026-08-17-hub-updatesellable-silent-drop.md|in-spec|review-needed|e5aa094788486362e30f99f1764b44ed78c2f117129e1d1310b7a27756fae376|
|minion-meta/proposals/2026-08-17-hub-updateserver-tenant-scope.md|in-spec|review-needed|519f07f08e501251c5a619703633848fa4fc6790833e8fe1b72c9a5ee720b42f|
|minion-meta/proposals/2026-08-17-hub-workforce-error-body-leak.md|draft|review-needed|25aa0d81951568cbaf276f20cbf90281b8960b20aca858b2f0c5158209f3c887|
|minion-meta/proposals/2026-08-17-meta-spec-index-project-possibly-shipped.md|review|review-needed|6ff7f5ce5b67c6c1cce80e76586972956d6b879da4d31cf73d0c858c31653f81|
|minion-meta/proposals/2026-08-17-pkg-dev-crypto-failopen.md|in-spec|review-needed|e1428bb1526c644a48bc7f15e857d44459272602b3dd1ebd044fff777b5bb3a5|
|minion-meta/proposals/2026-08-17-pkg-gateway-client-onevent-errors.md|in-spec|review-needed|c6dbdac621937941c6ba7f4f075119c825e5f40662ebf0a4847a221b87abdd91|
|minion-meta/proposals/2026-08-17-pkg-infisical-cache-plaintext.md|in-spec|review-needed|725c8dff1c800f5cd1d4fffaa2a2307ab3a775a2445715bf82e4834bbeb34c1f|
|minion-meta/proposals/2026-08-17-pkg-workforce-client-json-error.md|in-spec|review-needed|5f4fa5862a92ab96df5bea26dc4397614ed1b57038febe0a3de171fb18482575|
|minion-meta/proposals/2026-08-17-site-device-identity-role-escalation.md|in-spec|review-needed|bbe20443ca36628dbe8f0cf9ad4014e58e3b4531a5e3862f982b0378c0961924|
|minion-meta/proposals/2026-08-17-site-member-gateway-swallowed-errors.md|in-spec|review-needed|d662da09da401897cf63d4e2825224e294ba986fcf236eb017dcb1ad9f295813|
|minion-meta/proposals/2026-08-17-site-vendored-tgz-untracked.md|in-spec|review-needed|fdfa3b59c2befd8961c8a8f5a40310ec48475bc5cb77a9a4f943f9fceb8c4745|
|minion-meta/proposals/2026-08-18-agent-instruction-parity-and-repo-policy.md|in-spec|review-needed|2ff9d7f8d0f71a511d109455206b0df72909d8d3069ec706022a82ef5c214e83|
|minion-meta/proposals/2026-08-18-base-attention-queue-responsive-runs.md|in-spec|review-needed|ebb3814ce34f3f69ea070f2e9068d00a1e557be6e10d954e6725304df2607dab|
|minion-meta/proposals/2026-08-18-base-ui-primitives-and-shell.md|in-spec|review-needed|570b0e17432976ba52a7b1a8cd7946e635643f61794ad7fb4395ada079fa77ec|
|minion-meta/proposals/2026-08-18-base-workdetail-summary-first.md|in-spec|review-needed|f744b8f5355c9373e93fa0623595321eb836a56851852dcb1579ebd4c0afd07b|
|minion-meta/proposals/2026-08-18-factory-browser-verification-stage.md|in-spec|review-needed|bb1f8abd94b96e54aeafb27fffc752fc25902f8dc628ba8ee51cf497d830db88|
|minion-meta/proposals/2026-08-18-factory-g0-ci-watch-auto-close.md|in-spec|review-needed|e7ad125315c5e08d20882d0cbd8ce035e3add8cbf8a514c586a36cb7efbcc8b5|
|minion-meta/proposals/2026-08-18-factory-orchestration-round7.md|in-spec|review-needed|395ec0535c44d8bc4db0f2fb711a41eb6cf8ba80a16884732fc299e97744cba7|
|minion-meta/proposals/2026-08-18-factory-topic-capability-manifest.md|done|declared-complete-not-reverified|c5927b7ebe9195cbfe2eb68541a9849ddf6a93d35c283af332c0c31f3438b8a0|
|minion-meta/proposals/2026-08-18-spec-heading-lint-baseline-backfill.md|in-spec|review-needed|b76e9d31c2f5e63c642e697b54ad1d2acc54d7339d0083790dee34ce983a1daf|
|minion-meta/proposals/2026-08-20-cli-registry-package-manager-none.md|done|declared-complete-not-reverified|3030a2b881372b5c6bb37064cd14059385dee3f128e1831307184f07db4bdb47|
|minion-meta/proposals/2026-08-20-dev-key-at-rest-audit.md|closed|declared-complete-not-reverified|e58be9bbea995b3969d1f05489ae0e27405ae1b164ceaff6a695cccee20af7c6|
|minion-meta/proposals/2026-08-20-discovery-synthesis-suspension.md|closed|declared-complete-not-reverified|3a17b787015b4b34aa6746fcce79e01479fd65a8694c88d40a8b9ac4e5c1eb19|
|minion-meta/proposals/2026-08-20-factory-spec-heading-nomenclature.md|done|declared-complete-not-reverified|6fab6fc267c82507e7f5f0a92dfac7f623b929c0e2f4627c7426045826adc19b|
|minion-meta/proposals/2026-08-20-hub-datatable-server-mode-test-gap.md|in-spec|review-needed|f37bd2c26d5182d8edece8e80eec51b4acd70acd2aae906f53e7cede5aba7e4a|
|minion-meta/proposals/2026-08-22-ci-compute-savings-bun-test-roadmap.md|review|review-needed|330a13391433bb2cc7be7a1e1d8737917d46502695e49984e422a9efc1843be3|
|minion-meta/proposals/2026-08-22-crm-rank-query-prod-latency.md|draft|review-needed|5f4bbf006856ac3839fa9df4589595cd1d01e841833dd86370d0580dd18aa80c|
|minion-meta/proposals/2026-08-22-factory-dev-staging-daily-production-promotion.md|done|declared-complete-not-reverified|e8743dc9ab98bbd344f9c8f48c9ba2478a5bd11945f196714d0e358764a20214|
|minion-meta/proposals/2026-08-23-factory-containment-effect-ledger-integration.md|draft|review-needed|44e1685e0b718a07b8ef55567292579361e0405c6f518f0023274483636230a1|
|minion-meta/proposals/2026-08-23-factory-deployment-recovery-controller.md|draft|review-needed|fb2a90e78a654378df6f019ec01e94ee01f6a2d5bb6f835c1d509a5164de41b8|
|minion-meta/proposals/2026-08-23-factory-runner-owned-role-executor.md|draft|review-needed|5581e6c7f40cfd3bde9144f4b71ffd33c763bfd23639e16d7133cebe96625a9d|
|minion-meta/proposals/2026-08-23-hub-archived-warehouse-submit-guard.md|approved|review-needed|dedd2e61e8c0bb378ef9739ae1214599ebdf50b094a7a3ea59411744b88046bb|
|minion-meta/proposals/2026-08-23-minion-ai-ci-baseline-debt.md|review|review-needed|beda1a976dbfd81e60d842dc322e78a0ce483eb5be3b16c7bc16cead4373f2a6|
|minion-meta/proposals/2026-08-24-hub-crm-activity-rollup.md|review|review-needed|b8fc02008e4fe82076b494c5620d78f480775f2d9390d0057f85d6ba92a5555c|
|minion-meta/proposals/2026-08-28-factory-containment-base-reconciliation.md|in-spec|review-needed|ac58f3f0f527a8234441a32c8a41e9255e1e15346221c5c7b3a1fdc83dfba411|
|minion-meta/proposals/2026-08-28-factory-merge-time-change-ledger.md|draft|review-needed|de25e872b6dffab66439298b0837b41e40ca84a9459b67b3784a09aecfa14842|
|minion-meta/proposals/2026-08-28-factory-release-probe-red-and-silent.md|draft|review-needed|04a29e4cf43af2f65e7d6085288138b0b8d3daaf8aeb758124feae2fef3151c0|
|minion-meta/proposals/2026-08-28-factory-supervised-release-defense-in-depth.md|draft|review-needed|de75977f1ba3f187aa5bbb095e2adbff787b3d2ffb44a850d29e2ad75c87d646|
|minion-meta/proposals/2026-08-28-gateway-plugin-effect-disposers.md|draft|review-needed|32055e1ca0d38d8a657935a076d2a40bb8cf7f33d18b78d22fb80a2bac60bf39|
|minion-meta/proposals/2026-08-28-meta-routing-pr100-recovery.md|review|review-needed|0190573c3263ab081a63f0a1e4c45b1c7751ea64424a73ebd82b2db8ee8a4238|
|minion-meta/proposals/2026-08-28-shared-db-encryption-key-convergence.md|in-spec|review-needed|8c1630fab563299e4a101b0e67aa81ea402014219e142d3fd4b4f1b814d2266c|
|minion-meta/proposals/2026-08-29-hub-pos-bookings-stock-gate-drift.md|approved|review-needed|3052262cb864aa6ec9c0600dbdecac3f8ab87dd3ed20662ac08a88bc0fd6a3fd|
|minion-meta/proposals/ci-minion_hub-ci.md|closed|declared-complete-not-reverified|9f9711bb9103a8d34bf0cbee49fb7622ff4700189fe1b2b1f332768dfab6e599|
|minion-meta/proposals/ci-minion-ai-auto-response.md|draft|review-needed|72ab189b2734d87140610b69cd8267d827d2451adaeed9b701000ce4ea5b62d5|
|minion-meta/proposals/ci-minion-ai-ci.md|in-spec|review-needed|4009e738c8e1a94a948c1a660cedb23909aef2bb65e2d70aebb7e7cbebdb4162|
|minion-meta/proposals/ci-minion-ai-deploy-gateway-devprd-channels.md|in-spec|review-needed|c00436f00060bb1d5c7f86ae25ba0e9eb89eb2f6ec223a39fd015e003976b21e|
|minion-meta/proposals/ci-minion-ai-docker-release.md|closed|declared-complete-not-reverified|ffade03c2ec72dac8c2f2906140085371390e31669f444e4dcf1d3ffd264d8d7|
|minion-meta/proposals/ci-minion-ai-factory-notify.md|closed|declared-complete-not-reverified|0a77033b4341b61266c6f91dd45cafcc31354f6b7d69a3454ac5aa8830985418|
|minion-meta/proposals/ci-minion-ai-install-smoke.md|closed|declared-complete-not-reverified|28977ecd13e5f0f09bebbcde211f8343b48099d13a1886af65a571f8abb089af|
|minion-meta/proposals/ci-minion-ai-labeler.md|review|review-needed|c442f3a2dff510e671c76063d56599908d19e5dc1694a33f47f0da62eabed855|
|minion-meta/proposals/ci-minion-ai-npm-publish.md|closed|declared-complete-not-reverified|31449eefa67c061f6c73d27976250bf3dac506f7c5b6c65184a0fdbb4271761f|
|minion-meta/proposals/ci-minion-ai-stale.md|review|review-needed|85906c7a7a1ef7fe5971ab502f2fe98a55a19a646da52ac8ec11869def7442c8|
|minion-meta/proposals/ci-minion-ai-upstream-monitor.md|closed|declared-complete-not-reverified|c7d45df7b5b6620f1ad90ddd5c324742e361be7b5e22fd353e86fb8dac18c491|
|minion-meta/proposals/ci-minion-ai-workflow-sanity.md|closed|declared-complete-not-reverified|5d6d2c12ba233d4f489cb37c83e3c2894f01f70f91cf2b17faadb6e737328db6|
|minion-meta/proposals/ci-minion-base-factory-notify.md|done|declared-complete-not-reverified|1afe1f6c5b4e4ce06216cc50d2c81127e766a66431dd6f891cf6d2f0da29bb7b|
|minion-meta/proposals/ci-minion-factory-ci.md|closed|declared-complete-not-reverified|91239211d16750325dcc030ecfd3f52a4e0fdfa356a9bbbf9ffd8b2264ee9283|
|minion-meta/proposals/ci-minion-factory-promote-factory-dev-to-production.md|done|declared-complete-not-reverified|b587245ef20b3058fec55c04a8825e4143761f62b7c090ae727f5981d6c75cd3|
|minion-meta/proposals/ci-minion-meta-ci.md|merged|review-needed|31a7e3eff77f9e5df7bebd4ced2193bbe1db9d0585ed0fbb18468ef2e3b37582|
|minion-meta/proposals/ci-minion-meta-claude-code-review.md|closed|declared-complete-not-reverified|b955dd472e361c980dbc3d289610ec5e57eb8fe4a252cc17f98b49e19d735733|
|minion-meta/proposals/ci-minion-meta-thermonuclear-code-review.md|closed|declared-complete-not-reverified|3a1a3fe677a9c9dad29ba009d5ce05e0a62040d5aaa4fec9b8bc1fa98b4bcc0d|
|minion-meta/proposals/ci-minion-site-ci.md|closed|declared-complete-not-reverified|2abc22bea3e3391386ac793ef9e08646096d60f0e24a6c8071d30935f60fb672|
|minion-meta/proposals/handoff-minion-ai-1480236091.md|draft|review-needed|87e4b2ff341e73abdfb2e85a6d42656600bf7e8850bc4f7f169b1024301ca2b4|
|minion-meta/proposals/handoff-minion-ai-2877399286.md|review|review-needed|ee65b7778c47a150dcbb0e72ffaf670bef4b8cdb1ff4866a1bf4e6199ff3e442|
|minion-meta/proposals/handoff-minion-ai-3238987400.md|review|review-needed|bccb752b955224ea069a3ce419dc27b92abbfa5b6d20bc1b11ad2d6ca8c47d17|
|minion-meta/proposals/handoff-minion-ai-3714852609.md|review|review-needed|bc5682e15bec1f9b55dbf4bb67f6435498d62017f810ed234448bd54425f7fc0|
|minion-meta/proposals/handoff-minion-ai-4278431509.md|in-spec|review-needed|d0981d302926f9e206c5f769f6e5fab902a101918aedc18589f68e0e194407d6|
|minion-meta/proposals/handoff-minion-ai-492754540.md|review|review-needed|36184c728e604b9ce5d75c870c620850802e5c971cd1879bead7b3331f22b059|
|minion-meta/proposals/handoff-minion-factory-1093105314.md|review|review-needed|fa440fd0e2abb65aadb1515d60b288dd04e85dadfcda788c143a9f1f76196fe1|
|minion-meta/proposals/handoff-minion-factory-1378118597.md|review|review-needed|0604aad698a50a86114b738d8f5c9f3e668a9fd5f6142db28b0510501fddc975|
|minion-meta/proposals/handoff-minion-factory-1487584490.md|done|declared-complete-not-reverified|233dab8964fe21fa31872b40ebc58a0b675f555d9ee664d951d043009b7174b4|
|minion-meta/proposals/handoff-minion-factory-1962723814.md|review|review-needed|666dc36ac65256c875136a18373f9c760c817158a6573df0c067b8ace6899a75|
|minion-meta/proposals/handoff-minion-factory-2349553228.md|merged|review-needed|1e15940a53b2878abba83a95ffcaab03df4f75a9299a44758d39c19e32b8dd5f|
|minion-meta/proposals/handoff-minion-factory-2704064834.md|review|review-needed|f44972951d5d359037bd514811aab36655d7f3e0cc40e99a56f9485bb72c535f|
|minion-meta/proposals/handoff-minion-factory-2943307277.md|closed|declared-complete-not-reverified|3094b2b8e472a593e0802f8156dc0c5cd3e103952202f99300548daa7dfb8ab1|
|minion-meta/proposals/handoff-minion-factory-3380133543.md|merged|review-needed|6c833c64734e62ce9d23ae9e0f49ed790c8f12500d6b8790d84a1a41759d7dd6|
|minion-meta/proposals/handoff-minion-factory-3991934595.md|closed|declared-complete-not-reverified|ea788c7ce752839acbc7cb76c168eca67e218a508ed64263a42e371382276590|
|minion-meta/proposals/handoff-minion-factory-4051690038.md|closed|declared-complete-not-reverified|2f63424b050b00ebf5f234890447a61d03c22bd4fa010712da49a636a8f19e87|
|minion-meta/proposals/handoff-minion-factory-4078371999.md|closed|declared-complete-not-reverified|8b104da4e5289545e848e3e603431f6f28ef414ee8fec158c77f704037b19197|
|minion-meta/proposals/handoff-minion-factory-420667051.md|merged|review-needed|ad668f8706667ea7fd3bd8856b50fe61bf5944faea2bc60b7b42746c01f3dad1|
|minion-meta/proposals/handoff-minion-factory-984565429.md|review|review-needed|ec65b724570dcbd70b2470f0e929db849c66444634ffccf5f1527917c3f0dd8e|
|minion-meta/proposals/handoff-minion-hub-1323254565.md|in-spec|review-needed|644b50577f97008e6cae4117cd632dc0bde6240a782a08b94e042cbc1806b0c9|
|minion-meta/proposals/handoff-minion-hub-1447734948.md|approved|review-needed|f8a1980e1ca27ab6711217419d8e2c65a772a900bf4b80e49667b0e57cd4e52c|
|minion-meta/proposals/handoff-minion-hub-1508675347.md|merged|review-needed|72afaf80b8db108ec41d247974d0ef20ca4fce8d5dc415cd0fd09c4cb372f076|
|minion-meta/proposals/handoff-minion-hub-1637616237.md|review|review-needed|e95ee453fd0d55e1ebb2dda65c7b940a1ef4dea2d7d01ce9b563a469bb2e952d|
|minion-meta/proposals/handoff-minion-hub-1973736083.md|closed|declared-complete-not-reverified|45db8463a5d736bca7217f8af7c7ffd2b715c9f7e5231edaee7a3161660fff41|
|minion-meta/proposals/handoff-minion-hub-2131866440.md|in-spec|review-needed|7c9796c979e9ff8327a2f6b639cd5f7174c1ae083558ee0e3dd35da4d9b52266|
|minion-meta/proposals/handoff-minion-hub-2222130690.md|review|review-needed|43cad5612483d09ecdf0887a8f4ab039e6603319d21ff726370b4d75ccd925a3|
|minion-meta/proposals/handoff-minion-hub-2249203609.md|closed|declared-complete-not-reverified|6d93076f70921395fbd57eb6ee5e49fddae922ef1d201f83e96d49f5d8fd5aa5|
|minion-meta/proposals/handoff-minion-hub-2785164896.md|in-spec|review-needed|54e44c6adf3931f3061af49ad1443ddf78c103c3cb04d2aadf0c2030d01866ae|
|minion-meta/proposals/handoff-minion-hub-3389264281.md|draft|review-needed|914dd9171faceef3378d62a64722f1fabf7662b7778b78503e118e6291e1cd05|
|minion-meta/proposals/handoff-minion-hub-3530856808.md|in-spec|review-needed|3fed960726f1692444df614488a643589048460cfe2d772c24e8f05d62a6d315|
|minion-meta/proposals/handoff-minion-hub-384264376.md|retired|retired-no-new-authority|8eff80daeffc56ec5ede69e85c88be69b4842038f6ba7eef982404189e0373b5|
|minion-meta/proposals/handoff-minion-hub-3998033254.md|in-spec|review-needed|f0546a00310c1758e9b0d870dffb9c2e47ec0c250436a98c4389af2a4848358f|
|minion-meta/proposals/handoff-minion-hub-4274754053.md|closed|declared-complete-not-reverified|40d9e28ccd6b7e39d6054af6330fe4185378492a2105a71d587ebed7011ffcf1|
|minion-meta/proposals/handoff-minion-hub-722867358.md|review|review-needed|bcced1ae56c2165ce593beacf03352f113f7d992c57761716ab0191137f05305|
|minion-meta/proposals/handoff-minion-hub-902723699.md|in-spec|review-needed|93b17ee8e32af3a589b2dc6480f3ee8286527c7a34dd5762015ea6474e21ee5b|
|minion-meta/proposals/handoff-minion-meta-1221975654.md|closed|declared-complete-not-reverified|14f7b02e0781bbe344af65f4204845c4d278c4041271faf34f4c6cdaf8605a17|
|minion-meta/proposals/handoff-minion-meta-1508319703.md|closed|declared-complete-not-reverified|1567ae5cad431b55b9b3ea8e7595631270184309d6066be793fb4d8aae542af3|
|minion-meta/proposals/handoff-minion-meta-1874435282.md|closed|declared-complete-not-reverified|3877fa0cef2f1e03b2b7a6571569f330b3b1c3f1ff64b44a4b43c1cdc6e7856c|
|minion-meta/proposals/handoff-minion-meta-1883922325.md|review|review-needed|50f2ac39195e59502d0fe406c54a8cc7f2f398f22a29fb1ece16acc9a6fccabc|
|minion-meta/proposals/handoff-minion-meta-2059993319.md|merged|review-needed|459c0597ca9788bd33c3565665ffd7fab77feda3062283405ef51eaa37c3a642|
|minion-meta/proposals/handoff-minion-meta-2411386253.md|closed|declared-complete-not-reverified|af54e6b43bbf8589cc28dc6e766050e85a3d4253df23c70cbe13848bdc1f329c|
|minion-meta/proposals/handoff-minion-meta-265306614.md|closed|declared-complete-not-reverified|f2fa1f1ce0bf8de90c3e3ab305580a84b53e084a1adc0f3ba5df055e6dbcf9dd|
|minion-meta/proposals/handoff-minion-meta-2757299434.md|review|review-needed|2895f52a5c8a3a1da7ebe853f5c2bb711d72235dfbd81bab0722d134cf0ac0c6|
|minion-meta/proposals/handoff-minion-meta-2958182560.md|closed|declared-complete-not-reverified|1b59b1cccf4380b0b39114612c61cc1a2758b8d4912180365401e5443857bcd0|
|minion-meta/proposals/handoff-minion-meta-2988591151.md|review|review-needed|81f95b7e65c6e2c4f2941f08ad456148c78eb2d576a5721a15b93e04b396b5a7|
|minion-meta/proposals/handoff-minion-meta-3002771604.md|closed|declared-complete-not-reverified|6c1bd67f33b1d7876c9601554cf3567fde6eea6bbc0a2f36fd2498d077cc1ad2|
|minion-meta/proposals/handoff-minion-meta-3253128100.md|closed|declared-complete-not-reverified|49f5e30489571a08e71fb110210cded1d949de80adfc52f0441c664ad3ed2756|
|minion-meta/proposals/handoff-minion-meta-3518589653.md|in-spec|review-needed|719204caee088d8588bc4807a48b90cdbcb9e09eae2f92ff884e30853998ea9f|
|minion-meta/proposals/handoff-minion-meta-3785587305.md|closed|declared-complete-not-reverified|126ec231c4120487a81a73db7f44412d96d0ce4c56b6bcd2e4c131a16a3aa9d9|
|minion-meta/proposals/handoff-minion-meta-781446196.md|review|review-needed|edfcdb3280bd976732e8cb53e1c3bbab587d4bae0509e67312d5cd6facc5063e|
|minion-meta/proposals/handoff-minion-meta-836496437.md|closed|declared-complete-not-reverified|1be00a3ae81c59b3aa54e61277042e35e4d6ee89adfcf5da5d856b2f0eca9778|
|minion-meta/proposals/handoff-minion-meta-851650702.md|closed|declared-complete-not-reverified|bc2a07481a9b456343bf293033a504773c016b27350eee71a808efa03a166c43|
|minion-meta/proposals/handoff-minion-site-2829334481.md|review|review-needed|29284c20f5a014a9f69f7958cf56da9e612f46290674b4581561362ded302aaf|
|minion-meta/proposals/merge-scan-minion-base-1d2151b.md|draft|review-needed|be3442e57324d731c97236578e794a96971c3807a8bb5d24c50098621bc0b15b|
|minion-meta/proposals/merge-scan-minion-hub-afd023b.md|draft|review-needed|a7adcd2f523a226977f571471c57bb196f2da6a1772ee03f915c62f0c0402769|
|minion-meta/proposals/postmerge-minion-hub-02037879674c.md|closed|declared-complete-not-reverified|498b1a93b71fa985f9f7dbf3e6e3148a2c7d6e032d02d3411a42ff387e87d9d9|
|minion-meta/proposals/postmerge-minion-hub-686ed804b880.md|closed|declared-complete-not-reverified|dddf6a368d096192e7daf0825009c2dc610a2f3d3a28d53200c5611ffd60a31d|
|minion-meta/proposals/postmerge-minion-hub-6c679768db21.md|closed|declared-complete-not-reverified|c4691069b40dcaca793c834a0bbc5623afc439702c21b4a20b5714393e9504c9|
|minion-meta/proposals/postmerge-minion-hub-89656031e3f7.md|closed|declared-complete-not-reverified|0ed021c9920abebdf89ddde5666446c946761021c30b001876a2f6236f2f208a|
|minion-meta/proposals/TEMPLATE.md|closed|supporting-artifact-review-needed|a2db154f54d783bc5e9b00650811ecafc2e7f89b780a62f84509bfa2b2629a32|
