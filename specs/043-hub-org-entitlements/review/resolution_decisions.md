# Resolution decisions (Elephant, 2026-10-29)

Inputs: the seven goldfish reports in this directory. These decisions settle every 🔴 and every 🟡. Apply them to
`../design.md`. A 🟢 may be applied when it is cheap and does not conflict with a decision below.

## Owner rules that bind every decision (do not reopen)

- AI is closed for Base orgs everywhere, unless a non-AI feature needs the path (owner, 2026-10-29).
- Disabled AI is **not rendered**: no tag, no lock, no upgrade copy. The server is the authority.
- Channel AI is "simply disabled" through configuration, never by a live per-message hub check.
- The message ledger is not an AI feature and keeps its own configuration.
- "RBAC for the cloud server": plans gate orgs the way roles gate members.

## Decisions

1. **The UI follows the flag (impl B1, critic B2, comprehension 🔴).** While `ENTITLEMENTS_ENFORCED` is off,
   `resolveEntitlements` reports every feature as granted, for the UI, the route guard, `aiEnabled` and JWT claims
   alike. With the flag on and the lookup failing, the UI and route guard render as entitled (a paying org is
   never demoted by an outage), and server gates keep the G1 fail-closed rule. Say so in G8, CUJ 6 and Rollout.

2. **The hub chokepoint must know the org (zoom B1, critic B1, codebase R4).**
   - Fill the AI usage scope's org in `src/hooks.server.ts` as soon as `locals.tenantCtx` resolves (call
     `setAiUsageOrg`), not lazily in `getTenantCtx`.
   - With the flag on, a model call from an authenticated request with no org in scope is **denied**, not "not
     enforced".
   - Model calls with no request and no org (scripts, platform ticks) stay not enforced and are logged.
   - Pulse tick and the `jobs/tick` AI handlers wrap each org's work in `withAiUsageOrg`. Name the handlers using
     the codebase report's evidence.
   - Add `api/notes/transcribe` (gateway `media.transcribe`) and `api/voice/tts` (ElevenLabs) to the enforcement
     table.
   - Add a CI test that lists every `getOpenRouterModel` caller, every raw `openrouter.ai` / ElevenLabs fetch and
     every AI `gatewayCall` method, and fails if one is neither in an org scope nor behind an explicit gate.

3. **No `handleError` mapping (impl B2, codebase R5).** Every AI route calls `requireFeature(locals, 'ai')` (or a
   narrower key) as its first line. Name every route; the codebase report lists them. The chokepoint stays as
   the backstop: it throws `EntitlementError`, the route's existing catch logs it, and that is acceptable because
   the UI never offers the action. `handleError` only logs. Streaming routes rely on the up-front check.

4. **Shared-token bypass (codebase R1, critic M2): close it for Base orgs.**
   - With the flag on, `GET /api/servers/[id]/token` refuses (403 `premium_required`) for an org without `ai`,
     so a Base-org browser never holds the shared operator token.
   - `gateway.svelte.ts` connects Base-org sessions with the JWT only and disables the 60 s shared-token fallback
     for them. If the JWT fails, the gateway is unavailable for that session; channel pages show their normal
     "gateway unreachable" state.
   - The fix agent must verify that `ws-jwt-auth.ts` accepts a JWT-only connect. If it does not, the design adds
     that change to S4.
   - Premium orgs keep today's behaviour. The fact that any member of any org can read the shared token is a
     pre-existing security issue wider than this spec: record it as a `TODO(handoff)` plus proposal item and do
     not fix it here.
   - The HTTP `/v1/*` surfaces need the shared token, which Base browsers no longer get, so say that they are
     covered by this.

5. **MCP client (codebase R2).** Add `server.impl.ts` (`McpClientIdentity`, `buildMcpClient` and the JWT identity
   resolver) to S4, copying `plan` and `features`, plus a test.

