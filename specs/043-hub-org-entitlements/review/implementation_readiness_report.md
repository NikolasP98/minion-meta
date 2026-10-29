# Implementation Readiness re-audit (Stage 9, single permitted re-audit): 043 org entitlements

* **Personas:** EGM Implementation Readiness + Codebase Details (Mode: REVIEW).
* **Standard:** `implementation-readiness-standard.md` (Zero-Decision Rule, phasing, target scope, actionable steps, test plan).
* **Target:** `design.md` lines 714–1041 (Detailed Implementation). Lines 1–713 were read as context.
* **Code checked (read-only, by `git show`):**
  * hub `minion_hub` `origin/master` 812a4b0a;
  * gateway `minion` `origin/DEV` 191d9a69d8a;
  * flows runner: meta `origin/dev` 5d223219b, `langgraph-server/`.
* **Counts:** 🔴 3 · 🟡 3 · 🟢 9.
* **Prior findings:** all 49 prior 🔴/🟡 are resolved in the text. Two of the fixes introduced new 🔴s: the `signalChannelChange` push, and the "pass-through" semantics.

**Verdict.** Not ready. The fixes for the earlier rounds hold, and almost every anchor matches the code. Three new problems would lead an implementer to build something harmful or self-contradictory:

* a plan change restarts WhatsApp for every org on the gateway;
* a skipped AI node echoes the customer's own message back to them;
* the `/channels/<plugin>` pages need the shared token that S2 takes away, yet they stay visible.

---

## 🔴 Blockers

### B1. `setOrgPlan`'s channel push restarts the whole WhatsApp channel type on the gateway, once per account

*Design 475–477 (Technical Plan) and 737–739 (S1 `setOrgPlan`): "calls `signalChannelChange` for each of the org's channel accounts".*

**What the design says the push does:** `signalChannelChange` → HttpBroadcaster → `events-http.ts` → `seedMirror()`, i.e. a mirror refresh only.

**What the code actually does after `seedMirror()`:**

* `minion/src/gateway/events-http.ts:75` calls `channelMirrorCompareFromTags`.
* After the reseed, `minion/src/gateway/channel-mirror-compare.ts:139-144` calls `applyChannelRestart(type)` for every affected type.
* `minion/src/gateway/channel-mirror.ts:74-85` stops and starts the whole channel type whenever `CHANNEL_CONFIG_SOURCE=db` and `CHANNEL_RUNTIME_APPLY` is on.
* The flag's own doc comment at `:46-50` says: "a restart reconnects a whole channel type (whatsapp = Baileys session), so this is the customer-reply path".
* The hub side is `minion_hub/src/server/services/channel-publish.service.ts:205-208`. Each call is a separate `invalidateTags`, so each one is a separate broadcast and a separate restart.

**Impact:** every plan change restarts WhatsApp for every org on that gateway, N times. That includes the acceptance flip in Launch step 5 (1029–1040), which moves a test org to Base and back. Gateways running with runtime-apply on (the current FACES configuration) would drop and reconnect their customer sessions on each admin click.

**Specify one of:**

* a refresh-only signal. For example, a new tag prefix (`channel-ai:<orgId>`) that `events-http.ts` routes to `seedMirror()` without `applyChannelRestart`. This adds one gateway file to S4.
* dropping the push and relying on the 5-minute pull. G9 then states that bound for channel replies.

Either way, add a test that a plan change triggers no channel restart.

### B2. A skipped AI node in a triggered flow echoes the customer's message back to the customer

*Design 502–504 (pass-through "forwards its input unchanged"), S4 981–985 (test: "`trigger → llm → channel` … sends the trigger text through unchanged"), acceptance 1036.*

* `langgraph-server/src/flow/server.ts:160-170`: `/flows/run-triggered` returns `{ reply: lastMessage.content }`.
* `minion/src/flows/trigger-manager.ts:295-298`: when the trigger has `deliverResponse`, the gateway sends that `reply` to the originating chat through `deliverFlowReply`.

With every AI node turned into a pass-through, the last message is the inbound customer text. The gateway then sends the customer's own WhatsApp message back to them, and the explicit `channel` node in the test does the same. The design's own test makes this behaviour the expected result.

**Specify** what a skipped AI node produces (no message, or the branch stops) and what `run-triggered` returns when the final message did not come from a node. The existing `reply &&` guard in `trigger-manager.ts:297` means an empty reply suppresses delivery. Replace the S4 test with one that asserts no outbound send.

### B3. `/channels/<pluginId>` pages need the shared token, yet they stay visible to Base orgs

