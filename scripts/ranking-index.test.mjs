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
