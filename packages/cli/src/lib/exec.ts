import { execa, type ResultPromise } from 'execa';

export interface RunOptions {
	cwd: string;
	env: Record<string, string>;
	shell?: boolean;
}

/**
 * Spawn a command string (whitespace-split) in `cwd` with the given env map.
 * Stdio is inherited so the child can interact with the user's terminal.
 */
export function runCommand(command: string, opts: RunOptions): ResultPromise {
	const parts = command.trim().split(/\s+/);
	const exe = parts[0];
	const args = parts.slice(1);
	if (!exe) {
		throw new Error('runCommand: empty command string');
	}
	return execa(exe, args, {
		cwd: opts.cwd,
		env: opts.env,
		stdio: 'inherit',
		shell: opts.shell ?? false,
	});
}
