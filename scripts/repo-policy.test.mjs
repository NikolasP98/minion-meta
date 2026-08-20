#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { buildArtifact, effectiveRequiredChecks, readPolicy, validatePolicy, validateRemoteState } from './repo-policy.mjs';

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
assert.match(errorFor((value) => { value.repositories[0].aliases = {}; }), /minion-meta.*aliases: must be an array/);
assert.match(errorFor((value) => { value.repositories[0].aliases = null; }), /minion-meta.*aliases: must be an array/);
assert.match(errorFor((value) => { value.repositories = [null]; }), /row-0\]: must be an object/);
assert.match(errorFor((value) => { value.repositories.pop(); }), /canonical ids must be exactly/);
assert.match(errorFor((value) => { value.repositories.push(clone(value.repositories[0])); }), /canonical ids must be exactly/);
assert.match(errorFor((value) => { value.repositories.find((row) => row.id === 'minion_hub').aliases = []; }), /CLI mapping hub must resolve to minion_hub/);
assert.match(errorFor((value) => { value.repositories.find((row) => row.id === 'minion_site').aliases = ['website']; }), /CLI mapping site must resolve to minion_site/);

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
assert.match(
  errorFor((value) => { value.repositories = [{ ...clone(extension.repositories[0]), aliases: ['hub'] }]; }, { fleet: false, canonicalRows: policy.repositories }),
  /aliases: 'hub' collides with canonical fleet policy/
);

const reordered = clone(policy);
reordered.repositories.reverse();
for (const row of reordered.repositories) { row.aliases.reverse(); row.requiredChecks.reverse(); }
const reorderedKeys = JSON.parse(JSON.stringify(reordered, (key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).reverse()) : value));
assert.equal(buildArtifact(policy).contentHash, buildArtifact(reorderedKeys).contentHash, 'set/key order changed the canonical hash');

// The hash is over the canonical body with contentHash omitted — never self-referential.
const artifact = buildArtifact(policy);
const { contentHash, ...artifactBody } = artifact;
assert.equal(createHash('sha256').update(JSON.stringify(artifactBody)).digest('hex'), contentHash);

// The checked-in artifact is exactly what `generate` writes, and that comparison is drift-sensitive.
const generatedText = readFileSync(new URL('../generated/repo-policy.json', import.meta.url), 'utf8');
assert.equal(generatedText, `${JSON.stringify(artifact, null, 2)}\n`, 'generated/repo-policy.json is stale; run node scripts/repo-policy.mjs generate');
const drifted = clone(policy);
drifted.repositories[0].branches.development = 'trunk';
assert.notEqual(buildArtifact(drifted).contentHash, contentHash, 'a policy change did not change the canonical hash');
assert.notEqual(`${JSON.stringify(buildArtifact(drifted), null, 2)}\n`, generatedText);

const schema = JSON.parse(readFileSync(new URL('../repo-policy.schema.json', import.meta.url), 'utf8'));
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
assert.equal(validateSchema(policy), true, JSON.stringify(validateSchema.errors));
assert.equal(validateSchema(buildArtifact(policy)), true, JSON.stringify(validateSchema.errors));
assert.equal(validateSchema(extension), true, JSON.stringify(validateSchema.errors));
for (const mutate of [
  (value) => { value.repositories[0].commands.build = ''; },
  (value) => { value.repositories[0].commands.build = 'pnpm build && deploy'; },
  (value) => { value.repositories[0].checkout = '/tmp/repo'; },
  (value) => { value.repositories[0].checkout = '../repo'; }
]) {
  const invalid = clone(policy);
  mutate(invalid);
  assert.equal(validateSchema(invalid), false, 'schema negative fixture unexpectedly passed');
}

const classicOnly = effectiveRequiredChecks(
  { checks: [{ context: 'verify', app_id: 15368 }] },
  [],
  'dev',
  'main'
);
assert.deepEqual(classicOnly, [{ name: 'verify', appId: 15368 }]);
const rulesetFixtures = [
  { enforcement: 'disabled', target: 'branch', rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'disabled', integration_id: 1 }] } }] },
  { enforcement: 'active', target: 'branch', conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } }, rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'other-branch', integration_id: 2 }] } }] },
  { enforcement: 'active', target: 'branch', conditions: { ref_name: { include: ['refs/heads/dev'], exclude: [] } }, rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'verify', integration_id: 15368 }] } }] }
];
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, rulesetFixtures, 'dev', 'main'), [{ name: 'verify', appId: 15368 }]);

const allBranchesRule = { enforcement: 'active', target: 'branch', conditions: { ref_name: { include: ['~ALL'], exclude: [] } }, rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'all-branches', integration_id: 3 }] } }] };
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [allBranchesRule], 'dev', 'main'), [{ name: 'all-branches', appId: 3 }]);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [{ ...allBranchesRule, conditions: { ref_name: { include: ['~ALL'], exclude: ['refs/heads/dev'] } } }], 'dev', 'main'), []);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [{ ...allBranchesRule, enforcement: 'disabled' }], 'dev', 'main'), []);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [{ ...allBranchesRule, conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } } }], 'dev', 'main'), []);

