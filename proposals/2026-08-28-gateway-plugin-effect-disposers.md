---
id: 2026-08-28-gateway-plugin-effect-disposers
title: "Gateway plugin runtime — per-plugin effect disposers for surgical hot-swap (cordis evaluated, rejected)"
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion]
tags: [infra, logic]
source: human
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Per-plugin effect disposers in the gateway plugin runtime

## Origin

Operator request (2026-08-28): evaluate [cordiverse/cordis](https://github.com/cordiverse/cordis)
for "realtime hot-swappable updates to running agents either by code logic or by UI
interactions"; adopt if useful.

## Evaluation summary (why cordis itself is rejected)

- cordis is a Context/plugin meta-framework whose core value is guaranteed effect
  rollback per plugin (every listener/timer/service registered via `ctx.effect()`
  carries a disposer, so any plugin can be unloaded/reloaded surgically at runtime).
- Maturity blockers: latest release is `4.0.0-rc.8` with an explicit "API is not yet
  stable and may change without notice" warning; sole npm maintainer; the v4 roadmap
  is now steered by a third party's needs (DeepSeek Harness). The HMR package sees
  ~460 downloads/week.
- Surface fit: the only minion surface where the model applies is the gateway
  (long-lived process, 45+ extensions). The factory's agents are batch containers —
  "updating a running agent" there means steering/messaging a run, not module reload.
  minion-base is a SvelteKit app; not applicable.
- The gateway already has ~80% of the payoff natively: jiti-based plugin loader with
  registry and per-plugin config state (`src/plugins/loader.ts`, `config-state.ts`),
  typed hooks, event bus, and chokidar config hot-reload that stops/starts channels
  and re-runs the loader without a process restart (`src/gateway/config-reload.ts`,
  `server-reload-handlers.ts`). Adopting cordis would mean rewriting every
  extension's registration surface against an RC API to gain the remaining 20%.

## What to build instead (this proposal)

Steal the one missing pattern, not the framework: add a disposer convention to the
gateway's own plugin runtime.

- Each plugin's registrations (hooks, event listeners, timers, MCP tools, commands)
  are recorded against the plugin id at registration time, each with a revoke fn.
- `reloadPlugin(id)` disposes exactly that plugin's effects and re-runs its loader
  entry — no full config reload, no channel restarts for unrelated plugins.
- Expose it on the existing gateway config/WS surface so the hub UI can trigger a
  single-plugin reload (the "UI interactions" half of the original request).
- Scope: additive; the existing coarse config-reload path stays as the fallback.

## Acceptance sketch

1. Reloading one plugin does not disturb another plugin's listeners/timers (test:
   two plugins, reload A, B's effects still fire; A's old effects provably gone).
2. A plugin that throws during reload leaves the runtime in the pre-reload state.
3. Hub/UI path: a `plugins.reload` request over the gateway WS protocol.

## Decision requested

Approve to spec, or park. Re-evaluate cordis itself only after 4.0.0 stable ships
and survives ~6 months of production use elsewhere.
