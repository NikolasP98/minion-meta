---
id: 2026-11-11-hub-door-dni-trust
title: A DNI typed into a public door can become a trusted party document after a reconcile
status: draft
created: 2026-11-11
updated: 2026-11-11
repos: [minion_hub]
effort: S
source: hub PR 655 (feat/doors-form-no-field-cap) security review
---

# A DNI typed into a public door can become a trusted party document after a reconcile

## AS-IS

Hub PR 655 lets form doors match an existing CRM contact by DNI. A trusted DNI matches on its
own: the linked party's `doc_number`, or `custom_fields.dni` on a contact whose `source` does not
start with `door:`. A DNI typed into an earlier door submission matches only when the name also
agrees. A DNI is written only onto a contact that the submission itself created
(`source = door:<slug>`); a matched contact only receives social handles it lacks.

`reconcileParties` (`src/server/services/party.service.ts`) mints and links parties from
`crm_contacts.custom_fields->>'dni'` and does not check `source`. Suppose a reconcile runs after
a visitor submitted someone else's DNI with their own phone, and the real DNI holder had no
party yet. The reconcile creates a party with that `doc_number` and links it to the visitor's
contact. From then on, the real person's door submissions match the visitor's contact.

The site is marked `TODO(handoff)` in `contactIdByDni`
(`src/server/services/doors-form.service.ts`). Nothing is disclosed to the visitor, since
doors never read data back. The effect is a mis-attributed contact that staff would have to
untangle.

## TO-BE

A DNI that comes only from a public door never becomes a party `doc_number`, and never becomes
a match key, until staff or a registry check confirms it.

## DELTA

- `reconcileParties` skips `custom_fields.dni` on contacts with `source like 'door:%'`, unless
  the party is `dni_verified` or staff have edited the field. Alternative: doors store the
  DNI under a separate key, such as `dni_declared`, which a staff action promotes.
- Test: a door-created contact with a DNI is not minted into a party by a reconcile.

## Out of scope

Phone-based matching. Its weakness is the same, already exists in `ensureCrmContact` for
bookings, and is not changed here.
