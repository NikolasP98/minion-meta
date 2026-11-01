---
id: 2026-10-28-hub-tenant-isolation-hardening-before-org-3
title: "Close the server-side RLS bypass before a third org onboards: coverage test, bypass inventory, reproducible schema"
status: in-spec
created: 2026-10-28
updated: 2026-11-01
repos: [minion_hub, minion-meta]
source: 2026-10-28-hub-org-module-packages-tenancy-nav-home
effort: M
value: 9
tags: [security, data, test]
---

# Tenant isolation hardening before org #3

Split out of `2026-10-28-hub-org-module-packages-tenancy-nav-home` (T4). The decision there
is to keep one shared database with per-org row-level security. This proposal is the
condition that makes that decision safe for a clinic holding health data.

## AS-IS (hub `origin/master` 812a4b0a)

- The hub connects to Supabase as `postgres`, which bypasses every RLS policy
  (`src/server/db/with-org-core.ts:141`). Only queries inside `withOrgCore` run as the
  non-bypass `app_ledger` role with the org GUC set.
- Counts by file: 253 use `withOrgCore`; **119 use plain `getCoreDb()` / `getDb()`**;
  **32 use `supabaseAdmin()`**. Every query in the last two groups relies on a hand-written
  `org_id` filter. One missed filter exposes every tenant.
- 44 of the hub's 122 migrations carry `_org_guc` policies. No test asserts that every table
  with an `org_id` / `tenant_id` column has a forced-RLS org policy.
- The schema is not reproducible from source: `organizations`, `flows`,
  `organization_members`, `member_roles` have no `CREATE` anywhere (memory
  `hub-supabase-schema-not-reproducible`). A second database, for CI or for a regulated
  customer, cannot be built.
- Two fail-opens outside Postgres are tracked in their own memos and unchanged here: the
  gateway org map (`plugins/org-enforcement.ts`) and the public-read B2 bucket.

## TO-BE

- A test lists every public table with an `org_id`/`tenant_id` column and fails when one
  lacks a forced-RLS `_org_guc` policy (run against the QA stack in CI).
- An inventory file names each `getCoreDb()`/`getDb()`/`supabaseAdmin()` call site that
  reads or writes org rows, with one of: converted to `withOrgCore`; cross-org by design
  (platform admin, provisioning, metering) with a test asserting its explicit filter; or
  user-scoped (auth.uid tables). The inventory is derived mechanically (grep) and the test
  fails when a new call site appears without an entry.
- The four missing `CREATE` statements are recovered from the live schema into migrations so
  a replay onto an empty database succeeds (prerequisite for a CI database and for any future
  per-org project).

## DELTA

1. Coverage test (`src/server/db/rls-coverage.test.ts`): query `information_schema.columns`
   for `org_id`/`tenant_id`, join `pg_policies` + `pg_class.relforcerowsecurity`; allowlist
   file for the deliberate exceptions. Proof: the test is red on master today (expected), green
   after the policies land.
2. Bypass inventory (`audits/2026-10-28-hub-rls-bypass/inventory.md` + a test that diffs the
   grep against the inventory). Proof: adding an unlisted `getCoreDb()` query fails CI.
3. Convert the write paths first (anything that inserts or updates org rows outside
   `withOrgCore`), reads second. Proof: per converted service, the existing tests pass under
   `app_ledger`.
4. Schema recovery: dump the four tables' DDL from prod, add as the earliest migration,
   replay onto an empty database in CI. Proof: 122/122 applied.

Out of scope: the gateway org map and the B2 bucket (own memos); moving any org to its own
project.

## Definition of done

The coverage test and the inventory test run in hub CI and are green; a fresh database built
from migrations alone serves the QA seed; the next org is provisioned only after both.

## Ledger

- Spec: `specs/048-hub-tenant-isolation-hardening/`. H1 (coverage test) and H2 (inventory) ship
  first; H3 conversions one service per PR; H4 schema recovery blocked on an owner-provided
  `pg_dump` of the four core tables.
- Allowlisted `todo` tables from the first coverage run are appended here by H1's PR.

## Ledger

Org-scoped tables (org_id/tenant_id) without forced RLS + a `current_org_id` policy, from `rls-coverage.allowlist.json` (hub H1). Remove each from the allowlist in the PR that fixes it.

- `ai_usage`
- `bg_jobs`
- `brain_vector_outbox`
- `email_ledger`
- `email_ledger_settings`
- `fin_dni_reassign_bak_cli`
- `fin_dni_reassign_bak_inv`
- `fin_products_bak_insumos2608`
- `fin_settings`
- `flow_groups_backup_20260604`
- `flows_backup_20260604`
- `flows_backup_20260605_triage`
- `gateway`
- `gateway_lease`
- `pulse_proposals`
- `pulse_settings`
- `stk_bins_bak_insumos2608`
- `stk_consumption_bak_insumos2608`
- `stk_entries_bak_repair`
- `stk_entries_reclass_bak`
- `stk_items_bak_insumos2608`
- `stk_items_fin_product_bridge_backup`
- `stk_ledger_bak_repair`
- `workshop_comparison_runs`
- `workshop_groupchat_runs`
- `workshop_prompt_categories`

Reason `platform`: org_provision_runs. Reason `user-scoped`: notes. Local-only QA table `org_plan_events` (no migration in repo) is intentionally not listed.
