---
id: 041-hub-collection-points
title: Hub collection points — doors, attribution, follow-up, FAQ, offers
status: draft
created: 2026-10-24
updated: 2026-10-24
repos: [minion_hub, minion-meta]
tags: [security, data, crm, ui]
---

# Feature Specification: Collection points ("doors") that feed the business's own CRM

**Feature Branch**: `spec/041-hub-collection-points` (meta) · hub slices `feat/doors-s0-foundation` … `feat/doors-s6-offer-door` → `master` (see plan.md §Parallel tracks)
**Created**: 2026-10-24
**Status**: Draft. **Security + data tag**: S0, S2 and S4 store personal data (some of it clinical) and S4 sends outbound WhatsApp messages, so the owner approves this spec before any hub commit and merges every slice.
**Input**: The owner said "begin with the full implementation" of a video framework ("digital home + collection points"). Customers reach a business through many single-purpose public *doors*. Every door writes into the business's **own** CRM with attribution. People who did not buy get an automatic follow-up. The business can see which doors convert and can switch any door off.

## Product framing (why this fits the method)

The hub's order is ERP → CRM → RPA, and DATA is the foundation (memory `minion-mission-method-erp-crm-rpa`). Doors are **connectors that remove manual data entry**: a lead who fills a form, books, or reads an offer arrives in the CRM already tagged with where they came from. The CRM step can only be trusted if every contact has an origin. This feature adds no new "marketing suite"; it adds the missing *input side* of the CRM that already exists. Copy must stay plain (Spanish first for FACES), with no growth jargon.

## AS-IS (evidence)

All anchors are `minion_hub` `origin/master @ 92a0aa70`, read in the worktree `~/.cache/claude-tmp/hub-cp`.

### A. There is exactly one public door today: the booking link, and it records no origin
- Slug model: `sched_links` (`src/server/db/pg-scheduling-schema.ts:347-367`). Slugs are unique **per org**, not globally (`sched_links_org_slug_uniq(org_id, slug)` :364). `resolvePublicLink` (`src/server/services/scheduling-public.service.ts:34-81`) reads the slug through the bypass-RLS `getCoreDb()`. When orgs share a slug it picks the oldest id (:51-54). It then builds `ctx = { db, tenantId }` (:57), checks `isModuleEnabled(ctx,'scheduling')` (:58), and does every later read through `withOrgCore`. The comment at :22-24 names multi-org slug ambiguity as roadmap R11.
- Page: `src/routes/book/[slug]/+page.server.ts:6-20` only loads data. The page POSTs with `fetch` (`+page.svelte:160-163`) to `src/routes/api/scheduling/public/[slug]/book/+server.ts`. That handler has a zod `publicBookSchema` (:17-32) and an in-memory rate limit `checkRateLimit('public-book:${ip}:${slug}', 10)` (:13,43; limiter `src/server/auth/rate-limit.ts:12`, per-lambda Map). It calls `publicBook` (`scheduling-public.service.ts:107-121`), which passes `source: 'public_link'` (:118) and **no metadata** into `createBooking`.
- `CreateBookingInput` (`scheduling-bookings.service.ts:207`) already carries `metadata`, which is written at the insert (:569). `sched_bookings.metadata jsonb` exists (`pg-scheduling-schema.ts:256`).
- Contact creation: the private `resolveCrmContact` (`scheduling-bookings.service.ts:264`) matches on last-9 phone or on email through `crm_contact_identities`. The private `ensureCrmContact` (:302-351) inserts `crm_contacts { source: 'booking' }` (:317) plus E.164 identities. It is called at :532. A try/catch inside the transaction swallows insert errors (:347-350). In Postgres a failed statement aborts the transaction, so the booking insert fails anyway (recon finding, not reproduced).
- **There is no attribution anywhere.** `grep -ri 'utm\|referrer\|first_touch'` over `src/` and `supabase/migrations/` returns nothing. The only attribution table is `meta_lead_attribution` (IG ad referrals, `supabase/migrations/20260717170000_meta_lead_attribution.sql`), keyed by channel sender. It does not apply to web doors.
- There are no page-view counters. The QA seed has **no active booking link**: its only `sched_links` row, `qa-expired-link`, is expired (`scripts/qa/seed/scheduling.ts:362-368`).

