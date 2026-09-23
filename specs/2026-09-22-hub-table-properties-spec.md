---
id: 2026-09-22-hub-table-properties-spec
title: Catalog table properties and custom-column foundation
stage: done
status: shipped
pass: 2
verdict: approved
created: 2026-09-22
updated: 2026-09-22
repos: [minion_hub]
proposal: 2026-09-22-hub-table-properties
tags: [ui, data]
---

# Catalog table properties

## 0. Product

Make tags and categories manageable directly from the POS catalog table with the interaction model of Notion properties, then establish the minimum-column boundary for future organization-defined properties.

## AS-IS

- `src/routes/(app)/pos/catalog/+page.svelte`: tags use display-only chips; category is an editable text column.
- `src/lib/components/data-table/DataTable.svelte`: typed primitive cells and row-save controller exist; no tag-service connector.
- `src/lib/components/tags/TagOptionList.svelte`: scoped search, create, rename, color and delete exist outside the catalog table.
- `src/routes/api/tags/[kind]/[id]/+server.ts`: assignment gates capabilities by entity kind; product requires POS editing.
- `src/server/services/pos.service.ts`: product category is stored text; taxonomy/board grouping consumes that classification.
- `src/lib/tables/registry.ts` and `defs/index.ts`: eight registered primary tables with label/visibility/editability overrides. `custom` on DataColumn means a custom renderer, not a user-defined data property.

## TO-BE and invariants

1. Clicking the catalog Tags cell permits searching, adding and removing direct catalog tags. Users can manage names and colors from that surface. Successful changes persist through reload and update filter options and other affected rows. Ingredient tags remain distinguishable and cannot be assigned or removed through the product editor.
2. The connector is reusable and keeps domain persistence outside generic table rendering. Writes respect POS capability and organization table editability, show pending/error state and prevent out-of-order responses or stale sibling-field writes from silently losing changes. Assignment replaces only manual links in the entity's scope; non-manual and legacy read-only links survive. Serialize same-entity whole-set replacements inside the database transaction so concurrent delete/insert phases cannot interleave. The final whole set follows transaction order; independent-client set merging is not promised by this replace-set API.
3. Category is a single-select with colored values and an empty state. Create, rename, recolor and delete are available through its editor. Existing text categories remain represented. Rename updates assignments atomically; delete clears assigned products to an empty category atomically and never deletes products. The delete UI states that effect before confirmation. All updates are organization-scoped and registry/product updates remain consistent.
4. Table editing retains keyboard access, Escape/outside dismissal, row virtualization, search, filtering, export and column configuration. Shared design tokens and existing primitives govern the interface.
5. The module assessment separates minimum operational fields from optional built-in projections and user-defined properties. Hidden columns are not deleted data. Required identifiers, relationships, financial quantities and derived values cannot become removable storage solely because they are not in the default view.

### Permission and save contract

- Reading options requires the owning module's view capability; assigning and managing options both require its edit capability, matching the current scoped tagging service. Catalog uses `pos:view` and `pos:edit`; no new management role is introduced. Every registry mutation checks the option's actual organization/scope. A table field disabled by organization configuration exposes neither assignment nor registry-management controls in its cell.
- Registry create/rename/recolor/delete updates all visible uses and filter choices immediately after acknowledgement and performs a checked projection refresh. Inherited source values refresh through the loader and remain read-only.
- A pending assignment is explicitly marked. A known rejection never appears as a successful save: retain the attempted draft with an error/retry affordance and retain the last server-confirmed value separately; reload displays only persisted values. An uncertain transport result requires readback before resending. A successful write followed by a failed refresh is shown as committed with a refresh problem, not as an uncommitted write eligible for blind replay.
- Price, category and tags write only the changed property to their domain endpoints. Updating a price must not resend an old category name after an option rename or deletion.

## DELTA and proof

| Transition | Required evidence |
|---|---|
| Display-only tags to live editable cells | Add/remove and reload; failed save recovery; inherited tags read-only |
| Disconnected registry management to coherent table state | Create/rename/recolor/delete reflected across cells and filter options |
| Free-text categories to managed single-select | Preserve legacy values; assign/clear; rename/delete consistency; tenant and permission rejection |
| Generic table integration | Focused regression tests for typed cells, persistence and editability overrides |
| Future custom-column boundary | Source-anchored module matrix and staged storage/permission plan |

