import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = new URL('./ranking-index.mjs', import.meta.url).pathname;
const candidate = { key: 'proposal:x', kind: 'proposal', stage: 'proposal', repo: 'minion-meta', title: 'X', summary: 'Useful work.', status: 'draft', updatedAt: '2026-08-31', tags: [], sourceUrl: 'https://example.test/x' };

test('pending and apply form a strict, idempotent ranking pipeline', () => {
	const dir = mkdtempSync(join(tmpdir(), 'ranking-index-'));
	const index = join(dir, 'index.json');
	const catalog = join(dir, 'catalog.json');
	const pending = join(dir, 'pending.json');
	const scores = join(dir, 'scores.json');
	writeFileSync(index, JSON.stringify({ schemaVersion: 1, rubricVersion: 'board-goal-v2', generatedAt: '2026-08-31T00:00:00.000Z', rankings: [] }));
	writeFileSync(catalog, JSON.stringify({ candidates: [candidate] }));
	assert.equal(spawnSync(process.execPath, [script, 'pending', index, catalog, pending]).status, 0);
	assert.equal(JSON.parse(readFileSync(pending)).candidates.length, 1);
	writeFileSync(scores, JSON.stringify({ scores: [{ key: candidate.key, criticality: 8, importance: 7, impact: 6, specification: 8, implementation: 7, confidence: 9, recommendation: 'execute', relatedKeys: [], rationale: 'Blocks an important release.', evidence: ['status:draft'] }] }));
	assert.equal(spawnSync(process.execPath, [script, 'apply', index, pending, scores]).status, 0);
	const ranked = JSON.parse(readFileSync(index));
	assert.equal(ranked.rankings[0].score, 72);
	assert.equal(ranked.rankings[0].band, 'high');
	assert.equal(spawnSync(process.execPath, [script, 'pending', index, catalog, pending]).status, 0);
	assert.equal(JSON.parse(readFileSync(pending)).candidates.length, 0);
	ranked.rankings[0].recommendation = 'reevaluate';
	ranked.rankings[0].scoredAt = '1970-01-01T00:00:00.000Z';
	writeFileSync(index, JSON.stringify(ranked));
	assert.equal(spawnSync(process.execPath, [script, 'pending', index, catalog, pending]).status, 0);
	assert.equal(JSON.parse(readFileSync(pending)).candidates.length, 1, 'unchanged deferred work is re-evaluated weekly');
});

test('pending/apply retains unchanged deployments and retires only those absent from the full catalog', () => {
	const dir = mkdtempSync(join(tmpdir(), 'ranking-index-derived-'));
	const index = join(dir, 'index.json');
	const catalog = join(dir, 'catalog.json');
	const pending = join(dir, 'pending.json');
	const scores = join(dir, 'scores.json');
	const deployments = ['unchanged', 'changed', 'removed'].map((name) => ({
		...candidate, key: `deploy:${name}`, kind: 'deploy', stage: 'deployment', title: name,
	}));
	const score = (entry) => ({ key: entry.key, criticality: 8, importance: 7, impact: 6, specification: 8, implementation: 7, confidence: 9, recommendation: 'execute', relatedKeys: [], rationale: 'Blocks an important release.', evidence: ['status:draft'] });
	const run = (...args) => {
		const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
	};
	writeFileSync(index, JSON.stringify({ schemaVersion: 1, rubricVersion: 'board-goal-v2', generatedAt: '2026-08-31T00:00:00.000Z', rankings: [] }));
	writeFileSync(catalog, JSON.stringify({ candidates: [...deployments, candidate] }));
	writeFileSync(scores, JSON.stringify({ scores: [...deployments, candidate].map(score) }));
	run('apply', index, catalog, scores);
	const initialRankings = JSON.parse(readFileSync(index)).rankings;
	const original = initialRankings.find((entry) => entry.key === deployments[0].key);
	const originalChanged = initialRankings.find((entry) => entry.key === deployments[1].key);

	const changed = { ...deployments[1], summary: 'Deployment workflow changed.' };
	writeFileSync(catalog, JSON.stringify({ candidates: [deployments[0], changed, candidate] }));
	run('pending', index, catalog, pending);
	assert.deepEqual(JSON.parse(readFileSync(pending)).candidates.map((entry) => entry.key), [changed.key]);
	writeFileSync(scores, JSON.stringify({ scores: [score(changed)] }));
	run('apply', index, pending, scores);
	const next = JSON.parse(readFileSync(index));
	assert.deepEqual(next.rankings.find((entry) => entry.key === original.key), original);
	assert.equal(next.rankings.some((entry) => entry.key === deployments[2].key), false);
	assert.equal(next.rankings.some((entry) => entry.key === candidate.key), true);
	assert.notEqual(next.rankings.find((entry) => entry.key === changed.key).sourceFingerprint, originalChanged.sourceFingerprint);

	run('pending', index, catalog, pending);
	assert.deepEqual(JSON.parse(readFileSync(pending)).candidates, []);
	writeFileSync(scores, JSON.stringify({ scores: [] }));
	run('apply', index, pending, scores);
	assert.deepEqual(JSON.parse(readFileSync(index)).rankings, next.rankings);

	writeFileSync(pending, JSON.stringify({ candidates: [candidate] }));
	writeFileSync(scores, JSON.stringify({ scores: [score(candidate)] }));
	run('apply', index, pending, scores);
	assert.deepEqual(JSON.parse(readFileSync(index)).rankings.filter((entry) => entry.kind === 'deploy'), next.rankings.filter((entry) => entry.kind === 'deploy'));

	const before = readFileSync(index, 'utf8');
	for (const authoritativeDeploymentKeys of [null, 'invalid', [null], [''], [original.key, original.key]]) {
		writeFileSync(pending, JSON.stringify({ candidates: [candidate], authoritativeDeploymentKeys }));
		assert.notEqual(spawnSync(process.execPath, [script, 'apply', index, pending, scores]).status, 0);
		assert.equal(readFileSync(index, 'utf8'), before);
	}

	writeFileSync(catalog, JSON.stringify({ candidates: [candidate] }));
	run('pending', index, catalog, pending);
	writeFileSync(scores, JSON.stringify({ scores: [] }));
	run('apply', index, pending, scores);
	assert.deepEqual(JSON.parse(readFileSync(index)).rankings.map((entry) => entry.key), [candidate.key]);
});
