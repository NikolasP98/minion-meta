# @minion-stack/lint-config

Three shared lint presets for the Minion meta-repo.

| Entry | For | Consumer pattern |
|-------|-----|------------------|
| `oxlint-preset.json` | oxlint-based projects (minion, paperclip-minion) | `.oxlintrc.json`: `{ "extends": ["@minion-stack/lint-config/oxlint-preset.json"] }` |
| `eslint.config.js` | flat-ESLint projects (hub, site, plugins) | `eslint.config.js`: `import config from '@minion-stack/lint-config/eslint.config.js'; export default config;` |
| `prettier.config.cjs` | all projects | `package.json`: `"prettier": "@minion-stack/lint-config/prettier.config.cjs"` |

## Peer dependencies

All peer deps are optional — consumers install only what they use.

**ESLint preset needs:**
- `eslint` >= 9
- `@eslint/js`
- `typescript-eslint` >= 8

**Oxlint preset needs:**
- `oxlint` >= 0.15

**Prettier config needs:**
- `prettier` >= 3

## Rule highlights

Both oxlint and ESLint presets enforce:
- `no-explicit-any: error` (strict TypeScript)
- `eqeqeq: error` (triple equals only)
- `no-debugger: error`
- `@typescript-eslint/no-unused-vars: warn` with `_`-prefix escape
- `@typescript-eslint/consistent-type-imports: warn` (prefer `import type`)

Prettier: 100-column width, 2-space tabs, semicolons, single quotes, trailing commas everywhere, LF line endings.

## Extending

To add local rules in a consumer:

```js
// eslint.config.js
import config from '@minion-stack/lint-config/eslint.config.js';

export default [
  ...config,
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

## License

MIT
