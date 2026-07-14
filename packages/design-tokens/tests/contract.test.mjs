import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contractPath,
  contrastRatio,
  generatedCssPath,
  readContract,
  resolveTheme,
  semanticColorMap,
  statusNames,
  statusParts,
} from '../scripts/contract.mjs';
import { generateCss } from '../scripts/generate-css.mjs';

const requiredFoundationFamilies = [
  'fonts',
  'fontSizes',
  'lineHeights',
  'fontWeights',
  'letterSpacing',
  'spacing',
  'controlSizes',
  'motion',
  'layers',
  'layout',
];

test('contract is valid JSON and declares every required foundation family', async () => {
  const raw = await readFile(contractPath, 'utf8');
  const contract = JSON.parse(raw);
  assert.match(contract.contractVersion, /^\d+\.\d+\.\d+$/);
  assert.ok(contract.themes[contract.defaultTheme]);
  for (const family of requiredFoundationFamilies) assert.ok(contract.foundations[family], family);
});

test('every theme is a complete, resolvable semantic mode', async () => {
  const contract = await readContract();
  assert.equal(Object.keys(contract.themes).length, 16);
  for (const [themeId, theme] of Object.entries(contract.themes)) {
    assert.ok(['light', 'dark'].includes(theme.mode), `${themeId}: mode`);
    assert.ok(contract.radiusScales[theme.radiusScale], `${themeId}: radiusScale`);
    assert.ok(contract.shadowStyles[theme.shadowStyle], `${themeId}: shadowStyle`);
    assert.ok(contract.typographyStyles[theme.typographyStyle], `${themeId}: typographyStyle`);
    assert.deepEqual(Object.keys(theme.colors).sort(), Object.keys(semanticColorMap).sort(), `${themeId}: colors`);
    assert.equal(new Map(resolveTheme(contract, themeId)).size, 43, `${themeId}: resolved tokens`);
  }
});

test('text, accent, and status pairs meet WCAG AA contrast', async () => {
  const contract = await readContract();
  for (const [themeId, theme] of Object.entries(contract.themes)) {
    for (const textRole of ['textPrimary', 'textSecondary', 'textTertiary']) {
      const ratio = contrastRatio(theme.colors[textRole], theme.colors.canvas);
      assert.ok(ratio >= 4.5, `${themeId}: ${textRole}/canvas ${ratio.toFixed(2)}:1`);
    }
    const accentRatio = contrastRatio(theme.colors.onAccent, theme.colors.accent);
    assert.ok(accentRatio >= 4.5, `${themeId}: onAccent/accent ${accentRatio.toFixed(2)}:1`);
    for (const status of statusNames) {
      const recipe = contract.statusRecipes[theme.mode][status];
      const ratio = contrastRatio(recipe.fg, recipe.surface);
      assert.ok(ratio >= 4.5, `${themeId}: ${status} fg/surface ${ratio.toFixed(2)}:1`);
      assert.deepEqual(Object.keys(recipe).sort(), [...statusParts].sort());
    }
  }
  assert.equal(Object.keys(contract.accentOptions).length, 10);
  for (const [accentId, accent] of Object.entries(contract.accentOptions)) {
    const ratio = contrastRatio(accent.onAccent, accent.accent);
    assert.ok(ratio >= 4.5, `${accentId}: onAccent/accent ${ratio.toFixed(2)}:1`);
  }
});

test('compatibility aliases point to declared canonical tokens', async () => {
  const contract = await readContract();
  const expectedAliases = {
    '--font-sans': '--font-family-sans',
    '--font-mono': '--font-family-mono',
    '--font-display': '--font-family-display',
    '--color-bg': '--color-canvas',
    '--color-bg2': '--color-surface-1',
    '--color-bg3': '--color-surface-2',
    '--color-card': '--color-surface-2',
    '--color-card-foreground': '--color-text-primary',
    '--color-border': '--color-border-default',
    '--color-foreground': '--color-text-primary',
    '--color-muted': '--color-text-secondary',
    '--color-muted-foreground': '--color-text-tertiary',
    '--color-muted-strong': '--color-text-secondary',
    '--color-accent-foreground': '--color-on-accent',
    '--color-brand-pink': '--color-brand',
    '--color-success': '--color-success-fg',
    '--color-warning': '--color-warning-fg',
    '--color-destructive': '--color-danger-fg',
    '--color-info': '--color-info-fg',
    '--shadow-sm': '--shadow-elevation-1',
    '--shadow-md': '--shadow-elevation-2',
    '--shadow-lg': '--shadow-elevation-3',
    '--shadow-xl': '--shadow-elevation-4',
    '--elevation-1-bg': '--color-surface-1',
    '--elevation-2-bg': '--color-surface-2',
    '--elevation-3-bg': '--color-surface-3',
    '--elevation-4-bg': '--color-overlay',
    '--elevation-1-border': '--color-border-subtle',
    '--elevation-2-border': '--color-border-default',
    '--elevation-3-border': '--color-border-strong',
    '--elevation-4-border': '--color-border-strong',
    '--hairline': '--color-border-subtle',
    '--ease-out': '--ease-enter',
    '--ease-in': '--ease-exit',
  };
  assert.deepEqual(contract.aliases, expectedAliases);
  const declared = new Set(resolveTheme(contract, contract.defaultTheme).map(([token]) => token));
  for (const family of Object.values(contract.foundations)) {
    for (const token of Object.keys(family)) declared.add(token);
  }
  for (const token of Object.keys(contract.palettes)) declared.add(token);
  for (const [alias, target] of Object.entries({ ...contract.aliases, ...contract.domainAliases })) {
    assert.ok(alias.startsWith('--'), alias);
    assert.ok(declared.has(target), `${alias} -> missing ${target}`);
  }
});

test('generated CSS exposes every theme mode and excludes undeclared legacy tokens', async () => {
  const contract = await readContract();
  const css = generateCss(contract);
  assert.ok(
    css.includes('@theme static {'),
    'foundation tokens must be emitted even when a consumer does not generate a matching utility',
  );
  for (const themeId of Object.keys(contract.themes)) {
    if (themeId === contract.defaultTheme) continue;
    assert.ok(css.includes(`data-minion-theme='${themeId}'`), themeId);
  }
  for (const legacy of ['--accent', '--color-bg1', '--color-background', '--color-primary', '--color-error']) {
    assert.equal(new RegExp(`(^|\\n)\\s*${legacy.replaceAll('-', '\\-')}:`, 'm').test(css), false, legacy);
  }
});

test('tokens.css is generated exactly from contract.json', async () => {
  const contract = await readContract();
  assert.equal(await readFile(generatedCssPath, 'utf8'), generateCss(contract));
});
