---
id: 112-role-simulation-sections
title: Organization role simulation and contextual section access
stage: spec
status: approved
verdict: approved
pass: 4
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub]
tags: [security, auth, ui]
---

# Feature Specification: Organization role simulation and contextual section access

> Latest approved UI direction: [revision 6](ui-revision-6-viewport-footer.md) uses a subtle pulsing 1px viewport perimeter, a padded circular key badge on the avatar, a role-first selector and a separate Finish row enclosed by dividers. It supersedes the intermediate V5 avatar ring. Role replacement remains atomic and retains the original simulation lifetime.

**Feature Branch**: `feat/112-role-simulation-section-access`, isolated Hub checkout `/home/nikolas/.cache/codex-work/hub-role-simulation-20261108`.
**Created**: 2026-11-08. **Status**: Owner-approved for implementation; EGM feature and technical admission converged before code. The original implementation passed local and CI qualification on 91baf240. Latest signed source 71d3743d is locally qualified within the [recorded boundaries](evidence/implementation/ui-v6/README.md); exact-source release CI passed all 18 checks, with Vercel preview success. The owner approved the latest UI and requested production delivery. No deployment claim.
**Input**: Owners/admins can simulate an active organization's roles from the avatar menu, reload under those rules, and move to a permitted page if needed. Authorized users can manage section RBAC from main pages. Evaluate context-menu placement through FigCraft and UX agents.
**Owner clarification**: “Allow real changes, gated by the simulated role.” This settles live actions; the later implementation authorization below approves proceeding with this scope.

**Owner implementation authorization**: “begin implementation with EGM like planned. SpecKit if needed” (2026-11-08), following review of the revision-4 FigCraft design. This authorized scoped implementation and the remaining review/planning work. On2026-11-09 the owner also approved the latest UI and requested push plus production verification; that direct release authorization is recorded separately in the [current checkpoint](evidence/implementation/ui-v6/qualification.json).

## 0. Product

An organization administrator needs to verify the experience produced by a role without changing anyone's membership. The administrator also needs to change a section's access while looking at that section, rather than finding its corresponding row in Settings.

Simulation keeps the signed-in person and organization fixed and substitutes the selected role for permission decisions. It is a live mode: permitted actions have real effects. Section access is organization policy; personal sidebar layout remains a separate preference.

## AS-IS — verified source and design evidence

Source baseline: Hub remote `master` at `5f647e7c9db91f9a3ab0ad18c2dbf9d565dff38e`, cloned read-only to `/tmp/minion-role-section-controls-20261108/hub-baseline`. All `src/` anchors below refer to that commit. The shared workspace checkout is older (`1f1ab6a3`); it is not the source baseline for this proposal. Git source inspection does not prove deployed behavior.

| Evidence | Current behavior |
| --- | --- |
| `src/lib/components/layout/ProfileMenu.svelte:34` | Shared desktop/mobile avatar menu has account, Settings, language, build-channel and DEV identity controls. It has no organization-role simulation control. `users/AvatarMenu` edits the picture and is not this surface. |
| `src/server/services/rbac.service.ts:516`, `:633` | Role catalog supports system roles and organization-local custom roles. Effective capabilities combine a member's assigned roles. |
| `src/server/services/permissions.service.ts:121`, `:146` | Platform admin gets a full-access shortcut. Other users get module/subresource permissions and explicit page → section → target-route decisions. |
| `src/server/services/rbac.service.ts:412`, `:442`, `:1073`; `src/hooks.server.ts:321` | Sensitive-field, own-record, capability and native-page checks each have additional admin-sensitive behavior. Substituting client permission strings alone cannot simulate a role. |
| `src/lib/components/layout/NavContextMenu.svelte:168`, `:188`, `:190`, `:206` | Page and section menus exist for home/copy/move/rename/hide actions. “Access…” is explicitly deferred in handoff comments. Structural editing currently returns early without navigation-management permission. |
| `src/lib/nav/nav-edit.svelte.ts:19` | `canEditNav()` uses `settings:manage`; `canEditAccess()` independently uses `users:manage`. Permission administration must not accidentally require both. |
| `src/routes/api/roles/overrides/+server.ts:26`, `:48`; `src/server/services/rbac.service.ts:1063` | Existing write API manages registered modules/subresources. It does not accept custom section/page keys. Missing access UI also needs a validated server contract. |
| `src/lib/components/navigation/PersonalSidebar.svelte:12`; `PersonalHome.svelte:92`, `:124` in the same directory | Personal navigation and all-sections cards are integrated in this baseline; they do not expose the section context-menu actions. |
| `src/lib/nav/custom-sections.ts:243`; `src/hooks.server.ts:303` | Navigation filtering and alias routing already enforce page rules, module floors and hidden/empty-section behavior. Those semantics must survive both features. |

