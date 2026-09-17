/**
 * Extract `--prd` from the `minion <id> [cmd...]` alias's trailing args before forwarding to
 * `runPassthroughCommand`. Split out from index.ts (which runs `main()` at import time) so it's
 * importable in tests without side effects.
 */
export function parseAliasArgs(rest: string[]): { cmd: string[]; prd: boolean } {
	const prd = rest.includes('--prd');
	const cmd = prd ? rest.filter((a) => a !== '--prd') : rest;
	return { cmd, prd };
}
