# Behavior contract: Discoverable persistent CRM profile classification and Instagram recording

Keep the existing POST /api/crm/contacts/[id]/tags {tagId} and DELETE ?tagId contracts; only CRM manual tags may be edited and all effective owner/edit policies must hold server-side. Existing PATCH contact accepts customFields; serialize a sanitized result. If an org custom property is chosen for the handle, keep its existing custom-property API rather than duplicating into customFields. A manual Instagram value is plain profile metadata, not an authenticated channel identity or a link to send a message. The synchronized identity card stays read-only. UI label/help distinguishes profile tags, event tags, lifecycle and the manual Instagram field without changing the saved layout.

## Terms

Each term below names one concept and is used only with this meaning in this feature package.

| Term | Definition |
|---|---|
| manual Instagram keys | Exactly `instagram` and `instagram_handle`, matched case-insensitively; exported as `CRM_MANUAL_INSTAGRAM_FIELD_KEYS` in `src/lib/pii.ts`. |
| masked keys | Every key in `CRM_PII_FIELD_KEYS` (`src/lib/pii.ts:20`), matched case-insensitively. F8 adds the two manual Instagram keys to that set, so they are masked keys too. |
| reserved keys | `_`-prefixed system-owned keys (`isReservedMetaKey`). Their handling is unchanged by F8. |
| restricted principal | A principal for whom `await shouldMaskSensitive(locals, 'crm')` is true (CRM field level below `SENSITIVE_FIELD_LEVEL` = 1, `src/lib/permissions.ts:127`). The server passes `{ canWriteSensitiveFields: false }` for it. |
| authorized principal | The opposite case; the server passes `{ canWriteSensitiveFields: true }`. |
| refusal identifier | `sensitive_fields_restricted`, the existing message already thrown by `requireCustomPropertyAccess` (`src/server/services/custom-properties-access.ts:40`). Every F8 refusal uses it via `error(403, 'sensitive_fields_restricted')`, which SvelteKit serializes as `{"message":"sensitive_fields_restricted"}`. |

## Admission and failure semantics

Resolve authenticated organization context first, then the module/dataset and contextual route policy; owner-scoped and foreign IDs must not leak existence. Apply masking before serialization and after writes. A denied facet is not an empty business fact; an unavailable read is not proof of missing records. Never retry a committed save because a refresh failed. Existing status/error conventions stay, except where this contract names a status. All writes and configuration actions remain owner-approval gated. No new route, schema migration or background synchronization is added.

## Tag apply/remove contact admission (US1)

At the pin, `applyTag`/`removeTag` (`crm-contacts.service.ts:2044-2084`) rely on `assertSimulatedRecordAccess`, which returns without reading any row for an unscoped actor (`simulated-record-scope.ts:86-100`). `applyTag` then inserts `crm_contact_tags` with the caller's org and the supplied contact ID; the contact foreign key (`schema.sql:7892-7893`) references `crm_contacts(id)` only, and PostgreSQL foreign-key checks do not apply row security. A malformed ID reaches SQL and the POST route returns the raw database message as HTTP 400 (`tags/+server.ts:17-21`). This is source evidence; it has not been reproduced at runtime.

Fix, in `crm-contacts.service.ts`:

- Add exported `lockContactsInOrg(tx: CoreTx, ctx: CoreCtx, ids: string[], ownerPredicate: SQL | undefined): Promise<string[]>`. It rejects any ID that is not a UUID, lowercases and sorts the distinct IDs, runs `select id from crm_contacts where org_id = ctx.tenantId and id in (…) and deleted_at is null [and ownerPredicate] order by id for update`, and requires the returned array to equal the requested array. Any mismatch or malformed ID throws `error(404, 'Contact not found')` before any other SQL.
- `applyTag` and `removeTag` call `lockContactsInOrg(tx, ctx, [contactId], undefined)` first, then the existing `assertSimulatedRecordAccess` (which keeps owner scoping for scoped actors).
- `applyTag` throws `error(400, 'tag is not a customer tag of this org')` and `error(400, 'tag is rule-based and cannot be applied by hand')` for its two existing tag checks.

In `src/routes/api/crm/contacts/[id]/tags/+server.ts`: `postSchema.tagId` becomes `z.string().uuid()`; DELETE returns the existing HTTP 400 `tagId is required` when `tagId` is absent or not a UUID; the POST `catch` rethrows HTTP errors and no longer forwards `e.message` from other errors (they become the default 500). `applyTagBulk` is unchanged: its only caller (`api/crm/tags/[id]/evaluate/+server.ts:94`) passes server-derived IDs.

## Masked-key write contract (`updateContact`)

The pinned details editor rebuilds the whole customFields namespace from the masked projection (`[contactId]/PageBody.svelte:228-261`), and `stdValue('phone')` returns the masked WhatsApp identity value. A restricted editor's save therefore sends `phone`, `telefono` and `email` masks, and `updateContact` (`crm-contacts.service.ts:1736-1747`) deletes the phone identity and inserts the mask's digits. Masking alone does not fix this; the write path must ignore masked values from restricted principals.

