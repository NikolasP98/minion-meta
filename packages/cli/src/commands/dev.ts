import * as path from 'node:path';
import { resolveEnv } from '@minion-stack/env';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';
import { runCommand } from '../lib/exec.js';

export async function devCommand(id: string): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const entry = getSubproject(reg, id);
	const cmd = entry.commands.dev;
	if (!cmd) {
		console.error(`No 'dev' command defined for ${id}`);
		return 2;
	}
	const { env, warnings } = await resolveEnv({ subprojectId: id, cwd: metaRoot });
	for (const w of warnings) console.warn(`warn: ${w}`);
	try {
		const child = runCommand(cmd, { cwd: path.join(metaRoot, entry.path), env });
		const result = await child;
		return result.exitCode ?? 1;
	} catch (e) {
		const err = e as { exitCode?: number; message?: string };
		if (typeof err.exitCode === 'number') return err.exitCode;
		console.error(err.message ?? String(e));
		return 1;
	}
}
