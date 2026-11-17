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

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: plan.md

# Implementation Plan: FACES personal-account agenda in the operations Space

**Branch**: Planned `127-faces-operations-agenda` (not created) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), parent proposal item F6.

## Summary

Inventory the existing navigation, policy and personal preferences. If the agenda link is already in place, deliver a verification with zero writes. Otherwise add one marked agenda link to `/pos/appointments` in the `pdv` section, keeping every policy, role and unrelated field. Pinned source shows a race between a cached navigation read and a whole-document save, and shows that an alias can be more permissive than its target. Before the link is added, the code therefore changes in four layers:

- the navigation service and route: fresh read, conditional save and the preserve-single-link mode ([behavior.md](contracts/behavior.md));
- the navigation model, schema and editor copy path: the sticky `canonicalAccess` marker ([canonical-access.md](contracts/canonical-access.md));
- the permission service and request hooks: the canonical ceiling for marked aliases ([canonical-access.md](contracts/canonical-access.md#runtime-ceiling-for-every-role-combination));
- the section-access policy loader: an authority-only extraction ([policy-read-seam.md](contracts/policy-read-seam.md)).

There is no workspace provisioning, contextual-policy change, schema migration or new route. This security-tagged change is part of this owner-pending spec, not cosmetic configuration; unrelated defects found on the way still need a separate scope review.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2; Bun per the Hub registry and pinned package manifests.
**Primary Dependencies**: Existing navigation editor components, Zod schema and Drizzle PostgreSQL core and RBAC helpers. No new framework or package.
**Storage**: The existing org-scoped `app_nav_config` JSON document and `permission_rules` rows. No schema migration.
**Testing**: Existing Vitest and mounted Svelte harnesses; the `qa-native` real-PostgreSQL lane for concurrency and role phases; Browser Harness for UI acceptance.
**Target Platform / Project Type**: Authenticated Hub web application, desktop and 390px mobile; installed-app use is an optional separately recorded account check.
**Performance Goals**: The fresh read and conditional save each add a constant number of statements per save inside the existing transaction; ordinary cached navigation reads are unchanged. Record before and after statement counts for a save. No latency target is set.
**Constraints**: No broader permissions, unrelated WIP, production data writes, guessed identities or unrelated redesign. Owner approval before code or configuration; owner merge.
**Scale/Scope**: One proposal item. Synthetic fixtures stand in for the operations account and for denied and foreign controls. Coli is not provisioned (owner-confirmed) and its real-account proof is deferred.

## Constitution Check

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I Spec before code | Pass: specify precedes plan; no implementation | Pass: tasks follow plan; all tasks unchecked |
| II AS-IS / TO-BE / DELTA | Pass: pinned source; reported versus unproven facts separated | Pass: test oracles and explicit stop conditions |
| III Slice-scoped delivery | Pass: documentation only, no branch change | Pass: future isolated Hub checkout, PR to `master`, owner merge |
| IV Required gates | Pass: tokens, i18n, route and RBAC, browser requirements included | Pass: local QA and Hub checks required; none reported as run |
| V Data/security human gates | Pass for planning only | Pending owner approval before implementation or configuration |

Implementation is blocked until owner approval and the runtime preconditions are met. Review results are recorded under egm/. No constitution exception is claimed.

## Project Structure

Documentation, all under `specs/127-faces-operations-agenda/`: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/canonical-access.md, contracts/policy-read-seam.md, quickstart.md, tasks.md, implementation-inventory.md, checklists/requirements.md, and the generated design-review.md.

Hub source: [implementation-inventory.md](implementation-inventory.md) is the complete list of Create, Modify and no-change files, including tests. This plan does not repeat it. No file is deleted.

## Phase 0 — Evidence and reproduction

Read the source list in [research.md](research.md) on the implementation candidate and record changes from the pinned baseline. Run the inventory and synthetic scenario in the [quickstart](quickstart.md) before editing code. Classify each requested behavior as supported, configuration-only, reproducible gap or unavailable evidence. Supported behavior needs verification, not reimplementation. Any unexpected data or security defect becomes a separately reviewed amendment with owner approval.

## Phase 1 — Data model and contracts

Follow [data-model.md](data-model.md) and the three contracts. Use custom navigation, not workspace provisioning: `app_nav_config` stores custom sections and aliases, while `workspaces.service` handles company access. A new workspace would add unrelated membership; a new agenda page would duplicate the existing screen.

Do not broaden authoritative storage to solve a display gap. A denied route must stay denied on the page, `__data.json`, actions and `/api/nav/resolve`, not only in the menu.

## Delivery slices and test oracles

1. Inventory and reproduction, including forbidden and foreign controls, with no production writes.
2. User Story 1: the read-only current-state report (T006, T007), then the code that the selected design requires before any write: the conditional save and preserve-single-link mode (T008), the marker and copy path (T018), the canonical ceiling (T019) and the policy-read extraction (T020), verified by T009.
3. User Story 2: the persistence and recovery tests, synthetic rehearsal and native qualification (T010 to T012), kept separate from unrelated business mutations.
4. Full candidate qualification and owner-reviewed release (T013 to T016), then the real configuration change (T017). Local tests, CI, merge, deployment and post-merge runtime proof are recorded separately.

## Required gates and evidence

In the isolated Hub candidate run `bun run check` (zero errors and warnings), `bun run test` and `bun run build`, plus `bun run lint:design && bun run lint:tokens` after UI changes and `bun run i18n:compile` for changed strings. Check registered route contracts even though no route is added. Use the Browser Harness skill, with an isolated session if work is concurrent, and inspect route-data outcomes rather than a 200 document shell. Test Spanish and English, light and dark, 390px and desktop, keyboard focus and reload persistence. Record screenshots and network and redaction assertions with synthetic data only. Commands are in the [quickstart](quickstart.md).

## Complexity and risks

No new framework, schema or generic architecture. The main risk is misreading a supported feature, or a denied facet, as missing business data; keep availability and source provenance explicit. Configuration writes need owner-approved diffs and rollback evidence in the same scope. Tests that mock storage do not prove row-level security or real policy enforcement; the real-database checks are required.

## Configuration sequence

Seed the current-state inventory from the sanitized [read summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), then re-read the live document before acting. Its `pdv` section has eight page objects and no agenda link; keep those pages and all unrelated configuration unchanged. Do not put live page or account IDs in fixtures. Record the target `/pos/appointments` in the private execution manifest; [research.md](research.md#decisions-rationale-and-alternatives) shows the screen is aliasable. Resolve the operations personal account; it is not in the sanitized summary and is unverified until T007. Record Coli's proof as pending separate provisioning; the operations account and the org-wide link can complete independently. Do not invite, create an account or add a per-user grant.

Build one candidate from a `fresh=1` read: keep `version: 1` and every original object and order, and add only a marked `kind: 'link'` page to `/pos/appointments` with a collision-free six-character ID, within the limits in [data-model.md](data-model.md#existing-navigation-document) and the slug and target validation. Obtain the owner's approval of the diff, PUT once in preserve-single-link mode with the fresh config and policy revisions, then fresh-read persistence. Recovery, rollback and the handling of unknown responses follow [behavior.md](contracts/behavior.md#operator-sequence-and-recovery). There is no contextual-policy, role or membership write.

Then re-read each account's member-filtered navigation and preferences and test fresh login and reload, alias resolution, canonical loader data and denied controls. A link alone is not permission. If existing permissions do not allow the view, record the denial and stop that account's qualification; any access change needs a separately reviewed, owner-approved amendment.

The real change happens only in T017, after the qualified release in T016; the task order is in [tasks.md](tasks.md#dependencies-and-parallel-opportunities).

### Review artifact: research.md

# Research: FACES personal-account agenda in the operations Space

## Evidence baseline and reading list

Read the root AGENTS.md; the pinned Hub AGENTS.md and its CLAUDE.md include; `.claude/skills/ui-design-governance/SKILL.md`; the `speckit-specify`, `speckit-plan` and `speckit-tasks` skills; `.specify/memory/constitution.md`; the active spec, plan and tasks templates; and parent proposal item F6.

Hub source is the private pinned checkout `.local/faces-followups-2026-11-16/hub-source` at HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`, checked with `git rev-parse`. Source paths are relative to Hub; links pin that commit. The meta registry reports Hub base branch `master` and Bun. No extension hook or branch-creation hook ran.

| Evidence | Source anchor | Finding |
| --- | --- | --- |
| R1 | [`src/server/services/nav-config.service.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/nav-config.service.ts#L1) | Org-wide `app_nav_config` read and write, settings cache, navigation policy lock and post-commit invalidation. |
| R2 | [`src/server/db/pg-schema/nav-config.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/db/pg-schema/nav-config.ts#L1) | Navigation document storage; not workspace membership. |
| R3 | [`src/lib/nav/custom-sections.ts:11`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/custom-sections.ts#L11) | NavPage, section and config shapes; `kind` link versus main; alias IDs and limits. |
| R4 | [`src/lib/nav/custom-sections-nav.ts:43`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/custom-sections-nav.ts#L43) | Custom module and sidebar projections from the member-filtered config. |
| R5 | [`src/routes/api/nav/config/+server.ts:14`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/nav/config/+server.ts#L14) | `settings:manage`-gated GET and PUT, whole-document validation and RBAC invalidation. |
| R6 | [`src/routes/api/nav/access/+server.ts:10`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/nav/access/+server.ts#L10) | Separate `roles:edit`-gated contextual policy reads and writes. |
| R7 | [`src/routes/(app)/+layout.server.ts:217`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/+layout.server.ts#L217) | App-wide config read; `visibleNavConfig` applied at line 343 using viewer permissions. |
| R8 | [`src/lib/nav/nav-config.svelte.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/nav-config.svelte.ts#L1) | Client reads the member-filtered layout config, with an optimistic overlay. |
| R9 | [`src/lib/nav/nav-config-schema.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/nav-config-schema.ts#L1) | Structural schema versus the stricter semantic `validateNavConfig`. |
| R10 | [`src/server/services/workspaces.service.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/workspaces.service.ts#L1) | Workspace and company switching is separate from the custom Space. |
| R11 | [`src/lib/nav/personal-navigation.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/nav/personal-navigation.ts#L1) | Personal navigation model; check per-account hiding and pins before assuming the org config is enough. |
| R12 | [`src/routes/api/nav/resolve/+server.ts:19`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/nav/resolve/+server.ts#L19) | Client reroute endpoint (called from `src/lib/nav/alias-reroute.ts:39`); returns an alias target only when `loadPermissionsForUser` grants `page:<id>:view`. |

## Current behavior and uncertainty

The meeting calls the Space PDB or PDV and asks for the operations user and Coli, without account or Space IDs. Hub supports organization-wide custom navigation in `app_nav_config`, independent of company or workspace switching. The app layout reads this document and returns a member-filtered view. Aliases point to existing screens; page and section policy is stored separately.

A root read-only production inspection on November 16 found the operations section labeled `pdv` with eight pages (sell, clients, stock items, stock movements, catalog and three social or marketing pages) and no `/pos/appointments` target; the [sanitized summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) records this. That summary holds no account or member fields, so the operations personal account is unverified: T007 must resolve it before any claim. The owner confirmed on November 16 that Coli is not provisioned. Missing navigation is established; personal-account access is not.

## Decisions, rationale and alternatives

**Custom navigation, not workspace provisioning.** `app_nav_config` stores custom sections and aliases, while `workspaces.service` handles company access. A new workspace would add unrelated membership and possibly data separation; a new agenda page would duplicate the existing screen.

**An alias with `kind: 'link'`, never `kind: 'main'`,** so no existing navigation moves. The target is `/pos/appointments`: the meeting operated the POS appointments workflow, and `pdv` already groups POS sell and catalog. `src/lib/routes/route-design-manifest.ts:528` registers this static screen, `src/lib/nav/custom-sections.ts:87–93` admits it as an alias target, and `src/lib/routes/route-access-registry.ts:80` supplies its `pos.appointments` route key. `/scheduling/calendar` is out of scope. Reconfirm the target on the implementation candidate and stop on drift. No invite, account or grant is authorized; Coli's proof waits for separate provisioning.

**Fresh read and conditional save on the existing route.** `readNavConfig` (`nav-config.service.ts:18–32`) caches for 30 minutes plus 5 minutes stale-while-revalidate, so a cached preflight is not current-state evidence. `writeNavConfig` (lines 35–66) already holds the navigation policy lock and upserts and prunes in one transaction; the stored revision is compared there before any write, and a mismatch returns 412. Client-only hashes cannot close the cached-read to whole-write race. No revision column, new route or permission grant is added.

The revision helper is new code in `nav-config.service.ts`. It sorts keys by UTF-16 code-unit order rather than copying `stableValue` (`section-access.service.ts:349–357`), which uses `localeCompare`. A static import from `section-access.service.ts` is not possible: `section-access.service.ts` imports `permissions.service.ts`, which imports `nav-config.service.ts`. `writeNavConfig` already avoids that cycle with a dynamic `await import('./section-access.service')` (lines 50–51), and every new call from `nav-config.service.ts` into `section-access.service.ts` uses the same dynamic import. Full contract: [behavior.md](contracts/behavior.md).

**A link is not a grant.** Existing module, page and section decisions are verified for each account. No contextual access change is part of this item. Account identities and production configuration stay private execution inputs.

## Cross-cutting design decisions

Use existing Svelte 5 components and semantic design tokens; do not edit generated token CSS. User-visible labels go through Paraglide catalogs and `bun run i18n:compile`. Existing routes keep their route-design-manifest and RBAC coverage; no route or module is created. Denial is proven on server responses (page, `__data.json`, actions and `/api/nav/resolve`), not by hidden links alone. Source evidence and production evidence stay distinct.

## Policy pruning and native lane evidence

`pruneRemovedNavigationPolicies` (`section-access.service.ts:893–915`) selects every stored page and section rule for the org and deletes and audits each key absent from the candidate navigation. Keeping old document keys therefore does not keep orphan rules. The selected preserve-single-link mode validates the one-link diff, refuses a changed key that already has a rule, and skips pruning; normal saves keep pruning. The config revision includes the org ID, so a copied document in another tenant cannot satisfy this precondition.

The ordinary `vitest.config.ts` imports `NATIVE_POSTGRES_EXCLUDES`, and `scripts/qc/native-postgres-manifest.ts` excludes every `*.sql.integration.test.ts`. `vitest.qa-native-postgres.config.ts` admits only `nativePostgresFiles('qa-native')` and checks the loopback and disposable opt-in before running. The new fixture needs one manifest entry with its behavior names and report checks. The existing `section-access.sql.integration.test.ts` belongs to `qa-native`; its source, lock and fixture structure is the baseline to reuse. No new lane, CI job, runtime or open port is needed.

## Canonical versus alias policy

`permissions.service.ts:150–169` resolves an alias as page rule, then section rule, then the target's registry decision; it never consults a built-in `page:<target>` deny. `hooks.server.ts:367–398` resolves every `kind: 'link'` instance and sets `pageRule = true` at line 384, before the native static-page rule; `applyRouteAccessGuard` then returns early at line 417 and skips the registry. `custom-sections.ts:109–162` shows that `kind: 'link'` still has an instance URL. Leaving rule rows unchanged therefore does not prove the alias grants no more than the target. The selected marker and runtime conjunction are in [canonical-access.md](contracts/canonical-access.md); global changes to legacy alias semantics are rejected.

`loadPolicyRows` (`section-access.service.ts:122–157`) also reads `app_nav_config` (line 148), while `requireFreshPolicyActor` (lines 163–217) uses only policy, roles and rules. The authority-only extraction that follows from this is in [policy-read-seam.md](contracts/policy-read-seam.md).

`rolePolicyRevision` in `organization-role-policy.ts:53–63` is an existing pure fingerprint of the role model, catalog and rules. The writers that take the navigation policy lock, and the writers of the same tables that do not, are listed with their anchors in [canonical-access.md](contracts/canonical-access.md#lock-participants-and-unlocked-writers). Repeat that search on the implementation candidate.

## Review limits and execution preconditions

No browser run, product test, configuration write or implementation happened for this item. No organization, section or operator ID is inferred from meeting spelling. The reading list shows the implementation behavior relevant here; it is not a full security audit. The live facts above come from a repeatable-read `app_ledger` snapshot at 2026-11-16T19:20:30.051Z; private identities, raw records and unrelated configuration are not reproduced. Source and live-record evidence do not prove browser behavior or deployed source. Unknown runtime facts are handled by the inventory and reproduction tasks and their stop conditions before any change.

### Review artifact: data-model.md

# Data model: FACES personal-account agenda in the operations Space

## Terms

The stakeholder words in [spec.md](spec.md) map to existing Hub objects. The companion documents use only the right-hand terms.

| Term | Meaning |
| --- | --- |
| Space (operations Space) | One custom section, `NavConfig.sections[i]`, in the organization's `app_nav_config` document. The FACES operations Space is the section with slug `pdv`. It is not a workspace or company. |
| Agenda link | A new `NavPage` with `kind: 'link'`, `target: '/pos/appointments'` and `canonicalAccess: true`, appended to the `pdv` section. |
| Alias | Any `NavPage` with `kind: 'link'`. Its browser URL is the instance path `/<section>/<slug>~<id>`; `resolveNavInstance` maps that path back to the target. |
| Marked alias | An alias with `canonicalAccess: true`. Its access can never exceed the access of its canonical target ([canonical-access.md](contracts/canonical-access.md)). Aliases without the marker are unmarked and keep their current behavior. |
| Canonical target | The built-in route an alias points to, here `/pos/appointments`. |
| Navigation policy lock | The transaction advisory lock `pg_advisory_xact_lock(hashtextextended(orgId, 112))`, taken by `lockNavigationPolicy` in `src/server/services/nav-policy-lock.ts` and by the other writers listed in [canonical-access.md](contracts/canonical-access.md#lock-participants-and-unlocked-writers). |
| Stock write lock | The F7 advisory lock `hashtextextended('minion:stock-write:v1:' \|\| orgId, 0)`, which the F7 stock bridge ([authority-bridge.md](../128-faces-receivables-audit/contracts/authority-bridge.md)) takes before the navigation policy lock. F6 never takes it. |
| Trusted outer role | The PostgreSQL role of the existing server `ctx.db` transaction before `withOrgCoreTransaction` switches to the `app_ledger` role. Policy and actor reads run under it. |
| Native test | A test against a real PostgreSQL database, not mocked calls. |
| `qa-native` lane | The native test lane `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts`, run by `vitest.qa-native-postgres.config.ts` ([quickstart.md](quickstart.md#native-postgresql-lane)). |
| Controller | The disposable PostgreSQL connection that creates and drops the test's own child database. It is used for fixture setup only, never for request phases. |
| Qualified | Passed every gate the [quickstart](quickstart.md) assigns to that step. |

## Existing navigation document

`NavConfig`: `version: 1`; `sections[]` of `{id, slug, label, hidden?, pages[]}`; `builtinSections`; `builtin`. `NavPage`: `id` matching `^[a-z0-9]{6}$`, `kind` (`link` or `main`), `slug`, `label`, `target`, optional `icon` and `hidden`.

Semantic limits: at most 20 sections, at most 30 pages, labels of at most 40 characters, section slug `^[a-z][a-z0-9-]{0,31}$`. The structural API schema is looser, so both checks apply.

Contextual page and section policies (`permission_rules` rows with `module` `page:<id>` or `section:<id>`) and each person's personal navigation preferences are stored separately from the document.

## Marker

`NavPage` gains optional `canonicalAccess: true`. The only valid values are literal `true` or omission; `false` is rejected. A new agenda link must carry it. When a stored page is marked, every later save carries the marker forward for that page ID, even when an older client omits it. Runtime access to a marked alias is the existing alias decision intersected with the canonical target decision. The document stays `version: 1` in the existing JSON column; there is no database migration.

## Derived revisions

Neither revision is stored.

- **Config revision**: SHA-256 of JSON containing the authenticated `orgId` and the normalized version 1 document. Object keys are sorted recursively by UTF-16 code-unit order; array order is kept. The strong ETag is `"nav-v1-<64 lowercase hex>"`. Identical documents in two organizations produce different revisions.
- **Policy revision**: SHA-256 of key-sorted JSON `{version: 1, orgId, sectionId, target, rolePolicyRevision}`, where `rolePolicyRevision` is the existing function in `organization-role-policy.ts` over the organization role model, role catalog and permission rules. It covers no membership roster. Full definition: [canonical-access.md](contracts/canonical-access.md#policy-fingerprint-and-fresh-read).

The scoped save compares both revisions under the navigation policy lock before any write. A mismatch returns HTTP 412 and changes nothing. Policy snapshots prove that policy is unchanged; they never authorize a policy difference.

## Scoped save mode

The preserve-single-link mode is request intent, not a stored field. It accepts only one marked-link append to an existing section, or the removal of that link as its inverse. It rejects any stored rule for the changed page key and skips policy pruning, so no unrelated policy or audit row changes, including orphan rules.

## Server-only authority data

`PolicyAuthorityRows` is server-only authority data (organization role policy, roles, rules) with no navigation field. The normalized `NavConfig` read under `app_ledger` row-level security is combined with it only for the existing recoverability check ([policy-read-seam.md](contracts/policy-read-seam.md)). Neither object is a new HTTP payload; fresh GET returns the existing config body plus the revision headers.

## Private execution manifest

The manifest at `.local/faces-followups-2026-11-16/speckit-F6/execution-manifest.json` is local and never committed. It records:

- resolved organization and section IDs, and each account ID verified for runtime proof;
- the target `/pos/appointments`;
- fresh before, candidate and rollback config revisions, and the policy revision;
- the backup pointer, approved one-link diff and inverse;
- before and after effective authority comparison and the rollback receipt.

The manifest has two stages. The intake draft (T007) is read-only and gives no write authority. The apply manifest (T017) is regenerated from a new fresh read after the qualified code release (T016) and needs owner approval of that exact diff.

Account availability is evidence, not a membership record. The owner confirmed that Coli is not provisioned; the manifest records the existing operations account's qualification separately from Coli's deferred proof. This slice creates no account, invite, role or membership. No production identifier is hardcoded into product code or public fixtures.

## Validation and lifecycle

All existing validation, enum and permission rules stay binding. No record is created from display text. Read-only projection tests and explicit no-op or stop outcomes run before any write. Forbidden states are in [behavior.md](contracts/behavior.md); real-database proof is in [quickstart.md](quickstart.md).

### Review artifact: contracts/behavior.md

# Agenda navigation and conditional save

## Scope and authority

Append one agenda link (a marked `kind: 'link'` page to `/pos/appointments`) to the approved `pdv` section only if it is absent. Keep every existing page and section ID, order, label, target, hidden and builtin setting, contextual policy and role grant. There are no role, permission-rule or membership writes. The marked alias is intersected with canonical target access as [canonical-access.md](contracts/canonical-access.md) specifies; that contract is part of this design, and a config-only ETag or unchanged rule rows alone are not enough. Unmarked aliases keep their current semantics.

A hidden or denied existing agenda link is a blocker, not a reason to create another alias. Resolve organization, section and operator before writing. Resolve each personal account before claiming its runtime proof. The owner confirmed that Coli is not provisioned; the existing operations account's acceptance is independent, and Coli's proof follows separately authorized provisioning. This slice adds no invite, account or grant. The existing `settings:manage` gate on the config route and the `roles:edit` gate on policy inspection stay as they are.

## Fresh read

Extend `GET /api/nav/config` with `?fresh=1` to read the org-scoped database directly, bypassing `cached()` and its 30-minute plus 5-minute stale-while-revalidate policy. Any other value, or no value, keeps cached behavior. The JSON body stays the normalized `NavConfig`. Fresh responses carry `Cache-Control: private, no-store` and a strong ETag.

Add `readNavConfigFresh(ctx)` and server-only `navConfigRevision(orgId, config)` to `nav-config.service.ts`. The revision and ETag format are defined in [data-model.md](data-model.md#derived-revisions): the hash covers the authenticated `orgId` and the normalized version 1 document, with keys sorted by UTF-16 code-unit order and array order kept. Because the org ID is hashed, identical documents in two organizations yield different revisions, and a tag from one organization cannot authorize a save in another; actor and target checks still apply. No stored revision or schema change. `readNavConfig(ctx)` is unchanged. Inside writes, use a transaction-local reader; never nest `withOrgCore`. Calls from `nav-config.service.ts` into `section-access.service.ts` use the existing dynamic import (`nav-config.service.ts:50–51`) because of the static import cycle described in [research.md](research.md#decisions-rationale-and-alternatives).

## Conditional write and failures

`PUT /api/nav/config` accepts an optional strong `If-Match`. A malformed, weak, wildcard or multi-value header returns 400 `invalid_nav_revision` with zero writes. A valid header becomes `writeNavConfig(ctx, config, { expectedRevision })`. Without the header the existing behavior is unchanged, so existing payloads and first-party clients stay compatible. This protects the selected operation, not old clients that send no precondition.

Keep the existing outer transaction and `lockNavigationPolicy`. After locking, and before the upsert or `pruneRemovedNavigationPolicies`, read the current stored document through the scoped transaction, normalize it and hash it without cache. A mismatch throws `NavConfigRevisionConflict`, rolls back and returns 412 `stale_nav_config` with no document or policy change. The lock also serializes saves when no row exists yet. With a matching revision, keep structural and semantic validation, the upsert and the recoverability check. Normal saves keep their pruning; the scoped mode below skips it. Return the unchanged JSON body and the candidate ETag. Tests prove that a refused request causes no document, policy, audit or invalidation side effect, and legacy tests are kept.

## Policy-preserving single-link mode

The F6 client sends `X-Minion-Nav-Mode: preserve-single-link` with a strong `If-Match` and the strong policy-revision header from [canonical-access.md](contracts/canonical-access.md#policy-fingerprint-and-fresh-read). An unknown mode returns 400 `invalid_nav_mode`; this mode without `If-Match` or the policy-revision header returns 428 `nav_revision_required`. The route passes `{ expectedRevision, expectedPolicyRevision, mode: 'preserve_single_link' }` to the service. Org and actor never come from a header or body.

Under the lock and after the config revision matches, validate the normalized before and candidate delta. Version, `builtin`, `builtinSections`, section count, order, IDs and metadata, and every unrelated section's pages must be identical. One existing section either gains one final `kind: 'link'`, `canonicalAccess: true` page, or loses that final marked link as the inverse. Every kept page object and its order are identical. A new section, a `kind: 'main'` change, a full replacement, a label, move or hidden edit, or more than one change returns 400 `invalid_nav_single_link`.

From the locked diff, take the changed page key and query `permission_rules` for this org and `module = 'page:<changed id>'` across every stored role, including orphan keys absent from current navigation. Any rule for the added or removed key returns 409 `nav_policy_conflict`, reveals no role or rule details and changes nothing. This stops an orphan rule from activating through an ID collision, and stops a rollback from removing a page that gained policy after creation. The scoped mode never calls `pruneRemovedNavigationPolicies`, so unrelated orphan rules stay byte-identical; otherwise `section-access.service.ts:893–915` would delete and audit every stored orphan. The recoverability check still runs in the same transaction.

This is a single additive or inverse path, not a general policy-preserving replacement. No new table, policy grant or pruning framework is added. Tests keep an unrelated orphan rule and its audit baseline through a successful append and removal; a key collision, an arbitrary delta and a stale revision each leave config, policy and audit unchanged.

## Operator sequence and recovery

1. After the code is qualified and released, fresh-read the full config and ETag, back it up privately, inspect policy without changing it, and verify the org, section, target and limits.
2. If the agenda link is already in place, make zero writes and verify account visibility separately. Otherwise build the candidate with one collision-free six-character page ID and only the approved agenda link.
3. Obtain owner approval of the document diff and target. PUT once with the fresh ETag and preserve-single-link mode. A 412 stops the apply: fresh-read and present a new diff; never merge or retry under the old approval.
4. On 200 or an uncertain response, fresh-read again. Equality with the approved candidate proves persistence; do not PUT again. Equality with the before-state allows only a retry with a current precondition and the same intent. Any third state needs a new approved diff. A transport failure is not rollback proof.
5. Cache and RBAC invalidation can fail after commit. A fresh read proves persistence, not member-layout freshness. Record "refresh required" until member-filtered navigation and canonical route data show the alias. Retry reads or refreshes, never configuration writes. Do not claim both-account delivery while identity, access or freshness is unqualified.

Rollback is a separately approved conditional PUT in preserve-single-link mode that removes the added link. The fresh state must equal the candidate, and `If-Match` must carry its current ETag. Restore only the approved before-document; stop if another edit intervened. Disposable QA compensation runs in `finally` with the same check. No business-record count, policy or role grant may change.

## Proof and compatibility boundary

Counterexample: cached GET returns A while the database holds B; an old hash preflight on A passes and the old PUT overwrites B. The new fresh GET must return B despite cached A. After a fresh read of B, a concurrent save of C must make the conditional save of B return 412, keeping C and all permission rules. Run both race orders on disposable native PostgreSQL, including the absent-row case and the shared lock path; mocked calls are not concurrency proof. Equivalent object-key order must give the same ETag; a change in array order must change it. Also test denied and foreign callers, malformed, weak, wildcard and list preconditions, a valid save, a lost response after commit, failed invalidation, rollback conflicts and legacy no-header compatibility.

There is no new route, table, migration, contextual grant or visible redesign. The `NavPage` model and validation gain the optional `canonicalAccess` marker defined in [canonical-access.md](contracts/canonical-access.md); the document stays `version: 1`. A later legacy administrator can still replace the whole document; this safeguard does not claim global lost-update prevention across old clients.

### Review artifact: contracts/canonical-access.md

# Marked alias canonical authority and policy-bound save

## Scope and compatibility

Custom-navigation aliases have their own instance and section policy. Keeping those rows unchanged does not prove that authority is unchanged: `permissions.service.ts:157–169` can inherit a section allow while ignoring a built-in page deny, and `hooks.server.ts:372–387` grants the instance before the native page check. A `kind: 'link'` page still uses `instancePath` and `resolveNavInstance`, so it is not a plain link to the canonical URL.

This operation uses an opt-in marked alias; legacy alias semantics do not change for any tenant. Add `NavPage.canonicalAccess?: true` to `custom-sections.ts` and `nav-config-schema.ts`. Only literal `true` or omission is valid. Keep it through `normalizeNavConfig`, validation, serializers and navigation-editor copies. A preserve-single-link add requires the new link to carry `canonicalAccess: true`; its inverse removes that marked link. No table, rule row or grant is added.

The marker is sticky for a kept page ID across all `writeNavConfig` modes, including a legacy whole-config save without headers. Add pure `retainCanonicalAccess(previous, candidate): NavConfig`, run before normalization, validation and hashing: for every candidate page ID whose stored page was marked, set `true` even if an older client omitted the field. Moving or renaming the page keeps it; explicit `false` is invalid; no control or API clears it. Removing the whole page keeps existing authorization semantics; this does not protect a page removed and later recreated by a separate owner action. Return the stored normalized candidate and its ETag. Unmarked documents behave as before. UI copies carry the marker as opaque metadata; the agenda workflow shows no technical toggle.

## Runtime ceiling for every role combination

Add pure `canonicalTargetViewAllowed(target: string, caps: Capabilities, userRole: string | undefined, granted: ReadonlySet<string>): boolean` to `permissions.service.ts`. It extracts the static `SCREEN_DESIGN_MANIFEST` rule lookup and `decideRouteAccess` combination already used for native paths. The native static-path guard calls the same helper with its original granted set, so there is one canonical algorithm. `loadPermissionsForUser` passes its existing `capsToLegacyPermissions` set; the hook passes its current `guard.granted` set. For an aliasable static target, the decision is `caps.explicitView('page:' + target) ?? registryDecision`; otherwise the native matched static-page or registry rule applies. For a platform administrator, skip the built-in override as today and evaluate the original registry and granted inputs; add no new administrator allow. The module-availability guard stays on the resolved target path. The helper receives the same effective capabilities as the native request, including role-simulation narrowing.

For marked pages only, `loadPermissionsForUser` emits `page:<id>:view` when both the existing instance, section or registry decision and `canonicalTargetViewAllowed(target, …)` allow. Unmarked aliases keep the old decision. In `prepareRouteGuard`, after the instance existence and grant checks and the module floor, a marked hit also requires the canonical helper; the alias grant alone never suffices. Denial uses the existing generic 403 or 404 without exposing the denied rule. For a deeper path whose route policy differs, evaluate its native static-page or registry decision too, instead of skipping it with `pageRule = true`. Dataset, record, owner and field gates run through their existing handles; a canonical route allow is not a data grant.

The invariant is: marked alias allowed for a principal implies canonical target allowed for that principal, for current and future role, rule and membership combinations. A section allow or an alias allow cannot override a canonical deny, and a later canonical deny applies without deleting the marker or adding role rows. Every consumer uses the same rule:

- navigation visibility from the app layout;
- server page loads, `__data.json` and form actions through `hooks.server.ts`;
- `GET /api/nav/resolve` (`src/routes/api/nav/resolve/+server.ts`), which the client reroute in `src/lib/nav/alias-reroute.ts:39` calls. It reads `page:<id>:view` from `loadPermissionsForUser`, so the conjunction above already covers it and the endpoint's code does not change. Its existing `GET /api/nav/resolve` suite in `src/routes/api/nav/server.test.ts` gains a case: a marked alias whose canonical target is denied returns 404.

Menu caching can delay what a member sees: a stale menu can still show a denied link, but the hook enforces the same canonical decision a native request gets. A fresh read after the save proves persistence, not the current member layout or access.

## Policy fingerprint and fresh read

The config ETag binds only the normalized config and the authenticated org. Scoped preserve-single-link saves also send `X-Minion-Nav-Policy-Revision: "nav-policy-v1-<64 lowercase hex>"`. The scoped mode requires both this header and `If-Match`: a missing one returns 428 `nav_revision_required`; a malformed, weak, wildcard or list policy revision returns 400 `invalid_nav_policy_revision`. Normal saves without a mode do not require the policy header.

Extend the fresh GET as `/api/nav/config?fresh=1&policySection=<sectionId>&policyTarget=<canonicalTarget>` when both selector fields are present. A selector without `fresh=1`, or with only one field, returns 400 `invalid_nav_policy_selector`. Validate the section ID and aliasable target without guessing. This read requires `settings:manage` and `roles:edit` under both actual and effective authority, and grants nothing. It returns the same config body, config ETag, policy-revision header and `Cache-Control: private, no-store`; no role, rule or member data is returned. A plain GET or `fresh=1` without a selector keeps its earlier contract.

Add `readNavConfigAndPolicyFresh(ctx, selector)` to `nav-config.service.ts`. Its one transaction takes `lockNavigationPolicy` first, reads the uncached config and policy rows, and checks the current actor through a new export of `section-access.service.ts`, reached with the dynamic import described in [behavior.md](contracts/behavior.md#fresh-read):

```ts
export async function assertNavPolicyRevisionInTx(
  tx: CoreTx,
  ctx: CoreCtx,
  selector: { sectionId: string; target: string },
  expected?: string,
): Promise<string>;
```

It checks `roles:edit` and actual and effective `settings:manage` using `ctx.profileId` and `ctx.tenantId` only, never body claims, through the authority-only loader in [policy-read-seam.md](contracts/policy-read-seam.md). A missing profile or unavailable authority refuses. Ordinary config GET permissions do not change.

Fingerprint: SHA-256 of UTF-8, key-sorted (UTF-16 code-unit order) JSON `{version: 1, orgId, sectionId, target, rolePolicyRevision}`. `rolePolicyRevision` is the existing pure `rolePolicyRevision(rows.policy, rows.roles, rows.rules)` in `organization-role-policy.ts:53–63`, which canonicalizes the role catalog, rules, role model and default role; it is reused unchanged, including its `localeCompare` ordering. Authority rows are loaded uncached in the same transaction with the existing same-org locking reads, including orphan rules; never hash a cached matrix or display names. The selector comes from validated fresh-read input and, at apply time, is derived again from the added or removed link. Membership is not part of the fingerprint: the current actor is rechecked under the lock, and the runtime ceiling handles any current or future membership.

## Apply order

`writeNavConfig` scoped options add `expectedPolicyRevision`; the route reads headers and never takes authority from JSON. In the existing locked transaction:

1. compare the current config revision;
2. form the delta and selector, and require `canonicalAccess: true` on the addition or the inverse;
3. compute and check the current policy revision through the helper and the fresh actor checks;
4. check for a policy rule on the changed page key;
5. persist the sticky normalized config, skip orphan pruning and assert recoverability.

A policy mismatch returns 412 `stale_nav_policy` with no config, policy, audit or invalidation effect, even when the config ETag still matches. A config mismatch (412 `stale_nav_config`) is checked first. A rule added after the preview normally produces the policy 412 before the collision check; to test the 409 collision, seed the rule before the fresh policy preview. There is no automatic refresh and retry under an old owner approval.

## Lock participants and unlocked writers

This inventory comes from a search of the pinned source for `lockNavigationPolicy`, `hashtextextended(…, 112)`, and writes to `permission_rules`, `org_roles`, `organizations`, `member_roles`, `organization_members` and `app_nav_config`, excluding tests. Repeat the search on the implementation candidate; a new writer of a revision input that skips the lock must join the lock before qualification.

Writers that take the navigation policy lock:

| Writer | Anchor | Changes | Role in F6 |
| --- | --- | --- | --- |
| `writeNavConfig` | `nav-config.service.ts:37` | Navigation document; prunes page and section rules | Config revision input. Covered by the config race tests. |
| `writeSectionAccess`, `resetRegisteredRolePolicies`, `deleteRoleAccessCatalog` | `section-access.service.ts:716`, `:807`, `:924` | `permission_rules`, `org_roles` | Policy revision input. `writeSectionAccess` is the policy writer in both policy-only race orders. |
| `createOrganizationRole`, `renameOrganizationRole`, `setDefaultOrganizationRole` | `organization-role-admin.service.ts:350`, `:435`, `:461` | `org_roles`, `permission_rules`, `organizations.default_role_key` | Policy revision input. Same lock and same tables as above, so the `writeSectionAccess` race tests cover the serialization they share. |
| `mutateOrganizationMemberRoles` | `organization-role-admin.service.ts:527` | `member_roles` | Actor state. The actor-revocation case removes the actor's role through this writer in both lock orders. |
| `protectNewModelMembershipRemoval` (called by `deleteUser` and `updateUserOrganizations`) | `user.service.ts:218` | Deletes `member_roles` and `organization_members` | Actor state. Same tables and lock as the actor-revocation case; not tested separately. |
| `deleteUser` | `user.service.ts:262` | Locks every member org, then sets `profiles.deletion_pending` | Actor state. `requireFreshPolicyActor` already refuses a profile with `deletion_pending`; not tested separately. |
| `updateUserOrganizations` (add path) | `user.service.ts:397` | Inserts `organization_members` and `member_roles` | Membership only; can add members but cannot change the actor's own rights. Not tested separately. |
| `lockOrganization` in organization admission | `join/organization-admission.ts:138` | Admission inserts `organization_members` and `member_roles` (lines 286–290) | Membership only, as above. Not tested separately. |
| `withBrainWriteAuthority` | `brain-access-grants.service.ts:59` | Brain ACL rows only | Writes no input of either revision or of the actor check; takes the lock to read consistent role state. No F6 conflict. |
| `bootstrapOrganization` | `organization-bootstrap.service.ts:38`, `:63` | Line 38: existing-org retry, reads only. Line 63: creates a new org with its role, rules and owner membership | Cannot conflict: a new org has no navigation document or approved diff. |

Writers of the same tables that do not take the lock:

| Writer | Anchor | Changes | What F6 does |
| --- | --- | --- | --- |
| `setRoleOverride`, `clearRoleOverride` | `rbac.service.ts:765`, `:802` | `permission_rules` through the Supabase admin client | No callers outside tests at the pinned commit. Outside the serialization promise; a live caller found on the candidate must join the lock first. |
| Owner membership step in `provisionOrganization` | `organization-provision.service.ts:308`, `:321` | `organization_members`, `member_roles` for legacy-model orgs during provisioning | Membership only, at org creation. Outside the serialization promise; T017 confirms no provisioning run targets the FACES org during apply. |
| Post-transaction cleanup in `deleteUser` | `user.service.ts:273` | Deletes `organization_members` through the Supabase admin client | Runs after `deletion_pending` is set under the lock, which the actor check already refuses. |
| `updateTenant` | `tenant.service.ts:27` | `organizations.name`, `slug` | Not an input of either revision or the actor check. |
| Privileged SQL and scripts | — | Any | Outside the serialization promise; out-of-band maintenance during the real apply blocks it. |

An advisory lock does not exclude writers that ignore it. The runtime canonical ceiling stays the independent no-widening boundary, including when policy legitimately changes later.

## Operator and qualification changes

T017 requests both fresh headers with its real section and target selector, backs up the config and policy fingerprints privately, shows the marked-link diff and unchanged-role intent, and obtains owner approval of those current hashes. Both headers are submitted once; a policy 412 stops the apply like a config 412. After a failure following commit, recover with a fresh config and policy read and member and canonical route checks, never another write. The conditional inverse uses fresh config and policy revisions and refuses changed-key policies.

The native behaviors this contract adds are listed with the others in the [native lane](quickstart.md#native-postgresql-lane). Unit, route and hook tests also cover: omitted and `false` marker parsing; sticky preservation on moved and kept IDs; missing and malformed selector and header cases; plain GET and no-mode compatibility; actual and effective actor denial; and no raw policy serialization. Browser and route-data tests compare the canonical route with the marked alias under canonical deny plus section allow, alias explicit allow, denied module, a custom multi-role union, changed membership and a deeper stricter route; direct page, data and action requests gain no authority. Unmarked fixtures keep legacy semantics. Use the existing harnesses for `permissions.service`, the hooks and `custom-sections`.

## Copy and paste keep the marker

The copy pipeline projects fields, so `structuredClone` alone does not keep the marker. Three edits are required:

- `src/lib/nav/nav-edit.svelte.ts`: add `canonicalAccess?: true` to the `navClipboard.item` type;
- `src/lib/components/layout/NavContextMenu.svelte`: the copy handler copies `canonicalAccess: true` only when the source page has it; unmarked and builtin pages omit it;
- `src/lib/nav/custom-sections.ts`: `addLink` input and construction copy literal `true` into the new generated-ID page for both custom-section and builtin-module destinations.

Both `paste` and `paste:<sectionId>` already forward the clipboard to `addLink`; keep that. The server sticky rule cannot repair a new page ID whose clipboard dropped the marker, so the `addLink` path is required. `duplicatePage(pageId)` spreads the whole source page and keeps the marker; verify it and keep its hidden-field handling. Builtin duplicates stay unmarked unless the source is marked. There is no explicit `false`, inferred grant or user-facing toggle.

Tests: extend `custom-sections.test.ts` for marked and unmarked clipboard-to-`addLink` cases on both destinations and for `duplicatePage`, checking that pasted IDs differ from source IDs and the input config is not mutated. Extend `src/lib/components/layout/NavContextMenu.mounted.test.ts` to copy a real marked instance, paste through each destination, inspect the submitted candidate and returned document, reload and assert the new link is still marked; unmarked copies stay unmarked. In the native marked-alias behavior, persist the copied new-ID candidate with the real `writeNavConfig`, then check the real permission and hook canonical deny, so it never becomes an unmarked escape.

## Fresh policy actor on the trusted outer transaction

`assertNavPolicyRevisionInTx` uses the authority-only loader and `requireFreshPolicyActor` from [policy-read-seam.md](contracts/policy-read-seam.md). The mixed `loadPolicyRows` also reads `app_nav_config`, so F6 never calls it, directly or through a recoverability fallback. Reads and row locks on organizations, profiles and members cannot run under the `app_ledger` ACL and row-level security; navigation-document reads stay in that nested scope.

Follow the existing `writeNavConfig` pattern: `ctx.db.transaction` owns the trusted outer transaction and the navigation policy lock, and only the document read or write enters `withOrgCoreTransaction` with its `app_ledger`, org and profile scope. Policy loading, the fresh actor check and the `settings:manage` plus `roles:edit` checks run on the same outer transaction, before entering or after leaving that nested scope, never inside it. The fresh GET with a policy selector uses the same outer transaction and lock. It writes no business data, but it does not declare the transaction read-only because the policy helpers take row locks.

Before the policy reads, verify that the current role is the original trusted outer role with SELECT and lock rights on the needed org, profile, member, role and rule rows, and not `app_ledger`, `anon`, `authenticated`, `service_role` or a worker role. Otherwise fail with `nav_authority_unavailable` before any effect. `ctx.db` is the existing server core handle, not a caller-provided URL or new client. Do not `SET ROLE` to a higher role, open a second connection or add `app_ledger` grants. `withOrgCoreTransaction` restores the original role and settings and is awaited before the next policy call; assert the restoration on success, rollback and error. All phases share one transaction and backend and hold the navigation policy lock until commit or rollback.

Do not call the F7 stock bridge from this transaction. The bridge takes the stock write lock before the navigation policy lock; calling it while F6 already holds the navigation policy lock reverses that order and can deadlock. F6 needs no security function, migration or F7 runtime dependency. Runtime alias, data and field permission checks are unchanged. The scoped save order in [Apply order](#apply-order) is unchanged; this section only fixes which role each phase runs under.

The native fixture models this split: the fixture's outer role for policy checks, the real `app_ledger` role only for nested document access, the same backend with restoration, and no extra org, profile or member grants or policies. Add negative direct-access probes for the baseline role and assert no privileged role leaks into document SQL or outside the transaction. Use the owned public database fixture in the [quickstart](quickstart.md#native-postgresql-lane), not search-path substitutes. Before the public policy and foreign-key fixtures, apply the F7 test-only [native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md) (child `auth` schema, users, `uid`, owner, ACL, JWT and profile foreign key). It grants no business or browser authority.

### Review artifact: contracts/policy-read-seam.md

# Authority-only navigation policy reads

This contract separates policy reads from navigation-document reads without adding a security function, role grant, schema, connection or public endpoint. In pinned `section-access.service.ts`, `loadPolicyRows` (lines 122–157) reads organizations, role catalogs and rules, and also `app_nav_config` (line 148). Calling it on the trusted outer transaction would read the navigation document outside its row-level security scope. `requireFreshPolicyActor` (lines 163–217) uses only policy, roles and rules, so its checks need no document.

`nav-config.service.ts` reaches every helper below with the existing dynamic `import('./section-access.service')` (as at `nav-config.service.ts:50–51`). A static import would close the cycle `section-access.service` → `permissions.service` → `nav-config.service`.

## Extraction

In `section-access.service.ts`, add private `type PolicyAuthorityRows = Omit<PolicyRows, 'nav'>` and private `loadPolicyAuthorityRows(tx: CoreTx, orgId: string): Promise<PolicyAuthorityRows>`. Move the existing active-org, organization-role-policy, legacy or custom role and rule reads into it with their current predicates, role composition, ordering and locks. It does not query `app_nav_config`. No empty placeholder nav object, cached rows, broader grant or F7 bridge stands in for authority.

Narrow `requireFreshPolicyActor`'s `rows` parameter to `PolicyAuthorityRows` (or a `Pick` of policy, roles and rules), because it never reads nav. Its identity, role-action, actual and effective simulation and rank semantics do not change, and existing callers passing full `PolicyRows` stay type-valid. Keep the private `loadPolicyRows` signature and behavior for unrelated section and role administration: it combines the extracted authority rows with its existing nav query and normalization. This refactor changes no caller's row-level security behavior and adds no parameter an HTTP client can supply.

`assertNavPolicyRevisionInTx(tx, ctx, selector, expected?)` (signature in [canonical-access.md](contracts/canonical-access.md#policy-fingerprint-and-fresh-read)) uses only `loadPolicyAuthorityRows` and `requireFreshPolicyActor`, with `roles:edit` and actual and effective `settings:manage`. It returns the policy revision string. It does not call `loadPolicyRows`, read the navigation document, start a transaction or build a placeholder nav. Org and profile come from the trusted `CoreCtx`. `rolePolicyRevision` consumes only the authority policy, roles and rules.

Validate the selector's section and target against the current normalized config, read under the nested `app_ledger` scope in `nav-config.service.ts`, and against the existing static aliasable registry. Neither the fresh GET nor the scoped PUT validates a section against a client-supplied config. The config ETag binds the org-scoped document; the policy revision binds the authority rows and the selector. HTTP headers, body and status codes are as defined in the other contracts.

## Recoverability without a privileged document read

Add this exported server-only helper to `section-access.service.ts`:

```ts
export async function assertNavigationAccessRecoverableInTx(
  tx: CoreTx,
  orgId: string,
  nav: NavConfig,
): Promise<void>;
```

It loads the authority-only rows and calls the existing `assertOrganizationAccessRecoverableDrizzle(tx, orgId, { ...authorityRows, nav })` with a complete `PolicyRows` object. `nav` is the normalized document read or persisted under row-level security in the same transaction, never a route body. In this call the existing function must not fall back to the mixed `loadPolicyRows`. The organization owner and administrator recoverability checks keep their member and assignment predicates and locks. No new role action is introduced.

The navigation writer calls this helper after the nested document write has finished and the original role and settings are restored, in both normal saves and preserve-single-link mode. Normal saves prune first, as today, then check recoverability against the persisted sticky normalized document; a failed check rolls back the document, pruning and audit together. Scoped saves keep their skip-pruning, unchanged-role policy. Other existing direct calls to `assertOrganizationAccessRecoverableDrizzle` without known rows are outside this change.

Normal saves without a mode keep their current authority: they do not gain the `roles:edit` check or the policy header. Only the scoped mode and the selector fresh GET run the role and settings checks. A test saves as a settings-authorized actor without `roles:edit` and expects success, so the helper split does not turn the scoped role check into a general navigation-edit requirement.

## Transaction and role phases

The selector fresh GET and both save modes each keep one `ctx.db` transaction, one backend and the navigation policy lock. Authority reads and the actor and recoverability checks run only under the trusted outer role. Every navigation-document SELECT, INSERT or UPDATE, including the sticky-marker read, the config comparison, the selector section lookup and the persisted result, runs inside an awaited `withOrgCoreTransaction` with the `app_ledger` role and org and profile scope. Only the normalized nav returned by the server crosses back as typed data, and role and settings restoration is asserted before the next authority phase. No privileged `app_nav_config` SELECT hides inside a policy or recoverability helper.

The save order is in [canonical-access.md](contracts/canonical-access.md#apply-order), followed by the recoverability check and commit. Early reads change nothing, and every actor check passes before any output or write. The fresh GET writes no business data but is not declared read-only, because the policy helpers take row locks. The F7 stock write lock is never taken after the navigation policy lock. No connection switching, `SET ROLE` escalation or new `app_ledger` org, profile or member rights are allowed.

## Qualification

Extend the existing `src/server/services/section-access.service.test.ts` for: unchanged unrelated callers of the full loader; the authority-only queries; the narrowed actor input; revision equality; and the recoverability helper with a supplied current or candidate nav. It is in the [focused command](quickstart.md#focused-checks). Existing section-access SQL suites stay unchanged unless their shared fixture needs a recorded compatible extension; their permissive fake policies do not replace the F6 native lane.

Within the native behaviors in the [native lane](quickstart.md#native-postgresql-lane), trace each request phase's SQL, backend, `current_role`, org and profile. Every `app_nav_config` statement runs as `app_ledger`, including the recoverability path after the save. Every authority-only org, profile, member, role and rule statement runs under the original trusted outer role. Setup statements in the controller phase are labeled separately from request reads. Cover the selector fresh GET, a legacy save, conditional add and inverse, an absent config, stale policy and config refusal, the absence of any mixed-loader nav SELECT, and restoration on success, error and rollback. Test both lock orders against a real policy writer without timing sleeps. SQL traces and baseline negative checks use real native roles, not assertions on mocked source text.

Mounted and route tests keep the strong config and policy headers, the marker and copy behavior, and the absence of raw policy rows. A source, actor or policy denial leaves no persisted config, rule or audit change and triggers no retry under the earlier owner approval.

### Review artifact: quickstart.md

# Quickstart validation: FACES personal-account agenda in the operations Space

## Preconditions

Owner approval is pending. These are instructions for a future isolated Hub candidate; none was run while writing this document. Read Hub AGENTS.md and `docs/qa-stack.md`, and verify the candidate HEAD and the registry base branch `master` and Bun. Use synthetic data and the guarded loopback QA stack only, never a production-backed `bun run dev`. Check `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack.

## Focused checks

The focused command covers every test file that [implementation-inventory.md](implementation-inventory.md) creates or modifies and that runs under the ordinary `vitest.config.ts`. The native SQL file is excluded from that config and runs only in the [native lane](#native-postgresql-lane).

| Test file | Status |
| --- | --- |
| `src/server/services/nav-config.service.test.ts` | Create: revision, fresh read, conditional save and marker cases |
| `src/server/services/section-access.service.test.ts` | Extend: authority-only extraction and recoverability helper |
| `src/server/services/permissions.service.test.ts` | Extend: canonical versus marked and unmarked alias decisions |
| `src/hooks.tenant.test.ts` | Extend: page, `__data.json` and action guard for marked aliases and deeper routes |
| `src/routes/api/nav/server.test.ts` | Extend: fresh selectors, headers, status codes, `/api/nav/resolve` canonical deny |
| `src/lib/nav/custom-sections.test.ts` | Extend: marker parsing, sticky retention, copy into `addLink` |
| `src/lib/nav/custom-sections-nav.test.ts` | Extend: marked visibility under the canonical ceiling |
| `src/lib/nav/personal-navigation.test.ts` | Extend: personal hide and order persistence |
| `src/lib/components/layout/NavContextMenu.mounted.test.ts` | Extend: copy, paste, save and reload of marked links |
| `scripts/qc/native-postgres-manifest.test.ts` | Extend: admission and behavior identity |
| `scripts/qc/native-postgres-report.test.ts` | Extend: missing, duplicate, skipped and extra behavior rejection |

Run from the Hub checkout:

```bash
bun --no-env-file run vitest run \
  src/server/services/nav-config.service.test.ts \
  src/server/services/section-access.service.test.ts \
  src/server/services/permissions.service.test.ts \
  src/hooks.tenant.test.ts \
  src/routes/api/nav/server.test.ts \
  src/lib/nav/custom-sections.test.ts \
  src/lib/nav/custom-sections-nav.test.ts \
  src/lib/nav/personal-navigation.test.ts \
  src/lib/components/layout/NavContextMenu.mounted.test.ts \
  scripts/qc/native-postgres-manifest.test.ts \
  scripts/qc/native-postgres-report.test.ts
```

`--no-env-file` keeps a local `.env` from pointing tests at a shared database. A passing baseline is not a reproduced fix: first capture a failing assertion for the missing behavior, then run it on the candidate. Do not write tests that only mirror the implementation.

## Scenario and oracle

Start with a local QA synthetic organization, two personal staff users, and denied, unrelated and other-org controls. Create an equivalent Space containing sell, clients and marketing. Exercise: link already present (no-op), missing link, hidden link, contextual deny, disabled module, duplicate link, changed preflight revision and refresh failure after commit. Compare the navigation document and authority sets before and after. Reload each personal session, open the alias by keyboard and by direct URL, and inspect canonical route data IDs and authorization.

Seed a canonical `/pos/appointments` deny plus a section allow on the destination: unmarked legacy behavior is unchanged, while a new marked link cannot make navigation, server data, actions or `/api/nav/resolve` more permissive than the canonical target. Exercise custom roles and a multi-role union, later policy and membership changes, a deeper route deny, and marker retention when an old normal PUT omits it.

Preview with `fresh=1` and the `policySection` and `policyTarget` selector, and capture both strong headers. Change a policy only through `writeSectionAccess`, which takes the navigation policy lock: the config ETag still matches, but a PUT with the old policy revision returns 412 with no effect. The reverse lock order shows a committed save followed by an ordinary policy change that never widens the marked route. Also test revoking the actor's role through `mutateOrganizationMemberRoles`, missing and malformed selectors and headers, a stored orphan rule seeded before the preview (409 collision), and a new rule after the preview (policy 412 comes first). Plain GET and no-mode payloads and unmarked aliases stay compatible.

For each allowed journey, also send direct API and navigation requests as denied, owner-scoped and foreign controls. Capture the status, the actual loader outcome and redacted payload assertions; a 200 document shell does not prove authorization or a successful data load. For mutations, compare authoritative records before and after and the retry outcome, not a success toast. Production execution is separate, approval-gated, and uses private resolved identities only.

The cached-read race counterexample and the full request, error and recovery contract are in [behavior.md](contracts/behavior.md#proof-and-compatibility-boundary).

## Account availability

The owner said on November 16 that Coli is not provisioned. Verify the existing operations account's alias visibility, canonical route data, unchanged permissions and reload behavior; that is the complete current-account acceptance. Report Coli as not yet verifiable, not as a failed login or missing role. Creating or inviting an account, or granting membership, is outside this slice. After separate provisioning, repeat the same checks before claiming Coli's access. Synthetic second-persona tests prove policy behavior only, not that the account exists.

## Browser acceptance

Use the browser-harness skill. Use a uniquely named isolated browser when work is concurrent; never share tabs or processes with another agent. Test desktop and 390px width, Spanish and English, light and dark, keyboard-only operation and a fresh reload. Check accessible labels and focus, empty, error and denied states, link behavior and the scope of persisted preferences. A login, MFA or account ambiguity stops the run until the account is confirmed; keep session access details out of committed documents.

## Native PostgreSQL lane

The new fixture `src/server/services/nav-config-conditional.sql.integration.test.ts` is admitted once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts` with `minimumAssertions: 11` and `exactAssertions: true`. The `exactAssertions` flag, its type and the report check come from the F7-owned [shared exact-count harness](../128-faces-receivables-audit/contracts/native-exact-count.md), which must be qualified first; it preserves unrelated legacy rows. This is a test-harness dependency only, not an F7 runtime or migration dependency.

The fixture has eleven required behaviors. Under `describe('navigation conditional save against PostgreSQL')`, each `it` title is the part after that prefix. For example, `it('fresh read bypasses stale cache and binds the current org document')` yields the first full name:

1. `navigation conditional save against PostgreSQL fresh read bypasses stale cache and binds the current org document`
2. `navigation conditional save against PostgreSQL stale conditional save preserves document policy and audit`
3. `navigation conditional save against PostgreSQL concurrent matching saves serialize and only one commits`
4. `navigation conditional save against PostgreSQL absent document saves and policy writes share the existing lock`
5. `navigation conditional save against PostgreSQL single link append preserves unrelated orphan rules and rejects changed key policy`
6. `navigation conditional save against PostgreSQL precise inverse rollback refuses intervening config or policy changes`
7. `navigation conditional save against PostgreSQL committed save with failed invalidation never repeats the write`
8. `navigation conditional save against PostgreSQL foreign org etag refuses and legacy normal save remains compatible`
9. `navigation conditional save against PostgreSQL marked alias cannot widen canonical deny through inherited section or page grants`
10. `navigation conditional save against PostgreSQL policy only changes invalidate the approved scoped save in both lock orders`
11. `navigation conditional save against PostgreSQL retained canonical marker survives legacy saves and future role changes preserve native access ceiling`

Behaviors 9 to 11 come from [canonical-access.md](contracts/canonical-access.md). The copied new-ID marker case, the role-phase traces from [policy-read-seam.md](contracts/policy-read-seam.md#qualification) and the actor-revocation case run inside these behaviors; the count stays eleven. Extend `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts` for this admission and for rejecting a missing, skipped or duplicate behavior and an extra twelfth passing behavior. The lane count stays at nine; the existing config reads manifest files automatically, so there is no include glob or CI change. The ordinary test run excludes this file and is not its proof.

Fixture setup and cleanup use an owned public database:

1. Call `openDisposablePostgres` with explicit `MINION_QC_DISPOSABLE='1'` and `MINION_QC_DATABASE_URL`. Require host `127.0.0.1` or `[::1]`, an explicit port, the `minion_qc` owner and name, no query string or fragment, and the `minion-360-disposable:v1` marker. Use the F7 controller recipe (CREATEDB or initial superuser, existing non-bypass `app_ledger`, `SET ROLE` admission) without role escalation. Before any public profile, member or org policy or foreign-key DDL, apply the F7 test-only [native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md): the full-lane controller image `pgvector 0.8.6-pg18` with database `minion_qc_vectors`, a child `auth` schema with users and a `uid` function (`STABLE SECURITY INVOKER`) with canonical owner, ACL and JWT semantics, and the auth user seeded before the profile, email and foreign key. Add no `app_ledger` grants, policies or JWT subject.
2. Create only `minion_qc_faces_nav_<32 hex>`, validate it against `^minion_qc_faces_nav_[a-f0-9]{32}$`, set the marker, derive the child URL by replacing only the validated database path, and qualify the child. Source policy helpers run against the child's public tables, not a search-path substitute. Reuse the section-access fixture definitions and baseline ACL and row-level security, with the nav, policy, org, profile, member, role and audit tables. Add no `app_ledger` org, profile or member grants or permissive profile policy.
3. Inject child Drizzle clients. The policy and actor phase runs under the controller's trusted outer role, as the navigation service does; document phases run through the real `withOrgCoreTransaction` with `app_ledger` on the same backend and restore the original role before further policy checks. Use no global client or authority mock. Record privilege, role, settings and backend receipts, baseline negative direct-access probes, and restoration on success and failure. Never call the F7 stock bridge after taking the navigation policy lock. Independent clients and acknowledged lock barriers prove the races.
4. In `finally`, release blockers, roll back and close all child clients, drop only the recorded child database through the controller, verify it is gone, and close the controller. Never reset the controller, shared QA or public data, change shared roles, or fall back to the application `.env.local` or `SUPABASE_DB_URL`. A missing fixture, privilege or marker fails qualification before any write; it never skips.

The complete `qa-native` lane also needs its separately owned full-schema QA target and guard flags, because other admitted fixtures use it. After qualifying both targets and setting the private `F6_DISPOSABLE_DATABASE_URL` and `F6_FULL_SCHEMA_QA_URL` from the owned local stack, run from the isolated Hub candidate:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F6_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F6_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-nav-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-nav-qa-native.json
```

Do not add a single-file filter to this run: the report guard requires every admitted `qa-native` file once, zero failures, skips and todos, and every behavior name. A filtered development run is labeled focused and is never passed to the report guard as complete evidence. Missing or invalid targets or markers fail before fixture writes. No code runs against a production URL.

## Full qualification and result recording

Run Hub `bun run check`, `bun run test` and `bun run build`. After UI edits run `bun run lint:design && bun run lint:tokens`; after message edits run `bun run i18n:compile`. Route and RBAC manifest checks are part of the candidate's scripts; read `package.json` rather than invent a command. Record commands, exit codes, candidate hash, fixture matrix, screenshots and open gates in `specs/127-faces-operations-agenda/validation.md`. Do not mark implementation done until its outcomes pass. The order of local qualification, release and the real configuration change is in [tasks.md](tasks.md#dependencies-and-parallel-opportunities).

### Review artifact: tasks.md

# Tasks: FACES personal-account agenda in the operations Space

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/canonical-access.md, contracts/policy-read-seam.md, quickstart.md and implementation-inventory.md in this directory.
**Status**: Specification only; every task is unchecked. Tests are required by this spec. Hub paths are relative to minion_hub unless prefixed `specs/` or `.local/`.

## Phase 1 — Setup

- [ ] T001 Record owner spec approval, the execution scope and the independent-review result in `specs/127-faces-operations-agenda/validation.md` before any implementation or configuration action.
- [ ] T002 Verify the candidate hash, `master` PR base and Bun from repo-policy, and local QA ownership using `docs/qa-stack.md`; obtain an authorized isolated feature checkout without touching shared WIP.

## Phase 2 — Foundational evidence

- [ ] T003 Re-read every anchored source in `specs/127-faces-operations-agenda/research.md`; classify supported behavior versus reproduced gap and record candidate differences in `specs/127-faces-operations-agenda/validation.md`. Reproduce the cached-read to whole-write data-loss counterexample. Only an already-present agenda link is a no-write verification.
- [ ] T004 Prepare the synthetic persona and entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not cover it; record resolved runtime identity and configuration preconditions privately as `specs/127-faces-operations-agenda/quickstart.md` directs.
- [ ] T005 Confirm on the candidate that the marked-alias gap in `specs/127-faces-operations-agenda/research.md` (alias allow overriding a canonical deny in `src/server/services/permissions.service.ts` and `src/hooks.server.ts`) still reproduces, and record it in `specs/127-faces-operations-agenda/validation.md`. Stop for an owner-reviewed amendment on any unrelated security gap.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: The owner receives a current-state report identifying the intended personal accounts, organization, Space and existing agenda target before any write.
**Independent acceptance**: Resolve the approved account identifiers and read current navigation and policy with no mutation; show whether the agenda link is already configured and accessible.

- [ ] T006 [US1] Capture a failing regression, or a supported-behavior baseline, for Story 1 in `src/routes/api/nav/server.test.ts`, following the fixture and denial oracle in `specs/127-faces-operations-agenda/quickstart.md`.
- [ ] T007 [US1] Prepare the read-only intake draft in `.local/faces-followups-2026-11-16/speckit-F6/execution-manifest.json`.

  Action: resolve the org, Space, operations personal account and the `/pos/appointments` target; compare the current `pdv` config with the sanitized read summary. Prepare the proposed before and after diff and policy snapshot, keeping every policy and role grant.

  Evidence: store the observation time and draft policy revision. Record the operations account separately, and Coli as not provisioned (owner-confirmed).

  Stop: this draft is not an approved apply manifest. T017 must obtain a new fresh revision and diff after the qualified release. Do not invite, create an account or change grants.
- [ ] T018 [US1] Add the sticky marker and keep it through copy and paste.

  Action: add `canonicalAccess?: true`, normalization, validation and `retainCanonicalAccess` in `src/lib/nav/custom-sections.ts`, and literal-true admission in `src/lib/nav/nav-config-schema.ts`. Carry the marker in the clipboard type in `src/lib/nav/nav-edit.svelte.ts`, the copy handler in `src/lib/components/layout/NavContextMenu.svelte`, and `addLink` construction in `src/lib/nav/custom-sections.ts`, as in `specs/127-faces-operations-agenda/contracts/canonical-access.md`.

  Tests: `src/lib/nav/custom-sections.test.ts` and `src/lib/components/layout/NavContextMenu.mounted.test.ts`.
- [ ] T020 [US1] Extract the authority-only policy reads.

  Action: in `src/server/services/section-access.service.ts`, add `PolicyAuthorityRows` and `loadPolicyAuthorityRows`, narrow `requireFreshPolicyActor`'s input, and export `assertNavPolicyRevisionInTx` and `assertNavigationAccessRecoverableInTx`, as in `specs/127-faces-operations-agenda/contracts/policy-read-seam.md`. Existing callers of `loadPolicyRows` keep their behavior.

  Tests: `src/server/services/section-access.service.test.ts`.
- [ ] T008 [US1] Implement the conditional and scoped navigation protocol in `src/routes/api/nav/config/+server.ts` and `src/server/services/nav-config.service.ts`.

  Action: add the `fresh=1` read and ETag, the policy selector and revision header, optional `If-Match`, the 412 refusals before any side effect, and the preserve-single-link delta, changed-key collision check and skipped pruning, as in `specs/127-faces-operations-agenda/contracts/behavior.md` and `contracts/canonical-access.md`. Call the T020 helpers through the existing dynamic import. Keep `version: 1`; admit only one marked `kind: 'link'` page with an ID matching `^[a-z0-9]{6}$`, at most 20 sections, 30 pages and 40-character labels; keep every existing page and unrelated field. An already-present link means zero writes.

  Evidence: `src/server/services/nav-config.service.test.ts` and `src/routes/api/nav/server.test.ts` cover the headers, status codes, refusals with zero side effects and legacy no-header compatibility; record results in `specs/127-faces-operations-agenda/validation.md`.

  Stop: unmarked aliases keep their semantics. This task does not authorize the real configuration change in T017.
- [ ] T019 [US1] Enforce the canonical ceiling for marked aliases.

  Action: add `canonicalTargetViewAllowed` to `src/server/services/permissions.service.ts`, use it in the native static-path guard and in `loadPermissionsForUser` for marked pages, and require it for marked hits and deeper routes in `src/hooks.server.ts`, as in `specs/127-faces-operations-agenda/contracts/canonical-access.md`. `src/routes/api/nav/resolve/+server.ts` needs no change.

  Tests: `src/server/services/permissions.service.test.ts`, `src/hooks.tenant.test.ts`, `src/lib/nav/custom-sections-nav.test.ts`, and the marked-alias 404 case in the `GET /api/nav/resolve` suite of `src/routes/api/nav/server.test.ts`.
- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus the focused command in `specs/127-faces-operations-agenda/quickstart.md`; record before and after evidence in `specs/127-faces-operations-agenda/validation.md`.

## Phase 4 — User Story 2 (P1)

**Goal**: Each intended staff member opens the existing agenda from the same operations Space alongside sell, clients and marketing.
**Independent acceptance**: For each named personal account's local counterpart, reload, open the alias and confirm the canonical agenda uses existing records; compare unrelated users.

- [ ] T010 [US2] Add the Story 2 persistence, recovery and forbidden-path regression in `src/lib/nav/personal-navigation.test.ts`; prove the counterexample before claiming a fix.
- [ ] T011 [US2] On the owned synthetic local QA target only, rehearse the one-link PUT through `src/routes/api/nav/config/+server.ts` with the fixture org's fresh revisions and preserve-single-link mode. Prove the stale 412 has zero effects, persistence is confirmed by a fresh read before any retry, authority is unchanged, and synthetic personas get the expected reload, alias and canonical loader results. No real organization write is authorized; record QA evidence in `specs/127-faces-operations-agenda/validation.md`.
- [ ] T012 [US2] Create `src/server/services/nav-config-conditional.sql.integration.test.ts` with the behaviors in the [native lane](quickstart.md#native-postgresql-lane), admit it once under `qa-native` in `scripts/qc/native-postgres-manifest.ts`, and extend `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts`. Run the full-lane command and report validator from the quickstart. Requires the F7-qualified shared `exactAssertions` harness, a test-only prerequisite. Record the result in `specs/127-faces-operations-agenda/validation.md`.

## Phase 5 — Polish and qualification

- [ ] T013 Add or update translated labels in `messages/en.json` and `messages/es.json` only where needed, run `bun run i18n:compile`, and use semantic tokens and shared primitives for every UI file in `specs/127-faces-operations-agenda/implementation-inventory.md`; if no label changes, record why.
- [ ] T014 Run the full Hub check, test and build plus the UI design and token gates from `package.json`; save exit codes for the candidate in `specs/127-faces-operations-agenda/validation.md`.
- [ ] T015 Run the browser acceptance matrix through Browser Harness with real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/127-faces-operations-agenda/evidence/` and summarize them in `specs/127-faces-operations-agenda/validation.md`.
- [ ] T016 After T012, T014 and T015 pass, obtain owner merge approval for the code diff, complete its separately authorized release, and verify the deployed source and its fresh-read and conditional-write behavior in `specs/127-faces-operations-agenda/validation.md`. Do not change real organization navigation here.

## Phase 6 — Real organization configuration, after the qualified release

- [ ] T017 Apply and verify the real-org configuration through `src/routes/api/nav/config/+server.ts`, only after T016.

  Action: re-resolve the org, section, target and operator; take a new uncached read and backup and inspect policy. Regenerate the one-link diff, both revisions and the inverse from current state in `.local/faces-followups-2026-11-16/speckit-F6/execution-manifest.json`, with `canonicalAccess: true`. Confirm no organization provisioning run targets the FACES org.

  Approval and stop: obtain owner approval of that fresh diff, target and policy state, then apply at most once under the recovery rules in `contracts/behavior.md`. If the link is already present, make zero writes. Earlier drafts and QA approvals do not count. Coli stays deferred; do not create, invite or grant.

  Evidence: verify the persisted state, the marked-alias canonical ceiling, and the operations account's alias and canonical loader after reload. Record unchanged authority and runtime evidence in `specs/127-faces-operations-agenda/validation.md`, and reconcile results and open gates with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`. Any open end needs a `TODO(handoff)` at its site plus a proposal entry before handoff.

## Dependencies and parallel opportunities

T001 to T005 block implementation. Story 1: T006 → T007 (read-only draft) → T018 → T020 → T008 → T019 → T009. Story 2: T010 → T011 (synthetic QA rehearsal only) → T012 (full native qualification). T013 → T014 → T015 follow both stories. T016 (owner code merge, release and deployed-behavior proof) follows every local, native and browser gate. T017 is the only real configuration change, after T016, a new current-state preview and backup, and owner approval of that diff. No T007 draft or QA fixture approval authorizes T017. Coli's provisioning is outside this chain; it cannot block the operations account's acceptance and cannot be claimed complete.

No task is marked [P]: the tasks share files, account configuration and fixture ownership. Independent source or fixture review can run alongside once ownership is set, without editing the same files or sharing a browser. Real writes, target approvals and runtime proof stay sequential.

## Implementation strategy and completeness

The MVP is Story 1, subject to every approval and permission gate; verify existing behavior before coding. Story 2 local qualification is not real-account delivery; that needs T017 after the release. T005, T009, T012 and T019 cover authority; T013 to T015 cover i18n, tokens, browser and persistence.

There are twenty unchecked tasks: setup 2, foundation 3, Story 1 seven (T006 to T009 and T018 to T020), Story 2 three, polish and release 4, real configuration 1. T018 to T020 were added after T017 and sit in Phase 3, so IDs are stable rather than in file order. Every task names the files it touches; every file in `implementation-inventory.md` belongs to a task. Neither these tasks nor their prerequisites prove implementation or review.

### Review artifact: checklists/requirements.md

# Specification Quality Checklist: FACES personal-account agenda in the operations Space

**Purpose**: Author validation of requirements, not implementation qualification.
**Created**: 2026-11-16
**Feature**: [spec.md](spec.md)

## Content Quality

- [x] No implementation algorithms, APIs or framework choices in functional requirements; locking, revision and transaction mechanics are in [behavior.md](contracts/behavior.md) and [canonical-access.md](contracts/canonical-access.md).
- [x] Focused on user value and business needs.
- [x] Requirements and user scenarios are written for non-technical stakeholders.
- [x] All mandatory sections completed; source evidence and workflow metadata are separate from requirements.

## Requirement Completeness

- [x] No unresolved design clarification markers remain; runtime identity and configuration checks have explicit stop or no-op rules.
- [x] Requirements are testable and unambiguous.
- [x] Success criteria are measurable.
- [x] User-visible success criteria are technology-independent; statement-count qualification is a technical constraint in the plan.
- [x] Acceptance scenarios are defined for both user stories.
- [x] Edge cases are identified.
- [x] Scope is bounded to the parent proposal item.
- [x] Dependencies and assumptions are identified.

## Feature Readiness

- [x] Every functional requirement is covered by a scenario, contract or quickstart oracle.
- [x] User scenarios cover primary flows and denied states.
- [x] Requirements define measurable outcomes; running-application proof is a separate pending execution gate.
- [x] Implementation choices are confined to the technical companion documents and evidence references.
- [ ] Owner approval before data or configuration implementation: pending.
- [x] Independent review records are under egm/; their outcomes are separate from owner approval.

## Notes

Requirements were checked against pinned source and the parent proposal; source support, reported behavior and unproven runtime observations are kept apart. The unchecked owner-approval gate blocks implementation claims, not the preparation of review material. This author checklist is not an independent review verdict or evidence of execution. The checks cover the [canonical access](contracts/canonical-access.md) and [policy read](contracts/policy-read-seam.md) contracts; the F7 native test prerequisites are qualified separately.

### Review artifact: implementation-inventory.md

# Implementation inventory — 127-faces-operations-agenda

These are future Hub-relative actions; nothing here was changed while writing. Create paths do not exist at the pinned baseline; if one exists on the implementation candidate, extend it rather than add a duplicate. No file is deleted and no package dependency is added. The Task column links each row to [tasks.md](tasks.md).

| Action | File | Task | Responsibility or no-change condition |
| --- | --- | --- | --- |
| Create | src/server/services/nav-config.service.test.ts | T008 | Revision, fresh read, conditional save and marker compatibility unit tests. |
| Create | src/server/services/nav-config-conditional.sql.integration.test.ts | T012 | The native behaviors in the [quickstart native lane](quickstart.md#native-postgresql-lane). |
| Modify | src/server/services/nav-config.service.ts | T008 | Fresh read with optional policy selector, conditional delta, sticky marker and no-prune scoped mode; calls section-access helpers through the existing dynamic import. |
| Modify | src/routes/api/nav/config/+server.ts | T008 | Fresh selectors, strong config and policy headers, status handling. |
| Modify | src/lib/nav/custom-sections.ts | T018 | Optional `canonicalAccess: true`, normalization, validation, `retainCanonicalAccess` and `addLink` marker copy. |
| Modify | src/lib/nav/nav-config-schema.ts | T018 | Literal-true-or-omitted marker admission. |
| Modify | src/lib/nav/nav-edit.svelte.ts | T018 | Clipboard type carries the optional marker; no user toggle. |
| Modify | src/lib/components/layout/NavContextMenu.svelte | T018 | Copy handler carries the marker; paste forwards it to `addLink` for section and module destinations. |
| Modify | src/lib/components/layout/NavContextMenu.mounted.test.ts | T018 | Real copy, paste, save and reload of marked and unmarked links with new IDs. |
| Modify | src/lib/nav/custom-sections.test.ts | T018 | Marker parsing, sticky move and retention, copy into `addLink`, no clear path. |
| Modify | src/server/services/section-access.service.ts | T020 | Private authority-only loader, narrowed actor input, exported `assertNavPolicyRevisionInTx` and `assertNavigationAccessRecoverableInTx`; policy reads never include `app_nav_config`. Other callers of `loadPolicyRows` unchanged. |
| Modify | src/server/services/section-access.service.test.ts | T020 | Extraction, actor subset, recoverability with a supplied nav, unchanged full-loader callers. |
| Modify | src/server/services/permissions.service.ts | T019 | `canonicalTargetViewAllowed`, reused by the native guard, and the marked-alias conjunction. |
| Modify | src/hooks.server.ts | T019 | Marked-hit and deeper-route canonical check, keeping module and data admission. |
| Modify | src/server/services/permissions.service.test.ts | T019 | Canonical versus marked and unmarked, role and module cases. |
| Modify | src/hooks.tenant.test.ts | T019 | Page, data and action equivalence and denial for marked and deeper routes. |
| Modify | src/lib/nav/custom-sections-nav.test.ts | T019 | Marked visibility under the canonical ceiling. |
| Modify | src/routes/api/nav/server.test.ts | T006, T008, T019 | Fresh selector and header errors, normal-save compatibility, and a 404 from `GET /api/nav/resolve` for a marked alias whose canonical target is denied. |
| Modify | src/lib/nav/personal-navigation.test.ts | T010 | Personal hide and order persistence independent of org placement. |
| Modify | scripts/qc/native-postgres-manifest.ts | T012 | One `qa-native` admission with `minimumAssertions: 11`, `exactAssertions: true` and the behavior names; uses the F7-owned shared harness. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | T012 | Admission and behavior identity. |
| Modify | scripts/qc/native-postgres-report.test.ts | T012 | Missing, duplicate, skipped and extra twelfth behavior rejection. |
| Modify only for missing text | messages/en.json, messages/es.json | T013 | Reuse existing keys if every scoped label and refusal is translated; otherwise add matching English and Spanish keys. No technical detail in the user workflow. |
| Generated | src/lib/paraglide/ | T013 | Output of `bun run i18n:compile`; never hand-edited; no diff when catalogs are unchanged. |
| Modify only if fixture absent | scripts/qa/seed/matrix.ts | T004 | Owned synthetic persona fixtures only; no shared QA reset or live rows. |
| Create | specs/127-faces-operations-agenda/validation.md | T001 and later | Candidate commands and results, ownership, native and browser receipts, open approval gates. Meta-repo path. |
| Create | specs/127-faces-operations-agenda/evidence/ | T015 | Synthetic receipts; no live personal data or credentials. Meta-repo path. |
| No change | src/routes/api/nav/resolve/+server.ts | T019 (test only) | Reads `page:<id>:view` from `loadPermissionsForUser`, so the marked-alias conjunction applies without code change. |
| No change | src/lib/nav/alias-reroute.ts | — | Client reroute through `/api/nav/resolve`; inherits the server decision. |
| No change | src/routes/api/nav/access/+server.ts | — | Existing read-only policy inspection is reused. |
| No change | src/lib/nav/personal-navigation.ts, src/lib/nav/nav-config.svelte.ts | — | Existing personal-navigation and client config ownership. `duplicatePage(pageId)` already spreads the whole page and keeps the marker; T018 verifies it. |
| No change | src/server/services/organization-role-policy.ts, src/server/services/nav-policy-lock.ts | — | `rolePolicyRevision` and `lockNavigationPolicy` are reused as they are. |
| No change | src/server/services/workspaces.service.ts | — | Workspace provisioning is out of scope. |

There is no schema or migration, new page or API route, dependency or token change, and no role, member or policy grant. Policy and actor reads run only on the trusted outer transaction and document reads and writes run under the nested `app_ledger` scope, as in [policy-read-seam.md](contracts/policy-read-seam.md). The F7 stock bridge is never called while F6 holds the navigation policy lock. The production alias is applied only in T017; Coli stays unprovisioned.

Test-only F7 dependencies:

- `src/server/test-utils/operator-native-auth-fixture.ts` and `fixtures/operator-native-auth.sql` (owned by F7, [native-auth-prerequisites.md](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md)) install and check the child `auth` prerequisite before the public foreign-key and policy setup. Reuse the qualified helper, not a copied permissive policy. They add no `app_ledger` rights and no runtime dependency.
- The optional `exactAssertions` type and report check ([native-exact-count.md](../128-faces-receivables-audit/contracts/native-exact-count.md)) must be qualified before this row is registered. F6 owns only its admission and tests.

Every new test uses an existing unit, route, mounted or `qa-native` harness; there is no new runner and no implicit skip. The [focused command](quickstart.md#focused-checks) runs every test file above except the native SQL file, which runs only in the full native lane. Focused tests do not replace the full native lane and report, the full candidate checks, the UI, i18n, token and browser gates, or owner approval.
