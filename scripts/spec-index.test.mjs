import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter, serializeFrontmatter } from './spec-frontmatter.mjs';
import { projectSpec, checkLinkHygiene, reconcileLinkHygiene, applyLinkHygiene, runIndex } from './spec-index.mjs';

const baseFm = {
	id: 'x',
	title: 'X',
	stage: 'spec',
	status: 'approved',
	created: '2026-08-18'
};

test('projectSpec includes possibly_shipped/evidence/link_review when set', () => {
	const entry = projectSpec({
		...baseFm,
		possibly_shipped: 'https://github.com/example/pr/1',
		evidence: 'https://github.com/example/pr/2',
		link_review: 'ambiguous supersedes link, needs human read'
	});
	assert.equal(entry.possibly_shipped, 'https://github.com/example/pr/1');
	assert.equal(entry.evidence, 'https://github.com/example/pr/2');
	assert.equal(entry.link_review, 'ambiguous supersedes link, needs human read');
});

test('projectSpec omits possibly_shipped/evidence/link_review keys entirely when unset', () => {
	const entry = projectSpec({ ...baseFm });
	assert.equal('possibly_shipped' in entry, false);
	assert.equal('evidence' in entry, false);
	assert.equal('link_review' in entry, false);
});

test('quoted scalar with embedded quotes round-trips without escape growth', () => {
	const expected = 'pass 2 has neither "revises" nor "supersedes"';
	const first = serializeFrontmatter({ id: 'quoted', link_review: expected });
	const parsed = parseFrontmatter(`${first}\n# Quoted\n`);
	assert.ok(parsed);
	assert.equal(parsed.fm.link_review, expected);

	const second = serializeFrontmatter(parsed.fm);
	assert.equal(second, first);
	const reparsed = parseFrontmatter(`${second}\n# Quoted\n`);
	assert.ok(reparsed);
	assert.equal(reparsed.fm.link_review, expected);
});

test('projectSpec never projects reconcile_ignore — no consumer reads it from index.json', () => {
	const entry = projectSpec({ ...baseFm, reconcile_ignore: 'true' });
	assert.equal('reconcile_ignore' in entry, false);
});

test('checkLinkHygiene errors on a dangling supersedes reference', () => {
	const specs = [{ id: 'new-spec', status: 'approved', supersedes: 'does-not-exist' }];
	const { errors } = checkLinkHygiene(specs);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /does-not-exist/);
});

test('checkLinkHygiene warns (non-fatal) when the superseded target is not flagged superseded', () => {
	const specs = [
		{ id: 'new-spec', status: 'approved', supersedes: 'old-spec' },
		{ id: 'old-spec', status: 'approved' }
	];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /old-spec/);
});

test('checkLinkHygiene warns (non-fatal) on an orphaned superseded spec with no successor link', () => {
	const specs = [{ id: 'lone-spec', status: 'superseded' }];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /lone-spec/);
});

test('checkLinkHygiene is clean for a correctly bidirectionally-linked pair', () => {
	const specs = [
		{ id: 'new-spec', status: 'approved', supersedes: 'old-spec' },
		{ id: 'old-spec', status: 'superseded' }
	];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 0);
});

test('checkLinkHygiene warns (non-fatal) on a pass>1 spec with neither revises nor supersedes', () => {
	const specs = [{ id: 'orphan-pass2', status: 'approved', pass: 2 }];
	const { errors, warnings } = checkLinkHygiene(specs);
	assert.equal(errors.length, 0);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /orphan-pass2/);
	assert.match(warnings[0], /pass 2/);
});

test('checkLinkHygiene is clean for a pass>1 spec that sets revises', () => {
	const specs = [
		{ id: 'pass2-spec', status: 'approved', pass: 2, revises: 'pass1-spec' },
		{ id: 'pass1-spec', status: 'superseded', supersedes: undefined }
	];
	const { warnings } = checkLinkHygiene(specs);
	assert.equal(warnings.filter((w) => w.includes('pass2-spec')).length, 0);
});

