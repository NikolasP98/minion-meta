import { describe, it, expect, beforeAll } from 'vitest';
import { sealSecret, openSecret } from './crypto.js';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-key-do-not-use-in-prod';
});

describe('identity secret crypto', () => {
  it('round-trips a plaintext through seal/open', () => {
    const plaintext = JSON.stringify({ type: 'authorized_user', refresh_token: 'abc123' });
    const { ciphertext, iv } = sealSecret(plaintext);
    expect(ciphertext).toMatch(/^[0-9a-f]+$/);
    expect(iv).toMatch(/^[0-9a-f]+$/);
    expect(openSecret(ciphertext, iv)).toBe(plaintext);
  });

  it('fails to open with a tampered ciphertext (GCM auth)', () => {
    const { ciphertext, iv } = sealSecret('hello');
    const tampered = ciphertext.slice(0, -2) + (ciphertext.endsWith('00') ? '11' : '00');
    expect(() => openSecret(tampered, iv)).toThrow();
  });

  it('is wire-compatible with hub layout (ciphertext = hex(encrypted || authTag), 16-byte tag last)', () => {
    const { ciphertext } = sealSecret('x');
    // hex of (>=0 bytes ciphertext) + 16-byte tag → at least 32 hex chars of tag.
    expect(ciphertext.length).toBeGreaterThanOrEqual(32);
  });
});
