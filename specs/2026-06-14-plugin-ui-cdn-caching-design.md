# Plugin UI — CDN + Caching Design

**Date:** 2026-06-14
**Author:** orchestrator (Claude)
**Status:** Phase 0 caching headers SHIPPED (gateway code); Phase 2 hub seam
SHIPPED (`PUBLIC_PLUGIN_UI_BASE_URL`); Phase 1 CF = runbook below, awaiting ops
**Scope:** `minion/extensions/*/ui/dist` static delivery, hub embedding, Cloudflare

---

## Decision update (2026-06-15) — topology verified, plan staged

**Verified runtime topology:** the browser opens the gateway WebSocket
**directly, client-side** (`minion_hub/src/lib/services/gateway.svelte.ts:204`),
using a **user-configured gateway URL** (a `Host` record — public or Tailscale).
The plugin iframe loads its assets from that **same URL**
(`PluginIframe.svelte:174`). Plugin RPC rides that same browser-held WS via
postMessage to the host — not a separate connection.

**Consequence:** "Tailscale-only" gates the **entire** hub↔gateway link, not just
plugin UIs. The scalability bottleneck for going public is the **gateway
WebSocket being publicly reachable**, NOT the static assets. A CDN on assets
alone cannot serve off-tailnet users — the WS must be public too.

**Decision (from interview):** Tailscale = private admin/SSH/dev plane;
Cloudflare-fronted **public gateway hostname** = the scale plane. They coexist.
"Front existing with CF proxy" solves WS + assets in one move (CF proxies
WebSockets and edge-caches assets) — **iff the gateway has a public hostname.**

**Staged plan:**
- **Phase 0 (done):** caching headers — helps tailnet users too.
- **Phase 1 (going public):** give netcup a public hostname for the gateway →
  orange-cloud it (CF WAF + rate-limit + cache rule scoped to `/plugins/*/ui/*`).
  WS + assets go public + edge-cached together. Keep Tailscale for admin/SSH.
- **Phase 2 (only if UI deploy cadence hurts):** split plugin dist → CF Pages/R2,
  flip hub `PUBLIC_PLUGIN_UI_BASE_URL`. Full decouple.

