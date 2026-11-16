# Implementation Plan: Organization API keys and linked domains (base)

**Branch**: `spec/121-org-api-keys-domains` (meta) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

## Summary

Two hub slices. **S1** gives an organization API keys (create, list, revoke) and lets a server that sends a key state its visitor's address on the door `submit` and `upload` endpoints. **S2** lets an organization link a subdomain with one DNS record that the hub checks by itself, registers the host with the hosting provider, and restricts a linked host to that organization's form pages.

## Problem and goal (Heilmeier, short)

- **What**: customers' servers are anonymous to the hub and share one rate limit; an organization cannot serve its forms on its own name.
- **How today**: the FACES site forwards forms without identifying itself (limit of 5 per minute for all its visitors together); forms live only on `hub.minion-ai.org`.
- **What is new**: a hashed organization key with a forwarded visitor address; one-record domain linking with automatic checking; a host guard.
- **Who cares**: the owner (FACES forms on `modelos.facesculptors.net` later; any customer's lead forms).
- **Risks**: see Risks & Mitigations. The largest: a linked host exposing more than forms; one organization activating another's name.
- **Cost**: two draft PRs, about 35 files, two migrations. One-time owner setup for S2.
- **Check**: [quickstart.md](quickstart.md); SC-001…SC-006.

## Technical Context

- **Hub**: Bun, SvelteKit 2.70 on Vercel (`adapter-vercel`, `nodejs22.x`, one function), Svelte 5, zod 4, Postgres (Supabase) with forced RLS and `withOrgCore`, migrations in `supabase/migrations/` applied by `scripts/db-migrate.ts` on production builds, each paired with a QA seed change, Paraglide (en, es), design-token lints.
- **Testing**: vitest, files beside the code; route tests call the handler with a mocked service (`src/routes/api/doors/public/[slug]/submit/server.test.ts`); `bunx vitest run <file>`. Never the full suite with a production `.env`. One `bun run check` at a time.
- **Constraints**: no new dependency; no change for callers without a key; no submitted value or key in any log.
- **Unknowns**: two, both in research (R3 chained CNAME on the hosting; R6 host name seen by the adapter). T001 settles them on a real host before S2 merges.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | This directory; EGM review recorded below before code starts |
| II. AS-IS → TO-BE → DELTA with evidence | spec.md, anchors from the 2026-11-16 read of `16def9eb`; two unverified claims are marked as such |
| III. Slice-scoped delivery | S1, S2: one draft PR each against hub `master`, from worktrees, gates in the foreground |
| IV. Required build steps | Design lints, RBAC gate on page and endpoints, Paraglide en/es + `i18n:compile`, route contract manifest and count locks: all listed per slice |
| V. Security and data | Tagged; owner approves this spec and merges both PRs; no production data change is part of the slices (the owner's DNS and credentials setup is theirs) |

Deviation: no FigCraft as-is/to-be (research R9); named in each PR body.

## Technical Plan

### Slice S1 — `feat/org-api-keys` (hub, from `master`)

| Area | Files |
|---|---|
| Schema | `supabase/migrations/<ts>_org_api_keys.sql`; `src/server/db/pg-org-integrations-schema.ts` (new) |
| Service | `src/server/services/org-api-keys.service.ts`: `createKey`, `listKeys`, `revokeKey`, `verifyKey(text) → { id, orgId } \| null`, `touchKey` |
| Caller helper | `src/server/doors/caller.ts`: `doorCaller(event, slug, bucket)` (research R2) |
| Door endpoints | `submit/+server.ts`, `upload/+server.ts` use `doorCaller`; `doors-form.service.ts` `submitFormDoor` / `uploadDoorFile` accept `{ keyOrgId }` and may return `wrong_org` |
| Settings API | `src/routes/api/settings/api-keys/+server.ts` (GET, POST), `[id]/+server.ts` (DELETE) |
| Page | `src/routes/(app)/settings/developers/{+page.server.ts,+page.svelte}`; `src/lib/components/settings/developers/ApiKeysSection.svelte` |
| Registration | `SettingsNav.svelte` `HUB_TABS`; `route-access-registry.ts` override `org-capability:settings:manage`; `route-design-manifest.ts` screen; `route-design-validation.ts` counts; `route-design-contracts.test.ts` wave A; `scripts/ui-audit-inventory.test.ts`; `frontend-contract-scanner.test.ts`; `rbac.service.ts` `API_WRITE_PREFIXES`; `src/lib/assistant/site-map.ts` |
| Inventories | `src/server/db/rls-bypass-inventory.json` (the prefix lookup); QA seed + matrix + `SEEDED_TABLES` |
| Text | `messages/en.json`, `messages/es.json` |

`doorCaller` is the only new decision point on the public path. Its no-key branch issues exactly today's limiter call with today's key string, which a test pins.

### Slice S2 — `feat/org-domains` (hub, stacked on S1)

| Area | Files |
|---|---|
| Schema | `supabase/migrations/<ts>_org_domains.sql`; same Drizzle file |
| DNS | `src/server/domains/dns.ts`: `lookupCname(host)` |
| Hosting | `src/server/domains/hosting.ts`: `addHost`, `hostState`, `removeHost`, `hostingConfigured()` |
| Service | `src/server/services/org-domains.service.ts`: `normaliseHost`, `listDomains`, `addDomain`, `checkDomain`, `removeDomain`, `linkedHost(host)` (cached), `activeHostsForOrg` |
| Guard | `src/server/domains/linked-host-handle.ts`, added to `sequence` in `src/hooks.server.ts` before `i18n.handle()`; `src/app.d.ts` `locals.linkedOrgId` |
| Organization match | `doors.service.ts` `resolvePublicDoor(slug, onlyOrgId?)`; `d/[slug]/+page.server.ts`, `submit`, `upload`, `click` pass `locals.linkedOrgId` |
| Settings API | `src/routes/api/settings/domains/+server.ts`, `[id]/+server.ts`, `[id]/check/+server.ts` |
| Page | `DomainsSection.svelte` on the Developers page |
| Door admin | `(app)/crm/doors/[id]/+page.server.ts` + `PageBody.svelte`: links on active linked hosts |
| Config | `.env.example`: `ORG_DOMAINS_CNAME_SUFFIX`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` |
| Inventories, seed, text | as S1 |

**`checkDomain` (the whole mechanism)**:

1. Limit: 12 checks per minute and organization.
2. `lookupCname(host)`: not `<target_label>.<suffix>` → store `dns: missing|mismatch` (+ what was found), stay `pending`, return.
3. `addHost(host)` at the provider ("already on this project" is success).
4. `hostState(host)`: a challenge → store its record, `hosting: challenge`; not configured yet → `hosting: issuing`; ready → continue.
5. In one transaction set `status = active`, `activated_at`. A unique violation on the active-host index → answer `taken`, stay `pending`.
6. Invalidate the `linkedHost` cache for that host.

`removeDomain`: `removeHost` at the provider first (a host never added counts as removed); only then mark the row removed and invalidate the cache. A provider failure leaves the row and returns `provider_error`.

**Guard decision table** (`linkedHostHandle`):

| Host | Path | Result |
|---|---|---|
| hub host, `localhost`, `127.0.0.1`, `*.vercel.app` | any | unchanged |
| not in `org_domains` | any | unchanged |
| listed, not active | any | 404 |
| active | form page, door endpoint, allowed asset | served, `locals.linkedOrgId` set |
| active | anything else | 404 |

### Order, rollout, rollback

- S1 can merge and ship alone. S2 merges after S1 and after T001 passes.
- Both migrations only add tables; rollback is reverting the PR (tables stay unused).
- S2 is inert until the owner sets the four env values: without them the section says "not available", `addDomain` refuses, and the guard finds no rows.
- Stacked branch: S2 is retargeted to `master` before the S1 branch is deleted.

## Alternatives

| Alternative | Why not |
|---|---|
| Keys per user (personal tokens) | The owner decided keys belong to the organization; a personal token dies when the person leaves |
| Require a key on every server call | Breaks the current FACES site (invariant) |
| Trust `x-forwarded-for` instead of a key | Anyone could forge a visitor address and evade the limit |
| Two DNS records from the start (TXT + CNAME) | More to copy; kept as the fallback if T001 fails |
| Only verify the domain, do not serve on it | Leaves the base untestable end to end; attaching a host later without the guard would expose the hub |
| Serve on linked hosts through a separate hosting project | A second deployment to run; the guard gives the same isolation in one |
| Provider-side one-click record creation (Domain Connect) | Needs an onboarding with each DNS provider; zero clicks after the record exists is reached without it |
| Background job that re-checks domains | Not needed to activate; the open page drives checks. Named as later work |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A linked host serves hub pages (login, APIs) | Guard is an allow-list, default 404; test table covers each row; SC-005 checked on the real host |
| Organization A activates organization B's name | Record value unique per request; active-host unique index; test with two organizations |
| A claimed-but-unproven name fills the hosting project | The provider is called only after the DNS record matches; 5 domains per organization |
| The no-key path changes | Test pins the limiter key and limit for no-key calls; FACES live test after deploy (SC-006) |
| Key leaks through logs | Key text is never passed to a logger; errors log the door slug and a code only (existing pattern); test greps the handler output for the key |
| Forged visitor address | Honoured only with a valid key; per-key ceiling bounds the damage of a leaked key until revoked |
| Guard cost on every request | Hub hosts skip the lookup; other hosts hit a 60 s cache |
| Negative cache hides a fresh activation | Cache invalidated on activation and removal |
| Hosting API shape differs from what is assumed | T014 reads the REST reference first; the client is one file with a fake for tests |
| Chained CNAME or host header assumption is wrong | T001 on a real host before merge; documented two-record fallback |
| Removal fails halfway | Provider first, row second; repeatable |
| Count-lock tests drift (routes, screens, waves) | Listed per slice; S2 rebases its counts on S1 |

## Out of scope

As in spec.md § Out of scope.

## Definition of Done

- S1 and S2 are draft PRs on hub `master` with gates run in the foreground (`bunx vitest run` on the touched tests, `bun run check`, `lint:design`, `lint:tokens`, `i18n:compile`), bodies naming this spec, the stories covered, what was checked and what was not.
- quickstart S1 passes on the QA stack. quickstart S2 is run by or with the owner after T001.
- Open ends are written twice: `TODO(handoff)` in code and the proposal's ledger.

## Review record (EGM)

Pending; filled after the review stages.

## Detailed Implementation Plan

See [tasks.md](tasks.md).
