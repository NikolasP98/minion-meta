#!/usr/bin/env node
import { Command } from 'commander';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { testCommand } from './commands/test.js';
import { checkCommand } from './commands/check.js';
import { runPassthroughCommand } from './commands/run.js';
import { fanoutCommand } from './commands/fanout.js';
import { statusCommand } from './commands/status.js';
import { doctorCommand } from './commands/doctor.js';
import { syncEnvCommand } from './commands/sync-env.js';
import { rotateEnvCommand } from './commands/rotate-env.js';
import { infisicalCommand } from './commands/infisical.js';
import { linkCommand } from './commands/link.js';
import { listCommand } from './commands/list.js';
import { branchCommand } from './commands/branch.js';

/**
 * Build and parse the Commander program. Exits via `process.exit` inside each action
 * so that D9 exit codes propagate to the shell.
 */
export async function main(argv: string[] = process.argv): Promise<number> {
	const program = new Command();
	program.name('minion').description('Minion meta-repo CLI').version('0.1.0');

	program
		.command('dev')
		.argument('<id>')
		.option('--all')
		.action(async (id: string, opts: { all?: boolean }) => {
			process.exit(opts.all ? await fanoutCommand('dev') : await devCommand(id));
		});
	program
		.command('build')
		.argument('<id>')
		.option('--all')
		.action(async (id: string, opts: { all?: boolean }) => {
			process.exit(opts.all ? await fanoutCommand('build') : await buildCommand(id));
		});
	program
		.command('test')
		.argument('<id>')
		.option('--all')
		.action(async (id: string, opts: { all?: boolean }) => {
			process.exit(opts.all ? await fanoutCommand('test') : await testCommand(id));
		});
	program
		.command('check')
		.argument('<id>')
		.option('--all')
		.action(async (id: string, opts: { all?: boolean }) => {
			process.exit(opts.all ? await fanoutCommand('check') : await checkCommand(id));
		});
	program
		.command('run')
		.argument('<id>')
		.argument('<cmd...>')
		.action(async (id: string, cmd: string[]) => {
			process.exit(await runPassthroughCommand(id, cmd));
		});
	program
		.command('status')
		.option('--json')
		.action(async (opts: { json?: boolean }) => {
			process.exit(await statusCommand(!!opts.json));
		});
	program
		.command('doctor')
		.option('--json')
		.action(async (opts: { json?: boolean }) => {
			process.exit(await doctorCommand(!!opts.json));
		});
	program
		.command('sync-env')
		.argument('<id>')
		.action(async (id: string) => {
			process.exit(await syncEnvCommand(id));
		});
	program
		.command('rotate-env')
		.argument('<id>')
		.action(async (id: string) => {
			process.exit(await rotateEnvCommand(id));
		});
	program
		.command('infisical')
		.argument('<id>')
		.action(async (id: string) => {
			process.exit(await infisicalCommand(id));
		});
	program
		.command('link')
		.argument('<id>')
		.action(async (id: string) => {
			process.exit(await linkCommand(id, false));
		});
	program
		.command('unlink')
		.argument('<id>')
		.action(async (id: string) => {
			process.exit(await linkCommand(id, true));
		});
	program
		.command('list')
		.option('--json')
		.action(async (opts: { json?: boolean }) => {
			process.exit(await listCommand(!!opts.json));
		});
	program
		.command('branch')
		.argument('<id>')
		.action(async (id: string) => {
			process.exit(await branchCommand(id));
		});

	// Shorthand alias: `minion <id> <cmd...>` → run
	const knownCommands = new Set(program.commands.map((c) => c.name()));
	const rawArgs = argv.slice(2);
	const first = rawArgs[0];
	if (first && !knownCommands.has(first) && !first.startsWith('-')) {
		const cmd = rawArgs.slice(1);
		if (cmd.length > 0) {
			process.exit(await runPassthroughCommand(first, cmd));
		}
	}

	await program.parseAsync(argv);
	return 0;
}

main().catch((err: unknown) => {
	const msg = err instanceof Error ? err.message : String(err);
	console.error('minion:', msg);
	process.exit(1);
});
