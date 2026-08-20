#!/usr/bin/env node

// Instruction-pair checker and root-projection parity gate for
// specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.md (Slice 2).
//
// Every repository must ship one substantive, provider-neutral AGENTS.md plus a CLAUDE.md that is
// exactly the include line. Facts owned by repo-policy.yaml (directories, package managers, branch
// roles, commands) may only be restated inside marked policy-owned blocks, which this checker
// compares field by field. Prose outside those blocks is never rejected merely for naming a branch.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliMappings, readPolicy, resolveRepo } from './repo-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const INCLUDE_LINE = '@AGENTS.md';
export const INCLUDE_BYTES = `${INCLUDE_LINE}\n`;
export const PROJECT_MAP_BLOCK = 'project-map';
export const COMMANDS_BLOCK = 'commands';
export const NULL_CELL = '—';

const projectMapHeader = ['Repo id', 'CLI id', 'Directory', 'Package manager', 'Development branch', 'PR base'];
const commandKeys = ['install', 'dev', 'build', 'test', 'check', 'typecheck'];
const commandsHeader = ['Repo id', 'Install', 'Dev', 'Build', 'Test', 'Check', 'Typecheck'];
// The CLI executes these four and carries `typecheck` as data; it has no `install` command.
const cliCommandKeys = ['dev', 'build', 'test', 'check', 'typecheck'];
const memoryBlockPattern = /^<claude-mem-context\b/i;
const headingPattern = /^#{1,6}\s+\S/;
const includePattern = /^@[^\s@]\S*$/;
// CommonMark inline links. The destination is either `<...>` — which may hold spaces — or a run of
// non-whitespace characters with balanced parentheses; either form may carry an optional title, and
// both admit backslash-escaped ASCII punctuation. Both forms must be parsed: matching only the
// second would let a real link such as `[x](<./missing file.md>)` slip past the broken-link gate.
const linkPattern = /\[[^\]]*\]\(\s*(?:<((?:[^<>\n\\]|\\[!-\/:-@[-`{-~]|\\\\)*)>|((?:[^\s()\\]|\\[!-\/:-@[-`{-~]|\((?:[^\s()\\]|\\[!-\/:-@[-`{-~])*\))+))(?:\s+(?:"[^"]*"|'[^']*'|\([^()]*\)))?\s*\)/g;
const escapePattern = /\\([!-\/:-@[-`{-~])/g;
const separatorPattern = /^:?-+:?$/;

function readIfFile(path) {
  return existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : null;
}

/** Markdown lines outside fenced code blocks — command examples in fences are documentation, not policy. */
function proseLines(text) {
  const lines = [];
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (!fenced) lines.push(line);
  }
  return lines;
}

function includeTargets(lines) {
  return lines.map((line) => line.trim()).filter((line) => includePattern.test(line)).map((line) => line.slice(1));
}

/** Percent-decode a destination, tolerating a literal '%' that is not a valid escape. */
function decodeTarget(target) {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

/**
 * Local link destinations, normalized: backslash escapes resolved, percent-escapes decoded, the
 * fragment dropped, surrounding whitespace trimmed. Absolute URLs and protocol-relative links are
 * skipped — only paths this checkout can resolve are returned.
 */
function linkTargets(lines) {
  const targets = [];
  for (const line of lines) {
    for (const match of line.matchAll(linkPattern)) {
      const raw = (match[1] ?? match[2]).replace(escapePattern, '$1').trim();
      const target = raw.split('#')[0].trim();
      if (target === '' || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      targets.push(decodeTarget(target));
    }
  }
  return targets;
}

function substantiveErrors(label, text) {
  const errors = [];
  const lines = text.split('\n');
  const first = lines.find((line) => line.trim() !== '');
  if (first === undefined) return [`${label}: must not be empty`];
  if (memoryBlockPattern.test(first.trim())) errors.push(`${label}: must not open with a <claude-mem-context> memory block`);
  const body = lines.filter((line) => line.trim() !== '' && !includePattern.test(line.trim()));
  const characters = body.join('').replace(/\s+/g, '').length;
  if (!body.some((line) => headingPattern.test(line.trim()))) errors.push(`${label}: must contain at least one markdown heading`);
  if (body.length < 5 || characters < 200) errors.push(`${label}: must be substantive, found ${body.length} content lines and ${characters} non-whitespace characters (minimum 5 and 200)`);
  return errors;
}

/**
 * Check one repository's instruction pair. `checkout` is a directory; a missing directory is
 * reported as not supplied rather than silently passing.
 */
export function checkInstructionPair(checkout, { label = checkout } = {}) {
  const dir = resolve(checkout);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${label}: checkout was not supplied (no directory at ${dir})`];
  const errors = [];
  const agents = readIfFile(join(dir, 'AGENTS.md'));
  const claude = readIfFile(join(dir, 'CLAUDE.md'));
  if (agents === null) errors.push(`${label}/AGENTS.md: is required — canonical provider-neutral instructions`);
  if (claude === null) errors.push(`${label}/CLAUDE.md: is required — compatibility include`);
  else if (claude !== INCLUDE_BYTES) errors.push(`${label}/CLAUDE.md: must be exactly '${INCLUDE_LINE}' plus one trailing newline`);
  if (agents !== null) {
    errors.push(...substantiveErrors(`${label}/AGENTS.md`, agents));
    const lines = proseLines(agents);
    for (const target of includeTargets(lines)) {
      if (!existsSync(resolve(dir, target))) errors.push(`${label}/AGENTS.md: include '@${target}' does not resolve`);
    }
    for (const target of linkTargets(lines)) {
      if (!existsSync(resolve(dir, target))) errors.push(`${label}/AGENTS.md: link '${target}' does not resolve`);
    }
  }
  return errors;
}

/** The six CLI-registered fleet rows, in canonical id order, paired with their stable CLI key. */
export function cliRows(policy) {
  return Object.entries(cliMappings)
    .map(([cliId, id]) => ({ cliId, id, row: resolveRepo(policy, id) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function commandCell(value) {
  return value === null ? NULL_CELL : `\`${value}\``;
}

function renderTable(header, rows) {
  return [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows.map((cells) => `| ${cells.join(' | ')} |`)].join('\n');
}

/** Render the canonical `repo-policy:project-map` table body from the registry. */
export function renderProjectMap(policy) {
  return renderTable(projectMapHeader, cliRows(policy).map(({ cliId, row }) => [
    `\`${row.id}\``, `\`${cliId}\``, `\`${row.checkout}/\``, `\`${row.packageManager}\``, `\`${row.branches.development}\``, `\`${row.prBase}\``
  ]));
}

/** Render the canonical `repo-policy:commands` table body from the registry. */
export function renderCommands(policy) {
  return renderTable(commandsHeader, cliRows(policy).map(({ row }) => [`\`${row.id}\``, ...commandKeys.map((key) => commandCell(row.commands[key]))]));
}

/** Render a whole marked block, markers included — the copy-paste fix for a drifted projection. */
export function renderBlock(name, policy) {
  const body = name === PROJECT_MAP_BLOCK ? renderProjectMap(policy) : renderCommands(policy);
  return `<!-- repo-policy:${name} -->\n${body}\n<!-- /repo-policy:${name} -->`;
}

function blockBody(text, name, label, errors) {
  const open = `<!-- repo-policy:${name} -->`;
  const close = `<!-- /repo-policy:${name} -->`;
  const start = text.indexOf(open);
  const end = text.indexOf(close);
  if (start === -1 || end === -1 || end < start) {
    errors.push(`${label}: policy-owned block '${name}' is missing`);
    return null;
  }
  if (text.indexOf(open, start + open.length) !== -1) errors.push(`${label}: policy-owned block '${name}' is declared more than once`);
  return text.slice(start + open.length, end);
}

function parseTable(body) {
  const rows = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cellText) => cellText.trim()));
  if (rows.length < 2 || !rows[1].every((cellText) => separatorPattern.test(cellText))) return null;
  return { header: rows[0], rows: rows.slice(2) };
}

function cell(value) {
  return value.replace(/^`/, '').replace(/`$/, '').trim();
}

function checkTable(body, label, name, header, expected, compare, errors) {
  const table = parseTable(body);
  if (!table) {
    errors.push(`${label} [${name}]: must contain a markdown table with a header separator row`);
    return;
  }
  if (table.header.join(' | ') !== header.join(' | ')) {
    errors.push(`${label} [${name}]: columns must be exactly '${header.join(' | ')}'`);
    return;
  }
  const seen = new Set();
  table.rows.forEach((cells, index) => {
    if (cells.length !== header.length) {
      errors.push(`${label} [${name}] row ${index + 1}: has ${cells.length} cells, expected ${header.length}`);
      return;
    }
    const id = cell(cells[0]);
    const match = expected.find((candidate) => candidate.id === id);
    if (!match) {
      errors.push(`${label} [${name}] row ${index + 1}: '${id}' is not a CLI-registered repository policy row`);
      return;
    }
    if (seen.has(id)) errors.push(`${label} [${name}]: '${id}' appears more than once`);
    seen.add(id);
    for (const [field, actual, want] of compare(match, cells)) {
      if (actual !== want) errors.push(`${label} [${name}] ${id}.${field}: '${actual}' does not match repo-policy '${want}'`);
    }
  });
  for (const candidate of expected) {
    if (!seen.has(candidate.id)) errors.push(`${label} [${name}]: row for '${candidate.id}' is missing`);
  }
}

/** Compare the marked policy-owned blocks in a root AGENTS.md against the registry. */
export function checkProjections(agentsText, policy, label = 'AGENTS.md') {
  const errors = [];
  const expected = cliRows(policy);
  const projectMap = blockBody(agentsText, PROJECT_MAP_BLOCK, label, errors);
  if (projectMap !== null) {
    checkTable(projectMap, label, PROJECT_MAP_BLOCK, projectMapHeader, expected, ({ cliId, row }, cells) => [
      ['CLI id', cell(cells[1]), cliId],
      ['Directory', cell(cells[2]).replace(/\/$/, ''), row.checkout],
      ['Package manager', cell(cells[3]), row.packageManager],
      ['Development branch', cell(cells[4]), row.branches.development],
      ['PR base', cell(cells[5]), row.prBase]
    ], errors);
  }
  const commands = blockBody(agentsText, COMMANDS_BLOCK, label, errors);
  if (commands !== null) {
    checkTable(commands, label, COMMANDS_BLOCK, commandsHeader, expected, ({ row }, cells) => commandKeys.map((key, index) => {
      const declared = row.commands[key];
      return [`commands.${key}`, cell(cells[index + 1]), declared === null ? NULL_CELL : declared];
    }), errors);
  }
  return errors;
}

function normalizeRemote(value) {
  if (typeof value !== 'string') return null;
  return value
    .replace(/^git@[^:]+:/, '')
    .replace(/^ssh:\/\/git@[^/]+\//, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/\.git$/, '');
}

/** Check that `minion.json` is a faithful six-key projection of the registry. */
export function checkCliRegistry(rootDir, policy) {
  const path = join(rootDir, 'minion.json');
  const text = readIfFile(path);
  if (text === null) return ['minion.json: is required'];
  let registry;
  try {
    registry = JSON.parse(text);
  } catch (error) {
    return [`minion.json: must be valid JSON: ${error.message}`];
  }
  const subprojects = registry?.subprojects;
  if (!subprojects || typeof subprojects !== 'object' || Array.isArray(subprojects)) return ['minion.json.subprojects: must be an object'];
  const errors = [];
  for (const key of Object.keys(subprojects)) {
    if (!(key in cliMappings)) errors.push(`minion.json.subprojects.${key}: unknown CLI id — the stable keys are ${Object.keys(cliMappings).join(', ')}`);
  }
  for (const [cliId, id] of Object.entries(cliMappings)) {
    const path2 = `minion.json.subprojects.${cliId}`;
    const entry = subprojects[cliId];
    const row = resolveRepo(policy, id);
    if (!row) { errors.push(`${path2}: '${id}' is not in repository policy`); continue; }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { errors.push(`${path2}: is required and must project repo-policy row '${id}'`); continue; }
    if (entry.path !== row.checkout) errors.push(`${path2}.path: '${entry.path}' does not match repo-policy checkout '${row.checkout}'`);
    if (normalizeRemote(entry.remote) !== row.remote) errors.push(`${path2}.remote: '${entry.remote}' does not normalize to repo-policy remote '${row.remote}'`);
    if (entry.branch !== row.branches.development) errors.push(`${path2}.branch: '${entry.branch}' does not match repo-policy development branch '${row.branches.development}'`);
    if (entry.packageManager !== row.packageManager) errors.push(`${path2}.packageManager: '${entry.packageManager}' does not match repo-policy '${row.packageManager}'`);
    // A 'none' row must also be self-consistent: no package manager means no runnable command.
    if (row.packageManager === 'none' && cliCommandKeys.some((key) => row.commands[key] !== null)) {
      errors.push(`${path2}.packageManager: repo-policy declares 'none' yet also declares runnable commands`);
    }
    const commands = entry.commands;
    if (!commands || typeof commands !== 'object' || Array.isArray(commands)) { errors.push(`${path2}.commands: must be an object`); continue; }
    for (const key of Object.keys(commands)) {
      if (!cliCommandKeys.includes(key)) errors.push(`${path2}.commands.${key}: unknown command — the CLI projects ${cliCommandKeys.join(', ')}`);
    }
    for (const key of cliCommandKeys) {
      const declared = row.commands[key];
      const actual = commands[key];
      if (declared === null && actual !== undefined) errors.push(`${path2}.commands.${key}: repo-policy declares no '${key}' command`);
      else if (declared !== null && actual !== declared) errors.push(`${path2}.commands.${key}: '${actual ?? '(absent)'}' does not match repo-policy '${declared}'`);
    }
  }
  return errors;
}

/** Root projections: the marked AGENTS.md blocks plus the `minion.json` CLI registry. */
export function checkRootProjections(rootDir, policy) {
  const agents = readIfFile(join(rootDir, 'AGENTS.md'));
  const errors = agents === null ? ['AGENTS.md: is required'] : checkProjections(agents, policy);
  return [...errors, ...checkCliRegistry(rootDir, policy)];
}

function fail(errors) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}

export function run(argv = process.argv.slice(2)) {
  let rootDir = root;
  const targets = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      const value = argv[index + 1];
      if (!value) return fail(['--root: requires a directory']);
      rootDir = resolve(value);
      index += 1;
    } else if (arg.startsWith('-')) {
      return fail([`usage: check-agent-instructions.mjs [--root <meta-checkout>] [<product-checkout> ...]`]);
    } else targets.push(arg);
  }
  let policy;
  try {
    policy = readPolicy(join(rootDir, 'repo-policy.yaml'));
  } catch (error) {
    return fail([error.message]);
  }
  const errors = [
    ...checkRootProjections(rootDir, policy),
    ...checkInstructionPair(rootDir, { label: 'minion-meta' }),
    ...targets.flatMap((target) => checkInstructionPair(resolve(target), { label: target }))
  ];
  if (errors.length) fail(errors);
  else console.log(`instruction parity verified (root projections + ${targets.length + 1} instruction pair${targets.length === 0 ? '' : 's'})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
