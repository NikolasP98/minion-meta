# P1 — Module tool packs + MCP write surface

**Repos:** minion_hub (`dev`) + minion gateway (`DEV`). Gateway: pnpm, tsdown, oxlint/oxfmt (pre-commit re-stages whole files), `pnpm tsgo` typecheck, vitest. **Never deploy the gateway** (drops WhatsApp sessions) — commit/push only.
**Goal:** agents can read every business module and perform the highest-value writes, through the SAME hub API layer humans use (RBAC + zod + audit + RLS all apply). All tools MCP-exported.

## Established pattern to replicate (do not invent a new one)

- **Gateway side:** `minion/src/agents/tools/knowledge/crm-insight-tool.ts` — typebox schema, `getHubRest()` for hub URL + serverToken Bearer, `agentId=personal-<uuid>` passed as trusted identity, tool `null` unless personal agent + hub link. Registered in `minion-tools.ts` TOOL_ORDER.
- **Hub side:** `minion_hub/src/routes/api/gateway/insight/+server.ts` — `resolveAssistantPrincipal(locals, url)` → `{principalId, orgId, capabilities}` (membership-checked org, model-supplied orgId untrusted-but-bounded), explicit `capabilities.can(module, action)` check, `CoreCtx` with profileId → service call under `withOrgCore` RLS. Read its SECURITY comments and preserve both properties.
- Check `/api/gateway/query/+server.ts` too (crm_query's endpoint) before building — extend rather than duplicate where it already has plumbing.
- If `/api/gateway/*` needs hooks.server.ts allowlist entries for new subpaths, mirror however `insight`/`query` are allowed today.

## Confirm-before-write (v1 = tool-contract, no UI build)

Every WRITE tool takes a required `confirm: boolean`. Tool description instructs the model: "First present the exact action (entity, fields, effect) to the user and ask for confirmation. Only call with confirm=true after the user explicitly agrees. Calls with confirm=false return a preview, not a mutation." Hub action endpoints implement preview mode: `confirm:false` → validate + return `{preview: {...would create/update...}}` without writing. This works identically in the hub assistant AND over WhatsApp/Telegram — no FloatingAssistant changes needed.

## Workstream W1 — hub gateway-action endpoints (minion_hub)

New routes under `src/routes/api/gateway/actions/<name>/+server.ts` (POST), all following the insight pattern + `parseBody` (P0's `$server/api/validate`). Each maps to ONE existing service function — do NOT write new business logic; if a service function is missing a parameter, extend the service minimally.

| Endpoint | RBAC (module, action) | Service call |
|---|---|---|
| `actions/booking-create` | scheduling, create | `createBooking` (scheduling-bookings.service.ts) |
| `actions/booking-reschedule` | scheduling, edit | existing booking update path |
| `actions/booking-cancel` | scheduling, edit | existing cancel/status path |
| `actions/ticket-create` | support, create | support.service create |
| `actions/ticket-update` | support, edit | support.service update (status/assignee/priority) — pass expectedUpdatedAt through (P0-C) |
| `actions/ticket-comment` | support, edit | activity.service `addComment` |
| `actions/order-update-status` | sales, edit | sales.service updateOrderStatus (enum from ORDER_STATUSES) |
| `actions/task-create` | projects, create | projects task create service |
| `actions/task-update` | projects, edit | task update (status/assignee) |
| `actions/contact-update` | crm, edit | crm-contacts.service update (whitelist fields: name, phone, email, funnel stage, notes) |
| `actions/contact-tag` | crm, edit | tag add/remove service |
| `actions/notify-user` | comms or memberships view + explicit org member check | notifications service send/enqueue (template-based; free-text body capped) |

Read/query endpoints (GET, same principal resolution, `capabilities.can(module,'view')`, respect `shouldMaskSensitive` + `ownerFilter` exactly like the human routes do):

| Endpoint | Returns |
|---|---|
| `actions/../query/finance` (or extend `/api/gateway/query`) | invoices/payments summary, date-range aggregates, by-product — reuse rankCustomers/finance dashboard service fns |
| `query/bookings` | upcoming/past bookings, by contact/date |
| `query/tickets` | open tickets by status/assignee/party |
| `query/orders` | orders by status/date |
| `query/projects` | projects + tasks by status/assignee |

Also: `GET /api/gateway/pages` — serialize the route-hint map from `src/lib/state/features/assistant-context.ts` (route, title, what the page shows, query params it accepts) as JSON. Refactor the map into a shared const the assistant-context module and this endpoint both import (single source of truth).

Audit actor convention: services already receive actor from ctx/params — pass `actorName: <user name/email> + ' (via agent)'` wherever the route controls it.

Every mutating endpoint: `confirm:false` → return `{preview}` (validated payload echo + what would change), no write.

Tests: one vitest file covering principal/RBAC denial (403 when capability missing) + preview mode for 2 representative actions. Follow existing route/service test harness style.

## Workstream W2 — gateway tools (minion repo)

New dir `src/agents/tools/hub/` (sibling of `knowledge/`), one file per tool, cloning the crm-insight-tool.ts structure (typebox, getHubRest, personal-agent gate, wrapToolWithTracking). Tools + their hub endpoints:

READ: `finance_query`, `bookings_query`, `tickets_query`, `orders_query`, `projects_query`, `hub_pages` (fetches /api/gateway/pages; description: "discover hub pages + deep-link params; use to give the user navigable links").
WRITE (all with `confirm` param + preview contract): `booking_create`, `booking_reschedule`, `booking_cancel`, `ticket_create`, `ticket_update`, `ticket_comment`, `order_update_status`, `task_create`, `task_update`, `contact_update`, `contact_tag`, `notify_user`.

- Register all in `minion-tools.ts` TOOL_ORDER after the crm_* group.
- MCP export: set the same flag/mechanism `knowledge_graph` uses (`mcpExport: true` — verify exact field on that tool and match it).
- Descriptions matter (this is the agent UX): state when to use, the confirm contract, and that results should be presented with hub deep links (e.g. `[booking](/scheduling?…)`) — copy the linking style from crm_insight's description.
- Tool count discipline: this adds ~18 tools; keep descriptions tight. Do NOT add per-module variants beyond the table.
- Tests: gateway has existing tool tests? Match whatever exists for crm tools; if none, one vitest asserting tools construct (non-null for personal agent + hub link, null otherwise) and schema validity.
- Typecheck: `pnpm tsgo` must exit 0 (it currently does — keep it that way). `pnpm test` for the files you touch.

## Sequencing
W1 and W2 in parallel (different repos; the endpoint contract above is the interface). Orchestrator verifies both, smoke-tests one read + one preview write against a dev gateway if feasible, commits hub→dev and gateway→DEV. No gateway deploy.
