// CLI fixture tests for scripts/proposal-index.mjs's --check contract (see its
// header comment). Run with: node --test scripts
//
// Each test builds an isolated proposals/ + scripts/ fixture so it never reads
// or writes the real repo's proposals/index.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mirrors spec-index.test.mjs's FIXTURE_TOPICS — topics.mjs's path classifier
// requires all of these canonical names to be defined regardless of which
// ones a given fixture's frontmatter actually uses.
const FIXTURE_TOPICS = {
	policyVersion: 1,
	sliceTopicValidation: { grandfatheredSpecIds: [] },
	topics: [
		{ name: 'docs', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'test', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'deps', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'logic', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'infra', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'auth', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'data', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'migrations', aliases: ['migration'], riskTier: 'high', autoMergeEligible: false, description: 'x' },
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
	const proposal = `---\nid: fixture\ntitle: Fixture\nstatus: draft\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]\ntags: [logic]\n---\n\n# Fixture\n`;
	writeFileSync(join(root, 'proposals', 'fixture.md'), proposal);
	return root;
}

test('--check passes without writing when the committed index is current', () => {
	const root = makeFixture();
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const before = readFileSync(join(root, 'proposals', 'index.json'), 'utf8');
	const result = spawnSync('node', ['scripts/proposal-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH }
	});
	assert.equal(result.status, 0);
	assert.match(result.stdout, /proposal-index --check passed/);
	assert.equal(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'), before);
});

test('--check fails without writing when the committed index is stale', () => {
	const root = makeFixture();
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const stale = '{"proposals":[]}\n';
	writeFileSync(join(root, 'proposals', 'index.json'), stale);
	const result = spawnSync('node', ['scripts/proposal-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH }
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /proposals\/index\.json is stale/);
	assert.equal(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'), stale);
});

test('--check still fails closed on invalid frontmatter without writing', () => {
	const root = makeFixture();
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const before = readFileSync(join(root, 'proposals', 'index.json'), 'utf8');
	writeFileSync(join(root, 'proposals', 'fixture.md'), '---\nid: fixture\n---\n\n# Fixture\n');
	const result = spawnSync('node', ['scripts/proposal-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH }
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /missing required field/);
	assert.equal(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'), before);
});
