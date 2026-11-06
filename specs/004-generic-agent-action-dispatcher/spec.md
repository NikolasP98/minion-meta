# Feature Specification: Generic Agent Action Dispatcher

**Feature Branch**: `004-generic-agent-action-dispatcher` *(spec directory; the implementation branches are per-subproject — `minion_hub` off `master`, `minion` off `DEV`, per `node scripts/repo-policy.mjs show hub|minion`)*

**Created**: 2026-10-15

**Status**: Draft — **security-tagged**, owner approval required before any code (Constitution V; proposal `2026-10-15-agent-harness-restoration.md` open question 2)

**Input**: User description: "Let the agent reach any hub write the user is allowed to perform, without a hand-written endpoint+tool pair per action. … Deliver: one hub `POST /api/gateway/actions/dispatch {route, method, body}` that resolves the assistant principal, defers to `apiWriteCapability` (+ module-enabled, owner scope, audit actor), and performs an internal request; one gateway `hub_action` tool driven by a route manifest … and `FormBinding.submit` so the in-app assistant can complete the 8 forms it can currently only fill."

**Source**: audit `audits/2026-10-15-agent-harness/` (A, E, 00-synthesis §1 and §6 S3); proposal `proposals/2026-10-15-agent-harness-restoration.md` slice S3.

---

## AS-IS → TO-BE → DELTA *(Constitution Principle II)*

### AS-IS (measured 2026-10-15; hub `origin/master` `7d917ed06`, gateway `origin/DEV` `39be924dcd6`)

| # | Observable today | Evidence |
|---|---|---|
| A1 | The agent can perform **~20** of the hub's write operations. Everything else is unreachable by the agent even when the user's role permits it. | `audits/2026-10-15-agent-harness/A-coverage-matrix.md` headline; 19 `src/routes/api/gateway/actions/*/+server.ts` + `gateway/brain-remember` |
| A2 | **364** human write `(route, method)` pairs exist outside `/api/gateway` and `/api/internal`. | measured: walk `hub src/routes/api/**/+server.ts`, collect exported `POST\|PUT\|PATCH\|DELETE`, exclude `api/gateway` + `api/internal` → 364 pairs |
| A3 | **193** of those 364 (53%) already resolve to a capability through `apiWriteCapability`; **171** return `null` (no prefix row), the largest families being `/api/servers` (38), `/api/users` (14), `/api/notes` (9), `/api/workshop` (8), `/api/flows` (7), `/api/tables` (7), `/api/tags` (5), `/api/roles` (4). | same script, replaying `API_WRITE_PREFIXES` from hub `src/server/services/rbac.service.ts:1111-1147` |
| A4 | **11 of 22** RBAC modules have no agent path at all. | `A-coverage-matrix.md` Table 1; `rbac.service.ts:40` module list |
| A5 | A new agent action costs 3–4 hand-written artifacts across two repos plus two deploys: a hub `actions/<id>/+server.ts` with its own zod schema and `requireAssistantCapability` call, a gateway `*-tool.ts`, a `*-tool.meta.ts`, codegen into `_registry.generated.ts`, and often a string in the 17-entry allowlist. | `A-coverage-matrix.md` §5.1; gateway `src/agents/tools/hub/module-action-tool.ts:9-27` |
| A6 | `module_action` is **not** a dispatcher: it validates against a compiled-in 17-string list and can reach nothing outside it. | gateway `module-action-tool.ts:9-27,58-61` |
| A7 | The agent write path enforces **one** of the human path's four checks. `requireAssistantCapability` calls `capabilities.can(...)` and returns. | hub `src/routes/api/gateway/_shared/action-auth.ts:22-33` |
| A8 | The other three are absent from all 48 bridge endpoints: `isModuleEnabled` appears in 109 human API files and 0 gateway ones; owner scope is applied at 14 human CRM call sites and 0 agent ones; field masking at 4+ human CRM sites and 0 agent ones. | `E-rbac-parity.md` S4, S5, S6 |
| A9 | 6 agent writes carry no `agentActor()` stamp, so they are indistinguishable from a human session in the audit trail; `statusChangeBlocked` (the org-configured approval workflow) is skipped by `order-update-status` and `ticket-update`. | `E-rbac-parity.md` S9 |
| A10 | The in-app assistant has 8 forms and can fill all 8 and submit **0**. `FormBinding` exposes `get`/`set` only; `registerForm` registers `fill_<id>` and its own description says "Only fills — the user reviews and submits". | hub `src/lib/assistant/forms.ts:53-62,94-120`; `catalog.ts:360` |
| A11 | The form catalog is offered on **view** access (`canViewPath`), so a user with `stock:view` and no `stock:create` is offered a form whose submit 403s. | `E-rbac-parity.md` O4; `src/lib/state/features/assistant-context.ts:133` |
| A12 | There is no in-process route dispatcher anywhere in the hub. `/api/internal/*` routes are reached by real HTTP from the flows-runner and the gateway with a Bearer token. | `hub src/routes/api/internal/**` (4 families, all Bearer); no `app.render`/handler-import pattern found |

