# @minion-stack/workforce-client

Typed client for the Minion Workforce control plane HTTP API. Used by minion_hub to
proxy authenticated, company-scoped requests to a headless workforce backend.

```ts
import { createMinion WorkforceClient } from '@minion-stack/workforce-client';

const client = createMinion WorkforceClient({
  baseUrl: 'http://paperclip:3200',
  fetch: globalThis.fetch,
  headers: { 'x-hub-identity': '<jwt>' },
});

const summary = await client.dashboard.summary(companyId);
```

See `@minion-stack/workforce-client/identity-jwt` for the JWT mint/verify
helpers consumed by both hub (mint) and workforce backend (verify).
