import * as path from 'node:path';
import { findMetaRoot, loadRegistry } from '../registry.js';
import { printTable, printJson } from '../lib/output.js';

export async function listCommand(json: boolean): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	if (json) {
		printJson(reg);
		return 0;
	}
	const rows = Object.entries(reg.subprojects).map(([id, e]) => ({
		id,
		path: e.path,
		pm: e.packageManager,
		branch: e.branch,
		infisical: e.infisicalProject,
	}));
	printTable(rows);
	return 0;
}
