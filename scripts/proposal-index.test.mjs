// CLI fixture tests for scripts/proposal-index.mjs' WorkItem gate (spec
// 2026-08-18-factory-workitem-handoff-schema-spec Slice 4 DoD: "a temporary
// fixture missing each required field or containing a risk/tag mismatch exits
// non-zero with its filename and field").
//
// These shell out on purpose — the DoD is about the exit code and the operator
// -facing message, not about an internal helper's return value. The pure rules
// are covered in workitem.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WORKITEM_FIELDS } from './workitem.mjs';

const COMPLETE = {
	id: 'fixture',
	title: 'Fixture',
	status: 'draft',
	created: '2026-08-18',
	updated: '2026-08-18',
	repos: '[minion-meta]',
	tags: '[logic]',
	source: 'human',
	source_trust: 'human',
	risk_class: 'low',
	priority: 'medium',
	owner: 'human'
};

function frontmatter(fields) {
	const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
	return `---\n${lines.join('\n')}\n---\n\n# Fixture\n`;
}

// A real topics.json keeps the taxonomy behaviour identical to production —
// the tag vocabulary is not what these tests are exercising.
function makeFixture(fields = COMPLETE, name = 'fixture.md') {
	const root = mkdtempSync(join(tmpdir(), 'proposal-index-cli-'));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'specs'));
	mkdirSync(join(root, 'proposals'));
	for (const script of ['proposal-index.mjs', 'spec-frontmatter.mjs', 'topics.mjs', 'workitem.mjs'])
		cpSync(new URL(script, import.meta.url), join(root, 'scripts', script));
	cpSync('specs/topics.json', join(root, 'specs', 'topics.json'));
	writeFileSync(join(root, 'proposals', name), frontmatter(fields));
	return root;
}

function run(root) {
	return spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH } });
}

test('a complete WorkItem indexes cleanly and every field is projected', () => {
	const result = run(makeFixture());
	assert.equal(result.status, 0, result.stderr);
});

test('the generated entry carries the complete WorkItem projection', () => {
	const root = makeFixture();
	assert.equal(run(root).status, 0);
	const { proposals } = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
	assert.equal(proposals.length, 1);
	for (const field of WORKITEM_FIELDS) {
		assert.ok(proposals[0][field] !== undefined, `${field} missing from ${JSON.stringify(proposals[0])}`);
	}
	assert.equal(proposals[0].source_trust, 'human');
	assert.equal(proposals[0].risk_class, 'low');
	assert.equal(proposals[0].priority, 'medium');
	assert.equal(proposals[0].owner, 'human');
});

test('each missing required field exits non-zero naming the file and the field', () => {
	for (const field of WORKITEM_FIELDS) {
		const fields = { ...COMPLETE };
		delete fields[field];
		const result = run(makeFixture(fields, 'missing.md'));
		assert.equal(result.status, 1, `${field} should fail: ${result.stdout}`);
		assert.match(result.stderr, /^missing\.md: /m, field);
		assert.match(result.stderr, new RegExp(`missing\\.md: [^\\n]*"${field}"`), `${field}: ${result.stderr}`);
	}
});

test('a risk/tag mismatch exits non-zero naming the file and the field', () => {
	const result = run(makeFixture({ ...COMPLETE, tags: '[infra]', risk_class: 'low' }, 'mismatch.md'));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /mismatch\.md: invalid risk_class "low"/);
	assert.match(result.stderr, /derive "high"/);
});

test('an out-of-enum value exits non-zero naming the file and the field', () => {
	for (const [field, bad] of [
		['source_trust', 'automation'],
		['priority', 'p1'],
		['status', 'shipped'],
		['source', 'Not A Slug']
	]) {
		const result = run(makeFixture({ ...COMPLETE, [field]: bad }, 'bad.md'));
		assert.equal(result.status, 1, field);
		assert.match(result.stderr, new RegExp(`bad\\.md: invalid ${field}`), `${field}: ${result.stderr}`);
	}
});

test('the committed proposals corpus passes the gate and its index is up to date', () => {
	const before = readFileSync('proposals/index.json', 'utf8');
	const result = spawnSync('node', ['scripts/proposal-index.mjs'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	assert.equal(
		readFileSync('proposals/index.json', 'utf8'),
		before,
		'proposals/index.json is stale — run `node scripts/proposal-index.mjs` and commit the result'
	);
});
