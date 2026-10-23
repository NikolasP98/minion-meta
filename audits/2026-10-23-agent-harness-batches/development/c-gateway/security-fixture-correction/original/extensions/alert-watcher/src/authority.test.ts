import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { MinionConfig } from "../../../src/config/config.js";
import { setActivePluginRegistry } from "../../../src/plugins/runtime.js";
import type { MinionPluginApi } from "../../../src/plugins/types.js";
import { createTestRegistry } from "../../../src/test-support/channel-plugins.js";
import { telegramPlugin } from "../../telegram/src/channel.js";
const transport = vi.hoisted(() => ({ complete: vi.fn() }));
vi.hoisted(() => vi.resetModules());

vi.mock("@earendil-works/pi-ai/compat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@earendil-works/pi-ai/compat")>()),
  complete: transport.complete,
}));
vi.mock("../../../src/agents/models/model-auth.js", () => ({
  resolveApiKeyForProvider: async () => ({ apiKey: "stub", source: "test" }),
  requireApiKey: () => "stub",
}));
import type { HydrationItem } from "../../../src/gateway/channel-hydrate.js";
import type {
  PluginHookMessageInboundEvent,
  PluginHookMessageReceivedEvent,
  PluginHookMessageContext,
} from "../../../src/plugins/types/hooks.js";
import plugin from "../index.js";
import { resolveWatcherAuthority } from "./authority.js";
const dirs: string[] = [],
  stops: Array<() => Promise<void>> = [];
const mirror = () =>
  (
    globalThis as unknown as {
      __minionChannelMirrorState__: { mirror: Map<string, HydrationItem>; lastHydratedAt: number };
    }
  ).__minionChannelMirrorState__;
