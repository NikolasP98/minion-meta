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

describe('fetchInfisicalSecrets', () => {
	const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-infisical-'));
	const prevXdg = process.env.XDG_CONFIG_HOME;

	beforeEach(() => {
		process.env.XDG_CONFIG_HOME = tmpHome;
		fs.rmSync(path.join(tmpHome, 'minion'), { recursive: true, force: true });
		spawnSyncMock.mockReset();
	});
	afterEach(() => {
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
		else process.env.XDG_CONFIG_HOME = prevXdg;
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

	it('writes cache file with mode 0600 on successful fetch', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { noCache: false });
		const cacheFile = path.join(tmpHome, 'minion', 'infisical-cache.json');
		expect(fs.existsSync(cacheFile)).toBe(true);
		const stat = fs.statSync(cacheFile);
		expect(stat.mode & 0o777).toBe(0o600);
	});

	it('reads from cache on second call within TTL', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core');
		await fetchInfisicalSecrets('minion-core');
		expect(spawnSyncMock).toHaveBeenCalledTimes(1); // second call served from cache
	});

	it('noCache bypasses cache read AND write', async () => {
		mockExit(0, 'X=1\n');
		await fetchInfisicalSecrets('minion-core', { noCache: true });
		await fetchInfisicalSecrets('minion-core', { noCache: true });
		expect(spawnSyncMock).toHaveBeenCalledTimes(2);
		expect(fs.existsSync(path.join(tmpHome, 'minion', 'infisical-cache.json'))).toBe(false);
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
});
