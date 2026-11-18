# Feature Specification: FACES receivables and pending-work audit

**Feature Branch**: Not created; docs-only planning. Future slices target Hub `master`.
**Created**: 2026-11-16
**Status**: Draft — owner data-spec approval pending; independent review results under egm/
**Input**: Proposal F7: explain old rows and reconcile true debt, paid-but-unlinked, free, cancelled/no-show, unused reservations and stale state without mass marking rows paid.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explain what the count represents (Priority: P1)

A permitted reviewer gets a dated organization-scoped report separating pending scheduling, unbilled bookings, account balances and payment plans, with source IDs for each contributing record.

**Why this priority**: A work count can include already-paid treatments; treating it as debt risks collecting twice.
**Independent Test**: Synthetic paid-unscheduled and unpaid-scheduled records contribute to separate count components; a free follow-up contributes to neither unbilled debt nor charge action.
**Acceptance Scenarios**:

1. **Given** one paid service awaiting scheduling and one unbilled booking, **When** audit runs, **Then** pending work is two with two explicit components; it is never labelled two unpaid debts.
2. **Given** more clients than the account list limit, **When** audit runs, **Then** every authorized scoped row is reconciled without silent truncation and list pagination/limits do not hide a residual.
3. **Given** concurrent booking/payment changes, **When** a report is produced, **Then** its inventory and control totals share one snapshot and the report states that snapshot.

### User Story 2 - Classify old rows without inventing settlement (Priority: P2)

The reviewer sees evidence, uncertainty and the next action for each old record.

**Why this priority**: Age or completion does not prove payment or debt.
**Independent Test**: A matrix of free, null-price, cancelled, no-show, completed-unlinked, voided-payment, package-funded and plan-funded records retains the correct distinctions.
**Acceptance Scenarios**:

1. **Given** an old booking with no trustworthy price or settlement evidence, **When** classified, **Then** it remains unresolved and is not marked paid or assigned an invented collectible amount.
2. **Given** a free booking, cancelled/no-show row or unused reservation, **When** reviewed, **Then** the report explains the classification and retains operational history without collecting or completing it.
3. **Given** a positive priced service and evidence of actual delivery with no settlement, **When** reviewed, **Then** it is a candidate genuine debt with amount/currency and the exact approved typed evidence contract; normal collection remains separately available after human confirmation.

4. **Given** apparent partial or refund/wallet/invoice money without the selected complete settlement proof, **When** reviewed, **Then** the row stays unresolved with an unknown remainder, rather than an invented amount to collect.
5. **Given** a currently free booking with an evidenced historical charge and delivery, **When** complete authorized evidence proves no recorded settlement, **Then** the historical debt candidate remains distinct from its current-free exclusion in the work count.

### User Story 3 - Prepare exact corrections for human approval (Priority: P2)

A reviewer prepares a before/after proposal linking an existing payment record to its proven booking, or explaining why further evidence is required.

**Why this priority**: Proven paid-but-unlinked rows must not be collected again.
**Independent Test**: A synthetic ambiguous pair produces no apply proposal; a uniquely proven pair produces one deterministically identified, hashed proposal whose expected outcome is a link only, zero new payment and zero stock/lifecycle mutations.
**Acceptance Scenarios**:

1. **Given** an unlinked paid line and proven same-customer, same-service booking, **When** selected, **Then** the report contains exact IDs, constraints and projected count deltas for approval; it does not execute the repair.
2. **Given** a voided ticket, conflicting identity, partial payment, split service quantity or multiple plausible bookings, **When** candidate generation runs, **Then** it is unresolved/manual review, never an automatic link.
3. **Given** the pair were the client’s last pending work and no wallet/funding key remains, **When** a link is proposed, **Then** its hashed explanation predicts the logical account row may disappear while wallet amounts stay unchanged; it makes no promise about the limited rendered list.
4. **Given** an approved proposal becomes stale, **When** later execution is attempted by a separately approved repair slice, **Then** it must revalidate the entire pair and refuse changed data.

### Evidence authority acceptance

A capable non-owner may run an approved evidence-free inventory, with missing historical facts unresolved. The same principal with any external evidence is denied before subject reads; an actual owner with required effective authority may admit only their own exact approved assertions. Owner-role revocation, an owner lacking effective authority and a different verifier are denied.

### Edge Cases

- Completed but unbilled; old accepted reservation never attended; price changed since booking; absent or inactive product resolves null rather than zero.
- Package grants, redemptions, instalment plans, refunds, void/legacy voided tickets, split payments, imported invoices and missing links.
- Customer party/contact aliases, deleted contacts, missing identity, multiple currencies, grouped appointments, quantities greater than one.
- Paginated account display versus complete audit; badge/list predicate differences; one record contributing to more than one independent financial facet.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Produce a read-only, bounded-memory, complete organization-scoped audit with snapshot timestamp, source version, parameters, all source IDs and control totals.
- **FR-002**: Explain pending-work count as paid-unscheduled service lines plus eligible unbilled bookings; show client balances and open plans separately, by currency.
- **FR-003**: Reuse canonical eligibility rules, including zero-price exclusion, void/voided handling, invoice links, package grants and plans; expose any existing reader disagreement as a residual instead of silently normalizing it.
- **FR-004**: Assign one primary review classification per audited subject and preserve orthogonal facts such as operational status, funding and payment linkage. Supported classes are genuine-debt candidate, paid-but-unlinked candidate, free, inactive, unused-reservation candidate, stale-lifecycle candidate and unresolved.
- **FR-005**: Require evidence of service/delivery, contractual amount/currency and absence of settlement before recommending collection; current catalog price or age alone is insufficient.
- **FR-006**: Keep missing price, identity, settlement and attendance unknown. Never mark old rows paid/completed, cancel them, create a new payment or post stock through this audit.
- **FR-007**: Prepare exact, immutable repair proposals only for evidence-backed pairs; human approval and revalidation are required in a separate execution step. Matching names, dates or amounts alone is insufficient.
- **FR-008**: Reconcile inventory counts to canonical badge and account projections with explicit component-level residuals; do not sum currencies or mix row count and client count.
- **FR-009**: Require authenticated organization and existing POS/finance review authority; apply customer/cost masking to exported material and deny another tenant's records.
- **FR-010**: Enforce these evidence and artifact obligations:
  - External-evidence runs require the executing authenticated principal to be the fresh organization membership owner, with all effective review/export authority checks retained; every assertion verifier equals that executing owner.
  - Evidence-free runs retain capable-reviewer admission.
  - Admit only the exact owner-approved evidence digest and assertions, within the defined booking-start/ticket-submission cohort bounds.
  - Keep run metadata outside stable proposal identity.
  - Protect reports as sensitive artifacts, retain the manifest/checksums and access/run identity, and export only fields needed for review.
- **FR-011**: Test all classification, limit, concurrency, currency and tenancy boundaries with synthetic data before any approved live read.

### Key Entities

- **Audit run**: Organization, snapshot, version, approved scope, run actor, control totals and checksums.
- **Audit subject**: Booking or paid-unscheduled service line, with evidence, classification, uncertainty and recommended next step.
- **Repair proposal**: Exact original facts, proposed link, proof, predicted deltas, immutable hash and pending human approval.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every synthetic scoped pending-work subject appears once in its count component, and component counts reconcile to the canonical count or an explicitly explained residual.
- **SC-002**: All free, cancelled/rejected/no-show and already-settled test cases avoid a recommendation to collect again.
- **SC-003**: Every debt candidate has delivery, amount/currency and settlement evidence; every missing fact is visible as unresolved.
- **SC-004**: Two identical audits of unchanged synthetic data produce identical sorted subject content/checksums, and zero changes to payment, booking, stock or ledger tables.
- **SC-005**: Every proposed paid-line linkage preserves original payment totals/dates and predicts zero new payment or stock effect.

## Assumptions

- Meeting numbers 280→186 are historical statements, not a target count or current observation. A bounded November 16 live-read summary observes 184 pending-work subjects, split 1 paid-unscheduled + 183 unbilled, not measured debt. Row classification/settlement and current totals after that snapshot remain unknown.
- Positive financial conclusions use deliberately narrow complete evidence cases. Partial payments, refunds, wallet allocations and ambiguous financial paths remain unresolved; a finite approved date interval does not authorize reading all customer history or claiming complete settlement.
- The audit is an operational diagnostic with repair proposals; collection and production repairs remain separate approved work. No settlement rule is inferred from the meeting.
- A cancelled/no-show row is an operational exclusion, not proof no contractual cancellation fee exists; such debt needs independent evidence outside the booking count.

## AS-IS → TO-BE → DELTA

AS-IS at pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`: `countPosPendingWork` (`src/server/services/pos-accounts.service.ts:540`) sums paid-unscheduled service lines and unbilled bookings. `pos/accounts/unbilled.ts:24` excludes zero-priced active products, inactive statuses, invoice/grant/plan links and live ticket links; null price stays eligible. No age cutoff or completed exclusion exists. `pos/accounts/list.ts:12` is a client summary capped at 500; its pending-scheduling predicate differs from the badge for legacy `voided`. See [research.md](research.md) for exact anchors.

A bounded [live-read baseline](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed `2026-11-16T19:20:30.051Z` under repeatable-read READ ONLY/app_ledger, reports 1 paid-unscheduled + 183 unbilled = 184 pending-work subjects. It does not establish real debt or current post-snapshot totals.

TO-BE: an evidence-led report that distinguishes pending operations, settlement, uncertainty and real collection work.

DELTA: add read-only row inventory, deterministic classification, control totals and repair proposal generation. Preserve eligibility rules, expose disagreements, make no production mutations. US1 proves totals; US2 proves classification; US3 proves safe proposal boundaries.

## Alternatives Considered

Reject mass marking old records paid, treating age as debt, or matching payments by names/amounts alone: these can erase uncertainty and cause duplicate collection. Select a read-only same-snapshot classification report with inert, evidence-bound linkage proposals. Production repair remains a separately reviewed execution slice, which adds a later gate but keeps this audit free of mutation authority. Detailed alternatives are in [research.md](research.md).

## Approval and release gates

Data-tagged: owner approval of this spec is pending before product implementation, human merge required. Independent review results are recorded under egm/. Live reads require exact approved organization/time scope and protected output location. A later repair requires its own reviewed dry-run, exact row approval and reversible execution design; this spec provides no apply mode. No product implementation, live audit, repair or release has occurred.

The audit and its dependent correction consumers require the authority bridge and snapshot-principal prerequisites listed in [plan.md](plan.md#prerequisites-and-normative-contracts). Excluding a booking from the badge because its current catalog price is zero does not establish whether a historical charge was settled or waived.

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: research.md

### Research: F7 pending work is not a debt count

#### Terms used across this package

- **U**: the subjects inside the owner-approved cohort interval in `AuditScope.permittedCohort`. U is *unbounded* when both bounds are null (coverage `organization_all_date`) and *finite* otherwise (coverage `approved_scope`).
- **C**: the subjects inside the selected CLI cohort interval (`--after`/`--before`), which is contained in U's interval; omitted flags inherit U's bounds. **U-minus-C** is the complement: subjects in U and not in C.
- **CoreTx**: the one owned `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` transaction (RR READ ONLY) under `app_ledger` with exact org/profile GUCs; every audit read uses it.
- **Read-only authority bridge**: `public.minion_operator_authority_v1(..., p_lock_rows => false)`; the **write-admission bridge** is the same function with `p_lock_rows => true` ([authority-bridge.md](contracts/authority-bridge.md)).
- **Org authority lock** `hashtextextended(orgId, 112)` and **profile lock** `hashtextextended(profileId, 114)`: the existing advisory transaction lock keys.
- **native8**: the eight required behavior names of the F7 qa-native suite (quickstart.md); **source13**: the thirteen names of F3's source suite.
- **Decision-table row IDs**: B1–B8 are the booking rows and L1–L4 the paid-unscheduled-line rows in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#exhaustive-ordered-classification). H, A, B, F, `Unused` and `Stale` are defined beside the booking table.

#### Evidence boundary and linked reading list

Source inspected under `.local/faces-followups-2026-11-16/hub-source`, pinned `c6c2d5739572356239c4048c0f564f40b0768adc`. Historical meeting numbers are not live measurements. No production records, names or credentials are copied into these local planning artifacts. Source inspection establishes predicates and seams, not correctness of current account balances.

| Source | Finding | Consequence |
|---|---|---|
| [pos-accounts.service.ts:533](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos-accounts.service.ts#L533) | Badge is pending **work**: paid service lines awaiting scheduling plus scheduled unbilled bookings. Badge excludes `void` and legacy `voided`. | Do not call the total unpaid receivables or use meeting 186 as a cleanup target. |
| [pos/accounts/unbilled.ts:24](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos/accounts/unbilled.ts#L24) | Excludes cancelled/rejected/no_show, grant, plan and invoice links; excludes active resolved zero-price product and any ticket-linked booking with ticket not void/voided. No age/completed rule. | A completed old booking can qualify; null/inactive product is not the same as free. Absence of link is eligibility, not proof of debt. |
| [pos/accounts/list.ts:12](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos/accounts/list.ts#L12) | Client-key projection, default limit 200/max 500; merges party/contact identity, balances per currency, plans, grants, pending scheduling and pending invoice counts. Pending-scheduling CTE excludes only `void`, unlike badge. | Row inventory cannot be built from limited clients; report legacy voided disagreement with exact subjects and count residual. |
| [pos/accounts/detail.ts](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos/accounts/detail.ts) and [resolve.ts](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos/accounts/resolve.ts) | Wallet uses canonical identity resolution, preserves missing/deleted identity and currency buckets. | Reuse exact identity resolver, no name-only matching or currency addition. |
| [visit.ts:282](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/scheduling/visit.ts#L282) | Chargeable cash rows require not paid, not inactive, price != 0; null price remains allowed. | Audit must explain null price as unresolved financial evidence; do not change established UI rule through audit. |
| [scheduling-bookings.service.ts:3495](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L3495) | The `TODO(handoff)` at line 3495 says: "`paidAmount` sums every non-void line of the member regardless of the charging ticket's currency, and `currency` is the NEWEST of those tickets." Design inference (not stated by the TODO): a summed line amount is not settlement proof. | Do not infer full cash settlement from paidAmount/paid boolean alone; inspect payments, plan/grant funding, invoices and void/refund facts. |
| [scheduling-bookings.service.ts:751](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L751) | `bookAndLinkTicketLine` creates/schedules and links atomically, recovering an existing live link. | Do not call it to attach an old existing appointment: that could create a new appointment. Existing-booking repair needs separate exact-row design. |
| [pos-accounts.service.ts:651](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos-accounts.service.ts#L651) | `bookingTicketLinks` reads direct pos_ticket_lines.booking_id links and ticket product lines only; it has no invoice bridge. | Read separate same-org explicit invoice and provider-reference closure before suggesting a pair, per contracts/invoice-linkage.md. |
| [accounts route](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/pos/accounts/%2Bserver.ts), [rbac.service.ts:1088](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/rbac.service.ts#L1088) | Current account read requires pos:view; fresh transaction capabilities are available but use SELECT FOR SHARE. | Audit includes finance and PII: require full approved review authority and field masking; don't bypass with arbitrary tenant ID. |
| [with-org-core.ts:93](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/db/with-org-core.ts#L93) | Explicit org/profile GUC and app_ledger role support tenant scope; ambient tx may be reused by normal web readers. | Audit owns one explicit read-only repeatable-read transaction; no accidental ambient read-committed snapshots. |

#### Bounded live baseline

The coordinator's [sanitized read summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) observed at `2026-11-16T19:20:30.051Z`, one repeatable-read READ ONLY `app_ledger` snapshot, records the pinned canonical pending-work predicates as **1 paid service line awaiting scheduling + 183 unbilled bookings = 184 pending-work subjects**. The private raw evidence SHA-256 is `9f028bd6c26af39deb6383a2f12cdbe07799bb2b150549b1f987c6bf332277a7`. This is a bounded live count of work, not measured debt or row-level classification. Counts can change after the snapshot. Meeting-time 186 remains historical and is not a target.

#### Decisions, rationale and alternatives

1. **Read-only operator tool and service**, not a new collection UI. Proposed `scripts/faces-receivables-audit.ts` calls `src/server/services/pos/accounts/audit.ts`; deterministic classification stays in `audit.logic.ts`. The owner authorizes exact org/profile/scope/output before live execution. Alternative: add an admin page now, rejected as unnecessary scope before actual row evidence.
2. **Complete row inventory**, not `listClientAccounts` loop: reuse canonical eligibility and identity expressions in transaction-accepting pure query fragments; stream stable keyset batches under one owned snapshot. Control totals include all org pending work, cohort subset and outside-cohort complement. Default cohort is all dates; a reviewer may request an old-date cohort explicitly. No invented old-age cutoff.
3. **Classification is a review recommendation**, not a lifecycle status. Orthogonal status/funding/settlement facts are retained. A null price and absent attendance evidence stay unresolved; old completed rows are not settled by this tool. Alternative: mark old rows completed/paid rejected.
4. **Existing disagreement stays visible**: badge and list differ for legacy voided pending lines; list limit and identityless paid lines can also explain count differences. Report both control definitions; every residual subject is streamed to `residuals.jsonl` and the summary carries counts, a capped sample and a digest ([audit-cli.md](contracts/audit-cli.md#residual-output)). A later behavior fix requires its own reproduction/spec delta, never an unannounced audit patch.
5. **Repair proposals only**: emit exact line/booking pairs with proof and immutable hash. Existing bookAndLinkTicketLine is scheduling, not a safe historical-link API. Ambiguous, split, partially settled, plan/grant, fiscal or stock-owned cases are blocked for manual design. Alternative: fuzzy names/date matching + automatic update rejected.
6. **No business-table schema change** (the separately selected bounded authority-function security migration remains required): report manifests and subject inventories are protected files; no audit bookkeeping write in the read-only DB transaction. File output is created in a private staging directory and atomically published after all consistency checks. On failure the CLI keeps the staging directory as a labelled incomplete artifact and never publishes a manifest; the exact rule is in [audit-cli.md](contracts/audit-cli.md#snapshot-bounds-and-files).

#### Read-only RBAC compatibility finding

`rbac.service.ts:1101` fresh capability resolver selects organization membership/roles with `FOR SHARE`. PostgreSQL read-only transactions cannot use those row locks. The audit must use a tested nonlocking snapshot adapter with the same policy/role composition; preserve current locking resolver defaults. Ordinary resolver invocation inside READ ONLY is not a runnable plan.

#### Unknowns kept explicit

Current backlog after the bounded snapshot, original meeting-time count, affected booking/payment identities, contractual debt evidence and historical price remain unknown in this spec. Full source rules are known enough to plan a read-only audit. Applying repairs is deliberately not authorized or implemented here.

#### Evidence and proposal decisions

`bookingTicketLinks` has no invoice bridge. Existing `listBookingsForInvoice` (scheduling-bookings.service.ts:3339–3397) and `ticketRefsForBookings` (3659–3750) demonstrate distinct invoice linkage paths but own transactions; audit.ts uses the exact same-CoreTx closure in [invoice-linkage.md](contracts/invoice-linkage.md). Because invoice providerRef is unique only with provider (pg-finance-schema.ts:24–60), ambiguous same-reference matches stay blocked, not first-row chosen.

[evidence-and-proposals.md](contracts/evidence-and-proposals.md) selects bounded owner-attested evidence admission, exact sufficient assertions and stable canonical approval content separated from new-run metadata. The document hash is an integrity reference, not independent proof of a business fact. Missing/contradictory evidence produces unresolved rows, not fabricated positive fixtures. [audit-cli.md](contracts/audit-cli.md) selects exact booking-start/ticket-submission date intervals and approved-scope coverage; no creation/payment timestamp or guessed old-age cutoff substitutes.

F7 owns and qualifies the shared operator-principal helper and the uncached nonlocking capability entrypoint; F1/F2 consume their exact interfaces. The existing write resolver retains FOR SHARE and identical role composition. Required native SQL evidence is admitted exactly once to the existing qa-native manifest; ordinary Vitest exclusion is not qualification. Full commands, marker/privilege checks and one owned disposable database isolate public-qualified canonical predicates without touching shared QA public tables. Owner data/security approval and execution gates remain pending.

#### Shared standalone bootstrap

[operator-bootstrap.md](contracts/operator-bootstrap.md) records the actual five-entry Bun shim limitation, transitive server/lib and lucide Svelte dependencies, and installed Vite/Kit/Svelte plugin source checks. The selected delta is one shared Vite SSR loader using standalone svelte(configFile:false), with its irrelevant inspector plugin removed (Vite envDir:false already prevents its env-file reads), explicit aliases and three closed empty-env/app virtual modules. Full sveltekit() is excluded because it independently loads app dotenv. F7 owns the loader and standalone real-package canary/injection smoke; F1/F2 depend on that qualification. Existing shim remains unchanged. Static source inspection is not runtime proof; owner approval and implementation/smoke results remain pending.

#### Selected evidence-attestation boundary

The fresh resolver exposes membershipRole separately from effective/custom role keys. This design selects actual same-snapshot owner membership for evidence-bearing runs, with verifiedByProfileId equal to the executing owner; it does not add delegation or infer ownership from identity. Evidence-free reporting retains existing capable-reviewer admission. Owner authority never bypasses effective field/module/capability restrictions. See contracts/evidence-and-proposals.md for the exact admission and denial contract.

#### Existing field-tier source boundary

Pinned `src/lib/permissions.ts:128` restricts FIELD_LEVEL_MODULES to crm/finance/scheduling; `src/server/services/rbac.service.ts:217` defaults stock to 0 and its role-override path also keeps stock field tier 0. The audit report carries cost-bearing financial data, so it requires the existing `finance:view` capability and finance sensitive tier with enabled finances and the POS gates. Its stock evidence is quantity/source only and needs no stock field tier. Tests cover ordinary-owner and custom-role admission and finance denial.

#### Bootstrap staging, financial closure and account controls

T008 qualifies the foundation helpers and existing roots only, without an audit root or type; T011 and T014 create the audit root, runner and dispatch before full positive qualification. Dependent consumers cannot treat foundation proof as bootstrap qualification. Both source kinds have complete ordered tables and exact unused/stale/conflict/no-change rules.

Financial positives are deliberately bounded: same-snapshot complete canonical-party/document closure, either no stored money/funding for historical debt or exactly one fully paid ordinary one-service-line ticket for paid linkage. pg-party-schema.ts:25–43 supplies actual doc fields; pg-finance-schema.ts:24–130 supplies fin_clients.party_id/document probes, invoice and finance payment provenance; pg-pos-schema.ts supplies ticket-level payments and signed client ledger. Document probes do not infer booking links. Actual normalizeMethods (pos/settings.ts with credit-method-policy.ts) supplies credit-decision policy; no hardcoded tender inference. Partial/refund/wallet/invoice/unknown allocations remain unresolved with null remainder, and finite approved U never widens for all-date financial closure.

list.ts:102–156 supplies exact logical account-key union and pending predicates. The hashed LinkIntent contains typed wallet/account-display effects and the canonical same-client account-control source hash. A pure one-line linkage can remove its last logical account row while money is unchanged; rendered capped/sorted list membership is explicitly unpredicted. Scope, authority, native-auth, exactAssertions and human gates are unchanged. Runtime qualification remains pending.

### Review artifact: plan.md

### Implementation Plan: FACES receivables and pending-work audit

**Branch**: Not created | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

#### Summary

Implement an operator-only read-only row audit explaining the two canonical pending-work components, settlement/funding evidence, historical uncertainty and per-currency financial facets. Generate exact repair proposals for owner review; no apply flag, payment/stock mutation or mass lifecycle cleanup. Preserve reader differences as residuals.

#### Technical Context

**Language/Version**: strict TypeScript under Hub Bun; application service aliases use the qualified Vite SSR loader selected in contracts/operator-bootstrap.md, after target/principal admission.
**Primary Dependencies**: PostgreSQL/Drizzle, org transaction scope, pos/accounts canonical identity and eligibility, existing money decimal parsers, a nonlocking fresh RBAC snapshot adapter.
**Storage**: Read-only PostgreSQL; local protected JSONL subjects, summary JSON, proposal JSON and SHA-256 manifest. No new DB tables.
**Testing**: Vitest pure classifier and runner tests, real SQL integration using synthetic multi-org fixture.
**Target Platform / Project Type**: Hub operator CLI and internal server service; no page, route or nav addition.
**Performance Goals**: Stable keyset batches (default 250, configurable 1–1000), constant-memory output; query/statement timeout aborts the entire run with incomplete status. No partial success or fixed latency guarantee.
**Constraints**: One repeatable-read read-only snapshot for all subjects/control totals, org/profile scoped app_ledger role, no credential logging, no date-driven writes.
**Scale/Scope**: One owner-approved organization; all-date controls, optional explicit date cohort; no all-tenant mode.

#### Constitution Check

Pre-research: specify→plan→tasks through private F7 driver; anchored AS-IS/TO-BE/DELTA; future feature PR against registry Hub master; no UI/new web surface, so design/token and page route gates not applicable unless scope changes; data spec approval and human merge pending. Post-design: all principles covered, no waiver. Review results are recorded under egm/; owner approval remains pending. Product implementation remains blocked by pending owner spec approval. Production read execution needs exact authorized scope, not a general feature plan.

#### Project Structure

[implementation-inventory.md](implementation-inventory.md) is the single complete list of Hub-relative file actions (create, modify, unchanged dependency) for this slice. In outline: `src/server/services/pos/accounts/audit.ts`, `audit.logic.ts` and `audit.types.ts` hold the transaction-accepting inventory, the pure classifier/canonicalization and the exact DTOs; `scripts/faces-receivables-audit.ts` is the operator CLI; `scripts/lib/operator-principal.ts`, `scripts/lib/operator-service-loader.ts` and `scripts/operator-bootstrap.smoke.ts` are the shared operator bootstrap; `rbac.service.ts`, `src/server/auth/active-operator-principal.ts` and the authority-bridge migration are the authority foundation; the native fixture, QA manifest/report and UUID helper changes complete the list. Existing canonical readers (`pos/accounts/unbilled.ts`, `list.ts`, `resolve.ts`, `identity-key.ts`, `pos-accounts.service.ts`) are reused read-only; their predicates do not change.

Docs live in this feature directory. A later paid-link repair is a separate approved slice and executable design, not an unchecked flag hidden in this script.

#### Implementation slices

##### S1 — Complete row inventory and controls (US1)

CLI requires explicit `--org`, the exact approved scope/evidence contract, private output directory and optional date cohort. The authoritative interval is booking.start_time for booking subjects and parent ticket.submitted_at for paid-unscheduled lines, inclusive --after/exclusive --before local midnight; approved-scope containment and controls are fully specified in contracts/audit-cli.md. Concrete principal verification follows contracts/audit-cli.md using the existing GoTrue access token and auth.getUser before the business snapshot; a supplied profile ID alone never proves caller identity. Verify approved principal/org binding and current active membership plus fresh pos:view and finance:view authority. For the financial export require unrestricted organization review (no owner-only scope or sensitive-field restriction); otherwise exit 2 before inventory. There is no scoped-report mode. Resolve capabilities in the same snapshot using a deliberately nonlocking query adapter sharing the existing fresh resolver role semantics; the current `resolveFreshCapabilitiesInTransaction` uses `FOR SHARE` and MUST NOT run in a read-only transaction. Implement `resolveFreshCapabilitiesReadOnlyInTransaction(tx,orgId,profileId):Promise<FreshCapabilitySnapshot>` with the exact shared return alias and role composition in contracts/audit-cli.md, and test parity, preserving the locking default for existing callers; no fabricated request locals. Credentials come only from approved resolver/environment, never CLI args or output.

Own a dedicated DB connection/transaction outside ambient web tx. Start `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` before business queries, apply org/profile GUC and app_ledger role, assert current org/role/read_only and capture transaction timestamp + snapshot. SQL can run SET LOCAL/SELECT only; no mutation functions/advisory workflows from normal service wrappers. All inventory and totals use this CoreTx; reuse canonical predicate/query fragments rather than invoking wrappers opening separate transactions.

Create complete keyed inventories: (a) paid service lines with no booking/plan from non-void/non-voided tickets, including identityless lines that badge can count; (b) eligible unbilled bookings with required identity; (c) review-only excluded/old booking cohort showing free/inactive/funded/linked facts; (d) relevant wallet balances/plans by currency. Use tuple key `(subjectKind,id)` and stable ID keyset pages inside same snapshot. Report complete U totals, C and U-minus-C separately (terms in [research.md](research.md#terms-used-across-this-package)); whole-org all-date controls exist only for unbounded U. Never widen finite U for a financial closure or proposal; do not compare a limited client display or subset directly with whole-org badge.

Compute distinct controls matching **each** current reader exactly: badge paid-unscheduled + unbilled; list-style pending scheduling (only void excluded and identity required); list-style unbilled grouped by canonical client key; account display capped clients versus complete clients; identityless paid lines and legacy voided residuals. Explain row versus client counts; shared subject may carry multiple nonadditive facets.

##### S2 — Evidence classification and uncertainty (US2)

Validate and admit the exact optional external evidence manifest in contracts/evidence-and-proposals.md; missing evidence remains unresolved. Gather explicit booking status/date/group, price resolution and active flag, line/plan/grant/redemption/invoice refs, tender/refund/void facts, canonical customer identity and available delivery/contract evidence. Retain stored monetary decimals/currencies; no floating point summation or cross-currency netting. Current active catalog price is labelled current, not historical agreed charge. `paid` boolean is a linkage fact; a ticket line alone is not proof the full requested service/quantity is settled.

Both exhaustive ordered classifiers are normative in contracts/evidence-and-proposals.md. Global identity/source/evidence conflicts win first. Booking order is inactive → positive historical-charge closed-settlement evaluation → current-free only without positive history → exact unused → exact stale → unresolved. Define unused/stale using admitted booking-only predicates, snapshot observed status and explicit overlap decisions; no vague existing conditions or new lifecycle status. A paid_unscheduled_line has its own inactive/known-zero/fully-settled-one-line/unresolved table and never becomes debt/unused/stale. Every branch emits its selected reasonCodes, uncertainty and next action. Valid unused+stale chooses unused/review with both reasons; unused+delivery or stale-observation mismatch is global conflict; observed==claimed==actual is no-change, not stale. Positive historical charge plus a current catalog price of `0` never falls through to free; retain canonical free badge exclusion separately.

`loadAuditFinancialClosure` selects only two positive money shapes under unbounded owner U: (A) real active canonical party with usable document, admitted identity+historical charge+delivery and complete zero stored POS/finance/wallet/funding closure gives `settledMinor = "0"` and `remainderMinor` = historical charge; (B) exactly one submitted same-client ticket with exactly one positive service line, 1–20 ordinary positive payments summing its whole total, no other money/allocation/fiscal/funding/finance/wallet involvement, proves the stored line fully settled. An exact owner-admitted matching pair may use B for a booking/proposal; without the full pair a positive paid line is only paid-but-unlinked/review. Multiple ordinary tenders may sum a whole one-line ticket; no line/partial/invoice/refund/wallet allocation is inferred. Normalize actual stored method definitions through pos/settings.ts normalizeMethods; require unique resolved drawsOnCredit=false and requiresCreditDecision=false, with no hardcoded names or missing-settings defaults for settlement.

Financial closure reads all same-canonical-party POS tickets/lines/payments, bound fin_clients, exact document-number uncertainty probes, explicit/provider/client invoice and finance-payment provenance, signed client ledger, plans/grants/redemptions and source refs under the same CoreTx. Dedup by table+primary ID, never providerRef or matching amount; preserve provenance edges. Exact document-only finance matches never create booking links or settlement. Any partial/refund/wallet/invoice/alternate-client-money/unknown identity shape is unresolved/null settled/null remainder. Finite approved U skips all-date closure entirely and emits settlement_scope_incomplete; C may narrow within unbounded U, but both proposed pair subjects must be in C. Read no out-of-U subject to make the proof. Methods/amounts use exact supported-currency BigInt minor units, never Number or cross-currency sums. Combined closure budget is 10,000 deduplicated rows per subject/pair including account controls, and the existing 256 MiB output and 300 s deadline limits apply; limit+1 aborts incomplete, never fake empty closure. Exact queries, DTO and reason codes are in the evidence contract.

Separate exhaustive primary-class counts per subject kind from independent financial buckets. `sum(primary classes)=inventory subjects`; `badge contributors=component inventory`; `currency totals=matching stored decimal sums`. Every residual subject is streamed as a `ResidualRecord` to `residuals.jsonl`; the summary carries per-control counts, a 100-ID sample and a digest ([audit-cli.md](contracts/audit-cli.md#residual-output)). Unknown financial amount is null with reason, not zero.

##### S3 — Exact repair proposals (US3)

Only propose a payment-line→existing-booking link when approved external evidence plus same-org canonical identity, same actual service/quantity, currency and settlement amount prove the pair. Read all existing explicit booking/invoice/grant/plan links first using contracts/invoice-linkage.md. Never rely on bookingTicketLinks for invoice coverage. Cases with reused line, partial/split amount or qty, void/refund, mismatched identity, fiscal issue or uncertain stock ownership are unresolved; grouped bookings require exact member not anchor guess.

Use the exact canonical LinkIntent, SHA-256 preimage and fixed-namespace UUIDv5 identity in contracts/evidence-and-proposals.md; keep run metadata and private paths outside approval identity. Proposal includes immutable before snapshots, expected versions/fingerprint, exact proposed link, reviewer evidence refs, monetary/stock/lifecycle zero-change assertions, predicted **both** badge-component deltas plus exact typed wallet/list controls in HASHED LinkIntent.effects and accountControlSha256, and SHA-256 approval identity. Pure projectLinkEffects clones the complete same-client canonical control projection and changes only this line.bookingId. It recomputes list pendingScheduling/pendingInvoice, logical account-key union, current-currency display balance and canonical badge deltas. Exact empty ledger yields wallet[]; all signed per-currency wallet rows are unchanged display evidence (not settlement). Logical client row can disappear when the pair were its only key sources; capped/sorted rendered-row presence is always null/not_predicted_limit_or_sort. A current-free booking has an unbilled delta of `0` even with a historic settled charge. The control source includes other same-client subjects, wallet/open plans/active grants and relevant policy and selected source sets; its hash changes proposal identity when those business facts change. No proposal changes DB. A future repair executor must revalidate all refs and concurrency under locks, be idempotent, dry-run by default, carry exact owner approval and provide conditional inverse-link undo; this audit does not introduce that executor. `bookAndLinkTicketLine` is explicitly prohibited because it creates scheduling records.

#### Failure, retry, concurrency and output

Incomplete connection/page/money decode/permission or timeout errors abort one snapshot; close connection in finally. Write a private staging directory mode 0700 and files 0600 without following symlinks, checksum each sorted output, atomically rename the manifest only after controls pass; on failure keep the staging directory labelled incomplete with no manifest ([audit-cli.md](contracts/audit-cli.md#snapshot-bounds-and-files)). Retry starts a fresh run/snapshot and never appends to an earlier completed report. For unchanged fixtures canonical subject/proposal content hashes match; run timestamp/snapshot metadata naturally differ. A changing production snapshot may yield a different report without implying inconsistency. No DB writes means no business-data undo is needed; read-only transaction rollback/release always runs. Capture input/output hashes and row-count/hash invariants, not SQL statement counts.

#### Security and authority

Exact org comes from approved run scope and is checked against DB GUC; no default first org. Verify app_ledger RLS and active profile membership. Require pos and finance view plus unrestricted export approval; owner-filter/field-level restrictions cannot be bypassed by operator flags. Minimal private artifacts use IDs/codes by default, authorized display labels only when needed, no phones/email/credentials. Full raw evidence remains protected, summary may be redacted for sharing. No server-token endpoint, public API or frontend auth changes. Any future UI/API requires separate route manifest, RBAC/nav/field-level/design/i18n design before implementation.

#### Validation and release

Run synthetic matrix from quickstart including >500 clients, party/contact identity bridging, deleted/missing identities, identityless paid lines, voided discrepancy, all free/null/inactive/plan/grant/invoice/partial/refund states, multiple currencies and concurrent writes between page reads. SQL read-only denial and before/after business table hashes prove no mutation; repeated unchanged report proves deterministic core output. Focused pure/runner suites, the complete admitted qa-native SQL lane and its semantic report validator, then Hub check/test/build and relevant architecture checks. Human spec approval precedes code, human merge follows independent review/CI. Approved live read is a report result, not repair or deployment proof.

#### Complexity Tracking

No new business data tables/UI/remote job framework; one bounded authority-function security migration is required. One dedicated snapshot connection is required because multiple ordinary service calls may observe different commits or truncate clients. A classification service and operator wrapper are sufficient; universal fuzzy repair engine rejected.

#### Exact contract dependencies and file scope

[contracts/audit-cli.md](contracts/audit-cli.md) owns principal/readonly authority, cohort timestamps, scope intersection/refusals, time/resource limits and exits. [contracts/evidence-and-proposals.md](contracts/evidence-and-proposals.md) owns typed owner-attested assertions, exact positive/blocked proposal envelope and stable approval hash/UUID. [contracts/invoice-linkage.md](contracts/invoice-linkage.md) owns same-snapshot invoice coverage, provider ambiguity and no-proposal guards. audit.types.ts implements those exact types; audit.logic.ts implements only pure validation/classification/canonicalization; audit.ts performs every source/evidence match under the same CoreTx and returns safe evidence rows. These are selected contracts, not design choices delegated to implementation.

Stage shared bootstrap without a future-root cycle: T005–T009 implement/qualify actual authority/principal/foundation loader only, excluding audit registry key/type and audit runner/registration; these results are foundation_checks_passed, not bootstrap qualification. T011 adds actual audit.ts and its registry/type; T014 finishes real runner/streaming/package registration and real positive --phase audit smoke after T011–T013. Qualify F7-owned operator-principal/nonlocking authority extraction and that full [standalone service bootstrap](contracts/operator-bootstrap.md), plus required native bridge proof, before dependent F1/F2 previews. The bootstrap smoke proves actual Svelte/dependency imports and injected qualified clients with application dotenv/config/credentials absent; ordinary mocked unit tests do not establish this. F1/F2/F3 mutation admission uses the new resolveFreshOperatorCapabilitiesForWriteInTransaction adapter under the shared guard. Only unrelated legacy callers retain resolveFreshCapabilitiesInTransaction and its existing row adapter. Production reports still need exact owner scope and must never be run from these documentation commands. All implementation tasks remain unchecked.

#### Transaction-accepting orchestration interface

The selected audit.ts export is:

```ts
export function runReceivablesAudit(tx:CoreTx,
  input:{orgId:string;profileId:string;scope:AuditScope;cohort:AuditCohort;
    batchSize:number;evidence:AdmittedEvidence|null},
  sink:AuditSink):Promise<AuditSummary>;
