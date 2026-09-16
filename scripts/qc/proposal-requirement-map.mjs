/** Inventory historical authority without converting topic matches into approval. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../spec-frontmatter.mjs';
import { safeSource, inspectRepository } from './repo-truth.mjs';

const digest = (s) => createHash('sha256').update(s).digest('hex');
const terms = {
  SEC: /auth|tenant|permission|sql|security|containment|delegation/i,
  JOB: /job|lease|outbox|durable|effect|background/i,
  STK: /stock|invoice|insumo|consumption|ledger/i,
  AGT: /agent|harness|shells|drone|policy|budget|containment/i,
  DEP: /dependenc|package|library|libraries|toolchain|unpinned|sdk/i,
  UI: /ui|mobile|calendar|accessib|dialog|design|canvas/i,
  SDK: /sdk|protocol|websocket|transport|shells|gateway|package/i,
  DATA: /parser|parsing|ingest|schema|migration|retention|brain|corpus/i,
  OBS: /telemetry|observability|sentry|posthog|monitor|incident/i,
  OPS: /container|docker|deploy|runtime|restore|containment/i,
  DOC: /doc|instruction|spec|proposal|governance|handoff/i,
  CAP: /capacity|performance|pool|load|scale|recovery|retention/i,
  QC: /quality|release|review|test|audit|verification/i,
};

export function requirementsFrom(text) {
  const declarations = text.split(/\r?\n/).filter((line) => /^- \[[ x]\] \*\*/.test(line));
  const rows = declarations.map((line) => {
    const match = line.match(/^- \[[ x]\] \*\*([A-Z]+-\d+)\*\*:\s*(\S.*)$/);
    if (!match) throw new Error('Malformed requirement definition');
    return { id: match[1], description: match[2] };
  });
  if (!rows.length || new Set(rows.map((r) => r.id)).size !== rows.length) {
    throw new Error('Missing or duplicate requirement definitions');
  }
  return rows;
}

function markdownPaths(root, directory) {
  const absolute = path.join(root, directory);
  const real = fs.realpathSync(absolute);
  const base = fs.realpathSync(root);
  if (fs.lstatSync(absolute).isSymbolicLink() || !real.startsWith(base + path.sep) ||
      directory.split(/[\\/]/).some((segment) => segment.startsWith('.env'))) {
    throw new Error('Unsafe inventory directory');
  }
  return fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownPaths(root, relative);
      if (entry.name.endsWith('.md')) return [relative];
      if (entry.isSymbolicLink()) throw new Error('Unreviewed inventory symlink');
      return [];
    });
}

function uniqueFrontmatter(source) {
  if (!source.startsWith('---\n')) return;
  const end = source.indexOf('\n---\n', 4);
  if (end < 0) return;
  const keys = new Set();
  for (const line of source.slice(4, end).split('\n')) {
    const key = line.match(/^([a-zA-Z][\w-]*):/)?.[1];
    if (key && keys.has(key)) throw new Error('Duplicate document frontmatter key');
    if (key) keys.add(key);
  }
}

export function inventorySnapshot(root, snapshot) {
  if (path.isAbsolute(snapshot) || snapshot.split(/[\\/]/).includes('..')) {
    throw new Error('Unsafe snapshot path');
  }
  const records = [];
  const issues = [];
  for (const kind of ['specs', 'proposals']) {
    const directory = path.join(snapshot, kind);
    const index = JSON.parse(safeSource(root, path.join(directory, 'index.json')))[kind];
    if (!Array.isArray(index)) throw new Error(`Missing ${kind} index`);
    const ids = new Set();
    for (const row of index) {
      if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) ||
          typeof row.title !== 'string' || typeof row.status !== 'string') {
        throw new Error(`Incomplete or duplicate ${kind} index row`);
      }
      ids.add(row.id);
    }
    const indexedBodies = new Set();
    for (const relative of markdownPaths(root, directory)) {
      const name = path.basename(relative);
      const nested = path.dirname(relative) !== directory;
      const source = safeSource(root, relative);
      uniqueFrontmatter(source);
      const parsed = parseFrontmatter(source);
      const support = name === 'TEMPLATE.md' || name.endsWith('.review.md');
      const fm = parsed?.fm ?? {};
      const id = typeof fm.id === 'string' ? fm.id : name.slice(0, -3);
      const status = typeof fm.status === 'string' ? fm.status : 'unspecified';
      if (!support && !nested) {
        if (!fm.id || !fm.title || !fm.status || !fm.created) {
          issues.push(`${relative}: incomplete frontmatter`);
        }
        if (indexedBodies.has(id)) issues.push(`${relative}: duplicate document ID ${id}`);
        indexedBodies.add(id);
        const row = index.find((r) => r.id === id);
        if (!row) issues.push(`${relative}: absent from index`);
        else if (row.title !== fm.title || row.status !== fm.status) {
          issues.push(`${relative}: index/body title or status mismatch`);
        }
      }
      const retirementContradiction = status === 'retired' &&
        /\*\*Status:\*\*\s*Approved/i.test(parsed?.body ?? '');
      records.push({
        snapshot, kind, path: relative, id, title: String(fm.title ?? name),
        status, sha256: digest(source), support, nested,
        disposition: support ? 'supporting-artifact-review-needed' :
          retirementContradiction ? 'retired-with-stale-approval-body' :
          status === 'retired' ? 'retired-no-new-authority' :
          nested ? 'nested-document-review-needed' :
          ['shipped', 'done', 'closed'].includes(status) ? 'declared-complete-not-reverified' :
          status === 'superseded' ? 'supersession-target-review-needed' : 'review-needed',
        candidateFamilies: Object.entries(terms)
          .filter(([, expression]) => expression.test(`${fm.title ?? ''}\n${id}\n${parsed?.body ?? source}`))
          .map(([family]) => family),
      });
    }
    for (const id of ids) if (!indexedBodies.has(id)) issues.push(`${directory}: indexed body missing for ${id}`);
  }
  return { records, issues };
}

