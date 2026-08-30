// Regenerates proposals/index.json from proposal frontmatter. Same contract as
// spec-index.mjs: committed output, exits 1 on invalid files.
//
// --check is the read-only half, and the one meta CI runs
// (.github/workflows/ci.yml): it validates the whole proposal corpus — including
// every `proposals/*.review.md` G1 gate sidecar — and fails when the committed
// proposals/index.json is not byte-identical to what the corpus derives. Without
// it the sidecar validator had no repository boundary at all: the only reader of
// `proposals/*.review.md` was this script's write mode, which nothing in CI ran,
// so an invalid sidecar or a stale index merged with a green `verify` check.
//
// Run from repo root: node scripts/proposal-index.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import { loadTopics, resolveTag } from './topics.mjs';
import { readReviewSidecars } from './review-sidecar.mjs';

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

export const OUT_PATH = 'proposals/index.json';

function main() {
	const check = process.argv.includes('--check');
	const proposals = [];
	const errors = [];
	const fmById = new Map();

	// The topic taxonomy is itself a gated input, same posture as spec-index.mjs:
	// an invalid specs/topics.json fails this build with its own message, and tag
	// checks below are skipped (the build is already red — no fail-open).
	let topics = null;
	try {
		topics = loadTopics();
	} catch (e) {
		errors.push(String(e instanceof Error ? e.message : e));
	}

	// filename base -> parsed frontmatter, in the order proposals are read. The G1
	// sidecars are matched against these bases (a sidecar is named after the file it
	// sits beside), so they can only be resolved once the whole directory is read.
	const pending = [];

	for (const name of readdirSync('proposals')
		.filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md' && !f.endsWith('.review.md'))
		.sort()) {
		const parsed = parseFrontmatter(readFileSync(`proposals/${name}`, 'utf8'));
		if (!parsed) {
			errors.push(`${name}: missing frontmatter`);
			continue;
		}
		const { fm } = parsed;
		for (const key of ['id', 'title', 'status', 'created']) {
			if (!fm[key]) errors.push(`${name}: missing required field "${key}"`);
		}
		// id is the stable join key (proposals/TEMPLATE.md: "id equals the
		// filename sans .md") — the sidecar join below looks reviews up by
		// filename base and publishes the unrelated fm.id beside them, so an
		// id that doesn't match its filename (or collides with another
		// proposal's id) would transfer one proposal's review evidence onto a
		// different published identity. Mirrors spec-index.mjs.
		const idFromFilename = name.slice(0, -3);
		if (fm.id && fm.id !== idFromFilename)
			errors.push(`${name}: "id" ("${fm.id}") must match filename ("${idFromFilename}")`);
		if (fm.id) {
			if (fmById.has(fm.id)) errors.push(`${name}: duplicate id "${fm.id}" (already used by another proposal)`);
			else fmById.set(fm.id, fm);
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
		pending.push({ base: name.slice(0, -3), fm });
	}

	// G1 proposal-gate sidecars (2026-08-17-sdlc-phase-gates-scoring-spec §4 — one
	// sidecar format everywhere). No producer writes these yet; Slice 3 owns the
	// scorer. Validating and projecting them now means the scorer lands into a
	// namespace that is already checked, and the board gets its proposal-column
	// chip from the same field name it reads on a spec card. Errors are fatal in
	// BOTH modes: write mode must never publish an unvalidated score, and --check
	// is the gate that makes "already checked" true on a PR.
	const sidecars = readReviewSidecars('proposals', {
		subjectKey: 'proposal',
		knownIds: new Set(pending.map((entry) => entry.base))
	});
	errors.push(...sidecars.errors);

	for (const { base, fm } of pending) {
		const review = sidecars.byId.get(base);
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
			// `effort` sits in 40 proposals' frontmatter and in the auto-triage tool's
			// hand-written index entries, but was never projected here — so every
			// regeneration silently deleted it again. Same failure class as the spec
			// index's dropped `relationship`/`related` fields.
			...(fm.effort ? { effort: fm.effort } : {}),
			...(fm.source ? { source: fm.source } : {}),
			...(review ? { review } : {})
		});
	}

	// TODO(handoff): this descending-id sort is not the order the out-of-band
	// auto-triage writer leaves behind. The canonical cross-writer order remains
	// undecided; see proposals/2026-08-29-proposal-index-check-mode-and-effort-projection.md.
	proposals.sort((a, b) => b.id.localeCompare(a.id));
	const computed = JSON.stringify({ proposals }, null, '\t') + '\n';

	// Staleness is checked BEFORE the error bail so a run that is both invalid and
	// stale reports both, and --check never writes (CI stays read-only).
	if (check) {
		const existing = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : '';
		if (existing !== computed)
			errors.push(`${OUT_PATH} is stale — run \`node scripts/proposal-index.mjs\` and commit the result`);
	}

	if (errors.length) {
		console.error(errors.join('\n'));
		process.exit(1);
	}

	if (check) {
		console.log(`proposal-index --check passed: ${proposals.length} proposals, ${OUT_PATH} up to date`);
	} else {
		writeFileSync(OUT_PATH, computed);
		console.log(`${OUT_PATH} written: ${proposals.length} proposals`);
	}
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
