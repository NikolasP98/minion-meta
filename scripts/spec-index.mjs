// Regenerates specs/index.json from spec frontmatter. Committed output — the
// minion-base dashboard fetches this ONE file instead of parsing 100+ specs.
// Doubles as the lint gate: exits 1 if any spec lacks frontmatter or uses an
// invalid stage/status. Run from repo root: node scripts/spec-index.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter, serializeFrontmatter, STAGES, STATUSES } from './spec-frontmatter.mjs';

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
// reconcileLinkHygiene() below turns these warnings into a persisted outcome
// (auto-fixed status or a written `link_review` flag) — see that function for the
// auto-fix/flag split. What's still out of reach from this minion-meta-only checkout:
// the historical *spec-sweep* (shipped-but-active specs flip to done/shipped) and
// CI-watch proposal auto-close both live in minion-factory's `agent/reconcile.sh`.
// minion-factory PR #2 (the G0 backward-staleness reconciler) is open and
// human-escalated on a design disagreement; see
// proposals/2026-08-18-factory-g0-ci-watch-auto-close.md for the verified,
// ready-to-apply CI-watch auto-close patch a minion-factory-scoped run (or a human)
// should apply.
// TODO(handoff): the historical spec-sweep and CI-watch auto-close pieces above
// remain unimplemented from this checkout — same tracking issue, not a new one.
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

// Turns checkLinkHygiene's warnings into a persisted G0 outcome — "auto-fixed or
// flagged", per the spec. Only the `supersedes`-target-status case is unambiguous:
// the correct value is already known from the other side of the link (the spec that
// declares `supersedes` names it), so it's an auto-fix. The other two cases have no
// reliable predecessor/successor to infer — semantic matching over titles/dates is a
// guess, not a fact — so they can only be flagged for a human via `link_review`.
export function reconcileLinkHygiene(specs) {
	const byId = new Map(specs.map((s) => [s.id, s]));
	const fixes = [];
	const flags = [];
	const supersededTargets = new Set();
	for (const s of specs) {
		if (!s.supersedes) continue;
		const target = byId.get(s.supersedes);
		if (!target) continue; // dangling reference — a hard error, not reconcilable
		supersededTargets.add(target.id);
		if (target.status !== 'superseded') {
			fixes.push({
				id: target.id,
				field: 'status',
				value: 'superseded',
				reason: `auto-set by G0 link hygiene: "${s.id}" declares supersedes: ${target.id}`
			});
		}
	}
	for (const s of specs) {
		if (s.status === 'superseded' && !supersededTargets.has(s.id)) {
			flags.push({
				id: s.id,
				reason: `status "superseded" but no other spec's "supersedes" links back to it — confirm the successor (it should add supersedes: ${s.id}), or correct this status if it was set in error`
			});
		}
	}
	for (const s of specs) {
		if ((s.pass ?? 1) > 1 && !s.revises && !s.supersedes) {
			flags.push({
				id: s.id,
				reason: `pass ${s.pass} but has neither "revises" nor "supersedes" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec`
			});
		}
	}
	return { fixes, flags };
}

// Applies reconcileLinkHygiene's output to the in-memory frontmatter map. Mutates
// only fields whose current value actually differs (repeat runs are a no-op diff)
// and never overwrites an existing `link_review` (a prior sweep's flag or a human's
// own note — either way, not this run's to clobber). Returns the set of changed ids
// so the caller knows which files need rewriting.
export function applyLinkHygiene(fmById, reconcile, updated) {
	const changed = new Set();
	for (const fix of reconcile.fixes) {
		const fm = fmById.get(fix.id);
		if (!fm || fm[fix.field] === fix.value) continue;
		fm[fix.field] = fix.value;
		fm.updated = updated;
		changed.add(fix.id);
	}
	for (const flag of reconcile.flags) {
		const fm = fmById.get(flag.id);
		if (!fm || fm.link_review) continue;
		fm.link_review = flag.reason;
		fm.updated = updated;
		changed.add(flag.id);
	}
	return changed;
}

// Full regen: parse specs/*.md → validate → reconcile+persist link hygiene →
// rewrite changed spec files → regenerate index.json. Factored out of the isMain
// guard so tests can point it at a fixture directory instead of the real specs/.
export function runIndex(specsDir) {
	const errors = [];
	const records = [];
	for (const name of readdirSync(specsDir)
		.filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md' && !f.endsWith('.review.md'))
		.sort()) {
		const parsed = parseFrontmatter(readFileSync(`${specsDir}/${name}`, 'utf8'));
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
		records.push({ name, fm, body });
	}

	let specs = records.map((r) => projectSpec(r.fm));
	const hygiene = checkLinkHygiene(specs);
	errors.push(...hygiene.errors);

	if (errors.length) {
		console.error(errors.join('\n'));
		process.exit(1);
	}

	const fmById = new Map(records.map((r) => [r.fm.id, r.fm]));
	const reconcile = reconcileLinkHygiene(specs);
	const updated = new Date().toISOString().slice(0, 10);
	const changedIds = applyLinkHygiene(fmById, reconcile, updated);
	for (const record of records) {
		if (!changedIds.has(record.fm.id)) continue;
		writeFileSync(`${specsDir}/${record.name}`, serializeFrontmatter(record.fm) + record.body);
	}
	if (changedIds.size) {
		console.log(`link hygiene: persisted ${changedIds.size} frontmatter change(s) — ${[...changedIds].join(', ')}`);
	}

	// Re-project after mutation so index.json reflects what was just persisted.
	specs = records.map((r) => projectSpec(r.fm));
	const finalHygiene = checkLinkHygiene(specs);
	if (finalHygiene.warnings.length) {
		console.warn(`link hygiene warnings (${finalHygiene.warnings.length}, non-blocking):`);
		console.warn(finalHygiene.warnings.map((w) => `  ${w}`).join('\n'));
	}

	specs.sort((a, b) => b.id.localeCompare(a.id));
	writeFileSync(`${specsDir}/index.json`, JSON.stringify({ generated: null, specs }, null, '\t') + '\n');
	console.log(`${specsDir}/index.json written: ${specs.length} specs`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) runIndex('specs');
