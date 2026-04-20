import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	target: 'node22',
	// Emit `.js` / `.d.ts` (not `.mjs` / `.d.mts`) — package.json has `type: module` so `.js` is ESM.
	fixedExtension: false,
});
