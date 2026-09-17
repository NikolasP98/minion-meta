import { describe, it, expect } from 'vitest';
import { parseAliasArgs } from '../src/lib/alias.js';

describe('parseAliasArgs — `minion <id> [cmd...]` trailing-arg parsing', () => {
	it('no trailing args → empty cmd, no --prd (alias no-cmd resolution)', () => {
		expect(parseAliasArgs([])).toEqual({ cmd: [], prd: false });
	});

	it('--prd alone → empty cmd, prd flag set', () => {
		expect(parseAliasArgs(['--prd'])).toEqual({ cmd: [], prd: true });
	});

	it('an explicit cmd with no --prd passes through unchanged', () => {
		expect(parseAliasArgs(['dev'])).toEqual({ cmd: ['dev'], prd: false });
	});

	it('an explicit cmd with --prd strips the flag out of the forwarded cmd', () => {
		expect(parseAliasArgs(['dev', '--prd'])).toEqual({ cmd: ['dev'], prd: true });
	});
});
