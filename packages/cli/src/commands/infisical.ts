import * as path from 'node:path';
import { execa } from 'execa';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';

export async function infisicalCommand(id: string): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const entry = getSubproject(reg, id);
	void path; // silence unused if tsc is pedantic
	const rawDomain = process.env.INFISICAL_DOMAIN ?? 'http://100.80.222.29:8080';
	// Strip `/api` suffix if present so we land on the web UI origin.
	const webOrigin = rawDomain.replace(/\/api\/?$/, '');
	const url = `${webOrigin}/org/project/${entry.infisicalProject}`;
	console.log(url);
	try {
		await execa('xdg-open', [url], { reject: false });
	} catch {
		/* no browser available — URL already printed */
	}
	return 0;
}
