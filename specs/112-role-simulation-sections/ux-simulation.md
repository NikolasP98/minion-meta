# Role simulation UX evaluation

Date: 2026-11-08. Authoritative source baseline: remote Hub `master` at commit `5f647e7c9db91f9a3ab0ad18c2dbf9d565dff38e`, inspected in `/tmp/minion-role-section-controls-20261108/hub-baseline`. The shared `minion_hub` checkout is stale and its earlier findings have been replaced below. All source paths in this report are relative to that Hub baseline. No application changes, browser interaction, runtime qualification, branch switching, or production writes. FigCraft inspection belongs to the parent agent. Recommendations are design decisions for review, not shipped behavior.

## Current observable implementation

| Evidence | Finding | Implication |
| --- | --- | --- |
| `src/lib/components/layout/ProfileMenu.svelte:34-61` | Shared avatar dropdown offers account, settings, language, optional build channel, DEV user switch, logout. Header badge reads the platform role at lines 18, 92-96. | Add production role simulation here. Keep account identity intact and label the simulated org role separately. |
| `src/lib/components/layout/SidebarUtilities.svelte:84-90`; `src/lib/components/layout/Topbar.svelte:260` | Desktop sidebar footer/collapsed rail and mobile topbar render `ProfileMenu`. | One implementation covers desktop, collapsed navigation and mobile. `components/users/AvatarMenu.svelte` is not this account dropdown. |
| `src/lib/components/layout/DevUserSwitcher.svelte:2-7,70-88` | DEV-only switcher changes authenticated user/session, then calls `location.assign('/')`. | Separate feature. Role simulation must not reuse its identity-changing endpoint. Full document navigation has precedent. |
| `src/lib/components/layout/OrgPicker.svelte:14-28,46-76`; `src/routes/api/active-org/+server.ts:19-45` | Active org switching validates actual membership, writes an HTTP-only cookie, reloads layout data and reconnects gateway. | Simulation needs validated active-org scoping and refreshed live subscriptions, not only sidebar strings. |
| `src/server/services/rbac.service.ts:516-560` | Role catalog combines system roles and active-org custom roles with org rules. | Use actual org catalog, not a fixed role list or another org's custom roles. |
| `src/server/services/rbac.service.ts:227-292` | Capability union, subresource inheritance, owner scope, field-level visibility and `explicitView` are distinct. | Simulate one target role alone; never union actual owner/admin roles into the target role set. |
| `src/server/services/permissions.service.ts:120-131` | Platform admin grants all base, custom section and custom page permissions. | Role selection alone leaves full access unless the effective-context admin bypass is suppressed. |
| `src/server/services/permissions.service.ts:144-164` | Custom page rule precedence is explicit page row, explicit section row, native target registry decision. Section visibility defaults allowed unless explicitly denied. | Preserve tri-state semantics and page overrides. A section denial does not automatically beat a page's explicit allow under the current contract. |
| `src/server/services/rbac.service.ts:412-418,442-452,1073-1083,1263-1279` | Independent platform-admin bypasses cover field-level reads, owner scoping, boolean and throwing capability gates. | Simulation must apply to every effective request-level entry point. Filtered nav alone is insufficient. |
| `src/lib/routes/route-access-policies.ts:48-53,63-74`; `src/lib/access/policy.ts:37-50`; `src/server/auth/authorize.ts:35-38` | Route policy, super-view checks and `requireAdmin` read raw platform role. | Separate real identity/control authority from effective product-policy context. |
| `src/hooks.server.ts:285-331,343-364` | Custom instance page grant can replace same-policy native route decision, with a module floor where required. Native static page overrides are skipped for raw platform admins. | Effective simulation must cover both alias routes and built-in main pages, including `pageRule`; redirects cannot evaluate only the target's ordinary route permission. |
| `src/lib/nav/custom-sections.ts:203-240,243-268` | Instance permission and module floor are separate; hidden custom pages/sections are visible only when `canManage`; a permitted page can retain its section even without section permission. | Test inherited/explicit section and page grants separately. Derive hidden-section management from effective permissions, not actual admin authority. |
| `src/routes/(app)/+layout.server.ts:287-290` | Server nav filtering passes effective `settings:manage` into `visibleNavConfig`. | Keep this single gate coherent during simulation and section RBAC editing. |
| `src/lib/nav/modules.ts:685-706` | Module nav filters permitted hrefs and handles authorized empty sections. | Fallback selection must use the same catalog and instance/floor semantics, preserving genuinely empty authorized sections. |
| `src/hooks.server.ts:110-138,516-525`; `src/server/landing-cache.ts:8-22` | Root redirect uses cached user landing + locale; it additionally checks plan entitlement, but does not check selected-role RBAC. | Navigating blindly to `/` can land on a forbidden saved homepage. Preserve locale and validate effective RBAC, module availability and entitlement. |
| `src/lib/state/ui/nav-mode.svelte.ts:23-56,80-118`; `src/lib/nav/personal-navigation.ts:38-45` | Layout selection is scoped per actor/org; full navigation still uses effective role keys plus raw platform-admin role. | Simulated staff must not inherit the real platform-admin full-nav capability. Preserve personal layout separately and keep all visible pages permission filtered. |
| `src/server/auth/resolve-identity.ts:240-268`; `src/server/services/rbac.service.ts:326-336` | Identity verifies profile/membership per request; RBAC capability cache remains org/profile keyed with 2-minute TTL. | Preserve fresh identity checks; give selected-role effective caches distinct context/version keys so they cannot poison real authority. |
| `src/routes/api/me/preferences/[section]/+server.ts:130-147`; `src/lib/nav/personal-navigation.ts:1-29` | Generic preferences are profile-scoped; personal navigation adds explicit org-bound validation. | Do not store simulation as an unvalidated preference. Bind server authorization state to actor, session and active org, using personal-navigation scope as precedent only. |
| `src/lib/services/gateway/platform-admin-methods.ts:107-133`; `src/lib/access/can.svelte.ts:87-115` | Gateway admin UI checks raw platform role and a launch flag; client path gating layers plan, org kind, module availability, custom instance permission, module floor and normal route policy. | Role simulation must suppress raw-role gateway privileges and use all current path gates in its fallback algorithm. |

