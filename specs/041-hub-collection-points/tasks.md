# Tasks: Collection points ("doors")

Hub anchors are at `origin/master 92a0aa70`. Each slice gets one worktree (`~/.cache/claude-tmp/hub-doors-sN`; S0 uses the existing `~/.cache/claude-tmp/hub-cp`), a real `bun install --frozen-lockfile`, and one draft PR to `master`. Gates run in the foreground with `timeout`, with the exit code captured (`cmd; echo "x=$?"`), never piped into `tail`. Never run the full `bun run test` with a prod `.env` present: `unset SUPABASE_DB_URL` first. **The owner merges every PR. S0, S2 and S4 carry the security and data tags.** Read plan.md §Parallel tracks before touching a shared file.

## Phase 1: Setup
- [ ] T001 The owner approves `specs/041-hub-collection-points/spec.md` (security + data). No hub commit happens before this.
- [ ] T002 Each implementer: `git -C minion_hub fetch origin && git worktree add ~/.cache/claude-tmp/hub-doors-sN -b <branch> <base>` (base per plan §Slices), `bun install --frozen-lockfile`, read `AGENTS.md` and `.claude/skills/ui-design-governance/SKILL.md`.

## Phase 2: S0 Foundation (`feat/collection-points`), blocks S1/S2/S4/S5/S6
- [ ] T010 [US7] Migration `supabase/migrations/20261025100000_crm_doors.sql` exactly per `contracts/data-model.md` (4 tables, `first_touch` column + partial index, RLS enable/force/policy/grant with `pg_policies` guards). Drizzle mirror `src/server/db/pg-doors-schema.ts`; `firstTouch: jsonb('first_touch')` on `crmContacts` (`pg-crm-schema.ts:40-77`).
- [ ] T011 [US1][US2] Move `resolveCrmContact`/`ensureCrmContact` (`scheduling-bookings.service.ts:264-351`) into `src/server/services/crm-contact-ensure.ts` with the signature from `contracts/kinds-and-api.md`. The call site at :532 passes `{ name, phone, email, source: 'booking' }`. Behaviour is unchanged. Put `TODO(handoff): catch inside tx aborts the tx; see proposal 2026-10-24-hub-collection-points-followups` at the moved catch. Test `crm-contact-ensure.test.ts`: match by last-9, match by email, create with identities, `firstTouch` written on create only, `created` flag.
- [ ] T012 [US1] `src/lib/doors/attribution.ts` + test: `parseAttribution` (keeps 3 UTM keys, trims, truncates to 100, takes host only from referer, own host → null), `attributionSchema` (`.strict()`, bounded).
- [ ] T013 [US7] `src/server/services/doors.service.ts` + test (`createMockDb`): `resolvePublicDoor` (bypass-RLS slug lookup filtered to `active`, then `isModuleEnabled(ctx,'crm')`), `bumpDoorStat` (upsert `on conflict (org_id,door_key,day) do update set views = views+1`; swallows errors and logs), `isLikelyBot`, `createDoor` (409 `slug_taken` on unique violation; `active=false`; `defaultConfig` from the registry), `updateDoor` (partial; `config` validated by the kind's schema → 400 with zod issues), `getDoor`, `listDoorsWithFunnel` (grouped queries per contracts/data-model.md §Funnel; booking links read from `sched_links`).
- [ ] T014 [US7] Registries: `src/lib/doors/types.ts` (`DoorKind = 'form'|'faq'|'offer'`, `DoorRow`, `PublicDoorData`), `src/lib/doors/kinds.ts`, `src/server/doors/kinds.ts`, `src/lib/components/doors/registry.ts` (eager `import.meta.glob`, as in contracts). Add one test that the registry returns `undefined` for an unregistered kind.
- [ ] T015 [US7] APIs `src/routes/api/crm/doors/+server.ts` (GET `crm:view`, POST + `requireOrgCapability(locals,'crm','manage')`) and `src/routes/api/crm/doors/[id]/+server.ts` (GET, PATCH `manage`; `uuidParamOr404`). Route tests for 401/403/404/409/400.
- [ ] T016 [US7] Page `src/routes/(app)/crm/doors/+page.server.ts` + `+page.svelte`: table (kind, title, public URL with copy, toggle, views, submissions/bookings, contacts, customers), range select (7/30/90 d), create dialog (kinds from the registry; slug auto-derived from the title, editable). Toggle uses `createOptimistic` + `Toggle pending`, reverts with a toast on failure, and says "your role can't" on 403. Booking-link toggle sends the **full** `PATCH /api/scheduling/links/[id]` body (`[id]/+server.ts:10-38` replaces every field). Booking toggles are disabled without `scheduling:manage` (`canAct`).
- [ ] T017 [US7] Page `src/routes/(app)/crm/doors/[id]/+page.server.ts` + `+page.svelte`: general fields, kind `Editor` (controlled `config`), panels whose `kinds` include the door kind, save via PATCH, read-only when `!canAct('crm','manage')`. A kind with no editor module shows "not available yet" (i18n).
- [ ] T018 [US2][US5][US6] Public page `src/routes/d/[slug]/+page.server.ts` + `+page.svelte`: `resolvePublicDoor` → 404 if missing or the kind is unregistered. Attribution via `parseAttribution(url, referer, url.host, 'door:'+id)`. `bumpDoorStat(views)` unless `isLikelyBot`. Render org name, title, description and kind `Public`. `<meta name="robots" content="noindex">` except for kind `faq`.
- [ ] T019 Shared wiring (sole owner): `hooks.server.ts:196` `'/d/'`, `:328-351` `'/api/doors/public'`; `src/routes/+layout.svelte:111` `/d/`; `route-access-registry.ts` `PUBLIC_ROUTE_PATTERNS` + `MODULE_SUBRESOURCES.crm` `crm.doors`; `route-design-manifest.ts` (3 screens); the 6 count places + `capture-fixtures.ts` + wave-E map/count + public list/capture states (plan §S0); `src/lib/nav/modules.ts` `doors` item.
- [ ] T020 Seed (pairs with the migration): `scripts/qa/seed/doors.ts` (rows per plan §S0, every row `register(...)`ed with a `matrixUuid` id), `index.ts`, `matrix.ts` (domain `'doors'` + block at the end), `db.ts` `SEEDED_TABLES`. Run `bun run qa:seed:verify`.
- [ ] T021 i18n: `doors_*` keys after `"crm_nav_settings"` in both `messages/en.json` and `messages/es.json` (Spanish is the primary tone: plain words, "Puertas" for the nav). `bun run i18n:compile`.
- [ ] T022 S0 gates (plan §S0) + **live acceptance** S0 (plan §S0, screenshots in the PR body). Draft PR `feat(crm): doors foundation — public /d/ pages, door registry, funnel view`, labels `topic:security` and `topic:data` if they exist in the hub repo.

## Phase 3: S1 Booking attribution (`feat/doors-s1-booking-attribution`), after S0
- [ ] T030 [P][US1] `src/routes/book/[slug]/+page.server.ts`: attribution + view counter (plan §S1).
- [ ] T031 [P][US1] `src/routes/book/[slug]/+page.svelte:160-170`: include `attribution: data.attribution` in the POST body.
- [ ] T032 [US1] `src/routes/api/scheduling/public/[slug]/book/+server.ts:17-32`: `attribution: attributionSchema.optional()`. Test: an unknown key in `attribution` → 400; no attribution → still books.
- [ ] T033 [US1] `scheduling-public.service.ts:96-121`: `PublicBookInput.attribution`, `metadata: { attribution }`, `firstTouch`, `bumpDoorStat(ctx, 'book:'+link.id, 'submissions')` after success. `scheduling-bookings.service.ts:207` `CreateBookingInput.firstTouch?`, threaded at :532.
- [ ] T034 [US1] Tests: a new contact gets `first_touch`; an existing contact keeps it; booking metadata carries the attribution; the view is not counted for a bot user agent.
- [ ] T035 Gates + live acceptance S1. Draft PR `feat(scheduling): booking links record where the booker came from`.

## Phase 4: S2 Form door (`feat/doors-s2-form-door`), after S0 · security/data
- [ ] T040 [P][US2] `src/lib/doors/kinds/form.ts` (+test): `configSchema`, `defaultConfig` (name, phone, email, consent), `buildSubmissionSchema(config)` (types → zod: phone `^[+0-9 ()-]{6,20}$`, email `.email()`, date ISO, select ∈ options, checkbox boolean, strings ≤ 2000, required honoured, unknown keys stripped).
- [ ] T041 [P][US2] `src/server/doors/kinds/form.server.ts` `publicView`.
- [ ] T042 [US2] `src/server/services/doors-form.service.ts` (+test): `submitFormDoor`, `listSubmissions` (FR-006). Contact name comes from the first `text` field whose key is `name|nombre`, or null.
- [ ] T043 [US2] `src/routes/api/doors/public/[slug]/submit/+server.ts` (+test): rate limit, honeypot, 400/404/429 paths, response never echoes values.
- [ ] T044 [US2] `src/routes/api/crm/doors/[id]/submissions/+server.ts` (+test: masking on, `crm:view` required).
- [ ] T045 [P][US2] `src/lib/components/doors/form/Public.svelte`, `Editor.svelte`, `panels/SubmissionsPanel.svelte` (design governance: semantic tokens, house `Button`/`Toggle`/`Select`, no native select if the lint forbids it).
- [ ] T046 i18n `doors_form_*` after `"crm_dni_apply"`, both files; compile.
- [ ] T047 Gates + live acceptance S2. Draft PR `feat(crm): form doors — public intake forms that create CRM contacts` (security/data).

## Phase 5: S3 Next offers (`feat/doors-s3-next-offers`), parallel from day 0
- [ ] T050 [P][US3] `src/server/services/crm-next-offers.service.ts` (+test) per FR-008. Contact purchases come from `pos_tickets.crm_contact_id = $id or (party_id is not null and party_id = contact.party_id)`, `status = 'submitted'`, `pos_ticket_lines.fin_product_id is not null`. Nothing is added to `pos.service.ts`.
- [ ] T051 [US3] `src/routes/api/crm/contacts/[id]/next-offers/+server.ts` (+test: owner-scoped 404, pos off → empty).
- [ ] T052 [P][US3] `src/lib/components/crm/CrmNextOffers.svelte`; mount in `src/routes/(app)/crm/[contactId]/+page.svelte` (gridItems :551-566, labels :1128-1150, leftCell near :1038, business orgs only).
- [ ] T053 [US3] Seed fixture in `scripts/qa/seed/pos.ts` + matrix entries after `pos.emission.error`.
- [ ] T054 i18n `crm_offers_*` after `"crm_similar_title"`; compile.
- [ ] T055 Gates (incl. `pos-service-boundaries.test.ts`) + live acceptance S3. Draft PR `feat(crm): suggest what to offer a customer next`.

## Phase 6: S4 Follow-up (`feat/doors-s4-follow-up`), after S0 (live check after S2) · security/data
- [ ] T060 [US4] `crm-send.service.ts:49`: optional `opts { accountId, idempotencyKey }` (default behaviour unchanged; existing test stays green, plus one test for the override).
- [ ] T061 [US4] `src/server/services/doors-followup.service.ts` (+test) `runDoorFollowUps(now)` per plan §S4 and FR-009.
- [ ] T062 [US4] `src/routes/api/jobs/tick/+server.ts`: an isolated sweep after the inbox block, independent of `?jobs=1`. Add `followUps` to the JSON. Update the comment at `system-automations.ts:70-77`.
- [ ] T063 [US4] `src/routes/api/crm/doors/[id]/follow-up/+server.ts` (+test: `accountId` not in the catalog → 400; manager → 403).
- [ ] T064 [P][US4] `src/lib/components/doors/panels/FollowUpPanel.svelte`.
- [ ] T065 i18n `doors_followup_*` after `"crm_financials_recent"`; compile.
- [ ] T066 Gates + live acceptance S4. Draft PR `feat(crm): one automatic WhatsApp follow-up for form leads who did not buy` (security/data). The PR body names the open end "no UI writes opt-out yet".

## Phase 7: S5 FAQ door (`feat/doors-s5-faq-door`), after S0
- [ ] T070 [P][US5] `src/lib/doors/kinds/faq.ts` (+test), `src/server/doors/kinds/faq.server.ts` (+test: drafts never public).
- [ ] T071 [US5] `src/server/services/doors-faq-draft.service.ts` (+test with mocked `ai`: PII scrubbed, ≤ 10 drafts, 0 messages → `{drafts: []}` without a model call).
- [ ] T072 [US5] `src/routes/api/crm/doors/[id]/faq-draft/+server.ts` (+test: 503 without a key, 429, 403).
- [ ] T073 [P][US5] `src/lib/components/doors/faq/Public.svelte` (JSON-LD escaped; test that `</script>` inside an answer cannot break out), `Editor.svelte`.
- [ ] T074 i18n `doors_faq_*` after `"crm_insights_word_occurrences"`; compile.
- [ ] T075 Gates + live acceptance S5. Draft PR `feat(crm): FAQ doors drafted from real customer questions`.

## Phase 8: S6 Offer door (`feat/doors-s6-offer-door`), after S0
- [ ] T080 [P][US6] `src/lib/doors/kinds/offer.ts` (+test), `src/server/doors/kinds/offer.server.ts` (+test: inactive excluded, foreign-org product id ignored by RLS, live price, wa.me digits only).
- [ ] T081 [P][US6] `src/lib/components/doors/offer/Public.svelte` (with the `TODO(handoff)` payment-link line), `Editor.svelte`.
- [ ] T082 i18n `doors_offer_*` after `"crm_reserved_only"`; compile.
- [ ] T083 Gates + live acceptance S6. Draft PR `feat(crm): offer doors — public price list with WhatsApp and booking buttons`.

## Phase 9: Post-merge
- [ ] T090 Owner merges in the order `S0 → S3 → S1 → S2 → S6 → S5 → S4` (S3 any time). Each PR rebases onto `master` and re-runs compile, check and test before merge.
- [ ] T091 Plan §Verification 1–3 (prod SQL, FACES intake cut-over by the owner, jobs tick JSON).
- [ ] T092 Update `proposals/2026-10-24-hub-collection-points-followups.md` with anything left open, and flip this spec's board stub to `shipped`.

## Dependencies & parallelism
- S0 is the only serial gate. S3 runs from day 0. S1, S2, S5 and S6 can branch from `feat/collection-points` as soon as S0's PR is open, and rebase after it merges.
- S4's code and tests need only S0's schema. Its live check needs S2.
- Inside a slice, `[P]` tasks touch different files.

## MVP
S0 + S2 (form door + Doors view) closes the FACES patient-data loss and proves the funnel. S1 makes the existing booking link count. S3–S6 extend from there.
