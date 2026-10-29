# S1 adversarial audit: hub org entitlements (spec 043)

Target: the staged diff in `/home/nikolas/.cache/claude-tmp/hub-043-s1`, on base `origin/master` 812a4b0a.
Measured against: `design.md`, the Technical Plan and "Slice S1".
Date: 2026-10-29. Mode: EXECUTE (commands were run, not just read). The worktree was not modified. Only the local QA DB (127.0.0.1:54422) was touched, and every write went inside a rolled-back transaction or the test's own cleanup. Afterwards there were 0 leftover `qa-ent-*` orgs, the 2 seed `org_plans` rows were intact and `org_plan_events` held 0 rows.

**Counts: 🔴 1 · 🟡 4 · 🟢 9**

## What was executed

| Check | Result |
|---|---|
| `vitest run` evaluate, service, page.server tests | 23/23 pass |
| `entitlements.sql.integration.test.ts` against the QA DB (scratch config; the house `qa-native` config also demands a separate `minion_qc` disposable DB) | 3/3 pass, not skipped |
| Migration applied twice, then dropped and applied fresh, inside `BEGIN … ROLLBACK` | idempotent; the fresh apply gives 1 policy, RLS enabled and forced, and grants as designed |
| `SET ROLE authenticated` → `select from org_plans`; `SET ROLE anon` → `select from org_plan_events` | `permission denied` on both |
| `app_ledger` with no GUC / own org | 0 rows / 1 row |
| `setOrgPlan` transaction body (drizzle `for update` + upsert + audit insert) on the real QA DB, rolled back | no-op base→false; insert premium (null actor, note) → true; update to base with actor → true; rows correct |
| Real `@minion-stack/cache` MemoryBackend: cache, invalidate, re-read | no stale read; scope is wider than designed (🟢-1) |
| Route contract files + `topbar-parity` + `native-postgres-manifest` + observability | 14 files pass; `ui-audit-inventory.test.ts` fails (🔴-1) |
| `lint:design` / `lint:tokens` | exit 0 / 0 violations; no changed file increased debt |
| i18n: every `m.admin_plans_*` / `m.nav_orgPlans` used exists in en **and** es | 21/21 present; both JSON files parse |

## 🔴 Blocker

### 🔴-1 `ui-audit-inventory.test.ts` will fail in CI once committed: the unique-pattern count was not bumped
`scripts/ui-audit-inventory.test.ts:13` still says `expect(new Set(inventory.routes.map((route) => route.pattern)).size).toBe(163);`. The diff bumped `summary.endpoints/screens` to 164/153 on lines 12 and 133 but left this line alone.
Evidence: `buildRouteInventory({})` on the worktree gives `endpoints: 164`, **unique patterns 164**, with `/orgs/plans` present. Base has no duplicate patterns (163 endpoints = 163 unique), so the new route adds one. Today line 12 fails because `cleanBaseline` reads git HEAD and the change is only staged. After commit, line 12 passes and line 13 fails. The other two failures in that file are `fatal: failed to write commit object` timeouts from the local signing environment, not this diff.
**Fix:** `toBe(164)` on line 13. Then rerun this file after the commit, because it reads HEAD, so a run before commit cannot go green. This is exactly the "2 of 6 contract files live outside `src/lib/routes/`" trap the design warns about.

## 🟡 Should fix

### 🟡-1 `planKey in PLANS` accepts prototype keys (`constructor`, `toString`, `__proto__`, `hasOwnProperty`)
`+page.server.ts:60` and `entitlements.service.ts:167` (and the warning check at `:50`) validate with `in`. Executed: `'constructor' in PLANS === true`.
Result: a platform admin (or a forged form post with an admin session) can store `plan_key='constructor'` and write an audit event `→ constructor`. `loadPlan` does not warn because `in` passes, and `normalizePlan` silently resolves it to Base. A premium org would then be demoted with the flag on, and the audit row would be misleading. Only admins can reach this, so it is not a privilege escalation, but it is the only write path's trust-boundary check.
**Fix:** `Object.hasOwn(PLANS, planKey)` in all three places. Add one test case: `setOrgPlan(admin, ORG, 'constructor')` → 400.

### 🟡-2 `normalizePlan` hard-codes `'premium'`, so a newly catalogued plan is silently Base
`evaluate.ts:10-12`: `return key === 'premium' ? 'premium' : 'base'`. The design says "A new plan such as `premium-lite` is a PR adding an entry and its `PLAN_DEFAULTS` row". With this code, that PR would pass `setOrgPlan` validation and the `loadPlan` known-key check, and then resolve as Base with no warning, a silent downgrade.
**Fix:** `return key && Object.hasOwn(PLANS, key) ? (key as PlanKey) : 'base';`. Also add a test that iterates `Object.keys(PLANS)` and asserts `normalizePlan(k) === k`.

### 🟡-3 No test runs `setOrgPlan`'s SQL; the page test claims it does
`page.server.test.ts:58` is titled "an admin change goes through setOrgPlan (plan row + audit row)", but `setOrgPlan` is mocked. `entitlements.service.test.ts` mocks the drizzle tx: `select().from().where().for()` returns a fixture and `onConflictDoUpdate` is a no-op. Neither proves the upsert target, the `for update` clause, the uuid columns or the audit insert against Postgres. That is the exact spec-041 lesson ("mocked SQL hid a 22P02"). I ran the identical chain on the QA DB (rolled back) and it works today, so this is a regression-proofing gap, not a live bug.
**Fix:** add one case to `entitlements.sql.integration.test.ts`. Inside a rolled-back owner transaction, run no-op → insert → update and assert the `org_plans` row and both `org_plan_events` rows (`from_plan` null → premium; premium → base). Retitle the page test to "delegates to setOrgPlan".

