# Implementation Plan: Collection points ("doors")

**Spec**: `specs/041-hub-collection-points/spec.md` · **Contracts**: `contracts/data-model.md`, `contracts/kinds-and-api.md`
**Repo**: minion_hub, PR base `master` (`node scripts/repo-policy.mjs show hub`). Seven draft PRs, one per slice. **The owner approves this spec before S0 starts and merges every slice** (security + data tag).
**Anchors**: hub `origin/master @ 92a0aa70`.

## Constitution check
- **I. Spec before code**: this spec, plan and tasks precede every hub commit. ✔
- **II. Evidence**: every AS-IS line has a file:line at `92a0aa70` or a named memory. Unverified items say so (the `ensureCrmContact` transaction-abort note, the FACES data loss). ✔
- **III. Slice-scoped delivery**: seven slices, each in its own worktree with a real `bun install --frozen-lockfile` (a symlinked `node_modules` hangs Vite and breaks `lint:tokens`). Gates run in the foreground with `timeout`, exit codes captured, never piped. ✔
- **IV. Required build steps**: the route contract (S0 only), RBAC (each slice for its endpoints; S0 for pages and nav), i18n (each slice, anchored, see below), design lint (every UI slice). ✔
- **V. Security and data**: S0 (schema, PII tables, public route), S2 (public write of personal or clinical data) and S4 (outbound messages) carry the human gates. No production data script is part of this spec. ✔

## Technical context
Bun · SvelteKit 2 · Svelte 5 runes · Drizzle over Postgres (Supabase) with forced RLS via `withOrgCore` · zod · vitest with `createMockDb()` (`src/server/test-utils/mock-db.ts`) · Paraglide · QA stack `bun run dev:local` → `http://127.0.0.1:5199`. Personas are `<matrixId>@qa.minion.test` / `QaStack!2026`, e.g. `tenancy.user.owner@qa.minion.test`, `tenancy.user.manager@…`, `tenancy.user.staff@…`, `tenancy.user.viewer@…`, all in org `qa-business`. Browser QA uses a private chromium (`:9224`) or a named cloud browser, never the shared `:9223`.

## Decisions (smallest thing that fully works)

| # | Decision | Why |
|---|---|---|
| D1 | **One public page `/d/[slug]`** for form, FAQ and offer. One route-contract entry, one allowlist prefix, one fixture. | The brief suggested `/f/` and `/faq/`. Three public routes would mean three manifest entries, three wave-E bumps and three allowlist edits, all in shared files. A short neutral path also keeps shared links short. FAQ SEO does not depend on the path; JSON-LD is in the page. |
| D2 | **Door slugs are globally unique** (`crm_doors_slug_uniq`). `/book` keeps per-org slugs. | Public URLs carry no org. Per-org uniqueness is exactly the ambiguity `/book` documents as R11 (`scheduling-public.service.ts:22-24`). |
| D3 | **All schema in one S0 migration** (`20261025100000_crm_doors.sql`), including the S2 and S4 tables and `crm_contacts.first_touch`. | Seed pairing is CI-enforced per migration PR. A single migration means one seed module, one baseline touch and no ordering between parallel migrations. The tables are inert until their slice ships. |
| D4 | **Kinds are discovered by file convention** (`import.meta.glob`, contracts/kinds-and-api.md). | S2, S5 and S6 then add only new files. No switch statement is shared across three PRs. |
| D5 | **`first_touch jsonb` column on `crm_contacts`**, written only on INSERT. Not stored in `custom_fields`. | `custom_fields` is user-editable (`setContactCustomField`, `crm-contacts.service.ts:1253`). An origin users can rewrite cannot be trusted for "which doors convert". The column needs a partial expression index for the funnel. |
| D6 | **The follow-up runs inside the live `/api/jobs/tick`**, as a separate try/catch sweep next to `evaluateInboxRules()` (`jobs/tick/+server.ts:42-48`). It is not a new tick and not the flow editor. | `/api/jobs/tick` is already scheduled on netcup every ten minutes (`system-automations.ts:77`), allowlisted and authenticated, so no crontab, allowlist or env change is needed. The reminders tick is unscheduled (:127-131). The flow editor has no hub executor (AS-IS D). This follows the inbox-evaluator precedent, which shares the same route and adds no crontab line (system-automations :72-76). The ten-minute cadence is why the minimum delay is 15 minutes. |
| D7 | **The follow-up is claimed before it is sent**, with a unique `(org, door, contact)` row plus a gateway idempotency key. It is never retried automatically. | Copies `processOrgReminders` (`reminders.service.ts:59`, claim at :133-140). Sending a person the same message twice costs more than skipping one. |
| D8 | **Explicit `accountId` per follow-up**, passed to `sendContactMessage` through a new optional `opts.accountId` (S4 edits `crm-send.service.ts:49`). | A new lead has no `messages` row, so the current account inference (:60-74) picks nothing. Cross-org WhatsApp accounts have happened. |
| D9 | **No DELETE for doors; switch them off.** Submissions FK `on delete restrict`. | This is patient data. An off switch is all the brief asks for. |
| D10 | **Next offers is a new service file** `crm-next-offers.service.ts` behind a new GET endpoint and an on-demand panel, copying `CrmSimilarWins`. | `pos.service.ts` exports are frozen (`pos-service-boundaries.test.ts`). The panel pattern already exists. |
| D11 | **FAQ drafting is one on-demand `generateObject` call** over a sample of at most 400 messages. Nothing is persisted until the owner saves. | No background cost, and it reuses `getOpenRouterModel` (`src/server/llm.ts:122`) and the tag-evaluate precedent. |
| D12 | **Shared contact find-or-create** is moved out of `scheduling-bookings.service.ts:264-351` into `crm-contact-ensure.ts` by S0, with behaviour unchanged, plus `source` and `firstTouch` parameters. | S1 (booking) and S2 (form) must dedupe contacts identically. A copy would drift. |

