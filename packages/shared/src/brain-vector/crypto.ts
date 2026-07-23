import { BRAIN_VECTOR_SOURCE_ID_PATTERN } from './contract.js';

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function canonicalJson(parts: readonly string[]): Uint8Array {
  return encoder.encode(JSON.stringify(parts));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256(value: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', toArrayBuffer(value)));
}

/**
 * Sorted, de-duplicated ASCII source IDs. This pinned charset makes JS code-unit,
 * Unicode code-point, and UTF-8 byte ordering identical across implementations.
 */
export function canonicalizeBrainVectorSourceIds(sourceIds: readonly string[]): string[] {
  if (sourceIds.some((sourceId) => !BRAIN_VECTOR_SOURCE_ID_PATTERN.test(sourceId))) {
    throw new Error(
      'source IDs must use only ASCII letters, digits, dot, underscore, colon, or hyphen',
    );
  }
  return [...new Set(sourceIds)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

/**
 * Bind a search capability to one exact source list.
 * Canonical input is JSON `["minion-source-scope-v1", ...sortedUniqueIds]`.
 */
export async function brainVectorSourceScopeHash(sourceIds: readonly string[]): Promise<string> {
  const canonical = canonicalizeBrainVectorSourceIds(sourceIds);
  const digest = await sha256(canonicalJson(['minion-source-scope-v1', ...canonical]));
  return `sha256:v1:${bytesToBase64Url(digest)}`;
}

/**
 * Produce the stale-index fingerprint stored in Qdrant.
 * Canonical input is JSON `["minion-content-fingerprint-v1", chunkId, contentHash, generation]`.
 */
export async function brainVectorContentFingerprint(input: {
  key: Uint8Array;
  chunkId: string;
  contentHash: string;
  generation: string;
}): Promise<string> {
  if (input.key.byteLength < 32) throw new Error('fingerprint key must be at least 32 bytes');
  for (const [field, value] of [
    ['chunkId', input.chunkId],
    ['contentHash', input.contentHash],
    ['generation', input.generation],
  ] as const) {
    if (value.length === 0) throw new Error(`${field} must be non-empty`);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(input.key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    toArrayBuffer(
      canonicalJson([
        'minion-content-fingerprint-v1',
        input.chunkId,
        input.contentHash,
        input.generation,
      ]),
    ),
  );
  return `hmac-sha256:v1:${bytesToBase64Url(new Uint8Array(signature))}`;
}
