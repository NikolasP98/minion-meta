# Research: Organization API keys and linked domains (base)

Hub facts are from `origin/master` `16def9eb` (read 2026-11-16). "Unverified" marks what was not checked.

## R1. Key format, storage, lookup
- **Decision**: key text `mk_<8 hex>_<43 base64url>` (32 random bytes). Stored: the 8-character prefix (unique) and the SHA-256 hex of the whole key. Lookup by prefix on the bypass-RLS connection (`getCoreDb`), compare hashes with `timingSafeEqual`. A text that does not match `^mk_[0-9a-f]{8}_[A-Za-z0-9_-]{43}$` is refused before any lookup.
- **Rationale**: the secret has 256 bits of randomness, so a fast hash is enough; a slow password hash adds latency to every submission for no gain. No hashed-key table exists to reuse; pieces to copy: `src/server/services/join/helpers.ts:3` (generation) and `src/server/identity/channel-claim.service.ts:59-63` (`safeEqualHex`).
- **Alternatives**: HMAC with the server secret (rotating the server secret would kill every key); encrypted at rest like gateway tokens (`resolve-identity.ts:114`, reversible, needs a row scan).

## R2. How a key travels and what it changes
- **Decision**: header `Authorization: Bearer mk_…` on `submit` and `upload`. Optional header `x-minion-visitor-ip`. One helper, `doorCaller(event, slug, bucket)`, replaces the two inline limiter calls and returns either a refusal or `{ keyOrgId }`.
- **Order inside the helper**: no header → today's limiter key, unchanged (`door-submit:<ip>:<slug>` 5, `door-upload:<ip>:<slug>` 40). With header → format check → lookup → on any failure count `door-key-fail:<ip>` (10/min; over it `429 too_many`, else `401 unauthorized`) → per-key ceiling `door-key-<bucket>:<keyId>` (60 / 240) → if the visitor header is present it must be an IP (`node:net` `isIP`, else `400 invalid_visitor`) and the per-visitor bucket `door-<bucket>:<visitorIp>:<slug>` is charged.
- **Wrong organization**: the door's organization is only known inside the service. `submitFormDoor` and `uploadDoorFile` gain an option `keyOrgId`; a mismatch returns `wrong_org`, which the route answers as the same `401 unauthorized` and counts as a failed attempt.
- **Last used**: one conditional `update … where last_used_at is null or last_used_at < now() - interval '1 minute'`, issued only when the row read shows it is stale; awaited (an unawaited promise can be cut off on serverless).
- **No cross-origin headers** are added: a browser on another site cannot send `Authorization` to these endpoints.

## R3. One DNS record that proves control and routes
- **Decision**: the customer creates `CNAME <their host> → <label>.<suffix>`, where `<label>` is 16 random lowercase base32 characters unique to that organization's request and `<suffix>` is a hub-owned name (env `ORG_DOMAINS_CNAME_SUFFIX`, planned `domains.minion-ai.org`) that carries a wildcard CNAME to the hub's hosting target (today `hub.minion-ai.org` → `8bc472aa556967fb.vercel-dns-017.com`). The hub verifies by resolving the CNAME of the customer host and comparing it with its own `<label>.<suffix>`.
- **Rationale**: only the owner of the DNS zone can create the record, and a second organization that claims the same host has a different label, so it cannot be activated by the real owner's record (FR-013). One record instead of two.
- **UNVERIFIED — task T001 tests it before S2 is merged**: that Vercel serves and issues a certificate for a host that reaches it through an intermediate CNAME. If it does not: fallback is two records, `TXT _minion.<host> = <label>` for control and `CNAME <host> → <Vercel target>` for routing; only `expectedRecords()` and `checkDns()` change.
- **Alternatives**: TXT + CNAME from the start (two records; rejected while the one-record form is untested, kept as fallback); HTTP file proof (needs the host to route to us first, which is the same record); trusting the hosting provider's own verification (it does not know our organizations: first claimer wins).

