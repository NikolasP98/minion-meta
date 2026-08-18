// Fixture tests for the spec-index --check gate's hardening logic (see
// scripts/spec-index.mjs's header comment). Run with: node --test scripts
//
// These exercise the pure helpers directly rather than shelling out to
// `spec-index.mjs --check` against real files, so each case is a minimal,
// isolated repro of the failure mode it guards against.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import {
	missingRequiredHeadings,
	findScalarArrayViolations,
	findScalarStringViolations,
	checkHeadingBaselineRatchet,
	checkSupersedeBaselineRatchet
} from './spec-index.mjs';

// A body with all three required sections present in real (heading) form —
// the control case every negative fixture below is a variant of.
const VALID_BODY = `# Title

## 0. Product

Why this exists.

## Out of scope

Not doing X.

## Verification

Run the thing.
`;

test('missingRequiredHeadings: a fully-formed body has none missing', () => {
	assert.deepEqual(missingRequiredHeadings(VALID_BODY), []);
});

test('M1: a closing fence longer than its opener still hides the headings inside', () => {
	const body = `# Title

\`\`\`
## 0. Product
## Out of scope
## Verification
\`\`\`\`
`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('M1: an unclosed fence consumes the rest of the document', () => {
	const body = `# Title

\`\`\`
## 0. Product
## Out of scope
## Verification
`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('M1: headings inside an HTML comment do not count', () => {
	const body = `# Title

<!--
## 0. Product
## Out of scope
## Verification
-->
`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('M1: an unclosed HTML comment consumes the rest of the document', () => {
	const body = `# Title

<!--
## 0. Product
## Out of scope
## Verification
`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('M1: bold prose that merely mentions the keyword (no colon label) does not satisfy the gate', () => {
	const body = `# Title

## 0. Product

Why this exists.

**Out of scope is not decided yet, we will figure it out later**

**Verification will be decided later**
`;
	const missing = missingRequiredHeadings(body);
	assert.equal(missing.length, 2);
});

test('M1: a real bold-label (with colon) still satisfies the gate', () => {
	const body = `# Title

## 0. Product

Why this exists.

**Out of scope:** not doing X.

**Verification:** run the thing.
`;
	assert.deepEqual(missingRequiredHeadings(body), []);
});

test('M1: a valid same-length fence still hides headings (regression guard)', () => {
	const body = `# Title

\`\`\`
## 0. Product
## Out of scope
## Verification
\`\`\`
`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('M3: title accepts bracket/array syntax at parse time, and the validator must reject it', () => {
	const src = `---
id: fixture
title: [Fixture, Alternate]
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
---

body
`;
	const { fm } = parseFrontmatter(src);
	assert.ok(Array.isArray(fm.title), 'parser accepts array syntax for any key, including title');
	assert.deepEqual(findScalarArrayViolations(fm), ['title']);
});

test('M3: a scalar title produces no violation', () => {
	const src = `---
id: fixture
title: Fixture
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
---

body
`;
	const { fm } = parseFrontmatter(src);
	assert.deepEqual(findScalarArrayViolations(fm), []);
});

test('M2: a numeric title is rejected as a non-string scalar', () => {
	const { fm } = parseFrontmatter(`---\nid: fixture\ntitle: 123\n---\n\nbody\n`);
	assert.deepEqual(findScalarStringViolations(fm), ['title']);
});

test('M3: headings inside a raw HTML block do not count', () => {
	const body = `<div>\n## 0. Product\n## Out of scope\n## Verification\n</div>\n`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('M3: headings inside a lowercase multiline HTML declaration do not count', () => {
	const body = `<!doctype\n## 0. Product\n## Out of scope\n## Verification\n>\n`;
	assert.equal(missingRequiredHeadings(body).length, 3);
});

test('L1: a Product-prefix heading does not satisfy the Product section', () => {
	const body = `## 0. Production notes\n\n## Out of scope\n\n## Verification\n`;
	assert.deepEqual(missingRequiredHeadings(body), ['"## 0. Product" section']);
});

test('M2: adding a brand-new id to an existing heading baseline is rejected', () => {
	const base = { 'existing-spec': 'aaa' };
	const current = { 'existing-spec': 'aaa', 'new-spec': 'bbb' };
	const errors = checkHeadingBaselineRatchet(base, current);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /new id "new-spec" added/);
});

test('M2: rewriting an existing hash in the heading baseline is rejected', () => {
	const base = { 'existing-spec': 'aaa' };
	const current = { 'existing-spec': 'changed-hash' };
	const errors = checkHeadingBaselineRatchet(base, current);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /hash for "existing-spec" changed/);
});

test('M2: removing an id from the heading baseline is allowed (the ratchet only shrinks)', () => {
	const base = { 'existing-spec': 'aaa', 'other-spec': 'bbb' };
	const current = { 'existing-spec': 'aaa' };
	assert.deepEqual(checkHeadingBaselineRatchet(base, current), []);
});

test('M2: adding a new id to the supersede baseline is rejected', () => {
	const base = ['legacy-a'];
	const current = ['legacy-a', 'newly-orphaned-spec'];
	const errors = checkSupersedeBaselineRatchet(base, current);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /new id "newly-orphaned-spec" added/);
});

test('M2: removing an id from the supersede baseline is allowed', () => {
	const base = ['legacy-a', 'legacy-b'];
	const current = ['legacy-a'];
	assert.deepEqual(checkSupersedeBaselineRatchet(base, current), []);
});

function makeCliFixture() {
	const root = mkdtempSync(join(tmpdir(), 'spec-index-cli-'));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'specs'));
	for (const name of ['spec-index.mjs', 'spec-frontmatter.mjs'])
		cpSync(new URL(name, import.meta.url), join(root, 'scripts', name));
	const spec = `---\nid: fixture\ntitle: Fixture\nstage: spec\nstatus: draft\npass: 1\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]\n---\n\n# Fixture\n`;
	writeFileSync(join(root, 'specs', 'fixture.md'), spec);
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'base'], { cwd: root });
	return root;
}

test('M1 integration: bootstrap baseline is checked against the base corpus when its file was absent', () => {
	const root = makeCliFixture();
	writeFileSync(join(root, 'scripts', 'spec-heading-lint-baseline.json'), '{}\n');
	writeFileSync(join(root, 'scripts', 'spec-supersede-baseline.json'), '[]\n');
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const baseline = JSON.parse(readFileSync(join(root, 'scripts', 'spec-heading-lint-baseline.json'), 'utf8'));
	baseline['new-spec'] = 'not-a-base-body-hash';
	writeFileSync(join(root, 'scripts', 'spec-heading-lint-baseline.json'), `${JSON.stringify(baseline)}\n`);
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'head'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH } });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /new id "new-spec" added/);
});

test('M1 integration: push-style check with no GITHUB_BASE_REF still compares against HEAD^', () => {
	const root = makeCliFixture();
	writeFileSync(join(root, 'scripts', 'spec-heading-lint-baseline.json'), '{"new-spec":"bad"}\n');
	writeFileSync(join(root, 'scripts', 'spec-supersede-baseline.json'), '[]\n');
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'head'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], { cwd: root, encoding: 'utf8', env: { PATH: process.env.PATH } });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /new id "new-spec" added/);
});

