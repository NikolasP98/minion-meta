import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const contractPath = fileURLToPath(new URL('../contract.json', import.meta.url));
export const generatedCssPath = fileURLToPath(new URL('../tokens.css', import.meta.url));

export const semanticColorMap = {
  canvas: '--color-canvas',
  surface1: '--color-surface-1',
  surface2: '--color-surface-2',
  surface3: '--color-surface-3',
  overlay: '--color-overlay',
  borderSubtle: '--color-border-subtle',
  borderDefault: '--color-border-default',
  borderStrong: '--color-border-strong',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textTertiary: '--color-text-tertiary',
  textDisabled: '--color-text-disabled',
  accent: '--color-accent',
  onAccent: '--color-on-accent',
  brand: '--color-brand',
};

export const statusNames = ['success', 'warning', 'danger', 'info'];
export const statusParts = ['fg', 'surface', 'border'];

export async function readContract() {
  return JSON.parse(await readFile(contractPath, 'utf8'));
}

export function flattenFoundations(contract) {
  return Object.values(contract.foundations).flatMap((family) => Object.entries(family));
}

export function resolveTheme(contract, themeId) {
  const theme = contract.themes[themeId];
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  const colors = Object.entries(semanticColorMap).map(([key, token]) => [token, theme.colors[key]]);
  const status = statusNames.flatMap((name) =>
    statusParts.map((part) => [
      `--color-${name}-${part}`,
      contract.statusRecipes[theme.mode][name][part],
    ]),
  );

  return [
    ...colors,
    ...status,
    ...Object.entries(contract.radiusScales[theme.radiusScale]),
    ...Object.entries(contract.shadowStyles[theme.shadowStyle]),
    ...Object.entries(contract.typographyStyles[theme.typographyStyle]),
  ];
}

export function parseHex(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Expected six-digit hex color, received: ${value}`);
  const hex = match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

export function relativeLuminance(value) {
  return parseHex(value)
    .map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

export function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}
