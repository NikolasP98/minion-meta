import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { liveSetup, cli, ROOT } from '../fixtures/helpers.mjs';
import { openBudget, initializeRegistry } from './budget.mjs';
import { jsonl, writePrivate } from './common.mjs';
const reserve = (b, s, opts = {}) =>
  b.reserve({
    scope: s.config.scopes[0].accountingScopeId,
    alias: 'test-alias',
    attemptId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    upperMicroUsd: 10,
    bounds: s.m.bounds,
    binding: { test: true },
    ...opts,
  });
test('offline exclusive init returns identity only, no keys/trust/approval, reopen missing state fails', () => {
  const s = liveSetup();
  assert.deepEqual(fs.readdirSync(s.config.root).sort(), ['budget.jsonl', 'registry.json']);
  assert.throws(
    () =>
      initializeRegistry({
        root: s.config.root,
        registryId: crypto.randomUUID(),
        scopeId: crypto.randomUUID(),
        ownerRef: 'owner',
        purpose: 'x',
      }),
    /already exists/,
  );
  fs.unlinkSync(s.config.metadataPath);
  assert.throws(() => openBudget(s.config), /missing path/);
});
test('registry single lock, unresolved reservation across new run/day aliases, double settlement, overshoot and retirement', () => {
  const s = liveSetup(),
    scope = s.config.scopes[0].accountingScopeId;
  let b = openBudget(s.config);
  assert.throws(() => openBudget(s.config), /EEXIST/);
  const r = reserve(b, s);
  b.dispatched(scope, r.attemptId);
  b.received(scope, r.attemptId, {
    costStatus: 'known',
    costMicroUsd: 1,
    billingComplete: true,
    responseSha256: 'a'.repeat(64),
    resolvedModel: 'fixture/main',
  });
  b.settle(scope, r.attemptId);
  assert.throws(() => b.settle(scope, r.attemptId), /cannot settle/);
  b.close();
  b = openBudget(s.config);
  reserve(b, s, { alias: 'other', day: '2099-01-01' });
  b.close();
  b = openBudget(s.config);
  assert.throws(() => reserve(b, s, { alias: 'fresh', day: '2099-01-02' }), /unknown exposure/);
  b.retire('test-alias');
  b.close();
  b = openBudget(s.config);
  assert.throws(() => reserve(b, s, { alias: 'fresh' }), /retired/);
  b.close();
});
test('received result recovers local settlement without transport recall; corrupt/truncated journal rejects', () => {
  const s = liveSetup(),
    scope = s.config.scopes[0].accountingScopeId;
  let b = openBudget(s.config);
  const r = reserve(b, s);
  b.dispatched(scope, r.attemptId);
  b.received(scope, r.attemptId, {
    costStatus: 'known',
    costMicroUsd: 1,
    billingComplete: true,
    responseSha256: 'a'.repeat(64),
    resolvedModel: 'fixture/main',
  });
  b.close();
  b = openBudget(s.config);
  assert.equal(b.status(scope).attempts.get(r.attemptId).state, 'settled');
  b.close();
  fs.appendFileSync(s.config.journalPath, '{"truncated"');
  assert.throws(() => openBudget(s.config), /truncated/);
});
test('actual CLI killed after dispatch leaves stale lock + admission fence and never auto-replays', () => {
  const s = liveSetup();
  const first = cli(s, [], 'crash');
  assert.equal(first.signal, 'SIGKILL');
  assert.equal(jsonl(s.counter).length, 1);
  assert(fs.existsSync(path.join(s.config.root, 'writer.lock')));
  s.out = path.join(s.root, 'new-run');
  const second = cli(s);
  assert.equal(second.status, 1);
  assert.equal(jsonl(s.counter).length, 1);
  assert.equal(jsonl(s.config.journalPath).filter((e) => e.kind === 'reserved').length, 1);
});
test('actual CLI offline initializer has no transport or trust generation', () => {
  const s = liveSetup(),
    root = path.join(s.root, 'offline-new');
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts/agent-evals/run.mjs'),
      'init-budget-registry',
      '--root',
      root,
      '--registry-id',
      crypto.randomUUID(),
      '--scope-id',
      crypto.randomUUID(),
      '--owner-ref',
      'owner',
      '--purpose',
      'router',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fs.readdirSync(root).sort(), ['budget.jsonl', 'registry.json']);
});
test('exhausted scope budget and unknown fence survive next-day/new run aliases, known overshoot persists', () => {
  const s = liveSetup(),
    scope = s.config.scopes[0].accountingScopeId;
  let b = openBudget(s.config);
  const r = reserve(b, s, { upperMicroUsd: 10 });
  b.dispatched(scope, r.attemptId);
  b.received(scope, r.attemptId, {
    costStatus: 'known',
    costMicroUsd: 11,
    billingComplete: true,
    responseSha256: 'a'.repeat(64),
    resolvedModel: 'fixture/main',
  });
  assert.throws(() => b.settle(scope, r.attemptId), /exceeded/);
  b.close();
  b = openBudget(s.config);
  assert.throws(() => reserve(b, s, { alias: 'next-day', day: '2099-01-02' }), /overshoot/);
  b.close();
});