export function buildDispositionMap(root, snapshots = ['.', 'minion-meta']) {
  // TODO(handoff): DOC-02 requires per-document body/source acceptance and exact status patches;
  // topic candidates never close it. See proposals/2026-09-08-platform-qc-remediation.md.
  const requirementSource = safeSource(root, '.planning/REQUIREMENTS.md');
  const requirements = requirementsFrom(requirementSource);
  const records = [];
  const issues = [];
  const identities = [];
  for (const snapshot of snapshots) {
    if (!fs.existsSync(path.join(root, snapshot, 'specs/index.json'))) {
      issues.push(`${snapshot}: declared snapshot unavailable`);
      continue;
    }
    identities.push(inspectRepository(root, snapshot));
    const result = inventorySnapshot(root, snapshot);
    records.push(...result.records);
    issues.push(...result.issues);
  }
  const conflicts = [];
  const groups = Map.groupBy(records.filter((r) => !r.support), (r) => `${r.kind}:${r.id}`);
  for (const [id, group] of groups) {
    if (group.length > 1 && new Set(group.map((r) => r.sha256)).size > 1) {
      conflicts.push({ id, paths: group.map((r) => r.path), statuses: group.map((r) => r.status) });
    }
  }
  return {
    requirementsSha256: digest(requirementSource),
    requirements: requirements.map((r) => ({ ...r,
      candidates: records.filter((record) => !record.support && record.candidateFamilies.includes(r.id.split('-')[0]))
        .map((record) => record.path),
      disposition: 'candidate-links-require-body-and-source-review',
    })),
    identities: identities.map((r) => ({ path: r.path, head: r.head, localBranch: r.localBranch })),
    records, conflicts, issues,
  };
}

const cell = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
export function renderDispositionMap(map) {
  const rows = map.records.map((r) => `|${cell(r.path)}|${cell(r.status)}|${r.disposition}|${r.sha256}|`).join('\n');
  const links = map.requirements.map((r) => `|${r.id}: ${cell(r.description)}|${r.candidates.length}|${r.candidates.slice(0, 6).map((p) => '`'+p+'`').join('; ') || 'No candidate; research required'}|`).join('\n');
  const conflicts = map.conflicts.map((c) => `- ${c.id}: ${c.paths.map((p, i) => '`'+p+'` ('+c.statuses[i]+')').join(' versus ')}`).join('\n');
  return `# Spec/proposal disposition inventory\n\nGenerated from exact local source snapshots. Topic links are review candidates, never approval or implementation evidence. Every Markdown item, including templates/reviews, is accounted for. No status or index is changed by this command.\n\n${map.records.length} documents; ${map.requirements.length} requirements; ${map.conflicts.length} divergent cross-snapshot IDs; ${map.issues.length} inventory issues.\n\n## Snapshot identity\n\n${map.identities.map((i) => '- '+i.path+': '+i.localBranch+' @ '+i.head).join('\n')}\n\nThe workspace and nested reference checkout have distinct histories. Newer timestamps alone do not authorize overwriting either one. Release integration must reconcile exact reviewed patches with the selected upstream commit.\n\n## Requirement candidates\n\nREQUIREMENTS.md SHA-256: ${map.requirementsSha256}\n\nCandidates match the full document body by topic family. First six are displayed; the exported buildDispositionMap result retains every path. Manual body/source acceptance remains required; these counts are not coverage scores.\n\n|Requirement|Candidate paths|First candidate pointers|\n|---|---|---|\n${links}\n\n## Conflicting snapshot bodies\n\n${conflicts || 'None.'}\n\n## Inventory issues\n\n${map.issues.map((s) => '- '+s).join('\n') || 'No index/body presence, title or status mismatch within inspected snapshots.'}\n\n## Every document\n\n|Source path|Declared status|Disposition / next review|SHA-256|\n|---|---|---|---|\n${rows}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Usage: proposal-requirement-map.mjs [--check]');
  const root = process.cwd();
  const result = buildDispositionMap(root);
  const output = renderDispositionMap(result);
  const destination = '.planning/phases/18-docs-governance/18-DISPOSITIONS.md';
  if (args.includes('--check')) {
    if (safeSource(root, destination) !== output || result.issues.length) {
      throw new Error('Disposition inventory is stale or has unresolved inventory issues');
    }
  } else fs.writeFileSync(path.join(root, destination), output);
  console.log(JSON.stringify({ documents: result.records.length, requirements: result.requirements.length,
    divergentIds: result.conflicts.length, inventoryIssues: result.issues.length,
    semanticClosure: false }));
}
