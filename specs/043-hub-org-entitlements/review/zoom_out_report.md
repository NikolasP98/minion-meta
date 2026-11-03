# Zoom-out review: 043 org entitlements (`design.md`)

**Reviewer:** Skeptical Architect (EGM Zoom Out Goldfish), REVIEW mode
**Standard:** `zoom-out-standard.md`
**Target:** `specs/043-hub-org-entitlements/design.md` (587 lines), plus `concepts_brief.md` and `hypothesis.md`
**Code checked:** hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a (read-only, via `git show` / `git grep`)

**Count:** 🔴 1 Blocker · 🟡 8 Major · 🟢 4 Nit

## Context sufficiency (prerequisite)

Passes. The objective is clear: an org-level plan decides on the server whether AI runs, an admin sets it by hand, and the launch makes Bernibites the only Base org. The design keeps the RBAC analogy (lines 153-155) and reuses several existing mechanisms well: the `usageMiddleware` chokepoint, `MODULE_MANIFEST` and the route guard for whole pages, the existing channel mirror for `aiEnabled`, the existing `FORBIDDEN` code, `@minion-stack/cache` tenant tags, and the existing `authorizeGatewayMethod` choke. The cited anchors check out: `authorizeGatewayMethod` is at `server-methods.ts:205`, and `getMirrorEntry`, `channel-hydrate.ts`, `extractUserClaims`, `dispatchReplyFromConfig`, `toResolvedChannels`, `currentAiUsageScope`, `isAppRouteBlocked` and `canViewPath` all exist where the design says.

---

## 🔴 Blocker

### B1. The hub AI chokepoint does not know the org on most user-facing AI routes, so it fails open

**Lines:** 55, 231, 446-449, 477, 579

The design's main hub gate for `ai` is a check inside `usageMiddleware`, keyed on `currentAiUsageScope().orgId`. The rule for "no org in scope" is "not enforced, logged" (line 231). The design claims this one check covers "every hub model call (notes, builder, CRM tags, flows copilot, …)" (lines 448-449).

On `origin/master`, `hooks.server.ts` opens the scope with `orgId: null` (`aiUsageScopeHandle`). Two things fill it in later:

* `getTenantCtx()` (`src/server/auth/tenant-ctx.ts:15`), only if the route happens to call it.
* `withAiUsageOrg()`, used in only five ticks.

These model-calling routes never call `getTenantCtx`:

* `/api/notes/polish`, `/api/notes/spelling`
* `/api/structured-stream`
* `/api/flows/[id]/copilot`
* `/api/builder/ai/dry-run`

For them the chokepoint sees no org and lets the call through. The acceptance line "AI and marketplace APIs return 403" (line 579) would fail for any direct caller, and S3's hiding of the UI controls becomes the only barrier. That contradicts decision 9 ("the frontend never decides").

**Simplicity rationale:** the root fix is structural and small. Write `locals.tenantCtx.tenantId` into the AI usage scope once, in `hooks.server.ts`, right after identity resolution. That is the same place the scope is opened, so no per-route check is needed. Also state whether "authenticated request with no org in scope" is allowed to fail open. With that fix, only scripts and platform jobs reach that branch, and the "logged" fallback becomes a true exception instead of the common path. Without the fix, the design needs a per-route `requireFeature` list, which is exactly what the chokepoint was supposed to avoid.

---

## 🟡 Major

### M1. `plan_features` is a table with no writer, no UI and no data: YAGNI, and a second source of truth

**Lines:** 165, 182-184, 205-206, 214-216, 401, 410-411, 416

The plan→feature mapping lives in code (`PLAN_DEFAULTS`, line 203), and "rules change by pull request" (line 86). `plan_features` is "empty at launch" and has no editor on the admin page. Nothing in S1-S5 writes to it. It still costs:

* a table with RLS and grants,
* a global cache tag on top of the per-org tag,
* an extra resolution step (override → parent → default → parent),
* tests for override precedence.

It also creates two places where "does Premium include X" can be answered.

Owner decision B named `plan_features` as *the* mapping. The design then moved the mapping into code, which leaves the table vestigial. **Pick one.** If mapping changes ship by PR, use `PLAN_DEFAULTS` and drop the table. Add the table, with an editor, in the same PR that first needs a no-deploy change.

### M2. The admin page reinvents existing platform-admin surfaces and bypasses the nav authority rule

**Lines:** 66-69, 161, 319-323, 426-440

The hub already has two cross-org admin lists:

