import * as path from 'node:path';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';
import {
	type PluginTemplate,
	PLUGIN_TEMPLATES,
	buildScaffold,
	writeScaffold,
} from '../lib/scaffold.js';

export interface PluginNewOptions {
	template?: string;
	description?: string;
	force?: boolean;
}

/**
 * `minion plugin new <id> [--template] [--description] [--force]` — scaffold a
 * gateway plugin under the `minion` subproject's `extensions/<id>/` directory
 * (Phase 28, CLI-01..04). The target directory is resolved from the registry's
 * `minion` subproject path so the scaffold lands in the right repo regardless of
 * the caller's cwd.
 */
export async function pluginNewCommand(id: string, opts: PluginNewOptions = {}): Promise<number> {
	const template = (opts.template ?? 'basic') as PluginTemplate;
	if (!PLUGIN_TEMPLATES.includes(template)) {
		console.error(
			`Unknown template '${opts.template}'. Choose one of: ${PLUGIN_TEMPLATES.join(', ')}.`,
		);
		return 2;
	}

	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const gateway = getSubproject(reg, 'minion');
	const extensionsDir = path.join(metaRoot, gateway.path, 'extensions');
	const targetDir = path.join(extensionsDir, id);

	let files: ReturnType<typeof buildScaffold>;
	try {
		files = buildScaffold(id, template, { description: opts.description });
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		return 2;
	}

	let result: ReturnType<typeof writeScaffold>;
	try {
		result = writeScaffold(targetDir, files, { force: opts.force });
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		return 1;
	}

	const rel = path.relative(metaRoot, result.dir);
	console.log(`Created ${template} plugin '${id}' at ${rel}/`);
	for (const f of result.files) console.log(`  ${rel}/${f}`);
	console.log('');
	console.log('Next steps:');
	console.log(`  cd ${gateway.path}`);
	console.log('  pnpm install');
	console.log('  pnpm build   # generates minion.plugin.json from minion.manifest.ts');
	console.log('  pnpm test');
	return 0;
}
