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

## Added by S0 (hub `feat/collection-points`, 2026-10-24)

9. **Public `/d/` pages render client-side only.** The hub root layout sets `ssr = false` (`src/routes/+layout.ts:17`), so `/d/<slug>` ships an empty shell to crawlers. S5's FAQ JSON-LD in `<svelte:head>` is therefore invisible to engines that do not run JS. Needs `export const ssr = true` on `/d/[slug]` plus proof that the root layout tolerates SSR. `TODO(handoff)` in `src/routes/d/[slug]/+page.server.ts`.
10. **Counters and funnel use UTC days.** `doors.service.ts` buckets `crm_door_stats_daily.day` and the "new contacts" window by UTC day, not the org's business timezone (`zonedDayWindow`). Acceptable for approximate counts; fix before anyone reconciles them against POS days. `TODO(handoff)` at `utcDay`.
11. **Owner decision for item 4 (orchestrator default, flagged to the owner 2026-10-24):** door submissions may hold clinical free text, so **reading them is owner/admin only**. S2 must gate `GET /api/crm/doors/[id]/submissions` on `crm:manage` (not `crm:view` as FR-007 says) and hide the Submissions panel from other roles. S0 defines no submissions guard.
12. **UI-audit capture fixtures.** `public-door` points at the QA-seed slug `qa-intake`; `scripts/ui-audit-seed.ts` does not provision a door, and `/crm/doors/[id]` captures with a non-uuid `audit-door` param (the 404 state). Add a door to the ui-audit seed when the capture harness next runs. `TODO(handoff)` in `capture-fixtures.ts`.
13. **Central write gate for `POST /api/crm/doors` is `crm:edit`** (the path is not in `CREATE_COLLECTION_ENDPOINTS`); the handler then requires `crm:manage`, so the effective gate is correct. Add the path to `CREATE_COLLECTION_ENDPOINTS` only if `crm:create` semantics are wanted.

## Added by S1–S6 and the live checks (2026-10-25)

14. **Public not-found pages answer HTTP 200.** With `ssr = false`, `/d/<missing>` and `/book/<missing>` render the not-found state from `__data.json` (404) but the document itself is 200. Crawlers and uptime checks see a live page. Fixed by the same SSR work as item 9.
15. **Booking page subtitle is English on `/es/`.** "Choose a service and reserve an available time." on `/es/book/<slug>` (pre-existing string, not S1). Move it to Paraglide.
16. **Form-door rate limit is per lambda instance.** S2 keeps a 5-per-minute window in memory (marked `shortcut:` in code). On Vercel each instance has its own window. Move to Valkey or a DB counter before a high-traffic door. Editor default field labels are Spanish only.
17. **Follow-up gaps (S4).** (a) A staff message sent after the submission does not cancel the follow-up. (b) If the WhatsApp send succeeds but the timeline insert fails, the row shows "failed". (c) The prod jobs crontab cadence may be 30 min, not the manifest's 10 (netcup change 2026-10-12), so messages can go out up to 30 min late. Verify on the box. Past leads are never messaged: only submissions after `follow_up.enabledAt` qualify.
18. **Offer door gaps (S6).** `fin_products` has no description, so items show name, category and price only. A booking link whose scheduling module is off still renders "Reservar".
19. **Next-offers ranking is unproven on real volume.** S3's ranking SQL was only asserted on text in unit tests; the live check caught an array-binding bug (fixed). Add a `*.sql.integration.test.ts` against the QA DB (never prod; see the `HUB_TEST_DB_URL` guard).
20. **FAQ drafting happy path untested with a real model key.** `dev:local` blanks `OPENROUTER_API_KEY`; only the 503 "IA no configurada" path was proven live.