* `(app)/orgs` ("All Orgs"), gated by `can('orgs.all')` and registered in `src/lib/access/super-views.ts`.
* `(app)/settings/organizations`.

Both use `listAllOrganizationsWithMemberCounts`. `SUPER_VIEWS` is the existing registry for super-admin-only views, and `/killswitches` already reaches the sidebar utility row through it.

The design adds a third org list under a new `/admin` segment. It also shows the link with `user.role === 'admin'` hard-coded in `utility-links.ts` (lines 434-435). That breaks the file's own contract: "authority stays in canViewPath".

**Simpler:** register the plans view as a `SUPER_VIEWS` entry. Gate it through `can()` and `route-access-registry` like `/orgs`, and let `utilityLinks(canViewPath)` show it with no special case. Ideally it is a plan column plus a detail panel on `/orgs`, or a `/orgs/plans` sub-route if the owner insists on a separate page. Decision D (a dedicated admin page as the seed of an admin module) still holds, because `SUPER_VIEWS` already *is* that seed. Drop the plan badge and link on `/settings/organizations` (line 436). It would be a fourth place showing plan state.

### M3. The "orgs are created outside the hub" claim is wrong, and the design ignores the parallel provisioning redesign

**Lines:** 192-194, 138-142 (CUJ 5)

The hub creates orgs itself: `provisionOrganization()` in `src/server/services/organization-provision.service.ts`, exposed as `/api/organizations/provision`. "No row = Base" still produces the right behaviour, but two consequences are missed:

1. Provisioning is the natural place to choose a plan. The admin who provisions an org is the same platform admin who sets plans.
2. Meta proposal `2026-10-28-hub-org-module-packages-tenancy-nav-home` (draft, owner-requested) is redesigning provisioning as install packages. It also proposes collapsing "at least seven hand-kept registries" into one `defineModule()` contract.

043 adds five or more registries without referencing that work:

* `FEATURES`
* `PLAN_DEFAULTS`
* `MODULE_MANIFEST.feature`
* `BASE_GATEWAY_METHODS`
* the client `hasFeature` mirror

**Ask:** fix the claim, and add one paragraph on how plans and module packages relate. Is a plan a set of features, a set of installable modules, or both? Which registry will own `feature` once `defineModule()` lands? Otherwise the two specs build competing "what does this org get" models a week apart.

### M4. Sub-feature keys, dotted inheritance and rule helpers have no caller at launch

**Lines:** 48-52, 91-92, 198-210, 406-411, 413-414

Every org is either Premium (`['ai', 'marketplace']`) or Base (`[]`). Both the gateway and the hub chokepoint check only `ai`. "No feature has a rule at launch" (line 202). So `ai.chat` and `ai.proactive` always equal `ai`. The `all` / `any` / `not` / `plan()` / `kind()` / `has()` helpers, the `rule_false` reason and `kind` in the snapshot are all code with no caller.

There is also a hidden semantic trap. The chokepoint checks the parent `ai`, so the hierarchy can only *subtract*. A future plan that grants only `ai.chat`, without `ai`, would have every hub model call refused, chat included. The design never states this.

**Simpler:** ship `ai` and `marketplace`. Add `ai.chat` / `ai.proactive` and the rule helpers in the PR that introduces the first plan which differs on them, such as Premium-lite. The owner delegated decision B, so documenting the shape as the intended extension is enough. If the sub-keys stay, state the subtract-only rule explicitly.

### M5. The browser gets a second copy of the evaluator

**Lines:** 51-52 (G3, "one server evaluator"), 292, 305, 495-496

`hasFeature(key)` in `can.svelte.ts` is specified "with the same dotted-parent rule as the server". That is a second implementation of resolution, and it will drift.

The server already returns "the resolved allowed keys" (lines 292, 305). Have `resolveEntitlements` return the fully expanded set (for example `ai`, `ai.chat`, `ai.proactive`, `marketplace`). Then `hasFeature` is a plain `includes`, and the gateway's `features.includes('ai')` stays as written. One evaluator, as G3 promises.

### M6. The S3 inline-control inventory is hand-made: it is partly redundant and misses real callers

**Lines:** 500-514

**Redundant.** These are already covered by the whole-page gate S3 adds:

* `FlowCopilotPanel` is mounted only in `(app)/flow-editor/[id]`.
* `ChapterEditor` and `skill-editor.*` are mounted only under `(app)/flow-editor/skills/[id]`.

S3 already 404s `/flow-editor` for Base orgs, so wrapping these in `{#if hasFeature}` is wasted work and test surface.

