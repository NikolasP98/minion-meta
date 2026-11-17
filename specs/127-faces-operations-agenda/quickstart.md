# Quickstart validation: FACES personal-account agenda in the operations Space

## Preconditions

Owner approval is pending. These are instructions for a future isolated Hub candidate; none was run while writing this document. Read Hub AGENTS.md and `docs/qa-stack.md`, and verify the candidate HEAD and the registry base branch `master` and Bun. Use synthetic data and the guarded loopback QA stack only, never a production-backed `bun run dev`. Check `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack.

## Focused checks

The focused command covers every test file that [implementation-inventory.md](implementation-inventory.md) creates or modifies and that runs under the ordinary `vitest.config.ts`. The native SQL file is excluded from that config and runs only in the [native lane](#native-postgresql-lane).

| Test file | Status |
| --- | --- |
| `src/server/services/nav-config.service.test.ts` | Create: revision, fresh read, conditional save and marker cases |
| `src/server/services/section-access.service.test.ts` | Extend: authority-only extraction and recoverability helper |
| `src/server/services/permissions.service.test.ts` | Extend: canonical versus marked and unmarked alias decisions |
| `src/hooks.tenant.test.ts` | Extend: page, `__data.json` and action guard for marked aliases and deeper routes |
| `src/routes/api/nav/server.test.ts` | Extend: fresh selectors, headers, status codes, `/api/nav/resolve` canonical deny |
| `src/lib/nav/custom-sections.test.ts` | Extend: marker parsing, sticky retention, copy into `addLink` |
| `src/lib/nav/custom-sections-nav.test.ts` | Extend: marked visibility under the canonical ceiling |
| `src/lib/nav/personal-navigation.test.ts` | Extend: personal hide and order persistence |
| `src/lib/components/layout/NavContextMenu.mounted.test.ts` | Extend: copy, paste, save and reload of marked links |
| `scripts/qc/native-postgres-manifest.test.ts` | Extend: admission and behavior identity |
| `scripts/qc/native-postgres-report.test.ts` | Extend: missing, duplicate, skipped and extra behavior rejection |

Run from the Hub checkout:

```bash
bun --no-env-file run vitest run \
  src/server/services/nav-config.service.test.ts \
  src/server/services/section-access.service.test.ts \
  src/server/services/permissions.service.test.ts \
  src/hooks.tenant.test.ts \
  src/routes/api/nav/server.test.ts \
  src/lib/nav/custom-sections.test.ts \
  src/lib/nav/custom-sections-nav.test.ts \
  src/lib/nav/personal-navigation.test.ts \
  src/lib/components/layout/NavContextMenu.mounted.test.ts \
  scripts/qc/native-postgres-manifest.test.ts \
  scripts/qc/native-postgres-report.test.ts
```

`--no-env-file` keeps a local `.env` from pointing tests at a shared database. A passing baseline is not a reproduced fix: first capture a failing assertion for the missing behavior, then run it on the candidate. Do not write tests that only mirror the implementation.

## Scenario and oracle

Start with a local QA synthetic organization, two personal staff users, and denied, unrelated and other-org controls. Create an equivalent Space containing sell, clients and marketing. Exercise: link already present (no-op), missing link, hidden link, contextual deny, disabled module, duplicate link, changed preflight revision and refresh failure after commit. Compare the navigation document and authority sets before and after. Reload each personal session, open the alias by keyboard and by direct URL, and inspect canonical route data IDs and authorization.

Seed a canonical `/pos/appointments` deny plus a section allow on the destination: unmarked legacy behavior is unchanged, while a new marked link cannot make navigation, server data, actions or `/api/nav/resolve` more permissive than the canonical target. Exercise custom roles and a multi-role union, later policy and membership changes, a deeper route deny, and marker retention when an old normal PUT omits it.

Preview with `fresh=1` and the `policySection` and `policyTarget` selector, and capture both strong headers. Change a policy only through `writeSectionAccess`, which takes the navigation policy lock: the config ETag still matches, but a PUT with the old policy revision returns 412 with no effect. The reverse lock order shows a committed save followed by an ordinary policy change that never widens the marked route. Also test revoking the actor's role through `mutateOrganizationMemberRoles`, missing and malformed selectors and headers, a stored orphan rule seeded before the preview (409 collision), and a new rule after the preview (policy 412 comes first). Plain GET and no-mode payloads and unmarked aliases stay compatible.

For each allowed journey, also send direct API and navigation requests as denied, owner-scoped and foreign controls. Capture the status, the actual loader outcome and redacted payload assertions; a 200 document shell does not prove authorization or a successful data load. For mutations, compare authoritative records before and after and the retry outcome, not a success toast. Production execution is separate, approval-gated, and uses private resolved identities only.

The cached-read race counterexample and the full request, error and recovery contract are in [behavior.md](contracts/behavior.md#proof-and-compatibility-boundary).

## Account availability

The owner said on November 16 that Coli is not provisioned. Verify the existing operations account's alias visibility, canonical route data, unchanged permissions and reload behavior; that is the complete current-account acceptance. Report Coli as not yet verifiable, not as a failed login or missing role. Creating or inviting an account, or granting membership, is outside this slice. After separate provisioning, repeat the same checks before claiming Coli's access. Synthetic second-persona tests prove policy behavior only, not that the account exists.

## Browser acceptance

Use the browser-harness skill. Use a uniquely named isolated browser when work is concurrent; never share tabs or processes with another agent. Test desktop and 390px width, Spanish and English, light and dark, keyboard-only operation and a fresh reload. Check accessible labels and focus, empty, error and denied states, link behavior and the scope of persisted preferences. A login, MFA or account ambiguity stops the run until the account is confirmed; keep session access details out of committed documents.

## Native PostgreSQL lane

The new fixture `src/server/services/nav-config-conditional.sql.integration.test.ts` is admitted once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts` with `minimumAssertions: 11` and `exactAssertions: true`. The `exactAssertions` flag, its type and the report check come from the F7-owned [shared exact-count harness](../128-faces-receivables-audit/contracts/native-exact-count.md), which must be qualified first; it preserves unrelated legacy rows. This is a test-harness dependency only, not an F7 runtime or migration dependency.

