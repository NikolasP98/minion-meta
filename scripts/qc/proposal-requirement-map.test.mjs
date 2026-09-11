import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { buildDispositionMap, inventorySnapshot, requirementsFrom, renderDispositionMap } from './proposal-requirement-map.mjs';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-dispositions-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, '.planning'));
  fs.writeFileSync(path.join(root, '.planning/REQUIREMENTS.md'), '- [ ] **JOB-01**: Fence jobs.\n- [ ] **UI-01**: Dialog focus.\n');
  for (const snapshot of ['.', 'reference']) for (const kind of ['specs', 'proposals']) {
    const directory = path.join(root, snapshot, kind);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'index.json'), JSON.stringify({ [kind]: [] }));
  }
  return root;
}
function document(root, snapshot, status, body = 'A durable job outbox.') {
  const directory = path.join(root, snapshot, 'specs');
  const source = `---\nid: effect-plan\ntitle: Effect plan\nstatus: ${status}\ncreated: 2026-09-09\n---\n\n${body}\n`;
  fs.writeFileSync(path.join(directory, 'effect.md'), source);
  fs.writeFileSync(path.join(directory, 'index.json'), JSON.stringify({ specs: [{ id: 'effect-plan', title: 'Effect plan', status }] }));
}

test('keeps conflicting histories and retirement stronger than stale approval prose', () => {
  const root = fixture();
  document(root, '.', 'approved');
  document(root, 'reference', 'retired', '**Status:** Approved\nA durable job outbox.');
  const result = buildDispositionMap(root, ['.', 'reference']);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.records[1].disposition, 'retired-with-stale-approval-body');
  assert.equal(result.requirements[0].candidates.length, 2);
  assert.equal(result.requirements[1].candidates.length, 0);
  assert.equal(result.requirements[0].disposition, 'candidate-links-require-body-and-source-review');
  assert.match(renderDispositionMap(result), /never approval/);
});

test('does not infer implementation from a shipped status or skip supporting artifacts', () => {
  const root = fixture();
  document(root, '.', 'shipped');
  fs.writeFileSync(path.join(root, 'specs/effect.review.md'), '# Review\nNot accepted.');
  const result = inventorySnapshot(root, '.');
  assert.equal(result.records.length, 2);
  assert.ok(result.records.some((r) => r.disposition === 'declared-complete-not-reverified'));
  assert.ok(result.records.some((r) => r.support));
  assert.deepEqual(result.issues, []);
});

test('reports body/index drift and missing bodies instead of claiming convergence', () => {
  const root = fixture();
  document(root, '.', 'draft');
  fs.writeFileSync(path.join(root, 'specs/index.json'), JSON.stringify({ specs: [
    { id: 'effect-plan', title: 'Stale', status: 'shipped' },
    { id: 'missing', title: 'Missing', status: 'draft' },
  ] }));
  assert.equal(inventorySnapshot(root, '.').issues.length, 2);
});

test('rejects incomplete/duplicate manifests and duplicate requirements', () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, 'specs/index.json'), JSON.stringify({ specs: [{ id: 'x' }] }));
  assert.throws(() => inventorySnapshot(root, '.'), /Incomplete/);
  const row = { id: 'x', title: 'x', status: 'draft' };
  fs.writeFileSync(path.join(root, 'specs/index.json'), JSON.stringify({ specs: [row, row] }));
  assert.throws(() => inventorySnapshot(root, '.'), /duplicate/);
  assert.throws(() => requirementsFrom('- [ ] **JOB-01**: One.\n- [ ] **JOB-01**: Two.'), /duplicate/);
  assert.throws(() => requirementsFrom('No requirements'), /Missing/);
});

test('rejects path traversal and environment aliases before document reads', () => {
  const root = fixture();
  assert.throws(() => inventorySnapshot(root, '../outside'), /Unsafe/);
  fs.writeFileSync(path.join(root, '.env.fixture'), 'SYNTHETIC=fixture');
  fs.symlinkSync('../.env.fixture', path.join(root, 'specs/alias.md'));
  assert.throws(() => inventorySnapshot(root, '.'), /environment file/);
});

test('missing reference snapshot remains an explicit inventory gap', () => {
  const root = fixture();
  const result = buildDispositionMap(root, ['.', 'missing-reference']);
  assert.deepEqual(result.issues, ['missing-reference: declared snapshot unavailable']);
});

test('inventories nested Markdown with hashes without inventing index membership', () => {
  const root = fixture();
  const nested = path.join(root, 'specs/research');
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(nested, 'stock.md'), '# Stock ledger\nA durable job effect.');
  const result = buildDispositionMap(root, ['.']);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].path, 'specs/research/stock.md');
  assert.equal(result.records[0].nested, true);
  assert.match(result.records[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.requirements[0].candidates.length, 1);
  assert.deepEqual(result.issues, []);
});

test('a requirement description change invalidates rendered inventory', () => {
  const root = fixture();
  const before = renderDispositionMap(buildDispositionMap(root, ['.']));
  fs.writeFileSync(path.join(root, '.planning/REQUIREMENTS.md'), '- [ ] **JOB-01**: Fence jobs and reject stale owners.\n- [ ] **UI-01**: Dialog focus.\n');
  const after = renderDispositionMap(buildDispositionMap(root, ['.']));
  assert.notEqual(before, after);
  assert.match(after, /Fence jobs and reject stale owners/);
});

test('rejects partial malformed requirements and duplicate lifecycle keys', () => {
  assert.throws(() => requirementsFrom('- [ ] **JOB-01**: Valid.\n- [ ] **UI-01**: '), /Malformed/);
  assert.throws(() => requirementsFrom('- [ ] **JOB-01**: Valid.\n- [ ] **UI-01** Missing colon.'), /Malformed/);
  const root = fixture();
  document(root, '.', 'draft');
  const target = path.join(root, 'specs/effect.md');
  fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('status: draft', 'status: draft\nstatus: approved'));
  assert.throws(() => inventorySnapshot(root, '.'), /Duplicate document frontmatter key/);
});

test('rejects directory symlinks instead of omitting an unreviewed subtree', () => {
  const root = fixture();
  fs.symlinkSync('../proposals', path.join(root, 'specs/linked-docs'));
  assert.throws(() => inventorySnapshot(root, '.'), /Unreviewed inventory symlink/);
});