### B. No public form exists, and the clinic's real intake form loses patient data
- `ls src/routes` gives `(app) api artifacts auth book invite join link login onboarding`. The public pages are those in `PUBLIC_ROUTE_PATTERNS` (`src/lib/routes/route-access-registry.ts:105-111`): `/auth/reset`, `/book/[slug]`, `/invite/accept`, `/login`, `/login/forgot`. There is no form builder, no honeypot and no captcha in `src/`.
- The FACES intake form at facesculptors.net (repo `NikolasP98/faces-landing`, route `src/routes/intake/+page.server.ts`) writes submissions with `fs.writeFile` to a read-only Vercel filesystem and still returns `success: true` (memory `faces-landing-intake-data-loss`, found 2026-08-10). It has not been verified end to end, but the loss is almost certain. **This is the first real door.**
- `crm_contacts` (`src/server/db/pg-crm-schema.ts:40-77`) has `source text default 'harvested'` (values seen: `harvested`, `manual`, `booking`), `custom_fields jsonb`, and `deleted_at`. It has **no consent or origin column**.

### C. Nothing suggests what to sell next
- `pos_tickets` (`src/server/db/pg-pos-schema.ts:86-121`: `crm_contact_id`, `party_id`, `status submitted|void`) and `pos_ticket_lines` (:123-166: `fin_product_id`, `qty`, `unit_price`, index `(org_id, fin_product_id)`) hold purchase history. **No per-contact purchase query exists.** `getClientAccountDetail` (`src/server/services/pos/accounts/detail.ts:25`) returns ledger, plans and grants, not lines. `contactFinanceSummary` (`crm-finance.service.ts:190`) reads SUSII invoices.
- Catalog: `fin_products` (`src/server/db/pg-finance-schema.ts:134-163`: `name`, `category`, `unit_price`, `kind`, `active`; no image column). `listSellables` is at `pos.service.ts:2528`.
- `pos-service-boundaries.test.ts` freezes the runtime and type exports of `pos.service.ts` (memory `faces-nikolas-transactions-sweep-2026-10-13`). Any new export there turns CI red.
- Precedent for an on-demand contact panel: `CrmSimilarWins.svelte` fetches `GET /api/crm/contacts/[id]/similar-wins` (`src/routes/api/crm/contacts/[id]/similar-wins/+server.ts`), mounted at `src/routes/(app)/crm/[contactId]/+page.svelte:1038`. Note that this endpoint applies no `ownerFilter`.

### D. Outbound WhatsApp and scheduled sends exist, but no follow-up exists
- `sendContactMessage(ctx, contactId, channel, text, clientId?)` (`src/server/services/crm-send.service.ts:49`) resolves the recipient from `crm_contact_identities`. It takes the account from the **latest `messages` row for that chat** (:60-74), so a brand-new lead with no messages gets no account pin. It then calls `gatewayCall('channels.send', …)` and mirrors the send into `messages`.
- The reminders pattern `processOrgReminders` (`reminders.service.ts:59`) computes due items each tick and claims each one by inserting into `sched_reminders` (unique key) **before** sending, with a gateway `idempotencyKey`. The only opt-out signal in the hub is `crm_contacts.custom_fields->>'_reminders_opt_out'` (:77). Nothing writes it.
- Ticks: a tick needs a route, a `CRON_AUTH_PATHS` entry (`src/lib/server/cron-auth-path.ts:1-24`) and a crontab line (`src/lib/automations/system-automations.ts:1-22`). The reminders tick is **`wiring: 'unscheduled'`** (system-automations :127-131). `/api/jobs/tick` is **live on netcup every ten minutes** (:77). Since 2026-10-11 it also runs the per-org inbox evaluator outside `bg_jobs` (`src/routes/api/jobs/tick/+server.ts:42-48`).
- Flow editor: there is no hub executor. Flows are registered with the gateway's LangGraph runner (`src/lib/flows/flow-activation.ts`). A "door created a contact" trigger would need a gateway change.

