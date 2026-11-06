# Feature Specification: WorkItem consumers before producer migration

**Feature Branch**: `fix/workitem-consumer-first-plan`
**Created**: 2026-10-17
**Status**: Review; owner security approval required before implementation
**Input**: Keep eligible board work moving while reconciling invalid approvals,
duplicate implementations and exhausted runs. Finish the missing trust gate
from the existing WorkItem goal before migrating its producers.

## User Scenarios & Testing

### User Story 1 — Keep approval meaningful (Priority: P1)

As the owner, I need human and external work to keep human approval even when
an intake record has a nonempty source name.

**Independent Test**: Sweep otherwise identical trusted, human, external and
legacy proposals; only complete trusted low-risk work may auto-approve.

**Acceptance Scenarios**:

1. **Given** valid trusted low-risk work, **when** automatic approval runs,
   **then** it may pass all existing additional gates.
2. **Given** human, external, incomplete or unclassified work, **when** automatic
   approval runs, **then** it remains held with a bounded reason.
3. **Given** a valid human/external proposal with human approval, **when** the
   spec stage admits it, **then** its validated approval permits admission.

### User Story 2 — Apply one intake contract (Priority: P2)

As an operator, I need new approvals and spec-stage starts to reject inconsistent
records through automatic and explicit entry points alike.

**Independent Test**: Submit malformed, duplicate-field, wrong-identity and
risk-inconsistent records through each new approval/admission interface.

**Acceptance Scenarios**:

1. **Given** an approved index hint with invalid metadata, **when** a new spec
   start is considered, **then** no new execution record is created.
2. **Given** ambiguous or wrong-identity canonical source, **when** explicit
   approval/start is requested, **then** it is refused before writing state.
3. **Given** one malformed record among valid unrelated records, **when** the
   sweep runs, **then** that record is held and safe unrelated work continues.

### User Story 3 — Preserve ongoing work during migration (Priority: P3)

As an operator, I need a consumer-first release to preserve queued/running work
while legacy intake waits for reviewed enrichment.

**Independent Test**: Repeat the sweep and restart with existing queue fixtures;
compare stored work, manifests, ordering and approval history.

**Acceptance Scenarios**:

1. **Given** existing queued/running work, **when** the new consumer deploys,
   **then** its stored execution authority and history are preserved.
2. **Given** missing legacy fields, **when** new approval/admission is requested,
   **then** the record stays visible and waits for enrichment.
3. **Given** a verified consumer release, **when** producer backfill is proposed,
   **then** a reviewed current-source inventory precedes its separate release.

### Edge Cases

- Empty tags, known unclassified topics, unknown aliases and unavailable policy.
- A declared low risk that disagrees with current authoritative topic policy.
- Duplicate control fields, path/id mismatch, malformed arrays or enum values.
- Explicit approval does not make invalid metadata valid.
- A replay, stale retry or malformed sibling must not delete or rewrite work.

## Requirements

### Functional Requirements

- **FR-001**: Validate the complete existing WorkItem contract before every NEW
  proposal approval or proposal-to-spec admission.
- **FR-002**: Automatic approval requires explicit trusted-automation provenance,
  policy-derived low risk and every existing eligibility condition.
- **FR-003**: Human/external work requires human approval; missing, malformed,
  unknown and unclassified metadata cannot acquire automatic approval.
- **FR-004**: Source identity and unambiguous control fields are required before
  any canonical approval/start write.
- **FR-005**: Keep current risk policy, stored execution/merge authority, scoring,
  readiness requirements and phase/age ordering authoritative.
- **FR-006**: Preserve existing queue rows, active work and stored retry authority.
- **FR-007**: Deploy and prove consumers before producer/schema backfill; legacy
  records remain visible while new approvals/admissions are held.
- **FR-008**: Keep the rest of the original WorkItem goal in its parent; shipment
  of this slice does not complete producer backfill or typed monitor intake.

### Key Entities

- **WorkItem**: Identity, source, source trust, risk, priority, owner and lifecycle
  status of a proposal; tag vocabulary comes from existing policy.
- **Approval/admission decision**: Validated source identity, allowed edge,
  explanation and existing approval authority.
- **Existing execution**: A previously admitted queue record and stored authority
  whose lifetime is independent of later intake enrichment.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every new approval/start entry point rejects invalid trust metadata
  before creating an approval or execution record.
- **SC-002**: All human/external/legacy refusal scenarios preserve their required
  gate, while valid approved and trusted-low-risk scenarios remain usable.
- **SC-003**: Repeated sweeps/restart preserve every pre-existing execution,
  approval and ordering fixture without duplicate starts.
- **SC-004**: A release record proves the consumer gate before producer/backfill
  deployment is admitted; all remaining parent work stays visible.

## Assumptions

- The original WorkItem field vocabulary remains the contract; no new product
  role or permission mapping is invented.
- Current topic policy determines risk. Existing operator credentials and
  approved-spec dispatch remain separate established authorities.
- Planning and research may proceed now. Owner security approval of the revised
  spec and owner merge of implementation are required before executing changes.
