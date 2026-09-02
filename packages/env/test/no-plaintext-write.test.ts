import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Mock child_process *before* the module under test imports it — same pattern as infisical.test.ts.
const spawnSyncMock = vi.fn();
vi.mock('node:child_process', () => ({
	spawnSync: spawnSyncMock,
}));

const { fetchInfisicalSecrets } = await import('../src/infisical.js');
const { resetCacheStateForTests } = await import('../src/cache.js');

const SENTINEL = 'SENTINEL-DO-NOT-PERSIST';
const SENTINEL_BYTES = Buffer.from(SENTINEL, 'utf8');

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

/** Recursively collect the raw bytes of every file under `dir` (empty array if it doesn't exist).
 *  Raw `Buffer`s, not decoded strings — the guard must catch a leak regardless of encoding. */
function walkFileBytes(dir: string): Buffer[] {
	if (!fs.existsSync(dir)) return [];
	const out: Buffer[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walkFileBytes(p));
		else out.push(fs.readFileSync(p));
	}
	return out;
}

/**
 * S3 anti-recurrence guard (spec §Slice 3). Behavioral, not source-text: it drives the public API
 * with a sentinel secret value across all three `MINION_ENV_CACHE` modes and walks the config
 * directory afterward, asserting the sentinel's raw bytes appear nowhere. A `rg -n writeFileSync`
 * assertion would miss a refactor that moves the write to a new call site or a new module; this
 * does not, because it never looks at source text.
 *
 * Proven to catch a regression during development of this test: temporarily changing
 * `commitSealedFile` in `cache.ts` to `fs.writeFileSync(tmp, JSON.stringify(entries), ...)` (the
 * unsealed plaintext, instead of the sealed envelope produced by `seal()`) made the 'disk' case
 * below fail immediately, on the first run. Reverted after confirming the failure.
 */
describe('no-plaintext-write (S3 anti-recurrence guard)', () => {
	const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-no-plaintext-'));
	const prevXdg = process.env.XDG_CONFIG_HOME;
	const prevMode = process.env.MINION_ENV_CACHE;

	beforeEach(() => {
		process.env.XDG_CONFIG_HOME = tmpHome;
		fs.rmSync(path.join(tmpHome, 'minion'), { recursive: true, force: true });
		spawnSyncMock.mockReset();
		resetCacheStateForTests();
	});

	afterEach(() => {
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
		else process.env.XDG_CONFIG_HOME = prevXdg;
		if (prevMode === undefined) delete process.env.MINION_ENV_CACHE;
		else process.env.MINION_ENV_CACHE = prevMode;
	});

	it.each(['off', 'memory', 'disk'] as const)(
		'never writes the sentinel secret value under the config dir in %s mode',
		async (mode) => {
			process.env.MINION_ENV_CACHE = mode;
			mockExit(0, `MINION_SECRETS_KEY=${SENTINEL}\n`);
			await fetchInfisicalSecrets('minion-core', { noCache: false });

			for (const bytes of walkFileBytes(path.join(tmpHome, 'minion'))) {
				expect(bytes.includes(SENTINEL_BYTES)).toBe(false);
			}
		},
	);
});
