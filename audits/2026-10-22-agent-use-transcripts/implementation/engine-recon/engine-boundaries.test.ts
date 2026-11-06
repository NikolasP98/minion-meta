import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadSessionStore, saveSessionStore, type SessionEntry } from "/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/config/sessions.ts";
import type { FollowupRun } from "/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/auto-reply/reply/queue.ts";
import { createMockTypingController } from "/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/auto-reply/reply/test-helpers.ts";

const runEmbeddedPiAgentMock = vi.fn();
const routeReplyMock = vi.fn();

vi.mock("/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/agents/models/model-fallback.ts", () => ({
  runWithModelFallback: async ({
    provider,
    model,
    run,
  }: {
    provider: string;
    model: string;
    run: (provider: string, model: string) => Promise<unknown>;
  }) => ({
    result: await run(provider, model),
    provider,
    model,
  }),
}));

vi.mock("/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/agents/pi-embedded.ts", () => ({
  runEmbeddedPiAgent: (params: unknown) => runEmbeddedPiAgentMock(params),
}));

vi.mock("/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/auto-reply/reply/route-reply.ts", () => ({
  isRoutableChannel: (channel: string | undefined) => Boolean(channel && channel !== "webchat"),
  routeReply: (params: unknown) => routeReplyMock(params),
}));

import { createFollowupRunner } from "/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/auto-reply/reply/followup-runner.ts";

const baseQueuedRun = (messageProvider = "whatsapp"): FollowupRun =>
  ({
    prompt: "hello",
    summaryLine: "hello",
    enqueuedAt: Date.now(),
    originatingTo: "channel:C1",
    run: {
      sessionId: "session",
      sessionKey: "main",
      messageProvider,
      agentAccountId: "primary",
      sessionFile: "/tmp/session.jsonl",
      workspaceDir: "/tmp",
      config: {},
      skillsSnapshot: {},
      provider: "anthropic",
      model: "claude",
      thinkLevel: "low",
      verboseLevel: "off",
      elevatedLevel: "off",
      bashElevated: {
        enabled: false,
        allowed: false,
        defaultLevel: "off",
      },
      timeoutMs: 1_000,
      blockReplyBreak: "message_end",
    },
  }) as FollowupRun;

function mockCompactionRun(params: {
  willRetry: boolean;
  result: {
    payloads: Array<{ text: string }>;
    meta: Record<string, unknown>;
  };
}) {
  runEmbeddedPiAgentMock.mockImplementationOnce(
    async (args: {
      onAgentEvent?: (evt: { stream: string; data: Record<string, unknown> }) => void;
    }) => {
      args.onAgentEvent?.({
        stream: "compaction",
        data: { phase: "end", willRetry: params.willRetry },
      });
      return params.result;
    },
  );
}


describe("read-only engine boundary characterization", () => {
  it("queued followup omits draining-call options and injected sender context", async () => {
    runEmbeddedPiAgentMock.mockReset();
    runEmbeddedPiAgentMock.mockResolvedValue({payloads: [], meta: {}});
    const abort = new AbortController(); abort.abort();
    const drainerRunId = "00000000-0000-4000-8000-000000000001";
    const runner = createFollowupRunner({
      opts: {runId: drainerRunId, abortSignal: abort.signal},
      typing: createMockTypingController(), typingMode: "instant", defaultModel: "anthropic/claude"
    });
    const queued = baseQueuedRun("webchat");
    Object.assign(queued.run, {resolvedHubUserId: "fixture-user", senderIsOwner: true, senderPermissionLevel: "admin"});
    await runner(queued);
    expect(runEmbeddedPiAgentMock).toHaveBeenCalledTimes(1);
    const observed = runEmbeddedPiAgentMock.mock.calls[0][0];
    expect(observed.runId).not.toBe(drainerRunId);
    expect(observed.abortSignal).toBeUndefined();
    expect(observed.resolvedHubUserId).toBeUndefined();
    expect(observed.senderIsOwner).toBeUndefined();
    expect(observed.senderPermissionLevel).toBeUndefined();
  });
});

import { routeMessage, pinSession, getSessionPin, unpinSession } from "/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion/src/auto-reply/reply/smart-routing.ts";

describe("opt-in heuristic model routing characterization", () => {
  it("short destructive instruction takes ECO branch and its complete result remains session-pinned", () => {
    const key = "audit-fixture-only";
    const decision = routeMessage({message: "Delete /tmp/example/archive permanently", routing: {enabled: true, ecoModel: "openai/fixture-eco"}});
    expect(decision?.model).toBe("fixture-eco");
    expect(decision?.disableTools).toBe(true);
    pinSession(key, decision!);
    expect(getSessionPin(key)?.routingResult).toEqual(decision);
    expect(unpinSession(key)).toBe(true);
  });
});