test('M1 integration: a three-commit push compares baselines with the pre-push SHA', () => {
	const root = makeCliFixture();
	const before = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
	const body = `# New malformed spec\n`;
	const spec = `---\nid: new-spec\ntitle: New spec\nstage: spec\nstatus: draft\npass: 1\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]\n---\n\n${body}`;
	writeFileSync(join(root, 'specs', 'new-spec.md'), spec);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'add malformed spec'], { cwd: root });
	const hash = createHash('sha256').update(body).digest('hex');
	writeFileSync(join(root, 'scripts', 'spec-heading-lint-baseline.json'), `${JSON.stringify({ 'new-spec': hash })}\n`);
	writeFileSync(join(root, 'scripts', 'spec-supersede-baseline.json'), '[]\n');
	execFileSync('git', ['add', '.'], { cwd: root });
	execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'grandfather malformed spec'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH, GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_BEFORE: before }
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /new id "new-spec" added/);
});

test('M2 integration: a spec cannot supersede itself', () => {
	const root = makeCliFixture();
	const spec = `---\nid: fixture\ntitle: Fixture\nstage: spec\nstatus: superseded\npass: 1\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]\nsupersedes: fixture\n---\n\n${VALID_BODY}`;
	writeFileSync(join(root, 'specs', 'fixture.md'), spec);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH }
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /cannot supersede itself/);
});

test('M1 integration: a push event without a before SHA fails closed', () => {
	const root = makeCliFixture();
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH, GITHUB_EVENT_NAME: 'push' }
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /cannot resolve comparison revision/);
});
