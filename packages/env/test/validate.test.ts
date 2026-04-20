import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateEnv } from '../src/validate.js';

describe('validateEnv', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-validate-'));
	const examplePath = path.join(tmp, '.env.example');

	it('warns for names in .env.example but missing from env', () => {
		fs.writeFileSync(examplePath, 'FOO=\nBAR=\n');
		const warnings = validateEnv({ FOO: 'x' }, examplePath);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('BAR');
	});

	it('returns empty when all declared vars present', () => {
		fs.writeFileSync(examplePath, 'FOO=\nBAR=\n');
		expect(validateEnv({ FOO: 'x', BAR: 'y' }, examplePath)).toEqual([]);
	});

	it('silent when .env.example does not exist', () => {
		expect(validateEnv({}, path.join(tmp, 'missing.example'))).toEqual([]);
	});
});
