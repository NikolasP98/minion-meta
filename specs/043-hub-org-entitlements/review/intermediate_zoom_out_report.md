# Intermediate zoom-out review (Stage 8): 043 org entitlements, revised `design.md`

**Reviewer:** Skeptical Architect (EGM Zoom Out Goldfish), REVIEW mode
**Standard:** `zoom-out-standard.md`
**Target:** `specs/043-hub-org-entitlements/design.md` (1041 lines, revised 2026-10-29)
**Baseline:** Stage 5 `review/zoom_out_report.md`; `review/resolution_decisions.md` (owner rules not reopened)
**Code checked (read-only, `git show` / `git grep`):** hub `origin/master` 812a4b0a, gateway `origin/DEV` 191d9a69d8a, meta `dev` (`langgraph-server/`)

**Count:** 🔴 1 · 🟡 2 · 🟢 5

## Verdict on the revision

The revision fixed every Stage 5 finding at the root, and the core is still the simplest design that meets the owner rules:

* The org is set once in `hooks.server.ts` (Stage 5 B1).
* `plan_features` is gone; `PLAN_DEFAULTS` is the only mapping.
* The client gets an expanded list, so there is one evaluator.
* The admin page sits under `/orgs` and `SUPER_VIEWS`.
* A mechanical `AI_CALL_SITES` inventory replaces the hand-made list.

Most of the new size is forced by the owner rules: flows are Base, channel AI is configuration, and the shared token is closed. That size is not speculative.

The problems are at the edges. The shared-token refusal (decision 4) has a wider blast radius than the page list assumes. The page list also mixes two different reasons for hiding a page under one `ai` key.

---

## 🔴 Blocker

### B1. Closing the shared token breaks the channel pages the design keeps open for Base orgs

**Lines:** 463-465, 563-564, 570, 238-245 (CUJ 7), 620 (R8)

The design says that pages using `PluginControlCenter.svelte` need the shared token and are "hidden for it" (463-465). But the hide list only covers `/plugins` and `/settings/plugins` (563-564). `/channels` stays visible as "channel transport" (570).

On hub `origin/master`, `/channels/[id]` is a `PluginControlCenter` page:

* `src/routes/(app)/channels/[id]/+page.svelte:2,8`.
* `src/lib/server/plugin-control-center.ts` says it is "shared by the generic `/plugins/[id]` route and the channels `/channels/[id]` route".

`PluginControlCenter.svelte:59-70` calls `fetchHostToken`, which is `POST /api/servers/[id]/token`. On failure it renders the `AsyncBoundary` error or unavailable state instead of the plugin iframe (`:99-108`). On the gateway, the WhatsApp, Telegram and Discord extensions all register a `plugins.controlCenter` UI (`extensions/{whatsapp,telegram,discord}/minion.plugin.json`).

With the flag on, the token endpoint returns 403 for a Base org (366, 449). Every per-channel page then shows an error card for Bernibites, the only Base org at launch. That breaks four things:

* the owner rule "closed unless a non-AI feature needs the path": channel setup is the clearest non-AI need;
* G7, which forbids broken or blocked-looking UI;
* CUJ 7's claim that the channel page works;
* the reason `channels.*`, `web.login.*` and `config.*` were allowlisted in the first place.

The gate follows the org (434-435), so a platform admin acting in the Base org hits the same error.

**Simplest fixes (pick one and say it in the design):**

* **(a)** Hide `/channels/[id]` for orgs without `ai`, and send Base admins to the native channel setup. `/settings` → `ChannelsTab` → `ChannelCard` / `ChannelSetupWizard` / `WhatsAppQrPairing` uses the dashboard WebSocket, which works JWT-only. The `/channels` list cards would then need to link there for Base orgs.
* **(b)** Pull the part of R8 for channel plugins into S3/S4: give the plugin iframe the hub JWT instead of the shared token. I did not check whether the gateway's plugin HTTP routes accept the JWT.

Either way, R8 and the "Pages that stay visible" list must name `/channels/[id]`.

---

## 🟡 Major

### M1. The page-hiding list uses one `ai` key for two different reasons, and the `/terminal` entry rests on a false premise

**Lines:** 463-465, 559-564, 571, 620, 1011

The owner rule is "AI is closed unless a non-AI feature needs the path". The list on 559-564 hides two kinds of page under `[ai]`:

1. Pages whose purpose is AI. These match the rule.
2. Pages hidden because the browser can no longer get the shared token: `/terminal`, `/plugins`, `/settings/plugins`. That is a transport limitation, not AI. These are non-AI surfaces closed for a non-AI reason.

**`/terminal` is a dead redirect.** `src/routes/(app)/terminal/+page.server.ts` throws `redirect(307, '/cloud/terminal')`, so its `+page.svelte` (the one that calls `fetchHostToken`) never renders. The real terminal is `/cloud/terminal`, which the design keeps visible (571). It uses `RemoteTerminal.svelte` → `createShellAccess` (`shells.access` over the dashboard WebSocket), not the shared token.