Independent source audits: [navigation UX](ux-navigation.md), [simulation UX](ux-simulation.md). These are expert evaluations, not observed usability-study results.

EGM [initial Zoom Out report](egm/zoom_out_report.md) reviewed revision 1: no Blocker/Major at feature-design altitude; its one test-fixture Nit was corrected. This is Stage 5 only. Revisions 2–4 incorporate subsequent owner UI feedback. The [revision-4 implementation admission record](egm/implementation-admission.json) records the new feature and technical review convergence. The earlier result alone did not approve implementation readiness.

## Historical FigCraft demo — revision 4

[Preserved editable FigCraft proposal — revision 4](role-simulation-sections-v4.figcraft). Open **V4 · avatar → role → simulate → avatar → finish** in Present. Prior files are retained for comparison. The single-screen role tray remains; separate simulation controls are superseded by the highlighted Finish simulation item in the avatar menu.

This historical V4 proposal copies CRM, Roles and shared menu/header primitives from the existing Hub master. It retains AS-IS frames and the section-access flow. One avatar item opens a single-screen role tray: search/select, Cancel and Apply role. The bottom warning is only “Actions affect real data.” There is no progress indicator, separate review page or warning panel. While simulating, a thin frame surrounds the full viewport. The same avatar item becomes a highlighted **Finish simulation** action. No floating/sidebar exit control, direct empty-state stop button or separate simulation badge is added. Desktop/mobile examples include a role with no available pages. Prototype actions navigate between design frames and never write permissions. See [revision details](ui-revision-4.md) and [design validation](design-validation.json).

Design source: the existing Hub FigCraft master, SHA-256 `e85afcfb104cbcecb17be900f9d2dd4783197bcc4874e1dafebe6d48c44deaed`. The local `.local/figcraft/minion-hub.figcraft` and PR 971 worktree's `design/figcraft/minion-hub.master.figcraft` had identical hashes at inspection. The proposal does not edit either master. Native source copies use the master's dark theme; illustrative role rules and records are marked as such. The existing Roles frame has text-overlap artifacts in its export; it remains evidence of the captured design, not proof of runtime typography.

## User Scenarios & Testing

### User Story 1 — Simulate one organization role (Priority: P1)

As an owner/admin of the active organization, I choose one of its roles from my avatar menu and use the app under that role's permissions without changing membership.

**Independent test**: a fixture owner chooses a custom role whose view/edit/record/field rules differ from the owner's. After full reload, both the rendered app and direct requests honor that one role.

**Acceptance scenarios**:

1. Given actual owner/admin authority in organization A, opening the avatar menu shows one `Simulate a role…` item. It opens a modal/tray scoped to A; the role catalog is not expanded inside the avatar menu.
2. A single screen searches/selects A's system/custom roles and offers Cancel and Apply role. A short footer warning reads **Actions affect real data.** There are no steps, separate review screen or full warning message. Only explicit Apply role enters simulation and reloads. Cancel, Escape and Close preserve the current mode and perform no mutation. Actual role assignments are not unioned into simulated decisions.
3. Active simulation uses a subtle, thin viewport perimeter with a gentle pulse (static for reduced motion), without resizing or offsetting the app. The active avatar menu groups a current-role selector and a separate amber **Finish simulation** row between dividers. The selector opens the single-screen role tray with the current role selected. Cancel preserves mode; unchanged Apply is disabled; a different allowed role replaces the current role atomically and reloads. Finish exits directly and reloads with actual authority. The avatar remains reachable without Settings or a permitted module, on desktop/mobile. Accessible labels and one app-level polite announcement identify simulation.
4. A role may create/edit/delete only when the selected role allows it and the actual actor is entitled to perform that operation; audit attribution remains the actual person with simulation metadata.
5. A non-owner/admin cannot start simulation by forging a role, URL, request, cookie or preference. An admin cannot gain owner authority through simulation. A custom role granting authority outside the actor's real authority is unavailable for selection, with an explanation.

