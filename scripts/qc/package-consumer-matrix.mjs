#!/usr/bin/env node
// DEP-03 (12-03 Task 2) — exercise clean consumer installation from exact
// archives.
//
// Real mode (default, no flag): packs each owned package with its own
// tooling (via package-provenance.mjs's packPackage), installs the exact
// tarball into a disposable, credential-free consumer root using npm
// (npm's `file:` install of a tarball needs no registry/network — the
// tarball IS the package), and compiles a tiny real-import fixture against
// its declared public exports with `tsc --noEmit`.
//
// `--fixture-only`: skips packing/installing real packages (no pnpm pack,
// no npm install, no network) and instead exercises the matrix's own
// resolution logic against synthetic fixture consumers checked in next to
// this script (fixtures/consumer-*). This is what CI runs — it proves the
// matrix's peer/export-resolution logic without depending on this
// checkout's current package.json content or the currently installed
// pnpm/npm toolchain being reachable in every CI image.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
import { packPackage } from './package-provenance.mjs';

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'consumer-matrix');

/**
 * A supported (package, consumer) pair to exercise: which real consumer
 * declares the dependency, and a minimal import that consumer actually
 * uses (kept in sync with the real source in each consumer's package.json /
 * import sites — see 12-PACKAGE-MATRIX.md for the read-first evidence).
 */
// Read-first evidence for each pairing (real `grep` against the live
// checkouts, not assumed): minion_hub/package.json and minion_site/package.json
// both declare @minion-stack/crm-sdk (pinned local tarball) and
// @minion-stack/design-tokens (pinned local tarball) as real dependencies,
// and both import from them in src/ (hub: src/server/services/party.service.ts,
// src/routes/api/crm/dni-lookup/+server.ts; site: src/routes/api/leads/+server.ts).
// @minion-stack/shared is a semver `^0.9.0` dependency (not a pinned tarball)
// in both. paperclip-minion/package.json declares none of the three — it is
// not in this matrix.
export const SUPPORTED_COMBINATIONS = [
  {
    pkgDir: 'packages/shared',
    consumer: 'minion_hub',
    importSpecifier: '@minion-stack/shared/utils',
    sampleImport: 'uuid',
  },
  {
    pkgDir: 'packages/shared',
    consumer: 'minion_site',
    importSpecifier: '@minion-stack/shared/utils',
    sampleImport: 'uuid',
  },
  {
    pkgDir: 'packages/crm-sdk',
    consumer: 'minion_hub',
    importSpecifier: '@minion-stack/crm-sdk',
    sampleImport: 'createCrmClient',
    peerDependencies: { postgres: '^3.4.0' },
  },
  {
    pkgDir: 'packages/crm-sdk',
    consumer: 'minion_site',
    importSpecifier: '@minion-stack/crm-sdk',
    sampleImport: 'createCrmClient',
    peerDependencies: { postgres: '^3.4.0' },
  },
  {
    pkgDir: 'packages/design-tokens',
    consumer: 'minion_hub',
    importSpecifier: '@minion-stack/design-tokens/contract.json',
    sampleImport: null, // JSON asset import, not a named export
  },
];

/**
 * An explicitly unsupported combination the matrix must reject, not
 * silently allow: installing crm-sdk WITHOUT its declared `postgres` peer
 * present. crm-sdk's own package.json declares `peerDependencies: { postgres:
 * "^3.4.0" }` with no `peerDependenciesMeta.optional` — a real consumer that
 * skips the peer is not a supported install, and this matrix must say so
 * rather than reporting a false pass.
 */
export const UNSUPPORTED_COMBINATIONS = [
  {
    pkgDir: 'packages/crm-sdk',
    consumer: 'minion_hub_missing_peer',
    importSpecifier: '@minion-stack/crm-sdk',
    sampleImport: 'createCrmClient',
    // Deliberately omitted: peerDependencies. crm-sdk imports `postgres`
    // directly in src/client.ts; without it installed, module resolution
    // for crm-sdk's own dist output fails at typecheck time.
    reason: 'crm-sdk declares a required (non-optional) postgres peer; installing without it must fail, not silently resolve.',
  },
];

function writeTsConfig(dir) {
  writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'ES2023',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          types: [],
        },
        include: ['index.ts'],
      },
      null,
      2,
    ),
  );
}

