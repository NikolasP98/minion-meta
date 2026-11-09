---
id: 2026-10-03-site-alternate-metadata-spec
title: Publish one Spanish-first Site locale alternate set
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_site]
findings: [SITE-003]
tags: [logic, test]
type: fix
verdict: approved
---

# Site locale alternate metadata contract

## 0. Product

Each public marketing document publishes one English alternate, one Spanish alternate, and one
Spanish `x-default`. All three use the single canonical production origin and the canonical route
for that language. Authenticated, auth-callback, and API surfaces publish no locale alternate
metadata.

This closes `SITE-003` without changing visible copy, routing, or `SITE-001` anchor behavior.

## Out of scope

- This slice does not change locale detection, URL prefixes, ordinary anchors, authentication,
  page copy, titles/descriptions, structured data, sitemap generation, or domain redirects.
- `static/robots.txt` and the absence/policy of a sitemap are adjacent SEO concerns, not silently
  changed here.
- It does not edit generated Paraglide files, packages, token artifacts, or Gateway session code.
- The non-prerendered data-deletion status page retains the marketing layout's document-level
  alternate policy; this slice does not add `robots` directives or expose its query value.

## 1. AS-IS

The repository base is `7f4c3b25679e9aaa622ad695c95069fe97d00c20`, with the accepted
unstaged `SITE-001` candidate (manifest SHA-256
`dd0e7808bfc2c40f2456415c884e4d1a8536c4fe5237a4b13d419037a0cb0c5a`).

The root `src/routes/+layout.svelte:7-25` wraps every route with installed
`@inlang/paraglide-sveltekit@0.16.1`'s `ParaglideJS`. Its `AlternateLinks.svelte` (installed file
SHA-256 `61043d17f62c6f08d635e7042af15f277a0398d8434971de38d14cdb5cd9bdc0`) emits one
link per configured language unless `i18n.config.seo.noAlternateLinks` is true or the route is
excluded.

The marketing layout independently emits another English/Spanish pair and an `x-default`
(`src/routes/(marketing)/+layout.svelte:11-26`). Its `x-default` is explicitly English even though
`src/lib/i18n.ts:15-25` configures Spanish as the unprefixed product default.

The accepted `SITE-001` build provides executable baseline evidence. Artifact
`site003-alternate-baseline.json` (SHA-256
`b55a225c0e0c3dbbfc2ff20b5c6eaf2f2ed1f47f4698bc9fa61d462c33b1ca05`) parses all eight
prerendered documents. Every document contains five alternates: two identical `en` links, two
identical `es` links, and one English `x-default`. Their origin is the SvelteKit prerender sentinel
`http://sveltekit-prerender`, not a production canonical origin. The English homepage metadata
ends in `/en/`, while the built Vercel route table redirects `/en/` to the public no-trailing-slash
route `/en`; alternate metadata should not point through that redirect.

The root automatic authority applies to every path not matched by `exclude`. The current exclude
list contains only `/api`, despite a comment saying auth is excluded. Source inspection therefore
shows that login, register, members, and `/auth/callback` also receive automatic alternates when
rendered. They are not prerendered, so the eight-page artifact does not claim runtime capture of
those routes.

## Authority and route inventory

