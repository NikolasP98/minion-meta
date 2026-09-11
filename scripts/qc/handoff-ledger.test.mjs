import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { safeSource, findHandoffMarkers, crossCheckMarkers, findDeclaredSites, findUncoveredDeclaredSites, buildLedger, renderResults } from './handoff-ledger.mjs';

function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-handoff-ledger-'));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function write(root, relative, content) {
  const abs = path.join(root, relative);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

test('safeSource rejects traversal/absolute/.env', () => fixture((root) => {
  write(root, 'ok.ts', 'export const x = 1;');
  assert.equal(safeSource(root, 'ok.ts'), 'export const x = 1;');
  assert.throws(() => safeSource(root, '../escape.ts'));
  assert.throws(() => safeSource(root, '/abs.ts'));
  assert.throws(() => safeSource(root, '.env.local'));
}));

test('findHandoffMarkers captures the marker plus its comment continuation lines and never scans node_modules/.md', () => fixture((root) => {
  write(root, 'src/a.ts', [
    '// TODO(handoff): fix the thing, see',
    '// proposals/2026-01-01-example.md for context.',
    'export const a = 1;',
  ].join('\n'));
  write(root, 'src/orphan.ts', '// TODO(handoff): no link here at all\nexport const b = 2;');
  write(root, 'node_modules/dep/x.ts', '// TODO(handoff): should never be scanned\n');
  write(root, 'notes.md', 'TODO(handoff): prose mention only, not a source site\n');
  const markers = findHandoffMarkers(root, [{ label: 'meta', dir: '.' }]);
  assert.equal(markers.length, 2);
  const linked = markers.find((m) => m.file === 'src/a.ts');
  assert.deepEqual(linked.proposalRefs, ['proposals/2026-01-01-example.md']);
  const orphan = markers.find((m) => m.file === 'src/orphan.ts');
  assert.deepEqual(orphan.proposalRefs, []);
}));

test('findHandoffMarkers recognizes SQL "--" and Svelte "<!--" comment openers as genuine sites', () => fixture((root) => {
  write(root, 'migrations/0001.sql', '-- TODO(handoff): pick a retention policy before shipping\ncreate table x (id int);\n');
  write(root, 'src/page.svelte', '<!-- TODO(handoff): rework this layout on mobile -->\n<div>ok</div>\n');
  const markers = findHandoffMarkers(root, [{ label: 'meta', dir: '.' }]);
  assert.equal(markers.length, 2);
}));

test('findHandoffMarkers excludes a literal TODO(handoff) string embedded in code or a test fixture, not opened as a comment', () => fixture((root) => {
  write(root, 'src/scanner.ts', 'export const label = `TODO(handoff): ${identity}`;\n');
  write(root, 'src/scanner.test.ts', [
    "test('x', () => {",
    "  const diff = '@@\\n+// TODO(handoff): wire the retry budget\\n';",
    "  assert.equal(diff, diff);",
    '});',
  ].join('\n'));
  const markers = findHandoffMarkers(root, [{ label: 'meta', dir: '.' }]);
  assert.equal(markers.length, 0);
}));

test('findHandoffMarkers scans a nested independent git checkout only once, under its own label', () => fixture((root) => {
  write(root, 'sub/.git/HEAD', 'ref: refs/heads/main\n');
  write(root, 'sub/src/nested.ts', '// TODO(handoff): nested repo marker\n');
  const markers = findHandoffMarkers(root, [{ label: 'meta', dir: '.' }, { label: 'sub', dir: 'sub' }]);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].sourceRoot, 'sub');
}));