## R4. Reading DNS
- **Decision**: `node:dns/promises` `Resolver` with public servers (`1.1.1.1`, `8.8.8.8`) and a 3 s timeout, `resolveCname(host)`; trailing dot and case normalised. `ENODATA`/`ENOTFOUND` → "no record"; another name → "points to X".
- **Rationale**: the hub runs on the Node runtime (`svelte.config.js:32-38`), so no HTTP DNS client is needed. Public resolvers avoid a stale platform cache.
- A proxied record (the DNS provider answers with its own addresses) shows as "no record"; the help text says to switch the proxy off.

## R5. Registering the host with the hosting provider
- **Decision**: a small `fetch` client for the Vercel REST API (no SDK dependency): add project domain, read project domain, verify project domain, read domain config, remove project domain. Credentials: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`. Source: Vercel "Configuring Custom Domains" for multi-tenant platforms (page updated 2026-09-16), which says the certificate is issued automatically after the domain is added, and "If the domain is already in use on Vercel, the user needs to set a TXT record to prove ownership". Exact paths, versions and response fields are to be taken from the REST reference during T014, not from memory.
- **When**: only after the DNS record matches (so an unproven claim never reaches the provider). "Already on this project" counts as success. A pending provider challenge is shown as an extra record. "Ready" = the provider reports the domain verified and not misconfigured.
- **Alternatives**: wildcard domain on the project (cannot cover customers' own names); registering at add time (lets anyone fill the project with unproven names).

## R6. Serving only forms on a linked host
- **Decision**: a new `linkedHostHandle` in the `sequence` (`hooks.server.ts:898`), placed before `i18n.handle()`. Hub hosts (the host of `hubBaseUrl()`, `localhost`, `127.0.0.1`, `*.vercel.app`) skip it. For any other host it reads `linkedHost(host)` (cached 60 s, also when nothing is found; invalidated on every domain change): unknown → continue as today; listed but not active → `404`; active → `404` unless the canonical path is a form page (`/d/<slug>`, with or without locale prefix), a door endpoint (`/api/doors/public/…`) or an asset those pages load (`/_app/…` and the static files found by loading the page in T019). It sets `event.locals.linkedOrgId`.
- **Organization match**: `resolvePublicDoor(slug, onlyOrgId?)` returns `null` when the door belongs to another organization; the page load and the three endpoints pass `locals.linkedOrgId`.
- **Why a guard is mandatory**: the hooks never look at the host (recon §2), so every host attached to the project would otherwise serve the whole hub.
- **UNVERIFIED**: that `event.url.hostname` on the Vercel adapter is the visitor's host name (expected, checked in T001 on the real host).
- Sessions: hub cookies are bound to the hub's host, so nobody is signed in on a linked host.

## R7. Settings page and permissions
- **Decision**: one page `/settings/developers` with two sections. Gate: `requireOrgCapability(locals, 'settings', 'manage')` on the page and on every endpoint, plus `/api/settings/api-keys` and `/api/settings/domains` in `API_WRITE_PREFIXES`. Files a new settings page touches are listed in `plan.md` (from the `/settings/tables` precedent, commit `b76d58f2`).
- Automatic checking: the page calls the check endpoint for each waiting domain every 15 s while it is visible; the endpoint is limited to 12 checks per minute and organization.

## R8. What is reused from the parked branch
- `feat/doors-allowed-sites` (`881c06c3`, unreviewed) is not built on: it is the cross-origin embed. Reused by copy: the shape of its settings page registration and the soft-delete table pattern (`removed_at`, partial unique index, forced RLS, no `delete` grant).

## R9. Design review artefact
- The owner's rule asks for a FigCraft as-is/to-be for every UI change. Not produced here: the page is new (no as-is) and is assembled from existing primitives (Card, DataTable `plain`, Modal, Badge, Button, FormField). Named as a skipped stage in the PR body; the owner may ask for it before merge.
