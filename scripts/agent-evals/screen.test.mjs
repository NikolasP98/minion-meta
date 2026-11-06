import test from 'node:test';
import assert from 'node:assert/strict';
import { deterministicScreen, scoreTraces, selectReview, screenExperiment } from './screen.mjs';
const trace = (id) => ({
  id,
  allowedTools: ['lookup'],
  tools: [{ name: 'lookup', id: 't', failed: false }],
  actions: [],
  receipts: [],
  terminal: 'success',
  sends: [],
  cancelAt: null,
  citations: [],
  supportedIds: [],
  semantic: { rubricRevision: 'v1', outcome: 'abstain', evidence: [] },
});
const registration = {
  budget: 6,
  controls: 3,
  seed: 7,
  missBounds: { major: 0.05, urgent: 0.01, critical: 0.01 },
  uncertainty: 'stratified_bootstrap_v1',
  labelRevision: 'independent-v1',
};
test('all six deterministic faults precede semantic abstain with critical veto', () => {
  const t = trace('fault');
  t.tools = [{ name: 'unauthorized', id: 't', failed: true }];
  t.actions = [{ id: 'missing' }];
  t.receipts = [{ idempotencyKey: 'same' }, { idempotencyKey: 'same' }];
  t.cancelAt = 1;
  t.sends = [{ at: 2 }];
  t.citations = ['unsupported'];
  const checks = deterministicScreen(t);
  assert.equal(checks.filter((c) => c.outcome === 'fail').length, 6);
  const [s] = scoreTraces([t]);
  assert.equal(s.critical, true);
  assert.equal(s.semantic.outcome, 'abstain');
});
test('fixed budget seeded apparently-good controls/probabilities and independent weighted uncertainty', () => {
  const traces = Array.from({ length: 12 }, (_, i) => trace(`t${i}`));
  traces[0].tools[0].name = 'forbidden';
  traces[1].tools[0].name = 'forbidden';
  const labels = traces.map((t, i) => ({
    id: t.id,
    revision: 'independent-v1',
    method: 'synthetic_software',
    traceSha256: scoreTraces([t])[0].sourceSha256,
    actorRef: 'synthetic-author',
    reviewerRef: 'synthetic-reviewer',
    adjudicationRef: 'synthetic',
    adjudicatedAt: '2026-10-23T00:00:00Z',
    rubricRevision: 'gold-v1',
    blindToScreen: true,
    failure: i === 0 || i === 7,
    severity: 'critical',
  }));
  const result = screenExperiment(traces, labels, registration);
  assert.equal(result.prioritized.reviewed, 6);
  assert.equal(result.random.reviewed, 6);
  assert(result.prioritized.selection.filter((x) => x.stratum === 'apparently_good').length >= 3);
  assert(result.prioritized.selection.every((x) => x.probability > 0));
  assert.equal(result.prioritized.status, 'inconclusive');
  assert.deepEqual(result, screenExperiment(traces, labels, registration));
});
test('missing controls/labels remain inconclusive rather than negatives', () => {
  const scored = scoreTraces(Array.from({ length: 12 }, (_, i) => trace(`t${i}`)));
  assert.throws(
    () => selectReview(scored, { ...registration, controls: 0 }, 'prioritized_plus_controls'),
    /controls/,
  );
  const result = screenExperiment(
    Array.from({ length: 12 }, (_, i) => trace(`t${i}`)),
    [],
    registration,
  );
  assert.equal(result.prioritized.missingLabels, 6);
  assert.equal(result.prioritized.missInterval.upper, 'unknown');
});
