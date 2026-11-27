---
id: 2026-11-26-hub-apps-clinic-package
title: Apps — a new org starts with the agent chat; the Clinic app brings the modules, and each main page becomes an editable copy of its template
status: draft
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub, minion-meta]
tags: [ui, logic, data]
value: 9
effort: L
source: owner-request-2026-11-26
---

# Apps: the Clinic experience as a package whose main pages are templates

Pass 2, after EGM zoom-out and design review (reports: meta `.local/egm/2026-11-26-apps-clinic/`).
Preview: https://claude.ai/artifact/6kc4XEK2UawSPA6NzudrHY

## Problem (owner, verbatim, 2026-11-26)

> "the UI pages we built so far are templates for a given org/business. This means that a new org essentially has 1 page (agent chat page) and the user would go to the marketplace (rebrand to "apps" or some place you'd go to add modules to your app, the user installs the "Clinic" package, which contains the Finances, POS, Inventory modules with the UI we built so far. Essentially, all the UI we built so far (modules, dont include "settings" or "my account") corresponds to the "Clinic" pages. Note that many pages arent just the landing page for each module, but includes subpages (CRM has a customer details page, POS has a pasarela de pago, Inventory has a purchase flow, Scheduling has event management actions and UI, etc). These pages were designed for a CLINIC, as well as the business logic around it. Thats why I want to abstract the CLINIC experience. For now, I think agents should only be able to edit the main page and not the subflow pages; maybe in the future, but I'd have to design a way and UI story for users to create these complete experiences and business logic with something like n8n running specific business logic and triggers. The thing is that a user can always create a new copy of a template page if they want to reset at any time, or even have multiple dupes that achieve different visual perspectives."

## AS-IS (hub master `c51c5b62`, 2026-11-26)

