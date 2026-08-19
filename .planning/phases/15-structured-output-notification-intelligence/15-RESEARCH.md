## RESEARCH COMPLETE

# Phase 15: Structured Output & Notification Intelligence — Research

## Executive Summary

Phase 15 adds two orthogonal capabilities to the gateway: (1) a `forcedToolCall()` utility that calls the LLM with `toolChoice: "required"` to get structured typed output, and (2) an evaluation step that suppresses noise from heartbeat/cron runs that produce nothing actionable. The codebase is well-positioned for both — the heartbeat suppression (`HEARTBEAT_OK`) and LLM completion patterns exist, just need to be extended with forced-tool semantics.

---

## Domain Research

### 1. Current Heartbeat Decision Flow (OUT-02 context)

**File:** `src/auto-reply/heartbeat.ts`

The current system is text-based:
- Agent receives `HEARTBEAT_PROMPT` → reads `HEARTBEAT.md` → replies with text
- If reply contains `HEARTBEAT_TOKEN` ("HEARTBEAT_OK"), it's stripped from output before sending
- `isHeartbeatContentEffectivelyEmpty()` checks if HEARTBEAT.md has actionable tasks (to skip API call entirely when file is blank)
- Suppression is text-matching: does the reply contain "HEARTBEAT_OK"?

**Problem:** Text-matching is brittle. The agent might say "I have no HEARTBEAT_OK items but will check again" and the token gets stripped incorrectly. Or it wraps the token in markdown.

**Forced tool call fix:** Replace the text output with a structured `should_act` tool:
```typescript
type HeartbeatDecision = { should_act: boolean; reason: string; priority?: "low" | "high" }
```
The agent MUST call this tool. No text parsing needed.

### 2. HEARTBEAT_OK Token Handling Locations

- `src/auto-reply/tokens.ts` — defines `HEARTBEAT_TOKEN = "HEARTBEAT_OK"` and `SILENT_REPLY_TOKEN = "NO_REPLY"`
- `src/auto-reply/reply/normalize-reply.ts` — `normalizeReplyPayload()` strips heartbeat token from reply payloads, calls `onSkip("heartbeat")` when reply should be suppressed
- `src/auto-reply/reply/agent-runner-payloads.ts:48` — checks for HEARTBEAT_OK before sending text
- `src/auto-reply/reply/followup-runner.ts:226` — same check in followup path
- `src/auto-reply/heartbeat.ts:135-136` — normalizes markdown-wrapped HEARTBEAT_OK

### 3. LLM Completion API for Forced Tool Choice

**Existing pattern in `src/agents/models/model-scan.ts:267`:**
```typescript
const message = await complete(model, context, {
  toolChoice: "required",
  // ...
});
```

