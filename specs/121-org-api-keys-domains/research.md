# Research: Organization API keys and linked domains (base)

Hub facts are from `origin/master` `16def9eb` (read 2026-11-16). "Unverified" marks what was not checked. Revised after the review of 2026-11-16 (`plan.md` § Review record).

## R1. Key format, storage, lookup
- **Decision**: key text `mk_<8 hex>_<43 base64url>` (32 random bytes). Stored: the 8-character prefix (unique) and the SHA-256 hex of the whole key. Lookup by prefix on the bypass-RLS connection (`getCoreDb`), compare hashes with `timingSafeEqual`. A text that does not match `^mk_[0-9a-f]{8}_[A-Za-z0-9_-]{43}$` is refused before any lookup. "First characters" shown to admins = `mk_` + prefix.
- **Rationale**: 256 bits of randomness make a fast hash sufficient; a slow password hash would add latency to every submission. No hashed-key table exists to reuse; pieces to copy: `src/server/services/join/helpers.ts:3` (generation), `src/server/identity/channel-claim.service.ts:59-63` (`safeEqualHex`), `isUniqueViolation` (`doors.service.ts:10`) for a prefix collision.
- **Alternatives**: HMAC with the server secret (rotating that secret would kill every key); encrypted at rest like gateway tokens (`resolve-identity.ts:114`, reversible, needs a row scan).

## R2. How a key travels and what it changes
- **Decision**: header `Authorization: Bearer mk_…` on `submit` and `upload`. One helper, `doorCaller(event, slug, bucket)`, replaces the two inline limiter calls and returns a refusal `Response` or `{ keyId: string | null }`.
- **Order inside the helper (the only place it is defined)**:
  1. No `Authorization` header, or one that does not start with `Bearer mk_` → today's limiter call, unchanged (`door-submit:<ip>:<slug>` 5, `door-upload:<ip>:<slug>` 40) → `{ keyId: null }`.
  2. Format check; no match → `401 unauthorized` (no lookup).
  3. `verifyKey` (lookup by prefix, constant-time compare, not revoked); none → `401`.
  4. Read the door's organization by slug (`select org_id from crm_doors where slug = … and active`, the read `resolvePublicDoor` already does at `doors.service.ts:66-70`). No such door → continue with `{ keyId }` (the service answers `404 not_found`, as for any caller). Another organization → `401`.
  5. Per-key ceiling `door-key-<bucket>:<keyId>` (60 / 240); over → `429 too_many`.
  6. `touchKey` when `lastUsedAt` is null or older than 60 s (one awaited conditional update).
- All of this happens before the body is read, so a refused key never reaches the honeypot or validation answers.
- **Dropped after review**: the forwarded visitor address (`x-minion-visitor-ip`) and a counter of wrong keys. A stated address cannot be verified and let any key holder exhaust another door's address bucket; the wrong-key counter cost a write to guard an indexed read of a secret that cannot be guessed.
- **Which key stored a submission**: `crm_door_submissions.api_key_id` (new nullable column), written by `submitFormDoor` from `{ keyId }`. Uploads are not marked (files are claimed by the submission).
- **No cross-origin headers** are added. A server-side upload of a `text/plain` file must send an `Origin` header equal to the hub's origin, or use `application/octet-stream`: SvelteKit's origin check refuses form content types without one (`@sveltejs/kit` `respond.js:81-89`, read in the installed package). This is today's behaviour.

## R3. One DNS record that proves control and routes — PROVISIONAL until T001
- **Decision**: the customer creates `CNAME <their host> → <label>.<suffix>`; `<label>` is 16 random lowercase base32 characters unique to that organization's request; `<suffix>` is a hub-owned name (env `ORG_DOMAINS_CNAME_SUFFIX`) with a wildcard CNAME to the hub's hosting target (today `hub.minion-ai.org` → `8bc472aa556967fb.vercel-dns-017.com`). The hub verifies by resolving the CNAME of the customer host and comparing it with its own `<label>.<suffix>`.
- **Rationale**: only the owner of the DNS zone can create the record, and a second organization that claims the same host has a different label.
- **DNS is the truth**: if the record later carries another organization's label, that organization's next check takes the name over and the previous row goes back to pending.
- **UNVERIFIED, settled by T001 before S2 is built**: (a) Vercel serves and certifies a host that reaches it through an intermediate CNAME; (b) a second Vercel account cannot claim a customer host that points at `<label>.<suffix>` while it is on no project (before the first successful check, and after removal while DNS still points at us), nor a name `x.<suffix>` itself; (c) the scope of the API token (project or whole team); (d) whether the suffix should live on a registrable domain other than the hub's, so a claimed `x.<suffix>` could never be same-site with the hub.
- **If (a) or (b) fails**: this spec is revised before S2 starts. Likely shape: `TXT _minion.<host> = <label>` for control plus `CNAME <host> → <Vercel target>` for routing, and registration at add time with the caps of FR-011.

