---
id: 2026-11-08-hub-settings-back-locale-patch-spec
title: Settings Back keeps one locale prefix
stage: done
status: shipped
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

- Capture the initial successful URL in the existing router-ready onMount task after canonicalization. Observe the current successful URL as the first beforeNavigate action. This covers the first leave after a hard load and shallow query/hash changes; Settings/error destinations remain excluded and owner reconciliation is unchanged.
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

## Runtime qualification correction

Candidate 398276b passed full check/build and unit tests, then the seeded browser test failed its exact pre-guard Back href assertion: after hard-loading personal home with query/hash, Back already contained only the home fallback. All three desktop checkpoints retained the same document origin and no doubled locale. The failure is separate from the locale-formatting defect. The app now observes the current successful location before navigation begins, covering first-entry and shallow URL updates independently of initial afterNavigate timing. Independent source review verified Kit calls beforeNavigate before replacing the page URL/data, and that Settings/error/owner exclusions still apply. The existing hard-load browser case remains the required red-to-green signal; no assertion was weakened. Final candidate and run are recorded after qualification.

PostHog server telemetry also corroborated the locale defect: sanitized 404 fingerprints match the known doubled-locale Home and POS paths under the released application revision. The payload deliberately contains route templates and digests rather than raw request URLs. Event receipts and actor identifiers remain private/local; no replay-based recovery claim is made.

## Live return-context trace

The d0a14c9 QA trace established stable nonempty actor/organization ownership, origin, HTTP200 state, no page error, and allowed/known Home destination. Home already returned the fallback before opening Settings. Every captured observe call after trace attachment was for a Settings URL; no non-Settings URL was recorded before the first Settings Header. Header, state probe and navigation callbacks shared one traced memory instance. This supports a missing initial observation, not a Home authorization rejection.

Candidate 97f9bdd captures the initial successful workspace in the existing one-task-later mount handler immediately after address canonicalization. Direct Settings/error entry still remains excluded and owner data is read at execution rather than captured in a stale closure. Independent Standards and Spec source review passed this change. Temporary prototype wrappers were removed; only read-only loopback-QA snapshots remain. The unchanged hard-load query/hash assertion remains required runtime proof.

## Initial-capture runtime proof

Candidate 97f9bdd, CI run 42460375326, passed the original strict desktop query/hash Back assertion, real dirty-form Cancel and Discard, collapse restoration, browser Back/Forward, direct Settings reload fallback and 1024px vertical navigation. All session-only checkpoints retained one document generation and no doubled-locale main-frame visits. The full unit suite passed 9053 tests (289 skipped); check/build passed.

That browser run then failed because the staff mobile fixture tried Plugins, which is correctly hidden by the existing settings:manage capability. Candidate 4c08f554487113aff65011fe85f92cb4c1e9c4c2 changes only that QA expectation: assert Plugins absent, select the permitted Appearance link, require sheet closure, reopen, then Back to personal Home and require closure again. Installed Kit processes a same-URL anchor without a hash through navigation and afterNavigate, so the unchanged sheet-hidden assertion observes completion. Independent Standards and Spec source review passed; no permission or product code changed. Exact-head CI run 42461195432 remains pending.

## Final-candidate Settings runtime result

On exact candidate 4c08f554487113aff65011fe85f92cb4c1e9c4c2, CI 42461195432 completed the Settings primary navigation, Back guard and mobile parity step successfully at 2026-11-08T08:10:05Z. The complete nine-checkpoint flow passed. The same candidate passed check/build and the full 9053-test unit suite (289 skipped). The general page-conformance comparison is blocked by its missing initial ledger; the credential-free browser matrix is still pending. No merge or production deployment is claimed yet.

The final QA stack completed successfully and its retained Settings receipts contain all nine checkpoints with no repeated locale URL. Screenshots were inspected at desktop, intermediate and mobile sizes. The unrelated general conformance script reports “blocked: no ledger yet” and intentionally exits zero under the existing CI configuration; no general page-conformance pass is claimed. Candidate 4c08f55 and CI's synthetic merge eb13cee have the same verified Git tree 00feda2fbf787d7efb02a2d305783c94ef41ccab. The broader cross-browser matrix remains pending.

## Release and completion

All ten jobs in exact-source CI 42461195432 passed: 9053 unit tests (289 skipped), zero type-check errors/warnings, clean build, nine Settings browser checkpoints and 245 cross-browser cases across five projects. Independent Standards and scoped Spec/runtime review passed. The existing general page-conformance comparison remains unqualified because its initial ledger is absent; CI intentionally exits zero in that condition. It is not counted as a page-conformance pass.

Hub #641 merged as 8259be3a4710cb5461453f4ddb420fac9e823436 at 2026-11-08T08:31:13Z using the owner's existing merge-override authorization. Its Git tree equals the tested candidate/CI merge tree: 00feda2fbf787d7efb02a2d305783c94ef41ccab. No branch-protection settings changed.

Vercel production dpl_8MzvbaPk8fMeNEJY39fQzBPXktxD is READY for that exact merge revision. Both deployment metadata and the domain alias API identify hub.minion-ai.org as assigned to this deployment. At 08:35:38Z, anonymous read-only runtime checks returned the protected Settings document redirect (302), a separate Settings loader redirect payload (HTTP200), and /api/me401. Authenticated functionality was qualified against disposable seeded QA; no authenticated production mutation was used.

The Settings browser-qualification follow-up is resolved by this patch. Its legacy in-code TODO points to this now-completed record; the earlier release's waived browser gate is not retroactively marked passing. Exact receipts, nine screenshots and telemetry proof limits are in ../evidence/2026-11-08-settings-back-locale/qualification.json and its sibling files.
