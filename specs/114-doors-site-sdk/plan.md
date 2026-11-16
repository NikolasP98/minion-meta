# Implementation Plan: Doors site SDK

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Data model**: [data-model.md](data-model.md) · **Contract**: [contracts/public-api.md](contracts/public-api.md) · **Verification**: [quickstart.md](quickstart.md)

**Date**: 2026-11-13 (revised after EGM stages 5–7) · **Repos and PR bases**: `minion_hub` → `master`; `faces-landing` → `master`; this directory → `minion-meta` `dev` · **Tags**: crm, security, data

> **PARKED 2026-11-13 (owner decision).** Owner: "for now, I want the form hosted on the original domain, like its currently set up. Eventually, we can consider a form builder to embed into a subdomain like modelos.facesculptors.net. This would need DNS validation."
> Effect: the FACES form stays as built (site-hosted, server-forwarded). Only slice S0 (tolerant config reader, hub PR 659) goes ahead. Slices S1–S6 are not to be built now. Partial, unreviewed work for S1 and S2 is kept on local branches `feat/doors-allowed-sites` and `feat/doors-embed` (worktrees `~/.cache/claude-tmp/hub-doors-s1`, `-s2`; not pushed).
> The direction the owner named for later is different from this design: a hub-hosted form on the customer's own subdomain, proven by DNS. That needs no cross-origin access and no embedded script, so the allowed-sites and element slices should be re-examined, not resumed as written.

## Summary

Move the lead form out of site code and into the door. The hub gains: allowed sites per organization, a per-door embedding switch, and cross-origin answers for that combination only; a public read of a form door's definition; a dependency-light renderer compiled as the `<minion-door>` element; a richer form configuration; translations; organization API keys for server-side callers. The FACES `/modelos` page is rebuilt on the element.

## Technical Context

- **Hub**: Bun, SvelteKit 2.70, Svelte 5.57, Vite 8, zod 4, Postgres (Supabase) with RLS and `withOrgCore` (a transaction as role `app_ledger` with the organization id set for RLS), migrations in `supabase/migrations/` run by `scripts/db-migrate.ts`, each paired with a QA seed change (`scripts/qa/check-migration-seed-pairing.ts`), Paraglide i18n (en, es), design-token lint.
- **FACES site**: SvelteKit on Vercel, npm.
- **Testing**: hub vitest (node env; component mounting is rare and not used here; route tests call the handler with a mocked service — precedent `src/routes/api/doors/public/[slug]/submit/server.test.ts`). Cross-origin behaviour is checked on a BUILT server (`bun run build && bun run preview`), because SvelteKit skips its CSRF origin check in dev (`@sveltejs/kit` `respond.js:73`). Browser checks use headless Chromium on `:9224`.
- **Constraints**: script under 60 KB compressed; allowed-site changes effective within 60 s; no submitted value in any log or response; 4 MB upload cap unchanged.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | This directory precedes all code. |
| II. AS-IS → TO-BE → DELTA with evidence | In `spec.md`; hub anchors in `research.md`. |
| III. Slice-scoped delivery | Seven slices, one PR each. |
| IV. Required build steps | Route-contract counts, migration-seed pairing, `i18n:compile`, `lint:design`/`lint:tokens`, prettier and the new `build:embed` are tasks. |
| V. Human gates | Every hub PR stays draft; the owner approves and merges. Production data changes need the owner's explicit go-ahead. |
| Open-items ledger | Open ends get a `TODO(handoff)` and a line in the proposal. |

Deviations, stated: no FigCraft as-is/to-be for the editor and settings UI (research R9); the embed keeps its strings outside Paraglide (R2).

## Technical Plan

### One access decision

`src/server/doors/access.ts` exports `doorAccess(event, slug, bucket)`; the public handlers and `OPTIONS` call it and nothing else decides access. Order inside it is fixed:

