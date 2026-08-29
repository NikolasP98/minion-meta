// Fixture tests for scripts/proposal-index.mjs's frontmatter validation.
//
// Runs the generator as a subprocess against a throwaway fixture directory
// (mirrors spec-index.test.mjs's makeCliFixture) rather than importing helpers,
// since the validation logic here is inline in the script's top-level run, not
// exported as pure functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Minimal, schema-valid topics.json — proposal-index.mjs loads this
// unconditionally even when no proposal uses `tags`.
const FIXTURE_TOPICS = {
	policyVersion: 1,
	sliceTopicValidation: { grandfatheredSpecIds: [] },
	topics: [
		{ name: 'docs', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'test', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'deps', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'auth', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'data', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'migrations', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'infra', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'ui', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'unclassified', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' }
	]
};

function makeFixture() {
	const root = mkdtempSync(join(tmpdir(), 'proposal-index-cli-'));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'specs'));
	mkdirSync(join(root, 'proposals'));
	for (const name of ['proposal-index.mjs', 'spec-frontmatter.mjs', 'topics.mjs'])
		cpSync(new URL(name, import.meta.url), join(root, 'scripts', name));
	writeFileSync(join(root, 'specs', 'topics.json'), JSON.stringify(FIXTURE_TOPICS, null, '\t') + '\n');
	return root;
}

const proposalSource = (effortLine) =>
	`---\nid: fixture\ntitle: Fixture\nstatus: draft\ncreated: 2026-08-29\n${effortLine}---\n\nbody\n`;

function writeProposal(root, effortLine) {
	writeFileSync(join(root, 'proposals', 'fixture.md'), proposalSource(effortLine));
}

const runGenerate = (root) =>
	spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });

test('L1: effort numeric zero is rejected, not silently dropped', () => {
	const root = makeFixture();
	writeProposal(root, 'effort: 0\n');
	const result = runGenerate(root);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /fixture\.md: invalid effort "0"/);
});

test('L1: an explicitly blank effort value is rejected', () => {
	const root = makeFixture();
	writeProposal(root, 'effort:\n');
	const result = runGenerate(root);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /fixture\.md: invalid effort ""/);
});

test('L1 control: a valid S/M/L effort is accepted and projected', () => {
	const root = makeFixture();
	writeProposal(root, 'effort: M\n');
	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	assert.equal(index.proposals.find((p) => p.id === 'fixture').effort, 'M');
});

test('L1 control: an absent effort is accepted and omitted from the projection', () => {
	const root = makeFixture();
	writeProposal(root, '');
	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	assert.equal(Object.hasOwn(index.proposals.find((p) => p.id === 'fixture'), 'effort'), false);
});
