import * as path from 'node:path';
import { execa } from 'execa';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';

const MINION_SCOPE_PKGS = [
	'@minion-stack/tsconfig',
	'@minion-stack/lint-config',
	'@minion-stack/env',
];

export async function linkCommand(id: string, unlink: boolean): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const entry = getSubproject(reg, id);
	const subRoot = path.join(metaRoot, entry.path);
	const pm = entry.packageManager;
	if (pm === 'none') {
		console.log(`${id}: no package manager declared — nothing to ${unlink ? 'unlink' : 'link'}`);
		return 0;
	}
	for (const pkg of MINION_SCOPE_PKGS) {
		const verb = unlink ? ['unlink'] : ['link', '--global'];
		const result = await execa(pm, [...verb, pkg], { cwd: subRoot, stdio: 'inherit', reject: false });
		if (result.exitCode !== 0) return result.exitCode ?? 1;
	}
	return 0;
}
