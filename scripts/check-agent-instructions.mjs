#!/usr/bin/env node

// Instruction-pair checker and root-projection parity gate for
// specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.md (Slice 2).
//
// Every repository must ship one substantive, provider-neutral AGENTS.md plus a CLAUDE.md that is
// exactly the include line. Facts owned by repo-policy.yaml (directories, package managers, branch
// roles, commands) may only be restated inside marked policy-owned blocks, which this checker
// compares field by field. Prose outside those blocks is never rejected merely for naming a branch.
//
// Every Markdown judgement below is delegated to micromark/mdast — the 100%-CommonMark-compliant
// parser behind remark — plus the GFM table extension, because this repository's governed blocks are
// GFM tables. Hand-rolled scanning was tried first and lost one review round per CommonMark
// construct (angle-bracket destinations, nested parentheses, bracketed labels, reference and
// shortcut definitions, definitions inside containers, pseudo-fences, code spans crossing
// paragraphs, fences inside HTML comments). The parser is the single source of truth for what a
// renderer shows, so this file only asks it three questions: which source lines are live (not code
// blocks), which destinations does the document actually link to, and where are the policy-owned
// HTML-comment markers.

import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';
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
// The CLI's minion.json registry projects the same six command keys as the AGENTS.md commands
// block — `install` included, so a subproject can be bootstrapped from registry metadata alone.
const cliCommandKeys = commandKeys;
const memoryBlockPattern = /^<claude-mem-context\b/i;
const includePattern = /^@[^\s@]\S*$/;
const separatorPattern = /^:?-+:?$/;
// mdast parents whose `html` children are HTML *blocks* rather than inline raw HTML. A policy
// marker is only governance when a renderer emits it as its own block, not when it is quoted inside
// a paragraph, a heading, or a table cell.
const blockParents = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition']);

/** Parse Markdown the way a renderer does: CommonMark (micromark) plus GFM tables. */
function parseMarkdown(text) {
  return fromMarkdown(text, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] });
}

/** Depth-first walk in document order, so the FIRST link reference definition of a label wins. */
function* walk(node, parent = null) {
  yield { node, parent };
  for (const child of node.children ?? []) yield* walk(child, node);
}

/**
 * The rendered view of one Markdown document:
 *
 * - `lines` — the source lines with every code block (fenced and indented) blanked, so content a
 *   renderer shows as an inert sample can satisfy no gate. Blanking rather than dropping keeps line
 *   numbers stable and can never splice two blocks into one.
 * - `htmlLines` — the 1-based line numbers covered by an HTML *block*, used to recognize the
 *   policy-owned `<!-- repo-policy:* -->` markers only where a renderer emits them as raw HTML.
 * - `liveLines` — `lines` with HTML-block and link-definition ranges also blanked. Neither raw HTML
 *   (a comment, a `<script>` body, any raw-HTML container) nor reference metadata renders as
 *   instructions. A line inside one that merely looks like an include directive (`@file.md`) is
 *   therefore not one, and invisible source bytes cannot satisfy the substantive-body threshold.
 *   Governed-marker recognition keeps using `lines` + `htmlLines` instead, since that check wants
 *   the marker text itself, not an absence of it.
 * - `headings` — how many real heading nodes the document has (a `#` inside a fence is not one).
 * - `targets` — every local destination the document links to, from every CommonMark link and image
 *   form: inline, full/collapsed/shortcut references, and angle-bracket destinations. micromark
 *   only produces a reference node when a matching definition exists, and this resolves it against
 *   the first definition of that label, exactly as the renderer does.
 */
