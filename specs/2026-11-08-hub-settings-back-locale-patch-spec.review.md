---
spec: 2026-11-08-hub-settings-back-locale-patch-spec
pass: 2
verdict: approved
reviewer: navigation_review
created: 2026-11-08
---

# Settings Back locale patch review

Standards: PASS. Spec: PASS. navigation_review completed two source passes and then reviewed the actual patch spec. Same-origin, known-route, owner and permission selection remains before URL formatting. Existing remembered locales remain intact; canonical fallback paths gain the current locale. Search and hash remain separate. The shared Button stays a native link and passes data-no-translate through to the real Paraglide preprocessor.

The regression uses the actual provider and shared Button with all four remembered/current language combinations and both fallbacks. Decorative icons and unrelated UI exports are isolated. The QA-only inspector suppression retains real clicks and application guards. The reviewer ran no heavy tests/build/browser processes; the final focused run passed 28 tests in the primary agent's isolated checkout. Full exact-head CI and runtime qualification remain required. PostHog event evidence is distinguished from unavailable replay evidence. The follow-up's stale authentication statement was corrected after review.
