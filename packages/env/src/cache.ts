import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	seal,
	open,
	isEnvelopeShape,
	InvalidCacheKeyError,
	type CacheEnvelope,
} from './cache-crypto.js';

// TODO(handoff): S1+S2 of 2026-08-17-pkg-infisical-cache-plaintext-spec.md are implemented (nothing
// lands on disk unsealed; the sealed disk cache below is machine-bound AES-256-GCM). S3 — README
// `## Cache`/`## Security` rewrite (still describes the old plaintext file), the release changeset,
// the `minion doctor` cache-mode probe, root `.env.example` entries for MINION_ENV_CACHE(_KEY), and
// the behavioral anti-recurrence guard test — has not shipped yet. See the handoff note appended to
// proposals/2026-08-17-pkg-infisical-cache-plaintext.md (2026-08-28).

export interface CacheEntry {
	env: Record<string, string>;
	/** Names of every key the underlying fetch returned, even if `env` was narrowed by an allowlist. */
	keyNames: string[];
	fetchedAt: number;
	ttlMs: number;
}

export type CacheMode = 'off' | 'memory' | 'disk';

/** Process-lifetime memo. Sits in front of the sealed disk cache — a memo hit never touches disk. */
const memo = new Map<string, CacheEntry>();
let legacyPurged = false;
let diskReadWarned = false;
let dirModeWarned = false;
let diskWriteWarned = false;

export function cacheDir(): string {
	const xdg = process.env.XDG_CONFIG_HOME;
	return xdg ? path.join(xdg, 'minion') : path.join(os.homedir(), '.config', 'minion');
}

export function cachePath(): string {
	return path.join(cacheDir(), 'infisical-cache.json');
}

/**
 * Parse `MINION_ENV_CACHE` into a cache mode. Values are trimmed and case-normalized. Unrecognized
 * values fall back to 'memory' and warn — never silently fall through to 'disk'.
 * Unset/blank defaults to 'disk' (S2): cross-process caching is sealed to this machine, so there is
 * no plaintext-on-disk cost to paying for it by default.
 */
export function resolveCacheMode(): CacheMode {
	const raw = process.env.MINION_ENV_CACHE;
	if (raw === undefined || raw.trim() === '') return 'disk';
	const normalized = raw.trim().toLowerCase();
	if (normalized === 'off' || normalized === 'memory' || normalized === 'disk') return normalized;
	console.warn(
		`[@minion-stack/env] Unrecognized MINION_ENV_CACHE value '${raw}' (expected 'off', 'memory', or ` +
			"'disk'); using 'memory'.",
	);
	return 'memory';
}

/**
 * Canonicalize a `domain` option to the exact value that reaches the Infisical CLI. Trims
 * surrounding whitespace only — case and internal structure (scheme/host/path/query) are preserved,
 * because the CLI's `--domain` value can be a full URL whose path is case-sensitive. A value that is
 * `undefined` or blank after trimming canonicalizes to `undefined` ("no domain supplied"). Callers
 * that both build a cache key and invoke the CLI must derive the CLI argument from this same
 * canonical value — never from the raw `opts.domain` — so the two can never disagree.
 */
export function canonicalizeDomain(domain: string | undefined): string | undefined {
	if (domain === undefined) return undefined;
	const trimmed = domain.trim();
	return trimmed === '' ? undefined : trimmed;
}

/**
 * Canonical cache identity — every input that can change the fetch result must be part of the key.
 * Encodes a structured tuple (never delimiter-joined strings) so no combination of inputs — including
 * values that contain the delimiter, or that look like a sentinel — can collide. `null` marks "absent"
 * for domain and cacheKeys; it is never a legal value for either after normalization, so it can't be
 * spoofed by a real input (e.g. domain `__default__`, or an allowlist that happens to be empty).
 * `domain` is run through `canonicalizeDomain` — the identical canonicalization the CLI-invoking
 * caller must apply before using it as the `--domain` argument, so cache identity and the actual
 * request can never diverge (no case-folding, since domain paths are case-sensitive).
 */
