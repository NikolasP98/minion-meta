// Regenerates proposals/index.json from proposal frontmatter. Same contract as
// spec-index.mjs: committed output, exits 1 on invalid files.
// Run from repo root: node scripts/proposal-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter } from './spec-frontmatter.mjs';

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
