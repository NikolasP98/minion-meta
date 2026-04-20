import { spawnSync } from 'node:child_process';
import { parseDotenv } from './dotenv.js';
import { readCache, writeCache } from './cache.js';

export interface InfisicalFetchResult {
	ok: boolean;
	env: Record<string, string>;
	error?: string;
}

export interface InfisicalFetchOptions {
	domain?: string;
	env?: string; // dev / prod — default 'dev'
	noCache?: boolean;
	ttlMs?: number;
}

/**
 * Fetch secrets for an Infisical project via the `infisical` CLI.
 *
 * Invokes `infisical secrets --projectSlug <slug> --env <env> [-domain <d>] -o dotenv --silent`,
 * captures stdout, parses it as dotenv. Results are cached under
 * `$XDG_CONFIG_HOME/minion/infisical-cache.json` (mode 0600) with a 5-minute TTL by default.
 *
 * Never logs secret VALUES; callers only see variable names via the returned env map
 * (which the hierarchy resolver projects into `source[]` by name only).
 */
export async function fetchInfisicalSecrets(
	projectSlug: string,
	opts: InfisicalFetchOptions = {},
): Promise<InfisicalFetchResult> {
	const envTier = opts.env ?? 'dev';
	const cacheKey = `${projectSlug}|${envTier}`;

	// Cache read
	if (!opts.noCache) {
		const cached = readCache(cacheKey);
		if (cached) return { ok: true, env: cached };
	}

	const args = [
		'secrets',
		'--projectSlug',
		projectSlug,
		'--env',
		envTier,
		'-o',
		'dotenv',
		'--silent',
	];
	if (opts.domain) args.push('--domain', opts.domain);

	const result = spawnSync('infisical', args, { encoding: 'buffer' });
	if (result.status !== 0) {
		const stderr = result.stderr?.toString('utf8').trim() ?? '';
		return { ok: false, env: {}, error: stderr || `exit ${result.status}` };
	}

	const stdout = result.stdout?.toString('utf8') ?? '';
	if (!stdout.trim()) {
		return { ok: false, env: {}, error: 'empty response' };
	}

	const env = parseDotenv(stdout);

	// Cache write — only on success and only if noCache not set
	if (!opts.noCache) writeCache(cacheKey, env, opts.ttlMs ?? 300_000);

	return { ok: true, env };
}
