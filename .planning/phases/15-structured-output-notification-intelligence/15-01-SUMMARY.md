---
phase: 15
plan: "01"
subsystem: agents/llm-tools
tags: [structured-output, llm, tool-calling, typed]
dependency_graph:
  requires: []
  provides: [forcedToolCall, ForcedToolCallError, ForcedToolCallOptions]
  affects: [15-02, 15-03]
tech_stack:
  added: []
  patterns: [toolChoice-required, AbortController-timeout, generic-typed-return]
key_files:
  created:
    - minion/src/agents/llm-tools/forced-tool-call.ts
    - minion/src/agents/llm-tools/forced-tool-call.test.ts
    - minion/src/agents/llm-tools/index.ts
  modified: []
decisions:
  - "Use toolCallBlock.arguments (not .input) — ToolCall type from @mariozechner/pi-ai uses arguments: Record<string, any>"
  - "systemPrompt merged via Context.systemPrompt field (not prepended as message) — Context already supports optional systemPrompt"
  - "AbortController + setTimeout pattern mirrors model-scan.ts withTimeout without importing withTimeout"
metrics:
  duration: "8 min"
  completed: "2026-04-21"
  tasks_completed: 1
  files_created: 3
---

# Phase 15 Plan 01: forcedToolCall<T>() Utility Summary

**One-liner:** Generic `forcedToolCall<T>()` wrapping `complete()` with `toolChoice:"required"` for fully-typed structured LLM output, with error-code taxonomy for all failure modes.

## Exported API

### `forcedToolCall<T>(opts: ForcedToolCallOptions): Promise<T>`

Calls the LLM forcing it to invoke a named tool via `toolChoice: "required"`, and returns the tool's `arguments` typed as `T`.

```typescript
import { forcedToolCall } from "../../agents/llm-tools/forced-tool-call.js";
// or via barrel:
import { forcedToolCall } from "../../agents/llm-tools/index.js";
```

### `ForcedToolCallOptions`

```typescript
type ForcedToolCallOptions = {
  model: Model<"openai-completions">;     // from getModel(...)
  context: Omit<Context, "tools">;        // tools is set by this utility
  tool: { name: string; description: string; parameters: TSchema };
  systemPrompt?: string;                  // optional, merged via Context.systemPrompt
  apiKey?: string;                        // defaults to complete()'s resolution
  maxTokens?: number;                     // default: 256
  temperature?: number;                   // default: 0 (deterministic)
  timeoutMs?: number;                     // default: 30_000ms
};
```

### `ForcedToolCallError`

```typescript
class ForcedToolCallError extends Error {
  readonly code: "NO_TOOL_CALL" | "WRONG_TOOL" | "TIMEOUT" | "PROVIDER_ERROR";
  readonly toolName: string;
}
```

**Error code taxonomy:**

| Code | Trigger |
|------|---------|
| `NO_TOOL_CALL` | LLM returned a text response instead of a tool call |
| `WRONG_TOOL` | LLM called a different tool than the one requested |
| `TIMEOUT` | `complete()` did not resolve within `timeoutMs` |
| `PROVIDER_ERROR` | `complete()` threw an unexpected error |

## How to Use (Copy-Paste for 15-02 and 15-03)

```typescript
import { Type } from "@sinclair/typebox";
import { forcedToolCall, ForcedToolCallError } from "../../agents/llm-tools/index.js";

const schema = Type.Object({
  should_act: Type.Boolean(),
  reason: Type.String(),
});

try {
  const result = await forcedToolCall<{ should_act: boolean; reason: string }>({
    model,   // Model<"openai-completions"> from getModel(...)
    context: { messages },
    tool: { name: "decide", description: "Decide whether to act.", parameters: schema },
    systemPrompt: "You are a heartbeat evaluator.",
    timeoutMs: 15_000,
  });
  console.log(result.should_act); // boolean — fully typed
} catch (err) {
  if (err instanceof ForcedToolCallError) {
    // err.code: "NO_TOOL_CALL" | "WRONG_TOOL" | "TIMEOUT" | "PROVIDER_ERROR"
  }
}
```

## Gotchas Discovered

1. **`arguments` not `input`:** The `ToolCall` type from `@mariozechner/pi-ai` uses `arguments: Record<string, any>`, not `input`. The plan's pseudocode referenced `toolCallBlock.input` — corrected to `toolCallBlock.arguments` in implementation.

2. **`Context.systemPrompt` field exists:** The `Context` type already has an optional `systemPrompt?: string` field, so a system prompt is merged there rather than prepended as a fake user message.

3. **`complete()` signature:** `complete<TApi extends Api>(model: Model<TApi>, context: Context, options?: ProviderStreamOptions): Promise<AssistantMessage>` — accepts any `ProviderStreamOptions` subtype, so `OpenAICompletionsOptions satisfies OpenAICompletionsOptions` pattern from model-scan.ts works cleanly.

4. **No `withTimeout` import needed:** Used `AbortController + setTimeout` inline, mirroring the approach in model-scan.ts without taking a dependency on the private `withTimeout` function.

## Verification

- All 6 unit tests pass: `npx vitest run --project unit src/agents/llm-tools/forced-tool-call`
- Type check holds at 42-error baseline: `pnpm tsgo 2>&1 | grep -c "error TS"` → `42`
- No existing files modified: `git diff --name-only HEAD~1 HEAD` shows only 3 new files

## Commit

- `4148c73bf` — `feat(15-01): add forcedToolCall<T>() utility for structured LLM output`

## Deviations from Plan

**1. [Rule 1 - Bug] Used `.arguments` instead of `.input` on ToolCall block**
- **Found during:** Task 1 implementation
- **Issue:** The plan's pseudocode used `toolCallBlock.input as T` but the `ToolCall` interface in `@mariozechner/pi-ai` declares `arguments: Record<string, any>`, not `input`
- **Fix:** Changed to `toolCallBlock.arguments as T` which is correct per the type definition
- **Files modified:** `src/agents/llm-tools/forced-tool-call.ts`

**2. [Rule 2 - Improvement] Used Context.systemPrompt instead of message prepend**
- **Found during:** Task 1 implementation
- **Issue:** Plan pseudocode prepended systemPrompt as a fake `{ role: "system" }` message, but `Context` already supports `systemPrompt?: string` natively
- **Fix:** Set `contextWithTool.systemPrompt = opts.systemPrompt ?? opts.context.systemPrompt` — cleaner and type-correct

## Self-Check: PASSED

- `/home/nikolas/Documents/CODE/AI/minion/src/agents/llm-tools/forced-tool-call.ts` — FOUND
- `/home/nikolas/Documents/CODE/AI/minion/src/agents/llm-tools/forced-tool-call.test.ts` — FOUND
- `/home/nikolas/Documents/CODE/AI/minion/src/agents/llm-tools/index.ts` — FOUND
- Commit `4148c73bf` — FOUND
