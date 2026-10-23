import fs from 'node:fs';
import path from 'node:path';
import {
  assert,
  object,
  string,
  integer,
  uuid,
  hash,
  canonical,
  parse,
  digest,
  safePath,
} from './common.mjs';

const MAX_BYTES = 262144,
  MAX_ROWS = 100;
const reasons = new Set([
  'useful',
  'irrelevant',
  'duplicate',
  'fact_error',
  'already_handled',
  'too_late',
]);
const sources = new Set(['sveltekit', 'svelte', 'ai', 'openai', 'supabase']);
const scalarString = (value, max) => {
  assert(
    typeof value === 'string' && Array.from(value).length <= max,
    'feedback Unicode comment limit',
  );
  assert(
    Array.from(value).every((c) => {
      const n = c.codePointAt(0);
      return n < 0xd800 || n > 0xdfff;
    }),
    'feedback unpaired Unicode surrogate',
  );
  return value;
};
function timestamp(value) {
  assert(
    typeof value === 'string' &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value) &&
      Number.isFinite(Date.parse(value)),
    'feedback timestamp',
  );
  assert(
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19),
    'feedback calendar timestamp',
  );
  return value;
}
function boundedRevision(value) {
  string(value, 'feedback revision');
  assert(value.length <= 128, 'feedback revision limit');
  return value;
}
/** Compatibility with the previously supported optional local JSON format. It
 * remains unadjudicated feedback, never an independent label or policy weight. */
