# Hub service centralization audit

Source audit dated 2026-09-20. The parent audit recorded Hub branch `master` at `0acd6282df74d18eacd27673fcf238cd16a29e56`, with concurrent POS and table work. Findings describe inspected working-tree source, not a clean release snapshot or verified runtime behavior. This audit changes no Hub source and does not qualify deployment, database contents, or live propagation.

## Canonical index

| Domain | Existing owner and entry points | Boundary to preserve |
|---|---|---|
| Tags | [tag-links.service.ts](../../minion_hub/src/server/services/tag-links.service.ts):21,60; definition/contact operations in [crm-contacts.service.ts](../../minion_hub/src/server/services/crm-contacts.service.ts):1857–1932; [TagsField.svelte](../../minion_hub/src/lib/components/tags/TagsField.svelte):61 | Shared registry; contact associations and automatic rules differ from booking/event-type/product associations. |
| Workflow events | [emit.ts](../../minion_hub/src/server/events/emit.ts):12,19; [internal event handler](../../minion_hub/src/routes/api/internal/events/handle/+server.ts):37 | Transactional `pg_notify`, delivered on commit. The source explicitly describes cron as durability fallback, not an outbox. |
| Stored events | [events.service.ts](../../minion_hub/src/server/services/events.service.ts):22,69 | Persisted unified telemetry is different from mutation notifications. |
| Browser events | [org-events.ts](../../minion_hub/src/lib/realtime/org-events.ts):115,156 | Shared organization broadcast subscription manager; message-specific wrapper. |
| Party identity | [party.service.ts](../../minion_hub/src/server/services/party.service.ts):51,140,305,379 | Org-scoped identity, reconciliation, search, and contact association. |
| CRM finance attribution | [crm-finance.service.ts](../../minion_hub/src/server/services/crm-finance.service.ts):39,58 | Shared `CONTACT_PARTY` and invoice classification SQL already exist. Bank-statement attribution is intentionally separate from invoice attribution. |
| Stock and recipes | [stock.service.ts](../../minion_hub/src/server/services/stock.service.ts):169,366,727,1158; [stock.logic.ts](../../minion_hub/src/server/services/stock.logic.ts) | Stock writes and pure quantity/UOM/component math. |
| Costing and reservations | [item-cost.service.ts](../../minion_hub/src/server/services/item-cost.service.ts):48,157,231; [stock-accruals.service.ts](../../minion_hub/src/server/services/stock-accruals.service.ts):76,341 | Cost projections, reservations, and actual inventory movements have different meanings. |
| Invoice ingestion | [connector.ts](../../minion_hub/src/server/finance/connector.ts); [finance.service.ts](../../minion_hub/src/server/services/finance.service.ts):84,375; [finance-sync.service.ts](../../minion_hub/src/server/services/finance-sync.service.ts):123 | `CanonicalInvoice` and batch persistence already centralize imports. |
| Invoice emission | [emission/index.ts](../../minion_hub/src/server/finance/emission/index.ts); [pos-emission.service.ts](../../minion_hub/src/server/services/pos-emission.service.ts):218 | Outbound document issuance differs from imported invoice persistence. No competing invoice persistence implementation was established in this audit. |

## Findings: AS-IS, TO-BE, DELTA

### S02 — POS event bypasses the typed contract (P1)

**AS-IS.** [emit.ts](../../minion_hub/src/server/events/emit.ts):12–16 defines four variants, excluding `pos.ticket_submitted`. [pos.service.ts](../../minion_hub/src/server/services/pos.service.ts):1538–1546 explains and uses an `as unknown as` cast to emit that event anyway. The [internal event handler](../../minion_hub/src/routes/api/internal/events/handle/+server.ts):37–52 dispatches known types and returns `{ignored:true}` for unknown types. Consequently this callback performs no action for that POS event. Other possible external consumers were not exhaustively audited.

**TO-BE.** A typed event registry makes supported payloads and consumer behavior explicit.

**DELTA.** Add the POS event to the shared contract and decide its intended handlers together; remove the cast. Preserve unknown-event compatibility where needed. Coordinate with concurrent POS changes before implementation.

**Verification.** Contract tests reject malformed known events, accept the POS variant without casts, and assert the intended handler runs. Redelivery must not duplicate side effects. An integration test must distinguish transaction rollback from committed delivery.

### S01 — Party identity validity depends on entry path (P1)

**AS-IS.** [party.service.ts](../../minion_hub/src/server/services/party.service.ts):53 trims document input in `ensureParty`. Its reconciliation helper `cleanDoc` at :115 rejects repeated-digit and fewer-than-eight-character documents. The [parties API](../../minion_hub/src/routes/api/crm/parties/+server.ts):77 uses `ensureParty`; [finance-sync.service.ts](../../minion_hub/src/server/services/finance-sync.service.ts):159 and [crm-contacts.service.ts](../../minion_hub/src/server/services/crm-contacts.service.ts):185 invoke reconciliation. Identical placeholder input therefore encounters different identity policies.

**TO-BE.** Interactive creation and batch reconciliation apply the same document-validity contract.

**DELTA.** Extract a domain identity policy with equivalent JS and SQL behavior. Keep document identity stronger than phone matching and retain org isolation. Review existing stored placeholder records separately; this audit does not establish affected production rows.

**Verification.** Run shared fixtures through both entry paths: blank, short, repeated-digit placeholder, valid DNI/RUC, phone-only, and keyless records. Verify the same identity decisions and tenant isolation; exercise concurrent creation separately.

The header at [party.service.ts](../../minion_hub/src/server/services/party.service.ts):21 claims harvest/SUSII wiring is absent. The current callers cited above already invoke reconciliation, so that comment is stale evidence and should be corrected when the service is changed.

