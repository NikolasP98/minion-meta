# Tasks: Doors site SDK

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md).
Paths are relative to `minion_hub/` unless marked (meta) or (faces). `[P]` = can run in parallel with its neighbours. `[OWNER]` = human gate.

## Approval and foundations

- [ ] T001 [OWNER] Approve the spec (security, data). Recorded in the meta board spec `specs/2026-11-13-doors-site-sdk-spec.md`.
- [ ] T002 Re-read hub `origin/master` at slice start; reconcile `research.md` anchors that moved.

## S1 — Allowed sites and cross-origin access (US1, server half) · `feat/doors-allowed-sites`

- [ ] T010 Migration `supabase/migrations/<ts>_org_allowed_sites.sql` per `data-model.md` (RLS forced, org GUC policy, grants as `20261025100000_crm_doors.sql:76-89`, revoke anon/authenticated); Drizzle mirror `src/server/db/pg-org-integrations-schema.ts`; QA seed so `scripts/qa/check-migration-seed-pairing.ts` passes.
- [ ] T011 `src/server/services/org-allowed-sites.service.ts`: `normaliseOrigin`, `listAllowedSites`, `addAllowedSite` (limit 20, duplicate), `removeAllowedSite` (soft), `allowedOriginsForOrg` cached 60 s and busted on change. Unit tests for normalisation: path, wildcard, `http` non-localhost, upper case, trailing slash, port, `null`.
- [ ] T012 `src/server/doors/access.ts`: `doorAccess(event, slug)` returning `{ status }` or `{ door, ctx, mode: 'site' | 'direct', rateIp, cors }`; `preflight(event, slug)`. Tests: linked origin, unlinked, other organization's origin, removed origin, missing `Origin`, same origin.
- [ ] T013 `src/routes/api/doors/public/[slug]/+server.ts`: `GET` (projection per contract, `id` included, no `tagIds`, view count, 60/min) and `OPTIONS`. Add `limits` from `$lib/attachments/limits` and `FORM_IMAGE_TYPES`. Route test.
- [ ] T014 `submit/+server.ts`, `upload/+server.ts`: use `doorAccess`, attach CORS headers to every response including errors, export `OPTIONS`; upload reads `?type=` when the body is `application/octet-stream`. Extend both route tests; existing tests stay green unchanged.
- [ ] T015 Settings API `src/routes/api/settings/allowed-sites/+server.ts` and `[id]/+server.ts` with `requireOrgCapability(settings, manage)`; register the prefix in `API_WRITE_PREFIXES` (`rbac.service.ts:860-904`). Route tests incl. a member without the capability.
- [ ] T016 Settings page `src/routes/(app)/settings/developers/` ("Sites & API keys"), section "Allowed sites": list, add, remove with optimistic feedback (`createOptimistic`), error messages. Register: `SettingsNav.svelte` `HUB_TABS` + `ICON_MAP`, `route-access-registry.ts` override `org-capability:settings:manage`, `route-design-manifest.ts` `screen(...)`, `ROUTE_CONTRACT_EXPECTATIONS` (+1 screen), wave count in `route-design-contracts.test.ts`. Messages in `messages/en.json` and `es.json`.
- [ ] T017 Gates (foreground): `bun run i18n:compile && bun run check`; `bunx vitest run` on touched paths with `SUPABASE_DB_URL` unset; `bun run lint:design && bun run lint:tokens`; prettier on changed files. Draft PR.

## S2 — Rich form configuration and the shared renderer (US2) · `feat/doors-rich-form` [P with S1]