## Recommended interaction

1. Avatar menu contains **Simulate role…** for a real owner/admin authorized in the active org. The label includes the active org name in the picker. A platform admin without current org membership should not silently gain cross-org simulation through this feature.
2. The picker lists the active org's system and custom roles with names and useful descriptions; marks the selected role; offers **Use my actual permissions**. Selecting the current role is a no-op. Display **Only roles from [org]** for clarity when the actor belongs to several orgs.
3. Selection commits server-validated state and triggers a full document load. Keep the current URL if the selected role can access it. If denied, select the next accessible destination using the deterministic rule below. Announce the redirect after reload: **[Page] isn't available to [role]. Showing [destination].**
4. While active, render a persistent app-shell strip: **Simulating [role] · [org]**, with **Change role** and **Exit simulation**. It must remain reachable in collapsed nav, mobile, error/no-page states and when the simulated role cannot access Settings or Users. The avatar shows the same active simulation state. Color alone is insufficient.
5. Exit is authorized using the real authenticated actor and clears only this simulation state, then fully reloads under actual authority. It should not rely on the selected role possessing an RBAC-management capability. Normal product content and actions must not receive this escape authority.
6. Retain real account name/avatar; never substitute a fictional user's avatar or label this **Switch user**. Explain once: **Preview this role's permissions using your account. Assigned records and personal preferences may differ for other people.**

## Permission fidelity and action semantics

There are two defensible product modes. Choose and name one in the approved spec:

- **Recommended initial mode: read-only simulation.** Evaluate selected-role route/nav/read permissions, owner restrictions and sensitive field masking; prevent all business mutations, background jobs and privileged agent actions while the simulation is active. Show that an action would be available when useful, but explain that leaving simulation is required to run it. The user said “see what they would see”; read-only evaluation avoids accidental live posting. This is a proposal, not an inferred user requirement.
- **Full role operation.** If the intent includes taking actions as the role, each action must satisfy both real-actor authority and the selected role's capabilities, preserve real actor audit identity, and explicitly retain live-action warnings for consequential actions. Never let simulation elevate an org admin to owner-only operations merely by choosing Owner.

Do not promise that a role-only view reproduces another person's entire account. `if_owner` uses the acting profile identity (`rbac.service.ts:442-462`); role selection cannot identify whose records to show. Per-user sidebar preferences, personal agent and workspaces also remain distinct. The initial feature should retain the real user's record identity while applying selected-role restrictions, state this limitation, and test it. Exact named-user impersonation would be a different, separately approved scope.

For full simulation fidelity, selecting a target role with more capability than the real actor requires an explicit policy. Recommended rule is a non-escalating effective authority intersection, with a clear indication when it limits the preview. Alternatively restrict target-role choices to non-elevating roles and explain disabled choices. Do not claim unqualified “what every role sees” if either rule limits it. A true arbitrary-role read preview is possible only as an explicitly approved privileged read capability.

## Deterministic reroute contract

Evaluate destinations on the server under the effective role, active org kind, module availability and route policy. Suggested order:

1. Keep current canonical route if permitted.
2. First permitted page in the current section/module's canonical displayed order.
3. First permitted page in the active org's section catalog order, ignoring unauthorized or disabled modules and any forbidden user landing preference.
4. An authenticated **No pages available for this role** shell with Change role, Exit simulation and existing account/org-switch controls. Do not auto-disable the simulation or loop through `/`, `/home`, onboarding and denied pages.

