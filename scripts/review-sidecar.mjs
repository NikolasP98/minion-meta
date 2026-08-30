// Canonical loader + validator for gate review sidecars — `specs/<id>.review.md`
// and `proposals/<id>.review.md` (spec 2026-08-17-sdlc-phase-gates-scoring-spec
// §2 principle 1 and §4 "Scoring — one format everywhere").
//
// WHY THIS EXISTS. The phase-gate design stores every gate's judgement in a
// sidecar next to the artifact it judged, and states that "the board reads
// sidecars". Until now minion-meta did neither half: `spec-index.mjs` and
// `proposal-index.mjs` both filter `*.review.md` OUT of their scans, so 69
// sidecars were completely unvalidated (a sidecar naming a spec that does not
// exist, a mistyped axis, or a score of 42 all passed CI silently), and the
// scores the G2 pass-2 reviewer already writes never reached `specs/index.json`
// — the ONE file the board fetches. A chip cannot be rendered from data that is
// not published, so §4's "board renders the chip on every card in every column"
// was unreachable on the meta side. This module is that missing contract.
//
// SHAPE. Sidecar frontmatter is the same flat-YAML dialect as the artifacts
// (spec-frontmatter.mjs) — scalars only, no nesting. §4 writes the axes as a
// nested `axes: {...}` map, which this parser cannot express by design, so the
// live producer flattens them to `score_<axis>` keys. That flattening is the
// wire format here; the nested `axes` object is reconstructed in the published
// projection, where JSON can hold it.
//
//   ---
//   spec: 2026-08-28-factory-browser-verification-stage-spec
//   pass: 2
//   verdict: approved
//   reviewer: factory-review
//   created: 2026-08-28
//   score_slice_size: 9
//   score_dod_verifiability: 9
//   score_scope_containment: 10
//   score_impact_zones: 10
//   ---
//
// DERIVED, NOT DECLARED. `score`, `gate` and `chip` are computed here so that
// no producer and no consumer can drift into its own cutoffs. They are computed
// from TWO tables, not one, because the spec grades two different things:
// `chip` is §4's colour scale, which grades the NUMBER and is therefore the same
// at every gate, while `gate` is the promote/block decision of the gate that
// actually scored the artifact — §3 gives G2 `pass >= 7 / warn 5-6.9 / block < 5`
// but G1 a single "threshold 6 to enable spec-it". One shared table cannot
// express both, and collapsing them published an eligible score-6 proposal as
// `gate: warn`. A producer MAY still write these fields; when it does they are
// checked against the computed values and a mismatch fails the build, which is
// how a rubric change in minion-factory surfaces here instead of silently
// publishing two different numbers for the same review.
//
// Pure: no network, no git, reads the working tree only.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidISODate, parseFrontmatter, VERDICTS } from './spec-frontmatter.mjs';

export const REVIEW_SUFFIX = '.review.md';
export const SCORE_PREFIX = 'score_';

// Fields every sidecar must carry, whatever gate wrote it. `subjectKey` (below)
// is required too but is per-artifact, so it is not listed here.
export const REQUIRED_SIDECAR_FIELDS = ['pass', 'verdict', 'reviewer', 'created'];

// The rubric axes a gate may score, as ONE registry rather than a free-form
// `score_*` namespace: an unrecognised axis is a typo far more often than a new
// rubric dimension, and a typo silently changes the denominator of the weighted
// mean — the score moves without anything looking wrong. A genuinely new axis is
// therefore a deliberate edit here (and, being data, a re-weighting is too).
//
// `name` is what gets published. `aliases` exist because the spec names the same
// axes in two vocabularies: §4's worked example writes `dod`/`out_of_scope`/
// `impact`, while the shipped G2 reviewer writes `dod_verifiability`/
// `scope_containment`/`impact_zones`. Both resolve to one canonical axis, so a
// producer following either reading of the spec is accepted and the artifact
// still publishes a single name.
//
// Weights are uniform because the spec assigns none — §4 says only "weighted
// 0-10". They live here so a future rubric can re-weight without touching the
// scoring code or the consumers.
export const SCORE_AXES = [
	// G2 (spec gate, §3) — the four the live pass-2 reviewer emits, plus the two
	// §3 names for the rest of its rubric.
	{ name: 'slice_size', aliases: [], weight: 1, description: 'slices sized "junior dev, 4-8 focused hours"' },
	{
		name: 'dod_verifiability',
		aliases: ['dod'],
		weight: 1,
		description: 'machine-checkable definition of done per slice'
	},
	{
		name: 'scope_containment',
		aliases: ['out_of_scope'],
		weight: 1,
		description: 'explicit out-of-scope section that actually bounds the work'
	},
	{
		name: 'impact_zones',
		aliases: ['impact'],
		weight: 1,
		description: 'repo/impact-zone correctness against the AGENTS.md table'
	},
	{
		name: 'collisions',
		aliases: [],
		weight: 1,
		description: 'collision scan against existing specs (overlaps/supersedes)'
	},
	{
		name: 'testability',
		aliases: [],
		weight: 1,
		description: 'each slice names the command that verifies it'
	},
	// G1 (proposal gate, §3). No producer emits these yet — Slice 3 owns it.
	// They are declared so the G1 scorer lands into a validated namespace rather
	// than inventing one; a producer that picks different names fails loudly here
	// with the registry printed, which is the intended fail-closed handoff.
	{
		name: 'problem_clarity',
		aliases: [],
		weight: 1,
		description: 'problem stated in user terms'
	},
	{ name: 'value', aliases: ['motivation'], weight: 1, description: 'motivation / value' },
	{ name: 'dedupe', aliases: [], weight: 1, description: 'dedupe check ran, candidates listed' }
];

