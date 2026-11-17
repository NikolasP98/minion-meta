# Quickstart validation: Discoverable persistent CRM profile classification and Instagram recording

## Preconditions

Owner approval is pending. These are instructions for a future isolated Hub candidate, not commands executed during documentation authoring; nothing below has run. Read Hub AGENTS.md and docs/qa-stack.md; verify candidate HEAD and registry master/Bun. Use synthetic data and guarded loopback QA only, never a production-backed `bun run dev`. Inspect `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack. Terms such as masked keys and restricted principal are defined in [contracts/behavior.md](contracts/behavior.md#terms).

## US1 fixture and oracle (task T006)

Seed one org A with contacts C1 (unowned), C2 (owned by another profile) and C3 (soft-deleted), a manual CRM tag `Modelo`, an auto CRM tag, an event tag `MODELO` linked to a booking of C1, and `lifecycle_override` set on C1. Seed org B with contact F1.

| Persona | Request | Expected |
|---|---|---|
| unscoped CRM editor, org A | POST `Modelo` on C1, then reload | 201; link present after reload; event `tag_links` and `lifecycle_override` unchanged |
| same | DELETE `Modelo` on C1, then reload | 200; link absent after reload |
| same | POST or DELETE on F1 (org B) | 404 `Contact not found`; zero `crm_contact_tags` changes |
| same | POST on a random UUID, on C3, on `not-a-uuid` | 404 `Contact not found`; zero changes; no database text |
| same | POST the auto tag or the event tag on C1 | 400 with the fixed tag message |
| same | POST with `tagId` `not-a-uuid` | 400 |
| `if_owner` CRM editor, org A | POST or DELETE on C2 | 404; zero changes |
| CRM viewer without edit | POST on C1 | 403; zero changes |

The route and service cases are written in `src/server/services/simulated-record-mutations.test.ts` and the new `src/routes/api/crm/contacts/[id]/tags/server.test.ts`; the loader baseline in `src/routes/(app)/crm/[contactId]/page.server.test.ts`. Real guarded QA repeats the same matrix against local Postgres.

## Focused executable checks

US1:

```bash
bunx vitest run 'src/routes/(app)/crm/[contactId]/page.server.test.ts' 'src/routes/api/crm/contacts/contacts.test.ts' 'src/routes/api/crm/contacts/[id]/tags/server.test.ts' 'src/server/services/crm-contacts.service.test.ts' 'src/server/services/simulated-record-mutations.test.ts' 'src/lib/components/dashboard/EditableGrid.mounted.test.ts'
```

US2 runs the command in [implementation-inventory.md](implementation-inventory.md). Capture a failing assertion for each missing behavior before the fix; a passing baseline test is not a reproduced fix.

## Scenario and oracle

Use local QA personal-account fixtures with manual CRM modelo, separate same-name event tag, auto tag and lifecycle stage. Apply and remove the profile tag and reload; assert event tags and stage unchanged. Inspect synthetic org custom-property definitions and Additional keys, record manual Instagram using one path, reload and compare identity rows, reserved metadata and unrelated fields. Test masked, owner-scoped, denied and foreign personas by direct API as well as UI. Move the lifecycle card using Editar Diseño, reload in the same browser and switch accounts; verify no layout leakage. Report cross-device layout as outside verified scope.

For each allowed journey also run direct API and navigation attempts for the denied, owner and foreign controls. Capture status, loader outcome and redacted payload assertions. A 200 document shell alone does not prove authorization or a successful load. On mutations compare before/after records; a success toast alone proves nothing.

## Browser acceptance

Read and use browser-harness. Use a unique named isolated browser when work is concurrent; never share tabs or processes with another agent. Test desktop and 390px, Spanish and English, light and dark, keyboard-only operation and fresh reload. Observe accessible labels and focus, empty/error/denied states, row/link behavior and persisted preference scope. Login, MFA or account ambiguity stops actions until the account is confirmed; keep private session access details out of committed docs.

## Full qualification and result recording

Run Hub `bun run check` (zero errors and warnings), `bun run test` and `bun run build`. For UI edits run `bun run lint:design && bun run lint:tokens`; for message edits run `bun run i18n:compile`. No route is added; the route design and access contracts (`src/lib/routes/route-design-contracts.test.ts`, `src/lib/routes/route-access-authority.test.ts`) run inside `bun run test`, because the pinned package.json has no separate route-contract script. Record commands, exit codes, candidate hash, fixture matrix, screenshots and open gates in `validation.md` beside this feature. Production release and affected-account checks are separate owner-gated evidence.

## Masked-key regressions (ordinary Vitest)

Before any synthetic handle write, `src/lib/pii.test.ts` proves both manual Instagram keys and their case variants are masked, that `omitMaskedFields` and `omitManualInstagramFields` drop exactly their sets, and that unrelated keys pass through. Contact serialization tests prove masking in roster, detail, PATCH and stale PATCH responses, including identity `handle`.

In `src/server/services/crm-contacts.custom-fields.test.ts` (PGlite), store `{instagram_handle: "synthetic_handle_123", telefono: "999111222", email: "a@example.test", distrito: "old", _funnel: {stage: "lead"}}` plus a `phone` identity `999111222`. As a restricted principal, change only `distrito` and save the whole namespace with the masked projection and the masked phone. Assert every masked key, `_funnel` and the phone identity are byte-identical and the response is masked; `expectedUpdatedAt` is current so concurrency cannot hide the defect. Repeat with masked keys omitted, null, empty, case-varied, forged and absent before the write, and with a partial patch. Authorized replace and whole-namespace deletion still work; a partial null stores null.

## qa-native Instagram suite

Create `src/server/services/crm-instagram-fields.sql.integration.test.ts` with `describe("CRM Instagram preservation against PostgreSQL")`, register it once in the `qa-native` lane of `scripts/qc/native-postgres-manifest.ts` with `minimumAssertions: 9` and these requiredBehaviors, keep every existing manifest row and the lane count, and update the manifest and report tests:

- `CRM Instagram preservation against PostgreSQL masked whole namespace preserves stored masked values while unrelated fields change`
- `CRM Instagram preservation against PostgreSQL restricted forged null omitted and case variant inputs cannot create replace or delete a masked value`
- `CRM Instagram preservation against PostgreSQL partial updates preserve masked and reserved values`
- `CRM Instagram preservation against PostgreSQL concurrent restricted update preserves the committed authorized handle in both lock orders`
- `CRM Instagram preservation against PostgreSQL stale owner and foreign predicates preserve the authoritative row and audit`
- `CRM Instagram preservation against PostgreSQL authorized replace and whole namespace removal retain existing semantics`
- `CRM Instagram preservation against PostgreSQL restricted manual contact creation strips manual Instagram keys and authorized creation persists them`
- `CRM Instagram preservation against PostgreSQL party quick add uses the same manual Instagram creation policy without creating an Instagram identity`
- `CRM Instagram preservation against PostgreSQL restricted merge strips masked overrides and atomically refuses stored manual Instagram participants in both lock orders`

Ordinary Vitest excludes `.sql.integration` files. The fixture, connections and authority binding are in [contracts/native-fixture.md](contracts/native-fixture.md). Set private `F8_QA_NATIVE_CONTROLLER_URL` to the owned `minion_qc_vectors` controller and `F8_FULL_SCHEMA_QA_URL` to the guarded full-schema QA target. `REQUIRE_ORG_ROLES_POSTGRES=1` is required because the same lane contains the org-role SQL suites (for example `organization-role-admin.sql.integration.test.ts:253`), which skip without it; CI sets it for this job at `ci.yml:688`. Then run the whole lane without a file filter:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F8_QA_NATIVE_CONTROLLER_URL" HUB_TEST_DB_URL="$F8_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-crm-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-crm-qa-native.json
```

