# Quickstart: validating the record lock policy

Run from a clean hub clone on the slice branch. One gate at a time, in the foreground. Never the full suite (`bun run test`).

## Prerequisites

```bash
bun install --frozen-lockfile
bunx svelte-kit sync
bun run i18n:compile
bun run dev:local        # seeded local Supabase + dev server on http://localhost:5199
```

Personas are printed by `dev:local` (`.env.qa.local`). You need the owner, an admin and a member with `stock:manage`. No production access for any step below.

Gates for every slice, after the focused tests:

```bash
bun run check
bun run lint:design && bun run lint:tokens      # S2–S4 (UI); must not regress
```

## S1 — foundation and parity

```bash
bun x vitest run src/server/services/record-locks.logic.test.ts \
  src/server/services/record-locks.service.test.ts \
  src/server/services/stock-corrections.logic.test.ts
```

Native Postgres lane (needs the local stack), one file:

```bash
bun x vitest run src/server/services/stock-corrections.sql.integration.test.ts
```

Expected:

- `stock-corrections.logic.test.ts` has **no diff** on the branch (`git diff origin/master -- src/server/services/stock-corrections.logic.test.ts` is empty) and passes.
- The parity table in `record-locks.logic.test.ts` passes.
- `bun run qa:reset` applies the new migration and the seed.

Manual check (`dev:local`, stock manager):

1. Open a standalone submitted receipt whose items have no later movement. "Corregir entrada" → change a quantity → "Revisar el cambio" works as before.
2. Finanzas → Ajustes → Periodos contables: lock the receipt's month. Repeat step 1: the refusal is the same text as on master ("Contabilidad cerró este periodo…"). Unlock the month again.

## S2 — settings, lock notice, audit

```bash
bun x vitest run src/routes/api/settings/record-locks/server.test.ts \
  src/routes/api/stock/corrections/server.test.ts \
  src/server/services/record-locks.service.test.ts \
  "src/routes/(app)/settings/record-locks/page.mounted.test.ts" \
  "src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts" \
  src/lib/routes/route-design-contracts.test.ts \
  src/server/services/rbac.service.test.ts \
  scripts/ui-audit-inventory.test.ts
```

Manual check:

1. Owner: Ajustes → Bloqueo de registros. Turn on "Después de X días", set 1, save. The audit list shows "Reglas cambiadas".
2. Admin: same page. The rules are read-only with the note; a direct `PUT /api/settings/record-locks/policy` answers 403 `owner_required`.
3. Stock manager: open a receipt older than one day. The lock notice shows "Bloqueado: más de 1 días" and who can unlock; "Corregir entrada" is disabled.
4. Open a receipt from today: no notice; the correction works.
5. With a stale page (open the dialog, then enable the rule in another tab), "Revisar el cambio" is refused with the rule named. The audit list shows "Corrección rechazada" with the actor.
6. Owner: turn the days rule off. The receipt from step 3 is correctable again (if nothing else blocks it).

## S3 — owner unlock

```bash
bun x vitest run src/server/services/record-locks.service.test.ts \
  src/routes/api/settings/record-locks/server.test.ts \
  "src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts"
bun x vitest run src/server/services/stock-corrections.sql.integration.test.ts
```

Manual check (days rule on, 1 day):

1. Admin opens the locked receipt: no unlock button.
2. Owner opens it: "Desbloquear para una corrección" → reason required → confirm. The notice reads "Desbloqueado … hasta …".
3. Stock manager corrects the quantity. It applies.
4. The replacement receipt shows the lock notice again (it inherits the first receipt's date). A second correction is refused.
5. Audit list: "Desbloqueo" (owner, reason) and "Desbloqueo usado" (the corrector), in that order.

## S4 — webhook

```bash
bun x vitest run src/server/locks/caller.test.ts \
  src/routes/api/hooks/record-locks/server.test.ts \
  src/routes/api/settings/api-keys/server.test.ts \
  src/server/services/org-api-keys.service.test.ts \
  src/server/services/record-locks.service.test.ts
bun scripts/rls-bypass-inventory.ts --check
```

Manual check:

1. Owner: Ajustes → Desarrolladores → new key with "Bloqueo de registros". Copy the key.
2. Call before enabling the rule:

   ```bash
   curl -s -X POST http://localhost:5199/api/hooks/record-locks \
     -H "authorization: Bearer $KEY" -H 'content-type: application/json' \
     --data '{"action":"lock","label":"Contabilidad","upTo":"2026-10-31"}'
   ```

   Expected: 409 `webhook_rule_off` with the next step.
3. Owner enables "Por webhook". Repeat the call: 200 `created: 1`. Repeat again: `created: 0, existing: 1`.
4. A key without the scope: 403 `scope_required`. No key: 401.
5. Stock manager opens a receipt posted on or before 31/10: "Bloqueado: Contabilidad hasta el 31/10 (webhook, …)".
6. Owner: Bloqueo de registros → Bloqueos externos → "Quitar bloqueo" with a reason. The receipt is no longer locked by that rule. Audit list shows "Bloqueo" (key name) and "Bloqueo quitado" (owner).

## Post-merge verification (prod, read-only, owner present)

- After S1: the owner opens one recent standalone receipt in FACES and previews a correction without confirming it. Behaviour is unchanged.
- After S2–S4: Ajustes → Bloqueo de registros loads; FACES shows "Al cerrar el mes" on and nothing else. No rule is changed during verification.
