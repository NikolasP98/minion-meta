import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, test } from 'node:test';
import { inventoryHandoffs, sourceComments } from './handoff-ledger.mjs';

const temps = [];
afterEach(() => {
  for (const p of temps.splice(0)) fs.rmSync(p, { recursive: true, force: true });
});
const digest = (s) => createHash('sha256').update(s).digest('hex');
function put(root, name, text) {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), text);
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-handoff-'));
  temps.push(root);
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'proposals'));
  put(root, '.planning/REQUIREMENTS.md', '- [ ] **DOC-03**: Pair implementation handoffs.\n');
  put(root, '.planning/phases/example/01-PLAN.md', '# Exact next gate\n');
  return root;
}
const options = { roots: ['scripts'] };
const comment =
  '// TODO(handoff): DOC-03 verify the native boundary.\n// See proposals/example.md.';
function record(overrides = {}) {
  return {
    id: 'example',
    kind: 'implementation',
    state: 'unresolved',
    sources: [{ path: 'scripts/example.ts', markerSha256: digest(comment) }],
    owner: 'root',
    nextPlan: '.planning/phases/example/01-PLAN.md',
    ...overrides,
  };
}
function proposal(root, records) {
  put(
    root,
    'proposals/example.md',
    '# Proposal\n\n```handoff-ledger\n' + JSON.stringify(records) + '\n```\n',
  );
}
function paired() {
  const root = fixture();
  put(root, 'scripts/example.ts', comment + '\nexport const value = 1;\n');
  proposal(root, record());
  return root;
}
const codes = (result) => result.issues.map((i) => i.code);

test('extracts contiguous multiline comments with exact digest and requirement references', () => {
  const result = inventoryHandoffs(paired(), options);
  assert.equal(result.markers.length, 1);
  assert.equal(result.markers[0].markerSha256, digest(comment));
  assert.deepEqual(result.markers[0].requirements, ['DOC-03']);
  assert.deepEqual(result.markers[0].proposals, ['proposals/example.md']);
  assert.equal(result.markers[0].line, 1);
  assert.equal(result.markers[0].endLine, 2);
  assert.equal(result.markers[0].pairing, 'paired-unresolved');
  assert.equal(result.checkPassed, true);
  assert.equal(result.semanticClosure, false);
});

test('native parser ignores quoted, template, regex and JSX marker text', () => {
  const source = [
    'const a = "// TODO(handoff): quoted";',
    "const b = '// TODO(handoff): quoted';",
    'const c = `',
    '// TODO(handoff): template',
    '`;',
    'const d = /TODO(handoff):\\/\\/regex/;',
    'const e = <div>TODO(handoff): JSX text</div>;',
    'const f = `raw ${ /* TODO(handoff): real expression comment */ 1 } tail`;',
    '/* TODO(handoff): real block */',
  ].join('\n');
  const result = sourceComments(source, 'scripts/example.tsx');
  assert.deepEqual(result.issues, []);
  assert.equal(result.comments.length, 2);
  assert.match(result.comments[0].text, /real expression comment/);
  assert.match(result.comments[1].text, /real block/);
});

test('native Svelte parser finds actual markup/script/expression comments only', () => {
  const text =
    '<script lang="ts">const x = "TODO(handoff): string";\n// TODO(handoff): script\n</script>\n<!-- TODO(handoff): markup -->\n<div>{/* TODO(handoff): expression */ `TODO(handoff): text`}</div>';
  const result = sourceComments(text, 'packages/ui/src/Example.svelte');
  assert.deepEqual(result.issues, []);
  assert.equal(result.comments.length, 3);
});

test('reports malformed source and unsupported languages instead of pairing ambiguous markers', () => {
  assert.ok(
    sourceComments('const value = "TODO(handoff): unterminated', 'scripts/a.ts').issues.length,
  );
  assert.equal(
    sourceComments('# TODO(handoff): review', 'scripts/a.py').issues[0].code,
    'unsupported-marker-language',
  );
  assert.equal(
    sourceComments('<style>/* TODO(handoff): css */</style>', 'packages/ui/src/A.svelte').issues[0]
      .code,
    'unsupported-style-marker',
  );
});

