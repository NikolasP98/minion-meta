# Implementation Plan: Record lock policy

**Branch**: `feat/140-record-lock-policy-s<N>` (hub, base `master`), one branch per slice | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/140-record-lock-policy/spec.md` (verdict approved; owner go-ahead 2026-11-23). Hub read at `origin/master` `484c6a03`.

## Summary

Each organization gets one lock policy: a set of rules that decide when a past record stops being editable. One server function, `recordLockFor(tx, orgId, record)`, answers "is this record locked, and by which rules". Slice 1 applies it to purchase (receipt) corrections only, which is the spec 124 receipt-replace path that exists today (`stock-corrections.service.ts:365-471`).

The design has four parts:

1. **Policy**: one row per org in `org_lock_policy`. No row means the default, "Al cerrar el mes" only. The month rule calls today's `evaluateReceiptPeriod` unchanged (`stock-corrections.logic.ts:249`), so the default reproduces today's behaviour. The existing spec 124 tests must pass unmodified, and a new parity test proves it.
2. **External locks**: rows in `org_record_locks`, written by a webhook that an org API key with the new `locks` scope calls ("everything up to 31/10" or a list of record ids).
3. **Owner unlock**: one record, one correction, with a reason, valid 24 hours. It is consumed inside the correction's own transaction.
4. **Audit**: `org_lock_events`, append-only. Every lock, lift, unlock, use of an unlock, refused correction and policy change writes one row. The owner sees the list in Ajustes → Bloqueo de registros.

Design detail: [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md). Validation guide: [quickstart.md](quickstart.md). Tasks: [tasks.md](tasks.md).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2 (hub)

**Primary Dependencies**: Drizzle ORM over postgres.js (`withOrgCore`), Paraglide i18n, hub UI kit (`Modal`, `Button`, `Badge`, `Toggle`, `DataTable`), lucide-svelte. No new dependency.

**Storage**: Supabase Postgres.
- New tables: `org_lock_policy`, `org_record_locks`, `org_lock_events` (S1).
- Changed constraint: `org_api_keys_scopes_known` gains `locks` (S4).
- Two migrations under `supabase/migrations/`, Drizzle mirror in `src/server/db/pg-org-integrations-schema.ts`.

**Testing**:
- Vitest pure-logic tests (`record-locks.logic.test.ts`), mocked-DB service and route tests.
- One native-Postgres case added to the existing `stock-corrections.sql.integration.test.ts` (registered at `scripts/qc/native-postgres-manifest.ts:1191`).
- `*.mounted.test.ts` for the settings page and the entry page.
- Focused files only (`bun x vitest run <files>`); never the full suite.

**Target Platform**: Hub on Vercel; FACES uses desktop Chrome.

**Project Type**: Web application (SvelteKit: services, routes and Svelte components in one repo).

**Performance Goals**: `recordLockFor` adds at most four small indexed reads per correction preview or apply (policy row, period locks, external locks for the org, unlock events for the record). Corrections are rare, so no caching.

**Constraints**:
- The default org (no policy row) must behave exactly as today: same decisions, same refusal code (`period_locked`), same status (422).
- A lock that arrives between preview and apply must refuse the apply. The lock evaluation goes into the preview hash (`policyExtra`, `stock-corrections.service.ts:471`), and apply re-plans under the stock write gate.
- Owner checks read the membership role inside the transaction (`caps.membershipRole`, same as `stock-corrections.service.ts:172` and `:633`).
- `org_lock_events` has no UPDATE or DELETE grant.
- Every user-facing string goes through `m.*()` (es, en). Semantic design tokens only.

**Scale/Scope**: about 6 new server files, 1 new settings page, 1 changed page (stock entry), 5 route files, about 45 i18n keys over slices S1–S4.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | ✅ spec.md approved; this plan; tasks.md; no code yet |
| II. AS-IS → TO-BE → DELTA with evidence | ✅ in spec.md; every code claim here is anchored to `file:line`; six spec corrections in research.md |
| III. Slice-scoped delivery | ✅ four hub PRs now (S1–S4), two later (S5, S6) that each need owner confirmation. Each from a fresh clone of hub `origin/master` |
| IV. Required build steps | ✅ S2 adds the page `/settings/record-locks`: `SettingsNav`, `route-access-registry.ts`, `route-design-manifest.ts`, `route-design-validation.ts` counts, `site-map.ts`, `scripts/ui-audit-inventory.test.ts` (the file set hub commit `4ea8b4e9` touched for `/settings/developers`). New write routes: `API_WRITE_PREFIXES` (`rbac.service.ts:860`) plus an owner check in the service. Webhook route: `API_HANDLER_AUTH_PATHS` (`hooks.server.ts:502`) and `rls-bypass-inventory.json`. i18n es/en. Migrations ship with seed changes (`migration-seed-pairing`). |
| V. Security/data work keeps human gates | ✅ tagged `data`, `security`. Owner approves this plan and merges every slice. Migrations are additive and idempotent; no backfill. |
| FigCraft demo first | ⏳ see "FigCraft demo"; S2–S4 UI waits for it |

Post-design re-check: ✅. Three tables are justified in research R2. No new dependency, no new capability in the RBAC catalog.

## Project Structure

### Documentation (this feature)

```text
specs/140-record-lock-policy/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (hub repository, `minion_hub`)

