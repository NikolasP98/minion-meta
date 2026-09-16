---
id: 2026-09-16-hub-qa-stack-first-pass-defects
title: Hub QA stack — defects from the first seeded UI pass (POS packages/plans, RBAC, settings, calendar)
status: draft
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub]
tags: [permissions, logic, ui, test]
---

# Hub QA stack — first seeded UI pass: defects and follow-ups

Source: the S5 run of `specs/2026-09-16-hub-local-qa-stack-spec.md` — a bowser QA agent drove 12 user stories against the local QA stack (`http://127.0.0.1:5199`, seed matrix v1, hub `feat/hub-local-qa-stack` on top of master `2ffbf0b6`). 38 steps passed, 8 failed, 4 were blocked. Full report with 125 screenshots: `~/.cache/claude-tmp/qa-stack/qa-report/REPORT.md`. None of this touched production; every defect below reproduces on the seeded stack with the named persona and matrix id.

## Defects

| # | Sev | Where | What | Cause / pointer |
|---|---|---|---|---|
| D1 | **Critical** | `/en/pos/sell` as `tenancy.user.viewer` | Page renders fully; products add to the cart and "Charge S/ 80.00" enables. No 403, no redirect, no console error. Viewer is correctly read-only on `/crm/customers`. | `src/lib/routes/route-access-registry.ts:132` gates the whole `/pos` prefix on `pos:view`; `pos.sell` is a `MODULE_SUBRESOURCES` row (`:54`) but the page has no create-level policy. Fix: `/pos/sell` → `org-capability:pos:pos.sell` (or `pos:create`), and add a `modules-rbac.test.ts` case that every POS write page requires more than `pos:view`. Also confirm `POST /api/pos/tickets` rejects the viewer server-side (the agent enabled the button; it did not assert the submit). |
| D2 | High | `PUT /api/pos/settings` | 500 `{"message":"Internal Error"}` when saving `requirements.identityDocument = required`; UI shows no toast, select stays on "Required", stored value remains `off`. Blocked the identity-requirement story. | `src/routes/api/pos/settings/+server.ts:31-41` parses `requirements` fine; the failure is downstream in the settings write — reproduce with the seeded owner and read the server log. Likely the `pos_settings.requirements` upsert path added in `20260915000000` vs the service's update shape. |
| D3 | High | POS quick-add (DNI `12345678`) | Client badge says "In CRM" but `/api/crm/contacts` has no such contact; only a `parties` row exists. | The `widenClient` fix from #278 covers the picker's search/select path; the DNI create path still returns party-only. Root of D4. |
| D4 | High | `/pos/accounts` | The same client appears twice: `party:…` (grants from a live sale, `crmContactId:null`) and `contact:…` (seeded packages + plans, `partyId:null`). The drawer merges both; the list does not. | Accounts are keyed by whichever id the writer had. Fix: one client key derived from `party_id ?? crm_contact_id` with the bridge resolved at read time, and D3 so new sales carry both ids. |
| D5 | High | `/pos/appointments/new` | No "draw from package" control even with a live 1/1 grant on the selected client. Grants can only be drawn from the accounts drawer. | The booking page never received the grant picker; `bookAndLinkTicketLine` exists server-side. |
| D6 | Medium | `/pos/appointments/new` | "Force outside hours (walk-in)" reveals a time field, then Confirm still answers "That time is no longer available." | The override flag is not forwarded to the availability check. |
| D7 | Medium | `/pos/sell` payment step | Only the three tenders are offered; no instalment/plan option although `GET /api/pos/plans` is live. Plans are creatable only from the accounts drawer ("Open plan"), which does work (reached 2/3). | `PlanOpenForm` is mounted in the drawer only. |
| D8 | High | Accounts drawer → "Pay instalment" | Prefills the cart line with the whole remaining balance (S/300 on a 3×100 plan) instead of the next instalment. Editable, so it over-charges quietly. | Prefill uses `total_amount - paid` rather than `due_schedule[next].amount`. |
| D9 | Medium | Calendar hover card | Card closes before the cursor reaches it; reproduced three ways incl. a gradual path. Synthetic CDP mouse moves are discrete, so confirm once with a real trackpad before treating as certain. | Zag Tooltip `interactive` + `closeDelay=320` may be shorter than the gap between event and card at some zoom levels. |
| D10 | Low | `/join` for `user.no-org` | Lands on `/join/sent` ("Request sent") rather than `/join`; acceptable but the seed's pending `join_request` makes the page skip the form. | Seed or expectation, not app. |

## Seed matrix gaps found by the pass (being closed in the same hub branch)

- `sched.booking.series-3` was registered but not visible in either calendar (outside the current week window / no resource availability). Now three future bookings inside the current work week on a staffed resource.
- No `VIP` tag existed, so inherited tag artifacts on events could not be exercised. Added `crm.tag.vip` on `crm.contact.dni-verified`, linked to `sched.booking.fully-linked`.
- The 120-character emoji contact name from spec §4 was missing (longest seeded name was 27 chars). Added `crm.contact.long-name-emoji`.
- 5 of 6 seeded event types had no resources, leaving most of scheduling with zero availability. Every event type now has at least one staffed resource.

## What passed (for the record)

Two-step checkout with change calculation; credit tender including the over-limit refusal; the sell → optional schedule step → `/pos/accounts` pending-scheduling round trip; module switcher defaults per role, collapse/expand hover behaviour; all three gate redirects (onboarding, join, read-only CRM); attachments trash separation; CRM list at 1280 and 390 widths.

## Proposed order

1. D1 (route policy + test) and D2 (settings 500) — small, blocking, same afternoon.
2. D3 + D4 together (one client key; DNI path writes both rows).
3. D8 (instalment prefill) — money path, one-line fix plus a characterization test.
4. D5, D7 (UI entry points for grants and plans in the sell/booking flows) — one slice.
5. D6, D9 — after a trackpad confirmation of D9.
