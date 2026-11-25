# Research: Record lock policy

Hub read at `origin/master` `484c6a03` (2026-11-23). Paths are in the hub repository unless they start with `specs/`.

## R1 — What locks a purchase correction today

A purchase correction is the spec 124 `receipt_replace` request: cancel the receipt and post a replacement with the corrected quantity or rate. Its plan runs in `plan()` (`src/server/services/stock-corrections.service.ts:365-471`), which both the preview (`:600`) and the apply (`:701`) call. In order, it refuses:

| Check | Line | Code |
|---|---|---|
| Not a standalone receipt (`metadata.source`, `invoiceId` or `sourceId` set) | `:377-378` | `source_ambiguous` |
| Receipt not `submitted` | `:379-380` | `dependent_history` |
| Already corrected once | `:395` | `dependent_history` |
| Any later ledger row on one of its bins | `:433-445` | `dependent_history` |
| No finance settings row | `stock-corrections.logic.ts:255-256` | `policy_unverified` |
| The receipt's month or the current month is in `pos_period_locks` | `stock-corrections.logic.ts:257-262` | `period_locked` |

Authority: applying needs `stock:manage` and cost access; a rate change needs the owner (`:172`, preview blocker `owner_required` at `:633`).

Only the last two rows are a lock policy. The others are structural limits of spec 124 and stay as they are.

- **Decision**: `recordLockFor` replaces exactly the block `:447-460` (the two reads and the `evaluateReceiptPeriod` call). Nothing else in the plan moves.
- **Alternative rejected**: a guard in the route. The plan is the one place preview and apply share, and apply calls it under the stock write gate with the receipt row locked `for update` (`:366-370`).

## R2 — Tables

- **Decision**: three tables, all with `org_id` and RLS like `org_api_keys` (`supabase/migrations/20261116100000_org_api_keys.sql`).
  1. `org_lock_policy`: one row per org. No row means the default (month only), so no backfill and no way for a new org to start with anything else (FR-006).
  2. `org_record_locks`: external locks. One row per "up to date" statement or per record id. Lifted, never deleted.
  3. `org_lock_events`: append-only audit. Unlock grants and their use are events too (`unlock`, `unlock_used` with `ref_event_id`), so there is no fourth table and no row that needs an update to be consumed.
- **Why not `doc_audit_log`**: its `ref_id` is a non-null uuid (`src/server/db/pg-activity-schema.ts:46`), and the existing code already notes that a period unlock cannot be logged there (`src/server/services/pos.service.ts:3037-3039`). A policy change and an "up to date" lock have no record id. The actor can also be an API key, which `doc_audit_log` has no column for.
- **Alternatives rejected**:
  - Policy as JSON in an existing settings table (`fin_settings`). The policy is not a finance setting, and typed columns give the database the checks (days range).
  - A separate `org_record_unlocks` table with `consumed_at`. It needs an UPDATE grant and a second place to audit. The correction path is already serialized per org by the stock write gate (`stock.service.ts:724`), so "unlock event without a `unlock_used` event" is race-free.

## R3 — The default must equal today's behaviour

- **Decision**: the month rule is not reimplemented. `evaluateRecordLock` calls `evaluateReceiptPeriod` (`stock-corrections.logic.ts:249`) with the same four inputs and turns its `period_locked` throw into hits; `policy_unverified` propagates unchanged.
- **Wire parity**: when every hit is a month hit, the service throws `CorrectionError(…, 'period_locked')` with the same message text as today. Any other hit throws the new code `record_locked` (422, same status).
- **Hash parity**: the preview hash includes `policyExtra` (`:471`, `:586`). For an org without a policy row, `policyExtra` stays `{ receiptPeriodPolicy, locks }` byte for byte. With a row it also carries `lockPolicy` (the rules, the external lock ids that matter and any unlock event id). So a preview opened before the deploy still applies after it.
- **Proof**:
  1. `stock-corrections.logic.test.ts` and the receipt cases of `stock-corrections.sql.integration.test.ts` pass with no edit.
  2. New table-driven test in `record-locks.logic.test.ts`: for the default policy, `evaluateRecordLock` and `evaluateReceiptPeriod` agree on allow/refuse and on the code over: original month locked, current month locked, both, neither, no finance settings, a receipt posted at a month boundary in `America/Lima`.
  3. New service test: with no `org_lock_policy` row, `recordLockFor` issues no query against `org_record_locks`' enforcement path that could change the answer (external locks are ignored unless the webhook rule is on).

## R4 — Which date a record has, and replacements