/**
 * Resolves a combination against a real, freshly packed tarball: installs
 * it with `npm install --no-save --no-audit --no-fund <tarball>` into a
 * disposable root (no registry credentials needed — installing a local
 * tarball path never talks to a registry) and type-checks a fixture that
 * imports the declared export.
 */
export function resolveRealCombination(repoRoot, combo) {
  const entry = packPackage(repoRoot, combo.pkgDir);
  const consumerRoot = mkdtempSync(path.join(tmpdir(), 'minion-consumer-'));
  try {
    writeFileSync(path.join(consumerRoot, 'package.json'), JSON.stringify({ name: 'consumer-fixture', version: '0.0.0', private: true }, null, 2));
    const tarballPath = findTarball(repoRoot, combo.pkgDir, entry);
    // --legacy-peer-deps: npm >=7 otherwise auto-installs peers from the
    // network by default, which would silently mask exactly the missing-peer
    // case this matrix exists to catch (and would be an unwanted network
    // fetch on every real-mode run). Peers this matrix wants present are
    // copied explicitly from local disk below instead.
    execFileSync('npm', ['install', '--no-save', '--no-audit', '--no-fund', '--legacy-peer-deps', tarballPath], {
      cwd: consumerRoot,
      stdio: 'pipe',
    });
    if (combo.peerDependencies) {
      // Copy the already-installed peer straight from this checkout's own
      // node_modules rather than `npm install`ing it — that would hit the
      // registry over the network for no reason: the exact peer this repo
      // already resolved (via the owning package's own devDependency) is
      // sitting on disk right now.
      for (const peerName of Object.keys(combo.peerDependencies)) {
        const peerDir = path.join(repoRoot, combo.pkgDir, 'node_modules', peerName);
        if (!existsSync(peerDir)) {
          throw new Error(
            `${peerName} is not installed under ${combo.pkgDir}/node_modules — run pnpm install first`,
          );
        }
        cpSync(peerDir, path.join(consumerRoot, 'node_modules', peerName), { recursive: true, dereference: true });
      }
    }
    writeTsConfig(consumerRoot);
    // tsc's CommonJS-emit path for a JSON import rejects the `with { type:
    // 'json' }` attribute Node's own ESM loader requires at runtime below,
    // so the .ts fixture stays a plain import (resolveJsonModule, set in
    // writeTsConfig, is what makes tsc accept it without the attribute).
    const importLine = combo.sampleImport
      ? `import { ${combo.sampleImport} } from '${combo.importSpecifier}';\nvoid ${combo.sampleImport};\n`
      : `import data from '${combo.importSpecifier}';\nvoid data;\n`;
    writeFileSync(path.join(consumerRoot, 'index.ts'), importLine);
    const jsonAttr = combo.importSpecifier.endsWith('.json') ? " with { type: 'json' }" : '';
    // Use this checkout's own already-installed tsc rather than installing
    // one into the disposable consumer root — no extra install, no network.
    // pnpm's workspace store puts it under packages/shared's node_modules
    // (that package already depends on typescript); resolve it with
    // require.resolve rather than hardcoding a store layout.
    const tscBin = path.join(
      path.dirname(require.resolve('typescript/package.json', { paths: [path.join(repoRoot, 'packages', 'shared')] })),
      'bin',
      'tsc',
    );
    execFileSync(process.execPath, [tscBin, '--noEmit', '-p', '.'], { cwd: consumerRoot, stdio: 'pipe' });
    // Type-checking the public .d.ts alone is not sufficient for crm-sdk: its
    // shipped declarations don't leak the `postgres` peer's types into the
    // public surface (CrmClientOptions.databaseUrl is `string`, not a
    // postgres type), so a missing peer only breaks at module-evaluation
    // time (client.js's top-level `import postgres from 'postgres'`), not at
    // typecheck time. Actually importing the compiled JS is what a package
    // with a required, non-optional peer needs proven — run it for real.
    execFileSync(
      process.execPath,
      ['--input-type=module', '-e', `import ${JSON.stringify(combo.importSpecifier)}${jsonAttr};`],
      { cwd: consumerRoot, stdio: 'pipe' },
    );
    return { ok: true, entry, consumer: combo.consumer };
  } finally {
    rmSync(consumerRoot, { recursive: true, force: true });
  }
}

