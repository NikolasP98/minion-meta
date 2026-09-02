import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnTsx } from './helpers/spawn-tsx.js';
import {
	seal,
	open,
	isEnvelopeShape,
	getOrCreateMachineKeyFile,
	resolveKeyMaterial,
	bindingFingerprint,
	InvalidCacheKeyError,
	CorruptMachineKeyFileError,
	ENVELOPE_VERSION,
	type CacheEnvelope,
} from '../src/cache-crypto.js';

const hooks = vi.hoisted(() => ({
	onLinkSync: null as null | ((from: string, to: string) => void),
	onFsyncSync: null as null | ((fd: number) => void),
}));

vi.mock('node:fs', async (importOriginal) => {
	const real = await importOriginal<typeof import('node:fs')>();
	const patched = {
		...real,
		linkSync(...args: Parameters<typeof real.linkSync>): ReturnType<typeof real.linkSync> {
			hooks.onLinkSync?.(String(args[0]), String(args[1]));
			return real.linkSync(...args);
		},
		fsyncSync(...args: Parameters<typeof real.fsyncSync>): ReturnType<typeof real.fsyncSync> {
			hooks.onFsyncSync?.(args[0]);
			return real.fsyncSync(...args);
		},
	};
	return { ...patched, default: patched };
});

describe('cache-crypto.ts', () => {
	let dir: string;
	const prevKey = process.env.MINION_ENV_CACHE_KEY;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cache-crypto-'));
		delete process.env.MINION_ENV_CACHE_KEY;
		hooks.onLinkSync = null;
		hooks.onFsyncSync = null;
	});
	afterEach(() => {
		hooks.onLinkSync = null;
		hooks.onFsyncSync = null;
		fs.rmSync(dir, { recursive: true, force: true });
		if (prevKey === undefined) delete process.env.MINION_ENV_CACHE_KEY;
		else process.env.MINION_ENV_CACHE_KEY = prevKey;
	});

	describe('seal / open roundtrip', () => {
		it('returns the identical plaintext bytes', () => {
			const plaintext = Buffer.from(JSON.stringify({ hello: 'world', n: 1 }), 'utf8');
			const envelope = seal(dir, plaintext);
			const result = open(dir, envelope);
			expect(result.ok).toBe(true);
			if (result.ok) expect(result.plaintext.equals(plaintext)).toBe(true);
		});

		it('the envelope never contains the plaintext as a substring', () => {
			const secret = 'SENTINEL-DO-NOT-PERSIST';
			const envelope = seal(dir, Buffer.from(secret, 'utf8'));
			const raw = JSON.stringify(envelope);
			expect(raw).not.toContain(secret);
		});

		it('the envelope has the documented shape', () => {
			const envelope = seal(dir, Buffer.from('x'));
			expect(envelope.v).toBe(ENVELOPE_VERSION);
			expect(envelope.alg).toBe('aes-256-gcm');
			expect(envelope.kdf).toBe('hkdf-sha256');
			expect(envelope.boundTo).toBe(bindingFingerprint());
			expect(isEnvelopeShape(envelope)).toBe(true);
		});

		it('two seals of the same plaintext use different IVs and produce different ciphertext', () => {
			const plaintext = Buffer.from('same input');
			const a = seal(dir, plaintext);
			const b = seal(dir, plaintext);
			expect(a.iv).not.toBe(b.iv);
			expect(a.ct).not.toBe(b.ct);
		});
	});

	describe('open — tamper and identity failures never throw', () => {
		function baseline(): CacheEnvelope {
			return seal(dir, Buffer.from(JSON.stringify({ ok: true })));
		}

		it('flipping one byte of ct is a miss (tamper), not a throw', () => {
			const envelope = baseline();
			const ct = Buffer.from(envelope.ct, 'base64');
			ct[0] = ct[0]! ^ 0xff;
			const tampered = { ...envelope, ct: ct.toString('base64') };
			const result = open(dir, tampered);
			expect(result).toEqual({ ok: false, reason: 'tamper' });
		});

		it('flipping one byte of tag is a miss (tamper), not a throw', () => {
			const envelope = baseline();
			const tag = Buffer.from(envelope.tag, 'base64');
			tag[0] = tag[0]! ^ 0xff;
			const tampered = { ...envelope, tag: tag.toString('base64') };
			const result = open(dir, tampered);
			expect(result).toEqual({ ok: false, reason: 'tamper' });
		});

		it('a foreign boundTo is a miss with reason foreign-machine', () => {
			const envelope = { ...baseline(), boundTo: 'deadbeefdeadbeef' };
			const result = open(dir, envelope);
			expect(result).toEqual({ ok: false, reason: 'foreign-machine' });
		});

		it('an unsupported version is a miss with reason unsupported-version', () => {
			const envelope = { ...baseline(), v: 2 };
			const result = open(dir, envelope);
			expect(result).toEqual({ ok: false, reason: 'unsupported-version' });
		});

		it('an unrecognized alg is rejected as tamper, not trusted as readable metadata', () => {
			const envelope = { ...baseline(), alg: 'not-a-real-alg' };
			const result = open(dir, envelope);
			expect(result).toEqual({ ok: false, reason: 'tamper' });
		});

		it('an unrecognized kdf is rejected as tamper, not trusted as readable metadata', () => {
			const envelope = { ...baseline(), kdf: 'not-a-real-kdf' };
			const result = open(dir, envelope);
			expect(result).toEqual({ ok: false, reason: 'tamper' });
		});
	});

	describe('isEnvelopeShape', () => {
		it('accepts a well-formed envelope', () => {
			expect(isEnvelopeShape(seal(dir, Buffer.from('x')))).toBe(true);
		});

		it.each([
			null,
			undefined,
			42,
			'a string',
			[],
			{},
			{ v: 1, alg: 'aes-256-gcm', kdf: 'hkdf-sha256', boundTo: 'x', iv: 'x', tag: 'x' }, // missing ct
			{ v: '1', alg: 'aes-256-gcm', kdf: 'hkdf-sha256', boundTo: 'x', iv: 'x', tag: 'x', ct: 'x' }, // v not a number
		])('rejects %p', (value) => {
			expect(isEnvelopeShape(value)).toBe(false);
		});
	});

	describe('machine key file', () => {
		it('is created 0600 on first use', () => {
			getOrCreateMachineKeyFile(dir);
			const p = path.join(dir, 'cache.key');
			expect(fs.existsSync(p)).toBe(true);
			expect(fs.statSync(p).mode & 0o777).toBe(0o600);
		});

		it('returns the same 32-byte key on repeated calls', () => {
			const a = getOrCreateMachineKeyFile(dir);
			const b = getOrCreateMachineKeyFile(dir);
			expect(a.length).toBe(32);
			expect(a.equals(b)).toBe(true);
		});

		it('publishes a fully written 0600 inode and leaves no staging file', () => {
			let stagedAtPublication: Buffer | undefined;
			let stagedModeAtPublication: number | undefined;
			hooks.onLinkSync = (from, to) => {
				if (to !== path.join(dir, 'cache.key')) return;
				stagedAtPublication = fs.readFileSync(from);
				stagedModeAtPublication = fs.statSync(from).mode & 0o777;
			};
			const material = getOrCreateMachineKeyFile(dir);
			const names = fs.readdirSync(dir);
			expect(names).toEqual(['cache.key']);
			expect(stagedAtPublication?.equals(material)).toBe(true);
			expect(stagedModeAtPublication).toBe(0o600);
			expect(material.length).toBe(32);
			expect(fs.readFileSync(path.join(dir, 'cache.key')).equals(material)).toBe(true);
		});

		it('syncs the cache directory after publishing the final key name', () => {
			let published = false;
			let directorySyncedAfterPublication = false;
			hooks.onLinkSync = (_from, to) => {
				if (to === path.join(dir, 'cache.key')) published = true;
			};
			hooks.onFsyncSync = (fd) => {
				if (fs.fstatSync(fd).isDirectory() && published) directorySyncedAfterPublication = true;
			};

			getOrCreateMachineKeyFile(dir);

			expect(directorySyncedAfterPublication).toBe(true);
		});

		it('syncs the cache directory before accepting another creator\'s winning key', () => {
			const winner = Buffer.alloc(32, 6);
			fs.writeFileSync(path.join(dir, 'cache.key'), winner, { mode: 0o600, flag: 'wx' });
			let directorySynced = false;
			hooks.onFsyncSync = (fd) => {
				if (fs.fstatSync(fd).isDirectory()) directorySynced = true;
			};

			const material = getOrCreateMachineKeyFile(dir);

			expect(directorySynced).toBe(true);
			expect(material.equals(winner)).toBe(true);
		});

		it('two racing creators converge on one winning key — the loser reads it back, not its own candidate', () => {
			// Simulate the race deterministically: seed the file as another "process" would (flag 'wx'),
			// then call getOrCreateMachineKeyFile and assert it reads the winner back instead of
			// overwriting it with a fresh candidate.
			const winner = Buffer.alloc(32, 9);
			fs.writeFileSync(path.join(dir, 'cache.key'), winner, { mode: 0o600, flag: 'wx' });
			const loserResult = getOrCreateMachineKeyFile(dir);
			expect(loserResult.equals(winner)).toBe(true);
		});

		it('enforces 0600 on a pre-existing valid key file that was created looser', () => {
			const p = path.join(dir, 'cache.key');
			fs.writeFileSync(p, Buffer.alloc(32, 1), { mode: 0o644 });
			getOrCreateMachineKeyFile(dir);
			expect(fs.statSync(p).mode & 0o777).toBe(0o600);
		});

		it('rejects a zero-byte existing key file rather than deriving from empty material', () => {
			const p = path.join(dir, 'cache.key');
			fs.writeFileSync(p, Buffer.alloc(0), { mode: 0o600 });
			expect(() => getOrCreateMachineKeyFile(dir)).toThrow(CorruptMachineKeyFileError);
		});

		it('rejects a too-short existing key file (e.g. a crash-partial write)', () => {
			const p = path.join(dir, 'cache.key');
			fs.writeFileSync(p, Buffer.alloc(16, 2), { mode: 0o600 });
			expect(() => getOrCreateMachineKeyFile(dir)).toThrow(CorruptMachineKeyFileError);
		});

		it('rejects a too-long existing key file', () => {
			const p = path.join(dir, 'cache.key');
			fs.writeFileSync(p, Buffer.alloc(64, 2), { mode: 0o600 });
			expect(() => getOrCreateMachineKeyFile(dir)).toThrow(CorruptMachineKeyFileError);
		});

		it('rejects a directory at the key file path instead of reading through it', () => {
			const p = path.join(dir, 'cache.key');
			fs.mkdirSync(p);
			expect(() => getOrCreateMachineKeyFile(dir)).toThrow(CorruptMachineKeyFileError);
		});

		it('rejects a symlink at the key file path rather than following it', () => {
			const target = path.join(dir, 'elsewhere.key');
			fs.writeFileSync(target, Buffer.alloc(32, 3), { mode: 0o600 });
			const p = path.join(dir, 'cache.key');
			fs.symlinkSync(target, p);
			expect(() => getOrCreateMachineKeyFile(dir)).toThrow(CorruptMachineKeyFileError);
		});

		it('never falls back to weak material: seal() rejects too rather than sealing with a bad key', () => {
			const p = path.join(dir, 'cache.key');
			fs.writeFileSync(p, Buffer.alloc(0), { mode: 0o600 });
			expect(() => seal(dir, Buffer.from('x'))).toThrow(CorruptMachineKeyFileError);
		});
	});

	describe('resolveKeyMaterial / MINION_ENV_CACHE_KEY', () => {
		it('prefers a valid operator key over the machine key file, and creates no key file', () => {
			process.env.MINION_ENV_CACHE_KEY = Buffer.alloc(32, 3).toString('base64');
			const material = resolveKeyMaterial(dir);
			expect(material.equals(Buffer.alloc(32, 3))).toBe(true);
			expect(fs.existsSync(path.join(dir, 'cache.key'))).toBe(false);
		});

		it('rejects a wrong-length key with a named error, no silent fallback', () => {
			process.env.MINION_ENV_CACHE_KEY = Buffer.alloc(16, 3).toString('base64');
			expect(() => resolveKeyMaterial(dir)).toThrow(InvalidCacheKeyError);
			expect(fs.existsSync(path.join(dir, 'cache.key'))).toBe(false);
		});

		it('rejects a non-base64 value with a named error', () => {
			process.env.MINION_ENV_CACHE_KEY = 'not valid base64 !!! ###';
			expect(() => resolveKeyMaterial(dir)).toThrow(InvalidCacheKeyError);
		});

		it('rejects a non-canonical base64 value (accepted by a bare Buffer.from, rejected here)', () => {
			// A stray space inside the payload: Buffer.from(..., 'base64') tolerates and silently drops
			// it, so the strict check must compare a re-encode, not just attempt a decode.
			const valid = Buffer.alloc(32, 5).toString('base64');
			process.env.MINION_ENV_CACHE_KEY = `${valid.slice(0, 4)} ${valid.slice(4)}`;
			expect(() => resolveKeyMaterial(dir)).toThrow(InvalidCacheKeyError);
		});

		it.each([
			['empty', ''],
			['whitespace-only', '   \t'],
			['leading whitespace', ` ${Buffer.alloc(32, 5).toString('base64')}`],
			['trailing whitespace', `${Buffer.alloc(32, 5).toString('base64')} `],
		])('rejects a defined %s operator key without creating a machine key', (_label, value) => {
			process.env.MINION_ENV_CACHE_KEY = value;
			expect(() => resolveKeyMaterial(dir)).toThrow(InvalidCacheKeyError);
			expect(fs.existsSync(path.join(dir, 'cache.key'))).toBe(false);
		});

		it('falls back to the machine key file when unset', () => {
			delete process.env.MINION_ENV_CACHE_KEY;
			const material = resolveKeyMaterial(dir);
			expect(material.equals(fs.readFileSync(path.join(dir, 'cache.key')))).toBe(true);
		});
	});

	describe('cross-process key-file race (real OS processes, not a same-process simulation)', () => {
		const helperScript = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			'helpers',
			'race-key-file.mjs',
		);

		it(
			'two processes racing to create cache.key converge on the same key, and both can seal+open with it',
			async () => {
				const barrier = path.join(dir, 'go');
				const outA = path.join(dir, 'a.json');
				const outB = path.join(dir, 'b.json');

				const racers = Promise.all([
					spawnTsx(helperScript, [dir, barrier, outA]),
					spawnTsx(helperScript, [dir, barrier, outB]),
				]);
				// Give both processes time to reach the spin-wait before releasing them together —
				// this is what makes `getOrCreateMachineKeyFile`'s `flag: 'wx'` race arbitration actually
				// contend, rather than the two runs happening safely one after another.
				await new Promise((resolve) => setTimeout(resolve, 300));
				fs.writeFileSync(barrier, '');
				await racers;

				const resultA = JSON.parse(fs.readFileSync(outA, 'utf8'));
				const resultB = JSON.parse(fs.readFileSync(outB, 'utf8'));
				expect(resultA.roundtripOk).toBe(true);
				expect(resultB.roundtripOk).toBe(true);
				expect(resultA.keyB64).toBe(resultB.keyB64);
				expect(Buffer.from(resultA.keyB64, 'base64').length).toBe(32);
			},
			15_000,
		);
	});

});
