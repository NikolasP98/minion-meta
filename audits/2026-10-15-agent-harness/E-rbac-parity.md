# E — RBAC parity: human UI/API path vs. agent path (minion_hub)

**Scope** Clean checkout at `origin/master` `4fe89934`, path `/home/nikolas/.cache/claude-tmp/hub-audit/`.
All 48 `/api/gateway/**` bridge endpoints, the RBAC engine, the assistant principal resolver,
the central hub guards, and the in-app (browser) assistant tools. Read-only; no mutations.

**Targeted tests** `bun run vitest run src/server/services/rbac src/server/auth src/routes/api/gateway src/lib/assistant`
→ **35 files passed, 1 skipped; 409 tests passed, 1 skipped** (55s, exit 0). The full `bun run test`
was deliberately NOT run (integration tests can reach production).

---

## Verdict

The engine itself is sound and fail-closed: `buildCapabilities` ORs across roles, unknown
role/module → `NONE`, `requireOrgCapability`/`hasOrgCapability` deny without a user, an org, or a
`supabaseId`. `resolveAssistantPrincipal` is genuinely careful — it never accepts a requested org as
authority, re-reads the gateway/agent assignment on every request, and has 22 pinned tests covering
wildcard matching, stale assignment, removed membership and cross-org requests.

**But the agent path is not a parity layer over the human path — it is a second, thinner
implementation of it.** `requireAssistantCapability` checks exactly one thing (`capabilities.can`).
The human path checks four: capability, **module-enabled**, **record-level owner scope**, and
**field-level masking**. Three of those four are structurally absent from the bridge, because
`ownerFilter` / `shouldMaskSensitive` / `isModuleEnabled(locals-based)` all key off `App.Locals`,
which a gateway caller does not have. Two endpoints worked around it correctly
(`query/tickets`, `query/orders` use `capabilities.ownerScoped(...)`); two did for masking
(`query/finance`, `query/bookings` use `capabilities.fieldLevel(...)`). Everything else did not.

So on the owner's requirement — *"the agent can do literally anything given the user has the needed
RBAC"* — the answer today is: **the agent can do rather more than the user in several places, and
slightly less in one.** 9 SECURITY findings, 1 true over-restriction, and a large coverage gap.

Severity labels are mine; none of these were exploited — all are static reads of the code.

---

## SECURITY findings

### S1 — Cross-org decrypted Google credential leak (CRITICAL)
`src/routes/api/gateway/google-adc/+server.ts:24-36` and
`src/routes/api/gateway/google-identities/+server.ts:38-50`

```
const isGateway = Boolean(locals.serverId);
if (!isGateway) {                                    // ← ownership check ONLY for sessions
  if (!locals.user) throw error(401, …);
  if (locals.user.role !== 'admin' && locals.user.id !== userId) throw error(403, 'forbidden');
}
const ctx = await getTenantCtx(locals);
const cred = await getGoogleCredential(ctx, userId); // ← userId straight from the query string
```

`getGoogleCredential` → `getGoogleCredentialFromSupabase(userId)`
(`src/server/services/supabase-credential.ts:23-46`) filters **only** on `user_id`, via
`supabaseAdmin()` — which bypasses RLS by design. `ctx.tenantId` is accepted and never used on that
path. The endpoint's own docstring identifies the exact risk ("a bare tenant-ctx is NOT sufficient…
which would expose every user's refresh token via ?userId=") and then exempts the gateway branch
from the check that prevents it.

