---
id: 2026-11-07-hub-settings-navigation-layer-spec
title: Settings owns the primary navigation layer
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-07
updated: 2026-11-08
repos: [minion_hub]
source: owner-approved-settings-workshop
---

# Settings navigation layer

## 0. Product

The owner reviewed the FigCraft proposal and explicitly requested implementation and deployment. This approves the Settings work previously deferred by the personal-navigation spec and proposal. The approved file is `.local/figcraft/minion-hub.figcraft`, page 24202, “Settings · AS-IS → TO-BE · 2026-11-06”.

## AS-IS

Hub master fac6ad07 renders a pinned Settings link in Sidebar, a Platform picker item landing on `/settings`, and a second SettingsNav column from `settings/+layout.svelte`. Topbar has its own mobile Settings footer link. SettingsNav already owns permission-filtered General, Server, Hub and Team groups, including gateway query tabs. SectionNav becomes horizontal below 1280px. Personal navigation is deployed via Hub #639.

## TO-BE

1. Settings is offered in the avatar menu on desktop and mobile. Its pinned sidebar/mobile-footer entry is removed. Global Settings no longer belongs to a module: remove its Platform item and matcher, and repoint Platform to its remaining utilities. Reliability, Marketplace, Cloud and Kill switches remain reachable. Native module settings such as `/pos/settings` remain module pages.
2. Every rendered global Settings route, including deep links, nested pages, query tabs, localized URLs and configured aliases, replaces primary navigation with the existing SettingsNav groups. No module picker, organization selector, utility row, organization-nav context menu or second Settings column appears inside this layer. The regular footer utilities/avatar remain available.
3. The header shows Settings with a keyboard-accessible Back button. Settings temporarily expands a previously collapsed desktop rail without overwriting the saved collapse preference; Back restores the normal shell and existing nav mode. A successful non-settings location is remembered for the current actor/organization, including query and hash. Back revalidates its origin, route and current permission before using it. Direct entry/reload, changed owner or denied destination falls back to `/account/home`. Normal SvelteKit navigation preserves existing unsaved-change guards; a cancelled close retains the return destination.
4. Desktop at both wide and intermediate widths and the mobile navigation sheet use one explicit primary/vertical SectionNav variant. Existing responsive section navs keep their default behavior. Search, group labels, active state, gateway `?s=` selection and permission filtering remain functional. Mobile sheet closes after successful navigation, including href and gateway-tab selections.

## DELTA and verification

- Add a route-driven Settings-layer owner and safe, actor/org-scoped return-location helper. Integrate successful-location observation into the app layout; do not change navigation-mode persistence or form ownership.
- Move default gateway-tab navigation into SettingsNav; remove the Settings layout's secondary navigation shell. Add an explicit primary variant to SectionNav, with responsive styles scoped to its default variant.
- Replace desktop/mobile shell navigation while Settings is active; add avatar entry and Back header. Remove duplicate footer entries and global Settings module ownership, including stale configured module offers.
- Tests: return URL with filters/hash/locale; direct entry; external/settings/denied destinations; identity change; cancellation followed by successful close; actual Settings nav permission and gateway selection; primary layout at 390/1024/1440px; avatar entry; no second column; native module settings retained. Use mounted/runtime checks where callbacks or reactive lifecycle matter.
- Run focused tests, full check/test/build, design/token gates, independent Standards and Spec review, exact-head CI, then merge/deploy and verify production revision/alias. Production feature mutations remain limited to local synthetic QA.

## Cross-check

The 2026-11-06 personal-navigation proposal/spec and Hub #639 establish the earlier workshop boundary; this explicit approval advances only the Settings portion. Open Hub #602 (section/page access), #626 (section creation), #628 (landing/Home semantics) and #630 (module provisioning/Settings toggles) remain separate. Preserve their contracts and all unrelated checkout WIP using isolated clones. Existing SettingsNav and route/data authorization remain authoritative.

## Out of scope

Settings form redesign, new permissions, database migrations, changes to native module settings, Home redirects, module provisioning and merging unrelated PRs.

## Independent spec review

navigation_review completed separate Standards and Spec passes. Both passed. Clarifications adopted: Back validates a known route/custom instance in addition to current access; its return point survives a cancelled dirty-form navigation; alias routes activate the layer; every responsive SectionNav rule is opt-in to the default variant; the header retains global busy feedback. The owner explicitly approved implementation and deployment after the FigCraft workshop.

## Implementation review and qualification

Hub PR #640, candidate `32e7dbc74fa858a1bad9257a225f6848c2bbd5c3`. Independent Standards and Spec source review passed. Back uses a real SvelteKit link; the existing dirty guard owns Cancel/Discard. Navigation mode is untouched and the saved rail collapse setting is retained. Canonical permission revalidation, stale built-in Settings placements, error-page return memory and dirty-navigation hash retention are covered by the implementation and tests.

Local design ratchet passed with no increased governed debt; token lint reported zero violations. Local heavy test/check runs were stopped under severe shared host memory pressure and are not counted as passing. Exact-head CI run `42452225927` passed all 9047 tests across 1013 files (289 tests/5 files skipped), typecheck and production build. The exact-source Vercel preview is READY. Browser qualification and production release remain pending.

The new seeded-QA browser smoke checks avatar entry, one Settings navigation column, search, active gateway tabs, unsaved-change Cancel/Discard, prior query/hash and collapse restoration, browser history, direct-entry reload, and 1440/1024/390px layout with staff permission filtering. The disposable stack has no live gateway: dirty state is injected into actual config memory through the Vite module, and no config save/model call occurs. Screenshots and receipts are retained as the CI `ui-audit-conformance` artifact.

Earlier attempts exposed three qualification issues. A pre-existing formula race test reused a stale definition version; it now re-reads the committed version before still requiring exactly `409/formula_dependency_in_use`. A content-only SectionShell preserves the Settings form contract without duplicating navigation; primary SectionNav explicitly ignores responsive collapse. Finally, the lazy development inspector is prebundled and awaited before the session-only browser flow, with document-generation and Back-href receipts guarding against optimizer reloads. These corrections received independent source review. The candidate run's QA database failed before bootstrap because runner port 54422 was occupied; a fresh QA-job retry is required, rather than treating the infrastructure failure as a feature pass.

## Owner release exception

On 2026-11-08, after being informed that browser QA remained pending, the owner explicitly requested “skip the check and merge”. This waives the remaining CI/browser release gate for Hub #640. The production code is unchanged from candidate 32e7dbc7; a comment-only handoff commit points to `../proposals/2026-11-08-hub-settings-browser-qualification-followup.md`. The suspected development reload correction is not claimed as browser-verified. Record production deployment independently from that deferred qualification.
