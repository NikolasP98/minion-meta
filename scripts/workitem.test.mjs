// Unit tests for the canonical WorkItem contract (spec
// 2026-08-18-factory-workitem-handoff-schema-spec §2.1 / Slice 4).
// Run with: node --test scripts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	P_STATUSES,
	SOURCE_TRUSTS,
	RISK_CLASSES,
	PRIORITIES,
	HIGH_STAKES_TAGS,
	WORKITEM_FIELDS,
	OWNER_MAX_LENGTH,
	SOURCE_MAX_LENGTH,
	classifyRisk,
	highStakesTagDrift,
	validateWorkItem
} from './workitem.mjs';
import { resolveProvenance, plan } from './proposal-workitem-retrofit.mjs';

// A complete, valid record — every negative fixture below is a mutation of it.
function validItem(overrides = {}) {
	return {
		id: '2026-08-18-example',
		title: 'Example',
		status: 'draft',
		created: '2026-08-18',
		tags: ['logic'],
		source: 'ci-watch',
		source_trust: 'trusted-automation',
		risk_class: 'low',
		priority: 'medium',
		owner: 'factory',
		...overrides
	};
}

test('a complete valid record produces no errors', () => {
	assert.deepEqual(validateWorkItem(validItem()), []);
});

test('the enums are exactly the vocabularies the spec fixes', () => {
	assert.deepEqual(SOURCE_TRUSTS, ['human', 'trusted-automation', 'untrusted-external']);
	assert.deepEqual(RISK_CLASSES, ['high', 'low', 'unclassified']);
	assert.deepEqual(PRIORITIES, ['critical', 'high', 'medium', 'low']);
	assert.deepEqual(WORKITEM_FIELDS, ['source', 'source_trust', 'risk_class', 'priority', 'owner', 'status']);
});

test('every source_trust / priority / status value validates, and near-misses do not', () => {
	for (const trust of SOURCE_TRUSTS) {
		assert.deepEqual(validateWorkItem(validItem({ source_trust: trust })), [], trust);
	}
	for (const priority of PRIORITIES) {
		assert.deepEqual(validateWorkItem(validItem({ priority })), [], priority);
	}
	for (const status of P_STATUSES) {
		const item = validItem({ status, ...(status === 'retired' ? {} : {}) });
		assert.deepEqual(validateWorkItem(item), [], status);
	}
	for (const bad of ['automation', 'Human', 'trusted_automation', '']) {
		const errors = validateWorkItem(validItem({ source_trust: bad }));
		assert.equal(errors.length, 1, bad);
		assert.match(errors[0], /source_trust/);
	}
	assert.match(validateWorkItem(validItem({ priority: 'p1' }))[0], /invalid priority "p1"/);
	assert.match(validateWorkItem(validItem({ status: 'shipped' }))[0], /invalid status "shipped"/);
});

test('each missing required field is reported by name, all in one pass', () => {
	for (const field of WORKITEM_FIELDS) {
		const item = validItem();
		delete item[field];
		const errors = validateWorkItem(item);
		assert.ok(
			errors.some((e) => e.includes(`"${field}"`)),
			`${field}: ${JSON.stringify(errors)}`
		);
	}
	const empty = validateWorkItem({});
	for (const field of WORKITEM_FIELDS) {
		assert.ok(empty.some((e) => e.includes(`"${field}"`)), `${field} missing from ${JSON.stringify(empty)}`);
	}
});

test('untagged work is unclassified, never low', () => {
	assert.equal(classifyRisk(undefined), 'unclassified');
	assert.equal(classifyRisk([]), 'unclassified');
	assert.equal(classifyRisk(['']), 'unclassified');
	assert.deepEqual(validateWorkItem(validItem({ tags: undefined, risk_class: 'unclassified' })), []);
	assert.match(
		validateWorkItem(validItem({ tags: undefined, risk_class: 'low' }))[0],
		/derive "unclassified"/
	);
});

test('every high-stakes tag and alias derives high risk', () => {
	for (const tag of HIGH_STAKES_TAGS) {
		assert.equal(classifyRisk([tag]), 'high', tag);
		assert.equal(classifyRisk(['logic', tag]), 'high', `logic+${tag}`);
		assert.equal(classifyRisk([tag.toUpperCase()]), 'high', `case-insensitive ${tag}`);
	}
	// Canonical name and alias must agree — proposal-index.mjs canonicalizes
	// tags before projection, so a rule that only knew one of the pair would
	// change a record's risk depending on which spelling the author used.
	assert.equal(classifyRisk(['perms']), classifyRisk(['permissions']));
	assert.equal(classifyRisk(['migration']), classifyRisk(['migrations']));
});

test('non-high-stakes tags derive low risk', () => {
	for (const tag of ['logic', 'ui', 'docs', 'test', 'deps', 'crm', 'board']) {
		assert.equal(classifyRisk([tag]), 'low', tag);
	}
});

test('HIGH_STAKES_TAGS does not drift from specs/topics.json riskTier: high', () => {
	assert.deepEqual(highStakesTagDrift(), []);
});

