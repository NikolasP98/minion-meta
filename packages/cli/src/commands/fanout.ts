import * as path from 'node:path';
import { execa } from 'execa';
import { resolveEnv } from '@minion-stack/env';
import { findMetaRoot, loadRegistry } from '../registry.js';

export type FanoutSubcommand = 'dev' | 'build' | 'test' | 'check';

/**
 * Fan out `<subcommand>` across every registered subproject that declares it.
 *
 * Each child is launched via `concurrently` in its own shell with a pre-computed env.
 * We embed env as a `KEY='val'` prefix to the shell command rather than marshaling a
 * JSON env-map to the child, because `concurrently` spawns through a shell.
 */
export async function fanoutCommand(subcommand: FanoutSubcommand): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const names = Object.keys(reg.subprojects).filter((id) => {
		const sp = reg.subprojects[id];
		return sp && sp.commands[subcommand];
	});
	if (names.length === 0) {
		console.error(`No subprojects declare '${subcommand}'`);
		return 2;
	}
	const cmds: string[] = [];
	for (const id of names) {
		const entry = reg.subprojects[id];
		if (!entry) continue;
		const { env } = await resolveEnv({ subprojectId: id, cwd: metaRoot });
		const envPrefix = Object.entries(env)
			.map(([k, v]) => `${k}=${shellEscape(v)}`)
			.join(' ');
		const cwd = path.join(metaRoot, entry.path);
		cmds.push(`cd ${shellEscape(cwd)} && ${envPrefix} ${entry.commands[subcommand]}`);
	}
	try {
		const result = await execa('concurrently', ['-n', names.join(','), ...cmds], {
			stdio: 'inherit',
			preferLocal: true,
		});
		return result.exitCode ?? 1;
	} catch (e) {
		const err = e as { exitCode?: number; message?: string };
		if (typeof err.exitCode === 'number') return err.exitCode;
		console.error(err.message ?? String(e));
		return 1;
	}
}

function shellEscape(v: string): string {
	return "'" + v.replace(/'/g, "'\\''") + "'";
}
