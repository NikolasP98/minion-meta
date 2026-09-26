---
id: 2026-09-26-hub-custom-columns-next-phases
title: Guarded formulas, complete custom-property queries and minimal provisioning
status: draft
created: 2026-09-26
updated: 2026-09-26
repos: [minion_hub]
tags: [ui, data, security]
---

# Custom-column next phases

## AS-IS

The first implementation slice is specified in 2026-09-26-hub-custom-columns-spec: six typed scalar/list properties on the eight registered primary tables. This proposal records deliberately deferred capabilities, not delivered behavior. The source audit found 41 production DataTable uses and several grids. CRM delegates pagination and CSV export to server-side domain queries; adding display accessors alone cannot extend their full-result semantics.

## TO-BE

1. Calculated properties use the typed property catalog and stable-ID expression tree. SQL-style property references, arithmetic, functions and later registered relation rollups have inline syntax/type diagnostics and context-aware IntelliSense. Incompatible number/text/date/money/UOM operations, cycles, missing or restricted dependencies fail before save and are rechecked server-side. Formula preview/table/filter/sort/export share the authoritative evaluator.
2. CRM and other server-mode tables support custom filtering, ordering and full-result export through a scoped query planner, without page-only fallback. New required properties enforce domain create/import/API constraints before the option is offered.
3. Minimal-core provisioning defines and tests core fields per module, migrates eligible optional built-ins into org-owned properties while preserving existing data, and leaves canonical domain calculations intact as reusable sources.
4. Further durable source tables, report adapters and Socials hierarchy levels are admitted with canonical identities, typed metadata and correct owner/sensitive policies. Row renderers are not automatically treated as writable entities. Legacy CRM custom_fields gains a controlled binding/migration to property IDs.

## DELTA and verification

Implement each as a reviewed slice. Require later-page sorting/export tests, cross-organization/owner permission tests, decimal/currency/UOM/time semantics, definition-cycle and stale-reference diagnostics, and old/new calculation parity. Formula errors must remain visible and actionable in the editor. Source boundaries carry TODO(handoff) references to this proposal.

## Out of scope

Unrestricted SQL, arbitrary JavaScript, replacing ledger rules with user expressions, and silently backfilling optional data remain outside this proposal.
