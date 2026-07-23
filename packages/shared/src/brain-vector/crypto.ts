import {
  BRAIN_VECTOR_SOURCE_ID_PATTERN,
  isBrainVectorSearchRequestV1,
  type BrainVectorBoundSearchScopeV1,
  type BrainVectorSearchCapabilityV1,
  type BrainVectorSearchRequestV1,
} from './contract.js';

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
  if (
    Array.from(sourceIds).some(
      (sourceId) =>
        typeof sourceId !== 'string' || !BRAIN_VECTOR_SOURCE_ID_PATTERN.test(sourceId),
    )
  ) {
    throw new Error(
      'source IDs must use only ASCII letters, digits, dot, underscore, colon, or hyphen (1-128 chars)',
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

export async function bindBrainVectorSearchScopeV1(
  capability: BrainVectorSearchCapabilityV1,
  request: BrainVectorSearchRequestV1,
): Promise<BrainVectorBoundSearchScopeV1> {
  if (!isBrainVectorSearchRequestV1(request)) throw new Error('invalid brain-vector search request');
  if (typeof capability.org_id !== 'string' || capability.org_id.length === 0) {
    throw new Error('capability org_id must be non-empty');
  }
  if (capability.generation !== request.generation) {
    throw new Error('request generation does not match capability');
  }
  if (capability.source_scope_mode !== request.filters.scopeMode) {
    throw new Error('request source scope mode does not match capability');
  }
  if (request.filters.scopeMode === 'org_all') {
    if ('source_scope_hash' in capability) {
      throw new Error('org_all capability must omit source_scope_hash');
    }
    return { orgId: capability.org_id, scopeMode: 'org_all' };
  }
  if (
    capability.source_scope_mode !== 'source_list' ||
    typeof capability.source_scope_hash !== 'string'
  ) {
    throw new Error('source_list capability must include source_scope_hash');
  }
  const sourceIds = canonicalizeBrainVectorSourceIds(request.filters.sourceIds);
  if ((await brainVectorSourceScopeHash(sourceIds)) !== capability.source_scope_hash) {
    throw new Error('request source IDs do not match capability');
  }
  return { orgId: capability.org_id, scopeMode: 'source_list', sourceIds };
}

/**
 * Deterministic Qdrant point ID for one chunk in one generation.
 * Canonical input is JSON `["minion-point-id-v1", orgId, chunkId, generation]`
 * hashed with SHA-256; the first 16 bytes are formatted as a UUIDv8.
 */
export async function brainVectorPointId(input: {
  orgId: string;
  chunkId: string;
  generation: string;
}): Promise<string> {
  for (const [field, value] of [
    ['orgId', input.orgId],
    ['chunkId', input.chunkId],
    ['generation', input.generation],
  ] as const) {
    if (value.length === 0) throw new Error(`${field} must be non-empty`);
  }
  const digest = await sha256(
    canonicalJson(['minion-point-id-v1', input.orgId, input.chunkId, input.generation]),
  );
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
