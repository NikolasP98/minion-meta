# Hub Routing Simplification — Spec (v2)

Date: 2026-07-22
Status: CONSULTED — Codex (sol/xhigh) verdicts folded in; the "v2 revisions" section
OVERRIDES the corresponding v1 sections. Verdict: keep Option A, but scope the
manifest to availability-only; it does NOT replace the RBAC registry, API
authorization, nav presentation, or route-design manifest.
Related: `specs/2026-07-22-personal-org-differentiation-spec.md` (its P1 centralized
kind-404 is subsumed by this spec's Option A).

## Problem

minion_hub routing/gating has grown into three independently-evaluated layers plus a
separate nav config, each duplicated per-route:

| Layer | Where evaluated | Count |
|---|---|---|
| RBAC (`decideRouteAccess`) | `(app)/+layout.server.ts` central | 345 lines registry+policies |
| Module-enabled 404 (`isModuleEnabled(ctx,'x')`) | hand-written in each route load | **39 route files** |
| Org-kind 404 (`tenant.kind === 'business'`) | hand-written per route | 2 files (pulse) — and MISSING for pos/stock/workforce |
| Nav visibility (`isModuleVisibleForKind` + `enabledByPluginId` + `canViewPath`) | `sections.ts` (separate from all above) | — |

Consequences: nav-hidden-but-route-open bugs (current org-kind asymmetry), guard
drift when a module adds routes, route-design-contract tests with **hardcoded counts**
that fail on every new route, and 120 server-load files + 376 API endpoints each
deciding access idiosyncratically. Adding one module touches ~6 places.

## Goal

ONE machine-readable module manifest; access evaluated ONCE per request; nav, guards,
and contract tests all DERIVED from the same manifest. Adding a module/route = one
manifest entry. No change to user-visible behavior except closing the known gaps.

## Options evaluated

### A. Modular-monolith consolidation — RECOMMENDED

Keep one SvelteKit app. Introduce a single **module manifest**:

```ts
// src/lib/modules/manifest.ts
export const MODULES = {
  crm:      { prefixes: ['/crm'],                 permission: 'crm:view',      kinds: ['business','personal'], toggleable: true },
  finances: { prefixes: ['/finances'],            permission: 'finance:view',  kinds: ['business','personal'], toggleable: true },
  ads:      { prefixes: ['/socials', '/ads'],     permission: 'ads:view',      kinds: ['business'],            toggleable: true },
  sales:    { prefixes: ['/sales'],               permission: 'sales:view',    kinds: ['business'],            toggleable: true },
  support:  { prefixes: ['/support'],             permission: 'support:view',  kinds: ['business'],            toggleable: true },
  pulse:    { prefixes: ['/pulse','/settings/pulse'], permission: null,        kinds: ['personal'],            toggleable: false },
  // … pos, stock, workforce, memberships, team, scheduling, work, agents, brains, …
} as const;
```

One resolver `resolveModuleAccess(pathname, ctx) → { allowed, status: 403|404 }`
composing: prefix→module lookup, kind check, `isModuleEnabled` (batched, cached per
request), RBAC permission. Wired in exactly two places:

1. `(app)/+layout.server.ts` — replaces today's `decideRouteAccess` call AND all 39
   per-route `isModuleEnabled` guards AND the 2 kind guards (codemod-delete them).
2. `hooks.server.ts` — same resolver for `/api/<module>/*` paths (API routes bypass
   the app layout; today each of 376 endpoints self-guards — migrate opportunistically,
   new endpoints get it free).

Derivations:
- `sections.ts` nav filtering consumes `MODULES` (kind + toggle + permission) instead
  of its own parallel logic (`isModuleVisibleForKind`, moduleId aliasing).
- Route-contract tests derive expected counts/sets from the manifest — delete
  hardcoded counts.
- `ORG_KIND_POLICY.hiddenModules` collapses into `kinds:` on each entry.

Cost: ~1 wave (manifest + resolver + codemod + derived nav/tests). Risk: low —
behavior-preserving except intentionally closing gaps. Reversible.

### B. SvelteKit layout groups per kind — `(business)/` vs `(personal)/` — REJECTED

Two route groups can't serve the same path (`/crm` can exist in only one group);
shared modules would need duplicate route files or re-export shims for 40+ modules.
Solves presentation forking, not gating. Route groups remain useful later for
*layout* differences (e.g. a personal-specific CRM shell), not for access.

### C. Vercel Microfrontends (multi-zone) — DEFER, documented path

`@vercel/microfrontends` supports SvelteKit: one Vercel "group", default app +
child apps each owning path prefixes via `microfrontends.json`, independent deploys,
asset-prefix isolation, local dev proxy. The natural split here would be
shell+core / agent-stack (`/agents /brains /builder /workshop /sessions`) /
ERP (`/crm /finances /scheduling /stock /pos /sales`).

Why not now:
- **Hard navigation across zones** — every cross-zone click is a full page load;
  hub navigation deliberately keeps layouts alive (`{#key}` on module segment).
- **Shared runtime state doesn't cross zones**: the gateway WS singleton, 11 state
  modules, hotkey layer, floating assistant — each zone re-connects and re-auths
  (N× WS connections per user; gateway conn cap is 10 with oldest-eviction).
- Auth/session, design tokens, and db access are already shared via `@minion-stack/*`
  packages — that part is ready — but per-zone Vercel projects multiply env/config
  surface (env-var drift is a recurring incident class here).
- Solo-dev + Sonnet-agent workflow: independent deploys solve a *team-scale* problem
  we don't have; build time isn't the bottleneck.

Adopt-when: hub build/deploy time or module coupling actually hurts, or a second
long-lived contributor team appears. Option A's manifest makes the eventual split
*easier* (module boundaries become explicit).

### D. Separate UI repo (personal-hub) — REJECTED

User-assessed as too much work; duplicates auth, state, design system, and every
shared fix forever. Option A + per-kind nav/labels achieves the differentiation.

### E. Module Federation (webpack/Rspack; vite-plugin-federation) — REJECTED

Runtime code-sharing between separately-built bundles. Ecosystem is
webpack/Rspack-first; SvelteKit SSR support is demo-grade, not production-grade.
Solves "shared libs without republishing" — not our problem (single repo, single
build). Sentry/industry guidance frames federation for multi-team runtime
composition; we'd inherit its complexity with none of its payoff.

## Migration plan (Option A, Sonnet waves)

- **W1 — Manifest + resolver**: add `src/lib/modules/manifest.ts` + `resolveModuleAccess`;
  unit tests enumerating every `(app)` top-level dir → must map to a manifest entry
  (fails on unregistered module — replaces hardcoded-count contract tests).
- **W2 — Wire + codemod**: layout.server uses resolver; delete 39 `isModuleEnabled`
  route guards + 2 kind guards; `hooks.server.ts` guard for `/api/<module>/*`
  (start with module-mapped prefixes only; leave bespoke endpoint logic).
- **W3 — Derive nav + retire duplicates**: `sections.ts` consumes manifest;
  `ORG_KIND_POLICY` folds in; route-contract tests derive from manifest.
- Gates per wave: `bun run check`, `bun run test` (route contract suites),
  `lint:design`/`lint:tokens`; Codex diff review before commit.

## v2 revisions (Codex sol/xhigh consult verdicts — OVERRIDE v1 Option A details)

### R1. Manifest = availability ONLY

```ts
// { appPrefixes, toggleId?, kinds?, requires? }
crm:   { appPrefixes: ['/crm'] },                                  // toggleable via toggleId:'crm'
pulse: { appPrefixes: ['/pulse','/settings/pulse'], kinds: ['personal'], toggleId: undefined },
posAppointments: /* composite */ { appPrefixes: ['/pos/appointments'], requires: ['pos','scheduling'] },
```

Omit `kinds` = both kinds. No `permission` field — RBAC STAYS in
`route-access-registry` (it already serves server layout AND client `canViewPath`,
+layout.server.ts:153 / can.svelte.ts:43, with exact overrides, longest-prefix
subresources, public policies, denial-status semantics). v1's `permission: null` for
pulse would have WEAKENED auth (pulse requires `pulse:view`, pulse/+page.server.ts:9).
API method auth stays in `apiWriteCapability` (rbac.service.ts:1074 — API prefixes are
NOT isomorphic to UI prefixes: `/api/meta`→ads, `/api/projects`→projects). Nav
ordering/icons/dynamic-plugin logic stays in `sections.ts` (it consumes the shared
availability predicate only).

### R2. Enforcement placement
Hook `handle` (existing `appHandle`/`finishApp`, after identity resolution, before
`resolve` — hooks.server.ts:160,184), targeting `event.route.id` under `/(app)`, with
explicit principal classification (server-token bypass otherwise flows to resolve).
Layout load only CONSUMES the result. Rationale: form actions execute before page
loads re-run; `+server.ts` handlers are outside the layout hierarchy (none inside
`(app)` today — keep it that way); root `prerender = false` (+layout.ts:17) is a
protected-route CONTRACT — prerendered output bypasses hooks.

### R3. Module-state snapshot, not a new cache
`isModuleEnabled` already reads a complete per-org module map cached with 5-min TTL +
SWR + key-coalescing (modules.service.ts:7,26; packages/cache core.ts:86). The v1
"39 awaits → 1 query" premise was WRONG (only matched loads run per request). For
once-per-request consistency: load the map once into `event.locals` (add field to
App.Locals, app.d.ts:8) and reuse. Do NOT add a Valkey layer.

### R4. API centralization = separate, later, module-by-module
Central API availability check ONLY for authenticated browser-session calls with
explicitly mapped prefixes. Server-token (curated path list — reuse
resolve-identity.ts:274 classification), cron/internal (self-authenticating,
cross-org — hooks.server.ts:226), and public-booking routes stay HANDLER-OWNED.
Note existing inconsistency to preserve/decide per-module: disabled scheduling
bookings → 403 vs disabled stock items → 404.

### R5. Codemod is NOT blanket-safe
45 `isModuleEnabled` calls across the 39 files; **7 are data-bearing, not gates**:
invoice detail uses `stockEnabled` to shape returned stock data
(finances/invoices/[id]/+page.server.ts:18), POS layout returns stock+scheduling
availability to the UI (pos/+layout.server.ts:17), POS catalog check controls stock
ENRICHMENT (pos/catalog/+page.server.ts:8). Classify every call; delete only pure
route gates (e.g. socials campaign detail :14). Data-bearing calls migrate to the
locals snapshot (same semantics, one read).

### R6. Keep three "canonical path" operations SEPARATE
Locale canonicalization (`/en|/es` strip — canonical-path.ts:3), legacy URL redirects
(`/ads/*`→`/socials/*`, ads/+page.server.ts:4), and module-ID aliasing
(`/socials`→`ads`, sections.ts:35) are three different operations — do not fuse into
one generic resolver.

### R7. Route-design contracts stay independent
Do NOT derive them from the availability manifest (tautological — the manifest would
test itself). Their totals/wave-distribution pins are intentional; separate
validation already gives bidirectional filesystem coverage
(route-design-validation.ts:267 — note it inventories only `+page`, not `+server.ts`).
Lazy cleanup allowed: drop noisy raw total-count assertions, keep bidirectional
coverage + redirect/policy invariants. Independent of routing consolidation — don't
block on it.

### R8. Microfrontends defer CONFIRMED (stronger)
Corrections to v1: `{#key}` on the module segment RECREATES the child subtree — it's
the enclosing root shell (sidebar/topbar/assistant/query provider, (app)/+layout.svelte:71;
gateway connection lifecycle, root +layout.svelte:57) that stays alive and would be
lost on every cross-zone navigation. [Unverified in hub code: "gateway conn cap 10,
oldest-eviction" — that's gateway-side (minion/) behavior from prior session memory;
verify in minion/ before citing in decisions.] Vercel MF Vite integration is still
experimental. Adopt only after a measured build/deploy bottleneck or genuinely
independent deploy cadence, and only with a PoC covering locale routing, auth
continuity, asset prefixes, and gateway connection behavior.

## Revised migration sequence (replaces v1 W1–W3)

1. **S1 — Availability map + characterization tests**: locale prefixes, aliases,
   missing-row-enabled behavior, kinds, pulse authorization, composite deps
   (`/pos/appointments`). No behavior change.
2. **S2 — Hook guard + locals snapshot**: wire `(app)` guard in `finishApp`;
   App.Locals module-state field; KEEP existing route guards, then manually remove
   only confirmed pure gates (7 data-bearing calls migrate to snapshot reads).
3. **S3 — Nav consumes availability predicate**: `sections.ts` keeps presentation +
   dynamic-plugin logic; `ORG_KIND_POLICY.hiddenModules` folds into `kinds`.
4. **S4 — API centralization** (separate wave, module-by-module, with
   session/server-token/cron/public tests).
- Route-design count cleanup: independent chore, anytime.

Note: S1–S3 = WP0 of `specs/2026-07-22-personal-org-differentiation-spec.md`; the
personal-org kind-matrix change (hiding support/sales/ads/memberships/team for
personal) rides on S3 as a DELIBERATE behavior change, sequenced after the
behavior-preserving steps land green.

## v1 consult questions (answered in R1–R8)
