import { readFileSync } from "node:fs";
import { transpileModule, ModuleKind } from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionCursor,
  getOrCreateCursor,
  getSessionExtractionStats,
  maybeExtractMemories,
} from "../gateway/src/memory/extract-memories-runner.js";
import { addSentryBreadcrumb } from "../gateway/src/infra/sentry.js";
import { trackEvent } from "../gateway/src/infra/posthog.js";
import { stripInjectedUserContext } from "../gateway/src/agents/pi-embedded-runner/run/strip-injected-context.js";
vi.mock("../gateway/src/infra/posthog.js", () => ({ trackEvent: vi.fn() }));
vi.mock("../gateway/src/infra/sentry.js", () => ({ addSentryBreadcrumb: vi.fn() }));
vi.mock("../gateway/src/logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
const response = JSON.stringify([
  { content: "Synthetic preference", category: "preference", confidence: 0.9 },
]);
const sessionId = "memory-candidate";
const pair = (id: string) => [
  { role: "user", content: `Synthetic question ${id}` },
  { role: "assistant", content: `Synthetic answer ${id}` },
];
function submit(
  id: string,
  llmCall = vi.fn(async (_prompt: string) => response),
  extra: Partial<Parameters<typeof maybeExtractMemories>[0]> = {},
) {
  const recentMessages = [...pair(`${id}-a`), ...pair(`${id}-b`)];
  maybeExtractMemories({
    sessionId,
    windowId: id,
    lastTurnHadToolCalls: false,
    newMessageCount: recentMessages.length,
    userWroteMemoryThisTurn: false,
    existingMemory: "",
    recentMessages,
    llmCall,
    ...extra,
  });
  return llmCall;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
// Run the real pinned attempt's post-turn block with surrounding dependencies
// injected, rather than fabricating newMessageCount independent of its messages.
const attemptSource = readFileSync(
  new URL("../gateway/src/agents/pi-embedded-runner/run/attempt.ts", import.meta.url),
  "utf8",
);
const postTurnBlock = attemptSource.slice(
  attemptSource.indexOf("const promptForMemory ="),
  attemptSource.indexOf("\n      } finally", attemptSource.indexOf("const promptForMemory =")),
);
const executePostTurn = new Function(
  "params",
  "messagesSnapshot",
  "toolMetas",
  "env",
  "aborted",
  "promptError",
  "stripInjectedUserContext",
  "extractLastAssistantText",
  "maybeExtractMemories",
  "callLlmForMemory",
  "recordExtractedMemories",
  "extractAndStoreMemory",
  "log",
  "existingMemoryForExtraction",
  transpileModule(postTurnBlock, { compilerOptions: { module: ModuleKind.ESNext } }).outputText,
);
function attempt(
  runId: string,
  llmCall: (prompt: string) => Promise<string>,
  extra: {
    tool?: boolean;
    toolName?: string;
    memory?: string;
    prompt?: string;
    kgSession?: object;
    kg?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const sink = vi.fn();
  executePostTurn(
    { sessionId, runId, prompt: extra.prompt ?? `Synthetic question ${runId}` },
    pair(runId),
    extra.tool ? [{ toolName: extra.toolName ?? "synthetic_read" }] : [],
    { sessionAgentId: "synthetic-agent", kgSession: extra.kgSession },
    false,
    undefined,
    stripInjectedUserContext,
    (messages: Array<{ content: string }>) => messages.at(-1)?.content,
    maybeExtractMemories,
    llmCall,
    sink,
    extra.kg ?? vi.fn(async () => undefined),
    { warn: vi.fn() },
    extra.memory ?? "",
  );
  return sink;
}
beforeEach(() => {
  vi.useFakeTimers();
  clearSessionCursor(sessionId);
});
afterEach(() => {
  clearSessionCursor(sessionId);
  vi.useRealTimers();
});
describe("C01/C08 real post-turn seam", () => {
  it("extracts two actual settled pairs once at the unchanged threshold", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    attempt("run-1", llm);
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    const sink = attempt("run-2", llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(llm.mock.calls[0][0]).toContain("Synthetic question run-1");
    expect(llm.mock.calls[0][0]).toContain("Synthetic question run-2");
    expect(sink).toHaveBeenCalledOnce();
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(1);
  });
  it("bounds ten overlapping eligible windows by five and commits all successes", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    for (let i = 0; i < 10; i++) submit(`overlap-${i}`, llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(5);
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(5);
    expect(getSessionExtractionStats(sessionId)).toMatchObject({
      attempts: 5,
      reserved: 0,
      completed: 5,
    });
  });
});

describe("memory candidate replay, accounting and generation fences", () => {
  it("coalesces duplicates before and after completion by actual runId", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    attempt("repeat-1", llm);
    attempt("repeat-1", llm);
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    attempt("repeat-2", llm);
    attempt("repeat-2", llm);
    await vi.runAllTimersAsync();
    attempt("repeat-1", llm);
    attempt("repeat-2", llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(getOrCreateCursor(sessionId).lastExtractedMessageId).toBe("repeat-2");
  });
  it("allows identical real text in different runIds", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    submit("different-1", llm, { recentMessages: pair("same") });
    submit("different-2", llm, { recentMessages: pair("same") });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
  });
  it("never opens the gate by an inflated compatibility count", async () => {
    const llm = submit("inflated", undefined, {
      recentMessages: pair("only-two"),
      newMessageCount: 1000,
    });
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
  });
  it("keeps actual tool-settling gate and independent KG behavior", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    const kg = vi.fn(async () => undefined);
    attempt("tool-1", llm, { tool: true, kgSession: {}, kg });
    attempt("tool-2", llm, { tool: true, kgSession: {}, kg });
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    expect(kg).toHaveBeenCalledTimes(2);
    attempt("settled-3", llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(llm.mock.calls[0][0]).toContain("Synthetic question tool-1");
  });
  it("strips injected gateway context in the actual accumulating caller", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    attempt("privacy-1", llm, {
      prompt:
        "[Thu 2026-11-05 12:00 GMT-5] [Voice call private-routing] Synthetic first preference",
    });
    attempt("privacy-2", llm, {
      prompt:
        "[In-app assistant context private-page Don't restate this context.] Synthetic second preference",
    });
    await vi.runAllTimersAsync();
    const prompt = llm.mock.calls[0][0];
    expect(prompt).toContain("Synthetic first preference");
    expect(prompt).toContain("Synthetic second preference");
    expect(prompt).not.toMatch(/private-routing|private-page|2026-11-05/);
  });
  it("serializes model calls and builds later prompts with the latest extracted context", async () => {
    const first = deferred<string>();
    const llm = vi
      .fn<(prompt: string) => Promise<string>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(response);
    submit("serial-1", llm);
    submit("serial-2", llm);
    expect(getSessionExtractionStats(sessionId)).toMatchObject({
      attempts: 0,
      reserved: 2,
      queued: 2,
    });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    first.resolve(response);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(2);
    expect(llm.mock.calls[1][0]).toContain("## Existing Memory\n\nSynthetic preference");
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(2);
  });
  it("bounds model failures and duplicate retries by the admission budget", async () => {
    const llm = vi.fn(async (_prompt: string) => {
      throw new Error("synthetic provider failure");
    });
    for (let i = 0; i < 20; i++) {
      submit(`failure-${i}`, llm);
      await vi.runAllTimersAsync();
    }
    submit("failure-0", llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(5);
    expect(getSessionExtractionStats(sessionId)).toMatchObject({
      attempts: 5,
      reserved: 0,
      completed: 0,
      failed: 5,
    });
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(0);
  });
  it("does not revive a cleared session from a scheduled callback", async () => {
    const llm = submit("scheduled-clear");
    clearSessionCursor(sessionId);
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(0);
  });
  it("fences late results and queued jobs after clear and recreation", async () => {
    const first = deferred<string>();
    const llm = vi.fn((_prompt: string) => first.promise);
    const sink = vi.fn(async () => undefined);
    submit("old-generation-1", llm, { onMemoryExtracted: sink });
    submit("old-generation-2", llm, { onMemoryExtracted: sink });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    clearSessionCursor(sessionId);
    const fresh = submit("fresh-generation");
    await vi.runAllTimersAsync();
    expect(fresh).toHaveBeenCalledOnce();
    first.resolve(response);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(sink).not.toHaveBeenCalled();
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(1);
    expect(getOrCreateCursor(sessionId).lastExtractedMessageId).toBe("fresh-generation");
  });
  it("refunds canceled reservations before model dispatch", async () => {
    const abort = new AbortController();
    const llm = vi.fn(async (_prompt: string) => response);
    submit("cancel-queued", llm, { abortSignal: abort.signal });
    for (let i = 0; i < 4; i++) submit(`queued-${i}`, llm);
    abort.abort();
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(4);
    submit("replacement", llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(5);
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(5);
  });
  it("charges cancellation after dispatch but suppresses writes and cursor advancement", async () => {
    const abort = new AbortController();
    const first = deferred<string>();
    const sink = vi.fn(async () => undefined);
    const llm = vi.fn((_prompt: string) => first.promise);
    submit("cancel-active", llm, { abortSignal: abort.signal, onMemoryExtracted: sink });
    await vi.runAllTimersAsync();
    abort.abort();
    first.resolve(response);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(sink).not.toHaveBeenCalled();
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(0);
    expect(getSessionExtractionStats(sessionId)).toMatchObject({
      attempts: 1,
      reserved: 0,
      completed: 0,
      canceled: 1,
    });
  });
  it("drops canceled accumulated windows rather than mining them later", async () => {
    const abort = new AbortController();
    const llm = vi.fn(async (_prompt: string) => response);
    submit("pending-abort", llm, {
      recentMessages: pair("canceled-content"),
      abortSignal: abort.signal,
    });
    abort.abort();
    submit("pending-new", llm, { recentMessages: pair("replacement-content") });
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    submit("pending-new-2", llm, { recentMessages: pair("replacement-content-2") });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(llm.mock.calls[0][0]).not.toContain("canceled-content");
  });
  it("bounds callback failures and never retries partial writes", async () => {
    const sink = vi.fn(async () => {
      throw new Error("synthetic sink failure");
    });
    const llm = vi.fn(async (_prompt: string) => response);
    for (let i = 0; i < 10; i++) submit(`sink-failure-${i}`, llm, { onMemoryExtracted: sink });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(5);
    expect(sink).toHaveBeenCalledTimes(5);
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(0);
  });
  it("checks the generation again between persistence callbacks", async () => {
    const sink = vi.fn(async () => {
      clearSessionCursor(sessionId);
    });
    submit(
      "callback-clear",
      vi.fn(async (_prompt: string) =>
        JSON.stringify([
          { content: "First synthetic", category: "fact", confidence: 0.9 },
          { content: "Second synthetic", category: "fact", confidence: 0.9 },
        ]),
      ),
      { onMemoryExtracted: sink },
    );
    await vi.runAllTimersAsync();
    expect(sink).toHaveBeenCalledOnce();
    expect(getOrCreateCursor(sessionId).extractionCount).toBe(0);
  });
  it("keeps bounded rolling whole-window history through a long tool sequence", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    for (let i = 0; i < 50; i++)
      submit(`tool-pending-${i}`, llm, {
        recentMessages: pair(`tool-pending-${i}`),
        lastTurnHadToolCalls: true,
      });
    submit("tool-final", llm, { recentMessages: pair("tool-final") });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    const prompt = llm.mock.calls[0][0];
    expect(prompt).not.toContain("question tool-pending-0\n");
    expect(prompt).toContain("Synthetic question tool-final");
    expect((prompt.match(/Synthetic (question|answer)/g) ?? []).length).toBe(64);
  });
});

describe("memory candidate compatibility and rejection boundaries", () => {
  it("retains legacy source calls with exact-window fallback dedup", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    submit("legacy", llm, { windowId: undefined });
    submit("legacy", llm, { windowId: undefined });
    await vi.runAllTimersAsync();
    submit("legacy", llm, { windowId: undefined });
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    expect(getOrCreateCursor(sessionId).lastExtractedMessageId).toMatch(/^turn-/);
  });
  it("does not collect manually written-memory or disabled windows", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    submit("manual", llm, { userWroteMemoryThisTurn: true });
    submit("disabled", llm, {
      config: {
        enabled: false,
        maxExtractionsPerSession: 5,
        minNewMessagesForExtraction: 4,
        skipIfUserWroteMemory: true,
      },
    });
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    expect(getSessionExtractionStats(sessionId).pendingMessages).toBe(0);
  });
  it("rejects oversized windows and still processes later bounded input", async () => {
    const llm = vi.fn(async (_prompt: string) => response);
    submit("oversized", llm, { recentMessages: [{ role: "user", content: "x".repeat(64_001) }] });
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    submit("normal-sized", llm);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
  });
  it("does not let callers mutate a pending or scheduled prompt after admission", async () => {
    const messages = [...pair("original-a"), ...pair("original-b")];
    const llm = submit("immutable", undefined, { recentMessages: messages });
    messages[0].content = "unexpected mutation";
    messages.splice(1);
    await vi.runAllTimersAsync();
    expect(llm.mock.calls[0][0]).toContain("Synthetic question original-a");
    expect(llm.mock.calls[0][0]).not.toContain("unexpected mutation");
  });
  it("respects cancellation on any contributing window before a combined dispatch", async () => {
    const abort = new AbortController();
    const llm = vi.fn(async (_prompt: string) => response);
    submit("combined-1", llm, { recentMessages: pair("combined-1"), abortSignal: abort.signal });
    submit("combined-2", llm, { recentMessages: pair("combined-2") });
    abort.abort();
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    expect(getSessionExtractionStats(sessionId)).toMatchObject({
      attempts: 0,
      reserved: 0,
      canceled: 1,
      completed: 0,
    });
  });
  it("classifies a rejected model promise after cancellation as canceled and still charges it", async () => {
    const abort = new AbortController();
    let reject!: (reason: Error) => void;
    const llm = vi.fn(
      (_prompt: string) =>
        new Promise<string>((_resolve, fail) => {
          reject = fail;
        }),
    );
    submit("cancel-rejected", llm, { abortSignal: abort.signal });
    await vi.runAllTimersAsync();
    abort.abort();
    reject(new Error("synthetic cancellation"));
    await vi.runAllTimersAsync();
    expect(getSessionExtractionStats(sessionId)).toMatchObject({
      attempts: 1,
      reserved: 0,
      canceled: 1,
      failed: 0,
      completed: 0,
    });
  });
});

