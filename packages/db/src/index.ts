// @minion-stack/db — main entry point
// Schema tables (all 56 table constants)
export * from './schema/index.js';
// Drizzle relational query definitions
export * from './relations.js';
// Utilities: newId(), nowMs()
export * from './utils.js';
// App-level secret sealing (AES-256-GCM) + the fail-closed key-resolution
// contract. assertCryptoKeyConfigured() is meant to run once at app startup.
export {
  sealSecret,
  openSecret,
  cryptoKeyMode,
  assertCryptoKeyConfigured,
} from './crypto.js';
export type { CryptoKeyMode } from './crypto.js';
