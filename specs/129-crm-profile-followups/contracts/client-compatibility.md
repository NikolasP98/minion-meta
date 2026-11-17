# Merge feedback and existing caller compatibility

This is the service-to-route-to-host path for the merge refusal and for uncertain merge outcomes. Terms (restricted principal, masked keys, refusal identifier) are defined in [behavior.md](behavior.md#terms). Existing tag/lifecycle behavior is preserved and no request supplies field authority.

## One refusal, both hosts

The service throws `error(403, 'sensitive_fields_restricted')`; the POST cleanup/duplicates route has no `catch`, so SvelteKit returns HTTP 403 `{"message":"sensitive_fields_restricted"}` (installed kit 2.70.2, `src/runtime/server/utils.js:75-105`, JSON when the request accepts `application/json`). Participant admission fails with 404 before this check, so the refusal cannot probe field state.

`applyContactMerge` in `src/lib/components/crm/crm-merge.ts` keeps its payload and `Promise<void>` success contract and sends `accept: application/json`:

- HTTP 200 with a parsed body equal to `{ok:true}`: resolve.
- HTTP 403 with `message === 'sensitive_fields_restricted'`: throw exported `CrmMergeSensitiveFieldsRestrictedError`; exported guard `isCrmMergeSensitiveFieldsRestricted(error: unknown)`.
- Anything else (transport loss, abort, redirect, malformed or missing acknowledgement, any other status including 5xx): throw exported `CrmMergeOutcomeUnknownError`.

Errors carry fixed messages only; no server text or JSON is forwarded. A 500 is not proof of no effects: the merge may have committed.

## Merge phases at both hosts

`runMerge` in `CrmHygiene.svelte` and in `crm/customers/PageBody.svelte` own one `mergePhase` each, separate from the transient `merging`/`bulkBusy` flag. Phases: `idle`, `submitting`, `definite_refusal`, `unknown`, `refreshing`, `refresh_failed`, `selection_required`, `acknowledged_refresh_failed`. `finally` releases only the busy flag. `runMerge` returns immediately unless the phase is `idle`, `selection_required` or `definite_refusal`, which also covers double clicks and direct callback calls. While `refreshing`, the host records the origin (`unknown` or `acknowledged`), which decides the failure phase.

"Required read" is, for the customer host, the fresh contacts page read in [fresh-reconciliation.md](fresh-reconciliation.md); for Hygiene, the fresh duplicate-groups read below. Hygiene never takes the acknowledged path, because its existing success marks the group done without a reload.

| From phase | Event | Next phase | Feedback key | Merge POST | Refresh contacts action |
|---|---|---|---|---|---|
| `idle` or `selection_required` | User confirms an explicit selection | `submitting` | none | One POST is sent | Hidden |
| `definite_refusal` | User confirms again or confirms another selection | `submitting` | none | One POST is sent | Hidden |
| `definite_refusal` | User closes the resolver | `idle` | none | Allowed after a new Confirm | Hidden |
| `submitting` | HTTP 200 `{ok:true}`, Hygiene host | `idle`; group marked done, pending intent cleared | existing success | Allowed after a new Confirm | Hidden |
| `submitting` | HTTP 200 `{ok:true}`, customer host | `refreshing` (origin `acknowledged`); selection cleared, resolver closed | none | Blocked | Disabled |
| `submitting` | HTTP 403 `sensitive_fields_restricted` | `definite_refusal` | `crm_merge_sensitive_fields_restricted` | Allowed after a new Confirm | Hidden |
| `submitting` | Any other outcome | `unknown`; pending group, resolution and selection discarded | `crm_merge_outcome_unknown` | Blocked | Enabled |
| `unknown` or `refresh_failed` | User selects Refresh contacts | `refreshing` (origin `unknown`) | unchanged | Blocked | Disabled |
| `refreshing` (origin `unknown`) | The required read is accepted | `selection_required` | `crm_merge_outcome_unknown` stays shown | Allowed after a new Confirm | Hidden |
| `refreshing` (origin `unknown`) | The required read fails, is denied, malformed, unmarked or superseded | `refresh_failed` | `crm_merge_refresh_failed` | Blocked | Enabled |
| `refreshing` (origin `acknowledged`) | The required read is accepted | `idle` | existing success | Allowed after a new Confirm | Hidden |
| `refreshing` (origin `acknowledged`) | The required read fails, is denied, malformed, unmarked or superseded | `acknowledged_refresh_failed` | `crm_merge_applied_refresh_failed` | Blocked | Enabled |
| `acknowledged_refresh_failed` | User selects Refresh contacts | `refreshing` (origin `acknowledged`) | unchanged | Blocked | Disabled |
| Any phase | Unmount or account switch | Host state discarded; a fresh mount starts at `idle` after its load | none | Allowed after a new Confirm | Hidden |

Closing or reopening the resolver changes no phase except `definite_refusal`. A failed refresh after an acknowledged POST never enters `unknown` or `refresh_failed` and never offers a POST retry. No transition sends a POST by itself; there is no retry timer or GET-to-POST continuation.

`CrmMergeResolver.svelte` stays presentational: `onConfirm` returns void and it performs no fetch. New props: `confirmBlocked: boolean` (default false), `reconciling: boolean` (default false) and `onReconcile?: () => void`. Confirm is disabled when busy, `confirmBlocked` or `!canMerge`, and `confirm()` repeats that guard. Its translated refresh action calls only `onReconcile` and is disabled while `reconciling`. Each host also shows the latched status and the Refresh contacts action in its existing merge/error region, so closing the modal never hides the only refresh control; both actions call the same read-only handler. `openMerge` refuses to reuse a pending group or resolution while latched.

## Messages

| Key | English | Spanish |
|---|---|---|
| `crm_merge_sensitive_fields_restricted` | This merge needs access to sensitive profile fields. | Esta combinación requiere acceso a campos sensibles del perfil. |
| `crm_merge_outcome_unknown` | The merge result is unconfirmed. Refresh before selecting contacts again. | El resultado de la combinación no está confirmado. Actualiza antes de volver a seleccionar contactos. |
| `crm_merge_applied_refresh_failed` | The merge completed. Refresh to load the latest contacts. | La combinación se completó. Actualiza para cargar los contactos recientes. |
| `crm_merge_refresh_failed` | Refresh failed. Merging remains blocked. | No se pudo actualizar. La combinación sigue bloqueada. |
| `crm_merge_refresh_contacts` | Refresh contacts | Actualizar contactos |
| `crm_sensitive_fields_read_only` | Only roles with access to sensitive fields can edit this value. | Solo los roles con acceso a campos sensibles pueden editar este valor. |

The Spanish strings use "combinación", the noun the existing catalog uses for this feature (`messages/es.json:1425-1428`, `:1741`). No technical identifiers or private details appear in any message.

## Hygiene fresh duplicate groups

At the pin, CrmHygiene's `groups` prop comes from the `/crm/settings` loader through `findDuplicatesCached` (`crm/settings/+page.server.ts:47`, `crm-cleanup.service.ts:51-58`: TTL 2m, SWR 30s, CRM domain tag). No client code calls GET `/api/crm/cleanup/duplicates`; that existing route already runs uncached `findDuplicates` with `ownerFilter` and masking.

F8 adds `fetchFreshMergeGroups(): Promise<DupGroup[]>` to `crm-merge.ts`. It calls that GET with `cache: 'no-store'`, rejects redirects and non-OK responses, and validates the `{groups: DupGroup[]}` envelope; failures throw a fixed-message error. The route adds `Cache-Control: private, no-store` to its successful response. On an accepted read Hygiene replaces `groupRows` (all `done: false`), clears `pendingGroup` and the resolution, and closes the resolver. It never marks a group done after an unknown outcome.

A reload of the settings page may still serve cached groups until the merge's best-effort tag invalidation or the cache lifetime catches up. That is accepted: participant admission in [behavior.md](behavior.md#merge-participant-admission) refuses a merge of contacts that no longer exist. An absent group, a later 404 or a successful refresh is not proof that the earlier merge committed or rolled back, so the unknown feedback stays shown in `selection_required`.

## Mounted host regressions

`CrmHygiene.merge.mounted.test.ts` and customers `page.merge.mounted.test.ts` drive the real resolver callback. Cases, each its own test:

- known refusal shows `crm_merge_sensitive_fields_restricted` and allows a new Confirm;
- transport loss, malformed acknowledgement and a 500 each latch `unknown`;
- modal close/reopen and a direct repeated callback do not clear the latch;
- two refresh clicks issue one read at a time;
- a failed, denied or malformed read leaves `refresh_failed`;
- a read that resolves after an account change or a newer read is ignored;
- an accepted read enters `selection_required`, and only a new explicit selection sends a second POST;
- customer host only: acknowledged POST followed by a failed read shows `crm_merge_applied_refresh_failed` and sends zero further POSTs;
- Hygiene only: no done marker without an acknowledgement, and fresh groups replace old rows.

Every unknown and failed-refresh case asserts exactly one POST. `crm-merge.test.ts` covers the helper's three outcomes and that no server text leaks.

## Required existing direct test callers

The new options are required in existing tests too. Search production and test call sites of all six changed signatures (`updateContact`, `customFieldsMergeSql`, `customFieldsPatchSql`, `createContact`, `ensureContactFacetForParty`, `mergeContacts`) before declaring type compatibility. Never repair a caller by making an option optional.

| File | Calls at the pin | Arguments after F8 |
|---|---|---|
| `src/server/services/crm-contacts.custom-fields.test.ts` | 12 `updateContact` calls (lines 203, 224, 243, 265, 268, 282, 299, 320, 323, 358, 374, 414); `customFieldsPatchSql`/`customFieldsMergeSql` at 156, 167, 174, 183, 184 | Every existing call passes `{ canWriteSensitiveFields: true }`; `updateContact` passes `undefined` as the stale argument where absent. These tests assert authorized whole/partial semantics, including email writes. New restricted cases pass `false`. |
| `src/server/services/crm-contacts.service.test.ts` | `customFieldsMergeSql` at 175, 188, 199 | `{ canWriteSensitiveFields: true }`; the SQL text assertions stay unchanged. Add `false` cases asserting the masked-key preservation clause. |
| `src/server/services/audit-coverage.test.ts` | `updateContact` at 199, `createContact` at 224 | `{ canWriteSensitiveFields: false }` (`updateContact` stale argument `undefined`); payloads are `displayName` only, so audit and transaction assertions are unchanged. |
| `src/server/services/simulated-record-mutations.test.ts` | `updateContact` at 370-422, `createContact` at 345 and 432, `mergeContacts` at 483, `ensureContactFacetForParty` at 566 | `{ canWriteSensitiveFields: false }` everywhere; `mergeContacts` gets `undefined` overrides and `{ canWriteSensitiveFields: false, ownerId: actorId }` for its owner-scoped fixture, or `ownerId: null` for an unscoped fixture. Owner, foreign, edit and stale denial assertions are unchanged. |
| `src/server/services/crm-funnel.concurrent.integration.test.ts` | `updateContact` at 407 | stale argument `undefined`, then `{ canWriteSensitiveFields: false }`. Its `favoriteColor` patch is not a masked key, so the seven behaviors are unchanged. |
| `src/routes/api/crm/parties/server.test.ts` | `toHaveBeenCalledWith` at 207 asserts exactly three `ensureContactFacetForParty` arguments | Add the fourth argument `{ canWriteSensitiveFields: <value the mocked shouldMaskSensitive implies> }`. |
| `src/routes/api/gateway/actions/contact-update.server.test.ts` | Capabilities mock `fieldLevel: () => 0` at 94; email writes at 304-390 | Existing email-write tests switch to `fieldLevel: () => 1` (authorized); add restricted cases expecting 403 for `phone`/`email` and masked responses for a name edit. |

## Existing crm-concurrent lane remains separate

`crm-funnel.concurrent.integration.test.ts` belongs to `NATIVE_POSTGRES_MANIFEST['crm-concurrent']` with `minimumAssertions: 7`. Keep its seven requiredBehaviors and `vitest.crm-concurrent-postgres.config.ts`; do not move it into qa-native. Ordinary Vitest excludes it, and the qa-native Instagram suite does not cover it.

Provision a separately owned loopback fixture from the CI `crm-funnel-concurrent-postgres` recipe and its `supabase/ci-fixtures/crm-funnel-concurrent.sql`. Locally, start a container from image `postgres:15` (`ci.yml:214`) with `POSTGRES_USER=minion_qc` and `POSTGRES_DB=minion_qc`; its initial superuser is then `minion_qc` (CI's is `postgres`). Create a `minion_qc_crm_concurrent_<32hex>` database, set its `minion-360-disposable:v1` marker, and admit it with `openDisposablePostgres({MINION_QC_DISPOSABLE:'1', MINION_QC_DATABASE_URL: F8_CRM_CONCURRENT_URL})` before fixture DDL. The URL uses literal `127.0.0.1` or `[::1]`, an explicit port, user `minion_qc`, no query or hash. Verify `pg_roles.rolsuper = true` for `minion_qc`. If `app_ledger` is absent, create it `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS`; if present, verify those attributes. Never ALTER a shared role or reset shared QA. Keep the CI job's `app_ledger` cross-org negative control.

Set `HUB_TEST_DB_URL` explicitly (never local `SUPABASE_DB_URL` or production dotenv) and run the whole lane:

```bash
HUB_TEST_DB_URL="$F8_CRM_CONCURRENT_URL" REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 bun --no-env-file run vitest run --config vitest.crm-concurrent-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-instagram-crm-concurrent.json
bun --no-env-file scripts/qc/native-postgres-report.ts crm-concurrent test-results/faces-instagram-crm-concurrent.json
```

Require every registered behavior, zero failures, skips or todos, and the lock-wait assertions. None of these commands ran during authoring.
