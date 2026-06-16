# @minion-stack/workforce-client

## 0.1.0

### Minor Changes

- 1fdabad: Initial release: typed paperclip API client + identity JWT helpers. Provides `createMinion WorkforceClient` factory with 24 domain modules (dashboard, sidebar-badges, activity, health, plus 20 Workforce domains) and `mintIdentity`/`verifyIdentity` for HS256 JWT auth between minion_hub and workforce backend.
