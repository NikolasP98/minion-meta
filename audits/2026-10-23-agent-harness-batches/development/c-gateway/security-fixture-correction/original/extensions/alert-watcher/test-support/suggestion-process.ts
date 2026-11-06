import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import type { SQLInputValue, StatementResultingChanges } from "node:sqlite";
import { setActivePluginRegistry } from "../../../src/plugins/runtime.js";
import type { MinionPluginApi } from "../../../src/plugins/types.js";
import type { ResolvedConfig } from "../index.js";

// Only the external model transport is replaced. SDK, watcher, observer, SQLite,
// lease recovery, materialization, and outbound queue all execute their real code.
const [directory, stage] = process.argv.slice(2);
const compat = await import("@earendil-works/pi-ai/compat");
const transportKey = Symbol.for("minion.suggestion.process.transport");
(globalThis as unknown as Record<symbol, unknown>)[transportKey] = {
  ...compat,
  complete: async () => {
    fs.appendFileSync(path.join(directory, "provider-calls"), "suggestion\n");
    return {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: "r",
          name: "result",
          arguments: { replies: ["alpha", "beta", "gamma"] },
        },
      ],
      usage: { input: 4, output: 1, cacheRead: 0, cacheWrite: 0 },
      stopReason: "toolUse",
      timestamp: Date.now(),
    };
  },
};
registerHooks({
  resolve(specifier, context, next) {
    return specifier === "@earendil-works/pi-ai/compat"
      ? { url: "minion-suggestion-transport:stub", shortCircuit: true }
      : next(specifier, context);
  },
  load(url, context, next) {
    return url === "minion-suggestion-transport:stub"
      ? {
          format: "module",
          source:
            'const s=globalThis[Symbol.for("minion.suggestion.process.transport")];' +
            Object.keys(compat)
              .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && name !== "default")
              .map((name) => `export const ${name}=s[${JSON.stringify(name)}];`)
              .join("\n"),
          shortCircuit: true,
        }
      : next(url, context);
  },
});
const [
  { createCertifiedWatcher },
  { testDb, workFixture },
  { resolveWatcherAuthority },
  { createTestRegistry, createOutboundTestPlugin },
  work,
] = await Promise.all([
  import("../src/certified-runtime.js"),
  import("../src/work-test-fixtures.js"),
  import("../src/authority.js"),
  import("../../../src/test-support/channel-plugins.js"),
  import("../src/classification-work.js"),
]);
const plugin = createOutboundTestPlugin({
  id: "telegram",
  outbound: {
    deliveryMode: "direct",
    sendText: async () => {
      fs.appendFileSync(path.join(directory, "send-calls"), "sent\n");
      return { channel: "telegram", messageId: "accepted" };
    },
    sendMedia: async () => {
      throw Error("unexpected media");
    },
  },
});
plugin.config = {
  listAccountIds: () => ["default"],
  resolveAccount: () => ({ enabled: true }),
  isEnabled: () => true,
  isConfigured: async () => true,
};
setActivePluginRegistry(createTestRegistry([{ pluginId: "telegram", plugin, source: "test" }]));
const cfg = {
  channels: { telegram: { botToken: "fixture" }, accountOrgs: { telegram: { default: [] } } },
  plugins: { entries: { "alert-watcher": { enabled: true } } },
  models: {
    providers: {
      anthropic: { baseUrl: "https://provider.invalid", models: [], apiKey: "fixture" },
    },
  },
};
const authority = await resolveWatcherAuthority(cfg, "telegram", "default");
if (authority.kind === "unavailable") {
  throw Error(authority.reason);
}
const db = testDb(path.join(directory, "alerts.db"));
if (stage !== "recover") {
  const snapshot = workFixture({
    authority,
    replyFlow: {
      enabled: true,
      windowMs: 3600000,
      notifyLoser: false,
      suggestions: { enabled: true, count: 3, maxChars: 140 },
    },
  });
  const admission = work.admitSource(db, "suggestion-process", snapshot);
  if (admission.kind !== "admitted") {
    throw Error("seed admission");
  }
  const lease = work.claimWork(db, admission.work.id, "seed")!,
    attemptId = work.admitInvocation(db, lease);
  const model = { provider: "anthropic", model: snapshot.model };
  work.receiveInvocation(
    db,
    lease,
    {
      ok: true,
      data: { is_complaint: true, severity: "high", category: "other", summary: "broken" },
      usage: {},
      durationMs: 1,
      resolvedModel: model,
    },
    {
      attemptId,
      purpose: "classification",
      requestedModel: model,
      resolvedModel: model,
      usage: {},
      costStatus: "unknown",
      costUsd: null,
      costCoverage: "incomplete",
      elapsedMs: 1,
    },
  );
  db.prepare(
    "UPDATE classification_work SET lease_owner=NULL,lease_expires_at=NULL WHERE id=?",
  ).run(admission.work.id);
} else {
  const realNow = Date.now;
  const future = realNow() + 31000;
  Date.now = () => future;
}
const pause = (at: string) => {
  fs.writeFileSync(path.join(directory, "barrier"), at);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
};
// Per-instance write observation pauses only AFTER SQLite's actual commit. No
// persisted state is fabricated to simulate a crash.
function isNamedParameters(
  value: SQLInputValue | Record<string, SQLInputValue>,
): value is Record<string, SQLInputValue> {
  return value !== null && typeof value === "object" && !ArrayBuffer.isView(value);
}
const prepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const statement = prepare(sql),
    run = statement.run.bind(statement);
  function observedRun(...parameters: SQLInputValue[]): StatementResultingChanges;
  function observedRun(
    named: Record<string, SQLInputValue>,
    ...parameters: SQLInputValue[]
  ): StatementResultingChanges;
  function observedRun(
    first?: SQLInputValue | Record<string, SQLInputValue>,
    ...parameters: SQLInputValue[]
  ): StatementResultingChanges {
    const result =
      first === undefined
        ? run()
        : isNamedParameters(first)
          ? run(first, ...parameters)
          : run(first, ...parameters);
    if (sql.startsWith("UPDATE classification_work SET suggestion_json=")) {
      if (typeof first !== "string") {
        throw Error("expected serialized suggestion");
      }
      const value = JSON.parse(first) as { state: string };
      if (stage === "admitted" && value.state === "admitted") {
        pause(stage);
      }
      if (stage === "received" && value.state === "received") {
        pause(stage);
      }
    }
    return result;
  }
  statement.run = observedRun;
  return statement;
};
const exec = db.exec.bind(db);
db.exec = (sql) => {
  exec(sql);
  if (
    stage === "materialized" &&
    sql === "COMMIT" &&
    Number(prepare("SELECT count(*) n FROM alert_delivery_receipts").get()?.n) > 0
  ) {
    pause(stage);
  }
};
const api = {
  config: cfg,
  runtime: { config: { loadConfig: () => cfg } },
  logger: { warn: () => {}, info: () => {}, error: () => {} },
} as unknown as MinionPluginApi;
const watcher = createCertifiedWatcher(
  api,
  db,
  directory,
  () =>
    ({
      subscriptions: [{ kind: "channel", channel: "telegram", accountId: "default" }],
      destinations: [{ channel: "telegram", accountId: "default", to: "owner" }],
    }) as ResolvedConfig,
  () => "private alert",
);
await watcher.tick();
await watcher.tick();
await watcher.stop();
fs.writeFileSync(path.join(directory, "recovered"), "done");
db.close();
