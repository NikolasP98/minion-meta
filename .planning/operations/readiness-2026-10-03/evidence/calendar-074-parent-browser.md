# Parent calendar browser check — 07463ec1

The parent used Browser Harness with its isolated headless Chromium on loopback. The fixture compiles the real Team calendar route and components, supplies synthetic September 2026 data, and replaces navigation and external effects. It is not an authenticated full-app or production check.

At 1280 × 900, scrolling beyond seeded weeks produced two visible, dated failure banners for September 28–October 4 and October 5–11. An injected fixture-only GET transport returned HTTP 503. Changing that transport to return the same organization/timezone identity as the seed, then clicking each visible Retry, issued one new request for that week and removed its banner. The other failed week remained visible until separately retried.

At 390 × 844, the same sequence produced dated October 26–November 1 and November 2–8 errors. Both banners wrapped inside the viewport; document width stayed exactly 390 px. Each Retry recovered independently and both errors cleared. Screenshots show the failed and recovered mobile states and recovered desktop state.

**Open UI defect:** at the mobile size, presentation buttons, view tabs and date navigation overlap vertically; the linked-tags control crowds its label. No-horizontal-overflow is not full mobile acceptance. Track this in HC-029/HC-030 and verify after the toolbar slice.

The transport emitted only synthetic fixture responses. No customer, gateway or production data was read or written. The task-owned static artifact server was stopped after the check. The ordinary local headless browser remains available to the root.

Evidence: `calendar-074-desktop-recovered.png`, `calendar-074-mobile-failure.png`, `calendar-074-mobile-recovered.png`. No source code changed during this browser check.
