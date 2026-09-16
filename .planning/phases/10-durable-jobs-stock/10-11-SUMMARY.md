---
phase: 10-durable-jobs-stock
plan: "11"
status: complete
scope: private-helper-preparation
---

# Stock transaction helper preparation

Both scoped tasks are complete in private source commits be12800c72a1f56b5e774afd89f1a7d9c1f3653e and ddfa455404b3c76a3fc19dc616d867633fdf59e9, based on verified Hub77445c01. Public stock/accrual wrappers retain existing behavior and audit transaction boundaries; new internal helpers use the caller transaction for accrual/release, source lookup, issue creation and submission.

Validation:92 focused service cases;8 actual PostgreSQL18.6 cases; full Hub check0errors/0warnings; format and diff checks pass. Native tests assert real SQLSTATE22012 rollback and42501 tenant denial, original numeric/constraints/forcedRLS/append-only ledger ACL, actual unmocked naming allocation, ledger/bin/counter rollback and public accrual/UOM/non-resurrection behavior. Seven original migrations and complete schema-only configured-Hub catalog for fin_products/naming_series_counters were admitted; no table data was copied.

Root reviewed both source diffs and native fixture boundaries, then inspected retained native/fullcheck results. Packet receipt: ../../operations/360/gap-closure/evidence/stock-helper.json. This is qualified helper preparation, not completed booking recovery.10-12/13/14 must capture/admit inputs, wire every producer, execute under current ownership and expose operator state. No production schema, data, scheduler or flags changed. Configured Hub is PostgreSQL17.6; native18.6 results do not themselves prove target-version compatibility. Exact source TODOs point to the stock recovery proposal until adoption.
