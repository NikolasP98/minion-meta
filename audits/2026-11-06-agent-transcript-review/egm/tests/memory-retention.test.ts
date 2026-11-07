import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionCursor,
  getOrCreateCursor,
  getSessionExtractionStats,
  maybeExtractMemories,
} from "../gateway/src/memory/extract-memories-runner.js";
const mocks = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock("../gateway/src/infra/posthog.js", () => ({ trackEvent: vi.fn() }));
vi.mock("../gateway/src/infra/sentry.js", () => ({ addSentryBreadcrumb: vi.fn() }));
vi.mock("../gateway/src/logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({ warn: mocks.warn, debug: vi.fn(), info: vi.fn() }),
}));
const ids = new Set<string>();
const id = (value: string) => {
  const name = `retention-${value}`;
  ids.add(name);
  return name;
};
const duration = 30 * 60 * 1000;
const response = JSON.stringify([
  { content: "Synthetic durable fact", category: "fact", confidence: 0.9 },
]);
function submit(
  sessionId: string,
  llmCall = vi.fn(async (_prompt: string) => response),
  windowId = "window-1",
  onMemoryExtracted = vi.fn(async () => undefined),
) {
  maybeExtractMemories({
    sessionId,
    windowId,
    lastTurnHadToolCalls: false,
    newMessageCount: 4,
    userWroteMemoryThisTurn: false,
    existingMemory: "",
    recentMessages: [
      { role: "user", content: "First synthetic question" },
      { role: "assistant", content: "First answer" },
      { role: "user", content: "Second synthetic question" },
      { role: "assistant", content: "Second answer" },
    ],
    llmCall,
    onMemoryExtracted,
  });
  return llmCall;
}
function fill(count: number, prefix = "fill") {
  for (let i = 0; i < count; i++) getOrCreateCursor(id(`${prefix}-${i}`));
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  mocks.warn.mockClear();
});
afterEach(() => {
  for (const sessionId of ids) clearSessionCursor(sessionId);
  ids.clear();
  vi.useRealTimers();
});

describe("bounded retained extraction generations", () => {
  it("caps retention at256 and declines new admission/getter growth without exceptions", async () => {
    fill(256);
    const existing = getOrCreateCursor(id("fill-0"));
    const overflow = id("overflow");
    const llm = submit(overflow);
    await vi.runAllTimersAsync();
    expect(llm).not.toHaveBeenCalled();
    expect(getSessionExtractionStats(overflow)).toMatchObject({
      tracked: false,
      retainedSessions: 256,
      attempts: 0,
    });
    expect(getOrCreateCursor(overflow)).not.toBe(getOrCreateCursor(overflow));
    expect(getOrCreateCursor(id("fill-0"))).toBe(existing);
    expect(mocks.warn).toHaveBeenCalled();
  });
  it("lazily expires idle states after30min on admission and starts a new budget generation", async () => {
    const old = id("expired");
    const llm = submit(old);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledOnce();
    const oldCursor = getOrCreateCursor(old);
    fill(255);
    vi.setSystemTime(duration + 1);
    const replacement = id("replacement");
    const next = submit(replacement);
    await vi.runAllTimersAsync();
    expect(next).toHaveBeenCalledOnce();
    expect(getSessionExtractionStats(replacement)).toMatchObject({
      tracked: true,
      retainedSessions: 1,
    });
    expect(getOrCreateCursor(old)).not.toBe(oldCursor);
    expect(getSessionExtractionStats(old)).toMatchObject({ attempts: 0, completed: 0 });
    const again = submit(old);
    await vi.runAllTimersAsync();
    expect(again).toHaveBeenCalledOnce();
  });
  it("never expires running or queued generations or resets their paid budget", async () => {
    const active = id("active");
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((done) => {
      resolve = done;
    });
    const llm = vi
      .fn<(prompt: string) => Promise<string>>()
      .mockImplementationOnce(() => pending)
      .mockResolvedValue(response);
    submit(active, llm, "first");
    submit(active, llm, "second");
    await vi.runAllTimersAsync();
    const cursor = getOrCreateCursor(active);
    fill(255);
    vi.setSystemTime(duration + 1);
    submit(id("fresh-after-expiry"));
    await vi.runAllTimersAsync();
    expect(getOrCreateCursor(active)).toBe(cursor);
    expect(getSessionExtractionStats(active)).toMatchObject({
      attempts: 1,
      reserved: 1,
      queued: 1,
    });
    resolve(response);
    await vi.runAllTimersAsync();
    expect(llm).toHaveBeenCalledTimes(2);
    expect(getSessionExtractionStats(active)).toMatchObject({
      attempts: 2,
      completed: 2,
      reserved: 0,
    });
  });
  it("refreshes last activity on completion rather than expiring a long-running result immediately", async () => {
    const active = id("completion");
    let resolve!: (value: string) => void;
    const llm = vi.fn(
      (_prompt: string) =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    submit(active, llm);
    await vi.runAllTimersAsync();
    vi.setSystemTime(duration * 2);
    resolve(response);
    await vi.runAllTimersAsync();
    const cursor = getOrCreateCursor(active);
    vi.setSystemTime(duration * 2 + 1);
    submit(id("trigger-sweep"));
    await vi.runAllTimersAsync();
    expect(getOrCreateCursor(active)).toBe(cursor);
    expect(getSessionExtractionStats(active).attempts).toBe(1);
  });
  it("refreshes idle retention on accepted windows without dispatching tool turns", async () => {
    const waiting = id("accepted-window");
    const addToolWindow = (windowId: string) =>
      maybeExtractMemories({
        sessionId: waiting,
        windowId,
        lastTurnHadToolCalls: true,
        newMessageCount: 1,
        userWroteMemoryThisTurn: false,
        existingMemory: "",
        recentMessages: [{ role: "user", content: "Synthetic pending question" }],
        llmCall: vi.fn(async () => response),
      });
    addToolWindow("first");
    const cursor = getOrCreateCursor(waiting);
    vi.setSystemTime(duration - 1);
    addToolWindow("second");
    vi.setSystemTime(duration + 1);
    submit(id("window-refresh-sweep"));
    await vi.runAllTimersAsync();
    expect(getOrCreateCursor(waiting)).toBe(cursor);
    expect(getSessionExtractionStats(waiting).pendingMessages).toBe(2);
  });
  it("preserves the late-completion fence and returns capacity after clear", async () => {
    const active = id("late");
    let resolve!: (value: string) => void;
    const sink = vi.fn(async () => undefined);
    const llm = vi.fn(
      (_prompt: string) =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    submit(active, llm, "old", sink);
    await vi.runAllTimersAsync();
    fill(255);
    expect(getSessionExtractionStats(id("full-denied")).tracked).toBe(false);
    clearSessionCursor(active);
    const next = submit(active, undefined, "new");
    await vi.runAllTimersAsync();
    expect(next).toHaveBeenCalledOnce();
    resolve(response);
    await vi.runAllTimersAsync();
    expect(sink).not.toHaveBeenCalled();
    expect(getSessionExtractionStats(active)).toMatchObject({
      tracked: true,
      retainedSessions: 256,
      attempts: 1,
      completed: 1,
    });
  });
});
