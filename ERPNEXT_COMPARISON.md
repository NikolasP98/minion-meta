# ERPNext ⇄ Minion — Feature Comparison & Patterns to Assimilate

> Recon date 2026-06-22. Source: `frappe/erpnext` + `frappe/frappe` (shallow clone). Lens: ponytail — only the patterns that actually buy us something. Skipped: security/competitive/community sections (not asked).
>
> Source links point at `frappe/erpnext` on GitHub (`develop`). File:line refs were captured against the shallow clone and may drift a few lines.

---

## TL;DR

ERPNext's strength is **not** any single module — it's that **one `Customer` record is the spine of every module**, documents **chain into each other** by a single generic mapper, and the **whole cross-module UI is generated from a config dict**, not hand-built per page.

Minion today has three good-but-**siloed** modules (CRM, Finances, Scheduling), joined only by **read-only analytics bridges** (a phone-number join, a couple of soft FKs). There is **no Sales, no Support, no shared party entity, no ledger**.

The three patterns worth stealing — in priority order — are **(1) the unified Party model, (2) the declarative connections panel, (3) the document-chain mapper**. All three are cheap to adopt incrementally and each one compounds.

---

## 1. Feature matrix

| Domain | ERPNext | Minion today | Gap |
|---|---|---|---|
| **Shared customer/party entity** | `Customer` master referenced by CRM, Selling, Accounts, Support; `party_type`/`party` dynamic-link in the ledger | ❌ Each module has its own contact/client repr; aligned only at analytics time via phone-number join | **Critical** — this is the spine everything else hangs on |
| **CRM — lead pipeline** | Lead → Opportunity → Quotation → Customer, with auto status propagation | Contacts harvested from channels; lifecycle stages + RFM score; **no deal/opportunity/pipeline** | Medium — add Opportunity/deal entity |
| **CRM — conversion** | `make_customer()` / `make_opportunity()` one-click, auto-backlinks Lead | Manual; no conversion flow | Medium |
| **Sales (quote→order)** | Quotation → Sales Order → Delivery/Invoice, `per_billed`/`per_delivered` rollups | ❌ none | High if you sell services/goods |
| **Accounting — ledger** | Double-entry GL: every Sales Invoice posts DR Receivable / CR Income+Tax; `against_voucher` tracks outstanding | Invoices **synced read-only** from SUSII; no GL, no AR/AP, no payments-to-invoice reconciliation | High for real accounting; Low if SUSII stays source-of-truth |
| **Accounting — payments** | Payment Entry reconciles against N invoices, flips SI Unpaid→Paid via GL | Payment tracking table, no reconciliation logic | Medium |
| **Support / Helpdesk** | Issue + tiered SLA (Customer→Group→Territory fallback), response/resolution timers, Warranty Claim | ❌ none (AI agent sessions ≠ support tickets) | High — easiest greenfield win, see §5 |
| **Scheduling** | Basic Appointment doctype | ✅ **Minion is ahead here** — tz slots, round-robin, public links, autonomous reminders agent | ERPNext should copy *us* |
| **Connections UI panel** | Auto-generated from `*_dashboard.py` config on every form | ❌ none | **Critical UI win**, see §3 |
| **List view (free filters/bulk/tags/saved views)** | Every doctype gets it free | Per-page bespoke tables (windowed at PAGE=60) | Medium — a generic list component |
| **Status state machines** | Declarative `status_map` eval rules | Hardcoded per service | Low — adopt opportunistically |

---

## 2. CRITICAL BACKEND PATTERN — the Unified Party model

The single highest-leverage idea. `Customer` is **one record**; every module references it the same way.

