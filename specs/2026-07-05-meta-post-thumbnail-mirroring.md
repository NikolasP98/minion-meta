---
id: 2026-07-05-meta-post-thumbnail-mirroring
title: Meta Post Thumbnail Mirroring → B2 blob storage
stage: done
status: shipped
pass: 1
created: 2026-07-05
updated: 2026-08-17
repos: [minion_hub]
---

# Meta Post Thumbnail Mirroring → B2 blob storage

**Status:** APPROVED — v2 2026-07-05 (provider-agnostic storage + caching added per review; open questions resolved by owner judgment)
**Owner:** orchestrator (Opus) plans; Sonnet implements
**Depends on:** existing Meta integration (`meta-business-integration`), existing B2 stack (`src/server/storage/b2.ts`, `src/server/services/file.service.ts`)

---

## 1. Problem

The Posts tab (`/ads/posts`) shows FB + IG post rows (caption, engagement counts, permalink) but **no visual preview**. The media URLs Meta returns (`media_url`, `thumbnail_url`, `full_picture`) are **signed CDN links that expire** — the fbcdn.net/cdninstagram URLs carry `oe=`/`_nc_ohc`/`ccb` expiry params and 404 within hours-to-days. So we cannot persist a Graph media URL and render it later; we must **mirror the blob into our own bucket** at fetch time and serve from there.

Goal: a durable thumbnail per post, mirrored into the existing Backblaze B2 bucket, rendered inline in the Posts tab (and reusable anywhere a post preview is wanted — CRM, dashboards, agent artifacts).

## 2. What already exists (reuse verbatim — do NOT rebuild)

