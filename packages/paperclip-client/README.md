# @minion-stack/paperclip-client

Typed client for the Paperclip control plane HTTP API. Used by minion_hub to
proxy authenticated, company-scoped requests to a headless paperclip-server.

```ts
import { createPaperclipClient } from '@minion-stack/paperclip-client';

const client = createPaperclipClient({
  baseUrl: 'http://paperclip:3200',
  fetch: globalThis.fetch,
  headers: { 'x-hub-identity': '<jwt>' },
});

const summary = await client.dashboard.summary(companyId);
```

See `@minion-stack/paperclip-client/identity-jwt` for the JWT mint/verify
helpers consumed by both hub (mint) and paperclip-server (verify).