beforeEach(() => {
  transport.complete.mockReset();
  transport.complete.mockResolvedValue({
    role: "assistant",
    content: [
      {
        type: "toolCall",
        id: "r",
        name: "result",
        arguments: { is_complaint: false, severity: "low", category: "other", summary: "" },
      },
    ],
    usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 },
    stopReason: "toolUse",
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw Error("network denied");
    }),
  );
  delete (globalThis as unknown as Record<string, unknown>).__minion_alert_watcher_state__;
  setActivePluginRegistry(
    createTestRegistry([{ pluginId: "telegram", plugin: telegramPlugin, source: "test" }]),
  );
  mirror().mirror = new Map();
  mirror().lastHydratedAt = Date.now();
  delete process.env.ORG_SCOPE_SOURCE;
});
afterEach(async () => {
  for (const stop of stops.splice(0)) {
    await stop();
  }
  for (const d of dirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
  delete process.env.ORG_SCOPE_SOURCE;
});
async function fixture(mode = "census") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "watcher-hooks-"));
  dirs.push(dir);
  const pluginConfig = {
    subscriptions: [
      { kind: "channel", channel: "telegram", accountId: "default" },
      { kind: "agent", agentId: "a" },
    ],
    destinations: [],
    replyFlow: { enabled: false },
    complaintExperiment: { mode },
  };
  const cfg: MinionConfig = {
    channels: { telegram: { botToken: "stub-token" }, accountOrgs: { telegram: { default: [] } } },
    plugins: { entries: { "alert-watcher": { enabled: true, config: pluginConfig } } },
  };
  let service: { start: (ctx: unknown) => Promise<void>; stop: () => Promise<void> };
  const methods = new Map<string, (args: unknown) => Promise<unknown>>();
  const hooks = new Map<string, (event: unknown, ctx?: unknown) => Promise<unknown>>();
  const api = {
    config: cfg,
    pluginConfig,
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    runtime: {
      config: { loadConfig: () => cfg },
      channel: {},
      messageLedger: { getDb: () => null },
    },
    registerService: (value: typeof service) => {
      service = value;
    },
    registerGatewayMethod: (name: string, handler: (args: unknown) => Promise<unknown>) => {
      methods.set(name, handler);
    },
    on: (name: string, handler: (event: unknown, ctx?: unknown) => Promise<unknown>) => {
      hooks.set(name, handler);
    },
  } as unknown as MinionPluginApi;
  plugin.register(api);
  await service!.start({ stateDir: dir, config: cfg, logger: api.logger });
  // Service start launches a bounded tick without awaiting it. Quiesce that
  // existing tick before each case changes authority and admits its first source.
  await (
    globalThis as unknown as {
      __minion_alert_watcher_state__: { certified: { tick: () => Promise<void> } };
    }
  ).__minion_alert_watcher_state__.certified.tick();
  stops.push(() => service.stop());
  const db = new DatabaseSync(path.join(dir, "plugins/alert-watcher/alerts.db"));
  stops.push(async () => db.close());
  return { cfg, db, hooks, methods, api, dir, stop: () => service.stop() };
}
function source(messageId = "1", chat = "chat", text = "  exact original \n") {
  return {
    channel: "telegram",
    accountId: "default",
    conversationId: chat,
    messageId,
    text,
    senderId: "customer",
  };
}
function inbound(s = source()): PluginHookMessageInboundEvent {
  return {
    channel: s.channel,
    accountId: s.accountId,
    chatId: s.conversationId,
    isGroup: false,
    content: "composed envelope",
    messageId: s.messageId,
    metadata: { sourceProvenance: { version: 1, sources: [s] } },
  };
}
it("actual inbound and received hooks admit one exact original, separate chats and ordered batch units", async () => {
  const f = await fixture(),
    one = source();
  await f.hooks.get("message_inbound")!(inbound(one));
  const received: PluginHookMessageReceivedEvent = {
    from: "customer",
    content: "merged envelope",
    metadata: { sourceProvenance: { version: 1, sources: [one] } },
  };
  const context: PluginHookMessageContext = {
    channelId: "telegram",
    accountId: "default",
    conversationId: "chat",
    agentId: "a",
  };
  await f.hooks.get("message_received")!(received, context);
  expect(transport.complete).toHaveBeenCalledTimes(1);
  const args = transport.complete.mock.calls[0];
  expect(args[1].messages[0].content).toContain(one.text);
  const two = source("1", "other");
  await f.hooks.get("message_inbound")!(inbound(two));
  const originals = [source("2"), source("3")];
  await f.hooks.get("message_received")!(
    { ...received, metadata: { sourceProvenance: { version: 1, sources: originals } } },
    context,
  );
  expect(transport.complete).toHaveBeenCalledTimes(4);
  expect(f.db.prepare("SELECT count(*) n FROM classification_work").get()).toEqual({ n: 4 });
  expect(
    f.db.prepare("SELECT count(*) n FROM classification_work WHERE state='completed'").get(),
  ).toEqual({ n: 4 });
});
it("DB mirror miss cannot use stale JSON, nor stale/malformed/disabled mirror authority", async () => {
  const f = await fixture();
  process.env.ORG_SCOPE_SOURCE = "db";
  f.cfg.channels!.accountOrgs = { telegram: { default: ["stale-json-A"] } };
  await f.hooks.get("message_inbound")!(inbound());
  expect(transport.complete).not.toHaveBeenCalled();
  for (const entry of [
    { accountId: "default", type: "telegram", orgId: null, projection: { enabled: true } },
    { accountId: "default", type: "telegram", orgId: "A", projection: { enabled: false } },
  ]) {
    mirror().mirror.set("telegram:default", entry as HydrationItem);
    await f.hooks.get("message_inbound")!(inbound());
  }
  mirror().mirror.set("telegram:default", {
    accountId: "default",
    type: "telegram",
    orgId: "A",
    projection: { enabled: true },
  } as HydrationItem);
  mirror().lastHydratedAt = Date.now() - 300001;
  await f.hooks.get("message_inbound")!(inbound());
  expect(transport.complete).not.toHaveBeenCalled();
  expect(f.db.prepare("SELECT count(*) n FROM classification_work").get()).toEqual({ n: 0 });
});
it("reassignment after terminal SDK response fences publication but keeps cost evidence", async () => {
  const f = await fixture();
  process.env.ORG_SCOPE_SOURCE = "db";
  mirror().mirror.set("telegram:default", {
    accountId: "default",
    type: "telegram",
    orgId: "A",
    projection: { enabled: true },
  } as HydrationItem);
  transport.complete.mockImplementation(async () => {
    mirror().mirror.set("telegram:default", {
      accountId: "default",
      type: "telegram",
      orgId: "B",
      projection: { enabled: true },
    } as HydrationItem);
    return {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: "r",
          name: "result",
          arguments: {
            is_complaint: true,
            severity: "high",
            category: "other",
            summary: "private",
          },
        },
      ],
      usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 },
      stopReason: "toolUse",
    };
  });
  await f.hooks.get("message_inbound")!(inbound());
  expect(f.db.prepare("SELECT state FROM classification_work").get()).toEqual({
    state: "canceled",
  });
  expect(f.db.prepare("SELECT usage_json FROM classification_work").get()).toHaveProperty(
    "usage_json",
    expect.stringContaining("inputTokens"),
  );
  expect(f.db.prepare("SELECT count(*) n FROM complaints").get()).toEqual({ n: 0 });
  const { exportComplaintEvaluation } = await import("./complaint-evaluation.js");
  const row = f.db
    .prepare("SELECT id,authority_observation,receipt_revision FROM classification_work")
    .get() as { id: string; authority_observation: string; receipt_revision: number };
  expect(JSON.parse(row.authority_observation)).toMatchObject({
    status: "invalid",
    source: "db_mirror",
    observedAt: expect.any(Number),
  });
  const record = exportComplaintEvaluation(f.db, row.id);
  expect(record.eligibility).toEqual({ status: "bypass", reason: "invalid_binding" });
  expect(record.baseline.disposition).toBe("positive");
  expect(record.attempts).toHaveLength(1);
  expect(record.attempts[0].usage.inputTokens).toBe(10);
  expect(record.receiptRevision).toBe(row.receipt_revision);
  await f.hooks.get("message_inbound")!(inbound());
  expect(transport.complete).toHaveBeenCalledTimes(1);
  expect(exportComplaintEvaluation(f.db, row.id)).toEqual(record);
});
it("JSON requires installed configured account plus explicit own mapping including local []", async () => {
  const f = await fixture();
  expect(await resolveWatcherAuthority(f.cfg, "telegram", "default")).toMatchObject({
    kind: "local_unscoped",
    source: "json_config",
  });
  delete f.cfg.channels!.accountOrgs;
  await f.hooks.get("message_inbound")!(inbound());
  expect(transport.complete).not.toHaveBeenCalled();
  f.cfg.channels!.accountOrgs = { telegram: { default: [] } };
  f.cfg.channels!.telegram = {};
  await f.hooks.get("message_inbound")!(inbound());
  expect(transport.complete).not.toHaveBeenCalled();
});