```text
supabase/migrations/
├── 20261124100000_record_lock_policy.sql          S1  three tables + RLS
└── 20261124110000_api_key_scope_locks.sql         S4  scopes check gains 'locks'

src/server/db/pg-org-integrations-schema.ts        S1  orgLockPolicy, orgRecordLocks, orgLockEvents
src/server/services/
├── record-locks.logic.ts                          S1  pure: evaluateRecordLock, parsePolicy, types
├── record-locks.logic.test.ts                     S1
├── record-locks.service.ts                        S1  recordLockFor, getLockPolicy; S2 setLockPolicy,
│                                                      logLockEvent, listLockEvents; S3 grantUnlock,
│                                                      consumeUnlockInTx; S4 applyExternalLock, liftLock
├── record-locks.service.test.ts                   S1+
├── stock-corrections.logic.ts                     S1  refusal code 'record_locked' (:12-58)
├── stock-corrections.service.ts                   S1  receipt plan calls recordLockFor (:447-471);
│                                                      S3 consume the unlock after the receipt row (:820)
├── stock-corrections.logic.test.ts                S1  unchanged (parity proof)
├── stock-corrections.sql.integration.test.ts      S1  one added case
└── org-api-keys.service.ts                        S4  no code change; scope list comes from the type

src/lib/types/api-keys.ts                          S4  API_KEY_SCOPES += 'locks' (:17)
src/lib/types/record-locks.ts                      S1  LockRule, LockHit, LockPolicy, LockEventRow
src/server/locks/caller.ts (+ .test.ts)            S4  who calls the webhook (pattern: src/server/mcp/caller.ts:64-74)

src/routes/api/stock/_corrections-http.ts          S2  refusal body carries `locks`
src/routes/api/stock/corrections/+server.ts        S2  log refused corrections
src/routes/api/stock/corrections/preview/+server.ts S2 log refused corrections
src/routes/api/stock/corrections/server.test.ts    S2
src/routes/api/settings/record-locks/policy/+server.ts            S2  PUT
src/routes/api/settings/record-locks/unlocks/+server.ts           S3  POST
src/routes/api/settings/record-locks/locks/[id]/lift/+server.ts   S4  POST
src/routes/api/settings/record-locks/server.test.ts               S2+
src/routes/api/hooks/record-locks/+server.ts (+ server.test.ts)   S4  the webhook

src/routes/(app)/settings/record-locks/+page.server.ts, +page.svelte   S2
src/lib/components/settings/record-locks/
├── LockPolicySection.svelte                       S2  rules (owner edits, others read)
├── LockAuditSection.svelte                        S2  audit list
└── ExternalLocksSection.svelte                    S4  webhook locks + lift
src/routes/(app)/stock/entries/[id]/+page.server.ts  S2  load adds `lock`
src/routes/(app)/stock/entries/[id]/PageBody.svelte  S2  lock banner; S3 unlock dialog
src/lib/components/stock/correction-refusals.ts    S2  'record_locked'
src/lib/components/stock/LockNotice.svelte         S2  the banner (reasons + who can unlock)
src/lib/components/settings/developers/ApiKeysSection.svelte  S4  second scope checkbox (:45, :74, :174, :269)

src/server/services/rbac.service.ts                S2  API_WRITE_PREFIXES += '/api/settings/record-locks' (:897)
src/hooks.server.ts                                S4  API_HANDLER_AUTH_PATHS += '/api/hooks/record-locks' (:531)
src/server/db/rls-bypass-inventory.json            S4  regenerated
scripts/qa/seed/{matrix.ts,doors.ts,db.ts}         S1, S4
messages/es.json, messages/en.json                 S2–S4
```

