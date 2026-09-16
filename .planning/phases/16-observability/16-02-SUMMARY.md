---
phase: 16-observability
plan: "02"
status: partial
requirements: ["OBS-02"]
requirements-completed: []
completed: 2026-09-11
snapshot: /home/nikolas/.cache/claude-tmp/16-02-90a50a72/minion_hub
base: minion_hub origin/master 1df0a9216ad3f7f85d989eb59cfccb779d9f7285
owned_files:
  - path: minion_hub/vite.config.ts
    before: 2e690e849aaed364d14c1657d7d0f0c8b2781b8a0a4750bbf1685c2d0f1c34ed
    after: d492fe9d22dcd24565bb7e7ae6d4df53867bd8583c0d5d8ef8270772c6dcbf90
  - path: minion_hub/.github/workflows/ci.yml
    before: 4b0efa9980d4cfd4c613c8f3a6c262a9c786d485e707c16187a5a557bc6b291c
    after: 2f817509d25ae5d7094a4cd3c27eec75b89278e57f3d66ddab741eb33c476258
  - path: minion_hub/scripts/qc/telemetry-fixture.ts
    before: absent
    after: 3b00df521aef73019434c74c8c06abd1fac3c6d5836de77cb67b85c206211d6e
  - path: minion_hub/scripts/qc/telemetry-fixture.test.ts
    before: absent
    after: b70a4a6da1225a5199757fc906dfc3e613ba705b23d641eaaf9f2915305a7641
  - path: minion_hub/src/instrumentation.server.ts
    before: absent
    after: absent (deliberately not created — G-4)
  - path: .planning/phases/16-observability/16-SENTRY-ACCESS.md
    before: absent
    after: 2bdcead5cd3e1448554a8a9550774d2f772079c5d175980ce9c87e81a6c6b8dd
  - path: .planning/phases/16-observability/16-RECEIPT.md
    before: absent
    after: 6d779b6529a065e02dd8c4ef987ca9c9337aebc70070d2ba9bf1dc87fc43f61e
---

# 16-02 source-map and telemetry receipt (OBS-02) — partial

Status **partial**: Task 1 delivered in full and Task 2's local half delivered; the
"actual environment receipt" half of Task 2 is pending on Sentry access and on a
fixture trigger route neither of which this executor has or owns. `requirements-completed`
is empty by the plan's own closure policy (a local fixture cannot substitute for the
remote receipt).

## Identities and discipline

- Snapshot: detached worktree at hub `origin/master` `1df0a921` under
  `/home/nikolas/.cache/claude-tmp/16-02-90a50a72/minion_hub`; nothing committed, staged,
  pushed, stashed or branched; main checkouts and other worktrees untouched.
