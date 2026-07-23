import { describe, expect, it } from 'vitest';
import {
  BRAIN_VECTOR_CONTRACT_VERSION,
  BRAIN_VECTOR_DIMENSIONS,
  brainVectorCollectionName,
  isBrainVectorSearchRequestV1,
} from './contract.js';

function validRequest() {
  return {
    contractVersion: BRAIN_VECTOR_CONTRACT_VERSION,
    generation: 'openai_te3s_1536_g1',
    vector: Array.from({ length: BRAIN_VECTOR_DIMENSIONS }, () => 0),
    limit: 20,
    filters: { scopeMode: 'source_list' as const, sourceIds: ['source-a'] },
  };
}

describe('brain-vector contract', () => {
  it('accepts a bounded v1 request', () => {
    expect(isBrainVectorSearchRequestV1(validRequest())).toBe(true);
  });

  it('rejects a wrong-dimension vector', () => {
    expect(isBrainVectorSearchRequestV1({ ...validRequest(), vector: [0] })).toBe(false);
  });

  it('rejects non-finite vector values', () => {
    const request = validRequest();
    request.vector[0] = Number.NaN;
    expect(isBrainVectorSearchRequestV1(request)).toBe(false);
  });

  it.each([0, 201, 1.5])('rejects an invalid limit of %s', (limit) => {
    expect(isBrainVectorSearchRequestV1({ ...validRequest(), limit })).toBe(false);
  });

  it('rejects empty, invalid, or excessive source-list scopes', () => {
    const request = validRequest();
    expect(
      isBrainVectorSearchRequestV1({ ...request, filters: { ...request.filters, sourceIds: [] } }),
    ).toBe(false);
    expect(
      isBrainVectorSearchRequestV1({ ...request, filters: { ...request.filters, sourceIds: [' '] } }),
    ).toBe(false);
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: {
          ...request.filters,
          sourceIds: Array.from({ length: 513 }, (_, index) => `source-${index}`),
        },
      }),
    ).toBe(false);
  });

  it('accepts org_all only when source ids are omitted', () => {
    const request = validRequest();
    expect(
      isBrainVectorSearchRequestV1({ ...request, filters: { scopeMode: 'org_all' } }),
    ).toBe(true);
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: { scopeMode: 'org_all', sourceIds: [] },
      }),
    ).toBe(false);
  });

  it('matches the cross-repo collection-name fixture and rejects unsafe generations', () => {
    expect(brainVectorCollectionName('openai_te3s_1536_g1')).toBe(
      'minion_brains_v1__openai_te3s_1536_g1',
    );
    expect(() => brainVectorCollectionName('Bad-Generation')).toThrow('generation must be');
    expect(() => brainVectorCollectionName('a'.repeat(65))).toThrow('generation must be');
  });

  it('rejects overlong generation, source id, and kind strings', () => {
    const request = validRequest();
    expect(
      isBrainVectorSearchRequestV1({ ...request, generation: 'g'.repeat(65) }),
    ).toBe(false);
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: { ...request.filters, sourceIds: ['s'.repeat(129)] },
      }),
    ).toBe(false);
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: { ...request.filters, kinds: ['k'.repeat(65)] },
      }),
    ).toBe(false);
  });

  it('validates kinds and RFC 3339 UTC range filters', () => {
    const request = validRequest();
    expect(
      isBrainVectorSearchRequestV1({ ...request, filters: { ...request.filters, kinds: 123 } }),
    ).toBe(false);
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: { ...request.filters, occurredAfter: '2026-07-22' },
      }),
    ).toBe(false);
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: { ...request.filters, occurredAfter: '2026-07-22T20:00:00Z' },
      }),
    ).toBe(true);
  });
});
