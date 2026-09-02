import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Machine-sealed envelope for the on-disk cache file (S2 of
 * 2026-08-17-pkg-infisical-cache-plaintext-spec.md). One JSON blob per cache file: AES-256-GCM
 * ciphertext, key derived (HKDF-SHA256) from either an operator-supplied key or a machine-local key
 * file, bound to this machine+user via a non-reversible fingerprint in the (readable) header.
 *
 * Threat model this buys, and does not: see the spec §S2/§A3 and the S3 README rewrite. In short —
 * defends against the file leaving the machine (backup/sync/tarball) or a different local user;
 * does nothing against an attacker already running as this user on this machine (they can read the
 * key file next to it).
 */

export const ENVELOPE_VERSION = 1;
export const ALGORITHM = 'aes-256-gcm';
export const KDF = 'hkdf-sha256';

const KEY_LEN = 32;
const IV_LEN = 12;
const HKDF_INFO = Buffer.from('minion-env-cache-v1', 'utf8');
const KEY_FILE_NAME = 'cache.key';

/** Thrown when `MINION_ENV_CACHE_KEY` is set but malformed. Never caught as a tamper/miss signal —
 *  an operator who supplied their own key gets a loud, named failure, not a silent fallback to the
 *  machine key file (a different security posture than the one they asked for). */
export class InvalidCacheKeyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidCacheKeyError';
	}
}

/** Thrown when the machine-local `cache.key` file exists but is not usable as 256 bits of key
 *  material — wrong length (including a crash-partial write), a directory, or a symlink. Unlike
 *  `InvalidCacheKeyError` this is never an operator misconfiguration; callers (`seal`/`open`) treat
 *  it like any other decrypt/derive failure — a categorical cache miss, never a silent fallback to
 *  weak or predictable key material. */
export class CorruptMachineKeyFileError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CorruptMachineKeyFileError';
	}
}

export interface CacheEnvelope {
	v: number;
	alg: string;
	kdf: string;
	/** 8-byte hex fingerprint of this machine+user — never key material, never a path. */
	boundTo: string;
	iv: string;
	tag: string;
	ct: string;
}

export type OpenFailureReason = 'unsupported-version' | 'foreign-machine' | 'tamper';

export type OpenResult =
	| { ok: true; plaintext: Buffer }
	| { ok: false; reason: OpenFailureReason };

function keyFilePath(dir: string): string {
	return path.join(dir, KEY_FILE_NAME);
}

/** Strict base64 validation: alphabet, padding, and a canonical round-trip — `Buffer.from(v,
 *  'base64')` alone silently accepts non-canonical input (stray whitespace, wrong padding). */
function decodeOperatorKey(raw: string): Buffer {
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) {
		throw new InvalidCacheKeyError(
			'MINION_ENV_CACHE_KEY is not valid base64 (expected the standard alphabet, optionally ' +
				'padded with =).',
		);
	}
	const decoded = Buffer.from(raw, 'base64');
	if (decoded.toString('base64') !== raw) {
		throw new InvalidCacheKeyError(
			'MINION_ENV_CACHE_KEY is not canonical base64 — re-encoding the decoded bytes produced a ' +
				'different string.',
		);
	}
	if (decoded.length !== KEY_LEN) {
		throw new InvalidCacheKeyError(
			`MINION_ENV_CACHE_KEY must decode to exactly ${KEY_LEN} bytes; got ${decoded.length}.`,
		);
	}
	return decoded;
}

/** Validate and return the bytes of a pre-existing `cache.key`. `lstat` (not `stat`) rejects a
 * symlink rather than following it. A short file is always corrupt: creators publish only a fully
 * written temporary inode, so the final pathname never has an in-progress state. */
function readExistingMachineKey(p: string): Buffer {
	const st = fs.lstatSync(p);
	if (!st.isFile()) {
		throw new CorruptMachineKeyFileError(`${p} is not a regular file.`);
	}
	if ((st.mode & 0o777) !== 0o600) fs.chmodSync(p, 0o600);
	const data = fs.readFileSync(p);
	if (data.length !== KEY_LEN) {
		throw new CorruptMachineKeyFileError(
			`${p} does not contain a ${KEY_LEN}-byte key (found ${data.length} byte(s)).`,
		);
	}
	return data;
}

function fsyncDirectory(dir: string): void {
	const fd = fs.openSync(dir, 'r');
	try {
		fs.fsyncSync(fd);
	} finally {
		fs.closeSync(fd);
	}
}

/**
 * Machine-local key file, created on demand. Concurrency- and crash-safe: each creator writes and
 * fsyncs a private 0600 inode before publishing it with a no-clobber hard link. Racing creators
 * converge on the linked winner, and a crash before publication leaves only an ignorable temporary
 * file—never a partial final `cache.key`. An existing valid key file has its mode enforced to 0600
 * before use; an existing invalid one (wrong length, directory, symlink) throws
 * `CorruptMachineKeyFileError` rather than being read and used as-is.
 */
