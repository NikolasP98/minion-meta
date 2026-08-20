import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Mock child_process *before* the module under test imports it.
const spawnSyncMock = vi.fn();
vi.mock('node:child_process', () => ({
	spawnSync: spawnSyncMock,
}));

// Import AFTER the mock is registered.
const { fetchInfisicalSecrets } = await import('../src/infisical.js');
const { resetCacheStateForTests } = await import('../src/cache.js');

function mockExit(status: number, stdout: string, stderr = ''): void {
	spawnSyncMock.mockReturnValue({
		status,
		stdout: Buffer.from(stdout),
		stderr: Buffer.from(stderr),
		signal: null,
		pid: 0,
		output: [],
	});
}

/** Recursively list every file under `dir` (empty array if it doesn't exist). */
function walkFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const out: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walkFiles(p));
		else out.push(p);
	}
	return out;
}

describe('fetchInfisicalSecrets', () => {
	const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-infisical-'));
	const prevXdg = process.env.XDG_CONFIG_HOME;
	const prevMode = process.env.MINION_ENV_CACHE;

	beforeEach(() => {
		process.env.XDG_CONFIG_HOME = tmpHome;
		delete process.env.MINION_ENV_CACHE;
		fs.rmSync(path.join(tmpHome, 'minion'), { recursive: true, force: true });
		spawnSyncMock.mockReset();
		resetCacheStateForTests();
	});
	afterEach(() => {
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
		else process.env.XDG_CONFIG_HOME = prevXdg;
		if (prevMode === undefined) delete process.env.MINION_ENV_CACHE;
		else process.env.MINION_ENV_CACHE = prevMode;
	});

	it('returns ok+env on successful CLI exit', async () => {
		mockExit(0, 'FOO=bar\nBAZ=qux\n');
		const r = await fetchInfisicalSecrets('minion-core', { noCache: true });
		expect(r.ok).toBe(true);
		expect(r.env.FOO).toBe('bar');
		expect(r.env.BAZ).toBe('qux');
	});

	it('returns ok=false on non-zero exit', async () => {
		mockExit(1, '', 'auth failed');
		const r = await fetchInfisicalSecrets('minion-core', { noCache: true });
		expect(r.ok).toBe(false);
		expect(r.error).toContain('auth failed');
	});

	// This is the proposal's whole point (§0): the master key to the gateway vault must never land
	// on disk in plaintext. Red-state proof against pre-S1 `cache.ts` is pasted in the PR.
	it('never writes a fetched secret value to disk anywhere under the config dir', async () => {
		const SENTINEL = 'SENTINEL-DO-NOT-PERSIST';
		mockExit(0, `MINION_SECRETS_KEY=${SENTINEL}\n`);
		await fetchInfisicalSecrets('minion-core', { noCache: false });
		for (const f of walkFiles(path.join(tmpHome, 'minion'))) {
			expect(fs.readFileSync(f, 'utf8')).not.toContain(SENTINEL);
		}
	});

	it('creates no cache file at all on a successful fetch', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { noCache: false });
		const cacheFile = path.join(tmpHome, 'minion', 'infisical-cache.json');
		expect(fs.existsSync(cacheFile)).toBe(false);
	});

	it('reads from the in-process memo on a second call within TTL (default mode)', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core');
		await fetchInfisicalSecrets('minion-core');
		expect(spawnSyncMock).toHaveBeenCalledTimes(1); // second call served from the memo
	});

	it('re-fetches after TTL expiry', async () => {
		vi.useFakeTimers();
		try {
			mockExit(0, 'X=1\n');
			await fetchInfisicalSecrets('minion-core', { ttlMs: 300_000 });
			vi.advanceTimersByTime(301_000);
			await fetchInfisicalSecrets('minion-core', { ttlMs: 300_000 });
			expect(spawnSyncMock).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('MINION_ENV_CACHE=off re-fetches every time and writes nothing', async () => {
		process.env.MINION_ENV_CACHE = 'off';
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core');
		await fetchInfisicalSecrets('minion-core');
		expect(spawnSyncMock).toHaveBeenCalledTimes(2);
		expect(fs.existsSync(path.join(tmpHome, 'minion', 'infisical-cache.json'))).toBe(false);
	});

	it('MINION_ENV_CACHE=nonsense behaves as memory and warns naming the bad value', async () => {
		process.env.MINION_ENV_CACHE = 'nonsense';
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core');
		await fetchInfisicalSecrets('minion-core');
		expect(spawnSyncMock).toHaveBeenCalledTimes(1); // fell back to memory → memo hit
		expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('nonsense'))).toBe(true);
		warnSpy.mockRestore();
	});

	it('MINION_ENV_CACHE=disk behaves as memory and warns in S1 (disk not implemented yet)', async () => {
		process.env.MINION_ENV_CACHE = 'disk';
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core');
		await fetchInfisicalSecrets('minion-core');
		expect(spawnSyncMock).toHaveBeenCalledTimes(1);
		expect(fs.existsSync(path.join(tmpHome, 'minion', 'infisical-cache.json'))).toBe(false);
		expect(warnSpy.mock.calls.some((c) => String(c[0]).includes("isn't implemented"))).toBe(true);
		warnSpy.mockRestore();
	});

	it('noCache bypasses cache read AND write', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { noCache: true });
		await fetchInfisicalSecrets('minion-core', { noCache: true });
		expect(spawnSyncMock).toHaveBeenCalledTimes(2);
		expect(fs.existsSync(path.join(tmpHome, 'minion', 'infisical-cache.json'))).toBe(false);
	});

	it('noCache still purges a pre-existing legacy plaintext cache (security cleanup, not a cache read)', async () => {
		fs.mkdirSync(path.join(tmpHome, 'minion'), { recursive: true });
		const legacyFile = path.join(tmpHome, 'minion', 'infisical-cache.json');
		fs.writeFileSync(
			legacyFile,
			JSON.stringify({
				'minion-core|dev': { env: { X: 'leaked' }, fetchedAt: Date.now(), ttlMs: 300_000 },
			}),
		);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mockExit(0, 'X=1\n');
		const r = await fetchInfisicalSecrets('minion-core', { noCache: true });
		expect(fs.existsSync(legacyFile)).toBe(false);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(r)).not.toContain('leaked');
		warnSpy.mockRestore();
	});

	it('returns ok=false when stdout is empty', async () => {
		mockExit(0, '');
		const r = await fetchInfisicalSecrets('minion-core', { noCache: true });
		expect(r.ok).toBe(false);
		expect(r.error).toContain('empty');
	});

	it('passes --projectSlug and --env to the CLI', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-hub', { noCache: true, env: 'prod' });
		expect(spawnSyncMock).toHaveBeenCalledWith(
			'infisical',
			expect.arrayContaining([
				'secrets',
				'--projectSlug',
				'minion-hub',
				'--env',
				'prod',
				'-o',
				'dotenv',
				'--silent',
			]),
			expect.any(Object),
		);
	});

	it('cacheKeys allowlist narrows a later cache hit, but keyNames still lists every fetched name', async () => {
		mockExit(0, 'MINION_SECRETS_KEY=b64==\nOPENAI_API_KEY=sk-legacy\n');
		await fetchInfisicalSecrets('minion-core', { cacheKeys: ['MINION_SECRETS_KEY'] });
		spawnSyncMock.mockReset(); // the next call must be served from the memo, not a fresh spawn
		const r = await fetchInfisicalSecrets('minion-core', { cacheKeys: ['MINION_SECRETS_KEY'] });
		expect(r.env).toEqual({ MINION_SECRETS_KEY: 'b64==' });
		expect([...(r.keyNames ?? [])].sort()).toEqual(['MINION_SECRETS_KEY', 'OPENAI_API_KEY']);
		expect(spawnSyncMock).not.toHaveBeenCalled();
	});

	it('cacheKeys: [] stores and returns no cached values, and never shares identity with no allowlist', async () => {
		mockExit(0, 'A=1\nB=2\n');
		await fetchInfisicalSecrets('minion-core', { cacheKeys: [] });
		spawnSyncMock.mockReset();
		const hit = await fetchInfisicalSecrets('minion-core', { cacheKeys: [] });
		expect(hit.env).toEqual({});
		expect(spawnSyncMock).not.toHaveBeenCalled(); // still served from its own (empty) memo entry

		mockExit(0, 'A=1\nB=2\n');
		const noAllowlist = await fetchInfisicalSecrets('minion-core');
		expect(spawnSyncMock).toHaveBeenCalledTimes(1); // distinct cache identity from cacheKeys: []
		expect(noAllowlist.env).toEqual({ A: '1', B: '2' });
	});

	it('different domain or cacheKeys inputs never share a cache entry', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { domain: 'https://a.example' });
		await fetchInfisicalSecrets('minion-core', { domain: 'https://b.example' });
		expect(spawnSyncMock).toHaveBeenCalledTimes(2);
	});

	it('a case-differing domain path is a distinct cache identity, not a hit on the other case', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { domain: 'https://vault.example/api/TenantA' });
		await fetchInfisicalSecrets('minion-core', { domain: 'https://vault.example/api/tenanta' });
		expect(spawnSyncMock).toHaveBeenCalledTimes(2);
	});

	it('passes the exact domain string to the CLI, unmodified in case', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { domain: 'https://vault.example/api/TenantA' });
		expect(spawnSyncMock).toHaveBeenCalledWith(
			'infisical',
			expect.arrayContaining(['--domain', 'https://vault.example/api/TenantA']),
			expect.anything(),
		);
	});

	it('a whitespace-only domain canonicalizes the same as absent, sharing one cache identity', async () => {
		mockExit(0, 'X=1\n');
		const first = await fetchInfisicalSecrets('minion-core', { domain: undefined });
		expect(spawnSyncMock).toHaveBeenCalledTimes(1);
		expect(spawnSyncMock).toHaveBeenCalledWith(
			'infisical',
			expect.not.arrayContaining(['--domain']),
			expect.anything(),
		);

		spawnSyncMock.mockReset();
		// A malformed whitespace-only domain canonicalizes to the same identity as an absent domain —
		// it is a cache HIT here, not a fresh CLI call with a literal `--domain '   '` argument.
		const second = await fetchInfisicalSecrets('minion-core', { domain: '   ' });
		expect(spawnSyncMock).not.toHaveBeenCalled();
		expect(second).toEqual(first);
	});

	it('reordered/duplicated cacheKeys canonicalize to the same cache entry', async () => {
		mockExit(0, 'A=1\nB=2\n');
		await fetchInfisicalSecrets('minion-core', { cacheKeys: ['A', 'B'] });
		await fetchInfisicalSecrets('minion-core', { cacheKeys: ['B', 'A', 'A'] });
		expect(spawnSyncMock).toHaveBeenCalledTimes(1);
	});
});
