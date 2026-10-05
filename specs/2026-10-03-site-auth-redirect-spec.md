---
id: 2026-10-03-site-auth-redirect-spec
title: Keep Site authentication redirects local and locale-stable
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_site]
findings: [SITE-002]
tags: [security, logic, test]
type: fix
verdict: approved
---

# Site authenticated redirect contract

## 0. Product

After sign-in or registration, Site may continue only to an authenticated Site route. A Spanish
visitor remains on the unprefixed Spanish route and an English visitor remains under `/en`. A
malformed or attacker-controlled continuation falls back to that locale's member home; it never
becomes a server `Location` or client navigation target.

This closes `SITE-002` for email/password and Supabase Google OAuth without changing either
provider's session or identity-sync behavior.

## Out of scope

- OAuth provider configuration, scopes, PKCE/session exchange, cookie shape, and
  `syncGoogleLogin()` are unchanged.
- This does not create password reset, add member routes, change authorization, or claim that the
  source-confirmed redirect resulted in credential or session theft.
- Ordinary anchor localization remains owned by approved `SITE-001`; alternate head metadata is
  `SITE-003`.
- Gateway authenticated-session lifecycle files, shared artifacts, package pins, and token audit
  files in the same worktree are untouched.
- The implementation is a Site-specific authenticated-continuation seam, not a generic redirect
  framework.

## 1. AS-IS

The repository base is `7f4c3b25679e9aaa622ad695c95069fe97d00c20`. The working tree also
contains the accepted, unstaged `SITE-001` candidate identified by manifest SHA-256
`dd0e7808bfc2c40f2456415c884e4d1a8536c4fe5237a4b13d419037a0cb0c5a`; this slice must
preserve it.

`src/routes/(app)/login/+page.svelte:21` reads `redirectTo` directly from the URL. Lines 29–35 send
it to `goto()` after password login, and lines 49–56 embed it as `next` in the OAuth callback URL.
There is no local-path grammar or authenticated-route allowlist.

`src/routes/auth/callback/+server.ts:8-25` reads `next`, exchanges the code, synchronizes the user,
then gives the raw value to SvelteKit's `redirect(303, next)`. The installed SvelteKit redirect
primitive accepts an absolute destination; `site002-sveltekit-redirect-baseline.log` (SHA-256
`2bf19c79b586bc91d7d17bc3545ab819139ebf080bdecf4401b99a6d5cdc2262`) records
`{"status":303,"location":"https://attacker.example/after-login"}`. This is a source- and
primitive-confirmed open redirect after successful authentication. No production exploit or
session theft was attempted or established.

Programmatic auth navigation also loses locale and intent:

- registration success and its OAuth `next` use fixed `/members`
  (`register/+page.svelte:37-48,60-69`);
- the member guard redirects to fixed `/login` without the requested route
  (`members/+layout.server.ts:7-10`);
- logout assigns fixed `/login` even from English members
  (`AppBar.svelte:35-41`);
- callback error branches use fixed Spanish-default `/login`
  (`auth/callback/+server.ts:10,14`).

Paraglide preprocesses ordinary anchors. It does not validate values consumed by `goto()`,
`redirect()`, `location`, or the Supabase OAuth option, so `SITE-001` cannot close this boundary.

## Caller inventory and disposition

