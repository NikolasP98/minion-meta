---
'@minion-stack/auth': minor
---

Add `./client` subpath export with `createMinionAuthClient({ baseURL })` factory. Consolidates the identical Better Auth client setup previously duplicated in minion_hub and minion_site (Svelte adapter + `jwtClient` + `organizationClient` plugins).

Usage:

```ts
import { createMinionAuthClient } from '@minion-stack/auth/client';

export const authClient = createMinionAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
});
```

No breaking changes — the existing server-side `createAuth` factory (default export) is unaffected.