| Surface                                              | AS-IS authorities                                        | TO-BE authority and policy                                                      |
| ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/`, `/privacy`, `/terms`, `/data-deletion` in ES/EN | Paraglide root pair plus marketing-layout pair/x-default | marketing alternate helper/layout only; exactly `en`, `es`, Spanish `x-default` |
| `/data-deletion/status?code=…` in ES/EN              | same two authorities; href omits query                   | marketing authority only; document route only, never the code/query             |
| `/login`, `/register`                                | Paraglide root pair by source contract                   | no alternates                                                                   |
| `/members` and descendants                           | Paraglide root pair by source contract                   | no alternates                                                                   |
| `/auth/callback`                                     | Paraglide root pair by source contract                   | no alternates                                                                   |
| `/api/*`                                             | excluded from Paraglide                                  | no alternates, unchanged                                                        |
| ordinary anchors and language switchers              | Paraglide preprocessing                                  | unchanged; `SITE-001` remains authoritative                                     |

Search found no other production `<link rel="alternate">`, `hreflang`, or `x-default` producer.

## Product policy decision

Spanish is the existing `defaultLanguageTag`, is unprefixed, and is the documented primary market.
`x-default` therefore resolves to the same URL as the Spanish alternate. It does not resolve to
English and does not invent a language-neutral landing page.

The provisional canonical production origin is `https://www.minion-ai.org`, per parent direction
and the last stored production browser qualification. Read-only `vercel inspect` on 2026-10-03
shows both `www.minion-ai.org` and `minion-ai.org` attached to the same READY production deployment;
the receipts are `site003-vercel-www-inspect.log` (SHA-256
`93ef8058fbf6a9d1fc6f58b037dfb23148416935a6fc2a1456f61bb0a77e5698`) and
`site003-vercel-apex-inspect.log` (SHA-256
`42262b3dd89b64d86f84bf5c2dcf6cfaf5ecc3a8165597aacb3953096b506835`).
The repository and built Vercel route table contain no host-redirect rule or competing canonical
constant. The metadata origin must be represented once in code and remain stable during prerender
and SSR; `page.url.origin` and SvelteKit's `http://sveltekit-prerender` sentinel are not authority.
The post-deploy read-only check must record actual apex-to-www behavior rather than infer it from the
alias list.

## 2. TO-BE

1. Set `seo.noAlternateLinks: true` on the existing i18n adapter. `ParaglideJS` continues to own
   locale context, `lang`, anchor preprocessing, and route resolution; only its automatic head
   producer is disabled.
2. A focused pure helper is the sole locale-alternate projection. It accepts the current pathname,
   canonicalizes it with `i18n.route()`, resolves English and Spanish once with the existing i18n
   policy, applies the deployed no-trailing-slash shape (`/` remains `/`; English home is `/en`),
   and joins them to the approved canonical origin.
3. The helper returns exactly three frozen records: `en`, `es`, and `x-default`. `x-default.href`
   equals `es.href`. It accepts no caller-selected origin or language set.
4. The marketing layout renders those records. It does not also map a second language list or use
   request/prerender origin.
5. Query and fragment are absent from alternate metadata. The status confirmation `code` is never
   copied to `<head>`.
6. Root, auth, app, callback, and API layouts add no second producer. Auth and application pages
   consequently contain zero alternate links.
7. Existing Spanish/English route shapes remain: Spanish unprefixed; English exactly one `/en`.
8. Comments next to `exclude`, `localizedPath`, and the marketing producer describe their actual
   ownership. They do not claim that `exclude` alone controls auth SEO output.

## 3. DELTA

Expected production ownership:

- `src/lib/i18n.ts`: disable automatic alternates and correct ownership comments;
- new focused locale-alternate helper and test under `src/lib/seo/` (or an equivalently small
  existing Site metadata module);
- `src/routes/(marketing)/+layout.svelte`: consume the sole projection and remove the second local
  map/English x-default;
- actual head/render and prerender-output tests under `tests/`;
- no visible UI or message changes.

The change shares `src/lib/i18n.ts` and the marketing layout with accepted `SITE-001`; implementation
must preserve the exact link-localization functions and re-run that slice's complete proof.

## Test matrix

| Boundary                | Required proof                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure projection         | `/`, an already-English path, each legal/data-deletion path, and status path produce exactly one canonical absolute `en`, `es`, and Spanish `x-default`; English home is `/en`; query/hash absent |
| Installed root behavior | `i18n.config.seo.noAlternateLinks === true`; a root-only login/register/member harness renders zero alternates while Paraglide anchor translation still works                                     |
| Actual marketing layout | ES and EN renders contain exactly three links with unique hreflang values; `x-default.href === es.href`; no request or sentinel origin appears                                                    |
| Production prerender    | all eight emitted HTML documents contain exactly the approved three-link set, no duplicate `en`/`es`, no `/en/en`, and no `http://sveltekit-prerender` metadata                                   |
| Dynamic status          | synthetic SSR/mounted URL with `?code=secret#result` emits route alternates without `code`, fragment, or raw suffix                                                                               |
| Exclusion policy        | login, register, members, callback and API fixtures contain zero alternate links; marketing routes remain included                                                                                |
| Negative controls       | enabling installed automatic links makes the marketing count exceed three and fails; changing x-default to English fails; request origin or restored `/en/` fails canonical output assertions     |
| Blast radius            | accepted `SITE-001` eight-page build, locale-link mounted cases, full tests/check/build, design lint and token lint stay green                                                                    |

Source-text scans are ratchets only. Acceptance parses actual rendered heads and build output.

## Verification

Before commit:

1. bind the provisional `https://www.minion-ai.org` origin in one constant and its tests;
2. run the focused projection/head tests and all `SITE-001` locale-link cases;
3. build all eight prerendered pages and parse every emitted `<link rel="alternate">`;
4. run full Site tests, configured `bun run check`, `bun run lint:design`,
   `bun run lint:tokens`, and `git diff --check`;
5. record exact source/output hashes and retain the five-link baseline artifact for before/after
   evidence.

After deployment, perform read-only head inspection at the canonical production host for Spanish
and English home/legal pages plus login. Confirm three links on marketing pages, zero on login, the
approved origin, and Spanish `x-default`. Deployment or HTTP success alone is not SEO acceptance.
