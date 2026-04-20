/**
 * Serialise a Record<string,string> as a `.env` file body.
 *
 * Quoting rules (matches dotenv consumers):
 * - Empty string → `KEY=\n`
 * - Contains whitespace, quote chars, `$`, `` ` ``, backslash, or newlines → double-quoted + escape
 * - Otherwise → bare `KEY=value`
 */
export function serialiseDotenv(env: Record<string, string>): string {
	const lines: string[] = [];
	for (const [k, v] of Object.entries(env)) {
		lines.push(`${k}=${encode(v)}`);
	}
	return lines.join('\n') + '\n';
}

function encode(v: string): string {
	if (v === '') return '';
	const needsQuotes = /[\s"'`$\\\n\r]/.test(v);
	if (!needsQuotes) return v;
	const escaped = v
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
	return `"${escaped}"`;
}
