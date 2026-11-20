# Tasks: Doors site SDK

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md).
Paths are relative to `minion_hub/` unless marked (faces). `[OWNER]` = human gate. Revised after EGM stages 5–7.

**Gates for every hub slice** (run in the foreground, capture the exit code): `bun run i18n:compile && bun run check`; `bunx vitest run <touched paths>` with `SUPABASE_DB_URL` unset; `bun run lint:design && bun run lint:tokens`; `bunx prettier --check <changed files>`. Never the full hub suite with a production `.env` present. Each slice ends with a draft PR to `master` naming this spec, the stories covered, the checks run and what was not checked.

## Approval

- [ ] T001 [OWNER] Approve the spec, including the deliberate tightening (foreign unlisted `Origin` → 403, JSON-only submit) and the element-over-iframe choice.

## S0 — Tolerant config reader (FR-019a) · `fix/doors-tolerant-config`

- [ ] T005 `src/lib/doors/kinds/form.ts`: `readFormConfig(raw)` returning the parsed config or `null` (`safeParse`). Replace the throwing `configSchema.parse` on public paths: `doors-form.service.ts` (`submitFormDoor`, `uploadDoorFile`) → `not_found`; `src/server/doors/kinds/form.server.ts` `publicView` returns `null` for an unreadable config (widen `ServerDoorKind.publicView` in `src/server/doors/kinds.ts` accordingly) → `d/[slug]/+page.server.ts` answers 404 and counts the view only after a successful `publicView`. Authenticated editor paths keep strict parsing and their error display.
- [ ] T006 Tests: a config with an unknown top-level key and one with an unknown field key → `not_found` on submit, upload and the hosted page loader; existing tests unchanged. Gates. Draft PR.
- [ ] T007 [OWNER] Merge S0 and confirm production before S1 is merged.

## S1 — Allowed sites and cross-origin access (US1 server half) · `feat/doors-allowed-sites`

- [ ] T010 Migration `supabase/migrations/<ts>_org_allowed_sites.sql` per `data-model.md` (RLS forced, org policy and grants following `20261025100000_crm_doors.sql:76-89` but without `delete`; revoke anon/authenticated); Drizzle mirror `src/server/db/pg-org-integrations-schema.ts`; QA seed so `scripts/qa/check-migration-seed-pairing.ts` passes.
- [ ] T011 `src/server/services/org-allowed-sites.service.ts`: `normaliseOrigin` (exact `https://host[:port]`; `http` only for `localhost` and `127.0.0.1`; lower case; rejects path, query, wildcard, credentials, `null`), `listAllowedSites`, `addAllowedSite` (limit 20, duplicate), `removeAllowedSite` (soft), `allowedOriginsForOrg(orgId)` cached 60 s without SWR and busted on change. Unit tests for each normalisation case.
- [ ] T012 `src/lib/doors/kinds/form.ts`: config key `embed?: boolean`; `Editor.svelte`: the "Allow embedding on our sites" switch with the host-page warning (FR-003a). The editor rebuilds the config from a fixed `Editable` list (`Editor.svelte:18-36`): add `embed` to the type, the `cfg` derivation and `emit`, or it is dropped on every edit (test this round trip). Messages en/es.
- [ ] T013 `src/server/doors/access.ts` (new): `doorAccess(event, slug, bucket)` and `preflight(event, slug)` exactly as in `plan.md` § One access decision (modes `direct`, `site`). `bucket` ∈ `submit | upload | read | preflight`; limiter keys keep today's format (`door-submit:${ip}:${slug}`, `door-upload:${ip}:${slug}`) and add `door-read:` and `door-preflight:`. The services keep their slug signatures and resolve the door again; the second lookup is accepted. Tests: no Origin; hub origin; linked origin with `embed` on; linked origin with `embed` off; unlinked; another organization's linked origin; removed origin after cache bust; `Origin: null`; limiter runs before the door lookup.
- [ ] T014 `src/routes/api/doors/public/[slug]/+server.ts` (new): `GET` per contract and `OPTIONS`. The body is built by one function, `publicFormDefinition(door, config, orgName)` in `form.server.ts`: door id, slug, title, description, org name, `form` = what `publicView` returns today (fields, consent text, consent required, success message), `limits` = `{ maxFileBytes: ATTACHMENT_LIMITS.proxiedMaxBytes, imageTypes: FORM_IMAGE_TYPES, fileTypes: [...ATTACHMENT_MIME_ALLOWLIST] }`. Never `tagIds` or `embed`. The keys the contract shows beyond these (`baseLocale`, `locales`, `sections`, `translations`, `defaultCountry`, field additions) arrive with S3 and S4. View counted only for mode `site`, non-bot. Route test.
- [ ] T015 `submit/+server.ts`, `upload/+server.ts`: call `doorAccess`; put its CORS headers on every response including errors; export `OPTIONS`; submit requires `application/json`; upload reads `?type=` when the body is `application/octet-stream`. Route tests: the existing `call` helpers build events without `url` and with a `text/plain` body and make `getCoreDb` throw, so update the helpers (add `url`, send `content-type: application/json`) and mock `$server/doors/access`; then every existing case must pass with unchanged expectations. Add: body with no content type → `400`; foreign unlisted origin → `403` and the service not called; CORS headers present on an error response for an allowed site.
- [ ] T016 Settings API `src/routes/api/settings/allowed-sites/+server.ts`, `[id]/+server.ts` with the `settings` `manage` capability; register the exact prefix `/api/settings/allowed-sites` in `API_WRITE_PREFIXES` (`rbac.service.ts:860-904`; note this also gates its GET on `settings:view`). Route tests incl. a member without the capability.
- [ ] T017 Settings page `src/routes/(app)/settings/developers/` ("Sites & API keys"), section "Allowed sites": list, add, remove, with optimistic feedback and the note that this controls browsers only. Register: `SettingsNav.svelte` (`HUB_TABS` in the organization group, `ICON_MAP`, not `adminOnly` — access comes from the capability), `route-access-registry.ts` override `org-capability:settings:manage`, `route-design-manifest.ts`, `ROUTE_CONTRACT_EXPECTATIONS` in `route-design-validation.ts` (endpoints and screens each +1 from their current values), the wave count in `route-design-contracts.test.ts`. Messages en/es. Follow the `ui-design-governance` skill.
- [ ] T018 Confirm from Vercel's documentation whether `x-forwarded-for` is overwritten by the platform; record the answer in the PR body. Gates. Draft PR.