### User Story 2 — Stay on a working page (Priority: P1)

**Independent test**: select a role denying the current page and its configured home; verify one full navigation to a permitted destination, and an exit-capable empty state if none exists.

**Acceptance scenarios**:

1. Keep the current URL if the selected role can still access it, including its alias target and organization module availability.
2. Otherwise select the first eligible visible page in the current section's displayed order, then the permitted configured personal home, then the first eligible visible page in the full navigation order. Deduplicate destinations and validate each with the same server authorization path used for a direct request.
3. Never choose an unavailable module, denied alias target, hidden destination, deleted page, route requiring unresolved record parameters, or redirect cycle. Preserve locale; carry query parameters only when staying on the same authorized route. Never accept an external return URL.
4. If no eligible page exists, show an authenticated shell state explaining that the role has no available pages. Its account avatar remains reachable and exposes the highlighted Finish simulation action; no direct stop button is added to the empty page. Do not loop through `/home`, `/account/home` or Settings.
5. Finish simulation from the avatar menu reloads with actual authority and restores the pre-simulation URL only if it is still permitted; otherwise use the same bounded fallback. To select a different role, finish the current simulation and start again through the normal avatar item.

### User Story 3 — Edit access where the section is used (Priority: P1)

**Independent test**: a custom-role member with `users:manage` but without `settings:manage` opens section access from its main page and changes a rule. Separately, an actual organization owner/admin simulates the affected role to verify the result; access-management permission alone does not grant simulation eligibility.

**Acceptance scenarios**:

1. The current section main-page header exposes Manage section access. Section heading More/context menu and all-sections/personal-home card More open the same editor with organization and target already selected.
2. A user without effective access-management authority sees personal actions where available, with no organization access action; a direct write also fails.
3. Access management is independently gated from rename/move/org-wide-hide navigation editing. Editing policy is not coupled to permission to edit navigation structure.
4. Built-in modules edit their canonical action rules; custom section headings edit section visibility. A page-specific action is labelled Page access. A group spanning multiple modules cannot silently change every module's data permissions.
5. The editor lists the active organization's custom/system roles, effective access, explicit overrides and inheritance. Restore inherited and Deny produce different results. Existing subresource exceptions, action dependencies, own-record scope and sensitive-field rules are preserved unless explicitly reviewed for change.
6. Review names the affected organization, role and target, plus changed values. Apply is explicit because permissions affect other members. Cancel performs no write. Protected owner rules remain immutable.
7. On successful apply, permissions/navigation refresh together. If the actor loses the current page, the bounded permitted-page fallback runs. Failed save retains the draft; stale/conflicting policy requires review instead of overwriting another editor's change.

### User Story 4 — Use context actions across navigation modes (Priority: P2)

**Independent test**: complete the same access task in full, module, collapsed and personal navigation with mouse, keyboard and touch, without visiting Settings.

**Acceptance scenarios**:

1. Visible More controls and main-page actions complement right-click, ContextMenu key, Shift+F10 and long press. No administrative action relies only on discovering a gesture.
2. Section actions are on section headers/cards; page actions are on page rows; calendar/table/canvas menus retain their object-level actions.
3. Links and action buttons are native siblings. Menu activation neither follows the link nor starts dragging. Escape closes and focus returns to a meaningful control, including when an edited section disappears.
4. Personal show/hide/order/home preferences are labelled as personal, separately from organization structure and organization access. No new preference grants data/API permissions.