function renderedView(text) {
  const tree = parseMarkdown(text);
  const lines = text.split('\n');
  const htmlLines = new Set();
  const definitionLines = new Set();
  const definitions = new Map();
  const references = [];
  const destinations = [];
  let headings = 0;
  for (const { node, parent } of walk(tree)) {
    const position = node.position;
    switch (node.type) {
      case 'code':
        for (let line = position.start.line; line <= position.end.line; line += 1) lines[line - 1] = '';
        break;
      case 'html':
        if (parent !== null && blockParents.has(parent.type)) {
          for (let line = position.start.line; line <= position.end.line; line += 1) htmlLines.add(line);
        }
        break;
      case 'heading':
        headings += 1;
        break;
      case 'definition':
        for (let line = position.start.line; line <= position.end.line; line += 1) definitionLines.add(line);
        if (!definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
        break;
      case 'link':
      case 'image':
        destinations.push(node.url);
        break;
      case 'linkReference':
      case 'imageReference':
        references.push(node.identifier);
        break;
      default:
        break;
    }
  }
  for (const identifier of references) {
    if (definitions.has(identifier)) destinations.push(definitions.get(identifier));
  }
  const targets = [];
  for (const destination of destinations) pushTarget(targets, destination);
  const liveLines = lines.map((line, index) => (htmlLines.has(index + 1) || definitionLines.has(index + 1) ? '' : line));
  return { lines, liveLines, htmlLines, headings, targets };
}

/**
 * Keep `destination` if it is a path this checkout could resolve. mdast has already resolved
 * backslash escapes and character references; what is left is dropping the fragment and skipping
 * anything a browser would send to the network (an absolute URL or a protocol-relative one).
 */
function pushTarget(targets, destination) {
  const target = destination.split('#')[0].trim();
  if (target === '' || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return;
  targets.push(decodeTarget(target));
}

/** Percent-decode a destination, tolerating a literal '%' that is not a valid escape. */
function decodeTarget(target) {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

function readIfFile(path) {
  return existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : null;
}

/**
 * Resolve `target` against checkout root `dir`, refusing to leave it. `path.resolve` honours an
 * absolute second argument verbatim, discarding `dir` entirely, so an include or link like
 * `/etc/passwd` would otherwise be validated against the host filesystem instead of the checkout;
 * a lexical `..` escape is rejected the same way. A target that survives that check is also
 * resolved through `realpath`, so a symlink inside the checkout that points outside it cannot be
 * used to escape either. Returns the resolved path, or null when the target does not resolve to a
 * real file/directory inside `dir`.
 */
function escapesCheckout(rel) {
  return rel !== '' && (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel));
}

function resolveWithinCheckout(dir, target) {
  if (isAbsolute(target)) return null;
  const resolved = resolve(dir, target);
  if (escapesCheckout(relative(dir, resolved))) return null;
  if (!existsSync(resolved)) return null;
  const realDir = realpathSync(dir);
  const realResolved = realpathSync(resolved);
  if (escapesCheckout(relative(realDir, realResolved))) return null;
  return resolved;
}

function includeTargets(lines) {
  return lines.map((line) => line.trim()).filter((line) => includePattern.test(line)).map((line) => line.slice(1));
}

function substantiveErrors(label, view) {
  const errors = [];
  const first = view.lines.find((line) => line.trim() !== '');
  if (first === undefined) return [`${label}: must not be empty`];
  if (memoryBlockPattern.test(first.trim())) errors.push(`${label}: must not open with a <claude-mem-context> memory block`);
  const body = view.liveLines.filter((line) => line.trim() !== '' && !includePattern.test(line.trim()));
  const characters = body.join('').replace(/\s+/g, '').length;
  if (view.headings === 0) errors.push(`${label}: must contain at least one markdown heading`);
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
    const view = renderedView(agents);
    errors.push(...substantiveErrors(`${label}/AGENTS.md`, view));
    for (const target of includeTargets(view.liveLines)) {
      if (resolveWithinCheckout(dir, target) === null) errors.push(`${label}/AGENTS.md: include '@${target}' does not resolve`);
    }
    for (const target of view.targets) {
      if (resolveWithinCheckout(dir, target) === null) errors.push(`${label}/AGENTS.md: link '${target}' does not resolve`);
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

/**
 * The live source lines between a policy-owned block's markers, or null when the block is absent.
 * A marker only counts where a renderer emits it: alone on a line that mdast attributes to an HTML
 * block. The same bytes inside a fence, an indented code block, a code span, or a table cell are a
 * sample of the contract, not the contract — so a whole AGENTS.md pasted into one fence declares no
 * governed table at all, and is reported as missing rather than silently accepted.
 */
function blockBody(view, name, label, errors) {
  const open = `<!-- repo-policy:${name} -->`;
  const close = `<!-- /repo-policy:${name} -->`;
  const at = (marker) => view.lines
    .map((line, index) => (view.htmlLines.has(index + 1) && line.trim() === marker ? index : -1))
    .filter((index) => index !== -1);
  const opens = at(open);
  const closes = at(close).filter((index) => opens.length > 0 && index > opens[0]);
  if (opens.length === 0 || closes.length === 0) {
    errors.push(`${label}: policy-owned block '${name}' is missing`);
    return null;
  }
  if (opens.length > 1) errors.push(`${label}: policy-owned block '${name}' is declared more than once`);
  return view.lines.slice(opens[0] + 1, closes[0]).join('\n');
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
  // Code blocks are documentation, not policy — a policy-owned block or table inside one must not
  // satisfy this gate, the same way it cannot satisfy the substantive-content or link checks.
  const view = renderedView(agentsText);
  const projectMap = blockBody(view, PROJECT_MAP_BLOCK, label, errors);
  if (projectMap !== null) {
    checkTable(projectMap, label, PROJECT_MAP_BLOCK, projectMapHeader, expected, ({ cliId, row }, cells) => [
      ['CLI id', cell(cells[1]), cliId],
      ['Directory', cell(cells[2]).replace(/\/$/, ''), row.checkout],
      ['Package manager', cell(cells[3]), row.packageManager],
      ['Development branch', cell(cells[4]), row.branches.development],
      ['PR base', cell(cells[5]), row.prBase]
    ], errors);
  }
  const commands = blockBody(view, COMMANDS_BLOCK, label, errors);
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
