import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execa } from 'execa';
import { gitStatusSummary, isCloned } from '../src/lib/git-status.js';
import { doctorExitCode, packageManagerStatus } from '../src/commands/doctor.js';

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

describe('doctorExitCode', () => {
	it('fails when the required Infisical binary is unavailable', () => {
		expect(
			doctorExitCode({
				authFailure: false,
				authConfigured: true,
				infisicalBin: false,
				anyDrift: false,
			}),
		).toBe(1);
	});

	it('preserves the dedicated authentication failure code', () => {
		expect(
			doctorExitCode({
				authFailure: false,
				authConfigured: false,
				infisicalBin: true,
				anyDrift: false,
			}),
		).toBe(3);
	});
});