// §4's colour scale: "green >= 7, amber 5-6.9, red < 5". It grades the score
// itself and says nothing about promotion, so it is universal — the same 6.4 is
// amber on a proposal card and on a spec card, even though only one of them is
// above its gate's threshold. Ordered highest band first.
export const CHIP_BANDS = [
	{ min: 7, chip: 'green' },
	{ min: 5, chip: 'amber' },
	{ min: 0, chip: 'red' }
];

// A sidecar carries TWO independent judgements: the lifecycle `verdict`
// (validated against spec-frontmatter's VERDICTS — the reviewer's actual
// pass/fail decision) and the numeric axis mean this module derives a
// gate/chip from. They can disagree — a reviewer can veto with
// `changes_requested` while the axes happen to average >= 7 — and when they
// do, the veto wins: a human (or the next pass) said "not yet", and a
// numeric mean must never overrule that into a green chip. `pending` is not
// listed: it means "no decision yet", not "rejected", so it does not veto —
// but it also must never EARN a passing band on its own. A `pending` review
// has made no decision, so even a complete, high-scoring rubric publishes no
// score/gate/chip at all (same shape as an unscored sidecar) rather than
// letting the axis mean stand in for a decision nobody made yet.
export const VETO_VERDICTS = ['changes_requested', 'rejected', 'revision-required'];
const VETO_BAND = { gate: 'block', chip: 'red' };

// Per-gate rubric: the EXACT axis set a subject's gate scores on (§3). Keyed
// by `subjectKey` because today each artifact type is scored by exactly one
// gate — `spec` sidecars are G2, `proposal` sidecars are G1 — so the file's
// own location already tells us which rubric applies. A score is only
// derived once every required axis is present; an axis outside this set is a
// cross-gate mistake (e.g. a proposal scored on G2's `slice_size`), not a
// new dimension, so it fails the build rather than silently padding the mean.
//
// `bands` is that gate's OWN promote policy, because §3 gives the two gates
// different thresholds: G2 is a three-band verdict, G1 is a single cutoff at 6
// ("threshold 6 to enable 'spec it'; below, the button shows the missing axes")
// with no warn state to override through. Deriving both from G2's table made a
// complete, approved score-6 proposal — exactly the eligibility boundary — come
// out as `gate: warn`, i.e. blocked-pending-override, and made the genuinely
// below-threshold score-5 proposal indistinguishable from it.
export const RUBRICS = {
	spec: {
		gate: 'G2',
		required: ['slice_size', 'dod_verifiability', 'scope_containment', 'impact_zones', 'collisions', 'testability'],
		// §3 G2: "Verdict `pass >= 7 / warn 5-6 / block < 5`".
		bands: [
			{ min: 7, gate: 'pass' },
			{ min: 5, gate: 'warn' },
			{ min: 0, gate: 'block' }
		]
	},
	proposal: {
		gate: 'G1',
		required: ['problem_clarity', 'value', 'dod_verifiability', 'scope_containment', 'dedupe'],
		// §3 G1: one threshold, no warn band — the "spec it" button is either
		// enabled or it names the missing axes.
		bands: [
			{ min: 6, gate: 'pass' },
			{ min: 0, gate: 'block' }
		]
	}
};

const AXIS_INDEX = new Map();
for (const axis of SCORE_AXES) {
	for (const slug of [axis.name, ...axis.aliases]) AXIS_INDEX.set(slug, axis);
}

