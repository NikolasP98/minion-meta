#!/usr/bin/env node
// packages/shared/scripts/build.mjs
// Production-only clean emission for @minion-stack/shared.
//
// Trusted, exclusive local-workspace assumption: the checks below defend
// against stale/linked output paths, wrong invocation locations and
// configuration mistakes in a single-writer dev/CI checkout. They are NOT
// race-proof containment against a concurrent, actively malicious
// filesystem writer — there is no lock between validation and mutation,
// only a narrowed window (validate, recheck, then mutate immediately).

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

/** Refuse if a lexical path and its realpath disagree — a symlink/junction
 * sits somewhere on the path we were reached through, including through a
 * linked package ancestor. */
function assertNoLinkDisagreement(label, lexicalPath) {
  const real = fs.realpathSync(lexicalPath);
  if (real !== lexicalPath) {
    throw new Error(
      `Refusing: ${label} lexical path disagrees with realpath (${lexicalPath} !== ${real})`,
    );
  }
}

// Node resolves symlinks in the ESM main-module specifier before setting
// import.meta.url (default `--preserve-symlinks-main=false`), so checking
// import.meta.url alone would silently miss a symlinked invocation path.
// process.argv[1] still carries the raw, unresolved command-line argument —
// check that one first, against process.cwd() at invocation time.
const invokedAbs = path.resolve(process.cwd(), process.argv[1]);
assertNoLinkDisagreement('invocation path', invokedAbs);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.dirname(scriptDir);
assertNoLinkDisagreement('script directory', scriptDir);
assertNoLinkDisagreement('package root', packageRoot);

const pkgJsonPath = path.join(packageRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
if (pkg.name !== '@minion-stack/shared') {
  throw new Error(`Refusing: unexpected package identity at ${packageRoot}: ${pkg.name}`);
}

const distDir = path.join(packageRoot, 'dist');

/** Validate every existing ancestor of the fixed dist path, including the
 * package root, with lstat before any mutation. Reject symlinks/junctions,
 * unexpected file types and lexical/realpath disagreement. A missing dist
 * is only acceptable once every ancestor above it has already validated as
 * ordinary. */
function validateOrdinaryAncestors() {
  for (const p of [packageRoot, distDir]) {
    let lst;
    try {
      lst = fs.lstatSync(p);
    } catch (err) {
      if (err.code === 'ENOENT' && p === distDir) continue; // missing dist: allowed
      throw err;
    }
    if (lst.isSymbolicLink()) {
      throw new Error(`Refusing: ${p} is a symlink/junction; will not delete through it`);
    }
    if (!lst.isDirectory()) {
      throw new Error(`Refusing: ${p} exists but is not an ordinary directory`);
    }
    assertNoLinkDisagreement(p, p);
  }
}

validateOrdinaryAncestors();
// Recheck immediately before mutation to narrow the validate/mutate window.
validateOrdinaryAncestors();

// Remove only the validated dist tree. Node's recursive fs.rmSync lstats
// each entry as it walks and unlinks symlinks in place instead of
// dereferencing them, so a nested stale link is deleted as a link — never
// followed into, and its target is never touched. (Verified empirically by
// the private acceptance matrix's nested-link case, not assumed.)
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: false });
}
fs.mkdirSync(distDir, { recursive: false });

// Resolve the actual installed local TypeScript compiler — never a
// downloaded/bootstrapped one.
const tsPkgJsonPath = path.join(packageRoot, 'node_modules', 'typescript', 'package.json');
const tsPkg = JSON.parse(fs.readFileSync(tsPkgJsonPath, 'utf8'));
const tscRelative = typeof tsPkg.bin === 'string' ? tsPkg.bin : tsPkg.bin?.tsc;
if (!tscRelative) throw new Error('Refusing: installed typescript package has no tsc bin entry');
const compilerRealPath = fs.realpathSync(path.join(path.dirname(tsPkgJsonPath), tscRelative));

const buildConfig = path.join(packageRoot, 'tsconfig.build.json');
const result = spawnSync(process.execPath, [compilerRealPath, '--project', buildConfig], {
  cwd: packageRoot,
  stdio: 'inherit',
});

if (result.error) {
  // Spawn-level failure (e.g. missing/unexecutable compiler): propagate, no false success.
  throw result.error;
}
if (result.signal) {
  throw new Error(`Refusing: compiler terminated by signal ${result.signal}`);
}
if (result.status !== 0) {
  process.stderr.write(`Compiler exited with status ${result.status}; no accepted output.\n`);
  process.exit(result.status ?? 1);
}

// Successful completion must have produced every declared public entry file.
const publicEntries = Object.values(pkg.exports ?? {})
  .flatMap((entry) => [entry.import, entry.types])
  .filter(Boolean)
  .map((rel) => path.join(packageRoot, rel));
for (const entry of publicEntries) {
  if (!fs.existsSync(entry)) {
    throw new Error(`Refusing success: declared public entry missing after build: ${entry}`);
  }
}

console.log(
  JSON.stringify({
    compiler: compilerRealPath,
    compilerVersion: tsPkg.version,
    entries: publicEntries,
  }),
);