```

The CLI owns connection, transaction, guards/deadline and publication; the service starts no transaction or application pool. `AuditSink.writeSubject`, `writeResidual` and `writeProposal` are awaited `Promise<void>` callbacks with backpressure. `AuditSummary` contains coverage/control/class/currency counts and the per-control residual summary `{count,cohortCounts,sampleIds,idsSha256}` from [audit-cli.md](contracts/audit-cli.md#residual-output); it holds no subject list and no residual ID array beyond the 100-ID samples.

1. Before the first subject, build only the bounded approved-assertion/pair index (at most 1000 assertions) and conflict sets. Stream U in (subjectKind,id) order: update controls and write residual records for every U member, and emit subject records only for C members.
2. For each subject, read and release one bounded canonical-party financial closure only when U is unbounded. Evaluate all relevant approved pair gates/counterfactuals before deciding propose_link, apply the exact classification table, then emit that one final subject. Never emit a provisional next action that a later proposal pass changes.
3. Process admitted settlement pairs in (ticketLineId,bookingMemberId) order, retaining only the bounded evidence map and current source batch; emit proposals in that order. Conflicting one-line/multiple-member or one-member/multiple-line assignments produce unresolved candidates, never arbitrary selection. Re-evaluate each bounded pair in this immutable snapshot and compare its retained small eligibility/hash receipt; mismatch is integrity failure.
4. Retain no whole-org subject map, unbounded result array or all closure objects/intents. Closure and account-control arrays share one 10,000-row budget with table/id deduplication, and are released before the next subject/pair. Financial source DTO and account-control hash remain the exact selected contract types, not new stored allocation tables.


#### Evidence actor admission

Admission is defined once in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#executing-actor-and-attestation-authority). Qualify capable-reviewer/evidence-null, capable-reviewer/evidence-present denial, actual owner positive, owner with only custom realRoles keys, revoked owner, deficient effective authority and wrong-verifier cases using the actual read-only capability snapshot.


#### Exact file-action scope

implementation-inventory.md distinguishes F7-created code/tests/bootstrap/principal/UUID utility, extraction-only seed wrapper and native/QA/package/validation actions from existing canonical reader fragments and F3/F2-owned dependencies. No UI/Delete/business-table/locale/mutable-paid path is introduced; the explicit authority-function migration is the sole schema change. A file not in implementation-inventory.md requires updating that inventory before the file is added.


#### Prerequisites and normative contracts

This section is the single statement of the cross-cutting prerequisites; other artifacts in this package link here.

- **Authority bridge.** [authority-bridge.md](contracts/authority-bridge.md) defines this slice's one security migration, the new operator adapters and the baseline-preserving proof. It is a prerequisite for the read-only audit and for the dependent F1/F2/F3 correction consumers.
- **Snapshot principal and historical charge.** Every artifact applies the snapshot principal contract in [audit-cli.md](contracts/audit-cli.md#principal-and-same-snapshot-authorization) and the historical-charge precedence in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#booking-decision-table). Excluding a booking from the badge because its current catalog price is `0` grants no historical debt forgiveness and does not establish whether a historical charge was settled or waived.
- **Native auth baseline.** [native-auth-prerequisites.md](contracts/native-auth-prerequisites.md) and the test-only files `src/server/test-utils/operator-native-auth-fixture.ts` and `src/server/test-utils/fixtures/operator-native-auth.sql` (functions `installOperatorNativeAuthFixture` and `assertOperatorNativeAuthFixture`) are created and qualified by T003 and T005. They prepare the child auth schema, `auth.users`, `auth.uid()` owner and ACL, JWT settings and the profile foreign key before the public fixtures and the bridge migration, on the CI `pgvector/pgvector:0.8.6-pg18` controller database `minion_qc_vectors` plus an owned child database. F8 (specs/129) reuses this fixture. No permissive grant or auth simulation replaces the GoTrue standalone smoke.
- **Exact assertion count.** The audit suite registers with `exactAssertions: true` and `minimumAssertions: 8` under [native-exact-count.md](contracts/native-exact-count.md).

Implementation, qualification and owner approval of all four remain pending.

### Review artifact: data-model.md

### Data model: read-only audit artifacts

No business-table schema change is planned. One bounded security-function migration is required by contracts/authority-bridge.md. Existing bookings, event types/products, tickets/lines/payments, invoice bridge, client ledger, plans, grants/redemptions and party/contact identity are read under one org-scoped snapshot.

#### AuditRun

`schemaVersion=1`; UUID runId; exact orgId and verified actorProfileId; sourceGitSha; start/completion timestamps; PostgreSQL snapshot identity; accounting timezone; approved scope/cohort and approval reference; `readOnly=true`; observed role/org GUC; per-component row/client counts; per-currency decimal totals; per-control residual summary `{count,cohortCounts:{C,U_minus_C},sampleIds,idsSha256}` (at most 100 sample IDs per control; no full residual ID array); output checksum map including `residuals.jsonl`. `complete=true` appears only in atomically published final manifest. Snapshot metadata is not part of canonical subject content hash.

#### AuditSubject

Unique `(subjectKind,id)` where kind is booking or paid_unscheduled_line. Canonical client key `party:<uuid>|contact:<uuid>|unknown`, explicit identity status; source refs; operational status and timestamps; funding kind; linked line/ticket/invoice/grant/plan IDs; current price as nullable decimal string and price evidence type; historical contracted amount/remainder as nullable decimal/currency with evidence refs; settlement/delivery evidence; badgeComponent nullable; primaryClassification non-null enum; reasonCodes nonempty; uncertainty flags; recommendedNextAction enum `review|propose_link|normal_collection_review|none`. No mutable paid/completed flag exists in report model. Add exact `financialClosure: FinancialClosure` from contracts/evidence-and-proposals.md: none_stored/fully_settled_one_line are the only positive money states; scope_incomplete/identity_incomplete/unsupported keep settledMinor/remainderMinor null. Charge/settled/remainder minor values are base-10 strings in one supported currency and are calculated with BigInt. Add `currentCatalogFree:boolean`, `uncertainty:string[]` and `recommendedNextAction` exactly as the ordered per-kind tables specify; reason/uncertainty arrays are distinct/sorted/nonempty where that table requires them. No partial-payment/invoice/refund/wallet allocation DTO is selected.

Paid-unscheduled service line is a source kind, not proof of payment: eligible badge/list contributors and authorized exact referenced review lines retain their actual contribution flag. Void/voided review lines may be inactive; a line never receives booking unused/stale/debt classifications, and booking-only assertions with that kind fail input. Primary labels are exhaustive per subject kind; financial and funding facets are orthogonal and not summed as class counts. Unknown money remains null, never coerced to zero. No mixed-currency total exists.

#### ResidualRecord

One streamed line of `residuals.jsonl`: `{schemaVersion:1,control,subjectKind,id,cohort,reasonCode}` with `control` in `badge_only_identityless|list_only_legacy_voided|integrity` and `cohort` in `C|U_minus_C`. Records arrive in `(subjectKind,id,control)` order over all of U, so U-minus-C residuals are identified without exporting an AuditSubject. The exact semantics, digest, sample cap and run-wide 1,000,000-record limit are in [audit-cli.md](contracts/audit-cli.md#residual-output).

#### RepairProposal

`RepairProposal` separates `{proposalId,runId,observedAt,proposalHash,status,intent,evidenceFileRefs}`. status is pending_owner_approval only. The exact LinkIntent type, canonical JSON algorithm, SHA-256 approval preimage and deterministic UUIDv5 namespace/algorithm are in [contracts/evidence-and-proposals.md](contracts/evidence-and-proposals.md). Hash intent only; fresh run UUIDs/timestamps, output paths and file checksums are envelope metadata. Preserve immutable original safe snapshots, sourceFingerprint and approved assertion/document content. Intent includes accountControlSha256 and typed effects.wallet/effects.accountDisplay (CurrencyBalance and AccountControlValue exact contract types), not just badge deltas. Wallet before/after arrays include every currency and `ledgerRowsDelta: 0`; a known complete empty ledger is `[]`, not unknown. Account controls include list-exact pendingScheduling/pendingInvoice, logicalRowPresent, posCurrency and displayBalanceMinor. Rendered capped-list presence is explicitly null/not_predicted_limit_or_sort. A last-pair linkage can remove a logical account row even though wallet remains unchanged. No field is placed only in run metadata to escape proposal hashing. Same business/evidence facts yield equal hashes and proposal UUIDs across new runs; changed source/evidence facts yield changed approval identity. No executor/apply state is modeled.

No proposal is emitted for partial payment, split service/quantity allocation, ambiguous/void/refund/invoice/grant/plan cases or unresolved stock ownership; these remain review subjects. Approval applies to exact hash, not a count, name or estimated amount. A future repair design must define its own transaction, version guard, inverse and audit storage before code.

#### Files and lifecycle

`subjects.jsonl`, `residuals.jsonl`, `summary.json`, `repair-proposals.json` and `manifest.json` are mode 0600 inside the mode 0700 approved output directory. Staged files stay incomplete until checked and the final manifest is atomically renamed. On failure the CLI leaves the staging directory with `incomplete.json` and no manifest, and never deletes it ([audit-cli.md](contracts/audit-cli.md#snapshot-bounds-and-files)). Retry generates a new run; identical source data yields identical canonical subjects/proposals. Deleting a run directory is a manual owner action; live data is never committed to a public repo.

#### Cohort and evidence records

AuditRun includes coverage `organization_all_date|approved_scope`, the U interval, the C interval (U and C are defined in [research.md](research.md#terms-used-across-this-package)), timezone and per-kind membership timestamp. Booking uses start_time; paid-unscheduled line uses parent ticket.submitted_at. Subject exports are C only; complement aggregates refer to U-minus-C. Scope dates are not payment/delivery proof. Positive financial labels/proposals require unbounded U. Finite U retains authorized scoped counts but financialClosure=scope_incomplete and settlement_scope_incomplete, never out-of-U closure queries. Under unbounded U, C can be narrow; source closure may read U-minus-C but exports no extra AuditSubject and proposes only both-in-C pairs.

AuditScope, EvidenceManifest and discriminated assertions are exact-key bounded schemas in contracts/evidence-and-proposals.md. Store assertion/document IDs and hashes, never raw document content; a private reference remains an owner-attested reference. Missing or conflicting evidence blocks positive eligibility. Invoice evidence is a provenance set with explicit/direct-ticket/provider-ref paths plus ambiguous/unresolved states; no invoice lookup is hidden inside bookingTicketLinks.

#### Closure and account source models

FinancialSourceRows is the exact safe table/id-deduplicated DTO in contracts/evidence-and-proposals.md: canonical party/document hash and contact edges; bound/probe finance clients; all relevant POS tickets/lines/payments and normalized method policies; signed wallet rows; plans/grants/redemptions; invoice/finance-payment/link/fiscal provenance. Document-only matches are uncertainty probes, never inferred links. The positive sourceFingerprint includes financialSourceRowsSha256 plus accountControlSha256; neither hashes a failed query as an empty source. Keep one combined closure/control map of at most 10,000 rows per subject/pair, release it before the next, and abort incomplete on limit+1. The 256 MiB output and 300 s deadline run bounds are unchanged.

AccountControlSource contains exact same-client source subject facts and current policy/eligible sets plus ledger/open-plan/active-grant/list-pending/list-unbilled sets. A pure cloned projection changes only selected tl.booking_id, computes typed before/after controls, and hashes its source into LinkIntent. Other same-client subject changes therefore change intent identity. All currency bucket arithmetic is signed BigInt display-only math; never settlement allocation. Strict positive-shape B proposals have no wallet rows, although standalone pure counterfactual vectors cover nonempty/multi-currency/zero-net wallets and reject those proposal candidates.

#### Shared bootstrap proof metadata

The selected [operator-bootstrap contract](contracts/operator-bootstrap.md) adds no DB records. Qualification stage is foundation_checks_passed (no audit registry/type/runner) or bootstrap_full_process_qualified (actual audit root/runner/package/positive process after T014); the first cannot admit dependent F1/F2 consumers. Its protected qualification output records exact candidate/dependency hashes, real package commands/root inventory, admission failures, dotenv/config canary absence, actual injected target and pool/connection assertions, child exits and cleanup. Never serialize tokens, anon keys, connection credentials or raw env. VerifiedOperatorPrincipal and QualifiedOperatorTarget retain the exact shared types in audit-cli.md; loader namespaces are typed implementation values, not export artifacts or authority substitutes.

#### Evidence authority invariant

Evidence-free versus evidence-bearing admission is defined in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#executing-actor-and-attestation-authority); the data model adds no other actor state.

### Review artifact: contracts/audit-cli.md

### Proposed operator audit contract

This is a future local CLI contract, not an installed executable or an apply authorization.

```text
bun --no-env-file run faces:receivables:audit --org <uuid> --scope <approved-scope.json> --out <private-directory> [--before YYYY-MM-DD] [--after YYYY-MM-DD] [--batch-size 1..1000]
```

The exact approved-scope/evidence schema, external assertion admission and stable proposal identity are in [evidence-and-proposals.md](contracts/evidence-and-proposals.md). Unknown flags/keys fail; no `--apply`, `--mark-paid`, `--complete`, `--all-orgs`, arbitrary SQL or credential flag exists. The script cannot execute charge/schedule/link/stock APIs. An inert proposal needs a separate reviewed executor spec and exact owner approval before any later mutation.

#### Registered entrypoint and target

After T011–T013 real audit service/control work, T014 adds the actual runner and package.json script `faces:receivables:audit` with exact value `bun --no-env-file scripts/faces-receivables-audit.ts`. Use the F7-owned qualified Vite SSR service loader in [operator-bootstrap.md](contracts/operator-bootstrap.md) only after parameter/target/principal admission; keep the existing Bun shim unchanged and do not preload it. Its closed aliases/virtual modules, dotenv exclusions, real Svelte SSR graph and fresh-process package smoke are required shared qualification for F1/F2/F7. Foundation T005–T009 has no audit key/type/runner/registration; helper checks are not full qualification. Full positive actual audit process follows T014 and is required before dependent consumers. The runner reads only explicitly supplied private `FACES_AUDIT_DATABASE_URL` for its owned connection, `FACES_OPERATOR_ACCESS_TOKEN` for authentication and `FACES_OPERATOR_ANON_KEY` for the qualified anon key; it never falls back to an application pool or SUPABASE_DB_URL/.env.local. Compare the credential-free qualified connection identity and actual current_database() with approved scope.target before business queries; caller rechecks role/org/profile/read_only inside its snapshot. Invalid/missing/mismatched target is exit 2 without business reads. Shared QualifiedOperatorTarget encoding is the [F3 transaction protocol](../124-stock-correction-workflow/contracts/transaction-protocol.md), consumed unchanged by F1/F2/F7. No URL credential is printed.

The same module exports pure `operatorDatabaseIdentity(connectionUrl:string,authProject:string):string`. Parse only postgres/postgresql URLs and hash SHA-256 over UTF-8 recursively key-sorted JSON `{version:1,protocol:"postgresql",host,port,database,transport,authProject}`. host is URL.hostname lowercased; port is the explicit integer or 5432; database is the nonempty percent-decoded database path after the single leading slash; authProject is the exact approved string. transport is `tls-verify-full` for remote endpoints and `local-marked-plaintext` only for loopback. Omit username, password, every query parameter/secret and fragment from identity. The caller compares this digest to approved target.databaseIdentity before connecting, compares actual current_database() with the parsed database after connecting, and enforces exact role/org/profile GUC before business reads. Remote connections MUST verify TLS hostname/certificate; no remote plaintext or admin fallback. Local plaintext additionally requires the actual owned fixture database marker before business reads. Identity hashing is not a substitute for those transport/server checks. Unit tests preserve identity across credential rotation and reject changed host/port/database/authProject/target, unsafe transport and missing local marker.


#### Principal and same-snapshot authorization

F7 owns proposed `scripts/lib/operator-principal.ts` plus `.test.ts`, shared by F1/F2. It exports `verifyOperatorPrincipal(input:Readonly<{accessToken:string;authUrl:string;anonKey:string;expectedProfileId:string;targetFingerprint:QualifiedOperatorTarget}>):Promise<Readonly<{profileId:string;authProject:string;verifiedAt:string}>>`. T004 first defines pure `QualifiedOperatorTarget = Readonly<{databaseIdentity:string;authProject:string;authUrl:string}>` in audit.types.ts; T006 operator-principal re-exports that exact type through `import type` using the explicit relative file path (erased at runtime, no app alias/value import). This preserves the public operator-principal type export without a future-type dependency. Export that QualifiedOperatorTarget and type the input `targetFingerprint:QualifiedOperatorTarget`. This is the qualified target's credential-free object; authUrl must byte-equal the qualified HTTPS auth URL (or explicitly qualified loopback GoTrue URL in QA), without query/fragment/userinfo. authProject is the qualified project identifier and is returned unchanged after matching the target; it is not inferred from user email.

The CLI reads its existing operator GoTrue access token only from private `FACES_OPERATOR_ACCESS_TOKEN` and the selected anon key only from private `FACES_OPERATOR_ANON_KEY`. authUrl comes only from approved scope.target.authUrl; no PUBLIC_SUPABASE_URL/ANON_KEY application-global fallback is permitted. Construct the installed @supabase/supabase-js client against that qualified authUrl/anonKey with `persistSession:false` and `autoRefreshToken:false`; call `auth.getUser(accessToken)`. A successful GoTrue result establishes canonical profile identity through user.id (supabase-bridge.runtime.ts:95), which must equal approved actorProfileId/expectedProfileId. No decoded JWT, payload identity, admin key, AUTH_DISABLED, gateway token, guessed email or first member establishes authority. No JWT decoding/new session/refresh is required. Missing/rejected/expired token, unavailable verifier or target/subject mismatch returns exit 2 before business reads; never print/store token or SDK headers. Tests cover every refusal and successful exact binding. This is a software contract, not an auth call run during drafting.

Inside the owned READ ONLY snapshot, call proposed `resolveFreshCapabilitiesReadOnlyInTransaction(tx,orgId,profileId):Promise<FreshCapabilitySnapshot>` from rbac.service.ts. F7 owns its extraction/qualification; F1/F2 consume it after qualification. `FreshCapabilitySnapshot` aliases the current fresh resolver result `{capabilities,roles,membershipRole,realCapabilities,realRoles}`. Both entrypoints share the identical internal membership/assigned-role/org-policy/local-role/rule composition, effective-authority narrowing and fail-closed semantics. The new entrypoint uses uncached nonlocking SELECTs in the caller's transaction; no FOR SHARE/UPDATE or separate pool. Existing `resolveFreshCapabilitiesInTransaction` remains locking by default only for unrelated legacy callers; F1/F2/F3 writes use the selected new guarded write adapter from authority-bridge.md. CLI creates no simulated request locals and gets no platform-admin bypass. Verify an existing same-org membership in an active organization, POS/finance view+export, `ownerScoped("pos")===false` and `ownerScoped("finance")===false`, and `capabilities.fieldLevel("finance") >= SENSITIVE_FIELD_LEVEL` before inventory; insufficient authority fails exit 2. Read app_modules directly through this CoreTx, using existing absent-row=enabled semantics for pos and finances; disabled required module fails closed without invoking cached listModuleStates. Stock-ownership proposal evidence additionally requires enabled stock, stock:view and unrestricted stock scope, retaining the already-required finance capability/tier for this financial report; otherwise omit stock reads and block proposals with stock_ownership_unavailable while allowing the authorized financial inventory. Native tests compare both resolver results on static fixtures and prove READ ONLY compatibility and denial. Never move admission outside the report snapshot to avoid its locking restriction.

Evidence-free and evidence-bearing admission (capable reviewer versus actual executing owner) follows [evidence-and-proposals.md](contracts/evidence-and-proposals.md#executing-actor-and-attestation-authority); every refusal there is exit 2 inside this snapshot before subject inventory.

#### Dates, approved scope and controls

All values are real Gregorian dates in exact `YYYY-MM-DD` form, not locale strings. Resolve and validate `fin_settings.timezone` in the same snapshot and require equality with the approved IANA timezone; a missing row, invalid value or mismatch fails exit 2. Canonical readers fall back to `America/Lima` when the org has no `fin_settings` row (the `policy` CTE in `pos/accounts/list.ts:23`, `periodLockExists` in `pos/period-locks.ts:30–31` and `DEFAULT_FIN_SETTINGS` in `finance.service.ts:558–561`). The audit deliberately does not apply that fallback: cohort boundaries and the active-grant date are computed in the owner-approved `accountingTimezone`, and a fallback zone is a default nobody reviewed. An organization that has never saved finance settings therefore cannot be audited until its owner saves them through the existing finance settings flow, outside this read-only tool. When the row exists, the verified value equals what the canonical readers use. Convert a date boundary with PostgreSQL `(date::date::timestamp AT TIME ZONE verifiedTimezone)`; use this selected database conversion consistently rather than process-local timezone.

`--after` is an INCLUSIVE local-midnight lower bound and `--before` is an EXCLUSIVE local-midnight upper bound. A same-day cohort is after D/before D+1. Equal or inverted finite bounds fail exit 2; impossible dates fail before SQL casts. The scope has the same interval semantics. Omitted CLI bounds inherit the approved scope bounds; when the scope and flags are unbounded, inventory is all dates. A requested finite/open interval must be contained in the approved interval: attempted widening fails exit 2 rather than silently clamping or reading extra records. Effective interval is the intersection after this containment check. No cutoff or month/year is inferred from the meeting.

Cohort membership uses `sched_bookings.start_time` for a booking and its parent `pos_tickets.submitted_at` for a paid-unscheduled line. Booking creation/status-change and payment paid_at are retained evidence only and do not choose the cohort. Every timestamp comparison is `>= lower AND < upper`; null/corrupt required timestamps in a finite approved interval make scope proof incomplete (exit 3, no complete manifest). In all-date inventory such corruption is an unresolved subject and blocks proposals.

Let U be all subjects inside the OWNER-APPROVED interval, and C the optional narrower CLI cohort. Query complete control predicates over U, then report C and its U-minus-C complement separately. If U is bounded, label coverage `approved_scope` and do not issue whole-org/all-date control queries or claim equality with the full organization sidebar badge. Label `organization_all_date` only when U is unbounded. Export subject rows for C; complement contributes aggregate controls only. Proposal pairs must both be in C. Positive financial labels and proposals additionally require U unbounded: finite U MUST NOT issue all-date client closure, widen its queries or fetch another subject outside U. It keeps complete scoped controls with financialClosure.state=scope_incomplete, settled/remainder null and settlement_scope_incomplete on affected positive candidates. Operational classification is still available by the exact per-kind table. Under unbounded U, C may narrow and full-client U-minus-C source references may be read without exporting additional subjects. Existing source timestamps are evidence, not alternate cohort membership. Failing scope/authority never becomes a misleading empty business report.

Required fixtures distinguish booking start/creation/status dates and line submitted/payment dates, both sides of local midnight, allowed same-day [D,D+1), equal/inverted intervals, invalid dates, timezone mismatch, inherited owner bounds, attempted widening and narrowed-cohort/complement equality.

#### Snapshot, bounds and files

Use one owned connection, `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, exact app_ledger/org/profile GUC, and assert role/org/read_only before inventory and before final completion. No ambient web transaction, writable app pool or service wrapper opening another snapshot. The chosen limits are safety bounds, not measured performance: batch size 1–1000/default 250, statement timeout 12 seconds, lock timeout 1 second, idle-in-transaction timeout 20 seconds, overall transaction deadline 300 seconds, at most 1,000,000 subjects and 256 MiB serialized outputs. Reads stop at limit+1; timeout/limit breach aborts the snapshot and returns incomplete exit 3, never a complete truncated report. Stream subject rows, residual records and currency/count aggregates; do not retain full subject history or any whole-run ID list in memory. Every candidate/client-closure collection is read in stable keyset batches, deduplicated by (table,primary ID), with one COMBINED limit of 10,000 rows per subject/pair including account-control source rows. limit+1 causes incomplete exit 3 before emitting the pair, not 10,000 per query or an empty successful collection. Scalar source IDs/hashes use their defined formats; provider references/method/status fields must be at most 256 UTF-8 bytes. Unexpected larger source fields are incomplete evidence, never truncated hash input. Evidence admission remains bounded to 1 MiB/1000 assertions/documents.

