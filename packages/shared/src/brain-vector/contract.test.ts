import { describe, expect, it } from 'vitest';
import {
  BRAIN_VECTOR_CONTRACT_VERSION,
  BRAIN_VECTOR_DIMENSIONS,
  brainVectorCollectionName,
  isBrainVectorOutboxClaimV1,
  isBrainVectorSearchRequestV1,
  isBrainVectorSearchResponseV1,
  type BrainVectorPointPayloadV1,
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

function validPayload(): BrainVectorPointPayloadV1 {
  return {
    chunk_id: '018f87f4-e934-7a21-98b6-4f6b8d3898dd',
    org_id: 'org-1',
    source_id: 'source-1',
    document_id: 'document-1',
    kind: 'message',
    occurred_at: null,
    content_fingerprint: 'hmac-sha256:v1:fixture',
    embedding_model: 'text-embedding-3-small',
    embedding_generation: 'openai_te3s_1536_g1',
    payload_schema: 1,
  };
}

describe('brain-vector contract', () => {
  it('carries the canonical chunk id separately from the opaque Qdrant point id', () => {
    const payload = validPayload();
    expect(payload.chunk_id).toBe('018f87f4-e934-7a21-98b6-4f6b8d3898dd');
  });

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
    for (const occurredAfter of [
      '2026-02-29T20:00:00Z',
      '2026-04-31T20:00:00Z',
      '2026-07-22T24:00:00Z',
    ]) {
      expect(
        isBrainVectorSearchRequestV1({
          ...request,
          filters: { ...request.filters, occurredAfter },
        }),
      ).toBe(false);
    }
    expect(
      isBrainVectorSearchRequestV1({
        ...request,
        filters: { ...request.filters, occurredAfter: '2024-02-29T20:00:00Z' },
      }),
    ).toBe(true);
  });

  it('bounds responses by the originating request limit', () => {
    const request = validRequest();
    const response = {
      contractVersion: BRAIN_VECTOR_CONTRACT_VERSION,
      generation: request.generation,
      collection: brainVectorCollectionName(request.generation),
      tookMs: 4.2,
      candidates: Array.from({ length: request.limit }, (_, index) => ({
        chunkId: `chunk-${index}`,
        score: 0.9,
        indexedFingerprint: `fingerprint-${index}`,
      })),
    };
    expect(isBrainVectorSearchResponseV1(response, request)).toBe(true);
    expect(
      isBrainVectorSearchResponseV1(
        { ...response, candidates: [...response.candidates, response.candidates[0]] },
        request,
      ),
    ).toBe(false);
    expect(
      isBrainVectorSearchResponseV1({ ...response, generation: 'other_generation' }, request),
    ).toBe(false);
  });

  it('validates upsert vectors and identity invariants', () => {
    const payload = validPayload();
    const claim = {
      chunkId: payload.chunk_id,
      orgId: payload.org_id,
      generation: payload.embedding_generation,
      revision: 1,
      operation: 'upsert',
      vector: Array.from({ length: BRAIN_VECTOR_DIMENSIONS }, () => 0),
      payload,
    };
    expect(isBrainVectorOutboxClaimV1(claim)).toBe(true);
    expect(isBrainVectorOutboxClaimV1({ ...claim, chunkId: 'different-chunk' })).toBe(false);
    expect(isBrainVectorOutboxClaimV1({ ...claim, orgId: 'different-org' })).toBe(false);
    expect(isBrainVectorOutboxClaimV1({ ...claim, generation: 'different_generation' })).toBe(false);
    expect(isBrainVectorOutboxClaimV1({ ...claim, vector: [0] })).toBe(false);
    const nonFiniteVector = [...claim.vector];
    nonFiniteVector[0] = Number.POSITIVE_INFINITY;
    expect(isBrainVectorOutboxClaimV1({ ...claim, vector: nonFiniteVector })).toBe(false);
  });

  it('requires null vector and payload for delete claims', () => {
    const claim = {
      chunkId: 'chunk-1',
      orgId: 'org-1',
      generation: 'openai_te3s_1536_g1',
      revision: 1,
      operation: 'delete',
      vector: null,
      payload: null,
    };
    expect(isBrainVectorOutboxClaimV1(claim)).toBe(true);
    expect(isBrainVectorOutboxClaimV1({ ...claim, vector: [] })).toBe(false);
  });
});
