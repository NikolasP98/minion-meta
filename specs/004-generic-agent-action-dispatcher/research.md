# Phase 0 research — Generic Agent Action Dispatcher

**Date**: 2026-10-15 · Read-only investigation of hub `origin/master` `7d917ed06`, gateway `origin/DEV` `39be924dcd6`, and `@sveltejs/kit` 2.70.2 runtime source.

---

## R1 — How does the dispatcher exercise an existing hub route? (spec Clarification Q3; the only true technical unknown)

**Decision: `event.fetch(<relative hub path>)` from inside the dispatch handler, with the resolved principal carried on an `AsyncLocalStorage` scope that `resolveIdentity` reads.**

**Rationale**

1. SvelteKit's server `fetch` short-circuits same-origin relative requests into `internal_fetch`, which calls `respond(request, options, manifest, {...state, depth: state.depth + 1})` — the **full** server pipeline, including `hooks.server.ts` (`node_modules/@sveltejs/kit/src/runtime/server/fetch.js:204-236`). So the dispatched request runs `applyModuleAvailabilityGuard`, `applyRouteAccessGuard`, the central `apiWriteCapability` write guard (`src/hooks.server.ts:430-447`) and the route's own in-route `requireOrgCapability` call — all four of the human path's checks — with **no code copied per route**. This is what makes T2/T4 free rather than 193 re-implementations.
2. In-process: no second Vercel function invocation, no network hop, no self-URL to configure, and no new externally reachable entry point.
3. The inner request has no cookies (the gateway authenticates with a Bearer server token), so the inner `resolveIdentity` would otherwise resolve the *gateway* identity. The principal must therefore be handed across the call. `AsyncLocalStorage` is already the house pattern for exactly this: `src/server/ai-usage.ts:1-12` ("the org rides an AsyncLocalStorage scope instead — the same pattern already…") and `src/lib/server/performance-context.ts:1-20`. The store is per async context, so it cannot leak into a concurrent unrelated request, and — unlike a header — it cannot be forged from outside the process at all.

**Alternatives considered**

| Alternative | Rejected because |
|---|---|
| Real HTTP self-fetch to the deployment origin with a signed principal header | Adds a second serverless invocation per write (latency + cost against SC-009), needs an origin URL that differs per preview deployment, and creates a genuinely externally-reachable principal-assumption header whose only defence is a secret. The `/api/internal/*` Bearer precedent (`api/internal/flows/[id]/+server.ts:11`) shows the shape, but it is strictly more attack surface than ALS for the same result. |
| Import each route's `POST`/`PATCH` handler and call it with a hand-built `RequestEvent` | Reintroduces the per-route artifact this feature exists to delete, and hand-built `locals` silently skip the hooks chain — the precise failure mode `E-rbac-parity.md` documents for the current bridge. |
| Call the underlying services directly, mapping manifest rows to service functions | Same per-route cost as today, and loses every guard that lives in the route rather than the service. |
| SvelteKit `app.render()` / adapter `Server` | Not reachable from inside a route handler; also re-enters the whole adapter, not just the pipeline. |

**Risks / things to prove in the slice**

- A header-free principal handoff means the dispatch handler must set the scope and `await` inside it; any accidental escape (a queued microtask resolved outside the scope) silently drops to the gateway identity. Proof: a test that asserts the inner request's `locals.user.supabaseId` equals the principal, plus one that asserts an inner request made **outside** the scope is refused.
- `resolveIdentity` gains a branch. It must be the *first* check and must still produce `bypassGate: false`, or the guards it is there to run get skipped. Pinned test required.
- `event.fetch` requires the dispatch handler to receive `event` — fine, it is a `+server.ts`.
- **Do not** add a per-route `export const config`. A per-route config export makes `adapter-vercel` split functions and 404'd every locale page for ~11 h on 2026-10-11 (`hub-prod-404-login-outage-2026-10-11`); hub-wide `maxDuration: 300` already applies (`svelte.config.js:38`).
- `internal_fetch` increments `state.depth`; SvelteKit caps recursion. A route that itself dispatches would recurse — the manifest must exclude `/api/gateway/*`.

