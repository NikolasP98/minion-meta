---
id: 2026-10-16-hub-dev-local-gateway-followups
title: 'dev:local --gateway — open items'
status: draft
created: 2026-10-16
repos: [minion_hub, minion]
tags: [logic, infra]
value: 7
effort: M
spec: specs/011-dev-local-gateway-mode/
---

# `dev:local --gateway` — open items

Open-items ledger for the hub branch `feat/dev-local-gateway` (spec
`specs/011-dev-local-gateway-mode/`). Everything here was found while building and proving
that mode on a live local stack on 2026-10-16; none of it blocks the mode's own goal (the
floating assistant is online locally and answers — proven), and none of it is fixed by it.

## 1. RESOLVED — the local agent had no hub tools: `hubMetrics.enabled` was missing

**Was**: with the gateway up and the assistant online, `/en/sandbox` asked for a revenue chart
answered *"Let me look up the datasets."* and stalled, with
`[agents/tool-rbac] hub capability fetch returned no snapshot` in the gateway log and an active
tool set of only the 14 generic tools.

**Root cause**: `resolveHubMetricsConfig` computes
`valid = enabled && hubUrl && apiKey && serverId`
(`minion/src/gateway/hub-metrics-config.ts:107`), where `enabled` is strictly
`cfg.enabled === true`. The `minion.json` the bootstrap wrote carried `hubUrl`, `apiKey` and
`serverId` but no `enabled`, so `valid` was false,
`minion/src/gateway/server.impl.ts:1038-1053` called `setHubRest(null)`, and every hub tool
answered *"hub is not connected"*. The gateway never issued an outbound request, which is why
the hub dev server logged none. `MINION_SECRETS_KEY` was a red herring: it gates the secrets
vault only, with documented graceful degradation (`server.impl.ts:421,457`).

**Fixed** on `feat/dev-local-gateway`: `enabled: true`, plus `writeGatewayState` reconciling
`gateway.hubMetrics` into an existing config (so a rotated token lands) and restarting the
container when the config moved. Re-proved: the agent read real finance data and rendered a
`REVENUE BY CUSTOMER — OCTOBER 2026` bar chart into a new `iframe[sandbox]`.

**Still open from this**: a gateway whose hub link is misconfigured degrades silently to a
tool-less agent. A startup log line naming `valid=false` and which field was missing would have
turned a two-hour hunt into a one-line read. Worth proposing upstream in `minion`.

## 2. `chat_artifact` and `canvas` denials are logged but not fatal

`[DENIAL] tool_policy | chat_artifact | agentType (standard)` and the same for `canvas` appear
on every turn, yet the agent did render the chart once its hub tools worked — so the sandbox
card goes through a different path. The denial lines are noise at best and a misleading signal
at worst; worth confirming they are expected for a `standard` agent.

## 3. Gateway-mode rows are outside the seed matrix and its contract test

`scripts/qa/gateway-bootstrap.ts` writes the `gateway`, `user_gateway` and `personal_agents`
rows directly instead of registering them in `scripts/qa/seed/matrix.ts`. Deliberate: the
matrix is an inventory of rows the seed **always** writes and `seed.contract.test.ts` asserts
coverage over it, so conditional rows would make that assertion mode-dependent. The cost is
that those rows have no contract-test coverage — only the bootstrap's own assertions and the
unit tests on its pure helpers. If gateway mode ever becomes the default, fold them in.

## 4. The runtime provisioner still writes an empty server id

`minion_hub/src/server/services/personal-agent-provisioner.ts:112` passes `serverId: ''`, so
`personal_agents.gateway_id` stays NULL on the hosted path and the hub's own `/api/gateway/*`
bridge cannot resolve the agent's gateway (`src/server/auth/assistant-principal.ts`
`resolveGatewayPrincipal`). `dev:local --gateway` writes the real id on the **seed** path only.
A `TODO(handoff)` marks the site. Possibly related to item 1 for hosted gateways.

## 5. Gateway mode renames persona agent ids

The bootstrap renames `personal_agents.agent_id` from `qa_<hex>` to `personal-<hex>`, because
the gateway gates its hub-module tools on that prefix
(`minion/src/agents/tools/hub/hub-common.ts:13`). Default-mode fixtures are untouched, but a
test that hardcodes a `qa_`-prefixed agent id would fail *against a gateway-mode stack*. None
is known to today. The cleaner fix is for the seed to mint `personal-`-prefixed ids in both
modes — deferred because it would move ids that existing fixtures may pin.

## 6. `qa:up --gateway` is not wired

Only `dev:local` (host dev server) accepts the flag. The fully containerized `qa:up` path would
need the same provider-key capture, stack bring-up and bootstrap; it was left out rather than
shipped untested.

## 7. Two worktrees on one QA stack re-seal the gateway token differently

Each worktree has its own `.qa/encryption-key`, so whichever one ran `dev:local --gateway` last
owns the sealing of the shared `gateway` row's token. Self-healing (every run re-seals) but
worth knowing if a stale dev server suddenly cannot fetch its host token.
