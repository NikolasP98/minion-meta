#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  LABELER_CONFIG_PATH,
  LABELER_WORKFLOW_PATH,
  allowedTags,
  buildArtifact,
  canonicalTags,
  checkCorpus,
  checkLabelerState,
  checkSliceTags,
  generatedFiles,
  globToRegExp,
  globsByTag,
  labelerBlocks,
  labelerText,
  labelerWorkflowGaps,
  labelerWorkflowText,
  parseSliceTags,
  readFleetIds,
  readFleetRows,
  readRouting,
  rulesFor,
  sliceTableRowCount,
  sliceTagsRequired,
  tagsForPath,
  tagsForPaths,
  validateRouting,
  validateSliceTags
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
assert.match(errorFor((value) => { delete value.sliceTagsRequiredFrom; }), /sliceTagsRequiredFrom: must be an ISO date/);
assert.match(errorFor((value) => { value.sliceTagsRequiredFrom = 'tomorrow'; }), /sliceTagsRequiredFrom: must be an ISO date/);
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


// --- the installed labeler pair (minion-meta consumes its own output) ---------
// Generating a config proves nothing; these assert the files a PR actually runs on.
const installedConfig = readFileSync(resolve(LABELER_CONFIG_PATH), 'utf8');
const installedWorkflow = readFileSync(resolve(LABELER_WORKFLOW_PATH), 'utf8');
assert.equal(installedConfig, labelerText(routing, 'minion-meta'), '.github/labeler.yml drifted from routing.yml');
assert.equal(installedWorkflow, labelerWorkflowText(routing, 'minion-meta'), '.github/workflows/labeler.yml drifted from routing.yml');
assert.match(installedWorkflow, /^on:\n  pull_request_target:\n    types: \[opened, synchronize, reopened, ready_for_review\]$/m);
assert.match(installedWorkflow, /^  pull-requests: write$/m, 'labeler cannot label without pull-requests: write');
assert.match(installedWorkflow, /uses: actions\/labeler@v5/);
assert(installedWorkflow.includes(`configuration-path: ${LABELER_CONFIG_PATH}`));
assert.match(installedWorkflow, /runs-on: ubuntu-latest/, 'a self-hosted labeler queues forever and labels nothing');
assert.match(installedWorkflow, new RegExp(`for tag in ${canonicalTags(routing).join(' ')}; do`), 'the label vocabulary must come from routing.yml');
// A `secrets` reference inside an `if` silently invalidates a workflow file — keep them in env.
assert.equal(/^\s*if:.*secrets\./m.test(installedWorkflow), false);

// Replay a representative PR: parse the INSTALLED config back into globs and check that the
// labels GitHub would apply equal the tags our own gates derive for the same changed files.
function labelsFromInstalledConfig(text, paths) {
  const byTag = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    const header = line.match(/^([a-z][a-z0-9-]*):$/);
    if (header) { current = header[1]; byTag.set(current, []); continue; }
    const glob = line.match(/^\s+- "(.+)"$/);
    if (glob && current) byTag.get(current).push(glob[1]);
  }
  return canonicalTags(routing).filter((tag) => (byTag.get(tag) ?? []).some((glob) => paths.some((path) => globToRegExp(glob).test(path))));
}
for (const paths of [
  ['scripts/routing.mjs', 'routing.yml', 'AGENTS.md', 'scripts/routing.test.mjs'],
  ['packages/db/schema.ts'],
  ['specs/2026-08-17-sdlc-phase-gates-scoring-spec.md'],
  ['package.json', '.github/workflows/ci.yml']
]) {
  assert.deepEqual(labelsFromInstalledConfig(installedConfig, paths), tagsForPaths(routing, 'minion-meta', paths), `installed labeler config disagrees for ${paths.join(', ')}`);
}

// --- fleet installation state -------------------------------------------------
const fleetRemotes = new Map(readFleetRows().map((row) => [row.id, row.remote]));
for (const row of routing.repositories) assert(fleetRemotes.get(row.id), `${row.id} has no remote in repo-policy.yaml`);
const installedState = Object.fromEntries(routing.repositories.map((row) => [row.id, {
  [LABELER_CONFIG_PATH]: labelerText(routing, row.id),
  [LABELER_WORKFLOW_PATH]: labelerWorkflowText(routing, row.id)
}]));
assert.deepEqual(checkLabelerState(routing, installedState), []);
const missingState = clone(installedState);
missingState['minion_hub'][LABELER_CONFIG_PATH] = null;
assert.match(checkLabelerState(routing, missingState).join('\n'), /minion_hub: \.github\/labeler\.yml is not installed/);
// One repo's config in another repo is not an install — the globs differ per repo.
const swappedState = clone(installedState);
swappedState['minion'][LABELER_CONFIG_PATH] = labelerText(routing, 'minion_hub');
assert.match(checkLabelerState(routing, swappedState).join('\n'), /minion: \.github\/labeler\.yml is missing the generated work-type blocks/);

