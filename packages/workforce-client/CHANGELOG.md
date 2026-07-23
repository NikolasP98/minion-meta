# @minion-stack/workforce-client

## 0.4.0

### Minor Changes

- 8f984dd: Add typed Portfolio and Pipeline APIs (`portfolios`, `pipelines`) plus Issue type extensions (`pipelineId`, execution stage `meta`, `IssueExecutionDecision`) for the Universal Projects Module.
- 2ecc304: Expose Paperclip project `portfolioId` and stable `repositoryKey`/`groupKey` metadata so Workforce clients can render repository and concern groups without inferring them from display names or workspace paths.
- 8afa715: Carry a bounded, canonical role-key set in signed Workforce identity tokens so
  role-scoped human pipeline gates can be authorized by the control plane.

## 0.1.0

### Minor Changes

- 1fdabad: Initial release: typed paperclip API client + identity JWT helpers. Provides `createMinion WorkforceClient` factory with 24 domain modules (dashboard, sidebar-badges, activity, health, plus 20 Workforce domains) and `mintIdentity`/`verifyIdentity` for HS256 JWT auth between minion_hub and workforce backend.
