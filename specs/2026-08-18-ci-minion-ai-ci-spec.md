---
id: 2026-08-18-ci-minion-ai-ci-spec
title: CI red — make the minion gateway DEV correctness matrix honestly green
stage: spec
status: done
pass: 2
created: 2026-08-18
updated: 2026-08-28
proposal: ci-minion-ai-ci
verdict: approved
repos: [minion]
relationship: depends-on
related: [2026-08-13-agentic-sdlc-test-quality-gates-spec]
reconcile_ignore: true
reconcile_ignore_reason: "Denied: PR #227 implemented only native-binding Slice 2 after #225 Slice 1. Slices 3-6 and a latest-completed all-green DEV correctness matrix remain unproven; recent CI repair PRs do not supply the spec's final evidence."
done_reason: "Completed: Gateway PR #242 repaired the remaining correctness matrix, and latest DEV CI run 33175879021 completed successfully with Node shards, Windows shards, Bun shadow, release-check, build, typecheck, lint, security, and protocol jobs green."
---

# CI red — make the minion gateway DEV correctness matrix honestly green

## 0. Product

The approved proposal reports:

> Filed automatically by the factory CI watch: the most recent completed run of
> this workflow on the deploy branch failed. Approving sends it into the spec
> pipeline; the fix may be code, CI config, or retiring the workflow (say which).
>
> **Definition of done:** the workflow's latest completed run on `DEV` is
> green, or the workflow is deliberately removed/disabled with rationale.

The triage adds the governing constraint:

> Known context: the bun unit job carries ~193 clustered pre-existing failures
> (see test-suite recon 2026-08-10); the spec should decide whether to fix the
> cluster roots or quarantine honestly, never blanket-skip. NEVER run the full gw suite.

**Decision:** keep and fix the workflow. It is the gateway's correctness gate. Fix shared setup,
runtime-compatibility, and test-fixture roots; do not retire the workflow, blanket-skip files,
weaken assertions, remove the Bun lane, or treat an incomplete/cancelled run as green.

## 1. Relationship recommendation

**Recommended classification: `depends-on`.** This is recommend-only; a resolver or human owns
artifact lifecycle changes.

- `2026-08-13-agentic-sdlc-test-quality-gates-spec` — this spec depends on its S1 resurrection of
  gateway CI: that work made the matrix run and exposed the clustered honest reds addressed here.

The index search also found `2026-08-18-ci-minion-ai-deploy-gateway-devprd-channels-spec`, but that
spec changes the `main` deployment workflow's Swarm contention handling, not the `DEV` correctness
matrix or test surfaces, so it is adjacent rather than overlapping.

## 2. AS-IS → TO-BE → DELTA

### 2.1 AS-IS — verified current behavior

1. At `DEV` workflow source inspected through the GitHub API on 2026-08-18,
   `.github/workflows/ci.yml` runs non-`main` pushes and PRs. Its `checks` matrix executes:
   `pnpm test` on Node, `pnpm protocol:check`, and `bunx vitest run --project=unit` on Bun after
   BAML generation and the canvas bundle. `checks` depends on the `check` job; the workflow does
   not hide the test lanes behind `continue-on-error`.
2. Completed run `31999443485` at SHA
   `02df8953a920217a2ddede63109d036f23057c29` is the latest completed `DEV` run and matches the
   current `DEV` tip; it is red.
   Docker security, scope detection, `check`, BAML, build, protocol, Android, shellcheck, secrets,
   and Windows lint passed. Bun unit, Linux Node test, Windows test, and `release-check` failed. The
   Linux Node job's `Run test (node)` step has no terminal step conclusion or retained test log and
   the job ended after roughly 56 minutes, so its exact failure remains unknown until a fresh
   instrumented run. Bun and Windows logs are available and must not be inferred from the
   proposal's truncated tail.
3. The Bun lane reached the suite and the prior recon counted approximately 193 failures across 48
   files. The current Bun and Windows logs show overlapping clustered signatures rather than 193
   independent product defects: missing `better-sqlite3` bindings on Bun; stale partial module
   mocks (`mock* is not a function`, missing exports); shared channel/Telegram fixture failures;
   temp-file races; heap exhaustion; and worker exits. High-count anchors include
   `src/channels/impl/telegram/bot.create-telegram-bot.test.ts`,
   `src/channels/impl/telegram/bot.test.ts`, the secrets store/manager/CLI tests,
   `pi-tools.before-tool-call`, `message-action-runner`, and `personal-agent-migration` suites.