Private output directory is mode 0700 and files mode 0600, with no symlink following. Stage files in a private same-filesystem staging directory; checksum outputs and atomically publish the final `manifest.json` only after controls pass. A fresh retry uses a new run directory/UUID and never appends to a completed run. Close/rollback in finally. On any failure (exit 2 after staging began, or exit 3) the CLI keeps the staging directory, writes `incomplete.json` `{runId,exitCode,reasonCode}` into it and never writes `manifest.json`; it never deletes a staging or run directory. Deleting any complete or incomplete run directory is a manual owner action outside the CLI. Console prints run ID, redacted scope, paths/counts/checksums; never PII, credentials, payment detail or raw query parameters. Live row IDs/doc references remain protected, not public evidence.

#### Residual output

A residual record is one subject in U that one current reader counts and another does not, or that carries an unresolved integrity finding. Residual subjects can number up to the size of U, so they are streamed, never held as arrays in `AuditSummary` or the manifest.

- The controls pass reads U in `(subjectKind,id)` keyset order inside CoreTx. For every U member it updates counters, emits a full subject record only when the member is in C, and calls the awaited `AuditSink.writeResidual` once for each residual control the member matches. Residuals in U-minus-C are therefore listed by ID without exporting an `AuditSubject`.
- `ResidualRecord = {schemaVersion:1, control:"badge_only_identityless"|"list_only_legacy_voided"|"integrity", subjectKind:"booking"|"paid_unscheduled_line", id:string, cohort:"C"|"U_minus_C", reasonCode:string}`. `badge_only_identityless` is a paid line the badge counts but the list cannot key; `list_only_legacy_voided` is a line on a legacy `voided` ticket that list pending scheduling counts and the badge excludes; `integrity` is an exit 4 finding.
- The CLI writes records to `residuals.jsonl` in arrival order, which is `(subjectKind,id,control)`. The file is checksummed in the manifest like the other outputs.
- `AuditSummary.residuals` and the manifest carry, per control: `count`, `cohortCounts:{C,U_minus_C}`, `sampleIds` (the first 100 `"<subjectKind>:<id>"` strings in stream order; fewer when `count < 100`) and `idsSha256`. `idsSha256` is the SHA-256 of the UTF-8 bytes of every `"<subjectKind>:<id>\n"` line for that control in stream order (the SHA-256 of zero bytes when `count` is 0). The CLI keeps one incremental hasher and at most 100 sample strings per control, so memory stays constant.
- Residual records count toward the 256 MiB output cap and have their own run-wide cap of 1,000,000 records. The CLI's residual writer takes the cap as a constructor argument; production passes 1,000,000 and runner tests pass a small value. Record 1,000,001, a `writeResidual` rejection or an output write failure aborts the run with exit 3 and no manifest; nothing is silently truncated.

#### Exits

- Exit 0: complete read-only report; controls reconcile or have classified/explained non-integrity differences. Missing historical facts can produce unresolved subjects without enabling a proposal.
- Exit 2: invalid parameter/scope/evidence/target/authentication/authorization, before sensitive reads.
- Exit 3: DB/decode/timeout/resource/scope-proof failure; output incomplete and no final complete manifest.
- Exit 4: completed inventory with an unresolved integrity residual; `residuals.jsonl` lists every `integrity` record, the manifest carries its count, sample and digest, and no involving proposal is emitted. It is never cleanup success.

No report status grants execution approval, collection authority or a production mutation.

Quantity/source-only stock evidence has no stock-sensitive-tier check: FIELD_LEVEL_MODULES includes only crm/finance/scheduling and stock field level is 0. Shared native authority fixtures must admit the ordinary authorized owner/custom-role case with stock level 0 and valid finance policy, and deny actual finance tier/capability loss. Never add a global stock tier to make these tools run.


#### Active database principal without an F3 prerequisite

F7 creates src/server/auth/active-operator-principal.ts with an explicit passed-transaction helper:

```ts
export function assertActiveOperatorPrincipalReadOnlyInTx(
  tx: CoreTx, orgId: string, profileId: string,
): Promise<Readonly<{
  orgId: string; organizationStatus: 'active';
  profileId: string; deletionPending: false; principalStateHash: string;
}>>;
```

The selected helper delegates to the read-only authority bridge (`p_lock_rows => false`) in [authority-bridge.md](contracts/authority-bridge.md), not direct profiles/organizations SELECT under app_ledger. It keeps its exact signature/selected-state return and validates actual app_ledger/GUC/RR READ ONLY binding before calling. F7 owns both bridge migration and safe read/write capability adapters without any F3 import. Legacy fresh adapter signature/default/return remain unchanged; only new operator consumers select the bounded bridge adapters. The native baseline ACL/RLS/true-false parity and no-expansion proof in that contract is mandatory; granting a test fixture extra org/profile/member rights is forbidden.

The initial F7 closed typed operator registry includes activeOperatorPrincipal with its actual namespace type and process smoke in this same slice. After verified target/principal admission, F1/F2 load this key and call its passed-transaction helper inside each owned READ ONLY snapshot; no bare pre-admission alias import or future F3 dependency is permitted.

### Review artifact: contracts/authority-bridge.md

### Bounded operator authority bridge under actual baseline ACL and RLS

Source facts: supabase/qa/baseline/schema.sql grants app_ledger SELECT profiles but its self-select policy is auth.uid()=id; withOrgCore sets app.current_* and no JWT subject. organizations has no app_ledger SELECT grant, and organization_members grants SELECT only while SELECT FOR SHARE requires UPDATE privilege. Notification audience migration retains the profile expression and excludes app_ledger from organization policies. A native fixture granting more would hide failure. Existing cached/browser permission loading and unrelated legacy fresh callers remain unchanged.

F7 owns one additive security migration, `supabase/migrations/20261116190000_operator_authority_bridge.sql`, ordered before F3's storage migration `20261116193000`. No new business table, profile/member UPDATE grant, broad organization SELECT, replacement permissive RLS policy, JWT-sub impersonation or application BYPASSRLS is selected. The audit CLI remains read-only with no apply flag; foundation migration deployment is separately owner-approved/merged before reports/corrections run. No product/database change occurred during authoring.

#### Exact SQL function and ownership preflight

Create public.minion_operator_authority_v1(p_org uuid,p_profile uuid,p_lock_rows boolean) RETURNS jsonb, LANGUAGE plpgsql, SECURITY DEFINER, VOLATILE, SET search_path=pg_catalog, SET timezone='UTC'. Create/revoke/owner-assign/grant are one atomic migration transaction; no public-execute window is committed. No default arguments/overloads, dynamic business SQL, caller-selected relation/column/function, row-security setting change or DML. All relations/functions are schema-qualified, including public source tables and pg_catalog built-ins. Revoke ALL/EXECUTE from PUBLIC and every existing application role except app_ledger; grant EXECUTE only to app_ledger. The actual function owner retains implicit rights; no browser anon/authenticated/service_role/app_assistant_ro execute grant or inheritance shortcut is allowed. Revoke inherited default-ACL recipients as well as PUBLIC; verify no untrusted role reaches app_ledger through role-membership USAGE, failing preflight rather than editing membership. Check pg_proc proacl/prosecdef/proconfig/body hash/signature and pg_depend against the selected fixed body after migration. No CREATE FUNCTION under an application-owned role.

Preflight reads actual ownership/security metadata for public.organizations,profiles,organization_members,member_roles,org_roles,permission_rules. Require one common trusted relation owner, excluding app_ledger/anon/authenticated/service_role/app_assistant_ro and other request/worker roles. Owner must actually be able to read/lock these rows: superuser/BYPASSRLS OR table-owner bypass with none of those tables FORCE ROW LEVEL SECURITY. Record exact owner/role attributes/RLS/ACL/policy hashes. Migration runs under an authorized trusted deploy principal able to assign function to this observed common owner; quote only that catalog-derived identifier in deployment DDL. Owner mismatch/forced-RLS without actual bypass/unsafe function-schema ownership or missing required source columns fails migration qualification, never changes table owners/role attributes/policies/ACLs to make it pass. In owned fixtures the common owner is the initial admitted controller; production must pass its own preflight before release. The elevated trust boundary is this fixed projection function, not a general privileged SQL client.

Inside the function require nonnull args, current_setting('app.current_org_id',true)::uuid=p_org and current_setting('app.current_profile_id',true)::uuid=p_profile. Invalid/empty/mismatched bindings fail before source read, with generic operator_scope_invalid; no cross-org existence disclosure. Caller independently verifies canonical UUIDs and actual app_ledger scope before invoking. GoTrue verified subject establishes the argument; a payload cannot choose it. The server owns GUCs under the existing tenant boundary; this is not an authentication protocol for arbitrary SQL clients.

p_lock_rows=false is only the plain snapshot mode: require transaction_read_only='on' and transaction_isolation='repeatable read'. It performs NO advisory/row locks or writes. p_lock_rows=true is the write-admission projection: require READ WRITE, take/re-enter exact stock-v1 advisory xact key hashtextextended('minion:stock-write:v1:'||p_org::text,0), then the existing org authority lock `hashtextextended(p_org::text, 112)`, before any source row read/lock. Existing F3 caller already holds both through its opaque guard; re-entry on the same backend cannot reorder or release them. The function does not take the profile lock `hashtextextended(profileId, 114)`. This allows safe direct fixture proof without manufacturing a server guard and never writes stock. Local lock/statement/deadline settings remain enforced by caller; lock timeout returns failure with no partial state.

After those checks, require existing exact profile not coalesce((to_jsonb(p)->>'deletion_pending')::boolean,false), exact organization status='active', and exact organization_members(profile_id,organization_id) membership. Missing/deleting/inactive/nonmember yields the same generic operator_principal_inactive before any role rows are returned. Do not rely on token validity or a surviving membership alone. In locked mode take FOR SHARE in fixed order organizations -> profiles -> exact membership, then role/assignment/rule rows in their stable keys; actual trusted owner rights provide row locks WITHOUT app_ledger UPDATE grants. Plain mode uses the identical selected predicates without locks, inside caller's RR snapshot.

Return only the closed selected structure below. Never return names, email, phones, auth users, arbitrary profile JSON or a raw table row. State/authority rows may expose only stable IDs, role keys, policy flags and SHA256 row digests. All queries use exact p_org/p_profile bindings; no unscoped member roster or other profile.

#### Exact return and adapter contract

```ts
export interface OperatorAuthorityRows {
  version: 1;
  orgId: string; profileId: string;
  organizationStatus: 'active'; deletionPending: false;
  roleModel: string | null; defaultRoleKey: string | null;
  membershipRole: string;
  assignedRoleKeys: string[];
  localRoleKeys: string[];
  rules: CapabilityOverrideRow[];
  authorityRows: { table: string; key: string[]; rowHash: string }[];
}
```

The closed table set is organizations/profiles/organization_members/member_roles/org_roles/permission_rules. assignedRoleKeys are this actor's actual member_roles.role_key; localRoleKeys are this org's org_roles.key; rules are this org's exact existing role_key/module/can_view/create/edit/delete/export/manage/if_owner/field_level fields with existing null semantics. Preserve legacy/new role-model selection, union/override behavior and effective-authority narrowing. Stable sort assignment/local keys, rules by `(role_key, module)`, row digests by `(table, key)`, with C collation on SQL text keys; duplicate logical keys/inconsistent source schema fail rather than choose an arbitrary row. rowHash is encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(row)::text,'UTF8')),'hex') computed IN SQL under UTC; raw profile rows are never returned. This built-in hash form already appears in pinned notification_audience_projection.sql:375,954.

Count before aggregating: at most 128 assigned keys, 128 local keys and 10,000 permission rows; limit+1, or selected key/module text longer than 256 UTF-8 bytes, fails `operator_authority_limit` without truncated output. The final selected JSON must be at most 2,097,152 UTF-8 bytes; otherwise fail. These are explicit new operator-path safety bounds, not changes to legacy/cached RBAC limits or measured performance. The same complete bound applies in both modes. No successful empty-capability fallback on decode/SQL/ACL/function-unavailable failure.

CapabilityOverrideRow is a type-only import from rbac.service.ts; active-operator-principal.ts must not value-import that service. This preserves the runtime dependency direction from RBAC adapters to the bridge helper.

F7 active-operator-principal.ts exports readOperatorAuthorityReadOnlyInTx(tx,orgId,profileId):Promise<OperatorAuthorityRows> and readOperatorAuthorityForWriteInTx(tx,orgId,profileId):Promise<OperatorAuthorityRows>. Each checks actual caller role app_ledger/GUCs/transaction mode, invokes this exact function with false/true, validates the closed return/version/ID/bound/hash schema and never opens another connection/transaction. The latter is a bounded READ/LOCK helper, not a stock writer. Existing assertActiveOperatorPrincipalReadOnlyInTx retains its exact selected-state return/signature but delegates to the read-only authority bridge and hashes its selected active state. No direct application SELECT of profiles/organizations remains on the new operator path.

