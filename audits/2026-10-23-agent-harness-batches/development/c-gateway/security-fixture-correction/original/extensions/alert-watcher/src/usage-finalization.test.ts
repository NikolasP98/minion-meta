import crypto from "node:crypto";
import { defineDrone, type DroneHost } from "@minion-stack/drone";
import { Type } from "@sinclair/typebox";
import { beforeEach, it, expect, vi } from "vitest";
const stubs = vi.hoisted(() => ({ complete: vi.fn(), emit: vi.fn() }));
vi.hoisted(() => vi.resetModules());

vi.mock("@earendil-works/pi-ai/compat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@earendil-works/pi-ai/compat")>()),
  complete: stubs.complete,
}));
vi.mock("../../../src/events/emitter.js", () => ({ emitEvent: stubs.emit }));
import { runDroneWithUsage, type InvocationUsage } from "../../../src/drones/run-with-usage.js";
const host: DroneHost = {
  resolveApiKey: async () => ({ apiKey: "stub-only", source: "test" }),
  resolveSkillsPrompt: () => "",
};
const usage = { input: 12, output: 4, cacheRead: 3, cacheWrite: 2 };
function response(data: unknown) {
  return {
    role: "assistant",
    content: [{ type: "toolCall", id: "result", name: "result", arguments: data }],
    usage,
    stopReason: "toolUse",
    timestamp: Date.now(),
  };
}
const drone = defineDrone({
  id: "fixture",
  systemPrompt: "fixture",
  model: { provider: "anthropic", model: "claude-haiku-4-5" },
  output: Type.Object({ value: Type.Boolean() }),
});
beforeEach(() => vi.clearAllMocks());
it("uses actual installed SDK schema failures without inventing a resolved model", async () => {
  stubs.complete.mockResolvedValue(response({ value: "invalid" }));
  let observed: InvocationUsage | undefined;
  const result = await runDroneWithUsage(drone, { prompt: "fixture" }, host, {
    attemptId: crypto.randomUUID(),
    purpose: "classification",
    onTerminal: (_r, u) => {
      observed = u;
    },
  });
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty("resolvedModel");
  expect(result.usage?.inputTokens).toBe(12);
  expect(observed).toMatchObject({
    resolvedModel: null,
    costStatus: "unknown",
    costUsd: null,
    costCoverage: "incomplete",
  });
  expect(stubs.emit).toHaveBeenCalledTimes(1);
});
it("persists terminal result before analytics and does not publish when persistence fails", async () => {
  stubs.complete.mockResolvedValue(response({ value: true }));
  const order: string[] = [];
  stubs.emit.mockImplementation(() => order.push("analytics"));
  await runDroneWithUsage(drone, { prompt: "fixture" }, host, {
    attemptId: crypto.randomUUID(),
    purpose: "classification",
    onTerminal: () => {
      order.push("receipt");
    },
  });
  expect(order).toEqual(["receipt", "analytics"]);
  stubs.emit.mockClear();
  await expect(
    runDroneWithUsage(drone, { prompt: "fixture" }, host, {
      attemptId: crypto.randomUUID(),
      purpose: "classification",
      onTerminal: () => {
        throw Error("disk failure");
      },
    }),
  ).rejects.toThrow("disk failure");
  expect(stubs.emit).not.toHaveBeenCalled();
});
it("overlapping A/B and fallback A to B use each terminal resolved model and incomplete fallback coverage", async () => {
  const fallback = defineDrone({
    ...drone.definition,
    model: {
      provider: "anthropic",
      model: "claude-haiku-4-5",
      fallbacks: [{ provider: "openai", model: "gpt-4o" }],
    },
  });
  stubs.complete.mockImplementation(async (model: { provider: string }) => {
    if (model.provider === "anthropic") {
      throw Error("stub failure");
    }
    return response({ value: true });
  });
  let observed: InvocationUsage | undefined;
  const result = await runDroneWithUsage(fallback, { prompt: "fixture" }, host, {
    attemptId: crypto.randomUUID(),
    purpose: "classification",
    onTerminal: (_r, u) => {
      observed = u;
    },
  });
  expect(result.ok && result.resolvedModel).toEqual({ provider: "openai", model: "gpt-4o" });
  expect(observed?.costCoverage).toBe("incomplete");
  expect(observed?.usage.cacheCreationTokens).toBe(2);
  expect(stubs.complete).toHaveBeenCalledTimes(2);
  stubs.complete.mockImplementation(async () => response({ value: true }));
  const values: InvocationUsage[] = [];
  const b = defineDrone({ ...drone.definition, model: { provider: "openai", model: "gpt-4o" } });
  await Promise.all(
    [drone, b].map((d) =>
      runDroneWithUsage(d, { prompt: "fixture" }, host, {
        attemptId: crypto.randomUUID(),
        purpose: "classification",
        onTerminal: (_r, u) => {
          values.push(u);
        },
      }),
    ),
  );
  expect(new Set(values.map((v) => v.attemptId)).size).toBe(2);
  expect(
    values.map((v) => v.resolvedModel?.provider).sort((a, b) => String(a).localeCompare(String(b))),
  ).toEqual(["anthropic", "openai"]);
});
