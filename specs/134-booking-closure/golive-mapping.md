# Go-live status mapping — FACES (prod read-only, 2026-11-20 ~17:30 Lima)

Owner ask, 2026-11-20: "before going live with the statuses, lets please map the before/after statuses using the faces org data to make sure nothing breaks on prod."

FACES is the only organization with appointments (604). Query: `~/.cache/claude-tmp/receipt-fix/status-map.sql` (session-local). Payment state is derived from sale lines linked to the appointment (`pos_ticket_lines.booking_id`); the payments of a linked ticket cover its total. A package-funded appointment counts as paid.

## 1. Status before → after

| Today (stored) | Count | After go-live (stored) | Changes the value? |
|---|---|---|---|
| `completed` | 322 | Completada (`completed`) | no |
| `accepted`, day already passed | 65 | Por cerrar (`to_close`), set by the first midnight run | yes |
| `pending`, day already passed | 37 | Por cerrar (`to_close`), set by the first midnight run | yes |
| `accepted`, today or later | 54 | Confirmada (`accepted`) | no |
| `pending`, today or later | 31 | Agendada (`pending`) | no |
| `no_show` | 71 | No vino (anterior) (`no_show`, read-only) | no |
| `cancelled` | 38 | Anulada (`cancelled`) | no |
| `rejected` | 0 | — | — |

- Every current value maps. There are no unknown values, so the DB trigger's allowed-key list accepts all existing rows.
- No row needs a migration. The only changes are the 102 past-open appointments, and they go through the same gate as any later change (clock actor, one log row each).
- No confirmation reminder was ever sent (`sched_reminders` = 0 rows), so no appointment starts as Por confirmar.
- The status log has 0 transitions out of a closed status, so the "nothing leaves Cerrada" rule matches history. Today's gate (`setBookingStatusInTx`, spec 116) already refuses them.
- The 2 appointments "unscheduled" on 2026-10-11 were stored as `cancelled` (their sale lines went back to the tray). They stay Anulada; turning them into Desagendada would show the same service twice.

## 2. Payment state at go-live

| Status after go-live | Total | Pagado | Sin cobro, catalog price 0 | Sin cobro, priced service |
|---|---|---|---|---|
| Completada | 322 | 142 | 81 | 99 |
| Por cerrar | 102 | 27 | 15 | **60** |
| No vino (anterior) | 71 | 5 | 26 | 40 |
| Confirmada | 54 | 3 | 15 | 36 |
| Anulada | 38 | 0 | 13 | 25 |
| Agendada | 31 | 7 | 22 | 2 |

- No partial payment (Adelanto) or unpaid charge (Por cobrar) exists: every linked ticket is fully paid.
- Catalog price 0 = controls (113 since the till started on 2026-10-09).

## 3. What would break with "no Completada until payments are settled"

- **60 of the 102 Por cerrar appointments** are priced services with no linked sale. Under a strict rule, reception could not complete them on day one.
- The weekly flow since the till started, for completed appointments:

  | Week of | With a linked sale | No sale: control | No sale: treatment |
  |---|---|---|---|
  | 10-05 | 8 | 13 | 15 |
  | 10-12 | 17 | 8 | 18 |
  | 10-19 | 27 | 14 | 15 |
  | 10-26 | 3 | 7 | 2 |
  | 11-02 | 36 | 7 | 8 |
  | 11-09 | 31 | 6 | 10 |
  | 11-16 | 20 | 13 | 8 |

- November's 26 completed treatments without a sale:
  - mostly "Afinamiento Facial (individual)" sessions;
  - 16 of them belong to clients with **no sale at all** in the till;
  - none had a sale for the client that day, on the same visit or otherwise.
  - They look like series prepaid before the till existed, or paid outside it.

## 4. Proposed go-live rules (owner to confirm)

1. **Catalog price 0 counts as settled** when there is no sale (controls). This removes 81 + 15 + … from the problem without any data change.
2. **The strict rule applies to appointments created on or after go-live.**
   - Older ones (the 60 Por cerrar and any old session completed later) can be completed with a warning and a required reason: "Pagado antes del sistema" or "Pagado fuera del sistema" (audited).
   - Alternatively, staff link them to a package grant.
3. **Day one:**
   - the daily inbox shows "102 citas por cerrar";
   - the 142 open "Cita sin cerrar" notifications are resolved;
   - the Pendientes tray lists the 102 with their payment chips.
4. **Re-run this mapping** on release day, with the release build's gate in preview mode. The counts above move with time; the categories must not grow a new one.

## 5. Not affected

- Stock: no status change at go-live moves stock. Por cerrar keeps reservations, and completions follow specs 120 and 135.
- Package sessions: no status change at go-live hands one back.
