import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	seal,
	open,
	isEnvelopeShape,
	InvalidCacheKeyError,
	validateOperatorCacheKey,
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
	const quarantined = quarantinePath(p);
	if (!quarantined) return;

	let raw: string;
	try {
		raw = fs.readFileSync(quarantined.filePath, 'utf8');
	} catch {
		restoreQuarantinedPath(quarantined, p);
		return;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		restoreQuarantinedPath(quarantined, p);
		return;
	}
	if (!isLegacyCacheShape(parsed)) {
		restoreQuarantinedPath(quarantined, p);
		return;
	}

	removeQuarantinedPath(quarantined);

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

interface QuarantinedPath {
	dir: string;
	filePath: string;
}

/** Move the object currently occupying `source` into a fresh private directory before inspecting it.
 * The rename binds every later read/delete to that exact object: anything concurrently published at
 * `source` after the rename is a different pathname and is never touched. The quarantine directory
 * is created in the cache directory so the move cannot cross filesystems. */
function quarantinePath(source: string): QuarantinedPath | null {
	let dir: string;
	try {
		dir = fs.mkdtempSync(path.join(path.dirname(source), '.infisical-cache-quarantine-'));
		fs.chmodSync(dir, 0o700);
	} catch {
		return null;
	}
	const filePath = path.join(dir, 'candidate');
	try {
		fs.renameSync(source, filePath);
		return { dir, filePath };
	} catch (err) {
		try {
			fs.rmdirSync(dir);
		} catch {
			/* an uncooperative actor occupied the private directory; preserve its evidence */
		}
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		return null;
	}
}

/** Restore a quarantined object without replacing anything that has since appeared at `destination`.
 * If the destination is occupied, the object stays at its named quarantine path as evidence.
 *
 * TODO(handoff): S3's `minion doctor` cache row must report `.infisical-cache-quarantine-*`
 * directories so an operator can disposition preserved rejected objects; automatic deletion cannot
 * distinguish them safely. See the 2026-08-30 review-fix handoff in the source proposal. */
function restoreQuarantinedPath(quarantined: QuarantinedPath, destination: string): void {
	try {
		if (!linkNoClobber(quarantined.filePath, destination)) return;
	} catch {
		return;
	}
	removeQuarantinedPath(quarantined);
}

