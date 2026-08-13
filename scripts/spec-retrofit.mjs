// One-shot: prepend frontmatter to every specs/*.md that lacks it.
// Derivation is best-effort — status maps free-text "**Status:**" lines by keyword,
// anything unrecognizable stays status: unknown (honest, greppable, fix by hand).
// Run from repo root: node scripts/spec-retrofit.mjs [--dry]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseFrontmatter, serializeFrontmatter } from './spec-frontmatter.mjs';

const dry = process.argv.includes('--dry');

function mapStatus(line) {
	if (!line) return 'unknown';
	const s = line.toLowerCase();
	if (/shipped|✅|built|done\b|verified|certified|complete/.test(s)) return 'shipped';
	if (/supersed/.test(s)) return 'superseded';
	if (/implementing|in progress|pending\.?$/.test(s)) return 'implementing';
	if (/approved/.test(s)) return 'approved';
	if (/review/.test(s)) return 'review';
	if (/draft|spec|proposed|plan|recon|design|inventory|packet/.test(s)) return 'draft';
	return 'unknown';
}

// Mirrors the old runtime keyword guess in minion-base; now committed data, correctable by hand.
function guessRepos(name) {
	const n = name.toLowerCase();
	if (/hub|crm|pos|finance|erp|reliability|workshop|socials|scheduling|stock/.test(n))
		return ['minion_hub'];
	if (/gateway|channel|whatsapp|telegram|brains|qdrant|nats|voice/.test(n)) return ['minion'];
	if (/site|landing|installer/.test(n)) return ['minion_site'];
	if (/base|lifecycle|kanban/.test(n)) return ['minion-base'];
	if (/factory/.test(n)) return ['minion-factory'];
	return ['minion-meta'];
}

const stageFor = (status) =>
	status === 'shipped' || status === 'superseded' || status === 'rejected'
		? 'done'
		: status === 'implementing'
			? 'dev'
			: 'spec';

let changed = 0;
for (const name of readdirSync('specs').filter((f) => f.endsWith('.md')).sort()) {
	const path = `specs/${name}`;
	const src = readFileSync(path, 'utf8');
	if (parseFrontmatter(src)) continue;

	const id = name.replace(/\.md$/, '');
	const title = (src.match(/^#\s+(.+)$/m)?.[1] ?? id).trim();
	const statusLine = src.match(/\*\*Status:?\*\*:?\s*(.+)/)?.[1];
	const status = mapStatus(statusLine);
	const created = id.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
	let updated = created;
	try {
		updated = execFileSync('git', ['log', '-1', '--format=%as', '--', path], {
			encoding: 'utf8'
		}).trim() || created;
	} catch {
		/* keep created */
	}

	const fm = {
		id,
		title,
		stage: stageFor(status),
		status,
		pass: 1,
		created,
		updated,
		repos: guessRepos(name)
	};
	if (!dry) writeFileSync(path, serializeFrontmatter(fm) + '\n' + src);
	changed++;
	console.log(`${dry ? 'would add' : 'added'} ${path}  status=${status}`);
}
console.log(`${changed} file(s) ${dry ? 'need' : 'got'} frontmatter`);