it("keeps telemetry errors outside extraction accounting", async () => {
  vi.mocked(addSentryBreadcrumb).mockImplementationOnce(() => {
    throw new Error("synthetic breadcrumb failure");
  });
  submit("telemetry-sync");
  await vi.runAllTimersAsync();
  vi.mocked(trackEvent).mockRejectedValueOnce(new Error("synthetic analytics failure"));
  submit("telemetry-async");
  await vi.runAllTimersAsync();
  expect(getSessionExtractionStats(sessionId)).toMatchObject({
    attempts: 2,
    completed: 2,
    failed: 0,
    reserved: 0,
  });
});

describe("actual caller existing-memory/write gates", () => {
  it("reuses the real pre-turn authorized, filtered recall as bounded dedup context", async () => {
    const start = attemptSource.indexOf(
      "if (!aborted) {",
      attemptSource.indexOf("// Semantic recall from the hub corpus"),
    );
    const end = attemptSource.indexOf("\n        log.debug(`embedded run prompt start:", start);
    const block = attemptSource.slice(start, end);
    const executeRecall = new Function(
      "recallMemories",
      "env",
      "params",
      "emitMemoryRead",
      "log",
      "return (async () => { let effectivePrompt = 'synthetic'; let existingMemoryForExtraction = ''; const aborted = false; " +
        transpileModule(block, { compilerOptions: { module: ModuleKind.ESNext } }).outputText +
        "; return existingMemoryForExtraction; })()",
    );
    const recall = vi.fn(async () => [
      { score: 0.9, content: "Existing authorized preference" },
      { score: 0.1, content: "Low-score excluded preference" },
      { score: 0.8, content: "x".repeat(20_000) },
    ]);
    const memory = await executeRecall(
      recall,
      { sessionAgentId: "synthetic-agent" },
      { prompt: "synthetic query" },
      vi.fn(),
      { debug: vi.fn() },
    );
    expect(recall).toHaveBeenCalledWith("synthetic-agent", "synthetic query", { limit: 5 });
    expect(memory.length).toBe(16_000);
    expect(memory).toContain("Existing authorized preference");
    expect(memory).not.toContain("Low-score excluded preference");
    const llm = vi.fn(async (_prompt: string) => response);
    attempt("recall-1", llm, { memory });
    attempt("recall-2", llm, { memory });
    await vi.runAllTimersAsync();
    expect(llm.mock.calls[0][0]).toContain("## Existing Memory\n- Existing authorized preference");
  });
  it.each(["remember", "brain_remember", "forget", "update_entity"])(
    "conservatively excludes explicit %s tool attempts from later accumulated extraction",
    async (toolName) => {
      const llm = vi.fn(async (_prompt: string) => response);
      attempt("memory-write-attempt", llm, { tool: true, toolName });
      attempt("after-write-1", llm);
      await vi.runAllTimersAsync();
      expect(llm).not.toHaveBeenCalled();
      attempt("after-write-2", llm);
      await vi.runAllTimersAsync();
      expect(llm).toHaveBeenCalledOnce();
      expect(llm.mock.calls[0][0]).not.toContain("Synthetic question memory-write-attempt");
    },
  );
});
