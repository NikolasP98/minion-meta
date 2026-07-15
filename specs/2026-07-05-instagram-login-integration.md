# Instagram API with Instagram Login — Implementation Blueprint

Status: DESIGN (no code written). Grounds a second, independent Meta auth family
alongside the existing Facebook-Login-for-Business (FLB) flow in `minion_hub`.
Verified against Meta's official docs (developers.facebook.com/docs/instagram-platform)
2026-07-05 via WebFetch/WebSearch — citations inline. Read this whole doc before
starting WP1; §7 has the parallelizable work-package breakdown.

## 1. Why a second flow

The existing `meta-connections.service.ts` / `graph-read.ts` / `meta-sync.service.ts`
stack is built entirely around **Facebook Login for Business**: a Facebook user
token, `graph.facebook.com`, IG assets discovered *indirectly* through
`instagram_business_account` on a Page. Spec `2026-07-04-meta-business-integration`
LIVE FACTS record that **this FLB login config grants no `instagram_*` scope** —
`igFound` is always 0 in production. "Instagram API with Instagram Login" is a
completely different product: a separate Instagram App (its own App ID/Secret,
registered under the Instagram product in the Meta App Dashboard, not the
existing Facebook app), a different authorize host, a different token, and a
different Graph host (`graph.instagram.com`) with no Page in between at all —
the IG professional account authenticates directly.

This is additive, not a replacement: the FLB connection (`kind='flb'`) keeps
running FB posts/ads/messages sync exactly as today. The new IG-Login
connection (`kind='ig_login'`, proposed) is a parallel, independent pipe that
only ever produces IG media rows.

## 2. Verified OAuth flow (Instagram API with Instagram Login)

Sources: Meta for Developers — "Business Login for Instagram"
(developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login),
"Oauth Authorize" reference, "Refresh Access Token" reference, "IG Media" field
reference. Fetched 2026-07-05 via WebFetch; treat exact param spelling as
high-confidence (fetched from the live doc), but see the caveats flagged below
where the summarizer's table read could be off — smoke-test before shipping,
same posture this codebase already takes for IG media-insight metrics
(`IG_MEDIA_METRICS_BY_TYPE` comment in `graph-read.ts`).

### 2.1 Authorization request

```
GET https://www.instagram.com/oauth/authorize
    ?client_id=<IG_APP_ID>
    &redirect_uri=<...>
    &response_type=code
    &scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish
```

- **Host is `www.instagram.com`**, NOT `api.instagram.com` — confirms one of
  the two hypotheses in the task brief. (`api.instagram.com` is only used for
  the short-lived token *exchange*, not the authorize redirect.)
- `client_id` is the **Instagram App ID** — a distinct app/credential pair from
  `META_APP_ID`/`META_APP_SECRET` used by the FLB flow. Do not reuse those env vars.
- Scope is confirmed comma-separated (space-separated URL-encoded also accepted
  per docs). Four scope tokens exist today:
  - `instagram_business_basic` — read-only basic profile/media (what we need)
  - `instagram_business_content_publish`
  - `instagram_business_manage_messages`
  - `instagram_business_manage_comments`
- Note (deprecation): Meta deprecated the *old* scope names (`instagram_graph_user_profile`,
  `instagram_graph_user_media`, etc.) on **January 27, 2025**. The four scopes
  above are the current names — use them as-is, no legacy fallback needed.
- For read-only media sync, request only `instagram_business_basic`.

### 2.2 Short-lived token exchange

```
POST https://api.instagram.com/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id=<IG_APP_ID>
client_secret=<IG_APP_SECRET>
grant_type=authorization_code
redirect_uri=<...>
code=<code>
```

Response (per Meta docs, standard shape — not independently re-fetched verbatim
this session, flagging per honesty policy): `{ access_token, user_id, permissions }`.
`permissions` is an array of granted scope strings on newer API versions; some
older responses omit it. Treat `access_token` + `user_id` as the load-bearing
fields; don't hard-fail on missing `permissions`.