/** Delete only the private pathname whose object has already been classified. */
function removeQuarantinedPath(quarantined: QuarantinedPath): void {
	try {
		fs.rmSync(quarantined.filePath);
		fs.rmdirSync(quarantined.dir);
	} catch {
		/* cleanup failure preserves the quarantined object; it never authorizes touching another path */
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

/** Publish one immutable generation with create-exclusive hard-linking. No existing pathname is
 * replaced or removed: the generation number is selected while holding the cooperative write lock,
 * and `link(2)` closes the race against an uncooperative creator without clobbering its bytes. */
function commitSealedFile(filePath: string, data: string): boolean {
	const tmp = `${filePath}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
	try {
		fs.writeFileSync(tmp, data, { mode: 0o600, flag: 'wx' });
		return linkNoClobber(tmp, filePath);
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

const GENERATION_PREFIX = 'infisical-cache.g';
const GENERATION_SUFFIX = '.json';
const GENERATION_WIDTH = 16;
const RETAINED_AUTHENTICATED_GENERATIONS = 2;

function generationPath(dir: string, generation: number): string {
	return path.join(
		dir,
		`${GENERATION_PREFIX}${generation.toString().padStart(GENERATION_WIDTH, '0')}${GENERATION_SUFFIX}`,
	);
}

function generationNumber(name: string): number | null {
	if (!name.startsWith(GENERATION_PREFIX) || !name.endsWith(GENERATION_SUFFIX)) return null;
	const raw = name.slice(GENERATION_PREFIX.length, -GENERATION_SUFFIX.length);
	if (!/^\d{16}$/.test(raw)) return null;
	const value = Number(raw);
	return Number.isSafeInteger(value) ? value : null;
}

/** The legacy single-file sealed cache is generation zero. New writes are immutable numbered
 * generations, so refreshing never requires replacing a pathname and rejected bytes remain intact. */
function diskGenerationCandidates(dir: string): Array<{ generation: number; filePath: string }> {
	let names: string[];
	try {
		names = fs.readdirSync(dir);
	} catch {
		return [];
	}
	const candidates = names.flatMap((name) => {
		const generation = generationNumber(name);
		return generation === null ? [] : [{ generation, filePath: path.join(dir, name) }];
	});
	if (fs.existsSync(cachePath())) candidates.push({ generation: 0, filePath: cachePath() });
	return candidates.sort((a, b) => b.generation - a.generation);
}

/** Authenticate one already-isolated generation. This is intentionally narrower than
 * `readDiskEntries`: retention only needs authority to delete the exact quarantined object and must
 * not emit read-path warnings or repair modes. */
function quarantinedGenerationIsAuthenticated(dir: string, filePath: string): boolean {
	let parsed: unknown;
	try {
		parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return false;
	}
	if (!isEnvelopeShape(parsed)) return false;
	const opened = open(dir, parsed as CacheEnvelope);
	if (!opened.ok) return false;
	let entries: unknown;
	try {
		entries = JSON.parse(opened.plaintext.toString('utf8'));
	} catch {
		return false;
	}
	return isValidDiskEntries(entries);
}

/** Bound normal refresh history without a check-then-unlink race. Each retirement first moves the
 * selected pathname into quarantine; only an authenticated moved object is deleted. A replacement
 * at the original pathname survives, and rejected/unreadable evidence is restored without clobbering
 * anything (or remains visibly quarantined if its pathname was retaken). */
function retireOldAuthenticatedGenerations(dir: string): void {
	for (const candidate of diskGenerationCandidates(dir).slice(RETAINED_AUTHENTICATED_GENERATIONS)) {
		const quarantined = quarantinePath(candidate.filePath);
		if (!quarantined) continue;
		if (quarantinedGenerationIsAuthenticated(dir, quarantined.filePath)) {
			removeQuarantinedPath(quarantined);
		} else {
			restoreQuarantinedPath(quarantined, candidate.filePath);
		}
	}
}

const LOCK_FILE_NAME = 'infisical-cache.lock';
const LOCK_ACQUIRE_TIMEOUT_MS = 10_000;
const LOCK_POLL_MS = 10;

interface CacheLockOwner {
	pid: number;
	token: string;
	processIdentity: ProcessIdentity;
}

interface ProcessIdentity {
	bootId: string;
	startTicks: string;
}

function lockFilePath(dir: string): string {
	return path.join(dir, LOCK_FILE_NAME);
}

/** Blocks the synchronous caller for `ms` without a JS busy-spin. `Atomics.wait` on a private
 *  `SharedArrayBuffer` is a real (non-polling-CPU) sleep and — unlike browsers — is permitted on
 *  Node's main thread. */
function sleepSync(ms: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Linux exposes a boot-scoped process start tick in procfs. Pairing it with the boot ID prevents a
 * stale lock from treating an unrelated process that later reused the same PID as its original
 * holder. On platforms without this evidence we deliberately return `null`; such locks can time out
 * but are never reaped from PID liveness alone. */
function processIdentity(pid: number): ProcessIdentity | null {
	if (process.platform !== 'linux') return null;
	try {
		const bootId = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
		const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
		const commEnd = stat.lastIndexOf(')');
		if (commEnd < 0) return null;
		const fieldsAfterComm = stat.slice(commEnd + 2).trim().split(/\s+/);
		const startTicks = fieldsAfterComm[19];
		if (!/^[0-9a-f-]{36}$/i.test(bootId) || !startTicks || !/^\d+$/.test(startTicks)) return null;
		return { bootId, startTicks };
	} catch {
		return null;
	}
}

function isProcessIdentity(value: unknown): value is ProcessIdentity {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const identity = value as Record<string, unknown>;
	return (
		typeof identity.bootId === 'string' &&
		/^[0-9a-f-]{36}$/i.test(identity.bootId) &&
		typeof identity.startTicks === 'string' &&
		/^\d+$/.test(identity.startTicks)
	);
}

function isCacheLockOwner(value: unknown): value is CacheLockOwner {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const owner = value as Record<string, unknown>;
	return (
		Number.isInteger(owner.pid) &&
		(owner.pid as number) > 0 &&
		typeof owner.token === 'string' &&
		/^[0-9a-f]{32}$/.test(owner.token) &&
		isProcessIdentity(owner.processIdentity)
	);
}

function readCacheLockOwner(filePath: string): CacheLockOwner | null {
	try {
		const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		return isCacheLockOwner(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function cacheLockOwnerIsAlive(owner: CacheLockOwner): boolean {
	const currentIdentity = processIdentity(owner.pid);
	if (currentIdentity !== null) {
		return (
			currentIdentity.bootId === owner.processIdentity.bootId &&
			currentIdentity.startTicks === owner.processIdentity.startTicks
		);
	}
	try {
		process.kill(owner.pid, 0);
		return true;
	} catch (err) {
		return (err as NodeJS.ErrnoException).code !== 'ESRCH';
	}
}

function sameCacheLockOwner(a: CacheLockOwner | null, b: CacheLockOwner): boolean {
	return a?.pid === b.pid && a.token === b.token;
}

function tryAcquireCacheLock(filePath: string, owner: CacheLockOwner): boolean {
	const tmp = `${filePath}.${owner.pid}.${owner.token}.tmp`;
	try {
		fs.writeFileSync(tmp, JSON.stringify(owner), { mode: 0o600, flag: 'wx' });
		return linkNoClobber(tmp, filePath);
	} finally {
		bestEffortUnlink(tmp);
	}
}

function reapDeadCacheLock(filePath: string): boolean {
	const observed = readCacheLockOwner(filePath);
	if (!observed || cacheLockOwnerIsAlive(observed)) return false;

	const quarantined = quarantinePath(filePath);
	if (!quarantined) return !fs.existsSync(filePath);

	const moved = readCacheLockOwner(quarantined.filePath);
	if (!sameCacheLockOwner(moved, observed) || cacheLockOwnerIsAlive(observed)) {
		restoreQuarantinedPath(quarantined, filePath);
		return false;
	}

	removeQuarantinedPath(quarantined);
	return true;
}

function releaseCacheLock(filePath: string, owner: CacheLockOwner): void {
	const quarantined = quarantinePath(filePath);
	if (!quarantined) return;
	if (sameCacheLockOwner(readCacheLockOwner(quarantined.filePath), owner)) {
		removeQuarantinedPath(quarantined);
	} else {
		restoreQuarantinedPath(quarantined, filePath);
	}
}

/**
 * Cross-process mutex for the sealed disk cache's read-classify-commit transaction.
 * `writeDiskEntry` re-reads and re-classifies the cache file while holding this lock, so two
 * cooperating writers never interleave their transactions (and never race over each other's staging
 * files). It is a coordination convenience, NOT the safety property: a process that does
 * not take this lock — a backup restore, a file sync, an operator's editor — is unaffected by it, so
 * immutable generation publication is what guarantees such a writer's bytes are never destroyed.
 *
 * Acquired by create-exclusive hard-linking a complete owner record, so a waiter can distinguish a
 * slow live holder from a crashed one without relying on lock age. A dead holder's exact lock object
 * is quarantined and its owner record rechecked before removal; a replaced or live lock is restored.
 * Every other operation in this module is synchronous, so this blocks via `sleepSync` rather than
 * pulling in an async lock dependency that would force `writeCache` (and every caller up to
 * `fetchInfisicalSecrets`) to become async.
 */
function withCacheLock<T>(dir: string, fn: () => T): T {
	const lp = lockFilePath(dir);
	const identity = processIdentity(process.pid);
	if (identity === null) {
		throw new Error('sealed disk cache locking requires Linux procfs process identity');
	}
	const owner: CacheLockOwner = {
		pid: process.pid,
		token: crypto.randomBytes(16).toString('hex'),
		processIdentity: identity,
	};
	const deadline = Date.now() + LOCK_ACQUIRE_TIMEOUT_MS;
	for (;;) {
		try {
			if (tryAcquireCacheLock(lp, owner)) break;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
		}
		if (reapDeadCacheLock(lp)) continue;
		if (Date.now() > deadline) {
			throw new Error(`timed out waiting for the sealed disk cache lock at ${lp}`);
		}
		sleepSync(LOCK_POLL_MS);
	}
	try {
		return fn();
	} finally {
		releaseCacheLock(lp, owner);
	}
}

/**
 * Discriminated result of reading the latest sealed disk-cache generation. `'missing'` means the
 * secured cache directory contains neither the legacy generation-zero path nor a numbered generation.
 *
 * `'rejected'` means a file exists but could not be authenticated: corrupt JSON, wrong envelope
 * shape, unsupported version, foreign-machine binding, an unrecognized alg/kdf, or a GCM auth
 * failure. `'unavailable'` means the cache could not be consulted at all for a filesystem reason —
 * the config root cannot host the cache directory, its mode could not be secured, or the file exists
 * but could not be read (`EACCES`, `EISDIR`, …).
 *
 * Both are read as "no cache entry" and the observed pathname is always preserved. A rejected
 * generation can be followed by a new immutable generation after refetch; an unavailable directory
 * cannot be written at all. Neither status authorizes replacing or deleting observed bytes.
 */
type DiskReadResult =
	| { status: 'missing' }
	| { status: 'unavailable' }
	| { status: 'rejected' }
	| { status: 'authenticated'; entries: DiskEntries };

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

	const candidate = diskGenerationCandidates(dir)[0];
	if (!candidate) return { status: 'missing' };

	let raw: Buffer;
	try {
		raw = fs.readFileSync(candidate.filePath);
	} catch {
		// A candidate can disappear only through an uncooperative actor. Treat that as unavailable for
		// this read; the writer will publish a new immutable generation without touching that pathname.
		warnDiskDiscarded('unreadable');
		return { status: 'unavailable' };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw.toString('utf8'));
	} catch {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected' };
	}
	if (!isEnvelopeShape(parsed)) {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected' };
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
		return { status: 'rejected' };
	}

	let entries: unknown;
	try {
		entries = JSON.parse(result.plaintext.toString('utf8'));
	} catch {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected' };
	}
	if (!isValidDiskEntries(entries)) {
		warnDiskDiscarded('corrupt or tampered');
		return { status: 'rejected' };
	}
	try {
		if ((fs.statSync(candidate.filePath).mode & 0o077) !== 0)
			fs.chmodSync(candidate.filePath, 0o600);
	} catch {
		warnDiskDiscarded('permissions could not be secured');
		return { status: 'unavailable' };
	}
	return { status: 'authenticated', entries };
}

/** Merge `entry` into the latest authenticated disk generation (or start a clean generation after a
 * rejected one) and publish the sealed result at a new create-exclusive pathname. Readers only ever
 * observe complete files, and a writer that never took `withCacheLock` never has its bytes overwritten.
 *
 * A rejected generation remains byte-for-byte intact while the refetched value is published beside
 * it. An unavailable directory is left alone and the fresh value remains memo-only. */
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
		if (result.status === 'unavailable') return;
		const entries: DiskEntries = result.status === 'authenticated' ? { ...result.entries } : {};
		entries[key] = entry;
		const plaintext = Buffer.from(JSON.stringify(entries), 'utf8');
		const envelope = seal(dir, plaintext);
		for (;;) {
			const latest = diskGenerationCandidates(dir)[0]?.generation ?? -1;
			if (latest >= Number.MAX_SAFE_INTEGER) {
				throw new Error('sealed disk cache generation space is exhausted');
			}
			const nextPath = latest < 0 ? cachePath() : generationPath(dir, latest + 1);
			if (commitSealedFile(nextPath, JSON.stringify(envelope))) {
				retireOldAuthenticatedGenerations(dir);
				break;
			}
		}
	});
}

/** Returns fresh copies of the cached `env`/`keyNames` — never the memo's own references — so a
 *  caller mutating its result can't corrupt what later calls read back. Checks the process memo
 *  first; on a miss, in `disk` mode, falls through to the sealed on-disk cache and promotes a hit
 *  back into the memo so later calls in this process never touch disk again. */
export function readCache(key: string): { env: Record<string, string>; keyNames: string[] } | null {
	const mode = resolveCacheMode();
	if (mode === 'disk') validateOperatorCacheKey();

	const memoHit = memo.get(key);
	if (memoHit) {
		if (Date.now() - memoHit.fetchedAt <= memoHit.ttlMs) {
			return { env: { ...memoHit.env }, keyNames: [...memoHit.keyNames] };
		}
		memo.delete(key);
	}

	if (mode !== 'disk') return null;

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
