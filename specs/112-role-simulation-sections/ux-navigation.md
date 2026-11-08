# UX evaluation: section controls and contextual permissions

Date: 2026-11-08. Scope: source-based evaluation; parent owns FigCraft and visual inspection. No browser or usability-session evidence is claimed here. No application code changed.

## Baseline and evidence

Verified baseline: remote Hub `master`, commit `5f647e7c9db91f9a3ab0ad18c2dbf9d565dff38e`, read-only clone `/tmp/minion-role-section-controls-20261108/hub-baseline`. All source anchors below are relative to that clone. The workspace checkout at `minion_hub` is stale (`1f1ab6a3`); its early findings were superseded and are not used below. Registry PR base is `master`.

The verified remote includes custom sections and personal home at `/account/home`. Preserve these existing features. Production deployment is not established by source inspection.

| Surface | Current trigger and behavior | Evidence |
| --- | --- | --- |
| Main/sidebar utility and module destination rows | Shared `NavContextMenu`: Set as home for all; authorized users can copy, duplicate, move, rename, hide, restore or delete the appropriate built-in/instance. Access is explicitly omitted with a handoff TODO. | `src/lib/components/layout/NavContextMenu.svelte:158`, `:188`; `src/lib/components/layout/Sidebar.svelte:288`, `:337` |
| Custom section group headings | Shared menu: New page, Paste, Rename, org-wide Hide/Show, Delete section. Section Access explicitly omitted with a handoff TODO. | `src/lib/components/layout/NavContextMenu.svelte:189`, `:206`; `src/lib/components/layout/Sidebar.svelte:380` |
| Built-in full-mode headings | Inert menu host; falls through to area actions. It has no section-specific permissions. | `src/lib/components/layout/NavContextMenu.svelte:80` |
| Module subgroup heading | Header host passed module id; currently offers Paste. | `src/lib/components/layout/Sidebar.svelte:333`; `src/lib/components/layout/NavContextMenu.svelte:213` |
| Empty sidebar area | New section, Paste into, Not shown (restore hidden/broken entries), gated by settings management. | `src/lib/components/layout/Sidebar.svelte:321`; `src/lib/components/layout/NavContextMenu.svelte:214` |
| Existing nav menu activation | Right-click, ContextMenu key, Shift+F10, long press; uses shared ContextMenu. No visible More button on the host. | `src/lib/components/layout/NavContextMenu.svelte:240`, `:257`, `:497` |
| Personal sidebar | Plain section/page links; does not wrap links in NavContextMenu. This mode lacks the rich nav context controls available in full/module mode. | `src/lib/components/navigation/PersonalSidebar.svelte:12` |
| Personal home and section landing | Existing PageHeader, section cards, Open section, per-actor hide/show, move up/down, empty states. No section Access or shared nav menu. | `src/lib/components/navigation/PersonalHome.svelte:92`, `:99`, `:124` |
| Section-local navigation | Links/buttons with optional search and footer; no actions contract. | `src/lib/components/ui/foundations/SectionNav.svelte:8`, `:31`, `:93` |
| Page headings | Existing primary, secondary, overflow snippets support shared section actions. | `src/lib/components/ui/PageHeader.svelte:22`, `:91` |
| Permission boundary | Navigation structure uses settings:manage; access editing already has a separate users:manage helper, currently unused by the missing Access menu. | `src/lib/nav/nav-edit.svelte.ts:19` |
| Role manager | Full Settings matrix uses users:manage; owner protected in UI; presets None/View/Edit/Full/Custom. | `src/routes/(app)/settings/roles/+page.server.ts:18`; `src/lib/components/users/RbacRolesSection.svelte:119`, `:134` |
| Role override writes | Existing POST/DELETE authorize users:manage in active org and use canonical role service. | `src/routes/api/roles/overrides/+server.ts:26`, `:48` |
| Actual avatar/account menu | `layout/ProfileMenu.svelte`, shared desktop/mobile. Distinct from picture-editing `users/AvatarMenu.svelte`. | `src/lib/components/layout/ProfileMenu.svelte:34` |
| Date range controls | Right-click accelerator alongside visible More button: useful discoverability precedent. | `src/lib/components/dashboard/DateRangeControls.svelte:218`, `:232` |
| Tables/calendar | Column and row object menus, with keyboard support; booking block context-menu callback supports Shift+F10. Keep their domain scope. | `src/lib/components/data-table/DataTable.svelte:1689`, `:3859`, `:4053`; `src/lib/components/scheduling/BookingCalendar.svelte:2484` |

