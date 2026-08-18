#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = resolve(root, 'repo-policy.yaml');
const generatedPath = resolve(root, 'generated/repo-policy.json');
const fleetIds = ['minion-meta', 'minion', 'minion_hub', 'minion_site', 'minion_plugins', 'paperclip', 'pixel-agents', 'minion-factory', 'minion-base'];
const cliMappings = { minion: 'minion', hub: 'minion_hub', site: 'minion_site', paperclip: 'paperclip', 'pixel-agents': 'pixel-agents', plugins: 'minion_plugins' };
const rowKeys = ['id', 'aliases', 'checkout', 'remote', 'packageManager', 'branches', 'prBase', 'commands', 'requiredChecks'];
const branchKeys = ['development', 'default', 'release'];
const commandKeys = ['install', 'dev', 'build', 'test', 'check', 'typecheck'];
const managers = new Set(['pnpm', 'bun', 'npm', 'none']);
const safeCommand = /^[A-Za-z0-9_./:@+-]+(?: [A-Za-z0-9_./:@=+-]+)*$/;
const namePattern = /^[a-z0-9][a-z0-9_-]*$/;
const remotePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function readPolicy(path = policyPath) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: document must be valid JSON-compatible YAML: ${error.message}`);
  }
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function keysExactly(value, expected, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: must be an object`);
    return false;
  }
  for (const key of expected) if (!(key in value)) errors.push(`${path}.${key}: is required`);
  for (const key of Object.keys(value)) if (!expected.includes(key)) errors.push(`${path}.${key}: unknown field`);
  return true;
}