test('crossCheckMarkers fails a marker missing a proposal link and one whose target does not exist', () => fixture((root) => {
  write(root, 'proposals/2026-01-01-real.md', '# Real proposal\n');
  const markers = [
    { sourceRoot: 'meta', file: 'a.ts', line: 1, proposalRefs: ['proposals/2026-01-01-real.md'], resolved: false, testRef: null },
    { sourceRoot: 'meta', file: 'b.ts', line: 1, proposalRefs: [], resolved: false, testRef: null },
    { sourceRoot: 'meta', file: 'c.ts', line: 1, proposalRefs: ['proposals/2026-01-01-missing.md'], resolved: false, testRef: null },
  ];
  const issues = crossCheckMarkers(root, markers);
  assert.deepEqual(issues.map((i) => i.kind).sort(), ['missing-target', 'orphan-missing-proposal-link']);
}));

test('crossCheckMarkers requires exact test/source identity for a completed marker, not the comment alone', () => fixture((root) => {
  write(root, 'proposals/2026-01-01-real.md', '# Real proposal\n');
  const withEvidence = [{ sourceRoot: 'meta', file: 'a.ts', line: 1, proposalRefs: ['proposals/2026-01-01-real.md'], resolved: true, testRef: 'a.test.ts' }];
  assert.deepEqual(crossCheckMarkers(root, withEvidence), []);
  const withoutEvidence = [{ sourceRoot: 'meta', file: 'a.ts', line: 1, proposalRefs: ['proposals/2026-01-01-real.md'], resolved: true, testRef: null }];
  const issues = crossCheckMarkers(root, withoutEvidence);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, 'resolved-without-evidence');
}));

test('findDeclaredSites extracts backtick file paths only from Sites: lines', () => {
  const text = 'Intro text.\nSites: `src/a.ts`, `src/b.ts`.\nUnrelated line with `not/a/site.ts` should not count.\n';
  assert.deepEqual(findDeclaredSites(text).sort(), ['src/a.ts', 'src/b.ts']);
});

test('findUncoveredDeclaredSites is advisory: reports a declared site with no matching marker but never as a hard issue', () => fixture((root) => {
  write(root, 'src/covered.ts', '// TODO(handoff): x\n// proposals/2026-01-01-p.md\n');
  write(root, 'src/uncovered.ts', 'export const z = 1;\n');
  write(root, 'proposals/2026-01-01-p.md', 'Sites: `src/covered.ts`, `src/uncovered.ts`.\n');
  const markers = findHandoffMarkers(root, [{ label: 'meta', dir: '.' }]);
  const uncovered = findUncoveredDeclaredSites(root, 'proposals', markers);
  assert.equal(uncovered.length, 1);
  assert.equal(uncovered[0].site, 'src/uncovered.ts');
}));

test('buildLedger + renderResults: a fixture missing either ledger side fails; a fully linked fixture passes', () => fixture((root) => {
  write(root, 'proposals/2026-01-01-p.md', 'Sites: `src/a.ts`.\n');
  write(root, 'src/a.ts', '// TODO(handoff): linked\n// proposals/2026-01-01-p.md\n');
  write(root, 'src/orphan.ts', '// TODO(handoff): unlinked open end\n');
  const ledger = buildLedger(root, [{ label: 'meta', dir: '.' }]);
  assert.equal(ledger.pass, false);
  assert.ok(ledger.issues.some((i) => i.kind === 'orphan-missing-proposal-link'));
  const doc = renderResults(ledger);
  assert.match(doc, /FAIL/);
  assert.match(doc, /orphan-missing-proposal-link/);

  fs.rmSync(path.join(root, 'src/orphan.ts'));
  const clean = buildLedger(root, [{ label: 'meta', dir: '.' }]);
  assert.equal(clean.pass, true);
  assert.match(renderResults(clean), /PASS/);
}));

test('a completed marker with a resolved claim but no test/source identity cannot close via buildLedger', () => fixture((root) => {
  write(root, 'proposals/2026-01-01-p.md', '# p\n');
  write(root, 'src/a.ts', '// TODO(handoff): RESOLVED claim with no evidence\n// proposals/2026-01-01-p.md\n');
  const ledger = buildLedger(root, [{ label: 'meta', dir: '.' }]);
  assert.equal(ledger.pass, false);
  assert.ok(ledger.issues.some((i) => i.kind === 'resolved-without-evidence'));
}));
