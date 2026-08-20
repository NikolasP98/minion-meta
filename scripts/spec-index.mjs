// Regenerates specs/index.json from spec frontmatter. Committed output — the
// minion-base dashboard fetches this ONE file instead of parsing 100+ specs.
// Doubles as the lint gate: exits 1 if any spec lacks frontmatter or uses an
// invalid stage/status. Run from repo root: node scripts/spec-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter, STAGES, STATUSES } from './spec-frontmatter.mjs';
import { allowedTags, canonicalTags, readRouting } from './routing.mjs';

// routing.yml is the tag enum's single source of truth (node scripts/routing.mjs validate).
const routing = readRouting();
const legalTags = allowedTags(routing);

const specs = [];
const errors = [];
for (const name of readdirSync('specs')
	.filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md' && !f.endsWith('.review.md'))
	.sort()) {
	const parsed = parseFrontmatter(readFileSync(`specs/${name}`, 'utf8'));
	if (!parsed) {
		errors.push(`${name}: missing frontmatter (run scripts/spec-retrofit.mjs or add by hand)`);
		continue;
	}
	const { fm } = parsed;
	for (const key of ['id', 'title', 'stage', 'status', 'created']) {
		if (!fm[key]) errors.push(`${name}: missing required field "${key}"`);
	}
	if (fm.stage && !STAGES.includes(fm.stage)) errors.push(`${name}: invalid stage "${fm.stage}"`);
	if (fm.status && !STATUSES.includes(fm.status))
		errors.push(`${name}: invalid status "${fm.status}"`);
	// Retiring is a justified act, never a silent flip (lifecycle-tools mandate).
	if (fm.status === 'retired' && !(fm.retired_reason && fm.retired_reason.length >= 20))
		errors.push(`${name}: status "retired" requires retired_reason (>=20 chars)`);
	// TODO(handoff): only the spec-level tag list is validated; §4b of the phase-gates spec puts
	// tags per SLICE (the routable unit), which lives in the body table and is unparsed.
	// Tracked in proposals/2026-08-20-tag-routing-fleet-rollout.md.
	// Work-type tags route the dev loop and the gates — an unknown tag is an unroutable card.
	if (fm.tags !== undefined && !Array.isArray(fm.tags))
		errors.push(`${name}: tags must be a bracketed array (e.g. tags: [logic, test])`);
	else
		for (const tag of fm.tags ?? [])
			if (!legalTags.has(tag))
				errors.push(`${name}: unknown tag "${tag}" — use one of ${canonicalTags(routing).join(', ')}`);
	specs.push({
		id: fm.id,
		title: fm.title,
		stage: fm.stage,
		status: fm.status,
		pass: fm.pass ?? 1,
		created: fm.created,
		updated: fm.updated ?? fm.created,
		repos: fm.repos ?? [],
		...(fm.revises ? { revises: fm.revises } : {}),
		...(fm.supersedes ? { supersedes: fm.supersedes } : {}),
		...(fm.proposal ? { proposal: fm.proposal } : {}),
		...(fm.verdict ? { verdict: fm.verdict } : {}),
		...(fm.pr ? { pr: fm.pr } : {}),
		...(fm.type ? { type: fm.type } : {}),
		...(fm.tags ? { tags: fm.tags } : {}),
		...(fm.merge_sha ? { merge_sha: fm.merge_sha } : {}),
		...(fm.merged_pr ? { merged_pr: fm.merged_pr } : {}),
		...(fm.merged_at ? { merged_at: fm.merged_at } : {}),
		...(fm.release_flag ? { release_flag: fm.release_flag } : {}),
		...(fm.release_state ? { release_state: fm.release_state } : {}),
		...(fm.evidence ? { evidence: fm.evidence } : {})
	});
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}

specs.sort((a, b) => b.id.localeCompare(a.id));
writeFileSync('specs/index.json', JSON.stringify({ generated: null, specs }, null, '\t') + '\n');
console.log(`specs/index.json written: ${specs.length} specs`);
