# Implementation Plan: Organization API keys and linked domains (base)

**Branch**: `spec/121-org-api-keys-domains` (meta) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

## Summary

Two hub slices. **S1** gives an organization API keys (create, list, revoke) and gives a server that sends a key its own limit on the door `submit` and `upload` endpoints and marks its submissions. **S2** lets an organization link a subdomain with one DNS record that the hub checks by itself, registers the host with the hosting provider, and restricts a linked host to that organization's form pages.

## Problem and goal (Heilmeier, short)

- **What**: customers' servers are anonymous to the hub and share one rate limit; an organization cannot serve its forms on its own name.
- **How today**: the FACES site forwards forms without identifying itself (limit of 5 per minute for all its visitors together); forms live only on `hub.minion-ai.org`.
- **What is new**: a hashed organization key with its own limit; one-record domain linking with automatic checking; a host guard.
- **Who cares**: the owner (FACES forms on `modelos.facesculptors.net` later; any customer's lead forms).
- **Risks**: see Risks & Mitigations. The largest: a linked host exposing more than forms; one organization activating another's name.
- **Cost**: two draft PRs, about 40 files, two migrations. One-time owner setup and test for S2.
- **Check**: [quickstart.md](quickstart.md); SC-001…SC-006.

## Technical Context

- **Hub**: Bun, SvelteKit 2.70 on Vercel (`adapter-vercel`, `nodejs22.x`, one function), Svelte 5, zod 4, Postgres (Supabase) with forced RLS and `withOrgCore`, migrations in `supabase/migrations/` applied by `scripts/db-migrate.ts` on production builds, each paired with a QA seed change, Paraglide (en, es), design-token lints.
- **Testing**: vitest, files beside the code; route tests call the handler with a mocked service (`src/routes/api/doors/public/[slug]/submit/server.test.ts`); `bunx vitest run <file>`. Never the full suite with a production `.env`. One `bun run check` at a time.
- **Constraints**: no new dependency; no change for callers without a key; no submitted value or key in any log.
- **Unknowns**: four, all for S2, listed in research R3 (a–d). T001 settles them before S2 is built.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | This directory; EGM review recorded below before code starts |
| II. AS-IS → TO-BE → DELTA with evidence | spec.md, anchors from the 2026-11-16 read of `16def9eb`; unverified claims are marked as such (one in the AS-IS, four in research R3, one in R6) |
| III. Slice-scoped delivery | S1, S2: one draft PR each against hub `master`, from worktrees, gates in the foreground |
| IV. Required build steps | Design lints, RBAC gate on page and endpoints, Paraglide en/es + `i18n:compile`, route contract manifest and count locks: all listed per slice |
| V. Security and data | Tagged; owner approves this spec and merges both PRs; no production data change is part of the slices (the owner's DNS and credentials setup is theirs) |

Deviation: no FigCraft as-is/to-be (research R9); named in each PR body.

## Technical Plan

### Slice S1 — `feat/org-api-keys` (hub, from `master`) — ready to build

| Area | Files |
|---|---|
| Schema | `supabase/migrations/<ts>_org_api_keys.sql` (table + `crm_door_submissions.api_key_id`); `src/server/db/pg-org-integrations-schema.ts` (new); `src/server/db/pg-doors-schema.ts` (new column) |
| Service | `src/server/services/org-api-keys.service.ts`: `createKey`, `listKeys`, `revokeKey`, `verifyKey(text) → { id, orgId, lastUsedAt } \| null`, `touchKey(id)` |
| Caller helper | `src/server/doors/caller.ts`: `doorCaller(event, slug, bucket)` — the six steps of research R2, nowhere else |
| Door endpoints | `submit/+server.ts`, `upload/+server.ts` call `doorCaller` first; `submitFormDoor` accepts `keyId` and stores it |
| Settings API | `src/routes/api/settings/api-keys/+server.ts` (GET, POST), `[id]/+server.ts` (DELETE) |
| Page | `src/routes/(app)/settings/developers/{+page.server.ts,+page.svelte}`; `src/lib/components/settings/developers/ApiKeysSection.svelte` |
| Registration | `SettingsNav.svelte` `HUB_TABS`; `route-access-registry.ts` override `org-capability:settings:manage`; `route-design-manifest.ts` screen; `route-design-validation.ts` counts; `route-design-contracts.test.ts` wave A; `scripts/ui-audit-inventory.test.ts`; `frontend-contract-scanner.test.ts`; `rbac.service.ts` `API_WRITE_PREFIXES`; `src/lib/assistant/site-map.ts` |
| Inventories | `src/server/db/rls-bypass-inventory.json`; QA seed + matrix + `SEEDED_TABLES` |
| Text | `messages/en.json`, `messages/es.json` |

`doorCaller` is the only new decision point on the public path. Its no-key branch issues exactly today's limiter call with today's key string; a test pins that.

### Slice S2 — `feat/org-domains` (hub, on S1) — NOT built until T001 passes

| Area | Files |
|---|---|
| Schema | `supabase/migrations/<ts>_org_domains.sql`; same Drizzle file |
| DNS | `src/server/domains/dns.ts`: `lookupCname(host)` |
| Hosting | `src/server/domains/hosting.ts`: `hostingConfigured()`, `addHost`, `hostState` (verifies a pending challenge), `removeHost` |
| Service | `src/server/services/org-domains.service.ts`: `normaliseHost`, `listDomains`, `addDomain`, `checkDomain`, `removeDomain`, `activeDomainOrg(host)` |
| Guard | `src/server/domains/linked-host-handle.ts` in `sequence` (`src/hooks.server.ts`) before `i18n.handle()`; `src/app.d.ts` `locals.linkedHost` |
| Organization match | `doors.service.ts` `resolvePublicDoor(slug, host?)`; `d/[slug]/+page.server.ts`, `submit`, `upload`, `click` pass `locals.linkedHost` |
| Linked-host hygiene | identity skipped in `appHandle` when `locals.linkedHost`; analytics not started and service worker not registered on non-hub hosts (`src/hooks.client.ts`, `svelte.config.js` `serviceWorker.register`, root layout) |
| Settings API | `src/routes/api/settings/domains/+server.ts`, `[id]/+server.ts`, `[id]/check/+server.ts` |
| Page | `DomainsSection.svelte` on the Developers page |
| Config | `.env.example`: `ORG_DOMAINS_CNAME_SUFFIX`, `HUB_HOSTS`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` |
| Inventories, seed, text | as S1 |

`hostingConfigured()` = suffix, token and project id are set (team id only when the project is in a team).

**`checkDomain`**:

1. Checked less than 10 s ago, or already `active` → return the stored domain.
2. `lookupCname(host)`: resolver failure → `dns_error`, nothing stored. Not `<target_label>.<suffix>` → store `dns: missing|mismatch` (+ `found`), return.
3. `addHost(host)` at the provider ("already on this project" is success); set `provider_added_at` on this row if no other live row for the host has it.
4. `hostState(host)`: challenge → store its record, `hosting: challenge`; not ready → `hosting: issuing`; ready → continue.
5. In one transaction: refuse with `capacity` at 200 active rows; set any other organization's active row for this host back to `pending` and move its `provider_added_at` to this row; set this row `active`, `activated_at`.

`removeDomain`: mark the row removed first when it is not the one holding `provider_added_at` (nothing to release). Otherwise `removeHost` at the provider, then mark removed; a provider failure leaves the row and answers `provider_error`. Either way the host stops serving this organization at once, because `resolvePublicDoor` reads the row on every request.

**Guard decision table** (`linkedHostHandle`, feature configured and not desktop):

| Host | Route | Result |
|---|---|---|
| hub host (`hubBaseUrl()` host, `HUB_HOSTS`, `*.vercel.app`, `localhost`, `127.0.0.1`) | any | unchanged |
| any other | `/d/[slug]` or a door endpoint | continues with `locals.linkedHost`; the door resolves only for the organization whose active domain the host is, else 404 |
| any other | anything else | 404 |

Feature not configured, or desktop build: the guard does nothing (today's behaviour).

### Order, rollout, rollback

- S1 merges and ships alone. S2 is built only after T001 and merges after S1.
- S1's migration adds a table and a nullable column; rollback is reverting the PR.
- S2 is inert until configured. Its rollback: remove every registered host at the provider, then revert (otherwise attached hosts would serve the whole hub again).
- S2 is opened against the S1 branch and retargeted to `master` before that branch is deleted.

## Alternatives

| Alternative | Why not |
|---|---|
| Keys per user (personal tokens) | The owner decided keys belong to the organization; a personal token dies when the person leaves |
| Require a key on every server call | Breaks the current FACES site (invariant) |
| Let a key holder state the visitor's address (spec 114) | Unverifiable; in review it let any key holder exhaust another door's address limit. The key's own limit solves the shared-limit problem |
| Count wrong keys per address | Costs a write to guard an indexed read of an unguessable secret |
| Cache the host lookup | Per instance on serverless, so removal would lag; the read is one indexed query on linked hosts only |
| Two DNS records from the start (TXT + CNAME) | More to copy; kept as the fallback if T001 fails |
| Only verify the domain, do not serve on it | Leaves the base untestable end to end; attaching a host later without the guard would expose the hub |
| Serve on linked hosts through a separate hosting project | A second deployment to run; the guard gives the same isolation in one |
| Provider-side one-click record creation (Domain Connect) | Needs an onboarding with each DNS provider; zero clicks after the record exists is reached without it |
| Background job that re-checks domains | Not needed to activate; the open page drives checks. Named as later work |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A host other than the hub's serves hub pages (login, APIs) | Guard fails closed for every non-hub host, matched on route id; identity skipped; SC-005 on the real host |
| The hub-host list is incomplete and a real hub address starts answering 404 | T001 lists the hosts in use; the guard is off until the feature is configured; first rollout checks each address |
| Organization A activates or keeps organization B's name | Record value unique per request; activation only on a DNS match; DNS re-pointing moves the name |
| Removing a request takes down another organization's host | Only the row that registered the host releases it (`provider_added_at`); test |
| Malformed host reaches the provider's URL | Strict label pattern at entry and again in the client; tests for `..`, `a..b.c`, `-a.b.c`, trailing dot, 64-character label |
| A host that points at us but is on no project is claimed by another hosting account | Unverified; T001 (b). Removal tells the admin to delete the DNS record first. If claimable: register at add time and move the suffix to its own domain, by spec revision |
| The hosting token can manage more than the hub project | T001 (c) checks its scope; if team-wide, the owner either moves the hub to its own team or accepts it in writing before S2 |
| Add → verify → remove loops burn certificates | 10 additions per organization and day; 200 active hosts in total |
| The no-key path changes | Test pins the limiter key and limit for no-key calls; FACES live test after deploy (SC-006) |
| Key leaks through logs | Key text never passed to a logger; test spies on `console.*`; Sentry scrubs `Authorization` by default |
| A leaked key floods the CRM | Per-key ceiling; revoke; submissions carry `api_key_id` so they can be found |
| Hosting API shape differs from what is assumed | T017 reads the REST reference first; one client file with a fake for tests |
| Count-lock tests drift | Listed per slice; S2 rebases its counts on S1 |

## Out of scope

As in spec.md § Out of scope.

## Definition of Done

- S1 and S2 are draft PRs on hub `master` with gates run in the foreground (`bunx vitest run` on the touched tests, `bun run check`, `lint:design`, `lint:tokens`, `i18n:compile`), bodies naming this spec, the stories covered, what was checked and what was not.
- quickstart S1 passes on the QA stack. S2 is not started in this pass; quickstart S2 is run with the owner after it is built.
- Open ends are written twice: `TODO(handoff)` in code and the proposal's ledger.

## Review record (EGM, 2026-11-16)

Reports: meta `.local/egm/2026-11-16-org-api-keys-domains/{zoom_out,comprehension,critic}_report.md`. Zoom-out, comprehension and design critic ran in parallel on pass 1 of these documents; structural and style reviewers were not run.

| Finding | Resolution |
|---|---|
| Critic B2 / Comprehension B1: a foreign key could exhaust another door's visitor bucket | Visitor address dropped; organization checked in `doorCaller` before any limit; refusal before the body is read |
| Critic B1 / Comprehension B2: removing a pending request detached another organization's active host | `provider_added_at`; only that row releases the host |
| Critic B3 / Zoom-out 3 / Comprehension B3: guard failed open, cache per instance | Guard is a pure function, fails closed for every non-hub host, no cache; `resolvePublicDoor(slug, host?)` |
| Critic B4: host validation accepted `..` | Label pattern, asserted twice; tests |
| Zoom-out 1 / Comprehension M3: S2 built on an untested premise | T001 gates BUILDING S2; the one-record design is provisional |
| Zoom-out 2: token scope | Risk row; T001 (c) |
| Critic M1: unclaimed names at the hosting | T001 (b); removal text; revision path named |
| Critic M2: stale active row vs DNS | DNS is the truth; takeover in the activation transaction |
| Critic M3 / M4: static files, analytics, service worker, identity on linked hosts | FR-020 reworded; FR-023; route-id matching; quickstart S2 step 4 |
| Critic M6: leaked key cannot be cleaned up | `crm_door_submissions.api_key_id` |
| Critic M7: add/remove loops | Daily and total caps |
| Zoom-out 5: failed-attempt counter, visitor header, two organization checks | Counter and header cut; one check in `doorCaller` |
| Zoom-out 4: nothing sends a key | Stated in Assumptions; follow-up task for the FACES site |
| Zoom-out 6 / Comprehension M1: polling vs limit | Per-domain 10 s floor, 15 s interval, no organization bucket |
| Zoom-out 7: door admin links | Cut (Out of scope) |
| Comprehension B4, M2, M5–M10, nits | One status table; `hostState` verifies; `verifyKey` returns `lastUsedAt`; statuses and codes in the contract; `revokedByName`; concrete host rules; task references fixed; glossary; SC-006 spelled out |
| Zoom-out nit: `scopes` column | Cut |
| Contested | "Base includes serving forms on the host" (Zoom-out 7) is kept as an assumption for the owner to confirm: the routing record makes the host reach the hub in any case, so a guard is needed as soon as a host is registered |

Stage 9 (implementation readiness) runs on S1 only, against the S1 branch.

## Detailed Implementation Plan

See [tasks.md](tasks.md).
