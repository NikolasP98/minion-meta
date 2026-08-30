// Canonical WorkItem contract — spec 2026-08-18-factory-workitem-handoff-schema-spec §2.1.
//
// Every object emitted in `proposals/index.json.proposals` IS a WorkItem: the
// one lifecycle record shared by human intake, factory automation, and (once
// minion-factory's Slice 6 lands) monitor intake. This module is the single
// definition of that shape — `scripts/proposal-index.mjs` enforces it at index
// time, `scripts/proposal-workitem-retrofit.mjs` writes it, and
// `scripts/workitem.test.mjs` pins it.
//
// Pure by contract: no fs, no network, no process, no argv. Anything that
// needs the working tree belongs in a caller, so the rules stay testable as
// data-in/data-out.
import { loadTopics } from './topics.mjs';

// Lifecycle state. Moved here from proposal-index.mjs so status lives beside
// the rest of the WorkItem fields; §2.1 explicitly reuses this enum rather
// than adding a second lifecycle field.
export const P_STATUSES = [
	'draft',      // being shaped in chat
	'review',     // reconciler flagged something (duplicate_candidate etc.)
	'approved',   // human gate 1 passed → eligible for the spec stage
	'in-spec',    // spec pipeline has picked it up
	'done',       // shipped end to end
	'rejected',
	'retired',
	'merged',     // merged into another proposal (see merged_into)
	'closed'
];

// Whether automation may act on this item without human gate 1. Only
// `trusted-automation` can ever satisfy the source/risk half of the factory's
// promoteSweep() auto-approval (minion-factory Slice 5); `human` and
// `untrusted-external` always keep the gate, whatever the tags say.
export const SOURCE_TRUSTS = ['human', 'trusted-automation', 'untrusted-external'];

// Intake risk. `unclassified` is NOT a synonym for low: untagged work has not
// been assessed, and stays gated.
export const RISK_CLASSES = ['high', 'low', 'unclassified'];

// Triage metadata only. §5 keeps dequeue order FIFO — priority does not
// schedule anything, and `value` remains an independent, unrelated field.
export const PRIORITIES = ['critical', 'high', 'medium', 'low'];

// The conservative union minion-factory's automerge.ts already treats as
// high-stakes (§2.1). Both the canonical topic names and their aliases are
// listed so classification never depends on whether the caller resolved tags
// through specs/topics.json first; `highStakesTagDrift()` below pins the two
// lists together, and spec 2026-08-18-factory-topic-capability-manifest-spec
// owns the eventual convergence onto the taxonomy's own riskTier field.
export const HIGH_STAKES_TAGS = [
	'auth',
	'billing',
	'data',
	'infra',
	'migration',
	'migrations',
	'permissions',
	'perms',
	'security'
];

// `owner` is an accountable person/role, not free-form prose (§2.1).
export const OWNER_MAX_LENGTH = 120;
// `source` is a provenance slug. Bounded for the same reason: it becomes part
// of board labels and of monitor-intake filenames.
export const SOURCE_MAX_LENGTH = 120;
// Lowercase slug, optionally path-ish (`orch/crm-pagination-s3-s4` is a real
// historical source) or dotted. No whitespace, no uppercase, no leading dash.
export const SOURCE_PATTERN = /^[a-z0-9][a-z0-9._/-]*$/;

// The six fields §2.1 makes required. Exported so the index projection and its
// coverage test cannot drift apart.
export const WORKITEM_FIELDS = ['source', 'source_trust', 'risk_class', 'priority', 'owner', 'status'];

/**
 * Tag-derived risk (§2.1): no tags → `unclassified`, any high-stakes tag →
 * `high`, otherwise `low`.
 *
 * Deliberately NOT the taxonomy's per-topic `riskTier`: that field tiers a
 * TOPIC (`logic` is `unclassified` there), while this tiers an ITEM — a
 * proposal that carries any tag has been classified, so it is at least `low`.
 *
 * @param {unknown} tags declared `tags:` frontmatter value
 * @returns {'high'|'low'|'unclassified'}
 */
export function classifyRisk(tags) {
	if (!Array.isArray(tags)) return 'unclassified';
	const usable = tags.filter((t) => typeof t === 'string' && t.trim() !== '');
	if (usable.length === 0) return 'unclassified';
	return usable.some((t) => HIGH_STAKES_TAGS.includes(t.trim().toLowerCase())) ? 'high' : 'low';
}