test('requires both forward proposal reference and exact reverse source digest', () => {
  const root = paired();
  proposal(root, []);
  assert.ok(codes(inventoryHandoffs(root, options)).includes('unregistered-marker'));
  proposal(
    root,
    record({ sources: [{ path: 'scripts/example.ts', markerSha256: '0'.repeat(64) }] }),
  );
  const result = inventoryHandoffs(root, options);
  assert.ok(codes(result).includes('registered-marker-missing'));
  assert.equal(result.checkPassed, false);
});

test('a valid reverse record cannot substitute for the source forward link', () => {
  const root = paired();
  const text = '// TODO(handoff): DOC-03 native boundary remains open.';
  put(root, 'scripts/example.ts', text);
  proposal(root, record({ sources: [{ path: 'scripts/example.ts', markerSha256: digest(text) }] }));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('missing-forward-proposal'));
});

test('missing actual proposal, next plan and unknown requirement fail checks', () => {
  const root = paired();
  fs.unlinkSync(path.join(root, 'proposals/example.md'));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('missing-proposal'));
  proposal(root, record());
  fs.unlinkSync(path.join(root, '.planning/phases/example/01-PLAN.md'));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('missing-next-plan'));
  put(root, 'scripts/unknown.ts', '// TODO(handoff): DOC-99 See proposals/example.md.');
  assert.ok(codes(inventoryHandoffs(root, options)).includes('unknown-requirement'));
});

test('only explicit research classification waives implementation sources', () => {
  const root = fixture();
  proposal(root, { id: 'research', kind: 'research' });
  let result = inventoryHandoffs(root, options);
  assert.equal(result.records[0].classification, 'explicit-research');
  assert.equal(result.checkPassed, true);
  put(root, 'proposals/plain.md', '# Complete research\nThis conceptual proposal is done.');
  result = inventoryHandoffs(root, options);
  assert.equal(
    result.proposals.find((p) => p.path.endsWith('plain.md')).classification,
    'unclassified-manual-review',
  );
  proposal(root, { id: 'research', kind: 'implementation', state: 'unresolved' });
  assert.equal(inventoryHandoffs(root, options).checkPassed, false);
});

test('removed registered marker and completion summaries never close a handoff', () => {
  const root = paired();
  put(root, 'scripts/example.ts', 'export const fixed = true;');
  assert.ok(codes(inventoryHandoffs(root, options)).includes('registered-marker-missing'));
  proposal(root, record({ state: 'completion-proposed' }));
  const result = inventoryHandoffs(root, options);
  assert.ok(codes(result).includes('completion-evidence-missing'));
  assert.equal(result.semanticClosure, false);
  assert.equal(result.checkPassed, false);
});

test('rejects duplicate record IDs, duplicate JSON keys and unsupported fields', () => {
  const root = paired();
  proposal(root, [record(), record()]);
  assert.ok(codes(inventoryHandoffs(root, options)).includes('duplicate-record-id'));
  put(
    root,
    'proposals/example.md',
    '```handoff-ledger\n{"id":"a","id":"b","kind":"research"}\n```',
  );
  assert.ok(codes(inventoryHandoffs(root, options)).includes('invalid-ledger-block'));
  proposal(root, record({ trustMe: true }));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('invalid-record'));
});

test('rejects in-root file and directory symlinks without traversing them', () => {
  const root = paired();
  fs.symlinkSync('example.ts', path.join(root, 'scripts/alias.ts'));
  fs.symlinkSync('../proposals', path.join(root, 'scripts/alias-dir'));
  const result = inventoryHandoffs(root, options);
  assert.equal(codes(result).filter((c) => c === 'unsafe-symlink').length, 2);
  assert.equal(result.markers.length, 1);
  assert.equal(result.completeScan, false);
});

