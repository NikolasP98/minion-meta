import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: false,
	clean: true,
	target: 'node22',
	shims: true,
	// Emit `.js` (not `.mjs`) — package.json has `type: module` so `.js` is ESM.
	fixedExtension: false,
});
