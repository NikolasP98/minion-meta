/** Read-only current-source pairing inventory. It never certifies implementation closure. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { requirementsFrom } from './proposal-requirement-map.mjs';

const sharedRequire = createRequire(new URL('../../packages/shared/package.json', import.meta.url));
const uiRequire = createRequire(new URL('../../packages/ui/package.json', import.meta.url));
// Existing workspace-declared tools, not dynamically installed or source-checkout code.
const ts = sharedRequire('typescript');
const svelte = uiRequire('svelte/compiler');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const parserTools = Object.freeze(
  Object.fromEntries(
    [
      ['typescript', sharedRequire, 'typescript', ts.version],
      ['svelte', uiRequire, 'svelte/compiler', svelte.VERSION],
    ].map(([name, resolver, specifier, version]) => {
      const entry = resolver.resolve(specifier);
      return [name, { version, path: entry, sha256: digest(fs.readFileSync(entry)) }];
    }),
  ),
);
const marker = 'TODO(handoff)';
const jsExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
const textExtensions = new Set([
  ...jsExtensions,
  '.svelte',
  '.py',
  '.sh',
  '.sql',
  '.html',
  '.css',
  '.vue',
  '.astro',
  '.md',
  '.yaml',
  '.yml',
]);
const denied = new Set([
  'node_modules',
  '.git',
  '.cache',
  '.config',
  '.local',
  '.minion',
  '.planning',
  '.worktrees',
  '.svelte-kit',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'coverage',
  'vendor',
  'data',
  'uploads',
  'storage',
  'logs',
  'volumes',
  'paraglide',
]);
export const SUPPORTED_SOURCE_ROOTS = Object.freeze([
  'scripts',
  ...[
    'cli',
    'env',
    'shared',
    'db',
    'auth',
    'cache',
    'shells-bridge',
    'workforce-client',
    'ui',
    'crm-sdk',
  ].map((p) => `packages/${p}/src`),
  'minion/src',
  'minion/extensions',
  'minion_hub/src',
  'minion_hub/tests',
  'minion_site/src',
  'minion_site/tests',
]);
const excludedProjects = Object.freeze([
  'minion_factory',
  'minion_base',
  'drone',
  'langgraph-server',
  'paperclip-minion',
  'pixel-agents',
  'minion_plugins',
  'Minion Docs',
  'ai-studio',
  'minion-meta',
]);

function jsComments(source, filename) {
  const kind = filename.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filename.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, kind);
  if (ast.parseDiagnostics.length)
    return { comments: [], issues: [{ code: 'source-parse-error' }] };
  const ranges = new Map();
  const nodes = [ast];
  while (nodes.length) {
    const node = nodes.pop();
    for (const range of [
      ...(ts.getLeadingCommentRanges(source, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(source, node.end) ?? []),
    ]) {
      ranges.set(`${range.pos}:${range.end}`, {
        start: range.pos,
        end: range.end,
        lineComment: range.kind === ts.SyntaxKind.SingleLineCommentTrivia,
      });
    }
    nodes.push(...node.getChildren(ast));
  }
  return { comments: [...ranges.values()], issues: [] };
}

/** Native syntax parsers distinguish comments from strings, templates, regex and markup text. */
export function sourceComments(source, filename) {
  if (!source.includes(marker)) return { comments: [], issues: [] };
  let parsed;
  if (jsExtensions.has(path.extname(filename))) parsed = jsComments(source, filename);
  else if (filename.endsWith('.svelte')) {
    try {
      const ast = svelte.parse(source, { modern: true });
      const comments = ast.comments.map((c) => ({
        start: c.start,
        end: c.end,
        lineComment: c.type === 'Line',
      }));
      const pending = [ast.fragment];
      while (pending.length) {
        const value = pending.pop();
        if (!value || typeof value !== 'object') continue;
        if (value.type === 'Comment')
          comments.push({ start: value.start, end: value.end, lineComment: false });
        for (const child of Object.values(value)) {
          if (Array.isArray(child)) pending.push(...child);
          else if (child && typeof child === 'object') pending.push(child);
        }
      }
      parsed = {
        comments,
        issues:
          ast.css && source.slice(ast.css.start, ast.css.end).includes(marker)
            ? [{ code: 'unsupported-style-marker' }]
            : [],
      };
    } catch {
      parsed = { comments: [], issues: [{ code: 'source-parse-error' }] };
    }
  } else return { comments: [], issues: [{ code: 'unsupported-marker-language' }] };
  const ranges = [...new Map(parsed.comments.map((c) => [`${c.start}:${c.end}`, c])).values()].sort(
    (a, b) => a.start - b.start,
  );
  const comments = [];
  for (let i = 0; i < ranges.length; i++) {
    const current = ranges[i];
    if (!source.slice(current.start, current.end).includes(marker)) continue;
    let end = current.end;
    if (current.lineComment) {
      while (
        ranges[i + 1]?.lineComment &&
        /^\r?\n[\t ]*$/.test(source.slice(end, ranges[i + 1].start)) &&
        !source.slice(ranges[i + 1].start, ranges[i + 1].end).includes(marker)
      ) {
        end = ranges[++i].end;
      }
    }
    const text = source.slice(current.start, end);
    if (text.split(marker).length !== 2) {
      parsed.issues.push({ code: 'ambiguous-multiple-markers', offset: current.start });
      continue;
    }
    comments.push({ start: current.start, end, text });
  }
  return { comments, issues: parsed.issues };
}

