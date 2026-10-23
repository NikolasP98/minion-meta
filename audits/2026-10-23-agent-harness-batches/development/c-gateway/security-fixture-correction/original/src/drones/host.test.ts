import { beforeEach, it, expect, vi } from "vitest";
const stubs = vi.hoisted(() => ({ resolve: vi.fn(), emit: vi.fn() }));
vi.mock("../agents/models/model-auth.js", () => ({
  resolveApiKeyForProvider: stubs.resolve,
  requireApiKey: (auth: { apiKey: string }) => auth.apiKey,
}));
vi.mock("../events/emitter.js", () => ({ emitEvent: stubs.emit }));
import { createGatewayDroneHost } from "./host.js";
beforeEach(() => vi.clearAllMocks());
it("result mode resolves exact SDK candidate credentials and suppresses only inferred usage", async () => {
  stubs.resolve.mockImplementation(async ({ provider }: { provider: string }) => {
    if (provider === "primary") {
      throw Error("missing");
    }
    return { apiKey: "stub", source: "test" };
  });
  const host = createGatewayDroneHost({ usageMode: "result" });
  await expect(
    host.resolveApiKey({
      provider: "primary",
      model: "a",
      fallbacks: [{ provider: "fallback", model: "b" }],
    }),
  ).rejects.toThrow();
  expect(stubs.resolve).toHaveBeenCalledTimes(1);
  await host.resolveApiKey({ provider: "fallback", model: "b" });
  host.emitEvent?.({ event: "agent.run.end", droneId: "test", usage: { inputTokens: 2 } });
  expect(stubs.emit.mock.calls.map((c) => c[0].event)).toEqual(["agent.run.end"]);
});
it("unopted host retains lifecycle and inferred usage behavior", async () => {
  stubs.resolve.mockResolvedValue({ apiKey: "stub", source: "test" });
  const host = createGatewayDroneHost();
  await host.resolveApiKey({ provider: "anthropic", model: "a" });
  host.emitEvent?.({
    event: "agent.run.end",
    droneId: "test",
    usage: { inputTokens: 2, outputTokens: 3 },
  });
  expect(stubs.emit.mock.calls.map((c) => c[0].event)).toEqual([
    "agent.run.end",
    "agent.llm.usage",
  ]);
});
