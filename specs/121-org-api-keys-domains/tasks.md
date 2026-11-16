# Tasks: Organization API keys and linked domains (base)

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

All paths are in `minion_hub` unless they start with `meta:`. Tests are part of each task that adds logic (test file beside the code). Gates run in the foreground, one `bun run check` at a time. No commits to `master`; each slice ends as a draft PR.

## Phase 1: Setup

- [ ] T001 OWNER, gates BUILDING slice S2: (1) create the wildcard record `*.<suffix>` → the hub's hosting target; (2) create a hosting API token and note what it can manage (the hub project only, or the whole team); (3) list every host name the hub answers on today; (4) with one test subdomain confirm (a) a host that reaches the hosting through `<label>.<suffix>` gets a certificate and serves, (b) from a second hosting account, a host that points at `<label>.<suffix>` but is on no project cannot be claimed, nor can `x.<suffix>`, (c) the application sees the visitor's host name. Record results in meta:`specs/121-org-api-keys-domains/research.md` R3 and R6. If (a) or (b) fails, the spec is revised to two records before T015.
- [ ] T002 Worktree `~/.cache/claude-tmp/hub-keys`, branch `feat/org-api-keys` from `origin/master`; `bun install --frozen-lockfile`; read `AGENTS.md`.

## Phase 2: Foundational (S1)

- [ ] T003 Migration `supabase/migrations/<ts>_org_api_keys.sql` per data-model: `org_api_keys` with `name` check "`char_length(btrim(name)) between 1 and 60`", `prefix` unique with check "`prefix ~ '^[0-9a-f]{8}$'`", `key_hash text not null`, `created_by uuid`, `created_at`, `last_used_at`, `revoked_by`, `revoked_at`; index `(org_id) where revoked_at is null`; RLS enabled and forced, policy `org_api_keys_org_guc`; `revoke all` from `public, anon, authenticated`; `grant select, insert, update` to `app_ledger`. Same file: `alter table public.crm_door_submissions add column if not exists api_key_id uuid`.
- [ ] T004 Drizzle: `orgApiKeys` in new `src/server/db/pg-org-integrations-schema.ts`; `apiKeyId` on `crmDoorSubmissions` in `src/server/db/pg-doors-schema.ts`.
- [ ] T005 QA seed: one revoked key for the QA organization under `scripts/qa/seed/`, entries in `scripts/qa/seed/matrix.ts`, table in `SEEDED_TABLES` (`scripts/qa/seed/db.ts`).

## Phase 3: User Story 1 — Create and revoke a key (P1)

**Independent test**: quickstart S1 steps 1, 6, 7.

- [ ] T006 [US1] `src/server/services/org-api-keys.service.ts` + `.test.ts`: `generateKey()` (`mk_<8 hex>_<43 base64url>`), `hashKey`, `createKey(ctx, name)` (trim; empty or over 60 → `invalid_name`; 10 active → `limit_reached`; re-draw on prefix collision with `isUniqueViolation`; returns the key text once), `listKeys(ctx)` (never `key_hash`; creator and revoker display names, null when the person is gone), `revokeKey(ctx, id)` (idempotent; `not_found` for an unknown or foreign id). Tests: format, hash ≠ text, limit, idempotent revoke, list has no hash.
- [ ] T007 [US1] `src/routes/api/settings/api-keys/+server.ts` (GET, POST → 201) and `[id]/+server.ts` (DELETE) + `server.test.ts`: `requireOrgCapability(locals, 'settings', 'manage')`, `requireCoreCtx`, contract statuses and codes; `/api/settings/api-keys` in `API_WRITE_PREFIXES` (`src/server/services/rbac.service.ts`).
- [ ] T008 [US1] `src/routes/(app)/settings/developers/+page.server.ts` (`depends('settings:developers')`, capability gate, loads keys) and `+page.svelte` with `src/lib/components/settings/developers/ApiKeysSection.svelte`: list (`DataTable` `variant="plain"`: name, `mk_<prefix>_…`, created, created by, last used, status with revoked time and person), "New key" dialog, one-time reveal panel with a copy button and the sentence that it will not be shown again, revoke with confirmation, an example `curl`. Shared primitives and tokens only (`ui-design-governance` skill); a 403 says the role does not allow it.
- [ ] T009 [US1] Registration: `SettingsNav.svelte` `HUB_TABS` + icon; `route-access-registry.ts` `'/settings/developers': 'org-capability:settings:manage'`; `route-design-manifest.ts` `screen('/settings/developers', …, 'organization', 'form-settings')`; bump `ROUTE_CONTRACT_EXPECTATIONS` (`route-design-validation.ts`), wave A in `route-design-contracts.test.ts`, `scripts/ui-audit-inventory.test.ts`, `src/server/ui-audit/frontend-contract-scanner.test.ts`; `src/lib/assistant/site-map.ts`.
- [ ] T010 [US1] Texts in `messages/en.json` and `messages/es.json`; `bun run i18n:compile`.

