# Feature Specification: Agent bridge RBAC parity

**Feature Branch**: `003-agent-bridge-rbac-parity` (spec directory; the implementing branch is per-repo — see Assumptions)

**Created**: 2026-10-15

**Status**: Draft — security-tagged, owner approval required before any code (Constitution V)

**Input**: User description: "Bring the agent bridge's authorization to parity with the human path. Today `requireAssistantCapability` checks capability only, while the human API path also checks module-enabled, owner scope and field masking. … Deliver parity with one shared guard, a capability-parity test asserting each `actions/*` capability equals `apiWriteCapability(<human path>, <method>)`, fail-closed on 404, a scoped per-run credential for custom tools, and negative-control tests per module. Exclude the already-shipped hotfix hub #541. Security tagged: owner approves the spec and merges."

**Evidence base**: `audits/2026-10-15-agent-harness/E-rbac-parity.md` (whole report), `C-tool-feeding.md` §2 + S1–S3, `00-synthesis.md` §3 §5, `proposals/2026-10-15-agent-harness-restoration.md` slice S2. Code anchors re-verified in this session against `minion_hub` `origin/master` `7d917ed0` and `minion` (gateway) `origin/DEV` `f2de5e00534`; every count below was re-run, not copied.

---

## AS-IS (measured 2026-10-15, re-verified in this session)

The agent bridge is a second, thinner implementation of the human authorization path, not a layer over it.

