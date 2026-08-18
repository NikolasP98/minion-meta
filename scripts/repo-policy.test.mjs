#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildArtifact, readPolicy, validatePolicy } from './repo-policy.mjs';

const policy = readPolicy();
assert.deepEqual(validatePolicy(policy), []);
assert.deepEqual(policy.repositories.map((row) => row.id).sort(), ['minion-meta', 'minion', 'minion_hub', 'minion_site', 'minion_plugins', 'paperclip', 'pixel-agents', 'minion-factory', 'minion-base'].sort());

function clone(value) { return structuredClone(value); }
function errorFor(mutator, options) {
  const candidate = clone(policy);
  mutator(candidate);
  const errors = validatePolicy(candidate, options);
  assert(errors.length > 0, 'negative fixture unexpectedly passed');
  return errors.join('\n');
}

assert.match(errorFor((value) => { value.repositories[0].unexpected = true; }), /minion-meta.*unexpected: unknown field/);
assert.match(errorFor((value) => { delete value.repositories[0].branches.release; }), /minion-meta.*branches.release: is required/);
assert.match(errorFor((value) => { delete value.repositories[0].commands.test; }), /minion-meta.*commands.test: is required/);
assert.match(errorFor((value) => { delete value.repositories[0].requiredChecks; }), /minion-meta.*requiredChecks: is required/);
assert.match(errorFor((value) => { value.repositories[0].commands.build = ''; }), /minion-meta.*commands.build/);
assert.match(errorFor((value) => { value.repositories[0].commands.build = 'pnpm build && deploy'; }), /minion-meta.*commands.build/);
assert.match(errorFor((value) => { value.repositories[0].requiredChecks = [{ name: '', appId: 0 }]; }), /requiredChecks\[0\].name/);
assert.match(errorFor((value) => { value.repositories[1].aliases.push('meta'); }), /collides with minion-meta/);

const extension = {
  schemaVersion: 1,
  repositories: [{
    id: 'local-tool', aliases: ['tool'], checkout: 'mounted/local-tool', remote: 'Example/local-tool', packageManager: 'npm',
    branches: { development: 'main', default: 'main', release: 'main' }, prBase: 'main',
    commands: { install: 'npm install', dev: null, build: null, test: 'npm test', check: null, typecheck: null }, requiredChecks: []
  }]
};
assert.deepEqual(validatePolicy(extension, { fleet: false, canonicalRows: policy.repositories }), []);
assert.match(errorFor((value) => { value.repositories = [clone(policy.repositories[0])]; }, { fleet: false, canonicalRows: policy.repositories }), /cannot override canonical|collides with canonical/);

const reordered = clone(policy);
reordered.repositories.reverse();
for (const row of reordered.repositories) { row.aliases.reverse(); row.requiredChecks.reverse(); }
const reorderedKeys = JSON.parse(JSON.stringify(reordered, (key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value));
assert.equal(buildArtifact(policy).contentHash, buildArtifact(reorderedKeys).contentHash, 'set/key order changed the canonical hash');

const temp = mkdtempSync(join(tmpdir(), 'repo-policy-test-'));
try {
  const goodState = Object.fromEntries(policy.repositories.map((row) => [row.remote, { policyAccessible: true, branches: [...new Set(Object.values(row.branches))], requiredChecks: row.requiredChecks }]));
  const fixture = join(temp, 'remote.json');
  writeFileSync(fixture, JSON.stringify(goodState));
  let result = spawnSync(process.execPath, ['scripts/repo-policy.mjs', 'verify-remote', '--fixture', fixture], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);

  const inaccessible = clone(goodState);
  inaccessible['NikolasP98/minion-ai'].policyAccessible = false;
  writeFileSync(fixture, JSON.stringify(inaccessible));
  result = spawnSync(process.execPath, ['scripts/repo-policy.mjs', 'verify-remote', '--fixture', fixture], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /minion.*requiredChecks: policy data is inaccessible or unverifiable/);

  const drifted = clone(goodState);
  drifted['pablodelucca/pixel-agents'].requiredChecks = [{ name: 'Required Checks', appId: 999 }];
  writeFileSync(fixture, JSON.stringify(drifted));
  result = spawnSync(process.execPath, ['scripts/repo-policy.mjs', 'verify-remote', '--fixture', fixture], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pixel-agents.*requiredChecks: remote identities do not match policy/);
} finally { rmSync(temp, { recursive: true, force: true }); }

console.log('repo policy tests passed');
