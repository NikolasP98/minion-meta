# FACES callback reload: source-only operational addendum

Source: NikolasP98/minion-ai `ab18426b3fc682d6c2c1b37c75411510d8bd81d3`, reviewed in `/home/nikolas/.cache/codex-work/minion-windows-qualification-20261021`. No production access or action was performed for this addendum. Apply only after release qualification and the parent-owned runbook gates. This adds verification precision, not authorization or a replacement release procedure.

## Non-secret preflight, performed just before the approved change

Record the active FACES service/task/container and actual Gateway process identity/start time, exact image digest/revision, installed controller path/state directory/lock, and config mount. Resolve the running process's effective config path using its actual environment and filesystem candidates, rather than assuming a separate shell has identical resolution. `CONFIG_PATH = resolveConfigPathCandidate()` is fixed at module load (`src/config/paths.ts:143,198`); explicit MINION_CONFIG_PATH, OPENCLAW_CONFIG_PATH and legacy CLAWDBOT_CONFIG_PATH candidates take precedence (`:204`). The canonical filename in this revision is `gateway.json` (`:24`), so the expected `/home/node/.minion/gateway.json` is plausible but still must be verified. The watcher explicitly uses CONFIG_PATH (`src/gateway/server.impl.ts:1815`). Do not print the whole environment/config or credentials.

Read only gateway.reload.mode/debounceMs, commands.restart and the non-secret hubMetrics.serverId from that effective configuration. Reload defaults to hybrid/300ms (`src/gateway/config-reload.ts:44,219`). Record whether OPENCLAW_NO_RESPAWN and recognized supervisor hints affect restart behavior (`src/infra/process-respawn.ts:29`). Do not change restart policy, tool policy or environment merely to facilitate this probe.

## Exact restart evidence

After the approved one-field atomic patch, capture timestamped FACES-only log entries after the preflight boundary. Expected hybrid/restart sequence:

1. `config change detected; evaluating reload (gateway.hubMetrics.serverId)` (`src/gateway/config-reload.ts:397`). Multiple listed paths require checking the intended one-field delta.
2. `config change requires gateway restart (gateway.hubMetrics.serverId)` (`src/gateway/server-core/server-reload-handlers.ts:278`). A busy process instead logs the same prefix followed by ` — deferring until ... complete` (`:251`), then `all operations and replies completed; restarting gateway now` (`:259`). Deferral timeout explicitly logs `restart timeout after ...ms with ... still active; restarting anyway` (`:265`); retain that as a limitation, not a clean drain.
3. `signal SIGUSR1 received` then `received SIGUSR1; restarting` (`src/cli/gateway-cli/run-loop.ts:221,205`). If a drain is needed: `draining ... active task(s) before restart (timeout ...ms)`, followed by `all active tasks drained` or the adverse `drain timeout reached; proceeding with restart` (`:104,113,115`).
4. `restart mode: full process restart (...)` (`:154`), or a clean in-process restart marker (`:170,173`). PID alone is insufficient because a clean in-process restart may retain it.
5. A NEW `listening on ws://...:... (PID ...)` or `listening on wss://...:... (PID ...)` entry (`src/gateway/server-core/server-startup-log.ts:31`). This follows required auth/handlers/durable prerequisite installation and awaited listen (`src/gateway/server.impl.ts:1865`). Optional sidecars start afterwards (`:1887`), so the line is core startup evidence, not proof every optional component is healthy.

The new core startup follows startup-bound `setHubRest({hubUrl,serverToken,serverId})` (`src/gateway/server.impl.ts:1039`). Combine the ordered markers with the actual current process/task identity and the established authenticated readiness check. A fresh WS connection ID alone is not a server-generation ID. `tools.reload` only clears caches and does not replace HubRest (`src/gateway/server-methods/tools.ts:393`). A disk-configured manifest fetch proves Hub authority for those credentials, not the live Gateway registry.

Adverse markers: `config reload disabled (gateway.reload.mode=off)` (`config-reload.ts:400`); `config reload requires gateway restart; hot mode ignoring (...)` (`:413`); `config watcher error: ...` (`:460`); `no SIGUSR1 listener found; restart skipped` (`server-reload-handlers.ts:210`); `SIGUSR1 restart ignored (not authorized; enable commands.restart or use gateway tool).` (`run-loop.ts:225`). Do not treat these as applied reloads.

## Bounded apply and fallback

Hold the canonical controller lock across the config operation and convergence evidence. Controller lock is `${MINION_SWARM_LOCK_FILE:-$state_dir/update.lock}`, where state_dir is `${MINION_SWARM_STATE_DIR:-$script_dir}` (`deploy/swarm/update-controller.sh:7`); root authority, path safety and nonblocking flock are enforced at `:390`. Resolve actual installed values; do not introduce a parallel lock.

