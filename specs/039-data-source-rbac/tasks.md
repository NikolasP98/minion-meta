# Tasks: Data-source permissions enforced on reads

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/read-enforcement.md`, `quickstart.md` in `specs/039-data-source-rbac/`
**Hub repo**: `minion_hub/`, PR base `master`, package manager **bun**. One worktree per slice (`git -C minion_hub worktree add ~/.cache/claude-tmp/hub-039-sN -b <branch> origin/master`), real `bun install --frozen-lockfile`, `.env` from `.env.example` if `bun run check` needs it; never production credentials.
**Owner gate**: spec approved (security + data; K1–K3 defaults accepted) before any task; the owner merges each PR. PR titles are user-facing with scope, e.g. `feat(rbac): data roles — reads enforced at the load boundary, ratchet and denied visuals (S1)`.
**Gates**: foreground with `timeout`, capture `$?`; targeted vitest only (`bun x vitest run <paths>`), never `bun run test`. The ratchet (`src/server/auth/dataset-read.ratchet.test.ts`) runs in every slice.
**UI**: invoke `ui-design-governance` first; semantic tokens, existing primitives, Paraglide `m.*()` + `i18n:compile`; `messages/*.json` append-only.
**Format**: `- [ ] [ID] [P?] [Story] Description with file path`.

## Phase 1: Setup (meta, done by this spec)
- [x] T000 Feature dir, board stub `specs/2026-10-23-hub-data-source-rbac-spec.md`, `specs/index.json` regenerated.

---

## Phase 2: Slice S1 — primitives, ratchet, denied visual (hub PR 1, `feat/data-rbac-s1-primitives`) — DELTA D1–D3 — [US3]

**Goal**: the read boundary, the marker, the ratchet at today's baseline, and the one denied visual exist; no load is converted yet (`DATASET_ENFORCED = []`).
**Independent test**: `dataset-ctx.test.ts`, `dataset-read.ratchet.test.ts` (green at baseline, red with the fixture), `DataSource.mounted.test.ts`.

- [ ] T001 `src/lib/permissions.ts` — append `DATA_VERBS` and `DATASET_ENFORCED` exactly as `data-model.md` §Types (if spec 037 S2 already added `DATASET_ENFORCED`, keep its line and add the doc comment; one export only). Add `export function isDenied(v: unknown): v is DatasetDenied` and `export interface DatasetDenied { denied: string; verb: 'view' }` here (client-safe; the server file re-exports them). `rbac.service.ts` already imports from this file — check for cycles with `bun run check`.
- [ ] T002 `src/server/auth/dataset-ctx.ts` — implement `datasetCtx` and `readDataset` per `data-model.md` §Server (imports: `getCoreCtx` from `./core-ctx`, `resolveCapabilities` + `type Module` from `$server/services/rbac.service`, `error` from `@sveltejs/kit`; re-export `isDenied`, `DatasetDenied` from `$lib/permissions`). Doc comment: the J1/J2 rule and "spec 039".
- [ ] T003 `src/server/auth/dataset-ctx.test.ts` — mock `./core-ctx` (`getCoreCtx` → `{ db, tenantId:'t', profileId:'p' }` or `null`) and `$server/services/rbac.service` (`resolveCapabilities` → `{ can: vi.fn() }`): no tenant → rejects 401; `locals.user.role === 'admin'` → ctx without calling `resolveCapabilities`; `can('pos','view')` true → ctx; false → `{ denied:'pos', verb:'view' }`; user without `supabaseId` and not admin → denied; `readDataset` with denied → `fn` not called, marker returned; with ctx → `fn(ctx)` result.
- [ ] T004 `scripts/dataset-read-baseline.mjs` — node script, no deps: `collect()` globs `src/routes/(app)/**/+page.server.ts` and `+layout.server.ts` (use `fs.readdirSync` recursion; no new dependency), strips `//…` and `/*…*/` comments, counts `/\b(getCoreCtx|requireCoreCtx|getTenantCtx|requireTenantCtx|getCoreDb\(|withOrgCore)\b/g` per file; `--print` prints sorted `file: n`; `--update` reads `scripts/.dataset-read-baseline.json`, exits 1 listing any file whose new count > old (or new file with n > 0 when the baseline exists), else writes the sorted JSON (files with 0 omitted). Export `collect` and `moduleForLoadPath` (per `data-model.md` §Module attribution; import `MODULE_MANIFEST` is not possible from `.mjs` — duplicate the prefix→module map as a constant with a comment pointing at `src/lib/modules/availability.ts`, and add a vitest in T005 asserting the two agree).
- [ ] T005 `src/server/auth/dataset-read.ratchet.test.ts` — imports `collect`/`moduleForLoadPath` from `../../../scripts/dataset-read-baseline.mjs`, `DATASET_ENFORCED` from `$lib/permissions`, `MODULE_MANIFEST` from `$lib/modules/availability`, baseline JSON. `it` per rule (contract §Ratchet): enforced modules at 0; others ≤ baseline; unknown files 0; no stale keys; `moduleForLoadPath` prefix map ⊇ every `appPrefixes` entry of `MODULE_MANIFEST`. Fixture proof inside the test: write `src/routes/(app)/pos/_ratchet_fixture/+page.server.ts` with a bare `getCoreCtx`, assert `collect()` reports it with count 1 and the "unknown files" rule would fail, then `rmSync` in `finally`.
- [ ] T006 Generate the baseline: `node scripts/dataset-read-baseline.mjs --print` must list exactly the 62 files from `research.md` R1 (diff against the AS-IS list; investigate any difference before continuing); then `--update` to create `scripts/.dataset-read-baseline.json`. Commit it.
- [ ] T007 [P] i18n — append `data_denied_title` ("Your role can't view {dataset}" / "Tu rol no puede ver {dataset}"), `data_denied_hint` ("Ask an admin for View on this dataset" / "Pide a un administrador el permiso Ver sobre estos datos"), `rbac_verb_view` ("View" / "Ver"), `rbac_verb_add` ("Add" / "Añadir"), `rbac_verb_edit` ("Edit" / "Editar"), `rbac_verb_remove` ("Remove" / "Quitar"), `rbac_advanced` ("Advanced" / "Avanzado"). `bun run i18n:compile`.
- [ ] T008 [P] `src/lib/components/ui/DataSource.svelte` — per `data-model.md` §Client: generic `T`, `value`, optional `module`, `compact`, `children: Snippet<[T]>`; denied → `AsyncBoundary` `forbidden` with `title = m.data_denied_title({ dataset: MODULE_LABELS[value.denied] ?? value.denied })` (import `MODULE_LABELS` from a client-safe location — if it only lives in `rbac.service.ts`, move the constant to `$lib/permissions.ts` and re-export from the service), `description = m.data_denied_hint()`; `compact` renders one `t-caption` line with `Lock` (`iconSizes.sm`). Export from `src/lib/components/ui/index.ts`. Tokens only.
- [ ] T009 [P] `src/lib/components/ui/DataSource.mounted.test.ts` — denied value renders the forbidden title containing "Point of Sale"; ready value renders the children with the value; `compact` renders the one-line variant.
- [ ] T010 [P] K3 fetch mapping — locate the shared JSON fetch helper (`git grep -n "export async function fetchJson\|export async function apiFetch\|export function api(" -- src/lib`); if one exists, add: on `res.status === 403` for `GET`, read the body (`{ message? , error? }`), match `/^([a-z]+): view required$/`, return `{ denied: m[1], verb: 'view' }`; if none exists, add `src/lib/api/fetch-json.ts` with `fetchJson<T>(input, init): Promise<T | DatasetDenied>` and use it only in the pages this spec converts. Unit test alongside.
- [ ] T011 Gates S1: `bun run i18n:compile`; `timeout 900 bun run check`; `bun run lint:design && bun run lint:tokens`; `bun x vitest run src/server/auth src/lib/components/ui/DataSource.mounted.test.ts src/lib/permissions.test.ts`. Open the draft PR; body lists the 62-file baseline summary and the gates.