const COMMIT_RE = /^[0-9a-f]{7,40}$/;

// TODO(handoff): producer-side halves of §4 are still absent, so this module
// currently validates and publishes strictly less than the spec describes.
// See proposals/2026-08-29-review-sidecar-producer-gaps.md.
//   1. Nothing writes `reviewed_commit` — every published score is untraceable
//      to the revision it judged (only its shape is pinned here; `pass`
//      equality against the artifact's current `pass` is the fail-closed
//      guard readReviewSidecars enforces in the meantime).
//   2. No G1 producer writes proposals/<id>.review.md, so the proposal axes in
//      SCORE_AXES are declared from the spec's prose, not from a live writer.
//   3. Sidecars are OPTIONAL: a spec with no sidecar publishes no `review`, so
//      this cannot yet answer "was this spec gated at all?" — that requires the
//      board's promote-button rule (§2 principle 3, minion-base Slice 7).
//   4. The live G2 pass-2 reviewer only emits 4 of the 6 axes RUBRICS.spec
//      requires (missing `collisions`, `testability`) — every spec sidecar it
//      writes today publishes no score/gate/chip until it is upgraded to
//      score the full rubric.

/** Canonical axis for a raw `score_<slug>` suffix, or undefined if unknown. */
export function resolveAxis(slug) {
	return AXIS_INDEX.get(slug);
}

export function axisNames() {
	return SCORE_AXES.map((a) => a.name);
}

/**
 * Weighted mean of the scored axes, rounded to one decimal (§4's worked example
 * is `7.5`). `axes` maps CANONICAL axis name -> integer 0-10. Returns null when
 * nothing was scored — an unscored sidecar is valid, it just carries no chip.
 */
export function computeScore(axes) {
	const entries = Object.entries(axes);
	if (entries.length === 0) return null;
	let weighted = 0;
	let total = 0;
	for (const [name, value] of entries) {
		const weight = AXIS_INDEX.get(name)?.weight ?? 1;
		weighted += value * weight;
		total += weight;
	}
	return Math.round((weighted / total) * 10) / 10;
}

/** §4's chip colour for a score. Universal: the same number is the same colour at every gate. */
export function chipFor(score) {
	const band = CHIP_BANDS.find((b) => score >= b.min) ?? CHIP_BANDS[CHIP_BANDS.length - 1];
	return band.chip;
}

/**
 * The gate state a score earns under `subjectKey`'s own rubric (§3): `pass`,
 * `warn` or `block`. Returns null for a subject with no declared rubric —
 * there is no default threshold to fall back on, and inventing one is how a
 * gate silently promotes on a policy nobody wrote down.
 */
export function gateFor(score, subjectKey) {
	const bands = RUBRICS[subjectKey]?.bands;
	if (!bands) return null;
	return (bands.find((b) => score >= b.min) ?? bands[bands.length - 1]).gate;
}

// The flat-YAML parser only coerces /^\d+$/ to a number, so `score: 7.5` and
// `score: -1` both arrive as strings. Parse explicitly rather than trusting the
// parser's type, or a negative or fractional value would sail through a
// `typeof === 'number'` check by never being one.
function asNumber(value) {
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
	return null;
}

// Why a sidecar publishes no effective score/gate/chip, in the producer's own
// terms. Diagnostics only — the suppression rules themselves live in
// parseReviewSidecar. Three different rules produce a null score and a producer
// following specs/TEMPLATE.md can hit any of them, so naming the wrong one sends
// the author hunting for an axis they already wrote (the `pending` case).
export function nullScoreReason(fm, rubric, axes, subjectKey) {
	if (fm.verdict === 'pending')
		return 'a "pending" review publishes no score, gate or chip however complete its rubric is — decide a verdict, or drop the declared field';
	if (!rubric) return `no rubric is declared for a "${subjectKey}" sidecar, so nothing derives a score`;
	const missing = rubric.required.filter((name) => !(name in axes));
	if (missing.length === rubric.required.length)
		return `no score_* axis is — a score derives from the complete ${rubric.gate} rubric (${rubric.required.join(', ')})`;
	return `the ${rubric.gate} rubric is incomplete — a score needs every axis, still missing score_${missing.join(', score_')}`;
}

