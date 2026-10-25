---
id: 2026-10-24-hub-collection-points-followups
title: Collection points — open ends deferred from spec 041
status: draft
created: 2026-10-24
updated: 2026-10-24
repos: [minion_hub]
spawned_spec: 2026-10-24-hub-collection-points-spec
tags: [crm, security, data]
effort: M
source: specs/041-hub-collection-points
---

# Collection points: open ends

These were left out of spec 041 on purpose. Each one gets a matching `TODO(handoff)` at its code site when the slice that touches it lands.

1. **Online payment links on offer doors (Culqi / Mercado Pago).** No merchant credentials exist. The S6 CTA site carries `TODO(handoff)`. Needs: a provider choice, credentials in Infisical, a webhook to mark the sale, and reconciliation into POS. Billing-tagged.
2. **Opt-out writer.** Follow-ups (S4) respect `crm_contacts.custom_fields._reminders_opt_out`, but nothing in the hub sets it. Options: a contact-page toggle, or an inbound keyword (BAJA/STOP) in the gateway. It should be renamed to a generic `_messaging_opt_out` with a backfill.
3. **Staff notification on a new form submission.** This could be an inbox rule (`src/server/services/inbox/`, evaluated by `/api/jobs/tick`). Today submissions are only visible in the door's panel.
4. **Submissions retention and clinical-data access.** `crm_door_submissions.payload` can hold clinical answers, and any `crm:view` holder can read free text. Decide a retention period and whether to restrict the panel to `crm:manage`.
5. **FACES intake cut-over.** This is an owner action in the `faces-landing` repo: point `/intake` at the hub door. Mind the DNS hazard (Vercel NS hosts the clinic's Google MX).
6. **`ensureCrmContact` catch inside a transaction.** It swallows a failed insert, but Postgres has already aborted the transaction, so the booking or submission insert that follows fails with a confusing error. Use a savepoint or drop the catch.
7. **Offer CTA click counting.** Offer doors only count views. A beacon endpoint would give clicks.
8. **Origin shown on the contact page.** `first_touch` is stored but not displayed on `/crm/[contactId]`.