### E. Inbound questions are harvested but never grouped
- `messages` (`@minion-stack/db` `src/pg/schema/messages.ts:12`): `direction`, `channel`, `chat_id`, `content`, `is_group`, `is_bot`, `occurred_at`. It links to contacts through `crm_contact_identities(channel, external_id = chat_id)`. `crm_conversation_analysis.asked_for` exists (`pg-crm-schema.ts:360`), but its tick is unscheduled, so it is likely stale.
- LLM path: OpenRouter only, `getOpenRouterModel(modelId)` (`src/server/llm.ts:122`) behind `OPENROUTER_API_KEY`. The on-demand precedent is `src/routes/api/crm/tags/[id]/evaluate/+server.ts:12,36,68` (`generateObject`, default `google/gemini-2.5-flash`).

### F. No public catalog or price page, and no stored business WhatsApp number
- No `wa.me` helper exists. `organizations` has no phone or logo (`src/server/services/tenant.service.ts:5-17`).

### G. Build steps a new surface must satisfy (verified at HEAD)
- Route contract. Counts in 6 places: `route-design-validation.ts:36,38` (`endpoints: 160`, `screens: 149`); the `route-design-contracts.test.ts:85` wave map `{A:36,B:75,C:17,D:23,E:9}`; `wave-e-public-auth-composition.test.ts:25` (`toHaveLength(9)`); `src/server/ui-audit/frontend-contract-scanner.test.ts:10` (`pages 160`); and `scripts/ui-audit-inventory.test.ts:12-13,133`. A public page also needs `PUBLIC_ROUTE_PATTERNS`, the verbatim list at `route-design-contracts.test.ts:137-144`, capture states (:104-131), a fixture id (`capture-fixtures.ts:169`), the manifest entry (`route-design-manifest.ts:655` for `/book`), the client auth-redirect exemption (`src/routes/+layout.svelte:111`), `UNPROTECTED_PREFIXES` (`src/hooks.server.ts:196`) and the tenant-less API allowlist `API_HANDLER_AUTH_PATHS` (`hooks.server.ts:328-351`). API routes are **not** count-pinned; the scanner only asserts a lower bound (`frontend-contract-scanner.test.ts:11`).
- RBAC: `MODULE_SUBRESOURCES` (`route-access-registry.ts:43`, CRM :44-49), `API_WRITE_PREFIXES` (`rbac.service.ts:1112`, `/api/crm` → `crm`), `apiWriteCapability` (:1209), `requireOrgCapability` (:1275), `ownerFilter` (:474), `shouldMaskSensitive` (:436). Owner and admin hold every capability. Managers lack `manage` (`defaultCaps` :165).
- Nav: `src/lib/nav/modules.ts:171` (`case 'crm'`), rendered by `CrmNav.svelte` and filtered by `canViewPath`.
- i18n: `messages/en.json` and `messages/es.json`, 7056 keys each, in identical, unsorted order. New keys go at the same position in both files. Compile with `bun run i18n:compile`.
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, applied by `scripts/db-migrate.ts` into `hub_migrations`. The latest is `20261023020000_pulse_digest.sql`. The RLS convention (`20260717170000_meta_lead_attribution.sql:43-52`) is `org_id text`, `enable` + `force` RLS, an `<table>_org_guc` policy on `current_setting('app.current_org_id', true)`, and a grant to `app_ledger`. **A migration PR must also touch `scripts/qa/seed/**`** (CI `migration-seed-pairing`, hub `AGENTS.md:77-85`).

## User Scenarios & Testing *(mandatory)*