const isRelative = (p) =>
  typeof p === 'string' &&
  p.length > 0 &&
  !path.isAbsolute(p) &&
  !p.includes('\\') &&
  !p.includes('\0') &&
  !p
    .split('/')
    .some(
      (s) =>
        !s ||
        s === '.' ||
        s === '..' ||
        s.startsWith('.env') ||
        (denied.has(s) && s !== '.planning'),
    );
const inRoots = (p, roots) => roots.some((r) => p.startsWith(r + '/'));
class ScanError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function confined(root, relative = '') {
  if (relative && !isRelative(relative)) throw new ScanError('unsafe-path');
  const absolute = path.join(root, relative);
  let current = path.parse(absolute).root;
  for (const segment of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new ScanError('unsafe-symlink');
  }
  return absolute;
}

function strictJson(source) {
  const value = JSON.parse(source);
  const ast = ts.parseJsonText('ledger.json', source);
  const nodes = [ast];
  while (nodes.length) {
    const node = nodes.pop();
    if (ts.isObjectLiteralExpression(node)) {
      const keys = node.properties.map((p) => p.name?.text);
      if (new Set(keys).size !== keys.length) throw new Error('duplicate JSON key');
    }
    ts.forEachChild(node, (child) => {
      nodes.push(child);
    });
  }
  return value;
}

