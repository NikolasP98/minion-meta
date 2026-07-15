# /ads → /socials rename + Posts/Campaigns detail pages + ad-level previews

**Status:** APPROVED — 2026-07-05
**Owner:** orchestrator (Opus) specs/revises; Sonnet implements
**Depends on:** thumbnail mirroring (`2026-07-05-meta-post-thumbnail-mirroring.md`, LIVE), Meta integration
**User ask (verbatim):** "Rename the /ads links to /socials or similar/relevant — rename Campaigns to Ad Campaigns for more clarity; I want to see the ad previews in the campaigns page on the ad level — POSTS and CAMPAIGNS detail pages (for when the user clicks on a row item to see more details; to see the full image or post contents (video/carousel), caption, stats) — some captions are cut off. Check if this is a limitation; I'd like the full caption visible (maybe keep the cut-off caption in the table view, and include the full caption in the new detail page)"

---

## 0. Findings that shape the design

1. **Captions are NOT truncated at ingest.** `meta_post_insights.caption` max 684 chars (FB 634 / IG 684), zero rows ending in `…`/`...` across all 342 posts. The table's "..." is CSS line-clamp. → Keep the clamp in the table; render the full caption on the detail page. No ingest change. *(Residual caveat: FB Graph `message` could in principle truncate very long posts — no evidence in our data; if a future post looks clipped in detail view, smoke-test the raw Graph response.)*
2. **No ad→post link exists in the DB.** `is_promoted` labeling fetches ad-creative `effective_object_story_id`s at sync time, flips a post-side boolean, and **discards the mapping**. `meta_ad_insights` has no story/creative column. Ad-level previews require persisting that link (§4).
3. **Everything else is templated.** DataTable has `onRowClick` (crm/finances use `goto(\`/x/${id}\`)`); detail-page conventions live in `finances/invoices/[id]` (load preamble, 404-not-403, `createBackNav`, `PageHeader`); no prerender/Vercel constraints on the route move.

## 1. Naming decisions

- Route: **`/socials`** (user offered latitude). Nav label EN **"Socials"** / ES **"Redes sociales"** (`nav_ads` value change only).
- Campaigns page label: EN **"Ad Campaigns"** / ES **"Campañas de anuncios"** (value change on the existing campaigns label keys; add if missing).
- **Module id stays `'ads'`** — route-only rename. Rationale: renaming the id would churn `ads:view` perm strings, `MODULES`/`BUSINESS_MODULES`, `API_WRITE_PREFIXES ['/api/meta','ads']`, and silently re-enable any org holding an explicit `app_modules` row. Zero user-visible benefit. `// ponytail: module id 'ads' behind route /socials — rename the id only if a module-picker UI ever exposes it.`
- **i18n key NAMES stay `ads_*`/`nav_ads`** — only values change. Renaming ~110 keys touches every callsite for zero behavior gain.
- Component dir `src/lib/components/ads/` stays (cosmetic churn); `AdsNav.svelte` keeps its filename, hrefs change.

## 2. WP-A — the rename (route-only)

1. **Move route tree** `src/routes/(app)/ads/` → `src/routes/(app)/socials/` (9 files: layout, dashboard, campaigns, posts, settings + servers).
2. **Redirect shim:** new `src/routes/(app)/ads/[...path]/+page.server.ts` → `redirect(301, '/socials/' + params.path + url.search)` (plus a bare `/ads` handler — the catch-all with optional param or a second `+page.server.ts` at `ads/`). Covers bookmarks and any stale Meta OAuth redirect mid-flight.
3. **`sections.ts`:** href `/ads`→`/socials`, matcher prefix, label value. **Gotcha:** line ~330 derives the per-org module gate id from the href's first segment → would become `'socials'`. Decouple: add optional `moduleId?: string` to the builtin-plugin item shape, set `moduleId: 'ads'` on this item, derivation falls back to the href segment for all others.
4. **`AdsNav.svelte`:** 4 hrefs → `/socials/*`; `ariaLabel` → localized "Socials".
5. **`permissions.ts`:** `ROUTE_VIEW_PERMS` `['/ads','ads:view']` → `['/socials','ads:view']`; `MODULE_SUBRESOURCES.ads` route → `/socials/settings`. Perm strings unchanged.
6. **13 OAuth redirect literals** in `api/meta/oauth/callback` (7) + `api/meta/ig/callback` (6) → `/socials/settings?...`. **CRITICAL:** these are server-side redirect *destinations* after Meta round-trips — the Meta-app OAuth redirect_uri config points at `/api/meta/...` callbacks (NOT `/ads`), so no Meta-side config change is needed. Verify by reading the start routes.
7. `campaigns/+page.svelte` `goto('/ads/campaigns?...')` → `/socials/campaigns`.
8. **Tests:** `plugin-nav.test.ts` (`["/crm","/ads"]`), `sections.test.ts` — update expectations.
9. i18n values per §1 + `i18n:compile`.