export function validatePolicy(policy, { fleet = true, canonicalRows = [] } = {}) {
  const errors = [];
  if (!keysExactly(policy, ['schemaVersion', 'repositories'], '$', errors)) return errors;
  if (policy.schemaVersion !== 1) errors.push('$.schemaVersion: must equal 1');
  if (!Array.isArray(policy.repositories)) return [...errors, '$.repositories: must be an array'];
  if (fleet && !sameMembers(policy.repositories.map((row) => row?.id), fleetIds)) errors.push(`$.repositories: canonical ids must be exactly ${fleetIds.join(', ')}`);
  const canonicalIds = new Set(canonicalRows.map((row) => row.id));
  const canonicalNames = new Set(canonicalRows.flatMap((row) => [row.id, ...row.aliases]));
  const names = new Map();
  policy.repositories.forEach((row, index) => {
    const fallback = `row-${index}`;
    const id = typeof row?.id === 'string' ? row.id : fallback;
    const path = `$.repositories[${id}]`;
    if (!keysExactly(row, rowKeys, path, errors)) return;
    if (!namePattern.test(row.id)) errors.push(`${path}.id: malformed canonical id`);
    if (!Array.isArray(row.aliases)) errors.push(`${path}.aliases: must be an array`);
    else for (const [aliasIndex, alias] of row.aliases.entries()) {
      if (typeof alias !== 'string' || !namePattern.test(alias)) errors.push(`${path}.aliases[${aliasIndex}]: malformed alias`);
    }
    for (const name of [row.id, ...(Array.isArray(row.aliases) ? row.aliases : [])]) {
      if (names.has(name)) errors.push(`${path}.${name === row.id ? 'id' : 'aliases'}: '${name}' collides with ${names.get(name)}`);
      else names.set(name, id);
      if (!fleet && canonicalNames.has(name)) errors.push(`${path}.${name === row.id ? 'id' : 'aliases'}: '${name}' collides with canonical fleet policy`);
    }
    if (!fleet && canonicalIds.has(row.id)) errors.push(`${path}.id: cannot override canonical fleet row`);
    if (typeof row.checkout !== 'string' || row.checkout.length === 0 || row.checkout.startsWith('/') || row.checkout.split('/').includes('..')) errors.push(`${path}.checkout: must be a non-empty relative path`);
    if (typeof row.remote !== 'string' || !remotePattern.test(row.remote)) errors.push(`${path}.remote: must be an owner/repo slug`);
    if (!managers.has(row.packageManager)) errors.push(`${path}.packageManager: unsupported package manager`);
    if (keysExactly(row.branches, branchKeys, `${path}.branches`, errors)) {
      for (const key of branchKeys) if (typeof row.branches[key] !== 'string' || row.branches[key].trim() === '') errors.push(`${path}.branches.${key}: must be non-empty`);
      if (typeof row.prBase !== 'string' || !Object.values(row.branches).includes(row.prBase)) errors.push(`${path}.prBase: must equal a declared branch role`);
    }
    if (keysExactly(row.commands, commandKeys, `${path}.commands`, errors)) {
      for (const key of commandKeys) {
        const command = row.commands[key];
        if (command !== null && (typeof command !== 'string' || !safeCommand.test(command))) errors.push(`${path}.commands.${key}: must be null or a restricted non-shell command`);
      }
    }
    if (!Array.isArray(row.requiredChecks)) errors.push(`${path}.requiredChecks: must be an array`);
    else {
      const checkKeys = new Set();
      row.requiredChecks.forEach((check, checkIndex) => {
        const checkPath = `${path}.requiredChecks[${checkIndex}]`;
        if (!keysExactly(check, ['name', 'appId'], checkPath, errors)) return;
        if (typeof check.name !== 'string' || check.name.trim() === '') errors.push(`${checkPath}.name: must be non-empty`);
        if (!Number.isInteger(check.appId) || check.appId <= 0) errors.push(`${checkPath}.appId: must be a positive integer`);
        const identity = `${check.name}\0${check.appId}`;
        if (checkKeys.has(identity)) errors.push(`${checkPath}: duplicate check identity`);
        checkKeys.add(identity);
      });
    }
  });
  if (fleet) {
    const byName = new Map(policy.repositories.flatMap((row) => [row.id, ...row.aliases].map((name) => [name, row.id])));
    for (const [key, id] of Object.entries(cliMappings)) if (byName.get(key) !== id) errors.push(`$.repositories: CLI mapping ${key} must resolve to ${id}`);
  }
  return errors;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function buildArtifact(policy) {
  const repositories = policy.repositories.map((row) => ({ ...row, aliases: [...row.aliases].sort(), requiredChecks: [...row.requiredChecks].sort((a, b) => a.name.localeCompare(b.name) || a.appId - b.appId) })).sort((a, b) => a.id.localeCompare(b.id));
  const body = canonicalize({ schemaVersion: policy.schemaVersion, repositories });
  const contentHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return canonicalize({ ...body, contentHash });
}

function artifactText(policy) {
  return `${JSON.stringify(buildArtifact(policy), null, 2)}\n`;
}

function fail(errors) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}

