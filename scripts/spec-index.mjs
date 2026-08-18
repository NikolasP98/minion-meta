// Regenerates specs/index.json from spec frontmatter. Committed output — the
// minion-base dashboard fetches this ONE file instead of parsing 100+ specs.
// Doubles as the lint gate: exits 1 if any spec lacks frontmatter or uses an
// invalid stage/status. Run from repo root: node scripts/spec-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter, STAGES, STATUSES } from './spec-frontmatter.mjs';

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
		...(fm.possibly_shipped ? { possibly_shipped: fm.possibly_shipped } : {}),
		...(fm.evidence ? { evidence: fm.evidence } : {}),
		...(fm.link_review ? { link_review: fm.link_review } : {})
	});
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}

specs.sort((a, b) => b.id.localeCompare(a.id));
writeFileSync('specs/index.json', JSON.stringify({ generated: null, specs }, null, '\t') + '\n');
console.log(`specs/index.json written: ${specs.length} specs`);
