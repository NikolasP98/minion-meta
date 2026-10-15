# A — Agent capability coverage matrix (hub ⇄ agent)

**Date:** 2026-10-15 · **Read-only audit.** Nothing was edited, committed or executed.
**Code read:** hub `origin/master` @ `4fe89934` (`~/.cache/claude-tmp/hub-audit/`), gateway `origin/DEV` @ `f2de5e00534` (`~/.cache/claude-tmp/gw-audit/`).
**Requirement under test:** "the agent can do literally anything given the user has the needed RBAC for them."

---

## Headline

| Measure | Count |
|---|---|
| Hub `/api/**/+server.ts` files | **468** |
| …with at least one write method | 347 (121 are GET-only) |
| Human write surface = `(route, method)` pairs outside the agent/machine namespaces | **368** |
| …that have an agent path | **≈20** (19 `actions/*` + `gateway/brain-remember`) |
| **Gaps (write pairs with no agent path)** | **≈348 (95%)** |
| RBAC cells (22 modules × 6 actions, `rbac.service.ts:40`) | 132 |
| …cells with any agent tool | **≈25 (19%)** |
| RBAC modules with **zero** agent path, read or write | **11 of 22** — memberships, ads, pulse, agents, channels, flows, marketplace, reliability, workspace, settings, users |
| In-app ("minion-ui") assistant forms | 8 — **fill-only, cannot submit any of them** (`src/lib/assistant/forms.ts:100`) |

The requirement is not met and the shortfall is not incremental: the agent reaches ~5% of the
product's write surface. RBAC is *not* the limiter — the limiter is that every agent-reachable
action is a hand-written endpoint-plus-tool pair, and only 20 were ever written.

### Top 10 gaps by business value

