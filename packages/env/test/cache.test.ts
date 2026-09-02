import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
	cacheDir,
	cachePath,
	resolveCacheMode,
	buildCacheKey,
	canonicalizeDomain,
	readCache,
	writeCache,
	purgeLegacyCacheOnce,
	cacheStatus,
	resetCacheStateForTests,
} from '../src/cache.js';
import { InvalidCacheKeyError, seal as realSeal } from '../src/cache-crypto.js';
import * as cacheCrypto from '../src/cache-crypto.js';
import { spawnTsx } from './helpers/spawn-tsx.js';

describe('cache.ts', () => {
	const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cache-'));
	const prevXdg = process.env.XDG_CONFIG_HOME;
	const prevMode = process.env.MINION_ENV_CACHE;
	const prevKey = process.env.MINION_ENV_CACHE_KEY;

	beforeEach(() => {
		process.env.XDG_CONFIG_HOME = tmpHome;
		delete process.env.MINION_ENV_CACHE;
		delete process.env.MINION_ENV_CACHE_KEY;
		fs.rmSync(path.join(tmpHome, 'minion'), { recursive: true, force: true });
		resetCacheStateForTests();
	});
	afterEach(() => {
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
		else process.env.XDG_CONFIG_HOME = prevXdg;
		if (prevMode === undefined) delete process.env.MINION_ENV_CACHE;
		else process.env.MINION_ENV_CACHE = prevMode;
		if (prevKey === undefined) delete process.env.MINION_ENV_CACHE_KEY;
		else process.env.MINION_ENV_CACHE_KEY = prevKey;
	});

	describe('resolveCacheMode', () => {
		it('defaults to disk when unset (S2: sealed cross-process cache is on by default)', () => {
			expect(resolveCacheMode()).toBe('disk');
		});

		it('accepts off/memory/disk case-insensitively and trims whitespace, without warning', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env.MINION_ENV_CACHE = '  OFF  ';
			expect(resolveCacheMode()).toBe('off');
			process.env.MINION_ENV_CACHE = 'Memory';
			expect(resolveCacheMode()).toBe('memory');
			process.env.MINION_ENV_CACHE = 'Disk';
			expect(resolveCacheMode()).toBe('disk');
			expect(warnSpy).not.toHaveBeenCalled();
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

	describe('sealed disk cache (S2)', () => {
		function readEnvelope(): Record<string, unknown> {
			return JSON.parse(fs.readFileSync(cachePath(), 'utf8'));
		}

		it('a write in disk mode produces a sealed envelope, not the entry shape', () => {
			writeCache('k', { MINION_SECRETS_KEY: 'sekrit' }, 300_000, ['MINION_SECRETS_KEY']);
			const envelope = readEnvelope();
			expect(Object.keys(envelope).sort()).toEqual(
				['alg', 'boundTo', 'ct', 'iv', 'kdf', 'tag', 'v'].sort(),
			);
			expect(envelope.v).toBe(1);
			expect(envelope.alg).toBe('aes-256-gcm');
			expect(envelope.kdf).toBe('hkdf-sha256');
		});

		it('the sealed file never contains the plaintext value or key name as a substring', () => {
			writeCache('k', { MINION_SECRETS_KEY: 'SENTINEL-DO-NOT-PERSIST' }, 300_000, [
				'MINION_SECRETS_KEY',
			]);
			const raw = fs.readFileSync(cachePath(), 'utf8');
			expect(raw).not.toContain('SENTINEL-DO-NOT-PERSIST');
			expect(raw).not.toContain('MINION_SECRETS_KEY');
		});

		it('the cache file is 0600, the key file is 0600, and the dir is 0700', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			expect(fs.statSync(cachePath()).mode & 0o777).toBe(0o600);
			expect(fs.statSync(path.join(cacheDir(), 'cache.key')).mode & 0o777).toBe(0o600);
			expect(fs.statSync(cacheDir()).mode & 0o777).toBe(0o700);
		});

		it('mode is enforced even over a pre-existing looser file/dir', () => {
			// Seed a valid, authenticatable envelope first — a rejected (unauthenticatable) file must
			// never be overwritten (see the "never overwrites a rejected disk file" tests below), so this
			// test loosens the mode on a *valid* envelope to isolate the mode-enforcement behavior.
			writeCache('seed', { A: '0' }, 300_000, ['A']);
			fs.chmodSync(cachePath(), 0o644);
			fs.chmodSync(cacheDir(), 0o755);
			writeCache('k', { A: '1' }, 300_000, ['A']);
			expect(fs.statSync(cachePath()).mode & 0o777).toBe(0o600);
			expect(fs.statSync(cacheDir()).mode & 0o777).toBe(0o700);
		});

		it('a same-process write, memo-cleared read is served from disk (cross-process simulation)', () => {
			writeCache('k', { A: '1' }, 300_000, ['A', 'B']);
			resetCacheStateForTests(); // clears the memo only; the sealed file on disk survives
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A', 'B'] });
		});

		it('a disk hit is promoted into the memo — a second read never touches disk again', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			resetCacheStateForTests();
			readCache('k'); // disk hit, promotes into memo
			fs.rmSync(cachePath()); // if the second read still hit disk, this would make it a miss
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
		});

		it('TTL is honored on a disk-served read, even after the memo is cleared', () => {
			vi.useFakeTimers();
			try {
				writeCache('k', { A: '1' }, 1_000, ['A']);
				resetCacheStateForTests();
				vi.advanceTimersByTime(1_001);
				expect(readCache('k')).toBeNull();
			} finally {
				vi.useRealTimers();
			}
		});

		it('a tampered ciphertext byte is a miss, not a throw, with exactly one warning', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			resetCacheStateForTests();
			const envelope = readEnvelope();
			const ct = Buffer.from(envelope.ct as string, 'base64');
			ct[0] = ct[0]! ^ 0xff;
			envelope.ct = ct.toString('base64');
			fs.writeFileSync(cachePath(), JSON.stringify(envelope));

			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(() => readCache('k')).not.toThrow();
			expect(readCache('k')).toBeNull();
			expect(warnSpy).toHaveBeenCalledTimes(1);
			warnSpy.mockRestore();
		});

		it('a foreign boundTo is a miss and the warning names a different machine', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			resetCacheStateForTests();
			const envelope = readEnvelope();
			envelope.boundTo = 'deadbeefdeadbeef';
			fs.writeFileSync(cachePath(), JSON.stringify(envelope));

			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(readCache('k')).toBeNull();
			expect(warnSpy.mock.calls[0]?.[0]).toContain('different machine');
			warnSpy.mockRestore();
		});

		it('an unsupported envelope version is a miss, not a throw', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			resetCacheStateForTests();
			const envelope = readEnvelope();
			envelope.v = 2;
			fs.writeFileSync(cachePath(), JSON.stringify(envelope));
			expect(() => readCache('k')).not.toThrow();
			expect(readCache('k')).toBeNull();
		});

		it('memory mode never touches disk at all', () => {
			process.env.MINION_ENV_CACHE = 'memory';
			writeCache('k', { A: '1' }, 300_000, ['A']);
			expect(fs.existsSync(cachePath())).toBe(false);
		});

		it('a valid MINION_ENV_CACHE_KEY is used in preference to the key file, and no cache.key is created', () => {
			process.env.MINION_ENV_CACHE_KEY = Buffer.alloc(32, 7).toString('base64');
			try {
				writeCache('k', { A: '1' }, 300_000, ['A']);
				expect(fs.existsSync(path.join(cacheDir(), 'cache.key'))).toBe(false);
				resetCacheStateForTests();
				expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
			} finally {
				delete process.env.MINION_ENV_CACHE_KEY;
			}
		});

		it('an invalid MINION_ENV_CACHE_KEY throws a named error rather than silently falling back', () => {
			process.env.MINION_ENV_CACHE_KEY = 'not-base64-!!';
			try {
				expect(() => writeCache('k', { A: '1' }, 300_000, ['A'])).toThrow(/MINION_ENV_CACHE_KEY/);
			} finally {
				delete process.env.MINION_ENV_CACHE_KEY;
			}
		});

		it('an invalid MINION_ENV_CACHE_KEY stays rejected on every call — no memo or disk state survives a failed write', () => {
			process.env.MINION_ENV_CACHE_KEY = 'not-base64-!!';
			try {
				expect(() => writeCache('k', { A: '1' }, 300_000, ['A'])).toThrow(InvalidCacheKeyError);
				expect(() => readCache('k')).toThrow(InvalidCacheKeyError);
				expect(() => writeCache('k', { A: '1' }, 300_000, ['A'])).toThrow(InvalidCacheKeyError);
				expect(() => readCache('k')).toThrow(InvalidCacheKeyError);
				expect(fs.existsSync(cachePath())).toBe(false);
			} finally {
				delete process.env.MINION_ENV_CACHE_KEY;
			}
		});

		it('rejects a malformed operator key before returning a populated memo entry', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			process.env.MINION_ENV_CACHE_KEY = 'not-base64-!!';

			expect(() => readCache('k')).toThrow(InvalidCacheKeyError);
		});

		it('a valid disk hit enforces the 0700 directory mode too, not only a write', () => {
			writeCache('k', { A: '1' }, 300_000, ['A']);
			resetCacheStateForTests(); // memo gone; the sealed file (authentic) stays on disk
			fs.chmodSync(cacheDir(), 0o755);
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
			expect(fs.statSync(cacheDir()).mode & 0o777).toBe(0o700);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			warnSpy.mockRestore();
		});

		describe('a rejected disk file is never overwritten — it is evidence, not a cache entry', () => {
			function seedAndCorrupt(mutate: (envelope: Record<string, unknown>) => void): Buffer {
				writeCache('k', { A: '1' }, 300_000, ['A']);
				resetCacheStateForTests();
				const envelope = readEnvelope();
				mutate(envelope);
				fs.writeFileSync(cachePath(), JSON.stringify(envelope));
				return fs.readFileSync(cachePath());
			}

			it('survives a tampered ciphertext byte-for-byte across a successful refetch', () => {
				const before = seedAndCorrupt((e) => {
					const ct = Buffer.from(e.ct as string, 'base64');
					ct[0] = ct[0]! ^ 0xff;
					e.ct = ct.toString('base64');
				});
				expect(readCache('k')).toBeNull(); // rejected → caller would refetch
				writeCache('k', { A: '1' }, 300_000, ['A']); // simulates that refetch being stored
				expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
			});

			it('survives a foreign-machine boundTo byte-for-byte across a successful refetch', () => {
				const before = seedAndCorrupt((e) => {
					e.boundTo = 'deadbeefdeadbeef';
				});
				expect(readCache('k')).toBeNull();
				writeCache('k', { A: '1' }, 300_000, ['A']);
				expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
			});

			it('survives an unsupported envelope version byte-for-byte across a successful refetch', () => {
				const before = seedAndCorrupt((e) => {
					e.v = 2;
				});
				expect(readCache('k')).toBeNull();
				writeCache('k', { A: '1' }, 300_000, ['A']);
				expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
			});

			it('survives corrupt/unparseable JSON byte-for-byte across a successful refetch', () => {
				fs.mkdirSync(cacheDir(), { recursive: true });
				fs.writeFileSync(cachePath(), 'not json at all {{{');
				const before = fs.readFileSync(cachePath());
				expect(readCache('k')).toBeNull();
				writeCache('k', { A: '1' }, 300_000, ['A']);
				expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
			});
		});

		it(
			'a same-path swap between classification and commit is preserved because existing paths are ' +
				'never replaced',
			() => {
				writeCache('seed', { A: '0' }, 300_000, ['A']); // establishes a real authenticated baseline
				resetCacheStateForTests();

				const swapped = Buffer.from('UNAUTHENTICATED-EVIDENCE');
				// `seal()` runs after `writeDiskEntry` has read and classified the disk file. A concurrent
				// writer landing here is preserved because the occupied path is never replaced.
				const sealSpy = vi.spyOn(cacheCrypto, 'seal').mockImplementation((dir, plaintext) => {
					sealSpy.mockRestore(); // swap exactly once
					fs.writeFileSync(cachePath(), swapped);
					return realSeal(dir, plaintext);
				});

				const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
				writeCache('k', { A: '1' }, 300_000, ['A']); // must NOT clobber the swapped-in bytes
				warnSpy.mockRestore();

				expect(fs.readFileSync(cachePath()).equals(swapped)).toBe(true);
				resetCacheStateForTests();
				expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
			},
		);

		it('an expired entry can be refreshed and read after process state is reset', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-08-30T00:00:00Z'));
			writeCache('k', { A: 'old' }, 300_000, ['A']);
			resetCacheStateForTests();
			vi.advanceTimersByTime(301_000);
			expect(readCache('k')).toBeNull();

			writeCache('k', { A: 'fresh' }, 300_000, ['A']);
			resetCacheStateForTests();
			expect(readCache('k')).toEqual({ env: { A: 'fresh' }, keyNames: ['A'] });
			vi.useRealTimers();
		});

		it('many completed refreshes retain only two authenticated generations and serve the newest', () => {
			for (let generation = 0; generation < 50; generation += 1) {
				resetCacheStateForTests();
				writeCache('k', { A: String(generation) }, 300_000, ['A']);
			}

			const generations = fs
				.readdirSync(cacheDir())
				.filter((name) => name === 'infisical-cache.json' || /^infisical-cache\.g\d{16}\.json$/.test(name));
			expect(generations).toHaveLength(2);
			resetCacheStateForTests();
			expect(readCache('k')).toEqual({ env: { A: '49' }, keyNames: ['A'] });
		});

		describe('a cache that could not be READ is evidence too, not an absent one', () => {
			const asRoot = process.getuid?.() === 0;

			// Root bypasses file permission bits, so `chmod 000` produces a successful read there and
			// this case cannot be provoked. The EISDIR sibling below covers the same branch for any uid.
			it.skipIf(asRoot)(
				'an unreadable (EACCES) cache file is a miss, warns once, and is never overwritten',
				() => {
					writeCache('k', { A: '1' }, 300_000, ['A']);
					resetCacheStateForTests();
					const before = fs.readFileSync(cachePath()); // captured while it is still readable
					fs.chmodSync(cachePath(), 0o000);
					const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

					expect(readCache('k')).toBeNull(); // miss, not a throw → caller refetches
					writeCache('k', { A: '2' }, 300_000, ['A']); // simulates storing that refetch

					expect(warnSpy).toHaveBeenCalledTimes(1);
					expect(warnSpy.mock.calls[0]?.[0]).toContain('unreadable');
					warnSpy.mockRestore();
					expect(fs.statSync(cachePath()).mode & 0o777).toBe(0o000);
					fs.chmodSync(cachePath(), 0o600);
					expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
				},
			);

			it('a non-file at the cache path is a miss, not a throw, and is left in place', () => {
				fs.mkdirSync(cachePath(), { recursive: true }); // EISDIR on read, for any uid
				const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
				expect(readCache('k')).toBeNull();
				expect(() => writeCache('k', { A: '1' }, 300_000, ['A'])).not.toThrow();
				warnSpy.mockRestore();
				expect(fs.statSync(cachePath()).isDirectory()).toBe(true);
			});

			it('the memo still serves the refetched value while the cache stays unwritable', () => {
				fs.mkdirSync(cachePath(), { recursive: true });
				const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
				writeCache('k', { A: '1' }, 300_000, ['A']);
				warnSpy.mockRestore();
				expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
			});
		});

		describe('a config root that cannot host the cache directory', () => {
			let rootFile: string;

			beforeEach(() => {
				rootFile = path.join(tmpHome, 'not-a-directory');
				fs.writeFileSync(rootFile, 'a regular file where a config dir should be');
				process.env.XDG_CONFIG_HOME = rootFile;
			});

			it('is a miss, never a throw — secrets resolve from the authoritative fetch instead', () => {
				const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
				expect(() => readCache('k')).not.toThrow();
				expect(readCache('k')).toBeNull();
				expect(warnSpy.mock.calls[0]?.[0]).toContain('cache directory');
				warnSpy.mockRestore();
			});

			it('does not throw on write either, and leaves the config root untouched', () => {
				const before = fs.readFileSync(rootFile);
				const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
				expect(() => writeCache('k', { A: '1' }, 300_000, ['A'])).not.toThrow();
				warnSpy.mockRestore();
				expect(fs.readFileSync(rootFile).equals(before)).toBe(true);
				expect(readCache('k')).toEqual({ env: { A: '1' }, keyNames: ['A'] }); // memo still works
			});
		});
	});

	describe('cross-process disk-write race (real OS processes, not a same-process simulation)', () => {
		const helperScript = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			'helpers',
			'race-write.mjs',
		);

		it(
			'two interleaved writers publish complete generations and the later generation contains both writes',
			async () => {
				const raceHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cache-race-'));
				const barrier = path.join(raceHome, 'go');
				const outA = path.join(raceHome, 'a.json');
				const outB = path.join(raceHome, 'b.json');

				try {
					const racers = Promise.all([
						spawnTsx(helperScript, [raceHome, barrier, outA, 'from-a', 'A-value']),
						spawnTsx(helperScript, [raceHome, barrier, outB, 'from-b', 'B-value']),
					]);
					// Give both processes time to reach the spin-wait before releasing them together —
					// this is what makes the read-merge-seal-publish transaction in `writeDiskEntry`
					// actually overlap, rather than the two writes happening safely one after another.
					await new Promise((resolve) => setTimeout(resolve, 300));
					fs.writeFileSync(barrier, '');
					await racers;

					process.env.XDG_CONFIG_HOME = raceHome;
					resetCacheStateForTests();
					try {
						const fromA = readCache('from-a');
						const fromB = readCache('from-b');
						expect(fromA).toEqual({ env: { V: 'A-value' }, keyNames: ['V'] });
						expect(fromB).toEqual({ env: { V: 'B-value' }, keyNames: ['V'] });
					} finally {
						resetCacheStateForTests();
					}
				} finally {
					fs.rmSync(raceHome, { recursive: true, force: true });
				}
			},
			15_000,
		);

		it(
			'does not reap an old live lock, then serializes the waiting writer and retains both entries',
			async () => {
				if (process.platform === 'win32') return;
				const raceHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cache-old-live-lock-'));
				const dir = path.join(raceHome, 'minion');
				const fifo = path.join(dir, 'infisical-cache.json');
				const lock = path.join(dir, 'infisical-cache.lock');
				const ready = path.join(raceHome, 'go');
				const outA = path.join(raceHome, 'a.json');
				const outB = path.join(raceHome, 'b.json');

				try {
					fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
					await new Promise<void>((resolve, reject) => {
						const mkfifo = spawn('mkfifo', [fifo]);
						mkfifo.on('error', reject);
						mkfifo.on('exit', (code) =>
							code === 0 ? resolve() : reject(new Error(`mkfifo exited ${code}`)),
						);
					});
					fs.writeFileSync(ready, '');
					const writerA = spawnTsx(helperScript, [raceHome, ready, outA, 'from-a', 'A-value']);
					for (let attempt = 0; attempt < 500 && !fs.existsSync(lock); attempt += 1) {
						await new Promise((resolve) => setTimeout(resolve, 10));
					}
					expect(fs.existsSync(lock)).toBe(true);
					const liveLock = fs.statSync(lock);
					const old = new Date(Date.now() - 60_000);
					fs.utimesSync(lock, old, old);

					let writerBFinished = false;
					const writerB = spawnTsx(helperScript, [raceHome, ready, outB, 'from-b', 'B-value']).then(
						() => {
							writerBFinished = true;
						},
					);
					await new Promise((resolve) => setTimeout(resolve, 250));
					expect(writerBFinished).toBe(false);
					expect(fs.statSync(lock).ino).toBe(liveLock.ino);

					const fifoProducer = new Promise<void>((resolve, reject) => {
						const producer = spawn(
							'/bin/sh',
							[
								'-c',
								'exec 3>"$1"; rm -f "$1"; printf %s "$2" >&3; exec 3>&-',
								'sh',
								fifo,
								'blocked live holder may now finish',
							],
							{ stdio: 'ignore' },
						);
						producer.on('error', reject);
						producer.on('exit', (code) =>
							code === 0 ? resolve() : reject(new Error(`FIFO producer exited ${code}`)),
						);
					});
					await Promise.all([fifoProducer, writerA, writerB]);

					process.env.XDG_CONFIG_HOME = raceHome;
					resetCacheStateForTests();
					try {
						expect(readCache('from-a')).toEqual({ env: { V: 'A-value' }, keyNames: ['V'] });
						expect(readCache('from-b')).toEqual({ env: { V: 'B-value' }, keyNames: ['V'] });
					} finally {
						resetCacheStateForTests();
					}
				} finally {
					fs.rmSync(raceHome, { recursive: true, force: true });
				}
			},
			15_000,
		);

		it(
			'recovers a lock whose writer crashed and persists the next cross-process value',
			async () => {
				if (process.platform === 'win32') return;
				const raceHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cache-crashed-lock-'));
				const dir = path.join(raceHome, 'minion');
				const fifo = path.join(dir, 'infisical-cache.json');
				const lock = path.join(dir, 'infisical-cache.lock');
				const ready = path.join(raceHome, 'go');
				const out = path.join(raceHome, 'crashed.json');
				const tsxBin = path.resolve(
					path.dirname(fileURLToPath(import.meta.url)),
					'..',
					'node_modules',
					'.bin',
					'tsx',
				);

				try {
					fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
					await new Promise<void>((resolve, reject) => {
						const mkfifo = spawn('mkfifo', [fifo]);
						mkfifo.on('error', reject);
						mkfifo.on('exit', (code) =>
							code === 0 ? resolve() : reject(new Error(`mkfifo exited ${code}`)),
						);
					});
					fs.writeFileSync(ready, '');
					const crashedWriter = spawn(
						tsxBin,
						[helperScript, raceHome, ready, out, 'crashed', 'uncommitted'],
						{ stdio: 'ignore' },
					);
					const crashedWriterExit = new Promise<void>((resolve, reject) => {
						crashedWriter.on('error', reject);
						crashedWriter.on('exit', () => resolve());
					});
					for (let attempt = 0; attempt < 500 && !fs.existsSync(lock); attempt += 1) {
						await new Promise((resolve) => setTimeout(resolve, 10));
					}
					expect(fs.existsSync(lock)).toBe(true);
					const lockOwner = JSON.parse(fs.readFileSync(lock, 'utf8')) as { pid: number };
					expect(Number.isInteger(lockOwner.pid)).toBe(true);
					process.kill(lockOwner.pid, 'SIGKILL');
					await crashedWriterExit;
					fs.rmSync(fifo);

					process.env.XDG_CONFIG_HOME = raceHome;
					resetCacheStateForTests();
					writeCache('after-crash', { V: 'persisted' }, 300_000, ['V']);
					resetCacheStateForTests();

					expect(fs.existsSync(lock)).toBe(false);
					expect(readCache('after-crash')).toEqual({
						env: { V: 'persisted' },
						keyNames: ['V'],
					});
				} finally {
					resetCacheStateForTests();
					fs.rmSync(raceHome, { recursive: true, force: true });
				}
			},
			15_000,
		);

		it('reaps a stale lock when its PID was reused by a different process identity', () => {
			if (process.platform !== 'linux') return;
			fs.mkdirSync(cacheDir(), { recursive: true, mode: 0o700 });
			const lock = path.join(cacheDir(), 'infisical-cache.lock');
			fs.writeFileSync(
				lock,
				JSON.stringify({
					pid: process.pid,
					token: '0'.repeat(32),
					processIdentity: {
						source: 'linux-proc',
						value: '00000000-0000-0000-0000-000000000000:0',
					},
				}),
				{ mode: 0o600 },
			);

			writeCache('after-pid-reuse', { V: 'persisted' }, 300_000, ['V']);
			resetCacheStateForTests();

			expect(fs.existsSync(lock)).toBe(false);
			expect(readCache('after-pid-reuse')).toEqual({
				env: { V: 'persisted' },
				keyNames: ['V'],
			});
		});

		it('uses the safe PID-only fallback when process-start identity is unavailable', () => {
			if (process.platform === 'win32') return;
			fs.mkdirSync(cacheDir(), { recursive: true, mode: 0o700 });
			const lock = path.join(cacheDir(), 'infisical-cache.lock');
			fs.writeFileSync(
				lock,
				JSON.stringify({ pid: 2_147_483_647, token: '1'.repeat(32), processIdentity: null }),
				{ mode: 0o600 },
			);

			writeCache('after-identity-fallback', { V: 'persisted' }, 300_000, ['V']);
			resetCacheStateForTests();

			expect(fs.existsSync(lock)).toBe(false);
			expect(readCache('after-identity-fallback')).toEqual({
				env: { V: 'persisted' },
				keyNames: ['V'],
			});
		});
	});

	it('fails soft instead of looping when the safe generation space is exhausted', () => {
		fs.mkdirSync(cacheDir(), { recursive: true, mode: 0o700 });
		const exhausted = path.join(
			cacheDir(),
			`infisical-cache.g${String(Number.MAX_SAFE_INTEGER).padStart(16, '0')}.json`,
		);
		const evidence = Buffer.from('UNAUTHENTICATED-EVIDENCE');
		fs.writeFileSync(exhausted, evidence, { mode: 0o600 });
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(() => writeCache('memo-only', { V: 'fresh' }, 300_000, ['V'])).not.toThrow();
		expect(readCache('memo-only')).toEqual({ env: { V: 'fresh' }, keyNames: ['V'] });
		expect(warnSpy.mock.calls.some(([message]) => String(message).includes('generation space is exhausted'))).toBe(true);
		expect(fs.readFileSync(exhausted).equals(evidence)).toBe(true);
		expect(
			fs.existsSync(path.join(cacheDir(), 'infisical-cache.g9007199254740992.json')),
		).toBe(false);
		warnSpy.mockRestore();
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

		it(
			'preserves a replacement published after the legacy object is selected',
			async () => {
				if (process.platform === 'win32') return;
				fs.mkdirSync(cacheDir(), { recursive: true });
				const fifo = legacyFile();
				const wrote = path.join(tmpHome, 'legacy-wrote');
				const release = path.join(tmpHome, 'legacy-release');
				fs.rmSync(wrote, { force: true });
				fs.rmSync(release, { force: true });
				await new Promise<void>((resolve, reject) => {
					const mkfifo = spawn('mkfifo', [fifo]);
					mkfifo.on('error', reject);
					mkfifo.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`mkfifo exited ${code}`))));
				});

				const legacy = JSON.stringify({ k: { env: { X: 'leaked' }, fetchedAt: 1, ttlMs: 1 } });
				const writer = spawn(
					'/bin/sh',
					[
						'-c',
						'exec 3>"$1"; printf %s "$4" >&3; : >"$2"; while [ ! -e "$3" ]; do sleep 0.01; done; exec 3>&-',
						'sh',
						fifo,
						wrote,
						release,
						legacy,
					],
					{ stdio: 'ignore' },
				);
				const writerDone = new Promise<void>((resolve, reject) => {
					writer.on('error', reject);
					writer.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`writer exited ${code}`))));
				});
				const helper = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helpers', 'purge-legacy.mjs');
				const purge = spawnTsx(helper, [tmpHome]);
				for (let attempt = 0; attempt < 500 && !fs.existsSync(wrote); attempt += 1) {
					await new Promise((resolve) => setTimeout(resolve, 10));
				}
				expect(fs.existsSync(wrote)).toBe(true);
				fs.writeFileSync(fifo, 'UNAUTHENTICATED-EVIDENCE');
				fs.writeFileSync(release, '');
				await purge;
				await writerDone;
				expect(fs.readFileSync(fifo, 'utf8')).toBe('UNAUTHENTICATED-EVIDENCE');
			},
			10_000,
		);
	});

	describe('cacheStatus (S3 doctor probe: mode/legacyRemoved/dirModeLoose/quarantineDirs only)', () => {
		it('reports the active mode and no findings on a clean, unused config dir', () => {
			const status = cacheStatus();
			expect(status.mode).toBe('disk');
			expect(status.legacyRemoved).toBe(false);
			expect(status.dirModeLoose).toBe(false);
			expect(status.quarantineDirs).toEqual([]);
		});

		it('reflects a non-default mode', () => {
			process.env.MINION_ENV_CACHE = 'memory';
			expect(cacheStatus().mode).toBe('memory');
		});

		it('reports legacyRemoved after purging a pre-existing legacy plaintext cache', () => {
			fs.mkdirSync(cacheDir(), { recursive: true });
			fs.writeFileSync(
				cachePath(),
				JSON.stringify({ 'minion-core|dev': { env: { X: 'leaked' }, fetchedAt: 1, ttlMs: 1 } }),
			);
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(cacheStatus().legacyRemoved).toBe(true);
			warnSpy.mockRestore();
		});

		it('reports dirModeLoose when the config dir had group/other bits set, and seals it', () => {
			fs.mkdirSync(cacheDir(), { recursive: true, mode: 0o755 });
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(cacheStatus().dirModeLoose).toBe(true);
			warnSpy.mockRestore();
			expect(fs.statSync(cacheDir()).mode & 0o777).toBe(0o700);
		});

		it('lists quarantine directories left behind for operator disposition', () => {
			fs.mkdirSync(cacheDir(), { recursive: true, mode: 0o700 });
			const quarantine = path.join(cacheDir(), '.infisical-cache-quarantine-abc123');
			fs.mkdirSync(quarantine);
			expect(cacheStatus().quarantineDirs).toEqual([quarantine]);
		});

		it('never throws when the config dir cannot be secured', () => {
			// A file occupying the would-be config dir path makes mkdirSync/statSync fail.
			fs.mkdirSync(path.dirname(cacheDir()), { recursive: true });
			fs.writeFileSync(cacheDir(), 'not a directory');
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			expect(() => cacheStatus()).not.toThrow();
			warnSpy.mockRestore();
		});
	});
});