4. `pnpm-workspace.yaml` permits selected native dependency build scripts but omits
   `better-sqlite3`; the duplicate `pnpm.onlyBuiltDependencies` list in `package.json` omits it too.
   `.github/actions/setup-node-env/action.yml` requests install scripts, yet the Bun log cannot
   locate `better_sqlite3.node`. This is a dependency-install contract failure, not grounds to
   skip the database tests.
5. Test orchestration has three verified contract mismatches. First, the workflow exports
   `MINION_VITEST_REPORT_DIR`, while `scripts/test-parallel.mjs` reads
   `OPENCLAW_VITEST_REPORT_DIR`, so Linux/Windows Node JSON reports are not created. Second, the
   Windows job exports `MINION_TEST_WORKERS`, while the runner reads `OPENCLAW_TEST_WORKERS`, so the
   advertised worker cap is inert. Third, `vitest.unit.config.ts`,
   `vitest.extensions.config.ts`, and `vitest.gateway.config.ts` spread the root `test` object
   without removing its `projects` array. The Windows log consequently includes `e2e` and `live`
   projects even though `scripts/test-parallel.mjs` declares only unit, unit-forks, extensions, and
   gateway runs. This accidental repeated/heavy coverage contradicts the separate nightly tier and
   materially contributes to the resource failure; removing it restores the declared PR-CI scope
   rather than quarantining a test.
6. `vitest.config.ts` uses three CI workers for the main unit project, two for extensions, and
   process forks for gateway tests. `.github/workflows/ci.yml` raises the Linux Node heap to 6144 MB
   but does not force `OPENCLAW_TEST_VM_FORKS=0`; Windows retains a 4096 MB heap and its intended
   worker override is currently misspelled as described above. The memory recon records a previous
   Linux Node lane termination under full-codebase worker load. The safe local diagnostic gate is
   `pnpm vitest run test/ci/` (36 tests); the full gateway suite must run only in CI.
7. The `release-check` log is not an unknown: `scripts/release-check.ts` rejected every extension
   package whose version differs from root `2026.8.7-dev` and directed the operator to
   `pnpm plugins:sync`. This is repository-wide extension-manifest drift, not an npm-pack-content
   failure, and its broad manifest impact must be reviewed explicitly.
8. The durable memory record `/memory/MINION/test-suite-recon-2026-08-10.md` is a hard constraint:
   the 193 Bun failures are clustered, `personal-agent-migration` was deep-read as functional, and
   the full gateway suite can crash the development box. `/memory/MINION/dev-warnings-tsgo-baseline-fixes.md`
   independently records native-addon ABI/build failures masking the secrets tests. These findings
   require root-cause fixes and CI-only full-suite proof, not quarantine by default.

### 2.2 TO-BE — target behavior and invariants

1. The latest **completed** `.github/workflows/ci.yml` run for the current `DEV` tip concludes
   `success`; every required Node, Bun, Windows, packaging, and prerequisite cell is visible and
   green, with only scope-intentional jobs skipped.
2. Node, Bun, and Windows retain their declared unit/unit-forks/extensions/gateway coverage; the
   accidental inherited e2e/live execution is not part of that contract. Bun-specific
   incompatibilities are fixed in shared test support or the smallest affected fixtures without
   weakening production behavior.
3. Native modules needed by tests are built deterministically from a frozen lockfile and verified
   immediately after install, before thousands of tests begin. Duplicate pnpm build allow-lists
   remain synchronized.
4. Tests remain behavior-bearing: no blanket file/project skip, no `continue-on-error`, no deletion
   of assertions, no replacing assertions with tautologies, and no secret/env gate that silently
   turns a test into a no-op. A genuinely unsupported Bun-only case may use a test-level
   `skipIf` only with a committed issue/proposal pointer, an explicit reason, and equivalent Node
   coverage; no such quarantine is pre-authorized by this spec.
5. Resource tuning bounds concurrency without shrinking the intended unit, unit-forks, extensions,
   or gateway include sets. The Node/Windows lane must not accidentally execute the separately
   scoped e2e/live projects through inherited configuration. A runner OOM/termination is a failed
   gate, not a flaky pass.
6. Every test lane writes machine-readable reports using the environment variable or explicit CLI
   output path its runner actually consumes. Summarization and artifact upload run under
   `always()` after a test failure or worker exit when files exist, without masking the test exit.
7. Product runtime behavior, gateway protocol, channel semantics, generated protocol artifacts,
   deployment workflows, and DEV/PRD channel mapping remain unchanged except where a failing
   behavior-bearing test proves a product regression and the smallest product fix is required.

