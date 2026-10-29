# Consolidated review report: 043 org entitlements

*   **Inputs:** the seven goldfish reports in this directory (zoom_out_report, comprehension_report,
    critic_design, critic_structural, style_report, readiness_impl, readiness_codebase) and the 20 binding
    decisions in `resolution_decisions.md`.
*   **Target:** `../design.md`, revised 2026-10-29 (copied to `../design_draft.md`).
*   **Code checked:** hub `minion_hub` `origin/master` 812a4b0a; gateway `minion` `origin/DEV` 191d9a69d8a;
    flows runner `langgraph-server/` in this meta repo. Read-only.
*   **Raw findings:** 149 across the seven reports, merged into 47 action items below.

Resolution labels: **Decision N** (applied as the binding decision says), **Applied** (fixed by the resolver
with no decision needed), **Resolver choice** (a detail no decision covered; the resolver picked the option
noted, open to the owner), **Accepted as risk** (listed in the design's Risks & Mitigations), **Not applied**
(with the reason).

## Verifications done for the decisions

| Ref | Question | Answer (evidence) |
|---|---|---|
| (a) | Does the gateway accept a JWT-only connect? | **No.** `resolveJwtAuth` Case 1 (`ws-jwt-auth.ts`) would accept a JWT alone, but `message-handler.ts` reaches it only after shared-credential auth: no token and no device → "device identity required" (`:515-533`, `canSkipDevice = sharedAuthOk`); failed shared auth → rejected at `:709`, before the JWT block at `:908`. The JWT-only path is added to S4. |
| (b) | AI routes and AI page prefixes | Routes: the 15 `getOpenRouterModel` route files, plus service-backed routes (artifacts generate/regenerate, journey analyze, similar-wins, win-index, sentiment, faq-draft, agent-memories ×3, brains, workshop, workforce), `notes/transcribe` (`media.transcribe`), `voice/tts` (ElevenLabs), three gateway agent-callback routes, `assistant/route`, marketplace ×4. Pages: `/agents`, `/builder`, `/workshop`, `/sessions`, `/brains`, `/prompt`, `/capabilities`, `/tools`, `/flow-editor/skills`, `/workforce`, `/reliability`, `/terminal`, `/plugins`, `/settings/plugins` (`ai`); `/pulse`, `/settings/pulse` (`ai.proactive`); `/marketplace`. Full list in design S2 and UI section. |
| (c) | Where the dashboard refreshes the gateway JWT | It does not refresh. `gateway.svelte.ts` `onChallenge` (~line 423) fetches a fresh JWT on every handshake ("auto-reconnect handshakes fetch fresh"); no hub caller of `auth.refresh`; the gateway checks `exp` only at handshake. Bound = the next reconnect. |
| (d) | Bernibites / FACES lookup | FACES id `21e0601b-f632-43fd-8414-d644af4271f4` (constant in several `minion_hub/scripts/*.ts`; slug `faces-sculptors` in `scripts/qa/env.ts`). Bernibites' id is in no repo; the script resolves it by name (slug may be null), asserts one match, prints it on dry run, and `--apply` requires `--expect-base <id>`. No database was queried. |
| (e) | Is `AgentCreatorWizard` dead? | **Yes.** The file exists but has no importer on `origin/master`; it is the only client caller of `/api/marketplace/generate-agent`. |
| (f) | Autonomous-agent create/run files | The page servers export only `load`. "Autonomous agents" are system-agent descriptors (`src/lib/server/system-agents/registry.ts`: reminders, alert-watcher, artifact-builder) plus Paperclip agents (`workforce-agents.ts`). They run through the reminders tick, the gateway alert-watcher plugin, `/api/artifacts/generate` + `[id]/regenerate`, and `/api/workforce/[...path]`; those are gated instead. |
| (g) | How flows know their org; where AI node types live | Flows are executed by `langgraph-server` (`FLOWS_RUNNER_URL`, default `localhost:2025`), which loads each flow from hub `GET /api/internal/flows/[id]`; flow rows carry `flows.tenant_id`. Manual test runs come through gateway `flows-run.ts` with the client's `features`. AI node types: `langgraph-server/src/flow/types.ts:249` (runtime) and `minion_hub/src/lib/components/flow-editor/FlowSidebar.svelte` `CATEGORIES` (palette). |

## 🔴 Blockers

| ID | Action item | Resolution |
|---|---|---|
| A1 | The UI hide, route guard, `aiEnabled` and claims must follow `ENTITLEMENTS_ENFORCED`; Release 1 would otherwise hide AI from FACES before the backfill. With the flag on and a lookup failing, the UI must not demote paying orgs | Decision 1 (G8, resolution policy, CUJ 6, S3 tests) |
| A2 | The hub chokepoint has no org on most user-facing AI routes, Pulse and jobs, so it fails open | Decision 2 (`appHandle` sets the scope org; authenticated + no org = deny; `bg-runtime` wraps jobs; transcribe and TTS gated; CI inventory test) |
| A3 | `handleError` cannot produce a 403; AI routes catch model errors; the audit task was unbounded; streaming routes | Decision 3 (every AI route named with up-front `requireFeature`; `handleError` unchanged) |
| A4 | Every browser holds the shared token, so dropping the JWT bypasses the gateway gate; HTTP `/v1/*` surfaces too; Q2 left open | Decision 4 (token endpoint refuses Base; JWT-only connect; fallback disabled; pre-existing token exposure recorded). Verification (a) added the gateway JWT-only connect change to S4 |
| A5 | `/mcp` JWT clients carry no `features` | Decision 5 (S4 `McpClientIdentity`, `buildMcpClient`, resolver, test) |
| A6 | The hub does create orgs; `mintOrgGatewayJwt` would carry Base claims and fail `shells.*` provisioning | Decision 6 (claim corrected; provisioning JWT omits claims; `shells.*` allowed; no plan row; module-packages proposal noted) |
| A7 | The 404 guard runs in `hooks.server.ts`, not the layout; `canViewPath` ignores module toggles; `ModuleAvailabilityContext` lacks features | Decision 14 (S3 modifies `applyModuleAvailabilityGuard`, `availability.ts`, `route-guard.ts`, `can.svelte.ts`; `sections.ts` covered through `canViewPath`) |
| A8 | Data model contradictions: `set_by` uuid vs `'launch-backfill'`; missing types, FK, index, RLS predicate | Decision 15 (exact columns; null actor + note; house GUC policy; `getCoreDb()`) |
| A9 | No Risks & Mitigations section | Decision 19 (19-row table with severity, status and pointers) |

## 🟡 Majors

| ID | Action item | Resolution |
|---|---|---|
| A10 | Gateway allowlist: deferred names, wrong file, bootstrap polls refused, config writes, `presence` / `whoami` / `shells.*` undecided, three inconsistent descriptions | Decision 7 (one named table; file named; `BASE_METHODS` gap stated). Applied: `presence` has no handler on `DEV`, `system-presence` used |
| A11 | Flows filed under AI removes non-AI automation; flow channel triggers run AI before the reply gate | Decision 8 (editor open; AI nodes not offered; runner skips AI nodes using `flows.tenant_id` via the hub, or client `features` for test runs) |
| A12 | Gateway crons, heartbeats, webhooks, gateway Pulse are outside every gate; G4 overclaimed | Decision 9 (G4 narrowed; Risks R1; `TODO(handoff)` + proposal) |
| A13 | Channel mechanism: `replies:'none'` not evaluated; mirror covers 3 types; push path exists; `hubMetrics` unset | Decision 10 (alternative added; push via `signalChannelChange`; R2, R3) |
| A14 | `plan_features` has no writer and duplicates `PLAN_DEFAULTS` | Decision 11 (dropped; Deferred alternative) |
| A15 | Sub-keys, dotted inheritance, `features` contents and the client evaluator copy | Decision 12 (inheritance only removes; expanded list; `includes`) |
| A16 | Admin page duplicates `/orgs`; hard-coded `user.role`; route-contract sites unnamed; badge needs a loader | Decision 13 (`/orgs/plans` in `SUPER_VIEWS`; `canViewPath`; six sites named; badge dropped) |
| A17 | AI page list deferred; inline-control list redundant, dead and incomplete; missing server routes | Decision 14 (+ verification b, e). `/reliability`, `/terminal`, `/plugins`, `/settings/plugins` hidden: resolver choice under decision 14 (they call non-allowlisted methods or need the shared token) |
| A18 | JWT staleness unsupported; malformed claims fail open; issuer behavior on lookup error | Decision 16 (+ verification c) |
| A19 | `/api/marketplace/sync` is platform-wide; catalog GETs have no org | Decision 17 (sync ungated; `agents`, `agents/[id]` gated, 401 with no tenant) |
| A20 | Autonomous-agent page servers have no actions | Decision 18 (+ verification f; gated the routes they call) |
| A21 | Structure: stale diagram, Premium-tag leftovers, unmarked departures, mixed open questions, missing CUJs, unprefixed paths, unparseable migration-lag sentence, TO-BE wording | Decision 19 (diagram redrawn; departures listed; Q split; CUJ 7 and 8; repo prefixes; `42P01` = `lookup_error`; TO-BE rewritten) |
| A22 | `jobs/tick` AI handlers unnamed; skip meaning for a leased job undefined | Decision 2 for naming. Resolver choice: the skip ends the job `{done: true, error: 'skipped_by_entitlement'}` in `bg-runtime` `advanceJob`, so it is not re-leased |
| A23 | Base features that call AI internally (reminder confirmation inference) would break; error-swallowing services miscount skips | Applied under the owner rule: `inferConfirmation` treated as off for orgs without `ai.proactive` (keyword parser); ticks check before work so skips count cleanly (R16) |
| A24 | Gateway claim plumbing names wrong files and misses `message-handler.ts`, `ws-types.ts`, `JwtUserClaims`, `parseHydrationBody`, unconditional refresh assignment; impersonation | Applied (S4 lists each). Resolver choice: impersonation keeps the connection's own `features` |
| A25 | WhatsApp ledger write site and test | Applied (`web/inbound/monitor.ts:171`; new WhatsApp ledger test) |
| A26 | `App.Error` lacks `feature` | Applied (S2 `app.d.ts`) |
| A27 | `toResolvedChannels` batch loading; error helper unnamed | Applied (per-tenant map passed in; `fetch-json.ts` named) |
| A28 | Backfill lacks literal ids, snapshot path, DB env, runner, apply guard, exit code | Decision 15 + verification (d) |
| A29 | S3 test plan thin | Applied (layout/guard flag cases, `hasFeature`, `canViewPath`, `my-agent-rpc`, `EmailModal`, JWT-only connect) |
| A30 | Undefined mechanisms (admin-scope bypass, never-silently-disable rule, mirror, cache helpers) | Applied (explained inline with file anchors) |
| A31 | Which path the email summary / draft reply take | Applied (browser → gateway WS via `my-agent-rpc.ts`; refused by the allowlist) |
| A32 | PostHog event volume | Decision 20 |
| A33 | "Hub: immediate" depends on the cache backend | Applied (G9 bound; R15) |
| A34 | Undefined names (FACES, Bernibites, Pulse, doors, My Agent, EGM) | Applied ("Names used" glossary; FACES id given) |
| A35 | References that need conversation context | Applied (spec 041 `unnest` bug spelled out; screenshot and sidebar-row asides removed; owner visual-feedback rule stated) |
| A36 | Reason values vs pure evaluator; brief's `no_plan_default` dropped silently | Applied (`lookup_error` from the resolver; `planSource`; listed as a departure) |
| A37 | Wrong paths and line numbers (`embeddings.ts`, schema barrel, Pulse loop location, `llm.ts` lines) | Applied |
| A38 | Config writes for Base orgs and channel setup | Decision 7 allows `config.*` at the plan gate. Verification found a pre-existing limit: JWT sessions get role-derived scopes, so non-admin members cannot call `config.*` writes, `web.login.*`, `channels.send`, `flows.*` or `shells.*` whenever `PUBLIC_GATEWAY_JWT_AUTH` is on. Not changed here; Accepted as risk (R10) |

## 🟢 Nits

| ID | Action item | Resolution |
|---|---|---|
| A39 | One-join read path in `loadCanonicalMemberships` | Applied as a Deferred alternative |
| A40 | Two checks gate the same thing in ticks | Not applied: reminders need the non-AI fallback, and jobs are now checked in one place (`bg-runtime`) |
| A41 | Unknown `plan_key`, rule cycles, table naming | Applied (unknown plan → Base; `has()` reads earlier keys only); naming moot after A14 |
| A42 | Platform admin in a Base org loses agent access | Applied (stated as intended) |
| A43 | Null-tenant accounts and user-scoped accounts | Applied (`tenantId` decides; null → `true`, logged) |
| A44 | Header date, status line, acceptance placement, Rollout vs Launch order, DELTA marker | Applied (revision date; G9; one sequence; DELTA pointer). Status kept as "Final draft, pending egm-review" plus the revision note, as decision 19 instructs, instead of style F7's "Draft for review" |
| A45 | Heading and label consistency, Alternatives split, enforcement table grouping, data-model types, reason/code vocabulary, CUJ 1 missing `ai` | Applied, except heading attribution: owner-dated headings kept because they record owner rules |
| A46 | Wording: filler, vague rule, metaphor, "for one thing", jargon, unverifiable reuse claim, hyperbole, spelling, "determined user", repeated rationale, "Merge S1 to S3", TODO overclaim, "refuses with the premium message" | Applied (the remaining "simply disabled" is the owner's quote) |
| A47 | Spec 042 has no link | Not applied: no spec 042 file exists in the meta repo to link; named in the glossary |

## Traceability matrix

| Report | Finding | Item |
|---|---|---|
| zoom_out | B1 | A2 |
| zoom_out | M1 | A14 |
| zoom_out | M2 | A16 |
| zoom_out | M3 | A6 |
| zoom_out | M4 | A15 |
| zoom_out | M5 | A15 |
| zoom_out | M6 | A17 |
| zoom_out | M7 | A10 |
| zoom_out | M8 | A21, A8 |
| zoom_out | N1 | A39 |
| zoom_out | N2 | A32 |
| zoom_out | N3 | A40 |
| zoom_out | N4 | A21 |
| comprehension | B1 | A1 |
| comprehension | M1 | A21 |
| comprehension | M2 | A15 |
| comprehension | M3 | A14 |
| comprehension | M4 | A8 |
| comprehension | M5 | A10 |
| comprehension | M6 | A2 |
| comprehension | M7 | A16 |
| comprehension | M8 | A31 |
| comprehension | M9 | A30 |
| comprehension | N1 | A34 |
| comprehension | N2 | A35, A47 |
| comprehension | N3 | A36 |
| comprehension | N4 | A21 |
| comprehension | N5 | A4 |
| comprehension | N6 | A10, A17 |
| comprehension | N7 | A20 |
| comprehension | N8 | A18, A33 |
| critic_design | B1 | A2 |
| critic_design | B2 | A1 |
| critic_design | M1 | A18 |
| critic_design | M2 | A4 |
| critic_design | M3 | A12, A11 |
| critic_design | M4 | A13 |
| critic_design | M5 | A23 |
| critic_design | M6 | A10, A38 |
| critic_design | M7 | A9 |
| critic_design | M8 | A11 |
| critic_design | N1 | A33 |
| critic_design | N2 | A3 |
| critic_design | N3 | A21 |
| critic_design | N4 | A8, A41 |
| critic_design | N5 | A42 |
| critic_design | N6 | A41 |
| critic_design | N7 | A32 |
| critic_structural | B1 | A9 |
| critic_structural | M1 | A21 |
| critic_structural | M2 | A21 |
| critic_structural | M3 | A21, A36 |
| critic_structural | M4 | A21, A4 |
| critic_structural | M5 | A21 |
| critic_structural | M6 | A14 |
| critic_structural | M7 | A21 |
| critic_structural | M8 | A8 |
| critic_structural | N1 | A44 |
| critic_structural | N2 | A44 |
| critic_structural | N3 | A45 |
| critic_structural | N4 | A45 |
| critic_structural | N5 | A45 |
| critic_structural | N6 | A45 |
| critic_structural | N7 | A45 |
| critic_structural | N8 | A45 |
| critic_structural | N9 | A45 |
| critic_structural | N10 | A44 |
| style | F1 | A21 |
| style | F2 | A21 |
| style | F3 | A34 |
| style | F4 | A21 |
| style | F5 | A10 |
| style | F6 | A18 |
| style | F7 | A44 |
| style | F8 | A46 |
| style | F9 | A46 |
| style | F10 | A46 |
| style | F11 | A46 |
| style | F12 | A46 |
| style | F13 | A46 |
| style | F14 | A46 |
| style | F15 | A46 |
| style | F16 | A46 |
| style | F17 | A46 |
| style | F18 | A46, A4 |
| style | D1 | A16 |
| style | D2 | A3 |
| style | D3 | A10, A17 |
| style | D4 | A8 |
| style | D5 | A35 |
| style | D6 | A46, A3 |
| style | D7 | A17 |
| style | D8 | A46 |
| style | D9 | A46 |
| style | D10 | A46 |
| style | D11 | A44 |
| readiness_impl | B1 | A1 |
| readiness_impl | B2 | A3 |
| readiness_impl | M1 | A7 |
| readiness_impl | M2 | A17 |
| readiness_impl | M3 | A10, A38 |
| readiness_impl | M4 | A15 |
| readiness_impl | M5 | A24 |
| readiness_impl | M6 | A18 |
| readiness_impl | M7 | A18 |
| readiness_impl | M8 | A8 |
| readiness_impl | M9 | A28 |
| readiness_impl | M10 | A22, A2 |
| readiness_impl | M11 | A19 |
| readiness_impl | M12 | A12, A13 |
| readiness_impl | M13 | A29 |
| readiness_impl | N1 | A37 |
| readiness_impl | N2 | A37 |
| readiness_impl | N3 | A16 |
| readiness_impl | N4 | A16 |
| readiness_impl | N5 | A16 |
| readiness_impl | N6 | A36 |
| readiness_impl | N7 | A14 |
| readiness_impl | N8 | A37 |
| readiness_impl | N9 | A43 |
| readiness_impl | N10 | A32, A1 |
| readiness_impl | N11 | A10 |
| readiness_codebase | R1 | A4 |
| readiness_codebase | R2 | A5 |
| readiness_codebase | R3 | A6 |
| readiness_codebase | R4 | A2 |
| readiness_codebase | R5 | A3 |
| readiness_codebase | R6 | A7 |
| readiness_codebase | R7 | A8 |
| readiness_codebase | M1 | A37, A17, A2 |
| readiness_codebase | M2 | A12 |
| readiness_codebase | M3 | A13 |
| readiness_codebase | M4 | A18 |
| readiness_codebase | M5 | A25 |
| readiness_codebase | M6 | A24 |
| readiness_codebase | M7 | A10 |
| readiness_codebase | M8 | A17 |
| readiness_codebase | M9 | A16 |
| readiness_codebase | M10 | A20 |
| readiness_codebase | M11 | A19 |
| readiness_codebase | M12 | A22, A17, A8, A27 |
| readiness_codebase | M13 | A26 |
| readiness_codebase | N1 | A37 |
| readiness_codebase | N2 | A37 |
| readiness_codebase | N3 | A37 |
| readiness_codebase | N4 | A16 |
| readiness_codebase | N5 | A33 |
| readiness_codebase | N6 | A10 |
| readiness_codebase | N7 | A43 |

## Notes for the owner

*   Decision 4 named `GET /api/servers/[id]/token`; the route is `POST` on `origin/master`. The design uses POST.
*   Decision 7 lists `presence`; gateway `DEV` has no such method, only `system-presence`. The design allows
    `system-presence` and says so.
*   Resolver choices that the owner may want to confirm: hiding `/reliability`, `/terminal`, `/plugins` and
    `/settings/plugins` for Base orgs (A17); ending skipped AI jobs as done (A22); impersonation keeps the
    connection's own features (A24); the flows-runner change ships as a meta PR inside S4.

---

## Round 2 (stage 8 intermediate zoom-out + stage 9 readiness re-audit)

Inputs: `intermediate_zoom_out_report.md` (🔴 1 · 🟡 2 · 🟢 5) and `implementation_readiness_report.md`
(🔴 3 · 🟡 3 · 🟢 9), plus the coordinator's round-2 decisions 1–8. This is the final round; residuals are
recorded as accepted trade-offs in the design's Risks & Mitigations (R5, R8, R10, R20–R22 changed or added).

### Decision 3 verification (which branch)

**Branch "yes" taken.** The native channel setup at `/settings?s=comms` (`settings/+page.svelte:268-270` →
`ChannelsTab.svelte` → `ChannelSetupWizard.svelte`, `ChannelCard.svelte`, `ChannelGroup.svelte`,
`WhatsAppQrPairing.svelte`) never calls `fetchHostToken`. It uses hub HTTP (`POST /api/servers/[id]/channels`,
`/api/servers/[id]/channels/[id]`, `/channels/sync`) and dashboard WebSocket methods only:
`channels.telegram.validateToken` (wizard `:77`), `channels.discord.validateToken` (`:97`),
`channels.whatsapp.pair` (`services/gateway/whatsapp.ts:27`, used by `WhatsAppQrPairing`) and `config.patch`
(wizard `:216`, `ChannelGroup` `:67`). All are in `BASE_PLAN_GATEWAY_METHODS`. It covers WhatsApp, Telegram and
Discord, the three types the mirror gates. Limit (pre-existing, R10): on any JWT connection those methods need
`operator.admin`, so a platform admin, not an ordinary member, does the setup; that is already true for Premium
orgs whenever `PUBLIC_GATEWAY_JWT_AUTH` is on. Only the plugin UIs need the shared token: `PluginControlCenter`
(`/channels/[id]`, `/plugins/[id]`), `/settings/plugins`, and `PluginSlotHost` iframe entries on
`/account/connections` (`ChannelLinking.svelte:298-300`; its `qr` and `form` modes do not use the token). So
decision 4 stands, and those surfaces are hidden for Base orgs.

### Round 2 action items

| ID | Finding(s) | Resolution |
|---|---|---|
| B-R2-1 | Readiness B1: `setOrgPlan`'s `signalChannelChange` restarts the whole channel type on the gateway, once per account | Round-2 decision 1. Push removed; channel AI follows the 5-minute mirror tick; G9, CUJ 1, Shape, S1, acceptance (wait ≤5 min, no restart in the log) updated; Replaced alternative added; S1 test "no channel signal or restart" |
| B-R2-2 | Readiness B2, zoom M2: a skipped AI node passed its input through, echoing the customer's message | Round-2 decision 2. A skipped AI node ends its branch with no output; `run-triggered` returns `reply: ''` when the last message was not produced by a node, so `deliverResponse` sends nothing (`trigger-manager.ts:297` guard). S4 runner test rewritten to assert no outbound send; pass-through added as a Replaced alternative |
| B-R2-3 | Readiness B3, zoom B1: `/channels/[id]` and `/account/connections` plugin slots need the shared token but stayed visible | Round-2 decision 3, branch "yes" (above). `/channels/[id]` 404s for orgs without `ai`; `/channels` cards and `ChannelsNav` link to `/settings?s=comms`; iframe entries on `/account/connections` not rendered; CUJ 7 and acceptance gain the settings-setup line; R8 rewritten |
| M-R2-1 | Readiness M1: `handoff` node relay suggestions call a model; `pluginAction` unclassified | Round-2 decision 4. Relay opens with no suggestions for Base (runner sends `suggestionCount: 0`; relay skips `generateSuggestions` at count 0 or for a Base WS client, `relay/index.ts:275,323,414-416`). `pluginAction` classified: AI = `alertWatcher.classify`, `alertWatcher.suggest`; not AI = `alertWatcher.gate`, `alertWatcher.sendAlert`, `flowExample.echo`; named list `AI_PLUGIN_ACTION_METHODS` shared by runner and palette (R20) |
| M-R2-2 | Readiness M2: inventory grep matches unlisted files; personal-agent provisioning undecided | Round-2 decision 5. Provisioner (`ensureActivePersonalAgent`) creates nothing for orgs without `ai`; `personal-agent/create` and `builder/agents/[id]` routes gated; rows added: `service-gate` (provisioner), `browser-gateway` (`personal-agent.svelte.ts`, `workshop/experiments.svelte.ts`), `backstop-only` (`brain-agents.service.ts`, `builder-agent-publisher.ts`); scan covers `src/**` including `src/lib/state/**`, excludes `scripts/**` by rule; existing agents stay (R21) |
| M-R2-3 | Readiness M3: changing `fetch-json.ts` would alter a 45-importer contract | Round-2 decision 6. `fetch-json.ts` not changed; `premium_required` handled at the call sites in the S3 inline-control list only; `my-agent-rpc.ts` limited to `getEmailSummary` / `draftEmailReply` on gateway `FORBIDDEN` |
| M-R2-4 | Zoom M1: `/terminal` is a dead redirect; token-hidden pages mislabeled as AI; `/reliability` reason circular | Round-2 decision 7. `/terminal` removed from the hidden list, R8 and S5 (it redirects to `/cloud/terminal`, which uses `shells.access`); `/plugins` and `/settings/plugins` stated as hidden for the shared-token reason with an `availability.ts` comment pointing at R8; `/reliability` kept hidden with the reason "reports agent and LLM run reliability, usage and cost" |
| N-R2-1 | Zoom N1: G1 vs two fail-open issuers; token case wider | Applied. G1 names both exceptions; token endpoint uses the cached answer, else allows and logs; R5 says the token is an org-less `operator.admin` credential |
| N-R2-2 | Zoom N2: `shells.invoke` drives the hermes agent | Round-2 decision 8. `shells.invoke` and `shells.invoke_durable` excluded from the allowlist; S4 test refuses them |
| N-R2-3 | Zoom N3: `orgs.plans` duplicates `orgs.all` | Round-2 decision 8. Reuse `orgs.all`; no new `SUPER_VIEWS` entry. Entry points kept (owner decision D asked for the sidebar link) |
| N-R2-4 | Zoom N4: skipped one-off jobs are lost | Round-2 decision 8. R11 reworded |
| N-R2-5 | Zoom N5: runner `aiEnabled` default safe only on loopback | Round-2 decision 8. Stated in the Flows section and S4 |
| N-R2-6 | Readiness N1: REVOKE for Supabase default grants; policy `TO`; `org_provision_runs` comparison wrong | Round-2 decision 8. Explicit `REVOKE ALL … FROM anon, authenticated` with precedent; wrong comparison removed. Policy `TO` clause not added: RLS with no write policy already denies writes (report says accuracy only) |
| N-R2-7 | Readiness N2: `migrationWaveForRoute` takes `(pattern, family)` | Applied |
| N-R2-8 | Readiness N3: utility link needs a `nav_*` message | Applied (`nav_orgPlans`) |
| N-R2-9 | Readiness N4: `/workforce` already has a manifest entry | Applied (set `feature` on the existing entry) |
| N-R2-10 | Readiness N5: `advanceJob` return shape; `failed` status; check location | Applied (`advanceAdmittedJob`; `failed` intended; boolean kept, internal `skipped` flag, tick count) |
| N-R2-11 | Readiness N6: `authenticated` must be copied into child scopes | Applied |
| N-R2-12 | Readiness N7: rate-limiter failure recorded at the primary `authorizeGatewayConnect` | Applied (site named, `auth.ts:406`) |
| N-R2-13 | Readiness N8: agent-memories ingest/recall check the gateway's org; marketplace 401 with flag off | Applied. Accepted as R22; 401 only when enforced (flag off = today) |
| N-R2-14 | Readiness N9: pulse proposals refusal unspecified | Applied (403 `premium_required`, feature `ai.proactive`) |

Additional resolver change found while verifying decision 3: the `/settings` page defaults to its `ai`
gateway-config tab (`settings/+page.svelte:115`). For orgs without `ai` the `ai` and `agents` tabs are not
rendered and the default becomes `comms` (G7). Applied in S3.

### Round 2 traceability

| Report | Finding | Item |
|---|---|---|
| intermediate_zoom_out | B1 | B-R2-3 |
| intermediate_zoom_out | M1 | M-R2-4 |
| intermediate_zoom_out | M2 | B-R2-2 |
| intermediate_zoom_out | N1 | N-R2-1 |
| intermediate_zoom_out | N2 | N-R2-2 |
| intermediate_zoom_out | N3 | N-R2-3 |
| intermediate_zoom_out | N4 | N-R2-4 |
| intermediate_zoom_out | N5 | N-R2-5 |
| implementation_readiness | B1 | B-R2-1 |
| implementation_readiness | B2 | B-R2-2 |
| implementation_readiness | B3 | B-R2-3 |
| implementation_readiness | M1 | M-R2-1 |
| implementation_readiness | M2 | M-R2-2 |
| implementation_readiness | M3 | M-R2-3 |
| implementation_readiness | N1 | N-R2-6 |
| implementation_readiness | N2 | N-R2-7 |
| implementation_readiness | N3 | N-R2-8 |
| implementation_readiness | N4 | N-R2-9 |
| implementation_readiness | N5 | N-R2-10 |
| implementation_readiness | N6 | N-R2-11 |
| implementation_readiness | N7 | N-R2-12 |
| implementation_readiness | N8 | N-R2-13 |
| implementation_readiness | N9 | N-R2-14 |
