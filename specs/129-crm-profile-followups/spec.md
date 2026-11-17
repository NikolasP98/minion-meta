---
status: draft
verdict: pending
created: 2026-11-16
updated: 2026-11-17
repos: [minion_hub]
tags: [ui, data]
source_proposal: 2026-11-16-faces-stock-cash-crm-meeting-followups
source_item: F8
---

# Feature Specification: Discoverable persistent CRM profile classification and Instagram recording

**Feature Branch**: Planned `129-crm-profile-followups`; no branch created or switched. Hub PR base: master, verified from repo-policy on November 16.

**Created**: 2026-11-16

**Status**: Draft; source-evidenced planning only. Owner approval before implementation/configuration and owner merge remain pending. Review results are recorded under egm/.

**Input**: FACES meeting follow-up F8: Verify personal-account profile tagging and layout discoverability, preserve the independent modelo classification, and reuse supported profile fields to record an Instagram handle.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Persist and find a profile classification (Priority: P1)

Staff using personal accounts find and apply the CRM profile tag modelo, reload and see it without changing event tags or customer lifecycle.

**Why this priority**: Staff need to find and retain a client’s profile classification on their own account.

**Independent Test**: Apply an existing manual CRM modelo tag to a synthetic contact, reload with the same and another authorized account; compare booking tags and lifecycle.

**Acceptance Scenarios**:

1. Given a contact and an existing CRM-scoped modelo tag, when an authorized staff member applies it and reloads, then it remains on the profile while event tags and lifecycle are unchanged.
2. Given the tag picker is in the existing lifecycle card, when the staff member follows its translated label and existing layout control, then the translated label or help identifies manual CRM profile tagging, and the staff fixture locates that picker and applies the modelo tag while event tags remain unchanged. Reuse an existing label that already states this scope; add bounded help only when the walkthrough shows it is missing, without a wholesale layout redesign.
3. Given denied edit permission, another organization's contact, a deleted contact or a malformed contact ID, when the picker or direct tag write is attempted, then no tag changes and the response does not reveal whether the contact exists.

### User Story 2 — Record Instagram without inventing a channel identity (Priority: P2)

Staff reuse the existing profile custom-property or Additional-field editor to store a manually supplied Instagram handle, and can distinguish it from a synchronized channel identity.

**Why this priority**: Manual Instagram recording follows profile classification and depends on verifying an authorized existing storage path.

**Independent Test**: Inspect existing org fields first; record a synthetic manual handle using exactly one chosen existing storage path, reload and confirm no channel connection or identity row was created.

**Acceptance Scenarios**:

1. Given an existing Instagram profile field, when it is found, then that field is reused and a duplicate standard field is not introduced.
2. Given no configured Instagram field, when an authorized operator records the handle through the existing Additional metadata editor, then the key/value persists and remains independent of a read-only Instagram channel identity.
3. Given a masked viewer or unrelated contact, when the profile is read or updated directly, then the handle, the other masked fields (phone, email, document) and unrelated profile fields keep their stored values and are not disclosed.

### Edge Cases

Modelo case/accent duplicates; existing event tag with same name; auto/AI tag cannot be manually applied; stale tag picker; tag deleted by another user; tag write against another organization's or a deleted contact; profile ownership changes; read-only role; existing imported Instagram key; manual handle differs from synced identity; reserved metadata keys; unrelated metadata replaced by whole-editor save; restricted editor saving a profile that has a phone or email; account switch on shared browser; blocked local storage; second device.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The current personal-account ability to view, apply and remove CRM profile tags MUST be verified before any product change; already-supported behavior MUST be reported as such.
- **FR-002**: The modelo classification MUST be a manual CRM profile tag, independent of event tags, inferred tags and lifecycle stage; existing matching tags MUST be reused rather than recreated.
- **FR-003**: Profile tag controls and existing layout customization MUST use clear translated labels and preserve current card placement and saved layouts unless an observed discoverability failure justifies a bounded label/help change.
- **FR-004**: Instagram channel identity handles MUST remain distinct from manually recorded profile values. Existing org custom properties or Additional metadata MUST be inspected and reused before adding fields.
- **FR-005**: If no existing org Instagram field exists, the existing Additional metadata editor MUST be qualified as the bounded fallback, including registration and regression proof that the Instagram field is masked for restricted viewers before its value is stored. The owner-approved key is recorded privately; no schema migration, duplicate field, channel identity insertion, account connection, scraping or message send is authorized.
- **FR-006**: Tag and metadata writes MUST retain tenant, existence, owner and edit checks. A principal who sees a field masked MUST NOT change its stored value, directly or by saving the masked projection. Writes MUST preserve unrelated and reserved metadata and respect masking on reads and mutation responses.
- **FR-007**: Profile tags, manual handle value and per-account layout MUST survive reload under their existing persistence scope. Cross-device layout sync MUST NOT be promised unless separately proven.

