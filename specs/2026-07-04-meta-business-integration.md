# Meta Business Integration — Ads module, insights, CRM import (end-to-end)

**Date:** 2026-07-04 · **Supersedes:** the earlier `meta-insights-ads-pull` draft
**Session goal:** monitor FB/IG **ads spend + performance** and **post/page performance** in a new **Ads module (MARKETING nav)**; import **customer messages + contact data into the CRM**; leave rails for other ERP-useful Meta data. Test org: **FACES SCULPTORS**.

---

## 0. Verified current state (recon 2026-07-04)

### Meta side (from live browser)
| Fact | Value |
|---|---|
| Meta app | **MINION**, App ID `1807286783769178` |
| App state | **Unpublished (dev mode)**, use case = **Facebook Login for Business** ONLY |
| Login configuration | ✅ CREATED 2026-07-04: **"Core Manager"**, `config_id 1408426188155838` — variation **General**, token **System-user / Never expires**; assets Pages (required) + Ad accounts (task-perm ANALYZE) + Instagram accounts; scopes `ads_read, business_management, leads_retrieval, pages_messaging, pages_read_engagement, pages_show_list`. ⚠️This config type offers **NO `instagram_*` and NO `read_insights`** scopes — IG/deep-page insights need a second config using the **"Instagram Graph API"** login variation (fast-follow). `whatsapp_business_*` scopes ARE available here (future WA Cloud channel). |
| Valid OAuth redirect URIs | ✅ `https://hub.minion-ai.org/api/meta/oauth/callback` (SAVED). `http://localhost:5173/...` REJECTED by Enforce-HTTPS → dev OAuth tests go through the deployed hub (§10.6). |
| App submission eligibility | Dashboard flags missing: app icon 1024², privacy policy URL, user-data-deletion URL, category — needed only for the later PUBLISH milestone, not dev-mode FACES. |
| Dev Business Manager | `440419888340345` (MINION) |
| FACES Business Manager | `291450948393125` |
| FACES FB Page ID | `1966294667010147` |
| FACES IG id / Ad-account id | TBD — enumerated automatically post-OAuth (`/me/accounts?fields=instagram_business_account`, `/me/adaccounts`) |
| Page email warning | Recommendations-eligibility notice only — organic reach, **not** an API/review blocker |

**Critical unblocking fact:** Nikolas is admin of the app AND of the FACES business/page/ad account ⇒ **dev mode + Standard Access suffices for the FACES test org**. No App Review, no Business Verification needed for this session. Review/Advanced Access only gates *third-party* orgs later.