1. **Address limiter first**, before any database work, as today (`submit/+server.ts:34`): the handler's existing per-address bucket, plus 120/min per address for `OPTIONS` and `GET`.
2. **Classify the caller** from headers only:
   - `Authorization: Bearer mk_…` present → `key` candidate (from S6; before S6 the header is ignored).
   - `Origin` absent, or equal to the request's own origin (`event.url.origin`) → `direct`: today's behaviour, no CORS headers.
   - any other `Origin` (including the literal `null`) → `site` candidate.
3. **Resolve the door** with the existing `resolvePublicDoor(slug)`; unreadable or missing → `404 not_found`.
4. **Decide**:
   - `site`: allowed when the door config has `embed: true` AND the origin is a live allowed site of the door's organization (`allowedOriginsForOrg(orgId)`, cached 60 s, no stale-while-revalidate, busted on change). Otherwise `403 {"error":"not_allowed"}`. This 403 carries `Access-Control-Allow-Origin: <origin>` so the element can read it and say so; it reveals nothing else.
   - `key` (S6): prefix lookup, constant-time hash compare, not revoked, scope, key organization = door organization; never cached. Failure → `401 unauthorized`, counted in a 10/min per-address failure bucket. A `key` request is never also treated as `site`.
5. **Return** `{ door, ctx, mode, cors, limits }` where `cors` are the headers to put on every response (success and error) and `limits` names the extra buckets the handler must charge (S6: per key, and per visitor address when stated).