The report requires every admitted file and behavior with zero skips, todos or failures. The existing crm-concurrent lane runs separately, per [client-compatibility.md](contracts/client-compatibility.md#existing-crm-concurrent-lane-remains-separate).

## Create, merge and gateway regressions

The required cases are the bullet list in [contracts/behavior.md](contracts/behavior.md#regressions). Ordinary tests live in `contacts.test.ts`, `parties/server.test.ts`, `party.service.test.ts`, `crm-cleanup.service.test.ts`, the new `src/routes/api/crm/cleanup/duplicates/server.test.ts` and the existing `src/routes/api/gateway/actions/contact-update.server.test.ts`; lock-order races run only in the qa-native suite. Forged `canWriteSensitiveFields` JSON is ignored by every route. No remote model call or external message runs in these tests.

## Merge client and fresh rows

Run the mounted host matrix in [contracts/client-compatibility.md](contracts/client-compatibility.md#mounted-host-regressions) and the fresh-read cases in [contracts/fresh-reconciliation.md](contracts/fresh-reconciliation.md#tests). In guarded QA, warm the customer page cache, merge, and confirm the fresh read shows post-merge rows. The invalidation-failure case is proven by the route and mounted tests, which stub a stale cached page.

## Slice qualification

A US1 candidate runs the US1 command, the tag fix, real guarded personal-account checks and its applicable i18n, full, UI and browser gates; it does not need any US2 file. A US2 candidate runs its ordinary command, both native lanes and their reports, and its own gates. Record each story's evidence separately in validation.md. Conditional US1 labeling and layout files stay unchanged when the walkthrough passes; record that no-code outcome.