### User Story 1: Booking link records where the booker came from (Priority: P1)
An owner shares `…/book/consulta?utm_source=instagram&utm_campaign=octubre`. A new person books. The booking and the newly created contact both show "instagram / octubre". In the Doors view, that link's row counts views, bookings, new contacts and customers.

**Why this priority**: It is the only door that exists, and every other metric reuses its plumbing.
**Independent Test**: Open the link with UTM parameters, book, then check the booking metadata, the contact's origin and the Doors row.

**Acceptance Scenarios**:
1. **Given** a new phone number, **When** someone books via a link with `utm_source=instagram`, **Then** the booking `metadata.attribution.utm_source = 'instagram'` and the created contact's `first_touch.door = 'book:<link id>'`.
2. **Given** a contact that already exists with a `first_touch`, **When** they book again through a different link or UTM, **Then** `first_touch` is unchanged and only the new booking carries the new attribution.
3. **Given** 3 page loads and 1 booking, **When** the owner opens Doors, **Then** the link row shows views ≥ 3 and bookings 1. No IP address, user agent or phone number is stored with the counters.

### User Story 2: A business publishes a form door that lands leads in its CRM (Priority: P1, security/data)
The FACES owner creates a "Ficha de ingreso" form with name, phone, email, a few clinical questions and a consent checkbox, and switches it on. A patient fills it at `/es/d/ficha-faces`. The patient becomes (or is matched to) a CRM contact whose origin is that door, and the full submission is stored and visible to staff with CRM access. Switching the door off makes the URL return 404.

**Why this priority**: It closes a live data-loss path for patient data (AS-IS B) and is the template for every lead door.
**Independent Test**: Create the door, submit it as an anonymous visitor, then find the contact and the submission in the hub.

**Acceptance Scenarios**:
1. **Given** an active form door, **When** a visitor submits valid values with consent ticked, **Then** one `crm_door_submissions` row exists, and the contact is created with `source = 'door:<slug>'` and a `first_touch`, or matched by phone or email without overwriting an existing `first_touch`.
2. **Given** consent is required and not ticked, **When** the visitor submits, **Then** the server answers 400 with a field error and stores nothing.
3. **Given** the honeypot field is filled, **When** the form is posted, **Then** the response is `200 {ok:true}` and nothing is stored.
4. **Given** more than 5 posts in a minute from one IP to one slug, **Then** the sixth gets 429.
5. **Given** the door is switched off, **When** `/d/<slug>` is opened or posted, **Then** both return 404, the same response as an unknown slug.
6. **Given** a manager (no `crm:manage`), **When** they try to create or edit a door, **Then** the UI hides the controls, the API answers 403, and the UI shows the permission message, never a generic failure (memory `forbidden-must-say-permission-not-generic-failure`).

### User Story 3: Staff see what this customer bought and what to offer next (Priority: P2)
On a contact page, staff click "¿Qué ofrecer?". They see the products this contact bought and up to 5 suggestions: items that other buyers of the same products also bought, the smallest step up in price first.

**Independent Test**: Seed tickets where A and B buyers also bought C. On a contact who bought A, C is suggested and A is not.

**Acceptance Scenarios**:
1. **Given** contact X bought A, and 3 other contacts bought A and C, **When** staff ask for offers on X, **Then** C is listed with "3 clientes" and A is not suggested.
2. **Given** a contact with no purchases, **Then** the panel shows the org's top sellers of the last 90 days, labelled as such.
3. **Given** a staff member scoped to their own contacts (`ownerFilter`), **When** they request a contact they do not own, **Then** the API answers 404.
4. Void tickets and inactive products never appear.

### User Story 4: A lead who did not buy gets one automatic WhatsApp follow-up (Priority: P2, security/data)
On a form door, the owner turns on "Seguimiento automático": a message template, a delay (minimum 15 minutes) and the WhatsApp account to send from. A lead who consented and has neither bought, booked nor written back within the delay receives exactly one message.

