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
6. **All F8 refusals reuse the existing `sensitive_fields_restricted` identifier** already used by custom-property access, instead of a new merge-specific code.

## Dependencies, Assumptions and Non-goals

Use current organization/account configuration only after an authorized identity and scope check; no production IDs are guessed or committed. Synthetic fixtures stand in for personal accounts and customer records. Existing semantics remain authoritative unless a regression proves a bounded gap. WhatsApp linking, messages, remote model calls, password changes and unrelated redesigns are excluded. No product code, production data or configuration has changed in this documentation stage.

## Approval and evidence boundary

This is data-tagged work. Owner approval of the concrete spec and any resolved configuration/data diff is required before implementation, and owner merge is required. Planning is authorized; those later gates are pending. Pending runtime observations have explicit verification-first/no-op-or-stop outcomes and are not treated as proven defects. Review results are recorded under egm/; no implementation, reproduction, release or live completion is claimed.

## Alternatives Considered

Reject a new clinical taxonomy or a new Instagram identity/integration record for manual display metadata. Reuse the existing PII key registry: register the two manual Instagram keys there, and make every registered key read-only for restricted principals through the existing writers. Detailed alternatives are in [research.md](research.md).

## Masked-field safety acceptance

A restricted editor can save an unrelated Additional value without changing any stored masked value (manual Instagram handle, phone, email, document) or the phone identity; this holds for omitted, null, case-variant, forged and round-tripped masked inputs. Masked fields are read-only for that principal and the manual Instagram keys cannot be created through a direct request. A permitted editor can change or remove them with the existing stale-write protection. A gateway name edit, including a stale response, never returns a raw masked value to a restricted delegated principal. No channel identity is created. The key sets and the atomic write policy are in [contracts/behavior.md](contracts/behavior.md); existing-property selection remains verification-first and cannot duplicate the Additional field.

Restricted manual creation through the contacts API or party quick-add strips the manual Instagram keys while preserving other input. A permitted creator can persist them and later restricted reads stay masked. Restricted merge requests cannot write masked keys through overrides; a merge involving any stored manual Instagram key refuses atomically until an authorized operator performs it. Existing tag/event/lifecycle semantics remain independent. This applies to the enumerated manual metadata entrypoints, not a new universal ingestion policy.

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: plan.md

# Implementation Plan: Discoverable persistent CRM profile classification and Instagram recording

**Branch**: Planned `129-crm-profile-followups` (not created) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: `specs/129-crm-profile-followups/spec.md`, proposal item F8.

## Summary

Scope is the spec's [DELTA](spec.md#delta): verification and configuration first, a tag contact-admission fix in US1, and the masked-key write repair and manual Instagram recording in US2, under the owner data and security approval gate. This plan adds the technical sequence only.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2.70.2; Bun per the Hub registry.
**Primary Dependencies**: Existing TagsField, OverviewCard and EditableGrid components; Drizzle PostgreSQL core, dataset and RBAC helpers. No new framework.
**Storage**: Existing org-scoped PostgreSQL records; viewer layout localStorage where already used. No schema migration.
**Testing**: Existing Vitest and mounted Svelte harnesses; local QA Postgres for tenant and policy qualification; Browser Harness for UI acceptance.
**Target Platform / Project Type**: Authenticated Hub web application, desktop and 390px mobile; installed-app use is an optional separately recorded check.
**Performance Goals**: Preserve existing bounded page reads; no per-row added fetch. The only new uncached read is the user-started fresh contacts page after a merge ([fresh-reconciliation.md](contracts/fresh-reconciliation.md)). No invented latency SLA.
**Constraints**: No broader permissions, unrelated WIP, production data writes, guessed identities or unrelated redesign. Owner approval before code/configuration, owner merge.
**Scale/Scope**: One proposal item, existing surfaces only; synthetic fixtures cover allowed, denied, owner-scoped and foreign personas.

## Constitution Check

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I Spec before code | Pass: specify stage precedes plan; no implementation | Pass: tasks follow plan; all tasks unchecked |
| II AS-IS / TO-BE / DELTA | Pass: pinned source plus reported/unproven distinction | Pass: oracles and execution stops stated |
| III Slice-scoped delivery | Pass: documentation only, no branch mutation | Pass: future isolated Hub checkout and PR to registry master; owner merge |
| IV Required gates | Pass: tokens, i18n, route/RBAC and browser requirements included | Pass: local QA and Hub checks required; not reported run |
| V Data/security human gates | Pass for planning only | Pending owner approval before implementation/configuration; gate is not waived |

Gate evaluation: review artifacts may be authored now; implementation is blocked until owner approval and runtime preconditions are met. No constitution exception is claimed.

## Project Structure

Documentation: spec.md; checklists/requirements.md; research.md; plan.md; data-model.md; contracts/behavior.md, client-compatibility.md, fresh-reconciliation.md and native-fixture.md; quickstart.md; tasks.md; implementation-inventory.md; design-review.md (generated). All under `specs/129-crm-profile-followups/`.

Hub source and test files, their actions and owning tasks are listed once, in [implementation-inventory.md](implementation-inventory.md). Commands are in quickstart.md and the inventory.

## Phase 0 — Evidence and reproduction

Re-read the source list in research.md on the candidate and record changes from the pin. Run the inventory and synthetic scenario in quickstart before editing code. Classify each requested behavior as supported, configuration-only, reproducible gap or unavailable evidence. Supported behavior needs verification, not reimplementation. An unexpected data/security defect outside [contracts/behavior.md](contracts/behavior.md) becomes a separately reviewed amendment.

## Phase 1 — Data model and contracts

