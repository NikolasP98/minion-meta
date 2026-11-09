---
id: 2026-10-03-readiness-hub-test-quality-spec
title: Hub test-quality readiness batch
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, paperclip]
tags: [test, infra, security, data]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Hub test-quality readiness batch

## 0. Product

This batch makes Hub test gates fail closed when reactive callbacks, native browser checks,
seeded QA fixtures, cross-service identity contracts, or native PostgreSQL suites do not
actually execute. The implementation is limited to test harnesses, test assertions, test and
quality-control scripts, Vitest/Playwright configuration, package scripts, and Hub CI workflow
wiring. Production UI and business behavior are outside this batch.

The authoritative starting point is Hub commit
`7ac3bfdffdd885d80fbaf2056eb22e387626a3ee`. The Paperclip comparison source is the clean
`paperclip-minion` snapshot `2abd5f7d5c63f8850f6aee989675c0b93e2bd865`, preserved for the
audit at `audits/2026-10-02-hub-gateway-recon/paperclip-hub-identity.ts`. Browser execution is
owned by the parent task and must use Browser Harness; this batch may prepare Playwright specs
and CI wiring without launching a second browser session.

## AS-IS

### Reactive test ownership (TQ-001)

`src/lib/state/async.svelte.test.ts` places seven `createAsyncResource` cases inside
`$effect.root`, and `src/lib/pacer/index.svelte.test.ts` places two debouncer cases inside the
same construct. Under the checked-in Vitest/Svelte transform, the callback is not invoked.
Assertions inside it therefore do not execute, while Vitest reports the cases as passing. The
audit probe observed an outside counter remain `0` when `1` was expected.

### Cross-service identity contract (TQ-002)

`src/server/integration/workforce-proxy.test.ts` runs an in-file copy of an older Paperclip
middleware implementation. It rejects every missing identity header and accepts arbitrary
company strings. The cited Paperclip runtime instead preserves an existing board/agent actor,
requires UUID-like company claims, parses role keys, provisions the federated identity, and
replaces the actor. A green Hub test currently proves only the local copy.

### Native browser and client gates (TQ-003, HC-031)

`tests/dependencies/security-compatibility.test.ts` contains four ordinary dependency cases
and one native editor/paste/sanitizer case guarded by `MINION_DEPENDENCY_BROWSER=1`. Hub CI
never sets the marker or provisions that browser, so the security case is always pending in
the required unit job.

The repository already contains a credential-free `critical-journeys` fixture with an exact
six-case, five-project reporter contract, but CI does not build or run it. The seeded `qa-stack`
job starts the app and performs scripted smokes, but does not run a required Playwright journey
set or reject skipped critical cases.

### Conditional E2E assertions (TQ-004 through TQ-007)

The dashboard test combines a shell smoke with an optional workforce company switch. Missing
workspaces, a missing switcher, or a one-company fixture still produce a pass. The tag-cell test
allows no options and no rendered chip. The POS category test accepts an unchanged result count.
Bulk-tag, record-peek, and custom-select tests convert missing records promised by the full QA
seed into runtime skips after authentication and route load.

### Native PostgreSQL inventory and report integrity (HS-008, TQ-008)

Ordinary Vitest excludes `*.sql.integration.test.ts`,
`brain-business-persistence.service.test.ts`, and the funnel concurrency fixture. CI assigns
native files through several independent allowlists. No single check compares every excluded
native file with all lanes, leaving five audited files unassigned.

The jobs, attachments, and principal JSON report validators enforce exact admitted files and
reject failures/skips, but accept one passing assertion per file. They have no checked ratchet
for the number of assertions expected from each source file.

## TO-BE

1. Every reactive behavior assertion runs inside a mounted Svelte owner. A canary visible to
   the test process proves the owner callback executed before behavior assertions are trusted.
2. Hub never labels a copied identity verifier as a runtime integration test. The compatibility
   lane consumes one dependency-owned verifier/contract artifact used by Paperclip runtime, and
   exercises existing actor, missing/malformed header, UUID match/mismatch, and role-key vectors.
3. Native editor/paste/sanitizer qualification is a required CI job with no `runIf` escape. Its
   result contract requires every named browser check to pass and rejects absent or pending work.