export function buildCacheKey(
	projectSlug: string,
	envTier: string,
	domain: string | undefined,
	cacheKeys: string[] | undefined,
): string {
	const domainPart = canonicalizeDomain(domain) ?? null;
	const keysPart = cacheKeys === undefined ? null : [...new Set(cacheKeys)].sort();
	return JSON.stringify([projectSlug, envTier, domainPart, keysPart]);
}

/** True for the legacy on-disk shape: top-level keys mapping to `{ env, fetchedAt, ttlMs }`. */
function isLegacyCacheShape(value: unknown): boolean {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.values(value as Record<string, unknown>).every(
		(entry) =>
			typeof entry === 'object' &&
			entry !== null &&
			'env' in entry &&
			'fetchedAt' in entry &&
			'ttlMs' in entry,
	);
}

/**
 * Remove a pre-existing plaintext `infisical-cache.json`, once per process. This is a security
 * cleanup, not a cache read — callers run it unconditionally, even with caching disabled
 * (`MINION_ENV_CACHE=off` or `noCache: true`). Never migrates the contents; a missing, unreadable,
 * unparseable, or undeletable file is treated as "nothing to purge" and never throws.
 */
export function purgeLegacyCacheOnce(): void {
	if (legacyPurged) return;
	legacyPurged = true;

	const p = cachePath();
	let raw: string;
	try {
		raw = fs.readFileSync(p, 'utf8');
	} catch {
		return;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return;
	}
	if (!isLegacyCacheShape(parsed)) return;

	try {
		fs.rmSync(p);
	} catch {
		return;
	}

	console.warn(
		`[@minion-stack/env] Removed legacy plaintext secret cache at ${p} — it stored decrypted secret ` +
			'values, including the gateway vault master key, in cleartext on disk. If this path was ever ' +
			'backed up or synced elsewhere, rotate MINION_SECRETS_KEY.',
	);
}

function warnDiskDiscarded(reason: string): void {
	if (diskReadWarned) return;
	diskReadWarned = true;
	console.warn(
		`[@minion-stack/env] Discarding the on-disk secret cache (${reason}) — refetching from Infisical.`,
	);
}

function warnDiskWriteRetained(): void {
	if (diskWriteWarned) return;
	diskWriteWarned = true;
	console.warn(
		'[@minion-stack/env] Retained the existing sealed disk cache; the fresh value is memory-only ' +
			'because this runtime has no safe atomic primitive for replacing an occupied cache path.',
	);
}

/** `mkdirSync`'s `mode` only applies at creation, so a pre-existing looser directory is checked and
 *  tightened explicitly — the same "mode isn't retroactive" bug §0 documents for the cache file
 *  itself. Warns once per process; never touches any other file already in the directory (it also
 *  holds `infisical-auth.json`). */
function ensureCacheDirSealed(): string {
	const dir = cacheDir();
	fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
	const st = fs.statSync(dir);
	if ((st.mode & 0o077) !== 0) {
		fs.chmodSync(dir, 0o700);
		if (!dirModeWarned) {
			dirModeWarned = true;
			console.warn(`[@minion-stack/env] ${dir} had group/other permissions; reset to 0700.`);
		}
	}
	return dir;
}

/** Create a new hard link at `to` for the inode behind `from`, or report that the path is taken.
 *  `link(2)` fails with `EEXIST` instead of replacing — unlike `rename(2)`, which destroys whatever
 *  occupies the destination — so it is the one commit primitive Node exposes that cannot clobber an
 *  object that appeared since the caller last looked. The link shares the source inode, so the tmp
 *  file's `0600` is the destination's mode too, even where a `0644` file used to be (`writeFileSync`'s
 *  `mode` option, by contrast, only applies on creation — §0 fact 3).
 *
 *  Any error other than `EEXIST` propagates to `writeCache`'s fail-soft handler: on a filesystem
 *  without hard-link support the disk cache is skipped and warned about, never forced through with a
 *  destructive `rename` fallback. */
