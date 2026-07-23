import { describe, expect, it } from 'vitest';
import {
  brainVectorContentFingerprint,
  brainVectorSourceScopeHash,
  canonicalizeBrainVectorSourceIds,
} from './crypto.js';

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