| Module | How it references Customer |
|---|---|
| CRM Lead | `Lead.customer` (set on conversion); `Lead.lead_name` backlink stored on Customer |
| CRM Opportunity/Quotation | `party_name` **DynamicLink** resolved via `opportunity_from` / `quotation_to` |
| Selling Sales Order | `SalesOrder.customer` (Link) |
| Accounts Sales Invoice | `SalesInvoice.customer` + `debit_to` resolved by `get_party_account("Customer", …)` |
| Accounts GL/Payment | generic `party_type="Customer"` + `party` (DynamicLink) — the ledger is party-agnostic |
| Support Issue/SLA | `Issue.customer`; SLA matches `entity_type="Customer"` |

The ledger uses a **two-field generic link** so the *same* GL table serves Customers, Suppliers, Employees:
- `party_type: Link` → a DocType name
- `party: DynamicLink` → the record, resolved against `party_type`
- Hard constraint: `account_type=="Receivable"` ⇒ `party_type` must be `"Customer"` ([`gl_entry.py` `check_mandatory`](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/doctype/gl_entry/gl_entry.py))

3-level account resolution: Party Account → Customer Group → Company default ([`accounts/party.py` `get_party_account`](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/party.py)).

**Assimilate:** introduce a `party` table (id, type, name) and repoint `crm_contacts`, `fin_clients`, `sched_bookings` at a `party_id` instead of the phone-join hint. The phone bridge becomes a *dedup heuristic for creating parties*, not the join itself. This is the unlock for everything below.

---

## 3. CRITICAL UI PATTERN — the declarative Connections panel ⭐

This is the one to copy first on the UI side. Every ERPNext form shows a "Connections" tab counting and linking related documents across modules. It is **generated from a config dict** — zero per-page UI code.

