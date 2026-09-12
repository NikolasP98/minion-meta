#!/usr/bin/env node
// Qualify freshly built packages with the invoking runtime. No production config.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(process.env.QC_REPORT_DIR ?? join(root, 'artifacts/bridge-runtime'));
const revision = process.env.QC_SOURCE_REVISION;
assert.equal(process.version, 'v22.13.0', 'this gate qualifies the exact declared floor');
assert.deepEqual(process.execArgv, [], 'runtime flags are forbidden');
assert.ok(!process.env.NODE_OPTIONS, 'NODE_OPTIONS is forbidden');
assert.match(revision ?? '', /^[a-f0-9]{40}$/, 'supply the tested source revision');
mkdirSync(output, { recursive: true });
const env = { LANG: 'C.UTF-8', TMPDIR: tmpdir() };
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
function tree(directory) {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? Object.entries(tree(path)) : [[relative(root, path), digest(path)]];
  }));
}
const bridge = join(root, 'packages/shells-bridge');
assert.equal(realpathSync(join(bridge, 'node_modules/@minion-stack/shared')), realpathSync(join(root, 'packages/shared')), 'bridge must consume the emitted candidate shared package');
const report = {
  sourceRevision: revision,
  qualifierSha256: digest(fileURLToPath(import.meta.url)),
  smokeSha256: digest(join(bridge, 'scripts/journal-smoke.mjs')),
  imageProvenanceSha256: digest(join(root, 'scripts/qc/bridge-runtime-image.json')),
  workflowSha256: digest(join(root, '.github/workflows/bridge-runtime-floor.yml')),
  runtime: { version: process.version, platform: process.platform, arch: process.arch, execPath: process.execPath, sha256: digest(process.execPath), execArgv: process.execArgv },
  image: process.env.QC_IMAGE ?? null,
  packages: {}, tests: [], emittedSmoke: null,
  success: false,
};
try {
  for (const name of ['shared', 'shells-bridge']) {
    const path = join(root, 'packages', name);
    const manifest = join(path, 'package.json');
    report.packages[name] = { version: JSON.parse(readFileSync(manifest, 'utf8')).version, manifestSha256: digest(manifest), source: tree(join(path, 'src')), emitted: tree(join(path, 'dist')) };
  }
  report.lockSha256 = digest(join(root, 'pnpm-lock.yaml'));
  const smoke = execFileSync(process.execPath, [join(bridge, 'scripts/journal-smoke.mjs'), join(bridge, 'dist/run-journal.js')], { env, encoding: 'utf8', timeout: 15000 });
  report.emittedSmoke = JSON.parse(smoke);
  assert.equal(report.emittedSmoke.runtime, process.version);
  assert.deepEqual(report.emittedSmoke.execArgv, []);
  assert.ok(report.emittedSmoke.reopened && report.emittedSmoke.acknowledged);
  for (const [name, files] of [
    ['shared', ['src/gateway/shells-outcome.test.ts']],
    ['shells-bridge', ['src/run-journal.test.ts', 'src/bridge.test.ts']],
  ]) {
    const cwd = join(root, 'packages', name);
    const resultFile = join(output, `${name}-tests.json`);
    const logFile = join(output, `${name}-tests.log`);
    let stdout = '';
    try {
      stdout = execFileSync(process.execPath, [join(cwd, 'node_modules/vitest/vitest.mjs'), 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--reporter=json', `--outputFile=${resultFile}`], { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    } catch (error) {
      writeFileSync(logFile, `${error.stdout ?? ''}\n${error.stderr ?? ''}`);
      throw error;
    }
    writeFileSync(logFile, stdout);
    const result = JSON.parse(readFileSync(resultFile, 'utf8'));
    assert.equal(result.testResults.length, files.length, `${name}: unexpected test file count`);
    for (const file of files) {
      const matches = result.testResults.filter((test) => test.name === join(cwd, file));
      assert.equal(matches.length, 1, `${name}: requested file missing or duplicated: ${file}`);
      assert.equal(matches[0].status, 'passed', `${name}: suite failed: ${file}`);
      assert.equal(matches[0].message, '', `${name}: suite runtime error: ${file}`);
      assert.ok(matches[0].assertionResults.length > 0, `${name}: empty suite: ${file}`);
    }
    assert.equal(result.numPendingTests, 0, `${name}: pending tests`);
    assert.equal(result.numTodoTests, 0, `${name}: todo tests`);
    assert.equal(result.numFailedTestSuites, 0, `${name}: failed suites`);
    assert.equal(result.numPendingTestSuites, 0, `${name}: pending suites`);
    // Vitest 2 reports runtime failures via suite status/message, without this
    // Jest field. Enforce the count too if a later reporter supplies it.
    if (Object.hasOwn(result, 'numRuntimeErrorTestSuites')) assert.equal(result.numRuntimeErrorTestSuites, 0, `${name}: runtime-error suites`);
    const assertions = result.testResults.flatMap((file) => file.assertionResults);
    assert.ok(result.success && assertions.length > 0, `${name}: no successful test evidence`);
    assert.ok(assertions.every((test) => test.status === 'passed'), `${name}: failed, skipped or todo tests`);
    assert.equal(result.numPassedTests, result.numTotalTests, `${name}: incomplete tests`);
    report.tests.push({ package: name, passed: result.numPassedTests, failed: result.numFailedTests, skipped: result.numPendingTests, todo: result.numTodoTests, reportSha256: digest(resultFile) });
  }
  report.success = true;
} finally {
  writeFileSync(join(output, 'qualification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ runtime: report.runtime, image: report.image, emittedSmoke: report.emittedSmoke, tests: report.tests, success: report.success }, null, 2));
}
