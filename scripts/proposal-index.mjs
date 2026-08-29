// Regenerates proposals/index.json from proposal frontmatter. Same contract as
// spec-index.mjs: committed output, exits 1 on invalid files.
// Run from repo root: node scripts/proposal-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import { loadTopics, resolveTag } from './topics.mjs';

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
	for (const key of ['id', 'title', 'status', 'created']) {
		if (!fm[key]) errors.push(`${name}: missing required field "${key}"`);
	}
	if (fm.status && !P_STATUSES.includes(fm.status)) errors.push(`${name}: invalid status "${fm.status}"`);
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
	proposals.push({
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
		// effort rides with value: the auto-triage writer emits both, so omitting
		// it here made every mandated regeneration silently drop the triage sizing.
		...(fm.effort ? { effort: fm.effort } : {}),
		...(fm.source ? { source: fm.source } : {})
	});
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
proposals.sort((a, b) => b.id.localeCompare(a.id));
writeFileSync('proposals/index.json', JSON.stringify({ proposals }, null, '\t') + '\n');
console.log(`proposals/index.json written: ${proposals.length} proposals`);
