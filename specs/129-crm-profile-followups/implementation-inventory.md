# F8 per-file delivery inventory and independent slices

Hub-relative paths unless stated otherwise. Every action is future work after owner spec approval. US1 is the manual-tag path (contact existence fix, qualification and conditional wording); US2 is the masked-key write policy, manual Instagram recording and merge feedback. Shipping US1 does not require US2 and does not mark US2 complete. Terms are defined in [contracts/behavior.md](contracts/behavior.md#terms).

Create means absent at the pin; if the path has appeared in the candidate, extend it. No Delete, schema migration, dependency, new route or layout rebuild is selected. The Task column names the task that changes the file.

| Action | File | Task | Change, or no-change predicate |
|---|---|---|---|
| Modify | src/server/services/crm-contacts.service.ts | T018 (US1), T011, T019 | US1: `lockContactsInOrg`, used by `applyTag`/`removeTag`; fixed-text HTTP 400 tag errors. T011: `updateContact`, `customFieldsMergeSql`, `customFieldsPatchSql` options; masked-key preservation; phone ignored for restricted principals; filtered audit input; identity `handle` masking in `getContact` and the roster. T019: `createContact` option. |
| Modify | src/routes/api/crm/contacts/[id]/tags/+server.ts | T018 | UUID `tagId`; POST `catch` stops forwarding `e.message`; 404 passes through. |
| Create | src/routes/api/crm/contacts/[id]/tags/server.test.ts | T018 | Route 404/400 shapes for foreign, missing, deleted and malformed IDs; no database text. |
| Modify | src/server/services/simulated-record-mutations.test.ts | T018, T011, T019 | US1: unscoped foreign-org, missing, deleted and malformed contact for `applyTag`/`removeTag`. US2: explicit options (T011 `updateContact`; T019 create, party facet, merge) per [client-compatibility.md](contracts/client-compatibility.md#required-existing-direct-test-callers). |
| Modify conditionally | src/routes/(app)/crm/[contactId]/PageBody.svelte | T008 (US1), T020 | US1: translated profile/event-tag help only if a staff walkthrough reproduces confusion. US2 (mandatory): read-only masked fields and phone for restricted principals, `saveDetails` omits them, masked new-key refusal. |
| Modify | src/routes/(app)/crm/[contactId]/page.server.test.ts | T006, T019 | US1 tag/layout/authorization baseline. US2 `crm.canEditSensitiveFields` and masked handle. |
| Modify | src/routes/(app)/crm/[contactId]/+page.server.ts | T019 | Return `crm.canEditSensitiveFields = !maskPii`. |
| Modify / reuse tests | src/server/services/crm-contacts.service.test.ts | T006, T011 | US1 persistence baseline. US2 SQL helper options per the caller table. |
| Reuse tests only | src/lib/components/dashboard/EditableGrid.mounted.test.ts | T009 | Account-scoped version 1 layout; no component change if reload and account switch pass. |
| Modify | src/lib/pii.ts | T011 | `CRM_MANUAL_INSTAGRAM_FIELD_KEYS` added to `CRM_PII_FIELD_KEYS`; `omitMaskedFields`; `omitManualInstagramFields`. |
| Modify | src/lib/pii.test.ts | T010 | Key sets, case variants, helpers. |
| Modify | src/server/services/crm-contacts.custom-fields.test.ts | T010, T011 | Existing calls get `true`; new restricted whole/partial/phone cases. |
| Modify | src/routes/api/crm/contacts/[id]/+server.ts | T011 | Pass `{ canWriteSensitiveFields: !maskSensitive }`. |
| Modify | src/routes/api/crm/contacts/+server.ts | T019, T020 | T019: POST create option and sanitized 201. T020: GET `fresh=1` branch per [fresh-reconciliation.md](contracts/fresh-reconciliation.md). |
| Modify | src/routes/api/crm/contacts/contacts.test.ts | T010, T019, T020 | PATCH masking/stale, create, forged option, fresh GET cases. |
| Modify | src/server/services/party.service.ts | T019 | `ensureContactFacetForParty` option. |
| Modify | src/routes/api/crm/parties/+server.ts | T019 | Derive and pass the option. |
| Modify | src/server/services/party.service.test.ts | T019 | Restricted and authorized facet creation. |
| Modify | src/routes/api/crm/parties/server.test.ts | T019 | Fourth argument in the line-207 assertion; restricted/authorized quick-add; no Instagram identity. |
| Modify | src/server/services/crm-cleanup.service.ts | T019 | `mergeContacts` options, participant admission via `lockContactsInOrg`, restricted refusal, masked override stripping. |
| Modify | src/routes/api/crm/cleanup/duplicates/+server.ts | T019, T020 | T019: derive and pass options. T020: `Cache-Control: private, no-store` on GET success. |
| Modify | src/server/services/crm-cleanup.service.test.ts | T019 | Admission and refusal cases from the behavior regressions list. |
| Create | src/routes/api/crm/cleanup/duplicates/server.test.ts | T019 | 403 `{message:'sensitive_fields_restricted'}`, 404 cases, `{ok:true}`, GET no-store header. |
| Modify | src/routes/api/gateway/actions/contact-update/+server.ts | T011, T019 | T011: pass the option from the delegated field level. T019: 403 for restricted `phone`/`email`; sanitized success and stale rows. |
| Modify | src/routes/api/gateway/actions/contact-update.server.test.ts | T010, T019 | Existing email tests move to `fieldLevel: () => 1`; restricted 403 and masked-response cases. |
| Modify | src/lib/components/crm/crm-merge.ts | T020 | Three outcomes, typed errors, `fetchFreshMergeGroups`. |
| Create | src/lib/components/crm/crm-merge.test.ts | T020 | Outcome mapping; no server text leaks. |
| Modify | src/lib/components/crm/CrmMergeResolver.svelte | T020 | `confirmBlocked`, `reconciling`, `onReconcile`; confirm guard. |
| Modify | src/lib/components/crm/CrmHygiene.svelte | T020 | Merge phases and fresh group replacement. |
| Create | src/lib/components/crm/CrmHygiene.merge.mounted.test.ts | T020 | Hygiene host matrix; `// @vitest-environment happy-dom`. |
| Modify | src/routes/(app)/crm/customers/PageBody.svelte | T020 | Merge phases and `reloadFreshRows`; data-resync effect bumps `reqSeq`. |
| Create | src/routes/(app)/crm/customers/page.merge.mounted.test.ts | T020 | Customer host matrix; happy-dom. |
| Create | src/routes/(app)/crm/[contactId]/page.instagram.mounted.test.ts | T020 | Read-only masked fields, new-key refusal, account switch, no identity control; happy-dom. |
| Modify | src/server/services/custom-property-bundle.service.test.ts | T019, only if the property path is selected | Restricted read returns no Instagram property value. |
| Modify | src/server/services/audit-coverage.test.ts | T011, T019 | Explicit `false` options (T011 `updateContact`, T019 `createContact`). |
| Modify | src/server/services/crm-funnel.concurrent.integration.test.ts | T011 | Explicit `false` option; seven behaviors unchanged. |
| Create | src/server/test-utils/crm-instagram-native-fixture.ts | T017 | Connections, admission, child lifecycle, binding per [native-fixture.md](contracts/native-fixture.md). |
| Create | src/server/test-utils/fixtures/crm-instagram-native.sql | T017 | Public test tables and catalog assertions; auth objects come from F7's helper. |
| Consume, no F8 change | src/server/test-utils/operator-native-auth-fixture.ts and src/server/test-utils/fixtures/operator-native-auth.sql | T017 | Planned by F7 (its T003, T005); T017 is blocked until present. |
| Create | src/server/services/crm-instagram-fields.sql.integration.test.ts | T021 | Nine behaviors from quickstart.md. |
| Modify | scripts/qc/native-postgres-manifest.ts | T021 | Admit the file once to qa-native, nine behaviors, minimum nine; lane count unchanged. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | T021 | File ownership and required-behavior admission. |
| Modify | scripts/qc/native-postgres-report.test.ts | T021 | Missing, skipped and duplicate behavior rejection. |
| Modify only if a generic validator defect is proven | scripts/qc/native-postgres-report.ts | T021 | Otherwise unchanged. |
| Modify as needed | messages/en.json, messages/es.json | T013 | Keys in [client-compatibility.md](contracts/client-compatibility.md#messages); US1 help only if reproduced. |
| Generated by i18n:compile | src/lib/paraglide/ | T013 | Never edited by hand. |
| Modify only if fixture absent | scripts/qa/seed/crm.ts, scripts/qa/seed/matrix.ts, scripts/qa/seed/ids.ts | T004 | Synthetic tags, contacts and personas; reuse existing IDs. |
| Modify only if the property path is selected and its fixture is absent | scripts/qa/seed/custom-properties.ts | T004 | Reuse an existing property fixture. |
| Create/update | specs/129-crm-profile-followups/validation.md | T001, T003, T009, T012, T014 | Execution record per shipped slice. |
| Create local evidence | specs/129-crm-profile-followups/evidence/ | T015 | Synthetic screenshots and receipts only. |

Unchanged unless a separately reviewed amendment proves need: `EditableGrid.svelte`, `TagsField`, `applyTagBulk`, the customers SSR loader, CSV export, CRM tag taxonomy, event links, lifecycle, synced identities, automated/public intake, schema, permissions, design tokens and dependencies. An unexpected product path must be reviewed before it is edited.

US2 ordinary command (the native suite is not in it; run the qa-native and crm-concurrent lanes from quickstart.md):

```bash
bunx vitest run 'src/lib/pii.test.ts' 'src/server/services/crm-contacts.service.test.ts' 'src/server/services/crm-contacts.custom-fields.test.ts' 'src/server/services/crm-cleanup.service.test.ts' 'src/server/services/party.service.test.ts' 'src/routes/api/crm/contacts/contacts.test.ts' 'src/routes/api/crm/parties/server.test.ts' 'src/routes/api/crm/cleanup/duplicates/server.test.ts' 'src/routes/api/gateway/actions/contact-update.server.test.ts' 'src/lib/components/crm/crm-merge.test.ts' 'src/lib/components/crm/CrmHygiene.merge.mounted.test.ts' 'src/routes/(app)/crm/customers/page.merge.mounted.test.ts' 'src/routes/(app)/crm/[contactId]/page.server.test.ts' 'src/routes/(app)/crm/[contactId]/page.instagram.mounted.test.ts' 'src/server/services/audit-coverage.test.ts' 'src/server/services/simulated-record-mutations.test.ts'
```
