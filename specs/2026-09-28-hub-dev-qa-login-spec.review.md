---
spec: 2026-09-28-hub-dev-qa-login-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob-and-quick-add
created: 2026-09-28
---

# QA login specification review

- Requirements/UI: Sol quick_add APPROVED the toggle, lazy selectable profiles, explicit sign-in, normal-login preservation, localized states, and safe document navigation.
- Standards/security pass 1: Sol guardians_dob requested a loopback request-host guard, one exact eligibility predicate, non-enumerating failures, and explicit list bounds.
- Standards/security pass 2: APPROVED after all four amendments. Production-build and backend guards precede provider calls; real SSR sessions retain normal RBAC; the response excludes secrets and auth metadata.
- Session authorization: user requested the DEV-only feature and previously authorized Sol implementation, independent approval before merge, and deployment after verification.
- Exact implementation review: APPROVED Hub commit `1657141d2cb786d5d9bb8962817c082a5ee0550f`. The final delta from the previously approved snapshot changes three test selectors from `button` to the Toggle's correct accessible `switch` role; it does not change production behavior.
- Backend evidence: 6 focused files and 53 tests passed. The independent security review confirmed bounded filter-before-cap listing, selected-ID membership queries, deterministic safe projection, generic unavailable responses, and DEV/loopback/origin/rate gates before privileged provider work.
- UI evidence: 4 focused tests passed. The independent UI review confirmed server-only availability, lazy loading, explicit submit, stale-response protection, recoverable errors, pending-state guards, truncation messaging, and same-origin redirect normalization.
- Local static gates: formatting, design lint, and token lint passed.
- Hosted CI `36520020471`: all jobs passed, including full check/build, unit tests, real PostgreSQL lanes and the production-preview negative smoke. The production preview omitted the picker and rejected direct GET/POST with 404. Local duplicate full check/build processes were stopped under memory pressure; they are not claimed as local passes.
- Browser: anonymous login page showed the toggle and loaded 18 synthetic profiles with role summaries. Selecting owner did not navigate; explicit Sign in created a real session (`/api/me` 200, owner identity), navigated to `/en/home` and rendered the authenticated home page. Owner manage-only custom-column read returned 200.
- Separate browser context: login endpoint created the seeded viewer session (`/api/me` 200), and the same manage-only read returned 403. This repeat proves the shortcut preserves normal RBAC; the viewer repeat exercised the HTTP boundary in the browser.
- Updated dev server runs at `http://127.0.0.1:5199/en/login`.
- Hub PR #404 merged at 2026-09-29 04:19:23 UTC as `b36f2191305113d4fe66d679c5659400a5922b3f`. The 14 feature files match reviewed head. Concurrent independent table/picker changes also entered master, so the full reviewed and merged trees are not claimed identical.

Production deployment and post-merge verification remain to be recorded.
