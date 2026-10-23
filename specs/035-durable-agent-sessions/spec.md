# Feature Specification: Durable agent sessions (`reset.mode: "never"`) and `/new` for member-mode senders

**Feature Branch**: `spec/035-durable-sessions`
**Created**: 2026-10-23
**Status**: Draft — owner decided the direction (below); two defaults still need the owner's word (see "Decisions for the owner")
**Input**: Owner, 2026-10-23: "ok, lets go with the recommended durable, plus the "new" slash command. Lets stay away from the daily reset altogether and remove it. We want durable pi agents where possible."
**Follows**: spec 032 (WhatsApp member agents). Member-mode senders are routed to their personal agent but cannot start a fresh conversation today.

All gateway anchors are `origin/DEV` at `93141a2cda7` (worktree `feat/durable-sessions-member-new`). Hub anchors are `origin/master`. Production reads are from 2026-10-23 and are read-only.

## AS-IS (evidence)

### A1. There is no way to say "never reset"

- The mode type is `"daily" | "idle"`, declared twice: `src/config/sessions/reset.ts:5` and `src/config/types.base.ts:78`. The zod schema is a strict union of the same two literals: `src/config/zod-schema.session.ts:14-20`. The default is `daily` (`reset.ts:20`) at hour 4 (`reset.ts:21`).
- `evaluateSessionFreshness` (`reset.ts:139-159`) computes `dailyResetAt` only for `daily`, but computes `idleExpiresAt` **whenever `idleMinutes` is set, in any mode** (`reset.ts:148-151`). So `{mode:"daily", idleMinutes:10080}` expires after 7 idle days *and* at the daily boundary. The FACES and MINION configs both carry exactly this (`session.reset = {mode:"daily", atHour:4, idleMinutes:10080}`, read from `/home/node/.minion/gateway.json` in `minion_gateway-faces` and `minion_gateway-default`).
- `idle` without `idleMinutes` falls back to `DEFAULT_IDLE_MINUTES = 60` (`reset.ts:115-117`, `src/config/sessions/types.ts:254`). The only approximation of "never" today is `{mode:"idle", idleMinutes:<huge>}`, which still expires and reads as a hack.
- The daily boundary uses `setHours` (`reset.ts:74-82`), i.e. the process local time zone. The production containers have no `TZ` (verified: `process.env.TZ` is `null` in `minion_gateway-faces`), so `atHour: 4` has been resetting at 04:00 UTC = 23:00 America/Lima, not "4 am".
- Proof (temporary vitest run in the gateway worktree, 6/6 passed, file removed afterwards): `{mode:"daily", atHour:4, idleMinutes:10080}` with `updatedAt` 8 days old → `fresh:false` with `idleExpiresAt` set; `{mode:"idle"}` → `idleMinutes:60`; `{mode:"idle", idleMinutes:525600}` with a 366-day-old entry → `fresh:false`.

**Every consumer of the reset policy** (so a new mode has to be honoured in all of them; none hard-codes `"daily"` beyond `reset.ts:145`):

| Consumer | Anchor | What it does with the policy |
|---|---|---|
| Inbound auto-reply (all channels) | `src/auto-reply/reply/session.ts:235-266` | decides reuse vs new `sessionId` |
| CLI `minion agent` | `src/cli/commands/agent/session.ts:134-145` | same decision for CLI runs |
| Cron isolated agents | `src/platform/cron/isolated-agent/session.ts:30-50` | reuses the per-job session while fresh; the caller never passes `forceNew` (`src/platform/cron/isolated-agent/run.ts:295`) |
| WhatsApp session snapshot → heartbeat | `src/web/auto-reply/session-snapshot.ts:51-67`, `src/web/auto-reply/heartbeat-runner.ts:104-114` | logging only (`resetMode`, `dailyResetAt`, `idleExpiresAt`) |
| Hub generic config editor | `minion_hub/src/lib/state/config/config.svelte.ts:171-188` ← gateway `config.schema` (`src/config/schema.ts:325`, built from the zod schema) | renders whatever enum the gateway publishes; no hub change needed for a new literal |
| Hub per-agent settings panel | `minion_hub/src/lib/utils/agent-settings-schema.ts:577-582` | hard-codes `session.reset` as `{type:'string', title:'Reset Policy'}`; the gateway has no per-agent `session` object (`src/config/zod-schema.agent-runtime.ts:28` is a string, `AgentEntrySchema` is strict), so this field is already wrong and unrelated to the mode |
| `@minion-stack/shared`, `minion_site`, wizard, fork docs | grep for `SessionResetMode`/`resetByType`/`atHour`: no hits | nothing to change |

