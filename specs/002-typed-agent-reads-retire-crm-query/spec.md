# Feature Specification: Typed Agent Reads, Retire crm_query

**Feature Branch**: `002-typed-agent-reads-retire-crm-query`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Replace the agent's dead general data tool. `crm_query` (gateway
`src/agents/tools/knowledge/crm-query-tool.ts`) POSTs raw SQL to hub `POST /api/gateway/query`,
which has been a permanent 503 `ASSISTANT_SQL_DISABLED` since 2026-09-09
(`assistant-query.service.ts`), yet the tool still ships a ~2 KB schema in its description every
turn, the hub envelope recommends it for every grouping/date-range question, and `search_tools`
ranks it #1. 3 of 3 production calls in 30 days failed. Deliver: (1) retire the `crm_query`
advertisement and its envelope prose on both sides without breaking the existing typed `query/*`
tools; (2) versioned, server-owned typed dataset queries (SEC-06 restoration item 1 in
`proposals/2026-09-09-assistant-query-delegation-restoration.md`) that resolve tenant, module,
owner and sensitive-field permissions before execution with DB-side row limits and bounded
bytes, qualified with low-privilege persona negative controls; no statement-prefix checks or
caller-mutable session context as a sandbox. Security tagged."

## Clarifications

### Session 2026-10-15

- Q: The feature description lists "tenant, module, owner and sensitive-field permissions" as
  four things each typed dataset must resolve before execution. Does "owner" mean per-record
  ownership/assignment visibility (e.g. "only see contacts assigned to me"), and is there already
  an established mechanism for it? → A: Yes, and there are two generations of it in this codebase
  — `rbac.service.ts` has `Capabilities.ownerScoped(module)` plus a `locals`-based
  `resolveOwnerScope()`/`ownerFilter()` pair used by 14 human call sites, but `locals.user` does
  not exist for a gateway/server-token caller, so the `locals`-based pair is the wrong tool here.
  Two existing agent-bridge endpoints already solved this correctly — `query/tickets` and
  `query/orders` call `capabilities.ownerScoped(module)` directly off the `capabilities` object
  `requireAssistantCapability` already returns, and pass the resolved `principalId` as the owner
  filter only when it's true. Typed datasets MUST follow that precedent, not the `locals`-based
  helpers. (FR-005 updated below.)
- Q: What is the established policy/mechanism for "sensitive-field permissions" — is there an
  existing per-module sensitive-field masking rule typed datasets should reuse, or does this
  feature need to define a new sensitivity catalog? → A: Reuse the existing one, via the
  gateway-safe form of it. `shouldMaskSensitive(locals, module)` drives human-path PII masking but
  is also `locals`-based and unusable here. Two existing agent-bridge endpoints
  (`query/finance`, `query/bookings`) already solve this correctly by comparing
  `capabilities.fieldLevel(module)` against `SENSITIVE_FIELD_LEVEL` (both from `$lib/permissions`)
  off the same `capabilities` object, with no `locals` dependency. Typed datasets MUST follow that
  precedent for any field the human-facing view already masks; this feature does not define a new
  sensitivity catalog. (FR-004 updated below.)
- Q: Production traffic to the current (broken) `crm_query` tool is 3 calls in 30 days (near
  zero, per audit finding L5: 5 routed turns org-wide in the same window) — how should SC-001
  ("0 of N sampled turns fail") be validated given that waiting for organic production volume
  isn't practical? → A: **(ASSUMPTION — owner to confirm)** Validate SC-001 with a fixed set of
  representative smoke-test turns run against the shipped typed dataset(s) (one turn per
  published dataset, phrased as a real user question), not by waiting on organic production
  traffic. This is a measurement-methodology choice, not a scope change, and the owner should
  confirm this substitutes for "sampled production turns" until usage grows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent answers an ad-hoc grouping/date-range question with a working tool (Priority: P1)

A user in chat asks the organization's personal agent an analytics question that today's fixed-shape
tools don't cover ("what were my top 5 products by revenue last quarter", "how many bookings per
weekday this month"). Today the agent calls `crm_query`, which always 503s, and the turn ends in a
visible failure or a "can't see that" answer. After this feature, the agent resolves the same class
of question through one or more versioned, typed dataset queries and returns a real answer.