*Design 463–465 says pages using `PluginControlCenter.svelte` / `PluginSlotHost.svelte` "are hidden for it". 570 keeps `/channels` visible. CUJ 7 and the acceptance walk (1030–1031: "every visible nav item opens without an error").*

**The pages:**

* `minion_hub/src/routes/(app)/channels/[id]/+page.svelte:2,8` is only `<PluginControlCenter …>`.
* `src/lib/server/plugin-control-center.ts:6` confirms it is shared by `/plugins/[id]` and `/channels/[id]`.
* `ChannelsNav.svelte:16` links every channel to `/channels/${pluginId}`.

**How the token is used:** `PluginControlCenter.svelte:51-74` calls `fetchHostToken`. After S2 (814–816) that returns 403 for a Base org, so the page shows `tokenError = 'session required'`.

**Also likely affected:** `src/routes/(app)/account/connections/+page.svelte` → `ChannelLinking.svelte:300` → `PluginSlotHost` (iframe mode).

**The conflict:** the design tells the implementer that these components are hidden, but `/channels/[id]` sits under a prefix the design keeps open. An implementer must either hide the per-channel pages (which breaks CUJ 7) or ship a broken page.

**Specify:** which of the two applies, and, if the pages stay, how the plugin UI authenticates for a JWT-only session. Name `channels/[id]` and `account/connections` explicitly in the AI page list or in the R8 follow-up.

---

## 🟡 Majors

### M1. The `handoff` flow node calls an LLM and is missing from the AI node list

*Design 492–494, 502–504, 426 (`flows.*` fully allowlisted).*

* `langgraph-server/src/flow/compile-flow.ts:473-502` sends the `handoff` node to gateway `flows.relay.open` with `suggestionCount ?? 3` and `suggestionModel`.
* `minion/extensions/flows/src/relay/index.ts:414-416` → `relay/suggestions.ts:41-51` generates the suggested replies with an Anthropic model (default `claude-haiku-4-5`).

**Two open paths:**

* The runner calls the gateway with its own credential, so the plan gate never sees it.
* `flows.relay.open` is also reachable by a Base WS client under the `flows.` prefix.

**Specify** whether `handoff` runs with `suggestionCount: 0` when `aiEnabled:false` (the relay itself is not AI), and whether `flows.relay.open` from a Base client is forced to zero suggestions. Add the node to the S3 palette rule and the S4 runner test.

### M2. The initial `AI_CALL_SITES` rows do not cover files the design's own inventory grep matches, and the gate for agent provisioning is undecided

*Design 395–401, 846–850.*

The design's pattern includes `agents.create`, `agents.delete` and `playground.complete`. On master it matches files that the initial rows do not list:

| File | What it does |
|---|---|
| `src/routes/api/personal-agent/create/+server.ts` | Personal agent creation route |
| `src/server/services/personal-agent-provisioner.ts:111` | Reached from `(app)/+layout.server.ts:9` on every app load |
| `src/server/services/brain-agents.service.ts:201,244` | `agents.create` / `agents.delete` |
| `src/server/services/builder-agent-publisher.ts:34` | `agents.create` |
| `src/lib/state/features/personal-agent.svelte.ts:91` | Browser `agents.create`, which the S4 allowlist will now refuse for Base |
| `src/lib/state/workshop/experiments.svelte.ts:73,165,226` | Browser `playground.complete` |
| `scripts/qa/gateway-bootstrap.ts` | Script |

CI fails until someone classifies them. For the provisioning sites, the classification is a product decision: should Base orgs get a personal agent provisioned, which is server-side through the shared token and so not stopped by the gateway gate? The design leaves that open.

**Specify:**

* a row and coverage class for each file;
* whether the inventory scans `src/lib/state/**` and `scripts/**`;
* whether personal-agent provisioning is skipped for orgs without `ai`.

### M3. The `fetch-json.ts` change would alter a 45-importer generic helper's contract

*Design 910–911: "`my-agent-rpc.ts` and `fetch-json.ts`. A `premium_required` 403 or gateway `FORBIDDEN` returns `null` … instead of throwing."*

`minion_hub/src/lib/api/fetch-json.ts` exports `fetchJson<T>(…): Promise<T>`. It throws `ApiError` with `kind` from `kindForStatus` (`403 → 'forbidden'`), and 45 files import it. The instruction leaves two things open:

* **The contract:** returning `null` either changes the return type for every caller (`Promise<T | null>`) or returns an untyped `null` as `T`.
* **What "gateway FORBIDDEN" means here:** the gateway WS is not an HTTP fetch, so it has no meaning inside this helper.

The gated inline controls mostly use raw `fetch`, so the purpose of touching this helper is also unclear.

