---
id: 2026-10-13-hub-first-paint-performance
title: Hub first paint — 478 KB brotli / 1.9 MB parse before a single pixel
status: draft
created: 2026-10-13
updated: 2026-10-13
repos: [minion_hub]
tags: [ui, logic]
value: 8
effort: L
source: hub-first-paint-performance-2026-10-13
---

# Hub first paint — 478 KB brotli / 1.9 MB parse before a single pixel

Owner report: "pages taking forever to load fresh." PostHog `$web_vitals` puts FCP at
≈3.2 s on `/en/login` (n=6) and 3.5–5.7 s on authenticated POS pages (appointments up
to 7.7 s), INP 200–300 ms — while the server answers in 5 ms. This proposal measures
where the gap goes and ranks the ways out. **No code change was made: every cheap win
is already in the tree.**

## AS-IS (measured 2026-10-13 against production)

### The server is not the problem

`GET https://hub.minion-ai.org/es/login` (unauthenticated, `curl`):

| | |
|---|---|
| TTFB | **0.42 s** |
| `server-timing` | `app;dur=5` |
| HTML payload | **2,117 bytes** |
| `content-encoding` on assets | `br` (brotli already on) |
| `Link:` response header | present, carries `rel="modulepreload"` for the whole entry graph |

So resource discovery and compression are already correct — Chrome starts every CSS and
JS fetch in one parallel wave off the `Link` header (confirmed in the trace: every
stylesheet starts at t≈3412 ms and every script at t≈3415 ms, i.e. together).

### The HTML contains no markup at all

`src/routes/+layout.ts` line 17: `export const ssr = false;`

The entire 2,117-byte document body is:

```html
<body data-sveltekit-preload-data="hover">
  <div style="display: contents">
    <script> __sveltekit_2ws21n = { … }; Promise.all([import(start), import(app)]).then(…) </script>
  </div>
</body>
```

There is **nothing to paint**. First Contentful Paint therefore cannot happen until the
full client module graph has been downloaded, parsed and executed. This is the
multiplier on every number below: it converts "bundle size" into "time to first pixel".

### What first paint actually waits for

Graph crawled transitively from the three real entry points of the login page
(`entry/start.Co1W3hNS.js`, `entry/app.I459NZf8.js`, `nodes/0.bmHr8jBe.js`), measured
as served:

| Class | Count | On the wire (br) | Decompressed (parse volume) |
|---|---|---|---|
| Render-blocking CSS | 8 | **56.9 KB** | **337.0 KB** |
| JS modules | 53 | **418.8 KB** | **1,548.1 KB** |
| HTML | 1 | 2.1 KB | 3.0 KB |
| **Total before first pixel** | **62** | **≈477.8 KB** | **≈1,888 KB** |

### Top 5 blockers

| # | Asset | br | raw | Why it is there |
|---|---|---|---|---|
| 1 | `chunks/0o58oGzS2.js` | **246.5 KB** | **1,059.2 KB** | Paraglide message barrel — **both locales**, see below |
| 2 | `assets/runtime.C_eAcuMt.css` | 30.3 KB | 215.2 KB | render-blocking global/theme CSS |
| 3 | `chunks/BRsfQLIL.js` | 31.2 KB | 87.7 KB | `@floating-ui` (`placement`/`reference`/`floating`) via Popover |
| 4 | `chunks/DS1ReIiv.js` + `chunks/gdLeRZPY.js` | 39.1 KB | 103.6 KB | gateway WS client + session state, pulled by root layout's `wsConnect` |
| 5 | `assets/ui.CX2G4sQT.css` | 18.0 KB | 85.4 KB | render-blocking CSS for the whole `ui` component set |

Blocker #1 alone is **59 % of the first-paint JS** and **56 % of the decompressed parse
volume of the entire page**.

### Blocker #1 in detail: both locales ship to every visitor

`@inlang/paraglide-sveltekit@^0.16.1` (deprecated, paraglide v1) compiles to:

```
src/lib/paraglide/messages.js          4.8 MB source   ← barrel
src/lib/paraglide/messages/en.js       780,827 bytes   47,626 lines
src/lib/paraglide/messages/es.js       807,332 bytes   47,626 lines
```

