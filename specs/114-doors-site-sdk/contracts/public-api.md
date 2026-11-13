# Contract: public door API (hub) and the embed

Base: `https://hub.minion-ai.org`. Bodies are JSON unless stated. No response, log or error carries a submitted value.

## Who may call (decided by `doorAccess`, see `plan.md`)
| Caller | Recognised by | Result |
|---|---|---|
| Hosted page, server without key (today's callers) | no `Origin`, or `Origin` = the hub's own origin | as today; no CORS headers; caller-address buckets |
| Browser on an allowed site | foreign `Origin` that is a live allowed site of the door's organization, and the door has `embed: true` | allowed; `Access-Control-Allow-Origin: <origin>`, `Vary: Origin` on every response; caller-address (visitor) buckets |
| Browser on any other site | any other foreign `Origin`, including `null` | `403 {"error":"not_allowed"}` with `Access-Control-Allow-Origin: <origin>` so the page can read it; nothing stored |
| Server with key (S6) | `Authorization: Bearer mk_…` | valid, not revoked, scope `doors:submit`, key org = door org → allowed, per-key buckets always, plus per-visitor buckets when `x-minion-visitor-ip` is a valid address; otherwise `401 {"error":"unauthorized"}` |

Limits per minute: address — submit 5, upload 40, read and preflight 120. Key — submit 60, upload 240, read 120. Failed key attempts — 10 per caller address.

Preflight: `OPTIONS` on every path below → `204`; when allowed: `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: content-type`, `Access-Control-Max-Age: 60`; otherwise no CORS headers.

## GET /api/doors/public/{slug}
`200`, `Cache-Control: no-store`:
```json
{ "id": "<door id>", "slug": "faces-modelos", "title": "…", "description": "…", "orgName": "…",
  "form": { "baseLocale": "es", "locales": ["es","en","pt"], "defaultCountry": "PE",
            "sections": [ { "id": "datos", "title": "…", "help": "…" } ],
            "fields": [ { "key": "edad", "label": "…", "type": "number", "required": true, "min": 18, "max": 99,
                          "section": "datos", "width": "half", "help": "…" },
                        { "key": "nicho", "label": "…", "type": "select", "required": true, "options": ["Moda","Otro"],
                          "optionHelp": { "Moda": "…" } },
                        { "key": "nicho_otro", "label": "…", "type": "text", "required": true,
                          "showIf": { "field": "nicho", "in": ["Otro"] } },
                        { "key": "telefono", "label": "…", "type": "phone", "required": true, "country": true },
                        { "key": "foto_frontal", "label": "…", "type": "file", "required": true,
                          "accept": "image", "maxFiles": 1, "guide": "front" } ],
            "consentText": "…", "consentRequired": true, "successMessage": "…",
            "translations": { "en": { "fields": { "nicho": { "label": "Niche", "options": { "Moda": "Fashion" } } } } } },
  "limits": { "maxFileBytes": 4194304, "imageTypes": ["image/jpeg","image/png","image/webp","image/heic"], "fileTypes": ["application/pdf", "…"] } }
```
`locales` is derived (`baseLocale` + keys of `translations`). Never included: `tagIds`, `embed`, follow-up, notification settings, statistics. `404 {"error":"not_found"}` for missing, inactive, non-form, unreadable-config doors and CRM-disabled orgs. `403 not_allowed`, `429 too_many` as above. A view is counted only for an allowed-site browser request with a non-bot user agent.

## POST /api/doors/public/{slug}/upload?field={key}&name={fileName}[&type={mime}]
Raw body, at most `limits.maxFileBytes`. Cross-origin callers send `Content-Type: application/octet-stream` and the real type in `type`; when the body is `application/octet-stream` and `type` is absent → `400 mime_not_allowed`. The declared type is trusted exactly as the `Content-Type` header is today (no content sniffing; unchanged). `200 {"fileId":"<id>"}` (an opaque id; today a cuid2). Errors: `400 invalid_field | invalid_body | mime_not_allowed`, `403 not_allowed`, `404 not_found`, `413 too_large`, `429 too_many`, `507 quota_exceeded`, `500 server_error`.

## POST /api/doors/public/{slug}/submit
`Content-Type: application/json` required (else `400 invalid_body`).
`{ "values": { "<key>": "string" | ["string"] | true|false }, "consent": true, "website": "", "attribution": { … as the hosted page sends … } }`
- text, textarea, email, phone, date, select, number, document → string; multiselect and file → string array (option labels, file ids); checkbox → boolean.
- `website` is the honeypot: non-empty → `200 {"ok":true,"message":null}` and nothing stored.
`200 {"ok":true,"message":"…"|null}`; `400 {"error":"invalid","fields":{"<key>":"<code>"}}` where the key is a field key or `consent`, and code is one of the hub's `FieldErrorCode` values (`form.ts:109`; at least `required`, `invalid`); `400 invalid_body`; `403 not_allowed`; `404 not_found`; `429 too_many`; `500 server_error`.

## Embed
```html
<script async src="https://hub.minion-ai.org/doors/v1.js"></script>
<minion-door slug="faces-modelos"></minion-door>
```
- Attributes: `slug` (required); `lang` (optional; default `<html lang>`; reduced to its primary tag; unsupported → the door's base language); `origin` (hub origin override, for testing).
- Load order: the element first calls GET. `403` → "This site is not allowed to use this form". `404` → "Form unavailable". Network failure or `5xx` → "Form unavailable, try again" with a retry control.
- Photos (`accept: image`): re-encoded as JPEG, longest edge 2400 px, quality 0.85, before upload. If the browser cannot decode the image (for example HEIC outside Safari) it is sent as is when within the size limit, otherwise refused with "file too large". Files of a type not in `limits` are refused before any upload, with the file name and the reason.
- Events on the element (bubbling, composed, never carrying submitted values): `minion-door:ready` `{slug}`, `minion-door:submitted` `{slug}`, `minion-door:error` `{slug, code}` with code ∈ `not_allowed | not_found | unavailable | invalid | too_many`.
- Theme: custom properties `--minion-door-accent`, `-on-accent`, `-surface`, `-border`, `-danger`, `-radius`, `-gap`, `-control-height` (all prefixed `--minion-door`); parts `field label input button zone error section`. Font and text colour are inherited from the page.
- Trust: the form runs inside the host page; scripts on that page can read what visitors type. The honeypot field is rendered inside the element.

## Settings API (authenticated, capability `settings:manage`)
- `GET|POST /api/settings/allowed-sites`, `DELETE /api/settings/allowed-sites/{id}` — POST `{ "origin": "https://www.example.com" }` → the stored row; errors `invalid_origin | duplicate | limit_reached`.
- (S6) `GET|POST /api/settings/api-keys`, `DELETE /api/settings/api-keys/{id}` — POST `{ "name": "…", "scopes": ["doors:submit"] }` → `{ "id", "key": "mk_…" }`, the only time the key is returned; errors `invalid_name | invalid_scope | limit_reached`.