4. The existing credential-free critical-journey matrix is a required CI job and its reporter
   remains the authority for exact projects, exact test IDs, evidence, and zero skips.
5. A seeded QA Playwright lane authenticates only against the loopback QA stack, preflights its
   generated synthetic credentials and matrix receipt, and runs a named list of critical seeded
   specs. Once that profile is selected and a route is loaded, promised fixtures are required.
6. The workforce company-switch case has a deterministic two-company prerequisite and fails if
   the switcher, second company, or resulting selection is absent. Dashboard shell smoke remains
   separate.
7. Tag and category tests select named deterministic fixtures, require the resulting UI state,
   and reject no-op behavior. Missing seeded rows, entries, custom fields, tags, or categories
   fail with the relevant matrix ID in the diagnostic.
8. One checked native-test manifest enumerates every file intentionally excluded from ordinary
   Vitest and assigns it to exactly one compatible CI lane. Discovery drift, duplicate ownership,
   and missing ownership fail a unit meta-test. The five uncovered fixtures are admitted to the
   full-schema loopback PostgreSQL lane and must produce nonempty, zero-skip results.
9. Native PostgreSQL JSON contracts retain their exact-file and zero-skip checks and add a
   checked manifest of stable, named critical behavior IDs for every admitted file. Deleting or
   renaming a required behavior fails even if other assertions remain green. A per-file count
   ratchet is supplementary defense, never the semantic authority.
10. No lane contacts production, depends on remote credentials, silently starts an interactive
    browser, or treats a missing prerequisite as success.

## DELTA

### D1 — Mount reactive helpers in real Svelte owners (TQ-001)

- Add minimal test-only Svelte harness components for `createAsyncResource`, `createDebouncer`,
  and `createAsyncDebouncer` under adjacent `__fixtures__` directories.
- Render them with `@testing-library/svelte` in `happy-dom`; communicate observations through
  explicit callbacks or bound test-only state.
- Add an owner-execution canary whose observable counter/event is asserted outside component
  initialization.
- Rewrite the nine affected cases so all assertions live in the Vitest body after rendering.
  Keep the three direct `createConnectedFetch` cases and direct keyed-debouncer case independent.
- Remove the obsolete false-green explanation from the settled-day test once the harness
  limitation is no longer presented as the accepted repository state. Preserve any genuinely
  unverified settled-day rerun behavior only if it remains ledgered at the exact site.

### D2 — Replace the copied Paperclip verifier (TQ-002)

- Delete `runHubIdentityMiddleware` and its locally defined request/response verifier from the
  Hub integration test.
- Preferred boundary: extract dependency-free claim verification and path-scope decisions into
  the shared workforce identity package, make Paperclip middleware call that export, and make Hub
  test the token it mints against the same export. Paperclip-only provisioning remains in
  Paperclip tests.
- The contract vectors are: an existing board/agent actor with no header, missing header without
  an existing supported actor, malformed token, non-UUID company, matching and mismatching UUID
  path scope, valid/deduplicated `roleKeys`, and invalid role-key input.
- If the shared runtime export is not available in this batch, this item stays explicitly
  partial; an audit snapshot or a newly copied fixture is not accepted as completion. This Hub
  slice may prepare real minting vectors and a consumer test for the planned shared export, but
  it must not enable or mark that test complete until Paperclip runtime consumes that export.

### D3 — Required native dependency-browser lane (TQ-003)

- Move the browser-only fixture into a dedicated Playwright spec or equivalent required browser
  runner that directly loads the bundled editor/sanitizer fixture.
- Add a CI job that installs a pinned headless Chromium runtime, builds the fixture from current
  dependencies, executes the four named checks, writes a machine-readable report, and fails on a
  missing browser, missing case, failure, or skip.
- Keep the four non-browser dependency cases in ordinary Vitest. Remove the permanently optional
  `it.runIf` case so a default unit pass no longer resembles full browser qualification.

### D4 — Promote existing credential-free journeys (HC-031)

- Add package scripts or a checked runner that creates fresh private fixture/evidence paths,
  builds `tests/fixtures/critical-journeys`, serves only its manifest, installs/uses the declared
  Playwright browsers, runs `playwright.critical.config.ts`, and stops the owned server.
