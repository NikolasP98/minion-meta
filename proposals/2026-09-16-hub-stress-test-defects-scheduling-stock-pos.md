---
id: 2026-09-16-hub-stress-test-defects-scheduling-stock-pos
title: Hub stress-test defects — scheduling, stock, POS (3-agent QA stack pass)
status: draft
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub]
tags: [permissions, auth, logic, ui, data, test]
---

# Hub stress-test defects — scheduling, stock, POS

## 1. Context

Three `bowser` QA agents ran concurrently against the local QA stack
(`http://127.0.0.1:5199`, hub `master a4805923` + PR #281 branch) between
2026-09-16 16:59Z and 18:20Z, each on its own isolated `playwright-cli`
Chromium session and its own persona, all against the same seeded org ("QA
Business Org") at the same time:

- **Scheduling** — `minion_hub/docs/qa-scenarios/scheduling.md`, S1–S11
  (S7–S9.1/S11 deprioritized for time). Full report:
  `~/.cache/claude-tmp/qa-stack/qa-report/scheduling/REPORT.md`.
- **Stock** — `minion_hub/docs/qa-scenarios/stock.md` (inferred from the K-series
  numbering), K1–K11 (K7 deprioritized). Full report:
  `~/.cache/claude-tmp/qa-stack/qa-report/stock/REPORT.md`.
- **POS** — `minion_hub/docs/qa-scenarios/pos.md`, P1–P6, P8, P12 (P2.4/2.5,
  P9.1, P10 partial; P7, P9.2, P11 not run for time). Full report:
  `~/.cache/claude-tmp/qa-stack/qa-report/pos/REPORT.md`.

All three agents drove seed matrix v1 (the same matrix documented in
`specs/2026-09-16-hub-local-qa-stack-spec.md`). Coverage was intentionally
overlapping at the boundaries (POS packages/plans/scheduling handoff, stock
consumption via a POS sale) so cross-module data flows were exercised, not
just each module in isolation. Every report explicitly calls out where one
agent's writes touched another's fixtures, and none of the three touched
production or any host besides `127.0.0.1:5199`.

This is the **second** pass on this stack. The first pass produced
`proposals/2026-09-16-hub-qa-stack-first-pass-defects.md` (10 defects, D1–D10);
its D1 and D2 are now fixed by hub PR #283 — see the "Status 2026-09-16
(later)" section appended to that file. Two of its defects (D4, D8) are
independently confirmed and found to be **broader** than originally filed by
this pass's POS report; those are folded into the POS table below rather than
re-numbered.

## 2. Defects by module

Severity as reported by each agent: **High** = money/data wrong or a flow is
impossible · **Medium** = wrong behaviour with a workaround · **Low** =
cosmetic/UX. Evidence paths are relative to
`~/.cache/claude-tmp/qa-stack/qa-report/<module>/`.

### 2.1 Scheduling (12 defects)

| # | Sev | Where | What | Evidence | Cause / pointer |
|---|---|---|---|---|---|
| D1 | High | Booking detail drawer, `requires-confirmation` bookings | A pending booking can only be forced to completed/no-show/cancelled from the UI — there is no Accept/Confirm or Reject action anywhere, though the API supports both (`PATCH .../bookings/<id> {"status":"accepted"}` → 200). | `s3-03_pending-drawer.png`, `s3-03_reject-status-history.png` | UI gap only; backend transition works. |
| D2 | High | Calendar drag-reschedule / resize on a 409 conflict | Dropping or resizing onto an occupied slot opens a "Confirm reschedule" dialog, the user clicks Save, the API returns `409 Conflict`, and the UI just snaps back with **no toast, inline error, or dialog** — a user not watching the pixels believes the move succeeded. | `s4-01_drag-confirm.png`, `s4-02_resize-overlap.png`, `s4-02_resize-result.png` | Silent-failure pattern (§3). |
| D3 | High | `/en/scheduling/links` (New link), `/api/scheduling/event-types` | Org **owners and admins** get `403 {"message":"Admin access required"}` creating a link or event type; no error shown in the UI. | `s6-01_new-link-form.png`, `s6-01_link-create-attempt.png` | `src/routes/api/scheduling/links/+server.ts:28` calls `requireAdmin(locals)`; `src/server/auth/authorize.ts:19-23` checks the **platform** role (`user.role !== 'admin'`), not the org role, so every normal tenant owner fails. |
| D4 | High | Public booking API (`/api/scheduling/public/<slug>/{slots,book}`) | Anonymous requests get `401 {"error":"Authentication required"}`; an authenticated session against the same URL gets `404 link or service not found` (i.e. the handler does run once past auth). A public booking link can never be used by an anonymous visitor. | `s6-02_expired-link.png` | `src/routes/book/[slug]/+page.svelte:106,135,159` fetches these endpoints from the browser; `src/hooks.server.ts:290-300` (`API_HANDLER_AUTH_PATHS`) does not list `/api/scheduling/public`, even though the comment at `hooks.server.ts:384` asserts the anonymous path is excluded. End-to-end not provable because D3 blocks creating an active link to test against. |
| D5 | Medium | Booking detail drawer, `rescheduledFromId` | `GET /api/scheduling/bookings` returns `rescheduledFromId` for a rescheduled booking, but the drawer never renders a "rescheduled from" row/link. | `s4-03_rescheduled-from.png` | Stored, not surfaced. |
| D6 | Medium | `POST /api/scheduling/bookings` rejection message | Four different rejection causes (before hours, after hours, overlap, off-grid-but-free) all return the identical `409 {"message":"slot unavailable"}`. | — | No reason code in the response. |
| D7 | Medium | Cancel action on a recurring series booking | Cancel fires immediately with no confirmation and no scope choice ("this / this and following / whole series"), even though the backend supports `scope:'one'\|'following'` (`src/routes/api/scheduling/bookings/[id]/+server.ts:61`) and it works via API. | `s5-01_cancel-series-occurrence.png`, `s5-02_series-cancelled.png` | Only the implicit `scope:'one'` is reachable from the UI. |
| D8 | Low | Calendar event chips at 390 px | Truncated chip text has no `title`/`aria-label`; the only way to read the full text is the pointer-only hover card. | `s1-05_390px-day.png` | A11y + mobile gap. |
| D9 | Low | `PATCH /api/scheduling/bookings/<id>` on a `completed` booking | Accepts `{"status":"cancelled"}` with `200`, flipping a completed booking to cancelled with no guard; the UI correctly hides Cancel for completed rows so the protection is presentation-only. | — | Cancel path has stock/redemption side effects and should be a deliberate product decision either way. |
| D10 | Low | `/book/<expired-slug>` | Renders a generic "Page not found · Error 404" instead of an "this link has expired" message. | `s6-02_expired-link.png` | Missing expired-state page. |
| D11 | Medium | `/en/scheduling/bookings/new` as `viewer` | The whole "New appointment" form (service/date/client/tags/Confirm) renders for a read-only viewer; only the final `POST` is correctly rejected (403). The Appointments list correctly strips all write actions for this role — the `new` route has no matching view gate. | `s9-02_viewer-new-booking.png`, `s9-02_viewer-bookings-list.png` | Route-level gate missing on `bookings/new`. |
| D12 | Medium | Calendar Month view with a busy day | No "+N more" overflow: 18 bookings on one day expand that week's row to ~450 px, and empty weeks around it inherit the same row height — a real 25–40 booking day would make Month view unusable. | `s10-01_month-plusN.png`, `s10-01_month-overflow.png` | Scenario technically passes (accepts "+N or show all") but does not scale. |

### 2.2 Stock (11 defects)

| # | Sev | Where | What | Evidence | Cause / pointer |
|---|---|---|---|---|---|
| D-1 | High | `POST /api/stock/entries` (receipt) with `rate:0` | Accepted and posted with no warning: 20 @ 6.00 (S/120.00) + 5 @ 0.00 → 25 @ **S/4.80**, a 20% valuation write-down from an empty field. Adjustments already enforce a non-zero rate; receipts don't. | `K2-3a_rate-zero-accepted.png` | Rule exists on the adjustment path, missing on the receipt path. |
| D-2 | Medium | `POST /api/stock/entries/from-invoice` with a malformed `invoiceId` | Returns `500 Internal Error` instead of a readable 400/404, both for a made-up id and for the scenario's real-invoice case/whitespace variant. | `K3_entries-list-all.png` | `createIssueFromInvoice` canonicalises `warehouseId`/`itemId` (`src/server/services/stock.service.ts:1769`) but passes `input.invoiceId` straight into `eq(finInvoices.id, …)` unvalidated/untrimmed — the trimming intent already exists for the dedupe path, just not applied here. |
| D-3 | High | `/en/stock/entries/new?type=adjustment` | The adjustment line table has **no Rate column** at all, so every positive ("found-stock") adjustment is refused in the UI (`400 a positive (found-stock) adjustment requires a rate`); the only way to post one is the API. | `K5-2_adjustment-no-rate-field.png` | Missing form field for a real backend requirement. |
| D-4 | Low | `409 negative_stock` error body | Names raw UUIDs for item/warehouse, never the item name, warehouse name, or available quantity. | `K3-4a_over-issue-error.png` | Unreadable to a stock clerk. |
| D-5 | Low | Receipt of `0.001` qty on a `unit`-uom item | Accepted verbatim, no rounding/warning; contributes to the 16-significant-digit valuation drift in D-8. | `K2-3c_fractional-accepted.png` | No uom-aware quantization. |
| D-6 | Medium | `/en/stock/items` list | No on-hand column and no low-stock flag (Overview page has both); no warehouse filter anywhere in Stock. | `K1-1_items.png`, `K1-2_entries.png` | List surfaces under-serve the module; per-warehouse questions require opening one item at a time. |
| D-7 | Medium | Item detail / edit pages, recipe components | `GET /api/stock/items/<id>/components` returns the seeded optional child, but no UI (detail or edit) renders a components/recipe section — can't be seen, toggled, or issued. | `K6-1_recipe-parent.png` | No UI surface for an existing API capability. |
| D-8 | Low/Medium | Ledger `valuation_rate` / `value_delta` storage | Persisted unrounded to 16 significant digits and drifting between rows for the same economic rate (`4.102265211640211` vs `4.10226521164021`). Invisible in the UI (rounds to 2dp) but compounds in stored value. | `K9-2_ledger-after-15-entries.png` | Needs a decision on the currency scale for these columns. |
| D-9 | Medium | `GET /api/stock/items`, `GET /api/stock/bins` as `staff` | Both return `200` with the full catalog and every bin's quantity + valuation rate, while `/en/stock` itself is `403` for the same role. Module gating is enforced on the page route, not the read endpoints. | `K10-1_staff-stock-403.png` | Authorization leak — inventory levels and costs reach a role the product excludes from the page. |
| D-10 | Medium | Role/permission matrix — staff vs. viewer on Stock | **Inversion:** `staff` (higher role) is denied `/stock` (403), `viewer` (lower role) gets full read access (200, complete Overview). One of the two grants is wrong. | `K10-1_viewer-stock.png`, `K10-1_staff-stock-403.png` | RBAC config bug, same root surface as D-9. |
| D-11 | Low | `/en/stock` for a two-orgs user in the business org | Renders a 403 "You do not have access to this module" page; K11 expected 404/redirect. Nav-hiding half is correct. | `K11_two-orgs-stock.png` | Cosmetic/contractual mismatch. |

### 2.3 POS (16 defects — includes two carried-forward confirmations)

| # | Sev | Where | What | Evidence | Cause / pointer |
|---|---|---|---|---|---|
| D-N5 | High | `/en/pos/sell` line discount (`%` toggle) | A discount larger than the line is accepted uncapped: 999 on an 80.00 line → line **−S/919.00**, cart **−S/849.00**, "Charge" opens the payment step with a negative total; only blocked incidentally by "Payments exceed the total". A negative value on the *price-override* field is correctly rejected, this path is not. | `11_p2-line-discount-over.png`, `12_p2-negative-total-charge-step.png` | No clamp on the discount input. |
| D-N10 | High | POS post-sale "Schedule the services" step, walk-in (no client) sale | Customer area renders as two inert `<p>` captions ("Walk-in", "Search an existing CRM contact…") with nothing clickable; "Confirm booking" stays permanently disabled even with a slot picked. A walk-in service sale can never be scheduled from this step. | `19_p8-schedule-step.png`, `20_p8-booking-confirmed.png` | Client picker not wired for the no-client case; works when a client is on the ticket. |
| D4 (confirmed, broader) | High | `/pos/accounts`, POS client selection | Selecting an **existing** CRM contact in POS (no quick-add needed) writes `partyId` + `customerName` and leaves `crmContactId` null, so `/pos/accounts` lists the same person **twice** — a `party:…` row (new grant, pending scheduling) and a `contact:…` row (seeded grants/plans) — merged only in the drawer, not the list. New sales and pending services don't appear on the client's real account row. | `29_p10-accounts-split-rows.png`, `46_p5-package-sold.png` | Originally filed against the DNI quick-add path only (first-pass D4); confirmed here to reproduce with zero quick-add involvement. |
| D8 (confirmed) | Medium | Accounts drawer / sell panel "Pay instalment" | Prefills the cart line with the **whole remaining balance** (S/300 on an untouched 3×100 plan, S/200 after one payment), never the next instalment (S/100 per the plan's own `dueSchedule`). Editable, so a cashier who doesn't retype the amount over-collects. | `57_d8-pay-instalment-prefill.png`, `59_d8-prefill-after-one-payment.png` | Prefill uses `total_amount - paid`, not `due_schedule[next].amount`. |
| D-N9 | Medium | Sell panel plan list | Cancelled and settled plans still show a remaining balance and an enabled "Pay instalment" button (cancelled: S/250, settled: S/200 on one plan, S/0 on the tester's own settled plan). | `48_p6-plans-panel.png`, `63_p6-settled-plan-hidden.png` | `remaining` is computed from linked tickets only, ignores plan status. |
| D-N4 | Medium | Line discount field | Toggled by a `%` icon but the value is an **absolute amount**: `10` on an 80.00 line makes it 70.00, not 72.00; no `%`/`S/` marker on the field. | `10_p2-line-discount-10.png` | Mislabeled control. |
| D-N7 | Medium | Card tender panel | Reducing the card **amount** to 100 while tendered stays 240 shows "Change: S/140.00" and "Remaining S/140.00"/"Change due S/140.00" simultaneously — telling the cashier to both hand back and collect S/140.00. | `25_p3-split-card100.png` | Tendered not re-synced when amount changes. |
| D-N8 | Medium | Void action on a closed-shift ticket | Server correctly refuses (`409 {"error":"shift is closed"}`), but the UI shows **no toast, no error, no state change** on click — indistinguishable from success. | `69_p4-void-closed-shift.png`, `70_p4-void-closed-shift2.png` | Silent-failure pattern (§3). |
| D-N12 | Medium | Shadow SUNAT emission | `GET /api/pos/settings` reports `emission {mode:"shadow", docTypeDefault:"03"}`, but every ticket checked has `emissions: []` — no serie/correlativo is ever allocated despite seeded series existing. | `18_p3-sale1-result.png`, `73_p12-oversell-result.png` | Emission allocation not firing in shadow mode. |
| D-N13 | Medium | `/pos/accounts` "Active packages" column | Counts **all** grants regardless of status: shows 5 for a client with 3 active + 1 exhausted + 1 expired + 1 cancelled (drawer labels each correctly). | `29_p10-accounts-split-rows.png` vs `47_p5-accounts-drawer-grants.png` | List aggregate doesn't filter by status. |
| D-N11 | Low/Medium | `/pos/accounts` "To schedule" counter | A package-only sale (no service line) increments "To schedule" from 1 to 2. | `46_p5-package-sold.png` | Package lines miscounted as schedulable. |
| D-N1 | Low | POS home shift banner | Never shows the opening float (API has it: `openingFloat {cash:200}` / `{cash:100}`). | `01_pos-home.png`, `72_p1-shift-opened.png` | Field not rendered. |
| D-N2 | Low | Shift history row, right after close | Reads "Open" with no close time until a full page reload; rows never list tickets or per-method tenders. | `67_p1-shift-history.png`, `68_p1-shift-history-reload.png` | Stale client cache. |
| D-N14 | Low | Accounts drawer, SESSION PACKAGES name column | Package names wrap one character per line at both 1280 px and 390 px; right-hand values clip at 390 px. | `52_p6-open-plan-form.png`, `77_p10-390px-drawer.png` | Column width not allocated to the name field. |
| D-N6 | Low | Post-sale flow | No receipt/confirmation screen — jumps straight to scheduling; stored payment has `tendered` but `change: null` (not persisted). | `18_p3-sale1-result.png` | Missing receipt view + unpersisted field. |
| D-N3 | Low | Open-shift dialog | Asks for an opening float for Tarjeta and Crédito too, which is meaningless. | `71_p1-open-shift-dialog.png` | Cosmetic. |

**39 defects total: 9 High, 19 Medium, 11 Low** (Scheduling 4/5/3, Stock 2/6/3, POS 3/8/5 by these buckets).

## 3. Cross-cutting patterns

These recur across two or more modules and are worth fixing once rather than
per-module:

- **`requireAdmin` checks the platform role, not the org role** — Scheduling
  D3. `src/server/auth/authorize.ts:19-23` throws 403 unless
  `user.role === 'admin'` at the **platform** level; it is used to gate
  `POST /api/scheduling/links` and `POST /api/scheduling/event-types`, so an
  org **owner** (and an org **admin**) — the only two roles a real tenant has
  — can never create a scheduling link or a new service. This is the same
  shape of bug as the RBAC inversion below: authorization is checking the
  wrong dimension of "who this user is."
- **The public booking API is gated behind session auth** — Scheduling D4.
  `src/hooks.server.ts:290-300` (`API_HANDLER_AUTH_PATHS`) does not list
  `/api/scheduling/public`, so every anonymous request to
  `/api/scheduling/public/<slug>/{slots,book}` gets 401 before the route
  handler runs — even though a comment at `hooks.server.ts:384` claims this
  path is excluded. Combined with D3 (can't create an active link at all),
  the entire public-booking-link feature is currently unusable end to end.
- **The party/contact split** — POS D4 (confirmed, broader than filed).
  Selecting an existing CRM contact from the POS client picker writes
  `partyId` and leaves `crmContactId` null; `/pos/accounts` then shows two
  rows for one person, and new packages/pending-scheduling land on the row
  the client doesn't normally see. No quick-add path is required to trigger
  it — this is the general POS write path, not an edge case.
- **RBAC inversion in Stock** — D-9/D-10. `staff` (intended higher trust) is
  denied the `/stock` page (403) while `viewer` (intended lower trust) has
  full read access, and the two read endpoints backing the page
  (`/api/stock/items`, `/api/stock/bins`) aren't gated at all — any
  authenticated role, including the one denied the page, gets 200 with full
  catalog + valuation data. Same category of bug as `requireAdmin`: the
  authorization check is on the wrong surface (page vs. API) and possibly
  the wrong role entirely.
- **Silent-failure pattern on write conflicts** — three independent
  instances: Scheduling drag/resize on a `409` (D2, chip snaps back with zero
  feedback), POS void on a closed shift's `409` (D-N8, click does nothing
  visible), and Scheduling link creation on a `403` (D3, "New link" just
  doesn't create a row). In all three the server response is correct and the
  client already receives it — nothing surfaces it to the user. One shared
  fix (a toast/inline-error wrapper on failed mutation calls) would close all
  three at once rather than three point patches.

## 4. Seed matrix gaps found

Reported to be closed on a hub branch already in flight (see hub PR #281):

- **`QA Staff Madrid` has no `sched_schedules` row** — zero availability on
  any slot query; blocked Scheduling S2.2 (Madrid timezone rendering), S3.1
  (round-robin alternation — all 3 bookings landed on Lima because Madrid was
  never a candidate), and weakened S3.2.
- **`QA Treatment Room` and `QA Laser Machine` are attached to no event
  type and no schedule** — both appear as resource-filter/column entries but
  neither can ever be booked (Scheduling S2.5).
- **A fully-linked booking (`sched.booking.fully-linked`) carries a
  `package_grant_id` with no matching redemption row to reverse** —
  Scheduling S5.3 could only prove the cancel-reversal logic by creating and
  cancelling a fresh redeeming booking on the same grant (used 3→4→3). The
  same shape of gap shows up in POS: `TKT-POS-TICKET-CREDIT-TENDER` carries a
  `credit 80.00` payment with no matching redemption row, making POS P4.2's
  void-reversal check on that seeded ticket inconclusive.
- **`org.business` has no yape/plin/transfer tender methods and no card
  surcharge configured** — `GET /api/pos/settings` returns only
  cash/card/credit; POS P3.2's split-tender-with-surcharge scenario is
  untestable as written against this org.
- **Scenario coverage reporting double-counts one registration** — the
  seed-matrix coverage summary for this pass printed 169/168 (more scenarios
  covered than exist), which is a duplicate registration in the coverage
  accounting rather than a real extra scenario.

## 5. What held up

- **Valuation engine is exact.** Every moving-average computation Stock
  checked matched to the cent across receipts, adjustments, transfers, and a
  POS-driven consumption sale (10@5+10@7→6.00; +3@6.50→6.10; preserved on a
  −4 issue; two-item consumption product decremented exactly 2.5 ml / 1 unit
  from the same stock entry).
- **Shift arithmetic is exact.** Every POS shift delta matched the summary to
  the cent across voids, splits, credit, and a 20-sale concurrent batch
  (660→560→480 on voids; +150, +240, +100, +120, +400, +100×3, then a clean
  990.00 after the volume batch).
- **Concurrency guards hold everywhere they were tried.** Stock: two
  simultaneous submits against 10 on hand → one 200, one 409, on-hand 4, not
  negative. POS: parallel grant-redeem on a 1-session grant → one 201, one
  409 `package_exhausted`; 20 concurrent ticket submits all succeeded,
  sequential human ids, no gaps. Scheduling: two contexts posting the same
  slot → one 200, one 409, calendar shows exactly one booking.
- **Availability edges are correctly enforced.** Scheduling: before-hours,
  after-hours (60-min type ending past close), Saturday, a date-override
  day-off, and same-resource overlap are all refused with 409; a
  60-min-ending-exactly-at-close booking is correctly accepted.
- **Performance:** the API itself is fast — Scheduling's 18 sequential
  booking creates via `POST /api/scheduling/bookings` averaged **~260 ms
  each**. The slowness is entirely client-side: dev-server navigation to
  `/en/scheduling/calendar` took **3.8 s warm at 1280 px and 8.7 s warm at
  390 px** — consistently ~2x at the narrow viewport, over the stated 3 s
  threshold either way. (Dev-server-only; not a statement about a production
  build.)

## 6. Proposed fix order

1. **Platform-role auth bugs** — fix `requireAdmin` in
   `src/server/auth/authorize.ts:19-23` to check the org role for scheduling
   links/event-types (Scheduling D3), and add `/api/scheduling/public` to
   `API_HANDLER_AUTH_PATHS` in `hooks.server.ts:290-300` (Scheduling D4).
   **DoD:** an org owner can create a scheduling link and an event type from
   the UI; a logged-out browser can load slots and complete a booking through
   an active public link.
2. **Money-integrity guards** — reject/clamp a POS line discount that exceeds
   the line total instead of letting the cart go negative (POS D-N5), and
   require `rate > 0` on stock receipts, matching the rule adjustments
   already enforce (Stock D-1).
   **DoD:** a discount larger than the line is refused before it reaches the
   payment step; a rate-0 stock receipt is refused (or requires an explicit
   confirmation) instead of silently posting.
3. **Stock RBAC inversion** — correct the `staff`/`viewer` module grant so
   staff can view Stock read-only and viewer cannot, and gate
   `/api/stock/items` + `/api/stock/bins` behind the same `stock:view` check
   as the page (Stock D-9, D-10).
   **DoD:** `staff` gets a working read-only `/stock` page; a role without
   `stock:view` gets 403 from both read endpoints, not just the page.
4. **Walk-in scheduling from POS** — wire the post-sale "Schedule the
   services" step's client area for a ticket with no client on it (POS
   D-N10), and root-cause why `emission.mode:"shadow"` never allocates a
   serie/correlativo (POS D-N12).
   **DoD:** a walk-in (no-client) service sale can be scheduled from the
   post-sale step; a shadow-mode ticket has a non-empty `emissions[]` entry.
5. **Silent-failure UI pattern** — add a shared error surface (toast or
   inline) for the three known-silent write failures: Scheduling
   drag/resize 409s (D2), POS void-on-closed-shift 409 (D-N8), and
   Scheduling link-creation 403 (D3, once slice 1 lands the happy path, this
   still needs a failure path for any other 403/409 on that form).
   **DoD:** all three flows show a visible error message when the mutation
   is rejected; no more "the UI reverted with nothing said."

Not included above (left for the modules' own follow-up proposals): D5/D6/D7
(Scheduling booking-flow UX), D-3/D-6/D-7/D-8 (Stock UI/data-quality gaps),
and the remaining POS Low/Medium cosmetic items (D-N1/2/3/4/6/7/9/11/13/14) —
none block a core money or scheduling path the way the five items above do.
