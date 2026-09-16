# 16-SENTRY-ACCESS — Sentry tooling, access and the remote receipt procedure

Produced by GSD 16-02 (OBS-02), 2026-09-11. **This records what is installed and
what is configured by NAME in the environments this executor could see. It does not
record any credential value and it does not establish any remote Sentry state.**
Nothing in this plan contacted Sentry.

Source identity read: `minion_hub` `origin/master` `1df0a9216ad3f7f85d989eb59cfccb779d9f7285`
(private snapshot `/home/nikolas/.cache/claude-tmp/16-02-90a50a72/minion_hub`).
The 16-01/16-04 candidate (`feat/observability-identity-finance-parser-bounds`,
hub PR #246, worktree `/home/nikolas/.cache/claude-tmp/hub-16-01-15-02`) was read for
`src/hooks.server.ts` and `src/lib/server/observability-context.ts` only; 16-02's
files are disjoint from it.

## 1. Access report (generated, `bun scripts/qc/telemetry-fixture.ts --report`)

| Item | State | Meaning |
|---|---|---|
| `@sentry/sveltekit` | present, 10.66.0 | SDK + `sentrySvelteKit()` vite plugin available |
| `@sentry/vite-plugin` | present, 5.4.0 | debug-id source-map upload pipeline available |
| `@sentry/bundler-plugins` | present, 10.66.0 | upload core (`canUploadSourceMaps` gates on auth token / org / project) |
| `sentry-cli` | present, 2.58.6 (`node_modules/.bin`) | offline `--version` only; never invoked against a server |
| `SENTRY_DSN` | absent | runtime SDK is a no-op (`enabled: !!env.SENTRY_DSN` in `hooks.server.ts`) |
| `SENTRY_AUTH_TOKEN` | absent | upload disarmed (see §3) |
| `SENTRY_ORG`, `SENTRY_PROJECT` | absent | no project identity known to this executor |
| `SENTRY_RELEASE`, `SENTRY_URL` | absent | release resolves from commit sha; default SaaS host |
| `.sentryclirc`, `sentry.properties`, `~/.sentryclirc` | absent | no CLI config in checkout or home |
| Remote (org, project, releases, uploaded maps, alert rules, event receipt) | **unverified** | tooling present; no auth token or CLI config in this environment — remote state was not checked, **not proven absent** |

The report separates three states and the script's tests pin that separation:
*tooling absent* (nothing could upload or query), *tooling present / credentials
absent* (this row), and *credentials present* (still `unverified` — the fixture never
contacts Sentry; the receipt is a human-run procedure, §4). Values are never read
into the report (tested with a sentinel token and a synthetic DSN).

The 2026-09-09 research finding stands unchanged: no callable Sentry tool, no shell
variables, no CLI config, so no authenticated org/project can be identified. Nothing
was created to change that — no account, no project, no synthetic production error.

## 2. What the hub does today (source facts)

- `src/hooks.server.ts` initializes Sentry with `dsn: env.SENTRY_DSN`, `enabled: !!env.SENTRY_DSN`,
  `tracesSampleRate` (default 0.1) and `environment: PUBLIC_VERCEL_ENV ?? NODE_ENV ?? 'development'`.
  On `master` there is no explicit `release`; PR #246 (16-01) adds one validated as a 7–40 hex sha.
  Either way the Node SDK's own `getSentryRelease()` runs when `release` is undefined:
  `SENTRY_RELEASE` → injected `globalThis.SENTRY_RELEASE.id` → CI/Vercel commit-sha
  variables (`GITHUB_SHA`, `VERCEL_GIT_COMMIT_SHA`, …). So on Vercel the runtime release
  is the deployed commit sha without any code change.
- No source-map upload existed on `master` (confirmed again on this snapshot: a
  disarmed `bun run build` writes **0** `.map` files under `.vercel/output` and mentions
  Sentry 0 times).
- `src/instrumentation.server.ts` does not exist. See §5 — it is deliberately **not**
  created by this plan.

## 3. What 16-02 wires (owned files, private candidate)

`vite.config.ts` — `sentrySvelteKit()` is added **before** `sveltekit()` and only when
`process.env.SENTRY_AUTH_TOKEN` is non-empty:

```ts
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
  ? await sentrySvelteKit({
      autoInstrument: false,
      telemetry: false,
      debug: process.env.SENTRY_DEBUG === '1',
      sourcemaps: { filesToDeleteAfterUpload: ['./.*/**/*.map', './.vercel/output/**/*.map'] },
    })
  : [];
```

The delete globs are explicit on purpose. **Negative control (16-RECEIPT.md §2):** with the
plugin's documented default, an armed build whose upload fails left **845 `.map` files in
`.vercel/output/static/_app`** — the public static output. The plugin's default-glob
resolution is skipped once its sibling plugin has already set `build.sourcemap: 'hidden'`
in the same config pass. Deletion runs in the upload's `finally`
(`@sentry/bundler-plugins` rollup adapter), so with explicit globs an unreachable Sentry
still leaves no map behind.

| Build | Behavior |
|---|---|
| disarmed (no token) | byte-for-byte the previous pipeline: no `build.sourcemap` change, no debug-id injection, no upload attempt, no plugin telemetry |
| armed (token set) | plugin sets `build.sourcemap: 'hidden'`, injects debug ids, uploads by debug id at `closeBundle` (after the Vercel adapter has written `.vercel/output`), then deletes the explicit globs above — **maps never ship in the public output**, and deletion runs even when the upload fails (offline negative control in 16-RECEIPT.md) |
| release name | plugin default `detectSentryRelease()` = `getSentryRelease()` (same env order as the runtime SDK) or `git rev-parse HEAD`; `release.inject` (default true) stamps it into the bundle so runtime and artifact agree |
| `autoInstrument: false` | no wrapping of `load` functions — no runtime behavior change, no tracing change |
| `telemetry: false` | the bundler plugin sends nothing to Sentry except the upload itself |

`.github/workflows/ci.yml` — `check-and-build` gains a "Sentry access report" step
(`bun scripts/qc/telemetry-fixture.ts --report`, names only) and the Build step passes
`SENTRY_AUTH_TOKEN` (`secrets`), `SENTRY_ORG`, `SENTRY_PROJECT` (`vars`). Unset → empty
string → disarmed, i.e. today's build. The `test` job already runs
`scripts/qc/telemetry-fixture.test.ts` through the `scripts/**/*.test.ts` include.

`scripts/qc/telemetry-fixture.ts` (+ `.test.ts`) — the local fixture: builds a
marker-bearing source with the hub's own bundler (vite 8, minified, app mode), throws
from it in a **plain `node` child** (no test-runner loader, no `--enable-source-maps`),
parses the raw minified frame and resolves it through the generated map with
`node:module`'s `SourceMap`. Manifest validation rejects incomplete manifests (no/
malformed marker, non-sha release, environment outside the allowlist, missing or
mismatching resolved frame) and unsafe ones (any nested string shaped like a DSN,
`sntrys_`/`sntryu_` token, `sk-` key or bearer header).