**Why this priority**: This is the only user-visible defect in scope — 3 of 3 production calls to
the current tool failed in the last 30 days (L3 in `audits/2026-10-15-agent-harness/00-synthesis.md`).
Everything else in this feature exists to make this story true without reopening the raw-SQL
surface that was deliberately closed on 2026-09-09.

**Independent Test**: Issue a chat turn whose answer requires grouping/filtering/date-ranging over
org data that has no existing fixed-mode query (e.g. revenue by product category, bookings by day
of week). Confirm the agent's tool call succeeds (HTTP 200, non-empty result the model can read) and
the answer reflects the org's actual data, not a 503.

**Acceptance Scenarios**:

1. **Given** an org member with `crm:view` and `finance:view` capabilities, **When** they ask for
   a grouped/ranked view of their own org's CRM or finance data that matches a published dataset,
   **Then** the typed query endpoint returns rows scoped to that org, within the dataset's declared
   row/byte caps, and the agent relays a correct answer.
2. **Given** the same user, **When** they ask a question that matches no published dataset,
   **Then** the agent's tool returns a structured "not supported" result (not a 503, not a stack
   trace) that the model can turn into a graceful "I can't answer that yet" reply.
3. **Given** a user without the capability a dataset declares, **When** they ask a question that
   would use that dataset, **Then** the query is refused with a 403 before any database access,
   and the refusal names the missing capability.

---

### User Story 2 - The dead tool stops being advertised or recommended (Priority: P1)

