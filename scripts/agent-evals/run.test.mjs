import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setup, cli } from './fixtures/helpers.mjs';
import { scoreEpisode, dedupe } from './lib/receipts.mjs';
import { parse, readJSON, digest, writePrivate } from './lib/common.mjs';
test('actual CLI synthetic protocol unit: fixture default all3 matched arms, private append-only artifacts, zero paid calls', () => {
  const s = setup(),
    r = cli(s);
  assert.equal(r.status, 0, r.stderr);
  const result = readJSON(path.join(s.out, 'result.json'));
  assert.equal(result.status, 'complete');
  assert.equal(result.analysis.observations.length, 3);
  assert.equal(new Set(Object.values(result.resetHashes)).size, 1);
  assert.equal(result.paidRequests, 0);
  assert.equal(fs.statSync(s.out).mode & 0o777, 0o700);
  for (const f of ['events.jsonl', 'receipts.jsonl', 'result.json'])
    assert.equal(fs.statSync(path.join(s.out, f)).mode & 0o777, 0o600);
  assert.equal(cli(s).status, 1);
});
test('strict JSON duplicate keys and conflicting IDs reject/quarantine', () => {
  assert.throws(() => parse('{"x":1,"x":2}'), /duplicate/);
  assert.deepEqual(
    dedupe([
      { id: 'a', x: 1 },
      { id: 'a', x: 2 },
    ]).quarantine,
    ['a'],
  );
});
test('missing domain/network receipts and forged scope cannot score success', () => {
  const s = setup(),
    e = readJSON(path.join(s.croot, 'development/e1.json'));
  e.expectedReceipts = ['sandbox.upsert_element'];
  const c = {
    receipts: [],
    network: { externalRequests: 0 },
    identity: { disposable: true },
    incomplete: false,
    answerTexts: ['fixture answer'],
  };
  assert.equal(scoreEpisode(e, c).outcome, 'indeterminate');
  c.receipts = [
    {
      actionId: 'x',
      tool: 'sandbox.upsert_element',
      disposition: 'committed',
      beforeStateHash: digest('before'),
      afterStateHash: digest('after'),
      orgId: 'wrong',
      episodeId: e.episodeId,
    },
  ];
  assert.equal(scoreEpisode(e, c).outcome, 'incorrect');
  delete c.network;
  assert.equal(scoreEpisode(e, c).outcome, 'indeterminate');
});
test('dead child, adapter drift, holdout refusal before execution', () => {
  const s = setup();
  fs.appendFileSync(
    path.join(s.hub, 'tests/fixtures/critical-journeys/eval-adapter.mjs'),
    '\nprocess.exit(3)',
  );
  const r = cli(s);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /adapter drift/);
  assert(!fs.existsSync(s.out));
});
test('real run reports rejoin durable receipts; screen run never opens corpus gold labels', async () => {
  const { reportRun } = await import('./report.mjs');
  const { screenInputFromRun } = await import('./screen.mjs');
  const s = setup();
  s.m.gates.screen = {
    budget: 2,
    controls: 1,
    seed: 7,
    missBounds: { major: 0.05, urgent: 0.01, critical: 0.01 },
    uncertainty: 'stratified_bootstrap_v1',
    labelRevision: 'independent-v1',
  };
  writePrivate(s.manifestPath, s.m, false);
  const result = cli(s);
  assert.equal(result.status, 0, result.stderr);
  fs.unlinkSync(path.join(s.croot, 'development/e1.labels.json'));
  const input = screenInputFromRun(s.out);
  assert.equal(input.traces.length, 3);
  assert(input.traces.every((t) => t.semantic.outcome === 'abstain'));
  const file = path.join(s.out, 'receipts.jsonl');
  const records = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
  const index = records.findIndex((r) => r.kind === 'collection');
  records.splice(index, 1);
  fs.writeFileSync(file, records.map(JSON.stringify).join('\n') + '\n');
  const report = reportRun(s.out);
  assert(report.cohorts[0].comparisons.jev.reasons.includes('incomplete_receipts'));
});