Other context-menu families include flow editor nodes, chapter DAGs, workshop objects, note editor, and home dock. They are domain-specific object actions; section RBAC does not belong there.

## Findings and recommended placement

1. **Primary entry: section main-page heading, visible to authorized users.** A visible `Section access` action (or shield-labelled item under the existing heading More menu when space is constrained) opens a drawer while retaining the current page. Title the drawer `Access to [section]` and show the active organization. This makes the requested task possible without a Settings detour and is reachable on touch devices.
2. **Secondary entry: section heading More button in the expanded sidebar.** The native button is a sibling of the heading/navigation link, with label `Actions for [section]`. Right-click and Shift+F10 on the section context open the SAME action model. The collapsed rail can use current section page actions; do not attach a tiny permissions target to every icon.
3. **Third entry: section card More action on the existing personal/all-sections home.** Open the identical drawer. Keep `Hide in my sidebar` and move controls explicitly labelled as personal preferences, separated from `Organization access`.
4. **Destination-row context menu stays page-scoped.** Keep Set as home there; add `Page access` only if the implementation supports page-level rules and resolves a canonical target. Do not label a module-wide write as access to one page.
5. **Keep object actions where the object lives.** Calendar booking, table column, canvas-node menus remain object-specific. Avoid a universal catch-all menu with section administration injected into unrelated objects.

| Placement | Personal group | Organization group | Availability |
| --- | --- | --- | --- |
| Section main-page heading | Optional Set as my home; no unrelated table layout settings | Section access | Authorized org capability only |
| Sidebar section heading More/right-click | Hide in my sidebar; move controls where supported | Section access | Menu can exist for personal items; org group absent without capability |
| Section card on personal home | Show/hide, move up/down | Section access | Authorized org capability only |
| Page nav row More/right-click | Set as my home | Page access only when real page rule exists | Never silently edits parent/module |
| Avatar menu | Language/account | Simulate role in [org] | Real owner/admin simulation authority; exact roles from that org |
| Table/calendar/canvas object | Existing object/view actions | No section permission controls | Preserve object scope |

## Drawer content and interaction

- Scope header: organization + section label, clear explanation `Changes affect everyone with this role in this organization`.
- Show this organization's role names, including custom roles, with current effective access, explicit override vs inherited/default status, and protected owner status. Do not invent static role labels or flatten custom permission combinations into Full/Edit.
- Section visibility and page/data permissions must remain distinct. If a section is a grouping of several canonical modules, show its constituent targets before applying any change. Never imply hiding a navigation heading revokes data/API access.
- First view can show a compact role list and selected role detail; reuse existing access presets and the full matrix's semantics. Preserve subresource exceptions, owner scope, sensitive-field levels, and action dependency constraints. `Restore inherited` differs from an explicit deny.
- Role/permission changes are consequential. Use draft -> review affected role/section/pages -> Apply, with Cancel and a visible saving/result state; avoid independent checkbox autosave that can revoke the operator midway through editing.
- Successful save refreshes shared RBAC and navigation. If the operator loses access, inform them and move to a permitted route. A failed save keeps the draft and offers retry; do not silently close.
- Keep `Open full role manager` as a secondary escape hatch; direct editing must remain complete without that navigation.

## Accessibility and responsive acceptance

