/** Read-only two-sided handoff ledger. Scans supported source for `TODO(handoff):` markers, cross-checks
 * each against the proposals/ ledger (AGENTS.md "Open-items ledger" rule), and never edits source. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const digest = (s) => createHash('sha256').update(s).digest('hex');

// Source extensions treated as real handoff sites. Markdown is excluded on purpose: a spec/proposal
// describing or citing the TODO(handoff) convention is prose about the rule, not an implementation site
// (the plan's "exempt conceptual research from fabricated source TODOs").
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx', '.py', '.svelte', '.sql']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.svelte-kit', '.next', '.vercel', '.turbo', 'coverage', '.worktrees']);

export function safeSource(root, relative) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some((p) => p === '..' || p.startsWith('.env'))) {
    throw new Error(`Unsafe source path: ${relative}`);
  }
  const absolute = path.resolve(root, relative);
  const base = fs.realpathSync(root);
  const real = fs.realpathSync(absolute);
  if (real !== base && !real.startsWith(base + path.sep)) throw new Error(`Source escapes root: ${relative}`);
  return fs.readFileSync(real, 'utf8');
}

// `topDir` is the source root this walk started from. A nested directory with its own `.git` (an
// independent subproject checkout) is a different source root scanned under its own label — descending
// into it here would double-count every marker it contains.
function* walk(root, dir, topDir = dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.git')) continue;
      if (relative !== topDir && fs.existsSync(path.join(root, relative, '.git'))) continue;
      yield* walk(root, relative, topDir);
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      yield relative;
    }
  }
}

const PROPOSAL_REF = /proposals\/[\w.-]+\.md/g;
const RESOLVED_MARKER = /\bRESOLVED\b/i;
const TEST_REF = /\b[\w./-]+\.test\.(?:ts|mjs|js)\b/;
// A real handoff marker is a comment: `//`, `/* … */`, `*` (jsdoc continuation), `#`, `--` (SQL) or
// `<!--` (HTML/Svelte). A line containing the literal text `TODO(handoff)` that does NOT open with one
// of these is source code or test-fixture data holding the string as a value — e.g. a scanner building
// `` `TODO(handoff): ${x}` `` as a label, or a test asserting against that literal — never a genuine
// open-item site. Excluding those is scanner precision, not "fixing" anyone's code.
const COMMENT_OPENER = /^\s*(\/\/|\/\*|\*|#|--|<!--)/;

// Continuation lines of a `//`, `/* … */`, `*`, `#`, `--` or `<!--` comment immediately after the marker line.
function commentBlock(lines, startIndex) {
  const out = [lines[startIndex]];
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (COMMENT_OPENER.test(lines[i])) out.push(lines[i]); else break;
  }
  return out.join('\n');
}

export function findHandoffMarkers(root, sourceRoots) {
  const markers = [];
  for (const { label, dir } of sourceRoots) {
    if (!fs.existsSync(path.join(root, dir))) continue;
    for (const file of walk(root, dir)) {
      const text = safeSource(root, file);
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (!line.includes('TODO(handoff):') || !COMMENT_OPENER.test(line)) return;
        const block = commentBlock(lines, i);
        markers.push({
          sourceRoot: label, file, line: i + 1,
          text: block,
          proposalRefs: [...new Set([...block.matchAll(PROPOSAL_REF)].map((m) => m[0]))],
          resolved: RESOLVED_MARKER.test(block),
          testRef: block.match(TEST_REF)?.[0] ?? null,
          sha256: digest(block),
        });
      });
    }
  }
  return markers;
}