**Structure Decision**: one new service pair (`record-locks.logic.ts` pure, `record-locks.service.ts` with the database) beside the stock corrections pair it serves first. Lock code does not live inside the stock module, because sales and manual entries will call it later (S5, S6) and spec 135 calls `recordLockFor` from its own quantity-correction rule.

## Implementation slices

Each slice is one hub PR to `master`, shippable alone. S3 and S4 touch disjoint files and can be built in either order after S2.

| Slice | PR title (the changelog line) | Visible change |
|---|---|---|
| S1 | `feat(stock): purchase corrections read one lock policy per organization` | none (same behaviour, proven) |
| S2 | `feat(settings): owners choose when past purchases lock, with the reason shown on the record` | settings page, lock banner, audit list |
| S3 | `feat(stock): an owner can unlock one locked purchase for one correction` | unlock dialog |
| S4 | `feat(settings): an external tool can lock records through an API key` | `locks` scope, webhook, external locks list |
| S5 | sales corrections + "Tras SUNAT" | needs owner confirmation |
| S6 | manual stock entries | needs owner confirmation |

### S1 — foundation and parity (backend only)

1. Migration `20261124100000_record_lock_policy.sql`: the three tables with RLS (data-model.md). Drizzle mirror. Seed: one explicit default policy row for the main QA org in `scripts/qa/seed/` plus a `matrix.ts` entry.
2. `record-locks.logic.ts`: `evaluateRecordLock(input)` pure. Rules `month`, `days`, `sunat`, `webhook`. The month rule calls `evaluateReceiptPeriod` and converts its `period_locked` throw into a hit; `policy_unverified` still throws.
3. `record-locks.service.ts`: `getLockPolicy(tx, orgId)` (no row → default) and `recordLockFor(tx, orgId, record)`. For a receipt that is itself a replacement, the function walks `stk_corrections` back to the first receipt and uses that receipt's posting time for the `days` and `webhook` rules (research R4).
4. `stock-corrections.service.ts:447-471`: replace the direct `posPeriodLocks` read and `evaluateReceiptPeriod` call with `recordLockFor`. Refusal: month-only hits keep `period_locked`; any other hit throws the new `record_locked` (422) with the hits as detail. `policyExtra` keeps `receiptPeriodPolicy` and `locks` byte-identical for the default policy and adds `lockPolicy` only when a policy row exists, so open previews of default orgs stay valid across the deploy.
5. Parity proof: `stock-corrections.logic.test.ts` and the receipt cases of `stock-corrections.sql.integration.test.ts` pass with no edit; new table-driven test `record-locks.logic.test.ts` "default policy equals receipt_period_v1" runs both functions over the same inputs (original month locked, current month locked, both, neither, no finance settings).

