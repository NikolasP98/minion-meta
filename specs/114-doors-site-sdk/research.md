# Research: Doors site SDK

Hub facts below were read at `minion_hub` `960f352f` (2026-11-13). Anchors are hub-relative.

## R1. Where the embeddable renderer lives
- **Decision**: a new renderer in the hub with no hub-app dependencies, `src/lib/doors/embed/` (Svelte 5, own scoped CSS on CSS custom properties, own small message catalog, explicit `baseUrl` and `lang` props, no zod: light client checks only, the hub validates). A separate build compiles it as the custom element `minion-door` into `static/doors/v1.js`, a classic script served by the hub. The hosted page uses it only for doors whose config has new keys; other doors keep today's `Public.svelte` body for one release.
- **Rationale**: one renderer for hosted page and embed (FR-013). Served from the hub, the script always matches the API it calls; no npm publish sits between a hub change and sites. The current `Public.svelte` cannot be embedded: root-relative URLs (`:80`, `:128`), `@minion-stack/ui` Tailwind classes, hub token CSS from `src/app.css`, and Paraglide's app-global locale.
- **Alternatives**: (a) compile today's `Public.svelte` with all hub CSS into a shadow root — large bundle, hub theme on a foreign page, English only; (b) renderer in a meta package consumed by the hub — every form change needs a package release before the hub can ship, and meta `dev→main` releases are owner-paced; (c) iframe of `/d/<slug>` — simplest, but cannot inherit the page's typography, needs resize messaging, and third-party iframes lose storage; kept as a fallback idea, not built.

## R2. Built-in strings without Paraglide
- **Decision**: `embed/messages.ts` holds about 35 strings in es, en, pt, chosen by the element's `lang` (attribute → `<html lang>` → door default).
- **Rationale**: Paraglide's locale is app-global state and the hub catalog has no Portuguese; adding `pt` to inlang would require translating the whole hub. This is a stated exception to "every user-facing string goes through Paraglide" (hub `AGENTS.md`), limited to `src/lib/doors/embed/**`. `scripts/qc/content-contract.test.ts` must be checked for scope; if it scans the folder, register the exception there in the same PR.

## R3. Styling and isolation
- **Decision**: open shadow root. `:host` sets nothing that blocks inheritance, so font family, size and text colour come from the page. Public theme surface: `--minion-door-accent`, `-on-accent`, `-surface`, `-border`, `-danger`, `-radius`, `-gap`, `-control-height`, plus `::part(field|label|input|button|zone|error|section)`. The hosted page maps hub tokens onto these variables.
- **Rationale**: custom properties and inherited properties cross a shadow boundary; page rules such as `input { … }` do not, so the form cannot be broken by site CSS.
- **Hazard**: hub `lint:design` forbids raw colour, size and radius values in `.svelte` files. Fallback values therefore live in `embed/theme.ts` (a string of custom-property defaults applied to `:host`), not in component styles. If the lint still flags the folder, the slice stops and reports; no lint exception is added without the owner.
- **To verify in the slice**: Svelte 5 custom-element CSS injection with `vite-plugin-svelte` 7 (compile option `customElement: true`, per-file `<svelte:options customElement={{ tag: null }}>` or a wrapper that calls `customElements.define`). Read the Svelte docs before writing; do not rely on memory.

## R4. Cross-origin requests
- **Decision**: `doorAccess(event, slug)` as defined in `plan.md` § One access decision. `Access-Control-Allow-Origin: <origin>` and `Vary: Origin` only for an allowed site of the door's organization on a door with `embed: true`; a foreign unlisted origin gets a CORS-readable `403 not_allowed`. No credentials. Allowed request header: `content-type` only. `Access-Control-Max-Age: 60`.
- **CSRF interaction**: SvelteKit rejects cross-origin `text/plain`, multipart and urlencoded bodies before hooks (`@sveltejs/kit` `respond.js:81-92`); `checkOrigin` is global and stays on. The element therefore sends JSON for submit and `application/octet-stream` for every upload, with the real type in `?type=`. The upload handler takes the type from `?type=` when the body is `application/octet-stream`. The offer `click` beacon (`text/plain`) is out of scope: form doors only.
- **Lookup cost**: allowed origins are cached per organization for 60 s with no stale-while-revalidate (FR-004) and busted on change; the cache layer precedent is `modules.service.ts:12-23` (which uses a 5-minute TTL with SWR — do not copy those numbers).
- **Dev server caveat**: SvelteKit skips the CSRF origin check in dev (`respond.js:73`); cross-origin tests run on a built server.