### Key Entities

See [data-model.md](data-model.md). Existing records and their authorized display projections remain separate; a manual profile value does not establish a synchronized channel identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Allowed personal-account fixtures retain modelo after reload and removal persists; event tag sets and lifecycle values remain unchanged. Denied, owner-scoped, foreign-org, deleted and malformed-ID tests perform zero unauthorized tag or field mutations and return zero raw masked values, including identity handles. A restricted editor's save leaves every stored masked value and the phone identity byte-identical. Exactly one existing storage path records the manual handle and zero channel identities are inserted. Existing per-account layout survives same-browser reload without leaking to another account; no unverified cross-device sync claim is made.

## AS-IS

The meeting demonstrates existing profile tags and Editar Diseño; it does not prove that tagging is broken. Source already has a CRM-scoped TagsField, independent lifecycleOverride, manual tag POST/DELETE and auto-tag chips. Tags live in a lifecycle grid card with a documented pre-existing placement follow-up.

The detail uses an account-scoped EditableGrid and existing details editor for arbitrary Additional metadata, plus OverviewCard custom properties.

Instagram channel identities already have a handle and are rendered, but this is distinct from manually recording a handle: the standard profile details list has no Instagram field, and the inspected identity card is read-only.

A read-only production inspection by the orchestrating session on November 16 confirmed a CRM-scoped tag Modelo and a distinct event-scoped tag MODELO. The sanitized read did not select tag kind, so manual eligibility remains unverified. No custom-property definition matched Instagram/modelo labels; this does not rule out Additional metadata keys or alternative field labels. Staff-account edit permission and tag assignments remain unverified.

Source review found three pre-existing defects on the paths F8 touches (listed under "Decisions made during review"): restricted editors overwrite masked fields with their mask, identity handles reach masked viewers raw, and the tag routes accept another organization's or a nonexistent contact ID for unscoped actors.

