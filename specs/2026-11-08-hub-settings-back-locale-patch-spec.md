---
id: 2026-11-08-hub-settings-back-locale-patch-spec
title: Settings Back keeps one locale prefix
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub]
source: owner-authorized-settings-back-patch
---

# Settings Back locale patch

## 0. Product

The owner requested “Please proceed with the patch” after the locale-duplication diagnosis. This patch corrects the Settings Back destination while retaining the approved navigation layer.

## AS-IS

Released Hub `50c9d4e1a8ba98f683cbaf577d4eecc0ebc0ccb2` remembers the complete successful URL, including its locale. SettingsLayerHeader passes it to the shared Button. Under the app's Paraglide provider, the automatic anchor translator adds the current locale again. `/es/pos/sell` becomes `/es/es/pos/sell`, matching the owner's 404 screenshot. The original isolated Header test omits this provider. The owner requested the patch after reviewing the diagnosis in meta PR #970.

The seeded browser smoke also has a qualification obstruction: the development query-inspector logo intercepts avatar clicks. Production has no development inspector.

## TO-BE

Back renders exactly one supported locale. It preserves an already-localized remembered URL, including its original locale, query and hash. Canonical destinations and the direct-entry fallback receive the current locale once. Existing same-origin, known-route, owner and permission checks still select the destination before URL formatting. Native link semantics, keyboard/modifier behavior and unsaved-change guards remain in control.

The same behavior applies to desktop and mobile because they share SettingsLayerHeader. The original Settings layer, module navigation, collapse preferences, authorization and forms remain unchanged.

## DELTA and verification

- Format a complete return URL in `settingsLayer.returnHref`: preserve existing locale; otherwise localize its pathname; keep search/hash separate.
- Opt the Back Button out of Paraglide's automatic anchor translation with `data-no-translate`.
- Mount the actual app Paraglide provider and shared Button in regression tests. Cover both remembered/current locale combinations, both direct-entry fallback languages, query/hash, owner replacement, error-location rejection and a native link while busy.
- Keep decorative icons and unrelated UI exports outside this focused test; do not mock the translation provider, translation functions or shared Button.
- Add the missing standard SvelteKit test aliases for `$app/stores` and `$app/paths`.
- In the QA-only smoke, hide the development-inspector container before real avatar clicks. Do not force clicks or suppress application guards. Retain normal document-generation, URL, layout and Cancel/Discard assertions. Require the exact Back href and reject every observed doubled-locale main-frame navigation, including transient visits that later recover.
- Run focused red/green tests, design/token gates, full exact-head CI and the existing browser smoke. Keep independent Standards and Spec review separate. Verify the production revision and alias after release.

## Cross-check and scope

This is a correction to the approved `2026-11-07-hub-settings-navigation-layer-spec` and its `2026-11-08-hub-settings-browser-qualification-followup` proposal. The original release's explicit check waiver does not establish a passing result for this patch. No shared package, database, permissions or other module UI changes are required.

## Out of scope

Settings form redesign, other navigation links, global translation-library changes, schema changes and new permissions.

## Review and current evidence

navigation_review completed two independent source passes: Standards PASS, Spec PASS. The regression with the real provider failed on the expected repeated prefixes before the production change. The final expanded focused run passed all 28 tests in 22.70 seconds with one worker. Exact-head CI and runtime qualification remain pending.

PostHog authentication now works. Read-only Hub navigation events around the reported Settings/POS transitions were found. No completed doubled-locale pageview was captured in the bounded post-release query, and the session-recording tool reports no recording available for that session. These telemetry limits do not contradict the supplied error screenshot or the deterministic provider regression. No replay-based explanation of the subsequent recovery is claimed. Private event receipts remain local, outside the repository.

Independent source review also passed the QA-only transient-navigation assertion in Hub candidate `398276b`: both personas install the listener before navigating, and later recovery cannot remove captured malformed URLs. Application source remains identical to the focused-tested `88895ba`. Final exact-head CI is recorded when complete.