6. **Hub provisioning and new orgs (codebase R3, zoom M3).**
   - Correct the false claim: orgs ARE created in the hub (`organization-provision.service.ts`).
   - `mintOrgGatewayJwt` omits entitlement claims. The hub server decides for itself.
   - `shells.*` (the cloud workstation, not AI) joins the allowlist anyway.
   - Provisioning writes no plan row, because a missing row means Base.
   - Mention the 2026-10-28 module-packages proposal as a sibling: a future package can set a plan, but nothing
     in it is needed now.

7. **Gateway allowlist contents (codebase M7, impl M3, zoom M7, critic M6).** The allowlist is rewritten as an
   explicit, named list. The rule is: AI execution is denied, and reads and non-AI configuration are allowed.
   - Allow:
     - handshake, `health`, `status`, `whoami`, `presence`, `system-presence`, `last-heartbeat`, `auth.refresh`;
     - all `channels.*` (including `channels.send`, `channels.directory.list`, `channels.*.validateToken`,
       `channels.whatsapp.pair`) and `web.login.*`;
     - **all `config.*`**, because channel setup needs config writes and agents configured there cannot run;
     - `shells.*`;
     - `myAgent.feedToday`, `myAgent.emailBody`;
     - the read-only listings the dashboard bootstrap polls: `agents.list`, `sessions.list`, `cron.list`.
   - Remove the "copy from `server-methods-list.ts` at implementation time" deferral. Name the file
     `src/gateway/server-core/server-methods-list.ts`, and note that its `BASE_METHODS` lacks the handler-only
     names.
   - `flows.trigger.register` is handled under decision 8.

8. **Flows are Base; AI nodes are Premium (critic M8).** By the owner's rule, non-AI automation (ERP→CRM→RPA) is a
   non-AI need.
   - The flow editor and flow triggers stay open, `flows.*` gateway methods are allowed, and
     `flows.trigger.register` is allowed.
   - AI node types (LLM, agent nodes and the copilot) are not rendered in the palette for Base orgs.
   - At run time, an AI node in a Base org's flow is skipped and logged. Use the gateway mirror's `aiEnabled` for
     the owning org, or whatever org source flows already have. If flows have no reliable org source, record that
     as a known gap.
   - Agents, autonomous agents, builder, workshop and sessions remain AI (hidden).

9. **Gateway background AI (critic M3, codebase M2, impl M12).** Cron agent runs, heartbeats, webhook agent runs
   (`src/gateway/server/hooks.ts`), `heartbeat-runner.ts` calling `getReplyFromConfig` directly, and gateway Pulse
   generation are NOT gated in this spec. They need an agent→org binding that spec 042 S1 owns.
   - Narrow G4 and the acceptance so they claim only what is gated.
   - List these paths in Risks, with `TODO(handoff)` and a proposal item.
   - Base orgs cannot create new ones: the cron and agent write methods are refused, and the pages are hidden.
     Existing ones keep running until 042.

10. **Channel AI mechanism (critic M4, codebase M3).** Keep `aiEnabled`, because the existing `replies:'none'`
    switch blocks only sending, so the agent still runs and spends. It also works only in db mode. Add this as a
    rejected alternative.
    - Use the existing push: `setOrgPlan` calls `signalChannelChange` for the org's accounts, which brings the
      change to near-immediate. The 5-minute tick stays as the bound.
    - State that the mirror covers only whatsapp, telegram and discord. Every other channel type is a permanent
      mirror miss and is not enforced; list this in Risks.
    - An unset `gateway.hubMetrics` leaves the mirror empty, so nothing is enforced; list this in Risks too.

11. **`plan_features` is dropped (zoom M1, structural M6, impl M8).** The plan→feature mapping is `PLAN_DEFAULTS`
    in code: a reviewed, typed mapping table, which meets the owner's "mapping table" ask, and a new plan such as
    Premium-lite is a PR. Remove the table, the override step and every mention. Record "DB-editable overrides" as
    a later additive step under Alternatives.

12. **Sub-keys stay but are spelled out (zoom M4, impl M4, zoom M5).**
    - Keep `ai`, `ai.chat`, `ai.proactive` and `marketplace`.
    - State the rule: a child is granted only when its parent is granted and nothing disables it, so inheritance
      only ever removes.
    - The server sends the **fully expanded** list of granted keys. The client `hasFeature` is `features.includes(key)`
      with no evaluator copy.
    - The rule helpers stay in the catalog, but no feature has a rule at launch. Say so.

