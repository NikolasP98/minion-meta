# FACES production Socials and Meta product recon

**Verdict:** action required before the paid-data dashboard or campaign lead counts are treated as current. The Meta OAuth connections and several ingestion lanes are alive, but Ads is caught in a deterministic resume loop, the UI hides that old active job, and campaign attribution has not received an exact webhook row since the July heuristic backfill.

This was a bounded, read-only production pass from four perspectives: a first-time operator, a power user, product, and UX. It ran 21 aggregate PostgreSQL probes inside an explicitly read-only transaction, six unauthenticated GET probes plus localized-route checks, and one read-only Vercel inspection. It made **zero mutations**, sent no provider request, retained no token, provider identifier, person, chat identifier, caption, message body, or raw error text, and performed no login automation.

## Evidence boundary

- Production database observation completed at `2026-10-03T03:32:55.694Z`. PostgreSQL reported `transaction_read_only=on`; the statement timeout was eight seconds.
- `hub.minion-ai.org` resolved to a Vercel production deployment in `READY` state created at `2026-10-03T00:08:14.081Z`.
- Unauthenticated localized Socials pages redirected to `/login` with only a `redirectTo` query key. `/api/meta/ad-performance` returned 401 with no credentials. Response bodies were discarded.
- Vercel did not expose a source revision. The source-to-production causal conclusions below are high-confidence inferences from matching live state and current source behavior, not a deployment-SHA attestation.
- An authenticated browser was not used. The isolated browser would stop at login, and login automation was outside the approved boundary. Visual rendering is therefore not certified in this pass.
- One deliberately bounded aggregate exceeded the eight-second statement timeout and was rolled back by the read-only transaction. It was removed; the final 21-probe receipt completed cleanly.

Receipts:

- [`faces-product-probes.json`](./faces-product-probes.json) — redacted database results and the purpose of every SELECT.
- [`faces-ad-job-delta.json`](./faces-ad-job-delta.json) — before/after observation across a scheduler tick.
- [`faces-http-probes.json`](./faces-http-probes.json) — unauthenticated route and API boundary checks.
- [`faces-deployment-inspect.json`](./faces-deployment-inspect.json) — production deployment state without project credentials.
- [`faces-product-recon.json`](./faces-product-recon.json) — machine-readable findings.
- [`../backend/faces-backend-recon.md`](../backend/faces-backend-recon.md) — the prior gateway/host pass used to distinguish Hub OAuth from gateway channel readiness.

## Production state

The Hub has two encrypted Meta connections: one active Facebook Login for Business connection and one active Instagram Login connection. Four assets are enabled: one PEN ad account, two Instagram assets, and one page. Three other ad accounts are disabled. The Instagram token has a stored expiry of `2026-11-07T02:40:06.007Z`; the Facebook business token has no expiry.

Several collection paths are healthy:

- Organic facts are current through posts published on October 2 and fetched on October 3.
- Instagram messages were current through `03:29:46Z` and ingested through `03:30:14Z` during the pass.
- All 1,084 observed media rows were mirrored: 846 Facebook and 238 Instagram, with no retained media error.
- The current paid fact set is internally continuous across 903 dates, contains 30,797 ad/day rows, and resolves consistently to PEN.

The freshness boundaries do not agree:

| Domain | Latest business event/fact | Latest fetch/ingest | Meaning |
|---|---:|---:|---|
| Paid ads | 2026-09-12 | 2026-10-03 03:30:52Z | Old business window is being refetched; no newer paid facts land. |
| Organic posts | 2026-10-02 | 2026-10-03 02:52:13Z | Current feed, but most requested insight metrics are unavailable. |
| Instagram messages | 2026-10-03 03:29:46Z | 2026-10-03 03:30:14Z | Current through the last scheduler pass. |
| Lead attribution | capture batch ended 2026-07-17 19:29:47Z | same | One-time heuristic snapshot; zero exact webhook rows. |

## Findings

### FACES-PROD-001 · P1 · Ads repeats a terminal window instead of advancing

