---
phase: 14-sdk-transport
plan: "03"
status: partial
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/14-03-b71d76a3
executed: 2026-09-11
executor: Claude (Fable 5.1) continuation, ponytail mode
bases:
  meta: origin/dev d3aab3b1852220a0560ba4ab56b6ab6a124cfb65
  site: origin/master 0ed4e1b16cef4ca9287314df5af58a8af17f537c
owned_files:
  - path: packages/crm-sdk/package.json
    before: 4bd5ef63f2e824c28d19c1b433e30e11a7f2daf11b95080423f40c3e93ffd724
    after: 28cfee191cde019e7939d5d71c25c2eacc04d0723db3b74fb0d129041cd3d5bd
  - path: packages/crm-sdk/src/browser-denied.ts
    before: ABSENT
    after: dcd35b9567c303ccd42138e0bf17a1de1d4bffdac9ad76af3098167bd7862b8e
  - path: packages/crm-sdk/src/server-boundary.test.ts
    before: ABSENT
    after: 189d35fcf7d573af44d2830d05f82794dabf12d9dab6a81632fd8b6e3aa0f9b3
  - path: minion_site/src/routes/api/leads/leads-sdk.contract.test.ts
    before: ABSENT
    after: 7d0cf033beea1bd1fa85f079c8db970ce2cbd95ae6ea6b2927606f14f511664d
  - path: .planning/phases/14-sdk-transport/14-CRM-ADOPTION.md
    before: ABSENT
    after: 2441299f091444e46fa923f47f788e72752b374b42ab71914b5004a0eef70e3b
decision_ids: [D360-01, D360-02, D360-04, D360-05, D360-06]
---

# 14-03 Summary — Enforce server-only CRM SDK consumption

Source edits live only in the private snapshot (`/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/MINION`, `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/minion_site`); the planning docs (this file, VERIFICATION, 14-CRM-ADOPTION.md) are in the main checkout. Nothing committed, staged, pushed or installed outside the snapshot. Receipts: `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/checks/{before,after}.txt`, `freeze.json`, `*.log` (each ends with `exit=<code>`).

## Dependency state

14-01 is recorded as PARTIAL by root; `14-01-SUMMARY.md`/`14-01-VERIFICATION.md` do **not** exist in the main checkout at execution time. 14-03's owned files consume nothing from 14-01 (gateway envelope), so execution proceeded; the wire-fixture gate of 14-01 remains open and is not claimed here.

## Task 1 — browser-denied export condition (packages/crm-sdk)