### Edge cases

- Organization switch, logout or session expiry clears active simulation; it never carries a role into another organization. Re-enter explicitly in the new organization.
- Revalidate actual eligibility, role existence and organization membership on each request. A stale, expired, malformed or cross-organization context cannot retain simulated or elevated authority. Exit remains possible; failures must not silently resume privileged mutations.
- Deleted/renamed custom roles, policy edits during simulation, multi-role actual actors and custom roles sharing labels across organizations.
- Pending writes or dirty forms during role/org changes: resolve the existing unsaved/pending action contract before reload; do not label a potentially committed request as cancelled.
- Other tabs in the same browser session: never allow a tab displaying old privileges to write using stale role state. Reload/announce changed mode before the next interaction; server checks remain authoritative.
- Page explicit allow/deny, inherited section rules, module floors, moved-main pages and aliases; a section visibility grant never grants source dataset/API access.
- Permitted empty sections vs sections whose every child is denied; manager edit affordances must not restore hidden administrator content under simulation.
- Personal data and own-record rules still refer to the actual person. Role simulation does not reproduce a different person's assigned records, private preferences or membership history.
- Real-time events, cached results, open drawers and delegated assistant/gateway actions must not retain broader pre-simulation authority or disclose stale data. Unsupported action channels must be unavailable while simulating, with an explanation, until their effective-authority path is verified.

## TO-BE — requirements and invariants

### Functional requirements

- **FR-001**: Only actual active-organization owners/admins can start simulation; target roles are resolved from that organization's catalog and may not elevate the actor.
- **FR-002**: Simulation replaces the evaluated role set with exactly the selected role; it never changes identities, memberships, assignments, or another member's session.
- **FR-003**: Every role-sensitive surface uses the same effective authority, including page rules, mutations, exports, own-record filtering, sensitive fields and first-party delegated requests. Existing organization/module/entitlement limits continue to apply.
- **FR-004**: When simulation is off, one avatar menu item opens the single-screen role tray. Selection alone does not change mode. The screen has Cancel, Apply role and a short footer warning, without a stepper or separate review. During a valid active mode, a role-first row opens that same tray, preselecting the current role; a separate Finish simulation row exits directly. Dividers separate this group from account actions. Apply of a new role performs one atomic transition under the actual actor ceiling, rotates generation, preserves original start/expiry/return target, and never exposes an intermediate actual-admin mode. Apply and Finish reload after server validation and retire previous privileged content.
- **FR-005**: Indicate active simulation with a subtle 1px frame around every viewport edge, without layout impact or pointer interception. Its base color is an opaque 45% warning/55% canvas blend. A slow 3.2-second opacity pulse from 0.65 to 1 is disabled for reduced motion; the frame remains above native overlays. Add an active-only 16px circular avatar badge with the same base color, 2px padding and a rendered 10px KeyRound glyph. Do not use an avatar ring, persistent banner or separate exit chip. The always-reachable account menu shows the current-role selector and a separate amber Finish simulation row, enclosed by dividers. The tray retains **Actions affect real data.** Accessible avatar text and one polite app-level announcement identify mode. Invalid/expired/revoked modes keep Finish available and disable role editing. Start/change/Finish use verified actual actor controls; ordinary actions retain simulated authority.
- **FR-006**: Apply the deterministic, bounded fallback in Story 2 whenever entering/exiting simulation or applying access changes removes current-page access.
- **FR-007**: Real permitted actions stay enabled and affect real data; all mutation authorization and audit entries retain both actual actor and selected role context. Existing money/stock/delete confirmations still apply.
- **FR-008**: Expose one shared access editor through main-page section actions, section heading More/context menu, personal navigation and all-sections cards. Enforce effective `users:manage` separately from navigation's `settings:manage`.
- **FR-009**: Validate target organization, role and stable section/page/module identifier on reads and writes. Never trust a client-supplied organization or label as authority.
- **FR-010**: Preserve canonical module/subresource rules and current page/section precedence. Custom section visibility and source data permissions remain distinct; the editor explains which it is changing.
- **FR-011**: Require reviewed Apply for shared role changes, detect stale state, preserve drafts on failure, invalidate authorization caches, and refresh all affected navigation/permission state after commit.
- **FR-012**: Reset on organization/session changes and revalidate current role/actor authority. Apply mode changes consistently across same-session tabs and prevent stale-authority responses/writes.
- **FR-013**: Provide keyboard/touch equivalents, accessible names and announcements, focus restoration, responsive layout and wrapping of long organization/role/section names.
- **FR-014**: Use `packages/design-tokens/contract.json` (meta-repo), shared UI/menu/action primitives and localized strings. New API/page/route surfaces require full RBAC wiring and Hub `src/lib/routes/route-design-manifest.ts` where applicable.

