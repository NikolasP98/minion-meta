import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SubprojectRegistryEntry } from '@minion-stack/env';

const hubEntry: SubprojectRegistryEntry = {
	path: 'minion_hub',
	packageManager: 'bun',
	branch: 'master',
	infisicalProject: 'minion-hub',
	remote: 'x',
	commands: {
		dev: 'bun run dev',
		run: 'bun run dev:local',
		'run:prd': 'bun run dev',
	},
};

// An entry that declares no registered `run`/`run:prd` default, to exercise the missing-key error.
const bareEntry: SubprojectRegistryEntry = {
	path: 'minion_bare',
	packageManager: 'bun',
	branch: 'main',
	infisicalProject: 'minion-bare',
	remote: 'x',
	commands: { dev: 'bun run dev' },
};

const entries: Record<string, SubprojectRegistryEntry> = { hub: hubEntry, bare: bareEntry };

vi.mock('../src/registry.js', () => ({
	findMetaRoot: vi.fn(() => '/meta'),
	loadRegistry: vi.fn(() => ({ subprojects: entries })),
	getSubproject: vi.fn((_reg: unknown, id: string) => {
		const entry = entries[id];
		if (!entry) throw new Error(`Subproject '${id}' not found in minion.json.`);
		return entry;
	}),
}));

vi.mock('@minion-stack/env', () => ({
	resolveEnv: vi.fn(async () => ({ env: {}, warnings: [], sourceMap: {} })),
}));

vi.mock('../src/lib/exec.js', () => ({
	runCommand: vi.fn(() => Promise.resolve({ exitCode: 0 })),
}));

import { runPassthroughCommand } from '../src/commands/run.js';
import { runCommand } from '../src/lib/exec.js';

describe('runPassthroughCommand', () => {
	beforeEach(() => {
		vi.mocked(runCommand).mockClear();
	});

	it('no cmd resolves the registered `run` default', async () => {
		const code = await runPassthroughCommand('hub', []);
		expect(code).toBe(0);
		expect(runCommand).toHaveBeenCalledWith('bun run dev:local', {
			cwd: '/meta/minion_hub',
			env: {},
		});
	});

	it('--prd with no cmd resolves the registered `run:prd` default', async () => {
		const code = await runPassthroughCommand('hub', [], { prd: true });
		expect(code).toBe(0);
		expect(runCommand).toHaveBeenCalledWith('bun run dev', { cwd: '/meta/minion_hub', env: {} });
	});

	it('errors clearly when the registered key is missing, naming the key and the file', async () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const code = await runPassthroughCommand('bare', []);
		expect(code).toBe(2);
		expect(errSpy).toHaveBeenCalledWith(
			expect.stringMatching(/No 'run' command defined for 'bare' in .*minion\.json/),
		);
		expect(runCommand).not.toHaveBeenCalled();
		errSpy.mockRestore();
	});

	it("errors clearly when --prd's key is missing, naming 'run:prd' and the file", async () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const code = await runPassthroughCommand('bare', [], { prd: true });
		expect(code).toBe(2);
		expect(errSpy).toHaveBeenCalledWith(
			expect.stringMatching(/No 'run:prd' command defined for 'bare' in .*minion\.json/),
		);
		errSpy.mockRestore();
	});

	it('--prd together with an explicit cmd is rejected before touching the registry', async () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const code = await runPassthroughCommand('hub', ['echo', 'hi'], { prd: true });
		expect(code).toBe(2);
		expect(errSpy).toHaveBeenCalledWith('--prd only applies to the registered default');
		expect(runCommand).not.toHaveBeenCalled();
		errSpy.mockRestore();
	});

	it('an explicit cmd passes through unchanged (byte-for-byte join of the argv)', async () => {
		const code = await runPassthroughCommand('hub', ['bun', 'run', 'lint']);
		expect(code).toBe(0);
		expect(runCommand).toHaveBeenCalledWith('bun run lint', {
			cwd: '/meta/minion_hub',
			env: {},
		});
	});
});
