---
id: 2026-10-03-site-locale-link-spec
title: Localize Site links exactly once
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_site]
findings: [SITE-001]
tags: [ui, logic, test]
type: fix
verdict: approved
---

# Site locale link and prerender contract

## 0. Product

English Site pages must use one `/en` prefix and Spanish pages must remain unprefixed. Internal
links must keep their current language, language controls must switch the current route without
dropping its query or fragment, and the marketing prerender must finish without crawling
fabricated `/en/en/*` URLs.

This slice changes link generation only.

## Out of scope

It does not change copy, page layout, locale detection, authentication, database setup, generated
Paraglide files, or the shared Gateway session slice.

## AS-IS

Site base `7f4c3b25679e9aaa622ad695c95069fe97d00c20` and the current session candidate both compile the
SSR and client bundles, then fail during prerender. The unchanged-base receipt
`site-baseline-build.log` (SHA-256
`14e939d55569a450becb45329cb53b14c30ca78a4c0c116dfb0d8ad19d1586da`) records 3,753 SSR and
4,395 client modules followed by 404s for `/en/en/`, `/en/en/data-deletion`, `/en/en/privacy`,
`/en/en/terms`, and `/en/en/login`; SvelteKit terminates on `404 /en/en/ (linked from /)`. The
current candidate reproduces the same five URLs after 3,756/4,398-module compilation in
`site-session-build-v3.log` (SHA-256
`13d070df7a7ba4c86bc57bea04b765c696285572d69aa3bb06ebf0074c8e0cd4`). Missing local SQLite
messages are noisy but nonfatal in both runs; the doubled route is the fatal build error.

The installed `@inlang/paraglide-sveltekit@0.16.1` Vite preprocessor rewrites every `<a href>`
through the active `ParaglideJS` context. It uses `hreflang` as the target language and documents
`data-no-translate` as its explicit escape hatch. `localizedPath()` already returns a localized
path. Supplying that result to an ordinary anchor therefore localizes the same path twice.

The emitted English homepage proves the boundary:

- raw canonical hash links become correct `/en/#method`, `/en/#pricing`, and peers;
- Navbar's manually localized home and login anchors become `/en/en/` and `/en/en/login`;
- Footer's manually localized legal anchors become `/en/en/privacy`, `/en/en/terms`, and
  `/en/en/data-deletion`;
- raw legal-page anchors become correct `/en/privacy` and `/en/data-deletion`;
- `<link rel="alternate">` values remain correct because the anchor preprocessor does not process
  `<link>` elements.

There is a second navigation defect in the same shared components: Navbar/Footer section links are
`#method`, `#pricing`, and peers. On legal pages, Paraglide correctly preserves the current route,
producing links such as `/en/privacy#method`; those IDs exist only on the homepage.

## Caller inventory and disposition

| Caller                                                                               | Current input                                                               | AS-IS behavior                                               | Slice disposition                                                                                            |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/lib/components/layout/Navbar.svelte`                                            | manually localized home/login/current-route switch; relative section hashes | doubled English links; section links stay on legal pages     | pass canonical paths to anchors; use canonical current route plus `hreflang` for switch; use homepage hashes |
| `src/lib/components/layout/Footer.svelte`                                            | manually localized legal paths; relative section hashes                     | doubled English legal links; dead legal-page section targets | pass canonical legal paths; use homepage hashes                                                              |
| `src/lib/components/layout/AuthShell.svelte`                                         | manually localized home/current-route switch                                | doubled English auth chrome                                  | same canonical anchor contract as Navbar                                                                     |
| `src/routes/(app)/login/+page.svelte`                                                | manually localized register anchor                                          | doubled English cross-auth link                              | canonical `/register` anchor                                                                                 |
| `src/routes/(app)/register/+page.svelte`                                             | manually localized login anchor                                             | doubled English cross-auth link                              | canonical `/login` anchor                                                                                    |
| `src/routes/(marketing)/+layout.svelte`                                              | `localizedPath()` in `<link rel="alternate">`                               | correct URLs; not anchor-preprocessed                        | retain explicit non-anchor localization in this slice                                                        |
| legal pages and `AppBar.svelte`                                                      | raw root-relative anchors                                                   | localized once by Paraglide                                  | retain; regression-check emitted output                                                                      |
| `src/lib/locale-preference.ts` and root layout                                       | explicit programmatic resolution/replacement                                | non-anchor navigation                                        | retain                                                                                                       |
| login/register `goto`, OAuth `next`, member guard/logout and auth callback redirects | programmatic paths                                                          | outside the anchor preprocessor; some lose locale            | inventory only; handle under the separate authenticated-redirect contract below                              |

### Ordinary-anchor call-site inventory

The implementation and ratchet cover all eleven ordinary `<a>` call sites in the five changed
files. Dynamic loops count as one source call site but their internal/external variants are all
rendered in the behavior proof.

| File          | Anchor call sites | Required behavior                                                                                                         |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Navbar`      | 6                 | wordmark, desktop section loop, language switch, desktop login, conditional mobile section loop, conditional mobile login |
| `Footer`      | 1                 | dynamic product, legal and external-link variants through the shared loop                                                 |
| `AuthShell`   | 2                 | wordmark and language switch                                                                                              |
| login page    | 1                 | actual register cross-link inside the rendered footer snippet                                                             |
| register page | 1                 | actual login cross-link inside the rendered footer snippet                                                                |