The no-page shell is a control surface with no org business payload. Redirect targets must be same-origin canonical app paths; untrusted return URLs and query params must not create an open redirect or carry sensitive context into another section. Apply the reroute only when the authorization context changes or the active preview becomes invalid, not as a blanket replacement for all direct 403s.

## Lifecycle and failure states

| Trigger | Required behavior |
| --- | --- |
| Switch to another org | Clear active simulation for safety and fully refresh the org context; never reuse a custom role key from org A in B. If the product later remembers choices per org, require explicit re-entry and revalidation rather than silently restoring. |
| Reload/back/forward | Server policy remains authoritative; cannot recover cached privileged payload or old permissions via history. Visible banner matches actual request context. |
| Selected role deleted/invalid | Invalidate the preview, show a clear status, and return to a safe control surface; do not silently treat an unknown custom role as a permissive default. |
| Real actor loses owner/admin or membership | Stop authorizing simulation control/reads immediately on authoritative revalidation; never rely solely on cached role claims. A clear exit action may clear stale state even if new simulation is denied. |
| Selected role rules edited elsewhere | Next relevant request uses updated rules; clear or version cached effective capability data. If current page is now forbidden, reroute safely. |
| Begin/change request fails | Keep the prior effective state and state label. Display retry/error. Do not show a selected role that the server did not commit. |
| Exit request fails | Keep the active banner and restrictions until confirmed; do not optimistically present admin mode. |
| Session expires/logout | Remove/invalidate simulation state with the session. Another account must not inherit it. |
| Two tabs | Specify session-wide versus tab-scoped behavior. Recommended session-wide state reflects changed context on the next request; broadcast a reload/context-change notification so one tab does not render stale admin data while sending requests under a simulated role. |
| Live gateway/agent tool access | Do not retain an admin-authorized socket/tool principal after activating simulation. Reconnect with bounded effective authority or explicitly suppress unsupported surfaces while active. A reload alone does not prove downstream gateway authorization fidelity. |

## Accessibility

Use the existing Dropdown/Sheet/Combobox primitives with a radio-like selected state. Search the org role list if needed; keyboard users need Enter/Space activation, arrow navigation, Escape dismissal and focus return to the avatar trigger. Opening Change role from the banner should focus the current selection. Announce role changes and redirects with a polite status message after the full reload; set focus to the destination heading when rerouted. Simulation/Exit remains readable and actionable at narrow widths, zoom and coarse-pointer sizes. Avoid hover-only exit or right-click-only access.

## Acceptance scenarios for the Spec Kit package

1. Real org owner selects a custom role from org A; after full document navigation, route, sidebar, subpage links, sensitive fields and records match that role alone; real owner capabilities are absent from the effective context.
2. Platform admin selects staff; all independent bypass entry points listed above are suppressed for product operations. Raw-role route checks, direct API calls and client-only `isAdmin` conditions cannot reopen the admin view.
3. The selected role cannot view the current page but can view another page in that section: the next full load lands there with an explanation. If none exists in the section, it chooses the first permitted destination in org order.
4. A saved homepage is forbidden: entering simulation does not redirect through `/` into that homepage or create a loop; fallback preserves locale and plan/module entitlements.
5. A role has no permitted business pages: the no-page shell renders no protected data and Exit remains operable without Settings/Users permissions.
6. Actor belongs to orgs A and B with identical custom role keys but different rules: org switching cannot carry A's rules into B, and the picker never lists B-only custom roles while A is active.
7. Target role is deleted, actor is demoted, or org membership is removed while preview is active: subsequent requests fail closed; role state and banner do not lie; stale cached data does not restore access.
8. An owner-scoped target role shows only records owned by the real actor, with explanatory copy; it never implies another member's records were reproduced.
9. Begin/change/exit errors preserve the last server-confirmed effective state and allow retry. Double activation does not create mixed role labels or contradictory requests.
10. Desktop expanded sidebar, collapsed rail and mobile all expose the same picker and persistent exit flow through keyboard and touch.
11. Background polling, gateway reconnects and agent tool calls cannot retain actual admin access while product UI claims a limited role.
12. Custom instance page override, inherited section rule, native built-in page override, hidden management state and module floor all resolve through the selected role. Explicit page allows and denies keep current precedence, and raw platform-admin state cannot bypass native page overrides.
13. The approved mutation mode is explicit and enforced server-side. If read-only, direct calls cannot post money, create jobs, update RBAC or alter org data during preview. If full operation, both actual and effective authority plus audit identity are verified.

## Scope boundary

This report is a source-backed proposal evaluation, not a runtime audit, application fix or implementation approval. No open application code was introduced; parent should carry the unresolved mutation/fidelity policy, precise state scope and downstream gateway treatment into the feature's proposal/spec/review artifacts before implementation.
