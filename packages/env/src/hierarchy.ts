import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseDotenvFile } from './dotenv.js';
import { fetchInfisicalSecrets } from './infisical.js';
import { validateEnv } from './validate.js';
import type {
	Layer,
	ResolvedEnv,
	ResolveOptions,
	MinionRegistry,
	SubprojectRegistryEntry,
} from './types.js';

/** Walk upward from cwd until minion.json is found; returns the directory containing it, or throws. */
function findMetaRoot(start: string): string {
	let dir = path.resolve(start);
	for (let i = 0; i < 10; i++) {
		if (fs.existsSync(path.join(dir, 'minion.json'))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(`minion.json not found upward from ${start}`);
}

export async function resolveEnv(opts: ResolveOptions = {}): Promise<ResolvedEnv> {
	const cwd = opts.cwd ?? process.cwd();
	const metaRoot = opts.registryPath
		? path.dirname(path.resolve(opts.registryPath))
		: findMetaRoot(cwd);
	const registryPath = opts.registryPath ?? path.join(metaRoot, 'minion.json');
	const registry: MinionRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

	let subproject: SubprojectRegistryEntry | undefined;
	if (opts.subprojectId) {
		subproject = registry.subprojects[opts.subprojectId];
		if (!subproject) throw new Error(`Subproject '${opts.subprojectId}' not in registry`);
	}

	const env: Record<string, string> = {};
	const sourceMap: Record<string, Layer> = {};
	const warnings: string[] = [];

	function applyLayer(layer: Layer, values: Record<string, string>) {
		for (const [k, v] of Object.entries(values)) {
			env[k] = v;
			sourceMap[k] = layer;
		}
	}

	// Layer 1 — root .env.defaults
	applyLayer('root-defaults', parseDotenvFile(path.join(metaRoot, '.env.defaults')));

	// Layer 2 — Infisical minion-core
	const core = await fetchInfisicalSecrets('minion-core', {
		domain:
			opts.infisicalDomain ??
			env.MINION_DEFAULT_INFISICAL_DOMAIN ??
			process.env.INFISICAL_DOMAIN,
		noCache: opts.noCache,
	});
	if (core.ok) applyLayer('infisical-core', core.env);
	else warnings.push(`Infisical layer minion-core unavailable: ${core.error}`);

	if (subproject) {
		const subRoot = path.resolve(metaRoot, subproject.path);
		// Layer 3 — subproject .env.defaults
		applyLayer('subproject-defaults', parseDotenvFile(path.join(subRoot, '.env.defaults')));
		// Layer 4 — Infisical minion-<name>
		const sub = await fetchInfisicalSecrets(subproject.infisicalProject, {
			domain:
				opts.infisicalDomain ??
				env.MINION_DEFAULT_INFISICAL_DOMAIN ??
				process.env.INFISICAL_DOMAIN,
			noCache: opts.noCache,
		});
		if (sub.ok) applyLayer('infisical-subproject', sub.env);
		else
			warnings.push(`Infisical layer ${subproject.infisicalProject} unavailable: ${sub.error}`);
		// Layer 5 — subproject .env.local (gitignored)
		applyLayer('subproject-local', parseDotenvFile(path.join(subRoot, '.env.local')));
		// Validation against <subproject>/.env.example
		const subWarnings = validateEnv(env, path.join(subRoot, '.env.example'));
		warnings.push(...subWarnings);
	}

	// Layer 6 — process.env (wins)
	applyLayer('process-env', { ...process.env } as Record<string, string>);

	// Root .env.example validation
	const rootWarnings = validateEnv(env, path.join(metaRoot, '.env.example'));
	warnings.push(...rootWarnings);

	// Build source[] array (only names, never values)
	const source = Object.entries(sourceMap).map(([name, layer]) => ({ name, layer }));

	return { env, source, warnings };
}
