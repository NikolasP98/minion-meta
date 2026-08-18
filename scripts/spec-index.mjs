// Regenerates specs/index.json from spec frontmatter. Committed output — the
// minion-base dashboard fetches this ONE file instead of parsing 100+ specs.
// Doubles as the lint gate: exits 1 if any spec lacks frontmatter or uses an
// invalid stage/status. Run from repo root: node scripts/spec-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter, STAGES, STATUSES } from './spec-frontmatter.mjs';

// Projects one spec's frontmatter into its specs/index.json entry. `reconcile_ignore`
// is deliberately never projected here — it's read directly from spec markdown by
// minion-factory's G0 sweep (agent/reconcile.sh), never by the board; adding it to
// index.json would be dead weight with no consumer.
export function projectSpec(fm) {
	return {
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
		// Written by minion-factory's G0 backward-staleness reconciler
		// (2026-08-17-sdlc-phase-gates-scoring-spec.md §3 G0); the board renders
		// possibly_shipped/link_review as an amber "verify" chip.
		...(fm.possibly_shipped ? { possibly_shipped: fm.possibly_shipped } : {}),
		...(fm.evidence ? { evidence: fm.evidence } : {}),
		...(fm.link_review ? { link_review: fm.link_review } : {})
	};
}

// Link-hygiene checks for G0 (2026-08-17-sdlc-phase-gates-scoring-spec.md §3 G0:
// "a superseded spec whose successor doesn't link back ... gets auto-fixed or
// flagged" AND "a `pass > 1` spec without `revises`/`supersedes` ... gets auto-fixed
// or flagged"). Non-fatal by design: these links predate this check by weeks (many
// pass>1 specs revised in place without a `revises` pointer, 5 pre-template specs
// marked `superseded` with no successor) and the sweep — not this validator —
// decides auto-fix vs. flag. Only a dangling `supersedes` reference (points at a
// spec id that doesn't exist) is a hard error: that's an unambiguous data bug, not
// a hygiene judgment call.
// TODO(handoff): checkLinkHygiene only detects and returns warnings — it never persists
// `link_review`, never auto-repairs an unambiguous revises/supersedes pair, and nothing
// in this repo closes a CI-watch proposal once its watched workflow goes green. All
// three are G0-sweep responsibilities that live in minion-factory's `agent/reconcile.sh`,
// not in this lint script, and this run's harness contract scopes it to a minion-meta-only
// checkout with no push/PR access to minion-factory. minion-factory PR #2 (the G0
// backward-staleness reconciler) is open and human-escalated on a design disagreement;
// see proposals/2026-08-18-factory-g0-ci-watch-auto-close.md for the verified, ready-to-
// apply CI-watch auto-close patch a minion-factory-scoped run (or a human) should apply.
export function checkLinkHygiene(specs) {
	const byId = new Map(specs.map((s) => [s.id, s]));
	const errors = [];
	const warnings = [];
	const supersededTargets = new Set();
	for (const s of specs) {
		if (!s.supersedes) continue;
		const target = byId.get(s.supersedes);
		if (!target) {
			errors.push(`${s.id}: supersedes "${s.supersedes}" — no spec with that id`);
			continue;
		}
		supersededTargets.add(target.id);
		if (target.status !== 'superseded')
			warnings.push(
				`${s.id}: supersedes "${s.supersedes}" but that spec's status is "${target.status}", not "superseded"`
			);
	}
	for (const s of specs) {
		if (s.status === 'superseded' && !supersededTargets.has(s.id))
			warnings.push(`${s.id}: status "superseded" but no other spec's "supersedes" links back to it`);
	}
	for (const s of specs) {
		if ((s.pass ?? 1) > 1 && !s.revises && !s.supersedes)
			warnings.push(`${s.id}: pass ${s.pass} but has neither "revises" nor "supersedes" — missing lineage link`);
	}
	return { errors, warnings };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
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
		specs.push(projectSpec(fm));
	}

	const hygiene = checkLinkHygiene(specs);
	errors.push(...hygiene.errors);

	if (errors.length) {
		console.error(errors.join('\n'));
		process.exit(1);
	}

	if (hygiene.warnings.length) {
		console.warn(`link hygiene warnings (${hygiene.warnings.length}, non-blocking):`);
		console.warn(hygiene.warnings.map((w) => `  ${w}`).join('\n'));
	}

	specs.sort((a, b) => b.id.localeCompare(a.id));
	writeFileSync('specs/index.json', JSON.stringify({ generated: null, specs }, null, '\t') + '\n');
	console.log(`specs/index.json written: ${specs.length} specs`);
}
