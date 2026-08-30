// Focused regression test for the effort-projection fix (see
// proposals/2026-08-29-proposal-index-check-mode-and-effort-projection.md):
// proposal-index.mjs must project a declared `effort` frontmatter field into
// proposals/index.json instead of silently dropping it. Runs the real CLI
// against a throwaway fixture tree, same pattern as spec-index.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mirrors spec-index.test.mjs's FIXTURE_TOPICS: minimal, schema-valid
// topics.json satisfying D1's classifier-coverage rule (every
// CLASSIFIER_TOPICS_V1 entry) plus the reserved "unclassified" topic.
const FIXTURE_TOPICS = {
	policyVersion: 1,
	sliceTopicValidation: { grandfatheredSpecIds: [] },
	topics: [
		{ name: 'docs', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'test', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'deps', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'infra', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'auth', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'data', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'migrations', aliases: ['migration'], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'ui', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'unclassified', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' }
	]
};

function makeCliFixture() {
	const root = mkdtempSync(join(tmpdir(), 'proposal-index-cli-'));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'specs'));
	mkdirSync(join(root, 'proposals'));
	for (const name of ['proposal-index.mjs', 'spec-frontmatter.mjs', 'topics.mjs'])
		execFileSync('cp', [new URL(name, import.meta.url).pathname, join(root, 'scripts', name)]);
	writeFileSync(join(root, 'specs', 'topics.json'), JSON.stringify(FIXTURE_TOPICS, null, '\t') + '\n');
	return root;
}

test('effort projection: a declared effort frontmatter field is projected into index.json', () => {
	const root = makeCliFixture();
	const proposal = `---
id: fixture-with-effort
title: Fixture with effort
status: approved
created: 2026-08-29
repos: [minion-meta]
effort: S
---

# Fixture with effort
`;
	writeFileSync(join(root, 'proposals', 'fixture-with-effort.md'), proposal);
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	assert.equal(index.proposals.length, 1);
	assert.equal(index.proposals[0].effort, 'S');
});

test('effort projection: a proposal without effort has no effort key in its projection', () => {
	const root = makeCliFixture();
	const proposal = `---
id: fixture-without-effort
title: Fixture without effort
status: approved
created: 2026-08-29
repos: [minion-meta]
---

# Fixture without effort
`;
	writeFileSync(join(root, 'proposals', 'fixture-without-effort.md'), proposal);
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	assert.equal(index.proposals.length, 1);
	assert.equal('effort' in index.proposals[0], false);
});