The `complete()` function (imported from the gateway's LLM abstraction) already supports `toolChoice: "required"`. This is the exact pattern to replicate for `forcedToolCall()`.

**Supporting infrastructure in `src/gateway/open-responses.schema.ts:180`:**
```typescript
tool_choice: ToolChoiceSchema.optional()
```
The OpenResponses HTTP layer supports `tool_choice`, so forced tool calls work across providers.

### 4. Post-Run Notification Evaluation (OUT-03/OUT-04)

**Current flow in `src/auto-reply/reply/agent-runner-payloads.ts`:**
After an agent run, payloads are assembled. The HEARTBEAT_OK check is the only current suppression mechanism.

**Gap:** There's no evaluation step that asks "was this run worth notifying the user about?" after the run completes. Routine cron jobs (status checks, polls that found nothing, heartbeats with no action) still send their full response.

**Where to add:** After `runEmbeddedPiAgent()` returns (now `adapterRegistry.resolve()` from Phase 22), add a post-run evaluation that calls the LLM with a forced tool:
```typescript
type NotificationDecision = { 
  should_notify: boolean; 
  reason: string;
  summary?: string  // short summary if should_notify is true
}
```

**Suppression mechanism:** If `should_notify: false`, skip channel delivery by setting the reply to `SILENT_REPLY_TOKEN` ("NO_REPLY") or returning early with `onSkip("silent")`.

### 5. Where `forcedToolCall()` Should Live

**Best location:** `src/agents/llm-tools/forced-tool-call.ts` (new file) or `src/agents/llm/forced-tool-call.ts`

Signature:
```typescript
export async function forcedToolCall<T>(opts: {
  model: string;
  messages: OpenAIMessage[];
  tool: { name: string; description: string; schema: JSONSchema };
  systemPrompt?: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<T>
```

Internally calls `complete()` with `toolChoice: "required"` and parses the tool call arguments as `T`.

**Alternative:** add to `src/memory/llm-call.ts` alongside `callLlmForMemory`, but that file is for memory operations — a separate utility file is cleaner.

### 6. Integration Points

| Requirement | Integration Point | Current Mechanism | New Mechanism |
|-------------|------------------|-------------------|---------------|
| OUT-01 | `src/agents/llm-tools/forced-tool-call.ts` | N/A (new) | `complete()` + `toolChoice: "required"` |
| OUT-02 | `src/auto-reply/heartbeat.ts` → heartbeat runner | Text: "HEARTBEAT_OK" | Forced tool: `{should_act, reason}` |
| OUT-03 | `src/auto-reply/reply/agent-runner-payloads.ts` | No evaluation | Forced tool: `{should_notify, reason}` |
| OUT-04 | `src/auto-reply/reply/normalize-reply.ts` | HEARTBEAT_OK strip | SILENT_REPLY_TOKEN or `onSkip("silent")` |

### 7. Key Dependencies

- `complete()` function from the LLM abstraction layer — already supports `toolChoice`
- `SILENT_REPLY_TOKEN` ("NO_REPLY") — already exists for suppressing replies
- `normalizeReplyPayload()` → `onSkip("silent")` path — already works
- Phase 22 `adapterRegistry.resolve()` — the new dispatch path where post-run evaluation should hook

### 8. Risk Analysis

**Low risk:**
- `forcedToolCall()` utility is additive — no existing code changes
- `SILENT_REPLY_TOKEN` suppression path already tested and working

**Medium risk:**
- Replacing HEARTBEAT_OK text token with forced tool call (OUT-02) changes the heartbeat flow. Existing tests reference `HEARTBEAT_OK` in 6 locations — need to update or keep backward compat.
- Post-run notification evaluation (OUT-03) adds a second LLM call per heartbeat/cron run, doubling cost for those runs. Should be opt-in or only for heartbeat/cron runs.

**Design decision needed:** Should OUT-02 REPLACE the text-based HEARTBEAT_OK (breaking change) or ADD the forced tool call as an alternative path (additive)?

**Recommendation:** Keep HEARTBEAT_OK as fallback for existing agents; add forced tool call as the primary path when `config.agents.defaults.heartbeat.structured: true`.

---

## Validation Architecture

### Test Strategy Per Requirement

**OUT-01 (`forcedToolCall()` utility):**
- Unit test: `forcedToolCall()` with a mock `complete()` verifies it calls with `toolChoice: "required"` and parses the tool arguments
- Unit test: timeout/error handling when LLM fails
- Integration test: real call with a simple schema (e.g., `{color: string}`) returns typed result

**OUT-02 (heartbeat structured decisions):**
- Unit test: heartbeat with `structured: true` config calls `forcedToolCall()` not text comparison
- Unit test: `should_act: false` → reply suppressed (not sent to channel)
- Unit test: `should_act: true` → reply delivered normally
- E2E test: mock LLM returns forced tool call response; verify channel delivery decision

**OUT-03 (post-run notification eval):**
- Unit test: after a cron run, `shouldNotifyUser()` calls `forcedToolCall()` with run output
- Unit test: `should_notify: false` → `onSkip("silent")` called
- Unit test: `should_notify: true` → normal delivery

**OUT-04 (routine run suppression):**
- Unit test: empty status check → suppressed
- Unit test: actionable content → delivered
- E2E test: mock cron run with "nothing changed" output → no channel message sent

### Test File Locations
- `src/agents/llm-tools/forced-tool-call.test.ts` — unit tests for utility
- `src/auto-reply/heartbeat.structured.test.ts` — heartbeat structured decision tests
- `src/auto-reply/reply/notification-eval.test.ts` — post-run notification evaluation tests

---

## Implementation Approach

**Wave 1:** Create `forcedToolCall()` utility (foundation for all other work)
**Wave 2a:** Wire heartbeat decision through forced tool call (OUT-02)
**Wave 2b:** Create post-run notification evaluator (OUT-03/OUT-04) — parallel with 2a, different files

**Estimated plan count:** 3 plans (utility, heartbeat, notification eval)
