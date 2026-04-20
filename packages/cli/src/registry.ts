import * as fs from 'node:fs';
import * as path from 'node:path';
import AjvMod, { type ErrorObject } from 'ajv';
import { fileURLToPath } from 'node:url';
import type { MinionRegistry, SubprojectRegistryEntry } from '@minion-stack/env';

// Ajv ships CJS with a default export. Under `module: nodenext` the star import is the module
// namespace and `AjvMod` (default) holds the class — but TS sometimes resolves it as the
// namespace. Normalise via runtime .default unwrap and cast the constructor type explicitly.
interface ValidateFn {
	(data: unknown): boolean;
	errors?: ErrorObject[] | null;
}
interface AjvInstance {
	compile(schema: unknown): ValidateFn;
}
type AjvCtor = new (opts?: Record<string, unknown>) => AjvInstance;
const Ajv: AjvCtor =
	((AjvMod as unknown as { default?: AjvCtor }).default ?? (AjvMod as unknown as AjvCtor));

/**
 * Resolve the `minion.schema.json` path. In source-tree it sits next to package.json;
 * in published dist/ it sits one level up (via `files: ["dist", "minion.schema.json", ...]`).
 */
function resolveSchemaPath(): string | null {
	try {
		const here = path.dirname(fileURLToPath(import.meta.url));
		// When running from dist/ the schema is at ../minion.schema.json (package root).
		const distCandidate = path.resolve(here, '..', 'minion.schema.json');
		if (fs.existsSync(distCandidate)) return distCandidate;
		// When running from source (tests / ts-node / vitest) it's also at ../minion.schema.json.
		const srcCandidate = path.resolve(here, '..', 'minion.schema.json');
		if (fs.existsSync(srcCandidate)) return srcCandidate;
		return null;
	} catch {
		return null;
	}
}

const REQUIRED_SUBPROJECT_FIELDS = [
	'path',
	'packageManager',
	'branch',
	'infisicalProject',
	'remote',
	'commands',
] as const;

export function loadRegistry(registryPath: string): MinionRegistry {
	const raw = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
	const schemaPath = resolveSchemaPath();
	if (schemaPath && fs.existsSync(schemaPath)) {
		// Fresh Ajv per call — schemas carry $id which would conflict on repeat compile.
		const ajv = new Ajv({ allErrors: true });
		const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
		const validate = ajv.compile(schema);
		if (!validate(raw)) {
			const msg = (validate.errors ?? [])
				.map((e) => `${e.instancePath} ${e.message}`)
				.join('; ');
			throw new Error(`minion.json invalid: ${msg}`);
		}
	} else {
		// Fallback structural validation if schema file is not accessible.
		if (!raw || typeof raw !== 'object' || !raw.subprojects) {
			throw new Error('minion.json missing `subprojects`');
		}
		for (const [id, entry] of Object.entries(raw.subprojects as Record<string, unknown>)) {
			if (!entry || typeof entry !== 'object') {
				throw new Error(`Subproject '${id}' is not an object`);
			}
			const e = entry as Partial<SubprojectRegistryEntry>;
			for (const field of REQUIRED_SUBPROJECT_FIELDS) {
				if (e[field] === undefined) {
					throw new Error(`Subproject '${id}' missing required field '${field}'`);
				}
			}
		}
	}
	return raw as MinionRegistry;
}

export function getSubproject(reg: MinionRegistry, id: string): SubprojectRegistryEntry {
	const entry = reg.subprojects[id];
	if (!entry) {
		throw new Error(
			`Subproject '${id}' not found in minion.json. Run 'minion list' to see available ids.`,
		);
	}
	return entry;
}

export function findMetaRoot(start: string = process.cwd()): string {
	let dir = path.resolve(start);
	for (let i = 0; i < 10; i++) {
		if (fs.existsSync(path.join(dir, 'minion.json'))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(`minion.json not found upward from ${start}`);
}
