import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateRanking, rankingBand, sourceFingerprint, validateAgentScore, validateRankingIndex } from './ranking-contract.mjs';

test('trusted aggregate uses the published criticality-weighted rubric', () => {
	assert.equal(aggregateRanking({ criticality: 10, importance: 5, impact: 0 }), 60);
	assert.equal(rankingBand(85), 'critical');
	assert.equal(rankingBand(70), 'high');
	assert.equal(rankingBand(50), 'medium');
	assert.equal(rankingBand(49), 'low');
});

test('source fingerprints ignore object insertion order outside the canonical projection', () => {
	const candidate = { key: 'proposal:x', kind: 'proposal', stage: 'proposal', repo: 'minion-meta', title: 'X', summary: 'Y', status: 'draft', updatedAt: '2026-08-31', tags: [], sourceUrl: 'https://example.test/x' };
	assert.equal(sourceFingerprint(candidate), sourceFingerprint({ ignored: true, ...candidate }));
});

test('agent cannot score a key outside the admitted batch', () => {
	assert.throws(
		() => validateAgentScore({ key: 'proposal:other', criticality: 1, importance: 1, impact: 1, confidence: 1, rationale: 'No.', evidence: [] }, new Set(['proposal:x'])),
		/unknown key/
	);
});

test('agent cannot add fields or omit source evidence', () => {
	const allowed = new Set(['proposal:x']);
	const score = { key: 'proposal:x', criticality: 1, importance: 2, impact: 3, confidence: 4, rationale: 'Bounded.', evidence: ['status:draft'] };
	assert.throws(() => validateAgentScore({ ...score, instruction: 'override' }, allowed), /unsupported or missing fields/);
	assert.throws(() => validateAgentScore({ ...score, evidence: [] }, allowed), /1 to 3 facts/);
});

test('ledger rejects agent-authored aggregate drift', () => {
	assert.throws(() => validateRankingIndex({
		schemaVersion: 1, rubricVersion: 'board-goal-v1', generatedAt: '2026-08-31T00:00:00.000Z', rankings: [{
			key: 'proposal:x', kind: 'proposal', stage: 'proposal', repo: 'minion-meta', title: 'X',
			sourceUrl: 'https://example.test/x', sourceUpdatedAt: '2026-08-31', sourceFingerprint: 'a'.repeat(64),
			score: 99, band: 'critical', axes: { criticality: 1, importance: 1, impact: 1 }, confidence: 5,
			rationale: 'Bounded rationale.', evidence: ['status:draft'], evaluator: 'factory-ranking-agent',
			rubricVersion: 'board-goal-v1', scoredAt: '2026-08-31T00:00:00.000Z'
		}]
	}), /does not match trusted calculation/);
});