F7 rbac.service.ts extracts composeFreshCapabilitiesFromAuthorityRows(rows:OperatorAuthorityRows,orgId:string,profileId:string):FreshCapabilitySnapshot as the shared policy-composition wrapper, retaining the actual resolveMemberRoleKeys/buildCapabilities/currentEffectiveAuthority/narrowAdmittedCapabilities order. The wrapper reads currentEffectiveAuthority once and passes that resolved authority to its internal pure composition function; the internal function performs no SQL, ALS access, pool or network calls. The existing resolveFreshCapabilitiesInTransaction(tx,orgId,profileId) keeps its ORIGINAL public signature, locking row adapter and return shape for unrelated legacy callers, feeding the same composer without requiring new caller GUCs or active-state semantics. Its historical baseline feasibility is not claimed repaired globally. The pure input can be normalized from legacy rows without requiring the active-state fields; implement an internal neutral AuthorityCompositionInput for common composition, while the new exported operator adapter validates OperatorAuthorityRows first. No permissive fake active state is passed to a new operator path.

The selected new resolveFreshCapabilitiesReadOnlyInTransaction(tx,orgId,profileId) uses the read-only authority bridge (`p_lock_rows => false`) then that composer. Add resolveFreshOperatorCapabilitiesForWriteInTransaction(tx,orgId,profileId) using the write-admission bridge (`p_lock_rows => true`) then the same composer. Both return the existing FreshCapabilitySnapshot fields exactly; no new raw profile/member rows or extra capabilities. F1/F2/F3 mutation callers switch to this new write adapter, not the legacy FOR SHARE adapter that lacks baseline rights. F3 still validates its guard before calling and independently enforces its mode/cost/module/owner matrix. Generic no-stock corrections retain their POS-only matrix; this authority read does not demand stock:manage or finance by itself. Stock-v1 plus org-authority (112) locking is harmless serialization for those verified no-stock writes, as already selected.

The bridge and both adapters are owned entirely by F7, require no F3 import/type/module and compile before F3 exists. activeOperatorPrincipal stays the existing closed F7 loader key; no extra unrestricted loader path. Missing/mismatched function/catalog migration blocks report/correction use; no service-role client, JWT-GUC substitution, global pool or direct-table fallback. F3's public/private errors map generic inactive/scope failures to 403 and resource/DB failures to unavailable; the CLI maps authority refusal to exit 2 and incomplete/error to exit 3 without a final complete report.

#### Native baseline and migration proof

Extend the EXISTING eight-case F7 qa-native file, especially actual read-only/role parity behavior, with the real bridge migration. Add fixture-owned proof before/after: canonical baseline organizations has NO app_ledger SELECT, organization_members SELECT only, profiles SELECT plus actual auth.uid self policy, no JWT subject; direct app_ledger org SELECT/profile visibility/FOR SHARE membership fail as expected. Use canonical auth.uid() definition from tests/fixtures/notification-migrations/reconciliation-harness.ts:387–389 (JWT sub/claims coalesce) and baseline/current policy role arrays, not an always-allow stub. Snapshot ACL/RLS/policy fingerprints and require them unchanged by this migration. Do NOT grant UPDATE/select-all or add org-GUC profile policies to make a fixture pass.

Apply the real `20261116190000` migration to the owned child public fixture. Under actual app_ledger/context/GUC, false mode succeeds in RR READ ONLY with exact active actor/membership and yields real composer parity against privileged fixture-controller legacy composition. Any attempted mutation in that snapshot still fails. Wrong org/profile/GUC/null args, missing/deleting profile, inactive/missing org, revoked membership, unknown schema/body/ACL, unsafe owner, foreign assertion and overflow fail without inventory/PII. anon/authenticated/service_role/app_assistant_ro cannot EXECUTE. Alter owner/search_path/body/execute ACL or table policy/grant after qualification must fail the candidate preflight; never silently recreate privileges at report runtime.

True mode actual row locks and both advisory lock arrival orders are proved in F3's existing thirteen-case source suite after F7 bridge qualification: actual account deletion flag, absent deny/module state, profile/org/member revocation, never taking the profile lock (114) after the org authority lock (112), and source writer races. Invoke function with true in F7's native fixture to prove safe guarded read/lock execution, but no F3 type or stock DML is required for F7. Compare false/true policy composition on stable fixtures; effective/real role narrowing, legacy/custom roles, normal stock field level 0 with finance tier and nonowner evidence-free scopes must retain parity. Function error or transport issue is not empty authority. This qualifies access feasibility AND business authorization, separately from the GoTrue token check.

The native8 names and count stay unchanged; the source13 names and count stay unchanged. Whole qa-native lane/report, actual migration-runner/QA fixture pairing and rollback rehearsal, no privilege/policy expansion, function graph/ACL hashes and future source/caller checks are mandatory before release. Owner spec approval and owner merge apply to this new security migration. Rollback requires first disable new operator/correction consumers, then exact DROP FUNCTION only; do not alter baseline policies/grants or disturb existing legacy callers. Production deployment and rollback remain separately approved, not executed by this document.


Signature compatibility is explicit: new operator wrappers call the bridge; unrelated legacy resolveFreshCapabilitiesInTransaction continues its historical row adapter with unchanged input/return and no new GUC requirement. F7 claims operator-path feasibility only, not a repair of every legacy caller. For snapshot parity, the LEGACY reference is invoked on an admitted privileged fixture-controller transaction, because baseline app_ledger cannot run its original FOR SHARE/org SELECT. Compare returned capability semantics against actual new bridge calls under app_ledger; do not add privileges to the reference or pretend both used the same role. The shared neutral composer carries policy semantics once.


Before its baseline profile policy/FK/function-negative probes, install the complete child-local auth/users/uid owner+ACL/JWT and canonical profile/email/FK setup in [native-auth-prerequisites.md](contracts/native-auth-prerequisites.md). Bare PostgreSQL has no Supabase auth schema. Reusing only the auth.uid expression without schema/users/owner/ACL/seed-order is insufficient. Use the exact pinned full-lane pgvector/minion_qc_vectors controller; new authority migration is tested only after that faithful baseline exists.

### Review artifact: contracts/evidence-and-proposals.md

### Evidence admission and stable proposal contract

This file selects the software contract for receiving evidence. Actual historical delivery, contract and settlement facts may remain unknown; their absence produces unresolved subjects and no proposal. An assertion is owner-attested evidence, not a fact discovered by hashing a document.

#### Executing actor and attestation authority

Evidence-free runs (`scope.evidence === null`) remain available to an authenticated existing member with all required effective POS/finance review/export capabilities and unrestricted field/owner scope. Admitting any external evidence manifest additionally requires fresh `membershipRole === "owner"` from the same read-only snapshot, while retaining every capability/module/field check. This is the actual organization membership role, not `realRoles.includes("owner")` (custom role keys may replace that list). Every assertion verifier must equal this executing owner principal; owner attestation for a different executing reviewer is unsupported. A capable non-owner with non-null evidence, a former owner, mismatched verifier or unknown role fails exit 2 before subject inventory or assertion admission. An owner without the required effective capabilities also fails. No file approval, token identity or payload flag establishes ownership.

#### Approved scope and evidence input

The required private `--scope` JSON is an exact-key schemaVersion 1 object:

```ts
interface AuditScope {
  schemaVersion: 1;
  orgId: string; // UUID, equals --org and verified DB scope
  actorProfileId: string; // UUID, equals verified GoTrue user.id
  target: QualifiedOperatorTarget; // exact credential-free target binding from audit-cli.md
  approvalRef: string; // trimmed 1–200 characters, human approval record
  outputDirectory: string; // absolute approved private path, equals --out
  accountingTimezone: string; // valid IANA name, equals current fin_settings.timezone
  permittedCohort: { after: string | null; before: string | null };
  evidence: null | {
    path: string; // absolute private JSON path, never fetched remotely
    sha256: string; // 64 lowercase hex, approved exact file bytes
    approvedAssertionIds: string[]; // distinct UUIDs, at most 1000
  };
}
```

Cohort dates use the interval contract in audit-cli.md. Unknown keys, invalid IDs, nonmatching org/principal/path/timezone, a missing approval reference or widened CLI scope return exit 2 before subject reads. The owner reviews the scope including the exact evidence digest and assertion IDs before live execution; a flag or a `verified:true` field cannot replace that human gate. Files are read without following symlinks, must be regular owner-readable mode 0600, and must be no larger than 1 MiB. No credential or raw document content is accepted in either manifest. The authenticated owner remains accountable for attested truth; hashes protect file integrity and do not prove delivery or settlement.

Optional evidence is an exact-key schemaVersion 1 object `{schemaVersion,orgId,approvalRef,documents,assertions}`. Its orgId and approvalRef must match AuditScope; its SHA-256 must equal the owner-approved digest. Limit both arrays to 1000 records; IDs must be unique UUIDs. A document has `{documentId,sha256,privateRef}`: privateRef is a trimmed 1–256-character local evidence reference, not a URL to download, and sha256 is the reviewed document's lowercase digest. Source documents stay private and are not loaded by the audit. A document ID in an assertion must resolve within this manifest.

Each assertion has `{assertionId,subject,kind,values,documentIds,verifiedByProfileId,verifiedAt}`. `subject={kind:"booking"|"paid_unscheduled_line",id:UUID}` must resolve in the approved org/scope; verifiedByProfileId must equal the authenticated owner actor; verifiedAt must be an ISO UTC instant no later than the run's captured start. `documentIds` contains 1–10 distinct manifest document IDs. Only assertion IDs in approvedAssertionIds are admitted; every approved ID must exist. Unknown kinds/keys, hash mismatch, another verifier/org/subject or malformed values return exit 2. Contradictory otherwise-valid assertions remain protected report evidence with reason `external_evidence_conflict`, classify that subject unresolved and block every involving proposal; never choose the newest assertion or an arbitrary document.

`kind` and exact `values` are discriminated as follows:

| Kind | Values | Sufficiency and limits |
| --- | --- | --- |
| identity_binding | `{clientKey:"party:<uuid>"|"contact:<uuid>",ticketLineId?:UUID,bookingMemberId?:UUID}` | Confirms the exact IDs, but cannot override contradictory canonical same-org identity; names never suffice. |
| service_delivery | `{bookingMemberId:UUID,productId:UUID,quantity:string,deliveredAt:string}` | Positive quantity and ISO UTC delivery instant; confirms actual service/quantity for a genuine-debt candidate. Completed status alone is insufficient. |
| historical_charge | `{bookingMemberId:UUID,productId:UUID,quantity:string,amount:string,currency:string,agreedAt:string}` | Positive historical quantity/amount and ISO UTC agreement instant; current catalog price is not substituted. |
| settlement_allocation | `{ticketLineId:UUID,bookingMemberId:UUID,productId:UUID,quantity:string,amount:string,currency:string,paymentIds:UUID[],complete:true}` | Exactly one line/member pair, 1–20 distinct same-org payment IDs. The set must equal every ordinary positive payment ID on the admitted fully settled ticket; no selected subset suppresses another payment/refund. Stored live non-void/non-refund payments, ticket/line/service/quantity/currency and complete settled amount must independently agree. No external assertion can turn partial/split or allocated-elsewhere money into a proposal. |
| unused_reservation | `{bookingMemberId:UUID,used:false,asOf:string}` | Subject MUST be booking and its id MUST equal bookingMemberId; the snapshot must have that same-org member. A paid_unscheduled_line subject is invalid input (exit 2). ISO UTC observation supports unused review only, never cancellation/refund. |
| stale_lifecycle | `{bookingMemberId:UUID,observedStatus:string,claimedStatus:string,asOf:string}` | Subject MUST be booking and id MUST equal bookingMemberId; paid_unscheduled_line is invalid input (exit 2). Both statuses must be one of accepted/pending/completed/cancelled/rejected/no_show. observedStatus must equal the actual snapshot status. observedStatus != claimedStatus is required for stale; equality is a no-change assertion. Snapshot mismatch is evidence conflict, never a stale fact. |
| stock_ownership_clearance | `{ticketLineId:UUID,bookingMemberId:UUID,stockEffects:"none"|"already_accounted",sourceFingerprint:string}` | Fingerprint must equal the audit's exact stock/source evidence digest. Neither missing accrual nor this assertion authorizes a stock write. |

All deliveredAt/agreedAt/asOf instants must be no later than verifiedAt, which is no later than run start. UUID references in values must agree with subject/pair and the snapshot. Quantity strings admit positive plain decimals with at most four fractional digits, at most 18 total digits and no exponent; normalize to four-place strings for canonical intent. Monetary strings use the existing POS stored-money admission, supported source currency and currency minor-unit policy; subminor/corrupt values block eligibility instead of rounding an old claim into a repair. Currency is the exact normalized supported code from the existing money adapter. Private references/assertion IDs are sorted by UUID before canonicalization; an assertion containing zero/unknown amounts is not positive evidence.

For a genuine-debt candidate require nonconflicting identity_binding, service_delivery and positive historical_charge for the same booking member/product/quantity, plus the exact zero-settlement closure below. For a link proposal retain identity_binding containing both exact line/member IDs, historical_charge, settlement_allocation and stock_ownership_clearance for that pair, matching actual service/quantity/currency. Delivery is not inferred for paid advances. Both pair subjects must be in selected C. An assertion may reference a source whose actual state currently blocks a proposal, but must not invent a different subject or member. A pair in U-minus-C has outside_requested_cohort and produces no proposal; no out-of-U subject is fetched to complete it.

#### Bounded financial closure and exact arithmetic

This slice selects two provable financial shapes. It does NOT allocate a partial payment, invoice payment, refund or signed wallet balance to a service. Every other shape has settledMinor=null and remainderMinor=null with the reasons below; no max(0,charge-settlement), guessed debt or write is permitted.

##### Scope and identity preconditions

Positive financial classification (genuine-debt candidate or paid-but-unlinked candidate) and proposals require owner-approved U to be unbounded, coverage=organization_all_date. C may be narrower, and a proposed pair must be wholly in C. If either U bound is finite, complete only the authorized U/C count inventory; do not issue an all-date client closure query or fetch an out-of-U subject. Set financialClosure.state=scope_incomplete, reason/uncertainty settlement_scope_incomplete and null settled/remainder; positive-historical-charge booking and otherwise positive paid line become unresolved/review. Operational free/inactive/unused/stale rules remain available under their ordered table. Actual timestamp fields on authorized source references do not create extra subject exports. Subject exports remain C only.

A positive closure requires a real same-org parties row whose canonical resolver identity status is active, type is person or company, and whose doc_type and doc_number are both non-null nonempty byte strings, each 1–32 UTF-8 bytes, with no leading/trailing whitespace or control character. No new parties.active column is invented. Require every explicit party/contact edge involved in the subject/pair to resolve to that same party; a contact-only/missing/deleted/contradictory identity, unusable document or dangling reference yields settlement_identity_incomplete (or identity_conflict) and no positive financial conclusion. The exact identity_binding assertion cannot override these stored facts. Keep document text inside SQL/input validation only; protected safe projections contain its SHA-256 identityDocumentHash over canonical {docType,docNumber}, never raw documents, names or phone guesses.

##### Same-CoreTx closure algorithm

`loadAuditFinancialClosure(tx,orgId,subject,pairOrNull,coverage)` is a new audit.ts internal helper, called only with the owned RR READ ONLY CoreTx. Source verification is pg-party-schema.ts:25–43, pg-finance-schema.ts:24–130, pg-pos-schema.ts:86–188,275–447 and pos/accounts/list.ts canonical client expressions. Every join constrains org IDs on both sides. All queries are nonlocking. Read each collection with stable (table,id) keyset ordering; deduplicate by TABLE+primary ID, never providerRef, amount, timestamp or document number. A repeated identical row reached by another provenance edge is one row with multiple sorted edges; conflicting copies are integrity failure (exit 3). ProviderRef is unique only with provider and never a payment dedup key.

1. Resolve canonical party and all same-org CRM contacts linking it (including deleted-edge evidence). Select **all** POS tickets with this canonical client key, plus exact direct subject/pair-referenced tickets, all their lines/payments/emissions, all same-client plans/grants, redemptions for those grants or exact subject/line refs, and all same-client signed pos_client_ledger rows. Include every status/kind/date/currency, including void/voided/refund/correction/cancelled/reversed rows; do not filter away evidence to qualify a positive case. Unknown/conflicting identity on a directly referenced record is identity_conflict. Canonical primary party remains authoritative; contradictory non-null contact bridge is a blocker, not a new inferred party.
2. Select all fin_clients with same-org party_id=canonical party. Also probe same-org fin_clients.doc_number and fin_invoices.client_doc_number for exact byte-equal party.doc_number, without normalization/fuzzy match. Document-only matches are **uncertainty probes**, not inferred booking links or assumed settlements: a client probe without this exact party binding or with conflicting doc type, or an invoice reached only by document, produces finance_identity_probe_unresolved. They are never used to attach a booking or clear its debt. A linked fin_client with contradictory non-null document/type also blocks closure. Missing/foreign explicit fin_client ID produces invoice_link_unresolved.
3. Select the union of fin_invoices whose client_id is one of the bound fin_clients, all exact explicit booking.invoice_id invoices, direct-ticket invoice-provider closure from invoice-linkage.md and document-probe invoices. For each reached invoice read all same-org fin_payments by invoice_id. Keep invoice/item/provider provenance; read exact referenced invoice items only to explain source/product uncertainty, never allocate invoice money. Duplicate explicit/POS/provider paths refer to one (fin_invoices,id) and one (fin_payments,id), not multiple money contributions. Missing/foreign/ambiguous targets remain blockers. Fin_payment.amount/status/paid_at and invoice status/total are evidence only in this slice; no invoice/payment status is converted into settledMinor.
4. Read complete same-client account-control source rows for the pure counterfactual defined below, including all relevant bookings/event-product resolution and list-exact pending service lines. In unbounded U, a C-narrow run may read same-client U-minus-C source rows for closure/controls but exports no extra AuditSubject. In bounded U this step stays within U and cannot qualify positive financial closure. Settings come from the same tx; supported currency and payment methods use pos/money.ts and normalizeMethods from pos/settings.ts without a transaction-opening wrapper, memoized app request or default invented method definition.
5. Keep at most 10,000 rows **combined across all pair/client closure collections**, deduplicated (table,id), plus bounded account-control sets. Read limit+1 and count the account-control sets within the same 10,000 budget, not 10,000 per query. Exceeding it, the 256 MiB output cap, the 12 s statement timeout or the 300 s transaction deadline aborts the run with exit 3 before any involving proposal; it never yields an empty successful closure. No unavailable facet is substituted with []. Empty collections mean an actually completed zero-row query, not a failed/denied query.

Monetary operations use requirePosCurrency and storedMoneyMinor (exact supported two-minor-unit currency policy), with BigInt sum/comparison/subtraction. Never pass monetary values through Number, parseFloat, rounding or cross-currency addition. Serialize all minor-unit integers as base-10 strings. Admit source decimal strings first, convert each in its own source currency, and reject subminor/corrupt monetary data as existing incomplete exit 3. A nullable legacy financial amount is unknown, not zero: keep the subject unresolved and block positive closure. Positive historical charge is >0; quantity comparisons use normalized four-place decimal/integer scaling, not floating-point money.

##### Supported shape A: no stored settlement anywhere in the complete known-identity closure

For an active booking with admitted matched identity_binding+historical_charge+service_delivery, require: complete unbounded canonical-party/document closure; NO POS tickets or payments for that client or exact booking; NO invoice/invoice payment in any bound/probe/explicit/provider path; NO client-ledger row of any sign or currency; NO plan/grant/redemption of any status or direct funding/link; no unknown identity or unresolved source reference. Bound fin_clients identity rows alone are allowed if consistent and have no invoices. A stored wallet row summing to zero still disqualifies this shape.

Then `chargeMinor=storedMoneyMinor(historical_charge.amount)`, `settledMinor="0"`, `remainderMinor=chargeMinor.toString()` in that charge currency. With matched delivery, label genuine-debt candidate/normal_collection_review. This is a bounded evidenced candidate, never automatic collection. Missing delivery -> unresolved/review with service_delivery_unverified. Any stored client ticket/payment/invoice/wallet/funding row yields settlement_shape_unsupported (plus specific reason below), null settled/remainder and unresolved for this debt branch, even when the apparent payment is 50.00 of a 100.00 charge. No line/invoice/wallet allocation engine is introduced.

##### Supported shape B: exactly one completely settled ordinary one-service-line ticket

For a positive paid_unscheduled_line, require complete unbounded canonical-party/document closure and exactly ONE same-client ticket, status submitted, with exactly ONE line, kind service, booking_id=null, plan_id=null, redemption_id=null, non-null same-org service product, quantity>0 and line.total>0. Ticket total equals line total in one supported currency. All ordinary pos_payments belong to this ticket, have distinct primary IDs, positive exact amount, metadata.kind absent/null, and their sum equals ticket.total exactly. Require 1–20 payments; multiple ordinary positive tenders may sum to the complete one-line total (for example 40.00 + 60.00 = 100.00) because no line allocation is required. Under/overpayment, a second line even if zero, another client ticket, any negative/zero/refund/correction/unrecognized-kind row, missing/different currency or dangling payment reference blocks this shape. Each method ID must resolve uniquely in the same snapshot stored pos_settings.methods after actual normalizeMethods, with drawsOnCredit===false and requiresCreditDecision===false. Missing settings/definition, duplicate ID, ambiguous legacy credit or wallet-drawing method -> payment_method_unverified; do not branch on hardcoded cash/card names or substitute DEFAULT_POS_SETTINGS to establish history.

Require NO same-client wallet row, plan/grant/redemption of any status, invoice/payment/provider/explicit link, or fiscal emission row for this ticket; any alternate/unallocated client money or finance uncertainty blocks this shape. Another unbilled booking with no money does not block a line's complete ticket settlement, but is retained in account controls. `settledMinor=line.totalMinor`, line `remainderMinor="0"`, reason stored_one_line_ticket_fully_settled. With no exact full proposal envelope label paid-but-unlinked candidate/review, never propose a member by names/amounts. A booking may use this closed-settlement proof only for the exact admitted pair: matched historical charge currency/quantity/product/amount must equal this one line and ticket; historical booking remainder is zero. Then label paid-but-unlinked candidate/propose_link only when ALL existing proposal checks (including stock clearance, noninactive booking and both subjects in C) pass; otherwise paid-but-unlinked candidate/review.

A pair also requires no preexisting invoice/grant/plan/redemption/direct booking-line allocation, no fiscal/refund/correction/provider/wallet involvement, exact same-org line/member/service/quantity/currency and complete approved assertions. These are conjunctive gates; nothing in this narrower money policy relaxes stock_ownership_clearance, actual-owner attestation or prior pair guards.

##### Financial closure result and reasons

Use exact DTO `FinancialClosure={state:"none_stored"|"fully_settled_one_line"|"scope_incomplete"|"identity_incomplete"|"unsupported",currency:string|null,chargeMinor:string|null,settledMinor:string|null,remainderMinor:string|null,sourceRowsSha256:string|null,reasonCodes:string[]}`. State none_stored has a positive charge, `settledMinor = "0"` and `remainderMinor` = charge. State fully_settled_one_line has a positive charge equal to `settledMinor` and `remainderMinor = "0"`. Other states have settled/remainder null; never fake zero. chargeMinor is the admitted positive historical charge for a booking when present, otherwise null; for a paid line it is its exact known stored nonnegative line total (including `"0"`), otherwise null. currency is that charge source currency when admitted, otherwise null; neither current catalog price nor display fallback supplies it. A known-zero line (row L2 of the paid-unscheduled-line table below) may be operationally free with unsupported/nonpositive financial closure and null settled/remainder; it is not a positive settlement claim. scope_incomplete has null sourceRowsSha256 because the all-date closure was not read. Keep reasonCodes sorted/distinct/nonempty.

Specific blockers add applicable sorted codes: settlement_scope_incomplete, settlement_identity_incomplete, identity_conflict, finance_identity_probe_unresolved, invoice_link_unresolved, invoice_settlement_unsupported, wallet_allocation_unsupported, funding_allocation_unsupported, ticket_allocation_unsupported, partial_or_excess_settlement_unsupported, refund_or_correction_unsupported, payment_method_unverified, fiscal_evidence_unsupported, settlement_shape_unsupported. Query/runtime/resource failure is an incomplete run, not a successful unsupported DTO. No signed wallet balance is ever added to POS/finance settlement; wallet rows are signed evidence and a disqualifying allocation uncertainty for both positive shapes.

#### Stable approval identity

Separate run metadata from immutable business intent. `RepairProposal={proposalId,runId,observedAt,proposalHash,status:"pending_owner_approval",intent,evidenceFileRefs}`. Only `intent` is hashed. `runId`, observedAt, proposalId, proposalHash, status, output paths, private document paths, connection/snapshot identifiers and generated file checksums are envelope fields and MUST NOT enter approval identity.

`intent` is an exact-key object:

```ts
interface LinkIntent {
  schemaVersion: 1;
  orgId: string;
  sourceGitSha: string;
  pair: { ticketLineId: string; bookingMemberId: string };
  before: {
    ticket: { id: string; status: string; submittedAt: string; currency: string; total: string; invoiceProviderRef: string | null };
    line: { id: string; ticketId: string; bookingId: string | null; productId: string | null; quantity: string; total: string; planId: string | null; redemptionId: string | null };
    booking: { id: string; updatedAt: string; status: string; productId: string | null; startTime: string; invoiceId: string | null; grantId: string | null; planId: string | null };
    identityKey: string;
    sourceFingerprint: string;
  };
  evidence: { assertionIds: string[]; documentHashes: string[]; assertionsHash: string };
  change: { field: "pos_ticket_lines.booking_id"; from: null; to: string };
  effects: {
    paidUnscheduledDelta: -1; unbilledBookingDelta: -1 | 0;
    paymentMinorDelta: "0"; stockQuantityDelta: "0"; lifecycleChanges: [];
    wallet: { before: CurrencyBalance[]; after: CurrencyBalance[]; ledgerRowsDelta: 0 };
    accountDisplay: {
      before: AccountControlValue; after: AccountControlValue;
      visibleCappedRow: null; visibilityReason: "not_predicted_limit_or_sort";
    };
  };
  accountControlSha256: string; // canonical AccountControlSource, never run metadata
  blockers: [];
}
```

