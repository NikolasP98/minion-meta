# @minion-stack/tsconfig

Shared TypeScript configs for the Minion meta-repo. Four variants:

| Variant | Extends | Use for |
|---------|---------|---------|
| `base.json` | — | Strict, ES2023, nodenext resolution; foundation for all others |
| `node.json` | `base` | Node-only libraries / services (`types: ["node"]`, `moduleDetection: force`) |
| `svelte.json` | `base` | SvelteKit projects (bundler resolution, `isolatedModules`, `allowJs`) |
| `library.json` | `base` | Publishable libraries (`declaration`, `declarationMap`, `composite`) |

## Usage

In a consumer subproject's `tsconfig.json`:

```json
{
  "extends": "@minion-stack/tsconfig/node.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Subproject-specific settings (paths, include/exclude, overrides) go in the consumer file — never edit the shared config.

## Variants

### `base.json`

Strict mode with modern defaults:

- `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`
- `target: ES2023`, `module: nodenext`, `moduleResolution: nodenext`
- `esModuleInterop`, `resolveJsonModule`, `skipLibCheck`, `forceConsistentCasingInFileNames`
- `allowSyntheticDefaultImports`, `verbatimModuleSyntax: false`

### `node.json`

Extends `base`. Adds `types: ["node"]`, `lib: ["ES2023"]`, `moduleDetection: force`.

### `svelte.json`

Extends `base`. Overrides for SvelteKit: `module: esnext`, `moduleResolution: bundler`, `isolatedModules: true`, `allowJs: true`, `checkJs: false`, `lib: [ES2023, DOM, DOM.Iterable]`, `target: ES2022`.

### `library.json`

Extends `base`. Adds library output: `declaration`, `declarationMap`, `sourceMap`, `composite: true`, `outDir: ./dist`, `rootDir: ./src`.

## License

MIT
