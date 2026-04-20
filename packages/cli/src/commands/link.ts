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
	for (const pkg of MINION_SCOPE_PKGS) {
		const verb = unlink ? ['unlink'] : ['link', '--global'];
		await execa(pm, [...verb, pkg], { cwd: subRoot, stdio: 'inherit', reject: false });
	}
	return 0;
}