## R4. Reading DNS
- `node:dns/promises` `Resolver` with public servers (`1.1.1.1`, `8.8.8.8`), 3 s timeout, `resolveCname(host)`; case and trailing dot normalised. `ENODATA`/`ENOTFOUND` → no record; another name → "points to X"; timeout or server failure → the check answers `dns_error` and stores nothing.
- A proxied record shows as no record; the help text says to switch the proxy off.

## R5. Registering the host with the hosting provider
- A small `fetch` client for the Vercel REST API (no SDK): add, read, verify and remove a project domain, read its configuration. Credentials: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` when the project is in a team. Source: Vercel "Configuring Custom Domains" for multi-tenant platforms (updated 2026-09-16): the certificate is issued automatically after the domain is added; "If the domain is already in use on Vercel, the user needs to set a TXT record to prove ownership". Exact paths and response fields come from the REST reference during T017, not from memory.
- Called only after the DNS record matches. `hostState` calls the provider's verify when a challenge is pending. The host name is validated again inside the client before any URL is built.
- "Ready" = the provider reports the domain verified and correctly configured.

## R6. Serving only forms on other hosts
- **Decision (changed after review: fails closed, no cache)**: `linkedHostHandle` in the `sequence` (`hooks.server.ts:898`), before `i18n.handle()`. It is a pure function of the request: when the feature is configured (`ORG_DOMAINS_CNAME_SUFFIX` set, not the desktop build), a request whose host is not a hub host is answered `404` unless `event.route.id` is `/d/[slug]` or one of the three door endpoints. For those it sets `event.locals.linkedHost = <host>`.
- **Hub hosts**: the host of `hubBaseUrl()`, the comma-separated env `HUB_HOSTS`, `*.vercel.app`, `localhost`, `127.0.0.1`. T001 lists the real ones first (`static/robots.txt:4` names `minionhub.admin-console.dev`).
- **Organization match**: `resolvePublicDoor(slug, host?)`. With a host it additionally requires an active, not removed `org_domains` row for that host whose organization is the door's; otherwise `null` (404). One indexed read on linked-host requests only; no cache, so removal and activation take effect on the next request. A failed lookup surfaces as the route's error, never as "allowed".
- **On a linked host** (`locals.linkedHost` set): identity resolution is skipped (a sibling subdomain of the customer could plant a session cookie: `resolve-identity.ts:219-252`), the analytics client is not started (`hooks.client.ts:21-23` would post to `<origin>/ingest`), and the service worker is not registered (`src/service-worker.ts`).
- **Static files** (`/_app/immutable/*`, icons, `robots.txt`) are served by the hosting before the function and therefore also on linked hosts. Unverified; checked on the real host in quickstart S2.
- **Confirmed in the installed adapter**: `@sveltejs/adapter-vercel/files/serverless.js` passes `request.url` through, so `event.url.hostname` should be the visitor's host (T001 confirms on a real host). The form page calls relative URLs (`form/Public.svelte:80,128`), and a same-host POST passes the origin check.
- **Rollback of S2**: remove every registered host at the provider first, then revert.

## R7. Settings page and permissions
- One page `/settings/developers`. Gate: `requireOrgCapability(locals, 'settings', 'manage')` on the page and every endpoint, plus the two API prefixes in `API_WRITE_PREFIXES`. Files a new settings page touches: `plan.md` (precedent `/settings/tables`, commit `b76d58f2`).
- Automatic checking: the page calls the check endpoint for each waiting domain every 15 s while visible; the service skips a domain checked less than 10 s ago and returns the stored result.

## R8. What is reused from the parked branch
- `feat/doors-allowed-sites` (`881c06c3`, unreviewed) is not built on. Copied: its settings page registration shape and the soft-delete table pattern.

## R9. Design review artefact
- No FigCraft as-is/to-be: the page is new and assembled from existing primitives. Named as a skipped stage in the PR body.