| # | Observable behavior today | Anchor (re-verified) |
|---|---|---|
| A1 | `requireAssistantCapability` checks exactly one thing: `capabilities.can(module, action)`. It then hands back a `CoreCtx` and the `Capabilities` object and leaves everything else to each handler. | `minion_hub/src/routes/api/gateway/_shared/action-auth.ts:22-33` |
| A2 | The human path checks four things: capability, module-enabled, record-level owner scope, field-level masking. `isModuleEnabled` appears in **109** files under `src/routes/api/**` and in **0** of the **48** `src/routes/api/gateway/**/+server.ts` handlers. | `grep -rl isModuleEnabled src/routes/api` = 109; same over `src/routes/api/gateway` = 0; `find src/routes/api/gateway -name '+server.ts'` = 48 |
| A3 | `ownerFilter(locals, module)` is used at **31** human call sites; **0** gateway handlers call it (one comment explains why: a gateway caller has no `locals.user`). Only 2 bridge endpoints hand-rolled the equivalent via `capabilities.ownerScoped(...)`. | `query/orders/+server.ts:20`, `query/tickets/+server.ts:29-30` |
| A4 | Field masking: only 2 bridge endpoints call `capabilities.fieldLevel(...)`. `search-crm-conversations` returns verbatim `crm_conversation_chunks.content` (customer chat text, routinely phone numbers and emails) with no mask, while `crm` is in `FIELD_LEVEL_MODULES` and the human CRM reads mask whenever `field_level < 1`. | `query/bookings/+server.ts:24`, `query/finance/+server.ts:22`; `search-crm-conversations/+server.ts:32` |
| A5 | CRM owner scope is applied at 14 human CRM call sites (incl. a pre-write ownership check that 404s: `api/crm/contacts/[id]/+server.ts:56-60`) and at **0** agent ones: `actions/contact-update:50`, `actions/contact-tag:25`, `search-crm-conversations:19-32`, `crm-conversation-themes:18-29` (whose service already takes an unused `ownerId` param), `insight:31-46`. | E-rbac-parity §S4 |
| A6 | `query/custom-tools` resolves the principal and checks `tools:view` **only** when `?status=all|draft`. The default published-only path returns `scriptCode` and the raw `envVars` JSON (unsealed, i.e. whatever API key a tool author stored) with zero capability check. The human read of the same rows requires `tools:view` unconditionally. | `query/custom-tools/+server.ts:43-44,64-66`; human: `api/builder/tools/+server.ts:10` |
| A7 | Three endpoints documented as gateway-only gate on `locals.tenantCtx` alone, which any authenticated member of any role resolves; `apiWriteCapability` returns `null` for all three, so the central write guard does not fire either. | `api/agent-memories/recall/+server.ts:16`, `api/agent-memories/delete/+server.ts:13`, `api/messages/ingest/+server.ts:14-16` |
| A8 | `insight` passes on `crm:view` **OR** `finance:view`, then returns per-customer `revenue` and `top_product`, with no `fieldLevel('finance')` check. | `insight/+server.ts:31-36`; `crm-finance.service.ts:367-377` |
| A9 | Six agent writes carry no `agentActor()` stamp, so the audit trail is a bare profile id indistinguishable from a human session: `booking-cancel`, `booking-reschedule`, `booking-create`, `booking-complete` (status flip), `contact-tag`, `contact-update`. | E-rbac-parity §S9 |
| A10 | `actions/order-update-status` and `actions/ticket-update` never call `statusChangeBlocked(...)`, the org-configured approval workflow both human handlers enforce. | human: `api/sales/orders/[id]/+server.ts:19`, `api/support/issues/[id]/+server.ts:36` |
| A11 | `actions/pos-sale` requires `pos:edit`; the till's `POST /api/pos/tickets` requires `pos:create` (and `/api/pos/tickets` is in `CREATE_COLLECTION_ENDPOINTS`). A create-only cashier — the documented FACES role shape — rings the sale in the UI and is 403'd through the agent. | `actions/pos-sale/+server.ts:53`; `rbac.service.ts:1179-1197`, `:1158` |
| A12 | Five agent writes ask `create` where the human POST resolves to `edit` (`apiWriteCapability` defaults POST to `edit` unless the path is in `CREATE_COLLECTION_ENDPOINTS`): `booking-create`, `stock-entry-create`, `stock-issue-from-invoice`, `task-create`, `ticket-create`. `actions/tool-save` asks `tools:manage` where the human needs `create`/`edit` **and** `manage`. | `rbac.service.ts:1200-1248`; the 17 `requireAssistantCapability` call sites under `actions/*` |
| A13 | Gateway: `hub-capabilities.ts:43-46` treats **any** `request failed: 404` from `query/tool-permissions` as `legacyHub: true`, and `permissionAllowed` then returns `true` for every permission-carrying tool. SvelteKit answers 404 for a missing **or misrouted** route; the 2026-10-11 incident 404'd every hub route for ~11 h. Everything else in that file is correctly fail-closed. | `minion/src/agents/tool-search/hub-capabilities.ts:43-46,108-112` |
| A14 | Gateway: `custom-tools.ts:226-230` injects `MINION_HUB_TOKEN = rest.serverToken` — the raw gateway↔hub server token, an org-wide impersonation credential — into the environment of a user-authored script run unsandboxed via `node -e`/`python3 -c`/`bash -c`. A script that prints it hands the caller the gateway's hub credential. | `minion/src/agents/tool-search/custom-tools.ts:226-230`; `run-script.ts` header "no container sandbox v1" |
| A15 | Gateway: `module_action` carries no permission meta and reaches 17 allowlisted write endpoints; when the capability fetch fails closed, all 17 dedicated write tools vanish while `module_action` survives. The hub does enforce per-endpoint; the gateway's L1 gate is therefore advisory for writes, although the tool-scaling spec calls L1 a "security boundary". | `minion/src/agents/tools/hub/module-action-tool.ts:9-27`, `module-action-tool.meta.ts`; `C-tool-feeding.md` §S3 |
| A16 | `actions/tool-save` accepts a caller-supplied `permission` and writes it straight into `executionConfig`, so the agent sets the capability its own published tool will later be gated on. | `actions/tool-save/+server.ts:22,51,58,72-73` |
| A17 | **Correction to the inputs.** `C-tool-feeding.md` M3 and the proposal state that `actions/notify-user` "checks nothing". At `7d917ed0` it calls `requireNotificationAdmission(orgId, principalId, 'create')`, which resolves a **fresh** org membership and the `comms:create` capability and 403s otherwise — stricter than `requireAssistantCapability`, not weaker. E-rbac-parity's parity table agrees. No change is needed; the claim is stale. | `actions/notify-user/+server.ts:33-34`; `server/services/notifications/authority.ts:29-43` |
| A18 | Server-token requests never reach the central write guard at all (`resolveViaMetricsBearer` returns `bypassGate: true`), so for the whole bridge the handler is the only guard. This is why A2/A6/A7 land where they do. | `resolve-identity.ts:296-307`; `hooks.server.ts:438-447` |

Not measured, and therefore not asserted: whether any tenant has actually configured a `create ≠ edit` role split or an owner-scoped CRM role in production (that is what makes A11/A12/A5 exploitable rather than theoretical); no finding was exercised against a live instance.

## TO-BE