Tests that encode the daily default: `src/auto-reply/reply/session.test.ts:306` ("defaults to daily reset at 4am local time"), `:331`, `:447` ("defaults to daily resets when only resetByType is configured"), `:477` (legacy `idleMinutes`), `src/platform/cron/isolated-agent/session.test.ts`, `src/config/sessions/sessions.test.ts:49`.

### A2. A member-mode sender cannot start a new conversation; their `/new` is swallowed

- Spec 032 routes a verified member to `personal-<id>` through the personal tier (`src/routing/resolve-route.ts:486-495`), fed only by `msg.memberAgent` (`src/web/auto-reply/monitor/on-message.ts:77-93`). The context carries `ResolvedHubUserId = memberAgent.profileId` (`src/web/auto-reply/monitor/process-message.ts:499-502`). For legacy profiles the agent id is not `personal-<profileId>` (on-message.ts:89-93; 2 of 11 in prod).
- Reset triggers are gated by `resetAuthorized` (`src/auto-reply/reply/session.ts:181-186, 198-203`), which is `resolveCommandAuthorization(...).isAuthorizedSender` (`src/auto-reply/command-auth.ts:321-334`). With `commands.allowFrom` unset (prod `commands` is `{}`), that is `commandAuthorized && isOwnerForCommands`.
- For WhatsApp, `commandAuthorized` is computed from `channels.whatsapp.allowFrom` + the pairing store, falling back to the account's own number (`process-message.ts:78-128`, wired at `:422-424` and `:490`). Members are not in that list, so `commandAuthorized` is `false`.
- Then `commands-core.ts:85-92` matches `/^\/(new|reset)/`, logs "Ignoring /reset from unauthorized sender" and returns `shouldContinue:false`; `get-reply-inline-actions.ts:368` ends the turn. **The message is dropped silently. It is not forwarded to the model** (this contradicts the working assumption that it "falls through as plain text").
- Proof (same temporary vitest run): WhatsApp direct ctx on `agent:personal-abc:whatsapp:direct:+51…`, sender not in `allowFrom`, `ResolvedHubUserId` set: `commandAuthorized:false` → `resetTriggered:false`, old `sessionId` kept; `commandAuthorized:true` but not allow-listed → still not reset; control with the sender allow-listed → reset.
- The confirmation an authorized `/new` gets is English and names the model: `✅ New session started · model: <provider>/<model>` (`src/auto-reply/reply/get-reply-run.ts:460-470`), followed by the model's greeting from `BARE_SESSION_RESET_PROMPT` (`src/auto-reply/reply/session-reset-prompt.ts:1-2`, "Greet the user in your configured persona … 1-3 sentences"). The greeting is in the persona's language; the status line is not.
- One more gate: `get-reply-run.ts:222-230` drops a bare control command when the sender is not authorized **and** the stripped body is empty. After a successful reset the body *is* empty (`session.ts:207`), so a member reset that passes session.ts would still be dropped here unless this check learns about the reset.

### A3. What already keeps a long session healthy (and what does not)

