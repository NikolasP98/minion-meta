# ERPNext ⇄ Minion — Round 2: deeper patterns + cross-module navigation UX

> 2026-06-22. Follow-up to `ERPNEXT_COMPARISON.md`. Round 1 shipped: party spine, Connections panel, document-chain (`get_mapped_doc`) + status rollup, Support/SLA, Sales Orders. This round mines six **new** subsystems, judges whether ERPNext **improves on** what Minion already has, and focuses on the **navigation UX** — moving between connected records with zero friction.
>
> Source links: `frappe/frappe` and `frappe/erpnext` on GitHub (`develop`). Line refs from the local shallow clone; may drift a few lines.

---

## TL;DR

Two kinds of finding this round:

1. **The UX glue is the real prize.** We built the *Connections panel* (the map of related records). What ERPNext has that we don't is the **navigation between them**: pick a party once and every linked field auto-fills (`fetch_from`), one click creates a linked record with the parent pre-set, a command palette jumps anywhere, count badges open pre-filtered lists. All of it rides **one mechanism** — `frappe.route_options`, a context object serialized into URL params — which maps *exactly* onto SvelteKit's `url.searchParams` read in a `load` function. Low effort, very high "feels like one system" payoff.

2. **Two things we "already have" are beaten by ERPNext's generality** — our `crm_activities` (contact-only) vs their polymorphic comment+audit timeline, and our scheduling-only reminders vs their any-event notification engine. In both cases the ERPNext design isn't more clever per-line; it's **reusable across every module** where ours is welded to one. That's the improvement: generalize, don't rewrite.

Ranked recommendations at the end (§7).

---

## 1. Head-to-head: is ERPNext better at what Minion already has?

You asked specifically: for overlaps, is their pattern an improvement in **logic, simplicity, performance**? Honest verdicts:

### 1a. Activity timeline — ERPNext **wins (generality + a capability we lack)**

| | Minion `crm_activities` | ERPNext Comment + Communication + Version |
|---|---|---|
| Scope | **Contact only** (`contact_id` FK) | **Any record** — polymorphic `(reference_doctype, reference_name)` |
| Kinds | note / tag / stage / score | comment, @mention, like, + system events |
| Field-level audit | ❌ none | ✅ **Version** auto-captures every field diff ("changed Status Draft→Open") |
| Email threading | ❌ | ✅ Communication (`in_reply_to`, email-to-case) |
| Reusability | hand-build per module | one table, one component, any module |

**Verdict: adopt theirs.** Not because the code is cleverer — a polymorphic `(ref_type, ref_id)` table is *simpler* than per-module activity tables — but because it's reusable and it gives us **field-level audit history, which Minion has nowhere**. Support tickets have no conversation thread (I flagged this as v2 in round 1); sales orders have no "who confirmed this." Generalize `crm_activities` → `doc_comments` + `doc_audit_log` (polymorphic), migrate the CRM notes, and every module gets a threaded timeline + audit trail from one `<DocTimeline>` component. One ERPNext perf trick to **skip**: their denormalized `_comments` JSON cache on the parent row — our org-scoped index on `(ref_type, ref_id, created_at)` is fast enough without the write-amplification. ([comment.py](https://github.com/frappe/frappe/blob/develop/frappe/core/doctype/comment/comment.py) · [version.py](https://github.com/frappe/frappe/blob/develop/frappe/core/doctype/version/version.py))

### 1b. Notification engine — ERPNext **wins on generality + latency; keep our reminders as a specialization**

| | Minion reminders agent | ERPNext Notification |
|---|---|---|
| Scope | **Scheduling bookings only** | **Any doctype, any event** (New/Save/Submit/Value-Change/Days-Before/Method) |
| Config | code + `sched_reminder_config` | a config row — zero code for a new alert |
| Trigger latency | cron poll (1–5 min) | **synchronous** on doc save (real-time) |
| Strengths | multi-stage, **LLM-inferred confirmation**, multichannel, reply-scan | condition eval, role/field recipients, template |