export function getOrCreateMachineKeyFile(dir: string): Buffer {
	const p = keyFilePath(dir);
	const candidate = crypto.randomBytes(KEY_LEN);
	const tmp = `${p}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
	let fd: number | undefined;
	try {
		fd = fs.openSync(tmp, 'wx', 0o600);
		fs.writeFileSync(fd, candidate);
		fs.fsyncSync(fd);
		fs.closeSync(fd);
		fd = undefined;
		try {
			fs.linkSync(tmp, p);
			fsyncDirectory(dir);
			return candidate;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
			return readExistingMachineKey(p);
		}
	} finally {
		if (fd !== undefined) fs.closeSync(fd);
		try {
			fs.rmSync(tmp, { force: true });
		} catch {
			/* a private leftover staging inode is harmless and never used as key material */
		}
	}
}

/**
 * Key ladder, first hit wins: `MINION_ENV_CACHE_KEY` (operator-supplied, e.g. exported from an OS
 * keyring at shell init) beats the machine-local key file. Throws `InvalidCacheKeyError` rather than
 * falling back when the env var is set but malformed.
 */
export function resolveKeyMaterial(dir: string): Buffer {
	const operatorKey = process.env.MINION_ENV_CACHE_KEY;
	if (operatorKey !== undefined) return decodeOperatorKey(operatorKey);
	return getOrCreateMachineKeyFile(dir);
}

export function validateOperatorCacheKey(): void {
	const operatorKey = process.env.MINION_ENV_CACHE_KEY;
	if (operatorKey !== undefined) decodeOperatorKey(operatorKey);
}

/** Stable per-machine+user binding material: `/etc/machine-id` if readable, else hostname, mixed
 *  with the running user's uid. Never written to disk directly — only its fingerprint is. */
function bindingMaterial(): Buffer {
	let machinePart: string;
	try {
		machinePart = fs.readFileSync('/etc/machine-id', 'utf8').trim();
	} catch {
		machinePart = os.hostname();
	}
	return Buffer.from(`${machinePart}:${os.userInfo().uid}`, 'utf8');
}

/** Non-reversible fingerprint stored in the envelope header so a file copied to another machine is
 *  *detected* as foreign rather than failing with a confusing GCM error. */
export function bindingFingerprint(): string {
	return crypto.createHash('sha256').update(bindingMaterial()).digest('hex').slice(0, 16);
}

function deriveKey(keyMaterial: Buffer): Buffer {
	return Buffer.from(crypto.hkdfSync('sha256', keyMaterial, bindingMaterial(), HKDF_INFO, KEY_LEN));
}

/** The canonical header, bound into the ciphertext as GCM AAD so `alg`/`kdf`/`v`/`boundTo` are
 *  authenticated too — not just readable, unauthenticated metadata a tampered file could lie about.
 *  Redundant with the explicit `(v, alg, kdf)` check in `open()` today (both must agree, since that
 *  check runs first), but it's the check that keeps holding if that gate is ever refactored away. */
function headerAAD(header: Pick<CacheEnvelope, 'v' | 'alg' | 'kdf' | 'boundTo'>): Buffer {
	return Buffer.from(`${header.v}:${header.alg}:${header.kdf}:${header.boundTo}`, 'utf8');
}

/** Seal `plaintext` into a machine-bound envelope. `dir` is the cache directory the key ladder
 *  resolves against (the machine-local key file, if any, lives there). */
export function seal(dir: string, plaintext: Buffer): CacheEnvelope {
	const key = deriveKey(resolveKeyMaterial(dir));
	const boundTo = bindingFingerprint();
	const iv = crypto.randomBytes(IV_LEN);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	cipher.setAAD(headerAAD({ v: ENVELOPE_VERSION, alg: ALGORITHM, kdf: KDF, boundTo }));
	const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		v: ENVELOPE_VERSION,
		alg: ALGORITHM,
		kdf: KDF,
		boundTo,
		iv: iv.toString('base64'),
		tag: tag.toString('base64'),
		ct: ct.toString('base64'),
	};
}

/**
 * Open an envelope. Every failure short of an `InvalidCacheKeyError` (operator misconfiguration,
 * which propagates — see the class doc) returns `{ ok: false }` instead of throwing: a wrong
 * version, an unrecognized algorithm/KDF, a foreign machine, or a GCM auth failure are all
 * "cache miss, refetch", never a crash.
 */
export function open(dir: string, envelope: CacheEnvelope): OpenResult {
	if (envelope.v !== ENVELOPE_VERSION) return { ok: false, reason: 'unsupported-version' };
	try {
		// `bindingFingerprint()` reads OS identity and sits inside the boundary too: this function is
		// total by contract (only `InvalidCacheKeyError` escapes), and callers on the cache read path
		// rely on that to classify results without a catch-all of their own.
		if (envelope.boundTo !== bindingFingerprint()) return { ok: false, reason: 'foreign-machine' };
		// `alg`/`kdf` are otherwise-unauthenticated metadata read straight off disk — reject anything
		// that isn't the one supported tuple before it can influence key resolution, rather than trusting
		// it and hard-coding the primitives anyway (which is what the code below did until this check).
		if (envelope.alg !== ALGORITHM || envelope.kdf !== KDF) return { ok: false, reason: 'tamper' };
		const key = deriveKey(resolveKeyMaterial(dir));
		const iv = Buffer.from(envelope.iv, 'base64');
		const tag = Buffer.from(envelope.tag, 'base64');
		const ct = Buffer.from(envelope.ct, 'base64');
		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
		decipher.setAAD(headerAAD(envelope));
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
		return { ok: true, plaintext };
	} catch (err) {
		if (err instanceof InvalidCacheKeyError) throw err;
		return { ok: false, reason: 'tamper' };
	}
}

/** Structural guard for JSON parsed off disk — never trust its shape before touching crypto fields. */
export function isEnvelopeShape(value: unknown): value is CacheEnvelope {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.v === 'number' &&
		typeof v.alg === 'string' &&
		typeof v.kdf === 'string' &&
		typeof v.boundTo === 'string' &&
		typeof v.iv === 'string' &&
		typeof v.tag === 'string' &&
		typeof v.ct === 'string'
	);
}