### TO-BE (desired observable behavior + invariants)

| # | Observable after | Invariant |
|---|---|---|
| T1 | For any hub write route listed in a **dispatch manifest**, the agent can perform it with no new gateway code and no gateway deploy. | The gateway holds no per-route knowledge; it reads the manifest from the hub at runtime. |
| T2 | A dispatched write is accepted **iff** the same request from the same human in the hub UI would be accepted. | Equal-or-stricter: never looser than the human path, and never stricter either (no agent-only `edit`-vs-`create` skew — `E-O1`). |
| T3 | A route absent from the manifest is refused with a distinct, relayable error. | Fail closed. Absence, a parse failure, or an unmapped capability all deny. |
| T4 | Module-enabled, record-level owner scope and field-level masking apply to a dispatched write exactly as they do to the human request. | Enforced once, in the shared path, not re-implemented per route. |
| T5 | Every dispatched write is attributable to the owning human **and** marked agent-driven in the audit trail. | One actor stamp, applied by the dispatcher, not by each route. |
| T6 | A new or changed hub write route cannot land without a manifest decision (listed, or explicitly excluded with a reason). | A repository gate fails on an undeclared write route. |
| T7 | The in-app assistant can complete the forms it fills, and is offered only the forms whose write the user may perform. | The browser path keeps its property of having no privileged channel: a submit goes through the ordinary human API and the central write guard. |

### DELTA (exact transitions, and the test that proves each)

| # | From → To | Proof |
|---|---|---|
| D1 | A6 → T1: add a hub dispatch endpoint that takes `{route, method, body}`; retire the 17-string allowlist in favour of one manifest-driven gateway tool. | Integration test: a route that has **no** `actions/*` file and no gateway tool (e.g. `POST /api/pos/shifts/open`) succeeds through dispatch for a `pos:edit` principal. |
| D2 | A7/A8 → T2/T4: the dispatcher resolves the assistant principal, then exercises the real human route under that principal so the existing central guards and in-route gates run unchanged. | Parity test table: for every manifest row, the dispatcher's decision equals the human decision for 4 personas (owner, module-editor, view-only, module-disabled). |
| D3 | A3 → T3: the manifest's domain is exactly the routes `apiWriteCapability` maps; the 171 unmapped pairs are **refused**, not guessed. | Unit test: a dispatch of `POST /api/users/<id>/member-role` (unmapped) returns the "not dispatchable" error, not a 500 and not a success. |
| D4 | A9 → T5: the dispatcher applies the actor stamp and the approval-workflow check for every dispatched write. | Test asserting the audit row of a dispatched write contains the "(via agent)" marker; test that a configured blocking workflow refuses a dispatched status change. |
| D5 | A2/A5 → T6: a repository gate enumerates write routes and fails on any that is neither listed nor excluded. | The gate itself: add a write route in a test fixture → gate fails; list it → gate passes. Mirrors the existing route-contract/counts convention (`src/lib/routes/route-design-contracts.test.ts:83`). |
| D6 | A10/A11 → T7: `FormBinding` gains `submit`; `registerForm` registers a submit tool for forms whose write capability the user holds; the catalog filters on that capability instead of `canViewPath`. | Component test: fill + submit completes a party create; a `stock:view`-only user is offered no stock-entry submit tool. |

