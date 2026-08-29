// Fixture tests for the gate review sidecar schema (scripts/review-sidecar.mjs,
// spec 2026-08-17-sdlc-phase-gates-scoring-spec §4). Run with: node --test scripts
//
// Each case is a minimal repro of one way a sidecar can be wrong. The two
// integration cases at the bottom drive the real CLIs against a temp checkout,
// because "the gate is wired in" is a different claim from "the helper works".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	CHIP_BANDS,
	REQUIRED_SIDECAR_FIELDS,
	RUBRICS,
	SCORE_AXES,
	VETO_VERDICTS,
	axisNames,
	chipFor,
	computeScore,
	gateFor,
	parseReviewSidecar,
	readReviewSidecars,
	resolveAxis
} from './review-sidecar.mjs';
import { VERDICTS } from './spec-frontmatter.mjs';

const SUBJECT = { subjectKey: 'spec', subjectId: 'a-spec' };
const PROPOSAL_SUBJECT = { subjectKey: 'proposal', subjectId: 'a-proposal' };

// The control case: the full G2 rubric (§3), all six axes.
const VALID = `---
spec: a-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-28
score_slice_size: 8
score_dod_verifiability: 9
score_scope_containment: 9
score_impact_zones: 9
score_collisions: 9
score_testability: 9
---

# Pass 2 review
`;

const sidecar = (frontmatter) => `---\n${frontmatter}\n---\n\n# Pass 2 review\n`;
const BASE_FIELDS = ['spec: a-spec', 'pass: 2', 'verdict: approved', 'reviewer: factory-review', 'created: 2026-08-28'];
const withFields = (...extra) => sidecar([...BASE_FIELDS, ...extra].join('\n'));
const PROPOSAL_BASE_FIELDS = [
	'proposal: a-proposal',
	'pass: 1',
	'verdict: approved',
	'reviewer: proposal-gate-agent',
	'created: 2026-08-28'
];
const withProposalFields = (...extra) => sidecar([...PROPOSAL_BASE_FIELDS, ...extra].join('\n'));

test('the shipped G2 sidecar shape validates and derives its score, gate and chip', () => {
	const { errors, review } = parseReviewSidecar('specs/a-spec.review.md', VALID, SUBJECT);
	assert.deepEqual(errors, []);
	assert.equal(review.score, 8.8); // (8+9+9+9+9+9)/6 = 8.8333 -> 8.8
	assert.equal(review.gate, 'pass');
	assert.equal(review.chip, 'green');
	assert.deepEqual(review.axes, {
		slice_size: 8,
		dod_verifiability: 9,
		scope_containment: 9,
		impact_zones: 9,
		collisions: 9,
		testability: 9
	});
	assert.equal(review.pass, 2);
	assert.equal(review.verdict, 'approved');
	assert.equal(review.reviewer, 'factory-review');
	assert.equal(review.created, '2026-08-28');
	assert.equal('reviewed_commit' in review, false);
});

test('an unscored sidecar is valid and simply carries no chip', () => {
	const { errors, review } = parseReviewSidecar('specs/a-spec.review.md', withFields(), SUBJECT);
	assert.deepEqual(errors, []);
	assert.equal('score' in review, false);
	assert.equal('gate' in review, false);
	assert.equal('chip' in review, false);
	assert.equal('axes' in review, false);
});

test('H2: an incomplete G2 rubric (missing collisions/testability) publishes no gate, never green', () => {
	// The exact shape the live pass-2 reviewer writes today — four axes, no
	// collisions/testability. Before the fix this derived score 8.8/pass/green.
	const legacyFourAxis = withFields(
		'score_slice_size: 8',
		'score_dod_verifiability: 9',
		'score_scope_containment: 9',
		'score_impact_zones: 9'
	);
	const { errors, review } = parseReviewSidecar('specs/a-spec.review.md', legacyFourAxis, SUBJECT);
	assert.deepEqual(errors, []);
	assert.equal('score' in review, false);
	assert.equal('gate' in review, false);
	assert.equal('chip' in review, false);
	assert.equal('axes' in review, false);
});