it("actual shadow hook runs baseline with unavailable gate when no trusted context exists", async () => {
  const f = await fixture("shadow");
  await f.hooks.get("message_inbound")!(inbound());
  const { exportComplaintEvaluation } = await import("./complaint-evaluation.js");
  const row = f.db.prepare("SELECT id FROM classification_work").get() as { id: string };
  const record = exportComplaintEvaluation(f.db, row.id);
  expect(record.gate).toMatchObject({ disposition: "unavailable", attemptIds: [] });
  expect(record.baseline.disposition).toBe("negative");
  expect(transport.complete).toHaveBeenCalledTimes(1);
  expect(record.attempts).toHaveLength(1);
});

it("forged RPC source metadata only creates fresh uncertified accounting, never a canonical grant", async () => {
  const f = await fixture();
  await f.methods.get("alertWatcher.classify")!({
    params: {
      input: "same original",
      sourceProvenance: { version: 1, sources: [source()] },
      receiptId: "forged",
    },
    respond: vi.fn(),
  });
  await f.hooks.get("message_inbound")!(inbound());
  const rows = f.db.prepare("SELECT evaluation_binding FROM classification_work").all() as Array<{
    evaluation_binding: string;
  }>;
  expect(
    rows
      .map((r) => JSON.parse(r.evaluation_binding).sourceCertification)
      .sort((a: string, b: string) => a.localeCompare(b)),
  ).toEqual(["certified", "uncertified"]);
  expect(transport.complete).toHaveBeenCalledTimes(2);
});