## TO-BE

1. Canonical route paths are the only inputs to ordinary internal `<a href>` attributes. The
   Paraglide preprocessor owns current-language localization exactly once. External URLs and hash
   behavior remain native.
2. A language switch anchor supplies the canonical current pathname plus the current URL's opaque,
   already serialized `search` and `hash` suffix, together with `hreflang={target}`. Spanish renders
   the unprefixed path; English renders exactly one `/en` prefix. Values such as
   `/data-deletion/status?code=a%2Fb#result`, `/#pricing`, and
   `/login?redirectTo=%2Fmembers%3Ftab%3Dfiles` retain their byte-equivalent search/hash suffix.
   The switch remains a real anchor and continues to record the explicit locale preference.
3. Shared marketing section links use canonical homepage targets (`/#method`, `/#pricing`, and
   peers), so the header/footer work from the homepage and every legal route.
4. `localizedPath()` remains the explicit API for non-anchor outputs such as head metadata and
   programmatic navigation. Its comments state the actual Spanish-default, English-prefixed policy
   and warn against feeding its result into a preprocessed anchor.
5. The built HTML contains no `/en/en` link or crawl target. English internal links have one prefix;
   Spanish internal links have none. Existing correct legal cross-links and alternate URLs stay
   correct.

## DELTA and verification

### Source delta

- Reconcile all eleven ordinary anchor call sites inventoried above across Navbar, Footer,
  AuthShell, login and register: replace every manually localized internal input with its canonical
  href, root-qualify shared section targets, and preserve external anchors unchanged.
- For both language controls, derive the canonical pathname from `i18n.route(page.url.pathname)`,
  append `page.url.search` and `page.url.hash` without parsing or re-encoding them, and let the
  existing `hreflang` select the target language. The installed anchor preprocessor owns target
  localization and already preserves this suffix.
- Change shared section hrefs from `#section` to `/#section`.
- Correct the stale English-unprefixed comment and define the anchor/non-anchor ownership rule next
  to `localizedPath()`.
- Do not add `data-no-translate` to ordinary internal anchors; that escape hatch is reserved for an
  already localized value that cannot be expressed canonically.

### Proof matrix

| Proof                                                              | Expected result                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route helper table                                                 | `/`, `/privacy`, `/terms`, `/data-deletion`, `/data-deletion/status`, `/login`, and `/register` map to Spanish unprefixed and English exactly-once-prefixed URLs; already-prefixed input round-trips canonically |
| Navbar/Footer/AuthShell rendered through production Vite/Paraglide | same-language anchors localize once; ES→EN and EN→ES controls preserve path plus exact query/hash suffix; Navbar proof opens the conditional mobile menu and inspects its section and login anchors              |
| Actual login/register pages rendered in ES and EN                  | footer snippets expose canonical cross-auth anchors localized once; login query suffix survives both language switches                                                                                           |
| Shared section links rendered from `/privacy` and `/en/privacy`    | targets are `/#section` and `/en/#section`, never the current legal document                                                                                                                                     |
| Existing raw legal anchors                                         | Spanish stays unprefixed; English has one `/en` prefix                                                                                                                                                           |
| Production build                                                   | all eight prerendered pages (`/`, `/en/`, privacy, terms, data-deletion in both languages) emit; no `/en/en` crawler request; command exits zero                                                                 |
| Output scan                                                        | no emitted HTML contains `/en/en`; canonical/hreflang pairs are exact and duplicate-prefix negative assertions fail against the AS-IS output                                                                     |
| Source ratchet                                                     | no ordinary `<a>` in the five owned files receives `localizedPath(...)` directly or through a local prelocalized variable; fail the ratchet against the AS-IS source                                             |
| Repository gates                                                   | full Vitest, configured `bun run check`, `bun run lint:design`, `bun run lint:tokens`, and `git diff --check` pass with no new debt                                                                              |

The output scan and source ratchet are supplementary; source text alone is not acceptance. The
production build and mounted/rendered production components exercise the actual installed
preprocessor contract, including conditional mobile state and real auth snippets.

## Explicit adjacent boundary

Programmatic auth navigation is a distinct contract because it is not processed by Paraglide. The
current login/register/member paths include raw `goto`, `redirect`, OAuth `next`, and logout values.
In addition, `auth/callback/+server.ts` redirects an unvalidated `next` query value. That security and
locale-preservation work needs its own reviewed allowlist and server/client test matrix; this link
slice must not silently broaden into auth redirect policy. Ledger finding `SITE-002`:

> Validate OAuth/login redirect targets as same-origin root-relative paths,
> preserve the active locale across login, registration, member guards, logout and callback errors,
> and reject protocol-relative, encoded-backslash and external destinations before redirecting.

The marketing layout also emits en/es alternate links already supplied by `ParaglideJS`; deciding
whether to remove the duplicate custom pair and whether `x-default` should be Spanish needs a small
SEO-policy follow-up under `SITE-003`. Neither issue creates `/en/en` crawler targets.

## Review and release

No production source may change before Standards and Spec review accept this contract. The Site
session v4 source stays frozen and unstaged. Implementation uses exact-path staging and a separate
commit; build success is local qualification, not deployment.
