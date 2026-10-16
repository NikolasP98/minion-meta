---
id: 2026-10-16-hub-dev-local-gateway-followups
title: 'dev:local --gateway — open items'
status: open
created: 2026-10-16
repos: [minion_hub, minion]
spec: specs/011-dev-local-gateway-mode/
---

# `dev:local --gateway` — open items

Open-items ledger for the hub branch `feat/dev-local-gateway` (spec
`specs/011-dev-local-gateway-mode/`). Everything here was found while building and proving
that mode on a live local stack on 2026-10-16; none of it blocks the mode's own goal (the
floating assistant is online locally and answers — proven), and none of it is fixed by it.

## 1. The local agent gets no hub data tools — `tool-rbac` finds no capability snapshot

**Observed.** With the local gateway up and the assistant online, `/en/sandbox` was asked
*"show me revenue by product for this month as a bar chart"*. The agent answered *"I'll check
the available datasets first."* then *"Let me look up the datasets."* and stalled. No chart
was rendered: `iframe[sandbox]` stayed at 1 and `canvas` at 1, before and after.

The gateway log says why:

```
[agents/tool-rbac] hub capability fetch returned no snapshot for personal-17d814…;
                   permission-gated tools will be denied this window
[agents/tool-select] [jit-select] {"catalogSize":14,"activeIds":["message","search_tools",
  "load_tools","sessions_send","sessions_spawn","image","session_status","web_fetch",
  "web_search","subagents","tts","sessions_list","sessions_history","summarize"]}
```

The agent's active tool set is the 14 generic tools. No CRM, POS, stock or finance tool is in
it, so there is no path from the prompt to the data. The hub dev server's log shows **no**
inbound `/api/gateway/*` request at all for that window, so the capability fetch is failing
before it reaches the hub, not being rejected by it. `gateway.hubMetrics` was written into the
container's `minion.json` with `hubUrl=http://127.0.0.1:5199`, `serverId=qa-local-gateway` and
the gateway token as `apiKey`; the matching `gateway` row carries `legacy_server_id =
'qa-local-gateway'` and the sealed same token, which is what `resolveServerTokenAuth`
(`minion_hub/src/server/auth/resolve-identity.ts:114`) matches on.

**Next step**: find which URL the gateway's `tool-rbac` capability fetch actually calls and
why it produces no snapshot — a wrong path, a a pre-flight failure, or a rejection the gateway
swallows. Start at `minion/src/agents/tool-rbac` and `minion/src/agents/tools/hub/hub-common.ts`.
This is the difference between a local assistant that can chat and one that can work.

## 2. `chat_artifact` and `canvas` are denied to a `standard` agent

Same window, independent of item 1:

```
[security/denial-event] [DENIAL] tool_policy | chat_artifact | agentType (standard)
[security/denial-event] [DENIAL] tool_policy | canvas        | agentType (standard)
```

Even with data in hand the agent could not have drawn the chart: the two tools that render one
are gated on the agent's archetype, and `agents.create` makes a `standard` agent. Decide
whether the local bootstrap should create the personas' agents with a different archetype, or
whether the sandbox page's flow is meant to go through a different agent entirely.

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