This access token is short-lived (~1 hour) and scoped to `graph.instagram.com`
only — it is **not** interchangeable with an FB user/page token.

### 2.3 Long-lived token exchange

```
GET https://graph.instagram.com/access_token
    ?grant_type=ig_exchange_token
    &client_secret=<IG_APP_SECRET>
    &access_token=<short_lived_token>
```

Response: `{ access_token, token_type, expires_in }`, `expires_in` ≈ 5,184,000s
(60 days) — confirmed by docs ("valid for 60 days").

### 2.4 Refresh (before the 60-day expiry)

```
GET https://graph.instagram.com/refresh_access_token
    ?grant_type=ig_refresh_token
    &access_token=<current_long_lived_token>
```

**Correction vs. the task brief's assumption**: the refresh call is a
**different path**, `/refresh_access_token`, not `/access_token?grant_type=ig_refresh_token`.
Confirmed via the dedicated Meta reference page for this endpoint. The token
must be refreshed while still valid (Meta requires ≥24h since issuance/last
refresh and token not yet expired) — refreshing an already-expired token is
not possible; the connection must be re-authorized from scratch (same UX as
FLB `expired` status today).

### 2.5 Media read

```
GET https://graph.instagram.com/{ig-user-id}/media
    ?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url,username
    &access_token=<long_lived_token>
```

Fields confirmed to exist on the IG Media node (per the "IG Media" reference
page): `id`, `caption`, `media_type` (IMAGE/VIDEO/CAROUSEL_ALBUM),
`media_product_type` (AD/FEED/STORY/REELS), `permalink`, `timestamp`,
`like_count` (omitted if the owner hid like counts), `comments_count`,
`media_url` (omitted for copyrighted media), `thumbnail_url` (video only),
`username`.

**Unresolved caveat — flag before WP3 ships**: the auto-summarized fetch of
the field-reference table reported `caption` and `media_product_type` as
"Instagram API with Facebook Login only" / "Facebook Login only" — i.e.
possibly *not* available under `instagram_business_basic` via Instagram Login.
This directly contradicts the general expectation that a basic-read IG-Login
app can read captions. I could not independently re-verify this per-field
restriction with a second fetch (page structure resisted a clean re-parse) —
**this is exactly the kind of drift this codebase already treats as
live-verify-required** (see `graph-read.ts` header comment on IG media
insight metrics). Action: WP3 must do one live smoke-test call against a real
IG professional account authorized via this flow, requesting the full field
list, and drop any field that 400s — mirroring the existing
`fetchMetricsWithFallback` degrade-per-field posture, not a hard assumption
baked into a constant.

- No `read_insights`-style extra permission needed for `like_count`/
  `comments_count` — both are plain fields on the Media node under
  `instagram_business_basic`, matching the brief's assumption. (Contrast with
  the FLB path, where equivalent FB Page-post `reactions`/`comments` summaries
  are blocked without the unobtainable `pages_read_user_content` — see
  `PAGE_POST_FIELDS` comment in `graph-read.ts`. IG-Login media counts don't
  have that gate.)

### 2.6 appsecret_proof

