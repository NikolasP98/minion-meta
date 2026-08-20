// Canonical topic taxonomy loader + validator for specs/topics.json (spec
// 2026-08-18-factory-topic-capability-manifest, Slice 1 / D1+D2+D9).
//
// specs/topics.json is the single source of truth for the topic vocabulary:
// spec/proposal `tags:` values must resolve through it (spec-index.mjs /
// proposal-index.mjs call resolveTag()), and minion-factory's
// runner/src/topics.ts fetches the SAME file at run-queue time. Its
// `validateTopicPolicy()` is the downstream contract — the schema checks here
// deliberately mirror it (same slug rule, same risk tiers, same supported
// stage/evidence vocabularies, same reserved-topic rule), plus the meta-only
// `sliceTopicValidation` block that the runner drops on purpose.
//
// Pure: no network, reads the working tree only. Run from repo root:
//   node scripts/topics.mjs [--check]
// Both forms validate and never write (there is no generated artifact);
// --check additionally verifies every grandfathered spec id names a real file
// under specs/.
import { existsSync, readFileSync } from 'node:fs';

export const TOPICS_PATH = 'specs/topics.json';

// Mirrors runner/src/topics.ts exactly — an entry here that the runner does
// not support would make the runner reject the whole file at fetch time.
export const RISK_TIERS = ['high', 'low', 'unclassified'];
export const SUPPORTED_STAGES = ['spec', 'develop', 'review'];
export const SUPPORTED_EVIDENCE = ['self-test', 'review-verdict'];
export const UNCLASSIFIED_TOPIC = 'unclassified';

// Every canonical topic minion-factory's changed-path classifiers can emit
// under policyVersion 1 (runner/src/topics.ts CLASSIFIERS_V1). Its
// assertClassifiersCanonical() rejects a policy missing any of these, so meta
// CI must catch that before the file lands, not after the runner fails closed.
export const CLASSIFIER_TOPICS_V1 = [
	'auth',
	'data',
	'deps',
	'docs',
	'infra',
	'migrations',
	'test',
	'ui'
];

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function fail(msg) {
	throw new Error(`invalid ${TOPICS_PATH}: ${msg}`);
}

function stringArray(value, where) {
	if (value === undefined) return [];
	if (!Array.isArray(value)) fail(`${where} must be an array`);
	return value.map((v) => {
		if (typeof v !== 'string' || !v) fail(`${where} must contain non-empty strings`);
		return v;
	});
}

/**
 * Parse + schema-validate a topics document. Throws on anything the runner's
 * validateTopicPolicy() would reject, plus meta-only sliceTopicValidation
 * shape problems. Returns { policyVersion, topics, grandfatheredSpecIds,
 * index } where index maps every name AND alias to its canonical TopicDef.
 */
