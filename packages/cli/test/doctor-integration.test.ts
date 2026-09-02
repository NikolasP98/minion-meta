import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execa } from 'execa';
import type { CacheStatus } from '@minion-stack/env';
import { gitStatusSummary, isCloned } from '../src/lib/git-status.js';
import { packageManagerStatus, renderCacheWarning } from '../src/commands/doctor.js';

describe('gitStatusSummary — clone presence + git status', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-doctor-'));
	});

	afterEach(() => {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('returns "(not cloned)" for a directory without .git', async () => {
		const sub = path.join(tmpRoot, 'missing-project');
		fs.mkdirSync(sub);
		expect(isCloned(sub)).toBe(false);
		expect(await gitStatusSummary(sub)).toBe('(not cloned)');
	});

	it('returns "(not cloned)" for a path that does not exist at all', async () => {
		const sub = path.join(tmpRoot, 'does-not-exist');
		expect(isCloned(sub)).toBe(false);
		expect(await gitStatusSummary(sub)).toBe('(not cloned)');
	});

	it('returns "clean" for an empty git repo', async () => {
		const sub = path.join(tmpRoot, 'clean-project');
		fs.mkdirSync(sub);
		await execa('git', ['-C', sub, 'init', '-q']);
		await execa('git', ['-C', sub, 'config', 'user.email', 'test@example.com']);
		await execa('git', ['-C', sub, 'config', 'user.name', 'Test']);
		// git init creates a repo with no commits — empty HEAD is fine, porcelain returns empty
		expect(isCloned(sub)).toBe(true);
		expect(await gitStatusSummary(sub)).toBe('clean');
	});

	it('returns "N-dirty" for a repo with uncommitted changes', async () => {
		const sub = path.join(tmpRoot, 'dirty-project');
		fs.mkdirSync(sub);
		await execa('git', ['-C', sub, 'init', '-q']);
		fs.writeFileSync(path.join(sub, 'a.txt'), 'hello');
		fs.writeFileSync(path.join(sub, 'b.txt'), 'world');
		const result = await gitStatusSummary(sub);
		expect(result).toMatch(/^\d+-dirty$/);
		// Two untracked files -> '2-dirty'
		expect(result).toBe('2-dirty');
	});
});

describe('packageManagerStatus — probe only what is declared', () => {
	it("reports a declared absence for packageManager 'none' instead of probing a binary", async () => {
		expect(await packageManagerStatus('none')).toBe('ok (no package manager)');
	});

	it('reports missing-pm for a package manager whose binary is absent', async () => {
		expect(await packageManagerStatus('yarn-that-does-not-exist' as 'yarn')).toBe(
			'missing-pm:yarn-that-does-not-exist',
		);
	});
});

describe('renderCacheWarning — S3 doctor (meta) row cache probe', () => {
	function status(overrides: Partial<CacheStatus> = {}): CacheStatus {
		return {
			mode: 'disk',
			legacyRemoved: false,
			dirModeLoose: false,
			dirSecureFailed: false,
			quarantineDirs: [],
			...overrides,
		};
	}

	it('always names the active mode, with no other clauses when nothing needs attention', () => {
		expect(renderCacheWarning(status({ mode: 'memory' }))).toBe('cache:memory');
	});

	it('reports a legacy plaintext cache removed this run', () => {
		expect(renderCacheWarning(status({ legacyRemoved: true }))).toBe(
			'cache:disk; legacy plaintext cache removed this run',
		);
	});

	it('reports a config dir that was looser than 0700', () => {
		expect(renderCacheWarning(status({ dirModeLoose: true }))).toBe(
			'cache:disk; config dir permissions were looser than 0700 (now fixed)',
		);
	});

	it('reports quarantined objects awaiting operator review, singular and plural', () => {
		expect(
			renderCacheWarning(status({ quarantineDirs: ['/x/.infisical-cache-quarantine-abc'] })),
		).toBe('cache:disk; 1 quarantined cache object needs review');
		expect(
			renderCacheWarning(
				status({
					quarantineDirs: [
						'/x/.infisical-cache-quarantine-abc',
						'/x/.infisical-cache-quarantine-def',
					],
				}),
			),
		).toBe('cache:disk; 2 quarantined cache objects need review');
	});

	it('reports an unsecurable config dir distinctly from a fixed one, and never claims it was fixed', () => {
		expect(renderCacheWarning(status({ dirSecureFailed: true }))).toBe(
			'cache:disk; config dir could not be created/secured — disk caching may be unavailable',
		);
		expect(
			renderCacheWarning(status({ dirModeLoose: true, dirSecureFailed: true })),
		).toBe(
			'cache:disk; config dir permissions are looser than 0700 and could NOT be secured — fix manually',
		);
	});

	it('joins every applicable clause when everything needs attention', () => {
		expect(
			renderCacheWarning(
				status({
					mode: 'disk',
					legacyRemoved: true,
					dirModeLoose: true,
					quarantineDirs: ['/x/.infisical-cache-quarantine-abc'],
				}),
			),
		).toBe(
			'cache:disk; legacy plaintext cache removed this run; config dir permissions were looser ' +
				'than 0700 (now fixed); 1 quarantined cache object needs review',
		);
	});
});