**Dead.** `AgentCreatorWizard.svelte` has no importer on `origin/master`.

**Missing.** Embedding- or model-backed endpoints that sit behind the chokepoint and are reached from non-AI pages:

* `/api/crm/contacts/[id]/similar-wins`
* `/api/crm/insights/win-index`
* `/api/crm/contacts/[id]/journey/analyze`
* `/api/brains/[id]/search`

Once B1 is fixed these will 403 for Base orgs and appear as broken widgets inside the CRM, which G7 forbids.

**Simpler:** derive the list mechanically. Take the callers of `getOpenRouterModel` and `embeddings.ts` (about 40 files), map them to their UI entry points, and drop any already inside a page-gated prefix. A derived list is honest about what it omits. A hand list is not.

### M7. Base orgs lose `config.*` writes, which contradicts the design's own G4 rule

**Lines:** 53-54, 243-262, 527

G4's rule is "AI is closed for Base orgs everywhere, unless a non-AI feature needs the path". The design then says "channel setup writes config today" (line 260), yet keeps only `config.get` / `config.schema` for Base orgs until spec 042 lands. Channel setup is exactly the non-AI path G4 says to keep open. The one real Base org (Bernibites) loses the ability to finish channel setup from the dashboard, and the design ties that fix to another spec.

Do one of these:

* allowlist the specific config write that channel setup uses, or
* state that Bernibites' channels are already set up and operators do future setup with the shared token.

Either way, say it in G4 and the acceptance section, not only in a TODO.

### M8. Leftovers from the superseded "Premium tag" direction

**Lines:** 168, 328, 180 vs 553, 221-222

Parts of the design still describe the old direction:

* **Line 168** (diagram): "layout load (UI tag only)".
* **Line 328** (Rollout): "JWT claims and the UI tag ship". G7 (lines 70-74) says no tag exists. An implementer reading the diagram or Rollout will build one.
* **`org_plans.set_by uuid` (line 180) vs `set_by = 'launch-backfill'` (line 553).** A string in a uuid column will fail the backfill.
* **Lines 221-222.** The migration-lag rule ("resolve to Base only after enforcement is deployed") explains its own exception. With the flag off, gates allow anyway. With it on, the launch order guarantees the tables exist. Treat `42P01` as `lookup_error` and delete the special case.

---

## 🟢 Nit

### N1. A cheaper read path was available

**Lines:** 212-217, 305

The hypothesis notes that `loadCanonicalMemberships` already selects per-request org facts (`orgKind`) into `locals`. A left join to `org_plans` there would put `plan` in `locals` for free. `requireFeature`, the layout load and the JWT issuer could then read it without a second cached lookup and cache-tag scheme. The 5-minute cache is defensible because it copies the module cache, but it should be weighed against this one-join alternative in Alternatives.

### N2. PostHog `entitlement_denied` on every tick skip is noise

**Lines:** 223-224, 419-421

Tick skips already show up in the tick response (`skipped_by_entitlement`) and the logs. Sending a PostHog event per org, per tick, per run adds volume without a question it answers. Limit PostHog to request-path denials, which are the ones that signal a UI leak.

### N3. Two booleans gate the same thing

**Lines:** 228-235, 462-468

Ticks call `withAiUsageOrg` and *also* need an explicit `ai.proactive` check, so the skip is counted cleanly. That is a fair reason. But the reminders tick is the only one with a non-AI fallback. For the others, catching `EntitlementError` once in a shared per-org loop helper would avoid seven hand-placed checks. Optional.

### N4. Concepts brief vs design drift is not signposted

**Lines:** 6

The predecessor `concepts_brief.md` still says "Premium tag + upgrade message" and `reason ∈ no_plan_default | …`, and its decision C text says "org creation writes a Base row". Each was later reversed (G7, line 52, line 194). One line under the header, "superseded points: tag/upgrade UI, no_plan_default, creation hook", would stop a fresh reader from cross-applying the brief.

---

## Bottom line

The architecture is right-sized at its core: one evaluator in the hub, claims in the JWT, the existing chokepoints, a page guard and the channel mirror. Most of the excess is speculative layering for plans that do not exist yet:

* the `plan_features` table, the sub-keys and the rule helpers,
* the client-side evaluator copy,
* a third org-admin page that ignores `SUPER_VIEWS`.

Fix B1 at the root in `hooks.server.ts` before anything else. Without it, the hub's `ai` gate does not exist for most user-facing AI routes.
