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
	findArrayFieldViolations,
	checkHeadingBaselineRatchet,
	checkSupersedeBaselineRatchet,
	findSupersedeCycles,
	assertProjectionCoverage,
	projectSpec,
	SCALAR_FIELDS,
	ARRAY_FIELDS,
	REQUIRED_INDEX_FIELDS,
	OPTIONAL_INDEX_FIELDS
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

test('M1: a bare scalar in an array field is rejected (bracket syntax is optional)', () => {
	const src = `---
id: fixture
title: Fixture
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
tags: infra
related: another-spec
---

body
`;
	const { fm } = parseFrontmatter(src);
	assert.equal(typeof fm.tags, 'string', 'parser leaves an unbracketed value a scalar');
	assert.deepEqual(findArrayFieldViolations(fm), [
		'"tags" must be an array of strings, got string ("infra")',
		'"related" must be an array of strings, got string ("another-spec")'
	]);
});

test('M1: bracketed array fields produce no violation', () => {
	const src = `---
id: fixture
title: Fixture
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
tags: [infra, test]
related: [another-spec]
---

body
`;
	assert.deepEqual(findArrayFieldViolations(parseFrontmatter(src).fm), []);
});

// The flat-YAML parser only ever yields string elements, so this guards the
// exported helper against non-parser callers (index.json consumers, retrofit
// tooling) rather than a shape the CLI can currently produce.
test('M1: non-string elements inside an array field are rejected', () => {
	assert.deepEqual(findArrayFieldViolations({ tags: ['infra', 7, null] }), [
		'"tags" must contain only strings (found number, object)'
	]);
});