| Caller                                       | AS-IS input/effect                                                   | Required disposition                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(app)/login/+page.svelte`        | raw `redirectTo` drives password `goto` and OAuth `next`             | validate once per current page URL; use only the approved value; preserve it through the register cross-link                                             |
| `src/routes/(app)/register/+page.svelte`     | fixed `/members` drives password and OAuth success                   | accept the same approved continuation; preserve it through the login cross-link                                                                          |
| `src/routes/auth/callback/+server.ts`        | raw `next` becomes post-session `Location`; errors go to fixed login | validate before auth side effects, use only the approved value after success, and return failures to the same locale with only the approved continuation |
| `src/routes/(app)/members/+layout.server.ts` | fixed `/login`; requested path/query lost                            | derive locale and approved member target from the request, then redirect to localized login with encoded continuation                                    |
| `src/lib/components/members/AppBar.svelte`   | fixed `/login` after sign-out                                        | route to localized login; no post-logout continuation                                                                                                    |
| `src/lib/components/layout/AuthShell.svelte` | language switch preserves the opaque current query                   | unchanged; the destination page revalidates and relocalizes `redirectTo` for its new active locale                                                       |
| Navbar/auth ordinary anchors                 | Paraglide-owned canonical anchors                                    | unchanged by this security slice                                                                                                                         |
| Supabase exchange and `syncGoogleLogin`      | session establishment and identity persistence                       | unchanged; unsafe input cannot change their parameters or final destination                                                                              |

Search found no other production `redirectTo`, OAuth `next`, auth `goto`, member-guard redirect, or
logout navigation caller.

## 2. TO-BE

### One bounded server/client parser

Add a pure module under `src/lib/auth/` used by every caller above. It accepts a raw continuation
after the platform's one `URLSearchParams.get()` decode and an optional preferred active locale. It
returns a frozen result such as `{ href, locale, accepted }`; callers never retain or publish the
raw input.

The parser applies this exact grammar:

1. The complete UTF-8 input is at most 2,048 bytes. Missing input uses `/members`.
2. A candidate begins with exactly one literal `/`. Schemes, hostnames, credentials,
   protocol-relative forms, raw backslashes, controls, NUL, and whitespace prefixes are rejected.
3. Percent encoding must be well formed. The routing pathname rejects encoded or repeatedly
   percent-encoded `/`, `\\`, `.`, and control syntax. Decoding must not introduce a backslash,
   control, empty segment, `.` segment, or `..` segment. Query and fragment bytes remain opaque
   after their percent syntax and decoded control characters are validated; they are never parsed
   as routing authority.
4. Canonicalizing the localized pathname through the existing `i18n.route()` must produce
   `/members` or a segment-bounded descendant of `/members`. `/login`, `/register`,
   `/auth/callback`, `/api`, marketing routes, and prefix lookalikes such as `/membership` are not
   post-auth continuations.
5. The accepted canonical path is resolved once through existing i18n policy. A preferred locale
   from the active login/register/member URL wins. At the unlocalized callback, the locale is
   derived only from an otherwise-valid localized continuation; invalid input falls back to
   Spanish `/members`.
6. The original, already serialized query and fragment are appended unchanged to the localized
   accepted pathname. The server member guard cannot receive a fragment and does not invent one.
7. Any rejection returns localized `/members` and `accepted:false`; unsafe bytes are absent from
   navigation, error redirects, logs, and UI.

The implementation uses bounded checks. It does not repeatedly decode until success and does not
let WHATWG URL normalization turn an ambiguous input into an accepted route.

### Auth flow behavior

1. **Member guard:** an anonymous request for `/members?tab=files` redirects to
   `/login?redirectTo=%2Fmembers%3Ftab%3Dfiles`; `/en/members?tab=files` redirects to the English
   login with the English member target. Authentication and member DB reads remain unchanged.
2. **Login and register:** both pages validate the query against their current locale. Password
   success uses the approved href. Their cross-auth anchor carries the approved continuation so
   switching between account creation and login does not discard intent. `SITE-001` still owns
   outer-anchor localization exactly once.
3. **OAuth admission:** Supabase receives a same-origin `/auth/callback` URL whose encoded `next`
   is already approved. Callback validates `next` independently before code exchange; client
   validation is never trusted as server authority.
4. **OAuth success:** only the server-approved href becomes the 303 `Location`. The exchange and
   identity sync still complete exactly once.
5. **OAuth error:** missing-code and exchange-failure destinations are localized login routes and
   include only an approved continuation so a retry retains intent. Invalid raw input is not
   reflected.
6. **Logout:** after `signOut()` settles or rejects, the current page locale selects `/login` or
   `/en/login`. The prior member target is not retained after logout.

## 3. DELTA

Expected production ownership, subject to review:

- new `src/lib/auth/redirect-target.ts` plus focused tests;
- `src/routes/(app)/login/+page.svelte`;
- `src/routes/(app)/register/+page.svelte`;
- `src/routes/auth/callback/+server.ts` plus route tests;
- `src/routes/(app)/members/+layout.server.ts` plus guard tests;
- `src/lib/components/members/AppBar.svelte` plus mounted logout coverage;
- additive auth cases in the existing `tests/locale-links` harness where cross-auth anchors now
  retain the approved continuation.

No generated Paraglide file, package/lock file, shared-session file, schema, or provider setting is
part of the delta.

## Test matrix

| Boundary                  | Required proof                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted parser table     | Spanish and English `/members`, a segment descendant, and query/fragment values normalize to the active locale and preserve the exact suffix                                                                                                            |
| Rejection table           | `http:`, `https:`, `//host`, credentials, raw/encoded/nested-encoded slash or backslash in the pathname, dot segments, controls, malformed `%`, whitespace, oversized input, `/membership`, auth/API/marketing paths all fall back locally              |
| Login mounted page        | password success navigates only to the approved target; invalid input uses localized member home; Google receives same-origin callback plus encoded approved `next`; provider rejection remains on the page                                             |
| Register mounted page     | password and Google use the same approved continuation; login/register cross-links retain it in both locales                                                                                                                                            |
| Callback route            | success with safe next yields local 303 after one exchange/sync; absolute, protocol-relative, encoded-backslash and malformed next values yield local member home; missing-code/exchange-failure yields localized login and never reflects unsafe input |
| Member guard              | anonymous ES/EN requests retain the bounded requested member path/query; authenticated load behavior and DB projections are unchanged                                                                                                                   |
| Logout mounted component  | ES/EN navigate to localized login even if sign-out rejects; no external or stale continuation survives                                                                                                                                                  |
| Locale-switch interaction | changing language on login/register keeps the serialized query; the destination page revalidates and relocalizes the member target rather than trusting the old prefix                                                                                  |
| Negative control          | restoring raw `next` at the callback produces the external `Location` and fails the fixed assertion; bypassing the client parser fails mounted password/OAuth cases                                                                                     |
| Blast radius              | accepted `SITE-001` locale-link cases, gateway-session tests, full Site tests/check/build, design lint and token lint remain green                                                                                                                      |

No test may treat a source-text assertion as proof that redirects are safe. The route handler and
mounted production pages must execute their real navigation seams with synthetic auth/provider
adapters.

## Verification

Before commit:

1. run the parser, callback, guard, mounted login/register/logout, and existing locale-link suites;
2. run the negative controls against isolated/restored bytes;
3. run full Site tests and configured `bun run check`;
4. run `bun run build`, `bun run lint:design`, `bun run lint:tokens`, and `git diff --check`;
5. record exact source hashes and distinguish local qualification from deployed OAuth proof.

After deployment, use a disposable test account and no privileged production mutation beyond the
normal login itself. Verify a safe English continuation and a malicious external continuation
against the real provider callback. Record only redacted route/Location evidence; do not capture
codes, cookies, provider tokens, or credentials.
