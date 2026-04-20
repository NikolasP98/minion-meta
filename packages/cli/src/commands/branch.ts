import * as path from 'node:path';
import { execa } from 'execa';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';

export async function branchCommand(id: string): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const entry = getSubproject(reg, id);
	const r = await execa(
		'git',
		['-C', path.join(metaRoot, entry.path), 'rev-parse', '--abbrev-ref', 'HEAD'],
		{ reject: false },
	);
	console.log(r.stdout?.trim() ?? '(unknown)');
	return r.exitCode === 0 ? 0 : 1;
}
