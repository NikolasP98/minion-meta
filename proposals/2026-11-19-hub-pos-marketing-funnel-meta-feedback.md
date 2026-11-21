---
id: 2026-11-19-hub-pos-marketing-funnel-meta-feedback
title: PDV marketing funnel — ad spend to paying customer, LTV/CAC, and results fed back to Meta
status: draft
created: 2026-11-19
updated: 2026-11-19
repos: [minion_hub, minion-meta]
value: 9
effort: L
source: owner-request-2026-11-19
tags: [data, security]
---

# PDV marketing funnel with Meta feedback

## Request

Owner, 2026-11-19: "check if netcup is currently pulling data from meta for the marketing campaign
data. I want to be able to create a CRM funnel through the meta api to retroactively feed meta back
and forth based on data pulled from meta, processed and studied for optimization, and then also
include metadata (like sharing all customers that provided their ig handle and made a treatment
purchase). I want to visualize the funnel and also calculate LTV, CAC and other metrics. This
should be its own page in the pdv section in the FACES org."

## AS-IS (measured 2026-11-19, FACES org, prod, read-only)

### 1. The Meta pull is stalled

- The netcup crontab still fires `health-gated-tick meta` every 30 minutes and logs `meta ok`.
- No Meta job has run since 2026-10-05. Four jobs sit `queued` and are never claimed.
- Cause: the netcup worker (`/opt/minion-hub-cron`, `minion-hub-cron.service`) is a build from
  2026-09-12. Hub #431 (2026-10-04) added the check constraint `meta_sync_jobs_lease_state_check`.
  The old build sets `status='running'` without a lease, the database rejects it, and the tick
  still answers 200. Evidence: `/var/log/minion-hub-cron.log`, error code 23514 on every tick.
- Ad data ends 2026-09-12 (30,797 rows, S/242,251 spend since 2024-03-24). Posts and messages end
  2026-10-04.
- The ads job has been stuck since 2026-09-13 with 311,457 rows upserted for a 90-day window that
  normally holds about 1,700 rows. It looped for three weeks before the constraint stopped it. Not
  root-caused.
- The Instagram-login token expired 2026-11-07 (the refresh runs inside the same dead job path).

### 2. Leads and customers are two disjoint sets of contacts

| Fact | Count |
|---|---|
| Leads with an origin (`meta_lead_attribution`) | 5,299 (3,486 ad, 980 organic, 833 unknown) |
| Of those, linked to a CRM contact | 5,299 |
| Of those, linked to a POS purchase | 2 (both organic) |
| POS buyers (distinct contacts, 152 tickets since 2026-10-09) | 95 |
| POS buyers with an Instagram identity | 2 |
| POS buyers with a WhatsApp identity | 14 |
| Instagram identities with a handle | 53 of 13,006 |
| Contacts with `instagram` filled in custom fields | 2 |

An Instagram lead and the person who pays at the desk are separate contact rows. A funnel drawn
today would show 3,486 ad leads and zero ad customers.

### 3. Attribution is a guess, and it stopped in July

All 5,299 attribution rows are `heuristic-icebreaker`. None carries an `ad_id`. The newest is
2026-07-17. The exact (webhook referral) path from spec `2026-07-17-ig-ad-attribution-spec` is not
producing rows. Per-campaign CAC is therefore not computable; only blended CAC is.

### 4. Feeding Meta is manual

- The ad account has hand-uploaded value audiences (`Audiencia_Valor_*.csv`, 2026-11-10 to 11-12)
  and lookalikes built on them.
- No dataset (pixel) is visible on the ad account through the connected Meta tool, so no purchase
  event reaches Meta. Unverified from Business Manager itself.
- The hub's Meta login grants `ads_read` only. Writing audiences needs `ads_management`, which the
  app's login configuration offers but does not request.

### 5. Revenue history exists

`fin_invoices`: 4,401 invoices, S/4.0M, 2023-10-25 to 2026-11-17, 4,394 linked to a client.
`pos_tickets`: 152 tickets, S/117,230, all linked to a party. A ticket can carry
`invoice_provider_ref`, so summing both tables double-counts.

## TO-BE

1. Meta data is at most one day old, and a job that cannot run raises an alert.
2. One person is one contact: the Instagram or WhatsApp lead and the paying customer are the same
   row once they are matched.
3. `/pos/funnel` (PDV section) shows, for a date range:
   impressions → clicks → conversations started → leads → appointment booked → attended →
   first purchase → repeat purchase, with the conversion rate between each pair.
