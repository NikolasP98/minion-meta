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
    // TODO(handoff): The at-rest question this branch raises is still UNKNOWN,
    // not settled. The 2026-08-20 audit against hub's production Supabase (the
    // database hub and site share) sampled only 3 of the 8 non-null
    // user_identities.secret_ciphertext rows there — 5 rows in that same
    // production database were never test-decrypted under any key, including
    // this one. The audit's own required A1 environment inventory and named
    // unchecked-database list are also missing from its report. Do not treat
    // the sampled rows as a stand-in for the full column, and do not infer a
    // zero for any database from a partial sample —
    // proposals/2026-08-20-dev-key-at-rest-audit.md (reopened; DoD unmet).
    //
    // S3 of spec 2026-08-17-pkg-dev-crypto-failopen-spec is also still
    // UNLANDED — minion_hub and minion_site have neither the boot-time
    // assertCryptoKeyConfigured() call nor a bumped @minion-stack/db, because
    // neither repo is checked out in the meta-repo workspace (⚠️ A2). Until it
    // lands, this package's stricter contract is inert for both apps. Three
    // preconditions gate the consumer bump, and none are satisfied yet:
    //   1. Release. The published `latest` is 0.10.0 (2026-08-13), which
    //      predates this guard — there is nothing to bump TO until a dev→main
    //      release publishes the pending changeset db-crypto-fail-closed-dev-key.
    //   2. Key convergence. The same audit found hub and site carry DIFFERENT
    //      ENCRYPTION_KEY values against that shared database, so S3 step 1's
    //      "one key per shared-DB group" is not a plain env change; it needs the
    //      key-id/legacy-ring migration owned by
    //      specs/2026-08-28-shared-db-encryption-key-convergence-spec.md (its
    //      S3b carries the consumer boot wiring this slice describes).
    //   3. Complete the at-rest audit above — every encrypted row in the shared
    //      production database classified success/failure under the dev key,
    //      plus the A1 inventory and unchecked-database list.
    // Do NOT run `pnpm update @minion-stack/db` in either consumer before all
    // three are resolved — the bump PR is the real deploy of this fix.
    // Ledger entry: proposals/2026-08-17-pkg-dev-crypto-failopen.md
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