---

## Clarifications

### Session 2026-10-15

- Q: Is every write route the central capability map covers dispatchable by default, or must each route be listed in a manifest? → A: Listed — deny by default *(ASSUMPTION — owner to confirm)*. A route is dispatchable only via a manifest entry, and a repository gate checks the manifest against the filesystem so a write route can be neither silently added nor silently forgotten. The model needs a per-route description to use a route correctly anyway, so the entry is both the gate and the documentation; per-operation cost falls from 3–4 artifacts in two repos plus two deploys (`A-coverage-matrix.md` §5.1) to one manifest row in one repo. The rejected alternative — open by default within the capability map — makes "what can the agent write" unanswerable.
- Q: Should the 171 write pairs the capability map does not cover be made dispatchable by extending that map? → A: No, not in this feature. Extending `API_WRITE_PREFIXES` (`rbac.service.ts:1111-1147`) changes the **human** guard for those routes too — a separate security change with its own blast radius (`/api/servers` 38 pairs, `/api/users` 14, `/api/roles` 4, `/api/tags` 5). The audit's gap #10 (team and access admin) therefore stays open after this feature. Measured: 193 covered / 171 uncovered of 364 write pairs.
- Q: Does the dispatcher re-implement each route's logic, or exercise the existing hub route under the resolved principal? → A: Exercise the existing route *(ASSUMPTION — owner to confirm)*. Re-implementing is what produced today's parity gap — "the agent bridge is a second, thinner implementation of the human path" (`E-rbac-parity.md` verdict) — and is what makes 348 gaps expensive. Running the real route is also the only way module-enabled, owner scope, masking and each route's own in-route gate apply without being re-coded 193 times. Constraint for planning: the hub has no in-process route dispatcher today (`src/routes/api/internal/**` are all real HTTP with a Bearer token), so the mechanism is a research item and must not create a second unauthenticated entry point.
- Q: Who confirms a destructive dispatched write, such as a void or refund? → A: The user, in words, before the call. The existing confirm contract (gateway `hub-common.ts:20-23`: preview on `confirm=false`, mutate only on `confirm=true`) is reused unchanged, and the manifest marks destructive entries so the agent cannot treat a void like a note. No new approval UI. *(ASSUMPTION — owner to confirm that money operations need no second factor.)*
- Q: May the in-app assistant submit a form by itself, or must the user press Submit? → A: It may submit on the user's instruction, and must report the outcome *(ASSUMPTION — owner to confirm; the alternative is today's fill plus a one-click submit)*. The submit runs in the user's own browser session through the ordinary human API and the central write guard, so it carries no privilege the user lacks (`E-rbac-parity.md`: "the in-app path is the *correct* model"). The guard that matters is capability-based tool offering (FR-024), not a review step.

**Deliberately unresolved** (3 markers, the template's maximum — each is an owner decision that changes the feature's size or blast radius, so guessing would be worse than carrying it):

