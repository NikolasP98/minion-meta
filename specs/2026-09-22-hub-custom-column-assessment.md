---
id: 2026-09-22-hub-custom-column-assessment
title: Hub custom-column foundation assessment
stage: done
status: shipped
pass: 1
type: research
created: 2026-09-22
updated: 2026-09-22
repos: [minion_hub]
tags: [data, ui]
---

# Hub custom-column foundation assessment

## 0. Product

Identify the lean visible columns each Hub module needs and establish safe storage boundaries for future organization-defined properties.

## AS-IS

`src/lib/tables/defs/index.ts` registers eight primary lists. `src/lib/tables/registry.ts` stores organization overrides for labels, default visibility, editability and ID prefixes in `app_table_config`. Those overrides configure projections: `hidden` does not delete a value, and DataColumn `custom` selects a renderer rather than defining stored data. Many other `DataTable` instances are detail, operational, administrative or telemetry views and have no registry identity; registering every visual table would incorrectly imply that every row shape is a mutable business record.

## TO-BE: primary-list matrix

| Registry table | Minimum system-owned fields | Lean default-visible columns | Optional built-in projections / future properties |
|---|---|---|---|
| `stock.items` | immutable row/org identity; human code; item name; inventory UOM; active/state fields used by movements; stock quantities and valuation inputs | ID, name, on-hand quantity, UOM, status | group, tags, value, reorder/MOQ and supplier metrics are removable from the view but remain system projections; custom handling notes/classifications |
| `stock.entries` | immutable row/org identity; entry number; movement type, status and timestamps; source/destination relationships; line quantities | ID, type, status, created date | party and workflow projections; custom review notes/labels |
| `pos.catalog` | immutable row/org identity; SKU; name; sell price/currency; kind; active/billing flags; stock/service relationships; tax/accounting inputs | ID, name, price, kind, active status | category, tags, stock/mapping and billed/revenue/cost/margin remain built-in projections; custom merchandising attributes |
| `crm.customers` | immutable party/contact/org identities; party type; authoritative document/channel relationships; lifecycle/verification facts | title/name, stage, primary channel, verified status | score, funnel, demographics, origin, tags and revenue/activity remain built-in projections; custom consented preferences and segments |
| `finances.invoices` | immutable row/org identity; document number; client relationship; issue/tax dates; currency; line/tax totals; status and accounting provenance | ID, issued date, client, total, status | DNI remains an identity projection; custom review/fulfillment labels cannot alter the ledger |
| `finances.purchases` | immutable row/org identity; supplier/document identity; issue date; currency; taxable bases/taxes/total; ingestion/accounting provenance | ID, supplier, issued date, total, status/source | taxable base, IGV and ingestion details remain system projections; custom review classifications cannot alter source documents |
| `socials.campaigns` | immutable row/org/platform identity; platform/account relationship; campaign name/status/time range; spend and provider synchronization keys | ID, name, status, spend | preview and delivery/performance metrics remain provider-owned projections; custom planning labels/themes |
| `team.people` | immutable person/employment/org identities; auth/contact relationships where present; employment status and effective dates | title/name, designation, department, status | roles and timeline remain system projections; custom skills/preferences require HR-specific access controls |

The lean set is the recommended initial visible view, while the minimum system-owned set describes storage invariants. Derived values such as stock value, margin, CTR and CRM revenue may be removed from a user's view and offered as read-only property templates, but remain system-owned. Relationship keys may be rendered as names or links while their underlying IDs remain non-removable.

## DELTA: other DataTable surfaces

The repository also uses `DataTable` for invoice lines (`finances/invoices/[id]/+page.svelte`), stock lines and related operational views (`stock/entries/[id]/+page.svelte`, `stock/items/[id]/+page.svelte`, `stock/commitments/+page.svelte`), campaign details and posts (`socials/campaigns/[campaignId]/+page.svelte`, `socials/posts/+page.svelte`), POS accounts and sell lines (`pos/accounts/+page.svelte`, `pos/sell/+page.svelte`), and team settings/time off (`components/team/TeamSettingsView.svelte`, `TimeOffView.svelte`). Agent, reliability, backup, user and workshop tables live under their matching component directories. Classify each before registration:

- Detail and transaction-line tables inherit the parent record's schema and lifecycle; custom properties belong on the underlying entity or line type, not on the component instance.
- Operational/configuration tables expose permission-sensitive system state and should remain fixed unless a domain spec identifies safe extension points.
- Telemetry and computed reports are projections; custom columns should be saved formulas/views with explicit dependency and cost limits rather than arbitrary row storage.

### Module admission recommendations

