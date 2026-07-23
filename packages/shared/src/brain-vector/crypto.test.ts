import { describe, expect, it } from 'vitest';
import {
  bindBrainVectorSearchScopeV1,
  brainVectorContentFingerprint,
  brainVectorPointId,
  brainVectorSourceScopeHash,
  canonicalizeBrainVectorSourceIds,
} from './crypto.js';
import {
  BRAIN_VECTOR_CONTRACT_VERSION,
  BRAIN_VECTOR_DIMENSIONS,
  type BrainVectorSearchCapabilityV1,
} from './contract.js';

const FIXTURE_KEY = new Uint8Array(Array.from({ length: 32 }, (_, index) => index));

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
  });

  it('matches the cross-repo source-scope fixture', async () => {
    await expect(
      brainVectorSourceScopeHash(['7f-source', '1a-source', '7f-source']),
    ).resolves.toBe('sha256:v1:gemxrtsXdAz07R5K44ohdNWe4xD_Otb7vHicOD_Bn3g');
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

  it('matches the cross-repo point-id fixture', async () => {
    await expect(
      brainVectorPointId({
        orgId: 'org_01hubtest',
        chunkId: '018f87f4-e934-7a21-98b6-4f6b8d3898dd',
        generation: 'openai_te3s_1536_g1',
      }),
    ).resolves.toBe('d7cb8de1-05f3-822a-b514-aa419dca59de');
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