test('M1: absent and valueless array fields are left to the required-field check', () => {
	assert.deepEqual(findArrayFieldViolations({}), []);
	assert.deepEqual(findArrayFieldViolations({ repos: '' }), []);
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

test('L1: a Product heading with no space after the marker or the number is rejected', () => {
	for (const heading of ['##0. Product', '## 0.Product', '##0.Product']) {
		const body = `${heading}\n\n## Out of scope\n\n## Verification\n`;
		assert.deepEqual(missingRequiredHeadings(body), ['"## 0. Product" section'], heading);
	}
});

test('L2: an "Unverified" section does not satisfy the Verification requirement', () => {
	for (const section of ['## Unverified assumptions', '**Unverified assumptions:**']) {
		const body = `## 0. Product\n\n## Out of scope\n\n${section}\n`;
		assert.deepEqual(
			missingRequiredHeadings(body),
			['a verification section (a heading or a **Verification:** label)'],
			section
		);
	}
});

test('L2: the documented verification labels still satisfy the requirement', () => {
	for (const section of [
		'## Verification',
		'## 6. End-to-end verification',
		'## 3. Verification (definition of done)',
		'**Verification:**',
		'**Verify:**'
	]) {
		const body = `## 0. Product\n\n## Out of scope\n\n${section}\n`;
		assert.deepEqual(missingRequiredHeadings(body), [], section);
	}
});

test('M1: findSupersedeCycles finds two-node and longer rings, and ignores chains', () => {
	const graph = (edges) =>
		new Map(Object.entries(edges).map(([id, supersedes]) => [id, { id, supersedes }]));
	// a → b → a
	assert.deepEqual(findSupersedeCycles(graph({ a: 'b', b: 'a' })), [['a', 'b']]);
	// c → a → b → c, reported from its smallest id
	assert.deepEqual(findSupersedeCycles(graph({ a: 'b', b: 'c', c: 'a' })), [['a', 'b', 'c']]);
	// self-edge is still a cycle
	assert.deepEqual(findSupersedeCycles(graph({ a: 'a' })), [['a']]);
	// a terminating chain (a → b → c, c supersedes nothing) is not a cycle
	assert.deepEqual(findSupersedeCycles(graph({ a: 'b', b: 'c', c: undefined })), []);
	// a link into a spec outside the corpus is an unknown-target error, not a cycle
	assert.deepEqual(findSupersedeCycles(graph({ a: 'missing' })), []);
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

// Minimal, schema-valid topics.json — enough canonical topics to cover every
// tag/alias this test file exercises (D1's classifier-coverage rule requires
// every CLASSIFIER_TOPICS_V1 entry too). `grandfatheredSpecIds` starts empty;
// individual tests add an id when they need the slice-topics exemption.
const FIXTURE_TOPICS = {
	policyVersion: 1,
	sliceTopicValidation: { grandfatheredSpecIds: [] },
	topics: [
		{ name: 'docs', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'test', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'deps', aliases: [], riskTier: 'low', autoMergeEligible: true, description: 'x' },
		{ name: 'logic', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'infra', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'auth', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'data', aliases: [], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'migrations', aliases: ['migration'], riskTier: 'high', autoMergeEligible: false, description: 'x' },
		{ name: 'ui', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' },
		{ name: 'unclassified', aliases: [], riskTier: 'unclassified', autoMergeEligible: false, description: 'x' }
	]
};

function writeFixtureTopics(root, overrides = {}) {
	writeFileSync(
		join(root, 'specs', 'topics.json'),
		JSON.stringify({ ...FIXTURE_TOPICS, ...overrides }, null, '\t') + '\n'
	);
}

function makeCliFixture() {
	const root = mkdtempSync(join(tmpdir(), 'spec-index-cli-'));
	mkdirSync(join(root, 'scripts'));
	mkdirSync(join(root, 'specs'));
	for (const name of ['spec-index.mjs', 'spec-frontmatter.mjs', 'topics.mjs'])
		cpSync(new URL(name, import.meta.url), join(root, 'scripts', name));
	writeFixtureTopics(root);
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

test('M1 integration: two specs superseding each other are rejected as a cycle', () => {
	const root = makeCliFixture();
	const spec = (id, supersedes) =>
		`---\nid: ${id}\ntitle: ${id}\nstage: spec\nstatus: superseded\npass: 1\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]\nsupersedes: ${supersedes}\n---\n\n${VALID_BODY}`;
	writeFileSync(join(root, 'specs', 'fixture.md'), spec('fixture', 'fixture-b'));
	writeFileSync(join(root, 'specs', 'fixture-b.md'), spec('fixture-b', 'fixture'));
	// Both directions of the pairwise link integrity pass hold here: each spec
	// names a real superseded target, and each is named by an incoming link.
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH }
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /supersedes cycle has no terminal successor: fixture → fixture-b → fixture/);
});

test('M1 integration: a real supersede chain with a terminal successor still passes', () => {
	const root = makeCliFixture();
	const spec = (id, status, supersedes) =>
		`---\nid: ${id}\ntitle: ${id}\nstage: spec\nstatus: ${status}\npass: 1\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]${supersedes ? `\nsupersedes: ${supersedes}` : ''}\n---\n\n${VALID_BODY}`;
	writeFileSync(join(root, 'specs', 'fixture.md'), spec('fixture', 'superseded', undefined));
	writeFileSync(join(root, 'specs', 'fixture-b.md'), spec('fixture-b', 'approved', 'fixture'));
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const result = spawnSync('node', ['scripts/spec-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH }
	});
	assert.equal(result.status, 0, result.stderr);
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

// specs/index.json is the one file the board reads, so a field the gate
// validates must also survive into the artifact. This is the standing guard:
// it goes red the moment a new field is added to SCALAR_FIELDS/ARRAY_FIELDS
// without being projected (how relationship/related/retired_reason were lost).
test('M1: every validated frontmatter field is published to specs/index.json', () => {
	assert.doesNotThrow(() => assertProjectionCoverage());
	const projected = new Set([...REQUIRED_INDEX_FIELDS, ...OPTIONAL_INDEX_FIELDS]);
	for (const key of [...SCALAR_FIELDS, ...ARRAY_FIELDS])
		assert.ok(projected.has(key), `"${key}" is validated but never published to specs/index.json`);
});

test('M1: a validated field missing from the projection is rejected', () => {
	assert.throws(
		() => assertProjectionCoverage(['id', 'relationship'], ['id']),
		/validated but never published to specs\/index\.json: relationship/
	);
});

test('M1: a projected field nothing validates is rejected', () => {
	assert.throws(
		() => assertProjectionCoverage(['id'], ['id', 'invented']),
		/published but never validated: invented/
	);
});

test('M1: projectSpec preserves relationship, related and retired_reason', () => {
	const spec = projectSpec({
		id: 'x',
		title: 'X',
		stage: 'spec',
		status: 'draft',
		pass: 1,
		created: '2026-08-18',
		updated: '2026-08-18',
		repos: ['minion-meta'],
		relationship: 'depends-on',
		related: ['a-spec', 'b-spec'],
		retired_reason: 'superseded by the consolidated plan of record'
	});
	assert.equal(spec.relationship, 'depends-on');
	assert.deepEqual(spec.related, ['a-spec', 'b-spec']);
	assert.equal(spec.retired_reason, 'superseded by the consolidated plan of record');
});

test('M1: projectSpec omits absent optional fields', () => {
	const spec = projectSpec({
		id: 'x',
		title: 'X',
		stage: 'spec',
		status: 'draft',
		created: '2026-08-18',
		repos: ['minion-meta']
	});
	assert.equal('relationship' in spec, false);
	assert.equal('related' in spec, false);
	assert.equal('retired_reason' in spec, false);
	// updated defaults to created, pass to 1 — unchanged projection behaviour.
	assert.equal(spec.updated, '2026-08-18');
	assert.equal(spec.pass, 1);
});

const GIT_ID = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid'];
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const gitCommit = (root, message) => {
	git(root, 'add', '.');
	git(root, ...GIT_ID, 'commit', '-qm', message);
};
const specSource = (id, extraFrontmatter, body) =>
	`---\nid: ${id}\ntitle: ${id}\nstage: spec\nstatus: draft\npass: 1\ncreated: 2026-08-18\nupdated: 2026-08-18\nrepos: [minion-meta]\n${extraFrontmatter}---\n\n${body}`;
const writeSpec = (root, id, extraFrontmatter, body) =>
	writeFileSync(join(root, 'specs', `${id}.md`), specSource(id, extraFrontmatter, body));
// The baseline hashes the parsed body, not the raw file — derive it the same way.
const bodyHash = (id, extraFrontmatter, body) =>
	createHash('sha256').update(parseFrontmatter(specSource(id, extraFrontmatter, body)).body).digest('hex');
const runCheck = (root, env = {}) =>
	spawnSync('node', ['scripts/spec-index.mjs', '--check'], {
		cwd: root,
		encoding: 'utf8',
		env: { PATH: process.env.PATH, ...env }
	});

// A fixture whose only spec is well-formed, so nothing but the case under test
// can turn the gate red.
function makeCleanFixture() {
	const root = makeCliFixture();
	writeSpec(root, 'fixture', '', VALID_BODY);
	writeFileSync(join(root, 'scripts', 'spec-heading-lint-baseline.json'), '{}\n');
	writeFileSync(join(root, 'scripts', 'spec-supersede-baseline.json'), '[]\n');
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'clean base');
	return root;
}

test('M4: a clean fixture passes --check (control for the cases below)', () => {
	const result = runCheck(makeCleanFixture());
	assert.equal(result.status, 0, result.stderr);
});

test('M4: an empty `repos` is rejected unless the spec is a plan-of-record', () => {
	const root = makeCleanFixture();
	writeFileSync(
		join(root, 'specs', 'fixture.md'),
		specSource('fixture', '', VALID_BODY).replace('repos: [minion-meta]', 'repos: []')
	);
	const generated = spawnSync('node', ['scripts/spec-index.mjs'], { cwd: root, encoding: 'utf8' });
	assert.equal(generated.status, 1);
	assert.match(generated.stderr, /"repos" is empty/);
});

test('M4: a plan-of-record (type: decision) may declare `repos: []`', () => {
	const root = makeCleanFixture();
	writeFileSync(
		join(root, 'specs', 'fixture.md'),
		specSource('fixture', 'type: decision\n', VALID_BODY).replace('repos: [minion-meta]', 'repos: []')
	);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'plan of record');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

test('M4: an undocumented `relationship` value is rejected', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', 'relationship: kind-of-related\n', VALID_BODY);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'bad relationship');
	const result = runCheck(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /invalid relationship "kind-of-related"/);
});

// Both directions matter: the generator must refuse to publish the malformed
// value, and --check must stay red even if the spec lands with a stale index
// (which is how it would reach CI — the generator never wrote it).
for (const [field, value] of [
	['tags', 'infra'],
	['related', 'some-other-spec']
]) {
	test(`M4: a scalar \`${field}\` is rejected by the generator and by --check`, () => {
		const root = makeCleanFixture();
		writeSpec(root, 'fixture', `${field}: ${value}\n`, VALID_BODY);
		const generated = spawnSync('node', ['scripts/spec-index.mjs'], { cwd: root, encoding: 'utf8' });
		assert.equal(generated.status, 1);
		assert.match(generated.stderr, new RegExp(`"${field}" must be an array of strings`));
		gitCommit(root, `scalar ${field}`);
		const result = runCheck(root);
		assert.equal(result.status, 1);
		assert.match(result.stderr, new RegExp(`"${field}" must be an array of strings`));
	});
}

test('M4: array-form `tags` and `related` pass --check', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', 'tags: [infra, test]\nrelated: [some-other-spec]\n', VALID_BODY);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'array tags and related');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

test('M4: the generated index preserves relationship and related', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', 'relationship: depends-on\nrelated: [some-other-spec]\n', VALID_BODY);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'specs', 'index.json'), 'utf8'));
	const entry = index.specs.find((spec) => spec.id === 'fixture');
	assert.equal(entry.relationship, 'depends-on');
	assert.deepEqual(entry.related, ['some-other-spec']);
	gitCommit(root, 'relationship and related');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

test('M4: `verdict: revision-required` is accepted (base-authored value)', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', 'verdict: revision-required\n', VALID_BODY);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'revision required');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

// Builds: base -> (feature on the starting branch, debt on `base-branch`) -> merge.
// The merge commit itself carries the baseline entry, which is exactly the shape
// of "merge the base branch in and grandfather the debt it brought along".
function makeMergeFixture() {
	const root = makeCleanFixture();
	const startBranch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD').trim();
	git(root, 'checkout', '-q', '-b', 'base-branch');
	writeSpec(root, 'debt-spec', '', '# Debt spec\n');
	gitCommit(root, 'debt arrives on the base branch');
	git(root, 'checkout', '-q', startBranch);
	writeSpec(root, 'feature-spec', '', VALID_BODY);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'feature work');
	git(root, ...GIT_ID, 'merge', '--no-ff', '--no-commit', '-q', 'base-branch');
	return root;
}

test('M4: debt merged in from the base branch may be grandfathered in the merge commit', () => {
	const root = makeMergeFixture();
	writeFileSync(
		join(root, 'scripts', 'spec-heading-lint-baseline.json'),
		`${JSON.stringify({ 'debt-spec': bodyHash('debt-spec', '', '# Debt spec\n') })}\n`
	);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'merge base branch');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

test('M4: a merge commit still cannot grandfather debt it introduces itself', () => {
	const root = makeMergeFixture();
	const freshBody = '# Fresh debt\n';
	writeSpec(root, 'fresh-debt', '', freshBody);
	writeFileSync(
		join(root, 'scripts', 'spec-heading-lint-baseline.json'),
		`${JSON.stringify({
			'debt-spec': bodyHash('debt-spec', '', '# Debt spec\n'),
			'fresh-debt': bodyHash('fresh-debt', '', freshBody)
		})}\n`
	);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'merge base branch and sneak in new debt');
	const result = runCheck(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /new id "fresh-debt" added/);
	assert.doesNotMatch(result.stderr, /new id "debt-spec" added/);
});

// Slice 1 of 2026-08-18-base-kanban-possibly-shipped-surface-spec: the three G0
// reconciliation fields project into specs/index.json exactly like the existing
// optional scalars, and reconcile_ignore (factory-only, no board consumer) never
// does.
const G0_BASE_FM = {
	id: 'g0-fixture',
	title: 'fixture',
	stage: 'spec',
	status: 'approved',
	pass: 2,
	created: '2026-08-20',
	updated: '2026-08-20',
	repos: ['minion-base']
};

test('G0: possibly_shipped / evidence / link_review project when present', () => {
	const spec = projectSpec({
		...G0_BASE_FM,
		possibly_shipped: 'https://github.com/x/y/pull/1',
		evidence: 'https://github.com/x/y/pull/2',
		link_review: 'ambiguous supersedes target'
	});
	assert.equal(spec.possibly_shipped, 'https://github.com/x/y/pull/1');
	assert.equal(spec.evidence, 'https://github.com/x/y/pull/2');
	assert.equal(spec.link_review, 'ambiguous supersedes target');
});

test('G0: absent warning fields produce no key (not null, not empty string)', () => {
	const spec = projectSpec({ ...G0_BASE_FM });
	for (const key of ['possibly_shipped', 'evidence', 'link_review']) {
		assert.equal(Object.hasOwn(spec, key), false, `${key} must be absent`);
	}
});

test('G0: reconcile_ignore never projects into the index', () => {
	const spec = projectSpec({ ...G0_BASE_FM, reconcile_ignore: true });
	assert.equal(Object.hasOwn(spec, 'reconcile_ignore'), false);
});

test('G0: the two new fields are covered by the projection contract', () => {
	for (const key of ['possibly_shipped', 'link_review']) {
		assert.ok(SCALAR_FIELDS.includes(key), `${key} in SCALAR_FIELDS`);
		assert.ok(OPTIONAL_INDEX_FIELDS.includes(key), `${key} in OPTIONAL_INDEX_FIELDS`);
	}
	assert.doesNotThrow(() => assertProjectionCoverage());
});

// 2026-08-18-factory-topic-capability-manifest-spec Slice 1, D2/D9.

test('T-UNKNOWN-META: an unresolvable tag fails the generator, naming file and tag', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', 'tags: [nonsense]\n', VALID_BODY);
	const generated = spawnSync('node', ['scripts/spec-index.mjs'], { cwd: root, encoding: 'utf8' });
	assert.equal(generated.status, 1);
	assert.match(generated.stderr, /fixture\.md: unknown topic "nonsense"/);
});

test('T-UNKNOWN-META: an alias tag is projected as its canonical name', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', 'tags: [migration]\n', VALID_BODY);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	const index = JSON.parse(readFileSync(join(root, 'specs', 'index.json'), 'utf8'));
	assert.deepEqual(index.specs.find((s) => s.id === 'fixture').tags, ['migrations']);
});

const sliceBody = (topicsLine) => `# Title

## 0. Product

Why this exists.

### Slice 1 — do the thing

${topicsLine === null ? '' : `**Topics:** ${topicsLine}\n\n`}Do it.

## Out of scope

Not doing X.

## Verification

Run the thing.
`;

test('T-SLICE-TOPICS: a slice with a canonical Topics line passes --check', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', '', sliceBody('`infra`, `test`'));
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'slice topics ok');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

test('T-SLICE-TOPICS: a slice heading with no Topics line fails, naming the file and slice', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', '', sliceBody(null));
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'slice missing topics');
	const result = runCheck(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /fixture\.md: "Slice 1 — do the thing" has no \*\*Topics:\*\* line/);
});

test('T-SLICE-TOPICS: a slice Topics line with an unknown topic fails, naming file, slice, and topic', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', '', sliceBody('`infra`, `nonsense`'));
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'slice unknown topic');
	const result = runCheck(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /fixture\.md: "Slice 1 — do the thing" lists unknown topic "nonsense"/);
});

test('T-SLICE-TOPICS: an id in grandfatheredSpecIds is exempt even with no Topics line', () => {
	const root = makeCleanFixture();
	writeSpec(root, 'fixture', '', sliceBody(null));
	writeFixtureTopics(root, { sliceTopicValidation: { grandfatheredSpecIds: ['fixture'] } });
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'grandfathered slice exemption');
	const result = runCheck(root);
	assert.equal(result.status, 0, result.stderr);
});

test('T-SLICE-TOPICS: an unlisted id with a backdated `created` is still not exempt', () => {
	const root = makeCleanFixture();
	writeFileSync(
		join(root, 'specs', 'fixture.md'),
		specSource('fixture', '', sliceBody(null)).replace('created: 2026-08-18', 'created: 2020-01-01')
	);
	execFileSync('node', ['scripts/spec-index.mjs'], { cwd: root });
	gitCommit(root, 'backdated unlisted spec still checked');
	const result = runCheck(root);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /fixture\.md: "Slice 1 — do the thing" has no \*\*Topics:\*\* line/);
});
