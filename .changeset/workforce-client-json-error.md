---
"@minion-stack/workforce-client": minor
---

Non-JSON responses now reject with `WorkforceApiError` instead of a raw `SyntaxError`: a proxy 502 HTML page, CDN interstitial, or login redirect body reaches callers with the real `status` attached. A non-JSON `2xx` now throws too, rather than parsing and failing later.

A new `bodyKind` field discriminates `'json' | 'text' | 'empty'`, and a `'text'` body is `{ raw, contentType, truncated }` with `raw` truncated to 2048 code units. Treat `raw` as an upstream error page — log it server-side rather than forwarding it to a browser.

`Error.message` (`paperclip <status>`), the `status`/`body` field names, and all JSON behavior — including empty bodies resolving to `null` — are unchanged. Transport failures still propagate as-is.
