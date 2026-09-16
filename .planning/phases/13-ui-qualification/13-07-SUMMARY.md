---
phase: 13-ui-qualification
plan: "07"
requirements: ["UI-01", "UI-03", "UI-04", "UI-07"]
requirements-completed: []
status: locally-qualified
---

# Native mobile navigation parity — September 11

Eight-file candidate frozen in `/home/nikolas/.cache/claude-tmp/hub-13-02`. Evidence: `/tmp/minion-13-07-navigation-c27p_m8d/HANDOFF.md` and `final-inputs.json`. Root copied verified hashes into the combined ordinary Hub snapshot; `navigation-manifest.json` records identity. No commit or deployment occurred.

The existing Sheet/Dialog now supplies native modal behavior, Escape, background isolation and focus restoration. Mobile/desktop share the same ordered permission-filtered utility definitions. Empty denied sections disappear. Mobile controls provide44px targets; the menu closes on desktop resize. A measured footer-width defect and a second600×390 navigation-body collapse were repaired using full footer width and bounded native scrolling.

Final browser matrix39/39 (13 each Chromium/Firefox/WebKit), no skips, one worker with private cache/temp. Scoped Svelte0 errors/0 warnings; native design ratchet and token gate pass. Root inspected actual Chromium landscape and WebKit short-portrait screenshots, reviewed product diffs and independently reran4/4 navigation-policy tests in the combined snapshot. The first root attempt failed setup because the network guard was outside the new fixture root; copying the unchanged guard locally fixed setup, then all four passed. Root combined full Svelte recheck after navigation and final Calendar toolbar returned zero errors/warnings.

All20 staged blobs and24 unowned working files were preserved. The final Topbar hash is `94c5692d7d173793978efa5633b7b163f6ced537ecf517baffee0ecb36b27436`. Prior failing runs and incorrect test assumptions remain in the detailed handoff; no failures were relabelled as product passes.

These are actual component/browser results under synthetic permissions. Server authorization, authentication, live notifications, organization switching and unrelated routes remain outside this fixture. UI-07 and phase13 remain open.
