import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectSpec, checkLinkHygiene } from './spec-index.mjs';

const baseFm = {
	id: 'x',
	title: 'X',
	stage: 'spec',
	status: 'approved',
	created: '2026-08-18'
};

test('projectSpec includes possibly_shipped/evidence/link_review when set', () => {
	const entry = projectSpec({
		...baseFm,
		possibly_shipped: 'https://github.com/example/pr/1',
		evidence: 'https://github.com/example/pr/2',
		link_review: 'ambiguous supersedes link, needs human read'
	});
	assert.equal(entry.possibly_shipped, 'https://github.com/example/pr/1');
	assert.equal(entry.evidence, 'https://github.com/example/pr/2');
	assert.equal(entry.link_review, 'ambiguous supersedes link, needs human read');
});

test('projectSpec omits possibly_shipped/evidence/link_review keys entirely when unset', () => {
	const entry = projectSpec({ ...baseFm });
	assert.equal('possibly_shipped' in entry, false);
	assert.equal('evidence' in entry, false);
	assert.equal('link_review' in entry, false);
});

test('projectSpec never projects reconcile_ignore — no consumer reads it from index.json', () => {
	const entry = projectSpec({ ...baseFm, reconcile_ignore: 'true' });
	assert.equal('reconcile_ignore' in entry, false);
});

test('checkLinkHygiene errors on a dangling supersedes reference', () => {
	const specs = [{ id: 'new-spec', status: 'approved', supersedes: 'does-not-exist' }];
	const { errors } = checkLinkHygiene(specs);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /does-not-exist/);
});

test('checkLinkHygiene warns (non-fatal) when the superseded target is not flagged superseded', () => {
	const specs = [
		{ id: 'new-spec', status: 'approved', supersedes: 'old-spec' },
		{ id: 'old-spec', status: 'approved' }
	];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /old-spec/);
});

test('checkLinkHygiene warns (non-fatal) on an orphaned superseded spec with no successor link', () => {
	const specs = [{ id: 'lone-spec', status: 'superseded' }];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /lone-spec/);
});

test('checkLinkHygiene is clean for a correctly bidirectionally-linked pair', () => {
	const specs = [
		{ id: 'new-spec', status: 'approved', supersedes: 'old-spec' },
		{ id: 'old-spec', status: 'superseded' }
	];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 0);
});

test('checkLinkHygiene warns (non-fatal) on a pass>1 spec with neither revises nor supersedes', () => {
	const specs = [{ id: 'orphan-pass2', status: 'approved', pass: 2 }];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /orphan-pass2/);
	assert.match(warnings[0], /pass 2/);
});

test('checkLinkHygiene is clean for a pass>1 spec that sets revises', () => {
	const specs = [
		{ id: 'pass2-spec', status: 'approved', pass: 2, revises: 'pass1-spec' },
		{ id: 'pass1-spec', status: 'superseded', supersedes: undefined }
	];
	const { warnings } = checkLinkHygiene(specs);
	assert.equal(warnings.filter((w) => w.includes('pass2-spec')).length, 0);
});

test('checkLinkHygiene treats pass 1 (default) as exempt from the lineage check', () => {
	const specs = [{ id: 'first-pass', status: 'draft' }];
	const { warnings } = checkLinkHygiene(specs);
	assert.equal(warnings.length, 0);
});
