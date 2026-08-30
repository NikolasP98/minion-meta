# @minion-stack/workforce-client

## 0.5.0

### Minor Changes

- f0d848b: Non-JSON responses now reject with `WorkforceApiError` instead of a raw `SyntaxError`: a proxy 502 HTML page, CDN interstitial, or login redirect body reaches callers with the real `status` attached. A non-JSON `2xx` now throws too, rather than parsing and failing later.

  A new `bodyKind` field discriminates `'json' | 'text' | 'empty'`, and a `'text'` body is `{ raw, contentType, truncated }` with `raw` truncated to 2048 code units. Treat `raw` as an upstream error page — log it server-side rather than forwarding it to a browser.

  `Error.message` (`paperclip <status>`), the `status`/`body` field names, and all JSON behavior — including empty bodies resolving to `null` — are unchanged. Transport failures still propagate as-is.

## 0.4.0

### Minor Changes

- 8f984dd: Add typed Portfolio and Pipeline APIs (`portfolios`, `pipelines`) plus Issue type extensions (`pipelineId`, execution stage `meta`, `IssueExecutionDecision`) for the Universal Projects Module.
- 2ecc304: Expose Paperclip project `portfolioId` and stable `repositoryKey`/`groupKey` metadata so Workforce clients can render repository and concern groups without inferring them from display names or workspace paths.
- 8afa715: Carry a bounded, canonical role-key set in signed Workforce identity tokens so
  role-scoped human pipeline gates can be authorized by the control plane.

## 0.1.0

### Minor Changes

- 1fdabad: Initial release: typed paperclip API client + identity JWT helpers. Provides `createMinion WorkforceClient` factory with 24 domain modules (dashboard, sidebar-badges, activity, health, plus 20 Workforce domains) and `mintIdentity`/`verifyIdentity` for HS256 JWT auth between minion_hub and workforce backend.