## R5. Allowed sites storage
- **Decision**: new table `org_allowed_sites` (soft delete to keep who/when, FR-005). There is no general org-settings table (`organizations` is a Supabase table behind `tenant.service.ts:9-29`); a jsonb blob such as `crm_settings` would lose per-entry audit and is CRM-scoped.

## R6. API keys
- **Decision**: `org_api_keys`; key text `mk_<prefix>_<secret>` where prefix is 8 and secret 43 characters of `[0-9a-z]` / base62 without `_` (generate from random bytes, re-draw on a prefix collision); stored: prefix + SHA-256 of the whole key; lookup by prefix through the core (RLS-bypass) connection, compare with `timingSafeEqual`. Scopes as jsonb array; first scope `doors:submit`.
- **Rationale**: the secret is 256 bits of randomness, so a fast hash is sufficient and a slow password hash would only add latency. No hashed-token table exists to reuse; pieces to copy: `join/helpers.ts:4` (generation), `identity/channel-claim.service.ts:54-64` (`safeEqualHex`).
- **Rate limiting**: a per-key ceiling always applies (60 submits, 240 uploads, 120 reads per minute). With a valid `x-minion-visitor-ip` the per-visitor buckets (5 submits, 40 uploads) are charged as well. Failed key attempts → 10/min per caller address, answer `401 unauthorized` for every failure kind. Key verification is never cached.
- **`last_used_at`**: written at most once per minute per key.

## R7. Richer form config
- **Decision**: extend the strict zod schema in `src/lib/doors/kinds/form.ts` with optional keys only (`sections`, `defaultCountry`, `locales`, `translations`; per field `section`, `help`, `showIf`, `country`, `guide`; new type `document`). Old configs parse unchanged (FR-019).
- **Reach**: `validateSubmission`, `buildSubmissionSchema`, `contactFromValues` (a `document` field feeds the contact document through `cleanDoc`, like key `dni` today), `maskSubmissionValues`/`SAFE_TYPES`, `SubmissionsPanel.svelte`, `Editor.svelte`.
- **Countries**: move the 92-entry list from `faces-landing/src/lib/data/countries.ts` to `src/lib/doors/countries.ts`. Country names use `Intl.DisplayNames`; the content contract forbids new `Intl.*` outside `$lib/utils/format.ts`, so the helper goes there and the embed imports only that function (check the bundle does not pull the Paraglide runtime; if it does, pass names in from a tiny embed-local helper and register the exception).

## R8. Headless client package
- **Decision (after review)**: cut from this feature. Nothing here consumes it, and it would be a second implementation of the contract. Server-side callers use the documented HTTP contract; the package stays in the proposal.

## R9. Process deviations (stated per Constitution)
- **FigCraft demo-first** (owner rule 2026-11-08): no `.figcraft` as-is/to-be is produced for the door editor additions or the new settings page. Named here and in each UI PR body; the owner may ask for it before merge.
- **Board stub**: `specs/2026-11-13-doors-site-sdk-spec.md` links this directory so the meta board shows the feature.

## R10. Unverified
- Whether Vercel overwrites a client-supplied `x-forwarded-for` (`adapter-vercel` returns the raw header, `files/serverless.js:37`). SC-003 depends on it; S1 confirms from Vercel's documentation and records the answer.
- Bundle size (SC-007) until the first build.
- Screen-reader behaviour of the country picker inside the input.