export function crossCheckMarkers(root, markers) {
  const issues = [];
  for (const m of markers) {
    const key = `${m.sourceRoot}:${m.file}:${m.line}`;
    if (m.proposalRefs.length === 0) {
      issues.push({ kind: 'orphan-missing-proposal-link', marker: key });
      continue;
    }
    for (const ref of m.proposalRefs) {
      const proposalPath = ref.replace(/^.*proposals\//, 'proposals/');
      if (!fs.existsSync(path.join(root, proposalPath))) {
        issues.push({ kind: 'missing-target', marker: key, proposal: proposalPath });
      }
    }
    if (m.resolved && !m.testRef) {
      issues.push({ kind: 'resolved-without-evidence', marker: key });
    }
  }
  return issues;
}

// Best-effort reverse direction: a proposal's own "Sites:" line names source files it expects to carry
// the open item. Advisory only (never gates --check) — the proposal author may legitimately describe a
// site before code lands, and this tool never invents a TODO to "fix" that gap.
export function findDeclaredSites(proposalText) {
  const sites = new Set();
  for (const line of proposalText.split('\n')) {
    if (!/\bSites?:/.test(line)) continue;
    for (const m of line.matchAll(/`([\w./-]+\.\w+)`/g)) sites.add(m[1]);
  }
  return [...sites];
}

export function findUncoveredDeclaredSites(root, proposalsDir, markers) {
  const coveredFiles = new Set(markers.map((m) => m.file));
  const uncovered = [];
  if (!fs.existsSync(path.join(root, proposalsDir))) return uncovered;
  for (const name of fs.readdirSync(path.join(root, proposalsDir))) {
    if (!name.endsWith('.md')) continue;
    const proposalPath = path.join(proposalsDir, name);
    const text = safeSource(root, proposalPath);
    for (const site of findDeclaredSites(text)) {
      if (!coveredFiles.has(site) && fs.existsSync(path.join(root, site))) {
        uncovered.push({ proposal: proposalPath, site });
      }
    }
  }
  return uncovered;
}

export function buildLedger(root, sourceRoots, proposalsDir = 'proposals') {
  const markers = findHandoffMarkers(root, sourceRoots);
  const issues = crossCheckMarkers(root, markers);
  const uncoveredDeclaredSites = findUncoveredDeclaredSites(root, proposalsDir, markers);
  return { generatedAt: new Date().toISOString(), markers, issues, uncoveredDeclaredSites,
    pass: issues.length === 0 };
}

const cell = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
export function renderResults(ledger) {
  const rows = ledger.markers.map((m) =>
    `|${m.sourceRoot}|${m.file}:${m.line}|${m.proposalRefs.join('; ') || '(none)'}|${m.resolved ? 'resolved-claim' : 'open'}|`).join('\n');
  const issues = ledger.issues.map((i) => `- **${i.kind}** — ${i.marker}${i.proposal ? ` (target ${i.proposal})` : ''}`).join('\n') || 'None.';
  const advisory = ledger.uncoveredDeclaredSites.map((u) => `- ${u.proposal} names \`${u.site}\` but no TODO(handoff) references that exact file (may be legitimate; not fabricated, not gated).`).join('\n') || 'None.';
  return `# Handoff ledger results\n\nGenerated ${ledger.generatedAt} by \`node scripts/qc/handoff-ledger.mjs\`. Read-only: scans supported source for \`TODO(handoff):\` markers and cross-checks each against \`proposals/\`. Never edits source, never invents a marker.\n\n${ledger.markers.length} marker(s) found; ${ledger.issues.length} hard issue(s); ${ledger.uncoveredDeclaredSites.length} advisory-only declared-site gap(s).\n\n## Gate\n\n${ledger.pass ? 'PASS — every marker has a resolvable proposal target and no resolved-without-evidence claim.' : 'FAIL — see issues below. This closure gate requires evidence, not a completed marker alone.'}\n\n## Issues (gate-relevant)\n\n${issues}\n\n## Advisory: proposal-declared sites with no matching TODO(handoff)\n\n${advisory}\n\n## Every marker\n\n|Source root|File:line|Proposal ref(s)|Status|\n|---|---|---|---|\n${rows || 'None found.'}\n`;
}

// Default source roots: the meta repo itself, plus every subproject directory actually present on disk
// (registered in minion.json, or explicitly named in AGENTS.md as participating in runtime work).
export function defaultSourceRoots(root) {
  const candidates = ['minion', 'minion_hub', 'minion_site', 'paperclip-minion', 'pixel-agents', 'minion_factory', 'minion_base', 'drone', 'minion_plugins'];
  return [{ label: 'meta', dir: '.' }, ...candidates.filter((d) => fs.existsSync(path.join(root, d, '.git'))).map((d) => ({ label: d, dir: d }))];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : fileURLToPath(new URL('../../', import.meta.url));
  const ledger = buildLedger(root, defaultSourceRoots(root));
  const metaRoot = fileURLToPath(new URL('../../', import.meta.url));
  const output = path.join(metaRoot, '.planning/phases/18-docs-governance/18-HANDOFF-RESULTS.md');
  if (args.includes('--check')) {
    if (!ledger.pass) {
      console.error(JSON.stringify({ pass: false, markers: ledger.markers.length, issues: ledger.issues.length }));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify({ pass: true, markers: ledger.markers.length, issues: 0 }));
    }
  } else {
    fs.writeFileSync(output, renderResults(ledger));
    console.log(JSON.stringify({ wrote: path.relative(metaRoot, output), markers: ledger.markers.length,
      issues: ledger.issues.length, advisory: ledger.uncoveredDeclaredSites.length, pass: ledger.pass }));
  }
}
