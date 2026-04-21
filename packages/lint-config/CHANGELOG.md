# @minion-stack/lint-config

## 0.1.1

### Patch Changes

- Fix Prettier entrypoint CJS/ESM packaging so ESM-typed consumers (SvelteKit, `"type": "module"` projects) can resolve it without a local shim.

  Root cause: `package.json` declares `"type": "module"` (ESM) but `prettier.config.js` used CJS `module.exports = {...}`. In an ESM package, `.js` files are parsed as ESM, so `module.exports` errors out — no consumer could load it.

  Fix: rename `prettier.config.js` → `prettier.config.cjs` (explicit CJS extension bypasses the package-level ESM treatment). Update `package.json` `files` + `exports` map. Consumers now reference `@minion-stack/lint-config/prettier.config.cjs`.

  **Migration for 0.1.0 consumers:** update the `"prettier"` key in your `package.json` from `@minion-stack/lint-config/prettier.config.js` to `@minion-stack/lint-config/prettier.config.cjs`.

## 0.1.0

### Minor Changes

- Initial release — oxlint preset, flat ESLint (ESM), Prettier (CJS). All peer deps optional.