## Phase 4: User Story 2 — Submit with the organization's key (P1)

**Independent test**: quickstart S1 steps 2–5.

- [ ] T011 [US2] `verifyKey(text) → { id, orgId, lastUsedAt } | null` and `touchKey(id)` in `org-api-keys.service.ts` + tests: malformed text returns `null` without a query; lookup by prefix on `getCoreDb()`; `timingSafeEqual` on hashes; revoked → `null`; `touchKey` is one conditional update (`last_used_at is null or < now() - 1 minute`). Add the file to `src/server/db/rls-bypass-inventory.json`.
- [ ] T012 [US2] `src/server/doors/caller.ts` + `caller.test.ts`: `doorCaller(event, slug, bucket: 'submit'|'upload')`, the six steps of research R2 in that order. Tests: no header → exactly `checkSharedRateLimit('door-<bucket>:<ip>:<slug>', 5|40)` and no other query; `Authorization: Basic …` → same as no header; malformed key → 401 and no query; unknown and revoked → 401; key of another organization than the door → 401 and no limiter call; unknown slug with a valid key → continues; valid → only `door-key-<bucket>:<keyId>` with 60|240, 429 over it; `touchKey` only when stale; the key text appears in no `console.*` call.
- [ ] T013 [US2] Call `doorCaller` first in `src/routes/api/doors/public/[slug]/submit/+server.ts` and `upload/+server.ts` (before the body is read); `submitFormDoor` in `src/server/services/doors-form.service.ts` accepts `keyId` and writes `api_key_id`. Extend both `server.test.ts` files and the service test; existing no-key tests pass unchanged.
- [ ] T014 S1 gates and PR: `bunx vitest run` on every touched test file and the count-lock tests, `bun run i18n:compile`, `bun run check`, `bun run lint:design && bun run lint:tokens`; quickstart S1 on the QA stack; draft PR `feat(settings): organization API keys for form doors` against `master`.

## Phase 5: Foundational (S2, branch `feat/org-domains` on S1) — after T001

- [ ] T015 Migration `supabase/migrations/<ts>_org_domains.sql` per data-model (columns incl. `provider_added_at`; unique `(org_id, host) where removed_at is null`; unique `(host) where status = 'active' and removed_at is null`; RLS as T003). Drizzle mirror `orgDomains`; QA seed (one pending, one active domain), matrix, `SEEDED_TABLES`.
- [ ] T016 [P] `src/server/domains/dns.ts` + test: `lookupCname(host)` with `node:dns/promises` `Resolver` (`1.1.1.1`, `8.8.8.8`), 3 s timeout → `{ kind: 'none' } | { kind: 'cname', target } | { kind: 'error' }`; resolver injectable.
- [ ] T017 [P] `src/server/domains/hosting.ts` + test with a fake `fetch`: read the hosting REST reference first and cite the pages in a comment; `hostingConfigured()`, `addHost`, `hostState → { state: 'ready'|'issuing'|'challenge', records? }` (calls verify when a challenge is pending), `removeHost` (not found = ok). Assert the label pattern before building any URL. 10 s timeout; errors carry a code, never the token. Names in `.env.example`.

