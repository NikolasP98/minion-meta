---
id: 2026-09-26-hub-custom-columns-spec
title: Typed custom-column creation and management
stage: done
status: shipped
pass: 2
verdict: approved
created: 2026-09-26
updated: 2026-09-26
repos: [minion_hub]
proposal: 2026-09-26-hub-custom-columns
tags: [ui, data, security]
---

# Typed custom columns

## 0. Product

Begin the organization-personalized table model with working custom-column creation, configuration, lifecycle and value editing. Typed contracts must be reusable by future guarded formula IntelliSense. This first slice covers the eight registered primary entity tables, not every component that happens to render rows.

## AS-IS

At Hub master a7a7762, src/lib/tables/defs/index.ts registers stock.items, stock.entries, pos.catalog, crm.customers, finances.invoices, finances.purchases, socials.campaigns and team.people. app_table_config stores presentation overrides. DataTable.svelte supports client/server modes, custom renderers and independent custom-cell editing. It has no generic property definitions. CRM custom_fields JSON has its own semantics; finance/stock/provider calculations remain domain-owned.

## TO-BE: observable behavior

1. Each registered source table exposes Add column and Manage columns to users with its schema-management permission. These actions open one reusable, localized manager. A custom column header's menu can open its configuration directly. Nonmanagers may read/edit values according to separate capabilities.
2. The creation form collects name, optional description, one of text/number/date/boolean/select/multi_select, optional default and applicable validation rules. Name length and duplicates are validated. Text supports maximum length; number supports finite min/max and decimal precision; select/multi-select options have stable UUID, label and palette color. Defaults must validate. All fields are optional at record creation in this slice: required-field enforcement across domain creation/import routes is a follow-up and must not be falsely offered.
3. New active properties appear in the source table and remain after reload. Their values are stored for the canonical entity record and current organization. New organizations start with no custom definitions. Creating a property never rewrites native rows or injects synthetic data into legacy CRM metadata.
4. Custom cell editing supports each offered type, inline errors, pending state, successful readback, rejected drafts and safe retry. Date values are date-only ISO strings; display is localized dd mmm yyyy. Null, false, zero and empty collections remain distinct. Value mutations cannot invoke native full-row PATCH or overwrite sibling properties.
5. Management supports rename, description/rule/default changes, option rename/recolor/archive, property archive and restore. Property archive removes its active column and retains values and stable identity. Restore uses the same property ID. No permanent purge is offered. Archived options remain readable in existing assignments but cannot be newly assigned. A write may retain archived IDs only if they occur in that record's current stored value, while editing active IDs normally. Options cannot be hard-deleted through configuration; archive/restore them by stable ID. An active default may not refer to an archived option; require clearing/changing that default in the same configuration update.
6. Type/rule changes validate every stored non-null value and the proposed default atomically. Incompatible changes fail with a clear conflict/validation explanation and leave all values intact; no implicit coercion or destructive conversion. The editor may narrow this to immutable type when data exist if the limitation is clearly communicated, but the backend must reject incompatible input.
7. Defaults are projected only for absent value records. Explicit null is a stored clear and suppresses a default. Changing a default therefore changes untouched cells; the configuration UI explains that behavior. Defaults are not silently copied into rows.
8. Custom columns reuse layout/visibility/reorder/resize and client-mode sort/filter/search/export through stable custom:<UUID> keys. Server-mode tables must not sort/filter only the loaded page or silently claim full-export support. If the full query/export adapter is not supported in this slice, disable those custom-column operations, explain the limit, and document the follow-up at the exact integration site and proposal. Existing native operations stay intact. In particular, CRM is server-mode and delegates CSV export: disable custom sorting, custom filtering and custom server CSV export, with no browser-page fallback. Add a clear control hint and TODO(handoff) pointing to the follow-up proposal at this exact boundary.

## Data and API contract

Shared source: src/lib/tables/custom-properties.ts. Use a discriminated union for the six supported types and pure definition/value validation shared by client/server. The numeric output contract is finite and bounded, dates are real Gregorian YYYY-MM-DD dates, and unknown types/keys fail closed. Do not include calculated/relation type choices until implemented. Stable IDs/types/rules form the future formula symbol metadata; inline formula debugging is a subsequent slice.

