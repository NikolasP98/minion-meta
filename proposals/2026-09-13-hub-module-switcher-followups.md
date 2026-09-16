---
id: 2026-09-13-hub-module-switcher-followups
title: Hub module switcher — follow-ups
status: draft
created: 2026-09-13
updated: 2026-09-13
repos: [minion_hub]
tags: [ui, ux]
---

# Hub module switcher — follow-ups

Owner: unassigned · Opened 2026-09-13 · Source: hub sidebar revamp (ERPNext-style
module switcher, `minion_hub` branch `feat/level-2026-07-30`)

The sidebar can now scope itself to one module (`$lib/nav/modules.ts` registry +
`$lib/state/ui/nav-mode.svelte.ts`), defaulting by org role: owner/admin/manager
get the full section list, staff/viewer get the module view. Open ends left by
that change:

1. **Mobile hamburger ignores module mode.** `layout/Topbar.svelte` renders
   `getNavSections(...)` unconditionally, so a staff user scoped to POS on
   desktop still sees every tab on mobile. Same class of bug as the nav-order
   parity gap fixed on 2026-07-19. Fix: branch the hamburger list on
   `navMode.activeModule` exactly as `Sidebar.svelte` does.
   `TODO(handoff)` marker is in `Topbar.svelte` above the `allSections` derive.

2. **Mode preference is per-browser, not per-user.** `navMode` persists to
   `localStorage` (`hub-nav-mode`, `hub-nav-module`), so the choice does not
   follow the user across devices. The per-user preference API already exists
   (`PUT /api/me/preferences/<key>` + `invalidate('app:preferences')`, as used by
   `landingPage` and `navOrder`) — move it there if the default proves wrong for
   real staff accounts.

3. **Module coverage is static.** Modules are a hand-maintained registry. Adding
   a route subtree without adding it to `getModules()`/`getAreaItems()` leaves it
   reachable only through the full nav. A route-registry-driven derivation (or a
   test asserting every `ROUTES[].inNav` path resolves to a module) would close
   the gap permanently; today only the hand-written list in
   `src/lib/state/ui/nav-mode.test.ts` ("covers every nav surface") guards it.

4. **Command palette / GNav chords are unscoped.** Both still offer every page
   regardless of mode. Arguably correct (search is an escape hatch), but it means
   module mode is a nav simplification, never an access boundary — RBAC remains
   the only enforcement.

## RBAC audit (2026-09-13)

Every page in the module registry was resolved through the route-access
authority (`routeAccessPolicyIdForPath`). Result: all 61 pages gate on a
permission/capability except the three the framework documents as universal
(`/home`, `/overview`, `/settings` — see the "Deliberately NOT gated" note on
`requiredViewPermForPath`). Two genuine holes were found and closed:

- `/pulse` fell through to `authenticated` even though `pulse` is a full RBAC
  module (in `BUSINESS_MODULES`, `/api/pulse` writes already gated). Added
  `pulse:view` to `BUSINESS_PERMISSIONS`, emitted it from
  `capsToLegacyPermissions`, and registered `['/pulse', 'pulse:view']`.
  **Behaviour change**: `staff` has no `pulse` caps in `defaultCaps`, so staff
  lose the Pulse page unless an org override grants it. That matches the
  matrix the write APIs already enforce.
- `/work` ("My Work") was ungated while its writes route to `projects`. Now
  `['/work', 'projects:view']` — staff and viewer both hold `projects:view`
  by default, so no one currently loses it.

Regression coverage lives in `src/lib/nav/modules-rbac.test.ts`: no module page
may reach the `authenticated` fallback, a permission-less session sees only the
universal three, a single-module grant yields that module plus the universal
pages, sub-resource rows (`pos.sell`, `crm.insights`) are not implied by the
parent grant, and each module's write API maps to its own capability.

Still open, deliberately not changed here (product calls, not bugs):

1. **Field-level masking covers only `crm`, `finance`, `scheduling`**
   (`FIELD_LEVEL_MODULES`). Modules now surfaced as first-class nav that also
   display sensitive figures or PII — `stock` (cost valuation), `pos` (ticket
   customer data), `sales`, `memberships` — have no masked-field tier. Adding
   one changes what existing roles see, so it needs a decision, not a patch.
2. **Sub-resource granularity is uneven.** `/pos/*`, `/crm/*`, `/finances/*`,
   `/scheduling/*` have per-page RBAC rows; `/stock/*`, `/workforce/*`,
   `/socials/{campaigns,posts}` share their parent module's single `view`. If a
   role should see stock items but not valuation, that needs a new
   `MODULE_SUBRESOURCES` entry.
3. **Module mode is not an access boundary.** It hides nav; the palette, GNav
   chords and direct URLs still reach anything RBAC allows. That is by design —
   RBAC remains the only enforcement.