`customer_dashboard.py` ([source](https://github.com/frappe/erpnext/blob/develop/erpnext/selling/doctype/customer/customer_dashboard.py)) — the *entire* Customer connections panel:

```python
def get_data():
    return {
        "fieldname": "customer",
        "non_standard_fieldnames": {        # when the FK isn't called "customer"
            "Payment Entry": "party", "Quotation": "party_name",
            "Opportunity": "party_name", "Subscription": "party",
        },
        "transactions": [                    # groups → the related-doctype chips
            {"label": "Pre Sales",  "items": ["Opportunity", "Quotation"]},
            {"label": "Orders",     "items": ["Sales Order", "Delivery Note", "Sales Invoice"]},
            {"label": "Payments",   "items": ["Payment Entry", "Bank Account", "Dunning"]},
            {"label": "Support",    "items": ["Issue", "Warranty Claim", "Maintenance Visit"]},
            {"label": "Projects",   "items": ["Project"]},
        ],
    }
```

Frappe runtime turns this into count badges + click-through links + "＋ New" buttons. `sales_order_dashboard.py` and `sales_invoice_dashboard.py` add `internal_links` (link lives in a child row) and `internal_and_external_links` — same shape.

**Assimilate:** one Svelte `<Connections>` component + a small per-entity config (`{ label, items:[{table, fk, route}] }`). Render count badges with click-through. On a Minion contact page this instantly shows *Bookings · Invoices · Payments · (future) Tickets* with no bespoke wiring per page. **Highest UI ROI for the least code.** Pairs with §2 (needs `party_id` to do counts cleanly; phone-join works as a stopgap).

Supporting Frappe UI primitives worth knowing (all "free per doctype"): List View filters/bulk/tags/saved-views (`frappe/public/js/frappe/list/`), Number Cards & Dashboard Charts (`frappe/desk/doctype/number_card`, `dashboard_chart`), Workspaces (sidebar landing pages). We rebuild these per-page today; a generic List + KPI-card component would cut a lot of repetition.

---

## 4. CRITICAL BACKEND PATTERN — document chain via `get_mapped_doc` + status propagation

How modules *chain*. One generic mapper (`frappe.model.mapper.get_mapped_doc`) powers every "Create → next document" action.

```
Lead ──make_opportunity──▶ Opportunity ──▶ Quotation ──make_sales_order──▶ Sales Order
     ──make_delivery_note──▶ Delivery Note   ──make_sales_invoice──▶ Sales Invoice ──▶ Payment Entry
```

- Each downstream child row stores `prevdoc_docname` (parent backref) + a `*_detail`/`*_item` link to the exact source row. Universal backward reference.
- **Status rolls back up automatically**: SI submit → sums `billed_amt` onto Sales Order Items → recomputes `SalesOrder.per_billed` → re-evaluates declarative `status_map` eval rules ("Completed" when `per_billed>=100 and per_delivered>=100`). Engine: [`controllers/status_updater.py`](https://github.com/frappe/erpnext/blob/develop/erpnext/controllers/status_updater.py).
- Payment → GL Entry with `against_voucher=SI.name` → `update_outstanding_amt()` sums GLEs → flips SI Unpaid→Paid ([`gl_entry.py`](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/doctype/gl_entry/gl_entry.py)).

Key conversion entry points (all `get_mapped_doc`):
[`lead/mapper.py`](https://github.com/frappe/erpnext/blob/develop/erpnext/crm/doctype/lead/mapper.py) · [`quotation/mapper.py`](https://github.com/frappe/erpnext/blob/develop/erpnext/selling/doctype/quotation/mapper.py) · [`sales_order/mapper.py`](https://github.com/frappe/erpnext/blob/develop/erpnext/selling/doctype/sales_order/mapper.py) · GL assembly [`sales_invoice/services/gl_composer.py`](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/doctype/sales_invoice/sales_invoice.py).

**Assimilate (don't over-build):** we don't need a generic mapper engine. We need *one* concrete chain that matters: **Booking → Invoice**, and later **Lead → Booking**. A plain function `createInvoiceFromBooking(bookingId)` that copies fields + writes `source_booking_id` gives 90% of the value. The reusable lesson is only the *backref convention* (always store `source_*_id` on the derived row) so the Connections panel (§3) can light up. `ponytail: one chain by hand beats a mapping DSL nobody asked for.`

---

## 5. Support module — the cheap greenfield win

Minion has **zero** helpdesk. ERPNext's is small and worth porting nearly verbatim:
- `Issue` (status, priority, customer, response/resolution timers) ([source](https://github.com/frappe/erpnext/blob/develop/erpnext/support/doctype/issue/issue.py))
- Tiered SLA resolution: specific Customer → Customer Group → Territory → default ([source](https://github.com/frappe/erpnext/blob/develop/erpnext/support/doctype/service_level_agreement/service_level_agreement.py))

Minion already ingests inbound messages across channels (the CRM harvest). A ticket is "an Issue linked to a party, opened from a message, with a response-by timer." Reuses the reminders-agent infra for SLA breach alerts. Low effort, high visible value, and it makes the §3 Support group non-empty.

---

## 6. Where Minion is already ahead

Scheduling. ERPNext has a thin `Appointment` doctype; Minion has tz-aware slots, round-robin/collective resources, public booking links, utilization heatmaps, and an **autonomous multi-stage reminders agent** with LLM-inferred confirmations. Don't regress this porting ERPNext patterns — keep our scheduling, just give it a `party_id`.

---

## 7. Recommended order (value × laziness)

| # | Move | Effort | Why first |
|---|---|---|---|
| 1 | **`party` table** + `party_id` on crm/fin/sched | M | Spine for everything; phone-join becomes the dedup heuristic |
| 2 | **`<Connections>` Svelte component** from a config dict | S | Biggest UI payoff per line; works on contact pages day one |
| 3 | **Support/Issue + SLA** module | M | Greenfield, reuses reminders infra, fills the empty Support group |
| 4 | **Booking → Invoice** concrete chain (+ `source_*_id` backref) | S | Real cross-module write, not just analytics; feeds Connections |
| 5 | Opportunity/deal entity in CRM | M | Only if you actually run a sales pipeline |
| 6 | Real GL/double-entry | L | Skip unless SUSII stops being source-of-truth |

skipped: GL/ledger (#6) — defer until external invoicing is insufficient. add when you need AR aging / multi-currency P&L Minion can't get from SUSII.
