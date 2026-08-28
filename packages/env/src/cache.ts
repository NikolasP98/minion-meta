import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface CacheEntry {
	env: Record<string, string>;
	/** Names of every key the underlying fetch returned, even if `env` was narrowed by an allowlist. */
	keyNames: string[];
	fetchedAt: number;
	ttlMs: number;
}

export type CacheMode = 'off' | 'memory' | 'disk';

/** Process-lifetime memo. Replaces the old on-disk cache — see the S1 spec for why. */
const memo = new Map<string, CacheEntry>();
let legacyPurged = false;

export function cacheDir(): string {
	const xdg = process.env.XDG_CONFIG_HOME;
	return xdg ? path.join(xdg, 'minion') : path.join(os.homedir(), '.config', 'minion');
}

export function cachePath(): string {
	return path.join(cacheDir(), 'infisical-cache.json');
}

/**
 * Parse `MINION_ENV_CACHE` into a cache mode. Unrecognized values (including case/whitespace
 * variants that don't match) fall back to 'memory' and warn — never silently fall through to 'disk'.
 *
 * TODO(handoff): 'disk' currently degrades to 'memory' with a warning — S2
 * (2026-08-17-pkg-infisical-cache-plaintext-spec.md §S2, cache-crypto.ts) has not shipped yet. Until
 * it does, every `minion` invocation shells out to `infisical` with no cross-process cache, which
 * costs latency and loses MINION_SECRETS_KEY on an offline/flaky machine (spec ⚠️A1). See the handoff
 * note appended to proposals/2026-08-17-pkg-infisical-cache-plaintext.md (2026-08-20).
 */
export function resolveCacheMode(): CacheMode {
	const raw = process.env.MINION_ENV_CACHE;
	if (raw === undefined || raw.trim() === '') return 'memory';
	const normalized = raw.trim().toLowerCase();
	if (normalized === 'off' || normalized === 'memory') return normalized;
	if (normalized === 'disk') {
		console.warn(
			"[@minion-stack/env] MINION_ENV_CACHE=disk requested, but the encrypted disk cache isn't " +
				"implemented in this version; using 'memory' instead.",
		);
		return 'memory';
	}
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

/** Returns fresh copies of the cached `env`/`keyNames` — never the memo's own references — so a
 *  caller mutating its result can't corrupt what later calls read back. */
export function readCache(key: string): { env: Record<string, string>; keyNames: string[] } | null {
	const entry = memo.get(key);
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > entry.ttlMs) {
		memo.delete(key);
		return null;
	}
	return { env: { ...entry.env }, keyNames: [...entry.keyNames] };
}

/**
 * Store a fetch result in the memo. `cacheKeys === undefined` means no allowlist — the full `env` is
 * retained. `cacheKeys` present (including `[]`) means "only these keys persist" — an empty array
 * therefore persists nothing, not everything. `keyNames` still carries every name the fetch returned,
 * so a cache hit doesn't silence the caller's "stale keys outside the allowlist" warning.
 * Stores and returns copies of `env`/`keyNames`, never the caller's own references, so mutating the
 * object passed in (or a previously returned cache hit) can't corrupt the memo.
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
	memo.set(key, { env: stored, keyNames: [...keyNames], fetchedAt: Date.now(), ttlMs });
}

/** Test-only: clear the process memo and legacy-purge flag so state doesn't bleed across test cases. */
export function resetCacheStateForTests(): void {
	memo.clear();
	legacyPurged = false;
}