Store definitions in app_table_properties and JSON scalar/list values in app_table_property_values keyed by org_id, property_id and canonical record_id. Use forced organization RLS, scoped transactions and composite organization/property foreign keys. Values need a JSON null representation distinct from no row. Definitions/options and payload sizes are bounded. Server controls actor IDs, timestamps and version numbers.

Definition/value schemas include server-owned created_by/updated_by profile IDs and created_at/updated_at timestamps. Authenticated service contexts supply actor IDs; unauthenticated calls are rejected. Labels are trimmed, length-bounded and unique case-insensitively among active properties within an org/table, enforced by a partial unique index on lower(label). Restore returns 409 when the active name is occupied. Active option labels are likewise unique case-insensitively within a definition.

Every update/archive/restore and existing value mutation requires expectedVersion; create-value uses expectedVersion=0. Compare-and-swap failures return 409. Serialize definition validation/configuration against value mutations on the same property inside the transaction, so a concurrent write cannot violate newly committed rules. Definition scans and option edits preserve existing values. Each successful mutation records actor/time; no raw secret or production data enters tests/logs.

Routes use one generic namespace, resolved through an explicit table-to-module/entity allowlist: GET/POST /api/tables/properties (tableId query/body), PATCH/DELETE /api/tables/properties/[id], POST /api/tables/properties/values/query for bounded record IDs, and PUT /api/tables/properties/values for a single property/record value. All expectedVersion fields use JSON request bodies, including DELETE/archive. Backend owner publishes the exact typed response/request shapes before UI implementation. A missing value cell is {present:false,value:null,effectiveValue:defaultOrNull,version:0}; a stored clear is {present:true,value:null,effectiveValue:null,version:n}. PUT null stores the clear; no override-delete operation is offered in this slice. The bundle also includes recordAccess keyed by authorized record ID with per-record canEdit (required for mixed Team identities); absent access means unavailable. The values service accepts only records returned by the authoritative entity adapter, not browser-asserted existence.

## Permissions and entity adapters

Schema changes require the owning module's manage capability plus view; value mutations require edit plus view. Module enablement is checked. Map stock.* to stock, pos.catalog to pos, crm.customers to crm, finances.* to finance, socials.campaigns to ads. Team schema management requires scheduling:view/manage and users:view/manage. Team employee records use hr_employees UUIDs and require scheduling:view/edit for their values; member:<profileId> records require current organization membership and both scheduling:view plus users:view/edit. Per-record edit flags reflect that difference; a single table-wide canEdit cannot authorize member writes. The relevant source read is always checked.

Adapters validate canonical record identity, current organization and the native list/detail ownership rules before value read/write. Cross-org, deleted, nonexistent and out-of-scope records must not become value-store hosts. Do not expose existence via differing forbidden/not-found results. CRM ownerFilter is mandatory. For every owning module supported by shouldMaskSensitive, a caller for whom it returns true receives no custom definitions or values, and canManage/canEdit are false; mutations reject. Apply the same gate to reads, writes, export and management, including guessed property IDs. Team uses the explicit HR/user matrix above. This conservative policy avoids classifying arbitrary custom values as automatically nonsensitive. Socials supports c:<campaignId> campaign rows only in this slice; expanded s:<adsetId>/a:<adId> rows show unavailable custom cells without editors. Validate campaigns by current-org Meta connection/account insight existence, using canonical org+campaign identity consistent with the current native grouping. Test same IDs in another org/account and reject records with no authorized backing insights. Validate employee/member IDs through current org HR/membership sources. Finance edit permission allows custom annotations even on closed/imported documents; those writes never update official fields. Raw ids alone prove nothing.

All reads/writes, including direct API calls, enforce these rules. UI gating mirrors server capabilities but is not the security boundary. Batch reads are bounded; no per-cell request loop. Each organization/table allows at most 100 active properties; archived definitions do not consume that capacity, and restore enforces the same limit as creation. A full DataTable custom-properties bundle carries definitions, per-row effective values/versions, canManage/canEdit and mutation callbacks. Definitions remain org/entity-scoped across native view variants.

## UI and save behavior

