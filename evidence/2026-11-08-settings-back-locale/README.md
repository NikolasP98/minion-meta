# Settings Back locale duplication — 2026-11-08

The Settings Back link passes an already-localized remembered URL through Paraglide's automatic anchor translation. The second translation adds another locale segment. This reproduces the screenshot's `/es/es/pos/sell` destination.

Released source: Hub commit `50c9d4e1a8ba98f683cbaf577d4eecc0ebc0ccb2`. The inspected source matches that release. No product fix or new deployment was performed in this investigation.

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