| # | Capability (human path) | Missing piece | Why it hurts |
|---|---|---|---|
| 1 | **Open/close a POS shift** `POST /api/pos/shifts/open`, `/close`, `/[id]/emit` | hub action + gateway tool | `pos-sale` already exists but hard-fails with "no open shift" and the agent has **no** recovery; the single most common till blocker |
| 2 | **Void / refund / tender-correct a ticket** `POST /api/pos/tickets/[id]/void`, `PATCH /api/pos/tickets/[id]/payments/[paymentId]`, `/[id]/emit` | hub action + gateway tool | money corrections are the highest-frequency front-desk ask; shipped for humans 2026-10-15 (hub #534–#536), zero agent path |
| 3 | **Create a customer** `POST /api/crm/parties`, `POST /api/crm/contacts` | hub action + gateway tool | the agent can *update* a contact (`contact_update`) but cannot create one — every new-customer booking or sale dead-ends |
| 4 | **POS calendar appointments** `POST /api/pos/appointments`, `/[id]/complete`, `/unschedule`, `/group`, `/notes` | hub action + gateway tool | `booking_*` tools gate on `scheduling`, so a cashier with pos-only caps cannot book at all through the agent |
| 5 | **Register a purchase / bank statement** `POST /api/finances/purchases`, `/statement-imports`, `/sync` | hub action + gateway tool | `finance` has a read tool (`finance_query`) and **no write path whatsoever** |
| 6 | **Submit or cancel a stock entry** `POST /api/stock/entries/[id]/submit`, `/cancel` | hub action + gateway tool | deliberately excluded "in v1" (`actions/stock-entry-create/+server.ts:30-32`); the agent only produces drafts a human must post |
| 7 | **Add a catalog item / service / price** `POST /api/pos/sellables`, `PATCH /api/pos/sellables/[id]`, `POST /api/stock/items`, `/api/pos/categories` | hub action + gateway tool (form exists but cannot submit) | the agent cannot introduce anything sellable |
| 8 | **HR: leave requests, employees, holidays** `scheduling/hr/*` (11 write pairs) | hub action + gateway tool | "approve my time off" is a canonical assistant ask; zero path |
| 9 | **Memberships, plans, package redemption** `/api/memberships*`, `/api/pos/plans`, `/api/pos/packages/grants/[id]/redeem` | hub action + gateway tool | recurring revenue; `memberships` module has no agent surface at all |
| 10 | **Team & access admin** `/api/join-requests/[id]/approve|deny`, `/api/users/[id]/member-role`, `/api/roles/*`, plus generic `/api/tags` | hub action + gateway tool | the owner's own admin work; the agent can only tag CRM contacts, not anything else |

Runners-up (same shape, lower value): notification rules, inbox read/dismiss, brain document CRUD,
`/api/meta` (ads) writes, settings/module toggles, workflow defs, file/attachment upload,
dashboard layouts, workshop, flows, servers/channels provisioning (28 write pairs under `/api/servers`).

---

## Table 1 — module × action coverage

Legend: ✅ dedicated agent tool · 🟡 partial (narrower than the human path) · ❌ no agent path.
"UI" = a human page exists. All agent tools are gateway tools unless marked **(ui)**.

| Module | UI | view | create | edit | delete | export | manage |
|---|---|---|---|---|---|---|---|
| overview | ✅ | 🟡 `hub_pages` (navigation only; `insight` GET for a few canned intents) | — | — | — | ❌ | ❌ |
| crm | ✅ | ✅ `crm_query`, `crm_search`, `crm_insight`, `search_crm_conversations`, `crm_conversation_themes` | ❌ **no contact/party create** | 🟡 `contact_update` (name/phone/email/funnel/notes only), `contact_tag` | ❌ | ❌ | ❌ |
| finance | ✅ | ✅ `finance_query` | ❌ | ❌ | ❌ | ❌ | ❌ |
| sales | ✅ | ✅ `orders_query` | ❌ | 🟡 `order_update_status` (status only) | ❌ | ❌ | ❌ |
| scheduling | ✅ | ✅ `bookings_query` | ✅ `booking_create` | ✅ `booking_cancel`, `booking_reschedule`, `booking-complete`¹ | ❌ | ❌ | ❌ (event-types, links, reminders, resources, HR all absent) |
| support | ✅ | ✅ `tickets_query` | ✅ `ticket_create`, `ticket_comment` | ✅ `ticket_update` | ❌ | ❌ | ❌ (settings) |
| projects | ✅ | ✅ `projects_query` | ✅ `task_create` | ✅ `task_update` | ❌ | ❌ | ❌ (project create, templates, timesheets, gantt) |
| memberships | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| comms | ✅ | ✅ `email_recent` | ✅ `notify_user` (**surplus**, see §4) | ❌ | ❌ | ❌ | ❌ |
| brains | ✅ | ✅ `brains_list`, `brain_search` | ❌ (no brain/document create) | 🟡 `brain_remember` (append a note doc only) | ❌ | ❌ | ❌ |
| stock | ✅ | ✅ `stock_query` (levels/movements/valuation/consumption/accruals) | 🟡 `stock_entry_create` (**draft only**), `stock-issue-from-invoice`¹, `stock-issue-from-service`¹ (these two can `submit`) | ❌ (no item/warehouse/consumption edit) | ❌ | ❌ | ❌ |
| ads | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| pos | ✅ | ✅ `query/pos` (`sellables`\|`shift`\|`tickets`) | ❌ (appointments, plans, categories) | 🟡 `pos-sale`¹ — ring up only; no void/refund/emit/tender-correct | ❌ | ❌ | ❌ **no shift open/close** |
| pulse | ✅ | ❌ (the `gateway/pulse/proposals` POST is a machine-token channel, not user RBAC) | ❌ | ❌ | ❌ | ❌ | ❌ |
| agents | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| channels | ✅ | ❌ (`gateway/channel-identities` is a read for the gateway itself) | ❌ | ❌ | ❌ | ❌ | ❌ |
| flows | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| marketplace | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| reliability | ✅ | ❌ | — | — | — | ❌ | ❌ |
| workspace | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (modules, plugins, backups, org-config, tables, workflows) |
| users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (join requests, member roles, identities, aliases) |
| tools | ✅ | ✅ `sdk_inspect` | 🟡 via `tool-save` | 🟡 via `tool-save` | ❌ | ❌ | ✅ `tool_builder_save` (create+update+**publish**) |
| *(no module)* | — | `notes_query` | `notes_create` | ❌ (no note edit/delete) | ❌ | — | — |

¹ No dedicated gateway tool — reachable only through the generic `module_action` allowlist.

**Modules with a UI and no agent path at all: 11 of 22.**

### In-app ("minion-ui") assistant — browser-side surface

Execution model: the gateway model emits ```` ```minion-ui ```` fences; the browser runs them
(`src/lib/assistant/ui-blocks.ts:1-19`, `runner.ts`). Registered tools are only:

| Tool | What it does |
|---|---|
| `hub.navigate` | opens a path (+ query params), reports whether a catalog form mounted |
| `hub.pages` | searches the pages this user may open |
| `ui.guide` | highlights `data-assist` targets step by step (teaching, not doing) |
| `ui.choice` | renders option buttons |
| `fill_<formId>` × 8 | fills fields on a mounted form |

`FORM_CATALOG` (`src/lib/assistant/catalog.ts:360`) = `stock_entry`, `stock_item`, `warehouse`,
`sellable`, `party`, `booking`, `purchase`, `pos_sale`.
**None can be submitted by the agent** — `registerForm` registers a fill tool whose own description
says "Only fills — the user reviews and submits" (`src/lib/assistant/forms.ts:94-120`). So the
browser path contributes **zero** completed writes; it is a typing assistant. Note the irony: the
only agent path to *create a customer* or *register a purchase* is a form the agent cannot submit.

---

## Table 2 — the agent surface, endpoint by endpoint

### `/api/gateway/actions/*` (19 — the entire agent write surface)

| Endpoint | RBAC gate | Can | Cannot |
|---|---|---|---|
| `booking-create` | scheduling:create | create internal booking (bypasses min-notice, respects conflicts) | recurring series, group bookings, resource assignment beyond `resourceId` |
| `booking-cancel` | scheduling:edit | set status cancelled | delete, refund linkage |
| `booking-reschedule` | scheduling:edit | cancel + create as one call | — (no human single-endpoint equivalent) |
| `booking-complete` | scheduling:edit | complete + realize accrued stock | per-service completion granularity |
| `contact-tag` | crm:edit | add/remove one tag | bulk tagging (`/api/crm/contacts/tags/bulk`), tag CRUD |
| `contact-update` | crm:edit | name, phone, email, funnelStage, notes (patch form, optimistic lock) | **create**, delete, guardians, accounts, meta keys, DNI/RUC lookup, cleanup |
| `note-create` | principal-scoped, no module | create note/todo/easel | edit, delete, polish/refine/transcribe |
| `notify-user` | comms:create + recipient membership | free-text email to an org member | **surplus** — no human UI equivalent; carries a `TODO(handoff)` |
| `order-update-status` | sales:edit | set order status | create order, reconcile, order lines |
| `pos-sale` | pos:**edit** | preview totals, ring up a ticket via `submitTicket` | **open/close shift, void, refund, tender correction, emit (SUNAT), schedule from ticket, post-stock, account top-up, plans, package redeem** |
| `stock-entry-create` | stock:create | create a **draft** entry | submit, cancel, edit, delete |
| `stock-issue-from-invoice` | stock:create | preview + create issue, optional `submit` | reverse, edit |
| `stock-issue-from-service` | stock:create | preview + create issue, optional `submit` | reverse, edit |
| `task-create` / `task-update` | projects:create / :edit | task CRUD-minus-delete | project create, templates, timesheets, reassign |
| `ticket-create` / `ticket-update` / `ticket-comment` | support:create / :edit / :edit | ticket CRUD-minus-delete + comment | settings, SLA |
| `tool-save` | tools:manage | create/update **and publish** a custom tool, including its self-declared `permission` | — (see §4) |

Plus `POST /api/gateway/brain-remember` (brains:edit) — append a note document to a brain.
Other `/api/gateway/*` POSTs (`pulse/proposals`, `email-ledger`, `fleet-update`, `update`, `lease`)
are **machine** server-token channels, not user-RBAC agent actions.

### `/api/gateway/query/*` (13 — the entire agent read surface)

| Endpoint | Gate | Modes | Richer human API it does not match |
|---|---|---|---|
| `query/pos` | pos:view | `sellables`, `shift` (own open shift only), `tickets` (≤50, optional shiftId) | no shift **history/list**, no refunds/voids view, no payments, no accounts, no plans, no appointments, no emissions, no categories, no settings |
| `query/stock` | stock:view | `levels`, `movements`, `valuation`, `consumption`, `accruals` | no entries list/detail, no items list, no warehouses, no components/BOM, no bins maintenance |
| `query/finance` | finance:view | (capability-filtered) | no purchases, no invoices, no statement imports, no period locks, no sources, no sync status |
| `query/bookings` | scheduling:view | bookings | no calendar, no slots, no event types/kinds, no links, no resources, no HR |
| `query/tickets` | support:view | tickets (record-level if-owner scoping) | no settings |
| `query/orders` | sales:view | orders | — |
| `query/projects` | projects:view | projects/tasks | no gantt, no progress, no timesheets |
| `query/notes` | principal-scoped | notes by kind/q | — |
| `query/email-ledger` | comms:view | recent processed email | — |
| `query/custom-tools` | — | published org custom tools (gateway bootstrap) | n/a |
| `query/tool-permissions` | — | the capability snapshot (contract C2) | n/a |
| `query/sdk-catalog` | tools:view | tables + the query/actions inventory | n/a |
| `query/` (root) | — | **503 `ASSISTANT_SQL_DISABLED`** (`src/server/services/assistant-query.service.ts:4`) | the arbitrary-SQL escape hatch was removed with no parameterized replacement |

**24 read + 20 write endpoints** against 468 hub route files.

### Is `module_action` a generic bridge? (method step 4)

**No.** `src/agents/tools/hub/module-action-tool.ts:9-27` is a hardcoded `ENDPOINTS` allowlist of
17 strings — a mirror of the fixed `actions/*` directory, minus `note-create` and `tool-save`
(which have dedicated tools). It validates the string against the list before calling
`hubPost("actions/" + endpoint)`. There is **no generic dispatcher on either side**: the hub has
only the 19 concrete `+server.ts` files, and `module_action` cannot reach a route that is not in
its own compiled-in list. So adding one hub action still requires a **gateway code change and
deploy** before any agent can use it.

---

## §4 — Surplus: things the agent can do that a human cannot

1. **`notify-user`** — "notify an org member now" has no UI and no service. The route sends a capped
   free-text email straight through the gateway's `channels.send` RPC, and its own header admits the
   gap and that it is "unverified against the gateway's channel support for an 'email' channel"
   (`src/routes/api/gateway/actions/notify-user/+server.ts:21-31`, with a live `TODO(handoff)`).
2. **`booking-reschedule`** as one atomic cancel+create; the human UI has no single equivalent.
3. **`stock-issue-from-service`** — no matching human endpoint (the UI reaches it by another route).
4. ⚠️ **Self-declared permissions on self-published custom tools.** `actions/tool-save` (gated
   `tools:manage`) lets the agent create a `builtTool`, choose its `permission: {module, action}`,
   and `publish` it in the same call (`tool-save/+server.ts:50-90`). The gateway then synthesizes a
   tool from that record (`src/agents/tool-search/custom-tools.ts:1-20`) and executes the stored
   script with `spawn`/`execFile` — with **no container sandbox**: "D5 ceiling: no container sandbox
   v1 — admin-authored tools only" (`src/agents/tool-search/run-script.ts:8`). The declared
   permission only decides whether the tool is *visible* to L1 gating
   (`hub-capabilities.ts permissionAllowed`); it does not constrain what the script does on the
   gateway host. An agent holding `tools:manage` can therefore author and publish code that runs
   outside the RBAC model entirely. **This is the one place where the agent already exceeds the
   requirement, in the wrong direction**, and it is worth reading as a finding rather than a feature.
   (I did not test this end to end — it is a code reading of the two files above.)

---

## §5 — Structural causes

1. **Each agent action costs 3–4 hand-written artifacts, in two repos, behind a deploy.**
   One capability = a hub `/api/gateway/actions/<id>/+server.ts` with its own zod schema and
   `requireAssistantCapability` call (`src/routes/api/gateway/_shared/action-auth.ts:22`) + a gateway
   `*-tool.ts` + a `*-tool.meta.ts` + codegen into `_registry.generated.ts`, and optionally a string
   in `module-action-tool.ts:9-27`. 368 human write pairs × that cost is why the number stopped at 20.

2. **The authorization half of "anything" is already built; the routing half is not.**
   `rbac.service.ts:40` defines 22 modules × 6 actions, and `apiWriteCapability`
   (`rbac.service.ts:1112-1250`) already maps *any* `/api/<module>/...` write path and method to the
   capability it needs — that is a working generic policy for the whole hub API, used by the central
   hooks guard for human requests. The agent surface does not use it; it re-derives the gate
   per endpoint. A generic agent dispatcher that resolved the assistant principal and then deferred
   to `apiWriteCapability` would inherit RBAC for every route that exists, including future ones.
   (Stated as the structural observation the matrix implies; designing it is out of scope here.)

3. **Reads are hand-coded `mode=` switches, not filters.** `query/pos` has 3 modes, `query/stock` 5
   (`src/routes/api/gateway/query/pos/+server.ts:15-49`, `query/stock/+server.ts:18-52`). Every new
   read *shape* is a new branch. The general escape hatch that used to exist was removed and never
   replaced (`query/+server.ts:1-10`).

4. **The browser path can never finish a write.** `registerForm` only ever registers `fill_<id>`
   (`src/lib/assistant/forms.ts:94-120`); `FormBinding` has `get`/`set` and no `submit`
   (`forms.ts:53-62`). 8 forms, 8 fill tools, 0 submits.

5. **The agent's own map of the product is stale and partial.** `HUB_ROUTE_MAP`
   (`src/routes/api/gateway/_shared/hub-route-map.ts:12-40`) lists 24 routes and is the sole source
   for both `hub_pages` and the in-app briefing, while `MODULE_SUBRESOURCES`
   (`src/lib/routes/route-access-registry.ts:43-90`) plus the route manifest cover far more. Entries
   like `/bookings` and `/crm/customers` do not match the current `MODULE_SUBRESOURCES` routes
   (`/scheduling/...`, `/team`), so the agent can mis-name pages it also cannot act on.

6. **Permission gating fails closed on a 60s cache but *opens* on an old hub.**
   `hub-capabilities.ts` returns `{legacyHub:true}` on a 404 from `query/tool-permissions`, and
   `permissionAllowed` then allows every permission-carrying tool. Correct as version-skew handling,
   worth knowing as a property of the gate.

---

## Not determined from code

- Whether the `module_action` allowlist drift (`note-create`, `tool-save` absent) is intentional;
  both have dedicated tools, so the behavior is reachable, but the generic path cannot reach them.
- Whether `notify-user`'s `channels.send` email path actually works in production (its own header
  says it is unverified).
- Runtime tool-selection effects: L2 JIT shortlisting (`tool-search/select-tools.ts`) may hide an
  existing tool from a given turn. This audit counts *existence*, not per-turn availability.
- Whether custom tools are in practice restricted to admin authors (the `run-script.ts:8` comment
  asserts the intent; `tool-save` requires only `tools:manage`).
