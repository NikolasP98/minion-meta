# TQ-003 production client-boundary qualification receipt

- Date: 2026-10-03
- Hub branch: `fix/readiness-hub`
- TQ-003 commit: `5f2f7c65` (`test(qc): enforce production client boundary`)
- Outcome: the production client-boundary qualification passed. TQ-003 remains
  `implemented-awaiting-integration` until the exact dedicated browser lane and its mutation proof
  run; no deployment or live-runtime verification was performed.

## Required production build

Command, from the Hub checkout:

```sh
CI=1 PUBLIC_DEFAULT_ORG_SLUG=ci PUBLIC_POSTHOG_HOST=https://posthog.invalid PUBLIC_POSTHOG_KEY=ci bun run build
```

Full log: `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/tq003-postwire-build.log`

The standard build invoked the client Rollup module-graph gate, emitted-artifact scanner, and two
real Vite mutation canaries. Its final receipt was:

```json
{
  "label": "SvelteKit client",
  "modules": 1978,
  "artifacts": 875,
  "violations": 0,
  "rollupModules": 4560,
  "rollupGraphSha256": "5b198da76da5190a5a05ca24077f58a1355f5c5497d63b9ac8508d5ca312e4be",
  "outputDirectories": 36,
  "scannedBytes": 21481670
}
```

The canary rejected both a real client bundle that imported a side-effectful `src/server` module and
a real client bundle that emitted `SUPABASE_SERVICE_ROLE_KEY`. Build exit status was 0. The existing
Paraglide PostHog network-flush warning and adapter optional-dependency warnings remained nonfatal.

## Type and focused checks

```sh
CI=1 PUBLIC_DEFAULT_ORG_SLUG=ci PUBLIC_POSTHOG_HOST=https://posthog.invalid PUBLIC_POSTHOG_KEY=ci bun run check
bunx vitest run scripts/qc/client-bundle-boundary.test.ts scripts/qc/client-build-boundary-wiring.test.ts scripts/config/sveltekit-outdir.test.ts
bun run test:client-build-boundary
bun run test:client-build-boundary-canary
git diff --cached --check
```

Type-check log: `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/tq003-check.log`

- Svelte check: 0 errors, 0 warnings.
- Focused Vitest: 21 tests passed in 3 files.
- Real output scan: passed with the receipt above.
- Real-bundle mutation canaries: both rejected for the expected boundary reason.
- Cached diff check: passed before the exact seven-file commit.

## Original TQ-003 acceptance reconciliation

The audit's “five tests” and “four browser checks” describe two different levels of the old file.
At baseline `7ac3bfdf`, `tests/dependencies/security-compatibility.test.ts` contained five Vitest
cases: four ordinary cases plus one `it.runIf(MINION_DEPENDENCY_BROWSER === "1")` composite browser
case. That fifth case internally required exactly four checks: prototype attributes, editor paste and
Markdown, ordinary sanitizer, and detached sanitizer subtree. Default CI reported the first four as
passed and the fifth as pending.

Commit `0881493c` removed the optional composite case. The ordinary file now has exactly four tests;
`bunx vitest run tests/dependencies/security-compatibility.test.ts` passed 4/4 with zero pending.
Log: `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/tq003-unit-compatibility.log`.
The dedicated `dependency-security-browser` CI job now discovers four separately named Playwright
tests, `DS1` through `DS4`; its checked-in step is explicitly named “Run all four native dependency
checks.” It no longer uses the old optional marker. The runner instead fails closed unless
`PLAYWRIGHT_BROWSERS_PATH` names an installed absolute cache, and it fails on missing/discovered/
duplicate/skipped/failed cases or a non-passing receipt. The missing-browser negative exited 1 before
build or launch; its log and receipt are:

- `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/tq003-missing-browser-negative.log`
- `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/tq003-missing-browser-runner-receipt.json`

The parent-owned Browser Harness read proved the four fixture behaviors against Headless Chrome 152
at `/home/nikolas/.cache/codex-implementation/2026-10-03-hub-gw/dependency-parent-proof/browser-harness-proof.json`.
It is useful behavior evidence, but it is not an execution of the checked-in Playwright runner,
artifact reporter or GitHub Actions job. No exact `dependency-results.json`/passing runner receipt or
forced editor/sanitizer mutation-red receipt exists yet. The literal old five-test total therefore
must not be reported as five native cases: current truth is four ordinary Vitest cases plus four
native Playwright cases. Closure still requires the exact CI-shaped four-case browser run, zero
missing/duplicate/pending tests, and a forced editor or sanitizer mutation that makes that lane red.

## Scope and limits

The production build ran from the shared checkout immediately before commit `5f2f7c65`; the TQ-003
runtime source was the committed source except for later JSDoc-only type annotations. Concurrent
Calendar Slice 5 and money work was present in the shared working tree. The receipt therefore proves
the boundary gate against that generated production graph, not the final combined readiness branch.
In particular, it predates later root money changes. The committed gate is on the normal `bun run
build` path, so every future production build must regenerate and validate the actual client graph.
A final branch/release build remains a separate integration and deployment gate. The module-graph and
emitted-content canaries protect production client/server boundaries; they are supporting TQ-003
evidence and do not substitute for the editor/paste/sanitizer browser mutation required above.
