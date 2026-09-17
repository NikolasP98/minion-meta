import * as path from 'node:path';
import { resolveEnv } from '@minion-stack/env';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';
import { runCommand } from '../lib/exec.js';

export interface RunPassthroughOptions {
	/** Resolve the `run:prd` registered default instead of `run`. Only valid with no explicit cmd. */
	prd?: boolean;
}

/**
 * `minion run <id> [cmd...]` and its `minion <id> [cmd...]` alias.
 *
 * - `cmd` given: arbitrary passthrough, unchanged from the original behavior. `--prd` is invalid here.
 * - `cmd` omitted: resolve the subproject's registered default — `commands.run`, or
 *   `commands["run:prd"]` with `--prd` — and error clearly if that key is not defined in minion.json.
 */
export async function runPassthroughCommand(
	id: string,
	args: string[],
	opts: RunPassthroughOptions = {},
): Promise<number> {
	if (args.length > 0 && opts.prd) {
		console.error('--prd only applies to the registered default');
		return 2;
	}

	const metaRoot = findMetaRoot();
	const registryPath = path.join(metaRoot, 'minion.json');
	const reg = loadRegistry(registryPath);
	const entry = getSubproject(reg, id);

	let command: string;
	if (args.length === 0) {
		const key = opts.prd ? 'run:prd' : 'run';
		const registered = entry.commands[key];
		if (!registered) {
			console.error(`No '${key}' command defined for '${id}' in ${registryPath}`);
			return 2;
		}
		command = registered;
	} else {
		command = args.join(' ');
	}

	const { env, warnings } = await resolveEnv({ subprojectId: id, cwd: metaRoot });
	for (const w of warnings) console.warn(`warn: ${w}`);
	try {
		const child = runCommand(command, { cwd: path.join(metaRoot, entry.path), env });
		const result = await child;
		return result.exitCode ?? 1;
	} catch (e) {
		const err = e as { exitCode?: number; message?: string };
		if (typeof err.exitCode === 'number') return err.exitCode;
		console.error(err.message ?? String(e));
		return 1;
	}
}