- **[NEEDS CLARIFICATION: does the gateway server token stay the only credential on this path?]** The bridge carries no forwarded user credential, so a leaked gateway token is org-wide impersonation at the highest member's level, with no expiry, rotation or nonce (`E-rbac-parity.md`, "Principal resolution"). This feature multiplies what that token reaches from ~20 operations to ~193. Whether the forwarded-signed-user-JWT pattern already used at `api/internal/workshop/saves/[id]/authority:9-20` becomes a precondition is an owner decision.
- **[NEEDS CLARIFICATION: is there a per-turn or per-session ceiling on dispatched writes?]** Nothing bounds how many writes one agent turn may perform. A model loop today costs at most a handful of operations; after this feature it could cost many. Whether a ceiling (a count, or a narrower one for money-affecting operations) is required for approval is unresolved.
- **[NEEDS CLARIFICATION: which routes must be excluded on principle, independent of RBAC?]** Inside the capability map's own domain: org-config writes (`/api/modules`, `/api/plugins` → `settings:manage`), builder writes (`/api/builder/*`), and `/api/pulse`. All are capability-mapped and would otherwise be dispatchable. The audit also shows a `tools:manage` holder can already publish a script that runs unsandboxed on the gateway host (`A-coverage-matrix.md` §4.4), which argues for excluding builder writes here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Open the till through the assistant (Priority: P1)

A cashier tells the assistant "ring up two gel manicures for Karen". Today the sale fails because no POS shift is open, and the assistant has no way to open one — the single most common till blocker in the audit's top-10. After this feature the assistant opens the shift, rings the sale, and reports both, because `POST /api/pos/shifts/open` is dispatchable to anyone whose role already permits it at the till.

**Why this priority**: it is gap #1 by business value in `A-coverage-matrix.md`, it unblocks the one agent write that already exists (`pos-sale`), and it exercises the whole dispatch path end to end with no new per-route code.

**Independent Test**: with a `pos`-capable principal and no open shift, ask for the shift to be opened; verify a shift row exists, attributed to that human with the agent marker, and that a principal without the POS capability is refused with a permission message.

**Acceptance Scenarios**:

1. **Given** a user whose role permits opening a POS shift and no open shift, **When** the agent dispatches the shift-open write, **Then** a shift is opened and the response identifies the shift.
2. **Given** a user whose role cannot open a shift, **When** the agent dispatches it, **Then** the request is refused with a message naming the missing permission, and no shift is created.
3. **Given** the POS module is disabled for the org, **When** the agent dispatches the shift-open write, **Then** it is refused exactly as the hub UI refuses it.
4. **Given** the shift was opened by the agent, **When** the owner inspects the audit trail, **Then** the entry names the human and marks it agent-driven.

---

### User Story 2 — A money correction the owner can audit (Priority: P1)

The front desk asks the assistant to void a ticket and refund it in cash. Voids, refunds and tender corrections shipped for humans on 2026-10-15 and have no agent path. The assistant must restate the exact effect, get an explicit confirmation, perform it through the same route the UI uses, and leave an audit entry marked agent-driven.

**Why this priority**: the highest-frequency front-desk ask, it moves money, and it is the scenario where "the agent did something I cannot trace" would be unacceptable. It also proves the dispatcher inherits the shift/period rules the human route enforces rather than bypassing them.

**Independent Test**: dispatch a void of a known ticket; verify the refund row lands in the refunding shift (not the selling one), that the period-lock refusal still fires inside a locked period, and that an unconfirmed call previews without mutating.

**Acceptance Scenarios**:

1. **Given** a paid ticket and a user permitted to void, **When** the agent dispatches the void without confirmation, **Then** nothing is mutated and the agent receives a description of what would happen.
2. **Given** the same, **When** the agent dispatches with confirmation, **Then** the ticket is voided and the refund is recorded by the same rules the UI applies.
3. **Given** the ticket falls in a locked accounting period, **When** the agent dispatches the void, **Then** it is refused with the same reason the UI gives.

---

### User Story 3 — Create a customer, then book them (Priority: P1)

A new client writes on WhatsApp. The assistant creates the customer and books them. Today it can *update* a contact but not create one, so every new-customer sale or booking dead-ends.

**Why this priority**: gap #3, and it is the entry point of the two revenue flows (sale, booking). It also exercises the one capability rule that is not a plain module match — registering a customer is till work, so a POS- or scheduling-create role passes it even when CRM is hidden from that role.

**Independent Test**: as a role with POS create and no CRM access, dispatch a customer create and then an appointment create; verify both succeed and that a role with neither is refused on both.