export function validateTopics(raw) {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('not a JSON object');

	const version = raw.policyVersion;
	if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
		fail('policyVersion must be a positive integer');
	}
	if (!Array.isArray(raw.topics) || raw.topics.length === 0) fail('topics must be a non-empty array');

	// One namespace for names AND aliases (mirrors the runner): `perms` may not
	// be both an alias of `permissions` and a topic of its own.
	const claimed = new Map();
	const topics = [];
	for (const entry of raw.topics) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('every topic must be an object');
		const name = entry.name;
		if (typeof name !== 'string' || !SLUG.test(name)) {
			fail(`topic name ${JSON.stringify(name)} is not a lowercase slug`);
		}
		if (typeof entry.riskTier !== 'string' || !RISK_TIERS.includes(entry.riskTier)) {
			fail(`topic "${name}" riskTier must be one of ${RISK_TIERS.join('|')}`);
		}
		if (typeof entry.autoMergeEligible !== 'boolean') {
			fail(`topic "${name}" autoMergeEligible must be a boolean`);
		}
		if (entry.description !== undefined && typeof entry.description !== 'string') {
			fail(`topic "${name}" description must be a string`);
		}
		const aliases = stringArray(entry.aliases, `topic "${name}" aliases`);
		for (const alias of aliases) {
			if (!SLUG.test(alias)) fail(`topic "${name}" alias ${JSON.stringify(alias)} is not a lowercase slug`);
		}
		for (const slug of [name, ...aliases]) {
			const owner = claimed.get(slug);
			if (owner !== undefined) fail(`"${slug}" is declared twice (topics "${owner}" and "${name}")`);
			claimed.set(slug, name);
		}
		for (const stage of stringArray(entry.requiredStages, `topic "${name}" requiredStages`)) {
			if (!SUPPORTED_STAGES.includes(stage)) fail(`topic "${name}" requires unsupported stage "${stage}"`);
		}
		for (const ev of stringArray(entry.requiredEvidence, `topic "${name}" requiredEvidence`)) {
			if (!SUPPORTED_EVIDENCE.includes(ev)) fail(`topic "${name}" requires unsupported evidence "${ev}"`);
		}
		topics.push({ ...entry, aliases });
	}

	const reserved = topics.find((t) => t.name === UNCLASSIFIED_TOPIC);
	if (!reserved) fail(`the reserved topic "${UNCLASSIFIED_TOPIC}" is missing`);
	if (reserved.riskTier !== 'unclassified' || reserved.autoMergeEligible) {
		fail(
			`the reserved topic "${UNCLASSIFIED_TOPIC}" must be riskTier "unclassified" and autoMergeEligible false`
		);
	}

	// Classifier coverage: the runner refuses a policy that cannot express its
	// own derived topics (assertClassifiersCanonical). Same failure, caught here.
	const canonical = new Set(topics.map((t) => t.name));
	const missing = CLASSIFIER_TOPICS_V1.filter((name) => !canonical.has(name));
	if (missing.length) {
		fail(`path classifier topic(s) not defined as canonical names: ${missing.join(', ')}`);
	}

	// Meta-only block (the runner drops it on purpose — Design decision 6).
	const stv = raw.sliceTopicValidation;
	if (!stv || typeof stv !== 'object' || Array.isArray(stv)) {
		fail('sliceTopicValidation must be an object');
	}
	const ids = stv.grandfatheredSpecIds;
	if (!Array.isArray(ids)) fail('sliceTopicValidation.grandfatheredSpecIds must be an array');
	for (const id of ids) {
		if (typeof id !== 'string' || !id) fail('grandfatheredSpecIds must contain non-empty strings');
	}
	const sorted = [...new Set(ids)].sort();
	if (ids.length !== sorted.length || ids.some((id, i) => id !== sorted[i])) {
		fail('grandfatheredSpecIds must be sorted and duplicate-free');
	}

	const index = new Map();
	for (const t of topics) {
		index.set(t.name, t);
		for (const alias of t.aliases) index.set(alias, t);
	}
	return { policyVersion: version, topics, grandfatheredSpecIds: ids, index };
}

let memo = null;

/** Load + validate specs/topics.json from the working tree (memoized). */
export function loadTopics(path = TOPICS_PATH) {
	if (path === TOPICS_PATH && memo) return memo;
	const parsed = validateTopics(JSON.parse(readFileSync(path, 'utf8')));
	if (path === TOPICS_PATH) memo = parsed;
	return parsed;
}

/**
 * Exact, case-sensitive, alias-aware resolution.
 * Returns { canonical, riskTier } or null for an unknown tag — callers turn
 * null into a build failure, never a guess.
 */
export function resolveTag(tag, topics = loadTopics()) {
	const def = typeof tag === 'string' ? topics.index.get(tag) : undefined;
	return def ? { canonical: def.name, riskTier: def.riskTier } : null;
}

function main() {
	const check = process.argv.includes('--check');
	const topics = loadTopics();
	const errors = [];
	if (check) {
		for (const id of topics.grandfatheredSpecIds) {
			if (!existsSync(`specs/${id}.md`)) {
				errors.push(`${TOPICS_PATH}: grandfathered spec id "${id}" has no specs/${id}.md`);
			}
		}
	}
	if (errors.length) {
		console.error(errors.join('\n'));
		process.exit(1);
	}
	console.log(
		`topics${check ? ' --check' : ''} passed: policyVersion ${topics.policyVersion}, ` +
			`${topics.topics.length} topics, ${topics.grandfatheredSpecIds.length} grandfathered spec ids`
	);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
