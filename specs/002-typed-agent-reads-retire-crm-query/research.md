# Phase 0 Research: Typed Agent Reads, Retire crm_query

No Technical Context fields were left as `NEEDS CLARIFICATION`. This phase resolves the two
design decisions plan.md deferred ("decided in research.md") so Phase 1 can commit to concrete
file paths, plus the owner-scope/field-masking mechanism correction surfaced while reading the
precedent endpoints.

## R1. Owner-scope and field-masking mechanism (correction to spec Clarifications)

**Decision**: Resolve owner scope via `capabilities.ownerScoped(module)` and field sensitivity via
`capabilities.fieldLevel(module) < SENSITIVE_FIELD_LEVEL` (`$lib/permissions`), both read off the
`capabilities` object `requireAssistantCapability`/`resolveAssistantPrincipal` already returns.
Never call the `locals`-based `resolveOwnerScope(locals, module)` / `ownerFilter(locals, module)` /
`shouldMaskSensitive(locals, module)` helpers from a typed dataset endpoint.

**Rationale**: While drafting this plan, `query/finance/+server.ts` was re-read and carries an
explicit comment: `shouldMaskSensitive` "keys off `locals.user`, which is unset for gateway/
server-token callers, so it would silently apply the wrong default here." `query/tickets/
+server.ts` carries the matching comment for `ownerFilter`. Both existing endpoints already solved
this correctly — `query/tickets` and `query/orders` use `capabilities.ownerScoped(module)` for
owner scope; `query/finance` and `query/bookings` use `capabilities.fieldLevel(module)` for
masking. This precedent was not yet reflected in the initial Clarifications pass (which named the
`locals`-based pair); spec.md FR-004/FR-005 and this plan's Technical Context have been corrected
to the right-precedent mechanism before Phase 1 design.

**Alternatives considered**:
- *Add `locals.user`/`locals.tenantCtx` shims to the gateway request path so the `locals`-based
  helpers "just work."* Rejected: broader surgery on `resolveAssistantPrincipal`'s contract than
  this feature's scope, and it would re-derive something `capabilities.ownerScoped`/`.fieldLevel`
  already does correctly for the exact same object this feature already depends on.
- *Have each new dataset endpoint re-implement its own masking/owner-scope check from raw role
  data.* Rejected: duplicates logic FR-004/FR-005 require reusing, and is exactly the "new parallel
  mechanism" the Clarifications session ruled out.

## R2. Dataset packaging: one generic parameterized endpoint vs. one endpoint/tool per dataset shape

**Decision**: Follow the exact precedent of the 13 existing `query/*` endpoints — one hub endpoint
per data *domain*, dispatching on a `mode` query parameter to one of several fixed shapes within
that domain (as `query/pos` does for `sellables`/`shift`/`tickets` and `query/stock` does for
`levels`/`movements`/`valuation`/`consumption`/`accruals`); one gateway tool per domain (as
`finance_query`, `bookings_query`, `tickets_query`, `orders_query`, `projects_query`, `stock_query`
already do). A brand-new grouping/ranking/date-range *domain* this feature introduces gets its own
`query/<domain>/+server.ts` + one gateway tool, not a single do-everything endpoint and not a
one-endpoint-per-exact-shape explosion.

**Rationale**: This is the one pattern already proven at this exact seam (agent-bridge read
endpoints), already reviewed, already has working RBAC/owner-scope/masking precedent (R1), and
keeps `TOOL_ORDER`/tool-registry wiring (FR-001, FR-015) identical in shape to every other hub
module tool the gateway already instantiates. It also directly satisfies FR-009 (versioning): a
`mode` value can be deprecated and a `v2` shape added under a new `mode` without touching the
dataset's sibling modes, exactly as `query/stock`'s five modes already coexist.

**Alternatives considered**:
- *One single generic `typed_query` tool taking a `datasetId` + typed params, dispatching via a
  registry map.* Closer to what `crm_query` tried to be generic about (minus the raw SQL), and
  reopens the exact shape of surface the 2026-09-09 containment closed — a single endpoint whose
  behavior is chosen by an arbitrary caller-supplied id/param combination, instead of a fixed route
  per reviewed shape. Rejected for this feature; it is explicitly the kind of "caller-mutable"
  flexibility FR-010 rules out for isolation, and the audit's structural observation (A-coverage
  §5 cause 3: "reads are hand-coded `mode=` switches... every new read shape is a new branch") is
  the status quo this feature is extending, not replacing — collapsing the pattern wholesale is
  explicitly proposal slice S3's territory (the generic action **dispatcher**), not S4's.
- *A fully declarative dataset-definition DSL (JSON/YAML describing columns, joins, filters) read
  by one generic executor.* Rejected as premature generalization for "at least one dataset" scope
  (spec Assumption 1) — the existing `mode=` pattern already proves out at 13 endpoints without
  one, and a DSL is exactly the kind of "nobody asked for it yet" abstraction to avoid per Minion's
  lazy-complete-change norm; revisit only if/when the dataset count grows enough that per-mode
  branches become the bottleneck (not evidenced today — 3 calls/30 days).

## R3. Day-one dataset selection

**Decision**: Ship a new `query/analytics` domain (or an addition to an existing domain if Phase 1
data modeling finds a closer-fitting owner module) with a first mode covering invoice/sales
grouping-by-category-or-time-period and top-N ranking — i.e., exactly the two phrases the retired
envelope prose used to justify `crm_query`'s existence ("any other sorting/grouping/date-range/
percentage question"). This is scoped as **one** mode for day one per spec Assumption 1; additional
modes/domains are follow-up work, not blocking this feature's `/speckit-tasks` breakdown.

**Rationale**: `query/finance` already returns a fixed revenue series + top products/clients
(`financeSummary`/`revenueSeries`/`topProducts`/`topClients`), which covers *some* of the
grouping/ranking space already — Phase 1 data modeling must check whether the day-one dataset is
better delivered as a new `mode` on the existing `query/finance` domain (extending, not duplicating,
an already-owner-scoped and already-masked endpoint) versus a new domain. Either way, the shape
answers a real example from the retired tool's own envelope sentence, keeping SC-001's smoke test
concrete and traceable to the defect it fixes.

**Alternatives considered**:
- *CRM/contact-centric grouping (e.g., contacts by lifecycle stage by month).* Deferred: `crm_
  insight`/`crm_search`/`search_crm_conversations`/`crm_conversation_themes` already cover much of
  the CRM question space; finance/sales grouping is the gap the audit's envelope-prose evidence
  points at most directly.
- *Booking/scheduling grouping (e.g., bookings per weekday).* Noted as a strong second candidate
  (matches audit L4's domain, stock/bookings) but not selected for day one since the feature
  description's own evidence (envelope prose) names "sorting/grouping/date-range/percentage"
  without naming a domain, and finance is the domain with the most existing owner-scope/masking
  precedent (R1) to build the first dataset against with the least new risk.