test('a declared risk_class that disagrees with the tags is rejected', () => {
	const errors = validateWorkItem(validItem({ tags: ['infra'], risk_class: 'low' }));
	assert.equal(errors.length, 1);
	assert.match(errors[0], /invalid risk_class "low"/);
	assert.match(errors[0], /tags \(infra\)/);
	assert.match(errors[0], /derive "high"/);
	// …and the honest label passes.
	assert.deepEqual(validateWorkItem(validItem({ tags: ['infra'], risk_class: 'high' })), []);
	// Over-labelling is rejected too: risk is derived, not chosen.
	assert.match(validateWorkItem(validItem({ tags: ['logic'], risk_class: 'high' }))[0], /derive "low"/);
});

test('source must be a bounded lowercase slug', () => {
	for (const good of ['human', 'ci-watch', 'audit-2026-08-17', 'orch/crm-pagination-s3-s4', 'monitor.v2']) {
		assert.deepEqual(validateWorkItem(validItem({ source: good })), [], good);
	}
	for (const bad of ['Human', 'ci watch', '-leading-dash', 'shell$(x)']) {
		assert.match(validateWorkItem(validItem({ source: bad }))[0], /invalid source/, bad);
	}
	assert.match(
		validateWorkItem(validItem({ source: 'a'.repeat(SOURCE_MAX_LENGTH + 1) }))[0],
		/exceeds the 120-character limit/
	);
});

test('owner must be non-empty and bounded', () => {
	assert.match(validateWorkItem(validItem({ owner: '   ' }))[0], /missing required field "owner"/);
	assert.match(
		validateWorkItem(validItem({ owner: 'x'.repeat(OWNER_MAX_LENGTH + 1) }))[0],
		/exceeds the 120-character limit/
	);
	assert.deepEqual(validateWorkItem(validItem({ owner: 'x'.repeat(OWNER_MAX_LENGTH) })), []);
});

test('validateWorkItem never mutates its input', () => {
	const item = validItem({ tags: ['infra'], risk_class: 'low' });
	const before = JSON.stringify(item);
	validateWorkItem(item);
	assert.equal(JSON.stringify(item), before);
});

// ---- retrofit provenance rules -------------------------------------------

test('retrofit provenance is explicit: known families resolve, unknown ones do not', () => {
	assert.deepEqual(resolveProvenance('ci-minion-meta-ci', undefined), {
		source: 'ci-watch',
		source_trust: 'trusted-automation',
		owner: 'factory',
		why: 'filed by the factory CI watch'
	});
	assert.equal(resolveProvenance('2026-08-13-crm-customers-fast-list', undefined).source_trust, 'human');
	assert.equal(resolveProvenance('handoff-minion-hub-1323254565', undefined).source, 'handoff-sweep');
	assert.equal(resolveProvenance('x', 'debt-sweep-2026-08-17').source_trust, 'trusted-automation');
	assert.equal(resolveProvenance('x', 'ux-plan-2026-08-18').owner, 'human');
	// The declared source is preserved verbatim — only trust/owner are derived.
	assert.equal(resolveProvenance('x', 'audit-2026-08-17').source, 'audit-2026-08-17');
	// No catch-all.
	assert.equal(resolveProvenance('x', 'some-new-robot'), null);
	assert.equal(resolveProvenance('untitled', undefined), null);
});

test('retrofit fails and names the file rather than guessing', () => {
	const unknownSource = plan('2026-08-18-thing', { source: 'some-new-robot', status: 'draft' });
	assert.match(unknownSource.error, /2026-08-18-thing\.md/);
	assert.match(unknownSource.error, /some-new-robot/);
	assert.match(unknownSource.error, /never guess/);
	const unknownFile = plan('untitled', { status: 'draft' });
	assert.match(unknownFile.error, /untitled\.md/);
	assert.match(unknownFile.error, /SOURCELESS_RULES/);
});

test('retrofit derives risk from tags, defaults priority, and is idempotent', () => {
	assert.deepEqual(plan('2026-08-18-thing', { status: 'draft', tags: ['infra'] }).lines, [
		'source: human',
		'source_trust: human',
		'risk_class: high',
		'priority: medium',
		'owner: human'
	]);
	// value is untouched, and an already-complete record plans no change.
	const complete = { ...validItem(), value: 7 };
	assert.deepEqual(plan('2026-08-18-thing', complete).lines, []);
	// Only the missing keys are added; an existing priority is respected.
	assert.deepEqual(plan('ci-x', { status: 'draft', priority: 'critical' }).lines, [
		'source: ci-watch',
		'source_trust: trusted-automation',
		'risk_class: unclassified',
		'owner: factory'
	]);
});

test('the retrofitted corpus itself is complete and self-consistent', async () => {
	const { readdirSync, readFileSync } = await import('node:fs');
	const { parseFrontmatter } = await import('./spec-frontmatter.mjs');
	const names = readdirSync('proposals').filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md');
	assert.ok(names.length > 100, 'expected the real proposals corpus');
	for (const name of names) {
		const { fm } = parseFrontmatter(readFileSync(`proposals/${name}`, 'utf8'));
		assert.deepEqual(validateWorkItem(fm), [], name);
	}
});
