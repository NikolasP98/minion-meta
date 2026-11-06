# Feature Specification: Checked assistant outcomes and testable release

**Feature Branch**: `spec/agent-transcript-guardrails-20261106`

**Created**: 2026-11-06

**Status**: Draft — adoption blocked on review findings and owner approval

**Input**: Inspect agent transcripts for skipped checks and assumptions, choose EGM approaches, test corrections, and report when the changes are live on production and testable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust an assistant outcome (Priority: P1)

A user receives a clear, supported outcome instead of leaked tool protocol, an unsupported success receipt, or a supported credential value.

**Why this priority**: False completion and secret exposure prevent safe use even when business data is otherwise correct.

**Independent Test**: Pass representative successful, malformed, uncertain and credential-bearing responses through the protected persistence, visible-output and speech boundaries; inspect the emitted results and recorded effects.

**Acceptance Scenarios**:

1. **Given** a response containing malformed tool protocol and surrounding success prose, **When** it reaches a protected output path, **Then** no visible or spoken success receipt survives; the user receives an uncertain-outcome notice and checks action status before retrying.
2. **Given** a supported credential assignment spanning a size limit or a later plugin transform, **When** protected content is persisted or delivered, **Then** supported plaintext credentials are removed while ordinary IDs and receipts remain usable.
3. **Given** supported channel interaction controls, **When** text is sanitized or speech is disabled/enabled, **Then** the interaction remains usable without exposing protocol in visible or spoken text.

### User Story 2 - Validate business requests before acting (Priority: P1)

A user previews and confirms only valid appointments, sees the actual coverage of bounded appointment results, and queries the requested business-calendar period.

**Why this priority**: Invalid references, incomplete coverage and silent date substitutions lead to incorrect business decisions.

**Independent Test**: Exercise valid and invalid scoped references, occupied slots, holidays, approved leave, changed availability, a 501-result dataset, and explicit calendar boundaries. Observe results and side effects.

**Acceptance Scenarios**:

1. **Given** a foreign, missing, inactive, unassigned, occupied or unavailable appointment reference/day, **When** preview or confirmation is requested, **Then** the request is rejected without partial effects.
2. **Given** a valid preview, **When** it is produced, **Then** it has no writes or reservations; confirmation revalidates current availability, including leave or holidays added after preview.
3. **Given** 501 matching appointments and a 500-row response limit, **When** a list/count is requested, **Then** the list reports 500 returned, 501 total and truncation, and count mode reports 501.
4. **Given** invalid explicit dates, blanks, leap-day errors, one-sided bounds or business-midnight boundaries, **When** a finance period is requested, **Then** invalid input is rejected and accepted periods preserve the requested local calendar meaning.

### User Story 3 - Continue an authorized task without losing memory (Priority: P2)

An authorized personal-agent task proceeds without an optional setup interview. Eligible settled exchanges can produce bounded, deduplicated memory extraction without concurrent overspending or stale session writes.

**Why this priority**: Continuity must improve without introducing uncontrolled extraction or blocking legitimate work.

**Independent Test**: Exercise two exchanges, replay, overlapping requests, failed extraction, lifecycle cleanup, capacity and idle expiry; inspect admissions, attempts, stored state and the actual assembled task context.

**Acceptance Scenarios**:

1. **Given** an unconfigured personal assistant and an authorized task, **When** context is assembled, **Then** optional style/name setup does not displace the task or invent an unknown fact. Real permissions remain enforced.
2. **Given** two eligible settled exchanges, **When** extraction is considered, **Then** the accumulated window becomes eligible once, unchanged replay is skipped, and concurrent admission cannot exceed five attempts per retained generation.
3. **Given** a successful reset/delete or a failed cleanup, **When** old work settles, **Then** successful cleanup fences stale writes and clears old state; failed cleanup preserves its budget.
4. **Given** a retired generation or process restart, **When** a new generation begins, **Then** its separate budget is disclosed; no conversation-lifetime budget guarantee is inferred.

### Edge Cases

