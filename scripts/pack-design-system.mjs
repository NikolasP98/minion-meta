#!/usr/bin/env node
/** Build and qualify immutable complete design packages, without publishing them. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
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
import { assertNoVersionDigestConflict } from './qc/package-provenance.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGES = [
  {
    directory: 'packages/design-tokens',
    name: '@minion-stack/design-tokens',
    baseVersion: '0.1.1',
    kind: 'tokens',
  },
  { directory: 'packages/ui', name: '@minion-stack/ui', baseVersion: '0.1.0', kind: 'ui' },
];
const tokenMembers = [
  'README.md',
  'audit.mjs',
  'contract.json',
  'contract.schema.json',
  'inventory.json',
  'package.json',
  'tokens.css',
  'utilities.css',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
let packingRecipe;
function recipeIdentity() {
  return (packingRecipe ??= {
    schemaVersion: 1,
    node: process.version,
    pnpm: run('pnpm', ['--version'], root).trim(),
    packageManager: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).packageManager,
    packerSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
  });
}

function filesIn(directory, prefix = '') {
  return readdirSync(join(directory, prefix))
    .sort()
    .flatMap((name) => {
      const path = join(prefix, name);
      const stat = lstatSync(join(directory, path));
      if (stat.isSymbolicLink()) throw new Error(`Symlink is not a package input: ${path}`);
      if (stat.isDirectory()) return filesIn(directory, path);
      if (!stat.isFile()) throw new Error(`Not a regular package input: ${path}`);
      return [path];
    });
}

export function validateExports(manifest, members) {
  const paths = [];
  const visit = (value) => {
    if (typeof value === 'string') paths.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(manifest.exports);
  for (const field of ['svelte', 'types', 'main', 'module'])
    if (manifest[field]) paths.push(manifest[field]);
  if (!paths.length) throw new Error('Package has no public exports');
  for (const path of paths) {
    if (!path.startsWith('./') || path.includes('..') || !members.includes(path.slice(2)))
      throw new Error(`Public export has no exact packed member: ${path}`);
  }
}

/** Snapshot once so concurrent edits cannot make two packs use different inputs. */
export function snapshotPackage(repositoryRoot, definition) {
  const directory = join(repositoryRoot, definition.directory);
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  if (manifest.name !== definition.name)
    throw new Error(`Unexpected package identity: ${manifest.name}`);
  const members =
    definition.kind === 'tokens'
      ? tokenMembers
      : [
          'README.md',
          'package.json',
          ...filesIn(join(directory, 'dist'))
            .filter((file) => !/\.test\./.test(file))
            .map((file) => `dist/${file}`),
        ];
  const inputs = Object.fromEntries(
    [...members].sort().map((file) => {
      const path = join(directory, file);
      if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())
        throw new Error(`Not a regular package input: ${file}`);
      return [file, readFileSync(path)];
    }),
  );
  validateExports(manifest, members);
  if (definition.kind === 'tokens' && manifest.exports?.['./inventory.json'] !== './inventory.json')
    throw new Error('Token inventory must be exported');
  const inputDigests = Object.fromEntries(
    Object.entries(inputs).map(([file, bytes]) => [file, sha256(bytes)]),
  );
  const recipe = recipeIdentity();
  const sourceDigest = sha256(JSON.stringify({ inputDigests, recipe }));
  const version = `${definition.baseVersion}-durability.h${sourceDigest}`;
  // A version identifies the exact normalized archive input, never a mutable .1 label.
  const packedManifest = { ...manifest, version };
  // pnpm strips the local package-manager selector from the published manifest.
  delete packedManifest.packageManager;
  // pnpm removes the publish-only lifecycle command and appends the remaining scripts.
  if (packedManifest.scripts?.prepublishOnly) {
    const { prepublishOnly: _prepublishOnly, ...scripts } = packedManifest.scripts;
    delete packedManifest.scripts;
    packedManifest.scripts = scripts;
  }
  // pnpm serializes published manifests without a terminal newline.
  inputs['package.json'] = Buffer.from(JSON.stringify(packedManifest, null, 2));
  return {
    inputs,
    inputDigests,
    sourceDigest,
    recipe,
    manifest: packedManifest,
    members: [...members].sort(),
  };
}

function packOnce(snapshot, temporary, name) {
  const source = join(temporary, name, 'package');
  const packed = join(temporary, name, 'packed');
  mkdirSync(packed, { recursive: true });
  for (const [file, bytes] of Object.entries(snapshot.inputs)) {
    const path = join(source, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      file === 'package.json'
        ? JSON.stringify(
            { ...snapshot.manifest, packageManager: snapshot.recipe.packageManager },
            null,
            2,
          )
        : bytes,
    );
  }
  // Pin the pack tool on the staged package; parent manifests outside a workspace are ignored.
  if (run('pnpm', ['--version'], source).trim() !== snapshot.recipe.pnpm)
    throw new Error('Temporary pack selected a different pnpm version');
  run('pnpm', ['pack', '--pack-destination', packed], source);
  const archives = readdirSync(packed).filter((file) => file.endsWith('.tgz'));
  if (archives.length !== 1) throw new Error(`Expected one archive, received ${archives.length}`);
  return { name: archives[0], path: join(packed, archives[0]) };
}