### Key entities

- **Actual actor**: authenticated person/session and active organization; unchanged by simulation and authoritative for attribution and simulation eligibility.
- **Simulation context**: actual actor/session binding, organization, selected stable role key and validity/generation; server-controlled and independently validated.
- **Effective authority**: selected role's rules during simulation, otherwise normal assigned roles; includes page visibility, action permissions, record scope and field level.
- **Access target**: canonical module/subresource, stable custom section ID, or stable page identity; its kind determines exactly which rule can be edited.
- **Access draft**: organization/role/target, original policy version and proposed changes; only explicit Apply commits it.

## DELTA — transitions and proving evidence

| ID | Transition | Required proof |
| --- | --- | --- |
| D1 | No role simulation → server-validated per-org live mode | Eligibility/cross-org/no-elevation tests; membership rows unchanged |
| D2 | Actual-role/admin shortcuts → shared effective authority | Denied native/alias/API/export requests; role-restricted own-record and field-mask fixtures; warm-cache and multi-tab isolation |
| D3 | Potential forbidden reload → bounded permitted destination | Native/alias/locale/hidden/empty/all-denied route cases; real document and route-data loads |
| D4 | Gesture-only/incomplete section administration → discoverable shared editor | Main-page, sidebar/card, personal/full/module mode; keyboard/touch browser evidence |
| D5 | Module-only override writes → validated section/page contract | Foreign org/unknown/deleted target rejection; inheritance vs denial; immutable owner; stale-write conflict |
| D6 | Role edits refresh separate views → consistent policy after Apply | Commit/cache invalidation; failed-save draft; current-page revocation fallback |
| D7 | Potential invisible live effects → persistent mode/actor trace | Subtle viewport perimeter, role-first menu with a separate amber Finish row and dividers, one-screen role selection and short footer warning; actual-actor plus role audit evidence |

## Success Criteria

- **SC-001**: An owner/admin can enter a custom role from the avatar menu without opening Settings, and finish from that menu in every simulation state, including zero available pages; no separate simulation-exit control is required or shown.
- **SC-002**: Every selected role in the acceptance matrix produces the same access decisions for visible navigation and direct page/action requests; no actual owner/admin bypass survives in ordinary simulation actions.
- **SC-003**: A denied current page reaches one permitted destination without a visible forbidden-page flash or redirect loop; zero destinations produces the explicit escape-capable state.
- **SC-004**: Authorized users can review/apply section access from its main page and each supported navigation mode, without a Settings detour; unauthorized users cannot apply through a forged request.
- **SC-005**: A committed permitted action during simulation records the actual actor and simulated role, and leaves membership assignments unchanged.
- **SC-006**: Personal layout settings, existing org/page/module restrictions and protected owner policies pass regression coverage across the new entry points.

## Assumptions and open design work

The actual actor's preferences and record identity remain in use; this is role simulation rather than another-user impersonation. Mode is temporary and organization-bound; switching organizations clears it. The user explicitly chose live actions on 2026-11-08.

The earlier UX suggestion to disable all permission editing during simulation was not adopted after the live-actions clarification. Such editing follows the selected role's effective `users:manage`, the actual actor's authority ceiling and normal protected-owner rules. No hidden actual-admin override grants access to the editor.