**Verdict: don't replace — generalize.** Our reminders agent is arguably *better tuned* for bookings (the LLM confirm + reply-scan is something ERPNext has no equivalent for). But it's welded to scheduling. ERPNext's lesson: a generic `notif_rules` table ("when `support_issues.priority` → urgent, WhatsApp the on-call") makes the *reminders agent one instance* of a general engine, reusing our existing `gatewayCall` delivery path. Two honest caveats where ERPNext is genuinely better: (1) **logic** — their `event_map` + condition is trivially extensible to any module; ours isn't. (2) **performance/latency** — their synchronous `run_notifications()` hook fires the instant a doc saves; our cron-poll lags. On Vercel we have no persistent doc-save hook, so the lazy path is cron-poll, but a **Supabase `AFTER INSERT/UPDATE` trigger → queue table** would close the latency gap if real-time matters. ([notification.py](https://github.com/frappe/frappe/blob/develop/frappe/email/doctype/notification/notification.py) · [document.py `run_notifications`](https://github.com/frappe/frappe/blob/develop/frappe/model/document.py))

### 1c. Assignment / round-robin — **tie on the algorithm, ERPNext wins on the work-queue UX**

We already do **least-busy distribution** — the scheduling booking picker sorts resources by open-interval count (`scheduling-bookings.service.ts`). ERPNext's Assignment Rule is the *same algorithm* (round-robin / load-balancing) generalized to any entity, plus two things we don't have: **auto-assign on create** and a **per-user work queue** (the ToDo doctype + the "Assigned To" avatar strip). **Verdict:** no logic improvement to steal — we already wrote the picker — but the *work-queue concept* and *auto-assign-on-create* are net-new value for support tickets and leads (both have an unused `owner_id` today). Reuse our existing least-busy function; add a `work_items` queue + auto-assign hook. ([assignment_rule.py](https://github.com/frappe/frappe/blob/develop/frappe/automation/doctype/assignment_rule/assignment_rule.py))

---

## 2. ⭐ Cross-module navigation UX — the main event

The Connections panel showed you *what's related*. These patterns let you *move through it without re-typing*. **All five share one mechanism**: ERPNext's `frappe.route_options` — a context object the router serializes into URL query params and the destination page reads back. In SvelteKit that's literally `goto('/x?party_id=…')` → `url.searchParams` in `+page.ts`. No new infra.

### 2a. `fetch_from` — pick once, auto-fill everywhere ⭐ (highest data-entry win)

**Feel:** On a new Sales Order you pick "ACME" in the Customer field and tab away — customer name, tax ID, currency, price list, territory, address, payment terms all fill themselves. You typed one thing.

**Mechanism:** each field declares `"fetch_from": "customer.tax_id"`; on link-select the client does one RPC ([`validate_link_and_fetch`](https://github.com/frappe/frappe/blob/develop/frappe/client.py)) returning just those columns and sets them — respecting `fetch_if_empty` so it never stomps a value you edited. ([link.js `fetch_map`/`validate_link_and_fetch`](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/form/controls/link.js))

**Minion gap:** we have the `parties` spine but picking a party on a booking/ticket/order doesn't cascade-fill `name/phone/email/doc/timezone`. **Port:** a `FETCH_FROM` map per form + an `onPartySelected` that fills empty fields from the loaded party. ~½ day per form, and it's the difference between "a database" and "it knows my customer." **Effort: M · Value: very high.**

### 2b. "+ New" from a Connection, with the parent pre-filled ⭐ (lowest-effort win)

**Feel:** On María's contact page, the Connections panel's "Bookings" group has a `＋`. Click it → new booking form, attendee already set to María. Same for "＋ Invoice", "＋ Ticket".

**Mechanism:** the panel's new-button calls `make_new(doctype, fieldname)` which mints a blank doc with the back-reference field pre-set, or routes with `route_options` (→ URL params) so even "open in new tab" carries context. ([dashboard.js](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/form/dashboard.js) · [form.js `make_new`](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/form/form.js))

**Minion gap:** our Connections chips link to *filtered lists* (good) but there's no *create-linked* affordance. **Port:** add a `＋` per group → `goto('/scheduling/bookings/new?crmContactId=…&_from=…')`; the new page's `load` reads `searchParams` into initial form state. Pure URL params — trivial, and it closes the loop (panel shows related records *and* creates them). **Effort: S · Value: very high.**

### 2c. Count badge → pre-filtered list — **we mostly have this; verify it's wired**

**Feel:** click "Invoices 3" on a contact → the invoices list, pre-filtered to that contact.

We already render chips as links (`/sales?contact=…`, `/finances/invoices?contact=…`). ERPNext's nuance worth copying: a `non_standard_fieldnames` map because the same party is keyed differently per table (we have the same problem — `crmContactId` vs `partyId` vs `clientDocNumber`). **Action:** audit that each target list page's `load` actually *consumes* the `?contact=`/`?party_id=` param and filters. This is the cheapest gap to close because the links already exist — they just need the destination to honor them. ([dashboard.js `open_document_list`](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/form/dashboard.js) · [list_view.js `parse_filters_from_route_options`](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/list/list_view.js)) **Effort: S · Value: high.**

### 2d. Awesomebar / global command palette

**Feel:** ⌘K → type "ACME" jump to the customer; "new sales order" opens the form; "reservas" opens a report. One palette to reach anything.

**Mechanism:** a boot-time manifest (doctypes, reports, recents, permissions) + **client-side fuzzy match** — no server hit until explicit full-text search. ([awesome_bar.js](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/ui/toolbar/awesome_bar.js))

**Minion gap:** no global search. **Port:** a `/api/search-index` manifest + Fuse.js (already a hub dep) for instant local match; "New X" actions reuse the prefill-URL pattern; full-text via a Turso/PG FTS query over `parties` + linked tables. **Effort: M-H · Value: high** (it's the single biggest "feels fast" upgrade for power users / front desk).

### 2e. Quick Entry modal — create a linked record without leaving the page

**Feel:** in a link dropdown, "Create new Customer" opens a 3-field modal (mandatory only), save, and the new name drops back into the field you were in. Never lost your place. ([quick_entry.js](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/form/quick_entry.js)) **Port:** a `<QuickCreate>` dialog with required-fields-only + an `onCreated` callback that fills the combobox, plus an "Edit full form" escape hatch. **Effort: M · Value: med-high.**

### 2f. Niceties: breadcrumbs · recent · prev/next · open-in-new-tab

Breadcrumbs (module → list → record), a `recentEntities` store (localStorage), list-context-aware prev/next record navigation, and ⌘-click → new tab (free once context lives in the URL per §2a-c). Individually small; together they're the "never feel lost" layer. ([breadcrumbs.js](https://github.com/frappe/frappe/blob/develop/frappe/public/js/frappe/views/breadcrumbs.js)) **Effort: M total · Value: med.**

> **The one idea to internalize:** `route_options` = "carry context through navigation via the URL." Every pattern above is a special case. Build a tiny `$lib/nav/linkTo(entity, params)` helper that produces these URLs and a `readPrefill(url)` for `load` functions, and 2a/2b/2c/2d all share it.

---

## 3. Naming series — human-readable IDs ⭐ (cheap, universally wanted)

Today `sales_orders`/`support_issues`/contacts are UUID-only — nobody can say "ticket 42 over the phone." ERPNext gives every record `SO-2026-00001`, `TKT-2026-00042` via per-prefix counters that **reset by year for free** (the counter key is the *rendered* prefix). ([naming.py](https://github.com/frappe/frappe/blob/develop/frappe/model/naming.py))

**Port (better than ERPNext here):** ERPNext uses a two-step `SELECT FOR UPDATE` + `UPDATE`; Postgres lets us do it in **one atomic statement** —
```sql
INSERT INTO naming_series_counters (org_id, prefix, n) VALUES ($org, $prefix, 1)
ON CONFLICT (org_id, prefix) DO UPDATE SET n = naming_series_counters.n + 1 RETURNING n;
```
One `naming_series_counters` table + a `human_id text` column per entity (nullable, additive, org-unique). **Effort: Low · Value: high.** The #1 operational quality-of-life item; pairs perfectly with the awesomebar (search by `TKT-2026-00042`).

---

## 4. Workflow engine — configurable state machine with role-gated transitions

We hardcode transitions in each service (issue open→resolved, order draft→confirmed→invoiced, lead lifecycle). ERPNext externalizes this: a `(from_state, action, to_state, allowed_role, condition, allow_self_approval)` table + a runtime that surfaces only the transitions your role permits and logs every move. ([model/workflow.py](https://github.com/frappe/frappe/blob/develop/frappe/model/workflow.py))

**Verdict:** worth it once you want **approvals / role-gating / self-approval prevention / an audit of who changed status** — exactly what support escalation and order confirmation need. The lazy version: `workflow_defs` + `workflow_transitions` + reuse the §1a `doc_audit_log` as the transition log; **skip** the global state registries, the submit/cancel `docstatus` concept, and the visual builder. Transition buttons render from `getAvailableTransitions(role)`. **Effort: M (2-3 days) · Value: high** — it removes status logic scattered across API routes and centralizes permission. Defer `condition` eval until a concrete case appears (keep the column).

---

## 5. Recurring / membership (Auto Repeat + Subscription)

For FACES-style recurring treatments/memberships, ERPNext has two layers: **Auto Repeat** (clone any doc on a schedule via `next_schedule_date`) and **Subscription** (plans, billing interval, proration, trial, grace, 7-status machine). ([auto_repeat.py](https://github.com/frappe/frappe/blob/develop/frappe/automation/doctype/auto_repeat/auto_repeat.py) · [subscription.py](https://github.com/frappe/frappe/blob/develop/erpnext/accounts/doctype/subscription/subscription.py))

**Port (lazy):** a `membership_plans` + `memberships` (with `next_cycle_date` cursor) + `membership_cycles` (idempotency log) set, driven by the **cron we already run for reminders**. On each due cycle: spawn the next `sched_booking` (reuse `createBooking`) + optionally a `sales_order`; the existing reminder agent then handles confirmations automatically. Skip auto-invoicing (SUSII is read-only) — write the cycle, let the front desk bill. **Effort: M (2-3 days MVP) · Value: med-high for a membership business.** The key reuse: the reminder cron + bookings already handle everything *after* the cycle fires; only the enrollment table + cursor-advance is new.

---

## 6. What to skip (this round)

- **`_comments` denormalized cache**, the global Workflow-State / Action-Master registries, `docstatus` submit/cancel, weighted-distribution assignment, the visual workflow builder, business-calendar-aware dates — all ERPNext scale/legacy machinery our Postgres+RLS+cron stack doesn't need.

---

## 7. Recommended order (value × laziness)

| # | Pattern | Effort | Why this slot |
|---|---|---|---|
| 1 | **`+New` from Connections + count→list audit** (§2b, §2c) | S | Finishes the panel we already shipped; pure URL params; instant "one system" feel |
| 2 | **Naming series / human IDs** (§3) | S | Cheap, universally wanted, pairs with search |
| 3 | **`fetch_from` party auto-fill** (§2a) | M | Biggest data-entry efficiency win; leverages the party spine |
| 4 | **Polymorphic activity + audit timeline** (§1a) | M | Threaded support replies + field audit everywhere; one reusable component |
| 5 | **Awesomebar / command palette** (§2d) | M-H | Biggest "feels fast" upgrade; reuses Fuse.js + prefill URLs |
| 6 | **Generic notification rules** (§1b) | M | Generalize the reminders agent to any-event |
| 7 | **Assignment work-queue** (§1c) | M | Auto-assign + per-user queue for tickets/leads |
| 8 | **Workflow engine** (§4) | M | When approvals/role-gating matter |
| 9 | **Membership/recurring** (§5) | M | When FACES wants recurring treatments |

skipped: building any of it this turn — this is the recon. The top 3 are all "small" and compound; #1+#2 together are roughly a day and make the whole suite feel connected. Say the word and I'll start at the top.