it("received positive with expired admitted suggestion resumes locally and publishes explicit unavailable suggestions", async () => {
  const f = await fixture();
  const { workFixture } = await import("./work-test-fixtures.js");
  const { admitSource, claimWork, admitInvocation, receiveInvocation, setSuggestion } =
    await import("./classification-work.js");
  const authority = await resolveWatcherAuthority(f.cfg, "telegram", "default");
  if (authority.kind === "unavailable") {
    throw Error();
  }
  const snapshot = workFixture({
    authority,
    replyFlow: {
      enabled: true,
      windowMs: 3600000,
      notifyLoser: false,
      suggestions: { enabled: true, count: 3, maxChars: 140 },
    },
    destinations: [],
  });
  const work = admitSource(f.db, "suggestion-recovery", snapshot);
  if (work.kind !== "admitted") {
    throw Error();
  }
  const lease = claimWork(f.db, work.work.id, "crashed")!,
    attemptId = admitInvocation(f.db, lease);
  receiveInvocation(
    f.db,
    lease,
    {
      ok: true,
      data: { is_complaint: true, severity: "high", category: "other", summary: "broken" },
      usage: {},
      durationMs: 1,
      resolvedModel: { provider: "anthropic", model: snapshot.model },
    },
    {
      attemptId,
      purpose: "classification",
      requestedModel: { provider: "anthropic", model: snapshot.model },
      resolvedModel: { provider: "anthropic", model: snapshot.model },
      usage: {},
      costStatus: "unknown",
      costUsd: null,
      costCoverage: "incomplete",
      elapsedMs: 1,
    },
  );
  setSuggestion(f.db, lease, { state: "queued" });
  setSuggestion(f.db, lease, { state: "admitted", attemptId: crypto.randomUUID() });
  f.db.prepare("UPDATE classification_work SET lease_expires_at=0 WHERE id=?").run(work.work.id);
  const state = (
    globalThis as unknown as {
      __minion_alert_watcher_state__: { certified: { tick: () => Promise<void> } };
    }
  ).__minion_alert_watcher_state__;
  await state.certified.tick();
  expect(transport.complete).not.toHaveBeenCalled();
  expect(
    f.db
      .prepare("SELECT state,suggestion_json FROM classification_work WHERE id=?")
      .get(work.work.id),
  ).toMatchObject({
    state: "completed",
    suggestion_json: expect.stringContaining("indeterminate"),
  });
  expect(f.db.prepare("SELECT count(*) n FROM complaints").get()).toEqual({ n: 1 });
});

it("actual terminal hook disable fences publication and exports retained usage as disabled", async () => {
  const f = await fixture("shadow");
  transport.complete.mockImplementation(async () => {
    f.cfg.plugins!.entries!["alert-watcher"]!.enabled = false;
    return {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: "r",
          name: "result",
          arguments: {
            is_complaint: true,
            severity: "high",
            category: "other",
            summary: "private",
          },
        },
      ],
      usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 },
      stopReason: "toolUse",
    };
  });
  await f.hooks.get("message_inbound")!(inbound());
  const { exportComplaintEvaluation } = await import("./complaint-evaluation.js");
  const row = f.db.prepare("SELECT id FROM classification_work").get() as { id: string };
  const record = exportComplaintEvaluation(f.db, row.id);
  expect(record.enabled).toBe(false);
  expect(record.eligibility).toEqual({ status: "disabled", reason: "plugin_disabled" });
  expect(record.gate).toBeNull();
  expect(record.attempts[0].usage.inputTokens).toBe(10);
  expect(record.baseline.disposition).toBe("positive");
  expect(transport.complete).toHaveBeenCalledTimes(1);
  expect(f.db.prepare("SELECT count(*) n FROM complaints").get()).toEqual({ n: 0 });
});