test('H2: a proposal scored only on a G2 axis is rejected, not published green', () => {
	// The exact regression a focused parser call reproduced: a G1 (proposal)
	// sidecar carrying only `score_slice_size`, a G2-only axis.
	const { errors, review } = parseReviewSidecar(
		'proposals/a-proposal.review.md',
		withProposalFields('score_slice_size: 10'),
		PROPOSAL_SUBJECT
	);
	assert.equal(review, null);
	assert.match(errors.join('\n'), /"score_slice_size".*axis "slice_size".*not part of the G1 rubric/);
});

test('H2: the full G1 rubric derives a score; a partial G1 rubric derives none', () => {
	const complete = withProposalFields(
		'score_problem_clarity: 7',
		'score_value: 7',
		'score_dod_verifiability: 7',
		'score_scope_containment: 7',
		'score_dedupe: 7'
	);
	const { errors, review } = parseReviewSidecar('proposals/a-proposal.review.md', complete, PROPOSAL_SUBJECT);
	assert.deepEqual(errors, []);
	assert.equal(review.score, 7);
	assert.equal(review.gate, 'pass');

	const partial = withProposalFields('score_problem_clarity: 7', 'score_value: 7', 'score_dedupe: 7');
	const partialResult = parseReviewSidecar('proposals/a-proposal.review.md', partial, PROPOSAL_SUBJECT);
	assert.deepEqual(partialResult.errors, []);
	assert.equal('score' in partialResult.review, false);
});

test('H1: a reviewer veto (changes_requested/rejected/revision-required) can never publish a pass/green gate', () => {
	for (const verdict of VETO_VERDICTS) {
		const src = VALID.replace('verdict: approved', `verdict: ${verdict}`);
		const { errors, review } = parseReviewSidecar('specs/a-spec.review.md', src, SUBJECT);
		assert.deepEqual(errors, [], verdict);
		// The axes alone would derive pass/green (score 8.8); the veto forces block/red.
		assert.equal(review.gate, 'block', verdict);
		assert.equal(review.chip, 'red', verdict);
	}
	// 'pending' and 'approved' are not vetoes — the axis-derived band stands.
	for (const verdict of ['pending', 'approved']) {
		const src = VALID.replace('verdict: approved', `verdict: ${verdict}`);
		const { review } = parseReviewSidecar('specs/a-spec.review.md', src, SUBJECT);
		assert.equal(review.gate, 'pass', verdict);
	}
});

test('H1: a declared gate/chip contradicting the vetoed band fails the build', () => {
	const src = VALID.replace('verdict: approved', 'verdict: changes_requested').replace(
		'---\n\n# Pass 2',
		'gate: pass\nchip: green\n---\n\n# Pass 2'
	);
	const { errors } = parseReviewSidecar('specs/a-spec.review.md', src, SUBJECT);
	assert.match(errors.join('\n'), /"gate" is "pass" but the axes derive "block"/);
});

test('a file with no frontmatter is rejected — every *.review.md is a sidecar', () => {
	const { errors, review } = parseReviewSidecar('specs/a-spec.review.md', '# Just a memo\n', SUBJECT);
	assert.equal(review, null);
	assert.match(errors[0], /missing frontmatter/);
});