Owner approval is recorded above. Finish EGM review and resolve findings while producing the implementation plan. The technical design must enumerate admin bypass/cache/delegation consumers, select session storage/revocation, and specify atomic/conflict-safe access persistence. Implementation readiness requires that technical review; another owner permission question is not required to begin the already-authorized work.

## Alternatives and operating envelope

| Choice | Decision and reason |
| --- | --- |
| Read-only preview vs live actions | Live actions are owner-required. Read-only would not reproduce permitted workflows. Existing action confirmations remain. |
| Add selected role to real roles vs replace roles | Replace with one non-elevating role. Combining roles would leave owner/admin access visible and invalidate the preview. |
| Settings-only vs contextual editor | Reuse the policy engine through contextual entry points. Settings-only interrupts the main-page task; independent per-surface editors would drift. |
| Indicator and simulation controls | V6 uses a quiet viewport perimeter plus a circular avatar key badge. The avatar menu owns both the role selector and separate Finish row; no exit control is added elsewhere. |

There is no measured fleet maximum for roles or navigation targets. Qualify at 200 roles and 500 visible navigation targets; these are test envelopes, not claims about current customer scale. Search must find all roles without silent truncation. Long catalogs scroll within the tray. Navigation fallback visits each registered candidate at most once. Catalog/read failure disables Apply with retry; it must not substitute an incomplete role list. Concurrent policy editors use a revision conflict response and retain their draft rather than overwrite a newer change. Larger-catalog performance is unqualified until measured.

## Out of scope

Changing another member's identity or assignments; combining arbitrary role sets; cross-organization impersonation; replacing the role manager; broad redesign of Settings, record/table/calendar menus, or the navigation schema. New data permission semantics are not implied by adding section controls. Existing Settings redesign proposals and source/master files remain independent.

## Verification

Spec quality checklist, source evidence, native FigCraft render/prototype checks and EGM review records accompany the feature. The owner has authorized implementation. Work follows SpecKit plan → tasks → implement with independent review and qualification; lifecycle evidence records actual progress.

Current artifact evidence: [scoped document checks](artifact-validation.json), [current native design checks](design-validation.json), [whole-workspace index results](evidence/workspace-checks.json). The proposal index passed at the original registration checkpoint. The original workspace spec-index attempt encountered unrelated corpus/frontmatter errors; its [historical output](evidence/spec-index-workspace-check.txt) is preserved. It does not establish the latest checkout state. Existing index entries and unrelated work were retained. Current native links, full-viewport geometry, avatar-only exit behavior, previous-proposal preservation and master preservation are checked in the design-validation record. Current desktop and 390px mobile renders are under [revision-4 evidence](evidence/revision-4/). Earlier comparison-page interaction checks apply to revision 1; the current revision is qualified here as a native FigCraft artifact. These are artifact checks, not product authorization or deployment tests.

Original qualification checklist: focused authority and persistence tests; seeded local QA scenarios for two organizations, owner/admin/custom roles, `users:manage` without `settings:manage`, multiple roles, page exceptions, own-record filtering and masked fields; real-browser document/route-data/API/live-action checks. Run the repository's `bun run check`, `bun run test`, `bun run build`, `bun run lint:design`, `bun run lint:tokens`, i18n compilation, route contract checks and seed/migration pairing when applicable. Record local proof, CI, merge and deployment separately; human merge remains required.

## Latest release checkpoint

[UI V6 qualification](evidence/implementation/ui-v6/README.md) binds the latest source, local receipts and screenshot boundaries. The owner authorized production delivery. CI on 71d3743d, approved merge, deployment and authenticated post-merge verification remain distinct recorded steps; none is inferred from prior green CI, a push, a Vercel preview or a successful document shell.

The final [CI receipt](evidence/implementation/ui-v6/ci-release-final.json) confirms the qualified tree. [GitHub rejected normal merge](evidence/implementation/ui-v6/release-gate.json) under its one-review rule; the override-or-review choice remains pending. Production is not deployed.