---

## R2 — Where does the manifest's domain come from, and how large is it?

**Decision: the manifest's domain is exactly the `(route, method)` pairs for which `apiWriteCapability` returns non-null. Measured, not assumed.**

Method (rerunnable): walk `hub src/routes/api/**/+server.ts`, collect exported `POST|PUT|PATCH|DELETE`, drop `api/gateway` and `api/internal`, and test each path against `API_WRITE_PREFIXES` (`src/server/services/rbac.service.ts:1111-1147`).

| Measure | Count |
|---|---|
| Write `(route, method)` pairs outside gateway/internal | **364** |
| Capability-mapped (dispatchable ceiling) | **193** |
| Unmapped (refused — FR-003) | **171** |

Largest unmapped families: `/api/servers` 38, `/api/users` 14, `/api/notes` 9, `/api/workshop` 8, `/api/flows` 7, `/api/tables` 7, `/api/artifacts` 5, `/api/attachments` 5, `/api/tags` 5, `/api/roles` 4.

(The audit's headline says 368; the 4-pair difference is method-extraction detail — `A-coverage-matrix.md` counted by a different regex. Both are the same order and the conclusion is unchanged.)

**Consequence**: the audit's top-10 gap #10 (team & access admin: `/api/users/[id]/member-role`, `/api/roles/*`, `/api/tags`) is **not** reachable by this feature. Gaps #1–#7 all are: `/api/pos/shifts/open|close` → `pos:edit`, `/api/pos/tickets/[id]/void` → `pos:edit`, `/api/crm/parties` POST → `crm:create` with the till alternatives, `/api/pos/appointments` POST → `pos:create`, `/api/finances/purchases` POST → `finance:edit`, `/api/stock/entries/[id]/submit` → `stock:edit`, `/api/pos/sellables` + `/api/stock/items` → `pos:edit` / `stock:edit`.

**Alternative rejected**: extending `API_WRITE_PREFIXES` to cover the 171. That edits the **human** guard, so it changes behavior for human requests on 171 pairs — a separate security change, out of scope (spec Clarification Q2).

---

## R3 — Is the dispatcher ever *looser* than the human path?

**Finding: no, by construction — and this also deletes the `create`-vs-`edit` skew class.**

Because the real route runs, both gates apply: the central guard's `apiWriteCapability` floor **and** the route's own `requireOrgCapability`. Where they differ the stricter wins. Example: the central guard maps `POST /api/pos/tickets` to `pos:create` via `CREATE_COLLECTION_ENDPOINTS`, and the handler independently requires `pos:create` (`src/routes/api/pos/tickets/+server.ts:73`). The current hand-written `actions/pos-sale` asks `pos:edit` instead and so is both stricter and wrong (`E-rbac-parity.md` O1). Dispatch cannot develop that defect.

Corollary for tasks: the parity test the audit recommends ("each `actions/*` capability equals `apiWriteCapability(<human path>, <method>)`") becomes unnecessary for dispatched routes and stays useful only for the remaining dedicated actions.

---

## R4 — Owner-gated questions (the 3 `[NEEDS CLARIFICATION]` markers). Not resolvable by research.

| Marker | Options | Recommendation |
|---|---|---|
| Credential model: does the gateway server token stay the only credential? | (a) keep as-is; (b) require a forwarded short-lived signed user JWT like `api/internal/workshop/saves/[id]/authority:9-20`; (c) ship (a) and add (b) as a follow-up slice | **(b) before general availability, (a) acceptable for a manifest limited to the P1 routes.** Today a leaked token is org-wide impersonation with no expiry, rotation or nonce (`E-rbac-parity.md`); this feature multiplies its reach ~10×. Owner decides; it materially changes size. |
| Per-turn write ceiling | (a) none; (b) a count per turn; (c) a narrower ceiling for money-affecting manifest rows | **(c)**, reusing the manifest's `destructive` flag — cheapest guard that addresses the real risk (a model loop issuing refunds). |
| Principled exclusions inside the capability map | org-config (`/api/modules`, `/api/plugins` → `settings:manage`), builder (`/api/builder/*`), `/api/pulse`, `/api/gateway/*` (recursion) | **Exclude all four.** Builder especially: a `tools:manage` holder can publish a script that runs unsandboxed on the gateway host (`A-coverage-matrix.md` §4.4), so agent-authored builder writes are an RBAC-escaping path. |

---

## R5 — Does the dispatcher need `isModuleEnabled`, owner scope and masking of its own?

**Decision: no new code for any of the three.** They are not blocked by `App.Locals` as `E-rbac-parity.md` suggests — `isModuleEnabled(ctx, moduleId)` already takes a `CoreCtx` (`src/server/services/modules.service.ts:26`), and `ownerFilter`/`shouldMaskSensitive` are thin `App.Locals` wrappers over `Capabilities.ownerScoped` / `.fieldLevel` (`rbac.service.ts:432-474`). But because dispatch runs the real route with a real `locals`, the existing `App.Locals` call sites inside those routes fire unchanged. This is the single largest piece of work the chosen mechanism avoids.

Note for the ledger: this does **not** fix the 48 existing hand-written bridge endpoints (`E-S4/S5/S6`). Those stay broken until slice S2. Dispatch simply never joins them.

---

## R6 — How does the gateway tool stay deploy-free? (FR-018, FR-021, SC-003)

**Decision: one gateway write tool with a free-form body plus a hub-served manifest, discovered through the existing catalog read.**

- The hub serves the manifest (hash + rows). The gateway tool's `parameters` are `{route, method, body, confirm}` — fixed, so adding a hub row needs no gateway change (`SC-003`).
- 193 rows of descriptions cannot ride in every turn's tool schema (token cost). The gateway already has a search-then-call shape: `query/sdk-catalog` returns "tables + the query/actions inventory" and `sdk_inspect` reads it. **Extend that**, rather than adding a second catalog tool.
- `CONFIRM_FIELD` (`gateway src/agents/tools/hub/hub-common.ts:20-23`) and `hubPost` are reused verbatim; the new tool is ~40 lines in the shape of `module-action-tool.ts` minus the allowlist.
- `hubPost` only ever POSTs to `/api/gateway/<path>`, so the dispatch endpoint must be a POST whose body names the target method — which is what the feature description already specifies. No change to `hub-common.ts`.

**Alternative rejected**: generating a gateway tool per manifest row at bootstrap (what `custom-tools.ts` does for custom tools). It would give the model better schemas, but 193 tools blow up `tools/list` and the L2 shortlister, and the registry's `TOOL_ORDER` invariant (gateway #329) would need per-row entries.

---

## R7 — `FormBinding.submit` (FR-023…025)

**Decision: add an optional `submit?: () => Promise<{ok: boolean; message?: string; recordId?: string}>` to `FormBinding`; `registerForm` registers `submit_<formId>` only when the binding provides one and the user holds the form's write capability.**

- Optional keeps all 8 existing `registerForm` call sites compiling; each page opts in by passing its existing submit handler. 8 small page edits, no new abstraction.
- The catalog filter moves from `canViewPath(f.route)` to `canViewPath(...) && canAct(module, action)` using the existing `src/lib/access/can.svelte.ts:43` — closes `E-O4` in the same line.
- `FormDef` needs the write capability it requires (one field per catalog entry, 8 rows), since a route path does not imply a write action.
- No privilege is added: the submit calls the page's own handler in the user's session, so the central write guard still runs (`E-rbac-parity.md`: "the in-app path is the *correct* model").

---

## R8 — Blocking dependency, stated plainly

Every gateway→hub tool call returns 403 `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` today: 11 of 11 `personal_agents` rows have `gateway_id NULL` (synthesis L1). **Nothing in this feature is observable through a channel agent until slice S0 lands.** The in-app form half (User Story 4) is independent of S0 and can be proven without it. Sequencing consequence recorded in `plan.md` and `tasks.md`.
