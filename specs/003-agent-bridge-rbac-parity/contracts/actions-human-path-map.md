# Contract — `actions/*` → human path map (FR-012, FR-013)

The table the capability-parity test reads. Mirror it as a typed constant beside
`src/routes/api/gateway/actions/actions.server.test.ts`; this file is the reviewable copy.

**The assertion**: for every row with a human path, the capability the handler requires equals
`apiWriteCapability(humanPath, method)`. For every row marked *agent-only*, the test asserts the
declared capability is still enforced (the endpoint is not un-gated) and that the reason below is
present, so "no counterpart" stays a recorded decision. **An `actions/*` directory that is not a row
fails the test** — that is what stops the class from recurring.

`apiWriteCapability` resolution, for reading the "expected" column: `DELETE` → `delete`;
`settings` → `manage`; `POST` whose exact pathname is in `CREATE_COLLECTION_ENDPOINTS` → `create`;
every other write → `edit` (`rbac.service.ts:1200-1248`).

| Agent endpoint | Required today | Human path | Method | Expected | Verdict |
|---|---|---|---|---|---|
| `booking-create` | `scheduling:create` | `/api/scheduling/bookings` | POST | `scheduling:edit` | **change agent → edit** |
| `booking-cancel` | `scheduling:edit` | `/api/scheduling/bookings/[id]` | PATCH | `scheduling:edit` | match |
| `booking-complete` | `scheduling:edit` | `/api/scheduling/bookings/[id]/complete` | POST | `scheduling:edit` | match |
| `booking-reschedule` | `scheduling:edit` | `/api/scheduling/bookings/[id]` | PATCH | `scheduling:edit` | match |
| `contact-update` | `crm:edit` | `/api/crm/contacts/[id]` | PATCH | `crm:edit` | match (owner pre-check still missing — US3) |
| `contact-tag` | `crm:edit` | `/api/crm/contacts/[id]/tags` | POST / DELETE | `crm:edit` / `crm:delete` | **split: removal needs `delete`** |
| `note-create` | none | — | — | — | agent-only: personal notes, principal-scoped, no module |
| `notify-user` | `comms:create` (fresh membership) | — | — | — | agent-only: no "notify a member now" human surface exists (`actions/notify-user` docstring). Already enforced — A17 |
| `order-update-status` | `sales:edit` | `/api/sales/orders/[id]` | PATCH | `sales:edit` | match (workflow gate missing — US6) |
| `pos-sale` | `pos:edit` | `/api/pos/tickets` | POST | `pos:create` (in `CREATE_COLLECTION_ENDPOINTS`) | **change agent → create** |
| `stock-entry-create` | `stock:create` | `/api/stock/entries` | POST | `stock:edit` | **change agent → edit** |
| `stock-issue-from-invoice` | `stock:create` | `/api/stock/issues/from-invoice` | POST | `stock:edit` | **change agent → edit** |
| `stock-issue-from-service` | `stock:create` | — | — | — | agent-only: no human endpoint; declare `stock:edit` to match its siblings |
| `task-create` | `projects:create` | `/api/projects/[id]/tasks` | POST | `projects:edit` | **change agent → edit** |
| `task-update` | `projects:edit` | `/api/project-tasks/[id]` | PATCH | `projects:edit` | match |
| `ticket-create` | `support:create` | `/api/support/issues` | POST | `support:edit` | **change agent → edit** |
| `ticket-update` | `support:edit` | `/api/support/issues/[id]` | PATCH | `support:edit` | match (workflow gate missing — US6) |
| `ticket-comment` | `support:edit` | `/api/support/issues/[id]/comments` | POST | `support:edit` | match |
| `tool-save` | `tools:manage` | `/api/builder/tools` (+`/[id]`) | POST / PUT | `tools:create` / `tools:edit` **and** `tools:manage` | **add the create/edit half** |

Six rows change. Five of them (`booking-create`, `stock-entry-create`, `stock-issue-from-invoice`,
`task-create`, `ticket-create` — five writes, four modules) make the agent **stricter**; `pos-sale`
makes it **looser in the direction of the UI** (O1). Both directions are named in the release note
per FR-025/SC-010.

**Verify before coding**: the human pathnames above are taken from the audit reports and from
`apiWriteCapability`'s prefix table; the exact pathname matters only where it decides
`CREATE_COLLECTION_ENDPOINTS` membership (`/api/pos/tickets`, confirmed present at
`rbac.service.ts:1188-1192`). The first task of the implementing slice is to re-read each handler
and correct any row that does not match the file — the map is a contract, not a memory.
