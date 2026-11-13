# Implementation Plan: Doors site SDK

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Data model**: [data-model.md](data-model.md) · **Contract**: [contracts/public-api.md](contracts/public-api.md) · **Verification**: [quickstart.md](quickstart.md)

**Date**: 2026-11-13 · **Repos and PR bases**: `minion_hub` → `master`; `minion-meta` → `dev`; `faces-landing` → `master` · **Tags**: crm, security, data

## Summary

Move the lead form out of site code and into the door. The hub gains: allowed sites per organization and cross-origin answers for them; a public read of a form door's definition; a richer form configuration; one dependency-free renderer used by the hosted page and compiled as the `<minion-door>` element; organization API keys for server-side callers. The meta repo gains a small headless client package. The FACES `/modelos` page is rebuilt on the element.

## Technical Context

- **Hub**: Bun, SvelteKit 2.70, Svelte 5.57, Vite 8, zod 4, Postgres (Supabase) with RLS and `withOrgCore`, migrations in `supabase/migrations/` run by `scripts/db-migrate.ts`, Paraglide i18n (en, es), design-token lint.
- **Meta package**: TypeScript library under `packages/`, built like its siblings, released by Changesets.
- **FACES site**: SvelteKit on Vercel (`faces-intake` project), npm.
- **Testing**: hub vitest (node env, no component mounting; route tests call the handler with a mocked service — precedent `src/routes/api/doors/public/[slug]/submit/server.test.ts`), SQL integration tests only with `HUB_TEST_DB_URL`; browser checks with headless Chromium on `:9224`.
- **Constraints**: script under 60 KB compressed (SC-007); allowed-site changes effective within 60 s (FR-004); no submitted value in any log or response; 4 MB upload cap unchanged.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | This directory precedes all code. |
| II. AS-IS → TO-BE → DELTA with evidence | In `spec.md`; hub anchors in `research.md`. |
| III. Slice-scoped delivery | Seven slices, one PR each (below). |
| IV. Required build steps | Route-contract counts, migration-seed pairing, `i18n:compile`, `lint:design`/`lint:tokens`, prettier, new `build:embed` step are tasks, not afterthoughts. |
| V. Human gates | Every hub PR stays draft; the owner approves and merges. Production data changes (door config, allowed-site rows) need the owner's explicit go-ahead. |
| Open-items ledger | Any open end gets a `TODO(handoff)` and a line in the proposal. |

Deviations, stated: no FigCraft as-is/to-be for the editor and settings UI (R9); the embed keeps its strings outside Paraglide (R2).

## Technical Plan

### Request path after the change
```
browser on linked site ──GET /api/doors/public/{slug}──────────▶ hub: doorAccess() → publicView + limits
        │                                                        doorAccess(event, slug):
        ├─POST …/upload (octet-stream, ?type=) ─────────────────▶   1. resolve door → org (existing resolvePublicDoor)
        └─POST …/submit (json) ─────────────────────────────────▶   2. Bearer key? → verify, scope, same org → mode 'key'
                                                                     3. Origin header ≠ hub origin? → allowed site of org → mode 'site' (+CORS headers)
server with key ── same endpoints, Authorization: Bearer ──────▶    4. otherwise mode 'direct' (today's behaviour)
                                                                     → { door, ctx, mode, rateKey, corsHeaders }
```
`doorAccess` is the single trust decision; the three handlers and `OPTIONS` call it and nothing else decides access. Mode `direct` with a foreign `Origin` returns no CORS headers and proceeds as today (the browser discards the response; server-side callers without a key keep working, which preserves the invariant for the current FACES site until it migrates).

### Components
| Area | New or changed (hub-relative unless marked) |
|---|---|
| Access | `src/server/doors/access.ts` (`doorAccess`, origin normalisation, CORS headers), `src/server/services/org-allowed-sites.service.ts`, `src/server/services/org-api-keys.service.ts` |
| Schema | `supabase/migrations/<ts>_org_allowed_sites.sql`, `<ts>_org_api_keys.sql`, `src/server/db/pg-org-integrations-schema.ts`, QA seed |
| Public API | `src/routes/api/doors/public/[slug]/+server.ts` (GET, OPTIONS); `submit`, `upload` gain `OPTIONS`, `doorAccess`, `?type=` |
| Settings | `src/routes/(app)/settings/developers/+page.{svelte,server.ts}`, `src/routes/api/settings/{allowed-sites,api-keys}/…`, nav + route contract + access override |
| Form config | `src/lib/doors/kinds/form.ts`, `form.server.ts`, `src/lib/doors/countries.ts`, `doors-form.service.ts`, `SubmissionsPanel.svelte`, `Editor.svelte` |
| Renderer | `src/lib/doors/embed/{DoorForm.svelte, fields/*, client.ts, messages.ts, theme.ts, guides.ts, element.ts}`; `components/doors/form/Public.svelte` becomes a wrapper |
| Bundle | `vite.embed.config.ts`, script `build:embed` chained into `build`, output `static/doors/v1.js` (git-ignored) |
| Package (meta) | `packages/doors/` + changeset |
| FACES | `src/routes/modelos/+page.svelte` reduced; delete `+page.server.ts`, `upload/+server.ts`, `src/lib/form/modelos.ts`, `CountryInput.svelte`, `FaceGuide.svelte`, `data/countries.ts`, the `modelos` i18n blocks |

