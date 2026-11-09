import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';
import { setup, liveSetup, cli, ROOT, temp } from './fixtures/helpers.mjs';
import { digest, canonical, writePrivate, readJSON, jsonl } from './lib/common.mjs';
const reportCli = (input) => {
  const root = temp(),
    file = path.join(root, 'input.json');
  writePrivate(file, input);
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/agent-evals/report.mjs'), '--input', file],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};
const reportRunCli = (s) => {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/agent-evals/report.mjs'), '--run', s.out],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};
function repeated() {
  const observations = [];
  for (let i = 0; i < 60; i++)
    for (const arm of ['full', 'jev', 'core_discovery'])
      for (let repeat = 0; repeat < (i < 30 ? 2 : 1); repeat++)
        observations.push({
          episodeId: `e${i}`,
          clusterId: `c${i}`,
          arm,
          repeat,
          cohort: { source: 'review-synthetic', model: 'frozen', rubric: 'v1' },
          outcome: arm === 'full' || repeat === 0 ? 'success' : 'incorrect',
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
    seed: 17,
    minimumClusters: 60,
    humanCorpusReady: true,
    expectedEpisodes: Array.from({ length: 60 }, (_, i) => `e${i}`),
    repeatAggregation: 'all_repeats',
    preregistration: {
      stopping:
        'fixed matched repeats; each repeat is a started trial; successful trials each count; resample whole episode clusters',
      expansion: 'none',
    },
  };
}
test('F-01 public report preserves each matched repeat as a trial inside episode clusters', () => {
  const r = reportCli(repeated()).cohorts[0];
  assert.equal(r.arms.full.started, 90);
  assert.equal(r.arms.full.successes, 90);
  assert.equal(r.arms.full.cpsMicroUsd, 100);
  assert.equal(r.arms.jev.successes, 60);
  assert.equal(r.arms.jev.cpsMicroUsd, 75);
  assert.equal(r.arms.full.p95LatencyMs, 100);
  assert.equal(r.comparisons.jev.bootstrap.point.costRatio, 0.75);
  assert(Math.abs(r.comparisons.jev.bootstrap.point.successDifference + 1 / 3) < 1e-12);
});
test('F-01 public report refuses nonmatching repeat sets and unsupported estimands', () => {
  const input = repeated();
  input.observations = input.observations.filter((o) => o.arm === 'full' || o.repeat === 0);
  const r = reportCli(input);
  assert.notEqual(r.status, 'candidate_eligible_for_human_review');
  assert(r.cohorts[0].comparisons.jev.reasons.includes('unmatched_repeat_sets'));
  const bad = repeated();
  bad.repeatAggregation = 'all_successes_then_sum_latency';
  const root = temp(),
    f = path.join(root, 'input.json');
  writePrivate(f, bad);
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/agent-evals/report.mjs'), '--input', f],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
});
test('F-02 public report rejects foreign root/submission/parent/cluster and reconstructs unknown bills', async () => {
  const s = setup();
  assert.equal(cli(s).status, 0);
  const p = path.join(s.out, 'receipts.jsonl'),
    original = jsonl(p);
  for (const field of ['rootId', 'submissionId', 'parentId', 'clusterId']) {
    const rows = structuredClone(original);
    for (const r of rows.filter((r) => r.kind === 'provider_settled'))
      r[field] = field === 'clusterId' ? 'foreign' : crypto.randomUUID();
    fs.writeFileSync(p, rows.map(canonical).join('\n') + '\n');
    const report = reportRunCli(s);
    assert(
      Object.values(report.cohorts[0].arms).every((a) => a.successes === 0),
      field,
    );
    assert(report.cohorts[0].comparisons.jev.reasons.includes('incomplete_receipts'), field);
  }
  const rows = structuredClone(original);
  for (const r of rows.filter((r) => r.kind === 'provider_settled'))
    Object.assign(r.payload, {
      costStatus: 'unknown',
      costMicroUsd: null,
      exactCostUsd: null,
      upperMicroUsd: null,
    });
  fs.writeFileSync(p, rows.map(canonical).join('\n') + '\n');
  const report = reportRunCli(s);
  assert(Object.values(report.cohorts[0].arms).every((a) => a.knownBillCoverage === 0));
  assert(report.cohorts[0].comparisons.jev.reasons.includes('unbounded_cost'));
  assert(
    Object.values(report.cohorts[0].arms).every(
      (a) =>
        a.successes === 1 && a.executionReceiptCoverage === 1 && a.billingReceiptCoverage === 0,
    ),
  );
  assert(report.cohorts[0].comparisons.jev.reasons.includes('incomplete_billing'));
  assert(!report.cohorts[0].comparisons.jev.reasons.includes('incomplete_receipts'));
});
test('F-04 traversal IDs never write raw collections outside out and every raw file can be redacted', () => {
  const s = setup(),
    e = readJSON(path.join(s.croot, 'development/e1.json')),
    labels = readJSON(path.join(s.croot, 'development/e1.labels.json'));
  e.episodeId = '../../../../review-escaped';
  labels[0].episodeId = e.episodeId;
  labels[0].sourceSha256 = digest(e);
  const index = s.split.entries[0];
  Object.assign(index, {
    episodeId: e.episodeId,
    episodeSha256: digest(e),
    labelSha256: digest(labels),
  });
  writePrivate(path.join(s.croot, index.body), e, false);
  writePrivate(path.join(s.croot, index.labels), labels, false);
  writePrivate(path.join(s.croot, 'split.json'), s.split, false);
  s.m.corpus.episodeIds = [e.episodeId];
  s.m.corpus.splitSha256 = digest(s.split);
  writePrivate(s.manifestPath, s.m, false);
  const r = cli(s);
  assert.equal(r.status, 0, r.stderr);
  for (const arm of ['full', 'jev', 'core_discovery'])
    assert(!fs.existsSync(path.join(s.out, `raw/collection-${e.episodeId}-${arm}.json`)));
  const result = readJSON(path.join(s.out, 'result.json'));
  for (const relative of result.rawFiles) {
    assert(path.resolve(s.out, relative).startsWith(s.out + '/raw/'));
    assert(!relative.includes('..'));
  }
  const redaction = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts/agent-evals/run.mjs'),
      'redact',
      '--run',
      s.out,
      '--deletion-ref',
      'test-only-delete',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(redaction.status, 0, redaction.stderr);
  assert.equal(fs.readdirSync(path.join(s.out, 'raw')).length, 0);
});
test('F-05 public screen unique IDs determine budget; conflicts quarantine instead of last-write-wins', () => {
  const root = temp(),
    trace = {
      id: 'one',
      allowedTools: [],
      tools: [],
      actions: [],
      receipts: [],
      terminal: 'success',
      sends: [],
      cancelAt: null,
      citations: [],
      supportedIds: [],
      semantic: { rubricRevision: 'v1', outcome: 'pass', evidence: [] },
    },
    input = path.join(root, 'input.json'),
    labels = path.join(root, 'labels.json');
  writePrivate(labels, []);
  writePrivate(input, {
    traces: Array.from({ length: 100 }, () => structuredClone(trace)),
    registration: {
      budget: 100,
      controls: 50,
      seed: 1,
      missBounds: { major: 0.1, urgent: 0.1, critical: 0.1 },
      uncertainty: 'stratified_bootstrap_v1',
      labelRevision: 'v1',
    },
  });
  const run = () =>
    spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/agent-evals/screen.mjs'), '--input', input, '--labels', labels],
      { encoding: 'utf8' },
    );
  assert.notEqual(run().status, 0);
});
test('F-06 unknown admitted complaint receipt becomes known zero exactly once', async () => {
  const { complaintReport } = await import('./complaint.mjs');
  const root = path.join(ROOT, 'scripts/agent-evals/fixtures/c-gateway'),
    schema = readJSON(path.join(root, 'complaint-evaluation.schema.json')),
    terminal = readJSON(path.join(root, 'complaint-evaluation-v1.json'))[0];
  const ajv = new Ajv({ strict: true });
  ajv.addFormat('uuid', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  const check = ajv.compile(schema),
    validate = (r) => assert(check(r));
  terminal.attempts[0].costUsd = 0;
  const admitted = structuredClone(terminal);
  Object.assign(admitted, {
    receiptRevision: 1,
    resultId: null,
    resolvedClassifierModel: null,
    costCoverage: 'incomplete',
  });
  admitted.baseline.disposition = 'unknown';
  Object.assign(admitted.attempts[0], {
    disposition: 'admitted',
    costStatus: 'unknown',
    costUsd: null,
    costCoverage: 'incomplete',
    resolvedModel: null,
  });
  for (const records of [
    [admitted, terminal],
    [terminal, admitted, terminal],
  ]) {
    const report = complaintReport(records, validate);
    assert.equal(report.actualShadowCosts.knownUsd, 0);
    assert.equal(report.actualShadowCosts.attempts, 1);
    assert.deepEqual(report.actualShadowCosts.unknownAttempts, []);
  }
});
for (const boundary of ['between_calls', 'reserved_fsync', 'dispatched_fsync'])
  test(`F-03 actual live CLI rechecks signed expiry at ${boundary}`, () => {
    const s = liveSetup(),
      approval = readJSON(s.approvalPath),
      expires = Date.now() + (boundary === 'between_calls' ? 5000 : 30000);
    approval.payload.expiresAt = new Date(expires).toISOString();
    approval.signature = crypto
      .sign(null, Buffer.from(canonical(approval.payload)), s.pair.privateKey)
      .toString('base64');
    writePrivate(s.approvalPath, approval, false);
    const preload = path.join(s.root, 'expiry-preload.mjs');
    writePrivate(
      preload,
      `import fs from'node:fs';import net from'node:net';net.Socket.prototype.connect=()=>{throw Error('external network forbidden')};const RealDate=Date;let forced=null;globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[forced??RealDate.now()]));}static now(){return forced??RealDate.now();}};const write=fs.writeSync.bind(fs),sync=fs.fsyncSync.bind(fs),pending=new Set();fs.writeSync=(fd,...a)=>{const r=write(fd,...a);if(String(a[0]).includes('"kind":"${boundary === 'dispatched_fsync' ? 'dispatched' : 'reserved'}"'))pending.add(fd);return r;};fs.fsyncSync=fd=>{const r=sync(fd);if('${boundary}'!=='between_calls'&&pending.delete(fd))forced=${expires + 1};return r;};globalThis.fetch=async(url,options)=>{if(url!=='https://openrouter.ai/api/v1/chat/completions')throw Error('unexpected provider URL');fs.appendFileSync(${JSON.stringify(s.counter)},JSON.stringify({at:Date.now()})+'\\n');if('${boundary}'==='between_calls')forced=${expires + 1};return Response.json({model:JSON.parse(options.body).model,choices:[{message:{content:'fixture answer'}}],usage:{prompt_tokens:2,completion_tokens:2,cost:.000001}});};`,
    );
    const command = [
      process.execPath,
      '--import',
      preload,
      path.join(ROOT, 'scripts/agent-evals/run.mjs'),
      '--live',
      '--manifest',
      s.manifestPath,
      '--hub-root',
      s.hub,
      '--out',
      s.out,
      '--approval',
      s.approvalPath,
      '--operator-config',
      s.configPath,
      '--trusted-key',
      s.keyPath,
      '--owner-ref',
      'test-owner',
      '--credential-file',
      s.credentialFile,
    ];
    const r = spawnSync(command[0], command.slice(1), {
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
      encoding: 'utf8',
      timeout: 15000,
    });
    const calls = jsonl(s.counter);
    assert.equal(calls.filter((c) => c.at >= expires).length, 0, r.stderr);
    assert.equal(calls.length, boundary === 'between_calls' ? 1 : 0);
    assert.notEqual(r.status, 0);
    if (boundary !== 'between_calls')
      assert(
        jsonl(s.config.journalPath).some(
          (e) =>
            e.kind === 'not_dispatched' &&
            e.costMicroUsd === 0 &&
            e.proof === 'live_adapter_transport_not_entered_v1',
        ),
      );
    assert.equal(jsonl(s.config.journalPath).filter((e) => e.kind === 'reserved').length, 1);
  });
test('F-02 screening shares typed execution joins while unknown billing preserves confirmed task outcome', async () => {
  const { screenInputFromRun, scoreTraces } = await import('./screen.mjs');
  const s = setup();
  s.m.gates.screen = {
    budget: 2,
    controls: 1,
    seed: 7,
    missBounds: { major: 0.1, urgent: 0.1, critical: 0.1 },
    uncertainty: 'stratified_bootstrap_v1',
    labelRevision: 'v1',
  };
  writePrivate(s.manifestPath, s.m, false);
  assert.equal(cli(s).status, 0);
  const p = path.join(s.out, 'receipts.jsonl'),
    records = jsonl(p),
    foreign = structuredClone(records);
  for (const r of foreign.filter((r) => r.kind === 'provider_settled'))
    r.parentId = crypto.randomUUID();
  fs.writeFileSync(p, foreign.map(canonical).join('\n') + '\n');
  assert(scoreTraces(screenInputFromRun(s.out).traces).every((t) => t.critical));
  for (const r of records.filter((r) => r.kind === 'provider_settled'))
    r.payload.usage.costUsd = null;
  fs.writeFileSync(p, records.map(canonical).join('\n') + '\n');
  const report = reportRunCli(s);
  assert(
    Object.values(report.cohorts[0].arms).every(
      (a) => a.successes === 1 && a.knownBillCoverage === 0,
    ),
  );
  const input = screenInputFromRun(s.out);
  assert(
    input.traces.every((t) => t.executionProblems.length === 0 && t.billingProblems.length > 0),
  );
  assert(
    scoreTraces(input.traces).every(
      (t) =>
        !t.critical &&
        t.deterministic.some((c) => c.name === 'billing_coverage' && c.outcome === 'abstain'),
    ),
  );
});
test('F-05 exact exports retain unique probabilities; conflicting IDs quarantine and cannot tighten confidence', async () => {
  const { scoreTraces, screenExperiment } = await import('./screen.mjs');
  const traces = Array.from({ length: 10 }, (_, i) => ({
    id: `trace-${i}`,
    allowedTools: [],
    tools: [],
    actions: [],
    receipts: [],
    terminal: 'success',
    sends: [],
    cancelAt: null,
    citations: [],
    supportedIds: [],
    semantic: { rubricRevision: 'v1', outcome: 'pass', evidence: [] },
  }));
  const labels = traces.map((t) => ({
    id: t.id,
    revision: 'v1',
    method: 'synthetic_software',
    blindToScreen: true,
    failure: false,
    severity: 'major',
    traceSha256: scoreTraces([t])[0].sourceSha256,
    actorRef: 'test-author',
    reviewerRef: 'test-reviewer',
    adjudicationRef: 'synthetic',
    adjudicatedAt: '2026-10-23T00:00:00Z',
    rubricRevision: 'gold-v1',
  }));
  const registration = {
    budget: 4,
    controls: 2,
    seed: 7,
    missBounds: { major: 0.1, urgent: 0.1, critical: 0.1 },
    uncertainty: 'stratified_bootstrap_v1',
    labelRevision: 'v1',
  };
  const baseline = screenExperiment(traces, labels, registration),
    duplicated = screenExperiment(
      [...traces, ...Array.from({ length: 100 }, () => structuredClone(traces[0]))],
      labels,
      registration,
    );
  assert.deepEqual(duplicated, baseline);
  assert.equal(duplicated.prioritized.uniquePopulation, 10);
  assert.equal(new Set(duplicated.prioritized.selection.map((s) => s.id)).size, 4);
  const conflict = structuredClone(traces[0]);
  conflict.allowedTools = ['foreign'];
  const quarantined = screenExperiment(
    [...traces, conflict],
    labels.filter((l) => l.id !== 'trace-0'),
    registration,
  );
  assert.deepEqual(quarantined.quarantine, ['trace-0']);
  assert.equal(quarantined.prioritized.uniquePopulation, 9);
  assert.equal(quarantined.prioritized.status, 'inconclusive');
  assert(!quarantined.prioritized.selection.some((s) => s.id === 'trace-0'));
});