**Independent Test**: Use a door with a 15-minute delay, submit, then run the jobs tick after the delay. Exactly one follow-up row and one outbound `messages` row exist. A second tick sends nothing.

**Acceptance Scenarios**:
1. **Given** consent was ticked, the delay has elapsed, and the contact has no ticket, booking or inbound message since submitting, **When** the tick runs, **Then** one message is sent and recorded as `sent`.
2. **Given** a second tick or a second submission by the same contact on the same door, **Then** nothing more is sent (unique on org + door + contact).
3. **Given** the contact has `_reminders_opt_out` set, or did not consent, or the door is off, **Then** no message is sent. The row is recorded as `skipped` with a reason when a claim was made.
4. **Given** the gateway is unreachable, **Then** the row is `failed` with the error and is never retried automatically. The panel shows it.

### User Story 5: A public FAQ drafted from real customer questions (Priority: P3)
The owner opens an FAQ door and clicks "Proponer desde conversaciones". The hub groups the most frequent inbound questions of the last 90 days into up to 10 draft entries, with suggested answers drawn from the business's own replies. The owner edits them, approves some and switches the door on. `/d/<slug>` shows only approved entries and carries FAQPage JSON-LD.

**Acceptance Scenarios**:
1. **Given** no `OPENROUTER_API_KEY`, **When** the owner clicks the draft action, **Then** the API answers 503 and the UI says AI is not configured. Nothing else breaks.
2. **Given** drafts are returned, **Then** they are added as `draft` entries and nothing is published until approved and saved.
3. **Given** approved and draft entries, **Then** the public page renders only the approved ones, and its JSON-LD parses as `FAQPage` with exactly those questions.
4. Phone numbers and emails are removed from message text before it is sent to the model.

### User Story 6: A public offer page with "book" and "ask on WhatsApp" (Priority: P3)
The owner picks 1–30 catalog items, a WhatsApp number and optionally a booking link. `/d/<slug>` lists the items with **live** prices. Each item has a button that opens WhatsApp with a prefilled "Hola, me interesa: <item>", and the page has a "Reservar" button.

**Acceptance Scenarios**:
1. **Given** a product's price is changed in the catalog, **When** the offer page is reloaded, **Then** it shows the new price (no copy is stored).
2. **Given** a selected product is deactivated, **Then** it disappears from the public page.
3. No payment button exists (out of scope, see Assumptions).

### User Story 7: One Doors view to compare and switch off (Priority: P1, owned by S0)
`/crm/doors` lists every booking link and every door with its kind, public URL (copy), on/off toggle, and for the selected range (default 30 days) views → submissions/bookings → new contacts → customers.

**Acceptance Scenarios**:
1. **Given** an owner, **When** they toggle a door off, **Then** the switch flips at once (optimistic, pending state), the public URL starts returning 404, and on failure the switch reverts and a toast shows (memory `hub-visual-feedback-optimistic-ui`).
2. Booking-link rows toggle through the existing `PATCH /api/scheduling/links/[id]` (`scheduling:manage`). Door rows toggle through `PATCH /api/crm/doors/[id]` (`crm:manage`). A viewer sees the list with no toggles.
3. "Customers" counts contacts whose `first_touch.door` is the door and who have at least one `submitted` POS ticket or `completed` booking.