/**
 * Validate one sidecar's frontmatter.
 *
 * @param {string} label  path used in error messages
 * @param {string} src    file contents
 * @param {{ subjectKey: string, subjectId: string, currentPass?: number }} opts
 *        `subjectKey` is `spec` under specs/ and `proposal` under proposals/;
 *        `subjectId` is the id the filename claims the sidecar belongs to;
 *        `currentPass` is the artifact's own current `pass`, when the subject
 *        has one — a sidecar reviewing an older pass is stale evidence, not a
 *        valid review of the artifact being promoted now.
 * @returns {{ errors: string[], review: object | null }} `review` is the
 *        projection to publish, or null when the sidecar did not validate.
 */
export function parseReviewSidecar(label, src, { subjectKey, subjectId, currentPass }) {
	const errors = [];
	const parsed = parseFrontmatter(src);
	if (!parsed) {
		return {
			errors: [
				`${label}: missing frontmatter — every *${REVIEW_SUFFIX} file is a gate review sidecar (see specs/TEMPLATE.md "Review sidecars")`
			],
			review: null
		};
	}
	const { fm } = parsed;

	if (fm[subjectKey] === undefined || fm[subjectKey] === '') {
		errors.push(`${label}: missing required field "${subjectKey}"`);
	} else if (fm[subjectKey] !== subjectId) {
		errors.push(
			`${label}: "${subjectKey}" ("${fm[subjectKey]}") must match the filename's id ("${subjectId}")`
		);
	}
	for (const key of REQUIRED_SIDECAR_FIELDS) {
		if (fm[key] === undefined || fm[key] === null || fm[key] === '')
			errors.push(`${label}: missing required field "${key}"`);
	}
	if (fm.pass !== undefined && !(Number.isInteger(fm.pass) && fm.pass >= 1))
		errors.push(`${label}: "pass" must be a positive integer, got "${fm.pass}"`);
	else if (fm.pass !== undefined && currentPass !== undefined && fm.pass !== currentPass)
		errors.push(
			`${label}: "pass" (${fm.pass}) does not match ${subjectKey} "${subjectId}"'s current pass (${currentPass}) — this sidecar reviewed an older revision; update or remove it`
		);
	// Presence, not truthiness — a falsy-but-present value (`verdict: 0`,
	// `created: 0`) must still hit these validators, or a numeric zero
	// silently skips the enum/date check while satisfying the required-field
	// presence loop above.
	if (fm.verdict !== undefined && !VERDICTS.includes(fm.verdict))
		errors.push(`${label}: invalid verdict "${fm.verdict}" (allowed: ${VERDICTS.join(', ')})`);
	if (fm.reviewer !== undefined && typeof fm.reviewer !== 'string')
		errors.push(`${label}: "reviewer" must be a string, got ${typeof fm.reviewer}`);
	if (fm.created !== undefined && !isValidISODate(fm.created))
		errors.push(`${label}: "created" is not a valid ISO calendar date (YYYY-MM-DD): "${fm.created}"`);
	// §4's `reviewed_commit`: the revision the scorer actually read. Nothing
	// emits it yet, so only its shape is pinned — an id that is not a git object
	// name makes the score untraceable, which is the whole point of the field.
	if (fm.reviewed_commit !== undefined && !COMMIT_RE.test(String(fm.reviewed_commit)))
		errors.push(
			`${label}: "reviewed_commit" must be a 7-40 character lowercase hex commit sha, got "${fm.reviewed_commit}"`
		);

	// Axes: `score_<axis>` -> canonical name, restricted to the rubric the
	// subject is actually gated by. An axis that resolves in the global
	// registry but does not belong to THIS subject's rubric is a cross-gate
	// mistake (a proposal scored on G2's `slice_size`, say) — rejected the same
	// as an unrecognised axis, not silently folded into the mean.
	const rubric = RUBRICS[subjectKey];
	const axes = {};
	const seenBy = new Map(); // canonical name -> the raw key that claimed it
	for (const [key, raw] of Object.entries(fm)) {
		if (!key.startsWith(SCORE_PREFIX)) continue;
		const slug = key.slice(SCORE_PREFIX.length);
		const axis = resolveAxis(slug);
		if (!axis) {
			errors.push(`${label}: unknown score axis "${key}" (allowed: ${axisNames().join(', ')})`);
			continue;
		}
		if (rubric && !rubric.required.includes(axis.name)) {
			errors.push(
				`${label}: "${key}" (axis "${axis.name}") is not part of the ${rubric.gate} rubric for a "${subjectKey}" sidecar (allowed: ${rubric.required.join(', ')})`
			);
			continue;
		}
		const previous = seenBy.get(axis.name);
		if (previous !== undefined) {
			errors.push(
				`${label}: axis "${axis.name}" is scored twice (as "${previous}" and "${key}") — an alias and its canonical name are the same axis`
			);
			continue;
		}
		seenBy.set(axis.name, key);
		const value = asNumber(raw);
		if (value === null || !Number.isInteger(value) || value < 0 || value > 10) {
			errors.push(`${label}: "${key}" must be an integer 0-10, got "${raw}"`);
			continue;
		}
		axes[axis.name] = value;
	}

	// A score is only derived once the rubric is COMPLETE — a subset (however
	// high it averages) is incomplete evidence, not a lower score, so it
	// publishes no gate at all rather than a gate the rubric never actually
	// earned. A subject with no declared rubric (there is none today) has no
	// axis set and no threshold, so it publishes nothing either.
	const rubricComplete = Boolean(rubric) && rubric.required.every((name) => name in axes);
	const rawScore = rubricComplete ? computeScore(axes) : null;
	// A `pending` review has made no decision yet — its axis mean is not
	// published as an effective score/gate/chip, however high it is. See the
	// VETO_VERDICTS comment above.
	const score = fm.verdict === 'pending' ? null : rawScore;
	// `gate` from this gate's threshold, `chip` from §4's universal colour
	// scale — a score-6 G1 proposal is `pass` and amber at the same time.
	let band = score === null ? null : { gate: gateFor(score, subjectKey), chip: chipFor(score) };
	// A reviewer veto overrides a passing numeric mean — see VETO_VERDICTS.
	if (band && VETO_VERDICTS.includes(fm.verdict)) band = VETO_BAND;

	// A declared value is a cross-check, never the source of truth.
	for (const [key, derived] of [
		['score', score],
		['gate', band?.gate ?? null],
		['chip', band?.chip ?? null]
	]) {
		if (fm[key] === undefined || fm[key] === '') continue;
		if (derived === null) {
			// Name the rule that actually suppressed it — see nullScoreReason.
			errors.push(`${label}: "${key}" is declared but ${nullScoreReason(fm, rubric, axes, subjectKey)}`);
			continue;
		}
		const declared = key === 'score' ? asNumber(fm[key]) : fm[key];
		if (declared === null || declared !== derived)
			errors.push(
				`${label}: "${key}" is "${fm[key]}" but the axes derive "${derived}" — sidecars publish the derived value`
			);
	}

	if (errors.length) return { errors, review: null };

	const review = {
		pass: fm.pass,
		verdict: fm.verdict,
		reviewer: fm.reviewer,
		created: fm.created
	};
	if (fm.reviewed_commit !== undefined) review.reviewed_commit = String(fm.reviewed_commit);
	if (score !== null) {
		review.score = score;
		review.gate = band.gate;
		review.chip = band.chip;
		// Ordered by the registry, not by frontmatter order, so the published
		// artifact is stable when a producer reorders its keys.
		review.axes = Object.fromEntries(
			SCORE_AXES.filter((a) => a.name in axes).map((a) => [a.name, axes[a.name]])
		);
	}
	return { errors: [], review };
}