For hybrid/restart, allow the watcher to restart once. Poll only the affected service/readiness and timestamped evidence, with one explicit operator cutoff; use the controller's configured convergence budget (default 420 seconds, polling 5 seconds, `update-controller.sh:15,310`) as the operational ceiling, not a claimed guaranteed startup duration. Watcher debounce is configurable; restart deferral defaults to 30 seconds (`src/infra/restart.ts:16`), active-task drain to 30 seconds and shutdown to 12 seconds (`src/gateway/server-core/server-owned-resources.ts:3`). Retain adverse drain/shutdown outcomes. At cutoff stop automatic actions and diagnose; do not overlap a second restart with an active first one.

For hot/off or demonstrated watcher inability, a direct SIGUSR1 is supported only if commands.restart is already true and the actual Gateway process is positively identified. The internally authorized watcher does not need that external-signal permission (`src/infra/restart.ts:54`; `run-loop.ts:220`). Container PID1/respawn assumptions must be checked, since process-respawn has no explicit container supervisor branch.

If that cannot safely produce a proven reload, use the runbook-authorized FACES-only controlled service replacement under the SAME lock: `docker service update --force --detach=true <verified-active-FACES-service>`. This is conditional on checking the existing immutable image, stop-first/parallelism, update failure behavior and active delivery-recovery floor. Preserve authority metadata; no image/tag/slot/default-service changes. The ordinary controller only adds --force for an unhealthy same-image service (`update-controller.sh:349`), so a healthy unchanged-image controller update is not a reload mechanism. Require exact digest, one healthy running replica, completed update and metadata convergence, using the controller's bounded criteria (`:310`). Do not release the lock before collecting the convergence receipt.

## Select an existing persisted session through the supported RPC

No usable personal-agent session key is established by the local roster receipt. Do not construct one. After gates, use the existing authenticated Gateway RPC client, without fabricated user/profile claims, to call `sessions.list`:

```json
{"agentId":"<independently verified persisted personal-agent ID>","limit":20,"includeGlobal":false,"includeUnknown":false,"includeDerivedTitles":false,"includeLastMessage":false}
```

This schema permits agentId, limit, activeMinutes, includeGlobal/Unknown, optional transcript-derived titles/last message, label, spawnedBy and search; additional fields are rejected (`src/gateway/protocol/schema/sessions.ts:4`). Omit activeMinutes to avoid hiding an older valid session. Avoid derived titles/last messages to avoid unnecessary transcript reads.

The handler loads the combined persisted session store and returns filtered entries (`src/gateway/server-methods/sessions.ts:143`; `src/gateway/sessions/session-utils.ts:604,719`). Filtering matches parsed normalized agent identity (`:752`), excludes cron-run sessions (`:743`), sorts newest first (`:850`) and returns `{ts,path,count,defaults,sessions}` (`:895`). Rows include key, sessionId, kind, updatedAt and available channel/origin/delivery metadata (`:812`). Returned keys may be canonicalized from persisted aliases; they are not newly created sessions. Use a returned key whose personal agent and existing context match the independently verified roster; do not substitute the bare `main` alias. If there is no matching result, stop this proof path rather than creating a session. `count` is returned-row count, not an unbounded store total.

`sessions.list` requires authenticated operator RPC access, operator.read or operator.write (admin bypass), and applies explicit agent assignment checks for clients carrying assignedAgentIds (`src/gateway/server-core/server-methods.ts:213,243,250`). This is operator credential authority, not proof of browser-user authorization.

## Actual in-memory callback proof without user chat

Using that returned, independently matched session key, POST to the running Gateway's supported `/tools/invoke` with its configured Gateway bearer credential:

```json
{"tool":"catalog_query","sessionKey":"<returned verified key>","args":{"kind":"service","limit":3}}
```

No callback server-id header, agentId/orgId override, fabricated browser principal, model call or message send. HTTP validates Gateway credentials and derives agent/policies from the key (`src/gateway/tools-invoke-http.ts:147,198`); it does not itself validate persisted-session ownership. Tool construction refreshes the Hub catalog and appends its tools (`src/agents/minion-tools.ts:434`), then HTTP applies existing tool policies/deny rules (`tools-invoke-http.ts:255`). The model JIT shortlist is not used here; no load_tools call is required. Do not widen policies if unavailable.

The catalog and query use getHubRest(), including its current in-memory serverId (`src/agents/tools/hub/hub-common.ts:89,104`), and the tool rejects a connection change between discovery and execution (`src/agents/tool-search/hub-query-tools.ts:264`). Validate nested tool result, organization, catalog data and source links; HTTP200 alone is insufficient. A 404 is ambiguous (catalog/assignment/policy/schema/connection), not proof of stale state. Tool construction/tracking may update local caches/storage; this is a business-data read, not a zero-internal-write guarantee. Successful operator probing does not replace the owner's authenticated chat acceptance.
