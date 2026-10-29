# S2 audit: hub server gates (executing)

Target: `minion_hub` branch `feat/entitlements-s2-server-gates`, commit `e89d0765` (on S1 `dac2ac03`), draft PR #619.
Method: every claim below was checked by running code (throwaway probes, deleted after) or by a test that fails
without the gate. T037 (token endpoint) is out of scope (superseded by spec 045).

## Findings

### 🟡 F1. Flag off: every gated request waited on a plan lookup (fixed)

`src/server/services/entitlements.service.ts` `checkFeature` awaited `denyReason()` before returning, only to log
`entitlement.would_deny`. Production runs `CACHE_BACKEND=noop` (proposal item 20), so with the flag off every gated
request made one more Postgres round trip, including `notes/autocomplete` and `notes/spelling`, which fire on typing.

- Probe: with the flag off and a DB `execute` that never resolves, `requireFeature(locals,'ai')` never returned
  (raced against a 200 ms timer, the timer won).
- Fix: with the flag off, the shadow lookup runs without being awaited (`entitlements.service.ts:155`). The
  `would_deny` log is kept. Test: `entitlements.service.test.ts` "a request never waits on the shadow lookup".
  The existing flag-off test now waits for the log with `vi.waitFor`.

### 🟡 F2. A plan-lookup error permanently failed Premium orgs' AI jobs (fixed)

`bg-runtime.ts` `advanceAdmittedJob` used `orgAllows`, which returns `false` on a lookup error. The job was then
finished as `failed / skipped_by_entitlement` and never re-leased. A one-off DB error during the lookup would kill a
paying org's `brain_ingest`, corpus or Pulse job for good. Probe: `orgAllows(ORG,'ai','job:x')` with the flag on
and a rejecting DB returned `false`.

- Fix: new `orgFeatureCheck()` returns the deny reason (`entitlements.service.ts:188`). `orgAllows` is now a
  wrapper around it, so its behaviour is unchanged. On `lookup_error`, `bg-runtime.ts:391` returns without running
  or finishing the job. The lease expires and a later tick retries, the same pattern as the existing budget exits.
  A real denial still finishes the job as skipped. Test: `bg-runtime.test.ts` "a plan lookup error neither runs
  nor finishes the job" (PGlite: status is not `failed` and `error` is null).

### 🟡 F3. `ai-call-inventory.test.ts` missed AI gateway calls (fixed)

Probe: four call sites were planted in `src/server/services/`.

| Planted | Caught? |
|---|---|
| `getOpenRouterModel('x')` | yes |
| `fetch('https://api.elevenlabs.io/…')` | yes |
| `gatewayCall('chat.send', …)` | **no** |
| `gatewayCall('myAgent.emailSummary', …)` | **no** |

The method regex covered only `media.transcribe`, `playground.complete`, `agents.create` and `agents.delete`. A
file also had to name `gatewayCall`, `gatewayCallToInstance` or `sendRequest`. Because of that,
`builder-agent-publisher.ts` (`rpc('agents.create')`) was invisible to the scan, although the design lists it as a
row.

- Fix: the regex now also covers `chat.send`, `myAgent.emailSummary`, `myAgent.emailDraftReply` and
  `agent.install`, matched by literal whatever the RPC helper is called. Five rows were added: `chat-rpc.ts`,
  `my-agent-rpc.ts`, `gateway-rpc.ts`, `workshop/gateway-bridge.ts` (all `browser-gateway`) and
  `builder-agent-publisher.ts` (`backstop-only`). The test passes with exactly those additions, with no stale rows.
- Remaining limit (🟢, accepted by design): the check works per file. A new handler added to a file that already
  has a `route-gate` row, or a new caller of a `backstop-only` service, is not flagged. The model-call backstop
  still covers OpenRouter and embeddings calls.

### 🟡 F4. Owner decision applied: the channel mirror no longer demotes a paying org on a lookup error

`api/internal/channels/resolved` used `orgAllows`, so a lookup error answered `aiEnabled=false` and stopped
replies for every org until the next 5-minute mirror tick.

- Fix: new `orgAllowsForConfig()` (`entitlements.service.ts:204`). With the flag off it returns `true` with no
  lookup. With the flag on it returns the real verdict. On a lookup error it uses this instance's last successful
  answer for the org (`lastAnswer`, `:65`, which every successful lookup fills), otherwise `true`, and logs
  `entitlement.lookup_error` with `fallback: last_answer|allow`. The route uses it (`resolved/+server.ts:58`). The
  old `TODO(handoff)` was removed because the item is now decided. Tests: four `orgAllowsForConfig` unit cases,
  plus a route test (Base stays `false` from its last answer, Premium stays `true`, an org never seen is `true`,
  and the event is logged).