/**
 * Read and validate every sidecar in `dir`.
 *
 * An orphan sidecar — one whose id names no artifact in `knownIds` — is an
 * error, not a skip: it is exactly the stale-artifact failure this spec exists
 * to kill, and a silent skip would let a renamed spec quietly abandon its
 * review record.
 *
 * `passById`, when given, maps subject id -> the artifact's current `pass`;
 * a sidecar whose own `pass` disagrees is stale evidence and fails to
 * validate (see parseReviewSidecar). Proposals have no `pass` concept, so
 * callers that omit it skip the freshness check entirely.
 *
 * @returns {{ errors: string[], byId: Map<string, object> }}
 */
export function readReviewSidecars(dir, { subjectKey, knownIds, passById }) {
	const errors = [];
	const byId = new Map();
	for (const name of readdirSync(dir)
		.filter((f) => f.endsWith(REVIEW_SUFFIX))
		.sort()) {
		const label = join(dir, name);
		const subjectId = name.slice(0, -REVIEW_SUFFIX.length);
		if (!knownIds.has(subjectId)) {
			errors.push(
				`${label}: no ${subjectKey} "${subjectId}" exists — a review sidecar must sit next to the artifact it reviewed`
			);
			continue;
		}
		const { errors: fileErrors, review } = parseReviewSidecar(label, readFileSync(label, 'utf8'), {
			subjectKey,
			subjectId,
			currentPass: passById?.get(subjectId)
		});
		errors.push(...fileErrors);
		if (review) byId.set(subjectId, review);
	}
	return { errors, byId };
}
