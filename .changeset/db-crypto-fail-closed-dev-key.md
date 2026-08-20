---
"@minion-stack/db": minor
---

Fail closed on the built-in development encryption key. Previously, any process where `NODE_ENV` was not literally `production` silently sealed and opened secrets under `minion-hub-dev-key` — a key that ships inside this public package's `src/` and is therefore plaintext-equivalent for anything sealed with it.

**What now throws.** `sealSecret()` / `openSecret()` (and their hub-compatible aliases `encrypt` / `decrypt` / `encryptToken` / `decryptToken`) throw a named error when `ENCRYPTION_KEY` is unset, in every environment.

**The two ways to fix it.** Set `ENCRYPTION_KEY` — the right answer for any deployed environment, including staging, preview and CI. Or, **for local development only**, set `MINION_ALLOW_DEV_CRYPTO_KEY=1` to accept the built-in dev key explicitly; that path also emits one `console.warn` per process naming the variable that enabled it. The opt-in is parsed as a strict allowlist (`1` / `true`, trimmed, case-insensitive) — `MINION_ALLOW_DEV_CRYPTO_KEY=false` is off, not on. Never set the opt-in in a deployed environment.

**Production behavior is unchanged**, including the exact error string `ENCRYPTION_KEY environment variable must be set in production`. Under `NODE_ENV=production` the opt-in is refused unconditionally: it is never consulted, so it cannot downgrade production crypto.

**The ciphertext byte layout is unchanged** — same scrypt derivation, same `minion-hub-salt`, same `hex(encrypted || authTag)` with a 12-byte IV. Every existing row stays readable under the key that wrote it. Note the corollary: rows written under the *old* silent fallback are readable only with `MINION_ALLOW_DEV_CRYPTO_KEY=1` and `ENCRYPTION_KEY` unset — setting a real key makes them fail GCM authentication. Key rotation is deliberately out of scope; audit before you upgrade a consumer that reads such a database.

**New exports** on `.`, `./crypto` and `./pg`: `cryptoKeyMode()` (returns `'configured' | 'dev-fallback'`, or throws) and `assertCryptoKeyConfigured()` — call the latter once at server startup so a missing key is a boot failure rather than a 500 on the first user who connects an OAuth account. `sealSecret` / `openSecret` are now also re-exported from the package root.