- Clean spoken overrides accompanying invalid visible responses; partial protocol in streaming paths.
- A credential assignment cut before its closing quote; transforms that introduce supported secrets later.
- Directive-only confirmations, media/control-only payloads and nonterminal output.
- Reversed or impossible dates, daylight-saving boundaries and a missing organization timezone.
- Stale preview availability, approved leave, holidays and optional resource reassignment at confirmation.
- Count/list agreement, stable ties, empty results and sensitive-field masking.
- Overlap, replay, cancellation, sink failures, reset races, retention capacity and generation retirement while other chat activity continues.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Protected output MUST distinguish invalid/uncertain outcomes from successful effects before any unsupported receipt is shown or spoken.
- **FR-002**: Protected persistence and delivery MUST remove supported credential formats before destructive shortening and after later transformations. Other secret formats and bypass paths remain explicitly outside the bounded claim.
- **FR-003**: Supported channel interactions, media and nonterminal controls MUST remain usable across output sanitization and speech modes.
- **FR-004**: Appointment preview and confirmation MUST enforce the same scoped semantic and availability checks, including holidays and approved leave; preview MUST have no write or reservation effects.
- **FR-005**: Bounded appointment reads MUST expose exact total, returned count, limit, truncation and read mode. Continuation/full enumeration is outside this slice.
- **FR-006**: Accepted finance periods MUST preserve business-calendar meaning; invalid explicit input MUST fail instead of silently selecting a default period.
- **FR-007**: Personal setup MUST remain optional for authorized tasks; unknown facts, non-personal onboarding and real permissions MUST remain protected.
- **FR-008**: Memory admission MUST accumulate actual eligible exchanges, deduplicate replay, reserve attempts before overlapping work and bound retained generations.
- **FR-009**: Session cleanup MUST fence stale work after successful lifecycle operations while preserving state when cleanup fails.
- **FR-010**: Production readiness MUST require exact approved source/deployed identity, passing required checks and safe runtime proof. A local build, prototype test count or draft PR MUST NOT be reported as live.
- **FR-011**: Raw transcripts, tenant/session identifiers and historical credentials MUST remain private; public fixtures MUST be synthetic or sanitized.

### Key Entities

- **Outcome**: Successful, invalid, denied, incomplete or uncertain result and its evidence of effects.
- **Preview**: Scoped appointment details and advisory availability, without a reservation.
- **Coverage**: Total matches, returned matches, limit, truncation and read mode.
- **Business period**: Accepted local calendar bounds and timezone interpretation.
- **Retained generation**: A bounded session extraction window with attempt budget, activity and lifecycle state.
- **Release evidence**: Approved source identity, tests, review, deployed identity and runtime checks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every agreed invalid-outcome case yields zero unsupported success receipts in protected visible and spoken output.
- **SC-002**: Every supported credential case, including shortening and transformation cases, yields zero supported plaintext credentials in protected stored/delivered results.
- **SC-003**: Invalid appointment preview/confirmation cases yield zero partial effects; a valid preview yields zero writes/reservations and later confirmation revalidates current availability.
- **SC-004**: The 501-match acceptance dataset reports exact coverage and count while returning at most 500 rows.
- **SC-005**: All accepted/rejected calendar cases match the agreed business-day boundaries with no silent invalid-input fallback.
- **SC-006**: Overlapping requests admit at most five attempts per retained generation; replay and failed cleanup do not reset that budget.
- **SC-007**: No release is called production-testable until deployed identity matches the approved source and safe runtime checks pass.

## Assumptions

- Existing organization/permission rules remain authoritative. Tests of generated task context do not prove live-model interpretation.
- Process restart and retained-generation retirement can create a new budget. Other chat activity is not a conversation-lifetime budget guarantee; lifetime/global limits remain outside this slice.
- Explicit memory tools, other persistence/export paths, direct telephony/audio and unsupported credential families retain separate handoff items.
- Provider timeout/abort and acknowledged/idempotent sink delivery are not completed by this bounded draft.
- Native role/GUC/RLS and concurrent-exclusion proof remain separate release checks; local synthetic SQL is not production authority proof.
- Preview is advisory; an unselected resource can change before confirmation. No new schema, permission grant, provider eval or production-data write is authorized by this document.

## AS-IS, TO-BE and DELTA evidence

[The registered release spec](../2026-11-06-agent-transcript-guardrails-release-spec.md) preserves exact pinned source, the eight defect transitions and executable acceptance mappings. [The code review](../../audits/2026-11-06-agent-transcript-review/code-review/README.md) separates direct transcript matches from adjacent defects. [Release evidence](../../audits/2026-11-06-agent-transcript-review/egm/release-status.json) separates frozen prototype proof, signed submissions and pending deployment.

## Governance and current blockers

This Spec Kit artifact ports the already retained EGM design and candidate evidence into the current upstream artifact layout. It does not claim Spec Kit preceded the exploratory code, retroactively certify owner approval, or mark the two-pass review complete. The exploratory candidates and legacy-layout release spec were prepared before the newer upstream Spec Kit scaffolding was merged into this isolated branch; the prior signed snapshot does not contain `.specify/memory/constitution.md`. This record names that ordering transition for owner review and does not claim Spec Kit was executed retroactively or that an exception was approved. Production adoption remains blocked under Constitution I/V until the owner approves the security/data spec and required review/checks pass. No new runtime adoption is authorized by this retrospective document.

[NEEDS CLARIFICATION: The owner decision requested for Gateway findings F1–F4 remains pending; decide whether the unrelated JWT finding is included or tracked separately, and authorize the guardrail corrections before their gate advances. Additional formal review findings must be resolved under the same process.]

The release tool also selected the wrong default branch for Gateway/meta. The documentation run stopped safely and this draft PR uses canonical `dev`; the Gateway source range must be corrected before publication. Human merge remains mandatory, and no changes are live.
