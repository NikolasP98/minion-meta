# 14-CRM-ADOPTION — server-only CRM SDK: candidate, consumers, adoption gate

Plan: 14-03 (SDK-03). Executed 2026-09-11 in private snapshot `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3`.
Status: **candidate proven locally; consumer adoption pending (lock edit under root ownership)**.

## Identities

| Item | Identity |
|---|---|
| Meta candidate | origin/dev `d3aab3b1852220a0560ba4ab56b6ab6a124cfb65` + 14-03 Task 1 edits (`packages/crm-sdk/package.json`, `src/browser-denied.ts`, `src/server-boundary.test.ts`) |
| Site consumer | origin/master `0ed4e1b16cef4ca9287314df5af58a8af17f537c`; `package.json` + `bun.lock` pin `file:deps/minion-stack-crm-sdk-0.1.0-776d8c49.tgz` |
| Hub consumer | `minion_hub/package.json` pins the same `file:deps/minion-stack-crm-sdk-0.1.0-776d8c49.tgz` (not exercised by this plan) |
| Vendored archive | sha256 `776d8c4989e9f65282cc412fbc7d24789247a6f5e5c4570cd889e583d19cc27d`; installed `node_modules/@minion-stack/crm-sdk` byte-identical to archive contents (test-verified) |
| Archive vs upstream source | archive `dist/{index,client,dni}.js` sha256 `33b9dcb1…`, `ed07bde5…`, `1a496508…` == fresh `tsc` build of origin/dev `packages/crm-sdk/src` (identical). The vendored archive already carries the current upstream idempotency/DNI source; nothing historical to replay. |
| Candidate delta | only the `browser` export condition + top-level `browser` field → `dist/browser-denied.js` (sha256 `c0bec6d0bc81ad4ce21e1ec4e128b5fdcd3cbf180635a659b9c45fecef587b12`) |

## What the boundary is

`packages/crm-sdk/package.json`:

```json
"browser": "./dist/browser-denied.js",
"exports": { ".": { "types": "./dist/index.d.ts", "browser": "./dist/browser-denied.js", "import": "./dist/index.js" } }
```

`dist/browser-denied.js` exports nothing and throws on evaluation. Any bundler resolving under the `browser` condition (Vite client builds, Rollup, webpack 5, esbuild `--platform=browser`) fails to link `createCrmClient`/`lookupDni` at build time; Node/SSR (`import`) and TypeScript (`types`) are unchanged. `postgres` stays a peer dependency.

## Evidence (all logs under `/home/nikolas/.cache/claude-tmp/14-03-b71d76a3/checks/`)

- `crm-sdk-test.log`: 22/22 (Node `--conditions=browser` direct + transitive import rejected; browser-resolved file is the stub with no privileged strings; default conditions expose the full 10-symbol surface; Site route import line typechecks with `moduleResolution: bundler`; manifest guard rejects 5 unsafe/incomplete shapes incl. the vendored 0.1.0 shape).
- `vite-browser-probe.log`: Site's installed Vite 6.4.2 client build — probe A/D (candidate) FAIL at link: `"createCrmClient" is not exported by ".../dist/browser-denied.js"`; probe C (vendored archive, `postgres` stubbed) SUCCEEDS and the bundle contains `createCrmClient`, `app_ledger`, `set_config`, `api.perudevs.com`. Probe B shows the vendored archive only fails today by accident (`postgres` → `perf_hooks` named import), which is not a boundary.
- `site-leads-test-2-postbuild.log`: 14/14 — POST /api/leads through the packed archive against an isolated in-memory PGlite (socket server on 127.0.0.1:54329, synthetic org/identities): create, case-insensitive duplicate → same party (1 row), tenant scoping, 4×400, 429 throttle; DNI verified/mismatch/not_found/skipped/error via a fake provider; key redaction (`[key]`); archive identity; source-level server-only import scan; built client bundle (103 files) contains no privileged symbols.
- `site-build.log` exit 0 (synthetic `PUBLIC_SUPABASE_URL/ANON_KEY/AUTH_PROVIDER`, no credentials); `site-client-bundle-scan.log` 0 hits; `site-check.log` svelte-check 0 errors.

## Why SDK-03 stays open

1. **Consumers still install archive 776d8c49**, which has no browser condition. The Site's exclusion today rests on SvelteKit routing (only `+server.ts` imports the SDK) plus the accidental `perf_hooks` failure — proven by probe C to be bypassable. Adoption = repack the candidate (`pnpm --filter @minion-stack/crm-sdk pack` after `prepack`), vendor the new `deps/minion-stack-crm-sdk-0.1.0-<sha8>.tgz`, update `package.json` + `bun.lock` in **both** `minion_site` and `minion_hub`. Lock/manifest edits are outside 14-03 ownership → serialize with 12-02/12-03 provenance under root ownership.
2. The Site test carries a deliberate RED: `it.fails('installed archive manifest carries the browser-denied condition (pending adoption)')`. It flips to a failure the moment the adopted archive has the condition — the adopter must turn it into a plain `it`.
3. Hub consumption not exercised here (plan scope is Site); Hub's server-only usage should get the same source-scan/bundle-scan once the archive is adopted.
4. `edge-light`/`workerd` conditions are not denied (Vercel Edge/Cloudflare would resolve `import`); irrelevant while the routes run on Node, note for a future gate.

## Next gated step

Root-owned adoption PR: repack → vendor → lock update (site + hub) → flip the `it.fails` → rerun `leads-sdk.contract.test.ts` with `CRM_TEST_DB_URL` → then SDK-03 can be evidenced closed at the deployed candidate.