// A repo that already labels by topic keeps its own entries: the work-type blocks are pasted
// in, and its bigger workflow satisfies the contract without being byte-identical to ours.
// (This is the gateway's real shape — channel labels + an app-token labeler + a size step.)
const coexistingState = clone(installedState);
coexistingState['minion'][LABELER_CONFIG_PATH] = `"channel: discord":\n  - changed-files:\n      - any-glob-to-any-file:\n          - "extensions/discord/**"\n${labelerBlocks(routing, 'minion')}`;
coexistingState['minion'][LABELER_WORKFLOW_PATH] = [
  'name: Labeler', 'on:', '  pull_request_target:', '    types: [opened, synchronize, reopened]',
  '  issues:', '    types: [opened]', 'permissions: {}', 'jobs:', '  label:', '    permissions:',
  '      contents: read', '      pull-requests: write', '    runs-on: ubuntu-latest', '    steps:',
  '      - uses: actions/labeler@8558fd74291d67161a8a78ce36a881fa63b766a9 # v5', '        with:',
  `          configuration-path: ${LABELER_CONFIG_PATH}`, '          sync-labels: true', ''
].join('\n');
assert.deepEqual(checkLabelerState(routing, coexistingState), []);

// The workflow contract: each clause is load-bearing, so each absence is its own finding.
assert.deepEqual(labelerWorkflowGaps(labelerWorkflowText(routing, 'minion-meta')), []);
const gapState = clone(installedState);
gapState['minion_site'][LABELER_WORKFLOW_PATH] = 'name: Labeler\non:\n  push:\n    branches: [main]\n';
assert.match(checkLabelerState(routing, gapState).join('\n'), /minion_site: .*labels nothing — it never runs actions\/labeler/);
assert.match(checkLabelerState(routing, gapState).join('\n'), /labels nothing — it does not trigger on pull requests/);
assert.match(checkLabelerState(routing, gapState).join('\n'), /labels nothing — it lacks pull-requests: write/);
const noConfigPath = clone(installedState);
noConfigPath['minion_plugins'][LABELER_WORKFLOW_PATH] = labelerWorkflowText(routing, 'minion_plugins').replace(`configuration-path: ${LABELER_CONFIG_PATH}`, 'configuration-path: .github/other.yml');
assert.match(checkLabelerState(routing, noConfigPath).join('\n'), /does not point at \.github\/labeler\.yml/);

// --- per-slice tags -----------------------------------------------------------
const specFm = (extra) => ({ id: 'x', title: 'X', stage: 'spec', status: 'approved', created: '2026-08-21', ...extra });
const sliceErrors = (extra, body = '') => validateSliceTags(routing, specFm(extra), body).join('\n');

assert.deepEqual(parseSliceTags(['1:logic+test']).slices, [{ index: 0, number: 1, tags: ['logic', 'test'] }]);
assert.deepEqual(validateSliceTags(routing, specFm({ tags: ['ui', 'logic'], slice_tags: ['1:ui', '2:logic'] }), ''), []);
// security/perf are declared, not derived — but they are legal slice tags.
assert.deepEqual(validateSliceTags(routing, specFm({ tags: ['logic', 'security'], slice_tags: ['1:logic+security'] }), ''), []);

// Missing: the failure the enum gate exists to catch — a routable spec with no slice tags.
assert.match(sliceErrors({ tags: ['logic'] }), /missing slice_tags — specs created on or after 2026-08-21/);
assert.equal(sliceTagsRequired(routing, specFm({})), true);
// Grandfathered and abandoned specs stay exempt so the gate does not rewrite history.
assert.equal(sliceTagsRequired(routing, specFm({ created: '2026-08-17' })), false);
assert.equal(sliceTagsRequired(routing, specFm({ status: 'superseded' })), false);
assert.deepEqual(validateSliceTags(routing, specFm({ created: '2026-01-01', tags: ['logic'] }), ''), []);