- Compaction is overflow/threshold driven, never time driven: `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts:16`, safeguard extension `src/agents/pi-extensions/compaction-safeguard.ts` (enabled by `compaction.mode: "safeguard"`, `src/agents/pi-embedded-runner/extensions.ts:70-95`; both prod tenants have it with `reserveTokensFloor: 24000`).
- Memory flush fires when `totalTokens ≥ contextWindow − reserveTokensFloor − softThresholdTokens` and not yet flushed for the current `compactionCount` (`src/auto-reply/reply/memory-flush.ts:113-140`); `compactionCount` increments on each compaction, so the flush recurs per cycle. The `memory/YYYY-MM-DD.md` stamp is the flush date (`memory-flush.ts:48`), independent of resets. A reset is what *clears* these counters (`session.ts:392-401`), so durable sessions keep them. Nothing else in `src/` assumes a daily rollover (grep `daily|rollover|new day` over agents, cron, heartbeat, memory: only the flush filename stamp).
- Session store maintenance: default `mode: "warn"`, `pruneAfter: 30d`, `maxEntries: 500`, `rotateBytes: 10mb` (`src/config/sessions/store.ts:253-256`, `types.base.ts:121-132`). In `warn` nothing is evicted (`store.ts:520-537`). In `enforce`, an entry idle for 30 days is pruned and its transcript archived (`store.ts:538-560`) — that would end a durable conversation after a month of silence. Neither prod tenant sets `maintenance`.
- Transcripts are append-only jsonl and the whole file is parsed on every run (`src/agents/pi-embedded-runner/run/attempt-session.ts:89`, `compact.ts:165,627`, `tool-result-truncation.ts:148`). There is no size cap or rollover. Today's largest prod file is 1.19 MB (one day's session under daily reset); the most active agent wrote 11 MB across 49 sessions in ~3 months. Under never-reset one file keeps growing; the model context is bounded by compaction, the parse cost is not. Real but slow risk (months).
- Config reload: `session.*` is classified `kind: "none"` (`src/gateway/config-reload.ts:82`), and `loadConfig()` re-reads the file with a 200 ms cache (`src/config/io.ts:1212, 1260-1280`). **But the WhatsApp monitor captures `baseCfg = loadConfig()` once at start** (`src/web/auto-reply/monitor.ts:67-69`) and passes that object down to `initSessionState` (on-message.ts:53 → process-message.ts → session.ts). A `session.reset` edit therefore does not reach WhatsApp until the gateway (or channel) restarts. An invalid config makes the gateway refuse to boot (`src/gateway/server.impl.ts:330-338`), which fixes the rollout order below.

## TO-BE

1. A session reset policy can be **`never`**: the gateway never ends a conversation on its own. Only an explicit trigger (`/new`, `/reset`, hub action, cron `forceNew`) starts a new session. Compaction and memory flush keep working exactly as today.
2. `never` is accepted globally (`session.reset`), per type (`resetByType.{direct,group,thread}`) and per channel (`resetByChannel.<id>`), in every consumer listed in A1.
3. `never` is the **default** for installs that set no reset policy. `daily` and `idle` stay accepted as explicit opt-ins (`daily` is documented as deprecated, not removed: removing the literal would make both production configs invalid at boot).
4. A member-mode sender can `/new` or `/reset` **their own personal-agent session** and nothing else. No other command is unlocked. Customers on a business line keep today's behaviour (ignored).
5. Production FACES and MINION gateways run with `session.reset = {mode:"never"}`.

**Invariants**
- I1. With `mode: never`, `evaluateSessionFreshness` returns `fresh: true` for any `updatedAt`/`now` pair, and exposes neither `dailyResetAt` nor `idleExpiresAt`.
- I2. `atHour`/`idleMinutes` next to `mode: never` are ignored, never an error (a config error stops the gateway).
- I3. The widened reset authorization is true only when the session's agent id is the sender's own personal agent. It never changes `isAuthorizedSender`, so every other command keeps its current gate.
- I4. A sender who is not a verified member and not allow-listed gets exactly today's behaviour for `/new`: nothing.

## User Scenarios & Testing

### User Story 1 - My assistant remembers yesterday (Priority: P1)

A member talks to their personal agent on WhatsApp (or the hub) across days and weeks. The conversation continues where it left off; nothing is forgotten at 4 am or after a quiet week.

**Independent Test**: set `session.reset.mode: never`; seed a session entry 30 days old; send a message → same `sessionId`.

**Acceptance Scenarios**:
1. **Given** `reset: {mode: "never"}` and an entry updated 30 days ago, **When** a message arrives, **Then** the same `sessionId` is reused and `isNewSession` is false.
2. **Given** `reset: {mode: "never", idleMinutes: 10}` and an entry updated 1 hour ago, **When** a message arrives, **Then** the session is reused (I2).
3. **Given** `resetByChannel: {whatsapp: {mode: "never"}}` and a global `daily`, **When** a WhatsApp message arrives after the daily boundary, **Then** the WhatsApp session is reused while a Telegram session is not.
4. **Given** no reset config at all, **When** a message arrives after a long gap, **Then** the session is reused (new default). **Given** legacy `session.idleMinutes` only, **Then** idle mode still applies (`reset.ts:103` kept).