Tests: `src/server/services/record-locks.logic.test.ts`, `src/server/services/record-locks.service.test.ts`, `src/server/services/stock-corrections.logic.test.ts`; native lane: `src/server/services/stock-corrections.sql.integration.test.ts`.

### S2 — policy settings, lock shown, refusal names the rule, audit list

1. `setLockPolicy(ctx, input)`: owner only (membership role read in the transaction), validates `days` 1–3650, writes the row and a `policy_changed` event with before/after.
2. `PUT /api/settings/record-locks/policy`. Central gate through `API_WRITE_PREFIXES`.
3. Refusals: `_corrections-http.ts` adds `locks` and `unlockBy: 'owner'` to the body for `period_locked` and `record_locked`. Both correction routes write a `refused` event in a short separate transaction after the refusal (the refused transaction is read-only or rolled back, so it cannot hold the row).
4. Page `/settings/record-locks` ("Bloqueo de registros"): view needs `settings:manage`; rule controls are editable for owners and read-only with a note for everyone else. Rules shown in S2: "Al cerrar el mes" and "Después de X días". Audit list below (newest first, 100 rows, "Cargar más").
5. Stock entry page: `+page.server.ts` returns `lock` from `recordLockFor`. `LockNotice.svelte` shows a lock icon, each reason and who can unlock. "Corregir entrada" is disabled while locked.
6. Messages (es, en): rule names, hints, reasons, refusal `stock_corr_err_record_locked`, audit actions. Route-contract registrations for the new page.

Tests: `src/routes/api/settings/record-locks/server.test.ts`, `src/routes/api/stock/corrections/server.test.ts`, `src/server/services/record-locks.service.test.ts`, `src/routes/(app)/settings/record-locks/page.mounted.test.ts`, `src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts`, `src/lib/routes/route-design-contracts.test.ts`, `src/server/services/rbac.service.test.ts`.

### S3 — owner one-shot unlock

1. `grantUnlock(ctx, { recordType, recordId, reason })`: owner only; the record must be locked now; writes an `unlock` event (expires after 24 hours). A second grant while one is active returns the active one.
2. `recordLockFor` treats a record with an active unlock as not locked and returns `unlock: { eventId, expiresAt }`. The current-month lock is not unlockable (research R5).
3. `applyStockCorrection`: after the correction receipt row is inserted (`stock-corrections.service.ts:820`), `consumeUnlockInTx` writes `unlock_used` with `ref_event_id` = the unlock and the correction id. Same transaction, so a failed correction leaves the unlock usable.
4. `POST /api/settings/record-locks/unlocks`. Entry page: owners see "Desbloquear para una corrección" in the lock notice (dialog with a required reason). After the grant the notice reads "Desbloqueado por {name} hasta {time} para una corrección".

Tests: `src/server/services/record-locks.service.test.ts`, `src/routes/api/settings/record-locks/server.test.ts`, `src/server/services/stock-corrections.sql.integration.test.ts` (unlock consumed once; second correction refused), `src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts`.

### S4 — webhook and the `locks` scope

1. Migration `20261124110000_api_key_scope_locks.sql`: drop and re-add `org_api_keys_scopes_known` with `array['sandbox','locks']`. `API_KEY_SCOPES` gains `locks`. `ApiKeysSection.svelte` gets a second checkbox and badge. Seed: a revoked key with the `locks` scope in `scripts/qa/seed/doors.ts`.
2. `src/server/locks/caller.ts`: `Bearer mk_…` → `verifyKey` → scope check → per-key rate limit (60 per minute) → `touchKey`. Returns the org context and the key's id and name.
3. `POST /api/hooks/record-locks`: body `{ action: 'lock' | 'lift', label, upTo? , recordType?, ids? }`. Idempotent by natural key (research R6). Refused with 409 `webhook_rule_off` when the org has not enabled "Por webhook". Every call that changes something writes a `lock` or `lift` event with the key's name as actor.
4. Settings page: the "Por webhook" rule toggle, `ExternalLocksSection.svelte` (label, scope, set by, date; owner "Quitar bloqueo" with a reason → `POST /api/settings/record-locks/locks/[id]/lift`), and a short "Cómo llamarlo" block with a curl example.