test('checkLinkHygiene treats pass 1 (default) as exempt from the lineage check', () => {
	const specs = [{ id: 'first-pass', status: 'draft' }];
	const { warnings } = checkLinkHygiene(specs);
	assert.equal(warnings.length, 0);
});

// --- reconcileLinkHygiene: auto-fix vs. flag ---

test('reconcileLinkHygiene auto-fixes an unambiguous supersedes-target status', () => {
	const specs = [
		{ id: 'new-spec', status: 'approved', supersedes: 'old-spec' },
		{ id: 'old-spec', status: 'approved' }
	];
	const { fixes, flags } = reconcileLinkHygiene(specs);
	assert.equal(fixes.length, 1);
	assert.deepEqual(fixes[0], {
		id: 'old-spec',
		field: 'status',
		value: 'superseded',
		reason: 'auto-set by G0 link hygiene: "new-spec" declares supersedes: old-spec'
	});
	assert.equal(flags.length, 0);
});

test('reconcileLinkHygiene flags (does not fix) an orphaned superseded spec', () => {
	const specs = [{ id: 'lone-spec', status: 'superseded' }];
	const { fixes, flags } = reconcileLinkHygiene(specs);
	assert.equal(fixes.length, 0);
	assert.equal(flags.length, 1);
	assert.equal(flags[0].id, 'lone-spec');
	assert.match(flags[0].reason, /no other spec's "supersedes" links back/);
});

test('reconcileLinkHygiene flags (does not fix) a pass>1 spec with no lineage link', () => {
	const specs = [{ id: 'orphan-pass2', status: 'approved', pass: 2 }];
	const { fixes, flags } = reconcileLinkHygiene(specs);
	assert.equal(fixes.length, 0);
	assert.equal(flags.length, 1);
	assert.equal(flags[0].id, 'orphan-pass2');
	assert.match(flags[0].reason, /pass 2/);
});

test('reconcileLinkHygiene is a no-op for a clean, bidirectionally-linked corpus', () => {
	const specs = [
		{ id: 'new-spec', status: 'approved', supersedes: 'old-spec' },
		{ id: 'old-spec', status: 'superseded' }
	];
	const { fixes, flags } = reconcileLinkHygiene(specs);
	assert.equal(fixes.length, 0);
	assert.equal(flags.length, 0);
});

// --- applyLinkHygiene: in-memory frontmatter mutation ---

test('applyLinkHygiene mutates the fixed field and bumps updated', () => {
	const fmById = new Map([
		['old-spec', { id: 'old-spec', status: 'approved', updated: '2026-08-01' }]
	]);
	const reconcile = {
		fixes: [{ id: 'old-spec', field: 'status', value: 'superseded', reason: 'x' }],
		flags: []
	};
	const changed = applyLinkHygiene(fmById, reconcile, '2026-08-18');
	assert.deepEqual([...changed], ['old-spec']);
	assert.equal(fmById.get('old-spec').status, 'superseded');
	assert.equal(fmById.get('old-spec').updated, '2026-08-18');
});

test('applyLinkHygiene writes link_review for a flagged spec and bumps updated', () => {
	const fmById = new Map([['lone-spec', { id: 'lone-spec', status: 'superseded', updated: '2026-08-01' }]]);
	const reconcile = { fixes: [], flags: [{ id: 'lone-spec', reason: 'needs a human read' }] };
	const changed = applyLinkHygiene(fmById, reconcile, '2026-08-18');
	assert.deepEqual([...changed], ['lone-spec']);
	assert.equal(fmById.get('lone-spec').link_review, 'needs a human read');
	assert.equal(fmById.get('lone-spec').updated, '2026-08-18');
});

test('applyLinkHygiene never overwrites an existing link_review', () => {
	const fmById = new Map([
		['lone-spec', { id: 'lone-spec', status: 'superseded', link_review: 'already reviewed by a human', updated: '2026-08-01' }]
	]);
	const reconcile = { fixes: [], flags: [{ id: 'lone-spec', reason: 'new G0 text' }] };
	const changed = applyLinkHygiene(fmById, reconcile, '2026-08-18');
	assert.equal(changed.size, 0);
	assert.equal(fmById.get('lone-spec').link_review, 'already reviewed by a human');
	assert.equal(fmById.get('lone-spec').updated, '2026-08-01');
});

test('applyLinkHygiene is idempotent — a fix already applied produces no further change', () => {
	const fmById = new Map([['old-spec', { id: 'old-spec', status: 'superseded', updated: '2026-08-01' }]]);
	const reconcile = { fixes: [{ id: 'old-spec', field: 'status', value: 'superseded', reason: 'x' }], flags: [] };
	const changed = applyLinkHygiene(fmById, reconcile, '2026-08-18');
	assert.equal(changed.size, 0);
	assert.equal(fmById.get('old-spec').updated, '2026-08-01');
});

// --- runIndex: end-to-end frontmatter + index.json mutation on disk ---

function withFixtureSpecs(files, run) {
	const dir = mkdtempSync(join(tmpdir(), 'spec-index-test-'));
	for (const [name, fm] of Object.entries(files)) {
		writeFileSync(join(dir, name), serializeFrontmatter(fm) + `\n# ${fm.title ?? fm.id}\n`);
	}
	try {
		run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function readFm(dir, name) {
	const src = readFileSync(join(dir, name), 'utf8');
	const end = src.indexOf('\n---\n', 4);
	const fm = {};
	for (const line of src.slice(4, end).split('\n')) {
		const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
		if (m) fm[m[1]] = m[2].replace(/^"|"$/g, '');
	}
	return fm;
}

test('runIndex persists an unambiguous supersedes-target auto-fix to disk and to index.json', () => {
	withFixtureSpecs(
		{
			'2026-08-18-new-spec.md': {
				id: '2026-08-18-new-spec',
				title: 'New',
				stage: 'spec',
				status: 'approved',
				pass: 1,
				created: '2026-08-18',
				supersedes: '2026-08-01-old-spec'
			},
			'2026-08-01-old-spec.md': {
				id: '2026-08-01-old-spec',
				title: 'Old',
				stage: 'spec',
				status: 'approved',
				pass: 1,
				created: '2026-08-01'
			}
		},
		(dir) => {
			runIndex(dir);
			assert.equal(readFm(dir, '2026-08-01-old-spec.md').status, 'superseded');
			const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
			const old = index.specs.find((s) => s.id === '2026-08-01-old-spec');
			assert.equal(old.status, 'superseded');
		}
	);
});

test('runIndex persists link_review for an ambiguous pass>1 spec to disk and to index.json', () => {
	withFixtureSpecs(
		{
			'2026-08-18-orphan-pass2.md': {
				id: '2026-08-18-orphan-pass2',
				title: 'Orphan pass 2',
				stage: 'spec',
				status: 'approved',
				pass: 2,
				created: '2026-08-18'
			}
		},
		(dir) => {
			runIndex(dir);
			const fm = readFm(dir, '2026-08-18-orphan-pass2.md');
			assert.match(fm.link_review, /pass 2/);
			const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
			const entry = index.specs.find((s) => s.id === '2026-08-18-orphan-pass2');
			assert.match(entry.link_review, /pass 2/);
		}
	);
});

test('runIndex leaves an already-clean spec file untouched (no rewrite)', () => {
	withFixtureSpecs(
		{
			'2026-08-18-clean.md': {
				id: '2026-08-18-clean',
				title: 'Clean',
				stage: 'spec',
				status: 'draft',
				pass: 1,
				created: '2026-08-18'
			}
		},
		(dir) => {
			const before = readFileSync(join(dir, '2026-08-18-clean.md'), 'utf8');
			runIndex(dir);
			const after = readFileSync(join(dir, '2026-08-18-clean.md'), 'utf8');
			assert.equal(before, after);
		}
	);
});