The fixture has eleven required behaviors. Under `describe('navigation conditional save against PostgreSQL')`, each `it` title is the part after that prefix. For example, `it('fresh read bypasses stale cache and binds the current org document')` yields the first full name:

1. `navigation conditional save against PostgreSQL fresh read bypasses stale cache and binds the current org document`
2. `navigation conditional save against PostgreSQL stale conditional save preserves document policy and audit`
3. `navigation conditional save against PostgreSQL concurrent matching saves serialize and only one commits`
4. `navigation conditional save against PostgreSQL absent document saves and policy writes share the existing lock`
5. `navigation conditional save against PostgreSQL single link append preserves unrelated orphan rules and rejects changed key policy`
6. `navigation conditional save against PostgreSQL precise inverse rollback refuses intervening config or policy changes`
7. `navigation conditional save against PostgreSQL committed save with failed invalidation never repeats the write`
8. `navigation conditional save against PostgreSQL foreign org etag refuses and legacy normal save remains compatible`
9. `navigation conditional save against PostgreSQL marked alias cannot widen canonical deny through inherited section or page grants`
10. `navigation conditional save against PostgreSQL policy only changes invalidate the approved scoped save in both lock orders`
11. `navigation conditional save against PostgreSQL retained canonical marker survives legacy saves and future role changes preserve native access ceiling`

Behaviors 9 to 11 come from [canonical-access.md](contracts/canonical-access.md). The copied new-ID marker case, the role-phase traces from [policy-read-seam.md](contracts/policy-read-seam.md#qualification) and the actor-revocation case run inside these behaviors; the count stays eleven. Extend `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts` for this admission and for rejecting a missing, skipped or duplicate behavior and an extra twelfth passing behavior. The lane count stays at nine; the existing config reads manifest files automatically, so there is no include glob or CI change. The ordinary test run excludes this file and is not its proof.

Fixture setup and cleanup use an owned public database:

1. Call `openDisposablePostgres` with explicit `MINION_QC_DISPOSABLE='1'` and `MINION_QC_DATABASE_URL`. Require host `127.0.0.1` or `[::1]`, an explicit port, the `minion_qc` owner and name, no query string or fragment, and the `minion-360-disposable:v1` marker. Use the F7 controller recipe (CREATEDB or initial superuser, existing non-bypass `app_ledger`, `SET ROLE` admission) without role escalation. Before any public profile, member or org policy or foreign-key DDL, apply the F7 test-only [native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md): the full-lane controller image `pgvector 0.8.6-pg18` with database `minion_qc_vectors`, a child `auth` schema with users and a `uid` function (`STABLE SECURITY INVOKER`) with canonical owner, ACL and JWT semantics, and the auth user seeded before the profile, email and foreign key. Add no `app_ledger` grants, policies or JWT subject.
2. Create only `minion_qc_faces_nav_<32 hex>`, validate it against `^minion_qc_faces_nav_[a-f0-9]{32}$`, set the marker, derive the child URL by replacing only the validated database path, and qualify the child. Source policy helpers run against the child's public tables, not a search-path substitute. Reuse the section-access fixture definitions and baseline ACL and row-level security, with the nav, policy, org, profile, member, role and audit tables. Add no `app_ledger` org, profile or member grants or permissive profile policy.
3. Inject child Drizzle clients. The policy and actor phase runs under the controller's trusted outer role, as the navigation service does; document phases run through the real `withOrgCoreTransaction` with `app_ledger` on the same backend and restore the original role before further policy checks. Use no global client or authority mock. Record privilege, role, settings and backend receipts, baseline negative direct-access probes, and restoration on success and failure. Never call the F7 stock bridge after taking the navigation policy lock. Independent clients and acknowledged lock barriers prove the races.
4. In `finally`, release blockers, roll back and close all child clients, drop only the recorded child database through the controller, verify it is gone, and close the controller. Never reset the controller, shared QA or public data, change shared roles, or fall back to the application `.env.local` or `SUPABASE_DB_URL`. A missing fixture, privilege or marker fails qualification before any write; it never skips.

The complete `qa-native` lane also needs its separately owned full-schema QA target and guard flags, because other admitted fixtures use it. After qualifying both targets and setting the private `F6_DISPOSABLE_DATABASE_URL` and `F6_FULL_SCHEMA_QA_URL` from the owned local stack, run from the isolated Hub candidate:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F6_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F6_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-nav-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-nav-qa-native.json
```

Do not add a single-file filter to this run: the report guard requires every admitted `qa-native` file once, zero failures, skips and todos, and every behavior name. A filtered development run is labeled focused and is never passed to the report guard as complete evidence. Missing or invalid targets or markers fail before fixture writes. No code runs against a production URL.

## Full qualification and result recording

Run Hub `bun run check`, `bun run test` and `bun run build`. After UI edits run `bun run lint:design && bun run lint:tokens`; after message edits run `bun run i18n:compile`. Route and RBAC manifest checks are part of the candidate's scripts; read `package.json` rather than invent a command. Record commands, exit codes, candidate hash, fixture matrix, screenshots and open gates in `specs/127-faces-operations-agenda/validation.md`. Do not mark implementation done until its outcomes pass. The order of local qualification, release and the real configuration change is in [tasks.md](tasks.md#dependencies-and-parallel-opportunities).