`CurrencyBalance={currency:string,balanceMinor:string}`. `AccountControlValue={pendingScheduling:number,pendingInvoice:number,logicalRowPresent:boolean,posCurrency:string,displayBalanceMinor:string}`. Counts are safe bounded integer row counts, never monetary Numbers. The exact projections/counterfactual are selected below.

Use validated normalized IDs/lowercase hashes, ISO UTC instants and the exact admitted decimal strings above. Preserve array order where semantic; sort set-like assertion IDs/document hashes lexicographically, remove duplicates, and sort every object key recursively by Unicode code point. Serialize with UTF-8 JSON, no insignificant whitespace, no undefined, NaN, Infinity, Dates or numeric monetary values. `sourceFingerprint` hashes the exact safe source projection listed below; it excludes run/output metadata and PII labels. `assertionsHash` hashes canonical admitted assertion content with document hashes, excluding local privateRef paths. Thus a changed business/evidence fact changes approval identity, but a new run or relocated private evidence file does not.

`proposalHash=SHA256(canonicalUTF8(intent))`. Derive UUID proposalId as UUIDv5, fixed namespace `d0c65690-658b-5b7e-b470-b6beb074168f`, UTF-8 name equal to the lowercase proposalHash. Extract the existing pure implementation from `scripts/qa/seed/ids.ts:20–30` into `src/server/utils/uuid-v5.ts`, exporting `uuidv5(name:string,namespace:string)` with the namespace required. Keep the seed module's public default-namespace wrapper compatible, but make it delegate to the neutral helper; the audit imports only the neutral helper, never QA defaults/environment. Preserve the existing Node `createHash('sha1')` algorithm: concatenate the namespace's 16 decoded bytes with name bytes, take the first 16 digest bytes, set version nibble to 5 and RFC variant bits to binary 10, then format lowercase UUID. No new package is selected. SHA-1 serves namespace UUID derivation only; SHA-256 remains the approval integrity digest. Same UUID with a different SHA-256 is a fatal integrity conflict, never an overwrite. Sort emitted proposals by `(ticketLineId,bookingMemberId,proposalHash)`. Two fresh runs with different run UUIDs/timestamps and identical business/assertion inputs MUST yield equal intent bytes, hashes and proposal UUIDs.

No executor is introduced. A later repair spec must revalidate these exact before states, authority and effects; the report cannot convert pending_owner_approval into apply authorization.

#### Exact source-fingerprint projection

Before hashing a candidate, create an exact-key `{schemaVersion:1,orgId,booking,ticket,line,identity,payments,wallet,plans,grants,redemptions,invoices,invoiceLinks,fiscal,stock,financialSourceRowsSha256,accountControlSha256}` object. booking/ticket/line use exactly the LinkIntent.before fields above, plus booking partyId/crmContactId and ticket partyId/crmContactId as nullable UUIDs; identity is `{clientKey,status,edges:[{kind,id,partyId,deletedAt}]}` from the canonical resolver, with absent edge fields normalized to null. No names, email, phone or raw note/metadata enter this projection.

Related arrays contain only the following exact safe fields, sorted lexicographically by lowercase UUID (ledger sequence as decimal integer string where applicable); absent fields are explicit null, never undefined:

- payments: `{id,ticketId,paidAt,amount,method,kind}`, where kind is only the existing metadata.kind scalar or null; amount is a normalized source-currency decimal string (e.g. "100.00"), obtained through exact storedMoneyMinor/minor serialization; numeric JS money is forbidden.
- wallet: `{id,kind,amount,currency,ticketId,bookingId,planId,createdAt}`.
- plans: `{id,status,totalAmount,currency,bookingId,settledAt,cancelledAt}`.
- grants: `{id,status,serviceProductId,sessionsTotal,sourceTicketId,sourceLineId}`; redemptions: `{id,grantId,bookingId,ticketLineId,reversedAt}`.
- invoices: `{id,provider,providerRef,status,shadowed,currency,total}` ; invoiceLinks: `{bookingId,ticketId,invoiceId,via,state}`, with nullable IDs, via `explicit|ticket_provider_ref` and state `resolved|missing|ambiguous|foreign_or_unavailable`; fiscal: `{id,ticketId,status,createdAt}`.
- stock: `{availability,entries:[{id,status,type}],ledger:[{id,entryId,itemId,warehouseId,qtyDelta,valueDelta}],accruals:[{id,status,source,sourceId,itemId,realizedEntryId,realizedQty,realizedValue}]}` from authorized exact-source evidence only. An unavailable/denied stock facet blocks the proposal rather than substituting empty arrays as clearance. The stock_ownership_clearance assertion's fingerprint is SHA-256 of this canonical stock object, not the containing sourceFingerprint, avoiding circular identity.

The two added hashes are non-null lowercase SHA-256 for eligible intents. accountControlSha256 equals LinkIntent.accountControlSha256 and the hash defined below. financialSourceRowsSha256 hashes this exact safe closure DTO before sourceFingerprint, so there is no circular hash:

```ts
interface FinancialSourceRows {
  schemaVersion: 1; orgId: string; coverage: "organization_all_date";
  identity: { partyId: string; identityDocumentHash: string; contactEdges: { id:string; partyId:string|null; deletedAt:string|null }[] };
  financeClients: { id:string; partyId:string|null; provider:string; providerRef:string; identityDocumentHash:string|null; via:("party"|"document_probe")[] }[];
  tickets: { id:string; status:string; partyId:string|null; crmContactId:string|null; submittedAt:string; currency:string; totalMinor:string; invoiceProviderRef:string|null }[];
  lines: { id:string; ticketId:string; kind:string; productId:string|null; bookingId:string|null; quantity:string; totalMinor:string; planId:string|null; redemptionId:string|null }[];
  payments: { id:string; ticketId:string; paidAt:string; amountMinor:string; method:string; kind:string|null }[];
  methodPolicies: { id:string; drawsOnCredit:boolean|null; requiresCreditDecision:boolean }[];
  wallet: { id:string; kind:string; amountMinor:string; currency:string; ticketId:string|null; bookingId:string|null; planId:string|null; createdAt:string }[];
  plans: { id:string; status:string; totalMinor:string; currency:string; bookingId:string|null }[];
  grants: { id:string; status:string; sourceTicketId:string; sourceLineId:string; serviceProductId:string; sessionsTotal:number }[];
  redemptions: { id:string; grantId:string; bookingId:string|null; ticketId:string|null; ticketLineId:string|null; reversedAt:string|null }[];
  invoices: { id:string; clientId:string|null; provider:string; providerRef:string; status:string|null; shadowed:boolean; currency:string|null; totalMinor:string|null; via:("client"|"document_probe"|"explicit"|"ticket_provider_ref")[] }[];
  financePayments: { id:string; invoiceId:string; providerRef:string|null; method:string|null; paidAt:string|null; amountMinor:string|null; status:string|null; kind:string|null }[];
  invoiceLinks: { bookingId:string|null; ticketId:string|null; invoiceId:string|null; via:"explicit"|"ticket_provider_ref"; state:"resolved"|"missing"|"ambiguous"|"foreign_or_unavailable" }[];
  fiscal: { id:string; ticketId:string; status:string; createdAt:string }[];
}
```

All arrays and via sets use canonical sorted distinct rows/strings; org_id is checked by queries, not omitted to hide another tenant. Session details/notes/raw documents/method labels are not exported. Finance payment currency comes only from its parent invoice; absent unsupported source currency leaves money unknown/null and blocks positives, not converted to POS currency. Every minor amount uses its row's admitted currency. Null source timestamps/amounts are preserved where actual schema allows; positive-shape required facts must be non-null. Larger nonmonetary values obey audit-cli bounds. A fin_client document hash is null only when doc type/number are absent, never evidence of a match. This exact DTO records both duplicate provenance and unique source rows without adding them as money. Its query failures abort rather than producing a hash of empty data.

These arrays include every same-org source reference used to admit the pair, including absence established by the exact closure query. Malformed, duplicate/conflicting or unsupported safe-source rows block that candidate; do not silently omit a row to make the projection match. Ineligible/unreadable relationships stay report evidence and do not enter a supposedly empty blockers list. A change to any source amount, linkage, lifecycle/version, payment/refund/fiscal/funding or stock fact changes sourceFingerprint and therefore proposalHash.


#### Exhaustive ordered classification

Before streaming a subject, evaluate its relevant bounded approved pair gates in the same snapshot, so propose_link is final at emission. A later sorted proposal pass re-reads that pair under the same snapshot and may not rewrite subject classifications; a differing proof/hash is incomplete integrity failure. Keep only the <=1000 evidence/pair index and small eligibility receipts, not every closure or intent. Apply global checks, then exactly one row in the relevant table (first matching row wins). primaryClassification is one of the exact display strings below; recommendedNextAction is none/review/propose_link/normal_collection_review. `reasonCodes` and `uncertainty` are sorted distinct string arrays. Include the row's required codes plus every applicable orthogonal blocker/caveat from the closed lists below; never hide a contradiction because an earlier friendly label matched. A completed/old date alone matches no positive row.

##### Global checks and evidence overlaps

Unknown stored booking/ticket status, malformed source, missing/deleted/contradictory required identity or otherwise-valid conflicting external assertions yields unresolved/review before either table. Required reason/uncertainty is respectively source_corrupt, identity_unresolved/identity_unresolved, identity_conflict/identity_conflict or external_evidence_conflict/external_evidence_conflict. Read/decode corruption that prevents complete control/scope proof still aborts with exit 3 under audit-cli; this label applies only when complete inventory is possible and the unusable subject can be retained honestly. Assertion syntax/wrong subject kind/wrong member is invalid input (exit 2), not silently reclassified.

`validUnused` means an admitted unused_reservation for this actual booking member, used=false, at an allowed asOf, without a service_delivery assertion. Any admitted service_delivery plus unused for the same member is external_evidence_conflict, even when instants differ; this slice has no partial-use/time reinterpretation. `validStale` means an admitted stale_lifecycle for the same member with observedStatus equal to actual snapshot status and claimedStatus a DIFFERENT existing status. observedStatus mismatching actual snapshot is external_evidence_conflict; observedStatus==claimedStatus is NOT stale and contributes reason stale_assertion_no_change. Different asserted claims/observations that disagree are conflicts. Stale assertions do not change operational status, funding, attendance or money.

Both validUnused and validStale without delivery are nonconflicting: unused wins if that precedence row is reached, reasonCodes include unused_reservation_attested and stale_lifecycle_attested, action review, uncertainty none unless other required caveats apply. This is an exact overlap rule, not a new lifecycle condition. Inactive or current-free branches may precede it; retain both attested reasons as facets without changing those branches. Positive historical charge always precedes operational free/unused/stale; if its financial proof is unsupported it stays unresolved rather than falling through. A full settled advance plus unused is not a contradiction: settlement does not establish delivery; validUnused remains a facet but the historical settled branch wins. Delivery+unused is always the global conflict above.

##### Booking decision table

Abbreviations: H = admitted positive historical_charge; B = shape B proven for the exact approved pair; A = shape A matched delivery with no stored settlement; F = the current resolved active catalog product has `unit_price` exactly `0`; `Unused` = validUnused; `Stale` = validStale. U keeps its cohort meaning from audit-cli.md and never abbreviates validUnused. Historical charge, current price and badge predicates remain distinct.

| Order | Condition after global checks | primaryClassification / action | Required reasonCodes | Required uncertainty |
|---|---|---|---|---|
| B1 | actual status cancelled/rejected/no_show | inactive / none | inactive_booking; append historical_charge_on_inactive when H | historical_charge_unresolved when H; no cancellation fee inferred |
| B2 | H and B | paid-but-unlinked candidate / propose_link if exact full envelope qualifies, else review | historical_charge_fully_settled; stored_one_line_ticket_fully_settled; proposal_not_eligible if review | [] when proposed; otherwise the exact proposal blocker codes |
| B3 | H and A | genuine-debt candidate / normal_collection_review | historical_unpaid_charge; no_stored_settlement | [] |
| B4 | H and neither B nor A | unresolved / review | historical_charge_unresolved plus exact financial/delivery/funding reasons | same missing/unsupported fact codes; settled/remainder stay null |
| B5 | no H and F | free / none | current_catalog_free | historical_charge_unverified |
| B6 | no H, not F and `Unused` | unused-reservation candidate / review | unused_reservation_attested; stale_lifecycle_attested too when `Stale` | historical_charge_unverified |
| B7 | no H, not F, not `Unused` and `Stale` | stale-lifecycle candidate / review | stale_lifecycle_attested | historical_charge_unverified |
| B8 | otherwise | unresolved / review | historical_charge_unverified; add current_price_unknown when resolved price null, service_delivery_unverified when absent | historical_charge_unverified plus applicable missing-fact codes |

For every H+F branch append current_catalog_price_differs (reason), retain currentCatalogFree=true, and preserve canonical badge free exclusion. Evidence-free F is only a current operational classification; never historical forgiveness or paid state. B1 wins over free/history/unused/stale unless the global conflict wins first. A nonmatching delivery product/quantity/identity is external_evidence_conflict; a simply absent delivery gives service_delivery_unverified. Plan/grant funding remains a facet and blocks A/B through funding_allocation_unsupported. A finite U interval makes H use B4 with settlement_scope_incomplete, even if a selected-cohort pair appears fully paid. No historical charge is inferred from a current positive catalog price.

##### Paid-unscheduled-line decision table

Here subject kind describes an actual service line with booking_id=null and plan_id=null, not proof that money was received. Canonical badge contributors and list-exact legacy-voided review subjects share this kind. When an admitted exact line outside those count predicates is reviewed, retain its contribution=false; never invent a booking or bypass U/C membership. Product/current catalog price never determines its historical sale amount.

| Order | Condition after global checks | primaryClassification / action | Required reasonCodes | Required uncertainty |
|---|---|---|---|---|
| L1 | parent ticket status void or legacy voided | inactive / none | inactive_ticket | [] (other financial caveats retained as facets) |
| L2 | exact stored line total `0` and parent submitted one-line service ticket total `0`, no payment/wallet/funding/invoice/fiscal rows in complete known-identity closure | free / none | zero_value_service_line | [] |
| L3 | shape B complete positive one-line settlement | paid-but-unlinked candidate / propose_link only with exact full envelope for one C booking, otherwise review | stored_one_line_ticket_fully_settled; proposal_not_eligible if review | [] when proposed, otherwise exact proposal blockers (missing_pair_evidence if none) |
| L4 | otherwise (includes partial/refund/funding/unknown method, finite U, ambiguous identity or zero line without complete no-money proof) | unresolved / review | exact closure blockers; payment_settlement_unverified when no sufficient proof | same missing/unsupported fact codes |

A paid-unscheduled line never selects genuine-debt, unused-reservation or stale-lifecycle. unused/stale assertions for this subject kind fail input admission. Complete positive source settlement is enough for L3/review without external evidence, but only an actual executing owner with the full approved pair envelope can propose_link. A valid no-change stale assertion on its referenced booking cannot make a line stale. L2 must query and prove empty collections; it cannot use unavailable reads as zero. Finite U cannot satisfy L2 or L3; L1 remains operationally inactive. An ordinary partial payment of 50.00 on a 100.00 line yields L4, null settled/remainder and partial_or_excess_settlement_unsupported, never a debt of 50.00.

##### Closed overlap and financial qualification vectors

Implement all vectors inside the existing native8 behavior tables (especially evidence, canonical controls and stable hashes) and pure classifier tests; do not add a ninth behavior. Amounts are PEN; minor values are base-10 strings with two minor units (100.00 PEN = `"10000"`).

| Vector | Setup | Expected row and result |
|---|---|---|
| V1 | Active booking; current catalog price `0`; H = 100.00 PEN; matched delivery of quantity 1 and identity; complete shape A with no tickets, invoices, ledger or funding | B3 genuine-debt candidate / normal_collection_review; chargeMinor `"10000"`, settledMinor `"0"`, remainderMinor `"10000"`; reasons historical_unpaid_charge, no_stored_settlement, current_catalog_price_differs; no uncertainty; currentCatalogFree true; badge excluded; no proposal |
| V2 | V1 without the delivery assertion | B4 unresolved / review; service_delivery_unverified; settled and remainder null |
| V3 | V1 with complete shape B for the exact pair | B2 paid-but-unlinked candidate (the envelope decides propose_link or review); not free |
| V4 | V1 with a finite U interval | B4; settlement_scope_incomplete; no all-date query |
| V5 | H = 100.00 with, separately: a POS payment of 50.00; a refund after a 100.00 payment; signed wallet rows +100.00 and −100.00; an invoice paid 100.00 reachable by POS provider and explicit invoice paths; a missing document; a contact-only alias | Each is unresolved with null remainder and its specific blocker. Invoice/payment rows dedup by table/id, so the paid invoice counts once (never 200.00); no wallet netting; no guessed refund remainder; a zero-net ledger still blocks positive allocation |
| V6 | Evidence-free current-free booking | B5 free / none; historical_charge_unverified |
| V7 | Current-free booking with H and unsupported closure | B4 |
| V8 | Inactive booking with H and current-free price | B1 inactive / none; historical_charge_unresolved; a delivery+`Unused` conflict or another global conflict makes it unresolved instead |
| V9 | No H, not F: `Unused` only; `Stale` only; both | B6; B7; B6 with both attested reasons and review |
| V10 | No H, not F: delivery plus `Unused`; `Stale` with observedStatus differing from the snapshot | Global external_evidence_conflict, unresolved |
| V11 | observedStatus = claimedStatus = snapshot status | B8 with stale_assertion_no_change |
| V12 | Unknown stored status in an assertion | Input failure (exit 2), not an invented stale fact |
| V13 | Line of 100.00 PEN on a one-line ticket paid by ordinary tenders of 40.00 and 60.00, complete shape B | L3 / review without the full pair envelope; L3 / propose_link with it |
| V14 | V13 with a missing method definition, legacy credit method, a second line, partial payment, overpayment, refund, wallet, plan, grant, invoice or foreign identity | L4 (a global identity conflict takes priority) |
| V15 | Void or legacy-voided ticket; known-zero one-line ticket with a complete no-money closure | L1; L2 |
| V16 | `unused_reservation` or `stale_lifecycle` assertion on a paid_unscheduled_line | Exit 2 |

#### Hashed wallet and account-display counterfactual

Source list.ts:33–156 defines logical account keys as union of ledger, open plans, active grants, pending lines and unbilled bookings. Merely having a customer or paid ticket does NOT keep a logical account row. A valid link may remove the last two pending contributors, making its logical row disappear while wallet is unchanged. Do not predict a rendered capped/sorted list position or visible-row delta.

`AccountControlSource` is the exact canonical projection `{schemaVersion:1,coverage:"organization_all_date",orgId,clientKey,posCurrency,accountingTimezone,identityEdges,walletRows,openPlanRows,activeGrantRows,listPendingLineIds,listUnbilledBookingIds,subjectSources}`. All arrays are sorted by stable UUID/table+UUID and deduplicated; same row conflicting values aborts incomplete. `identityEdges` uses the existing safe identity projection. `walletRows` is the complete safe wallet array already defined above (ALL currencies/signs/rows, even net-zero); openPlanRows is `{id,currency,totalAmount}` for status=open; activeGrantRows is `{id,status,sessionsTotal,liveRedemptions:number,expiresAt:string|null}` using list.ts exact active/nonexhausted/nonexpired predicate at the report snapshot's accounting local date. The local date uses the verified stored `fin_settings.timezone`; list.ts's `America/Lima` fallback for a missing row never applies because audit-cli.md refuses that org with exit 2. No raw label or document enters the hash.

`subjectSources` contains exact safe `{kind:"line",id,ticketId,ticketStatus,submittedAt,currency,productId,quantity,total,bookingId,planId,redemptionId}` for all same-client service lines, and `{kind:"booking",id,updatedAt,status,startTime,productId,eventTypeId,resolvedProductId,currentCatalogUnitPrice:string|null,invoiceId,grantId,planId,liveTicketLineIds:string[]}` for every same-client booking in U. currentCatalogUnitPrice is the exact admitted normalized decimal (not rounded money); it may be null and is used for zero-price predicate only. Retain referenced current product/event versions and linkage facts through these values. listPendingLineIds/listUnbilledBookingIds are calculated from these sources using exact list.ts predicates (including legacy voided distinction), not from export row limit. The same source can be in C or U-minus-C; C controls do not truncate full-client predictions. All account rows share the same 10,000-row closure budget.

Compute `accountControlSha256=SHA256(canonicalUTF8(AccountControlSource))` and put it in LinkIntent. It excludes run/snapshot IDs, observation/local dates and private paths. The actual snapshot-derived eligible active-grant set is hashed; its expiry-driven membership changes alter the hash, while a new timestamp/date with identical sets does not. Record the accounting observation date in run metadata only. Source-relevant changes to another same-client subject, wallet, plan, grant or policy alter this hash and therefore proposal identity. Do not put predictions only in run metadata.

Pure `projectLinkEffects(source,pair)` builds the before AccountControlValue, clones this typed source and changes only the exact selected line.bookingId from null to pair.bookingMemberId, then recomputes both exact list predicates and badge predicates. Treat listPendingLineIds/listUnbilledBookingIds as derived checked controls, never authoritative mutable inputs. Before projection, verify them against the snapshot source; mismatch aborts incomplete. For booking live-ticket exclusion, the immutable snapshot liveTicketLineIds contains any live ticket-line kind, not just service lines in subjectSources. The selected line is absent from that set because its expected bookingId is null. Under this one-change counterfactual, projectedLiveIds(b)=sortedDistinct(snapshotLiveIds(b) UNION all non-void/non-voided subjectSources line IDs whose cloned bookingId=b.id). This adds the newly linked line without erasing existing product/custom/other live references. Recompute unbilled from projectedLiveIds and all other unchanged canonical fields. Do not mutate a second stored booking/source field merely to make the count change. No SQL UPDATE, source wrapper mutation, second snapshot or fabricated payment occurs. The newly linked nonvoid line removes one badge paid-unscheduled contributor. It removes one unbilled booking contributor only if that exact booking currently satisfies canonical UNBILLED_BOOKING_WHERE; otherwise the delta is `0` (for example a current-free, historically paid booking). Before/after list pendingScheduling and pendingInvoice counts are per-client exact subject counts, not limited UI/client count deltas.

Wallet.before/after are equal sorted CurrencyBalance arrays computed by signed per-currency BigInt SUM of complete walletRows. This is display projection only, never settlement allocation. A known complete empty ledger gives `[]`; an unavailable ledger gives no projection and no proposal, not `[]`. `ledgerRowsDelta` is `0`. With the supported B proposal envelope walletRows must be empty, so an admitted intent normally has before=[]/after=[]; multi-currency projection vectors still prove invariance and the candidate is rejected if those rows exist.

`logicalRowPresent` is true iff at least one canonical key source remains: at least one ledger row (even with balance `0`), open plan, active grant, list pending line or list unbilled booking. `posCurrency` equals list policy's supported pos_settings.currency, with its exact missing-row PEN display fallback; an absent current-currency wallet bucket gives displayBalanceMinor="0". This fallback is a display fact only; it never supplies a missing payment method or settlement proof. Preserve posCurrency and displayBalanceMinor before/after independently of row presence. `visibleCappedRow=null`, visibilityReason=not_predicted_limit_or_sort always; no fabricated visible -1 or membership promise.

Exact counterfactual vectors, tested both purely and within existing native stable-hash/canonical-control behaviors:

1. Source has only one paid-unscheduled line and its one eligible unbilled member, no wallet/plan/grant/other contributors. Before `{pendingScheduling:1,pendingInvoice:1,logicalRowPresent:true,posCurrency:"PEN",displayBalanceMinor:"0"}`; after `{pendingScheduling:0,pendingInvoice:0,logicalRowPresent:false,posCurrency:"PEN",displayBalanceMinor:"0"}`. Badge deltas −1 paid-unscheduled and −1 unbilled; wallet `[]` → `[]`; `ledgerRowsDelta: 0`; rendered list presence unknown. An otherwise complete shape B and envelope may emit this intent.
2. Same pair plus another unbilled booking for the same client: before pendingScheduling 1, pendingInvoice 2, logical row present; after 0, 1, still present. Badge deltas are still −1 and −1; wallet unchanged. Changing or removing that other booking changes accountControlSha256 and proposalHash even with identical pair inputs.
3. Same pair, but the booking is current-free and its historical charge is fully settled: list pendingInvoice is 0 before and after; pendingScheduling goes from 1 to 0; badge deltas are −1 paid-unscheduled and 0 unbilled. The row disappears only if no other key remains. Do not infer historical forgiveness.
4. Pure source wallet rows of +100.00 PEN (`"10000"`) and −50.00 USD (`"-5000"`), or zero-net signed PEN rows: before and after preserve every currency and balance, and the current-currency display falls back to `"0"` where the bucket is absent; `ledgerRowsDelta: 0`; the logical row remains through its ledger key. This source **cannot emit** a supported B proposal because wallet allocation is unsupported. Do not manufacture a positive repair fixture to exercise the projection.

