import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadRegistry, getSubproject } from '../src/registry.js';

describe('registry', () => {
	let tmp: string;
	let regPath: string;

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cli-registry-'));
		regPath = path.join(tmp, 'minion.json');
	});

	it('loads + validates a well-formed minion.json', () => {
		fs.writeFileSync(
			regPath,
			JSON.stringify({
				subprojects: {
					hub: {
						path: 'hub',
						packageManager: 'bun',
						branch: 'dev',
						infisicalProject: 'minion-hub',
						remote: 'x',
						commands: { dev: 'bun run dev' },
					},
				},
			}),
		);
		const reg = loadRegistry(regPath);
		expect(reg.subprojects.hub?.packageManager).toBe('bun');
	});

	it("accepts packageManager 'none' — a repo that runs no package manager", () => {
		fs.writeFileSync(
			regPath,
			JSON.stringify({
				subprojects: {
					plugins: {
						path: 'minion_plugins',
						packageManager: 'none',
						branch: 'main',
						infisicalProject: 'minion-plugins',
						remote: 'x',
						commands: {},
					},
				},
			}),
		);
		expect(loadRegistry(regPath).subprojects.plugins?.packageManager).toBe('none');
	});

	it('rejects a package manager outside the enum', () => {
		fs.writeFileSync(
			regPath,
			JSON.stringify({
				subprojects: {
					hub: {
						path: 'hub',
						packageManager: 'deno',
						branch: 'dev',
						infisicalProject: 'minion-hub',
						remote: 'x',
						commands: {},
					},
				},
			}),
		);
		expect(() => loadRegistry(regPath)).toThrow(/packageManager/);
	});

	it('throws on malformed registry (missing required field)', () => {
		fs.writeFileSync(regPath, JSON.stringify({ subprojects: { hub: { path: 'hub' } } }));
		expect(() => loadRegistry(regPath)).toThrow();
	});

	it('getSubproject returns entry for known id', () => {
		fs.writeFileSync(
			regPath,
			JSON.stringify({
				subprojects: {
					hub: {
						path: 'hub',
						packageManager: 'bun',
						branch: 'dev',
						infisicalProject: 'minion-hub',
						remote: 'x',
						commands: {},
					},
				},
			}),
		);
		expect(getSubproject(loadRegistry(regPath), 'hub').path).toBe('hub');
	});

	it('getSubproject throws with exit-4 hint for unknown id', () => {
		fs.writeFileSync(regPath, JSON.stringify({ subprojects: {} }));
		expect(() => getSubproject(loadRegistry(regPath), 'missing')).toThrow(/minion list/);
	});
});
