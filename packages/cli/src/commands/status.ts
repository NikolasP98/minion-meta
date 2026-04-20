import * as path from 'node:path';
import * as fs from 'node:fs';
import { execa } from 'execa';
import { findMetaRoot, loadRegistry } from '../registry.js';
import { printTable, printJson } from '../lib/output.js';

export async function statusCommand(json: boolean): Promise<number> {
	const metaRoot = findMetaRoot();
	const reg = loadRegistry(path.join(metaRoot, 'minion.json'));
	const rows: Array<Record<string, string>> = [];
	for (const [id, entry] of Object.entries(reg.subprojects)) {
		const subPath = path.join(metaRoot, entry.path);
		if (!fs.existsSync(path.join(subPath, '.git'))) {
			rows.push({ id, branch: '(no .git)', dirty: '-', ahead: '-', behind: '-' });
			continue;
		}
		const branch = (
			await safeExec('git', ['-C', subPath, 'rev-parse', '--abbrev-ref', 'HEAD'])
		).trim();
		const porcelain = await safeExec('git', ['-C', subPath, 'status', '--porcelain']);
		const dirty = porcelain.trim() ? String(porcelain.trim().split('\n').length) : '0';
		let ahead = '-',
			behind = '-';
		const counts = await safeExec('git', [
			'-C',
			subPath,
			'rev-list',
			'--left-right',
			'--count',
			`${branch}...origin/${branch}`,
		]);
		const m = counts.trim().match(/^(\d+)\s+(\d+)$/);
		if (m && m[1] && m[2]) {
			ahead = m[1];
			behind = m[2];
		}
		rows.push({ id, branch: branch || '(unknown)', dirty, ahead, behind });
	}
	if (json) printJson(rows);
	else printTable(rows);
	return 0;
}

async function safeExec(exe: string, args: string[]): Promise<string> {
	try {
		const r = await execa(exe, args, { reject: false });
		return r.stdout ?? '';
	} catch {
		return '';
	}
}
