#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageSource = join(root, 'packages/design-tokens');
const output = process.argv[2] && resolve(process.argv[2]);
if (!output) throw new Error('Usage: node scripts/pack-design-tokens-readiness.mjs <fresh-output-directory>');
if (existsSync(output)) throw new Error('Output directory must be fresh');

const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const version = '0.1.1-readiness.2';
const sourceFiles = [
  'README.md',
  'audit.mjs',
  'contract.json',
  'contract.schema.json',
  'package.json',
  'tokens.css',
  'utilities.css',
];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function copyPackage(destination) {
  mkdirSync(destination, { recursive: true });
  for (const file of sourceFiles) cpSync(join(packageSource, file), join(destination, file));
  const manifestPath = join(destination, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function packOnce(temporary, name) {
  const source = join(temporary, name, 'package');
  const destination = join(temporary, name, 'packed');
  copyPackage(source);
  mkdirSync(destination, { recursive: true });
  execFileSync('pnpm', ['pack', '--pack-destination', destination], {
    cwd: source,
    stdio: 'pipe',
  });
  const archives = readdirSync(destination).filter((file) => file.endsWith('.tgz'));
  if (archives.length !== 1) throw new Error(`Expected one archive, found ${archives.length}`);
  return join(destination, archives[0]);
}

const temporary = mkdtempSync(join(tmpdir(), 'design-token-readiness-'));
try {
  const first = packOnce(temporary, 'first');
  const second = packOnce(temporary, 'second');
  const firstBytes = readFileSync(first);
  const secondBytes = readFileSync(second);
  if (!firstBytes.equals(secondBytes)) throw new Error('Two clean design-token packs were not byte-identical');

  mkdirSync(output, { recursive: true });
  const artifact = `minion-stack-design-tokens-${version}.tgz`;
  cpSync(first, join(output, artifact));
  const entries = execFileSync('tar', ['-tzf', join(output, artifact)], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .sort();
  const expectedEntries = sourceFiles.map((file) => `package/${file}`).sort();
  if (JSON.stringify(entries) !== JSON.stringify(expectedEntries)) {
    throw new Error(`Unexpected packed entries: ${JSON.stringify(entries)}`);
  }

  const receipt = {
    schemaVersion: 1,
    artifact,
    version,
    baseVersion: JSON.parse(readFileSync(join(packageSource, 'package.json'), 'utf8')).version,
    sha256: digest(firstBytes),
    sourceRepository: 'NikolasP98/minion-meta',
    baseCommit,
    sources: Object.fromEntries(
      sourceFiles.map((file) => [file, digest(readFileSync(join(packageSource, file)))]),
    ),
    packer: relative(root, fileURLToPath(import.meta.url)),
    packerSha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    repacksByteIdentical: true,
    entries: expectedEntries,
    command: 'node scripts/pack-design-tokens-readiness.mjs <fresh-output-directory>',
    releaseBoundary: 'Local qualification artifact; not published to npm or deployed.',
  };
  writeFileSync(join(output, 'design-token-provenance.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
