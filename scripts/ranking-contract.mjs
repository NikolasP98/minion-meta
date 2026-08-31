import { createHash } from 'node:crypto';

export const RANKING_SCHEMA_VERSION = 1;
export const RANKING_RUBRIC_VERSION = 'board-goal-v1';
export const RANKING_WEIGHTS = Object.freeze({ criticality: 0.45, importance: 0.3, impact: 0.25 });
export const RANKING_AXES = Object.freeze(Object.keys(RANKING_WEIGHTS));
export const RANKING_KINDS = Object.freeze(['proposal', 'issue', 'spec', 'pr', 'run', 'deploy']);

function object(value, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
	return value;
}

function boundedText(value, label, max = 800) {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty text`);
	if (value.length > max) throw new Error(`${label} exceeds ${max} characters`);
	return value.trim();
}

function integerScore(value, label) {
	if (!Number.isInteger(value) || value < 0 || value > 10) throw new Error(`${label} must be an integer from 0 to 10`);
	return value;
}

function exactKeys(value, expected, label) {
	const actual = Object.keys(value).sort();
	const wanted = [...expected].sort();
	if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`${label} contains unsupported or missing fields`);
}

export function aggregateRanking(axes) {
	const checked = object(axes, 'axes');
	const weighted = RANKING_AXES.reduce(
		(sum, axis) => sum + integerScore(checked[axis], `axes.${axis}`) * RANKING_WEIGHTS[axis],
		0
	);
	return Math.round(weighted * 10);
}

export function rankingBand(score) {
	if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error('score must be an integer from 0 to 100');
	if (score >= 85) return 'critical';
	if (score >= 70) return 'high';
	if (score >= 50) return 'medium';
	return 'low';
}

export function sourceFingerprint(candidate) {
	const c = object(candidate, 'candidate');
	const stable = {
		key: c.key,
		kind: c.kind,
		stage: c.stage,
		repo: c.repo,
		title: c.title,
		summary: c.summary,
		status: c.status,
		updatedAt: c.updatedAt,
		tags: c.tags ?? [],
		sourceUrl: c.sourceUrl
	};
	return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export function validateCandidate(value) {
	const c = object(value, 'candidate');
	const key = boundedText(c.key, 'candidate.key', 300);
	const kind = boundedText(c.kind, 'candidate.kind', 20);
	if (!RANKING_KINDS.includes(kind)) throw new Error(`candidate ${key} has unsupported kind ${kind}`);
	const candidate = {
		key,
		kind,
		stage: boundedText(c.stage, `candidate ${key}.stage`, 20),
		repo: boundedText(c.repo, `candidate ${key}.repo`, 100),
		title: boundedText(c.title, `candidate ${key}.title`, 500),
		summary: typeof c.summary === 'string' ? c.summary.slice(0, 4_000) : '',
		status: boundedText(c.status, `candidate ${key}.status`, 80),
		updatedAt: boundedText(c.updatedAt, `candidate ${key}.updatedAt`, 80),
		tags: Array.isArray(c.tags) ? c.tags.filter((tag) => typeof tag === 'string').slice(0, 20) : [],
		sourceUrl: boundedText(c.sourceUrl, `candidate ${key}.sourceUrl`, 1_000)
	};
	return { ...candidate, sourceFingerprint: sourceFingerprint(candidate) };
}

export function validateAgentScore(value, allowedKeys) {
	const score = object(value, 'agent score');
	exactKeys(score, ['key', 'criticality', 'importance', 'impact', 'confidence', 'rationale', 'evidence'], 'agent score');
	const key = boundedText(score.key, 'agent score.key', 300);
	if (!allowedKeys.has(key)) throw new Error(`agent returned unknown key ${key}`);
	const axes = Object.fromEntries(RANKING_AXES.map((axis) => [axis, integerScore(score[axis], `${key}.${axis}`)]));
	const confidence = integerScore(score.confidence, `${key}.confidence`);
	return {
		key,
		axes,
		confidence,
		rationale: boundedText(score.rationale, `${key}.rationale`, 800),
		evidence: Array.isArray(score.evidence) && score.evidence.length >= 1 && score.evidence.length <= 3
			? score.evidence.map((entry, index) => boundedText(entry, `${key}.evidence[${index}]`, 300))
			: (() => { throw new Error(`${key}.evidence must contain 1 to 3 facts`); })()
	};
}

export function rankingEntry(candidate, agentScore, scoredAt) {
	const aggregate = aggregateRanking(agentScore.axes);
	return {
		key: candidate.key,
		kind: candidate.kind,
		stage: candidate.stage,
		repo: candidate.repo,
		title: candidate.title,
		sourceUrl: candidate.sourceUrl,
		sourceUpdatedAt: candidate.updatedAt,
		sourceFingerprint: candidate.sourceFingerprint,
		score: aggregate,
		band: rankingBand(aggregate),
		axes: agentScore.axes,
		confidence: agentScore.confidence,
		rationale: agentScore.rationale,
		evidence: agentScore.evidence,
		evaluator: 'factory-ranking-agent',
		rubricVersion: RANKING_RUBRIC_VERSION,
		scoredAt
	};
}

export function validateRankingIndex(value) {
	const index = object(value, 'ranking index');
	if (index.schemaVersion !== RANKING_SCHEMA_VERSION) throw new Error(`ranking index schemaVersion must be ${RANKING_SCHEMA_VERSION}`);
	if (index.rubricVersion !== RANKING_RUBRIC_VERSION) throw new Error(`ranking index rubricVersion must be ${RANKING_RUBRIC_VERSION}`);
	if (!Array.isArray(index.rankings)) throw new Error('ranking index rankings must be an array');
	const seen = new Set();
	for (const [position, entryValue] of index.rankings.entries()) {
		const entry = object(entryValue, `rankings[${position}]`);
		exactKeys(entry, ['key', 'kind', 'stage', 'repo', 'title', 'sourceUrl', 'sourceUpdatedAt', 'sourceFingerprint', 'score', 'band', 'axes', 'confidence', 'rationale', 'evidence', 'evaluator', 'rubricVersion', 'scoredAt'], `rankings[${position}]`);
		const key = boundedText(entry.key, `rankings[${position}].key`, 300);
		if (seen.has(key)) throw new Error(`duplicate ranking key ${key}`);
		seen.add(key);
		if (!RANKING_KINDS.includes(entry.kind)) throw new Error(`${key} has unsupported kind ${entry.kind}`);
		boundedText(entry.stage, `${key}.stage`, 20);
		boundedText(entry.repo, `${key}.repo`, 100);
		boundedText(entry.title, `${key}.title`, 500);
		const sourceUrl = boundedText(entry.sourceUrl, `${key}.sourceUrl`, 1_000);
		if (!/^https:\/\//.test(sourceUrl)) throw new Error(`${key}.sourceUrl must be HTTPS`);
		if (!Number.isFinite(Date.parse(entry.sourceUpdatedAt))) throw new Error(`${key}.sourceUpdatedAt is invalid`);
		exactKeys(object(entry.axes, `${key}.axes`), RANKING_AXES, `${key}.axes`);
		const expected = aggregateRanking(entry.axes);
		if (entry.score !== expected) throw new Error(`${key} aggregate ${entry.score} does not match trusted calculation ${expected}`);
		if (entry.band !== rankingBand(expected)) throw new Error(`${key} band does not match score`);
		integerScore(entry.confidence, `${key}.confidence`);
		boundedText(entry.rationale, `${key}.rationale`, 800);
		if (!Array.isArray(entry.evidence) || entry.evidence.length < 1 || entry.evidence.length > 3) throw new Error(`${key}.evidence must contain 1 to 3 facts`);
		entry.evidence.forEach((fact, factIndex) => boundedText(fact, `${key}.evidence[${factIndex}]`, 300));
		if (entry.evaluator !== 'factory-ranking-agent') throw new Error(`${key}.evaluator is unsupported`);
		if (entry.rubricVersion !== RANKING_RUBRIC_VERSION) throw new Error(`${key} rubricVersion is stale`);
		if (!/^[0-9a-f]{64}$/.test(entry.sourceFingerprint ?? '')) throw new Error(`${key} sourceFingerprint is invalid`);
		if (!Number.isFinite(Date.parse(entry.scoredAt))) throw new Error(`${key}.scoredAt is invalid`);
	}
	return index;
}
