import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from './report.mjs';
import { canonical } from './lib/common.mjs';
function data() {
  const observations = [];
  for (let i = 0; i < 12; i++)
    for (const arm of ['full', 'jev', 'core_discovery'])
      observations.push({
        episodeId: `e${i}`,
        clusterId: `c${i}`,
        arm,
        repeat: 0,
        cohort: { source: 'same', model: 'frozen', rubric: 'v1' },
        outcome: 'success',
        costMicroUsd: arm === 'full' ? 100 : 50,
        upperMicroUsd: arm === 'full' ? 100 : 50,
        costStatus: 'known',
        latencyMs: 100,
        complete: true,
        critical: [],
        labelMethod: 'human_adjudicated',
      });
  return {
    version: 1,
    observations,
    seed: 7,
    minimumClusters: 12,
    humanCorpusReady: true,
    repeatAggregation: 'single',
    preregistration: { stopping: 'fixed', expansion: 'none' },
  };
}
const comparison = (d) => analyze(d).cohorts[0].comparisons.jev;
test('10000 paired cluster draws are byte-reproducible and recompute whole CPS ratios', () => {
  const d = data(),
    r = analyze(d);
  assert.equal(r.cohorts[0].arms.jev.cpsMicroUsd, 50);
  assert.equal(comparison(d).bootstrap.point.costRatio, 0.5);
  assert.equal(comparison(d).bootstrap.draws, 10000);
  assert.equal(comparison(d).status, 'candidate_eligible_for_human_review');
  assert.equal(canonical(r), canonical(analyze(d)));
});
test('all failed costs stay numerator: cheaper less successful candidate fails', () => {
  const d = data();
  d.observations
    .filter((r) => r.arm === 'jev')
    .forEach((r, i) => {
      r.costMicroUsd = 60;
      r.upperMicroUsd = 60;
      r.outcome = i < 5 ? 'success' : 'incorrect';
    });
  const r = analyze(d).cohorts[0];
  assert.equal(r.arms.jev.costMicroUsd, 720);
  assert.equal(r.arms.jev.cpsMicroUsd, 144);
  assert(r.comparisons.jev.bootstrap.point.costRatio > 1);
  assert.notEqual(r.comparisons.jev.status, 'candidate_eligible_for_human_review');
});
test('zero successes and nonfinite bootstrap draws cannot disappear', () => {
  const d = data();
  d.observations.filter((r) => r.arm === 'jev').forEach((r) => (r.outcome = 'incorrect'));
  const r = comparison(d);
  assert.equal(r.bootstrap.undefinedCostDraws, 10000);
  assert.equal(r.bootstrap.intervals.costRatio.upper, 'unbounded');
  assert.equal(r.gates.cost, false);
});
test('critical, missing arm/receipt, unbounded bill, drift, missing preregistration veto', () => {
  for (const mutate of [
    (d) => d.observations.find((r) => r.arm === 'jev').critical.push('wrong_scope'),
    (d) => d.observations.splice(1, 1),
    (d) => (d.observations[1].complete = false),
    (d) => {
      d.observations[1].costStatus = 'unbounded';
      d.observations[1].upperMicroUsd = null;
    },
    (d) => (d.observations[1].cohort.model = 'drift'),
    (d) => delete d.preregistration,
  ]) {
    const d = data();
    mutate(d);
    assert.notEqual(comparison(d).status, 'candidate_eligible_for_human_review');
  }
});
test('bounded unknown uses adverse candidate upper, baseline lower; repeated episode clusters retained', () => {
  const d = data();
  d.observations.find((r) => r.arm === 'jev').costStatus = 'bounded_unknown';
  d.observations.find((r) => r.arm === 'jev').upperMicroUsd = 1000;
  assert(comparison(d).bootstrap.point.costRatio > 1);
  assert.equal(comparison(d).adverseUnknownBounds, true);
  d.repeatAggregation = 'all_repeats';
  for (const row of [...d.observations]) d.observations.push({ ...row, repeat: 1 });
  assert.equal(comparison(d).bootstrap.clusters, 12);
  assert.equal(analyze(d).cohorts[0].arms.full.costMicroUsd, 2400);
});
