export function printTable(rows: Array<Record<string, string>>): void {
	if (rows.length === 0) {
		console.log('(empty)');
		return;
	}
	const first = rows[0];
	if (!first) return;
	const cols = Object.keys(first);
	const widths = cols.map((c) =>
		Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)),
	);
	const fmt = (r: Record<string, string>) =>
		cols.map((c, i) => String(r[c] ?? '').padEnd(widths[i] ?? 0)).join('  ');
	console.log(cols.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  '));
	console.log(widths.map((w) => '-'.repeat(w)).join('  '));
	for (const r of rows) console.log(fmt(r));
}

export function printJson(data: unknown): void {
	console.log(JSON.stringify(data, null, 2));
}
