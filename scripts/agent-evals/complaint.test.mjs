import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Ajv from 'ajv';
import { ROOT } from './fixtures/helpers.mjs';
import { readJSON, canonical, digest } from './lib/common.mjs';
import { complaintReport, reconcileComplaints, loadComplaintInput } from './complaint.mjs';
const root = path.join(ROOT, 'scripts/agent-evals/fixtures/c-gateway');
const raw = readJSON(path.join(root, 'complaint-evaluation-v1.json'));
const schema = readJSON(path.join(root, 'complaint-evaluation.schema.json'));
const ajv = new Ajv({ strict: true, allErrors: true });
ajv.addFormat('uuid', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const check = ajv.compile(schema);
const validate = (r) => {
  assert(check(r), ajv.errorsText(check.errors));
};
const fixture = () => structuredClone(raw[0]);
function eligible() {
  const r = fixture();
  r.eligibility = { status: 'eligible', reason: 'eligible' };
  r.requestedClassifierModel.revision = 'qualified-test-only';
  r.resolvedClassifierModel.revision = 'qualified-test-only';
  r.attempts[0].requestedModel.revision = 'qualified-test-only';
  r.attempts[0].resolvedModel.revision = 'qualified-test-only';
  return r;
}
test('C unchanged real SQLite provider-stub emitted fixture validates; model drift remains bypass and zero eligible stops', () => {
  raw.forEach(validate);
  assert.equal(
    loadComplaintInput(path.join(root, 'complaint-evaluation-v1.json'), {
      fixtureSha256: digest(fs.readFileSync(path.join(root, 'complaint-evaluation-v1.json'))),
    }).length,
    1,
  );
  assert.throws(
    () =>
      loadComplaintInput(path.join(root, 'complaint-evaluation-v1.json'), {
        fixtureSha256: '0'.repeat(64),
      }),
    /producer snapshot mismatch/,
  );
  const r = complaintReport(raw, validate);
  assert.equal(r.status, 'do_not_pilot:no_eligible_traffic');
  assert.equal(r.strata['bypass:model_drift'], 1);
  assert.equal(r.actualShadowCosts.knownUsd, 0.0000348);
  for (const sourceCase of ['custom', 'idless']) {
    const record = fixture();
    if (sourceCase === 'custom') {
      record.policyMode = 'custom';
      record.eligibility = { status: 'bypass', reason: 'custom_policy' };
    } else {
      record.sourceCertification = 'idless';
      record.sourceCertificationRevision = null;
      record.eligibility = { status: 'bypass', reason: 'uncertified_source' };
    }
    const report = complaintReport([record], validate);
    assert.equal(report.eligibleLogicalSources, 0);
    assert.equal(report.status, 'do_not_pilot:no_eligible_traffic');
    assert.equal(report.strata[`bypass:${record.eligibility.reason}`], 1);
  }
});
test('logical source and attempt dedupe do not lower actual shadow bills via counterfactual subset', () => {
  const r = eligible();
  r.mode = 'shadow';
  const gate = structuredClone(r.attempts[0]);
  gate.attemptId = crypto.randomUUID();
  gate.purpose = 'gate';
  gate.costUsd = 0.00001;
  r.attempts.push(gate);
  r.gate = {
    revision: 'test-only-gate',
    requestedModel: gate.requestedModel,
    resolvedModel: gate.resolvedModel,
    disposition: 'negative',
    attemptIds: [gate.attemptId],
  };
  r.forwardedBaselineAttemptIds = [];
  const report = complaintReport([r, r], validate);
  assert.equal(report.eligibleLogicalSources, 1);
  assert.equal(report.actualShadowCosts.attempts, 2);
  assert(report.actualShadowCosts.knownUsd > report.counterfactualActiveCosts.knownUsd);
  assert.equal(report.counterfactualActiveCosts.knownUsd, 0.00001);
  assert.equal(report.status, 'inconclusive');
});
test('same/higher revision conflict, immutable binding, known bill replacement quarantine instead of overwrite', () => {
  for (const mutate of [
    (r) => (r.inputHash = 'b'.repeat(64)),
    (r) => (r.attempts[0].costUsd = 0.9),
    (r) => (r.attempts[0].resolvedModel.model = 'drift'),
  ]) {
    const r = eligible(),
      next = structuredClone(r);
    next.receiptRevision++;
    mutate(next);
    const report = complaintReport([r, next], validate);
    assert.equal(report.quarantine.length, 1);
    assert.equal(report.status, 'do_not_pilot:no_eligible_traffic');
  }
  const r = eligible(),
    same = structuredClone(r);
  same.baseline.disposition = 'positive';
  assert.equal(reconcileComplaints([r, same], validate).quarantine.length, 1);
});
test('admitted to terminal extension preserves one cost; missing baseline/unknown gate/timeout never negative', () => {
  const terminal = eligible(),
    admitted = structuredClone(terminal);
  admitted.receiptRevision = 1;
  admitted.resultId = null;
  admitted.resolvedClassifierModel = null;
  admitted.baseline.disposition = 'unknown';
  admitted.attempts[0].disposition = 'admitted';
  admitted.attempts[0].costStatus = 'unknown';
  admitted.attempts[0].costUsd = null;
  admitted.attempts[0].costCoverage = 'incomplete';
  admitted.attempts[0].resolvedModel = null;
  admitted.costCoverage = 'incomplete';
  assert.equal(
    reconcileComplaints([terminal, admitted], validate).records[0].receiptRevision,
    terminal.receiptRevision,
  );
  const r = eligible();
  r.mode = 'shadow';
  r.baseline.attemptIds = [];
  r.attempts = [];
  r.forwardedBaselineAttemptIds = [];
  r.deadlineStatus = 'timeout';
  const report = complaintReport([r], validate);
  assert.equal(report.status, 'inconclusive');
  assert(report.reasons.includes('incomplete_baseline_or_cost'));
  const failed = eligible();
  failed.mode = 'shadow';
  failed.baseline.disposition = 'failed';
  const failedReport = complaintReport([failed], validate);
  assert.equal(failedReport.status, 'inconclusive');
  assert(failedReport.reasons.includes('incomplete_baseline_or_cost'));
});
test('actual strict C schema rejects invented aliases/missing nullable fields', () => {
  const r = fixture();
  r.eligibilityStatus = 'eligible';
  assert.throws(() => validate(r));
  delete r.eligibilityStatus;
  delete r.resultId;
  assert.throws(() => validate(r));
});
test('F-06 actual C 18-revision golden keeps one paid receipt across legal retry history', () => {
  const file = path.join(root, 'complaint-retry-revisions-v1.json');
  assert.equal(
    digest(fs.readFileSync(file)),
    'f7eecd61e3ac7bc7128851e14b72d537ba27f8565210101892950672e41736b9',
  );
  const records = readJSON(file);
  records.forEach(validate);
  for (const sequence of [records, [...records].reverse(), [...records, ...records]]) {
    const report = complaintReport(sequence, validate);
    assert.equal(report.logicalSources, 2);
    assert.equal(report.quarantine.length, 0);
    assert.equal(report.actualShadowCosts.attempts, 1);
    assert.equal(report.actualShadowCosts.knownUsd, 0.000009);
    assert.deepEqual(report.actualShadowCosts.unknownAttempts, []);
  }
});
test('F-07 actual C current-authority exports preserve historical eligible census and known bills including zero', () => {
  const records = readJSON(path.join(root, 'complaint-authority-evolution-v1.json'));
  records.forEach(validate);
  for (const sequence of [records, [...records].reverse(), [...records, ...records]]) {
    const report = complaintReport(sequence, validate);
    assert.equal(report.quarantine.length, 0);
    assert.equal(report.eligibleLogicalSources, 2);
    assert.equal(report.currentEligibleLogicalSources, 0);
    assert.equal(report.actualShadowCosts.attempts, 2);
    assert.equal(report.actualShadowCosts.knownUsd, 0.000009);
    assert.equal(report.eligibleActualCosts.knownUsd, 0.000009);
    assert.deepEqual(report.actualShadowCosts.unknownAttempts, []);
    assert(
      report.eligibilityHistory.every(
        (r) => r.historicallyEligible && r.current.status !== 'eligible',
      ),
    );
  }
  for (const field of ['inputHash', 'policyHash', 'authorityNamespaceHash']) {
    const altered = structuredClone(records);
    altered[1][field] = 'a'.repeat(64);
    assert(complaintReport(altered, validate).quarantine.length > 0, field);
  }
});
