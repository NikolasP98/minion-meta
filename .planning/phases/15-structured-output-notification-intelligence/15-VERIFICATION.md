---
phase: 15-structured-output-notification-intelligence
verified: 2026-04-21T11:30:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 15: Structured Output + Notification Intelligence Verification Report

**Phase Goal:** The platform uses forced tool calls to get structured LLM output where it matters, and routine agent runs that produce nothing actionable are silently suppressed instead of spamming the user.
**Verified:** 2026-04-21T11:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OUT-01: forcedToolCall<T>() exists, uses toolChoice:"required", returns typed T, exported from llm-tools | VERIFIED | `forced-tool-call.ts` line 83: `toolChoice: "required"` in satisfies; barrel exports at `llm-tools/index.ts` line 1 |
| 2 | OUT-02: evaluateHeartbeatStructured() calls forcedToolCall(), returns {should_act, reason}; isHeartbeatStructuredEnabled() and applyHeartbeatStructuredDecision() exported from heartbeat.ts; when should_act=false returns SILENT_REPLY_TOKEN | VERIFIED | `heartbeat-structured.ts` line 51; `heartbeat.ts` lines 183 + 202; `applyHeartbeatStructuredDecision` returns `SILENT_REPLY_TOKEN` when `should_act===false` |
| 3 | OUT-03: shouldNotifyUser() in notification-eval.ts, calls forcedToolCall(), returns {should_notify, reason}; fail-open on error | VERIFIED | `notification-eval.ts` lines 59–115; fail-open catch at line 108–114 returns `should_notify: true` |
| 4 | OUT-04: agent-runner-execution.ts wires the evaluation — when should_notify=false output suppressed via SILENT_REPLY_TOKEN; SILENT_REPLY_TOKEN used not a new mechanism | VERIFIED | `agent-runner-execution.ts` lines 257–308; `applyNotificationDecision` returns `SILENT_REPLY_TOKEN` (value "NO_REPLY") which flows to `normalizeReplyPayload` → `onSkip("silent")` |
| 5 | TS errors <= 42 (baseline) | VERIFIED | `pnpm tsgo` reports exactly 40 errors, all in pre-existing files unrelated to phase 15 (feishu, weixin, sentry, stripe, livekit, etc.); zero new errors from phase 15 files |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/agents/llm-tools/forced-tool-call.ts` | forcedToolCall<T>() utility with toolChoice:"required" | VERIFIED | 122 lines; exports `forcedToolCall`, `ForcedToolCallError`, `ForcedToolCallOptions` |
| `src/agents/llm-tools/forced-tool-call.test.ts` | Unit tests covering happy path + 4 failure modes | VERIFIED | 6 tests covering toolChoice assertion, typed return, NO_TOOL_CALL, WRONG_TOOL, TIMEOUT, and type-level check |
| `src/agents/llm-tools/index.ts` | Barrel export for llm-tools | VERIFIED | 3 lines; re-exports `forcedToolCall`, `ForcedToolCallError`, `ForcedToolCallOptions` |
| `src/auto-reply/heartbeat-structured.ts` | evaluateHeartbeatStructured() returning HeartbeatDecision | VERIFIED | 76 lines; exports `evaluateHeartbeatStructured`, `HeartbeatDecision`, `HEARTBEAT_STRUCTURED_TOOL_NAME` |
| `src/auto-reply/heartbeat.ts` | Updated with isHeartbeatStructuredEnabled() and applyHeartbeatStructuredDecision() | VERIFIED | Both functions present at lines 183 and 202; SILENT_REPLY_TOKEN imported and used |
| `src/auto-reply/heartbeat.structured.test.ts` | 12 tests for evaluateHeartbeatStructured + config helpers | VERIFIED | 12 tests passing (HeartbeatSchema field tests 1-3, evaluateHeartbeatStructured tests 4-6, isHeartbeatStructuredEnabled tests 7-10, applyHeartbeatStructuredDecision tests 11-12) |
| `src/config/zod-schema.agent-runtime.ts` | HeartbeatSchema extended with `structured: z.boolean().optional()` | VERIFIED | Line 35: `structured: z.boolean().optional()` inside HeartbeatSchema |
| `src/auto-reply/reply/notification-eval.ts` | shouldNotifyUser(), applyNotificationDecision(), resolvePostRunText() | VERIFIED | 204 lines; exports `shouldNotifyUser`, `applyNotificationDecision`, `NotificationDecision`, `NOTIFICATION_EVAL_TOOL_NAME`, plus bonus `resolvePostRunText` routing helper |
| `src/auto-reply/reply/notification-eval.test.ts` | 12+ tests for shouldNotifyUser + routing | VERIFIED | 13 tests passing (shouldNotifyUser tests 1-4b, applyNotificationDecision tests 5-7, resolvePostRunText routing tests 8-12) |
| `src/auto-reply/reply/agent-runner-execution.ts` | Post-run evaluation wired after adapterRegistry.resolve() | VERIFIED | Lines 257–308; all three evaluator functions imported (lines 35-43) and used at lines 279, 281, 291, 294, 301 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `forced-tool-call.ts` | `@mariozechner/pi-ai` | import `complete`, `Context`, `Model`, `OpenAICompletionsOptions`, `Tool` | VERIFIED | Line 1-7 imports confirmed |
| `forced-tool-call.ts` | `complete()` call | `toolChoice: "required"` option | VERIFIED | Line 83: `toolChoice: "required"` in satisfies clause |
| `heartbeat-structured.ts` | `../agents/llm-tools/index.js` | import `forcedToolCall` | VERIFIED | Line 2: `from "../agents/llm-tools/index.js"` |
| `heartbeat-structured.ts` | SILENT_REPLY_TOKEN | via heartbeat.ts bridge | VERIFIED | `applyHeartbeatStructuredDecision` in heartbeat.ts returns `SILENT_REPLY_TOKEN` |
| `heartbeat.ts` | `./tokens.js` | import `SILENT_REPLY_TOKEN` | VERIFIED | Line 2: `import { HEARTBEAT_TOKEN, SILENT_REPLY_TOKEN } from "./tokens.js"` |
| `zod-schema.agent-runtime.ts` | HeartbeatSchema | `structured: z.boolean()` field | VERIFIED | Line 35 in `.object({...})` block |
| `notification-eval.ts` | `../../agents/llm-tools/index.js` | import `forcedToolCall` | VERIFIED | Line 3 |
| `notification-eval.ts` | `../tokens.js` | import `SILENT_REPLY_TOKEN` | VERIFIED | Line 4 |
| `agent-runner-execution.ts` | `./notification-eval.js` | import + call `shouldNotifyUser`, `applyNotificationDecision` | VERIFIED | Lines 35-38 import; lines 294, 301 usage |
| `agent-runner-execution.ts` | `../heartbeat.js` | import + call `isHeartbeatStructuredEnabled`, `applyHeartbeatStructuredDecision` | VERIFIED | Lines 39-42 import; lines 279, 291 usage |
| `agent-runner-execution.ts` | `../heartbeat-structured.js` | import + call `evaluateHeartbeatStructured` | VERIFIED | Line 43 import; line 281 usage |
| `effectiveText` → `normalizeReplyPayload` | `SILENT_REPLY_TOKEN` → `onSkip("silent")` | `applyNotificationDecision` returns "NO_REPLY" → `isSilentReplyText()` in `normalize-reply.ts` line 41 | VERIFIED | `normalize-reply.ts` line 37: `silentToken = opts.silentToken ?? SILENT_REPLY_TOKEN`; line 41: `opts.onSkip?.("silent")` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `agent-runner-execution.ts` adapter block | `effectiveText` | `adapterRegistry.resolve()` chunks joined; conditionally filtered through `evaluateHeartbeatStructured` or `shouldNotifyUser` | Yes — flows from real adapter output; evaluators use `forcedToolCall()` with real LLM `complete()` call | FLOWING |
| `notification-eval.ts` `shouldNotifyUser` | `result` from `forcedToolCall` | `complete()` from `@mariozechner/pi-ai` with `toolChoice:"required"` | Yes — LLM forced tool call returns `{should_notify, reason, summary}` | FLOWING |
| `heartbeat-structured.ts` `evaluateHeartbeatStructured` | `result` from `forcedToolCall` | `complete()` from `@mariozechner/pi-ai` | Yes — LLM forced tool call returns `{should_act, reason}` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| forced-tool-call unit tests (6 tests) | `npx vitest run --project unit src/agents/llm-tools/forced-tool-call` | 6/6 passed | PASS |
| heartbeat.structured unit tests (12 tests) | `npx vitest run --project unit src/auto-reply/heartbeat.structured src/auto-reply/heartbeat.test` | 36/36 passed (12 new + 24 existing) | PASS |
| notification-eval unit tests (13 tests) | `npx vitest run --project unit src/auto-reply/reply/notification-eval` | 13/13 passed | PASS |
| TypeScript type check | `pnpm tsgo` | 40 errors (all pre-existing baseline, 0 new from phase 15) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OUT-01 | 15-01 | forcedToolCall<T>() utility wrapping complete() with toolChoice:"required" | SATISFIED | `forced-tool-call.ts` exists, substantive (122 lines), wired and exported; all 6 unit tests pass |
| OUT-02 | 15-02 | Structured heartbeat evaluation via forced tool call with fail-closed behavior | SATISFIED | `heartbeat-structured.ts` + `heartbeat.ts` additions; config schema extended; 12 tests pass |
| OUT-03 | 15-03 | Post-run shouldNotifyUser() evaluator with fail-open behavior | SATISFIED | `notification-eval.ts`; all 13 tests pass including fail-open test 4 |
| OUT-04 | 15-03 | Suppression of non-actionable runs via SILENT_REPLY_TOKEN in agent-runner-execution.ts | SATISFIED | `agent-runner-execution.ts` lines 257–308; routing gated on `params.isHeartbeat`; SILENT_REPLY_TOKEN chain verified |

### Anti-Patterns Found

No blockers or warnings found. One informational note:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `agent-runner-execution.ts` lines 271, 282 | `as any` casts for `evalModel` (pre-existing `// eslint-disable-next-line` comments) | Info | The `getModel()` return type doesn't perfectly match `Model<"openai-completions">` at the generic level; workaround is consistent with how other callers in the codebase handle model instantiation. Does not affect runtime behavior. |

### Human Verification Required

None. All goal-relevant behaviors are verifiable programmatically via unit tests and static analysis.

### Gaps Summary

No gaps. All five must-haves are fully implemented, wired, and tested:

- `forcedToolCall<T>()` is a substantive 122-line implementation (not a stub) with `toolChoice:"required"` and typed generic return, backed by 6 passing unit tests.
- The heartbeat structured path delivers `evaluateHeartbeatStructured()` + config flag (`structured: z.boolean().optional()`) + `isHeartbeatStructuredEnabled()` + `applyHeartbeatStructuredDecision()`, all backed by 12 passing tests with no regression in the 24 existing heartbeat tests.
- `shouldNotifyUser()` is fully implemented with fail-open error handling and 13 passing unit tests including routing logic tests.
- `agent-runner-execution.ts` wires the evaluation inline after `adapterRegistry.resolve()`, using `params.isHeartbeat` as the gate (cron runs are dispatched as heartbeats at the runner level — confirmed by the comment at line 264–267), with proper fail-open at the integration boundary.
- The TS baseline improved from 42 to 40 errors (phase 15 files introduced zero new errors).

---

_Verified: 2026-04-21T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
