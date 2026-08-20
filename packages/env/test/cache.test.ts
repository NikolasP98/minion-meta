import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	cacheDir,
	cachePath,
	resolveCacheMode,
	buildCacheKey,
	canonicalizeDomain,
	readCache,
	writeCache,
	purgeLegacyCacheOnce,
	resetCacheStateForTests,
} from '../src/cache.js';

describe('cache.ts', () => {
	const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cache-'));
	const prevXdg = process.env.XDG_CONFIG_HOME;
	const prevMode = process.env.MINION_ENV_CACHE;

	beforeEach(() => {
		process.env.XDG_CONFIG_HOME = tmpHome;
		delete process.env.MINION_ENV_CACHE;
		fs.rmSync(path.join(tmpHome, 'minion'), { recursive: true, force: true });
		resetCacheStateForTests();
	});
	afterEach(() => {
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
		else process.env.XDG_CONFIG_HOME = prevXdg;
		if (prevMode === undefined) delete process.env.MINION_ENV_CACHE;
		else process.env.MINION_ENV_CACHE = prevMode;
	});

	describe('resolveCacheMode', () => {
		it('defaults to memory when unset', () => {
			expect(resolveCacheMode()).toBe('memory');
		});

		it('accepts off/memory case-insensitively and trims whitespace', () => {
			process.env.MINION_ENV_CACHE = '  OFF  ';
			expect(resolveCacheMode()).toBe('off');
			process.env.MINION_ENV_CACHE = 'Memory';
			expect(resolveCacheMode()).toBe('memory');
		});

		it("falls back to memory and warns for 'disk' (not implemented in S1)", () => {
			process.env.MINION_ENV_CACHE = 'disk';
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(resolveCacheMode()).toBe('memory');
			expect(warnSpy).toHaveBeenCalledTimes(1);
			warnSpy.mockRestore();
		});

		it('falls back to memory and warns, naming the value, for anything unrecognized', () => {
			process.env.MINION_ENV_CACHE = 'yolo';
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(resolveCacheMode()).toBe('memory');
			expect(warnSpy.mock.calls[0]?.[0]).toContain('yolo');
			warnSpy.mockRestore();
		});
	});

	describe('buildCacheKey', () => {
		it('is stable for identical inputs', () => {
			const a = buildCacheKey('minion-core', 'dev', undefined, ['MINION_SECRETS_KEY']);
			const b = buildCacheKey('minion-core', 'dev', undefined, ['MINION_SECRETS_KEY']);
			expect(a).toBe(b);
		});

		it('differs by domain, including an explicit default sentinel', () => {
			const noDomain = buildCacheKey('minion-core', 'dev', undefined, undefined);
			const withDomain = buildCacheKey('minion-core', 'dev', 'https://eu.infisical.com', undefined);
			expect(noDomain).not.toBe(withDomain);
		});

		it('canonicalizes cacheKeys — order and duplicates do not matter', () => {
			const a = buildCacheKey('minion-core', 'dev', undefined, ['A', 'B']);
			const b = buildCacheKey('minion-core', 'dev', undefined, ['B', 'A', 'A']);
			expect(a).toBe(b);
		});

		it('an allowlisted key set differs from no allowlist', () => {
			const all = buildCacheKey('minion-core', 'dev', undefined, undefined);
			const narrowed = buildCacheKey('minion-core', 'dev', undefined, ['MINION_SECRETS_KEY']);
			expect(all).not.toBe(narrowed);
		});

		it('an empty allowlist differs from no allowlist', () => {
			const noAllowlist = buildCacheKey('minion-core', 'dev', undefined, undefined);
			const emptyAllowlist = buildCacheKey('minion-core', 'dev', undefined, []);
			expect(noAllowlist).not.toBe(emptyAllowlist);
		});

		it('does not collide across a delimiter embedded in a project/env value', () => {
			const a = buildCacheKey('a|b', 'c', undefined, undefined);
			const b = buildCacheKey('a', 'b|c', undefined, undefined);
			expect(a).not.toBe(b);
		});

		it('does not collide across a comma embedded in a cacheKeys entry vs. two separate entries', () => {
			const a = buildCacheKey('p', 'dev', undefined, ['A,B']);
			const b = buildCacheKey('p', 'dev', undefined, ['A', 'B']);
			expect(a).not.toBe(b);
		});

		it('a literal domain matching the default sentinel does not collide with an absent domain', () => {
			const absent = buildCacheKey('p', 'dev', undefined, undefined);
			const literal = buildCacheKey('p', 'dev', '__default__', undefined);
			expect(absent).not.toBe(literal);
		});

		it('preserves domain case — a path-case difference is a distinct identity', () => {
			const upper = buildCacheKey('p', 'dev', 'https://vault.example/api/TenantA', undefined);
			const lower = buildCacheKey('p', 'dev', 'https://vault.example/api/tenanta', undefined);
			expect(upper).not.toBe(lower);
		});

		it('a whitespace-only domain canonicalizes the same as an absent domain', () => {
			const absent = buildCacheKey('p', 'dev', undefined, undefined);
			const whitespace = buildCacheKey('p', 'dev', '   ', undefined);
			expect(absent).toBe(whitespace);
		});
	});

	describe('canonicalizeDomain', () => {
		it('passes through undefined', () => {
			expect(canonicalizeDomain(undefined)).toBeUndefined();
		});

		it('trims surrounding whitespace but preserves internal case', () => {
			expect(canonicalizeDomain('  https://vault.example/api/TenantA  ')).toBe(
				'https://vault.example/api/TenantA',
			);
		});

		it('canonicalizes a whitespace-only value to undefined', () => {
			expect(canonicalizeDomain('   ')).toBeUndefined();
		});
	});

	describe('readCache / writeCache (process-lifetime memo)', () => {
		it('miss when nothing was ever written', () => {
			expect(readCache('nope')).toBeNull();
		});

		it('hit returns the stored env and keyNames', () => {
			writeCache('k', { A: '1' }, 300_000, ['A', 'B']);
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A', 'B'] });
		});

		it('expires after ttlMs', () => {
			vi.useFakeTimers();
			try {
				writeCache('k', { A: '1' }, 1_000, ['A']);
				expect(readCache('k')).not.toBeNull();
				vi.advanceTimersByTime(1_001);
				expect(readCache('k')).toBeNull();
			} finally {
				vi.useRealTimers();
			}
		});

		it('cacheKeys narrows what is stored, independent of what keyNames records', () => {
			writeCache('k', { A: '1', B: '2' }, 300_000, ['A', 'B'], ['A']);
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A', 'B'] });
		});

		it('an empty cacheKeys allowlist stores nothing, not everything', () => {
			writeCache('k', { A: '1', B: '2' }, 300_000, ['A', 'B'], []);
			expect(readCache('k')).toEqual({ env: {}, keyNames: ['A', 'B'] });
		});

		it('mutating the object passed to writeCache does not corrupt the memo', () => {
			const env = { A: '1' };
			writeCache('k', env, 300_000, ['A']);
			env.A = 'mutated';
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
		});

		it('mutating a value returned from readCache does not corrupt the memo', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			const first = readCache('k');
			if (first) {
				first.env.A = 'mutated';
				first.keyNames.push('INJECTED');
			}
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
		});
	});

	describe('purgeLegacyCacheOnce', () => {
		function legacyFile(): string {
			return path.join(tmpHome, 'minion', 'infisical-cache.json');
		}

		it('no-ops when there is no cache file', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(() => purgeLegacyCacheOnce()).not.toThrow();
			expect(warnSpy).not.toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('deletes a legacy-shaped file and warns exactly once', () => {
			fs.mkdirSync(cacheDir(), { recursive: true });
			fs.writeFileSync(
				cachePath(),
				JSON.stringify({ 'minion-core|dev': { env: { X: 'leaked' }, fetchedAt: 1, ttlMs: 1 } }),
			);
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			purgeLegacyCacheOnce();
			expect(fs.existsSync(legacyFile())).toBe(false);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			warnSpy.mockRestore();
		});

		it('only purges once per process even if called repeatedly', () => {
			fs.mkdirSync(cacheDir(), { recursive: true });
			fs.writeFileSync(
				cachePath(),
				JSON.stringify({ 'minion-core|dev': { env: { X: 'leaked' }, fetchedAt: 1, ttlMs: 1 } }),
			);
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			purgeLegacyCacheOnce();
			purgeLegacyCacheOnce();
			purgeLegacyCacheOnce();
			expect(warnSpy).toHaveBeenCalledTimes(1);
			warnSpy.mockRestore();
		});

		it('leaves a non-legacy-shaped JSON file alone (e.g. a future sealed envelope)', () => {
			fs.mkdirSync(cacheDir(), { recursive: true });
			fs.writeFileSync(
				cachePath(),
				JSON.stringify({ v: 1, alg: 'aes-256-gcm', kdf: 'hkdf-sha256', boundTo: 'ab', iv: 'x', tag: 'y', ct: 'z' }),
			);
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			purgeLegacyCacheOnce();
			expect(fs.existsSync(legacyFile())).toBe(true);
			expect(warnSpy).not.toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('leaves unparseable garbage alone rather than throwing', () => {
			fs.mkdirSync(cacheDir(), { recursive: true });
			fs.writeFileSync(cachePath(), 'not json at all {{{');
			expect(() => purgeLegacyCacheOnce()).not.toThrow();
			expect(fs.existsSync(legacyFile())).toBe(true);
		});
	});
});