### 2.3 DELTA — traceable transitions

1. **D1 / Slice 1:** unknown aggregate red becomes a SHA-pinned failure inventory separated into
   install, shared-fixture, Bun-runtime, product-regression, resource, and release-check roots.
   **Proof:** CI artifacts plus a PR-body inventory with rerunnable focused commands; each unique
   `(lane, failing file)` from completed reports appears once, incomplete lanes are marked
   incomplete rather than assigned invented totals, and per-lane counts reconcile with Vitest.
2. **D2 / Slice 2:** missing native bindings become a deterministic install contract.
   **Proof:** clean frozen install can construct an in-memory `better-sqlite3` database under Node
   and Bun, and secrets store/manager/CLI focused suites pass on both runtimes.
3. **D3 / Slice 3:** clustered partial-mock/setup failures become runtime-neutral shared fixtures.
   **Proof:** the listed mock-heavy cluster suites pass under Node and Bun with mutation spot-checks
   showing their assertions still fail when the subject behavior is inverted.
4. **D4 / Slice 4:** channel/session cluster failures become isolated, deterministic tests without
   changing channel policy semantics.
   **Proof:** Telegram, message-action, PI-tool, and migration focused suites pass three consecutive
   times under Bun and once under Node, with no cross-file order dependency.
5. **D5 / Slice 5:** inert resource/report controls and accidental e2e/live inheritance become a
   bounded, coverage-equivalent execution of the four intended PR-CI projects.
   **Proof:** Linux Node and Windows test lanes complete successfully; unit, unit-forks, extensions,
   and gateway include/file totals reconcile with the S1 inventory; e2e/live appear zero times in
   these lanes; and report artifacts upload even on failure.
6. **D6 / Slice 6:** plugin-version drift and every residual workflow red become fixed true defects
   or separately evidenced unrelated failures.
   **Proof:** the extension-version invariant, focused regression for each other residual, and the
   end-to-end green `DEV` run in §7.

## 3. Approach — vertical slices

Each implementation slice is sized for approximately 4–8 focused hours. Slice 1 is mandatory and
may repartition Slices 3–4 by discovered root, but may not expand their surfaces without updating
this spec in review.

### Slice 1 — reproduce and classify the exact baseline

Re-run the failing commands at the proposal SHA in CI or an equivalent disposable Linux runner;
never run `pnpm test` or the full Bun unit project on the shared development box. Capture Vitest
JSON/JUnit output for Node and Bun, plus the complete `release-check` error. Group failures by the
first causal stack, not by assertion count. Run one representative file from each group in
isolation under both runtimes to distinguish production regression from mock/runtime drift.

**Files to touch:** `.github/workflows/ci.yml` (use `OPENCLAW_VITEST_REPORT_DIR` for the Node runner,
give the direct Bun command an explicit structured output, and make summary/upload failure-safe);
`scripts/vitest-slowest.mjs` only if it cannot consume/retain those reports. No product/test file
belongs in this slice.

**Machine-checkable DoD:** `actionlint .github/workflows/ci.yml` exits 0; a workflow artifact
contains machine-readable results for every test lane that reached collection; `failed + passed +
skipped = collected` per complete lane; a worker-killed lane that returns control retains raw
diagnostics, while a lost-runner lane is marked incomplete in the PR inventory from GitHub job
metadata rather than assigned invented test totals; every reported baseline `(lane, failing file)`
is assigned one root label in the PR evidence; focused rerun commands and exit codes are recorded;
no test is changed or skipped; and a deliberately failing focused run still uploads its report
without making the test step green.

### Slice 2 — make native dependency installation deterministic

Add `better-sqlite3` to both existing pnpm allowed-build declarations, keep the frozen-lockfile
install, and add a post-install smoke check in the shared setup action that opens and closes `:memory:` under
Node. Because the current Bun lane imports the same package, run the equivalent smoke under Bun
when Bun is installed. Do not use an ad-hoc `node-gyp` command pinned to a `.pnpm` internal path.

**Files to touch:** `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml` only if pnpm changes it,
`.github/actions/setup-node-env/action.yml`, and the existing secrets test files identified by S1
only if their setup has a separate Bun incompatibility (expected anchors:
`src/secrets/secrets-cli.test.ts`, `src/secrets/manager.test.ts`, `src/secrets/store.test.ts`; verify
paths before editing).

