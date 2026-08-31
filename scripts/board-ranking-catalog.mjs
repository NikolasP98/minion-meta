#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter } from './spec-frontmatter.mjs';
import { RANKING_SCHEMA_VERSION, validateCandidate } from './ranking-contract.mjs';

const ACTIVE_PROPOSALS = new Set(['draft', 'review', 'approved', 'in-spec']);
const ACTIVE_SPECS = new Set(['draft', 'review', 'approved', 'implementing']);

function excerpt(value, max = 4_000) {
	return String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
}

function date(value, fallback) {
	return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : fallback;
}

async function github(fetchFn, token, path) {
	try {
		const response = await fetchFn(`https://api.github.com${path}`, {
			headers: {
				accept: 'application/vnd.github+json',
				'user-agent': 'minion-factory-ranking-agent',
				...(token ? { authorization: `Bearer ${token}` } : {})
			}
		});
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

function localArtifactCandidates(root, generatedAt) {
	const proposals = JSON.parse(readFileSync(`${root}/proposals/index.json`, 'utf8')).proposals ?? [];
	const specs = JSON.parse(readFileSync(`${root}/specs/index.json`, 'utf8')).specs ?? [];
	return [
		...proposals.filter((item) => ACTIVE_PROPOSALS.has(item.status)).map((item) => {
			let body = '';
			try { body = parseFrontmatter(readFileSync(`${root}/proposals/${item.id}.md`, 'utf8'))?.body ?? ''; } catch { /* index remains usable */ }
			return {
				key: `proposal:${item.id}`,
				kind: 'proposal', stage: 'proposal', repo: item.repos?.[0] ?? 'minion-meta',
				title: item.title, summary: excerpt(body), status: item.status,
				updatedAt: date(item.updated ?? item.created, generatedAt), tags: item.tags ?? [],
				sourceUrl: `https://github.com/NikolasP98/minion-meta/blob/dev/proposals/${item.id}.md`
			};
		}),
		...specs.filter((item) => ACTIVE_SPECS.has(item.status)).map((item) => {
			let body = '';
			try { body = parseFrontmatter(readFileSync(`${root}/specs/${item.id}.md`, 'utf8'))?.body ?? ''; } catch { /* index remains usable */ }
			return {
				key: `spec:${item.id}`,
				kind: 'spec', stage: 'spec', repo: item.repos?.[0] ?? 'minion-meta',
				title: item.title, summary: excerpt(body), status: item.status,
				updatedAt: date(item.updated ?? item.created, generatedAt), tags: item.tags ?? [],
				sourceUrl: `https://github.com/NikolasP98/minion-meta/blob/dev/specs/${item.id}.md`
			};
		})
	];
}

function latestRunsByWorkflow(runs) {
	const latest = new Map();
	for (const run of runs ?? []) {
		if (run.event === 'pull_request' || run.event === 'pull_request_target') continue;
		const previous = latest.get(run.name);
		if (!previous || Date.parse(run.updated_at) > Date.parse(previous.updated_at)) latest.set(run.name, run);
	}
	return [...latest.values()];
}

export async function buildRankingCatalog({ root = '.', fetchFn = fetch, token = process.env.GITHUB_TOKEN ?? '', now = new Date() } = {}) {
	const generatedAt = now.toISOString();
	const repos = JSON.parse(readFileSync(`${root}/rankings/repos.json`, 'utf8'));
	const candidates = localArtifactCandidates(root, generatedAt);

	for (const repo of repos) {
		const slug = repo.slug.split('/').map(encodeURIComponent).join('/');
		const branch = encodeURIComponent(repo.branch);
		const [issues, commits, workflowPayload] = await Promise.all([
			github(fetchFn, token, `/repos/${slug}/issues?state=open&per_page=50`),
			github(fetchFn, token, `/repos/${slug}/commits?sha=${branch}&per_page=1`),
			github(fetchFn, token, `/repos/${slug}/actions/runs?branch=${branch}&per_page=30`)
		]);
		if (!Array.isArray(issues) || (!Array.isArray(commits) && !repo.allowMissingBranch) || !Array.isArray(workflowPayload?.workflow_runs)) {
			throw new Error(`ranking catalog source unavailable for ${repo.id}; refusing a partial catalog`);
		}
		const branchCommits = Array.isArray(commits) ? commits : [];
		for (const item of issues) {
			const isPr = Boolean(item.pull_request);
			candidates.push({
				key: `${isPr ? 'pr' : 'issue'}:${repo.id}#${item.number}`,
				kind: isPr ? 'pr' : 'issue', stage: isPr ? 'development' : 'proposal', repo: repo.id,
				title: `#${item.number} ${item.title}`,
				summary: excerpt(item.body), status: isPr ? (item.draft ? 'draft' : 'open') : 'open',
				updatedAt: date(item.updated_at, generatedAt),
				tags: (item.labels ?? []).map((label) => typeof label === 'string' ? label : label.name).filter(Boolean),
				sourceUrl: item.html_url
			});
		}

		const latestRuns = latestRunsByWorkflow(workflowPayload.workflow_runs);
		for (const run of latestRuns.filter((item) => item.status !== 'completed' || item.conclusion === 'failure')) {
			candidates.push({
				key: `run:${repo.id}#${run.id}`, kind: 'run', stage: 'testing', repo: repo.id,
				title: run.name, summary: `${run.event} on ${run.head_branch}`,
				status: run.status !== 'completed' ? run.status : 'failure', updatedAt: date(run.updated_at, generatedAt),
				tags: ['ci'], sourceUrl: run.html_url
			});
		}

		const latestBranchRun = latestRuns.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
		const deployStatus = !latestBranchRun ? 'unknown'
			: latestBranchRun.status !== 'completed' ? 'running'
			: latestBranchRun.conclusion === 'success' ? 'passing'
			: latestBranchRun.conclusion === 'failure' ? 'failing' : 'unknown';
		const head = branchCommits[0];
		if (head) {
			candidates.push({
				key: `deploy:${repo.id}`, kind: 'deploy', stage: 'deployment', repo: repo.id,
				title: `${repo.id} deployment health`, summary: excerpt(head.commit?.message), status: deployStatus,
				updatedAt: date(latestBranchRun?.updated_at ?? head.commit?.author?.date, generatedAt),
				tags: ['deployment'], sourceUrl: head.html_url
			});
		}
	}

	const unique = new Map();
	for (const raw of candidates) unique.set(raw.key, validateCandidate(raw));
	return {
		schemaVersion: RANKING_SCHEMA_VERSION,
		generatedAt,
		candidates: [...unique.values()].sort((a, b) => a.stage.localeCompare(b.stage) || a.key.localeCompare(b.key))
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const output = process.argv[2] ?? '/tmp/board-ranking-catalog.json';
	const catalog = await buildRankingCatalog();
	writeFileSync(output, `${JSON.stringify(catalog, null, '\t')}\n`);
	console.log(`ranking catalog written: ${catalog.candidates.length} goals`);
}