A developer or auditor inspects what the agent is told about its own tools. Today `crm_query` ships
a ~2 KB Postgres schema in its tool description on every turn, the hub's per-turn envelope prose
explicitly recommends it ("crm_query for any other sorting/grouping/date-range/percentage
question"), and `search_tools` ranks it first for relevant queries — all for a tool that cannot
succeed. After this feature, nothing on either side names, schemas, or recommends `crm_query`;
whatever replaces it (typed datasets from User Story 1) is what gets advertised and ranked instead.

**Why this priority**: This is the cheap, mechanical half of the fix (S0d in
`proposals/2026-10-15-agent-harness-restoration.md`) and it must land in the same change as the
replacement — shipping one without the other leaves either a dead advertisement or an
unadvertised replacement.

**Independent Test**: Inspect the gateway's `tools/list` output and the hub's per-turn context
envelope for a chat session; confirm neither contains the string `crm_query`, and confirm the
same inspection for whatever typed-dataset tool(s) replace it shows them present and correctly
described.

**Acceptance Scenarios**:

1. **Given** any active personal agent session, **When** the gateway reports its tool catalog
   (`tools/list` or equivalent registry enumeration), **Then** `crm_query` is absent.
2. **Given** any chat turn that would have triggered the old envelope prose recommending
   `crm_query`, **Then** the envelope instead names the typed-dataset tool(s) that now cover that
   class of question.
3. **Given** the existing 13 typed `query/*` endpoints (`pos`, `stock`, `finance`, `bookings`,
   `tickets`, `orders`, `projects`, `notes`, `email-ledger`, `sdk-catalog`, `custom-tools`,
   `tool-permissions`) and their gateway tools, **When** this feature ships, **Then** none of
   their request/response contracts, capability checks, or call sites change.

---

### User Story 3 - A low-privilege or wrong-tenant caller cannot see data they are not entitled to (Priority: P1)

A security reviewer (or an attacker who has obtained a valid-looking agent session for one org or
one low-privilege role) attempts to use the new typed-dataset query path to read another org's
rows, a module that's disabled for their org, a field marked sensitive, or more rows/bytes than the
dataset's declared cap. Every one of these must fail before any row leaves the database, with no
reliance on the caller's own request (statement prefix, claimed org id, claimed role) as the
control.

**Why this priority**: This is why the feature is security-tagged. `crm_query`'s predecessor was
closed specifically because "a transaction-local role and a mutable tenant GUC do not isolate SQL
controlled by that caller" (`assistant-query.service.ts`). The replacement must not reintroduce
that failure mode in a new shape — it is the explicit scope boundary in the feature description
("no statement-prefix checks or caller-mutable session context as a sandbox").

**Independent Test**: Run the persona negative-control suite (owner, low-privilege member,
module-disabled org, cross-org caller) against every published dataset and confirm each
disallowed case is refused server-side, independent of any parameter the caller supplies.

**Acceptance Scenarios**:

1. **Given** a caller authenticated for org A, **When** they request a dataset with any org B
   identifier (in a parameter, a filter, or an injected org-id-like string), **Then** the server
   resolves the org from the trusted principal only and returns org A's data or a 403 — never org
   B's data.
2. **Given** a caller whose org has a module disabled (e.g. `finance` off), **When** they request a
   dataset scoped to that module, **Then** the request is refused before query execution.
3. **Given** a caller lacking the capability a dataset declares (e.g. `crm:view` missing), **When**
   they request that dataset, **Then** the request is refused with 403 before query execution.
4. **Given** a dataset that includes a field marked sensitive for the caller's role (e.g. a
   contact's raw phone number for a role without PII access), **When** the dataset is queried,
   **Then** that field is omitted or masked in the response, not merely hidden by client-side
   convention.
5. **Given** a dataset with a declared row limit N and byte limit B, **When** the caller's filters
   would otherwise match more than N rows or more than B bytes, **Then** the database-side query
   itself enforces the cap (not a post-fetch truncation in application code) and the response marks
   `truncated: true`.
6. **Given** any of the four low-privilege personas in the negative-control suite, **When** they
   run the full suite against every published dataset, **Then** every disallowed case returns a
   refusal and zero disallowed cases return data.

---

### Edge Cases

- What happens when a user's question matches a dataset's shape but the dataset version has been
  deprecated/replaced? → The caller gets a structured "deprecated, use vN+1" response, not a
  silent reinterpretation, so an old client doesn't get data it mis-parses, and the model knows a
  newer dataset exists.
- How does the system handle a dataset request for an org that has zero rows for that shape (e.g.
  no bookings in range)? → A successful response with `rows: []`, `rowCount: 0`, `truncated: false`
  — distinguished from a refusal.
- How does the system handle a caller who is a member of multiple orgs and omits the org
  disambiguation that `crm_query`'s `orgId` parameter used to provide? → Same rule the existing
  typed `query/*` endpoints already use: resolve org from the trusted principal/session context,
  with the optional `orgId` parameter honored only when it matches an org the principal actually
  belongs to (never trusted blindly) — this feature does not change that existing contract.
- How does the system handle a dataset query during the 2026-10-11-class incident where
  `tool-permissions` 404s? → Per the existing fail-closed decision this feature depends on but does
  not itself redo (S1/C-S1 in the harness audit), a permission-resolution failure must refuse the
  dataset request, not fall back to an open "legacy hub" mode.
- What happens if two tasks both try to retire `crm_query`'s advertisement without ever shipping a
  replacement dataset? → Out of scope guard: this spec requires the retirement and at least one
  replacement typed dataset to ship together (User Story 2's third acceptance scenario), so a
  partial rollout cannot leave the agent with strictly less capability than today for any question
  a published dataset covers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The gateway MUST stop registering `crm_query` as a callable tool for every agent
  session (no entry in `TOOL_ORDER`/the tool registry, no entry in `tools/list`).
- **FR-002**: The hub's per-turn context envelope MUST stop naming, describing, or recommending
  `crm_query` to the model.
- **FR-003**: The system MUST provide at least one versioned, server-owned typed dataset query
  capability that an agent can call to answer grouping/filtering/date-range/ranking questions over
  org data that the existing fixed-mode `query/*` endpoints do not already cover.
- **FR-004**: Each typed dataset MUST declare, server-side, which module and capability (action)
  it requires, which org-scoping column(s) it joins/filters on, and which fields (if any) are
  sensitive for that module. For any field the human-facing view of the same data already masks,
  the dataset MUST apply the gateway-safe form of the existing per-module sensitive-field check —
  comparing the resolved principal's field level against the module's sensitive-field threshold,
  the way the two existing agent-bridge endpoints that already mask correctly do it — and
  mask/omit the field the same way for callers below that threshold; this feature reuses the
  existing masking determination, it does not define a new sensitivity catalog and does not use
  the human-only (`locals`-based) masking helper, which has no caller identity to key off on the
  gateway bridge (Clarifications, session 2026-10-15).
- **FR-005**: Every typed dataset query MUST resolve, server-side from the trusted assistant
  principal — never from a parameter, header, or other value the caller supplies — before any
  database access: the caller's tenant (org), the module's enabled state, the required capability,
  and, for any module where the human path applies per-record owner scoping, the same owner-scope
  determination off the resolved principal's capabilities — the way the two existing agent-bridge
  endpoints that already scope correctly do it — so a caller whose role is scoped to "own records
  only" gets the same restriction through the agent as through the UI. This reuses the existing
  owner-scope determination; it does not use the human-only (`locals`-based) owner-scope helper,
  which has no caller identity to key off on the gateway bridge (Clarifications, session
  2026-10-15).
- **FR-006**: Every typed dataset query MUST enforce its row limit and a bounded response-byte
  limit at the database query level (e.g. `LIMIT`, capped `SELECT` column list), not by fetching
  an unbounded result and truncating it in application code afterward.
- **FR-007**: A typed dataset query whose result was capped by its row or byte limit MUST say so
  in its response (a `truncated` indicator) rather than silently returning a partial result that
  looks complete.
- **FR-008**: The system MUST reject a typed dataset request for any org, module, capability, or
  field the caller is not entitled to, before executing the underlying query, and the refusal MUST
  be a structured error the calling tool can relay, not a raw exception or timeout.
- **FR-009**: Typed dataset queries MUST be versioned (e.g. a dataset id carries or is paired with
  a version), and the system MUST support deprecating a version without silently changing what an
  existing version id returns to an unmigrated caller.
- **FR-010**: The system MUST NOT implement the new typed dataset queries' tenant/module/owner
  isolation via a caller-supplied SQL statement prefix, a caller-mutable session/connection-local
  variable (e.g. a settable GUC), or any other mechanism where correctness depends on the calling
  tool behaving honestly. Isolation MUST be enforced by server-side code that constructs the query
  from a fixed, parameterized template per dataset.
- **FR-011**: The system MUST NOT reintroduce an endpoint that accepts caller-authored free-form
  SQL or an equivalent caller-authored query language; `POST /api/gateway/query` stays retired
  (`ASSISTANT_SQL_DISABLED`) and is not reused or resurrected by this feature.
- **FR-012**: The retirement of `crm_query` (FR-001, FR-002) and the shipping of its typed-dataset
  replacement(s) (FR-003) MUST ship in the same change, so that no question a published dataset
  can answer today becomes unanswerable by the agent at any point after this feature merges.
- **FR-013**: The existing 13 typed `query/*` endpoints and their gateway tools (`pos`, `stock`,
  `finance`, `bookings`, `tickets`, `orders`, `projects`, `notes`, `email-ledger`, `sdk-catalog`,
  `custom-tools`, `tool-permissions`, plus `crm_insight`/`crm_search`/`search_crm_conversations`/
  `crm_conversation_themes`) MUST continue to function unchanged — this feature adds a new
  mechanism alongside them, it does not refactor or re-route them.
- **FR-014**: The system MUST be qualified with a persona-based negative-control test suite that
  exercises, for every published typed dataset: an owner/full-capability caller (positive control),
  a caller lacking the dataset's required capability, a caller whose org has the dataset's module
  disabled, and a caller attempting to access another org's data — and MUST demonstrate every
  disallowed case is refused and zero data crosses the boundary.
- **FR-015**: `search_tools`/tool-ranking behavior MUST NOT rank the retired `crm_query` for any
  query (it no longer exists to be ranked); the replacement typed-dataset tool(s) MUST be
  discoverable through the same ranking/discovery mechanism existing typed tools use today.

### Key Entities

- **Typed dataset query**: A versioned, server-defined read shape (id + version) over one or more
  org-scoped tables, with a declared required module+capability, a declared row/byte cap, and a
  declared sensitive-field policy. Replaces the open-ended "any SQL" shape `crm_query` offered.
- **Dataset catalog**: The server-side registry of published typed datasets (analogous to the
  existing `mode=` switches inside `query/pos`, `query/stock`, etc., but intended to cover the
  grouping/ranking/date-range question space those fixed modes don't), which the gateway and/or
  `search_tools` can enumerate to decide what to advertise.
- **Assistant principal**: The already-existing trusted identity (org, profile/owner, capabilities)
  resolved server-side from the agent's session — this feature consumes it, it does not change how
  it is resolved (`resolveAssistantPrincipal` / `requireAssistantCapability`).
- **Persona negative-control suite**: The qualification artifact — a fixed set of caller personas
  (full access, under-capability, module-disabled org, cross-org) run against every dataset to
  prove the isolation and refusal behavior in FR-005–FR-008, FR-014.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent turn asking a grouping/date-range/ranking question that a published typed
  dataset covers returns a correct, data-backed answer instead of a tool failure — measured as
  0 of N turns returning a 503 or tool error, where today it is 3 of 3 over 30 days. Per
  Clarifications (session 2026-10-15), N is a fixed smoke-test set (one representative question
  per published dataset) rather than organic production samples, because current production
  volume is near zero (audit L5).
- **SC-002**: Zero occurrences of the string `crm_query` in the gateway's advertised tool list or
  the hub's per-turn envelope text after this feature ships, verified by an automated check rather
  than manual inspection.
- **SC-003**: 100% of the persona negative-control suite's disallowed cases (wrong org, missing
  capability, disabled module, over-limit result) are refused with zero data leakage, across every
  published typed dataset, on every run.
- **SC-004**: Every published typed dataset response that hits its row or byte cap is distinguishable
  from a complete response by a caller inspecting only the response body (the `truncated` signal),
  100% of the time.
- **SC-005**: The 13 pre-existing typed `query/*` endpoints and 4 pre-existing CRM gateway tools
  show no behavior change (same request/response shape, same capability checks) after this feature
  ships, verified by their existing test suites continuing to pass unmodified.

## Assumptions

- **(ASSUMPTION — owner to confirm)** "At least one versioned typed dataset" (FR-003) is sufficient
  scope for this feature; the feature description says "versioned, server-owned typed dataset
  queries" (plural) but does not enumerate which specific grouping/ranking question shapes must
  ship on day one. This spec treats the exact dataset catalog (which questions, how many datasets)
  as an implementation/planning decision, not a spec-level requirement, because the audit evidence
  names the architectural defect (a dead, unscoped SQL tool) but not a target list of analytics
  questions to cover.
- **(ASSUMPTION — owner to confirm)** The new typed dataset mechanism is a new, separate code path
  from the 13 existing hand-coded `mode=` switch endpoints (`query/pos`, `query/stock`, etc.),
  consistent with proposal slice S4 being listed independently of S3 (the generic action
  dispatcher) and of the existing `query/*` endpoints. This spec does not require collapsing the
  existing `mode=` endpoints into the new mechanism, only that both coexist unchanged (FR-013).
- **(ASSUMPTION — owner to confirm)** "DB-side row limits and bounded bytes" means each dataset's
  server-side query template carries its own fixed `LIMIT` and column projection, not a shared
  global cap — consistent with how `query/tickets` already caps at 50 and the retired `crm_query`
  schema said "max 200 rows." This spec does not mandate one universal cap for all datasets.
- Reusing `requireAssistantCapability` / `resolveAssistantPrincipal` for tenant+capability
  resolution is assumed acceptable groundwork (it is the existing, audited mechanism every other
  `query/*` endpoint already uses). Module-enabled state is tracked as an open security finding
  against the broader harness (E-S6, "0 of 48 gateway endpoints call `isModuleEnabled`") rather
  than something this spec re-derives from scratch; FR-005 requires typed datasets to resolve it,
  but *how* `isModuleEnabled` gets wired into the assistant principal path is shared groundwork
  with that finding, not reinvented per dataset.
- The envelope prose and tool-list retirement (User Story 2) is scoped to the gateway
  (`minion-tools.ts`, `TOOL_ORDER`) and hub (`assistant-context.ts`) locations the feature
  description and audit evidence name; this spec does not require auditing every other place a
  tool name could theoretically be echoed (e.g. historical chat transcripts, cached envelopes).
- "No statement-prefix checks or caller-mutable session context as a sandbox" (feature description)
  is interpreted as an explicit prohibition on the isolation strategy the retired `crm_query` path
  used to rely on (a transaction-local role plus a settable GUC) — see `assistant-query.service.ts`'s
  own comment on why that failed. FR-010 encodes this directly.