**Machine-checkable DoD:** two consecutive clean `pnpm install --frozen-lockfile` runs build a
loadable binding; Node and Bun native smoke commands exit 0 on CI; the focused secrets cluster is
green on Node and Bun; removing the allow-list entry makes the smoke fail in the controlled
negative check.

### Slice 3 — repair shared mocks and test setup at cluster roots

Use `vi.importActual`/partial mocks or shared typed fixture factories so mocks preserve new exports
and return real `vi.fn` objects on both runtimes. Fix the smallest common setup root before editing
individual expectations. Include the model-auth missing export, identity/global-hook/autonomy mock
signatures, default `node:os` export, and temp-file lifecycle roots found by S1. Do not modify
production modules merely to accommodate a Bun mocking quirk.

**Files to touch:** `test/setup-base.ts`, `test/setup-channels.ts`, and only the S1-confirmed
mock-owner test/support files. Expected anchors to verify include tests for
`pi-tools.before-tool-call`, `message-action-runner`, `personal-agent-migration`, and the
summarization/model-auth path; exact filenames from S1's machine report become the authoritative
list in the implementation PR.

**Machine-checkable DoD:** each repaired root's focused suite passes three times under Bun and once
under Node; TypeScript reports no `any` additions; a temporary removal of one restored mock export
causes its focused test to fail; total skipped-test count does not increase.

### Slice 4 — repair channel and session isolation clusters

Reset module/global/env state between cases, use per-test temp directories with awaited cleanup,
and correct stale fixtures only where current product contracts are code-anchored. Preserve
Telegram mention, allowlist, reply-threading, topic-session, dedupe, and WhatsApp-listener behavior.
If a test exposes an actual product regression, make the smallest product fix and add a focused
regression assertion; do not update expected values merely to match current output.

**Files to touch:** `src/channels/impl/telegram/bot.create-telegram-bot.test.ts`,
`src/channels/impl/telegram/bot.test.ts`, `src/cli/commands/oauth/openai-codex-oauth.test.ts`,
`src/web/auto-reply/monitor/process-message.inbound-contract.test.ts`, and only S1-confirmed shared
channel/session fixture files or corresponding production files required by a proven regression.

**Machine-checkable DoD:** all S1 channel/session cluster files pass three consecutive Bun runs and
one Node run; randomizing file order does not change results; skipped-test count does not increase;
temporary inversion of one policy decision per root makes its regression assertion fail.

### Slice 5 — bound Node/Windows resources without reducing coverage

First obtain the missing fresh Linux Node diagnostic. Then remove inherited root `projects` from
the three single-surface wrapper configs so `pnpm test` runs only the unit/unit-forks, extensions,
and gateway groups declared by `scripts/test-parallel.mjs`; this is an orchestration correction,
not a test skip. Correct `MINION_TEST_WORKERS` to the consumed `OPENCLAW_TEST_WORKERS` name, then
tune existing controls in `vitest.config.ts` and `scripts/test-parallel.mjs`: prefer process forks
and fewer workers before raising memory further. Keep the complete include sets for all four
intended projects. Make report summary/upload `if: ${{ always() && matrix.task == 'test' }}` and
handle absent/partial files without replacing the test result. Apply further Windows-only settings
only when its log proves a platform/resource distinction.

**Files to touch:** `.github/workflows/ci.yml`, `vitest.config.ts`,
`vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`,
`scripts/test-parallel.mjs`, and its existing focused test file if present; otherwise add
`scripts/test-parallel.test.ts`.

**Machine-checkable DoD:** Linux Node and Windows lanes complete twice without worker-loss/OOM;
each intended test file is collected exactly once in its owning unit/unit-forks, extensions, or
gateway group; e2e/live files are absent from these lanes; no intended include set shrinks versus
S1; a fixture test proves configured worker/env limits reach every child process; and artifacts
upload on a deliberately failing focused run.

### Slice 6 — close residual true reds and verify release contents

Re-run the matrix after Slices 2–5. Resolve the known `release-check` red by running the repository's
`pnpm plugins:sync` contract and reviewing the resulting extension-manifest set; do not weaken or
delete the version invariant merely to make the job green. Diagnose each other residual
independently. Fix only demonstrated packaging drift or behavior regression. If upstream
movement introduces a new unrelated red, document its run/SHA and route it through the open-items
ledger rather than conflating it with this baseline; the proposal remains incomplete until the
latest completed `DEV` run is green.

**Files to touch:** the `extensions/*/package.json` files changed by `pnpm plugins:sync`, plus the
exact test/product/package file named by any other residual diagnostic. `scripts/release-check.ts`
may change only if evidence proves its invariant is wrong; `.github/workflows/ci.yml` may change
only if a residual is proven to be orchestration. No unrelated file is pre-authorized.

