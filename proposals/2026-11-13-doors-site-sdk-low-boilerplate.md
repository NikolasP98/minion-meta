---
id: 2026-11-13-doors-site-sdk-low-boilerplate
title: A site connects a lead form to a Minion door in minutes, not 800 lines
status: in-spec
created: 2026-11-13
updated: 2026-11-13
repos: [minion_hub, minion-meta]
effort: L
value: 8
tags: [crm, security]
spawned_spec: 2026-11-13-doors-site-sdk-spec
source: FACES /modelos integration (hub PR 657, faces-landing PRs 10-12)
---

# A site connects a lead form to a Minion door in minutes, not 800 lines

## Problem (owner's words)

> Find ways to improve the MINION Doors SDK so that sites that want to capture leads via forms can
> set it up with minimal boilerplate, easy to set up. We might even need an API Key generator or a
> native way to link a domain to an org.

## AS-IS (observed while building facesculptors.net/modelos, 2026-11-13)

A door only offers three public endpoints (`submit`, `upload`, `click` under
`/api/doors/public/<slug>/`) and a hosted page (`/d/<slug>`). Everything else was hand-written in
the site repo:

| What the site had to write | Lines | Why it was needed |
|---|---|---|
| `src/lib/form/modelos.ts`: field list, a second copy of the validation, a generator for the door config | 160 | The door's field list cannot be read from outside, and there is no shared package |
| `src/routes/modelos/+page.server.ts`: forwards the submission | 35 | The hub answers no CORS preflight, so a browser on another domain cannot post to it |
| `src/routes/modelos/upload/+server.ts`: forwards each file | 43 | Same, plus SvelteKit's CSRF check rejects a server-to-server `text/plain` body without an `Origin` header |
| `src/routes/modelos/+page.svelte`: form, upload zones, error mapping | 477 | No client helper for upload state or for turning error codes into messages |
| A copy of the hub's accepted file types | 12 | Needed to refuse a file before sending it; it will drift |

Other facts:

- The door itself was created with a SQL insert in production, because the site's field list and
  the door's field list have to match and there is no command that pushes one to the other.
- **Rate limits count the wrong address.** `submit` allows 5 per minute per IP per door and
  `upload` 40. Behind a site's server proxy the IP is the site's server, not the visitor. Busy
  minutes can refuse real leads with 429, and one abusive visitor can lock everyone out. Not seen
  in production yet; the code path is `event.getClientAddress()` in both handlers.
- Files go through two servers and are capped at 4 MB, because the storage bucket only accepts
  browser uploads from `https://hub.minion-ai.org`.
- The hub has no API keys for an organization and no record of which domains belong to it.

## TO-BE

Three ways to connect, from least to most work. Each is independently shippable.

### 1. Link a domain to the organization (the foundation)

Settings → Organization gets an "Allowed sites" list (`https://www.facesculptors.net`). Optional
proof of ownership by DNS TXT record or a file under `/.well-known/`.

- The public door endpoints answer CORS for the listed origins of the door's organization only.
  The browser posts straight to the hub: both proxy files disappear and the rate limit sees the
  real visitor again.
- The same list feeds the bucket's CORS rules, so files can go browser-direct with a presigned
  upload and the 4 MB cap rises to the normal 25 MB.
- A door may narrow the list ("this door only from this site").

Invariant: an origin that is not listed gets exactly today's behaviour. `Origin` is a browser
control, not authentication: validation, rate limits and the honeypot stay as they are.

### 2. `@minion-stack/doors` client package (no framework)

```ts
import { createDoor } from '@minion-stack/doors';
const door = createDoor('faces-modelos');           // hub origin defaults to production
const { fields } = await door.config();              // new public GET: labels, types, options, accepted file types, max size
const { fileId } = await door.upload('foto_frontal', file, { onProgress });
const result = await door.submit(values, { consent: true });   // typed: ok | invalid(fields) | too_many | ...
```

