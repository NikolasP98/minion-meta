// Unit tests for scripts/topics.mjs (spec 2026-08-18-factory-topic-capability-manifest,
// Slice 1 / D1+D9). Run with: node --test scripts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateTopics, resolveTag, loadTopics, CLASSIFIER_TOPICS_V1 } from './topics.mjs';

// A minimal valid document — every negative fixture below is a mutation of this.
function validDoc() {
	return {
		policyVersion: 1,
		sliceTopicValidation: { grandfatheredSpecIds: ['a-spec', 'b-spec'] },
		topics: [
			{ name: 'docs', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
			{ name: 'test', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
			{ name: 'deps', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
			{ name: 'auth', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
			{ name: 'data', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
			{
				name: 'infra',
				aliases: [],
				riskTier: 'high',
				autoMergeEligible: false,
				requiredEvidence: ['self-test'],
				description: 'x'
			},
			{
				name: 'migrations',
				aliases: ['migration'],
				riskTier: 'high',
				autoMergeEligible: false,
				description: 'x'
			},
			{
				name: 'ui',
				aliases: [],
				riskTier: 'unclassified',
				autoMergeEligible: false,
				requiredEvidence: ['self-test'],
				description: 'x'
			},
			{ name: 'unclassified', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' }
		]
	};
}

test('validateTopics: a well-formed document round-trips', () => {
	const parsed = validateTopics(validDoc());
	assert.equal(parsed.policyVersion, 1);
	assert.deepEqual(parsed.grandfatheredSpecIds, ['a-spec', 'b-spec']);
	assert.equal(parsed.index.get('docs').name, 'docs');
});

test('validateTopics: alias resolves to its canonical owner in the index', () => {
	const parsed = validateTopics(validDoc());
	assert.equal(parsed.index.get('migration').name, 'migrations');
});

test('validateTopics: a name/alias claimed twice is rejected', () => {
	const doc = validDoc();
	doc.topics.push({ name: 'permissions', aliases: ['docs'], riskTier: 'high', autoMergeEligible: false });
	assert.throws(() => validateTopics(doc), /"docs" is declared twice/);
});

test('validateTopics: a non-slug topic name is rejected', () => {
	const doc = validDoc();
	doc.topics[0].name = 'Docs Bad';
	assert.throws(() => validateTopics(doc), /not a lowercase slug/);
});

test('validateTopics: an invalid riskTier is rejected', () => {
	const doc = validDoc();
	doc.topics[0].riskTier = 'medium';
	assert.throws(() => validateTopics(doc), /riskTier must be one of/);
});

test('validateTopics: an unsupported requiredStages value is rejected', () => {
	const doc = validDoc();
	doc.topics[0].requiredStages = ['nope'];
	assert.throws(() => validateTopics(doc), /unsupported stage "nope"/);
});

test('validateTopics: an unsupported requiredEvidence value is rejected', () => {
	const doc = validDoc();
	doc.topics[0].requiredEvidence = ['nope'];
	assert.throws(() => validateTopics(doc), /unsupported evidence "nope"/);
});

test('validateTopics: a missing reserved "unclassified" topic is rejected', () => {
	const doc = validDoc();
	doc.topics = doc.topics.filter((t) => t.name !== 'unclassified');
	assert.throws(() => validateTopics(doc), /reserved topic "unclassified" is missing/);
});

test('validateTopics: a reserved "unclassified" that is autoMergeEligible is rejected', () => {
	const doc = validDoc();
	doc.topics.find((t) => t.name === 'unclassified').autoMergeEligible = true;
	assert.throws(() => validateTopics(doc), /must be riskTier "unclassified" and autoMergeEligible false/);
});

test('validateTopics: a policy missing a classifier topic (D4 dependency) is rejected', () => {
	const doc = validDoc();
	doc.topics = doc.topics.filter((t) => t.name !== 'auth');
	assert.throws(() => validateTopics(doc), /path classifier topic\(s\) not defined as canonical names: auth/);
});

test('validateTopics: every CLASSIFIER_TOPICS_V1 entry is a canonical slug (contract sanity)', () => {
	for (const name of CLASSIFIER_TOPICS_V1) assert.match(name, /^[a-z0-9][a-z0-9-]*$/);
});

test('validateTopics: unsorted grandfatheredSpecIds are rejected', () => {
	const doc = validDoc();
	doc.sliceTopicValidation.grandfatheredSpecIds = ['b-spec', 'a-spec'];
	assert.throws(() => validateTopics(doc), /sorted and duplicate-free/);
});

test('validateTopics: duplicate grandfatheredSpecIds are rejected', () => {
	const doc = validDoc();
	doc.sliceTopicValidation.grandfatheredSpecIds = ['a-spec', 'a-spec'];
	assert.throws(() => validateTopics(doc), /sorted and duplicate-free/);
});

test('validateTopics: a non-object document is rejected', () => {
	assert.throws(() => validateTopics(null), /not a JSON object/);
	assert.throws(() => validateTopics([]), /not a JSON object/);
});

test('validateTopics: an empty topics array is rejected', () => {
	const doc = validDoc();
	doc.topics = [];
	assert.throws(() => validateTopics(doc), /topics must be a non-empty array/);
});

test('resolveTag: an unknown tag returns null, never a guess', () => {
	const topics = validateTopics(validDoc());
	assert.equal(resolveTag('nonsense', topics), null);
});

test('resolveTag: resolution is case-sensitive', () => {
	const topics = validateTopics(validDoc());
	assert.equal(resolveTag('Docs', topics), null);
	assert.deepEqual(resolveTag('docs', topics), { canonical: 'docs', riskTier: 'low' });
});

// The real committed specs/topics.json is the single source of truth this
// repo's index generators and minion-factory's runner both consume — it must
// itself pass the same schema this module enforces (D1).
test('loadTopics: the committed specs/topics.json is schema-valid', () => {
	const topics = loadTopics();
	assert.ok(topics.policyVersion >= 1);
	assert.ok(topics.topics.length > 0);
});

// The fifteen tags in use across the corpus at spec-writing time (§3 of the
// spec) plus risk.ts's high-stakes aliases must all resolve (D1 backward
// compatibility — Design decision 2).
test('loadTopics: the current tag corpus resolves through the committed taxonomy', () => {
	const topics = loadTopics();
	const corpus = [
		'board',
		'data',
		'deps',
		'docs',
		'duplication',
		'edge-case',
		'hardcoded',
		'infra',
		'logic',
		'security',
		'test',
		'todo',
		'ui',
		'unwired',
		'ux',
		'auth',
		'perms',
		'permissions',
		'migration',
		'migrations',
		'billing'
	];
	for (const tag of corpus) assert.ok(resolveTag(tag, topics), `"${tag}" should resolve`);
});

test('CLI: node scripts/topics.mjs --check passes against the committed file', () => {
	const result = spawnSync('node', ['scripts/topics.mjs', '--check'], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
});