and `messages.js` is:

```js
import { languageTag } from "./runtime.js"
import * as en from "./messages/en.js"
import * as es from "./messages/es.js"
```

…followed by one `languageTag()` ternary wrapper per message. The shipped chunk contains
**6,743 occurrences of `languageTag`** — one per message — so every visitor downloads,
parses and instantiates **6,743 messages in Spanish plus 6,743 in English plus 6,743
dispatch wrappers**, regardless of their locale and regardless of which route they opened.
Roughly **half of those 246.5 KB is a locale the visitor will never read**, and the large
majority of the remainder is copy for routes that are not on screen.

This barrel is statically reachable from `src/routes/login/+page.svelte` itself, so it
cannot be dislodged by moving imports around — the login page genuinely renders
translated strings.

### Cheap wins are already taken

Worth recording so nobody re-audits this: `posthog-js` is already deferred to
`requestIdleCallback` (`src/hooks.client.ts`), Vercel Analytics and Speed Insights are
already lazy (`src/routes/+layout.ts`), and `Toaster`, `BugReporter`, `HostsOverlay` and
`VoxelShader` are already `{#await import(...)}` in the root layout. Three of the four
root-layout modules touching messages already use `await import('$lib/paraglide/messages')`
(`bug-reporter.svelte.ts`, `hosts.svelte.ts`, `gateway.svelte.ts`). `app.html` loads no
web font and carries no blocking script. There is no PixiJS, Rapier, ECharts, Carta, Yjs
or Sentry on the boot path.

The two remaining static `$lib/paraglide/messages` importers in the root-layout graph are
`src/lib/components/layout/GlobalActivity.svelte` (uses exactly one message,
`m.common_loading`, for an `sr-only` live region) and
`src/lib/services/gateway/chat-rpc.ts`. Converting them buys **zero bytes on any real
page**, because the login page and every `(app)` page import the barrel directly anyway.
That is why this proposal ships no diff.

### Caveat on the timing numbers

The wall-clock figures from the local headless trace (median DCL 5.7 s, `load` 5.7 s,
largest chunk still arriving at t≈11.9 s) are bandwidth-bound by this measurement host
(≈65 KB/s effective) and are **not** comparable to real-user timings. `paint` and
`largest-contentful-paint` entries were empty in headless, so FCP/LCP could not be
observed locally — PostHog's 3.2 s field FCP is the authoritative figure, and
≈478 KB br / ≈1.9 MB parse on an empty document is fully consistent with it. The byte
counts above are exact and come from production responses.

## TO-BE

Invariants that must hold after any of the work below:

1. First Contentful Paint on a cold `/{locale}/login` ≤ 1.2 s at p75 in PostHog field data.
2. A visitor downloads message catalogues for **one** locale, not two.
3. Locale switching keeps working without a full page reload, and `%paraglide.lang%` /
   `textDirection` in `src/app.html` stay correct.
4. No per-route `export const config` is introduced in `minion_hub` — see
   `specs/`/incident notes for 2026-10-11; function splitting breaks `/en|/es` routing.

## DELTA — ranked by bytes-or-ms saved per unit of effort

### D1 — Per-locale message splitting (migrate off paraglide v1 barrel)
**Saves ≈123 KB br / ≈530 KB raw (26 % of first-paint wire bytes, 28 % of parse volume). Effort: L. Risk: M.**
`@inlang/paraglide-sveltekit@0.16` is deprecated and its barrel inlines every locale by
construction. `paraglide-js` v2 compiles per-locale modules selected by a `strategy` and
is tree-shakeable, so a visitor loads one catalogue. The migration touches
`svelte.config.js` (the manual `sveltePreprocess` shim already pinned there for
vite-plugin-svelte 7), `src/lib/i18n.ts`, the `ParaglideJS` wrapper in
`src/routes/+layout.svelte`, and the `import * as m` call sites. Verify by re-running the
graph crawl in this document and asserting the barrel chunk is gone, not by eyeballing
Lighthouse.