/**
 * Drift guard between HIGH_STAKES_TAGS and specs/topics.json. Returns a list
 * of human-readable differences (empty when the two agree). Impure only in
 * that it reads the memoized topic policy — kept here so the test and any
 * future gate share one implementation.
 *
 * @param {ReturnType<typeof loadTopics>} [topics]
 * @returns {string[]}
 */
export function highStakesTagDrift(topics = loadTopics()) {
	const fromTaxonomy = new Set();
	for (const t of topics.topics) {
		if (t.riskTier !== 'high') continue;
		fromTaxonomy.add(t.name);
		for (const alias of t.aliases) fromTaxonomy.add(alias);
	}
	const declared = new Set(HIGH_STAKES_TAGS);
	const errors = [];
	for (const name of [...fromTaxonomy].sort()) {
		if (!declared.has(name)) errors.push(`specs/topics.json marks "${name}" high-risk but HIGH_STAKES_TAGS omits it`);
	}
	for (const name of [...declared].sort()) {
		if (!fromTaxonomy.has(name)) errors.push(`HIGH_STAKES_TAGS lists "${name}" but specs/topics.json does not mark it high-risk`);
	}
	return errors;
}

function enumError(field, value, allowed) {
	return value === undefined || value === null || value === ''
		? `missing required field "${field}"`
		: `invalid ${field} "${value}" (expected ${allowed.join('|')})`;
}

/**
 * Validate the WorkItem half of a proposal's frontmatter. Returns an array of
 * messages, each naming the offending field; the caller prefixes the filename
 * (spec §3 Slice 4 DoD: "exits non-zero with its filename and field").
 *
 * Never throws and never mutates — an invalid record must produce every
 * applicable message in one pass so a writer fixes them all at once.
 *
 * @param {Record<string, unknown>} fm parsed frontmatter
 * @returns {string[]}
 */
export function validateWorkItem(fm) {
	const errors = [];
	const item = fm ?? {};

	const source = item.source;
	if (typeof source !== 'string' || source === '') {
		errors.push('missing required field "source"');
	} else if (source.length > SOURCE_MAX_LENGTH) {
		errors.push(`invalid source: ${source.length} characters exceeds the ${SOURCE_MAX_LENGTH}-character limit`);
	} else if (!SOURCE_PATTERN.test(source)) {
		errors.push(`invalid source "${source}" (expected a lowercase slug matching ${SOURCE_PATTERN})`);
	}

	if (typeof item.source_trust !== 'string' || !SOURCE_TRUSTS.includes(item.source_trust)) {
		errors.push(enumError('source_trust', item.source_trust, SOURCE_TRUSTS));
	}

	if (typeof item.priority !== 'string' || !PRIORITIES.includes(item.priority)) {
		errors.push(enumError('priority', item.priority, PRIORITIES));
	}

	if (typeof item.status !== 'string' || !P_STATUSES.includes(item.status)) {
		errors.push(enumError('status', item.status, P_STATUSES));
	}

	const owner = item.owner;
	if (typeof owner !== 'string' || owner.trim() === '') {
		errors.push('missing required field "owner"');
	} else if (owner.length > OWNER_MAX_LENGTH) {
		errors.push(`invalid owner: ${owner.length} characters exceeds the ${OWNER_MAX_LENGTH}-character limit`);
	}

	// Tag shape is validated here only as far as risk derivation needs it; the
	// taxonomy lookup (unknown tags) stays with the index generator.
	if (item.tags !== undefined && !Array.isArray(item.tags)) {
		errors.push('invalid tags: must be a list');
	}

	if (typeof item.risk_class !== 'string' || !RISK_CLASSES.includes(item.risk_class)) {
		errors.push(enumError('risk_class', item.risk_class, RISK_CLASSES));
	} else if (item.tags === undefined || Array.isArray(item.tags)) {
		// A declared risk that disagrees with the tags is a mislabel, not a
		// preference: it is exactly how `[infra]` work would be smuggled in as
		// low risk. Derivation wins, the file fails.
		const derived = classifyRisk(item.tags);
		if (item.risk_class !== derived) {
			const shown = Array.isArray(item.tags) && item.tags.length ? item.tags.join(', ') : 'none';
			errors.push(
				`invalid risk_class "${item.risk_class}": tags (${shown}) derive "${derived}" — fix the tags or the risk_class`
			);
		}
	}

	return errors;
}
