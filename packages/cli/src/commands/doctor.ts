import * as path from 'node:path';
import { execa } from 'execa';
import {
	resolveEnv,
	resolveInfisicalAuth,
	type SubprojectRegistryEntry,
} from '@minion-stack/env';
import { findMetaRoot, loadRegistry } from '../registry.js';
import { printTable, printJson } from '../lib/output.js';
import { detectLinkDrift, renderDriftLine, hasDrift } from '../lib/link-drift.js';
import { gitStatusSummary, isCloned } from '../lib/git-status.js';

export async function doctorCommand(json: boolean): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const rows: Array<Record<string, string>> = [];

	// Meta-level probes.
	const infisicalAuth = resolveInfisicalAuth();
	const infisicalBin = await hasBin('infisical');
	rows.push({
		id: '(meta)',
		vars: `${infisicalBin ? 'infisical-cli-ok' : 'infisical-cli-MISSING'};auth:${infisicalAuth.source}`,
		warnings: infisicalAuth.configured ? '' : infisicalAuth.error,
		links: '-',
		git: '-',
	});

	let anyDrift = false;
	let authFailure = false;
	for (const [id, entry] of Object.entries(reg.subprojects)) {
		const subAbsPath = path.join(metaRoot, entry.path);

		// Clone-presence: distinguish missing from broken.
		if (!isCloned(subAbsPath)) {
			rows.push({
				id,
				vars: '-',
				warnings: '(not cloned — skip)',
				links: '-',
				git: '(not cloned)',
			});
			continue;
		}

		const git = await gitStatusSummary(subAbsPath);
		try {
			const { env, warnings } = await resolveEnv({ subprojectId: id, cwd: metaRoot });
			const pmStatus = await packageManagerStatus(entry.packageManager);
			const driftReports = detectLinkDrift(metaRoot, id, entry.path);
			const driftLine = renderDriftLine(id, driftReports);
			if (hasDrift(driftReports)) anyDrift = true;
			if (warnings.some((w) => /auth/i.test(w))) authFailure = true;
			rows.push({
				id,
				vars: String(Object.keys(env).length),
				warnings: warnings.length ? warnings.join('; ').slice(0, 80) : pmStatus,
				links: driftLine.replace(`${id}: `, ''),
				git,
			});
		} catch (e) {
			rows.push({
				id,
				vars: 'err',
				warnings: String((e as Error).message).slice(0, 80),
				links: '-',
				git,
			});
		}
	}

	if (json) printJson(rows);
	else printTable(rows);

	return doctorExitCode({
		authFailure,
		authConfigured: infisicalAuth.configured,
		infisicalBin,
		anyDrift,
	});
}

export function doctorExitCode(status: {
	authFailure: boolean;
	authConfigured: boolean;
	infisicalBin: boolean;
	anyDrift: boolean;
}): number {
	if (status.authFailure || !status.authConfigured) return 3;
	if (!status.infisicalBin || status.anyDrift) return 1;
	return 0;
}

/**
 * Package-manager health for one registry row. `none` is a declared absence — repo-policy models
 * "this repository runs no package manager" that way — so there is no binary to probe and reporting
 * `missing-pm:none` would be a false red.
 */
export async function packageManagerStatus(
	packageManager: SubprojectRegistryEntry['packageManager'],
): Promise<string> {
	if (packageManager === 'none') return 'ok (no package manager)';
	return (await hasBin(packageManager)) ? 'ok' : `missing-pm:${packageManager}`;
}

async function hasBin(name: string): Promise<boolean> {
	try {
		await execa('which', [name]);
		return true;
	} catch {
		return false;
	}
}
