# Quickstart — exercising POS shift-scoped edits

Local hub: `bun install && bun run dev` from `minion_hub/` (bun only — never npm/pnpm there).
Seeded QA org; sign in with the owner persona (the first `qa-login` persona has an empty org —
use `tenancy.user.owner`).

## S1 — tender correction

1. Open a shift at `/pos/sell`, sell something with cash.
2. From the recent-sales list, open the sale. Its Pago block shows the tender and a "Cambiar"
   action. Change cash → card with the preset reason. Expect: same total, new method everywhere,
   the shift's expected-cash figure down by that amount, one audit entry.
3. Close the shift. Open the same sale again, correct the method with a typed reason. Expect:
   a pair on today's (new) shift netting to zero, the closed shift's counted figure unchanged,
   `/pos/history` reading the sale as the corrected method.
4. With no shift open, repeat step 3. Expect the refusal telling you to open the till.

## S2 — issuing on close

1. With issuing enabled in POS settings (shadow environment), sell 3 sales, one of them paid
   with a non-declared method.
2. Open the close dialog: it states how many receipts will be issued (2, not 3).
3. Close. Expect one submission record per eligible sale and the shift row showing the counts.
4. Force a failure (unreachable gateway): the close still succeeds, the row shows 1 failed, and
   "Reintentar" re-sends only that one — twice in a row produces no duplicate.
5. Switch issuing off and close another shift: nothing is submitted, and nothing is read.

## S3 — period locks

1. As a `finance:manage` user, lock last month from `/finances/settings` with a note. The list
   shows who and when; `/pos/history` shows the lock on that month's shift rows.
2. Attempt, on a sale in that month: a tender correction, a void, "Emitir ahora". Expect 423
   with `Periodo cerrado por contabilidad`, verbatim, and no write.
3. Unlock. Repeat: all three succeed.
4. Timezone check: a sale timestamped at 22:00 Lima on the last day of the locked month is
   refused (it belongs to the locked month, not the next one).

## Gates before each PR (foreground, never backgrounded)

`bun run check` · the slice's vitest folders + the frozen export inventory + the route contract
+ rbac · `bun run lint:design:ci` (debt may only decrease) · `bun run lint:tokens` ·
`bunx prettier --check` on every changed file (the CI gate is per changed file) ·
`bunx svelte-kit sync` and `i18n:compile` first in a fresh worktree.

## Prod proof (owner runs it — production money rows)

S1: one real mis-tendered sale corrected in the open shift and one in a closed shift, audit row
present, the closed shift's snapshot unchanged. S2: the first real close after deploy. S3: lock
a past month, confirm 423 on a tender change and a void, unlock. Dry-run first; the undo goes
in a `finally`.