// Unknown, legacy, duplicate, out-of-order and malformed slice tags all fail.
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic+wat'] }), /slice_tags\[0\]: unknown tag "wat"/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic+crm'] }), /slice_tags\[0\]: unknown tag "crm"/, 'legacy tags may not tag a slice');
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic+logic'] }), /duplicate tag "logic"/);
assert.match(sliceErrors({ tags: ['ui', 'logic'], slice_tags: ['1:logic+ui'] }), /tags must be in canonical order \(ui\+logic\)/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['logic'] }), /malformed entry "logic"/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: '1:logic' }), /slice_tags: must be a bracketed array/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: [] }), /must list at least one slice/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:'] }), /malformed entry "1:"/);
// Slice numbers are the join key to the spec body — gaps, duplicates and reordering are errors.
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic', '3:logic'] }), /expected 2, got 3/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic', '1:logic'] }), /expected 2, got 1/);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['2:logic', '1:logic'] }), /expected 1, got 2/);
// Declared-vs-declared: the spec's tags must be exactly the union of its slices'.
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic', '2:ui'] }), /tags: missing ui/);
assert.match(sliceErrors({ tags: ['logic', 'data'], slice_tags: ['1:logic'] }), /tags: data is declared on the spec but on no slice/);
assert.match(sliceErrors({ slice_tags: ['1:logic'] }), /tags: missing logic/);
// A legacy spec-level tag is tolerated next to a canonical union (the ledger may only shrink).
assert.deepEqual(validateSliceTags(routing, specFm({ tags: ['logic', 'crm'], slice_tags: ['1:logic'] }), ''), []);

// House-format slice tables are machine-readable: the row count must match the tag list.
const table = '## 5. Slices\n\n| # | Slice | Repos |\n|---|---|---|\n| 1 | A | minion |\n| 2 | B | minion |\n';
assert.equal(sliceTableRowCount(table), 2);
assert.equal(sliceTableRowCount('no table here'), null);
assert.deepEqual(validateSliceTags(routing, specFm({ tags: ['logic'], slice_tags: ['1:logic', '2:logic'] }), table), []);
assert.match(sliceErrors({ tags: ['logic'], slice_tags: ['1:logic'] }, table), /declares 1 slice\(s\) but the slice table lists 2 row\(s\)/);

// The committed corpus obeys all of the above.
assert.deepEqual(checkSliceTags(routing), []);

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
const fixtureDir = mkdtempSync(join(tmpdir(), 'routing-remote-'));
try {
  const current = join(fixtureDir, 'current.json');
  writeFileSync(current, JSON.stringify(Object.fromEntries(routing.repositories.map((row) => [row.id, {
    [LABELER_CONFIG_PATH]: labelerText(routing, row.id),
    [LABELER_WORKFLOW_PATH]: labelerWorkflowText(routing, row.id)
  }]))));
  assert.equal(cli('verify-remote', '--fixture', current).status, 0);
  const absent = join(fixtureDir, 'absent.json');
  writeFileSync(absent, JSON.stringify(Object.fromEntries(routing.repositories.map((row) => [row.id, { [LABELER_CONFIG_PATH]: null, [LABELER_WORKFLOW_PATH]: null }]))));
  const missing = cli('verify-remote', '--fixture', absent);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /is not installed/);
  assert.equal(cli('verify-remote', '--fixture', join(fixtureDir, 'nope.json')).status, 1);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}
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

  // Per-slice tags: the routable unit. A spec written under the taxonomy must carry them,
  // and spec-index.mjs is where that becomes a red gate rather than a convention.
  const sliced = '---\nid: a\ntitle: A\nstage: spec\nstatus: approved\ncreated: 2026-08-21\ntags: [ui, logic]\nslice_tags: [1:logic, 2:ui]\n---\n\nbody\n';
  writeFileSync(join(indexRoot, 'specs/a.md'), sliced);
  assert.equal(runIndex('spec-index.mjs').status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(indexRoot, 'specs/index.json'), 'utf8')).specs[0].slice_tags, ['1:logic', '2:ui'], 'the board/factory route from index.json, so slice tags must ship in it');

  for (const [mutation, expected] of [
    ['slice_tags: [1:logic, 2:wat]', /unknown tag "wat"/],
    ['slice_tags: [1:logic, 3:ui]', /expected 2, got 3/],
    ['slice_tags: [1:logic, 2:logic+ui]', /canonical order/],
    ['slice_tags: logic', /slice_tags: must be a bracketed array/]
  ]) {
    writeFileSync(join(indexRoot, 'specs/a.md'), sliced.replace('slice_tags: [1:logic, 2:ui]', mutation));
    const rejectedSlice = runIndex('spec-index.mjs');
    assert.equal(rejectedSlice.status, 1, `${mutation} was accepted`);
    assert.match(rejectedSlice.stderr, expected);
  }
  // Omitting them entirely is the same failure, not a silent pass.
  writeFileSync(join(indexRoot, 'specs/a.md'), sliced.replace('slice_tags: [1:logic, 2:ui]\n', ''));
  const missingSlices = runIndex('spec-index.mjs');
  assert.equal(missingSlices.status, 1);
  assert.match(missingSlices.stderr, /missing slice_tags/);
  // A spec predating the taxonomy stays valid without them.
  writeFileSync(join(indexRoot, 'specs/a.md'), sliced.replace('slice_tags: [1:logic, 2:ui]\n', '').replace('created: 2026-08-21', 'created: 2026-08-19'));
  assert.equal(runIndex('spec-index.mjs').status, 0);

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
