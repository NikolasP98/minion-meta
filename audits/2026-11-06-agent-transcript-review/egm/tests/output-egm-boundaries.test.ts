import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MinionConfig } from "../gateway/src/config/config.js";
import type { ReplyPayload } from "../gateway/src/auto-reply/types.js";

const boundary = vi.hoisted(() => ({
  summary: vi.fn(),
  speech: vi.fn(),
  openai: vi.fn(),
  cleanup: vi.fn(),
}));
vi.mock("@minion-stack/drone", () => ({
  defineDrone: vi.fn(),
  runDrone: vi.fn(() => {
    throw Error("Provider forbidden");
  }),
}));
vi.mock("node-edge-tts", () => ({ EdgeTTS: vi.fn() }));
vi.mock("../gateway/src/agents/models/model-selection.js", () => ({
  buildModelAliasIndex: vi.fn(),
  resolveDefaultModelForAgent: vi.fn(),
  resolveModelRefFromString: vi.fn(),
}));
vi.mock("../gateway/src/drones/host.js", () => ({
  createGatewayDroneHost: vi.fn(() => {
    throw Error("Provider forbidden");
  }),
}));
vi.mock("../gateway/src/globals.js", () => ({
  logVerbose: vi.fn(),
  shouldLogVerbose: () => false,
}));
vi.mock("../gateway/src/channels/plugins/index.js", () => ({
  normalizeChannelId: (channel: string) => channel,
}));
vi.mock("../gateway/src/agents/pi-embedded/pi-embedded-helpers.js", () => ({
  sanitizeUserFacingText: (text: string) => text,
}));
vi.mock("../gateway/src/tts/tts-core.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../gateway/src/tts/tts-core.js")>()),
  summarizeText: boundary.summary,
  edgeTTS: boundary.speech,
  openaiTTS: boundary.openai,
  elevenLabsTTS: vi.fn(() => {
    throw Error("Provider forbidden");
  }),
  voxtralTTS: vi.fn(() => {
    throw Error("Provider forbidden");
  }),
  scheduleCleanup: boundary.cleanup,
}));
import { maybeApplyTtsToPayload } from "../gateway/src/tts/tts.js";
import { createReplyDispatcher } from "../gateway/src/auto-reply/reply/reply-dispatcher.js";
import { clearAllDispatchers } from "../gateway/src/auto-reply/reply/dispatcher-registry.js";

const dsml =
  '<｜DSML｜tool_calls><｜DSML｜invoke name="exec">unsafe</｜DSML｜invoke></｜DSML｜tool_calls>';
const cfg = (auto: "always" | "tagged" | "off" = "always"): MinionConfig => ({
  messages: {
    tts: { auto, provider: "edge", prefsPath: "/synthetic-egm/no-prefs", maxTextLength: 4096 },
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw Error("External network forbidden");
    }),
  );
  boundary.speech.mockResolvedValue(undefined);
  boundary.summary.mockResolvedValue({
    summary: "A safe spoken summary.",
    inputLength: 2000,
    outputLength: 22,
  });
  boundary.openai.mockImplementation(() => {
    throw Error("Unexpected speech provider");
  });
});
afterEach(() => {
  for (const [directory] of boundary.cleanup.mock.calls)
    rmSync(directory, { recursive: true, force: true });
  vi.unstubAllGlobals();
  clearAllDispatchers();
});

function expectSafe(text: string) {
  expect(text).not.toContain("synthetic-secret");
  expect(text).not.toContain("DSML");
  expect(text).not.toContain("<tool_calls>");
  expect(text).not.toContain("unsafe");
}