### 🟢 F5. route-gates test timed out on a cold parallel run (fixed)

On the first baseline run, `route-gates.test.ts` failed `crm/contacts/[id]/funnel/analyze` at the 5 s default
timeout because the route module import was slow. It passed when run again. The file now sets
`vi.setConfig({ testTimeout: 30_000 })`.

### 🟢 Verified, no change needed

1. **Flag off is today's behaviour.** A probe called every exported verb of every route file containing
   `requireFeature(` or `requireOrgFeature(` (more than 55 files), twice each: as a Base-org member and with no
   tenant. Nothing refused with `premium_required`, `entitlements_unavailable` or the gate's 401. As a control,
   the same probe with the flag on recorded more than 55 refusals. The chokepoint (`llm.ts`, `embeddings.ts`,
   `assistant-router.service.ts`) checks `isEnforced()` synchronously and does no await while the flag is off.
   `orgAllows`, `orgAllowsForConfig`, the ticks, reminders, the provisioner and `bg-runtime` return before any
   lookup while the flag is off. Tick responses gain `skippedByEntitlement` only when something was skipped.
2. **Telemetry changes while the flag is off (documented, accepted).** `hooks.server.ts` now sets the AI-usage org
   for every request that has a tenant. `bg-runtime` now runs `handler.advance` inside
   `withAiUsageOrg(job.tenantId, job.type)`. Both change only `ai_usage` attribution: the org is filled where it
   was null before, and job spend is labelled with `job.type`.
3. **Flag on.** The existing `route-gates.test.ts` covers 60 route families: 403
   `{code:'premium_required', feature}`, no model or fetch call, `structured-stream` refuses before the stream
   starts, and a lookup error returns 503. Gateway callbacks take `orgId` from server records:
   `assistant-principal.ts:69` rejects a `?orgId=` that differs from the resolved org, so a caller cannot choose
   which org is checked. `pulse/proposals` checks the org bound to the server token.
4. **Formatting-only diffs.** Every modified `.ts` file in `e89d0765` was compared as `prettier(HEAD~1 version)`
   against `HEAD`. Files with no intended logic change (all of `workshop/*`, `voice/tts`, `notes/spelling`,
   `workforce/[...path]` and others) show **zero removed lines**: formatting plus the gate lines only. The files
   with removed lines are exactly the intended logic changes: `bg-runtime`, the service, ticks, reminders,
   `channel-publish`, jwt, marketplace GETs (signature now takes `locals`), and `brains/[id]/sources/[sourceId]`
   (arrow bodies became blocks to fit the gate).
5. **AsyncLocalStorage isolation.** Three concurrent `runWithAiUsageScope` requests with interleaved
   `setAiUsageOrg` and `markAiUsageAuthenticated` calls each saw only their own org and authentication flag.
   Each request gets a fresh scope object from `aiUsageScopeHandle`. Child scopes copy the parent's
   `authenticated`.
6. **The chokepoint for an authenticated request with no org** denies with `no_org`. A request with no scope, or
   an unauthenticated scope with no org, is allowed and logged (existing `ai-entitlement-chokepoint.test.ts`,
   which passes).

## Open ends (not fixed here)

- 🟢 **Flag-on lookup cost under `noop` cache.** With `CACHE_BACKEND=noop`, every gated request does a DB lookup
  when enforced. So does `ensureActivePersonalAgent` on every `(app)` layout load, and `assistant/route` does it
  twice (route gate plus the router backstop). This is accepted by design (proposal item 20). Revisit if p95
  latency moves after the flag is turned on.
- 🟢 **`lastAnswer` is per instance.** A cold Vercel instance with no earlier answer answers `true` on a lookup
  error, which is what the owner decision allows. Recorded under proposal item 17 (edited in the meta worktree,
  not committed).
- `/api/internal/flows/[id]`: fixed in follow-up commit `1dce71fa` (owner rule). It is a config fetch by the
  flows runner, so it now uses `orgAllowsForConfig`: the last answer for the org, else `true`, and it logs
  `lookup_error`. A route test covers it.

## Gates

- Targeted vitest (14 files: the S2 tests plus the touched ones): 226/226 pass.
- `bun run check`: 2 errors, both the pre-existing `PUBLIC_POSTHOG_*` errors in `hooks.client.ts`; 0 warnings.
- `prettier --check` on the changed files: clean.
