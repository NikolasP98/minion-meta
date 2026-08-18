// Regenerates specs/index.json from spec frontmatter. Committed output — the
// minion-base dashboard fetches this ONE file instead of parsing 100+ specs.
// Doubles as the lint gate: exits 1 if any spec lacks frontmatter or uses an
// invalid stage/status.
//
// --check runs the full hardening gate (meta CI, see .github/workflows/ci.yml
// and specs/2026-08-17-maintenance-lane-monitors-spec.md §2): date formats,
// repo ids, revises/supersedes link integrity (bidirectional — every
// status:superseded spec needs an incoming supersedes link, not just the
// forward direction), required-heading lint, and a staleness check that
// specs/index.json matches what's on disk. It never writes — CI should stay
// read-only.
//
// Heading lint is grandfathered by CONTENT, not just id: entries in
// scripts/spec-heading-lint-baseline.json are `id -> sha256(body)`. A spec
// stays exempt only while its body matches the recorded hash — editing a
// baselined spec's body silently drops the exemption and the heading checks
// apply, per specs/TEMPLATE.md's "every new or hand-edited spec must comply."
//
// Reverse-supersedes exceptions (superseded specs with no known successor in
// the corpus) live in scripts/spec-supersede-baseline.json — see
// proposals/2026-08-18-spec-heading-lint-baseline-backfill.md for the backfill ask.
//
// Run from repo root: node scripts/spec-index.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseFrontmatter, STAGES, STATUSES } from './spec-frontmatter.mjs';

export const ALLOWED_REPOS = [
	'minion',
	'minion_hub',
	'minion_site',
	'minion_plugins',
	'minion-meta',
	'minion-base',
	'minion-factory',
	'paperclip',
	'pixel-agents'
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Anchored to actual Markdown structure — either a "##"-"####" heading whose
// text contains the keyword, or a "**Label:**"-style bold line-start (the
// house style several specs use instead of a dedicated heading, e.g.
// "**Out of scope:** ..." or "**E2E verification:** ..."). Prose that merely
// mentions "out of scope" or "verification" mid-paragraph — not at a heading
// or bold-label position — does not count.
const REQUIRED_HEADINGS = [
	{ label: '"## 0. Product" section', re: /^##\s*0\.\s*Product/m },
	{
		label: 'an out-of-scope section (a heading or a **Out of scope:** label)',
		re: /^#{2,4}[ \t]+.*out.of.scope|^\*\*[^*\n]*out.of.scope[^*\n]*\*\*/im
	},
	{
		label: 'a verification section (a heading or a **Verification:** label)',
		re: /^#{2,4}[ \t]+.*verif|^\*\*[^*\n]*verif[^*\n]*\*\*/im
	}
];
// TODO(handoff): 115 pre-existing specs are grandfathered here and never get
// checked again while their body is unchanged (hash-ratcheted — see header
// comment). Shrink the baseline over time (backfill headings, remove the id)
// — see proposals/2026-08-18-spec-heading-lint-baseline-backfill.md.
const HEADING_BASELINE_PATH = 'scripts/spec-heading-lint-baseline.json';
// TODO(handoff): 5 legacy superseded specs have no known successor in the
// corpus (superseded by out-of-band work before the bidirectional-link
// convention existed) — see proposals/2026-08-18-spec-heading-lint-baseline-backfill.md.
const SUPERSEDE_BASELINE_PATH = 'scripts/spec-supersede-baseline.json';
const OUT_PATH = 'specs/index.json';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

const check = process.argv.includes('--check');
const headingBaseline =
	check && existsSync(HEADING_BASELINE_PATH)
		? JSON.parse(readFileSync(HEADING_BASELINE_PATH, 'utf8'))
		: {};
const supersedeBaseline = new Set(
	check && existsSync(SUPERSEDE_BASELINE_PATH)
		? JSON.parse(readFileSync(SUPERSEDE_BASELINE_PATH, 'utf8'))
		: []
);

const specs = [];
const errors = [];
const fmById = new Map();

for (const name of readdirSync('specs')
	.filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md' && !f.endsWith('.review.md'))
	.sort()) {
	const parsed = parseFrontmatter(readFileSync(`specs/${name}`, 'utf8'));
	if (!parsed) {
		errors.push(`${name}: missing frontmatter (run scripts/spec-retrofit.mjs or add by hand)`);
		continue;
	}
	const { fm, body } = parsed;
	for (const key of ['id', 'title', 'stage', 'status', 'created']) {
		if (!fm[key]) errors.push(`${name}: missing required field "${key}"`);
	}
	if (fm.stage && !STAGES.includes(fm.stage)) errors.push(`${name}: invalid stage "${fm.stage}"`);
	if (fm.status && !STATUSES.includes(fm.status))
		errors.push(`${name}: invalid status "${fm.status}"`);
	// Retiring is a justified act, never a silent flip (lifecycle-tools mandate).
	if (fm.status === 'retired' && !(fm.retired_reason && fm.retired_reason.length >= 20))
		errors.push(`${name}: status "retired" requires retired_reason (>=20 chars)`);

	if (check) {
		for (const key of ['created', 'updated']) {
			if (fm[key] && !DATE_RE.test(fm[key]))
				errors.push(`${name}: "${key}" is not an ISO date (YYYY-MM-DD): "${fm[key]}"`);
		}
		for (const repo of fm.repos ?? []) {
			if (!ALLOWED_REPOS.includes(repo))
				errors.push(`${name}: unknown repo id "${repo}" in "repos" (allowed: ${ALLOWED_REPOS.join(', ')})`);
		}
		if (fm.id) {
			const stillGrandfathered = headingBaseline[fm.id] === sha256(body);
			if (!stillGrandfathered) {
				for (const { label, re } of REQUIRED_HEADINGS) {
					if (!re.test(body)) errors.push(`${name}: missing ${label}`);
				}
			}
		}
	}

	if (fm.id) fmById.set(fm.id, fm);
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
		...(fm.tags ? { tags: fm.tags } : {})
	});
}

