// Regenerates proposals/index.json from proposal frontmatter. Same contract as
// spec-index.mjs: committed output, exits 1 on invalid files.
//
// Every entry emitted here is a canonical WorkItem record (spec
// 2026-08-18-factory-workitem-handoff-schema-spec §2.1): source, source trust,
// risk class, priority, owner, and lifecycle status are required, validated,
// and projected for every proposal. Downstream (minion-factory's lifecycle
// promoteSweep/automerge, minion-base's board) reads only this file, so a
// record that cannot be trusted must fail the build here rather than reach
// them half-typed. `scripts/proposal-workitem-retrofit.mjs` fills the fields
// for an existing file; new intake writers must emit them.
// Run from repo root: node scripts/proposal-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import { loadTopics, resolveTag } from './topics.mjs';
import { P_STATUSES, WORKITEM_FIELDS, validateWorkItem } from './workitem.mjs';

// Re-exported for compatibility: P_STATUSES now lives beside the rest of the
// WorkItem contract in workitem.mjs.
export { P_STATUSES };

const proposals = [];
const errors = [];

// The topic taxonomy is itself a gated input, same posture as spec-index.mjs:
// an invalid specs/topics.json fails this build with its own message, and tag
// checks below are skipped (the build is already red — no fail-open).
let topics = null;
try {
	topics = loadTopics();
} catch (e) {
	errors.push(String(e instanceof Error ? e.message : e));
}

for (const name of readdirSync('proposals').filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md').sort()) {
	const parsed = parseFrontmatter(readFileSync(`proposals/${name}`, 'utf8'));
	if (!parsed) {
		errors.push(`${name}: missing frontmatter`);
		continue;
	}
	const { fm } = parsed;
	const errorsBefore = errors.length;
	for (const key of ['id', 'title', 'created']) {
		if (!fm[key]) errors.push(`${name}: missing required field "${key}"`);
	}
	// The six WorkItem fields (status included) are validated as one record so
	// a mislabelled risk_class is reported next to a missing owner.
	for (const message of validateWorkItem(fm)) errors.push(`${name}: ${message}`);
	// Retiring is a justified act, never a silent flip (lifecycle-tools mandate).
	if (fm.status === 'retired' && !(fm.retired_reason && fm.retired_reason.length >= 20))
		errors.push(`${name}: status "retired" requires retired_reason (>=20 chars)`);
	// Tags must resolve through the taxonomy (D2), and the index publishes the
	// CANONICAL name, never the raw string — unknown tags fail the build naming
	// file+tag (same convention as spec-index.mjs).
	if (topics && Array.isArray(fm.tags)) {
		const canonicalTags = [];
		for (const tag of fm.tags) {
			const resolved = resolveTag(tag, topics);
			if (!resolved) errors.push(`${name}: unknown topic "${tag}" (see specs/topics.json)`);
			else if (!canonicalTags.includes(resolved.canonical)) canonicalTags.push(resolved.canonical);
		}
		fm.tags = canonicalTags;
	}
	const entry = {
		id: fm.id,
		title: fm.title,
		status: fm.status,
		created: fm.created,
		updated: fm.updated ?? fm.created,
		repos: fm.repos ?? [],
		...(fm.merged_into ? { merged_into: fm.merged_into } : {}),
		...(fm.possibly_reopens ? { possibly_reopens: fm.possibly_reopens } : {}),
		...(fm.duplicate_candidate ? { duplicate_candidate: fm.duplicate_candidate } : {}),
		...(fm.spawned_spec ? { spawned_spec: fm.spawned_spec } : {}),
		...(fm.tags ? { tags: fm.tags } : {}),
		...(fm.value ? { value: fm.value } : {}),
		source: fm.source,
		source_trust: fm.source_trust,
		risk_class: fm.risk_class,
		priority: fm.priority,
		owner: fm.owner
	};
	// Coverage guard: adding a field to WORKITEM_FIELDS without projecting it
	// would silently ship a partial WorkItem to every consumer. Only meaningful
	// for a record that already validated — otherwise it just echoes the
	// missing-field errors above.
	if (errors.length === errorsBefore) {
		for (const field of WORKITEM_FIELDS) {
			if (entry[field] === undefined) errors.push(`${name}: WorkItem field "${field}" is not projected into the index`);
		}
	}
	proposals.push(entry);
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
proposals.sort((a, b) => b.id.localeCompare(a.id));
writeFileSync('proposals/index.json', JSON.stringify({ proposals }, null, '\t') + '\n');
console.log(`proposals/index.json written: ${proposals.length} proposals`);
