---
status: draft
verdict: pending
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
tags: [ui, data, security]
source_proposal: 2026-11-16-faces-stock-cash-crm-meeting-followups
source_item: F6
---

# Feature Specification: FACES personal-account agenda in the operations Space

**Feature Branch**: Planned `127-faces-operations-agenda`; no branch created or switched. Hub PR base: master, verified from repo-policy on November 16.

**Created**: 2026-11-16

**Status**: Draft; source-evidenced planning only. Owner approval before implementation/configuration and owner merge remain pending. Review results are recorded under egm/.

**Input**: FACES meeting follow-up F6: Verify and, only where missing, configure the existing agenda in the intended FACES operations Space for the two intended personal accounts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Resolve the existing Space and accounts (Priority: P1)

The owner receives a precise current-state report identifying the intended personal accounts, organization, Space and existing agenda target before any write.

**Why this priority**: The owner needs an exact Space and authorized account inventory before reviewing a navigation write.

**Independent Test**: Resolve the approved account identifiers and read current nav/policy with no mutation; show whether agenda is already configured and accessible.

**Acceptance Scenarios**:

1. Given ambiguous organization, Space or operator identity, when inventory runs, then no guessed ID/shared account is used and that ambiguity blocks the write.
2. Given the agenda is already present and authorized, when verification runs, then it reports an already-satisfied request and makes zero changes.

**Account availability**: Coli is not provisioned. Its access proof follows separate account provisioning; existing operations-account acceptance and the shared link diff remain independent. This slice includes no invite, account creation or grant. FR-001 and success criteria retain these acceptance limits.

### User Story 2 — Open agenda after personal-account reload (Priority: P1)

Each intended staff member opens the existing agenda from the same operations Space alongside sell, clients and marketing.

**Why this priority**: An agenda link is useful only when the intended account can open its actual route after reload.

**Independent Test**: In each named personal-account local counterpart, reload, open the alias and confirm the canonical agenda uses existing records; compare unrelated users.

**Acceptance Scenarios**:

1. Given the verified Space lacks agenda and the target is approved, when its minimal configuration patch is saved, then the original pages and their order remain and exactly one agenda link is added.
2. Given either intended account reloads after save, when they select agenda, then access resolves to the intended canonical agenda with the existing permission scope.
3. Given an unrelated or denied member, when they reload or open the alias directly, then no broader route or dataset access is granted.

### Edge Cases

PDB versus PDV spelling; multiple matching sections; generic shared service account; inactive membership; target already present hidden; duplicate target under different alias; module disabled; page contextual deny; app layout cache; whole-document concurrent edit; write succeeds but refresh fails; alias direct URL; account switch; other tenant with same label.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Resolve actual organization, custom Space and authenticated operator with the source-verified `/pos/appointments` target. Resolve each personal account before claiming its runtime proof; the owner confirmed Coli is not provisioned yet. Its access proof is deferred until separate provisioning; existing operations-account acceptance and the shared one-link diff are independent. Transcript spellings MUST NOT be treated as IDs.
- **FR-002**: Current navigation and effective permissions MUST be read before mutation; a configuration already satisfying the request MUST result in a no-op verification receipt.
- **FR-003**: Only the missing alias MAY be applied. Contextual policies (including preexisting orphan rules), role grants and memberships MUST NOT change. A new alias identifier MUST NOT reactivate a stored orphan policy. Existing sell, clients, marketing, labels, order, unrelated pages and members MUST be preserved.
- **FR-004**: Agenda MUST reuse an existing screen and business data. It MUST NOT create appointments, duplicate clients, copy sales or grant new module/owner/field authority merely to make a link visible.
- **FR-005**: Each intended personal account MUST see and open the authorized agenda after fresh reload/sign-in; sidebar presence and actual route-loader success MUST be verified separately.
- **FR-006**: The backup and the proposed change MUST start from the current stored configuration, not a cached copy. If the configuration or the access policy changed after the owner reviewed the diff, the save MUST be refused with zero writes. After a possible save, persistence MUST be confirmed by reading the stored configuration again; a failed refresh MUST NOT cause a second save. Mechanics: [behavior.md](contracts/behavior.md).
- **FR-007**: Owner approval of the exact before/after configuration diff for `/pos/appointments` MUST precede a configuration write; effective policies and role grants MUST remain unchanged. Any access change requires a separate reviewed amendment.

### Key Entities

See [data-model.md](data-model.md). A navigation alias and the permission to open its target remain separate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

The owner-reviewed configuration proposal has an unambiguous organization and Space, with `/pos/appointments` as its selected target. The existing operations account passes alias visibility plus route-loader access after reload. The owner confirmed Coli is not provisioned yet: its access proof is explicitly deferred until separate account provisioning, with no invite, account creation or grant in this item; do not claim both-account delivery. For each actually qualified account, the canonical screen returns the same fixture appointment IDs. Unrelated module/owner/field permission sets and business-record counts are unchanged. A second configuration run produces zero writes and zero duplicate aliases.

## AS-IS