## S2 — The `<minion-door>` element (US1 client half) · `feat/doors-embed` (on S1)

- [ ] T020 Read the Svelte 5 custom-element documentation first. `src/lib/doors/embed/`: `client.ts` (GET, upload, submit per contract; no zod), `messages.ts` (es, en, pt; test that the three have the same keys), `theme.ts`, `DoorForm.svelte` + `fields/` for today's field types (text, textarea, phone, email, select, date, checkbox, multiselect, file with preview, replace, remove, per-file state, retry, pre-upload refusal, photo shrink per contract), consent, honeypot, success and error states, focus on first error, labels and error association, live status for uploads. No imports from `$lib/components/ui`, Paraglide, `$app/*`, `@minion-stack/ui`.
- [ ] T021 `embed/element.ts`: a hand-written `HTMLElement` subclass registered as `minion-door` that attaches an open shadow root and calls Svelte's `mount(DoorForm, { target: shadowRoot, props })`, re-mounting on attribute change. Do NOT use `<svelte:options customElement>` (it makes the main build warn `options_missing_custom_element`, and the hub allows no warnings). Styles reach the shadow root through the embed build's compile option `css: 'injected'`. Attributes, theme defaults and events per contract; after a network failure on upload or submit the element re-runs the GET to tell "not allowed" from "unavailable"; states loading, ready, not allowed, not found, unavailable with retry, submitted; attribution from the page URL and referrer with the door id (reuse `$lib/doors/attribution` only if it has no app imports).
- [ ] T022 `vite.embed.config.ts` (new): Svelte plugin with `configFile: false` (the app's `svelte.config.js` imports the adapter and Paraglide preprocessor), `compilerOptions.css: 'injected'`, library build `formats: ['iife']`, a `name`, `fileName: () => 'v1.js'`, `outDir: 'static/doors'`, `copyPublicDir: false`, `emptyOutDir: false`. Script `build:embed` = that build followed by a size check script that fails above 60 KB gzip. In `package.json` `build`, run `build:embed` BEFORE `vite build` (SvelteKit copies `static/` during its build). Add `static/doors/` to `.gitignore`. Check `scripts/**/client-bundle-boundary*` still passes.
- [ ] T023 Automated (vitest, inside the configured include): `client.ts` against the contract examples with a stubbed `fetch`; the element's classification of 403, 404, network failure. Manual browser check, run by the orchestrator and recorded in the PR body, not a CI gate: built server on the local QA stack (never production), a static test page `tests/embed/index.html` served on two other local ports (one linked, one not): submit with a photo; unlinked shows "not allowed" and stores nothing; two elements on one page; keyboard-only completion; axe (injected from `node_modules/axe-core/axe.min.js`, a transitive install) reports no critical or serious issue.
- [ ] T024 Gates plus `bun run build:embed`. Draft PR.

## S3 — Rich form configuration (US2) · `feat/doors-rich-form` (on S2)

- [ ] T030 `src/lib/doors/countries.ts` (the 92 pairs from (faces) `src/lib/data/countries.ts`, `dialOf`, `flagOf`); a test asserting every sovereign state of the Americas and Europe is present (list in the test). Country names: helper placed so `scripts/qc/content-contract.test.ts` passes and the embed bundle does not pull the Paraglide runtime (research R7).
- [ ] T031 `form.ts`: sections, `showIf`, `number` (+`min`/`max`), `document`, phone `country`, `guide`, `optionHelp`, `width`, `defaultCountry`; `visibleFields(config, values)` shared by client and server; the new config errors; `usesNewFormKeys(config)`. Tests: fixtures of both production door configs parse and validate identically; each rule; hidden values dropped; chained and contact-field rules rejected.
- [ ] T032 `doors-form.service.ts`, `form.server.ts`, `crm-contact-ensure.ts`: validation honours visibility on validated values; a bare `document` feeds the contact document, a `CC value` one does not; non-default-country phones match on the full number only (FR-017a); `publicView` returns the additions; `maskSubmissionValues`/`SAFE_TYPES` and `SubmissionsPanel.svelte` handle `number` and `document`. Service tests incl. the `+34 912345678` vs `912345678` case.
- [ ] T033 Renderer: sections, visibility, number, phone with embedded country picker, document, guided photo zones (`guides.ts`, five inline SVG drawings), option descriptions, half width.
- [ ] T034 `components/doors/form/Public.svelte`: use `DoorForm` when `usesNewFormKeys(config)`, else today's body unchanged; hub tokens mapped onto the `--minion-door-*` variables.
- [ ] T035 `Editor.svelte`: sections (add, rename, reorder, delete — fields of a deleted section become unsectioned), per-field section, help, visibility rule, number range, phone country toggle, `document`, guide, option descriptions, half width, default country. Messages en/es.
- [ ] T036 Gates. Draft PR.

## S4 — Translations (US4 sc. 1–2) · `feat/doors-translations` (on S3)

- [ ] T040 `form.ts`: `baseLocale`, `translations`, `unknown_translation_key`; `localise(definition, lang)` (primary-tag reduction, fallback to base; option values stay canonical). Tests.
- [ ] T041 Renderer and element use `localise`; the hosted page passes the app locale; `Editor.svelte` gains a per-language panel. Messages en/es. Gates. Draft PR.

## S5 — FACES on the element (US4 sc. 3) · (faces) `feat/modelos-on-element`

- [ ] T050 [OWNER] Confirm the production changes: `faces-modelos` config (embed on, sections, rule, number range, country fields, guides, option descriptions, en/pt translations) and allowed sites `https://www.facesculptors.net`, `https://facesculptors.net`.
- [ ] T051 (faces) Reduce `src/routes/modelos/+page.svelte` to the wrapper, the two lines and theme variables; delete the files listed in `plan.md`; keep only the page title texts in the `modelos` i18n blocks; `npm run check`.
- [ ] T052 Browser check in es, en, pt on production with the test contact "PRUEBA Claude Borrar"; compare the stored row with an earlier one; `wc -l` for SC-002; submit from two networks for SC-003.
- [ ] T053 [OWNER] Merge.

## S6 — Organization API keys (US3) · `feat/doors-api-keys` (on S1)

- [ ] T060 Migration `<ts>_org_api_keys.sql`, Drizzle mirror, QA seed.
- [ ] T061 `org-api-keys.service.ts`: `createKey` (returns the key once; prefix collision → re-draw), `listKeys`, `revokeKey`, `verifyKey(bearer)` (prefix lookup via the RLS-bypass connection used by `resolvePublicDoor`, `timingSafeEqual` on the SHA-256, revoked, scope; never cached), `last_used_at` at most once a minute. Tests incl. wrong organization, revoked, malformed, limit 20.
- [ ] T062 `doorAccess`: mode `key` per `plan.md`; per-key ceilings always; `x-minion-visitor-ip` honoured only with a valid key and a valid IPv4/IPv6; failed attempts 10/min per address → `401`. Tests incl. key sent with a foreign `Origin` (still `key`, no CORS headers) and a rotating visitor address hitting the key ceiling.
- [ ] T063 Settings API `api/settings/api-keys` + page section "API keys" (create dialog showing the key once with copy, list, revoke with confirm, the server-only warning). Messages en/es. Gates. Draft PR.

## Review

- [x] T080 EGM design review, stages 5–7 (2026-11-13); findings folded in (`plan.md` § Review record).
- [x] T081 EGM implementation-readiness review (stage 9) of the revised documents (2026-11-13); findings folded into the tasks above.
- [ ] T082 Independent review of each hub slice's diff before the PR is offered for merge.
- [ ] T083 `/speckit-converge`: unbuilt work appended here; open ends recorded as `TODO(handoff)` and in the proposal.

## Dependencies

S0 → S1 → S2 → S3 → S4 → S5. S6 after S1, independent of S2–S5. S2's renderer may be written against the contract while S1 is in review.
