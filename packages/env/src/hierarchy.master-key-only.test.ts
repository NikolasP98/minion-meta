import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Infisical fetcher so the test doesn't shell out to the real CLI.
vi.mock('./infisical.js', () => ({
	fetchInfisicalSecrets: vi.fn(),
}));

import { resolveEnv } from './hierarchy.js';
import { fetchInfisicalSecrets } from './infisical.js';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('resolveEnv — Infisical narrowed to MINION_SECRETS_KEY', () => {
	beforeEach(() => {
		delete process.env.OPENAI_API_KEY;
		delete process.env.STRIPE_SECRET;
	});

	it('only applies MINION_SECRETS_KEY from the infisical-core layer', async () => {
		const fake = vi.mocked(fetchInfisicalSecrets);
		fake.mockResolvedValue({
			ok: true,
			env: {
				MINION_SECRETS_KEY: 'b64==',
				OPENAI_API_KEY: 'sk-leaked', // simulates legacy Infisical content
				STRIPE_SECRET: 'should-not-flow-through',
			},
		} as any);

		const metaRoot = mkdtempSync(join(tmpdir(), 'minion-env-test-'));
		writeFileSync(join(metaRoot, 'minion.json'), JSON.stringify({ subprojects: {} }));
		writeFileSync(join(metaRoot, '.env.defaults'), '');
		writeFileSync(join(metaRoot, '.env.example'), '');

		const result = await resolveEnv({ registryPath: join(metaRoot, 'minion.json') });

		expect(result.env.MINION_SECRETS_KEY).toBe('b64==');
		expect(result.env.OPENAI_API_KEY).toBeUndefined();
		expect(result.env.STRIPE_SECRET).toBeUndefined();

		// Warnings should mention the stale Infisical keys.
		expect(result.warnings.some((w) => w.includes('OPENAI_API_KEY'))).toBe(true);
		expect(result.warnings.some((w) => w.includes('STRIPE_SECRET'))).toBe(true);
	});

	it('does NOT call Infisical for subproject projects', async () => {
		const fake = vi.mocked(fetchInfisicalSecrets);
		fake.mockResolvedValue({ ok: true, env: { MINION_SECRETS_KEY: 'x' } } as any);

		const metaRoot = mkdtempSync(join(tmpdir(), 'minion-env-test-sub-'));
		writeFileSync(
			join(metaRoot, 'minion.json'),
			JSON.stringify({
				subprojects: {
					hub: {
						path: 'minion_hub',
						packageManager: 'bun',
						branch: 'dev',
						infisicalProject: 'minion-hub',
						remote: '',
						commands: {},
					},
				},
			}),
		);
		writeFileSync(join(metaRoot, '.env.defaults'), '');
		writeFileSync(join(metaRoot, '.env.example'), '');

		mkdirSync(join(metaRoot, 'minion_hub'), { recursive: true });
		writeFileSync(join(metaRoot, 'minion_hub', '.env.defaults'), '');
		writeFileSync(join(metaRoot, 'minion_hub', '.env.example'), '');

		fake.mockClear();
		await resolveEnv({ registryPath: join(metaRoot, 'minion.json'), subprojectId: 'hub' });

		// Infisical fetched exactly once (for minion-core only) — NOT for minion-hub.
		expect(fake).toHaveBeenCalledTimes(1);
		expect(fake.mock.calls[0][0]).toBe('minion-core');
	});
});