### User Story 2 - A member starts over with `/new` (Priority: P1)

A verified member on a member-mode WhatsApp account sends `/new`. Their personal agent starts a fresh session and greets them in its persona. The previous transcript file stays on disk.

**Independent Test**: `initSessionState` with the member ctx from A2 and `commandAuthorized: false` → `resetTriggered: true`, new `sessionId`.

**Acceptance Scenarios**:
1. **Given** a member DM routed to `personal-<theirs>` and an existing session, **When** they send `/new`, **Then** a new `sessionId` is created for that key, the previous `sessionId` is kept in `previousSessionEntry`, and the turn continues to the greeting.
2. **Given** the same member, **When** they send `/status`, `/config`, `/bash …` or any other control command, **Then** it is handled exactly as today (ignored for non-authorized senders).
3. **Given** a legacy profile whose agent id is not `personal-<profileId>`, **When** they send `/new`, **Then** it works (the predicate accepts the hub's own agent id).
4. **Given** a linked hub user who is **not** the member routed to this session (a customer line explicitly bound to someone's `personal-*` agent), **When** they send `/new`, **Then** nothing resets.
5. **Given** a customer on a business line (not a member, not allow-listed), **When** they send `/new`, **Then** nothing resets and no reply is sent (I4).
6. **Given** a Telegram DM from a hub user routed through the personal tier, **When** they send `/new`, **Then** it resets (same predicate, derived id).

### User Story 3 - Production runs durable (Priority: P2)

The operator ships the gateway, switches both tenants to `never`, and can prove a session survived the old 04:00 UTC boundary and that a member's `/new` worked. Rollback is one config command plus a restart.

### Edge Cases

- `/new` from a member while a run is in flight: unchanged (abort/queue handling is separate, `src/auto-reply/reply/abort.ts`).
- `mode: never` plus `maintenance.mode: "enforce"`: the 30-day prune still applies (it is a store cap, not a reset). Documented; `pruneAfter` must be raised before enabling `enforce`.
- Cron isolated sessions (`resetType: "direct"`, no `forceNew`) become durable under the new default: each job's context persists across runs until compaction. See decision D2.
- Old image, new config: `"never"` fails zod on the old image and the gateway will not boot. Rollout order and rollback below handle it.
- Hub per-agent panel writes `session.reset` as a string under `agents.list[]`: a pre-existing bug, fixed in slice H1 by making the static fallback match the gateway shape.

## Requirements

### Functional Requirements

- **FR-001**: `SessionResetMode` MUST accept `"never"` in the type (`types.base.ts:78`, `reset.ts:5`) and the zod schema (`zod-schema.session.ts:16`), for `session.reset`, `resetByType.*` and `resetByChannel.*`.
- **FR-002**: With `mode: never`, `resolveSessionResetPolicy` MUST return `idleMinutes: undefined` and `evaluateSessionFreshness` MUST return `{fresh: true}` with no `dailyResetAt`/`idleExpiresAt` (I1, I2).
- **FR-003**: `DEFAULT_RESET_MODE` MUST become `"never"`. Legacy `session.idleMinutes` without a `reset` block MUST keep selecting `idle` (`reset.ts:100-103`).
- **FR-004**: `daily` and `idle` MUST remain valid. `daily` MUST be marked deprecated in the type's doc comment and in `schema.help.ts`, and the daily boundary's time-zone dependency MUST be stated there (A1, `setHours`).
- **FR-005**: `resolveCommandAuthorization` MUST expose `sessionResetAuthorized = isAuthorizedSender || ownsPersonalSession`, where `ownsPersonalSession` is true iff the session's agent id (via `resolveSessionAgentId`) is a personal agent and equals `derivePersonalAgentId(ctx.ResolvedHubUserId)` or `ctx.PersonalAgentId`. `isAuthorizedSender` MUST NOT change (I3).
- **FR-006**: WhatsApp member DMs MUST set `ctx.PersonalAgentId = msg.memberAgent.agentId` (new optional `MsgContext` field) so legacy profile ids satisfy FR-005.
- **FR-007**: `sessionResetAuthorized` MUST gate the three reset sites: `session.ts:181-203` (trigger loop), `commands-core.ts:85-93` (drop + hook), and the bare-control-command drop at `get-reply-run.ts:222-230` MUST not fire when `resetTriggered` is true. The confirmation line at `get-reply-run.ts:460` keeps `isAuthorizedSender`, so members get only the persona greeting (no model id, no English status line).
- **FR-008**: The hub per-agent settings static fallback for `session.reset` MUST describe the real object shape with `mode ∈ {never, daily, idle}` (or the field MUST be removed from the per-agent panel, since the gateway has no per-agent `session` object).
- **FR-009**: Production FACES and MINION gateways MUST run `session.reset = {mode: "never"}` with `atHour`/`idleMinutes` removed, applied after the image that accepts `never` is live, followed by a gateway restart (A3, WhatsApp monitor config capture).

### Key Entities

- **Reset policy**: `{mode, atHour?, idleMinutes?}` resolved per session from channel → type → global → default.
- **Session entry** (`sessions.json`): `sessionId`, `updatedAt`, `compactionCount`, `memoryFlushCompactionCount`, token counters. A reset replaces `sessionId` and clears counters; `never` means only explicit triggers do that.
- **Personal session ownership**: the pair (session agent id, sender's hub identity) that authorizes a self-reset.

## Success Criteria

- **SC-001**: Unit: with `mode: never`, an entry 365 days old is reused by inbound, CLI and cron consumers (three tests, one per consumer).
- **SC-002**: Unit: the A2 member ctx with `commandAuthorized: false` produces `resetTriggered: true`; the same ctx with `/status` produces no command handling; a non-member customer ctx with `/new` produces `resetTriggered: false` and `shouldContinue: false`.
- **SC-003**: Prod FACES: a member session's `sessionId` is identical before and after the former 04:00 UTC boundary and after a ≥ 7-day idle gap (two reads of `sessions.json`).
- **SC-004**: Prod FACES: the owner's member phone sends `/new` → new `sessionId` under `agents/personal-…/sessions/sessions.json`, previous jsonl still present, reply is a greeting without "New session started".
- **SC-005**: Hub config editor loads and saves a config containing `mode: "never"` without a validation error (config.get → config.patch round-trip).
- **SC-006**: 14 days after rollout: largest transcript under 20 MB and no reply-latency regression attributable to transcript parsing (evidence in `specs/035-durable-agent-sessions/evidence/`).

## DELTA (transition → proof)

| # | Transition | Proof |
|---|---|---|
| T1 | `{mode:"daily"|"idle"}` only → `"never"` accepted everywhere | `src/config/sessions/sessions.test.ts`: policy `never` for global/type/channel; zod parse of `never` in all three places |
| T2 | idle window applied in any mode → ignored under `never` | `sessions.test.ts`: `{never, idleMinutes:1}` + old entry → `fresh:true`, no `idleExpiresAt` |
| T3 | default `daily` → default `never` | `session.test.ts:306/447` rewritten to assert reuse; new "explicit daily still resets" case; cron `session.test.ts` same |
| T4 | member `/new` dropped → member's own session resets | `session.test.ts` "member-mode reset" describe (positive, legacy id, wrong agent, customer, Telegram-derived) |
| T5 | bare control drop at get-reply-run swallows a member reset → continues | `get-reply-run` test: `resetTriggered:true` + `isAuthorizedSender:false` → turn continues, no status line |
| T6 | `/status` etc. from member → still ignored | `commands.test.ts` case: member ctx `/status` → not handled |
| T7 | hub per-agent `session.reset` string → object with enum | `minion_hub/src/lib/utils/config-schema.test.ts` (or new `agent-settings-schema.test.ts`) |
| T8 | prod daily → never | SC-003/SC-004 evidence files |

## Implementation plan (independent slices, one PR each)

Gateway PRs branch from `DEV` and target `DEV` (`node scripts/repo-policy.mjs show minion`). Run only the named test files with `pnpm vitest run <file>`; never the full suite. Each PR adds a CHANGELOG line.

### G1 — `mode: "never"` (no default change)
- **Files**: `src/config/sessions/reset.ts` (type, `resolveSessionResetPolicy` returns `idleMinutes: undefined` for `never`, `evaluateSessionFreshness` short-circuits), `src/config/types.base.ts:78-85` (type + doc comments, `daily` deprecated + TZ note), `src/config/zod-schema.session.ts:16`, `src/config/schema.help.ts` (one entry for `session.reset.mode`), `CHANGELOG.md`.
- **Tests**: `src/config/sessions/sessions.test.ts` (T1, T2: global, `resetByType.direct`, `resetByChannel.whatsapp`, `never`+`idleMinutes` ignored, `never`+`atHour` ignored); `src/config/schema-validation.test.ts` or `zod-schema` test: `{mode:"never"}` parses in all three places.
- **Acceptance**: the named tests pass; `pnpm check` clean; `evaluateSessionFreshness({policy:{mode:"never",atHour:4}})` has no `dailyResetAt`.
- **Depends on**: nothing.

### G2 — flip the default to `never`
- **Files**: `src/config/sessions/reset.ts:20` (`DEFAULT_RESET_MODE = "never"`), `CHANGELOG.md` (breaking-default note).
- **Tests**: rewrite `src/auto-reply/reply/session.test.ts:306, 331, 447` (default → reuse; add explicit `mode:"daily"` variants so daily logic stays covered), keep `:477` legacy idle; `src/platform/cron/isolated-agent/session.test.ts` default case; `src/config/sessions/sessions.test.ts` default assertion.
- **Acceptance**: T3 tests pass; grep shows no remaining test relying on the implicit daily default.
- **Depends on**: G1. **Gated on decision D1.**

### G3 — `/new` and `/reset` for member-mode senders
- **Files**: `src/auto-reply/templating.ts` (`PersonalAgentId?: string` next to `ResolvedHubUserId`), `src/web/auto-reply/monitor/process-message.ts:499-502` (set it from `msg.memberAgent.agentId`), `src/auto-reply/command-auth.ts` (`sessionResetAuthorized` on `CommandAuthorization`, helper using `resolveSessionAgentId`, `isPersonalAgentId`, `derivePersonalAgentId`), `src/auto-reply/reply/commands-types.ts` + `commands-context.ts:36-45` (plumb the flag), `src/auto-reply/reply/session.ts:181-186` (use it), `src/auto-reply/reply/commands-core.ts:85-93` (use it), `src/auto-reply/reply/get-reply-run.ts:222-230` (`&& !resetTriggered`), `CHANGELOG.md`.
- **Tests**: `src/auto-reply/reply/session.test.ts` new describe "member-mode reset" (T4, five cases; reuse the ctx shape from A2); `src/auto-reply/command-auth.test.ts` (predicate: personal match, legacy `PersonalAgentId` match, non-personal agent, no hub user); `src/auto-reply/reply/commands.test.ts` (T6); a `get-reply-run` test for T5 (`src/auto-reply/reply/get-reply-run.*.test.ts` pattern).
- **Acceptance**: SC-002 tests pass; `isAuthorizedSender` untouched (grep diff); no new reply strings.
- **Depends on**: nothing (ships with or without G1/G2).

### H1 — hub per-agent panel: `session.reset` shape
- **Repo**: `minion_hub` (`master`). **Files**: `src/lib/utils/agent-settings-schema.ts:577-582` (object schema with `mode` enum `never|daily|idle`, `atHour`, `idleMinutes`; or delete the entry — recommended, since the gateway has no per-agent `session` object and a write there is rejected by the strict `AgentEntrySchema`).
- **Tests**: `src/lib/utils/config-schema.test.ts` or a new `agent-settings-schema.test.ts` (T7). Run `bun run check` and the hub design lint gates per hub `CLAUDE.md` if any `.svelte` is touched (none expected).
- **Depends on**: nothing. Lowest priority.

### R1 — production rollout (ops, no PR; evidence committed to meta)
See the next section. **Depends on**: G1 + G3 live in `:prd` (G2 optional: prod sets the mode explicitly).

## Rollout (FACES, then MINION/default)

Deploy chain (memory `netcup-gateway-swarm-deploy`): merge to gateway `DEV` → Docker Release builds `:dev`; promote `DEV` → `main` → `:prd` → `deploy-production.yml` → swarm rollout on netcup (`sudo /opt/minion-swarm/update-controller.sh update`; services `minion_gateway-faces`, `minion_gateway-default`, parked `-b` slots). Image first, config second — the old image rejects `never` at boot.

1. **Ship**: G1 and G3 (and G2 if D1 = yes) merged to `DEV`, verified on `:dev`, promoted to `main`, rolled to prod. Both tenants restart on the new image with their existing `daily` config: no behaviour change yet.
2. **Pre-read** (per tenant): `docker exec -u node <ctr> node -e 'const c=require("/home/node/.minion/gateway.json");console.log(JSON.stringify(c.session.reset))'` and record each member key's current `sessionId` from `agents/personal-*/sessions/sessions.json`.
3. **Config edit** (validates against the running image's schema): `docker exec -u node <ctr> node /app/minion.mjs config set --json session.reset '{"mode":"never"}'` (`src/cli/config-cli.ts:374-392`; `--json` replaces the whole object, dropping `atHour`/`idleMinutes`). The file lives on the host at `/var/lib/docker/volumes/minion_faces_state/_data/gateway.json` (`minion_runtime_config`/`…_default_state` for MINION) if a manual edit is ever needed.
4. **Apply**: `docker service update --force minion_gateway-faces` (the WhatsApp monitor keeps its start-time config, A3). WhatsApp reconnects without a QR.
5. **Verify** (SC-003/SC-004): `/health` 200; a member message before and after 04:00 UTC keeps the same `sessionId`; owner's member phone `/new` → new `sessionId`, previous jsonl present, greeting only; a customer `/new` on the business line still gets nothing; optional: heartbeat verbose log shows `resetMode: never`.
6. Repeat 2-5 for `minion_gateway-default`.
7. Commit the before/after reads under `specs/035-durable-agent-sessions/evidence/`.

## Rollback

- **Behaviour only**: `config set --json session.reset '{"mode":"daily","atHour":4,"idleMinutes":10080}'` then `docker service update --force <service>`. `daily` stays valid in the new image (FR-004).
- **Image**: revert the config **first** (above), then `sudo /opt/minion-swarm/slot-switch.sh rollback <tenant>` or the controller's fleet rollback. Rolling the image back while the config says `never` leaves the gateway unable to boot.
- **Code**: G1-G3 are additive; reverting any of them reverts its behaviour. Reverting G1 after prod carries `never` requires the config rollback first.

## Assumptions

- Member mode stays direct-chat only (spec 032); the self-reset predicate is never evaluated for groups.
- Customers on business lines do not get `/new`: their thread is the business agent's context (bookings, consumption confirmations), and a silent ignore gives nothing to probe. Changing that is a separate product decision.
- No fork docs page covers session reset (`docs/` grep empty); the type doc comments and `schema.help.ts` are the user-facing reference the hub shows.
- Transcript rollover/size caps are **out of scope**; SC-006 measures the risk, and a follow-up proposal covers rollover-on-compaction if the number grows faster than expected.
- `maintenance.mode: enforce` is not enabled on either tenant and stays that way.

## Decisions for the owner

- **D1 — default flip (G2).** Recommended **yes**: it is what "durable where possible" means for new installs and for any agent without an explicit policy. Both prod tenants set the mode explicitly, so they are unaffected by the default either way. Cost: anyone relying on the implicit daily reset gets durable sessions on upgrade (CHANGELOG line).
- **D2 — cron isolated sessions.** With `never` they persist across runs (per-job key, compaction-bounded). Recommended **accept** (the owner's rule), noting that a job wanting a clean slate should set `resetByType.direct`… which also hits member DMs; if that ever matters, a per-job `forceNew` is a one-line follow-up in `src/platform/cron/isolated-agent/run.ts:295`.
- **D3 — `daily` kept as a deprecated opt-in, not deleted.** Recommended **keep**: deleting the literal breaks any existing config at boot. Deletion can follow once no config in the fleet carries it.