`preflight(event, slug)` runs steps 1–4 for `OPTIONS` and answers `204` with `Access-Control-Allow-Origin`, `Vary: Origin`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: content-type`, `Access-Control-Max-Age: 60` when allowed, and a bare `204` otherwise. `authorization` and `x-minion-visitor-ip` are deliberately not allowed cross-origin, so a key cannot be used from a browser on another site.

Submit additionally requires `Content-Type: application/json` (else `400 invalid_body`), which closes the content-type-less `no-cors` post that passes SvelteKit's CSRF check today.

### Components
| Area | New or changed (hub-relative) |
|---|---|
| Tolerant reader | `src/lib/doors/kinds/form.ts` (`readFormConfig` = `safeParse`), `doors-form.service.ts:63,308`, `src/server/doors/kinds/form.server.ts` |
| Access | `src/server/doors/access.ts`, `src/server/services/org-allowed-sites.service.ts`; later `org-api-keys.service.ts` |
| Schema | `supabase/migrations/<ts>_org_allowed_sites.sql`, later `<ts>_org_api_keys.sql`; `src/server/db/pg-org-integrations-schema.ts`; QA seed |
| Public API | `src/routes/api/doors/public/[slug]/+server.ts` (GET, OPTIONS); `submit`, `upload` gain `OPTIONS`, `doorAccess`, `?type=` |
| Settings | `src/routes/(app)/settings/developers/`, `src/routes/api/settings/{allowed-sites,api-keys}/`, nav + route contract + access override |
| Renderer | `src/lib/doors/embed/{DoorForm.svelte, fields/*, client.ts, messages.ts, theme.ts, guides.ts, element.ts}` |
| Bundle | `vite.embed.config.ts`, `build:embed` chained into `build`, output `static/doors/v1.js` (classic script, git-ignored) |
| Form config | `src/lib/doors/kinds/form.ts`, `form.server.ts`, `src/lib/doors/countries.ts`, `doors-form.service.ts`, `crm-contact-ensure.ts`, `SubmissionsPanel.svelte`, `Editor.svelte`, `components/doors/form/Public.svelte` (chooses the renderer) |
| FACES | `src/routes/modelos/+page.svelte` reduced; delete `+page.server.ts`, `upload/+server.ts`, `src/lib/form/modelos.ts`, `CountryInput.svelte`, `FaceGuide.svelte`, `data/countries.ts`; the `modelos` i18n blocks keep only the page's title texts |

### Slices
| Slice | Branch (hub unless marked) | Contents | Depends on | Stories |
|---|---|---|---|---|
| S0 | `fix/doors-tolerant-config` | Public paths answer `not_found` for a config they cannot parse | — (must be in production before any door gets new keys) | FR-019a |
| S1 | `feat/doors-allowed-sites` | Table, service, settings page section, `embed` config key + editor switch, `doorAccess` (`site`, `direct`), CORS + `OPTIONS`, JSON-only submit, public GET | S0 merged | US1 server half |
| S2 | `feat/doors-embed` (on S1) | Renderer for today's field types, `<minion-door>` element, classic bundle, events, attribution, theme, cross-origin test on a built server | S1 | US1 client half |
| S3 | `feat/doors-rich-form` (on S2) | Sections, visibility rule, number, document, country phone, guides, option descriptions, half width; contact-matching rules; editor; hosted page uses the new renderer only for doors with new keys | S2 | US2 |
| S4 | `feat/doors-translations` (on S3) | Base language, translations, editor panel | S3 | US4 sc. 1–2 |
| S5 | (faces) `feat/modelos-on-element` | Page on the element; production door config + allowed sites (owner-confirmed) | S0–S4 in production | US4 sc. 3 |
| S6 | `feat/doors-api-keys` (on S1) | Keys table, service, settings section, mode `key`, per-key ceiling, visitor address | S1 | US3 |

S2's renderer is written against `contracts/public-api.md`, so it can start while S1 is in review; its cross-origin check waits for S1. S6 is independent of S2–S5 and may ship any time after S1. Stacked branches are retargeted to `master` before their base branch is deleted.

### Rollout and rollback
- S0 ships first and alone. After it is in production, a door saved with keys an older build does not know answers `404` there instead of `500`. Rolling back a later slice therefore degrades only doors that already use that slice's settings, and visibly (not found), never with an error page.
- The hosted page keeps today's `Public.svelte` body for every door without new keys (S3, `usesNewFormKeys(config)`), so the two production clinical and casting doors do not change renderer until someone edits them to use new settings. The old body is removed in a later release, not in this feature.
- No slice is verified against production data with a local build. Production checks happen after the owner merges, on the hosted page and the embed, with the existing test contact "PRUEBA Claude Borrar".
- S5 ships only after the owner confirms the production door config update.

## Alternatives

| Option | Removes | Costs | Decision |
|---|---|---|---|
| **iframe of `/d/<slug>?embed=1`** | All of S1's cross-origin work, the allowed-sites table and settings page; no hub script runs in the customer's page | The form cannot use the site's own fonts or layout (a self-hosted brand font does not cross an iframe); needs a resize message channel; `X-Frame-Options`/CSP must be opened per allowed site, so an allow-list is needed anyway; mobile keyboards and scroll inside frames are worse | Not chosen: the motivating site is a brand site whose form is native today, and the owner asked for a way to link a domain to an organization. Flagged to the owner; can be added later as a third option because it reuses the hosted page |
| **Per-door `allowedOrigins` instead of an org table** | Migration, service, settings page | The same origin typed on every door; no single place to revoke a site | Org table (the owner asked for linking a domain to an org) plus a per-door on/off switch |
| Disable SvelteKit `checkOrigin` | The octet-stream workaround | Global: weakens every hub form action | Rejected |
| Wildcard origins | Typing each subdomain | Unauditable grant | Rejected for this version |
| Keys in browser code | Allowed sites | A browser key is public | Rejected; the hub does not accept the header cross-origin |
| Compile today's `Public.svelte`; renderer in a meta package | — | See research R1 | Rejected |
| Published headless client package | — | Second implementation of the contract with no consumer | Cut to the proposal |
| ES module script | — | A cross-origin module script needs CORS headers on the static file | Classic script (`<script async src>`) |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A CORS mistake lets any site post to a door | One `doorAccess`; exact-match origins; no `*`; no credentials; tests for unlinked, other-organization, removed, `null` and content-type-less requests; `Max-Age: 60` |
| Listing a marketing site exposes a clinical door | Embedding is a per-door switch, default off; the editor states that host-page scripts can read what visitors type |
| Allowed sites read as authentication | They are a browser control only. Server callers without an `Origin` behave as today; the settings page says so |
| A leaked key floods submissions by rotating fake visitor addresses | A per-key ceiling always applies (60 submits and 240 uploads per minute); revoke is immediate (verification is never cached) |
| Key leakage | Never logged; only the prefix is shown; hash stored; not accepted cross-origin |
| Throttling after database work | The address limiter runs first in `doorAccess`, also for `OPTIONS` |
| `x-forwarded-for` spoofing changes the visitor bucket | Unchanged from today; S1 confirms from Vercel's documentation that the platform overwrites the header and records the finding in the PR |
| A new foreign number attaches to a stranger's contact | Non-default-country phones match on the full number only; non-default-country documents are never match keys (S3) |
| A hidden contact field leaves a submission without a contact | Config error: a contact phone/email field cannot have a visibility rule; no chained rules |
| The new renderer regresses existing doors | Existing doors keep today's renderer; config fixtures of both production doors in validation tests |
| Design lint rejects the embed folder | Fallback values in `theme.ts`; stop and report rather than add an exception |
| Bundle over 60 KB | No zod in the bundle (light client checks, hub is the authority); build fails above the limit |
| Hub script on customer pages changes with every hub deploy | The path is versioned (`/doors/v1.js`); breaking changes get `v2`; stated in the settings page |
| Stacked PRs merged out of order | One merge script per slice for the owner; retarget before delete |

## Review record (EGM, 2026-11-13)

Reports: meta `.local/egm/2026-11-13-doors-site-sdk/{zoom_out,comprehension,critic,implementation_readiness}_report.md`. Structural, style and codebase-details reviewers were not run. The current FACES site is unaffected by the tightening: its submit sends no `Origin`, and its upload proxy sends the hub's own origin (`faces-landing` `src/routes/modelos/upload/+server.ts:30`).

| Finding | Resolution |
|---|---|
| Critic B1: strict config + throwing parse makes rollback unsafe | New slice S0 (tolerant reader) ships first |
| Critic B2 / Comprehension 1–2: unlinked origin not refused; bad key vs invariant | Foreign unlisted `Origin` → 403; JSON-only submit; `Max-Age` 60; invariant reworded as a deliberate tightening for the owner to confirm; bad key → 401 always |
| Comprehension 3: "not allowed" undetectable | The 403 is CORS-readable; the element reads it from the first GET |
| Comprehension 4: three shapes of the access function | One definition above; `doorCors` removed from research |
| Critic M1: contact matching across countries | FR-017a, S3 |
| Critic M2: key without ceiling; key usable from browsers | Per-key ceiling; headers not allowed cross-origin |
| Critic M3: module script needs CORS | Classic script |
| Critic M4: grant per organization | Per-door `embed` switch, default off; host-page trust documented |
| Critic M5: throttling order | Limiter first |
| Critic M6: visibility rule on contact fields, chains | Config errors |
| Readiness (stage 9): route tests, `doorAccess` bucket, custom-element mechanism, build order, editor round trip, S1 response shape, removed-site classification | Folded into T005, T012–T017, T021–T023 |
| Critic M7 / Zoom-out 3: renderer swap, dev-server CSRF | Old renderer kept for doors without new keys; built-server test; slices reordered so the element ships before the rich config |
| Zoom-out 1: line target mis-measured; missing config | Baseline recounted (1,108 → under 100); number type, option descriptions, half width added; accepted differences listed in FR-026 |
| Zoom-out 2: keys and package have no consumer | Package cut; keys kept as the last slice because the owner asked for them |
| Zoom-out 4: iframe | Costed in Alternatives; not chosen; flagged to the owner |
| Zoom-out 5: per-door origins | Org table kept (owner's ask) + per-door switch |
| Contested | None of the findings was rejected outright; the iframe and the org table are kept against the reviewers' preference, with reasons above |

## Detailed Implementation Plan

See [tasks.md](tasks.md). Order: S0 → S1 → S2 → S3 → S4 → S5, with S6 any time after S1. Each slice ends with its gates run in the foreground and a draft PR whose body names this spec, the stories covered, the checks run, and what was not checked.