### Edge Cases
- Two orgs want the same slug for a door. Door slugs are **globally unique**, so the second gets 409 `slug_taken`. This avoids the R11 ambiguity `/book` has. `/book` slugs are untouched.
- Slug changes after links were shared: the old URL 404s. This is documented in the editor helper text; there are no redirects (YAGNI).
- A form door is deleted while it has submissions. There is **no delete**, only off. Submissions are kept, and their FK is `on delete restrict`.
- CRM module disabled for the org: public door 404, `/crm/doors` is hidden by the existing module gate.
- Bot or link-preview traffic inflates views. A user-agent filter skips obvious bots; the counts are approximate and labelled "visitas".
- Referer is our own host (internal navigation) → `referrer_host` is null.
- UTM values are trimmed, truncated to 100 characters, and only `utm_source`, `utm_medium` and `utm_campaign` are kept.
- A person submits a form whose phone matches an existing contact with a different name. They are matched, the name is not overwritten, and the submission keeps what they typed.
- A follow-up template contains `{nombre}`. It is replaced with the contact's display name, or with nothing.
- The rate limiter is per lambda, so a determined flooder across instances is not stopped. Shortcut documented, same as `/book` today.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001** Door registry: a door has `kind ∈ {form, faq, offer}`, a globally unique slug (`^[a-z0-9][a-z0-9-]{2,62}$`), a title, an optional description, `active` (default **off**) and kind-specific `config`. Booking links (`sched_links`) are listed as doors of kind `book` but stay in their own table.
- **FR-002** One public route `/d/[slug]` renders any active door of a kind whose module is installed, and returns 404 otherwise. Resolution: bypass-RLS slug → org, then everything through `withOrgCore` (the `/book` pattern). It also requires the `crm` module to be enabled.
- **FR-003** Attribution: `{door, utm_source, utm_medium, utm_campaign, referrer_host, at}` is captured server-side on public page load, carried in the submit or book body, re-validated by zod at the endpoint, written to `sched_bookings.metadata.attribution` or `crm_door_submissions.attribution`, and written to `crm_contacts.first_touch` **only when the door creates the contact**.
- **FR-004** Counters: `crm_door_stats_daily(org_id, door_key, day, views, submissions)`. They are incremented by upsert and contain no IP, user agent or PII.
- **FR-005** Form door: up to 20 fields of type `text | textarea | phone | email | select | date | checkbox`, plus required consent text. The server validates against a zod schema built from the stored config (unknown keys dropped, strings ≤ 2000). Honeypot field `website`. Rate limit 5/min per IP+slug. Response bodies never echo PII.
- **FR-006** A submission finds or creates the contact through the shared `ensureCrmContact` (phone last-9 or email), stores the submission (values, consent flag, consent-text snapshot, attribution) and bumps `submissions`, all in one org-scoped transaction.
- **FR-007** Door CRUD and the on/off toggle need `crm:manage` (owner, admin). Reading doors and stats needs `crm:view`. Reading submissions needs `crm:view`, and values are masked when `shouldMaskSensitive(locals,'crm')`. Every 403 surfaces as a permission message.
- **FR-008** Next offers: a read-only query over non-void POS tickets of the contact (by `crm_contact_id` or `party_id`). It returns bought products, and up to 5 suggestions ranked by co-buyer count, then non-negative price step-up ascending, then the rest. If the contact has no history, it returns the top sellers of the last 90 days. Only active products. It is not exported from `pos.service.ts`.
- **FR-009** Follow-up: an optional per-form-door setting `{enabled, delayMinutes ≥ 15, accountId, template ≤ 1000}`. It is processed in the existing `/api/jobs/tick`, isolated in its own try/catch and capped at 25 sends per run. Claim-before-send uses a unique `(org_id, door_id, contact_id)`, plus gateway `idempotencyKey = door-fu-<door>-<contact>`. Skip if: no consent, opted out (`_reminders_opt_out`), a submitted ticket or a booking was created after the submission, an inbound message after the submission, door off, or follow-up off. Only submissions from the last 7 days are considered. Failed sends are never retried automatically.
- **FR-010** FAQ door: config `{entries: [{id, q, a, status: draft|approved}] ≤ 50, whatsappNumber?}`. The on-demand draft action (`crm:manage`) samples at most 400 recent inbound 1:1 messages (90 days) with the business's next reply. It scrubs phone numbers and emails, makes **one** `generateObject` call via `getOpenRouterModel(env.CRM_FAQ_MODEL || 'google/gemini-2.5-flash')`, returns at most 10 drafts and **saves nothing**. Rate limit 3 per 10 min per org. 503 when no key.
- **FR-011** The FAQ public page renders approved entries only, plus `<script type="application/ld+json">` FAQPage, serialized with `<` escaped as `<`.
- **FR-012** Offer door: config `{productIds ≤ 30, whatsappNumber? (E.164), bookingLinkId?, note?}`. The public page reads name, category and **live** `unit_price` of active products and the currency from `fin_settings`. CTA: `https://wa.me/<digits>?text=<encoded>` and `/book/<slug>` of the chosen same-org active link.
- **FR-013** The Doors view lists booking links and doors with the 30-day funnel (views → submissions/bookings → new contacts → customers) and an optimistic toggle.
- **FR-014** Every new string goes through Paraglide, in both locales. Every new page is in the route contract. Every new surface is wired to RBAC. UI follows design governance (`lint:design && lint:tokens`, debt never increases).
- **FR-015** Payment links (Culqi or Mercado Pago) are **not** built. S6 leaves a `TODO(handoff)` at the CTA and the proposal `2026-10-24-hub-collection-points-followups` records it.