Reuse existing design tokens, Modal/Popover/Dropdown, Button, Input, Select and form foundations. This revision has no exported DatePicker primitive: use a governed native input type=date through the shared field components for editing, with localized dd mmm yyyy read display. Svelte 5 runes/snippets only. Keyboard focus, Escape and outside dismissal work. EN/ES messages are required. Color choices use the existing tagging palette. Definition edits have stable selection so refresh cannot overwrite an unsaved draft.

Separate confirmed values from drafts. A rejected write keeps the user's intended retry value; an uncertain write performs authoritative readback before deciding its state. A mutation success followed by refresh failure must be reported as saved-with-refresh-failure rather than silently reverted or retried as a new write. Record/table/org changes invalidate stale async completions. Archive confirmation explains retained data. Type/rule rejection must remain actionable.

## DELTA and proof

| Transition | Evidence required |
|---|---|
| Static tables to organization properties | Create each type at POS/stock, reload, confirm schema/value isolation |
| Client inputs to typed persisted values | Valid and invalid type/rule/default/date/option tests; no coercion surprises |
| Column menu to schema lifecycle | Rename/config/archive/restore and option edits preserve row associations |
| Independent edits to concurrent persistence | Stale definition/value version rejects; configuration/value race cannot violate rules |
| Generic values to domain records | Tenant, module, owner, sensitive-field, deleted/foreign record tests on adapters |
| Native/custom cells coexist | Editing a custom cell leaves native fields and sibling custom values unchanged |
| Full table behavior | Client sort/filter/export works; server-mode unsupported custom operations are explicitly gated |

## Verification

Focused shared-contract/API/service/component tests; real PostgreSQL RLS/concurrency tests; seeded local HTTP/browser tests with owner/editor/viewer personas; schema drift and migration/seed pairing; check/build, design/token gates and relevant suite. All eight adapters require authorization coverage; primary POS/stock browser flows cover every type and lifecycle. Use loopback QA only. Two spec passes (standards then requirements) precede implementation. Independent exact-head review and required CI precede authorized merge; branch-triggered deployment is verified by commit and readiness.

## Out of scope and follow-up

Formula execution/IntelliSense, relations/rollups, global server-query/export planning for new property types, required-field enforcement across all creation/import paths, migration of optional built-ins into custom properties, minimal-core provisioning changes, and admission of the remaining table surfaces are subsequent phases. Record these at extension boundaries with TODO(handoff) and a matching open proposal. No inactive controls or fake implementations for those types ship in this slice.

## Implementation and release evidence

- Hub PR: https://github.com/NikolasP98/minion_hub/pull/386. Reviewed source caee27476b36e16c762bac8efd0de6066c6eccdb; squash merge fc4ebb1b70eed8f2fa141b69dd89f9cd50d21f91 on 2026-09-26.
- Independent Sol exact-commit review approved; separate backend/adapters and documentation reviews approved. The user authorized merge after subagent review. GitHub requires another account approval; the authorized admin merge was used after all checks passed.
- CI run https://github.com/NikolasP98/minion_hub/actions/runs/36274006276 passed unit, check/build, PostgreSQL and seeded QA jobs. Vercel preview was Ready before merge.
- Local type checking: zero errors/warnings. Design-debt and token gates passed; architecture tests 3/3. PostgreSQL RLS, compare-and-swap and configuration/value race tests passed. Eleven HTTP lifecycle/permission groups passed; seed repeat was idempotent; schema drift passed.
- Local full unit run had 4,566 passing tests and one unrelated scheduling timeout under load. The scheduling and custom UI focused rerun passed 28/28; the full CI suite passed.
- Browser qualification: created and edited all six types at POS; verified localized date display, header configuration, rename/default projection, archive/restore and persistence after reload. Custom edits sent no native row updates. Stock displayed all six seeded types and management controls. Owner/editor/viewer permissions and tenant/record boundaries were exercised by HTTP and adapter tests.
- Production deployment dpl_7mj35Skj7wfodVLwvWabUw1yCeX9 is READY and serves hub.minion-ai.org. Its build cloned master at fc4ebb1 and applied 20260926180000_custom_table_properties.sql successfully (one migration applied). Deployment: https://minion-yw0on4byg-nikolasp98s-projects.vercel.app. The public POS catalog route responds with the expected unauthenticated login redirect; authenticated mutation qualification used the seeded local environment, not production customer records.
