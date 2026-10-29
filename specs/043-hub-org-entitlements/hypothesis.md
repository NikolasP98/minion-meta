# Feature hypothesis — org entitlements (premium orgs)

Date: 2026-10-28 · Owner: Nikolas Pinon · Status: brainstorm input (EGM Step 1 output)

## Owner request (verbatim)

> implement a way to track premium orgs. For now, flag the feature as always-on if no subscription is enabled.

Owner rule (2026-10-26): AI features are PREMIUM. The base offering is the method + the platform.

## Clarified answers (owner, 2026-10-28)

1. Premium is set **by hand** for now by a platform admin, from a **new admin-only page** reached from the
   sidebar header icon row (next to the pulse / marketplace / gateway icons). That page is the seed of a
   future "admin" module for other platform-level configuration.
2. First gated features: **proactive agents**, **AI chat**, **access to the hub's /marketplace**. More
   features get flagged later. "Premium features will likely be server-based instead of hub-based" — the
   gateway (separate Node service, same Postgres) will enforce too.
   The owner wants a **mapping table** so more subscriptions can be added: e.g. Premium has features A, B, C;
   Premium-lite lacks B. Features carry **group tags**; enable/disable can depend on the **org's type**
   (`organizations.kind` = business | personal) and must support **logical operators**.
3. Non-premium UI: the agent's suggestion — feature stays visible with a "Premium" tag + upgrade message;
   a server refusal must name premium (never a generic failure; existing owner rule "403 must say your role
   can't"). **All orgs except Bernibites become premium** at launch.
4. Acceptance: flip a test org to non-premium → the three features are blocked with a clear message; FACES
   is unaffected.

## Anchored hypothesis

Add an entitlement model to the shared Postgres: **plans** (premium, base; later premium-lite…),
**features** with **group tags**, and a **mapping** saying which plans/org kinds unlock which features, with a
small nested `all / any / not` rule over plan, tag and org kind (stored as data, no free-text expressions).
An org with **no plan assigned gets every feature** ("always-on if no subscription"). Platform admins assign
plans by hand on the new admin page. First gates: proactive agents (assumed = background/scheduled AI with
no user click: Pulse digest, reminder compose, brain enrichment), AI chat (Jev / FloatingAssistant / my-agent),
and `/marketplace`. Blocked features stay visible with a "Premium" tag + upgrade message; server refusals name
premium. Launch data: every org except Bernibites → Premium; Bernibites → base.

## Known facts from codebase recon (hub `origin/master` 812a4b0a)

- `public.organizations` (id, name, slug, status, created_at, updated_at, paperclip_company_id, kind,
  onboarded_at) — no settings column; table predates `supabase/migrations` (baseline
  `supabase/qa/baseline/schema.sql`).
- Per request: `resolve-identity.ts` → `resolveSupabaseTenant` (`supabase-bridge.runtime.ts`) →
  `loadCanonicalMemberships` (`canonical-directory.service.ts`) sets `locals.tenantCtx/orgId/orgKind`.
  Adding a column to that select reaches `locals` for free.
- Existing gating: modules (`modules.service.ts` `isModuleEnabled`, `app_modules` table, absent row = enabled,
  5-min Valkey cache, `MODULE_MANIFEST`, route guard in `hooks.server.ts`), `ORG_KIND_POLICY`
  (`src/lib/org-kind.ts`). No feature flags. **No plan/tier/subscription/billing/entitlement concept anywhere**
  (hub, site, packages, gateway). `membership_plans` = an org's own customers' plans, unrelated.
- AI chokepoint: `getOpenRouterModel()` in `src/server/llm.ts` wraps every model in `usageMiddleware`; org from
  `currentAiUsageScope().orgId` (AsyncLocalStorage). Bypasses: `embeddings.ts` raw fetch, Jev router
  `assistant-router.service.ts`, and **FloatingAssistant / my-agent chat run in the browser over the gateway
  WebSocket** (`chat-rpc.ts`) — the hub server never sees those turns.
- Existing per-org AI toggles: `pulse_settings`, `brain_enrichment_settings`.
- Permissions: platform admin = `profiles.role='admin'` → `locals.user.role`, checked by `requireAdmin`
  (`authorize.ts`). Cross-org admin page already exists: `(app)/settings/organizations`
  (`listAllOrganizationsWithMemberCounts`). Org capability check: `requireOrgCapability`.
- Site pricing (`minion_site/src/lib/data/pricing.ts`): Personal "Free, in beta", Business "Custom", Scale
  "Custom" — lead-form CTAs, no checkout. The Personal card promises "one agent" (conflicts with AI = premium;
  open owner decision).
- Project rules: Spec Kit mandatory; security/data-tagged work keeps human gates at approval and merge; hub
  tests never hit prod; prod data migrations = dry-run default + snapshot + assert invariant; `.vercelignore`,
  route-contract manifest (new route ⇒ manifest + 6 counts).
