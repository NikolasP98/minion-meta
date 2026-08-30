import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CLIENT_ID = 'INFISICAL_UNIVERSAL_AUTH_CLIENT_ID';
const CLIENT_SECRET = 'INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET';

export type InfisicalAuthResolution =
	| {
			configured: true;
			source: 'environment' | 'file';
			env: Record<typeof CLIENT_ID | typeof CLIENT_SECRET, string>;
	  }
	| { configured: false; source: 'none'; env: Record<string, never>; error: string };

function completeCredentials(
	clientId: unknown,
	clientSecret: unknown,
): Record<typeof CLIENT_ID | typeof CLIENT_SECRET, string> | null {
	if (typeof clientId !== 'string' || clientId.trim() === '') return null;
	if (typeof clientSecret !== 'string' || clientSecret.trim() === '') return null;
	return { [CLIENT_ID]: clientId, [CLIENT_SECRET]: clientSecret };
}

export function resolveInfisicalAuth(
	environment: NodeJS.ProcessEnv = process.env,
	homeDirectory: string = os.homedir(),
): InfisicalAuthResolution {
	const fromEnvironment = completeCredentials(environment[CLIENT_ID], environment[CLIENT_SECRET]);
	if (fromEnvironment) return { configured: true, source: 'environment', env: fromEnvironment };

	const configRoot = environment.XDG_CONFIG_HOME
		? path.resolve(environment.XDG_CONFIG_HOME)
		: path.join(homeDirectory, '.config');
	const authPath = path.join(configRoot, 'minion', 'infisical-auth.json');
	if (!fs.existsSync(authPath)) {
		return {
			configured: false,
			source: 'none',
			env: {},
			error: `credentials missing from environment and ${authPath}`,
		};
	}

	try {
		const stat = fs.statSync(authPath);
		if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
			return { configured: false, source: 'none', env: {}, error: `${authPath} must have mode 0600` };
		}
		const parsed = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
		const fromFile = completeCredentials(
			parsed[CLIENT_ID] ?? parsed.clientId,
			parsed[CLIENT_SECRET] ?? parsed.clientSecret,
		);
		if (!fromFile) {
			return { configured: false, source: 'none', env: {}, error: `${authPath} is missing Universal Auth credentials` };
		}
		return { configured: true, source: 'file', env: fromFile };
	} catch (error) {
		return { configured: false, source: 'none', env: {}, error: `${authPath}: ${(error as Error).message}` };
	}
}
