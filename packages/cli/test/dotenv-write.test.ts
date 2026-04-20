import { describe, it, expect } from 'vitest';
import { serialiseDotenv } from '../src/lib/dotenv-write.js';

describe('serialiseDotenv', () => {
	it('emits KEY=value for simple entries', () => {
		expect(serialiseDotenv({ FOO: 'bar', BAZ: 'qux' })).toBe('FOO=bar\nBAZ=qux\n');
	});
	it('double-quotes values containing whitespace', () => {
		expect(serialiseDotenv({ FOO: 'hello world' })).toBe('FOO="hello world"\n');
	});
	it('escapes embedded double quotes', () => {
		expect(serialiseDotenv({ FOO: 'he said "hi"' })).toBe('FOO="he said \\"hi\\""\n');
	});
	it('escapes newlines', () => {
		expect(serialiseDotenv({ FOO: 'line1\nline2' })).toContain('\\n');
	});
	it('emits empty string as bare equals', () => {
		expect(serialiseDotenv({ FOO: '' })).toBe('FOO=\n');
	});
});
