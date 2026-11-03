import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { packPackage } from './package-provenance.mjs';
import {
  resolveFixtureCombination,
  resolveRealCombination,
  SUPPORTED_COMBINATIONS,
  UNSUPPORTED_COMBINATIONS,
} from './package-consumer-matrix.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

test('fixture-only: every declared supported combination resolves', () => {
  for (const combo of SUPPORTED_COMBINATIONS) {
    assert.doesNotThrow(
      () => resolveFixtureCombination(repoRoot, combo),
      `${combo.pkgDir} -> ${combo.consumer} should resolve`,
    );
  }
});

function makeRealConsumerFixture(changing) {
  const root = mkdtempSync(path.join(tmpdir(), 'minion-consumer-test-'));
  const pkgDir = path.join(root, 'pkg');
  mkdirSync(pkgDir);
  writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({
    name: '@fixture/consumer-matrix', version: '0.0.1', type: 'commonjs',
    exports: './index.js', types: './index.d.ts', files: ['index.js', 'index.d.ts'],
    ...(changing ? { scripts: { prepack: 'node prepack.cjs' } } : {}),
  }));
  writeFileSync(path.join(pkgDir, 'index.js'), 'exports.value = 0;\n');
  writeFileSync(path.join(pkgDir, 'index.d.ts'), 'export declare const value: number;\n');
  if (changing) writeFileSync(path.join(pkgDir, 'prepack.cjs'), `
    const fs = require('node:fs');
    const count = fs.existsSync('count') ? Number(fs.readFileSync('count', 'utf8')) + 1 : 1;
    fs.writeFileSync('count', String(count));
    fs.writeFileSync('index.js', 'exports.value = ' + count + ';\\n');
  `);
  const modules = path.join(root, 'packages/shared/node_modules');
  mkdirSync(modules, { recursive: true });
  const require = createRequire(import.meta.url);
  symlinkSync(path.dirname(require.resolve('typescript/package.json', { paths: [path.join(repoRoot, 'packages/shared')] })), path.join(modules, 'typescript'), 'dir');
  return root;
}

const realCombo = { pkgDir: 'pkg', consumer: 'synthetic', importSpecifier: '@fixture/consumer-matrix', sampleImport: 'value' };

test('real consumer installs and executes an archive matching its recorded provenance', () => {
  const root = makeRealConsumerFixture(false);
  try {
    const result = resolveRealCombination(root, realCombo);
    assert.equal(result.ok, true);
    assert.equal(result.entry.sha256, packPackage(root, 'pkg').sha256);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('real consumer rejects a changed repack before qualification', () => {
  const root = makeRealConsumerFixture(true);
  try {
    assert.throws(() => resolveRealCombination(root, realCombo), /provenance rejection:.*consumer install archive/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fixture-only: every declared unsupported combination is rejected, not silently allowed', () => {
  for (const combo of UNSUPPORTED_COMBINATIONS) {
    assert.throws(
      () => resolveFixtureCombination(repoRoot, combo),
      /missing required peer/,
      `${combo.pkgDir} -> ${combo.consumer} should have been blocked`,
    );
  }
});

test('fixture-only: rejects an incomplete manifest (fixture dir absent)', () => {
  assert.throws(
    () =>
      resolveFixtureCombination(repoRoot, {
        pkgDir: 'packages/does-not-exist',
        consumer: 'nobody',
      }),
    /missing fixture consumer dir/,
  );
});

test('fixture-only: rejects a consumer manifest missing a required peer even when one unrelated dep is present', () => {
  // Regression guard for the exact bug this task exists to catch: a naive
  // "does the manifest declare *something*" check would pass here.
  assert.throws(
    () =>
      resolveFixtureCombination(repoRoot, {
        pkgDir: 'packages/crm-sdk',
        consumer: 'minion_hub_missing_peer',
      }),
    /postgres/,
  );
});
