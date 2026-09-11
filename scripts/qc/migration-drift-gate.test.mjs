import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDrift, renderGaps } from './migration-drift-gate.mjs';

test('evaluateDrift passes on a clean inventory', () => {
  const drift = evaluateDrift({ duplicateAuthorities: [], schemaGaps: [] });
  assert.equal(drift.pass, true);
  assert.deepEqual(drift.failures, []);
});

test('evaluateDrift fails closed on a duplicate-authority conflict before any mutation', () => {
  const inventory = { duplicateAuthorities: [{ kind: 'divergent-hash', schemaGroup: 'legacy-libsql', name: '0012_x.sql', entries: [{ tree: 'a', sha256: '1' }, { tree: 'b', sha256: '2' }] }], schemaGaps: [] };
  const drift = evaluateDrift(inventory);
  assert.equal(drift.pass, false);
  assert.equal(drift.failures.length, 1);
  assert.equal(drift.failures[0].kind, 'divergent-hash');
});

test('evaluateDrift fails on a verified-absent schema gap but not on an unavailable-environment gap', () => {
  const verified = evaluateDrift({ duplicateAuthorities: [], schemaGaps: [{ table: 'organizations', schemaGroup: 'hub-postgres', confidence: 'verified-absent-in-inventoried-migrations' }] });
  assert.equal(verified.pass, false);
  const unavailable = evaluateDrift({ duplicateAuthorities: [], schemaGaps: [{ table: 'organizations', schemaGroup: 'hub-postgres', confidence: 'unavailable-environment' }] });
  assert.equal(unavailable.pass, true);
});

test('renderGaps names an owner and a next gated plan for every failure, and never claims closure', () => {
  const inventory = { generatedAt: '2026-09-10T00:00:00.000Z', duplicateAuthorities: [{ kind: 'two-writers-same-prefix', schemaGroup: 'legacy-libsql', prefix: '0012', owners: [{ tree: 'a', name: '0012_alpha.sql' }, { tree: 'b', name: '0012_beta.sql' }] }], schemaGaps: [] };
  const drift = evaluateDrift(inventory);
  const doc = renderGaps(inventory, drift);
  assert.match(doc, /Owner:/);
  assert.match(doc, /does not close DATA-02 by itself/);
  assert.match(doc, /0012/);
});

test('renderGaps reports a clean pass without inventing a conflict', () => {
  const inventory = { generatedAt: '2026-09-10T00:00:00.000Z', duplicateAuthorities: [], schemaGaps: [] };
  const drift = evaluateDrift(inventory);
  const doc = renderGaps(inventory, drift);
  assert.match(doc, /No conflict detected/);
});

test('renderGaps flags an unassigned owner rather than fabricating one for an unmapped schema group', () => {
  const inventory = { generatedAt: '2026-09-10T00:00:00.000Z', duplicateAuthorities: [], schemaGaps: [{ table: 'ghost', schemaGroup: 'unmapped-schema', confidence: 'verified-absent-in-inventoried-migrations' }] };
  const drift = evaluateDrift(inventory);
  const doc = renderGaps(inventory, drift);
  assert.match(doc, /unassigned — root must name an owner/);
});
