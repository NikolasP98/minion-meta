import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveInfisicalAuth } from '../src/infisical-auth.js';

describe('resolveInfisicalAuth', () => {
	let configRoot: string;

	beforeEach(() => {
		configRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-auth-'));
	});

	afterEach(() => {
		fs.rmSync(configRoot, { recursive: true, force: true });
	});

	it('uses a complete environment pair atomically', () => {
		const result = resolveInfisicalAuth({
			XDG_CONFIG_HOME: configRoot,
			INFISICAL_UNIVERSAL_AUTH_CLIENT_ID: 'env-id',
			INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET: 'env-secret',
		});

		expect(result).toMatchObject({ configured: true, source: 'environment' });
	});

	it('loads the documented mode-0600 credential file', () => {
		const directory = path.join(configRoot, 'minion');
		const authPath = path.join(directory, 'infisical-auth.json');
		fs.mkdirSync(directory, { recursive: true });
		fs.writeFileSync(authPath, JSON.stringify({ clientId: 'file-id', clientSecret: 'file-secret' }), {
			mode: 0o600,
		});

		const result = resolveInfisicalAuth({ XDG_CONFIG_HOME: configRoot });
		expect(result).toEqual({
			configured: true,
			source: 'file',
			env: {
				INFISICAL_UNIVERSAL_AUTH_CLIENT_ID: 'file-id',
				INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET: 'file-secret',
			},
		});
	});

	it('rejects a credential file readable by other users', () => {
		const directory = path.join(configRoot, 'minion');
		const authPath = path.join(directory, 'infisical-auth.json');
		fs.mkdirSync(directory, { recursive: true });
		fs.writeFileSync(authPath, JSON.stringify({ clientId: 'file-id', clientSecret: 'file-secret' }), {
			mode: 0o644,
		});

		expect(resolveInfisicalAuth({ XDG_CONFIG_HOME: configRoot })).toMatchObject({
			configured: false,
			error: expect.stringContaining('0600'),
		});
	});
});
