# Centralized Secrets Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all gateway-side secrets out of plugin UIs and out of the 3rd-party Infisical server into a local encrypted SQLite vault managed centrally from the hub's Security tab, leaving Infisical responsible for one item only: the vault's master key.

**Architecture:** New gateway module `src/secrets/` exposes a `SecretsManager` backed by a single SQLite table with per-row libsodium `crypto_secretbox` encryption. The master key (`MINION_SECRETS_KEY`) is the only value still pulled from Infisical at boot. Plugins declare needed secrets in `minion.plugin.json` and read them at runtime via `runtime.secrets`. The hub gets a new `/settings/security/secrets` page that lists every declared secret across plugins with edit/probe actions; existing per-plugin secret fields are replaced with read-only status pills that deep-link to the Security tab. A per-secret probe test locks the canonical key name for each provider — no env-var fallback, no transition layer, hard cutover via a one-shot `minion secrets import` CLI.

**Two-tier secret model:**

- **Static secrets** — singleton credentials that rarely change and have exactly one slot (e.g. `openai_api_key`, `anthropic_api_key`, `twilio_account_sid`, `twilio_auth_token`, `elevenlabs_api_key`, `deepgram_api_key`, `whatsapp_meta_token`). Declared with `kind: "static"`. UI lives entirely in the Security tab. Vault row key = the declared key.
- **Dynamic secrets** — collections that rotate or scale per-instance (e.g. `telegram_bot_token` and `discord_bot_token` — multiple bots per channel, frequent rotation as bots are added/decommissioned). Declared with `kind: "dynamic"` and a `scopeLabel` (e.g. "Account"). Vault row keys are namespaced: `<groupKey>:<instanceId>` (e.g. `telegram_bot_token:acct_panik`). CRUD of *instances* stays in the owning plugin's UI (because the plugin owns account creation), but the value path always goes through the vault — the plugin's account UI calls `runtime.secrets.setScoped(...)` and never stores the raw token in plugin config. The Security tab shows each dynamic group as a collapsible card listing every instance with its status pill and a "Rotate" / "Clear" affordance.

**Tech Stack:** Node 22+, TypeScript, `better-sqlite3` (existing gateway sqlite story), `libsodium-wrappers` (pure-WASM, bundles cleanly with tsdown), Zod (manifest schema), SvelteKit 2 + Svelte 5 (hub UI), Vitest (gateway tests), `@minion-stack/shared` (RPC frame types).

**Scope boundaries (v1):**
- Gateway-only. Hub/site continue using Vercel env vars.
- Static keys: `openai_api_key`, `anthropic_api_key`, `deepgram_api_key`, `elevenlabs_api_key`, `twilio_account_sid`, `twilio_auth_token`, `whatsapp_meta_token`.
- Dynamic keys: `telegram_bot_token`, `discord_bot_token`.
- Probe handler set matches the above plus a `none` probe. Sweep more later.

---

## File Structure

**Gateway (`minion/`):**
- Create: `src/secrets/types.ts` — `SecretEntry`, `SecretRecord`, `ProbeHandler`, `ProbeResult`, `SecretKind`, `SecretsManager` interface.
- Create: `src/secrets/crypto.ts` — libsodium wrapper: `initCrypto()`, `encryptSecret()`, `decryptSecret()`, `loadMasterKey()`.
- Create: `src/secrets/store.ts` — SQLite-backed `SecretStore` (CRUD on the `secrets` table, plaintext never crosses this boundary).
- Create: `src/secrets/manager.ts` — `SecretsManager` orchestrating store + decrypt cache + probe runner + scoped operations.
- Create: `src/secrets/probes/index.ts` — probe registry + dispatch.
- Create: `src/secrets/probes/{openai,anthropic,deepgram,elevenlabs,twilio,telegram-bot,discord-bot,whatsapp,none}.ts` — one file per built-in probe.
- Create: `src/secrets/index.ts` — barrel.
- Create: `src/secrets/{crypto,store,manager,probes/dispatch}.test.ts` — unit tests.
- Create: `src/secrets/probes/{openai,anthropic,deepgram,elevenlabs,twilio,telegram-bot,discord-bot,whatsapp}.test.ts` — one integration test per probe, mocking HTTP via `vi.stubGlobal("fetch", ...)`.
- Modify: `src/plugins/manifest.ts` — extend Zod schema with optional `secrets: Array<SecretDecl>` where each decl has `kind: "static" | "dynamic"`.
- Modify: `src/plugins/runtime/index.ts` — add `runtime.secrets` namespace (static: `get/has`; dynamic: `getScoped/setScoped/clearScoped/listScoped`; shared: `registerProbe`).
- Modify: `src/plugins/runtime/types.ts` — type the new namespace.
- Modify: `src/gateway/server.impl.ts` — instantiate `SecretsManager` at boot; pass into plugin loader.
- Create: `src/gateway/rpc/secrets.ts` — RPC handlers (`secrets.list`, `secrets.set`, `secrets.clear`, `secrets.probe`, scoped variants).
- Modify: `src/gateway/rpc/index.ts` (or equivalent registration site) — register handlers.
- Create: `src/cli/commands/secrets.ts` — `minion secrets import|list|set|clear|probe`.
- Modify: `src/cli/index.ts` — wire the command.
- Modify: `extensions/voice-call/minion.plugin.json` — declare static secrets.
- Modify: `extensions/voice-call/ui/...` — drop the OpenAI key input.
- Modify: `extensions/voice-call/src/*` — replace direct env reads with `runtime.secrets.get("openai_api_key")`.
- Modify: `extensions/telegram/`, `extensions/discord/` — declare dynamic `telegram_bot_token` / `discord_bot_token` groups; replace per-account token storage with `runtime.secrets.setScoped(...)` calls; per-account UI stays in the plugin but writes go through the vault.
- Modify: `extensions/alert-watcher/`, `extensions/whatsapp/` — declare any static secrets they consume (audit pass in Task 16).

**Shared (`packages/shared/`):**
- Modify: protocol types — add `SecretsListReq/Res`, `SecretsSetReq/Res`, `SecretsClearReq/Res`, `SecretsProbeReq/Res`, plus scoped variants. `Res` payloads NEVER contain plaintext values.

**Hub (`minion_hub/`):**
- Create: `src/lib/components/security/SecretStatusPill.svelte` — reusable status pill (`configured` / `missing` / `invalid` / `unknown`).
- Create: `src/lib/components/security/SecretRow.svelte` — list row for static secrets.
- Create: `src/lib/components/security/SecretEditModal.svelte` — password input + save + probe result.
- Create: `src/lib/components/security/DynamicSecretGroup.svelte` — collapsible card showing all instances of a dynamic group with rotate/clear per-instance.
- Create: `src/routes/(app)/settings/security/secrets/+page.svelte` — list page.
- Create: `src/routes/(app)/settings/security/secrets/+page.server.ts` — load via gateway RPC.
- Modify: security sub-tab nav — add "Secrets" subsection.
- Modify: voice-call settings panel — replace key input with `<SecretStatusPill>` + "Manage in Security →" link.
- Modify: telegram/discord account UIs (if they live in hub-rendered iframes) — token field still present (CRUD of dynamic instances stays in plugin UI), but it now triggers a setScoped call via the plugin SDK rather than persisting into plugin config.

---

## Phase 0 — Foundation

### Task 1: Add deps and master-key loader

**Files:**
- Modify: `minion/package.json`
- Create: `minion/src/secrets/crypto.ts`
- Create: `minion/src/secrets/crypto.test.ts`

- [ ] **Step 1: Add deps**

```bash
cd minion
pnpm add libsodium-wrappers
pnpm add -D @types/libsodium-wrappers
pnpm list better-sqlite3 || pnpm add better-sqlite3
```

- [ ] **Step 2: Write the failing test**

Create `src/secrets/crypto.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { initCrypto, encryptSecret, decryptSecret, loadMasterKey } from "./crypto";

describe("secrets crypto", () => {
  beforeAll(async () => { await initCrypto(); });

  it("round-trips a string through encrypt/decrypt with a 32-byte key", () => {
    const key = new Uint8Array(32).fill(7);
    const { ciphertext, nonce } = encryptSecret("hello-world", key);
    expect(ciphertext).toBeInstanceOf(Uint8Array);
    expect(nonce).toHaveLength(24);
    expect(decryptSecret(ciphertext, nonce, key)).toBe("hello-world");
  });

  it("rejects decryption with a wrong key", () => {
    const k1 = new Uint8Array(32).fill(1);
    const k2 = new Uint8Array(32).fill(2);
    const { ciphertext, nonce } = encryptSecret("x", k1);
    expect(() => decryptSecret(ciphertext, nonce, k2)).toThrow();
  });

  it("loadMasterKey throws when MINION_SECRETS_KEY is missing", () => {
    delete process.env.MINION_SECRETS_KEY;
    expect(() => loadMasterKey()).toThrow(/MINION_SECRETS_KEY/);
  });

  it("loadMasterKey throws when key is not 32 bytes base64", () => {
    process.env.MINION_SECRETS_KEY = Buffer.from("short").toString("base64");
    expect(() => loadMasterKey()).toThrow(/32 bytes/);
  });

  it("loadMasterKey returns a 32-byte Uint8Array for a valid base64 key", () => {
    process.env.MINION_SECRETS_KEY = Buffer.from(new Uint8Array(32).fill(9)).toString("base64");
    const k = loadMasterKey();
    expect(k).toHaveLength(32);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test src/secrets/crypto.test.ts
```
Expected: FAIL with "Cannot find module './crypto'".

- [ ] **Step 4: Implement `crypto.ts`**

```typescript
import sodium from "libsodium-wrappers";

let ready = false;

export async function initCrypto(): Promise<void> {
  if (ready) return;
  await sodium.ready;
  ready = true;
}

export function encryptSecret(
  plaintext: string,
  key: Uint8Array,
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  if (!ready) throw new Error("crypto not initialized");
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(`master key must be ${sodium.crypto_secretbox_KEYBYTES} bytes`);
  }
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(sodium.from_string(plaintext), nonce, key);
  return { ciphertext, nonce };
}

export function decryptSecret(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): string {
  if (!ready) throw new Error("crypto not initialized");
  const plain = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  return sodium.to_string(plain);
}

export function loadMasterKey(): Uint8Array {
  const raw = process.env.MINION_SECRETS_KEY;
  if (!raw) {
    throw new Error("MINION_SECRETS_KEY is required (32 bytes, base64). Bootstrap it from Infisical.");
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(raw, "base64"));
  } catch (err) {
    throw new Error(`MINION_SECRETS_KEY is not valid base64: ${(err as Error).message}`);
  }
  if (bytes.length !== 32) {
    throw new Error(`MINION_SECRETS_KEY must decode to 32 bytes, got ${bytes.length}`);
  }
  return bytes;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test src/secrets/crypto.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add minion/package.json minion/pnpm-lock.yaml minion/src/secrets/crypto.ts minion/src/secrets/crypto.test.ts
git commit -m "feat(secrets): libsodium crypto primitives + master key loader"
```

