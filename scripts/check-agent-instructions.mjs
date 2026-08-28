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
// The CLI's minion.json registry projects the same six command keys as the AGENTS.md commands
// block — `install` included, so a subproject can be bootstrapped from registry metadata alone.
const cliCommandKeys = commandKeys;
const memoryBlockPattern = /^<claude-mem-context\b/i;
const headingPattern = /^#{1,6}\s+\S/;
const includePattern = /^@[^\s@]\S*$/;
const escapePattern = /\\([!-\/:-@[-`{-~])/g;
const separatorPattern = /^:?-+:?$/;
const whitespacePattern = /\s/;
// Lines that close a paragraph, so the line after one starts a new block where a link reference
// definition may appear: ATX headings, thematic breaks / setext underlines, table rows, and HTML.
// A plain paragraph line does not — a definition may not interrupt a paragraph.
const paragraphTerminatorPattern = /^ {0,3}(#{1,6}([ \t]|$)|([-*_][ \t]*){3,}$|\||<)/;
// CommonMark caps a link label at 999 characters; the same cap keeps a stray '[' from scanning on.
const LABEL_LIMIT = 999;
// A block quote marker, and a list item marker — CommonMark parses each container's content as its
// own sub-document, so a line's real "start of block" content sits after any chain of these.
const blockQuoteMarkerPattern = /^ {0,3}>[ \t]?/;
const listMarkerPattern = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+/;

/** Index of the newline that ends the line containing `index`, or the end of `text`. */
function lineEndAt(text, index) {
  const newline = text.indexOf('\n', index);
  return newline === -1 ? text.length : newline;
}

/** True when the line starting at `index` holds nothing but whitespace (CommonMark's blank line). */
function isBlankLineAt(text, index) {
  return text.slice(index, lineEndAt(text, index)).trim() === '';
}

/** Skip whitespace, stopping before a blank line — no CommonMark inline construct may span one. */
function skipInlineWhitespace(text, start) {
  let i = start;
  while (i < text.length && whitespacePattern.test(text[i])) {
    if (text[i] === '\n' && isBlankLineAt(text, i + 1)) return i;
    i++;
  }
  return i;
}

/**
 * Scan a CommonMark link destination starting at `text[start]`, which is either `<` (an
 * angle-bracket destination, which may contain spaces but no newline) or the first character of a
 * bare destination (balanced, arbitrarily nested parentheses; unescaped whitespace ends it).
 * Returns the raw (un-decoded) destination text and the index just past it, or null if the
 * destination is malformed (unterminated `<...>` or unbalanced parentheses).
 */
function readDestination(text, start) {
  if (text[start] === '<') {
    let i = start + 1;
    let raw = '';
    while (i < text.length && text[i] !== '>' && text[i] !== '\n') {
      if (text[i] === '\\' && i + 1 < text.length) { raw += text[i] + text[i + 1]; i += 2; continue; }
      raw += text[i];
      i++;
    }
    if (text[i] !== '>') return null;
    return { raw, end: i + 1 };
  }
  let depth = 0;
  let i = start;
  let raw = '';
  while (i < text.length) {
    const char = text[i];
    if (char === '\\' && i + 1 < text.length) { raw += char + text[i + 1]; i += 2; continue; }
    if (char === '(') { depth++; raw += char; i++; continue; }
    if (char === ')') {
      if (depth === 0) break;
      depth--; raw += char; i++; continue;
    }
    if (whitespacePattern.test(char)) break;
    raw += char;
    i++;
  }
  if (depth !== 0) return null;
  return { raw, end: i };
}

/**
 * Scan a CommonMark link label starting at `text[start]`, which must be `[`. Labels may nest
 * brackets to any depth (e.g. `[outer [inner]]`) — like `readDestination`, this is hand-scanned
 * because a bounded regex cannot represent arbitrary balance. A label may wrap lines but never
 * crosses a blank line and never exceeds 999 characters. Returns the label text (outer brackets
 * stripped, escapes intact) and the index just past the closing `]`, or null if unterminated.
 */
function readLabel(text, start) {
  if (text[start] !== '[') return null;
  let depth = 0;
  let i = start;
  let raw = '';
  while (i < text.length && raw.length <= LABEL_LIMIT) {
    const char = text[i];
    if (char === '\\' && i + 1 < text.length) { raw += char + text[i + 1]; i += 2; continue; }
    if (char === '\n' && isBlankLineAt(text, i + 1)) return null;
    if (char === '[') { depth++; raw += char; i++; continue; }
    if (char === ']') {
      depth--; raw += char; i++;
      if (depth === 0) return { raw: raw.slice(1, -1), end: i };
      continue;
    }
    raw += char;
    i++;
  }
  return null;
}

/** Case-fold and collapse whitespace in a reference label, matching CommonMark label matching. */
function normalizeLabel(label) {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Skip an optional CommonMark link title, then require the closing ')'. Returns the index just past it, or null. */
function readTitleAndClose(text, start) {
  let i = skipInlineWhitespace(text, start);
  if (text[i] === '"' || text[i] === "'" || text[i] === '(') {
    const close = text[i] === '(' ? ')' : text[i];
    let j = i + 1;
    while (j < text.length && text[j] !== close) {
      if (text[j] === '\\' && j + 1 < text.length) { j += 2; continue; }
      if (text[j] === '\n' && isBlankLineAt(text, j + 1)) return null;
      j++;
    }
    if (text[j] !== close) return null;
    i = skipInlineWhitespace(text, j + 1);
  }
  return text[i] === ')' ? i + 1 : null;
}

/** A link reference definition's optional title, which must close on the line it opened. */
function readDefinitionTitle(text, start) {
  let i = start;
  while (text[i] === ' ' || text[i] === '\t') i++;
  const open = text[i];
  if (open !== '"' && open !== "'" && open !== '(') return null;
  const close = open === '(' ? ')' : open;
  let j = i + 1;
  while (j < text.length && text[j] !== close && text[j] !== '\n') {
    if (text[j] === '\\' && j + 1 < text.length) { j += 2; continue; }
    j++;
  }
  return text[j] === close ? j + 1 : null;
}

/**
 * Parse one CommonMark link reference definition — `[label]: destination "title"`, up to three
 * spaces of indent, the destination optionally on the next line — beginning at the line start
 * `start`. Returns the normalized label, raw destination, and the index just past the definition,
 * or null when this line opens ordinary paragraph text instead.
 */
function readDefinition(text, start) {
  let i = start;
  let indent = 0;
  while (text[i] === ' ' && indent < 3) { i++; indent++; }
  const label = readLabel(text, i);
  if (label === null || label.raw.trim() === '' || text[label.end] !== ':') return null;
  const destination = readDestination(text, skipInlineWhitespace(text, label.end + 1));
  if (destination === null || destination.raw === '') return null;
  let end = destination.end;
  if (!isBlankLineAt(text, end)) {
    const afterTitle = readDefinitionTitle(text, end);
    if (afterTitle === null || !isBlankLineAt(text, afterTitle)) return null;
    end = afterTitle;
  }
  return { label: normalizeLabel(label.raw), destination: destination.raw, end };
}

/**
 * The length of the chain of block-quote and/or list-item markers opening `line`, so the caller can
 * find where the line's own content — as opposed to its containers' — begins. CommonMark associates
 * a link reference definition written inside a block quote or list item with the whole document, not
 * just the container (spec §4.7, example 218), so a definition one or more containers deep must be
 * found the same way a top-level one is.
 */
function containerPrefixLength(line) {
  let length = 0;
  while (true) {
    const rest = line.slice(length);
    const quote = blockQuoteMarkerPattern.exec(rest);
    if (quote !== null && quote[0].length > 0) { length += quote[0].length; continue; }
    const item = listMarkerPattern.exec(rest);
    if (item !== null && item[0].length > 0) { length += item[0].length; continue; }
    return length;
  }
}

/**
 * Every link reference definition in the document, plus the character spans they occupy. A
 * definition may only start a block — the document start, a line after a blank line (a container
 * marker with nothing else on the line counts, since the container's content is itself blank), or a
 * line after another definition — because CommonMark does not let one interrupt a paragraph. The
 * FIRST definition of a label wins, which is what a renderer resolves a reference against; a later
 * duplicate must not silently redirect the check at a different file. Only a definition that both
 * opens and closes on one physical line is recognized inside a container: a continuation line would
 * carry its own marker, which this does not attempt to strip mid-destination.
 */
function referenceDefinitions(text) {
  const definitions = new Map();
  const spans = [];
  let i = 0;
  let atBlockStart = true;
  while (i < text.length) {
    const end = lineEndAt(text, i);
    const prefixLength = containerPrefixLength(text.slice(i, end));
    const content = text.slice(i + prefixLength, end);
    if (content.trim() === '') { atBlockStart = true; i = end + 1; continue; }
    const definition = atBlockStart ? readDefinition(text, i + prefixLength) : null;
    if (definition === null) {
      atBlockStart = paragraphTerminatorPattern.test(content);
      i = end + 1;
      continue;
    }
    if (!definitions.has(definition.label)) definitions.set(definition.label, definition.destination);
    spans.push([i, definition.end]);
    i = lineEndAt(text, definition.end) + 1;
  }
  return { definitions, spans };
}

/**
 * Skip a CommonMark code span opening at `text[start]`: a run of N backticks closed by the next run
 * of exactly N. Returns the index just past the closing run, or null when the run never closes and
 * the backticks are therefore literal text. Code spans outrank links, so `` `[x](./gone.md)` `` is
 * documentation about a link, not a link.
 */
function readCodeSpan(text, start) {
  let length = 0;
  while (text[start + length] === '`') length++;
  const fence = '`'.repeat(length);
  let i = start + length;
  while (i < text.length) {
    const at = text.indexOf(fence, i);
    if (at === -1) return null;
    let after = at + length;
    if (text[after] === '`') {
      while (text[after] === '`') after++;
      i = after;
      continue;
    }
    return after;
  }
  return null;
}

function pushTarget(targets, raw) {
  const unescaped = raw.replace(escapePattern, '$1').trim();
  const target = unescaped.split('#')[0].trim();
  if (target === '' || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return;
  targets.push(decodeTarget(target));
}

/**
 * Append every local destination reachable from `text` to `targets`, covering all CommonMark link
 * and image forms: inline (`[text](dest)`), full (`[text][label]`), collapsed (`[text][]`), and
 * shortcut (`[label]`) references resolved against `definitions`. Returns true when a real link —
 * not an image — was matched, because CommonMark forbids a link inside another link's text: in
 * `[see [inner](./a.md)](./b.md)` only `./a.md` is a destination and `(./b.md)` renders literally.
 * Link text is rescanned for inline links/images since it is rendered either way; nested reference
 * forms are not re-resolved there, so a label is never mistaken for a shortcut use of itself.
 */
function scanLinks(text, definitions, targets, { references = true } = {}) {
  let found = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\') { i += 2; continue; }
    if (char === '`') {
      const end = readCodeSpan(text, i);
      if (end === null) { while (text[i] === '`') i++; continue; }
      i = end;
      continue;
    }
    if (char !== '[') { i++; continue; }
    const label = readLabel(text, i);
    if (label === null) { i++; continue; }
    const isImage = text[i - 1] === '!' && text[i - 2] !== '\\';
    const nestedLink = scanLinks(label.raw, definitions, targets, { references: false });
    let next = label.end;
    if (nestedLink) {
      i = next > i ? next : i + 1;
      continue;
    }
    let matched = false;
    if (text[label.end] === '(') {
      const destination = readDestination(text, skipInlineWhitespace(text, label.end + 1));
      if (destination !== null) {
        const close = readTitleAndClose(text, destination.end);
        if (close !== null) {
          pushTarget(targets, destination.raw);
          if (!isImage) found = true;
          next = close;
          matched = true;
        }
      }
    }
    // A failed inline attempt — an unterminated '(' — falls back to the reference forms, exactly as
    // a renderer does: '[setup](unclosed' still renders the shortcut link when [setup] is defined.
    if (!matched && references) {
      const reference = text[label.end] === '[' ? readLabel(text, label.end) : null;
      if (text[label.end] !== '[' || reference !== null) {
        const key = normalizeLabel(reference === null ? label.raw : (reference.raw === '' ? label.raw : reference.raw));
        if (definitions.has(key)) {
          pushTarget(targets, definitions.get(key));
          if (!isImage) found = true;
        }
        if (reference !== null) next = reference.end;
      }
    }
    i = next > i ? next : i + 1;
  }
  return found;
}

/**
 * Local link destinations, normalized: backslash escapes resolved, percent-escapes decoded, the
 * fragment dropped, surrounding whitespace trimmed. Absolute URLs and protocol-relative links are
 * skipped — only paths this checkout can resolve are returned. The reference definitions
 * themselves are excluded from the usage scan: `[setup]: ./dest.md` defines a label, it does not
 * use one, and only the definitions a document actually references are rendered as links.
 */
function linkTargets(lines) {
  const text = lines.join('\n');
  const { definitions, spans } = referenceDefinitions(text);
  const targets = [];
  let cursor = 0;
  for (const [start, end] of spans) {
    scanLinks(text.slice(cursor, start), definitions, targets);
    cursor = end;
  }
  scanLinks(text.slice(cursor), definitions, targets);
  return targets;
}

function readIfFile(path) {
  return existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : null;
}

/**
 * The CommonMark shape of a code fence line: at most three leading spaces — four, or a leading
 * tab, is an indented code block instead — then a run of at least three backticks or tildes, then
 * the rest of the line: an info string on an opener, whitespace only on a closer.
 */
const fenceLinePattern = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/** The opening run of a fence line, or null when the line does not open a fenced code block. */
function fenceOpener(line) {
  const match = fenceLinePattern.exec(line);
  if (match === null) return null;
  const [, run, info] = match;
  // A backtick fence's info string may not contain a backtick, so a line like ```foo``` renders as
  // inline code rather than opening a block — the Markdown after it stays live.
  if (run[0] === '`' && info.includes('`')) return null;
  return run;
}

/** True when `line` closes a fence opened by `opener`: same character, at least as long, no info. */
function closesFence(line, opener) {
  const match = fenceLinePattern.exec(line);
  if (match === null) return false;
  const [, run, rest] = match;
  return run[0] === opener[0] && run.length >= opener.length && rest.trim() === '';
}

/**
 * Markdown lines with fenced code blocks blanked out — command examples in fences are
 * documentation, not policy. Fenced lines are blanked rather than dropped so removing them can
 * never splice two paragraphs into one construct. Only fences a renderer would honour open a
 * block: a pseudo-fence must not blank the rest of the document, because every link below it is
 * still rendered as a link.
 */
function proseLines(text) {
  const lines = [];
  let opener = null;
  for (const line of text.split('\n')) {
    if (opener === null) {
      const run = fenceOpener(line);
      if (run === null) { lines.push(line); continue; }
      opener = run;
      lines.push('');
      continue;
    }
    if (closesFence(line, opener)) opener = null;
    lines.push('');
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
