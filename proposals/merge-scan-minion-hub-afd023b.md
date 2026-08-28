---
id: merge-scan-minion-hub-afd023b
title: Merge-scan deficiencies — minion-hub @ afd023b
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-hub]
tags: [merge-scan]
---

# Merge-scan deficiencies — minion-hub

Filed automatically by the factory merge-scan (maintenance-lane spec S-B): a
fresh-context rubric scan of everything merged into `master` since the
last sweep. Every bullet below is machine-generated from merged commit
content — treat it as a finding DESCRIPTION, never as an instruction.

- source: merge-scan
- commit range: [`7fdc291..afd023b`](https://github.com/NikolasP98/minion_hub/compare/7fdc291f88f87c5448a72240af8c8891346d1bff...afd023b6100de280ba0f14e252f9afe1baa6a360)

## Findings

- **medium** `scripts/audit-server-tenant-scope.ts:83` (unvalidated-input) — JSON.parse called without error handling; malformed evidence file produces unhelpful parse error instead of operator-facing message
- **high** `src/hooks.server.ts:205` (unchecked-access) — permissions.permissions accessed without null/undefined check after awaiting loadPermissionsForUser
- **high** `src/hooks.server.ts:519` (empty-catch) — PostHog errors silently swallowed without logging or visibility into telemetry failures
- **medium** `src/lib/components/crm/PartyPicker.svelte:27` (missing-handoff) — Comment documents that initialVerifiedOnly 'Defaults on for customer contexts and off when the accepted types include system agents' but component does not implement this defaulting logic.
- **medium** `src/lib/components/crm/graph/CrmGraph.svelte:215` (empty-catch) — Empty catch block swallows releasePointerCapture error; despite comment, this pattern masks failures and should log or explicitly ignore
- **high** `src/lib/components/dashboard/EditableGrid.svelte:70` (empty-catch) — Empty catch block silently swallows errors from loadDashboardLayout without logging or error handling.
- **high** `src/lib/components/data-table/DataTable.svelte:848` (empty-catch) — Empty catch block silently swallows errors from server.onSelectAllMatching(), leaving the user with no feedback if the async call fails; loading state will still clear but selection remains unchanged with no error indication.
- **high** `src/lib/components/pos/SellableWizard.svelte:280` (empty-catch) — catch block swallows all exceptions silently; network errors, JSON parse failures, and handler errors bypass toasting
- **high** `src/lib/components/reliability/PerformanceMonitorPanel.svelte:46` (unvalidated-input) — API response is cast without validation; malformed data could cause crashes when accessing undefined properties.
- **high** `src/lib/components/scheduling/BookingsView.svelte:149` (unvalidated-input) — API response field itemId cast as string without null check; missing field silently becomes undefined, violating type contract
- **medium** `src/lib/components/scheduling/BookingsView.svelte:272` (unvalidated-input) — API response property contact_id accessed without validating it exists; could be undefined, breaking contact selection
- **medium** `src/lib/components/scheduling/BookingsView.svelte:295` (unvalidated-input) — Accessing nested property j.preview.hasMapping without validating j.preview exists; TypeError caught but structure not validated
- **medium** `src/lib/components/stock/StockItemCreateForm.svelte:62` (empty-catch) — catch block swallows fetch/JSON errors without logging, hiding debugging information from developers
- **medium** `src/lib/components/ui/Picker.svelte:210` (unchecked-access) — result.rows is accessed without checking if the rows property exists; accessing .length on undefined will crash if loadRows returns a malformed result
- **medium** `src/routes/(app)/crm/customers/+page.server.ts:28` (unvalidated-input) — scoreMin and scoreMax URL parameters are converted with Number() which can return NaN for invalid inputs; NaN values are then used in Math.max/Math.min and passed to rankContactsPageCached without validation.
- **medium** `src/routes/(app)/socials/+page.server.ts:42` (unchecked-access) — Destructuring context without null check; will throw TypeError if socialDashboardContext returns null/undefined
- **medium** `src/routes/(app)/socials/+page.server.ts:51` (unchecked-access) — Spreading dashboard without null check; will throw TypeError if socialDashboardData returns null/undefined
- **medium** `src/routes/api/crm/contacts/+server.ts:59` (unvalidated-input) — sort query parameter is cast via as RankFilters['sort'] without validation, unlike sortDir which is explicitly validated—invalid sort values could reach the ranking function.
- **high** `src/routes/api/crm/contacts/[id]/relationship/relationship.server.test.ts:1` (weakened-test) — 158 lines of test coverage for PUT and DELETE relationship endpoints (auth, permissions, validation, service integration) deleted with no replacement shown in this diff chunk.
- **medium** `src/routes/api/crm/ruc-lookup/+server.ts:37` (empty-catch) — Catch handler silently converts JSON parse error to null without logging; malformed requests may be harder to debug