export function qualifyPackage(snapshot) {
  const temporary = mkdtempSync(join(tmpdir(), 'minion-design-pack-'));
  try {
    const first = packOnce(snapshot, temporary, 'first');
    const second = packOnce(snapshot, temporary, 'second');
    const bytes = readFileSync(first.path);
    assertNoVersionDigestConflict(
      { name: snapshot.manifest.name, version: snapshot.manifest.version, sha256: sha256(bytes) },
      sha256(readFileSync(second.path)),
      'second clean pack',
    );
    const entries = run('tar', ['-tzf', first.path], temporary).trim().split('\n').sort();
    const expected = snapshot.members.map((file) => `package/${file}`);
    if (JSON.stringify(entries) !== JSON.stringify(expected))
      throw new Error('Packed member inventory differs from canonical allowlist');
    const memberDigests = {};
    for (const file of snapshot.members) {
      const member = execFileSync('tar', ['-xOf', first.path, `package/${file}`]);
      if (!member.equals(snapshot.inputs[file])) throw new Error(`Packed content changed: ${file}`);
      memberDigests[file] = sha256(member);
    }
    return {
      bytes,
      receipt: {
        name: snapshot.manifest.name,
        version: snapshot.manifest.version,
        artifact: first.name,
        sha256: sha256(bytes),
        sourceDigest: snapshot.sourceDigest,
        packingRecipe: snapshot.recipe,
        sourceMembers: snapshot.inputDigests,
        members: memberDigests,
        repacksByteIdentical: true,
      },
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export function writeQualification(output, packages, provenance) {
  if (existsSync(output)) throw new Error('Output directory must be fresh');
  // No output survives a failed qualification; callers cannot mistake half a release for success.
  let created = false;
  try {
    mkdirSync(output, { recursive: false });
    created = true;
    for (const item of packages)
      writeFileSync(join(output, item.receipt.artifact), item.bytes, { flag: 'wx' });
    const receipt = {
      schemaVersion: 1,
      ...provenance,
      packages: packages.map((item) => item.receipt),
      releaseBoundary:
        'Qualified local archives only; no publication, installation or deployment implied.',
    };
    writeFileSync(
      join(output, 'design-system-provenance.json'),
      `${JSON.stringify(receipt, null, 2)}\n`,
      { flag: 'wx' },
    );
    return receipt;
  } catch (error) {
    if (created) rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

export function main(args = process.argv.slice(2)) {
  if (args.length !== 1)
    throw new Error('Usage: node scripts/pack-design-system.mjs <fresh-output-directory>');
  const output = resolve(args[0]);
  if (existsSync(output)) throw new Error('Output directory must be fresh');
  if (!existsSync(dirname(output))) throw new Error('Output parent directory must exist');
  const collectAuthoringSources = () => {
    const sources = {};
    for (const definition of PACKAGES) {
      const packageRoot = join(root, definition.directory);
      for (const file of readdirSync(packageRoot).sort()) {
        const path = join(packageRoot, file);
        if (lstatSync(path).isFile())
          sources[`${definition.directory}/${file}`] = sha256(readFileSync(path));
      }
      for (const area of ['src', 'scripts', 'tests']) {
        const directory = join(packageRoot, area);
        if (existsSync(directory))
          for (const file of filesIn(directory))
            sources[`${definition.directory}/${area}/${file}`] = sha256(
              readFileSync(join(directory, file)),
            );
      }
    }
    return sources;
  };
  const authoringSources = collectAuthoringSources();
  run('pnpm', ['--filter', '@minion-stack/design-tokens', 'check:generated'], root);
  run('pnpm', ['--filter', '@minion-stack/ui', 'build'], root);
  const baseCommit = run('git', ['rev-parse', 'HEAD'], root).trim();
  const snapshots = PACKAGES.map((definition) => snapshotPackage(root, definition));
  const packages = snapshots.map(qualifyPackage);
  for (let index = 0; index < PACKAGES.length; index++) {
    if (snapshotPackage(root, PACKAGES[index]).sourceDigest !== snapshots[index].sourceDigest)
      throw new Error('Package source changed during qualification; run again after edits settle');
  }
  if (JSON.stringify(collectAuthoringSources()) !== JSON.stringify(authoringSources))
    throw new Error(
      'Authoring source changed during build/qualification; wait for edits to settle',
    );
  const receipt = writeQualification(output, packages, {
    sourceRepository: 'NikolasP98/minion-meta',
    baseCommit,
    authoringSources,
    contractVersion: JSON.parse(
      readFileSync(join(root, 'packages/design-tokens/contract.json'), 'utf8'),
    ).contractVersion,
    packer: relative(root, fileURLToPath(import.meta.url)),
    packerSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    toolchain: {
      node: process.version,
      pnpm: run('pnpm', ['--version'], root).trim(),
      packageManager: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).packageManager,
    },
  });
  console.log(JSON.stringify(receipt, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
