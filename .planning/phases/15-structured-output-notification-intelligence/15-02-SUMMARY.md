---
phase: 15
plan: "02"
subsystem: auto-reply/heartbeat
tags: [structured-output, heartbeat, forced-tool-call, config-flag, suppression]
dependency_graph:
  requires: [15-01]
  provides: [evaluateHeartbeatStructured, isHeartbeatStructuredEnabled, applyHeartbeatStructuredDecision, HeartbeatDecision, HEARTBEAT_STRUCTURED_TOOL_NAME]
  affects: [15-03]
tech_stack:
  added: []
  patterns: [fail-closed-error-handling, config-flag-accessor, suppression-bridge, tdd-red-green]
key_files:
  created:
    - minion/src/auto-reply/heartbeat-structured.ts
    - minion/src/auto-reply/heartbeat.structured.test.ts
  modified:
    - minion/src/auto-reply/heartbeat.ts
    - minion/src/config/zod-schema.agent-runtime.ts
decisions:
  - "Fail-closed: ForcedToolCallError of any code resolves to should_act=false — suppress rather than spam"
  - "applyHeartbeatStructuredDecision returns SILENT_REPLY_TOKEN to reuse the existing isSilentReplyText() suppression path in normalizeReplyPayload"
  - "Runtime wiring (deciding which path to take in the heartbeat runner) is intentionally deferred to plan 15-03 where it composes with shouldNotifyUser() at the same post-run moment"
metrics:
  duration: "12 min"
  completed: "2026-04-21"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 15 Plan 02: Structured Heartbeat Evaluator Summary

**One-liner:** `evaluateHeartbeatStructured()` wraps `forcedToolCall()` to produce a typed `{should_act, reason}` heartbeat decision, gated by a new `heartbeat.structured` config flag, with a suppression bridge that returns `SILENT_REPLY_TOKEN` on `should_act=false`.

## New `structured` HeartbeatSchema Field

`src/config/zod-schema.agent-runtime.ts` — `HeartbeatSchema` now accepts an optional `structured` boolean:

```yaml
# config.yaml — opt-in to OUT-02 structured heartbeat decisions
agents:
  defaults:
    heartbeat:
      every: 30m
      structured: true   # ← new: forces LLM to call heartbeat_decision tool
```

When `structured` is unset or `false`, the legacy `HEARTBEAT_OK` text-token path is unchanged.

## `evaluateHeartbeatStructured()` Signature

```typescript
// src/auto-reply/heartbeat-structured.ts
import { evaluateHeartbeatStructured } from "./heartbeat-structured.js";
import type { HeartbeatDecision } from "./heartbeat-structured.js";

const decision: HeartbeatDecision = await evaluateHeartbeatStructured({
  model,          // Model<"openai-completions"> from getModel(...)
  context,        // Omit<Context, "tools"> — messages to evaluate
  apiKey?,        // optional override
  timeoutMs?,     // default 20_000ms
});
// decision.should_act: boolean
// decision.reason: string (logged, not sent to user)
```

**Fail-closed behavior:** Any `ForcedToolCallError` (including `TIMEOUT`, `NO_TOOL_CALL`, `WRONG_TOOL`, `PROVIDER_ERROR`) resolves to `{ should_act: false, reason: "structured eval <type>, suppressing by default" }`. The system defaults to suppression rather than user spam on LLM failure.

**Tool name:** `HEARTBEAT_STRUCTURED_TOOL_NAME = "heartbeat_decision"`

**TypeBox schema** passed to `forcedToolCall`:
```typescript
Type.Object({
  should_act: Type.Boolean({ description: "true if actionable content..." }),
  reason: Type.String({ description: "<=120 chars, for logs only..." }),
})
```

## `isHeartbeatStructuredEnabled()` and `applyHeartbeatStructuredDecision()` Call-Site Pattern

```typescript
// src/auto-reply/heartbeat.ts (new exports)
import {
  isHeartbeatStructuredEnabled,
  applyHeartbeatStructuredDecision,
} from "./heartbeat.js";

// Feature flag check — single grep-able point
if (isHeartbeatStructuredEnabled(config)) {
  const decision = await evaluateHeartbeatStructured({ model, context });
  // decision.reason should be logged here (not sent to user channel)
  replyText = applyHeartbeatStructuredDecision(replyText, decision);
  // If should_act=false → replyText is now "NO_REPLY"
  // normalizeReplyPayload will call onSkip("silent") via isSilentReplyText()
}
```

`applyHeartbeatStructuredDecision(replyText, decision)`:
- Returns `SILENT_REPLY_TOKEN` (`"NO_REPLY"`) when `decision.should_act === false`
- Returns `replyText` unchanged when `decision.should_act === true`
- Reuses the existing `isSilentReplyText()` → `onSkip("silent")` path in `normalizeReplyPayload` — no duplicate skip logic

## Runtime Wiring Deferred to Plan 15-03

The actual decision branch in the heartbeat runner (`agent-runner-execution.ts`) — choosing between the structured path and the legacy `HEARTBEAT_OK` token path — is intentionally deferred to plan 15-03. Plan 15-03 wires `shouldNotifyUser()` at the same post-run evaluation moment, and `isHeartbeatStructuredEnabled(config) ? evaluateHeartbeatStructured(...) : legacyTokenPath` composes naturally there.

This plan only ships the reusable building blocks:
1. `evaluateHeartbeatStructured()` — the evaluator
2. `isHeartbeatStructuredEnabled()` — the config flag accessor
3. `applyHeartbeatStructuredDecision()` — the suppression bridge

## Verification

- 12/12 new tests pass (`src/auto-reply/heartbeat.structured.test.ts`)
- 24/24 legacy heartbeat tests pass — zero regressions
- TypeScript error count: 42 (baseline maintained)
- `grep -n "structured: z.boolean" src/config/zod-schema.agent-runtime.ts` — 1 match
- `grep -n "SILENT_REPLY_TOKEN" src/auto-reply/heartbeat.ts` — imported and used

## Commits

- `6eb2ec491` — `feat(15-02): add structured heartbeat evaluator + HeartbeatSchema field`
- `b178db03d` — `feat(15-02): wire isHeartbeatStructuredEnabled + applyHeartbeatStructuredDecision into heartbeat.ts`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all exports are fully implemented. Runtime wiring is intentionally deferred to 15-03 (documented above, not a stub).

## Self-Check: PASSED

- `/home/nikolas/Documents/CODE/AI/minion/src/auto-reply/heartbeat-structured.ts` — FOUND
- `/home/nikolas/Documents/CODE/AI/minion/src/auto-reply/heartbeat.structured.test.ts` — FOUND
- `/home/nikolas/Documents/CODE/AI/minion/src/auto-reply/heartbeat.ts` contains `isHeartbeatStructuredEnabled` — FOUND
- `/home/nikolas/Documents/CODE/AI/minion/src/config/zod-schema.agent-runtime.ts` contains `structured: z.boolean` — FOUND
- Commit `6eb2ec491` — FOUND
- Commit `b178db03d` — FOUND
