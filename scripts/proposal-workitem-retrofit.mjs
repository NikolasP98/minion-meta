// One-time (but idempotent) retrofit: fill the required WorkItem fields on
// every proposals/*.md that predates spec
// 2026-08-18-factory-workitem-handoff-schema-spec §2.1.
//
// Determinism is the whole point. Provenance is resolved from an EXPLICIT
// ordered rule table below — there is no catch-all and no heuristic default:
// a file whose `source:` (or, for files written before `source:` existed,
// whose filename) matches nothing makes this script exit 1 and name the file,
// exactly as the spec requires ("Any source outside those explicit rules makes
// the script fail and name the file instead of guessing").
//
// The spec quotes counts from its 2026-08-18 authoring snapshot (seven
// source-less `ci-*.md`, four other source-less files). The corpus has grown
// since; the RULES are what the spec fixed, so they are expressed as patterns
// and the counts are reported at the end instead of asserted.
//
// Re-running is safe: an existing field is never overwritten, so this doubles
// as the repair tool for a machine-written proposal that arrives incomplete.
// It only ever ADDS the missing keys, as plain lines before the closing `---`,
// leaving the rest of the file byte-identical.
//
// Run from repo root: node scripts/proposal-workitem-retrofit.mjs [--dry]
//
// TODO(handoff): the minion-factory writers that create proposals directly
// (ci-watch, handoff-sweep, merge-scan, postmerge-discovery, auto-triage) do
// not emit these fields yet, so the next machine-written proposal will fail
// `node scripts/proposal-index.mjs` until they do. Spec slices 5 and 6 cover
// ci-watch and monitor only. Tracked in
// proposals/2026-08-29-factory-intake-writers-emit-workitem-fields.md — until
// that lands, run this script to repair such a file.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import { classifyRisk } from './workitem.mjs';

const TRUSTED = { source_trust: 'trusted-automation', owner: 'factory' };
const HUMAN = { source_trust: 'human', owner: 'human' };

// Files written before `source:` existed. Matched against the FILENAME (sans
// .md), because that is the only provenance evidence such a file carries.
export const SOURCELESS_RULES = [
	{ match: /^ci-/, source: 'ci-watch', ...TRUSTED, why: 'filed by the factory CI watch' },
	{ match: /^handoff-/, source: 'handoff-sweep', ...TRUSTED, why: 'filed by the factory handoff-ledger sweep' },
	{ match: /^merge-scan-/, source: 'merge-scan', ...TRUSTED, why: 'filed by the factory merge-scan lane' },
	{ match: /^postmerge-/, source: 'postmerge-discovery', ...TRUSTED, why: 'filed by the factory post-merge discovery loop' },
	// Everything else source-less is a dated, hand-written proposal. Human
	// trust keeps human gate 1 — the conservative direction.
	{ match: /^\d{4}-\d{2}-\d{2}-/, source: 'human', ...HUMAN, why: 'hand-written proposal' }
];