**Bypass**: any single org's gateway server token → `GET /api/gateway/google-adc?userId=<any
platform profile uuid>` → that user's decrypted Google refresh token / ADC blob, cross-org.
RLS is no mitigation here.
**Fix**: in the `isGateway` branch, assert the target `userId` is a member of `ctx.tenantId`
(`organization_members` lookup) before resolving the credential.

### S2 — Platform-wide channel-identity dump, no RBAC, any logged-in user (CRITICAL)
`src/routes/api/gateway/channel-identities/+server.ts:12-18` →
`src/server/services/channel-identity.service.ts:37-41`

```
export async function listChannelIdentities(ctx: TenantContext) {
  return ctx.db.select(channelProjection).from(userIdentities)
    .where(eq(userIdentities.kind, 'channel'));        // ← no org filter, no user filter
}
```

`user_identities` has no org column, so this returns every WhatsApp / Telegram / etc. mapping
(`userId`, `channel`, `channelUserId`, `displayName` — i.e. phone numbers) for **every user on the
platform**. The handler's only gate is `getTenantCtx(locals)`, which any authenticated member of any
org resolves; the docstring claims "server token auth or admin session", but this path is **not** in
`resolve-identity.ts`'s `isServerTokenPath` allowlist, so that claim is dead code.
**Fix**: `requireAdmin` (matches the stated intent) and scope the query to the caller's org.

### S3 — `query/custom-tools` hands out tool source + env vars with zero capability check (HIGH)
`src/routes/api/gateway/query/custom-tools/+server.ts:43-67`

The default (published-only) branch calls `resolveAssistantPrincipal` and nothing else; the
`tools:view` check at :44 fires **only** for `?status=all|draft`. It then serializes
`scriptCode` (:65) and `envVars` (:66) — and `env_vars` is a plain, unsealed JSON key-value column
(`src/server/db/schema/builder.ts:139`), i.e. wherever a tool author put an API key. The human read
of the same rows, `src/routes/api/builder/tools/+server.ts:10`, requires `requireOrgCapability
(locals, 'tools', 'view')` unconditionally.
**Bypass**: an agent principal with zero capabilities exfiltrates every published tool's source and
env vars.
**Fix**: move the `tools:view` check above the branch, or strip `scriptCode`/`envVars` unless
`tools:view` holds.

### S4 — CRM owner scope is never applied on the agent path (HIGH)
`crm` is one of the three `OWNER_SCOPABLE_MODULES`, and the human path applies it on essentially
every CRM read and write — 14 call sites, e.g. `(app)/crm/+page.server.ts:71`,
`(app)/crm/customers/+page.server.ts:87`, `api/crm/contacts/+server.ts:45`,
`api/crm/contacts/[id]/+server.ts:25,54,116`, `api/crm/contacts/bulk-delete/+server.ts:19`,
`api/search/+server.ts:17`. The human PATCH additionally pre-checks ownership before writing
(`api/crm/contacts/[id]/+server.ts:56-60`: `if (ownerId && !(await getContact(ctx, id, ownerId, true))) throw error(404)`).

No agent endpoint applies it:
- `actions/contact-update/+server.ts:50` — `crm:edit` only → edit **any** contact in the org.
- `actions/contact-tag/+server.ts:25` — same.
- `search-crm-conversations/+server.ts:19-32` — `crm:view` only, then `similarConversations(ctx, vec, k)`.
- `crm-conversation-themes/+server.ts:18-29` — `crm:view` only; `conversationThemes()` **already
  accepts an `ownerId` param** and the handler simply doesn't pass it.
- `insight/+server.ts:31-46` — `rankCustomers` has no owner param at all.

**Fix**: thread `capabilities.ownerScoped('crm') ? principalId : undefined` through these five, the
way `query/tickets:30` and `query/orders:20` already do for support/sales.

### S5 — CRM field-level masking bypassed via raw conversation text (HIGH)
`src/routes/api/gateway/search-crm-conversations/+server.ts:32` →
`crm-conversation-vectors.service.ts:496-534` returns the verbatim `content` of
`crm_conversation_chunks` — customer chat text, which routinely carries phone numbers and emails.
`crm` is in `FIELD_LEVEL_MODULES` precisely for "phone numbers & email addresses", and the human
path masks them whenever the role's `field_level < 1`
(`api/crm/contacts/+server.ts:45`, `api/crm/contacts/[id]/+server.ts:26`,
`api/crm/contacts/export.csv/+server.ts:113`, `(app)/crm/[contactId]/+page.server.ts:36`).
The agent path never calls `capabilities.fieldLevel('crm')`.
Note the service comment "signature is load-bearing, do not change" — the fix must be additive
(optional 4th param), not a signature change.

### S6 — Module-enabled kill switch does not exist on the bridge (HIGH)
`isModuleEnabled` appears in **109** files under `src/routes/api/**` and in **0** of the 48 gateway
endpoints; `requireAssistantCapability` (`_shared/action-auth.ts:22-33`) never checks it.
Verified by grep over both trees.

When an org admin disables a module (or ops disables it after an incident), the human UI/API 404s —
`api/sales/orders/+server.ts:12`, `api/support/issues/+server.ts:14`, `api/stock/bins/+server.ts:13`,
`api/projects/+server.ts:29`, `api/pos/sellables/+server.ts:34`, scheduling via
`$server/auth/scheduling-read.ts:11` — while the agent keeps reading and writing the same data.
This affects both reads (`query/{bookings,orders,pos,projects,stock,tickets}`) and every `actions/*`
write. (`insight` is the one exception: its service calls `bothEnabled(ctx,'crm','finances')`.)
**Fix**: one `isModuleEnabled(ctx, module)` check inside `requireAssistantCapability`.

### S7 — Three server-token endpoints are reachable by any authenticated org member (HIGH)
These are documented as gateway-only but gate on `locals.tenantCtx` alone, which any logged-in
member of any role resolves. `apiWriteCapability` returns `null` for all three (no matching prefix),
so the central write guard does not fire either.

| Endpoint | Line | Effect for a `viewer` with zero business RBAC |
|---|---|---|
| `api/agent-memories/recall/+server.ts` | :16-47 | Semantic read of the org's whole agent-memory corpus for **any** `agentId` in the org — i.e. another user's personal-agent memories, which can hold CRM/finance content. |
| `api/agent-memories/delete/+server.ts` | :12-28 | **Deletes** another user's agent memory rows. |
| `api/messages/ingest/+server.ts` | :13-25 | Writes arbitrary rows into the org's message ledger + applies routing patches; `serverId` is read but optional (`serverId ?? null`). |

`rbac.service.ts:1095` explicitly exempts `/api/messages/ingest` from the write guard *because* it
is "the gateway's server-token ingest path" — but nothing enforces that it is one.
**Fix**: `if (!locals.serverId) throw error(401)` in all three, and bind `agentId` to the caller.

### S8 — `insight` widens finance access with an OR (MEDIUM)
`src/routes/api/gateway/insight/+server.ts:33`:
`if (!capabilities.can('crm','view') && !capabilities.can('finance','view'))` — holding **either**
passes, and the response then includes per-customer `revenue` and `top_product`
(`crm-finance.service.ts:367-377`). So a `crm:view`-only role reads revenue it cannot see in
/finances, and a `finance:view`-only role reads the CRM customer roster it cannot see in /crm.
No `fieldLevel('finance')` check (cf. `query/finance:22`, which does it correctly).
**Fix**: require both for a joined CRM×finance read, or split the intents and gate each.

### S9 — Audit-actor and workflow gaps on agent writes (MEDIUM)
Reported by the actions sweep; `agentActor()` produces the `"<name> (via agent)"` stamp.
- No actor stamp (falls back to a raw profile id, indistinguishable from a human session):
  `booking-cancel:30`, `booking-reschedule:248`, `booking-create`, `booking-complete:93` (status
  flip), `contact-tag:313,319`, `contact-update:419`.
- `statusChangeBlocked(...)` — the org-configured approval workflow the human handlers enforce
  (`api/sales/orders/[id]/+server.ts:19`, `api/support/issues/[id]/+server.ts:36`) — is **not**
  called by `actions/order-update-status` or `actions/ticket-update`, so a configured workflow is
  bypassed entirely through the agent.

### S10 — `/api/gateway/pages` is unauthenticated (LOW, but note the parity break)
`src/routes/api/gateway/pages/+server.ts:14` — no principal, no RBAC, by design ("static,
non-sensitive route metadata"). It is anonymously reachable (`/api/gateway` is in
`API_HANDLER_AUTH_PATHS`, `/api/` is in `UNPROTECTED_PREFIXES`). Content is route metadata only, so
the data exposure is the internal route surface rather than org data. The parity break matters more:
the **in-app** assistant sees `visiblePages(canViewPath)` (RBAC-filtered), while the **channel**
agent gets the unfiltered map and can deep-link a user to pages their role 404s on.

---

## Over-restriction findings

### O1 — `pos-sale` asks `pos:edit`; the till asks `pos:create` (the real one)
`actions/pos-sale/+server.ts:53` requires `pos:edit`. The human equivalent,
`POST /api/pos/tickets`, requires `pos:create` (`api/pos/tickets/+server.ts:73`; `/api/pos/tickets`
is in `CREATE_COLLECTION_ENDPOINTS`, and `pos:manage` is a *separate* gate at :78 for
`allowNegativeStock` only — the agent never passes that flag, so that gate is not bypassed).
A cashier role scoped to `pos:create` without `edit` rings sales at the till and gets a 403 from the
agent for the identical action. `rbac.service.ts:1158` documents exactly this role shape as the
FACES norm.
**Fix**: change the agent gate to `pos:create` (and keep a `manage` check if negative stock is ever
added to the agent payload).

### O2 — Coverage gap: 11 of 23 modules have no bridge at all
The bridge exposes `crm, finance, sales, scheduling, support, projects, stock, pos, comms, brains,
tools`. It exposes **nothing** for `memberships, ads, pulse (read), users, settings, agents,
channels, flows, marketplace, reliability, workspace, overview`. Against "the agent can do anything
the user's RBAC allows" this is the biggest shortfall by volume — a user with `memberships:edit` or
`ads:view` simply has no agent surface. Not a capability mismatch; a missing-endpoint gap.

### O3 — The advertised `crm_query` tool is dead
`src/lib/state/features/assistant-context.ts:114` tells the model it has `crm_query` "for any other
sorting/grouping/date-range/percentage question". `src/routes/api/gateway/query/+server.ts:10`
returns **503 `ASSISTANT_SQL_DISABLED`** unconditionally (arbitrary-SQL analytics was retired, which
is the right call). The prompt contract and the endpoint disagree — the agent will promise analytics
it cannot deliver.
**Fix**: drop `crm_query` from the envelope, or point it at the typed `query/*` endpoints.

### O4 — Forms are offered on *view*, not on *write*
`src/lib/state/features/assistant-context.ts:133`:
`FORM_CATALOG.filter((f) => canViewPath(f.route))`. A user with `stock:view` but not `stock:create`
is offered the stock-entry form, the agent navigates and fills it, and Submit 403s at the central
write guard. `canAct(module, action)` already exists (`src/lib/access/can.svelte.ts:43`) for exactly
this.
**Fix**: filter the catalog by `canAct` on the form's write action as well.

### O5 — `query/email-ledger` uses a different module key than its human surface
`query/email-ledger:14` requires `comms:view`; the human Gmail page gates on `channels:view`
(`(app)/channels/gmail/+page.server.ts:31`). Agent-stricter or looser depending on the role; mostly
an inconsistency to reconcile.

---

## Principal resolution, token lifetime, replay, secret leak

`src/server/auth/assistant-principal.ts` — read in full. What it gets right:

- Org is **never** taken from the request as authority. `requestedOrg` (`?orgId=`) only narrows or
  rejects (`:66-72`, `:175-182`, `:188`), and the gateway branch requires it to equal the gateway's
  own org. Pinned by `assistant-principal.test.ts:175,282,316`.
- Browser callers are self-or-admin only (`:243`), checked **before** any membership lookup
  (`test:259,266,309`).
- The gateway assignment is re-read per request (`:113-170`): the ambiguous `legacy_server_id` is
  resolved first so an alias cannot disambiguate a credential, the match is equality (never `ILIKE`),
  and `provisioning_status` must be `active`. Pinned by `test:111,139,192`.
- Identity-lookup failures return 503 and never grant authority (`readIdentity`, `test:218,234`).
- The brain-agent escalation path is **blocked**: `brainAgentCapabilities()` (`:39-48`) hardcodes
  `brains:view+edit` independent of the human's RBAC, but `resolveGatewayPrincipal` rejects every
  `brain-*` agentId (`:104-110`, with the `TODO(handoff)` naming the missing persisted binding), and
  the browser path requires `locals.user.supabaseId === agentId` — satisfiable in practice only by a
  platform admin. Pinned by `test:288,302,309,316,326`. **When that TODO is resolved, the new binding
  must re-derive capabilities from the owning human's `brains` RBAC rather than hand out the
  hardcoded set**, or the file's "the agent can never do more than the user" invariant breaks.

What it does not have:

- **The gateway server token is an org-wide user-impersonation credential.** There is no forwarded
  user credential on the assistant bridge: the gateway sends only `?agentId=`, and
  `resolveGatewayPrincipal` resolves that to the agent's **owning profile** and returns that human's
  full capability set. So a leaked token for org X yields, for any agent on that gateway, the union
  of every personal-agent owner's authority in X — including the owner's. Tokens are encrypted at
  rest (`gateway.token_ciphertext`) with **no expiry, no rotation, and no per-request binding**, and
  successful resolutions are memoised for 60s (`resolve-identity.ts:78`, `SERVER_TOKEN_TTL_MS`), so
  revocation lags by up to a minute. There is no nonce or timestamp, so replay of a captured request
  is unbounded.
  The codebase already has the better pattern one directory over:
  `api/internal/workshop/saves/[id]/authority/+server.ts:9-20` requires a machine credential **and**
  a forwarded signed user JWT (`x-minion-user-jwt`), validated independently of cookies. Applying
  that to the bridge would convert a token leak from "full org compromise" to "needs a live user
  token too".
- **Org selection ignores the user's active org.** `resolveMemberPrincipal` (`:184-200`) with no
  `requestedOrg` picks `rows[0]` of `organization_members` — an arbitrary org for a multi-org user,
  while the UI acts on `locals.tenantCtx.tenantId` (the `active_org` cookie). Not an escalation (the
  user is a member of both), but the agent can read and write the *wrong* org. Fix: default
  `requestedOrg` to `locals.tenantCtx?.tenantId` on the browser path.
- `/api/gateway/jwt` (`:9-26`) is cookie-authenticated, requires a canonical membership re-check at
  issuance (`gateway-jwt.service.ts:139`), and mints a 1h EdDSA JWT with a `jti`. Scope is the
  caller's own active org and their own agent ids. `/api/gateway/lease` (`:22-47`) is `requireAuth`
  + the caller's active org and returns no token. Neither can mint for another user or org. Both OK.

---

## Guard-wiring notes (human path)

- Central write guard: `hooks.server.ts:438-447` → `apiWriteCapability(path, method)` +
  `hasAnyCapability`. **Writes only.** Human GETs are not centrally gated; page view access comes
  from `applyRouteAccessGuard` (`:250-275`) via `decideRouteAccess` + `loadPermissionsForUser`.
  So "agent read endpoint vs human read API" comparisons must go through the *page*, not the API.
- Server-token requests never reach `finishApp` at all: `resolveViaMetricsBearer` returns
  `bypassGate: true` (`resolve-identity.ts:296-307`), so for the entire bridge the handler is the
  **only** guard. That is why S3/S6/S7 land where they do.
- `apiWriteCapability`'s default is `edit` for any POST not in `CREATE_COLLECTION_ENDPOINTS`
  (which holds only `/api/builder/{agents,skills,tools}`, `/api/crm/parties`,
  `/api/pos/{plans,tickets,appointments}`). This is the root of most create/edit skew below.
- `callerRankCap` / `assertMayGrantRank` (`rbac.service.ts:737-769`) correctly prevent an org admin
  from cloning or granting `owner`, and fail closed on a missing caller id. No issue found.

---

## Parity table

Rows marked † I verified directly; the rest are from the endpoint sweeps and are consistent with the
guards I read in `_shared/action-auth.ts` and `rbac.service.ts`.

### Reads — `query/*` and analytics

| Agent endpoint | Agent cap | Human surface | Human cap | Verdict | Owner | Mask | Mod-enabled |
|---|---|---|---|---|---|---|---|
| `query/` (root) † | — (503 disabled) | — (SQL analytics retired) | — | MATCH | n/a | n/a | n/a |
| `query/bookings` | `scheduling:view` | `(app)/scheduling/bookings` + `api/scheduling/bookings` | `scheduling:view` | **LOOSER** (S6) | n/a | ✅ `fieldLevel` | ❌ |
| `query/custom-tools` † | **none** (published); `tools:view` for drafts | `api/builder/tools:10` | `tools:view` | **LOOSER (S3)** | n/a | n/a (secrets raw) | n/a |
| `query/email-ledger` † | `comms:view` | `(app)/channels/gmail` | `channels:view` | key mismatch (O5) | n/a | n/a | — |
| `query/finance` † | `finance:view` | `(app)/finances` | `finance:view` | MATCH | n/a | ✅ `fieldLevel` | — |
| `query/notes` † | none (principal-scoped) | self-scoped notes | none | MATCH | n/a (userId) | n/a | n/a |
| `query/orders` † | `sales:view` | `(app)/sales` + `api/sales/orders` | `sales:view` | **LOOSER** (S6) | ✅ `ownerScoped` | n/a | ❌ |
| `query/pos` | `pos:view` | `api/pos/*` | `pos:view` | **LOOSER** (S6) | n/a | ❌ no `finance` mask | ❌ |
| `query/projects` | `projects:view` | `(app)/workforce/projects` | `projects:view` | **LOOSER** (S6) | n/a | n/a | ❌ |
| `query/sdk-catalog` | `tools:view` | `api/builder/tools/schema-catalog` | `tools:view` | MATCH | n/a | n/a | n/a |
| `query/stock` | `stock:view` | `api/stock/*` | `stock:view` | **LOOSER** (S6) | n/a | n/a | ❌ |
| `query/tickets` † | `support:view` | `(app)/support` + `api/support/issues` | `support:view` | **LOOSER** (S6) | ✅ `ownerScoped` | n/a | ❌ |
| `query/tool-permissions` † | none (it *is* the cap read) | — | — | MATCH by design | n/a | n/a | n/a |
| `insight` † | `crm:view` **OR** `finance:view` | `(app)/crm/customers`, `(app)/finances` | `crm:view` / `finance:view` | **LOOSER (S8)** | ❌ (S4) | ❌ | ✅ (service) |
| `search-crm-conversations` † | `crm:view` | `(app)/crm/insights:37` | `crm:view` + owner | **LOOSER (S4,S5)** | ❌ | ❌ raw `content` | — |
| `crm-conversation-themes` † | `crm:view` | `(app)/crm/insights:37` | `crm:view` + owner | **LOOSER (S4)** | ❌ (param exists, unused) | n/a (aggregate) | — |
| `brains`, `brain-search` | `brains:view` + per-brain ACL | hub brains UI | same services | MATCH | n/a | n/a | — |
| `pages` † | **none (anonymous)** | in-app `visiblePages(canViewPath)` | per-route RBAC | **NO-RBAC (S10)** | n/a | n/a | n/a |

### Writes — `actions/*` and ingest

| Agent endpoint | Agent cap | Human path | Human cap | Verdict | Actor | Owner |
|---|---|---|---|---|---|---|
| `actions/booking-create` | `scheduling:create` | `POST /api/scheduling/bookings` | `scheduling:edit` | **LOOSER** | ❌ | n/a |
| `actions/booking-cancel` | `scheduling:edit` | `PATCH …/bookings/:id` | `scheduling:edit` | MATCH | ❌ | n/a |
| `actions/booking-complete` | `scheduling:edit` | `POST …/:id/complete` | `scheduling:edit` | MATCH | partial | n/a |
| `actions/booking-reschedule` | `scheduling:edit` | `rescheduleBooking` | `scheduling:edit` | MATCH (impl. bug, see below) | ❌ | n/a |
| `actions/contact-update` † | `crm:edit` | `PATCH /api/crm/contacts/[id]` | `crm:edit` + owner pre-check | **LOOSER (S4)** | ❌ | ❌ |
| `actions/contact-tag` | `crm:edit` (add **and** remove) | `POST`/`DELETE …/tags` | `crm:edit` / `crm:delete` | **LOOSER** (remove) | ❌ | ❌ |
| `actions/note-create` | none (personal) | personal notes | none | MATCH | n/a | n/a |
| `actions/notify-user` | `comms:create` + fresh membership | — | — | agent-only | n/a | n/a |
| `actions/order-update-status` | `sales:edit` | `PATCH /api/sales/orders/:id` | `sales:edit` | MATCH cap; **workflow bypass (S9)** | ✅ | — |
| `actions/pos-sale` † | `pos:edit` | `POST /api/pos/tickets:73` | `pos:create` | **AGENT-STRICTER (O1)** | ✅ | n/a |
| `actions/stock-entry-create` | `stock:create` | `POST /api/stock/entries` | `stock:edit` | **LOOSER** | ✅ | n/a |
| `actions/stock-issue-from-invoice` | `stock:create` | `POST …/from-invoice` | `stock:edit` | **LOOSER** | ✅ | n/a |
| `actions/stock-issue-from-service` | `stock:create` | — | — | agent-only | ✅ | n/a |
| `actions/task-create` | `projects:create` | `POST /api/projects/:id/tasks` | `projects:edit` | **LOOSER** | ✅ | n/a |
| `actions/task-update` | `projects:edit` | `PATCH /api/project-tasks/:id` | `projects:edit` | MATCH | ✅ | n/a |
| `actions/ticket-create` | `support:create` | `POST /api/support/issues` | `support:edit` | **LOOSER** | tag only | n/a |
| `actions/ticket-update` | `support:edit` | `PATCH /api/support/issues/:id` | `support:edit` | MATCH cap; **workflow bypass (S9)** | ✅ | — |
| `actions/ticket-comment` | `support:edit` | activity.service | `support:edit` | MATCH | ✅ | n/a |
| `actions/tool-save` | `tools:manage` | `POST`/`PUT /api/builder/tools(/:id)` | `tools:create`/`edit` **and** `tools:manage` | **LOOSER** | n/a | n/a |
| `brain-remember` | `brains:edit` + per-brain | hub brains UI | same service | MATCH | — | n/a |
| `email-ledger` (write) | `serverId` only; org from mailbox lookup | — | — | MATCH by design | n/a | n/a |
| `pulse/proposals` | `serverId` + org equality | — | — | MATCH by design | n/a | n/a |
| `update`, `fleet-update` | `requireAdmin` (+ tenantCtx) | platform op | admin | MATCH by design | n/a | n/a |
| `api/agent-memories/recall` † | **`tenantCtx` only** | — | — | **NO-RBAC (S7)** | n/a | n/a |
| `api/agent-memories/delete` † | **`tenantCtx` only** | — | — | **NO-RBAC (S7)** | n/a | n/a |
| `api/messages/ingest` † | **`tenantCtx` only** | — | — | **NO-RBAC (S7)** | n/a | n/a |

Org scoping on the `query/*` and `actions/*` families was checked per-service: every one threads
`ctx.tenantId` (from the trusted principal, never from the body) into its SQL, via `withOrgCore`
or an explicit `org_id = ctx.tenantId` predicate. No cross-org IDOR was found in those two families.
The cross-org defects are S1 and S2, both outside them (they use `supabaseAdmin()`, which bypasses
RLS, so RLS is not a backstop there).

Non-RBAC bug noticed in passing: `actions/booking-reschedule/+server.ts:192-198` claims
"SERVICE GAP: scheduling-bookings.service has no updateBookingTime" and does cancel-old +
create-new. `rescheduleBooking(ctx, id, input)` does exist (`scheduling-bookings.service.ts:1335`)
and moves in place atomically. The current two-call sequence changes the booking id on every
reschedule, is non-atomic, and silently reuses `bypassRules: true`.

---

## In-app (browser) assistant — method step 4

These tools run in the user's browser under their own session, so they inherit UI RBAC and the
central write guard. Verified:

- `hub.navigate` (`global-tools.ts:39`) and `hub.pages` (`:79`) both resolve against
  `visiblePages(canViewPath)`, and `resolvePath` (`site-map.ts:112-134`) accepts only an exact match
  in that filtered set, or a `[param]` child of a visible parent under `DYNAMIC_PARENTS` with a
  `/^[\w-]+$/` segment. It rejects `//` and `\`. No off-origin or ungated path reachable. ✅
- Forms **only fill**; `registerForm` (`forms.ts:103`) writes into the page's own `$state` and the
  user presses Submit, which goes through the ordinary human API and the central write guard. The
  assistant never submits. ✅
- Page/form context is RBAC-filtered before it reaches the model
  (`assistant-context.ts:132-133`). ✅ — but only by **view** (see O4).
- `runner.ts` executes `minion-ui` blocks only for live `final` chat events, not history reloads, so
  a replayed transcript cannot re-navigate or re-fill. ✅

So the in-app path is the *correct* model: it has no privileged path of its own. The gateway bridge
is where parity breaks.

---

## Suggested order of work

1. **S1, S2** — cross-org credential and PII leaks; both are a few lines and neither has an RLS backstop.
2. **S7** — three endpoints need `if (!locals.serverId) throw error(401)`.
3. **S3** — move one check above a branch.
4. **S6** — one `isModuleEnabled` call inside `requireAssistantCapability` closes it for all 48.
5. **S4, S5** — give the agent path an owner/mask helper that takes `Capabilities` instead of
   `App.Locals` (the pattern already exists at `query/tickets:30` and `query/finance:22`); then use
   it on the five CRM endpoints.
6. **O1 + the five create/edit skews** — decide per operation whether `create` or `edit` is the bar
   and make `apiWriteCapability` and the gateway handler agree. A test that asserts, for every
   `actions/*` endpoint, that its required capability equals `apiWriteCapability(<human path>, <method>)`
   would prevent the whole class from recurring.
7. **S8, S9, O3, O4, O5**, then **O2** (coverage).

---

## What was not checked

- No live/production verification of any finding — everything is static code reading. In particular
  S1 and S2 were not exercised against a running instance.
- `pg_policies` was not queried, so RLS enforcement is inferred from `withOrgCore` usage rather than
  confirmed at the database.
- Svelte-layer masking behavior (only server-side `shouldMaskSensitive` call sites were traced).
- Whether any tenant has actually configured a `create ≠ edit` role split in production, which is
  what makes the create/edit skews exploitable rather than theoretical.
- The gateway repo's own tool definitions (which agent tool maps to which bridge endpoint) — O3 is
  inferred from the hub-side prompt envelope and the 503 endpoint.
- `bun run test` in full was not run, by instruction.
