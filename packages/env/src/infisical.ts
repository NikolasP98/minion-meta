import { spawnSync } from 'node:child_process';
import { parseDotenv } from './dotenv.js';
import { readCache, writeCache, resolveCacheMode, purgeLegacyCacheOnce, buildCacheKey } from './cache.js';

export interface InfisicalFetchResult {
	ok: boolean;
	env: Record<string, string>;
	/** Names of every key the fetch returned, even when `env` was narrowed by `cacheKeys`. */
	keyNames?: string[];
	error?: string;
}

export interface InfisicalFetchOptions {
	domain?: string;
	env?: string; // dev / prod — default 'dev'
	noCache?: boolean;
	ttlMs?: number;
	/** Only these keys are persisted to the cache; the value returned to this call is unaffected. */
	cacheKeys?: string[];
}

/**
 * Fetch secrets for an Infisical project via the `infisical` CLI.
 *
 * Invokes `infisical secrets --projectSlug <slug> --env <env> [-domain <d>] -o dotenv --silent`,
 * captures stdout, parses it as dotenv. Successful results are memoized in-process (see `cache.ts`)
 * for a 5-minute TTL by default; nothing is written to disk unless `MINION_ENV_CACHE=disk` and a
 * future release implements the sealed on-disk cache.
 *
 * Never logs secret VALUES; callers only see variable names via `keyNames` and the returned env map
 * (which the hierarchy resolver projects into `source[]` by name only).
 */
export async function fetchInfisicalSecrets(
	projectSlug: string,
	opts: InfisicalFetchOptions = {},
): Promise<InfisicalFetchResult> {
	// Security cleanup: runs unconditionally, even with caching off — see cache.ts.
	purgeLegacyCacheOnce();

	const envTier = opts.env ?? 'dev';
	const mode = resolveCacheMode();
	const cacheKey = buildCacheKey(projectSlug, envTier, opts.domain, opts.cacheKeys);
	const cachingEnabled = !opts.noCache && mode !== 'off';

	// Cache read
	if (cachingEnabled) {
		const cached = readCache(cacheKey);
		if (cached) return { ok: true, env: cached.env, keyNames: cached.keyNames };
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
	const keyNames = Object.keys(env);

	// Cache write — only on success and only when caching is enabled for this call
	if (cachingEnabled) {
		writeCache(cacheKey, env, opts.ttlMs ?? 300_000, keyNames, opts.cacheKeys);
	}

	return { ok: true, env, keyNames };
}