### Review artifact: contracts/invoice-linkage.md

### Same-snapshot invoice-linkage closure

`bookingTicketLinks` at pinned pos-accounts.service.ts:651 reads direct `pos_ticket_lines.booking_id` links and then the physical-product lines of those tickets. It does not read invoices or an invoice-provider bridge. Do not call that wrapper from this audit: it opens its own transactions and cannot provide complete invoice/settlement closure.

Actual source references for bridge semantics are `listBookingsForInvoice` at scheduling-bookings.service.ts:3339–3397 (explicit booking invoice ID plus ticket-provider path) and `ticketRefsForBookings` at 3659–3750 (direct ticket refs followed by invoice lookup). They also own transactions and are reference logic, not callable snapshot adapters. The invoice schema at pg-finance-schema.ts:24–60 has uniqueness `(org_id,provider,provider_ref)`; a provider_ref alone is not guaranteed unique across providers.

Implement a transaction-accepting `loadAuditInvoiceLinks(tx,orgId,bookingIds,ticketIds)` inside audit.ts. IDs are bounded by the current admitted inventory batch; process additional referenced IDs in the same stable keyset snapshot, never a separate pool. Every join/lookup explicitly equates organization IDs, including ticket, line, booking and invoice sides. Query only safe identity/status/currency/amount/link columns, not invoice customer PII.

1. Read `sched_bookings.invoice_id` for each authorized booking. Non-null is existing invoice linkage even when its referenced invoice is missing or foreign. Look up exact `fin_invoices.id` in the same org; missing/inaccessible target yields `invoice_link_unresolved`, never unlinked eligibility. Preserve invoice status/shadowed flags without treating them alone as settlement proof.
2. Independently read all direct same-org `pos_ticket_lines.booking_id=b.id` links with same-org tickets, preserving live, void, legacy voided, refund and fiscal facts. Count controls continue to use their canonical predicates; evidence closure does not silently change badge/list behavior.
3. For every nonempty `pos_tickets.invoice_provider_ref` in the authorized candidate/ticket closure, query all same-org `fin_invoices` with exact byte-equal `provider_ref`. Do not normalize case/trim or assume a provider absent from the ticket schema. Record all `(invoiceId,provider,providerRef,status,shadowed)` matches. Exactly one nonshadowed match and no conflicting match establishes `via:ticket_provider_ref`; multiple provider/ID matches, only shadowed matches or no match yields explicit ambiguous/unresolved linkage, not an arbitrary first row.
4. Include explicit booking→invoice links for those matched invoice IDs in the authorized booking universe, retaining `via:explicit` alongside ticket-derived provenance rather than multiplying a subject. Do not fetch outside approved scope or infer a booking from matching customer name, amount, document number or date.

Any explicit invoice link, nonempty ticket invoice-provider reference, ambiguous provider match or unresolved invoice target blocks a paid-line→booking repair proposal in this slice, regardless of an otherwise matching external settlement assertion. A void/refunded invoice remains linked evidence requiring separate review; it is not permission to attach a different paid line. Financial classification records invoice/payment/partial/pending/void facts as evidence only. Any such invoice/payment path makes the two selected positive financial shapes unsupported; do not add invoice+POS money or infer a positive remainder. Positive no-settlement debt requires the complete canonical-party/document client closure in evidence-and-proposals.md, including fin_clients.party_id and exact document-number uncertainty probes; these probes never infer a booking link. Finite owner U does not authorize that all-date client closure and cannot yield positive financial labels/proposals.

Required counterexamples: an invoice-linked booking with no POS booking line; a reconciled ticket with no explicit booking invoice ID; duplicate same-org provider_ref across two providers; shadowed-only match; foreign-org same reference; broken explicit ID; void/refund invoice; and duplicate explicit/ticket paths. All retain one subject and produce no unsupported link proposal. Baseline badge/list controls remain unchanged, and every evidence read shares the owned READ ONLY snapshot.

### Review artifact: contracts/native-auth-prerequisites.md

### Shared owned-child native auth and baseline prerequisite

This is test-fixture setup, not runtime authentication or a production migration. It applies before public profiles/member/org RLS/FK DDL in the owned audit/correction/movements/navigation/CRM child databases. F7 owns the reusable test helper src/server/test-utils/operator-native-auth-fixture.ts and canonical SQL source src/server/test-utils/fixtures/operator-native-auth.sql; dependent native fixtures reuse it or its exact qualified source recipe, not a permissive substitute. No F3 runtime import or cycle is introduced.

#### Exact full-lane controller

Use the existing qa-native CI controller (.github/workflows/ci.yml:652–684), image pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff, initial POSTGRES_USER=minion_qc and database minion_qc_vectors. Actual vector extension must be version 0.8.6 in extensions; actual database name must remain minion_qc_vectors, as brains.effect-ownership.sql.integration.test.ts:131–132 requires. Bind only literal `127.0.0.1` or `[::1]` with an explicit owned port (55462 in CI), opt-in MINION_QC_DISPOSABLE='1', no URL query/hash and actual minion-360-disposable:v1 database marker. Verify initial current_user=minion_qc/rolsuper=true before child/auth-role DDL; do not elevate a current role. Verify existing app_ledger/anon/authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS from canonical CI setup. Missing/unsafe roles or extension/controller metadata fails before fixture DDL; never repair shared roles or change lane identity.

Whole qa-native MINION_QC_DATABASE_URL continues to point at THIS controller, plus separately admitted full-schema HUB_TEST_DB_URL required by other suites. Each feature creates only its uniquely named minion_qc_faces_<feature>_<32 hex digits> child using its exact approved prefix/ownership receipt, sets child marker and requalifies actual child before auth/public setup. Never set whole-lane controller URL to a feature child or substitute vanilla PostgreSQL 15. The separate existing crm-concurrent lane remains its independently owned PG15 recipe.

#### Child auth objects and exact semantics

Before public fixture DDL, require a recorded OWNED child (not minion_qc_vectors/controller or shared QA), actual child name/marker/owner and injected controller handle. The helper verifies these again, then creates child-local auth schema and minimal canonical auth.users(id uuid PRIMARY KEY,email text). This is the same prerequisite used in tests/fixtures/notification-migrations/reconciliation-harness.ts:374–401; this native setup does not create GoTrue sessions or real user accounts.

Install auth.uid() RETURNS uuid LANGUAGE sql STABLE, SECURITY INVOKER, exact canonical expression:

```sql
SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
  nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
```

Before the child auth-schema ACL SQL, establish the canonical `postgres` ACL sentinel from reconciliation-harness.ts:361–366. On the selected pristine PG18 controller, POSTGRES_USER=minion_qc does not create that role. The initial qualified owner creates `postgres NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS` only if absent; otherwise verify those exact attributes and no role-membership edges. This is only the principal named by canonical `GRANT USAGE ON SCHEMA auth TO postgres`, never the migration actor, login, table owner or an elevation path. Incompatible existing attributes fail setup before ACL installation; never ALTER the role to force qualification. A pristine-controller case starts with no postgres role and proves helper setup succeeds independently of suite order; mutant LOGIN/SUPERUSER/inherited-edge fixtures fail. Preserve controller current_user=minion_qc throughout.

Before public baseline ACL installation, also establish the service_role ACL-recipient sentinel. Baseline schema.sql:11247–11256 and 11378–11381 name it in organization/member/profile grants, but the selected plain CI controller does not create it. The qualified initial owner creates service_role NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS only if absent; otherwise require those exact attributes and no pg_auth_members edge in either direction. It is an inert fixture grant recipient, not a GoTrue service token, test login, business execution role or a claim to reproduce cloud service-role powers. Never grant membership, SET ROLE to it, ALTER an incompatible role, or expand app_ledger rights. A fresh-controller case with no service_role proves setup before the actual baseline grants; unexpected LOGIN/SUPERUSER/BYPASSRLS/INHERIT/membership fails before public DDL. Controller remains minion_qc and business SQL remains app_ledger.

Use the source harness's function owner/ACL recipe, not a null-returning or always-allow mock. The owned initial superuser creates supabase_auth_admin and dashboard_user with NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS only if absent; verify actual existing attributes and grant no role membership edges. In the owned child, auth schema PUBLIC rights are revoked as source specifies; temporary schema USAGE for supabase_auth_admin permits the canonical owner/ACL setup and is restored afterward. auth.uid owner is supabase_auth_admin, PUBLIC/dashboard_user EXECUTE matches the canonical harness, prosecdef=false/provolatile='s'. Preserve source schema/function ACL; do not grant app_ledger extra auth-schema/table access merely to make direct queries pass. No SELECT auth.users grant to app_ledger or browser role and no SET JWT subject to impersonate a profile. Existing unexpected auth object/body/owner/ACL fails setup rather than CREATE OR REPLACE of an unqualified object. Scope all auth SQL to the owned child.

After auth prerequisites, create public baseline source tables. profiles includes baseline schema.sql:4034–4049 fields (notably NOT NULL email), applicable current source-fixture lifecycle columns, and profiles_id_fkey referencing auth.users(id) ON DELETE CASCADE (schema.sql:8118). Seed synthetic auth.users before matching profiles with explicit synthetic email. Any other selected source FK to auth.users gets its actual parent; never disable a FK. Public profiles/org/member ACL/RLS/policy role arrays preserve the source baseline/current catalog; no invented app.current_profile_id policy, profile/member UPDATE grant or organization SELECT grant to app_ledger. The fixture's current lifecycle columns are explicit test shape, not proof the production target has them; actual target schema qualification remains mandatory.

Record schema/function owner/attributes/prosrc/config/execute ACL, auth.users columns, profile FK/defaults and public policy/ACL fingerprints before service tests. Validate JWT-sub/claims empty and actual auth.uid() NULL through an admitted owner probe. app.current_profile_id MUST NOT become JWT identity. Use source policy evaluation/negative probes under actual app_ledger: protected direct org reads/membership locks fail and profile self-select without JWT reveals no row or fails under the preserved baseline ACL. Do not widen schema grants to replace a denied negative probe with a positive query. Authorization capabilities are derived separately under the explicitly admitted fixture-controller phase where the feature contract selects it; business SQL remains actual app_ledger/GUC/RLS.

#### Exact reusable helper and teardown

operator-native-auth-fixture.ts exports installOperatorNativeAuthFixture(owner,expectedOwnedChildIdentity) for child-only schema/function installation and assertOperatorNativeAuthFixture(owner,expectedOwnedChildIdentity) after public source DDL/seed for catalog/FK/policy/JWT assertions. owner is the qualified injected PostgreSQL client; identity includes recorded child name/owner/marker and validated feature prefix. Neither helper accepts arbitrary SQL/path/function callbacks, connects globally, opens an application pool or creates/deletes a database. The owning feature handles child creation, other table/role fixtures and business tests. Use actual source SQL fixture file via readFile, no copied service mutation or fake capability composer.

Missing auth schema/uid/FK/email/required ACL-recipient role/ACL/policy fails qualification before source tests, not optional skip. These assertions run inside existing registered native behaviors; no new unregistered integration test or changed semantic count. Add helper contract checks to the existing ordinary/native harness as appropriate, not a second test runner. The separate standalone operator bootstrap still needs its actual synthetic GoTrue target/token verification; this database auth.uid fixture never substitutes for that proof.

Finally release blockers, rollback/close all child clients, restore test-local bindings/ALS, and let the owning feature DROP only its recorded uniquely owned child database. Auth objects disappear with that child. Keep controller/vector/extensions and controller-owned roles; no per-test global role teardown or shared QA reset. Repeated native runs use a new owned child and preserve controller qualification. No setup/DDL/test was executed during document authoring.

### Review artifact: contracts/native-exact-count.md

### Scoped exact native assertion counts

The pinned report validator enforces a minimum and presence of every unique required full name. It intentionally accepts extra passing assertions in an admitted file. F7 owns the following additive harness change before a new FACES suite claims an exact count; unrelated legacy admissions retain their current behavior.

#### Manifest and report delta

Modify scripts/qc/native-postgres-manifest.ts NativePostgresAdmission with optional `exactAssertions?: boolean`. Omitted or false preserves minimum-count semantics. The initial F7 audit admission sets exactAssertions:true with minimumAssertions=8 and its eight existing requiredBehaviors. No future F3/F1/F2 file is registered before that owning slice creates it. Those slices set true on their own admission when claiming an exact count; F3's thirteen-name source suite uses true, and later F5 cases extend its existing behavior without creating a fourteenth name.

Preserve the existing ownership validator's requiredBehaviors.length===minimumAssertions and unique-name checks, plus its exact file ownership/discovery checks. Its test helper input type gains the optional boolean; no existing row is changed to exact mode implicitly. Existing lane count remains nine.

Modify scripts/qc/native-postgres-report.ts assertNativePostgresReport in its existing per-admission loop. Keep every current success, skip, todo, failure, runtime error, file-set, required-name, duplicate-name and aggregate-total check. Additionally, only when exactAssertions===true, require assertionResults.length===requiredBehaviors.length; mismatch throws credential-free `Native fixture assertion count mismatch: <file>`. Existing required-name inclusion and unique-name checks make this the exact selected name set. No filtered-run, missing-file, renamed-behavior or skip bypass is introduced.

The ordinary scripts/qc/native-postgres-manifest.test.ts and native-postgres-report.test.ts are mandatory Modify actions. Test a passing exact set; a new extra passing named assertion rejected in exact mode; missing/duplicate/unnamed/failed/skipped cases rejected; and the same extra passing behavior accepted when the flag is omitted or false. Retain the pinned legacy-additive regression. Manifest tests retain one-owner discovery and required-name/minimum consistency. Use real functions under test, not a duplicated checker.

#### Ownership and qualification

F7 implements this shared optional type/report behavior and its four exact source/test file actions once. F3 and other dependent slices only register their own concrete files/names/flag and exercise the shared tests; they do not fork another report validator. The existing focused F7 command already includes both validator test files. Each candidate still runs the whole admitted native lane and full JSON report guard after implementation, not a filtered subset represented as a full lane.

This is a selected future implementation contract, not a claim that the pinned validator already rejects extra passing behaviors. No source/config/test was changed or executed during document authoring. Owner spec approval and normal implementation gates remain pending.

### Review artifact: contracts/operator-bootstrap.md

### Shared operator service bootstrap

#### Source boundary and selected delta

At pinned Hub c6c2d5739572356239c4048c0f564f40b0768adc, `scripts/_sveltekit-bun-shim.ts` registers five specific server value modules, two dynamic env virtual modules and app/environment; it is not a general server/lib resolver. The stock/POS/RBAC/accounts runtime graph also reaches directory-index modules, generated Paraglide JavaScript and lucide-svelte components. A static import scan of stock, POS, accrual, RBAC, activity, accounts list/detail/resolve, stock logic and org-scope roots finds 130 local modules and 64 distinct server/lib aliases before generated Paraglide output. This scan does not execute or qualify that graph. Keep the existing shim unchanged; these new operator commands do not preload it.

Reuse the Vite SSR direction already present in `scripts/repair-service-sale-stock.ts:95–130`, with the following stricter configuration. Do not use full sveltekit(): installed Kit 2.70.2 exports/vite/index.js:302 invokes get_env, whose vite/utils.js:73 calls loadEnv independently of Vite envDir. Installed standalone vite-plugin-svelte 7.2.0 utils/load-svelte-config.js:28 honors configFile:false, but its inspector calls parseEnvironmentOptions before considering inspector:false; inspector/options.js:26 itself calls loadEnv. Installed Vite dist/node/chunks/node.js:5288–5299 returns no env files when envDir is false, including this inspector loadEnv call (false survives its nullish fallback). Thus standalone inspector does not independently bypass envDir:false. Still remove `vite-plugin-svelte-inspector` from the flattened returned plugin list for a lean CLI with no inspector/process-env option behavior; inspector:false alone does not avoid that hook. Record installed versions against bun.lock in the implementation proof; changed dependencies require renewed source and smoke qualification.

#### Interface and exact admission order

F7 owns new `scripts/lib/operator-service-loader.ts` and `.test.ts`. Export `VerifiedOperatorPrincipal = Readonly<{profileId:string;authProject:string;verifiedAt:string}>` from operator-principal.ts, matching the existing selected verifier return, and:

```ts
createOperatorServiceLoader(input: Readonly<{
  principal: VerifiedOperatorPrincipal;
  target: QualifiedOperatorTarget;
}>): Promise<OperatorServiceLoader>
```

`OperatorServiceLoader` exposes `load<K extends keyof OperatorServiceModules>(key:K):Promise<OperatorServiceModules[K]>` and idempotent `close():Promise<void>`. OperatorServiceModules uses exact `typeof import(...)` namespace types for the closed registry below, with no any or caller-controlled path. The loader checks matching principal.authProject/target.authProject and nonempty verified canonical subject/time; those consistency checks do not replace calling verifyOperatorPrincipal. No target/principal is read from globals.

Every CLI statically imports only Node/Bun standard facilities, pure input/target validators and operator-principal.ts, which imports the ordinary Supabase SDK directly and no application alias graph. First validate parameters and approved target, compare operatorDatabaseIdentity without connecting, and authenticate the exact actor with qualified GoTrue. Only then dynamically import operator-service-loader.ts and create it. Thus even importing Vite/Svelte and business modules is forbidden before admission. The runner creates its one qualified database connection explicitly, checks actual identity/marker, injects that Drizzle/CoreTx into services, and rechecks role/org/profile/capabilities in its transaction. Loading pg-client/pg-pool namespaces grants no permission to call their global-pool factories. Finally close transaction/client and loader on success or failure; loader creation failure closes any partially created Vite resources. No HTTP listener is started.

#### Staged implementation and qualification (no future-root dependency)

The registry has two additive build states, selected by implemented source, never by a runtime missing-module catch. T004 creates audit.types.ts (plain DTOs, including the exact pure QualifiedOperatorTarget). T006 operator-principal re-exports that target through an erased relative type-only import; its public type export stays compatible, with no application value graph or future import. T005 creates active-operator-principal and authority adapters; T006 implements only shared principal/target helpers; T007 implements the foundation loader. Its OperatorServiceModules interface/registry contains every table row below EXCEPT audit, and has NO typeof import(audit.ts). Foundation CLI entrypoint faces:receivables:audit is not registered yet and no audit runner file or fake namespace is created.

T008/T009 implement and qualify only foundation phase against the actual existing roots and new implemented principal/authority helpers. T010–T013 then implement the real audit.ts inventory/control service and tests. In T011, after that real file exists, add audit key AND exact typeof-import namespace to the closed registry together. T014 implements the actual audit CLI/streaming/cleanup, registers faces:receivables:audit and finishes real-command dispatch. Only after T011–T014 are implemented may the full audit smoke run. Missing audit root never succeeds via skipped import, noop audit result or service stub.

Qualification labels are explicit: foundation_checks_passed covers helper/loader/existing-graph checks only and MUST NOT be called shared-bootstrap-qualified. bootstrap_full_process_qualified requires the real positive audit package smoke, plus retained foundation negative checks and actual authority bridge proof. F1/F2 consumers remain blocked while only foundation checks pass; release also requires the full native lane/report and all existing security gates. US2/US3 add classification/proposals later, without changing admission/loader mechanics. An evidence-free real US1 smoke fixture with unknown historical facts exercises actual inventory/controls and a legitimate unresolved subject; it never fakes implemented settlement logic or qualifies later US2/US3 behavior.

Closed registry, paths relative to fixed Hub root derived from loader import.meta.url (audit row joins only in T011):

| Key | Actual source module |
|---|---|
| audit | src/server/services/pos/accounts/audit.ts (new F7) |
| rbac | src/server/services/rbac.service.ts |
| activeOperatorPrincipal | src/server/auth/active-operator-principal.ts (new F7) |
| stock | src/server/services/stock.service.ts |
| pos | src/server/services/pos.service.ts |
| stockAccruals | src/server/services/stock-accruals.service.ts |
| activity | src/server/services/activity.service.ts |
| accountsList | src/server/services/pos/accounts/list.ts |
| accountsDetail | src/server/services/pos/accounts/detail.ts |
| accountsResolve | src/server/services/pos/accounts/resolve.ts |
| stockLogic | src/server/services/stock.logic.ts |
| orgCore | src/server/db/with-org-core.ts |
| pgClient | src/server/db/pg-client.ts |
| pgPool | src/server/db/pg-pool.ts |

Each caller loads only its needed roots. Foundation proof loads every existing foundation registry root and actual activeOperatorPrincipal, without requesting or typing audit; full F7 proof after T014 additionally loads the implemented audit root with its exact typeof-import namespace type; F3 introduces closed key stockCorrections→src/server/services/stock-corrections.service.ts AND its typeof-import type in the same implementing slice where that file exists, then qualifies it before F1 correction commands may load it. F2 likewise introduces receiptCorrection→src/server/services/faces-receipt-correction.service.ts plus its namespace type in its own slice. Neither future key nor typeof-import of a nonexistent module is part of the initial F7 OperatorServiceModules interface; this avoids an uncompilable prerequisite cycle. Each owning slice updates the closed registry/type/smoke together, no caller-selected path. Missing requested root is fatal, never replaced with a stub or skipped. Type-only namespace references do not eagerly import the graph. Pure F1/F2 arithmetic/report helpers remain ordinary relative imports, outside this service loader. New business roots require an explicit registry/type/smoke update in their implementing slice, not an unrestricted module-path argument.

#### Exact Vite and virtual module configuration

Call installed Vite createServer with `root` fixed as above, `configFile:false`, `envDir:false`, `publicDir:false`, `appType:'custom'`, `logLevel:'error'`, `server:{middlewareMode:true,watch:null,hmr:false,ws:false}`, and `optimizeDeps:{noDiscovery:true,include:[]}`. Use `ssr.noExternal:['lucide-svelte']` so its actual .svelte exports are compiled. Never call listen, import project vite.config/svelte.config, run an application build hook, or install another loader framework.

Plugins are one closed virtual-module plugin plus standalone `svelte({configFile:false,compilerOptions:{hmr:false},inspector:false})`, recursively flattened with null/false entries removed and EVERY named inspector plugin filtered out before createServer. Assert the expected Svelte compiler plugin remains and no inspector plugin remains; unknown plugin/config expansion is a failing qualification. Do not use full sveltekit() or project plugin arrays. Prefix aliases map only `$server/` to the fixed src/server directory and `$lib/` to fixed src/lib. Vite resolves normal extensions and directory indexes; generated src/lib/paraglide/messages.js and runtime.js must exist after the candidate's normal `bun run i18n:compile` prerequisite. No broad process.cwd-based alias or user-supplied root.

The closed pre-enforced virtual plugin resolves/loads exactly `$env/dynamic/private`, `$env/dynamic/public` and `$app/environment`. Both env modules export `env=Object.freeze({})`; they never expose process.env, application credentials or private FACES inputs. app/environment exports `browser=false`, `building=false`, `dev=false` and `version='faces-operator-v1'`. Any other `$env/` or `$app/` specifier is rejected with a credential-free error, not forwarded to another plugin. Application server/lib code and Svelte SSR components are real code, not namespace/component stubs. In particular the actual lucide-svelte dependency from icon-map/navigation must compile. Existing application Supabase factory modules may import with empty env, but their global/admin factories must never be invoked; only the explicit qualified operator auth and database clients are usable.

#### Package scripts and standalone qualification

Register exact scripts in their owning stage:

- T014 only: `faces:receivables:audit`: `bun --no-env-file scripts/faces-receivables-audit.ts` (real runner and real audit root must already exist).
- T008: `faces:operator:bootstrap:smoke`: `bun --no-env-file scripts/operator-bootstrap.smoke.ts`.

F7 also owns `scripts/operator-bootstrap.smoke.ts` and `.test.ts`. It accepts optional exact `--phase foundation|audit`, default audit for the existing full-smoke invocation, rejecting unknown phase/flags. Foundation invocation is `bun --no-env-file run faces:operator:bootstrap:smoke --phase foundation`; full invocation after T014 is `bun --no-env-file run faces:operator:bootstrap:smoke --phase audit`. Do not run the audit phase before its real root/runner/registration exists. The initial T008 foundation implementation rejects audit phase as phase_not_implemented before any audit import; T014 adds the real audit branch, with no early reference to a future module/type. The smoke is a standalone process test runner, not an ordinary alias-mocked Vitest test. It creates a private temporary candidate copy of the actual scripts/src/generated-i18n/package files with the frozen installed node_modules available, never modifying checkout .env/config files. In that copy write distinct dotenv canaries in .env/.env.local and throwing vite.config/svelte.config files. Foundation mode spawns a fresh child through the real smoke package command with `--phase foundation --child --fixture <owned-private-fixture.json>`; --child is internal smoke mode and accepts only an owned regular file with mode `0600` produced by this runner with qualified synthetic target/principal inputs. That child uses actual shared principal/target/loader/authority functions and loads the exact foundation registry; it performs the actual read-only authority bridge probe through an explicitly injected connection, never an audit stub. Audit mode spawns fresh children through the real faces:receivables:audit package command. Both modes use a constructed allowlist environment (PATH/TMPDIR/LANG/TZ and only the explicit private FACES inputs required by the child). Application DB/auth/LLM credentials and all other inherited variables are absent; in particular no SUPABASE_*, PUBLIC_SUPABASE_*, DATABASE_URL, TURSO_*, ANTHROPIC_*, OPENAI_* or OPENROUTER_* values. Canary values must remain absent from process.env, import.meta.env and both virtual env exports. No project config may execute. Never copy existing private application dotenv files into the fixture.

