import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readContract, resolveTheme } from './contract.mjs';

export const inventoryUrl = new URL('../inventory.json', import.meta.url);
export async function generateInventory() {
  const contract = await readContract();
  const utilities = await readFile(new URL('../utilities.css', import.meta.url), 'utf8');
  return {
    schemaVersion: 1,
    contractVersion: contract.contractVersion,
    contractSha256: createHash('sha256').update(await readFile(new URL('../contract.json', import.meta.url))).digest('hex'),
    utilitiesSha256: createHash('sha256').update(utilities).digest('hex'),
    themes: Object.keys(contract.themes),
    resolvedTokensPerTheme: Object.fromEntries(Object.keys(contract.themes).map((id) => [id, resolveTheme(contract, id).length])),
    accentPairs: Object.keys(contract.accentOptions),
    compatibilityAliases: Object.keys(contract.aliases).length,
    normalTextContrast: {
      ...contract.contrast.normalText,
      combinations: Object.keys(contract.themes).length * contract.contrast.normalText.foregrounds.length * contract.contrast.normalText.backgrounds.length,
    },
    typographyRoles: [...utilities.matchAll(/^\s*\.(t-[a-z-]+)\s*\{/gm)].map((match) => match[1]),
    sourceBoundary: 'Generated source inventory. Consumer archive and deployed identities are recorded separately.',
  };
}
export async function main(args = process.argv.slice(2)) {
  const next = `${JSON.stringify(await generateInventory(), null, 2)}\n`;
  if (args.includes('--check')) {
    if (await readFile(inventoryUrl, 'utf8').catch(() => '') !== next)
      throw new Error('inventory.json is stale. Run pnpm --filter @minion-stack/design-tokens generate.');
  } else await writeFile(inventoryUrl, next);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
