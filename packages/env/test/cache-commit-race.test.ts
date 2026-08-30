import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	cacheDir,
	cachePath,
	readCache,
	writeCache,
	resetCacheStateForTests,
} from '../src/cache.js';

/**
 * Node has no atomic exchange/no-replace primitive for replacing a pathname. These probes enforce
 * the conservative protocol: an existing cache object is never unlinked or replaced, while an
 * absent path is published with link(2) and loses safely to a concurrent creator.
 */
const hooks = vi.hoisted(() => ({
	onLink: null as null | ((from: string, to: string) => void),
	onUnlink: null as null | ((target: string) => void),
}));

vi.mock('node:fs', async (importOriginal) => {
	const real = await importOriginal<typeof import('node:fs')>();
	const patched = {
		...real,
		linkSync(from: fs.PathLike, to: fs.PathLike): void {
			hooks.onLink?.(String(from), String(to));
			real.linkSync(from, to);
		},
		unlinkSync(target: fs.PathLike): void {
			hooks.onUnlink?.(String(target));
			real.unlinkSync(target);
		},
	};
	return { ...patched, default: patched };
});

const EVIDENCE = Buffer.from('UNAUTHENTICATED-EVIDENCE-AT-UNLINK');

describe('sealed disk cache: conservative no-clobber commit', () => {
	const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-commit-race-'));
	const prevXdg = process.env.XDG_CONFIG_HOME;
	const prevMode = process.env.MINION_ENV_CACHE;

	beforeEach(() => {
		process.env.XDG_CONFIG_HOME = tmpHome;
		delete process.env.MINION_ENV_CACHE;
		fs.rmSync(path.join(tmpHome, 'minion'), { recursive: true, force: true });
		resetCacheStateForTests();
		hooks.onLink = null;
		hooks.onUnlink = null;
	});

	afterEach(() => {
		hooks.onLink = null;
		hooks.onUnlink = null;
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
		else process.env.XDG_CONFIG_HOME = prevXdg;
		if (prevMode === undefined) delete process.env.MINION_ENV_CACHE;
		else process.env.MINION_ENV_CACHE = prevMode;
	});

	it('never reaches an unlink boundary for an existing cache pathname', () => {
		writeCache('seed', { A: '0' }, 300_000, ['A']);
		resetCacheStateForTests();
		const before = fs.readFileSync(cachePath());

		// This reproduces the review probe. If the old link+unlink displacement returns, the hook
		// substitutes unauthenticated bytes immediately before that unlink and the test fails because
		// the implementation attempted to delete a pathname it no longer controls.
		hooks.onUnlink = (target) => {
			if (target !== cachePath()) return;
			fs.writeFileSync(cachePath(), EVIDENCE);
			throw new Error('cache pathname must never be unlinked');
		};

		expect(() => writeCache('fresh', { A: '1' }, 300_000, ['A'])).not.toThrow();
		expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
		expect(readCache('fresh')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
	});

	it('an existing authenticated cache remains byte-for-byte unchanged', () => {
		writeCache('seed', { A: '0' }, 300_000, ['A']);
		resetCacheStateForTests();
		const before = fs.readFileSync(cachePath());

		writeCache('fresh', { A: '1' }, 300_000, ['A']);

		expect(fs.readFileSync(cachePath()).equals(before)).toBe(true);
		expect(readCache('fresh')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
	});

	it('a concurrent creator wins the first-write link without being clobbered', () => {
		hooks.onLink = (_from, to) => {
			if (to !== cachePath()) return;
			hooks.onLink = null;
			fs.mkdirSync(cacheDir(), { recursive: true });
			fs.writeFileSync(cachePath(), EVIDENCE);
		};

		writeCache('fresh', { A: '1' }, 300_000, ['A']);

		expect(fs.readFileSync(cachePath()).equals(EVIDENCE)).toBe(true);
		expect(readCache('fresh')).toEqual({ env: { A: '1' }, keyNames: ['A'] });
	});
});
