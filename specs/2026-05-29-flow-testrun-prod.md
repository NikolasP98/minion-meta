# Flow "Test Run" in prod — implementation spec (2026-05-29)

Context: the hub "Test Run" fails in prod with `Could not reach flow runner at
http://localhost:2025`. Three fixes were chosen; **#1 is DONE**, #2 + #3 remain.

## Background (verified facts)
- `runFlow()` in `minion_hub/src/lib/state/features/flow-editor.svelte.ts` does a
  **client-side** `fetch(${PUBLIC_LANGGRAPH_FLOWS_URL ?? 'http://localhost:2025'}/flows/run)`
  (SSE). `PUBLIC_LANGGRAPH_FLOWS_URL` is unset in Vercel → browser hits its own
  localhost. Can't point it at the runner: HTTPS hub → HTTP runner = mixed
  content + CORS, and the runner must not be public.
- Runner = `langgraph-server/src/flow/server.ts` on netcup, systemd
  `minion-flows-runner.service`, run via tsx from `/home/bot-prd/langgraph-server/`.
- Gateway↔runner are co-located on netcup; gateway reaches runner at
  `FLOWS_RUNNER_URL ?? http://localhost:2025`.

## #1 — Firewall the runner ✅ DONE (2026-05-29)
`server.ts` now binds `hostname = process.env.FLOWS_HOST ?? '127.0.0.1'` (was
0.0.0.0/`*:2025`). Deployed to netcup + runner restarted. Verified: bound
`127.0.0.1:2025`; `152.53.91.108:2025 → 000` (blocked); localhost still 404=up.
Repo edit in `langgraph-server/src/flow/server.ts` — **commit it** (uncommitted).

## #2 — Route Test Run through the gateway WS (so prod works, no public runner)
Hub already holds an authenticated WS to the gateway. Proxy the run through it:
- **Gateway:** new server-method `flows.run` (manual run). Handler POSTs
  `{nodes, edges, prompt}` to `${FLOWS_RUNNER_URL ?? 'http://localhost:2025'}/flows/run`,
  consumes the SSE stream. MVP (no WS streaming plumbing): collect all
  `FlowRunEvent`s and `respond(true, { events })`. Register in the gateway
  server-methods registry (mirror `flows.templates.list` / `flows.trigger.*` in
  `minion/src/gateway/server-methods/flows-*.ts`).
- **Hub:** rewire `runFlow()` to `sendRequest('flows.run', { nodes, edges })`
  over WS instead of `fetch(FLOWS_URL)`; append returned `events` to
  `flowEditorState.consoleLogs`. Drop the `PUBLIC_LANGGRAPH_FLOWS_URL` fetch path
  (or keep as a localhost-dev fallback when WS gateway absent).
- Streaming (optional later): emit gateway `event` frames per log line instead of
  a single batched response.
- **Limitation:** only `llm`/`transform`/`structured`/`router` nodes run
  end-to-end until #3; `pluginAction`/`agent` need #3.

## #3 — Fix runner→gateway auth (so pluginAction/agent nodes execute)
Runner's gateway client (`langgraph-server/src/gateway/client.ts`) connects with
`GATEWAY_URL=ws://127.0.0.1:18789` but **`GATEWAY_TOKEN=` empty**. Probe results:
no token → `NOT_PAIRED: "device identity required"`; operator-device token →
`"unauthorized: gateway token mismatch (provide gateway auth token)"`. So the
gateway validates `connect.params.auth.token` against a **gateway auth token**
(NOT the device token). client.id `"gateway-client"` + mode `backend` are valid.
- **Action:** find the token the gateway compares (check minion connect handler
  `src/gateway/server/ws-connection/message-handler.ts` for the gateway-token
  check; source is likely an infisical secret / the encrypted vault keyed by
  `MINION_SECRETS_KEY`, not a plain env — both services share infisical project
  `5d7bbcef`). Set it as `GATEWAY_TOKEN` on `minion-flows-runner.service`
  (systemd Environment or via infisical), restart the runner.
- **Verify:** WS probe from `/home/bot-prd/langgraph-server` (ws module) — connect
  with `auth:{token}` → `ok:true`; then call e.g. `weeklyRecon.dbQuery` →
  result (not error). Then a real alert-watcher Test Run executes classify/sendAlert.
- Acceptable now that the runner is localhost-only (#1): it holding a gateway
  credential isn't world-exposed.

## Related
[[weekly-recon-flow-plugin]] (same runner↔gateway pairing wall, ran in-process
to avoid it), [[hub-plugin-flows-feature]].
