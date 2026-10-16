import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { generateInventory, inventoryUrl } from '../scripts/generate-inventory.mjs';

test('source inventory is generated from current contract and utilities', async () => {
  const inventory = await generateInventory();
  assert.deepEqual(JSON.parse(await readFile(inventoryUrl, 'utf8')), inventory);
  assert.equal(inventory.normalTextContrast.combinations, 270);
  assert.ok(inventory.typographyRoles.includes('t-caption'));
  assert.equal(inventory.themes.length, 18);
});