Evidence is pinned to Hub `c6c2d5739572356239c4048c0f564f40b0768adc` and enumerated with source anchors in [research.md](research.md). Source is not runtime or deployment proof. Meeting reports and tentative names come from the parent [proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md). Separately sanitized live facts are in the [read-only evidence summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed 2026-11-16T19:20:30.051Z; names and personal account IDs are not copied here.

## TO-BE

Verify personal-account profile tagging and layout discoverability, preserve the independent modelo classification, and reuse supported profile fields to record an Instagram handle. Preserve tenant and personal-account boundaries, existing business records and effective permission scopes. New user-visible language must work in Spanish and English, and keyboard access must cover the same operations as pointer access.

## DELTA

Verification and configuration first: reuse TagsField and existing Additional/custom-property fields. US1 adds a same-organization contact existence check to the tag routes. If user evidence demonstrates a discoverability gap, add a translated profile-tags label/helper and an Instagram recording hint in the existing details edit flow; do not move the lifecycle card, rebuild the layout or add a new identity editor. The bounded masking and write-preservation repair is included in this data-tagged slice under owner spec approval; unrelated authorization defects need separately reviewed scope.

Required regression and browser oracles are in [quickstart.md](quickstart.md) and dependency-ordered in [tasks.md](tasks.md); these are future acceptance gates, not completed tests.

## Decisions made during review (owner to confirm)

1. **Pre-existing defect, fixed by F8: restricted editors overwrite masked fields.** On the pinned source a restricted editor (field level below `SENSITIVE_FIELD_LEVEL`) saving the details editor sends the masked phone, email and `telefono` back; `updateContact` stores the mask and replaces the phone identity with the mask's last digits. F8 makes every masked field read-only for restricted principals, enforced in `updateContact` and shown read-only in the editor. The merge resolver's masked override values are dropped for restricted principals. Behavior change: a gateway assistant acting for a restricted principal that sends `phone` or `email` now gets HTTP 403 `sensitive_fields_restricted` instead of writing them.
2. **Pre-existing defect, fixed by F8: identity handles reach masked viewers raw.** `getContact` and the roster mask identity `externalId` but not `handle`. F8 masks `handle` the same way, as the duplicate scan already does.
3. **Pre-existing defect, fixed by F8: tag routes accept foreign or nonexistent contacts.** For unscoped actors, apply/remove tag performs no contact existence or organization check, and a malformed ID returns raw database error text. F8 adds a same-organization, non-deleted contact check and returns HTTP 404 `Contact not found`.
4. **Fresh rows after a merge use the existing contacts API.** The earlier URL read-epoch design could not work, because `invalidate` reruns the loader with the last navigated URL, not the `replaceState` URL. Instead, the customer page fetches the current page from `GET /api/crm/contacts?fresh=1` (uncached ranking) and replaces its rows. Later navigation uses normal cached reads, which may show pre-merge rows for a bounded window if the merge's best-effort cache invalidation failed.
5. **Hygiene refresh reads the existing uncached duplicates endpoint.** A reload of the settings page can still serve cached duplicate groups for up to their cache lifetime; the server's participant check refuses merges of contacts that no longer exist.
6b. **Pre-existing defect, fixed by F8: party PATCH.** `PATCH /api/crm/parties/[id]` let restricted principals overwrite party phone and document, and its stale 409 returned unmasked email, document and phone. Restricted principals now get 403 `sensitive_fields_restricted` for those writes, and the 409 row is masked. `PATCH /api/crm/contacts/[id]` with `phone` from a restricted principal is also 403, matching the gateway.
7. **All F8 refusals reuse the existing `sensitive_fields_restricted` identifier** already used by custom-property access, instead of a new merge-specific code.

## Dependencies, Assumptions and Non-goals

Use current organization/account configuration only after an authorized identity and scope check; no production IDs are guessed or committed. Synthetic fixtures stand in for personal accounts and customer records. Existing semantics remain authoritative unless a regression proves a bounded gap. WhatsApp linking, messages, remote model calls, password changes and unrelated redesigns are excluded. No product code, production data or configuration has changed in this documentation stage.

## Approval and evidence boundary

This is data-tagged work. Owner approval of the concrete spec and any resolved configuration/data diff is required before implementation, and owner merge is required. Planning is authorized; those later gates are pending. Pending runtime observations have explicit verification-first/no-op-or-stop outcomes and are not treated as proven defects. Review results are recorded under egm/; no implementation, reproduction, release or live completion is claimed.

## Alternatives Considered

Reject a new clinical taxonomy or a new Instagram identity/integration record for manual display metadata. Reuse the existing PII key registry: register the two manual Instagram keys there, and make every registered key read-only for restricted principals through the existing writers. Detailed alternatives are in [research.md](research.md).

## Masked-field safety acceptance

A restricted editor can save an unrelated Additional value without changing any stored masked value (manual Instagram handle, phone, email, document) or the phone identity; this holds for omitted, null, case-variant, forged and round-tripped masked inputs. Masked fields are read-only for that principal and the manual Instagram keys cannot be created through a direct request. A permitted editor can change or remove them with the existing stale-write protection. A gateway name edit, including a stale response, never returns a raw masked value to a restricted delegated principal. No channel identity is created. The key sets and the atomic write policy are in [contracts/behavior.md](contracts/behavior.md); existing-property selection remains verification-first and cannot duplicate the Additional field.

Restricted manual creation through the contacts API or party quick-add strips the manual Instagram keys while preserving other input. A permitted creator can persist them and later restricted reads stay masked. Restricted merge requests cannot write masked keys through overrides; a merge involving any stored manual Instagram key refuses atomically until an authorized operator performs it. Existing tag/event/lifecycle semantics remain independent. This applies to the enumerated manual metadata entrypoints, not a new universal ingestion policy.
