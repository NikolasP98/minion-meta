import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildRankingCatalog } from './board-ranking-catalog.mjs';

function fixtureRoot() {
	const root = mkdtempSync(join(tmpdir(), 'ranking-catalog-'));
	for (const directory of ['proposals', 'specs', 'rankings']) mkdirSync(join(root, directory));
	writeFileSync(join(root, 'proposals/index.json'), '{"proposals":[]}');
	writeFileSync(join(root, 'specs/index.json'), '{"specs":[]}');
	writeFileSync(join(root, 'rankings/repos.json'), JSON.stringify([
		{ id: 'minion-base', slug: 'NikolasP98/minion-base', branch: 'main' }
	]));
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