Provide only approved synthetic scope.target, FACES_AUDIT_DATABASE_URL, FACES_OPERATOR_ACCESS_TOKEN and FACES_OPERATOR_ANON_KEY for valid runs, against owned marked loopback PostgreSQL and owned loopback GoTrue/qualified synthetic actor. The fixture establishes that actor using its existing owned auth provisioning before the child; the CLI never provisions/invites/grants. Test missing/malformed/foreign database target, wrong/expired/unavailable actor/token and wrong auth project. Each must exit 2 before business-module evaluation or a business database connection; a module-load tracer plus an injected source-entry sentinel in a separate negative fixture must prove zero evaluation, not merely zero returned rows. Invalid target must fail before the auth network call; invalid actor may contact only qualified auth.

For a valid foundation fixture, load every actual foundation registry root including lucide .svelte and generated Paraglide dependencies, then run an actual read-only authority bridge positive/negative database probe using the explicitly injected qualified client. No audit import, namespace type, root request or fake report is allowed in this phase. It proves foundation_checks_passed only. For a valid audit-phase fixture after T014, load that complete graph PLUS the real audit namespace and run the real registered audit command through its full input/admission/inventory/streaming/final-manifest path, injected qualified Drizzle/CoreTx and actual nonlocking authority resolver. Require an actual one-subject inventory/control report and unchanged DB digests, not namespace evaluation or a made-up audit result. Before/after global pool slots `__minionHubPgPool`, `__minionHubPgCriticalPool` and `__minionHubPgRlsPool` remain absent, and an instrumented fallback-factory sentinel must remain uncalled. No business module, helper or SSR plugin may contact an application DB/auth endpoint or model provider. Record allowed actual auth/PG targets and observed connections; external/unknown connection or LLM attempt fails. Namespace loading alone is not the injection proof. Capture child exits, package command, installed/candidate hashes, imported root inventory, canary/config/import/pool/connection assertions and cleanup result in private qualification output. Close loader/client/children and delete only owned temporary files in finally, including failed admission cases.