## Verification

Run focused tests, Svelte checks, design/token gates and browser workflows on the loopback QA stack. Schema changes include seed fixtures and migration checks. Do not use production customer records for feature testing.

## Out of scope

Creating/removing arbitrary custom columns throughout the Hub is the subsequent phase. This change evaluates that boundary and delivers catalog tag/category editing. It does not replace financial, stock, identity or telemetry schemas with generic property storage.

## Review

Record two passes: standards (architecture, permissions, design, concurrent-write safety), then spec (observable behavior and requirement coverage). The module-wide custom-column creation/removal UI is future scope; this change delivers its assessment.

The Sol reviewer approved both specification axes on pass 2 after clarifying read-only link preservation, transaction serialization, category deletion, permission mapping and acknowledged/uncertain save outcomes. Implementation verification is recorded below as it completes.

## Verification evidence

- Baseline DataTable and table registry: 23 tests passed. Existing tag service: 9 tests passed.
- New tag-link PostgreSQL integration: 1 test passed using independent database connections; covers concurrent whole-set writes, manual-only replacement, read-only legacy links and organization isolation.
- Category PostgreSQL invariants: 3 tests passed for rename/delete, foreign/stale references and forced row-level security. Focused category/API/sellable/error tests: 45 passed.
- Authenticated loopback HTTP: category create 201, assignment 200, rename/recolor 200 with persisted assignment and unchanged price, delete 204 with only category cleared, original seed category restored 200. A stale assignment initially returned 500; after correcting the nested database-error mapping, the repeated authenticated PATCH returned 422 with `invalid_category`.
- Live viewer persona: category reads 200; registry creation and tag assignment each rejected 403. Owner session restored. No production test writes.

- Fresh local schema restore applied the migration; all 177 seed registrations succeeded, and the seed contract passed 183 tests including idempotency. Drizzle schema drift check passed.
- Browser: tag creation and rename persisted; category creation, assignment, rename and recolor persisted with the row chip updating. Design debt did not increase and token integrity reported zero violations.

- Full unit run: 4,394 passed, 212 skipped and two failures in the unrelated ACI Git fixture. Both failures traced to the local 1Password signing agent; the complete ACI file passed 26/26 with process-local commit signing disabled. Architecture reconstruction tests passed 3/3. PostgreSQL suites were separately qualified against loopback QA.
- Browser failure injection found that Retry discarded a rejected tag-removal intent. The Sol reviewer rejected that revision; commit `11bad9dd` separates displayed confirmed IDs from retry IDs. The new regression passed, and the repeated browser sequence sent `PUT []` twice, first rejected and then successful, with authoritative tags empty and the error cleared.
- Inline tag tests now pass 3/3. Category route mocks were narrowed for type checking; DataTable tests use per-test cleanup. Final typecheck passed with 0 errors and 0 warnings; hosted CI passed all test, build, migration-pairing and QA-stack checks.
- Browser organization field overrides disabled every visible category/tag mutation control; configuration was restored afterward. Tag recolor persisted, category deletion cleared the assignment, and the original QA product category was restored.

- Independent Sol final review approved exact head `8c87d302d99491dba4b98bd1fe007c54d8147d72`. Hub [PR 364](https://github.com/NikolasP98/minion_hub/pull/364) merged after checks passed; merge commit `245135773e5c7d84d0ad05382a55c7bdf599fe63`. Production verification passed as recorded below.

## Production verification

The standard Git-triggered release deployed merge commit `245135773e5c7d84d0ad05382a55c7bdf599fe63`. GitHub Production deployment `6604308676` succeeded at `2026-09-23T01:24:01Z`; Vercel deployment `dpl_5KceVfj8foTyjCYaTvu5vNYz4K5J` reports `target=production` and `readyState=READY`.

A separate read-only database transaction verified migration receipt `20260922120000`, expected schema/defaults, forced organization RLS, app_ledger grants, primary/unique/color constraints, and the composite product-category foreign key with update cascade and category-only delete clearing. Six managed options cover all 61 existing categorized products; there are zero unmatched assignments. The production browser route reached the expected sign-in boundary without an authenticated session; interactive product verification was performed on seeded loopback QA. No production feature-test writes or provider calls were made.

Tag and category management are shipped. The module minimum-column assessment is complete; arbitrary custom-column creation/removal remains the explicitly separate future phase.
