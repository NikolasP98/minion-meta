// Focused regression test for the effort-projection fix (see
// proposals/2026-08-29-proposal-index-check-mode-and-effort-projection.md):
// proposal-index.mjs must project a declared `effort` frontmatter field into
// proposals/index.json instead of silently dropping it. Runs the real CLI
// against a throwaway fixture tree, same pattern as spec-index.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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
	for (const name of ['proposal-index.mjs', 'review-sidecar.mjs', 'spec-frontmatter.mjs', 'topics.mjs'])
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

test('effort validation: numeric zero is rejected instead of silently omitted', () => {
	const root = makeCliFixture();
	writeFileSync(
		join(root, 'proposals', 'fixture-invalid-effort.md'),
		`---
id: fixture-invalid-effort
title: Fixture with invalid effort
status: draft
created: 2026-08-29
effort: 0
---

# Invalid effort
`
	);
	const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /fixture-invalid-effort\.md: invalid effort "0"/);
});

test('effort validation: an explicitly blank value is rejected', () => {
	const root = makeCliFixture();
	writeFileSync(
		join(root, 'proposals', 'fixture-blank-effort.md'),
		`---
id: fixture-blank-effort
title: Fixture with blank effort
status: draft
created: 2026-08-29
effort:
---

# Blank effort
`
	);
	const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /fixture-blank-effort\.md: invalid effort ""/);
});

test('value projection: zero survives regeneration and an explicitly blank value is rejected', () => {
	const root = makeCliFixture();
	writeFileSync(
		join(root, 'proposals', 'fixture-zero-value.md'),
		`---
id: fixture-zero-value
title: Fixture with zero value
status: draft
created: 2026-08-29
value: 0
---

# Zero value
`
	);
	execFileSync('node', ['scripts/proposal-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	assert.equal(index.proposals[0].value, 0);

	writeFileSync(
		join(root, 'proposals', 'fixture-blank-value.md'),
		`---
id: fixture-blank-value
title: Fixture with blank value
status: draft
created: 2026-08-29
value:
---

# Blank value
`
	);
	const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stderr, /fixture-blank-value\.md: empty value/);
});
