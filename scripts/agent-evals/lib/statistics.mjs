import { assert, rng } from './common.mjs';
export function percentile(values, p) {
  const a = [...values].sort((a, b) => a - b);
  if (!a.length) return Infinity;
  const index = Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1));
  return a[index];
}
const finite = (x) => (Number.isFinite(x) ? x : 'unbounded');
export function summarize(rows, adverse = 'candidate') {
  const cost = rows.reduce(
    (n, r) =>
      n +
      (r.costStatus === 'known'
        ? r.costMicroUsd
        : adverse === 'candidate'
          ? (r.upperMicroUsd ?? Infinity)
          : (r.costMicroUsd ?? 0)),
    0,
  );
  const successes = rows.filter((r) => r.outcome === 'success').length;
  return {
    costMicroUsd: cost,
    successes,
    started: rows.length,
    cpsMicroUsd: successes ? cost / successes : Infinity,
    successRate: rows.length ? successes / rows.length : 0,
    p95LatencyMs: percentile(
      rows.map((r) => r.latencyMs),
      0.95,
    ),
  };
}
function statistics(base, candidate) {
  const b = summarize(base, 'baseline'),
    c = summarize(candidate, 'candidate');
  return {
    costRatio:
      b.successes &&
      c.successes &&
      Number.isFinite(b.cpsMicroUsd) &&
      Number.isFinite(c.cpsMicroUsd) &&
      b.cpsMicroUsd > 0
        ? c.cpsMicroUsd / b.cpsMicroUsd
        : Infinity,
    successDifference: c.successRate - b.successRate,
    latencyRatio: b.p95LatencyMs > 0 ? c.p95LatencyMs / b.p95LatencyMs : Infinity,
  };
}
export function pairedBootstrap(pairs, { seed, draws = 10000 }) {
  assert(draws === 10000, 'exactly 10000 preregistered draws required');
  const clusters = new Map();
  for (const p of pairs) {
    const list = clusters.get(p.base.clusterId) ?? [];
    list.push(p);
    clusters.set(p.base.clusterId, list);
  }
  const groups = [...clusters.values()];
  const random = rng(seed);
  const values = { costRatio: [], successDifference: [], latencyRatio: [] };
  let undefinedCostDraws = 0;
  for (let i = 0; i < draws; i++) {
    const sample = [];
    for (let j = 0; j < groups.length; j++)
      sample.push(...groups[Math.floor(random() * groups.length)]);
    const stats = statistics(
      sample.map((p) => p.base),
      sample.map((p) => p.candidate),
    );
    if (!Number.isFinite(stats.costRatio)) undefinedCostDraws++;
    for (const k of Object.keys(values)) values[k].push(stats[k]);
  }
  const intervals = {};
  for (const [k, v] of Object.entries(values))
    intervals[k] = { lower: finite(percentile(v, 0.025)), upper: finite(percentile(v, 0.975)) };
  return {
    draws,
    seed,
    clusters: groups.length,
    undefinedCostDraws,
    undefinedCostMass: undefinedCostDraws / draws,
    point: Object.fromEntries(
      Object.entries(
        statistics(
          pairs.map((p) => p.base),
          pairs.map((p) => p.candidate),
        ),
      ).map(([k, v]) => [k, finite(v)]),
    ),
    intervals,
  };
}
