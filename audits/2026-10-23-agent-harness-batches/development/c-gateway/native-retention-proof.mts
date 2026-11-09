import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
const moduleAt = (relative: string) => pathToFileURL(path.join(root, relative)).href;
// Use the supported initialized registry boundary before native outbound imports.
const { setActivePluginRegistry } = await import(moduleAt("src/plugins/runtime.ts"));
const { createTestRegistry, createOutboundTestPlugin } = await import(moduleAt("src/test-support/channel-plugins.ts"));
const { positiveFixture } = await import(moduleAt("extensions/alert-watcher/src/work-test-fixtures.ts"));
const { drainDeliveryReceipts } = await import(moduleAt("extensions/alert-watcher/src/delivery-bridge.ts"));
const { handleOwnerReply } = await import(moduleAt("extensions/alert-watcher/src/reply-flow/handle-reply.ts"));
const { redactExpiredWork, admitSource } = await import(moduleAt("extensions/alert-watcher/src/classification-work.ts"));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "c-native-retention-proof-"));
const f = positiveFixture(directory, [{ channel: "telegram", to: "owner-a" }, { channel: "telegram", to: "owner-b" }]);
let sends = 0;
let forwards = 0;
try {
  f.db.prepare("UPDATE classification_work SET suggestion_json=? WHERE id=?").run(JSON.stringify({ state: "received", suggestions: ["alpha", "beta", "gamma"] }), f.id);
  const provider = async () => ({ channel: "telegram", messageId: `private-provider-${++sends}` });
  setActivePluginRegistry(createTestRegistry([{ pluginId: "telegram", source: "test", plugin: createOutboundTestPlugin({ id: "telegram", outbound: { deliveryMode: "direct", sendText: provider, sendMedia: provider } }) }]));
  const dependencies = { stateDir: directory, config: () => ({}), authority: async () => f.snapshot.authority, destinations: () => f.snapshot.destinations };
  await drainDeliveryReceipts(f.db, dependencies);
  const pending = f.db.prepare("SELECT * FROM pending_replies").all();
  assert.equal(sends, 2);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].expires_at - pending[0].created_at, 3600000);
  const forward = async () => { forwards++; return { ok: true }; };
  const api = { runtime: { channel: { telegram: { sendMessageTelegram: forward }, whatsapp: { sendMessageWhatsApp: async () => ({ ok: true }) } } }, logger: { info: () => {}, warn: () => {}, error: () => {} } };
  const reply = await handleOwnerReply(f.db, api, f.snapshot.replyFlow, { sender: "owner-a", message: "2" });
  assert.deepEqual(reply, { status: "forwarded", kind: "preset_2", text: "beta" });
  await drainDeliveryReceipts(f.db, dependencies);
  assert.equal(sends, 2);
  assert.equal(forwards, 1);
  const before = JSON.stringify(f.db.prepare("SELECT * FROM alert_delivery_receipts").all());
  assert.ok(before.includes("private-provider"));
  assert.equal(redactExpiredWork(f.db, Date.now() + 8 * 86400000), 1);
  for (const table of ["classification_work", "complaints", "pending_replies", "alert_delivery_receipts"]) {
    const raw = JSON.stringify(f.db.prepare(`SELECT * FROM ${table}`).all());
    for (const value of ["private-provider", "private alert", "owner-a", "owner-b", "beta"]) assert.ok(!raw.includes(value), `${table} retained ${value}`);
  }
  const queueFiles = fs.readdirSync(path.join(directory, "delivery-queue", ".retained"));
  for (const file of queueFiles) assert.ok(!fs.readFileSync(path.join(directory, "delivery-queue", ".retained", file), "utf8").includes("private-provider"));
  assert.equal(admitSource(f.db, "namespace", f.snapshot).kind, "existing");
  await drainDeliveryReceipts(f.db, dependencies);
  assert.equal(sends, 2);
  console.log(JSON.stringify({ status: "passed", nativeNode: process.version, confirmedProviderCalls: sends, ownerForwards: forwards, pendingRowsBeforeRedaction: pending.length, replyWindowMs: pending[0].expires_at - pending[0].created_at, retainedQueueTombstones: queueFiles.length, rawPrivateCopiesErased: true, replayAdmission: "existing", noProviderReplay: true }, null, 2));
} finally {
  f.db.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