Signatures (the final options argument is required; there is no default):

```ts
updateContact(ctx, id, data, expectedUpdatedAt: Date | undefined, options: { canWriteSensitiveFields: boolean })
customFieldsMergeSql(clientFields: Record<string, unknown>, options: { canWriteSensitiveFields: boolean }): SQL
customFieldsPatchSql(clientFields: Record<string, unknown>, options: { canWriteSensitiveFields: boolean }): SQL
```

Callers derive the option on the server only; no request schema accepts it:

- PATCH `/api/crm/contacts/[id]` passes `!maskSensitive`, the value its handler already awaits (`[id]/+server.ts:53-56`).
- Gateway `contact-update` passes `capabilities.fieldLevel('crm') >= SENSITIVE_FIELD_LEVEL` from its `requireAssistantCapability` result (the delegated principal, never the gateway transport account).

With `canWriteSensitiveFields: true`, behavior and generated SQL text are identical to the pin. With `false`:

| Input | Effect |
|---|---|
| `customFields` (whole namespace) | Submitted masked keys and reserved keys are removed. The UPDATE keeps every stored masked key and reserved key from its pre-image: the preserved subquery becomes `where left(key, 1) = '_' or lower(key) = any(<masked key array>)`. Other stored keys keep whole-namespace semantics (omitted means removed). |
| `customFieldsPatch` (partial) | Submitted masked keys and reserved keys are removed; every other stored key is untouched, as today. |
| `phone` | Ignored: no phone identity delete or insert. |
| `displayName`, `ownerId`, `lifecycleOverride`, `dob` | Unchanged semantics. |

Omitted, null, empty, case-variant, forged raw and round-tripped masked values cannot create, replace or delete a stored masked value; an absent stored masked key stays absent. This is one atomic UPDATE, never a read followed by a JS spread. Stale, owner and org predicates stay on the same UPDATE. The audit entry records the filtered input, so discarded values are never logged as applied changes. Authorized editors keep explicit replace/delete semantics and expectedUpdatedAt conflicts: clearing is omission from the authorized whole namespace, while a partial `null` stores null.

Gateway `contact-update`: a restricted delegated principal whose body sets `phone` or `email` receives HTTP 403 `sensitive_fields_restricted` before preview or write; a name-only edit proceeds with `false`. Its success `contact` and stale `current` rows (`contact-update/+server.ts:67-99`, which are raw at the pin) pass `customFields` through `sanitizeContactFields(fields, !canWriteSensitiveFields)`. No Instagram request field is added.

Editor (`[contactId]/PageBody.svelte`): the loader returns `crm.canEditSensitiveFields = !maskPii` (`[contactId]/+page.server.ts:49-53`); this is a display hint, not a permission. When false, the phone and email standard rows and every Additional row whose key is a masked key render read-only with message `crm_sensitive_fields_read_only`; `saveDetails` omits `phone` and masked keys from the body; a new Additional key that is a masked key is not added and shows the same message beside the key input. The server stays authoritative for direct requests.

## Manual Instagram keys and storage path

Add `CRM_MANUAL_INSTAGRAM_FIELD_KEYS` to `CRM_PII_FIELD_KEYS`. Inspect existing data first, then choose one storage path:

1. An existing `crm.customers` custom property for Instagram: record the handle there. That table already hides all CRM custom properties from restricted principals (`custom-properties-access.ts:55`, policy `custom-properties.service.ts:78`); prove it with a restricted read in `custom-property-bundle.service.test.ts`.
2. Otherwise a stored Additional key equal to one of the two manual Instagram keys: reuse that spelling.
3. Otherwise `instagram_handle`.

Any other stored key that looks like an Instagram field (for example `ig` or `Instagram Handle`) is not registered and not migrated: stop and record it for owner selection. Every row in [implementation-inventory.md](../implementation-inventory.md) is implemented whichever path is chosen; the masked-key policy fixes the pre-existing defect above and protects any imported manual Instagram key.

## Serialization

`sanitizeContactFields` covers the masked keys in roster, detail, hygiene, export, PATCH success and `StaleWriteError.current`. Identity `handle` is masked like `externalId` for restricted principals in `getContact` (`crm-contacts.service.ts:1425-1428`) and in the roster mapping (`crm-contacts.service.ts:1182-1186`), matching `maskIdentities` in `crm-cleanup.service.ts:422-431`. Sanitized responses and UI projections are never a write pre-image.

## Manual create and merge

`src/lib/pii.ts` adds two pure helpers, used by every caller below:

```ts
omitMaskedFields(fields: Record<string, unknown>): Record<string, unknown>
omitManualInstagramFields(fields: Record<string, unknown>): Record<string, unknown>
```