Follow [data-model.md](data-model.md) and [contracts/behavior.md](contracts/behavior.md). Decisions, rationale and alternatives are in [research.md](research.md#decisions-rationale-and-alternatives). Propagate authorization through the source handle and sanitize outputs before they reach the browser; raw masked values must be absent from search, export and write responses as well as markup.

## Delivery slices

1. Inventory and reproduction, including forbidden and foreign controls, with no production writes.
2. User Story 1: tag contact admission (T018) plus verification of existing tagging and layout; wording only if reproduced.
3. User Story 2 in three buildable parts: masked-key update policy (T011), create/party/merge/gateway/loader (T019), client and fresh rows (T020); then the native fixture, suite and lanes (T017, T021, T012).
4. Candidate qualification and owner-reviewed release. Record local tests, CI, merge, deployment and post-merge runtime proof separately.

Each shipping slice runs its own gates:

- focused tests for the slice;
- for US2, the qa-native and crm-concurrent native lanes;
- `bun run check`, `bun run test`, `bun run build`;
- `bun run i18n:compile` after message changes and `bun run lint:design && bun run lint:tokens` after UI changes;
- Browser Harness acceptance;
- owner merge approval.

Commands and the route-contract note are in [quickstart.md](quickstart.md#full-qualification-and-result-recording).

## Masked-key and manual Instagram policy

The pinned details editor saves the masked projection back, so a restricted editor overwrites stored phone, email and `telefono` values and the phone identity. `CRM_PII_FIELD_KEYS` (`src/lib/pii.ts:20`) also lacks the manual Instagram keys. F8 registers those keys and makes every masked key read-only for restricted principals at the service layer, with a server-derived `canWriteSensitiveFields` option on every changed writer and no permissive default. The policy, signatures, storage-path choice and the gateway refusal are in [contracts/behavior.md](contracts/behavior.md). Never insert channel identities, connect accounts or send messages. Ordinary Vitest cannot prove concurrent SQL pre-image preservation; the qa-native suite does ([native-fixture.md](contracts/native-fixture.md)).

## Merge admission and feedback

`mergeContacts` gains a locked same-org participant check before any field read, a restricted refusal when a participant stores a manual Instagram key, and masked-override stripping ([behavior.md](contracts/behavior.md#merge-participant-admission)). Both merge hosts treat every outcome other than an acknowledgement or the known refusal as unknown and block further merges until a fresh read succeeds ([client-compatibility.md](contracts/client-compatibility.md)). The customer host's fresh read is the existing contacts GET with `fresh=1`; Hygiene's is the existing uncached duplicates GET ([fresh-reconciliation.md](contracts/fresh-reconciliation.md)).

## Existing host and caller compatibility

[client-compatibility.md](contracts/client-compatibility.md#required-existing-direct-test-callers) lists every existing direct test caller of the six changed signatures and the option value each passes. US2 qualifies two native lanes, each with its own report: the [existing crm-concurrent lane](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate) (seven behaviors) and the [qa-native Instagram suite](contracts/native-fixture.md) (nine behaviors). The native auth prerequisites, including the `service_role` ACL sentinel, come from F7's planned shared helper ([native-fixture.md](contracts/native-fixture.md#shared-f7-native-auth-prerequisite)); T017 waits for it. No runtime role or grant changes.

## Complexity and risks

No new framework, schema or generic architecture. Main risks: treating a supported feature or denied facet as a missing business fact, and the gateway behavior change for restricted assistants (spec decision 1). Configuration writes need owner-approved diffs and rollback evidence. Mocked storage does not prove RLS; real-database checks are required. This plan claims no reviewer verdict.

### Review artifact: research.md

# Research: Discoverable persistent CRM profile classification and Instagram recording

## Evidence baseline and reading list

Read the root AGENTS.md; pinned Hub AGENTS.md and its CLAUDE.md include; `.claude/skills/ui-design-governance/SKILL.md`; `.claude/skills/speckit-specify/SKILL.md`, `speckit-plan/SKILL.md`, `speckit-tasks/SKILL.md`; `.specify/memory/constitution.md`; the active spec, plan and tasks templates; and parent proposal item F8.

Hub source is the private pinned checkout `.local/faces-followups-2026-11-16/hub-source`, HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`, verified by git rev-parse. Source paths below are relative to Hub; links pin that commit. Meta registry reports Hub master and Bun. Framework behavior was read from the installed `minion_hub/node_modules/@sveltejs/kit` 2.70.2, the version in Hub `bun.lock:869`.

| Evidence | Source anchor | Finding / reading purpose |
| --- | --- | --- |
| R1 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:84`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L84) | Standard fields do not include Instagram; arbitrary nonreserved fields are Additional. |
| R2 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:228`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L228) | The details editor rebuilds customFields from the masked projection and sends `phone` from the masked WhatsApp identity (`stdValue`, :137-151). |
| R3 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:426`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L426) | Profile manual-tag POST/DELETE handlers and reload invalidation. |
| R4 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:932`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L932) | Lifecycle stage control and CRM TagsField; placement TODO refers to a separate proposal. |
| R5 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:1003`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L1003) | Identity card displays channel handle/externalId, read-only. |
| R6 | [`src/routes/(app)/crm/[contactId]/PageBody.svelte:1183`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/PageBody.svelte#L1183) | EditableGrid `crm-contact-detail-v2`, edit permission and admin default control. |
| R7 | [`src/lib/components/dashboard/EditableGrid.svelte:55`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/dashboard/EditableGrid.svelte#L55) | Account-scoped local storage and versioned layout; server defaults are distinct from user local state. |
| R8 | [`src/server/services/crm-contacts.service.ts:133`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/crm-contacts.service.ts#L133) | Synced identities store `handle` separately from contact metadata. For masked principals `getContact` (:1425-1428) and the roster (:1182-1186) mask `externalId` only; `handle` is returned raw, while `findDuplicates` masks both (`crm-cleanup.service.ts:422-431`). |
| R9 | [`src/routes/api/crm/contacts/[id]/tags/+server.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/%5Bid%5D/tags/+server.ts#L1) | Apply/remove delegate to `applyTag`/`removeTag` (`crm-contacts.service.ts:2044-2084`), whose `assertSimulatedRecordAccess` reads no row for unscoped actors; the POST catch forwards raw error text (:17-21). |
| R10 | [`src/routes/api/crm/contacts/[id]/+server.ts:50`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/%5Bid%5D/+server.ts#L50) | PATCH resolves `maskSensitive` (:53-56), sanitizes success and stale rows (:81-104). |
| R11 | [`src/routes/(app)/crm/[contactId]/+page.server.ts:45`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/%5BcontactId%5D/+page.server.ts#L45) | Loader resolves `ownerFilter` and `maskPii` (:49-53) and returns `crm` (:127-137); no edit hint today. |
| R12 | [`src/lib/pii.ts:20`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/pii.ts#L20) | `CRM_PII_FIELD_KEYS` excludes Instagram keys. |
| R13 | [`src/server/services/crm-contacts.service.ts:440`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/crm-contacts.service.ts#L440) | `rankContactsPageCached` wraps uncached `rankContactsPage` (:423) with `ttl: '2m'`, `swr: '1h'` (:466). Callers: [`crm/customers/+page.server.ts:98`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/crm/customers/+page.server.ts#L98), [`api/crm/contacts/+server.ts:77` and `:92`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/+server.ts#L77), and [`api/crm/contacts/export.csv/+server.ts:147`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/crm/contacts/export.csv/+server.ts#L147). All stay cached except the new `fresh=1` branch. |
| R14 | [`src/lib/components/crm/CrmHygiene.svelte:235`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/crm/CrmHygiene.svelte#L235) | Hygiene groups come from the `/crm/settings` loader via `findDuplicatesCached` (`settings/+page.server.ts:47`, `crm-cleanup.service.ts:51-58`). No client calls GET `/api/crm/cleanup/duplicates`. |
| R15 | [`src/server/services/custom-properties-access.ts:55`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/custom-properties-access.ts#L55) | `crm.customers` custom properties are hidden from restricted principals; refusal identifier `sensitive_fields_restricted` (:40). |

## Current behavior and uncertainty

The current behavior and its uncertainty are stated once, in the spec's [AS-IS](spec.md#as-is) section. The table above gives the anchors.

## Decisions, rationale and alternatives

Decision: verify existing tags rather than create a second classifier. Rationale: CRM TagsField already scopes to manual tags and routes persist links; lifecycleOverride is separate. Alternatives: storing modelo as lifecycle changes customer scoring semantics; an event tag does not persist the classification on the profile. Reuse a matching manual CRM tag and report conflicting same-name tags for owner resolution.

Decision: add a same-org contact lock to the tag routes (US1). Rationale: R9 shows unscoped actors reach the insert with any contact ID, and the contact foreign key does not apply row security. Alternative: stop US1 pending an amendment; rejected because the fix reuses the merge admission helper F8 already needs.

Decision: manual Instagram recording uses the current profile editor, after inspecting org custom properties and existing Additional keys. Prefer an existing `crm.customers` property (R15 already hides it from restricted principals); otherwise qualify the Additional editor with a manual Instagram key. Alternatives: a standard instagram column or identity editing invents schema/identity behavior beyond the meeting. No remote Instagram API, validation claim or messaging authorization is implied.

Decision: make every masked key read-only for restricted principals in `updateContact`, not only Instagram. Rationale: R2 and `crm-contacts.service.ts:1736-1747` show restricted saves already overwrite phone, email and the phone identity with masks; registering Instagram as masked without this would add a fourth corrupted field. Alternative: detect mask bullets in values; rejected because a value's content is not authority.

Decision: refresh merge hosts with existing uncached GETs, not loader invalidation. Rationale: `replaceState` does not change the URL `invalidate` reloads (kit `client.js:417-426`, `:2551-2583`). Alternative: `goto(url, {replaceState: true, invalidate: [...]})` with an epoch; rejected as larger and still needing a server marker.

Decision: keep the layout and add only bounded wording/help if a personal-account walkthrough reproduces a discoverability issue. EditableGrid persists viewer-specific versioned layout in localStorage; same-browser reload is provable, cross-device sync is not.

## Cross-cutting design decisions

Use existing Svelte 5 components and semantic design tokens; no generated token CSS editing. User-visible labels go through Paraglide catalogs and `bun run i18n:compile`. Existing routes keep route-design-manifest and RBAC coverage; no route or module is created. Dataset denial, owner scoping and field masking are tested before serialization and in rendered UI; hiding controls alone is insufficient. Keep source-code and production/configuration evidence distinct.

## Review limits and execution preconditions

No browser, product test, production configuration write or implementation was performed for this item. No account or contact identity is inferred from meeting spelling. The reading list shows inspectable implementation behavior, not an exhaustive security audit. The orchestrating session supplied live read-only evidence, finalized as a repeatable-read app_ledger snapshot at 2026-11-16T19:20:30.051Z, summarized in the [sanitized summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json); private identities and raw records are not reproduced. Source and live-record evidence do not prove browser behavior or deployed source identity. Approval remains pending.

## Write-path evidence

`crm-contacts.service.ts:1587-1620` distinguishes whole-namespace replacement (`customFieldsMergeSql`) from partial merge (`customFieldsPatchSql`); only reserved keys are preserved today. Both helpers are exported and called directly by tests (`crm-contacts.service.test.ts:175-199`, `crm-contacts.custom-fields.test.ts:156-184`). The PATCH route resolves the principal's mask and sanitizes success/stale rows; the loader resolves the mask but returns no edit hint (`+page.server.ts:45-68,127-137`).

The other `updateContact` caller is `api/gateway/actions/contact-update/+server.ts:67-99`. It writes `phone` and `email` for the delegated principal and returns success and stale rows unsanitized. Its `requireAssistantCapability` result carries the delegated principal's capabilities (`api/gateway/_shared/action-auth.ts:8-32`). An existing real-handler test harness is `src/routes/api/gateway/actions/contact-update.server.test.ts` (PGlite, `fieldLevel: () => 0` at :94).

## Create/merge source evidence

The only production `createContact` caller is POST `api/crm/contacts/+server.ts:116-131`; its schema accepts arbitrary customFields and `createContact` (:1541-1560) inserts them and returns a raw row. POST `api/crm/parties/+server.ts:63-82,128-150` accepts customFields, strips reserved keys and calls the only production `ensureContactFacetForParty` caller (`party.service.ts:182-215`). POST `api/crm/cleanup/duplicates/+server.ts:21-40` is the only production `mergeContacts` caller and accepts arbitrary customFields overrides; `mergeContacts` (`crm-cleanup.service.ts:439-532`) backfills loser metadata, applies overrides and hard-deletes losers (:527-531). It relies on `assertSimulatedRecordAccess` (:453-455), which is not an existence check for unscoped actors, and writes no audit row. `crm-contact-ensure.ts:102-112` creates identities without arbitrary metadata and is not a manual edit path. These are source findings and planned regressions, not executed fixes.

The native suite and the existing crm-concurrent lane are described in [native-fixture.md](contracts/native-fixture.md) and [client-compatibility.md](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate). The `service_role` ACL sentinel comes from F7's planned shared helper and must exist before baseline grants.

### Review artifact: data-model.md

# Data model: Discoverable persistent CRM profile classification and Instagram recording

Existing manual CRM tag and contact-tag link persist classification; event-scope tag links and lifecycleOverride are independent entities. Existing contact.customFields holds arbitrary nonreserved Additional values and reserved server metadata; customProperties is a separate property bundle. Existing crm_contact_identities has channel, externalId and handle; manually recording Instagram MUST NOT create an identity. The execution record selects exactly one existing field/property path and records conflict resolution privately. Existing layout key dash:layout:crm-contact-detail-v2 is scoped through preferenceOwner/preferenceKey and stores version 1 locally; the server default is not the personal persisted layout. No new schema, tag taxonomy, lifecycle stage or synchronization state.

## Validation and lifecycle

All existing validation, enum and permission rules remain binding. No source record is manufactured from display text. Apply read-only projection tests and the no-op/stop outcomes before any write. Forbidden states are in [contracts/behavior.md](contracts/behavior.md); real-database proof is in [quickstart.md](quickstart.md). A proposed shape is not a claim of existing persisted schema.

## Field sets and write policy

The key sets (manual Instagram keys, masked keys, reserved keys) are defined in [contracts/behavior.md](contracts/behavior.md#terms). The manual Instagram key stored is an existing matching key's spelling, or `instagram_handle`; any other Instagram-like key stops for owner selection and is never migrated automatically.

Restricted principals carry a server-derived `{ canWriteSensitiveFields: false }` on `updateContact`, `createContact`, `ensureContactFacetForParty` and `mergeContacts`; no request field supplies it. Effects:

- `updateContact`: stored masked and reserved keys survive atomically in both SQL forms; submitted masked keys and `phone` are ignored.
- `createContact`, `ensureContactFacetForParty`: manual Instagram keys are removed before insert.
- `mergeContacts`: refuses when any locked participant stores a manual Instagram key; otherwise masked override keys are removed.

Authorized whole-namespace omission deletes a key; authorized partial null stores null. No masked projection is authoritative state. The loader's `crm.canEditSensitiveFields` boolean is a display hint, not persisted permission. Audit entries record the filtered input, not discarded values. Gateway success/stale serialization runs the PII sanitizer under the delegated principal's field level.

## Contact admission

Tag apply/remove and merge lock their contact IDs with one same-org, non-deleted `FOR UPDATE` query and require the returned ID set to equal the requested set; malformed, missing, foreign, deleted and unowned IDs all return 404 `Contact not found`. Merge additionally takes `ownerId: string | null` from the route's `ownerFilter`, never the payload. A completed merge hard-deletes losers, so a repeat is a 404 with zero effects; uncertain transport is reconciled by a fresh read, not claimed rolled back. No tombstone, operation table or audit row is added.

## Fresh reads

The only wire addition for freshness is `fresh=1` on the existing contacts GET and the `fresh: true` key in its response ([contracts/fresh-reconciliation.md](contracts/fresh-reconciliation.md)). It is a cache selector, not a permission, receipt or persisted state. Client merge intent is discarded after an unknown outcome and never persisted.

### Review artifact: contracts/behavior.md

# Behavior contract: Discoverable persistent CRM profile classification and Instagram recording

Keep the existing POST /api/crm/contacts/[id]/tags {tagId} and DELETE ?tagId contracts; only CRM manual tags may be edited and all effective owner/edit policies must hold server-side. Existing PATCH contact accepts customFields; serialize a sanitized result. If an org custom property is chosen for the handle, keep its existing custom-property API rather than duplicating into customFields. A manual Instagram value is plain profile metadata, not an authenticated channel identity or a link to send a message. The synchronized identity card stays read-only. UI label/help distinguishes profile tags, event tags, lifecycle and the manual Instagram field without changing the saved layout.

## Terms

Each term below names one concept and is used only with this meaning in this feature package.

| Term | Definition |
|---|---|
| manual Instagram keys | Exactly `instagram` and `instagram_handle`, matched case-insensitively; exported as `CRM_MANUAL_INSTAGRAM_FIELD_KEYS` in `src/lib/pii.ts`. |
| masked keys | Every key in `CRM_PII_FIELD_KEYS` (`src/lib/pii.ts:20`), matched case-insensitively. F8 adds the two manual Instagram keys to that set, so they are masked keys too. |
| reserved keys | `_`-prefixed system-owned keys (`isReservedMetaKey`). Their handling is unchanged by F8. |
| restricted principal | A principal for whom `await shouldMaskSensitive(locals, 'crm')` is true (CRM field level below `SENSITIVE_FIELD_LEVEL` = 1, `src/lib/permissions.ts:127`). The server passes `{ canWriteSensitiveFields: false }` for it. |
| authorized principal | The opposite case; the server passes `{ canWriteSensitiveFields: true }`. |
| refusal identifier | `sensitive_fields_restricted`, the existing message already thrown by `requireCustomPropertyAccess` (`src/server/services/custom-properties-access.ts:40`). Every F8 refusal uses it via `error(403, 'sensitive_fields_restricted')`, which SvelteKit serializes as `{"message":"sensitive_fields_restricted"}`. |

## Admission and failure semantics

Resolve authenticated organization context first, then the module/dataset and contextual route policy; owner-scoped and foreign IDs must not leak existence. Apply masking before serialization and after writes. A denied facet is not an empty business fact; an unavailable read is not proof of missing records. Never retry a committed save because a refresh failed. Existing status/error conventions stay, except where this contract names a status. All writes and configuration actions remain owner-approval gated. No new route, schema migration or background synchronization is added.

## Tag apply/remove contact admission (US1)

At the pin, `applyTag`/`removeTag` (`crm-contacts.service.ts:2044-2084`) rely on `assertSimulatedRecordAccess`, which returns without reading any row for an unscoped actor (`simulated-record-scope.ts:86-100`). `applyTag` then inserts `crm_contact_tags` with the caller's org and the supplied contact ID; the contact foreign key (`schema.sql:7892-7893`) references `crm_contacts(id)` only, and PostgreSQL foreign-key checks do not apply row security. A malformed ID reaches SQL and the POST route returns the raw database message as HTTP 400 (`tags/+server.ts:17-21`). This is source evidence; it has not been reproduced at runtime.

Fix, in `crm-contacts.service.ts`:

- Add exported `lockContactsInOrg(tx: CoreTx, ctx: CoreCtx, ids: string[], ownerPredicate: SQL | undefined): Promise<string[]>`. It rejects any ID that is not a UUID, lowercases and sorts the distinct IDs, runs `select id from crm_contacts where org_id = ctx.tenantId and id in (…) and deleted_at is null [and ownerPredicate] order by id for update`, and requires the returned array to equal the requested array. Any mismatch or malformed ID throws `error(404, 'Contact not found')` before any other SQL.
- `applyTag` and `removeTag` call `lockContactsInOrg(tx, ctx, [contactId], undefined)` first, then the existing `assertSimulatedRecordAccess` (which keeps owner scoping for scoped actors).
- `applyTag` throws `error(400, 'tag is not a customer tag of this org')` and `error(400, 'tag is rule-based and cannot be applied by hand')` for its two existing tag checks.

In `src/routes/api/crm/contacts/[id]/tags/+server.ts`: `postSchema.tagId` becomes `z.string().uuid()`; DELETE returns the existing HTTP 400 `tagId is required` when `tagId` is absent or not a UUID; the POST `catch` rethrows HTTP errors and no longer forwards `e.message` from other errors (they become the default 500). `applyTagBulk` is unchanged: its only caller (`api/crm/tags/[id]/evaluate/+server.ts:94`) passes server-derived IDs.

## Masked-key write contract (`updateContact`)

The pinned details editor rebuilds the whole customFields namespace from the masked projection (`[contactId]/PageBody.svelte:228-261`), and `stdValue('phone')` returns the masked WhatsApp identity value. A restricted editor's save therefore sends `phone`, `telefono` and `email` masks, and `updateContact` (`crm-contacts.service.ts:1736-1747`) deletes the phone identity and inserts the mask's digits. Masking alone does not fix this; the write path must ignore masked values from restricted principals.

Signatures (the final options argument is required; there is no default):

```ts
updateContact(ctx, id, data, expectedUpdatedAt: Date | undefined, options: { canWriteSensitiveFields: boolean })
customFieldsMergeSql(clientFields: Record<string, unknown>, options: { canWriteSensitiveFields: boolean }): SQL
customFieldsPatchSql(clientFields: Record<string, unknown>, options: { canWriteSensitiveFields: boolean }): SQL
```

Callers derive the option on the server only; no request schema accepts it:

- PATCH `/api/crm/contacts/[id]` passes `!maskSensitive`, the value its handler already awaits (`[id]/+server.ts:53-56`).
- Gateway `contact-update` passes `capabilities.fieldLevel('crm') >= SENSITIVE_FIELD_LEVEL` from its `requireAssistantCapability` result (the delegated principal, never the gateway transport account).

With `canWriteSensitiveFields: true`, behavior and generated SQL text are identical to the pin. With `false`:

| Input | Effect |
|---|---|
| `customFields` (whole namespace) | Submitted masked keys and reserved keys are removed. The UPDATE keeps every stored masked key and reserved key from its pre-image: the preserved subquery becomes `where left(key, 1) = '_' or lower(key) = any(<masked key array>)`. Other stored keys keep whole-namespace semantics (omitted means removed). |
| `customFieldsPatch` (partial) | Submitted masked keys and reserved keys are removed; every other stored key is untouched, as today. |
| `phone` | Ignored: no phone identity delete or insert. |
| `displayName`, `ownerId`, `lifecycleOverride`, `dob` | Unchanged semantics. |

Omitted, null, empty, case-variant, forged raw and round-tripped masked values cannot create, replace or delete a stored masked value; an absent stored masked key stays absent. This is one atomic UPDATE, never a read followed by a JS spread. Stale, owner and org predicates stay on the same UPDATE. The audit entry records the filtered input, so discarded values are never logged as applied changes. Authorized editors keep explicit replace/delete semantics and expectedUpdatedAt conflicts: clearing is omission from the authorized whole namespace, while a partial `null` stores null.

Gateway `contact-update`: a restricted delegated principal whose body sets `phone` or `email` receives HTTP 403 `sensitive_fields_restricted` before preview or write; a name-only edit proceeds with `false`. Its success `contact` and stale `current` rows (`contact-update/+server.ts:67-99`, which are raw at the pin) pass `customFields` through `sanitizeContactFields(fields, !canWriteSensitiveFields)`. No Instagram request field is added.

Editor (`[contactId]/PageBody.svelte`): the loader returns `crm.canEditSensitiveFields = !maskPii` (`[contactId]/+page.server.ts:49-53`); this is a display hint, not a permission. When false, the phone and email standard rows and every Additional row whose key is a masked key render read-only with message `crm_sensitive_fields_read_only`; `saveDetails` omits `phone` and masked keys from the body; a new Additional key that is a masked key is not added and shows the same message beside the key input. The server stays authoritative for direct requests.

## Manual Instagram keys and storage path

Add `CRM_MANUAL_INSTAGRAM_FIELD_KEYS` to `CRM_PII_FIELD_KEYS`. Inspect existing data first, then choose one storage path:

1. An existing `crm.customers` custom property for Instagram: record the handle there. That table already hides all CRM custom properties from restricted principals (`custom-properties-access.ts:55`, policy `custom-properties.service.ts:78`); prove it with a restricted read in `custom-property-bundle.service.test.ts`.
2. Otherwise a stored Additional key equal to one of the two manual Instagram keys: reuse that spelling.
3. Otherwise `instagram_handle`.

Any other stored key that looks like an Instagram field (for example `ig` or `Instagram Handle`) is not registered and not migrated: stop and record it for owner selection. Every row in [implementation-inventory.md](implementation-inventory.md) is implemented whichever path is chosen; the masked-key policy fixes the pre-existing defect above and protects any imported manual Instagram key.

## Serialization

`sanitizeContactFields` covers the masked keys in roster, detail, hygiene, export, PATCH success and `StaleWriteError.current`. Identity `handle` is masked like `externalId` for restricted principals in `getContact` (`crm-contacts.service.ts:1425-1428`) and in the roster mapping (`crm-contacts.service.ts:1182-1186`), matching `maskIdentities` in `crm-cleanup.service.ts:422-431`. Sanitized responses and UI projections are never a write pre-image.

## Manual create and merge

`src/lib/pii.ts` adds two pure helpers, used by every caller below:

```ts
omitMaskedFields(fields: Record<string, unknown>): Record<string, unknown>
omitManualInstagramFields(fields: Record<string, unknown>): Record<string, unknown>
```

| Service | Signature | Single production caller |
|---|---|---|
| `createContact` (`crm-contacts.service.ts`) | `createContact(ctx, data, options: { canWriteSensitiveFields: boolean })` | POST `/api/crm/contacts` (`+server.ts:122-131`), passing `!(await shouldMaskSensitive(locals, 'crm'))` |
| `ensureContactFacetForParty` (`party.service.ts`) | `ensureContactFacetForParty(ctx, partyId, data, options: { canWriteSensitiveFields: boolean })` | POST `/api/crm/parties` (`+server.ts:128-150`), same derivation |
| `mergeContacts` (`crm-cleanup.service.ts`) | `mergeContacts(ctx, survivorId, loserIds, overrides: { displayName?: string; customFields?: Record<string, unknown> } \| undefined, options: { canWriteSensitiveFields: boolean; ownerId: string \| null })` | POST `/api/crm/cleanup/duplicates`, same derivation plus `ownerId: (await ownerFilter(locals, 'crm')) ?? null` |

Create, restricted: the service applies `omitManualInstagramFields` before `.values`; other keys create normally (a new contact has no stored value to mask). Authorized creators can store the manual Instagram keys. POST contacts keeps `{contact}` and status 201 and passes the returned customFields through `sanitizeContactFields`; the party response keeps its shape. Identity and auto-assignment behavior are unchanged; no Instagram identity is created.

Merge, restricted: after participant admission (below), if any locked participant stores a manual Instagram key (including null or empty) the service throws `error(403, 'sensitive_fields_restricted')` with zero identity, tag, activity or contact effects. Otherwise `overrides.customFields` passes through `omitMaskedFields` and the existing merge runs. Authorized merges keep their backfill and conflict choices. Row locks are taken before the field check for both principals, so a concurrent authorized handle update either commits before the check (the restricted merge refuses) or waits for the merge.

## Merge participant admission

`assertSimulatedRecordAccess` is not an existence check for unscoped actors. `mergeContacts` keeps its delete capability check and adds, in one `withOrgCore` transaction before any field read or mutation:

1. A nonnull `ownerId` must equal `ctx.profileId`; otherwise HTTP 404 `Contact not found`.
2. Losers are lowercased, deduplicated and stripped of the survivor ID.
3. `lockContactsInOrg(tx, ctx, [survivorId, ...losers], ownerPredicate)`, where `ownerPredicate` is `ownerId` equality combined with `simulatedMutationPredicate(ctx, 'crm', 'edit', crmContacts.ownerId)` by `and`. Malformed, missing, foreign, deleted, unowned or inaccessible participants return HTTP 404 `Contact not found` with zero effects; a hidden row's field state never influences the response.
4. With no losers left, return the existing `{ok:true}` after the survivor passes step 3, with zero effects.
5. Otherwise read `custom_fields` for the locked IDs, apply the restricted check above, then run the existing merge under the retained locks, ending with the loser hard delete (`crm-cleanup.service.ts:527-531`).

`mergeContacts` writes no audit row at the pin and F8 adds none. Repeating a successful merge returns HTTP 404 because the losers are gone; that 404 does not prove rollback. Clients reconcile by reading fresh data and never retry automatically. No merge-operation store is added.

## Regressions

Each bullet is one required case; assert before/after rows of every affected table, not the response alone.

- Tags: unscoped editor with foreign-org contact, random UUID, soft-deleted contact and malformed ID each get 404 with zero `crm_contact_tags` changes; malformed `tagId` gets 400; no response contains database text.
- Restricted whole-namespace save of `{instagram_handle, telefono, email, distrito, _funnel}` changing only `distrito`: masked keys, `_funnel` and the phone identity are unchanged.
- Restricted partial patch with masked keys: masked keys unchanged, other submitted keys applied.
- Restricted masked inputs omitted, null, empty, case-variant, forged and absent-before-write: no masked key created, replaced or deleted.
- Authorized replace, whole-namespace removal and partial null keep pinned semantics.
- Gateway restricted `phone` or `email`: 403 `sensitive_fields_restricted`, zero writes; restricted name edit: success and stale responses masked; authorized counterpart unchanged.
- Restricted and authorized create through contacts POST and party quick-add with raw, masked, null and case-variant manual Instagram keys.
- Merge admission for restricted and authorized, unscoped and scoped principals: missing survivor, foreign survivor, missing loser, foreign loser, mixed subset, unowned participant, duplicate loser, self loser, empty losers with valid survivor, empty losers with missing survivor, repeated merge, malformed ID.
- Restricted merge with a manual Instagram key on the survivor, on a loser, and only on a hidden row; restricted merge whose overrides carry masked keys.
- Concurrent participant deletion and concurrent authorized handle update, in both lock orders, against real row locks.

The client contract for the refusal and for refreshing after a merge is in [client-compatibility.md](contracts/client-compatibility.md).

### Review artifact: contracts/client-compatibility.md

# Merge feedback and existing caller compatibility

This is the service-to-route-to-host path for the merge refusal and for uncertain merge outcomes. Terms (restricted principal, masked keys, refusal identifier) are defined in [behavior.md](contracts/behavior.md#terms). Existing tag/lifecycle behavior is preserved and no request supplies field authority.

## One refusal, both hosts

The service throws `error(403, 'sensitive_fields_restricted')`; the POST cleanup/duplicates route has no `catch`, so SvelteKit returns HTTP 403 `{"message":"sensitive_fields_restricted"}` (installed kit 2.70.2, `src/runtime/server/utils.js:75-105`, JSON when the request accepts `application/json`). Participant admission fails with 404 before this check, so the refusal cannot probe field state.

`applyContactMerge` in `src/lib/components/crm/crm-merge.ts` keeps its payload and `Promise<void>` success contract and sends `accept: application/json`:

- HTTP 200 with a parsed body equal to `{ok:true}`: resolve.
- HTTP 403 with `message === 'sensitive_fields_restricted'`: throw exported `CrmMergeSensitiveFieldsRestrictedError`; exported guard `isCrmMergeSensitiveFieldsRestricted(error: unknown)`.
- Anything else (transport loss, abort, redirect, malformed or missing acknowledgement, any other status including 5xx): throw exported `CrmMergeOutcomeUnknownError`.

Errors carry fixed messages only; no server text or JSON is forwarded. A 500 is not proof of no effects: the merge may have committed.

## Merge phases at both hosts

`runMerge` in `CrmHygiene.svelte` and in `crm/customers/PageBody.svelte` own one `mergePhase` each, separate from the transient `merging`/`bulkBusy` flag. Phases: `idle`, `submitting`, `definite_refusal`, `unknown`, `refreshing`, `refresh_failed`, `selection_required`, `acknowledged_refresh_failed`. `finally` releases only the busy flag. `runMerge` returns immediately unless the phase is `idle`, `selection_required` or `definite_refusal`, which also covers double clicks and direct callback calls. While `refreshing`, the host records the origin (`unknown` or `acknowledged`), which decides the failure phase.

"Required read" is, for the customer host, the fresh contacts page read in [fresh-reconciliation.md](contracts/fresh-reconciliation.md); for Hygiene, the fresh duplicate-groups read below. Hygiene never takes the acknowledged path, because its existing success marks the group done without a reload.

| From phase | Event | Next phase | Feedback key | Merge POST | Refresh contacts action |
|---|---|---|---|---|---|
| `idle` or `selection_required` | User confirms an explicit selection | `submitting` | none | One POST is sent | Hidden |
| `definite_refusal` | User confirms again or confirms another selection | `submitting` | none | One POST is sent | Hidden |
| `definite_refusal` | User closes the resolver | `idle` | none | Allowed after a new Confirm | Hidden |
| `submitting` | HTTP 200 `{ok:true}`, Hygiene host | `idle`; group marked done, pending intent cleared | existing success | Allowed after a new Confirm | Hidden |
| `submitting` | HTTP 200 `{ok:true}`, customer host | `refreshing` (origin `acknowledged`); selection cleared, resolver closed | none | Blocked | Disabled |
| `submitting` | HTTP 403 `sensitive_fields_restricted` | `definite_refusal` | `crm_merge_sensitive_fields_restricted` | Allowed after a new Confirm | Hidden |
| `submitting` | Any other outcome | `unknown`; pending group, resolution and selection discarded | `crm_merge_outcome_unknown` | Blocked | Enabled |
| `unknown` or `refresh_failed` | User selects Refresh contacts | `refreshing` (origin `unknown`) | unchanged | Blocked | Disabled |
| `refreshing` (origin `unknown`) | The required read is accepted | `selection_required` | `crm_merge_outcome_unknown` stays shown | Allowed after a new Confirm | Hidden |
| `refreshing` (origin `unknown`) | The required read fails, is denied, malformed, unmarked or superseded | `refresh_failed` | `crm_merge_refresh_failed` | Blocked | Enabled |
| `refreshing` (origin `acknowledged`) | The required read is accepted | `idle` | existing success | Allowed after a new Confirm | Hidden |
| `refreshing` (origin `acknowledged`) | The required read fails, is denied, malformed, unmarked or superseded | `acknowledged_refresh_failed` | `crm_merge_applied_refresh_failed` | Blocked | Enabled |
| `acknowledged_refresh_failed` | User selects Refresh contacts | `refreshing` (origin `acknowledged`) | unchanged | Blocked | Disabled |
| Any phase | Unmount or account switch | Host state discarded; a fresh mount starts at `idle` after its load | none | Allowed after a new Confirm | Hidden |

Closing or reopening the resolver changes no phase except `definite_refusal`. A failed refresh after an acknowledged POST never enters `unknown` or `refresh_failed` and never offers a POST retry. No transition sends a POST by itself; there is no retry timer or GET-to-POST continuation.

`CrmMergeResolver.svelte` stays presentational: `onConfirm` returns void and it performs no fetch. New props: `confirmBlocked: boolean` (default false), `reconciling: boolean` (default false) and `onReconcile?: () => void`. Confirm is disabled when busy, `confirmBlocked` or `!canMerge`, and `confirm()` repeats that guard. Its translated refresh action calls only `onReconcile` and is disabled while `reconciling`. Each host also shows the latched status and the Refresh contacts action in its existing merge/error region, so closing the modal never hides the only refresh control; both actions call the same read-only handler. `openMerge` refuses to reuse a pending group or resolution while latched.

## Messages

| Key | English | Spanish |
|---|---|---|
| `crm_merge_sensitive_fields_restricted` | This merge needs access to sensitive profile fields. | Esta combinación requiere acceso a campos sensibles del perfil. |
| `crm_merge_outcome_unknown` | The merge result is unconfirmed. Refresh before selecting contacts again. | El resultado de la combinación no está confirmado. Actualiza antes de volver a seleccionar contactos. |
| `crm_merge_applied_refresh_failed` | The merge completed. Refresh to load the latest contacts. | La combinación se completó. Actualiza para cargar los contactos recientes. |
| `crm_merge_refresh_failed` | Refresh failed. Merging remains blocked. | No se pudo actualizar. La combinación sigue bloqueada. |
| `crm_merge_refresh_contacts` | Refresh contacts | Actualizar contactos |
| `crm_sensitive_fields_read_only` | Only roles with access to sensitive fields can edit this value. | Solo los roles con acceso a campos sensibles pueden editar este valor. |

The Spanish strings use "combinación", the noun the existing catalog uses for this feature (`messages/es.json:1425-1428`, `:1741`). No technical identifiers or private details appear in any message.

## Hygiene fresh duplicate groups

At the pin, CrmHygiene's `groups` prop comes from the `/crm/settings` loader through `findDuplicatesCached` (`crm/settings/+page.server.ts:47`, `crm-cleanup.service.ts:51-58`: TTL 2m, SWR 30s, CRM domain tag). No client code calls GET `/api/crm/cleanup/duplicates`; that existing route already runs uncached `findDuplicates` with `ownerFilter` and masking.

F8 adds `fetchFreshMergeGroups(): Promise<DupGroup[]>` to `crm-merge.ts`. It calls that GET with `cache: 'no-store'`, rejects redirects and non-OK responses, and validates the `{groups: DupGroup[]}` envelope; failures throw a fixed-message error. The route adds `Cache-Control: private, no-store` to its successful response. On an accepted read Hygiene replaces `groupRows` (all `done: false`), clears `pendingGroup` and the resolution, and closes the resolver. It never marks a group done after an unknown outcome.

A reload of the settings page may still serve cached groups until the merge's best-effort tag invalidation or the cache lifetime catches up. That is accepted: participant admission in [behavior.md](contracts/behavior.md#merge-participant-admission) refuses a merge of contacts that no longer exist. An absent group, a later 404 or a successful refresh is not proof that the earlier merge committed or rolled back, so the unknown feedback stays shown in `selection_required`.

## Mounted host regressions

`CrmHygiene.merge.mounted.test.ts` and customers `page.merge.mounted.test.ts` drive the real resolver callback. Cases, each its own test:

- known refusal shows `crm_merge_sensitive_fields_restricted` and allows a new Confirm;
- transport loss, malformed acknowledgement and a 500 each latch `unknown`;
- modal close/reopen and a direct repeated callback do not clear the latch;
- two refresh clicks issue one read at a time;
- a failed, denied or malformed read leaves `refresh_failed`;
- a read that resolves after an account change or a newer read is ignored;
- an accepted read enters `selection_required`, and only a new explicit selection sends a second POST;
- customer host only: acknowledged POST followed by a failed read shows `crm_merge_applied_refresh_failed` and sends zero further POSTs;
- Hygiene only: no done marker without an acknowledgement, and fresh groups replace old rows.

Every unknown and failed-refresh case asserts exactly one POST. `crm-merge.test.ts` covers the helper's three outcomes and that no server text leaks.

## Required existing direct test callers

The new options are required in existing tests too. Search production and test call sites of all six changed signatures (`updateContact`, `customFieldsMergeSql`, `customFieldsPatchSql`, `createContact`, `ensureContactFacetForParty`, `mergeContacts`) before declaring type compatibility. Never repair a caller by making an option optional.

| File | Calls at the pin | Arguments after F8 |
|---|---|---|
| `src/server/services/crm-contacts.custom-fields.test.ts` | 12 `updateContact` calls (lines 203, 224, 243, 265, 268, 282, 299, 320, 323, 358, 374, 414); `customFieldsPatchSql`/`customFieldsMergeSql` at 156, 167, 174, 183, 184 | Every existing call passes `{ canWriteSensitiveFields: true }`; `updateContact` passes `undefined` as the stale argument where absent. These tests assert authorized whole/partial semantics, including email writes. New restricted cases pass `false`. |
| `src/server/services/crm-contacts.service.test.ts` | `customFieldsMergeSql` at 175, 188, 199 | `{ canWriteSensitiveFields: true }`; the SQL text assertions stay unchanged. Add `false` cases asserting the masked-key preservation clause. |
| `src/server/services/audit-coverage.test.ts` | `updateContact` at 199, `createContact` at 224 | `{ canWriteSensitiveFields: false }` (`updateContact` stale argument `undefined`); payloads are `displayName` only, so audit and transaction assertions are unchanged. |
| `src/server/services/simulated-record-mutations.test.ts` | `updateContact` at 370-422, `createContact` at 345 and 432, `mergeContacts` at 483, `ensureContactFacetForParty` at 566 | `{ canWriteSensitiveFields: false }` everywhere; `mergeContacts` gets `undefined` overrides and `{ canWriteSensitiveFields: false, ownerId: actorId }` for its owner-scoped fixture, or `ownerId: null` for an unscoped fixture. Owner, foreign, edit and stale denial assertions are unchanged. |
| `src/server/services/crm-funnel.concurrent.integration.test.ts` | `updateContact` at 407 | stale argument `undefined`, then `{ canWriteSensitiveFields: false }`. Its `favoriteColor` patch is not a masked key, so the seven behaviors are unchanged. |
| `src/routes/api/crm/parties/server.test.ts` | `toHaveBeenCalledWith` at 207 asserts exactly three `ensureContactFacetForParty` arguments | Add the fourth argument `{ canWriteSensitiveFields: <value the mocked shouldMaskSensitive implies> }`. |
| `src/routes/api/gateway/actions/contact-update.server.test.ts` | Capabilities mock `fieldLevel: () => 0` at 94; email writes at 304-390 | Existing email-write tests switch to `fieldLevel: () => 1` (authorized); add restricted cases expecting 403 for `phone`/`email` and masked responses for a name edit. |

## Existing crm-concurrent lane remains separate

`crm-funnel.concurrent.integration.test.ts` belongs to `NATIVE_POSTGRES_MANIFEST['crm-concurrent']` with `minimumAssertions: 7`. Keep its seven requiredBehaviors and `vitest.crm-concurrent-postgres.config.ts`; do not move it into qa-native. Ordinary Vitest excludes it, and the qa-native Instagram suite does not cover it.

Provision a separately owned loopback fixture from the CI `crm-funnel-concurrent-postgres` recipe and its `supabase/ci-fixtures/crm-funnel-concurrent.sql`. Locally, start a container from image `postgres:15` (`ci.yml:214`) with `POSTGRES_USER=minion_qc` and `POSTGRES_DB=minion_qc`; its initial superuser is then `minion_qc` (CI's is `postgres`). Create a `minion_qc_crm_concurrent_<32hex>` database, set its `minion-360-disposable:v1` marker, and admit it with `openDisposablePostgres({MINION_QC_DISPOSABLE:'1', MINION_QC_DATABASE_URL: F8_CRM_CONCURRENT_URL})` before fixture DDL. The URL uses literal `127.0.0.1` or `[::1]`, an explicit port, user `minion_qc`, no query or hash. Verify `pg_roles.rolsuper = true` for `minion_qc`. If `app_ledger` is absent, create it `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS`; if present, verify those attributes. Never ALTER a shared role or reset shared QA. Keep the CI job's `app_ledger` cross-org negative control.

Set `HUB_TEST_DB_URL` explicitly (never local `SUPABASE_DB_URL` or production dotenv) and run the whole lane:

```bash
HUB_TEST_DB_URL="$F8_CRM_CONCURRENT_URL" REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 bun --no-env-file run vitest run --config vitest.crm-concurrent-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-instagram-crm-concurrent.json
bun --no-env-file scripts/qc/native-postgres-report.ts crm-concurrent test-results/faces-instagram-crm-concurrent.json
```

Require every registered behavior, zero failures, skips or todos, and the lock-wait assertions. None of these commands ran during authoring.

### Review artifact: contracts/fresh-reconciliation.md

# Fresh contact rows after a merge (customer host)

The customer host must not release its merge latch on rows that may predate the merge. F8 adds one opt-in selector to the existing contacts GET and one host function. No endpoint, cache backend, ranking change, loader change or background job is added.

## Evidence

- Customer SSR (`crm/customers/+page.server.ts:98`), contacts GET (`api/crm/contacts/+server.ts:77` for `fields=id`, `:92` for pages) and CSV export (`api/crm/contacts/export.csv/+server.ts:147`) call `rankContactsPageCached` (`crm-contacts.service.ts:440`; TTL 2m, SWR 1h, CRM domain tags, `:466`). `rankContactsPage` (`:423`) is the uncached path and resolves its finance bridge before opening its transaction; call it directly, never inside another `withOrgCore` (`:477`).
- `mergeContacts` busts the CRM tags after commit (`crm-cleanup.service.ts:531`). The bust is best-effort: `invalidateTags` logs and swallows backend errors (meta `packages/cache/src/core.ts:59-70`; Hub pins `@minion-stack/cache` 0.3.0, `bun.lock:457`; that the published 0.3.0 matches this source is assumed, verify in T003). A committed merge can therefore leave cached pages stale with an HTTP 200.
- `invalidate('crm:contacts')` cannot deliver the filtered view. In the installed SvelteKit 2.70.2 (same version as `bun.lock:869`), `replaceState` only calls `history.replaceState` and sets `page.state` (`src/runtime/client/client.js:2551-2583`); `_invalidate` reruns the load for `current.url` (`:417-426`), which only real navigations change. The pinned host comment at `PageBody.svelte:229-231` assumes otherwise. F8 does not use `invalidate` for merge refresh. The same assumption in the host's other `invalidate('crm:contacts')` calls (`:658`, `:670`, `:679`, `:809`, `:1113`) is a pre-existing issue outside F8; T016 records it in the open-items ledger.

## Server: `fresh=1` on the existing contacts GET

`GET /api/crm/contacts?…&fresh=1` keeps the normal branch's authentication, filter parsing, `ownerFilter`, `shouldMaskSensitive`, limit clamp (1-500), offset, tag decoration and custom-property bundle. Only two things differ:

- it calls `rankContactsPage(ctx, filters)` instead of `rankContactsPageCached`;
- the JSON body adds `fresh: true` and the response sets `Cache-Control: private, no-store`.

`fresh=1` together with `fields=id` returns `error(400, 'fresh reads do not support fields=id')`, so the uncached path is never a full-roster read. Any `fresh` value other than `1` is ignored. Normal requests keep their cached behavior and body shape (no `fresh` key). `selectAllMatching` (`fields=id`) and CSV export stay on the cached path. The normal API branch applies no finance-dataset denial while SSR does (`+page.server.ts:89`); the fresh branch mirrors the normal API branch, and that pre-existing difference is outside F8.

The uncached query has the existing cold cost over the whole org; the source comment records 43-57 s historically (`crm-contacts.service.ts:427-438`), which is not a current measurement. The user starts each fresh read explicitly; there is no timer or parallel read. A read that errors or exceeds the configured request limits is a failed refresh, never a cached fallback. Record candidate timings with synthetic data in validation.md.

## Host: `reloadFreshRows()` in `crm/customers/PageBody.svelte`

Used for the customer host's required read in both refresh origins of the [phase table](contracts/client-compatibility.md#merge-phases-at-both-hosts):

1. `const seq = ++reqSeq; clearPageCache();` so in-flight `runQuery` and prefetch results are dropped and the client page cache is empty.
2. Build the page-1 URL with `apiUrlFor({ ...lastQuery, page: 1 })`, remove `includeTotal`, append `fresh=1`, and `fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } })` directly, not through `pageCache`.
3. Accept only when `seq === reqSeq`, the response is OK and not redirected, `body.fresh === true`, `body.contacts` is an array and `body.total` is a number. Then set `rows = body.contacts`, `total = body.total` and `knownTotalFingerprint` from step 2. The view restarts at page 1 with the current filters.
4. Anything else is a failed read.

The data-resync `$effect` (`PageBody.svelte:111-116`) also increments `reqSeq`, so a loader rerun during a fresh read supersedes it and the read fails. Account or org switches remount the host. `runMerge`'s success path calls `reloadFreshRows()` instead of `invalidate('crm:contacts')`. The customer host loads no duplicate groups.

## Later reads: bounded staleness

After the latch is released, normal navigation uses cached reads. When the merge's tag invalidation succeeded, those reads are current. When it failed, a cached page for another filter or offset can return pre-merge rows until its 2-minute TTL expires, plus one stale-while-revalidate response that triggers recomputation (`packages/cache/src/core.ts:50-51`). F8 accepts this. A stale row cannot cause a wrong merge: participant admission refuses deleted contacts with 404.

## Tests

- `contacts.test.ts`: `fresh=1` calls `rankContactsPage` with the same filters, owner and mask as the normal branch and never calls `rankContactsPageCached`; the body has `fresh: true`; the header is `private, no-store`; `fresh=1&fields=id` returns 400; a normal request has no `fresh` key and still uses the cached call.
- customers `page.merge.mounted.test.ts`: a stale mocked page cache and a merge whose POST is acknowledged or lost; the fresh read replaces rows only when accepted; an unmarked body, a failed read, a late `runQuery` response and a loader rerun during the read each leave the latch set; exactly one POST until a new explicit selection.

Full guarded QA with Browser Harness exercises the real route against a warmed cache. No test has run during authoring.

### Review artifact: contracts/native-fixture.md

# Native fixture for the qa-native Instagram suite

This is the fixture for `src/server/services/crm-instagram-fields.sql.integration.test.ts` (nine registered behaviors, listed in [quickstart.md](quickstart.md)). The [existing crm-concurrent lane](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate) keeps its own fixture and target; neither substitutes for the other. Source baseline is Hub c6c2d5739572356239c4048c0f564f40b0768adc; no native run is claimed.

## Connections

Three connections, each with one job:

| Name | Database | Opened as | Used for |
|---|---|---|---|
| controller client | `minion_qc_vectors` | container-initial superuser `minion_qc`, admitted by `openDisposablePostgres` | cluster role checks and creation; `CREATE DATABASE` and `DROP DATABASE` of the recorded child only |
| child owner client | the owned child `minion_qc_faces_crm_<32hex>` | the same `minion_qc` superuser, admitted by `openDisposablePostgres` on the child URL | F7 auth helper (`owner` argument), F8 public DDL, seed, catalog and policy-fingerprint assertions, authority derivation |
| business clients | the same child | `minion_qc`, then `SET ROLE app_ledger` with org/profile GUC | the service calls under test, one independent client per competing writer |

A PostgreSQL connection cannot run DDL in another database, so nothing child-local runs on the controller client. This matches the existing pattern in `tests/fixtures/notification-migrations/reconciliation-harness.ts:372-380`, which opens its admin connection on the child URL.

## Controller and child database

Use the qa-native CI controller from `.github/workflows/ci.yml:652-686`: image `pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff`, `POSTGRES_USER=minion_qc`, `POSTGRES_DB=minion_qc_vectors`, listening only on `127.0.0.1` port `55462` (or a separately recorded free loopback port). It must stay `minion_qc_vectors` with extension `vector` 0.8.6 in schema `extensions`, because `brains.effect-ownership.sql.integration.test.ts:131-132` requires both. Do not substitute vanilla PostgreSQL 15. The CRM test never drops or renames the controller.

Admit the controller with `openDisposablePostgres({MINION_QC_DISPOSABLE:'1', MINION_QC_DATABASE_URL: controllerUrl})`: protocol `postgres`/`postgresql`, literal `127.0.0.1` or `[::1]`, explicit port, user `minion_qc`, path `/minion_qc_vectors`, no query or hash, database comment `minion-360-disposable:v1`. Verify `current_user = 'minion_qc'` and `pg_roles.rolsuper = true` before role or database DDL; no ALTER ROLE. Apply the CI preparation (`CREATE SCHEMA extensions; CREATE EXTENSION vector WITH SCHEMA extensions`) and roles `app_ledger`, `anon` and `authenticated`, each `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS`; create a role only if absent, otherwise verify its attributes. Never print credentials.

The controller client creates `minion_qc_faces_crm_<32hex>` (validated against `^minion_qc_faces_crm_[a-f0-9]{32}$`), sets its disposable marker, derives the child URL by changing only the database path, and the fixture opens the child owner client through `openDisposablePostgres` on that URL (the helper admits any `/minion_qc_[a-z0-9_]+` path, `scripts/qc/disposable-postgres.ts:26-27`). A missing marker, owner, superuser or role fails before fixture DDL; it never skips.

The full qa-native command also needs `HUB_TEST_DB_URL` pointing at a separately owned full-schema QA target for the lane's other suites.

## Shared F7 native-auth prerequisite

The PG18 vector image is plain PostgreSQL: `auth.uid` and `auth.users` do not exist. F8 reuses the helper F7 plans in [F7 native-auth-prerequisites.md](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md):

- `src/server/test-utils/operator-native-auth-fixture.ts`, exporting `installOperatorNativeAuthFixture(owner, expectedOwnedChildIdentity)` and `assertOperatorNativeAuthFixture(owner, expectedOwnedChildIdentity)`;
- its SQL source `src/server/test-utils/fixtures/operator-native-auth.sql`.

Status: planned, not implemented. F7 creates and qualifies it in its tasks T003 and T005 (`specs/128-faces-receivables-audit/tasks.md`). F8 task T017 waits until it is in the F8 candidate's Hub base; if absent, F8 native work stops and the block is recorded in validation.md. F8 writes no substitute.

F8 passes `owner` = the child owner client from the table above and `expectedOwnedChildIdentity` = the recorded child database name, in this order:

1. `installOperatorNativeAuthFixture` before any public policy or foreign-key DDL.
2. Apply `crm-instagram-native.sql` (public tables only) and seed synthetic `auth.users` rows before the matching `profiles` rows.
3. `assertOperatorNativeAuthFixture` after public DDL and seed.

What F8 consumes from the helper, as F7 defines it:

- child-local `auth` schema and `auth.users(id uuid PRIMARY KEY, email text)`;
- `auth.uid()`: SECURITY INVOKER, STABLE, body from `reconciliation-harness.ts:374-401`, owned by `supabase_auth_admin`, with PUBLIC and `dashboard_user` EXECUTE;
- ACL-recipient roles `postgres` and `service_role` (sentinels), `supabase_auth_admin` and `dashboard_user`, each `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS` without membership edges, created by the controller client only if absent;
- empty JWT claims on fresh clients, so `auth.uid()` returns NULL.

Public `profiles` uses the baseline shape (`schema.sql:4034-4049`, NOT NULL email) plus the authority fixture's lifecycle columns, and keeps `profiles_id_fkey -> auth.users(id) ON DELETE CASCADE` (`schema.sql:8118`). Apply the baseline profile, member and organization policies; install no JWT subject during business mutations, and `app.current_profile_id` never acts as one. Grant `app_ledger` nothing beyond baseline. F8 additionally asserts the public policy fingerprint. Child auth objects disappear when the child is dropped; controller roles are not dropped per test.

## Fixture files and tables

`src/server/test-utils/crm-instagram-native-fixture.ts` owns admission, child lifecycle, SQL application, catalog assertions, Drizzle binding and authority setup. `src/server/test-utils/fixtures/crm-instagram-native.sql` is a test fixture, not a migration, with canonical column types, defaults and keys. Business CRM tables keep `app_ledger` org-GUC RLS and grants; authority tables keep their baseline ACL/RLS.

| Tables | Source definition and exercised path |
|---|---|
| `auth.users`, `auth.uid` | From the F7 helper; not in F8's SQL file. |
| `organizations`, `profiles`, `organization_members`, `member_roles`, `org_roles`, `permission_rules` | The `organization-role-admin.sql.integration.test.ts` authority fixture and `resolveFreshCapabilitiesInTransaction` (`rbac.service.ts:1088`), including `field_level` and `if_owner`. |
| `app_modules` | `modules.service.ts` schema and absent-means-enabled behavior; enabled and disabled CRM states. |
| `crm_contacts` | Full `pg-crm-schema.ts` `crmContacts`; `returning()` needs every mapped column. |
| `parties` | Full `pg-party-schema.ts` `parties` with its unique indexes; party facet locks the party before contact creation. |
| `assignment_rules` | Full `pg-assignment-schema.ts`; left empty so unscoped owner-null `createContact` runs the real `autoAssign` SELECT and finds no rule. |
| `crm_contact_identities` | Full definition with contact cascade FK and `unique(org_id, channel, external_id)`; seed distinct identities including the same channel with different IDs, plus a `phone` identity for the restricted-save case. |
| `crm_activities` | Full definition and org-GUC policy; merge reassigns `contact_id`. |
| `crm_tags`, `crm_contact_tags`, `tag_links` | Full definitions; merge reassigns contact tags with ON CONFLICT; event `tag_links` stay unchanged. |
| `doc_audit_log` | Full `pg-activity-schema.ts` `docAuditLog`; `recordAuditInTx` records only filtered input. |

`supabase/ci-fixtures/crm-funnel-concurrent.sql` is not run in this child (it creates `organizations(id)` only); reuse its catalog/RLS/default/grant assertion pattern. Before any service test, compare every mapped column, type, nullability, default, key, RLS flag and grant through `pg_catalog`; a mismatch fails qualification.

## Authority and target binding

Keep the real service functions, SQL expressions, `recordAuditInTx`, `withOrgCore`/`withOrgCoreTransaction` and `getOrgTransactionDb`. The test-local `pg-client` override changes only `getCoreDb` to return the current child Drizzle instance, throws if unbound, and never marks it `MANAGED_CORE_DB`. Install counters on global pool factories and Supabase/admin/network fallbacks and assert zero attempts.

Per persona and request:

1. Seed two orgs, profiles and real role/permission-rule rows: restricted and authorized CRM personas, each unscoped and `if_owner`.
2. The child owner client runs `resolveFreshCapabilitiesInTransaction` in a short committed admission transaction (trusted permission loading).
3. Bind `runWithRequestCapabilities({orgId, profileId, capabilities, platformAdmin: false}, callback)`. `canWriteSensitiveFields` derives from `!(await shouldMaskSensitive(locals, 'crm'))` and merge `ownerId` from `ownerFilter(locals, 'crm')`.
4. Business transactions run as `app_ledger` under the org/profile GUC and source RLS. Effective narrowing uses `runWithEffectiveAuthority`; nothing in the composer, record admission or policy verdict is mocked.

Each persona gets its own ALS scope, restored in `finally`. Record sanitized `current_database`, backend PID, role, org and profile per query to prove every query reached the child. Postcommit cache invalidation uses a test-local recorder; no Redis, model, messaging or provider call runs.

## Behaviors, races and cleanup

The nine requiredBehaviors and `minimumAssertions: 9` are fixed in quickstart.md. Checks that are not themselves a behavior run inside a named one:

- fixture qualification (catalog, policy fingerprint, `postgres`/`service_role` sentinel attributes, F7 assert helper) runs in `beforeAll`; a failure fails every behavior;
- the `autoAssign` no-rule source-drift assertion runs inside `restricted manual contact creation strips manual Instagram keys and authorized creation persists them`;
- the restricted phone/email/phone-identity preservation case runs inside `masked whole namespace preserves stored masked values while unrelated fields change`;
- participant-set admission cases run inside the merge behavior.

Lock races use independent backends and `pg_stat_activity` lock-wait observations for both authorized-update/restricted-update orders and both merge arrival orders. Denied paths compare before/after digests of all affected tables. The restricted merge refusal happens before the first identity, activity, tag or contact mutation.

Cleanup: release blockers, roll back and close child connections, restore factory/ALS/mock state, then the controller client drops only the recorded child, asserts it is gone and closes. Never drop the controller, the full-schema QA target, shared roles or their tables.

Authority composition by the child owner client is recorded separately from `app_ledger` business transactions; it is not an `app_ledger` access proof. Baseline negative probes require organization SELECT and profile/membership UPDATE denial to `app_ledger`, and no profile self-row without a JWT subject. The `postgres` and `service_role` sentinels are ACL targets for baseline grants, not service identities.

### Review artifact: quickstart.md

# Quickstart validation: Discoverable persistent CRM profile classification and Instagram recording

## Preconditions

Owner approval is pending. These are instructions for a future isolated Hub candidate, not commands executed during documentation authoring; nothing below has run. Read Hub AGENTS.md and docs/qa-stack.md; verify candidate HEAD and registry master/Bun. Use synthetic data and guarded loopback QA only, never a production-backed `bun run dev`. Inspect `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack. Terms such as masked keys and restricted principal are defined in [contracts/behavior.md](contracts/behavior.md#terms).

## US1 fixture and oracle (task T006)

Seed one org A with contacts C1 (unowned), C2 (owned by another profile) and C3 (soft-deleted), a manual CRM tag `Modelo`, an auto CRM tag, an event tag `MODELO` linked to a booking of C1, and `lifecycle_override` set on C1. Seed org B with contact F1.

| Persona | Request | Expected |
|---|---|---|
| unscoped CRM editor, org A | POST `Modelo` on C1, then reload | 201; link present after reload; event `tag_links` and `lifecycle_override` unchanged |
| same | DELETE `Modelo` on C1, then reload | 200; link absent after reload |
| same | POST or DELETE on F1 (org B) | 404 `Contact not found`; zero `crm_contact_tags` changes |
| same | POST on a random UUID, on C3, on `not-a-uuid` | 404 `Contact not found`; zero changes; no database text |
| same | POST the auto tag or the event tag on C1 | 400 with the fixed tag message |
| same | POST with `tagId` `not-a-uuid` | 400 |
| `if_owner` CRM editor, org A | POST or DELETE on C2 | 404; zero changes |
| CRM viewer without edit | POST on C1 | 403; zero changes |

The route and service cases are written in `src/server/services/simulated-record-mutations.test.ts` and the new `src/routes/api/crm/contacts/[id]/tags/server.test.ts`; the loader baseline in `src/routes/(app)/crm/[contactId]/page.server.test.ts`. Real guarded QA repeats the same matrix against local Postgres.

## Focused executable checks

US1:

```bash
bunx vitest run 'src/routes/(app)/crm/[contactId]/page.server.test.ts' 'src/routes/api/crm/contacts/contacts.test.ts' 'src/routes/api/crm/contacts/[id]/tags/server.test.ts' 'src/server/services/crm-contacts.service.test.ts' 'src/server/services/simulated-record-mutations.test.ts' 'src/lib/components/dashboard/EditableGrid.mounted.test.ts'
```

US2 runs the command in [implementation-inventory.md](implementation-inventory.md). Capture a failing assertion for each missing behavior before the fix; a passing baseline test is not a reproduced fix.

## Scenario and oracle

Use local QA personal-account fixtures with manual CRM modelo, separate same-name event tag, auto tag and lifecycle stage. Apply and remove the profile tag and reload; assert event tags and stage unchanged. Inspect synthetic org custom-property definitions and Additional keys, record manual Instagram using one path, reload and compare identity rows, reserved metadata and unrelated fields. Test masked, owner-scoped, denied and foreign personas by direct API as well as UI. Move the lifecycle card using Editar Diseño, reload in the same browser and switch accounts; verify no layout leakage. Report cross-device layout as outside verified scope.

For each allowed journey also run direct API and navigation attempts for the denied, owner and foreign controls. Capture status, loader outcome and redacted payload assertions. A 200 document shell alone does not prove authorization or a successful load. On mutations compare before/after records; a success toast alone proves nothing.

## Browser acceptance

Read and use browser-harness. Use a unique named isolated browser when work is concurrent; never share tabs or processes with another agent. Test desktop and 390px, Spanish and English, light and dark, keyboard-only operation and fresh reload. Observe accessible labels and focus, empty/error/denied states, row/link behavior and persisted preference scope. Login, MFA or account ambiguity stops actions until the account is confirmed; keep private session access details out of committed docs.

## Full qualification and result recording

Run Hub `bun run check` (zero errors and warnings), `bun run test` and `bun run build`. For UI edits run `bun run lint:design && bun run lint:tokens`; for message edits run `bun run i18n:compile`. No route is added; the route design and access contracts (`src/lib/routes/route-design-contracts.test.ts`, `src/lib/routes/route-access-authority.test.ts`) run inside `bun run test`, because the pinned package.json has no separate route-contract script. Record commands, exit codes, candidate hash, fixture matrix, screenshots and open gates in `validation.md` beside this feature. Production release and affected-account checks are separate owner-gated evidence.

## Masked-key regressions (ordinary Vitest)

Before any synthetic handle write, `src/lib/pii.test.ts` proves both manual Instagram keys and their case variants are masked, that `omitMaskedFields` and `omitManualInstagramFields` drop exactly their sets, and that unrelated keys pass through. Contact serialization tests prove masking in roster, detail, PATCH and stale PATCH responses, including identity `handle`.

In `src/server/services/crm-contacts.custom-fields.test.ts` (PGlite), store `{instagram_handle: "synthetic_handle_123", telefono: "999111222", email: "a@example.test", distrito: "old", _funnel: {stage: "lead"}}` plus a `phone` identity `999111222`. As a restricted principal, change only `distrito` and save the whole namespace with the masked projection and the masked phone. Assert every masked key, `_funnel` and the phone identity are byte-identical and the response is masked; `expectedUpdatedAt` is current so concurrency cannot hide the defect. Repeat with masked keys omitted, null, empty, case-varied, forged and absent before the write, and with a partial patch. Authorized replace and whole-namespace deletion still work; a partial null stores null.

## qa-native Instagram suite

Create `src/server/services/crm-instagram-fields.sql.integration.test.ts` with `describe("CRM Instagram preservation against PostgreSQL")`, register it once in the `qa-native` lane of `scripts/qc/native-postgres-manifest.ts` with `minimumAssertions: 9` and these requiredBehaviors, keep every existing manifest row and the lane count, and update the manifest and report tests:

- `CRM Instagram preservation against PostgreSQL masked whole namespace preserves stored masked values while unrelated fields change`
- `CRM Instagram preservation against PostgreSQL restricted forged null omitted and case variant inputs cannot create replace or delete a masked value`
- `CRM Instagram preservation against PostgreSQL partial updates preserve masked and reserved values`
- `CRM Instagram preservation against PostgreSQL concurrent restricted update preserves the committed authorized handle in both lock orders`
- `CRM Instagram preservation against PostgreSQL stale owner and foreign predicates preserve the authoritative row and audit`
- `CRM Instagram preservation against PostgreSQL authorized replace and whole namespace removal retain existing semantics`
- `CRM Instagram preservation against PostgreSQL restricted manual contact creation strips manual Instagram keys and authorized creation persists them`
- `CRM Instagram preservation against PostgreSQL party quick add uses the same manual Instagram creation policy without creating an Instagram identity`
- `CRM Instagram preservation against PostgreSQL restricted merge strips masked overrides and atomically refuses stored manual Instagram participants in both lock orders`

Ordinary Vitest excludes `.sql.integration` files. The fixture, connections and authority binding are in [contracts/native-fixture.md](contracts/native-fixture.md). Set private `F8_QA_NATIVE_CONTROLLER_URL` to the owned `minion_qc_vectors` controller and `F8_FULL_SCHEMA_QA_URL` to the guarded full-schema QA target. `REQUIRE_ORG_ROLES_POSTGRES=1` is required because the same lane contains the org-role SQL suites (for example `organization-role-admin.sql.integration.test.ts:253`), which skip without it; CI sets it for this job at `ci.yml:688`. Then run the whole lane without a file filter:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F8_QA_NATIVE_CONTROLLER_URL" HUB_TEST_DB_URL="$F8_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-crm-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-crm-qa-native.json
```

The report requires every admitted file and behavior with zero skips, todos or failures. The existing crm-concurrent lane runs separately, per [client-compatibility.md](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate).

## Create, merge and gateway regressions

The required cases are the bullet list in [contracts/behavior.md](contracts/behavior.md#regressions). Ordinary tests live in `contacts.test.ts`, `parties/server.test.ts`, `party.service.test.ts`, `crm-cleanup.service.test.ts`, the new `src/routes/api/crm/cleanup/duplicates/server.test.ts` and the existing `src/routes/api/gateway/actions/contact-update.server.test.ts`; lock-order races run only in the qa-native suite. Forged `canWriteSensitiveFields` JSON is ignored by every route. No remote model call or external message runs in these tests.

## Merge client and fresh rows

Run the mounted host matrix in [contracts/client-compatibility.md](contracts/client-compatibility.md#mounted-host-regressions) and the fresh-read cases in [contracts/fresh-reconciliation.md](contracts/fresh-reconciliation.md#tests). In guarded QA, warm the customer page cache, merge, and confirm the fresh read shows post-merge rows. The invalidation-failure case is proven by the route and mounted tests, which stub a stale cached page.

## Slice qualification

A US1 candidate runs the US1 command, the tag fix, real guarded personal-account checks and its applicable i18n, full, UI and browser gates; it does not need any US2 file. A US2 candidate runs its ordinary command, both native lanes and their reports, and its own gates. Record each story's evidence separately in validation.md. Conditional US1 labeling and layout files stay unchanged when the walkthrough passes; record that no-code outcome.

### Review artifact: tasks.md

# Tasks: Discoverable persistent CRM profile classification and Instagram recording

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/ and quickstart.md in this directory.
**Status**: Specification only; all tasks unchecked. Tests are required by this spec. Hub paths are relative to minion_hub unless prefixed `specs/`. Per-file actions are in implementation-inventory.md, whose Task column matches these IDs.

## Phase 1 — Setup

- [ ] T001 Record owner spec approval, execution scope and independent-review result in `specs/129-crm-profile-followups/validation.md` before any implementation or configuration action.
- [ ] T002 Verify candidate hash, master PR base and Bun from repo-policy, and local QA ownership using `docs/qa-stack.md`; obtain an isolated feature checkout without altering shared WIP.

## Phase 2 — Foundational evidence

- [ ] T003 Re-read every anchored source in `specs/129-crm-profile-followups/research.md` on the candidate, including the installed `@minion-stack/cache` `invalidateTags`; classify supported behavior versus reproduced gap and record candidate differences in `specs/129-crm-profile-followups/validation.md`.
- [ ] T004 Prepare the synthetic persona/entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not cover it; record runtime identity and configuration preconditions privately as directed by `specs/129-crm-profile-followups/quickstart.md`.
- [ ] T005 Prove module, route, owner and field masking admission for the scoped reads and writes in `src/server/services/rbac.service.ts` and `src/hooks.server.ts`; stop for an owner-reviewed amendment on security gaps outside `specs/129-crm-profile-followups/contracts/behavior.md`.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: Staff using personal accounts find and apply the CRM profile tag modelo, reload and see it without changing event tags or customer lifecycle.
**Independent acceptance**: Apply an existing manual CRM modelo tag to a synthetic contact, reload with the same and another authorized account; compare booking tags and lifecycle.

- [ ] T006 [US1] Write the failing regressions and supported-behavior baseline from the US1 fixture table in `specs/129-crm-profile-followups/quickstart.md` into `src/routes/(app)/crm/[contactId]/page.server.test.ts`, `src/server/services/simulated-record-mutations.test.ts` and the new `src/routes/api/crm/contacts/[id]/tags/server.test.ts`.
- [ ] T007 [US1] Run those regressions against `src/routes/api/crm/contacts/[id]/tags/+server.ts` and `src/server/services/crm-contacts.service.ts` at the pin; record which rows fail (foreign-org, missing, deleted and malformed contact IDs are expected to fail) in `specs/129-crm-profile-followups/validation.md`.
- [ ] T018 [US1] Implement the tag contact admission in `specs/129-crm-profile-followups/contracts/behavior.md` (`lockContactsInOrg` in `src/server/services/crm-contacts.service.ts`, UUID and error handling in `src/routes/api/crm/contacts/[id]/tags/+server.ts`) until the T006 regressions pass. Checkpoint: `bun run check` and the US1 command in quickstart.md pass.
- [ ] T008 [US1] Add translated profile-tag/layout help in `src/routes/(app)/crm/[contactId]/PageBody.svelte` only if the staff walkthrough reproduces confusion; keep card placement and the per-account EditableGrid version "1" layout; otherwise record a no-code result.
- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus `src/routes/(app)/crm/[contactId]/page.server.test.ts` and `src/lib/components/dashboard/EditableGrid.mounted.test.ts`; record before/after evidence in `specs/129-crm-profile-followups/validation.md`.

## Phase 4 — User Story 2 (P2)

**Goal**: Staff reuse the existing profile custom-property or Additional-field editor to store a manually supplied Instagram handle, and can distinguish it from a synchronized channel identity.
**Independent acceptance**: Inspect existing org fields first; record a synthetic manual handle using exactly one chosen existing storage path, reload and confirm no channel connection or identity row was created.

- [ ] T010 [US2] Write failing ordinary-Vitest regressions (no concurrency): key sets and helpers in `src/lib/pii.test.ts`; restricted whole/partial/phone preservation in `src/server/services/crm-contacts.custom-fields.test.ts`; PATCH success/stale masking and identity `handle` masking in `src/routes/api/crm/contacts/contacts.test.ts`; gateway restricted cases in `src/routes/api/gateway/actions/contact-update.server.test.ts`.
- [ ] T011 [US2] Part 1, masked-key update policy: `src/lib/pii.ts` registry and helpers; `updateContact`, `customFieldsMergeSql`, `customFieldsPatchSql` options, preservation SQL, phone handling, audit input and `handle` masking in `src/server/services/crm-contacts.service.ts`; option derivation in `src/routes/api/crm/contacts/[id]/+server.ts` and `src/routes/api/gateway/actions/contact-update/+server.ts`; existing `updateContact` and SQL-helper test callers per the table in `specs/129-crm-profile-followups/contracts/client-compatibility.md`. Checkpoint: `bun run check` and the T010 files pass.
- [ ] T019 [US2] Part 2, create/party/merge/gateway/loader: `createContact` in `src/server/services/crm-contacts.service.ts`, `ensureContactFacetForParty` in `src/server/services/party.service.ts`, `mergeContacts` admission and refusal in `src/server/services/crm-cleanup.service.ts`; callers `src/routes/api/crm/contacts/+server.ts` (POST), `src/routes/api/crm/parties/+server.ts`, `src/routes/api/crm/cleanup/duplicates/+server.ts`; gateway 403 and sanitization; loader hint in `src/routes/(app)/crm/[contactId]/+page.server.ts`. Tests: `src/server/services/crm-cleanup.service.test.ts`, `src/server/services/party.service.test.ts`, `src/routes/api/crm/parties/server.test.ts`, new `src/routes/api/crm/cleanup/duplicates/server.test.ts`, and the remaining test callers. Checkpoint: `bun run check` and these files pass.
- [ ] T020 [US2] Part 3, client and fresh rows: `src/lib/components/crm/crm-merge.ts`, `src/lib/components/crm/CrmMergeResolver.svelte`, `src/lib/components/crm/CrmHygiene.svelte`, `src/routes/(app)/crm/customers/PageBody.svelte`, `src/routes/(app)/crm/[contactId]/PageBody.svelte`, GET `fresh=1` in `src/routes/api/crm/contacts/+server.ts`, GET no-store in `src/routes/api/crm/cleanup/duplicates/+server.ts`, per `specs/129-crm-profile-followups/contracts/client-compatibility.md` and `specs/129-crm-profile-followups/contracts/fresh-reconciliation.md`. New tests: `src/lib/components/crm/crm-merge.test.ts`, `src/lib/components/crm/CrmHygiene.merge.mounted.test.ts`, `src/routes/(app)/crm/customers/page.merge.mounted.test.ts`, `src/routes/(app)/crm/[contactId]/page.instagram.mounted.test.ts`. Checkpoint: the US2 ordinary command in implementation-inventory.md passes.
- [ ] T017 [US2] Create the qa-native fixture in `src/server/test-utils/crm-instagram-native-fixture.ts` and `src/server/test-utils/fixtures/crm-instagram-native.sql` per `specs/129-crm-profile-followups/contracts/native-fixture.md`, calling F7's `src/server/test-utils/operator-native-auth-fixture.ts` with the child owner client. Blocked until F7 tasks T003 and T005 (`specs/128-faces-receivables-audit/tasks.md`) have created and qualified that helper and it is in the candidate's Hub base; if absent, stop and record the block in `specs/129-crm-profile-followups/validation.md`.
- [ ] T021 [US2] Create `src/server/services/crm-instagram-fields.sql.integration.test.ts` with the nine behaviors in `specs/129-crm-profile-followups/quickstart.md`, including both lock-order races; register it in `scripts/qc/native-postgres-manifest.ts` and update `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts`.
- [ ] T012 [US2] Run the whole qa-native lane and report, and the crm-concurrent lane and report, from `specs/129-crm-profile-followups/quickstart.md`; exercise reload, stale, denied, repeated save and account-switch cases; compare records and record results in `specs/129-crm-profile-followups/validation.md`.

## Phase 5 — Polish and qualification

- [ ] T013 Add the message keys from `specs/129-crm-profile-followups/contracts/client-compatibility.md` and any reproduced US1 help to `messages/en.json` and `messages/es.json`, run `bun run i18n:compile`, and use semantic tokens and shared primitives in every changed UI; skip catalogs only if no label change is needed and record why.
- [ ] T014 Run full Hub check/test/build and the UI design/token gates from `package.json`; save candidate exit codes in `specs/129-crm-profile-followups/validation.md`.
- [ ] T015 Qualify the browser acceptance matrix through Browser Harness and real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/129-crm-profile-followups/evidence/` and summarize in `specs/129-crm-profile-followups/validation.md`.
- [ ] T016 For the approved shipping slice, obtain owner merge/configuration approval for its diff, complete separately authorized release/runtime verification, and reconcile remaining work with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`. Record open ends as an in-code `TODO(handoff)` plus a proposal entry, including the pre-existing customers-page `invalidate('crm:contacts')` URL issue and the API/SSR finance-denial difference in `specs/129-crm-profile-followups/contracts/fresh-reconciliation.md`.

## Dependencies

- T001–T005 block implementation.
- US1: T006 → T007 → T018 → T008 → T009.
- US2: T010 → T011 → T019 → T020 → T017 → T021 → T012. T019 also needs T018 (`lockContactsInOrg`). T017 also needs F7 tasks T003 and T005.
- T013–T016 apply to each approved shipping slice. US1 may go from T009 to its gates without US2; US2 goes from T012 to its own gates and cannot reuse a US1 result as its qualification.
- No task is marked [P]: shared files and fixtures have no independent owners yet.

## Implementation strategy

MVP is Story 1, which now includes the tag admission fix (T018). Story 2 remains required for the full request and ships only with its own evidence. T005, T009 and T012 cover authority; T013–T015 cover i18n, tokens, browser and persistence. Twenty-one unchecked tasks: setup 2, foundation 3, US1 5 (T006–T009, T018), US2 7 (T010–T012, T017, T019–T021), polish 4. IDs T017–T021 were appended to keep earlier IDs stable. Neither these tasks nor prerequisite success proves implementation or review.

### Review artifact: checklists/requirements.md

# Specification Quality Checklist: Discoverable persistent CRM profile classification and Instagram recording

**Purpose**: Author checks of the requirements, not implementation qualification. Each checked item names the evidence a reader can verify.
**Created**: 2026-11-16
**Updated**: 2026-11-17
**Feature**: [spec.md](spec.md)

## Content Quality

- [x] Functional requirements FR-001 to FR-007 name no API, algorithm or framework; those live in the contracts.
- [x] Each user story states its user value under "Why this priority".
- [x] Mandatory sections present: user scenarios, requirements, success criteria, AS-IS, TO-BE, DELTA.

## Requirement Completeness

- [x] No `[NEEDS CLARIFICATION]` marker in spec.md; open runtime facts have stop or no-op rules in quickstart.md and tasks.md.
- [x] Each acceptance scenario has a matching regression: US1 in the quickstart fixture table, US2 in the behavior.md regressions list and the nine native behaviors.
- [x] Success criteria are counts or equalities (zero unauthorized mutations, byte-identical stored values, exactly one storage path, zero identities inserted).
- [x] Edge cases listed in spec.md each map to a contract rule or quickstart case.
- [x] Scope is limited to proposal item F8; pre-existing defects fixed on the same paths are listed under "Decisions made during review (owner to confirm)".
- [x] Dependencies are stated: F7 tasks T003 and T005 for the native auth helper.

## Feature Readiness

- [x] Every functional requirement has a task ID in tasks.md and a file row in implementation-inventory.md.
- [ ] Owner confirmation of the review decisions in spec.md: pending.
- [ ] Owner approval before data/configuration implementation: pending.
- [x] Independent review records are under egm/; their outcomes are separate from owner approval.

## Notes

Unchecked items block implementation claims, not preparation of review material. Server freshness after a merge uses existing uncached GETs rather than loader invalidation; native auth prerequisites, including the `service_role` sentinel, come from F7's planned shared helper. All product qualification remains pending.

### Review artifact: implementation-inventory.md

# F8 per-file delivery inventory and independent slices

Hub-relative paths unless stated otherwise. Every action is future work after owner spec approval. US1 is the manual-tag path (contact existence fix, qualification and conditional wording); US2 is the masked-key write policy, manual Instagram recording and merge feedback. Shipping US1 does not require US2 and does not mark US2 complete. Terms are defined in [contracts/behavior.md](contracts/behavior.md#terms).

Create means absent at the pin; if the path has appeared in the candidate, extend it. No Delete, schema migration, dependency, new route or layout rebuild is selected. The Task column names the task that changes the file.

| Action | File | Task | Change, or no-change predicate |
|---|---|---|---|
| Modify | src/server/services/crm-contacts.service.ts | T018 (US1), T011, T019 | US1: `lockContactsInOrg`, used by `applyTag`/`removeTag`; fixed-text HTTP 400 tag errors. T011: `updateContact`, `customFieldsMergeSql`, `customFieldsPatchSql` options; masked-key preservation; phone ignored for restricted principals; filtered audit input; identity `handle` masking in `getContact` and the roster. T019: `createContact` option. |
| Modify | src/routes/api/crm/contacts/[id]/tags/+server.ts | T018 | UUID `tagId`; POST `catch` stops forwarding `e.message`; 404 passes through. |
| Create | src/routes/api/crm/contacts/[id]/tags/server.test.ts | T018 | Route 404/400 shapes for foreign, missing, deleted and malformed IDs; no database text. |
| Modify | src/server/services/simulated-record-mutations.test.ts | T018, T011, T019 | US1: unscoped foreign-org, missing, deleted and malformed contact for `applyTag`/`removeTag`. US2: explicit options (T011 `updateContact`; T019 create, party facet, merge) per [client-compatibility.md](contracts/client-compatibility.md#required-existing-direct-test-callers). |
| Modify conditionally | src/routes/(app)/crm/[contactId]/PageBody.svelte | T008 (US1), T020 | US1: translated profile/event-tag help only if a staff walkthrough reproduces confusion. US2 (mandatory): read-only masked fields and phone for restricted principals, `saveDetails` omits them, masked new-key refusal. |
| Modify | src/routes/(app)/crm/[contactId]/page.server.test.ts | T006, T019 | US1 tag/layout/authorization baseline. US2 `crm.canEditSensitiveFields` and masked handle. |
| Modify | src/routes/(app)/crm/[contactId]/+page.server.ts | T019 | Return `crm.canEditSensitiveFields = !maskPii`. |
| Modify / reuse tests | src/server/services/crm-contacts.service.test.ts | T006, T011 | US1 persistence baseline. US2 SQL helper options per the caller table. |
| Reuse tests only | src/lib/components/dashboard/EditableGrid.mounted.test.ts | T009 | Account-scoped version 1 layout; no component change if reload and account switch pass. |
| Modify | src/lib/pii.ts | T011 | `CRM_MANUAL_INSTAGRAM_FIELD_KEYS` added to `CRM_PII_FIELD_KEYS`; `omitMaskedFields`; `omitManualInstagramFields`. |
| Modify | src/lib/pii.test.ts | T010 | Key sets, case variants, helpers. |
| Modify | src/server/services/crm-contacts.custom-fields.test.ts | T010, T011 | Existing calls get `true`; new restricted whole/partial/phone cases. |
| Modify | src/routes/api/crm/contacts/[id]/+server.ts | T011 | Pass `{ canWriteSensitiveFields: !maskSensitive }`. |
| Modify | src/routes/api/crm/contacts/+server.ts | T019, T020 | T019: POST create option and sanitized 201. T020: GET `fresh=1` branch per [fresh-reconciliation.md](contracts/fresh-reconciliation.md). |
| Modify | src/routes/api/crm/contacts/contacts.test.ts | T010, T019, T020 | PATCH masking/stale, create, forged option, fresh GET cases. |
| Modify | src/server/services/party.service.ts | T019 | `ensureContactFacetForParty` option. |
| Modify | src/routes/api/crm/parties/+server.ts | T019 | Derive and pass the option. |
| Modify | src/server/services/party.service.test.ts | T019 | Restricted and authorized facet creation. |
| Modify | src/routes/api/crm/parties/server.test.ts | T019 | Fourth argument in the line-207 assertion; restricted/authorized quick-add; no Instagram identity. |
| Modify | src/server/services/crm-cleanup.service.ts | T019 | `mergeContacts` options, participant admission via `lockContactsInOrg`, restricted refusal, masked override stripping. |
| Modify | src/routes/api/crm/cleanup/duplicates/+server.ts | T019, T020 | T019: derive and pass options. T020: `Cache-Control: private, no-store` on GET success. |
| Modify | src/server/services/crm-cleanup.service.test.ts | T019 | Admission and refusal cases from the behavior regressions list. |
| Create | src/routes/api/crm/cleanup/duplicates/server.test.ts | T019 | 403 `{message:'sensitive_fields_restricted'}`, 404 cases, `{ok:true}`, GET no-store header. |
| Modify | src/routes/api/gateway/actions/contact-update/+server.ts | T011, T019 | T011: pass the option from the delegated field level. T019: 403 for restricted `phone`/`email`; sanitized success and stale rows. |
| Modify | src/routes/api/gateway/actions/contact-update.server.test.ts | T010, T019 | Existing email tests move to `fieldLevel: () => 1`; restricted 403 and masked-response cases. |
| Modify | src/lib/components/crm/crm-merge.ts | T020 | Three outcomes, typed errors, `fetchFreshMergeGroups`. |
| Create | src/lib/components/crm/crm-merge.test.ts | T020 | Outcome mapping; no server text leaks. |
| Modify | src/lib/components/crm/CrmMergeResolver.svelte | T020 | `confirmBlocked`, `reconciling`, `onReconcile`; confirm guard. |
| Modify | src/lib/components/crm/CrmHygiene.svelte | T020 | Merge phases and fresh group replacement. |
| Create | src/lib/components/crm/CrmHygiene.merge.mounted.test.ts | T020 | Hygiene host matrix; `// @vitest-environment happy-dom`. |
| Modify | src/routes/(app)/crm/customers/PageBody.svelte | T020 | Merge phases and `reloadFreshRows`; data-resync effect bumps `reqSeq`. |
| Create | src/routes/(app)/crm/customers/page.merge.mounted.test.ts | T020 | Customer host matrix; happy-dom. |
| Create | src/routes/(app)/crm/[contactId]/page.instagram.mounted.test.ts | T020 | Read-only masked fields, new-key refusal, account switch, no identity control; happy-dom. |
| Modify | src/server/services/custom-property-bundle.service.test.ts | T019, only if the property path is selected | Restricted read returns no Instagram property value. |
| Modify | src/server/services/audit-coverage.test.ts | T011, T019 | Explicit `false` options (T011 `updateContact`, T019 `createContact`). |
| Modify | src/server/services/crm-funnel.concurrent.integration.test.ts | T011 | Explicit `false` option; seven behaviors unchanged. |
| Create | src/server/test-utils/crm-instagram-native-fixture.ts | T017 | Connections, admission, child lifecycle, binding per [native-fixture.md](contracts/native-fixture.md). |
| Create | src/server/test-utils/fixtures/crm-instagram-native.sql | T017 | Public test tables and catalog assertions; auth objects come from F7's helper. |
| Consume, no F8 change | src/server/test-utils/operator-native-auth-fixture.ts and src/server/test-utils/fixtures/operator-native-auth.sql | T017 | Planned by F7 (its T003, T005); T017 is blocked until present. |
| Create | src/server/services/crm-instagram-fields.sql.integration.test.ts | T021 | Nine behaviors from quickstart.md. |
| Modify | scripts/qc/native-postgres-manifest.ts | T021 | Admit the file once to qa-native, nine behaviors, minimum nine; lane count unchanged. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | T021 | File ownership and required-behavior admission. |
| Modify | scripts/qc/native-postgres-report.test.ts | T021 | Missing, skipped and duplicate behavior rejection. |
| Modify only if a generic validator defect is proven | scripts/qc/native-postgres-report.ts | T021 | Otherwise unchanged. |
| Modify as needed | messages/en.json, messages/es.json | T013 | Keys in [client-compatibility.md](contracts/client-compatibility.md#messages); US1 help only if reproduced. |
| Generated by i18n:compile | src/lib/paraglide/ | T013 | Never edited by hand. |
| Modify only if fixture absent | scripts/qa/seed/crm.ts, scripts/qa/seed/matrix.ts, scripts/qa/seed/ids.ts | T004 | Synthetic tags, contacts and personas; reuse existing IDs. |
| Modify only if the property path is selected and its fixture is absent | scripts/qa/seed/custom-properties.ts | T004 | Reuse an existing property fixture. |
| Create/update | specs/129-crm-profile-followups/validation.md | T001, T003, T009, T012, T014 | Execution record per shipped slice. |
| Create local evidence | specs/129-crm-profile-followups/evidence/ | T015 | Synthetic screenshots and receipts only. |

Unchanged unless a separately reviewed amendment proves need: `EditableGrid.svelte`, `TagsField`, `applyTagBulk`, the customers SSR loader, CSV export, CRM tag taxonomy, event links, lifecycle, synced identities, automated/public intake, schema, permissions, design tokens and dependencies. An unexpected product path must be reviewed before it is edited.

US2 ordinary command (the native suite is not in it; run the qa-native and crm-concurrent lanes from quickstart.md):

```bash
bunx vitest run 'src/lib/pii.test.ts' 'src/server/services/crm-contacts.service.test.ts' 'src/server/services/crm-contacts.custom-fields.test.ts' 'src/server/services/crm-cleanup.service.test.ts' 'src/server/services/party.service.test.ts' 'src/routes/api/crm/contacts/contacts.test.ts' 'src/routes/api/crm/parties/server.test.ts' 'src/routes/api/crm/cleanup/duplicates/server.test.ts' 'src/routes/api/gateway/actions/contact-update.server.test.ts' 'src/lib/components/crm/crm-merge.test.ts' 'src/lib/components/crm/CrmHygiene.merge.mounted.test.ts' 'src/routes/(app)/crm/customers/page.merge.mounted.test.ts' 'src/routes/(app)/crm/[contactId]/page.server.test.ts' 'src/routes/(app)/crm/[contactId]/page.instagram.mounted.test.ts' 'src/server/services/audit-coverage.test.ts' 'src/server/services/simulated-record-mutations.test.ts'
```