The active Ads job was created on September 13 with `since=2026-06-15`. At the first observation it reported 284,634 cumulative row upserts; after the `03:30Z` scheduler tick it reported 284,734. The fetch timestamp advanced by ten minutes, but the latest paid fact stayed September 12. In the preceding 24 hours, 1,693 existing facts across exactly June 15–September 12 were refetched.

The current source explains the cycle. `syncAds` checks its row cap before it checks whether the page is terminal. When the final page crosses the cap, it serializes the same window start with `next` absent and requeues. On the next slice, the resume branch cannot call `fetchNextPage`, so it starts that window from page one again. The cumulative count rises while the business-date frontier stays fixed.

Source anchors:

- `src/server/services/meta/meta-sync.service.ts:912-979` — page selection, cap check, resume serialization, then terminal-page check.
- `src/server/services/meta/meta-sync-jobs.service.ts:215-258` — additive counters and queued resume lifecycle.

The repair must treat a terminal page as completion of that window. If another window or asset remains, persist that successor as the resume point; otherwise finish. A focused regression should make the terminal page cross the cap, run the next slice, and prove that page one is never fetched twice. The existing audit finding HS-005 about concurrent stale claims remains separate and still needs fencing.

### FACES-PROD-002 · P1 · The stale Ads lane is invisible in normal operator UI

The settings cards say both connections are active. They show connection time and scopes, but do not show data-through dates. `tokenExpiresAt` is returned by the server and ignored by the cards. The dashboard places paid KPIs, organic posts, and campaign charts together without an as-of label for any domain.

The sync surface makes the failure harder to find:

- The server returns only the newest 20 jobs. In production those rows were 19 successful `messages_tail` jobs and one successful `posts` job. The old queued Ads job was absent.
- “Sync now” accepts any 2xx response as “Sync started,” ignores the per-kind result body, invalidates once, and stops its spinner. The existing queued Ads job is reused, advances one repeated slice, and remains outside the newest-20 table.
- The dashboard defaults to a nominal recent window while the actual paid extent ends September 12. Organic content from October appears beside it, so the page looks current as a whole.

Source anchors:

- `src/routes/(app)/socials/settings/+page.svelte:101-143,164-201,232-273` — success toast, technical counts, connection status, no expiry or data freshness.
- `src/server/services/meta/meta-insights.service.ts:662-769` — expiry is returned, job history is newest-first with a hard limit.
- `src/routes/(app)/socials/+page.server.ts:9-55` and `src/routes/(app)/socials/+page.svelte:172-203` — date resolution and dashboard rendering without freshness metadata.

Show active jobs before recent terminal history, regardless of creation time. Parse the response from Sync now, show each kind as queued, partial, failed, or complete, and refresh until the requested work reaches a terminal state. Every dashboard domain should display its own data-through timestamp.

### FACES-PROD-003 · P1 · Campaign lead counts are a July heuristic snapshot

Production contains 5,299 Instagram attribution rows, all written within a four-minute window on July 17 and all marked `heuristic-icebreaker`. There are zero `webhook`/`exact` rows. Instagram messaging continued through October 3.

The intended exact path is a gateway relay to `POST /api/meta/attribution`. The earlier backend recon confirmed that the deployed FACES gateway has the Meta Graph plugin but no active Instagram/Messenger/WhatsApp Cloud channel and no access token. That aligns with the absence of exact rows.

The campaign page receives both `confidence` and `provenance`, but renders only confidence under “Leads from this campaign.” It provides neither provenance nor a data-through boundary. A business operator can reasonably interpret those rows as an ongoing exact feed.

Source anchors:

- `src/routes/api/meta/attribution/+server.ts:10-68` — exact webhook relay contract.
- `src/server/services/meta/attribution.service.ts:175-217` — provenance reaches the page data.
- `src/routes/(app)/socials/campaigns/[campaignId]/+page.svelte:172-214,301-331` — confidence shown, provenance and capture freshness omitted.

