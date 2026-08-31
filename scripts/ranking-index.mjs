#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import {
	RANKING_RUBRIC_VERSION,
	RANKING_SCHEMA_VERSION,
	rankingEntry,
	validateAgentScore,
	validateCandidate,
	validateRankingIndex
} from './ranking-contract.mjs';

const command = process.argv[2] ?? 'validate';
const indexPath = process.argv[3] ?? 'rankings/index.json';

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function readIndex(path) {
	return validateRankingIndex(readJson(path));
}

if (command === 'validate') {
	const index = readIndex(indexPath);
	console.log(`ranking index valid: ${index.rankings.length} entries`);
} else if (command === 'pending') {
	const catalogPath = process.argv[4];
	const outputPath = process.argv[5];
	if (!catalogPath || !outputPath) throw new Error('pending requires <index> <catalog> <output>');
	const index = readIndex(indexPath);
	const catalog = readJson(catalogPath);
	if (!Array.isArray(catalog.candidates)) throw new Error('catalog candidates must be an array');
	const candidates = catalog.candidates.map(validateCandidate);
	const existing = new Map(index.rankings.map((entry) => [entry.key, entry]));
	const pending = candidates.filter((candidate) => {
		const prior = existing.get(candidate.key);
		return !prior || prior.sourceFingerprint !== candidate.sourceFingerprint || prior.rubricVersion !== RANKING_RUBRIC_VERSION;
	});
	writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: RANKING_SCHEMA_VERSION, candidates: pending }, null, '\t')}\n`);
	console.log(`ranking candidates pending: ${pending.length}/${candidates.length}`);
} else if (command === 'apply') {
	const catalogPath = process.argv[4];
	const agentPath = process.argv[5];
	if (!catalogPath || !agentPath) throw new Error('apply requires <index> <catalog> <agent-results>');
	const index = readIndex(indexPath);
	const catalog = readJson(catalogPath);
	const agent = readJson(agentPath);
	if (!Array.isArray(catalog.candidates) || !Array.isArray(agent.scores)) throw new Error('apply inputs are malformed');
	const candidates = catalog.candidates.map(validateCandidate);
	const candidateByKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
	const allowedKeys = new Set(candidateByKey.keys());
	const scores = agent.scores.map((score) => validateAgentScore(score, allowedKeys));
	if (scores.length !== candidates.length) throw new Error(`agent returned ${scores.length} scores for ${candidates.length} candidates`);
	if (new Set(scores.map((score) => score.key)).size !== scores.length) throw new Error('agent returned duplicate score keys');
	const scoredAt = new Date().toISOString();
	const merged = new Map(index.rankings.map((entry) => [entry.key, entry]));
	for (const score of scores) merged.set(score.key, rankingEntry(candidateByKey.get(score.key), score, scoredAt));
	const next = {
		schemaVersion: RANKING_SCHEMA_VERSION,
		rubricVersion: RANKING_RUBRIC_VERSION,
		generatedAt: scoredAt,
		rankings: [...merged.values()].sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
	};
	validateRankingIndex(next);
	writeFileSync(indexPath, `${JSON.stringify(next, null, '\t')}\n`);
	console.log(`ranking index updated: ${scores.length} changed, ${next.rankings.length} total`);
} else if (command === 'prune') {
	const catalogPath = process.argv[4];
	if (!catalogPath) throw new Error('prune requires <index> <catalog>');
	const index = readIndex(indexPath);
	const catalog = readJson(catalogPath);
	if (!Array.isArray(catalog.candidates)) throw new Error('catalog candidates must be an array');
	const liveKeys = new Set(catalog.candidates.map((candidate) => validateCandidate(candidate).key));
	const next = { ...index, generatedAt: new Date().toISOString(), rankings: index.rankings.filter((entry) => liveKeys.has(entry.key)) };
	validateRankingIndex(next);
	writeFileSync(indexPath, `${JSON.stringify(next, null, '\t')}\n`);
	console.log(`ranking index pruned: ${index.rankings.length - next.rankings.length} retired, ${next.rankings.length} live`);
} else {
	throw new Error(`unknown ranking-index command ${command}`);
}