// Files that already declare `source:`. The declared value is kept verbatim;
// only trust and owner are derived from it.
export const SOURCE_RULES = [
	// Unattended factory pipelines — the spec names audit-*, debt-sweep-* and
	// factory-review-* explicitly; the rest are the same kind of writer, each
	// a factory run with no human in the loop at filing time.
	{ match: /^ci-watch$/, ...TRUSTED, why: 'factory CI watch' },
	{ match: /^audit-/, ...TRUSTED, why: 'factory audit sweep (spec-named rule)' },
	{ match: /^debt-sweep-/, ...TRUSTED, why: 'factory debt sweep (spec-named rule)' },
	{ match: /^factory-review-/, ...TRUSTED, why: 'factory review stage (spec-named rule)' },
	{ match: /^factory-run-/, ...TRUSTED, why: 'factory dev run open-items ledger' },
	{ match: /^review-fix-/, ...TRUSTED, why: 'factory review-fix applier' },
	{ match: /^postmerge-discovery$/, ...TRUSTED, why: 'factory post-merge discovery loop' },
	{ match: /^handoff-/, ...TRUSTED, why: 'factory handoff-ledger sweep' },
	{ match: /^merge-scan$/, ...TRUSTED, why: 'factory merge-scan lane' },
	{ match: /^\d{4}-\d{2}-\d{2}-.+-spec$/, ...TRUSTED, why: 'consumer handoff filed by the factory spec stage' },
	// Human-supervised sessions. An agent may have typed the file, but a human
	// drove the session and owns the outcome, so gate 1 stays.
	{ match: /^ux-plan-/, ...HUMAN, why: 'human UX planning session' },
	{ match: /^cost-audit-/, ...HUMAN, why: 'human cost/ops audit session' },
	{ match: /^hub-perf-session-/, ...HUMAN, why: 'human performance investigation session' },
	{ match: /^supervised-/, ...HUMAN, why: 'human-supervised cleanup session' },
	{ match: /^orch\//, ...HUMAN, why: 'human orchestration session' },
	{ match: /^crm-customers-scale-next$/, ...HUMAN, why: 'human CRM scale planning session' }
];

/**
 * Resolve provenance for one proposal. Pure.
 *
 * @param {string} id filename sans `.md`
 * @param {string|undefined} declaredSource existing `source:` value
 * @returns {{source: string, source_trust: string, owner: string, why: string}|null}
 *   null when no explicit rule matches — the caller must fail, not guess.
 */
export function resolveProvenance(id, declaredSource) {
	if (declaredSource) {
		const rule = SOURCE_RULES.find((r) => r.match.test(declaredSource));
		return rule ? { source: declaredSource, source_trust: rule.source_trust, owner: rule.owner, why: rule.why } : null;
	}
	const rule = SOURCELESS_RULES.find((r) => r.match.test(id));
	return rule ? { source: rule.source, source_trust: rule.source_trust, owner: rule.owner, why: rule.why } : null;
}

/**
 * Compute the frontmatter lines to append for one file. Pure.
 *
 * @param {string} id
 * @param {Record<string, unknown>} fm parsed frontmatter
 * @returns {{lines: string[]}|{error: string}}
 */
export function plan(id, fm) {
	const provenance = resolveProvenance(id, typeof fm.source === 'string' && fm.source ? fm.source : undefined);
	if (!provenance) {
		return {
			error: fm.source
				? `${id}.md: source "${fm.source}" matches no explicit rule — add one to SOURCE_RULES in scripts/proposal-workitem-retrofit.mjs (never guess)`
				: `${id}.md: no source and no explicit filename rule — add one to SOURCELESS_RULES in scripts/proposal-workitem-retrofit.mjs (never guess)`
		};
	}
	const wanted = {
		source: provenance.source,
		source_trust: provenance.source_trust,
		risk_class: classifyRisk(fm.tags),
		priority: 'medium',
		owner: provenance.owner
	};
	const lines = [];
	for (const [key, value] of Object.entries(wanted)) {
		if (fm[key] === undefined || fm[key] === '') lines.push(`${key}: ${value}`);
	}
	return { lines };
}

function appendFrontmatter(src, lines) {
	const end = src.indexOf('\n---\n', 4);
	return src.slice(0, end + 1) + lines.map((l) => `${l}\n`).join('') + src.slice(end + 1);
}

function main() {
	const dry = process.argv.includes('--dry');
	const errors = [];
	let changed = 0;
	let untouched = 0;
	const byRule = new Map();

	for (const name of readdirSync('proposals').filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md').sort()) {
		const path = `proposals/${name}`;
		const src = readFileSync(path, 'utf8');
		const parsed = parseFrontmatter(src);
		if (!parsed) {
			errors.push(`${name}: missing frontmatter`);
			continue;
		}
		const id = name.replace(/\.md$/, '');
		const result = plan(id, parsed.fm);
		if ('error' in result) {
			errors.push(result.error);
			continue;
		}
		if (result.lines.length === 0) {
			untouched++;
			continue;
		}
		const key = `${parsed.fm.source ?? '(source-less)'} → ${result.lines.find((l) => l.startsWith('source_trust:')) ?? 'unchanged trust'}`;
		byRule.set(key, (byRule.get(key) ?? 0) + 1);
		changed++;
		if (!dry) writeFileSync(path, appendFrontmatter(src, result.lines));
	}

	if (errors.length) {
		console.error(errors.join('\n'));
		process.exit(1);
	}
	for (const [key, count] of [...byRule].sort()) console.log(`  ${count}\t${key}`);
	console.log(`${dry ? 'would update' : 'updated'} ${changed} proposal(s); ${untouched} already complete`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