- One shared guard is the only way a bridge endpoint authorizes. It enforces capability **and** module-enabled, and it returns the owner-scope and field-level decisions for the module so a handler cannot forget to ask. An endpoint that needs less says so in a code comment naming why.
- For every module, a role that is refused in the UI is refused through the agent, with the same status: a disabled module answers like the human API (404 `module_disabled`), a missing capability answers 403 with a message the agent can relay.
- CRM reads and writes through the agent are owner-scoped and field-masked exactly as the human CRM surface is.
- Every `actions/*` endpoint requires the capability its human counterpart requires — asserted by a test over the whole family, not by review.
- A bridge endpoint that is gateway-only refuses a browser session; one that returns secrets requires the capability that guards the same rows on the human path.
- The gateway's capability fetch is fail-closed on every failure mode, including 404.
- A user-authored custom-tool script never holds a hub credential.
- Every agent write is attributable to the owning human "(via agent)" and respects the org's configured approval workflow.

## DELTA (transitions, each with its proving test)

| # | Transition | Proof |
|---|---|---|
| D1 | `requireAssistantCapability` gains `isModuleEnabled(ctx, module)` (404 `module_disabled`) and returns `{ownerId, maskSensitive}` alongside `capabilities`. | Unit: guard denies with module disabled, allows with it enabled, for one module per family; negative control per module (US1). |
| D2 | The 5 CRM agent endpoints thread owner scope; `contact-update`/`contact-tag` pre-check ownership and 404 like the human PATCH; `crm-conversation-themes` passes the `ownerId` its service already accepts. | Unit per endpoint: owner-scoped role sees/edits only own records; un-scoped role unchanged. |
| D3 | `search-crm-conversations` masks PII in returned `content` when `fieldLevel('crm') < 1`, via an additive optional parameter (the service comment marks its signature load-bearing). | Unit: masked vs unmasked for the two role shapes; existing service callers unchanged. |
| D4 | `query/custom-tools` requires `tools:view` on all paths; `scriptCode`/`envVars` are omitted without it. | Unit: zero-capability principal gets 403 (or a stripped row) on the default path. |
| D5 | `agent-memories/recall`, `agent-memories/delete`, `messages/ingest` require `locals.serverId`; `agentId` is bound to the caller's principal. | Unit: browser session → 401; server token → 200; cross-agent `agentId` → refused. |
| D6 | `insight` requires `crm:view` **and** `finance:view` for the joined read, and applies `fieldLevel('finance')` to revenue. | Unit: each single-capability role is refused; both-capability role masked per field level. |
| D7 | `pos-sale` asks `pos:create`; the five `create`/`edit` skews and `tool-save` are reconciled with `apiWriteCapability`. | **The parity test**: for every `actions/*` endpoint, its required capability equals `apiWriteCapability(<mapped human path>, <method>)`, driven by a committed endpoint→human-path map; an unmapped endpoint fails the test. |
| D8 | `agentActor()` on the 6 unstamped writes; `statusChangeBlocked` in `order-update-status` and `ticket-update`. | Unit: write records the "(via agent)" actor; a configured blocking workflow 4xxs through the agent. |
| D9 | `tool-save` cannot set `permission` unless the caller holds the capability it names (or the field is admin-only). | Unit: agent cannot publish a tool gated on a capability it lacks. |
| D10 | Gateway: the legacy-hub escape is removed; a 404 is treated like any other failure (snapshot `null`, fail closed). Legacy tolerance, if still wanted, becomes an explicit config flag or a positive `{supported:false}` marker from the hub. | Unit: 404 response ⇒ `permissionAllowed()` false for permission-carrying tools; existing fail-closed tests still pass. |
| D11 | Gateway: the raw server token is no longer injected into custom-tool scripts. Scripts reach hub endpoints through a gateway-mediated path bound to that run, or lose hub access. | Unit: the child env contains no hub credential; a script's hub call still succeeds through the mediated path. |
| D12 | `module_action` is documented as reaching only endpoints that each enforce a hub capability, and a test asserts that every allowlisted endpoint in its list has a hub-side gate; the tool-scaling spec's "L1 is a security boundary" wording is corrected to "prompt economy; the hub is the boundary". | Test over the allowlist × the bridge's guard call sites. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A disabled module stops the agent too (Priority: P1)

An org admin turns a module off (or ops turns it off after an incident). The human UI and API immediately 404 for that module. Today the agent keeps reading and writing the same data through the bridge. After this story, one shared guard refuses every one of the 48 bridge endpoints for a disabled module, the same way the human API does.

**Why this priority**: it is one call inside one function and it closes a kill-switch bypass across the whole bridge — the single highest ratio of coverage to diff in the feature (E-rbac-parity §S6, "suggested order of work" item 4).