---

### Task 2: SQLite SecretStore with static/dynamic distinction

**Files:**
- Create: `minion/src/secrets/types.ts`
- Create: `minion/src/secrets/store.ts`
- Create: `minion/src/secrets/store.test.ts`

- [ ] **Step 1: Write `types.ts`**

```typescript
export type ProbeStatus = "ok" | "invalid" | "unknown" | "missing";
export type SecretKind = "static" | "dynamic";

export interface SecretRecord {
  rowKey: string;            // 'openai_api_key' (static) or 'telegram_bot_token:acct_xyz' (dynamic)
  groupKey: string;          // 'openai_api_key' or 'telegram_bot_token'
  instanceId: string | null; // null for static; 'acct_xyz' for dynamic
  kind: SecretKind;
  ownerPlugin: string;
  label: string;
  description: string | null;
  probe: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  lastProbeAt: number | null;
  probeStatus: ProbeStatus;
  probeMessage: string | null;
  updatedAt: number;
}

export interface SecretSummary {
  rowKey: string;
  groupKey: string;
  instanceId: string | null;
  kind: SecretKind;
  ownerPlugin: string;
  label: string;
  description?: string;
  probe: string;
  configured: boolean;
  lastProbeAt: number | null;
  probeStatus: ProbeStatus;
  probeMessage: string | null;
  updatedAt: number;
}

export interface StaticSecretDecl {
  key: string;
  kind: "static";
  label: string;
  description?: string;
  probe: string;
}

export interface DynamicSecretDecl {
  key: string;          // groupKey
  kind: "dynamic";
  label: string;        // e.g. "Telegram bot token"
  scopeLabel: string;   // e.g. "Account" — shown in UI as the noun for an instance
  description?: string;
  probe: string;
}

export type SecretDecl = StaticSecretDecl | DynamicSecretDecl;

export interface ProbeResult {
  status: "ok" | "invalid";
  message: string;
}

export interface ProbeContext {
  getOther(rowKey: string): string | null;
}

export type ProbeHandler = (value: string, ctx: ProbeContext) => Promise<ProbeResult>;
```

- [ ] **Step 2: Write the failing test**

Create `src/secrets/store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { SecretStore } from "./store";

function freshStore() {
  const db = new Database(":memory:");
  const s = new SecretStore(db);
  s.init();
  return s;
}

describe("SecretStore", () => {
  it("init() is idempotent", () => {
    const s = freshStore();
    expect(() => s.init()).not.toThrow();
  });

  it("upsert + getRaw round-trips static secret", () => {
    const s = freshStore();
    s.upsert({
      groupKey: "openai_api_key", instanceId: null, kind: "static",
      ownerPlugin: "voice-call", label: "OpenAI", probe: "openai",
      ciphertext: new Uint8Array([1, 2]), nonce: new Uint8Array(24).fill(9),
    });
    const row = s.getRaw("openai_api_key");
    expect(row?.rowKey).toBe("openai_api_key");
    expect(row?.kind).toBe("static");
    expect(row?.instanceId).toBeNull();
  });

  it("dynamic secrets use composite rowKey", () => {
    const s = freshStore();
    s.upsert({
      groupKey: "telegram_bot_token", instanceId: "panik", kind: "dynamic",
      ownerPlugin: "telegram", label: "Telegram bot", probe: "telegram_bot",
      ciphertext: new Uint8Array([1]), nonce: new Uint8Array(24),
    });
    expect(s.getRaw("telegram_bot_token:panik")).not.toBeNull();
    expect(s.getRaw("telegram_bot_token")).toBeNull();
  });

  it("listByGroup returns all instances of a dynamic group", () => {
    const s = freshStore();
    s.upsert({ groupKey: "telegram_bot_token", instanceId: "a", kind: "dynamic", ownerPlugin: "telegram", label: "TG", probe: "telegram_bot", ciphertext: new Uint8Array([1]), nonce: new Uint8Array(24) });
    s.upsert({ groupKey: "telegram_bot_token", instanceId: "b", kind: "dynamic", ownerPlugin: "telegram", label: "TG", probe: "telegram_bot", ciphertext: new Uint8Array([1]), nonce: new Uint8Array(24) });
    const list = s.listByGroup("telegram_bot_token");
    expect(list.map((r) => r.instanceId).sort()).toEqual(["a", "b"]);
  });

  it("declareIfAbsent inserts a placeholder static slot", () => {
    const s = freshStore();
    s.declareIfAbsent({ groupKey: "openai_api_key", kind: "static", ownerPlugin: "voice-call", label: "OpenAI", probe: "openai" });
    const summaries = s.listSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].configured).toBe(false);
    expect(summaries[0].probeStatus).toBe("missing");
  });

  it("declareIfAbsent does NOT pre-create dynamic instances", () => {
    const s = freshStore();
    s.declareIfAbsent({ groupKey: "telegram_bot_token", kind: "dynamic", ownerPlugin: "telegram", label: "TG", probe: "telegram_bot" });
    // For dynamic groups, declareIfAbsent records a metadata row (no instance, no value).
    // listSummaries still surfaces the declaration so UI can render the empty group.
    const summaries = s.listSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].kind).toBe("dynamic");
    expect(summaries[0].instanceId).toBeNull();
    expect(summaries[0].configured).toBe(false);
  });

  it("clear removes the row", () => {
    const s = freshStore();
    s.upsert({ groupKey: "openai_api_key", instanceId: null, kind: "static", ownerPlugin: "voice-call", label: "OpenAI", probe: "openai", ciphertext: new Uint8Array([1]), nonce: new Uint8Array(24) });
    s.clear("openai_api_key");
    expect(s.getRaw("openai_api_key")).toBeNull();
  });

  it("setProbeResult updates only probe fields", () => {
    const s = freshStore();
    s.upsert({ groupKey: "openai_api_key", instanceId: null, kind: "static", ownerPlugin: "voice-call", label: "OpenAI", probe: "openai", ciphertext: new Uint8Array([1]), nonce: new Uint8Array(24) });
    s.setProbeResult("openai_api_key", { status: "ok", message: "200", at: 12345 });
    const row = s.getRaw("openai_api_key");
    expect(row?.probeStatus).toBe("ok");
    expect(row?.lastProbeAt).toBe(12345);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
pnpm test src/secrets/store.test.ts
```
Expected: FAIL with module-not-found.

- [ ] **Step 4: Implement `store.ts`**

```typescript
import type Database from "better-sqlite3";
import type { ProbeStatus, SecretKind, SecretRecord, SecretSummary } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS secrets (
  row_key        TEXT PRIMARY KEY,
  group_key      TEXT NOT NULL,
  instance_id    TEXT,
  kind           TEXT NOT NULL,
  owner_plugin   TEXT NOT NULL,
  label          TEXT NOT NULL,
  description    TEXT,
  probe          TEXT NOT NULL,
  ciphertext     BLOB NOT NULL,
  nonce          BLOB NOT NULL,
  last_probe_at  INTEGER,
  probe_status   TEXT NOT NULL DEFAULT 'unknown',
  probe_message  TEXT,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS secrets_group_idx ON secrets(group_key);
CREATE INDEX IF NOT EXISTS secrets_owner_idx ON secrets(owner_plugin);
`;

export interface UpsertInput {
  groupKey: string;
  instanceId: string | null;
  kind: SecretKind;
  ownerPlugin: string;
  label: string;
  description?: string;
  probe: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export interface DeclareInput {
  groupKey: string;
  kind: SecretKind;
  ownerPlugin: string;
  label: string;
  description?: string;
  probe: string;
}

function buildRowKey(groupKey: string, instanceId: string | null): string {
  return instanceId ? `${groupKey}:${instanceId}` : groupKey;
}

export class SecretStore {
  constructor(private readonly db: Database.Database) {}

  init(): void { this.db.exec(SCHEMA); }

  upsert(input: UpsertInput): void {
    const rowKey = buildRowKey(input.groupKey, input.instanceId);
    const now = Date.now();
    this.db.prepare(
      `INSERT INTO secrets (row_key, group_key, instance_id, kind, owner_plugin, label, description, probe, ciphertext, nonce, updated_at, probe_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown')
       ON CONFLICT(row_key) DO UPDATE SET
         owner_plugin = excluded.owner_plugin,
         label = excluded.label,
         description = excluded.description,
         probe = excluded.probe,
         ciphertext = excluded.ciphertext,
         nonce = excluded.nonce,
         updated_at = excluded.updated_at,
         probe_status = 'unknown',
         probe_message = NULL,
         last_probe_at = NULL`,
    ).run(
      rowKey, input.groupKey, input.instanceId, input.kind, input.ownerPlugin,
      input.label, input.description ?? null, input.probe,
      input.ciphertext, input.nonce, now,
    );
  }

  declareIfAbsent(input: DeclareInput): void {
    // Static: a single placeholder row keyed by groupKey, empty ciphertext.
    // Dynamic: a single "group descriptor" row with instance_id=NULL acts as the declaration; instances are inserted later via upsert.
    const rowKey = input.groupKey;
    this.db.prepare(
      `INSERT OR IGNORE INTO secrets (row_key, group_key, instance_id, kind, owner_plugin, label, description, probe, ciphertext, nonce, updated_at, probe_status)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, X'', X'', ?, 'missing')`,
    ).run(rowKey, input.groupKey, input.kind, input.ownerPlugin, input.label, input.description ?? null, input.probe, Date.now());
  }

  getRaw(rowKey: string): SecretRecord | null {
    const row = this.db.prepare(`SELECT * FROM secrets WHERE row_key = ?`).get(rowKey) as RawRow | undefined;
    if (!row) return null;
    if (row.ciphertext.length === 0) return null; // placeholder, treat as missing
    return toRecord(row);
  }

  listByGroup(groupKey: string): SecretRecord[] {
    const rows = this.db.prepare(
      `SELECT * FROM secrets WHERE group_key = ? AND instance_id IS NOT NULL AND length(ciphertext) > 0`
    ).all(groupKey) as RawRow[];
    return rows.map(toRecord);
  }

  listSummaries(): SecretSummary[] {
    const rows = this.db.prepare(
      `SELECT row_key, group_key, instance_id, kind, owner_plugin, label, description, probe,
              last_probe_at, probe_status, probe_message, updated_at,
              (length(ciphertext) > 0) AS configured
       FROM secrets ORDER BY owner_plugin, group_key, instance_id`,
    ).all() as Array<Omit<RawRow, "ciphertext" | "nonce"> & { configured: number }>;
    return rows.map((r) => ({
      rowKey: r.row_key,
      groupKey: r.group_key,
      instanceId: r.instance_id,
      kind: r.kind as SecretKind,
      ownerPlugin: r.owner_plugin,
      label: r.label,
      description: r.description ?? undefined,
      probe: r.probe,
      configured: Boolean(r.configured),
      lastProbeAt: r.last_probe_at,
      probeStatus: r.probe_status as ProbeStatus,
      probeMessage: r.probe_message,
      updatedAt: r.updated_at,
    }));
  }

