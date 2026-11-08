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

Hub PR #640, candidate ca033c60. Independent Standards and Spec source review passed after correcting localized permission rechecks, stale built-in Settings placements, error-page return memory and dirty-navigation hash retention. Back uses a real SvelteKit link; the existing dirty guard owns Cancel/Discard. Navigation mode is untouched and the saved rail collapse setting is retained.

Local design ratchet passed with no increased governed debt; token lint reported zero violations. Local heavy test/check runs were explicitly stopped under severe shared host memory pressure and are not counted as passing. Exact-head CI owns full tests/check/build and a new real seeded-QA browser smoke, including 1440/1024/390px and retained screenshots. In that CI-only smoke, gateway dirty state is injected in actual config memory because the disposable stack has no live gateway; no config save/model call occurs. Production release remains pending qualification.

QA run 42449471734 exposed an existing formula race-test assumption before the UI stage: when a definition update wins its valid race, the later archive assertion reused the pre-race version and hit CAS first. The test now reads the committed definition after both race operations settle, then still requires exactly `409/formula_dependency_in_use`. Independent review approved this test-only correction; product services and the original one-success/one-rejection race assertions are unchanged. Exact-head replacement CI: 42449792546.