Not mentioned anywhere in the fetched IG Media reference as required. This
matches community consensus: `appsecret_proof` enforcement is a
Facebook-Graph-specific App Dashboard setting ("Require App Secret for Server
Calls") tied to `graph.facebook.com` server calls; `graph.instagram.com`
Instagram-Login calls have never been reported to need it. **Confidence: high
but not from an explicit "not required" statement in Meta's docs** — recommend
the same one-line smoke-test WP3 already has to do for fields: fire one real
`graph.instagram.com/{id}/media` call without `appsecret_proof` and confirm no
code-100 "requires appsecret_proof" error. If it ever does start requiring it,
`GraphOpts.appSecret` already exists and computing the proof is a one-line
reuse — no new code needed, just pass the IG app secret through.

## 3. Env vars to add

Two new vars, mirroring the existing `META_APP_ID`/`META_APP_SECRET` naming
(`.env.example` lines 64-66):

```
META_IG_APP_ID=
META_IG_APP_SECRET=
```

No `META_IG_LOGIN_CONFIG_ID` — Instagram Login has no FB-style "Login Config"
concept; `config_id` is FLB-specific (it's how FB Login for Business selects a
pre-configured permission bundle). The IG authorize URL takes `scope` directly.

Redirect URI is derived, same pattern as the FB flow: `${hubBaseUrl()}/api/meta/ig/callback`
— must be registered as a Valid OAuth Redirect URI on the Instagram App's
own product config (separate registration from the FLB app's redirect URI).

## 4. New routes

Mirror `src/routes/api/meta/oauth/{start,callback}/+server.ts` file-for-file,
new directory `src/routes/api/meta/ig/{start,callback}/+server.ts`.

### `GET /api/meta/ig/start`

Same shape as `oauth/start/+server.ts` with these deltas:
- `requireMetaEnv()` → new `requireMetaIgEnv()` returning `{ igAppId, igAppSecret }`
  (no `loginConfigId`). Throws the same style of error if either var is unset.
- State cookie: reuse `signOAuthState`/`OAUTH_STATE_TTL_MS` from
  `oauth-state.ts` as-is (org+userId+nonce+ts, HMAC'd) — but use a **distinct
  cookie name**, e.g. `meta_ig_oauth_state`, so a concurrent FLB-connect and
  IG-connect (unlikely but possible — two browser tabs) don't clobber each
  other's state cookie.
- `stateSecret()` in `oauth-state.ts` currently falls back through
  `META_APP_SECRET || ENCRYPTION_KEY || BETTER_AUTH_SECRET`. That's fine
  unchanged for the IG flow too — the signing secret doesn't need to be the IG
  app secret, it's an internal anti-CSRF token, not part of the Meta protocol.
  No change needed to `oauth-state.ts` itself.
- Redirect target:
  ```
  https://www.instagram.com/oauth/authorize?client_id=<igAppId>&redirect_uri=<hubBaseUrl>/api/meta/ig/callback&response_type=code&scope=instagram_business_basic&state=<state>
  ```
  (no `config_id` param — that's FLB-only.)

### `GET /api/meta/ig/callback`

Same shape as `oauth/callback/+server.ts` with these deltas:
- Reads the `meta_ig_oauth_state` cookie (not `meta_oauth_state`).
- Calls a new `createIgConnectionFromOAuth(ctx, { code, redirectUri, connectedBy })`
  in `meta-connections.service.ts` (see §6) instead of `createConnectionFromOAuth`.
- Redirect targets stay `/ads/settings?connected=1|0&reason=...` — same UX
  surface, second button.
- No `enqueueInitialSyncJobs` reuse as-is (see §8 — needs a job kind or a
  connection-kind-aware dispatch); call whatever the sync-integration WP
  decides (`enqueueInitialSyncJobs(ctx)` already enqueues a `'posts'` job that
  is connection-agnostic per org — likely fine to reuse unchanged, since
  `getUsableConnection` picks "a" non-revoked connection. **This is the
  sharpest open design question — see §8**).

RBAC: identical to the FLB routes — `requireOrgCapability(locals, 'ads', 'manage')`.
No tick-allowlist change needed; these are interactive user-session routes, not
cron endpoints (`hooks.server.ts`'s unauth allowlist only covers
`/api/meta/sync/tick`, and these new routes require an authenticated session
same as `oauth/start`/`oauth/callback` do today).

## 5. `graph-read.ts` additions

`graph-read.ts` is deliberately env-free (`GraphOpts.baseUrl` override exists
precisely for this). Reuse the module, don't fork it:

- `DEFAULT_GRAPH_BASE_URL = 'https://graph.facebook.com'` stays the default;
  IG-Login calls pass `{ baseUrl: 'https://graph.instagram.com' }` explicitly.
- **`graphVersion` doesn't apply** to `graph.instagram.com` — that host is
  unversioned (no `/v23.0/` segment; endpoints are `graph.instagram.com/{id}/media`
  directly). `buildUrl()` currently always inserts `/${o.graphVersion}/` —
  this needs a small conditional: skip the version segment when
  `baseUrl.includes('graph.instagram.com')`, or add a `versioned?: boolean`
  GraphOpts flag defaulting true. Cheapest fix: `graphVersion: ''` doesn't
  work cleanly (leaves a stray `//`) — add the explicit flag.
- New token-exchange functions (the existing `exchangeCodeForToken`/
  `extendUserToken` are FB-shaped: they call `{baseUrl}/{version}/oauth/access_token`
  with `fb_exchange_token`/`grant_type` params that don't match the IG grant
  types or the IG refresh endpoint's different path):
  - `exchangeIgCodeForToken({ appId, appSecret, code, redirectUri }, opts)` →
    `POST https://api.instagram.com/oauth/access_token` (form-encoded body,
    not query string — different from the FB exchange, which is GET-with-query-params
    per the existing `exchangeCodeForToken`/`buildUrl` pattern). This is a
    genuinely different HTTP shape, not a param tweak — needs its own fetch call,
    can't reuse `buildUrl`/`graphRequest`.
  - `exchangeIgLongLivedToken({ appSecret, shortToken }, opts)` →
    `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&...`
    — this one CAN reuse `buildUrl` with `baseUrl: 'https://graph.instagram.com'`
    and the unversioned flag.
  - `refreshIgToken({ token }, opts)` → `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...`
    — same unversioned `buildUrl` reuse, different path.
- **`listIgMedia` already exists** (line ~399) and is correct for the IG-Login
  case too: `${igId}/media` with the field list already matches (`id,caption,
  media_type,permalink,timestamp,like_count,comments_count` — missing
  `media_product_type`, `media_url`, `thumbnail_url`, `username` vs. what's
  newly available; extend `IG_MEDIA_FIELDS` once the §2.5 caveat is
  smoke-tested, since the FLB path calls this same function and would benefit
  too). **Routing change**: today `listIgMedia(igId, pageToken, ...)` is only
  ever called from `meta-sync.service.ts`'s `syncPosts` with a **Page token**
  and the FB `graph.facebook.com` base (implicit default). For an IG-Login
  connection, call the same function with the **IG user's own long-lived
  token** and `{ baseUrl: 'https://graph.instagram.com', appSecret: undefined }`
  (no page in the loop at all, no `appsecret_proof`). `igMediaInsights` is
  FB-Graph-only (`/insights` edge isn't part of Instagram Login's basic scope —
  that needs the Business Discovery / Graph-with-Page path) — **do not** call
  it for IG-Login connections; the fallback engagement rows
  (`fallbackEngagementRows`, already IG-branch-aware) are the only rows this
  new pipe produces, which is fine — see §6.

## 6. `meta-connections.service.ts` changes

- `requireMetaIgEnv()`: new function next to `requireMetaEnv()`, reads
  `META_IG_APP_ID`/`META_IG_APP_SECRET` from `$env/dynamic/private`, throws if
  either is missing — same shape as the existing function, ~5 lines.
- `createIgConnectionFromOAuth(ctx, { code, redirectUri, connectedBy }, opts)`:
  new function parallel to `createConnectionFromOAuth`. Flow:
  1. `exchangeIgCodeForToken` → short-lived token + `user_id`.
  2. `exchangeIgLongLivedToken` → long-lived token + `expires_in` (always
     present here, unlike FLB's "0 = never" case — IG tokens always expire in
     ~60 days, no never-expiring variant).
  3. `encrypt(accessToken)` (reuse `$server/auth/crypto`, same AES-256-GCM).
  4. Upsert `meta_connections` with **`kind: 'ig_login'`** (new kind value —
     `metaConnections.kind` is a bare `text()` column, no CHECK constraint per
     the schema read, so no migration needed for the value itself — but the
     `fbUserId` column is reused to store the **IG user id** for this kind;
     consider it semantically "external user id" even though the column name
     says `fb_user_id`. Renaming the column is out of scope / not worth a
     migration for one repurposed column — `ponytail: reuse fbUserId as the
     generic external-user-id slot for this kind, rename only if a third auth
     family needs a clearer name`).
  5. Skip `debugToken`/`extendUserToken`/`listPagesWithTokens`/`listAdAccounts`
     entirely — none of that FB-specific asset-discovery exists for IG Login;
     there is exactly one asset: the authenticated IG user itself.
  6. Upsert a single `meta_assets` row: `kind: 'ig'` (reuse the existing kind —
     it already means "an Instagram professional account" everywhere else in
     the schema/UI; no new asset kind needed), `externalId: <ig user_id>`,
     `name: null` (username isn't returned by the token exchange — fetch it
     lazily on first sync via the `/media` call's `username` field, or add one
     `GET graph.instagram.com/{id}?fields=username` call right here — cheap,
     one extra request, worth it for a readable settings-page label).
     `parentPageId: null` (no page — this is the key discriminator the sync
     dispatcher uses to skip the FB-only page-token lookup path, see §7).
  7. `ensureAccountInScope(ctx, 'instagram', igUserId, username)` — same CRM
     harvest auto-registration the FLB path already does for its IG assets;
     reuse verbatim.
  8. Return the same `OAuthExchangeResult`-shaped envelope (or a slimmed
     variant — `pagesFound`/`adAccountsFound` are meaningless here; either
     hardcode them to 0 or introduce a distinct return type — the callback
     route only reads `.ok`/`.error`/`.connectionId` today so a slimmed type is
     fine and honestly clearer).
- **Uniqueness**: `meta_connections_org_kind_fbuser_uniq` is `(orgId, kind,
  fbUserId)` — `kind='ig_login'` + the IG user id as `fbUserId` gives a clean
  natural key, re-running the OAuth flow updates the same row via
  `onConflictDoUpdate` exactly like the FLB path. No schema change needed.

## 7. `meta-sync.service.ts` changes

This is the part that most needs care, because `syncPosts` currently assumes
every non-FB-page target (`kind==='ig'`) hangs off a **parent page's token**
(`parentPage?.pageTokenCiphertext`) and always calls the FB Graph host. An
IG-Login asset has no parent page and its *own* token lives on the
**connection**, not the asset (mirroring how the FLB user token lives on
`meta_connections.tokenCiphertext`, not on any one asset).

Design: give `syncPosts` a login-family branch keyed off whether the owning
connection is `kind==='ig_login'`:

```ts
// in the per-target loop, when platform === 'ig':
const owningConnection = /* look up which connection this ig asset belongs to */;
if (owningConnection.kind === 'ig_login') {
  // token comes from the CONNECTION, not a parent page asset
  const igToken = decryptOrNull(owningConnection.tokenCiphertext, owningConnection.tokenIv);
  if (!igToken) { counts.igSkipped++; continue; }
  page = await listIgMedia(asset.externalId, igToken, { since }, {
    baseUrl: 'https://graph.instagram.com',
    // no appSecret — see §2.6 caveat; add IG_APP_SECRET only if the
    // smoke-test in WP3 proves it's actually required
  });
  // igMediaInsights is NOT called for this branch — Instagram Login's
  // instagram_business_basic scope doesn't grant /insights (that needs the
  // FB-Login Business Discovery path). fallbackEngagementRows already covers
  // like_count/comments_count → reactions_total/comments_total, unchanged.
} else {
  // existing FLB-via-parent-page path, unchanged
}
```

Practical concern: `runJob`'s current shape does `const assets =
(await listAssets(ctx, connection.id)).filter(a => a.enabled)` — assets are
already scoped to **one connection** (`connectionId` param). Since an IG-Login
connection's job only ever contains the single IG asset, `syncPosts` doesn't
actually need the "which connection owns this asset" lookup above at
all — **the connection is already known in `runJob`'s scope** (it's the
`connection` variable). Pass `connection.kind` down into `syncPosts` as a
parameter instead of re-deriving it — simpler, no extra query. Coexistence
with the FLB connection's own sync: `getUsableConnection` today does
`all.find(c => c.status !== 'revoked')` — **first match wins, silently
ignoring every other active connection**. That's already a latent bug for
"two connections active" (FLB is already the only case that exists, but two
IG-Login orgs — or an org with both FLB and IG-Login active — would only ever
sync whichever connection sorts first). This blueprint's scope should either:
(a) make `runJob` iterate **all** non-revoked connections for the org and
claim one job-per-connection (bigger change, touches `meta-sync-jobs.service.ts`'s
job model — jobs are currently `(orgId, kind)` unique, not
`(orgId, kind, connectionId)`), or (b) accept — same posture as everything else
in this stack — a documented single-connection-per-org limitation for this
first cut, since the primary customer (FACES) will have exactly one FLB + one
IG-Login connection eventually and (a) is real schema work. **Recommend (b)
now, flag (a) as a follow-up** — this is the single biggest scope decision in
this blueprint and should be confirmed with the user before WP5 starts, not
assumed.

Writes: `platform: 'ig'` rows into `meta_post_insights` exactly as today —
`fallbackEngagementRows`'s existing `else` branch (non-`fb`) already maps
`like_count`→`reactions_total`, `comments_count`→`comments_total` — **zero
changes needed there**, it was written platform-agnostic from the start.

Token refresh hook: `classifyExpiry`/`markConnectionStatus` already generalize
across connection kinds (`tokenExpiresAt` is a plain column on
`meta_connections`, not FLB-specific). The one gap: nothing currently *calls*
`extendUserToken`/refresh on a schedule outside the OAuth callback's initial
extend — for FLB this doesn't matter because business system-user tokens are
usually never-expiring (comment in `meta-sync.service.ts` line 741). For
IG-Login, tokens **always** expire in 60 days and must be actively refreshed.
Add the refresh call inside `runJob`, right where `classifyExpiry` already
returns `'expiring'` (7-day-left threshold, unchanged) — when
`connection.kind === 'ig_login'` and status flips to `'expiring'`, call
`refreshIgToken` there-and-then, re-encrypt, update `tokenExpiresAt`, and only
fall through to `'expired'`/job-failure if the refresh call itself fails. This
reuses the existing tick cadence (`/api/meta/sync/tick` cron) as the refresh
trigger — no new scheduled job needed.

## 8. UI

- `/ads/settings` (`src/routes/(app)/ads/settings/+page.svelte`): add a second
  connect button next to the existing FLB one (line ~111/151 pattern:
  `<Button ... href="/api/meta/oauth/start">`) → `href="/api/meta/ig/start"`,
  same `disabled={!canManage}` gating. Needs its own connection-status card
  (the existing one reads a single connection; either generalize the
  `+page.server.ts` load to return a list keyed by `kind` and render two
  cards, or duplicate the card block — given there'll only ever be 2 kinds,
  duplicating the small card block is the lazier, more honest option here;
  don't build a generic N-connections list for 2 fixed kinds).
- `/ads/posts`: **no change needed** — `platform` filter (`fb`/`ig` toggle,
  `+page.server.ts` line 13-14, `+page.svelte` line 89-91) is already
  platform-keyed off `meta_post_insights.platform`, not off which connection
  produced the row. IG-Login rows land with `platform: 'ig'` and show up in
  the existing Instagram filter automatically.

## 9. RBAC

Reuses the existing `'ads'` module capability wholesale — `requireOrgCapability(locals,
'ads', 'manage')` on both new routes, identical to the FLB pair. No new
capability, no new RBAC entry, no nav change (the `/ads/settings` page is
already gated and already in nav). The new routes are user-session OAuth
redirects, **not** cron endpoints, so they must NOT be added to the
`hooks.server.ts` unauth tick allowlist (that's exclusively for
`/api/meta/sync/tick`, which authenticates via a different mechanism — see
`hub-netcup-cron-ticks` memory).

## 10. Work-package breakdown

Sized for parallel Sonnet subagents with disjoint file ownership. Suggested
order: WP1 → (WP2, WP3 in parallel) → WP4 → (WP5, WP6 in parallel) → WP7.
Dependencies noted per WP.

| WP | Scope | Files (exclusive ownership) | Depends on |
|----|-------|------------------------------|------------|
| **WP1** | Env plumbing + `graph-read.ts` IG primitives | `.env.example` (add 2 vars); `graph-read.ts` (add `versioned` opt to `buildUrl`/`resolveOpts`, `exchangeIgCodeForToken`, `exchangeIgLongLivedToken`, `refreshIgToken`; extend `IG_MEDIA_FIELDS` **only after** the WP3 smoke-test confirms which fields are safe — land the extra fields as a follow-up commit, don't block WP1 on it); `graph-read.test.ts` (unit tests for the 3 new functions, injected `fetchImpl`, no network) | none |
| **WP2** | OAuth routes | new `src/routes/api/meta/ig/start/+server.ts`, new `src/routes/api/meta/ig/callback/+server.ts` (mirror the FLB pair exactly, swap env fn + cookie name + authorize URL) | WP1 (needs `requireMetaIgEnv` from WP4, can stub/mock in the meantime — or land WP2 after WP4) |
| **WP3** | Live smoke-test (manual/scripted, not unit tests) | none committed except maybe a throwaway script in scratchpad — this WP's deliverable is a short written confirmation of: (a) which `IG_MEDIA_FIELDS` actually resolve under `instagram_business_basic` via Instagram Login, (b) whether `appsecret_proof` is required on `graph.instagram.com`. Feeds back into WP1's field list. | Needs a live IG Business/Creator account + a registered Instagram App — **this WP needs Nikolas to actually authorize once**, can't be done by a subagent alone |
| **WP4** | `meta-connections.service.ts` additions | `requireMetaIgEnv()`, `createIgConnectionFromOAuth()`; `meta-connections.service.test.ts` (unit tests, mock `fetchImpl` + `withOrgCore`) | WP1 |
| **WP5** | `meta-sync.service.ts` sync-branch + refresh hook | `syncPosts`'s ig_login branch, `runJob`'s refresh-on-expiring hook, the `getUsableConnection` single-connection decision (confirm (b) from §7 with the user first) | WP1, WP4 |
| **WP6** | UI: second connect button + status card | `src/routes/(app)/ads/settings/+page.svelte`, `+page.server.ts` (if the load needs to return both connections) | WP2, WP4 (needs the route + connection shape to exist, but can be stubbed against the FLB shape and adjusted) |
| **WP7** | End-to-end wiring + `bun run check`/`test` green | Nothing new — glue/verification pass across WP1-WP6, run the full suite, fix any cross-WP seams (e.g. the connection-kind param threading into `syncPosts`) | WP1-WP6 |

Each WP that touches `meta-sync.service.ts` or `meta-connections.service.ts`
should re-read this blueprint's §7 "single-connection-per-org" open question
before writing code — it's a real design fork, not an implementation detail.

## 11. Summary of corrections vs. the task brief's assumptions

1. Authorize host **is** `www.instagram.com/oauth/authorize` — confirmed, not
   `api.instagram.com` (that host is exchange-only). Matches the brief's
   primary hypothesis.
2. Short-lived exchange: confirmed `POST api.instagram.com/oauth/access_token`,
   `grant_type=authorization_code`, matches the brief.
3. Long-lived exchange: confirmed `GET graph.instagram.com/access_token?grant_type=ig_exchange_token`, ~60 days, matches the brief.
4. **Refresh endpoint differs from the brief's assumption**: it's
   `GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...`
   — a distinct path (`/refresh_access_token`), not `/access_token` with a
   different `grant_type` value. This is the one concrete factual correction.
5. Media fields: brief's list confirmed present on the IG Media node, but an
   automated doc fetch flagged `caption` and `media_product_type` as possibly
   Facebook-Login-only — **unresolved, needs WP3's live smoke-test**, don't
   trust either the brief's optimistic assumption or the fetch's pessimistic
   read without a real API call.
6. `appsecret_proof` on `graph.instagram.com`: no explicit "not required"
   statement found, but nothing in the docs mentions it either — treat as
   "believed not required, verify live in WP3", matching the brief's guess.
7. Scope token for basic read: confirmed `instagram_business_basic`, matches
   the brief exactly.