13. **Admin page reuses what exists (zoom M2, codebase M9).**
    - Put the page in the existing platform-admin surface: the `/orgs` page and the `SUPER_VIEWS` registry, as the
      evidence shows. The sidebar entry goes through that registry and the `canViewPath` authority, not a
      hard-coded `role === 'admin'`.
    - Fix the route-contract step so it names all six count sites, using codebase M9 and style D1.

14. **The UI route gate is wired where the guard actually runs (codebase R6, impl M1, impl M2).**
    - S3 modifies `hooks.server.ts` `applyModuleAvailabilityGuard`, which resolves entitlements and passes
      `features`.
    - It also modifies `ModuleAvailabilityContext` (`availability.ts`), `isModuleAvailable`, `route-guard.ts`, and
      `canViewPath` (which reads `page.data.entitlements`). It covers the plugin/module filter in `sections.ts`.
    - Name every AI page prefix now, from `sections.ts`, `GNav.svelte` and `MODULE_MANIFEST`, with no
      "implementation time" deferral.
    - The inline-control list gets corrections: drop anything already under a hidden page, drop dead code
      (`AgentCreatorWizard` if confirmed dead), and add the missed callers (similar-wins, win-index, journey
      analyze, brains search, transcribe, TTS and others from codebase M8).
    - Add the CI inventory test from decision 2, so the list cannot drift.

15. **Data model and backfill are made exact (codebase R7, structural M8, impl M8, impl M9, style D4).**
    - `org_plans(org_id pk, plan_key, set_by_profile_id uuid null, set_note text null, set_at)`.
    - `org_plan_events(id, org_id, from_plan, to_plan, actor_profile_id uuid null, note text null, created_at)`.
    - System writes use a null actor plus a note, for example `note = 'launch-backfill'`.
    - The backfill names its literal inputs: the Bernibites org id and the FACES org id. Look them up read-only
      if needed (hub `organizations` by slug or name); if they cannot be found from the repo, say the script
      resolves them by slug and asserts exactly one match.

16. **JWT claims and staleness (critic M1, codebase M4, impl M6, impl M7).**
    - State the real staleness bound with evidence of when the dashboard refreshes or reconnects. If no periodic
      refresh exists, the bound is "the next reconnect or token expiry"; say which.
    - A malformed `features` claim is treated as `[]`, which fails closed, not ignored.
    - On an entitlement lookup error the issuer omits the claims and logs it. That is fail-open for the dashboard
      gateway, but the hub still gates hub AI. State that.

17. **Marketplace (codebase M11, impl M11).** `/api/marketplace/sync` is a platform operation, so it is not gated
    and is platform-admin only as it already is. Check the evidence. Endpoints with no org use the up-front
    `requireFeature`, which needs `tenantCtx`.

18. **Autonomous agents (codebase M10).** Name the real files that create or run them. If the page server files
    have no actions, gate the API routes those pages call instead.

19. **Structure (structural B1, M1–M5, M7, style F1–F6, D2, D3, D5, zoom M8).**
    - Add a `## Risks & Mitigations` section: one row per risk, with severity, mitigation or "accepted", and its
      `TODO(handoff)` or proposal pointer. It lists every path that is not enforced, in one place, and carries
      forward the brief's design risks, including the embeddings consequence of decision E.
    - Redraw the Shape diagram for the current design.
    - Remove every Premium-tag leftover.
    - Mark the departures from the brief.
    - Split Open Questions into resolved and open.
    - Add CUJs for the gateway method gate and the channel-reply gate.
    - Prefix code paths with their repo (`minion_hub/`, `minion/`).
    - Fix the migration-lag sentence, the TO-BE wording and the unbounded audit task (decision 3 names the routes).

20. **Noise (zoom N2).** PostHog `entitlement_denied` is sent for request denials only. Tick skips are counted in
    the tick response and logs, not sent as events.

Status line stays "Final draft, pending egm-review"; add "Revised after goldfish review 2026-10-29".