The meeting calls the Space PDB/PDV and asks for the operations user and Coli, without authoritative account or Space IDs. Current source supports organization-wide custom navigation in app_nav_config, independent from company/workspace switching. The app layout reads this document and returns a member-filtered navigation view. Custom aliases point to existing screens; page/section policy is stored separately. Root read-only production inspection on November 16 found the actual operations section labeled pdv, with existing sell, clients, stock and social/marketing pages and no agenda target. The sanitized summary holds no account fields, so the operations personal account is unverified until it is resolved before any write; the owner confirmed on November 16 that Coli is not provisioned yet. Effective access and personal navigation remain unverified, so missing navigation is established while personal-account completion is not.

Evidence is pinned to Hub `c6c2d5739572356239c4048c0f564f40b0768adc` and enumerated with exact source anchors in [research.md](research.md). Source is not runtime or deployment proof. Meeting reports and tentative names come from the parent [proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md). Separately sanitized live facts are in the [read-only evidence summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed 2026-11-16T19:20:30.051Z; names and personal account IDs are not copied here.

## TO-BE

Verify and, only where missing, configure the existing agenda in the intended FACES operations Space for the two intended personal accounts. Preserve tenant and personal-account boundaries, existing business records and effective permission scopes. New user-visible language must work in Spanish and English, and keyboard access must cover the same operations as pointer access.

## Alternatives Considered

The [evaluated alternatives](research.md#decisions-rationale-and-alternatives) compare reusing an alias, new workspace provisioning and a duplicate agenda screen. Reject new workspace/scheduling-screen provisioning, broad navigation permission bypass and new account grants for this request. Select one alias to the existing POS appointments page through the conditional, policy-preserving append/inverse operation. Its narrow mode avoids unrelated orphan-policy cleanup; normal legacy saves retain their behavior. The marked alias also retains the canonical target’s authority ceiling.

## DELTA

Configuration first. Inventory app_nav_config, contextual policy and personal navigation preferences; if already correct, deliver verification only. If missing, append one link alias to the resolved existing Space using the current settings API, preserving all other configuration. Existing permissions must suffice; otherwise stop account qualification and require a separately reviewed amendment before any access change. No workspaces.service change or product-code change is justified without an executable defect.

Required regression and browser oracles are explicit in [quickstart.md](quickstart.md) and dependency-ordered in [tasks.md](tasks.md); these are future acceptance gates, not completed tests.

## Dependencies, Assumptions and Non-goals

Use current organization/account configuration only after an authorized identity and scope check; no production IDs are guessed or committed. Synthetic fixtures stand in for personal accounts and customer records. Existing semantics remain authoritative unless a regression proves a bounded gap. WhatsApp linking, messages, remote model calls, password changes and unrelated redesigns are excluded. No product code, production data or configuration has changed in this documentation stage.

## Approval and evidence boundary

This is data-tagged work. Owner approval of the concrete spec and any resolved configuration/data diff is required before implementation, and owner merge is required. Planning is authorized; those later gates are pending. Pending runtime observations have explicit verification-first/no-op-or-stop outcomes and are not treated as proven defects. Review results are recorded under egm/; no implementation, reproduction, release or live completion is claimed.

## Reviewed concurrency correction

Normal navigation reads can serve 30-minute cached content that may refresh in the background while saves replace the document. A client hash/save window cannot establish current state. The selected fix is fresh GET plus locked conditional PUT in contracts/behavior.md, with no revision storage or access grant and preserved legacy-request compatibility.

## Canonical authority ceiling

The added agenda link is marked to follow canonical access: an inherited section or alias allow cannot override a deny on `/pos/appointments`, and later role or rule changes cannot make the marked link more permissive than its canonical target. Existing unmarked aliases keep their current semantics. The save binds both the fresh navigation and policy revisions; a policy-only change is refused with zero writes and needs a newly approved diff. The marker survives later saves of the same page and copies through paste, save and reload. Policy checks use the existing trusted navigation transaction without broader database privileges. No role, rule or membership grant is introduced.

The [canonical access contract](contracts/canonical-access.md) defines the behavior, lock participants and tests; the [implementation inventory](implementation-inventory.md) lists file actions; the [quickstart](quickstart.md#native-postgresql-lane) lists the required native test behaviors.

## Owner decision 2026-11-17: configuration change, no code

Owner chose "Config change" over the full build. F6 ships as one navigation edit made with the existing editor, so none of the conditional-save, policy-lock and native-test design above is implemented.

1. **Evidence.** The read-only evidence from 2026-11-16 shows the `pdv` Space has 8 links and none targets `/pos/appointments`.
2. **Edit.** A user with `settings:manage` adds one link to `pdv` from the sidebar context menu: **Nueva página… → Elige una página para enlazar → Agenda (`/pos/appointments`)**. Alternatively, **Copiar** the existing Agenda item, then **Pegar en → pdv**. Existing pages and their order stay unchanged.
3. **Check.** The existing operations account reloads, opens the new link, and sees the same appointments as the canonical agenda. Coli's check waits until the account is provisioned.

Accepted risk: if two admins edit the nav document at the same moment, the last save wins. That's acceptable for a one-time edit.
