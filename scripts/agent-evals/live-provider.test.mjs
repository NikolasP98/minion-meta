import test from 'node:test';
import { spawnSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { liveSetup, cli } from './fixtures/helpers.mjs';
import { readJSON, writePrivate, jsonl, digest } from './lib/common.mjs';
test('actual live CLI + actual live provider adapter reaches stub after durable admission all3 arms', () => {
  const s = liveSetup(),
    r = cli(s);
  assert.equal(r.status, 0, r.stderr);
  const calls = jsonl(s.counter);
  assert.equal(calls.length, 3);
  assert(calls.every((c) => c.url === 'https://openrouter.ai/api/v1/chat/completions'));
  const journal = jsonl(s.config.journalPath);
  assert.equal(journal.filter((e) => e.kind === 'settled').length, 3);
  for (const e of journal.filter((e) => e.kind === 'dispatched'))
    assert(
      journal.find(
        (r) => r.kind === 'reserved' && r.attemptId === e.attemptId && r.sequence < e.sequence,
      ),
    );
  assert.equal(readJSON(path.join(s.out, 'result.json')).paidRequests, 3);
});
test('missing/expired approval, zero budget, model/source/config drift dispatch zero', () => {
  for (const mutate of [
    (s) => fs.unlinkSync(s.approvalPath),
    (s) => {
      const a = readJSON(s.approvalPath);
      a.payload.expiresAt = '2020-01-01T00:00:00Z';
      writePrivate(s.approvalPath, a, false);
    },
    (s) => (s.m.bounds.perCallMicroUsd = 0),
    (s) => (s.m.provenance.model.requested = 'changed'),
    (s) => (s.m.provenance.hub.buildSha256 = 'f'.repeat(64)),
    (s) => (s.m.accounting.trustedOperatorConfigSha256 = 'e'.repeat(64)),
  ]) {
    const s = liveSetup();
    mutate(s);
    writePrivate(s.manifestPath, s.m, false);
    const r = cli(s);
    assert.equal(r.status, 1);
    assert.equal(jsonl(s.counter).length, 0);
  }
});
test('unknown/partial/lost response fence every alias/restart/day; actual bill retained on malformed/model drift', () => {
  for (const behavior of ['unknown', 'partial', 'loss', 'malformed', 'drift']) {
    const s = liveSetup(),
      r = cli(s, [], behavior);
    assert.equal(r.status, 1, behavior);
    assert.equal(jsonl(s.counter).length, 1, behavior);
    const journal = jsonl(s.config.journalPath);
    assert(journal.some((e) => e.kind === 'reserved'));
    if (['malformed', 'drift'].includes(behavior)) {
      assert(journal.some((e) => e.kind === 'settled' && e.costMicroUsd === 1));
      const result = readJSON(path.join(s.out, 'result.json'));
      assert.equal(result.analysis.observations[0].costMicroUsd, 1);
    } else {
      assert(journal.some((e) => e.kind === 'unknown'));
      s.approve('new-alias');
      s.out = path.join(s.root, 'reopened-output');
      assert.equal(cli(s).status, 1);
      assert.equal(jsonl(s.counter).length, 1);
    }
  }
});
test('alternate journal assertion/symlink/copy/missing/replaced registry can never initialize/reset accounting', () => {
  for (const mutation of [
    (s) => ['--budget-journal', path.join(s.root, 'alternative.jsonl')],
    (s) => {
      const alias = path.join(s.root, 'journal-alias');
      fs.symlinkSync(s.config.journalPath, alias);
      return ['--budget-journal', alias];
    },
    (s) => {
      fs.unlinkSync(s.config.journalPath);
      return [];
    },
    (s) => {
      const p = s.config.journalPath;
      fs.renameSync(p, `${p}.old`);
      fs.copyFileSync(`${p}.old`, p);
      return [];
    },
  ]) {
    const s = liveSetup(),
      extra = mutation(s),
      r = cli(s, extra);
    assert.equal(r.status, 1);
    assert.equal(jsonl(s.counter).length, 0);
    assert(!fs.existsSync(path.join(s.root, 'alternative.jsonl')));
  }
});
test('scope retirement via actual CLI fences every newly signed alias; unknown namespace cannot be created', () => {
  const s = liveSetup();
  assert.equal(cli(s).status, 0);
  const command = path.join(import.meta.dirname, 'run.mjs');
  const retired = spawnSync(
    process.execPath,
    [command, 'retire-namespace', '--operator-config', s.configPath, '--namespace', 'test-alias'],
    { encoding: 'utf8' },
  );
  assert.equal(retired.status, 0, retired.stderr);
  s.approve('renewed-alias');
  s.out = path.join(s.root, 'renewed-output');
  assert.equal(cli(s).status, 1);
  assert.equal(jsonl(s.counter).length, 3);
  const invalid = spawnSync(
    process.execPath,
    [
      command,
      'retire-namespace',
      '--operator-config',
      s.configPath,
      '--namespace',
      'never-admitted',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(invalid.status, 1);
});

test('actual concurrent CLI processes share canonical lock; alternate journal makes zero calls and cannot mint allowance', async () => {
  const s = liveSetup();
  const argv = [
    '--import',
    path.join(import.meta.dirname, 'fixtures/stub-provider.mjs'),
    path.join(import.meta.dirname, 'run.mjs'),
    '--manifest',
    s.manifestPath,
    '--hub-root',
    s.hub,
    '--out',
    s.out,
    '--live',
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
  const child = spawn(process.execPath, argv, {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      MINION_EVAL_TEST_COUNTER: s.counter,
      MINION_EVAL_TEST_BEHAVIOR: 'hold',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (b) => (stderr += b));
  const exited = new Promise((resolve) =>
    child.once('exit', (code, signal) => resolve({ code, signal })),
  );
  const deadline = Date.now() + 10000;
  while (!jsonl(s.counter).length) {
    assert(Date.now() < deadline, 'first CLI did not dispatch');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const before = jsonl(s.counter).length;
  s.out = path.join(s.root, 'parallel-alias');
  assert.equal(cli(s, ['--budget-journal', path.join(s.root, 'other-ledger')]).status, 1);
  assert.equal(jsonl(s.counter).length, before);
  s.out = path.join(s.root, 'parallel-canonical');
  assert.equal(cli(s).status, 1);
  const status = await exited;
  assert.equal(status.code, 0, stderr);
  assert.equal(jsonl(s.counter).length, 3);
  assert(!fs.existsSync(path.join(s.root, 'other-ledger')));
});
test('copied registry with valid new test signature still fails original filesystem identity and preserves unknown', () => {
  const s = liveSetup();
  assert.equal(cli(s, [], 'loss').status, 1);
  assert.equal(jsonl(s.counter).length, 1);
  const copied = path.join(s.root, 'registry-copy');
  fs.cpSync(s.config.root, copied, { recursive: true });
  const c = {
    ...s.config,
    root: copied,
    metadataPath: path.join(copied, 'registry.json'),
    journalPath: path.join(copied, 'budget.jsonl'),
  };
  writePrivate(s.configPath, c, false);
  s.m.accounting.trustedOperatorConfigSha256 = digest(c);
  writePrivate(s.manifestPath, s.m, false);
  s.approve('copied-alias');
  s.out = path.join(s.root, 'copied-output');
  assert.equal(cli(s).status, 1);
  assert.equal(jsonl(s.counter).length, 1);
});
test('known day expenditure survives new manifest/run/approval alias', () => {
  const s = liveSetup();
  s.m.bounds.dayMicroUsd = 3000;
  writePrivate(s.manifestPath, s.m, false);
  s.approve();
  assert.equal(cli(s, [], 'costly').status, 1);
  assert.equal(jsonl(s.counter).length, 1);
  s.m.experimentId = 'renewed-test-intent';
  writePrivate(s.manifestPath, s.m, false);
  s.approve('renewed-budget-alias');
  s.out = path.join(s.root, 'renewed-budget-output');
  assert.equal(cli(s).status, 1);
  assert.equal(jsonl(s.counter).length, 1);
});