test('rejects symlinked selected ancestors and proposal aliases, including env aliases', () => {
  const root = fixture();
  put(root, '.env.private', 'DO_NOT_READ');
  fs.symlinkSync('../.env.private', path.join(root, 'proposals/alias.md'));
  fs.renameSync(path.join(root, 'scripts'), path.join(root, 'real-scripts'));
  fs.symlinkSync('real-scripts', path.join(root, 'scripts'));
  const result = inventoryHandoffs(root, options);
  assert.ok(codes(result).filter((c) => c === 'unsafe-symlink').length >= 2);
  assert.equal(JSON.stringify(result).includes('DO_NOT_READ'), false);
});

test('excludes env/dependency/generated/managed data entries before reading', () => {
  const root = paired();
  for (const rel of [
    'scripts/.env.fixture',
    'scripts/node_modules/pkg/a.ts',
    'scripts/dist/a.ts',
    'scripts/data/a.ts',
  ]) {
    put(root, rel, '// TODO(handoff): DO_NOT_READ');
  }
  const result = inventoryHandoffs(root, options);
  assert.equal(result.markers.length, 1);
  assert.equal(JSON.stringify(result.markers).includes('DO_NOT_READ'), false);
  assert.equal(result.exclusions.length, 4);
});

test('unknown/traversing roots and unsafe structured source paths fail closed', () => {
  const root = paired();
  assert.throws(() => inventoryHandoffs(root, { roots: ['../outside'] }), /supported/);
  assert.throws(() => inventoryHandoffs(root, { roots: ['/tmp'] }), /supported/);
  proposal(root, record({ sources: [{ path: '../outside.ts', markerSha256: '0'.repeat(64) }] }));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('invalid-record'));
});

test('oversized files, invalid UTF-8, missing roots and scan limits cannot pass', () => {
  const root = paired();
  put(root, 'scripts/invalid.ts', Buffer.from([0xff]));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('unreadable-source'));
  assert.equal(inventoryHandoffs(root, { ...options, maxFileBytes: 8 }).completeScan, false);
  assert.equal(inventoryHandoffs(root, { ...options, maxFiles: 1 }).completeScan, false);
  assert.equal(inventoryHandoffs(root, { ...options, maxTotalBytes: 8 }).completeScan, false);
  fs.rmSync(path.join(root, 'scripts'), { recursive: true });
  assert.equal(inventoryHandoffs(root, options).completeScan, false);
});

test('output is deterministic and explicitly scoped, with no semantic closure', () => {
  const root = paired();
  const a = inventoryHandoffs(root, options);
  assert.deepEqual(a, inventoryHandoffs(root, options));
  assert.deepEqual(a.sourceRoots, ['scripts']);
  assert.ok(a.excludedProjects.includes('paperclip-minion'));
  assert.equal(a.semanticClosure, false);
});

test('matching source and claimed test artifacts still require independent completion review', () => {
  const root = paired();
  const text = fs.readFileSync(path.join(root, 'scripts/example.ts'), 'utf8');
  const evidence = '{"result":"passed"}\n';
  put(root, '.planning/phases/example/tests.json', evidence);
  proposal(
    root,
    record({
      state: 'completion-proposed',
      completion: {
        sources: [{ path: 'scripts/example.ts', sha256: digest(text) }],
        tests: [
          {
            path: '.planning/phases/example/tests.json',
            sha256: digest(evidence),
            command: 'node --test example.test.mjs',
            result: 'passed',
          },
        ],
      },
    }),
  );
  const result = inventoryHandoffs(root, options);
  assert.equal(codes(result).includes('completion-evidence-missing'), false);
  assert.ok(codes(result).includes('completion-independent-review-required'));
  assert.ok(codes(result).includes('completion-marker-present'));
  assert.equal(result.checkPassed, false);
  assert.equal(result.semanticClosure, false);
});

