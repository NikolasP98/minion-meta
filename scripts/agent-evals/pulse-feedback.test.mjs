import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  parsePulseFeedbackExport,
  readPulseFeedbackExport,
  importFeedback,
} from './lib/pulse-feedback.mjs';
import { digest, canonical } from './lib/common.mjs';
const root = path.resolve(import.meta.dirname, '../..');
const fixture = path.join(import.meta.dirname, 'fixtures/pulse-feedback/actual-export.jsonl');
const raw = fs.readFileSync(fixture, 'utf8');
const entries = () =>
  raw
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line));
const encode = (lines) => lines.map((line) => JSON.stringify(line)).join('\n') + '\n';
function rehash(row) {
  row.payloadHash = digest({
    id: row.proposalId,
    clientActionId: row.clientActionId,
    expectedContentRevision: row.contentRevision,
    reason: row.reason,
    ...(row.comment !== null ? { comment: row.comment } : {}),
    ...(row.supersedesFeedbackId !== null
      ? { supersedesFeedbackId: row.supersedesFeedbackId }
      : {}),
  });
  return row;
}
function mutation(change) {
  const lines = entries();
  change(lines);
  return encode(lines);
}
test('F-E1 imports the actual SQL and route export with server hashes Unicode and immutable correction provenance', () => {
  const receipt = JSON.parse(
    fs.readFileSync(
      path.join(import.meta.dirname, 'fixtures/pulse-feedback/producer-receipt.json'),
      'utf8',
    ),
  );
  assert.equal(digest(raw), receipt.exportSha256);
  assert.equal(
    receipt.storage,
    'real marked disposable PostgreSQL, real migration, actual feedback service/route',
  );
  const result = readPulseFeedbackExport(fixture);
  assert.equal(result.schema, 'pulse-feedback-import-v1');
  assert.equal(result.factual_errors.length, 1);
  assert.equal(result.preference_relevance.length, 2);
  assert.equal(result.factualErrorStatus, 'user_reported_unadjudicated');
  assert.equal(result.automaticWeights, false);
  assert.equal(result.adjudicatedGold, false);
  assert.equal(result.page.historyCompleteness, 'not_asserted');
  assert.equal(result.corrections.verification, 'all_present_links_verified');
  assert(result.preference_relevance.some((row) => Array.from(row.comment ?? '').length === 500));
  assert(result.factual_errors[0].supersedesFeedbackId);
  assert(result.factual_errors[0].sourceRevisions.length);
  assert.equal(result.source.sha256, receipt.exportSha256);
});
test('F-E2 rejects missing fields invalid UUID revisions reasons groups source pins and server payload hashes', () => {
  for (const change of [
    (lines) => {
      delete lines[1].feedback.sourceSnapshotHash;
    },
    (lines) => {
      lines[1].feedback.clientActionId = 'invalid';
    },
    (lines) => {
      lines[1].feedback.contentRevision = 0;
    },
    (lines) => {
      lines[1].feedback.policyRevision = 1;
    },
    (lines) => {
      lines[1].feedback.reason = 'factual_error';
    },
    (lines) => {
      lines[1].group = 'factual_errors';
    },
    (lines) => {
      lines[1].feedback.sourceRevisions[0].contentHash = 'x';
    },
    (lines) => {
      lines[1].feedback.contentHash = '0'.repeat(64);
    },
    (lines) => {
      lines[1].feedback.payloadHash = '0'.repeat(64);
    },
    (lines) => {
      lines[1].feedback.actorProfileId = randomUUID();
    },
    (lines) => {
      lines[0].schema = 'pulse-feedback-v2';
    },
    (lines) => {
      lines[0].automaticLearning = true;
    },
  ])
    assert.throws(() => parsePulseFeedbackExport(mutation(change)));
  assert.throws(
    () =>
      parsePulseFeedbackExport(raw.replace('"schema":', '"schema":"pulse-feedback-v1","schema":')),
    /duplicate/,
  );
});
test('F-E3 rejects duplicate rows actions conflicting owner provenance two successors and correction cycles', () => {
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((lines) => {
          lines.splice(1, 0, structuredClone(lines[1]));
        }),
      ),
    /duplicate feedback/,
  );
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((lines) => {
          lines[2].feedback.clientActionId = lines[1].feedback.clientActionId;
          rehash(lines[2].feedback);
        }),
      ),
    /conflicting feedback action/,
  );
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((lines) => {
          lines[1].feedback.orgId = randomUUID();
        }),
      ),
    /mixed owner/,
  );
  const correction = entries().find((line) => line.feedback?.supersedesFeedbackId)?.feedback;
  assert(correction);
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((lines) => {
          const child = lines.find((line) => line.feedback?.id === correction.id).feedback;
          child.proposalId = randomUUID();
          rehash(child);
        }),
      ),
    /binding|provenance/,
  );
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((lines) => {
          const child = structuredClone(lines.find((line) => line.feedback?.id === correction.id));
          child.feedback.id = randomUUID();
          child.feedback.clientActionId = randomUUID();
          rehash(child.feedback);
          lines.splice(1, 0, child);
        }),
      ),
    /two successors/,
  );
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((lines) => {
          const child = lines.find((line) => line.feedback?.id === correction.id).feedback;
          const prior = lines.find(
            (line) => line.feedback?.id === child.supersedesFeedbackId,
          ).feedback;
          prior.supersedesFeedbackId = child.id;
          prior.createdAt = child.createdAt;
          prior.cursorAt = child.cursorAt;
          rehash(prior);
        }),
      ),
    /cycle/,
  );
});
test('F-E4 preserves partial page cursor and unresolved predecessors without claiming complete history or adjudication', () => {
  const lines = entries();
  const child = lines.find((line) => line.feedback?.supersedesFeedbackId);
  const cursor = Buffer.from(
    JSON.stringify({ at: child.feedback.cursorAt, id: child.feedback.id }),
  ).toString('base64url');
  const page = encode([lines[0], child, { nextCursor: cursor }]);
  const result = parsePulseFeedbackExport(page);
  assert.equal(result.page.nextCursor, cursor);
  assert.equal(result.page.hasMore, true);
  assert.equal(result.page.historyCompleteness, 'not_asserted');
  assert.equal(result.corrections.verification, 'partial_page');
  assert.deepEqual(result.corrections.unresolvedPredecessors, [
    child.feedback.supersedesFeedbackId,
  ]);
  assert.equal(result.adjudicatedGold, false);
});
test('F-E5 enforces exact row byte and non-BMP Unicode limits without truncation', () => {
  const lines = entries(),
    seed = structuredClone(lines[1].feedback);
  seed.comment = null;
  seed.supersedesFeedbackId = null;
  const rows = Array.from({ length: 100 }, () => ({
    group: seed.reason === 'fact_error' ? 'factual_errors' : 'preference_relevance',
    feedback: rehash({ ...structuredClone(seed), id: randomUUID(), clientActionId: randomUUID() }),
  }));
  assert.equal(
    parsePulseFeedbackExport(encode([lines[0], ...rows, { nextCursor: null }])).page.rows,
    100,
  );
  assert.throws(
    () => parsePulseFeedbackExport(encode([lines[0], ...rows, rows[0], { nextCursor: null }])),
    /row limit/,
  );
  const exact = raw.slice(0, -1) + ' '.repeat(262144 - Buffer.byteLength(raw)) + '\n';
  assert.equal(Buffer.byteLength(exact), 262144);
  assert.equal(parsePulseFeedbackExport(exact).page.rows, 3);
  assert.throws(() => parsePulseFeedbackExport(exact + ' '), /byte limit/);
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((l) => {
          l[1].feedback.comment = '😀'.repeat(501);
          rehash(l[1].feedback);
        }),
      ),
    /Unicode/,
  );
  assert.throws(
    () =>
      parsePulseFeedbackExport(
        mutation((l) => {
          l[1].feedback.comment = '\ud800';
          rehash(l[1].feedback);
        }),
      ),
    /surrogate/,
  );
  assert.throws(() => parsePulseFeedbackExport(raw.slice(0, -1)), /truncated/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-feedback-utf8-'));
  try {
    const file = path.join(directory, 'bad.jsonl');
    fs.writeFileSync(file, Buffer.from([0xff, 0x0a]));
    assert.throws(() => readPulseFeedbackExport(file));
    assert.throws(() => readPulseFeedbackExport(path.join(directory, 'missing')));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('F-E6 retains legacy JSON compatibility as explicitly unverified reported feedback', () => {
  const legacy = {
    version: 1,
    revision: 'legacy-v1',
    records: [
      {
        ownerId: 'legacy-owner',
        contentRevision: 1,
        sourceRevision: 'source-v1',
        policyRevision: 'policy-v1',
        reason: 'factual_error',
      },
    ],
  };
  assert.deepEqual(importFeedback(legacy), legacy.records);
  const result = parsePulseFeedbackExport(JSON.stringify(legacy));
  assert.equal(result.factual_errors.length, 1);
  assert.equal(result.source.provenance, 'legacy_unverified');
  assert.equal(result.adjudicatedGold, false);
  assert.equal(result.automaticWeights, false);
});
test('F-E7 actual public screen CLI consumes the actual E export without altering scores labels or review selection', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-feedback-cli-'));
  try {
    const trace = (id) => ({
      id,
      allowedTools: [],
      tools: [],
      actions: [],
      receipts: [],
      terminal: 'success',
      sends: [],
      cancelAt: null,
      citations: [],
      supportedIds: [],
      semantic: { rubricRevision: 'v1', outcome: 'abstain', evidence: [] },
    });
    const input = path.join(directory, 'input.json'),
      labels = path.join(directory, 'labels.json');
    fs.writeFileSync(
      input,
      JSON.stringify({
        traces: [trace('one'), trace('two')],
        registration: {
          budget: 2,
          controls: 1,
          seed: 7,
          missBounds: { major: 0.05, urgent: 0.01, critical: 0.01 },
          uncertainty: 'stratified_bootstrap_v1',
          labelRevision: 'independent-v1',
        },
      }),
    );
    fs.writeFileSync(labels, '[]');
    const invoke = (extra) =>
      spawnSync(
        process.execPath,
        [
          path.join(root, 'scripts/agent-evals/screen.mjs'),
          '--input',
          input,
          '--labels',
          labels,
          ...extra,
        ],
        { cwd: root, env: { PATH: process.env.PATH }, encoding: 'utf8', timeout: 15000 },
      );
    const baseline = invoke([]),
      withFeedback = invoke(['--feedback', fixture]);
    assert.equal(baseline.status, 0, baseline.stderr);
    assert.equal(withFeedback.status, 0, withFeedback.stderr);
    const result = JSON.parse(withFeedback.stdout),
      ordinary = JSON.parse(baseline.stdout);
    assert.equal(result.feedback.factualErrorStatus, 'user_reported_unadjudicated');
    assert.equal(result.feedback.page.rows, 3);
    delete result.feedback;
    assert.equal(canonical(result), canonical(ordinary));
    assert.equal(fs.readFileSync(labels, 'utf8'), '[]');
    assert.notEqual(invoke(['--feedback', path.join(directory, 'missing.jsonl')]).status, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