---

## Phase 3: Slice S2 — POS rollout (hub PR 2, `feat/data-rbac-s2-pos`) — DELTA D4 — [US1] [US2]

**Goal**: every POS load reads through `datasetCtx`; POS pages render denied visuals; `DATASET_ENFORCED = ['pos']`; spec 037's floor for POS instances is off.
**Independent test**: ratchet green with POS at zero; `pos/sell/page.server.test.ts`; quickstart P1–P6 + J5 matrix.

- [ ] T012 [US1] Convert loads (contract §Load contract), one `datasetCtx` per dataset read, 401 behaviour preserved, `depends()` untouched: `src/routes/(app)/pos/+layout.server.ts` (`pos`: settings, shifts, pending work), `pos/sell/+page.server.ts` (`pos` for sellables/bundles/tickets/shifts/payments; `scheduling` for resources/event types — denied scheduling ⇒ `resources: []`-shaped? No: return the marker in `resources`/`eventTypes` and let the schedule step render `DataSource`), `pos/appointments/+page.server.ts`, `pos/appointments/new/+page.server.ts`, `pos/catalog/+page.server.ts`, `pos/catalog/new/+page.server.ts`, `pos/catalog/[productId]/edit/+page.server.ts`, `pos/history/+page.server.ts`, `pos/accounts/+page.server.ts`, `pos/tickets/[id]/+page.server.ts`. `pos/settings/+page.server.ts` keeps its `requireOrgCapability(...,'manage')` and switches the handle too. Grep every `getUserNames`/non-tenant helper — those stay as they are (not tenant reads).
- [ ] T013 [US1] Wrap visuals: for each converted page's `+page.svelte` (and `ShiftBanner.svelte` via the layout's `openShift`/`openShifts`/`posSettings`, compact — K2), wrap the data-bound regions in `<DataSource value={data.x} module="pos">…</DataSource>`; lists rendered through `DataView`/`DataTable` get `state="denied"` + `message`. Fix every type error `bun run check` raises from the `T | DatasetDenied` slots — no `as` casts. Write buttons already use `canAct` (`ShiftBanner`, `SellCart`, `ClientAccountDrawer`); the till's charge button is gated by 037 S5 (if not yet merged, add the same one-line `cartBlocker` guard here and note it in both PRs).
- [ ] T014 [US1] `src/lib/permissions.ts` — `DATASET_ENFORCED = ['pos']`. The 037 `transition-floor.test.ts` snapshot (if 037 S2 is merged) updates in the same commit.
- [ ] T015 [US1] Tests: `src/routes/(app)/pos/sell/page.server.test.ts` (new; mock `$server/auth/dataset-ctx` → denied for `pos`, ctx for `scheduling`, and the services): sellables/tickets/shifts slots are `{ denied:'pos' }`, no POS service called, scheduling slots hold data; second case all allowed → previous behaviour. Same shape for `pos/+layout.server.ts` (`layout.server.test.ts`). Ratchet green.
- [ ] T016 Gates S2: `timeout 900 bun run check`; `bun run lint:design && bun run lint:tokens`; `bun x vitest run src/server/auth 'src/routes/(app)/pos' src/lib/components/pos src/lib/nav/transition-floor.test.ts`; QA stack: quickstart §3 J5 matrix for the 10 POS pages × 4 personas (before/after), P1–P6; attach `evidence/s2-j5.md` to the PR.