### D2 — Re-enable SSR for the auth routes (`/login`, `/join`, `/invite`)
**Saves ≈2.7 s of perceived load on the page the owner actually complained about, with zero bundle change. Effort: M. Risk: M.**
These routes have no gateway WebSocket dependency and no client-only state; `ssr = false`
is inherited from the root layout, not required by them. Server-rendering them makes
first paint land at TTFB + CSS (≈0.6 s) instead of after 419 KB of JS. `ssr` is a
load-function export, **not** a Vercel `config` export, so it does not split functions —
but it must be added at the route group that contains only these pages, and every
component they mount must be SSR-safe (no bare `window`/`localStorage` at module scope).

### D3 — Trim render-blocking CSS
**Saves up to ≈30 KB br / ≈250 KB raw of blocking CSS. Effort: M. Risk: L (design governance applies).**
`runtime.css` (215.2 KB raw) and `ui.css` (85.4 KB raw) block paint on every page
including login, which renders a card and two inputs. Candidates: ship non-default theme
presets as separate non-blocking stylesheets, and stop having a single `ui` CSS asset
cover the whole component set. Must go through the `ui-design-governance` skill and keep
`lint:design` / `lint:tokens` debt non-increasing.

### D4 — Lazy-load the gateway WS client out of the root layout
**Saves ≈39 KB br / ≈104 KB raw. Effort: S. Risk: L.**
`src/routes/+layout.svelte` statically imports `wsConnect` from
`$lib/services/gateway.svelte`, which pulls `chunks/DS1ReIiv.js` + `chunks/gdLeRZPY.js`
(gateway client, session timers, channels) onto the critical path of the login page,
which never connects. `wsConnect` is already called from an async context, so
`const { wsConnect } = await import('$lib/services/gateway.svelte')` is close to a
one-liner. Small on its own; worth folding into D1 or D2 rather than its own PR.

### D5 — Make the blank-page interval visible instead of white
**Saves 0 bytes; moves FCP from ≈3.2 s to ≈0.6 s as the browser measures it. Effort: S. Risk: L, but it is a design change.**
With `ssr = false` the user sees white for the whole JS download. Static shell markup in
`src/app.html`, removed on mount, would give a branded first paint immediately after CSS.
This improves the reported metric and the felt experience without improving
interactivity, so it should be taken as a complement to D1/D2 and never as a substitute —
and it needs design sign-off, which is why it was not done here.

## Open ends

- `TODO(handoff): no local `bun run build` was run — the analysis uses the deployed
  immutable assets from `hub.minion-ai.org`, which are that same build output, so a
  rebuild would not change a number. If a future slice needs Vite's
  `.vite/manifest.json` chunk-ownership map (e.g. to attribute `runtime.css` for D3),
  build `origin/master` in a worktree and read
  `.svelte-kit/output/client/.vite/manifest.json`.
- `TODO(handoff): FCP/LCP could not be measured locally — `performance.getEntriesByType('paint')`
  is empty in the headless Chromium at `:9223`, and that browser also carries a live
  production session, so `/es/login` client-redirects to `/en/home` on load. Any future
  live trace of an unauthenticated page must use an isolated browser
  (`browser-harness-session watch …`), not the shared daemon. Field FCP must come from
  PostHog `$web_vitals`.
- `TODO(handoff): the `(app)` layout graph was only read at source level
  (`src/routes/(app)/+layout.svelte`, 15 static imports incl. `Topbar`, `Sidebar`,
  `AssistGuide`, `@tanstack/svelte-query`). The authenticated-page waterfall — where
  PostHog shows 3.5–5.7 s, and appointments 7.7 s — was not crawled, and it pulls a
  *second* mega-chunk (`chunks/DgvgMys0.js`, **257.6 KB br / 832.4 KB raw**, fingerprinted
  as Zod + Zag.js machines + an editor view layer). Attribute that chunk before costing
  POS-page work; it may share a root cause with D1.
- `TODO(handoff): `src/lib/components/layout/GlobalActivity.svelte` and
  `src/lib/services/gateway/chat-rpc.ts` keep static `$lib/paraglide/messages` imports.
  Harmless today (the barrel is on the critical path regardless), but they will silently
  re-pull the full barrel after D1 lands unless converted at the same time.
