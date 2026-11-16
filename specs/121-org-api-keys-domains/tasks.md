# Tasks: Organization API keys and linked domains (base)

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

All paths are in `minion_hub` unless they start with `meta:`. Tests are part of each task that adds logic (the hub's convention: test file beside the code). Gates run in the foreground, one `bun run check` at a time. No commits to `master`; each slice ends as a draft PR.

## Phase 1: Setup

- [ ] T001 Owner setup and real-host test for S2 (blocks merging S2, not building it): create the wildcard record `*.<suffix>` → the hub's hosting target in the hub's DNS; create a hosting API token limited to the hub project; set `ORG_DOMAINS_CNAME_SUFFIX`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` on the hub project; with one test subdomain confirm (a) a host that reaches the hosting through `<label>.<suffix>` gets a certificate and serves, (b) `event.url.hostname` equals the visitor's host. Record the result in meta:`specs/121-org-api-keys-domains/research.md` R3 and R6. If (a) fails, switch to the two-record fallback in `src/server/services/org-domains.service.ts` before merge.
- [ ] T002 Create worktree `~/.cache/claude-tmp/hub-keys` branch `feat/org-api-keys` from `origin/master`; `bun install`; read `CLAUDE.md`/`AGENTS.md`.

## Phase 2: Foundational (S1)

- [ ] T003 Migration `supabase/migrations/<ts>_org_api_keys.sql` per data-model: columns `id`, `org_id text not null`, `name text not null` ("1–60 characters, trimmed", as a check), `prefix text not null unique` ("8 hex characters", as a check), `key_hash text not null`, `scopes jsonb not null default '["doors:submit"]'`, `created_by`, `created_at`, `last_used_at`, `revoked_by`, `revoked_at`; index `(org_id) where revoked_at is null`; RLS enabled and forced with policy `org_api_keys_org_guc`; `revoke all` from `public, anon, authenticated`; `grant select, insert, update` to `app_ledger`.
- [ ] T004 Drizzle mirror `orgApiKeys` in new `src/server/db/pg-org-integrations-schema.ts`.
- [ ] T005 QA seed: one revoked key for the QA organization in `scripts/qa/seed/` (new seeder or the settings one), entries in `scripts/qa/seed/matrix.ts`, table in `SEEDED_TABLES` (`scripts/qa/seed/db.ts`).

## Phase 3: User Story 1 — Create and revoke a key (P1)

**Independent test**: quickstart S1 steps 1 and 6.

- [ ] T006 [US1] `src/server/services/org-api-keys.service.ts` + `.test.ts`: `generateKey()` (`mk_<8 hex>_<43 base64url>`), `hashKey`, `createKey(ctx, name)` (trim; refuse empty or over 60 → `invalid_name`; refuse at 10 active → `limit_reached`; re-draw on prefix collision; returns the key text once), `listKeys(ctx)` (never returns `key_hash`; includes creator display name), `revokeKey(ctx, id, by)` (idempotent; `not_found` for another organization's id). Tests: format, hash differs from text, limit, revoke idempotent, list has no hash.
- [ ] T007 [US1] `src/routes/api/settings/api-keys/+server.ts` (GET, POST) and `[id]/+server.ts` (DELETE) + `server.test.ts`: `requireOrgCapability(locals, 'settings', 'manage')`, `requireCoreCtx`, contract answers and error codes; add `/api/settings/api-keys` to `API_WRITE_PREFIXES` in `src/server/services/rbac.service.ts`.
- [ ] T008 [US1] Page `src/routes/(app)/settings/developers/+page.server.ts` (`depends('settings:developers')`, capability gate, loads keys) and `+page.svelte` composing `src/lib/components/settings/developers/ApiKeysSection.svelte`: list (`DataTable` `variant="plain"`: name, `mk_<prefix>_…`, created, created by, last used, status), "New key" dialog (name field), one-time reveal panel with copy button and the sentence that it will not be shown again, revoke with confirmation. Shared primitives and tokens only; follow the `ui-design-governance` skill; a 403 says the role does not allow it.
- [ ] T009 [US1] Registration: `SettingsNav.svelte` `HUB_TABS` + icon; `route-access-registry.ts` `'/settings/developers': 'org-capability:settings:manage'`; `route-design-manifest.ts` `screen('/settings/developers', …, 'organization', 'form-settings')`; bump `ROUTE_CONTRACT_EXPECTATIONS` (`route-design-validation.ts`), wave A in `route-design-contracts.test.ts`, `scripts/ui-audit-inventory.test.ts`, `src/server/ui-audit/frontend-contract-scanner.test.ts`; `src/lib/assistant/site-map.ts`.
- [ ] T010 [US1] Texts in `messages/en.json` and `messages/es.json`; `bun run i18n:compile`.

## Phase 4: User Story 2 — Submit with a key and visitor addresses (P1)

**Independent test**: quickstart S1 steps 2–5.

- [ ] T011 [US2] `verifyKey(text)` and `touchKey(row)` in `org-api-keys.service.ts` + tests: malformed text returns `null` without a query; lookup by prefix on `getCoreDb()`; `timingSafeEqual` on hashes; revoked → `null`; `touchKey` writes only when `last_used_at` is null or older than 60 s. Add the file to `src/server/db/rls-bypass-inventory.json`.
- [ ] T012 [US2] `src/server/doors/caller.ts` + `caller.test.ts`: `doorCaller(event, slug, bucket: 'submit'|'upload')` per research R2. Tests: no header → exactly `checkSharedRateLimit('door-<bucket>:<ip>:<slug>', 5|40)` and nothing else; visitor header without key is ignored; bad key → 401 and one `door-key-fail:<ip>` count, 429 over 10; valid key → ceiling 60|240 on `door-key-<bucket>:<keyId>`; valid key + visitor → per-visitor bucket on the visitor address; non-IP visitor → 400 `invalid_visitor`; the key text appears in no `console.*` call.
- [ ] T013 [US2] Use `doorCaller` in `src/routes/api/doors/public/[slug]/submit/+server.ts` and `upload/+server.ts`; pass `keyOrgId` to `submitFormDoor` / `uploadDoorFile` in `src/server/services/doors-form.service.ts`, which return `wrong_org` when the door belongs to another organization; routes answer `401 unauthorized` and count a failed attempt. Extend both `server.test.ts` files and `doors-form.service.test.ts`; the existing no-key tests must pass unchanged.
- [ ] T014 S1 gates and PR: `bunx vitest run` on every touched test file, `bun run check`, `bun run lint:design && bun run lint:tokens`; quickstart S1 on the QA stack (`bun run dev:local`); draft PR `feat(settings): organization API keys for form doors` against `master`.

## Phase 5: Foundational (S2, branch `feat/org-domains` on S1)

- [ ] T015 Migration `supabase/migrations/<ts>_org_domains.sql` per data-model: `host text not null`, `target_label text not null unique`, `status text not null default 'pending'` check in (`pending`, `active`), `check_state jsonb`, creator, `activated_at`, `removed_by`, `removed_at`; unique `(org_id, host) where removed_at is null`; unique `(host) where status = 'active' and removed_at is null`; RLS as T003. Drizzle mirror `orgDomains`; QA seed (one pending domain), matrix, `SEEDED_TABLES`.
- [ ] T016 [P] `src/server/domains/dns.ts` + test: `lookupCname(host)` with `node:dns/promises` `Resolver` (`1.1.1.1`, `8.8.8.8`), 3 s timeout, returns `{ kind: 'none' } | { kind: 'cname', target }` (lower case, no trailing dot); resolver injectable.
- [ ] T017 [P] `src/server/domains/hosting.ts` + test with a fake `fetch`: read the hosting REST reference first and cite the pages in a comment; `hostingConfigured()`, `addHost(host)` ("already on this project" = ok), `hostState(host) → { state: 'ready' | 'issuing' | 'challenge', records? }`, `removeHost(host)` (not found = ok). 10 s timeout; errors carry a code, never the token. Add the four names to `.env.example`.

## Phase 6: User Story 3 — Link a subdomain with one record (P2)

**Independent test**: quickstart S2 steps 1, 2, 5, 6.

- [ ] T018 [US3] `src/server/services/org-domains.service.ts` + `.test.ts`: `normaliseHost` (rules quoted from data-model: "an IP address, has fewer than three labels, contains characters outside `[a-z0-9.-]`, is longer than 253 characters, or ends with the hub's own domains" → `invalid_host`), `addDomain` (`not_available` when unconfigured, `duplicate`, `limit_reached` at 5, 16-character base32 label), `listDomains`, `checkDomain` (the six steps in plan.md, 12 checks per minute and organization), `removeDomain` (provider first), `expectedRecords(domain)`. Tests: mismatch reports what was found; hosting is not called before DNS matches; challenge adds a second record; second organization gets `taken` and stays pending; provider failure on removal keeps the row.
- [ ] T019 [US3] `src/routes/api/settings/domains/+server.ts`, `[id]/+server.ts`, `[id]/check/+server.ts` + tests; `/api/settings/domains` in `API_WRITE_PREFIXES`; route count locks bumped on top of S1.
- [ ] T020 [US3] `src/lib/components/settings/developers/DomainsSection.svelte` on the Developers page: add field, per domain a status badge in plain words, the record table (type, name, value, copy buttons, found or not), what was found instead, "Check now", remove with confirmation, the proxy hint, the "not available yet" state. Re-check waiting domains every 15 s while the page is visible; stop when none wait. Texts en/es.

## Phase 7: User Story 4 — A linked host serves only forms (P2)

**Independent test**: quickstart S2 steps 3, 4, 7.

- [ ] T021 [US4] `linkedHost(host)` (cached 60 s, negative results too, invalidated in `checkDomain`/`removeDomain`) and `activeHostsForOrg(ctx)` in `org-domains.service.ts`; inventory entry for the bypass read.
- [ ] T022 [US4] `src/server/domains/linked-host-handle.ts` + test covering every row of the guard decision table in plan.md (including locale-prefixed form paths, `/`, `/login`, `/api/health`, `/api/crm/doors`); `locals.linkedOrgId` in `src/app.d.ts`; add to `sequence` in `src/hooks.server.ts` before `i18n.handle()`. Build the asset allow-list by loading a form page on the QA stack and listing the same-host requests it makes; write the list as a constant with a comment on how it was obtained.
- [ ] T023 [US4] `resolvePublicDoor(slug, onlyOrgId?)` in `src/server/services/doors.service.ts`; pass `locals.linkedOrgId` from `src/routes/d/[slug]/+page.server.ts` and the `submit`, `upload`, `click` endpoints (through `doors-form.service.ts` where the service resolves the door). Tests: foreign door on a linked host → not found; no `linkedOrgId` → unchanged.
- [ ] T024 [US4] Door admin: `(app)/crm/doors/[id]/+page.server.ts` returns the organization's active hosts; `PageBody.svelte` shows the public link on each with a copy button.
- [ ] T025 S2 gates and PR: as T014; guard checked on a built server (`bun run build && bun run preview`) with a `Host` header for a seeded active domain; draft PR `feat(settings): link a subdomain to an organization and serve its forms there` against the S1 branch, body states that T001 must pass before merge.

## Phase 8: Polish

- [ ] T026 meta: fill `plan.md` § Review record; proposal ledger entries for every `TODO(handoff)`; `node scripts/spec-index.mjs --check` and `node scripts/proposal-index.mjs --check`.
- [ ] T027 After the owner merges and deploys S1: repeat the FACES live test (SC-006) and quickstart S1 step 5 against production with no key.

## Dependencies

T003–T005 → T006–T010 (US1) → T011–T013 (US2) → T014. S2: T015–T017 → T018–T020 (US3) → T021–T024 (US4) → T025. T001 runs any time and blocks only the merge of S2. T016 and T017 are parallel. MVP = S1 (US1 + US2).
