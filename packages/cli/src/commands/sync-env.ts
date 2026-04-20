import * as path from 'node:path';
import * as fs from 'node:fs';
import { resolveEnv } from '@minion-stack/env';
import { findMetaRoot, getSubproject, loadRegistry } from '../registry.js';
import { serialiseDotenv } from '../lib/dotenv-write.js';

export async function syncEnvCommand(id: string): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const entry = getSubproject(reg, id);
	const { env, warnings } = await resolveEnv({ subprojectId: id, cwd: metaRoot });
	for (const w of warnings) console.warn(`warn: ${w}`);
	const target = path.join(metaRoot, entry.path, '.env.local');
	fs.writeFileSync(target, serialiseDotenv(env), { mode: 0o600 });
	console.log(`Wrote ${Object.keys(env).length} vars to ${target}`);
	return 0;
}
