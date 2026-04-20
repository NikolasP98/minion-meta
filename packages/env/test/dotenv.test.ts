import { describe, it, expect } from 'vitest';
import { parseDotenv } from '../src/dotenv.js';

describe('parseDotenv', () => {
	it('parses KEY=value', () => {
		expect(parseDotenv('FOO=bar')).toEqual({ FOO: 'bar' });
	});
	it('parses double-quoted values', () => {
		expect(parseDotenv('FOO="hello world"')).toEqual({ FOO: 'hello world' });
	});
	it('parses single-quoted values', () => {
		expect(parseDotenv("FOO='hello world'")).toEqual({ FOO: 'hello world' });
	});
	it('returns empty string for KEY=', () => {
		expect(parseDotenv('FOO=')).toEqual({ FOO: '' });
	});
	it('ignores comments and blank lines', () => {
		expect(parseDotenv('# comment\n\nFOO=bar\n# another')).toEqual({ FOO: 'bar' });
	});
	it('handles the `export` prefix', () => {
		expect(parseDotenv('export FOO=bar')).toEqual({ FOO: 'bar' });
	});
	it('last duplicate wins', () => {
		expect(parseDotenv('FOO=1\nFOO=2')).toEqual({ FOO: '2' });
	});
	it('trims surrounding whitespace on key', () => {
		expect(parseDotenv('  FOO=bar')).toEqual({ FOO: 'bar' });
	});
});