| Service | Signature | Single production caller |
|---|---|---|
| `createContact` (`crm-contacts.service.ts`) | `createContact(ctx, data, options: { canWriteSensitiveFields: boolean })` | POST `/api/crm/contacts` (`+server.ts:122-131`), passing `!(await shouldMaskSensitive(locals, 'crm'))` |
| `ensureContactFacetForParty` (`party.service.ts`) | `ensureContactFacetForParty(ctx, partyId, data, options: { canWriteSensitiveFields: boolean })` | POST `/api/crm/parties` (`+server.ts:128-150`), same derivation |
| `mergeContacts` (`crm-cleanup.service.ts`) | `mergeContacts(ctx, survivorId, loserIds, overrides: { displayName?: string; customFields?: Record<string, unknown> } \| undefined, options: { canWriteSensitiveFields: boolean; ownerId: string \| null })` | POST `/api/crm/cleanup/duplicates`, same derivation plus `ownerId: (await ownerFilter(locals, 'crm')) ?? null` |

Create, restricted: the service applies `omitManualInstagramFields` before `.values`; other keys create normally (a new contact has no stored value to mask). Authorized creators can store the manual Instagram keys. POST contacts keeps `{contact}` and status 201 and passes the returned customFields through `sanitizeContactFields`; the party response keeps its shape. Identity and auto-assignment behavior are unchanged; no Instagram identity is created.

Merge, restricted: after participant admission (below), if any locked participant stores a manual Instagram key (including null or empty) the service throws `error(403, 'sensitive_fields_restricted')` with zero identity, tag, activity or contact effects. Otherwise `overrides.customFields` passes through `omitMaskedFields` and the existing merge runs. Authorized merges keep their backfill and conflict choices. Row locks are taken before the field check for both principals, so a concurrent authorized handle update either commits before the check (the restricted merge refuses) or waits for the merge.

## Merge participant admission

`assertSimulatedRecordAccess` is not an existence check for unscoped actors. `mergeContacts` keeps its delete capability check and adds, in one `withOrgCore` transaction before any field read or mutation:

1. A nonnull `ownerId` must equal `ctx.profileId`; otherwise HTTP 404 `Contact not found`.
2. Losers are lowercased, deduplicated and stripped of the survivor ID.
3. `lockContactsInOrg(tx, ctx, [survivorId, ...losers], ownerPredicate)`, where `ownerPredicate` is `ownerId` equality combined with `simulatedMutationPredicate(ctx, 'crm', 'edit', crmContacts.ownerId)` by `and`. Malformed, missing, foreign, deleted, unowned or inaccessible participants return HTTP 404 `Contact not found` with zero effects; a hidden row's field state never influences the response.
4. With no losers left, return the existing `{ok:true}` after the survivor passes step 3, with zero effects.
5. Otherwise read `custom_fields` for the locked IDs, apply the restricted check above, then run the existing merge under the retained locks, ending with the loser hard delete (`crm-cleanup.service.ts:527-531`).

`mergeContacts` writes no audit row at the pin and F8 adds none. Repeating a successful merge returns HTTP 404 because the losers are gone; that 404 does not prove rollback. Clients reconcile by reading fresh data and never retry automatically. No merge-operation store is added.

## Regressions

Each bullet is one required case; assert before/after rows of every affected table, not the response alone.

- Tags: unscoped editor with foreign-org contact, random UUID, soft-deleted contact and malformed ID each get 404 with zero `crm_contact_tags` changes; malformed `tagId` gets 400; no response contains database text.
- Restricted whole-namespace save of `{instagram_handle, telefono, email, distrito, _funnel}` changing only `distrito`: masked keys, `_funnel` and the phone identity are unchanged.
- Restricted partial patch with masked keys: masked keys unchanged, other submitted keys applied.
- Restricted masked inputs omitted, null, empty, case-variant, forged and absent-before-write: no masked key created, replaced or deleted.
- Authorized replace, whole-namespace removal and partial null keep pinned semantics.
- Gateway restricted `phone` or `email`: 403 `sensitive_fields_restricted`, zero writes; restricted name edit: success and stale responses masked; authorized counterpart unchanged.
- Restricted and authorized create through contacts POST and party quick-add with raw, masked, null and case-variant manual Instagram keys.
- Merge admission for restricted and authorized, unscoped and scoped principals: missing survivor, foreign survivor, missing loser, foreign loser, mixed subset, unowned participant, duplicate loser, self loser, empty losers with valid survivor, empty losers with missing survivor, repeated merge, malformed ID.
- Restricted merge with a manual Instagram key on the survivor, on a loser, and only on a hidden row; restricted merge whose overrides carry masked keys.
- Concurrent participant deletion and concurrent authorized handle update, in both lock orders, against real row locks.

The client contract for the refusal and for refreshing after a merge is in [client-compatibility.md](client-compatibility.md).