- A receipt's date is `stk_entries.posted_at` (it may be backdated at posting: `stock.service.ts:1120`, `:1194`).
- A correction cancels the receipt and posts a **new** receipt at "now" (`stock-corrections.service.ts:762-806`; `postedAt: options.postedAt ?? new Date()` at `stock.service.ts:1194`). Without care, the replacement of a 70-day-old purchase would look 0 days old and could be corrected again by any stock manager, and a webhook lock "up to 31/10" would not cover it.
- **Decision**: for the `days` and `webhook` rules the record's date is the **first** receipt's `posted_at`. `recordLockFor` follows `stk_corrections` (`replacement_entry_id` → `source_entry_id`, kind `receipt_replace`) with one recursive query, capped at 20 steps, and also collects the chain's ids so a webhook lock by id on the first receipt covers its replacements.
- **The month rule keeps the receipt's own `posted_at`**, because that is what `receipt_period_v1` does today and the default must not change. This leaves one existing gap, written down here and as an owner question: a receipt from September corrected in October has a replacement dated October; if September is closed afterwards, the replacement can still be corrected. Closing the gap is one line (pass the first receipt's date to the month rule) and is deliberately not done in S1.
- **Age**: whole calendar days in the org's finance timezone: `dateKey(now) − dateKey(firstPostedAt) > X` (`instantDateKey`, `src/lib/time/zoned.ts:115`). No finance settings row → `policy_unverified`, as today.

## R5 — Owner unlock

- **Who**: membership role `owner`, read in the transaction through `resolveFreshOperatorCapabilitiesForWriteInTransaction` (`rbac.service.ts:1204`), the same read spec 124 uses for `owner_required` (`stock-corrections.service.ts:172`). The central gate (`settings:manage`) lets admins reach the service, which then answers `owner_required` with the next step. Role simulation does not change `membershipRole`.
- **What it unlocks**: one record (and its replacement chain) for one correction. It covers the `days`, `webhook`, `sunat` and record-month hits.
- **What it does not unlock**: a locked **current** month. The replacement receipt would post into a closed month; that is a property of the month, not of the record. The refusal says to reopen the month in Finanzas → Ajustes → Periodos contables. Hit kind `month_current`, `unlockable: false`.
- **Who may use it**: anyone who may apply the correction (`stock:manage` + cost access; rate changes stay owner-only). User story 3 has the owner doing both steps; the looser rule also covers "owner unlocks, assistant fixes the typo" without a second mechanism.
- **Expiry**: fixed 24 hours. Not configurable (nobody asked). An unused unlock simply lapses; the lapse needs no event because the grant row carries `expires_at`.
- **Consumption**: `unlock_used` is inserted in the apply transaction after the `stk_corrections` row (`:806-831`). A failed or replayed correction (`replayed: true`, `:689-707`) writes nothing.
- **Alternative rejected**: "unlock" = the owner switches the rule off for a moment. It unlocks every record and leaves no per-record trace.

## R6 — Webhook

- **Auth**: same as the MCP endpoint (`src/server/mcp/caller.ts:64-74`): `Authorization: Bearer mk_…`, `verifyKey` (`org-api-keys.service.ts:125`), scope check, per-key rate limit, `touchKey`. The org comes from the key and never from the body.
- **Scope**: `API_KEY_SCOPES` (`src/lib/types/api-keys.ts:17`) gains `locks`. The database check `org_api_keys_scopes_known` lists scopes literally (`supabase/migrations/20261120100000_api_key_scopes_sandbox_writer.sql:8-9`), so it needs a migration; without it, creating a `locks` key fails with a constraint error.
- **One endpoint**, `POST /api/hooks/record-locks`, with `action: 'lock' | 'lift'`. It must be listed in `API_HANDLER_AUTH_PATHS` (`src/hooks.server.ts:502-535`) or the hook answers 401 before the handler runs (no session, no tenant).
- **Idempotent without a client key**:
  - `lock` + `upTo`: an active row with the same label, record type and date → answered again with `created: false`. A later date adds a row; the effective lock is the latest active date.
  - `lock` + `ids`: one row per id; ids already actively locked are skipped. Unique partial indexes back both.
  - `lift`: marks matching active webhook rows lifted; nothing to lift → 200 with `lifted: 0`.
- **Record ids** are hub uuids of stock entries (the id in `/stock/entries/<id>`). Ids of another org or unknown ids are answered as `unknown` in the result and not stored. Looking records up by document number is not built.
- **`upTo`** is a calendar date, inclusive, in the org's finance timezone.
- **Rule off**: when "Por webhook" is disabled, the call is refused with 409 `webhook_rule_off` and the next step. Storing locks that silently do nothing would mislead the accounting tool.
- **Bypass inventory**: the caller builds its context from `getCoreDb()` like the MCP caller, so `src/server/db/rls-bypass-inventory.json` must be regenerated (`bun scripts/rls-bypass-inventory.ts`).