if (check) {
	// Link integrity: revises/supersedes must point at a real spec, and
	// supersedes is only true bidirectionally once the target flips status
	// (a one-way supersedes link is exactly the stale-doc failure this
	// hardening pass exists to catch).
	//
	// TODO(handoff): this only checks consistency *when* revises/supersedes is
	// set. It does not require pass>1 specs to set either — 34 specs violate
	// that today (see 2026-08-17-sdlc-phase-gates-scoring-spec.md, assigned to
	// the G0 reconciler). Add a presence rule here once that backlog is
	// cleared — see proposals/2026-08-18-spec-heading-lint-baseline-backfill.md.
	for (const fm of fmById.values()) {
		if (fm.revises) {
			const target = fmById.get(fm.revises);
			if (!target) errors.push(`${fm.id}: revises unknown spec "${fm.revises}"`);
			else if (!((fm.pass ?? 1) > (target.pass ?? 1)))
				errors.push(
					`${fm.id}: pass (${fm.pass ?? 1}) is not greater than revised spec "${fm.revises}" pass (${target.pass ?? 1})`
				);
		}
		if (fm.supersedes) {
			const target = fmById.get(fm.supersedes);
			if (!target) errors.push(`${fm.id}: supersedes unknown spec "${fm.supersedes}"`);
			else if (target.status !== 'superseded')
				errors.push(
					`${fm.id}: supersedes "${fm.supersedes}" but that spec's status is "${target.status}", expected "superseded" (one-way link)`
				);
		}
	}

	// Reverse direction: every status:superseded spec must be named by some
	// other spec's supersedes field, or it's a stale/orphaned superseded
	// marker with no traceable successor.
	const supersedeTargets = new Set(
		[...fmById.values()].filter((fm) => fm.supersedes).map((fm) => fm.supersedes)
	);
	for (const fm of fmById.values()) {
		if (fm.status === 'superseded' && !supersedeTargets.has(fm.id) && !supersedeBaseline.has(fm.id)) {
			errors.push(
				`${fm.id}: status "superseded" but no spec declares supersedes: "${fm.id}" (no incoming successor link)`
			);
		}
	}
}

specs.sort((a, b) => b.id.localeCompare(a.id));
const computed = JSON.stringify({ generated: null, specs }, null, '\t') + '\n';

if (check) {
	const existing = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : '';
	if (existing !== computed)
		errors.push(`${OUT_PATH} is stale — run \`node scripts/spec-index.mjs\` and commit the result`);
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}

if (check) {
	console.log(`spec-index --check passed: ${specs.length} specs, ${OUT_PATH} up to date`);
} else {
	writeFileSync(OUT_PATH, computed);
	console.log(`${OUT_PATH} written: ${specs.length} specs`);
}
