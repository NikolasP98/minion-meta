import * as fs from 'node:fs';
import * as path from 'node:path';
import { execa } from 'execa';

/**
 * Per-subproject git status summary used by `minion doctor`.
 * Returns one of:
 *   - "(not cloned)"  — subproject path has no .git directory
 *   - "clean"         — working tree clean
 *   - "N-dirty"       — N lines of porcelain output (modified/untracked)
 *   - "(git error)"   — git invocation failed
 */
export async function gitStatusSummary(subprojectAbsPath: string): Promise<string> {
	if (!fs.existsSync(path.join(subprojectAbsPath, '.git'))) {
		return '(not cloned)';
	}
	try {
		const { stdout } = await execa('git', ['-C', subprojectAbsPath, 'status', '--porcelain'], {
			reject: false,
		});
		const trimmed = stdout.trim();
		if (!trimmed) return 'clean';
		const count = trimmed.split('\n').length;
		return `${count}-dirty`;
	} catch {
		return '(git error)';
	}
}

export function isCloned(subprojectAbsPath: string): boolean {
	return fs.existsSync(path.join(subprojectAbsPath, '.git'));
}