**Acceptance Scenarios**:

1. **Given** a role that may create at the till but has CRM switched off, **When** the agent dispatches a customer create, **Then** it succeeds (the same alternative-capability rule the UI relies on).
2. **Given** a role with record-level ("own records only") CRM view, **When** the agent dispatches an update of a contact owned by someone else, **Then** it is refused — matching the human pre-check.
3. **Given** a role with masked CRM fields, **When** a dispatched write echoes the record back, **Then** the masked fields are masked in the agent's response too.

---

### User Story 4 — Finish the form instead of typing into it (Priority: P2)

In the hub, the user says "register yesterday's purchase from the supplier invoice". The assistant navigates, fills the purchase form, shows it, and — on the user's go-ahead — submits it. Today it fills and stops, so the only agent path to registering a purchase is a form the agent cannot submit.

**Why this priority**: it converts 8 already-built fill tools from a typing aid into completed work for a small, contained change, and it is the only path that works for forms whose write has no stable API shape. It is P2 because it serves the in-app surface only, while P1 serves every channel.

**Independent Test**: on a mounted form, call the submit tool and assert the record is created through the ordinary human API; assert the submit tool is absent for a user who may view the page but not write it.

**Acceptance Scenarios**:

1. **Given** a mounted form filled by the agent and a user permitted to write it, **When** the agent submits, **Then** the record is created and the agent is told the outcome, including validation errors if any.
2. **Given** a user who may view the page but not perform its write, **When** the assistant lists what it can do, **Then** no submit (and no fill) tool for that form is offered.
3. **Given** a submit that the server refuses, **When** the agent reports back, **Then** it relays the server's reason rather than claiming success.

---

### User Story 5 — The owner can see and bound what the agent may do (Priority: P2)

The owner, who must approve this design before code, needs to see the list of writes the agent can perform, and to be certain that a route nobody considered cannot appear on it by accident.

**Why this priority**: this is the condition of the feature being allowed to exist at all (security-tagged generic write path). Without it, "the agent can do anything" is unbounded by construction.

**Independent Test**: inspect the manifest; add a write route in a fixture and confirm the repository gate fails until that route is listed or explicitly excluded with a reason.

**Acceptance Scenarios**:

1. **Given** the manifest, **When** the owner reads it, **Then** every dispatchable write is named with a one-line description of its effect and its required capability.
2. **Given** a newly added hub write route, **When** the repository gates run, **Then** they fail until the route is listed or excluded with a reason.
3. **Given** a route whose capability cannot be resolved, **When** it is dispatched, **Then** it is refused — the manifest cannot grant what the capability map does not.

---

### Edge Cases

- A manifest row names a route that no longer exists (renamed or deleted) → the gate fails in CI; at runtime the dispatch refuses rather than 404-ing opaquely.
- A route exists and is listed, but its capability map returns nothing (one of the 171 unmapped pairs) → refused; the manifest cannot bypass the capability map.
- Two routes share a prefix and different capabilities → the longest matching prefix decides, exactly as the human guard does.
- The agent sends a body the route rejects → the route's own validation error is relayed verbatim to the agent; nothing partial is written.
- The agent sends a path that is not a hub API route, is off-origin, or contains traversal (`..`, `//`, encoded separators) → refused before any dispatch.
- The agent dispatches a read method (GET/HEAD) → refused; this feature is writes only.
- A dispatched write whose route itself fans out to other writes (e.g. completing a booking realizes stock) → allowed; the route's own internal effects are the human behavior and are not separately gated.
- The agent repeats an identical write (retry, or model loop) → the duplicate must be either idempotent or visibly a second record, never a silent double charge.
- A multi-org user's agent dispatches without naming an org → the write must land in the same org the user's UI is acting on, not an arbitrary membership row (`E-rbac-parity.md` "Org selection ignores the user's active org").
- The principal resolution path is itself broken (the live `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` 403, synthesis L1) → dispatch returns the same 403 as every other bridge call; **this feature does not restore the bridge** (that is slice S0).
- Two writers touch the same record at once → the dispatched write inherits the route's own optimistic-lock behavior (the existing `contact-update` action already carries one) and must surface the conflict to the agent rather than overwriting silently.
- A disabled module, a locked period, an approval workflow, or a closed shift refuses the write → the agent relays the refusal reason, and specifically says the user's role is the cause only when it actually is (403), never as a generic failure.

