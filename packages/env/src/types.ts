export type Layer =
	| 'root-defaults'
	| 'infisical-core'
	| 'subproject-defaults'
	| 'infisical-subproject'
	| 'subproject-local'
	| 'process-env';

export interface ResolvedVarSource {
	name: string;
	layer: Layer;
}

export interface ResolvedEnv {
	env: Record<string, string>;
	source: ResolvedVarSource[];
	warnings: string[];
}

export interface ResolveOptions {
	subprojectId?: string;
	cwd?: string;
	registryPath?: string;
	infisicalDomain?: string;
	noCache?: boolean;
}

export interface SubprojectRegistryEntry {
	path: string;
	packageManager: 'pnpm' | 'bun' | 'npm' | 'yarn';
	branch: string;
	infisicalProject: string;
	remote: string;
	commands: Record<string, string>;
}

export interface MinionRegistry {
	$schema?: string;
	subprojects: Record<string, SubprojectRegistryEntry>;
}
