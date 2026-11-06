import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  PACKAGES,
  snapshotPackage,
  qualifyPackage,
  validateExports,
  writeQualification,
} from './pack-design-system.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'design-pack-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'packages/ui');
  mkdirSync(join(source, 'dist'), { recursive: true });
  writeFileSync(
    join(source, 'package.json'),
    JSON.stringify({
      name: '@minion-stack/ui',
      version: '0.1.0',
      scripts: { prepublishOnly: 'must-not-run', test: 'test-fixture' },
      files: ['dist', '!dist/**/*.test.*', 'README.md'],
      exports: { '.': { svelte: './dist/index.js', types: './dist/index.d.ts' } },
    }),
  );
  writeFileSync(join(source, 'README.md'), 'Fixture only.\n');
  writeFileSync(join(source, 'dist/index.js'), 'export const value = 1;\n');
  writeFileSync(join(source, 'dist/index.d.ts'), 'export declare const value = 1;\n');
  writeFileSync(join(source, 'dist/example.test.js'), 'throw new Error("Must not ship");\n');
  return { root, source, definition: PACKAGES.find((item) => item.kind === 'ui') };
}

test('two packs match, omit tests, validate exports and report exact members', (t) => {
  const { root, definition } = fixture(t);
  const snapshot = snapshotPackage(root, definition);
  const qualified = qualifyPackage(snapshot);
  assert.equal(qualified.receipt.repacksByteIdentical, true);
  assert.match(qualified.receipt.version, /^0\.1\.0-durability\.h[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(qualified.receipt.members), [
    'README.md',
    'dist/index.d.ts',
    'dist/index.js',
    'package.json',
  ]);
  assert.notEqual(
    qualified.receipt.sourceMembers['package.json'],
    qualified.receipt.members['package.json'],
  );
  const output = join(root, 'release');
  const receipt = writeQualification(output, [qualified], { baseCommit: 'fixture' });
  assert.equal(
    readFileSync(join(output, receipt.packages[0].artifact)).equals(qualified.bytes),
    true,
  );
  assert.throws(() => writeQualification(output, [qualified], {}), /fresh/);
  assert.ok(existsSync(join(output, 'design-system-provenance.json')));
});

test('same input keeps version while changed member receives a different version', (t) => {
  const { root, source, definition } = fixture(t);
  const first = snapshotPackage(root, definition);
  assert.equal(snapshotPackage(root, definition).manifest.version, first.manifest.version);
  writeFileSync(join(source, 'dist/index.js'), 'export const value = 2;\n');
  const second = snapshotPackage(root, definition);
  assert.notEqual(second.manifest.version, first.manifest.version);
});

test('missing exported file and symlink inputs are rejected', (t) => {
  const { root, source, definition } = fixture(t);
  assert.throws(
    () => validateExports({ exports: { '.': './missing.js' } }, ['index.js']),
    /no exact packed member/,
  );
  assert.throws(
    () => validateExports({ exports: { '.': '../escape.js' } }, ['escape.js']),
    /no exact packed member/,
  );
  symlinkSync('index.js', join(source, 'dist/alias.js'));
  assert.throws(() => snapshotPackage(root, definition), /Symlink/);
});

test('a manifest omitting a canonical file cannot silently qualify', (t) => {
  const { root, source, definition } = fixture(t);
  const manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  manifest.files = ['README.md'];
  writeFileSync(join(source, 'package.json'), JSON.stringify(manifest));
  assert.throws(() => qualifyPackage(snapshotPackage(root, definition)), /inventory differs/);
});

test('retired fixed-version packers fail before writing output', (t) => {
  const { root } = fixture(t);
  const output = join(root, 'should-not-exist');
  for (const file of ['pack-design-tokens-readiness.mjs', 'pack-ui-button-readiness.mjs']) {
    const result = spawnSync(
      process.execPath,
      [new URL(`./${file}`, import.meta.url).pathname, output],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Retired readiness packer/);
    assert.equal(existsSync(output), false);
  }
});

test('token snapshot requires complete inventory export and all eight members', (t) => {
  const { root } = fixture(t);
  const definition = PACKAGES.find((item) => item.kind === 'tokens');
  const source = join(root, definition.directory);
  mkdirSync(source, { recursive: true });
  const members = [
    'README.md',
    'audit.mjs',
    'contract.json',
    'contract.schema.json',
    'inventory.json',
    'tokens.css',
    'utilities.css',
  ];
  for (const file of members)
    writeFileSync(join(source, file), file.endsWith('.json') ? '{}' : 'fixture');
  const manifest = {
    name: definition.name,
    version: '0.1.0',
    scripts: { prepublishOnly: 'must-not-run', test: 'test-fixture' },
    files: members,
    exports: { './inventory.json': './inventory.json', './tokens.css': './tokens.css' },
  };
  writeFileSync(join(source, 'package.json'), JSON.stringify(manifest));
  const snapshot = snapshotPackage(root, definition);
  assert.equal(snapshot.members.length, 8);
  assert.ok(snapshot.members.includes('inventory.json'));
  delete manifest.exports['./inventory.json'];
  writeFileSync(join(source, 'package.json'), JSON.stringify(manifest));
  assert.throws(() => snapshotPackage(root, definition), /inventory must be exported/);
});