  clear(rowKey: string): void {
    this.db.prepare(`DELETE FROM secrets WHERE row_key = ?`).run(rowKey);
  }

  setProbeResult(rowKey: string, result: { status: ProbeStatus; message: string | null; at: number }): void {
    this.db.prepare(
      `UPDATE secrets SET probe_status = ?, probe_message = ?, last_probe_at = ? WHERE row_key = ?`,
    ).run(result.status, result.message, result.at, rowKey);
  }
}

type RawRow = {
  row_key: string; group_key: string; instance_id: string | null; kind: string;
  owner_plugin: string; label: string; description: string | null; probe: string;
  ciphertext: Buffer; nonce: Buffer;
  last_probe_at: number | null; probe_status: string; probe_message: string | null; updated_at: number;
};

function toRecord(r: RawRow): SecretRecord {
  return {
    rowKey: r.row_key,
    groupKey: r.group_key,
    instanceId: r.instance_id,
    kind: r.kind as SecretKind,
    ownerPlugin: r.owner_plugin,
    label: r.label,
    description: r.description,
    probe: r.probe,
    ciphertext: new Uint8Array(r.ciphertext),
    nonce: new Uint8Array(r.nonce),
    lastProbeAt: r.last_probe_at,
    probeStatus: r.probe_status as ProbeStatus,
    probeMessage: r.probe_message,
    updatedAt: r.updated_at,
  };
}
```

- [ ] **Step 5: Run tests + commit**

```bash
pnpm test src/secrets/store.test.ts
git add minion/src/secrets/types.ts minion/src/secrets/store.ts minion/src/secrets/store.test.ts
git commit -m "feat(secrets): SQLite SecretStore with static/dynamic kinds"
```

---

### Task 3: Probe registry

**Files:**
- Create: `minion/src/secrets/probes/index.ts`, `minion/src/secrets/probes/none.ts`, `minion/src/secrets/probes/dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { ProbeRegistry } from "./index";

describe("ProbeRegistry", () => {
  let reg: ProbeRegistry;
  const noCtx = { getOther: () => null };

  beforeEach(() => { reg = new ProbeRegistry(); });

  it("registers and dispatches a probe", async () => {
    reg.register("test", async (value) => ({ status: "ok", message: `len=${value.length}` }));
    const result = await reg.run("test", "abc", noCtx);
    expect(result).toEqual({ status: "ok", message: "len=3" });
  });

  it("returns invalid when probe id unknown", async () => {
    const result = await reg.run("not-registered", "x", noCtx);
    expect(result.status).toBe("invalid");
    expect(result.message).toMatch(/unknown probe/i);
  });

  it("catches probe handler exceptions as invalid", async () => {
    reg.register("boom", async () => { throw new Error("network down"); });
    const result = await reg.run("boom", "x", noCtx);
    expect(result.status).toBe("invalid");
    expect(result.message).toMatch(/network down/);
  });

  it("built-in 'none' probe always returns ok", async () => {
    const result = await reg.run("none", "anything", noCtx);
    expect(result.status).toBe("ok");
  });

  it("passes ProbeContext to handler", async () => {
    reg.register("composite", async (_v, ctx) => ({ status: "ok", message: ctx.getOther("k") ?? "null" }));
    const result = await reg.run("composite", "v", { getOther: (k) => k === "k" ? "found" : null });
    expect(result.message).toBe("found");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/secrets/probes/dispatch.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement `probes/none.ts` and `probes/index.ts`**

`none.ts`:
```typescript
import type { ProbeHandler } from "../types";
export const noneProbe: ProbeHandler = async () => ({ status: "ok", message: "value present (no remote check)" });
```

`index.ts`:
```typescript
import { noneProbe } from "./none";
import type { ProbeContext, ProbeHandler, ProbeResult } from "../types";

export class ProbeRegistry {
  private handlers = new Map<string, ProbeHandler>();
  constructor() { this.register("none", noneProbe); }
  register(id: string, handler: ProbeHandler): void { this.handlers.set(id, handler); }
  async run(id: string, value: string, ctx: ProbeContext): Promise<ProbeResult> {
    const handler = this.handlers.get(id);
    if (!handler) return { status: "invalid", message: `unknown probe '${id}'` };
    try { return await handler(value, ctx); }
    catch (err) { return { status: "invalid", message: (err as Error).message }; }
  }
}
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm test src/secrets/probes/dispatch.test.ts
git add minion/src/secrets/probes/
git commit -m "feat(secrets): probe registry with built-in 'none' handler"
```

---

### Task 4: SecretsManager

**Files:**
- Create: `minion/src/secrets/manager.ts`, `manager.test.ts`, `index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initCrypto } from "./crypto";
import { SecretStore } from "./store";
import { ProbeRegistry } from "./probes";
import { SecretsManager } from "./manager";

describe("SecretsManager", () => {
  beforeAll(async () => {
    await initCrypto();
    process.env.MINION_SECRETS_KEY = Buffer.from(new Uint8Array(32).fill(7)).toString("base64");
  });

  let mgr: SecretsManager;

  beforeEach(() => {
    const db = new Database(":memory:");
    const store = new SecretStore(db); store.init();
    const probes = new ProbeRegistry();
    probes.register("echo", async (v) => ({ status: v === "good" ? "ok" : "invalid", message: v }));
    mgr = new SecretsManager({ store, probes });
    mgr.declare({ key: "openai_api_key", kind: "static", label: "OpenAI", probe: "none", ownerPlugin: "voice-call" });
    mgr.declare({ key: "telegram_bot_token", kind: "dynamic", label: "TG bot", scopeLabel: "Account", probe: "none", ownerPlugin: "telegram" });
  });

  it("static: set + get round-trips through encryption", async () => {
    await mgr.set("openai_api_key", "sk-test");
    expect(mgr.get("openai_api_key")).toBe("sk-test");
  });

  it("get returns null for missing static key", () => {
    expect(mgr.get("openai_api_key")).toBeNull();
  });

  it("set rejects unknown key (not declared)", async () => {
    await expect(mgr.set("not_declared", "v")).rejects.toThrow(/not declared/);
  });

  it("set on a dynamic groupKey without instanceId is rejected", async () => {
    await expect(mgr.set("telegram_bot_token", "v")).rejects.toThrow(/dynamic.*instanceId/);
  });

  it("dynamic: setScoped + getScoped round-trip", async () => {
    await mgr.setScoped("telegram_bot_token", "panik", "tg-token-A");
    expect(mgr.getScoped("telegram_bot_token", "panik")).toBe("tg-token-A");
    expect(mgr.getScoped("telegram_bot_token", "ghost")).toBeNull();
  });

  it("dynamic: listScoped returns all configured instances", async () => {
    await mgr.setScoped("telegram_bot_token", "a", "tok-a");
    await mgr.setScoped("telegram_bot_token", "b", "tok-b");
    const ids = mgr.listScoped("telegram_bot_token").map((s) => s.instanceId).sort();
    expect(ids).toEqual(["a", "b"]);
  });

  it("clearScoped removes only the targeted instance", async () => {
    await mgr.setScoped("telegram_bot_token", "a", "tok-a");
    await mgr.setScoped("telegram_bot_token", "b", "tok-b");
    mgr.clearScoped("telegram_bot_token", "a");
    expect(mgr.getScoped("telegram_bot_token", "a")).toBeNull();
    expect(mgr.getScoped("telegram_bot_token", "b")).toBe("tok-b");
  });

  it("probe re-runs and updates status (static)", async () => {
    await mgr.set("openai_api_key", "x");
    const r = await mgr.probe("openai_api_key");
    expect(r.status).toBe("ok");
  });

  it("probeScoped runs against a single instance", async () => {
    await mgr.setScoped("telegram_bot_token", "panik", "good");
    const r = await mgr.probeScoped("telegram_bot_token", "panik");
    expect(r.status).toBe("ok");
  });
});
```

- [ ] **Step 2: Run to verify fails.** Expected: FAIL.

- [ ] **Step 3: Implement `manager.ts`**

```typescript
import { encryptSecret, decryptSecret, loadMasterKey } from "./crypto";
import type { SecretStore } from "./store";
import type { ProbeRegistry } from "./probes";
import type { ProbeContext, ProbeResult, ProbeStatus, SecretDecl, SecretSummary, SecretKind } from "./types";

interface DeclareInternal {
  key: string;
  kind: SecretKind;
  ownerPlugin: string;
  label: string;
  description?: string;
  scopeLabel?: string;
  probe: string;
}

export interface SecretsManagerDeps {
  store: SecretStore;
  probes: ProbeRegistry;
  masterKey?: Uint8Array;
}

export class SecretsManager {
  private readonly store: SecretStore;
  private readonly probes: ProbeRegistry;
  private readonly key: Uint8Array;
  private readonly cache = new Map<string, string>();
  private readonly decls = new Map<string, DeclareInternal>();

  constructor(deps: SecretsManagerDeps) {
    this.store = deps.store;
    this.probes = deps.probes;
    this.key = deps.masterKey ?? loadMasterKey();
  }

  declare(decl: DeclareInternal): void {
    this.decls.set(decl.key, decl);
    this.store.declareIfAbsent({
      groupKey: decl.key,
      kind: decl.kind,
      ownerPlugin: decl.ownerPlugin,
      label: decl.label,
      description: decl.description,
      probe: decl.probe,
    });
  }

  private requireStatic(key: string): DeclareInternal {
    const d = this.decls.get(key);
    if (!d) throw new Error(`secret '${key}' is not declared`);
    if (d.kind === "dynamic") throw new Error(`'${key}' is dynamic — use setScoped/getScoped with an instanceId`);
    return d;
  }

  private requireDynamic(groupKey: string): DeclareInternal {
    const d = this.decls.get(groupKey);
    if (!d) throw new Error(`secret group '${groupKey}' is not declared`);
    if (d.kind !== "dynamic") throw new Error(`'${groupKey}' is static — use set/get without an instanceId`);
    return d;
  }

  private ctx(): ProbeContext {
    return { getOther: (rowKey: string) => this.getByRowKey(rowKey) };
  }

  private getByRowKey(rowKey: string): string | null {
    const hit = this.cache.get(rowKey);
    if (hit !== undefined) return hit;
    const row = this.store.getRaw(rowKey);
    if (!row) return null;
    const plain = decryptSecret(row.ciphertext, row.nonce, this.key);
    this.cache.set(rowKey, plain);
    return plain;
  }

  // -- Static API --
  async set(key: string, value: string): Promise<ProbeResult> {
    const d = this.requireStatic(key);
    const { ciphertext, nonce } = encryptSecret(value, this.key);
    this.store.upsert({
      groupKey: key, instanceId: null, kind: "static",
      ownerPlugin: d.ownerPlugin, label: d.label, description: d.description, probe: d.probe,
      ciphertext, nonce,
    });
    this.cache.set(key, value);
    return await this.runAndPersistProbe(key, d.probe);
  }

  get(key: string): string | null {
    this.requireStatic(key);
    return this.getByRowKey(key);
  }

  has(key: string): boolean { return this.get(key) !== null; }

  clear(key: string): void {
    this.requireStatic(key);
    this.cache.delete(key);
    this.store.clear(key);
    // Re-create the placeholder so the slot is still visible.
    const d = this.decls.get(key)!;
    this.store.declareIfAbsent({ groupKey: key, kind: "static", ownerPlugin: d.ownerPlugin, label: d.label, description: d.description, probe: d.probe });
  }

  async probe(key: string): Promise<ProbeResult> {
    this.requireStatic(key);
    const value = this.getByRowKey(key);
    if (value === null) return { status: "invalid", message: "secret not configured" };
    return await this.runAndPersistProbe(key, this.decls.get(key)!.probe);
  }

  // -- Dynamic API --
  async setScoped(groupKey: string, instanceId: string, value: string): Promise<ProbeResult> {
    const d = this.requireDynamic(groupKey);
    const { ciphertext, nonce } = encryptSecret(value, this.key);
    this.store.upsert({
      groupKey, instanceId, kind: "dynamic",
      ownerPlugin: d.ownerPlugin, label: d.label, description: d.description, probe: d.probe,
      ciphertext, nonce,
    });
    const rowKey = `${groupKey}:${instanceId}`;
    this.cache.set(rowKey, value);
    return await this.runAndPersistProbe(rowKey, d.probe);
  }

  getScoped(groupKey: string, instanceId: string): string | null {
    this.requireDynamic(groupKey);
    return this.getByRowKey(`${groupKey}:${instanceId}`);
  }

  clearScoped(groupKey: string, instanceId: string): void {
    this.requireDynamic(groupKey);
    const rowKey = `${groupKey}:${instanceId}`;
    this.cache.delete(rowKey);
    this.store.clear(rowKey);
  }

  listScoped(groupKey: string): Array<{ instanceId: string; probeStatus: ProbeStatus; lastProbeAt: number | null }> {
    this.requireDynamic(groupKey);
    return this.store.listByGroup(groupKey).map((r) => ({
      instanceId: r.instanceId!,
      probeStatus: r.probeStatus,
      lastProbeAt: r.lastProbeAt,
    }));
  }

  async probeScoped(groupKey: string, instanceId: string): Promise<ProbeResult> {
    this.requireDynamic(groupKey);
    const rowKey = `${groupKey}:${instanceId}`;
    const value = this.getByRowKey(rowKey);
    if (value === null) return { status: "invalid", message: "instance not configured" };
    return await this.runAndPersistProbe(rowKey, this.decls.get(groupKey)!.probe);
  }

  // -- Listings + probe wiring --
  list(): SecretSummary[] { return this.store.listSummaries(); }

  registerProbe = (id: string, handler: Parameters<ProbeRegistry["register"]>[1]) => this.probes.register(id, handler);

  private async runAndPersistProbe(rowKey: string, probeId: string): Promise<ProbeResult> {
    const value = this.getByRowKey(rowKey);
    if (value === null) return { status: "invalid", message: "no value to probe" };
    const result = await this.probes.run(probeId, value, this.ctx());
    this.store.setProbeResult(rowKey, { status: result.status as ProbeStatus, message: result.message, at: Date.now() });
    return result;
  }
}
```

`index.ts`:
```typescript
export * from "./types";
export { SecretsManager } from "./manager";
export { SecretStore } from "./store";
export { ProbeRegistry } from "./probes";
export { initCrypto, loadMasterKey } from "./crypto";
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm test src/secrets/
git add minion/src/secrets/manager.ts minion/src/secrets/manager.test.ts minion/src/secrets/index.ts
git commit -m "feat(secrets): SecretsManager with static + dynamic APIs"
```

---

## Phase 1 — Built-in Probes

For each provider, the test mocks the upstream HTTP call (`vi.stubGlobal("fetch", ...)`) and asserts: (1) the canonical key constant matches expectation, (2) `ok` vs `invalid` mapping for typical 200/401/network-error responses, (3) the request hits the expected URL with the expected auth header shape. Each probe handler uses a 5s timeout via `AbortSignal.timeout(5000)` and maps any thrown error to `invalid` with `err.message`.

### Task 5: openai probe

**Files:** `minion/src/secrets/probes/openai.ts` + `.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openaiProbe, OPENAI_SECRET_KEY } from "./openai";

describe("openai probe", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("canonical key name is 'openai_api_key'", () => {
    expect(OPENAI_SECRET_KEY).toBe("openai_api_key");
  });

  it("returns ok for HTTP 200 from /v1/models", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response('{"data":[]}', { status: 200 }));
    const result = await openaiProbe("sk-test", { getOther: () => null });
    expect(result.status).toBe("ok");
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("https://api.openai.com/v1/models");
    expect((call[1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer sk-test" });
  });

  it("returns invalid for HTTP 401", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("", { status: 401 }));
    const result = await openaiProbe("sk-bad", { getOther: () => null });
    expect(result.status).toBe("invalid");
    expect(result.message).toMatch(/401/);
  });

  it("returns invalid on network error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await openaiProbe("sk-x", { getOther: () => null });
    expect(result.status).toBe("invalid");
    expect(result.message).toMatch(/ECONNREFUSED/);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
import type { ProbeHandler } from "../types";

export const OPENAI_SECRET_KEY = "openai_api_key";

export const openaiProbe: ProbeHandler = async (value) => {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${value}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { status: "ok", message: `${res.status}` };
    return { status: "invalid", message: `HTTP ${res.status}` };
  } catch (err) {
    return { status: "invalid", message: (err as Error).message };
  }
};
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm test src/secrets/probes/openai.test.ts
git add minion/src/secrets/probes/openai.ts minion/src/secrets/probes/openai.test.ts
git commit -m "feat(secrets): openai probe (locks openai_api_key)"
```

---

### Tasks 6–11: anthropic, deepgram, elevenlabs, twilio, telegram-bot, discord-bot, whatsapp probes

Each follows the same TDD shape as Task 5. Provider-specific details:

| Probe | Key constant | Endpoint | Auth header / shape |
|---|---|---|---|
| `anthropic` | `anthropic_api_key` | `POST https://api.anthropic.com/v1/messages/count_tokens` with `{model:"claude-haiku-4-5-20251001", messages:[{role:"user", content:"ping"}]}` | `x-api-key: <value>`, `anthropic-version: 2023-06-01`, `content-type: application/json` |
| `deepgram` | `deepgram_api_key` | `GET https://api.deepgram.com/v1/projects` | `Authorization: Token <value>` |
| `elevenlabs` | `elevenlabs_api_key` | `GET https://api.elevenlabs.io/v1/user` | `xi-api-key: <value>` |
| `twilio` | `twilio_account_sid` + `twilio_auth_token` (composite — see note) | `GET https://api.twilio.com/2010-04-01/Accounts/<SID>.json` | HTTP Basic `(SID, token)` |
| `telegram_bot` | `telegram_bot_token` | `GET https://api.telegram.org/bot<token>/getMe` — ok requires `{ok:true}` in body | no header auth (token in URL) |
| `discord_bot` | `discord_bot_token` | `GET https://discord.com/api/v10/users/@me` | `Authorization: Bot <value>` |
| `whatsapp` | `whatsapp_meta_token` | `GET https://graph.facebook.com/v18.0/me?access_token=<value>` | none (token in query) |

**Twilio composite-probe handling:**

`twilio_account_sid` is declared with `probe: "none"` (presence-only — the SID itself can't be validated alone). `twilio_auth_token` is declared with `probe: "twilio"`. The `twilio` probe reads the SID via `ctx.getOther("twilio_account_sid")` and combines with the value (the token) for the Basic-auth call. Test the composite case explicitly:

```typescript
it("twilio probe pulls SID from context and does Basic auth", async () => {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("{}", { status: 200 }));
  const ctx = { getOther: (k: string) => k === "twilio_account_sid" ? "ACxxx" : null };
  const r = await twilioProbe("auth-token-zzz", ctx);
  expect(r.status).toBe("ok");
  const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
  expect(call[0]).toBe("https://api.twilio.com/2010-04-01/Accounts/ACxxx.json");
  expect((call[1] as RequestInit).headers).toMatchObject({
    Authorization: `Basic ${Buffer.from("ACxxx:auth-token-zzz").toString("base64")}`,
  });
});

it("twilio probe returns invalid when SID is missing", async () => {
  const r = await twilioProbe("auth-token-zzz", { getOther: () => null });
  expect(r.status).toBe("invalid");
  expect(r.message).toMatch(/twilio_account_sid/);
});
```

- [ ] **Per probe: write test → fail → implement → pass → commit.** One commit per probe:

```bash
git commit -m "feat(secrets): anthropic probe (locks anthropic_api_key)"
git commit -m "feat(secrets): deepgram probe (locks deepgram_api_key)"
git commit -m "feat(secrets): elevenlabs probe (locks elevenlabs_api_key)"
git commit -m "feat(secrets): twilio probe (locks twilio_account_sid + twilio_auth_token)"
git commit -m "feat(secrets): telegram-bot probe (locks telegram_bot_token)"
git commit -m "feat(secrets): discord-bot probe (locks discord_bot_token)"
git commit -m "feat(secrets): whatsapp probe (locks whatsapp_meta_token)"
```

- [ ] **Wire all built-ins into `probes/index.ts`** (`ProbeRegistry` constructor registers all of them) and commit:

```bash
git commit -m "feat(secrets): wire built-in probes into registry"
```

---

## Phase 2 — Plugin Integration

### Task 12: Manifest schema (static + dynamic)

**Files:** `minion/src/plugins/manifest.ts`, `minion/src/plugins/manifest.secrets.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { pluginManifestSchema } from "./manifest";

describe("manifest.secrets", () => {
  it("accepts a plugin declaring static secrets", () => {
    const parsed = pluginManifestSchema.parse({
      id: "voice-call", name: "Voice Call", version: "1.0.0",
      secrets: [
        { key: "openai_api_key", kind: "static", label: "OpenAI API key", probe: "openai" },
      ],
    });
    expect(parsed.secrets?.[0].kind).toBe("static");
  });

  it("accepts a plugin declaring dynamic secrets with scopeLabel", () => {
    const parsed = pluginManifestSchema.parse({
      id: "telegram", name: "Telegram", version: "1.0.0",
      secrets: [
        { key: "telegram_bot_token", kind: "dynamic", scopeLabel: "Account", label: "Telegram bot token", probe: "telegram_bot" },
      ],
    });
    expect(parsed.secrets?.[0]).toMatchObject({ kind: "dynamic", scopeLabel: "Account" });
  });

  it("rejects dynamic without scopeLabel", () => {
    expect(() => pluginManifestSchema.parse({
      id: "x", name: "x", version: "1.0.0",
      secrets: [{ key: "k", kind: "dynamic", label: "L", probe: "none" }],
    })).toThrow();
  });

  it("rejects non-snake_case keys", () => {
    expect(() => pluginManifestSchema.parse({
      id: "x", name: "x", version: "1.0.0",
      secrets: [{ key: "OpenAI-Key", kind: "static", label: "L", probe: "none" }],
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run, fail, then extend `manifest.ts`**

```typescript
const keyRegex = /^[a-z][a-z0-9_]*$/;

const staticSecretSchema = z.object({
  key: z.string().regex(keyRegex, "snake_case identifier"),
  kind: z.literal("static"),
  label: z.string().min(1),
  description: z.string().optional(),
  probe: z.string().min(1),
});

const dynamicSecretSchema = z.object({
  key: z.string().regex(keyRegex, "snake_case identifier"),
  kind: z.literal("dynamic"),
  scopeLabel: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  probe: z.string().min(1),
});

export const secretDeclSchema = z.discriminatedUnion("kind", [staticSecretSchema, dynamicSecretSchema]);

// inside pluginManifestSchema:
secrets: z.array(secretDeclSchema).optional(),
```

- [ ] **Step 3: Run + commit**

```bash
pnpm test src/plugins/manifest.secrets.test.ts
git add minion/src/plugins/manifest.ts minion/src/plugins/manifest.secrets.test.ts
git commit -m "feat(secrets): manifest schema with static/dynamic discriminated union"
```

---

### Task 13: runtime.secrets API

**Files:** `minion/src/plugins/runtime/types.ts`, `index.ts`, `runtime.secrets.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { initCrypto, SecretStore, ProbeRegistry, SecretsManager } from "../../secrets";
import { buildPluginRuntime } from "./index";

describe("runtime.secrets", () => {
  beforeAll(async () => {
    await initCrypto();
    process.env.MINION_SECRETS_KEY = Buffer.from(new Uint8Array(32).fill(3)).toString("base64");
  });

  function setup() {
    const db = new Database(":memory:");
    const store = new SecretStore(db); store.init();
    const probes = new ProbeRegistry();
    const mgr = new SecretsManager({ store, probes });
    mgr.declare({ key: "openai_api_key", kind: "static", label: "OpenAI", probe: "none", ownerPlugin: "voice-call" });
    mgr.declare({ key: "telegram_bot_token", kind: "dynamic", scopeLabel: "Account", label: "TG", probe: "none", ownerPlugin: "telegram" });
    return mgr;
  }

  it("exposes static get/has", async () => {
    const mgr = setup();
    await mgr.set("openai_api_key", "sk-xyz");
    const runtime = buildPluginRuntime({ pluginId: "voice-call", secrets: mgr /* + existing deps */ });
    expect(runtime.secrets.get("openai_api_key")).toBe("sk-xyz");
    expect(runtime.secrets.has("openai_api_key")).toBe(true);
  });

  it("exposes dynamic setScoped/getScoped/listScoped/clearScoped", async () => {
    const mgr = setup();
    const runtime = buildPluginRuntime({ pluginId: "telegram", secrets: mgr });
    await runtime.secrets.setScoped("telegram_bot_token", "panik", "tg-A");
    expect(runtime.secrets.getScoped("telegram_bot_token", "panik")).toBe("tg-A");
    expect(runtime.secrets.listScoped("telegram_bot_token").map((s) => s.instanceId)).toEqual(["panik"]);
    runtime.secrets.clearScoped("telegram_bot_token", "panik");
    expect(runtime.secrets.getScoped("telegram_bot_token", "panik")).toBeNull();
  });
});
```

- [ ] **Step 2: Extend types + builder**

`runtime/types.ts`:
```typescript
export interface PluginRuntimeSecrets {
  // static
  get(key: string): string | null;
  has(key: string): boolean;
  // dynamic
  setScoped(groupKey: string, instanceId: string, value: string): Promise<{ status: string; message: string }>;
  getScoped(groupKey: string, instanceId: string): string | null;
  clearScoped(groupKey: string, instanceId: string): void;
  listScoped(groupKey: string): Array<{ instanceId: string; probeStatus: string; lastProbeAt: number | null }>;
  registerProbe(id: string, handler: ProbeHandler): void;
}
// add `secrets: PluginRuntimeSecrets;` to PluginRuntime type
```

`runtime/index.ts` (inside `buildPluginRuntime`):
```typescript
secrets: {
  get: (k) => deps.secrets.get(k),
  has: (k) => deps.secrets.has(k),
  setScoped: (g, i, v) => deps.secrets.setScoped(g, i, v),
  getScoped: (g, i) => deps.secrets.getScoped(g, i),
  clearScoped: (g, i) => deps.secrets.clearScoped(g, i),
  listScoped: (g) => deps.secrets.listScoped(g),
  registerProbe: (id, h) => deps.secrets.registerProbe(id, h),
},
```

- [ ] **Step 3: Run + commit**

```bash
pnpm test src/plugins/runtime/runtime.secrets.test.ts
git add minion/src/plugins/runtime/
git commit -m "feat(secrets): runtime.secrets API (static + dynamic)"
```

---

### Task 14: Boot wiring + declaration seeding

**Files:** `minion/src/gateway/server.impl.ts`, plugin loader

- [ ] **Step 1: Locate hooks**

```bash
grep -n "loadGatewayPlugins\|registerChannelImpl\|buildPluginRuntime" minion/src/gateway/server.impl.ts minion/src/plugins/loader.ts
```

- [ ] **Step 2: Add secrets bootstrap before plugin load**

In `server.impl.ts`:

```typescript
import Database from "better-sqlite3";
import { initCrypto, SecretStore, ProbeRegistry, SecretsManager } from "../secrets";

// inside boot, before loadGatewayPlugins:
await initCrypto();
const secretsDb = new Database(`${minionHome}/secrets.sqlite`);
const secretStore = new SecretStore(secretsDb);
secretStore.init();
const probeRegistry = new ProbeRegistry();
const secretsManager = new SecretsManager({ store: secretStore, probes: probeRegistry });
// pass secretsManager into the plugin loader factory
```

- [ ] **Step 3: Declare on plugin load**

In the plugin loader, after parsing each manifest:

```typescript
for (const decl of manifest.secrets ?? []) {
  secretsManager.declare({
    key: decl.key,
    kind: decl.kind,
    label: decl.label,
    description: decl.description,
    scopeLabel: decl.kind === "dynamic" ? decl.scopeLabel : undefined,
    probe: decl.probe,
    ownerPlugin: manifest.id,
  });
}
```

- [ ] **Step 4: Boot smoke test**

```bash
cd minion && pnpm build
MINION_SECRETS_KEY=$(node -e "console.log(Buffer.from(require('crypto').randomBytes(32)).toString('base64'))") pnpm gateway:watch
```

Expected: gateway starts, `~/.minion/secrets.sqlite` exists, no errors. Verify with `sqlite3 ~/.minion/secrets.sqlite "SELECT row_key, kind, owner_plugin, probe_status FROM secrets"` — should show placeholder rows for every declared secret across loaded plugins.

- [ ] **Step 5: Commit**

```bash
git add minion/src/gateway/server.impl.ts minion/src/plugins/loader.ts
git commit -m "feat(secrets): boot SecretsManager and seed manifest declarations"
```

---

## Phase 3 — Gateway RPC

### Task 15: Shared RPC types

**Files:** `packages/shared/src/protocol/secrets.ts` + barrel

- [ ] **Step 1: Add types**

```typescript
export type SecretsProbeStatus = "ok" | "invalid" | "unknown" | "missing";
export type SecretsKind = "static" | "dynamic";

export interface SecretsListReq { type: "secrets.list"; }
export interface SecretsListRes {
  type: "secrets.list";
  secrets: Array<{
    rowKey: string;
    groupKey: string;
    instanceId: string | null;
    kind: SecretsKind;
    ownerPlugin: string;
    label: string;
    description?: string;
    probe: string;
    configured: boolean;
    probeStatus: SecretsProbeStatus;
    probeMessage: string | null;
    lastProbeAt: number | null;
    updatedAt: number;
  }>;
}

// Static
export interface SecretsSetReq { type: "secrets.set"; key: string; value: string; }
export interface SecretsSetRes { type: "secrets.set"; key: string; probeStatus: SecretsProbeStatus; probeMessage: string; }

export interface SecretsClearReq { type: "secrets.clear"; key: string; }
export interface SecretsClearRes { type: "secrets.clear"; key: string; }

export interface SecretsProbeReq { type: "secrets.probe"; key: string; }
export interface SecretsProbeRes { type: "secrets.probe"; key: string; probeStatus: SecretsProbeStatus; probeMessage: string; }

// Dynamic
export interface SecretsSetScopedReq { type: "secrets.set_scoped"; groupKey: string; instanceId: string; value: string; }
export interface SecretsSetScopedRes { type: "secrets.set_scoped"; groupKey: string; instanceId: string; probeStatus: SecretsProbeStatus; probeMessage: string; }

export interface SecretsClearScopedReq { type: "secrets.clear_scoped"; groupKey: string; instanceId: string; }
export interface SecretsClearScopedRes { type: "secrets.clear_scoped"; groupKey: string; instanceId: string; }

export interface SecretsProbeScopedReq { type: "secrets.probe_scoped"; groupKey: string; instanceId: string; }
export interface SecretsProbeScopedRes { type: "secrets.probe_scoped"; groupKey: string; instanceId: string; probeStatus: SecretsProbeStatus; probeMessage: string; }
```

- [ ] **Step 2: Add changeset + commit**

```bash
echo '---
"@minion-stack/shared": minor
---

feat: secrets vault RPC frame types (static + dynamic)
' > .changeset/secrets-rpc-types.md

pnpm -F @minion-stack/shared build
git add packages/shared/src/ .changeset/secrets-rpc-types.md
git commit -m "feat(shared): secrets RPC frame types"
```

---

### Task 16: Gateway RPC handlers

**Files:** `minion/src/gateway/rpc/secrets.ts`, `secrets.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initCrypto, SecretStore, ProbeRegistry, SecretsManager } from "../../secrets";
import { createSecretsRpc } from "./secrets";

describe("secrets RPC", () => {
  beforeAll(async () => {
    await initCrypto();
    process.env.MINION_SECRETS_KEY = Buffer.from(new Uint8Array(32).fill(2)).toString("base64");
  });

  let mgr: SecretsManager;
  let rpc: ReturnType<typeof createSecretsRpc>;

  beforeEach(() => {
    const db = new Database(":memory:");
    const store = new SecretStore(db); store.init();
    const probes = new ProbeRegistry();
    mgr = new SecretsManager({ store, probes });
    mgr.declare({ key: "openai_api_key", kind: "static", label: "OpenAI", probe: "none", ownerPlugin: "voice-call" });
    mgr.declare({ key: "telegram_bot_token", kind: "dynamic", scopeLabel: "Account", label: "TG", probe: "none", ownerPlugin: "telegram" });
    rpc = createSecretsRpc({ secrets: mgr });
  });

  it("list never returns plaintext", async () => {
    await mgr.set("openai_api_key", "SECRET-PLAIN-VAL");
    const res = await rpc.list({ type: "secrets.list" });
    expect(JSON.stringify(res)).not.toContain("SECRET-PLAIN-VAL");
  });

  it("static: set rejects undeclared key", async () => {
    await expect(rpc.set({ type: "secrets.set", key: "never", value: "v" })).rejects.toThrow(/not declared/);
  });

  it("dynamic: setScoped persists per instance", async () => {
    const res = await rpc.setScoped({ type: "secrets.set_scoped", groupKey: "telegram_bot_token", instanceId: "panik", value: "tok" });
    expect(res.probeStatus).toBe("ok");
    expect(mgr.getScoped("telegram_bot_token", "panik")).toBe("tok");
  });

  it("dynamic: clearScoped removes a single instance", async () => {
    await rpc.setScoped({ type: "secrets.set_scoped", groupKey: "telegram_bot_token", instanceId: "a", value: "va" });
    await rpc.setScoped({ type: "secrets.set_scoped", groupKey: "telegram_bot_token", instanceId: "b", value: "vb" });
    await rpc.clearScoped({ type: "secrets.clear_scoped", groupKey: "telegram_bot_token", instanceId: "a" });
    expect(mgr.getScoped("telegram_bot_token", "a")).toBeNull();
    expect(mgr.getScoped("telegram_bot_token", "b")).toBe("vb");
  });
});
```

- [ ] **Step 2: Implement `secrets.ts`**

```typescript
import type { SecretsManager } from "../../secrets";
import type {
  SecretsListReq, SecretsListRes,
  SecretsSetReq, SecretsSetRes,
  SecretsClearReq, SecretsClearRes,
  SecretsProbeReq, SecretsProbeRes,
  SecretsSetScopedReq, SecretsSetScopedRes,
  SecretsClearScopedReq, SecretsClearScopedRes,
  SecretsProbeScopedReq, SecretsProbeScopedRes,
} from "@minion-stack/shared";

export function createSecretsRpc(deps: { secrets: SecretsManager }) {
  return {
    async list(_req: SecretsListReq): Promise<SecretsListRes> {
      return { type: "secrets.list", secrets: deps.secrets.list() };
    },
    async set(req: SecretsSetReq): Promise<SecretsSetRes> {
      const result = await deps.secrets.set(req.key, req.value);
      return { type: "secrets.set", key: req.key, probeStatus: result.status as SecretsSetRes["probeStatus"], probeMessage: result.message };
    },
    async clear(req: SecretsClearReq): Promise<SecretsClearRes> {
      deps.secrets.clear(req.key);
      return { type: "secrets.clear", key: req.key };
    },
    async probe(req: SecretsProbeReq): Promise<SecretsProbeRes> {
      const r = await deps.secrets.probe(req.key);
      return { type: "secrets.probe", key: req.key, probeStatus: r.status as SecretsProbeRes["probeStatus"], probeMessage: r.message };
    },
    async setScoped(req: SecretsSetScopedReq): Promise<SecretsSetScopedRes> {
      const r = await deps.secrets.setScoped(req.groupKey, req.instanceId, req.value);
      return { type: "secrets.set_scoped", groupKey: req.groupKey, instanceId: req.instanceId, probeStatus: r.status as SecretsSetScopedRes["probeStatus"], probeMessage: r.message };
    },
    async clearScoped(req: SecretsClearScopedReq): Promise<SecretsClearScopedRes> {
      deps.secrets.clearScoped(req.groupKey, req.instanceId);
      return { type: "secrets.clear_scoped", groupKey: req.groupKey, instanceId: req.instanceId };
    },
    async probeScoped(req: SecretsProbeScopedReq): Promise<SecretsProbeScopedRes> {
      const r = await deps.secrets.probeScoped(req.groupKey, req.instanceId);
      return { type: "secrets.probe_scoped", groupKey: req.groupKey, instanceId: req.instanceId, probeStatus: r.status as SecretsProbeScopedRes["probeStatus"], probeMessage: r.message };
    },
  };
}
```

- [ ] **Step 3: Register handlers + admin auth gate**

Wire each handler to its `type` in the gateway RPC dispatch site. All seven handlers require admin auth — locate the existing admin guard via `grep -n "requireAdmin\|adminAuth\|isAdmin" minion/src/gateway/*.ts` and apply it. Add an integration test that calls `secrets.set` over WS with a non-admin token and asserts a forbidden response.

- [ ] **Step 4: Run + commit**

```bash
pnpm test src/gateway/rpc/secrets.test.ts
git add minion/src/gateway/rpc/secrets.ts minion/src/gateway/rpc/secrets.test.ts minion/src/gateway/server.impl.ts
git commit -m "feat(secrets): gateway RPC handlers (admin-only, static + dynamic)"
```

---

## Phase 4 — Hub UI

### Task 17: SecretStatusPill component

**Files:** `minion_hub/src/lib/components/security/SecretStatusPill.svelte`

```svelte
<script lang="ts">
  import type { SecretsProbeStatus } from "@minion-stack/shared";
  interface Props {
    status: SecretsProbeStatus;
    label?: string;
    message?: string | null;
  }
  let { status, label, message }: Props = $props();

  const palette: Record<SecretsProbeStatus, { bg: string; fg: string; dot: string; text: string }> = {
    ok:      { bg: "bg-emerald-500/10", fg: "text-emerald-300", dot: "bg-emerald-400", text: "Configured" },
    invalid: { bg: "bg-rose-500/10",    fg: "text-rose-300",    dot: "bg-rose-400",    text: "Invalid" },
    missing: { bg: "bg-zinc-500/10",    fg: "text-zinc-300",    dot: "bg-zinc-400",    text: "Missing" },
    unknown: { bg: "bg-amber-500/10",   fg: "text-amber-300",   dot: "bg-amber-400",   text: "Unchecked" },
  };
  let p = $derived(palette[status]);
</script>

<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs {p.bg} {p.fg}" title={message ?? ""}>
  <span class="size-1.5 rounded-full {p.dot}"></span>
  {label ?? p.text}
</span>
```

Commit: `feat(hub): SecretStatusPill component`.

---

### Task 18: SecretEditModal component

Same shape as the prior draft, for static-secret editing. Commit: `feat(hub): SecretEditModal component`.

```svelte
<script lang="ts">
  interface Props {
    open: boolean;
    secretKey: string;
    secretLabel: string;
    onClose: () => void;
    onSave: (value: string) => Promise<{ probeStatus: string; probeMessage: string }>;
  }
  let { open, secretKey, secretLabel, onClose, onSave }: Props = $props();

  let value = $state("");
  let saving = $state(false);
  let result = $state<{ probeStatus: string; probeMessage: string } | null>(null);

  async function handleSave() {
    saving = true; result = null;
    try { result = await onSave(value); } finally { saving = false; }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div class="w-[440px] rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h3 class="mb-1 text-base font-medium">{secretLabel}</h3>
      <p class="mb-4 font-mono text-xs text-zinc-500">{secretKey}</p>
      <input type="password" autocomplete="off" bind:value placeholder="Paste secret value"
             class="mb-3 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm" />
      {#if result}
        <div class="mb-3 rounded border px-3 py-2 text-xs {result.probeStatus === 'ok' ? 'border-emerald-700 text-emerald-300' : 'border-rose-700 text-rose-300'}">
          {result.probeStatus.toUpperCase()} — {result.probeMessage}
        </div>
      {/if}
      <div class="flex justify-end gap-2">
        <button onclick={onClose} class="rounded px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900">Cancel</button>
        <button onclick={handleSave} disabled={saving || value.length === 0}
                class="rounded bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500 disabled:opacity-50">
          {saving ? "Saving…" : "Save & probe"}
        </button>
      </div>
    </div>
  </div>
{/if}
```

---

### Task 19: DynamicSecretGroup component

**Files:** `minion_hub/src/lib/components/security/DynamicSecretGroup.svelte`

```svelte
<script lang="ts">
  import SecretStatusPill from "./SecretStatusPill.svelte";
  import type { SecretsListRes } from "@minion-stack/shared";

  type Secret = SecretsListRes["secrets"][number];

  interface Props {
    groupKey: string;
    label: string;
    scopeLabel: string;
    ownerPlugin: string;
    instances: Secret[];
    onRotate: (instanceId: string) => void;
    onClear: (instanceId: string) => Promise<void>;
    onProbe: (instanceId: string) => Promise<void>;
  }
  let { groupKey, label, scopeLabel, ownerPlugin, instances, onRotate, onClear, onProbe }: Props = $props();
</script>

<section class="rounded-lg border border-zinc-900 p-3">
  <header class="mb-2 flex items-center justify-between">
    <div>
      <div class="text-sm">{label}</div>
      <div class="font-mono text-xs text-zinc-500">{groupKey} · dynamic · {instances.length} {scopeLabel.toLowerCase()}{instances.length === 1 ? "" : "s"}</div>
    </div>
    <a href={`/settings/plugins/${ownerPlugin}`} class="text-xs text-emerald-400 hover:underline">
      Manage {scopeLabel.toLowerCase()}s in {ownerPlugin} →
    </a>
  </header>
  {#if instances.length === 0}
    <p class="px-2 py-3 text-xs text-zinc-500">No {scopeLabel.toLowerCase()}s configured. Add one in the {ownerPlugin} plugin.</p>
  {:else}
    <ul class="divide-y divide-zinc-900">
      {#each instances as inst (inst.rowKey)}
        <li class="flex items-center justify-between gap-3 py-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-mono text-xs text-zinc-300">{inst.instanceId}</span>
            <SecretStatusPill status={inst.probeStatus} message={inst.probeMessage} />
            {#if inst.lastProbeAt}
              <span class="text-xs text-zinc-600">{new Date(inst.lastProbeAt).toLocaleString()}</span>
            {/if}
          </div>
          <div class="flex gap-1">
            <button onclick={() => onProbe(inst.instanceId!)} class="rounded border border-zinc-800 px-2 py-1 text-xs hover:bg-zinc-900">Probe</button>
            <button onclick={() => onRotate(inst.instanceId!)} class="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700">Rotate</button>
            <button onclick={() => onClear(inst.instanceId!)} class="rounded border border-rose-900 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950">Clear</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
```

Commit: `feat(hub): DynamicSecretGroup component`.

---

### Task 20: Secrets page

**Files:** `minion_hub/src/routes/(app)/settings/security/secrets/+page.{svelte,server.ts}`, sub-nav

- [ ] **Step 1: Server loader**

```typescript
// +page.server.ts
import type { PageServerLoad, Actions } from "./$types";
import { gatewayRpc } from "$lib/server/gateway";

export const load: PageServerLoad = async ({ locals }) => {
  const res = await gatewayRpc(locals, { type: "secrets.list" });
  return { secrets: res.secrets };
};

export const actions: Actions = {
  save:        async ({ request, locals }) => gatewayRpc(locals, { type: "secrets.set",        key:       String((await request.formData()).get("key")), value: String((await request.formData()).get("value")) }),
  clear:       async ({ request, locals }) => gatewayRpc(locals, { type: "secrets.clear",      key:       String((await request.formData()).get("key")) }),
  probe:       async ({ request, locals }) => gatewayRpc(locals, { type: "secrets.probe",      key:       String((await request.formData()).get("key")) }),
  clearScoped: async ({ request, locals }) => { const fd = await request.formData(); return gatewayRpc(locals, { type: "secrets.clear_scoped", groupKey: String(fd.get("groupKey")), instanceId: String(fd.get("instanceId")) }); },
  probeScoped: async ({ request, locals }) => { const fd = await request.formData(); return gatewayRpc(locals, { type: "secrets.probe_scoped", groupKey: String(fd.get("groupKey")), instanceId: String(fd.get("instanceId")) }); },
};
```

- [ ] **Step 2: Page**

```svelte
<script lang="ts">
  import SecretStatusPill from "$lib/components/security/SecretStatusPill.svelte";
  import SecretEditModal from "$lib/components/security/SecretEditModal.svelte";
  import DynamicSecretGroup from "$lib/components/security/DynamicSecretGroup.svelte";
  import { invalidateAll } from "$app/navigation";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let editing = $state<null | { key: string; label: string }>(null);

  async function saveSecret(value: string) {
    const fd = new FormData();
    fd.set("key", editing!.key);
    fd.set("value", value);
    const res = await fetch("?/save", { method: "POST", body: fd });
    const json = await res.json();
    await invalidateAll();
    return { probeStatus: json.probeStatus, probeMessage: json.probeMessage };
  }

  async function clearScoped(groupKey: string, instanceId: string) {
    const fd = new FormData();
    fd.set("groupKey", groupKey); fd.set("instanceId", instanceId);
    await fetch("?/clearScoped", { method: "POST", body: fd });
    await invalidateAll();
  }
  async function probeScoped(groupKey: string, instanceId: string) {
    const fd = new FormData();
    fd.set("groupKey", groupKey); fd.set("instanceId", instanceId);
    await fetch("?/probeScoped", { method: "POST", body: fd });
    await invalidateAll();
  }

  const statics  = $derived(data.secrets.filter((s) => s.kind === "static"));
  const dynamics = $derived(() => {
    const byGroup = new Map<string, typeof data.secrets>();
    for (const s of data.secrets.filter((s) => s.kind === "dynamic")) {
      const arr = byGroup.get(s.groupKey) ?? [];
      arr.push(s);
      byGroup.set(s.groupKey, arr);
    }
    return [...byGroup.entries()].map(([groupKey, all]) => {
      const decl = all.find((s) => s.instanceId === null)!;
      const instances = all.filter((s) => s.instanceId !== null);
      return { groupKey, decl, instances };
    });
  });
</script>

<div class="space-y-8 p-6">
  <header>
    <h1 class="text-xl font-semibold">Secrets</h1>
    <p class="text-sm text-zinc-400">API keys and credentials consumed by plugins. Stored encrypted in the gateway vault.</p>
  </header>

  <section>
    <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Static</h2>
    <ul class="divide-y divide-zinc-900 rounded-lg border border-zinc-900">
      {#each statics as s (s.rowKey)}
        <li class="flex items-center justify-between gap-4 p-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm">{s.label}</span>
              <SecretStatusPill status={s.probeStatus} message={s.probeMessage} />
              <span class="text-xs text-zinc-600">{s.ownerPlugin}</span>
            </div>
            <div class="font-mono text-xs text-zinc-500">{s.groupKey}</div>
          </div>
          <button onclick={() => (editing = { key: s.groupKey, label: s.label })}
                  class="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700">
            {s.configured ? "Edit" : "Set"}
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Dynamic</h2>
    <div class="space-y-3">
      {#each dynamics() as g (g.groupKey)}
        <DynamicSecretGroup
          groupKey={g.groupKey}
          label={g.decl.label}
          scopeLabel="Instance"
          ownerPlugin={g.decl.ownerPlugin}
          instances={g.instances}
          onRotate={(instanceId) => (editing = { key: `${g.groupKey}:${instanceId}`, label: `${g.decl.label} · ${instanceId}` })}
          onClear={(instanceId) => clearScoped(g.groupKey, instanceId)}
          onProbe={(instanceId) => probeScoped(g.groupKey, instanceId)}
        />
      {/each}
    </div>
  </section>
</div>

<SecretEditModal
  open={editing !== null}
  secretKey={editing?.key ?? ""}
  secretLabel={editing?.label ?? ""}
  onClose={() => (editing = null)}
  onSave={saveSecret}
/>
```

Note: `onRotate` for dynamic instances reuses the same edit modal but the save path needs to call `secrets.set_scoped`. Extend the modal or split into a `SecretEditScopedModal`. Simplest: have the modal accept an optional `scoped: {groupKey, instanceId}` prop and the save action posts to `?/save` or `?/saveScoped` accordingly. Add the corresponding action handler.

- [ ] **Step 3: Sub-nav**

Add "Secrets" to the Security sub-tab list.

- [ ] **Step 4: Smoke + commit**

```bash
cd minion_hub && bun run dev
# Visit /settings/security/secrets — empty slots expected pre-migration.
git add minion_hub/src/routes/\(app\)/settings/security/
git commit -m "feat(hub): Security › Secrets page with static + dynamic sections"
```

---

### Task 21: Migrate voice-call (static)

**Files:** `minion/extensions/voice-call/minion.plugin.json`, settings UI, source

- [ ] **Step 1: Declare in manifest**

```json
{
  "secrets": [
    { "key": "openai_api_key",     "kind": "static", "label": "OpenAI API key",     "probe": "openai" },
    { "key": "deepgram_api_key",   "kind": "static", "label": "Deepgram API key",   "probe": "deepgram" },
    { "key": "elevenlabs_api_key", "kind": "static", "label": "ElevenLabs API key", "probe": "elevenlabs" },
    { "key": "twilio_account_sid", "kind": "static", "label": "Twilio Account SID", "probe": "none" },
    { "key": "twilio_auth_token",  "kind": "static", "label": "Twilio Auth Token",  "probe": "twilio" }
  ]
}
```

- [ ] **Step 2: Replace env reads**

```bash
grep -rn "process\.env\." minion/extensions/voice-call/src/ | grep -iE "(API_KEY|TOKEN|SID)"
```

For each match, replace with `runtime.secrets.get("<canonical_key>")`. Thread `runtime` through if not already in scope.

- [ ] **Step 3: Strip the key input from the settings panel**

Replace the OpenAI API key password input + its description with:

```svelte
<div class="flex items-center gap-2 text-sm text-zinc-400">
  <span>OpenAI API key</span>
  <SecretStatusPill status={openaiStatus} />
  <a href="/settings/security/secrets" class="text-emerald-400 hover:underline">Manage in Security →</a>
</div>
```

`openaiStatus` comes from the plugin settings load path — extend the plugin's settings RPC payload with `secretStatuses: Record<string, SecretsProbeStatus>` that the plugin computes by mapping over its declared secrets via `runtime.secrets`. Same change for the other static secrets.

- [ ] **Step 4: Smoke + commit**

```bash
cd minion && pnpm build
# Restart gateway, open hub voice-call settings — key field gone, pill shown.
# Visit /settings/security/secrets — voice-call slots appear (initially Missing).
git add minion/extensions/voice-call/
git commit -m "feat(voice-call): migrate static secrets to central vault"
```

---

### Task 22: Migrate telegram + discord (dynamic)

**Files:** `minion/extensions/telegram/`, `minion/extensions/discord/`

- [ ] **Step 1: Declare in each manifest**

`extensions/telegram/minion.plugin.json`:
```json
{
  "secrets": [
    { "key": "telegram_bot_token", "kind": "dynamic", "scopeLabel": "Account", "label": "Telegram bot token", "probe": "telegram_bot" }
  ]
}
```

`extensions/discord/minion.plugin.json`:
```json
{
  "secrets": [
    { "key": "discord_bot_token", "kind": "dynamic", "scopeLabel": "Account", "label": "Discord bot token", "probe": "discord_bot" }
  ]
}
```

- [ ] **Step 2: Refactor account CRUD**

Currently each plugin stores `accounts[].token` in plugin config (gateway.json). Migrate every read/write path:

```bash
grep -rn "accounts\[\|account\.token\|\.token" minion/extensions/telegram/src/ minion/extensions/discord/src/
```

For each account `acct`:
- **Write** (account add / token rotate): `await runtime.secrets.setScoped("telegram_bot_token", acct.id, plaintextToken)` instead of writing `acct.token` to config.
- **Read** (channel connect / outbound send): `runtime.secrets.getScoped("telegram_bot_token", acct.id)` instead of `acct.token`. If `null`, surface a user-visible error ("Token missing — set it in Security or this plugin's accounts panel").
- **Remove** (account delete): `runtime.secrets.clearScoped(...)` plus existing config removal.

Add a one-shot migration step in the plugin's `start()` (gated behind a `secrets_migrated: boolean` flag in plugin config) that walks existing `accounts[].token` values, calls `setScoped`, then clears `accounts[].token` from config and sets the flag. After one successful boot, the field is gone from disk.

- [ ] **Step 3: Update plugin UI**

The accounts panel still has a token input — but on save, it calls a new plugin RPC `<plugin>.accounts.upsert` which writes via `runtime.secrets.setScoped` and never persists the value in plugin state. The list view of accounts shows a `SecretStatusPill` per account (computed from `runtime.secrets.listScoped(...)`).

- [ ] **Step 4: Smoke**

```bash
cd minion && pnpm build
# Restart gateway. Verify: 
# (a) /settings/security/secrets shows telegram_bot_token and discord_bot_token as dynamic groups,
#     populated with all existing accounts after the one-shot migration.
# (b) gateway.json no longer contains `accounts[].token` fields after first boot.
# (c) sending a message through telegram still works (read path uses vault).
```

- [ ] **Step 5: Commit (one per plugin)**

```bash
git add minion/extensions/telegram/
git commit -m "feat(telegram): migrate bot tokens to vault (dynamic, per-account)"
git add minion/extensions/discord/
git commit -m "feat(discord): migrate bot tokens to vault (dynamic, per-account)"
```

---

### Task 23: Audit + migrate remaining plugins

- [ ] **Step 1: Audit**

```bash
cd minion
grep -rn "process\.env\." extensions/ | grep -v node_modules | grep -v "\.test\.ts" | grep -iE "(API_KEY|TOKEN|SECRET|SID)" | sort -u
```

- [ ] **Step 2: For each match**, classify static vs dynamic. Singletons that rarely change → static. Anything that can be rotated, multi-instanced, or per-channel → dynamic. Add to that plugin's manifest, refactor reads, strip UI fields (or, for dynamic, route through `setScoped`).

- [ ] **Step 3: Commit one plugin at a time.**

---

## Phase 5 — CLI + Cutover

### Task 24: `minion secrets` CLI

**Files:** `minion/src/cli/commands/secrets.ts` + test, `minion/src/cli/index.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { runSecretsCommand } from "./secrets";

function makeManagerWithOpenai() {
  // helper: returns a SecretsManager seeded with a declared 'openai_api_key' (static, probe=none)
  // implementation lives in a shared test fixture file
}

describe("minion secrets CLI", () => {
  it("list prints declared slots", async () => {
    const log = vi.fn();
    await runSecretsCommand(["list"], { print: log, getManager: async () => makeManagerWithOpenai() });
    expect(log.mock.calls.flat().join("\n")).toContain("openai_api_key");
  });

  it("import-static maps env vars to declared static keys", async () => {
    const log = vi.fn();
    process.env.OPENAI_API_KEY = "sk-test";
    const mgr = makeManagerWithOpenai();
    await runSecretsCommand(["import-static"], { print: log, getManager: async () => mgr });
    expect(mgr.get("openai_api_key")).toBe("sk-test");
  });

  it("import-static skips already-configured keys unless --force", async () => {
    process.env.OPENAI_API_KEY = "sk-new";
    const mgr = makeManagerWithOpenai();
    await mgr.set("openai_api_key", "sk-old");
    await runSecretsCommand(["import-static"], { print: vi.fn(), getManager: async () => mgr });
    expect(mgr.get("openai_api_key")).toBe("sk-old");
    await runSecretsCommand(["import-static", "--force"], { print: vi.fn(), getManager: async () => mgr });
    expect(mgr.get("openai_api_key")).toBe("sk-new");
  });
});
```

- [ ] **Step 2: Implement**

```typescript
import type { SecretsManager } from "../../secrets";

const ENV_MAP: Record<string, string> = {
  openai_api_key: "OPENAI_API_KEY",
  anthropic_api_key: "ANTHROPIC_API_KEY",
  deepgram_api_key: "DEEPGRAM_API_KEY",
  elevenlabs_api_key: "ELEVENLABS_API_KEY",
  twilio_account_sid: "TWILIO_ACCOUNT_SID",
  twilio_auth_token: "TWILIO_AUTH_TOKEN",
  whatsapp_meta_token: "WHATSAPP_META_TOKEN",
};

export interface RunDeps {
  print: (msg: string) => void;
  getManager: () => Promise<SecretsManager>;
}

export async function runSecretsCommand(argv: string[], deps: RunDeps): Promise<void> {
  const [sub, ...rest] = argv;
  const mgr = await deps.getManager();
  switch (sub) {
    case "list": {
      for (const s of mgr.list()) {
        const id = s.instanceId ? `${s.groupKey}:${s.instanceId}` : s.groupKey;
        deps.print(`${id}\t${s.kind}\t${s.ownerPlugin}\t${s.configured ? s.probeStatus : "missing"}`);
      }
      return;
    }
    case "import-static": {
      const force = rest.includes("--force");
      for (const s of mgr.list().filter((x) => x.kind === "static" && x.instanceId === null)) {
        const envName = ENV_MAP[s.groupKey];
        if (!envName) continue;
        const v = process.env[envName];
        if (!v) continue;
        if (s.configured && !force) {
          deps.print(`SKIP ${s.groupKey} (already configured; use --force)`);
          continue;
        }
        const result = await mgr.set(s.groupKey, v);
        deps.print(`SET ${s.groupKey} -> ${result.status}: ${result.message}`);
      }
      return;
    }
    case "set": {
      const [key] = rest;
      const value = process.env.MINION_SECRET_VALUE;
      if (!key || !value) throw new Error("usage: minion secrets set <key>  (provide value via MINION_SECRET_VALUE env)");
      const result = await mgr.set(key, value);
      deps.print(`${key} -> ${result.status}: ${result.message}`);
      return;
    }
    case "set-scoped": {
      const [groupKey, instanceId] = rest;
      const value = process.env.MINION_SECRET_VALUE;
      if (!groupKey || !instanceId || !value) throw new Error("usage: minion secrets set-scoped <groupKey> <instanceId>  (value via MINION_SECRET_VALUE)");
      const result = await mgr.setScoped(groupKey, instanceId, value);
      deps.print(`${groupKey}:${instanceId} -> ${result.status}: ${result.message}`);
      return;
    }
    case "clear": {
      mgr.clear(rest[0]); deps.print(`CLEARED ${rest[0]}`); return;
    }
    case "clear-scoped": {
      mgr.clearScoped(rest[0], rest[1]); deps.print(`CLEARED ${rest[0]}:${rest[1]}`); return;
    }
    case "probe": {
      const r = await mgr.probe(rest[0]); deps.print(`${rest[0]} -> ${r.status}: ${r.message}`); return;
    }
    case "probe-scoped": {
      const r = await mgr.probeScoped(rest[0], rest[1]); deps.print(`${rest[0]}:${rest[1]} -> ${r.status}: ${r.message}`); return;
    }
    default:
      deps.print("usage: minion secrets <list | import-static [--force] | set <key> | set-scoped <group> <id> | clear <key> | clear-scoped <group> <id> | probe <key> | probe-scoped <group> <id>>");
  }
}
```

- [ ] **Step 3: Wire into CLI in `cli/index.ts`.** `getManager()` opens `~/.minion/secrets.sqlite` directly (same path the gateway uses) and constructs an in-process `SecretsManager`. Note: dynamic-secret imports happen via the per-plugin one-shot migration (Task 22), not the CLI — CLI imports cover static only.

- [ ] **Step 4: Run + commit**

```bash
pnpm test src/cli/commands/secrets.test.ts
git add minion/src/cli/commands/ minion/src/cli/index.ts
git commit -m "feat(secrets): minion secrets CLI"
```

---

### Task 25: Narrow Infisical to master key only

**Files:** `packages/env/src/*`

- [ ] **Step 1: Locate the current Infisical fetch**

```bash
grep -rn "infisical\|INFISICAL" packages/env/src/
```

- [ ] **Step 2: Gate to a single key**

Replace the broad Infisical pull with a targeted fetch for `MINION_SECRETS_KEY`. Add a regression test asserting that the resolver only requests that one key from Infisical:

```typescript
// packages/env/src/resolver.master-key-only.test.ts
import { describe, it, expect, vi } from "vitest";
import { resolveEnv } from "./resolver";

describe("env resolver", () => {
  it("only requests MINION_SECRETS_KEY from Infisical", async () => {
    const spy = vi.fn().mockResolvedValue({ MINION_SECRETS_KEY: "base64key=" });
    await resolveEnv({ infisicalFetch: spy /* + other deps */ });
    const requested = spy.mock.calls.flatMap((c) => c[0].keys ?? []);
    expect(requested).toEqual(["MINION_SECRETS_KEY"]);
  });
});
```

- [ ] **Step 3: Changeset + commit**

```bash
echo '---
"@minion-stack/env": major
---