**Specify the mechanism.** For example: add `ApiErrorKind 'premium_required'` (read from `body.code`) so callers can drop it silently, leave the return type unchanged, and limit the `null` behaviour to `my-agent-rpc.ts`. Name which callers change.

---

## 🟢 Nits

* **N1 (design 298–304, 722–724). The "no `anon` / `authenticated` grants" statement needs an explicit REVOKE.**
  * Supabase default privileges grant ALL on every new `public` table to `anon` and `authenticated` (`supabase/qa/baseline/schema.sql:11835-11843`), so "no `anon` or `authenticated` grants" needs an explicit `REVOKE ALL … FROM anon, authenticated`. House precedent: `20260723010000_brain_vector_outbox.sql:88-90`.
  * The policy has no `TO` clause, so it applies to PUBLIC. RLS with no write policy still denies writes, so this is accuracy, not exposure.
  * "like `org_provision_runs`" is inaccurate: that table has `GRANT ALL` to `anon` and `authenticated` (baseline :11234-11236).
* **N2 (770). `migrationWaveForRoute` takes two arguments.** The signature is `(pattern, family)` (`route-design-manifest.ts:270`). Use `'organization'`, as `screen('/orgs', …, 'organization', …)` does at :398.
* **N3 (763, 777). The utility link needs a nav label message.** Utility links render `m.nav_*()` labels (`utility-links.ts:8-11`), so `/orgs/plans` needs a `nav_*` message as well as the `admin_plans_*` keys.
* **N4 (870–873). `/workforce` already has a manifest entry.** `resolveModuleForPath` keeps the first equal-length prefix (`availability.ts`, strict `>`), so a second `/workforce` entry would be ignored. Set `feature: 'ai'` on the existing `workforce` entry, as is done for `pulse`. The S3 availability test would catch this.
* **N5 (828–834). The job-skip details need specifying.**
  * `advanceJob` returns `Promise<boolean>` (`bg-runtime.ts:271`), so counting `skippedByEntitlement` needs a return-shape change; say what it is.
  * `{done:true, error}` ends as status `failed`, not `done` (`bg-runtime.ts:447-449` → `finish(…,'failed',…)`); state that this is intended.
  * The check belongs in `advanceAdmittedJob` (around :383). Both `advanceJob` and `runSelectedTick` reach it.
* **N6 (782). The new `authenticated` field must be copied into child scopes.** `withAiUsageOrg` and `withAiUsageFeature` (`ai-usage.ts:47-61`) build new scope objects. Otherwise a nested scope silently drops the "authenticated, no org → deny" rule.
* **N7 (929–932). The rate-limiter failure is recorded earlier than the anchors cited.** A connect with no shared token is already counted as a failed attempt in the primary `authorizeGatewayConnect` (`message-handler.ts` around :429, passing `rateLimiter`; `auth.ts:406` `token_missing` → `recordFailure`). That happens before the `:515`/`:709` anchors. Name that site, or the "must not count as a failure" rule is easy to miss. The risk: Base browsers rate-limiting a clinic IP that Premium users share.
* **N8 (803–804, 811–812, 741–744).**
  * `agent-memories/ingest` and `/recall` are gateway server-token routes (`resolve-identity.ts` `isServerTokenPath`). `requireFeature(locals,'ai')` there checks the gateway's owning org, not the agent's org; state that this is accepted.
  * "with no tenant they now return 401" applies even with the flag off, which changes `/api/marketplace/agents` in Release 1 against G8's "flag off = today". Say it is intended, or limit the 401 to enforced mode.
* **N9 (827). The pulse proposals refusal is unspecified.** "`/api/gateway/pulse/proposals` refuses" does not give a status or body. Give one (for example 403 `premium_required`, or 200 `{skipped:'skipped_by_entitlement'}`), so the gateway caller's handling is defined.

---

## Prior findings status

R = `readiness_impl.md`, C = `readiness_codebase.md`. Design line numbers refer to the revised `design.md`.

