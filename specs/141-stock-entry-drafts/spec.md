---
id: 141-stock-entry-drafts
title: Stock entry drafts you can act on — edit, register, duplicate, delete, with where they came from
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
tags: [ui, data]
related: [124-stock-correction-workflow, 125-stock-readable-movements, 142-stock-exchange]
---

# Feature Specification: Stock entry drafts you can act on

**Feature Branch**: `feat/141-stock-entry-drafts` (hub, base `master`)

**Created**: 2026-11-20

**Status**: Draft

**Input**: Owner, 2026-11-20, about three old FACES drafts: "dont delete them. But I realized that there's little to no actions that can be taken on drafts. Please implement a full feature set for drafts (edit, submit, etc)".

## AS-IS (observed 2026-11-20, hub `origin/master` `3677e35a`, FACES prod read-only)

### What the screens offer

- **The movements list** (`/stock/entries`) shows a draft with a "Borrador" badge and no number (`human_id` is set only at submit). There are no row actions.
- **The draft page** (`/stock/entries/[id]`, `PageBody.svelte` ~180) offers one action: "Registrar" (submit).
  - If submit fails, the server's message appears as plain text, with no way to fix the cause from the page.
  - There is no Edit, Delete or Duplicate.
- **The new-entry form** (`/stock/entries/new`) can "Guardar borrador" (save a draft), but a saved draft can never be reopened in it.

### What the server already has, unused by the UI

- `PATCH /api/stock/entries/:id`: draft-only edit of header and lines (`updateEntry`, stock.service.ts ~866). It skips the currency conversion that `POST` applies (`convertEntryRates`), and writes no audit row.
- `DELETE /api/stock/entries/:id`: draft-only (`deleteEntry`, ~905). No audit row.

### The drafts FACES has today (4)

| Created | Type | Lines | Origin | Why it is stuck |
|---|---|---|---|---|
| 24/10 12:20 | issue | Dysport ×180 | appointment completion (`metadata.source = booking`) | the completion's submit failed and left the draft |
| 26/10 13:18 | issue | INIBO ×50 | appointment completion | same (INIBO stock was 0 that day) |
| 02/11 14:39 | receipt | INIBO ×110 @ 0 | typed | a receipt needs a cost > 0, so submit always fails |
| 02/11 14:46 | receipt | INIBO ×110 @ 0 | typed | same |

Registering the two appointment drafts today would deduct stock **again**: the 18/11 physical count already squared both toxins (count adjustment STE-2026-00694). Nothing on screen says so.

## TO-BE

### List

- A draft row reads **"Borrador · Recepción · 02/11 14:39"** instead of an empty number.
- **"Borradores (4)"** is a filter chip above the list.
- Each draft row has its actions where the user already is, in a row menu (right-click or the ⋯ button): **Abrir, Editar, Registrar, Duplicar, Eliminar**.
- Registered and cancelled rows offer **Abrir** and **Duplicar** only.

### Draft page

- Header actions: **Editar** · **Registrar** (primary) · ⋯ menu with **Duplicar** and **Eliminar**.
- **Origin line**: "Creado al completar la cita de <cliente> · Botox Full Face · 24/10", or "Creado por <usuario> · 02/11 14:39".
- **Stale warning** when the draft is older than 7 days, or comes from an appointment completion:
  - "Este borrador tiene 27 días. Si el stock ya se cuadró con un conteo, registrarlo volverá a descontar."
  - It stays visible, and "Registrar" asks for confirmation that repeats it.

### Registering

