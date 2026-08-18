import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repositoryIndex = new URL('../specs/index.json', import.meta.url);
const indexer = new URL('./spec-index.mjs', import.meta.url);
const parser = new URL('./spec-frontmatter.mjs', import.meta.url);

test('projects populated G0 fields and omits absent or empty fields', (t) => {
	const repositoryIndexBefore = readFileSync(repositoryIndex, 'utf8');
	const root = mkdtempSync(join(tmpdir(), 'minion-spec-index-'));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'specs'));
	copyFileSync(indexer, join(root, 'scripts/spec-index.mjs'));
	copyFileSync(parser, join(root, 'scripts/spec-frontmatter.mjs'));

	writeFileSync(
		join(root, 'specs/_tmp-possibly-shipped-present.md'),
		`---
id: _tmp-possibly-shipped-present
title: Present reconciliation metadata
stage: dev
status: approved
created: 2026-08-18
repos: [minion-meta]
verdict: approved
possibly_shipped: medium-confidence
evidence: PR 13 merged and deployed
link_review: confirm spec-to-PR link
---
`
	);
	writeFileSync(
		join(root, 'specs/_tmp-possibly-shipped-absent.md'),
		`---
id: _tmp-possibly-shipped-absent
title: Absent reconciliation metadata
stage: spec
status: approved
created: 2026-08-18
repos: [minion-meta]
possibly_shipped:
evidence: ""
---
`
	);

	const result = spawnSync(process.execPath, ['scripts/spec-index.mjs'], {
		cwd: root,
		encoding: 'utf8'
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);

	const { specs } = JSON.parse(readFileSync(join(root, 'specs/index.json'), 'utf8'));
	const byId = new Map(specs.map((spec) => [spec.id, spec]));
	assert.deepEqual(byId.get('_tmp-possibly-shipped-present'), {
		id: '_tmp-possibly-shipped-present',
		title: 'Present reconciliation metadata',
		stage: 'dev',
		status: 'approved',
		pass: 1,
		created: '2026-08-18',
		updated: '2026-08-18',
		repos: ['minion-meta'],
		verdict: 'approved',
		possibly_shipped: 'medium-confidence',
		evidence: 'PR 13 merged and deployed',
		link_review: 'confirm spec-to-PR link'
	});
	const absent = byId.get('_tmp-possibly-shipped-absent');
	for (const key of ['possibly_shipped', 'evidence', 'link_review']) {
		assert.equal(Object.hasOwn(absent, key), false, `${key} should be omitted`);
	}
	assert.equal(readFileSync(repositoryIndex, 'utf8'), repositoryIndexBefore);
});