Run foundation smoke after T005–T009 helper implementation and generated i18n. Run full audit smoke only after T011–T014, and require it before declaring shared bootstrap qualified; the full native lane/report gate remains separately required. F1/F2 depend on this exact qualified loader and repeat their real package-command smoke on their implemented roots; a F7 report does not prequalify missing future correction code. No smoke, runtime, model or database execution has occurred. Owner approval remains pending. The authority-bridge prerequisite is stated in [plan.md](plan.md#prerequisites-and-normative-contracts).


#### No-listener qualification during loader lifetime

For pinned Vite 8.1.3, middlewareMode plus hmr:false alone still permits a WebSocket transport listener; server.ws:false is REQUIRED. This is a selected source-derived configuration requirement, not a claim of executed listener proof. Before the child dynamically imports the loader, instrument actual node:net Server.prototype.listen with a counter/refusal that prevents any attempted listener and fails the smoke. Outbound qualified GoTrue/database client connections remain real and permitted; this is not a capability or business-SQL mock. Restore the original prototype in finally. Both actual foundation and full-audit package-process smokes require zero listen attempts for the loader's entire lifetime, not merely no handles after close.

The owned smoke parent first binds its own exclusive loopback listener on port 24678; unavailable/unowned port fails fixture admission rather than stopping another process or skipping proof. Run two concurrent actual package children against their qualified synthetic inputs while this listener remains open. Neither child may listen, collide, inherit a server handle or invoke project config/dotenv; both still import actual Svelte/service modules and prove injected-client authority. Close only owned children/listener/clients in finally and verify cleanup. These are staged foundation/audit assertions at their existing availability points, with no new native behavior name or production listener. Dependency changes require the same real process requalification.

### Review artifact: quickstart.md

### Validation guide: F7

All commands below are qualification plans after owner data-spec approval, not tests executed in this document task. Use synthetic data in owned guarded loopback fixtures; never seed or query production. Read pinned Hub AGENTS.md, docs/qa-stack.md, scripts/qc/README.md and the exact candidate's package scripts. Inspect `bun run qa:status` before using an existing stack; never reset another checkout's stack.

#### Staged bootstrap checks (dependency order)

After T004–T009 implement actual DTOs/authority/principal/foundation loader and smoke, run only the foundation subset below. Its registry has no audit key/typeof-import, no audit runner or faces:receivables:audit registration. The foundation child uses the real smoke package command, existing service roots and actual passed-client read-only authority bridge positive/negative probes; no audit stub or fake namespace is allowed.

```bash
bun run i18n:compile
bunx vitest run scripts/lib/operator-principal.test.ts scripts/lib/operator-service-loader.test.ts scripts/operator-bootstrap.smoke.test.ts src/server/auth/active-operator-principal.test.ts src/server/services/rbac.service.test.ts
bun --no-env-file run faces:operator:bootstrap:smoke --phase foundation
```

These future results may establish foundation_checks_passed only. T011 then creates the actual audit.ts/root+namespace registry entry; T012/T013 complete actual controls/scenarios; T014 implements real runner/package/streaming and full smoke dispatch. Only then run `bun --no-env-file run faces:operator:bootstrap:smoke --phase audit` through the real faces:receivables:audit command and require an actual evidence-free one-subject report, control totals, read-only-bridge principal and unchanged database digests. A real unpriced/unknown-history subject is unresolved by contract; it is not an audit service stub or a claim of later settlement qualification. F1/F2 remain blocked until full positive process proof plus required native authority qualification. Missing audit before T011 cannot be hidden by skipped import; missing audit after T011 is fatal.

The final whole-candidate checks below occur after T001 approval and implemented T002–T022 product prerequisites, not before US1 exists. The full native8 lane and semantic report are separate from both smoke stages and keep every baseline, ACL, auth and exactAssertions prerequisite.

#### Pure and runner checks

After implementing the selected files:

```bash
bun run i18n:compile
bunx vitest run scripts/lib/operator-principal.test.ts scripts/lib/operator-service-loader.test.ts scripts/operator-bootstrap.smoke.test.ts src/server/services/pos/accounts/audit.logic.test.ts scripts/faces-receivables-audit.test.ts scripts/qc/native-postgres-manifest.test.ts scripts/qc/native-postgres-report.test.ts
bun --no-env-file run faces:operator:bootstrap:smoke --phase audit
bun run check
bun run test
bun run build
```

Require zero errors/warnings/failures and clean build subject only to documented optional-peer notices. Ordinary Vitest excludes `*.sql.integration.test.ts`; passing these commands is not native snapshot/RLS qualification.

The final audit-phase standalone smoke follows [operator-bootstrap.md](contracts/operator-bootstrap.md): owned temporary candidate copies and fresh real package-command children, no inherited app DB/auth/LLM credentials, dotenv/config canaries, actual Svelte/import graph, admission-before-import failures and qualified injected-client/pool/connection proof. It needs owned synthetic GoTrue plus marked PostgreSQL fixtures; absent fixtures fail qualification, never silently skip. This command is planned only; no execution is claimed.

#### Native admission and exact semantic evidence

Add `src/server/services/pos/accounts/audit.sql.integration.test.ts` exactly once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts` with `exactAssertions: true` and `minimumAssertions: 8`, per [native-exact-count.md](contracts/native-exact-count.md). Until that shared flag and report change ship (same slice, T003), the pinned report enforces only minimum count plus required names. Use describe `faces receivables audit against PostgreSQL` and these exact complete requiredBehaviors:

- `faces receivables audit against PostgreSQL uses one read only snapshot and rejects mutations under app_ledger`
- `faces receivables audit against PostgreSQL preserves canonical controls beyond 500 clients and exposes legacy residuals`
- `faces receivables audit against PostgreSQL resolves explicit and provider invoice links without unsupported repair candidates`
- `faces receivables audit against PostgreSQL matches locking authority composition without locks or stale cache`
- `faces receivables audit against PostgreSQL isolates concurrent pages and foreign organization rows`
- `faces receivables audit against PostgreSQL admits only approved matched evidence and preserves uncertainty`
- `faces receivables audit against PostgreSQL applies exact accounting timezone cohort and approved scope boundaries`
- `faces receivables audit against PostgreSQL produces stable proposal hashes and UUIDs across fresh runs`

Each named test may have a table of counterexamples; all eight must be present and pass, with no skips/todos. Update native-postgres-manifest.test.ts and native-postgres-report.test.ts for this admission and missing/duplicate/skipped required behavior rejection. Keep the existing nine lanes; config already derives selected files from the manifest. Do not add an ordinary include glob, optional runtime skip or new CI bypass.

#### Isolated native database and actual queries

Canonical UNBILLED_BOOKING_WHERE and account fragments reference `public.*`, so setting a temporary search_path alone would exercise the wrong tables. The selected audit fixture creates one owned disposable DATABASE, not shared QA public data and not a search-path-only substitute.

Use the existing qa-native controller from `.github/workflows/ci.yml:652–684`: the explicitly owned loopback pgvector container initializes `POSTGRES_USER=minion_qc`, database `minion_qc_vectors`, port 55462 and actual database comment `minion-360-disposable:v1`. The initial Postgres user from that recipe is the fixture controller. Local qualification must provision its own equivalent container using the existing recipe and record ownership; never reuse an arbitrary application URL. `MINION_QC_DATABASE_URL` identifies this controller database, and `MINION_QC_DISPOSABLE=1` is mandatory.

First call existing openDisposablePostgres, which checks loopback/name/role/actual marker before any DDL. Then query pg_roles for current_user and require the CI initial controller rolsuper=true for the selected child/auth-role setup (which also permits CREATEDB), and require existing app_ledger to be NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS, with the admitted controller able to SET ROLE app_ledger (superuser or existing membership). Missing identity, marker or privilege fails the test/lane before DDL, never skips, changes roles or falls back to HUB_TEST_DB_URL. No ALTER ROLE/escalation is permitted. Other full-lane tests still require their separately owned full-schema QA URL.

Generate the child name `minion_qc_faces_audit_${randomUUID().replaceAll('-', '')}` and enforce `^minion_qc_faces_audit_[a-f0-9]{32}$` before quoting it as an SQL identifier. Through the admitted controller, create only that database with owner minion_qc and set its exact disposable marker. Derive its private URL by replacing only the validated controller URL's database path; do not log credentials. Open it with openDisposablePostgres and verify the new actual database identity/marker before schema setup. If any step fails, close every handle and drop only the created recorded child DB in finally; never drop the controller, shared QA DB or a name without the generated ownership receipt.

First apply contracts/native-auth-prerequisites.md child-local canonical auth schema/users/uid owner+ACL/JWT recipe before public policy/FK DDL; seed synthetic auth.users before NOT NULL-email profiles with canonical profile FK. Then seed public tables matching the audited production schema/query columns and actual baseline ACL/RLS (NOT permissive org-GUC profile/org substitutes): organizations/profiles/members/roles/permission_rules/app_modules; parties/crm_contacts; financial settings/products/clients/invoices/items/payments; POS settings/shifts/tickets/lines/payments/emissions/client-ledger/plans/grants/redemptions; scheduling resources/event-types/bookings; and stock source/entry/accrual evidence used by proposal admission. Reuse canonical schema/migration definitions and the existing native POS/authority fixture setup patterns; do not mock canonical predicates or capability composition. No application pool is opened: inject actual Drizzle handles on child connections, use actual withOrgCore scoping/role changes, and invoke the transaction-accepting audit/read-only resolver. The database owner seeds; report reads run under actual non-bypass app_ledger and exact org/profile GUC. A write attempt must fail because the transaction is READ ONLY, not merely because a mock returned no permission.

Use independent child connections for report, concurrent writer and test barriers. Synchronize on observed database barrier/lock state, never timing sleeps. Seed two synthetic orgs, more than 500 clients and every scenario below. After each run assert unchanged business-row digests. In finally release barriers, rollback/close all child connections, drop the uniquely owned child DB from the controller, then close controller handles. Verify child DB absence. A local fixture cleanup is not a production business undo.

#### Complete lane invocation and validator

After qualifying the owned controller and full-schema QA targets, set private F7_DISPOSABLE_DATABASE_URL and F7_FULL_SCHEMA_QA_URL from those actual fixtures, then run from the isolated Hub candidate:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F7_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F7_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-receivables-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-receivables-qa-native.json
```

The invocation intentionally has NO single-file filter. The report gate requires every admitted qa-native file and exact semantic behavior, zero failures/skips/todos and no missing evidence. A focused development run may filter this suite, but must be labelled focused and cannot be passed to the full-lane guard as complete qualification. Guard failure or unavailable controller/CREATEDB privileges means failed qualification, not permission to use another database.

#### Scenario and outcome matrix

1. Two orgs, more than 500 clients, party/contact aliases, deleted/missing identity and identityless paid lines. One paid-unscheduled line plus one unbilled booking yields work count 2, never debt count 2. Badge-exact/list-exact controls retain legacy voided/identity/limit residuals with exact subjects. Many-residual case (inside the existing behavior "preserves canonical controls beyond 500 clients and exposes legacy residuals"): seed 1,500 `list_only_legacy_voided` lines with 1,400 in U-minus-C and 250 identityless lines; run with batch size 250 and a sink that delays each `writeResidual`. Require `residuals.jsonl` to list every ID exactly once with the right `cohort`; summary counts and cohort counts to match the file; `sampleIds` to be its first 100 IDs per control; `idsSha256` to equal a hash recomputed from the file; and the service to await the sink (no record is emitted before the previous write resolves). Runner tests in `scripts/faces-receivables-audit.test.ts` construct the residual writer with a cap of 1,000 and feed 1,001 records, and separately make `writeResidual` reject: each gives exit 3, `incomplete.json` and no `manifest.json`.
2. Free/null/inactive/completed/cancelled/no-show, plan/grant/redemption, invoice, partial payment, refund, grouped member, quantity and currency cases. Primary classes are exhaustive; financial facets remain orthogonal. Current catalog price and old/completed status never replace contract or delivery evidence.
3. Every invoice-linkage counterexample in contracts/invoice-linkage.md, especially invoice-linked booking with NO POS booking line, duplicate provider references, shadowed/unresolved/foreign links. None emits an unsupported repair proposal or duplicate subject.
4. Shared authority read-only/locking parity on static fixtures, active/revoked membership, custom/legacy roles, owner scope, field tier, disabled module and forbidden foreign IDs. Terminal-principal unit/runner tests exercise invalid/expired/mismatched/unavailable GoTrue responses and token redaction without impersonation.
5. Prove a capable non-owner succeeds only with evidence:null and is denied with any non-null evidence before subject inventory; an actual membershipRole owner with custom realRoles keys and required capabilities succeeds, while revoked owner, owner lacking effective authority and different executing verifier fail. No delegated owner attestation is admitted. Valid exact external evidence versus hash mismatch, unapproved assertion, wrong verifier/org/subject, malformed values, missing documents and contradictory assertions. Genuine-debt positives support only complete unbounded-U canonical-party/document identity with admitted historical charge+delivery and NO stored POS tickets/payments/invoices/signed-ledger/funding anywhere in the exact known-identity closure. A positive line/link supports only exactly one submitted ticket with one positive service line, ordinary positive tenders resolving through actual stored normalized method policy, exactly complete total and no alternate client money/invoice/fiscal/wallet/funding. Multiple ordinary tenders of 40.00 and 60.00 for one whole 100.00 line qualify; that is not line allocation. A partial payment of 50.00 on 100.00, refund, zero-net wallet, duplicate invoice paths, absent/ambiguous method definitions and document-only probes are unresolved/null remainder; financial paths dedup by table/id and never sum invoice+POS+wallet. Both tables/overlaps and every exact guard are normative in contracts/evidence-and-proposals.md. Missing facts produce unresolved rows, no mutation or fabricated amount.
6. Exact date contract: booking start differs from creation/status date; ticket submission differs from payment date; both sides of accounting-zone midnight; [D,D+1) same day; invalid/equal/inverted intervals; owner-bound inheritance; widened CLI refusal; narrowed C plus complement equals approved U without out-of-scope queries. Finite U emits settlement_scope_incomplete/null remainder and no positive financial label/proposal; a query trace proves no all-date client closure or out-of-U subject fetch. Unbounded U+narrow C may close same-client money from U-minus-C without exporting another subject, but proposed pair subjects must both be in C. Scope-proof corruption aborts incomplete.
7. Exact pure and existing-native behavior tables must cover both subject kinds: booking inactive/history/current-free/unused/stale/unresolved and paid-line inactive/known-zero/fully-settled/unresolved. validUnused plus validStale with no history and not free chooses unused/review with both reasons; delivery+unused and stale observed/snapshot mismatch are conflicts; stale observed==claimed==actual is no-change, not stale; wrong-kind unused/stale fails input. A historical charge of 100.00 PEN with a current catalog price of `0`, shape A identity and delivery, and no money rows is a genuine-debt candidate with chargeMinor `"10000"`, settledMinor `"0"` and remainderMinor `"10000"`, while the badge free exclusion remains. Missing delivery, partial settlement, unknown identity or finite U is unresolved with null remainder, never free forgiveness or a guessed 50.00. The native8 names and count stay unchanged: add these as table vectors (V1–V16 in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#closed-overlap-and-financial-qualification-vectors)) inside the existing evidence, canonical-control and stable-hash tests.
8. Hashed counterfactual vectors 1–4 in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#hashed-wallet-and-account-display-counterfactual): the only paid line plus unbilled pair takes list pendingScheduling/pendingInvoice from 1/1 (row present) to 0/0 (row absent) with wallet `[]` unchanged; another same-client unbilled booking takes 1/2 to 0/1 with the row still present; a historically paid, current-free pair gives badge deltas −1 and 0; a pure multi-currency or zero-net wallet stays identical but blocks a positive proposal. Actual capped/sorted rendered presence is null/not_predicted_limit_or_sort. Changing another same-client subject or wallet/plan/grant source changes accountControlSha256 and proposalHash; fresh run metadata or unchanged source observed next day does not. Use a pure typed clone changing only one line.bookingId; no SQL write or dummy account-list control.
9. Two fresh runs with new runId/observedAt but identical source/assertion inputs produce byte-equal canonical intent, proposal hashes and UUIDs. Changed source, amount, linkage or approved assertion changes identity. Identical private evidence moved to another path does not change it; UUID collision with different SHA is fatal.
10. A second connection changes payment/link/catalog/status between keyset pages: first report remains at its snapshot, next run sees changes. Inject timeout, resource limit, money corruption, revoked authority, symlink/path failure and output interruption: connections closed, no `manifest.json`, and the staging directory kept with `incomplete.json`. A synthetic write inside READ ONLY fails and all business-table hashes stay unchanged.

Supply private FACES_AUDIT_DATABASE_URL, FACES_OPERATOR_ACCESS_TOKEN and FACES_OPERATOR_ANON_KEY, with authUrl only from approved scope.target.authUrl. Run the registered `bun --no-env-file run faces:receivables:audit` command twice only against qualified synthetic fixtures with approved scope/evidence files. Capture command exits, candidate/source hashes, snapshots, canonical output hashes and private permissions. Owner spec approval precedes code; implementation review/CI/human merge precede delivery. Any later live read needs its exact owner-approved org/principal/interval/output; no report authorizes repair, collection or lifecycle/stock cleanup.


Use implementation-inventory.md's complete ordinary focused command after its new paths exist, plus this quickstart's exact full native lane/report and actual fresh-process bootstrap smoke. Existing exported unbilled/identity fragments remain unchanged; F7 does not edit F3/F2-owned correction/runtime files. No frontend/browser gate is invented for the CLI-only diff. Evidence-free capable review versus evidence-bearing authenticated-owner admission is unchanged.


Apply the real bounded F7 authority-bridge migration and run every baseline negative, function owner, ACL, body, GUC, READ ONLY, no-expansion and parity case in contracts/authority-bridge.md, within the existing eight registered native behaviors. CLI/report reads use only the read-only authority bridge; guarded source writes later use the new write-admission adapter. Direct SELECT/FOR SHARE under invented fixture grants is not proof. Record migration pairing and function/catalog hashes; no qualification or deployment has run.


The full-lane controller and every child auth/FK/policy prerequisite are exactly those in contracts/native-auth-prerequisites.md, including the pinned `pgvector/pgvector:0.8.6-pg18` image, `minion_qc_vectors` database and extension identity. This native baseline helper is a test-only shared dependency, not a production auth path or substitute for actual GoTrue standalone smoke.

The [native auth prerequisite](contracts/native-auth-prerequisites.md) also creates/validates the canonical restricted postgres ACL sentinel before auth-schema grants on a pristine minion_qc controller.

Both staged package-process smokes also prove the [operator-bootstrap.md](contracts/operator-bootstrap.md) zero-listener contract during loader lifetime, concurrent children and an owned occupied port 24678; cleanup-only handle checks are insufficient.

The shared native-auth helper must admit all baseline ACL recipients, including its explicit restricted postgres and service_role sentinels, before public policy/ACL DDL; no reliance on another suite or shared role alteration.

### Review artifact: tasks.md

### Tasks: FACES receivables and pending-work audit

**Input**: spec.md, plan.md, research.md, data-model.md, quickstart.md, implementation-inventory.md (the complete file-action list) and every contract: contracts/audit-cli.md, authority-bridge.md, evidence-and-proposals.md, invoice-linkage.md, native-auth-prerequisites.md, native-exact-count.md and operator-bootstrap.md.
**Tests**: Required by FR-011; all tasks are pending future implementation. Paths are Hub-relative unless prefixed specs/.

#### Phase 1: Setup and authority

- [ ] T001 Record owner data-spec approval and independent EGM outcome before code in `specs/128-faces-receivables-audit/checklists/requirements.md`; no production audit or repair is implied.
- [ ] T002 Establish authorized isolated Hub feature branch targeting registry master and record source revision/fixture commands in `specs/128-faces-receivables-audit/quickstart.md`.
- [ ] T003 Register the exact qa-native manifest admission (`exactAssertions: true`, `minimumAssertions: 8`, eight required names) and semantic validator cases from quickstart.md and contracts/native-exact-count.md. Create the test-only native auth fixture `src/server/test-utils/operator-native-auth-fixture.ts` (`installOperatorNativeAuthFixture`, `assertOperatorNativeAuthFixture`) and `src/server/test-utils/fixtures/operator-native-auth.sql` per contracts/native-auth-prerequisites.md; T005 qualifies them with the bridge migration. Then prepare native fixture/admission scaffolding (without importing a future audit root); full actual audit execution waits for T011–T014. Do not import future audit.ts or audit.types.ts from this preparation file before the owning task creates it. Seed synthetic two-org >500-client eligibility/identity/currency cases in `src/server/services/pos/accounts/audit.sql.integration.test.ts`, including legacy voided and identityless paid lines.

#### Phase 2: Foundations

- [ ] T004 Define the exact AuditScope/EvidenceManifest/LinkIntent/envelope/date contract from contracts/audit-cli.md and contracts/evidence-and-proposals.md, including deterministic proposal UUID/hash, in the schemaVersion=1 run/subject/proposal contract in `src/server/services/pos/accounts/audit.types.ts`: unique `(subjectKind,id)`, nonempty reasonCodes, null unknown money, decimal-string currency buckets, proposal status `pending_owner_approval`, no apply/mutable-paid field. Define pure QualifiedOperatorTarget here first; T006 operator-principal re-exports that exact type through an erased relative type-only import, with no future-module reference.
- [ ] T005 Implement the bounded shared authority foundation in `src/server/services/rbac.service.ts`, `src/server/auth/active-operator-principal.ts` and `supabase/migrations/20261116190000_operator_authority_bridge.sql` exactly per contracts/authority-bridge.md.

  Migration: atomic fixed SECURITY DEFINER projection, catalog/trusted-owner/ACL/body preflight and no baseline table grant/policy changes; false snapshot versus true ordered gate/row-lock paths.

  Adapters: shared neutral pure composer, unchanged legacy locking signature/default/return, new read-only bridge adapter and the write-admission bridge adapter resolveFreshOperatorCapabilitiesForWriteInTransaction, actual principal/GUC validation and typed failure. No F3 dependency or direct forbidden authority-table reads.

  Evidence: extend `src/server/auth/active-operator-principal.test.ts`, existing RBAC tests and `src/server/services/pos/accounts/audit.sql.integration.test.ts` with faithful baseline negative access, actual migration, false/true/reference semantic parity, wrong-scope/owner/ACL/body/role/function/resource failures and real READ ONLY refusal. The reference legacy adapter uses only admitted fixture-controller rights; operator business calls use real app_ledger. Keep native8 names and full-lane qualification; no permissive fixture shortcut. This foundation must qualify before dependent operator/correction callers.
- [ ] T006 Implement only shared `scripts/lib/operator-principal.ts` verifyOperatorPrincipal, operatorDatabaseIdentity and their exact QualifiedOperatorTarget/lean return from contracts/audit-cli.md. Keep static imports pure/SDK-only; actual audit runner, package registration, streaming and CLI dispatch are T014 after real T011 audit.ts exists. No missing future import or dummy audit file is allowed.
- [ ] T007 Implement the exact foundation closed createOperatorServiceLoader/interface/module registry (exclude audit key and typeof-import until real T011 audit.ts exists), Vite/standalone-Svelte configuration with inspector removed, aliases and three empty-env/app virtual modules in `scripts/lib/operator-service-loader.ts` and `.test.ts`, as selected in contracts/operator-bootstrap.md; preserve the existing Bun shim unchanged and admit no app dotenv/config/global fallback.
- [ ] T008 Register faces:operator:bootstrap:smoke and implement its foundation phase in `scripts/operator-bootstrap.smoke.ts` and `.test.ts`: fresh children through the real smoke package command, owned dotenv/config canaries, real qualified GoTrue principal and actual existing registry graph/lucide/Paraglide, positive/negative read-only authority bridge probes with injected marked PostgreSQL and pool/connection/finally sentinels. Exclude audit root/namespace and audit command in this stage. Result is foundation_checks_passed only, not full bootstrap qualification; real audit phase finishes at T014. Require exact server.ws:false and the zero-listener/concurrent owned-port process assertions in contracts/operator-bootstrap.md at this phase’s real-root availability point.
- [ ] T009 Qualify shared principal/refusal/target-binding and foundation-loader/smoke tests in `scripts/lib/operator-principal.test.ts`, `scripts/lib/operator-service-loader.test.ts` and `scripts/operator-bootstrap.smoke.test.ts`. Do not import the not-yet-created audit runner. Actual CLI/output tests belong to T014. F1/F2 stay blocked until real full-positive smoke plus required authority/native proof.

#### Phase 3: US1 — Complete inventory and count semantics (P1)

**Goal**: Explain pending-work components and account facets from one complete snapshot.
**Independent test**: One paid-unscheduled line plus one unbilled booking yields work count 2 with distinct components, without debt count 2 assertion.

- [ ] T010 [P] [US1] Add pure reconciliation tests in `src/server/services/pos/accounts/audit.logic.test.ts` for row/client units, per-currency totals, scoped cohort+complement, identityless and legacy voided residuals, stable tuple sort/hash, exact per-kind date boundaries and approved-scope coverage.
- [ ] T011 [US1] Implement complete same-CoreTx stable keyset inventories, exact cohort timestamps/containment, and canonical predicate/identity reuse in real `src/server/services/pos/accounts/audit.ts`, then add its audit key AND exact namespace typeof-import to `scripts/lib/operator-service-loader.ts` in this same task; real passed-CoreTx reads only, no stub/missing-root fallback. No capped listClientAccounts or separate transaction wrappers.
- [ ] T012 [US1] Implement badge-exact and list-exact controls in `src/server/services/pos/accounts/audit.ts`, retaining legacy voided and identity-required differences rather than changing source behavior. Stream every residual subject in U, including U-minus-C, through the awaited `AuditSink.writeResidual` as a `ResidualRecord`, and return only per-control `{count,cohortCounts,sampleIds,idsSha256}` in `AuditSummary` per contracts/audit-cli.md "Residual output"; no residual ID array beyond the 100-ID samples.
- [ ] T013 [US1] Add SQL snapshot/page/concurrency/limit tests in `src/server/services/pos/accounts/audit.sql.integration.test.ts`: more than 500 clients, all-date controls, optional cohort, different reader predicates, the many-residual U-minus-C case from quickstart.md scenario 1, second connection writes between pages, foreign org denial and read-only write refusal.
- [ ] T014 [US1] Implement actual `scripts/faces-receivables-audit.ts` admission/owned RR READ ONLY/streaming (`subjects.jsonl`, `residuals.jsonl` with the cap-taking residual writer)/atomic-publication/labelled-incomplete-staging/finally path, register the exact faces:receivables:audit package command, and finish audit-phase dispatch in `scripts/operator-bootstrap.smoke.ts` only after T011–T013 real service/control work. Add real runner/output/no-symlink/authority/redaction/limit tests in `scripts/faces-receivables-audit.test.ts`, including residual cap overflow and `writeResidual` rejection (exit 3, `incomplete.json`, no `manifest.json`). Run full --phase audit smoke through actual registered audit command and one real evidence-free unresolved-subject/control report, with actual authority/client/graph/canary/no-pool proofs. Only this full positive plus foundation checks/authority proof may qualify shared bootstrap; no audit stub or circular dependency on US2/US3 is allowed. Require exact server.ws:false and the zero-listener/concurrent owned-port process assertions in contracts/operator-bootstrap.md at this phase’s real-root availability point.

#### Phase 4: US2 — Evidence-based historical classification (P2)

**Goal**: Exhaustive review labels with uncertainty and evidence, no settlement/lifecycle mutation.
**Independent test**: Free/null/completed/inactive/funded/void/refund fixtures preserve distinct facts and do not recommend duplicate collection.

- [ ] T015 [P] [US2] Add table-driven classifier tests in `src/server/services/pos/accounts/audit.logic.test.ts` covering both ordered booking/paid_unscheduled_line tables and every primary label, exact unused+stale/delivery/current-free/history/inactive/no-change/observed-mismatch overlaps, price current versus historical, attendance evidence, zero/null/inactive price, plan/grant/invoice, partial/refund and cancelled-fee uncertainty.
- [ ] T016 [US2] Implement both exhaustive ordered tables in `src/server/services/pos/accounts/audit.logic.ts` exactly per contracts/evidence-and-proposals.md, including exact label/reasonCodes/uncertainty/action and current-free/history precedence. Paid lines can only be inactive/free/paid-but-unlinked/unresolved; wrong-kind unused/stale assertions fail input. Implement FinancialClosure DTO/pure two-shape BigInt evaluation: complete all-date no-stored-settlement debt, or exactly one fully settled ordinary one-line ticket; partial/refund/wallet/invoice/unknown allocation yields null remainder/unresolved.
- [ ] T017 [US2] Enforce evidence-free reviewer versus evidence-bearing actual-owner admission in the same read-only snapshot, including custom-role owner, revoked owner and denied effective authority tests; admit and match the exact owner-approved external evidence file/hash/assertions, and implement loadAuditInvoiceLinks(tx,orgId,bookingIds,ticketIds) per contracts/invoice-linkage.md with explicit/provider/ambiguous source guards; implement exact loadAuditFinancialClosure and FinancialSourceRows same-tx dedup/bounds/party-document/fin-client/probe/POS/finance/signed-ledger/funding/settings-method closure in `src/server/services/pos/accounts/audit.ts`; finite U never widens to all-date closure and forces settlement_scope_incomplete/null remainder, while current catalog or completed/old status alone cannot establish agreed price, delivery or debt. No allocation/general settlement engine or financial write is selected.
- [ ] T018 [US2] Add SQL/invariant tests in `src/server/services/pos/accounts/audit.sql.integration.test.ts` proving both ordered tables/overlaps, a current-free booking with a 100.00 historical charge and no money giving a 100.00 debt candidate, unresolved partial payment of 50.00, refund, zero-net wallet, duplicate provider and unknown document cases, allowed ordinary split tenders of 40.00 and 60.00 on one whole line, finite-U no-widening, exact dedup/settings policy, BigInt per-currency amounts, zero payment/booking/stock/ledger changes and unchanged-data canonical hashes across two runs.

#### Phase 5: US3 — Inert exact repair proposals (P2)

**Goal**: Prepare provable old-payment linkage for exact owner review without an executor.
**Independent test**: One proven exact pair yields proposal, ambiguous/split-service-allocation/partially settled/void pair yields no executable suggestion.

- [ ] T019 [P] [US3] Add pure proposal tests in `src/server/services/pos/accounts/audit.logic.test.ts` for exact member/quantity/currency/identity matching, source evidence, stock ownership, ambiguous names, exact typed wallet/list controls and simultaneous expected count-component reductions; include logical row disappearance, remaining other booking, current-free unbilled delta of 0, unchanged multi-currency wallet with no positive proposal, and changed same-client other-subject/accountControl hash vectors.
- [ ] T020 [US3] Extract the existing pure UUIDv5 into `src/server/utils/uuid-v5.ts`, preserve the seed default-namespace wrapper and add helper compatibility vectors per contracts/evidence-and-proposals.md; implement exact LinkIntent canonical JSON/SHA-256/fixed-namespace UUIDv5 and immutable line→existing-booking proposal generation in `src/server/services/pos/accounts/audit.logic.ts` and `src/server/services/pos/accounts/audit.ts`, including before/version hash, exact FinancialSourceRows fingerprint, hashed accountControlSha256 and effects.wallet/accountDisplay from a PURE typed clone changing only one line.bookingId, approval evidence refs, zero financial/date/stock/lifecycle deltas and no bookAndLinkTicketLine call.
- [ ] T021 [US3] Write protected repair-proposals.json as run-specific envelopes with stable intent-only SHA-256 approval identity and deterministic proposal UUID through `scripts/faces-receivables-audit.ts`; status is always pending_owner_approval and no apply mode exists.
- [ ] T022 [US3] Verify stale/foreign/fiscal/refund/grant/plan/unresolved-stock cases remain blocked proposals or unresolved subjects in `src/server/services/pos/accounts/audit.sql.integration.test.ts`; document separate executor approval/inverse requirements in `specs/128-faces-receivables-audit/contracts/audit-cli.md`.

#### Phase 6: Qualification and report delivery

- [ ] T023 Run focused pure/shared-principal/loader/runner suites, standalone real-package bootstrap smoke after i18n generation, exact full qa-native lane plus semantic JSON report validator from quickstart.md, and Hub check/test/build/relevant architecture checks; record actual results and unchanged table hashes in `specs/128-faces-receivables-audit/quickstart.md`.
- [ ] T024 Obtain independent implementation review, CI and human merge; record exact approval/version state in `specs/128-faces-receivables-audit/checklists/requirements.md`.
- [ ] T025 Before any live read, obtain exact org/principal/scope/output authorization and verify production identity/version; run twice only as approved, validate invariant/content hashes and deliver protected row report with a redacted explanation under `specs/128-faces-receivables-audit/quickstart.md` evidence references; no record apply or cleanup.

#### Dependencies and parallel examples

T001 blocks all implementation. Exact DAG: T002 → T003 fixture/admission preparation → T004 DTOs → T005 authority foundation → T006 shared principal → T007 foundation loader → T008 foundation smoke → T009 foundation helper qualification. These steps contain no audit key/namespace/runner import and establish foundation_checks_passed only. Then T010 → T011 real audit root plus registry/type → T012 controls → T013 native service scenarios → T014 actual CLI/package registration/streaming and full real-command positive smoke. T014 is the full-bootstrap gate; no T008 check may stand in for it. Dependent F1/F2 consumers stay blocked until that full process proof AND the authority bridge's required native qualification, not just helper compilation. No US2/US3 dependency is needed for the positive evidence-free unresolved-subject US1 smoke.

US2 T015–T018 follows US1; US3 T019–T022 follows complete US1/US2 evidence/financial closure. T023 reruns the complete candidate's ordinary/native8/full-lane/report and full audit smoke, followed by T024 review/CI/human merge and T025 separately approved live read. Pure fixture preparation may parallelize after its types exist; edits to audit.ts and common loader serialize. No shared production transaction/source is used across agents. The native8 names and count, exactAssertions and all authority/native-auth gates remain unchanged; no permissive fixture or extra semantic test name repairs a dependency gap.

#### Implementation strategy

Start with exact canonical count inventory, then explain classifications, then emit immutable proposals. Treat unresolved integrity residuals as report findings, never a reason to write old rows paid. New product gaps require exact-site TODO(handoff) plus proposal ledger; current task is only design and leaves no invented product change.

All cost-bearing admission tasks follow the exact existing finance-field policy in this feature’s contract, never fieldLevel(stock). Include ordinary authorized owner/custom-role success with stock tier 0 and actual finance-view/tier/module denial; this slice reads stock quantity/source evidence only and adds no stock field tier. No new global field module is part of this slice.

The exact C/M/No-change source/test/package/QA/validation inventory and ordinary focused invocation are implementation-inventory.md. No Delete/UI/business-table schema or mutation flag is authorized; the already-selected bounded authority-function migration remains required. Task IDs are ascending in document and dependency order.


Cross-cutting prerequisites (authority bridge, snapshot principal, native auth baseline, exact assertion count) are stated once in [plan.md](plan.md#prerequisites-and-normative-contracts).

Shared fixture and harness qualification includes the postgres ACL sentinel in contracts/native-auth-prerequisites.md and mandatory four-file exactAssertions delta/tests in contracts/native-exact-count.md. Implement these within the existing foundation/native tasks, preserving task IDs and ordinary legacy report compatibility.

### Review artifact: checklists/requirements.md

### Specification Quality Checklist: 128-faces-receivables-audit

**Purpose**: Validate specification completeness before implementation review.
**Created**: 2026-11-16
**Feature**: [spec.md](spec.md)

#### Content Quality

- [x] Focused on user value/business needs; user journeys describe observable outcomes.
- [x] Specification requirements are implementation-independent; AS-IS source anchors are evidence, technical design is separate.
- [x] Written for stakeholders with all mandatory template sections completed.

#### Requirement Completeness

- [x] No unresolved NEEDS CLARIFICATION markers; operational unknowns have explicit fail-closed/execution gates.
- [x] Requirements are testable and unambiguous.
- [x] Success criteria are measurable and technology-independent.
- [x] Acceptance scenarios, edge cases, scope, dependencies and assumptions are defined.
- [x] AS-IS, TO-BE and DELTA distinguish source evidence, bounded live observation and intended change.

#### Feature Readiness

- [x] User stories map to functional requirements, independent validation and dependency-ordered tasks.
- [x] Data model, interface contract, research and quickstart are present.
- [x] Source reading list is pinned and review bundle includes all technical design material.
- [x] Real setup-plan/setup-tasks/prerequisite scripts ran against private F7 driver; outputs preserved locally.
- [x] Independent EGM entrypoint and report paths are registered under egm/; coordinator records actual reviewer outcomes and final disposition there.
- [ ] Owner approval of data spec before product code — pending.
- [ ] Product implementation/tests, CI, human merge, deployment and runtime proof — pending; no completion claimed.

#### Validation Notes

Author validation records the selected contracts and synchronized artifacts. Source baseline is Hub c6c2d5739572356239c4048c0f564f40b0768adc. No product files, shared feature state, credentials, branches/worktrees or production data were changed, and all tasks remain unchecked. Planning-only authorization does not bypass constitution V.

The package selects invoice closure, typed evidence, date scope, streamed residual output, deterministic proposal identity, native admission and the shared bootstrap in contracts/operator-bootstrap.md. It does not claim passed native review, product tests, live audit or execution approval. Cross-cutting prerequisites are stated once in [plan.md](plan.md#prerequisites-and-normative-contracts). Owner approval remains pending.

### Review artifact: implementation-inventory.md

### F7 exact file actions and dependency ownership

Hub-relative unless explicitly specs/. These are future implementation actions after owner spec approval. No Delete, business-table change, UI, route, messages/catalog, design-token or paid/booked/stock mutation is selected. One additive bounded security-function migration is selected in contracts/authority-bridge.md. The audit exposes no apply flag or mutation executor.

| Action | Exact file | Responsibility / explicit no-change predicate |
|---|---|---|
| Create | scripts/faces-receivables-audit.ts | Exact no-env-file CLI, input/target/principal admission, owned READ ONLY connection, streaming private atomic files (`subjects.jsonl`, `residuals.jsonl`, summary, proposals, manifest), labelled-incomplete staging on failure and connection cleanup. |
| Create | scripts/faces-receivables-audit.test.ts | Flag/scope/date/output/no-symlink/authority/redaction/error/deadline/read-only/no-writer contract. |
| Create | src/server/services/pos/accounts/audit.types.ts | Versioned exact subject/control/evidence/FinancialClosure/FinancialSourceRows/AccountControlSource/LinkIntent.effects DTOs, null unknown money and BigInt minor-string arithmetic; define pure QualifiedOperatorTarget before T006 re-export, so no future-module type is required. No mutation fields. |
| Create | src/server/services/pos/accounts/audit.logic.ts | Both exhaustive ordered per-kind classifiers/reason+uncertainty+action tables, two supported financial-shape decisions, pure cloned one-line account counterfactual, control hash and proposal canonicalization; BigInt money without DB/network imports. |
| Create | src/server/services/pos/accounts/audit.logic.test.ts | Independent count/classification/money/date/cohort/evidence/hash/namespace/stability fixtures. |
| Create | src/server/services/pos/accounts/audit.ts | Caller-owned CoreTx complete inventory/control and bounded FinancialSourceRows closure: party/document fin-client uncertainty probes, POS/finance-payment/signed-ledger/funding dedup and actual normalized method policy; no finite-U query widening or allocation engine. Register actual audit loader key/type only after this file exists in T011. |
| Create | src/server/services/pos/accounts/audit.sql.integration.test.ts | One marked qa-native file for actual snapshot/read-only/role parity/owner evidence/limits/cohort/source/count/proposal invariants and foreign denial. |
| Modify | src/server/services/rbac.service.ts | Extract neutral shared pure composer; new operator false/true bridge adapters with unchanged FreshCapabilitySnapshot shape, preserve existing legacy locking signature/default semantics. No role/permission writes. |
| Modify tests | src/server/services/rbac.service.test.ts | Role-model/default/union/effective-authority semantic compatibility; actual READ ONLY/parity proof additionally belongs in the native audit fixture. |
| Create | supabase/migrations/20261116190000_operator_authority_bridge.sql | Exact bounded definer read/lock function, observed trusted owner preflight, fixed search_path/no dynamic business SQL, app_ledger-only EXECUTE and unchanged baseline table ACL/RLS. |
| Create | src/server/test-utils/operator-native-auth-fixture.ts | Qualified owned-child-only canonical auth prerequisite install/assert helpers, exact owner/ACL/JWT/FK/catalog proof, no global pool/DB creation/deletion or runtime auth replacement. |
| Create | src/server/test-utils/fixtures/operator-native-auth.sql | Exact canonical child auth schema/users/uid invoker-owner-ACL recipe before public policies/FKs, source notification `reconciliation-harness.ts:374–401`. Test fixture only. |
| Create | src/server/auth/active-operator-principal.ts | Passed-CoreTx bridge false/true readers, closed result/binding validation and existing read-only active assertion; no direct forbidden table read, F3 dependency/global pool/network. |
| Create | src/server/auth/active-operator-principal.test.ts | Current snapshot/GUC/missing/deleting/inactive/no-pool/error contract; actual native cases in existing audit suite. |
| Create | scripts/lib/operator-principal.ts | Exact existing-session verifier, credential-free qualified target and pure operatorDatabaseIdentity; no app alias imports, JWT-only identity, refresh/session/new login or global fallback. |
| Create | scripts/lib/operator-principal.test.ts | Auth subject/project/target/TLS/refusal/redaction and connection identity stability across credential rotation. |
| Create | scripts/lib/operator-service-loader.ts | Exact closed typed Vite SSR/standalone Svelte loader after admission with empty env/closed virtuals, no HTTP/watch/config/dotenv fallback. Foundation T007 registry excludes audit key/type until real T011 audit.ts; always excludes future F3/F2 files until their implementing slices. No missing-file catch, namespace stub or unconditional future typeof-import. |
| Create | scripts/lib/operator-service-loader.test.ts | Real admitted graph, exact registry types/unknown-key refusal/idempotent close/partial failure cleanup and no global pool. |
| Create | scripts/operator-bootstrap.smoke.ts | T008 foundation-only real helper/existing-root process checks; T014 adds audit phase invoking actual audit package/runner/root/inventory/streaming with real injected connection. Foundation label is not qualified bootstrap; full positive required before consumers. No production/local-app env loading. |
| Create | scripts/operator-bootstrap.smoke.test.ts | Bad-admission no-import/no-connect, valid real graph, no dotenv canary, zero listener attempts during both real loader lifetimes including concurrent children and the owned occupied port 24678, and no new listener/pool handles on cleanup. |
| Modify | package.json | T008 faces:operator:bootstrap:smoke then T014 faces:receivables:audit exact --no-env-file/no-preload commands from operator-bootstrap.md, only after actual audit root/runner exist. No dependency/version change. |
| Create | src/server/utils/uuid-v5.ts | Extract existing pure SHA1 namespace UUID algorithm with REQUIRED namespace; audit fixed namespace is explicit. SHA256 remains approval integrity hash. |
| Create | src/server/utils/uuid-v5.test.ts | RFC/version/variant vectors, existing seed-default compatibility and deterministic audit UUID; no second implementation. |
| Modify | scripts/qa/seed/ids.ts | Preserve its existing public default-namespace wrapper/IDs while delegating to the neutral utility; not a new generator. |
| Modify | scripts/qc/native-postgres-manifest.ts | Optional exactAssertions boolean type and true on the concrete eight-name audit admission; preserve legacy rows and lane count, per contracts/native-exact-count.md. |
| Modify tests | scripts/qc/native-postgres-manifest.test.ts | New owner/exact semantic admission and missing/duplicate rejection. |
| Modify tests | scripts/qc/native-postgres-report.test.ts | Mandatory native-exact-count contract regression cases: the exact set of 8 names, extra passing rejection when true, missing/duplicate/unnamed/failed/skipped rejection and legacy optional=false/omitted additive compatibility. Report implementation change is explicit below, never assumed preexisting. |
| Modify | scripts/qc/native-postgres-report.ts | Mandatory optional exactAssertions per-admission equality from contracts/native-exact-count.md; legacy minimum/additive behavior unchanged, no filtered/skip bypass. |
| Modify only if required fixture missing | scripts/qa/seed/pos.ts | Synthetic >500-client/identityless/legacy-status/cohort/pending examples; otherwise reuse exact existing cases and record them. |
| Modify only if required fixture missing | scripts/qa/seed/crm.ts | Synthetic two-org party/contact identity/owner counterparts, never named production rows. |
| Modify only if required fixture missing | scripts/qa/seed/scheduling.ts | Synthetic free/inactive/funded/cancelled/no-show/member/evidence fixtures; otherwise unchanged. |
| Modify only if matrix/persona missing | scripts/qa/seed/matrix.ts | Exact selected audit cases/personas, no shared QA reset. |
| Create/update | specs/128-faces-receivables-audit/validation.md | Meta-repo command/candidate/snapshot/control/native/bootstrap/no-write/remaining-gate receipts. |
| Create local synthetic evidence | specs/128-faces-receivables-audit/evidence/ | Meta-repo protected test outputs referenced by validation; production audit outputs remain private approved output directory and are not committed fixtures. |

Explicit unchanged dependencies: pos/accounts/unbilled.ts already exports UNBILLED_BOOKING_WHERE, identity-key.ts exports canonical client-key helpers, and list/detail/resolve/pos-accounts.service.ts retain their intentionally different reader predicates. Audit reuses exported pure fragments/identities and implements its separate controls exactly as contracted; never calls their transaction-opening wrappers or changes count predicates to force equality. An unexpected candidate export gap requires adding a narrow export-only Modify row to this inventory first, never copied divergent semantics.

F3 owns stock write helpers/dual-gate protocol/correction schema/migration/module-writer change; F2 owns the receiptCorrection loader root; F3 owns the stockCorrections root, added to the closed loader only when those files exist in their slice. F7 foundation must compile/run without audit root/namespace/runner until T011/T014 and without any future F3/F2 files; shared bootstrap qualification waits for the full real audit command smoke. It performs NO stock/correction write. Existing bare-Bun shim, full SvelteKit/Vite config, native config/CI discovery, generic app pages and locale catalogs remain unchanged. The selected loader uses already installed dependencies; package lock is unchanged unless the owner separately approves a dependency change.

After the declared paths exist and normal `bun run i18n:compile` has generated actual Paraglide modules, ordinary focused qualification is:

```bash
bunx vitest run 'scripts/faces-receivables-audit.test.ts' 'scripts/lib/operator-principal.test.ts' 'scripts/lib/operator-service-loader.test.ts' 'scripts/operator-bootstrap.smoke.test.ts' 'src/server/services/rbac.service.test.ts' 'src/server/auth/active-operator-principal.test.ts' 'src/server/services/pos/accounts/audit.logic.test.ts' 'src/server/utils/uuid-v5.test.ts' 'scripts/qc/native-postgres-manifest.test.ts' 'scripts/qc/native-postgres-report.test.ts'
```

The SQL file runs only through the exact full marked qa-native lane/report from quickstart; ordinary Vitest excludes it. Actual fresh-process bootstrap smoke with qualified synthetic fixtures is separately mandatory, not replaced by mocked imports. Run full check/test/build on the same candidate; no UI/browser/token/i18n work is invented for this CLI-only slice. Preserve read-only before/after hashes and independently reconciled controls. Every future file action requires owner approval before product implementation; source inspection or this inventory is not execution evidence.

#### Executable stage and financial boundaries

Task DAG is T002–T009 foundation only → T010–T013 actual audit inventory/controls and audit registry/type → T014 actual CLI/package dispatch plus full positive smoke → T015–T018 both classifiers/financial closure → T019–T022 hashed link/effects → T023 full candidate qualification. No future audit file/import appears in foundation; no full shared-bootstrap claim precedes actual T014 real process proof. Existing native authority proof remains an additional required gate for consumers. All 25 tasks stay unchecked.

No new settlement/allocation file or general allocation engine is selected. loadAuditFinancialClosure stays internal to audit.ts, closed DTOs in audit.types.ts, pure classifier/projectLinkEffects in audit.logic.ts. Finite U never widens for client settlement. Supported positives are only zero stored settlement with complete all-date canonical-party evidence or a fully settled one-service-line ticket without alternate money. Signed wallet/finance paths are evidence, not settlement sums. Hashed effects contain wallet per-currency before/after and exact list control/logical row prediction; capped/sorted UI visibility remains null.

Shared operator-native-auth fixture also creates/verifies the inert service_role grant-recipient sentinel before actual baseline authority ACL DDL, with no memberships/SET ROLE/bypass rights; the pristine-controller and unsafe-role catalog vectors in native-auth-prerequisites.md are mandatory inside existing behaviors.
