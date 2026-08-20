#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  allowedTags,
  buildArtifact,
  canonicalTags,
  checkCorpus,
  generatedFiles,
  globToRegExp,
  globsByTag,
  labelerText,
  readFleetIds,
  readRouting,
  rulesFor,
  tagsForPath,
  tagsForPaths,
  validateRouting
} from './routing.mjs';

const routing = readRouting();
const script = resolve('scripts/routing.mjs');

// --- the taxonomy itself -----------------------------------------------------
assert.deepEqual(validateRouting(routing), []);
assert.deepEqual(canonicalTags(routing), ['ui', 'logic', 'data', 'infra', 'docs', 'test', 'security', 'perf', 'deps']);
assert.deepEqual(routing.repositories.map((row) => row.id).sort(), [...readFleetIds()].sort());
// security/perf are declared, never inferred from a path (§4b: intent, not location).
for (const tag of ['security', 'perf']) {
  assert.equal(routing.tags.find((entry) => entry.id === tag).derived, false);
  assert.equal(routing.repositories.some((row) => [...routing.shared, ...row.rules].some((rule) => rule.tags.includes(tag))), false, `${tag} must not be path-derived`);
}

function clone(value) { return structuredClone(value); }
function errorFor(mutator) {
  const candidate = clone(routing);
  mutator(candidate);
  const errors = validateRouting(candidate);
  assert(errors.length > 0, 'negative fixture unexpectedly passed');
  return errors.join('\n');
}

assert.match(errorFor((value) => { value.unexpected = true; }), /\$\.unexpected: unknown field/);
assert.match(errorFor((value) => { value.schemaVersion = 2; }), /schemaVersion: must equal 1/);
assert.match(errorFor((value) => { value.tags.push({ id: 'ui', derived: true, description: 'duplicate of ui' }); }), /duplicate tag 'ui'/);
assert.match(errorFor((value) => { value.tags[0].description = 'short'; }), /description: must be a sentence/);
assert.match(errorFor((value) => { value.tags[0].id = 'UI'; }), /malformed tag id/);
assert.match(errorFor((value) => { value.legacyTags.push({ id: 'ui', reason: 'canonical tags cannot be legacy ones' }); }), /is a canonical tag/);
assert.match(errorFor((value) => { value.legacyTags[0].reason = 'too short'; }), /reason: must explain the sunset path/);
assert.match(errorFor((value) => { value.shared[0].tags = ['security']; }), /'security' is not a path-derivable tag/);
assert.match(errorFor((value) => { value.shared[0].tags = ['nonsense']; }), /'nonsense' is not a path-derivable tag/);
assert.match(errorFor((value) => { value.shared[0].paths = ['/etc/passwd']; }), /must be repo-relative/);
assert.match(errorFor((value) => { value.shared[0].paths = ['../secrets/**']; }), /must not escape the repository/);
assert.match(errorFor((value) => { value.shared[0].paths = ['src/**test/**']; }), /'\*\*' must be a whole path segment/);
assert.match(errorFor((value) => { value.shared[0].paths = ['src/[a-z].ts']; }), /unsupported glob character/);
assert.match(errorFor((value) => { value.shared[0].paths = []; }), /paths: must be a non-empty array/);
assert.match(errorFor((value) => { value.shared[0].paths.push(value.shared[0].paths[0]); }), /duplicate glob/);
assert.match(errorFor((value) => { value.repositories.pop(); }), /ids must be exactly the repo-policy fleet/);
assert.match(errorFor((value) => { value.repositories[0].id = 'minion-metaa'; }), /ids must be exactly the repo-policy fleet/);
assert.match(errorFor((value) => { delete value.repositories[0].rules; }), /minion-meta\].rules: is required/);

