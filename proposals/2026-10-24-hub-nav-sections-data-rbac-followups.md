---
id: 2026-10-24-hub-nav-sections-data-rbac-followups
title: "Hub custom nav sections + data roles: open ends after specs 037/039 S1–S5"
status: draft
created: 2026-10-24
updated: 2026-10-25
repos: [minion_hub]
source: spec-037
effort: M
---

# Hub custom nav sections + data roles: follow-ups

Open ends left by spec 037 (custom sections, page links, page roles; hub #597, #601, #598, #600, #602)
and spec 039 (data roles per dataset; hub #596, #599, #603, #604, #605). Each item names
where it lives.

## AS-IS

- **Write buttons are not gated by data roles.** Spec 039 gates reads only. These screens still
  show add/edit controls to roles that cannot use them, and the server refuses the write after the
  click: `stock/entries/new`, `scheduling/reminders`, `socials/posts`, `work`, `notifications`.
  The till is the exception: `/pos/sell` now blocks the cart when the role lacks `pos:create` (S5).
- **Orphan page-rule cleanup is not transactional.**
  `src/server/services/nav-config.service.ts` (`deleteOrphanPageRules`) runs after the nav document
  is written. A failure leaves stale `page:<id>` / `section:<id>` rules behind. They are harmless,
  because no page has that id, but they show up in the Roles matrix (`TODO(handoff)` at the site).
- **Client bundle.** `can.svelte.ts` now carries the page-rule lookup to the client. Its size impact
  has not been measured.
- **Section icons are free-text emoji.** There is no icon picker.
- **Import cycle.** `nav-config.svelte.ts` ↔ `custom-sections-nav.ts` (S3) is safe today because
  neither side reads the other at module scope. One top-level read would break it.
- **`/api/roles` POST does not validate `roleKey`** the way the overrides route now validates page
  keys (`isPageRuleKey`).
- **`loadCalendarWindow` signature.** It takes `foreign: { pos, stock, crm }` handles (039 S3).
  Every new caller has to pass them; there is no lint for that.
- **Settings and admin loads hard-403** through `requireDataset` (039 S5, hub #605) instead of
  rendering the `DataSource` "can't view" panel (`TODO(handoff)` in `src/server/auth/dataset-ctx.ts`).
  That is fine while the route guard already 403s there. It needs converting if page roles ever
  expose those routes to roles without the module's view.
- **152 API GET handlers have no capability check** (039 S5 `apiGets` ratchet bucket, decrease-only).
- **`NotificationsPopup.svelte:136` calls `canClient('users:manage')`** (on master). `canClient` looks
  keys up in the ACCESS map, which uses dot keys (`users.manage`), so the review action is hidden for
  everyone. 037 S4 hit the same bug in the nav menu and fixed it with `can()`.
- **The QA seed has no `permission_roles` rows.** The local QA stack (`supabase_db_minion-hub-qa`) has
  0 rows, so `/api/roles` and the Access dialog list only custom roles there. `listRoleCatalog` in
  `rbac.service.ts` also drops the query's `error`, so a failed read looks like "no system roles".
- **A denied direct URL to a custom page answers 404**, not "your role can't". That matches spec 037
  Q13/Q15b (don't reveal pages the role can't see) but differs from the 403 wording rule elsewhere.
- **Not yet proven end to end:**
  - browser QA of 037 S3–S5 ran twice (`evidence/qa-s6/`, `-r2`): all journeys pass except
    show/restore of a hidden page from "Not shown", module mode for a custom section, and real touch
    long-press (only simulated touch events were tested);
  - that a Vercel preview keeps the `~` in instance URLs (`/<section>/<slug>~<id>`), spec 037 Q21;
  - the persona matrix for 039 S3.

## TO-BE

- Every write control on a screen whose dataset is in `DATASET_ENFORCED` reads `canAct(module, verb)`.
  A role that lacks the verb sees the control disabled, with the "your role can't" reason.
- Orphan cleanup either shares the document write's transaction or runs from a sweep that is idempotent.
- `roleKey` is validated on POST with the same strictness as page keys.
- The browser proofs above are captured in `specs/037-custom-nav-sections/evidence/` and
  `specs/039-data-source-rbac/evidence/`.
- The hub `AGENTS.md` RBAC checklist gains one line: new page loads read through
  `datasetCtx`/`readDataset`, and the ratchet baseline only decreases.

## DELTA

1. Gate the five write surfaces with `canAct`. Test: a mounted test per surface checks that the
   control is disabled for a role without the verb.
2. Make orphan cleanup transactional or move it to a sweep. Test: an injected failure leaves no
   stale rule (or the next sweep removes it).
3. Validate `roleKey` on `/api/roles` POST. Test: the route rejects a malformed key with 400.
4. Collect the browser QA and preview `~` evidence. Gate: screenshots plus a curl of the preview URL.
5. Add the `AGENTS.md` checklist line.
6. Fix `NotificationsPopup` to use `can('users:manage')`. Test: a mounted test with that permission
   shows the review action.
7. Seed `permission_roles` in the QA stack, and make `listRoleCatalog` throw on a query error.
   Test: a mocked error surfaces as a 500, not a short list.