- A failure explains **what to fix, on which line**, and offers **"Editar"** (the owner's rule: a refusal offers the next step). Examples:
  - "Falta el costo de INIBO (línea 1)."
  - "No hay stock suficiente de Dysport: hay 1500, la salida pide 180."

### Edit

- Opens the same form as "Nueva entrada", prefilled: type, supplier, note, currency, lines.
- Two buttons: "Guardar borrador" (stays a draft) and "Registrar".
- Saving converts currency exactly like creating does.

### Duplicate

- Creates a **new draft** with the same type, supplier, note and lines, and opens it in the editor.
- The source entry is never changed.
- Duplicating a registered entry is "repeat this purchase".

### Delete

- Drafts only. A confirm dialog names the draft ("Borrador · Recepción · INIBO ×110").
- The deletion is recorded in the audit history with who and when.

### Audit and invariants

- Edit, delete and duplicate each leave an audit row.
- Only drafts can be edited or deleted; registered entries keep today's correction and cancel flows (spec 124).
- A draft never moves stock until it is registered.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| List draft row: empty number → "Borrador · <tipo> · <fecha>"; filter chip with count | list page test: label and chip count from fixture drafts |
| List row: no actions → menu by status (draft: 5 actions; other: Abrir, Duplicar) | component test: actions per status |
| Draft page: only Registrar → Editar, Registrar, Duplicar, Eliminar | mounted test: actions render for draft, not for submitted |
| Draft page: no origin → origin line from `metadata.source` / creator | unit: origin label for booking, pos, invoice, typed |
| Old or appointment-sourced draft: silent → warning + confirm before register | unit: stale rule (age > 7 d or source booking); mounted: confirm shown |
| Submit failure: raw message → line-level reason + "Editar" | server: submit errors carry `{code, line, itemId}`; mounted: message + Editar button |
| Saved draft: cannot reopen in form → `/stock/entries/[id]/edit` prefilled; PATCH converts currency | server: PATCH runs `convertEntryRates`, stores `metadata.currency`; mounted: prefill |
| No duplicate → `POST /api/stock/entries/:id/duplicate` creates a draft copy | server: copy equals source lines, new id, status draft, source unchanged |
| Delete/edit: no audit → audit row each | server: `recordAudit` called with op `delete` / `update` / `duplicate` |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fix and register a stuck draft (Priority: P1)

The two INIBO receipt drafts at cost 0 can't be registered. Staff open one, see "Falta el costo de INIBO (línea 1) · Editar", set the cost, and register it, or delete it if it was a mistake.

**Independent Test**: a draft receipt with rate 0; Registrar shows the line-level message and Editar; edit the rate; Registrar succeeds and the entry gets its number.

**Acceptance Scenarios**:

1. **Given** a draft receipt with a line at cost 0, **When** "Registrar" is pressed, **Then** the page says which line lacks a cost and offers "Editar".
2. **Given** the editor opened from that message, **When** the cost is set and "Registrar" is pressed, **Then** the entry is registered with a number and stock moves.
3. **Given** a draft, **When** "Eliminar" is confirmed, **Then** it disappears from the list and the audit history shows who deleted it.

### User Story 2 — Don't double-deduct with an old appointment draft (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a draft created by an appointment completion 27 days ago, **When** it is opened, **Then** the origin (client, service, date) and the stale warning are shown.
2. **Given** that draft, **When** "Registrar" is pressed, **Then** a confirmation repeats the warning before anything moves.

### User Story 3 — Prepare now, register later (Priority: P2)

Staff prepare an entry (for example a trade with a supplier that has not happened yet, spec 142), save it as a draft, and register it the day it happens.

**Acceptance Scenarios**:

1. **Given** a saved draft, **When** "Editar" is chosen from the list menu, **Then** the form opens prefilled and "Guardar borrador" keeps it a draft.
2. **Given** a registered purchase, **When** "Duplicar" is chosen, **Then** a new draft with the same lines opens in the editor.

### Edge Cases

- Two people edit the same draft: the second save is refused with "Este borrador cambió; vuelve a abrirlo". The draft's `updated_at` is checked.
- A draft registered from another tab while the editor is open: saving is refused with "ya se registró" and a link to the entry.
- A draft whose item was archived: the editor shows the line flagged, and registering explains it.
- The editor's currency differs from the draft's stored currency: the stored one wins; switching re-converts like the new form does today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The list MUST label drafts by status, type and creation time, offer a draft filter with a count, and offer row actions by status.
- **FR-002**: A draft MUST be editable in the same form used to create entries, prefilled, with "Guardar borrador" and "Registrar".
- **FR-003**: Any entry MUST be duplicable into a new draft without changing the source.
- **FR-004**: A draft MUST be deletable after a confirmation that names it.
- **FR-005**: A draft page MUST show where the draft came from (appointment, sale, invoice, or person) and when.
- **FR-006**: A draft older than 7 days, or created by an appointment completion, MUST show a warning, and registering it MUST ask for confirmation.
- **FR-007**: A failed registration MUST name the line and reason, and offer "Editar".
- **FR-008**: Edit, delete and duplicate MUST each leave an audit row (who, when, what).
- **FR-009**: Only drafts MAY be edited or deleted. Concurrent edits MUST NOT silently overwrite each other.
- **FR-010**: Every new text MUST be translated (es, en) and follow the design-token contract.

### Key Entities

- **Stock entry**: type, status (draft, submitted, cancelled), number (set at registration), supplier, note, currency, lines, origin (`metadata.source` + `sourceId`), created by and at.
- **Draft origin**: appointment completion, sale, invoice, or typed by a person.

## Success Criteria *(mandatory)*

- **SC-001**: FACES' 4 current drafts can each be fixed and registered, or deleted, from the UI without help.
- **SC-002**: Every failed registration tells the user what to change in one message, with the button to change it.
- **SC-003**: Old appointment drafts can't be registered without the user acknowledging the double-deduction risk.
- **SC-004**: Registered entries behave exactly as today.

## Assumptions

- 7 days is the stale threshold, the same order as the till's period lock. The owner may change it.
- Bulk actions (select several drafts) are out of scope; one-by-one covers today's volume (4 drafts).
- Duplicate copies lines and costs as they are; it never re-reads current costs.

## FigCraft demo

[stock-entry-drafts.figcraft](stock-entry-drafts.figcraft), page "Spec 141 · demo", 8 frames:

1. Movements list (as-is / to-be with the draft labels, the "Borradores · 4" chip and the row menu).
2. Draft page (as-is / to-be with Editar, Registrar, ⋯, the origin and the line-level failure with "Editar").
3. Appointment draft with the 27-day warning, and its register confirmation (to-be).
4. Editor opened on the draft (to-be).
5. Delete confirmation (to-be).

The master frames "Stock / stock/entries…" are kept on their page as context. Mock data is fictitious ("Ana Torres", "Recepción").