// --- glob dialect ------------------------------------------------------------
assert.equal(globToRegExp('**/*.md').test('README.md'), true, '** must match zero directories');
assert.equal(globToRegExp('**/*.md').test('specs/a/b.md'), true);
assert.equal(globToRegExp('**/*.md').test('a.mdx'), false);
assert.equal(globToRegExp('src/server/**').test('src/server/db/schema/agents.ts'), true);
assert.equal(globToRegExp('src/server/**').test('src/serverless.ts'), false);
assert.equal(globToRegExp('src/lib/**/*.ts').test('src/lib/x.ts'), true);
assert.equal(globToRegExp('src/lib/**/*.ts').test('src/lib/a/b/x.ts'), true);
assert.equal(globToRegExp('src/lib/**/*.ts').test('src/lib/x.svelte'), false);
assert.equal(globToRegExp('*.ts').test('a/b.ts'), false, '* must not span separators');
assert.equal(globToRegExp('src/hooks.*.ts').test('src/hooks.server.ts'), true);
assert.equal(globToRegExp('docker-compose*.yml').test('docker-compose.sandbox.yml'), true);
assert.equal(globToRegExp('package.json').test('packageXjson'), false, 'dots are literal');
assert.equal(globToRegExp('src/?.ts').test('src/a.ts'), true);
assert.equal(globToRegExp('src/?.ts').test('src/ab.ts'), false);

// --- derivation --------------------------------------------------------------
assert.deepEqual(tagsForPath(routing, 'minion_hub', 'src/lib/components/Button.svelte'), ['ui']);
assert.deepEqual(tagsForPath(routing, 'minion_hub', 'src/server/db/schema/agents.ts'), ['logic', 'data']);
assert.deepEqual(tagsForPath(routing, 'minion_hub', 'README.md'), ['docs']);
assert.deepEqual(tagsForPath(routing, 'minion_hub', 'package.json'), ['deps']);
assert.deepEqual(tagsForPath(routing, 'minion_hub', '.github/workflows/ci.yml'), ['infra']);
assert.deepEqual(tagsForPath(routing, 'minion_hub', 'src/lib/state/agents.test.ts'), ['logic', 'test']);
assert.deepEqual(tagsForPath(routing, 'minion-meta', 'specs/2026-01-01-x.md'), ['docs']);
assert.deepEqual(tagsForPath(routing, 'minion-meta', 'packages/env/src/resolve.ts'), ['logic']);
assert.deepEqual(tagsForPath(routing, 'minion', 'src/channels/telegram.ts'), ['logic']);
assert.deepEqual(tagsForPath(routing, 'minion_hub', 'unmapped/thing.rs'), [], 'unmatched paths carry no tag');
// A PR's tags are the union over its files, in canonical order.
assert.deepEqual(
  tagsForPaths(routing, 'minion_hub', ['src/app.css', 'src/server/auth.ts', 'CHANGELOG.md']),
  ['ui', 'logic', 'docs']
);
// A docs-only diff stays a docs-only diff — that is what qualifies it for the light lane.
assert.deepEqual(tagsForPaths(routing, 'minion_site', ['docs/guide.md', 'README.md']), ['docs']);
assert.throws(() => rulesFor(routing, 'not-a-repo'), /not in routing.yml/);

// --- generated artifacts ------------------------------------------------------
const reordered = clone(routing);
reordered.repositories.reverse();
reordered.legacyTags.reverse();
assert.equal(buildArtifact(routing).contentHash, buildArtifact(reordered).contentHash, 'row order changed the canonical hash');
assert.notEqual(
  buildArtifact(routing).contentHash,
  buildArtifact(clone({ ...routing, shared: [...routing.shared.slice(1)] })).contentHash,
  'dropping a rule must change the hash'
);
for (const [path, text] of generatedFiles(routing)) assert.equal(readFileSync(path, 'utf8'), text, `${path} is stale — run node scripts/routing.mjs generate`);

// The labeler config and our own classifier must agree, or PR labels drift from gate routing.
for (const row of routing.repositories) {
  const emitted = new Map(globsByTag(routing, row.id));
  const text = labelerText(routing, row.id);
  for (const [tag, globs] of emitted) {
    assert.match(text, new RegExp(`^${tag}:$`, 'm'), `${row.id}: labeler config is missing '${tag}'`);
    for (const glob of globs) {
      assert(text.includes(`"${glob}"`), `${row.id}: labeler config is missing glob ${glob}`);
      assert.deepEqual(
        tagsForPath(routing, row.id, glob.replaceAll('**', 'x').replaceAll('*', 'y').replaceAll('?', 'z')).includes(tag),
        true,
        `${row.id}: glob ${glob} does not classify as ${tag}`
      );
    }
  }
  assert.equal(emitted.has('security'), false);
}

// --- corpus gate --------------------------------------------------------------
assert.deepEqual(checkCorpus(routing), [], 'committed specs/proposals must only use legal tags');

