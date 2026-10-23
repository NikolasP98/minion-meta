import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, it, expect, vi } from "vitest";
import type { MinionConfig } from "../../config/config.js";
import { runCronIsolatedAgentTurn } from "../../platform/cron/isolated-agent/run.js";
import { CronService } from "../../platform/cron/service.js";
import type { CronJobCreate } from "../../platform/cron/types.js";
import { cronHandlers } from "../server-methods/cron.js";
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cron-binding-"));
  dirs.push(dir);
  const cfg: MinionConfig = { agents: { list: [{ id: "a", default: true }, { id: "b" }] } };
  const effects = {
    enqueue: vi.fn(),
    isolated: vi.fn(async (_params: unknown) => ({ status: "ok" as const, summary: "fixture" })),
  };
  const storePath = path.join(dir, "cron.json");
  const cron = new CronService({
    storePath,
    cronEnabled: false,
    currentConfig: () => cfg,
    defaultAgentId: "a",
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    enqueueSystemEvent: effects.enqueue,
    requestHeartbeatNow: () => {},
    runIsolatedAgentJob: effects.isolated,
  });
  return { cron, cfg, storePath, effects };
}
const create = () => ({
  name: "bound",
  enabled: true,
  schedule: { kind: "every" as const, everyMs: 60000 },
  sessionTarget: "isolated" as const,
  wakeMode: "next-heartbeat" as const,
  payload: { kind: "agentTurn" as const, message: "fixture" },
  delivery: { mode: "none" as const },
  agentId: "a",
  sessionKey: "agent:a:origin",
  scope: "session" as const,
});
it("validates raw actual RPC input before lossy normalization, preserving null compatibility", async () => {
  const f = fixture();
  for (const key of ["agentId", "sessionKey"]) {
    for (const value of ["", " \n\t"]) {
      const respond = vi.fn();
      await cronHandlers["cron.add"]({
        params: { job: { ...create(), [key]: value } },
        respond,
        context: { cron: f.cron },
      } as never);
      expect(respond.mock.calls[0]?.[0]).toBe(false);
      expect(await f.cron.list({ includeDisabled: true })).toEqual([]);
    }
  }
  const respond = vi.fn();
  await cronHandlers["cron.add"]({
    params: { ...create(), agentId: null, sessionKey: null },
    respond,
    context: { cron: f.cron },
  } as never);
  expect(respond.mock.calls[0]?.[0]).toBe(true);
  const job = respond.mock.calls[0][1];
  expect(job.agentId).toBeUndefined();
  expect(job.sessionKey).toBeUndefined();
  const cleared = await f.cron.update(job.id, { agentId: null, sessionKey: null } as never);
  expect(cleared.agentId).toBeUndefined();
  f.cron.stop();
});
it("candidate-copy update rejects unknown or cross-agent binding with unchanged memory/disk", async () => {
  const f = fixture();
  const job = await f.cron.add(create());
  const before = fs.readFileSync(f.storePath, "utf8");
  for (const patch of [
    { agentId: "b" },
    { sessionKey: "global" },
    { agentId: "missing" },
    { agentId: " " },
    { sessionKey: "agent:b:origin" },
  ]) {
    await expect(f.cron.update(job.id, patch)).rejects.toThrow("invalid cron binding");
    expect(fs.readFileSync(f.storePath, "utf8")).toBe(before);
    expect(f.cron.getJob(job.id)).toEqual(job);
  }
  const updated = await f.cron.update(job.id, { name: "updated" });
  expect(updated.scope).toBe("session");
  f.cron.stop();
  const restarted = new CronService({
    storePath: f.storePath,
    cronEnabled: false,
    currentConfig: () => f.cfg,
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    enqueueSystemEvent: () => {},
    requestHeartbeatNow: () => {},
    runIsolatedAgentJob: async () => ({ status: "ok" }),
  });
  expect((await restarted.list({ includeDisabled: true }))[0].scope).toBe("session");
  restarted.stop();
});
it("revalidates deletion at main/universal and isolated execution before effects", async () => {
  const f = fixture();
  const isolated = await f.cron.add(create());
  const main = await f.cron.add({
    ...create(),
    name: "main",
    sessionTarget: "main",
    scope: "universal",
    payload: { kind: "systemEvent", text: "fixture" },
    delivery: undefined,
  });
  f.cfg.agents!.list = [{ id: "b", default: true }];
  await f.cron.run(isolated.id, "force");
  await f.cron.run(main.id, "force");
  expect(f.effects.isolated).not.toHaveBeenCalled();
  expect(f.effects.enqueue).not.toHaveBeenCalled();
  expect(f.cron.getJob(main.id)?.state.lastStatus).toBe("error");
  const result = await runCronIsolatedAgentTurn({
    cfg: f.cfg,
    deps: {} as never,
    job: isolated,
    message: "fixture",
    sessionKey: `cron:${isolated.id}`,
    agentId: "a",
  });
  expect(result).toMatchObject({ status: "error", error: "invalid cron binding" });
  f.cron.stop();
});
it("keeps general omitted bindings and validated same-agent isolated origins with delivery none", async () => {
  const f = fixture();
  const a = await f.cron.add(create());
  const b = await f.cron.add({ ...create(), agentId: "b", sessionKey: "agent:b:origin" });
  for (const job of [a, b]) {
    await f.cron.run(job.id, "force");
    expect(f.effects.isolated.mock.calls.at(-1)?.[0]).toMatchObject({
      job: {
        agentId: job.agentId,
        sessionKey: job.sessionKey,
        scope: "session",
        delivery: { mode: "none" },
      },
    });
  }
  const general = await f.cron.add({ ...create(), agentId: undefined, sessionKey: "main" });
  expect(general.agentId).toBeUndefined();
  await f.cron.run(general.id, "force");
  expect(f.effects.isolated).toHaveBeenCalledTimes(3);
  f.cron.stop();
});