- Visible, focusable native trigger; Enter/Space opens, arrows navigate, Escape closes, focus returns to trigger. Right-click is an accelerator, never sole access. Support ContextMenu and Shift+F10 on appropriate focused section/page item.
- On touch/coarse pointers, More is always available with a 44px hit area. Do not depend on hover reveal. Desktop focus-within also reveals any visually quiet trigger.
- Navigation links and async action buttons are native siblings. Prevent menu activation from navigating/reordering; do not put buttons inside anchors or rely only on click propagation (keyboard activation must also be isolated).
- Reuse the existing NavContextMenu / shared ContextMenu and Zag Dropdown/Popover/Dialog primitives; add a visible trigger that opens the same action model. Bound position to viewport, maintain shared layer tokens, and restore focus if trigger disappears after permission change.
- Drawer becomes full-width sheet on small screens with sticky scope header and Apply/Cancel footer. Long custom role/section/org names wrap without horizontal scrolling.
- Announce role simulation, redirect reason, save outcome, and conflicts; do not encode state only in color.

## Empty/hidden section and preference invariants

The verified `visibleNavConfig` retains a section with permitted pages OR an explicit section-view grant plus either a genuinely empty section or an individually permitted child (`src/lib/nav/custom-sections.ts:244`). Do not broaden that second condition to reveal a section whose children are all denied. `canManage` affects hidden state, not the permission test. `Sidebar.svelte:59` additionally appends empty sections for nav managers; explicitly audit that shortcut under simulation so a settings-management authority cannot restore admin-only navigation accidentally.

Stable `section:<id>` and `page:<id>` rule keys already exist (`src/lib/nav/custom-sections.ts:203`). Personal home persists per-actor/per-org preferences via the canonical preference owner (`src/lib/components/navigation/PersonalHome.svelte:39`). Personal hide/show and org-wide structure hide/show are separate operations with nearly identical wording today. Label these `Hide in my sidebar` versus `Hide for this organization` where appropriate. Neither grants nor revokes data/API access.

PersonalSidebar links currently bypass NavContextMenu (`src/lib/components/navigation/PersonalSidebar.svelte:12`). Wire section actions into this existing mode as well as full/module navigation; adding Access only to the existing menu leaves the personal mode without parity. The section landing at `/account/home?section=...` is an especially useful primary target for the user's main-page controls.

## Design decisions for parent spec

- Recommend simulation controls in `layout/ProfileMenu`, with persistent shell banner `Viewing as [role] in [org]` and an always-available Stop simulation action. Keep actual actor identity visible; real-user DEV switcher must remain separate.
- Section-permission writes should be unavailable while simulating. Offer `Exit simulation to edit access`, using real actor authority only for that explicit exit. Hidden admin controls are part of what simulation is meant to reproduce.
- Distinguish `Preview this role` from `Apply access changes`; a role picker in the access drawer cannot silently mutate the actor's org membership.
- Use existing `canEditAccess()` / `users:manage`, independently of `canEditNav()` / `settings:manage`. The current NavContextMenu returns early without settings:manage (`:168`, `:190`); merely appending Access below that check would incorrectly hide it from a role authorized only to edit access.
- Access is not only missing UI wiring: `/api/roles/overrides` validates registered module/subresource keys via `rbac.service.ts:1063`; it cannot currently accept `section:<id>`/`page:<id>`. The clone has no `/api/nav/access` endpoint or PageAccessDialog. Plan a bounded section/page access contract with org-scoped target validation, instead of sending those identifiers to the module-only endpoint.
- Implementation must target the verified remote master commit and preserve its integrated personal navigation. This source audit does not establish deployment status or FigCraft fidelity; parent owns those visual observations.

## Suggested proof matrix

Authorized manager with `users:manage`; manager without it; custom role with it; owner read-only invariant; custom role names; full vs module nav; collapsed rail; desktop keyboard; touch; org switch while drawer open; stale role removal; explicit deny vs inheritance; hidden personally vs denied by policy; empty permitted section; mixed child permissions; save revokes current page; failed save; simulation hides all administration controls while retaining Exit.
