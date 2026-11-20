# Data model: Discoverable persistent CRM profile classification and Instagram recording

Existing manual CRM tag and contact-tag link persist classification; event-scope tag links and lifecycleOverride are independent entities. Existing contact.customFields holds arbitrary nonreserved Additional values and reserved server metadata; customProperties is a separate property bundle. Existing crm_contact_identities has channel, externalId and handle; manually recording Instagram MUST NOT create an identity. The execution record selects exactly one existing field/property path and records conflict resolution privately. Existing layout key dash:layout:crm-contact-detail-v2 is scoped through preferenceOwner/preferenceKey and stores version 1 locally; the server default is not the personal persisted layout. No new schema, tag taxonomy, lifecycle stage or synchronization state.

## Validation and lifecycle

All existing validation, enum and permission rules remain binding. No source record is manufactured from display text. Apply read-only projection tests and the no-op/stop outcomes before any write. Forbidden states are in [contracts/behavior.md](contracts/behavior.md); real-database proof is in [quickstart.md](quickstart.md). A proposed shape is not a claim of existing persisted schema.

## Field sets and write policy

The key sets (manual Instagram keys, masked keys, reserved keys) are defined in [contracts/behavior.md](contracts/behavior.md#terms). The manual Instagram key stored is an existing matching key's spelling, or `instagram_handle`; any other Instagram-like key stops for owner selection and is never migrated automatically.

Restricted principals carry a server-derived `{ canWriteSensitiveFields: false }` on `updateContact`, `createContact`, `ensureContactFacetForParty` and `mergeContacts`; no request field supplies it. Effects:

- `updateContact`: stored masked and reserved keys survive atomically in both SQL forms; submitted masked keys and `phone` are ignored.
- `createContact`, `ensureContactFacetForParty`: manual Instagram keys are removed before insert.
- `mergeContacts`: refuses when any locked participant stores a manual Instagram key; otherwise masked override keys are removed.

Authorized whole-namespace omission deletes a key; authorized partial null stores null. No masked projection is authoritative state. The loader's `crm.canEditSensitiveFields` boolean is a display hint, not persisted permission. Audit entries record the filtered input, not discarded values. Gateway success/stale serialization runs the PII sanitizer under the delegated principal's field level.

## Contact admission

Tag apply/remove and merge lock their contact IDs with one same-org, non-deleted `FOR UPDATE` query and require the returned ID set to equal the requested set; malformed, missing, foreign, deleted and unowned IDs all return 404 `Contact not found`. Merge additionally takes `ownerId: string | null` from the route's `ownerFilter`, never the payload. A completed merge hard-deletes losers, so a repeat is a 404 with zero effects; uncertain transport is reconciled by a fresh read, not claimed rolled back. No tombstone, operation table or audit row is added.

## Fresh reads

The only wire addition for freshness is `fresh=1` on the existing contacts GET and the `fresh: true` key in its response ([contracts/fresh-reconciliation.md](contracts/fresh-reconciliation.md)). It is a cache selector, not a permission, receipt or persisted state. Client merge intent is discarded after an unknown outcome and never persisted.
