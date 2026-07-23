import { describe, expect, it } from 'vitest';
import {
  bindBrainVectorSearchScopeV1,
  brainVectorContentFingerprint,
  brainVectorPointId,
  brainVectorSourceScopeHash,
  canonicalizeBrainVectorHashInputV1,
  canonicalizeBrainVectorSourceIds,
} from './crypto.js';
import {
  BRAIN_VECTOR_CONTRACT_VERSION,
  BRAIN_VECTOR_DIMENSIONS,
  type BrainVectorCapabilityHeaderV1,
  type BrainVectorSearchCapabilityV1,
} from './contract.js';

const FIXTURE_KEY = new Uint8Array(Array.from({ length: 32 }, (_, index) => index));
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/gu)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function sparseArray<T>(length: number): T[] {
  const values: T[] = [];
  values.length = length;
  return values;
}

describe('brain-vector crypto contract', () => {
  it('sorts and de-duplicates source ids using code-point order', () => {
    expect(canonicalizeBrainVectorSourceIds(['source-z', 'source-a', 'source-z'])).toEqual([
      'source-a',
      'source-z',
    ]);
  });

  it('rejects whitespace and non-ASCII source ids instead of normalizing them differently', () => {
    expect(() => canonicalizeBrainVectorSourceIds(['source-a', ' '])).toThrow(
      'source IDs must use only ASCII',
    );
    expect(() => canonicalizeBrainVectorSourceIds(['source-💡'])).toThrow(
      'source IDs must use only ASCII',
    );
    expect(() => canonicalizeBrainVectorSourceIds(sparseArray<string>(1))).toThrow(
      'source IDs must use only ASCII',
    );
  });

  it('matches the cross-repo source-scope fixture', async () => {
    await expect(
      brainVectorSourceScopeHash(['7f-source', '1a-source', '7f-source']),
    ).resolves.toBe('sha256:v1:gemxrtsXdAz07R5K44ohdNWe4xD_Otb7vHicOD_Bn3g');
  });

  it('pins canonical UTF-8 JSON bytes for Unicode and controls', () => {
    expect(
      bytesToHex(
        canonicalizeBrainVectorHashInputV1([
          'brain-vector-canonical-v1',
          'café',
          '雪',
          'line\nbreak',
          'nul\0',
          'quote"slash\\',
        ]),
      ),
    ).toBe(
      '5b22627261696e2d766563746f722d63616e6f6e6963616c2d7631222c22636166c3a9222c22e99baa222c226c696e655c6e627265616b222c226e756c5c7530303030222c2271756f74655c22736c6173685c5c225d',
    );
    expect(() => canonicalizeBrainVectorHashInputV1(['\ud800'])).toThrow(
      'well-formed Unicode',
    );
  });

  it('binds organization and source filters to the verified capability', async () => {
    const capability: BrainVectorSearchCapabilityV1 = {
      iss: 'minion-hub',
      aud: 'minion-brain-vector',
      sub: 'user-1',
      org_id: 'org-1',
      brain_id: 'brain-1',
      generation: 'openai_te3s_1536_g1',
      op: 'search',
      jti: 'capability-1',
      iat: 1,
      exp: 2,
      source_scope_mode: 'source_list',
      source_scope_hash: await brainVectorSourceScopeHash(['source-b', 'source-a']),
    };
    const request = {
      contractVersion: BRAIN_VECTOR_CONTRACT_VERSION,
      generation: capability.generation,
      vector: Array.from({ length: BRAIN_VECTOR_DIMENSIONS }, () => 0),
      limit: 20,
      filters: {
        scopeMode: 'source_list' as const,
        sourceIds: ['source-b', 'source-a', 'source-b'],
      },
    };
    await expect(bindBrainVectorSearchScopeV1(capability, request)).resolves.toEqual({
      orgId: 'org-1',
      scopeMode: 'source_list',
      sourceIds: ['source-a', 'source-b'],
    });
    await expect(
      bindBrainVectorSearchScopeV1({ ...capability, org_id: '' }, request),
    ).rejects.toThrow('org_id must be non-empty');
    await expect(
      bindBrainVectorSearchScopeV1(
        { ...capability, source_scope_hash: await brainVectorSourceScopeHash(['source-c']) },
        request,
      ),
    ).rejects.toThrow('source IDs do not match capability');
  });

  it('matches the cross-repo content-fingerprint fixture', async () => {
    await expect(
      brainVectorContentFingerprint({
        key: FIXTURE_KEY,
        chunkId: '018f87f4-e934-7a21-98b6-4f6b8d3898dd',
        contentHash: 'sha256:8f83665f2b7ac3ec',
        generation: 'openai_te3s_1536_g1',
      }),
    ).resolves.toBe('hmac-sha256:v1:huYmtzmlJ6XYRgPOuJEnCMOd3IRyOmqUKHdca3q3h6w');
  });

  it('matches the cross-repo Unicode content-fingerprint fixture', async () => {
    await expect(
      brainVectorContentFingerprint({
        key: FIXTURE_KEY,
        chunkId: 'chunk-café',
        contentHash: 'sha256:雪',
        generation: 'openai_te3s_1536_g1',
      }),
    ).resolves.toBe('hmac-sha256:v1:C5nhYkNXh55E-zXJd9iAGwIsl9XwLmWkjn_G9OtA7Xs');
  });

  it('matches the cross-repo point-id fixture', async () => {
    await expect(
      brainVectorPointId({
        orgId: 'org_01hubtest',
        chunkId: '018f87f4-e934-7a21-98b6-4f6b8d3898dd',
        generation: 'openai_te3s_1536_g1',
      }),
    ).resolves.toBe('d7cb8de1-05f3-822a-b514-aa419dca59de');
  });

  it('matches the cross-repo Unicode point-id fixture', async () => {
    await expect(
      brainVectorPointId({
        orgId: 'org-café',
        chunkId: 'chunk-雪',
        generation: 'openai_te3s_1536_g1',
      }),
    ).resolves.toBe('529ad0ae-1509-8ae7-b0d1-05fc25810bea');
  });

  it('pins the cross-repo Ed25519 capability fixture', async () => {
    const header = {
      alg: 'EdDSA',
      typ: 'JWT',
      kid: 'brain-vector-fixture-v1',
    } satisfies BrainVectorCapabilityHeaderV1;
    const payload = {
      iss: 'minion-hub',
      aud: 'minion-brain-vector',
      sub: 'user-fixture',
      org_id: 'org-fixture',
      brain_id: 'brain-fixture',
      generation: 'openai_te3s_1536_g1',
      op: 'search',
      jti: 'capability-fixture-v1',
      iat: 1784750400,
      exp: 1784750460,
      source_scope_mode: 'source_list',
      source_scope_hash: 'sha256:v1:gemxrtsXdAz07R5K44ohdNWe4xD_Otb7vHicOD_Bn3g',
    } satisfies BrainVectorSearchCapabilityV1;
    const protectedHeaderJson =
      '{"alg":"EdDSA","typ":"JWT","kid":"brain-vector-fixture-v1"}';
    const payloadJson =
      '{"iss":"minion-hub","aud":"minion-brain-vector","sub":"user-fixture","org_id":"org-fixture","brain_id":"brain-fixture","generation":"openai_te3s_1536_g1","op":"search","jti":"capability-fixture-v1","iat":1784750400,"exp":1784750460,"source_scope_mode":"source_list","source_scope_hash":"sha256:v1:gemxrtsXdAz07R5K44ohdNWe4xD_Otb7vHicOD_Bn3g"}';
    const protectedHeader =
      'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6ImJyYWluLXZlY3Rvci1maXh0dXJlLXYxIn0';
    const encodedPayload =
      'eyJpc3MiOiJtaW5pb24taHViIiwiYXVkIjoibWluaW9uLWJyYWluLXZlY3RvciIsInN1YiI6InVzZXItZml4dHVyZSIsIm9yZ19pZCI6Im9yZy1maXh0dXJlIiwiYnJhaW5faWQiOiJicmFpbi1maXh0dXJlIiwiZ2VuZXJhdGlvbiI6Im9wZW5haV90ZTNzXzE1MzZfZzEiLCJvcCI6InNlYXJjaCIsImp0aSI6ImNhcGFiaWxpdHktZml4dHVyZS12MSIsImlhdCI6MTc4NDc1MDQwMCwiZXhwIjoxNzg0NzUwNDYwLCJzb3VyY2Vfc2NvcGVfbW9kZSI6InNvdXJjZV9saXN0Iiwic291cmNlX3Njb3BlX2hhc2giOiJzaGEyNTY6djE6Z2VteHJ0c1hkQXowN1I1SzQ0b2hkTldlNHhEX090Yjd2SGljT0RfQm4zZyJ9';
    const publicKeyHex = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
    const signatureHex =
      'bec3c7ffd7e7f689aec7d3af535fff1eb17e94243846aa8478b1267648e3199df945d16b68e0a1134e64960ebdb6d2c52a913a47bfc74979f49e5fa2e3058c0e';
    const signature =
      'vsPH_9fn9omux9OvU1__HrF-lCQ4RqqEeLEmdkjjGZ35RdFraOChE05klg69ttLFKpE6R7_HSXn0nl-i4wWMDg';
    const compactToken = `${protectedHeader}.${encodedPayload}.${signature}`;

    expect(JSON.stringify(header)).toBe(protectedHeaderJson);
    expect(JSON.stringify(payload)).toBe(payloadJson);
    expect(bytesToBase64Url(encoder.encode(protectedHeaderJson))).toBe(protectedHeader);
    expect(bytesToBase64Url(encoder.encode(payloadJson))).toBe(encodedPayload);
    expect(bytesToHex(hexToBytes(publicKeyHex))).toBe(publicKeyHex);
    expect(bytesToBase64Url(hexToBytes(signatureHex))).toBe(signature);
    expect(compactToken).toBe(
      'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsImtpZCI6ImJyYWluLXZlY3Rvci1maXh0dXJlLXYxIn0.eyJpc3MiOiJtaW5pb24taHViIiwiYXVkIjoibWluaW9uLWJyYWluLXZlY3RvciIsInN1YiI6InVzZXItZml4dHVyZSIsIm9yZ19pZCI6Im9yZy1maXh0dXJlIiwiYnJhaW5faWQiOiJicmFpbi1maXh0dXJlIiwiZ2VuZXJhdGlvbiI6Im9wZW5haV90ZTNzXzE1MzZfZzEiLCJvcCI6InNlYXJjaCIsImp0aSI6ImNhcGFiaWxpdHktZml4dHVyZS12MSIsImlhdCI6MTc4NDc1MDQwMCwiZXhwIjoxNzg0NzUwNDYwLCJzb3VyY2Vfc2NvcGVfbW9kZSI6InNvdXJjZV9saXN0Iiwic291cmNlX3Njb3BlX2hhc2giOiJzaGEyNTY6djE6Z2VteHJ0c1hkQXowN1I1SzQ0b2hkTldlNHhEX090Yjd2SGljT0RfQm4zZyJ9.vsPH_9fn9omux9OvU1__HrF-lCQ4RqqEeLEmdkjjGZ35RdFraOChE05klg69ttLFKpE6R7_HSXn0nl-i4wWMDg',
    );

    const publicKey = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(hexToBytes(publicKeyHex)),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    await expect(
      crypto.subtle.verify(
        'Ed25519',
        publicKey,
        toArrayBuffer(hexToBytes(signatureHex)),
        toArrayBuffer(encoder.encode(`${protectedHeader}.${encodedPayload}`)),
      ),
    ).resolves.toBe(true);
  });

  it('rejects empty point-id inputs', async () => {
    await expect(
      brainVectorPointId({ orgId: '', chunkId: 'chunk', generation: 'generation' }),
    ).rejects.toThrow('orgId must be non-empty');
  });

  it('rejects a short fingerprint key', async () => {
    await expect(
      brainVectorContentFingerprint({
        key: new Uint8Array(16),
        chunkId: 'chunk',
        contentHash: 'hash',
        generation: 'generation',
      }),
    ).rejects.toThrow('fingerprint key must be at least 32 bytes');
  });
});
