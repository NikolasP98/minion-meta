---
spec: 2026-09-21-hub-customer-identity-guardians-spec
pass: 1
verdict: approved
reviewer: codex-sol-independent
created: 2026-09-21
standards: pass
requirements: partial
---

# Independent review: POS customer identity and legal guardians

## Standards review — PASS

Tenant boundaries and concurrency controls are structurally sound. Guardian reads and mutations constrain `org_id`; owner-scoped principals must own both ward and guardian; the migration enables and forces RLS. The eligibility trigger locks the guardian party row, and the party DOB trigger prevents a concurrent edit from making a linked guardian underage. The guardian primary key makes replayed links idempotent, and removal deletes only the relationship. Quick-add document conflicts are fail-closed rather than silently mutating an existing identity.

The earlier implementation defects found in review are fixed in the current tree: quick-add rejects stale lookup responses, CRM projections fall back to manual profile sex, guardian candidates require person parties, guardian network failures always release busy state, and the DOB maximum uses the local calendar date. The POS guardian-management link and its party-to-contact resolver are both gated by `crm:view`.

The loader regression found during review is fixed and its two focused tests pass. A focused database integration test covers foreign-tenant, missing-DOB, under-18, exact-18, company, idempotent replay, relationship removal, and linked-guardian DOB-change invariants. The implementation agent executed it against the loopback QA Postgres schema at 23:41:29: one test file and one test passed in 1.03 seconds. This closes the database-boundary runtime proof.

## Requirements review — PARTIAL

The implementation covers the intended shapes: quick-add exposes the existing standard and data-defined fields; registry autofill is restricted to explicit person + DNI + eight digits; foreign document types remain explicit; guardian storage supports multiple links; DOB uses a native date picker and localized date-only rendering; QA seed/matrix entries exist; the production repair audited every verified identity and refused to invent unavailable DOBs.

The following requirement gap remains:

The verified-customer repair cannot complete seven DOB fields from current authoritative evidence. The complete-DNI provider returned an empty `fecha_nacimiento` for all seven; the guarded script correctly made zero writes. This is a documented external data-source gap, not permission to derive exact dates from legacy age values.

## Evidence reviewed

- `specs/2026-09-21-hub-customer-identity-guardians-spec.md`
- `minion_hub/src/lib/components/pos/CustomerQuickAdd.svelte`
- `minion_hub/src/lib/components/pos/customer-quick-add.ts`
- `minion_hub/src/routes/api/crm/parties/+server.ts`
- `minion_hub/src/server/services/party.service.ts`
- `minion_hub/src/server/services/crm-guardians.service.ts`
- `minion_hub/src/routes/api/crm/contacts/[id]/guardians/+server.ts`
- `minion_hub/src/routes/(app)/crm/[contactId]/+page.server.ts`
- `minion_hub/src/routes/(app)/crm/[contactId]/+page.svelte`
- `minion_hub/supabase/migrations/20260921220000_crm_contact_guardians.sql`
- `minion_hub/scripts/qa/seed/crm.ts` and `matrix.ts`
- Production aggregate audit and private repair evidence described in the matching proposal; no customer PII was copied into this report.

Focused commands:

- `bun run vitest run scripts/repair-verified-customer-metadata.test.ts src/lib/components/pos/customer-quick-add.test.ts 'src/routes/(app)/crm/[contactId]/page.server.test.ts'` initially exposed the unmocked guardian fan-out regression.
- `bun run vitest run --maxWorkers=2 src/server/services/crm-guardians.integration.test.ts 'src/routes/(app)/crm/[contactId]/page.server.test.ts'` after the fix: loader file passed (2 tests); the guardian integration file initially skipped because this reviewer had no test database URL.
- `HUB_TEST_DB_URL=postgresql://supabase_admin:postgres@127.0.0.1:54422/postgres bunx vitest run src/server/services/crm-guardians.integration.test.ts` — implementation-agent evidence at 23:41:29: 1 file passed, 1 test passed, duration 1.03 seconds.

## Release review — PASS

The isolated release review at Hub PR [#362](https://github.com/NikolasP98/minion_hub/pull/362), head `70b1f63c`, passed the requested feature boundary. Quick-add supports the standard fields and foreign/manual identities; DNI autofill is explicit and stale-response safe; DOB is date-only and localized; manual sex projects behind verified registry sex; and guardian storage retains tenant, adult, distinct-party and concurrency invariants.

The final access review confirmed that guardian GET requires `crm:view`, guardian removal uses the edit-gated POST action, and party-to-contact resolution excludes soft-deleted contacts while retaining owner scope. Focused guardian API coverage proves link `201`, removal `200`, invalid route/body rejection and denied reads before contact access.

This release review does not change the requirements verdict from `partial`: seven verified customers still lack an authoritative exact DOB. It also does not claim release completion. CI and the production build are pending; PR #362 is unmerged and **not deployed**.
