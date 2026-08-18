// Fixture tests for the spec-index --check gate's hardening logic (see
// scripts/spec-index.mjs's header comment). Run with: node --test scripts
//
// These exercise the pure helpers directly rather than shelling out to
// `spec-index.mjs --check` against real files, so each case is a minimal,
// isolated repro of the failure mode it guards against.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import {
	missingRequiredHeadings,
	findScalarArrayViolations,
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