| Prior | Finding | Status | Where resolved / note |
|---|---|---|---|
| R-B1 | Flag-off UI demotes FACES | ✅ Resolved | 341–347, 865–869, tests 913–915 |
| R-B2 | `handleError` cannot produce 403 | ✅ Resolved | 374–383, 792–806 (up-front gate, streaming checked first) |
| R-M1 | Features never reach the hook guard / `canViewPath` | ✅ Resolved | 546–557, 865–877 (anchors verified: `hooks.server.ts:367-395`, `Sidebar.svelte:361`) |
| R-M2 | AI page list deferred | ✅ Resolved | 558–572; every `(app)/` top-level dir is classified. New: `/channels/[id]` conflict (B3) |
| R-M3 | Channel config writes, bootstrap polls | ✅ Resolved | 420–442, R10; method names verified on gateway |
| R-M4 | `hasFeature` semantics | ✅ Resolved | 329–332, 573–575 |
| R-M5 | Gateway plumbing files | ✅ Resolved | 928–943 (all files and lines verified) |
| R-M6 | Malformed claims fail open | ✅ Resolved | 528–530, 936–937 |
| R-M7 | JWT issuer on lookup error | ✅ Resolved | 350–353, 817–819 |
| R-M8 | Data model | ✅ Resolved | 289–304 (N1 is a wording/REVOKE nit) |
| R-M9 | Backfill literals | ✅ Resolved | 989–1002 (FACES id present in hub scripts) |
| R-M10 | jobs/tick handlers, skip semantics, Pulse org | ✅ Resolved | 828–839 (job types verified); N5 |
| R-M11 | Marketplace with no org; `sync` | ✅ Resolved | 372, 810–813; N8 |
| R-M12 | Gateway AI outside dispatch | ✅ Resolved as accepted risk | R1, R2, 957–959 |
| R-M13 | S3 test plan thin | ✅ Resolved | 912–922 |
| C-R1 | Shared token bypasses gate | ✅ Resolved | 447–462, 814–816, 878–881, 928–933 (JWT-only path verified necessary at `message-handler.ts:515-533,709,908`) |
| C-R2 | `/mcp` lacks features | ✅ Resolved | 534–535, 942–943 (`server.impl.ts:1643-1655,1695-1707`, `registry.ts:33` verified) |
| C-R3 | Provisioning JWT | ✅ Resolved | 525–527, 819 |
| C-R4 | Chokepoint has no org | ✅ Resolved | 385–394, 782–785 (`appHandle` runs inside `aiUsageScopeHandle`, `hooks.server.ts:802,815`) |
| C-R5 | 403 mechanism | ✅ Resolved | as R-B2 |
| C-R6 | `canViewPath` / hook | ✅ Resolved | as R-M1 |
| C-R7 | Backfill column | ✅ Resolved | 297, 999 |
| C-M1 | Missing hub AI paths | ✅ Resolved | 794–806. New gaps: M2 (agent provisioning), M1 (handoff) |
| C-M2 | Gateway background AI | ✅ Resolved as accepted risk | R1 |
| C-M3 | Mirror coverage, push path | ⚠️ Resolved, but the push introduces B1 | 475–485 |
| C-M4 | JWT staleness | ✅ Resolved | 538–540, R4 |
| C-M5 | Ledger site and test | ✅ Resolved | 512–514, 973–974 (`monitor.ts:171` verified) |
| C-M6 | Claim plumbing, impersonation | ✅ Resolved | 536–537, 938–939 |
| C-M7 | Allowlist gaps | ✅ Resolved | 418–432 (names verified; `web.login.start` / `.wait` exist) |
| C-M8 | S3 client caller list | ✅ Resolved | 882–909; B3 is a separate omission |
| C-M9 | Route-contract sites, `/orgs` overlap | ✅ Resolved | 765–776 (six sites and counts verified); N2 |
| C-M10 | Autonomous-agent actions | ✅ Resolved | 505, 904–907 |
| C-M11 | `/api/marketplace/sync` | ✅ Resolved | 812–813 |
| C-M12 | Deferred decisions | ✅ Resolved | 828–839, 558–572, 298–304, 840–843 |
| C-M13 | `App.Error.feature` | ✅ Resolved | 791 |

## Verified correct in this pass (no action)

**Paths:** every named S1–S4 path that the design describes as existing does exist on the stated ref.

**Hub anchors:**

* `reminders.service.ts:180,309`
* `channel-publish.service.ts:103,205`
* `/api/internal/flows/[id]` (no `aiEnabled` today; `flows.tenant_id` exists)
* `/api/internal/channels/resolved` → `toResolvedChannels`
* `SUPER_VIEWS` → `can()` derivation (`policy.ts:39,56`)
* `capability:` route policy
* the route-contract counts (`report.pages` 163, `summary` 163/152)
* `getCoreDb` bypasses RLS (comment in `internal/channels/resolved`)

**Gateway anchors:**

* `authorizeGatewayMethod` `:205/:210/:233`
* `extractUserClaims` `:88`
* `auth-refresh.ts` in-place identity update
* `dispatch-from-config.ts:211,267,431`
* `channel-hydrate.ts:29,34-55`
* `flows-run.ts` → `/flows/run`

**Runner anchors:**

* `server.ts:63-77` loader
* `types.ts:249` node union
* router `mode: 'rule'|'llm'|'hybrid'`
