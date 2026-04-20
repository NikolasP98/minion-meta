// @minion-stack/lint-config — flat ESLint config for ESM-based TS/JS projects.
// Consumer usage: in eslint.config.js:
//   import config from '@minion-stack/lint-config/eslint.config.js';
//   export default config;
// Projects that need overrides should extend the array:
//   export default [...config, { /* overrides */ }];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      'eqeqeq': 'error',
      'no-debugger': 'error',
    },
  },
  {
    ignores: ['dist/', 'build/', '.svelte-kit/', 'coverage/', 'node_modules/'],
  },
];