### Key Entities
- **Door** (`crm_doors`): one public entry point of the org: kind, slug, title, active, config, follow_up.
- **Door submission** (`crm_door_submissions`): what a visitor sent through a form door, with consent and attribution. It is personal and possibly clinical data.
- **Door follow-up** (`crm_door_followups`): one claimed automatic message per (door, contact), with status and outcome.
- **Door daily stats** (`crm_door_stats_daily`): anonymous counters per door key and day.
- **First touch** (`crm_contacts.first_touch`): the door and UTM that created the contact. It is set once and never overwritten.

## Success Criteria *(mandatory)*
- **SC-001** On `dev:local`, a submission of the seeded form door creates exactly one contact and one submission row. Re-submitting with the same phone creates no second contact (0 duplicates in 3 tries).
- **SC-002** 100% of contacts created through a door or booking link after release have a non-null `first_touch` (prod SQL check one week after deploy).
- **SC-003** Switching a door off makes its URL 404 on the next request (no cache).
- **SC-004** Follow-up sends at most 1 message per (door, contact), even after 10 consecutive ticks (QA proof).
- **SC-005** The Doors view loads in under 1 s for an org with 20 doors and 10k contacts (QA timing with the seeded volume, or an `explain analyze` of the funnel query showing index use on `first_touch->>'door'`).
- **SC-006** FACES intake moves from facesculptors.net to a hub form door, and the first real submission is visible in the hub (owner action after S2 ships, tracked in the proposal).

## Assumptions
- Door slugs live in one global namespace under `/d/`. `/book` keeps its per-org slugs.
- A door starts **off**, so nothing is published by accident.
- "Customer" means at least one `submitted` POS ticket or `completed` booking. SUSII invoices are ignored (SUSII is being decommissioned).
- Opt-out reuses the existing `_reminders_opt_out` flag, and consent is required for any follow-up. No UI writes opt-out today; that is an open item (proposal), not part of this spec.
- The follow-up account is chosen explicitly per door from the existing channel catalog (`crm-channels.service.ts:49` `getChannelCatalog`), never inferred, because cross-org WhatsApp links have happened (memory `netcup-exposure-and-keys-2026-10-22`).
- The flow editor is not used for follow-ups. It would need a new gateway-side trigger type and a hub→gateway event path, and the requirement is one delayed message.
- Pointing facesculptors.net `/intake` at the hub door is a change in another repo, done by the owner after S2 (DNS hazard documented in memory `faces-landing-intake-data-loss`).
- A submissions retention period is not decided. Submissions are kept until the contact is erased (existing right-to-erasure path). Recorded as an open item.
- Staff are not notified when a submission arrives (inbox rule). Open item in the proposal; submissions are visible in the door's Submissions panel, and the contact appears in the CRM list with its door origin.