const fixtureRoot = mkdtempSync(join(tmpdir(), 'routing-corpus-'));
try {
  mkdirSync(join(fixtureRoot, 'specs'));
  mkdirSync(join(fixtureRoot, 'proposals'));
  writeFileSync(join(fixtureRoot, 'specs/bad.md'), '---\nid: bad\ntitle: Bad\ntags: [ui, wat]\n---\n\nbody\n');
  writeFileSync(join(fixtureRoot, 'specs/scalar.md'), '---\nid: scalar\ntitle: Scalar\ntags: infra\n---\n\nbody\n');
  const errors = checkCorpus(routing, ['specs', 'proposals'], fixtureRoot);
  assert.match(errors.join('\n'), /unknown tag 'wat'/);
  assert.match(errors.join('\n'), /scalar\.md: tags must be a bracketed array/);
  // Every legacy tag is unused in this fixture corpus → the ratchet demands their removal.
  for (const tag of routing.legacyTags.map((entry) => entry.id)) assert.match(errors.join('\n'), new RegExp(`legacy tag '${tag}' is no longer used`));
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

// --- CLI ----------------------------------------------------------------------
function cli(...args) { return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' }); }
assert.equal(cli('validate').status, 0);
assert.equal(cli('generate', '--check').status, 0);
assert.equal(cli('tags', 'minion_hub', 'src/app.css', 'src/server/x.ts').stdout.trim(), 'ui,logic');
assert.deepEqual(JSON.parse(cli('tags', 'minion_hub', 'src/app.css', '--json').stdout).tags, ['ui']);
assert.equal(cli('tags', 'minion_hub').status, 1);
assert.equal(cli('tags', 'nope', 'a.ts').status, 1);
assert.equal(cli('show', 'minion-meta').status, 0);
assert.equal(cli('show', 'nope').status, 1);
assert.equal(cli('nonsense').status, 1);

// --- index gates: the enum is enforced where cards are written ---------------
assert(allowedTags(routing).has('logic'));
assert.equal(allowedTags(routing).has('wat'), false);

const indexRoot = mkdtempSync(join(tmpdir(), 'routing-index-'));
try {
  mkdirSync(join(indexRoot, 'specs'));
  mkdirSync(join(indexRoot, 'proposals'));
  const good = '---\nid: a\ntitle: A\nstage: spec\nstatus: draft\ncreated: 2026-08-20\ntags: [logic, test]\n---\n\nbody\n';
  writeFileSync(join(indexRoot, 'specs/a.md'), good);
  writeFileSync(join(indexRoot, 'proposals/a.md'), '---\nid: a\ntitle: A\nstatus: draft\ncreated: 2026-08-20\ntags: [ui]\n---\n\nbody\n');
  const runIndex = (name) => spawnSync(process.execPath, [resolve(`scripts/${name}`)], { cwd: indexRoot, encoding: 'utf8' });
  assert.equal(runIndex('spec-index.mjs').status, 0);
  assert.equal(runIndex('proposal-index.mjs').status, 0);

  writeFileSync(join(indexRoot, 'specs/a.md'), good.replace('[logic, test]', '[logic, wat]'));
  const rejected = runIndex('spec-index.mjs');
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /unknown tag "wat"/);

  writeFileSync(join(indexRoot, 'specs/a.md'), good.replace('[logic, test]', 'logic'));
  const scalar = runIndex('spec-index.mjs');
  assert.equal(scalar.status, 1);
  assert.match(scalar.stderr, /tags must be a bracketed array/);

  writeFileSync(join(indexRoot, 'specs/a.md'), good);
  writeFileSync(join(indexRoot, 'proposals/a.md'), '---\nid: a\ntitle: A\nstatus: draft\ncreated: 2026-08-20\ntags: [ui, nonsense]\n---\n\nbody\n');
  const rejectedProposal = runIndex('proposal-index.mjs');
  assert.equal(rejectedProposal.status, 1);
  assert.match(rejectedProposal.stderr, /unknown tag "nonsense"/);
  // Legacy allowlist entries stay accepted so the factory's handoff sweep keeps writing cards.
  writeFileSync(join(indexRoot, 'proposals/a.md'), '---\nid: a\ntitle: A\nstatus: draft\ncreated: 2026-08-20\ntags: [handoff-sweep]\n---\n\nbody\n');
  assert.equal(runIndex('proposal-index.mjs').status, 0);
} finally {
  rmSync(indexRoot, { recursive: true, force: true });
}

console.log('routing.test.mjs: all assertions passed');