describe("ZI-2 actual maybeApplyTtsToPayload speech boundary", () => {
  it("sanitizes caption and speech input before an immediate provider call", async () => {
    const output = await maybeApplyTtsToPayload({
      payload: { text: `Readable explanation. TOKEN=synthetic-secret ${dsml}` },
      cfg: cfg(),
      kind: "final",
    });
    expect(boundary.speech).toHaveBeenCalledOnce();
    expectSafe(boundary.speech.mock.calls[0][0].text);
    expectSafe(output.text!);
    expect(output.text).toContain("invalid tool protocol");
  });
  it("parses legitimate TTS text and provider directives before sanitizing separate speech", async () => {
    const config = cfg("tagged");
    config.messages!.tts!.provider = "openai";
    config.messages!.tts!.openai = { apiKey: "synthetic-provider-config" };
    const output = await maybeApplyTtsToPayload({
      payload: {
        text: `Clean caption for the user. [[tts:provider=edge]][[tts:text]]Spoken override TOKEN=synthetic-secret ${dsml}[[/tts:text]]`,
      },
      cfg: config,
      kind: "final",
    });
    expect(boundary.speech).toHaveBeenCalledOnce();
    expect(boundary.openai).not.toHaveBeenCalled();
    expectSafe(boundary.speech.mock.calls[0][0].text);
    expect(boundary.speech.mock.calls[0][0].text).toContain("invalid tool protocol");
    expect(output.text).toContain("invalid tool protocol");
  });
  it("sanitizes before summarization and again after a contaminated model summary", async () => {
    boundary.summary.mockResolvedValue({
      summary: `Summary TOKEN=synthetic-secret ${dsml}`,
      inputLength: 2000,
      outputLength: 100,
    });
    await maybeApplyTtsToPayload({
      payload: {
        text:
          `Long safe explanation. TOKEN=synthetic-secret <tool_calls>unsafe</tool_calls> ` +
          "More context. ".repeat(160),
      },
      cfg: cfg(),
      kind: "final",
    });
    expect(boundary.summary).toHaveBeenCalledOnce();
    expectSafe(boundary.summary.mock.calls[0][0].text);
    expect(boundary.speech).toHaveBeenCalledOnce();
    expectSafe(boundary.speech.mock.calls[0][0].text);
    expect(boundary.speech.mock.calls[0][0].text).toContain("invalid tool protocol");
  });
  it("does not speak an ordinary protocol-only generated summary", async () => {
    boundary.summary.mockResolvedValue({ summary: "<tool_calls>unsafe</tool_calls>" });
    await maybeApplyTtsToPayload({
      payload: { text: "Long explanation. ".repeat(160) },
      cfg: cfg(),
      kind: "final",
    });
    expect(boundary.summary).toHaveBeenCalledOnce();
    expect(boundary.speech).not.toHaveBeenCalled();
  });
  it("redacts separate caption and spoken credentials without discarding legitimate directives", async () => {
    const output = await maybeApplyTtsToPayload({
      payload: {
        text: "Caption TOKEN=synthetic-secret [[tts:text]]Spoken PASSWORD=synthetic-secret details.[[/tts:text]]",
      },
      cfg: cfg("tagged"),
      kind: "final",
    });
    expectSafe(output.text!);
    expect(output.text).toContain("Caption TOKEN=[REDACTED]");
    expectSafe(boundary.speech.mock.calls[0][0].text);
    expect(boundary.speech.mock.calls[0][0].text).toContain("Spoken PASSWORD=[REDACTED]");
  });
  it("retains normal spoken override semantics", async () => {
    const output = await maybeApplyTtsToPayload({
      payload: { text: "Visible caption. [[tts]]Distinct spoken explanation.[[/tts]]" },
      cfg: cfg("tagged"),
      kind: "final",
    });
    expect(output.text).toBe("Visible caption.");
    expect(boundary.speech.mock.calls[0][0].text).toBe("Distinct spoken explanation.");
  });
  it("preserves disabled TTS and media-only payloads without provider calls", async () => {
    const media = { mediaUrl: "/synthetic/image.png" };
    expect(await maybeApplyTtsToPayload({ payload: media, cfg: cfg(), kind: "final" })).toEqual(
      media,
    );
    await maybeApplyTtsToPayload({
      payload: { text: "Normal disabled reply." },
      cfg: cfg("off"),
      kind: "final",
    });
    expect(boundary.summary).not.toHaveBeenCalled();
    expect(boundary.speech).not.toHaveBeenCalled();
  });
});

async function dispatch(payload: ReplyPayload, kind: "final" | "block" = "final") {
  const delivered = vi.fn(async (_payload: ReplyPayload, _info: { kind: string }) => undefined);
  const onSkip = vi.fn();
  const dispatcher = createReplyDispatcher({ deliver: delivered, onSkip });
  const accepted =
    kind === "final" ? dispatcher.sendFinalReply(payload) : dispatcher.sendBlockReply(payload);
  dispatcher.markComplete();
  await dispatcher.waitForIdle();
  return { accepted, delivered, onSkip };
}