### Codebase (reuse targets — file paths verified)
- **Messaging channels (gateway)**: `minion/extensions/meta-graph/` — one app → `/meta` webhook → whatsapp-cloud/messenger/instagram channels. Built, but the app has no messaging products yet; realtime DM webhooks for real customers also require app Live + Advanced Access ⇒ **out of scope this session** (see §8).
- **Messages ledger (hub, Supabase PG)**: `messages` table + `insertMessages()` in `src/server/services/messages.service.ts`; CRM timeline is a VIEW over it; `crm_contact_identities` upserts on `(org_id, channel, external_id)` — **Meta DMs imported into this ledger surface in CRM automatically**.
- **Pull pipeline pattern**: `finance-sync-jobs.service.ts`, `finance-sync.service.ts`, `pg-finance-schema.ts` (cursor-resume jobs, batch upsert, tick).
- **Secrets**: `encrypt/decrypt` in `src/server/auth/crypto` (used by `finance-secrets.ts`).
- **OAuth callback precedent**: `src/routes/auth/callback`, `identity-secrets.ts` / `identity.service.ts`.
- **RBAC registries**: `src/lib/permissions.ts` (BUSINESS_PERMISSIONS, BUSINESS_ACTION_MODULES, MODULE_SUBRESOURCES, ROUTE_VIEW_PERMS), `src/lib/access/policy.ts` (ACCESS — ★`stock.view` was once missing here → nav bug; don't repeat), `src/hooks.server.ts` (API_WRITE_PREFIXES, cron-tick allowlist ~line 176), `rbac.service.ts` (BUSINESS_MODULES).
- **Nav**: Ads goes in `BUILTIN_PLUGIN_ITEMS` (`src/lib/components/layout/sections.ts`) with `category: 'marketing'` → lands under the MARKETING group next to CRM. Section side-menu mirrors `FinanceNav.svelte`.
- **Org**: FACES org_id `21e0601b-f632-43fd-8414-d644af4271f4` (slug `faces-sculptors`), hub DB = Supabase PG w/ org_guc RLS (`withOrgCore`), migrations = surgical `CREATE TABLE IF NOT EXISTS` SQL (NEVER `drizzle-kit push`).

---

## 1. Manual Meta-dashboard checklist (Nikolas, ~15 min — WP0)

1. **FLB → Configurations → Create configuration**
   - Assets: Pages, Instagram accounts, Ad accounts.
   - Permissions: `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, `instagram_manage_insights`, `ads_read`, `business_management`, `pages_messaging` (conversation read), `instagram_manage_messages` (IG DM read).
   - Save → copy the **`config_id`**.
2. **FLB → Settings → Valid OAuth Redirect URIs**: add
   - `https://hub.minion-ai.org/api/meta/oauth/callback`
   - `http://localhost:5173/api/meta/oauth/callback` (dev-mode apps accept localhost http; if the form refuses, use the prod URL only and test via prod)
   - Keep *Strict Mode* + *Enforce HTTPS* ON (localhost is exempt from HTTPS enforcement).
3. **App settings → Basic**: copy **App Secret**.
4. Hand over three values → hub env: `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID` (Infisical `minion-hub` + `.env.local` for dev; Vercel env for prod — remember the trailing-newline trap from `crm-cache-500-newline-rootcause`).
5. **Leave the app in dev mode.** Publishing + Business Verification + App Review (Advanced Access for the scopes above) is the later, third-party-org milestone.

> ⚠️ Scope names/review rules drift — verify against the current Graph changelog when submitting review later. Graph version pin: **v23.0** (matches the meta-graph extension floor).

---

## 2. Architecture

**Token model — RESOLVED 2026-07-04 (simpler than the original hybrid):** the FLB login configuration was created with **access-token type = System-user, expiration = Never**. The OAuth code exchange returns a **business system-user token in the client org's own portfolio** that does not expire. Consequences:
- **No token-refresh machinery needed.** `token_expires_at` stays null; the reconnect banner remains only for `revoked`/error states (org admin removed the integration in Business Settings).
- One token per org connection reads pages, conversations, **and ads** — the 60-day user-token problem is gone.
- Per-Page tokens from `/me/accounts` are still stored on assets when returned (used for page-scoped reads).
- Verify granted scopes + expiry post-exchange via `GET /debug_token`.
- All tokens **encrypted at rest** via `src/server/auth/crypto` `encrypt()/decrypt()` (ciphertext+iv columns, like finance creds).

**Data flow:**
```
[Connect Meta] → OAuth broker → meta_connections + meta_assets (org-scoped)
tick (cron) → meta_sync_jobs → Graph read client:
   pages/IG posts + insights  → meta_post_insights
   ad insights (level=ad,daily)→ meta_ad_insights
   page conversations+messages → insertMessages() [existing ledger] → CRM identities/timeline (existing harvest)
/ads module reads the meta_* tables; CRM reads nothing new.
```

---

## 3. DB schema — `src/server/db/pg-meta-schema.ts` (+ hand-written SQL migration w/ RLS)

All tables `org_id text not null`, org_guc RLS policies + `app_ledger` grants in `supabase/migrations/<ts>_meta.sql`, every query through `withOrgCore()`.

- **`meta_connections`** — one row per org connection.
  `id uuid pk, org_id, kind text 'flb'|'system_user', fb_user_id text, token_ciphertext text, token_iv text, token_expires_at timestamptz, granted_scopes jsonb, status text 'active'|'expiring'|'expired'|'revoked', connected_by text, created_at, updated_at`. `uniqueIndex(org_id, kind, fb_user_id)`.
- **`meta_assets`** — org ↔ asset bridge.
  `id uuid pk, org_id, connection_id uuid fk→meta_connections, kind text 'page'|'ig'|'ad_account', external_id text, name text, page_token_ciphertext text, page_token_iv text, parent_page_id text (for ig), currency text (for ad_account), enabled bool default true, meta jsonb, created_at`. `uniqueIndex(org_id, kind, external_id)`.
- **`meta_post_insights`** — post/media metric facts.
  `id uuid pk, org_id, asset_id uuid fk, platform text 'fb'|'ig', post_id text, permalink text, caption text, media_type text, posted_at timestamptz, metric text, value numeric, period text default 'lifetime', fetched_at`. `uniqueIndex(org_id, post_id, metric, period)` → idempotent upsert.
- **`meta_ad_insights`** — daily ad-level facts.
  `id uuid pk, org_id, ad_account_id text, campaign_id text, campaign_name text, adset_id text, adset_name text, ad_id text, ad_name text, date date, spend numeric, impressions integer, reach integer, clicks integer, ctr numeric, cpc numeric, actions jsonb, currency text, fetched_at`. `uniqueIndex(org_id, ad_id, date)`.
- **`meta_sync_jobs`** — clone of `fin_sync_jobs`: `id, org_id, kind text 'posts'|'ads'|'messages', status queued|running|succeeded|failed|cancelled, page_cursor text, since date, until date, counts jsonb, error text, started_at, finished_at, created_at` + partial `activeUq (org_id, kind) where status in ('queued','running')`.

Names/metrics deliberately narrow-but-jsonb-escape-hatched (`actions`, `meta`) — don't model Meta's whole ontology.

---

## 4. Graph read client — `src/server/services/meta/graph-read.ts`

Pure fetch helpers, injectable `fetchImpl`, unit tests with mocks. Base `https://graph.facebook.com/v23.0`. All return `{ ok, data, nextCursor?, error?, status }`; follow `paging.next` cursors; surface `X-Business-Use-Case-Usage` for rate awareness.

- `exchangeCodeForToken({code, redirectUri})` → `GET /oauth/access_token?client_id&client_secret&code`
- `extendUserToken(shortToken)` → `GET /oauth/access_token?grant_type=fb_exchange_token…` → long-lived
- `listPagesWithTokens(userToken)` → `GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username}`
- `listAdAccounts(userToken)` → `GET /me/adaccounts?fields=id,name,currency,account_status`
- `listPagePosts(pageId, pageToken, {since})` → `GET /{page}/posts?fields=id,permalink_url,message,created_time`
- `postInsights(postId, pageToken)` → `GET /{post}/insights?metric=post_impressions,post_impressions_unique,post_clicks,post_reactions_by_type_total`
- `listIgMedia(igId, pageToken, {since})` → `GET /{ig}/media?fields=id,caption,media_type,permalink,timestamp`
- `igMediaInsights(mediaId, pageToken, mediaType)` → `GET /{media}/insights?metric=reach,views,likes,comments,saved,shares` (metric set varies by media type — keep a per-type map; REELS differ)
- `adInsights(adAccountId, userToken, {since, until})` → `GET /act_{id}/insights?level=ad&fields=spend,impressions,reach,clicks,ctr,cpc,actions,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name&time_increment=1&time_range={...}`
- `listConversations(pageId, pageToken, {platform: 'messenger'|'instagram'})` → `GET /{page}/conversations?platform=…&fields=participants,updated_time,messages{id,from,to,message,created_time}`

> Insight metric names are the most drift-prone part of this spec (e.g. IG `impressions`→`views` migration). The implementing agent must smoke-test each metric against the live FACES assets and adjust the metric lists; unknown-metric responses must degrade per-metric, not fail the batch.

---

## 5. OAuth broker (hub routes)

- `GET /api/meta/oauth/start?org=<orgId>` — requires `ads:manage` capability on the org (RBAC). Sets an HMAC-signed `state` cookie (org, user, nonce, ts) → 302 to `https://www.facebook.com/v23.0/dialog/oauth?client_id=META_APP_ID&config_id=META_LOGIN_CONFIG_ID&redirect_uri=<canonical>&state=<sig>&response_type=code`.
- `GET /api/meta/oauth/callback?code&state` — verify state (sig + nonce + ≤10 min); exchange → extend → enumerate pages/IG/ad accounts → upsert `meta_connections` + `meta_assets` (encrypting tokens) → enqueue initial `meta_sync_jobs` (posts+ads+messages, since=90 d) → 303 to `/ads/settings?connected=1`.
- `POST /api/meta/assets/[id]/toggle`, `POST /api/meta/sync/run` (manual trigger), `DELETE /api/meta/connections/[id]` (disconnect, keeps data).
- Redirect URI must be built from the canonical public origin (`urls.ts` pattern), NEVER from request `Host` (open-redirect + signature hygiene).

---

## 6. Sync services + tick

- `meta-sync.service.ts` — per job kind:
  - **posts**: for each enabled page/ig asset → list posts/media since watermark (default 90 d) → fetch insights per post (bounded concurrency ~4, batch upsert ~100/tx) → advance cursor.
  - **ads**: for each ad_account → daily rows `since=max(watermark−2 d, 90 d ago)` (re-pull last 2 days for attribution restatement) → upsert on `(org, ad_id, date)`.
  - **messages**: list conversations (both platforms) → map to `IngestRow` (`channel: 'messenger'|'instagram'`, `sender_id` = participant PSID/IGSID, direction by `from`) → `insertMessages()`; contact display names → existing CRM harvest handles identity/contact creation.
  - Token expiry check first: <7 d → mark connection `expiring`; expired → job fails soft with `error='token_expired'`, connection `expired`.
- `meta-sync-jobs.service.ts` — clone of `finance-sync-jobs.service.ts` (enqueue/claim/heartbeat/complete; activeUq prevents double-run).
- `POST /api/meta/sync/tick` — claims due work (all orgs, bounded slice), Vercel-cron + netcup crontab.
  **MUST add `path === '/api/meta/sync/tick'` to the cron allowlist in `hooks.server.ts`** (~line 176) or it 401s (`hub-netcup-cron-ticks`).

---

## 7. Ads module UI (MARKETING nav)

Routes under `src/routes/(app)/ads/`:
- **`/ads`** — dashboard: KPI ribbon (spend, impressions, reach, clicks, CTR, CPC — period vs previous), ECharts spend-over-time + per-campaign bars, top posts by engagement. Load via `+page.server.ts` (org-scoped service reads). Follow the `dataviz` skill + finances-dashboard patterns (rAF `resize()` — `finances-dashboard-ui-fixes`).
- **`/ads/campaigns`** — campaign → adset → ad drill-down table (TanStack, sort/filter like `/finances/invoices`), spend/perf columns, date-range picker.
- **`/ads/posts`** — FB/IG post performance grid (thumb, caption, reach, engagement, permalink out-link), platform filter.
- **`/ads/settings`** — *Connect Meta* button (→ `/api/meta/oauth/start`), connection status + expiry/Reconnect banner, asset list w/ enable toggles, sync-job history (status, counts, errors), manual *Sync now*.
- **`AdsNav.svelte`** — clone `FinanceNav.svelte` (SideNav + `canViewPath` filter).
- **Nav entry** — `sections.ts` `BUILTIN_PLUGIN_ITEMS`: `{ category: 'marketing', item: { href: '/ads', label: m.nav_ads(), icon: Megaphone, matcher: p => p.startsWith('/ads'), requires: 'ads.view' } }`.
- **i18n**: all strings Paraglide `m.*()` en+es, `bun run i18n:compile`. **Svelte 5 runes only.** Note `{@const Icon=fn()}<Icon/>` SSR trap — use `{#if}` per `crm-detail-journey-redesign`.

## 7b. RBAC wiring (one WP owns ALL shared-file edits)

New business module **`ads`**:
1. `permissions.ts`: `BUSINESS_PERMISSIONS += 'ads:view'`; `BUSINESS_ACTION_MODULES += 'ads'`; `ROUTE_VIEW_PERMS += ['/ads','ads:view']`; `MODULE_SUBRESOURCES.ads = [{key:'ads.settings', label:'Settings', route:'/ads/settings'}]`.
2. `policy.ts` ACCESS: `'ads.view': { permission: 'ads:view' }` — ★the stock.view-missing bug; do not skip.
3. `rbac.service.ts`: add `'ads'` to `BUSINESS_MODULES` (+ Module type if a union).
4. `hooks.server.ts`: `API_WRITE_PREFIXES += ['/api/meta','ads']` + tick allowlist line.
5. Role-manager rows auto-derive from the registries; verify in `/settings` roles UI.
6. Writes (`oauth/start`, toggles, sync/run, disconnect) gate on `requireOrgCapability(locals,'ads','manage')`.

---

## 8. Explicitly out of scope this session (rails noted)

- **Realtime DM webhooks** (meta-graph gateway ext): needs messaging products on the app, app Live, Advanced Access — pull-based conversation sync covers FACES today; flip to webhooks at the third-party-org milestone.
- **Ads *management* (writes: budgets, pause/resume)**: `ads_management` scope + review; module named "Ads" so reads today, writes later.
- **Agent tools** (`ads_performance`, `post_performance` for copilots): follow the `crm_insight` tool pattern; small, do post-QA if session time allows.
- **System-User token override UI** (schema supports; add when first managed-business org needs it).
- **Third-party org onboarding**: Business Verification + App Review + Publish.

---

## 9. Work packages (Sonnet subagents) — waves

Contracts frozen by this spec: table/column names (§3), client function signatures (§4), route paths (§5), permission keys (§7b).

**Wave 1 (parallel, no FB-app dependency):**
- **WP1 — Schema+migration**: `pg-meta-schema.ts`, companion RLS SQL migration, apply to Supabase (surgical, IF NOT EXISTS), barrel exports. AC: tables live in PG w/ RLS policies; `bun run check` green.
- **WP2 — Graph read client**: `graph-read.ts` + unit tests (mock fetch: pagination, error envelope, token-expired classification). AC: `bun run test` green, no network in tests.
- **WP3 — RBAC + nav + module scaffold** (owns ALL shared files): §7b edits + `/ads` route skeletons + AdsNav + nav entry + i18n keys + empty-state pages. AC: `/ads` reachable for admin, hidden without `ads:view`, check+i18n green.

**Wave 2 (parallel after W1):**
- **WP4 — OAuth broker + connection service** (needs WP1+2 + WP0 env): start/callback/disconnect/toggle routes, state HMAC, token encrypt, asset enumeration upsert. AC: with FACES login, `meta_assets` has page+IG+ad-account rows.
- **WP5 — Sync services + tick** (needs WP1+2): jobs service, three sync kinds, tick route (+allowlist line via tiny coordinated edit or rebase after WP3), crontab note. AC: manual run on FACES fills `meta_post_insights` + `meta_ad_insights`; messages land in `messages` and CRM timeline shows them.
- **WP6 — Dashboard UIs on real shapes** (needs WP3 skeletons): `/ads`, `/ads/campaigns`, `/ads/posts`, `/ads/settings` full implementations. AC: renders FACES data; empty states for unconnected orgs; check green.

**Wave 3:** browser QA on FACES (connect → sync → dashboards → CRM timeline), fix-ups, memory + deploy prep (dev branch; hub deploy = push dev → `dev:master` FF).

Every WP: worktree isolation, `bun run check` + tests green before merge, RBAC checklist applies, no `drizzle-kit push`, commits scoped.

---

## 10. Risks / open questions

1. **IG metric drift** (`impressions`→`views` era) — smoke-test per media type against FACES; degrade per-metric.
2. **Conversations API depth** — messages field pagination is shallow per conversation; initial backfill may need per-conversation paging; cap at 90 d.
3. **IG DMs via `/conversations?platform=instagram`** — needs `instagram_manage_messages` grant in the login config; if IG conversation read misbehaves in dev mode, ship Messenger first, IG DMs as fast-follow.
4. **Ad attribution restatement** — 2-day re-pull window mitigates; totals may still shift slightly vs Ads Manager.
5. **Rate limits** — BUC limits per ad account are generous for 1 org; matters at N orgs (tick slices already bound this).
6. **localhost redirect URI** — if the dashboard form rejects http://localhost, dev-test OAuth against prod hub URL instead.
