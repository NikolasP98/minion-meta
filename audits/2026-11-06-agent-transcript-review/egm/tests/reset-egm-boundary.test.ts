import { readFileSync } from "node:fs";
import ts from "typescript";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  clearSessionCursor,
  maybeExtractMemories,
  getSessionExtractionStats,
} from "../gateway/src/memory/extract-memories-runner.js";
vi.mock("../gateway/src/infra/posthog.js", () => ({ trackEvent: vi.fn() }));
vi.mock("../gateway/src/infra/sentry.js", () => ({ addSentryBreadcrumb: vi.fn() }));
vi.mock("../gateway/src/logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
const source = readFileSync(
  new URL("../gateway/src/gateway/server-methods/sessions.ts", import.meta.url),
  "utf8",
);
const parsed = ts.createSourceFile("sessions.ts", source, ts.ScriptTarget.Latest, true);
const node = parsed.statements.find(
  (n) => ts.isFunctionDeclaration(n) && n.name?.text === "ensureSessionRuntimeCleanup",
);
if (!node) throw new Error("Actual lifecycle helper missing");
const compiled = ts.transpileModule(node.getText(parsed), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const makeCleanup = new Function(
  "deps",
  `const {clearSessionCursor, clearSessionQueues,stopSubagentsForRequester,abortEmbeddedPiRun,waitForEmbeddedPiRunEnd,errorShape,ErrorCodes}=deps; ${compiled}; return ensureSessionRuntimeCleanup;`,
);
const old = "reset-old";
const tick = () => new Promise<void>((r) => setImmediate(r));
const response = JSON.stringify([
  { content: "Synthetic only", category: "preference", confidence: 0.95 },
]);
function deps(ended = true) {
  return {
    clearSessionCursor,
    clearSessionQueues: vi.fn(),
    stopSubagentsForRequester: vi.fn(),
    abortEmbeddedPiRun: vi.fn(),
    waitForEmbeddedPiRunEnd: vi.fn(async () => ended),
    errorShape: (code: string, message: string) => ({ code, message }),
    ErrorCodes: { UNAVAILABLE: "UNAVAILABLE" },
  };
}
const input = {
  cfg: {},
  key: "agent:personal-synthetic:main",
  target: { storeKeys: ["legacy"], canonicalKey: "canonical" },
  sessionId: old,
};
beforeEach(() => clearSessionCursor(old));
afterEach(() => clearSessionCursor(old));
function submit(sink: ReturnType<typeof vi.fn>) {
  let resolve!: (s: string) => void;
  const llmCall = vi.fn(
    () =>
      new Promise<string>((r) => {
        resolve = r;
      }),
  );
  maybeExtractMemories({
    sessionId: old,
    windowId: "old-turn",
    lastTurnHadToolCalls: false,
    newMessageCount: 4,
    userWroteMemoryThisTurn: false,
    existingMemory: "",
    recentMessages: Array.from({ length: 4 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: `fixture ${i}`,
    })),
    llmCall,
    onMemoryExtracted: sink,
  });
  return { llmCall, finish: () => resolve(response) };
}
it("the actual shared reset/delete lifecycle suppresses a late extraction write after cleanup succeeds", async () => {
  const sink = vi.fn();
  const run = submit(sink);
  await tick();
  expect(run.llmCall).toHaveBeenCalledOnce();
  const d = deps();
  expect(await makeCleanup(d)(input)).toBeUndefined();
  expect(d.abortEmbeddedPiRun).toHaveBeenCalledWith(old);
  run.finish();
  await tick();
  expect(sink).not.toHaveBeenCalled();
  expect(getSessionExtractionStats(old).completed).toBe(0);
});
it("successful cleanup cancels queued extraction before model dispatch", async () => {
  const sink = vi.fn();
  const run = submit(sink);
  await makeCleanup(deps())(input);
  await tick();
  expect(run.llmCall).not.toHaveBeenCalled();
  expect(sink).not.toHaveBeenCalled();
});
it("a failed cleanup does not reset the unchanged session budget", async () => {
  const sink = vi.fn();
  const run = submit(sink);
  await tick();
  expect(await makeCleanup(deps(false))(input)).toMatchObject({ code: "UNAVAILABLE" });
  expect(getSessionExtractionStats(old).attempts).toBe(1);
  run.finish();
  await tick();
  expect(sink).toHaveBeenCalledOnce();
});
it("missing session ID retains original queue cleanup and never waits for a run", async () => {
  const d = deps();
  await makeCleanup(d)({ ...input, sessionId: undefined });
  expect(d.clearSessionQueues).toHaveBeenCalledWith(["legacy", "canonical"]);
  expect(d.waitForEmbeddedPiRunEnd).not.toHaveBeenCalled();
});
it("reset and delete both await the real helper before their store mutations", () => {
  for (const [start, end] of [
    ['"sessions.reset":', '"sessions.delete":'],
    ['"sessions.delete":', '"sessions.compact":'],
  ]) {
    const part = source.slice(
      source.indexOf(start),
      source.indexOf(end, source.indexOf(start) + 1),
    );
    expect(part.indexOf("await ensureSessionRuntimeCleanup")).toBeGreaterThan(0);
    expect(part.indexOf("await updateSessionStore")).toBeGreaterThan(
      part.indexOf("await ensureSessionRuntimeCleanup"),
    );
  }
});