// Only explicit fenced declarations count. An example nested in a longer fence is prose.
function ledgerBlocks(text) {
  const blocks = [];
  let fence = null,
    invalid = false;
  for (const line of text.split(/\r?\n/)) {
    if (!fence) {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})([^`]*)$/);
      if (!open) continue;
      const info = open[2].trim();
      fence = {
        character: open[1][0],
        length: open[1].length,
        ledger: info === 'handoff-ledger',
        lines: [],
      };
      if (info.startsWith('handoff-ledger') && !fence.ledger) invalid = true;
    } else {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[\t ]*$/);
      if (close && close[1][0] === fence.character && close[1].length >= fence.length) {
        if (fence.ledger) blocks.push(fence.lines.join('\n'));
        fence = null;
      } else fence.lines.push(line);
    }
  }
  return { blocks, invalid: invalid || Boolean(fence?.ledger) };
}

/** Root prepares reverse records from this inventory; the tool never writes source or proposals. */
export function inventoryHandoffs(root, options = {}) {
  // TODO(handoff): DOC-03 needs root-reviewed reverse records and independent source/test
  // acceptance; this inventory cannot close implementation or historical dispositions.
  // See proposals/2026-09-08-platform-qc-remediation.md.
  if (
    Object.keys(options).some(
      (k) => !['roots', 'maxFileBytes', 'maxTotalBytes', 'maxFiles', 'maxEntries'].includes(k),
    )
  )
    throw new Error('Unknown inventory option');
  const roots = options.roots ?? SUPPORTED_SOURCE_ROOTS;
  if (
    !Array.isArray(roots) ||
    !roots.length ||
    new Set(roots).size !== roots.length ||
    roots.some((r) => !SUPPORTED_SOURCE_ROOTS.includes(r))
  )
    throw new Error('Select explicitly supported source roots');
  const maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024;
  const maxTotalBytes = options.maxTotalBytes ?? 256 * 1024 * 1024;
  const maxFiles = options.maxFiles ?? 50000;
  const maxEntries = options.maxEntries ?? 100000;
  if (
    [maxFileBytes, maxTotalBytes, maxFiles, maxEntries].some(
      (n) => !Number.isSafeInteger(n) || n < 1,
    )
  )
    throw new Error('Invalid scan limit');
  root = path.resolve(root);
  const issues = [],
    exclusions = [],
    files = [],
    markers = [],
    proposals = [],
    records = [];
  let completeScan = true,
    readBytes = 0,
    readFiles = 0,
    visitedEntries = 0,
    exhausted = false;
  function limit() {
    exhausted = true;
    throw new ScanError('scan-limit');
  }
  function issue(code, file, extra = {}, incomplete = false) {
    issues.push({ code, path: file, ...extra });
    if (incomplete) completeScan = false;
  }
  function read(relative) {
    const absolute = confined(root, relative);
    const before = fs.lstatSync(absolute);
    if (!before.isFile()) throw new ScanError('nonregular-source');
    if (exhausted || ++readFiles > maxFiles) limit();
    if (before.size > maxFileBytes) throw new ScanError('file-size-limit');
    if (readBytes + before.size > maxTotalBytes) limit();
    const fd = fs.openSync(
      absolute,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
    );
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev)
        throw new ScanError('changed-during-read');
      const chunks = [];
      let count = 0;
      while (true) {
        const chunk = Buffer.alloc(Math.min(65536, maxFileBytes + 1 - count));
        const n = fs.readSync(fd, chunk);
        if (!n) break;
        count += n;
        if (count > maxFileBytes) throw new ScanError('file-size-limit');
        if (readBytes + count > maxTotalBytes) limit();
        chunks.push(chunk.subarray(0, n));
      }
      const after = fs.fstatSync(fd);
      if (after.size !== before.size || after.mtimeMs !== before.mtimeMs)
        throw new ScanError('changed-during-read');
      confined(root, relative);
      readBytes += count;
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
        Buffer.concat(chunks),
      );
    } finally {
      fs.closeSync(fd);
    }
  }
  function attempt(relative, callback) {
    try {
      return callback(read(relative));
    } catch (error) {
      issue(error instanceof ScanError ? error.code : 'unreadable-source', relative, {}, true);
      return null;
    }
  }
  function walk(directory, extensions, visit) {
    if (exhausted) return;
    try {
      const absolute = confined(root, directory);
      if (!fs.lstatSync(absolute).isDirectory()) throw new ScanError('nonregular-source');
      for (const entry of fs
        .readdirSync(absolute, { withFileTypes: true })
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
        if (exhausted) break;
        if (++visitedEntries > maxEntries) limit();
        const relative = directory + '/' + entry.name;
        if (entry.name.startsWith('.env') || denied.has(entry.name)) {
          exclusions.push({
            path: relative,
            reason: 'declared-sensitive-generated-or-managed-exclusion',
          });
          continue;
        }
        if (entry.isSymbolicLink()) {
          issue('unsafe-symlink', relative, {}, true);
          continue;
        }
        if (entry.isDirectory()) walk(relative, extensions, visit);
        else if (extensions.has(path.extname(entry.name)))
          attempt(relative, (text) => visit(relative, text));
      }
    } catch (error) {
      issue(error instanceof ScanError ? error.code : 'unreadable-directory', directory, {}, true);
    }
  }
  let requirements = [];
  let requirementsSha256 = null;
  attempt('.planning/REQUIREMENTS.md', (text) => {
    requirementsSha256 = digest(text);
    requirements = requirementsFrom(text);
  });
  const requirementIds = new Set(requirements.map((r) => r.id));
  const families = [...new Set(requirements.map((r) => r.id.split('-')[0]))];
  const requirementPattern = families.length
    ? new RegExp(`\\b(?:${families.join('|')})-\\d+\\b`, 'g')
    : null;
  for (const directory of [...roots].sort())
    walk(directory, textExtensions, (relative, text) => {
      const sha256 = digest(text);
      files.push({ path: relative, sha256 });
      const parsed = sourceComments(text, relative);
      for (const problem of parsed.issues)
        issue(problem.code, relative, { offset: problem.offset ?? null }, true);
      for (const comment of parsed.comments) {
        const references = [
          ...new Set(
            [
              ...comment.text.matchAll(
                /(?<![\w/.:])proposals\/[A-Za-z0-9][A-Za-z0-9._/-]*\.md(?:#[A-Za-z0-9_-]+)?/g,
              ),
            ].map((m) => m[0]),
          ),
        ];
        const ids = requirementPattern
          ? [...new Set(comment.text.match(requirementPattern) ?? [])]
          : [];
        const entry = {
          path: relative,
          line: text.slice(0, comment.start).split('\n').length,
          endLine: text.slice(0, comment.end).split('\n').length,
          fileSha256: sha256,
          markerSha256: digest(comment.text),
          comment: comment.text,
          proposals: references.map((r) => r.split('#')[0]),
          requirements: ids,
          pairing: 'unregistered',
        };
        markers.push(entry);
        if (!references.length)
          issue('missing-forward-proposal', relative, { markerSha256: entry.markerSha256 });
        for (const id of ids)
          if (!requirementIds.has(id)) issue('unknown-requirement', relative, { requirement: id });
        for (const ref of references)
          if (ref.includes('#'))
            issue('proposal-fragment-needs-review', relative, { reference: ref });
      }
    });

  walk('proposals', new Set(['.md']), (relative, text) => {
    const { blocks, invalid } = ledgerBlocks(text);
    if (invalid) issue('invalid-ledger-block', relative);
    proposals.push({
      path: relative,
      sha256: digest(text),
      classification: blocks.length ? 'structured-records' : 'unclassified-manual-review',
    });
    for (const block of blocks) {
      try {
        const parsed = strictJson(block);
        for (const value of Array.isArray(parsed) ? parsed : [parsed])
          records.push({ proposal: relative, declaration: value, classification: 'invalid' });
      } catch {
        issue('invalid-ledger-block', relative);
      }
    }
  });
  const proposalPaths = new Set(proposals.map((p) => p.path));
  for (const entry of markers)
    for (const ref of entry.proposals)
      if (!isRelative(ref) || !proposalPaths.has(ref))
        issue('missing-proposal', entry.path, { reference: ref });

  const ids = new Set(),
    registered = new Set();
  const allowed = new Set(['id', 'kind', 'state', 'sources', 'owner', 'nextPlan', 'completion']);
  for (const entry of records) {
    const row = entry.declaration;
    const shape =
      row &&
      typeof row === 'object' &&
      !Array.isArray(row) &&
      Object.keys(row).every((k) => allowed.has(k)) &&
      typeof row.id === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(row.id);
    if (!shape) {
      issue('invalid-record', entry.proposal);
      continue;
    }
    if (ids.has(row.id)) issue('duplicate-record-id', entry.proposal, { id: row.id });
    ids.add(row.id);
    if (row.kind === 'research' && Object.keys(row).every((k) => ['id', 'kind'].includes(k))) {
      entry.classification = 'explicit-research';
      continue;
    }
    if (
      row.kind !== 'implementation' ||
      !['unresolved', 'completion-proposed'].includes(row.state) ||
      typeof row.owner !== 'string' ||
      !row.owner.trim() ||
      row.owner.length > 256 ||
      !isRelative(row.nextPlan) ||
      !/^\.planning\/phases\/.+\/[^/]+-PLAN\.md$/.test(row.nextPlan) ||
      !Array.isArray(row.sources) ||
      !row.sources.length ||
      row.sources.length > 128 ||
      row.sources.some(
        (s) =>
          !s ||
          typeof s !== 'object' ||
          Object.keys(s).some((k) => !['path', 'markerSha256'].includes(k)) ||
          !isRelative(s.path) ||
          !inRoots(s.path, SUPPORTED_SOURCE_ROOTS) ||
          !/^[a-f0-9]{64}$/.test(s.markerSha256),
      )
    ) {
      issue('invalid-record', entry.proposal, { id: row.id });
      continue;
    }
    entry.classification = row.sources.some((s) => inRoots(s.path, roots))
      ? 'registered-implementation'
      : 'outside-selected-source-scope';
    if (entry.classification === 'outside-selected-source-scope') continue;
    if (attempt(row.nextPlan, () => true) !== true)
      issue('missing-next-plan', entry.proposal, { id: row.id });
    if (row.state === 'completion-proposed') {
      const e = row.completion;
      if (
        !e ||
        typeof e !== 'object' ||
        !Array.isArray(e.sources) ||
        !e.sources.length ||
        !Array.isArray(e.tests) ||
        !e.tests.length ||
        e.sources.some((s) => !files.some((f) => f.path === s?.path && f.sha256 === s?.sha256)) ||
        e.tests.some(
          (t) =>
            !t ||
            !isRelative(t.path) ||
            !/^\.planning\/phases\/.+\.(md|json)$/.test(t.path) ||
            !/^[a-f0-9]{64}$/.test(t.sha256) ||
            typeof t.command !== 'string' ||
            !t.command.trim() ||
            t.result !== 'passed' ||
            attempt(t.path, (text) => digest(text)) !== t.sha256,
        )
      )
        issue('completion-evidence-missing', entry.proposal, { id: row.id });
      issue('completion-independent-review-required', entry.proposal, { id: row.id });
    } else if (row.completion !== undefined)
      issue('invalid-record', entry.proposal, { id: row.id });
    for (const source of row.sources.filter((s) => inRoots(s.path, roots))) {
      const key = source.path + ':' + source.markerSha256;
      if (registered.has(key))
        issue('duplicate-source-registration', entry.proposal, { id: row.id });
      registered.add(key);
      const matches = markers.filter(
        (m) => m.path === source.path && m.markerSha256 === source.markerSha256,
      );
      if (matches.length !== 1) {
        issue(
          matches.length ? 'ambiguous-registered-marker' : 'registered-marker-missing',
          entry.proposal,
          { id: row.id, source: source.path },
        );
        continue;
      }
      const found = matches[0];
      if (!found.proposals.includes(entry.proposal))
        issue('reverse-forward-mismatch', entry.proposal, { id: row.id, source: source.path });
      else if (row.state === 'unresolved') found.pairing = 'paired-unresolved';
      else issue('completion-marker-present', entry.proposal, { id: row.id });
    }
  }
  for (const entry of markers)
    if (entry.pairing !== 'paired-unresolved')
      issue('unregistered-marker', entry.path, { markerSha256: entry.markerSha256 });
  return {
    schemaVersion: 1,
    sourceRoots: [...roots].sort(),
    excludedSourceRoots: SUPPORTED_SOURCE_ROOTS.filter((r) => !roots.includes(r)),
    excludedProjects: [...excludedProjects],
    parserTools,
    requirementsSha256,
    limits: { maxFileBytes, maxTotalBytes, maxFiles, maxEntries },
    readFiles,
    readBytes,
    visitedEntries,
    inspectedTextExtensions: [...textExtensions],
    supportedCommentLanguages: [
      'TypeScript/JavaScript via TypeScript AST',
      'Svelte script/expression/HTML comments via Svelte AST',
    ],
    files,
    markers,
    proposals,
    records,
    exclusions,
    issues,
    completeScan,
    checkPassed: completeScan && issues.length === 0,
    semanticClosure: false,
    historicalDispositionComplete: false,
    limitations: [
      'Only the enumerated current source roots and proposal schema are checked.',
      'Declared exclusions and unsupported languages are not coverage.',
      'Filesystem checks reject observed symlinks; hostile concurrent ancestor replacement is not an isolation guarantee.',
      'Matched evidence hashes do not verify test behavior or confer closure.',
    ],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((a) => !['--check', '--help'].includes(a)))
    throw new Error('Usage: handoff-ledger.mjs [--check|--help]');
  if (args.includes('--help'))
    console.log(
      'Read-only JSON inventory of explicitly supported current sources and structured proposal handoffs. --check exits 1 for incomplete scans/pairs. Never writes or certifies closure.',
    );
  else {
    const result = inventoryHandoffs(fileURLToPath(new URL('../../', import.meta.url)));
    console.log(JSON.stringify(result, null, 2));
    if (args.includes('--check') && !result.checkPassed) process.exitCode = 1;
  }
}