| Fact | Anchor |
|---|---|
| Modules are coded routes: crm (7 pages), pos (11), stock (8), scheduling (9), finances (6), plus team, sales, support, memberships, socials, overview. | `src/lib/routes/route-design-manifest.ts:480-575` |
| **The module landing pages are already editable grids of cards.** CRM, finances, scheduling, stock and socials render an `EditableGrid` of id-keyed cards (CRM: 13). A user can reorder and resize them; an admin can "Save as default" for the whole org. | `src/routes/(app)/crm/PageBody.svelte:508-533` (`id="crm-dashboard-v2"`, `canSetDefault={isAdmin.value}`, `readonly={!canAct('crm','edit')}`); `src/lib/components/dashboard/EditableGrid.svelte`; table `dashboard_layouts`; `/api/dashboard-layouts/[id]` |
| A landing page gets its data from its own route: the route's server load (URL params, streamed stats), its own date control writing `?range=&from=&to=`, its own page shell and title. | `src/routes/(app)/crm/+page.server.ts:62-119`; `crm/PageBody.svelte:199-223,464-492` |
| Each module's dashboard is already a separately permissioned thing (`<module>.dashboard:view`), so some staff see sub-pages but not the dashboard. `/pos/sell` needs `pos:create`. | `src/lib/routes/route-access-registry.ts:31-77,139,213-219` |
| `/pos` has no landing page; it redirects to the first sub-page the user may open. `/overview` is a canvas screen, not a module landing. | `src/routes/(app)/pos/+page.server.ts:5-22`; `route-design-manifest.ts:596` |
| A new org gets every module: provisioning installs none, and an absent `app_modules` row means "enabled". Several modules (memberships, team, workforce) have no switch at all, `/overview` is not in the module manifest, and unmapped paths always pass the route guard. `team` includes `/settings/team`. | `src/server/services/organization-provision.service.ts:301-386`; `src/lib/modules/availability.ts:82-124,209-241`; `src/lib/modules/route-guard.ts:73-79` |
| The route guard covers `(app)` pages only — not APIs, public booking pages, reminders, agent tools or sandbox datasets. | `src/lib/modules/route-guard.ts:20-29` |
| Marketplace has five sections (agents, hooks, MCP servers, plugins, tools) and sits behind the `marketplace` plan feature and `marketplace:view`. The chat page is `/home`; `/home/settings` needs the `ai.chat` plan feature. | `src/routes/(app)/marketplace/*`; `availability.ts:178-180`; `route-access-registry.ts:187` |
| Org kinds: a personal org already hides most business modules. | `src/lib/org-kind.ts:8-23` |
| Sandbox pages are the only pages whose content is data: typed blocks, plus filters and connections once spec 150 S1 merges (hub #735, approved for merge 2026-11-26). `/sandbox` is admin-only; the element write accepts custom html/js for any page name. | `src/server/sandbox/sandbox.service.ts:225-299`; `route-access-registry.ts:133` |
| The module SDK (`defineModule`) is on master for stock only; spec 047's "base modules installed at provisioning" half is unbuilt (meta #930). | `src/lib/modules/sdk.ts`; `src/server/modules/stock.server.ts` |

## TO-BE (observable)

1. **A new org starts with the agent chat**, plus Apps, Settings (including its team members) and
   My account. No business module shows in its navigation or opens by URL until an app is installed.
2. **Apps** replaces "Marketplace" in the navigation. It lists apps — the first is **Clinic** — and
   holds today's marketplace sections. Any member can open Apps; an org admin installs.
3. **Installing Clinic** gives the org the modules built so far, with their pages, flows and rules.
4. **Each module with a dashboard has a main page; everything else is a flow page.**

   | Module | Main page (editable copy) | Flow pages (fixed) |
   |---|---|---|
   | CRM | `/crm` | customer detail, customers list, doors, insights, settings |
   | Scheduling | `/scheduling` | calendar, bookings and their forms, event types, links, reminders, settings |
   | Inventory | `/stock` | items, entries and the purchase/receipt flow, commitments, warehouses |
   | Finances | `/finances` | invoices, purchases, settings |
   | POS | none in v1 (it opens the till, as today) | sell / checkout, appointments, catalog, accounts, history, tickets, funnel, settings |
   | Team, Sales, Memberships, Support | none in v1 | all their pages |

5. **A main page is the org's copy of the app's template.** The template is the app's own set of
   cards in its own arrangement (what `/crm` shows today). A copy records which cards are shown,
   their order and size, and any blocks and filters added among them. An org that never edits
   has no copy and simply sees the template.
6. **Copies.** An admin can make a **new copy from the template** (a reset that keeps the old
   one), **duplicate** a copy, rename, delete (never the last) and choose the **default** that
   staff see. Several copies can exist side by side ("Reception", "Owner").
7. **Agents edit main pages only, and only as a draft.** The agent can show, hide and arrange the
   app's cards and add, configure and connect blocks and filters — on a draft copy that a person
   previews and applies. Agents cannot change what is inside a card, and have no way to change a
   flow page. Using a flow for the user (booking, charging) stays as today.
8. **Existing orgs:** staff see no change on the day each slice ships. Admins gain, in order: the
   Apps entry (renamed), and copy controls on main pages.

**Invariants:** no business table, rule, flow or URL changes; nothing is deleted by installing or
by resetting a page; a main page keeps its own route, data loading and permission
(`<module>.dashboard:view`); a copy holds only data — cards by id, blocks, filters — never code;
whatever a viewer may not see today stays hidden on any copy, including in blocks an admin added;
`/sandbox` stays the admin-only scratch area and the only place custom code elements exist.

## Design (program level)

- **App install state** is its own record (`org_apps`: org, app, who, when). Module availability
  gains one condition: "the module belongs to an installed app". `app_modules` and
  `/settings/modules` keep their meaning (switches inside an installed app). Rollback = remove the
  condition. Every Clinic module gets a manifest entry so the condition reaches it; `/settings/team`
  moves to the base. A failed read of install state is an error, never "nothing installed".
- **Scope of "not installed" in v1:** navigation, pages and what the agent is offered (tool
  catalog, sandbox datasets). Public booking links, reminders and APIs are not touched in v1 —
  a new org has none, and uninstall is not offered (see Out of scope).
- **Copies sit on the page's existing grid.** The route keeps its loader, shell, title and date
  control. The grid takes its arrangement from the default copy (or `?copy=<id>` for an admin
  previewing another) and renders added blocks and filters as extra cells. Copies generalise
  today's single "org default layout"; a person's own drag-and-drop tweaks keep working, per copy.
- **Page registry** (`sandbox_pages`): one row per copy — page name (as tools address pages
  today), module, kind (`scratch` | `main` | `draft`), title, default flag, revision. One default
  per org and module (unique index); default/delete under a row lock; if no default resolves, the
  template renders. Card ids are append-only; an unknown card or block renders a placeholder.
- **Reads for staff:** a non-admin's browser asks for an added block's data by element id; the
  server runs the stored spec with that viewer's permissions and masking, and leaves out blocks
  the viewer may not query. Free-form queries stay admin-only.
- **No code on main pages:** the element write refuses html/css/js on `main` and `draft` pages on
  every path (API, assistant tools, MCP, library, duplicate); the main-page renderer never mounts
  a frame. This keeps app pages outside `2026-11-25-hub-sandbox-custom-element-exfiltration`.
- **Drafts:** agents and API keys write only to `draft` pages (hidden, removed after 24 h, not
  counted in the cap of 10 copies). "Apply" is a person with `settings:manage`: it swaps the draft
  into the target copy in one transaction and is refused if the target changed meanwhile.
- **Preview of a draft:** on the page itself (`/crm?copy=<draft>`); the chat shows the added
  blocks live and names the cards, with a "Preview on CRM" link.
- **Known v1 limits (stated to users):** page filters drive added blocks, not the app's cards
  (they keep their own date control); nothing inside a card changes. First follow-up: cards that
  listen to page filters.
- **Reserved link names:** `copy` and each main page's own parameters (`range`, `from`, `to`) cannot
  be used as page value names (spec 150 S2).

## DELTA — two tracks, each slice one Spec Kit spec + PR, previews before UI builds

**Packaging track**

| Slice | Delivers | FACES sees | Proof |
|---|---|---|---|
| **P1 Install state** | `org_apps` + migration inserting `clinic` for every existing org (business and personal) + the availability condition + manifest entries for every Clinic module + provisioning installs `clinic` (so nothing changes yet) | nothing | Postgres-lane migration test on a prod-shaped snapshot; route + nav snapshot per existing org before/after; manifest pin test |
| **P2 Apps** | `/apps` (index + Clinic card open to any member, no plan feature; install = `settings:manage`); marketplace sections move under it with their current plan gate; `/marketplace/**` → 308 preserving sub-paths; nav label | "Apps" instead of "Marketplace" | route tests incl. a Base-plan org; FigCraft as-is / to-be |
| **P3 Chat-only start** | provisioning stops installing; landing falls back chat → Apps; agent tool catalog and datasets follow installed apps | nothing | provisioned-org e2e: only chat/Apps/Settings/account reachable (nav + direct URLs); needs Decision 3 |

**Editable pages track** (continues the synced-pages program)

| Slice | Delivers | FACES sees | Proof |
|---|---|---|---|
| S1 ✔ pending merge | filters + connections (hub #735) | — | — |
| **E1 Page registry + drafts** | `sandbox_pages`; kinds; no-code rule in the write service; draft → preview → apply on the admin `/sandbox` page (this is synced-pages S3) | nothing | unit + Postgres lane (default uniqueness, apply compare-and-set); e2e needs the QA stack repaired |
| **E2 CRM main page** behind a per-org switch (MINION org first, FACES last) | copies on `/crm`: arrangement + added blocks/filters in the grid, switcher, new copy from template, duplicate, default, delete; staff-safe reads | admins: copy controls on `/crm` | visual diff vs today with no copy; role tests (a viewer without `crm.dashboard:view`; a masked viewer); load-time budget; kill switch = turn the switch off |
| S2 | click-to-filter, drill, links (spec 150) | — | — |
| **E3 Scheduling, Inventory, Finances** | the same on the other three grids | admins: copy controls | per-module visual diff + role tests |
| S4 | Connections view (spec 150) | — | — |
| **E4 Agent scope** | page tools accept only `scratch`, `main` and `draft` pages; on `main` they create a draft; refusals say why; the agent's page description lists the cards the installed apps offer | assistant can draft main-page changes | tool tests; agent trial |

The two tracks do not depend on each other. Later, outside this program: user-authored flows
and rules (the n8n-style story), per-role default copies, a POS main page, more apps, cards that
listen to filters.

## How it folds into what exists

- **Synced pages (`2026-11-25-hub-synced-pages`, spec 150):** S3 becomes E1 (its draft contract —
  short hidden page, 24 h, guarded apply — is kept); its invariant "the sandbox stays admin-only"
  is narrowed to "`/sandbox` stays admin-only; main pages follow their module's dashboard
  permission" (amended in the same PR as this proposal); program order = the editable-pages track.
- **Spec 047 (meta #930):** the SDK half stays; "base modules on at provisioning" is replaced by
  P1–P3.
- **Spec 046:** the landing resolver gains the chat → Apps fallback (P3).
- **Spec 136 (org pages on the fly):** scratch pages as nav entries stay there; MCP tools gain the
  page-kind rules (E4).

## Alternatives considered

1. **A `view` block that embeds a module's landing page inside a data-driven page** (pass 1 of this
   proposal). Rejected: outside its route the page has no data, loses its dashboard permission and
   nests a second page shell and grid; it also hid the fact that the landing pages are already
   card grids.
2. **Rebuild every landing page from generic blocks.** Cleanest end state, months of work and
   certain regressions for a live clinic. Later slices can move card by card.
3. **Change `app_modules` so an absent row means "not installed".** Rejected: at least five readers
   assume the opposite, several modules have no row to flip, and a failed read would hide a whole
   org. A separate install record is one condition and one row per org.
4. **Give every org a stored copy on install.** Rejected for copy-on-write: no backfill, unedited
   orgs follow template improvements, and removing the feature is deleting rows.
5. **Per-org forks of route code** — unmaintainable and unsafe.

## Risks & mitigations

- **A module vanishing for a live org** (P1) → backfill and condition in one PR, snapshot proof
  per org, read failure = error, rollback = remove the condition.
- **Staff seeing more through added blocks** (E2) → reads by element id with the viewer's own
  permissions; omitted when not allowed; no free-form queries for non-admins; tests per role.
- **Code reaching staff pages** → refused in the write service by page kind, not only in tools.
- **Agent breaking the live page mid-shift** → agents and keys write drafts only; a person applies.
- **Landing pages changing by accident** (E2/E3) → no copy = today's code path; visual diff gate;
  per-org switch; FACES last.
- **Performance** → added blocks load after the page's own data; budget in E2's proof.
- **QA stack** unusable since 11-23 → E1's e2e needs it repaired first (owner decision pending).

## Decisions for the owner

1. **Clinic's modules.** Recommended: crm, scheduling, pos, inventory, finances, team (the `/team`
   area), sales, memberships, support, overview, socials/ads. Split socials/ads into a later
   "Marketing" app?
2. **Agent/platform pages** (agents, sessions, workforce, brains, builder, channels, reliability,
   tools): neither Clinic nor "one chat page". Recommended: unchanged for platform admins; hidden
   for a new org until a later "Agent studio" app. Confirm.
3. **The base page and plans.** The chat is `/home`; AI is a premium feature by your rule, and Apps
   is behind the `marketplace` plan feature today. Recommended: the chat page and the Apps index
   are in every plan (the agent's paid capabilities stay gated); otherwise a new org has nothing
   to open. Confirm, or name the plan a new org must have.
4. **Who manages copies and what staff see.** Recommended v1: org admins manage copies; staff see
   the one org default (their own drag-and-drop tweaks still apply). Per-role defaults later.
5. **Uninstall.** Not in v1 (the Modules settings page already hides a module). Confirm.

## Out of scope

User-authored flows and business logic; editing flow pages; uninstalling an app; changing what
is inside an app's card; a POS main page; per-role default copies; pricing or selling apps; a
second app; changes to business tables or rules; gating APIs, public booking and reminders by
install state.

## Definition of done

P1–P3 and E1–E4 merged and live. Verified by: a freshly provisioned org reaches only chat, Apps,
Settings and My account (navigation and direct URLs); an admin installs Clinic from Apps and the
modules appear with today's pages; on `/crm` an admin asks the assistant to add a KPI row and a
date filter, previews the draft on the page, applies it, keeps a second copy and resets with a new
copy from the template; a staff member without the dashboard permission still cannot open `/crm`,
and a masked viewer sees no unmasked value in any added block; page tools reject any page that is
not a scratch, main or draft page; FACES's routes and navigation match their snapshot after every
slice, and one recorded live check per slice.

## Detailed Implementation Plan

Each slice gets a Spec Kit folder when it starts (P1 and E1 first, in parallel). EGM reports:
meta `.local/egm/2026-11-26-apps-clinic/` (pass 1: zoom-out 3 blockers, design critic 9 blockers —
all accepted; the `view` block, the `app_modules` flip and uninstall were removed).