export function importFeedback(value) {
  object(value, ['version', 'revision', 'records']);
  assert(value.version === 1, 'feedback version');
  boundedRevision(value.revision);
  assert(Array.isArray(value.records) && value.records.length <= MAX_ROWS, 'feedback row limit');
  return value.records.map((row) => {
    object(row, ['ownerId', 'contentRevision', 'sourceRevision', 'policyRevision', 'reason']);
    boundedRevision(row.ownerId);
    boundedRevision(row.sourceRevision);
    boundedRevision(row.policyRevision);
    if (typeof row.contentRevision === 'number') integer(row.contentRevision, 1);
    else boundedRevision(row.contentRevision);
    assert(['factual_error', 'relevance', 'preference'].includes(row.reason), 'feedback reason');
    return row;
  });
}
function rowBinding(row) {
  return canonical(
    Object.fromEntries(
      [
        'orgId',
        'ownerProfileId',
        'actorProfileId',
        'proposalId',
        'contentRevision',
        'digestRunId',
        'policyRevision',
        'sourceSnapshotHash',
        'contentHash',
        'sourceRevisions',
      ].map((key) => [key, row[key]]),
    ),
  );
}
function pulseRow(value) {
  object(
    value,
    [
      'sourceRevisions',
      'id',
      'orgId',
      'ownerProfileId',
      'actorProfileId',
      'proposalId',
      'contentRevision',
      'digestRunId',
      'policyRevision',
      'sourceSnapshotHash',
      'contentHash',
      'reason',
      'comment',
      'clientActionId',
      'supersedesFeedbackId',
      'payloadHash',
      'redactedAt',
      'createdAt',
    ],
    ['cursorAt'],
  );
  for (const key of [
    'id',
    'orgId',
    'ownerProfileId',
    'actorProfileId',
    'proposalId',
    'digestRunId',
    'clientActionId',
  ])
    uuid(value[key]);
  assert(value.ownerProfileId === value.actorProfileId, 'feedback actor/owner mismatch');
  integer(value.contentRevision, 1);
  boundedRevision(value.policyRevision);
  for (const key of ['sourceSnapshotHash', 'contentHash', 'payloadHash']) hash(value[key]);
  assert(reasons.has(value.reason), 'feedback reason');
  if (value.comment !== null) scalarString(value.comment, 500);
  timestamp(value.createdAt);
  if (value.cursorAt !== undefined) {
    timestamp(value.cursorAt);
    assert(
      Math.abs(Date.parse(value.cursorAt) - Date.parse(value.createdAt)) < 1,
      'feedback cursor timestamp mismatch',
    );
  }
  if (value.redactedAt !== null) {
    timestamp(value.redactedAt);
    assert(value.comment === null, 'feedback redaction must remove comment');
  }
  if (value.supersedesFeedbackId !== null) {
    uuid(value.supersedesFeedbackId);
    assert(value.supersedesFeedbackId !== value.id, 'feedback self correction');
  }
  if (value.redactedAt === null) {
    const input = {
      id: value.proposalId,
      clientActionId: value.clientActionId,
      expectedContentRevision: value.contentRevision,
      reason: value.reason,
      ...(value.comment !== null ? { comment: value.comment } : {}),
      ...(value.supersedesFeedbackId !== null
        ? { supersedesFeedbackId: value.supersedesFeedbackId }
        : {}),
    };
    assert(digest(input) === value.payloadHash, 'feedback server payload hash mismatch');
  }
  assert(
    Array.isArray(value.sourceRevisions) &&
      value.sourceRevisions.length >= 1 &&
      value.sourceRevisions.length <= 5,
    'feedback source revisions',
  );
  const seen = new Set();
  for (const source of value.sourceRevisions) {
    object(source, ['sourceId', 'revision', 'contentHash']);
    assert(sources.has(source.sourceId) && !seen.has(source.sourceId), 'feedback source identity');
    seen.add(source.sourceId);
    integer(source.revision);
    hash(source.contentHash);
  }
  return value;
}
function report(format, rows, bytes, sha256, nextCursor, revision = null) {
  const factual = rows.filter(
    (row) => row.reason === 'fact_error' || row.reason === 'factual_error',
  );
  return {
    schema: 'pulse-feedback-import-v1',
    source: {
      format,
      revision,
      bytes,
      sha256,
      provenance:
        format === 'pulse-feedback-v1'
          ? 'exported_owner_content_source_policy_bindings'
          : 'legacy_unverified',
    },
    page: {
      rows: rows.length,
      nextCursor,
      hasMore: nextCursor !== null,
      historyCompleteness: 'not_asserted',
    },
    factualErrorStatus: 'user_reported_unadjudicated',
    factual_errors: factual,
    preference_relevance: rows.filter((row) => !factual.includes(row)),
    automaticWeights: false,
    adjudicatedGold: false,
  };
}
/** Offline, explicit optional import. A page is never treated as all history. */
export function parsePulseFeedbackExport(text) {
  const bytes = Buffer.byteLength(text);
  assert(bytes <= MAX_BYTES, 'feedback byte limit');
  let whole;
  try {
    whole = parse(text);
  } catch {
    /* Multiple complete JSONL records are parsed individually below. */
  }
  if (whole !== undefined) {
    const rows = importFeedback(whole);
    return report('legacy-feedback-v1', rows, bytes, digest(text), null, whole.revision);
  }
  assert(text.endsWith('\n'), 'truncated feedback JSONL');
  const lines = text.slice(0, -1).split('\n');
  assert(
    lines.length >= 2 &&
      lines.length <= MAX_ROWS + 2 &&
      lines.every((line) => line.trim().length > 0),
    'feedback row limit or empty line',
  );
  const entries = lines.map(parse),
    header = entries.shift(),
    footer = entries.pop();
  object(header, ['schema', 'automaticLearning']);
  assert(header.schema === 'pulse-feedback-v1', 'feedback schema/version');
  assert(header.automaticLearning === false, 'feedback automatic learning forbidden');
  object(footer, ['nextCursor']);
  if (footer.nextCursor !== null) {
    assert(
      typeof footer.nextCursor === 'string' &&
        footer.nextCursor.length <= 256 &&
        /^[A-Za-z0-9_-]+$/.test(footer.nextCursor),
      'feedback pagination cursor',
    );
    const cursor = parse(Buffer.from(footer.nextCursor, 'base64url').toString('utf8'));
    object(cursor, ['at', 'id']);
    timestamp(cursor.at);
    uuid(cursor.id);
  }
  const rows = entries.map((entry) => {
    object(entry, ['group', 'feedback']);
    const row = pulseRow(entry.feedback);
    assert(
      entry.group === (row.reason === 'fact_error' ? 'factual_errors' : 'preference_relevance'),
      'feedback group/reason mismatch',
    );
    return row;
  });
  const ids = new Map(),
    actions = new Set(),
    successors = new Map(),
    cards = new Map(),
    runs = new Map();
  let owner = null;
  for (const row of rows) {
    const scopedOwner = canonical([row.orgId, row.ownerProfileId]);
    if (owner === null) owner = scopedOwner;
    assert(owner === scopedOwner, 'feedback mixed owner/org page');
    assert(!ids.has(row.id), 'duplicate feedback record');
    ids.set(row.id, row);
    const action = canonical([row.orgId, row.actorProfileId, row.clientActionId]);
    assert(!actions.has(action), 'conflicting feedback action');
    actions.add(action);
    const binding = rowBinding(row);
    for (const [map, key] of [
      [cards, row.proposalId],
      [runs, row.digestRunId],
    ]) {
      assert(
        !map.has(key) || map.get(key) === binding,
        'feedback content/source/policy provenance conflict',
      );
      map.set(key, binding);
    }
    if (row.supersedesFeedbackId !== null) {
      assert(!successors.has(row.supersedesFeedbackId), 'feedback correction has two successors');
      successors.set(row.supersedesFeedbackId, row.id);
    }
  }
  const unresolved = [];
  for (const row of rows) {
    const seen = new Set([row.id]);
    let current = row;
    while (current.supersedesFeedbackId !== null) {
      const predecessor = ids.get(current.supersedesFeedbackId);
      if (!predecessor) {
        unresolved.push(current.supersedesFeedbackId);
        break;
      }
      assert(!seen.has(predecessor.id), 'feedback correction cycle');
      seen.add(predecessor.id);
      assert(
        rowBinding(predecessor) === rowBinding(current),
        'feedback correction binding conflict',
      );
      assert(
        Date.parse(predecessor.createdAt) <= Date.parse(current.createdAt),
        'feedback correction chronology',
      );
      current = predecessor;
    }
  }
  return {
    ...report('pulse-feedback-v1', rows, bytes, digest(text), footer.nextCursor, 1),
    corrections: {
      verification: unresolved.length ? 'partial_page' : 'all_present_links_verified',
      unresolvedPredecessors: [...new Set(unresolved)].sort(),
    },
  };
}
export function readPulseFeedbackExport(file) {
  const resolved = path.resolve(file);
  safePath(resolved);
  const stat = fs.statSync(resolved);
  assert(stat.isFile() && stat.size <= MAX_BYTES, 'feedback byte limit');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(resolved));
  return parsePulseFeedbackExport(text);
}
