---
phase: 22
plan: "22-03"
subsystem: drone
tags: [package-extraction, adapter, workspace]
dependency_graph:
  requires: [22-01, 22-02]
  provides: [droneAdapter, @minion-stack/drone, adapter-registry-instance, registerBundledAdapters]
  affects:
    - packages/drone/package.json
    - packages/drone/index.ts
    - packages/drone/tsdown.config.ts
    - src/agents/pi-embedded.ts
    - src/plugins/adapter-registry-instance.ts
    - src/gateway/server.impl.ts
tech_stack:
  added: ["@minion-stack/drone workspace package"]
  patterns: [external-relative-imports, types-export-condition, workspace-private-package]
key_files:
  created:
    - packages/drone/index.ts
    - packages/drone/package.json
    - packages/drone/tsdown.config.ts
    - src/plugins/adapter-registry-instance.ts
  modified:
    - src/agents/pi-embedded.ts
    - src/gateway/server.impl.ts
    - package.json
decisions:
  - Drone index.ts imports from ../../src/agents/pi-embedded-runner/ directly (private workspace package, not bundled)
  - tsdown external:[/^\.\.\//] prevents bundling native modules from pi-embedded-runner deps
  - package.json exports "types":"./index.ts" for nodenext TypeScript resolution without building
  - registerBundledAdapters() called at gateway startup in server.impl.ts (not entry.ts)
metrics:
  duration: "inline (no subagent — completed across multiple messages)"
  completed: "2026-04-21"
  tasks_completed: 3
  files_changed: 9
---

# Phase 22 Plan 03: Drone extraction — @minion-stack/drone workspace package

**One-liner:** `packages/drone/` created as `@minion-stack/drone` private workspace package wrapping `runEmbeddedPiAgent` as `droneAdapter`, with `src/agents/pi-embedded.ts` barrel updated to re-export from the new package, singleton registry and `registerBundledAdapters()` wired into gateway startup.

## What Was Built

- `packages/drone/index.ts` — `droneAdapter: AdapterPlugin` with `id: "drone"`, `execute()` wrapping `runEmbeddedPiAgent` with minimal param bridge from `AdapterRunContext`
- `packages/drone/package.json` — `"@minion-stack/drone"`, private, `types: ./index.ts` export condition for nodenext resolution
- `packages/drone/tsdown.config.ts` — `external: [/^\.\.\//]` to avoid bundling native deps
- `src/agents/pi-embedded.ts` — barrel now re-exports entirely from `@minion-stack/drone` (backward compat for 40+ existing import sites)
- `src/plugins/adapter-registry-instance.ts` — singleton `adapterRegistry` + `registerBundledAdapters()` (registers drone + claude-code)
- `src/gateway/server.impl.ts` — `await registerBundledAdapters()` added to async gateway startup

## Self-Check: PASSED

- `@minion-stack/drone` exports `droneAdapter` with `id: "drone"` and `AsyncIterable<string>` execute ✓
- `src/agents/pi-embedded.ts` re-exports from `@minion-stack/drone` ✓
- `registerBundledAdapters()` called at gateway startup ✓
- `pnpm tsgo` error count unchanged at 42 ✓