**Independent Test**: disable a module for a test org, call one read and one write endpoint of that module through the bridge with a fully-capable principal, and get the human path's refusal; re-enable and get 200.

**Acceptance Scenarios**:

1. **Given** module `stock` is disabled for the org and the principal holds `stock:view` and `stock:edit`, **When** the agent calls the stock read or the stock write through the bridge, **Then** it is refused with the same status the human API returns for a disabled module, and no row is read or written.
2. **Given** module `stock` is enabled, **When** the same calls are made, **Then** they behave exactly as before this change.
3. **Given** a bridge endpoint that deliberately has no module (platform/admin endpoints, personal notes), **When** the guard runs, **Then** it is not gated on a module, and the code states why.

---

### User Story 2 - An un-gated bridge endpoint stops being a side door (Priority: P1)

Several bridge endpoints authorize on "there is a tenant context" or on nothing, which any authenticated member of any role satisfies. A viewer with no business capability can read every published custom tool's source and unsealed env vars, read and delete another user's agent memories, write the org's message ledger, and read per-customer revenue holding only `crm:view`.

**Why this priority**: these are the widest reachable gaps that remain in scope (hub #541 covers the two cross-org ones) and each is a few lines.

**Independent Test**: with a browser session for a zero-capability member of the org, call each of the five endpoints and get refused; repeat with the gateway server token and the right capability and get served.

**Acceptance Scenarios**:

1. **Given** a principal with no capabilities, **When** it reads the custom-tool catalogue, **Then** it does not receive tool source or env vars.
2. **Given** an authenticated member with a browser session (no server token), **When** it calls agent-memory recall, agent-memory delete, or message ingest, **Then** it is refused.
3. **Given** a server token and an `agentId` belonging to another member, **When** agent-memory recall or delete is called, **Then** it is refused.
4. **Given** a role holding only `crm:view`, **When** it requests the customer insight, **Then** no revenue figure is returned.
5. **Given** a role holding both `crm:view` and `finance:view` with the sensitive field level lowered, **When** it requests the insight, **Then** revenue is masked the way the finance surface masks it.

---

### User Story 3 - The agent sees only the records and fields the person does (Priority: P2)

A role restricted to its own CRM records sees only those records in the UI, and a role with the sensitive field level lowered sees phone numbers and emails masked. Through the agent, that same person's agent reads and edits every contact in the org and receives verbatim customer chat text.

**Why this priority**: it is the part of the gap that leaks real customer PII, but it needs a new shared helper (owner/mask from `Capabilities` rather than `App.Locals`) and five endpoint edits, so it is larger than P1.

**Independent Test**: give a test role `crm:view`+`crm:edit` with if-owner set and the sensitive field level lowered; confirm through the agent that it reads/edits only its own contacts and that returned conversation text is masked.

**Acceptance Scenarios**:

1. **Given** an owner-scoped CRM role, **When** the agent lists or searches CRM data, **Then** only records owned by that person are returned.
2. **Given** an owner-scoped CRM role, **When** the agent updates or tags a contact it does not own, **Then** the call is refused the way the human PATCH refuses it, and nothing is written.
3. **Given** a role whose CRM field level is below the sensitive tier, **When** the agent searches CRM conversations, **Then** phone numbers and email addresses in the returned text are masked.
4. **Given** a role with un-restricted CRM view and full field level, **When** the same calls are made, **Then** the results are identical to today's.

---

### User Story 4 - The agent can do exactly what the person can, no more and no less (Priority: P2)

A cashier scoped to `pos:create` rings sales at the till and is 403'd when the agent tries the identical sale. In the other direction, five agent writes ask `create` where the human POST requires `edit`. After this story every `actions/*` endpoint requires its human counterpart's capability, and a test prevents the class from coming back.

**Why this priority**: it is the owner's own requirement ("the agent can do literally anything given the user has the needed RBAC") in both directions, and the test is what makes it stay true.

**Independent Test**: for each `actions/*` endpoint, assert its required capability equals `apiWriteCapability(<human path>, <method>)`; then exercise the cashier role end to end through the agent.

**Acceptance Scenarios**:

1. **Given** a role with `pos:create` and no `pos:edit`, **When** the agent rings a POS sale, **Then** it succeeds, as it does at the till.
2. **Given** the committed endpoint→human-path map, **When** the parity test runs, **Then** every `actions/*` endpoint's capability equals the human path's, and an endpoint missing from the map fails the test.
3. **Given** a new `actions/*` endpoint added later without a map entry, **When** the suite runs, **Then** it is red.

---

### User Story 5 - A failed permission fetch and a user script never widen access (Priority: P3)

When the hub cannot answer the gateway's permission question, the gateway must assume nothing is allowed. Today a 404 — which is what every hub route returned for ~11 h on 2026-10-11 — is read as "this hub is too old to have permissions" and all gating is skipped. Separately, a user-authored custom-tool script is handed the gateway's own hub credential.

**Why this priority**: both are gateway-side and independent of the hub work; neither is known to have been exploited, and the hub remains the enforcing boundary, which is why they sit below P1/P2.

**Independent Test**: stub the permission endpoint to 404 and assert permission-carrying tools are dropped; inspect a custom-tool run's child environment for any hub credential.

**Acceptance Scenarios**:

1. **Given** the permission endpoint answers 404, **When** the tool gate runs, **Then** every permission-carrying tool is dropped and the failure is logged once per window.
2. **Given** the permission endpoint answers a positive "not supported" marker (or the operator sets the explicit legacy flag), **When** the gate runs, **Then** gating is skipped — and only then.
3. **Given** a published custom tool runs, **When** its child process environment is inspected, **Then** it contains no gateway↔hub credential, and the script's hub calls still work through the mediated path.

---

### User Story 6 - An agent write is attributable and respects the approval workflow (Priority: P3)

Six agent writes land in the audit trail as a bare profile id, indistinguishable from the person doing it themselves, and two status writes bypass the org's configured approval workflow entirely.

**Why this priority**: it is accountability and configuration fidelity rather than access; nothing is exposed, but an org that configured a workflow is silently not getting it.

**Independent Test**: perform each of the six writes through the agent and read the audit actor; configure a blocking status workflow and attempt the status change through the agent.

**Acceptance Scenarios**:

1. **Given** any of the six writes, **When** performed through the agent, **Then** the recorded actor reads "<person> (via agent)".
2. **Given** an org-configured workflow that blocks a status change, **When** the agent attempts that change on an order or a ticket, **Then** it is refused the way the human handler refuses it.

---

### Edge Cases

- A module toggle row is absent for the org: `isModuleEnabled` treats absent as enabled (`modules.service.ts:28`), so the guard must not start refusing orgs that never touched the toggles.
- A bridge endpoint spans two modules (`insight` reads CRM and finance): the guard must be callable for both, and the stricter answer wins.
- An endpoint that legitimately has no module or no capability (personal notes, the capability read itself, platform admin updates) must be able to say so explicitly rather than be forced through a module gate.
- A role gains un-restricted view through a second role: `ownerScoped` is least-restrictive by design (`rbac.service.ts:285-287`) — the agent must inherit that, not re-derive it.
- The capability snapshot is memoised for 60 s on both sides (`resolve-identity.ts:78`, `hub-capabilities.ts:14`), so a revocation or a module toggle lags by up to a minute on the agent path; this is pre-existing and must be stated, not silently "fixed".
- `module_action` reaches the same endpoints as the dedicated tools, so every gate added here must sit in the hub handler, never only in a gateway tool meta.
- Making five writes stricter (`create` → `edit`) can 403 an agent flow that works today for a role split that way; the test and the release note must name it.
- A custom-tool script that today reads `MINION_HUB_TOKEN` will stop working; that is intended, and the deprecation must be visible to tool authors.
- The module-state lookup is a cached read (`modules.service.ts:13-24`), so it can fail where the capability check would not. The guard must refuse on an indeterminate answer (FR-027), which also means the bridge now shares the human path's dependency on that read — a Valkey/DB outage refuses agent calls instead of serving them.
- The guard adds one cached read per bridge call; the human path already pays it on "virtually every request" (same file's comment), so the agent path inherits the same cost rather than a new one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every bridge endpoint MUST authorize through one shared guard; an endpoint that needs less than the guard provides MUST state in code why.
- **FR-002**: The shared guard MUST refuse a request whose module is disabled for the org, with the same outcome the human API produces for a disabled module.
- **FR-003**: The shared guard MUST return the module's owner-scope and field-level decisions to the handler, so a handler cannot be correct by omission.
- **FR-004**: An absent module toggle MUST continue to mean enabled.
- **FR-005**: CRM agent reads MUST return only records the person may see under their role's owner scope.
- **FR-006**: CRM agent writes MUST refuse a record the person may not edit under their role's owner scope, before writing, with the human path's outcome.
- **FR-007**: Agent-returned CRM conversation text MUST have phone numbers and email addresses masked whenever the person's CRM field level is below the sensitive tier.
- **FR-008**: The custom-tool catalogue read MUST require the same capability as the human read of the same rows on every path, and MUST NOT return tool source or environment values without it.
- **FR-009**: Endpoints documented as gateway-only MUST refuse a request that does not carry the gateway's own credential.
- **FR-010**: An agent-memory read or delete MUST be refused for an agent the caller does not own.
- **FR-011**: A joined CRM-and-finance read MUST require both capabilities, and MUST apply the finance field-level mask to monetary figures.
- **FR-012**: Each `actions/*` endpoint MUST require the capability its human counterpart requires.
- **FR-013**: A committed map from each `actions/*` endpoint to its human path and method MUST exist, and an endpoint absent from it MUST fail the suite.
- **FR-014**: The capability for POS sale through the agent MUST be the one the till requires.
- **FR-015**: Publishing a tool through the agent MUST NOT let the caller assign that tool a capability the caller does not hold.
- **FR-016**: The gateway MUST treat every failure to obtain a capability snapshot — including a 404 — as "deny every permission-carrying tool".
- **FR-017**: Skipping permission gating MUST require a positive signal (an explicit operator flag, or the hub answering that it does not support permissions), never the absence of a route.
- **FR-018**: A user-authored custom-tool script MUST NOT receive any gateway↔hub credential in its environment.
- **FR-019**: A custom-tool script that needs hub data MUST reach it through a path bound to that single run, or not at all.
- **FR-020**: Every agent-initiated write MUST record an actor attributable to the owning person and distinguishable from that person's own session.
- **FR-021**: Agent status changes on orders and support tickets MUST honour the org's configured approval workflow.
- **FR-022**: Every endpoint reachable through the generic module-action tool MUST enforce a capability hub-side, asserted by a test over that tool's allowlist.
- **FR-023**: Documentation that calls the gateway's tool-permission filter a security boundary MUST be corrected to name the hub as the boundary.
- **FR-024**: Each of the 11 module families the bridge exposes (crm, finance, sales, scheduling, support, projects, stock, pos, comms, brains, tools) MUST have a negative-control test: a role lacking the capability, and a role whose module is disabled, are both refused.
- **FR-027**: If the module's enabled/disabled state cannot be determined, the request MUST be refused; an unavailable module lookup MUST NOT be read as "enabled". (An absent toggle row is still "enabled" — FR-004 — because that is a determined answer, not a failure.)
- **FR-028**: Every bridge refusal MUST be observable: a structured record naming the endpoint, module, action and reason (missing capability / module disabled / out of owner scope / not a gateway caller), carrying no withheld data. Without it SC-002 and SC-010 cannot be checked in production.
- **FR-029**: Owner filtering and field masking MUST be applied before data leaves the hub. The agent runtime, the model and any channel transcript are outside the trust boundary; masking only in a rendering layer does not satisfy FR-007.
- **FR-025**: No change in this feature may widen access for any role relative to today; a change that narrows access MUST be named in the release note.
- **FR-026**: The feature MUST NOT modify the endpoints already changed by the in-flight security hotfix (see Out of scope), and MUST leave their behaviour intact once that hotfix merges.

**Out of scope** (named deliberately, each with where it is tracked):

- The two cross-org credential/PII leaks (`gateway/google-adc`, `gateway/google-identities`, `gateway/channel-identities`) — hub PR **#541**, `fix/gateway-credential-endpoints-org-scope`. Note: at the time of writing that PR is **OPEN, not merged** (verified `gh pr view 541`), and the three handlers are unchanged at `7d917ed0`; the brief described it as shipped.
- The bridge's trust model: no forwarded user credential, no token expiry/rotation/nonce, `resolveMemberPrincipal` picking `rows[0]` instead of the user's active org. (E-rbac-parity "Principal resolution"; needs its own spec.)
- Coverage: 11 of 23 modules have no bridge at all, and the generic dispatcher that would close them (proposal slice S3).
- `crm_query`'s permanent 503 and its advertisement in the prompt envelope (E-O3, C-D2; proposal S0/S4).
- In-app forms offered on view rather than on the write capability (E-O4).
- `query/email-ledger` using `comms:view` where its human page uses `channels:view` (E-O5).
- `/api/gateway/pages` being anonymous (E-S10).
- The non-atomic `booking-reschedule` implementation (E, "non-RBAC bug noticed in passing").
- Sandboxing custom-tool execution (`run-script.ts` "no container sandbox v1"): this feature removes the credential, not the sandbox gap.

### Key Entities

- **Principal**: the human the agent acts for — a profile id plus the org the request resolved to. Never taken from the request body.
- **Capabilities**: the per-module answer to "may this person view/create/edit/delete/export/manage", plus owner-scope and field-level, OR-ed across the person's roles (least-restrictive wins).
- **Module state**: the org's per-module on/off toggle; absent means on.
- **Bridge endpoint**: one of the 48 gateway-facing handlers, each with a module, an action, and (for writes) a human counterpart path and method.
- **Endpoint→human-path map**: the committed table the parity test reads; the artifact that makes FR-012 enforceable.
- **Capability snapshot**: the gateway's cached view of a principal's capabilities, used to decide which tools to offer; advisory, not the boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For all 48 bridge endpoints, the number that authorize without a module check goes from 48 to 0 (or to a count equal to the endpoints that carry a written justification).
- **SC-002**: For every module the bridge exposes, a person refused in the UI is refused through the agent in 100% of the sampled read and write pairs; the same person is served through the agent in 100% of the pairs the UI serves.
- **SC-003**: A disabled module blocks agent access within the stated staleness window (≤60 s) and in 0 cases permanently blocks an org that never configured module toggles.
- **SC-004**: Agent CRM results contain 0 records outside the person's owner scope and 0 unmasked phone numbers or email addresses for a role below the sensitive field level.
- **SC-005**: The count of `actions/*` endpoints whose required capability differs from their human counterpart's goes from 6 to 0, and an endpoint added without a map entry fails the suite 100% of the time.
- **SC-006**: A cashier holding only the create capability completes a POS sale through the agent (currently 0% — a hard 403).
- **SC-007**: Every failure mode of the capability fetch (network error, non-JSON body, 404, 500) results in permission-carrying tools being dropped — 4 of 4, versus 3 of 4 today.
- **SC-008**: A custom-tool run's child environment contains 0 gateway↔hub credentials.
- **SC-009**: All six previously unstamped agent writes record an actor marked as acting via the agent (6 of 6, from 0 of 6), and a configured blocking workflow stops the agent in 100% of attempts.
- **SC-010**: No role gains any access it does not have today; the narrowing changes are enumerated in the release note (expected: five writes moving from create to edit).
- **SC-011**: Each of the 11 module families has at least one negative-control test for missing capability and one for disabled module (22 cases minimum, from 0 today).
- **SC-012**: 100% of bridge refusals are retrievable from the refusal records with their reason, so a narrowing regression is detectable the day it ships rather than at the next audit.

## Assumptions

- The guard change is a `minion_hub` change on its registered PR base plus a `minion` (gateway) change on its own base; branch roles come from `node scripts/repo-policy.mjs show <id>` at implementation time, not from this document. The spec directory name is not a branch name.
- Human-path parity is defined by `apiWriteCapability` plus the handler's own explicit `requireOrgCapability` where the two disagree; where a handler is stricter than the central guard, the handler wins (this is how `/api/pos/tickets` was reconciled — `rbac.service.ts:1188-1192`).
- The five writes that become stricter (`create` → `edit`) are acceptable to the owner because the human path is the contract (ASSUMPTION — owner to confirm; the alternative is adding those paths to `CREATE_COLLECTION_ENDPOINTS`, which would loosen the **human** path, a bigger decision).
- A disabled module answers 404, not 403, on the bridge, matching the human API's `module_disabled` (`custom-properties-access.ts:53`) (ASSUMPTION — owner to confirm; it changes what the agent relays to the user).
- Owner-scope enforcement on writes is a pre-check that refuses with the human path's 404 rather than a filtered update (ASSUMPTION — owner to confirm; `api/crm/contacts/[id]/+server.ts:56-60` is the pattern).
- Removing the legacy-hub 404 escape will not strand a deployed hub, because every gateway in the fleet is paired with a hub from the same release train (ASSUMPTION — owner to confirm; if a genuinely old hub exists, FR-017's explicit flag covers it).
- The masking fix for conversation text is additive (an optional parameter), because the service carries a "signature is load-bearing, do not change" comment.
- `actions/notify-user` needs no change (A17).
- The 60 s capability and server-token caches stay as they are; this feature does not change revocation latency.
- Hub #541 merges before or independently of this work; this feature neither reverts nor depends on it (FR-026).
- No feature flag guards the narrowing changes; the five writes moving `create` → `edit` land directly and are named in the release note (ASSUMPTION — owner to confirm).
- Security-tagged under Constitution V: the owner approves this spec before any code and merges every PR in it.

## Clarifications

### Session 2026-10-15 — informed guesses made during `/speckit-specify`

*(Process note: these five were decided while writing the spec, not asked. `/speckit-clarify`'s own
five are in the next block, so this `## Clarifications` section holds ten bullets, above the
skill's per-session limit of five. See `sdd-notes.md` §3.)*

- **Q**: Should a disabled module refuse with 404 (human API's `module_disabled`) or 403 through the bridge? → **A**: 404, for parity with `custom-properties-access.ts:53` and the human module gates listed in E-rbac-parity §S6. *(ASSUMPTION — owner to confirm: it changes the message the agent relays.)*
- **Q**: Should owner scope on agent writes pre-check and refuse, or silently filter the write? → **A**: Pre-check and refuse with the human path's outcome, mirroring `api/crm/contacts/[id]/+server.ts:56-60`, which the audit cites as the human behaviour.
- **Q**: For the five `create`/`edit` skews, does the agent move to the human's capability, or does the human path move to `create`? → **A**: The agent moves to the human path's capability (`edit` for the five, `create` for `pos-sale`); the human path is the contract and loosening it is a separate, larger decision. *(ASSUMPTION — owner to confirm: five agent flows become stricter.)*
- **Q**: How does a custom-tool script reach hub data without holding the server token — a minted short-lived scoped token, or gateway-mediated calls? → **A**: Gateway-mediated, bound to the run: the script is given a run-scoped endpoint rather than a credential, so the gateway's existing authenticated hub client stays the only holder of the token. This is the smaller of the two options in `C-tool-feeding.md` §S2 and adds no new token lifecycle. *(ASSUMPTION — owner to confirm the mechanism.)*
- **Q**: Should `module_action` be given a coarse permission, or should the gateway's L1 filter be documented as advisory? → **A**: Documented as advisory, with a test asserting every endpoint on its allowlist enforces a capability hub-side (FR-022/FR-023). A coarse permission would be a prompt-economy change dressed as a security control, and the hub is already the boundary — this is option 2 of `C-tool-feeding.md` §S3's fix direction.

### Session 2026-10-15 — `/speckit-clarify` (questions answered from the evidence base; no live user was available)

- **Q**: When the module enabled/disabled state cannot be read at all (cache or database failure), should the agent call be refused or treated as enabled? → **A**: Refused. The human path shares the same dependency and errors in the same situation, so refusing is the parity answer and the fail-closed one. An *absent* toggle row stays "enabled" — that is an answer, not a failure. → FR-027, new edge case.
- **Q**: Does a refusal on the bridge have to be visible to operators afterwards? → **A**: Yes — one structured record per refusal naming endpoint, module, action and reason, with no withheld data in it. Without it SC-002/SC-010 are only ever checkable by another audit, and this whole feature exists because an audit was the first thing that noticed. → FR-028, SC-012.
- **Q**: Where must masking and owner filtering happen — at the hub endpoint, or may the agent runtime do it? → **A**: At the hub endpoint, before the response leaves it. The gateway, the model and any channel transcript are outside the trust boundary, and a masked field that was already sent to a model is not masked. → FR-029.
- **Q**: Should the changes that narrow what the agent can do (five writes moving `create` → `edit`) ship behind a feature flag? → **A**: No flag. A flag on authorization is a second code path, and a second thinner implementation of the human path is precisely the defect being fixed; the narrowing is one release-note line instead. *(ASSUMPTION — owner to confirm; a flag would let a broken role split be unblocked without a revert.)* → Assumptions.
- **Q**: Does "negative-control tests per module" mean per module family or per endpoint? → **A**: Per module family — the 11 the bridge exposes, two cases each (missing capability, module disabled). Endpoint-level coverage is the parity test's job (FR-012/FR-013), so the two together cover all 48 without 96 near-identical tests. → FR-024, SC-011.

### Open

- [NEEDS CLARIFICATION: Has any production tenant configured a role split where `create` and `edit` differ, or an if-owner CRM role? E-rbac-parity's "What was not checked" lists this as unverified, and it decides whether A5/A11/A12 are live exposure or latent.]
- [NEEDS CLARIFICATION: Does any hub in the fleet genuinely predate `query/tool-permissions`? If none does, the legacy escape is deleted outright (FR-016); if one does, FR-017's explicit operator flag is required.]