- The 16-04 worktree (`hub-16-01-15-02`, PR #246, commit `8a4f576b` on top of `99715f50`)
  was read only — `src/hooks.server.ts` diff and `observability-context.ts` (for the
  `COMMIT_SHA_RE` / environment contract, mirrored in the fixture). 16-02's files are
  disjoint from #246, so the two candidates compose without conflict.
- Env: `TMPDIR=~/.cache/claude-tmp`; every gate under `env -i`; every build inside
  `unshare -rn` (no network). No `.env`, no Infisical, no DSN, no token, no Sentry call.
  The only network was `bun install --frozen-lockfile`.
- Receipts: `checks/before.txt`, `checks/after.txt`, `checks/freeze.json`, gate logs
  `checks/0*-*.log` (each ends with `exit=<code>`), `artifacts/access-report.json`,
  `artifacts/fixture-run.json`.

## Task 1 — release-map fixture and access evidence (done)

`scripts/qc/telemetry-fixture.ts` + `.test.ts`:

- Access report (names only): tooling present (`@sentry/sveltekit` 10.66.0,
  `@sentry/vite-plugin` 5.4.0, `@sentry/bundler-plugins` 10.66.0, `sentry-cli` 2.58.6);
  `SENTRY_*` all absent; no `.sentryclirc`/`sentry.properties`; remote `unverified` with a
  reason that distinguishes *tooling absent* from *credentials absent* from *credentials
  present but never contacted*. Sentinel-token test proves no value reaches the report.
- Fixture: marker-bearing source → vite 8 app-mode minified bundle → thrown in a plain
  `node` child (raw minified frame `bundle.js:1:20`) → resolved with `node:module`
  `SourceMap` to `telemetry-fixture.source.ts:5:13` = the throw line. Release =
  candidate sha `1df0a921…` (validated 7–40 hex; a version string is never accepted).
- Manifest validation rejects incomplete manifests and any nested credential-shaped
  string (negatives enumerated in `16-RECEIPT.md` §1).
- Gate: `node node_modules/vitest/vitest.mjs run scripts/qc/telemetry-fixture.test.ts`
  → **22 passed / 22, exit 0**. Red evidence during development: 2 then 1 failing
  before the same-generated-line check, the plain-node child and app-mode build were
  in place (Node's `findEntry` returns the *last* mapping for out-of-range lines; the
  Vitest loader rewrote frames; lib-mode ES output is not whitespace-minified).
- `16-SENTRY-ACCESS.md` written: access report, source facts, wiring, operator
  procedure with exact Vercel/GitHub variable placement and read-only receipt `curl`s.

## Task 2 — release upload wiring and receipt gate (local half done; remote pending)

- `vite.config.ts`: `sentrySvelteKit()` before `sveltekit()`, only when
  `SENTRY_AUTH_TOKEN` is non-empty; `autoInstrument: false`, `telemetry: false`,
  `debug` via `SENTRY_DEBUG=1`, **explicit** `sourcemaps.filesToDeleteAfterUpload`.
  Release name = plugin default (`getSentryRelease()` → `git rev-parse HEAD`), the same
  order the runtime SDK uses; `release.inject` stamps it into the bundle.
- `.github/workflows/ci.yml`: `check-and-build` gets a names-only "Sentry access report"
  step and passes `SENTRY_AUTH_TOKEN` (secret) / `SENTRY_ORG`, `SENTRY_PROJECT` (vars)
  to Build. Unset → `''` → disarmed → identical build. The `test` job already runs the
  new test file through the existing `scripts/**/*.test.ts` include.
- Gates (`16-RECEIPT.md` §2–3): disarmed `bun run build` exit 0, **0** `.map` in
  `.vercel/output`; armed offline negative control exit 0, upload failed as designed,
  **845 client + 1256 server** maps discovered, **2946 deleted, 0 left** in either output
  tree; `bun run check` 0 errors 0 warnings exit 0; prettier exit 0; `git diff --check`
  clean; fixture test re-run after every edit, 22/22.
- **Finding that changed the wiring:** with the plugin's documented default delete
  glob, the armed build left **845 `.map` files in `.vercel/output/static/_app`** (public).
  The default is skipped once the sibling plugin has set `build.sourcemap: 'hidden'` in
  the same config pass. Explicit globs fixed it (`checks/05a-…negative.log` vs
  `checks/05-build-armed-offline.log`). Without this control the plan's "maps out of
  public output" would have been asserted from documentation and been false.

## Deviations

- `src/instrumentation.server.ts` **not created** (G-4). SvelteKit 2.69.2 throws at build
  when the file exists without `kit.experimental.instrumentation.server = true`
  (`svelte.config.js`, not owned), and a second `Sentry.init` alongside the one in
  `src/hooks.server.ts` (owned by 16-01/#246) would replace the first client. Exact
  three-step follow-up in `16-SENTRY-ACCESS.md` §5. Nothing in the receipt depends on it.
- CI upload is wired as an *optional second* receipt; the deployable artifact is
  Vercel's build, so the operator procedure puts the variables in the Vercel env first.
- `bun run check` ran once per vite.config.ts revision; the final run is on the final
  files. The plan's `bun run build` gate ran three times (disarmed twice, armed once)
  because the negative control changed the config.

## Gaps / blocked (precise)

| Id | Gap | Blocked on | Unblock |
|---|---|---|---|
| R-1 | Remote receipt: release, artifact bundle, event with un-minified frame | no Sentry org/project/token available to this executor; none may be created | operator sets `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_DSN` per `16-SENTRY-ACCESS.md` §4, runs the listed `curl`s on a preview deploy, records results in `16-RECEIPT.md` §4 |
| G-5 | No route can throw the marker error in a deployed runtime | route files not owned by 16-02 | bounded child plan: bearer-gated internal `POST /api/internal/telemetry-fixture` |
| G-4 | `instrumentation.server.ts` | `svelte.config.js` + `hooks.server.ts` ownership | child plan (flag + move init) |
| G-1 | Sentry transport still carries the raw exception (from 16-01 matrix) | separate plan | `beforeSend` allowlist |
| — | Proposal entry for G-4/G-5 | `proposals/` is root-owned per brief rule 4 | root files it from this summary |

## Next gated plan

Operator access packet (R-1) → G-5 trigger route → remote receipt recorded → only then
can OBS-02 close. 16-03 (alerts) may consume `16-SENTRY-ACCESS.md` now.
