import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
	assertValidPluginId,
	buildScaffold,
	camelCase,
	pascalCase,
	writeScaffold,
	PLUGIN_TEMPLATES,
} from '../src/lib/scaffold.js';

describe('plugin scaffold', () => {
	it('rejects invalid ids', () => {
		expect(() => assertValidPluginId('Bad_Id')).toThrow(/kebab-case/);
		expect(() => assertValidPluginId('1leading')).toThrow();
		expect(() => assertValidPluginId('-leading')).toThrow();
		expect(() => assertValidPluginId('trailing-')).toThrow();
		expect(() => assertValidPluginId('ok-plugin')).not.toThrow();
		expect(() => assertValidPluginId('plugin')).not.toThrow();
	});

	it('derives case variants', () => {
		expect(pascalCase('my-cool-plugin')).toBe('MyCoolPlugin');
		expect(camelCase('my-cool-plugin')).toBe('myCoolPlugin');
		expect(pascalCase('weather')).toBe('Weather');
		expect(camelCase('weather')).toBe('weather');
	});

	for (const template of PLUGIN_TEMPLATES) {
		it(`builds a ${template} scaffold with the expected files`, () => {
			const files = buildScaffold('demo-plugin', template);
			const names = files.map((f) => f.path).sort();
			expect(names).toEqual(
				['README.md', 'demo-plugin.test.ts', 'index.ts', 'minion.manifest.ts', 'package.json'].sort(),
			);

			const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);
			expect(pkg.name).toBe('@minion/demo-plugin');
			expect(pkg.minion.extensions).toEqual(['./index.ts']);
			expect(pkg.devDependencies['@nikolasp98/minion']).toBe('workspace:*');

			const manifest = files.find((f) => f.path === 'minion.manifest.ts')!.content;
			expect(manifest).toContain('defineManifest');
			expect(manifest).toContain('id: "demo-plugin"');

			const index = files.find((f) => f.path === 'index.ts')!.content;
			expect(index).toContain('register(api: MinionPluginApi)');
		});
	}

	it('basic template registers a tool', () => {
		const index = buildScaffold('demo', 'basic').find((f) => f.path === 'index.ts')!.content;
		expect(index).toContain('api.registerTool');
		expect(index).toContain('demo_echo');
	});

	it('rpc template uses api.rpc.define with typed schemas', () => {
		const index = buildScaffold('demo', 'rpc').find((f) => f.path === 'index.ts')!.content;
		expect(index).toContain('api.rpc.define');
		expect(index).toContain('"demo.greet"');
		expect(index).toContain('params: Type.Object');
		expect(index).toContain('result: Type.Object');
	});

	it('channel template uses registerChannelLink + manifest channelLink', () => {
		const files = buildScaffold('demo', 'channel');
		const index = files.find((f) => f.path === 'index.ts')!.content;
		expect(index).toContain('api.registerChannelLink');
		expect(index).toContain('mode: "qr"');
		const manifest = files.find((f) => f.path === 'minion.manifest.ts')!.content;
		expect(manifest).toContain('channelLink');
		expect(manifest).toContain('channels.demo.pair');
	});

	describe('writeScaffold', () => {
		let tmp: string;
		beforeEach(() => {
			tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-cli-scaffold-'));
		});

		it('writes all files to disk', () => {
			const target = path.join(tmp, 'demo');
			const result = writeScaffold(target, buildScaffold('demo', 'basic'));
			expect(result.files.length).toBe(5);
			for (const f of result.files) {
				expect(fs.existsSync(path.join(target, f))).toBe(true);
			}
			const pkg = fs.readFileSync(path.join(target, 'package.json'), 'utf8');
			expect(JSON.parse(pkg).name).toBe('@minion/demo');
		});

		it('refuses to overwrite a non-empty dir without force', () => {
			const target = path.join(tmp, 'demo');
			fs.mkdirSync(target, { recursive: true });
			fs.writeFileSync(path.join(target, 'existing.txt'), 'x');
			expect(() => writeScaffold(target, buildScaffold('demo', 'basic'))).toThrow(/--force/);
			expect(() =>
				writeScaffold(target, buildScaffold('demo', 'basic'), { force: true }),
			).not.toThrow();
		});
	});
});
