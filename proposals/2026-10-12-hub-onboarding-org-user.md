---
id: 2026-10-12-hub-onboarding-org-user
title: Hub onboarding — retire the agent wizard, add new-org and new-user first-run setup
status: draft
created: 2026-10-12
updated: 2026-10-12
repos: [minion_hub]
tags: [ui, logic, migrations]
value: 6
effort: S
source: feat/org-user-onboarding
---

# Hub onboarding — new-org + new-user first-run setup

## Owner ask (verbatim, 2026-10-12)

> "lets remove the agent onboarding experience altogether. On the point of onboarding, there
> should be one depending on non-exclusive scenario: new org; new user (runs right after
> new-org on first-runs)."

## AS-IS

- `/onboarding` was a 3-step agent-creation wizard (`StepAwaken` → `StepRemember` →
  `StepConnect`, an `OrbAnimation`, a `StepIndicator`) plus a `/onboarding/complete`
  celebration screen with a typewriter speech bubble.
  Anchors: `minion_hub/src/routes/onboarding/`, `minion_hub/src/lib/components/onboarding/`.
- It was reachable only as a **failure fallback**: `(app)/+layout.server.ts` (~line 196)
  self-healed the personal agent via `ensureActivePersonalAgent()` and, when that failed,
  `throw redirect(303, '/onboarding')` — i.e. the wizard doubled as a manual-retry UI and
  as a hard block on entering the app.
- `POST /api/personal-agent/create` required `{ name }` and wrote
  `personality.configured: true` with the wizard's text; the wizard was its only caller.
- There was **no first-run setup for an organization or a user**. `provisionOrganization()`
  collects a name only; `organizations.kind` silently defaults to `business`, and
  `fin_settings.timezone`/`currency` silently default to `America/Lima`/`PEN` — Peru-shaped
  hardcodes that decide every calendar day boundary and every money label in the product.
  A new user's `profiles.display_name` could stay null and their UI language was never asked.

## TO-BE

`/onboarding` hosts **two short, independent, non-exclusive flows**, each one screen, each
gated on its own nullable timestamp. The org flow runs first when both apply.

| Flow | Marker | Shown when | Collects |
|---|---|---|---|
| org | `organizations.onboarded_at` | null **and** the viewer is `owner`/`admin` of the active org | org kind (business/personal per `ORG_KIND_POLICY`), business timezone, currency |
| user | `profiles.onboarded_at` | null | display name, UI language (Paraglide locale) |

Invariants:

- **Nothing blocks on the personal agent any more.** The `(app)` layout still self-heals it
  silently; a failed heal leaves the floating assistant showing "No personal agent
  provisioned" and the user keeps working.
- **A plain member is never held at a form they cannot submit** — the org flow is skipped for
  non-owner/admin roles, and the server action re-checks `settings: manage` via
  `requireOrgCapability`.
- **Skip still stamps the marker**, so nobody is asked twice.
- **No existing org or user is pushed through a first-run screen** (migration backfill).
- Org name is *not* re-asked: organization creation already collects and validates it.

## DELTA

### Deleted

- `src/routes/onboarding/complete/` (route + page), `src/routes/onboarding/+layout.svelte`
- `src/lib/components/onboarding/` — `OrbAnimation`, `StepAwaken`, `StepConnect`,
  `StepIndicator`, `StepRemember`
- the `(app)` layout's `throw redirect(303, '/onboarding')` fallback (and with it the last
  `url` read in that load — one less tracked dependency)
- 22 i18n keys used only by the wizard (`awaken_*`, `step_context*`, `step_title`,
  `step_subtitle`, `step_namePlaceholder`, `shortcuts_onboardingNext/Prev`) from **both**
  `messages/en.json` and `messages/es.json`

### Added / changed

| Transition | Where | Proof |
|---|---|---|
| two nullable markers + backfill | `supabase/migrations/20261012120000_onboarding_markers.sql` | applies only on the production Vercel build (`vercel-build = db:migrate && build`) |
| markers reach the request with **zero extra queries** | `canonical-directory.service.ts` (both existing selects), `supabase-bridge.ts`, `organizations.service.ts`, `app.d.ts` | `supabase-bridge.test.ts` |
| pure gate decision | `src/lib/onboarding/gate.ts` | `src/lib/onboarding/gate.test.ts` (7 cases incl. order, member skip, no-org) |
| layout guard | `(app)/+layout.server.ts` | same pure function, so guard and page can't disagree |
| one route, two form actions (`?/org`, `?/user`) — no new API route, no new manifest endpoint | `src/routes/onboarding/+page.server.ts` / `+page.svelte` | `src/routes/onboarding/page.server.test.ts` (5 cases) |
| create endpoint input optional | `src/routes/api/personal-agent/create/+server.ts` | `name` defaults to the provisioned display name; `personality.configured` now reflects whether one was actually supplied |
| route contract | `route-design-manifest.ts`, `route-design-validation.ts` (159/148), `route-design-contracts.test.ts` (wave E 10→9), `wave-e-public-auth-composition.test.ts` | the four count assertions |
| QA seed stamps every persona/org | `scripts/qa/seed/tenancy.ts` | otherwise every QA persona would land on a first-run screen |

Design calls made without asking (and why):

1. **Form actions, not an API endpoint.** A `scope`-bodied `/api/onboarding` route would need
   an RBAC prefix registration and a manifest entry; two actions on the page it serves need
   neither. Plain `use:enhance` submit is the visual feedback (`Button loading`); no
   `createOptimistic()` — there is no toggle to paint and the page navigates on success.
2. **Three `Select`s, no radio cards.** The owner's ask was "short"; the house `Select`
   primitive already carries every token and a native `name` for the POST.
3. **Timezone/currency lists are deliberately narrow** (11 zones, 7 currencies). The full
   IANA/ISO pickers live in `/finances` settings, which accept anything.
4. **`loadCanonicalProfile`'s migration-lag fallback fails OPEN** (stamps "onboarded"): that
   branch only runs when the column itself is missing, and a null there would push every
   user of such a database through the first-run screen.

## Open ends

- `TODO(handoff)` in `scripts/qa/seed/tenancy.ts`: there is **no deliberate QA fixture for a
  not-yet-onboarded org or user**. Every seeded persona is stamped onboarded, so the QA stack
  cannot exercise either flow end to end. Adding one means a new `USERS` spec entry + a
  `MATRIX` id + a registration (and, for the org flow, a fourth org with an owner), and the
  `seed.contract.test.ts` "every ordinary persona has an ACTIVE personal agent" assertion has
  to keep holding. Not done because the contract test only runs with `HUB_TEST_DB_URL` set,
  so an untested persona would be a blind addition.
- The **org flow is never shown to an org whose only members are plain members** (by design —
  they cannot write org config). If such an org exists, its `onboarded_at` stays null forever
  and the kind/timezone/currency keep their silent defaults. Acceptable: those defaults are
  exactly today's behaviour. Revisit if orgs without an owner/admin turn out to be real.
- The **user flow writes the locale preference but not `localStorage`** (that page lives
  outside `(app)`, so `userState.user` — which `syncPreferenceToServerImmediately` requires —
  is not hydrated). The post-submit redirect to `/` lands on the locale-prefixed landing page,
  and `locale.applyFromServer()` seeds `localStorage` from the URL on that first app load. One
  extra hop, no user-visible difference.
- `POST /api/personal-agent/create` now has **no in-repo caller** (the wizard was it). It was
  kept as the documented privileged manual-retry path rather than deleted, per the task brief.
  If nothing adopts it, deleting it is a 1-file, 2-count change.