Hiding `/terminal` therefore adds a manifest entry and a test and does nothing. It also makes `/terminal` 404 while `/cloud/terminal` works. The R8 follow-up "a JWT path for … the terminal" (1011) is phantom work.

**Ask:**

* Drop `/terminal` from the list and from R8 and S5.
* For `/plugins` and `/settings/plugins`, say they are closed for the token reason (R8), not because they are AI. `/settings/plugins` is the per-org plugin enable/disable page, gated by `settings:manage`.
* If they keep the `ai` key, add a one-line note in `availability.ts` pointing at R8. When plugin UIs get a JWT path, the tag must come off, and nothing else in the code records why it is there.

`/reliability` (561-562) is defensible under the rule: it shows LLM analytics plus gateway and plugin health, gated by `reliability:view`. But its stated reason, "its `reliability.*` methods are not in the allowlist", is circular, because this spec writes the allowlist. Give the real reason: it is agent and LLM monitoring with no Base-org need.

### M2. Flow AI nodes become pass-throughs that forward their input unchanged, which can send raw content to customers

**Lines:** 502-504, 981-985

`compile-flow.ts` replaces each skipped AI node with "a pass-through that forwards its input unchanged". The S4 test pins exactly that: `trigger → llm → channel` with `aiEnabled:false` "sends the trigger text through unchanged".

A flow authored while the org was Premium, which is exactly the downgrade case, would then deliver a customer's own inbound message, or internal data the LLM was meant to summarise or redact, straight to an external recipient. That is a new data path the owner never asked for.

**Simpler and safe:** a skipped AI node ends its branch. Nothing downstream of it runs, and the skip is logged. This is the same behaviour the design already gives an `llm`-mode router ("selects no branch", 503-504), so it is no more code. Non-AI branches that do not pass through an AI node still run, which keeps decision 8's "the rest of a flow runs".

---

## 🟢 Nit

### N1. G1 says a lookup failure never grants on a server gate, but two server gates fail open

**Lines:** 91-92 vs 349-353, 366, 617 (R5)

`/api/gateway/jwt` and `POST /api/servers/[id]/token` both fail open on a lookup error. R5 accepts this. Name the two exceptions in G1 so the goal and the policy agree.

R5 should also say the token case is wider than the JWT case. It hands out an org-less `operator.admin` token, while the JWT carries role scopes and an org.

### N2. `shells.*` is allowlisted as "not AI", but `shells.invoke` drives an AI agent

**Lines:** 412, 423, 571, 945

The workstation runs an ACP agent harness:

* the default is `hermes acp` (`minion/src/shells/manager.ts:1551`);
* provisioning passes `harness: 'hermes'` (`organization-provision.service.ts:304`).

`shells.invoke` and `shells.invoke_durable` send it a text prompt. By the design's own rule, "AI execution is denied" (414), those two are AI.

The reach is small: the hub has no caller, and line 440 says they need admin scope. CUJ 5 provisioning uses `mintOrgGatewayJwt` (no claims), so it does not need the allowlist at all.

**Cheap fix:** take the `shells.*` prefix minus `invoke` and `invoke_durable`, or drop "not AI" from the wording.

### N3. The new `orgs.plans` capability has the same audience as `orgs.all`

**Lines:** 582-586, 752, 766

`/orgs` is `capability:orgs.all` (`route-access-registry.ts:129`). The plans page has the same audience, platform admins. A second key adds a `SUPER_VIEWS` entry and a capability that nothing tells apart. Reuse `orgs.all` unless the owner wants plans granted separately.

The design also has three entry points: the utility row, `/orgs` and `/settings/organizations` (590-592). The `/orgs` link alone may be enough.

### N4. Skipped one-off AI jobs are lost, which R11 does not say

**Lines:** 828-831, 623 (R11)

`advanceJob` ends a skipped AI job as `done` with `skipped_by_entitlement`. R11 says work "resumes" after an upgrade. That is true for tick-driven re-scans. It is not true for a specific `brain_ingest` or corpus job that was already closed. Say so in R11, or state that ticks re-enqueue that work.

### N5. "`aiEnabled` absent → `true`" on the runner's manual `/flows/run` is safe only because the runner listens on loopback

**Lines:** 979-980

`langgraph-server/src/flow/server.ts` binds `127.0.0.1` by default, and the comment there warns against exposing it. The hub's local-dev fallback (`flow-editor.svelte.ts:895`) posts to `PUBLIC_LANGGRAPH_FLOWS_URL` directly. Add one line saying the default is safe because only the co-located gateway reaches the runner.

---

## Bottom line

The architecture is still right-sized. Fix B1 before the spec moves on: it is the one place where a fix (closing the shared token) silently breaks the non-AI path the owner rule protects.

M1 and M2 are wording and behaviour corrections of a few lines each. None of the findings adds a mechanism.