## R7 — Where the settings live

- **Decision**: a new page `/settings/record-locks` in the Settings nav (`src/lib/components/settings/SettingsNav.svelte:109-135`), view gate `org-capability:settings:manage` like `/settings/developers` (`src/lib/routes/route-access-registry.ts:144`). The spec and the brief both say organization settings, and the policy will cover sales and stock, not only finance.
- **Cost**: the registrations hub commit `4ea8b4e9` needed for `/settings/developers`: `SettingsNav.svelte`, `route-access-registry.ts`, `route-design-manifest.ts:406`, `route-design-validation.ts:45-47` (counts), `route-design-contracts.test.ts`, `site-map.ts`, `scripts/ui-audit-inventory.test.ts`.
- **Fallback** (if the owner prefers): a card in Finanzas → Ajustes under "Periodos contables" (`src/routes/(app)/finances/settings/PageBody.svelte:792`). No registrations, but a finance-only location. Either way that card gets one line linking to the new page, because the month rule's data stays there.

## R8 — Refused corrections in the audit

- The preview runs in a read-only snapshot (`:590`) and the apply rolls back on refusal, so the `refused` event cannot be written in the same transaction.
- **Decision**: the two routes catch a `CorrectionError` with code `period_locked` or `record_locked` and call `logLockEvent` in its own short transaction, then return the refusal. If the log write fails, the refusal is still returned and the error is logged server-side.
- Not deduplicated. The UI disables the action on a locked record (S2), so a refusal means a stale page or a direct API call.

## Spec corrections

1. **The month lock applies to every purchase correction, not only value-changing ones.** spec.md AS-IS says spec 124 "refuses value-changing purchase corrections when the original or current month is locked, and requires the owner". In the code the period check runs for quantity and rate changes alike (`stock-corrections.service.ts:455`, no `valueChange` condition). `owner_required` is separate and applies to rate changes only (`:172`, `:633`). The plan keeps both as they are.
2. **Purchases linked to an invoice or another document cannot be corrected at all** (`source_ambiguous`, `:377-378`), and a purchase with any later movement on its item cannot either (`dependent_history`, `:433-445`). So in slice 1 the policy matters only for standalone receipts whose items have not moved since. User story 2 ("one from 20 days ago can") holds only inside that limit until spec 135 relaxes it. The lock notice must not promise that an unlocked record is correctable.
3. **"Tras SUNAT" has nothing to evaluate for purchases.** The hub emits SUNAT documents for sales only (`pos_emissions.ticket_id`, `src/server/db/pg-pos-schema.ts:229-234`), and there is no SUNAT period state other than `pos_period_locks`. For a receipt the rule would equal "Al cerrar el mes". The plan stores the flag from S1 but shows and enforces the rule with the sales slice (S5). FR-001 is therefore met in two steps.
4. **"Emitted" has two definitions on master.** The fiscal-edit path excludes beta emissions (`src/server/services/pos.service.ts:1477`); the tender-change path does not (`:2944`). The spec's assumption ("accepted, non-beta") matches neither exactly: both count `pending` and `rejected` rows as emitted (only `error` is excluded). S5 must pick one before it reuses it.
5. **`owner_required` is at `:172` in the authority function and `:633` in the preview**, in `stock-corrections.service.ts`; `assertTicketMutable` is at `src/server/services/pos/tender-correction.ts:26` and `pos_period_locks` at `src/server/db/pg-pos-schema.ts:455`, as the spec says. The spec's AS-IS commit (`63c4313b`) is older than the master read here; these anchors did not move.
6. **A month unlock is not audited today.** Unlocking a month deletes the row and writes nothing (`pos.service.ts:3037-3052`, existing `TODO(handoff)`). The spec's invariant "a locked record never changes without an owner unlock that is logged" is therefore not fully true for the month rule: anyone with `finance:manage` can reopen a month silently. Not fixed in S1–S4 (it changes who may reopen a month); S2 can log month lock/unlock into `org_lock_events` with a small change to `setPeriodLock` if the owner wants it (owner question 3).

## Open items (ledger)

- R4 gap: month rule on replacements (owner question 2).
- Spec correction 6: month reopen is unaudited and not owner-only.
- Webhook ids are hub uuids only.
- S5 and S6 need owner confirmation before they are specified in detail.

## Owner questions

1. "Tras SUNAT" does nothing for purchases. OK to ship it with the sales slice (S5) and show only three rules until then?
2. Should a closed month also lock the replacement of a purchase from that month (the R4 gap)? It is one line, but it changes today's behaviour for that case.
3. Should reopening a month in Finanzas be written to the same audit list (and stay with `finance:manage`), or become owner-only like the other unlocks?