---

## Phase 4: Slice S3 — scheduling + stock (hub PR 3, `feat/data-rbac-s3-scheduling-stock`) — DELTA D5 — [US2]
- [ ] T017 [US2] Convert the 9 scheduling loads (`scheduling/+layout.server.ts`, `+page`, `bookings/[id]/edit`, `bookings/new`, `calendar`, `event-types`, `links`, `reminders`, `settings`) and the 8 stock loads (`stock/+page`, `commitments`, `entries`, `entries/[id]`, `entries/new`, `items`, `items/[id]`, `warehouses`) per the load contract; wrap visuals; `team/+page.server.ts` (HR, `scheduling.resources`) keeps its capability call and switches the handle. Composite pages (`/pos/appointments` reads both — already S2) unchanged.
- [ ] T018 [US2] `DATASET_ENFORCED = ['pos','scheduling','stock']`; load tests for `scheduling/+layout.server.ts` and `stock/items/+page.server.ts` (denied vs allowed); ratchet green.
- [ ] T019 Gates S3: `check`; `lint:design && lint:tokens`; `bun x vitest run src/server/auth 'src/routes/(app)/scheduling' 'src/routes/(app)/stock' src/lib/nav/transition-floor.test.ts`; J5 matrix for the 17 pages; P7.

## Phase 5: Slice S4 — crm · finances · sales · support · memberships · socials (hub PR 4, `feat/data-rbac-s4-business`) — DELTA D6 — [US2]
- [ ] T020 [US2] Convert crm (5: `+page`, `[contactId]`, `customers`, `insights`, `settings`), finances (6: `+page`, `invoices`, `invoices/[id]`, `purchases`, `purchases/[id]`, `settings`), sales (2), support (2), memberships (1), socials (6: `+page`, `campaigns`, `campaigns/[campaignId]`, `posts`, `posts/[postId]`, `settings` — module `ads`) per the load contract; wrap visuals. Field-level masking and owner scope stay inside the services (unchanged).
- [ ] T021 [US2] `DATASET_ENFORCED += 'crm','finance','sales','support','memberships','ads'`; load tests for `crm/+page.server.ts` and `finances/invoices/+page.server.ts`; ratchet green.
- [ ] T022 Gates S4: `check`; `lint:design && lint:tokens`; `bun x vitest run src/server/auth 'src/routes/(app)/crm' 'src/routes/(app)/finances' 'src/routes/(app)/sales' 'src/routes/(app)/support' 'src/routes/(app)/socials' src/lib/nav/transition-floor.test.ts`; J5 matrix for the 22 pages; P8.

