#!/usr/bin/env node
// DEP-03 (12-03 Task 1) — archive manifest and immutable identity checks.
//
// Packs each owned @minion-stack/* package into a disposable directory using
// its own declared tooling (pnpm pack, which runs the package's own
// prepack/build script — nothing here reimplements a bundler), then records
// a manifest entry: name, version, source git revision, full archive
// SHA-256, member list, and whether a license/notice file ships inside the
// archive. A metadata `"license": "MIT"` field is never treated as proof —
// only an actual LICENSE/NOTICE member in the packed tarball counts.
//
// `assertNoVersionDigestConflict` is the "same version, different bytes"
// rejection the plan requires: given a manifest entry and an independently
// obtained digest for the exact same name@version (e.g. from the npm
// registry, or a second build), it throws if the bytes differ. It never
// silently accepts a mismatch.
//
// TODO(handoff): this CLI does not itself fetch the npm registry digest to
// compare against — that would be a silent network call on every run. The
// 12-03 evidence pass found real same-version/different-bytes conflicts for
// @minion-stack/shared@0.9.0 and @minion-stack/design-tokens@0.1.0 by hand
// (`npm view <pkg>@<version> dist.shasum`) — see
// .planning/phases/12-dependency-provenance/12-PACKAGE-MATRIX.md. If a CI
// job wants this automated, wire an explicit, reviewed opt-in step that
// calls assertNoVersionDigestConflict() with a fetched registry shasum.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const OWNED_PACKAGES = ['packages/shared', 'packages/crm-sdk', 'packages/design-tokens'];

const LICENSE_MEMBER_RE = /(^|\/)(LICENSE|LICENCE|COPYING|NOTICE)(\.[a-zA-Z0-9]+)?$/i;

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function gitRevision(repoRoot, relPkgDir) {
  try {
    const rev = execFileSync(
      'git',
      ['-C', repoRoot, 'log', '-1', '--format=%H', '--', relPkgDir],
      { encoding: 'utf8' },
    ).trim();
    return rev || null;
  } catch {
    return null;
  }
}

export function listMembers(tarballPath) {
  return execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

export function hasLicenseFile(members) {
  return members.some((m) => LICENSE_MEMBER_RE.test(m.replace(/^package\//, '')));
}

/**
 * Throws if `otherDigest` is a different SHA-256 than `entry.sha256` for the
 * same name@version — the plan's "same version identifies differing bytes"
 * rejection. `otherSource` is free text describing where the other digest
 * came from (e.g. "npm registry" or a second local build), for the error
 * message only.
 */
export function assertNoVersionDigestConflict(entry, otherDigest, otherSource = 'other build') {
  if (otherDigest && otherDigest !== entry.sha256) {
    throw new Error(
      `provenance rejection: ${entry.name}@${entry.version} has two archives with different ` +
        `bytes (this build: ${entry.sha256}, ${otherSource}: ${otherDigest}) — same version, ` +
        `different bytes is not admitted; bump the version or reconcile the source first`,
    );
  }
}

/**
 * Packs one package with its own tooling (pnpm pack, which runs the
 * package's own prepack/build script) into a disposable temp directory and
 * returns its provenance manifest entry. Always cleans up the temp
 * directory, even on failure.
 */
export function packPackage(repoRoot, relPkgDir) {
  const pkgDir = path.join(repoRoot, relPkgDir);
  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const outDir = mkdtempSync(path.join(tmpdir(), 'minion-provenance-'));
  try {
    const raw = execFileSync('pnpm', ['pack', '--pack-destination', outDir, '--json'], {
      cwd: pkgDir,
      encoding: 'utf8',
    });
    // A package with its own prepack/build script (e.g. crm-sdk's
    // `rm -rf dist ... && tsc`) prints pnpm's lifecycle banner to stdout
    // ahead of the --json payload. Take the JSON object starting at the
    // first line that is exactly "{" — pnpm always emits its result as a
    // pretty-printed object at the end, never with a bare "{" line earlier.
    const lines = raw.split('\n');
    const jsonStart = lines.findIndex((l) => l.trim() === '{');
    const jsonText = jsonStart === -1 ? raw : lines.slice(jsonStart).join('\n');
    const parsed = JSON.parse(jsonText);
    const tarballPath = parsed.filename;
    const bytes = readFileSync(tarballPath);
    const members = listMembers(tarballPath);
    return {
      name: pkgJson.name,
      version: pkgJson.version,
      declaredLicense: pkgJson.license ?? null,
      sourceRevision: gitRevision(repoRoot, relPkgDir),
      sha256: sha256(bytes),
      byteLength: bytes.length,
      memberCount: members.length,
      members,
      hasShippedLicenseFile: hasLicenseFile(members),
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

export function buildManifest(repoRoot, relPkgDirs = OWNED_PACKAGES) {
  return relPkgDirs.map((dir) => packPackage(repoRoot, dir));
}

// CLI entry: node scripts/qc/package-provenance.mjs [repoRoot]
if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] ?? process.cwd();
  const manifest = buildManifest(repoRoot);
  for (const entry of manifest) {
    // Trimmed console view; full detail (member list) is in the JSON below.
    console.error(
      `${entry.name}@${entry.version}  sha256=${entry.sha256.slice(0, 12)}…  ` +
        `members=${entry.memberCount}  license-file=${entry.hasShippedLicenseFile}`,
    );
  }
  console.log(JSON.stringify(manifest, null, 2));
}
