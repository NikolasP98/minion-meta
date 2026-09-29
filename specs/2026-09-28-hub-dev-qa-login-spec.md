---
id: 2026-09-28-hub-dev-qa-login-spec
title: Development-only QA profile sign-in
stage: dev
status: approved
pass: 2
verdict: approved
created: 2026-09-28
updated: 2026-09-28
repos: [minion_hub]
proposal: 2026-09-28-hub-dev-qa-login
tags: [ui, security]
---

# Development QA profile sign-in

## 0. Product

Let developers enter a synthetic QA profile from the login screen without looking up or typing a password.

## AS-IS

`src/routes/login/+page.svelte` signs in through `/api/auth/password-login` and supports signup and Google authentication. `+page.server.ts` reports Google availability only. `src/server/dev-backend.ts` gates DEV capabilities with the development build constant plus loopback Supabase API port 54421 and database port 54422. `/api/dev` handlers own authentication; existing user list and switch-user endpoints require an authenticated session. Switch-user uses GoTrue generateLink/verifyOtp and clears stale organization and identity state.

## TO-BE and invariants

1. The login page receives `qaLoginAvailable` from trusted server locals and the shared loopback request-host predicate. Only DEV sign-in mode shows a shared Toggle for QA profile login, initially off. Turning it on replaces credential, recovery, signup and OAuth controls with a themed profile Select and explicit Sign in button. Turning it off restores the normal form.
2. Load profiles lazily on toggle activation. Show loading, retryable failure and empty states; no login is triggered by loading or selecting a profile. Disable selection/toggle/submit while login is pending and avoid stale list responses overwriting a newer state. Labels show profile name/email and organization roles. EN and ES strings ship together, with semantic tokens and shared controls.
3. `GET /api/dev/qa-login` works without an authenticated session only after `requireDevBackend(locals)` and a shared predicate confirms the request URL hostname is localhost, 127.0.0.1 or ::1; non-loopback hosts return 404 before provider calls. Return `{users:[{id,email,displayName,orgs:[{orgName,roleKey}]}],truncated:boolean}`. Scan at most 5,000 auth users in pages of 200, filtering before collecting at most 500 eligible QA profiles. Set truncated when either bound cuts off potential results; expose a localized list-limited hint. Query profiles and membership only for selected IDs, and organizations only for their membership organization IDs. Sort by first organization name, role rank, name/email and ID; sort each profile’s organizations by name then role. Eligible targets are the reserved exact `qa.minion.test` email domain and the four explicit seeded `ui-audit-{owner,manager,member,restricted}@minion.test` addresses. One shared eligibility predicate trims and ASCII-lowercases the email, validates a nonempty local part and a single exact domain, and compares the four audit addresses by full equality. Do not list arbitrary local accounts, credentials, tokens, links, or raw auth metadata. Existing `/api/dev/users` remains authenticated.
4. `POST /api/dev/qa-login` accepts a validated user ID only. Guard DEV and loopback request host before any auth/database side effect, reject absent or cross-origin request evidence, rate-limit requests, and look up the current target server-side. Recheck the same QA eligibility policy; arbitrary client emails and ineligible IDs must never mint a session. Use GoTrue generateLink/verifyOtp through the existing SSR client to set genuine cookies; no seeded passwords are sent to the client, no synthetic app-auth bypass, and no email is dispatched. Unknown/missing-email/ineligible target and lookup errors use the same generic 404 code. Mint/verify failures use a stable generic failure code without admin/provider diagnostics. Same-origin evidence must not contradict an explicitly supplied Origin; missing evidence fails closed.
5. On successful login clear `active_org` and invalidate any outgoing identity cache. Return only `{ok:true}`. Navigate by document replacement to a validated same-origin relative redirect or `/`; URL normalization and backslash/protocol-relative cases cannot create an external redirect. Do not run authenticated client bootstrap under the old identity.
6. Production builds and non-QA backends or non-loopback request hosts return 404 for this route and never serialize profile lists into the login page. UI availability alone is not authority. Existing backend guards, ordinary login/signup/OAuth and authenticated user switching retain their behavior. No database migration or production tenant mutation is required.

## DELTA and qualification

- Backend: shared eligibility/list/session helpers where useful, guarded route, unit tests for non-DEV denial before provider calls, synthetic namespace filtering, invalid/unknown IDs, same-origin default deny, rate limiting, cookie minting, failure and old-session cleanup. Retain existing dev-route and auth regression suites.
- UI: server-derived availability; toggle/select states; tests for hidden production UI, lazy loading, retry/empty state, selection without login, explicit submit, pending state, safe redirect and failed-login recovery.
- Runtime: on the local QA backend, start without auth, toggle, choose owner and sign in, verify actual identity and redirected route. Repeat with a restricted persona to prove normal RBAC. Verify a production build serves no picker and rejects direct GET/POST route access, independently of UI hiding.
- Gates: focused tests, type/build, design/token lint, independent two-axis Sol review, full CI and authorized merge. Restart the user's dev server with this change and leave its URL available. Record production deployment identity separately from local QA behavior; production must not expose the feature.

## Verification

Focused UI and server tests, real local QA login and RBAC checks, production-build direct route denial, type/build checks, design/token gates, independent review and CI must pass before release.

## Out of scope

Production impersonation, arbitrary-email magic links, new identity providers, storing QA passwords in browser bundles, and changes to user or organization permissions.