function checkRemoteState(policy, state) {
  const errors = [];
  for (const row of policy.repositories) {
    const remote = state[row.remote];
    const path = `$.repositories[${row.id}]`;
    if (!remote) { errors.push(`${path}.remote: no remote evidence for ${row.remote}`); continue; }
    if (remote.policyAccessible !== true) errors.push(`${path}.requiredChecks: policy data is inaccessible or unverifiable`);
    for (const branch of new Set(Object.values(row.branches))) if (!remote.branches?.includes(branch)) errors.push(`${path}.branches: remote branch '${branch}' is missing`);
    const actual = (remote.requiredChecks ?? []).map((check) => `${check.name}\0${check.appId}`).sort();
    const expected = row.requiredChecks.map((check) => `${check.name}\0${check.appId}`).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${path}.requiredChecks: remote identities do not match policy`);
  }
  return errors;
}

function ghJson(args) {
  return JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function ghPages(endpoint) {
  const pages = JSON.parse(execFileSync('gh', ['api', endpoint, '--paginate', '--slurp'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  return pages.flat();
}

function graphQlPolicy(remote) {
  const [owner, name] = remote.split('/');
  const query = 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){branchProtectionRules(first:100){nodes{pattern requiresStatusChecks requiredStatusCheckContexts}} rulesets(first:100){nodes{name enforcement rules(first:100){nodes{type parameters{... on RequiredStatusChecksParameters{requiredStatusChecks{context integrationId}}}}}}}}}';
  const result = ghJson(['graphql', '-f', `owner=${owner}`, '-f', `name=${name}`, '-f', `query=${query}`]).data.repository;
  const classic = result.branchProtectionRules.nodes.flatMap((rule) => rule.requiredStatusCheckContexts.map((context) => ({ name: context, appId: null })));
  const rulesets = result.rulesets.nodes.flatMap((ruleset) => ruleset.rules.nodes.filter((rule) => rule.type === 'REQUIRED_STATUS_CHECKS').flatMap((rule) => rule.parameters.requiredStatusChecks.map((check) => ({ name: check.context, appId: check.integrationId }))));
  return [...classic, ...rulesets];
}

function liveRemoteState(policy) {
  const state = {};
  for (const row of policy.repositories) {
    const branches = ghPages(`repos/${row.remote}/branches?per_page=100`).map((branch) => branch.name);
    let rules;
    try { rules = ghJson([`repos/${row.remote}/rulesets?includes_parents=true`]); }
    catch {
      try { state[row.remote] = { branches, policyAccessible: true, requiredChecks: graphQlPolicy(row.remote) }; }
      catch { state[row.remote] = { branches, policyAccessible: false, requiredChecks: [] }; }
      continue;
    }
    const ruleDetails = rules.map((rule) => ghJson([`repos/${row.remote}/rulesets/${rule.id}`]));
    const requiredChecks = ruleDetails.flatMap((rule) => (rule.rules ?? []).filter((item) => item.type === 'required_status_checks').flatMap((item) => item.parameters?.required_status_checks ?? []).map((check) => ({ name: check.context, appId: check.integration_id })));
    state[row.remote] = { branches, policyAccessible: true, requiredChecks };
  }
  return state;
}

export function run(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  const policy = readPolicy();
  const errors = validatePolicy(policy);
  if (errors.length) { fail(errors); return; }
  if (command === 'validate') {
    if (readFileSync(resolve(root, 'repo-policy.schema.json'), 'utf8').trim() === '') fail(['repo-policy.schema.json: must not be empty']);
    else console.log(`valid repository policy (${policy.repositories.length} rows)`);
  } else if (command === 'generate') {
    const text = artifactText(policy);
    if (args.includes('--check')) {
      if (readFileSync(generatedPath, 'utf8') !== text) fail(['generated/repo-policy.json: stale; run node scripts/repo-policy.mjs generate']);
      else console.log(`generated policy is current (${buildArtifact(policy).contentHash})`);
    } else { writeFileSync(generatedPath, text); console.log(`wrote generated/repo-policy.json (${buildArtifact(policy).contentHash})`); }
  } else if (command === 'show') {
    const name = args[0];
    const row = policy.repositories.find((candidate) => candidate.id === name || candidate.aliases.includes(name));
    if (!row) fail([`repository '${name}' is not in policy`]); else console.log(JSON.stringify(row, null, 2));
  } else if (command === 'verify-remote') {
    const fixtureIndex = args.indexOf('--fixture');
    const state = fixtureIndex >= 0 ? JSON.parse(readFileSync(resolve(process.cwd(), args[fixtureIndex + 1]), 'utf8')) : liveRemoteState(policy);
    const drift = checkRemoteState(policy, state);
    if (drift.length) fail(drift); else console.log(`remote policy verified (${policy.repositories.length} rows)`);
  } else fail([`usage: repo-policy.mjs validate | generate [--check] | show <id-or-alias> | verify-remote [--fixture path]`]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
