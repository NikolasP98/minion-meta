// Shared flat-YAML frontmatter helpers for specs/*.md.
// Deliberately not a YAML library: the spec schema is flat scalars + string arrays only
// (see specs/TEMPLATE.md). Nested values are a schema violation, not a parsing feature.

export const STAGES = ['proposal', 'spec', 'dev', 'test', 'deploy', 'done'];
export const STATUSES = [
	'draft',
	'review',
	'approved',
	'implementing',
	'merged',
	'flag-ready',
	'shipped',
	'superseded',
	'rejected',
	'parked',
	'retired',
	'done',
	'unknown'
];

export function parseFrontmatter(src) {
	if (!src.startsWith('---\n')) return null;
	const end = src.indexOf('\n---\n', 4);
	if (end === -1) return null;
	const body = src.slice(end + 5);
	const fm = {};
	for (const line of src.slice(4, end).split('\n')) {
		const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
		if (!m) continue;
		const [, key, raw] = m;
		if (raw.startsWith('[') && raw.endsWith(']')) {
			fm[key] = raw
				.slice(1, -1)
				.split(',')
				.map((s) => s.trim().replace(/^["']|["']$/g, ''))
				.filter(Boolean);
		} else if (/^\d+$/.test(raw)) {
			fm[key] = Number(raw);
		} else {
			fm[key] = raw.replace(/^["']|["']$/g, '');
		}
	}
	return { fm, body };
}

export function serializeFrontmatter(fm) {
	const lines = ['---'];
	for (const [key, value] of Object.entries(fm)) {
		if (value === null || value === undefined || value === '') continue;
		if (Array.isArray(value)) {
			lines.push(`${key}: [${value.map((v) => (/[,:\[\]]/.test(v) ? `"${v}"` : v)).join(', ')}]`);
		} else if (typeof value === 'number') {
			lines.push(`${key}: ${value}`);
		} else {
			lines.push(`${key}: ${/[:#\[\]{}]/.test(value) ? `"${String(value).replace(/"/g, '\\"')}"` : value}`);
		}
	}
	lines.push('---', '');
	return lines.join('\n');
}
