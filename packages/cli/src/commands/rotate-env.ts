import * as path from 'node:path';
import * as fs from 'node:fs';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';
import { syncEnvCommand } from './sync-env.js';

export async function rotateEnvCommand(id: string): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const entry = getSubproject(reg, id);
	const target = path.join(metaRoot, entry.path, '.env.local');
	if (fs.existsSync(target)) fs.unlinkSync(target);
	return syncEnvCommand(id);
}