Qualify and wire the exact referral relay only after the gateway channel is intentionally connected. Until then, label the rows as a July heuristic backfill and show provenance and data-through time. Campaign decisions should not treat this table as current exact attribution.

### FACES-PROD-004 · P2 · Green jobs conceal partial metric and target coverage

The latest posts job is `succeeded`, but its counters say 245 posts processed, one metric request denied, and 244 metrics skipped. The production fact set contains only Facebook `shares_total` plus Instagram `comments_total` and `reactions_total`. The dashboard computes “top posts” by summing whichever metric values happen to exist. All five current winners are Instagram posts, which compares Instagram reactions/comments with Facebook shares as if the totals had one meaning.

The latest message-tail job is also `succeeded` while reporting `instagramSkipped=1`. Instagram messages are arriving through another target, so the aggregate is fresh while one configured target remains partially unobserved. The UI exposes the raw counter name in a technical count string but does not convert it to a coverage warning or identify the affected asset.

Source anchors:

- `src/server/services/meta/meta-sync.service.ts:982-1110` — per-target skips are counted while the job still completes.
- `src/server/services/meta/meta-insights.service.ts:407-454,476-495` — arbitrary metric map and summed score.
- `src/routes/(app)/socials/+page.svelte:111-168` — heterogeneous values rendered as one top-post list.

Use complete, partial, and failed outcomes per asset and metric family. For ranking, define a comparable business metric or separate Facebook and Instagram leaderboards. A successful scheduler execution should not imply complete analytic coverage.

### FACES-PROD-005 · P2 · Raw sync errors are unbounded

One retained Ads failure is 122,491 bytes; the largest retained post failure is 3,823 bytes. The probe did not find `access_token`, `authorization`, `appsecret_proof`, URL, or HTML markers in those rows, and it retained no raw error text.

`finishJob` persists the full exception string. The settings read returns it unchanged, and the DataTable includes it in rendering, search, and export. The current newest-20 projection does not include the old large error, but a new failure of the same shape would immediately inflate the page response and UI work.

Source anchors:

- `src/server/services/meta/meta-sync-jobs.service.ts:261-272` — unbounded error persistence.
- `src/server/services/meta/meta-insights.service.ts:732-769` — raw error read.
- `src/routes/(app)/socials/settings/+page.svelte:125-143,347-371` — raw display/search/export surface.

Persist an operator-safe class and bounded summary plus a correlation id. Restricted diagnostics should have an explicit byte and retention limit.

## Perspective review

**First-time operator.** The connection cards and green job states suggest the product is current. Nothing explains that paid KPIs stop on September 12, that exact lead attribution never started, or that one Instagram target is skipped. “Sync started” does not lead to a visible outcome.

**Power user.** The surface exposes raw counters but hides the only active Ads job because it is older than the newest-20 window. It lacks per-asset health, data-through timestamps, provider-call progress, and a stable partial-success vocabulary. The raw error column is too technical and can be extremely large.

**Product.** The same dashboard combines three different freshness contracts. Paid optimization and cost-per-conversation decisions are currently unsafe. Organic post ranking does not compare like with like, and the campaign lead roster is historical heuristic evidence rather than live exact attribution.

**UX.** The source has sound responsive foundations: the dashboard grid stacks into one column below a 620px container and the settings cards use a narrow linear layout. Authentication boundaries also behaved correctly in production. The main UX problem is state truthfulness rather than basic layout: fresh, stale, partial, queued, and heuristic states look too similar. Mounted desktop/mobile, zoom, keyboard, and screen-reader behavior remain unverified because no authenticated browser session was used.

## Recommended order

1. Fix the terminal-page Ads resume loop and add the exact no-replay regression.
2. Put active jobs ahead of recent history and expose per-domain freshness on dashboard, campaigns, posts, and settings.
3. Label heuristic attribution immediately; then qualify the exact relay as a separate gateway/channel operation.
4. Add partial target/metric outcomes and replace cross-platform summed post scoring.
5. Bound stored and rendered provider errors.

No production repair was attempted in this pass.