- `package.json`: added `"browser": "./dist/browser-denied.js"` both as an export condition (ordered before `import`) and as the legacy top-level field. `types`, `import`, `main`, `postgres` peer unchanged.
- `src/browser-denied.ts`: exports nothing, throws a server-only error on evaluation. Bundlers fail linking any named import at build time; runtime evaluation fails too.
- `src/server-boundary.test.ts` (Node's real resolver + real tsc in a throwaway consumer dir under `$TMPDIR`): direct and transitive `--conditions=browser` import rejected; browser-resolved file is the stub and carries no `postgres|perudevs|createCrmClient|app_ledger|set_config`; condition order holds with `browser,node,import,default`; default conditions expose the full 10-symbol surface with real functions; the Site route's exact import line typechecks (`moduleResolution: bundler`); manifest guard `assertServerOnlyManifest` accepts the real manifest and rejects 5 unsafe/incomplete shapes (no browser condition = vendored 0.1.0 shape, browser after import, browser → real entry, missing postgres peer, missing top-level field).

Gates (from meta snapshot root):

| Gate | Result | Log |
|---|---|---|
| `pnpm --filter @minion-stack/crm-sdk test` | 2 files, **22/22 passed**, exit 0 | `checks/crm-sdk-test.log` |
| `pnpm --filter @minion-stack/crm-sdk build` | exit 0; `dist/browser-denied.{js,d.ts}` emitted | `checks/crm-sdk-build.log` |
| `… typecheck` / `… lint` | exit 0 / exit 0, 0 warnings | `checks/crm-sdk-typecheck.log`, `crm-sdk-lint.log` |
| Vite 6.4.2 client-bundle probe (Site's installed Vite) | candidate: **build FAILS** `"createCrmClient" is not exported by ".../dist/browser-denied.js"` (probes A and D, the latter with `postgres` stubbed); vendored archive with `postgres` stubbed (probe C): build **succeeds and the bundle contains** `createCrmClient`, `app_ledger`, `set_config`, `api.perudevs.com` | `checks/vite-browser-probe.log` |
| `git diff --check` | exit 0 | `checks/git-diff-check.log` |

First run was RED (1/22): my own stub doc-comment contained "Postgres"/"PERUDEVS" and the privileged-string scan caught it; reworded the comment — the check is real.

## Task 2 — lead-route adoption proof (minion_site)

- `src/routes/api/leads/leads-sdk.contract.test.ts`: mocks only `$env/dynamic/private` (synthetic org id, DB URL from `CRM_TEST_DB_URL`), imports the real `POST` from `+server.ts` and the real packed SDK from `node_modules`. DB cases are `describe.skipIf(!CRM_TEST_DB_URL)` (skipped, never passed, without a fixture); they create the minimal `parties` table + `app_ledger` role the SDK's `set local role` needs.
- Fixture: disposable in-memory PGlite 0.5.8 behind `@electric-sql/pglite-socket` 0.2.11 on `127.0.0.1:54329`, installed in `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/fixture` (not in Site), run with `env -i`, stopped at the end. No docker (socket not accessible), no local Postgres binaries, no credentials, no real PII.
- Cases (14): archive tgz sha256 == `776d8c49…` and pinned in `package.json`/`bun.lock`; installed copy byte-identical to archive contents (own ustar reader); **`it.fails`** "installed archive carries the browser-denied condition (pending adoption)" — deliberate RED, flips when the re-packed archive is adopted; only server-only source files import the SDK; built client bundle (103 files) has no privileged symbols; POST creates a party and folds the phone into the message; case-insensitive duplicate → `created:false`, 1 row, existing name kept, lead metadata updated; other-org row with the same email untouched (tenant scoping); 4 malformed inputs → 400 with no DB write; 6th hit from one address → 429; DNI via fake provider: verified (+dob), mismatch, not_found, skipped, unknown party error; network/provider errors redact the key to `[key]`; unconfigured key never calls the provider.

Gates (from `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/minion_site`, `env -i`):

| Gate | Result | Log |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run src/routes/api/leads/leads-sdk.contract.test.ts` (pre-build, fixture up) | **13 passed, 1 skipped** (client-bundle scan needs build), exit 0 | `checks/site-leads-test-1.log` |
| `bun run build` | exit 0 — needed synthetic `PUBLIC_SUPABASE_URL=http://127.0.0.1:1`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_AUTH_PROVIDER` (build-time `$env/static/public`; first attempt without them failed, kept as the first block of the log history) | `checks/site-build.log` |
| same test after build | **14/14 passed**, exit 0 | `checks/site-leads-test-2-postbuild.log` |
| client output scan (`.svelte-kit/output/client`, 103 files) | 0 files with `createCrmClient|upsertLead|app_ledger|perudevs|SUPABASE_DB_URL`; SDK present only in `output/server/entries/endpoints/api/leads/_server.ts.js` | `checks/site-client-bundle-scan.log` |
| `bun run check` (svelte-check, whole Site) | 0 errors, 0 warnings, exit 0 | `checks/site-check.log` |

First DB run was RED (7 failures, ECONNRESET): the fixture served one connection while the route's SDK client and the test's inspector each hold one; fixed by `maxConnections: 8` on the fixture, not by changing the SDK or the route.

## Deviations

- Vendored archive dist is byte-identical to a fresh build of origin/dev `packages/crm-sdk/src` (index/client/dni), so "verify actual upstream fixed source before adoption" resolved to: nothing to replay; the candidate's only delta is the browser boundary.
- The plan's `bun run build` gate could not run without three public build-time env names; synthetic non-secret values were used and are recorded above.
- oxlint suggested `endsWith` over a `$` regex in the test; applied.

## Gaps / open (why status = partial, SDK-03 not closed)

1. **Consumer adoption is a lock/manifest edit outside 14-03 ownership.** Site and Hub still pin archive `776d8c49` (no browser condition). Required: repack candidate → vendor `deps/minion-stack-crm-sdk-0.1.0-<sha8>.tgz` → update `package.json` + `bun.lock` in `minion_site` **and** `minion_hub` → flip the `it.fails` in the Site test. Root ownership, serialize with 12-02/12-03 provenance. Detail: `14-CRM-ADOPTION.md`.
2. Hub's consumption is not exercised (plan scope = Site route).
3. Deployed identity not established: everything above is snapshot evidence; no deploy, no PR.
4. `edge-light`/`workerd` conditions are not denied (moot on Node runtime; noted for a future gate).
5. 14-01 SUMMARY/VERIFICATION absent in the main checkout; its wire-fixture gate stays open independently of this plan.

## Next gated plan

Root-owned adoption transaction (repack + vendor + lock in site and hub + flip RED case + rerun with `CRM_TEST_DB_URL`), then an independent verifier can evidence SDK-03 at the adopted candidate.
