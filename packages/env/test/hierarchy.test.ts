import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import type { ResolvedVarSource } from '../src/index.js';
import { resolveEnv } from '../src/index.js';
import * as infisicalMod from '../src/infisical.js';

describe('resolveEnv — 6-layer precedence', () => {
	const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-env-test-'));
	const metaRoot = path.join(tmpRoot, 'meta');
	const subRoot = path.join(metaRoot, 'hub');

	beforeEach(() => {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
		fs.mkdirSync(subRoot, { recursive: true });
		fs.writeFileSync(
			path.join(metaRoot, 'minion.json'),
			JSON.stringify({
				subprojects: {
					hub: {
						path: 'hub',
						packageManager: 'bun',
						branch: 'dev',
						infisicalProject: 'minion-hub',
						remote: '',
						commands: {},
					},
				},
			}),
		);
		// Stub Infisical fetcher: both layers empty in tests to keep pure
		vi.spyOn(infisicalMod, 'fetchInfisicalSecrets').mockResolvedValue({ ok: true, env: {} });
	});

	it('merges in precedence order: root-defaults < subproject-defaults < process-env', async () => {
		fs.writeFileSync(path.join(metaRoot, '.env.defaults'), 'A=1\nB=1');
		fs.writeFileSync(path.join(subRoot, '.env.defaults'), 'B=2\nC=2');
		const prev = process.env.C;
		process.env.C = '3';
		try {
			const result = await resolveEnv({ subprojectId: 'hub', cwd: metaRoot });
			expect(result.env.A).toBe('1');
			expect(result.env.B).toBe('2');
			expect(result.env.C).toBe('3');
			expect(result.source.find((s: ResolvedVarSource) => s.name === 'A')?.layer).toBe(
				'root-defaults',
			);
			expect(result.source.find((s: ResolvedVarSource) => s.name === 'B')?.layer).toBe(
				'subproject-defaults',
			);
			expect(result.source.find((s: ResolvedVarSource) => s.name === 'C')?.layer).toBe(
				'process-env',
			);
		} finally {
			if (prev === undefined) delete process.env.C;
			else process.env.C = prev;
		}
	});

	it('never includes secret VALUES in source[] (only names)', async () => {
		fs.writeFileSync(path.join(metaRoot, '.env.defaults'), 'SECRET_LOOKING=supersecret');
		const result = await resolveEnv({ subprojectId: 'hub', cwd: metaRoot });
		const json = JSON.stringify(result.source);
		expect(json).not.toContain('supersecret');
		expect(json).toContain('SECRET_LOOKING');
	});

	it('omits subproject layers when subprojectId not supplied', async () => {
		fs.writeFileSync(path.join(metaRoot, '.env.defaults'), 'A=1');
		fs.writeFileSync(path.join(subRoot, '.env.defaults'), 'A=2');
		const result = await resolveEnv({ cwd: metaRoot });
		expect(result.env.A).toBe('1');
		expect(result.source.find((s: ResolvedVarSource) => s.name === 'A')?.layer).toBe(
			'root-defaults',
		);
	});
});
