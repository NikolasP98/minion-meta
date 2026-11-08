# Settings Back locale duplication — 2026-11-08

The Settings Back link passes an already-localized remembered URL through Paraglide's automatic anchor translation. The second translation adds another locale segment. This reproduces the screenshot's `/es/es/pos/sell` destination.

Released source: Hub commit `50c9d4e1a8ba98f683cbaf577d4eecc0ebc0ccb2`. The inspected source matches that release. This was the deployed source at the initial investigation; patch implementation and later qualification are recorded below.

## Confirmed path

1. `src/lib/nav/settings-layer.ts:28` stores the successful pathname, search and hash, including `/es`.
2. `src/lib/components/settings/SettingsLayerHeader.svelte:10` supplies that remembered URL to the shared Button's href.
3. The production Svelte configuration enables Paraglide's anchor preprocessor. Processing the installed shared Button rewrites its dynamic anchor through `getTranslationFunctions().handleAttributes`.
4. The app mounts `ParaglideJS` at `src/routes/+layout.svelte:178`. Its translator treats the target pathname as canonical and calls `PrefixStrategy.getLocalisedPath`, which prepends the current language. An already-localized `/es/pos/sell` therefore becomes `/es/es/pos/sell`. The route no longer identifies the POS page.

## Executable evidence

Installed `@inlang/paraglide-sveltekit` version: `0.16.1`. The probe runs the installed `translateHref` and `getTranslationFunctions` function bodies with minimal same-origin page/context inputs and the installed PrefixStrategy, URL and route helpers. Its results are retained in [translation-probe.json](translation-probe.json).

| Input | Rendered href | With translation opt-out |
| --- | --- | --- |
| `/es/pos/sell?receipt=proof#cart` | `/es/es/pos/sell?receipt=proof#cart` | `/es/pos/sell?receipt=proof#cart` |
| `/en/pos/sell?receipt=proof#cart` | `/en/en/pos/sell?receipt=proof#cart` | `/en/pos/sell?receipt=proof#cart` |

The same probe confirms a canonical `/account/home` fallback receives exactly one locale when automatic translation is enabled. The correction must preserve that fallback behavior while preventing a second translation of remembered localized URLs.

The existing mounted Header test renders the component without the app's Paraglide provider. With no translation context, the library returns the href unchanged, so that test passes while missing the production composition. Required regression coverage is the real provider plus Back in English and Spanish, including query/hash, direct fallback and dirty-form cancellation.

## Proof limits and follow-up

PostHog initially returned `UNAUTHORIZED`. After the owner reauthenticated, read-only Hub navigation events were retrieved around the reported Settings/POS transitions. The session-recording tool reports no recording available for that session, and the bounded post-release query found no completed doubled-locale pageview. No session recording was accessed. The screenshot and executable translation probe establish the malformed destination. The subsequent automatic recovery to the correct page is not established without a navigation trace or replay.

An attempted full mounted-provider probe was stopped after cold compilation exceeded its diagnostic time budget; it produced no passing test result and is not counted as evidence. Only its task-owned processes were terminated. Temporary checkout files were removed.

The automatic post-merge QA run `42453496644` failed before Settings entry because the dev-only query-inspector overlay intercepted the avatar click. It supplies no Back-navigation result and is separate from this product defect.

The existing [browser qualification follow-up](../../proposals/2026-11-08-hub-settings-browser-qualification-followup.md) owns the correction and integrated regression coverage. Its matching in-code `TODO(handoff)` is at the Back-restoration assertion in `scripts/qa/settings-navigation-smoke.ts`.

## Patch qualification

The actual provider regression and focused red/green receipts are retained in [provider-red.txt](provider-red.txt) and [provider-green.txt](provider-green.txt). The final focused suite passed 28 tests with a single worker. The source correction opts the complete Back URL out of automatic translation and captures the initial successful workspace after router readiness.

PostHog server-event corroboration is retained in [posthog-corroboration.json](posthog-corroboration.json). It contains only the known static paths, aggregate captured-event counts, release and digests; actor/session identifiers and raw telemetry remain private. Six captured error events do not imply six distinct user actions.

CI 42460375326 on 97f9bdd passed check/build and 9053 unit tests (289 skipped). Its Settings smoke passed eight checkpoints through staff mobile layout, including the previously failing desktop full-URL Back, dirty Cancel/Discard, collapse, browser history, direct reload and 1024px layout. It failed when the staff fixture expected a Plugins link that correctly requires settings:manage. Candidate 4c08f55 changes only the QA action to permitted Appearance and explicitly asserts Plugins absent. Exact-head CI 42461195432 has since passed check/build, all 9053 unit tests and the nine Settings browser checkpoints; the cross-browser matrix is the remaining pre-release job.

Both independent review axes passed: Standards and Spec. Temporary prototype wrappers were removed; the retained loopback-QA probe only reads state and is not imported by the production app.

The final candidate's nine Settings browser checkpoints passed. [qualification.json](qualification.json) records the exact candidate, identical CI merge tree, result boundaries and eventual release. [settings-navigation/checks.json](settings-navigation/checks.json) retains exact URLs/document generations; screenshots are beside it. The QA stack job is green, but the repository's general conformance comparison reports missing initial ledger and exits zero by design. Its observed measurements are not treated as a general conformance pass or evidence of new regressions. The broader cross-browser job remains pending.

## Release and completion

All ten jobs in exact-source CI 42461195432 passed: 9053 unit tests (289 skipped), zero type-check errors/warnings, clean build, nine Settings browser checkpoints and 245 cross-browser cases across five projects. Independent Standards and scoped Spec/runtime review passed. The existing general page-conformance comparison remains unqualified because its initial ledger is absent; CI intentionally exits zero in that condition. It is not counted as a page-conformance pass.

Hub #641 merged as 8259be3a4710cb5461453f4ddb420fac9e823436 at 2026-11-08T08:31:13Z using the owner's existing merge-override authorization. Its Git tree equals the tested candidate/CI merge tree: 00feda2fbf787d7efb02a2d305783c94ef41ccab. No branch-protection settings changed.

Vercel production dpl_8MzvbaPk8fMeNEJY39fQzBPXktxD is READY for that exact merge revision. Both deployment metadata and the domain alias API identify hub.minion-ai.org as assigned to this deployment. At 08:35:38Z, anonymous read-only runtime checks returned the protected Settings document redirect (302), a separate Settings loader redirect payload (HTTP200), and /api/me401. Authenticated functionality was qualified against disposable seeded QA; no authenticated production mutation was used.

The Settings browser-qualification follow-up is resolved by this patch. Its legacy in-code TODO points to this now-completed record; the earlier release's waived browser gate is not retroactively marked passing. Exact receipts, nine screenshots and telemetry proof limits are in qualification.json and its sibling files.