## Slices

Branch names are hub branches. Every slice: worktree `~/.cache/claude-tmp/hub-doors-sN`, base `origin/master` (S1, S2, S4, S5, S6: base on `origin/feat/collection-points` while S0 is unmerged, then `git rebase origin/master` after S0 merges), draft PR to `master`.

### S0 — Doors foundation (`feat/collection-points`, the existing worktree `~/.cache/claude-tmp/hub-cp`) · **security/data** · migration `20261025100000`
Owns (creates):
- `supabase/migrations/20261025100000_crm_doors.sql` (contracts/data-model.md)
- `src/server/db/pg-doors-schema.ts` (+ `first_touch` on the `crmContacts` Drizzle table in `src/server/db/pg-crm-schema.ts:40-77`, one line)
- `src/server/services/crm-contact-ensure.ts` (+ `.test.ts`), moved from `scheduling-bookings.service.ts:259-351`. S0 edits `scheduling-bookings.service.ts` **only** to delete the private copies and import the new module (call site :532), with behaviour identical.
- `src/server/services/doors.service.ts` (+ `.test.ts`): `resolvePublicDoor`, `bumpDoorStat`, `isLikelyBot`, `listDoorsWithFunnel`, `createDoor`, `updateDoor`, `getDoor`
- `src/lib/doors/types.ts`, `src/lib/doors/attribution.ts` (+ `.test.ts`), `src/lib/doors/kinds.ts`, `src/server/doors/kinds.ts`, `src/lib/components/doors/registry.ts`
- `src/routes/api/crm/doors/+server.ts`, `src/routes/api/crm/doors/[id]/+server.ts`
- `src/routes/(app)/crm/doors/+page.server.ts`, `+page.svelte` (list, funnel, optimistic toggle via `createOptimistic` + `Toggle pending`, create dialog listing registered kinds)
- `src/routes/(app)/crm/doors/[id]/+page.server.ts`, `+page.svelte` (title, slug, description, active, public URL copy; renders the kind `Editor` and the matching panels from the registry; owns save and PATCH)
- `src/routes/d/[slug]/+page.server.ts`, `+page.svelte` (public shell: org name, title, kind `Public` from the registry; minimal public layout like `/book`)
- `scripts/qa/seed/doors.ts`, which seeds: active booking link `qa-door-book` (the QA seed has none active), form door `qa-intake` (active, 4 fields + consent), FAQ door `qa-faq` (2 approved + 1 draft), offer door `qa-offer` (2 seeded `fin_products`), door `qa-door-off` (inactive), one submission, 3 days of stats, one contact with `first_touch`.

