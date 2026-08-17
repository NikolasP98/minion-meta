// Env matrix for the fail-closed key resolver (cryptoKeyMode / key()).
// Each case needs its own module instance — cachedKey is module-level, so a
// second case in the same import would silently reuse the first case's key.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV_KEYS = ["ENCRYPTION_KEY", "NODE_ENV", "MINION_ALLOW_DEV_CRYPTO_KEY"] as const;
type EnvKey = (typeof ENV_KEYS)[number];

let savedEnv: Record<EnvKey, string | undefined>;

beforeEach(() => {
  savedEnv = {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    NODE_ENV: process.env.NODE_ENV,
    MINION_ALLOW_DEV_CRYPTO_KEY: process.env.MINION_ALLOW_DEV_CRYPTO_KEY,
  };
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.resetModules();
  vi.restoreAllMocks();
});

function setEnv(vars: Partial<Record<EnvKey, string>>) {
  for (const k of ENV_KEYS) {
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
}

async function freshCrypto() {
  vi.resetModules();
  return import("./crypto.js");
}

describe("cryptoKeyMode / key() — fail-closed env matrix", () => {
  it("ENCRYPTION_KEY set, NODE_ENV unset → sealSecret() roundtrips (mode 'configured')", async () => {
    setEnv({ ENCRYPTION_KEY: "test-key-do-not-use-in-prod" });
    const mod = await freshCrypto();
    expect(mod.cryptoKeyMode()).toBe("configured");
    const { ciphertext, iv } = mod.sealSecret("hunter2");
    expect(mod.openSecret(ciphertext, iv)).toBe("hunter2");
  });

  it("ENCRYPTION_KEY unset, NODE_ENV unset, no opt-in → sealSecret() THROWS (proposal DoD path A)", async () => {
    setEnv({});
    const mod = await freshCrypto();
    expect(() => mod.sealSecret("x")).toThrow();
  });

  it.each(["1", "true", "TRUE", " 1 ", " true "])(
    "ENCRYPTION_KEY unset, NODE_ENV unset, MINION_ALLOW_DEV_CRYPTO_KEY=%j → roundtrips (proposal DoD path B)",
    async (optIn) => {
      setEnv({ MINION_ALLOW_DEV_CRYPTO_KEY: optIn });
      const mod = await freshCrypto();
      expect(mod.cryptoKeyMode()).toBe("dev-fallback");
      const { ciphertext, iv } = mod.sealSecret("hunter2");
      expect(mod.openSecret(ciphertext, iv)).toBe("hunter2");
    },
  );

  it.each(["0", "false", "no", "", "  "])(
    "ENCRYPTION_KEY unset, NODE_ENV unset, MINION_ALLOW_DEV_CRYPTO_KEY=%j → THROWS (strict allowlist, not truthiness)",
    async (optIn) => {
      setEnv({ MINION_ALLOW_DEV_CRYPTO_KEY: optIn });
      const mod = await freshCrypto();
      expect(() => mod.sealSecret("x")).toThrow();
    },
  );

  it("ENCRYPTION_KEY unset, NODE_ENV=production, no opt-in → throws the UNCHANGED prod message", async () => {
    setEnv({ NODE_ENV: "production" });
    const mod = await freshCrypto();
    expect(() => mod.sealSecret("x")).toThrow(
      "ENCRYPTION_KEY environment variable must be set in production",
    );
  });

  it("ENCRYPTION_KEY unset, NODE_ENV=production, MINION_ALLOW_DEV_CRYPTO_KEY=1 → STILL THROWS the prod message", async () => {
    setEnv({ NODE_ENV: "production", MINION_ALLOW_DEV_CRYPTO_KEY: "1" });
    const mod = await freshCrypto();
    // The opt-in must not even be consulted under production.
    expect(() => mod.sealSecret("x")).toThrow(
      "ENCRYPTION_KEY environment variable must be set in production",
    );
  });

  it("openSecret() throws under the same no-key conditions as sealSecret()", async () => {
    setEnv({});
    const mod = await freshCrypto();
    expect(() => mod.openSecret("aa", "bb")).toThrow();
  });

  it("the thrown message contains neither 'minion-hub-dev-key' nor any plaintext argument", async () => {
    setEnv({});
    const mod = await freshCrypto();
    try {
      mod.sealSecret("super-secret-plaintext");
      expect.unreachable("sealSecret should have thrown");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain("minion-hub-dev-key");
      expect(message).not.toContain("super-secret-plaintext");
    }
  });

  it("dev-fallback path emits exactly ONE console.warn across two seals", async () => {
    setEnv({ MINION_ALLOW_DEV_CRYPTO_KEY: "1" });
    const mod = await freshCrypto();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mod.sealSecret("first");
    mod.sealSecret("second");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("ciphertext produced with ENCRYPTION_KEY=X opens with ENCRYPTION_KEY=X after resetModules (byte-layout unchanged)", async () => {
    setEnv({ ENCRYPTION_KEY: "layout-anchor-key" });
    const mod1 = await freshCrypto();
    const { ciphertext, iv } = mod1.sealSecret("anchor-value");

    setEnv({ ENCRYPTION_KEY: "layout-anchor-key" });
    const mod2 = await freshCrypto();
    expect(mod2.openSecret(ciphertext, iv)).toBe("anchor-value");
  });
});
