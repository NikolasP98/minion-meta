import * as fs from 'node:fs';
import { parseDotenvFile } from './dotenv.js';

export function validateEnv(env: Record<string, string>, envExamplePath: string): string[] {
	if (!fs.existsSync(envExamplePath)) return [];
	const declared = parseDotenvFile(envExamplePath);
	const warnings: string[] = [];
	for (const key of Object.keys(declared)) {
		if (env[key] === undefined || env[key] === '') {
			warnings.push(`${key} is declared in ${envExamplePath} but not resolved`);
		}
	}
	return warnings;
}