test('source strings cannot satisfy a registered implementation site', () => {
  const root = paired();
  const literal = 'const example = `// TODO(handoff): proposals/example.md`;';
  put(root, 'scripts/example.ts', literal);
  proposal(
    root,
    record({ sources: [{ path: 'scripts/example.ts', markerSha256: digest(literal) }] }),
  );
  const result = inventoryHandoffs(root, options);
  assert.equal(result.markers.length, 0);
  assert.ok(codes(result).includes('registered-marker-missing'));
});

test('separates adjacent markers, keeps CRLF bytes, and rejects ambiguous block markers', () => {
  const first = '// TODO(handoff): one\r\n// proposals/one.md';
  const second = '// TODO(handoff): two\r\n// proposals/two.md';
  const comments = sourceComments(first + '\r\n' + second, 'scripts/a.ts').comments;
  assert.deepEqual(
    comments.map((c) => c.text),
    [first, second],
  );
  assert.equal(
    sourceComments('/* TODO(handoff): one TODO(handoff): two */', 'scripts/a.ts').issues[0].code,
    'ambiguous-multiple-markers',
  );
});

test('a symlinked root and a directory-shaped required document cannot pass', () => {
  const root = paired();
  const alias = root + '-alias';
  temps.push(alias);
  fs.symlinkSync(root, alias);
  assert.ok(codes(inventoryHandoffs(alias, options)).includes('unsafe-symlink'));
  fs.unlinkSync(path.join(root, '.planning/phases/example/01-PLAN.md'));
  fs.mkdirSync(path.join(root, '.planning/phases/example/01-PLAN.md'));
  assert.ok(codes(inventoryHandoffs(root, options)).includes('nonregular-source'));
});

test('entry budget stops traversal even when entries have uninspected extensions', () => {
  const root = fixture();
  for (let i = 0; i < 5; i++) put(root, `scripts/${i}.bin`, 'not source');
  const result = inventoryHandoffs(root, { ...options, maxEntries: 2 });
  assert.equal(result.completeScan, false);
  assert.ok(codes(result).includes('scan-limit'));
  assert.equal(result.visitedEntries, 3);
});

test('preserves UTF-8 BOM in source identity and never executes inspected source', () => {
  const root = paired();
  const source = '\ufeff' + comment + '\nthrow new Error("must never execute");';
  put(root, 'scripts/example.ts', source);
  const result = inventoryHandoffs(root, options);
  assert.equal(result.files.find((f) => f.path === 'scripts/example.ts').sha256, digest(source));
  assert.equal(result.markers[0].fileSha256, digest(source));
  assert.equal(result.checkPassed, true);
});

test('fenced proposal examples cannot masquerade as reverse declarations', () => {
  const root = fixture();
  put(
    root,
    'proposals/example.md',
    '````markdown\n```handoff-ledger\n{"id":"example","kind":"research"}\n```\n````\n',
  );
  const result = inventoryHandoffs(root, options);
  assert.equal(result.records.length, 0);
  assert.equal(result.proposals[0].classification, 'unclassified-manual-review');
  put(root, 'proposals/example.md', '```handoff-ledger\n{"id":"a","kind":"research"}\n');
  assert.ok(codes(inventoryHandoffs(root, options)).includes('invalid-ledger-block'));
});

test('one oversized file does not prevent other selected roots from being inventoried', () => {
  const root = paired();
  put(root, 'scripts/0-large.ts', 'x'.repeat(5000));
  const result = inventoryHandoffs(root, { ...options, maxFileBytes: 4096 });
  assert.ok(codes(result).includes('file-size-limit'));
  assert.equal(result.markers.length, 1);
  assert.equal(result.completeScan, false);
});

test('identical comments at two sites cannot silently bind one reverse record', () => {
  const root = paired();
  put(root, 'scripts/example.ts', comment + '\nconst boundary = 1;\n' + comment);
  const result = inventoryHandoffs(root, options);
  assert.equal(result.markers.length, 2);
  assert.ok(codes(result).includes('ambiguous-registered-marker'));
  assert.equal(result.checkPassed, false);
  assert.equal(
    result.requirementsSha256,
    digest(fs.readFileSync(path.join(root, '.planning/REQUIREMENTS.md'))),
  );
});
