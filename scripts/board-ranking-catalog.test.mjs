import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildRankingCatalog } from './board-ranking-catalog.mjs';

function fixtureRoot(repo = { id: 'minion-base', slug: 'NikolasP98/minion-base', branch: 'main' }) {
	const root = mkdtempSync(join(tmpdir(), 'ranking-catalog-'));
	for (const directory of ['proposals', 'specs', 'rankings']) mkdirSync(join(root, directory));
	writeFileSync(join(root, 'proposals/index.json'), '{"proposals":[]}');
	writeFileSync(join(root, 'specs/index.json'), '{"specs":[]}');
	writeFileSync(join(root, 'rankings/repos.json'), JSON.stringify([repo]));
	return root;
}

test('catalog fails closed before scoring when any board source is unavailable', async () => {
	const fetchFn = async (url) => ({
		ok: !String(url).includes('/issues?'),
		json: async () => String(url).includes('/actions/runs?') ? { workflow_runs: [] } : []
	});
	await assert.rejects(
		buildRankingCatalog({ root: fixtureRoot(), fetchFn, now: new Date('2026-08-31T00:00:00Z') }),
		/refusing a partial catalog/
	);
});

test('catalog follows every issue and workflow-run page', async () => {
	const requested = [];
	const issue = (number) => ({
		number,
		title: `Issue ${number}`,
		body: '',
		updated_at: '2026-08-31T00:00:00Z',
		labels: [],
		html_url: `https://example.test/issues/${number}`
	});
	const run = (id) => ({
		id,
		name: `Workflow ${id}`,
		path: `.github/workflows/${id}.yml`,
		event: 'push',
		head_branch: 'main',
		status: 'completed',
		conclusion: 'success',
		updated_at: '2026-08-31T00:00:00Z',
		html_url: `https://example.test/runs/${id}`
	});
	const fetchFn = async (url) => {
		const parsed = new URL(url);
		requested.push(`${parsed.pathname}?${parsed.searchParams}`);
		const page = Number(parsed.searchParams.get('page') ?? '1');
		if (parsed.pathname.endsWith('/issues')) {
			return { ok: true, json: async () => page === 1 ? Array.from({ length: 100 }, (_, i) => issue(i + 1)) : [issue(101)] };
		}
		if (parsed.pathname.endsWith('/actions/runs')) {
			return { ok: true, json: async () => ({ workflow_runs: page === 1 ? Array.from({ length: 100 }, (_, i) => run(i + 1)) : [run(101)] }) };
		}
		return {
			ok: true,
			json: async () => [{ sha: 'head', commit: { message: 'head', author: { date: '2026-08-31T00:00:00Z' } }, html_url: 'https://example.test/commit' }]
		};
	};

	const catalog = await buildRankingCatalog({ root: fixtureRoot(), fetchFn, now: new Date('2026-08-31T00:00:00Z') });

	assert.ok(catalog.candidates.some((candidate) => candidate.key === 'issue:minion-base#101'));
	assert.ok(requested.some((request) => request.includes('/issues?') && request.includes('page=2')));
	assert.ok(requested.some((request) => request.includes('/actions/runs?') && request.includes('page=2')));
});

test('catalog skips upstream open items when the repository disables their ingestion', async () => {
	const requested = [];
	const fetchFn = async (url) => {
		const parsed = new URL(url);
		requested.push(parsed.pathname);
		if (parsed.pathname.endsWith('/actions/runs')) {
			return { ok: true, json: async () => ({ workflow_runs: [] }) };
		}
		return { ok: true, json: async () => [] };
	};
	const root = fixtureRoot({
		id: 'paperclip',
		slug: 'paperclipai/paperclip',
		branch: 'minion-integration',
		allowMissingBranch: true,
		includeOpenItems: false
	});

	const catalog = await buildRankingCatalog({ root, fetchFn, now: new Date('2026-09-01T00:00:00Z') });

	assert.equal(catalog.candidates.some((candidate) => candidate.kind === 'issue' || candidate.kind === 'pr'), false);
	assert.equal(requested.some((path) => path.endsWith('/issues')), false);
});

test('catalog refuses a failure after a full first page', async () => {
	const fetchFn = async (url) => {
		const parsed = new URL(url);
		if (parsed.pathname.endsWith('/issues')) {
			const page = Number(parsed.searchParams.get('page') ?? '1');
			return {
				ok: page === 1,
				json: async () => Array.from({ length: 100 }, (_, index) => ({
					number: index + 1,
					title: `Issue ${index + 1}`,
					updated_at: '2026-08-31T00:00:00Z',
					labels: [],
					html_url: `https://example.test/issues/${index + 1}`
				}))
			};
		}
		if (parsed.pathname.endsWith('/actions/runs')) {
			return { ok: true, json: async () => ({ workflow_runs: [] }) };
		}
		return { ok: true, json: async () => [] };
	};

	await assert.rejects(
		buildRankingCatalog({ root: fixtureRoot(), fetchFn, now: new Date('2026-08-31T00:00:00Z') }),
		/refusing a partial catalog/
	);
});

test('deployment health uses only the configured deployment workflow', async () => {
	const fetchFn = async (url) => {
		const parsed = new URL(url);
		if (parsed.pathname.endsWith('/issues')) return { ok: true, json: async () => [] };
		if (parsed.pathname.endsWith('/actions/runs')) return {
			ok: true,
			json: async () => ({ workflow_runs: [
				{ id: 2, name: 'Build', path: '.github/workflows/ci.yml', event: 'push', head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-09-01T00:00:00Z', html_url: 'https://example.test/runs/2' },
				{ id: 1, name: 'Build', path: '.github/workflows/deploy.yml', event: 'push', head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-08-31T00:00:00Z', html_url: 'https://example.test/runs/1' }
			] })
		};
		return { ok: true, json: async () => [{ commit: { message: 'head', author: { date: '2026-09-01T00:00:00Z' } }, html_url: 'https://example.test/commit' }] };
	};
	const root = fixtureRoot({
		id: 'minion-base',
		slug: 'NikolasP98/minion-base',
		branch: 'main',
		deploymentWorkflow: '.github/workflows/deploy.yml'
	});

	const catalog = await buildRankingCatalog({ root, fetchFn, now: new Date('2026-09-01T00:00:00Z') });
	const deployment = catalog.candidates.find((candidate) => candidate.key === 'deploy:minion-base');

	assert.equal(deployment?.status, 'failing');
	assert.equal(deployment?.sourceUrl, 'https://example.test/runs/1');
});

test('catalog does not invent deployment health without a configured workflow', async () => {
	const fetchFn = async (url) => ({
		ok: true,
		json: async () => String(url).includes('/actions/runs?')
			? { workflow_runs: [] }
			: String(url).includes('/issues?') ? [] : [{ commit: { message: 'head' }, html_url: 'https://example.test/commit' }]
	});

	const catalog = await buildRankingCatalog({ root: fixtureRoot(), fetchFn, now: new Date('2026-09-01T00:00:00Z') });

	assert.equal(catalog.candidates.some((candidate) => candidate.key === 'deploy:minion-base'), false);
});
