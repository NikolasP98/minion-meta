import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

// MUST match minion_hub/src/server/auth/crypto.ts so hub + site interoperate:
//   key = scryptSync(ENCRYPTION_KEY, 'minion-hub-salt', 32)
//   ciphertext (hex) = encrypted || authTag   (16-byte tag LAST)
//   iv (hex) = 12 random bytes, stored separately
let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable must be set in production');
    }
    cachedKey = scryptSync('minion-hub-dev-key', 'minion-hub-salt', 32);
    return cachedKey;
  }
  cachedKey = scryptSync(raw, 'minion-hub-salt', 32);
  return cachedKey;
}

/** Seal plaintext → { ciphertext, iv }. ciphertext = hex(encrypted || authTag). */
export function sealSecret(plaintext: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);
  return { ciphertext: combined.toString('hex'), iv: iv.toString('hex') };
}

/** Open hex(encrypted || authTag) + hex(iv) → plaintext. Throws on auth failure. */
export function openSecret(ciphertext: string, iv: string): string {
  const combined = Buffer.from(ciphertext, 'hex');
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_BYTES);
  const authTag = combined.subarray(combined.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