- Add a required CI job. Preserve the reporter's exact 30-result contract: CJ1–CJ6 across the five
  declared projects, all passed with runtime/network evidence and unchanged artifact digest.
- Upload the JSON receipt and failure artifacts on every run.

### D5 — Seeded QA Playwright lane and hard prerequisites (TQ-004 through TQ-007, HC-031)

- Extend the existing `qa-stack` job after the loopback app starts. Assert `.env.qa.local` exists,
  load only its synthetic `E2E_*` aliases, install Chromium, and run an explicit seeded spec list
  with JSON output.
- Add a report validator with an exact test-ID manifest and zero pending/skipped allowance.
- Split dashboard shell smoke from company switching. The strict company case runs only in the
  declared workforce integration profile and requires two deterministic company memberships;
  absence is a failing preflight rather than a conditional assertion.
- In `table-cell-select-tags.spec.ts`, require the named seeded stock tag, select it, require its
  chip, then assert alignment and the read-only remove-control contract.
- In `pos-sell-toolbar.spec.ts`, require the named seeded category, prove the baseline spans more
  than one category, require a strict result reduction, and check every visible result belongs to
  the selected category through accessible text or stable test metadata already exposed by the
  product.
- Replace post-load `test.skip` branches in `bulk-tags.spec.ts`, `record-peek.spec.ts`, and
  `custom-select-picker.spec.ts` with hard assertions naming the relevant seed matrix IDs.
  Environment/auth absence may remain a suite-level skip outside the required profile; the CI
  runner preflight makes that path impossible in the required lane.

### D6 — Single native PostgreSQL manifest (HS-008)

- Add `scripts/qc/native-postgres-manifest.ts` containing lane ownership for every file excluded
  by the ordinary Vitest configuration, including the two explicitly excluded nonstandard names.
- Add a filesystem meta-test that derives discovery from `vitest.config.ts` policy, compares it
  with the manifest, and rejects omissions, duplicates, missing files, or non-native files.
- Make lane-specific configs/contracts import their admitted file lists from this manifest so the
  inventory has one authority.
- Add the five currently uncovered fixtures to a full-schema QA/PostgreSQL config with explicit
  required-lane marker(s), run it inside `qa-stack`, emit JSON, and validate exact files, nonzero
  assertions, zero failures, and zero pending tests.

### D7 — Named native behavior manifests and count ratchets (TQ-008)

- Record stable critical behavior IDs and the current passing assertion count per admitted source
  file in the native manifest. IDs are explicit semantic labels, not ordinal positions.
- Extend jobs, attachments, principal, and the new QA-native validators to require every named
  behavior in its owning file and at least the checked count. Keep exact-file equality,
  zero-failure, and zero-pending checks.
- Add pure validator tests proving that one generic pass per admitted file, a missing or renamed
  required behavior, a below-ratchet report, a missing file, and a pending assertion fail, while
  an added passing assertion succeeds.

### D8 — Client/server bundle boundary

- Downstream browser projects are the dependency-security Chromium project, the existing
  `critical-journeys` Chromium/Firefox/WebKit matrix, and the seeded QA Chromium lane.
- E2E helpers may import deterministic scalar IDs only from browser-safe modules. They must not
  import seed executors, database clients, `$server` modules, Node-only server code, or private
  environment modules into application/fixture entry graphs.
- Extend fixture provenance or add a bundle-boundary assertion that scans the transformed module
  graph and fails if a `$server` path, `src/server/`, PostgreSQL client, Supabase admin client, or
  QA seed executor enters a client artifact. Preserve the existing server/client resolution
  conditions; never make server code resolve under a browser condition to silence a test.

## Test matrix

