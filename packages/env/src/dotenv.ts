import * as fs from 'node:fs';

/** Parse dotenv-format text. Handles: KEY=val, quoted (single+double), comments, blanks, `export` prefix, dupes (last wins). */
export function parseDotenv(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const stripped = line.startsWith('export ') ? line.slice(7).trim() : line;
		const eq = stripped.indexOf('=');
		if (eq < 0) continue;
		const key = stripped.slice(0, eq).trim();
		if (!key) continue;
		let value = stripped.slice(eq + 1);
		// Strip surrounding quotes (single or double) if balanced
		if (
			(value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
			(value.startsWith("'") && value.endsWith("'") && value.length >= 2)
		) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	}
	return out;
}

/** Read a dotenv file from disk. Returns {} if the file doesn't exist. */
export function parseDotenvFile(filePath: string): Record<string, string> {
	if (!fs.existsSync(filePath)) return {};
	return parseDotenv(fs.readFileSync(filePath, 'utf8'));
}