Tests: `src/server/locks/caller.test.ts`, `src/routes/api/hooks/record-locks/server.test.ts`, `src/routes/api/settings/api-keys/server.test.ts`, `src/server/services/org-api-keys.service.test.ts`, `src/server/services/record-locks.service.test.ts`.

### S5, S6 — later, each after owner confirmation

- **S5 sales + SUNAT**: `recordLockFor` for `pos_ticket` inside the spec 120 guard chain (`assertTicketMutable`, `pos/tender-correction.ts:26`); the "Tras SUNAT" rule becomes visible. Must first settle which "emitted" definition applies (research, spec correction 4).
- **S6 manual stock entries**: cancel of a submitted manual entry (`cancelEntryInTx`).
- Spec 135 calls `recordLockFor` from its quantity-correction rule when it is built; nothing here depends on 135.

## Risks

| Risk | Mitigation |
|---|---|
| The default drifts from today's behaviour | The month rule calls the existing function. Existing tests stay untouched. Parity test in S1. `policyExtra` is byte-identical for orgs without a policy row. |
| A lock arrives between preview and apply | Apply re-plans under the stock write gate and refuses before any write. The hash also changes, so a stale preview cannot be replayed. |
| An unused unlock stays open | Fixed 24-hour expiry; one correction consumes it in the same transaction. |
| A leaked `locks` key locks everything | The key can only lock and lift webhook locks; it cannot read data or unlock. The owner can lift any external lock and turn the rule off. Per-key rate limit. Revoking the key is immediate. |
| Staff re-correct the replacement receipt to get around an age lock | Lock date is the first receipt's date for the new rules (R4). |
| Refusal audit rows flood | The UI disables the action when locked, so refusals come only from stale pages or direct API calls. The webhook limiter does not apply here; if it becomes noise, add one row per actor/record/day (not built). |
| Month unlock in Finanzas still leaves no audit row (`pos.service.ts:3037-3039`, existing TODO) | Out of scope for S1–S4; listed as open item in research and in tasks (ledger entry). |

## FigCraft demo

Frames the orchestrator builds (as-is / to-be pairs):

1. **Entrada de stock, bloqueada** — as-is: "Corregir entrada" opens the dialog and the refusal appears only after "Revisar el cambio". To-be: lock notice with reasons ("Bloqueado: más de 60 días", "Bloqueado: exportado a contabilidad hasta el 31/10 (Contabilidad, webhook)"), action disabled, "Pide a un propietario que lo desbloquee".
2. **Entrada de stock, propietario** — to-be: same notice with "Desbloquear para una corrección"; the dialog with the required reason; the state after granting ("Desbloqueado hasta … para una corrección").
3. **Ajustes → Bloqueo de registros, reglas** — to-be: four rule rows (toggle, parameter, hint); owner view and the read-only view for an admin.
4. **Ajustes → Bloqueo de registros, bloqueos externos** — to-be: list with label, scope, key name, date, "Quitar bloqueo"; empty state with the curl example.
5. **Ajustes → Bloqueo de registros, historial** — to-be: audit list (date, action, record link, rule, actor, reason).
6. **Ajustes → Desarrolladores, nueva clave** — as-is: one scope checkbox. To-be: second checkbox "Bloqueo de registros" with its hint; the badge in the key list.
7. **Finanzas → Ajustes → Periodos contables** — to-be: one added line linking to "Bloqueo de registros" (no other change).

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Second refusal code `record_locked` beside `period_locked` | Default orgs must answer byte-identically | One code for all would change the wire answer for every org on deploy |
| New settings page | Spec and brief place the rules in organization settings | A card in Finanzas → Ajustes is smaller (no route registrations) but hides an org-wide rule in one module; kept as the fallback if the owner prefers (research R7) |