| Finding | Red signal before change | Required green proof | Mutation/canary |
|---|---|---|---|
| TQ-001 | Audit owner counter remains `0`; affected cases pass vacuously | Focused async and pacer suites render harnesses and execute every outside assertion | Make a harness callback omit its event or change one expected initial/loading value; suite fails |
| TQ-002 | Current Hub vectors disagree with Paperclip snapshot on existing actor and company UUID | Shared runtime-used verifier passes all identity vectors from a Hub-minted token | Change Paperclip/shared UUID or role-key decision; Hub compatibility lane fails without editing Hub fixture |
| TQ-003 | Required CI has one pending native dependency case | Dedicated browser job reports exactly four named native checks, all passed, zero pending | Omit browser or weaken sanitizer/editor result; job fails |
| HC-031 | No required browser journey job | Critical reporter records exactly 30 passed cases with evidence; seeded reporter records every named QA case | Remove/skip one CJ or seeded ID; validator fails |
| TQ-004 | Missing/one-company switcher still passes | Shell smoke passes separately; strict two-company switch changes selected company | Hide switcher or second company; strict test fails with prerequisite diagnostic |
| TQ-005 | Empty picker or missing chip passes | Named seeded tag is selected and its chip contract is asserted | Return no tag or suppress chip; test fails |
| TQ-006 | `cardsAfter === cardsBefore` passes | Named category causes strict reduction and every visible card matches | Replace category predicate with no-op; test fails |
| TQ-007 | Missing QA-LOW, entries, rows, or QA Priority becomes pending | Same absence is a failed assertion naming its matrix ID | Hide each guaranteed fixture in turn; corresponding spec fails |
| HS-008 | Manifest meta-test initially reports the five audit omissions | Every ordinary-excluded native file has exactly one lane and each lane has a report contract | Add an unassigned SQL test or duplicate a mapping; meta-test fails |
| TQ-008 | One passing assertion per admitted file is accepted | Every file contains all required named behavior IDs and meets its supplementary count ratchet | Delete/rename a required behavior while retaining other passes; validator fails; additions pass |

## Out of scope

- Production UI or business-logic changes made only to satisfy a test.
- Live/remote authentication, credentials, databases, Paperclip deployments, or production writes.
- Claiming TQ-002 complete before the shared verifier is consumed by the Paperclip runtime.
- Native assistive-technology qualification and deployment/post-merge proof.
- Repairing product failures exposed by the new gates when those failures belong to a separately
  owned readiness finding; the failing gate remains evidence rather than being weakened.

## Verification

1. Run focused pure/meta tests for the Svelte harnesses, report validators, and native manifest.
2. Run focused Vitest for all changed unit/test files.
3. Run the browser-security and credential-free critical journeys through the parent-owned Browser
   Harness runtime; retain their JSON artifacts.
4. Run the selected seeded QA specs against only `127.0.0.1:5199` after the full QA seed and
   validate the zero-skip report.
5. Run each native PostgreSQL lane against its disposable or QA-loopback database and validate
   its JSON report.
6. Run `bun run check`, the changed-file format check, and the repository test command after
   coordination with the parent because the checkout is shared and these are resource-heavy.
7. Inspect the dependency-security, critical-journey, and seeded-QA module graphs/artifacts and
   prove no server-only module entered a browser bundle.

## Safety facts and residual policy

- The reactive fix is proven only when assertions are outside the lifecycle callback and observe
  component-owned state; counting a test name or relying on an internal callback assertion is
  insufficient.
- The identity fix is proven only by code used by the Paperclip runtime or by a cross-repo job
  importing that runtime. Snapshot provenance is evidence of drift, not a replacement runtime.
- Browser success is local qualification until the CI workflow itself runs; local source review
  does not prove GitHub browser provisioning.
- Seeded E2E may use only generated synthetic QA identities and loopback endpoints. No remote/live
  service credentials are accepted.
- Any unfinished item requires both an exact-site `TODO(handoff)` and a meta-repo proposal before
  handoff. No test-only bypass, unconditional skip, or reduced assertion may be called a fix.

## D2 dependency delivery

The shared admission export is additive and preserves Paperclip normalization and
UUID v1-v5 behavior. Paperclip keeps its transactional provisioning and actor
construction. Hub and Paperclip consume the same reproducibly packed
`0.4.0-readiness.1` artifact through checked `file:vendor/...tgz` dependencies until
normal package promotion. This keeps both CI installs reproducible without an
unpublished registry range or an unreviewed npm publication. Each artifact records
its exact meta source commit, package tree, build command and SHA-256. The two
consumer digests must match, and their compatibility checks execute this export.
A normal registry release may replace the file dependency after qualification;
it must preserve the same contract and rerun both consumers. This packaging choice
was independently reviewed by Sol hub_test_fixes for install and runtime impact.