| Piece | Location | Reuse as |
|---|---|---|
| B2 S3 client + `uploadToB2`/`getSignedDownloadUrl`/`deleteFromB2` | `src/server/storage/b2.ts` | storage primitives |
| `uploadFile(ctx,{fileName,contentType,data,category,uploadedBy})` → `fileId`; key `${tenantId}/${category}/${id}/${fileName}` | `src/server/services/file.service.ts` | the upload path (gives us the `files` row + lifecycle) |
| `/api/files/[id]/raw` — auth-gated, 302→fresh signed URL | `src/routes/api/files/[id]/raw/+server.ts` | the `<img src>` target (never expires from the browser's POV) |
| `fetchImageSafely` — SSRF guard, 10 MB cap, per-hop validation, content-type check | `src/server/services/ssrf-guard.ts` (via `notes/fetch-image`) | remote-fetch of the CDN blob |
| durable slice jobs (`meta_sync_jobs`, kinds posts/ads/messages, cursor resume, tick) | `meta-sync-jobs.service.ts` / `meta-sync.service.ts` | where mirroring is driven |

**Net-new is small:** (a) 2 Graph fields, (b) 1 table, (c) a capped mirror step, (d) UI `<img>`. No new B2 helper, no CDN var, no public-bucket change.

## 3. Bucket file structure

Reuse `file.service.uploadFile` with a dedicated **category** so all Meta blobs live under a navigable prefix, while inheriting the `files`-table lifecycle (signed URLs, tenant-scoping, delete-cleanup) for free.

```
{bucket = minionhub}/
  {orgId}/
    meta/
      {platform}/                 # "fb" | "ig"
        {fileId}/                 # files.id (uuid) — file.service invariant
          {postId}.jpg            # the mirrored preview blob
```

- **`category` string passed to `uploadFile` = `meta/fb` or `meta/ig`** → yields key `${orgId}/meta/{platform}/{fileId}/{postId}.jpg`.
- Everything is **org-scoped by the leading `${tenantId}`** (matches every other consumer) → no cross-tenant reachability.
- `{fileId}` segment is the `file.service` invariant (random uuid). We do **not** fight it — dedup/idempotency is handled at the DB layer (§4), not by key collision. Keeping the standard key means `deleteFile`, `listFiles`, and the `/raw` proxy all work unmodified.
- Content type normalized to `image/jpeg`; extension `.jpg` (Meta previews are jpeg; we do not transcode).

**Rejected alternative — deterministic key `${orgId}/meta/{platform}/{postId}.jpg` (no fileId, overwrite-in-place):** tidier bucket, but bypasses the `files` table → we'd hand-roll a proxy route, signed-URL logic, and cleanup that `file.service` already gives us. Not worth it for cosmetic key tidiness. The DB row is the source of truth for "is this post mirrored"; the bucket layout is an implementation detail behind the `/raw` proxy.

## 4. Schema — new table `meta_post_media` (one row per post, NOT per metric)

`meta_post_insights` is a **long/narrow** table (one row per `(post, metric, period)` — 3 rows per post). A thumbnail belongs to the *post*, not a metric, so it gets its own table rather than being duplicated across metric rows.

```
meta_post_media
  org_id        uuid    not null         -- RLS org_guc
  platform      text    not null         -- 'fb' | 'ig'
  post_id       text    not null         -- Graph post/media id
  file_id       uuid    null             -- → files.id (null until mirrored)
  source_url    text    null             -- last CDN url we mirrored from (audit/debug)
  media_type    text    null             -- IMAGE | VIDEO | CAROUSEL_ALBUM | REELS (IG) / FB type
  status        text    not null default 'pending'   -- pending | mirrored | failed | skipped
  error         text    null             -- last failure reason (sanitized)
  attempts      int     not null default 0
  fetched_at    timestamptz null         -- when the blob was mirrored
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()
  primary key (org_id, platform, post_id)
```

- **Additive migration** (`supabase/migrations/…_meta_post_media.sql`) with `org_guc` RLS + `app_ledger` grants, mirroring the existing `meta_*` tables. Schema in `src/server/db/pg-meta-schema.ts`.
- `status='skipped'` for posts with no usable preview (e.g. a text-only FB post with no `full_picture`).
- Idempotency key = `(org_id, platform, post_id)`. Re-sync **upserts** this row; the mirror step **skips** rows already `status='mirrored'` (unless a re-mirror is explicitly requested — v2).

## 5. Graph fields (net-new fetch)

Add the preview field to each list call (both need a live smoke-test — Meta field availability drifts, same posture as the rest of this integration):

- **IG** (`IG_MEDIA_FIELDS`, `graph-read.ts:493`): add `media_url,thumbnail_url`. Rule: `thumbnail_url` for VIDEO/REELS (the image preview of the video), else `media_url` (IMAGE / first CAROUSEL child). *(Verified live 2026-07-05: both fields resolve under `instagram_business_basic`, no appsecret_proof.)*
- **FB** (`PAGE_POST_FIELDS`, `graph-read.ts` ~452): add `full_picture` (post preview image; temporary CDN url). **Smoke-test**: confirm `full_picture` returns under `pages_read_engagement` — if it needs `pages_read_user_content` (which we don't have — see the posts-engagement history), FB previews may be unavailable and FB posts stay preview-less (IG-only thumbnails is an acceptable v1). Report the finding; don't fabricate the field's availability.

These URLs are captured into the sync's post objects and passed to the mirror step — **never persisted directly** (they expire).

## 6. Ingestion flow (durable, capped — never blocks a sync slice)

Downloading N images inline would blow the bounded slice budget, so mirroring is a **separate capped pass**, driven by the same tick, decoupled from metric upserts.

Design (chosen): **piggyback on the posts job, capped per slice.**
1. During `syncPosts`, after upserting metric rows for a post, **upsert a `meta_post_media` row** `(org,platform,post_id, source_url, media_type, status='pending')` if absent — this just *records* the post + its (fresh) source URL. Cheap, no network.
2. A dedicated mirror step (end of the posts slice, or a small 4th job kind `media`) picks up to **K `pending` rows** (K≈10/slice), for each: `fetchImageSafely(source_url)` → `uploadFile(ctx,{category:'meta/'+platform, fileName:postId+'.jpg', contentType:'image/jpeg', data})` → set `file_id`, `status='mirrored'`, `fetched_at`. On failure: `attempts++`, `status='failed'`, `error=…`; retried next tick (with a fresh `source_url` from the next posts sync, since the old one has expired).
3. Backfills naturally across ticks until all `pending` drain — same shape as the existing slice/cursor model.

*Rationale for recording source_url in step 1 then mirroring in step 2:* the CDN url expires, so we must mirror **soon** after fetch. Keeping step 2 within the same tick cycle (not a daily cron) keeps the window short. If a `pending` row's `source_url` is stale by mirror time, the fetch 403s → `failed` → next posts sync refreshes `source_url` → retry. Self-healing.

**Decision to confirm:** 4th job kind `media` vs. inline-capped in `posts`. Recommendation: **inline-capped in the posts slice** (lazier — no new job kind, no new tick allowlist entry, and posts already run every tick). Add a `mediaMirrored`/`mediaFailed` counter to the posts job counts for observability.

## 7. Serving

- `meta-insights.service.ts` Posts read (the `jsonb_object_agg` pivot, already grouped by `post_id`) **LEFT JOINs `meta_post_media`** → exposes `thumbFileId` (+ `thumbStatus`) per post.
- Posts tab (`/ads/posts/+page.svelte`) renders `<img src="/api/files/{thumbFileId}/raw" loading="lazy">` in a new leading thumbnail column; falls back to a platform-glyph placeholder when `thumbFileId` is null (pending/failed/skipped). No new route — `/raw` already 302s to a fresh signed URL each load, so mirrored thumbnails never appear expired.
### Caching (explicit requirement — no constant re-pulling)

Three layers, all cheap:

1. **Object metadata at upload:** `put()` sets `CacheControl: 'public, max-age=31536000, immutable'` on the object. Mirrored thumbnails are immutable per `fileId`, so the S3/B2 GET response tells the browser to cache the blob indefinitely. *(B2's S3-compatible API accepts the `CacheControl` PutObject param — smoke-test on first upload; if ignored, note it and move on, layer 2 still covers us.)*
2. **Cache the 302:** signed URLs differ per issuance (query params), so a fresh redirect = browser cache miss even on an immutable object. Fix: `/api/files/[id]/raw` sets `Cache-Control: private, max-age=3600` on the 302 and issues the signed URL with `expiresIn=86400` (TTL ≥ redirect cache lifetime, so a cached redirect never points at an expired URL). Browser then reuses the same signed URL → layer-1 cache hit.
3. `loading="lazy"` on the `<img>`.

Net effect: Meta CDN hit **once ever** per post (mirror time); B2 hit ~once per browser cache; hub server ~once/hour per image per user.

## 8. Provider-agnostic storage layer (the "improve the connection" ask — explicit requirement)

The blob-storage connection must be provider-agnostic: AWS S3, Backblaze B2, Cloudflare R2, MinIO, DO Spaces — and later Azure Blob. **Starting provider: Backblaze.** Design: one thin driver interface, ONE driver implemented v1.

```ts
// src/server/storage/blob.ts  (replaces b2.ts)
export interface BlobStorageDriver {
  put(key: string, body: Buffer | Uint8Array, contentType: string,
      opts?: { cacheControl?: string }): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
export function getStorage(): BlobStorageDriver;   // lazy singleton, driver picked by STORAGE_PROVIDER
export function isStorageConfigured(): boolean;     // single source of truth
```

- **S3 driver** (`src/server/storage/drivers/s3.ts`) — the existing `b2.ts` code generalized: endpoint/region/creds/bucket from env, `CacheControl` support, ~30s request timeout + one retry on 5xx/network error (no retry framework). This ONE driver covers AWS/B2/R2/MinIO/Spaces — they all speak the S3 API; provider-agnosticism within the S3 family is a **config concern, not a code concern**.
- **Azure** = a second driver file later behind the same interface. NOT written now (YAGNI) — the interface exists precisely so it's a one-file add. `// ponytail: s3 driver only — add drivers/azure.ts when an Azure tenant exists.`
- **Env — generic names with `B2_*` fallback** (zero prod env churn; B2 keeps working untouched):

| New var | Fallback |
|---|---|
| `STORAGE_PROVIDER` | `'s3'` (only valid value v1) |
| `STORAGE_ENDPOINT` | `B2_ENDPOINT` |
| `STORAGE_REGION` | `B2_REGION` → derived from endpoint hostname (`s3.us-west-004.backblazeb2.com` → `us-west-004`) → `'us-west-004'` |
| `STORAGE_ACCESS_KEY_ID` | `B2_KEY_ID` |
| `STORAGE_SECRET_ACCESS_KEY` | `B2_APP_KEY` |
| `STORAGE_BUCKET` | `B2_BUCKET_NAME` → `'minionhub'` |

- **Migration of callers:** `b2.ts` is deleted; its ~3 call sites (`file.service.ts`, `bugs/report/+server.ts`, tests) import `getStorage()`/`isStorageConfigured()` from `blob.ts`. The duplicated `isB2Configured()` in bugs/report dies here.
- Private-bucket + `/raw`-proxy model stays **as-is** (no public bucket, no CDN var).

Explicitly **out of scope v1** (note as future): image resize/transcode (add `sharp` to shrink 1080px IG originals → 320px thumbs — saves storage/bandwidth but adds a native dep; Meta previews are already modest, defer); content-addressed dedup; a public CDN domain; mirroring full-res media or video.

## 9. Cleanup / lifecycle

- On **connection disconnect** or asset removal: the `meta_post_media` rows + their `files` blobs for that org/platform can be pruned via `deleteFile`. v1: leave them (harmless, ~50 MB for FACES's ~340 posts); add a cleanup hook only if storage growth matters. `// ponytail: no reaper v1 — thumbnails are tiny; add a prune-on-disconnect pass if a large-org tenant appears.`
- Storage estimate: ~342 posts × ~150 KB ≈ **50 MB** for FACES. Negligible.

## 10. Work packages (Sonnet-sized, disjoint file ownership, two phases)

**Phase A (parallel):**
- **WP1 — provider-agnostic storage + schema:** `blob.ts` driver interface + `drivers/s3.ts` (§8: env fallbacks, region derivation, timeout+retry, `cacheControl`), delete `b2.ts` + migrate its callers, `isStorageConfigured()`; `pg-meta-schema.ts` `metaPostMedia` + migration SQL file (orchestrator applies to prod); `/raw` route cache headers + `expiresIn=86400` (§7); `uploadFile` passes `cacheControl` through. Tests for env-fallback/region-derivation + existing tests stay green.
- **WP2 — Graph fields:** `graph-read.ts` `IG_MEDIA_FIELDS` (+`media_url,thumbnail_url`) + `PAGE_POST_FIELDS` (+`full_picture`); thread into `IgMedia`/`PagePost` types. Preview-URL pick rule as pure helper (`pickPreviewUrl`) + test. Does NOT touch `meta-sync.service.ts` (WP3's file).

**Phase B (parallel, after A):**
- **WP3 — mirror step:** new `meta-post-media.service.ts` (upsert-pending / claim-K / mark helpers); `meta-sync.service.ts` — record pending rows in `syncPosts`, capped mirror pass (`fetchImageSafely` + `uploadFile{category:'meta/'+platform}`), `mediaMirrored`/`mediaFailed` counters, no-op when `!isStorageConfigured()`. Tests: pending-record, success/failure/skip, cap, idempotent re-sync.
- **WP4 — serving/UI:** `meta-insights.service.ts` LEFT JOIN → `thumbFileId`; `/ads/posts` thumbnail column + platform-glyph placeholder; i18n via Paraglide + `i18n:compile`.

## 11. Decisions (resolved by owner judgment — user delegated)

1. **Inline-capped mirror in the posts job** (no 4th job kind, no tick allowlist change). ✔
2. **FB `full_picture`**: attempt it; if gated behind `pages_read_user_content`, FB stays preview-less and IG-only thumbnails ship v1. Sync must tolerate the field being absent. ✔
3. **No resize v1** (no `sharp`). ✔
4. **Full backfill** of all ~342 posts (~50 MB). ✔