**Open gate (user's call):** does the netcup VPS have a public IP we're willing
to expose the gateway on — behind Cloudflare WAF + the gateway's own token auth?
If no (gateway must stay fully private), "public soon" is impossible via any CDN
and needs a different ingress design.

---

## TL;DR

1. **Caching headers — DONE.** `minion/src/gateway/plugin-ui-static.ts` now emits
   `Cache-Control` + strong `ETag` + `304` on conditional requests. Hashed
   `assets/*` bundles → `public, max-age=31536000, immutable`; entry HTML
   (`index.html` / `control.html`) → `no-cache` (revalidate, cheap 304). This is
   the prerequisite for *any* CDN and already helps repeat loads on its own.
2. **Reactivity is unaffected.** Svelte reactivity is 100% client-side runtime;
   the CDN only changes how fast static assets arrive on *first* load. The live
   data path (config, RPC, updates) runs over the gateway WebSocket **through the
   hub**, untouched by asset delivery. A CDN can only make slot-open *faster*,
   never less reactive — provided HTML never goes stale (the `no-cache`+ETag
   strategy guarantees that).
3. **Cloudflare fit is shaped by topology.** The hub reaches the netcup gateway
   over a **Tailscale CGNAT IP (100.80.222.29)** — Cloudflare cannot front a
   private address. But the plugin UI iframe is **purely static + postMessage**
   (verified: no plugin UI opens its own `fetch`/WS/`EventSource`; all data goes
   through `bridge.call` → host → host's gateway WS). So the **static asset
   origin can be fully decoupled** from the gateway data path and served from a
   public Cloudflare origin without touching reactivity.

---

## Why reactivity does not change

The concern: "will moving plugin UIs to static CDN delivery make the hub feel
less reactive?" No. The data flow proves it:

```
[plugin iframe SPA]  --postMessage(bridge.call)-->  [hub host page]
                                                        |
                                                        |  gateway WebSocket (Tailscale/HTTPS)
                                                        v
                                                  [netcup gateway] --RPC--> data
```

- The iframe **never** talks to the gateway directly. It loads its JS/CSS once,
  then communicates only via `postMessage` to its parent (the hub). Confirmed by
  grep: no `new WebSocket`, `fetch(`, `EventSource`, or `gatewayUrl` anywhere in
  `extensions/*/ui/src` — only `bridge.call`.
- Therefore the **only** thing a CDN influences is the one-time download of the
  static bundle when a plugin slot first mounts. Everything after that — Svelte
  signals, the postMessage handshake, RPC round-trips — is identical regardless
  of where the bytes came from.
- Net effect on "unified feel": **positive**. Edge-served, immutable-cached
  bundles make each slot-open paint faster and removes the repeated full
  re-download the current no-cache-header behavior causes.

The single way a CDN *could* hurt unified feel is **stale HTML** (a deploy that
doesn't show up). The shipped header strategy prevents this: entry HTML always
revalidates via ETag, so a new `dist` is visible immediately; only the
content-hashed `assets/*` (whose filenames change on every build) cache forever.

---

## What shipped (caching headers)

`minion/src/gateway/plugin-ui-static.ts`:

- Strong `ETag` = `"sha1(body)"` (base64url) on every 200. Stable across rsync
  redeploys of the same build (content-based, not mtime-based).
- `Cache-Control`:
  - `assets/*` (non-HTML) → `public, max-age=31536000, immutable`
  - everything else (HTML) → `no-cache`
- `If-None-Match` match → `304` with no body (cheap revalidation for HTML).
- CSP `frame-ancestors` unchanged; `X-Content-Type-Options: nosniff` kept.

Tests: `plugin-ui-static.test.ts` +3 cases (immutable asset headers, HTML
revalidate, 304 on matching ETag). **9/9 pass.**

This change is CDN-agnostic — it already improves browser caching and makes the
origin cheap to revalidate, whether or not Cloudflare is ever added.

---

## Cloudflare options

### Option A — orange-cloud the gateway host (zero hub change)

Put Cloudflare's proxy in front of the gateway's **public** hostname and add a
Cache Rule scoped to `/plugins/*/ui/*` that respects origin headers.

- **Pros:** no code beyond the shipped headers; gateway stays the single source
  of truth; version-lock with the gateway build preserved; WS proxies through CF.
- **Blocker:** the hub currently reaches the gateway at a **Tailscale CGNAT IP**
  (`100.80.222.29`). Cloudflare cannot front a private address. Option A only
  works for users who hit the gateway on a **public** hostname. If every hub→gw
  link is Tailscale, Option A is a non-starter.
- **Caveat:** orange-clouding the whole gateway host also fronts its WS/API/
  webhooks. CF supports WS but has a ~100s idle timeout — fine if the gateway
  heartbeats. Scope the Cache Rule tightly so only `/plugins/*/ui/*` is cached.

### Option B — decoupled public CDN origin (recommended)

Because the iframe is purely static, serve `extensions/*/ui/dist` from a
dedicated **public** Cloudflare origin, independent of the gateway data path.

Two equivalent back-ends:
- **Cloudflare Pages** — one project, deploy via `wrangler pages deploy` in CI;
  CSP via a `_headers` file.
- **R2 bucket + custom domain + Cache Rules** — upload dist on deploy; CF caches
  at edge.

Host shape: `https://plugin-cdn.minion-ai.org/plugins/<id>/ui/<subpath>` (mirror
the current path so only the origin changes).

Required header at the CDN (replacing what the gateway sets today):
- `Content-Security-Policy: frame-ancestors https://hub.minion-ai.org` (+ any
  other embedders) — set in `_headers` / Transform Rule / Worker.
- Respect the `Cache-Control` we already emit (or replicate it: immutable for
  `assets/*`, `no-cache` for `*.html`).

**Hub change required (small):** make the plugin-UI base URL configurable.
Today `PluginIframe.svelte` builds `\`${gatewayUrl}/plugins/${id}/ui/${sub}#hostOrigin=…\``.
Add a `PUBLIC_PLUGIN_UI_BASE_URL` (default = `gatewayUrl` for backward compat);
when set, build the iframe `src` from it instead. No bridge change — the
handshake already passes `hostOrigin` and is origin-agnostic, and RPC still
flows host→gateway, so the iframe origin is irrelevant to data.

- **Pros:** topology-independent (works regardless of Tailscale); global edge
  cache + HTTP/3 + auto-brotli; decouples a slow rsync-to-netcup from the data
  plane; preview deploys per plugin.
- **Cons:** breaks gateway↔UI version-lock — the bridge protocol becomes the
  explicit contract. Mitigate by deploying UI on the same cadence and/or
  embedding a build/version stamp. Self-hosted/offline installs must either keep
  the gateway-served path (the default) or point at a reachable CDN.

### Recommendation

Given the Tailscale topology, **Option B** is the robust target *because* the
iframe is purely static — the decoupling is safe and unlocks real edge benefits.
**Option A** is only worth it if/when the gateway gains a public hostname and you
want zero hub changes. Either way, the shipped caching headers are the
foundation and stand on their own.

---

## The rest (deploy pipeline + polish)

1. **Hub `PUBLIC_PLUGIN_UI_BASE_URL`** (Option B prerequisite) — single
   env-driven indirection in `PluginIframe.svelte`; defaults to `gatewayUrl`.
2. **CI deploy of dist** — on plugin UI change, `wrangler pages deploy` (Pages)
   or R2 upload, replacing/augmenting the rsync-to-netcup step. The dist folders
   are already committed and checked by `.github/workflows/plugin-ui-dist-check.yml`,
   so the deploy unit exists.
3. **`<link rel="preconnect">`** in the hub to the plugin UI origin so the TLS/DNS
   handshake is warm before the first slot opens — shaves perceived latency,
   reinforces "unified."
4. **Optional iframe prewarm** — mount likely-needed plugin iframes hidden so the
   handshake completes before the user navigates. Pure hub UX; independent of CDN.
5. **Brotli/HTTP3** — free with Cloudflare; no origin work. (Skip if staying on
   Option A gateway-only.)

Items 3–5 are polish; item 1–2 are the Option B enablement.

`PUBLIC_PLUGIN_UI_BASE_URL` (item 1) is **DONE**: `PluginIframe.svelte` reads it
via `$env/dynamic/public`; when set it overrides only the iframe asset base +
`pluginOrigin` (postMessage target), leaving `wsGatewayUrl` on the real gateway.
Unset → identical to today. Documented in `minion_hub/.env.example`. check 0/0/0,
plugin tests 10/10.

---

## Phase 1 runbook — expose gateway publicly behind Cloudflare (ops)

Decision (2026-06-15): expose the netcup gateway publicly, fronted by Cloudflare
WAF + the gateway's own token auth. Tailscale remains the private admin/SSH path.
This is operator work (DNS, CF dashboard, netcup) — not code.

1. **Public DNS:** create `gateway.minion-ai.org` → netcup's **public** IPv4
   (NOT the `100.80.222.29` tailnet IP). Confirm the gateway HTTP/WS listener
   binds a public interface (or front it with the existing reverse proxy).
2. **Cloudflare proxy:** add the record in Cloudflare as **proxied (orange
   cloud)**. CF terminates TLS and proxies WebSockets transparently.
3. **Cache Rule** scoped to `Host eq gateway.minion-ai.org and starts_with(http.request.uri.path, "/plugins/") and http.request.uri.path contains "/ui/"`:
   - Eligible for cache: **on**; Edge Cache TTL: **Respect origin headers**
     (the gateway now emits `immutable` for `assets/*`, `no-cache` for HTML).
   - Do NOT add a blanket cache rule — the WS/API/webhook paths must stay
     uncached and pass through.
4. **WAF / hardening:** enable a rate-limit rule on the gateway host; consider a
   WAF custom rule allowing only expected methods/paths. The gateway's token
   auth (`host:hello` carries the auth token via postMessage from the hub) is the
   real authz boundary — CF is defense-in-depth, not the gate. Plugin UI static
   assets are inert without `host:hello`, so public exposure of `/plugins/*/ui/*`
   leaks nothing.
5. **WebSocket timeouts:** CF idle-closes WS at ~100s; verify the gateway
   heartbeats inside that window (it should already — confirm before cutover).
6. **Cutover:** point each user's hub `Host` record `url` at
   `wss://gateway.minion-ai.org` (or update the netcup default). Now both WS and
   assets are public + edge-cached in one move. No `PUBLIC_PLUGIN_UI_BASE_URL`
   needed for Phase 1 (same-origin); reserve it for Phase 2 (separate CF Pages
   origin) if/when independent UI deploy cadence is wanted.

**Verify after cutover:** off-tailnet browser loads hub → connects WS → opens a
plugin slot → assets 200 from CF (check `cf-cache-status: HIT` on `assets/*`
after a warm-up, and `EXPIRED/REVALIDATED` or `DYNAMIC` on the HTML) → bridge
handshake completes → RPC works.

**Known follow-up (not blocking):** the hub's server-side diagnostic probe
(`/api/plugins/probe`) still targets the gateway base, not a CDN override. Only
matters under Phase 2 with a separate origin; revisit then.