Edits (sole owner of these shared files for the whole feature):
- `src/hooks.server.ts:196` add `'/d/'` to `UNPROTECTED_PREFIXES`. `:328-351` add `'/api/doors/public'` to `API_HANDLER_AUTH_PATHS` (covers S2's submit; the handler enforces its own authority).
- `src/routes/+layout.svelte:111` add `current.startsWith('/d/')`.
- `src/lib/routes/route-access-registry.ts` add `'/d/[slug]'` to `PUBLIC_ROUTE_PATTERNS` (:105) and `{ key: 'crm.doors', label: 'Doors', route: '/crm/doors' }` to `MODULE_SUBRESOURCES.crm` (:44-49).
- `src/lib/routes/route-design-manifest.ts` add `screen('/d/[slug]', …'public-auth'…)` near :655 and `screen('/crm/doors' …)` and `screen('/crm/doors/[id]' …)` in the CRM block (:476).
- Counts (+3 pages): `route-design-validation.ts:36,38`, `route-design-contracts.test.ts:85` (wave map) and `:104-144` (public list + capture states), `wave-e-public-auth-composition.test.ts:6-25` (9→10 + map entry; :60 layout assertion), `src/server/ui-audit/frontend-contract-scanner.test.ts:10`, `scripts/ui-audit-inventory.test.ts:12-13,133`, `capture-fixtures.ts:169` (`public-door` fixture). Set each number to what the 6 tests report and add a changelog comment line in `route-design-validation.ts:15-35`.
- `src/lib/nav/modules.ts:171-209` add the `doors` item (`/crm/doors`, `DoorOpen` icon, after `customers`). It is filtered by `canViewPath`.
- `scripts/qa/seed/index.ts` (+ import after `:36`, + domain entry after `:68`), `scripts/qa/seed/matrix.ts` (`'doors'` appended to the domain union after `:39`; entries in a new block at the **end** of `MATRIX`), `scripts/qa/seed/db.ts` `SEEDED_TABLES` (+4 tables), `scripts/qa/seed/seed.contract.test.ts` (if it needs per-id assertions).
- i18n: `doors_*` keys inserted after `"crm_nav_settings"` (en.json and es.json :1663).
Gates: `bunx vitest run src/lib/routes src/server/ui-audit/frontend-contract-scanner.test.ts scripts/ui-audit-inventory.test.ts src/server/services/doors.service.test.ts src/server/services/crm-contact-ensure.test.ts src/lib/doors scripts/qa/seed`; then the full `bun run test` with `SUPABASE_DB_URL` unset; `timeout 900 bun run check`; `bun run lint:design && bun run lint:tokens`; `bun run build`.
**Live acceptance (dev:local)**: (1) owner → `/es/crm/doors` lists `qa-door-book`, `qa-intake`, `qa-faq`, `qa-offer` and `qa-door-off` with numbers. (2) Toggle `qa-door-off` on: the switch flips immediately. Open `/es/d/qa-door-off` in a private window: it renders the shell (until S2, S5 and S6 land, kinds without a module 404). Toggle off again: 404. (3) Manager → `/es/crm/doors` shows no toggles or create button. Forcing `PATCH /api/crm/doors/<id>` returns 403. (4) Viewer → list visible, read-only. (5) `/es/d/does-not-exist` → 404.
Depends on: nothing. **Blocks**: S1, S2, S4, S5, S6 (schema + registries + ensure). S3 is independent.

### S1 — Booking-link attribution (`feat/doors-s1-booking-attribution`) · migration reserved `20261025100100` (expected unused)
Owns: `src/routes/book/[slug]/+page.server.ts` (capture `parseAttribution(url, request.headers.get('referer'), url.host, 'book:'+link.id)`, `bumpDoorStat(views)` unless `isLikelyBot`, return `attribution`), `src/routes/book/[slug]/+page.svelte` (send `attribution` in the book body, :160-170), `src/routes/api/scheduling/public/[slug]/book/+server.ts` (add `attribution: attributionSchema.optional()` to `publicBookSchema` :17-32), `src/server/services/scheduling-public.service.ts` (`PublicBookInput.attribution`; `publicBook` passes `metadata: { attribution }` and `firstTouch: attribution`; `bumpDoorStat(submissions)` after success), `src/server/services/scheduling-bookings.service.ts` (`CreateBookingInput.firstTouch?`, threaded to `ensureCrmContact(..., { source: 'booking', firstTouch })` at :532), tests next to each (`scheduling-public.service.test.ts` or a new one, `book/server.test.ts`).
Strings: none expected. If one is needed, insert it after `"crm_tab_hygiene"` (:1760).
Gates: targeted vitest (`src/server/services/scheduling-*`, `src/routes/api/scheduling/public`, `src/routes/book`), `bun run check`, design lint (one `.svelte` touched), full `bun run test`.
**Live acceptance**: in a private window open `/es/book/qa-door-book?utm_source=instagram&utm_medium=bio&utm_campaign=octubre`, book a slot as "Ana Prueba", phone `+51 900 000 041`. Owner → the CRM list has the new contact "Ana Prueba". In the QA DB (port 54422) `select first_touch from crm_contacts where display_name='Ana Prueba'` gives `door = book:<id>`, instagram, octubre. (This spec does not add an origin display on the contact page.) Booking `metadata.attribution.utm_source = 'instagram'`. `/es/crm/doors` row `qa-door-book`: views +1, bookings +1, contacts +1. Book again with the same phone and `utm_source=google`: same contact, `first_touch` still instagram.
Depends on: S0.

### S2 — Form door (`feat/doors-s2-form-door`) · **security/data** · migration reserved `20261025100200` (expected unused)
Owns (all new): `src/lib/doors/kinds/form.ts` (+ `.test.ts`: config schema, the `buildSubmissionSchema(config)` zod builder), `src/server/doors/kinds/form.server.ts` (`publicView`: fields + consent text only), `src/server/services/doors-form.service.ts` (+ `.test.ts`: `submitFormDoor(slug, input, ip)` → resolve, validate, consent, `ensureCrmContact({source:'door:'+slug, firstTouch})`, insert submission, `bumpDoorStat(submissions)`, all in one `withOrgCore`; `listSubmissions(ctx, doorId, {cursor, limit, mask})`), `src/routes/api/doors/public/[slug]/submit/+server.ts` (+ `server.test.ts`: rate limit 5/min, honeypot → 200 no-op, 400 field errors, 404 off/unknown), `src/routes/api/crm/doors/[id]/submissions/+server.ts` (`crm:view`, mask via `shouldMaskSensitive` + `maskPii`), `src/lib/components/doors/form/Public.svelte` (accessible labels, inline field errors, consent checkbox, hidden honeypot `website` with `tabindex=-1 autocomplete=off aria-hidden`, success message), `src/lib/components/doors/form/Editor.svelte` (field list: add, reorder up/down, type, required, select options; consent text), `src/lib/components/doors/panels/SubmissionsPanel.svelte` (`kinds = ['form']`, paginated table, contact link).
Strings: `doors_form_*`, inserted after `"crm_dni_apply"` (:1500).
Gates: targeted vitest (`src/lib/doors/kinds/form.test.ts`, `src/server/services/doors-form.service.test.ts`, `src/routes/api/doors`), `bun run check`, design lint, full test, build.
**Live acceptance**: (1) private window `/es/d/qa-intake`: the form renders. Submit empty → inline errors, no network write. Submit valid data without consent → consent error. Submit with consent → success message. (2) Owner → `/es/crm/doors/<qa-intake id>` → Submissions panel shows the row. The CRM list has the new contact with source `door:qa-intake`. (3) Submit again with the same phone → still one contact, two submissions. (4) In devtools, set the honeypot and submit → "success", but no new row. (5) Six quick submits → the sixth shows the 429 message. (6) Staff with crm field masking (custom role) → phone and email masked in the panel. (7) Manager → the editor is read-only; a forced PATCH gets 403 and the UI shows the permission message.
Depends on: S0. Unblocks S4.

### S3 — What to sell next (`feat/doors-s3-next-offers`) · migration reserved `20261025100300` (expected unused)
Owns (new): `src/server/services/crm-next-offers.service.ts` (+ `.test.ts` with `createMockDb`: co-purchase ranking, step-up order, void excluded, inactive excluded, top-sellers fallback), `src/routes/api/crm/contacts/[id]/next-offers/+server.ts` (`getCoreCtx`; `ownerFilter` + `getContact(ctx,id,ownerId)` → 404; `isModuleEnabled(ctx,'pos')` false → empty), `src/lib/components/crm/CrmNextOffers.svelte` (copies `CrmSimilarWins.svelte`: on-demand button, list, money via `formatMoney`, 403 → permission message).
Edits (sole owner): `src/routes/(app)/crm/[contactId]/+page.svelte` (`gridItems` :551-566 add `{id:'offers', …}`, label map :1128-1150, `leftCell` branch near :1038, mounted only when `!isPersonal`), `scripts/qa/seed/pos.ts` (fixture: contacts C1–C3 buy P1+P2, contact X buys P1 only, one void ticket with P3) + matrix entries under domain `'pos'`, inserted **after the `pos.emission.error` entry** in `matrix.ts`.
Strings: `crm_offers_*`, inserted after `"crm_similar_title"` (:1730).
Gates: `bunx vitest run src/server/services/crm-next-offers.service.test.ts src/server/services/pos-service-boundaries.test.ts "src/routes/(app)/crm" scripts/qa/seed`, check, design lint, full test.
**Live acceptance**: owner → open contact X (seeded name in the PR body) → "¿Qué ofrecer?" → bought: P1. Suggestion: P2 with "3 clientes". P3 (void only) is absent. Open a contact without purchases → "Más vendidos" list. Staff persona scoped to own contacts → the API on a non-owned contact returns 404.
Depends on: nothing (parallel from day 0).

### S4 — Automatic follow-up (`feat/doors-s4-follow-up`) · **security/data** · migration reserved `20261025100400` (expected unused)
Owns (new): `src/server/services/doors-followup.service.ts` (+ `.test.ts`: due selection, every skip reason, claim-conflict no-op, failed not retried, cap 25, template `{nombre}`), `src/routes/api/crm/doors/[id]/follow-up/+server.ts` (GET `crm:view`, PUT `crm:manage`; `accountId` validated against `getChannelCatalog`), `src/lib/components/doors/panels/FollowUpPanel.svelte` (`kinds = ['form']`: enable switch, delay, account select, template with a `{nombre}` hint, counts sent/failed/skipped, last 20 rows).
Edits (sole owner): `src/routes/api/jobs/tick/+server.ts` (after the inbox block :42-48, `let followUps; try { followUps = await runDoorFollowUps(new Date()) } catch …`, include in the JSON. It must **not** depend on `?jobs=1`), `src/server/services/crm-send.service.ts` (`sendContactMessage(…, opts?: { accountId?: string; idempotencyKey?: string })`; existing callers unchanged), `src/lib/automations/system-automations.ts` (comment on the jobs entry :70-77 adding "door follow-ups (spec 041 S4)"; no new entry).
`runDoorFollowUps(now)`: orgs = bypass-RLS `select distinct org_id from crm_doors where kind='form' and active and (follow_up->>'enabled')::boolean`. Per org, wrapped in `withOrgCore` and inside `try`: candidates = submissions from the last 7 days where `consent` is true, `contact_id` is set, `created_at + delay <= now`, and there is no followup row. Skip rules (FR-009) evaluated in SQL. Claim with `insert … on conflict do nothing returning id`; no row means another tick has it. Send. Finalize `sent` or `failed`, or `skipped` with a reason. Total budget 25 sends and 40 s per run.
Strings: `doors_followup_*`, inserted after `"crm_financials_recent"` (:1550).
Gates: targeted vitest (`doors-followup.service.test.ts`, `crm-send.service.test.ts`, the jobs tick test if one exists), check, design lint, full test.
**Live acceptance**: owner → `/es/crm/doors/<qa-intake>` → Follow-up panel: enable, delay 15, account (with `dev:local --gateway`, the gateway's account; without it the select lists none and saving is refused with a clear message). Submit `qa-intake` with consent as a new phone. Advance time with `update crm_door_submissions set created_at = now() - interval '20 minutes' where …` in the QA DB. Call `curl -s -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:5199/api/jobs/tick` (start `dev:local` with `CRON_SECRET` exported in the shell. If `scripts/qa/dev.ts` strips it, record that in the PR and rely on the service test, then add the variable to the QA env passthrough in this slice). Expect `followUps.sent = 1` with the gateway, or `failed = 1` with the error without it. The panel shows it. A second curl → 0 new rows. A contact with `custom_fields._reminders_opt_out = 'true'` → `skipped/opted_out`.
Depends on: S0, S2 (submissions exist only after S2. The service and tests can be written against the S0 schema in parallel with S2; the live check needs S2 merged or both branches combined).

### S5 — FAQ door (`feat/doors-s5-faq-door`) · migration reserved `20261025100500` (expected unused)
Owns (new): `src/lib/doors/kinds/faq.ts` (+ `.test.ts`), `src/server/doors/kinds/faq.server.ts` (`publicView` = approved entries only, + optional WhatsApp CTA), `src/server/services/doors-faq-draft.service.ts` (+ `.test.ts`: the sample SQL is inbound, `is_group = false`, `is_bot = false`, last 90 days, length 8–500, latest 400, with the next outbound reply in the same chat within 24 h through a lateral join, org-scoped through `withOrgCore`. `scrubPii()` removes phone and email patterns. One `generateObject` call with a zod schema `{drafts:[{q,a,count}] ≤10}`. The test mocks `ai` and asserts the prompt contains no digits run ≥ 7 and no `@`), `src/routes/api/crm/doors/[id]/faq-draft/+server.ts` (`crm:manage`, `checkRateLimit('faq-draft:'+org, 3, 600_000)`, 503 when no key), `src/lib/components/doors/faq/Public.svelte` (entries as `<details>`, JSON-LD in `<svelte:head>` with `JSON.stringify(...).replace(/</g,'\\u003c')`), `src/lib/components/doors/faq/Editor.svelte` (entries list, status toggle draft/approved, "Proponer desde conversaciones" appends drafts and marks the form dirty).
Strings: `doors_faq_*`, inserted after `"crm_insights_word_occurrences"` (:1600).
Gates: targeted vitest, check, design lint, full test.
**Live acceptance**: (1) private window `/es/d/qa-faq` → 2 approved entries, the draft is absent. View source: one `application/ld+json` block whose `mainEntity` has 2 questions (paste it into a JSON parser). (2) Owner → editor → approve the draft, save, reload the public page → 3 entries. (3) "Proponer desde conversaciones" on `dev:local` (the QA env blanks `OPENROUTER_API_KEY`, `scripts/qa/backend.ts:83`) → the UI says AI is not configured (503). The happy path is proven by the service test and, after merge, by the owner on a preview with a key.
Depends on: S0.

### S6 — Offer door (`feat/doors-s6-offer-door`) · migration reserved `20261025100600` (expected unused)
Owns (new): `src/lib/doors/kinds/offer.ts` (+ `.test.ts`), `src/server/doors/kinds/offer.server.ts` (`publicView`: active products from `fin_products` by id with live `unit_price`, currency from `fin_settings`, booking link slug if the chosen link is active in the same org; wa.me URL built server-side from digits only) (+ `.test.ts`), `src/lib/components/doors/offer/Public.svelte` (cards: name, category, price, "Consultar por WhatsApp" + "Reservar" CTAs; `TODO(handoff): payment link (Culqi/Mercado Pago) — no credentials; proposal 2026-10-24-hub-collection-points-followups`), `src/lib/components/doors/offer/Editor.svelte` (product multi-select from `GET /api/pos/sellables` (`pos.service.ts:2528` via `src/routes/api/pos/sellables/+server.ts:31`) using the house Picker; WhatsApp number; booking link select from `GET /api/scheduling/links`).
Strings: `doors_offer_*`, inserted after `"crm_reserved_only"` (:1700).
Gates: targeted vitest, check, design lint, full test.
**Live acceptance**: (1) private window `/es/d/qa-offer` → 2 products with prices. "Consultar por WhatsApp" opens `https://wa.me/<digits>?text=Hola%2C%20me%20interesa…`. "Reservar" → `/es/book/qa-door-book`. (2) Owner → change P1's price in `/es/pos/catalog` → reload the offer → new price. Deactivate P2 → it disappears.
Depends on: S0.

## Parallel tracks

```
day 0 ──► S0 (foundation, serial gate) ──► merge ──► S1 ─┐
   │                       │ (branch from feat/collection-points while S0 is in review)
   │                       ├──► S2 ──► S4 (live check needs S2)
   │                       ├──► S5
   │                       └──► S6
   └──► S3 (independent, from origin/master)
```

### File-conflict matrix (✔ = touches; only S0 shares a file with any other slice, and only where noted)

| Shared file | S0 | S1 | S2 | S3 | S4 | S5 | S6 | Rule |
|---|---|---|---|---|---|---|---|---|
| `supabase/migrations/*` | ✔ `20261025100000` | – | – | – | – | – | – | One migration, S0. Reserved timestamps in contracts/data-model.md |
| `scripts/qa/seed/{index,db}.ts` | ✔ | – | – | – | – | – | – | S0 only |
| `scripts/qa/seed/matrix.ts` | ✔ union end + block at `MATRIX` end | – | – | ✔ after `pos.emission.error` | – | – | – | Different anchors, so hunks never overlap |
| `scripts/qa/seed/pos.ts` | – | – | – | ✔ | – | – | – | S3 only |
| route manifest + 6 count files + `capture-fixtures.ts` | ✔ | – | – | – | – | – | – | S0 only. S2–S5 add API routes, which are not count-pinned |
| `route-access-registry.ts` | ✔ | – | – | – | – | – | – | S0 only |
| `src/hooks.server.ts` | ✔ | – | – | – | – | – | – | S0 adds `/d/` and `/api/doors/public` up front |
| `src/routes/+layout.svelte` | ✔ | – | – | – | – | – | – | S0 only |
| `src/lib/nav/modules.ts` | ✔ | – | – | – | – | – | – | S0 only |
| `scheduling-bookings.service.ts` | ✔ (extract) | ✔ (firstTouch) | – | – | – | – | – | Serialized: S1 starts from S0's branch |
| `messages/{en,es}.json` | ✔ after `crm_nav_settings` | (after `crm_tab_hygiene`) | ✔ after `crm_dni_apply` | ✔ after `crm_similar_title` | ✔ after `crm_financials_recent` | ✔ after `crm_insights_word_occurrences` | ✔ after `crm_reserved_only` | **Anchored insertion**, the same position in both files, never at EOF. Anchors are ≥ 30 lines apart, so git merges cleanly |
| `crm/[contactId]/+page.svelte` | – | – | – | ✔ | – | – | – | S3 only |
| `api/jobs/tick/+server.ts`, `crm-send.service.ts`, `system-automations.ts` | – | – | – | – | ✔ | – | – | S4 only |
| registries (`kinds.ts` ×2, `components/doors/registry.ts`), `/crm/doors/[id]` editor page, `/d/[slug]` page | ✔ | – | – | – | – | – | – | Kind slices add files only (D4) |
| `src/lib/paraglide/**` | generated | | | | | | | Never committed by hand. Run `bun run i18n:compile` after each rebase |

### Merge order
`S0 → S3 (any time) → S1 → S2 → S6 → S5 → S4`. Each later PR rebases onto `master` before merge and re-runs `bun run i18n:compile && bun run check && bun run test`. On conflict, the anchored i18n blocks are resolved by keeping both. Only S0 touches count files, so no recount is needed after S0.

## Risks
- **Glob registries in SSR and vitest**: `import.meta.glob` is Vite. If a test imports a registry, vitest resolves it too. S0 adds one registry test that globs a fixture kind. Fallback if it misbehaves: an explicit three-line import map owned by S0 with lazy `import()`, in which case kind slices add one line each at distinct anchors.
- **First touch for existing harvested contacts** stays null. The funnel counts only door-created contacts. This is honest, but early numbers look small; the Doors view says "nuevos contactos".
- **Clinical data in `payload`**: masking only applies to `phone`, `email` and `text` field types when `shouldMaskSensitive`. Free-text clinical answers are visible to any `crm:view` holder. Owner decision recorded in the proposal: restrict submissions to `crm:manage` if needed (a one-line gate change).
- **Rate limiter is per lambda** (existing shortcut, `rate-limit.ts:1-4`).
- **`ensureCrmContact` swallow-inside-transaction** (AS-IS A). The move keeps behaviour. A `TODO(handoff)` at the moved catch, plus a proposal entry.
- **Locale prefix**: public links should be shared as `/es/d/<slug>`. The Doors view's copy button uses the current UI locale.

## Verification after merge (owner + orchestrator)
1. Prod SQL one week after S1 and S2: `select count(*) filter (where first_touch is null) from crm_contacts where (source = 'booking' or source like 'door:%') and created_at > '<deploy>'` (booking contacts created through internal, non-link bookings carry no first touch, so restrict to bookings with `source='public_link'` via a join if the number is not 0) → 0 (SC-002).
2. FACES: create the real "Ficha de ingreso" door (owner), test-submit once, then point facesculptors.net `/intake` at `https://hub.minion-ai.org/es/d/<slug>` (owner action in `faces-landing`, separate repo; SC-006).
3. `/api/jobs/tick` JSON on netcup shows `followUps` with no `error` for 24 h after S4.

## Bypassed
No Spec Kit `before_specify` hook ran (none registered). No branch hook ran (branch pre-created). Two-pass review = owner review of this PR + independent review on each hub PR.
