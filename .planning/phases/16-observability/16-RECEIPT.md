# 16-RECEIPT — source-map and telemetry receipt (OBS-02)

GSD 16-02, 2026-09-11. **Local receipts only.** Every command below ran in the private
snapshot `/home/nikolas/.cache/claude-tmp/16-02-90a50a72/minion_hub` (hub `origin/master`
`1df0a9216ad3f7f85d989eb59cfccb779d9f7285` + 16-02's four owned files) with an
`env -i` environment and, for every build, inside `unshare -rn` (private network
namespace, loopback down) so nothing could leave the host. No DSN, no auth token, no
Sentry project was used or contacted. Remote receipt: §4, **pending**.

Runtime: Node 22.23.2, Bun 1.3.4, vite 8.1.3, @sveltejs/kit 2.69.2, @sentry/sveltekit
10.66.0, @sentry/vite-plugin 5.4.0, sentry-cli 2.58.6 (`checks/freeze.json`).

## 1. Local source-map receipt — fixture line resolves through the map

`bun scripts/qc/telemetry-fixture.ts` (`artifacts/fixture-run.json`):

| Field | Value |
|---|---|
| marker | `MINION_OBS02_6c2f6112a71a7e11` (unique per run) |
| release (candidate) | `1df0a9216ad3f7f85d989eb59cfccb779d9f7285` = snapshot HEAD; `SENTRY_RELEASE`/`VERCEL_GIT_COMMIT_SHA`/`GITHUB_SHA` absent → `git rev-parse HEAD`, same fallback the plugin uses |
| bundler | vite 8.1.3, app mode, minified (single line, mangled: `function e(){throw Error(…)}`) |
| raw frame (plain `node` child, no `--enable-source-maps`) | `bundle.js:1:20` |
| resolved through `bundle.js.map` (`node:module` `SourceMap.findEntry`) | `telemetry-fixture.source.ts:5:13` |
| expected | line 5 = the `throw new Error(\`${detail.marker} telemetry fixture\`)` line |
| matched | **true**; `validateManifest` → `ok: true` |

Note: the CLI manifest's `environment` reads `production` because Bun sets
`NODE_ENV=production` for a bare `bun <file>`; under Vitest it reads `test`. The field
mirrors the runtime SDK's resolution and carries no claim about a deployment.

`node node_modules/vitest/vitest.mjs run scripts/qc/telemetry-fixture.test.ts`
(`checks/02-fixture-test.log`): **22 passed / 22, 1 file, exit 0** — the receipt above
re-run inside the test, plus negatives: frame outside the map's generated line → null;
empty mappings / no `sources` / non-JSON map → null; stack without a bundle frame → null;
manifest rejected for no/malformed marker, `1.2.3` or `unknown` as release, `prod`
environment, missing resolved frame, line/source mismatch, `matched:false`; manifest
rejected as **unsafe** when any nested string is a DSN, `sntrys_`/`sntryu_` token, `sk-`
key or bearer header; access report carries no value for a sentinel token / DSN and
distinguishes absent tooling from unverified remote state.

## 2. Build receipts — maps out of public output

| Build (`bun run build`, adapter-vercel) | exit | `.map` in `.vercel/output` | `.map` in `.svelte-kit/output` | log |
|---|---|---|---|---|
| disarmed (no `SENTRY_AUTH_TOKEN`), final owned files | 0 | **0** | — | `checks/03-build-disarmed.log` |
| armed, offline negative control, plugin **default** delete globs | 0 | **845** (all under `static/_app`, i.e. public) | 2101 | `checks/05a-build-armed-offline-DEFAULT-DELETE-negative.log` |
| armed, offline negative control, **explicit** delete globs (shipped) | 0 | **0** | **0** | `checks/05-build-armed-offline.log` |

Armed negative control = `SENTRY_AUTH_TOKEN=sntrys_fake_local_negative_control`,
`SENTRY_ORG`/`SENTRY_PROJECT=local-negative`, `SENTRY_URL=http://127.0.0.1:9`,
`SENTRY_DEBUG=1`, inside `unshare -rn`. What the shipped configuration did:

- `[Sentry] Enabled source map generation … build.sourcemap: 'hidden'` (client + server passes).
- Upload discovered **845 client + 1256 server** maps (`Source map found for bundle …`).
- `sentry-cli releases new …` and `sentry-cli sourcemaps upload …` both failed (no route to
  host, as designed); the SvelteKit wrapper logged `[sentry-vite-plugin] Error: … Couldn't
  finish all operations` and the build **still exited 0** — an unreachable Sentry does not
  fail a deploy.
- `Deleting asset after upload` ×2946 → **0** maps left in either output tree.
- Disarmed build log mentions "sentry" only in Vite's pre-existing dynamic-import notice
  for `@sentry/sveltekit/…/svelteConfig.js` (from `hooks.server.ts`'s import on master);
  no plugin line, no sourcemap line.

The default-glob failure is the reason `vite.config.ts` sets
`sourcemaps.filesToDeleteAfterUpload` explicitly (`16-SENTRY-ACCESS.md` §3).

Pre-existing, observed only because the namespace had no network: `paraglide-js compile`
(the `build` script's first step) attempts a PostHog flush at build time and logs
`PostHogFetchNetworkError` — unrelated to Sentry and already swallowed by the
`unhandledRejection` handler in `vite.config.ts`.

## 3. Other gates

| Gate | Result | Log |
|---|---|---|
| `bun run check` (svelte-check, whole source at the candidate) | 0 errors, 0 warnings, exit 0 | `checks/06-check.log` |
| `bunx prettier --check` on the 4 owned hub files | exit 0 | `checks/04-prettier.log` |
| `git diff --check` | clean, exit 0 | — |
| `bun scripts/qc/telemetry-fixture.ts --report` | exit 0, values never printed | `artifacts/access-report.json` |

## 4. Remote receipt — PENDING (access this executor does not have)

| Receipt | Status | Unblocks |
|---|---|---|
| Sentry org/project identity | pending | operator names the existing project (16-SENTRY-ACCESS.md §4) |
| Build-time upload from the deployed (Vercel) build | pending | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in the Vercel project env; then the Vercel build log line "Successfully uploaded source maps" |
| Release ↔ commit association | pending | `GET /api/0/projects/{org}/{project}/releases/{VERCEL_GIT_COMMIT_SHA}/` |
| Artifact bundle present | pending | `GET /api/0/projects/{org}/{project}/files/source-maps/` |
| Event receipt with un-minified frame at the fixture line | pending **and gated on a trigger route (G-5)** | child plan adds a bearer-gated internal route that throws the marker error; then `GET /api/0/projects/{org}/{project}/events/?query=MINION_OBS02_<marker>` |
| Alert delivery | out of 16-02 scope (16-03) | — |

A local receipt cannot stand in for any row above. OBS-02 stays open until the pending
rows carry event id, release, environment and `filename:lineNo` — never DSN, token or
payload.
