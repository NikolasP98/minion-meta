---
phase: 13-ui-qualification
plan: "12"
requirements: ["UI-03", "UI-07", "DEP-01"]
requirements-completed: []
status: locally-qualified
---

# Actual Site font delivery and layout qualification

The eight-file candidate is frozen at `/tmp/minion-13-08-dn7zbntf/checks/fonts/final.json`, SHA256 `5202fb63d548c5b6e33d2a865921640a40830b0152321932414d80ca29ef9ea1`. Root reviewed the imports, head links, builder, browser assertions and package changes. The old fallback artifact fails the new Barlow face-registration regression.

Two exact production packages, @fontsource/barlow-condensed 5.3.0 and @fontsource/barlow-semi-condensed 5.3.0, supply the existing families. Seven standard weight CSS imports preserve unicode subsets and font-display:swap. Only Google's external font/preconnect links are removed from app.html. The preceding app.css body and all tokens are byte-identical. Both exact upstream licenses are shipped in static/fonts/barlow-LICENSE.txt and the fixture output. The lock adds exactly two records and changes/removes no existing resolutions; all 392 installed font package members match verified upstream archives.

The fresh native fixture passes **21/21 browser cases**, seven each on Chromium 149.0.7827.55, Firefox 151 and Linux WebKit 26.5, with no skips, unexpected or flaky results. Every case requires registered matching FontFaces and nonempty matching document.fonts.load arrays for EN/ES sample text at all seven weights; geometry waits for font readiness. Same-origin font response bodies match emitted file hashes. Build, focused native types and design checks pass. Earlier temporary type-root setup failure is retained separately.

The artifact contains 42 emitted font assets totaling 572440 bytes. Each browser case loads seven Latin WOFF2 bodies totaling 155052 bytes. These are decoded response-body lengths, not measured HTTP transfer cost. Both complete installed packages total 3220847 unpacked bytes. Output manifests and exact commands are adjacent to the receipt.

The prior 18-case Site browser receipt remains fallback-font evidence; this fresh run qualifies affected DOM layouts with actual Barlow fonts. ECharts' own canvas font defaults are unchanged. Chat performs its own actual-font baseline and final matrix under 13-11. No native Apple hardware, real authentication, full production build, active-source adoption or deployment is certified here.