function linkNoClobber(from: string, to: string): boolean {
	try {
		fs.linkSync(from, to);
		return true;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
		throw err;
	}
}

/** Drop a link this process is provably done with. Never allowed to fail the commit around it: the
 *  sealed envelope may already be live at the cache path by this point, and a cleanup that could not
 *  run is clutter, not a failed write. */
function bestEffortUnlink(p: string): void {
	try {
		fs.rmSync(p, { force: true });
	} catch {
		/* a leftover staging file is harmless */
	}
}

/**
 * Publish `data` at `filePath` without ever destroying bytes this process did not authenticate.
 *
 * Node exposes no atomic exchange/no-replace primitive for replacing an existing pathname. A
 * hard-link followed by a pathname unlink is not a move: an uncooperative writer can replace the
 * pathname between those calls and make the unlink delete bytes this process never authenticated.
 * Consequently an existing cache is never replaced. The fresh value remains available in the
 * process memo; only a provably absent path is populated with `link(2)`, whose `EEXIST` result closes
 * the last race without clobbering its winner.
 *
 * Returns `true` only when the sealed envelope is live at `filePath`.
 */
function commitSealedFile(filePath: string, data: string, identity: FileIdentity): boolean {
	// TODO(handoff): Node cannot safely replace an occupied pathname without renameat2 exchange/no-replace.
	// Until a supported binding exists, an expired existing disk envelope remains in place and the
	// refetched value is memo-only. Track operator-visible cleanup in the S3 handoff at
	// proposals/2026-08-17-pkg-infisical-cache-plaintext.md.
	const tmp = `${filePath}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
	try {
		// `wx` so two processes never share a tmp path even if one ignores the lock.
		fs.writeFileSync(tmp, data, { mode: 0o600, flag: 'wx' });
		return identity.existed ? false : linkNoClobber(tmp, filePath);
	} finally {
		bestEffortUnlink(tmp);
	}
}

type DiskEntries = Record<string, CacheEntry>;

/** Runtime validation for a single decrypted cache entry (M1 fix). Authentication proves the sealed
 *  envelope's origin and integrity, not schema compatibility with this exact package version — a
 *  stale v1 payload written by a different build, or a hand-edited plaintext, can authenticate
 *  cleanly and still have the wrong shape. `readCache` trusts `env`, `keyNames`, `fetchedAt`, and
 *  `ttlMs` without further checks, so anything not conforming here must degrade to a miss before it
 *  reaches that trust boundary — never a `TypeError` that blocks the authoritative fetch behind it. */
function isValidCacheEntry(value: unknown): value is CacheEntry {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const v = value as Record<string, unknown>;
	if (typeof v.fetchedAt !== 'number' || !Number.isFinite(v.fetchedAt)) return false;
	if (typeof v.ttlMs !== 'number' || !Number.isFinite(v.ttlMs)) return false;
	if (typeof v.env !== 'object' || v.env === null || Array.isArray(v.env)) return false;
	if (!Object.values(v.env as Record<string, unknown>).every((x) => typeof x === 'string')) return false;
	if (!Array.isArray(v.keyNames) || !v.keyNames.every((x) => typeof x === 'string')) return false;
	return true;
}

/** A malformed entry anywhere in the file rejects the whole payload (never a partial trust) — the
 *  same "preserve, don't touch, refetch" treatment as corrupt JSON or a failed GCM auth. */
function isValidDiskEntries(value: unknown): value is DiskEntries {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.values(value as Record<string, unknown>).every(isValidCacheEntry);
}

/** Whether the cache pathname was provably absent when classified. `existed: false` is only ever
 * produced by `ENOENT`; every occupied path is immutable to the conservative commit protocol. */
type FileIdentity = { existed: boolean };

const LOCK_FILE_NAME = 'infisical-cache.lock';
const LOCK_STALE_MS = 30_000;
const LOCK_ACQUIRE_TIMEOUT_MS = 10_000;
const LOCK_POLL_MS = 10;

function lockFilePath(dir: string): string {
	return path.join(dir, LOCK_FILE_NAME);
}

/** Blocks the synchronous caller for `ms` without a JS busy-spin. `Atomics.wait` on a private
 *  `SharedArrayBuffer` is a real (non-polling-CPU) sleep and — unlike browsers — is permitted on
 *  Node's main thread. */
function sleepSync(ms: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Cross-process mutex for the sealed disk cache's read-classify-commit transaction.
 * `writeDiskEntry` re-reads and re-classifies the cache file while holding this lock, so two
 * cooperating writers never interleave their transactions (and never race over each other's staging
 * files). It is a coordination convenience, NOT the safety property: a process that does
 * not take this lock — a backup restore, a file sync, an operator's editor — is unaffected by it, so
 * `commitSealedFile` is what actually guarantees such a writer's bytes are never destroyed.
 *
 * Acquired with `wx` (atomic create-exclusive — the same primitive `getOrCreateMachineKeyFile` uses),
 * so two processes racing to acquire converge on whichever `openSync` wins; the loser polls. A lock
 * file older than `LOCK_STALE_MS` is assumed abandoned by a holder that crashed mid-transaction and is
 * reaped rather than blocking forever. Every other operation in this module is synchronous, so this
 * blocks via `sleepSync` rather than pulling in an async lock dependency that would force `writeCache`
 * (and every caller up to `fetchInfisicalSecrets`) to become async.
 */
function withCacheLock<T>(dir: string, fn: () => T): T {
	const lp = lockFilePath(dir);
	const deadline = Date.now() + LOCK_ACQUIRE_TIMEOUT_MS;
	for (;;) {
		try {
			fs.closeSync(fs.openSync(lp, 'wx', 0o600));
			break;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
			try {
				if (Date.now() - fs.statSync(lp).mtimeMs > LOCK_STALE_MS) {
					fs.rmSync(lp, { force: true });
					continue;
				}
			} catch {
				continue; // the lock vanished between the EEXIST and this stat — retry the create
			}
			if (Date.now() > deadline) {
				throw new Error(`timed out waiting for the sealed disk cache lock at ${lp}`);
			}
			sleepSync(LOCK_POLL_MS);
		}
	}
	try {
		return fn();
	} finally {
		try {
			fs.rmSync(lp, { force: true });
		} catch {
			/* best-effort release */
		}
	}
}

/**
 * Discriminated result of reading the sealed disk cache file. Exactly one status — `'missing'`,
 * meaning `ENOENT`: the cache directory is usable and there is provably no file at the cache path —
 * lets a write fill the path in with a fresh entry and an empty map.
 *
 * `'rejected'` means a file exists but could not be authenticated: corrupt JSON, wrong envelope
 * shape, unsupported version, foreign-machine binding, an unrecognized alg/kdf, or a GCM auth
 * failure. `'unavailable'` means the cache could not be consulted at all for a filesystem reason —
 * the config root cannot host the cache directory, its mode could not be secured, or the file exists
 * but could not be read (`EACCES`, `EISDIR`, …).
 *
 * Both are read as "no cache entry" AND "do not persist here". Neither may be collapsed into
 * `'missing'`: a file that could not be authenticated *or* could not be read is evidence (possible
 * tamper, possible a copy from another machine, possible a permissions change someone made on
 * purpose) that the spec requires preserving, not replacing with whatever this process happens to
 * fetch next. Absence of proof that the path is empty is not proof that it is.
 */
type DiskReadResult =
	| { status: 'missing'; identity: FileIdentity }
	| { status: 'unavailable' }
	| { status: 'rejected'; identity: FileIdentity }
	| { status: 'authenticated'; entries: DiskEntries; identity: FileIdentity };

/**
 * Read and open the sealed disk cache file. Every failure short of `InvalidCacheKeyError` (an
 * operator-misconfigured `MINION_ENV_CACHE_KEY`, which propagates rather than being treated as a
 * cache problem) degrades to one of the three non-authenticated statuses — never a throw. That
 * matters because this runs on the default path *before* the authoritative `infisical` fetch: a
 * broken config root must cost a cache hit, not the secrets themselves.
 *
 * Every filesystem call is classified explicitly rather than swallowed by a catch-all, so the two
 * questions a write later asks — "is there anything here?" and "may I replace it?" — are answered
 * from what was actually observed. `open()` is total by contract (see its doc), so the only
 * exception that leaves this function is the operator-key one.
 *
 * At most one warning is printed per process, describing the failure categorically — never a value,
 * never a stack trace with key material in it.
 */
function readDiskEntries(): DiskReadResult {
	let dir: string;
	try {
		dir = ensureCacheDirSealed();
	} catch {
		// The config root cannot host a 0700 cache directory (it is a file, unwritable, on a
		// read-only mount, …). Nothing can be read and nothing may be written here.
		warnDiskDiscarded('the cache directory could not be created or secured');
		return { status: 'unavailable' };
	}

	let raw: Buffer;
	try {
		raw = fs.readFileSync(cachePath());
	} catch (err) {
		// ENOENT is the one error that proves the path is empty. Anything else (EACCES, EISDIR, EIO)
		// means a file we could not read is sitting there — a cache miss that must not be written over.
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			return { status: 'missing', identity: { existed: false } };
		}
		warnDiskDiscarded('unreadable');
		return { status: 'unavailable' };
	}
	const identity: FileIdentity = { existed: true };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw.toString('utf8'));
	} catch {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected', identity };
	}
	if (!isEnvelopeShape(parsed)) {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected', identity };
	}

	const result = open(dir, parsed as CacheEnvelope);
	if (!result.ok) {
		warnDiskDiscarded(
			result.reason === 'foreign-machine'
				? 'bound to a different machine'
				: result.reason === 'unsupported-version'
					? 'unsupported envelope version'
					: 'corrupt or tampered',
		);
		return { status: 'rejected', identity };
	}

	let entries: unknown;
	try {
		entries = JSON.parse(result.plaintext.toString('utf8'));
	} catch {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected', identity };
	}
	if (!isValidDiskEntries(entries)) {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected', identity };
	}
	try {
		if ((fs.statSync(cachePath()).mode & 0o077) !== 0) fs.chmodSync(cachePath(), 0o600);
	} catch {
		warnDiskDiscarded('permissions could not be secured');
		return { status: 'unavailable' };
	}
	return { status: 'authenticated', entries, identity };
}

/** Merge `entry` into the existing sealed disk cache (best-effort read of whatever is there) and
 *  publish the result sealed, via `commitSealedFile` — readers only ever observe a complete file,
 *  and a writer that never took `withCacheLock` never has its bytes overwritten.
 *
 *  Only a provably absent (`'missing'`) or successfully authenticated file is written to. A
 *  `'rejected'` or `'unavailable'` one is left exactly as it is and the fresh entry is skipped for
 *  disk persistence — it still stands in the in-process memo, which the caller already updated —
 *  rather than destroying evidence we could neither authenticate nor even read. The read runs first
 *  so a config root that cannot host the cache directory is answered by that same early return
 *  instead of throwing out of here. */
function writeDiskEntry(key: string, entry: CacheEntry): void {
	let dir: string;
	try {
		dir = ensureCacheDirSealed();
	} catch {
		// Same "nothing can be read and nothing may be written here" case `readDiskEntries` handles —
		// bail before even trying to take a lock in a directory that cannot be secured.
		return;
	}
	withCacheLock(dir, () => {
		// Re-read and re-classify while holding the lock (M2 fix) — a classification taken before the
		// lock was acquired could already be stale by the time this runs.
		const result = readDiskEntries();
		if (result.status === 'rejected' || result.status === 'unavailable') return;
		const entries: DiskEntries = result.status === 'authenticated' ? { ...result.entries } : {};
		entries[key] = entry;
		const plaintext = Buffer.from(JSON.stringify(entries), 'utf8');
		const envelope = seal(dir, plaintext);
		const committed = commitSealedFile(cachePath(), JSON.stringify(envelope), result.identity);
		if (!committed) {
			if (result.identity.existed) warnDiskWriteRetained();
			else warnDiskDiscarded('changed on disk during the write');
		}
	});
}

/** Returns fresh copies of the cached `env`/`keyNames` — never the memo's own references — so a
 *  caller mutating its result can't corrupt what later calls read back. Checks the process memo
 *  first; on a miss, in `disk` mode, falls through to the sealed on-disk cache and promotes a hit
 *  back into the memo so later calls in this process never touch disk again. */
export function readCache(key: string): { env: Record<string, string>; keyNames: string[] } | null {
	const memoHit = memo.get(key);
	if (memoHit) {
		if (Date.now() - memoHit.fetchedAt <= memoHit.ttlMs) {
			return { env: { ...memoHit.env }, keyNames: [...memoHit.keyNames] };
		}
		memo.delete(key);
	}

	if (resolveCacheMode() !== 'disk') return null;

	const result = readDiskEntries();
	if (result.status !== 'authenticated') return null;
	const entry = result.entries[key];
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > entry.ttlMs) return null;

	memo.set(key, {
		env: { ...entry.env },
		keyNames: [...entry.keyNames],
		fetchedAt: entry.fetchedAt,
		ttlMs: entry.ttlMs,
	});
	return { env: { ...entry.env }, keyNames: [...entry.keyNames] };
}

/**
 * Store a fetch result in the memo, and — in `disk` mode — in the sealed on-disk cache. `cacheKeys
 * === undefined` means no allowlist — the full `env` is retained. `cacheKeys` present (including
 * `[]`) means "only these keys persist" — an empty array therefore persists nothing, not everything.
 * `keyNames` still carries every name the fetch returned, so a cache hit doesn't silence the
 * caller's "stale keys outside the allowlist" warning. Stores and returns copies of `env`/`keyNames`,
 * never the caller's own references, so mutating the object passed in (or a previously returned
 * cache hit) can't corrupt the cache.
 *
 * A disk-persistence failure never throws — it's logged once and the memo write (already done)
 * still stands — except `InvalidCacheKeyError`, an operator misconfiguration that must surface
 * rather than be swallowed as an ordinary I/O problem. In that one case the memo write is rolled
 * back too: an invalid `MINION_ENV_CACHE_KEY` must stay rejected for the rest of the process, not
 * just the first call — a memo entry left behind would let every later call for the same key return
 * the fetched secret from the fast path in `readCache` without ever re-checking the operator key.
 */
export function writeCache(
	key: string,
	env: Record<string, string>,
	ttlMs = 300_000,
	keyNames: string[] = Object.keys(env),
	cacheKeys?: string[],
): void {
	const stored =
		cacheKeys === undefined
			? { ...env }
			: Object.fromEntries(Object.entries(env).filter(([k]) => cacheKeys.includes(k)));
	const entry: CacheEntry = { env: stored, keyNames: [...keyNames], fetchedAt: Date.now(), ttlMs };
	memo.set(key, entry);

	if (resolveCacheMode() !== 'disk') return;
	try {
		writeDiskEntry(key, {
			env: { ...entry.env },
			keyNames: [...entry.keyNames],
			fetchedAt: entry.fetchedAt,
			ttlMs: entry.ttlMs,
		});
	} catch (err) {
		if (err instanceof InvalidCacheKeyError) {
			memo.delete(key);
			throw err;
		}
		if (!diskWriteWarned) {
			diskWriteWarned = true;
			const message = err instanceof Error ? err.message : String(err);
			console.warn(`[@minion-stack/env] Failed to persist the sealed disk cache: ${message}`);
		}
	}
}

/** Test-only: clear the process memo, legacy-purge flag, and disk-cache warning latches so state
 *  doesn't bleed across test cases. */
export function resetCacheStateForTests(): void {
	memo.clear();
	legacyPurged = false;
	diskReadWarned = false;
	dirModeWarned = false;
	diskWriteWarned = false;
}