- `GET /api/doors/public/<slug>` returns the public field list, so the site stops duplicating
  fields, options, file types and limits. The package also exports the validation the hub runs.
- Typed error codes with default messages in es/en/pt.
- Carries the attribution parameters (`utm_*`, referrer) the hosted page already records.
- Thin optional helpers afterwards: a Svelte `<DoorForm slug>` and a React one that render from
  the config, unstyled.

### 3. Zero-code embed

`<script src="https://hub.minion-ai.org/embed.js" data-door="faces-modelos"></script>` mounts the
existing hosted form in an iframe that resizes itself, with the organization's theme. For sites
that only want the form to appear.

### 4. Organization API keys (for server-side callers)

Settings → Organization → API keys: create, name, scope, revoke; shown once, stored hashed, with
last-used time. First scope: `doors:submit`.

- A server that holds a key may submit on behalf of a visitor and pass the visitor's IP, which the
  hub then uses for the rate limit. This fixes the proxy problem for sites that must keep a server
  step (extra validation, their own CRM copy).
- Later scopes can read submissions or contacts (webhooks, Zapier, n8n).

A key is only for servers. A key in browser code is public, so browsers use the linked domain.

### 5. Doors as code

`minion doors push door.config.ts` creates or updates a door from a file in the site repo and
prints what will change first. It uses an API key with a `doors:write` scope. This replaces the
production SQL insert and keeps the site's fields and the door's fields in one place.

## DELTA and suggested order

| Step | Change | Removes |
|---|---|---|
| A | Allowed sites per organization + CORS on `submit`/`upload`/`click` + public config GET | Both proxy files, the wrong-IP rate limit, the copied file-type list |
| B | `@minion-stack/doors` package (client, validation, error messages) | Most of `modelos.ts` and the error mapping |
| C | Presigned browser-direct uploads for linked origins | The 4 MB cap |
| D | API keys with `doors:submit`, forwarded visitor IP | Rate-limit problem for server-side callers |
| E | Embed script; `minion doors push` | Hand-built forms for simple cases; SQL door creation |

With A and B, the FACES site would keep its page markup and face guides and drop to roughly 300
lines. A and D are security work: human approval and human merge.

## Out of scope

- Captcha. The honeypot and rate limits stay; add a challenge only if spam shows up.
- Virus scanning of uploads (already an open risk on hub PR 657).
- Changing what a submission does inside the CRM.

## Definition of done (for step A + B, the first slice)

- From a page on a linked origin, a browser submits and uploads to the hub with no site server code.
- From an origin that is not linked, the preflight is refused and nothing else changes.
- The FACES `/modelos` page runs on the package and its two proxy routes are deleted.
- Two visitors behind one site no longer share a rate-limit bucket.

## Owner decisions (2026-11-13)

- Line count: "Please consider strategies to lower the line count even more" → see below.
- API keys: "Yes, it should belong to the ORG."
- Domain proof: not answered; the spec assumes an org admin typing the origin is enough.

## Getting below 300 lines (added after the owner's reply)

The 300 lines that remained were the form itself: markup, drop zones, country inputs, face guides,
the conditional field and three languages. They only stay on the site because a door cannot
describe them. Move them into the door and render them from one place:

| Strategy | What moves to the hub | Site lines left |
|---|---|---|
| Sections, conditional fields, country-aware phone and document inputs, photo guides become door settings | Layout and behaviour | 0 for these |
| Translations of labels and options on the door | The site's es/en/pt copies | 0 |
| One `<minion-door slug>` element that renders any door from its public definition, shared with the hosted page | The whole form component | 2 |
| Styling by CSS variables that default to the page's own font and colours | Theme code | 0 to 15 |
| Events (`submitted`, `error`) instead of site-side result handling | Success and error states | 0 to 5 |

Result for FACES: a page wrapper plus two lines, under 60 lines in total (818 today). The spec is
`specs/114-doors-site-sdk/`.
