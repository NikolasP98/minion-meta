import path from 'node:path';
import { assert, canonical, digest, readJSON, jsonl, args, direct, main } from './lib/common.mjs';
import { dedupe, validateObservation, validateRecord } from './lib/receipts.mjs';
import { pairedBootstrap, summarize } from './lib/statistics.mjs';
import { compileComplaintSchema, complaintReport, loadComplaintInput } from './complaint.mjs';
import { reconcileRunEvidence } from './lib/run-evidence.mjs';
import { loadManifest } from './lib/manifest.mjs';
const printable = (v) => (Number.isFinite(v) ? v : 'unbounded');
export function analyze(input) {
  assert(input.version === 1 && Array.isArray(input.observations), 'report input');
  assert(
    ['single', 'all_repeats'].includes(input.repeatAggregation),
    'unsupported repeated-trial estimand',
  );
  const observations = input.observations.map(validateObservation);
  const d = dedupe(observations.map((o) => ({ ...o, id: `${o.episodeId}:${o.arm}:${o.repeat}` })));
  const quarantine = [...d.quarantine];
  const cohorts = new Map();
  for (const row of d.records) {
    const key = digest(row.cohort);
    const rows = cohorts.get(key) ?? [];
    rows.push(row);
    cohorts.set(key, rows);
  }
  if (input.preregistration?.repeatEstimand !== undefined)
    assert(
      input.preregistration.repeatEstimand ===
        (input.repeatAggregation === 'single'
          ? 'one_trial_per_episode_v1'
          : 'matched_repeated_trials_v1'),
      'unsupported registered repeat estimand',
    );
  const reports = [];
  for (const [cohort, raw] of cohorts) {
    // Every repeat is a started trial. Clusters retain all of their trials during bootstrap.
    // Never collapse success to all-repeats-must-succeed or sum independent trial latencies.
    const rows = raw;
    if (input.repeatAggregation === 'single' && rows.some((r) => r.repeat !== 0))
      quarantine.push('single_estimand_has_repeats');
    const arms = {};
    for (const arm of ['full', 'jev', 'core_discovery']) {
      const items = rows.filter((r) => r.arm === arm);
      const s = summarize(items, arm === 'full' ? 'baseline' : 'candidate');
      arms[arm] = {
        ...s,
        costMicroUsd: printable(s.costMicroUsd),
        cpsMicroUsd: printable(s.cpsMicroUsd),
        p95LatencyMs: printable(s.p95LatencyMs),
        attempts: raw.filter((r) => r.arm === arm).reduce((n, r) => n + (r.attempts ?? 1), 0),
        executionReceiptCoverage: items.length
          ? items.filter((r) => r.complete).length / items.length
          : 0,
        billingReceiptCoverage: items.length
          ? items.filter((r) => r.billingComplete !== false && r.costStatus === 'known').length /
            items.length
          : 0,
        knownBillCoverage: items.length
          ? items.filter((r) => r.costStatus === 'known').length / items.length
          : 0,
        costPerStartedMicroUsd: items.length
          ? printable(s.costMicroUsd / items.length)
          : 'unbounded',
      };
    }
    const comparisons = {};
    for (const candidateArm of ['jev', 'core_discovery']) {
      const bases = rows.filter((r) => r.arm === 'full'),
        candidates = rows.filter((r) => r.arm === candidateArm),
        pairs = bases.flatMap((base) => {
          const candidate = candidates.find(
            (c) => c.episodeId === base.episodeId && c.repeat === base.repeat,
          );
          return candidate && candidate.clusterId === base.clusterId ? [{ base, candidate }] : [];
        });
      const reasons = [];
      if (rows.some((r) => r.billingComplete === false)) reasons.push('incomplete_billing');
      const episodeIds = new Set([...bases, ...candidates].map((r) => r.episodeId));
      const repeatSetsMatch = [...episodeIds].every((id) => {
        const b = bases
          .filter((r) => r.episodeId === id)
          .map((r) => r.repeat)
          .sort((a, b) => a - b);
        const c = candidates
          .filter((r) => r.episodeId === id)
          .map((r) => r.repeat)
          .sort((a, b) => a - b);
        return canonical(b) === canonical(c);
      });
      if (!repeatSetsMatch) reasons.push('unmatched_repeat_sets');
      if (
        pairs.length !== bases.length ||
        pairs.length !== candidates.length ||
        (input.expectedEpisodes &&
          new Set(pairs.map((p) => p.base.episodeId)).size !== input.expectedEpisodes.length) ||
        !pairs.length
      )
        reasons.push('incomplete_pairs');
      if (rows.some((r) => !r.complete)) reasons.push('incomplete_receipts');
      if (
        rows.some(
          (r) =>
            r.costStatus === 'unbounded' || (r.costStatus === 'known' && r.costMicroUsd === null),
        )
      )
        reasons.push('unbounded_cost');
      if (quarantine.length) reasons.push('quarantined_records');
      if (cohorts.size > 1) reasons.push('drift_separated_cohorts');
      if (rows.some((r) => r.cohort.observedModelDrift?.length))
        reasons.push('unapproved_resolved_model');
      if (
        !input.preregistration?.stopping ||
        !input.preregistration?.expansion ||
        !input.repeatAggregation
      )
        reasons.push('missing_preregistration');
      if (!input.humanCorpusReady || rows.some((r) => r.labelMethod !== 'human_adjudicated'))
        reasons.push('independent_human_corpus_not_ready');
      const boot =
        repeatSetsMatch && pairs.length
          ? pairedBootstrap(pairs, { seed: input.seed, draws: 10000 })
          : null;
      if (!boot || boot.clusters < (input.minimumClusters ?? 60))
        reasons.push('insufficient_power');
      const critical = candidates.flatMap((c) => c.critical);
      if (critical.length) reasons.push('critical_veto');
      const gates = boot
        ? {
            success:
              typeof boot.intervals.successDifference.lower === 'number' &&
              boot.intervals.successDifference.lower >= -0.02,
            cost:
              boot.undefinedCostDraws === 0 &&
              typeof boot.intervals.costRatio.upper === 'number' &&
              boot.intervals.costRatio.upper < 1,
            latency:
              typeof boot.intervals.latencyRatio.upper === 'number' &&
              boot.intervals.latencyRatio.upper <= 1.1,
          }
        : { success: false, cost: false, latency: false };
      const status = reasons.length
        ? 'inconclusive'
        : Object.values(gates).every(Boolean)
          ? 'candidate_eligible_for_human_review'
          : 'baseline_retained';
      comparisons[candidateArm] = {
        status,
        reasons,
        gates,
        critical,
        bootstrap: boot,
        pairedEpisodes: new Set(pairs.map((p) => p.base.episodeId)).size,
        pairedTrials: pairs.length,
        estimand:
          input.repeatAggregation === 'single'
            ? 'one_trial_per_episode_v1'
            : 'matched_repeated_trials_v1',
        adverseUnknownBounds: rows.some((r) => r.costStatus === 'bounded_unknown'),
      };
    }
    reports.push({ cohort, provenance: raw[0]?.cohort, arms, comparisons });
  }
  return {
    version: 1,
    status:
      reports.length &&
      reports.every((r) =>
        Object.values(r.comparisons).every(
          (c) => c.status === 'candidate_eligible_for_human_review',
        ),
      )
        ? 'candidate_eligible_for_human_review'
        : 'baseline_retained',
    cohorts: reports,
    quarantine,
    preregistration: input.preregistration ?? null,
    authority: 'analysis_only',
  };
}
export function reportRun(root) {
  return analyze(reconcileRunEvidence(root).analysis);
}
if (direct(import.meta.url))
  main(async () => {
    const a = args(process.argv.slice(2));
    if (a.complaint) {
      const { manifest } = loadManifest(a.manifest);
      assert(manifest.provenance.gateway, 'pinned C source required');
      const validate = compileComplaintSchema(
        path.resolve(a['gateway-root']),
        manifest.provenance.gateway,
      );
      console.log(
        canonical(
          complaintReport(
            loadComplaintInput(a.complaint, manifest.provenance.gateway),
            validate,
            manifest.gates.complaint,
            a.labels ? readJSON(a.labels) : [],
          ),
        ),
      );
    } else
      console.log(canonical(a.run ? reportRun(path.resolve(a.run)) : analyze(readJSON(a.input))));
  });