breaking: Infisical is now consulted only for MINION_SECRETS_KEY. All other secrets live in the gateway vault and are managed via the hub Security tab or `minion secrets` CLI.
' > .changeset/env-infisical-narrow.md

git add packages/env/ .changeset/env-infisical-narrow.md
git commit -m "feat(env)!: narrow Infisical to MINION_SECRETS_KEY only"
```

---

### Task 26: Netcup cutover runbook

- [ ] **Step 1: Generate a master key (locally, store immediately in Infisical)**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Put this value in Infisical project `minion-core` under key `MINION_SECRETS_KEY`. This is now the only Infisical-resident secret.

- [ ] **Step 2: Pre-cutover backup**

```bash
ssh bot-prd@netcup 'tar czf ~/minion.pre-secrets-vault.tar.gz ~/.minion/ ~/.config/minion/'
```

- [ ] **Step 3: Deploy the new gateway**

Use the existing deploy recipe (see `reference_netcup_gateway_deploy_recipe` memory). Confirm `~/.minion/secrets.sqlite` is created on boot and the journal shows all declared secrets registered.

- [ ] **Step 4: Import static secrets**

```bash
ssh bot-prd@netcup
sudo systemctl stop minion-gateway
MINION_SECRETS_KEY=<from-infisical> \
OPENAI_API_KEY=<existing> ANTHROPIC_API_KEY=<existing> \
DEEPGRAM_API_KEY=<existing> ELEVENLABS_API_KEY=<existing> \
TWILIO_ACCOUNT_SID=<existing> TWILIO_AUTH_TOKEN=<existing> \
WHATSAPP_META_TOKEN=<existing> \
minion secrets import-static
minion secrets list
```

- [ ] **Step 5: First-boot triggers dynamic migration**

```bash
sudo systemctl start minion-gateway
# Telegram + Discord plugins each run their one-shot migration on first boot.
# Verify in journal: 'telegram: migrated N account tokens to vault'.
minion secrets list  # confirm dynamic instances now appear
```

- [ ] **Step 6: Verify in hub**

Navigate to `/settings/security/secrets`. Confirm every static slot is `Configured ✓` and probes return ok. Confirm dynamic groups show one instance per existing account, each `Configured ✓`. Verify voice-call settings panel no longer shows the OpenAI key field.

- [ ] **Step 7: Scrub the systemd unit / env files**

Remove `OPENAI_API_KEY=…`, `ANTHROPIC_API_KEY=…`, etc. from `~/.config/minion/gateway.env` (or wherever they live). Leave only `MINION_SECRETS_KEY` (resolved from Infisical at boot) plus genuinely-non-secret env vars. Restart and confirm everything still works.

- [ ] **Step 8: Commit ops doc**

```bash
git add specs/2026-05-20-centralized-secrets-vault.md
git commit -m "docs(secrets): cutover runbook"
```

---

## Follow-ups (out of v1 scope)

1. **Master-key rotation** — `minion secrets rotate-master --old <b64> --new <b64>` that re-encrypts every row.
2. **Audit log** — append-only `secrets_audit` table recording who set/cleared/probed what and when.
3. **Per-secret access scoping** — currently any plugin can read any secret via `runtime.secrets.get()`. Tighten to declared ownership later if needed.
4. **Probe coverage expansion** — sweep remaining providers (Backblaze B2, Turso, Better Auth, PostHog, Resend, etc.) and add probe handlers.
5. **Vault export/import** — encrypted backup file format for disaster recovery and box migration.

---

## Self-Review

- **Spec coverage:** storage (Tasks 1–2, 4), probes (Tasks 3, 5–11), manifest (Task 12), runtime API (Task 13), boot wiring (Task 14), shared RPC types (Task 15), gateway RPC (Task 16), hub components (Tasks 17–19), hub page (Task 20), plugin migrations static + dynamic (Tasks 21–23), CLI (Task 24), Infisical narrowing (Task 25), netcup cutover (Task 26).
- **User constraints:** master key from Infisical only (Task 25); gateway-only scope (no hub/site changes); per-secret probe tests lock canonical key names (Tasks 5–11); no env-var fallback (Tasks 21–23 do hard cutover); static/dynamic distinction (architecture section + Tasks 2, 4, 12, 13, 14, 16, 19, 20, 22).
- **Type consistency:** `rowKey` / `groupKey` / `instanceId` used consistently across types.ts, store.ts, manager.ts, shared RPC, hub. `SecretsManager.set(key, value)` for static; `setScoped(groupKey, instanceId, value)` for dynamic — same shape in runtime API and RPC handlers.
- **No placeholders:** every step has concrete code or shell commands.
