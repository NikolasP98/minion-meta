import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { safeSource, inventoryTree, detectDuplicateAuthority, detectSchemaGaps, checkAppliedCatalogAvailability, buildInventory, renderReport } from './migration-authority.mjs';

function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-migration-authority-'));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function write(root, relative, content) {
  const abs = path.join(root, relative);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

test('safeSource rejects traversal/absolute/.env and returns null for a missing file', () => fixture((root) => {
  write(root, 'ok.sql', 'select 1;');
  assert.equal(safeSource(root, 'ok.sql'), 'select 1;');
  assert.equal(safeSource(root, 'missing.sql'), null);
  assert.throws(() => safeSource(root, '../escape.sql'));
  assert.throws(() => safeSource(root, '/abs.sql'));
  assert.throws(() => safeSource(root, '.env.local'));
}));

test('inventoryTree distinguishes an absent tree from a present empty one', () => fixture((root) => {
  const absent = inventoryTree(root, { id: 'a', schemaGroup: 'g', dir: 'nope', kind: 'drizzle-sequential', consumer: 'x' });
  assert.equal(absent.present, false);
  assert.deepEqual(absent.files, []);
  fs.mkdirSync(path.join(root, 'present'));
  const present = inventoryTree(root, { id: 'b', schemaGroup: 'g', dir: 'present', kind: 'drizzle-sequential', consumer: 'x' });
  assert.equal(present.present, true);
  assert.equal(present.fileCount, 0);
}));

test('detectDuplicateAuthority flags divergent hashes for the same filename across two trees', () => {
  const trees = [
    { id: 'a', schemaGroup: 'shared', present: true, files: [{ name: '0001_x.sql', sha256: 'AAA' }] },
    { id: 'b', schemaGroup: 'shared', present: true, files: [{ name: '0001_x.sql', sha256: 'BBB' }] },
  ];
  const conflicts = detectDuplicateAuthority(trees);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].kind, 'divergent-hash');
  assert.equal(conflicts[0].name, '0001_x.sql');
});

test('detectDuplicateAuthority flags two independent writers sharing a numeric prefix with no filename overlap', () => {
  const trees = [
    { id: 'a', schemaGroup: 'shared', present: true, kind: 'drizzle-sequential', files: [{ name: '0012_alpha.sql', sha256: '1' }] },
    { id: 'b', schemaGroup: 'shared', present: true, kind: 'drizzle-sequential', files: [{ name: '0012_beta.sql', sha256: '2' }] },
  ];
  const conflicts = detectDuplicateAuthority(trees);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].kind, 'two-writers-same-prefix');
  assert.equal(conflicts[0].prefix, '0012');
});

test('detectDuplicateAuthority does not flag a single tree or non-overlapping schema groups', () => {
  const trees = [
    { id: 'a', schemaGroup: 'one', present: true, kind: 'drizzle-sequential', files: [{ name: '0001_x.sql', sha256: 'AAA' }] },
    { id: 'b', schemaGroup: 'two', present: true, kind: 'drizzle-sequential', files: [{ name: '0001_x.sql', sha256: 'BBB' }] },
    { id: 'c', schemaGroup: 'one', present: false, files: [] },
  ];
  assert.deepEqual(detectDuplicateAuthority(trees), []);
});

test('detectSchemaGaps reports verified-absent when trees are present but the table is missing, unavailable-environment when no tree exists', () => {
  const present = [{ schemaGroup: 'pg', present: true, files: [{ name: '0001.sql', source: 'create table other (id int);' }] }];
  const gaps = detectSchemaGaps(present, { schemaGroup: 'pg', tables: ['organizations', 'other'] });
  assert.deepEqual(gaps.map((g) => g.table), ['organizations']);
  assert.equal(gaps[0].confidence, 'verified-absent-in-inventoried-migrations');

  const absent = [{ schemaGroup: 'pg', present: false, files: [] }];
  const unavailable = detectSchemaGaps(absent, { schemaGroup: 'pg', tables: ['organizations'] });
  assert.equal(unavailable[0].confidence, 'unavailable-environment');
});

test('detectSchemaGaps does not count a foreign-key reference to a table as creating it', () => {
  const present = [{ schemaGroup: 'pg', present: true, files: [{ name: '0001.sql',
    source: 'create table if not exists public.org_areas (\n  organization_id uuid not null references public.organizations(id)\n);' }] }];
  const gaps = detectSchemaGaps(present, { schemaGroup: 'pg', tables: ['organizations'] });
  assert.deepEqual(gaps.map((g) => g.table), ['organizations']);
  assert.equal(gaps[0].confidence, 'verified-absent-in-inventoried-migrations');
});

test('checkAppliedCatalogAvailability never reports available and never leaks credential values', () => {
  const result = checkAppliedCatalogAvailability({ TURSO_DB_URL: 'libsql://secret-host', OTHER: '1' });
  assert.equal(result.available, false);
  assert.deepEqual(result.envHintsPresent, ['TURSO_DB_URL']);
  assert.ok(!JSON.stringify(result).includes('secret-host'));
});

test('buildInventory + renderReport end-to-end over a synthetic two-writer fixture', () => fixture((root) => {
  write(root, 'treeA/0000_shared.sql', 'create table shared (id int);');
  write(root, 'treeA/0012_alpha.sql', 'create table alpha (id int);');
  write(root, 'treeB/0000_shared.sql', 'create table shared (id int);');
  write(root, 'treeB/0012_beta.sql', 'create table beta (id int);\n-- no organizations table here');
  const trees = [
    { id: 'treeA', schemaGroup: 'shared', dir: 'treeA', kind: 'drizzle-sequential', consumer: 'A' },
    { id: 'treeB', schemaGroup: 'shared', dir: 'treeB', kind: 'drizzle-sequential', consumer: 'B' },
    { id: 'ghost', schemaGroup: 'ghost-schema', dir: 'nowhere', kind: 'drizzle-sequential', consumer: 'gone' },
  ];
  const inventory = buildInventory(root, trees, {}, { schemaGroup: 'shared', tables: ['organizations'] });
  assert.equal(inventory.duplicateAuthorities.length, 1);
  assert.equal(inventory.duplicateAuthorities[0].kind, 'two-writers-same-prefix');
  assert.equal(inventory.schemaGaps.length, 1);
  assert.equal(inventory.schemaGaps[0].confidence, 'verified-absent-in-inventoried-migrations');
  assert.equal(inventory.appliedCatalog.available, false);
  const report = renderReport(inventory);
  assert.match(report, /two-writers-same-prefix|two independent writers share numeric prefix/);
  assert.match(report, /organizations/);
  assert.match(report, /gone/);
}));
