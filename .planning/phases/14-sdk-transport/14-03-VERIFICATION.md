---
phase: 14-sdk-transport
plan: "03"
verified: 2026-09-11
verdict: partial — both task behaviors evidenced at the snapshot candidate; requirement SDK-03 stays open pending consumer archive adoption (root-owned lock edit)
snapshot: /home/nikolas/.cache/claude-tmp/14-03-b71d76a3
---

# 14-03 Verification (goal-backward)

## must_haves.truths

| Truth | Status | Evidence |
|---|---|---|
| Browser bundling cannot include privileged client or credentials | **Holds for the candidate package**; **does not yet hold for the archive consumers install** | Candidate: `checks/vite-browser-probe.log` probes A/D — Vite 6.4.2 client build fails at link (`"createCrmClient" is not exported by ".../dist/browser-denied.js"`); `checks/crm-sdk-test.log` 22/22 (Node `--conditions=browser` direct + transitive rejection, stub has no privileged strings). Consumers: probe C shows archive 776d8c49 bundles `createCrmClient/app_ledger/set_config/api.perudevs.com` once `postgres` is stubbed → adoption gap (SUMMARY gap 1). |
| Existing server API imports keep type/runtime compatibility | Holds | `crm-sdk-test.log`: default conditions expose the full 10-symbol surface, `createCrmClient`/`lookupDni` are functions, Site route import line typechecks with `moduleResolution: bundler`; `crm-sdk-typecheck.log` exit 0; Site `site-check.log` 0 errors; `site-leads-test-2-postbuild.log` runs the real route against the real packed SDK. |
| Site route exercises fixed archive | Holds | Test asserts tgz sha256 `776d8c49…`, lock/manifest pin, installed copy byte-identical to archive; route `POST` invoked with real `Request`s; archive dist byte-identical to fresh build of origin/dev src (SUMMARY deviations). |
| Public bundle excludes SDK secrets/code | Holds at the Site (by routing) | `site-client-bundle-scan.log`: 0/103 client files with privileged symbols; SDK only in the server endpoint chunk; source-level scan case passes. Not yet enforced by the installed package itself (see truth 1). |
| Idempotency fixtures pass | Holds | `site-leads-test-2-postbuild.log` 14/14: duplicate (case-insensitive) → `created:false`, exactly 1 row, name kept, lead metadata updated; tenant scoping; 400×4 with no write; 429 throttle; DNI verified/mismatch/not_found/skipped/error; key redaction. |

## must_haves.artifacts

| Artifact | Present | Provides |
|---|---|---|
| `packages/crm-sdk/package.json` (snapshot) | yes, sha256 `28cfee19…` | `browser` condition + field → `dist/browser-denied.js`; `types`/`import`/peer unchanged; manifest guard test rejects regressions |
| `minion_site/src/routes/api/leads/leads-sdk.contract.test.ts` (snapshot) | yes, sha256 `7d0cf033…` | archive identity, browser exclusion, route+SDK behavior on isolated Postgres, deliberate `it.fails` adoption sentinel |
| `packages/crm-sdk/src/browser-denied.ts`, `src/server-boundary.test.ts` | yes | stub + boundary tests |
| `14-CRM-ADOPTION.md` (main checkout) | yes | identities, evidence index, adoption transaction |

## key_links

- `package.json` → `src/index.ts`: `types`/`import` still resolve `dist/index.{d.ts,js}`; only the browser condition diverges (tests "default (node) conditions resolve the real entry…", "Site route's import line typechecks").
- `leads-sdk.contract.test.ts` → `+server.ts`: real `POST` imported after mocking `$env/dynamic/private` only; behavior cases above.

## Negative / failure cases named in the plan

- Manifest guard: 5 rejected fixtures (no browser condition, wrong order, browser → real entry, no postgres peer, no top-level field) + accepted real manifest.
- Route: malformed JSON, missing name, invalid email, oversize name → 400; 6th hit → 429; unknown party → `error`; unconfigured key → `error` without provider call; network/provider error → redacted detail.
- Red-before-green recorded: stub comment tripped the privileged-string scan (1/22 RED → fixed); single-connection fixture produced 7 ECONNRESET failures (fixed in fixture, not in SDK/route).

## What this does NOT establish

- Adoption in Site/Hub (archive still 776d8c49) — root-owned lock edit; `it.fails` sentinel in the Site test marks it.
- Deployment or release identity; Hub runtime; edge runtime conditions.
- 14-01's wire-fixture gate (its SUMMARY/VERIFICATION are absent in the main checkout).

## Preservation

Main checkouts untouched (`git status` clean for `packages/crm-sdk` in meta and `src/routes/api/leads` in site). Snapshot worktrees: `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/MINION` (detached d3aab3b1), `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/minion_site` (detached 0ed4e1b). Fixture process stopped; port 54329 free. Hashes: `checks/before.txt` / `checks/after.txt`; versions: `checks/freeze.json`.
