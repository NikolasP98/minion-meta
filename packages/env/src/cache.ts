import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface CacheEntry {
	env: Record<string, string>;
	fetchedAt: number;
	ttlMs: number;
}

type CacheFile = Record<string, CacheEntry>;

export function cacheDir(): string {
	const xdg = process.env.XDG_CONFIG_HOME;
	return xdg ? path.join(xdg, 'minion') : path.join(os.homedir(), '.config', 'minion');
}

export function cachePath(): string {
	return path.join(cacheDir(), 'infisical-cache.json');
}

function readCacheFile(): CacheFile {
	const p = cachePath();
	if (!fs.existsSync(p)) return {};
	try {
		return JSON.parse(fs.readFileSync(p, 'utf8'));
	} catch {
		return {};
	}
}

function writeCacheFile(data: CacheFile): void {
	const dir = cacheDir();
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
	fs.writeFileSync(cachePath(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function readCache(key: string): Record<string, string> | null {
	const data = readCacheFile();
	const entry = data[key];
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > entry.ttlMs) return null;
	return entry.env;
}

export function writeCache(
	key: string,
	env: Record<string, string>,
	ttlMs = 300_000,
): void {
	const data = readCacheFile();
	data[key] = { env, fetchedAt: Date.now(), ttlMs };
	writeCacheFile(data);
}