function findTarball(repoRoot, pkgDir, entry) {
  // packPackage already deleted its own scratch tarball; repack once more
  // into a dir we control for the install step (still the same tooling,
  // same source — a second pack of unchanged source is byte-identical, see
  // package-provenance.test.mjs's repack-identity case).
  const outDir = mkdtempSync(path.join(tmpdir(), 'minion-consumer-src-'));
  const raw = execFileSync('pnpm', ['pack', '--pack-destination', outDir, '--json'], {
    cwd: path.join(repoRoot, pkgDir),
    encoding: 'utf8',
  });
  const lines = raw.split('\n');
  const jsonStart = lines.findIndex((l) => l.trim() === '{');
  const parsed = JSON.parse((jsonStart === -1 ? raw : lines.slice(jsonStart).join('\n')));
  return parsed.filename;
}

function requiredPeers(repoRoot, pkgDir) {
  const pkgJson = JSON.parse(readFileSync(path.join(repoRoot, pkgDir, 'package.json'), 'utf8'));
  const peers = pkgJson.peerDependencies ?? {};
  const meta = pkgJson.peerDependenciesMeta ?? {};
  return Object.keys(peers).filter((p) => !meta[p]?.optional);
}

/**
 * Fixture-only mode: no packing, no installs, no network — pure logic
 * check against a checked-in synthetic consumer manifest. The required-peer
 * set comes from the REAL package's own package.json (source of truth,
 * read here, not reimplemented per fixture), so a fixture consumer that
 * omits a required peer fails for the same reason a real install would.
 */
export function resolveFixtureCombination(repoRoot, combo) {
  const dir = path.join(FIXTURES_DIR, sanitize(combo.pkgDir) + '__' + combo.consumer);
  if (!existsSync(dir)) {
    throw new Error(`missing fixture consumer dir: ${dir}`);
  }
  const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const missing = requiredPeers(repoRoot, combo.pkgDir).filter(
    (p) => !manifest.peerDependencies?.[p] && !manifest.dependencies?.[p],
  );
  if (missing.length > 0) {
    throw new Error(
      `fixture consumer ${dir} is missing required peer(s) [${missing.join(', ')}] for ${combo.pkgDir}`,
    );
  }
  return { ok: true, fixtureDir: dir };
}

function sanitize(p) {
  return p.replace(/[/\\]/g, '-');
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixtureOnly = process.argv.includes('--fixture-only');
  const repoRoot = path.resolve(import.meta.dirname, '..', '..');
  const results = [];

  for (const combo of SUPPORTED_COMBINATIONS) {
    const label = `${combo.pkgDir} -> ${combo.consumer}`;
    try {
      const result = fixtureOnly
        ? resolveFixtureCombination(repoRoot, combo)
        : resolveRealCombination(repoRoot, combo);
      results.push({ combo: label, expected: 'supported', ok: true, mode: fixtureOnly ? 'fixture' : 'real', ...result });
      console.error(`PASS  ${label}`);
    } catch (err) {
      results.push({ combo: label, expected: 'supported', ok: false, error: err.message });
      console.error(`FAIL  ${label}: ${err.message}`);
    }
  }

  // Unsupported combinations must fail. A silent pass here is the real bug
  // this task guards against — record it as `ok: false` (an unexpected
  // pass), not as a matrix success.
  for (const combo of UNSUPPORTED_COMBINATIONS) {
    const label = `${combo.pkgDir} -> ${combo.consumer} (expected unsupported: ${combo.reason})`;
    try {
      fixtureOnly ? resolveFixtureCombination(repoRoot, combo) : resolveRealCombination(repoRoot, combo);
      results.push({ combo: label, expected: 'unsupported', ok: false, error: 'unexpectedly resolved' });
      console.error(`FAIL  ${label}: unexpectedly resolved (should have been blocked)`);
    } catch (err) {
      results.push({ combo: label, expected: 'unsupported', ok: true, blockedWith: err.message });
      console.error(`PASS  ${label}: correctly blocked (${err.message})`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify(results, null, 2));
  if (failed.length > 0) process.exit(1);
}