### Slices
| Slice | Repo | Branch | Contents | Depends on | Stories |
|---|---|---|---|---|---|
| S1 | hub | `feat/doors-allowed-sites` | allowed-sites table, service, settings page section, `doorAccess` (modes `site`, `direct`), CORS + `OPTIONS`, public GET | — | US1 (server half) |
| S2 | hub | `feat/doors-rich-form` | config additions, validation, countries, `document` type, guides, new renderer, hosted page on the renderer, editor UI | — | US2 |
| S3 | hub | `feat/doors-embed` (stacked on S2) | `<minion-door>` element, bundle build, events, attribution, theme, demo page | S2; S1 for the cross-origin check | US1 (client half) |
| S4 | hub | `feat/doors-api-keys` (stacked on S1) | keys table, service, settings section, mode `key`, visitor address | S1 | US3 |
| S5 | meta | `feat/doors-client-package` | `@minion-stack/doors` | contract only | US3 sc. 4 |
| S6 | hub | `feat/doors-translations` (stacked on S3) | translations in config, editor, renderer | S3 | US4 sc. 1–2 |
| S7 | faces-landing | `feat/modelos-on-element` | page on the element; production door config and allowed-site rows (owner-confirmed) | S1–S3, S6 live | US4 sc. 3 |

S1 and S2 touch disjoint files and run in parallel. Stacked branches are retargeted to `master` before their base branch is deleted.

### Rollout and rollback
- Each hub slice is additive: new tables, optional config keys, new endpoints. Rolling back a slice is reverting its PR; the tables may stay.
- S2 replaces the hosted form's renderer. Guard: both production doors are rendered and submitted on a local build against production before the PR is marked ready (SC-005), and the old `Public.svelte` body is kept in git history, not behind a flag.
- S7 ships only after the owner confirms the production door config update; the old `/modelos` page remains on `master` until that PR merges.

## Alternatives

- **Disable SvelteKit `checkOrigin`** to accept any content type cross-origin: rejected, it is global and protects every hub form action.
- **Wildcard or pattern origins**: rejected for this version; exact origins keep the grant auditable.
- **Org-level CORS for all public APIs**: rejected; only door endpoints are in scope, decided per door organization.
- **Keys in browser code as the embed's credential**: rejected; anything shipped to a browser is public.
- **iframe embed, renderer in a meta package, compiling the current `Public.svelte`**: see research R1.
- **Slow password hash for keys**: unnecessary for 256-bit random secrets (R6).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A CORS mistake exposes door submission to any site | One `doorAccess` function; tests for unlinked origin, other-org origin, removed origin, `null` origin; no `*`, no credentials |
| A forged `x-minion-visitor-ip` evades rate limits | Header honoured only in mode `key`; tested |
| Key leakage in logs | Keys never logged; only the prefix appears in the UI and logs; hash stored |
| The new renderer regresses existing doors | Old configs covered by fixtures from both production doors; local production check before ready |
| Design lint rejects the embed folder | Fallback values in `theme.ts`; stop and report rather than add an exception |
| Bundle over 60 KB | Measure in `build:embed`; fail the build above the limit; the guide drawings are inline SVG paths |
| Preflight adds two uncached queries per call | 60 s cache of allowed origins by slug |
| Stacked PRs merged out of order | Merge script per slice, retarget before delete, written for the owner |
| Conditional fields let a client omit a required value | The hub evaluates `showIf` itself from submitted values; hidden values are dropped server-side |
| A site admin lists a domain they do not own | It can only post to that organization's own doors; documented assumption, DNS proof deferrable |

## Detailed Implementation Plan

See [tasks.md](tasks.md). Order: S1 ∥ S2 → S3 ∥ S4 → S5 (any time) → S6 → S7. Each slice ends with its gates run in the foreground and a draft PR whose body names this spec, the stories covered, the checks run, and what was not checked.
