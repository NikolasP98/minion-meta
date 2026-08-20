# @minion-stack/workforce-client

Typed client for the Minion Workforce control plane HTTP API. Used by minion_hub to
proxy authenticated, company-scoped requests to a headless workforce backend.

```ts
import { createWorkforceClient } from '@minion-stack/workforce-client';

const client = createWorkforceClient({
  baseUrl: 'http://paperclip:3200',
  fetch: globalThis.fetch,
  headers: { 'x-hub-identity': '<jwt>' },
});

const summary = await client.dashboard.summary(companyId);
```

See `@minion-stack/workforce-client/identity-jwt` for the JWT mint/verify
helpers consumed by both hub (mint) and workforce backend (verify).

## Error contract

The boundary is: **a successfully read HTTP response becomes a value or a
`WorkforceApiError`; a failure to fetch or read one propagates as-is.** A
transport rejection (DNS, `ECONNREFUSED`, abort, truncated body) is not an HTTP
response and is never laundered into a `WorkforceApiError`, which always carries
a real `status`.

Bodies are classified by whether they *parse*, never by the response's
`content-type` — misbehaving proxies are exactly the components least likely to
label their bodies correctly. `content-type` is recorded as diagnostic metadata
inside the error body.

`WorkforceApiError.message` is always `` `paperclip ${status}` ``; diagnostics
live in `body`, discriminated by `bodyKind`:

| `bodyKind` | When | `body` |
|---|---|---|
| `'json'` | non-2xx whose body parsed as JSON | the parsed error envelope |
| `'text'` | any status whose non-empty body did **not** parse as JSON — a proxy 502 page, a CDN interstitial, a login redirect | `{ raw: string; contentType: string \| null; truncated: boolean }` |
| `'empty'` | non-2xx with an empty body | `null` |

A non-JSON `2xx` throws as well: `request<T>()` promises `T`, and returning an
HTML page as `T` would move the failure to a confusing crash frames away. The
`status` carried is the real one.

`raw` is capped at `WORKFORCE_ERROR_RAW_LIMIT` (2048 code units, including an
appended `… [truncated N of M chars]` marker) with `truncated: true`. It is the
*response* text only — the request body, `headers`, URL, and query string are
never copied into the error.

⚠️ When `bodyKind === 'text'`, `raw` is an upstream error page and may contain
internal hostnames or paths. Log it server-side; do not forward it to a browser.

```ts
try {
  await client.dashboard.summary(companyId);
} catch (err) {
  if (err instanceof WorkforceApiError && err.bodyKind === 'text') {
    console.error('workforce upstream returned non-JSON', err.status, err.body);
    throw new Error('Workforce backend unavailable'); // generic — never the raw page
  }
  throw err;
}
```

An empty `2xx` still resolves to `null` (the `Promise<void>` endpoints), and
every JSON response behaves exactly as before.