## 4. Operator procedure — the remote receipt (pending; needs access this executor does not have)

Prerequisites (operator-owned, never committed):

1. A Sentry org + project for the hub. If one already exists it must be **reused**;
   do not create a second project to prove access.
2. An **organization auth token** (`sntrys_…`) with scopes `project:releases` and
   `project:write` (Sentry → Settings → Auth Tokens → Organization tokens).
3. The project DSN.

Configure, in this order:

| Where | Variable | Scope |
|---|---|---|
| Vercel project `minion_hub` → Environment Variables | `SENTRY_AUTH_TOKEN` (sensitive), `SENTRY_ORG`, `SENTRY_PROJECT` | Production + Preview (build-time) |
| Vercel project `minion_hub` → Environment Variables | `SENTRY_DSN` | Production + Preview (runtime) |
| GitHub repo `NikolasP98/minion_hub` → Secrets / Variables | `SENTRY_AUTH_TOKEN` (secret), `SENTRY_ORG`, `SENTRY_PROJECT` (variables) | optional second receipt from CI builds of `master` |

Then, on a **preview** deployment of the candidate (never production first):

```sh
# 1. Build receipt — the Vercel build log must show the upload, e.g.
#    "[sentry-vite-plugin] Info: Successfully uploaded source maps to Sentry"
#    (set SENTRY_DEBUG=1 in the Vercel env for the verbose variant).

# 2. Release + artifact receipt (read-only API calls; substitute org/project/sha):
curl -sS -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/releases/$VERCEL_GIT_COMMIT_SHA/"
curl -sS -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/files/source-maps/"
#    Expect: the release exists; an artifact bundle whose dist/date matches the build.

# 3. Event receipt — trigger a harmless server error in THAT preview runtime carrying a
#    unique marker, then query it by marker:
curl -sS -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/events/?query=MINION_OBS02_<marker>"
#    Expect: one event; `release` == deployed sha; `environment` == "preview";
#    top in-app frame `filename` ends with the original .ts file and `lineNo` equals the
#    source line of the throw (un-minified `context_line` contains the marker).
```

Record the outcome in `16-RECEIPT.md` §Remote with event id, release, environment,
resolved filename:line — **never** the DSN, the token or a payload body.

**Step 3 has no trigger today.** The hub has no route that throws on demand, and this
plan does not own a route file. A bounded child plan must add one (proposal: an
internal, bearer-gated `POST /api/internal/telemetry-fixture` that throws
`new Error(\`${marker} telemetry fixture\`)` only for a caller presenting the existing
internal secret, disabled in production unless explicitly enabled). Until it exists the
event receipt cannot be produced without editing an unowned file, so OBS-02 stays open
on that gap even after the token is configured.

## 5. Gaps recorded by this plan (none folded in)

- **G-4 `instrumentation.server.ts` not created.** SvelteKit 2.69.2 only loads
  `src/instrumentation.server.ts` when `kit.experimental.instrumentation.server = true`
  in `svelte.config.js`; with the file present and the flag absent the build **throws**
  (`error_for_missing_config`, `node_modules/@sveltejs/kit/src/exports/vite/index.js`
  ~L1045). `svelte.config.js` is not owned by 16-02, and moving `Sentry.init` out of
  `src/hooks.server.ts` (owned by 16-01 / PR #246) is required to avoid a second
  `init` that would replace the first client. Creating the file now would either break
  the build or double-initialize. Exact follow-up: in one child plan, (a) set the flag,
  (b) move the `Sentry.init({...})` block from `hooks.server.ts` to
  `src/instrumentation.server.ts` unchanged, (c) keep `Sentry.sentryHandle()` and
  `handleErrorWithSentry` in hooks. Nothing in OBS-02's receipt depends on it.
- **G-5 fixture trigger route** (§4 step 3).
- **G-1 Hub Sentry payload scrubbing** (from the 16-01 producer matrix) is unchanged:
  the transport still carries the raw exception; a `beforeSend` allowlist is its own plan.
- Remote receipt, release association, uploaded maps and alert proof: **pending on
  access** (§4), not on code.