describe("ZI-3 actual dispatcher terminal-final boundary", () => {
  it.each([
    "<tool_calls>unsafe</tool_calls>",
    '```tool_calls\n[{"name":"exec","input":{}}]\n```',
    dsml,
  ])("delivers a bounded failure for protocol-only final: %s", async (text) => {
    const output = await dispatch({ text });
    expect(output.accepted).toBe(true);
    expect(output.delivered).toHaveBeenCalledOnce();
    expect(output.delivered.mock.calls[0][0].text).toContain("invalid tool protocol");
    expect(output.onSkip).not.toHaveBeenCalled();
  });
  it.each(["NO_REPLY", "HEARTBEAT_OK", "[[reply_to_current]]", "[[tts]]", "[VOTE_UP]"])(
    "preserves intentional suppression: %s",
    async (text) => {
      const output = await dispatch({ text });
      expect(output.accepted).toBe(false);
      expect(output.delivered).not.toHaveBeenCalled();
    },
  );
  it("preserves media-only and channel-data-only replies", async () => {
    for (const payload of [
      { mediaUrl: "/synthetic/voice.ogg" },
      { text: "<tool_calls>unsafe</tool_calls>", mediaUrl: "/synthetic/image.png" },
      { text: "[[reply_to_current]]", channelData: { fixture: { id: 1 } } },
    ]) {
      const output = await dispatch(payload);
      expect(output.accepted).toBe(true);
      expect(output.delivered).toHaveBeenCalledOnce();
      expect(output.delivered.mock.calls[0][0].text ?? "").not.toContain("invalid tool protocol");
    }
  });
  it("does not let a configured response prefix hide a protocol-only final", async () => {
    const delivered = vi.fn(async (_payload: ReplyPayload, _info: { kind: string }) => undefined);
    const dispatcher = createReplyDispatcher({ deliver: delivered, responsePrefix: "[Agent]" });
    dispatcher.sendFinalReply({ text: "<tool_calls>unsafe</tool_calls>" });
    dispatcher.markComplete();
    await dispatcher.waitForIdle();
    expect(delivered.mock.calls[0][0].text).toContain("invalid tool protocol");
  });
  it("preserves ordinary sanitizer behavior for nonterminal block output", async () => {
    const output = await dispatch({ text: "<tool_calls>unsafe</tool_calls>" }, "block");
    expect(output.accepted).toBe(false);
    expect(output.delivered).not.toHaveBeenCalled();
  });
  it("rejects a mixed DSML success receipt instead of preserving its unsupported claim", async () => {
    const output = await dispatch({ text: `Booked successfully. ${dsml}` });
    const text = output.delivered.mock.calls[0][0].text;
    expect(text).toContain("invalid tool protocol");
    expect(text).not.toContain("Booked successfully");
  });
  it("retains prose around ordinary tags and redacts supported credentials", async () => {
    const output = await dispatch({
      text: `Available summary. <tool_calls>unsafe</tool_calls> TOKEN=synthetic-secret`,
    });
    const delivered = output.delivered.mock.calls[0][0].text!;
    expectSafe(delivered);
    expect(delivered).toContain("Available summary.");
    expect(delivered).toContain("[REDACTED]");
  });
});

describe("Stage9 sequential TTS-to-dispatch terminal contract", () => {
  it.each(["off", "always", "tagged"] as const)(
    "retains explicit protocol failure through TTS %s then real dispatch",
    async (auto) => {
      for (const text of ["<tool_calls>unsafe</tool_calls>", dsml]) {
        const transformed = await maybeApplyTtsToPayload({
          payload: { text },
          cfg: cfg(auto),
          kind: "final",
        });
        const result = await dispatch(transformed);
        expect(result.accepted).toBe(true);
        expect(result.delivered).toHaveBeenCalledOnce();
        expect(result.delivered.mock.calls[0][0].text).toContain("invalid tool protocol");
        if (auto === "off") expect(boundary.speech).not.toHaveBeenCalled();
      }
    },
  );
  it("keeps disabled-TTS control silence and media/channel data through the real dispatcher", async () => {
    for (const text of ["[[reply_to_current]]", "[[tts]]", "NO_REPLY"]) {
      const output = await dispatch(
        await maybeApplyTtsToPayload({ payload: { text }, cfg: cfg("off"), kind: "final" }),
      );
      expect(output.accepted).toBe(false);
      expect(output.delivered).not.toHaveBeenCalled();
    }
    for (const payload of [
      { mediaUrl: "/synthetic/image.png" },
      { text: "<tool_calls>unsafe</tool_calls>", mediaUrl: "/synthetic/voice.ogg" },
      { text: "[[reply_to_current]]", channelData: { fixture: { id: 1 } } },
    ]) {
      const output = await dispatch(
        await maybeApplyTtsToPayload({ payload, cfg: cfg("off"), kind: "final" }),
      );
      expect(output.accepted).toBe(true);
      expect(output.delivered).toHaveBeenCalledOnce();
      expect(output.delivered.mock.calls[0][0].text ?? "").not.toContain("invalid tool protocol");
    }
    expect(boundary.speech).not.toHaveBeenCalled();
  });
});
