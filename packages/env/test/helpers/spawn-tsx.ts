import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const tsxBin = path.join(packageRoot, 'node_modules', '.bin', 'tsx');

/** Run a helper script as a real, separate OS process under `tsx` (so it can import the package's
 *  `.ts` sources directly — no build step, no duplicated logic). Resolves when the process exits
 *  successfully; rejects on a non-zero exit or stderr output, surfacing it in the test failure. */
export function spawnTsx(scriptPath: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(tsxBin, [scriptPath, ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString('utf8');
		});
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${scriptPath} exited ${code}: ${stderr}`));
		});
	});
}