it.each([false, true])(
  "trusted injected shadow retains baseline and prevents a new gate after revocation=%s",
  async (revoke) => {
    const f = await fixture("shadow");
    await f.stop();
    const { resolveConfig } = await import("../index.js");
    const { buildClassifierDrone } = await import("./classifier.js");
    const { snapshotHash } = await import("./provenance.js");
    const { createCertifiedWatcher } = await import("./certified-runtime.js");
    const { exportComplaintEvaluation } = await import("./complaint-evaluation.js");
    const cfg = resolveConfig(f.api.pluginConfig!);
    const policyHash = snapshotHash(
      buildClassifierDrone(cfg.classifier.model, cfg.language, undefined).definition,
    );
    const gate = vi.fn(async ({ attemptId }: { attemptId: string }) => ({
      disposition: "negative" as const,
      usage: {
        attemptId,
        purpose: "classification" as const,
        requestedModel: { provider: "fixture", model: "gate" },
        resolvedModel: { provider: "fixture", model: "gate" },
        usage: { inputTokens: 1, outputTokens: 1 },
        costStatus: "known" as const,
        costUsd: 0.000001,
        costCoverage: "complete" as const,
        elapsedMs: 1,
      },
    }));
    const watcher = createCertifiedWatcher(
      f.api,
      f.db,
      path.join(f.dir, "plugins/alert-watcher"),
      () => cfg,
      () => "positive baseline",
      {
        context: {
          manifestHash: "a".repeat(64),
          policyHash,
          modelRevision: "fixture-classifier-v1",
          gateRevision: "fixture-gate-v1",
          remainingExposureUsd: 0.01,
          expiresAt: Date.now() + 60000,
          maxInvocationCostUsd: 0.001,
          classifierModel: cfg.classifier.model,
          requestedGateModel: { provider: "fixture", model: "gate", revision: "fixture-gate-v1" },
        },
        run: gate,
      },
    );
    transport.complete.mockImplementation(async () => {
      if (revoke) {
        f.cfg.plugins!.entries!["alert-watcher"]!.enabled = false;
      }
      return {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "r",
            name: "result",
            arguments: {
              is_complaint: true,
              severity: "high",
              category: "other",
              summary: "positive",
            },
          },
        ],
        usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0 },
        stopReason: "toolUse",
      };
    });
    try {
      await watcher.admit(inbound());
      const row = f.db.prepare("SELECT id FROM classification_work").get() as { id: string };
      const record = exportComplaintEvaluation(f.db, row.id);
      expect(transport.complete).toHaveBeenCalledTimes(1);
      expect(record.baseline.disposition).toBe("positive");
      expect(record.attempts.filter((a) => a.purpose === "baseline")).toHaveLength(1);
      if (revoke) {
        expect(gate).not.toHaveBeenCalled();
        expect(record.enabled).toBe(false);
        expect(f.db.prepare("SELECT count(*) n FROM complaints").get()).toEqual({ n: 0 });
      } else {
        expect(gate).toHaveBeenCalledTimes(1);
        expect(record.gate?.disposition).toBe("negative");
        expect(record.attempts.filter((a) => a.purpose === "gate")).toHaveLength(1);
        expect(record.forwardedBaselineAttemptIds).toEqual([]);
        expect(record.eligibility.status).toBe("eligible");
        expect(f.db.prepare("SELECT count(*) n FROM complaints").get()).toEqual({ n: 1 });
        await watcher.tick();
        expect(gate).toHaveBeenCalledTimes(1);
        expect(transport.complete).toHaveBeenCalledTimes(1);
      }
    } finally {
      await watcher.stop();
    }
  },
);