---

## Requirements *(mandatory)*

### Functional Requirements

**Dispatch and authorization**

- **FR-001**: The system MUST expose a single agent write entry point that takes a hub route path, an HTTP write method, and a body, and performs that write on behalf of the resolved assistant principal.
- **FR-002**: The system MUST refuse any dispatch whose (route, method) is not present in the dispatch manifest, with an error distinguishable from a permission refusal and from a validation failure.
- **FR-003**: The system MUST refuse any dispatch whose (route, method) has no resolvable capability in the central capability map, even if the manifest lists it.
- **FR-004**: The system MUST derive the required capability from the same single source of truth the human write guard uses — never from a value supplied by the agent, the manifest, or the request body.
- **FR-005**: The system MUST refuse read methods; only create/update/delete methods are dispatchable.
- **FR-006**: The system MUST reject route strings that are not an exact match for a manifest entry's pattern, including anything containing path traversal, duplicate separators, an authority component, or a non-hub prefix.
- **FR-007**: The system MUST apply the module-enabled check to every dispatched write, refusing when the org has the module switched off.
- **FR-008**: The system MUST apply record-level owner scope to every dispatched write, so a role restricted to its own records cannot write someone else's.
- **FR-009**: The system MUST apply field-level masking to data a dispatched write returns, to the same tier the human path applies.
- **FR-010**: The system MUST evaluate the alternative-capability rule (till work passing without the CRM module) identically to the human guard.
- **FR-011**: The system MUST honour the org-configured approval workflow that blocks a status change, for dispatched writes as for human ones.
- **FR-012**: The system MUST perform a dispatched write in the org the user's hub session is acting on when the agent names no org, and MUST refuse an org the user is not a member of.
- **FR-013**: Dispatch MUST NOT be reachable without a resolved assistant principal; a machine token alone MUST NOT be sufficient.

**Auditability and safety**

- **FR-014**: The system MUST record every dispatched write with the owning human's identity and an explicit agent-driven marker.
- **FR-015**: The system MUST support a non-mutating preview: a dispatch that is not explicitly confirmed MUST describe the effect and change nothing.
- **FR-016**: The system MUST relay the originating refusal reason to the agent, and MUST state that the user's role is the cause only when the refusal was a permission refusal.
- **FR-017**: The system MUST NOT log request bodies that can carry personal data or secrets at a level the owner has not opted into.

**Manifest and discoverability**

- **FR-018**: The dispatch manifest MUST be served by the hub at runtime so that a newly dispatchable hub write becomes agent-reachable without a gateway release.
- **FR-019**: Each manifest entry MUST carry the route pattern, the allowed methods, a one-line description of the effect, the body fields the route requires, and the capability it needs.
- **FR-020**: Every hub write (route, method) pair MUST be either listed in the manifest or recorded as excluded with a stated reason; a repository gate MUST fail when a pair is neither.
- **FR-021**: The agent MUST be able to find a dispatchable write from a user's words without the whole manifest being present in every turn's context.
- **FR-022**: The system MUST retire the hardcoded per-endpoint allowlist once the dispatcher covers the operations it reached, so there is one agent write path, not two.

**In-app forms**

- **FR-023**: A mounted in-app form MUST be able to expose a submit operation to the assistant, which performs the page's ordinary submit and returns its outcome, including validation errors.
- **FR-024**: Form tools (fill and submit) MUST be offered only when the user holds the capability the form's write requires, not merely view access to its page.
- **FR-025**: An agent-driven submit MUST go through the same human API and the same central write guard as a user-driven submit; the in-app surface MUST NOT gain a privileged channel.