it("accepts the pinned actual two-profile Pulse wire through real handlers, store and execution without announcement", async () => {
  const bytes = fs.readFileSync(
    new URL("../test-support/fixtures/pulse-cron-wire-v1.json", import.meta.url),
  );
  expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(
    "63be47ba3e431c6079f314059736fa3013dc6e5c23bbda23a048487293ee215b",
  );
  const capture = JSON.parse(bytes.toString("utf8")) as {
    version: 1;
    producer: { sourceHead: string; sourcePatchSha256: string };
    requests: Array<{
      method: "cron.add";
      params: CronJobCreate & { agentId: string; sessionKey: string };
    }>;
  };
  expect(capture.version).toBe(1);
  expect(capture.requests).toHaveLength(2);
  expect(new Set(capture.requests.map((request) => request.params.agentId)).size).toBe(2);
  const schedule = capture.requests[0].params.schedule;
  if (schedule.kind !== "at") {
    throw Error("expected captured one-shot schedule");
  }
  const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse(schedule.at) - 1000),
    f = fixture();
  f.cfg.agents!.list = capture.requests.map((request, index) => ({
    id: request.params.agentId,
    default: index === 0,
  }));
  try {
    for (const request of capture.requests) {
      expect(request.params).toMatchObject({
        scope: "session",
        sessionTarget: "isolated",
        wakeMode: "next-heartbeat",
        deleteAfterRun: true,
        delivery: { mode: "none" },
      });
      expect(request.params.sessionKey).toBe(`agent:${request.params.agentId}:main`);
      const respond = vi.fn();
      await cronHandlers[request.method]({
        params: request.params,
        respond,
        context: { cron: f.cron },
      } as never);
      expect(respond.mock.calls[0][0]).toBe(true);
      const job = respond.mock.calls[0][1] as { id: string };
      const stored = JSON.parse(fs.readFileSync(f.storePath, "utf8")) as {
        jobs: Array<Record<string, unknown>>;
      };
      expect(stored.jobs.find((entry) => entry.id === job.id)).toMatchObject(request.params);
      await f.cron.run(job.id, "force");
      expect(f.effects.isolated.mock.calls.at(-1)?.[0]).toMatchObject({
        job: {
          agentId: request.params.agentId,
          sessionKey: request.params.sessionKey,
          scope: "session",
          payload: request.params.payload,
          delivery: { mode: "none" },
        },
      });
    }
    expect(f.effects.isolated).toHaveBeenCalledTimes(2);
    expect(f.effects.enqueue).not.toHaveBeenCalled();
  } finally {
    f.cron.stop();
    clock.mockRestore();
  }
});
