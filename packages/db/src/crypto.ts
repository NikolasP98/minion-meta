// Canonical app-level secret encryption for the Minion stack (R7 of
// specs/2026-05-26-auth-token-simplification.md). AES-256-GCM, dialect-agnostic
// — consumed by the PG identity path (sealSecret/openSecret) and re-exported by
// minion_hub's crypto.ts (encrypt/decrypt/encryptToken/decryptToken) so there is
// ONE implementation and one key-derivation path instead of byte-matched copies.
//
// Key resolution fails closed: without ENCRYPTION_KEY, production always throws
// (unchanged), and every other environment throws too unless
// MINION_ALLOW_DEV_CRYPTO_KEY=1 is set explicitly — the source-visible dev key is
// never used silently. See cryptoKeyMode().
//
// Layout (MUST stay stable — existing ciphertext at rest depends on it):
//   key        = scryptSync(ENCRYPTION_KEY, 'minion-hub-salt', 32)
//   ciphertext = hex(encrypted || authTag)   (16-byte GCM tag LAST)
//   iv         = hex(12 random bytes), stored separately

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type CryptoKeyMode = "configured" | "dev-fallback";

function isDevKeyOptIn(): boolean {
  const raw = (process.env.MINION_ALLOW_DEV_CRYPTO_KEY ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}

/**
 * Resolve which key this process is entitled to use — or throw. No side
 * effects, no secrets in the message.
 */
export function cryptoKeyMode(): CryptoKeyMode {
  if (process.env.ENCRYPTION_KEY) return "configured";
  if (process.env.NODE_ENV === "production") {
    // UNCHANGED string — existing log alerting may match on it.
    throw new Error("ENCRYPTION_KEY environment variable must be set in production");
  }
  if (!isDevKeyOptIn()) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Refusing to seal or open secrets with the built-in, " +
        "source-visible development key. Set ENCRYPTION_KEY, or — for local development only — " +
        "set MINION_ALLOW_DEV_CRYPTO_KEY=1 to accept it.",
    );
  }
  return "dev-fallback";
}

/**
 * Call this ONCE at app startup so a missing key is a boot failure, not a
 * runtime surprise on the first user who connects an OAuth account. Throws the
 * same named errors as {@link cryptoKeyMode}; returns nothing on success.
 */
export function assertCryptoKeyConfigured(): void {
  cryptoKeyMode();
}

let cachedKey: Buffer | null = null;
let warnedDevFallback = false;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const mode = cryptoKeyMode();
  if (mode === "dev-fallback") {
    if (!warnedDevFallback) {
      warnedDevFallback = true;
      console.warn(
        "MINION_ALLOW_DEV_CRYPTO_KEY is set — sealing/opening secrets with the built-in, " +
          "source-visible development key. Never set this in a deployed environment.",
      );
    }
    // TODO(handoff): the at-rest audit this branch calls for (spec
    // 2026-08-17-pkg-dev-crypto-failopen-spec S2 / ⚠️ A3 — count rows already
    // sealed under this dev key, per sealed column) could NOT be run in the
    // implementing environment: no database is reachable from the meta-repo
    // checkout (no TURSO_DB_URL / SUPABASE_DB_URL / local .db file), and
    // minion_hub/minion_site are not checked out. Until it runs, treat the
    // dev-key exposure as UNKNOWN, not zero — S3 (consumer bump) must not be
    // sequenced on an assumption. Column inventory + the exact procedure:
    // proposals/2026-08-20-dev-key-at-rest-audit.md
    cachedKey = scryptSync("minion-hub-dev-key", "minion-hub-salt", 32);
    return cachedKey;
  }
  cachedKey = scryptSync(process.env.ENCRYPTION_KEY as string, "minion-hub-salt", 32);
  return cachedKey;
}

/** Seal plaintext → { ciphertext, iv }. ciphertext = hex(encrypted || authTag). */
export function sealSecret(plaintext: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);
  return { ciphertext: combined.toString("hex"), iv: iv.toString("hex") };
}

/**
 * Open hex(encrypted || authTag) + hex(iv) → plaintext. Throws on auth failure,
 * and — via key() — under the same no-key-configured conditions as sealSecret.
 */
export function openSecret(ciphertext: string, iv: string): string {
  const combined = Buffer.from(ciphertext, "hex");
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_BYTES);
  const authTag = combined.subarray(combined.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "hex"));
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

// --- minion_hub-compatible aliases -------------------------------------------
// Hub's crypto.ts historically exported these names; keeping them lets hub become
// a thin re-export of this module without touching its many call sites.

/** Alias of {@link sealSecret}. */
export const encrypt = sealSecret;

/** Alias of {@link openSecret}. */
export const decrypt = openSecret;

/** Seal a token → { encrypted, iv } (hub's field name for the ciphertext). */
export function encryptToken(token: string): { encrypted: string; iv: string } {
  const { ciphertext, iv } = sealSecret(token);
  return { encrypted: ciphertext, iv };
}

/** Open a sealed token. */
export function decryptToken(encrypted: string, iv: string): string {
  return openSecret(encrypted, iv);
}