- [ ] T020 `src/lib/doors/countries.ts` (92 pairs from (faces) `src/lib/data/countries.ts`, `dialOf`, `flagOf`); country-name helper placed so `scripts/qc/content-contract.test.ts` passes (R7).
- [ ] T021 `src/lib/doors/kinds/form.ts`: config and field additions per `data-model.md` except translations; `document` type; `showIf` evaluation shared by client and server (`visibleFields(config, values)`); new config errors. Tests in `form.test.ts`: old configs parse identically (fixtures of both production doors' configs, values redacted), each new rule, hidden-field dropping.
- [ ] T022 `doors-form.service.ts` + `form.server.ts`: `validateSubmission` honours visibility; `contactFromValues` reads a `document` field; `publicView` returns the additions; `maskSubmissionValues`/`SAFE_TYPES` and `SubmissionsPanel.svelte` handle `document`. Service tests.
- [ ] T023 Renderer `src/lib/doors/embed/`: `DoorForm.svelte` (props `definition`, `baseUrl`, `lang`, callbacks `onready|onsubmitted|onerror`), `fields/` (text, textarea, email, select, date, checkbox, multiselect, phone with country, document, file zone with guide, preview, replace, remove, pre-upload refusal with name and reason, photo shrink), `client.ts`, `messages.ts` (es, en, pt), `theme.ts`, `guides.ts` (five inline SVG drawings). No imports from `$lib/components/ui`, Paraglide, `$app/*` or `@minion-stack/ui`. Accessibility per FR-010. Pure-logic tests: `client.ts` against contract examples, message completeness across the three languages.
- [ ] T024 `components/doors/form/Public.svelte` becomes a wrapper passing `definition`, `baseUrl=""`, the app locale, and hub tokens mapped onto the `--minion-door-*` variables. `d/[slug]/+page.server.ts` unchanged apart from data shape.
- [ ] T025 `Editor.svelte`: sections (add, rename, reorder, delete), per-field section, help, visibility rule, phone country toggle, `document` type, guide picker, default country. Follow `ui-design-governance`; messages en/es.
- [ ] T026 Browser check on a local build pointed at production (recipe in the FACES memory note): `/d/faces-historia-clinica` and `/d/faces-modelos` render and validate as before; do not submit to production without the owner's word beyond the existing test contact.
- [ ] T027 Gates as T017. Draft PR.

## S3 — The `<minion-door>` element (US1, client half) · `feat/doors-embed` (on S2)

- [ ] T030 Read the Svelte 5 custom-element docs; `embed/element.ts` defines `minion-door` (attributes `slug`, `lang`, `origin`; open shadow root; theme defaults; events per contract, no values in details).
- [ ] T031 States: loading, ready, not allowed (CORS failure), not found, unavailable with retry, submitted.
- [ ] T032 Attribution from the page URL and referrer with the door id (reuse `$lib/doors/attribution` if it is free of app imports).
- [ ] T033 `vite.embed.config.ts` + `build:embed` chained into `build`; output `static/doors/v1.js`, git-ignored; build fails above 60 KB gzip; long-cache headers are not set (the file name is the version).
- [ ] T034 `static/doors/demo.html` is NOT shipped; a test page lives under `tests/embed/` and is served locally on a second port for the cross-origin check (linked, unlinked, two elements on one page, keyboard-only pass).
- [ ] T035 Gates as T017 plus `bun run build:embed`. Draft PR.

## S4 — Organization API keys (US3) · `feat/doors-api-keys` (on S1)

- [ ] T040 Migration `<ts>_org_api_keys.sql`, Drizzle mirror, QA seed.
- [ ] T041 `org-api-keys.service.ts`: `createKey` (returns the key once), `listKeys`, `revokeKey`, `verifyKey(bearer)` (prefix lookup via core connection, `timingSafeEqual`, revoked, scope), throttled `last_used_at`. Tests incl. wrong org, revoked, malformed, limit 20.
- [ ] T042 `doorAccess`: mode `key`; `x-minion-visitor-ip` honoured only then (valid IPv4/IPv6); failed attempts 10/min per caller → `401 unauthorized`; key-bucket ceilings. Tests.
- [ ] T043 Settings API `api/settings/api-keys` + page section "API keys" (create dialog showing the key once with copy, list, revoke with confirm, server-only warning). Messages en/es.
- [ ] T044 Gates as T017. Draft PR.

## S5 — Client package (US3 sc. 4) · (meta) `feat/doors-client-package` [P]

- [ ] T050 (meta) `packages/doors/`: `createDoor`, `messageFor`, types from the contract; zero dependencies; tests with a stubbed `fetch` against the contract examples; README with the two-line embed and the server example; changeset.
- [ ] T051 (meta) `pnpm --filter @minion-stack/doors build && test`; repo gates the CI workflow lists. Draft PR to `dev`.

## S6 — Translations (US4 sc. 1–2) · `feat/doors-translations` (on S3)

- [ ] T060 `form.ts`: `locales`, `translations`, `unknown_translation_key`; `localise(definition, lang)` returns display text while option values stay canonical. Tests.
- [ ] T061 Renderer and element use `localise`; `Editor.svelte` gains a per-language panel. Messages en/es.
- [ ] T062 Gates as T017. Draft PR.

## S7 — FACES on the element (US4 sc. 3) · (faces) `feat/modelos-on-element`

- [ ] T070 [OWNER] Confirm the production changes: `faces-modelos` config update (sections, rule, country fields, guides, en/pt translations) and allowed sites `https://www.facesculptors.net`, `https://facesculptors.net`.
- [ ] T071 (faces) Reduce `src/routes/modelos/+page.svelte` to the wrapper, the two lines and theme variables; delete the files listed in `plan.md`; `npm run check`.
- [ ] T072 Browser check in es, en, pt against production with the existing test contact; compare stored rows; count lines for SC-002.
- [ ] T073 [OWNER] Merge order script: hub slices → wait for production → faces PR.

## Review

- [ ] T080 EGM design review of this directory before implementation (stages 5–7); findings folded into spec, plan and tasks.
- [ ] T081 EGM implementation review per hub slice (stages 8–9) before the PR is offered for merge.
- [ ] T082 `/speckit-converge`: unbuilt work appended here; open ends recorded as `TODO(handoff)` and in the proposal.

## Dependencies

S1 ∥ S2 → S3 (needs S2; cross-origin check needs S1) ∥ S4 (needs S1) → S6 (needs S3) → S7 (needs S1–S3, S6 in production). S5 depends only on the contract.
