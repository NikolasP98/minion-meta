# IG Ad Attribution — Spec (2026-07-17)

Link every Instagram DM lead to the ad/campaign (or organic origin) that drove it, to measure true ad performance. One canonical schema across **both** collection surfaces: retroactive **backfill** (heuristic) and going-forward **webhook** (exact). Backfill must be shape-identical to what the webhook populates.

## Canonical attribution record — THE CONTRACT

Meta IG Click-to-Direct webhook delivers, on `message.referral`:
```json
{ "ref": "...", "ad_id": "...", "source": "ADS", "type": "OPEN_THREAD",
  "ads_context_data": { "ad_title": "...", "photo_url": "...", "video_url": "..." } }
```

Stored in hub Supabase PG table `meta_lead_attribution` (org-scoped RLS, one row per lead per channel):

| column | type | webhook fills | backfill fills |
|---|---|---|---|
| org_id | text | ✓ | ✓ |
| channel | text | 'instagram' | 'instagram' |
| sender_id | text | referral event sender.id (IGSID) | messages.sender_id |
| chat_id | text | conversation id | messages.chat_id |
| first_message_id | text | message.mid | first inbound messages.message_id |
| first_contact_at | timestamptz | event ts | min(occurred_at) |
| origin | text | 'ad' \| 'organic' \| 'unknown' | 'ad' \| 'organic' \| 'unknown' |
| source | text | referral.source ('ADS') | 'ADS' if matched else null |
| ref | text | referral.ref | null |
| ad_id | text | referral.ad_id | **null** (heuristic can't resolve exact ad) |
| adset_id | text | resolved from ad_id | null |
| campaign_id | text | resolved from ad_id | heuristic match |
| campaign_name | text | resolved from ad_id | heuristic match |
| ad_title | text | ads_context_data.ad_title | null |
| photo_url | text | ads_context_data.photo_url | null |
| video_url | text | ads_context_data.video_url | null |
| provenance | text | **'webhook'** | **'heuristic-icebreaker'** |
| confidence | text | 'exact' | 'high' \| 'medium' \| 'low' |
| match_meta | jsonb | `{}` | `{opener, product, window_days, competitors, convos_started}` |
| captured_at | timestamptz | now | now |

UNIQUE(org_id, channel, sender_id). Upsert rule: a `provenance='webhook'` row is authoritative — never overwrite it with heuristic. Heuristic upsert only when no webhook row exists.

## Phase 0 — foundation (BLOCKS all tiers; built by orchestrator)

- Migration `meta_lead_attribution` (surgical SQL on Supabase PG; NEVER drizzle-kit push; add org_guc RLS policy like sibling meta_* tables).
- `src/server/services/meta/attribution.types.ts` — `MetaReferral`, `LeadAttribution` TS types.
- `src/server/services/meta/attribution.service.ts`:
  - `resolveCampaignFromAdId(adId, orgId): {campaign_id, campaign_name, adset_id} | null` — join `meta_ad_insights` (latest row for ad_id).
  - `attributionFromReferral(referral, ctx): LeadAttribution` — webhook path.
  - `upsertLeadAttribution(row): Promise<void>` — webhook-wins upsert.
  - `classifyOpener(opener, firstContactAt, channel, orgId): Promise<Partial<LeadAttribution>>` — **heuristic; Tier 2 agent implements the body**, signature fixed here.

## Tier 1 — aggregate ad performance (parallel, independent of table)

Data already in `meta_ad_insights`. Build:
- `src/server/services/meta/ad-performance.service.ts` — rollup per campaign & per ad: spend, impressions, reach, clicks, ctr, `conversations_started` (sum of `actions[] where action_type='onsite_conversion.messaging_conversation_started_7d'`), `cost_per_conversation` = spend/conversations_started. Date-range param. Org-scoped, RBAC `ads:read`.
- `src/routes/api/meta/ad-performance/+server.ts` (GET, `requireOrgCapability(locals,'ads','read')`).
- UI: **Socials → Ad Performance** view (follow `ui-design-governance`; bar-row layout per preference; semantic tokens only). Table + KPI ribbon. Reuse shared DataTable.

## Tier 2 — retroactive backfill (parallel; depends on Phase 0)

Implement `classifyOpener` + a batch runner:
- Icebreaker patterns (ad-origin): `vi su anuncio de X`, `(quiero|quisiera) (más |mas )?informaci[oó]n (sobre|de) X`, `info de X`, product-named (slim/afinamiento/labio/rino/ment[oó]n/papada). Extract product token.
- Product→campaign map: slimface|afinamiento→'Slimface'/'afinamiento'; labios→'labio'; rino→'rino'; mentón→'ment'; else generic.
- Match: campaign_name ILIKE product-pattern AND IG-DM campaign (name ILIKE '%IG-DM%' OR '%instagram%') AND first_contact_at within [min(date), max(date)+7d] of that campaign's insights AND that window's `conversations_started`>0. Pick campaign with max conversations_started in window → prior.
- Confidence: product-specific single campaign = 'high'; product matched multiple = 'medium'; generic template only = 'low' (origin='ad', campaign null); no ad signal = origin 'organic'/'unknown'.
- **Dry-run report FIRST** (counts per bucket + per-campaign lead totals + 20 samples) → orchestrator reviews → then write upserts (provenance='heuristic-icebreaker').
- Backfill over FIRST inbound message per chat_id (channel=instagram).

## Tier 3 — going-forward webhook (parallel; depends on Phase 0)

- Gateway `minion/extensions/meta-graph/src/channels/messaging-platform.ts`: extend `MessagingEvent.message` with `referral`; capture `raw.message?.referral`; do NOT drop when referral present even if no text/media. Emit referral out of `extractMessagingEvents` (extend `MetaInboundMessage` or a sibling channel-out).
- Gateway relay: on referral, `POST {HUB_URL}/api/meta/attribution` with `Authorization: Bearer {CRON_SECRET}`, body `{orgId, channel:'instagram', sender_id, recipient_id, message_id, timestamp, referral}`. New envs HUB_URL, CRON_SECRET in meta-graph plugin config.
- Hub `src/routes/api/meta/attribution/+server.ts` (POST, Bearer CRON_SECRET): validate, `attributionFromReferral` + `resolveCampaignFromAdId`, `upsertLeadAttribution` (provenance='webhook'). Map recipient IG id → orgId via meta_assets.
- Journey: `crm-journey.service.ts` add origin milestone reading `meta_lead_attribution` for the contact's IG sender_id ("First contact — <campaign> ad" / "Organic").
- **PARKED (ops, not this build):** Meta App Dashboard — subscribe IG object to `messages` + `messaging_referrals` fields + point webhook at gateway `/meta`. Capture path is built and idle until this is flipped.

## Constraints (all agents)
- Supabase PG for new table (NOT Turso). Surgical SQL migration. RLS org_guc policy required.
- RBAC on every org-data endpoint (`ads` capability). Fail-closed.
- Svelte 5 runes; `ui-design-governance` skill before any UI; semantic tokens; run `bun run lint:design && lint:tokens` after UI.
- TS strict, no `any`. Scope commits to own files. Don't touch other tiers' files.