### Key Entities

- **Dispatch manifest entry**: one dispatchable hub write — route pattern, allowed methods, effect description, required body fields, resolved capability, and whether it is destructive (affects the confirmation bar).
- **Manifest exclusion**: a hub write pair deliberately not dispatchable, with the reason (machine-only, anonymous, platform-admin, superseded by a dedicated tool).
- **Assistant principal**: the already-existing resolved identity — owning human, org, and capability set — that a dispatch acts as.
- **Dispatch outcome**: what the agent gets back — accepted / previewed / refused-permission / refused-not-dispatchable / refused-validation — plus the originating reason and the created or affected record reference.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All seven highest-value operations named in the audit's top-10 (POS shift open/close, void/refund/tender-correct, customer create, POS appointments, finance writes, stock entry submit, catalog item creation) are performable by the agent for a user whose role permits them, each demonstrated once against a non-production org.
- **SC-002**: The number of agent-reachable hub write operations rises from ~20 to at least 150 of the 193 pairs the capability map already covers, without adding one new per-operation agent endpoint.
- **SC-003**: Making an already-capability-mapped hub write agent-reachable requires changes in one repository and no gateway release.
- **SC-004**: For every dispatchable write, a four-persona matrix (owner, module-editor, view-only, module-disabled) produces the same accept/refuse decision through the agent as through the hub UI — zero divergences.
- **SC-005**: Adding a hub write route without a manifest decision fails the repository gates; demonstrated by a deliberate fixture.
- **SC-006**: 100% of dispatched writes appear in the audit trail attributed to the owning human and marked agent-driven, verified on a sample of every manifest module.
- **SC-007**: A dispatch of an unlisted or unmapped route never mutates anything and never returns a 5xx; verified across the `/api/servers`, `/api/users`, `/api/roles` and `/api/tags` families (the largest unmapped ones).
- **SC-008**: The in-app assistant completes all 8 catalogued forms for a user who holds their write capability, and is offered none of them for a user who holds only view access.
- **SC-009**: A dispatched write's end-to-end latency stays within the same order as the equivalent UI action, so the assistant does not feel slower than doing it by hand (target: no more than ~1.5× the human request, measured on the POS shift-open path).
- **SC-010**: The owner can read, in one place, the full list of what the agent may write, and signs off on it before implementation begins.

---

## Assumptions

- The agent's hub bridge is working. **It is not today**: every gateway→hub tool call returns 403 `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` because 11 of 11 personal agents have no gateway assignment (synthesis L1). This feature is worthless until slice S0 lands, and S0 is **not** in its scope.
- The capability map (`apiWriteCapability`) is correct for the routes it covers. The audit found no defect in it; it did find agent-side skew against it, which this feature removes by construction. A parity test against it is the recommended guard (`E-rbac-parity.md` "Suggested order of work" item 6).
- Hub route handlers already enforce their own in-route gates, so exercising the real route is equal-or-stricter than the central guard alone. Spot-checked, not exhaustively verified: `api/pos/tickets/+server.ts:73` requires `pos:create` above the central guard's `edit`.
- The 8 in-app forms' pages own a submit action that can be invoked programmatically. Not verified per form; `FormBinding` today exposes only `get`/`set` (`forms.ts:53-62`), so each page must expose its submit.
- No new user-facing strings are assumed to be free of the i18n requirement: every refusal message the user sees goes through Paraglide `m.*()` + `i18n:compile` (Constitution IV).
- The owner approves the design before code and merges the PRs personally (Constitution V; proposal open question 2). This spec is not implementable until that happens.
- Dispatch covers **writes only**. Typed reads are slice S4 and the retired arbitrary-SQL read path (`query/` → 503 `ASSISTANT_SQL_DISABLED`) is not restored here.
- External MCP clients are out of scope. Exporting write tools over `/mcp` is blocked on per-user identity (synthesis D-G3) and is slice S5.