| Module / anchored surfaces | Lean visible set | Property policy |
|---|---|---|
| POS accounts and ticket lines — `pos/accounts/+page.svelte`, `pos/sell/+page.svelte` | account/ticket ID, title/customer, status, total/balance; line item, quantity and amount | Financial totals, tenders, taxes and stock links stay fixed. Allow account workflow labels; line custom values only if invoice/stock emission defines their persistence. |
| Scheduling bookings and event types — scheduling domain feeding POS and calendar APIs | booking/service ID, title/customer, start, status | Time, resource, recurrence and attendance facts stay fixed. Admit operational notes and classifications on the canonical booking/event entity, even though the current calendar is not a `DataTable`. |
| Finance detail, banking and reconciliation — `finances/invoices/[id]/+page.svelte` plus statement/payment services | document/transaction ID, date, counterparty, amount, currency, status | Ledger lines, taxes, payment allocations, bank provenance and reconciliation state stay fixed. Admit review labels/notes only; reports and derived balances are read-only templates. |
| Stock commitments and entry/item detail — `stock/commitments/+page.svelte`, `stock/entries/[id]/+page.svelte`, `stock/items/[id]/+page.svelte` | record/line ID, item, quantity, UOM, location/status | Movement quantities, bins, component edges, reservations and valuation stay fixed. Admit handling and inspection attributes on the correct item/entry-line entity. |
| Social posts, campaign detail and settings — `socials/posts/+page.svelte`, `socials/campaigns/[campaignId]/+page.svelte`, `socials/settings/+page.svelte` | post/ad ID, title/preview, platform, status, scheduled/published time | Provider IDs, sync state and metrics stay fixed/read-only. Admit planning labels, owner and creative theme on canonical posts/campaigns; settings tables remain fixed. |
| Team settings and time off — `components/team/TeamSettingsView.svelte`, `TimeOffView.svelte`, `PeopleView.svelte` | person/request ID, name, request/type, dates, status | Auth roles, employment dates, approvals and balances stay fixed. HR custom properties need separate view/edit/export permissions and sensitivity labels. |
| Brains, agents and memory — `brains/agents/+page.svelte`, `components/brains/BrainDocumentsTable.svelte`, `components/agents/AgentMemoryPanel.svelte`, `PiAgentOrchestrations.svelte` | agent/document/memory ID, title, type, status, updated time | Runtime identity, orchestration state, provenance and retrieval scores stay fixed. User metadata belongs on durable agent/document records; transient runs and memories are not generic property hosts by default. |
| Users and access — `components/users/TeamTab.svelte` | user ID, name/email, status, role | Identity, memberships, invitations and permissions stay fixed and security-administered. Do not admit ordinary custom properties until field-level visibility and directory export rules exist. |
| Reliability and activity — `components/reliability/ActivityLogTable.svelte`, `AgentActivityPanel.svelte`, `PerformanceMonitorPanel.svelte` | timestamp, subject, event/metric, status/severity | Append-only events and computed metrics are immutable projections. Support saved views/formulas rather than row properties. |
| Backups and administrative settings — `components/settings/BackupsTab.svelte` and settings tables | backup/config ID, created/updated time, state | Retention, checksums, destinations, permissions and configuration keys stay fixed. No arbitrary row properties. |
| Workshop experiments — `components/workshop/experiments/LeaderboardTab.svelte` | experiment/run ID, name, status, score | Scores and run evidence stay immutable; annotations may attach to the durable experiment, never rewrite results. |

Tables that only render child lines should inherit the parent module's decision, while calendar, kanban and card views must resolve the same entity property definitions as table views. This avoids making DataTable usage the accidental boundary of the future feature.

## Recommended architecture

Add an organization-scoped property-definition registry separate from `app_table_config`. Each definition needs a stable ID and key, entity type, localized label, scalar type, validation/default rules, sensitivity classification, display order, lifecycle state and creation/update actor. Store values by `(org_id, entity_type, entity_id, property_definition_id)` with typed value columns or a validated JSON value plus type-specific indexes. Keep system fields in their canonical tables and expose both through a single column descriptor API.

Deletion should be staged: deactivate/hide first, then a separately authorized purge with dependency checks, audit evidence and retention policy. Rename changes the label, not the stable key. Type changes require an explicit conversion preview. Reads and writes must use the entity module's capability and organization scope; sensitive CRM/HR/financial properties need field-level policy rather than inheriting generic table visibility. Export, import, search and filters must resolve definitions at request time and fail closed on unknown or inactive definitions.

Implement in phases: definitions and scalar values for one low-risk entity; shared column resolution; editing/filter/export; audit and lifecycle controls; then module-by-module admission. Do not use `app_table_config` as the value store or infer removability from a hidden/default-hidden column.

## Out of scope

This assessment does not create, migrate or remove columns, property definitions or customer data.

## Verification

The matrix was checked against `src/lib/tables/defs/index.ts`, `src/lib/tables/registry.ts` and every current `DataTable` call site found under `src/routes/(app)` and `src/lib/components` at Hub base `53640d6c`.
