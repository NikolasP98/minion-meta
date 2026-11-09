#!/usr/bin/env node
// Evidence rerun only. Never edits the gateway or preserved probe artifacts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] ?? '--validate-only';
if (!['--validate-only', '--inspect', '--run'].includes(mode) || process.argv.length > 3) {
  throw new Error('Usage: MINION_ENGINE_SOURCE=/matching/gateway node rerun.mjs [--validate-only|--inspect|--run]');
}
assert.ok(process.env.MINION_ENGINE_SOURCE, 'Set MINION_ENGINE_SOURCE to the gateway checkout');
const sourceRoot = fs.realpathSync(process.env.MINION_ENGINE_SOURCE);
// Preserved probes contain quoted literal imports. Reject unusual delimiter paths
// instead of generating ambiguous JavaScript; ordinary paths with spaces work.
assert.ok(!/["'`\\\r\n]/u.test(sourceRoot), 'Source path must not contain JS string delimiters, backslashes, or newlines');
const manifest = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'source-manifest.json'), 'utf8'));
const head = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
assert.equal(head, manifest.head, 'Gateway HEAD does not match recorded evidence');
for (const entry of manifest.files) {
  const file = path.resolve(sourceRoot, entry.path);
  assert.ok(file.startsWith(sourceRoot + path.sep), 'Manifest path escapes source root');
  const digest = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(digest, entry.sha256, `Source hash mismatch: ${entry.path}`);
}
const lock = fs.readFileSync(path.join(sourceRoot, 'pnpm-lock.yaml'));
const recordedLock = execFileSync('git', ['-C', sourceRoot, 'show', `${head}:pnpm-lock.yaml`], {maxBuffer: 20 * 1024 * 1024});
assert.ok(lock.equals(recordedLock), 'Working lockfile differs from recorded HEAD');
console.log(JSON.stringify({head, verifiedSourceFiles: manifest.files.length, lockMatchesHead: true, mode}));
if (mode === '--validate-only') process.exit(0);

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-engine-recon-'));
try {
  if (mode === '--inspect') {
    const original = fs.readFileSync(path.join(evidenceDir, 'inspect-engine-boundaries.cjs'), 'utf8');
    const temporary = path.join(scratch, 'inspect-engine-boundaries.cjs');
    fs.writeFileSync(temporary, original.replaceAll(manifest.gatewayRoot, sourceRoot));
    const result = spawnSync(process.execPath, [temporary], {cwd: sourceRoot, stdio: 'inherit'});
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Static probe failed: ${result.signal ?? result.status}`);
  } else {
    const original = fs.readFileSync(path.join(evidenceDir, 'engine-boundaries.test.ts'), 'utf8');
    fs.writeFileSync(path.join(scratch, 'engine-boundaries.test.ts'), original.replaceAll(manifest.gatewayRoot, sourceRoot));
    const quote = JSON.stringify;
    const config = `import { defineConfig } from ${quote(sourceRoot + '/node_modules/vitest/dist/config.js')};
import base from ${quote(sourceRoot + '/vitest.config.ts')};
export default defineConfig({...base,
 resolve: {...base.resolve, alias: [{find: /^vitest$/, replacement: ${quote(sourceRoot + '/node_modules/vitest/dist/index.js')}}, ...base.resolve.alias]},
 root: ${quote(scratch)},
 test: {...base.test, projects: undefined, name: 'engine-recon', include: ['engine-boundaries.test.ts'], exclude: [], setupFiles: [${quote(sourceRoot + '/test/setup-base.ts')}], pool: 'forks', minWorkers: 1, maxWorkers: 1}
});
`;
    const temporary = path.join(scratch, 'vitest.engine-recon.config.mts');
    fs.writeFileSync(temporary, config);
    const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', temporary], {cwd: sourceRoot, stdio: 'inherit'});
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Characterization tests failed: ${result.signal ?? result.status}`);
  }
} finally {
  fs.rmSync(scratch, {recursive: true, force: true});
}
