import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectLinkDrift } from '../src/lib/link-drift.js';

/**
 * Tests that detectLinkDrift covers all seven @minion-stack packages
 * (Phase 4 added shared, Phase 5 added db, Phase 6 added auth).
 */
describe('detectLinkDrift — extended MINION_PKGS coverage', () => {
	let tmpRoot: string;

	beforeEach(() => {
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'minion-drift-'));
		// Build a minimal meta-repo layout: packages/<name>/package.json with workspace versions
		const packages = ['tsconfig', 'lint-config', 'env', 'cli', 'shared', 'db', 'auth'];
		for (const p of packages) {
			const pkgDir = path.join(tmpRoot, 'packages', p);
			fs.mkdirSync(pkgDir, { recursive: true });
			fs.writeFileSync(
				path.join(pkgDir, 'package.json'),
				JSON.stringify({ name: `@minion-stack/${p}`, version: '0.2.0' }),
			);
		}
		// Empty subproject dir
		fs.mkdirSync(path.join(tmpRoot, 'subp'), { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('returns seven reports — one per @minion-stack package', () => {
		const reports = detectLinkDrift(tmpRoot, 'subp', 'subp');
		expect(reports).toHaveLength(7);
		const names = reports.map((r) => r.pkg).sort();
		expect(names).toEqual(['auth', 'cli', 'db', 'env', 'lint-config', 'shared', 'tsconfig']);
	});

	it('reports not-installed for shared/db/auth when subproject has no node_modules entries', () => {
		const reports = detectLinkDrift(tmpRoot, 'subp', 'subp');
		const sharedReport = reports.find((r) => r.pkg === 'shared');
		const dbReport = reports.find((r) => r.pkg === 'db');
		const authReport = reports.find((r) => r.pkg === 'auth');
		expect(sharedReport?.status.kind).toBe('not-installed');
		expect(dbReport?.status.kind).toBe('not-installed');
		expect(authReport?.status.kind).toBe('not-installed');
	});

	it('detects installed-drift when subproject has older shared version', () => {
		const nmDir = path.join(tmpRoot, 'subp', 'node_modules', '@minion-stack', 'shared');
		fs.mkdirSync(nmDir, { recursive: true });
		fs.writeFileSync(
			path.join(nmDir, 'package.json'),
			JSON.stringify({ name: '@minion-stack/shared', version: '0.1.0' }),
		);
		const reports = detectLinkDrift(tmpRoot, 'subp', 'subp');
		const sharedReport = reports.find((r) => r.pkg === 'shared');
		expect(sharedReport?.status.kind).toBe('installed-drift');
		if (sharedReport?.status.kind === 'installed-drift') {
			expect(sharedReport.status.installed).toBe('0.1.0');
			expect(sharedReport.status.workspace).toBe('0.2.0');
		}
	});
});
