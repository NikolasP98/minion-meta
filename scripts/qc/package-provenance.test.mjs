import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  sha256,
  hasLicenseFile,
  assertNoVersionDigestConflict,
  packPackage,
  buildManifest,
  OWNED_PACKAGES,
} from './package-provenance.mjs';

function makeFixturePackage(dir, { withLicense = false } = {}) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/pkg',
        version: '0.0.1',
        license: 'MIT',
        files: withLicense ? ['index.js', 'LICENSE'] : ['index.js'],
      },
      null,
      2,
    ),
  );
  writeFileSync(path.join(dir, 'index.js'), 'export const x = 1;\n');
  if (withLicense) writeFileSync(path.join(dir, 'LICENSE'), 'MIT License placeholder\n');
}

test('hasLicenseFile: rejects a metadata-only MIT claim with no shipped file', () => {
  assert.equal(hasLicenseFile(['package/dist/index.js', 'package/package.json']), false);
});

test('hasLicenseFile: accepts an actually shipped LICENSE member', () => {
  assert.equal(hasLicenseFile(['package/LICENSE', 'package/dist/index.js']), true);
});

test('hasLicenseFile: accepts NOTICE and case-insensitive LICENCE spelling', () => {
  assert.equal(hasLicenseFile(['package/NOTICE']), true);
  assert.equal(hasLicenseFile(['package/LICENCE']), true);
});

test('assertNoVersionDigestConflict: rejects same version, different bytes', () => {
  const entry = { name: '@fixture/pkg', version: '0.0.1', sha256: 'a'.repeat(64) };
  assert.throws(
    () => assertNoVersionDigestConflict(entry, 'b'.repeat(64), 'npm registry'),
    /different bytes is not admitted/,
  );
});

test('assertNoVersionDigestConflict: accepts a matching digest (byte-identical rebuild)', () => {
  const entry = { name: '@fixture/pkg', version: '0.0.1', sha256: 'a'.repeat(64) };
  assert.doesNotThrow(() => assertNoVersionDigestConflict(entry, 'a'.repeat(64), 'second build'));
});

test('assertNoVersionDigestConflict: a missing/undefined other digest is not a conflict', () => {
  const entry = { name: '@fixture/pkg', version: '0.0.1', sha256: 'a'.repeat(64) };
  assert.doesNotThrow(() => assertNoVersionDigestConflict(entry, undefined, 'unpublished'));
});

test('packPackage: rejects an incomplete manifest (no package.json)', () => {
  const dir = mktemp();
  try {
    mkdirSync(dir, { recursive: true });
    // No package.json written at all.
    assert.throws(() => packPackage(path.dirname(dir), path.basename(dir)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('packPackage: synthetic fixture without a license file is packed but flagged', () => {
  const root = mktemp();
  try {
    const rel = 'pkg';
    makeFixturePackage(path.join(root, rel), { withLicense: false });
    const entry = packPackage(root, rel);
    assert.equal(entry.name, '@fixture/pkg');
    assert.equal(entry.declaredLicense, 'MIT');
    assert.equal(entry.hasShippedLicenseFile, false, 'metadata MIT label alone must not pass');
    assert.equal(typeof entry.sha256, 'string');
    assert.equal(entry.sha256.length, 64);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('packPackage: synthetic fixture with a real LICENSE file is flagged as shipping it', () => {
  const root = mktemp();
  try {
    const rel = 'pkg';
    makeFixturePackage(path.join(root, rel), { withLicense: true });
    const entry = packPackage(root, rel);
    assert.equal(entry.hasShippedLicenseFile, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('packPackage: repacking the identical synthetic fixture is byte-identical', () => {
  const root = mktemp();
  try {
    const rel = 'pkg';
    makeFixturePackage(path.join(root, rel), { withLicense: true });
    const first = packPackage(root, rel);
    const second = packPackage(root, rel);
    assert.equal(first.sha256, second.sha256);
    assert.doesNotThrow(() => assertNoVersionDigestConflict(first, second.sha256, 'repack'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('packPackage: real repo owned packages all pack and none claims a license file it does not ship', { skip: !pnpmAvailable() }, () => {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const manifest = buildManifest(repoRoot, OWNED_PACKAGES);
  assert.equal(manifest.length, OWNED_PACKAGES.length);
  for (const entry of manifest) {
    assert.ok(entry.name.startsWith('@minion-stack/'));
    assert.ok(entry.memberCount > 0, `${entry.name} packed zero members`);
    // None of the three owned packages ship a LICENSE/NOTICE member today —
    // this is a real, current finding (see 12-LICENSE-DECISION.md), not an
    // assumption baked into the fixture. If this ever flips true, that's
    // good news and this assertion should be updated to match.
    assert.equal(
      entry.hasShippedLicenseFile,
      false,
      `${entry.name} now ships a license file — update 12-LICENSE-DECISION.md`,
    );
  }
});

function mktemp() {
  return mkdtempSync(path.join(tmpdir(), 'minion-provenance-test-'));
}

function pnpmAvailable() {
  try {
    execFileSync('pnpm', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