test('the subject id must match the filename, so a renamed spec cannot keep a stale review', () => {
	const { errors } = parseReviewSidecar(
		'specs/a-spec.review.md',
		withFields().replace('spec: a-spec', 'spec: some-other-spec'),
		SUBJECT
	);
	assert.match(errors.join('\n'), /"spec" \("some-other-spec"\) must match the filename's id \("a-spec"\)/);
});

test('every required field is individually enforced', () => {
	for (const field of [...REQUIRED_SIDECAR_FIELDS, 'spec']) {
		const src = withFields()
			.split('\n')
			.filter((line) => !line.startsWith(`${field}:`))
			.join('\n');
		const { errors } = parseReviewSidecar('specs/a-spec.review.md', src, SUBJECT);
		assert.match(errors.join('\n'), new RegExp(`missing required field "${field}"`), `field ${field}`);
	}
});

test('the verdict vocabulary is shared with the spec frontmatter gate', () => {
	for (const verdict of VERDICTS) {
		const { errors } = parseReviewSidecar(
			'specs/a-spec.review.md',
			withFields().replace('verdict: approved', `verdict: ${verdict}`),
			SUBJECT
		);
		assert.deepEqual(errors, [], `verdict ${verdict}`);
	}
	const { errors } = parseReviewSidecar(
		'specs/a-spec.review.md',
		withFields().replace('verdict: approved', 'verdict: looks-fine'),
		SUBJECT
	);
	assert.match(errors.join('\n'), /invalid verdict "looks-fine"/);
});

test('an unknown score axis is rejected with the registry printed — a typo must not become an axis', () => {
	const { errors } = parseReviewSidecar('specs/a-spec.review.md', withFields('score_slize_size: 8'), SUBJECT);
	assert.match(errors.join('\n'), /unknown score axis "score_slize_size"/);
	assert.match(errors.join('\n'), /slice_size/);
});

test('§4 shorthand axis names resolve to the same canonical axes the live reviewer writes', () => {
	const { errors, review } = parseReviewSidecar(
		'specs/a-spec.review.md',
		withFields(
			'score_slice_size: 6',
			'score_dod: 6',
			'score_out_of_scope: 6',
			'score_impact: 6',
			'score_collisions: 6',
			'score_testability: 6'
		),
		SUBJECT
	);
	assert.deepEqual(errors, []);
	assert.deepEqual(review.axes, {
		slice_size: 6,
		dod_verifiability: 6,
		scope_containment: 6,
		impact_zones: 6,
		collisions: 6,
		testability: 6
	});
});

test('an alias and its canonical name are the same axis, so scoring both is rejected', () => {
	const { errors } = parseReviewSidecar(
		'specs/a-spec.review.md',
		withFields('score_dod: 6', 'score_dod_verifiability: 9'),
		SUBJECT
	);
	assert.match(errors.join('\n'), /axis "dod_verifiability" is scored twice/);
});

test('out-of-range and non-integer axis values are rejected (the flat parser leaves them as strings)', () => {
	for (const raw of ['11', '-1', '7.5', 'high', '']) {
		const { errors } = parseReviewSidecar('specs/a-spec.review.md', withFields(`score_slice_size: ${raw}`), SUBJECT);
		assert.match(errors.join('\n'), /"score_slice_size" must be an integer 0-10/, `value ${JSON.stringify(raw)}`);
	}
});

test('a declared score that disagrees with its axes fails the build', () => {
	const { errors } = parseReviewSidecar('specs/a-spec.review.md', VALID.replace('---\n\n# Pass 2', 'score: 9.9\n---\n\n# Pass 2'), SUBJECT);
	assert.match(errors.join('\n'), /"score" is "9\.9" but the axes derive "8\.8"/);
});

test('a declared score matching its axes is accepted (§4 writes the field explicitly)', () => {
	const { errors, review } = parseReviewSidecar(
		'specs/a-spec.review.md',
		VALID.replace('---\n\n# Pass 2', 'score: 8.8\ngate: pass\nchip: green\n---\n\n# Pass 2'),
		SUBJECT
	);
	assert.deepEqual(errors, []);
	assert.equal(review.score, 8.8);
});

test('a declared score with no axes to derive from is rejected', () => {
	const { errors } = parseReviewSidecar('specs/a-spec.review.md', withFields('score: 7'), SUBJECT);
	assert.match(errors.join('\n'), /"score" is declared but no score_\* axis is/);
});

test('reviewed_commit must look like a git object name, or the score is untraceable', () => {
	const ok = parseReviewSidecar('specs/a-spec.review.md', withFields('reviewed_commit: abc1234'), SUBJECT);
	assert.deepEqual(ok.errors, []);
	assert.equal(ok.review.reviewed_commit, 'abc1234');
	const bad = parseReviewSidecar('specs/a-spec.review.md', withFields('reviewed_commit: HEAD~2'), SUBJECT);
	assert.match(bad.errors.join('\n'), /"reviewed_commit" must be a 7-40 character lowercase hex commit sha/);
});

test('pass must be a positive integer', () => {
	const { errors } = parseReviewSidecar('specs/a-spec.review.md', withFields().replace('pass: 2', 'pass: zero'), SUBJECT);
	assert.match(errors.join('\n'), /"pass" must be a positive integer/);
});

test('created must be a calendar-valid ISO date', () => {
	const { errors } = parseReviewSidecar(
		'specs/a-spec.review.md',
		withFields().replace('created: 2026-08-28', 'created: 2026-02-30'),
		SUBJECT
	);
	assert.match(errors.join('\n'), /"created" is not a valid ISO calendar date/);
});

// §4 fixes the colour boundaries; a consumer that re-derives them from prose is
// how green/amber/red drifts. These pin them at the edges.
test('the chip colour scale matches §4 exactly at every boundary, for every subject', () => {
	assert.equal(chipFor(10), 'green');
	assert.equal(chipFor(7), 'green');
	assert.equal(chipFor(6.9), 'amber');
	assert.equal(chipFor(5), 'amber');
	assert.equal(chipFor(4.9), 'red');
	assert.equal(chipFor(0), 'red');
	assert.equal(CHIP_BANDS.length, 3);
});

// M1: the promote decision belongs to the gate that scored the artifact, not to
// one shared table. G2 has three bands (§3 "pass >= 7 / warn 5-6 / block < 5");
// G1 has a single cutoff at 6 ("threshold 6 to enable 'spec it'").
test('M1: each gate bands the score with its own §3 threshold', () => {
	assert.equal(gateFor(10, 'spec'), 'pass');
	assert.equal(gateFor(7, 'spec'), 'pass');
	assert.equal(gateFor(6.9, 'spec'), 'warn');
	assert.equal(gateFor(5, 'spec'), 'warn');
	assert.equal(gateFor(4.9, 'spec'), 'block');
	assert.equal(gateFor(0, 'spec'), 'block');

	assert.equal(gateFor(7, 'proposal'), 'pass');
	assert.equal(gateFor(6, 'proposal'), 'pass'); // the eligibility boundary itself
	assert.equal(gateFor(5.9, 'proposal'), 'block');
	assert.equal(gateFor(5, 'proposal'), 'block'); // below threshold, and NOT the same state as 6
	assert.equal(gateFor(0, 'proposal'), 'block');

	// No rubric, no threshold to guess at.
	assert.equal(gateFor(10, 'not_a_subject'), null);
});

test('M1: a score-6 G1 review is gate:pass with an amber chip — gate and colour are independent', () => {
	const atThreshold = withProposalFields(
		'score_problem_clarity: 6',
		'score_value: 6',
		'score_dod_verifiability: 6',
		'score_scope_containment: 6',
		'score_dedupe: 6'
	);
	const { errors, review } = parseReviewSidecar('proposals/a-proposal.review.md', atThreshold, PROPOSAL_SUBJECT);
	assert.deepEqual(errors, []);
	assert.equal(review.score, 6);
	assert.equal(review.gate, 'pass');
	assert.equal(review.chip, 'amber'); // §4 colours the number; §3 gates the promotion

	// One axis lower is 5.8 — below G1's threshold, so blocked, yet still amber.
	const belowThreshold = atThreshold.replace('score_dedupe: 6', 'score_dedupe: 5');
	const below = parseReviewSidecar('proposals/a-proposal.review.md', belowThreshold, PROPOSAL_SUBJECT);
	assert.deepEqual(below.errors, []);
	assert.equal(below.review.score, 5.8);
	assert.equal(below.review.gate, 'block');
	assert.equal(below.review.chip, 'amber');
});

test('M1: a score-6 spec review stays warn — G1 threshold must not leak into G2', () => {
	const { errors, review } = parseReviewSidecar(
		'specs/a-spec.review.md',
		withFields(
			'score_slice_size: 6',
			'score_dod_verifiability: 6',
			'score_scope_containment: 6',
			'score_impact_zones: 6',
			'score_collisions: 6',
			'score_testability: 6'
		),
		SUBJECT
	);
	assert.deepEqual(errors, []);
	assert.equal(review.score, 6);
	assert.equal(review.gate, 'warn');
	assert.equal(review.chip, 'amber');
});

test('M1: every rubric declares bands that cover 0-10 and only use the gate vocabulary', () => {
	for (const [subject, rubric] of Object.entries(RUBRICS)) {
		assert.ok(rubric.bands.length > 0, `${subject} needs bands`);
		assert.equal(rubric.bands.at(-1).min, 0, `${subject}'s last band must catch 0`);
		for (const band of rubric.bands) assert.ok(['pass', 'warn', 'block'].includes(band.gate));
		// Ordered highest-first, or `.find()` returns the wrong band.
		const mins = rubric.bands.map((b) => b.min);
		assert.deepEqual(mins, [...mins].sort((a, b) => b - a), `${subject}'s bands must be ordered highest-first`);
	}
});

test('computeScore is the weighted mean, rounded to one decimal, and null when nothing is scored', () => {
	assert.equal(computeScore({}), null);
	assert.equal(computeScore({ slice_size: 8, dod_verifiability: 9, scope_containment: 9, impact_zones: 9 }), 8.8);
	assert.equal(computeScore({ slice_size: 3 }), 3);
	assert.equal(computeScore({ slice_size: 0, testability: 10 }), 5);
});

test('every registry axis and alias resolves, and no slug is claimed twice', () => {
	const claimed = new Map();
	for (const axis of SCORE_AXES) {
		for (const slug of [axis.name, ...axis.aliases]) {
			assert.equal(claimed.has(slug), false, `"${slug}" is claimed by two axes`);
			claimed.set(slug, axis.name);
			assert.equal(resolveAxis(slug).name, axis.name);
		}
		assert.ok(axis.weight > 0, `${axis.name} needs a positive weight`);
	}
	assert.equal(resolveAxis('not_an_axis'), undefined);
	assert.deepEqual(axisNames(), SCORE_AXES.map((a) => a.name));
});

test('readReviewSidecars rejects an orphan sidecar instead of skipping it', () => {
	const root = mkdtempSync(join(tmpdir(), 'sidecar-'));
	try {
		mkdirSync(join(root, 'specs'));
		writeFileSync(join(root, 'specs', 'ghost-spec.review.md'), withFields().replace('spec: a-spec', 'spec: ghost-spec'));
		const { errors, byId } = readReviewSidecars(join(root, 'specs'), {
			subjectKey: 'spec',
			knownIds: new Set(['a-spec'])
		});
		assert.equal(byId.size, 0);
		assert.match(errors.join('\n'), /no spec "ghost-spec" exists/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

// ---- integration: the gates are actually wired into the two CLIs ----

const REPO = process.cwd();

function scratchRepo() {
	const root = mkdtempSync(join(tmpdir(), 'sidecar-cli-'));
	mkdirSync(join(root, 'scripts'));
	// The whole non-test script set, for the same reason spec-index.test.mjs does
	// it: an enumerated list silently rots as the import graph grows.
	for (const file of readdirSync(join(REPO, 'scripts')).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs')))
		cpSync(join(REPO, 'scripts', file), join(root, 'scripts', file));
	mkdirSync(join(root, 'specs'));
	cpSync(join(REPO, 'specs', 'topics.json'), join(root, 'specs', 'topics.json'));
	mkdirSync(join(root, 'proposals'));
	return root;
}

const SPEC_BODY = `# A spec

## 0. Product

Why.

## Out of scope

Not that.

## Verification

Run it.
`;

const SPEC = `---
id: a-spec
title: A spec
stage: spec
status: draft
pass: 2
created: 2026-08-28
updated: 2026-08-28
repos: [minion-meta]
---

${SPEC_BODY}`;

test('integration: spec-index publishes the sidecar score into specs/index.json', () => {
	const root = scratchRepo();
	try {
		writeFileSync(join(root, 'specs', 'a-spec.md'), SPEC);
		writeFileSync(join(root, 'specs', 'a-spec.review.md'), VALID);
		const result = spawnSync('node', ['scripts/spec-index.mjs'], { cwd: root, encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
		const index = JSON.parse(readFileSync(join(root, 'specs', 'index.json'), 'utf8'));
		assert.deepEqual(index.specs[0].review, {
			pass: 2,
			verdict: 'approved',
			reviewer: 'factory-review',
			created: '2026-08-28',
			score: 8.8,
			gate: 'pass',
			chip: 'green',
			axes: {
				slice_size: 8,
				dod_verifiability: 9,
				scope_containment: 9,
				impact_zones: 9,
				collisions: 9,
				testability: 9
			}
		});
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('M1: spec-index fails closed on a sidecar whose pass does not match the spec\'s current pass', () => {
	const root = scratchRepo();
	try {
		// The live failure: a spec moved on to pass 5 while its sidecar still
		// reviewed pass 2 — the stale sidecar must not attach as current evidence.
		writeFileSync(join(root, 'specs', 'a-spec.md'), SPEC.replace('pass: 2', 'pass: 5'));
		writeFileSync(join(root, 'specs', 'a-spec.review.md'), VALID);
		const result = spawnSync('node', ['scripts/spec-index.mjs'], { cwd: root, encoding: 'utf8' });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /"pass" \(2\) does not match spec "a-spec"'s current pass \(5\)/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('integration: an invalid sidecar fails spec-index in write mode, not just --check', () => {
	const root = scratchRepo();
	try {
		writeFileSync(join(root, 'specs', 'a-spec.md'), SPEC);
		writeFileSync(join(root, 'specs', 'a-spec.review.md'), withFields('score_slice_size: 44'));
		const result = spawnSync('node', ['scripts/spec-index.mjs'], { cwd: root, encoding: 'utf8' });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /"score_slice_size" must be an integer 0-10/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('integration: proposal-index publishes a G1 sidecar under the same field name', () => {
	const root = scratchRepo();
	try {
		writeFileSync(
			join(root, 'proposals', 'a-proposal.md'),
			`---\nid: a-proposal\ntitle: A proposal\nstatus: draft\ncreated: 2026-08-28\nrepos: [minion-meta]\n---\n\n# A proposal\n`
		);
		writeFileSync(
			join(root, 'proposals', 'a-proposal.review.md'),
			sidecar(
				[
					'proposal: a-proposal',
					'pass: 1',
					'verdict: changes_requested',
					'reviewer: proposal-gate-agent',
					'created: 2026-08-28',
					// The full G1 rubric (§3) — problem/value/dod/out-of-scope/dedupe.
					'score_problem_clarity: 4',
					'score_value: 5',
					'score_dod_verifiability: 4',
					'score_scope_containment: 5',
					'score_dedupe: 3'
				].join('\n')
			)
		);
		const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
		const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
		assert.equal(index.proposals[0].review.score, 4.2);
		assert.equal(index.proposals[0].review.gate, 'block');
		assert.equal(index.proposals[0].review.chip, 'red');
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

const PROPOSAL = `---\nid: a-proposal\ntitle: A proposal\nstatus: draft\ncreated: 2026-08-28\nrepos: [minion-meta]\n---\n\n# A proposal\n`;

// M1 end to end: the board reads `review.gate` out of proposals/index.json, so
// the G1 threshold has to survive the CLI, not just the helper.
test('M1 integration: proposal-index publishes gate:pass at G1 score 6 and gate:block just below', () => {
	for (const [dedupe, score, gate] of [
		[6, 6, 'pass'],
		[5, 5.8, 'block']
	]) {
		const root = scratchRepo();
		try {
			writeFileSync(join(root, 'proposals', 'a-proposal.md'), PROPOSAL);
			writeFileSync(
				join(root, 'proposals', 'a-proposal.review.md'),
				sidecar(
					[
						...PROPOSAL_BASE_FIELDS,
						'score_problem_clarity: 6',
						'score_value: 6',
						'score_dod_verifiability: 6',
						'score_scope_containment: 6',
						`score_dedupe: ${dedupe}`
					].join('\n')
				)
			);
			const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
			assert.equal(result.status, 0, result.stderr);
			const index = JSON.parse(readFileSync(join(root, 'proposals', 'index.json'), 'utf8'));
			assert.equal(index.proposals[0].review.score, score);
			assert.equal(index.proposals[0].review.gate, gate);
			assert.equal(index.proposals[0].review.chip, 'amber');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}
});

test('integration: a proposal sidecar keyed "spec" instead of "proposal" fails closed', () => {
	const root = scratchRepo();
	try {
		writeFileSync(
			join(root, 'proposals', 'a-proposal.md'),
			`---\nid: a-proposal\ntitle: A proposal\nstatus: draft\ncreated: 2026-08-28\nrepos: [minion-meta]\n---\n\n# A proposal\n`
		);
		writeFileSync(
			join(root, 'proposals', 'a-proposal.review.md'),
			sidecar(['spec: a-proposal', 'pass: 1', 'verdict: approved', 'reviewer: g1', 'created: 2026-08-28'].join('\n'))
		);
		const result = spawnSync('node', ['scripts/proposal-index.mjs'], { cwd: root, encoding: 'utf8' });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /missing required field "proposal"/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
