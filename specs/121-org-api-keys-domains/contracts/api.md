# Contract

Errors are `{ "error": "<code>" }` with the status shown.

## Public door endpoints (changed in S1)

`POST /api/doors/public/{slug}/submit` and `POST /api/doors/public/{slug}/upload?field=&name=` keep their bodies and answers. New, optional request header: `Authorization: Bearer mk_<prefix>_<secret>`. Any other `Authorization` value is ignored.

| Status | Code | When |
|---|---|---|
| `401` | `unauthorized` | key malformed, unknown, revoked, or of another organization than the door; decided before the body is read |
| `429` | `too_many` | as today; with a key: more than 60 submissions or 240 uploads per minute for that key |

With a valid key the address-based limits do not apply. A slug that matches no active door answers `404 not_found`, with or without a key.

```bash
curl -X POST https://hub.minion-ai.org/api/doors/public/my-door/submit \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer mk_1a2b3c4d_…' \
  -d '{"values":{"nombre":"…"},"consent":true}'
```

A server-side upload of a `text/plain` file must send `origin: https://hub.minion-ai.org` or use `application/octet-stream` (unchanged behaviour).

## Settings endpoints (new; permission `settings:manage`, otherwise `403 forbidden`)

**Keys (S1)**

| Call | Body → answer | Errors |
|---|---|---|
| `GET /api/settings/api-keys` | → `{ keys: [Key] }` | |
| `POST /api/settings/api-keys` | `{ name }` → `201` `{ ...Key, key }` (`key` only here) | `400 invalid_name`, `409 limit_reached` |
| `DELETE /api/settings/api-keys/{id}` | → `{ ok: true }` (revoke; repeat is ok) | `404 not_found` |

`Key` = `{ id, name, prefix, createdAt, createdByName, lastUsedAt, revokedAt, revokedByName }`. A name is null when the person no longer exists.

**Domains (S2)**

| Call | Body → answer | Errors |
|---|---|---|
| `GET /api/settings/domains` | → `{ available, domains: [Domain] }` | |
| `POST /api/settings/domains` | `{ host }` → `201` `Domain` | `400 invalid_host`, `400 too_short`, `400 reserved`, `409 duplicate`, `409 limit_reached`, `429 too_many`, `503 not_available` |
| `POST /api/settings/domains/{id}/check` | → `Domain` (the stored one when checked less than 10 s ago) | `404 not_found`, `409 capacity`, `502 dns_error`, `502 provider_error`, `503 not_available` |
| `DELETE /api/settings/domains/{id}` | → `{ ok: true }` | `404 not_found`, `502 provider_error` (row stays, retry) |

`Domain` = `{ id, host, status: 'waiting_dns'|'needs_record'|'issuing'|'active', records: [{ type, name, value }], found: string|null, checkedAt, activatedAt }`. `name` is the full host name. `records[0]` is the routing record; a hosting challenge adds a second. `found` is what the routing name points to when it is not the expected value. Statuses are derived as in `data-model.md`.

## Other hosts (S2)

On a host that is not one of the hub's own, the application serves only the routes `/d/[slug]` (with or without locale prefix) and `POST /api/doors/public/[slug]/{submit,upload,click}`, and only for a door of the organization whose active domain the host is. Everything else that reaches the application: `404`. Keys work on linked hosts as on the hub; a key refusal (`401`) comes before the host check.