4. The same page shows CAC, LTV, LTV:CAC, ROAS, payback time, and average ticket, by month of
   first contact. Per-campaign once exact attribution exists.
5. Meta receives results automatically: purchase and appointment events for leads that came from
   an ad, and a customer audience weighted by value that replaces the CSV uploads.

Invariants:

- Nothing is sent to Meta for a customer without recorded consent.
- Every send is logged per customer and per event, and can be listed.
- Revenue counts each sale once.
- A metric with no trustworthy input shows "not enough data", never zero.

## DELTA

| Slice | Change | Proof |
|---|---|---|
| S0 Restore the pull (ops) | Redeploy the netcup worker from current master. Root-cause the ads loop. The tick returns non-2xx when every claim fails. Alert when a job is queued for more than 24 h. Reconnect Instagram. | `max(date)` on `meta_ad_insights` is yesterday; a forced claim failure turns the cron log line from `ok` to an error. |
| S1 Match leads to customers | Match by phone first (1,706 customers have `telefono`; WhatsApp identities are phone numbers). Ask for the Instagram handle at intake and in the POS customer form. Resolve handles for Instagram senders. Merge matched contacts through the existing cleanup path. | Dry-run report of matches before any merge; a test that a merged contact keeps both identities and all tickets. |
| S2 Funnel page (read-only) | `/pos/funnel` with the stages and metrics above. Blended CAC only. Revenue from one deduplicated source. | Service tests on a seeded database: each stage count and each metric against hand-computed values. FigCraft as-is/to-be. |
| S3 Exact attribution | Make the referral webhook path write `ad_id` rows. Per-campaign funnel and CAC. | A replayed referral payload yields a row with `ad_id` and `provenance='webhook'`. |
| S4 Feed Meta | Create a dataset. Send `Purchase` and `Schedule` through the Conversions API for business messaging (Instagram: account id + `ig_sid`; Messenger: page id + page-scoped user id; WhatsApp: `ctwa_clid`). Sync a value-weighted customer audience (hashed phone and email). Consent flag and send log. | Events appear in the dataset's test-events view; audience size matches the consented customer count; a customer without consent is never in a payload (test). |

S2 does not depend on S4. S2 is honest only after S1; before S1 it shows the leads side and the
revenue side with a "not linked yet" gap between them.

## Notes on the Meta side

- An Instagram handle is not a matching key for a customer-list audience, as far as I know; the
  keys are phone, email, name, and similar. The Instagram link is made through `ig_sid` on events.
  Verify against current Meta documentation before S4.
- Conversions API field names above come from Meta's business-messaging guide and parameter
  reference (developers.facebook.com, read 2026-11-19). The guide is about two years old.
- The Instagram-scoped id the hub stores per lead may or may not equal `ig_sid`. Unverified.

## Open decisions (owner)

1. Go-ahead to redeploy the netcup worker (S0). It is a production change.
2. Consent: may FACES send existing customers to Meta, or only those who accept from now on?
   Peru's data-protection law applies; this needs a real answer, not a default.
3. Reconnect Meta with `ads_management` so the hub can write audiences.
4. Page lives in PDV (`/pos/funnel`) as requested; ad data stays in `/socials`.

## Not in scope

Changing budgets or creatives from the hub. Automatic campaign optimisation. Other orgs.

## Status 2026-11-19 (after owner go-ahead)

- S0 done except auto-redeploy: worker redeployed from hub `bcf6f6c0`; ads, posts and messages current as of 2026-11-19; hub PR #690 (honest tick status, redeploy script, cursor regression test) open. Ads loop root cause: pre-#431 cursor restarted a window when its last page spent the slice budget.
- S2 in review: hub draft PR #691, spec `specs/132-pos-marketing-funnel/`.

## Open items (ledger)

- The netcup worker still does not redeploy on merge to hub master. Needs a deploy credential in CI or a pull-based updater on the box.
- Instagram-login connection expired 2026-11-07; the owner must reconnect in `/socials/settings`.
- `/pos/funnel`: not rendered in a browser yet; FigCraft as-is/to-be owed.
- `/pos/funnel`: `sunat-sire` invoices excluded from revenue (`TODO(handoff)` in `pos-funnel.service.ts`).
- `/pos/funnel`: ad spend is shown in the org currency; an ad account in another currency would skew CAC and ROAS.
- `brain-vector-health-controller` on netcup gates on a recent `meta ok` log line; a failing Meta tick now also holds the vector worker down.