### S03 — Recipe root and graph loading are repeated (P1)

**AS-IS.** [item-cost.service.ts](../../minion_hub/src/server/services/item-cost.service.ts):111 privately loads product roots. [pos.service.ts](../../minion_hub/src/server/services/pos.service.ts):664 independently loads issue resolution and :712 chooses recipe before the one-to-one stock bridge. [stock-accruals.service.ts](../../minion_hub/src/server/services/stock-accruals.service.ts):99 independently loads mappings; :114 explicitly explains repeated component expansion because `withOrgCore` cannot nest. Existing leaf math is already shared through `stock.logic.ts`. These repetitions are maintenance risks; this inspection did not prove that current calculated totals disagree.

**TO-BE.** Consumers share transaction-aware root and component loading while retaining separate valuation, reservation, and inventory effects.

**DELTA.** Extract loaders accepting `CoreTx`, plus an explicit resolution policy. Reuse pure component/UOM functions. Define whether bridge fallback belongs in each reservation path rather than silently broadening behavior.

**Verification.** Cross-consumer fixtures cover recipe-over-bridge precedence, bridge-only products, composite recipes, UOM conversion, unvalued leaves, modifiers, and booking-owned stock issuance. Assert no nested transaction calls and no double stock deduction. Preserve cost projections versus reserved versus realized quantities.

### S04 — Shared tags have fragmented service contracts (P2)

**AS-IS.** [tag-links.service.ts](../../minion_hub/src/server/services/tag-links.service.ts):14 supports booking/event_type/product; :5 imports its DTO from scheduling UI. The same file explicitly preserves separate `crm_contact_tags` storage. Replacement at :60 validates same-org/non-auto tags. [crm-contacts.service.ts](../../minion_hub/src/server/services/crm-contacts.service.ts):1911 inserts contact associations through another service entry point and clears CRM cache. [TagsField.svelte](../../minion_hub/src/lib/components/tags/TagsField.svelte):61 creates definitions through a CRM-named API.

**TO-BE.** A domain-owned tagging facade provides shared definition validation, application contracts, and change publication while adapting to each association model.

**DELTA.** Move tag DTO ownership out of the scheduling component tree. Route contact and entity APIs through the facade; preserve contact automatic rules, application metadata, and intentional association tables. Define additive/removal operations or concurrency protection before making whole-set replacement the universal mutation primitive.

**Verification.** Test manual versus automatic tag application, invalid and cross-org IDs, registry changes reflected in all consumers, contact versus entity associations, and competing tag edits. Inspect database constraints before treating a service-level validation difference as an authorization vulnerability.

### F01 — Shared event transport does not yet give general live propagation (P2)

**AS-IS.** [emit.ts](../../minion_hub/src/server/events/emit.ts):19 publishes transactional workflow notifications. [org-events.ts](../../minion_hub/src/lib/realtime/org-events.ts):115 exposes browser broadcasts. A source search found its only external consumer through `subscribeMessageCommitted` in the [CRM contact page](<../../minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte>):407. Tag replacement at [tag-links.service.ts](../../minion_hub/src/server/services/tag-links.service.ts):60 and item updates at [stock.service.ts](../../minion_hub/src/server/services/stock.service.ts):381 return persisted data without publishing entity-change events in those functions. This does not establish that every other transport is absent, but these shared paths do not demonstrate instant cross-view updates.

**TO-BE.** A committed change reaches affected mounted views through shared organization/entity/version-scoped invalidation and mutation reconciliation.

**DELTA.** Define the relationship between domain notifications, browser broadcasts, cached queries, and audit records. Add entity-change publication and subscriptions with reconnect recovery. Use autosave for reversible property changes only after pending/error/conflict behavior is specified. Keep form submission, financial issuance, cancellation, and destructive actions explicit.

**Verification.** In two authenticated local QA sessions, edit one entity and verify the second view updates without navigation. Cover rollback, failed save, reconnect, duplicate and out-of-order events, tenant separation, and stale-write conflict recovery. Source inspection alone cannot satisfy this check.

### S05 — Project assignee identity creation bypasses the party facade (P3)

**AS-IS.** [projects.service.ts](../../minion_hub/src/server/services/projects.service.ts):36 implements `ensureAgentParty`; :54 implements `ensureSelfParty`, inserting parties at :66. [party.service.ts](../../minion_hub/src/server/services/party.service.ts):37 supports only person/company input with document/phone matching. Agent and user IDs are legitimate different identity keys.

**TO-BE.** A party facade owns all typed identity creation methods.

**DELTA.** Move agent/user creation behind explicit operations keyed by agent ID and user ID. Do not route these through document/phone deduplication. Preserve the existing agent conflict-safe upsert and define equivalent concurrency guarantees for user identity.

**Verification.** Repeated and concurrent creation produce one identity for each supported key within the org; separate organizations remain isolated. Existing project assignment and timesheet callers keep their identity semantics.

## Audit limits and implementation order

This was a bounded source audit using `rg`, file reads, and caller tracing. No application tests or local QA runtime were run, because no service implementation was changed. Canonical invoice ingestion was found; a duplicate persistence implementation was not. Workflow notifications, stored telemetry, browser updates, invoice imports, emissions, cost projections, reservations, and stock movements must not be collapsed merely because they share vocabulary.

Recommended implementation order: normalize party identity; repair typed event coverage; extract transaction-aware recipe loading; introduce the tagging facade; connect committed changes to browser invalidation. Use the parent proposal and lifecycle gates before implementation. All six findings remain documented candidates, not completed fixes.
