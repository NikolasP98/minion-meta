#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = resolve(root, 'repo-policy.yaml');
const generatedPath = resolve(root, 'generated/repo-policy.json');
export const fleetIds = ['minion-meta', 'minion', 'minion_hub', 'minion_site', 'minion_plugins', 'paperclip', 'pixel-agents', 'minion-factory', 'minion-base'];
export const cliMappings = { minion: 'minion', hub: 'minion_hub', site: 'minion_site', paperclip: 'paperclip', 'pixel-agents': 'pixel-agents', plugins: 'minion_plugins' };
const rowKeys = ['id', 'aliases', 'checkout', 'remote', 'packageManager', 'branches', 'prBase', 'commands', 'requiredChecks'];
const branchKeys = ['development', 'default', 'release'];
const commandKeys = ['install', 'dev', 'build', 'test', 'check', 'typecheck'];
const managers = new Set(['pnpm', 'bun', 'npm', 'none']);
const safeCommand = /^[A-Za-z0-9_./:@+-]+(?: [A-Za-z0-9_./:@=+-]+)*$/;
const namePattern = /^[a-z0-9][a-z0-9_-]*$/;
const remotePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const invalidBranchPattern = /[\u0000-\u0020\u007f~^:?*[\\]/;

export function readPolicy(path = policyPath) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: document must be valid JSON-compatible YAML: ${error.message}`);
  }
}

/** Resolve a canonical id or alias to its policy row, or `undefined` when the name is unknown. */
export function resolveRepo(policy, name) {
  return policy.repositories.find((row) => row.id === name || (Array.isArray(row.aliases) && row.aliases.includes(name)));
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
  const validCanonicalRows = canonicalRows.filter((row) => row && typeof row.id === 'string' && Array.isArray(row.aliases));
  const canonicalIds = new Set(validCanonicalRows.map((row) => row.id));
  const canonicalNames = new Set(validCanonicalRows.flatMap((row) => [row.id, ...row.aliases]));
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
    const validRows = policy.repositories.filter((row) => row && typeof row.id === 'string' && Array.isArray(row.aliases));
    const byName = new Map(validRows.flatMap((row) => [row.id, ...row.aliases].map((name) => [name, row.id])));
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

function validBranchName(value) {
  return typeof value === 'string' && value.length > 0 && value !== '@' && !value.startsWith('-') && !value.startsWith('.') && !value.endsWith('.') && !value.endsWith('/') && !value.includes('..') && !value.includes('@{') && !value.includes('//') && !invalidBranchPattern.test(value) && value.split('/').every((part) => part && !part.startsWith('.') && !part.endsWith('.lock'));
}

export function validateRemoteState(policy, state) {
  const errors = [];
  const remotes = new Set(policy.repositories.map((row) => row.remote));
  if (!state || typeof state !== 'object' || Array.isArray(state)) return ['$: must be an object'];
  for (const remote of remotes) if (!(remote in state)) errors.push(`$.${remote}: is required`);
  for (const [remoteName, remote] of Object.entries(state)) {
    const path = `$.${remoteName}`;
    if (!remotes.has(remoteName)) { errors.push(`${path}: unknown field`); continue; }
    if (!keysExactly(remote, ['branches', 'policyAccessible', 'requiredChecks'], path, errors)) continue;
    if (!Array.isArray(remote.branches)) errors.push(`${path}.branches: must be an array`);
    else {
      const branches = new Set();
      remote.branches.forEach((branch, index) => {
        if (!validBranchName(branch)) errors.push(`${path}.branches[${index}]: must be a valid branch name`);
        else if (branches.has(branch)) errors.push(`${path}.branches[${index}]: duplicate branch name`);
        branches.add(branch);
      });
    }
    if (typeof remote.policyAccessible !== 'boolean') errors.push(`${path}.policyAccessible: must be a boolean`);
    if (!Array.isArray(remote.requiredChecks)) errors.push(`${path}.requiredChecks: must be an array`);
    else {
      const identities = new Set();
      remote.requiredChecks.forEach((check, index) => {
        const checkPath = `${path}.requiredChecks[${index}]`;
        if (!keysExactly(check, ['name', 'appId'], checkPath, errors)) return;
        if (typeof check.name !== 'string' || check.name.trim() === '') errors.push(`${checkPath}.name: must be non-empty`);
        if (!Number.isInteger(check.appId) || check.appId <= 0) errors.push(`${checkPath}.appId: must be a positive integer`);
        const identity = `${check.name}\0${check.appId}`;
        if (identities.has(identity)) errors.push(`${checkPath}: duplicate check identity`);
        identities.add(identity);
      });
    }
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

function fnmatchPattern(pattern) {
  let expression = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        while (pattern[index + 1] === '*') index += 1;
        if (pattern[index + 1] === '/') {
          expression += '(?:.*/)?';
          index += 1;
        } else expression += '[^/]*';
      } else expression += '[^/]*';
    } else if (character === '?') expression += '[^/]';
    else if (character === '[') {
      const closing = pattern.indexOf(']', index + 1);
      if (closing === -1) expression += '\\[';
      else {
        let contents = pattern.slice(index + 1, closing);
        if (contents.startsWith('!')) contents = `^${contents.slice(1)}`;
        else if (contents.startsWith('^')) contents = `\\${contents}`;
        expression += `(?!/)[${contents.replaceAll('\\', '\\\\')}]`;
        index = closing;
      }
    } else if ('\\.^$+{}()|'.includes(character)) expression += `\\${character}`;
    else expression += character;
  }
  return new RegExp(`^${expression}$`);
}

function refPatternMatches(pattern, branch, defaultBranch) {
  if (pattern === '~ALL') return true;
  const normalized = pattern === '~DEFAULT_BRANCH' ? defaultBranch : pattern.replace(/^refs\/heads\//, '');
  return fnmatchPattern(normalized).test(branch);
}

function rulesetApplies(ruleset, branch, defaultBranch) {
  if (ruleset.enforcement !== 'active') return false;
  const target = ruleset.target;
  if (target && target !== 'branch') return false;
  const ref = ruleset.conditions?.ref_name;
  if (!ref) return true;
  if ((ref.exclude ?? []).some((pattern) => refPatternMatches(pattern, branch, defaultBranch))) return false;
  return (ref.include ?? []).length === 0 || ref.include.some((pattern) => refPatternMatches(pattern, branch, defaultBranch));
}

export function effectiveRequiredChecks(classic, rulesets, branch, defaultBranch) {
  const checks = [...(classic?.checks ?? []).map((check) => ({ name: check.context, appId: check.app_id }))];
  for (const ruleset of rulesets.filter((candidate) => rulesetApplies(candidate, branch, defaultBranch))) {
    for (const rule of ruleset.rules ?? []) {
      if (rule.type !== 'required_status_checks') continue;
      for (const check of rule.parameters?.required_status_checks ?? []) checks.push({ name: check.context, appId: check.integration_id });
    }
  }
  const identities = new Map(checks.map((check) => [`${check.name}\0${check.appId}`, check]));
  return [...identities.values()].sort((a, b) => a.name.localeCompare(b.name) || a.appId - b.appId);
}

function liveRemoteState(policy) {
  const state = {};
  for (const row of policy.repositories) {
    const branches = ghPages(`repos/${row.remote}/branches?per_page=100`).map((branch) => branch.name);
    let rules;
    let classic;
    try { rules = ghJson([`repos/${row.remote}/rulesets?includes_parents=true`]); }
    catch { state[row.remote] = { branches, policyAccessible: false, requiredChecks: [] }; continue; }
    try { classic = ghJson([`repos/${row.remote}/branches/${encodeURIComponent(row.prBase)}/protection/required_status_checks`]); }
    catch (error) {
      const stderr = error?.stderr?.toString() ?? '';
      if (stderr.includes('404')) classic = { checks: [] };
      else { state[row.remote] = { branches, policyAccessible: false, requiredChecks: [] }; continue; }
    }
    if ((classic.contexts ?? []).length > (classic.checks ?? []).length) {
      state[row.remote] = { branches, policyAccessible: false, requiredChecks: [] };
      continue;
    }
    let repository;
    try { repository = ghJson([`repos/${row.remote}`]); }
    catch { state[row.remote] = { branches, policyAccessible: false, requiredChecks: [] }; continue; }
    const ruleDetails = rules.map((rule) => ghJson([`repos/${row.remote}/rulesets/${rule.id}`]));
    state[row.remote] = { branches, policyAccessible: true, requiredChecks: effectiveRequiredChecks(classic, ruleDetails, row.prBase, repository.default_branch) };
  }
  return state;
}

export function run(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  const policy = readPolicy();
  const errors = validatePolicy(policy);
  if (errors.length) { fail(errors); return; }
  if (command === 'validate') {
    try {
      const schema = JSON.parse(readFileSync(resolve(root, 'repo-policy.schema.json'), 'utf8'));
      const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
      const documents = [['repo-policy.yaml', policy], ['generated/repo-policy.json', JSON.parse(readFileSync(generatedPath, 'utf8'))]];
      const schemaErrors = documents.flatMap(([name, document]) => validate(document) ? [] : validate.errors.map((error) => `${name}${error.instancePath}: ${error.message}`));
      if (schemaErrors.length) fail(schemaErrors); else console.log(`valid repository policy (${policy.repositories.length} rows)`);
    } catch (error) { fail([`repo-policy.schema.json: ${error.message}`]); }
  } else if (command === 'generate') {
    const text = artifactText(policy);
    if (args.includes('--check')) {
      if (readFileSync(generatedPath, 'utf8') !== text) fail(['generated/repo-policy.json: stale; run node scripts/repo-policy.mjs generate']);
      else console.log(`generated policy is current (${buildArtifact(policy).contentHash})`);
    } else { writeFileSync(generatedPath, text); console.log(`wrote generated/repo-policy.json (${buildArtifact(policy).contentHash})`); }
  } else if (command === 'show') {
    const name = args[0];
    const row = resolveRepo(policy, name);
    if (!row) fail([`repository '${name}' is not in policy`]); else console.log(JSON.stringify(row, null, 2));
  } else if (command === 'verify-remote') {
    const fixtureIndex = args.indexOf('--fixture');
    const state = fixtureIndex >= 0 ? JSON.parse(readFileSync(resolve(process.cwd(), args[fixtureIndex + 1]), 'utf8')) : liveRemoteState(policy);
    const fixtureErrors = fixtureIndex >= 0 ? validateRemoteState(policy, state) : [];
    if (fixtureErrors.length) { fail(fixtureErrors); return; }
    const drift = checkRemoteState(policy, state);
    if (drift.length) fail(drift); else console.log(`remote policy verified (${policy.repositories.length} rows)`);
  } else fail([`usage: repo-policy.mjs validate | generate [--check] | show <id-or-alias> | verify-remote [--fixture path]`]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
