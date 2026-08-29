// CLI fixture tests for proposal-index.mjs, mirroring the pattern in
// scripts/spec-index.test.mjs: proposal-index.mjs runs its logic at module
// scope (no exported pure functions to call directly), so these spawn it as a
// subprocess against a throwaway fixture directory.
//
// Added for the "effort" field regression: proposal-index.mjs validated every
// other optional frontmatter field but never projected `effort` into
// proposals/index.json, so a routine regeneration silently dropped an
// existing proposal's board estimate. See
// proposals/2026-08-29-hub-pos-bookings-stock-gate-drift.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIXTURE_TOPICS = {
	policyVersion: 1,
	sliceTopicValidation: { grandfatheredSpecIds: [] },
	topics: [
		{ name: 'logic', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'infra', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'auth', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'data', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'migrations', aliases: ['migration'], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'deps', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'docs', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'test', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'ui', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'unclassified', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' }
	]
};

function makeFixture() {
	const root = mkdtempSync(join(tmpdir(), 'proposal-index-cli-'));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'proposals'));
	mkdirSync(join(root, 'specs'));
	for (const name of ['proposal-index.mjs', 'spec-frontmatter.mjs', 'topics.mjs'])
		cpSync(new URL(name, import.meta.url), join(root, 'scripts', name));
	writeFileSync(join(root, 'specs', 'topics.json'), JSON.stringify(FIXTURE_TOPICS, null, '\t') + '\n');
	return root;
}

function writeProposal(root, name, frontmatterLines) {
	const fm = ['---', ...frontmatterLines, '---', '', `# ${name}`, ''].join('\n');
	writeFileSync(join(root, 'proposals', `${name}.md`), fm);
}

test('effort: an unknown value fails the build, naming the file and value', () => {
	const root = makeFixture();
	writeProposal(root, 'bad-effort', [
		'id: bad-effort',
		'title: Bad effort',
		'status: draft',
		'created: 2026-08-29',
		'effort: XL'
	]);
	const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /bad-effort\.md: invalid effort "XL"/);
});

test('effort: a valid value survives regeneration alongside other optional fields', () => {
	const root = makeFixture();
	writeProposal(root, 'has-effort', [
		'id: has-effort',
		'title: Has effort',
		'status: approved',
		'created: 2026-08-29',
		'updated: 2026-08-29',
		'repos: [minion_hub]',
		'tags: [logic]',
		'value: 3',
		'effort: S'
	]);
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	const entry = index.proposals.find((p) => p.id === 'has-effort');
	assert.ok(entry, 'entry should exist');
	assert.equal(entry.effort, 'S');
	assert.equal(entry.value, 3);
	assert.deepEqual(entry.tags, ['logic']);
});

test('effort: regenerating an untouched proposal a second time does not drop its effort', () => {
	const root = makeFixture();
	writeProposal(root, 'stable', [
		'id: stable',
		'title: Stable',
		'status: approved',
		'created: 2026-08-29',
		'effort: M'
	]);
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	writeProposal(root, 'unrelated', [
		'id: unrelated',
		'title: Unrelated new proposal',
		'status: draft',
		'created: 2026-08-29'
	]);
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	const entry = index.proposals.find((p) => p.id === 'stable');
	assert.equal(entry.effort, 'M');
});