## Phase 6: Slice S5 — remaining modules + API GET bucket (hub PR 5, `feat/data-rbac-s5-rest`) — DELTA D7 — [US2] [US3]
- [ ] T023 [US2] Convert workforce (3) + `work/+page` (`projects`), brains (3: `+page`, `[id]`, `agents`; `brains/settings`/`template` keep their capability calls and switch handles), agents (2: `autonomous`, `autonomous/[id]`), `overview/+page`, `home/settings/+page`, `channels/gmail/+page` (`channels`), and `(app)/+layout.server.ts` (user-scoped bundle: declare `overview`; a denied `overview` is impossible by `defaultCaps` but the ratchet needs the handle to be sanctioned). Also `notifications`, `pulse`, `settings/*` loads that hold a bare handle alongside their capability call: switch handles (counts to 0).
- [ ] T024 [US2] `DATASET_ENFORCED` = every module with `appPrefixes` or a static prefix in `moduleForLoadPath`; baseline JSON becomes empty (`--update` writes `{}`); ratchet `it` "baseline is empty" added (SC-001).
- [ ] T025 [US3] API GET bucket: extend `scripts/dataset-read-baseline.mjs` with `collectApiGets()` — files `src/routes/api/**/+server.ts` exporting `GET` with none of `requireOrgCapability|requireAuth|requireAdmin|requireServerToken` — and a second baseline key `apiGets` in the JSON; ratchet rule "≤ baseline, new files 0"; record the measured count in the PR body and in `research.md` R5 (meta follow-up commit).
- [ ] T026 Gates S5: `check`; `lint:design && lint:tokens`; `bun x vitest run src/server/auth 'src/routes/(app)' src/lib/nav/transition-floor.test.ts` (the `(app)` glob is the load tests only — confirm no integration test is picked up: `bun x vitest list 'src/routes/(app)'` first); J5 matrix for the remaining pages; P10.

## Phase 7: Slice S6 — matrix as data editor, docs, ledger (hub PR 6, `feat/data-rbac-s6-matrix`; after spec 037 S5) — DELTA D8 — [US4]
- [ ] T027 [US4] `src/lib/components/users/RbacRolesSection.svelte` — labels through `DATA_VERBS` (`View · Add · Edit · Remove`); `export`/`manage` columns rendered only when `advanced` is on (`Button variant="ghost" size="xs" aria-expanded` toggle labelled `m.rbac_advanced()`, state in `localStorage` `hub-roles-advanced` with try/catch); delete the "Sections" block (`:609-650`) and the sub-resource handling it alone needs (`toggleChild`, `resetSub` stay if used by anything else — grep). Payloads unchanged.
- [ ] T028 [US4] `src/server/services/rbac.service.ts` `listRbacRoles(orgId, { includeSubResources = false } = {})` — `subResources: []` unless requested; `settings/roles/+page.server.ts` passes nothing; existing `rbac.service.test.ts` cases that assert sub-resources pass `{ includeSubResources: true }`.
- [ ] T029 [US4] `src/lib/components/users/RbacRolesSection.mounted.test.ts` — column labels; advanced toggle reveals Export/Manage; ticking Add posts `caps.create === true`; no "Sections" heading.
- [ ] T030 [P] Hub `AGENTS.md` — RBAC gating checklist item per `contracts/read-enforcement.md` §Hub AGENTS.md.
- [ ] T031 [P] Meta: `proposals/2026-10-23-hub-data-source-rbac-followups.md` (table-level datasets; denied marker from API GETs — K3; localising `MODULE_LABELS`; deriving manifest datasets from loads — R8; folding dotted `pos.sell` registry keys into 037 `page:` rows; any `canAct` gaps found in J5 runs); `node scripts/proposal-index.mjs`; `node scripts/spec-index.mjs --check`; evidence README with hub SHAs; flip the board stub to `done`/`shipped`.
- [ ] T032 Gates S6: `bun run i18n:compile`; `check`; `lint:design && lint:tokens`; `bun x vitest run src/lib/components/users src/server/services/rbac.service.test.ts src/server/auth`; P9 screenshots.

---

## Dependencies & execution order
- S1 → S2 → (S3 ∥ S4 ∥ S5) → S6 (S6 also after 037 S5). S1 may start once 037 S1 is merged or independently (it creates `DATASET_ENFORCED` if absent).
- Within S1: T001 → T002 → T003; T004 → T005 → T006; T007–T010 parallel; T011 last.
- Within S2: T012 → T013 → T014 → T015 → T016.
- S3/S4/S5 are disjoint route trees; each rebases on `master` before PR; `DATASET_ENFORCED` edits are one-line and rebase cleanly.

## Parallel example (after S2 merge)
```text
Worktree A (S3): T017 T018 T019
Worktree B (S4): T020 T021 T022
Worktree C (S5): T023 T024 T025 T026
```

## Notes
- MVP = S1 + S2: the owner's POS example works end to end with 037's seeded link (US1).
- Every PR body: gates with exit codes, vitest paths, the J5 persona table, quickstart items; attribution block from the session reminder.
- Commit messages and PR bodies carry the mandated trailers.