**Machine-checkable DoD:** every extension package version equals the root version and a deliberate
single-manifest mismatch makes `pnpm release:check` fail; `pnpm release:check` then passes against
the downloaded/freshly built artifact; every other residual has a focused regression command;
`pnpm check` and `pnpm vitest run test/ci/` pass locally; the CI-only full verification in §7 is
green.

## 4. Cross-repo impact assessment

| Impact zone | Assessment | Mitigation / alert |
|---|---|---|
| Gateway protocol → shared/hub/site/paperclip | No protocol change intended. | If a residual requires a frame/event/type change, stop and raise an unavoidable cross-repo alert; it is outside this spec and requires all consumers. |
| Channel extensions | Tests touch Telegram/WhatsApp behavior, but behavior must remain stable. | Any product fix must retain focused policy tests and trigger review of `minion/extensions/<channel>/` plus `minion/src/channels/`; do not silently broaden into a channel refactor. |
| Extension packaging | `release-check` currently rejects version drift across the extension manifest set. | Review the complete `pnpm plugins:sync` diff; preserve package names/dependencies and change only the governed version fields unless another residual proves more is needed. |
| DB schema/auth/UI/workshop/pixel office | No impact. | Schema, auth, Svelte UI, design tokens, and pixel office are untouched. |
| Factory/board | The factory observes the resulting workflow conclusion only. | No factory or board code change; latest-completed semantics remain unchanged. |
| Deployment | No impact intended. | Do not edit deploy workflows, Swarm scripts, image tags, or DEV/PRD mapping. The deploy contention spec remains independent. |

## 5. Explicit out of scope

- Adding gateway e2e/live/brain-vector nightly coverage, test-integrity lint, promotion gates, and factory
  self-test wiring already scoped by `2026-08-13-agentic-sdlc-test-quality-gates-spec`.
- Retaining the accidental e2e/live execution inside `pnpm test`; those tiers return to their
  separately specified commands/workflows while their files remain unchanged.
- Blanket quarantine, deleting tests, lowering assertions, `continue-on-error`, or accepting a red,
  cancelled, skipped, or incomplete required lane.
- Running the full gateway suite on the shared local/development box.
- Refactoring Telegram, WhatsApp, secrets storage, migrations, PI tools, or message routing beyond
  the smallest root fix proven by a failing behavior-bearing test.
- Protocol, database schema, auth, UI, deployment-channel, runner-image, or branch-protection work.
- Fixing unrelated failures introduced after the pinned baseline without a separate proposal or an
  explicit reviewed expansion of this spec.

## 6. Risks and safeguards

1. **False green through quarantine:** compare collected/passed/skipped counts to S1 and fail review
   on any unexplained coverage decrease.
2. **Fixture edits hiding product regressions:** require a temporary behavior inversion per root to
   prove the repaired assertion goes red.
3. **Runtime divergence:** every shared root runs on both Node and Bun; runtime-specific handling
   must be narrow, commented, and preserve equivalent coverage.
4. **Resource tuning masking tests:** tune workers/pools only; never change include/exclude globs as
   a resource workaround.
5. **Moving DEV:** all evidence names the tested SHA. Rebase before final verification and classify
   new failures separately.

## 7. End-to-end verification

1. On a clean disposable runner, install with the frozen lockfile, run the native-module smoke,
   then run `pnpm baml:generate && pnpm canvas:a2ui:bundle`.
2. Locally run only safe gates: `pnpm check`, `pnpm vitest run test/ci/`, and the focused files from
   Slices 2–4. Do not run `pnpm test` or the whole Bun unit project locally.
3. Push the implementation branch. Require its branch-`push` `CI` run to complete with green Linux
   Node, Bun unit, protocol, Windows test, `release-check`, and all unchanged prerequisite jobs; the
   parallel `pull_request` run may scope-skip `release-check` exactly as the existing event guard
   specifies. Confirm report totals reconcile with S1, skipped count did not increase, and e2e/live
   files were not collected by the Node/Windows correctness lanes.
4. Merge through the normal human gate, then wait for the `push` run on the resulting `DEV` SHA.
   Verify through the GitHub API that the workflow is `completed/success`, its `head_sha` equals the
   current `DEV` tip, and every required job concluded `success` (legitimate scope skips only).
5. Record the final run URL, SHA, job conclusions, test totals, and artifact names in the PR. The
   proposal's DoD is met only by this latest completed green `DEV` run.
