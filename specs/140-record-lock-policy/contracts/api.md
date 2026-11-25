# Contracts: Record lock policy

Hub repository. Types are in [data-model.md](../data-model.md). Slice in brackets.

## Server functions (`src/server/services/record-locks.service.ts`)

### `recordLockFor` (S1, the contract with spec 135 and later slices)

```ts
recordLockFor(
  tx: CoreTx,
  orgId: string,
  record: LockableRecord,            // { type: 'stock_receipt', id, postedAt }
  opts?: { now?: Date },
): Promise<RecordLockResult>         // { locked, rules: LockHit[], unlock }
```

- Runs inside the caller's transaction (read-only or write). It takes no lock of its own; a writer calls it after its own gate (`lockStockWrite`).
- Returns every rule that applies, also when an unlock is active (`locked: false`, `rules` non-empty, `unlock` set).
- Throws `CorrectionError('finance settings are not configured', 'policy_unverified')` when the org has no `fin_settings` row (today's behaviour).
- Never throws for a locked record; the caller decides the refusal.
- Spec 135 calls it with the receipt it is about to change and refuses when `locked`.

### Other functions

| Function | Slice | Notes |
|---|---|---|
| `getLockPolicy(tx, orgId): Promise<LockPolicy>` | S1 | no row → `DEFAULT_LOCK_POLICY` |
| `setLockPolicy(ctx, input, actor): Promise<LockPolicy>` | S2 | owner only; writes `policy_changed` |
| `logLockEvent(ctx, event): Promise<void>` | S2 | own short transaction |
| `listLockEvents(ctx, { before?, limit }): Promise<LockEventRow[]>` | S2 | newest first, max 100 |
| `grantUnlock(ctx, { recordType, recordId, reason }, actor)` | S3 | owner only; returns `{ eventId, expiresAt }` |
| `consumeUnlockInTx(tx, ctx, { eventId, correctionId }, actor)` | S3 | called by `applyStockCorrection` |
| `applyExternalLock(ctx, key, body)` | S4 | webhook `lock` and `lift` |
| `liftLock(ctx, lockId, reason, actor)` | S4 | owner only |

Pure logic (`record-locks.logic.ts`): `evaluateRecordLock(input): LockHit[]`, `parsePolicyInput(raw)`, `parseHookBody(raw)`, `DEFAULT_LOCK_POLICY`.

### Change to the correction plan (S1)

`plan()` receipt branch (`stock-corrections.service.ts:447-471`):

```ts
const lock = await recordLockFor(tx, ctx.tenantId, { type: 'stock_receipt', id: original.id, postedAt: original.postedAt }, { now: opts.now });
if (lock.locked) {
  const monthOnly = lock.rules.every((h) => h.rule === 'month');
  throw new CorrectionError(
    monthOnly ? `period ${lock.rules[0].period} is locked` : 'record is locked',
    monthOnly ? 'period_locked' : 'record_locked',
    { locks: lock.rules },
  );
}
```

In S1 the month-only throw carries **no** detail, so the `period_locked` response stays byte-identical (`_corrections-http.ts:11` would otherwise emit it as `items`). S2 passes the detail for both codes and changes `correctionResponse` to emit it as `locks` + `unlockBy` for these two codes.

`Planned` gains `unlockEventId: string | null` (S3). `policyExtra` as described in research R3.

## Routes

### `POST /api/stock/corrections/preview`, `POST /api/stock/corrections` (S2, changed)

Refusal body for `period_locked` and `record_locked` (status 422, unchanged):

```json
{
  "error": "record is locked",
  "code": "record_locked",
  "outcome": "not_applied",
  "locks": [{ "rule": "days", "kind": "days", "unlockable": true, "days": 60 }],
  "unlockBy": "owner"
}
```

`code`, `error` and `outcome` for `period_locked` are unchanged; `locks` and `unlockBy` are added. Each refusal writes one `refused` event.

### `PUT /api/settings/record-locks/policy` (S2)

- Gate: central `settings:manage` (`API_WRITE_PREFIXES`), then owner in the service.
- Body: `{ month: boolean, days: number | null, webhook: boolean }` (unknown keys → 400). `sunat` is accepted from S5.
- 200 `{ policy }`. 400 `invalid_policy` (days not an integer 1–3650). 403 `owner_required`.
- Saving the same values writes no event.

### `POST /api/settings/record-locks/unlocks` (S3)

- Gate as above.
- Body: `{ recordType: 'stock_receipt', recordId: uuid, reason: string }` (reason 1–1000 characters after trim).
- 201 `{ eventId, expiresAt }`; 200 with the same shape when an unlock is already active.
- 400 `invalid_request`; 403 `owner_required`; 404 `not_found`; 409 `not_locked` (nothing to unlock); 409 `not_unlockable` (only the current month is locked).

### `POST /api/settings/record-locks/locks/[id]/lift` (S4)

- Gate as above. Body `{ reason }`.
- 200 `{ lifted: true }`; 200 `{ lifted: false }` when already lifted. 403 `owner_required`; 404 `not_found`.

### `POST /api/hooks/record-locks` (S4, the webhook)

- Auth: `Authorization: Bearer mk_…` with scope `locks`. No session, no cookie. Listed in `API_HANDLER_AUTH_PATHS`.
- Limit: 60 calls per minute per key.
- Body (JSON, unknown keys → 400):

```json
{ "action": "lock", "label": "Contabilidad", "upTo": "2026-10-31" }
{ "action": "lock", "label": "Auditoría", "recordType": "stock_receipt", "ids": ["<uuid>", "<uuid>"] }
{ "action": "lift", "label": "Contabilidad", "upTo": "2026-10-31" }
{ "action": "lift", "recordType": "stock_receipt", "ids": ["<uuid>"] }
```

  - `label`: 1–60 characters. `upTo`: `YYYY-MM-DD`, not in the future. `ids`: 1–200 uuids, requires `recordType`. Exactly one of `upTo`, `ids`. `recordType` is optional with `upTo` (omitted = all record types under the policy).
- 200 answers:

```json
{ "action": "lock", "created": 1, "existing": 0, "unknown": [], "locks": [{ "id": "…", "label": "Contabilidad", "upTo": "2026-10-31" }] }
{ "action": "lift", "lifted": 1 }
```

- Refusals (JSON `{ error, code, next }`):

| Status | Code | When |
|---|---|---|
| 401 | `unauthorized` | missing, malformed, unknown or revoked key |
| 403 | `scope_required` | key without `locks` |
| 400 | `invalid_request` | body shape |
| 409 | `webhook_rule_off` | the org has not enabled "Por webhook" |
| 429 | `too_many` | limiter; `retry-after: 60` |

- The same `lock` call twice answers `created: 0, existing: n` and writes no second event.

### Page loads

- `/settings/record-locks` `+page.server.ts` (S2): `requireOrgCapability(locals, 'settings', 'manage')`; returns `{ policy, isOwner, events, externalLocks (S4), hasLocksKey (S4) }`.
- `/stock/entries/[id]` `+page.server.ts` (S2): adds `lock: RecordLockResult | null` (receipts only) and `isOwner`.

## Write gates

| Route | Central gate | Service check |
|---|---|---|
| `PUT /api/settings/record-locks/policy` | `settings:manage` (new prefix in `API_WRITE_PREFIXES`, `rbac.service.ts:860`) | owner |
| `POST /api/settings/record-locks/unlocks` | same | owner |
| `POST /api/settings/record-locks/locks/[id]/lift` | same | owner |
| `POST /api/hooks/record-locks` | none (no session); handler owns auth | API key + `locks` scope |

## Refusal codes and messages

Every message names the next step.

| Code | Where | es | en |
|---|---|---|---|
| `record_locked` | correction | "Este registro está bloqueado: {motivos}. Pide a un propietario que lo desbloquee para una corrección." | "This record is locked: {reasons}. Ask an owner to unlock it for one correction." |
| `period_locked` (reworded) | correction | "Contabilidad cerró este periodo. Pide a un propietario que desbloquee este registro, o que reabran el mes en Finanzas → Ajustes." | "Accounting closed this period. Ask an owner to unlock this record, or to reopen the month in Finances → Settings." |
| `owner_required` | settings routes | "Solo un propietario puede cambiar esto. Pídeselo a un propietario de la organización." | "Only an owner can change this. Ask an owner of the organization." |
| `not_locked` | unlock | "Este registro no está bloqueado. Puedes corregirlo directamente." | "This record is not locked. You can correct it directly." |
| `not_unlockable` | unlock | "El mes actual está cerrado. Reábrelo en Finanzas → Ajustes → Periodos contables y vuelve a intentarlo." | "The current month is closed. Reopen it in Finances → Settings → Accounting periods and try again." |
| `invalid_policy` | policy | "Los días deben ser un número entre 1 y 3650. Corrige el valor y guarda de nuevo." | "Days must be a number from 1 to 3650. Fix the value and save again." |
| `webhook_rule_off` | webhook | (API, English only) `next`: "Enable 'Por webhook' in Settings → Record locks, then call again." | |
| `scope_required` | webhook | (API) `next`: "Create an API key with the 'locks' scope in Settings → Developers." | |

In S2, before the unlock exists (S3), the `record_locked` text ends "Pide a un propietario que revise la regla en Ajustes → Bloqueo de registros." S3 changes it to the text above.

## Lock reasons (notice and audit list)

| Hit kind | es | en |
|---|---|---|
| `days` | "Bloqueado: más de {days} días" | "Locked: older than {days} days" |
| `month` | "Bloqueado: el mes {period} está cerrado" | "Locked: month {period} is closed" |
| `month_current` | "El mes actual ({period}) está cerrado" | "The current month ({period}) is closed" |
| `webhook_date` | "Bloqueado: {label} hasta el {upTo} (webhook, {lockedAt})" | "Locked: {label} up to {upTo} (webhook, {lockedAt})" |
| `webhook_record` | "Bloqueado: {label} (webhook, {lockedAt})" | "Locked: {label} (webhook, {lockedAt})" |

Who can unlock: "Un propietario puede desbloquearlo para una corrección." / "An owner can unlock it for one correction."

## Other strings (keys prefixed `record_locks_`)

Page title "Bloqueo de registros"; rules "Al cerrar el mes", "Después de X días", "Por webhook" with one-line hints; read-only note "Solo un propietario puede cambiar estas reglas."; audit actions "Bloqueo", "Bloqueo quitado", "Desbloqueo", "Desbloqueo usado", "Corrección rechazada", "Reglas cambiadas"; unlock dialog "Desbloquear para una corrección", "Motivo", "Vale 24 horas y para una sola corrección."; scope "Bloqueo de registros" with hint "Permite que un sistema externo bloquee registros hasta una fecha o por id. No puede leer datos ni desbloquear."
