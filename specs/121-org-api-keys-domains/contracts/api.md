# Contract

## Public door endpoints (changed)

`POST /api/doors/public/{slug}/submit` and `POST /api/doors/public/{slug}/upload?field=&name=` keep their bodies and answers. New, optional request headers:

| Header | Meaning |
|---|---|
| `Authorization: Bearer mk_<prefix>_<secret>` | organization API key |
| `x-minion-visitor-ip: <IPv4 or IPv6>` | the visitor's address; honoured only with a valid key |

New answers:

| Status | Body | When |
|---|---|---|
| `401` | `{ "error": "unauthorized" }` | key malformed, unknown, revoked, or of another organization than the door |
| `400` | `{ "error": "invalid_visitor" }` | valid key, visitor header present but not an IP address |
| `429` | `{ "error": "too_many" }` | as today; also the per-key ceiling and more than 10 wrong keys per minute from one address |

Without `Authorization` both headers are ignored and nothing changes. On a linked host the three door endpoints (`submit`, `upload`, `click`) answer `404 not_found` for a door of another organization.

Example:

```bash
curl -X POST https://hub.minion-ai.org/api/doors/public/my-door/submit \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer mk_1a2b3c4d_…' \
  -H 'x-minion-visitor-ip: 203.0.113.7' \
  -d '{"values":{"nombre":"…"},"consent":true}'
```

## Settings endpoints (new; `settings:manage`)

| Call | Body → answer | Errors |
|---|---|---|
| `GET /api/settings/api-keys` | → `{ keys: [{ id, name, prefix, createdAt, createdByName, lastUsedAt, revokedAt }] }` | |
| `POST /api/settings/api-keys` | `{ name }` → `{ id, name, prefix, key }` (`key` only here) | `invalid_name`, `limit_reached` |
| `DELETE /api/settings/api-keys/{id}` | → `{ ok: true }` (revoke; repeat is ok) | `not_found` |
| `GET /api/settings/domains` | → `{ available, domains: [Domain] }` | |
| `POST /api/settings/domains` | `{ host }` → `Domain` | `invalid_host`, `duplicate`, `limit_reached`, `not_available` |
| `POST /api/settings/domains/{id}/check` | → `Domain` | `not_found`, `too_many`, `taken`, `provider_error` |
| `DELETE /api/settings/domains/{id}` | → `{ ok: true }` | `not_found`, `provider_error` (row stays, retry) |

`Domain` = `{ id, host, status: 'waiting_dns'|'needs_record'|'issuing'|'active', records: [{ type, name, value, found }], found?: string, checkedAt, activatedAt }`. `records[0]` is always the routing record; a hosting challenge adds a second.

## Linked hosts

On an active linked host only these paths are served: `/d/{slug}` (and its locale-prefixed forms), `/api/doors/public/…`, and the static files those pages load. Everything else: `404`.