## Phase 6: User Story 3 — Link a subdomain with one record (P2)

**Independent test**: quickstart S2 steps 1, 2, 5.

- [ ] T018 [US3] `src/server/services/org-domains.service.ts` + `.test.ts`: `normaliseHost` (data-model rules verbatim; tests for `..`, `a..b.c`, `-a.b.c`, `a.b.c.`, a 64-character label, `xn--`, two labels, a hub host), `addDomain` (`not_available`, `duplicate`, `limit_reached` at 5, 10 additions per day), `listDomains` with the status mapping of data-model, `checkDomain` (the five steps in plan.md), `removeDomain`. Tests: hosting not called before DNS matches; challenge adds a second record; second organization stays waiting; re-pointed DNS moves the name and `provider_added_at`; removing a pending request never calls the provider; provider failure on removal keeps the row; `capacity` at 200.
- [ ] T019 [US3] `src/routes/api/settings/domains/+server.ts`, `[id]/+server.ts`, `[id]/check/+server.ts` + tests; `/api/settings/domains` in `API_WRITE_PREFIXES`; count locks bumped on top of S1.
- [ ] T020 [US3] `src/lib/components/settings/developers/DomainsSection.svelte`: add field, status in plain words, record table with copy buttons, what was found instead, "Check now", removal confirmation that says to delete the DNS record first, the proxy hint, the "not available yet" state. Re-check waiting domains every 15 s while the page is visible. Texts en/es.

## Phase 7: User Story 4 — Other hosts serve only forms (P2)

**Independent test**: quickstart S2 steps 3, 4, 6, 7.

- [ ] T021 [US4] `src/server/domains/linked-host-handle.ts` + test for every row of the guard table in plan.md (locale-prefixed form paths, `/`, `/login`, `/api/health`, `/api/crm/doors`, `/ingest/decide`, feature not configured, desktop); `locals.linkedHost` in `src/app.d.ts`; add to `sequence` in `src/hooks.server.ts` before `i18n.handle()`; `HUB_HOSTS` in `.env.example`.
- [ ] T022 [US4] `activeDomainOrg(host)` in `org-domains.service.ts` (bypass read, inventory entry) and `resolvePublicDoor(slug, host?)` in `src/server/services/doors.service.ts`; pass `locals.linkedHost` from `src/routes/d/[slug]/+page.server.ts` and the `submit`, `upload`, `click` endpoints. Tests: foreign door → not found; removed or pending domain → not found; no host → unchanged.
- [ ] T023 [US4] Linked-host hygiene: `appHandle` returns anonymous when `locals.linkedHost` is set; analytics client not started and service worker not registered when the page's host is not a hub host (`src/hooks.client.ts`, `svelte.config.js`, root layout data). Test what can be unit-tested; the rest is quickstart S2 step 3.
- [ ] T024 S2 gates and PR: as T014; guard checked on a built server with a `Host` header for the seeded active domain; draft PR `feat(settings): link a subdomain to an organization and serve its forms there` against the S1 branch (retargeted to `master` before that branch is deleted).

## Phase 8: Polish

- [ ] T025 meta: proposal ledger entries for every `TODO(handoff)`; `node scripts/spec-index.mjs --check` and `node scripts/proposal-index.mjs --check`.
- [ ] T026 After the owner merges and deploys S1: SC-006 on the live FACES forms, and quickstart S1 step 3 against production.
- [ ] T027 Follow-up, separate PR in `faces-landing` after the owner creates a key: the two proxy routes send `Authorization: Bearer <key>` from an environment value.

## Dependencies

T003–T005 → T006–T010 (US1) → T011–T013 (US2) → T014. T001 → T015–T017 → T018–T020 (US3) → T021–T023 (US4) → T024. T016 and T017 are parallel. MVP = S1 (US1 + US2).