function requiredCheckRule(pattern, name, exclude = []) {
  return {
    enforcement: 'active', target: 'branch',
    conditions: { ref_name: { include: [pattern], exclude } },
    rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: name, integration_id: 4 }] } }]
  };
}
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/[0-9]', 'character-set')], 'release/1', 'main'), [{ name: 'character-set', appId: 4 }]);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/*', 'single-level')], 'release/a/b', 'main'), []);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/**', 'terminal-stars')], 'release/a/b', 'main'), []);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/**/*', 'recursive')], 'release/a/b', 'main'), [{ name: 'recursive', appId: 4 }]);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/**/candidate', 'recursive-zero-level')], 'release/candidate', 'main'), [{ name: 'recursive-zero-level', appId: 4 }]);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/?', 'single-character')], 'release/1', 'main'), [{ name: 'single-character', appId: 4 }]);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('refs/heads/release/?', 'single-character')], 'release/12', 'main'), []);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('~ALL', 'terminal-exclude', ['refs/heads/release/**'])], 'release/a/b', 'main'), [{ name: 'terminal-exclude', appId: 4 }]);
assert.deepEqual(effectiveRequiredChecks({ checks: [] }, [requiredCheckRule('~ALL', 'recursive-exclude', ['refs/heads/release/**/*'])], 'release/a/b', 'main'), []);

const temp = mkdtempSync(join(tmpdir(), 'repo-policy-test-'));
try {
  const goodState = Object.fromEntries(policy.repositories.map((row) => [row.remote, { policyAccessible: true, branches: [...new Set(Object.values(row.branches))], requiredChecks: row.requiredChecks }]));
  assert.deepEqual(validateRemoteState(policy, goodState), []);
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

  for (const [mutate, diagnostic] of [
    [(value) => { value['NikolasP98/minion-site'].branches = 'xxdevxxmasterxx'; }, /minion-site\.branches: must be an array/],
    [(value) => { value['NikolasP98/minion-site'].branches = ['dev', 'dev']; }, /minion-site\.branches\[1\]: duplicate branch name/],
    [(value) => { delete value['NikolasP98/minion-site'].policyAccessible; }, /minion-site\.policyAccessible: is required/],
    [(value) => { value['NikolasP98/minion-site'].requiredChecks = [{ name: '', appId: '15368' }]; }, /minion-site\.requiredChecks\[0\]\.name: must be non-empty/],
    [(value) => { value['NikolasP98/minion-site'].unexpected = true; }, /minion-site\.unexpected: unknown field/]
  ]) {
    const malformed = clone(goodState);
    mutate(malformed);
    writeFileSync(fixture, JSON.stringify(malformed));
    result = spawnSync(process.execPath, ['scripts/repo-policy.mjs', 'verify-remote', '--fixture', fixture], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, 'malformed remote fixture unexpectedly passed');
    assert.match(result.stderr, diagnostic);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }

// `--parity` asserts the checked-in projections in this checkout — the root AGENTS.md policy-owned
// blocks, minion.json, and generated/repo-policy.json — against the registry (spec D3).
if (process.argv.includes('--parity')) {
  const { checkCliRegistry, checkInstructionPair, checkProjections, cliRows } = await import('./check-agent-instructions.mjs');
  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  const agents = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');
  assert.deepEqual(checkProjections(agents, policy), [], 'AGENTS.md policy-owned blocks drifted from repo-policy.yaml');
  assert.deepEqual(checkCliRegistry(rootDir, policy), [], 'minion.json drifted from repo-policy.yaml');
  assert.deepEqual(checkInstructionPair(rootDir, { label: 'minion-meta' }), [], 'the meta instruction pair drifted');

  // Exact projection assertions, independent of the checker's own comparison logic.
  const registry = JSON.parse(readFileSync(new URL('../minion.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(registry.subprojects).sort(), ['hub', 'minion', 'paperclip', 'pixel-agents', 'plugins', 'site']);
  const tick = '`';
  for (const { cliId, row } of cliRows(policy)) {
    const entry = registry.subprojects[cliId];
    assert.equal(entry.path, row.checkout, `minion.json ${cliId}.path`);
    assert.equal(entry.branch, row.branches.development, `minion.json ${cliId}.branch`);
    assert.equal(entry.remote.replace(/^git@[^:]+:/, '').replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, ''), row.remote, `minion.json ${cliId}.remote`);
    assert.ok(
      agents.includes(`| ${tick}${row.id}${tick} | ${tick}${cliId}${tick} | ${tick}${row.checkout}/${tick} |`),
      `AGENTS.md project-map is missing the row for ${row.id}`
    );
    for (const [key, command] of Object.entries(row.commands)) {
      if (key !== 'install') assert.equal(entry.commands[key], command ?? undefined, `minion.json ${cliId}.commands.${key}`);
      if (command !== null) assert.ok(agents.includes(`${tick}${command}${tick}`), `AGENTS.md commands block is missing ${command}`);
    }
  }
  const generated = JSON.parse(generatedText);
  assert.deepEqual(generated.repositories.map((row) => row.id), policy.repositories.map((row) => row.id).sort((a, b) => a.localeCompare(b)));
  assert.equal(generated.contentHash, contentHash);
  assert.equal(generated.schemaVersion, 1);
  console.log('repo policy parity assertions passed');
}

console.log('repo policy tests passed');
