export const BRAIN_VECTOR_CONTRACT_VERSION = 1 as const;
export const BRAIN_VECTOR_PAYLOAD_SCHEMA_VERSION = 1 as const;
export const BRAIN_VECTOR_DIMENSIONS = 1536 as const;
export const BRAIN_VECTOR_MAX_CANDIDATES = 200 as const;
export const BRAIN_VECTOR_MAX_SOURCE_IDS = 512 as const;
export const BRAIN_VECTOR_MAX_KINDS = 32 as const;
export const BRAIN_VECTOR_MAX_KIND_LENGTH = 64 as const;
export const BRAIN_VECTOR_SOURCE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;
export const BRAIN_VECTOR_GENERATION_PATTERN = /^[a-z0-9_]{1,64}$/u;
export const BRAIN_VECTOR_COLLECTION_PREFIX = 'minion_brains_v1' as const;

/** JWS `alg` for capability tokens. Verifiers MUST reject any other algorithm. */
export const BRAIN_VECTOR_CAPABILITY_ALG = 'EdDSA' as const;
/** Only Ed25519 keys may sign or verify v1 capabilities. */
export const BRAIN_VECTOR_CAPABILITY_CURVE = 'Ed25519' as const;

export interface BrainVectorCapabilityHeaderV1 {
  alg: typeof BRAIN_VECTOR_CAPABILITY_ALG;
  typ: 'JWT';
  kid: string;
}

/**
 * Frozen v1 Qdrant collection name: `minion_brains_v1__<generation>`.
 * One collection per embedding generation; org isolation lives in point payloads.
 */
export function brainVectorCollectionName(generation: string): string {
  if (!BRAIN_VECTOR_GENERATION_PATTERN.test(generation)) {
    throw new Error(
      'generation must be 1-64 lowercase ASCII letters, digits, or underscores',
    );
  }
  return `${BRAIN_VECTOR_COLLECTION_PREFIX}__${generation}`;
}

export type BrainVectorContractVersion = typeof BRAIN_VECTOR_CONTRACT_VERSION;
export type BrainVectorPayloadSchemaVersion = typeof BRAIN_VECTOR_PAYLOAD_SCHEMA_VERSION;
export type BrainVectorScopeMode = 'source_list' | 'org_all';

interface BrainVectorSearchCapabilityBaseV1 {
  iss: 'minion-hub';
  aud: 'minion-brain-vector';
  sub: string;
  org_id: string;
  brain_id: string;
  generation: string;
  op: 'search';
  jti: string;
  iat: number;
  exp: number;
}

export type BrainVectorSearchCapabilityV1 = BrainVectorSearchCapabilityBaseV1 &
  (
    | { source_scope_mode: 'source_list'; source_scope_hash: string }
    | { source_scope_mode: 'org_all'; source_scope_hash?: never }
  );

interface BrainVectorSearchFilterBaseV1 {
  kinds?: string[];
  /** RFC 3339 UTC instant ending in Z. */
  occurredAfter?: string | null;
  /** RFC 3339 UTC instant ending in Z. */
  occurredBefore?: string | null;
}

export type BrainVectorSearchFiltersV1 = BrainVectorSearchFilterBaseV1 &
  (
    | { scopeMode: 'source_list'; sourceIds: string[] }
    | { scopeMode: 'org_all'; sourceIds?: never }
  );

export interface BrainVectorSearchRequestV1 {
  contractVersion: BrainVectorContractVersion;
  generation: string;
  vector: number[];
  limit: number;
  filters: BrainVectorSearchFiltersV1;
}

export interface BrainVectorCandidateV1 {
  chunkId: string;
  score: number;
  indexedFingerprint: string;
}

export interface BrainVectorSearchResponseV1 {
  contractVersion: BrainVectorContractVersion;
  generation: string;
  collection: string;
  tookMs: number;
  candidates: BrainVectorCandidateV1[];
}

export type BrainVectorErrorCode =
  | 'invalid_capability'
  | 'expired_capability'
  | 'invalid_scope'
  | 'inactive_generation'
  | 'invalid_request'
  | 'vector_unavailable'
  | 'internal_error';

export interface BrainVectorErrorResponseV1 {
  contractVersion: BrainVectorContractVersion;
  error: {
    code: BrainVectorErrorCode;
    message: string;
    requestId: string;
  };
}

export interface BrainVectorPointPayloadV1 {
  org_id: string;
  source_id: string;
  document_id: string;
  kind: string;
  /** RFC 3339 UTC instant ending in Z. */
  occurred_at: string | null;
  content_fingerprint: string;
  embedding_model: string;
  embedding_generation: string;
  payload_schema: BrainVectorPayloadSchemaVersion;
}

interface BrainVectorOutboxClaimBaseV1 {
  chunkId: string;
  orgId: string;
  generation: string;
  revision: number;
}

export type BrainVectorOutboxClaimV1 = BrainVectorOutboxClaimBaseV1 &
  (
    | { operation: 'upsert'; vector: number[]; payload: BrainVectorPointPayloadV1 }
    | { operation: 'delete'; vector: null; payload: null }
  );

export interface BrainVectorOutboxAckV1 {
  chunkId: string;
  generation: string;
  revision: number;
}

function isUtcInstant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isOptionalUtcInstant(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isUtcInstant(value);
}

function isSourceId(value: unknown): value is string {
  return typeof value === 'string' && BRAIN_VECTOR_SOURCE_ID_PATTERN.test(value);
}

/**
 * Validate the public v1 request boundary. The server MUST also bind it to the
 * capability: scopeMode must equal source_scope_mode, and source_list requests
 * must recompute brainVectorSourceScopeHash(sourceIds) and compare it to the claim.
 */
export function isBrainVectorSearchRequestV1(value: unknown): value is BrainVectorSearchRequestV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BrainVectorSearchRequestV1>;
  const filters = candidate.filters as Partial<BrainVectorSearchFiltersV1> | undefined;
  const validKinds =
    filters?.kinds === undefined ||
    (Array.isArray(filters.kinds) &&
      filters.kinds.length <= BRAIN_VECTOR_MAX_KINDS &&
      filters.kinds.every(
        (kind) =>
          typeof kind === 'string' &&
          kind.length > 0 &&
          kind.length <= BRAIN_VECTOR_MAX_KIND_LENGTH,
      ));
  const validScope =
    filters?.scopeMode === 'source_list'
      ? Array.isArray(filters.sourceIds) &&
        filters.sourceIds.length >= 1 &&
        filters.sourceIds.length <= BRAIN_VECTOR_MAX_SOURCE_IDS &&
        filters.sourceIds.every(isSourceId)
      : filters?.scopeMode === 'org_all' && filters.sourceIds === undefined;
  return (
    candidate.contractVersion === BRAIN_VECTOR_CONTRACT_VERSION &&
    typeof candidate.generation === 'string' &&
    BRAIN_VECTOR_GENERATION_PATTERN.test(candidate.generation) &&
    Array.isArray(candidate.vector) &&
    candidate.vector.length === BRAIN_VECTOR_DIMENSIONS &&
    candidate.vector.every(Number.isFinite) &&
    typeof candidate.limit === 'number' &&
    Number.isInteger(candidate.limit) &&
    candidate.limit > 0 &&
    candidate.limit <= BRAIN_VECTOR_MAX_CANDIDATES &&
    !!filters &&
    validScope &&
    validKinds &&
    isOptionalUtcInstant(filters.occurredAfter) &&
    isOptionalUtcInstant(filters.occurredBefore)
  );
}
