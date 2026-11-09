# Phase 1 contracts — POS mutation endpoints

Shared refusal order for **every** mutator (one implementation, one test per mutator):

```
not found (404) → already void (409) → period locked (423) → already reconciled (409)
→ issued ∧ the field is fiscal (409) → shift closed (take the correction-pair path) → allowed
```

`423` body message is the verbatim string `Periodo cerrado por contabilidad` and is shown as
given. A permission failure is `403` and must say the role cannot do this — never a generic
failure.

---

## 1. Correct a sale's tender

`PATCH /api/pos/tickets/{ticketId}/payments/{paymentId}`

Body: `{ method: <payment method>, reason: string }`

Permission: `pos:edit` while the sale's shift is open; `pos:manage` once it is closed.
`reason` may be a preset while open; it is required and free-typed once closed.

| Result | Status | Code |
|---|---|---|
| Corrected in place (open shift) | 200 | — |
| Correction pair posted to the current open shift (closed shift) | 200 | — |
| No open shift to post the pair to | 409 | `no_open_shift` ("Abre la caja para registrar la corrección") |
| Same method as now | 409 | `same_method` |
| Target row is a refund or a correction row | 409 | `not_correctable` |
| Unknown method | 400 | `invalid_method` |
| Closed shift, caller lacks `pos:manage` | 403 | `manage_required` |
| Sale is in a locked month | 423 | `period_locked` |
| Sale is issued and the field is fiscal | 409 | `emitted` |

Effects: the payment write, one `doc_audit_log` row, nothing else. Amount never changes.

---

## 2. Issue one sale's receipt now

`POST /api/pos/tickets/{ticketId}/emit` — permission `pos:edit`

| Result | Status | Code |
|---|---|---|
| Submission record created | 200 | — |
| Sale is void | 409 | `already_void` |
| Already issued (non-error reading) | 409 | `already_emitted` |
| Tendered with a method that is never declared | 409 | `method_not_emitted` |
| Issuing switched off | 409 | `emission_off` |
| Locked month | 423 | `period_locked` |

Once issued, the sale takes the closed-shift edit rules even while its shift is open (FR-012).

---

## 3. Retry a shift's failed submissions

`POST /api/pos/shifts/{shiftId}/emit` — permission `pos:manage`

Selects exactly what a close selects: live sales of that shift with no submission record or
only failed ones. Never re-sends an accepted, pending or rejected document (**INV-5**). Sales in
a locked month are skipped, not failed. Returns the queued count.

---

## 4. Lock / unlock an accounting month

`PUT /api/finances/period-locks` — permission `finance:manage`

Body: `{ period: "YYYY-MM", locked: boolean, note?: string }`

| Result | Status | Code |
|---|---|---|
| Locked / unlocked | 200 | — |
| `period` is not a calendar month | 400 | `invalid_period` |
| Caller lacks `finance:manage` | 403 | `forbidden` |

`GET /api/finances/period-locks` lists the locked months with who locked each one and when.

---

## Implied by the close (not an endpoint of its own)

Closing a shift returns, in addition to today's payload, the number of receipts it queued, so
the close dialog can state it before the user confirms and report it after.
