import * as fs from 'node:fs';
import * as path from 'node:path';

export type LinkStatus =
	| { kind: 'not-installed' }
	| { kind: 'symlink-workspace' }
	| { kind: 'symlink-external'; target: string }
	| { kind: 'installed-match'; version: string }
	| { kind: 'installed-drift'; installed: string; workspace: string };

export interface DriftReport {
	subproject: string;
	pkg: string;
	status: LinkStatus;
}

// All published @minion-stack packages. Additions must match packages/<name> directories.
const MINION_PKGS = [
	'tsconfig',
	'lint-config',
	'env',
	'cli',
	'shared', // Phase 4
	'db', // Phase 5
	'auth', // Phase 6
];
const SCOPE = '@minion-stack';

function readVersion(pkgJsonPath: string): string | null {
	try {
		const j = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as { version?: string };
		return j.version ?? null;
	} catch {
		return null;
	}
}

function isSymlink(p: string): boolean {
	try {
		return fs.lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
}

function safeRealpath(p: string): string | null {
	try {
		return fs.realpathSync(p);
	} catch {
		return null;
	}
}

/**
 * For a given subproject, inspect each `@minion-stack/<pkg>` directory inside its
 * `node_modules/` and classify the installation state.
 *
 * `not-installed`     — path doesn't exist
 * `symlink-workspace` — symlink pointing to this meta-repo's packages/<pkg>
 * `symlink-external`  — symlink pointing somewhere else (drift)
 * `installed-match`   — regular dir with version matching workspace
 * `installed-drift`   — regular dir with version NOT matching workspace (drift)
 */
export function detectLinkDrift(
	metaRoot: string,
	subprojectId: string,
	subprojectPath: string,
): DriftReport[] {
	const reports: DriftReport[] = [];
	const subRoot = path.join(metaRoot, subprojectPath);
	for (const pkg of MINION_PKGS) {
		const instPath = path.join(subRoot, 'node_modules', SCOPE, pkg);
		const wsPkgJson = path.join(metaRoot, 'packages', pkg, 'package.json');
		const wsVersion = readVersion(wsPkgJson);

		if (!isSymlink(instPath) && !fs.existsSync(instPath)) {
			reports.push({ subproject: subprojectId, pkg, status: { kind: 'not-installed' } });
			continue;
		}

		if (isSymlink(instPath)) {
			const target = safeRealpath(instPath);
			const wsTarget = safeRealpath(path.join(metaRoot, 'packages', pkg));
			if (target && wsTarget && target === wsTarget) {
				reports.push({ subproject: subprojectId, pkg, status: { kind: 'symlink-workspace' } });
			} else {
				reports.push({
					subproject: subprojectId,
					pkg,
					status: { kind: 'symlink-external', target: target ?? '(unresolved)' },
				});
			}
			continue;
		}

		const instVersion = readVersion(path.join(instPath, 'package.json'));
		if (instVersion && wsVersion && instVersion === wsVersion) {
			reports.push({
				subproject: subprojectId,
				pkg,
				status: { kind: 'installed-match', version: instVersion },
			});
		} else if (instVersion && wsVersion) {
			reports.push({
				subproject: subprojectId,
				pkg,
				status: { kind: 'installed-drift', installed: instVersion, workspace: wsVersion },
			});
		} else {
			reports.push({ subproject: subprojectId, pkg, status: { kind: 'not-installed' } });
		}
	}
	return reports;
}

/** Render a single-line compact drift summary. */
export function renderDriftLine(subproject: string, reports: DriftReport[]): string {
	const installed = reports.filter((r) => r.status.kind !== 'not-installed');
	if (installed.length === 0) return `${subproject}: no @minion-stack/* installed`;
	const parts = installed.map((r) => {
		const pkg = r.pkg;
		switch (r.status.kind) {
			case 'symlink-workspace':
				return `${pkg}→symlink-ws (ok)`;
			case 'symlink-external':
				return `${pkg}→symlink-ext (drift)`;
			case 'installed-match':
				return `${pkg}@${r.status.version} (ok)`;
			case 'installed-drift':
				return `${pkg}@${r.status.installed}≠ws@${r.status.workspace} (drift)`;
			default:
				return `${pkg}→?`;
		}
	});
	return `${subproject}: ${parts.join(', ')}`;
}

/** True if any report in the list is a drift state. */
export function hasDrift(reports: DriftReport[]): boolean {
	return reports.some(
		(r) => r.status.kind === 'installed-drift' || r.status.kind === 'symlink-external',
	);
}
