import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	execa: vi.fn(),
	findMetaRoot: vi.fn(() => '/workspace'),
	loadRegistry: vi.fn(() => ({ subprojects: {} })),
	getSubproject: vi.fn(() => ({ path: 'hub', packageManager: 'pnpm' })),
}));

vi.mock('execa', () => ({ execa: mocks.execa }));
vi.mock('../src/registry.js', () => ({
	findMetaRoot: mocks.findMetaRoot,
	loadRegistry: mocks.loadRegistry,
	getSubproject: mocks.getSubproject,
}));

const { linkCommand } = await import('../src/commands/link.js');

describe('linkCommand', () => {
	beforeEach(() => {
		mocks.execa.mockReset();
		mocks.getSubproject.mockReturnValue({ path: 'hub', packageManager: 'pnpm' });
	});

	it('stops at the first failed package-manager operation', async () => {
		mocks.execa.mockResolvedValueOnce({ exitCode: 7 });

		expect(await linkCommand('hub', false)).toBe(7);
		expect(mocks.execa).toHaveBeenCalledTimes(1);
	});

	it('returns success only after every operation succeeds', async () => {
		mocks.execa.mockResolvedValue({ exitCode: 0 });

		expect(await linkCommand('hub', true)).toBe(0);
		expect(mocks.execa).toHaveBeenCalledTimes(3);
	});
});