`isModuleEnabled(ctx,'ads')` / `requireOrgCapability(locals,'ads',…)` call sites: **unchanged** (module id stays).

## 3. Schema — persist the ad→post link (WP-B)

New tiny join table (NOT a column on `meta_ad_insights` — that's one row per (ad,date); the link is per-ad and updating N date-rows per ad is silly):

```
meta_ad_posts
  org_id     text not null
  ad_id      text not null
  post_id    text not null      -- = effective_object_story_id ({page_id}_{post_id}), matches meta_post_insights/meta_post_media post_id format for FB
  platform   text not null default 'fb'
  updated_at timestamptz not null default now()
  primary key (org_id, ad_id)
```

Migration `supabase/migrations/20260705..._meta_ad_posts.sql` mirroring the `meta_*` org_guc RLS + `app_ledger` grants pattern. Orchestrator applies to prod. Drizzle def in `pg-meta-schema.ts` (TEXT ids, same as siblings).

**Population — reuse the one Graph call:** `collectPromotedStoryIds` currently lists creatives (`/adcreatives?fields=effective_object_story_id`) without ad identity. Replace with an ad-level fetch: `/act_{id}/ads?fields=id,creative{effective_object_story_id}` (new `graph-read.ts` fn `listAdsWithStoryIds`, same paging/appsecret_proof machinery). From the result: (a) upsert `meta_ad_posts` rows, (b) derive the same story-id Set for the existing `markPromotedPosts`/`isPromoted` flow — one call serves both. Runs where `collectPromotedStoryIds` runs today (posts job). Failure posture identical to today (promoted labeling already tolerates this fetch failing).

**Ads with no linked post** (dark posts, deleted creatives): no row → placeholder glyph in UI. Do NOT mirror thumbnails for posts absent from `meta_post_insights` v1 (YAGNI — posts sync is full-history, coverage is high).

## 4. Ad-level previews on Ad Campaigns (WP-D, UI half)

- `campaignBreakdown(ctx, range, 'ad')` in `meta-insights.service.ts`: LEFT JOIN `meta_ad_posts` (org_id, ad_id) → LEFT JOIN `meta_post_media` (org_id, platform, post_id, status='mirrored') → expose `thumbFileId` + `postId` on ad-level rows only (campaign/adset levels: null).
- Campaigns page tree table: leading preview cell on ad rows — same 40px `<img src="/api/files/{thumbFileId}/raw" loading="lazy">` treatment as the Posts tab; placeholder glyph when null; empty (no glyph) on campaign/adset rows to keep the hierarchy scannable.

## 5. Detail pages

### 5.1 `/socials/posts/[postId]` (WP-C)

- **Row-click:** Posts table gets `onRowClick={(p) => goto(\`/socials/posts/${encodeURIComponent(p.post_id)}\`)}` (post ids contain `_` — safe, but encode anyway). Keep the external-permalink column.
- **Load** (`+page.server.ts`, finances-invoice preamble): `getCoreCtx` → `isModuleEnabled('ads')` 404 → new `getPostDetail(ctx, postId)` in `meta-insights.service.ts`: pivots ALL metric rows for the post (not just the table's 3), plus caption/permalink/media_type/posted_at/is_promoted, LEFT JOIN `meta_post_media` → `thumbFileId` + `status`. Missing post → 404 (no existence leak). Org-scoped via `withOrgCore`.
- **Page:** `createBackNav('/socials/posts', <posts label>)` + `PageHeader`. Sections:
  1. **Media** — large rendition: mirrored image (`/api/files/{id}/raw`) as the instant base; if the on-demand media endpoint (§5.3) returns richer content, upgrade in place: carousel → horizontal snap-scroll of images; video → `<video controls poster={mirrored}>` with the fresh CDN url. Fallback chain: fresh media → mirrored thumb → platform glyph.
  2. **Full caption** — complete text, `white-space: pre-wrap` (captions contain newlines/emoji).
  3. **Stats grid** — every metric present for the post (semantic labels via the existing METRIC_LABELS/`ads_col_*` mapping + humanize fallback), plus platform badge, Organic/Ad badge, posted date, permalink out-link.
  4. **If promoted:** "Promoted by N ads" chip via reverse lookup on `meta_ad_posts` (post_id → ad ids), linking to the campaigns page. Cheap join, high connective value.

### 5.2 `/socials/campaigns/[campaignId]` (WP-D)

- **Row-click on campaign rows** (top-level rows only — adset/ad rows keep expand behavior; DataTable `onRowClick` receives the row, branch on the existing `c:`/`s:`/`a:` rowId prefix or level field: campaign → `goto`, others → no-op so expansion still owns the click).
- **Load:** `getCampaignDetail(ctx, campaignId, range)`: campaign header aggregates (spend/impressions/reach/clicks/ctr/cpc over range), per-adset breakdown, per-ad breakdown with `thumbFileId`+`postId` (reuse the §4 join), and a spend-over-time series (`sum(spend) group by date`) for a small trend chart (ECharts, same conventions as finances dashboards). Missing campaign → 404.
- **Page:** back-nav → `/socials/campaigns`; header (name, date-range chips, KPI stat row); ads table with preview thumbnails where each linked ad row click-throughs to `/socials/posts/[postId]` when `postId` present; spend trend chart.

### 5.3 On-demand rich media endpoint (WP-C)

The mirrored blob is a *preview*. Full contents (carousel children, video) are NOT stored — CDN urls expire and video mirroring is out of scope. Resolve fresh at view time:

- `GET /api/meta/posts/[postId]/media` — auth + `requireOrgCapability(locals,'ads','view'-equivalent read gate per existing meta read routes; match whatever gate the sync/run route family uses for reads — if none exists for reads, gate on the module view perm)`. Handler:
  - Look up the post's platform + org connection token (same token-selection helpers the sync uses).
  - **IG:** `GET /{media-id}?fields=media_type,media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}` on `graph.instagram.com` (unversioned, no proof) → return `{items: [{type:'image'|'video', url, poster?}]}`. Children present → carousel array; VIDEO → single video item.
  - **FB:** v1 returns `{items:[{type:'image', url: full_picture-refetch}]}` — attempt the `attachments{media,subattachments}` edge ONCE behind a try/catch as a smoke-test; if it 100s on permissions (likely `pages_read_user_content`), fall back to `full_picture` and log which path served. Don't fabricate availability; report the smoke-test result.
  - `Cache-Control: private, max-age=1800` (fresh CDN urls live hours; a page revisit within 30 min reuses them).
  - Failure → `{items: []}` — the page silently stays on the mirrored image. Never a user-facing error for media enrichment.

## 6. RBAC / safety checklist (per hub CLAUDE.md — required)

- `/socials/*` covered by the updated `ROUTE_VIEW_PERMS` prefix entry; detail pages inherit (verify `requiredViewPermForPath` prefix-matches subpaths — it does for `/ads` subpages today).
- Detail loads: 404 on missing/foreign id, never 403. All reads through `withOrgCore`.
- New media endpoint: authed, org-scoped token lookup, read-gated; it returns remote CDN URLs to the client (no proxying of video bytes through us).
- No new write surfaces.

## 7. Work packages & phasing

**Phase 1 (parallel, disjoint):**
- **WP-A — rename** (§2). Owns: route move, sections.ts, AdsNav, permissions.ts route literals, OAuth redirect strings, redirect shim, tests, i18n values.
- **WP-B — ad→post data plumbing** (§3). Owns: `pg-meta-schema.ts`, migration file (NOT applied), `graph-read.ts` (`listAdsWithStoryIds` + retire/adapt `listAdCreativeStoryIds`), `meta-sync.service.ts` (populate + keep isPromoted flow), `meta-ad-posts` service helpers if needed, tests. **No UI files.**

*Orchestrator between phases: apply migration to prod, re-verify check/test green on the merged pair.*

**Phase 2 (parallel, after both Phase-1 WPs land):**
- **WP-C — posts detail** (§5.1 + §5.3). Owns: `getPostDetail`, `/socials/posts/[postId]/*`, posts-page `onRowClick`, media endpoint, i18n keys, tests for the service + endpoint.
- **WP-D — campaigns previews + detail** (§4 + §5.2). Owns: `campaignBreakdown` ad-level join + campaigns page preview column + row-click, `getCampaignDetail`, `/socials/campaigns/[campaignId]/*`, i18n, tests. *(Shares `meta-insights.service.ts` with WP-C — WP-C adds `getPostDetail` (new function at end of file), WP-D touches `campaignBreakdown` + adds `getCampaignDetail`; instruct both to append disjoint functions and not reformat the file; WP-D also owns the posts-page? No — WP-C owns posts page, WP-D owns campaigns page. The only shared file is meta-insights.service.ts: acceptable append-only merge risk; WP-D starts after WP-C's commit if a conflict emerges — orchestrator resolves.)*

**Verification:** each WP: `bun run check` 0/0 + targeted vitest + full suite before commit. After Phase 2 deploy: orchestrator runs a posts sync (populates `meta_ad_posts`), browser-verifies: `/socials` nav + redirect from `/ads`, campaigns ad-row previews, posts detail (image, full caption incl. one of the flagged truncated-looking captions, stats), campaign detail, IG carousel/video enrichment, FB smoke-test result.

## 5.4 Comments section on post detail (WP-F — added 2026-07-05 post-review)

User ask (verbatim): "On the post detail page, I want to see the comments section on the right side (stack on mobile) - it'll be its own scroll area so that the post is always visible on the left (immitate IG UI; on larger screens, split left/right; on smaller screens toggle comments on/off over the content)"

**Availability caveat (honest):** FB comment reads previously failed on `pages_read_user_content` (unobtainable); IG comment reads under `instagram_business_basic` are unverified. The endpoint therefore ships with graceful degradation and the first live view IS the smoke test — the UI must look intentional in all three states: comments, zero comments, unavailable.

- **Endpoint** `GET /api/meta/posts/[postId]/comments` (sibling of the media endpoint, same read gate + token resolution): returns `{available: boolean, comments: [{id, username, text, timestamp, likeCount, replies: [...]}]}`.
  - IG: `/{media-id}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}` on `graph.instagram.com`. One page (~50) v1; log the smoke-test outcome.
  - FB: attempt `/{post-id}/comments?fields=id,message,from{name},created_time,like_count` with the page token; on permission denial → `available:false` (expected).
  - Any failure → `{available:false, comments:[]}` 200. `Cache-Control: private, max-age=300`.
- **Layout (IG-imitation):** desktop (≥lg): two-column split — left column holds media+caption+stats and stays fully visible (bounded height, media scaled to fit); right column is the comments panel with its OWN `overflow-y: auto` scroll (header "Comments (N)" from the existing metric). Mobile (<lg): comments hidden behind a toggle (comment-icon button with count) that opens an overlay panel covering the content, own scroll, close button. No page-level horizontal scroll.
- Comment item: bold username + text (pre-wrap), relative timestamp, like count; replies indented one level. Empty state vs unavailable state are DISTINCT strings (i18n en+es).

## 8. Deferred (explicitly out of scope v1)

- Video/carousel blob mirroring to B2 (on-demand fresh URLs cover the detail page).
- Thumbnails for dark posts (ads with no organic post row).
- Renaming module id `'ads'` → `'socials'` or the `ads_*` i18n key names.
- FB comments/reactions per-post breakdowns (perm-gated, unchanged).