### 🟡-4 The admin page shows untranslated catalog strings and enum codes on the es locale
`+page.svelte:60` shows `{org.kind}` (`business`/`personal`), `:94` shows `{f.reason}` (`not_in_plan`, `rule_false`), and `:111` shows `{e.fromPlan ?? '—'} → {e.toPlan}` (raw keys). Plan and feature labels come from `PLANS`/`FEATURES` (`catalog.ts`), which are English only (`'Base'`, `'AI chat'`, `'Proactive AI'`). Every `m.*` key exists in en+es, but an es-locale admin still sees a half-English page. A null `fromPlan` shows `—` where the user should see "Base (default)".
**Fix:** map kind, reason and plan keys through `admin_plans_kind_*`, `admin_plans_reason_*` and `admin_plans_plan_*` messages (append-only), and show `fromPlan ?? 'base'` labelled as default. Catalog labels can stay English if the owner treats them as product names, but say so in the catalog comment.

## 🟢 Notes (no change required, or optional)

1. **The cache invalidation scope is wider than "the target org's tag".** `tags.tenantDomain(org,'entitlements')` really returns `['t:<org>:entitlements','t:<org>','d:entitlements']` (`node_modules/@minion-stack/cache/dist/tags.js:2-3`). In the executed run, a plan change busts **every org's** entitlements entry and **every cached domain of the target org** (I observed its `agents` entry reload). There is never a stale read, it matches the house pattern (`agent.service.ts:52`) and plan changes are rare, so this is fine. One consequence: the unit test's mock (`tags.tenantDomain → [one tag]`) could not detect a wrong-tenant bust by behaviour, only by the argument value. If precision matters, use `invalidateTags([`t:${orgId}:entitlements`])`.
2. **Concurrent first-time writes duplicate the audit row.** `SELECT … FOR UPDATE` on a missing row locks nothing (`entitlements.service.ts:171-175`). Two simultaneous first writes both read `from=null` and both append an event. The upsert serialises the row, so only the audit is affected. Optional fix: `pg_advisory_xact_lock(hashtext(orgId))` before the select.
3. **The "system write" test is mislabelled.** `entitlements.service.test.ts:158` exercises an *admin without `supabaseId`*, not a system writer, and S1 has no system-write path. Real `supabaseId` is always the profile uuid (`supabase-bridge.ts:39-47`). Retitle it, or move it to S5's backfill.
4. **`entitlements.service.test.ts:121` is a tautology.** It checks that a "tick-style resolve never sends PostHog", but `resolveEntitlements` never calls `captureServerEvent` on any path. It is harmless but proves nothing. The design's "setOrgPlan triggers no channel signal or restart" is also asserted only implicitly.
5. **Flag-off inertness is confirmed.** No caller of `requireFeature` or `resolveEntitlements` exists in S1 (grep), and no hook changed. With the flag off, `checkFeature` never throws: not on a missing org, a lookup error or a denial. With the flag on and a failed lookup, the request gate returns 503, the UI path gets the full catalog with `lookupError: true`, and nothing grants a request gate on error. This matches the design.
6. **Security is confirmed.** `requireAdmin` checks the **platform** `profiles.role === 'admin'` (`supabase-bridge.ts:40`, `authorize.ts:35-39`). The load, the action and the service each gate independently. `/orgs/plans` is registered `capability:orgs.all`. Grants on the real DB: `app_ledger` SELECT on `org_plans` only, nothing on `org_plan_events`, and anon/authenticated revoked (executed denials above). `service_role` keeps ALL through Supabase default privileges, which the design did not name, but that key already bypasses RLS everywhere.
7. **The migration is confirmed.** It writes schema only, with no DML. It is idempotent: a re-apply in a transaction succeeds. Its timestamp `20261029100000` is the latest. Its columns, types, nullability and defaults match `pg-schema/entitlements.ts` exactly (`\d+` vs drizzle). The drizzle index omits `DESC` and the FK `.references()`, which is cosmetic because drizzle does not own DDL here.
8. **The evaluator matches the design.** It walks catalog order, a child is gated only by its parent (inheritance only removes), a child listed alone grants nothing, `has()` sees only earlier keys, and an unknown feature returns `not_in_plan` plus a warning. Optional: add a test asserting that every dotted key's parent appears earlier in `FEATURES`, so an ordering slip cannot silently deny a feature.
9. **The UI follows the house rules.** It uses Svelte 5 runes only (`$props`, `$state`, `$derived`, `onclick`). `createOptimistic().run` is used as designed: `invalidateAll()` runs inside the commit, a thrown error or non-success becomes `false` and then a toast, and a pending entry disables the select. Design and token lints are clean. Minor gaps: the org selector button has no `aria-pressed`/`aria-current`, the UI has no note field (so admin events never carry a note), and the reused `listAllOrganizationsWithMemberCounts` returns `[]` on error and is capped by PostgREST's default row limit for member counts. The last two are pre-existing behaviour.

## Not checked
- `bun run check` (svelte-check / tsc). The ignored paraglide output is not compiled with the new keys, and compiling it would write into the worktree.
- A browser render of `/orgs/plans`.
- The full hub suite. Per the brief, it was not run.
