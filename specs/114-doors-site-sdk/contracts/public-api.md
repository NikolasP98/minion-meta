# Contract: public door API (hub) and the embed

Base: `https://hub.minion-ai.org`. All bodies JSON unless stated. No response, log or error carries a submitted value.

## Who may call
| Caller | Condition | Rate-limit bucket |
|---|---|---|
| Same origin (hosted page) | as today | caller address |
| Browser on another origin | `Origin` is a live allowed site of the door's organization | caller address (the visitor) |
| Server with key | `Authorization: Bearer mk_…`, key active, scope `doors:submit`, key org = door org | `x-minion-visitor-ip` if a valid IP, else the key |
| Anything else | — | browser: no CORS headers (blocked by the browser); bad key: `401 {"error":"unauthorized"}` |

Preflight: `OPTIONS` on every path below → `204` with `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: content-type, authorization, x-minion-visitor-ip`, `Access-Control-Max-Age: 600` when allowed; `204` without CORS headers otherwise.

## GET /api/doors/public/{slug}
`200`:
```json
{ "id": "uuid", "slug": "faces-modelos", "title": "…", "description": "…", "orgName": "…",
  "form": { "fields": [ { "key": "nombre", "label": "…", "type": "text", "required": true, "section": "datos", "help": "…",
                          "options": ["…"], "showIf": {"field":"nicho","in":["Otro"]}, "country": true,
                          "accept": "image", "maxFiles": 1, "guide": "front" } ],
            "sections": [ { "id": "datos", "title": "…", "help": "…" } ],
            "consentText": "…", "consentRequired": true, "successMessage": "…",
            "defaultCountry": "PE", "locales": ["en","pt"], "translations": { "en": { } } },
  "limits": { "maxFileBytes": 4194304, "imageTypes": ["image/jpeg"], "fileTypes": ["application/pdf"] } }
```
`404 {"error":"not_found"}` for missing, inactive, non-form doors and CRM-disabled orgs. `429 {"error":"too_many"}` (60/min). Counts a view like the hosted page (bots excluded). `Cache-Control: no-store`.

## POST /api/doors/public/{slug}/upload?field={key}&name={fileName}[&type={mime}]
Raw body. Cross-origin callers send `Content-Type: application/octet-stream` and the real type in `type`. `200 {"fileId":"uuid"}`. Errors: `400 invalid_field | invalid_body | mime_not_allowed`, `404 not_found`, `413 too_large`, `429 too_many`, `507 quota_exceeded`, `500 server_error`.

## POST /api/doors/public/{slug}/submit
`{ "values": { "<key>": "string | string[]" }, "consent": true, "website": "", "attribution": { } }` → `200 {"ok":true,"message":"…|null"}`; `400 {"error":"invalid","fields":{"<key>":"required|invalid|…"}}`; `400 invalid_body`; `404 not_found`; `429 too_many`; `500 server_error`.

## Embed
```html
<script type="module" src="https://hub.minion-ai.org/doors/v1.js"></script>
<minion-door slug="faces-modelos"></minion-door>
```
Attributes: `slug` (required), `lang` (`es|en|pt`; default `<html lang>`, then the door's own text), `origin` (hub origin override for testing).
Events (bubbling, composed, no submitted values): `minion-door:ready` `{slug}`, `minion-door:submitted` `{slug}`, `minion-door:error` `{slug, code}` where code ∈ `not_allowed | not_found | unavailable | invalid | too_many`.
Theme: custom properties `--minion-door-accent`, `--minion-door-on-accent`, `--minion-door-surface`, `--minion-door-border`, `--minion-door-danger`, `--minion-door-radius`, `--minion-door-gap`, `--minion-door-control-height`; parts `field label input button zone error section`.

## Client package `@minion-stack/doors`
```ts
const door = createDoor('faces-modelos', { origin?: string, apiKey?: string, visitorIp?: string });
await door.config();                                  // the GET body above
await door.upload(field, blob, { name, type });       // { ok: true, fileId } | { ok: false, code }
await door.submit(values, { consent, attribution? }); // { ok: true, message } | { ok: false, code, fields? }
messageFor(code, lang)                                // default text, es | en | pt
```
Codes: `invalid | invalid_field | invalid_body | mime_not_allowed | too_large | too_many | not_found | not_allowed | unauthorized | quota_exceeded | unavailable`.

## Settings API (authenticated, capability `settings:manage`)
- `GET|POST /api/settings/allowed-sites`, `DELETE /api/settings/allowed-sites/{id}` — POST body `{ "origin": "https://www.example.com" }`; errors `invalid_origin | duplicate | limit_reached`.
- `GET|POST /api/settings/api-keys`, `DELETE /api/settings/api-keys/{id}` — POST body `{ "name": "…", "scopes": ["doors:submit"] }` → `{ "id", "key": "mk_…" }` (the only time the key is returned); errors `invalid_name | invalid_scope | limit_reached`.
